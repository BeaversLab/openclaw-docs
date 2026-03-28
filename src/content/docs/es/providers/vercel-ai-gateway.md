---
title: "Vercel AI Gateway"
summary: "Configuración de Vercel AI Gateway (autenticación + selección de modelo)"
read_when:
  - You want to use Vercel AI Gateway with OpenClaw
  - You need the API key env var or CLI auth choice
---

# Vercel AI Gateway

El [Vercel AI Gateway](https://vercel.com/ai-gateway) proporciona una API unificada para acceder a cientos de modelos a través de un único punto de conexión.

- Proveedor: `vercel-ai-gateway`
- Autenticación: `AI_GATEWAY_API_KEY`
- API: Compatible con Anthropic Messages
- OpenClaw descubre automáticamente el catálogo del Gateway `/v1/models`, por lo que `/models vercel-ai-gateway`
  incluye referencias de modelos actuales como `vercel-ai-gateway/openai/gpt-5.4`.

## Inicio rápido

1. Configure la clave de API (recomendado: guárdela para el Gateway):

```bash
openclaw onboard --auth-choice ai-gateway-api-key
```

2. Configure un modelo predeterminado:

```json5
{
  agents: {
    defaults: {
      model: { primary: "vercel-ai-gateway/anthropic/claude-opus-4.6" },
    },
  },
}
```

## Ejemplo no interactivo

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice ai-gateway-api-key \
  --ai-gateway-api-key "$AI_GATEWAY_API_KEY"
```

## Nota sobre el entorno

Si el Gateway se ejecuta como demonio (launchd/systemd), asegúrese de que `AI_GATEWAY_API_KEY`
esté disponible para ese proceso (por ejemplo, en `~/.openclaw/.env` o a través de
`env.shellEnv`).

## Abreviación de ID de modelo

OpenClaw acepta referencias de modelos abreviadas de Vercel Claude y las normaliza en
tiempo de ejecución:

- `vercel-ai-gateway/claude-opus-4.6` -> `vercel-ai-gateway/anthropic/claude-opus-4.6`
- `vercel-ai-gateway/opus-4.6` -> `vercel-ai-gateway/anthropic/claude-opus-4-6`
