---
summary: "Générer et modifier des images à l'aide de providers configurés (OpenAI, Google Gemini, fal, MiniMax)"
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
      imageGenerationModel: "openai/gpt-image-1",
    },
  },
}
```

3. Demandez à l'agent : _"Générer une image d'une mascotte homard sympathique."_

L'agent appelle `image_generate` automatiquement. Aucune liste blanche d'outils n'est nécessaire — il est activé par défaut lorsqu'un provider est disponible.

## Providers pris en charge

| Provider | Modèle par défaut                | Prise en charge de l'édition | Clé API                              |
| -------- | -------------------------------- | ---------------------------- | ------------------------------------ |
| OpenAI   | `gpt-image-1`                    | Non                          | `OPENAI_API_KEY`                     |
| Google   | `gemini-3.1-flash-image-preview` | Oui                          | `GEMINI_API_KEY` ou `GOOGLE_API_KEY` |
| fal      | `fal-ai/flux/dev`                | Oui                          | `FAL_KEY`                            |
| MiniMax  | `image-01`                       | Oui (référence du sujet)     | `MINIMAX_API_KEY`                    |

Utilisez `action: "list"` pour inspecter les providers et modèles disponibles lors de l'exécution :

```
/tool image_generate action=list
```

## Paramètres de l'outil

| Paramètre     | Type     | Description                                                                           |
| ------------- | -------- | ------------------------------------------------------------------------------------- |
| `prompt`      | chaîne   | Invite de génération d'image (requis pour `action: "generate"`)                       |
| `action`      | chaîne   | `"generate"` (par défaut) ou `"list"` pour inspecter les providers                    |
| `model`       | chaîne   | Remplacement de provider/modèle, par ex. `openai/gpt-image-1`                         |
| `image`       | chaîne   | Chemin ou URL d'une image de référence unique pour le mode édition                    |
| `images`      | chaîne[] | Plusieurs images de référence pour le mode édition (jusqu'à 5)                        |
| `size`        | string   | Size hint: `1024x1024`, `1536x1024`, `1024x1536`, `1024x1792`, `1792x1024`            |
| `aspectRatio` | string   | Aspect ratio: `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9` |
| `resolution`  | string   | Resolution hint: `1K`, `2K`, ou `4K`                                                  |
| `count`       | number   | Nombre d'images à générer (1-4)                                                       |
| `filename`    | string   | Indication du nom du fichier de sortie                                                |

Tous les providers ne prennent pas en charge tous les paramètres. L'outil transmet ce que chaque provider prend en charge et ignore le reste.

## Configuration

### Sélection du modèle

```json5
{
  agents: {
    defaults: {
      // String form: primary model only
      imageGenerationModel: "google/gemini-3-pro-image-preview",

      // Object form: primary + ordered fallbacks
      imageGenerationModel: {
        primary: "openai/gpt-image-1",
        fallbacks: ["google/gemini-3.1-flash-image-preview", "fal/fal-ai/flux/dev"],
      },
    },
  },
}
```

### Ordre de sélection du provider

Lors de la génération d'une image, OpenClaw essaie les providers dans cet ordre :

1. Paramètre **`model`** provenant de l'appel de l'outil (si l'agent en spécifie un)
2. **`imageGenerationModel.primary`** à partir de la configuration
3. **`imageGenerationModel.fallbacks`** dans l'ordre
4. **Détection automatique** — interroge tous les providers enregistrés pour les valeurs par défaut, en privilégiant : le provider principal configuré, puis OpenAI, puis Google, puis les autres

Si un provider échoue (erreur d'authentification, limite de débit, etc.), le candidat suivant est essayé automatiquement. Si tous échouent, l'erreur inclut les détails de chaque tentative.

### Modification d'image

Google, fal et MiniMax prennent en charge la modification d'images de référence. Indiquez un chemin ou une URL d'image de référence :

```
"Generate a watercolor version of this photo" + image: "/path/to/photo.jpg"
```

Google prend en charge jusqu'à 5 images de référence via le paramètre `images`. fal et MiniMax en prennent en charge 1.

## Capacités des providers

| Capacité               | OpenAI          | Google                 | fal                         | MiniMax                   |
| ---------------------- | --------------- | ---------------------- | --------------------------- | ------------------------- |
| Générer                | Oui (jusqu'à 4) | Oui (jusqu'à 4)        | Oui (jusqu'à 4)             | Oui (jusqu'à 9)           |
| Modification/référence | Non             | Oui (jusqu'à 5 images) | Oui (1 image)               | Oui (1 image, réf. sujet) |
| Contrôle de la taille  | Oui             | Oui                    | Oui                         | Non                       |
| Ratio d'aspect         | Non             | Oui                    | Oui (génération uniquement) | Oui                       |
| Résolution (1K/2K/4K)  | Non             | Oui                    | Oui                         | Non                       |

## Connexes

- [Vue d'ensemble des outils](/en/tools) — tous les outils de l'agent disponibles
- [Référence de configuration](/en/gateway/configuration-reference#agent-defaults) — config `imageGenerationModel`
- [Modèles](/en/concepts/models) — configuration des modèles et basculement
