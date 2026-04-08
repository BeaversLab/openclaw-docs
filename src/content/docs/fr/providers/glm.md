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
  agents: { defaults: { model: { primary: "zai/glm-5" } } },
}
```

`zai-api-key` permet à OpenClaw de détecter le point de terminaison Z.AI correspondant à partir de la clé et
d'appliquer automatiquement l'URL de base correcte. Utilisez les choix régionaux explicites lorsque
vous souhaitez forcer un plan de codage spécifique ou une surface API générale.

## Modèles GLM groupés actuels

OpenClaw initialise actuellement le fournisseur `zai` groupé avec ces références GLM :

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

- Les versions et la disponibilité de GLM peuvent changer ; consultez la documentation de Z.AI pour les dernières informations.
- La référence du modèle groupé par défaut est `zai/glm-5`.
- Pour plus de détails sur le fournisseur, consultez [/providers/zai](/en/providers/zai).
