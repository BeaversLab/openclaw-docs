---
summary: "Aperçu des capacités d'image, de vidéo, de musique, de synthèse vocale et de compréhension des médias"
read_when:
  - Looking for an overview of OpenClaw's media capabilities
  - Deciding which media provider to configure
  - Understanding how async media generation works
title: "Aperçu des médias"
sidebarTitle: "Aperçu des médias"
---

OpenClaw génère des images, des vidéos et de la musique, comprend les médias entrants
(images, audio, vidéo) et lit les réponses à voix haute via la synthèse vocale. Toutes
les capacités média sont pilotées par des tools : l'agent décide quand les utiliser en fonction
de la conversation, et chaque tool n'apparaît que si au moins un provider
principal est configuré.

## Capacités

<CardGroup cols={2}>
  <Card title="Génération d'images" href="/fr/tools/image-generation" icon="image">
    Créez et modifiez des images à partir de invites textuelles ou d'images de référence via `image_generate`. Synchrone — se termine en ligne avec la réponse.
  </Card>
  <Card title="Génération vidéo" href="/fr/tools/video-generation" icon="video">
    Texte vers vidéo, image vers vidéo et vidéo vers vidéo via `video_generate`. Asynchrone — s'exécute en arrière-plan et publie le résultat lorsqu'il est prêt.
  </Card>
  <Card title="Génération de musique" href="/fr/tools/music-generation" icon="music">
    Générez de la musique ou des pistes audio via `music_generate`. Asynchrone sur les providers partagés ; le chemin de workflow ComfyUI s'exécute de manière synchrone.
  </Card>
  <Card title="Synthèse vocale" href="/fr/tools/tts" icon="microphone">
    Convertissez les réponses sortantes en audio parlé via le tool `tts` plus la config `messages.tts`. Synchrone.
  </Card>
  <Card title="Compréhension des médias" href="/fr/nodes/media-understanding" icon="eye">
    Résumer les images, audio et vidéo entrants à l'aide de providers de modèles dotés de capacités de vision et de plugins dédiés à la compréhension des médias.
  </Card>
  <Card title="Speech-to-text" href="/fr/nodes/audio" icon="ear-listen">
    Transcrire les messages vocaux entrants via des providers STT par lots ou des providers STT en flux pour Voice Call.
  </Card>
</CardGroup>

## Matrice des capacités des providers

| Provider    | Image | Vidéo | Musique | TTS | STT | Voix en temps réel | Compréhension des médias |
| ----------- | :---: | :---: | :-----: | :-: | :-: | :----------------: | :----------------------: |
| Alibaba     |       |   ✓   |         |     |     |                    |                          |
| BytePlus    |       |   ✓   |         |     |     |                    |                          |
| ComfyUI     |   ✓   |   ✓   |    ✓    |     |     |                    |                          |
| Deepgram    |       |       |         |     |  ✓  |         ✓          |                          |
| ElevenLabs  |       |       |         |  ✓  |  ✓  |                    |                          |
| fal         |   ✓   |   ✓   |         |     |     |                    |                          |
| Google      |   ✓   |   ✓   |    ✓    |  ✓  |     |         ✓          |            ✓             |
| Gradium     |       |       |         |  ✓  |     |                    |                          |
| Local CLI   |       |       |         |  ✓  |     |                    |                          |
| Microsoft   |       |       |         |  ✓  |     |                    |                          |
| MiniMax     |   ✓   |   ✓   |    ✓    |  ✓  |     |                    |                          |
| Mistral     |       |       |         |     |  ✓  |                    |                          |
| OpenAI      |   ✓   |   ✓   |         |  ✓  |  ✓  |         ✓          |            ✓             |
| Qwen        |       |   ✓   |         |     |     |                    |                          |
| Runway      |       |   ✓   |         |     |     |                    |                          |
| SenseAudio  |       |       |         |     |  ✓  |                    |                          |
| Together    |       |   ✓   |         |     |     |                    |                          |
| Vydra       |   ✓   |   ✓   |         |  ✓  |     |                    |                          |
| xAI         |   ✓   |   ✓   |         |  ✓  |  ✓  |                    |            ✓             |
| Xiaomi MiMo |   ✓   |       |         |  ✓  |     |                    |            ✓             |

<Note>
  La compréhension des médias utilise n'importe quel modèle capable de vision ou d'audio enregistré dans votre configuration de provider. La matrice ci-dessus répertorie les providers avec un support dédié à la compréhension des médias ; la plupart des providers LLM multimodaux (Anthropic, Google, OpenAI, etc.) peuvent également comprendre les médias entrants lorsqu'ils sont configurés en tant que
  modèle de réponse actif.
</Note>

## Asynchrone vs synchrone

| Capacité          | Mode       | Pourquoi                                                                                          |
| ----------------- | ---------- | ------------------------------------------------------------------------------------------------- |
| Image             | Synchrone  | Les réponses des providers reviennent en quelques secondes ; se termine en ligne avec la réponse. |
| Synthèse vocale   | Synchrone  | Les réponses des providers reviennent en quelques secondes ; attachées à l'audio de la réponse.   |
| Vidéo             | Asynchrone | Le traitement du provider prend de 30 s à plusieurs minutes.                                      |
| Musique (partagé) | Asynchrone | Même caractéristique de traitement du provider que pour la vidéo.                                 |
| Musique (ComfyUI) | Synchrone  | Le workflow local s'exécute en ligne par rapport au serveur ComfyUI configuré.                    |

Pour les outils asynchrones, OpenClaw soumet la demande au provider, renvoie un ID de tâche immédiatement et suit le travail dans le registre des tâches. L'agent continue de répondre aux autres messages pendant l'exécution du travail. Lorsque le provider a terminé, OpenClaw réveille l'agent afin qu'il puisse publier le média terminé dans le channel d'origine.

## Speech-to-text et Voice Call

Deepgram, ElevenLabs, Mistral, OpenAI, SenseAudio et xAI peuvent tous transcrire l'audio entrant via le chemin de traitement par lot `tools.media.audio` lorsque configurés. Les plugins de channel qui effectuent un contrôle préalable sur une note vocale pour le filtrage par mention ou l'analyse de commandes marquent la pièce jointe transcrite dans le contexte entrant, afin que le passage partagé de compréhension des médias réutilise cette transcription au lieu de faire un second appel STT pour le même audio.

Deepgram, ElevenLabs, Mistral, OpenAI et xAI enregistrent également des providers STT en flux continu pour Voice Call, ce qui permet de transmettre l'audio téléphonique en direct au fournisseur sélectionné sans attendre un enregistrement complet.

## Mappings de providers (comment les fournisseurs se répartissent sur les surfaces)

<AccordionGroup>
  <Accordion title="Google">Surfaces d'image, vidéo, musique, TTS par lot, voix en temps réel backend et compréhension des médias.</Accordion>
  <Accordion title="OpenAI">Surfaces d'image, vidéo, TTS par lot, STT par lot, STT en flux continu Voice Call, voix en temps réel backend et intégration en mémoire.</Accordion>
  <Accordion title="xAI">Image, vidéo, recherche, exécution de code, TTS par lot, STT par lot et STT en flux continu Voice Call. La voix en temps réel xAI est une capacité en amont, mais n'est pas enregistrée dans OpenClaw tant que le contrat partagé de voix en temps réel ne peut pas la représenter.</Accordion>
</AccordionGroup>

## Connexes

- [Génération d'images](/fr/tools/image-generation)
- [Génération de vidéos](/fr/tools/video-generation)
- [Génération de musique](/fr/tools/music-generation)
- [Synthèse vocale](/fr/tools/tts)
- [Compréhension des médias](/fr/nodes/media-understanding)
- [Nœuds audio](/fr/nodes/audio)
