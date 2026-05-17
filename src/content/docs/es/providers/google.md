---
summary: "Configuración de Google Gemini (clave de API + OAuth, generación de imágenes, comprensión de medios, TTS, búsqueda web)"
title: "Google (Gemini)"
read_when:
  - You want to use Google Gemini models with OpenClaw
  - You need the API key or OAuth auth flow
---

El complemento de Google proporciona acceso a los modelos Gemini a través de Google AI Studio, además de
generación de imágenes, comprensión de medios (imagen/audio/vídeo), conversión de texto a voz y búsqueda web mediante
Gemini Grounding.

- Proveedor: `google`
- Autenticación: `GEMINI_API_KEY` o `GOOGLE_API_KEY`
- API: API de Google Gemini
- Opción de tiempo de ejecución: proveedor/modelo `agentRuntime.id: "google-gemini-cli"`
  reutiliza el OAuth de la CLI de Gemini mientras mantiene las referencias del modelo canónicas como `google/*`.

## Introducción

Elija su método de autenticación preferido y siga los pasos de configuración.

<Tabs>
  <Tab title="Clave de API">
    **Lo mejor para:** acceso estándar a la API de Gemini a través de Google AI Studio.

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
    Las variables de entorno `GEMINI_API_KEY` y `GOOGLE_API_KEY` son ambas aceptadas. Use la que ya tenga configurada.
    </Tip>

  </Tab>

  <Tab title="CLI de Gemini (OAuth)">
    **Lo mejor para:** reutilizar un inicio de sesión existente de la CLI de Gemini a través de OAuth PKCE en lugar de una clave de API separada.

    <Warning>
    El proveedor `google-gemini-cli` es una integración no oficial. Algunos usuarios
    informan restricciones en la cuenta al usar OAuth de esta manera. Úselo bajo su propia responsabilidad.
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

        OpenClaw admite tanto instalaciones de Homebrew como instalaciones globales de npm, incluyendo
        diseños comunes de Windows/npm.
      </Step>
      <Step title="Iniciar sesión a través de OAuth">
        ```bash
        openclaw models auth login --provider google-gemini-cli --set-default
        ```
      </Step>
      <Step title="Verificar que el modelo esté disponible">
        ```bash
        openclaw models list --provider google
        ```
      </Step>
    </Steps>

    - Modelo predeterminado: `google/gemini-3.1-pro-preview`
    - Tiempo de ejecución: `google-gemini-cli`
    - Alias: `gemini-cli`

    El ID del modelo de la API de Gemini de Gemini 3.1 Pro es `gemini-3.1-pro-preview`. OpenClaw acepta el `google/gemini-3.1-pro` más corto como alias de conveniencia y lo normaliza antes de las llamadas al proveedor.

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

    Las referencias de modelo `google-gemini-cli/*` son alias de compatibilidad heredados. Las nuevas
    configuraciones deben usar referencias de modelo `google/*` más el tiempo de ejecución `google-gemini-cli`
    cuando deseen la ejecución local de la CLI de Gemini.

  </Tab>
</Tabs>

## Capacidades

| Capacidad                 | Compatible                   |
| ------------------------- | ---------------------------- |
| Finalizaciones de chat    | Sí                           |
| Generación de imágenes    | Sí                           |
| Generación de música      | Sí                           |
| Conversión de texto a voz | Sí                           |
| Voz en tiempo real        | Sí (Google Live API)         |
| Comprensión de imágenes   | Sí                           |
| Transcripción de audio    | Sí                           |
| Comprensión de video      | Sí                           |
| Búsqueda web (Grounding)  | Sí                           |
| Pensamiento/Razonamiento  | Sí (Gemini 2.5+ / Gemini 3+) |
| Modelos Gemma 4           | Sí                           |

## Búsqueda web

El proveedor de búsqueda web `gemini` incluido utiliza la fundamentación de búsqueda de Google de Gemini.
Configure una clave de búsqueda dedicada bajo `plugins.entries.google.config.webSearch`,
o permítale reutilizar `models.providers.google.apiKey` después de `GEMINI_API_KEY`:

```json5
{
  plugins: {
    entries: {
      google: {
        config: {
          webSearch: {
            apiKey: "AIza...", // optional if GEMINI_API_KEY or models.providers.google.apiKey is set
            baseUrl: "https://generativelanguage.googleapis.com/v1beta", // falls back to models.providers.google.baseUrl
            model: "gemini-2.5-flash",
          },
        },
      },
    },
  },
}
```

La precedencia de las credenciales es dedicada `webSearch.apiKey`, luego `GEMINI_API_KEY`,
luego `models.providers.google.apiKey`. `webSearch.baseUrl` es opcional y
existe para proxies de operadores o puntos de conexión de la API de Gemini compatibles; cuando se omite,
la búsqueda web de Gemini reutiliza `models.providers.google.baseUrl`. Consulte
[Gemini search](/es/tools/gemini-search) para el comportamiento específico de la herramienta del proveedor.

<Tip>
Los modelos Gemini 3 utilizan `thinkingLevel` en lugar de `thinkingBudget`. OpenClaw asigna
los controles de razonamiento de alias de Gemini 3, Gemini 3.1 y `gemini-*-latest` a
`thinkingLevel` para que las ejecuciones predeterminadas/de baja latencia no envíen valores
`thinkingBudget` deshabilitados.

`/think adaptive` mantiene la semántica de pensamiento dinámico de Google en lugar de elegir
un nivel fijo de OpenClaw. Gemini 3 y Gemini 3.1 omiten un `thinkingLevel` fijo para que
Google pueda elegir el nivel; Gemini 2.5 envía el centinela dinámico de Google
`thinkingBudget: -1`.

Los modelos Gemma 4 (por ejemplo `gemma-4-26b-a4b-it`) admiten el modo de pensamiento. OpenClaw
reescribe `thinkingBudget` a un `thinkingLevel` de Google compatible para Gemma 4.
Establecer el pensamiento en `off` preserva el pensamiento deshabilitado en lugar de asignarlo a
`MINIMAL`.

</Tip>

## Generación de imágenes

El proveedor de generación de imágenes `google` incluido tiene como valor predeterminado
`google/gemini-3.1-flash-image-preview`.

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

<Note>Consulte [Image Generation](/es/tools/image-generation) para ver los parámetros compartidos de la herramienta, la selección del proveedor y el comportamiento de conmutación por error.</Note>

## Generación de video

El complemento incluido `google` también registra la generación de video a través de la herramienta compartida `video_generate`.

- Modelo de video predeterminado: `google/veo-3.1-fast-generate-preview`
- Modos: texto a video, imagen a video y flujos de referencia de video único
- Admite `aspectRatio` (`16:9`, `9:16`) y `resolution` (`720P`, `1080P`); Veo no admite la salida de audio hoy en día
- Duraciones admitidas: **4, 6 u 8 segundos** (otros valores se ajustan al valor permitido más cercano)

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

<Note>Consulte [Video Generation](/es/tools/video-generation) para ver los parámetros compartidos de la herramienta, la selección del proveedor y el comportamiento de conmutación por error.</Note>

## Generación de música

El complemento `google` incluido también registra la generación de música a través de la herramienta compartida
`music_generate`.

- Modelo de música predeterminado: `google/lyria-3-clip-preview`
- También admite `google/lyria-3-pro-preview`
- Controles del prompt: `lyrics` y `instrumental`
- Formato de salida: `mp3` de forma predeterminada, además de `wav` en `google/lyria-3-pro-preview`
- Entradas de referencia: hasta 10 imágenes
- Las ejecuciones respaldadas por sesión se separan a través del flujo compartido de tarea/estado, incluyendo `action: "status"`

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

<Note>Consulte [Music Generation](/es/tools/music-generation) para ver los parámetros compartidos de la herramienta, la selección del proveedor y el comportamiento de conmutación por error.</Note>

## Texto a voz

El proveedor de voz `google` incluido utiliza la ruta TTS de la API de Gemini con
`gemini-3.1-flash-tts-preview`.

- Voz predeterminada: `Kore`
- Autenticación: `messages.tts.providers.google.apiKey`, `models.providers.google.apiKey`, `GEMINI_API_KEY` o `GOOGLE_API_KEY`
- Salida: WAV para archivos adjuntos de TTS normales, Opus para objetivos de notas de voz, PCM para Talk/telefonía
- Salida de notas de voz: Google PCM se envuelve como WAV y se transcodifica a Opus de 48 kHz con `ffmpeg`

La ruta de TTS por lotes de Gemini de Google devuelve el audio generado en la respuesta
`generateContent` completada. Para conversaciones habladas con la menor latencia,
utilice el proveedor de voz en tiempo real de Google respaldado por la Gemini Live API en lugar de TTS
por lotes.

Para usar Google como proveedor de TTS predeterminado:

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
          audioProfile: "Speak professionally with a calm tone.",
        },
      },
    },
  },
}
```

La API de TTS de Gemini usa el uso de lenguaje natural para el control del estilo. Establezca
`audioProfile` para anteponer un aviso de estilo reutilizable antes del texto hablado. Establezca
`speakerName` cuando su texto de aviso se refiera a un hablante con nombre.

La API de TTS de Gemini también acepta etiquetas de audio expresivas entre corchetes en el texto,
tales como `[whispers]` o `[laughs]`. Para mantener las etiquetas fuera de la respuesta visible del chat
mientras se envían a TTS, colóquelas dentro de un bloque
`[[tts:text]]...[[/tts:text]]`:

```text
Here is the clean reply text.

[[tts:text]][whispers] Here is the spoken version.[[/tts:text]]
```

<Note>Una clave de API de Google Cloud Console restringida a la API de Gemini es válida para este proveedor. Esta no es la ruta de API de Text-to-Speech en la nube por separado.</Note>

## Voz en tiempo real

El complemento `google` incluido registra un proveedor de voz en tiempo real respaldado por la
Gemini Live API para puentes de audio de backend como Voice Call y Google Meet.

| Configuración                       | Ruta de configuración                                               | Predeterminado                                                                  |
| ----------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Modelo                              | `plugins.entries.voice-call.config.realtime.providers.google.model` | `gemini-2.5-flash-native-audio-preview-12-2025`                                 |
| Voz                                 | `...google.voice`                                                   | `Kore`                                                                          |
| Temperatura                         | `...google.temperature`                                             | (sin establecer)                                                                |
| Sensibilidad de inicio de VAD       | `...google.startSensitivity`                                        | (sin establecer)                                                                |
| Sensibilidad de finalización de VAD | `...google.endSensitivity`                                          | (sin establecer)                                                                |
| Duración del silencio               | `...google.silenceDurationMs`                                       | (sin establecer)                                                                |
| Manejo de actividad                 | `...google.activityHandling`                                        | Predeterminado de Google, `start-of-activity-interrupts`                        |
| Cobertura de turnos                 | `...google.turnCoverage`                                            | Predeterminado de Google, `only-activity`                                       |
| Desactivar VAD automático           | `...google.automaticActivityDetectionDisabled`                      | `false`                                                                         |
| Reanudación de sesión               | `...google.sessionResumption`                                       | `true`                                                                          |
| Compresión de contexto              | `...google.contextWindowCompression`                                | `true`                                                                          |
| Clave de API                        | `...google.apiKey`                                                  | Recurre a `models.providers.google.apiKey`, `GEMINI_API_KEY` o `GOOGLE_API_KEY` |

Ejemplo de configuración en tiempo real para Voice Call:

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        enabled: true,
        config: {
          realtime: {
            enabled: true,
            provider: "google",
            providers: {
              google: {
                model: "gemini-2.5-flash-native-audio-preview-12-2025",
                voice: "Kore",
                activityHandling: "start-of-activity-interrupts",
                turnCoverage: "only-activity",
              },
            },
          },
        },
      },
    },
  },
}
```

<Note>
  Google Live API utiliza audio bidireccional y llamadas a funciones a través de un WebSocket. OpenClaw adapta el audio de los puentes de telefonía/Meet al flujo de la API PCM Live de Gemini y mantiene las llamadas a herramientas en el contrato de voz en tiempo real compartido. Deje `temperature` sin configurar a menos que necesite cambios de muestreo; OpenClaw omite los valores no positivos
  porque Google Live puede devolver transcripciones sin audio para `temperature: 0`. La transcripción de la API de Gemini está habilitada sin `languageCodes`; el SDK de Google actual rechaza las sugerencias de código de idioma en esta ruta de la API.
</Note>

<Note>Control UI Talk admite sesiones del navegador de Google Live con tokens de un solo uso restringidos. Los proveedores de voz en tiempo real solo de backend también pueden ejecutarse a través del transporte de retransmisión genérica de Gateway, que mantiene las credenciales del proveedor en el Gateway.</Note>

Para la verificación en vivo del mantenedor, ejecute
`OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts`.
La prueba también cubre las rutas de backend/WebRTC de OpenAI; la parte de Google crea la misma
forma de token restringido de la API Live que usa Talk en la Interfaz de Control, abre el
punto final WebSocket del navegador, envía la carga útil de configuración inicial y espera
`setupComplete`.

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Reutilización directa de caché Gemini">
    Para ejecuciones directas de la API de Gemini (`api: "google-generative-ai"`), OpenClaw
    pasa un identificador `cachedContent` configurado a través de las solicitudes a Gemini.

    - Configure parámetros por modelo o globales con cualquiera de los dos
      `cachedContent` o el heredado `cached_content`
    - Si ambos están presentes, `cachedContent` tiene prioridad
    - Valor de ejemplo: `cachedContents/prebuilt-context`
    - El uso de aciertos de caché de Gemini se normaliza en OpenClaw `cacheRead` desde
      `cachedContentTokenCount` anterior

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

  <Accordion title="Notas de uso JSON de CLI Gemini">
    Al usar el proveedor OAuth `google-gemini-cli`, OpenClaw normaliza
    la salida JSON de la CLI de la siguiente manera:

    - El texto de respuesta proviene del campo `response` del JSON de la CLI.
    - El uso vuelve a `stats` cuando la CLI deja `usage` vacío.
    - `stats.cached` se normaliza en OpenClaw `cacheRead`.
    - Si falta `stats.input`, OpenClaw deriva los tokens de entrada de
      `stats.input_tokens - stats.cached`.

  </Accordion>

  <Accordion title="Entorno y configuración del demonio">
    Si el Gateway se ejecuta como un demonio (launchd/systemd), asegúrese de que `GEMINI_API_KEY`
    esté disponible para ese proceso (por ejemplo, en `~/.openclaw/.env` o a través de
    `env.shellEnv`).
  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelo" href="/es/concepts/model-providers" icon="layers">
    Cómo elegir proveedores, referencias de modelos y el comportamiento de conmutación por error.
  </Card>
  <Card title="Generación de imágenes" href="/es/tools/image-generation" icon="image">
    Parámetros compartidos de la herramienta de imagen y selección de proveedor.
  </Card>
  <Card title="Generación de vídeo" href="/es/tools/video-generation" icon="video">
    Parámetros compartidos de la herramienta de vídeo y selección de proveedor.
  </Card>
  <Card title="Generación de música" href="/es/tools/music-generation" icon="music">
    Parámetros compartidos de la herramienta de música y selección de proveedor.
  </Card>
</CardGroup>
