---
summary: "Générez des vidéos à partir de texte, d'images ou de vidéos existantes en utilisant 12 backends de fournisseurs"
read_when:
  - Generating videos via the agent
  - Configuring video generation providers and models
  - Understanding the video_generate tool parameters
title: "Génération de vidéo"
---

# Génération de vidéo

Les agents OpenClaw peuvent générer des vidéos à partir de invites textuelles, d'images de référence ou de vidéos existantes. Douze backends de fournisseurs sont pris en charge, chacun avec différentes options de modèle, des modes d'entrée et des ensembles de fonctionnalités. L'agent choisit automatiquement le bon fournisseur en fonction de votre configuration et des clés API disponibles.

<Note>L'outil `video_generate` n'apparaît que lorsqu'au moins un fournisseur de génération de vidéo est disponible. Si vous ne le voyez pas dans vos outils d'agent, définissez une clé API de fournisseur ou configurez `agents.defaults.videoGenerationModel`.</Note>

## Quick start

1. Définissez une clé API pour n'importe quel fournisseur pris en charge :

```bash
export GEMINI_API_KEY="your-key"
```

2. Épinglez éventuellement un modèle par défaut :

```bash
openclaw config set agents.defaults.videoGenerationModel.primary "google/veo-3.1-fast-generate-preview"
```

3. Demandez à l'agent :

> Génère une vidéo cinématique de 5 secondes d'un homard sympathique faisant du surf au coucher du soleil.

L'agent appelle `video_generate` automatiquement. Aucune autorisation d'outil n'est nécessaire.

## Ce qui se passe lorsque vous générez une vidéo

La génération de vidéo est asynchrone. Lorsque l'agent appelle `video_generate` dans une session :

1. OpenClaw soumet la demande au fournisseur et renvoie immédiatement un ID de tâche.
2. Le fournisseur traite la tâche en arrière-plan (généralement de 30 secondes à 5 minutes selon le fournisseur et la résolution).
3. Lorsque la vidéo est prête, OpenClaw réveille la même session avec un événement de completion interne.
4. L'agent publie la vidéo terminée dans la conversation d'origine.

Pendant qu'une tâche est en cours, les appels `video_generate` en double dans la même session renvoient l'état actuel de la tâche au lieu de lancer une autre génération. Utilisez `openclaw tasks list` ou `openclaw tasks show <taskId>` pour vérifier la progression depuis le CLI.

En dehors des exécutions d'agent basées sur une session (par exemple, les appels directs d'outils), l'outil revient à la génération en ligne et renvoie le chemin média final dans le même tour.

## Fournisseurs pris en charge

| Fournisseur | Modèle par défaut               | Texte | Réf image          | Réf vidéo          | Clé API                                  |
| ----------- | ------------------------------- | ----- | ------------------ | ------------------ | ---------------------------------------- |
| Alibaba     | `wan2.6-t2v`                    | Oui   | Oui (URL distante) | Oui (URL distante) | `MODELSTUDIO_API_KEY`                    |
| BytePlus    | `seedance-1-0-lite-t2v-250428`  | Oui   | 1 image            | Non                | `BYTEPLUS_API_KEY`                       |
| ComfyUI     | `workflow`                      | Oui   | 1 image            | Non                | `COMFY_API_KEY` ou `COMFY_CLOUD_API_KEY` |
| fal         | `fal-ai/minimax/video-01-live`  | Oui   | 1 image            | Non                | `FAL_KEY`                                |
| Google      | `veo-3.1-fast-generate-preview` | Oui   | 1 image            | 1 vidéo            | `GEMINI_API_KEY`                         |
| MiniMax     | `MiniMax-Hailuo-2.3`            | Oui   | 1 image            | Non                | `MINIMAX_API_KEY`                        |
| OpenAI      | `sora-2`                        | Oui   | 1 image            | 1 vidéo            | `OPENAI_API_KEY`                         |
| Qwen        | `wan2.6-t2v`                    | Oui   | Oui (URL distante) | Oui (URL distante) | `QWEN_API_KEY`                           |
| Runway      | `gen4.5`                        | Oui   | 1 image            | 1 vidéo            | `RUNWAYML_API_SECRET`                    |
| Together    | `Wan-AI/Wan2.2-T2V-A14B`        | Oui   | 1 image            | Non                | `TOGETHER_API_KEY`                       |
| Vydra       | `veo3`                          | Oui   | 1 image (`kling`)  | Non                | `VYDRA_API_KEY`                          |
| xAI         | `grok-imagine-video`            | Oui   | 1 image            | 1 vidéo            | `XAI_API_KEY`                            |

Certains providers acceptent des variables d'environnement de clé API supplémentaires ou alternatives. Consultez les [pages du provider](#related) pour plus de détails.

Exécutez `video_generate action=list` pour inspecter les providers et modèles disponibles lors de l'exécution.

## Paramètres de l'outil

### Obligatoire

| Paramètre | Type   | Description                                                                    |
| --------- | ------ | ------------------------------------------------------------------------------ |
| `prompt`  | string | Description textuelle de la vidéo à générer (requis pour `action: "generate"`) |

### Entrées de contenu

| Paramètre | Type     | Description                               |
| --------- | -------- | ----------------------------------------- |
| `image`   | string   | Image de référence unique (chemin ou URL) |
| `images`  | string[] | Plusieurs images de référence (jusqu'à 5) |
| `video`   | string   | Vidéo de référence unique (chemin ou URL) |
| `videos`  | string[] | Plusieurs vidéos de référence (jusqu'à 4) |

### Contrôles de style

| Paramètre         | Type    | Description                                                                                      |
| ----------------- | ------- | ------------------------------------------------------------------------------------------------ |
| `aspectRatio`     | string  | `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`                          |
| `resolution`      | chaîne  | `480P`, `720P` ou `1080P`                                                                        |
| `durationSeconds` | nombre  | Durée cible en secondes (arrondie à la valeur la plus proche prise en charge par le fournisseur) |
| `size`            | chaîne  | Indication de taille lorsque le fournisseur la prend en charge                                   |
| `audio`           | booléen | Activer l'audio généré lorsqu'il est pris en charge                                              |
| `watermark`       | booléen | Activer/désactiver le filigrane du fournisseur lorsqu'il est pris en charge                      |

### Avancé

| Paramètre  | Type   | Description                                                      |
| ---------- | ------ | ---------------------------------------------------------------- |
| `action`   | chaîne | `"generate"` (par défaut), `"status"` ou `"list"`                |
| `model`    | chaîne | Remplacement de fournisseur/modèle (par exemple `runway/gen4.5`) |
| `filename` | chaîne | Indication de nom de fichier de sortie                           |

Tous les fournisseurs ne prennent pas en charge tous les paramètres. Les remplacements non pris en charge sont ignorés dans la mesure du possible et signalés sous forme d'avertissements dans le résultat de l'outil. Les limites strictes de capacité (telles que trop d'entrées de référence) échouent avant la soumission.

## Actions

- **generate** (par défaut) -- créer une vidéo à partir de l'invite donnée et des entrées de référence facultatives.
- **status** -- vérifier l'état de la tâche vidéo en cours pour la session actuelle sans lancer une autre génération.
- **list** -- afficher les fournisseurs, les modèles disponibles et leurs capacités.

## Sélection du modèle

Lors de la génération d'une vidéo, OpenClaw résout le modèle dans cet ordre :

1. **Paramètre d'outil `model`** -- si l'agent en spécifie un lors de l'appel.
2. **`videoGenerationModel.primary`** -- à partir de la configuration.
3. **`videoGenerationModel.fallbacks`** -- essayés dans l'ordre.
4. **Détection automatique** -- utilise les fournisseurs qui ont une authentification valide, en commençant par le fournisseur par défaut actuel, puis les autres fournisseurs par ordre alphabétique.

Si un fournisseur échoue, le candidat suivant est essayé automatiquement. Si tous les candidats échouent, l'erreur inclut les détails de chaque tentative.

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "google/veo-3.1-fast-generate-preview",
        fallbacks: ["runway/gen4.5", "qwen/wan2.6-t2v"],
      },
    },
  },
}
```

## Notes sur les fournisseurs

| Fournisseur | Notes                                                                                                                                                                                                            |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alibaba     | Utilise le point de terminaison asynchrone DashScope/Model Studio. Les images et vidéos de référence doivent être des URL `http(s)` distantes.                                                                   |
| BytePlus    | Référence d'image unique uniquement.                                                                                                                                                                             |
| ComfyUI     | Exécution locale ou dans le cloud pilotée par le workflow. Prend en charge le texte vers vidéo et l'image vers vidéo via le graphe configuré.                                                                    |
| fal         | Utilise un flux avec file d'attente pour les tâches de longue durée. Référence d'image unique uniquement.                                                                                                        |
| Google      | Utilise Gemini/Veo. Prend en charge une image ou une vidéo de référence.                                                                                                                                         |
| MiniMax     | Référence d'image unique uniquement.                                                                                                                                                                             |
| OpenAI      | Seul le remplacement `size` est transmis. Les autres remplacements de style (`aspectRatio`, `resolution`, `audio`, `watermark`) sont ignorés avec un avertissement.                                              |
| Qwen        | Même backend DashScope qu'Alibaba. Les entrées de référence doivent être des URL `http(s)` distantes ; les fichiers locaux sont rejetés immédiatement.                                                           |
| Runway      | Prend en charge les fichiers locaux via des URI de données. La vidéo vers vidéo nécessite `runway/gen4_aleph`. Les exécutions en texte seul exposent les formats d'aspect `16:9` et `9:16`.                      |
| Together    | Référence d'image unique uniquement.                                                                                                                                                                             |
| Vydra       | Utilise `https://www.vydra.ai/api/v1` directement pour éviter les redirections qui suppriment l'authentification. `veo3` est fourni en texte vers vidéo uniquement ; `kling` nécessite une URL d'image distante. |
| xAI         | Prend en charge les flux texte vers vidéo, image vers vidéo, et édition/extension de vidéo distante.                                                                                                             |

## Configuration

Définissez le modèle de génération vidéo par défaut dans votre configuration OpenClaw :

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "qwen/wan2.6-t2v",
        fallbacks: ["qwen/wan2.6-r2v-flash"],
      },
    },
  },
}
```

Ou via le CLI :

```bash
openclaw config set agents.defaults.videoGenerationModel.primary "qwen/wan2.6-t2v"
```

## Connexes

- [Aperçu des outils](/en/tools)
- [Tâches d'arrière-plan](/en/automation/tasks) -- suivi des tâches pour la génération vidéo asynchrone
- [Alibaba Model Studio](/en/providers/alibaba)
- [BytePlus](/en/providers/byteplus)
- [ComfyUI](/en/providers/comfy)
- [fal](/en/providers/fal)
- [Google (Gemini)](/en/providers/google)
- [MiniMax](/en/providers/minimax)
- [OpenAI](/en/providers/openai)
- [Qwen](/en/providers/qwen)
- [Runway](/en/providers/runway)
- [Together AI](/en/providers/together)
- [Vydra](/en/providers/vydra)
- [xAI](/en/providers/xai)
- [Configuration Reference](/en/gateway/configuration-reference#agent-defaults)
- [Models](/en/concepts/models)
