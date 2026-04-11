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

`zai-api-key` permite que OpenClaw detecte el punto de conexión Z.AI correspondiente desde la clave y
aplique la URL base correcta automáticamente. Utilice las opciones regionales explícitas cuando
quiera forzar un Plan de Codificación específico o una superficie de API general.

## Catálogo GLM incluido

Actualmente, OpenClaw inicializa el proveedor `zai` incluido con:

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

- Los modelos GLM están disponibles como `zai/<model>` (ejemplo: `zai/glm-5`).
- Referencia del modelo incluido por defecto: `zai/glm-5.1`
- Los ids `glm-5*` desconocidos aún se resuelven hacia adelante en la ruta del proveedor incluido
  sintetizando metadatos propios del proveedor a partir de la plantilla `glm-4.7` cuando el id
  coincide con la forma actual de la familia GLM-5.
- `tool_stream` está habilitado por defecto para el streaming de llamadas a herramientas de Z.AI. Establezca
  `agents.defaults.models["zai/<model>"].params.tool_stream` en `false` para desactivarlo.
- Consulte [/providers/glm](/en/providers/glm) para obtener una descripción general de la familia de modelos.
- Z.AI utiliza autenticación Bearer con su clave API.
