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
- `grok-4.20-experimental-beta-0304-reasoning`
- `grok-4.20-experimental-beta-0304-non-reasoning`
- `grok-code-fast-1`

Le plugin résout également par anticipation les identifiants `grok-4*` et `grok-code-fast*` plus récents lorsqu'ils suivent la même forme d'API.

## Recherche Web

Le fournisseur de recherche Web `grok` inclus utilise également `XAI_API_KEY` :

```bash
openclaw config set tools.web.search.provider grok
```

## Limites connues

- L'authentification se fait actuellement uniquement par clé API. Il n'y a pas encore de flux OAuth / code d'appareil xAI dans OpenClaw.
- `grok-4.20-multi-agent-experimental-beta-0304` n'est pas pris en charge sur le chemin normal du fournisseur xAI car il nécessite une surface d'API en amont différente du transport xAI standard d'OpenClaw.
- Les outils natifs côté serveur xAI tels que `x_search` et `code_execution` ne sont pas encore des fonctionnalités de première classe du fournisseur de modèles dans le plugin inclus.

## Notes

- OpenClaw applique automatiquement les correctifs de compatibilité des schémas d'outils et des appels d'outils spécifiques à xAI sur le chemin d'exécution partagé.
- Pour une vue d'ensemble plus large des fournisseurs, consultez [Modèles de fournisseurs](/fr/providers/index).

import fr from "/components/footer/fr.mdx";

<fr />
