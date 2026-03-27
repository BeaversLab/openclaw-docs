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

## Catalogue actuel des modèles inclus

OpenClaw inclut désormais ces familles de modèles xAI prêtes à l'emploi :

- `grok-4`, `grok-4-0709`
- `grok-4-fast-reasoning`, `grok-4-fast-non-reasoning`
- `grok-4-1-fast-reasoning`, `grok-4-1-fast-non-reasoning`
- `grok-4.20-reasoning`, `grok-4.20-non-reasoning`
- `grok-code-fast-1`

Le plugin résout également par anticipation les identifiants plus récents de `grok-4*` et de `grok-code-fast*` lorsqu'ils suivent la même forme de API.

## Recherche web

Le provider de recherche web intégré `grok` utilise également `XAI_API_KEY` :

```bash
openclaw config set tools.web.search.provider grok
```

## Limites connues

- L'authentification se fait aujourd'hui uniquement par clé d'API. Il n'y a pas encore de flux OAuth / code d'appareil xAI dans OpenClaw.
- `grok-4.20-multi-agent-experimental-beta-0304` n'est pas pris en charge sur le chemin normal du provider xAI car il nécessite une surface d'API en amont différente du transport xAI standard de OpenClaw.
- Les outils natifs côté serveur xAI tels que `x_search` et `code_execution` ne sont pas encore des fonctionnalités de premier ordre du provider de modèles dans le plugin intégré.

## Notes

- OpenClaw applique automatiquement les correctifs de compatibilité du schéma d'outils et des appels d'outils spécifiques à xAI sur le chemin d'exécution partagé.
- Pour une vue d'ensemble plus large des providers, consultez [Model providers](/fr/providers/index).

import fr from "/components/footer/fr.mdx";

<fr />
