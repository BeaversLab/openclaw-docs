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

- [Alibaba Model Studio](/es/providers/alibaba)
- [Anthropic (API + Claude CLI)](/es/providers/anthropic)
- [Amazon Bedrock](/es/providers/bedrock)
- [BytePlus (International)](/es/concepts/model-providers#byteplus-international)
- [Chutes](/es/providers/chutes)
- [ComfyUI](/es/providers/comfy)
- [Cloudflare AI Gateway](/es/providers/cloudflare-ai-gateway)
- [fal](/es/providers/fal)
- [Fireworks](/es/providers/fireworks)
- [Modelos GLM](/es/providers/glm)
- [MiniMax](/es/providers/minimax)
- [Mistral](/es/providers/mistral)
- [Moonshot AI (Kimi + Kimi Coding)](/es/providers/moonshot)
- [OpenAI (API + Codex)](/es/providers/openai)
- [OpenCode (Zen + Go)](/es/providers/opencode)
- [OpenRouter](/es/providers/openrouter)
- [Qianfan](/es/providers/qianfan)
- [Qwen](/es/providers/qwen)
- [Runway](/es/providers/runway)
- [StepFun](/es/providers/stepfun)
- [Synthetic](/es/providers/synthetic)
- [Vercel AI Gateway](/es/providers/vercel-ai-gateway)
- [Venice (Venice AI)](/es/providers/venice)
- [xAI](/es/providers/xai)
- [Z.AI](/es/providers/zai)

## Variantes de proveedores adicionales incluidos

- `anthropic-vertex` - soporte implícito de Anthropic en Google Vertex cuando las credenciales de Vertex están disponibles; no requiere una elección separada de autenticación de incorporación
- `copilot-proxy` - puente local del Proxy de VS Code Copilot; use `openclaw onboard --auth-choice copilot-proxy`
- `google-gemini-cli` - flujo OAuth de la CLI de Gemini no oficial; requiere una instalación local de `gemini` (`brew install gemini-cli` o `npm install -g @google/gemini-cli`); modelo predeterminado `google-gemini-cli/gemini-3-flash-preview`; use `openclaw onboard --auth-choice google-gemini-cli` o `openclaw models auth login --provider google-gemini-cli --set-default`

Para el catálogo completo de proveedores (xAI, Groq, Mistral, etc.) y la configuración avanzada,
consulte [Proveedores de modelos](/es/concepts/model-providers).
