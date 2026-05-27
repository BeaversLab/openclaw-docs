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

La parole en direct utilise le contrat de session Talk plutôt que le chemin de l'outil média en une seule fois. Talk dispose de trois modes : `realtime` natif au fournisseur, `stt-tts` local ou en streaming, et `transcription` pour la capture de parole en observation uniquement. Ces modes partagent les catalogues de fournisseurs, les enveloppes d'événements et la sémantique d'annulation avec la téléphonie, les réunions, le navigateur en temps réel et les clients natifs push-to-talk.

## Capacités

<CardGroup cols={2}>
  <Card title="Génération d'images" href="/fr/tools/image-generation" icon="image">
    Créez et modifiez des images à partir de invites textuelles ou d'images de référence via `image_generate`. Asynchrone dans les sessions de chat — s'exécute en arrière-plan et publie le résultat lorsqu'il est prêt.
  </Card>
  <Card title="Génération vidéo" href="/fr/tools/video-generation" icon="video">
    Texte-vers-vidéo, image-vers-vidéo et vidéo-vers-vidéo via `video_generate`. Asynchrone — s'exécute en arrière-plan et publie le résultat lorsqu'il est prêt.
  </Card>
  <Card title="Génération de musique" href="/fr/tools/music-generation" icon="music">
    Générez de la musique ou des pistes audio via `music_generate`. Asynchrone dans les sessions de chat sur le cycle de vie partagé des tâches de génération de médias.
  </Card>
  <Card title="Synthèse vocale" href="/fr/tools/tts" icon="microphone">
    Convertissez les réponses sortantes en audio parlé via l'outil `tts` plus la config `messages.tts`. Synchrone.
  </Card>
  <Card title="Compréhension des médias" href="/fr/nodes/media-understanding" icon="eye">
    Résumez les images, l'audio et la vidéo entrants à l'aide de fournisseurs de modèles capables de vision et de plugins dédiés à la compréhension des médias.
  </Card>
  <Card title="Synthèse vocale" href="/fr/nodes/audio" icon="ear-listen">
    Transcrivez les messages vocaux entrants via des fournisseurs STT par lot ou STT en streaming Voice Call.
  </Card>
</CardGroup>

## Matrice des capacités des fournisseurs

| Fournisseur | Image | Vidéo | Musique | TTS | STT | Voix en temps réel | Compréhension des médias |
| ----------- | :---: | :---: | :-----: | :-: | :-: | :----------------: | :----------------------: |
| Alibaba     |       |   ✓   |         |     |     |                    |                          |
| BytePlus    |       |   ✓   |         |     |     |                    |                          |
| ComfyUI     |   ✓   |   ✓   |    ✓    |     |     |                    |                          |
| DeepInfra   |   ✓   |   ✓   |         |  ✓  |  ✓  |                    |            ✓             |
| Deepgram    |       |       |         |     |  ✓  |         ✓          |                          |
| ElevenLabs  |       |       |         |  ✓  |  ✓  |                    |                          |
| fal         |   ✓   |   ✓   |    ✓    |     |     |                    |                          |
| Google      |   ✓   |   ✓   |    ✓    |  ✓  |     |         ✓          |            ✓             |
| Gradium     |       |       |         |  ✓  |     |                    |                          |
| Local CLI   |       |       |         |  ✓  |     |                    |                          |
| Microsoft   |       |       |         |  ✓  |     |                    |                          |
| MiniMax     |   ✓   |   ✓   |    ✓    |  ✓  |     |                    |                          |
| Mistral     |       |       |         |     |  ✓  |                    |                          |
| OpenAI      |   ✓   |   ✓   |         |  ✓  |  ✓  |         ✓          |            ✓             |
| OpenRouter  |   ✓   |   ✓   |    ✓    |  ✓  |  ✓  |                    |            ✓             |
| Qwen        |       |   ✓   |         |     |     |                    |                          |
| Runway      |       |   ✓   |         |     |     |                    |                          |
| SenseAudio  |       |       |         |     |  ✓  |                    |                          |
| Together    |       |   ✓   |         |     |     |                    |                          |
| Vydra       |   ✓   |   ✓   |         |  ✓  |     |                    |                          |
| xAI         |   ✓   |   ✓   |         |  ✓  |  ✓  |                    |            ✓             |
| Xiaomi MiMo |   ✓   |       |         |  ✓  |     |                    |            ✓             |

<Note>
  La compréhension des médias utilise n'importe quel modèle capable de vision ou d'audio enregistré dans la configuration de votre fournisseur. La matrice ci-dessus répertorie les fournisseurs prenant en charge la compréhension spécialisée des médias ; la plupart des fournisseurs de LLM multimodaux (Anthropic, Google, OpenAI, etc.) peuvent également comprendre les médias entrants lorsqu'ils sont
  configurés en tant que modèle de réponse actif.
</Note>

## Asynchrone vs synchrone

| Capacité        | Mode       | Pourquoi                                                                                                                                         |
| --------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Image           | Asynchrone | Le traitement du provider peut survivre à un tour de chat ; les pièces jointes générées utilisent le chemin de complétion partagé.               |
| Synthèse vocale | Synchrone  | Les réponses des fournisseurs arrivent en quelques secondes ; jointes à l'audio de la réponse.                                                   |
| Vidéo           | Asynchrone | Le traitement du fournisseur prend de 30 s à plusieurs minutes ; les files d'attente lentes peuvent aller jusqu'au délai d'expiration configuré. |
| Musique         | Asynchrone | Même caractéristique de traitement par le fournisseur que pour la vidéo.                                                                         |

Pour les outils asynchrones, OpenClaw soumet la requête au provider, renvoie un identifiant de tâche immédiatement, et suit la tâche dans le registre des tâches. L'agent continue de répondre à d'autres messages pendant l'exécution de la tâche. Lorsque le provider a terminé, OpenClaw réveille l'agent avec les chemins des médias générés afin qu'il puisse informer l'utilisateur et transmettre le résultat via l'outil de message. Si la session du demandeur est inactive et que certains médias générés manquent toujours à la livraison de l'outil de message, OpenClaw envoie une solution de repli directe idempotente contenant uniquement les médias manquants. Les médias déjà livrés via l'outil de message ne sont pas postés à nouveau.

## Speech-to-text et Appel vocal

Deepgram, DeepInfra, ElevenLabs, Mistral, OpenAI, OpenRouter, SenseAudio et xAI peuvent tous transcrire
l'audio entrant via le chemin batch `tools.media.audio` lorsqu'ils sont configurés.
Les plugins de canal qui effectuent un prévol d'une note vocale pour le filtrage par mention ou l'analyse
de commandes marquent la pièce jointe transcrite dans le contexte entrant, afin que la passe
d'analyse des médias partagée réutilise cette transcription au lieu de faire un second
appel STT pour le même audio.

Deepgram, ElevenLabs, Mistral, OpenAI et xAI enregistrent également des providers
STT en flux pour Appel vocal, permettant ainsi de transférer l'audio téléphonique en direct au fournisseur
sélectionné sans attendre un enregistrement complet.

Pour les conversations utilisateur en direct, privilégiez le [mode Talk](/fr/nodes/talk). Les pièces jointes audio groupées restent sur le chemin média ; la diffusion en temps réel du navigateur, le mode push-to-talk natif, la téléphonie et l'audio de réunion doivent utiliser les événements Talk et les catalogues délimités par la session renvoyés par le Gateway.

## Mappings de providers (comment les fournisseurs se répartissent sur les surfaces)

<AccordionGroup>
  <Accordion title="Google">Surfaces d'image, de vidéo, de musique, de TTS groupé, de voix en temps réel backend, et de compréhension média.</Accordion>
  <Accordion title="OpenAI">Surfaces d'image, de vidéo, de TTS groupé, de STT groupé, de STT en flux pour Voice Call, de voix en temps réel backend, et d'intégration en mémoire.</Accordion>
  <Accordion title="DeepInfra">Routage de chat/modèle, génération/édition d'images, texte vers vidéo, TTS groupé, STT groupé, compréhension média d'images, et surfaces d'intégration en mémoire. Les modèles de reranking/classification/détection d'objets natifs DeepInfra ne sont pas enregistrés tant que OpenClaw n'a pas de contrats de provider dédiés pour ces catégories.</Accordion>
  <Accordion title="xAI">Image, vidéo, recherche, exécution de code, TTS groupé, STT groupé, et STT en flux pour Voice Call. La voix en temps réel xAI est une fonctionnalité en amont mais n'est pas enregistrée dans OpenClaw tant que le contrat de voix en temps réel partagé ne peut pas la représenter.</Accordion>
</AccordionGroup>

## Connexes

- [Génération d'images](/fr/tools/image-generation)
- [Génération de vidéos](/fr/tools/video-generation)
- [Génération de musique](/fr/tools/music-generation)
- [Synthèse vocale (Text-to-speech)](/fr/tools/tts)
- [Compréhension média](/fr/nodes/media-understanding)
- [Nœuds audio](/fr/nodes/audio)
- [Mode Talk](/fr/nodes/talk)
