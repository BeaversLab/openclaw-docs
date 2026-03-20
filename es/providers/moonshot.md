---
summary: "Configurar Moonshot K2 vs Kimi Coding (proveedores separados + claves)"
read_when:
  - Deseas configurar Moonshot K2 (Plataforma abierta Moonshot) vs Kimi Coding
  - Necesitas comprender los endpoints, claves y referencias de modelo separadas
  - Deseas configuración de copiar/pegar para cualquier proveedor
title: "Moonshot AI"
---

# Moonshot AI (Kimi)

Moonshot proporciona la API Kimi con endpoints compatibles con OpenAI. Configura el
proveedor y establece el modelo predeterminado en `moonshot/kimi-k2.5`, o usa
Kimi Coding con `kimi-coding/k2p5`.

IDs de modelo actuales de Kimi K2:

[//]: # "moonshot-kimi-k2-ids:start"

- `kimi-k2.5`
- `kimi-k2-0905-preview`
- `kimi-k2-turbo-preview`
- `kimi-k2-thinking`
- `kimi-k2-thinking-turbo`

[//]: # "moonshot-kimi-k2-ids:end"

```bash
openclaw onboard --auth-choice moonshot-api-key
```

Kimi Coding:

```bash
openclaw onboard --auth-choice kimi-code-api-key
```

Nota: Moonshot y Kimi Coding son proveedores separados. Las claves no son intercambiables, los endpoints difieren y las referencias de modelo difieren (Moonshot usa `moonshot/...`, Kimi Coding usa `kimi-coding/...`).

## Fragmento de configuración (API de Moonshot)

```json5
{
  env: { MOONSHOT_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "moonshot/kimi-k2.5" },
      models: {
        // moonshot-kimi-k2-aliases:start
        "moonshot/kimi-k2.5": { alias: "Kimi K2.5" },
        "moonshot/kimi-k2-0905-preview": { alias: "Kimi K2" },
        "moonshot/kimi-k2-turbo-preview": { alias: "Kimi K2 Turbo" },
        "moonshot/kimi-k2-thinking": { alias: "Kimi K2 Thinking" },
        "moonshot/kimi-k2-thinking-turbo": { alias: "Kimi K2 Thinking Turbo" },
        // moonshot-kimi-k2-aliases:end
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      moonshot: {
        baseUrl: "https://api.moonshot.ai/v1",
        apiKey: "${MOONSHOT_API_KEY}",
        api: "openai-completions",
        models: [
          // moonshot-kimi-k2-models:start
          {
            id: "kimi-k2.5",
            name: "Kimi K2.5",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 256000,
            maxTokens: 8192,
          },
          {
            id: "kimi-k2-0905-preview",
            name: "Kimi K2 0905 Preview",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 256000,
            maxTokens: 8192,
          },
          {
            id: "kimi-k2-turbo-preview",
            name: "Kimi K2 Turbo",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 256000,
            maxTokens: 8192,
          },
          {
            id: "kimi-k2-thinking",
            name: "Kimi K2 Thinking",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 256000,
            maxTokens: 8192,
          },
          {
            id: "kimi-k2-thinking-turbo",
            name: "Kimi K2 Thinking Turbo",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 256000,
            maxTokens: 8192,
          },
          // moonshot-kimi-k2-models:end
        ],
      },
    },
  },
}
```

## Kimi Coding

```json5
{
  env: { KIMI_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "kimi-coding/k2p5" },
      models: {
        "kimi-coding/k2p5": { alias: "Kimi K2.5" },
      },
    },
  },
}
```

## Notas

- Las referencias de modelo de Moonshot usan `moonshot/<modelId>`. Las referencias de modelo de Kimi Coding usan `kimi-coding/<modelId>`.
- Anule los metadatos de precios y contexto en `models.providers` si es necesario.
- Si Moonshot publica diferentes límites de contexto para un modelo, ajuste
  `contextWindow` en consecuencia.
- Use `https://api.moonshot.ai/v1` para el endpoint internacional y `https://api.moonshot.cn/v1` para el endpoint de China.

## Modo de pensamiento nativo (Moonshot)

Moonshot Kimi admite pensamiento nativo binario:

- `thinking: { type: "enabled" }`
- `thinking: { type: "disabled" }`

Configúrelo por modelo a través de `agents.defaults.models.<provider/model>.params`:

```json5
{
  agents: {
    defaults: {
      models: {
        "moonshot/kimi-k2.5": {
          params: {
            thinking: { type: "disabled" },
          },
        },
      },
    },
  },
}
```

OpenClaw también asigna niveles de tiempo de ejecución `/think` para Moonshot:

- `/think off` -> `thinking.type=disabled`
- cualquier nivel de pensamiento no apagado -> `thinking.type=enabled`

Cuando el pensamiento de Moonshot está habilitado, `tool_choice` debe ser `auto` o `none`. OpenClaw normaliza los valores incompatibles de `tool_choice` a `auto` para mayor compatibilidad.

import en from "/components/footer/en.mdx";

<en />
