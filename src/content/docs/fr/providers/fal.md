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

| Fonctionnalité          | Valeur                                                                   |
| ----------------------- | ------------------------------------------------------------------------ |
| Max images              | 4 par requête                                                            |
| Mode d'édition          | Flux : 1 image de référence ; GPT Image 2 : 10 ; Nano Banana 2 : 14      |
| Remplacements de taille | Pris en charge                                                           |
| Format d'image          | Pris en charge pour la génération et l'édition GPT Image 2/Nano Banana 2 |
| Résolution              | Pris en charge                                                           |
| Format de sortie        | `png` ou `jpeg`                                                          |

<Warning>Les demandes image-à-image de Flux ne prennent **pas** en charge les remplacements `aspectRatio`. Les demandes d'édition GPT Image 2 et Nano Banana 2 utilisent le point de terminaison `/edit` de fal et acceptent les indices de format d'image.</Warning>

Utilisez `outputFormat: "png"` lorsque vous voulez une sortie PNG. fal ne déclare pas de
contrôle explicite de l'arrière-plan transparent dans OpenClaw, donc `background:
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

Le provider `fal` de génération vidéo inclus par défaut utilise
`fal/fal-ai/minimax/video-01-live` par défaut.

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

  <Accordion title="Exemple de config référence-vers-vidéo Seedance 2.0">
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

    Le mode référence-vers-vidéo accepte jusqu'à 9 images, 3 vidéos et 3 références audio

via les paramètres partagés `video_generate` `images`, `videos` et `audioRefs`,
avec un maximum de 12 fichiers de référence au total.

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

<Tip>Utilisez `openclaw models list --provider fal` pour voir la liste complète des modèles fal disponibles, y compris les entrées récemment ajoutées.</Tip>

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
