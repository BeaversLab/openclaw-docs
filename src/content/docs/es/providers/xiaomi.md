---
summary: "Usa los modelos Xiaomi MiMo con OpenClaw"
read_when:
  - You want Xiaomi MiMo models in OpenClaw
  - You need XIAOMI_API_KEY setup
title: "Xiaomi MiMo"
---

# Xiaomi MiMo

Xiaomi MiMo es la plataforma API para los modelos **MiMo**. OpenClaw utiliza el
endpoint compatible con OpenAI de Xiaomi con autenticación mediante clave de API. Cree su clave de API en la
[consola de Xiaomi MiMo](https://platform.xiaomimimo.com/#/console/api-keys) y luego configure el
proveedor `xiaomi` incluido con esa clave.

## Catálogo integrado

- URL base: `https://api.xiaomimimo.com/v1`
- API: `openai-completions`
- Autorización: `Bearer $XIAOMI_API_KEY`

| Ref. de modelo         | Entrada       | Contexto  | Salida máx. | Notas                       |
| ---------------------- | ------------- | --------- | ----------- | --------------------------- |
| `xiaomi/mimo-v2-flash` | texto         | 262,144   | 8,192       | Modelo predeterminado       |
| `xiaomi/mimo-v2-pro`   | texto         | 1,048,576 | 32,000      | Con razonamiento            |
| `xiaomi/mimo-v2-omni`  | texto, imagen | 262,144   | 32,000      | Multimodal con razonamiento |

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
        baseUrl: "https://api.xiaomimimo.com/v1",
        api: "openai-completions",
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
          {
            id: "mimo-v2-pro",
            name: "Xiaomi MiMo V2 Pro",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 1048576,
            maxTokens: 32000,
          },
          {
            id: "mimo-v2-omni",
            name: "Xiaomi MiMo V2 Omni",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 32000,
          },
        ],
      },
    },
  },
}
```

## Notas

- Ref. de modelo predeterminada: `xiaomi/mimo-v2-flash`.
- Modelos integrados adicionales: `xiaomi/mimo-v2-pro`, `xiaomi/mimo-v2-omni`.
- El proveedor se inyecta automáticamente cuando se establece `XIAOMI_API_KEY` (o existe un perfil de autenticación).
- Consulte [/concepts/model-providers](/en/concepts/model-providers) para conocer las reglas del proveedor.
