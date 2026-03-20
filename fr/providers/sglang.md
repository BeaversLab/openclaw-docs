---
summary: "Exécuter OpenClaw avec SGLang (serveur auto-hébergé compatible OpenAI)"
read_when:
  - Vous souhaitez exécuter OpenClaw sur un serveur SGLang local
  - Vous souhaitez des points de terminaison /v1 compatibles OpenAI avec vos propres modèles
title: "SGLang"
---

# SGLang

SGLang peut servir des modèles open source via une API HTTP compatible **OpenAI**.
OpenClaw peut se connecter à SGLang en utilisant l'API `openai-completions`.

OpenClaw peut également **découvrir automatiquement** les modèles disponibles depuis SGLang lorsque vous activez
l'option avec `SGLANG_API_KEY` (n'importe quelle valeur fonctionne si votre serveur n'applique pas l'authentification)
et que vous ne définissez pas d'entrée `models.providers.sglang` explicite.

## Quick start

1. Démarrez SGLang avec un serveur compatible OpenAI.

Votre URL de base doit exposer des points de terminaison `/v1` (par exemple `/v1/models`,
`/v1/chat/completions`). SGLang s'exécute généralement sur :

- `http://127.0.0.1:30000/v1`

2. Activez l'option (n'importe quelle valeur fonctionne si aucune authentification n'est configurée) :

```bash
export SGLANG_API_KEY="sglang-local"
```

3. Exécutez l'intégration (onboarding) et choisissez `SGLang`, ou définissez un modèle directement :

```bash
openclaw onboard
```

```json5
{
  agents: {
    defaults: {
      model: { primary: "sglang/your-model-id" },
    },
  },
}
```

## Model discovery (implicit provider)

Lorsque `SGLANG_API_KEY` est défini (ou qu'un profil d'authentification existe) et que vous **ne**
définissez **pas** `models.providers.sglang`, OpenClaw interrogera :

- `GET http://127.0.0.1:30000/v1/models`

et convertira les ID renvoyés en entrées de modèle.

Si vous définissez `models.providers.sglang` explicitement, la découverte automatique est ignorée et
vous devez définir les modèles manuellement.

## Explicit configuration (manual models)

Utilisez une configuration explicite lorsque :

- SGLang s'exécute sur un hôte/port différent.
- Vous souhaitez épingler les valeurs `contextWindow`/`maxTokens`.
- Votre serveur nécessite une véritable clé API (ou vous souhaitez contrôler les en-têtes).

```json5
{
  models: {
    providers: {
      sglang: {
        baseUrl: "http://127.0.0.1:30000/v1",
        apiKey: "${SGLANG_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "your-model-id",
            name: "Local SGLang Model",
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
curl http://127.0.0.1:30000/v1/models
```

- Si les requêtes échouent avec des erreurs d'authentification, définissez une véritable `SGLANG_API_KEY` correspondant à
  la configuration de votre serveur, ou configurez le fournisseur explicitement sous
  `models.providers.sglang`.

import en from "/components/footer/en.mdx";

<en />
