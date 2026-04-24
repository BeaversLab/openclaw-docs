---
summary: "Protocolo de shortcode de salida enriquecida para incrustaciones, medios, pistas de audio y respuestas"
read_when:
  - Changing assistant output rendering in the Control UI
  - Debugging `[embed ...]`, `MEDIA:`, reply, or audio presentation directives
title: "Protocolo de salida enriquecida"
---

# Protocolo de salida enriquecida

La salida del asistente puede llevar un pequeño conjunto de directivas de entrega/representación:

- `MEDIA:` para la entrega de archivos adjuntos
- `[[audio_as_voice]]` para las pistas de presentación de audio
- `[[reply_to_current]]` / `[[reply_to:<id>]]` para los metadatos de respuesta
- `[embed ...]` para la representación enriquecida de la interfaz de usuario de Control

Estas directivas son independientes. `MEDIA:` y las etiquetas de respuesta/voz siguen siendo metadatos de entrega; `[embed ...]` es la ruta de representación enriquecida solo para web.

## `[embed ...]`

`[embed ...]` es la única sintaxis de representación enriquecida orientada al agente para la interfaz de usuario de Control.

Ejemplo de autocierre:

```text
[embed ref="cv_123" title="Status" /]
```

Reglas:

- `[view ...]` ya no es válido para nueva salida.
- Los shortcodes de incrustación se representan únicamente en la superficie del mensaje del asistente.
- Solo se representan las incrustaciones respaldadas por URL. Use `ref="..."` o `url="..."`.
- Los shortcodes de incrustación HTML en línea en forma de bloque no se representan.
- La interfaz de usuario web elimina el shortcode del texto visible y representa la incrustación en línea.
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

Los bloques enriquecidos almacenados/representados usan esta forma `canvas` directamente. `present_view` no se reconoce.
