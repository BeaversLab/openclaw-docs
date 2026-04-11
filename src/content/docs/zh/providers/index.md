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
- [Arcee AI (Trinity 模型)](/en/providers/arcee)
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
- [inferrs (本地模型)](/en/providers/inferrs)
- [Kilocode](/en/providers/kilocode)
- [LiteLLM (统一 Gateway(网关))](/en/providers/litellm)
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
- [Venice (Venice AI, 注重隐私)](/en/providers/venice)
- [Vercel AI Gateway(网关)](/en/providers/vercel-ai-gateway)
- [Vydra](/en/providers/vydra)
- [vLLM (本地模型)](/en/providers/vllm)
- [Volcengine (Doubao)](/en/providers/volcengine)
- [xAI](/en/providers/xai)
- [Xiaomi](/en/providers/xiaomi)
- [Z.AI](/en/providers/zai)

## 共享概览页面

- [Additional bundled variants](/en/providers/models#additional-bundled-provider-variants) - Anthropic Vertex, Copilot Proxy, and Gemini CLI OAuth
- [Image Generation](/en/tools/image-generation) - Shared `image_generate` 工具, 提供商 selection, and failover
- [Music Generation](/en/tools/music-generation) - Shared `music_generate` 工具, 提供商 selection, and failover
- [Video Generation](/en/tools/video-generation) - Shared `video_generate` 工具, 提供商 selection, and failover

## 转录提供商

- [Deepgram (audio transcription)](/en/providers/deepgram)

## 社区工具

- [Claude Max API Proxy](/en/providers/claude-max-api-proxy) - Community proxy for Claude subscription credentials (verify Anthropic policy/terms before use)

For the full 提供商 catalog (xAI, Groq, Mistral, etc.) and advanced configuration,
see [Model providers](/en/concepts/model-providers).
