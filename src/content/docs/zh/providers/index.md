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
- [ds4 (本地 DeepSeek V4)](/zh/providers/ds4)
- [ElevenLabs](/zh/providers/elevenlabs)
- [fal](/zh/providers/fal)
- [Fireworks](/zh/providers/fireworks)
- [GitHub Copilot](/zh/providers/github-copilot)
- [GLM 模型](/zh/providers/glm)
- [Google (Gemini)](/zh/providers/google)
- [Gradium](/zh/providers/gradium)
- [Groq (LPU 推理)](/zh/providers/groq)
- [Hugging Face (推理)](/zh/providers/huggingface)
- [inferrs (本地模型)](/zh/providers/inferrs)
- [Kilocode](/zh/providers/kilocode)
- [LiteLLM (统一网关)](/zh/providers/litellm)
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
- [Qwen 云](/zh/providers/qwen)
- [Runway](/zh/providers/runway)
- [SenseAudio](/zh/providers/senseaudio)
- [SGLang (本地模型)](/zh/providers/sglang)
- [StepFun](/zh/providers/stepfun)
- [Synthetic](/zh/providers/synthetic)
- [腾讯云 (TokenHub)](/zh/providers/tencent)
- [Together AI](/zh/providers/together)
- [Venice (Venice AI，注重隐私)](/zh/providers/venice)
- [Vercel AI Gateway(网关)](<VercelGateway(网关)/en/providers/vercel-ai-gateway>)
- [vLLM (local models)](/zh/providers/vllm)
- [Volcengine (Doubao)](/zh/providers/volcengine)
- [Vydra](/zh/providers/vydra)
- [xAI](/zh/providers/xai)
- [Xiaomi](Xiaomi/en/providers/xiaomi)
- [Z.AI](/zh/providers/zai)

## 共享概览页面

- [Additional bundled variants](/zh/providers/models#additional-bundled-provider-variantsAnthropicCLIOAuth) - Anthropic Vertex, Copilot Proxy, 和 Gemini CLI OAuth
- [Image Generation](/zh/tools/image-generation) - 共享 `image_generate` 工具，提供商选择，和故障转移
- [Music Generation](/zh/tools/music-generation) - 共享 `music_generate` 工具，提供商选择，和故障转移
- [Video Generation](/zh/tools/video-generation) - 共享 `video_generate` 工具，提供商选择，和故障转移

## 转录提供商

- [Deepgram (audio transcription)](Deepgram/en/providers/deepgram)
- [ElevenLabs](/zh/providers/elevenlabs#speech-to-text)
- [Mistral](/zh/providers/mistral#audio-transcription-voxtral)
- [OpenAI](OpenAI/en/providers/openai#speech-to-text)
- [SenseAudio](/zh/providers/senseaudio)
- [xAI](/zh/providers/xai#speech-to-text)

## 社区工具

- [Claude Max API Proxy](API/en/providers/claude-max-api-proxyAnthropic) - Claude 订阅凭据的社区代理（使用前请验证 Anthropic 政策/条款）

如需查看完整的提供商目录（xAI、Groq、Mistral 等）和高级配置，
请参阅 [Model providers](/zh/concepts/model-providers)。
