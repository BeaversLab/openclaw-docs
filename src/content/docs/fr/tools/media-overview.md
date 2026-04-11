---
summary: "Page d'atterrissage unifiée pour la génération de médias, la compréhension et les capacités vocales"
read_when:
  - Looking for an overview of media capabilities
  - Deciding which media provider to configure
  - Understanding how async media generation works
title: "Aperçu des médias"
---

# Génération et compréhension de médias

OpenClaw génère des images, des vidéos et de la musique, comprend les médias entrants (images, audio, vidéo) et prononce les réponses à haute voix via la synthèse vocale. Toutes les capacités médias sont pilotées par des outils : l'agent décide quand les utiliser en fonction de la conversation, et chaque outil n'apparaît que si au moins un fournisseur sous-jacent est configuré.

## Capacités en un coup d'œil

| Capacité                 | Outil            | Fournisseurs                                                                                 | Ce qu'il fait                                                              |
| ------------------------ | ---------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Génération d'images      | `image_generate` | ComfyUI, fal, Google, MiniMax, OpenAI, Vydra                                                 | Crée ou modifie des images à partir de invites textuelles ou de références |
| Génération de vidéo      | `video_generate` | Alibaba, BytePlus, ComfyUI, fal, Google, MiniMax, OpenAI, Qwen, Runway, Together, Vydra, xAI | Crée des vidéos à partir de texte, d'images ou de vidéos existantes        |
| Génération de musique    | `music_generate` | ComfyUI, Google, MiniMax                                                                     | Crée de la musique ou des pistes audio à partir d'invites textuelles       |
| Synthèse vocale (TTS)    | `tts`            | ElevenLabs, Microsoft, MiniMax, OpenAI                                                       | Convertit les réponses sortantes en audio vocal                            |
| Compréhension des médias | (automatique)    | Tout fournisseur de modèles capable de vision/audio, plus les replis CLI                     | Résume les images, l'audio et les vidéos entrants                          |

## Matrice des capacités des fournisseurs

Ce tableau montre quels fournisseurs prennent en charge quelles capacités média sur la plateforme.

| Fournisseur | Image | Vidéo | Musique | TTS | STT / Transcription | Compréhension des médias |
| ----------- | ----- | ----- | ------- | --- | ------------------- | ------------------------ |
| Alibaba     |       | Oui   |         |     |                     |                          |
| BytePlus    |       | Oui   |         |     |                     |                          |
| ComfyUI     | Oui   | Oui   | Oui     |     |                     |                          |
| Deepgram    |       |       |         |     | Oui                 |                          |
| ElevenLabs  |       |       |         | Oui |                     |                          |
| fal         | Oui   | Oui   |         |     |                     |                          |
| Google      | Oui   | Oui   | Oui     |     |                     | Oui                      |
| Microsoft   |       |       |         | Oui |                     |                          |
| MiniMax     | Oui   | Oui   | Oui     | Oui |                     |                          |
| OpenAI      | Oui   | Oui   |         | Oui | Oui                 | Oui                      |
| Qwen        |       | Oui   |         |     |                     |                          |
| Runway      |       | Oui   |         |     |                     |                          |
| Together    |       | Oui   |         |     |                     |                          |
| Vydra       | Oui   | Oui   |         |     |                     |                          |
| xAI         |       | Oui   |         |     |                     |                          |

<Note>
  La compréhension des médias utilise tout modèle compatible avec la vision ou l'audio enregistré dans votre configuration de fournisseur. Le tableau ci-dessus met en évidence les fournisseurs avec un support dédié à la compréhension des médias ; la plupart des fournisseurs de LLM avec des modèles multimodaux (Anthropic, Google, OpenAI, etc.) peuvent également comprendre les médias entrants
  lorsqu'ils sont configurés comme modèle de réponse actif.
</Note>

## Fonctionnement de la génération asynchrone

La génération de vidéo et de musique s'exécute en tant que tâches d'arrière-plan car le traitement du fournisseur prend généralement de 30 secondes à plusieurs minutes. Lorsque l'agent appelle `video_generate` ou `music_generate`, OpenClaw soumet la requête au fournisseur, renvoie un ID de tâche immédiatement et suit la tâche dans le registre des tâches. L'agent continue de répondre aux autres messages pendant que la tâche s'exécute. Lorsque le fournisseur a terminé, OpenClaw réveille l'agent afin qu'il puisse publier le média terminé dans le canal d'origine. La génération d'images et la synthèse vocale sont synchrones et s'effectuent en ligne avec la réponse.

## Liens rapides

- [Génération d'images](/en/tools/image-generation) -- générer et éditer des images
- [Génération de vidéo](/en/tools/video-generation) -- texte vers vidéo, image vers vidéo et vidéo vers vidéo
- [Génération de musique](/en/tools/music-generation) -- création de musique et de pistes audio
- [Synthèse vocale](/en/tools/tts) -- conversion des réponses en audio parlé
- [Compréhension des médias](/en/nodes/media-understanding) -- compréhension des images, de l'audio et de la vidéo entrants
