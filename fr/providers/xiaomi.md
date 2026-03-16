---
summary: "Utiliser Xiaomi MiMo (mimo-v2-flash) avec OpenClaw"
read_when:
  - You want Xiaomi MiMo models in OpenClaw
  - You need XIAOMI_API_KEY setup
title: "Xiaomi MiMo"
---

# Xiaomi MiMo

Xiaomi MiMo est la plateforme API pour les modèles **MiMo**. Elle fournit des API REST compatibles avec les formats OpenAI et Anthropic et utilise des clés API pour l'authentification. Créez votre clé API dans la [console Xiaomi MiMo](https://platform.xiaomimimo.com/#/console/api-keys). OpenClaw utilise le provider `xiaomi` avec une clé API Xiaomi MiMo.

## Aperçu du modèle

- **mimo-v2-flash** : fenêtre de contexte de 262144 tokens, compatible avec l'API Messages Anthropic.
- URL de base : `https://api.xiaomimimo.com/anthropic`
- Autorisation : `Bearer $XIAOMI_API_KEY`

## Configuration CLI

```bash
openclaw onboard --auth-choice xiaomi-api-key
# or non-interactive
openclaw onboard --auth-choice xiaomi-api-key --xiaomi-api-key "$XIAOMI_API_KEY"
```

## Extrait de configuration

```json5
{
  env: { XIAOMI_API_KEY: "your-key" },
  agents: { defaults: { model: { primary: "xiaomi/mimo-v2-flash" } } },
  models: {
    mode: "merge",
    providers: {
      xiaomi: {
        baseUrl: "https://api.xiaomimimo.com/anthropic",
        api: "anthropic-messages",
        apiKey: "XIAOMI_API_KEY",
        models: [
          {
            id: "mimo-v2-flash",
            name: "Xiaomi MiMo V2 Flash",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

## Notes

- Référence du modèle : `xiaomi/mimo-v2-flash`.
- Le provider est injecté automatiquement lorsque `XIAOMI_API_KEY` est défini (ou qu'un profil d'authentification existe).
- Voir [/concepts/model-providers](/fr/concepts/model-providers) pour les règles du provider.

import fr from "/components/footer/fr.mdx";

<fr />
