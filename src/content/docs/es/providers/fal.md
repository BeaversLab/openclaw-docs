---
title: "fal"
summary: "configuración de generación de imágenes y videos de fal en OpenClaw"
read_when:
  - You want to use fal image generation in OpenClaw
  - You need the FAL_KEY auth flow
  - You want fal defaults for image_generate or video_generate
---

# fal

OpenClaw incluye un proveedor `fal` integrado para la generación alojada de imágenes y videos.

| Propiedad     | Valor                                                                 |
| ------------- | --------------------------------------------------------------------- |
| Proveedor     | `fal`                                                                 |
| Autenticación | `FAL_KEY` (canónico; `FAL_API_KEY` también funciona como alternativa) |
| API           | Endpoints de modelos de fal                                           |

## Introducción

<Steps>
  <Step title="Set the API key">
    ```bash
    openclaw onboard --auth-choice fal-api-key
    ```
  </Step>
  <Step title="Set a default image model">
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

| Capacidad                | Valor                              |
| ------------------------ | ---------------------------------- |
| Máximo de imágenes       | 4 por solicitud                    |
| Modo de edición          | Habilitado, 1 imagen de referencia |
| Sobrescrituras de tamaño | Compatible                         |
| Relación de aspecto      | Compatible                         |
| Resolución               | Compatible                         |

<Warning>El endpoint de edición de imágenes de fal **no** admite sobrescrituras de `aspectRatio`.</Warning>

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

## Generación de videos

El proveedor de generación de videos `fal` incluido tiene como valor predeterminado
`fal/fal-ai/minimax/video-01-live`.

| Capacidad           | Valor                                                                               |
| ------------------- | ----------------------------------------------------------------------------------- |
| Modos               | Texto a video, referencia de imagen única                                           |
| Tiempo de ejecución | Flujo de envío/estado/resultado respaldado por cola para trabajos de larga duración |

<AccordionGroup>
  <Accordion title="Modelos de video disponibles">
    **HeyGen video-agent:**

    - `fal/fal-ai/heygen/v2/video-agent`

    **Seedance 2.0:**

    - `fal/bytedance/seedance-2.0/fast/text-to-video`
    - `fal/bytedance/seedance-2.0/fast/image-to-video`
    - `fal/bytedance/seedance-2.0/text-to-video`
    - `fal/bytedance/seedance-2.0/image-to-video`

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

  <Accordion title="Ejemplo de configuración de HeyGen video-agent">
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

<Tip>Use `openclaw models list --provider fal` para ver la lista completa de modelos de fal disponibles, incluidas las entradas añadidas recientemente.</Tip>

## Relacionado

<CardGroup cols={2}>
  <Card title="Generación de imágenes" href="/es/tools/image-generation" icon="image">
    Parámetros compartidos de la herramienta de imagen y selección de proveedor.
  </Card>
  <Card title="Generación de video" href="/es/tools/video-generation" icon="video">
    Parámetros compartidos de herramientas de video y selección de proveedor.
  </Card>
  <Card title="Referencia de configuración" href="/es/gateway/configuration-reference#agent-defaults" icon="gear">
    Valores predeterminados del agente, incluida la selección de modelos de imagen y video.
  </Card>
</CardGroup>
