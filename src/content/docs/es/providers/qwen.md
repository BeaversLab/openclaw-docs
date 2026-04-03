---
summary: "Usa los modelos Qwen a través de Alibaba Cloud Model Studio"
read_when:
  - You want to use Qwen with OpenClaw
  - You previously used Qwen OAuth
title: "Qwen"
---

# Qwen

<Warning>

**Qwen OAuth ha sido eliminado.** La integración de OAuth de nivel gratuito
(`qwen-portal`) que usaba los endpoints `portal.qwen.ai` ya no está disponible.
Consulte el [Issue #49557](https://github.com/openclaw/openclaw/issues/49557) para obtener
más información.

</Warning>

## Recomendado: Model Studio (Plan de Cloud Coding de Alibaba Cloud)

Use [Model Studio](/en/providers/qwen_modelstudio) para obtener acceso oficialmente admitido a los
modelos Qwen (Qwen 3.5 Plus, GLM-4.7, Kimi K2.5 y más).

```bash
# Global endpoint
openclaw onboard --auth-choice modelstudio-api-key

# China endpoint
openclaw onboard --auth-choice modelstudio-api-key-cn
```

Consulte [Model Studio](/en/providers/qwen_modelstudio) para obtener detalles completos de la configuración.
