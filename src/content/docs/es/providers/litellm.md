---
title: "LiteLLM"
summary: "Ejecute OpenClaw a través del proxy LiteLLM para un acceso unificado a modelos y seguimiento de costos"
read_when:
  - You want to route OpenClaw through a LiteLLM proxy
  - You need cost tracking, logging, or model routing through LiteLLM
---

# LiteLLM

[LiteLLM](https://litellm.ai) es una puerta de enlace (gateway) de LLM de código abierto que proporciona una API unificada para más de 100 proveedores de modelos. Enruta OpenClaw a través de LiteLLM para obtener un seguimiento centralizado de costos, registro de logs y la flexibilidad de cambiar de backends sin modificar la configuración de OpenClaw.

## ¿Por qué usar LiteLLM con OpenClaw?

- **Seguimiento de costos** — Vea exactamente en qué gasta OpenClam en todos los modelos
- **Enrutamiento de modelos** — Cambie entre Claude, GPT-4, Gemini, Bedrock sin cambios en la configuración
- **Claves virtuales** — Cree claves con límites de gasto para OpenClaw
- **Registro (Logging)** — Registros completos de solicitud/respuesta para depuración
- **Respaldo (Fallbacks)** — Conmutación por error automática si su proveedor principal está caído

## Inicio rápido

### A través de la incorporación

```bash
openclaw onboard --auth-choice litellm-api-key
```

### Configuración manual

1. Inicie el proxy LiteLLM:

```bash
pip install 'litellm[proxy]'
litellm --model claude-opus-4-6
```

2. Apunte OpenClaw a LiteLLM:

```bash
export LITELLM_API_KEY="your-litellm-key"

openclaw
```

Eso es todo. Ahora OpenClaw enruta a través de LiteLLM.

## Configuración

### Variables de entorno

```bash
export LITELLM_API_KEY="sk-litellm-key"
```

### Archivo de configuración

```json5
{
  models: {
    providers: {
      litellm: {
        baseUrl: "http://localhost:4000",
        apiKey: "${LITELLM_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "claude-opus-4-6",
            name: "Claude Opus 4.6",
            reasoning: true,
            input: ["text", "image"],
            contextWindow: 200000,
            maxTokens: 64000,
          },
          {
            id: "gpt-4o",
            name: "GPT-4o",
            reasoning: false,
            input: ["text", "image"],
            contextWindow: 128000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
  agents: {
    defaults: {
      model: { primary: "litellm/claude-opus-4-6" },
    },
  },
}
```

## Claves virtuales

Cree una clave dedicada para OpenClaw con límites de gasto:

```bash
curl -X POST "http://localhost:4000/key/generate" \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "key_alias": "openclaw",
    "max_budget": 50.00,
    "budget_duration": "monthly"
  }'
```

Use la clave generada como `LITELLM_API_KEY`.

## Enrutamiento de modelos

LiteLLM puede enrutar solicitudes de modelos a diferentes backends. Configure en su `config.yaml` de LiteLLM:

```yaml
model_list:
  - model_name: claude-opus-4-6
    litellm_params:
      model: claude-opus-4-6
      api_key: os.environ/ANTHROPIC_API_KEY

  - model_name: gpt-4o
    litellm_params:
      model: gpt-4o
      api_key: os.environ/OPENAI_API_KEY
```

OpenClaw sigue solicitando `claude-opus-4-6` — LiteLLM maneja el enrutamiento.

## Ver uso

Consulte el panel o la API de LiteLLM:

```bash
# Key info
curl "http://localhost:4000/key/info" \
  -H "Authorization: Bearer sk-litellm-key"

# Spend logs
curl "http://localhost:4000/spend/logs" \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY"
```

## Notas

- LiteLLM se ejecuta en `http://localhost:4000` por defecto
- OpenClaw se conecta a través del endpoint `/v1/chat/completions` compatible con OpenAI
- Todas las funciones de OpenClaw funcionan a través de LiteLLM: sin limitaciones

## Ver también

- [Documentación de LiteLLM](https://docs.litellm.ai)
- [Proveedores de modelos](/es/concepts/model-providers)
