---
summary: "Utiliser les modèles Qwen via Alibaba Cloud Model Studio"
read_when:
  - You want to use Qwen with OpenClaw
  - You previously used Qwen OAuth
title: "Qwen"
---

# Qwen

<Warning>

**Qwen OAuth a été supprimé.** L'intégration OAuth de niveau gratuit
(`qwen-portal`) qui utilisait les points de terminaison `portal.qwen.ai` n'est plus disponible.
Voir [Issue #49557](https://github.com/openclaw/openclaw/issues/49557) pour
plus de contexte.

</Warning>

## Recommandé : Model Studio (Plan de codage Alibaba Cloud)

Utilisez [Model Studio](/en/providers/modelstudio) pour un accès officiellement pris en charge aux modèles Qwen (Qwen 3.5 Plus, GLM-4.7, Kimi K2.5, MiniMax M2.5, et plus).

```bash
# Global endpoint
openclaw onboard --auth-choice modelstudio-api-key

# China endpoint
openclaw onboard --auth-choice modelstudio-api-key-cn
```

Voir [Model Studio](/en/providers/modelstudio) pour tous les détails de configuration.
