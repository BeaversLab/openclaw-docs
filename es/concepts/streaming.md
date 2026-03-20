---
summary: "Comportamiento de streaming + chunking (respuestas de bloque, streaming de vista previa del canal, msignación de modos)"
read_when:
  - Explicar cómo funciona el streaming o el chunking en los canales
  - Cambiar el comportamiento de streaming de bloques o chunking del canal
  - Depurar respuestas de bloque duplicadas/prematuras o streaming de vista previa del canal
title: "Streaming y Chunking"
---

# Streaming + chunking

OpenClaw tiene dos capas de streaming separadas:

- **Streaming de bloques (canales):** emite **bloques** completados a medida que el asistente escribe. Estos son mensajes de canal normales (no deltas de tokens).
- **Streaming de vista previa (Telegram/Discord/Slack):** actualiza un **mensaje de vista previa** temporal mientras se genera.

Hoy en día **no hay un verdadero streaming de delta de tokens** a los mensajes del canal. El streaming de vista previa se basa en mensajes (envío + ediciones/apéndices).

## Streaming de bloques (mensajes de canal)

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
- `channel send`: mensajes de salida reales (respuestas de bloque).

**Controles:**

- `agents.defaults.blockStreamingDefault`: `"on"`/`"off"` (desactivado por defecto).
-  anulaciones de canal: `*.blockStreaming` (y variantes por cuenta) para forzar `"on"`/`"off"` por canal.
- `agents.defaults.blockStreamingBreak`: `"text_end"` o `"message_end"`.
- `agents.defaults.blockStreamingChunk`: `{ minChars, maxChars, breakPreference? }`.
- `agents.defaults.blockStreamingCoalesce`: `{ minChars?, maxChars?, idleMs? }` (fusionar bloques transmitidos antes del envío).
- Límite estricto del canal: `*.textChunkLimit` (p. ej., `channels.whatsapp.textChunkLimit`).
- Modo de fragmento del canal: `*.chunkMode` (`length` por defecto, `newline` divide en líneas en blanco (límites de párrafo) antes del fragmento de longitud).
- Límite suave de Discord: `channels.discord.maxLinesPerMessage` (por defecto 17) divide las respuestas altas para evitar el recorte de la interfaz de usuario.

**Semántica de los límites:**

- `text_end`: transmite los bloques tan pronto como el chunker los emite; vacía en cada `text_end`.
- `message_end`: espera a que finalice el mensaje del asistente y luego vacía el resultado almacenado en el búfer.

`message_end` aún utiliza el chunker si el texto en el búfer supera `maxChars`, por lo que puede emitir varios fragmentos al final.

## Algoritmo de fragmentación (límites inferior/superior)

La fragmentación de bloques está implementada por `EmbeddedBlockChunker`:

- **Límite inferior:** no emitir hasta que el búfer sea >= `minChars` (a menos que se fuerce).
- **Límite superior:** preferir divisiones antes de `maxChars`; si se fuerza, dividir en `maxChars`.
- **Preferencia de ruptura:** `paragraph` → `newline` → `sentence` → `whitespace` → ruptura forzada.
- **Cercas de código:** nunca dividir dentro de las cercas; al forzar en `maxChars`, cerrar y volver a abrir la cerca para mantener el Markdown válido.

`maxChars` está limitado al `textChunkLimit` del canal, por lo que no se pueden exceder los límites por canal.

## Fusión (combinar bloques transmitidos)

Cuando la transmisión por bloques está habilitada, OpenClaw puede **combinar fragmentos de bloques consecutivos**
antes de enviarlos. Esto reduce el “spam de una sola línea” mientras aún se proporciona
salida progresiva.

- La fusión espera los **espacios de inactividad** (`idleMs`) antes de vaciar.
- Los búferes tienen un límite de `maxChars` y se vaciarán si lo superan.
- `minChars` evita que se envíen fragmentos diminutos hasta que se acumule suficiente texto
  (el vaciado final siempre envía el texto restante).
- El unidor se deriva de `blockStreamingChunk.breakPreference`
  (`paragraph` → `\n\n`, `newline` → `\n`, `sentence` → espacio).
- Las anulaciones del canal están disponibles a través de `*.blockStreamingCoalesce` (incluyendo configuraciones por cuenta).
- La fusión predeterminada `minChars` se aumenta a 1500 para Signal/Slack/Discord a menos que se anule.

## Ritmo similar al humano entre bloques

Cuando el streaming de bloques está activado, puede agregar una **pausa aleatoria** entre
las respuestas de bloques (después del primer bloque). Esto hace que las respuestas de múltiples burbujas se sientan
más naturales.

- Config: `agents.defaults.humanDelay` (anular por agente a través de `agents.list[].humanDelay`).
- Modos: `off` (predeterminado), `natural` (800–2500ms), `custom` (`minMs`/`maxMs`).
- Se aplica solo a **respuestas de bloques**, no a respuestas finales o resúmenes de herramientas.

## "Stream chunks or everything"

Esto se asigna a:

- **Stream chunks:** `blockStreamingDefault: "on"` + `blockStreamingBreak: "text_end"` (emitir sobre la marcha). Los canales que no sean Telegram también necesitan `*.blockStreaming: true`.
- **Stream everything at end:** `blockStreamingBreak: "message_end"` (vaciar una vez, posiblemente múltiples fragmentos si es muy largo).
- **No block streaming:** `blockStreamingDefault: "off"` (solo respuesta final).

**Nota de canal:** El streaming de bloques está **desactivado a menos que**
`*.blockStreaming` se establezca explícitamente en `true`. Los canales pueden transmitir una vista previa en vivo
(`channels.<channel>.streaming`) sin respuestas de bloque.

Recordatorio de ubicación de configuración: los valores predeterminados de `blockStreaming*` se encuentran en
`agents.defaults`, no en la configuración raíz.

## Modos de streaming de vista previa

Clave canónica: `channels.<channel>.streaming`

Modos:

- `off`: desactivar el streaming de vista previa.
- `partial`: vista previa única que se reemplaza con el texto más reciente.
- `block`: las actualizaciones de vista previa en pasos fragmentados/anexados.
- `progress`: vista previa de progreso/estado durante la generación, respuesta final al completarse.

### Asignación de canales

| Canal  | `off` | `partial` | `block` | `progress`        |
| -------- | ----- | --------- | ------- | ----------------- |
| Telegram | ✅    | ✅        | ✅      | se asigna a `partial` |
| Discord  | ✅    | ✅        | ✅      | se asigna a `partial` |
| Slack    | ✅    | ✅        | ✅      | ✅                |

Solo Slack:

- `channels.slack.nativeStreaming` alterna las llamadas a la API de streaming nativa de Slack cuando `streaming=partial` (predeterminado: `true`).

Migración de clave heredada:

- Telegram: `streamMode` + boolean `streaming` se migran automáticamente al enum `streaming`.
- Discord: `streamMode` + boolean `streaming` se migran automáticamente al enum `streaming`.
- Slack: `streamMode` se migra automáticamente al enum `streaming`; el boolean `streaming` se migra automáticamente a `nativeStreaming`.

### Comportamiento en tiempo de ejecución

Telegram:

- Usa actualizaciones de vista previa `sendMessage` + `editMessageText` en DMs y grupos/temas.
- Se omite el streaming de vista previa cuando el streaming de bloques de Telegram está explícitamente habilitado (para evitar doble streaming).
- `/reasoning stream` puede escribir el razonamiento en la vista previa.

Discord:

- Usa mensajes de enviar + editar vista previa.
- El modo `block` usa fragmentación de borrador (`draftChunk`).
- Se omite el streaming de vista previa cuando el streaming de bloques de Discord está explícitamente habilitado.

Slack:

- `partial` puede usar el streaming nativo de Slack (`chat.startStream`/`append`/`stop`) cuando esté disponible.
- `block` usa vistas previas de borrador de estilo anexar.
- `progress` usa texto de estado de vista previa, luego la respuesta final.

import en from "/components/footer/en.mdx";

<en />
