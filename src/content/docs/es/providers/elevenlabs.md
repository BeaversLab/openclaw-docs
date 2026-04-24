---
summary: "Usa el habla de ElevenLabs, STT de Scribe y transcripción en tiempo real con OpenClaw"
read_when:
  - You want ElevenLabs text-to-speech in OpenClaw
  - You want ElevenLabs Scribe speech-to-text for audio attachments
  - You want ElevenLabs realtime transcription for Voice Call
title: "ElevenLabs"
---

# ElevenLabs

OpenClaw usa ElevenLabs para texto a voz, conversión de voz a texto por lotes con Scribe
v2, y STT de streaming para Voice Call con Scribe v2 Realtime.

| Capacidad                              | Superficie de OpenClaw                        | Por defecto              |
| -------------------------------------- | --------------------------------------------- | ------------------------ |
| Texto a voz                            | `messages.tts` / `talk`                       | `eleven_multilingual_v2` |
| Conversión de voz a texto por lotes    | `tools.media.audio`                           | `scribe_v2`              |
| Conversión de voz a texto en streaming | Voice Call `streaming.provider: "elevenlabs"` | `scribe_v2_realtime`     |

## Autenticación

Establezca `ELEVENLABS_API_KEY` en el entorno. También se acepta `XI_API_KEY`
para compatibilidad con las herramientas existentes de ElevenLabs.

```bash
export ELEVENLABS_API_KEY="..."
```

## Texto a voz

```json5
{
  messages: {
    tts: {
      providers: {
        elevenlabs: {
          apiKey: "${ELEVENLABS_API_KEY}",
          voiceId: "pMsXgVXv3BLzUgSXRplE",
          modelId: "eleven_multilingual_v2",
        },
      },
    },
  },
}
```

## Voz a texto

Use Scribe v2 para archivos de audio entrantes y segmentos de voz cortos grabados:

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "elevenlabs", model: "scribe_v2" }],
      },
    },
  },
}
```

OpenClaw envía audio multiparte a ElevenLabs `/v1/speech-to-text` con
`model_id: "scribe_v2"`. Las sugerencias de idioma se asignan a `language_code` cuando están presentes.

## STT de streaming Voice Call

El complemento `elevenlabs` incluido registra Scribe v2 Realtime para la transcripción
en streaming de Voice Call.

| Configuración              | Ruta de configuración                                                     | Por defecto                                   |
| -------------------------- | ------------------------------------------------------------------------- | --------------------------------------------- |
| Clave API                  | `plugins.entries.voice-call.config.streaming.providers.elevenlabs.apiKey` | Recurre a `ELEVENLABS_API_KEY` / `XI_API_KEY` |
| Modelo                     | `...elevenlabs.modelId`                                                   | `scribe_v2_realtime`                          |
| Formato de audio           | `...elevenlabs.audioFormat`                                               | `ulaw_8000`                                   |
| Frecuencia de muestreo     | `...elevenlabs.sampleRate`                                                | `8000`                                        |
| Estrategia de confirmación | `...elevenlabs.commitStrategy`                                            | `vad`                                         |
| Idioma                     | `...elevenlabs.languageCode`                                              | (sin establecer)                              |

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          streaming: {
            enabled: true,
            provider: "elevenlabs",
            providers: {
              elevenlabs: {
                apiKey: "${ELEVENLABS_API_KEY}",
                audioFormat: "ulaw_8000",
                commitStrategy: "vad",
                languageCode: "en",
              },
            },
          },
        },
      },
    },
  },
}
```

<Note>Voice Call recibe medios de Twilio como G.711 u-law de 8 kHz. El proveedor en tiempo eal de ElevenLabs usa por defecto `ulaw_8000`, por lo que los marcos de telefonía pueden reenviarse sin transcodificación.</Note>
