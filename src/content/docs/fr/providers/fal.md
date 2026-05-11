---
summary: "configuration de la génération d'images et de vidéos fal dans OpenClaw"
title: "Fal"
read_when:
  - You want to use fal image generation in OpenClaw
  - You need the FAL_KEY auth flow
  - You want fal defaults for image_generate or video_generate
---

OpenClaw est fourni avec un fournisseur `fal` intégré pour la génération d'images et de vidéos hébergée.

| Propriété   | Valeur                                                              |
| ----------- | ------------------------------------------------------------------- |
| Fournisseur | `fal`                                                               |
| Auth        | `FAL_KEY` (canonique ; `FAL_API_KEY` fonctionne également en repli) |
| API         | points de terminaison des modèles fal                               |

## Getting started

<Steps>
  <Step title="Définir la clé API">
    ```bash
    openclaw onboard --auth-choice fal-api-key
    ```
  </Step>
  <Step title="Définir un modèle d'image par défaut">
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
| Format de sortie        | `png` ou `jpeg`              |

<Warning>Le point de terminaison de modification d'image fal ne prend **pas** en charge les remplacements `aspectRatio`.</Warning>

Utilisez `outputFormat: "png"` lorsque vous voulez une sortie PNG. fal ne déclare pas de contrôle explicite de fond transparent dans OpenClaw, donc `background:
"transparent"` est signalé comme un remplacement ignoré pour les modèles fal.

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

## Génération vidéo

Le fournisseur de génération vidéo `fal` intégré est défini par défaut sur
`fal/fal-ai/minimax/video-01-live`.

| Capacité | Valeur                                                                       |
| -------- | ---------------------------------------------------------------------------- |
| Modes    | Texte vers vidéo, référence à image unique, référence Seedance vers vidéo    |
| Runtime  | Flux de soumission/statut/rultat avec file d'attente pour les tâches longues |

<AccordionGroup>
  <Accordion title="Modèles vidéo disponibles">
    **HeyGen video-agent :**

    - `fal/fal-ai/heygen/v2/video-agent`

    **Seedance 2.0 :**

    - `fal/bytedance/seedance-2.0/fast/text-to-video`
    - `fal/bytedance/seedance-2.0/fast/image-to-video`
    - `fal/bytedance/seedance-2.0/fast/reference-to-video`
    - `fal/bytedance/seedance-2.0/text-to-video`
    - `fal/bytedance/seedance-2.0/image-to-video`
    - `fal/bytedance/seedance-2.0/reference-to-video`

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

  <Accordion title="Seedance 2.0 reference-to-video config example">
    ```json5
    {
      agents: {
        defaults: {
          videoGenerationModel: {
            primary: "fal/bytedance/seedance-2.0/fast/reference-to-video",
          },
        },
      },
    }
    ```

    Reference-to-video accepts up to 9 images, 3 videos, and 3 audio references
    through the shared `video_generate` `images`, `videos`, and `audioRefs`
    parameters, with at most 12 total reference files.

  </Accordion>

  <Accordion title="HeyGen video-agent config example">
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

<Tip>Use `openclaw models list --provider fal` to see the full list of available fal models, including any recently added entries.</Tip>

## Related

<CardGroup cols={2}>
  <Card title="Image generation" href="/fr/tools/image-generation" icon="image">
    Shared image tool parameters and provider selection.
  </Card>
  <Card title="Video generation" href="/fr/tools/video-generation" icon="video">
    Shared video tool parameters and provider selection.
  </Card>
  <Card title="Configuration reference" href="/fr/gateway/config-agents#agent-defaults" icon="gear">
    Agent defaults including image and video model selection.
  </Card>
</CardGroup>
