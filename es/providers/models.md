---
summary: "Proveedores de modelos (LLM) compatibles con OpenClaw"
read_when:
  - Quieres elegir un proveedor de modelos
  - Quieres ejemplos de configuración rápida para la autenticación de LLM + selección de modelo
title: "Inicio rápido del proveedor de modelos"
---

# Proveedores de modelos

OpenClaw puede utilizar muchos proveedores de LLM. Elige uno, autentícate y luego establece el modelo
predeterminado como `provider/model`.

## Inicio rápido (dos pasos)

1. Autentícate con el proveedor (generalmente mediante `openclaw onboard`).
2. Establecer el modelo predeterminado:

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

import es from "/components/footer/es.mdx";

<es />
