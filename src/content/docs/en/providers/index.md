---
summary: "Model providers (LLMs) supported by OpenClaw"
read_when:
  - You want to choose a model provider
  - You need a quick overview of supported LLM backends
title: "Provider directory"
---

# Model Providers

OpenClaw can use many LLM providers. Pick a provider, authenticate, then set the
default model as `provider/model`.

Looking for chat channel docs (WhatsApp/Telegram/Discord/Slack/Mattermost (plugin)/etc.)? See [Channels](/en/channels).

## Quick start

1. Authenticate with the provider (usually via `openclaw onboard`).
2. Set the default model:

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## Provider docs

- [Alibaba Model Studio](/en/providers/alibaba)
- [Amazon Bedrock](/en/providers/bedrock)
- [Amazon Bedrock Mantle](/en/providers/bedrock-mantle)
- [Anthropic (API + Claude CLI)](/en/providers/anthropic)
- [Arcee AI (Trinity models)](/en/providers/arcee)
- [Azure Speech](/en/providers/azure-speech)
- [BytePlus (International)](/en/concepts/model-providers#byteplus-international)
- [Cerebras](/en/providers/cerebras)
- [Chutes](/en/providers/chutes)
- [Cloudflare AI Gateway](/en/providers/cloudflare-ai-gateway)
- [ComfyUI](/en/providers/comfy)
- [DeepSeek](/en/providers/deepseek)
- [ElevenLabs](/en/providers/elevenlabs)
- [fal](/en/providers/fal)
- [Fireworks](/en/providers/fireworks)
- [GitHub Copilot](/en/providers/github-copilot)
- [GLM models](/en/providers/glm)
- [Google (Gemini)](/en/providers/google)
- [Gradium](/en/providers/gradium)
- [Groq (LPU inference)](/en/providers/groq)
- [Hugging Face (Inference)](/en/providers/huggingface)
- [inferrs (local models)](/en/providers/inferrs)
- [Kilocode](/en/providers/kilocode)
- [LiteLLM (unified gateway)](/en/providers/litellm)
- [LM Studio (local models)](/en/providers/lmstudio)
- [MiniMax](/en/providers/minimax)
- [Mistral](/en/providers/mistral)
- [Moonshot AI (Kimi + Kimi Coding)](/en/providers/moonshot)
- [NVIDIA](/en/providers/nvidia)
- [Ollama (cloud + local models)](/en/providers/ollama)
- [OpenAI (API + Codex)](/en/providers/openai)
- [OpenCode](/en/providers/opencode)
- [OpenCode Go](/en/providers/opencode-go)
- [OpenRouter](/en/providers/openrouter)
- [Perplexity (web search)](/en/providers/perplexity-provider)
- [Qianfan](/en/providers/qianfan)
- [Qwen Cloud](/en/providers/qwen)
- [Runway](/en/providers/runway)
- [SenseAudio](/en/providers/senseaudio)
- [SGLang (local models)](/en/providers/sglang)
- [StepFun](/en/providers/stepfun)
- [Synthetic](/en/providers/synthetic)
- [Tencent Cloud (TokenHub)](/en/providers/tencent)
- [Together AI](/en/providers/together)
- [Venice (Venice AI, privacy-focused)](/en/providers/venice)
- [Vercel AI Gateway](/en/providers/vercel-ai-gateway)
- [vLLM (local models)](/en/providers/vllm)
- [Volcengine (Doubao)](/en/providers/volcengine)
- [Vydra](/en/providers/vydra)
- [xAI](/en/providers/xai)
- [Xiaomi](/en/providers/xiaomi)
- [Z.AI](/en/providers/zai)

## Shared overview pages

- [Additional bundled variants](/en/providers/models#additional-bundled-provider-variants) - Anthropic Vertex, Copilot Proxy, and Gemini CLI OAuth
- [Image Generation](/en/tools/image-generation) - Shared `image_generate` tool, provider selection, and failover
- [Music Generation](/en/tools/music-generation) - Shared `music_generate` tool, provider selection, and failover
- [Video Generation](/en/tools/video-generation) - Shared `video_generate` tool, provider selection, and failover

## Transcription providers

- [Deepgram (audio transcription)](/en/providers/deepgram)
- [ElevenLabs](/en/providers/elevenlabs#speech-to-text)
- [Mistral](/en/providers/mistral#audio-transcription-voxtral)
- [OpenAI](/en/providers/openai#speech-to-text)
- [SenseAudio](/en/providers/senseaudio)
- [xAI](/en/providers/xai#speech-to-text)

## Community tools

- [Claude Max API Proxy](/en/providers/claude-max-api-proxy) - Community proxy for Claude subscription credentials (verify Anthropic policy/terms before use)

For the full provider catalog (xAI, Groq, Mistral, etc.) and advanced configuration,
see [Model providers](/en/concepts/model-providers).
