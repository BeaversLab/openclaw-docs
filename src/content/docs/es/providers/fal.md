---
summary: "configuración de generación de imágenes y videos de fal en OpenClaw"
title: "Fal"
read_when:
  - You want to use fal image generation in OpenClaw
  - You need the FAL_KEY auth flow
  - You want fal defaults for image_generate or video_generate
---

OpenClaw incluye un proveedor `fal` integrado para la generación de imágenes y videos alojados.

| Propiedad     | Valor                                                                 |
| ------------- | --------------------------------------------------------------------- |
| Proveedor     | `fal`                                                                 |
| Autenticación | `FAL_KEY` (canónico; `FAL_API_KEY` también funciona como alternativa) |
| API           | endpoints de modelos de fal                                           |

## Cómo empezar

<Steps>
  <Step title="Establecer la clave de API">
    ```bash
    openclaw onboard --auth-choice fal-api-key
    ```
  </Step>
  <Step title="Establecer un modelo de imagen predeterminado">
    ```json5
    {
      agents: {
        defaults: {
          imageGenerationModel: {
            primary: "fal/fal-ai/flux/dev",
          },
        },
      },
    }
    ```
  </Step>
</Steps>

## Generación de imágenes

El proveedor de generación de imágenes `fal` incluido tiene como valor predeterminado
`fal/fal-ai/flux/dev`.

| Capacidad                | Valor                                                            |
| ------------------------ | ---------------------------------------------------------------- |
| Máximo de imágenes       | 4 por solicitud                                                  |
| Modo de edición          | Flux: 1 imagen de referencia; GPT Image 2: 10; Nano Banana 2: 14 |
| Sobrescrituras de tamaño | Compatible                                                       |
| Relación de aspecto      | Soportado para generate y edición de GPT Image 2/Nano Banana 2   |
| Resolución               | Compatible                                                       |
| Formato de salida        | `png` o `jpeg`                                                   |

<Warning>Las solicitudes de imagen a imagen de Flux **no** admiten anulaciones `aspectRatio`. Las solicitudes de edición de GPT Image 2 y Nano Banana 2 utilizan el punto final `/edit` de fal y aceptan sugerencias de relación de aspecto.</Warning>

Use `outputFormat: "png"` cuando desee salida PNG. fal no declara un
control explícito de fondo transparente en OpenClaw, por lo que `background:
"transparent"` se reporta como una anulación ignorada para los modelos fal.

Para usar fal como proveedor de imágenes predeterminado:

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "fal/fal-ai/flux/dev",
      },
    },
  },
}
```

## Generación de video

El proveedor de generación de video `fal` incluido tiene como valor predeterminado
`fal/fal-ai/minimax/video-01-live`.

| Capacidad           | Valor                                                                               |
| ------------------- | ----------------------------------------------------------------------------------- |
| Modos               | Texto a video, referencia de imagen única, referencia a video de Seedance           |
| Tiempo de ejecución | Flujo de envío/estado/resultado con soporte de cola para trabajos de larga duración |

<AccordionGroup>
  <Accordion title="Modelos de video disponibles">
    **Agente de video HeyGen:**

    - `fal/fal-ai/heygen/v2/video-agent`

    **Seedance 2.0:**

    - `fal/bytedance/seedance-2.0/fast/text-to-video`
    - `fal/bytedance/seedance-2.0/fast/image-to-video`
    - `fal/bytedance/seedance-2.0/fast/reference-to-video`
    - `fal/bytedance/seedance-2.0/text-to-video`
    - `fal/bytedance/seedance-2.0/image-to-video`
    - `fal/bytedance/seedance-2.0/reference-to-video`

  </Accordion>

  <Accordion title="Ejemplo de configuración de Seedance 2.0">
    ```json5
    {
      agents: {
        defaults: {
          videoGenerationModel: {
            primary: "fal/bytedance/seedance-2.0/fast/text-to-video",
          },
        },
      },
    }
    ```
  </Accordion>

  <Accordion title="Ejemplo de configuración de referencia a video de Seedance 2.0">
    ```json5
    {
      agents: {
        defaults: {
          videoGenerationModel: {
            primary: "fal/bytedance/seedance-2.0/fast/reference-to-video",
          },
        },
      },
    }
    ```

    Referencia a video acepta hasta 9 imágenes, 3 videos y 3 referencias de audio

a través de los parámetros compartidos `video_generate` `images`, `videos` y `audioRefs`,
con un máximo de 12 archivos de referencia en total.

  </Accordion>

  <Accordion title="Ejemplo de configuración de video-agente de HeyGen">
    ```json5
    {
      agents: {
        defaults: {
          videoGenerationModel: {
            primary: "fal/fal-ai/heygen/v2/video-agent",
          },
        },
      },
    }
    ```
  </Accordion>
</AccordionGroup>

<Tip>Use `openclaw models list --provider fal` para ver la lista completa de los modelos fal disponibles, incluidas las entradas agregadas recientemente.</Tip>

## Relacionado

<CardGroup cols={2}>
  <Card title="Generación de imágenes" href="/es/tools/image-generation" icon="image">
    Parámetros compartidos de la herramienta de imagen y selección del proveedor.
  </Card>
  <Card title="Generación de videos" href="/es/tools/video-generation" icon="video">
    Parámetros compartidos de la herramienta de video y selección del proveedor.
  </Card>
  <Card title="Referencia de configuración" href="/es/gateway/config-agents#agent-defaults" icon="gear">
    Valores predeterminados del agente, incluyendo la selección de modelos de imagen y video.
  </Card>
</CardGroup>
