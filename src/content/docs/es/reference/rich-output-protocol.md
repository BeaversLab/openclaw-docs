---
summary: "Protocolo de código corto de salida enriquecida para incrustaciones, medios, pistas de audio y respuestas"
read_when:
  - Changing assistant output rendering in the Control UI
  - Debugging `[embed ...]`, `MEDIA:`, reply, or audio presentation directives
title: "Protocolo de salida enriquecida"
---

La salida del asistente puede llevar un pequeño conjunto de directivas de entrega/renderizado:

- `MEDIA:` para la entrega de archivos adjuntos
- `[[audio_as_voice]]` para pistas de presentación de audio
- `[[reply_to_current]]` / `[[reply_to:<id>]]` para metadatos de respuesta
- `[embed ...]` para renderizado enriquecido en la interfaz de usuario de Control

Los archivos adjuntos remotos `MEDIA:` deben ser URLs públicas `https:`. Los nombres de host `http:` simples, de loopback, de enlace local, privados e internos se ignoran como directivas de archivos adjuntos; los capturadores de medios del lado del servidor todavía hacen cumplir sus propias protecciones de red.

Los archivos adjuntos locales `MEDIA:` pueden usar rutas absolutas, rutas relativas al espacio de trabajo o rutas `~/` relativas al directorio de inicio. Aún pasan por la política de lectura de archivos del agente y las comprobaciones de tipo de medio antes de la entrega.

<Warning>
`MEDIA:` se analiza solo como texto sin formato. Envolver la directiva en formato Markdown (negrita, código en línea, código cercado) evita que el analizador la reconozca, y el archivo adjunto se elimina silenciosamente de la entrega.

Válido:

```text
MEDIA:/workspace/image.png
```

No válido (analizado como prosa, no se entrega ningún archivo adjunto):

```text
**MEDIA:/workspace/image.png**
`MEDIA:/workspace/image.png`
Here is your image: MEDIA:/workspace/image.png
```

Mantenga `MEDIA:` en su propia línea, en texto sin formato, sin formato circundante.

</Warning>

La sintaxis de imagen Markdown simple permanece como texto de forma predeterminada. Los canales que intencionalmente asignan respuestas de imagen Markdown a archivos adjuntos de medios optan por ello en su adaptador de salida; Telegram hace esto para que `![alt](url)` todavía pueda convertirse en una respuesta de medios.

Estas directivas son separadas. `MEDIA:` y las etiquetas de respuesta/voz siguen siendo metadatos de entrega; `[embed ...]` es la ruta de renderizado enriquecida solo web. Los medios de resultados de herramientas confiables usan el mismo analizador `MEDIA:` / `[[audio_as_voice]]` antes de la entrega, por lo que las salidas de herramientas de texto todavía pueden marcar un archivo adjunto de audio como una nota de voz.

Cuando el streaming en bloques está habilitado, `MEDIA:` sigue siendo metadatos de entrega única para un turno. Si la misma URL multimedia se envía en un bloque transmitido y se repite en el payload final del asistente, OpenClaw entrega el archivo adjunto una vez y elimina el duplicado del payload final.

## `[embed ...]`

`[embed ...]` es la única sintaxis de renderizado enriquecido orientada al agente para la interfaz de usuario de Control.

Ejemplo de autocierre:

```text
[embed ref="cv_123" title="Status" /]
```

Reglas:

- `[view ...]` ya no es válido para nuevas salidas.
- Los shortcodes de inserción (embed) se representan solo en la superficie del mensaje del asistente.
- Solo se representan las inserciones respaldadas por URL. Use `ref="..."` o `url="..."`.
- Los shortcodes de inserción HTML en línea en forma de bloque no se representan.
- La interfaz de usuario web elimina el shortcode del texto visible y representa la inserción en línea.
- `MEDIA:` no es un alias de inserción y no debe usarse para el renderizado de inserciones enriquecidas.

## Forma de renderizado almacenado

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

Los bloques enriquecidos almacenados/renderizados usan esta forma `canvas` directamente. `present_view` no se reconoce.

## Relacionado

- [Adaptadores RPC](/es/reference/rpc)
- [Typebox](/es/concepts/typebox)
