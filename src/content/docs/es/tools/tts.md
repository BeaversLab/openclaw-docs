---
summary: "Conversión de texto a voz para respuestas salientes: proveedores, personas, comandos de barra y salida por canal"
read_when:
  - Enabling text-to-speech for replies
  - Configuring a TTS provider, fallback chain, or persona
  - Using /tts commands or directives
title: "Conversión de texto a voz"
sidebarTitle: "Texto a voz (TTS)"
---

OpenClaw puede convertir las respuestas salientes en audio a través de **14 proveedores de voz**
y entregar mensajes de voz nativos en Feishu, Matrix, Telegram y WhatsApp,
archivos de audio en todos los demás lugares, y transmisiones PCM/Ulaw para telefonía y Talk.

TTS es la mitad de salida de voz del modo `stt-tts` de Talk. Las sesiones de Talk `realtime` nativas del proveedor sintetizan el habla dentro del proveedor en tiempo real
en lugar de llamar a esta ruta TTS, mientras que las sesiones `transcription` no sintetizan una
respuesta de voz del asistente.

## Inicio rápido

<Steps>
  <Step title="Elegir un proveedor">
    OpenAI y ElevenLabs son las opciones alojadas más confiables. Microsoft y
    Local CLI funcionan sin una clave API. Consulte la [matriz de proveedores](#supported-providers)
    para ver la lista completa.
  </Step>
  <Step title="Establecer la clave API">
    Exporte la variable de entorno para su proveedor (por ejemplo `OPENAI_API_KEY`,
    `ELEVENLABS_API_KEY`). Microsoft y Local CLI no necesitan clave.
  </Step>
  <Step title="Habilitar en la configuración">
    Establezca `messages.tts.auto: "always"` y `messages.tts.provider`:

    ```json5
    {
      messages: {
        tts: {
          auto: "always",
          provider: "elevenlabs",
        },
      },
    }
    ```

  </Step>
  <Step title="Probarlo en el chat">
    `/tts status` muestra el estado actual. `/tts audio Hello from OpenClaw`
    envía una respuesta de audio única.
  </Step>
</Steps>

<Note>
  Auto-TTS está **desactivado** de forma predeterminada. Cuando `messages.tts.provider` no está establecido, OpenClaw elige el primer proveedor configurado en el orden de selección automática del registro. La herramienta de agente `tts` integrada es solo de intención explícita: el chat ordinario permanece texto a menos que el usuario solicite audio, use `/tts` o habilite el habla de
  Auto-TTS/directivas.
</Note>

## Proveedores compatibles

| Proveedor         | Autenticación                                                                                                     | Notas                                                                                                               |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Azure Speech**  | `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION` (también `AZURE_SPEECH_API_KEY`, `SPEECH_KEY`, `SPEECH_REGION`)        | Salida de notas de voz Ogg/Opus nativas y telefonía.                                                                |
| **DeepInfra**     | `DEEPINFRA_API_KEY`                                                                                               | TTS compatible con OpenAI. El valor predeterminado es `hexgrad/Kokoro-82M`.                                         |
| **ElevenLabs**    | `ELEVENLABS_API_KEY` o `XI_API_KEY`                                                                               | Clonación de voz, multilingüe, determinista a través de `seed`; transmitido para la reproducción de voz en Discord. |
| **Google Gemini** | `GEMINI_API_KEY` o `GOOGLE_API_KEY`                                                                               | TTS por lotes de la API de Gemini; con reconocimiento de persona a través de `promptTemplate: "audio-profile-v1"`.  |
| **Gradium**       | `GRADIUM_API_KEY`                                                                                                 | Salida de notas de voz y telefonía.                                                                                 |
| **Inworld**       | `INWORLD_API_KEY`                                                                                                 | API de transmisión de TTS. Notas de voz nativas en Opus y telefonía PCM.                                            |
| **CLI local**     | ninguno                                                                                                           | Ejecuta un comando TTS local configurado.                                                                           |
| **Microsoft**     | ninguno                                                                                                           | TTS neuronal de Edge pública a través de `node-edge-tts`. Mejor esfuerzo posible, sin SLA.                          |
| **MiniMax**       | `MINIMAX_API_KEY` (o Token Plan: `MINIMAX_OAUTH_TOKEN`, `MINIMAX_CODE_PLAN_KEY`, `MINIMAX_CODING_API_KEY`)        | API T2A v2. El valor predeterminado es `speech-2.8-hd`.                                                             |
| **OpenAI**        | `OPENAI_API_KEY`                                                                                                  | También se usa para el resumen automático; admite persona `instructions`.                                           |
| **OpenRouter**    | `OPENROUTER_API_KEY` (puede reutilizar `models.providers.openrouter.apiKey`)                                      | Modelo predeterminado `hexgrad/kokoro-82m`.                                                                         |
| **Volcengine**    | `VOLCENGINE_TTS_API_KEY` o `BYTEPLUS_SEED_SPEECH_API_KEY` (AppID/token heredado: `VOLCENGINE_TTS_APPID`/`_TOKEN`) | API HTTP de BytePlus Seed Speech.                                                                                   |
| **Vydra**         | `VYDRA_API_KEY`                                                                                                   | Proveedor compartido de imágenes, videos y voz.                                                                     |
| **xAI**           | `XAI_API_KEY`                                                                                                     | TTS por lotes de xAI. La nota de voz nativa en Opus **no** es compatible.                                           |
| **Xiaomi MiMo**   | `XIAOMI_API_KEY`                                                                                                  | TTS MiMo a través de las finalizaciones de chat de Xiaomi.                                                          |

Si se configuran varios proveedores, el seleccionado se usa primero y los
otros son opciones de respaldo. El resumen automático usa `summaryModel` (o
`agents.defaults.model.primary`), por lo que ese proveedor también debe estar autenticado
si mantiene los resúmenes habilitados.

<Warning>
  El proveedor incluido de **Microsoft** utiliza el servicio TTS neuronal en línea de Microsoft Edge a través de `node-edge-tts`. Es un servicio web público sin un SLA o cuota publicados — trátelo como de mejor esfuerzo. El ID de proveedor heredado `edge` se normaliza a `microsoft` y `openclaw doctor --fix` reescribe la configuración persistente; las configuraciones nuevas siempre deben usar
  `microsoft`.
</Warning>

## Configuración

La configuración de TTS se encuentra en `messages.tts` en `~/.openclaw/openclaw.json`. Elija una preconfiguración y adapte el bloque del proveedor:

<Tabs>
  <Tab title="Azure Speech">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "azure-speech",
      providers: {
        "azure-speech": {
          apiKey: "${AZURE_SPEECH_KEY}",
          region: "eastus",
          speakerVoice: "en-US-JennyNeural",
          lang: "en-US",
          outputFormat: "audio-24khz-48kbitrate-mono-mp3",
          voiceNoteOutputFormat: "ogg-24khz-16bit-mono-opus",
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="ElevenLabs">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "elevenlabs",
      providers: {
        elevenlabs: {
          apiKey: "${ELEVENLABS_API_KEY}",
          model: "eleven_multilingual_v2",
          speakerVoiceId: "EXAVITQu4vr4xnSDxMaL",
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="Google Gemini">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "google",
      providers: {
        google: {
          apiKey: "${GEMINI_API_KEY}",
          model: "gemini-3.1-flash-tts-preview",
          speakerVoice: "Kore",
          // Optional natural-language style prompts:
          // audioProfile: "Speak in a calm, podcast-host tone.",
          // speakerName: "Alex",
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="Gradium">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "gradium",
      providers: {
        gradium: {
          apiKey: "${GRADIUM_API_KEY}",
          speakerVoiceId: "YTpq7expH9539ERJ",
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="Inworld">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "inworld",
      providers: {
        inworld: {
          apiKey: "${INWORLD_API_KEY}",
          modelId: "inworld-tts-1.5-max",
          speakerVoiceId: "Sarah",
          temperature: 0.7,
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="Local CLI">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "tts-local-cli",
      providers: {
        "tts-local-cli": {
          command: "say",
          args: ["-o", "{{OutputPath}}", "{{Text}}"],
          outputFormat: "wav",
          timeoutMs: 120000,
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="Microsoft (sin clave)">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "microsoft",
      providers: {
        microsoft: {
          enabled: true,
          speakerVoice: "en-US-MichelleNeural",
          lang: "en-US",
          outputFormat: "audio-24khz-48kbitrate-mono-mp3",
          rate: "+0%",
          pitch: "+0%",
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="MiniMax">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "minimax",
      providers: {
        minimax: {
          apiKey: "${MINIMAX_API_KEY}",
          model: "speech-2.8-hd",
          speakerVoiceId: "English_expressive_narrator",
          speed: 1.0,
          vol: 1.0,
          pitch: 0,
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="OpenAI + ElevenLabs">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "openai",
      summaryModel: "openai/gpt-4.1-mini",
      modelOverrides: { enabled: true },
      providers: {
        openai: {
          apiKey: "${OPENAI_API_KEY}",
          model: "gpt-4o-mini-tts",
          speakerVoice: "alloy",
        },
        elevenlabs: {
          apiKey: "${ELEVENLABS_API_KEY}",
          model: "eleven_multilingual_v2",
          speakerVoiceId: "EXAVITQu4vr4xnSDxMaL",
          voiceSettings: { stability: 0.5, similarityBoost: 0.75, style: 0.0, useSpeakerBoost: true, speed: 1.0 },
          applyTextNormalization: "auto",
          languageCode: "en",
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="OpenRouter">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "openrouter",
      providers: {
        openrouter: {
          apiKey: "${OPENROUTER_API_KEY}",
          model: "hexgrad/kokoro-82m",
          speakerVoice: "af_alloy",
          responseFormat: "mp3",
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="Volcengine">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "volcengine",
      providers: {
        volcengine: {
          apiKey: "${VOLCENGINE_TTS_API_KEY}",
          resourceId: "seed-tts-1.0",
          speakerVoice: "en_female_anna_mars_bigtts",
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="xAI">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "xai",
      providers: {
        xai: {
          apiKey: "${XAI_API_KEY}",
          speakerVoiceId: "eve",
          language: "en",
          responseFormat: "mp3",
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="Xiaomi MiMo">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "xiaomi",
      providers: {
        xiaomi: {
          apiKey: "${XIAOMI_API_KEY}",
          model: "mimo-v2.5-tts",
          speakerVoice: "mimo_default",
          format: "mp3",
        },
      },
    },
  },
}
```
  </Tab>
</Tabs>

Para Xiaomi `mimo-v2.5-tts-voicedesign`, omita `speakerVoice` y configure `style` en
el prompt de diseño de voz. OpenClaw envía ese prompt como el mensaje TTS `user`
y no envía `audio.voice` para el modelo voicedesign.

### Anulaciones de voz por agente

Use `agents.list[].tts` cuando un agente debe hablar con un proveedor,
voz, modelo, persona o modo de TTS automático diferente. El bloque del agente se fusiona profundamente (deep-merge) sobre
`messages.tts`, por lo que las credenciales del proveedor pueden permanecer en la configuración global del proveedor:

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "elevenlabs",
      providers: {
        elevenlabs: { apiKey: "${ELEVENLABS_API_KEY}", model: "eleven_multilingual_v2" },
      },
    },
  },
  agents: {
    list: [
      {
        id: "reader",
        tts: {
          providers: {
            elevenlabs: { speakerVoiceId: "EXAVITQu4vr4xnSDxMaL" },
          },
        },
      },
    ],
  },
}
```

Para fijar una persona por agente, configure `agents.list[].tts.persona` junto con la configuración del
proveedor — esto anula la `messages.tts.persona` global solo para ese agente.

Orden de precedencia para respuestas automáticas, `/tts audio`, `/tts status` y la
herramienta de agente `tts`:

1. `messages.tts`
2. `agents.list[].tts` activa
3. anulación de canal, cuando el canal admite `channels.<channel>.tts`
4. anulación de cuenta, cuando el canal pasa `channels.<channel>.accounts.<id>.tts`
5. preferencias locales de `/tts` para este host
6. directivas `[[tts:...]]` en línea cuando las [anulaciones de modelo](#model-driven-directives) están habilitadas

Las anulaciones de canal y de cuenta utilizan la misma forma que `messages.tts` y
se fusionan profundamente (deep-merge) sobre las capas anteriores, por lo que las credenciales compartidas del proveedor pueden permanecer en
`messages.tts` mientras un canal o una cuenta de bot cambia solo la voz del hablante, el modelo, la persona,
o el modo automático:

```json5
{
  messages: {
    tts: {
      provider: "openai",
      providers: {
        openai: { apiKey: "${OPENAI_API_KEY}", model: "gpt-4o-mini-tts" },
      },
    },
  },
  channels: {
    feishu: {
      accounts: {
        english: {
          tts: {
            providers: {
              openai: { speakerVoice: "shimmer" },
            },
          },
        },
      },
    },
  },
}
```

## Personas

Una **persona** es una identidad hablada estable que se puede aplicar de manera determinista
a través de proveedores. Puede preferir un proveedor, definir una intención de prompt
neutral al proveedor y llevar enlaces específicos del proveedor para voces, modelos, plantillas de
prompt, semillas y configuraciones de voz.

### Persona mínima

```json5
{
  messages: {
    tts: {
      auto: "always",
      persona: "narrator",
      personas: {
        narrator: {
          label: "Narrator",
          provider: "elevenlabs",
          providers: {
            elevenlabs: {
              speakerVoiceId: "EXAVITQu4vr4xnSDxMaL",
              modelId: "eleven_multilingual_v2",
            },
          },
        },
      },
    },
  },
}
```

### Persona completa (prompt neutral al proveedor)

```json5
{
  messages: {
    tts: {
      auto: "always",
      persona: "alfred",
      personas: {
        alfred: {
          label: "Alfred",
          description: "Dry, warm British butler narrator.",
          provider: "google",
          fallbackPolicy: "preserve-persona",
          prompt: {
            profile: "A brilliant British butler. Dry, witty, warm, charming, emotionally expressive, never generic.",
            scene: "A quiet late-night study. Close-mic narration for a trusted operator.",
            sampleContext: "The speaker is answering a private technical request with concise confidence and dry warmth.",
            style: "Refined, understated, lightly amused.",
            accent: "British English.",
            pacing: "Measured, with short dramatic pauses.",
            constraints: ["Do not read configuration values aloud.", "Do not explain the persona."],
          },
          providers: {
            google: {
              model: "gemini-3.1-flash-tts-preview",
              speakerVoice: "Algieba",
              promptTemplate: "audio-profile-v1",
            },
            openai: { model: "gpt-4o-mini-tts", speakerVoice: "cedar" },
            elevenlabs: {
              speakerVoiceId: "voice_id",
              modelId: "eleven_multilingual_v2",
              seed: 42,
              voiceSettings: {
                stability: 0.65,
                similarityBoost: 0.8,
                style: 0.25,
                useSpeakerBoost: true,
                speed: 0.95,
              },
            },
          },
        },
      },
    },
  },
}
```

### Resolución de persona

La persona activa se selecciona de manera determinista:

1. `/tts persona <id>` preferencia local, si está configurada.
2. `messages.tts.persona`, si está configurado.
3. Sin persona.

La selección del proveedor se ejecuta con prioridad explícita:

1. Anulaciones directas (CLI, pasarela, Talk, directivas TTS permitidas).
2. Preferencia local `/tts provider <id>`.
3. `provider` de la persona activa.
4. `messages.tts.provider`.
5. Selección automática del registro.

Para cada intento de proveedor, OpenClaw combina las configuraciones en este orden:

1. `messages.tts.providers.<id>`
2. `messages.tts.personas.<persona>.providers.<id>`
3. Anulaciones de solicitudes de confianza
4. Anulaciones de directivas TTS emitidas por el modelo permitidas

### Cómo los proveedores usan los prompts de persona

Los campos del prompt de persona (`profile`, `scene`, `sampleContext`, `style`, `accent`,
`pacing`, `constraints`) son **neutrales al proveedor**. Cada proveedor decide cómo
usarlos:

<AccordionGroup>
  <Accordion title="Google Gemini">
    Envuelve los campos del prompt de persona en una estructura de prompt TTS de Gemini **solo cuando**
    la configuración efectiva del proveedor de Google establece `promptTemplate: "audio-profile-v1"`
    o `personaPrompt`. Los campos anteriores `audioProfile` y `speakerName` se
    siguen anteponiendo como texto de prompt específico de Google. Las etiquetas de audio en línea, como
    `[whispers]` o `[laughs]`, dentro de un bloque `[[tts:text]]` se conservan
    dentro de la transcripción de Gemini; OpenClaw no genera estas etiquetas.
  </Accordion>
  <Accordion title="OpenAI">
    Mapea los campos del prompt de persona al campo de solicitud `instructions` **solo cuando**
    no hay ningún `instructions` explícito de OpenAI configurado. El `instructions`
    explícito siempre tiene prioridad.
  </Accordion>
  <Accordion title="Otros proveedores">
    Use solo los enlaces de persona específicos del proveedor en
    `personas.<id>.providers.<provider>`. Los campos de instrucciones de persona se ignoran
    a menos que el proveedor implemente su propia asignación de instrucciones de persona.
  </Accordion>
</AccordionGroup>

### Política de reserva

`fallbackPolicy` controla el comportamiento cuando una persona **no tiene ningún enlace** para el
proveedor intentado:

| Política            | Comportamiento                                                                                                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `preserve-persona`  | **Por defecto.** Los campos de instrucciones neutrales al proveedor siguen disponibles; el proveedor puede usarlos o ignorarlos.                                                   |
| `provider-defaults` | La persona se omite de la preparación de la instrucción para ese intento; el proveedor usa sus valores predeterminados neutrales mientras continúa la reserva a otros proveedores. |
| `fail`              | Omita ese intento de proveedor con `reasonCode: "not_configured"` y `personaBinding: "missing"`. Todavía se prueban los proveedores de reserva.                                    |

Toda la solicitud de TTS falla solo cuando se omite o falla **todos** los proveedores intentados.

La selección del proveedor de la sesión de Talk tiene alcance de sesión. Un cliente de Talk debe elegir
los identificadores de proveedor, modelo, voz y configuraciones regionales de `talk.catalog` y pasarlos
a través de la sesión de Talk o la solicitud de traspaso. Abrir una sesión de voz no
debe mutar `messages.tts` ni los valores predeterminados globales del proveedor de Talk.

## Directivas impulsadas por el modelo

De forma predeterminada, el asistente **puede** emitir directivas `[[tts:...]]` para anular
la voz, el modelo o la velocidad para una sola respuesta, más un bloque opcional
`[[tts:text]]...[[/tts:text]]` para pistas expresivas que deberían aparecer solo
en audio:

```text
Here you go.

[[tts:speakerVoiceId=pMsXgVXv3BLzUgSXRplE model=eleven_v3 speed=1.1]]
[[tts:text]](laughs) Read the song once more.[[/tts:text]]
```

Cuando `messages.tts.auto` es `"tagged"`, **se requieren directivas** para activar
el audio. La entrega de bloques en streaming elimina las directivas del texto visible antes de que
el canal las vea, incluso cuando se dividen en bloques adyacentes.

`provider=...` se ignora a menos que `modelOverrides.allowProvider: true`. Cuando una
respuesta declara `provider=...`, las otras claves en esa directiva se analizan
solo por ese proveedor; las claves no admitidas se eliminan y se reportan como advertencias de
directiva de TTS.

**Claves de directiva disponibles:**

- `provider` (id de proveedor registrado; requiere `allowProvider: true`)
- `speakerVoice` / `speakerVoiceId` (alias heredados: `voice`, `voiceName`, `voice_name`, `google_voice`, `voiceId`)
- `model` / `google_model`
- `stability`, `similarityBoost`, `style`, `speed`, `useSpeakerBoost`
- `vol` / `volume` (volumen de MiniMax, 0–10)
- `pitch` (tono entero de MiniMax, −12 a 12; los valores fraccionarios se truncan)
- `emotion` (etiqueta de emoción de Volcengine)
- `applyTextNormalization` (`auto|on|off`)
- `languageCode` (ISO 639-1)
- `seed`

**Desactivar completamente las anulaciones del modelo:**

```json5
{ messages: { tts: { modelOverrides: { enabled: false } } } }
```

**Permitir el cambio de proveedor manteniendo el resto de controles configurables:**

```json5
{ messages: { tts: { modelOverrides: { enabled: true, allowProvider: true, allowSeed: false } } } }
```

## Comandos de barra

Comando único `/tts`. En Discord, OpenClaw también registra `/voice` porque
`/tts` es un comando integrado de Discord: el texto `/tts ...` aún funciona.

```text
/tts off | on | status
/tts chat on | off | default
/tts latest
/tts provider <id>
/tts persona <id> | off
/tts limit <chars>
/tts summary off
/tts audio <text>
```

<Note>Los comandos requieren un remitente autorizado (se aplican las reglas de lista blanca/propietario) y debe estar activado `commands.text` o el registro de comandos nativo.</Note>

Notas sobre el comportamiento:

- `/tts on` escribe la preferencia local de TTS en `always`; `/tts off` la escribe en `off`.
- `/tts chat on|off|default` escribe una anulación de auto-TTS con ámbito de sesión para el chat actual.
- `/tts persona <id>` escribe la preferencia local de persona; `/tts persona off` la borra.
- `/tts latest` lee la última respuesta del asistente de la transcripción de la sesión actual y la envía como audio una sola vez. Almacena solo un hash de esa respuesta en la entrada de sesión para suprimir envíos de voz duplicados.
- `/tts audio` genera una respuesta de audio única (**no** activa el TTS).
- `limit` y `summary` se almacenan en las **preferencias locales**, no en la configuración principal.
- `/tts status` incluye diagnósticos de reserva para el último intento — `Fallback: <primary> -> <used>`, `Attempts: ...` y detalles por intento (`provider:outcome(reasonCode) latency`).
- `/status` muestra el modo TTS activo junto con el proveedor, modelo, voz y metadatos de punto de conexión personalizado saneados cuando el TTS está habilitado.

## Preferencias por usuario

Los comandos de barra escriben anulaciones locales en `prefsPath`. El valor predeterminado es
`~/.openclaw/settings/tts.json`; anule con la variable de entorno `OPENCLAW_TTS_PREFS`
o `messages.tts.prefsPath`.

| Campo almacenado | Efecto                                               |
| ---------------- | ---------------------------------------------------- |
| `auto`           | Anulación local de auto-TTS (`always`, `off`, …)     |
| `provider`       | Anulación local del proveedor principal              |
| `persona`        | Anulación local de persona                           |
| `maxLength`      | Umbral de resumen (predeterminado `1500` caracteres) |
| `summarize`      | Alternancia de resumen (predeterminado `true`)       |

Estos anulan la configuración efectiva de `messages.tts` más el bloque
`agents.list[].tts` activo para ese host.

## Formatos de salida (fijos)

La entrega de voz TTS se basa en la capacidad del canal. Los complementos del canal anuncian
si el TTS estilo voz debe pedir a los proveedores un objetivo `voice-note` nativo o
mantener la síntesis normal `audio-file` y solo marcar la salida compatible para la entrega
por voz.

- **Canales compatibles con notas de voz**: las respuestas de nota de voz prefieren Opus (`opus_48000_64` de ElevenLabs, `opus` de OpenAI).
  - 48kHz / 64kbps es un buen equilibrio para mensajes de voz.
- **Feishu / WhatsApp**: cuando se produce una respuesta de nota de voz como MP3/WebM/WAV/M4A
  u otro archivo de audio probable, el complemento del canal lo transcodifica a Ogg/Opus de 48kHz
  con `ffmpeg` antes de enviar el mensaje de voz nativo. WhatsApp envía
  el resultado a través del payload de Baileys `audio` con `ptt: true` y
  `audio/ogg; codecs=opus`. Si la conversión falla, Feishu recibe el archivo
  original como adjunto; el envío de WhatsApp falla en lugar de publicar un payload PTT
  incompatible.
- **Otros canales**: MP3 (`mp3_44100_128` de ElevenLabs, `mp3` de OpenAI).
  - 44.1kHz / 128kbps es el balance predeterminado para la claridad del habla.
- **MiniMax**: MP3 (modelo `speech-2.8-hd`, frecuencia de muestreo de 32kHz) para adjuntos de audio normales. Para los objetivos de nota de voz anunciados por el canal, OpenClaw transcodifica el MP3 de MiniMax a Opus de 48kHz con `ffmpeg` antes de la entrega cuando el canal anuncia transcodificación.
- **Xiaomi MiMo**: MP3 de forma predeterminada, o WAV cuando está configurado. Para los objetivos de nota de voz anunciados por el canal, OpenClaw transcodifica la salida de Xiaomi a Opus de 48kHz con `ffmpeg` antes de la entrega cuando el canal anuncia transcodificación.
- **CLI local**: utiliza el `outputFormat` configurado. Los objetivos de nota de voz se
  convierten a Ogg/Opus y la salida de telefonía se convierte a PCM mono crudo de 16 kHz
  con `ffmpeg`.
- **Google Gemini**: La API de TTS de Gemini devuelve PCM crudo de 24kHz. OpenClaw lo envuelve como WAV para adjuntos de audio, lo transcodifica a Opus de 48kHz para objetivos de nota de voz y devuelve PCM directamente para Talk/telefonía.
- **Gradium**: WAV para adjuntos de audio, Opus para objetivos de nota de voz y `ulaw_8000` a 8 kHz para telefonía.
- **Inworld**: MP3 para adjuntos de audio normales, `OGG_OPUS` nativo para objetivos de nota de voz y `PCM` crudo a 22050 Hz para Talk/telefonía.
- **xAI**: MP3 por defecto; `responseFormat` puede ser `mp3`, `wav`, `pcm`, `mulaw` o `alaw`. OpenClaw utiliza el endpoint REST TTS por lotes de xAI y devuelve un archivo de audio completo; el WebSocket TTS de transmisión de xAI no es utilizado por esta ruta de proveedor. El formato de nota de voz Opus nativo no es compatible con esta ruta.
- **Microsoft**: utiliza `microsoft.outputFormat` (por defecto `audio-24khz-48kbitrate-mono-mp3`).
  - El transporte incluido acepta un `outputFormat`, pero no todos los formatos están disponibles en el servicio.
  - Los valores de formato de salida siguen los formatos de salida de voz de Microsoft (incluyendo Ogg/WebM Opus).
  - Telegram `sendVoice` acepta OGG/MP3/M4A; use OpenAI/ElevenLabs si necesita
    mensajes de voz Opus garantizados.
  - Si falla el formato de salida de Microsoft configurado, OpenClaw reintentará con MP3.

Los formatos de salida de OpenAI/ElevenLabs son fijos por canal (ver arriba).

## Comportamiento de TTS automática

Cuando `messages.tts.auto` está habilitado, OpenClaw:

- Omite TTS si la respuesta ya contiene medios estructurados.
- Omite respuestas muy cortas (menos de 10 caracteres).
- Resume respuestas largas cuando los resúmenes están habilitados, usando
  `summaryModel` (o `agents.defaults.model.primary`).
- Adjunta el audio generado a la respuesta.
- En `mode: "final"`, aún envía TTS de solo audio para las respuestas finales transmitidas
  después de que se complete la transmisión de texto; los medios generados pasan por la misma
  normalización de medios del canal que los archivos adjuntos de respuestas normales.

Si la respuesta excede `maxLength` y el resumen está desactivado (o no hay clave API para el
modelo de resumen), se omite el audio y se envía la respuesta de texto normal.

```text
Reply -> TTS enabled?
  no  -> send text
  yes -> has media / short?
          yes -> send text
          no  -> length > limit?
                   no  -> TTS -> attach audio
                   yes -> summary enabled?
                            no  -> send text
                            yes -> summarize -> TTS -> attach audio
```

## Formatos de salida por canal

| Destino                               | Formato                                                                                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Feishu / Matrix / Telegram / WhatsApp | Las respuestas de nota de voz prefieren **Opus** (`opus_48000_64` de ElevenLabs, `opus` de OpenAI). 48 kHz / 64 kbps equilibra claridad y tamaño. |
| Otros canales                         | **MP3** (`mp3_44100_128` de ElevenLabs, `mp3` de OpenAI). 44.1 kHz / 128 kbps por defecto para voz.                                               |
| Talk / telefonía                      | **PCM** nativo del proveedor (Inworld 22050 Hz, Google 24 kHz), o `ulaw_8000` de Gradium para telefonía.                                          |

Notas por proveedor:

- **Transcodificación Feishu / WhatsApp:** Cuando una respuesta de nota de voz llega como MP3/WebM/WAV/M4A, el complemento del canal transcodifica a Ogg/Opus a 48 kHz con `ffmpeg`. WhatsApp envía a través de Baileys con `ptt: true` y `audio/ogg; codecs=opus`. Si la conversión falla: Feishu recurre a adjuntar el archivo original; el envío de WhatsApp falla en lugar de publicar una carga PTT incompatible.
- **MiniMax / Xiaomi MiMo:** MP3 predeterminado (32 kHz para MiniMax `speech-2.8-hd`); transcodificado a Opus de 48 kHz para objetivos de nota de voz a través de `ffmpeg`.
- **CLI local:** Utiliza `outputFormat` configurado. Los objetivos de nota de voz se convierten a Ogg/Opus y la salida de telefonía a PCM mono sin procesar de 16 kHz.
- **Google Gemini:** Devuelve PCM sin procesar de 24 kHz. OpenClaw lo envuelve como WAV para adjuntos, transcodifica a Opus de 48 kHz para objetivos de nota de voz, devuelve PCM directamente para Talk/telefonía.
- **Inworld:** Adjuntos MP3, nota de voz nativa `OGG_OPUS`, `PCM` sin procesar a 22050 Hz para Talk/telefonía.
- **xAI:** MP3 de forma predeterminada; `responseFormat` puede ser `mp3|wav|pcm|mulaw|alaw`. Utiliza el endpoint REST por lotes de xAI: no se utiliza TTS de WebSocket en streaming. El formato de nota de voz Opus nativo **no** es compatible.
- **Microsoft:** Utiliza `microsoft.outputFormat` (predeterminado `audio-24khz-48kbitrate-mono-mp3`). Telegram `sendVoice` acepta OGG/MP3/M4A; use OpenAI/ElevenLabs si necesita mensajes de voz Opus garantizados. Si el formato de Microsoft configurado falla, OpenClaw reintentará con MP3.

Los formatos de salida de OpenAI y ElevenLabs son fijos por canal como se indica arriba.

## Referencia de campos

<AccordionGroup>
  <Accordion title="Top-level messages.tts.*">
    <ParamField path="auto" type='"off" | "always" | "inbound" | "tagged"'>
      Modo TTS automático. `inbound` solo envía audio después de un mensaje de voz entrante; `tagged` solo envía audio cuando la respuesta incluye directivas `[[tts:...]]` o un bloque `[[tts:text]]`.
    </ParamField>
    <ParamField path="enabled" type="boolean" deprecated>
      Interruptor heredado. `openclaw doctor --fix` migra esto a `auto`.
    </ParamField>
    <ParamField path="mode" type='"final" | "all"' default="final">
      `"all"` incluye respuestas de herramientas/bloques además de las respuestas finales.
    </ParamField>
    <ParamField path="provider" type="string">
      ID del proveedor de voz. Si no está configurado, OpenClaw usa el primer proveedor configurado en el orden de autoselección del registro. El `provider: "edge"` heredado se reescribe a `"microsoft"` por `openclaw doctor --fix`.
    </ParamField>
    <ParamField path="persona" type="string">
      ID de persona activa de `personas`. Normalizado a minúsculas.
    </ParamField>
    <ParamField path="personas.<id>" type="object">
      Identidad de habla estable. Campos: `label`, `description`, `provider`, `fallbackPolicy`, `prompt`, `providers.<provider>`. Consulte [Personas](#personas).
    </ParamField>
    <ParamField path="summaryModel" type="string">
      Modelo económico para resumen automático; por defecto es `agents.defaults.model.primary`. Acepta `provider/model` o un alias de modelo configurado.
    </ParamField>
    <ParamField path="modelOverrides" type="object">
      Permitir que el modelo emita directivas TTS. `enabled` por defecto es `true`; `allowProvider` por defecto es `false`.
    </ParamField>
    <ParamField path="providers.<id>" type="object">
      Configuración propiedad del proveedor clave por ID del proveedor de voz. Los bloques directos heredados (`messages.tts.openai`, `.elevenlabs`, `.microsoft`, `.edge`) son reescritos por `openclaw doctor --fix`; confirme solo `messages.tts.providers.<id>`.
    </ParamField>
    <ParamField path="maxTextLength" type="number">
      Límite estricto para caracteres de entrada TTS. `/tts audio` falla si se excede.
    </ParamField>
    <ParamField path="timeoutMs" type="number">
      Tiempo de espera de solicitud en milisegundos.
    </ParamField>
    <ParamField path="prefsPath" type="string">
      Anular la ruta JSON de preferencias locales (provider/limit/summary). Por defecto `~/.openclaw/settings/tts.json`.
    </ParamField>
  </Accordion>

<Accordion title="Azure Speech">
  <ParamField path="apiKey" type="string">
    Env: `AZURE_SPEECH_KEY`, `AZURE_SPEECH_API_KEY` o `SPEECH_KEY`.
  </ParamField>
  <ParamField path="region" type="string">
    Región de Azure Speech (p. ej. `eastus`). Env: `AZURE_SPEECH_REGION` o `SPEECH_REGION`.
  </ParamField>
  <ParamField path="endpoint" type="string">
    Invalidación opcional del endpoint de Azure Speech (alias `baseUrl`).
  </ParamField>
  <ParamField path="speakerVoice" type="string">
    Nombre corto (ShortName) de la voz de Azure. Predeterminado `en-US-JennyNeural`. Alias heredado: `voice`.
  </ParamField>
  <ParamField path="lang" type="string">
    Código de idioma SSML. Predeterminado `en-US`.
  </ParamField>
  <ParamField path="outputFormat" type="string">
    `X-Microsoft-OutputFormat` de Azure para audio estándar. Predeterminado `audio-24khz-48kbitrate-mono-mp3`.
  </ParamField>
  <ParamField path="voiceNoteOutputFormat" type="string">
    `X-Microsoft-OutputFormat` de Azure para la salida de notas de voz. Predeterminado `ogg-24khz-16bit-mono-opus`.
  </ParamField>
</Accordion>

<Accordion title="ElevenLabs">
  <ParamField path="apiKey" type="string">
    Recurre a `ELEVENLABS_API_KEY` o `XI_API_KEY`.
  </ParamField>
  <ParamField path="model" type="string">
    ID del modelo (p. ej. `eleven_multilingual_v2`, `eleven_v3`).
  </ParamField>
  <ParamField path="speakerVoiceId" type="string">
    ID de voz de ElevenLabs. Alias heredado: `voiceId`.
  </ParamField>
  <ParamField path="voiceSettings" type="object">
    `stability`, `similarityBoost`, `style` (cada `0..1`), `useSpeakerBoost` (`true|false`), `speed` (`0.5..2.0`, `1.0` = normal).
  </ParamField>
  <ParamField path="applyTextNormalization" type='"auto" | "on" | "off"'>
    Modo de normalización de texto.
  </ParamField>
  <ParamField path="languageCode" type="string">
    2 letras ISO 639-1 (p. ej. `en`, `de`).
  </ParamField>
  <ParamField path="seed" type="number">
    Entero `0..4294967295` para el mejor esfuerzo de determinismo.
  </ParamField>
  <ParamField path="baseUrl" type="string">
    Sobrescribir la URL base de la API de ElevenLabs.
  </ParamField>
</Accordion>

<Accordion title="Google Gemini">
  <ParamField path="apiKey" type="string">
    Recurre a `GEMINI_API_KEY` / `GOOGLE_API_KEY`. Si se omite, TTS puede reutilizar `models.providers.google.apiKey` antes del respaldo del entorno.
  </ParamField>
  <ParamField path="model" type="string">
    Modelo TTS de Gemini. Por defecto `gemini-3.1-flash-tts-preview`.
  </ParamField>
  <ParamField path="speakerVoice" type="string">
    Nombre de voz pregenerada de Gemini. Por defecto `Kore`. Alias heredados: `voiceName`, `voice`.
  </ParamField>
  <ParamField path="audioProfile" type="string">
    Prompt de estilo en lenguaje natural antepuesto antes del texto hablado.
  </ParamField>
  <ParamField path="speakerName" type="string">
    Etiqueta de hablante opcional antepuesta antes del texto hablado cuando tu prompt usa un hablante con nombre.
  </ParamField>
  <ParamField path="promptTemplate" type='"audio-profile-v1"'>
    Establezca en `audio-profile-v1` para envolver los campos de prompt de persona activa en una estructura de prompt TTS de Gemini determinista.
  </ParamField>
  <ParamField path="personaPrompt" type="string">
    Texto de prompt de persona extra específico de Google agregado a las Notas del Director de la plantilla.
  </ParamField>
  <ParamField path="baseUrl" type="string">
    Solo se acepta `https://generativelanguage.googleapis.com`.
  </ParamField>
</Accordion>

<Accordion title="Gradium">
  <ParamField path="apiKey" type="string">
    Entorno: `GRADIUM_API_KEY`.
  </ParamField>
  <ParamField path="baseUrl" type="string">
    Por defecto `https://api.gradium.ai`.
  </ParamField>
  <ParamField path="speakerVoiceId" type="string">
    Por defecto Emma (`YTpq7expH9539ERJ`). Alias heredado: `voiceId`.
  </ParamField>
</Accordion>

  <Accordion title="Inworld">
    ### Inworld principal

    <ParamField path="apiKey" type="string">Entorno: `INWORLD_API_KEY`.</ParamField>
    <ParamField path="baseUrl" type="string">Predeterminado `https://api.inworld.ai`.</ParamField>
    <ParamField path="modelId" type="string">Predeterminado `inworld-tts-1.5-max`. También: `inworld-tts-1.5-mini`, `inworld-tts-1-max`, `inworld-tts-1`.</ParamField>
    <ParamField path="speakerVoiceId" type="string">Predeterminado `Sarah`. Alias heredado: `voiceId`.</ParamField>
    <ParamField path="temperature" type="number">Temperatura de muestreo `0..2`.</ParamField>

  </Accordion>

<Accordion title="CLI local (tts-local-cli)">
  <ParamField path="command" type="string">
    Ejecutable local o cadena de comandos para TTS CLI.
  </ParamField>
  <ParamField path="args" type="string[]">
    Argumentos del comando. Soporta `{{ Text }}`, `{{ OutputPath }}`, `{{ OutputDir }}`, `{{ OutputBase }}` marcadores de posición.
  </ParamField>
  <ParamField path="outputFormat" type='"mp3" | "opus" | "wav"'>
    Formato de salida esperado del CLI. Predeterminado `mp3` para archivos de audio adjuntos.
  </ParamField>
  <ParamField path="timeoutMs" type="number">
    Tiempo de espera del comando en milisegundos. Predeterminado `120000`.
  </ParamField>
  <ParamField path="cwd" type="string">
    Directorio de trabajo opcional para el comando.
  </ParamField>
  <ParamField path="env" type="Record<string, string>">
    Sobrescrituras opcionales de entorno para el comando.
  </ParamField>
</Accordion>

<Accordion title="Microsoft (sin clave de API)">
  <ParamField path="enabled" type="boolean" default="true">
    Permitir el uso de voz de Microsoft.
  </ParamField>
  <ParamField path="speakerVoice" type="string">
    Nombre de la voz neuronal de Microsoft (p. ej. `en-US-MichelleNeural`). Alias heredado: `voice`.
  </ParamField>
  <ParamField path="lang" type="string">
    Código de idioma (p. ej. `en-US`).
  </ParamField>
  <ParamField path="outputFormat" type="string">
    Formato de salida de Microsoft. Valor predeterminado `audio-24khz-48kbitrate-mono-mp3`. No todos los formatos son compatibles con el transporte Edge-back incluido.
  </ParamField>
  <ParamField path="rate / pitch / volume" type="string">
    Cadenas de porcentaje (p. ej. `+10%`, `-5%`).
  </ParamField>
  <ParamField path="saveSubtitles" type="boolean">
    Escribir subtítulos JSON junto al archivo de audio.
  </ParamField>
  <ParamField path="proxy" type="string">
    URL del proxy para las solicitudes de voz de Microsoft.
  </ParamField>
  <ParamField path="timeoutMs" type="number">
    Invalidación del tiempo de espera de la solicitud (ms).
  </ParamField>
  <ParamField path="edge.*" type="object" deprecated>
    Alias heredado. Ejecute `openclaw doctor --fix` para reescribir la configuración persistida a `providers.microsoft`.
  </ParamField>
</Accordion>

<Accordion title="MiniMax">
  <ParamField path="apiKey" type="string">
    Recurre a `MINIMAX_API_KEY`. Autenticación de Token Plan vía `MINIMAX_OAUTH_TOKEN`, `MINIMAX_CODE_PLAN_KEY`, o `MINIMAX_CODING_API_KEY`.
  </ParamField>
  <ParamField path="baseUrl" type="string">
    Predeterminado `https://api.minimax.io`. Entorno: `MINIMAX_API_HOST`.
  </ParamField>
  <ParamField path="model" type="string">
    Predeterminado `speech-2.8-hd`. Entorno: `MINIMAX_TTS_MODEL`.
  </ParamField>
  <ParamField path="speakerVoiceId" type="string">
    Predeterminado `English_expressive_narrator`. Entorno: `MINIMAX_TTS_VOICE_ID`. Alias heredado: `voiceId`.
  </ParamField>
  <ParamField path="speed" type="number">
    `0.5..2.0`. Predeterminado `1.0`.
  </ParamField>
  <ParamField path="vol" type="number">
    `(0, 10]`. Predeterminado `1.0`.
  </ParamField>
  <ParamField path="pitch" type="number">
    Entero `-12..12`. Predeterminado `0`. Los valores fraccionarios se truncan antes de la solicitud.
  </ParamField>
</Accordion>

<Accordion title="OpenAI">
  <ParamField path="apiKey" type="string">
    Recurre a `OPENAI_API_KEY`.
  </ParamField>
  <ParamField path="model" type="string">
    ID del modelo TTS de OpenAI (p. ej. `gpt-4o-mini-tts`).
  </ParamField>
  <ParamField path="speakerVoice" type="string">
    Nombre de la voz (p. ej. `alloy`, `cedar`). Alias heredado: `voice`.
  </ParamField>
  <ParamField path="instructions" type="string">
    Campo OpenAI `instructions` explícito. Cuando se establece, los campos de prompt de persona **no** se asignan automáticamente.
  </ParamField>
  <ParamField path="extraBody / extra_body" type="Record<string, unknown>">
    Campos JSON adicionales fusionados en los cuerpos de las solicitudes `/audio/speech` después de los campos TTS de OpenAI generados. Úselo para endpoints compatibles con OpenAI como Kokoro que requieren claves específicas del proveedor como `lang`; se ignoran las claves de prototipo no seguras.
  </ParamField>
  <ParamField path="baseUrl" type="string">
    Anula el endpoint TTS de OpenAI. Orden de resolución: config → `OPENAI_TTS_BASE_URL` → `https://api.openai.com/v1`. Los valores no predeterminados se tratan como endpoints TTS compatibles con OpenAI, por lo que se aceptan nombres de modelo y voz personalizados.
  </ParamField>
</Accordion>

<Accordion title="OpenRouter">
  <ParamField path="apiKey" type="string">
    Entorno: `OPENROUTER_API_KEY`. Puede reutilizar `models.providers.openrouter.apiKey`.
  </ParamField>
  <ParamField path="baseUrl" type="string">
    Predeterminado `https://openrouter.ai/api/v1`. El `https://openrouter.ai/v1` heredado se normaliza.
  </ParamField>
  <ParamField path="model" type="string">
    Predeterminado `hexgrad/kokoro-82m`. Alias: `modelId`.
  </ParamField>
  <ParamField path="speakerVoice" type="string">
    Predeterminado `af_alloy`. Alias heredados: `voice`, `voiceId`.
  </ParamField>
  <ParamField path="responseFormat" type='"mp3" | "pcm"'>
    Predeterminado `mp3`.
  </ParamField>
  <ParamField path="speed" type="number">
    Sobrescritura de velocidad nativa del proveedor.
  </ParamField>
</Accordion>

<Accordion title="Volcengine (BytePlus Seed Speech)">
  <ParamField path="apiKey" type="string">
    Entorno: `VOLCENGINE_TTS_API_KEY` o `BYTEPLUS_SEED_SPEECH_API_KEY`.
  </ParamField>
  <ParamField path="resourceId" type="string">
    Por defecto `seed-tts-1.0`. Entorno: `VOLCENGINE_TTS_RESOURCE_ID`. Use `seed-tts-2.0` cuando su proyecto tenga derechos de TTS 2.0.
  </ParamField>
  <ParamField path="appKey" type="string">
    Encabezado de clave de aplicación. Por defecto `aGjiRDfUWi`. Entorno: `VOLCENGINE_TTS_APP_KEY`.
  </ParamField>
  <ParamField path="baseUrl" type="string">
    Anular el endpoint HTTP de TTS de Seed Speech. Entorno: `VOLCENGINE_TTS_BASE_URL`.
  </ParamField>
  <ParamField path="speakerVoice" type="string">
    Tipo de voz. Por defecto `en_female_anna_mars_bigtts`. Entorno: `VOLCENGINE_TTS_VOICE`. Alias heredado: `voice`.
  </ParamField>
  <ParamField path="speedRatio" type="number">
    Relación de velocidad nativa del proveedor.
  </ParamField>
  <ParamField path="emotion" type="string">
    Etiqueta de emoción nativa del proveedor.
  </ParamField>
  <ParamField path="appId / token / cluster" type="string" deprecated>
    Campos heredados de la consola de voz de Volcengine. Entorno: `VOLCENGINE_TTS_APPID`, `VOLCENGINE_TTS_TOKEN`, `VOLCENGINE_TTS_CLUSTER` (por defecto `volcano_tts`).
  </ParamField>
</Accordion>

<Accordion title="xAI">
  <ParamField path="apiKey" type="string">
    Env: `XAI_API_KEY`.
  </ParamField>
  <ParamField path="baseUrl" type="string">
    Predeterminado `https://api.x.ai/v1`. Env: `XAI_BASE_URL`.
  </ParamField>
  <ParamField path="speakerVoiceId" type="string">
    Predeterminado `eve`. Voces en vivo: `ara`, `eve`, `leo`, `rex`, `sal`, `una`. Alias heredado: `voiceId`.
  </ParamField>
  <ParamField path="language" type="string">
    Código de idioma BCP-47 o `auto`. Predeterminado `en`.
  </ParamField>
  <ParamField path="responseFormat" type='"mp3" | "wav" | "pcm" | "mulaw" | "alaw"'>
    Predeterminado `mp3`.
  </ParamField>
  <ParamField path="speed" type="number">
    Anulación de velocidad nativa del proveedor.
  </ParamField>
</Accordion>

  <Accordion title="Xiaomi MiMo">
    <ParamField path="apiKey" type="string">Entorno: `XIAOMI_API_KEY`.</ParamField>
    <ParamField path="baseUrl" type="string">Predeterminado `https://api.xiaomimimo.com/v1`. Entorno: `XIAOMI_BASE_URL`.</ParamField>
    <ParamField path="model" type="string">Predeterminado `mimo-v2.5-tts`. Entorno: `XIAOMI_TTS_MODEL`. También admite `mimo-v2-tts` y `mimo-v2.5-tts-voicedesign`.</ParamField>
    <ParamField path="speakerVoice" type="string">Predeterminado `mimo_default` para modelos de voz predefinidos. Entorno: `XIAOMI_TTS_VOICE`. Alias heredado: `voice`. No se envía para `mimo-v2.5-tts-voicedesign`.</ParamField>
    <ParamField path="format" type='"mp3" | "wav"'>Predeterminado `mp3`. Entorno: `XIAOMI_TTS_FORMAT`.</ParamField>
    <ParamField path="style" type="string">Instrucción de estilo en lenguaje natural opcional enviada como mensaje de usuario; no se habla. Para `mimo-v2.5-tts-voicedesign`, este es el mensaje de diseño de voz; OpenClaw proporciona uno predeterminado si se omite.</ParamField>
  </Accordion>
</AccordionGroup>

## Herramienta de agente

La herramienta `tts` convierte texto a voz y devuelve un archivo de audio para
la entrega de respuesta. En Feishu, Matrix, Telegram y WhatsApp, el audio se
entrega como un mensaje de voz en lugar de un archivo adjunto. Feishu y
WhatsApp pueden transcodificar la salida de TTS que no sea Opus en esta ruta cuando `ffmpeg` está
disponible.

WhatsApp envía audio a través de Baileys como una nota de voz PTT (`audio` con
`ptt: true`) y envía texto visible **por separado** del audio PTT porque
los clientes no reproducen consistentemente los subtítulos en las notas de voz.

La herramienta acepta campos opcionales `channel` y `timeoutMs`; `timeoutMs` es un
tiempo de espera de solicitud de proveedor por llamada en milisegundos. Los valores por llamada anul
`messages.tts.timeoutMs`; los tiempos de espera de TTS configurados anulan cualquier valor predeterminado
de proveedor creado por un complemento.

## RPC de puerta de enlace

| Método            | Propósito                                                  |
| ----------------- | ---------------------------------------------------------- |
| `tts.status`      | Leer el estado actual de TTS y el último intento.          |
| `tts.enable`      | Establecer la preferencia de automático local en `always`. |
| `tts.disable`     | Establecer la preferencia de automático local en `off`.    |
| `tts.convert`     | Conversión de texto a audio única.                         |
| `tts.setProvider` | Establecer la preferencia de proveedor local.              |
| `tts.setPersona`  | Establecer la preferencia de persona local.                |
| `tts.providers`   | Enumerar los proveedores configurados y su estado.         |

## Enlaces de servicio

- [Guía de texto a voz de OpenAI](https://platform.openai.com/docs/guides/text-to-speech)
- [Referencia de la API de audio de OpenAI](https://platform.openai.com/docs/api-reference/audio)
- [Texto a voz REST de Azure Speech](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech)
- [Proveedor de Azure Speech](/es/providers/azure-speech)
- [Texto a voz de ElevenLabs](https://elevenlabs.io/docs/api-reference/text-to-speech)
- [Autenticación de ElevenLabs](https://elevenlabs.io/docs/api-reference/authentication)
- [Gradium](/es/providers/gradium)
- [API de TTS de Inworld](https://docs.inworld.ai/tts/tts)
- [API de MiniMax T2A v2](https://platform.minimaxi.com/document/T2A%20V2)
- [API HTTP de TTS de Volcengine](/es/providers/volcengine#text-to-speech)
- [Síntesis de voz de Xiaomi MiMo](/es/providers/xiaomi#text-to-speech)
- [node-edge-tts](https://github.com/SchneeHertz/node-edge-tts)
- [Formatos de salida de voz de Microsoft](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech#audio-outputs)
- [Texto a voz de xAI](https://docs.x.ai/developers/rest-api-reference/inference/voice#text-to-speech-rest)

## Relacionado

- [Información general sobre medios](/es/tools/media-overview)
- [Generación de música](/es/tools/music-generation)
- [Generación de video](/es/tools/video-generation)
- [Comandos de barra](/es/tools/slash-commands)
- [Complemento de llamada de voz](/es/plugins/voice-call)
