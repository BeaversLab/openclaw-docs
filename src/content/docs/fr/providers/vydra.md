---
summary: "Utilisez l'image, la vidéo et la synthèse vocale de Vydra dans OpenClaw"
read_when:
  - You want Vydra media generation in OpenClaw
  - You need Vydra API key setup guidance
title: "Vydra"
---

# Vydra

Le plugin Vydra inclus ajoute :

- Génération d'images via `vydra/grok-imagine`
- Génération de vidéos via `vydra/veo3` et `vydra/kling`
- Synthèse vocale via la route TTS de Vydra soutenue par ElevenLabs

OpenClaw utilise le même `VYDRA_API_KEY` pour ces trois capacités.

<Warning>
Utilisez `https://www.vydra.ai/api/v1` comme URL de base.

L'hôte apex de Vydra (`https://vydra.ai/api/v1`) redirige actuellement vers `www`. Certains clients HTTP abandonnent `Authorization` lors de cette redirection inter-hôtes, ce qui transforme une clé API valide en une erreur d'authentification trompeuse. Le plugin inclus utilise l'URL de base `www` directement pour éviter cela.

</Warning>

## Configuration

<Steps>
  <Step title="Exécuter l'intégration interactive">
    ```bash
    openclaw onboard --auth-choice vydra-api-key
    ```

    Ou définissez la env var directement :

    ```bash
    export VYDRA_API_KEY="vydra_live_..."
    ```

  </Step>
  <Step title="Choisir une capacité par défaut">
    Choisissez une ou plusieurs des capacités ci-dessous (image, vidéo ou parole) et appliquez la configuration correspondante.
  </Step>
</Steps>

## Capacités

<AccordionGroup>
  <Accordion title="Génération d'images">
    Modèle d'image par défaut :

    - `vydra/grok-imagine`

    Définir-le comme fournisseur d'images par défaut :

    ```json5
    {
      agents: {
        defaults: {
          imageGenerationModel: {
            primary: "vydra/grok-imagine",
          },
        },
      },
    }
    ```

    La prise en charge groupée actuelle est limitée au texte vers image. Les routes d'édition hébergées de Vydra attendent des URL d'images distantes, et OpenClaw n'ajoute pas encore de pont de téléchargement spécifique à Vydra dans le plugin inclus.

    <Note>
    Voir [Génération d'images](/en/tools/image-generation) pour les paramètres d'outil partagés, la sélection du fournisseur et le comportement de basculement.
    </Note>

  </Accordion>

  <Accordion title="Génération vidéo">
    Modèles vidéo enregistrés :

    - `vydra/veo3` pour texte-vers-vidéo
    - `vydra/kling` pour image-vers-vidéo

    Définir Vydra comme le provider vidéo par défaut :

    ```json5
    {
      agents: {
        defaults: {
          videoGenerationModel: {
            primary: "vydra/veo3",
          },
        },
      },
    }
    ```

    Notes :

    - `vydra/veo3` est fourni uniquement pour texte-vers-vidéo.
    - `vydra/kling` nécessite actuellement une référence d'URL d'image distante. Les téléchargements de fichiers locaux sont rejetés dès le départ.
    - La route HTTP `kling` actuelle de Vydra a été incohérente quant à savoir si elle nécessite `image_url` ou `video_url` ; le provider fourni mappe la même URL d'image distante dans les deux champs.
    - Le plugin fourni reste conservateur et ne transmet pas les boutons de style non documentés tels que le rapport d'aspect, la résolution, le filigrane ou l'audio généré.

    <Note>
    Voir [Génération vidéo](/en/tools/video-generation) pour les paramètres d'outil partagés, la sélection de provider et le comportement de basculement.
    </Note>

  </Accordion>

  <Accordion title="Tests en direct vidéo">
    Couverture en direct spécifique au provider :

    ```bash
    OPENCLAW_LIVE_TEST=1 \
    OPENCLAW_LIVE_VYDRA_VIDEO=1 \
    pnpm test:live -- extensions/vydra/vydra.live.test.ts
    ```

    Le fichier live Vydra fourni couvre désormais :

    - `vydra/veo3` texte-vers-vidéo
    - `vydra/kling` image-vers-vidéo en utilisant une URL d'image distante

    Remplacez le fixture d'image distante si nécessaire :

    ```bash
    export OPENCLAW_LIVE_VYDRA_KLING_IMAGE_URL="https://example.com/reference.png"
    ```

  </Accordion>

  <Accordion title="Synthèse vocale">
    Définir Vydra comme le provider de synthèse vocale :

    ```json5
    {
      messages: {
        tts: {
          provider: "vydra",
          providers: {
            vydra: {
              apiKey: "${VYDRA_API_KEY}",
              voiceId: "21m00Tcm4TlvDq8ikWAM",
            },
          },
        },
      },
    }
    ```

    Valeurs par défaut :

    - Modèle : `elevenlabs/tts`
    - ID de voix : `21m00Tcm4TlvDq8ikWAM`

    Le plugin fourni expose actuellement une voix par défaut fiable et renvoie des fichiers audio MP3.

  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Répertoire de providers" href="/en/providers/index" icon="list">
    Parcourez tous les providers disponibles.
  </Card>
  <Card title="Génération d'images" href="/en/tools/image-generation" icon="image">
    Paramètres de l'outil d'image partagés et sélection du fournisseur.
  </Card>
  <Card title="Génération de vidéos" href="/en/tools/video-generation" icon="video">
    Paramètres de l'outil vidéo partagés et sélection du fournisseur.
  </Card>
  <Card title="Référence de configuration" href="/en/gateway/configuration-reference#agent-defaults" icon="gear">
    Valeurs par défaut de l'agent et configuration du modèle.
  </Card>
</CardGroup>
