---
summary: "Comportamiento de streaming y chunking (respuestas de bloques, streaming de vista previa del canal, mapeo de modos)"
read_when:
  - Explaining how streaming or chunking works on channels
  - Changing block streaming or channel chunking behavior
  - Debugging duplicate/early block replies or channel preview streaming
title: "Streaming y chunking"
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

- `text_delta/events`: eventos de streaming del modelo (pueden ser dispersos para modelos sin streaming).
- `chunker`: `EmbeddedBlockChunker` aplicando límites mín/máx + preferencia de ruptura.
- `channel send`: mensajes salientes reales (respuestas de bloques).

**Controles:**

- `agents.defaults.blockStreamingDefault`: `"on"`/`"off"` (desactivado por defecto).
- anulaciones de canal: `*.blockStreaming` (y variantes por cuenta) para forzar `"on"`/`"off"` por canal.
- `agents.defaults.blockStreamingBreak`: `"text_end"` o `"message_end"`.
- `agents.defaults.blockStreamingChunk`: `{ minChars, maxChars, breakPreference? }`.
- `agents.defaults.blockStreamingCoalesce`: `{ minChars?, maxChars?, idleMs? }` (fusionar bloques transmitidos antes de enviar).
- Límite estricto del canal: `*.textChunkLimit` (p. ej., `channels.whatsapp.textChunkLimit`).
- Modo de fragmentación del canal: `*.chunkMode` (`length` por defecto, `newline` divide en líneas en blanco (límites de párrafo) antes de la fragmentación por longitud).
- Límite suave de Discord: `channels.discord.maxLinesPerMessage` (17 por defecto) divide las respuestas largas para evitar el recorte en la interfaz de usuario.

**Semántica de límites:**

- `text_end`: transmite bloques tan pronto como el fragmentador los emite; vacía en cada `text_end`.
- `message_end`: espera a que termine el mensaje del asistente y luego vacía la salida almacenada en el búfer.

`message_end` aún usa el fragmentador si el texto almacenado en el búfer excede `maxChars`, por lo que puede emitir varios fragmentos al final.

### Entrega de medios con streaming de bloques

Las directivas `MEDIA:` son metadatos de entrega normales. Cuando el streaming de bloques envía un bloque de medios temprano, OpenClaw recuerda esa entrega para el turno. Si la carga útil final del asistente repite la misma URL de medios, la entrega final elimina los medios duplicados en lugar de enviar el adjunto nuevamente.

Los payloads finales duplicados exactos se suprimen. Si el payload final añade
texto distinto alrededor de medios que ya se han transmitido, OpenClaw aún envía el
nuevo texto manteniendo la entrega única de los medios. Esto evita notas de voz
o archivos duplicados en canales como Telegram cuando un agente emite `MEDIA:` durante
la transmisión y el proveedor también lo incluye en la respuesta completada.

## Algoritmo de fragmentación (límites inferior/superior)

La fragmentación de bloques está implementada por `EmbeddedBlockChunker`:

- **Límite inferior:** no emitir hasta que el búfer sea >= `minChars` (a menos que se fuerce).
- **Límite superior:** preferir divisiones antes de `maxChars`; si se fuerza, dividir en `maxChars`.
- **Preferencia de ruptura:** `paragraph` → `newline` → `sentence` → `whitespace` → ruptura fuerte.
- **Cercas de código:** nunca dividir dentro de las cercas; cuando se fuerce en `maxChars`, cerrar + reabrir la cerca para mantener el Markdown válido.

`maxChars` está limitado al `textChunkLimit` del canal, por lo que no puedes exceder los límites por canal.

## Fusión (combinar bloques transmitidos)

Cuando la transmisión de bloques está habilitada, OpenClaw puede **fusionar fragmentos de bloque consecutivos**
antes de enviarlos. Esto reduce el "spam de una sola línea" mientras aún proporciona
salida progresiva.

- La fusión espera **brechas de inactividad** (`idleMs`) antes de vaciar.
- Los búferes están limitados por `maxChars` y se vaciarán si lo exceden.
- `minChars` evita que se envíen fragmentos diminutos hasta que se acumule suficiente texto
  (el vaciado final siempre envía el texto restante).
- El unidor se deriva de `blockStreamingChunk.breakPreference`
  (`paragraph` → `\n\n`, `newline` → `\n`, `sentence` → espacio).
- Las anulaciones de canal están disponibles a través de `*.blockStreamingCoalesce` (incluyendo configuraciones por cuenta).
- La fusión predeterminada `minChars` se aumenta a 1500 para Signal/Slack/Discord a menos que se anule.

## Ritmo similar al humano entre bloques

Cuando el streaming de bloques está habilitado, puedes agregar una **pausa aleatoria** entre
las respuestas de bloques (después del primer bloque). Esto hace que las respuestas de múltiples burbujas se sientan
más naturales.

- Configuración: `agents.defaults.humanDelay` (anular por agente a través de `agents.list[].humanDelay`).
- Modos: `off` (predeterminado), `natural` (800-2500ms), `custom` (`minMs`/`maxMs`).
- Se aplica solo a **respuestas de bloques**, no a las respuestas finales ni a los resúmenes de herramientas.

## "Transmitir fragmentos o todo"

Esto se asigna a:

- **Transmitir fragmentos:** `blockStreamingDefault: "on"` + `blockStreamingBreak: "text_end"` (emitir sobre la marcha). Los canales que no sean Telegram también necesitan `*.blockStreaming: true`.
- **Transmitir todo al final:** `blockStreamingBreak: "message_end"` (vaciar una vez, posiblemente múltiples fragmentos si es muy largo).
- **Sin transmisión de bloques:** `blockStreamingDefault: "off"` (solo la respuesta final).

**Nota del canal:** La transmisión de bloques está **desactivada a menos que**
`*.blockStreaming` se establezca explícitamente en `true`. Los canales pueden transmitir una vista previa en vivo
(`channels.<channel>.streaming`) sin respuestas de bloque.

Recordatorio de ubicación de configuración: los valores predeterminados de `blockStreaming*` se encuentran en
`agents.defaults`, no en la configuración raíz.

## Modos de streaming de vista previa

Clave canónica: `channels.<channel>.streaming`

Modos:

- `off`: desactiva la transmisión de vista previa.
- `partial`: vista previa única que se reemplaza con el texto más reciente.
- `block`: actualizaciones de vista previa en pasos fragmentados/anexados.
- `progress`: vista previa de progreso/estado durante la generación, respuesta final al completar.

`streaming.mode: "block"` es un modo de transmisión de vista previa para canales con capacidad de edición
tales como Discord y Telegram. No habilita la entrega de bloques del canal allí.
Use `streaming.block.enabled` o la clave de canal heredada `blockStreaming` cuando
desee respuestas de bloque normales. Microsoft Teams es la excepción: no tiene
transporte de bloques de borrador-vista previa, por lo que `streaming.mode: "block"` se asigna a la entrega de bloques de Teams
en lugar de la transmisión nativa parcial/de progreso.

### Asignación de canales

| Canal      | `off` | `partial` | `block` | `progress`                     |
| ---------- | ----- | --------- | ------- | ------------------------------ |
| Telegram   | ✅    | ✅        | ✅      | borrador de progreso editable  |
| Discord    | ✅    | ✅        | ✅      | borrador de progreso editable  |
| Slack      | ✅    | ✅        | ✅      | ✅                             |
| Mattermost | ✅    | ✅        | ✅      | ✅                             |
| MS Teams   | ✅    | ✅        | ✅      | transmisión de progreso nativa |

Solo Slack:

- `channels.slack.streaming.nativeTransport` activa las llamadas a la API de transmisión nativa de Slack cuando `channels.slack.streaming.mode="partial"` (predeterminado: `true`).
- La transmisión nativa de Slack y el estado del hilo del asistente de Slack requieren un hilo de respuesta de destino. Los MD de nivel superior no muestran esa vista previa de estilo de hilo, pero aún pueden usar publicaciones y ediciones de vista previa de borrador de Slack.

Migración de clave heredada:

- Telegram: los valores heredados `streamMode` y escalar/booleano `streaming` se detectan y migran mediante rutas de compatibilidad de doctor/config a `streaming.mode`.
- Discord: `streamMode` + booleano `streaming` siguen siendo alias de tiempo de ejecución para el enum `streaming`; ejecute `openclaw doctor --fix` para reescribir la configuración persistida.
- Slack: `streamMode` sigue siendo un alias de tiempo de ejecución para `streaming.mode`; el booleano `streaming` sigue siendo un alias de tiempo de ejecución para `streaming.mode` más `streaming.nativeTransport`; `nativeStreaming` heredado sigue siendo un alias de tiempo de ejecución para `streaming.nativeTransport`. Ejecute `openclaw doctor --fix` para reescribir la configuración persistida.

### Comportamiento en tiempo de ejecución

Telegram:

- Utiliza actualizaciones de vista previa `sendMessage` + `editMessageText` en MDs y grupos/temas.
- El texto final edita la vista previa activa en su lugar; los finales largos reutilizan ese mensaje para el primer fragmento y envían solo los fragmentos restantes.
- El modo `progress` mantiene el progreso de la herramienta en un borrador de estado editable, borra ese borrador al completarse y envía la respuesta final a través de la entrega normal.
- Si la edición final falla antes de que se confirme el texto completado, OpenClaw utiliza la entrega final normal y limpia la vista previa obsoleta.
- Se omite la transmisión de vista previa cuando la transmisión de bloques de Telegram está explícitamente habilitada (para evitar la doble transmisión).
- `/reasoning stream` puede escribir el razonamiento en una vista previa transitoria que se elimina después de la entrega final.

Discord:

- Utiliza mensajes de vista previa de envío + edición.
- El modo `block` utiliza fragmentación de borrador (`draftChunk`).
- Se omite la transmisión de vista previa cuando la transmisión de bloques de Discord está explícitamente habilitada.
- Las cargas útiles de medios finales, errores y respuestas explícitas cancelan las vistas previas pendientes sin vaciar un nuevo borrador, y luego usan la entrega normal.

Slack:

- `partial` puede usar la transmisión nativa de Slack (`chat.startStream`/`append`/`stop`) cuando esté disponible.
- `block` usa vistas previas de borrador de estilo anexar.
- `progress` usa texto de vista previa de estado, luego la respuesta final.
- Los MD de nivel superior sin un hilo de respuesta usan publicaciones y ediciones de vista previa de borrador en lugar de la transmisión nativa de Slack.
- La transmisión de vista previa nativa y de borrador suprime las respuestas de bloque para ese turno, por lo que una respuesta de Slack se transmite por una sola ruta de entrega.
- Las cargas útiles finales de medios/errores y los finales de progreso no crean mensajes de borrador desechables; solo los finales de texto/bloque que pueden editar la vista previa vacían el texto del borrador pendiente.

Mattermost:

- Transmite el pensamiento, la actividad de las herramientas y el texto de respuesta parcial en una sola publicación de vista previa de borrador que se finaliza en su lugar cuando la respuesta final es segura de enviar.
- Recurre al envío de una publicación final nueva si la publicación de vista previa fue eliminada o no está disponible en el momento de la finalización.
- Las cargas útiles finales de medios/errores cancelan las actualizaciones de vista previa pendientes antes de la entrega normal en lugar de vaciar una publicación de vista previa temporal.

Matrix:

- Las vistas previas de borrador se finalizan en su lugar cuando el texto final puede reutilizar el evento de vista previa.
- Los finales de solo medios, errores y desajuste de objetivo de respuesta cancelan las actualizaciones de vista previa pendientes antes de la entrega normal; se redacta una vista previa obsoleta ya visible.

### Actualizaciones de vista previa del progreso de herramientas

La transmisión de vista previa también puede incluir actualizaciones de **progreso de herramientas** (tool-progress) — líneas de estado cortas como "buscando en la web", "leyendo archivo" o "llamando herramienta" — que aparecen en el mismo mensaje de vista previa mientras se ejecutan las herramientas, antes de la respuesta final. Esto mantiene los turnos de herramientas de varios pasos visualmente activos en lugar de silenciosos entre la primera vista previa de pensamiento y la respuesta final.

Superficies compatibles:

- **Discord**, **Slack**, **Telegram** y **Matrix** transmiten el progreso de herramientas a la edición de vista previa en vivo de forma predeterminada cuando la transmisión de vista previa está activa. Microsoft Teams usa su flujo de progreso nativo en chats personales.
- Telegram se ha enviado con las actualizaciones de vista previa del progreso de las herramientas habilitadas desde `v2026.4.22`; mantenerlas habilitadas preserva ese comportamiento lanzado.
- **Mattermost** ya incorpora la actividad de las herramientas en su única publicación de borrador de vista previa (ver más arriba).
- Las ediciones de progreso de las herramientas siguen el modo de transmisión de vista previa activo; se omiten cuando la transmisión de vista previa es `off` o cuando la transmisión de bloques ha asumido el control del mensaje. En Telegram, `streaming.mode: "off"` es final-only: el chatter de progreso genérico también se suprime en lugar de entregarse como mensajes de estado independientes, mientras que los avisos de aprobación, las cargas útiles multimedia y los errores todavía se enrutan normalmente.
- Para mantener la transmisión de vista previa pero ocultar las líneas de progreso de las herramientas, establezca `streaming.preview.toolProgress` en `false` para ese canal. Para mantener visibles las líneas de progreso de las herramientas mientras se oculta el texto de comando/exec, establezca `streaming.preview.commandText` en `"status"` o `streaming.progress.commandText` en `"status"`; el valor predeterminado es `"raw"` para preservar el comportamiento lanzado. Esta política es compartida por los canales de borradero/progreso que usan el renderizador de progreso compacto de OpenClaw, incluyendo Discord, Matrix, Microsoft Teams, Mattermost, vistas previas de borrador de Slack y Telegram. Para deshabilitar las ediciones de vista previa por completo, establezca `streaming.mode` en `off`.
- Las respuestas de cita seleccionadas de Telegram son una excepción: cuando `replyToMode` no es `"off"` y hay texto de cita seleccionado presente, OpenClaw omite la transmisión de vista previa de la respuesta para ese turno para que las líneas de vista previa del progreso de las herramientas no puedan renderizarse. Las respuestas de mensaje actual sin texto de cita seleccionado aún mantienen la transmisión de vista previa. Consulte los [documentos del canal de Telegram](/es/channels/telegram) para obtener más detalles.

Mantenga las líneas de progreso visibles pero oculte el texto de comando/exec sin procesar:

```json
{
  "channels": {
    "telegram": {
      "streaming": {
        "mode": "partial",
        "preview": {
          "toolProgress": true,
          "commandText": "status"
        }
      }
    }
  }
}
```

Use la misma forma bajo otra clave de canal de progreso compacto, por ejemplo `channels.discord`, `channels.matrix`, `channels.msteams`, `channels.mattermost`, o vistas previas de borrador de Slack. Para el modo progress-draft, ponga la misma política bajo `streaming.progress`:

```json
{
  "channels": {
    "telegram": {
      "streaming": {
        "mode": "progress",
        "progress": {
          "toolProgress": true,
          "commandText": "status"
        }
      }
    }
  }
}
```

## Relacionado

- [Re factorización del ciclo de vida de los mensajes](/es/concepts/message-lifecycle-refactor) - diseño objetivo compartido para vista previa, edición, transmisión y finalización
- [Borradores de progreso](/es/concepts/progress-drafts) - mensajes visibles de trabajo en curso que se actualizan durante turnos largos
- [Mensajes](/es/concepts/messages) - ciclo de vida y entrega de mensajes
- [Reintentar](/es/concepts/retry) - comportamiento de reintento en caso de fallo de entrega
- [Canales](/es/channels) - soporte de transmisión por canal
