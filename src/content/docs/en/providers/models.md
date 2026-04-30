---
summary: "Model providers (LLMs) supported by OpenClaw"
read_when:
  - You want to choose a model provider
  - You want quick setup examples for LLM auth + model selection
title: "Model provider quickstart"
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

- [Alibaba Model Studio](/en/providers/alibaba)
- [Amazon Bedrock](/en/providers/bedrock)
- [Anthropic (API + Claude CLI)](/en/providers/anthropic)
- [BytePlus (International)](/en/concepts/model-providers#byteplus-international)
- [Chutes](/en/providers/chutes)
- [ComfyUI](/en/providers/comfy)
- [Cloudflare AI Gateway](/en/providers/cloudflare-ai-gateway)
- [DeepInfra](/en/providers/deepinfra)
- [fal](/en/providers/fal)
- [Fireworks](/en/providers/fireworks)
- [GLM models](/en/providers/glm)
- [MiniMax](/en/providers/minimax)
- [Mistral](/en/providers/mistral)
- [Moonshot AI (Kimi + Kimi Coding)](/en/providers/moonshot)
- [OpenAI (API + Codex)](/en/providers/openai)
- [OpenCode (Zen + Go)](/en/providers/opencode)
- [OpenRouter](/en/providers/openrouter)
- [Qianfan](/en/providers/qianfan)
- [Qwen](/en/providers/qwen)
- [Runway](/en/providers/runway)
- [StepFun](/en/providers/stepfun)
- [Synthetic](/en/providers/synthetic)
- [Vercel AI Gateway](/en/providers/vercel-ai-gateway)
- [Venice (Venice AI)](/en/providers/venice)
- [xAI](/en/providers/xai)
- [Z.AI](/en/providers/zai)

## Additional bundled provider variants

- `anthropic-vertex` - implicit Anthropic on Google Vertex support when Vertex credentials are available; no separate onboarding auth choice
- `copilot-proxy` - local VS Code Copilot Proxy bridge; use `openclaw onboard --auth-choice copilot-proxy`
- `google-gemini-cli` - unofficial Gemini CLI OAuth flow; requires a local `gemini` install (`brew install gemini-cli` or `npm install -g @google/gemini-cli`); default model `google-gemini-cli/gemini-3-flash-preview`; use `openclaw onboard --auth-choice google-gemini-cli` or `openclaw models auth login --provider google-gemini-cli --set-default`

For the full provider catalog (xAI, Groq, Mistral, etc.) and advanced configuration,
see [Model providers](/en/concepts/model-providers).

## Related

- [Model selection](/en/concepts/model-providers)
- [Model failover](/en/concepts/model-failover)
- [Models CLI](/en/cli/models)
