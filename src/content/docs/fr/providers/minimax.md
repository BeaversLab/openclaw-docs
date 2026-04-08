---
summary: "Utiliser les modèles MiniMax dans OpenClaw"
read_when:
  - You want MiniMax models in OpenClaw
  - You need MiniMax setup guidance
title: "MiniMax"
---

# MiniMax

Le fournisseur OpenClaw de MiniMax est réglé par défaut sur **MiniMax M2.7**.

MiniMax fournit également :

- synthèse vocale groupée via T2A v2
- compréhension d'image groupée via `MiniMax-VL-01`
- génération de musique groupée via `music-2.5+`
- `web_search` groupé via l'API de recherche MiniMax Coding Plan

Répartition du provider :

- `minimax` : provider de texte par clé API, plus génération d'image, compréhension d'image, synthèse vocale et recherche Web groupées
- `minimax-portal` : provider de texte OAuth, plus génération d'image et compréhension d'image groupées

## Modèles disponibles

- `MiniMax-M2.7` : modèle de raisonnement hébergé par défaut.
- `MiniMax-M2.7-highspeed` : niveau de raisonnement M2.7 plus rapide.
- `image-01` : modèle de génération d'image (génération et modification image-vers-image).

## Génération d'image

Le plugin MiniMax enregistre le modèle `image-01` pour l'outil `image_generate`. Il prend en charge :

- **La génération texte-vers-image** avec contrôle du rapport d'aspect.
- **La modification image-vers-image** (référence au sujet) avec contrôle du rapport d'aspect.
- Jusqu'à **9 images de sortie** par requête.
- Jusqu'à **1 image de référence** par requête de modification.
- Rapports d'aspect pris en charge : `1:1`, `16:9`, `4:3`, `3:2`, `2:3`, `3:4`, `9:16`, `21:9`.

Pour utiliser MiniMax pour la génération d'images, définissez-le comme provider de génération d'images :

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: { primary: "minimax/image-01" },
    },
  },
}
```

Le plugin utilise la même authentification `MINIMAX_API_KEY` ou OAuth que les modèles de texte. Aucune configuration supplémentaire n'est nécessaire si MiniMax est déjà configuré.

`minimax` et `minimax-portal` enregistrent tous deux `image_generate` avec le même
modèle `image-01`. Les configurations par clé API utilisent `MINIMAX_API_KEY` ; les configurations OAuth peuvent utiliser
le chemin d'authentification groupé `minimax-portal` à la place.

Lorsque l'intégration ou la configuration de la clé API écrit des entrées `models.providers.minimax` explicites, OpenClaw matérialise `MiniMax-M2.7` et `MiniMax-M2.7-highspeed` avec `input: ["text", "image"]`.

Le catalogue de texte MiniMax intégré reste une métadonnée texte uniquement jusqu'à ce que cette configuration de fournisseur explicite existe. La compréhension d'images est exposée séparément par le fournisseur de média `MiniMax-VL-01` appartenant au plugin.

Voir [Génération d'images](/en/tools/image-generation) pour les paramètres d'outil partagés, la sélection du fournisseur et le comportement de basculement.

## Génération de musique

Le plugin `minimax` intégré enregistre également la génération de musique via l'outil `music_generate` partagé.

- Modèle de musique par défaut : `minimax/music-2.5+`
- Prend également en charge `minimax/music-2.5` et `minimax/music-2.0`
- Contrôles de prompt : `lyrics`, `instrumental`, `durationSeconds`
- Format de sortie : `mp3`
- Les exécutions sauvegardées par session se détachent via le flux de tâches/statut partagé, y compris `action: "status"`

Pour utiliser MiniMax comme fournisseur de musique par défaut :

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "minimax/music-2.5+",
      },
    },
  },
}
```

Voir [Génération de musique](/en/tools/music-generation) pour les paramètres d'outil partagés, la sélection du fournisseur et le comportement de basculement.

## Génération vidéo

Le plugin `minimax` intégré enregistre également la génération vidéo via l'outil `video_generate` partagé.

- Modèle vidéo par défaut : `minimax/MiniMax-Hailuo-2.3`
- Modes : flux texte-vers-vidéo et flux de référence à image unique
- Prend en charge `aspectRatio` et `resolution`

Pour utiliser MiniMax comme fournisseur vidéo par défaut :

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "minimax/MiniMax-Hailuo-2.3",
      },
    },
  },
}
```

Voir [Génération vidéo](/en/tools/video-generation) pour les paramètres d'outil partagés, la sélection du fournisseur et le comportement de basculement.

## Compréhension d'images

Le plugin MiniMax enregistre la compréhension d'images séparément du catalogue de texte :

- `minimax` : modèle d'image par défaut `MiniMax-VL-01`
- `minimax-portal` : modèle d'image par défaut `MiniMax-VL-01`

C'est pourquoi le routage automatique des médias peut utiliser la compréhension d'image MiniMax même
lorsque le catalogue de fournisseur de texte groupé affiche encore des références de chat M2.7 en mode texte uniquement.

## Recherche Web

Le plugin MiniMax enregistre également `web_search` via l'API de recherche Coding Plan MiniMax.

- ID du fournisseur : `minimax`
- Résultats structurés : titres, URL, extraits, requêtes associées
- Variable d'environnement préférée : `MINIMAX_CODE_PLAN_KEY`
- Alias d'environnement accepté : `MINIMAX_CODING_API_KEY`
- Retour de compatibilité : `MINIMAX_API_KEY` lorsqu'il pointe déjà vers un jeton coding-plan
- Réutilisation de la région : `plugins.entries.minimax.config.webSearch.region`, puis `MINIMAX_API_HOST`, puis les URL de base du fournisseur MiniMax
- La recherche reste sur l'ID de fournisseur `minimax` ; la configuration CN/mondiale OAuth peut toujours orienter indirectement la région via `models.providers.minimax-portal.baseUrl`

La configuration se trouve sous `plugins.entries.minimax.config.webSearch.*`.
Voir [Recherche MiniMax](/en/tools/minimax-search).

## Choisir une configuration

### MiniMax OAuth (Coding Plan) - recommandé

**Idéal pour :** configuration rapide avec le Coding Plan MiniMax via OAuth, aucune clé API requise.

Authentifiez-vous avec le choix régional explicite OAuth :

```bash
openclaw onboard --auth-choice minimax-global-oauth
# or
openclaw onboard --auth-choice minimax-cn-oauth
```

Mappage des choix :

- `minimax-global-oauth` : Utilisateurs internationaux (`api.minimax.io`)
- `minimax-cn-oauth` : Utilisateurs en Chine (`api.minimaxi.com`)

Consultez le README du package plugin MiniMax dans le dépôt OpenClaw pour plus de détails.

### MiniMax M2.7 (clé API)

**Idéal pour :** MiniMax hébergé avec l'Anthropic compatible API.

Configurer via le CLI :

- Onboarding interactif :

```bash
openclaw onboard --auth-choice minimax-global-api
# or
openclaw onboard --auth-choice minimax-cn-api
```

- `minimax-global-api` : Utilisateurs internationaux (`api.minimax.io`)
- `minimax-cn-api` : Utilisateurs en Chine (`api.minimaxi.com`)

```json5
{
  env: { MINIMAX_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "minimax/MiniMax-M2.7" } } },
  models: {
    mode: "merge",
    providers: {
      minimax: {
        baseUrl: "https://api.minimax.io/anthropic",
        apiKey: "${MINIMAX_API_KEY}",
        api: "anthropic-messages",
        models: [
          {
            id: "MiniMax-M2.7",
            name: "MiniMax M2.7",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0.3, output: 1.2, cacheRead: 0.06, cacheWrite: 0.375 },
            contextWindow: 204800,
            maxTokens: 131072,
          },
          {
            id: "MiniMax-M2.7-highspeed",
            name: "MiniMax M2.7 Highspeed",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0.6, output: 2.4, cacheRead: 0.06, cacheWrite: 0.375 },
            contextWindow: 204800,
            maxTokens: 131072,
          },
        ],
      },
    },
  },
}
```

Sur le chemin de flux compatible Anthropic, OpenClaw désactive désormais par défaut la réflexion MiniMax
à moins que vous ne définissiez explicitement `thinking` vous-même. Le point de terminaison de flux de MiniMax
émet `reasoning_content` dans des deltas de style OpenAI
au lieu des blocs de réflexion natifs Anthropic, ce qui peut entraîner la fuite du raisonnement interne
dans la sortie visible s'il est laissé activé implicitement.

### MiniMax M2.7 en tant que repli (exemple)

**Idéal pour :** conserver votre modèle le plus puissant de la dernière génération comme principal, basculer sur MiniMax M2.7 en cas de échec.
L'exemple ci-dessous utilise Opus comme modèle principal concret ; remplacez-le par votre modèle principal de dernière génération préféré.

```json5
{
  env: { MINIMAX_API_KEY: "sk-..." },
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": { alias: "primary" },
        "minimax/MiniMax-M2.7": { alias: "minimax" },
      },
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["minimax/MiniMax-M2.7"],
      },
    },
  },
}
```

## Configurer via `openclaw configure`

Utilisez l'assistant de configuration interactif pour définir MiniMax sans modifier le JSON :

1. Exécutez `openclaw configure`.
2. Sélectionnez **Model/auth**.
3. Choisissez une option d'authentification **MiniMax**.
4. Choisissez votre modèle par défaut lorsque vous y êtes invité.

Options d'authentification MiniMax actuelles dans l'assistant/CLI :

- `minimax-global-oauth`
- `minimax-cn-oauth`
- `minimax-global-api`
- `minimax-cn-api`

## Options de configuration

- `models.providers.minimax.baseUrl` : privilégiez `https://api.minimax.io/anthropic` (compatible Anthropic) ; `https://api.minimax.io/v1` est facultatif pour les payloads compatibles OpenAI.
- `models.providers.minimax.api` : privilégiez `anthropic-messages` ; `openai-completions` est facultatif pour les payloads compatibles OpenAI.
- `models.providers.minimax.apiKey` : clé MiniMax API (`MINIMAX_API_KEY`).
- `models.providers.minimax.models` : définissez `id`, `name`, `reasoning`, `contextWindow`, `maxTokens`, `cost`.
- `agents.defaults.models` : alias des modèles que vous souhaitez dans la liste autorisée.
- `models.mode` : gardez `merge` si vous souhaitez ajouter MiniMax aux modèles intégrés.

## Notes

- Les références de modèles suivent le chemin d'authentification :
  - Configuration par clé API : `minimax/<model>`
  - Configuration OAuth : `minimax-portal/<model>`
- Modèle de chat par défaut : `MiniMax-M2.7`
- Modèle de chat alternatif : `MiniMax-M2.7-highspeed`
- Sur `api: "anthropic-messages"`, OpenClaw injecte
  `thinking: { type: "disabled" }` sauf si la réflexion est déjà explicitement définie dans
  les paramètres/la configuration.
- `/fast on` ou `params.fastMode: true` réécrit `MiniMax-M2.7` en
  `MiniMax-M2.7-highspeed` sur le chemin de flux compatible Anthropic.
- Onboarding et la configuration directe de la clé API écrivent des définitions de modèle explicites avec
  `input: ["text", "image"]` pour les deux variantes M2.7
- Le catalogue de fournisseur groupé expose actuellement les références de chat en tant que métadonnées
  texte uniquement jusqu'à ce qu'une configuration explicite du fournisseur MiniMax existe
- API d'utilisation du Coding Plan : `https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains` (nécessite une clé de coding plan).
- OpenClaw normalise l'utilisation du coding-plan MiniMax au même affichage `% left`
  utilisé par d'autres fournisseurs. Les champs bruts `usage_percent` / `usagePercent`
  de MiniMax sont le quota restant, pas le quota consommé, donc OpenClaw les inverse.
  Les champs basés sur le compte priment lorsqu'ils sont présents. Lorsque la API renvoie `model_remains`,
  OpenClaw préfère l'entrée du modèle de chat, dérive l'étiquette de fenêtre à partir de
  `start_time` / `end_time` si nécessaire, et inclut le nom du modèle sélectionné
  dans l'étiquette du plan pour que les fenêtres du coding-plan soient plus faciles à distinguer.
- Les instantanés d'utilisation traitent `minimax`, `minimax-cn` et `minimax-portal` comme la
  même surface de quota MiniMax et préfèrent le MiniMax OAuth stocké avant de revenir
  aux variables d'environnement de clé Coding Plan.
- Mettez à jour les valeurs de prix dans `models.json` si vous avez besoin d'un suivi précis des coûts.
- Lien de parrainage pour le Coding Plan MiniMax (10 % de réduction) : [https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
- Voir [/concepts/model-providers](/en/concepts/model-providers) pour les règles des fournisseurs.
- Utilisez `openclaw models list` pour confirmer l'identifiant actuel du fournisseur, puis changez avec
  `openclaw models set minimax/MiniMax-M2.7` ou
  `openclaw models set minimax-portal/MiniMax-M2.7`.

## Dépannage

### "Unknown model: minimax/MiniMax-M2.7"

Cela signifie généralement que **le fournisseur MiniMax n'est pas configuré** (aucune entrée de
fournisseur correspondante et aucun profil de clé d'auth/env MiniMax trouvé). Un correctif pour cette
détection est prévu dans **2026.1.12**. Corrigez en :

- Mettre à niveau vers **2026.1.12** (ou exécuter depuis la source `main`), puis redémarrer la passerelle.
- Exécuter `openclaw configure` et sélectionner une option d'authentification **MiniMax**, ou
- Ajouter manuellement le bloc `models.providers.minimax` ou
  `models.providers.minimax-portal` correspondant, ou
- Définir `MINIMAX_API_KEY`, `MINIMAX_OAUTH_TOKEN`, ou un profil d'authentification MiniMax
  afin que le fournisseur correspondant puisse être injecté.

Assurez-vous que l'identifiant du modèle est **sensible à la casse** :

- Chemin de la clé API : `minimax/MiniMax-M2.7` ou `minimax/MiniMax-M2.7-highspeed`
- Chemin OAuth : `minimax-portal/MiniMax-M2.7` ou
  `minimax-portal/MiniMax-M2.7-highspeed`

Vérifiez ensuite avec :

```bash
openclaw models list
```
