---
summary: "OpenClaw 支持的模型提供商 (LLM)"
read_when:
  - You want to choose a model provider
  - You need a quick overview of supported LLM backends
title: "模型提供商"
---

# 模型提供商

OpenClaw 可以使用许多 LLM 提供商。选择一个提供商，进行身份验证，然后将默认模型设置为 `provider/model`。

寻找聊天频道文档（WhatsApp/Telegram/Discord/Slack/Mattermost (插件)/等）？请参阅 [频道](/en/channels)。

## 快速开始

1. 与提供商进行身份验证（通常通过 `openclaw onboard`）。
2. 设置默认模型：

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## 提供商文档

- [Amazon Bedrock](/en/providers/bedrock)
- [Anthropic (API + Claude Code CLI)](/en/providers/anthropic)
- [Cloudflare AI Gateway](/en/providers/cloudflare-ai-gateway)
- [GLM models](/en/providers/glm)
- [Hugging Face (Inference)](/en/providers/huggingface)
- [Kilocode](/en/providers/kilocode)
- [LiteLLM (unified gateway)](/en/providers/litellm)
- [MiniMax](/en/providers/minimax)
- [Mistral](/en/providers/mistral)
- [Moonshot AI (Kimi + Kimi Coding)](/en/providers/moonshot)
- [NVIDIA](/en/providers/nvidia)
- [Ollama (local models)](/en/providers/ollama)
- [OpenAI (API + Codex)](/en/providers/openai)
- [OpenCode (Zen + Go)](/en/providers/opencode)
- [OpenRouter](/en/providers/openrouter)
- [Qianfan](/en/providers/qianfan)
- [Qwen (OAuth)](/en/providers/qwen)
- [Together AI](/en/providers/together)
- [Vercel AI Gateway](/en/providers/vercel-ai-gateway)
- [Venice (Venice AI, privacy-focused)](/en/providers/venice)
- [vLLM (local models)](/en/providers/vllm)
- [Xiaomi](/en/providers/xiaomi)
- [Z.AI](/en/providers/zai)

## 转录提供商

- [Deepgram (audio transcription)](/en/providers/deepgram)

## 社区工具

- [Claude Max API Proxy](/en/providers/claude-max-api-proxy) - Claude 订阅凭据的社区代理（使用前请核实 Anthropic 的政策/条款）

有关完整的提供商目录（xAI、Groq、Mistral 等）和高级配置，请参阅 [模型提供商](/en/concepts/model-providers)。

import zh from '/components/footer/zh.mdx';

<zh />
