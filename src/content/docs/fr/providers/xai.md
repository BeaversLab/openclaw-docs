---
summary: "Utiliser les modèles Grok xAI dans OpenClaw"
read_when:
  - You want to use Grok models in OpenClaw
  - You are configuring xAI auth or model ids
title: "xAI"
---

# xAI

OpenClaw est livré avec un plugin de fournisseur `xai` intégré pour les modèles Grok.

## Configuration

1. Créez une clé API dans la console xAI.
2. Définissez `XAI_API_KEY`, ou exécutez :

```bash
openclaw onboard --auth-choice xai-api-key
```

3. Choisissez un modèle tel que :

```json5
{
  agents: { defaults: { model: { primary: "xai/grok-4" } } },
}
```

OpenClaw utilise désormais l'API de réponses xAI en tant que transport xAI intégré. Le même
`XAI_API_KEY` peut également alimenter les `web_search` basées sur Grok, les `x_search` de premier ordre,
et les `code_execution` distantes.
Si vous stockez une clé xAI sous `plugins.entries.xai.config.webSearch.apiKey`,
le fournisseur de modèle xAI intégré réutilise désormais également cette clé en guise de solution de repli.
Le réglage des `code_execution` se trouve sous `plugins.entries.xai.config.codeExecution`.

## Catalogue de modèles groupés actuel

OpenClaw inclut désormais ces familles de modèles xAI prêtes à l'emploi :

- `grok-3`, `grok-3-fast`, `grok-3-mini`, `grok-3-mini-fast`
- `grok-4`, `grok-4-0709`
- `grok-4-fast`, `grok-4-fast-non-reasoning`
- `grok-4-1-fast`, `grok-4-1-fast-non-reasoning`
- `grok-4.20-beta-latest-reasoning`, `grok-4.20-beta-latest-non-reasoning`
- `grok-code-fast-1`

Le plugin résout également par anticipation les identifiants `grok-4*` et `grok-code-fast*` plus récents lorsqu'ils
suivent la même forme d'API.

Notes sur les modèles rapides :

- `grok-4-fast`, `grok-4-1-fast` et les variantes `grok-4.20-beta-*` sont les
  références Grok actuelles compatibles avec les images dans le catalogue intégré.
- `/fast on` ou `agents.defaults.models["xai/<model>"].params.fastMode: true`
  réécrit les requêtes xAI natives comme suit :
  - `grok-3` -> `grok-3-fast`
  - `grok-3-mini` -> `grok-3-mini-fast`
  - `grok-4` -> `grok-4-fast`
  - `grok-4-0709` -> `grok-4-fast`

Les alias de compatibilité hérités se normalisent toujours vers les identifiants intégrés canoniques. Par
exemple :

- `grok-4-fast-reasoning` -> `grok-4-fast`
- `grok-4-1-fast-reasoning` -> `grok-4-1-fast`
- `grok-4.20-reasoning` -> `grok-4.20-beta-latest-reasoning`
- `grok-4.20-non-reasoning` -> `grok-4.20-beta-latest-non-reasoning`

## Recherche Web

Le provider de recherche Web `grok` inclus utilise également `XAI_API_KEY` :

```bash
openclaw config set tools.web.search.provider grok
```

## Génération vidéo

Le plugin `xai` inclus enregistre également la génération vidéo via l'outil partagé
`video_generate`.

- Modèle vidéo par défaut : `xai/grok-imagine-video`
- Modes : flux texte-vers-vidéo, image-vers-vidéo, et modification/extension de vidéo à distance
- Prend en charge `aspectRatio` et `resolution`
- Limite actuelle : les tampons vidéo locaux ne sont pas acceptés ; utilisez des URLs `http(s)`
  distantes pour les entrées de référence/modification vidéo

Pour utiliser xAI comme provider vidéo par défaut :

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "xai/grok-imagine-video",
      },
    },
  },
}
```

Voir [Génération vidéo](/en/tools/video-generation) pour les paramètres de l'outil partagé,
la sélection du provider et le comportement de basculement.

## Limites connues

- L'authentification se fait uniquement par clé API aujourd'hui. Il n'y a pas encore de flux OAuth / code d'appareil xAI dans OpenClaw.
- `grok-4.20-multi-agent-experimental-beta-0304` n'est pas pris en charge sur le chemin normal du provider xAI car il nécessite une surface API en amont différente du transport xAI standard de OpenClaw.

## Notes

- OpenClaw applique automatiquement des correctifs de compatibilité pour les schémas d'outils et les appels d'outils spécifiques à xAI sur le chemin d'exécution partagé.
- Les requêtes xAI natives utilisent `tool_stream: true` par défaut. Définissez
  `agents.defaults.models["xai/<model>"].params.tool_stream` sur `false` pour
  le désactiver.
- Le wrapper xAI inclus supprime les indicateurs de schéma d'outil stricts non pris en charge et
  les clés de payload de raisonnement avant d'envoyer des requêtes xAI natives.
- `web_search`, `x_search` et `code_execution` sont exposés en tant qu'outils OpenClaw. OpenClaw active l'outil intégré xAI spécifique dont il a besoin à l'intérieur de chaque requête d'outil au lieu d'attacher tous les outils natifs à chaque tour de discussion.
- `x_search` et `code_execution` sont détenus par le plugin xAI inclus plutôt que d'être codés en dur dans le moteur d'exécution du model principal.
- `code_execution` est une exécution de bac à sable xAI à distance, et non une exécution locale [`exec`](/en/tools/exec).
- Pour une vue d'ensemble plus large des providers, consultez [Model providers](/en/providers/index).
