---
summary: "Utilisez l'API compatible Anthropic de Synthetic dans API"
read_when:
  - You want to use Synthetic as a model provider
  - You need a Synthetic API key or base URL setup
title: "Synthetic"
---

# Synthetic

Synthetic expose des points de terminaison compatibles Anthropic. OpenClaw l'enregistre en tant que
`synthetic` provider et utilise l'API Messages de Anthropic.

## Configuration rapide

1. Définissez `SYNTHETIC_API_KEY` (ou exécutez l'assistant ci-dessous).
2. Exécuter l'onboarding :

```bash
openclaw onboard --auth-choice synthetic-api-key
```

Le model par défaut est défini sur :

```
synthetic/hf:MiniMaxAI/MiniMax-M2.5
```

## Exemple de configuration

```json5
{
  env: { SYNTHETIC_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "synthetic/hf:MiniMaxAI/MiniMax-M2.5" },
      models: { "synthetic/hf:MiniMaxAI/MiniMax-M2.5": { alias: "MiniMax M2.5" } },
    },
  },
  models: {
    mode: "merge",
    providers: {
      synthetic: {
        baseUrl: "https://api.synthetic.new/anthropic",
        apiKey: "${SYNTHETIC_API_KEY}",
        api: "anthropic-messages",
        models: [
          {
            id: "hf:MiniMaxAI/MiniMax-M2.5",
            name: "MiniMax M2.5",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 192000,
            maxTokens: 65536,
          },
        ],
      },
    },
  },
}
```

Remarque : Le client OpenClaw de Anthropic ajoute `/v1` à l'URL de base, utilisez donc
`https://api.synthetic.new/anthropic` (pas `/anthropic/v1`). Si Synthetic modifie
son URL de base, redéfinissez `models.providers.synthetic.baseUrl`.

## Catalogue de models

Tous les models ci-dessous utilisent le coût `0` (entrée/sortie/cache).

| ID du model                                            | Fenêtre de contexte | Max tokens | Raisonnement | Entrée        |
| ------------------------------------------------------ | ------------------- | ---------- | ------------ | ------------- |
| `hf:MiniMaxAI/MiniMax-M2.5`                            | 192000              | 65536      | false        | texte         |
| `hf:moonshotai/Kimi-K2-Thinking`                       | 256000              | 8192       | true         | texte         |
| `hf:zai-org/GLM-4.7`                                   | 198000              | 128000     | false        | texte         |
| `hf:deepseek-ai/DeepSeek-R1-0528`                      | 128000              | 8192       | false        | texte         |
| `hf:deepseek-ai/DeepSeek-V3-0324`                      | 128000              | 8192       | false        | texte         |
| `hf:deepseek-ai/DeepSeek-V3.1`                         | 128000              | 8192       | false        | texte         |
| `hf:deepseek-ai/DeepSeek-V3.1-Terminus`                | 128000              | 8192       | false        | texte         |
| `hf:deepseek-ai/DeepSeek-V3.2`                         | 159000              | 8192       | false        | texte         |
| `hf:meta-llama/Llama-3.3-70B-Instruct`                 | 128000              | 8192       | false        | texte         |
| `hf:meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8` | 524000              | 8192       | false        | texte         |
| `hf:moonshotai/Kimi-K2-Instruct-0905`                  | 256000              | 8192       | false        | texte         |
| `hf:moonshotai/Kimi-K2.5`                              | 256000              | 8192       | true         | texte + image |
| `hf:openai/gpt-oss-120b`                               | 128000              | 8192       | false        | texte         |
| `hf:Qwen/Qwen3-235B-A22B-Instruct-2507`                | 256000              | 8192       | false        | texte         |
| `hf:Qwen/Qwen3-Coder-480B-A35B-Instruct`               | 256000              | 8192       | false        | texte         |
| `hf:Qwen/Qwen3-VL-235B-A22B-Instruct`                  | 250000              | 8192       | false        | texte + image |
| `hf:zai-org/GLM-4.5`                                   | 128000              | 128000     | false        | texte         |
| `hf:zai-org/GLM-4.6`                                   | 198000              | 128000     | false        | texte         |
| `hf:zai-org/GLM-5`                                     | 256000              | 128000     | true         | texte + image |
| `hf:deepseek-ai/DeepSeek-V3`                           | 128000              | 8192       | false        | texte         |
| `hf:Qwen/Qwen3-235B-A22B-Thinking-2507`                | 256000              | 8192       | true         | texte         |

## Notes

- Les références de modèle utilisent `synthetic/<modelId>`.
- Si vous activez une liste blanche de modèles (`agents.defaults.models`), ajoutez chaque modèle que
  vous prévoyez d'utiliser.
- Voir [Model providers](/en/concepts/model-providers) pour les règles du provider.
