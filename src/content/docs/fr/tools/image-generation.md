---
summary: "Générer et modifier des images à l'aide de providers configurés (OpenAI, Google Gemini, fal, MiniMax, ComfyUI, Vydra, xAI)"
read_when:
  - Generating images via the agent
  - Configuring image generation providers and models
  - Understanding the image_generate tool parameters
title: "Génération d'images"
---

# Génération d'images

L'outil `image_generate` permet à l'agent de créer et de modifier des images en utilisant vos providers configurés. Les images générées sont livrées automatiquement en tant que pièces jointes multimédias dans la réponse de l'agent.

<Note>L'outil n'apparaît que lorsqu'au moins un provider de génération d'images est disponible. Si vous ne voyez pas `image_generate` dans les outils de votre agent, configurez `agents.defaults.imageGenerationModel` ou configurez une clé API de provider.</Note>

## Quick start

1. Configurez une clé API pour au moins un provider (par exemple `OPENAI_API_KEY` ou `GEMINI_API_KEY`).
2. Définissez facultativement votre modèle préféré :

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "openai/gpt-image-2",
      },
    },
  },
}
```

3. Demandez à l'agent : _"Générer une image d'une mascotte homard sympathique."_

L'agent appelle `image_generate` automatiquement. Aucune liste d'autorisation d'outil n'est nécessaire — il est activé par défaut lorsqu'un provider est disponible.

## Providers pris en charge

| Provider | Modèle par défaut                | Prise en charge de l'édition                 | Clé API                                                |
| -------- | -------------------------------- | -------------------------------------------- | ------------------------------------------------------ |
| OpenAI   | `gpt-image-2`                    | Oui (jusqu'à 5 images)                       | `OPENAI_API_KEY`                                       |
| Google   | `gemini-3.1-flash-image-preview` | Oui                                          | `GEMINI_API_KEY` ou `GOOGLE_API_KEY`                   |
| fal      | `fal-ai/flux/dev`                | Oui                                          | `FAL_KEY`                                              |
| MiniMax  | `image-01`                       | Oui (référence du sujet)                     | `MINIMAX_API_KEY` ou MiniMax OAuth (`minimax-portal`)  |
| ComfyUI  | `workflow`                       | Oui (1 image, configuré par flux de travail) | `COMFY_API_KEY` ou `COMFY_CLOUD_API_KEY` pour le cloud |
| Vydra    | `grok-imagine`                   | Non                                          | `VYDRA_API_KEY`                                        |
| xAI      | `grok-imagine-image`             | Oui (jusqu'à 5 images)                       | `XAI_API_KEY`                                          |

Utilisez `action: "list"` pour inspecter les providers et les modèles disponibles lors de l'exécution :

```
/tool image_generate action=list
```

## Paramètres de l'outil

| Paramètre     | Type     | Description                                                                              |
| ------------- | -------- | ---------------------------------------------------------------------------------------- |
| `prompt`      | string   | Invite de génération d'image (requis pour `action: "generate"`)                          |
| `action`      | string   | `"generate"` (par défaut) ou `"list"` pour inspecter les providers                       |
| `model`       | string   | Remplacement de provider/modèle, p. ex. `openai/gpt-image-2`                             |
| `image`       | string   | Chemin ou URL d'une seule image de référence pour le mode édition                        |
| `images`      | string[] | Plusieurs images de référence pour le mode d'édition (jusqu'à 5)                         |
| `size`        | string   | Indication de taille : `1024x1024`, `1536x1024`, `1024x1536`, `2048x2048`, `3840x2160`   |
| `aspectRatio` | string   | Format d'image : `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9` |
| `resolution`  | string   | Indication de résolution : `1K`, `2K` ou `4K`                                            |
| `count`       | number   | Nombre d'images à générer (1–4)                                                          |
| `filename`    | string   | Indication de nom de fichier de sortie                                                   |

Tous les providers ne prennent pas en charge tous les paramètres. Lorsqu'un provider de repli prend en charge une option de géométrie proche au lieu de celle demandée exactement, OpenClaw la remappe vers la taille, le format d'image ou la résolution la plus proche prise en charge avant la soumission. Les substitutions réellement non prises en charge sont toujours signalées dans le résultat de l'outil.

Les résultats des outils indiquent les paramètres appliqués. Lorsque OpenClaw remappe la géométrie lors du repli du provider, les valeurs renvoyées `size`, `aspectRatio` et `resolution` reflètent ce qui a été réellement envoyé, et `details.normalization` capture la traduction de la demande vers l'appliqué.

## Configuration

### Sélection du modèle

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "openai/gpt-image-2",
        fallbacks: ["google/gemini-3.1-flash-image-preview", "fal/fal-ai/flux/dev"],
      },
    },
  },
}
```

### Ordre de sélection du provider

Lors de la génération d'une image, OpenClaw essaie les providers dans cet ordre :

1. **Paramètre `model`** issu de l'appel d'outil (si l'agent en spécifie un)
2. **`imageGenerationModel.primary`** depuis la configuration
3. **`imageGenerationModel.fallbacks`** dans l'ordre
4. **Détection automatique** — utilise uniquement les valeurs par défaut des providers pris en charge par l'authentification :
   - provider par défaut actuel en premier
   - providers de génération d'image enregistrés restants dans l'ordre des ID de provider

Si un provider échoue (erreur d'authentification, limite de taux, etc.), le candidat suivant est essayé automatiquement. Si tous échouent, l'erreur inclut les détails de chaque tentative.

Notes :

- La détection automatique est consciente de l'authentification. Un provider par défaut n'entre dans la liste des candidats
  que lorsque OpenClaw peut réellement authentifier ce provider.
- La détection automatique est activée par défaut. Définissez
  `agents.defaults.mediaGenerationAutoProviderFallback: false` si vous souhaitez que la génération
  d'images utilise uniquement les entrées explicites `model`, `primary` et `fallbacks`.
- Utilisez `action: "list"` pour inspecter les providers actuellement enregistrés, leurs
  modèles par défaut et les indices de variables d'environnement d'authentification.

### Modification d'image

OpenAI, Google, fal, MiniMax, ComfyUI et xAI prennent en charge la modification d'images de référence. Indiquez un chemin ou une URL d'image de référence :

```
"Generate a watercolor version of this photo" + image: "/path/to/photo.jpg"
```

OpenAI, Google et xAI prennent en charge jusqu'à 5 images de référence via le paramètre `images`. fal, MiniMax et ComfyUI en prennent en charge 1.

### OpenAI `gpt-image-2`

La génération d'images OpenAI utilise par défaut `openai/gpt-image-2`. L'ancien
modèle `openai/gpt-image-1` peut toujours être sélectionné explicitement, mais les nouvelles demandes de
génération et de modification d'images OpenAI devraient utiliser `gpt-image-2`.

`gpt-image-2` prend en charge à la fois la génération de texte vers image et la modification
d'images de référence via le même outil `image_generate`. OpenClaw transfère `prompt`,
`count`, `size` et les images de référence à OpenAI. OpenAI ne reçoit pas
directement `aspectRatio` ou `resolution` ; lorsque cela est possible, OpenClaw les mappe vers un
`size` pris en charge, sinon l'outil les signale comme des paramètres de remplacement ignorés.

Générer une image paysage 4K :

```
/tool image_generate action=generate model=openai/gpt-image-2 prompt="A clean editorial poster for OpenClaw image generation" size=3840x2160 count=1
```

Générer deux images carrées :

```
/tool image_generate action=generate model=openai/gpt-image-2 prompt="Two visual directions for a calm productivity app icon" size=1024x1024 count=2
```

Modifier une image de référence locale :

```
/tool image_generate action=generate model=openai/gpt-image-2 prompt="Keep the subject, replace the background with a bright studio setup" image=/path/to/reference.png size=1024x1536
```

Modifier avec plusieurs références :

```
/tool image_generate action=generate model=openai/gpt-image-2 prompt="Combine the character identity from the first image with the color palette from the second" images='["/path/to/character.png","/path/to/palette.jpg"]' size=1536x1024
```

La génération d'images MiniMax est disponible via les deux chemins d'authentification MiniMax intégrés :

- `minimax/image-01` pour les configurations avec clé API
- `minimax-portal/image-01` pour les configurations OAuth

## Capacités des providers

| Capacité               | OpenAI                 | Google                 | fal                         | MiniMax                   | ComfyUI                                  | Vydra   | xAI                    |
| ---------------------- | ---------------------- | ---------------------- | --------------------------- | ------------------------- | ---------------------------------------- | ------- | ---------------------- |
| Générer                | Oui (jusqu'à 4)        | Oui (jusqu'à 4)        | Oui (jusqu'à 4)             | Oui (jusqu'à 9)           | Oui (sorties définies par le workflow)   | Oui (1) | Oui (jusqu'à 4)        |
| Modification/référence | Oui (jusqu'à 5 images) | Oui (jusqu'à 5 images) | Oui (1 image)               | Oui (1 image, réf. sujet) | Oui (1 image, configuré par le workflow) | Non     | Oui (jusqu'à 5 images) |
| Contrôle de la taille  | Oui (jusqu'à 4K)       | Oui                    | Oui                         | Non                       | Non                                      | Non     | Non                    |
| Format d'image         | Non                    | Oui                    | Oui (génération uniquement) | Oui                       | Non                                      | Non     | Oui                    |
| Résolution (1K/2K/4K)  | Non                    | Oui                    | Oui                         | Non                       | Non                                      | Non     | Oui (1K/2K)            |

### xAI `grok-imagine-image`

Le fournisseur xAI intégré utilise `/v1/images/generations` pour les demandes de type invite uniquement
et `/v1/images/edits` lorsque `image` ou `images` sont présents.

- Modèles : `xai/grok-imagine-image`, `xai/grok-imagine-image-pro`
- Nombre : jusqu'à 4
- Références : une `image` ou jusqu'à cinq `images`
- Formats d'image : `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `2:3`, `3:2`
- Résolutions : `1K`, `2K`
- Sorties : renvoyées en tant que pièces jointes d'image gérées par OpenClaw

OpenClaw n'expose pas intentionnellement les `quality`, `mask`, `user` natives xAI, ni
les formats d'image natifs supplémentaires tant que ces contrôles n'existent pas dans le contrat
`image_generate` partagé entre les fournisseurs.

## Connexes

- [Vue d'ensemble des outils](/fr/tools) — tous les outils de l'agent disponibles
- [fal](/fr/providers/fal) — configuration du fournisseur d'images et de vidéos fal
- [ComfyUI](/fr/providers/comfy) — configuration des workflows ComfyUI locaux et Comfy Cloud
- [Google (Gemini)](/fr/providers/google) — configuration du fournisseur d'images Gemini
- [MiniMax](/fr/providers/minimax) — configuration du fournisseur d'images MiniMax
- [OpenAI](/fr/providers/openai) — configuration du fournisseur d'images OpenAI
- [Vydra](/fr/providers/vydra) — configuration de Vydra pour les images, vidéos et la parole
- [xAI](/fr/providers/xai) — configuration Grok pour les images, vidéos, recherche, exécution de code et TTS
- [Référence de configuration](/fr/gateway/configuration-reference#agent-defaults) — config `imageGenerationModel`
- [Modèles](/fr/concepts/models) — configuration du model et basculement
