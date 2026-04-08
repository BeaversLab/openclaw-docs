---
summary: "OpenClaw 支持的模型提供商 (LLM)"
read_when:
  - You want to choose a model provider
  - You need a quick overview of supported LLM backends
title: "提供商目录"
---

# 模型提供商

OpenClaw 可以使用许多 LLM 提供商。选择一个提供商，进行身份验证，然后将默认模型设置为 `provider/model`。

正在寻找聊天渠道文档（WhatsApp/Telegram/Discord/Slack/Mattermost (插件)/等）？请参阅[渠道](/en/channels)。

## 快速开始

1. 与提供商进行身份验证（通常通过 `openclaw onboard`）。
2. 设置默认模型：

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## 提供商文档

- [阿里巴巴模型工作室](/en/providers/alibaba)
- [Amazon Bedrock](/en/providers/bedrock)
- [Anthropic (API + Claude CLI)](/en/providers/anthropic)
- [BytePlus (国际版)](/en/concepts/model-providers#byteplus-international)
- [Chutes](/en/providers/chutes)
- [ComfyUI](/en/providers/comfy)
- [Cloudflare AI Gateway(网关)](/en/providers/cloudflare-ai-gateway)
- [DeepSeek](/en/providers/deepseek)
- [fal](/en/providers/fal)
- [Fireworks](/en/providers/fireworks)
- [GitHub Copilot](/en/providers/github-copilot)
- [GLM 模型](/en/providers/glm)
- [Google (Gemini)](/en/providers/google)
- [Groq (LPU 推理)](/en/providers/groq)
- [Hugging Face (推理)](/en/providers/huggingface)
- [Kilocode](/en/providers/kilocode)
- [LiteLLM (统一网关)](/en/providers/litellm)
- [MiniMax](/en/providers/minimax)
- [Mistral](/en/providers/mistral)
- [Moonshot AI (Kimi + Kimi Coding)](/en/providers/moonshot)
- [NVIDIA](/en/providers/nvidia)
- [Ollama (云端 + 本地模型)](/en/providers/ollama)
- [OpenAI (API + Codex)](/en/providers/openai)
- [OpenCode](/en/providers/opencode)
- [OpenCode Go](/en/providers/opencode-go)
- [OpenRouter](/en/providers/openrouter)
- [Perplexity (网络搜索)](/en/providers/perplexity-provider)
- [Qianfan](/en/providers/qianfan)
- [Qwen Cloud](/en/providers/qwen)
- [Runway](/en/providers/runway)
- [SGLang (本地模型)](/en/providers/sglang)
- [StepFun](/en/providers/stepfun)
- [Synthetic](/en/providers/synthetic)
- [Together AI](/en/providers/together)
- [Venice (Venice AI，注重隐私)](/en/providers/venice)
- [Vercel AI Gateway(网关)](/en/providers/vercel-ai-gateway)
- [Vydra](/en/providers/vydra)
- [vLLM (本地模型)](/en/providers/vllm)
- [Volcengine (Doubao)](/en/providers/volcengine)
- [xAI](/en/providers/xai)
- [Xiaomi](/en/providers/xiaomi)
- [Z.AI](/en/providers/zai)

## 共享概览页面

- [Additional bundled variants](/en/providers/models#additional-bundled-provider-variants) - Anthropic Vertex、Copilot Proxy 和 Gemini CLI OAuth
- [Image Generation](/en/tools/image-generation) - 共享 `image_generate` 工具、提供商选择和故障转移
- [Music Generation](/en/tools/music-generation) - 共享 `music_generate` 工具、提供商选择和故障转移
- [Video Generation](/en/tools/video-generation) - 共享 `video_generate` 工具、提供商选择和故障转移

## 转录提供商

- [Deepgram (audio transcription)](/en/providers/deepgram)

## 社区工具

- [Claude Max API Proxy](/en/providers/claude-max-api-proxy) - Claude 订阅凭据的社区代理（使用前请验证 Anthropic 政策/条款）

有关完整的提供商目录（xAI、Groq、Mistral 等）和高级配置，
请参阅 [Model providers](/en/concepts/model-providers)。
