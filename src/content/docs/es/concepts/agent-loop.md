---
summary: "Ciclo de vida del bucle del agente, flujos y semántica de espera"
read_when:
  - You need an exact walkthrough of the agent loop or lifecycle events
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
   - resuelve el modelo + valores predeterminados de pensamiento/verbosidad
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
5. `agent.wait` usa `waitForAgentJob`:
   - espera el **fin/error del ciclo de vida** para `runId`
   - devuelve `{ status: ok|error|timeout, startedAt, endedAt, error? }`

## Puesta en cola + concurrencia

- Las ejecuciones se serializan por clave de sesión (carril de sesión) y opcionalmente a través de un carril global.
- Esto evita carreras de herramientas/sesión y mantiene el historial de sesiones consistente.
- Los canales de mensajería pueden elegir modos de cola (collect/steer/followup) que alimentan este sistema de carriles.
  Consulte [Command Queue](/en/concepts/queue).

## Sesión + preparación del espacio de trabajo

- Se resuelve y se crea el espacio de trabajo; las ejecuciones en sandbox pueden redirigirse a una raíz de espacio de trabajo sandbox.
- Las habilidades se cargan (o se reutilizan desde una instantánea) y se inyectan en el entorno y el prompt.
- Los archivos de arranque/contexto se resuelven y se inyectan en el informe del prompt del sistema.
- Se adquiere un bloqueo de escritura de sesión; `SessionManager` se abre y se prepara antes de la transmisión.

## Ensamblaje del prompt + prompt del sistema

- El prompt del sistema se construye a partir del prompt base de OpenClaw, el prompt de habilidades, el contexto de arranque y las anulaciones por ejecución.
- Se aplican los límites específicos del modelo y los tokens de reserva de compactación.
- Consulte [System prompt](/en/concepts/system-prompt) para ver lo que ve el modelo.

## Puntos de enlace (donde puede interceptar)

OpenClaw tiene dos sistemas de enlaces:

- **Internal hooks** (Gateway hooks): scripts controlados por eventos para comandos y eventos del ciclo de vida.
- **Plugin hooks**: puntos de extensión dentro del ciclo de vida del agente/herramienta y la canalización de la puerta de enlace.

### Enlaces internos (Enlaces de puerta de enlace)

- **`agent:bootstrap`**: se ejecuta mientras se crean los archivos de arranque antes de que finalice el prompt del sistema.
  Úselo para agregar/eliminar archivos de contexto de arranque.
- **Command hooks**: `/new`, `/reset`, `/stop` y otros eventos de comando (consulte la documentación de Hooks).

Consulte [Hooks](/en/automation/hooks) para la configuración y ejemplos.

### Enlaces de complemento (ciclo de vida del agente + puerta de enlace)

Estos se ejecutan dentro del bucle del agente o la canalización de la puerta de enlace:

- **`before_model_resolve`**: se ejecuta antes de la sesión (sin `messages`) para anular de manera determinista el proveedor/modelo antes de la resolución del modelo.
- **`before_prompt_build`**: se ejecuta después de cargar la sesión (con `messages`) para inyectar `prependContext`, `systemPrompt`, `prependSystemContext` o `appendSystemContext` antes del envío del prompt. Use `prependContext` para texto dinámico por turno y campos de contexto del sistema para una orientación estable que debe ubicarse en el espacio del prompt del sistema.
- **`before_agent_start`**: gancho de compatibilidad heredado que puede ejecutarse en cualquiera de las dos fases; se prefieren los ganchos explícitos anteriores.
- **`agent_end`**: inspeccionar la lista final de mensajes y los metadatos de ejecución tras la finalización.
- **`before_compaction` / `after_compaction`**: observar o anotar ciclos de compactación.
- **`before_tool_call` / `after_tool_call`**: interceptar parámetros/resultados de herramientas.
- **`before_install`**: inspecciona los hallazgos de análisis integrados y, opcionalmente, bloquea la instalación de habilidades o complementos.
- **`tool_result_persist`**: transforma sincrónicamente los resultados de las herramientas antes de que se escriban en la transcripción de la sesión.
- **`message_received` / `message_sending` / `message_sent`**: enlaces de mensajes entrantes y salientes.
- **`session_start` / `session_end`**: límites del ciclo de vida de la sesión.
- **`gateway_start` / `gateway_stop`**: eventos del ciclo de vida de la puerta de enlace.

Reglas de decisión de enlace para guardias de salida/herramientas:

- `before_tool_call`: `{ block: true }` es terminal y detiene los manejadores de menor prioridad.
- `before_tool_call`: `{ block: false }` es una no-op y no borra un bloqueo anterior.
- `before_install`: `{ block: true }` es terminal y detiene los manejadores de menor prioridad.
- `before_install`: `{ block: false }` es una no-op y no borra un bloqueo anterior.
- `message_sending`: `{ cancel: true }` es terminal y detiene los manejadores de menor prioridad.
- `message_sending`: `{ cancel: false }` es una no-op y no borra una cancelación anterior.

Consulte [Plugin hooks](/en/plugins/architecture#provider-runtime-hooks) para obtener detalles sobre la API de enlace y el registro.

## Streaming + respuestas parciales

- Los deltas del asistente se transmiten desde pi-agent-core y se emiten como eventos `assistant`.
- La transmisión en bloques puede emitir respuestas parciales en `text_end` o `message_end`.
- La transmisión de razonamiento puede emitirse como una transmisión separada o como respuestas en bloque.
- Consulte [Streaming](/en/concepts/streaming) para conocer el comportamiento de fragmentación y respuestas en bloque.

## Ejecución de herramientas + herramientas de mensajería

- Los eventos de inicio/actualización/finalización de herramientas se emiten en el flujo `tool`.
- Los resultados de las herramientas se sanitizan por tamaño y cargas de imagen antes del registro/emisión.
- Los envíos de herramientas de mensajería se rastrean para suprimir confirmaciones duplicadas del asistente.

## Conformación + supresión de respuestas

- Las cargas finales se ensamblan a partir de:
  - texto del asistente (y razonamiento opcional)
  - resúmenes de herramientas en línea (cuando es detallado + permitido)
  - texto de error del asistente cuando el modelo tiene errores
- `NO_REPLY` se trata como un token silencioso y se filtra de las cargas salientes.
- Los duplicados de herramientas de mensajería se eliminan de la lista de cargas finales.
- Si no quedan cargas renderizables y una herramienta tuvo un error, se emite una respuesta de error de herramienta alternativa
  (a menos que una herramienta de mensajería ya haya enviado una respuesta visible para el usuario).

## Compactación + reintentos

- La auto-compactación emite eventos de flujo `compaction` y puede activar un reintento.
- Al reintentar, los búferes en memoria y los resúmenes de herramientas se restablecen para evitar resultados duplicados.
- Consulte [Compaction](/en/concepts/compaction) para conocer la canalización de compactación.

## Flujos de eventos (hoy)

- `lifecycle`: emitido por `subscribeEmbeddedPiSession` (y como alternativa por `agentCommand`)
- `assistant`: deltas transmitidos desde pi-agent-core
- `tool`: eventos de herramientas transmitidos desde pi-agent-core

## Manejo del canal de chat

- Los deltas del asistente se almacenan en búfer en mensajes de chat `delta`.
- Se emite un `final` de chat al **final/error del ciclo de vida**.

## Tiempos de espera

- `agent.wait` predeterminado: 30s (solo la espera). El parámetro `timeoutMs` anula esto.
- Tiempo de ejecución del agente: `agents.defaults.timeoutSeconds` predeterminado 172800s (48 horas); aplicado en el temporizador de interrupción `runEmbeddedPiAgent`.

## Dónde las cosas pueden terminar antes

- Tiempo de espera del agente (abortar)
- AbortSignal (cancelar)
- Desconexión de la puerta de enlace o tiempo de espera de RPC
- Tiempo de espera `agent.wait` (solo espera, no detiene al agente)

## Relacionado

- [Herramientas](/en/tools) — herramientas de agente disponibles
- [Ganchos](/en/automation/hooks) — scripts controlados por eventos activados por eventos del ciclo de vida del agente
- [Compactación](/en/concepts/compaction) — cómo se resumen las conversaciones largas
- [Aprobaciones de ejecución](/en/tools/exec-approvals) — puertas de aprobación para comandos de shell
- [Pensamiento](/en/tools/thinking) — configuración del nivel de pensamiento/razonamiento
