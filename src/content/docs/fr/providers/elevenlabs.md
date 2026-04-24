---
summary: "Utilisez la synthèse vocale ElevenLabs, la STT Scribe et la transcription en temps réel avec OpenClaw"
read_when:
  - You want ElevenLabs text-to-speech in OpenClaw
  - You want ElevenLabs Scribe speech-to-text for audio attachments
  - You want ElevenLabs realtime transcription for Voice Call
title: "ElevenLabs"
---

# ElevenLabs

OpenClaw utilise ElevenLabs pour la synthèse vocale, la STT par lot avec Scribe
v2, et le flux STT pour les appels vocaux avec Scribe v2 Realtime.

| Fonctionnalité      | Surface OpenClaw                               | Par défaut               |
| ------------------- | ---------------------------------------------- | ------------------------ |
| Synthèse vocale     | `messages.tts` / `talk`                        | `eleven_multilingual_v2` |
| STT par lot         | `tools.media.audio`                            | `scribe_v2`              |
| STT en flux continu | Appel vocal `streaming.provider: "elevenlabs"` | `scribe_v2_realtime`     |

## Authentification

Définissez `ELEVENLABS_API_KEY` dans l'environnement. `XI_API_KEY` est également accepté pour
la compatibilité avec les outils existants d'ElevenLabs.

```bash
export ELEVENLABS_API_KEY="..."
```

## Synthèse vocale

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

## Speech-to-text

Utilisez Scribe v2 pour les pièces jointes audio entrantes et les segments vocaux enregistrés courts :

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

OpenClaw envoie de l'audio multipart à ElevenLabs `/v1/speech-to-text` avec
`model_id: "scribe_v2"`. Les indices de langue correspondent à `language_code` lorsqu'ils sont présents.

## STT en flux continu pour les appels vocaux

Le plugin `elevenlabs` inclus enregistre Scribe v2 Realtime pour la transcription
en flux continu des appels vocaux.

| Paramètre               | Chemin de configuration                                                   | Par défaut                                    |
| ----------------------- | ------------------------------------------------------------------------- | --------------------------------------------- |
| Clé API                 | `plugins.entries.voice-call.config.streaming.providers.elevenlabs.apiKey` | Revient à `ELEVENLABS_API_KEY` / `XI_API_KEY` |
| Modèle                  | `...elevenlabs.modelId`                                                   | `scribe_v2_realtime`                          |
| Format audio            | `...elevenlabs.audioFormat`                                               | `ulaw_8000`                                   |
| Taux d'échantillonnage  | `...elevenlabs.sampleRate`                                                | `8000`                                        |
| Stratégie de validation | `...elevenlabs.commitStrategy`                                            | `vad`                                         |
| Langue                  | `...elevenlabs.languageCode`                                              | (non défini)                                  |

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

<Note>L'appel vocal reçoit les médias Twilio en G.711 u-law à 8 kHz. Le fournisseur temps réel d'ElevenLabs est configuré par défaut sur `ulaw_8000`, ce qui permet de transmettre les trames téléphoniques sans transcodage.</Note>
