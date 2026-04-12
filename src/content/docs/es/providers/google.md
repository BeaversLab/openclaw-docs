---
title: "Google (Gemini)"
summary: "Configuración de Google Gemini (clave de API + OAuth, generación de imágenes, comprensión multimedia, búsqueda web)"
read_when:
  - You want to use Google Gemini models with OpenClaw
  - You need the API key or OAuth auth flow
---

# Google (Gemini)

El complemento de Google proporciona acceso a los modelos Gemini a través de Google AI Studio, además de generación de imágenes, comprensión de medios (imagen/audio/video) y búsqueda web mediante Gemini Grounding.

- Proveedor: `google`
- Autenticación: `GEMINI_API_KEY` o `GOOGLE_API_KEY`
- API: API de Google Gemini
- Proveedor alternativo: `google-gemini-cli` (OAuth)

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

## OAuth (CLI de Gemini)

Un proveedor alternativo `google-gemini-cli` utiliza OAuth PKCE en lugar de una clave
de API. Esta es una integración no oficial; algunos usuarios reportan
restricciones en la cuenta. Úselo bajo su propia responsabilidad.

- Modelo predeterminado: `google-gemini-cli/gemini-3-flash-preview`
- Alias: `gemini-cli`
- Requisito previo de instalación: CLI de Gemini local disponible como `gemini`
  - Homebrew: `brew install gemini-cli`
  - npm: `npm install -g @google/gemini-cli`
- Inicio de sesión:

```bash
openclaw models auth login --provider google-gemini-cli --set-default
```

Variables de entorno:

- `OPENCLAW_GEMINI_OAUTH_CLIENT_ID`
- `OPENCLAW_GEMINI_OAUTH_CLIENT_SECRET`

(O las variantes `GEMINI_CLI_*`.)

Si las solicitudes OAuth de la CLI de Gemini fallan después del inicio de sesión, configure
`GOOGLE_CLOUD_PROJECT` o `GOOGLE_CLOUD_PROJECT_ID` en el host de la puerta de enlace y
vuelva a intentarlo.

Si el inicio de sesión falla antes de que comience el flujo del navegador, asegúrese de que el comando local `gemini`
esté instalado y en `PATH`. OpenClaw admite tanto instalaciones de Homebrew
como instalaciones globales de npm, incluidas las disposiciones comunes de Windows/npm.

Notas de uso de JSON de la CLI de Gemini:

- El texto de respuesta proviene del campo `response` del JSON de la CLI.
- El uso recurre a `stats` cuando la CLI deja `usage` vacío.
- `stats.cached` se normaliza en OpenClaw `cacheRead`.
- Si falta `stats.input`, OpenClaw deriva los tokens de entrada de
  `stats.input_tokens - stats.cached`.

## Capacidades

| Capacidad                | Soportado        |
| ------------------------ | ---------------- |
| Completaciones de chat   | Sí               |
| Generación de imágenes   | Sí               |
| Generación de música     | Sí               |
| Comprensión de imágenes  | Sí               |
| Transcripción de audio   | Sí               |
| Comprensión de video     | Sí               |
| Búsqueda web (Grounding) | Sí               |
| Pensamiento/razonamiento | Sí (Gemini 3.1+) |
| Modelos Gemma 4          | Sí               |

Los modelos Gemma 4 (por ejemplo `gemma-4-26b-a4b-it`) admiten el modo de pensamiento. OpenClaw reescribe `thinkingBudget` a un `thinkingLevel` de Google compatible para Gemma 4. Configurar el pensamiento en `off` mantiene el pensamiento desactivado en lugar de asignarlo a `MINIMAL`.

## Reutilización directa de la caché de Gemini

Para ejecuciones directas de la API de Gemini (`api: "google-generative-ai"`), OpenClaw ahora
pasa un identificador `cachedContent` configurado a través de las solicitudes de Gemini.

- Configure parámetros por modelo o globales con cualquiera de los dos
  `cachedContent` o el heredado `cached_content`
- Si ambos están presentes, `cachedContent` tiene prioridad
- Valor de ejemplo: `cachedContents/prebuilt-context`
- El uso de aciertos en la caché de Gemini se normaliza en el `cacheRead` de OpenClaw desde
  el `cachedContentTokenCount` ascendente

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

El proveedor de generación de imágenes `google` incluido tiene como valor predeterminado
`google/gemini-3.1-flash-image-preview`.

- También admite `google/gemini-3-pro-image-preview`
- Generar: hasta 4 imágenes por solicitud
- Modo de edición: habilitado, hasta 5 imágenes de entrada
- Controles de geometría: `size`, `aspectRatio` y `resolution`

El proveedor `google-gemini-cli` solo de OAuth es una superficie de inferencia de texto
separada. La generación de imágenes, la comprensión de medios y Gemini Grounding se mantienen en
el id del proveedor `google`.

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

Consulte [Generación de imágenes](/en/tools/image-generation) para conocer los parámetros de la herramienta
compartida, la selección del proveedor y el comportamiento de conmutación por error.

## Generación de video

El complemento `google` incluido también registra la generación de videos a través de la herramienta
compartida `video_generate`.

- Modelo de video predeterminado: `google/veo-3.1-fast-generate-preview`
- Modos: texto a video, imagen a video y flujos de referencia de video único
- Admite `aspectRatio`, `resolution` y `audio`
- Límite de duración actual: **de 4 a 8 segundos**

Para usar Google como proveedor de videos predeterminado:

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

Consulte [Generación de video](/en/tools/video-generation) para obtener los parámetros compartidos de la herramienta, la selección del proveedor y el comportamiento de conmutación por error.

## Generación de música

El complemento `google` incluido también registra la generación de música a través de la herramienta compartida `music_generate`.

- Modelo de música predeterminado: `google/lyria-3-clip-preview`
- También admite `google/lyria-3-pro-preview`
- Controles del prompt: `lyrics` y `instrumental`
- Formato de salida: `mp3` de forma predeterminada, más `wav` en `google/lyria-3-pro-preview`
- Entradas de referencia: hasta 10 imágenes
- Las ejecuciones con respaldo de sesión se desvinculan a través del flujo compartido de tarea/estado, incluyendo `action: "status"`

Para utilizar Google como proveedor de música predeterminado:

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

Consulte [Generación de música](/en/tools/music-generation) para obtener los parámetros compartidos de la herramienta, la selección del proveedor y el comportamiento de conmutación por error.

## Nota sobre el entorno

Si el Gateway se ejecuta como un demonio (launchd/systemd), asegúrese de que `GEMINI_API_KEY` esté disponible para ese proceso (por ejemplo, en `~/.openclaw/.env` o a través de `env.shellEnv`).
