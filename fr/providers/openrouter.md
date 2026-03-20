---
summary: "Utilisez l'API unifiée d'OpenRouter pour accéder à plusieurs modèles dans API"
read_when:
  - Vous souhaitez une seule clé API pour plusieurs LLM
  - Vous souhaitez exécuter des modèles via OpenRouter dans OpenClaw
title: "OpenRouter"
---

# OpenRouter

OpenRouter fournit une **API unifiée** qui achemine les requêtes vers de nombreux modèles derrière un seul
point de terminaison et une clé API. Il est compatible avec OpenAI, donc la plupart des SDK OpenAI fonctionnent en changeant l'URL de base.

## Configuration CLI

```bash
openclaw onboard --auth-choice apiKey --token-provider openrouter --token "$OPENROUTER_API_KEY"
```

## Extrait de configuration

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      model: { primary: "openrouter/anthropic/claude-sonnet-4-5" },
    },
  },
}
```

## Remarques

- Les références de modèle sont `openrouter/<provider>/<model>`.
- Pour plus d'options de modèle/fournisseur, consultez [/concepts/model-providers](/fr/concepts/model-providers).
- OpenRouter utilise un jeton Bearer avec votre clé API en arrière-plan.

import en from "/components/footer/en.mdx";

<en />
