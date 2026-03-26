---
title: "Model Studio"
summary: "Configuration de Model Studio Alibaba Cloud (Coding Plan, points de terminaison régionaux doubles)"
read_when:
  - You want to use Alibaba Cloud Model Studio with OpenClaw
  - You need the API key env var for Model Studio
---

# Model Studio (Alibaba Cloud)

Le fournisseur Model Studio donne accès aux modèles du Coding Plan d'Alibaba Cloud,
y compris Qwen et les modèles tiers hébergés sur la plateforme.

- Fournisseur : `modelstudio`
- Auth : `MODELSTUDIO_API_KEY`
- API : compatible OpenAI

## Quick start

1. Définir la clé API :

```bash
openclaw onboard --auth-choice modelstudio-api-key
```

2. Définir un modèle par défaut :

```json5
{
  agents: {
    defaults: {
      model: { primary: "modelstudio/qwen3.5-plus" },
    },
  },
}
```

## Points de terminaison régionaux

Model Studio possède deux points de terminaison basés sur la région :

| Région     | Point de terminaison                 |
| ---------- | ------------------------------------ |
| Chine (CN) | `coding.dashscope.aliyuncs.com`      |
| Mondial    | `coding-intl.dashscope.aliyuncs.com` |

Le fournisseur sélectionne automatiquement en fonction du choix d'authentification (`modelstudio-api-key` pour
le mondial, `modelstudio-api-key-cn` pour la Chine). Vous pouvez remplacer par un
`baseUrl` personnalisé dans la configuration.

## Modèles disponibles

- **qwen3.5-plus** (par défaut) - Qwen 3.5 Plus
- **qwen3-max** - Qwen 3 Max
- Série **qwen3-coder** - modèles de codage Qwen
- **GLM-5**, **GLM-4.7** - modèles GLM via Alibaba
- **Kimi K2.5** - Moonshot AI via Alibaba
- **MiniMax-M2.5** - MiniMax via Alibaba

La plupart des modèles prennent en charge la saisie d'images. Les fenêtres de contexte vont de 200K à 1M jetons.

## Remarque sur l'environnement

Si le Gateway s'exécute en tant que démon (launchd/systemd), assurez-vous
que `MODELSTUDIO_API_KEY` est disponible pour ce processus (par exemple, dans
`~/.openclaw/.env` ou via `env.shellEnv`).

import fr from "/components/footer/fr.mdx";

<fr />
