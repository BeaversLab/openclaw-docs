---
summary: "Configurar Moonshot K2 frente a Kimi Coding (proveedores y claves separados)"
read_when:
  - You want Moonshot K2 (Moonshot Open Platform) vs Kimi Coding setup
  - You need to understand separate endpoints, keys, and model refs
  - You want copy/paste config for either provider
title: "Moonshot AI"
---

# Moonshot AI (Kimi)

Moonshot proporciona la API de Kimi con puntos de conexión compatibles con OpenAI. Configure el
proveedor y establezca el modelo predeterminado en `moonshot/kimi-k2.5`, o use
Kimi Coding con `kimi/kimi-code`.

IDs de modelos actuales de Kimi K2:

[//]: # "moonshot-kimi-k2-ids:start"

- `kimi-k2.5`
- `kimi-k2-thinking`
- `kimi-k2-thinking-turbo`
- `kimi-k2-turbo`

[//]: # "moonshot-kimi-k2-ids:end"

```bash
openclaw onboard --auth-choice moonshot-api-key
# or
openclaw onboard --auth-choice moonshot-api-key-cn
```

Kimi Coding:

```bash
openclaw onboard --auth-choice kimi-code-api-key
```

Nota: Moonshot y Kimi Coding son proveedores separados. Las claves no son intercambiables, los puntos de conexión difieren y las referencias de modelos difieren (Moonshot usa `moonshot/...`, Kimi Coding usa `kimi/...`).

La búsqueda web de Kimi también utiliza el complemento Moonshot:

```bash
openclaw configure --section web
```

Elija **Kimi** en la sección de búsqueda web para almacenar
`plugins.entries.moonshot.config.webSearch.*`.

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
        "moonshot/kimi-k2-thinking": { alias: "Kimi K2 Thinking" },
        "moonshot/kimi-k2-thinking-turbo": { alias: "Kimi K2 Thinking Turbo" },
        "moonshot/kimi-k2-turbo": { alias: "Kimi K2 Turbo" },
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
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 262144,
          },
          {
            id: "kimi-k2-thinking",
            name: "Kimi K2 Thinking",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 262144,
          },
          {
            id: "kimi-k2-thinking-turbo",
            name: "Kimi K2 Thinking Turbo",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 262144,
          },
          {
            id: "kimi-k2-turbo",
            name: "Kimi K2 Turbo",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 256000,
            maxTokens: 16384,
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
      model: { primary: "kimi/kimi-code" },
      models: {
        "kimi/kimi-code": { alias: "Kimi" },
      },
    },
  },
}
```

## Búsqueda web de Kimi

OpenClaw también incluye **Kimi** como proveedor `web_search`, respaldado por la búsqueda web
de Moonshot.

La configuración interactiva puede solicitar:

- la región de la API de Moonshot:
  - `https://api.moonshot.ai/v1`
  - `https://api.moonshot.cn/v1`
- el modelo de búsqueda web de Kimi predeterminado (el valor predeterminado es `kimi-k2.5`)

La configuración se encuentra en `plugins.entries.moonshot.config.webSearch`:

```json5
{
  plugins: {
    entries: {
      moonshot: {
        config: {
          webSearch: {
            apiKey: "sk-...", // or use KIMI_API_KEY / MOONSHOT_API_KEY
            baseUrl: "https://api.moonshot.ai/v1",
            model: "kimi-k2.5",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "kimi",
      },
    },
  },
}
```

## Notas

- Las referencias de modelos de Moonshot usan `moonshot/<modelId>`. Las referencias de modelos de Kimi Coding usan `kimi/<modelId>`.
- La referencia del modelo predeterminado actual de Kimi Coding es `kimi/kimi-code`. El modelo heredado `kimi/k2p5` sigue siendo aceptado como id de modelo de compatibilidad.
- La búsqueda web de Kimi usa `KIMI_API_KEY` o `MOONSHOT_API_KEY`, y de forma predeterminada `https://api.moonshot.ai/v1` con el modelo `kimi-k2.5`.
- Los puntos de conexión nativos de Moonshot (`https://api.moonshot.ai/v1` y
  `https://api.moonshot.cn/v1`) anuncian compatibilidad de uso de transmisión en el
  transporte compartido `openai-completions`. OpenClaw ahora utiliza las capacidades del punto de conexión,
  por lo que los ids de proveedores personalizados compatibles que apuntan a los mismos hosts
  nativos de Moonshot heredan el mismo comportamiento de uso de transmisión.
- Sobrescriba los precios y los metadatos de contexto en `models.providers` si es necesario.
- Si Moonshot publica diferentes límites de contexto para un modelo, ajuste
  `contextWindow` en consecuencia.
- Use `https://api.moonshot.ai/v1` para el punto final internacional, y `https://api.moonshot.cn/v1` para el punto final de China.
- Opciones de incorporación:
  - `moonshot-api-key` para `https://api.moonshot.ai/v1`
  - `moonshot-api-key-cn` para `https://api.moonshot.cn/v1`

## Modo de pensamiento nativo (Moonshot)

Moonshot Kimi soporta pensamiento nativo binario:

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

OpenClaw también mapea los niveles `/think` en tiempo de ejecución para Moonshot:

- `/think off` -> `thinking.type=disabled`
- cualquier nivel de pensamiento distinto de off -> `thinking.type=enabled`

Cuando el pensamiento de Moonshot está habilitado, `tool_choice` debe ser `auto` o `none`. OpenClaw normaliza los valores incompatibles de `tool_choice` a `auto` para compatibilidad.
