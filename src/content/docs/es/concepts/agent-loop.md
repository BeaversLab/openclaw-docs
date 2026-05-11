---
summary: "Ciclo de vida del bucle del agente, flujos y semántica de espera"
read_when:
  - You need an exact walkthrough of the agent loop or lifecycle events
  - You are changing session queueing, transcript writes, or session write lock behavior
title: "Bucle de agente"
---

Un bucle de agente es la ejecución completa "real" de un agente: ingesta → ensamblaje de contexto → inferencia del modelo →
ejecución de herramientas → respuestas en streaming → persistencia. Es la ruta autoritativa que convierte un mensaje
en acciones y una respuesta final, manteniendo el estado de la sesión consistente.

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
   - devuelve payloads + metadatos de uso
4. `subscribeEmbeddedPiSession` puentea los eventos de pi-agent-core al flujo `agent` de OpenClaw:
   - eventos de herramientas => `stream: "tool"`
   - deltas del asistente => `stream: "assistant"`
   - eventos del ciclo de vida => `stream: "lifecycle"` (`phase: "start" | "end" | "error"`)
5. `agent.wait` usa `waitForAgentRun`:
   - espera **fin/error del ciclo de vida** para `runId`
   - devuelve `{ status: ok|error|timeout, startedAt, endedAt, error? }`

## Cola y concurrencia

- Las ejecuciones se serializan por clave de sesión (carril de sesión) y opcionalmente a través de un carril global.
- Esto evita condiciones de carrera de herramientas/sesión y mantiene el historial de la sesión consistente.
- Los canales de mensajería pueden elegir modos de cola (collect/steer/followup) que alimentan este sistema de carriles.
  Consulte [Command Queue](/es/concepts/queue).
- Las escrituras en la transcripción también están protegidas por un bloqueo de escritura de sesión en el archivo de sesión. El bloqueo es
  consciente del proceso y basado en archivos, por lo que detecta escritores que omiten la cola en proceso o que provienen de
  otro proceso.
- Los bloqueos de escritura de sesión no son reentrantes por defecto. Si un asistente anida intencionalmente la adquisición del
  mismo bloqueo mientras preserva un único escritor lógico, debe optar explícitamente con
  `allowReentrant: true`.

## Preparación de la sesión + espacio de trabajo

- Se resuelve y se crea el espacio de trabajo; las ejecuciones en sandbox pueden redirigirse a una raíz de espacio de trabajo sandbox.
- Las habilidades se cargan (o se reutilizan desde una instantánea) y se inyectan en el entorno y el prompt.
- Los archivos de arranque/contexto se resuelven e inyectan en el informe del prompt del sistema.
- Se adquiere un bloqueo de escritura de sesión; se abre y prepara `SessionManager` antes de la transmisión. Cualquier
  ruta posterior de reescritura, compactación o truncamiento de la transcripción debe tomar el mismo bloqueo antes de abrir o
  mutar el archivo de transcripción.

## Ensamblaje del prompt + prompt del sistema

- El prompt del sistema se construye a partir del prompt base de OpenClaw, el prompt de habilidades, el contexto de arranque y las anulaciones por ejecución.
- Se aplican los límites específicos del modelo y los tokens de reserva de compactación.
- Consulte [System prompt](/es/concepts/system-prompt) para ver lo que ve el modelo.

## Puntos de enlace (donde puede interceptar)

OpenClaw tiene dos sistemas de enlaces:

- **Internal hooks** (Gateway hooks): scripts controlados por eventos para comandos y eventos del ciclo de vida.
- **Plugin hooks**: puntos de extensión dentro del ciclo de vida del agente/herramienta y la canalización de la puerta de enlace.

### Internal hooks (Gateway hooks)

- **`agent:bootstrap`**: se ejecuta mientras se construyen los archivos de arranque antes de que se finalice el prompt del sistema.
  Úselo para agregar/eliminar archivos de contexto de arranque.
- **Command hooks**: `/new`, `/reset`, `/stop` y otros eventos de comandos (consulte la documentación de Hooks).

Consulte [Hooks](/es/automation/hooks) para la configuración y ejemplos.

### Plugin hooks (agent + gateway lifecycle)

Estos se ejecutan dentro del bucle del agente o la canalización de la puerta de enlace:

- **`before_model_resolve`**: se ejecuta antes de la sesión (sin `messages`) para anular de manera determinista el proveedor/modelo antes de la resolución del modelo.
- **`before_prompt_build`**: se ejecuta después de cargar la sesión (con `messages`) para inyectar `prependContext`, `systemPrompt`, `prependSystemContext` o `appendSystemContext` antes del envío del prompt. Use `prependContext` para texto dinámico por turno y campos de contexto del sistema para una guía estable que debe residir en el espacio del prompt del sistema.
- **`before_agent_start`**: gancho de compatibilidad heredado que puede ejecutarse en cualquier fase; se prefieren los ganchos explícitos anteriores.
- **`before_agent_reply`**: se ejecuta después de las acciones en línea y antes de la llamada al LLM, permitiendo que un complemento se apropie del turno y devuelva una respuesta sintética o silencie el turno por completo.
- **`agent_end`**: inspecciona la lista final de mensajes y los metadatos de ejecución después de la finalización.
- **`before_compaction` / `after_compaction`**: observa o anota ciclos de compactación.
- **`before_tool_call` / `after_tool_call`**: intercepta parámetros/resultados de herramientas.
- **`before_install`**: inspecciona los hallazgos de análisis integrados y, opcionalmente, bloquea la instalación de habilidades o complementos.
- **`tool_result_persist`**: transforma de forma síncrona los resultados de las herramientas antes de que se escriban en una transcripción de sesión propiedad de OpenClaw.
- **`message_received` / `message_sending` / `message_sent`**: ganchos de mensajes entrantes y salientes.
- **`session_start` / `session_end`**: límites del ciclo de vida de la sesión.
- **`gateway_start` / `gateway_stop`**: eventos del ciclo de vida de la puerta de enlace.

Reglas de decisión de gancho para guardias de salida/herramientas:

- `before_tool_call`: `{ block: true }` es terminal y detiene los controladores de menor prioridad.
- `before_tool_call`: `{ block: false }` es una operación nula y no borra un bloqueo previo.
- `before_install`: `{ block: true }` es terminal y detiene los controladores de menor prioridad.
- `before_install`: `{ block: false }` es una operación nula y no borra un bloque anterior.
- `message_sending`: `{ cancel: true }` es terminal y detiene los manejadores de menor prioridad.
- `message_sending`: `{ cancel: false }` es una operación nula y no borra una cancelación anterior.

Consulte [Plugin hooks](/es/plugins/hooks) para obtener detalles sobre la API de enlace y el registro.

Los arneses pueden adaptar estos enlaces de manera diferente. El arnés del servidor de aplicaciones de Codex mantiene los enlaces de complementos de OpenClaw como el contrato de compatibilidad para las superficies reflejadas documentadas, mientras que los enlaces nativos de Codex siguen siendo un mecanismo de Codex de nivel inferior separado.

## Transmisión + respuestas parciales

- Los deltas del asistente se transmiten desde pi-agent-core y se emiten como eventos `assistant`.
- La transmisión de bloques puede emitir respuestas parciales en `text_end` o en `message_end`.
- La transmisión del razonamiento puede emitirse como una transmisión separada o como respuestas de bloque.
- Consulte [Streaming](/es/concepts/streaming) para conocer el comportamiento de fragmentación y respuesta de bloque.

## Ejecución de herramientas + herramientas de mensajería

- Los eventos de inicio/actualización/finalización de herramientas se emiten en la transmisión `tool`.
- Los resultados de las herramientas se depuran para tamaño y cargas de imagen antes del registro/emisión.
- Los envíos de herramientas de mensajería se rastrean para suprimir confirmaciones duplicadas del asistente.

## Formación + supresión de respuestas

- Las cargas útiles finales se ensamblan a partir de:
  - texto del asistente (y razonamiento opcional)
  - resúmenes de herramientas en línea (cuando es detallado + permitido)
  - texto de error del asistente cuando el modelo comete errores
- El token silencioso exacto `NO_REPLY` / `no_reply` se filtra de las
  cargas útiles salientes.
- Los duplicados de herramientas de mensajería se eliminan de la lista final de cargas útiles.
- Si no quedan cargas útiles renderizables y una herramienta generó un error, se emite una respuesta de error de herramienta de respaldo
  (a menos que una herramienta de mensajería ya haya enviado una respuesta visible para el usuario).

## Compactación + reintentos

- La auto-compactación emite eventos de transmisión `compaction` y puede activar un reintento.
- Al reintentar, los búferes en memoria y los resúmenes de herramientas se restablecen para evitar resultados duplicados.
- Consulte [Compaction](/es/concepts/compaction) para conocer la canalización de compactación.

## Flujos de eventos (hoy)

- `lifecycle`: emitido por `subscribeEmbeddedPiSession` (y como respaldo por `agentCommand`)
- `assistant`: deltas transmitidos desde pi-agent-core
- `tool`: eventos de herramientas transmitidos desde pi-agent-core

## Manejo del canal de chat

- Los deltas del asistente se almacenan en el búfer en mensajes de chat `delta`.
- Se emite un chat `final` al **final/error del ciclo de vida**.

## Tiempos de espera

- `agent.wait` por defecto: 30s (solo la espera). El parámetro `timeoutMs` lo anula.
- Tiempo de ejecución del agente: `agents.defaults.timeoutSeconds` por defecto 172800s (48 horas); aplicado en el temporizador de anulación `runEmbeddedPiAgent`.
- Tiempo de espera de inactividad del modelo: OpenClaw aborta una solicitud de modelo cuando no llegan fragmentos de respuesta antes de la ventana de inactividad. `models.providers.<id>.timeoutSeconds` extiende este perro guardián de inactividad para proveedores locales/autohospedados lentos; de lo contrario, OpenClaw usa `agents.defaults.timeoutSeconds` cuando está configurado, limitado a 120 s de forma predeterminada. Las ejecuciones activadas por Cron sin tiempo de espera de modelo o agente explícito desactivan el perro guardián de inactividad y se basan en el tiempo de espera externo de Cron.
- Tiempo de espera de la solicitud HTTP del proveedor: `models.providers.<id>.timeoutSeconds` se aplica a las recuperaciones HTTP del modelo de ese proveedor, incluidos la conexión, los encabezados, el cuerpo, el tiempo de espera de la solicitud del SDK, el manejo total de aborto de recuperación protegida y el perro guardián de inactividad del flujo del modelo. Úselo para proveedores locales/autohospedados lentos como Ollama antes de aumentar todo el tiempo de ejecución del agente.

## Donde las cosas pueden terminar antes

- Tiempo de espera del agente (abortar)
- AbortSignal (cancelar)
- Desconexión de la puerta de enlace o tiempo de espera de RPC
- Tiempo de espera de `agent.wait` (solo espera, no detiene al agente)

## Relacionado

- [Herramientas](/es/tools) — herramientas de agente disponibles
- [Enlaces](/es/automation/hooks) — scripts controlados por eventos activados por eventos del ciclo de vida del agente
- [Compactación](/es/concepts/compaction) — cómo se resumen las conversaciones largas
- [Aprobaciones de ejecución](/es/tools/exec-approvals) — puertas de aprobación para comandos de shell
- [Pensamiento](/es/tools/thinking) — configuración del nivel de pensamiento/razonamiento
