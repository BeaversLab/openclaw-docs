---
summary: "Utiliser les modèles Grok xAI dans OpenClaw"
read_when:
  - You want to use Grok models in OpenClaw
  - You are configuring xAI auth or model ids
title: "xAI"
---

# xAI

OpenClaw est fourni avec un plugin de fournisseur `xai` pour les modèles Grok.

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

OpenClaw utilise désormais l'API Réponses xAI comme transport xAI intégré. Le même
`XAI_API_KEY` peut également alimenter `web_search` basé sur Grok, des `x_search` de première classe,
et des `code_execution` distantes.
Si vous stockez une clé xAI sous `plugins.entries.xai.config.webSearch.apiKey`,
le fournisseur de modèle xAI intégré réutilise désormais également cette clé en guise de repli.
Le réglage des `code_execution` se trouve sous `plugins.entries.xai.config.codeExecution`.

## Catalogue de modèles groupés actuel

OpenClaw inclut désormais ces familles de modèles xAI prêtes à l'emploi :

- `grok-4`, `grok-4-0709`
- `grok-4-fast-reasoning`, `grok-4-fast-non-reasoning`
- `grok-4-1-fast-reasoning`, `grok-4-1-fast-non-reasoning`
- `grok-4.20-reasoning`, `grok-4.20-non-reasoning`
- `grok-code-fast-1`

Le plugin résout également les nouveaux identifiants `grok-4*` et `grok-code-fast*` de manière anticipée lorsqu'ils suivent la même structure API.

## Recherche Web

Le provider web-search `grok` utilise également `XAI_API_KEY` :

```bash
openclaw config set tools.web.search.provider grok
```

## Limites connues

- L'authentification se fait actuellement uniquement par clé API. Il n'y a pas encore de flux OAuth / code d'appareil xAI dans OpenClaw.
- `grok-4.20-multi-agent-experimental-beta-0304` n'est pas pris en charge sur le chemin normal du fournisseur xAI car il nécessite une surface API amont différente du transport xAI standard d'OpenClaw.

## Notes

- OpenClaw applique automatiquement les correctifs de compatibilité du schéma d'outils et des appels d'outils spécifiques à xAI sur le chemin d'exécution partagé.
- `web_search`, `x_search` et `code_execution` sont exposés en tant qu'outils OpenClaw. OpenClaw active la fonctionnalité intégrée xAI spécifique dont il a besoin dans chaque demande d'outil au lieu d'attacher tous les outils natifs à chaque tour de chat.
- `x_search` et `code_execution` sont détenus par le plugin xAI groupé plutôt que codés en dur dans le runtime du model de base.
- `code_execution` est une exécution à distance dans le bac à sable xAI, et non une exécution locale [`exec`](/en/tools/exec).
- Pour une vue d'ensemble plus large des providers, consultez [Model providers](/en/providers/index).
