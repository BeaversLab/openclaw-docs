---
summary: "Protocolo de shortcode de salida enriquecida para incrustaciones, medios, pistas de audio y respuestas"
read_when:
  - Changing assistant output rendering in the Control UI
  - Debugging `[embed ...]`, `MEDIA:`, reply, or audio presentation directives
title: "Protocolo de salida enriquecida"
---

La salida del asistente puede llevar un pequeño conjunto de directivas de entrega/renderizado:

- `MEDIA:` para la entrega de archivos adjuntos
- `[[audio_as_voice]]` para sugerencias de presentación de audio
- `[[reply_to_current]]` / `[[reply_to:<id>]]` para metadatos de respuesta
- `[embed ...]` para el renderizado enriquecido de la interfaz de usuario de Control

Los archivos adjuntos remotos `MEDIA:` deben ser URLs públicas `https:`. Se ignoran como directivas de adjunto los nombres de host `http:` simples, de bucle local (loopback), de enlace local, privados e internos; los recuperadores de medios del lado del servidor aún hacen cumplir sus propias protecciones de red.

La sintaxis de imagen de Markdown simple permanece como texto de forma predeterminada. Los canales que intencionalmente asignan las respuestas de imagen de Markdown a archivos adjuntos de medios aceptan esto en su adaptador de salida; Telegram lo hace para que `![alt](url)` aún pueda convertirse en una respuesta multimedia.

Estas directivas son independientes. `MEDIA:` y las etiquetas de respuesta/voz siguen siendo metadatos de entrega; `[embed ...]` es la ruta de renderizado enriquecido solo para la web. Los medios de resultados de herramientas de confianza utilizan el mismo analizador `MEDIA:` / `[[audio_as_voice]]` antes de la entrega, por lo que las salidas de herramientas de texto aún pueden marcar un archivo de audio como una nota de voz.

Cuando se habilita la transmisión por bloques, `MEDIA:` sigue siendo un metadato de entrega única para un turno. Si se envía la misma URL multimedia en un bloque transmitido y se repite en la carga útil final del asistente, OpenClaw entrega el adjunto una vez y elimina el duplicado de la carga útil final.

## `[embed ...]`

`[embed ...]` es la única sintaxis de renderizado enriquecido orientada al agente para la interfaz de usuario de Control.

Ejemplo de cierre automático:

```text
[embed ref="cv_123" title="Status" /]
```

Reglas:

- `[view ...]` ya no es válido para nuevas salidas.
- Los códigos cortos de inserción (embed shortcodes) se renderizan solo en la superficie del mensaje del asistente.
- Solo se renderizan las inserciones respaldadas por URL. Use `ref="..."` o `url="..."`.
- Los códigos cortos de inserción de HTML en línea en forma de bloque no se renderizan.
- La interfaz de usuario web elimina el código corto del texto visible y renderiza la inserción en línea.
- `MEDIA:` no es un alias de incrustación y no debe usarse para la representación de incrustaciones enriquecidas.

## Forma de representación almacenada

El bloque de contenido del asistente normalizado/almacenado es un elemento `canvas` estructurado:

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

Los bloques enriquecidos almacenados/renderizados usan directamente esta forma `canvas`. `present_view` no se reconoce.

## Relacionado

- [Adaptadores RPC](/es/reference/rpc)
- [Typebox](/es/concepts/typebox)
