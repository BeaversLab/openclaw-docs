---
summary: "Generar y editar imágenes usando proveedores configurados (OpenAI, Google Gemini, fal, MiniMax, ComfyUI, Vydra)"
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
      imageGenerationModel: {
        primary: "openai/gpt-image-1",
      },
    },
  },
}
```

3. Pregúntele al agente: _"Genera una imagen de una mascota amigable de langosta."_

El agente llama a `image_generate` automáticamente. No es necesario permitir la herramienta explícitamente; está habilitada por defecto cuando hay un proveedor disponible.

## Proveedores compatibles

| Proveedor | Modelo predeterminado            | Soporte de edición                              | Clave de API                                         |
| --------- | -------------------------------- | ----------------------------------------------- | ---------------------------------------------------- |
| OpenAI    | `gpt-image-1`                    | Sí (hasta 5 imágenes)                           | `OPENAI_API_KEY`                                     |
| Google    | `gemini-3.1-flash-image-preview` | Sí                                              | `GEMINI_API_KEY` o `GOOGLE_API_KEY`                  |
| fal       | `fal-ai/flux/dev`                | Sí                                              | `FAL_KEY`                                            |
| MiniMax   | `image-01`                       | Sí (referencia de sujeto)                       | `MINIMAX_API_KEY` o MiniMax OAuth (`minimax-portal`) |
| ComfyUI   | `workflow`                       | Sí (1 imagen, configurado por flujo de trabajo) | `COMFY_API_KEY` o `COMFY_CLOUD_API_KEY` para la nube |
| Vydra     | `grok-imagine`                   | No                                              | `VYDRA_API_KEY`                                      |

Use `action: "list"` para inspeccionar los proveedores y modelos disponibles en tiempo de ejecución:

```
/tool image_generate action=list
```

## Parámetros de la herramienta

| Parámetro     | Tipo     | Descripción                                                                                  |
| ------------- | -------- | -------------------------------------------------------------------------------------------- |
| `prompt`      | cadena   | Solicitud de generación de imagen (requerido para `action: "generate"`)                      |
| `action`      | cadena   | `"generate"` (predeterminado) o `"list"` para inspeccionar proveedores                       |
| `model`       | cadena   | Invalidación de proveedor/modelo, p. ej. `openai/gpt-image-1`                                |
| `image`       | cadena   | Ruta de imagen de referencia única o URL para el modo de edición                             |
| `images`      | cadena[] | Múltiples imágenes de referencia para el modo de edición (hasta 5)                           |
| `size`        | cadena   | Sugerencia de tamaño: `1024x1024`, `1536x1024`, `1024x1536`, `1024x1792`, `1792x1024`        |
| `aspectRatio` | cadena   | Relación de aspecto: `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9` |
| `resolution`  | cadena   | Sugerencia de resolución: `1K`, `2K` o `4K`                                                  |
| `count`       | número   | Número de imágenes a generar (1–4)                                                           |
| `filename`    | cadena   | Sugerencia de nombre de archivo de salida                                                    |

No todos los proveedores admiten todos los parámetros. Cuando un proveedor de respaldo admite una opción geométrica cercana en lugar de la exacta solicitada, OpenClaw reasigna al tamaño, relación de aspecto o resolución admitido más cercano antes del envío. Las anulaciones no admitidas verdaderamente aún se reportan en el resultado de la herramienta.

Los resultados de las herramientas reportan la configuración aplicada. Cuando OpenClaw reasigna la geometría durante el respaldo del proveedor, los valores `size`, `aspectRatio` y `resolution` devueltos reflejan lo que realmente se envió, y `details.normalization` captura la traducción de solicitado a aplicado.

## Configuración

### Selección del modelo

```json5
{
  agents: {
    defaults: {
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

1. Parámetro **`model`** de la llamada a la herramienta (si el agente especifica uno)
2. **`imageGenerationModel.primary`** de la configuración
3. **`imageGenerationModel.fallbacks`** en orden
4. **Detección automática** — usa solo los valores predeterminados del proveedor con autenticación:
   - primero el proveedor predeterminado actual
   - proveedores de generación de imágenes registrados restantes en orden de ID de proveedor

Si un proveedor falla (error de autenticación, límite de velocidad, etc.), se prueba automáticamente el siguiente candidato. Si todos fallan, el error incluye detalles de cada intento.

Notas:

- La detección automática es consciente de la autenticación. Un valor predeterminado del proveedor solo ingresa a la lista de candidatos
  cuando OpenClaw puede autenticar realmente ese proveedor.
- La detección automática está habilitada de forma predeterminada. Establezca
  `agents.defaults.mediaGenerationAutoProviderFallback: false` si desea que la generación
  de imágenes use solo las entradas explícitas `model`, `primary` y `fallbacks`.
- Use `action: "list"` para inspeccionar los proveedores registrados actualmente, sus
  modelos predeterminados y sugerencias de variables de entorno de autenticación.

### Edición de imágenes

OpenAI, Google, fal, MiniMax y ComfyUI admiten la edición de imágenes de referencia. Pase una ruta o URL de imagen de referencia:

```
"Generate a watercolor version of this photo" + image: "/path/to/photo.jpg"
```

OpenAI y Google admiten hasta 5 imágenes de referencia a través del parámetro `images`. fal, MiniMax y ComfyUI admiten 1.

La generación de imágenes de MiniMax está disponible a través de ambas rutas de autenticación de MiniMax incluidas:

- `minimax/image-01` para configuraciones con clave de API
- `minimax-portal/image-01` para configuraciones OAuth

## Capacidades del proveedor

| Capacidad             | OpenAI                | Google                | fal                  | MiniMax                       | ComfyUI                                         | Vydra  |
| --------------------- | --------------------- | --------------------- | -------------------- | ----------------------------- | ----------------------------------------------- | ------ |
| Generar               | Sí (hasta 4)          | Sí (hasta 4)          | Sí (hasta 4)         | Sí (hasta 9)                  | Sí (salidas definidas por el flujo de trabajo)  | Sí (1) |
| Editar/referencia     | Sí (hasta 5 imágenes) | Sí (hasta 5 imágenes) | Sí (1 imagen)        | Sí (1 imagen, ref. de sujeto) | Sí (1 imagen, configurado por flujo de trabajo) | No     |
| Control de tamaño     | Sí                    | Sí                    | Sí                   | No                            | No                                              | No     |
| Relación de aspecto   | No                    | Sí                    | Sí (solo generación) | Sí                            | No                                              | No     |
| Resolución (1K/2K/4K) | No                    | Sí                    | Sí                   | No                            | No                                              | No     |

## Relacionado

- [Resumen de herramientas](/en/tools) — todas las herramientas de agente disponibles
- [fal](/en/providers/fal) — configuración del proveedor de imagen y video fal
- [ComfyUI](/en/providers/comfy) — configuración de flujos de trabajo de ComfyUI local y Comfy Cloud
- [Google (Gemini)](/en/providers/google) — configuración del proveedor de imágenes Gemini
- [MiniMax](/en/providers/minimax) — configuración del proveedor de imágenes MiniMax
- [OpenAI](/en/providers/openai) — configuración del proveedor OpenAI Images
- [Vydra](/en/providers/vydra) — configuración de imagen, video y voz de Vydra
- [Referencia de configuración](/en/gateway/configuration-reference#agent-defaults) — configuración de `imageGenerationModel`
- [Modelos](/en/concepts/models) — configuración y conmutación por error de modelos
