---
title: "Together AI"
summary: "Configuration de Together AI (auth + sélection de modèle)"
read_when:
  - Vous souhaitez utiliser Together AI avec OpenClaw
  - Vous avez besoin de la clé d'env var API ou du choix d'auth CLI
---

# Together AI

[Together AI](https://together.ai) fournit l'accès aux principaux modèles open source, notamment Llama, DeepSeek, Kimi, et bien d'autres, via une API unifiée.

- Fournisseur : `together`
- Auth : `TOGETHER_API_KEY`
- API : compatible OpenAI

## Quick start

1. Définissez la clé API (recommandé : stockez-la pour le Gateway) :

```bash
openclaw onboard --auth-choice together-api-key
```

2. Définir un modèle par défaut :

```json5
{
  agents: {
    defaults: {
      model: { primary: "together/moonshotai/Kimi-K2.5" },
    },
  },
}
```

## Exemple non interactif

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice together-api-key \
  --together-api-key "$TOGETHER_API_KEY"
```

Cela définira `together/moonshotai/Kimi-K2.5` comme modèle par défaut.

## Note sur l'environnement

Si le Gateway s'exécute en tant que démon (launchd/systemd), assurez-vous que `TOGETHER_API_KEY`
est disponible pour ce processus (par exemple, dans `~/.openclaw/.env` ou via
`env.shellEnv`).

## Modèles disponibles

Together AI donne accès à de nombreux modèles open source populaires :

- **GLM 4.7 Fp8** - Modèle par défaut avec une fenêtre de contexte de 200K
- **Llama 3.3 70B Instruct Turbo** - Suivi rapide et efficace des instructions
- **Llama 4 Scout** - Modèle de vision avec compréhension d'image
- **Llama 4 Maverick** - Vision avancée et raisonnement
- **DeepSeek V3.1** - Modèle puissant de codage et de raisonnement
- **DeepSeek R1** - Modèle avancé de raisonnement
- **Kimi K2 Instruct** - Modèle haute performance avec une fenêtre de contexte de 262K

Tous les modèles prennent en charge les complétions de chat standard et sont compatibles avec l'OpenAI API.

import en from "/components/footer/en.mdx";

<en />
