---
title: "Vercel AI Gateway(网关)"
summary: "Vercel AI Gateway(网关) setup (auth + 模型 selection)"
read_when:
  - You want to use Vercel AI Gateway(网关) with OpenClaw
  - You need the API key 环境变量 or CLI auth choice
---

# Vercel AI Gateway(网关)

The [Vercel AI Gateway(网关)](https://vercel.com/ai-gateway) provides a unified API to access hundreds of models through a single endpoint.

- Provider: `vercel-ai-gateway`
- Auth: `AI_GATEWAY_API_KEY`
- API: Anthropic Messages compatible
- OpenClaw auto-discovers the Gateway(网关) `/v1/models` catalog, so `/models vercel-ai-gateway`
  includes current 模型 refs such as `vercel-ai-gateway/openai/gpt-5.4`.

## 快速开始

1. Set the API key (recommended: store it for the Gateway(网关)):

```bash
openclaw onboard --auth-choice ai-gateway-api-key
```

2. Set a default 模型:

```json5
{
  agents: {
    defaults: {
      model: { primary: "vercel-ai-gateway/anthropic/claude-opus-4.6" },
    },
  },
}
```

## Non-interactive example

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice ai-gateway-api-key \
  --ai-gateway-api-key "$AI_GATEWAY_API_KEY"
```

## Environment note

If the Gateway(网关) runs as a daemon (launchd/systemd), make sure `AI_GATEWAY_API_KEY`
is available to that process (for example, in `~/.openclaw/.env` or via
`env.shellEnv`).

## Model ID shorthand

OpenClaw accepts Vercel Claude shorthand 模型 refs and normalizes them at
runtime:

- `vercel-ai-gateway/claude-opus-4.6` -> `vercel-ai-gateway/anthropic/claude-opus-4.6`
- `vercel-ai-gateway/opus-4.6` -> `vercel-ai-gateway/anthropic/claude-opus-4-6`

import en from "/components/footer/en.mdx";

<en />
