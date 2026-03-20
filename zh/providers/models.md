---
summary: "OpenClaw 支持的模型提供商 (LLM)"
read_when:
  - 您想要选择一个模型提供商
  - 您想要 LLM 认证 + 模型选择的快速设置示例
title: "模型提供商快速入门"
---

# 模型提供商

OpenClaw 可以使用许多 LLM 提供商。选择一个，进行身份验证，然后将默认
模型设置为 `provider/model`。

## 快速开始 (两个步骤)

1. 与提供商进行身份验证（通常通过 `openclaw onboard`）。
2. 设置默认模型：

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## 支持的提供商（入门套件）

- [OpenAI (API + Codex)](/zh/providers/openai)
- [Anthropic (API + Claude Code CLI)](/zh/providers/anthropic)
- [OpenRouter](/zh/providers/openrouter)
- [Vercel AI Gateway(网关)](/zh/providers/vercel-ai-gateway)
- [Cloudflare AI Gateway(网关)](/zh/providers/cloudflare-ai-gateway)
- [Moonshot AI (Kimi + Kimi Coding)](/zh/providers/moonshot)
- [Mistral](/zh/providers/mistral)
- [Synthetic](/zh/providers/synthetic)
- [OpenCode (Zen + Go)](/zh/providers/opencode)
- [Z.AI](/zh/providers/zai)
- [GLM 模型](/zh/providers/glm)
- [MiniMax](/zh/providers/minimax)
- [Venice (Venice AI)](/zh/providers/venice)
- [Amazon Bedrock](/zh/providers/bedrock)
- [Qianfan](/zh/providers/qianfan)
- [xAI](/zh/providers/xai)

有关完整的提供商目录（xAI、Groq、Mistral 等）和高级配置，
请参阅 [模型提供商](/zh/concepts/model-providers)。

import en from "/components/footer/en.mdx";

<en />
