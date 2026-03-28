---
summary: "OpenClaw 支持的模型提供商 (LLM)"
read_when:
  - You want to choose a model provider
  - You need a quick overview of supported LLM backends
title: "提供商目录"
---

# 模型提供商

OpenClaw 可以使用许多 LLM 提供商。选择一个提供商，进行身份验证，然后将默认模型设置为 `provider/model`。

正在寻找聊天渠道文档（WhatsApp/Telegram/Discord/Slack/Mattermost (插件)/etc.）？请参阅 [渠道](/zh/channels)。

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
- [DeepSeek](/zh/providers/deepseek)
- [GitHub Copilot](/zh/providers/github-copilot)
- [GLM 模型](/zh/providers/glm)
- [Google (Gemini)](/zh/providers/google)
- [Groq (LPU 推理)](/zh/providers/groq)
- [Hugging Face (推理)](/zh/providers/huggingface)
- [Kilocode](/zh/providers/kilocode)
- [LiteLLM (统一网关)](/zh/providers/litellm)
- [MiniMax](/zh/providers/minimax)
- [Mistral](/zh/providers/mistral)
- [Model Studio (阿里云)](/zh/providers/modelstudio)
- [Moonshot AI (Kimi + Kimi Coding)](/zh/providers/moonshot)
- [NVIDIA](/zh/providers/nvidia)
- [Ollama (云端 + 本地模型)](/zh/providers/ollama)
- [OpenAI (API + Codex)](/zh/providers/openai)
- [OpenCode](/zh/providers/opencode)
- [OpenCode Go](/zh/providers/opencode-go)
- [OpenRouter](/zh/providers/openrouter)
- [Perplexity (网络搜索)](/zh/providers/perplexity-provider)
- [Qianfan](/zh/providers/qianfan)
- [Qwen (OAuth)](/zh/providers/qwen)
- [SGLang (本地模型)](/zh/providers/sglang)
- [Synthetic](/zh/providers/synthetic)
- [Together AI](/zh/providers/together)
- [Venice (Venice AI, 注重隐私)](/zh/providers/venice)
- [Vercel AI Gateway(网关)](/zh/providers/vercel-ai-gateway)
- [vLLM (本地模型)](/zh/providers/vllm)
- [Volcengine (Doubao)](/zh/providers/volcengine)
- [xAI](/zh/providers/xai)
- [Xiaomi](/zh/providers/xiaomi)
- [Z.AI](/zh/providers/zai)

## 转录提供商

- [Deepgram (音频转录)](/zh/providers/deepgram)

## 社区工具

- [Claude Max API Proxy](/zh/providers/claude-max-api-proxy) - Claude 订阅凭证的社区代理（使用前请验证 Anthropic 政策/条款）

如需完整的提供商目录（xAI、Groq、Mistral 等）和高级配置，
请参阅 [Model providers](/zh/concepts/model-providers)。
