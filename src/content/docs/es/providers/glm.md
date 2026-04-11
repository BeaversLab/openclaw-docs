---
summary: "Resumen de la familia de modelos GLM + cómo usarla en OpenClaw"
read_when:
  - You want GLM models in OpenClaw
  - You need the model naming convention and setup
title: "Modelos GLM"
---

# Modelos GLM

GLM es una **familia de modelos** (no una empresa) disponible a través de la plataforma Z.AI. En OpenClaw, los modelos
GLM se acceden mediante el proveedor `zai` e IDs de modelo como `zai/glm-5`.

## Configuración de CLI

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

## Fragmento de configuración

```json5
{
  env: { ZAI_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "zai/glm-5.1" } } },
}
```

`zai-api-key` permite a OpenClaw detectar el punto final de Z.AI coincidente desde la clave y aplicar la URL base correcta automáticamente. Use las opciones regionales explícitas cuando desee forzar un Plan de Codificación específico o una superficie de API general.

## Modelos GLM incluidos actualmente

OpenClaw actualmente inicializa el proveedor incluido `zai` con estas referencias GLM:

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

## Notas

- Las versiones y disponibilidad de GLM pueden cambiar; consulte la documentación de Z.AI para lo más reciente.
- La referencia del modelo incluido por defecto es `zai/glm-5.1`.
- Para más detalles del proveedor, consulte [/providers/zai](/en/providers/zai).
