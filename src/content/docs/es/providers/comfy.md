---
title: "ComfyUI"
summary: "Configuración de generación de imágenes, videos y música de flujos de trabajo de ComfyUI en OpenClaw"
read_when:
  - You want to use local ComfyUI workflows with OpenClaw
  - You want to use Comfy Cloud with image, video, or music workflows
  - You need the bundled comfy plugin config keys
---

# ComfyUI

OpenClaw incluye un complemento `comfy` para ejecuciones de ComfyUI basadas en flujos de trabajo.

- Proveedor: `comfy`
- Modelos: `comfy/workflow`
- Superficies compartidas: `image_generate`, `video_generate`, `music_generate`
- Autenticación: ninguna para ComfyUI local; `COMFY_API_KEY` o `COMFY_CLOUD_API_KEY` para Comfy Cloud
- API: ComfyUI `/prompt` / `/history` / `/view` y Comfy Cloud `/api/*`

## Lo que admite

- Generación de imágenes desde un JSON de flujo de trabajo
- Edición de imágenes con 1 imagen de referencia cargada
- Generación de video desde un JSON de flujo de trabajo
- Generación de video con 1 imagen de referencia cargada
- Generación de música o audio a través de la herramienta compartida `music_generate`
- Descarga de salida desde un nodo configurado o todos los nodos de salida coincidentes

El complemento incluido se basa en flujos de trabajo, por lo que OpenClaw no intenta mapear controles genéricos de
`size`, `aspectRatio`, `resolution`, `durationSeconds`, o estilo TTS
en su gráfico.

## Diseño de configuración

Comfy admite configuraciones de conexión compartidas de nivel superior más secciones de flujo de trabajo
por capacidad:

```json5
{
  models: {
    providers: {
      comfy: {
        mode: "local",
        baseUrl: "http://127.0.0.1:8188",
        image: {
          workflowPath: "./workflows/flux-api.json",
          promptNodeId: "6",
          outputNodeId: "9",
        },
        video: {
          workflowPath: "./workflows/video-api.json",
          promptNodeId: "12",
          outputNodeId: "21",
        },
        music: {
          workflowPath: "./workflows/music-api.json",
          promptNodeId: "3",
          outputNodeId: "18",
        },
      },
    },
  },
}
```

Claves compartidas:

- `mode`: `local` o `cloud`
- `baseUrl`: por defecto es `http://127.0.0.1:8188` para local o `https://cloud.comfy.org` para la nube
- `apiKey`: alternativa de clave en línea opcional a las variables de entorno
- `allowPrivateNetwork`: permitir un `baseUrl` privado/LAN en modo nube

Claves por capacidad bajo `image`, `video` o `music`:

- `workflow` o `workflowPath`: requerido
- `promptNodeId`: requerido
- `promptInputName`: el valor predeterminado es `text`
- `outputNodeId`: opcional
- `pollIntervalMs`: opcional
- `timeoutMs`: opcional

Las secciones de imagen y video también admiten:

- `inputImageNodeId`: obligatorio cuando pasas una imagen de referencia
- `inputImageInputName`: el valor predeterminado es `image`

## Compatibilidad con versiones anteriores

La configuración de imagen de nivel superior existente todavía funciona:

```json5
{
  models: {
    providers: {
      comfy: {
        workflowPath: "./workflows/flux-api.json",
        promptNodeId: "6",
        outputNodeId: "9",
      },
    },
  },
}
```

OpenClaw trata esa estructura heredada como la configuración del flujo de trabajo de imagen.

## Flujos de trabajo de imagen

Establecer el modelo de imagen predeterminado:

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "comfy/workflow",
      },
    },
  },
}
```

Ejemplo de edición con imagen de referencia:

```json5
{
  models: {
    providers: {
      comfy: {
        image: {
          workflowPath: "./workflows/edit-api.json",
          promptNodeId: "6",
          inputImageNodeId: "7",
          inputImageInputName: "image",
          outputNodeId: "9",
        },
      },
    },
  },
}
```

## Flujos de trabajo de video

Establecer el modelo de video predeterminado:

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "comfy/workflow",
      },
    },
  },
}
```

Los flujos de trabajo de video de Comfy actualmente admiten texto a video e imagen a video a través
del gráfico configurado. OpenClaw no pasa videos de entrada a los flujos de trabajo de Comfy.

## Flujos de trabajo de música

El complemento incluido registra un proveedor de generación de música para salidas de audio
o música definidas en el flujo de trabajo, expuestas a través de la herramienta compartida `music_generate`:

```text
/tool music_generate prompt="Warm ambient synth loop with soft tape texture"
```

Usa la sección de configuración `music` para señalar tu JSON de flujo de trabajo de audio y el
nodo de salida.

## Comfy Cloud

Usa `mode: "cloud"` más uno de:

- `COMFY_API_KEY`
- `COMFY_CLOUD_API_KEY`
- `models.providers.comfy.apiKey`

El modo en la nube todavía usa las mismas secciones de flujo de trabajo `image`, `video` y `music`.

## Pruebas en vivo

Existe una cobertura en vivo opcional para el complemento incluido:

```bash
OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts
```

La prueba en vivo omite casos individuales de imagen, video o música a menos que la sección
del flujo de trabajo de Comfy correspondiente esté configurada.

## Relacionado

- [Generación de imágenes](/en/tools/image-generation)
- [Generación de video](/en/tools/video-generation)
- [Generación de música](/en/tools/music-generation)
- [Directorio de proveedores](/en/providers/index)
- [Referencia de configuración](/en/gateway/configuration-reference#agent-defaults)
