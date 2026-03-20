---
summary: "Resumen de la familia de modelos GLM + cómo usarla en OpenClaw"
read_when:
  - Quieres modelos GLM en OpenClaw
  - Necesitas la convención de nomenclatura y configuración del modelo
title: "Modelos GLM"
---

# Modelos GLM

GLM es una **familia de modelos** (no una empresa) disponible a través de la plataforma Z.AI. En OpenClaw, los modelos
GLM se acceden a través del proveedor `zai` y los IDs de modelo como `zai/glm-5`.

## Configuración de CLI

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

## Fragmento de configuración

```json5
{
  env: { ZAI_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "zai/glm-5" } } },
}
```

## Notas

- Las versiones y disponibilidad de GLM pueden cambiar; consulta los documentos de Z.AI para lo más reciente.
- Los IDs de modelo de ejemplo incluyen `glm-5`, `glm-4.7` y `glm-4.6`.
- Para obtener detalles del proveedor, consulta [/providers/zai](/es/providers/zai).

import en from "/components/footer/en.mdx";

<en />
