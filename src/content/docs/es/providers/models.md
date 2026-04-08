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

- [Alibaba Model Studio](/en/providers/alibaba)
- [Anthropic (API + Claude CLI)](/en/providers/anthropic)
- [Amazon Bedrock](/en/providers/bedrock)
- [BytePlus (International)](/en/concepts/model-providers#byteplus-international)
- [Chutes](/en/providers/chutes)
- [ComfyUI](/en/providers/comfy)
- [Cloudflare AI Gateway](/en/providers/cloudflare-ai-gateway)
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

## Variantes de proveedores adicionales incluidos

- `anthropic-vertex` - soporte implícito de Anthropic en Google Vertex cuando las credenciales de Vertex están disponibles; no requiere una elección separada de autenticación de incorporación
- `copilot-proxy` - puente local del Proxy de VS Code Copilot; use `openclaw onboard --auth-choice copilot-proxy`

Para el catálogo completo de proveedores (xAI, Groq, Mistral, etc.) y configuración avanzada,
consulte [Model providers](/en/concepts/model-providers).
