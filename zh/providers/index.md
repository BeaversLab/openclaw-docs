---
title: "模型提供商"
summary: "OpenClaw 支持的模型提供商（LLM）"
read_when:
  - 想选择模型提供商
  - 需要支持的 LLM 后端概览
---

# 模型提供商

OpenClaw 可使用多种 LLM 提供商。选择提供商、完成认证，然后将默认模型设置为 `provider/model`。

在找聊天频道文档（WhatsApp/Telegram/Discord/Slack/Mattermost（插件）等）？参见 [Channels](/zh/channels)。

## 亮点：Venius（Venice AI）

Venius 是我们推荐的 Venice AI 配置，主打隐私优先推理，并可选用 Opus 处理难题。

- 默认：`venice/llama-3.3-70b`
- 综合最佳：`venice/claude-opus-45`（Opus 仍然最强）

参见 [Venice AI](/zh/providers/venice)。

## 快速开始

1. 认证 provider（通常通过 `openclaw onboard`）。
2. 设置默认模型：

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-5" } } },
}
```

## Provider 文档

- [OpenAI (API + Codex)](/zh/providers/openai)
- [Anthropic (API + Claude Code CLI)](/zh/providers/anthropic)
- [Qwen (OAuth)](/zh/providers/qwen)
- [OpenRouter](/zh/providers/openrouter)
- [Vercel AI Gateway](/zh/providers/vercel-ai-gateway)
- [Moonshot AI (Kimi + Kimi Code)](/zh/providers/moonshot)
- [OpenCode Zen](/zh/providers/opencode)
- [Amazon Bedrock](/zh/bedrock)
- [Z.AI](/zh/providers/zai)
- [Xiaomi](/zh/providers/xiaomi)
- [GLM models](/zh/providers/glm)
- [MiniMax](/zh/providers/minimax)
- [Venius（Venice AI，隐私优先）](/zh/providers/venice)
- [Ollama（本地模型）](/zh/providers/ollama)

## 转写提供商

- [Deepgram（音频转写）](/zh/providers/deepgram)

## 社区工具

- [Claude Max API Proxy](/zh/providers/claude-max-api-proxy) - 将 Claude Max/Pro 订阅作为 OpenAI 兼容 API 端点使用

完整的 provider 目录（xAI、Groq、Mistral 等）与高级配置，参见 [Model providers](/zh/concepts/model-providers)。
