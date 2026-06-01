---
summary: "Utilisez la synthèse vocale ElevenLabs, la STT Scribe et la transcription en temps réel avec OpenClaw"
read_when:
  - You want ElevenLabs text-to-speech in OpenClaw
  - You want ElevenLabs Scribe speech-to-text for audio attachments
  - You want ElevenLabs realtime transcription for Voice Call or Google Meet
title: "ElevenLabs"
---

OpenClaw utilise ElevenLabs pour la synthèse vocale, la transcription par lot avec Scribe v2, et la STT en continu avec Scribe v2 Realtime.

| Capacité                                         | Surface OpenClaw                                                | Par défaut               |
| ------------------------------------------------ | --------------------------------------------------------------- | ------------------------ |
| Synthèse vocale                                  | `messages.tts` / `talk`                                         | `eleven_multilingual_v2` |
| Transcription de parole en texte par lots        | `tools.media.audio`                                             | `scribe_v2`              |
| Transcription de parole en texte en flux continu | Flux Voice Call ou Google Meet `realtime.transcriptionProvider` | `scribe_v2_realtime`     |

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
          speakerVoiceId: "pMsXgVXv3BLzUgSXRplE",
          modelId: "eleven_multilingual_v2",
        },
      },
    },
  },
}
```

Définissez `modelId` sur `eleven_v3` pour utiliser le TTS ElevenLabs v3. OpenClaw conserve `eleven_multilingual_v2` par défaut pour les installations existantes.

Les canaux vocaux Discord utilisent le point de terminaison de TTS en continu d'ElevenLabs lorsque ElevenLabs est le fournisseur Discord`voice.tts`/`messages.tts`OpenClaw sélectionné. La lecture commence à partir du flux audio renvoyé au lieu d'attendre qu'OpenClaw télécharge et écrive le fichier audio entier. `latencyTier` correspond au paramètre de requête `optimize_streaming_latency`OpenClaw d'ElevenLabs pour les modèles qui l'acceptent ; OpenClaw omet ce paramètre pour `eleven_v3`, qui le rejette.

## Synthèse vocale

Utilisez Scribe v2 pour les pièces jointes audio entrantes et les courts segments vocaux enregistrés :

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

OpenClaw envoie de l'audio multipart à ElevenLabs OpenClaw`/v1/speech-to-text` avec `model_id: "scribe_v2"`. Les indices de langue correspondent à `language_code` lorsqu'ils sont présents.

## STT en continu

Le plugin `elevenlabs` inclus enregistre Scribe v2 Realtime pour la transcription en continu en mode agent pour Voice Call et Google Meet.

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

<Note>Voice Call reçoit les médias Twilio en G.711 u-law à 8 kHz. Le fournisseur temps réel d'ElevenLabs utilise `ulaw_8000` par défaut, ce qui permet de transmettre les trames téléphoniques sans transcodage.</Note>

Pour le mode agent Google Meet, définissez `plugins.entries.google-meet.config.realtime.transcriptionProvider` sur `"elevenlabs"` et configurez le même bloc de fournisseur sous `plugins.entries.google-meet.config.realtime.providers.elevenlabs`.

## Connexes

- [Synthèse vocale](/fr/tools/tts)
- [Google Meet](/fr/plugins/google-meet)
- [Sélection du modèle](/fr/concepts/model-providers)
