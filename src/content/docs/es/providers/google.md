---
title: "Google (Gemini)"
summary: "Configuración de Google Gemini (clave de API, generación de imágenes, comprensión de medios, búsqueda web)"
read_when:
  - You want to use Google Gemini models with OpenClaw
  - You need the API key auth flow
---

# Google (Gemini)

El complemento de Google proporciona acceso a los modelos Gemini a través de Google AI Studio, además de generación de imágenes, comprensión de medios (imagen/audio/video) y búsqueda web mediante Gemini Grounding.

- Proveedor: `google`
- Autenticación: `GEMINI_API_KEY` o `GOOGLE_API_KEY`
- API: API de Google Gemini

## Inicio rápido

1. Establezca la clave de API:

```bash
openclaw onboard --auth-choice gemini-api-key
```

2. Establezca un modelo predeterminado:

```json5
{
  agents: {
    defaults: {
      model: { primary: "google/gemini-3.1-pro-preview" },
    },
  },
}
```

## Ejemplo no interactivo

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice gemini-api-key \
  --gemini-api-key "$GEMINI_API_KEY"
```

## Capacidades

| Capacidad                | Compatible       |
| ------------------------ | ---------------- |
| Finalizaciones de chat   | Sí               |
| Generación de imágenes   | Sí               |
| Generación de música     | Sí               |
| Comprensión de imágenes  | Sí               |
| Transcripción de audio   | Sí               |
| Comprensión de video     | Sí               |
| Búsqueda web (Grounding) | Sí               |
| Pensamiento/razonamiento | Sí (Gemini 3.1+) |

## Reutilización directa de caché de Gemini

Para ejecuciones directas de la API de Gemini (`api: "google-generative-ai"`), OpenClaw ahora
pasa un identificador `cachedContent` configurado a través de las solicitudes de Gemini.

- Configure parámetros por modelo o globales con cualquiera de
  `cachedContent` o el antiguo `cached_content`
- Si ambos están presentes, `cachedContent` tiene prioridad
- Valor de ejemplo: `cachedContents/prebuilt-context`
- El uso de aciertos de caché de Gemini se normaliza en `cacheRead` de OpenClaw desde
  `cachedContentTokenCount` ascendente

Ejemplo:

```json5
{
  agents: {
    defaults: {
      models: {
        "google/gemini-2.5-pro": {
          params: {
            cachedContent: "cachedContents/prebuilt-context",
          },
        },
      },
    },
  },
}
```

## Generación de imágenes

El proveedor de generación de imágenes `google` incluido de forma predeterminada en
`google/gemini-3.1-flash-image-preview`.

- También soporta `google/gemini-3-pro-image-preview`
- Generar: hasta 4 imágenes por solicitud
- Modo de edición: habilitado, hasta 5 imágenes de entrada
- Controles de geometría: `size`, `aspectRatio` y `resolution`

La generación de imágenes, la comprensión de medios y Gemini Grounding se mantienen en el
id. de proveedor `google`.

Para usar Google como proveedor de imágenes predeterminado:

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "google/gemini-3.1-flash-image-preview",
      },
    },
  },
}
```

Consulte [Generación de imágenes](/en/tools/image-generation) para conocer los parámetros de la herramienta compartida,
la selección del proveedor y el comportamiento de conmutación por error.

## Generación de video

El complemento `google` incluido también registra la generación de video a través de la herramienta compartida
`video_generate`.

- Modelo de video predeterminado: `google/veo-3.1-fast-generate-preview`
- Modos: texto a video, imagen a video y flujos de referencia de video único
- Soporta `aspectRatio`, `resolution` y `audio`
- Límite de duración actual: **de 4 a 8 segundos**

Para usar Google como proveedor de video predeterminado:

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "google/veo-3.1-fast-generate-preview",
      },
    },
  },
}
```

Consulte [Video Generation](/en/tools/video-generation) para conocer los parámetros
compartidos de la herramienta, la selección del proveedor y el comportamiento de conmutación por error.

## Generación de música

El complemento incluido `google` también registra la generación de música a través de la
herramienta compartida `music_generate`.

- Modelo de música predeterminado: `google/lyria-3-clip-preview`
- También admite `google/lyria-3-pro-preview`
- Controles del prompt: `lyrics` y `instrumental`
- Formato de salida: `mp3` de forma predeterminada, más `wav` en `google/lyria-3-pro-preview`
- Entradas de referencia: hasta 10 imágenes
- Las ejecuciones respaldadas por sesión se desvinculan a través del flujo compartido de tarea/estado, incluyendo `action: "status"`

Para usar Google como proveedor de música predeterminado:

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "google/lyria-3-clip-preview",
      },
    },
  },
}
```

Consulte [Music Generation](/en/tools/music-generation) para conocer los parámetros
compartidos de la herramienta, la selección del proveedor y el comportamiento de conmutación por error.

## Nota sobre el entorno

Si Gateway se ejecuta como un demonio (launchd/systemd), asegúrese de que `GEMINI_API_KEY`
esté disponible para ese proceso (por ejemplo, en `~/.openclaw/.env` o a través de
`env.shellEnv`).
