---
summary: "Usa Z.AI (modelos GLM) con OpenClaw"
read_when:
  - You want Z.AI / GLM models in OpenClaw
  - You need a simple ZAI_API_KEY setup
title: "Z.AI"
---

# Z.AI

Z.AI es la plataforma de API para modelos **GLM**. Proporciona API REST para GLM y usa claves de API
para la autenticación. Crea tu clave de API en la consola de Z.AI. OpenClaw usa el proveedor `zai`
con una clave de API de Z.AI.

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
- `tool_stream` está habilitado por defecto para la transmisión de llamadas a herramientas de Z.AI. Establece
  `agents.defaults.models["zai/<model>"].params.tool_stream` en `false` para desactivarlo.
- Consulta [/providers/glm](/en/providers/glm) para obtener una descripción general de la familia de modelos.
- Z.AI utiliza autenticación Bearer con tu clave de API.
