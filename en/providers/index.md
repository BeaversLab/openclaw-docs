---
summary: "Model providers (LLMs) supported by OpenClaw"
read_when:
  - You want to choose a model provider
  - You need a quick overview of supported LLM backends
title: "Model Providers"
---

# Model Providers

OpenClaw can use many LLM providers. Pick a provider, authenticate, then set the
default model as `provider/model`.

Looking for chat channel docs (WhatsApp/Telegram/Discord/Slack/Mattermost (plugin)/etc.)? See [Channels](/en/channels).

## Highlight: Venice (Venice AI)

Venice is our recommended Venice AI setup for privacy-first inference with an option to use Opus for hard tasks.

- Default: `venice/llama-3.3-70b`
- Best overall: `venice/claude-opus-45` (Opus remains the strongest)

See [Venice AI](/en/providers/venice).

## Quick start

1. Authenticate with the provider (usually via `openclaw onboard`).
2. Set the default model:

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-5" } } },
}
```

## Provider docs

- [OpenAI (/en/providers/openai)](/providers/openai)
- [Anthropic (/en/providers/anthropic)](/providers/anthropic)
- [Qwen (/en/providers/qwen)](/providers/qwen)
- [OpenRouter](/en/providers/openrouter)
- [Vercel AI Gateway](/en/providers/vercel-ai-gateway)
- [Cloudflare AI Gateway](/en/providers/cloudflare-ai-gateway)
- [Moonshot AI (/en/providers/moonshot)](/providers/moonshot)
- [OpenCode Zen](/en/providers/opencode)
- [Amazon Bedrock](/en/bedrock)
- [Z.AI](/en/providers/zai)
- [Xiaomi](/en/providers/xiaomi)
- [GLM models](/en/providers/glm)
- [MiniMax](/en/providers/minimax)
- [Venice (/en/providers/venice)](/providers/venice)
- [Ollama (/en/providers/ollama)](/providers/ollama)

## Transcription providers

- [Deepgram (/en/providers/deepgram)](/providers/deepgram)

## Community tools

- [Claude Max API Proxy](/en/providers/claude-max-api-proxy) - Use Claude Max/Pro subscription as an OpenAI-compatible API endpoint

For the full provider catalog (xAI, Groq, Mistral, etc.) and advanced configuration,
see [Model providers](/en/concepts/model-providers).
