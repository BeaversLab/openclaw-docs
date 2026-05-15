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

Los archivos adjuntos locales `MEDIA:` pueden usar rutas absolutas, rutas relativas al espacio de trabajo o rutas relativas al directorio de inicio `~/`. Aún pasan por la política de lectura de archivos del agente y las verificaciones de tipo de medio antes de la entrega.

La sintaxis de imagen Markdown simple sigue siendo texto por defecto. Los canales que intencionalmente mapean las respuestas de imagen Markdown a archivos adjuntos de medios optan por ello en su adaptador de salida; Telegram hace esto para que `![alt](url)` aún pueda convertirse en una respuesta de medio.

Estas directivas son independientes. `MEDIA:` y las etiquetas de respuesta/voz siguen siendo metadatos de entrega; `[embed ...]` es la ruta de renderizado enriquecido solo para la web. Los medios de resultados de herramientas confiables usan el mismo analizador `MEDIA:` / `[[audio_as_voice]]` antes de la entrega, por lo que las salidas de herramientas de texto aún pueden marcar un archivo adjunto de audio como una nota de voz.

Cuando se habilita la transmisión por bloques, `MEDIA:` sigue siendo metadatos de entrega única para un turno. Si la misma URL de medio se envía en un bloque transmitido y se repite en la carga útil final del asistente, OpenClaw entrega el archivo adjunto una vez y elimina el duplicado de la carga útil final.

## `[embed ...]`

`[embed ...]` es la única sintaxis de renderizado enriquecido orientada al agente para la interfaz de usuario de Control.

Ejemplo de autocierre:

```text
[embed ref="cv_123" title="Status" /]
```

Reglas:

- `[view ...]` ya no es válido para nuevas salidas.
- Los códigos cortos de inserción (embed) se renderizan solo en la superficie del mensaje del asistente.
- Solo se renderizan las inserciones respaldadas por URL. Use `ref="..."` o `url="..."`.
- Los códigos cortos de inserción HTML en línea de forma de bloque no se renderizan.
- La interfaz de usuario web elimina el código corto del texto visible y renderiza la inserción en línea.
- `MEDIA:` no es un alias de inserción y no debe usarse para el renderizado de inserciones enriquecidas.

## Forma de renderizado almacenada

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

Los bloques enriquecidos almacenados/renderizados usan esta forma `canvas` directamente. `present_view` no se reconoce.

## Relacionado

- [Adaptadores RPC](/es/reference/rpc)
- [Typebox](/es/concepts/typebox)
