---
summary: "Flujo de mensajes, sesiones, puesta en cola y visibilidad del razonamiento"
read_when:
  - Explaining how inbound messages become replies
  - Clarifying sessions, queueing modes, or streaming behavior
  - Documenting reasoning visibility and usage implications
title: "Mensajes"
---

# Mensajes

Esta página une cómo OpenClaw maneja los mensajes entrantes, las sesiones, la puesta en cola,
la transmisión y la visibilidad del razonamiento.

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
- `agents.defaults.*` para la transmisión en bloques y valores predeterminados de fragmentación.
- Anulaciones de canal (`channels.whatsapp.*`, `channels.telegram.*`, etc.) para límites e interruptores de transmisión.

Consulte [Configuración](/es/gateway/configuration) para ver el esquema completo.

## Deduplicación entrante

Los canales pueden reentregar el mismo mensaje después de reconectarse. OpenClaw mantiene una
caché de corta duración con clave por canal/cuenta/par/sesión/id de mensaje para que las
entregas duplicadas no desencadenen otra ejecución del agente.

## Antirrebote entrante

Los mensajes rápidos consecutivos del **mismo remitente** se pueden procesar por lotes en un solo
turno del agente mediante `messages.inbound`. El antirrebote se limita por canal + conversación
y utiliza el mensaje más reciente para el hilado/IDs de respuesta.

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

- El antirrebote se aplica a mensajes de **solo texto**; los medios/archivos adjuntos se envían inmediatamente.
- Los comandos de control omiten el antirrebote para que permanezcan independientes.

## Sesiones y dispositivos

Las sesiones son propiedad de la puerta de enlace, no de los clientes.

- Los chats directos se colapsan en la clave de sesión principal del agente.
- Los grupos/canales obtienen sus propias claves de sesión.
- El almacenamiento de sesiones y las transcripciones residen en el host de la puerta de enlace.

Varios dispositivos/canales pueden asignarse a la misma sesión, pero el historial no se sincroniza
completamente con cada cliente. Recomendación: use un dispositivo principal para conversaciones
largas para evitar un contexto divergente. La interfaz de usuario de Control y la TUI siempre muestran
la transcripción de sesión respaldada por la puerta de enlace, por lo que son la fuente de verdad.

Detalles: [Gestión de sesiones](/es/concepts/session).

## Cuerpos entrantes e historial de contexto

OpenClaw separa el **cuerpo del aviso** del **cuerpo del comando**:

- `Body`: texto del aviso enviado al agente. Esto puede incluir sobres de canal y
  contenedores de historial opcionales.
- `CommandBody`: texto sin procesar del usuario para el análisis de directivas/comandos.
- `RawBody`: alias heredado de `CommandBody` (mantenido por compatibilidad).

Cuando un canal proporciona el historial, utiliza un contenedor compartido:

- `[Chat messages since your last reply - for context]`
- `[Current message - respond to this]`

Para **chats no directos** (grupos/canales/salas), el **cuerpo del mensaje actual** tiene el prefijo de la etiqueta del remitente (mismo estilo utilizado para las entradas del historial). Esto mantiene los mensajes en tiempo real y los mensajes en cola/historial consistentes en el indicativo del agente.

Los búferes de historial son **solo pendientes**: incluyen mensajes grupales que _no_ activaron una ejecución (por ejemplo, mensajes restringidos por mención) y **excluyen** los mensajes que ya están en la transcripción de la sesión.

La eliminación de directivas se aplica solo a la sección del **mensaje actual** para que el historial permanezca intacto. Los canales que envuelven el historial deben establecer `CommandBody` (o `RawBody`) al texto del mensaje original y mantener `Body` como el indicativo combinado.
Los búferes de historial son configurables a través de `messages.groupChat.historyLimit` (predeterminado global) y anulaciones por canal como `channels.slack.historyLimit` o `channels.telegram.accounts.<id>.historyLimit` (establezca `0` para desactivar).

## Poner en cola y seguimientos

Si una ejecución ya está activa, los mensajes entrantes se pueden poner en cola, dirigir a la ejecución actual o recopilar para un turno de seguimiento.

- Configurar mediante `messages.queue` (y `messages.queue.byChannel`).
- Modos: `interrupt`, `steer`, `followup`, `collect`, además de variantes de acumulación.

Detalles: [Poner en cola](/es/concepts/queue).

## Transmisión por bloques, fragmentación y procesamiento por lotes

La transmisión por bloques envía respuestas parciales a medida que el modelo produce bloques de texto.
La fragmentación respeta los límites de texto del canal y evita dividir el código cercado.

Configuraciones clave:

- `agents.defaults.blockStreamingDefault` (`on|off`, desactivado por defecto)
- `agents.defaults.blockStreamingBreak` (`text_end|message_end`)
- `agents.defaults.blockStreamingChunk` (`minChars|maxChars|breakPreference`)
- `agents.defaults.blockStreamingCoalesce` (procesamiento por lotes basado inactividad)
- `agents.defaults.humanDelay` (pausa similar a la humana entre respuestas de bloques)
- Sobrescrituras de canal: `*.blockStreaming` y `*.blockStreamingCoalesce` (los canales que no sean Telegram requieren `*.blockStreaming: true` explícito)

Detalles: [Streaming + chunking](/es/concepts/streaming).

## Visibilidad del razonamiento y tokens

OpenClaw puede exponer u ocultar el razonamiento del modelo:

- `/reasoning on|off|stream` controla la visibilidad.
- El contenido del razonamiento sigue contando para el uso de tokens cuando es producido por el modelo.
- Telegram soporta el flujo de razonamiento en la burbuja de borrador.

Detalles: [Thinking + reasoning directives](/es/tools/thinking) y [Token use](/es/reference/token-use).

## Prefijos, hilos y respuestas

El formato de los mensajes salientes está centralizado en `messages`:

- `messages.responsePrefix`, `channels.<channel>.responsePrefix` y `channels.<channel>.accounts.<id>.responsePrefix` (cascada de prefijos salientes), más `channels.whatsapp.messagePrefix` (prefijo entrante de WhatsApp)
- Hilos de respuesta mediante `replyToMode` y valores predeterminados por canal

Detalles: [Configuración](/es/gateway/configuration-reference#messages) y documentación del canal.

import es from "/components/footer/es.mdx";

<es />
