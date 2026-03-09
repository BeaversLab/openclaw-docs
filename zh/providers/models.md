---
summary: "OpenClaw 支持的模型提供商（LLM）"
read_when:
  - "You want to choose a model provider"
  - "You want quick setup examples for LLM auth + model selection"
title: "模型提供商快速入门"
---

# 模型提供商

OpenClaw 可以使用许多 LLM 提供商。选择一个，进行身份验证，然后将默认模型设置为 `provider/model`。

## 重点推荐：Venice (Venice AI)

Venice 是我们推荐的 Venice AI 设置，用于优先隐私的推理，并可选择使用 Opus 处理最困难的任务。

- 默认：`venice/llama-3.3-70b`
- 最佳整体：`venice/claude-opus-45`（Opus 仍然是最强的）

参阅 [Venice AI](/en/providers/venice)。

## 快速开始（两步）

1. 向提供商进行身份验证（通常通过 `openclaw onboard`）。
2. 设置默认模型：

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-5" } } },
}
```

## 支持的提供商（入门套件）

- [OpenAI (/en/providers/openai)](/providers/openai)
- [Anthropic (/en/providers/anthropic)](/providers/anthropic)
- [OpenRouter](/en/providers/openrouter)
- [Vercel AI Gateway](/en/providers/vercel-ai-gateway)
- [Cloudflare AI Gateway](/en/providers/cloudflare-ai-gateway)
- [Moonshot AI (/en/providers/moonshot)](/providers/moonshot)
- [Synthetic](/en/providers/synthetic)
- [OpenCode Zen](/en/providers/opencode)
- [Z.AI](/en/providers/zai)
- [GLM models](/en/providers/glm)
- [MiniMax](/en/providers/minimax)
- [Venice (/en/providers/venice)](/providers/venice)
- [Amazon Bedrock](/en/bedrock)

完整的提供商目录（xAI、Groq、Mistral 等）和高级配置，请参阅 [Model providers](/en/concepts/model-providers)。
