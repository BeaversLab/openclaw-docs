---
title: "Cloudflare AI Gateway"
summary: "Cloudflare AI Gateway 设置（auth + model selection）"
read_when:
  - 您想要在 OpenClaw 中使用 Cloudflare AI Gateway
  - 您需要 account ID、gateway ID 或 API key env var
---

# Cloudflare AI Gateway

Cloudflare AI Gateway 位于 provider APIs 前端，让您添加 analytics、caching 和 controls。对于 Anthropic，OpenClaw 通过您的 Gateway endpoint 使用 Anthropic Messages API。

- Provider：`cloudflare-ai-gateway`
- Base URL：`https://gateway.ai.cloudflare.com/v1/<account_id>/<gateway_id>/anthropic`
- Default model：`cloudflare-ai-gateway/claude-sonnet-4-5`
- API key：`CLOUDFLARE_AI_GATEWAY_API_KEY`（您通过 Gateway 的请求的 provider API key）

对于 Anthropic 模型，使用您的 Anthropic API key。

## Quick start

1. 设置 provider API key 和 Gateway 详细信息：

```bash
openclaw onboard --auth-choice cloudflare-ai-gateway-api-key
```

2. 设置默认 model：

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

如果您在 Cloudflare 中启用了 Gateway authentication，添加 `cf-aig-authorization` header（这除了您的 provider API key 之外）。

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

如果 Gateway 作为 daemon 运行（launchd/systemd），请确保 `CLOUDFLARE_AI_GATEWAY_API_KEY` 对该进程可用（例如，在 `~/.openclaw/.env` 中或通过 `env.shellEnv`）。
