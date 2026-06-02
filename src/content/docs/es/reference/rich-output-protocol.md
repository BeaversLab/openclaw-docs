---
summary: "Protocolo de salida enriquecida para medios estructurados, incrustaciones, pistas de audio y respuestas"
read_when:
  - Changing assistant output rendering in the Control UI
  - Debugging `[embed ...]`, structured media, reply, or audio presentation directives
title: "Protocolo de salida enriquecida"
---

La salida del asistente puede llevar un pequeño conjunto de directivas de entrega/renderizado:

- campos estructurados `mediaUrl` / `mediaUrls` para la entrega de archivos adjuntos
- `[[audio_as_voice]]` para pistas de presentación de audio
- `[[reply_to_current]]` / `[[reply_to:<id>]]` para metadatos de respuesta
- `[embed ...]` para el renderizado enriquecido de la interfaz de usuario de Control

Los archivos adjuntos de medios remotos deben ser URLs `https:` públicas. Los nombres de host `http:` simples,
loopback, link-local, privados e internos se ignoran como directivas
de archivo adjunto; los buscadores de medios del lado del servidor todavía hacen cumplir sus propias protecciones de red.

Los archivos adjuntos de medios locales pueden usar rutas absolutas, rutas relativas al espacio de trabajo o
rutas `~/` relativas al directorio principal. Todavía pasan por la política de lectura de archivos del agente y
verificaciones de tipo de medio antes de la entrega.

<Warning>
No emita comandos de texto para archivos adjuntos de herramientas, complementos, bloques de transmisión,
salida del navegador o acciones de mensajes. Utilice campos de medios estructurados en su lugar.

Carga útil válida de herramienta de mensaje:

```json
{ "message": "Here is your image.", "mediaUrl": "/workspace/image.png" }
```

El texto heredado de respuesta final del asistente todavía puede normalizarse por compatibilidad, pero
no es un protocolo general de complemento/herramienta.

</Warning>

La sintaxis de imagen de Markdown simple permanece como texto de forma predeterminada. Los canales que intencionalmente
asignan respuestas de imagen de Markdown a archivos adjuntos de medios optan por ello en su
adaptador de salida; Telegram hace esto para que `![alt](url)` todavía pueda convertirse en una respuesta multimedia.

Estas directivas son independientes. Los campos de medios estructurados y las etiquetas de respuesta/voz son
metadatos de entrega; `[embed ...]` es la ruta de renderizado enriquecido solo para web.

Cuando la transmisión por bloques está habilitada, los medios deben transportarse en campos de carga útil
estructurados. Si la misma URL de medios se envía en un bloque transmitido y se repite en la
carga útil final del asistente, OpenClaw entrega el archivo adjunto una vez y elimina el
duplicado de la carga útil final.

## `[embed ...]`

`[embed ...]` es la única sintaxis de renderizado enriquecido orientada al agente para la interfaz de usuario de Control.

Ejemplo de autocierre:

```text
[embed ref="cv_123" title="Status" /]
```

Reglas:

- `[view ...]` ya no es válido para nuevas salidas.
- Los shortcodes de inserción (embed) se representan solo en la superficie del mensaje del asistente.
- Solo se procesan las incrustaciones respaldadas por URL. Use `ref="..."` o `url="..."`.
- Los shortcodes de inserción HTML en línea en forma de bloque no se representan.
- La interfaz de usuario web elimina el shortcode del texto visible y representa la inserción en línea.
- Los medios estructurados no son un alias de incrustación y no deben usarse para el procesamiento de incrustaciones enriquecidas.

## Forma de renderizado almacenado

El bloque de contenido del asistente normalizado/almacenado es un elemento estructurado `canvas`:

```json
{
  "type": "canvas",
  "preview": {
    "kind": "canvas",
    "surface": "assistant_message",
    "render": "url",
    "viewId": "cv_123",
    "url": "/__openclaw__/canvas/documents/cv_123/index.html",
    "title": "Status",
    "preferredHeight": 320
  }
}
```

Los bloques enriquecidos almacenados/procesados utilizan esta forma `canvas` directamente. `present_view` no se reconoce.

## Relacionado

- [Adaptadores RPC](/es/reference/rpc)
- [Typebox](/es/concepts/typebox)
