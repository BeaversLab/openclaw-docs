---
summary: "Aperçu de la famille de modèles GLM + comment l'utiliser dans OpenClaw"
read_when:
  - You want GLM models in OpenClaw
  - You need the model naming convention and setup
title: "Modèles GLM"
---

# Modèles GLM

GLM est une **famille de modèles** (et non une entreprise) disponible via la plateforme Z.AI. Dans OpenClaw, les modèles GLM sont accessibles via le provider `zai` et des IDs de modèle comme `zai/glm-5`.

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

- Les versions et la disponibilité de GLM peuvent changer ; consultez la documentation de Z.AI pour les dernières informations.
- Les IDs de modèle incluent notamment `glm-5`, `glm-4.7` et `glm-4.6`.
- Pour plus de détails sur le provider, voir [/providers/zai](/fr/providers/zai).
