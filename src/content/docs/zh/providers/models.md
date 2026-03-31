---
summary: "OpenClaw 支持的模型提供商 (LLM)"
read_when:
  - You want to choose a model provider
  - You want quick setup examples for LLM auth + model selection
title: "模型提供商快速入门"
---

# 模型提供商

OpenClaw 可以使用许多 LLM 提供商。选择一个，进行身份验证，然后将默认模型设置为 `provider/model`。

## 快速入门（两步）

1. 与提供商进行身份验证（通常通过 `openclaw onboard`）。
2. 设置默认模型：

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## 支持的提供商（入门套件）

- [OpenAI (API + Codex)](/en/providers/openai)
- [Anthropic (API + Claude Code CLI)](/en/providers/anthropic)
- [OpenRouter](/en/providers/openrouter)
- [Vercel AI Gateway(网关)](/en/providers/vercel-ai-gateway)
- [Cloudflare AI Gateway(网关)](/en/providers/cloudflare-ai-gateway)
- [Moonshot AI (Kimi + Kimi Coding)](/en/providers/moonshot)
- [Mistral](/en/providers/mistral)
- [Synthetic](/en/providers/synthetic)
- [OpenCode (Zen + Go)](/en/providers/opencode)
- [Z.AI](/en/providers/zai)
- [GLM models](/en/providers/glm)
- [MiniMax](/en/providers/minimax)
- [Venice (Venice AI)](/en/providers/venice)
- [Amazon Bedrock](/en/providers/bedrock)
- [Qianfan](/en/providers/qianfan)
- [xAI](/en/providers/xai)

有关完整的提供商目录（xAI、Groq、Mistral 等）和高级配置，请参阅[模型提供商](/en/concepts/model-providers)。
