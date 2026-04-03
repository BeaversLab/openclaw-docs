---
summary: "Genera y edita imágenes utilizando proveedores configurados (OpenAI, Google Gemini, fal, MiniMax)"
read_when:
  - Generating images via the agent
  - Configuring image generation providers and models
  - Understanding the image_generate tool parameters
title: "Generación de imágenes"
---

# Generación de imágenes

La herramienta `image_generate` permite al agente crear y editar imágenes utilizando sus proveedores configurados. Las imágenes generadas se entregan automáticamente como archivos adjuntos en la respuesta del agente.

<Note>La herramienta solo aparece cuando hay al menos un proveedor de generación de imágenes disponible. Si no ves `image_generate` en las herramientas de tu agente, configura `agents.defaults.imageGenerationModel` o configura una clave de API de proveedor.</Note>

## Inicio rápido

1. Configure una clave de API para al menos un proveedor (por ejemplo `OPENAI_API_KEY` o `GEMINI_API_KEY`).
2. Opcionalmente, configure su modelo preferido:

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: "openai/gpt-image-1",
    },
  },
}
```

3. Pregúntele al agente: _"Genera una imagen de una mascota amigable de langosta."_

El agente llama a `image_generate` automáticamente. No es necesario permitir la herramienta explícitamente; está habilitada por defecto cuando hay un proveedor disponible.

## Proveedores compatibles

| Proveedor | Modelo predeterminado            | Soporte de edición        | Clave de API                        |
| --------- | -------------------------------- | ------------------------- | ----------------------------------- |
| OpenAI    | `gpt-image-1`                    | No                        | `OPENAI_API_KEY`                    |
| Google    | `gemini-3.1-flash-image-preview` | Sí                        | `GEMINI_API_KEY` o `GOOGLE_API_KEY` |
| fal       | `fal-ai/flux/dev`                | Sí                        | `FAL_KEY`                           |
| MiniMax   | `image-01`                       | Sí (referencia de sujeto) | `MINIMAX_API_KEY`                   |

Use `action: "list"` para inspeccionar los proveedores y modelos disponibles en tiempo de ejecución:

```
/tool image_generate action=list
```

## Parámetros de la herramienta

| Parámetro     | Tipo     | Descripción                                                                                  |
| ------------- | -------- | -------------------------------------------------------------------------------------------- |
| `prompt`      | cadena   | Prompt de generación de imágenes (requerido para `action: "generate"`)                       |
| `action`      | cadena   | `"generate"` (predeterminado) o `"list"` para inspeccionar proveedores                       |
| `model`       | cadena   | Anulación de proveedor/modelo, p. ej. `openai/gpt-image-1`                                   |
| `image`       | cadena   | Ruta o URL de una sola imagen de referencia para el modo de edición                          |
| `images`      | cadena[] | Múltiples imágenes de referencia para el modo de edición (hasta 5)                           |
| `size`        | string   | Sugerencia de tamaño: `1024x1024`, `1536x1024`, `1024x1536`, `1024x1792`, `1792x1024`        |
| `aspectRatio` | string   | Relación de aspecto: `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9` |
| `resolution`  | string   | Sugerencia de resolución: `1K`, `2K` o `4K`                                                  |
| `count`       | number   | Número de imágenes a generar (1–4)                                                           |
| `filename`    | string   | Sugerencia de nombre de archivo de salida                                                    |

No todos los proveedores admiten todos los parámetros. La herramienta pasa lo que cada proveedor admite e ignora el resto.

## Configuración

### Selección de modelo

```json5
{
  agents: {
    defaults: {
      // String form: primary model only
      imageGenerationModel: "google/gemini-3-pro-image-preview",

      // Object form: primary + ordered fallbacks
      imageGenerationModel: {
        primary: "openai/gpt-image-1",
        fallbacks: ["google/gemini-3.1-flash-image-preview", "fal/fal-ai/flux/dev"],
      },
    },
  },
}
```

### Orden de selección del proveedor

Al generar una imagen, OpenClaw prueba los proveedores en este orden:

1. **parámetro `model`** de la llamada a la herramienta (si el agente especifica uno)
2. **`imageGenerationModel.primary`** desde la configuración
3. **`imageGenerationModel.fallbacks`** en orden
4. **Detección automática** — consulta todos los proveedores registrados para los valores predeterminados, prefiriendo: proveedor primario configurado, luego OpenAI, luego Google, luego otros

Si un proveedor falla (error de autenticación, límite de velocidad, etc.), se prueba automáticamente el siguiente candidato. Si todos fallan, el error incluye detalles de cada intento.

### Edición de imágenes

Google, fal y MiniMax admiten la edición de imágenes de referencia. Pase una ruta de imagen de referencia o una URL:

```
"Generate a watercolor version of this photo" + image: "/path/to/photo.jpg"
```

Google admite hasta 5 imágenes de referencia a través del parámetro `images`. fal y MiniMax admiten 1.

## Capacidades del proveedor

| Capacidad             | OpenAI       | Google                | fal               | MiniMax                       |
| --------------------- | ------------ | --------------------- | ----------------- | ----------------------------- |
| Generar               | Sí (hasta 4) | Sí (hasta 4)          | Sí (hasta 4)      | Sí (hasta 9)                  |
| Edición/referencia    | No           | Sí (hasta 5 imágenes) | Sí (1 imagen)     | Sí (1 imagen, ref. de sujeto) |
| Control de tamaño     | Sí           | Sí                    | Sí                | No                            |
| Relación de aspecto   | No           | Sí                    | Sí (solo generar) | Sí                            |
| Resolución (1K/2K/4K) | No           | Sí                    | Sí                | No                            |

## Relacionado

- [Resumen de herramientas](/en/tools) — todas las herramientas de agente disponibles
- [Referencia de configuración](/en/gateway/configuration-reference#agent-defaults) — configuración de `imageGenerationModel`
- [Modelos](/en/concepts/models) — configuración y conmutación por error de modelos
