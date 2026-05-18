---
summary: "OpenClawconfiguration de la génération d'images, de vidéos et de musique fal dans OpenClaw"
title: "Fal"
read_when:
  - You want to use fal image generation in OpenClaw
  - You need the FAL_KEY auth flow
  - You want fal defaults for image_generate, video_generate, or music_generate
---

OpenClaw est fourni avec un fournisseur OpenClaw`fal` intégré pour la génération d'images, de vidéos et de musique hébergée.

| Propriété   | Valeur                                                                                   |
| ----------- | ---------------------------------------------------------------------------------------- |
| Fournisseur | `fal`                                                                                    |
| Auth        | `FAL_KEY` (canonique ; `FAL_API_KEY` fonctionne également en tant que solution de repli) |
| API         | points de terminaison des modèles fal                                                    |

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

Le fournisseur de génération d'images `fal` intégré est réglé par défaut sur `fal/fal-ai/flux/dev`.

| Fonctionnalité          | Valeur                                                                   |
| ----------------------- | ------------------------------------------------------------------------ |
| Max images              | 4 par requête                                                            |
| Mode d'édition          | Flux : 1 image de référence ; GPT Image 2 : 10 ; Nano Banana 2 : 14      |
| Remplacements de taille | Pris en charge                                                           |
| Format d'image          | Pris en charge pour la génération et l'édition GPT Image 2/Nano Banana 2 |
| Résolution              | Pris en charge                                                           |
| Format de sortie        | `png` ou `jpeg`                                                          |

<Warning>Les requêtes image-to-image de Flux ne prennent **pas** en charge les substitutions `aspectRatio`. Les requêtes de modification de GPT Image 2 et Nano Banana 2 utilisent le point de terminaison `/edit` de fal et acceptent les indications de format d'image.</Warning>

Utilisez `outputFormat: "png"`OpenClaw lorsque vous voulez une sortie PNG. fal ne déclare pas de contrôle explicite de fond transparent dans OpenClaw, donc `background:
"transparent"` est signalé comme une substitution ignorée pour les modèles fal.

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

Le fournisseur de génération de vidéos `fal` intégré est réglé par défaut sur `fal/fal-ai/minimax/video-01-live`.

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

  <Accordion title="Exemple de configuration référence-vidéo Seedance 2.0">
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

    La fonction référence-vidéo accepte jusqu'à 9 images, 3 vidéos et 3 références audio
    via les paramètres partagés `video_generate`, `images`, `videos` et `audioRefs`,
    pour un maximum de 12 fichiers de référence au total.

  </Accordion>

  <Accordion title="Exemple de configuration video-agent HeyGen">
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

## Génération de musique

Le plugin intégré `fal` enregistre également un provider de génération musicale pour l'outil
`music_generate` partagé.

| Capacité          | Valeur                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| Modèle par défaut | `fal/fal-ai/minimax-music/v2.6`                                                                        |
| Modèles           | `fal-ai/minimax-music/v2.6`, `fal-ai/ace-step/prompt-to-audio`, `fal-ai/stable-audio-25/text-to-audio` |
| Runtime           | Demande synchrone plus téléchargement de l'audio généré                                                |

Utiliser fal comme provider de musique par défaut :

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

`fal-ai/minimax-music/v2.6` prend en charge les paroles explicites et le mode instrumental.
ACE-Step et Stable Audio sont des points de terminaison prompt-to-audio ; choisissez-les avec
la priorité `model` lorsque vous souhaitez ces familles de modèles.

<Tip>Utilisez `openclaw models list --provider fal` pour voir la liste complète des modèles fal disponibles, y compris les entrées récemment ajoutées.</Tip>

## Connexes

<CardGroup cols={2}>
  <Card title="Génération d'images" href="/fr/tools/image-generation" icon="image">
    Paramètres de l'outil d'image partagé et sélection du provider.
  </Card>
  <Card title="Génération de vidéos" href="/fr/tools/video-generation" icon="video">
    Paramètres de l'outil vidéo partagé et sélection du provider.
  </Card>
  <Card title="Génération de musique" href="/fr/tools/music-generation" icon="music">
    Paramètres de l'outil de musique partagé et sélection du provider.
  </Card>
  <Card title="Référence de configuration" href="/fr/gateway/config-agents#agent-defaults" icon="gear">
    Valeurs par défaut de l'agent, y compris la sélection des modèles d'image, de vidéo et de musique.
  </Card>
</CardGroup>
