---
summary: "Utilisez l'API compatible OpenAI de NVIDIA dans OpenClaw"
read_when:
  - You want to use open models in OpenClaw for free
  - You need NVIDIA_API_KEY setup
title: "NVIDIA"
---

# NVIDIA

NVIDIA fournit une API compatible OpenAI sur `https://integrate.api.nvidia.com/v1` pour des modèles open source gratuitement. Authentifiez-vous avec une clé API issue de [build.nvidia.com](https://build.nvidia.com/settings/api-keys).

## Configuration CLI

Exportez la clé une fois, puis exécutez l'onboarding et définissez un modèle NVIDIA :

```bash
export NVIDIA_API_KEY="nvapi-..."
openclaw onboard --auth-choice skip
openclaw models set nvidia/nvidia/nemotron-3-super-120b-a12b
```

Si vous passez encore `--token`, gardez à l'esprit qu'elle atterrit dans l'historique du shell et la sortie `ps` ; préférez la variable d'environnement lorsque c'est possible.

## Extrait de configuration

```json5
{
  env: { NVIDIA_API_KEY: "nvapi-..." },
  models: {
    providers: {
      nvidia: {
        baseUrl: "https://integrate.api.nvidia.com/v1",
        api: "openai-completions",
      },
    },
  },
  agents: {
    defaults: {
      model: { primary: "nvidia/nvidia/nemotron-3-super-120b-a12b" },
    },
  },
}
```

## ID de modèle

| Référence du modèle                        | Nom                          | Contexte | Max output |
| ------------------------------------------ | ---------------------------- | -------- | ---------- |
| `nvidia/nvidia/nemotron-3-super-120b-a12b` | NVIDIA Nemotron 3 Super 120B | 262,144  | 8,192      |
| `nvidia/moonshotai/kimi-k2.5`              | Kimi K2.5                    | 262,144  | 8,192      |
| `nvidia/minimaxai/minimax-m2.5`            | Minimax M2.5                 | 196,608  | 8,192      |
| `nvidia/z-ai/glm5`                         | GLM 5                        | 202,752  | 8,192      |

## Remarques

- Point de terminaison `/v1` compatible OpenAI ; utilisez une clé API issue de [build.nvidia.com](https://build.nvidia.com/).
- Le fournisseur s'active automatiquement lorsque `NVIDIA_API_KEY` est défini.
- Le catalogue fourni est statique ; les coûts sont par défaut `0` dans la source.
