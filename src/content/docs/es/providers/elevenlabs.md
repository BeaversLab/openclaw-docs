---
summary: "Usa el habla de ElevenLabs, STT de Scribe y transcripción en tiempo real con OpenClaw"
read_when:
  - You want ElevenLabs text-to-speech in OpenClaw
  - You want ElevenLabs Scribe speech-to-text for audio attachments
  - You want ElevenLabs realtime transcription for Voice Call or Google Meet
title: "ElevenLabs"
---

OpenClaw utiliza ElevenLabs para conversión de texto a voz, conversión de voz a texto por lotes con Scribe v2 y STT en streaming con Scribe v2 Realtime.

| Capacidad                                | Superficie de OpenClaw                                                 | Predeterminado           |
| ---------------------------------------- | ---------------------------------------------------------------------- | ------------------------ |
| Conversión de texto a voz                | `messages.tts` / `talk`                                                | `eleven_multilingual_v2` |
| Conversión de voz a texto por lotes      | `tools.media.audio`                                                    | `scribe_v2`              |
| Conversión de voz a texto en transmisión | Streaming de Voice Call o Google Meet `realtime.transcriptionProvider` | `scribe_v2_realtime`     |

## Autenticación

Establezca `ELEVENLABS_API_KEY` en el entorno. También se acepta `XI_API_KEY` para
compatibilidad con las herramientas existentes de ElevenLabs.

```bash
export ELEVENLABS_API_KEY="..."
```

## Conversión de texto a voz

```json5
{
  messages: {
    tts: {
      providers: {
        elevenlabs: {
          apiKey: "${ELEVENLABS_API_KEY}",
          speakerVoiceId: "pMsXgVXv3BLzUgSXRplE",
          modelId: "eleven_multilingual_v2",
        },
      },
    },
  },
}
```

Establezca `modelId` en `eleven_v3` para usar ElevenLabs v3 TTS. OpenClaw mantiene
`eleven_multilingual_v2` como el valor predeterminado para las instalaciones existentes.

Los canales de voz de Discord utilizan el endpoint de TTS en streaming de ElevenLabs cuando ElevenLabs es el proveedor `voice.tts`/`messages.tts` seleccionado. La reproducción comienza desde el flujo de audio devuelto en lugar de esperar a que OpenClaw descargue y escriba el archivo de audio completo. `latencyTier` se asigna al parámetro de consulta `optimize_streaming_latency` de ElevenLabs para los modelos que lo aceptan; OpenClaw omite ese parámetro para `eleven_v3`, que lo rechaza.

## Conversión de voz a texto

Use Scribe v2 para archivos de audio entrantes y segmentos cortos de voz grabados:

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

OpenClaw envía audio multiparte a ElevenLabs `/v1/speech-to-text` con `model_id: "scribe_v2"`. Las sugerencias de idioma se asignan a `language_code` cuando están presentes.

## STT en streaming

El plugin `elevenlabs` incluido registra Scribe v2 Realtime para la transcripción en streaming en modo agente para Voice Call y Google Meet.

| Configuración              | Ruta de configuración                                                     | Por defecto                                   |
| -------------------------- | ------------------------------------------------------------------------- | --------------------------------------------- |
| Clave de API               | `plugins.entries.voice-call.config.streaming.providers.elevenlabs.apiKey` | Recurre a `ELEVENLABS_API_KEY` / `XI_API_KEY` |
| Modelo                     | `...elevenlabs.modelId`                                                   | `scribe_v2_realtime`                          |
| Formato de audio           | `...elevenlabs.audioFormat`                                               | `ulaw_8000`                                   |
| Tasa de muestreo           | `...elevenlabs.sampleRate`                                                | `8000`                                        |
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

<Note>Voice Call recibe los medios de Twilio como 8 kHz G.711 u-law. El proveedor en tiempo real de ElevenLabs utiliza por defecto `ulaw_8000`, por lo que las tramas de telefonía pueden reenviarse sin transcodificación.</Note>

Para el modo agente de Google Meet, configure
`plugins.entries.google-meet.config.realtime.transcriptionProvider` como
`"elevenlabs"` y configure el mismo bloque de proveedor en
`plugins.entries.google-meet.config.realtime.providers.elevenlabs`.

## Relacionado

- [Conversión de texto a voz](/es/tools/tts)
- [Google Meet](/es/plugins/google-meet)
- [Selección de modelo](/es/concepts/model-providers)
