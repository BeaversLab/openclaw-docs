---
summary: "OpenClawconfiguration de la génération d'image, de vidéo et de musique fal dans OpenClaw"
title: "Fal"
read_when:
  - You want to use fal image generation in OpenClaw
  - You need the FAL_KEY auth flow
  - You want fal defaults for image_generate, video_generate, or music_generate
---

OpenClaw fournit un fournisseur OpenClaw`fal` intégré pour la génération d'images, de vidéos et de musique hébergée.

| Propriété   | Valeur                                                                               |
| ----------- | ------------------------------------------------------------------------------------ |
| Fournisseur | `fal`                                                                                |
| Auth        | `FAL_KEY` (canonique ; `FAL_API_KEY` fonctionne également comme solution de secours) |
| API         | points de terminaison des modèles fal                                                |

## Getting started

<Steps>
  <Step title="APIDéfinir la clé API">
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

Le fournisseur de génération d'images `fal` intégré est configuré par défaut sur `fal/fal-ai/flux/dev`.

| Fonctionnalité          | Valeur                                                                  |
| ----------------------- | ----------------------------------------------------------------------- |
| Max images              | 4 par requête ; Krea 2 : 1 par requête                                  |
| Mode d'édition          | Flux : 1 image de référence ; GPT Image 2 : 10 ; Nano Banana 2 : 14     |
| Références de style     | Krea 2 : jusqu'à 10 références de style via `image` / `images`          |
| Remplacements de taille | Pris en charge                                                          |
| Ratio d'aspect          | Pris en charge pour generate, Krea 2, et GPT Image 2/Nano Banana 2 edit |
| Résolution              | Pris en charge                                                          |
| Format de sortie        | `png` ou `jpeg`                                                         |

<Warning>
  Les requêtes image-à-image de Flux ne prennent **pas** en charge les remplacements `aspectRatio`. Les requêtes d'édition de GPT Image 2 et Nano Banana 2 utilisent le point de terminaison `/edit` de fal et acceptent les indicateurs de ratio d'aspect. Nano Banana 2 accepte également les ratios larges/hauts supplémentaires tels que `4:1`, `1:4`, `8:1` et `1:8` ; Krea 2 valide son propre
  sous-ensemble plus restreint de ratios d'aspect.
</Warning>

Les modèles Krea 2 utilisent le schéma de charge utile Krea natif de fal. OpenClaw envoie OpenClaw`aspect_ratio`, `creativity` et `image_style_references` au lieu de la charge utile générique `image_size` / du point de terminaison d'édition utilisée par Flux. Les références de modèle sont :

- `fal/krea/v2/medium/text-to-image`
- `fal/krea/v2/large/text-to-image`

Utilisez Medium pour des illustrations expressives plus rapides, de l'anime, de la peinture et des styles artistiques. Utilisez Large pour des looks photoréalistes plus lents, des textures brutes, du grain de film et des détails. Krea est par défaut sur `fal.creativity: "medium"` ; les valeurs prises en charge sont `raw`, `low`, `medium` et `high`.

Krea 2 expose le format d'image (aspect ratio), et non `image_size`, dans le schéma de requête de fal. Préférez `aspectRatio` ; OpenClaw mappe `size` au format d'image Krea pris en charge le plus proche et rejette `resolution` pour Krea plutôt que de l'ignorer.

Utilisez `outputFormat: "png"` lorsque vous souhaitez une sortie PNG des modèles fal qui exposent `output_format`. fal ne déclare pas de contrôle explicite de fond transparent dans OpenClaw, donc `background: "transparent"` est signalé comme une substitution ignorée pour les modèles fal.
Les points de terminaison Krea 2 n'exposent pas de champ de requête `output_format` via fal, donc OpenClaw rejette les substitutions `outputFormat` pour les requêtes Krea.

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

Pour utiliser Krea 2 Medium :

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "fal/krea/v2/medium/text-to-image",
      },
    },
  },
}
```

## Génération vidéo

Le fournisseur de génération vidéo `fal` inclus par défaut est `fal/fal-ai/minimax/video-01-live`.

| Capacité          | Valeur                                                                                |
| ----------------- | ------------------------------------------------------------------------------------- |
| Modes             | Texte vers vidéo, référence image unique, référence Seedance vers vidéo               |
| Durée d'exécution | Flux de soumission/statut/routage avec file d'attente pour les tâches de longue durée |

<AccordionGroup>
  <Accordion title="Modèles vidéo disponibles">
    **HeyGen video-agent:**

    - `fal/fal-ai/heygen/v2/video-agent`

    **Seedance 2.0:**

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

## Music generation

Le plugin `fal` inclus enregistre également un provider de génération musicale pour l'outil partagé `music_generate`.

| Capability    | Value                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| Default model | `fal/fal-ai/minimax-music/v2.6`                                                                        |
| Models        | `fal-ai/minimax-music/v2.6`, `fal-ai/ace-step/prompt-to-audio`, `fal-ai/stable-audio-25/text-to-audio` |
| Runtime       | Synchronous request plus generated audio download                                                      |

Use fal as the default music provider:

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "fal/fal-ai/minimax-music/v2.6",
      },
    },
  },
}
```

`fal-ai/minimax-music/v2.6` supports explicit lyrics and instrumental mode.
ACE-Step and Stable Audio are prompt-to-audio endpoints; choose them with the
`model` override when you want those model families.

<Tip>Use `openclaw models list --provider fal` to see the full list of available fal models, including any recently added entries.</Tip>

## Related

<CardGroup cols={2}>
  <Card title="Image generation" href="/fr/tools/image-generation" icon="image">
    Shared image tool parameters and provider selection.
  </Card>
  <Card title="Video generation" href="/fr/tools/video-generation" icon="video">
    Shared video tool parameters and provider selection.
  </Card>
  <Card title="Music generation" href="/fr/tools/music-generation" icon="music">
    Shared music tool parameters and provider selection.
  </Card>
  <Card title="Référence de configuration" href="/fr/gateway/config-agents#agent-defaults" icon="gear">
    Valeurs par défaut de l'agent, y compris la sélection de modèles d'image, de vidéo et de musique.
  </Card>
</CardGroup>
