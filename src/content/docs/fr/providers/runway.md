---
title: "Runway"
summary: "Configuration de la génération vidéo Runway dans OpenClaw"
read_when:
  - You want to use Runway video generation in OpenClaw
  - You need the Runway API key/env setup
  - You want to make Runway the default video provider
---

# Runway

OpenClaw est fourni avec un provider `runway` pour la génération vidéo hébergée.

- ID du provider : `runway`
- Auth : `RUNWAYML_API_SECRET` (canonique) ou `RUNWAY_API_KEY`
- API : Génération vidéo basée sur les tâches Runway (sondage `GET /v1/tasks/{id}`)

## Quick start

1. Définissez la clé API :

```bash
openclaw onboard --auth-choice runway-api-key
```

2. Définissez Runway comme le provider vidéo par défaut :

```bash
openclaw config set agents.defaults.videoGenerationModel.primary "runway/gen4.5"
```

3. Demandez à l'agent de générer une vidéo. Runway sera utilisé automatiquement.

## Modes pris en charge

| Mode             | Modèle                | Entrée de référence        |
| ---------------- | --------------------- | -------------------------- |
| Texte vers vidéo | `gen4.5` (par défaut) | Aucun                      |
| Image vers vidéo | `gen4.5`              | 1 image locale ou distante |
| Vidéo vers vidéo | `gen4_aleph`          | 1 vidéo locale ou distante |

- Les références d'images et de vidéos locales sont prises en charge via des URI de données.
- Le mode vidéo vers vidéo nécessite actuellement `runway/gen4_aleph` spécifiquement.
- Les exécutions en texte seul exposent actuellement les formats d'aspect `16:9` et `9:16`.

## Configuration

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "runway/gen4.5",
      },
    },
  },
}
```

## Connexes

- [Génération vidéo](/en/tools/video-generation) -- paramètres d'outil partagés, sélection du provider et comportement asynchrone
- [Référence de configuration](/en/gateway/configuration-reference#agent-defaults)
