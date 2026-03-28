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

- [OpenAI (API + Codex)](/es/providers/openai)
- [Anthropic (API + Claude Code CLI)](/es/providers/anthropic)
- [OpenRouter](/es/providers/openrouter)
- [Vercel AI Gateway](/es/providers/vercel-ai-gateway)
- [Cloudflare AI Gateway](/es/providers/cloudflare-ai-gateway)
- [Moonshot AI (Kimi + Kimi Coding)](/es/providers/moonshot)
- [Mistral](/es/providers/mistral)
- [Synthetic](/es/providers/synthetic)
- [OpenCode (Zen + Go)](/es/providers/opencode)
- [Z.AI](/es/providers/zai)
- [Modelos GLM](/es/providers/glm)
- [MiniMax](/es/providers/minimax)
- [Venice (Venice AI)](/es/providers/venice)
- [Amazon Bedrock](/es/providers/bedrock)
- [Qianfan](/es/providers/qianfan)
- [xAI](/es/providers/xai)

Para el catálogo completo de proveedores (xAI, Groq, Mistral, etc.) y la configuración avanzada,
consulta [Proveedores de modelos](/es/concepts/model-providers).
