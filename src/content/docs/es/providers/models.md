---
summary: "Proveedores de modelos (LLM) compatibles con OpenClaw"
read_when:
  - You want to choose a model provider
  - You want quick setup examples for LLM auth + model selection
title: "Inicio rápido del proveedor de modelos"
---

# Proveedores de modelos

OpenClaw puede utilizar muchos proveedores de LLM. Elija uno, autentíquese y luego establezca el modelo predeterminado como `provider/model`.

## Inicio rápido (dos pasos)

1. Autentíquese con el proveedor (generalmente a través de `openclaw onboard`).
2. Establezca el modelo predeterminado:

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## Proveedores compatibles (conjunto inicial)

- [OpenAI (API + Codex)](/en/providers/openai)
- [Anthropic (API + Claude Code CLI)](/en/providers/anthropic)
- [OpenRouter](/en/providers/openrouter)
- [Vercel AI Gateway](/en/providers/vercel-ai-gateway)
- [Cloudflare AI Gateway](/en/providers/cloudflare-ai-gateway)
- [Moonshot AI (Kimi + Kimi Coding)](/en/providers/moonshot)
- [Mistral](/en/providers/mistral)
- [Synthetic](/en/providers/synthetic)
- [OpenCode (Zen + Go)](/en/providers/opencode)
- [Z.AI](/en/providers/zai)
- [Modelos GLM](/en/providers/glm)
- [MiniMax](/en/providers/minimax)
- [Venice (Venice AI)](/en/providers/venice)
- [Amazon Bedrock](/en/providers/bedrock)
- [Qianfan](/en/providers/qianfan)
- [xAI](/en/providers/xai)

Para el catálogo completo de proveedores (xAI, Groq, Mistral, etc.) y la configuración avanzada,
consulta [Proveedores de modelos](/en/concepts/model-providers).
