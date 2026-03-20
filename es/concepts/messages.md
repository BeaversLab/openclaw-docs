---
summary: "Flujo de mensajes, sesiones, puesta en cola y visibilidad del razonamiento"
read_when:
  - Explicando cómo los mensajes entrantes se convierten en respuestas
  - Aclarando las sesiones, los modos de puesta en cola o el comportamiento de streaming
  - Documentando la visibilidad del razonamiento y las implicaciones de uso
title: "Mensajes"
---

# Mensajes

Esta página conecta cómo OpenClaw maneja los mensajes entrantes, las sesiones, la puesta en cola,
el streaming y la visibilidad del razonamiento.

## Flujo de mensajes (alto nivel)

```
Inbound message
  -> routing/bindings -> session key
  -> queue (if a run is active)
  -> agent run (streaming + tools)
  -> outbound replies (channel limits + chunking)
```

Los controles clave se encuentran en la configuración:

- `messages.*` para prefijos, puesta en cola y comportamiento de grupo.
- `agents.defaults.*` para el streaming de bloques y los valores predeterminados de fragmentación.
- Sobrescrituras de canal (`channels.whatsapp.*`, `channels.telegram.*`, etc.) para límites y alternadores de streaming.

Consulte [Configuration](/es/gateway/configuration) para ver el esquema completo.

## Deduplicación de entrada

Los canales pueden reenviar el mismo mensaje después de reconectarse. OpenClaw mantiene un
caché de corta duración claveada por canal/cuenta/par/sesión/id de mensaje para que las
entregas duplicadas no activen otra ejecución del agente.

## Antirrebote de entrada

Los mensajes rápidos consecutivos del **mismo remitente** se pueden agrupar en una sola
turno de agente a través de `messages.inbound`. El antirrebote está limitado por canal + conversación
y usa el mensaje más reciente para el hilado/IDs de respuesta.

Configuración (valor predeterminado global + sobrescrituras por canal):

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

- El antirrebote se aplica a mensajes de **solo texto**; los medios/archivos adjuntos se vacían inmediatamente.
- Los comandos de control omiten el antirrebote para que permanezcan independientes.

## Sesiones y dispositivos

Las sesiones son propiedad de la puerta de enlace, no de los clientes.

- Los chats directos colapsan en la clave de sesión principal del agente.
- Los grupos/canales obtienen sus propias claves de sesión.
- El almacén de sesiones y las transcripciones residen en el host de la puerta de enlace.

Varios dispositivos/canales pueden asignarse a la misma sesión, pero el historial no se sincroniza completamente
de vuelta a cada cliente. Recomendación: use un dispositivo principal para conversaciones
largas para evitar un contexto divergente. La interfaz de usuario de Control y la TUI siempre muestran la
transcripción de sesión respaldada por la puerta de enlace, por lo que son la fuente de verdad.

Detalles: [Gestión de sesiones](/es/concepts/session).

## Cuerpos de entrada e historial de contexto

OpenClaw separa el **cuerpo del prompt** del **cuerpo del comando**:

- `Body`: texto del prompt enviado al agente. Esto puede incluir sobres del canal y contenedores de historial opcionales.
- `CommandBody`: texto de usuario sin procesar para el análisis de directivas/comandos.
- `RawBody`: alias heredado para `CommandBody` (se mantiene por compatibilidad).

Cuando un canal proporciona el historial, utiliza un contenedor compartido:

- `[Chat messages since your last reply - for context]`
- `[Current message - respond to this]`

Para **chats no directos** (grupos/canales/salas), el **cuerpo del mensaje actual** tiene el prefijo de la etiqueta del remitente (mismo estilo utilizado para las entradas del historial). Esto mantiene los mensajes en tiempo real y en cola/históricos coherentes en el prompt del agente.

Los búfers del historial son **solo pendientes**: incluyen mensajes de grupo que _no_ activaron una ejecución (por ejemplo, mensajes con puerta de mención) y **excluyen** mensajes ya presentes en la transcripción de la sesión.

La eliminación de directivas solo se aplica a la sección de **mensaje actual** para que el historial permanezca intacto. Los canales que envuelven el historial deben establecer `CommandBody` (o `RawBody`) al texto del mensaje original y mantener `Body` como el prompt combinado. Los búfers del historial son configurables mediante `messages.groupChat.historyLimit` (predeterminado global) y anulaciones por canal como `channels.slack.historyLimit` o `channels.telegram.accounts.<id>.historyLimit` (establezca `0` para desactivar).

## Puesta en cola y seguimientos

Si una ejecución ya está activa, los mensajes entrantes se pueden poner en cola, dirigir a la ejecución actual o recopilar para un turno de seguimiento.

- Configure mediante `messages.queue` (y `messages.queue.byChannel`).
- Modos: `interrupt`, `steer`, `followup`, `collect`, más variantes de acumulación.

Detalles: [Puesta en cola](/es/concepts/queue).

## Transmisión, fragmentación y procesamiento por lotes

La transmisión por bloques envía respuestas parciales a medida que el modelo produce bloques de texto. La fragmentación respeta los límites de texto del canal y evita dividir el código cercado.

Configuraciones clave:

- `agents.defaults.blockStreamingDefault` (`on|off`, desactivado de forma predeterminada)
- `agents.defaults.blockStreamingBreak` (`text_end|message_end`)
- `agents.defaults.blockStreamingChunk` (`minChars|maxChars|breakPreference`)
- `agents.defaults.blockStreamingCoalesce` (agrupamiento basado en inactividad)
- `agents.defaults.humanDelay` (pausa similar a la humana entre respuestas de bloques)
- Sobrescrituras de canal: `*.blockStreaming` y `*.blockStreamingCoalesce` (los canales que no sean Telegram requieren `*.blockStreaming: true` explícito)

Detalles: [Streaming + chunking](/es/concepts/streaming).

## Visibilidad del razonamiento y tokens

OpenClaw puede exponer u ocultar el razonamiento del modelo:

- `/reasoning on|off|stream` controla la visibilidad.
- El contenido del razonamiento todavía cuenta hacia el uso de tokens cuando es producido por el modelo.
- Telegram soporta el flujo de razonamiento dentro de la burbuja de borrador.

Detalles: [Directivas de pensamiento + razonamiento](/es/tools/thinking) y [Uso de tokens](/es/reference/token-use).

## Prefijos, hilos y respuestas

El formato de los mensajes salientes está centralizado en `messages`:

- `messages.responsePrefix`, `channels.<channel>.responsePrefix` y `channels.<channel>.accounts.<id>.responsePrefix` (cascada de prefijo saliente), además de `channels.whatsapp.messagePrefix` (prefijo de entrada de WhatsApp)
- Hilos de respuesta a través de `replyToMode` y valores predeterminados por canal

Detalles: [Configuración](/es/gateway/configuration#messages) y documentación de canales.

import es from "/components/footer/es.mdx";

<es />
