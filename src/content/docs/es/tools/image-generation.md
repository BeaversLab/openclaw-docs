---
summary: "Generar y editar imágenes utilizando proveedores configurados (OpenAI, Google Gemini, fal, MiniMax, ComfyUI, Vydra, xAI)"
read_when:
  - Generating images via the agent
  - Configuring image generation providers and models
  - Understanding the image_generate tool parameters
title: "Generación de Imágenes"
---

# Generación de imágenes

La herramienta `image_generate` permite al agente crear y editar imágenes utilizando sus proveedores configurados. Las imágenes generadas se entregan automáticamente como archivos multimedia en la respuesta del agente.

<Note>La herramienta solo aparece cuando hay al menos un proveedor de generación de imágenes disponible. Si no ve `image_generate` en las herramientas de su agente, configure `agents.defaults.imageGenerationModel` o configure una clave API de proveedor.</Note>

## Inicio rápido

1. Configure una clave API para al menos un proveedor (por ejemplo `OPENAI_API_KEY` o `GEMINI_API_KEY`).
2. Opcionalmente, configure su modelo preferido:

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "openai/gpt-image-2",
      },
    },
  },
}
```

3. Pregúntele al agente: _"Genera una imagen de una mascota amigable de langosta."_

El agente llama a `image_generate` automáticamente. No es necesario añadir la herramienta a la lista de permitidos — está habilitada por defecto cuando hay un proveedor disponible.

## Proveedores compatibles

| Proveedor | Modelo predeterminado            | Soporte de edición                              | Clave de API                                         |
| --------- | -------------------------------- | ----------------------------------------------- | ---------------------------------------------------- |
| OpenAI    | `gpt-image-2`                    | Sí (hasta 5 imágenes)                           | `OPENAI_API_KEY`                                     |
| Google    | `gemini-3.1-flash-image-preview` | Sí                                              | `GEMINI_API_KEY` o `GOOGLE_API_KEY`                  |
| fal       | `fal-ai/flux/dev`                | Sí                                              | `FAL_KEY`                                            |
| MiniMax   | `image-01`                       | Sí (referencia de sujeto)                       | `MINIMAX_API_KEY` o MiniMax OAuth (`minimax-portal`) |
| ComfyUI   | `workflow`                       | Sí (1 imagen, configurado por flujo de trabajo) | `COMFY_API_KEY` o `COMFY_CLOUD_API_KEY` para la nube |
| Vydra     | `grok-imagine`                   | No                                              | `VYDRA_API_KEY`                                      |
| xAI       | `grok-imagine-image`             | Sí (hasta 5 imágenes)                           | `XAI_API_KEY`                                        |

Use `action: "list"` para inspeccionar los proveedores y modelos disponibles en tiempo de ejecución:

```
/tool image_generate action=list
```

## Parámetros de la herramienta

| Parámetro     | Tipo     | Descripción                                                                                  |
| ------------- | -------- | -------------------------------------------------------------------------------------------- |
| `prompt`      | string   | Prompt de generación de imagen (requerido para `action: "generate"`)                         |
| `action`      | string   | `"generate"` (predeterminado) o `"list"` para inspeccionar proveedores                       |
| `model`       | string   | Anulación de proveedor/modelo, p. ej. `openai/gpt-image-2`                                   |
| `image`       | string   | Ruta de una única imagen de referencia o URL para el modo de edición                         |
| `images`      | string[] | Múltiples imágenes de referencia para el modo de edición (hasta 5)                           |
| `size`        | string   | Pista de tamaño: `1024x1024`, `1536x1024`, `1024x1536`, `2048x2048`, `3840x2160`             |
| `aspectRatio` | string   | Relación de aspecto: `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9` |
| `resolution`  | string   | Pista de resolución: `1K`, `2K` o `4K`                                                       |
| `count`       | number   | Número de imágenes a generar (1–4)                                                           |
| `filename`    | string   | Pista del nombre del archivo de salida                                                       |

No todos los proveedores admiten todos los parámetros. Cuando un proveedor de reserva admite una opción geométrica cercana en lugar de la exacta solicitada, OpenClaw reasigna al tamaño, relación de aspecto o resolución admitido más cercano antes del envío. Las anulaciones realmente no admitidas se siguen informando en el resultado de la herramienta.

Los resultados de la herramienta informan de la configuración aplicada. Cuando OpenClaw reasigna la geometría durante la reserva del proveedor, los valores devueltos `size`, `aspectRatio` y `resolution` reflejan lo que se envió realmente, y `details.normalization` captura la traducción de solicitado a aplicado.

## Configuración

### Selección de modelo

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "openai/gpt-image-2",
        fallbacks: ["google/gemini-3.1-flash-image-preview", "fal/fal-ai/flux/dev"],
      },
    },
  },
}
```

### Orden de selección del proveedor

Al generar una imagen, OpenClaw prueba los proveedores en este orden:

1. **Parámetro `model`** de la llamada a la herramienta (si el agente especifica uno)
2. **`imageGenerationModel.primary`** de la configuración
3. **`imageGenerationModel.fallbacks`** en orden
4. **Detección automática** — usa solo los valores predeterminados del proveedor con autenticación:
   - primero el proveedor predeterminado actual
   - proveedores de generación de imágenes registrados restantes en orden de id de proveedor

Si un proveedor falla (error de autenticación, límite de velocidad, etc.), el siguiente candidato se intenta automáticamente. Si todos fallan, el error incluye detalles de cada intento.

Notas:

- La detección automática es consciente de la autenticación. Un proveedor predeterminado solo entra en la lista de candidatos
  cuando OpenClaw puede autenticar realmente ese proveedor.
- La detección automática está habilitada por defecto. Establezca
  `agents.defaults.mediaGenerationAutoProviderFallback: false` si desea que la
  generación de imágenes use solo las entradas explícitas `model`, `primary` y `fallbacks`.
- Use `action: "list"` para inspeccionar los proveedores registrados actualmente, sus
  modelos predeterminados y sugerencias de variables de entorno de autenticación.

### Edición de imágenes

OpenAI, Google, fal, MiniMax, ComfyUI y xAI admiten la edición de imágenes de referencia. Pase una ruta de imagen de referencia o una URL:

```
"Generate a watercolor version of this photo" + image: "/path/to/photo.jpg"
```

OpenAI, Google y xAI admiten hasta 5 imágenes de referencia a través del parámetro `images`. fal, MiniMax y ComfyUI admiten 1.

### OpenAI `gpt-image-2`

La generación de imágenes de OpenAI tiene por defecto `openai/gpt-image-2`. El modelo anterior
`openai/gpt-image-1` todavía se puede seleccionar explícitamente, pero las nuevas solicitudes
de generación y edición de imágenes de OpenAI deben usar `gpt-image-2`.

`gpt-image-2` admite tanto la generación de texto a imagen como la edición de
imágenes de referencia a través de la misma herramienta `image_generate`. OpenClaw reenvía `prompt`,
`count`, `size` e imágenes de referencia a OpenAI. OpenAI no recibe
`aspectRatio` o `resolution` directamente; cuando es posible, OpenClaw los asigna a un
`size` admitido, de lo contrario la herramienta los reporta como anulaciones ignoradas.

Generar una imagen panorámica 4K:

```
/tool image_generate action=generate model=openai/gpt-image-2 prompt="A clean editorial poster for OpenClaw image generation" size=3840x2160 count=1
```

Generar dos imágenes cuadradas:

```
/tool image_generate action=generate model=openai/gpt-image-2 prompt="Two visual directions for a calm productivity app icon" size=1024x1024 count=2
```

Editar una imagen de referencia local:

```
/tool image_generate action=generate model=openai/gpt-image-2 prompt="Keep the subject, replace the background with a bright studio setup" image=/path/to/reference.png size=1024x1536
```

Editar con múltiples referencias:

```
/tool image_generate action=generate model=openai/gpt-image-2 prompt="Combine the character identity from the first image with the color palette from the second" images='["/path/to/character.png","/path/to/palette.jpg"]' size=1536x1024
```

La generación de imágenes MiniMax está disponible a través de ambas rutas de autenticación MiniMax incluidas:

- `minimax/image-01` para configuraciones con clave API
- `minimax-portal/image-01` para configuraciones OAuth

## Capacidades del proveedor

| Capacidad             | OpenAI                | Google                | fal                  | MiniMax                       | ComfyUI                                         | Vydra  | xAI                   |
| --------------------- | --------------------- | --------------------- | -------------------- | ----------------------------- | ----------------------------------------------- | ------ | --------------------- |
| Generar               | Sí (hasta 4)          | Sí (hasta 4)          | Sí (hasta 4)         | Sí (hasta 9)                  | Sí (salidas definidas por el flujo de trabajo)  | Sí (1) | Sí (hasta 4)          |
| Edición/referencia    | Sí (hasta 5 imágenes) | Sí (hasta 5 imágenes) | Sí (1 imagen)        | Sí (1 imagen, ref. de sujeto) | Sí (1 imagen, configurado por flujo de trabajo) | No     | Sí (hasta 5 imágenes) |
| Control de tamaño     | Sí (hasta 4K)         | Sí                    | Sí                   | No                            | No                                              | No     | No                    |
| Relación de aspecto   | No                    | Sí                    | Sí (solo generación) | Sí                            | No                                              | No     | Sí                    |
| Resolución (1K/2K/4K) | No                    | Sí                    | Sí                   | No                            | No                                              | No     | Sí (1K/2K)            |

### xAI `grok-imagine-image`

El proveedor xAI incluido utiliza `/v1/images/generations` para solicitudes solo con
comandos y `/v1/images/edits` cuando `image` o `images` están presentes.

- Modelos: `xai/grok-imagine-image`, `xai/grok-imagine-image-pro`
- Cantidad: hasta 4
- Referencias: una `image` o hasta cinco `images`
- Relaciones de aspecto: `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `2:3`, `3:2`
- Resoluciones: `1K`, `2K`
- Salidas: devueltas como adjuntos de imagen gestionados por OpenClaw

OpenClaw intencionalmente no expone los controles nativos de xAI `quality`, `mask`, `user`, o
relaciones de aspecto adicionales nativas hasta que esos controles existan en el contrato
compartido `image_generate` entre proveedores.

## Relacionado

- [Resumen de herramientas](/es/tools) — todas las herramientas de agente disponibles
- [fal](/es/providers/fal) — configuración del proveedor de imagen y video de fal
- [ComfyUI](/es/providers/comfy) — configuración del flujo de trabajo de ComfyUI local y Comfy Cloud
- [Google (Gemini)](/es/providers/google) — configuración del proveedor de imágenes Gemini
- [MiniMax](/es/providers/minimax) — configuración del proveedor de imágenes MiniMax
- [OpenAI](/es/providers/openai) — configuración del proveedor OpenAI Images
- [Vydra](/es/providers/vydra) — configuración de imagen, video y voz de Vydra
- [xAI](/es/providers/xai) — configuración de imagen, video, búsqueda, ejecución de código y TTS de Grok
- [Referencia de configuración](/es/gateway/configuration-reference#agent-defaults) — `imageGenerationModel` config
- [Modelos](/es/concepts/models) — configuración y conmutación por error del modelo
