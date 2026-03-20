---
title: "Cloudflare AI Gateway(网关)"
summary: "Cloudflare AI Gateway(网关) setup (auth + 模型 selection)"
read_when:
  - You want to use Cloudflare AI Gateway(网关) with OpenClaw
  - You need the account ID, gateway ID, or API key 环境变量
---

# Cloudflare AI Gateway(网关)

Cloudflare AI Gateway(网关) sits in front of 提供商 APIs and lets you add analytics, caching, and controls. For Anthropic, OpenClaw uses the Anthropic Messages API through your Gateway(网关) endpoint.

- Provider: `cloudflare-ai-gateway`
- Base URL: `https://gateway.ai.cloudflare.com/v1/<account_id>/<gateway_id>/anthropic`
- Default 模型: `cloudflare-ai-gateway/claude-sonnet-4-5`
- API key: `CLOUDFLARE_AI_GATEWAY_API_KEY` (your 提供商 API key for requests through the Gateway(网关))

For Anthropic models, use your Anthropic API key.

## 快速开始

1. Set the 提供商 API key and Gateway(网关) details:

```bash
openclaw onboard --auth-choice cloudflare-ai-gateway-api-key
```

2. Set a default 模型:

```json5
{
  agents: {
    defaults: {
      model: { primary: "cloudflare-ai-gateway/claude-sonnet-4-5" },
    },
  },
}
```

## Non-interactive example

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice cloudflare-ai-gateway-api-key \
  --cloudflare-ai-gateway-account-id "your-account-id" \
  --cloudflare-ai-gateway-gateway-id "your-gateway-id" \
  --cloudflare-ai-gateway-api-key "$CLOUDFLARE_AI_GATEWAY_API_KEY"
```

## Authenticated gateways

If you enabled Gateway(网关) authentication in Cloudflare, add the `cf-aig-authorization` header (this is in addition to your 提供商 API key).

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

## Environment note

If the Gateway(网关) runs as a daemon (launchd/systemd), make sure `CLOUDFLARE_AI_GATEWAY_API_KEY` is available to that process (for example, in `~/.openclaw/.env` or via `env.shellEnv`).

import en from "/components/footer/en.mdx";

<en />
