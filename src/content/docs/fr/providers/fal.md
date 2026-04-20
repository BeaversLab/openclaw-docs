---
title: "fal"
summary: "configuration de la génération d'images et de vidéos fal dans OpenClaw"
read_when:
  - You want to use fal image generation in OpenClaw
  - You need the FAL_KEY auth flow
  - You want fal defaults for image_generate or video_generate
---

# fal

OpenClaw est livré avec un fournisseur `fal` intégré pour la génération d'images et de vidéos hébergées.

| Propriété   | Valeur                                                                               |
| ----------- | ------------------------------------------------------------------------------------ |
| Fournisseur | `fal`                                                                                |
| Auth        | `FAL_KEY` (canonique ; `FAL_API_KEY` fonctionne également comme solution de secours) |
| API         | points de terminaison du modèle fal                                                  |

## Getting started

<Steps>
  <Step title="Set the API key">
    ```bash
    openclaw onboard --auth-choice fal-api-key
    ```
  </Step>
  <Step title="Set a default image model">
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
  </Step>
</Steps>

## Génération d'images

Le fournisseur de génération d'images `fal` intégré est défini par défaut sur
`fal/fal-ai/flux/dev`.

| Fonctionnalité          | Valeur                       |
| ----------------------- | ---------------------------- |
| Max images              | 4 par requête                |
| Mode d'édition          | Activé, 1 image de référence |
| Remplacements de taille | Pris en charge               |
| Format d'image          | Pris en charge               |
| Résolution              | Pris en charge               |

<Warning>Le point de terminaison d'édition d'images fal ne prend **pas** en charge les remplacements `aspectRatio`.</Warning>

Pour utiliser fal comme fournisseur d'images par défaut :

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

| Fonctionnalité | Valeur                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------ |
| Modes          | Texte vers vidéo, référence à image unique                                                 |
| Runtime        | Flux de soumission/statut/résultat géré par file d'attente pour les tâches de longue durée |

<AccordionGroup>
  <Accordion title="Modèles vidéo disponibles">
    **HeyGen video-agent :**

    - `fal/fal-ai/heygen/v2/video-agent`

    **Seedance 2.0 :**

    - `fal/bytedance/seedance-2.0/fast/text-to-video`
    - `fal/bytedance/seedance-2.0/fast/image-to-video`
    - `fal/bytedance/seedance-2.0/text-to-video`
    - `fal/bytedance/seedance-2.0/image-to-video`

  </Accordion>

  <Accordion title="Exemple de configuration Seedance 2.0">
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
  </Accordion>

  <Accordion title="Exemple de configuration HeyGen video-agent">
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
  </Accordion>
</AccordionGroup>

<Tip>Utilisez `openclaw models list --provider fal` pour voir la liste complète des modèles fal disponibles, y compris les entrées récemment ajoutées.</Tip>

## Connexes

<CardGroup cols={2}>
  <Card title="Génération d'images" href="/fr/tools/image-generation" icon="image">
    Paramètres de l'outil d'image partagés et sélection du fournisseur.
  </Card>
  <Card title="Génération vidéo" href="/fr/tools/video-generation" icon="video">
    Paramètres partagés de l'outil vidéo et sélection du provider.
  </Card>
  <Card title="Référence de configuration" href="/fr/gateway/configuration-reference#agent-defaults" icon="gear">
    Valeurs par défaut de l'agent, y compris la sélection de model d'image et de vidéo.
  </Card>
</CardGroup>
