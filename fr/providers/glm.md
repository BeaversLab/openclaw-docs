---
summary: "Présentation de la famille de modèles GLM + comment l'utiliser dans OpenClaw"
read_when:
  - Vous souhaitez des modèles GLM dans OpenClaw
  - Vous avez besoin de la convention de nommage et de la configuration des modèles
title: "Modèles GLM"
---

# Modèles GLM

GLM est une **famille de modèles** (et non une entreprise) disponible via la plateforme Z.AI. Dans OpenClaw, les modèles
GLM sont accessibles via le fournisseur `zai` et des ID de modèle tels que `zai/glm-5`.

## Configuration CLI

```bash
# Coding Plan Global, recommended for Coding Plan users
openclaw onboard --auth-choice zai-coding-global

# Coding Plan CN (China region), recommended for Coding Plan users
openclaw onboard --auth-choice zai-coding-cn

# General API
openclaw onboard --auth-choice zai-global

# General API CN (China region)
openclaw onboard --auth-choice zai-cn
```

## Extrait de configuration

```json5
{
  env: { ZAI_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "zai/glm-5" } } },
}
```

## Remarques

- Les versions et la disponibilité des GLM peuvent changer ; consultez la documentation de Z.AI pour les dernières informations.
- Les ID de modèle incluent `glm-5`, `glm-4.7` et `glm-4.6`.
- Pour plus de détails sur le fournisseur, consultez [/providers/zai](/fr/providers/zai).

import fr from "/components/footer/fr.mdx";

<fr />
