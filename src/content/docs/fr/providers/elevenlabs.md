---
summary: "Utilisez la synthèse vocale ElevenLabs, la STT Scribe et la transcription en temps réel avec OpenClaw"
read_when:
  - You want ElevenLabs text-to-speech in OpenClaw
  - You want ElevenLabs Scribe speech-to-text for audio attachments
  - You want ElevenLabs realtime transcription for Voice Call
title: "ElevenLabs"
---

OpenClaw utilise ElevenLabs pour la synthèse vocale, la transcription de parole en texte par lots avec Scribe v2, et la transcription en flux STT pour les appels vocaux avec Scribe v2 Realtime.

| Capacité                                         | Surface OpenClaw                               | Par défaut               |
| ------------------------------------------------ | ---------------------------------------------- | ------------------------ |
| Synthèse vocale                                  | `messages.tts` / `talk`                        | `eleven_multilingual_v2` |
| Transcription de parole en texte par lots        | `tools.media.audio`                            | `scribe_v2`              |
| Transcription de parole en texte en flux continu | Appel vocal `streaming.provider: "elevenlabs"` | `scribe_v2_realtime`     |

## Authentification

Définissez `ELEVENLABS_API_KEY` dans l'environnement. `XI_API_KEY` est également accepté pour la compatibilité avec les outils ElevenLabs existants.

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

Définissez `modelId` sur `eleven_v3` pour utiliser le TTS ElevenLabs v3. OpenClaw conserve `eleven_multilingual_v2` par défaut pour les installations existantes.

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

OpenClaw envoie de l'audio multipartie à ElevenLabs `/v1/speech-to-text` avec `model_id: "scribe_v2"`. Les indices de langue correspondent à `language_code` lorsqu'ils sont présents.

## STT en flux continu pour les appels vocaux

Le plugin `elevenlabs` inclus enregistre Scribe v2 Realtime pour la transcription en flux des appels vocaux.

| Paramètre               | Chemin de configuration                                                   | Par défaut                                    |
| ----------------------- | ------------------------------------------------------------------------- | --------------------------------------------- |
| Clé API                 | `plugins.entries.voice-call.config.streaming.providers.elevenlabs.apiKey` | Revenir à `ELEVENLABS_API_KEY` / `XI_API_KEY` |
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

<Note>Voice Call reçoit les médias Twilio en G.711 u-law à 8 kHz. Le provider temps réel ElevenLabs est par défaut `ulaw_8000`, les trames téléphoniques peuvent donc être transmises sans transcodage.</Note>

## Connexes

- [Synthèse vocale](/fr/tools/tts)
- [Sélection du modèle](/fr/concepts/model-providers)
