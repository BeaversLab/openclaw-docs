---
title: "ComfyUI"
summary: "Configuration de la génération d'image, de vidéo et de musique par workflow ComfyUI dans OpenClaw"
read_when:
  - You want to use local ComfyUI workflows with OpenClaw
  - You want to use Comfy Cloud with image, video, or music workflows
  - You need the bundled comfy plugin config keys
---

# ComfyUI

OpenClaw est fourni avec un plugin `comfy` intégré pour les exécutions ComfyUI basées sur des workflows.

- Fournisseur : `comfy`
- Modèles : `comfy/workflow`
- Surfaces partagées : `image_generate`, `video_generate`, `music_generate`
- Auth : aucun pour ComfyUI local ; `COMFY_API_KEY` ou `COMFY_CLOUD_API_KEY` pour Comfy Cloud
- API : ComfyUI `/prompt` / `/history` / `/view` et Comfy Cloud `/api/*`

## Ce qu'il prend en charge

- Génération d'images à partir d'un JSON de workflow
- Modification d'images avec 1 image de référence téléchargée
- Génération de vidéos à partir d'un JSON de workflow
- Génération de vidéos avec 1 image de référence téléchargée
- Génération de musique ou d'audio via l'outil partagé `music_generate`
- Téléchargement de la sortie depuis un nœud configuré ou tous les nœuds de sortie correspondants

Le plugin intégré est basé sur des workflows, donc OpenClaw n'essaie pas de mapper des contrôles génériques
`size`, `aspectRatio`, `resolution`, `durationSeconds`, ou de style TTS
sur votre graphe.

## Structure de la configuration

Comfy prend en charge les paramètres de connexion de niveau supérieur partagés ainsi que les sections de workflow par capacité :

```json5
{
  models: {
    providers: {
      comfy: {
        mode: "local",
        baseUrl: "http://127.0.0.1:8188",
        image: {
          workflowPath: "./workflows/flux-api.json",
          promptNodeId: "6",
          outputNodeId: "9",
        },
        video: {
          workflowPath: "./workflows/video-api.json",
          promptNodeId: "12",
          outputNodeId: "21",
        },
        music: {
          workflowPath: "./workflows/music-api.json",
          promptNodeId: "3",
          outputNodeId: "18",
        },
      },
    },
  },
}
```

Clés partagées :

- `mode` : `local` ou `cloud`
- `baseUrl` : par défaut `http://127.0.0.1:8188` pour le mode local ou `https://cloud.comfy.org` pour le cloud
- `apiKey` : alternative de clé en ligne optionnelle aux variables d'environnement
- `allowPrivateNetwork` : autoriser un `baseUrl` privé/LAN en mode cloud

Clés par capacité sous `image`, `video` ou `music` :

- `workflow` ou `workflowPath` : requis
- `promptNodeId` : requis
- `promptInputName` : par défaut `text`
- `outputNodeId` : facultatif
- `pollIntervalMs` : facultatif
- `timeoutMs` : facultatif

Les sections image et vidéo prennent également en charge :

- `inputImageNodeId` : requis lorsque vous transmettez une image de référence
- `inputImageInputName` : par défaut `image`

## Rétrocompatibilité

La configuration de premier niveau pour l'image existante fonctionne toujours :

```json5
{
  models: {
    providers: {
      comfy: {
        workflowPath: "./workflows/flux-api.json",
        promptNodeId: "6",
        outputNodeId: "9",
      },
    },
  },
}
```

OpenClaw traite ce format hérité comme la configuration du workflow image.

## Workflows image

Définir le model d'image par défaut :

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "comfy/workflow",
      },
    },
  },
}
```

Exemple d'édition d'image de référence :

```json5
{
  models: {
    providers: {
      comfy: {
        image: {
          workflowPath: "./workflows/edit-api.json",
          promptNodeId: "6",
          inputImageNodeId: "7",
          inputImageInputName: "image",
          outputNodeId: "9",
        },
      },
    },
  },
}
```

## Workflows vidéo

Définir le model vidéo par défaut :

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "comfy/workflow",
      },
    },
  },
}
```

Les workflows vidéo Comfy prennent actuellement en charge le texte-vers-vidéo et l'image-vers-vidéo via
le graphe configuré. OpenClaw ne transmet pas les vidéos d'entrée dans les workflows Comfy.

## Workflows musique

Le plugin inclus enregistre un provider de génération musicale pour les sorties audio
ou musicales définies par le workflow, accessibles via l' `music_generate` partagé :

```text
/tool music_generate prompt="Warm ambient synth loop with soft tape texture"
```

Utilisez la section de configuration `music` pour pointer vers votre fichier JSON de workflow audio et le
nœud de sortie.

## Comfy Cloud

Utilisez `mode: "cloud"` plus l'un des éléments suivants :

- `COMFY_API_KEY`
- `COMFY_CLOUD_API_KEY`
- `models.providers.comfy.apiKey`

Le mode cloud utilise toujours les mêmes sections de workflow `image`, `video` et `music`.

## Tests en direct

Une couverture en direct optionnelle existe pour le plugin inclus :

```bash
OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts
```

Le test en direct ignore les cas image, vidéo ou musique individuels, sauf si la section de workflow
Comfy correspondante est configurée.

## Connexes

- [Génération d'images](/en/tools/image-generation)
- [Génération de vidéos](/en/tools/video-generation)
- [Génération de musique](/en/tools/music-generation)
- [Annuaire des providers](/en/providers/index)
- [Référence de configuration](/en/gateway/configuration-reference#agent-defaults)
