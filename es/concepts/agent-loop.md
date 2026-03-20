---
summary: "Ciclo de vida del bucle del agente, flujos y semántica de espera"
read_when:
  - Necesitas un recorrido exacto del bucle del agente o de los eventos del ciclo de vida
title: "Bucle del agente"
---

# Bucle del Agente (OpenClaw)

Un bucle de agente es la ejecución completa “real” de un agente: ingesta → ensamblaje de contexto → inferencia del modelo →
ejecución de herramientas → respuestas en flujo → persistencia. Es la ruta autorizada que convierte un mensaje
en acciones y una respuesta final, manteniendo el estado de la sesión consistente.

En OpenClaw, un bucle es una única ejecución serializada por sesión que emite eventos de ciclo de vida y de flujo
mientras el modelo piensa, llama a herramientas y transmite la salida. Este documento explica cómo ese bucle auténtico está
conectado de extremo a extremo.

## Puntos de entrada

- RPC de Gateway: `agent` y `agent.wait`.
- CLI: comando `agent`.

## Cómo funciona (alto nivel)

1. El RPC `agent` valida los parámetros, resuelve la sesión (sessionKey/sessionId), persiste los metadatos de la sesión, devuelve `{ runId, acceptedAt }` inmediatamente.
2. `agentCommand` ejecuta el agente:
   - resuelve el modelo + valores predeterminados de pensamiento/verbosidad
   - carga la instantánea de habilidades
   - llama a `runEmbeddedPiAgent` (tiempo de ejecución de pi-agent-core)
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
   - eventos de ciclo de vida => `stream: "lifecycle"` (`phase: "start" | "end" | "error"`)
5. `agent.wait` usa `waitForAgentJob`:
   - espera **final/error del ciclo de vida** para `runId`
   - devuelve `{ status: ok|error|timeout, startedAt, endedAt, error? }`

## Puesta en cola + concurrencia

- Las ejecuciones se serializan por clave de sesión (carril de sesión) y opcionalmente a través de un carril global.
- Esto evita carreras de herramientas/sesión y mantiene el historial de sesiones consistente.
- Los canales de mensajería pueden elegir modos de cola (collect/steer/followup) que alimentan este sistema de carriles.
  Consulte [Cola de comandos](/es/concepts/queue).

## Sesión + preparación del espacio de trabajo

- Se resuelve y se crea el espacio de trabajo; las ejecuciones en sandbox pueden redirigirse a una raíz de espacio de trabajo sandbox.
- Las habilidades se cargan (o se reutilizan desde una instantánea) y se inyectan en el entorno y el prompt.
- Los archivos de arranque/contexto se resuelven y se inyectan en el informe del prompt del sistema.
- Se adquiere un bloqueo de escritura de sesión; `SessionManager` se abre y prepara antes de la transmisión.

## Ensamblaje del prompt + prompt del sistema

- El prompt del sistema se construye a partir del prompt base de OpenClaw, el prompt de habilidades, el contexto de arranque y las anulaciones por ejecución.
- Se aplican los límites específicos del modelo y los tokens de reserva de compactación.
- Consulte [Prompt del sistema](/es/concepts/system-prompt) para ver lo que ve el modelo.

## Puntos de enlace (donde puede interceptar)

OpenClaw tiene dos sistemas de enlaces:

- **Internal hooks** (Gateway hooks): scripts controlados por eventos para comandos y eventos del ciclo de vida.
- **Plugin hooks**: puntos de extensión dentro del ciclo de vida del agente/herramienta y la canalización de la puerta de enlace.

### Enlaces internos (Enlaces de puerta de enlace)

- **`agent:bootstrap`**: se ejecuta mientras se construyen los archivos de arranque antes de que se finalice el prompt del sistema.
  Use esto para agregar/eliminar archivos de contexto de arranque.
- **Ganchos de comandos**: `/new`, `/reset`, `/stop`, y otros eventos de comandos (ver documentación de Hooks).

Consulte [Hooks](/es/automation/hooks) para obtener la configuración y ejemplos.

### Enlaces de complemento (ciclo de vida del agente + puerta de enlace)

Estos se ejecutan dentro del bucle del agente o la canalización de la puerta de enlace:

- **`before_model_resolve`**: se ejecuta antes de la sesión (sin `messages`) para anular de forma determinista el proveedor/modelo antes de la resolución del modelo.
- **`before_prompt_build`**: se ejecuta después de cargar la sesión (con `messages`) para inyectar `prependContext`, `systemPrompt`, `prependSystemContext` o `appendSystemContext` antes del envío del prompt. Use `prependContext` para texto dinámico por turno y campos de contexto del sistema para orientación estable que debe ubicarse en el espacio del prompt del sistema.
- **`before_agent_start`**: gancho de compatibilidad heredado que puede ejecutarse en cualquier fase; se prefieren los ganchos explícitos anteriores.
- **`agent_end`**: inspecciona la lista final de mensajes y ejecuta metadatos después de la finalización.
- **`before_compaction` / `after_compaction`**: observa o anota los ciclos de compactación.
- **`before_tool_call` / `after_tool_call`**: intercepta los parámetros/resultados de las herramientas.
- **`tool_result_persist`**: transforma de forma síncrona los resultados de las herramientas antes de que se escriban en la transcripción de la sesión.
- **`message_received` / `message_sending` / `message_sent`**: ganchos de mensajes entrantes + salientes.
- **`session_start` / `session_end`**: límites del ciclo de vida de la sesión.
- **`gateway_start` / `gateway_stop`**: eventos del ciclo de vida de la puerta de enlace.

Consulte [Plugins](/es/tools/plugin#plugin-hooks) para obtener detalles sobre la API de ganchos y el registro.

## Streaming + respuestas parciales

- Los deltas del asistente se transmiten desde pi-agent-core y se emiten como eventos `assistant`.
- La transmisión por bloques puede emitir respuestas parciales ya sea en `text_end` o en `message_end`.
- El streaming de razonamiento puede emitirse como una secuencia independiente o como respuestas en bloque.
- Consulte [Streaming](/es/concepts/streaming) para conocer el comportamiento de fragmentación y respuesta de bloque.

## Ejecución de herramientas + herramientas de mensajería

- Los eventos de inicio/actualización/finalización de herramientas se emiten en el flujo `tool`.
- Los resultados de las herramientas se sanean por tamaño y cargas de imagen antes del registro/emisión.
- Los envíos de herramientas de mensajería se rastrean para suprimir confirmaciones duplicadas del asistente.

## Formación y supresión de respuestas

- Las cargas útiles finales se ensamblan a partir de:
  - texto del asistente (y razonamiento opcional)
  - resúmenes de herramientas en línea (cuando es detallado + permitido)
  - texto de error del asistente cuando el modelo comete errores
- `NO_REPLY` se trata como un token silencioso y se filtra de las cargas útiles salientes.
- Los duplicados de herramientas de mensajería se eliminan de la lista final de cargas útiles.
- Si no quedan cargas útiles renderizables y una herramienta produjo un error, se emite una respuesta de error de herramienta de respaldo
  (a menos que una herramienta de mensajería ya haya enviado una respuesta visible para el usuario).

## Compactación + reintentos

- La compactación automática emite eventos de flujo `compaction` y puede activar un reintento.
- Al reintentar, los búferes en memoria y los resúmenes de herramientas se restablecen para evitar resultados duplicados.
- Consulte [Compaction](/es/concepts/compaction) para conocer la canalización de compactación.

## Flujos de eventos (actualidad)

- `lifecycle`: emitido por `subscribeEmbeddedPiSession` (y como respaldo por `agentCommand`)
- `assistant`: deltas transmitidos desde pi-agent-core
- `tool`: eventos de herramienta transmitidos desde pi-agent-core

## Manejo del canal de chat

- Los deltas del asistente se almacenan en búfer en mensajes de chat `delta`.
- Se emite un chat `final` al **final/error del ciclo de vida**.

## Tiempos de espera

- `agent.wait` valor predeterminado: 30 s (solo la espera). El parámetro `timeoutMs` lo anula.
- Tiempo de ejecución del agente: `agents.defaults.timeoutSeconds` valor predeterminado 600 s; aplicado en el temporizador de anulación `runEmbeddedPiAgent`.

## Dónde las cosas pueden terminar antes

- Tiempo de espera del agente (anular)
- AbortSignal (cancelar)
- Desconexión de Gateway o tiempo de espera de RPC
- Tiempo de espera `agent.wait` (solo espera, no detiene al agente)

import en from "/components/footer/en.mdx";

<en />
