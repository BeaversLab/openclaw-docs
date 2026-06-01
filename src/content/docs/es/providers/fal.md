---
summary: "configuración de generación de imágenes, videos y música de fal en OpenClaw"
title: "Fal"
read_when:
  - You want to use fal image generation in OpenClaw
  - You need the FAL_KEY auth flow
  - You want fal defaults for image_generate, video_generate, or music_generate
---

OpenClaw incluye un proveedor `fal` integrado para la generación de imágenes, videos y música alojados.

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

El proveedor de generación de imágenes `fal` integrado tiene como valor predeterminado
`fal/fal-ai/flux/dev`.

| Capacidad                | Valor                                                                    |
| ------------------------ | ------------------------------------------------------------------------ |
| Máximo de imágenes       | 4 por solicitud; Krea 2: 1 por solicitud                                 |
| Modo de edición          | Flux: 1 imagen de referencia; GPT Image 2: 10; Nano Banana 2: 14         |
| Referencias de estilo    | Krea 2: hasta 10 referencias de estilo a través de `image` / `images`    |
| Sobrescrituras de tamaño | Compatible                                                               |
| Relación de aspecto      | Compatible para generate, Krea 2, y edición de GPT Image 2/Nano Banana 2 |
| Resolución               | Compatible                                                               |
| Formato de salida        | `png` o `jpeg`                                                           |

<Warning>
  Las solicitudes de imagen a imagen de Flux **no** admiten sobrescrituras de `aspectRatio`. Las solicitudes de edición de GPT Image 2 y Nano Banana 2 utilizan el punto final `/edit` de fal y aceptan sugerencias de relación de aspecto. Nano Banana 2 también acepta relaciones de aspecto anchas/altas extra-nativas tales como `4:1`, `1:4`, `8:1` y `1:8`; Krea 2 valida su propio subconjunto de
  relación de aspecto más pequeño.
</Warning>

Los modelos Krea 2 utilizan el esquema de carga útil Krea nativo de fal. OpenClaw envía
`aspect_ratio`, `creativity` y `image_style_references` en lugar de la
carga útil genérica `image_size` / del punto final de edición utilizada por Flux. Las referencias del modelo son:

- `fal/krea/v2/medium/text-to-image`
- `fal/krea/v2/large/text-to-image`

Utilice Medium para ilustraciones expresivas, anime, pintura y estilos
artísticos más rápidos. Utilice Large para fotorealismo más lento, textura
sin procesar, grano de película y aspectos detallados. Krea por defecto es
`fal.creativity: "medium"`; los valores admitidos son
`raw`, `low`, `medium` y `high`.

Krea 2 expone la relación de aspecto, no `image_size`, en el esquema de solicitud
de fal. Se prefiere `aspectRatio`; OpenClaw asigna `size` a la relación de aspecto
soportada más cercana de Krea y rechaza `resolution` para Krea en lugar de ignorarlo.

Use `outputFormat: "png"` cuando desee salida PNG de modelos fal que expongan
`output_format`. fal no declara un control explícito de fondo
transparente en OpenClaw, por lo que `background: "transparent"``output_format` se informa como una anulación
ignorada para modelos fal.
Los puntos finales de Krea 2 no exponen un campo de solicitud %%PH:INLINE_CODE:79:7ac648b%%
a través de fal, por lo que OpenClaw rechaza las anulaciones `outputFormat` para solicitudes de Krea.

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

Para usar Krea 2 Medium:

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "fal/krea/v2/medium/text-to-image",
      },
    },
  },
}
```

## Generación de video

El proveedor de generación de video `fal` incluido por defecto es
`fal/fal-ai/minimax/video-01-live`.

| Capacidad           | Valor                                                                               |
| ------------------- | ----------------------------------------------------------------------------------- |
| Modos               | Texto a video, referencia de imagen única, Seedance referencia a video              |
| Tiempo de ejecución | Flujo de envío/estado/resultado respaldado por cola para trabajos de larga duración |

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

  <Accordion title="Seedance 2.0 ejemplo de configuración de referencia a video">
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

    La conversión de referencia a video acepta hasta 9 imágenes, 3 videos y 3 referencias de audio
    a través de los parámetros compartidos `video_generate` `images`, `videos` y `audioRefs`
    , con un máximo de 12 archivos de referencia en total.

  </Accordion>

  <Accordion title="Ejemplo de configuración de video-agent de HeyGen">
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

## Generación de música

El complemento incluido `fal` también registra un proveedor de generación de música para la
herramienta compartida `music_generate`.

| Capacidad             | Valor                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| Modelo predeterminado | `fal/fal-ai/minimax-music/v2.6`                                                                        |
| Modelos               | `fal-ai/minimax-music/v2.6`, `fal-ai/ace-step/prompt-to-audio`, `fal-ai/stable-audio-25/text-to-audio` |
| Tiempo de ejecución   | Solicitud síncrona más descarga de audio generado                                                      |

Usar fal como proveedor de música predeterminado:

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "fal/fal-ai/minimax-music/v2.6",
      },
    },
  },
}
```

`fal-ai/minimax-music/v2.6` admite letras explícitas y modo instrumental.
ACE-Step y Stable Audio son puntos finales de prompt-to-audio; elíjalos con el
parámetro de anulación `model` cuando desee esas familias de modelos.

<Tip>Use `openclaw models list --provider fal` para ver la lista completa de modelos de fal disponibles, incluidas las entradas agregadas recientemente.</Tip>

## Relacionado

<CardGroup cols={2}>
  <Card title="Generación de imágenes" href="/es/tools/image-generation" icon="image">
    Parámetros de la herramienta de imagen compartida y selección del proveedor.
  </Card>
  <Card title="Generación de videos" href="/es/tools/video-generation" icon="video">
    Parámetros de la herramienta de video compartida y selección del proveedor.
  </Card>
  <Card title="Generación de música" href="/es/tools/music-generation" icon="music">
    Parámetros de la herramienta de música compartida y selección del proveedor.
  </Card>
  <Card title="Referencia de configuración" href="/es/gateway/config-agents#agent-defaults" icon="gear">
    Valores predeterminados del agente, incluida la selección de modelos de imagen, video y música.
  </Card>
</CardGroup>
