---
title: "Vercel AI Gateway 网关"
summary: "Vercel AI Gateway 网关 设置（身份验证 + 模型选择）"
read_when:
  - You want to use Vercel AI Gateway with OpenClaw
  - You need the API key env var or CLI auth choice
---

# Vercel AI Gateway 网关

[Vercel AI Gateway 网关](https://vercel.com/ai-gateway) 提供了一个统一的 API，通过单一端点访问数百个模型。

- 提供商：`vercel-ai-gateway`
- 身份验证：`AI_GATEWAY_API_KEY`
- API：兼容 Anthropic Messages
- OpenClaw 会自动发现 Gateway 网关 `/v1/models` 目录，因此 `/models vercel-ai-gateway`
  包含当前的模型引用，例如 `vercel-ai-gateway/openai/gpt-5.4`。

## 快速入门

1. 设置 API 密钥（建议：为 Gateway 网关 存储它）：

```bash
openclaw onboard --auth-choice ai-gateway-api-key
```

2. 设置默认模型：

```json5
{
  agents: {
    defaults: {
      model: { primary: "vercel-ai-gateway/anthropic/claude-opus-4.6" },
    },
  },
}
```

## 非交互式示例

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice ai-gateway-api-key \
  --ai-gateway-api-key "$AI_GATEWAY_API_KEY"
```

## 环境说明

如果 Gateway 网关 作为守护进程（launchd/systemd）运行，请确保 `AI_GATEWAY_API_KEY`
对该进程可用（例如，在 `~/.openclaw/.env` 中或通过
`env.shellEnv`）。

## 模型 ID 简写

OpenClaw 接受 Vercel Claude 简写模型引用，并在运行时将其标准化为：

- `vercel-ai-gateway/claude-opus-4.6` -> `vercel-ai-gateway/anthropic/claude-opus-4.6`
- `vercel-ai-gateway/opus-4.6` -> `vercel-ai-gateway/anthropic/claude-opus-4-6`

import zh from '/components/footer/zh.mdx';

<zh />
