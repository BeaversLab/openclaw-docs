# Rich Output Protocol

La salida del asistente puede contener un pequeño conjunto de directivas de entrega/renderizado:

- `MEDIA:` para la entrega de adjuntos
- `[[audio_as_voice]]` para indicaciones de presentación de audio
- `[[reply_to_current]]` / `[[reply_to:<id>]]` para metadatos de respuesta
- `[embed ...]` para el renderizado enriquecido en el Control UI

Estas directivas son independientes. `MEDIA:` y las etiquetas de respuesta/voz siguen siendo metadatos de entrega; `[embed ...]` es la ruta de renderizado enriquecido exclusiva para Web.

## `[embed ...]`

`[embed ...]` es la única sintaxis de renderizado enriquecido orientada a agentes para el Control UI.

Ejemplo de cierre automático:

```text
[embed ref="cv_123" title="Status" /]
```

Reglas:

- `[view ...]` ya no es válido para nuevas salidas.
- Los shortcodes embed solo se renderizan en la superficie del mensaje del asistente.
- Solo se renderizan los embeds respaldados por una URL. Use `ref="..."` o `url="..."`.
- Los shortcodes embed HTML en línea de tipo bloque no se renderizan.
- La interfaz Web elimina el shortcode del texto visible y renderiza el embed en línea.
- `MEDIA:` no es un alias de embed y no debe usarse para el renderizado enriquecido de embeds.

## Estructura de renderizado almacenada

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

Los bloques enriquecidos almacenados/renderizados usan directamente esta estructura `canvas`. `present_view` no se reconoce.
