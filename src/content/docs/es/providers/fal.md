---
title: "fal"
summary: "configuración de generación de imágenes y videos de fal en OpenClaw"
read_when:
  - You want to use fal image generation in OpenClaw
  - You need the FAL_KEY auth flow
  - You want fal defaults for image_generate or video_generate
---

# fal

OpenClaw incluye un proveedor `fal` para la generación alojada de imágenes y videos.

- Proveedor: `fal`
- Autenticación: `FAL_KEY` (canónico; `FAL_API_KEY` también funciona como alternativa)
- API: endpoints de modelos de fal

## Inicio rápido

1. Establezca la clave de API:

```bash
openclaw onboard --auth-choice fal-api-key
```

2. Establezca un modelo de imagen predeterminado:

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

## Generación de imágenes

El proveedor de generación de imágenes `fal` incluido utiliza por defecto
`fal/fal-ai/flux/dev`.

- Generar: hasta 4 imágenes por solicitud
- Modo de edición: habilitado, 1 imagen de referencia
- Admite `size`, `aspectRatio` y `resolution`
- Advertencia actual de edición: el punto final de edición de imágenes de fal **no** admite
  anulaciones de `aspectRatio`

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

El proveedor de generación de videos `fal` incluido utiliza por defecto
`fal/fal-ai/minimax/video-01-live`.

- Modos: flujos de texto a video y de referencia de imagen única
- Tiempo de ejecución: flujo de envío/estado/resultado respaldado por cola para trabajos de larga duración
- Referencia del modelo de video-agente HeyGen:
  - `fal/fal-ai/heygen/v2/video-agent`
- Referencias del modelo Seedance 2.0:
  - `fal/bytedance/seedance-2.0/fast/text-to-video`
  - `fal/bytedance/seedance-2.0/fast/image-to-video`
  - `fal/bytedance/seedance-2.0/text-to-video`
  - `fal/bytedance/seedance-2.0/image-to-video`

Para usar Seedance 2.0 como el modelo de video predeterminado:

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

Para usar el video-agente HeyGen como el modelo de video predeterminado:

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

## Relacionado

- [Generación de imágenes](/en/tools/image-generation)
- [Generación de videos](/en/tools/video-generation)
- [Referencia de configuración](/en/gateway/configuration-reference#agent-defaults)
