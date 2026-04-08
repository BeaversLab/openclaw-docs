---
summary: "Utiliser les images, vidéos et synthèse vocale Vydra dans OpenClaw"
read_when:
  - You want Vydra media generation in OpenClaw
  - You need Vydra API key setup guidance
title: "Vydra"
---

# Vydra

Le plugin Vydra inclus ajoute :

- la génération d'images via `vydra/grok-imagine`
- la génération de vidéos via `vydra/veo3` et `vydra/kling`
- la synthèse vocale via la route TTS de Vydra propulsée par ElevenLabs

OpenClaw utilise le même `VYDRA_API_KEY` pour ces trois capacités.

## URL de base importante

Utilisez `https://www.vydra.ai/api/v1`.

L'hôte apex de Vydra (`https://vydra.ai/api/v1`) redirige actuellement vers `www`. Certains clients HTTP suppriment `Authorization` lors de cette redirection inter-hôtes, ce qui transforme une clé API valide en un échec d'authentification trompeur. Le plugin inclus utilise directement l'URL de base `www` pour éviter cela.

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

Voir [Génération d'images](/en/tools/image-generation) pour le comportement partagé des tools.

## Génération de vidéos

Modèles vidéo enregistrés :

- `vydra/veo3` pour la conversion texte en vidéo
- `vydra/kling` pour la conversion image en vidéo

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

- `vydra/veo3` est inclus uniquement pour la conversion texte en vidéo.
- `vydra/kling` nécessite actuellement une référence d'URL d'image distante. Les téléchargements de fichiers locaux sont rejetés dès le départ.
- Le plugin inclus reste prudent et ne transmet pas les commandes de style non documentées telles que le rapport d'aspect, la résolution, le filigrane ou l'audio généré.

Voir [Génération de vidéos](/en/tools/video-generation) pour le comportement partagé des tools.

## Synthèse vocale

Définissez Vydra comme le provider de synthèse vocale :

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

- model : `elevenlabs/tts`
- voice id : `21m00Tcm4TlvDq8ikWAM`

Le plugin inclus expose actuellement une voix par défaut connue pour fonctionner et renvoie des fichiers audio MP3.

## Connexes

- [Répertoire des fournisseurs](/en/providers/index)
- [Génération d'images](/en/tools/image-generation)
- [Génération de vidéos](/en/tools/video-generation)
