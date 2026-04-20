---
summary: "Générez des vidéos à partir de texte, d'images ou de vidéos existantes en utilisant 14 fournisseurs de backend"
read_when:
  - Generating videos via the agent
  - Configuring video generation providers and models
  - Understanding the video_generate tool parameters
title: "Génération de vidéo"
---

# Génération de vidéo

Les agents OpenClaw peuvent générer des vidéos à partir de invites textuelles, d'images de référence ou de vidéos existantes. Quatorze fournisseurs de backend sont pris en charge, chacun avec différentes options de modèle, des modes d'entrée et des ensembles de fonctionnalités. L'agent choisit automatiquement le bon fournisseur en fonction de votre configuration et des clés API disponibles.

<Note>The `video_generate` tool n'apparaît que lorsqu'au moins un fournisseur de génération de vidéo est disponible. Si vous ne le voyez pas dans vos outils d'agent, définissez une clé API de fournisseur ou configurez `agents.defaults.videoGenerationModel`.</Note>

OpenClaw traite la génération de vidéo selon trois modes d'exécution :

- `generate` pour les requêtes texte-vers-vidéo sans média de référence
- `imageToVideo` lorsque la requête inclut une ou plusieurs images de référence
- `videoToVideo` lorsque la requête inclut une ou plusieurs vidéos de référence

Les fournisseurs peuvent prendre en charge n'importe quel sous-ensemble de ces modes. L'outil valide le mode actif avant soumission et signale les modes pris en charge dans `action=list`.

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

L'agent appelle `video_generate` automatiquement. Aucune autorisation d'outil n'est nécessaire.

## Ce qui se passe lorsque vous générez une vidéo

La génération de vidéo est asynchrone. Lorsque l'agent appelle `video_generate` dans une session :

1. OpenClaw soumet la requête au fournisseur et renvoie immédiatement un ID de tâche.
2. Le fournisseur traite la tâche en arrière-plan (généralement de 30 secondes à 5 minutes selon le fournisseur et la résolution).
3. Lorsque la vidéo est prête, OpenClaw réveille la même session avec un événement interne d'achèvement.
4. L'agent publie la vidéo terminée dans la conversation d'origine.

Pendant qu'une tâche est en cours, les appels dupliqués `video_generate` dans la même session renvoient l'état actuel de la tâche au lieu de lancer une autre génération. Utilisez `openclaw tasks list` ou `openclaw tasks show <taskId>` pour vérifier la progression depuis le CLI.

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

Prévention des doublons : si une tâche vidéo est déjà `queued` ou `running` pour la session actuelle, `video_generate` renvoie l'état de la tâche existante au lieu d'en commencer une nouvelle. Utilisez `action: "status"` pour vérifier explicitement sans déclencher une nouvelle génération.

## Providers pris en charge

| Provider              | Modèle par défaut               | Texte | Réf image                                                             | Réf vidéo          | Clé API                                  |
| --------------------- | ------------------------------- | ----- | --------------------------------------------------------------------- | ------------------ | ---------------------------------------- |
| Alibaba               | `wan2.6-t2v`                    | Oui   | Oui (URL distante)                                                    | Oui (URL distante) | `MODELSTUDIO_API_KEY`                    |
| BytePlus (1.0)        | `seedance-1-0-pro-250528`       | Oui   | Jusqu'à 2 images (modèles I2V uniquement ; première + dernière image) | Non                | `BYTEPLUS_API_KEY`                       |
| BytePlus Seedance 1.5 | `seedance-1-5-pro-251215`       | Oui   | Jusqu'à 2 images (première + dernière image via le rôle)              | Non                | `BYTEPLUS_API_KEY`                       |
| BytePlus Seedance 2.0 | `dreamina-seedance-2-0-260128`  | Oui   | Jusqu'à 9 images de référence                                         | Jusqu'à 3 vidéos   | `BYTEPLUS_API_KEY`                       |
| ComfyUI               | `workflow`                      | Oui   | 1 image                                                               | Non                | `COMFY_API_KEY` ou `COMFY_CLOUD_API_KEY` |
| fal                   | `fal-ai/minimax/video-01-live`  | Oui   | 1 image                                                               | Non                | `FAL_KEY`                                |
| Google                | `veo-3.1-fast-generate-preview` | Oui   | 1 image                                                               | 1 vidéo            | `GEMINI_API_KEY`                         |
| MiniMax               | `MiniMax-Hailuo-2.3`            | Oui   | 1 image                                                               | Non                | `MINIMAX_API_KEY`                        |
| OpenAI                | `sora-2`                        | Oui   | 1 image                                                               | 1 vidéo            | `OPENAI_API_KEY`                         |
| Qwen                  | `wan2.6-t2v`                    | Oui   | Oui (URL distante)                                                    | Oui (URL distante) | `QWEN_API_KEY`                           |
| Runway                | `gen4.5`                        | Oui   | 1 image                                                               | 1 vidéo            | `RUNWAYML_API_SECRET`                    |
| Together              | `Wan-AI/Wan2.2-T2V-A14B`        | Oui   | 1 image                                                               | Non                | `TOGETHER_API_KEY`                       |
| Vydra                 | `veo3`                          | Oui   | 1 image (`kling`)                                                     | Non                | `VYDRA_API_KEY`                          |
| xAI                   | `grok-imagine-video`            | Oui   | 1 image                                                               | 1 vidéo            | `XAI_API_KEY`                            |

Certains providers acceptent des variables d'environnement de clé API supplémentaires ou alternatives. Consultez les [pages de provider](#related) pour plus de détails.

Exécutez `video_generate action=list` pour inspecter les providers, modèles et
modes d'exécution disponibles lors de l'exécution.

### Matrice des capacités déclarées

Il s'agit du contrat de mode explicite utilisé par `video_generate`, les tests de contrat,
et le sweep en temps réel partagé.

| Provider | `generate` | `imageToVideo` | `videoToVideo` | Voies de test en direct partagées aujourd'hui                                                                                                            |
| -------- | ---------- | -------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alibaba  | Oui        | Oui            | Oui            | `generate`, `imageToVideo`; `videoToVideo` ignoré car ce provider a besoin d'URL vidéo `http(s)` distantes                                               |
| BytePlus | Oui        | Oui            | Non            | `generate`, `imageToVideo`                                                                                                                               |
| ComfyUI  | Oui        | Oui            | Non            | Non inclus dans le sweep partagé; la couverture spécifique aux flux de travail réside avec les tests Comfy                                               |
| fal      | Oui        | Oui            | Non            | `generate`, `imageToVideo`                                                                                                                               |
| Google   | Oui        | Oui            | Oui            | `generate`, `imageToVideo` ; `videoToVideo` partagé ignoré car le scan actuel Gemini/Veo avec support de tampon n'accepte pas cette entrée               |
| MiniMax  | Oui        | Oui            | Non            | `generate`, `imageToVideo`                                                                                                                               |
| OpenAI   | Oui        | Oui            | Oui            | `generate`, `imageToVideo` ; `videoToVideo` partagé ignoré car ce chemin d'org/saisie nécessite actuellement un accès de retouche/remix côté fournisseur |
| Qwen     | Oui        | Oui            | Oui            | `generate`, `imageToVideo` ; `videoToVideo` ignoré car ce fournisseur a besoin d'URL vidéo `http(s)` distantes                                           |
| Runway   | Oui        | Oui            | Oui            | `generate`, `imageToVideo` ; `videoToVideo` ne s'exécute que lorsque le modèle sélectionné est `runway/gen4_aleph`                                       |
| Together | Oui        | Oui            | Non            | `generate`, `imageToVideo`                                                                                                                               |
| Vydra    | Oui        | Oui            | Non            | `generate` ; `imageToVideo` partagé ignoré car le `veo3` groupé est text-only et le `kling` groupé nécessite une URL d'image distante                    |
| xAI      | Oui        | Oui            | Oui            | `generate`, `imageToVideo` ; `videoToVideo` ignoré car ce fournisseur a actuellement besoin d'une URL MP4 distante                                       |

## Paramètres de l'outil

### Obligatoire

| Paramètre | Type   | Description                                                                         |
| --------- | ------ | ----------------------------------------------------------------------------------- |
| `prompt`  | string | Description textuelle de la vidéo à générer (obligatoire pour `action: "generate"`) |

### Entrées de contenu

| Paramètre    | Type     | Description                                                                                                                                                     |
| ------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `image`      | string   | Image de référence unique (chemin ou URL)                                                                                                                       |
| `images`     | string[] | Plusieurs images de référence (jusqu'à 9)                                                                                                                       |
| `imageRoles` | string[] | Indices de rôle par position optionnels parallèles à la liste d'images combinée. Valeurs canoniques : `first_frame`, `last_frame`, `reference_image`            |
| `video`      | string   | Vidéo de référence unique (chemin ou URL)                                                                                                                       |
| `videos`     | string[] | Plusieurs vidéos de référence (jusqu'à 4)                                                                                                                       |
| `videoRoles` | string[] | Indications de rôle par position facultatives parallèles à la liste vidéo combinée. Valeur canonique : `reference_video`                                        |
| `audioRef`   | string   | Audio de référence unique (chemin ou URL). Utilisé par ex. pour la musique de fond ou la référence vocale lorsque le provider prend en charge les entrées audio |
| `audioRefs`  | string[] | Plusieurs audios de référence (jusqu'à 3)                                                                                                                       |
| `audioRoles` | string[] | Indications de rôle par position facultatives parallèles à la liste audio combinée. Valeur canonique : `reference_audio`                                        |

Les indications de rôle sont transmises au provider telles quelles. Les valeurs canoniques proviennent de
l'union `VideoGenerationAssetRole` mais les providers peuvent accepter des
chaînes de rôle supplémentaires. Les tableaux `*Roles` ne doivent pas avoir plus d'entrées que la
liste de référence correspondante ; les erreurs de décalage échouent avec une erreur claire.
Utilisez une chaîne vide pour laisser un emplacement non défini.

### Contrôles de style

| Paramètre         | Type    | Description                                                                                     |
| ----------------- | ------- | ----------------------------------------------------------------------------------------------- |
| `aspectRatio`     | string  | `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`, ou `adaptive`          |
| `resolution`      | string  | `480P`, `720P`, `768P`, ou `1080P`                                                              |
| `durationSeconds` | number  | Durée cible en secondes (arrondie à la valeur prise en charge la plus proche par le provider)   |
| `size`            | string  | Indication de taille lorsque le provider la prend en charge                                     |
| `audio`           | boolean | Activer l'audio généré dans la sortie lorsque pris en charge. Distinct de `audioRef*` (entrées) |
| `watermark`       | boolean | Activer le filigrane du provider lorsque pris en charge                                         |

`adaptive` est une sentinelle spécifique au provider : elle est transmise telle quelle aux providers qui déclarent `adaptive` dans leurs capacités (par exemple, BytePlus Seedance l'utilise pour détecter automatiquement le ratio à partir des dimensions de l'image d'entrée). Les providers qui ne la déclarent pas exposent la valeur via `details.ignoredOverrides` dans le résultat de l'outil afin que l'abandon soit visible.

### Avancé

| Paramètre         | Type   | Description                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `action`          | chaîne | `"generate"` (par défaut), `"status"` ou `"list"`                                                                                                                                                                                                                                                                                                                                                                   |
| `model`           | chaîne | Remplacement de provider/model (par exemple `runway/gen4.5`)                                                                                                                                                                                                                                                                                                                                                        |
| `filename`        | chaîne | Indice de nom de fichier de sortie                                                                                                                                                                                                                                                                                                                                                                                  |
| `providerOptions` | objet  | Options spécifiques au provider sous forme d'objet JSON (par exemple `{"seed": 42, "draft": true}`). Les providers qui déclarent un schéma typé valident les clés et les types ; les clés inconnues ou les inadéquations ignorent le candidat lors du repli. Les providers sans schéma déclaré reçoivent les options telles quelles. Exécutez `video_generate action=list` pour voir ce que chaque provider accepte |

Tous les providers ne prennent pas en charge tous les paramètres. OpenClaw normalise déjà la durée à la valeur la plus proche prise en charge par le provider, et il remappe également les indices de géométrie traduits, tels que la taille vers le ratio d'aspect, lorsqu'un provider de repli expose une surface de contrôle différente. Les remplacements réellement non pris en charge sont ignorés dans la mesure du possible et signalés par des avertissements dans le résultat de l'outil. Les limites strictes de capacité (telles que trop d'entrées de référence) échouent avant la soumission.

Les résultats de l'outil rapportent les paramètres appliqués. Lorsque OpenClaw remappe la durée ou la géométrie lors du repli du provider, les valeurs retournées `durationSeconds`, `size`, `aspectRatio` et `resolution` reflètent ce qui a été soumis, et `details.normalization` capture la traduction de la demande vers l'application.

Les entrées de référence sélectionnent également le mode d'exécution :

- Aucun média de référence : `generate`
- Toute référence image : `imageToVideo`
- Toute référence vidéo : `videoToVideo`
- Les entrées audio de référence ne modifient pas le mode résolu ; elles s'appliquent par-dessus le mode choisi par les références image/vidéo et ne fonctionnent qu'avec les providers qui déclarent `maxInputAudios`

Les références mixtes d'images et de vidéos ne constituent pas une surface de fonctionnalité partagée stable.
Privilégiez un seul type de référence par requête.

#### Options de repli et typées

Certains contrôles de capacité sont appliqués au niveau de la couche de repli plutôt qu'à la limite de l'outil, afin qu'une demande dépassant les limites du provider principal puisse tout de même s'exécuter sur un repli capable :

- Si le candidat actif ne déclare pas `maxInputAudios` (ou le déclare comme
  `0`), il est ignoré lorsque la demande contient des références audio, et le
  candidat suivant est essayé.
- Si le `maxDurationSeconds` du candidat actif est inférieur au `durationSeconds` demandé
  et que le candidat ne déclare pas de liste `supportedDurationSeconds`, il est ignoré.
- Si la demande contient `providerOptions` et que le candidat actif
  déclare explicitement un schéma `providerOptions` typé, le candidat est
  ignoré lorsque les clés fournies ne figurent pas dans le schéma ou si les types de valeurs ne
  correspondent pas. Les providers qui n'ont pas encore déclaré de schéma reçoivent les
  options telles quelles (transmission rétrocompatible). Un provider peut
  explicitement refuser toutes les options de provider en déclarant un schéma vide
  (`capabilities.providerOptions: {}`), ce qui provoque le même saut qu'une
  incompatibilité de type.

La première raison d'ignorer dans une demande est consignée au niveau `warn` afin que les opérateurs voient
quand leur provider principal a été ignoré ; les sauts ultérieurs sont consignés au niveau
`debug` pour garder les longues chaînes de repli silencieuses. Si chaque candidat est ignoré,
l'erreur agrégée inclut la raison de l'ignor pour chacun.

## Actions

- **generate** (par défaut) -- créer une vidéo à partir de l'invite donnée et des entrées de référence facultatives.
- **status** -- vérifier l'état de la tâche vidéo en cours pour la session actuelle sans lancer une autre génération.
- **list** -- afficher les providers, les modèles disponibles et leurs capacités.

## Sélection du modèle

Lors de la génération d'une vidéo, OpenClaw résout le modèle dans cet ordre :

1. **paramètre d'outil `model`** -- si l'agent en spécifie un lors de l'appel.
2. **`videoGenerationModel.primary`** -- depuis la configuration.
3. **`videoGenerationModel.fallbacks`** -- essayés dans l'ordre.
4. **Détection automatique** -- utilise les providers qui ont une authentification valide, en commençant par le provider par défaut actuel, puis les providers restants par ordre alphabétique.

Si un provider échoue, le candidat suivant est essayé automatiquement. Si tous les candidats échouent, l'erreur inclut les détails de chaque tentative.

Définissez `agents.defaults.mediaGenerationAutoProviderFallback: false` si vous voulez
que la génération de vidéo utilise uniquement les entrées explicites `model`, `primary` et `fallbacks`.

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

## Notes sur les providers

| Provider              | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alibaba               | Utilise le point de terminaison asynchrone DashScope/Model Studio. Les images et vidéos de référence doivent être des URL `http(s)` distantes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| BytePlus (1.0)        | Id du provider `byteplus`. Modèles : `seedance-1-0-pro-250528` (par défaut), `seedance-1-0-pro-t2v-250528`, `seedance-1-0-pro-fast-251015`, `seedance-1-0-lite-t2v-250428`, `seedance-1-0-lite-i2v-250428`. Les modèles T2V (`*-t2v-*`) n'acceptent pas d'entrées d'image ; les modèles I2V et les modèles `*-pro-*` généraux prennent en charge une seule image de référence (première image). Passez l'image de manière positionnelle ou définissez `role: "first_frame"`. Les ID de modèles T2V sont automatiquement basculés vers la variante I2V correspondante lorsqu'une image est fournie. Clés `providerOptions` prises en charge : `seed` (nombre), `draft` (booléen, force 480p), `camera_fixed` (booléen).                                                              |
| BytePlus Seedance 1.5 | Nécessite le plugin [`@openclaw/byteplus-modelark`](https://www.npmjs.com/package/@openclaw/byteplus-modelark). ID du fournisseur `byteplus-seedance15`. Modèle : `seedance-1-5-pro-251215`. Utilise l'API unifiée `content[]`. Prend en charge au maximum 2 images d'entrée (first_frame + last_frame). Toutes les entrées doivent être des `https://` distantes. Définissez `role: "first_frame"` / `"last_frame"` sur chaque image, ou passez les images de manière positionnelle. `aspectRatio: "adaptive"` détecte automatiquement le ratio depuis l'image d'entrée. `audio: true` correspond à `generate_audio`. `providerOptions.seed` (nombre) est transmis.                                                                                                                |
| BytePlus Seedance 2.0 | Nécessite le plugin [`@openclaw/byteplus-modelark`](https://www.npmjs.com/package/@openclaw/byteplus-modelark). ID du fournisseur `byteplus-seedance2`. Modèles : `dreamina-seedance-2-0-260128`, `dreamina-seedance-2-0-fast-260128`. Utilise l'API unifiée `content[]`. Prend en charge jusqu'à 9 images de référence, 3 vidéos de référence et 3 audios de référence. Toutes les entrées doivent être des `https://` distantes. Définissez `role` sur chaque élément — valeurs prises en charge : `"first_frame"`, `"last_frame"`, `"reference_image"`, `"reference_video"`, `"reference_audio"`. `aspectRatio: "adaptive"` détecte automatiquement le ratio depuis l'image d'entrée. `audio: true` correspond à `generate_audio`. `providerOptions.seed` (nombre) est transmis. |
| ComfyUI               | Exécution locale ou dans le cloud basée sur un workflow. Prend en charge texte-vers-vidéo et image-vers-vidéo via le graphe configuré.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| fal                   | Utilise un flux avec file d'attente pour les tâches de longue durée. Référence à une seule image uniquement.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Google                | Utilise Gemini/Veo. Prend en charge une image ou une vidéo de référence.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| MiniMax               | Référence à une seule image uniquement.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| OpenAI                | Seule la substitution `size` est transmise. Les autres substitutions de style (`aspectRatio`, `resolution`, `audio`, `watermark`) sont ignorées avec un avertissement.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Qwen                  | Même backend DashScope qu'Alibaba. Les entrées de référence doivent être des URL `http(s)` distantes ; les fichiers locaux sont rejetés immédiatement.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Runway                | Prend en charge les fichiers locaux via des URI de données. La vidéo vers vidéo nécessite `runway/gen4_aleph`. Les exécutions en mode texte uniquement exposent les formats d'aspect `16:9` et `9:16`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Together              | Référence d'image unique uniquement.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Vydra                 | Utilise `https://www.vydra.ai/api/v1` directement pour éviter les redirections qui suppriment l'authentification. `veo3` est fourni uniquement en mode texte vers vidéo ; `kling` nécessite une URL d'image distante.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| xAI                   | Prend en charge les flux texte vers vidéo, image vers vidéo et modification/extension de vidéo distante.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

## Modes de capacité du fournisseur

Le contrat partagé de génération vidéo permet désormais aux fournisseurs de déclarer des capacités spécifiques à un mode au lieu de simples limites agrégées plates. Les nouvelles implémentations de fournisseurs devraient privilégier les blocs de mode explicites :

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

Les champs agrégés plats tels que `maxInputImages` et `maxInputVideos` ne suffisent pas à annoncer la prise en charge du mode de transformation. Les fournisseurs doivent déclarer `generate`, `imageToVideo` et `videoToVideo` explicitement pour que les tests en direct, les tests de contrat et l'outil `video_generate` partagé puissent valider la prise en charge du mode de manière déterministe.

## Tests en direct

Couverture en direct optionnelle pour les fournisseurs groupés partagés :

```bash
OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts
```

Wrapper de dépôt :

```bash
pnpm test:live:media video
```

Ce fichier en direct charge les variables d'environnement de fournisseur manquantes depuis `~/.profile`, privilégie par défaut les clés API de l'environnement (live/env) par rapport aux profils d'authentification stockés, et exécute par défaut un test de fumée sûr pour la release :

- `generate` pour chaque fournisseur non-FAL dans le balayage
- invite homard d'une seconde
- plafond d'opérations par fournisseur à partir de `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS`
  (`180000` par défaut)

FAL est en option car la latence de la file d'attente côté fournisseur peut dominer le temps de release :

```bash
pnpm test:live:media video --video-providers fal
```

Définissez `OPENCLAW_LIVE_VIDEO_GENERATION_FULL_MODES=1` pour exécuter également les modes de transformation déclarés que le balayage partagé peut tester en toute sécurité avec des médias locaux :

- `imageToVideo` lorsque `capabilities.imageToVideo.enabled`
- `videoToVideo` quand `capabilities.videoToVideo.enabled` et que le provider/model
  accepte les entrées vidéo locales soutenues par un tampon dans le sweep partagé

Aujourd'hui, la ligne dynamique `videoToVideo` partagée couvre :

- `runway` uniquement lorsque vous sélectionnez `runway/gen4_aleph`

## Configuration

Définissez le model de génération vidéo par défaut dans votre configuration OpenClaw :

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

## Connexes

- [Aperçu des outils](/fr/tools)
- [Tâches d'arrière-plan](/fr/automation/tasks) -- suivi des tâches pour la génération vidéo asynchrone
- [Alibaba Model Studio](/fr/providers/alibaba)
- [BytePlus](/fr/concepts/model-providers#byteplus-international)
- [ComfyUI](/fr/providers/comfy)
- [fal](/fr/providers/fal)
- [Google (Gemini)](/fr/providers/google)
- [MiniMax](/fr/providers/minimax)
- [OpenAI](/fr/providers/openai)
- [Qwen](/fr/providers/qwen)
- [Runway](/fr/providers/runway)
- [Together AI](/fr/providers/together)
- [Vydra](/fr/providers/vydra)
- [xAI](/fr/providers/xai)
- [Référence de configuration](/fr/gateway/configuration-reference#agent-defaults)
- [Modèles](/fr/concepts/models)
