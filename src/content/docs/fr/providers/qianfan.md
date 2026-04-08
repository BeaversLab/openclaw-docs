---
summary: "Utilisez l'API unifiée de Qianfan pour accéder à de nombreux modèles dans OpenClaw"
read_when:
  - You want a single API key for many LLMs
  - You need Baidu Qianfan setup guidance
title: "Qianfan"
---

# Guide du fournisseur Qianfan

Qianfan est la plateforme MaaS de Baidu, qui fournit une **API unifiée** qui achemine les requêtes vers de nombreux modèles derrière un seul
point de terminaison et clé d'API. Elle est compatible OpenAI, donc la plupart des SDK OpenAI fonctionnent en changeant l'URL de base.

## Prérequis

1. Un compte Baidu Cloud avec accès à l'API Qianfan
2. Une clé API depuis la console Qianfan
3. OpenClaw installé sur votre système

## Obtenir votre clé API

1. Visitez la [Console Qianfan](https://console.bce.baidu.com/qianfan/ais/console/apiKey)
2. Créez une nouvelle application ou sélectionnez-en une existante
3. Générez une clé API (format : `bce-v3/ALTAK-...`)
4. Copiez la clé API pour l'utiliser avec OpenClaw

## Configuration CLI

```bash
openclaw onboard --auth-choice qianfan-api-key
```

## Extrait de configuration

```json5
{
  env: { QIANFAN_API_KEY: "bce-v3/ALTAK-..." },
  agents: {
    defaults: {
      model: { primary: "qianfan/deepseek-v3.2" },
      models: {
        "qianfan/deepseek-v3.2": { alias: "QIANFAN" },
      },
    },
  },
  models: {
    providers: {
      qianfan: {
        baseUrl: "https://qianfan.baidubce.com/v2",
        api: "openai-completions",
        models: [
          {
            id: "deepseek-v3.2",
            name: "DEEPSEEK V3.2",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 98304,
            maxTokens: 32768,
          },
          {
            id: "ernie-5.0-thinking-preview",
            name: "ERNIE-5.0-Thinking-Preview",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 119000,
            maxTokens: 64000,
          },
        ],
      },
    },
  },
}
```

## Notes

- Référence de modèle groupée par défaut : `qianfan/deepseek-v3.2`
- URL de base par défaut : `https://qianfan.baidubce.com/v2`
- Le catalogue groupé inclut actuellement `deepseek-v3.2` et `ernie-5.0-thinking-preview`
- Ajoutez ou remplacez `models.providers.qianfan` uniquement lorsque vous avez besoin d'une URL de base personnalisée ou des métadonnées du modèle
- Qianfan passe par le chemin de transport compatible OpenAI, et non par le façonnage des requêtes natif OpenAI

## Documentation associée

- [Configuration OpenClaw](/en/gateway/configuration)
- [Fournisseurs de modèles](/en/concepts/model-providers)
- [Configuration de l'agent](/en/concepts/agent)
- [Documentation de l'API Qianfan](https://cloud.baidu.com/doc/qianfan-api/s/3m7of64lb)
