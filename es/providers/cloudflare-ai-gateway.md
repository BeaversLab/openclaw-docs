---
title: "Cloudflare AI Gateway"
summary: "Configuración de Cloudflare AI Gateway (autenticación + selección de modelo)"
read_when:
  - Deseas utilizar Cloudflare AI Gateway con OpenClaw
  - Necesitas el ID de cuenta, el ID de puerta de enlace o la variable de entorno de la clave API
---

# Cloudflare AI Gateway

Cloudflare AI Gateway se sitúa delante de las API del proveedor y te permite añadir analíticas, almacenamiento en caché y controles. Para Anthropic, OpenClaw utiliza la API de Mensajes de Anthropic a través de tu punto final de Gateway.

- Proveedor: `cloudflare-ai-gateway`
- URL base: `https://gateway.ai.cloudflare.com/v1/<account_id>/<gateway_id>/anthropic`
- Modelo predeterminado: `cloudflare-ai-gateway/claude-sonnet-4-5`
- Clave API: `CLOUDFLARE_AI_GATEWAY_API_KEY` (tu clave API del proveedor para las solicitudes a través del Gateway)

Para modelos de Anthropic, utiliza tu clave API de Anthropic.

## Inicio rápido

1. Configura la clave API del proveedor y los detalles del Gateway:

```bash
openclaw onboard --auth-choice cloudflare-ai-gateway-api-key
```

2. Establece un modelo predeterminado:

```json5
{
  agents: {
    defaults: {
      model: { primary: "cloudflare-ai-gateway/claude-sonnet-4-5" },
    },
  },
}
```

## Ejemplo no interactivo

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice cloudflare-ai-gateway-api-key \
  --cloudflare-ai-gateway-account-id "your-account-id" \
  --cloudflare-ai-gateway-gateway-id "your-gateway-id" \
  --cloudflare-ai-gateway-api-key "$CLOUDFLARE_AI_GATEWAY_API_KEY"
```

## Gateways autenticadas

Si habilitaste la autenticación del Gateway en Cloudflare, añade el encabezado `cf-aig-authorization` (esto es además de tu clave API del proveedor).

```json5
{
  models: {
    providers: {
      "cloudflare-ai-gateway": {
        headers: {
          "cf-aig-authorization": "Bearer <cloudflare-ai-gateway-token>",
        },
      },
    },
  },
}
```

## Nota sobre el entorno

Si el Gateway se ejecuta como un demonio (launchd/systemd), asegúrate de que `CLOUDFLARE_AI_GATEWAY_API_KEY` esté disponible para ese proceso (por ejemplo, en `~/.openclaw/.env` o a través de `env.shellEnv`).

import es from "/components/footer/es.mdx";

<es />
