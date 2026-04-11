---
summary: "Utilisez l'image, la vidéo et la synthèse vocale de Vydra dans OpenClaw"
read_when:
  - You want Vydra media generation in OpenClaw
  - You need Vydra API key setup guidance
title: "Vydra"
---

# Vydra

Le plugin Vydra inclus ajoute :

- génération d'images via `vydra/grok-imagine`
- génération de vidéo via `vydra/veo3` et `vydra/kling`
- la synthèse vocale via la route TTS de Vydra propulsée par ElevenLabs

OpenClaw utilise le même `VYDRA_API_KEY` pour ces trois capacités.

## URL de base importante

Utilisez `https://www.vydra.ai/api/v1`.

L'hôte apex de Vydra (`https://vydra.ai/api/v1`) redirige actuellement vers `www`. Certains clients HTTP abandonnent `Authorization` lors de cette redirection inter-hôtes, ce qui transforme une clé API valide en une erreur d'authentification trompeuse. Le plugin inclus utilise l'URL de base `www` directement pour éviter cela.

## Configuration

Onboarding interactif :

```bash
openclaw onboard --auth-choice vydra-api-key
```

Ou définissez directement la env var :

```bash
export VYDRA_API_KEY="vydra_live_..."
```

## Génération d'images

Modèle d'image par défaut :

- `vydra/grok-imagine`

Définissez-le comme le provider d'images par défaut :

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

La prise en charge incluse actuelle se limite à la conversion texte en image. Les routes d'édition hébergées de Vydra attendent des URL d'images distantes, et OpenClaw n'ajoute pas encore de pont de téléchargement spécifique à Vydra dans le plugin inclus.

Voir [Génération d'images](/en/tools/image-generation) pour le comportement partagé de l'outil.

## Génération de vidéos

Modèles vidéo enregistrés :

- `vydra/veo3` pour texte-vers-vidéo
- `vydra/kling` pour image-vers-vidéo

Définissez Vydra comme le provider vidéo par défaut :

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

- `vydra/veo3` est fourni uniquement pour le texte-vers-vidéo.
- `vydra/kling` nécessite actuellement une référence d'URL d'image distante. Les téléchargements de fichiers locaux sont rejetés dès le départ.
- La route HTTP `kling` actuelle de Vydra a été incohérente quant à la nécessité de `image_url` ou `video_url` ; le fournisseur inclus mappe la même URL d'image distante dans les deux champs.
- Le plugin inclus reste conservateur et ne transmet pas les paramètres de style non documentés tels que le format d'image, la résolution, le filigrane ou l'audio généré.

Couverture en direct spécifique au fournisseur :

```bash
OPENCLAW_LIVE_TEST=1 \
OPENCLAW_LIVE_VYDRA_VIDEO=1 \
pnpm test:live -- extensions/vydra/vydra.live.test.ts
```

Le fichier live Vydra inclus couvre désormais :

- `vydra/veo3` texte-vers-vidéo
- `vydra/kling` image-vers-vidéo en utilisant une URL d'image distante

Remplacez l'fixture d'image distante si nécessaire :

```bash
export OPENCLAW_LIVE_VYDRA_KLING_IMAGE_URL="https://example.com/reference.png"
```

Voir [Génération de vidéo](/en/tools/video-generation) pour le comportement partagé de l'outil.

## Synthèse vocale

Définissez Vydra comme fournisseur de synthèse vocale :

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

- modèle : `elevenlabs/tts`
- id de voix : `21m00Tcm4TlvDq8ikWAM`

Le plugin inclus expose actuellement une voix par défaut connue comme fonctionnelle et renvoie des fichiers audio MP3.

## Connexes

- [Annuaire des fournisseurs](/en/providers/index)
- [Génération d'images](/en/tools/image-generation)
- [Génération de vidéos](/en/tools/video-generation)
