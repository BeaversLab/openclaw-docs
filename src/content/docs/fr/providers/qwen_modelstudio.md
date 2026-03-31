---
title: "Qwen / Model Studio"
summary: "Configuration du Model Studio Alibaba Cloud (Standard pay-as-you-go et Coding Plan, points de terminaison de région double)"
read_when:
  - You want to use Qwen (Alibaba Cloud Model Studio) with OpenClaw
  - You need the API key env var for Model Studio
  - You want to use the Standard (pay-as-you-go) or Coding Plan endpoint
---

# Qwen / Model Studio (Alibaba Cloud)

Le provider Model Studio donne accès aux modèles d'Alibaba Cloud, notamment Qwen
et aux modèles tiers hébergés sur la plateforme. Deux plans de facturation sont pris en charge :
**Standard** (pay-as-you-go) et **Coding Plan** (abonnement).

- Fournisseur : `modelstudio`
- Auth : `MODELSTUDIO_API_KEY`
- API : OpenAI-compatible

## Quick start

### Standard (pay-as-you-go)

```bash
# China endpoint
openclaw onboard --auth-choice modelstudio-standard-api-key-cn

# Global/Intl endpoint
openclaw onboard --auth-choice modelstudio-standard-api-key
```

### Coding Plan (abonnement)

```bash
# China endpoint
openclaw onboard --auth-choice modelstudio-api-key-cn

# Global/Intl endpoint
openclaw onboard --auth-choice modelstudio-api-key
```

Après l'onboarding, définissez un modèle par défaut :

```json5
{
  agents: {
    defaults: {
      model: { primary: "modelstudio/qwen3.5-plus" },
    },
  },
}
```

## Types de plans et points de terminaison

| Plan                        | Région | Choix d'authentification          | Point de terminaison                             |
| --------------------------- | ------ | --------------------------------- | ------------------------------------------------ |
| Standard (pay-as-you-go)    | Chine  | `modelstudio-standard-api-key-cn` | `dashscope.aliyuncs.com/compatible-mode/v1`      |
| Standard (pay-as-you-go)    | Global | `modelstudio-standard-api-key`    | `dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| Plan de codage (abonnement) | Chine  | `modelstudio-api-key-cn`          | `coding.dashscope.aliyuncs.com/v1`               |
| Coding Plan (abonnement)    | Global | `modelstudio-api-key`             | `coding-intl.dashscope.aliyuncs.com/v1`          |

Le provider sélectionne automatiquement le point de terminaison en fonction de votre choix d'authentification. Vous pouvez le remplacer par un `baseUrl` personnalisé dans la configuration.

## Obtenez votre clé API

- **Chine** : [bailian.console.aliyun.com](https://bailian.console.aliyun.com/)
- **Global/Intl** : [modelstudio.console.alibabacloud.com](https://modelstudio.console.alibabacloud.com/)

## Modèles disponibles

- **qwen3.5-plus** (par défaut) — Qwen 3.5 Plus
- **qwen3-coder-plus**, **qwen3-coder-next** — modèles de code Qwen
- **GLM-5** — Modèles GLM via Alibaba
- **Kimi K2.5** — Moonshot AI via Alibaba
- **MiniMax-M2.5** — MiniMax via Alibaba

Certains modèles (qwen3.5-plus, kimi-k2.5) prennent en charge la saisie d'images. Les fenêtres de contexte vont de 200K à 1M jetons.

## Remarque sur l'environnement

Si le Gateway s'exécute en tant que démon (launchd/systemd), assurez-vous que `MODELSTUDIO_API_KEY` est disponible pour ce processus (par exemple, dans `~/.openclaw/.env` ou via `env.shellEnv`).
