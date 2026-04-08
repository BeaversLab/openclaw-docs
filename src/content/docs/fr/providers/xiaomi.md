---
summary: "Utilisez les modèles Xiaomi MiMo avec OpenClaw"
read_when:
  - You want Xiaomi MiMo models in OpenClaw
  - You need XIAOMI_API_KEY setup
title: "Xiaomi MiMo"
---

# Xiaomi MiMo

Xiaomi MiMo est la plateforme API pour les modèles **MiMo**. OpenClaw utilise le point de terminaison compatible Xiaomi de OpenAI avec une authentification par clé API. Créez votre clé API dans la
[console Xiaomi MiMo](https://platform.xiaomimimo.com/#/console/api-keys), puis configurez le
provider `xiaomi` inclus avec cette clé.

## Catalogue intégré

- URL de base : `https://api.xiaomimimo.com/v1`
- API : `openai-completions`
- Autorisation : `Bearer $XIAOMI_API_KEY`

| Réf modèle             | Entrée       | Contexte  | Max sortie | Notes                                  |
| ---------------------- | ------------ | --------- | ---------- | -------------------------------------- |
| `xiaomi/mimo-v2-flash` | texte        | 262 144   | 8 192      | Modèle par défaut                      |
| `xiaomi/mimo-v2-pro`   | texte        | 1 048 576 | 32 000     | Activé pour le raisonnement            |
| `xiaomi/mimo-v2-omni`  | texte, image | 262 144   | 32 000     | Multimodal activé pour le raisonnement |

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
        baseUrl: "https://api.xiaomimimo.com/v1",
        api: "openai-completions",
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
          {
            id: "mimo-v2-pro",
            name: "Xiaomi MiMo V2 Pro",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 1048576,
            maxTokens: 32000,
          },
          {
            id: "mimo-v2-omni",
            name: "Xiaomi MiMo V2 Omni",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 32000,
          },
        ],
      },
    },
  },
}
```

## Notes

- Réf du modèle par défaut : `xiaomi/mimo-v2-flash`.
- Modèles intégrés supplémentaires : `xiaomi/mimo-v2-pro`, `xiaomi/mimo-v2-omni`.
- Le provider est injecté automatiquement lorsque `XIAOMI_API_KEY` est défini (ou si un profil d'authentification existe).
- Voir [/concepts/model-providers](/en/concepts/model-providers) pour les règles du provider.
