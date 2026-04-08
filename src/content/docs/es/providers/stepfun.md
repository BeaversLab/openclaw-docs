---
summary: "Usa los modelos de StepFun con OpenClaw"
read_when:
  - You want StepFun models in OpenClaw
  - You need StepFun setup guidance
title: "StepFun"
---

# StepFun

OpenClaw incluye un complemento de proveedor StepFun integrado con dos ids de proveedor:

- `stepfun` para el endpoint estándar
- `stepfun-plan` para el endpoint Step Plan

Los catálogos integrados actualmente difieren por superficie:

- Estándar: `step-3.5-flash`
- Step Plan: `step-3.5-flash`, `step-3.5-flash-2603`

## Resumen de regiones y endpoints

- Endpoint estándar de China: `https://api.stepfun.com/v1`
- Endpoint estándar global: `https://api.stepfun.ai/v1`
- Endpoint Step Plan de China: `https://api.stepfun.com/step_plan/v1`
- Endpoint Step Plan global: `https://api.stepfun.ai/step_plan/v1`
- Variable de entorno de autenticación: `STEPFUN_API_KEY`

Use una clave de China con los endpoints `.com` y una clave global con los endpoints
`.ai`.

## Configuración de CLI

Configuración interactiva:

```bash
openclaw onboard
```

Elija una de estas opciones de autenticación:

- `stepfun-standard-api-key-cn`
- `stepfun-standard-api-key-intl`
- `stepfun-plan-api-key-cn`
- `stepfun-plan-api-key-intl`

Ejemplos no interactivos:

```bash
openclaw onboard --auth-choice stepfun-standard-api-key-intl --stepfun-api-key "$STEPFUN_API_KEY"
openclaw onboard --auth-choice stepfun-plan-api-key-intl --stepfun-api-key "$STEPFUN_API_KEY"
```

## Referencias de modelos

- Modelo estándar predeterminado: `stepfun/step-3.5-flash`
- Modelo Step Plan predeterminado: `stepfun-plan/step-3.5-flash`
- Modelo alternativo Step Plan: `stepfun-plan/step-3.5-flash-2603`

## Catálogos integrados

Estándar (`stepfun`):

| Referencia de modelo     | Contexto | Salida máxima | Notas                          |
| ------------------------ | -------- | ------------- | ------------------------------ |
| `stepfun/step-3.5-flash` | 262,144  | 65,536        | Modelo estándar predeterminado |

Step Plan (`stepfun-plan`):

| Referencia de modelo               | Contexto | Salida máxima | Notas                           |
| ---------------------------------- | -------- | ------------- | ------------------------------- |
| `stepfun-plan/step-3.5-flash`      | 262,144  | 65,536        | Modelo Step Plan predeterminado |
| `stepfun-plan/step-3.5-flash-2603` | 262,144  | 65,536        | Modelo Step Plan adicional      |

## Fragmentos de configuración

Proveedor estándar:

```json5
{
  env: { STEPFUN_API_KEY: "your-key" },
  agents: { defaults: { model: { primary: "stepfun/step-3.5-flash" } } },
  models: {
    mode: "merge",
    providers: {
      stepfun: {
        baseUrl: "https://api.stepfun.ai/v1",
        api: "openai-completions",
        apiKey: "${STEPFUN_API_KEY}",
        models: [
          {
            id: "step-3.5-flash",
            name: "Step 3.5 Flash",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 65536,
          },
        ],
      },
    },
  },
}
```

Proveedor Step Plan:

```json5
{
  env: { STEPFUN_API_KEY: "your-key" },
  agents: { defaults: { model: { primary: "stepfun-plan/step-3.5-flash" } } },
  models: {
    mode: "merge",
    providers: {
      "stepfun-plan": {
        baseUrl: "https://api.stepfun.ai/step_plan/v1",
        api: "openai-completions",
        apiKey: "${STEPFUN_API_KEY}",
        models: [
          {
            id: "step-3.5-flash",
            name: "Step 3.5 Flash",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 65536,
          },
          {
            id: "step-3.5-flash-2603",
            name: "Step 3.5 Flash 2603",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 65536,
          },
        ],
      },
    },
  },
}
```

## Notas

- El proveedor está incluido con OpenClaw, por lo que no hay un paso de instalación de complemento separado.
- `step-3.5-flash-2603` actualmente solo se expone en `stepfun-plan`.
- Un único flujo de autenticación escribe perfiles coincidentes con la región para `stepfun` y `stepfun-plan`, por lo que ambas superficies pueden ser descubiertas juntas.
- Use `openclaw models list` y `openclaw models set <provider/model>` para inspeccionar o cambiar modelos.
- Para la descripción general más amplia del proveedor, consulte [Model providers](/en/concepts/model-providers).
