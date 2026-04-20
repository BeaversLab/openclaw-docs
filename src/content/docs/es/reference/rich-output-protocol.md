# Protocolo de salida enriquecida

La salida del asistente puede llevar un pequeño conjunto de directivas de entrega/renderizado:

- `MEDIA:` para la entrega de archivos adjuntos
- `[[audio_as_voice]]` para sugerencias de presentación de audio
- `[[reply_to_current]]` / `[[reply_to:<id>]]` para metadatos de respuesta
- `[embed ...]` para el renderizado enriquecido de la interfaz de usuario de control

Estas directivas son independientes. `MEDIA:` y las etiquetas de respuesta/voz siguen siendo metadatos de entrega; `[embed ...]` es la ruta de renderizado enriquecido solo para web.

## `[embed ...]`

`[embed ...]` es la única sintaxis de renderizado enriquecido orientada al agente para la interfaz de usuario de control.

Ejemplo de autocierre:

```text
[embed ref="cv_123" title="Status" /]
```

Reglas:

- `[view ...]` ya no es válido para nuevas salidas.
- Los códigos cortos de inserción se renderizan solo en la superficie del mensaje del asistente.
- Solo se renderizan las inserciones respaldadas por URL. Use `ref="..."` o `url="..."`.
- Los códigos cortos de inserción de HTML en línea en forma de bloque no se renderizan.
- La interfaz de usuario web elimina el código corto del texto visible y renderiza la inserción en línea.
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

Los bloques enriquecidos almacenados/renderizados usan directamente esta forma `canvas`. `present_view` no se reconoce.
