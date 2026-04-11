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
# Generic API-key setup with endpoint auto-detection
openclaw onboard --auth-choice zai-api-key

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
  agents: { defaults: { model: { primary: "zai/glm-5.1" } } },
}
```

`zai-api-key` permet à OpenClaw de détecter le point de terminaison Z.AI correspondant à partir de la clé et d'appliquer automatiquement l'URL de base correcte. Utilisez les choix régionaux explicites lorsque vous souhaitez forcer un plan de codage spécifique ou une surface API générale.

## Catalogue GLM inclus

OpenClaw fournit actuellement le fournisseur `zai` inclus avec :

- `glm-5.1`
- `glm-5`
- `glm-5-turbo`
- `glm-5v-turbo`
- `glm-4.7`
- `glm-4.7-flash`
- `glm-4.7-flashx`
- `glm-4.6`
- `glm-4.6v`
- `glm-4.5`
- `glm-4.5-air`
- `glm-4.5-flash`
- `glm-4.5v`

## Notes

- Les modèles GLM sont disponibles sous la forme `zai/<model>` (exemple : `zai/glm-5`).
- Référence de modèle groupée par défaut : `zai/glm-5.1`
- Les ids `glm-5*` inconnus sont toujours résolus en avant sur le chemin du fournisseur inclus en synthétisant les métadonnées propres au fournisseur à partir du modèle `glm-4.7` lorsque l'id correspond à la forme actuelle de la famille GLM-5.
- `tool_stream` est activé par défaut pour le streaming d'appels d'outil Z.AI. Définissez `agents.defaults.models["zai/<model>"].params.tool_stream` sur `false` pour le désactiver.
- Voir [/providers/glm](/en/providers/glm) pour la présentation de la famille de modèles.
- Z.AI utilise l'authentification Bearer avec votre clé API.
