---
summary: "Utiliser Z.AI (modèles GLM) avec OpenClaw"
read_when:
  - You want Z.AI / GLM models in OpenClaw
  - You need a simple ZAI_API_KEY setup
title: "Z.AI"
---

# Z.AI

Z.AI est la plateforme API pour les modèles **GLM**. Elle fournit des API REST pour GLM et utilise des clés API pour l'authentification. Créez votre clé API dans la console Z.AI. OpenClaw utilise le provider `zai` avec une clé API Z.AI.

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

## Notes

- Les modèles GLM sont disponibles en tant que `zai/<model>` (exemple : `zai/glm-5`).
- `tool_stream` est activé par défaut pour le streaming d'appels d'outil Z.AI. Définissez `agents.defaults.models["zai/<model>"].params.tool_stream` sur `false` pour le désactiver.
- Voir [/providers/glm](/en/providers/glm) pour la vue d'ensemble de la famille de modèles.
- Z.AI utilise l'authentification Bearer avec votre clé API.
