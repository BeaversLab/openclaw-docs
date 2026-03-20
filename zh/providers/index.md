---
summary: "OpenClaw 支持的模型提供商 (LLMs)"
read_when:
  - 您想要选择一个模型提供商
  - 您需要快速了解支持的 LLM 后端
title: "提供商目录"
---

# 模型提供商

OpenClaw 可以使用许多 LLM 提供商。选择一个提供商，进行身份验证，然后将
默认模型设置为 `provider/model`。

正在查找聊天渠道文档（WhatsApp/Telegram/Discord/Slack/Mattermost（插件）/等）？请参阅 [渠道](/zh/channels)。

## 快速开始

1. 与提供商进行身份验证（通常通过 `openclaw onboard`）。
2. 设置默认模型：

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## 提供商文档

- [Amazon Bedrock](/zh/providers/bedrock)
- [Anthropic (API + Claude Code CLI)](/zh/providers/anthropic)
- [Cloudflare AI Gateway(网关)](/zh/providers/cloudflare-ai-gateway)
- [GLM 模型](/zh/providers/glm)
- [Hugging Face (Inference)](/zh/providers/huggingface)
- [Kilocode](/zh/providers/kilocode)
- [LiteLLM (统一网关)](/zh/providers/litellm)
- [MiniMax](/zh/providers/minimax)
- [Mistral](/zh/providers/mistral)
- [Moonshot AI (Kimi + Kimi Coding)](/zh/providers/moonshot)
- [NVIDIA](/zh/providers/nvidia)
- [Ollama (云端 + 本地模型)](/zh/providers/ollama)
- [OpenAI (API + Codex)](/zh/providers/openai)
- [OpenCode (Zen + Go)](/zh/providers/opencode)
- [OpenRouter](/zh/providers/openrouter)
- [Qianfan](/zh/providers/qianfan)
- [Qwen (OAuth)](/zh/providers/qwen)
- [Together AI](/zh/providers/together)
- [Vercel AI Gateway(网关)](/zh/providers/vercel-ai-gateway)
- [Venice (Venice AI, 注重隐私)](/zh/providers/venice)
- [vLLM (本地模型)](/zh/providers/vllm)
- [xAI](/zh/providers/xai)
- [Xiaomi](/zh/providers/xiaomi)
- [Z.AI](/zh/providers/zai)

## 转录提供商

- [Deepgram (音频转录)](/zh/providers/deepgram)

## 社区工具

- [Claude Max API 代理](/zh/providers/claude-max-api-proxy) - 用于 Claude 订阅凭据的社区代理（使用前请核实 Anthropic 的政策/条款）

有关完整的提供商目录（xAI、Groq、Mistral 等）和高级配置，请参阅 [Model providers](/zh/concepts/model-providers)。

import en from "/components/footer/en.mdx";

<en />
