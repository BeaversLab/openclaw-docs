---
summary: "OpenClaw 支持的模型提供商（LLM）"
read_when:
  - "您想选择一个模型提供商"
  - "您想要 LLM 身份验证和模型选择的快速设置示例"
title: "模型提供商快速入门"
---

# 模型提供商

OpenClaw 可以使用许多 LLM 提供商。选择一个，进行身份验证，然后将默认模型设置为 `provider/model`。

## 重点推荐：Venice（Venice AI）

Venice 是我们推荐的 Venice AI 设置，用于隐私优先的推理，并可选择使用 Opus 处理最困难的任务。

- 默认：`venice/llama-3.3-70b`
- 最佳整体：`venice/claude-opus-45`（Opus 仍然是最强的）

参阅 [Venice AI](/zh/providers/venice)。

## 快速开始（两步）

1. 与提供商进行身份验证（通常通过 `openclaw onboard`）。
2. 设置默认模型：

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-5" } } },
}
```

## 支持的提供商（入门集）

- [OpenAI (/en/providers/openai)](/zh/providers/openai)
- [Anthropic (/en/providers/anthropic)](/zh/providers/anthropic)
- [OpenRouter](/zh/providers/openrouter)
- [Vercel AI Gateway](/zh/providers/vercel-ai-gateway)
- [Cloudflare AI Gateway](/zh/providers/cloudflare-ai-gateway)
- [Moonshot AI (/en/providers/moonshot)](/zh/providers/moonshot)
- [Synthetic](/zh/providers/synthetic)
- [OpenCode Zen](/zh/providers/opencode)
- [Z.AI](/zh/providers/zai)
- [GLM models](/zh/providers/glm)
- [MiniMax](/zh/providers/minimax)
- [Venice (/en/providers/venice)](/zh/providers/venice)
- [Amazon Bedrock](/zh/bedrock)

有关完整的提供商目录（xAI、Groq、Mistral 等）和高级配置，请参阅[模型提供商](/zh/concepts/model-providers)。
