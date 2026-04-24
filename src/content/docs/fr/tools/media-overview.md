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
| Génération d'images      | `image_generate` | ComfyUI, fal, Google, MiniMax, OpenAI, Vydra, xAI                                            | Crée ou modifie des images à partir de invites textuelles ou de références |
| Génération de vidéo      | `video_generate` | Alibaba, BytePlus, ComfyUI, fal, Google, MiniMax, OpenAI, Qwen, Runway, Together, Vydra, xAI | Crée des vidéos à partir de texte, d'images ou de vidéos existantes        |
| Génération de musique    | `music_generate` | ComfyUI, Google, MiniMax                                                                     | Crée de la musique ou des pistes audio à partir d'invites textuelles       |
| Synthèse vocale (TTS)    | `tts`            | ElevenLabs, Microsoft, MiniMax, OpenAI, xAI                                                  | Convertit les réponses sortantes en audio vocal                            |
| Compréhension des médias | (automatique)    | Tout fournisseur de modèles capable de vision/audio, plus les replis CLI                     | Résume les images, l'audio et les vidéos entrants                          |

## Matrice des capacités des fournisseurs

Ce tableau montre quels fournisseurs prennent en charge quelles capacités média sur la plateforme.

| Fournisseur | Image | Vidéo | Musique | TTS | STT / Transcription | Compréhension des médias |
| ----------- | ----- | ----- | ------- | --- | ------------------- | ------------------------ |
| Alibaba     |       | Oui   |         |     |                     |                          |
| BytePlus    |       | Oui   |         |     |                     |                          |
| ComfyUI     | Oui   | Oui   | Oui     |     |                     |                          |
| Deepgram    |       |       |         |     | Oui                 |                          |
| ElevenLabs  |       |       |         | Oui | Oui                 |                          |
| fal         | Oui   | Oui   |         |     |                     |                          |
| Google      | Oui   | Oui   | Oui     |     |                     | Oui                      |
| Microsoft   |       |       |         | Oui |                     |                          |
| MiniMax     | Oui   | Oui   | Oui     | Oui |                     |                          |
| Mistral     |       |       |         |     | Oui                 |                          |
| OpenAI      | Oui   | Oui   |         | Oui | Oui                 | Oui                      |
| Qwen        |       | Oui   |         |     |                     |                          |
| Runway      |       | Oui   |         |     |                     |                          |
| Together    |       | Oui   |         |     |                     |                          |
| Vydra       | Oui   | Oui   |         |     |                     |                          |
| xAI         | Oui   | Oui   |         | Oui | Oui                 | Oui                      |

<Note>
  La compréhension des médias utilise tout modèle compatible avec la vision ou l'audio enregistré dans votre configuration de fournisseur. Le tableau ci-dessus met en évidence les fournisseurs avec un support dédié à la compréhension des médias ; la plupart des fournisseurs de LLM avec des modèles multimodaux (Anthropic, Google, OpenAI, etc.) peuvent également comprendre les médias entrants
  lorsqu'ils sont configurés comme modèle de réponse actif.
</Note>

## Fonctionnement de la génération asynchrone

La génération de vidéo et de musique s'exécute en tant que tâches d'arrière-plan car le traitement du fournisseur prend généralement entre 30 secondes et plusieurs minutes. Lorsque l'agent appelle `video_generate` ou `music_generate`, OpenClaw soumet la demande au fournisseur, renvoie immédiatement un ID de tâche et suit le travail dans le registre des tâches. L'agent continue de répondre à d'autres messages pendant que le travail s'exécute. Lorsque le fournisseur a terminé, OpenClaw réveille l'agent afin qu'il puisse publier le média terminé dans le canal d'origine. La génération d'images et la synthèse vocale (TTS) sont synchrones et s'effectuent en ligne avec la réponse.

Deepgram, ElevenLabs, Mistral, OpenAI et xAI peuvent tous transcrire l'audio entrant
via le chemin de traitement par lots `tools.media.audio` lorsqu'ils sont configurés. Deepgram,
ElevenLabs, Mistral, OpenAI et xAI enregistrent également des fournisseurs STT
en continu pour les appels vocaux, ce qui permet de transférer l'audio téléphonique en direct
au fournisseur sélectionné sans attendre un enregistrement complet.

OpenAI correspond aux surfaces d'image, de vidéo, de TTS par lots, de STT par lots, de STT en continu pour les appels vocaux, de voix en temps réel et d'incorporation de mémoire de OpenClaw. xAI correspond actuellement
aux surfaces d'image, de vidéo, de recherche, d'exécution de code, de TTS par lots, de STT par lots,
et de STT en continu pour les appels vocaux de OpenClaw. La voix en temps réel xAI est une fonctionnalité en amont,
mais elle n'est pas enregistrée dans OpenClaw tant que le contrat de voix en temps réel partagé ne peut pas la représenter.

## Liens rapides

- [Génération d'images](/fr/tools/image-generation) -- générer et modifier des images
- [Génération de vidéo](/fr/tools/video-generation) -- texte vers vidéo, image vers vidéo et vidéo vers vidéo
- [Génération de musique](/fr/tools/music-generation) -- créer de la musique et des pistes audio
- [Synthèse vocale](/fr/tools/tts) -- conversion des réponses en audio parlé
- [Compréhension des médias](/fr/nodes/media-understanding) -- compréhension des images, de l'audio et de la vidéo entrants
