---
summary: "SenseAudio reconnaissance vocale par lots pour les notes vocales entrantes"
read_when:
  - You want SenseAudio speech-to-text for audio attachments
  - You need the SenseAudio API key env var or audio config path
title: "SenseAudio"
---

SenseAudio peut transcrire les pièces jointes audio et les notes vocales entrantes via le pipeline partagé `tools.media.audio` d'OpenClaw. OpenClaw envoie de l'audio multiparts au point de terminaison de transcription compatible OpenAI et injecte le texte renvoyé en tant que `{{Transcript}}` plus un bloc `[Audio]`.

| Propriété                                   | Valeur                                           |
| ------------------------------------------- | ------------------------------------------------ |
| ID du fournisseur                           | `senseaudio`                                     |
| Plugin                                      | intégré, `enabledByDefault: true`                |
| Contrat                                     | `mediaUnderstandingProviders` (audio)            |
| Variable d'environnement d'authentification | `SENSEAUDIO_API_KEY`                             |
| Modèle par défaut                           | `senseaudio-asr-pro-1.5-260319`                  |
| URL par défaut                              | `https://api.senseaudio.cn/v1`                   |
| Site Web                                    | [senseaudio.cn](https://senseaudio.cn)           |
| Docs                                        | [senseaudio.cn/docs](https://senseaudio.cn/docs) |

## Getting started

<Steps>
  <Step title="Définissez votre clé API">
    ```bash
    export SENSEAUDIO_API_KEY="..."
    ```
  </Step>
  <Step title="Activez le fournisseur audio">
    ```json5
    {
      tools: {
        media: {
          audio: {
            enabled: true,
            models: [{ provider: "senseaudio", model: "senseaudio-asr-pro-1.5-260319" }],
          },
        },
      },
    }
    ```
  </Step>
  <Step title="Envoyez une note vocale">
    Envoyez un message audio via n'importe quel canal connecté. OpenClaw télécharge l'audio
    vers SenseAudio et utilise la transcription dans le pipeline de réponse.
  </Step>
</Steps>

## Options

| Option     | Chemin                                | Description                         |
| ---------- | ------------------------------------- | ----------------------------------- |
| `model`    | `tools.media.audio.models[].model`    | ID du modèle ASR SenseAudio         |
| `language` | `tools.media.audio.models[].language` | Indication de langue facultative    |
| `prompt`   | `tools.media.audio.prompt`            | Invite de transcription facultative |
| `baseUrl`  | `tools.media.audio.baseUrl` ou modèle | Remplacer la base compatible OpenAI |
| `headers`  | `tools.media.audio.request.headers`   | En-têtes de demande supplémentaires |

<Note>SenseAudio est uniquement un STT par lots dans OpenClaw. La transcription en temps réel des appels vocaux continue d'utiliser des fournisseurs prenant en charge le STT en continu.</Note>

## Connexes

- [Compréhension des médias (audio)](/fr/nodes/audio)
- [Fournisseurs de modèles](/fr/concepts/model-providers)
