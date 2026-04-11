---
summary: "Générer et modifier des images à l'aide de fournisseurs configurés (OpenAI, Google Gemini, fal, MiniMax, ComfyUI, Vydra)"
read_when:
  - Generating images via the agent
  - Configuring image generation providers and models
  - Understanding the image_generate tool parameters
title: "Génération d'images"
---

# Génération d'images

L'outil `image_generate` permet à l'agent de créer et de modifier des images en utilisant vos providers configurés. Les images générées sont délivrées automatiquement en tant que pièces jointes médias dans la réponse de l'agent.

<Note>L'outil n'apparaît que lorsqu'au moins un provider de génération d'images est disponible. Si vous ne voyez pas `image_generate` dans les outils de votre agent, configurez `agents.defaults.imageGenerationModel` ou configurez une clé API de provider.</Note>

## Quick start

1. Définissez une clé API pour au moins un provider (par exemple `OPENAI_API_KEY` ou `GEMINI_API_KEY`).
2. Définissez facultativement votre modèle préféré :

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "openai/gpt-image-1",
      },
    },
  },
}
```

3. Demandez à l'agent : _"Générer une image d'une mascotte homard sympathique."_

L'agent appelle `image_generate` automatiquement. Aucune liste blanche d'outils n'est nécessaire — il est activé par défaut lorsqu'un provider est disponible.

## Providers pris en charge

| Provider | Modèle par défaut                | Prise en charge de l'édition                 | Clé API                                                |
| -------- | -------------------------------- | -------------------------------------------- | ------------------------------------------------------ |
| OpenAI   | `gpt-image-1`                    | Oui (jusqu'à 5 images)                       | `OPENAI_API_KEY`                                       |
| Google   | `gemini-3.1-flash-image-preview` | Oui                                          | `GEMINI_API_KEY` ou `GOOGLE_API_KEY`                   |
| fal      | `fal-ai/flux/dev`                | Oui                                          | `FAL_KEY`                                              |
| MiniMax  | `image-01`                       | Oui (référence du sujet)                     | `MINIMAX_API_KEY` ou MiniMax OAuth (`minimax-portal`)  |
| ComfyUI  | `workflow`                       | Oui (1 image, configuré par flux de travail) | `COMFY_API_KEY` ou `COMFY_CLOUD_API_KEY` pour le cloud |
| Vydra    | `grok-imagine`                   | Non                                          | `VYDRA_API_KEY`                                        |

Utilisez `action: "list"` pour inspecter les fournisseurs et les modèles disponibles lors de l'exécution :

```
/tool image_generate action=list
```

## Paramètres de l'outil

| Paramètre     | Type     | Description                                                                              |
| ------------- | -------- | ---------------------------------------------------------------------------------------- |
| `prompt`      | chaîne   | Invite de génération d'image (requis pour `action: "generate"`)                          |
| `action`      | chaîne   | `"generate"` (par défaut) ou `"list"` pour inspecter les fournisseurs                    |
| `model`       | chaîne   | Remplacement de fournisseur/modèle, par ex. `openai/gpt-image-1`                         |
| `image`       | chaîne   | Chemin ou URL d'une image de référence unique pour le mode édition                       |
| `images`      | chaîne[] | Images de référence multiples pour le mode édition (jusqu'à 5)                           |
| `size`        | chaîne   | Indication de taille : `1024x1024`, `1536x1024`, `1024x1536`, `1024x1792`, `1792x1024`   |
| `aspectRatio` | chaîne   | Ratio d'aspect : `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9` |
| `resolution`  | chaîne   | Indication de résolution : `1K`, `2K` ou `4K`                                            |
| `count`       | nombre   | Nombre d'images à générer (1–4)                                                          |
| `filename`    | chaîne   | Indication de nom de fichier de sortie                                                   |

Tous les providers ne prennent pas en charge tous les paramètres. Lorsqu'un provider de secours prend en charge une option de géométrie proche au lieu de celle exactement demandée, OpenClaw la remappe vers la taille, le format d'image ou la résolution la plus proche prise en charge avant l'envoi. Les substitutions non prises en charge sont toujours signalées dans le résultat de l'outil.

Les résultats de l'outil indiquent les paramètres appliqués. Lorsque OpenClaw remappe la géométrie lors du basculement vers un provider de secours, les valeurs `size`, `aspectRatio` et `resolution` renvoyées reflètent ce qui a été réellement envoyé, et `details.normalization` capture la traduction entre la demande et l'application.

## Configuration

### Sélection du modèle

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "openai/gpt-image-1",
        fallbacks: ["google/gemini-3.1-flash-image-preview", "fal/fal-ai/flux/dev"],
      },
    },
  },
}
```

### Ordre de sélection des providers

Lors de la génération d'une image, OpenClaw essaie les providers dans cet ordre :

1. **Paramètre `model`** issu de l'appel d'outil (si l'agent en spécifie un)
2. **`imageGenerationModel.primary`** depuis la configuration
3. **`imageGenerationModel.fallbacks`** dans l'ordre
4. **Détection automatique** — utilise uniquement les valeurs par défaut des providers avec authentification :
   - le provider par défaut actuel en premier
   - les providers de génération d'images restants dans l'ordre des identifiants de provider

Si un provider échoue (erreur d'authentification, limite de débit, etc.), le candidat suivant est essayé automatiquement. Si tous échouent, l'erreur inclut les détails de chaque tentative.

Remarques :

- La détection automatique est consciente de l'authentification. Un provider par défaut n'entre dans la liste des candidats que lorsque OpenClaw peut réellement authentifier ce provider.
- La détection automatique est activée par défaut. Définissez `agents.defaults.mediaGenerationAutoProviderFallback: false` si vous souhaitez que la génération d'images utilise uniquement les entrées explicites `model`, `primary` et `fallbacks`.
- Utilisez `action: "list"` pour inspecter les providers actuellement enregistrés, leurs modèles par défaut et les indices de variables d'environnement d'authentification.

### Modification d'image

OpenAI, Google, fal, MiniMax et ComfyUI prennent en charge la modification d'images de référence. Indiquez un chemin ou une URL d'image de référence :

```
"Generate a watercolor version of this photo" + image: "/path/to/photo.jpg"
```

OpenAI et Google prennent en charge jusqu'à 5 images de référence via le paramètre `images`. fal, MiniMax et ComfyUI en supportent 1.

La génération d'images MiniMax est disponible via les deux chemins d'authentification MiniMax inclus :

- `minimax/image-01` pour les configurations avec clé API
- `minimax-portal/image-01` pour les configurations OAuth

## Fonctionnalités des providers

| Fonctionnalité         | OpenAI                 | Google                 | fal                         | MiniMax                   | ComfyUI                                  | Vydra   |
| ---------------------- | ---------------------- | ---------------------- | --------------------------- | ------------------------- | ---------------------------------------- | ------- |
| Générer                | Oui (jusqu'à 4)        | Oui (jusqu'à 4)        | Oui (jusqu'à 4)             | Oui (jusqu'à 9)           | Oui (sorties définies par le workflow)   | Oui (1) |
| Modification/référence | Oui (jusqu'à 5 images) | Oui (jusqu'à 5 images) | Oui (1 image)               | Oui (1 image, réf. sujet) | Oui (1 image, configuré par le workflow) | Non     |
| Contrôle de la taille  | Oui                    | Oui                    | Oui                         | Non                       | Non                                      | Non     |
| Format d'image         | Non                    | Oui                    | Oui (génération uniquement) | Oui                       | Non                                      | Non     |
| Résolution (1K/2K/4K)  | Non                    | Oui                    | Oui                         | Non                       | Non                                      | Non     |

## Connexes

- [Présentation des outils](/en/tools) — tous les outils de l'agent disponibles
- [fal](/en/providers/fal) — configuration du fournisseur d'images et de vidéos fal
- [ComfyUI](/en/providers/comfy) — configuration des flux de travail ComfyUI locaux et Comfy Cloud
- [Google (Gemini)](/en/providers/google) — configuration du fournisseur d'images Gemini
- [MiniMax](/en/providers/minimax) — configuration du fournisseur d'images MiniMax
- [OpenAI](/en/providers/openai) — configuration du fournisseur d'images OpenAI
- [Vydra](/en/providers/vydra) — configuration de l'image, de la vidéo et de la parole Vydra
- [Référence de configuration](/en/gateway/configuration-reference#agent-defaults) — config `imageGenerationModel`
- [Modèles](/en/concepts/models) — configuration et basculement des modèles
