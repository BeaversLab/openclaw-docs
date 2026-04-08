---
title: "fal"
summary: "configuración de generación de imágenes y videos de fal en OpenClaw"
read_when:
  - You want to use fal image generation in OpenClaw
  - You need the FAL_KEY auth flow
  - You want fal defaults for image_generate or video_generate
---

# fal

OpenClaw incluye un proveedor `fal` integrado para la generación de imágenes y videos alojados.

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

El proveedor de generación de imágenes `fal` integrado tiene por defecto
`fal/fal-ai/flux/dev`.

- Generar: hasta 4 imágenes por solicitud
- Modo de edición: habilitado, 1 imagen de referencia
- Soporta `size`, `aspectRatio` y `resolution`
- Advertencia de edición actual: el endpoint de edición de imágenes de fal **no** admite
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

El proveedor de generación de video `fal` integrado tiene por defecto
`fal/fal-ai/minimax/video-01-live`.

- Modos: flujos de texto a video y de referencia de imagen única
- Tiempo de ejecución: flujo de envío/estado/resultado respaldado por cola para trabajos de larga duración

Para usar fal como proveedor de video predeterminado:

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "fal/fal-ai/minimax/video-01-live",
      },
    },
  },
}
```

## Relacionado

- [Generación de imágenes](/en/tools/image-generation)
- [Generación de video](/en/tools/video-generation)
- [Referencia de configuración](/en/gateway/configuration-reference#agent-defaults)
