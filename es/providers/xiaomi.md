---
summary: "Usa Xiaomi MiMo (mimo-v2-flash) con OpenClaw"
read_when:
  - Quieres modelos Xiaomi MiMo en OpenClaw
  - Necesitas configuración de XIAOMI_API_KEY
title: "Xiaomi MiMo"
---

# Xiaomi MiMo

Xiaomi MiMo es la plataforma API para modelos **MiMo**. Proporciona APIs REST compatibles con
los formatos de OpenAI y Anthropic y utiliza claves API para la autenticación. Crea tu clave API en
la [consola Xiaomi MiMo](https://platform.xiaomimimo.com/#/console/api-keys). OpenClaw utiliza
el proveedor `xiaomi` con una clave API de Xiaomi MiMo.

## Resumen del modelo

- **mimo-v2-flash**: ventana de contexto de 262144 tokens, compatible con la API de mensajes de Anthropic.
- URL base: `https://api.xiaomimimo.com/anthropic`
- Autorización: `Bearer $XIAOMI_API_KEY`

## Configuración de CLI

```bash
openclaw onboard --auth-choice xiaomi-api-key
# or non-interactive
openclaw onboard --auth-choice xiaomi-api-key --xiaomi-api-key "$XIAOMI_API_KEY"
```

## Fragmento de configuración

```json5
{
  env: { XIAOMI_API_KEY: "your-key" },
  agents: { defaults: { model: { primary: "xiaomi/mimo-v2-flash" } } },
  models: {
    mode: "merge",
    providers: {
      xiaomi: {
        baseUrl: "https://api.xiaomimimo.com/anthropic",
        api: "anthropic-messages",
        apiKey: "XIAOMI_API_KEY",
        models: [
          {
            id: "mimo-v2-flash",
            name: "Xiaomi MiMo V2 Flash",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

## Notas

- Ref. de modelo: `xiaomi/mimo-v2-flash`.
- El proveedor se inyecta automáticamente cuando se establece `XIAOMI_API_KEY` (o existe un perfil de autenticación).
- Consulta [/concepts/model-providers](/es/concepts/model-providers) para obtener las reglas del proveedor.

import en from "/components/footer/en.mdx";

<en />
