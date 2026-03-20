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

## Quick start (two steps)

1. Authenticate with the provider (usually via `openclaw onboard`).
2. Set the default model:

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## Supported providers (starter set)

- [OpenAI (API + Codex)](/fr/providers/openai)
- [Anthropic (API + Claude Code CLI)](/fr/providers/anthropic)
- [OpenRouter](/fr/providers/openrouter)
- [Vercel AI Gateway](/fr/providers/vercel-ai-gateway)
- [Cloudflare AI Gateway](/fr/providers/cloudflare-ai-gateway)
- [Moonshot AI (Kimi + Kimi Coding)](/fr/providers/moonshot)
- [Mistral](/fr/providers/mistral)
- [Synthetic](/fr/providers/synthetic)
- [OpenCode (Zen + Go)](/fr/providers/opencode)
- [Z.AI](/fr/providers/zai)
- [GLM models](/fr/providers/glm)
- [MiniMax](/fr/providers/minimax)
- [Venice (Venice AI)](/fr/providers/venice)
- [Amazon Bedrock](/fr/providers/bedrock)
- [Qianfan](/fr/providers/qianfan)
- [xAI](/fr/providers/xai)

For the full provider catalog (xAI, Groq, Mistral, etc.) and advanced configuration,
see [Model providers](/fr/concepts/model-providers).

import fr from "/components/footer/fr.mdx";

<fr />
