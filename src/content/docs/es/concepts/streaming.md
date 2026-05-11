---
summary: "Comportamiento de streaming y fragmentación (respuestas de bloques, streaming de vista previa del canal, mapeo de modos)"
read_when:
  - Explaining how streaming or chunking works on channels
  - Changing block streaming or channel chunking behavior
  - Debugging duplicate/early block replies or channel preview streaming
title: "Streaming y fragmentación"
---

OpenClaw tiene dos capas de streaming separadas:

- **Streaming de bloques (canales):** emite **bloques** completados a medida que el asistente escribe. Estos son mensajes de canal normales (no deltas de tokens).
- **Streaming de vista previa (Telegram/Discord/Slack):** actualiza un **mensaje de vista previa** temporal mientras se genera.

Actualmente **no hay un streaming real de deltas de tokens** hacia los mensajes del canal. El streaming de vista previa se basa en mensajes (envío + ediciones/adiciones).

## Streaming de bloques (mensajes del canal)

El streaming de bloques envía la salida del asistente en fragmentos gruesos a medida que está disponible.

```
Model output
  └─ text_delta/events
       ├─ (blockStreamingBreak=text_end)
       │    └─ chunker emits blocks as buffer grows
       └─ (blockStreamingBreak=message_end)
            └─ chunker flushes at message_end
                   └─ channel send (block replies)
```

Leyenda:

- `text_delta/events`: eventos de streaming del modelo (pueden ser escasos para modelos sin streaming).
- `chunker`: `EmbeddedBlockChunker` aplicando límites mínimos/máximos + preferencia de ruptura.
- `channel send`: mensajes salientes reales (respuestas de bloques).

**Controles:**

- `agents.defaults.blockStreamingDefault`: `"on"`/`"off"` (desactivado por defecto).
- Sobrescrituras del canal: `*.blockStreaming` (y variantes por cuenta) para forzar `"on"`/`"off"` por canal.
- `agents.defaults.blockStreamingBreak`: `"text_end"` o `"message_end"`.
- `agents.defaults.blockStreamingChunk`: `{ minChars, maxChars, breakPreference? }`.
- `agents.defaults.blockStreamingCoalesce`: `{ minChars?, maxChars?, idleMs? }` (fusionar bloques transmitidos antes de enviar).
- Límite duro del canal: `*.textChunkLimit` (por ejemplo, `channels.whatsapp.textChunkLimit`).
- Modo de fragmentación del canal: `*.chunkMode` (`length` por defecto, `newline` divide en líneas en blanco (límites de párrafo) antes de la fragmentación por longitud).
- Límite suave de Discord: `channels.discord.maxLinesPerMessage` (17 por defecto) divide las respuestas largas para evitar el recorte en la interfaz de usuario.

**Semántica de límites:**

- `text_end`: transmite bloques tan pronto como el fragmentador los emite; vacía en cada `text_end`.
- `message_end`: espera a que termine el mensaje del asistente y luego vacía el resultado en búfer.

`message_end` todavía usa el fragmentador si el texto en búfer excede `maxChars`, por lo que puede emitir múltiples fragmentos al final.

### Entrega de medios con streaming de bloques

Las directivas `MEDIA:` son metadatos de entrega normales. Cuando el streaming de bloques envía un bloque de medios antes de tiempo, OpenClaw recuerda esa entrega para el turno. Si la carga útil final del asistente repite la misma URL de medios, la entrega final elimina los medios duplicados en lugar de enviar el adjunto nuevamente.

Las cargas útiles finales duplicadas exactas se suprimen. Si la carga útil final agrega texto distinto alrededor de los medios que ya se transmitieron, OpenClaw aún envía el nuevo texto manteniendo la entrega única de los medios. Esto evita notas de voz o archivos duplicados en canales como Telegram cuando un agente emite `MEDIA:` durante el streaming y el proveedor también lo incluye en la respuesta completada.

## Algoritmo de fragmentación (límites inferior/superior)

La fragmentación de bloques está implementada por `EmbeddedBlockChunker`:

- **Límite inferior:** no emitir hasta que el búfer sea >= `minChars` (a menos que se fuerce).
- **Límite superior:** preferir divisiones antes de `maxChars`; si se fuerza, dividir en `maxChars`.
- **Preferencia de ruptura:** `paragraph` → `newline` → `sentence` → `whitespace` → ruptura forzada.
- **Cercas de código:** nunca dividir dentro de las cercas; cuando se fuerza en `maxChars`, cerrar + reabrir la cerca para mantener el Markdown válido.

`maxChars` está limitado al `textChunkLimit` del canal, por lo que no puedes exceder los límites por canal.

## Fusión (combinar bloques transmitidos)

Cuando el streaming de bloques está habilitado, OpenClaw puede **fusionar fragmentos de bloques consecutivos** antes de enviarlos. Esto reduce el "spam de una sola línea" mientras aún proporciona una salida progresiva.

- La fusión espera **brechas de inactividad** (`idleMs`) antes de vaciarse.
- Los búferes están limitados por `maxChars` y se vaciarán si lo exceden.
- `minChars` evita que se envíen fragmentos diminutos hasta que se acumule suficiente texto
  (el vaciado final siempre envía el texto restante).
- El unidor se deriva de `blockStreamingChunk.breakPreference`
  (`paragraph` → `\n\n`, `newline` → `\n`, `sentence` → espacio).
- Las anulaciones de canal están disponibles a través de `*.blockStreamingCoalesce` (incluyendo configuraciones por cuenta).
- La agrupación `minChars` predeterminada se aumenta a 1500 para Signal/Slack/Discord a menos que se anule.

## Ritmo similar al humano entre bloques

Cuando el streaming de bloques está habilitado, puedes agregar una **pausa aleatoria** entre
las respuestas de bloques (después del primer bloque). Esto hace que las respuestas de múltiples burbujas se sientan
más naturales.

- Configuración: `agents.defaults.humanDelay` (anular por agente a través de `agents.list[].humanDelay`).
- Modos: `off` (predeterminado), `natural` (800–2500ms), `custom` (`minMs`/`maxMs`).
- Se aplica solo a **respuestas de bloques**, no a las respuestas finales ni a los resúmenes de herramientas.

## "Transmitir fragmentos o todo"

Esto se asigna a:

- **Transmitir fragmentos:** `blockStreamingDefault: "on"` + `blockStreamingBreak: "text_end"` (emitir sobre la marcha). Los canales que no sean Telegram también necesitan `*.blockStreaming: true`.
- **Transmitir todo al final:** `blockStreamingBreak: "message_end"` (vaciar una vez, posiblemente múltiples fragmentos si es muy largo).
- **Sin streaming de bloques:** `blockStreamingDefault: "off"` (solo respuesta final).

**Nota del canal:** El streaming de bloques está **desactivado a menos que**
`*.blockStreaming` se establezca explícitamente en `true`. Los canales pueden transmitir una vista previa en vivo
(`channels.<channel>.streaming`) sin respuestas de bloques.

Recordatorio de ubicación de configuración: los valores predeterminados de `blockStreaming*` viven bajo
`agents.defaults`, no en la configuración raíz.

## Modos de streaming de vista previa

Clave canónica: `channels.<channel>.streaming`

Modos:

- `off`: desactiva el streaming de vista previa.
- `partial`: una sola vista previa que se reemplaza con el texto más reciente.
- `block`: actualizaciones de vista previa en pasos fragmentados/anexados.
- `progress`: vista previa de progreso/estado durante la generación, respuesta final al completar.

### Asignación de canales

| Canal      | `off` | `partial` | `block` | `progress`            |
| ---------- | ----- | --------- | ------- | --------------------- |
| Telegram   | ✅    | ✅        | ✅      | se asigna a `partial` |
| Discord    | ✅    | ✅        | ✅      | se asigna a `partial` |
| Slack      | ✅    | ✅        | ✅      | ✅                    |
| Mattermost | ✅    | ✅        | ✅      | ✅                    |

Solo para Slack:

- `channels.slack.streaming.nativeTransport` alterna las llamadas a la API de transmisión nativa de Slack cuando `channels.slack.streaming.mode="partial"` (predeterminado: `true`).
- La transmisión nativa de Slack y el estado del hilo del asistente de Slack requieren un objetivo de hilo de respuesta; los MD de nivel superior no muestran esa vista previa de estilo de hilo.

Migración de claves heredadas:

- Telegram: los valores heredados `streamMode` y escalares/booleanos `streaming` se detectan y migran mediante rutas de compatibilidad de doctor/config a `streaming.mode`.
- Discord: `streamMode` + booleano `streaming` migran automáticamente al enum `streaming`.
- Slack: `streamMode` migra automáticamente a `streaming.mode`; el booleano `streaming` migra automáticamente a `streaming.mode` más `streaming.nativeTransport`; el valor heredado `nativeStreaming` migra automáticamente a `streaming.nativeTransport`.

### Comportamiento en tiempo de ejecución

Telegram:

- Utiliza actualizaciones de vista previa `sendMessage` + `editMessageText` en MDs y grupos/temas.
- Envía un mensaje final nuevo en lugar de editarlo en su lugar cuando una vista previa ha estado visible durante aproximadamente un minuto, y luego limpia la vista previa para que la marca de tiempo de Telegram refleje la finalización de la respuesta.
- Se omite la transmisión de vista previa cuando la transmisión de bloques de Telegram está explícitamente habilitada (para evitar la doble transmisión).
- `/reasoning stream` puede escribir el razonamiento en la vista previa.

Discord:

- Usa mensajes de vista previa de envío + edición.
- El modo `block` usa fragmentación de borradores (`draftChunk`).
- Se omite la transmisión de vista previa cuando la transmisión de bloques de Discord está explícitamente habilitada.
- Las cargas útiles de medios finales, errores y respuestas explícitas cancelan las vistas previas pendientes sin vaciar un nuevo borrador, y luego usan la entrega normal.

Slack:

- `partial` puede usar el streaming nativo de Slack (`chat.startStream`/`append`/`stop`) cuando esté disponible.
- `block` usa vistas previas de borrador de estilo anexar.
- `progress` usa texto de vista previa de estado, y luego la respuesta final.
- El streaming nativo y de borrador suprime las respuestas de bloques para ese turno, por lo que una respuesta de Slack se transmite mediante una sola ruta de entrega.
- Las cargas útiles finales de medios/errores y los finales de progreso no crean mensajes de borrador desechables; solo los finales de texto/bloque que pueden editar la vista previa vacían el texto del borrador pendiente.

Mattermost:

- Transmite el pensamiento, la actividad de las herramientas y el texto de respuesta parcial en una sola publicación de vista previa de borrador que se finaliza en su lugar cuando la respuesta final es segura de enviar.
- Recurre a enviar una publicación final nueva si la publicación de vista previa fue eliminada o no está disponible de otra manera en el momento de la finalización.
- Las cargas útiles finales de medios/errores cancelan las actualizaciones de vista previa pendientes antes de la entrega normal en lugar de vaciar una publicación de vista previa temporal.

Matrix:

- Las vistas previas de borrador se finalizan en su lugar cuando el texto final puede reutilizar el evento de vista previa.
- Los finales de solo medios, errores y discordancia de objetivo de respuesta cancelan las actualizaciones de vista previa pendientes antes de la entrega normal; se redacta una vista previa obsoleta ya visible.

### Actualizaciones de vista previa del progreso de herramientas

El streaming de vista previa también puede incluir actualizaciones del **progreso de herramientas** (tool-progress) — líneas de estado cortas como "buscando en la web", "leyendo archivo" o "llamando a herramienta" — que aparecen en el mismo mensaje de vista previa mientras se ejecutan las herramientas, antes de la respuesta final. Esto mantiene los turnos de herramientas de varios pasos visualmente activos en lugar de silenciosos entre la primera vista previa de pensamiento y la respuesta final.

Superficies compatibles:

- **Discord**, **Slack** y **Telegram** transmiten el progreso de herramientas en la edición de vista previa en vivo de forma predeterminada cuando el streaming de vista previa está activo.
- Telegram se ha lanzado con las actualizaciones de vista previa del progreso de herramientas habilitadas desde `v2026.4.22`; mantenerlas habilitadas preserva ese comportamiento publicado.
- **Mattermost** ya incorpora la actividad de herramientas en su única publicación de vista previa de borrador (ver arriba).
- Las ediciones de progreso de herramientas siguen el modo de transmisión de vista previa activo; se omiten cuando la transmisión de vista previa es `off` o cuando la transmisión de bloques ha tomado el control del mensaje.
- Para mantener la transmisión de vista previa pero ocultar las líneas de progreso de herramientas, establezca `streaming.preview.toolProgress` en `false` para ese canal. Para desactivar las ediciones de vista previa por completo, establezca `streaming.mode` en `off`.

Ejemplo:

```json
{
  "channels": {
    "telegram": {
      "streaming": {
        "mode": "partial",
        "preview": {
          "toolProgress": false
        }
      }
    }
  }
}
```

## Relacionado

- [Mensajes](/es/concepts/messages) — ciclo de vida y entrega de mensajes
- [Reintentar](/es/concepts/retry) — comportamiento de reintento en caso de fallo de entrega
- [Canales](/es/channels) — soporte de transmisión por canal
