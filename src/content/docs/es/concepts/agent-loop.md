---
summary: "Ciclo de vida del bucle del agente, flujos y semántica de espera"
read_when:
  - You need an exact walkthrough of the agent loop or lifecycle events
  - You are changing session queueing, transcript writes, or session write lock behavior
title: "Bucle del Agente"
---

# Bucle del Agente (OpenClaw)

Un bucle agentic es la ejecución completa "real" de un agente: ingesta → ensamblaje de contexto → inferencia del modelo → ejecución de herramientas → respuestas en flujo → persistencia. Es la ruta autorizada que convierte un mensaje en acciones y una respuesta final, manteniendo el estado de la sesión consistente.

En OpenClaw, un bucle es una única ejecución serializada por sesión que emite eventos de ciclo de vida y de flujo a medida que el modelo piensa, llama a herramientas y transmite la salida. Este documento explica cómo se conecta ese bucle auténtico de extremo a extremo.

## Puntos de entrada

- RPC de Gateway: `agent` y `agent.wait`.
- CLI: comando `agent`.

## Cómo funciona (alto nivel)

1. El RPC `agent` valida los parámetros, resuelve la sesión (sessionKey/sessionId), persiste los metadatos de la sesión, devuelve `{ runId, acceptedAt }` inmediatamente.
2. `agentCommand` ejecuta el agente:
   - resuelve el modelo y los valores predeterminados de thinking/verbose/trace
   - carga la instantánea de habilidades
   - llama a `runEmbeddedPiAgent` (tiempo de ejecución pi-agent-core)
   - emite **fin/error del ciclo de vida** si el bucle incrustado no emite uno
3. `runEmbeddedPiAgent`:
   - serializa las ejecuciones a través de colas por sesión + globales
   - resuelve el modelo + perfil de autenticación y construye la sesión pi
   - se suscribe a eventos pi y transmite los deltas del asistente/herramientas
   - hace cumplir el tiempo de espera -> aborta la ejecución si se excede
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
- Las escrituras en la transcripción también están protegidas por un bloqueo de escritura de sesión en el archivo de sesión. El bloqueo es
  consciente del proceso y basado en archivos, por lo que detecta escritores que omiten la cola en proceso o provienen de
  otro proceso.
- Los bloqueos de escritura de sesión no son reentrantes por defecto. Si un asistente anida intencionalmente la adquisición de
  el mismo bloqueo mientras preserva un único escritor lógico, debe optar explícitamente con
  `allowReentrant: true`.

## Preparación de la sesión + espacio de trabajo

- El espacio de trabajo se resuelve y se crea; las ejecuciones en sandbox pueden redirigirse a una raíz de espacio de trabajo sandbox.
- Las habilidades se cargan (o se reutilizan desde una instantánea) y se inyectan en el entorno y el prompt.
- Los archivos de arranque/contexto se resuelven e inyectan en el informe del prompt del sistema.
- Se adquiere un bloqueo de escritura de sesión; se abre y prepara `SessionManager` antes de la transmisión. Cualquier
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
- **Enlaces de comando**: `/new`, `/reset`, `/stop` y otros eventos de comando (consulte la documentación de Hooks).

Consulte [Hooks](/es/automation/hooks) para obtener configuración y ejemplos.

### Enlaces de complementos (ciclo de vida del agente + gateway)

Estos se ejecutan dentro del bucle del agente o la canalización de gateway:

- **`before_model_resolve`**: se ejecuta antes de la sesión (sin `messages`) para anular de manera determinista el proveedor/modelo antes de la resolución del modelo.
- **`before_prompt_build`**: se ejecuta después de cargar la sesión (con `messages`) para inyectar `prependContext`, `systemPrompt`, `prependSystemContext` o `appendSystemContext` antes del envío del prompt. Use `prependContext` para texto dinámico por turno y campos de contexto del sistema para orientación estable que debe residir en el espacio del prompt del sistema.
- **`before_agent_start`**: enlace de compatibilidad heredado que puede ejecutarse en cualquier fase; se prefieren los enlaces explícitos anteriores.
- **`before_agent_reply`**: se ejecuta después de las acciones en línea y antes de la llamada al LLM, permitiendo que un complemento se apropie del turno y devuelva una respuesta sintética o silencie el turno por completo.
- **`agent_end`**: inspecciona la lista final de mensajes y metadatos de ejecución después de la finalización.
- **`before_compaction` / `after_compaction`**: observar o anotar ciclos de compactación.
- **`before_tool_call` / `after_tool_call`**: interceptar parámetros/resultados de herramientas.
- **`before_install`**: inspecciona los hallazgos de análisis integrados y, opcionalmente, bloquea la instalación de habilidades o complementos.
- **`tool_result_persist`**: transforma sincrónicamente los resultados de las herramientas antes de que se escriban en la transcripción de la sesión.
- **`message_received` / `message_sending` / `message_sent`**: enlaces de mensajes entrantes y salientes.
- **`session_start` / `session_end`**: límites del ciclo de vida de la sesión.
- **`gateway_start` / `gateway_stop`**: eventos del ciclo de vida de la puerta de enlace.

Reglas de decisión de enlace para protecciones salientes/de herramientas:

- `before_tool_call`: `{ block: true }` es terminal y detiene los controladores de menor prioridad.
- `before_tool_call`: `{ block: false }` es una no operación y no borra un bloqueo previo.
- `before_install`: `{ block: true }` es terminal y detiene los controladores de menor prioridad.
- `before_install`: `{ block: false }` es una no-op y no borra un bloque previo.
- `message_sending`: `{ cancel: true }` es terminal y detiene los controladores de menor prioridad.
- `message_sending`: `{ cancel: false }` es una no-op y no borra una cancelación previa.

Consulte [Enlaces de complemento](/es/plugins/architecture#provider-runtime-hooks) para obtener detalles sobre la API de enlaces y el registro.

## Transmisión + respuestas parciales

- Los deltas del asistente se transmiten desde pi-agent-core y se emiten como eventos `assistant`.
- La transmisión de bloques puede emitir respuestas parciales en `text_end` o en `message_end`.
- La transmisión del razonamiento puede emitirse como una transmisión separada o como respuestas de bloque.
- Consulte [Transmisión](/es/concepts/streaming) para conocer el comportamiento de fragmentación y respuesta de bloque.

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
- Consulte [Compactación](/es/concepts/compaction) para conocer la canalización de compactación.

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
- Tiempo de espera de inactividad del LLM: `agents.defaults.llm.idleTimeoutSeconds` anula una solicitud del modelo cuando no llegan fragmentos de respuesta antes de la ventana de inactividad. Establézcalo explícitamente para modelos locales lentos o proveedores de razonamiento/llamadas a herramientas; establézcalo en 0 para desactivarlo. Si no se establece, OpenClaw usa `agents.defaults.timeoutSeconds` cuando está configurado; de lo contrario, 120s. Las ejecuciones activadas por Cron sin un tiempo de espera explícito de LLM o agente desactivan el perro guardián de inactividad y se basan en el tiempo de espera externo de cron.

## Dónde las cosas pueden terminar antes de tiempo

- Tiempo de espera del agente (anulación)
- AbortSignal (cancelar)
- Desconexión de la puerta de enlace o tiempo de espera de RPC
- Tiempo de espera `agent.wait` (solo espera, no detiene al agente)

## Relacionado

- [Herramientas](/es/tools) — herramientas de agente disponibles
- [Ganchos (Hooks)](/es/automation/hooks) — scripts controlados por eventos activados por eventos del ciclo de vida del agente
- [Compactación](/es/concepts/compaction) — cómo se resumen las conversaciones largas
- [Aprobaciones de Exec](/es/tools/exec-approvals) — puertas de aprobación para comandos de shell
- [Pensamiento (Thinking)](/es/tools/thinking) — configuración del nivel de pensamiento/razonamiento
