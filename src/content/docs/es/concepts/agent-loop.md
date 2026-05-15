---
summary: "Ciclo de vida del bucle del agente, flujos y semántica de espera"
read_when:
  - You need an exact walkthrough of the agent loop or lifecycle events
  - You are changing session queueing, transcript writes, or session write lock behavior
title: "Bucle de agente"
---

Un bucle de agente es la ejecución "real" completa de un agente: intake → ensamblaje de contexto → inferencia del modelo → ejecución de herramientas → respuestas en streaming → persistencia. Es la ruta autoritativa que convierte un mensaje en acciones y una respuesta final, mientras mantiene el estado de la sesión consistente.

En OpenClaw, un bucle es una única ejecución serializada por sesión que emite eventos de ciclo de vida y de flujo
mientras el modelo piensa, llama a herramientas y transmite la salida. Este documento explica cómo ese bucle auténtico está
conectado de extremo a extremo.

## Puntos de entrada

- RPC de puerta de enlace: `agent` y `agent.wait`.
- CLI: comando `agent`.

## Cómo funciona (de alto nivel)

1. El RPC `agent` valida los parámetros, resuelve la sesión (sessionKey/sessionId), persiste los metadatos de la sesión, devuelve `{ runId, acceptedAt }` inmediatamente.
2. `agentCommand` ejecuta el agente:
   - resuelve el modelo + los valores predeterminados de pensamiento/verbose/trace
   - carga la instantánea de habilidades (skills)
   - llama a `runEmbeddedPiAgent` (tiempo de ejecución pi-agent-core)
   - emite **fin/error del ciclo de vida** si el bucle incrustado no emite uno
3. `runEmbeddedPiAgent`:
   - serializa las ejecuciones mediante colas por sesión + globales
   - resuelve el modelo + perfil de autenticación y construye la sesión pi
   - se suscribe a eventos pi y transmite los deltas del asistente/herramientas
   - hace cumplir el tiempo de espera -> aborta la ejecución si se excede
   - para los turnos del servidor de aplicaciones de Codex, aborta un turno aceptado que deja de producir progreso del servidor de aplicaciones antes de un evento terminal
   - devuelve cargas útiles + metadatos de uso
4. `subscribeEmbeddedPiSession` puentea los eventos de pi-agent-core al flujo `agent` de OpenClaw:
   - eventos de herramientas => `stream: "tool"`
   - deltas del asistente => `stream: "assistant"`
   - eventos del ciclo de vida => `stream: "lifecycle"` (`phase: "start" | "end" | "error"`)
5. `agent.wait` usa `waitForAgentRun`:
   - espera el **fin/error del ciclo de vida** para `runId`
   - devuelve `{ status: ok|error|timeout, startedAt, endedAt, error? }`

## Puesta en cola + concurrencia

- Las ejecuciones se serializan por clave de sesión (carril de sesión) y opcionalmente a través de un carril global.
- Esto evita carreras de herramientas/sesión y mantiene el historial de sesiones consistente.
- Los canales de mensajería pueden elegir modos de cola (collect/steer/followup) que alimentan este sistema de carriles.
  Consulte [Command Queue](/es/concepts/queue).
- Las escrituras de transcripciones también están protegidas por un bloqueo de escritura de sesión en el archivo de sesión. El bloqueo es
  consciente del proceso y basado en archivos, por lo que detecta escritores que omiten la cola en proceso o que provienen
  de otro proceso. Los escritores de transcripciones de sesión esperan hasta `session.writeLock.acquireTimeoutMs`
  antes de informar que la sesión está ocupada; el valor predeterminado es `60000` ms.
- Los bloqueos de escritura de sesión no son reentrantes de forma predeterminada. Si un asistente anida intencionalmente la adquisición de
  el mismo bloqueo mientras preserva un único escritor lógico, debe optar explícitamente con
  `allowReentrant: true`.

## Preparación de la sesión + espacio de trabajo

- El espacio de trabajo se resuelve y se crea; las ejecuciones en sandbox pueden redirigirse a una raíz de espacio de trabajo sandbox.
- Las habilidades se cargan (o se reutilizan desde una instantánea) y se inyectan en el entorno y el prompt.
- Los archivos de arranque/contexto se resuelven e inyectan en el informe del prompt del sistema.
- Se adquiere un bloqueo de escritura de sesión; `SessionManager` se abre y se prepara antes del streaming. Cualquier
  ruta posterior de reescritura, compactación o truncamiento de la transcripción debe tomar el mismo bloqueo antes de abrir o
  mutar el archivo de transcripción.

## Ensamblaje del prompt + prompt del sistema

- El prompt del sistema se construye a partir del prompt base de OpenClaw, el prompt de habilidades, el contexto de arranque y las anulaciones por ejecución.
- Se hacen cumplir los límites específicos del modelo y los tokens de reserva de compactación.
- Consulte [System prompt](/es/concepts/system-prompt) para ver lo que ve el modelo.

## Puntos de enlace (donde puede interceptar)

OpenClaw tiene dos sistemas de enlaces:

- **Enlaces internos** (Enlaces de Gateway): scripts controlados por eventos para comandos y eventos del ciclo de vida.
- **Enlaces de complementos**: puntos de extensión dentro del ciclo de vida del agente/herramienta y la canalización de gateway.

### Enlaces internos (Enlaces de Gateway)

- **`agent:bootstrap`**: se ejecuta mientras se construyen los archivos de arranque antes de que se finalice el prompt del sistema.
  Úselo para agregar/eliminar archivos de contexto de arranque.
- **Command hooks**: `/new`, `/reset`, `/stop` y otros eventos de comando (consulte la documentación de Hooks).

Consulte [Hooks](/es/automation/hooks) para ver la configuración y los ejemplos.

### Enlaces de complementos (ciclo de vida del agente + gateway)

Estos se ejecutan dentro del bucle del agente o la canalización de gateway:

- **`before_model_resolve`**: se ejecuta antes de la sesión (sin `messages`) para anular de manera determinista el proveedor/modelo antes de la resolución del modelo.
- **`before_prompt_build`**: se ejecuta después de la carga de la sesión (con `messages`) para inyectar `prependContext`, `systemPrompt`, `prependSystemContext` o `appendSystemContext` antes del envío del prompt. Use `prependContext` para texto dinámico por turno y campos de contexto del sistema para una orientación estable que debe ubicarse en el espacio del prompt del sistema.
- **`before_agent_start`**: gancho de compatibilidad heredado que puede ejecutarse en cualquier fase; se prefieren los ganchos explícitos anteriores.
- **`before_agent_reply`**: se ejecuta después de las acciones en línea y antes de la llamada al LLM, permitiendo que un complemento tome el turno y devuelva una respuesta sintética o silencie el turno por completo.
- **`agent_end`**: inspecciona la lista final de mensajes y los metadatos de ejecución después de la finalización.
- **`before_compaction` / `after_compaction`**: observar o anotar ciclos de compactación.
- **`before_tool_call` / `after_tool_call`**: interceptar parámetros/resultados de herramientas.
- **`before_install`**: inspeccionar los hallazgos de análisis integrados y bloquear opcionalmente instalaciones de habilidades o complementos.
- **`tool_result_persist`**: transformar sincrónicamente los resultados de las herramientas antes de que se escriban en una transcripción de sesión propiedad de OpenClaw.
- **`message_received` / `message_sending` / `message_sent`**: ganchos de mensajes entrantes + salientes.
- **`session_start` / `session_end`**: límites del ciclo de vida de la sesión.
- **`gateway_start` / `gateway_stop`**: eventos del ciclo de vida de la puerta de enlace.

Reglas de decisión de enlace para protecciones salientes/de herramientas:

- `before_tool_call`: `{ block: true }` es terminal y detiene los controladores de menor prioridad.
- `before_tool_call`: `{ block: false }` es una no-op (no operación) y no borra un bloqueo previo.
- `before_install`: `{ block: true }` es terminal y detiene los controladores de menor prioridad.
- `before_install`: `{ block: false }` es una no-op y no borra un bloqueo previo.
- `message_sending`: `{ cancel: true }` es terminal y detiene los controladores de menor prioridad.
- `message_sending`: `{ cancel: false }` es una no-op y no borra una cancelación previa.

Consulte [Plugin hooks](/es/plugins/hooks) para obtener detalles sobre la API de enlace y el registro.

Los arneses pueden adaptar estos enlaces de manera diferente. El arnés del servidor de aplicaciones Codex mantiene los enlaces de complementos de OpenClaw como el contrato de compatibilidad para las superficies reflejadas documentadas, mientras que los enlaces nativos de Codex siguen siendo un mecanismo de Codex de nivel inferior separado.

## Transmisión + respuestas parciales

- Los deltas del asistente se transmiten desde pi-agent-core y se emiten como eventos `assistant`.
- La transmisión de bloques puede emitir respuestas parciales ya sea en `text_end` o `message_end`.
- La transmisión del razonamiento puede emitirse como una transmisión separada o como respuestas de bloque.
- Consulte [Streaming](/es/concepts/streaming) para conocer el comportamiento de fragmentación y respuesta de bloque.

## Ejecución de herramientas + herramientas de mensajería

- Los eventos de inicio/actualización/finalización de la herramienta se emiten en la transmisión `tool`.
- Los resultados de las herramientas se depuran por tamaño y cargas de imágenes antes del registro/emisión.
- Los envíos de herramientas de mensajería se rastrean para suprimir las confirmaciones duplicadas del asistente.

## Formación + supresión de respuestas

- Las cargas finales se ensamblan a partir de:
  - texto del asistente (y razonamiento opcional)
  - resúmenes de herramientas en línea (cuando es detallado + permitido)
  - texto de error del asistente cuando el modelo falla
- El token silencioso exacto `NO_REPLY` / `no_reply` se filtra de las
  cargas salientes.
- Los duplicados de herramientas de mensajería se eliminan de la lista de cargas finales.
- Si no quedan cargas renderizables y una herramienta falló, se emite una respuesta de error de herramienta alternativa
  (a menos que una herramienta de mensajería ya haya enviado una respuesta visible para el usuario).

## Compactación + reintentos

- La auto-compactación emite eventos de transmisión `compaction` y puede activar un reintento.
- Al reintentar, los búferes en memoria y los resúmenes de herramientas se restablecen para evitar resultados duplicados.
- Consulte [Compaction](/es/concepts/compaction) para conocer la canalización de compactación.

## Transmisiones de eventos (hoy)

- `lifecycle`: emitido por `subscribeEmbeddedPiSession` (y como alternativa por `agentCommand`)
- `assistant`: deltas transmitidos desde pi-agent-core
- `tool`: eventos de herramientas transmitidos desde pi-agent-core

## Manejo del canal de chat

- Los deltas del asistente se almacenan en búfer en mensajes `delta` de chat.
- Un `final` de chat se emite al **final/error del ciclo de vida**.

## Tiempos de espera

- `agent.wait` predeterminado: 30 s (solo la espera). El parámetro `timeoutMs` lo anula.
- Tiempo de ejecución del agente: `agents.defaults.timeoutSeconds` predeterminado 172800 s (48 horas); se aplica en el temporizador de aborto `runEmbeddedPiAgent`.
- Tiempo de ejecución de Cron: el `timeoutSeconds` de turno del agente aislado pertenece a cron. El programador inicia ese temporizador cuando comienza la ejecución, aborta la ejecución subyacente en el plazo configurado y luego realiza una limpieza delimitada antes de registrar el tiempo de espera, para que una sesión secundaria obsoleta no pueda mantener el carril atascado.
- Diagnósticos de actividad de la sesión: con los diagnósticos habilitados, `diagnostics.stuckSessionWarnMs` clasifica las sesiones `processing` largas que no tienen progreso observado en respuesta, herramienta, estado, bloque o ACP. Las ejecuciones integradas activas, llamadas al modelo y llamadas a herramientas se reportan como `session.long_running`; el trabajo activo sin progreso reciente se reporta como `session.stalled`; `session.stuck` está reservado para la contabilidad de sesiones obsoletas sin trabajo activo. La contabilidad de sesiones obsoletas libera el carril de sesión afectado inmediatamente; las ejecuciones integradas estancadas se vacían por aborto solo después de `diagnostics.stuckSessionAbortMs` (predeterminado: al menos 10 minutos y 5 veces el umbral de advertencia) para que el trabajo en cola pueda reanudarse sin cortar ejecuciones simplemente lentas. La recuperación emite resultados solicitados/completados estructurados, y el estado de diagnóstico se marca como inactivo solo si la misma generación de procesamiento sigue siendo actual. Los diagnósticos `session.stuck` repetidos se reducen mientras la sesión permanece sin cambios.
- Tiempo de espera de inactividad del modelo: OpenClaw aborta una solicitud al modelo cuando no llegan fragmentos de respuesta antes de la ventana de inactividad. `models.providers.<id>.timeoutSeconds` extiende este perro guardián de inactividad para proveedores locales/autohospedados lentos; de lo contrario, OpenClaw usa `agents.defaults.timeoutSeconds` cuando está configurado, limitado a 120 s de forma predeterminada. Las ejecuciones activadas por Cron sin un tiempo de espera explícito de modelo o agente desactivan el perro guardián de inactividad y confían en el tiempo de espera exterior de Cron.
- Tiempo de espera de la solicitud HTTP del proveedor: `models.providers.<id>.timeoutSeconds` se aplica a las recuperaciones HTTP del modelo de ese proveedor, incluyendo la conexión, los encabezados, el cuerpo, el tiempo de espera de la solicitud del SDK, el manejo total de abortos de recuperación protegida y el perro guardián de inactividad del flujo del modelo. Use esto para proveedores locales/autoalojados lentos como Ollama antes de aumentar el tiempo de espera de ejecución completo del agente.

## Dónde las cosas pueden terminar temprano

- Tiempo de espera del agente (abortar)
- AbortSignal (cancelar)
- Desconexión de la puerta de enlace o tiempo de espera de RPC
- Tiempo de espera de `agent.wait` (solo espera, no detiene al agente)

## Relacionado

- [Herramientas](/es/tools) — herramientas de agente disponibles
- [Ganchos](/es/automation/hooks) — scripts controlados por eventos activados por eventos del ciclo de vida del agente
- [Compactación](/es/concepts/compaction) — cómo se resumen las conversaciones largas
- [Aprobaciones de ejecución](/es/tools/exec-approvals) — puertas de aprobación para comandos de shell
- [Pensamiento](/es/tools/thinking) — configuración del nivel de pensamiento/razonamiento
