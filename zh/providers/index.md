---
summary: "OpenClaw 支持的模型提供商（LLM）"
read_when:
  - "You want to choose a model provider"
  - "You need a quick overview of supported LLM backends"
title: "模型提供商"
---

# 模型提供商

OpenClaw 可以使用许多 LLM 提供商。选择一个提供商，进行身份验证，然后将默认模型设置为 `provider/model`。

正在寻找聊天频道文档（WhatsApp/Telegram/Discord/Slack/Mattermost（插件）/etc.）？参阅 [频道](/zh/channels)。

## 重点推荐：Venice (Venice AI)

Venice 是我们推荐的 Venice AI 设置，用于优先隐私的推理，并可选择使用 Opus 处理最困难的任务。

- 默认：`venice/llama-3.3-70b`
- 最佳整体：`venice/claude-opus-45`（Opus 仍然是最强的）

参阅 [Venice AI](/zh/providers/venice)。

## 快速开始

1. 向提供商进行身份验证（通常通过 `openclaw onboard`）。
2. 设置默认模型：

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-5" } } },
}
```

## 提供商文档

- [OpenAI (API + Codex)](/zh/providers/openai)
- [Anthropic (API + Claude Code CLI)](/zh/providers/anthropic)
- [Qwen (OAuth)](/zh/providers/qwen)
- [OpenRouter](/zh/providers/openrouter)
- [Vercel AI Gateway](/zh/providers/vercel-ai-gateway)
- [Cloudflare AI Gateway](/zh/providers/cloudflare-ai-gateway)
- [Moonshot AI (Kimi + Kimi Coding)](/zh/providers/moonshot)
- [OpenCode Zen](/zh/providers/opencode)
<!-- /i18n:todo -->
- [Amazon Bedrock](/zh/bedrock)
- [Z.AI](/zh/providers/zai)
- [小米](/zh/providers/xiaomi)
- [GLM 模型](/zh/providers/glm)
- [MiniMax](/zh/providers/minimax)
- [Venice（Venice AI，注重隐私）](/zh/providers/venice)
- [Ollama（本地模型）](/zh/providers/ollama)

## 转录提供商

- [Deepgram (audio transcription)](/zh/providers/deepgram)

## 社区工具

- [Claude Max API Proxy](/zh/providers/claude-max-api-proxy) - Use Claude Max/Pro subscription as an OpenAI-compatible API endpoint

For the full provider catalog (xAI, Groq, Mistral, etc.) and advanced configuration,
see [Model providers](/zh/concepts/model-providers).
