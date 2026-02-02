---
summary: "Model providers (LLMs) supported by OpenClaw"
read_when:
  - You want to choose a model provider
  - You want quick setup examples for LLM auth + model selection
title: "Model Provider Quickstart"
---

# Model Providers

OpenClaw can use many LLM providers. Pick one, authenticate, then set the default
model as `provider/model`.

## Highlight: Venice (Venice AI)

Venice is our recommended Venice AI setup for privacy-first inference with an option to use Opus for the hardest tasks.

- Default: `venice/llama-3.3-70b`
- Best overall: `venice/claude-opus-45` (Opus remains the strongest)

See [Venice AI](/en/providers/venice).

## Quick start (two steps)

1. Authenticate with the provider (usually via `openclaw onboard`).
2. Set the default model:

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-5" } } },
}
```

## Supported providers (starter set)

- [OpenAI (API + Codex)](/en/providers/openai)
- [Anthropic (API + Claude Code CLI)](/en/providers/anthropic)
- [OpenRouter](/en/providers/openrouter)
- [Vercel AI Gateway](/en/providers/vercel-ai-gateway)
- [Moonshot AI (Kimi + Kimi Coding)](/en/providers/moonshot)
- [Synthetic](/en/providers/synthetic)
- [OpenCode Zen](/en/providers/opencode)
- [Z.AI](/en/providers/zai)
- [GLM models](/en/providers/glm)
- [MiniMax](/en/providers/minimax)
- [Venice (Venice AI)](/en/providers/venice)
- [Amazon Bedrock](/en/bedrock)

For the full provider catalog (xAI, Groq, Mistral, etc.) and advanced configuration,
see [Model providers](/en/concepts/model-providers).
