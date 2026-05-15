---
summary: "Flujo de mensajes, sesiones, puesta en cola y visibilidad del razonamiento"
read_when:
  - Explaining how inbound messages become replies
  - Clarifying sessions, queueing modes, or streaming behavior
  - Documenting reasoning visibility and usage implications
title: "Mensajes"
---

OpenClaw maneja los mensajes entrantes a través de una canalización de resolución de sesión, puesta en cola, transmisión, ejecución de herramientas y visibilidad del razonamiento. Esta página mapea la ruta desde el mensaje entrante hasta la respuesta.

## Flujo de mensajes (nivel alto)

```
Inbound message
  -> routing/bindings -> session key
  -> queue (if a run is active)
  -> agent run (streaming + tools)
  -> outbound replies (channel limits + chunking)
```

Los controles clave residen en la configuración:

- `messages.*` para prefijos, colas y comportamiento de grupo.
- `agents.defaults.*` para la transmisión en bloque y los valores predeterminados de fragmentación.
- Anulaciones de canal (`channels.whatsapp.*`, `channels.telegram.*`, etc.) para límites e interruptores de transmisión.

Consulte [Configuración](/es/gateway/configuration) para obtener el esquema completo.

## Deduplicación de entrada

Los canales pueden reenviar el mismo mensaje después de reconectarse. OpenClaw mantiene un caché de corta duración con clave por canal/cuenta/par/sesión/id de mensaje para que las entregas duplicadas no activen otra ejecución del agente.

## Antirrebote de entrada

Los mensajes consecutivos rápidos del **mismo remitente** se pueden agrupar en un solo turno del agente mediante `messages.inbound`. El antirrebote se limita por canal + conversación y utiliza el mensaje más reciente para el hilado/IDs de respuesta.

Configuración (valor predeterminado global + anulaciones por canal):

```json5
{
  messages: {
    inbound: {
      debounceMs: 2000,
      byChannel: {
        whatsapp: 5000,
        slack: 1500,
        discord: 1500,
      },
    },
  },
}
```

Notas:

- El antirrebote se aplica a mensajes de **solo texto**; los medios/adjuntos se envían inmediatamente.
- Los comandos de control omiten el antirrebote para que permanezcan independientes. Los canales que optan explícitamente por la combinación de MD del mismo remitente pueden mantener los comandos de MD dentro de la ventana de antirrebote para que una carga de envío dividido pueda unirse al mismo turno del agente.

## Sesiones y dispositivos

Las sesiones son propiedad de la puerta de enlace, no de los clientes.

- Los chats directos se colapsan en la clave de sesión principal del agente.
- Los grupos/canales obtienen sus propias claves de sesión.
- El almacén de sesiones y las transcripciones residen en el host de la puerta de enlace.

Varios dispositivos/canales pueden asignarse a la misma sesión, pero el historial no se sincroniza completamente con cada cliente. Recomendación: use un dispositivo principal para conversaciones largas para evitar un contexto divergente. La interfaz de usuario de Control y la TUI siempre muestran la transcripción de la sesión respaldada por la puerta de enlace, por lo que son la fuente de verdad.

Detalles: [Gestión de sesiones](/es/concepts/session).

## Metadatos de resultados de herramientas

El resultado de la herramienta `content` es el resultado visible para el modelo. El resultado de la herramienta `details` es
metadatos de tiempo de ejecución para el renderizado de la interfaz de usuario, diagnósticos, entrega de medios y complementos.

OpenClaw mantiene explícito ese límite:

- `toolResult.details` se elimina antes de la repetición del proveedor y la entrada de compactación.
- Las transcripciones de sesión persistidas conservan solo `details` delimitado; los metadatos
  dimensionales excesivos
  se reemplazan con un resumen compacto marcado como `persistedDetailsTruncated: true`.
- Los complementos y las herramientas deben colocar el texto que el modelo debe leer en `content`, no solo
  en `details`.

## Cuerpos de entrada y contexto del historial

OpenClaw separa el **cuerpo del mensaje (prompt)** del **cuerpo del comando**:

- `BodyForAgent`: texto principal orientado al modelo para el mensaje actual. Los complementos de canal deben mantener esto centrado en el texto actual del mensaje que contiene el mensaje del remitente.
- `Body`: reserva de mensaje heredada. Esto puede incluir sobres de canal y
  contenedores de historial opcionales, pero los canales actuales no deben confiar en ello como la
  entrada principal del modelo cuando `BodyForAgent` está disponible.
- `CommandBody`: texto de usuario sin procesar para el análisis de directivas/comandos.
- `RawBody`: alias heredado para `CommandBody` (mantenido por compatibilidad).

Cuando un canal proporciona el historial, utiliza un contenedor compartido:

- `[Chat messages since your last reply - for context]`
- `[Current message - respond to this]`

Para **chats no directos** (grupos/canales/salas), el **cuerpo del mensaje actual** se prefija con la
etiqueta del remitente (mismo estilo utilizado para las entradas del historial). Esto mantiene los mensajes en tiempo real y en cola/históricos
consistentes en el mensaje del agente.

Los búferes de historial son **solo pendientes**: incluyen mensajes grupales que _no_
activaron una ejecución (por ejemplo, mensajes limitados por menciones) y **excluyen** mensajes
que ya están en la transcripción de la sesión.

La eliminación de directivas se aplica únicamente a la sección del **mensaje actual** para que el historial permanezca intacto. Los canales que envuelven el historial deben establecer `CommandBody` (o `RawBody`) en el texto del mensaje original y mantener `Body` como el mensaje combinado.
El historial estructurado, la respuesta, el reenvío y los metadatos del canal se representan como bloques de contexto no confiables de rol de usuario durante el ensamblaje del mensaje.
Los búferes de historial son configurables a través de `messages.groupChat.historyLimit` (predeterminado global) y anulaciones por canal como `channels.slack.historyLimit` o `channels.telegram.accounts.<id>.historyLimit` (establezca `0` para desactivar).

## Puesta en cola y seguimientos

Si una ejecución ya está activa, los mensajes entrantes pueden ponerse en cola, dirigirse a la ejecución actual o recopilarse para un turno de seguimiento.

- Configurar a través de `messages.queue` (y `messages.queue.byChannel`).
- El modo predeterminado es `steer`, con un antirrebote de seguimiento de 500 ms cuando la dirección vuelve a la entrega de seguimiento en cola.
- Modos: `steer`, `followup`, `collect`, `steer-backlog`, `interrupt`, y el modo heredado de uno a la vez `queue`.

Detalles: [Cola de comandos](/es/concepts/queue) y [Cola de dirección](/es/concepts/queue-steering).

## Propiedad de ejecución del canal

Los complementos del canal pueden preservar el orden, aplicar antirrebote a la entrada y aplicar contrapresión de transporte antes de que un mensaje entre en la cola de sesión. No deben imponer un tiempo de espera separado alrededor del turno del agente. Una vez que un mensaje se enruta a una sesión, el trabajo de larga duración se rige por el ciclo de vida de la sesión, la herramienta y el tiempo de ejecución, por lo que todos los canales informan y se recuperan de los turnos lentos de manera consistente.

## Transmisión, fragmentación y procesamiento por lotes

La transmisión por bloques envía respuestas parciales a medida que el modelo produce bloques de texto.
La fragmentación respeta los límites de texto del canal y evita dividir el código cercado.

Configuración clave:

- `agents.defaults.blockStreamingDefault` (`on|off`, desactivado de forma predeterminada)
- `agents.defaults.blockStreamingBreak` (`text_end|message_end`)
- `agents.defaults.blockStreamingChunk` (`minChars|maxChars|breakPreference`)
- `agents.defaults.blockStreamingCoalesce` (agrupamiento basado en inactividad)
- `agents.defaults.humanDelay` (pausa similar a la humana entre respuestas de bloques)
- Sobrescrituras de canal: `*.blockStreaming` y `*.blockStreamingCoalesce` (los canales que no son Telegram requieren `*.blockStreaming: true` explícito)

Detalles: [Streaming + chunking](/es/concepts/streaming).

## Visibilidad del razonamiento y tokens

OpenClaw puede exponer u ocultar el razonamiento del modelo:

- `/reasoning on|off|stream` controla la visibilidad.
- El contenido del razonamiento aún cuenta hacia el uso de tokens cuando es producido por el modelo.
- Telegram admite el flujo de razonamiento en una burbuja de borrador transitorio que se elimina después de la entrega final; use `/reasoning on` para una salida de razonamiento persistente.

Detalles: [Thinking + reasoning directives](/es/tools/thinking) y [Token use](/es/reference/token-use).

## Prefijos, hilos y respuestas

El formato de los mensajes salientes está centralizado en `messages`:

- `messages.responsePrefix`, `channels.<channel>.responsePrefix` y `channels.<channel>.accounts.<id>.responsePrefix` (cascada de prefijos de salida), más `channels.whatsapp.messagePrefix` (prefijo de entrada de WhatsApp)
- Hilos de respuesta a través de `replyToMode` y valores predeterminados por canal

Detalles: [Configuration](/es/gateway/config-agents#messages) y documentación de canales.

## Respuestas silenciosas

El token silencioso exacto `NO_REPLY` / `no_reply` significa "no entregar una respuesta visible para el usuario".
Cuando un turno también tiene medios de herramientas pendientes, como audio TTS generado, OpenClaw
elimina el texto silencioso pero aún entrega el archivo adjunto de medios.
OpenClaw resuelve ese comportamiento por tipo de conversación:

- Las conversaciones directas no permiten el silencio de forma predeterminada y reescriben una respuesta silenciosa simple
  a una alternativa visible corta.
- Los grupos/canales permiten el silencio de forma predeterminada.
- La orquestación interna permite el silencio de forma predeterminada.

OpenClaw también utiliza respuestas silenciosas para fallos internos del ejecutor que ocurren
antes de cualquier respuesta del asistente en chats no directos, de modo que los grupos/canales no vean
el texto estándar de error de puerta de enlace. Los chats directos muestran un texto de fallo compacto de forma predeterminada;
los detalles brutos del ejecutor se muestran solo cuando `/verbose` está `on` o `full`.

Los valores predeterminados se encuentran en `agents.defaults.silentReply` y
`agents.defaults.silentReplyRewrite`; `surfaces.<id>.silentReply` y
`surfaces.<id>.silentReplyRewrite` pueden anularlos por superficie.

Cuando la sesión principal tiene una o más ejecuciones de subagente generadas pendientes, las
respuestas silenciosas simples se descartan en todas las superficies en lugar de ser reescritas, por lo que
el padre permanece en silencio hasta que el evento de finalización del hijo entrega la respuesta real.

## Relacionado

- [Refactorización del ciclo de vida del mensaje](/es/concepts/message-lifecycle-refactor) - diseño de envío y recepción duraderos objetivo
- [Streaming](/es/concepts/streaming) — entrega de mensajes en tiempo real
- [Reintento](/es/concepts/retry) — comportamiento de reintento de entrega de mensajes
- [Cola](/es/concepts/queue) — cola de procesamiento de mensajes
- [Canales](/es/channels) — integraciones de plataformas de mensajería
