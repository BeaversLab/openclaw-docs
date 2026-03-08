---
summary: "OpenClaw 支持的模型提供商（LLM）"
read_when:
  - "您想选择一个模型提供商"
  - "您需要支持的 LLM 后端的快速概述"
title: "模型提供商"
---

# 模型提供商

OpenClaw 可以使用许多 LLM 提供商。选择一个提供商，进行身份验证，然后将默认模型设置为 `provider/model`。

寻找聊天渠道文档（WhatsApp/Telegram/Discord/Slack/Mattermost（插件）/等）？参阅[渠道](/zh/channels)。

## 重点推荐：Venice（Venice AI）

Venice 是我们推荐的 Venice AI 设置，用于隐私优先的推理，并可选择使用 Opus 处理困难任务。

- 默认：`venice/llama-3.3-70b`
- 最佳整体：`venice/claude-opus-45`（Opus 仍然是最强的）

参阅 [Venice AI](/zh/providers/venice)。

## 快速开始

1. 与提供商进行身份验证（通常通过 `openclaw onboard`）。
2. 设置默认模型：

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-5" } } },
}
```

## 提供商文档

- [OpenAI (/en/providers/openai)](/zh/providers/openai)
- [Anthropic (/en/providers/anthropic)](/zh/providers/anthropic)
- [Qwen (/en/providers/qwen)](/zh/providers/qwen)
- [OpenRouter](/zh/providers/openrouter)
- [Vercel AI Gateway](/zh/providers/vercel-ai-gateway)
- [Cloudflare AI Gateway](/zh/providers/cloudflare-ai-gateway)
- [Moonshot AI (/en/providers/moonshot)](/zh/providers/moonshot)
- [OpenCode Zen](/zh/providers/opencode)
- [Amazon Bedrock](/zh/bedrock)
- [Z.AI](/zh/providers/zai)
- [Xiaomi](/zh/providers/xiaomi)
- [GLM models](/zh/providers/glm)
- [MiniMax](/zh/providers/minimax)
- [Venice (/en/providers/venice)](/zh/providers/venice)
- [Ollama (/en/providers/ollama)](/zh/providers/ollama)

## 转录提供商

- [Deepgram (/en/providers/deepgram)](/zh/providers/deepgram)

## 社区工具

- [Claude Max API Proxy](/zh/providers/claude-max-api-proxy) - 将 Claude Max/Pro 订阅用作 OpenAI 兼容的 API 端点

有关完整的提供商目录（xAI、Groq、Mistral 等）和高级配置，请参阅[模型提供商](/zh/concepts/model-providers)。
