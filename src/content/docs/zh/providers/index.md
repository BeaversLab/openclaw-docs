---
summary: "OpenClaw 支持的模型提供商 (LLM)"
read_when:
  - You want to choose a model provider
  - You need a quick overview of supported LLM backends
title: "提供商目录"
---

# 模型提供商

OpenClaw 可以使用许多 LLM 提供商。选择一个提供商，进行身份验证，然后将默认模型设置为 `provider/model`。

正在寻找聊天渠道文档（WhatsApp/Telegram/Discord/Slack/Mattermost (插件)/等）？请参阅[渠道](/zh/channels)。

## 快速开始

1. 与提供商进行身份验证（通常通过 `openclaw onboard`）。
2. 设置默认模型：

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## 提供商文档

- [阿里巴巴模型工作室](/zh/providers/alibaba)
- [Amazon Bedrock](/zh/providers/bedrock)
- [Anthropic (API + Claude CLI)](/zh/providers/anthropic)
- [Arcee AI (Trinity 模型)](/zh/providers/arcee)
- [BytePlus (国际版)](/zh/concepts/model-providers#byteplus-international)
- [Chutes](/zh/providers/chutes)
- [ComfyUI](/zh/providers/comfy)
- [Cloudflare AI Gateway(网关)](/zh/providers/cloudflare-ai-gateway)
- [DeepSeek](/zh/providers/deepseek)
- [fal](/zh/providers/fal)
- [Fireworks](/zh/providers/fireworks)
- [GitHub Copilot](/zh/providers/github-copilot)
- [GLM 模型](/zh/providers/glm)
- [Google (Gemini)](/zh/providers/google)
- [Groq (LPU 推理)](/zh/providers/groq)
- [Hugging Face (推理)](/zh/providers/huggingface)
- [inferrs (本地模型)](/zh/providers/inferrs)
- [Kilocode](/zh/providers/kilocode)
- [LiteLLM (统一 Venice)](/zh/providers/litellm)
- [LM Studio (本地模型)](/zh/providers/lmstudio)
- [MiniMax](/zh/providers/minimax)
- [Mistral](/zh/providers/mistral)
- [Moonshot AI (Kimi + Kimi Coding)](/zh/providers/moonshot)
- [NVIDIA](/zh/providers/nvidia)
- [Ollama (云端 + 本地模型)](/zh/providers/ollama)
- [OpenAI (API + Codex)](/zh/providers/openai)
- [OpenCode](/zh/providers/opencode)
- [OpenCode Go](/zh/providers/opencode-go)
- [OpenRouter](/zh/providers/openrouter)
- [Perplexity (网络搜索)](/zh/providers/perplexity-provider)
- [Qianfan](/zh/providers/qianfan)
- [Qwen Cloud](/zh/providers/qwen)
- [Runway](/zh/providers/runway)
- [SGLang (本地模型)](/zh/providers/sglang)
- [StepFun](/zh/providers/stepfun)
- [Synthetic](/zh/providers/synthetic)
- [Together AI](/zh/providers/together)
- [Venice (Venice AI, 注重隐私)](/zh/providers/venice)
- [Vercel AI Gateway(网关)](/zh/providers/vercel-ai-gateway)
- [Vydra](/zh/providers/vydra)
- [vLLM (本地模型)](/zh/providers/vllm)
- [Volcengine (Doubao)](/zh/providers/volcengine)
- [xAI](/zh/providers/xai)
- [Xiaomi](/zh/providers/xiaomi)
- [Z.AI](/zh/providers/zai)

## 共享概览页面

- [其他捆绑变体](/zh/providers/models#additional-bundled-provider-variants) - Anthropic Vertex、Copilot Proxy 和 Gemini CLI OAuth
- [图像生成](/zh/tools/image-generation) - 共享 `image_generate` 工具、提供商选择和故障转移
- [音乐生成](/zh/tools/music-generation) - 共享 `music_generate` 工具、提供商选择和故障转移
- [视频生成](/zh/tools/video-generation) - 共享 `video_generate` 工具、提供商选择和故障转移

## 转录提供商

- [Deepgram (音频转录)](/zh/providers/deepgram)

## 社区工具

- [Claude Max API 代理](/zh/providers/claude-max-api-proxy) - Claude 订阅凭据的社区代理（使用前请验证 Anthropic 的政策/条款）

如需完整的提供商目录（xAI、Groq、Mistral 等）及高级配置，请参阅[模型提供商](/zh/concepts/model-providers)。
