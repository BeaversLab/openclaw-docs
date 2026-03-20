---
summary: "Usa Z.AI (modelos GLM) con OpenClaw"
read_when:
  - Quieres modelos Z.AI / GLM en OpenClaw
  - Necesitas una configuración sencilla de ZAI_API_KEY
title: "Z.AI"
---

# Z.AI

Z.AI es la plataforma API para modelos **GLM**. Proporciona API REST para GLM y utiliza claves API
para la autenticación. Crea tu clave API en la consola de Z.AI. OpenClaw usa el proveedor `zai`
con una clave API de Z.AI.

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

- Los modelos GLM están disponibles como `zai/<model>` (ejemplo: `zai/glm-5`).
- `tool_stream` está habilitado por defecto para el streaming de llamadas a herramientas de Z.AI. Establece
  `agents.defaults.models["zai/<model>"].params.tool_stream` en `false` para deshabilitarlo.
- Consulta [/providers/glm](/es/providers/glm) para ver la descripción general de la familia de modelos.
- Z.AI usa autenticación Bearer con tu clave API.

import en from "/components/footer/en.mdx";

<en />
