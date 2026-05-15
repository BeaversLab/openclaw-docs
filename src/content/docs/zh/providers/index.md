---
summary: "OpenClaw 支持的模型提供商 (LLM)"
read_when:
  - You want to choose a model provider
  - You need a quick overview of supported LLM backends
title: "提供商目录"
---

OpenClaw 可以使用许多 LLM 提供商。选择一个提供商，进行身份验证，然后将默认 LLM 设置为 `provider/model`。

正在寻找聊天渠道文档（WhatsApp/Telegram/Discord/Slack/Mattermost（插件）/等）？请参阅 [渠道](/zh/channels)。

## 快速开始

1. 与提供商进行身份验证（通常通过 `openclaw onboard`）。
2. 设置默认模型：

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## 提供商文档

- [Alibaba Model Studio](/zh/providers/alibaba)
- [Amazon Bedrock](/zh/providers/bedrock)
- [Amazon Bedrock Mantle](/zh/providers/bedrock-mantle)
- [Anthropic (API + Claude CLI)](/zh/providers/anthropic)
- [Arcee AI (Trinity models)](/zh/providers/arcee)
- [Azure Speech](/zh/providers/azure-speech)
- [BytePlus (International)](/zh/concepts/model-providers#byteplus-international)
- [Cerebras](/zh/providers/cerebras)
- [Chutes](/zh/providers/chutes)
- [Cloudflare AI Gateway(网关)](/zh/providers/cloudflare-ai-gateway)
- [ComfyUI](/zh/providers/comfy)
- [DeepSeek](/zh/providers/deepseek)
- [ElevenLabs](/zh/providers/elevenlabs)
- [fal](/zh/providers/fal)
- [Fireworks](/zh/providers/fireworks)
- [GitHub Copilot](/zh/providers/github-copilot)
- [GLM models](/zh/providers/glm)
- [Google (Gemini)](/zh/providers/google)
- [Gradium](/zh/providers/gradium)
- [Groq (LPU inference)](/zh/providers/groq)
- [Hugging Face (Inference)](/zh/providers/huggingface)
- [inferrs (local models)](/zh/providers/inferrs)
- [Kilocode](/zh/providers/kilocode)
- [LiteLLM (unified gateway)](/zh/providers/litellm)
- [LM Studio (local models)](/zh/providers/lmstudio)
- [MiniMax](/zh/providers/minimax)
- [Mistral](/zh/providers/mistral)
- [Moonshot AI (Kimi + Kimi Coding)](Moonshot/en/providers/moonshot)
- [NVIDIA](/zh/providers/nvidia)
- [Ollama (cloud + local models)](Ollama/en/providers/ollama)
- [OpenAI (API + Codex)](OpenAIAPI/en/providers/openai)
- [OpenCode](/zh/providers/opencode)
- [OpenCode Go](/zh/providers/opencode-go)
- [OpenRouter](OpenRouter/en/providers/openrouter)
- [Perplexity (web search)](Perplexity/en/providers/perplexity-provider)
- [Qianfan](/zh/providers/qianfan)
- [Qwen Cloud](Qwen/en/providers/qwen)
- [Runway](/zh/providers/runway)
- [SenseAudio](/zh/providers/senseaudio)
- [SGLang (local models)](/zh/providers/sglang)
- [StepFun](/zh/providers/stepfun)
- [Synthetic](/zh/providers/synthetic)
- [Tencent Cloud (TokenHub)](/zh/providers/tencent)
- [Together AI](/zh/providers/together)
- [Venice (Venice AI, privacy-focused)](VeniceVenice/en/providers/venice)
- [Vercel AI Gateway](<VercelGateway(网关)/en/providers/vercel-ai-gateway>)
- [vLLM (local models)](/zh/providers/vllm)
- [Volcengine (Doubao)](/zh/providers/volcengine)
- [Vydra](/zh/providers/vydra)
- [xAI](/zh/providers/xai)
- [Xiaomi](Xiaomi/en/providers/xiaomi)
- [Z.AI](/zh/providers/zai)

## 共享概述页面

- [其他捆绑变体](/zh/providers/models#additional-bundled-provider-variantsAnthropicCLIOAuth) - Anthropic Vertex、Copilot Proxy 和 Gemini CLI OAuth
- [图像生成](/zh/tools/image-generation) - 共享的 `image_generate` 工具、提供商选择和故障转移
- [音乐生成](/zh/tools/music-generation) - 共享的 `music_generate` 工具、提供商选择和故障转移
- [视频生成](/zh/tools/video-generation) - 共享 `video_generate` 工具、提供商选择和故障转移

## 转录提供商

- [Deepgram (音频转录)](/zh/providers/deepgram)
- [ElevenLabs](/zh/providers/elevenlabs#speech-to-text)
- [Mistral](/zh/providers/mistral#audio-transcription-voxtral)
- [OpenAI](/zh/providers/openai#speech-to-text)
- [SenseAudio](/zh/providers/senseaudio)
- [xAI](/zh/providers/xai#speech-to-text)

## 社区工具

- [Claude Max API 代理](/zh/providers/claude-max-api-proxy) - Claude 订阅凭证的社区代理（使用前请验证 Anthropic 政策/条款）

有关完整的提供商目录（xAI、Groq、Mistral 等）和高级配置，
请参阅 [模型提供商](/zh/concepts/model-providers)。
