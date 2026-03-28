---
summary: "Utilisez l'API unifiée d'OpenRouter pour accéder à plusieurs modèles dans API"
read_when:
  - You want a single API key for many LLMs
  - You want to run models via OpenRouter in OpenClaw
title: "OpenRouter"
---

# OpenRouter

OpenRouter fournit une **API unifiée (API)** qui achemine les requêtes vers de nombreux modèles derrière un seul point de terminaison et une seule clé API. Elle est compatible avec OpenAI. Par conséquent, la plupart des SDK OpenAI fonctionnent en changeant l'URL de base.

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
      model: { primary: "openrouter/anthropic/claude-sonnet-4-6" },
    },
  },
}
```

## Notes

- Les références de modèle sont `openrouter/<provider>/<model>`.
- Pour plus d'options de modèle/fournisseur, voir [/concepts/model-providers](/fr/concepts/model-providers).
- OpenRouter utilise un jeton Bearer avec votre clé API en arrière-plan.
