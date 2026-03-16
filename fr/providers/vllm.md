---
summary: "Exécuter OpenClaw avec vLLM (serveur local compatible OpenAI)"
read_when:
  - You want to run OpenClaw against a local vLLM server
  - You want OpenAI-compatible /v1 endpoints with your own models
title: "vLLM"
---

# vLLM

vLLM peut servir des modèles open source (et certains personnalisés) via une API HTTP compatible **OpenAI**. API peut se connecter à vLLM en utilisant l'OpenClaw `openai-completions`.

OpenClaw peut également **découvrir automatiquement** les modèles disponibles depuis vLLM lorsque vous activez l'option avec `VLLM_API_KEY` (n'importe quelle valeur fonctionne si votre serveur n'applique pas l'authentification) et que vous ne définissez pas d'entrée `models.providers.vllm` explicite.

## Quick start

1. Démarrez vLLM avec un serveur compatible OpenAI.

Votre URL de base doit exposer des points de terminaison `/v1` (par ex. `/v1/models`, `/v1/chat/completions`). vLLM s'exécute généralement sur :

- `http://127.0.0.1:8000/v1`

2. Activer l'option (n'importe quelle valeur fonctionne si aucune authentification n'est configurée) :

```bash
export VLLM_API_KEY="vllm-local"
```

3. Sélectionnez un modèle (remplacez par l'un de vos ID de modèle vLLM) :

```json5
{
  agents: {
    defaults: {
      model: { primary: "vllm/your-model-id" },
    },
  },
}
```

## Model discovery (implicit provider)

Lorsque `VLLM_API_KEY` est défini (ou qu'un profil d'authentification existe) et que vous **ne définissez pas** `models.providers.vllm`, OpenClaw interrogera :

- `GET http://127.0.0.1:8000/v1/models`

...et convertira les ID renvoyés en entrées de modèle.

Si vous définissez `models.providers.vllm` explicitement, la découverte automatique est ignorée et vous devez définir les modèles manuellement.

## Explicit configuration (manual models)

Utilisez une configuration explicite lorsque :

- vLLM s'exécute sur un hôte/port différent.
- Vous souhaitez épingler les valeurs `contextWindow`/`maxTokens`.
- Votre serveur nécessite une véritable clé API (ou vous souhaitez contrôler les en-têtes).

```json5
{
  models: {
    providers: {
      vllm: {
        baseUrl: "http://127.0.0.1:8000/v1",
        apiKey: "${VLLM_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "your-model-id",
            name: "Local vLLM Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

## Troubleshooting

- Vérifiez que le serveur est accessible :

```bash
curl http://127.0.0.1:8000/v1/models
```

- Si les requêtes échouent avec des erreurs d'authentification, définissez une vraie `VLLM_API_KEY` correspondant à la configuration de votre serveur, ou configurez le fournisseur explicitement sous `models.providers.vllm`.

import fr from "/components/footer/fr.mdx";

<fr />
