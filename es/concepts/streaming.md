---
summary: "Comportamiento de streaming y chunking (respuestas de bloque, streaming de vista previa del canal, mapeo de modos)"
read_when:
  - Explaining how streaming or chunking works on channels
  - Changing block streaming or channel chunking behavior
  - Debugging duplicate/early block replies or channel preview streaming
title: "Streaming y Chunking"
---

# Streaming + chunking

OpenClaw tiene dos capas de streaming separadas:

- **Block streaming (canales):** emite **bloques** completados a medida que el asistente escribe. Estos son mensajes de canal normales (no deltas de tokens).
- **Preview streaming (Telegram/Discord/Slack):** actualiza un **mensaje de vista previa** temporal mientras se genera.

Actualmente **no hay un verdadero streaming de deltas de tokens** hacia los mensajes del canal. El streaming de vista previa se basa en mensajes (enviar + ediciones/adiciones).

## Block streaming (mensajes de canal)

Block streaming envía la salida del asistente en fragmentos gruesos a medida que está disponible.

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

- `text_delta/events`: eventos de streaming del modelo (pueden ser dispersos para modelos no-streaming).
- `chunker`: `EmbeddedBlockChunker` aplicando límites min/máx + preferencia de corte.
- `channel send`: mensajes salientes reales (respuestas de bloque).

**Controles:**

- `agents.defaults.blockStreamingDefault`: `"on"`/`"off"` (desactivado por defecto).
- anulaciones de canal: `*.blockStreaming` (y variantes por cuenta) para forzar `"on"`/`"off"` por canal.
- `agents.defaults.blockStreamingBreak`: `"text_end"` o `"message_end"`.
- `agents.defaults.blockStreamingChunk`: `{ minChars, maxChars, breakPreference? }`.
- `agents.defaults.blockStreamingCoalesce`: `{ minChars?, maxChars?, idleMs? }` (fusionar bloques transmitidos antes del envío).
- Límite estricto del canal: `*.textChunkLimit` (por ejemplo, `channels.whatsapp.textChunkLimit`).
- Modo de fragmentación del canal: `*.chunkMode` (`length` por defecto, `newline` divide en líneas en blanco (límites de párrafo) antes de la fragmentación por longitud).
- Límite suave de Discord: `channels.discord.maxLinesPerMessage` (por defecto 17) divide las respuestas largas para evitar el recorte de la interfaz de usuario.

**Semántica de límites:**

- `text_end`: transmite bloques tan pronto como el fragmentador los emite; vacía en cada `text_end`.
- `message_end`: espera a que finalice el mensaje del asistente y luego vacía el resultado almacenado en el búfer.

`message_end` todavía utiliza el fragmentador si el texto en el búfer supera `maxChars`, por lo que puede emitir múltiples fragmentos al final.

## Algoritmo de fragmentación (límites bajo/alto)

La fragmentación de bloques está implementada por `EmbeddedBlockChunker`:

- **Límite bajo:** no emitir hasta que el búfer >= `minChars` (a menos que se fuerce).
- **Límite alto:** prefiere divisiones antes de `maxChars`; si se fuerza, dividir en `maxChars`.
- **Preferencia de ruptura:** `paragraph` → `newline` → `sentence` → `whitespace` → ruptura forzada.
- **Cercas de código (code fences):** nunca dividir dentro de las cercas; cuando se fuerza en `maxChars`, cerrar + reabrir la cerca para mantener el Markdown válido.

`maxChars` está limitado al límite del canal `textChunkLimit`, por lo que no puedes exceder los límites por canal.

## Fusión (combinar bloques transmitidos)

Cuando la transmisión de bloques está habilitada, OpenClaw puede **combinar fragmentos de bloques consecutivos**
antes de enviarlos. Esto reduce el "spam de líneas individuales" mientras aún proporciona
un resultado progresivo.

- La fusión espera **brechas de inactividad** (`idleMs`) antes de vaciar.
- Los búferes tienen un límite de `maxChars` y se vaciarán si lo superan.
- `minChars` evita que se envíen fragmentos diminutos hasta que se acumule suficiente texto
  (el vaciado final siempre envía el texto restante).
- El unidor se deriva de `blockStreamingChunk.breakPreference`
  (`paragraph` → `\n\n`, `newline` → `\n`, `sentence` → espacio).
- Las anulaciones de canal están disponibles a través de `*.blockStreamingCoalesce` (incluyendo configuraciones por cuenta).
- La fusión predeterminada `minChars` se aumenta a 1500 para Signal/Slack/Discord a menos que se anule.

## Ritmo similar al humano entre bloques

Cuando la transmisión de bloques está habilitada, puedes agregar una **pausa aleatoria** entre
las respuestas de bloques (después del primer bloque). Esto hace que las respuestas de múltiples burbujas se sientan
más naturales.

- Configuración: `agents.defaults.humanDelay` (anular por agente a través de `agents.list[].humanDelay`).
- Modos: `off` (predeterminado), `natural` (800–2500ms), `custom` (`minMs`/`maxMs`).
- Se aplica solo a las **respuestas de bloques**, no a las respuestas finales ni a los resúmenes de herramientas.

## "Transmitir fragmentos o todo"

Esto se asigna a:

- **Transmitir fragmentos:** `blockStreamingDefault: "on"` + `blockStreamingBreak: "text_end"` (emitir sobre la marcha). Los canales que no sean Telegram también necesitan `*.blockStreaming: true`.
- **Transmitir todo al final:** `blockStreamingBreak: "message_end"` (vaciar una vez, posiblemente múltiples fragmentos si es muy largo).
- **Sin transmisión de bloques:** `blockStreamingDefault: "off"` (solo respuesta final).

**Nota del canal:** La transmisión de bloques está **desactivada a menos que**
`*.blockStreaming` esté establecido explícitamente en `true`. Los canales pueden transmitir una vista previa en vivo
(`channels.<channel>.streaming`) sin respuestas de bloques.

Recordatorio de ubicación de configuración: los valores predeterminados `blockStreaming*` se encuentran en
`agents.defaults`, no en la configuración raíz.

## Modos de transmisión de vista previa

Clave canónica: `channels.<channel>.streaming`

Modos:

- `off`: desactivar la transmisión de vista previa.
- `partial`: vista previa única que se reemplaza con el texto más reciente.
- `block`: actualizaciones de vista previa en pasos fragmentados/agregados.
- `progress`: vista previa de progreso/estado durante la generación, respuesta final al completar.

### Asignación de canales

| Canal    | `off` | `partial` | `block` | `progress`            |
| -------- | ----- | --------- | ------- | --------------------- |
| Telegram | ✅    | ✅        | ✅      | se asigna a `partial` |
| Discord  | ✅    | ✅        | ✅      | se asigna a `partial` |
| Slack    | ✅    | ✅        | ✅      | ✅                    |

Solo para Slack:

- `channels.slack.nativeStreaming` alterna las llamadas a la API de transmisión nativa de Slack cuando `streaming=partial` (predeterminado: `true`).

Migración de clave heredada:

- Telegram: `streamMode` + booleano `streaming` migran automáticamente al enum `streaming`.
- Discord: `streamMode` + boolean `streaming` se migra automáticamente al enum `streaming`.
- Slack: `streamMode` se migra automáticamente al enum `streaming`; el boolean `streaming` se migra automáticamente a `nativeStreaming`.

### Comportamiento en tiempo de ejecución

Telegram:

- Usa `sendMessage` + `editMessageText` actualizaciones de vista previa en MDs y grupos/temas.
- La transmisión de vista previa se omite cuando la transmisión de bloques de Telegram está explícitamente habilitada (para evitar la doble transmisión).
- `/reasoning stream` puede escribir el razonamiento en la vista previa.

Discord:

- Usa mensajes de vista previa de envío y edición.
- El modo `block` usa fragmentación de borradores (`draftChunk`).
- La transmisión de vista previa se omite cuando la transmisión de bloques de Discord está explícitamente habilitada.

Slack:

- `partial` puede usar la transmisión nativa de Slack (`chat.startStream`/`append`/`stop`) cuando esté disponible.
- `block` usa vistas previas de borrador de estilo anexar.
- `progress` usa texto de vista previa de estado, luego la respuesta final.

import es from "/components/footer/es.mdx";

<es />
