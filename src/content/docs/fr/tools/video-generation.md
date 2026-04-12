---
summary: "Générez des vidéos à partir de texte, d'images ou de vidéos existantes en utilisant 12 backends de provider"
read_when:
  - Generating videos via the agent
  - Configuring video generation providers and models
  - Understanding the video_generate tool parameters
title: "Génération de vidéos"
---

# Génération de vidéo

Les agents OpenClaw peuvent générer des vidéos à partir de invites textuelles, d'images de référence ou de vidéos existantes. Douze backends de fournisseurs sont pris en charge, chacun avec différentes options de modèle, des modes d'entrée et des ensembles de fonctionnalités. L'agent choisit automatiquement le bon fournisseur en fonction de votre configuration et des clés API disponibles.

<Note>The `video_generate` tool only appears when at least one video-generation provider is available. If you do not see it in your agent tools, set a provider API key or configure `agents.defaults.videoGenerationModel`.</Note>

OpenClaw traite la génération de vidéo selon trois modes d'exécution :

- `generate` pour les requêtes de texte vers vidéo sans média de référence
- `imageToVideo` lorsque la requête inclut une ou plusieurs images de référence
- `videoToVideo` lorsque la requête inclut une ou plusieurs vidéos de référence

Les providers peuvent prendre en charge n'importe quel sous-ensemble de ces modes. L'outil valide le mode actif avant la soumission et signale les modes pris en charge dans `action=list`.

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

> Générez une vidéo cinématique de 5 secondes d'un homard amical faisant du surf au coucher du soleil.

L'agent appelle `video_generate` automatiquement. Aucune liste d'autorisation d'outil n'est nécessaire.

## Ce qui se passe lorsque vous générez une vidéo

La génération de vidéos est asynchrone. Lorsque l'agent appelle `video_generate` dans une session :

1. OpenClaw soumet la requête au fournisseur et renvoie immédiatement un ID de tâche.
2. Le fournisseur traite la tâche en arrière-plan (généralement de 30 secondes à 5 minutes selon le fournisseur et la résolution).
3. Lorsque la vidéo est prête, OpenClaw réveille la même session avec un événement interne d'achèvement.
4. L'agent publie la vidéo terminée dans la conversation d'origine.

Pendant qu'une tâche est en cours, les appels en double à `video_generate` dans la même session renvoient l'état actuel de la tâche au lieu de lancer une autre génération. Utilisez `openclaw tasks list` ou `openclaw tasks show <taskId>` pour vérifier la progression depuis la CLI.

En dehors des exécutions d'agent soutenues par une session (par exemple, les invocations directes d'outils), l'outil revient à la génération en ligne et renvoie le chemin final du média dans le même tour.

### Cycle de vie de la tâche

Chaque requête `video_generate` passe par quatre états :

1. **en file d'attente** -- tâche créée, en attente que le provider l'accepte.
2. **en cours** -- le provider traite la demande (généralement de 30 secondes à 5 minutes selon le provider et la résolution).
3. **réussi** -- vidéo prête ; l'agent se réveille et la publie dans la conversation.
4. **échoué** -- erreur ou expiration du délai du provider ; l'agent se réveille avec les détails de l'erreur.

Vérifiez le statut depuis la CLI :

```bash
openclaw tasks list
openclaw tasks show <taskId>
openclaw tasks cancel <taskId>
```

Prévention des doublons : si une tâche vidéo est déjà `queued` ou `running` pour la session actuelle, `video_generate` renvoie l'état de la tâche existante au lieu d'en commencer une nouvelle. Utilisez `action: "status"` pour vérifier explicitement sans déclencher de nouvelle génération.

## Providers pris en charge

| Provider | Modèle par défaut               | Texte | Réf image          | Réf vidéo          | Clé API                                  |
| -------- | ------------------------------- | ----- | ------------------ | ------------------ | ---------------------------------------- |
| Alibaba  | `wan2.6-t2v`                    | Oui   | Oui (URL distante) | Oui (URL distante) | `MODELSTUDIO_API_KEY`                    |
| BytePlus | `seedance-1-0-lite-t2v-250428`  | Oui   | 1 image            | Non                | `BYTEPLUS_API_KEY`                       |
| ComfyUI  | `workflow`                      | Oui   | 1 image            | Non                | `COMFY_API_KEY` ou `COMFY_CLOUD_API_KEY` |
| fal      | `fal-ai/minimax/video-01-live`  | Oui   | 1 image            | Non                | `FAL_KEY`                                |
| Google   | `veo-3.1-fast-generate-preview` | Oui   | 1 image            | 1 vidéo            | `GEMINI_API_KEY`                         |
| MiniMax  | `MiniMax-Hailuo-2.3`            | Oui   | 1 image            | Non                | `MINIMAX_API_KEY`                        |
| OpenAI   | `sora-2`                        | Oui   | 1 image            | 1 vidéo            | `OPENAI_API_KEY`                         |
| Qwen     | `wan2.6-t2v`                    | Oui   | Oui (URL distante) | Oui (URL distante) | `QWEN_API_KEY`                           |
| Runway   | `gen4.5`                        | Oui   | 1 image            | 1 vidéo            | `RUNWAYML_API_SECRET`                    |
| Together | `Wan-AI/Wan2.2-T2V-A14B`        | Oui   | 1 image            | Non                | `TOGETHER_API_KEY`                       |
| Vydra    | `veo3`                          | Oui   | 1 image (`kling`)  | Non                | `VYDRA_API_KEY`                          |
| xAI      | `grok-imagine-video`            | Oui   | 1 image            | 1 vidéo            | `XAI_API_KEY`                            |

Certains fournisseurs acceptent des variables d'environnement de clé API supplémentaires ou alternatives. Consultez les [pages des fournisseurs](#related) pour plus de détails.

Exécutez `video_generate action=list` pour inspecter les fournisseurs, les modèles et les modes d'exécution disponibles lors de l'exécution.

### Matrice des capacités déclarées

Il s'agit du contrat de mode explicite utilisé par `video_generate`, les tests de contrat et le balayage en direct partagé.

| Provider | `generate` | `imageToVideo` | `videoToVideo` | Voies de test partagées aujourd'hui                                                                                                               |
| -------- | ---------- | -------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alibaba  | Oui        | Oui            | Oui            | `generate`, `imageToVideo`; `videoToVideo` ignoré car ce fournisseur a besoin d'URLs vidéo `http(s)` distantes                                    |
| BytePlus | Oui        | Oui            | Non            | `generate`, `imageToVideo`                                                                                                                        |
| ComfyUI  | Oui        | Oui            | Non            | Pas dans le balayage partagé ; la couverture spécifique aux flux de travail réside avec les tests Comfy                                           |
| fal      | Oui        | Oui            | Non            | `generate`, `imageToVideo`                                                                                                                        |
| Google   | Oui        | Oui            | Oui            | `generate`, `imageToVideo`; `videoToVideo` partagé ignoré car le balayage Gemini/Veo actuel avec tampon n'accepte pas cette entrée                |
| MiniMax  | Oui        | Oui            | Non            | `generate`, `imageToVideo`                                                                                                                        |
| OpenAI   | Oui        | Oui            | Oui            | `generate`, `imageToVideo`; `videoToVideo` partagé ignoré car ce chemin org/input a actuellement besoin d'un accès inpaint/remix côté fournisseur |
| Qwen     | Oui        | Oui            | Oui            | `generate`, `imageToVideo`; `videoToVideo` ignoré car ce fournisseur a besoin d'URLs vidéo `http(s)` distantes                                    |
| Runway   | Oui        | Oui            | Oui            | `generate`, `imageToVideo`; `videoToVideo` ne s'exécute que lorsque le modèle sélectionné est `runway/gen4_aleph`                                 |
| Together | Oui        | Oui            | Non            | `generate`, `imageToVideo`                                                                                                                        |
| Vydra    | Oui        | Oui            | Non            | `generate` ; `imageToVideo` partagé ignoré car `veo3` groupé est texte uniquement et `kling` groupé nécessite une URL d'image distante            |
| xAI      | Oui        | Oui            | Oui            | `generate`, `imageToVideo` ; `videoToVideo` ignoré car ce provider nécessite actuellement une URL MP4 distante                                    |

## Paramètres de l'outil

### Obligatoire

| Paramètre | Type   | Description                                                                    |
| --------- | ------ | ------------------------------------------------------------------------------ |
| `prompt`  | string | Description textuelle de la vidéo à générer (requis pour `action: "generate"`) |

### Entrées de contenu

| Paramètre | Type     | Description                               |
| --------- | -------- | ----------------------------------------- |
| `image`   | string   | Image de référence unique (chemin ou URL) |
| `images`  | string[] | Images de référence multiples (jusqu'à 5) |
| `video`   | string   | Vidéo de référence unique (chemin ou URL) |
| `videos`  | string[] | Vidéos de référence multiples (jusqu'à 4) |

### Contrôles de style

| Paramètre         | Type    | Description                                                                                   |
| ----------------- | ------- | --------------------------------------------------------------------------------------------- |
| `aspectRatio`     | string  | `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`                       |
| `resolution`      | string  | `480P`, `720P`, `768P`, ou `1080P`                                                            |
| `durationSeconds` | number  | Durée cible en secondes (arrondie à la valeur prise en charge la plus proche par le provider) |
| `size`            | string  | Indication de taille lorsque le provider la prend en charge                                   |
| `audio`           | boolean | Activer l'audio généré lorsque pris en charge                                                 |
| `watermark`       | boolean | Activer le filigrane du provider lorsque pris en charge                                       |

### Avancé

| Paramètre  | Type   | Description                                          |
| ---------- | ------ | ---------------------------------------------------- |
| `action`   | string | `"generate"` (par défaut), `"status"`, ou `"list"`   |
| `model`    | string | Substitution de provider/model (ex. `runway/gen4.5`) |
| `filename` | string | Indication de nom de fichier de sortie               |

Tous les providers ne prennent pas en charge tous les paramètres. OpenClaw normalise déjà la durée à la valeur la plus proche prise en charge par le provider, et il remappe également les indications géométriques traduites telles que la taille vers le format d'image lorsqu'un provider de secours expose une surface de contrôle différente. Les remplacements non pris en charge sont ignorés sur la base du meilleur effort et signalés sous forme d'avertissements dans le résultat de l'outil. Les limites strictes de capacité (telles que trop de références d'entrée) échouent avant la soumission.

Les résultats de l'outil signalent les paramètres appliqués. Lorsque OpenClaw remappe la durée ou la géométrie lors du repli de provider, les valeurs `durationSeconds`, `size`, `aspectRatio` et `resolution` renvoyées reflètent ce qui a été soumis, et `details.normalization` capture la traduction de la demande vers l'appliqué.

Les entrées de référence sélectionnent également le mode d'exécution :

- Aucun média de référence : `generate`
- Toute référence image : `imageToVideo`
- Toute référence vidéo : `videoToVideo`

Les références mixtes d'images et de vidéos ne constituent pas une surface de capacité partagée stable.
Préférez un seul type de référence par demande.

## Actions

- **generate** (par défaut) -- crée une vidéo à partir de l'invite donnée et des entrées de référence facultatives.
- **status** -- vérifie l'état de la tâche vidéo en cours pour la session actuelle sans démarrer une autre génération.
- **list** -- affiche les providers, les modèles disponibles et leurs capacités.

## Sélection du modèle

Lors de la génération d'une vidéo, OpenClaw résout le modèle dans cet ordre :

1. **Paramètre de l'outil `model`** -- si l'agent en spécifie un dans l'appel.
2. **`videoGenerationModel.primary`** -- depuis la configuration.
3. **`videoGenerationModel.fallbacks`** -- essayés dans l'ordre.
4. **Détection automatique** -- utilise les providers qui ont une authentification valide, en commençant par le provider par défaut actuel, puis les autres providers par ordre alphabétique.

Si un provider échoue, le candidat suivant est essayé automatiquement. Si tous les candidats échouent, l'erreur inclut les détails de chaque tentative.

Définissez `agents.defaults.mediaGenerationAutoProviderFallback: false` si vous souhaitez
que la génération de vidéos utilise uniquement les entrées explicites `model`, `primary` et `fallbacks`.

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

HeyGen video-agent sur fal peut être épinglé avec :

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

Seedance 2.0 sur fal peut être épinglé avec :

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

## Notes sur le fournisseur

| Fournisseur | Notes                                                                                                                                                                                                                       |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alibaba     | Utilise le point de terminaison asynchrone DashScope/Model Studio. Les images et vidéos de référence doivent être des URL `http(s)` distantes.                                                                              |
| BytePlus    | Référence image unique uniquement.                                                                                                                                                                                          |
| ComfyUI     | Exécution locale ou dans le cloud pilotée par le flux de travail. Prend en charge le texte vers vidéo et l'image vers vidéo via le graphe configuré.                                                                        |
| fal         | Utilise un flux avec file d'attente pour les tâches de longue durée. Référence image unique uniquement. Inclut les références de modèle texte vers vidéo et image vers vidéo HeyGen video-agent et Seedance 2.0.            |
| Google      | Utilise Gemini/Veo. Prend en charge une image ou une vidéo de référence.                                                                                                                                                    |
| MiniMax     | Référence image unique uniquement.                                                                                                                                                                                          |
| OpenAI      | Seul le remplacement `size` est transmis. Les autres remplacements de style (`aspectRatio`, `resolution`, `audio`, `watermark`) sont ignorés avec un avertissement.                                                         |
| Qwen        | Même backend DashScope qu'Alibaba. Les entrées de référence doivent être des URL `http(s)` distantes ; les fichiers locaux sont rejetés immédiatement.                                                                      |
| Runway      | Prend en charge les fichiers locaux via des URI de données. La vidéo vers vidéo nécessite `runway/gen4_aleph`. Les exécutions en mode texte uniquement exposent les formats d'aspect `16:9` et `9:16`.                      |
| Together    | Référence image unique uniquement.                                                                                                                                                                                          |
| Vydra       | Utilise `https://www.vydra.ai/api/v1` directement pour éviter les redirections entraînant une perte d'authentification. `veo3` est fourni uniquement en mode texte vers vidéo ; `kling` nécessite une URL d'image distante. |
| xAI         | Prend en charge les flux texte vers vidéo, image vers vidéo, et d'édition/extension de vidéo distante.                                                                                                                      |

## Modes de capacité du fournisseur

Le contrat partagé de génération vidéo permet désormais aux fournisseurs de déclarer des capacités spécifiques au mode au lieu de simples limites globales. Les nouvelles implémentations de fournisseurs devraient préférer des blocs de mode explicites :

```typescript
capabilities: {
  generate: {
    maxVideos: 1,
    maxDurationSeconds: 10,
    supportsResolution: true,
  },
  imageToVideo: {
    enabled: true,
    maxVideos: 1,
    maxInputImages: 1,
    maxDurationSeconds: 5,
  },
  videoToVideo: {
    enabled: true,
    maxVideos: 1,
    maxInputVideos: 1,
    maxDurationSeconds: 5,
  },
}
```

Les champs globaux plats tels que `maxInputImages` et `maxInputVideos` ne suffisent pas pour annoncer la prise en charge du mode de transformation. Les fournisseurs doivent déclarer `generate`, `imageToVideo` et `videoToVideo` explicitement afin que les tests en direct, les tests de contrat et l'outil `video_generate` partagé puissent valider la prise en charge du mode de manière déterministe.

## Tests en direct

Couverture en direct optionnelle pour les fournisseurs groupés partagés :

```bash
OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts
```

Wrapper de dépôt :

```bash
pnpm test:live:media video
```

Ce fichier en direct charge les variables d'environnement de fournisseur manquantes à partir de `~/.profile`, préfère par défaut les clés API live/env aux profils d'authentification stockés, et exécute les modes déclarés qu'il peut tester en toute sécurité avec des médias locaux :

- `generate` pour chaque fournisseur du sweep
- `imageToVideo` lorsque `capabilities.imageToVideo.enabled`
- `videoToVideo` lorsque `capabilities.videoToVideo.enabled` et que le fournisseur/modèle
  accepte l'entrée vidéo locale sauvegardée dans le tampon dans le sweep partagé

Aujourd'hui, la voie en direct partagée `videoToVideo` couvre :

- `runway` uniquement lorsque vous sélectionnez `runway/gen4_aleph`

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

Ou via la CLI :

```bash
openclaw config set agents.defaults.videoGenerationModel.primary "qwen/wan2.6-t2v"
```

## Connexe

- [Aperçu des outils](/en/tools)
- [Tâches d'arrière-plan](/en/automation/tasks) -- suivi des tâches pour la génération vidéo asynchrone
- [Alibaba Model Studio](/en/providers/alibaba)
- [BytePlus](/en/concepts/model-providers#byteplus-international)
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
- [Référence de configuration](/en/gateway/configuration-reference#agent-defaults)
- [Modèles](/en/concepts/models)
