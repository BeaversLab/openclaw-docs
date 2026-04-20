---
title: "Google (Gemini)"
summary: "Configuración de Google Gemini (clave de API + OAuth, generación de imágenes, comprensión de medios, TTS, búsqueda web)"
read_when:
  - You want to use Google Gemini models with OpenClaw
  - You need the API key or OAuth auth flow
---

# Google (Gemini)

El complemento de Google proporciona acceso a los modelos Gemini a través de Google AI Studio, además de
generación de imágenes, comprensión de medios (imagen/audio/vídeo), conversión de texto a voz y búsqueda web a través de
Gemini Grounding.

- Proveedor: `google`
- Autenticación: `GEMINI_API_KEY` o `GOOGLE_API_KEY`
- API: API de Google Gemini
- Proveedor alternativo: `google-gemini-cli` (OAuth)

## Para empezar

Elige tu método de autenticación preferido y sigue los pasos de configuración.

<Tabs>
  <Tab title="Clave de API">
    **Mejor para:** acceso estándar a la API de Gemini a través de Google AI Studio.

    <Steps>
      <Step title="Ejecutar incorporación">
        ```bash
        openclaw onboard --auth-choice gemini-api-key
        ```

        O pase la clave directamente:

        ```bash
        openclaw onboard --non-interactive \
          --mode local \
          --auth-choice gemini-api-key \
          --gemini-api-key "$GEMINI_API_KEY"
        ```
      </Step>
      <Step title="Establecer un modelo predeterminado">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "google/gemini-3.1-pro-preview" },
            },
          },
        }
        ```
      </Step>
      <Step title="Verificar que el modelo esté disponible">
        ```bash
        openclaw models list --provider google
        ```
      </Step>
    </Steps>

    <Tip>
    Las variables de entorno `GEMINI_API_KEY` y `GOOGLE_API_KEY` son ambas aceptadas. Utilice la que ya tenga configurada.
    </Tip>

  </Tab>

  <Tab title="Gemini CLI (OAuth)">
    **Mejor para:** reutilizar un inicio de sesión existente de la CLI de Gemini mediante OAuth PKCE en lugar de una clave API separada.

    <Warning>
    El proveedor `google-gemini-cli` es una integración no oficial. Algunos usuarios
    reportan restricciones en la cuenta al usar OAuth de esta manera. Úselo bajo su propia responsabilidad.
    </Warning>

    <Steps>
      <Step title="Instalar la CLI de Gemini">
        El comando local `gemini` debe estar disponible en `PATH`.

        ```bash
        # Homebrew
        brew install gemini-cli

        # or npm
        npm install -g @google/gemini-cli
        ```

        OpenClaw admite instalaciones de Homebrew e instalaciones globales de npm, incluyendo
        distribuciones comunes de Windows/npm.
      </Step>
      <Step title="Iniciar sesión a través de OAuth">
        ```bash
        openclaw models auth login --provider google-gemini-cli --set-default
        ```
      </Step>
      <Step title="Verificar que el modelo esté disponible">
        ```bash
        openclaw models list --provider google-gemini-cli
        ```
      </Step>
    </Steps>

    - Modelo predeterminado: `google-gemini-cli/gemini-3-flash-preview`
    - Alias: `gemini-cli`

    **Variables de entorno:**

    - `OPENCLAW_GEMINI_OAUTH_CLIENT_ID`
    - `OPENCLAW_GEMINI_OAUTH_CLIENT_SECRET`

    (O las variantes `GEMINI_CLI_*`.)

    <Note>
    Si las solicitudes OAuth de la CLI de Gemini fallan después del inicio de sesión, establezca `GOOGLE_CLOUD_PROJECT` o
    `GOOGLE_CLOUD_PROJECT_ID` en el host de la puerta de enlace y vuelva a intentarlo.
    </Note>

    <Note>
    Si el inicio de sesión falla antes de que comience el flujo del navegador, asegúrese de que el comando local `gemini`
    esté instalado y en `PATH`.
    </Note>

    El proveedor `google-gemini-cli` de solo OAuth es una superficie de inferencia de texto
    separada. La generación de imágenes, la comprensión de medios y Gemini Grounding se mantienen en
    el id de proveedor `google`.

  </Tab>
</Tabs>

## Capacidades

| Capacidad                 | Soportado                    |
| ------------------------- | ---------------------------- |
| Completaciones de chat    | Sí                           |
| Generación de imágenes    | Sí                           |
| Generación de música      | Sí                           |
| Conversión de texto a voz | Sí                           |
| Comprensión de imágenes   | Sí                           |
| Transcripción de audio    | Sí                           |
| Comprensión de video      | Sí                           |
| Búsqueda web (Grounding)  | Sí                           |
| Pensamiento/razonamiento  | Sí (Gemini 2.5+ / Gemini 3+) |
| Modelos Gemma 4           | Sí                           |

<Tip>
Los modelos Gemini 3 usan `thinkingLevel` en lugar de `thinkingBudget`. OpenClaw asigna los controles de razonamiento de los alias Gemini 3, Gemini 3.1 y `gemini-*-latest` a `thinkingLevel` para que las ejecuciones predeterminadas/de baja latencia no envíen valores `thinkingBudget` desactivados.

Los modelos Gemma 4 (por ejemplo, `gemma-4-26b-a4b-it`) admiten el modo de pensamiento. OpenClaw reescribe `thinkingBudget` a un `thinkingLevel` de Google compatible para Gemma 4.
Establecer el pensamiento en `off` preserva el pensamiento desactivado en lugar de asignarlo a `MINIMAL`.

</Tip>

## Generación de imágenes

El proveedor de generación de imágenes `google` incluido tiene `google/gemini-3.1-flash-image-preview` como valor predeterminado.

- También admite `google/gemini-3-pro-image-preview`
- Generar: hasta 4 imágenes por solicitud
- Modo de edición: habilitado, hasta 5 imágenes de entrada
- Controles de geometría: `size`, `aspectRatio` y `resolution`

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

<Note>Consulte [Generación de imágenes](/es/tools/image-generation) para ver los parámetros de herramientas compartidos, la selección del proveedor y el comportamiento de conmutación por error.</Note>

## Generación de video

El complemento `google` incluido también registra la generación de video a través de la herramienta compartida `video_generate`.

- Modelo de video predeterminado: `google/veo-3.1-fast-generate-preview`
- Modos: texto a video, imagen a video y flujos de referencia de video único
- Admite `aspectRatio`, `resolution` y `audio`
- Límite de duración actual: **4 a 8 segundos**

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

<Note>Consulte [Generación de video](/es/tools/video-generation) para ver los parámetros de herramientas compartidos, la selección del proveedor y el comportamiento de conmutación por error.</Note>

## Generación de música

El complemento `google` incluido también registra la generación de música a través de la herramienta compartida `music_generate`.

- Modelo de música predeterminado: `google/lyria-3-clip-preview`
- También admite `google/lyria-3-pro-preview`
- Controles de prompt: `lyrics` y `instrumental`
- Formato de salida: `mp3` por defecto, además de `wav` en `google/lyria-3-pro-preview`
- Entradas de referencia: hasta 10 imágenes
- Las ejecuciones respaldadas por sesión se desconectan a través del flujo compartido de tarea/estado, incluyendo `action: "status"`

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

<Note>Consulte [Generación de música](/es/tools/music-generation) para conocer los parámetros de herramienta compartidos, la selección del proveedor y el comportamiento de conmutación por error.</Note>

## Texto a voz

El proveedor de voz incluido `google` utiliza la ruta TTS de la API de Gemini con
`gemini-3.1-flash-tts-preview`.

- Voz predeterminada: `Kore`
- Autenticación: `messages.tts.providers.google.apiKey`, `models.providers.google.apiKey`, `GEMINI_API_KEY`, o `GOOGLE_API_KEY`
- Salida: WAV para archivos adjuntos TTS regulares, PCM para Talk/telefonía
- Salida nativa de notas de voz: no compatible en esta ruta de la API de Gemini porque la API devuelve PCM en lugar de Opus

Para usar Google como proveedor TTS predeterminado:

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "google",
      providers: {
        google: {
          model: "gemini-3.1-flash-tts-preview",
          voiceName: "Kore",
        },
      },
    },
  },
}
```

La TTS de la API de Gemini acepta etiquetas de audio expresivas entre corchetes en el texto, como
`[whispers]` o `[laughs]`. Para mantener las etiquetas fuera de la respuesta visible del chat mientras
se envían a TTS, colóquelas dentro de un bloque `[[tts:text]]...[[/tts:text]]`:

```text
Here is the clean reply text.

[[tts:text]][whispers] Here is the spoken version.[[/tts:text]]
```

<Note>Una clave de API de Google Cloud Console restringida a la API de Gemini es válida para este proveedor. Esta no es la ruta de la API de Text-to-Speech de Cloud por separado.</Note>

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Reutilización directa del caché de Gemini">
    Para ejecuciones directas de la API de Gemini (`api: "google-generative-ai"`), OpenClaw
    pasa un identificador `cachedContent` configurado a las solicitudes de Gemini.

    - Configure parámetros por modelo o globales con cualquiera de los siguientes:
      `cachedContent` o el parámetro heredado `cached_content`
    - Si ambos están presentes, `cachedContent` tiene prioridad
    - Valor de ejemplo: `cachedContents/prebuilt-context`
    - El uso de aciertos en el caché de Gemini se normaliza en OpenClaw `cacheRead` desde
      el `cachedContentTokenCount` superior

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

  </Accordion>

  <Accordion title="Notas de uso del JSON de la CLI de Gemini">
    Al usar el proveedor `google-gemini-cli` OAuth, OpenClaw normaliza
    la salida JSON de la CLI de la siguiente manera:

    - El texto de respuesta proviene del campo `response` del JSON de la CLI.
    - El uso recurre a `stats` cuando la CLI deja `usage` vacío.
    - `stats.cached` se normaliza en OpenClaw `cacheRead`.
    - Si falta `stats.input`, OpenClaw deriva los tokens de entrada de
      `stats.input_tokens - stats.cached`.

  </Accordion>

  <Accordion title="Configuración del entorno y del demonio">
    Si el Gateway se ejecuta como un demonio (launchd/systemd), asegúrese de que `GEMINI_API_KEY`
    esté disponible para ese proceso (por ejemplo, en `~/.openclaw/.env` o a través de
    `env.shellEnv`).
  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelo" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Generación de imágenes" href="/es/tools/image-generation" icon="image">
    Parámetros compartidos de la herramienta de imagen y selección del proveedor.
  </Card>
  <Card title="Generación de video" href="/es/tools/video-generation" icon="video">
    Parámetros compartidos de la herramienta de video y selección del proveedor.
  </Card>
  <Card title="Generación de música" href="/es/tools/music-generation" icon="music">
    Parámetros compartidos de la herramienta de música y selección del proveedor.
  </Card>
</CardGroup>
