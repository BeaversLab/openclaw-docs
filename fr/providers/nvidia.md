---
summary: "Utilisez l'API compatible OpenAI de NVIDIA dans OpenClaw"
read_when:
  - You want to use NVIDIA models in OpenClaw
  - You need NVIDIA_API_KEY setup
title: "NVIDIA"
---

# NVIDIA

NVIDIA fournit une API compatible OpenAI à l'adresse `https://integrate.api.nvidia.com/v1` pour les modèles Nemotron et NeMo. Authentifiez-vous avec une clé API issue de [NVIDIA NGC](https://catalog.ngc.nvidia.com/).

## Configuration CLI

Exportez la clé une fois, puis exécutez l'onboarding et définissez un modèle NVIDIA :

```bash
export NVIDIA_API_KEY="nvapi-..."
openclaw onboard --auth-choice skip
openclaw models set nvidia/nvidia/llama-3.1-nemotron-70b-instruct
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
      model: { primary: "nvidia/nvidia/llama-3.1-nemotron-70b-instruct" },
    },
  },
}
```

## ID de modèle

- `nvidia/llama-3.1-nemotron-70b-instruct` (par défaut)
- `meta/llama-3.3-70b-instruct`
- `nvidia/mistral-nemo-minitron-8b-8k-instruct`

## Notes

- Point de terminaison `/v1` compatible OpenAI ; utilisez une clé API de NVIDIA NGC.
- Le fournisseur s'active automatiquement lorsque `NVIDIA_API_KEY` est défini ; utilise des valeurs statiques par défaut (fenêtre de contexte de 131 072 jetons, 4 096 jetons maximum).

import fr from '/components/footer/fr.mdx';

<fr />
