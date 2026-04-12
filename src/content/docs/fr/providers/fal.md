---
title: "fal"
summary: "configuration de la génération d'images et de vidéos fal dans OpenClaw"
read_when:
  - You want to use fal image generation in OpenClaw
  - You need the FAL_KEY auth flow
  - You want fal defaults for image_generate or video_generate
---

# fal

OpenClaw est fourni avec un fournisseur `fal` intégré pour la génération d'images et de vidéos hébergée.

- Fournisseur : `fal`
- Auth : `FAL_KEY` (canonique ; `FAL_API_KEY` fonctionne également comme solution de repli)
- API : points de terminaison des modèles fal

## Quick start

1. Définir la clé API :

```bash
openclaw onboard --auth-choice fal-api-key
```

2. Définir un modèle d'image par défaut :

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "fal/fal-ai/flux/dev",
      },
    },
  },
}
```

## Génération d'images

Le fournisseur de génération d'images `fal` intégré est défini par défaut sur
`fal/fal-ai/flux/dev`.

- Générer : jusqu'à 4 images par requête
- Mode édition : activé, 1 image de référence
- Prend en charge `size`, `aspectRatio` et `resolution`
- Mise en garde actuelle pour l'édition : le point de terminaison d'édition d'image fal ne prend **pas** en charge
  les substitutions `aspectRatio`

Pour utiliser fal comme provider d'images par défaut :

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "fal/fal-ai/flux/dev",
      },
    },
  },
}
```

## Génération de vidéos

Le fournisseur de génération de vidéos `fal` intégré est défini par défaut sur
`fal/fal-ai/minimax/video-01-live`.

- Modes : flux texte vers vidéo et référence à image unique
- Runtime : flux de soumission/statut/résultat avec file d'attente pour les tâches de longue durée
- Référence du modèle video-agent HeyGen :
  - `fal/fal-ai/heygen/v2/video-agent`
- Références des modèles Seedance 2.0 :
  - `fal/bytedance/seedance-2.0/fast/text-to-video`
  - `fal/bytedance/seedance-2.0/fast/image-to-video`
  - `fal/bytedance/seedance-2.0/text-to-video`
  - `fal/bytedance/seedance-2.0/image-to-video`

Pour utiliser Seedance 2.0 comme modèle vidéo par défaut :

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "fal/bytedance/seedance-2.0/fast/text-to-video",
      },
    },
  },
}
```

Pour utiliser HeyGen video-agent comme modèle vidéo par défaut :

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "fal/fal-ai/heygen/v2/video-agent",
      },
    },
  },
}
```

## Connexes

- [Génération d'images](/en/tools/image-generation)
- [Génération de vidéos](/en/tools/video-generation)
- [Référence de configuration](/en/gateway/configuration-reference#agent-defaults)
