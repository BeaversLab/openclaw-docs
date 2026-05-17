---
summary: "Proveedores de modelos (LLM) compatibles con OpenClaw"
read_when:
  - You want to choose a model provider
  - You want quick setup examples for LLM auth + model selection
title: "Inicio rápido del proveedor de modelos"
---

OpenClaw puede usar muchos proveedores de LLM. Elija uno, autentíquese y luego establezca el modelo predeterminado como `provider/model`.

## Inicio rápido (dos pasos)

1. Autentíquese con el proveedor (generalmente a través de `openclaw onboard`).
2. Establezca el modelo predeterminado:

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## Proveedores admitidos (conjunto inicial)

- [Alibaba Model Studio](/es/providers/alibaba)
- [Amazon Bedrock](/es/providers/bedrock)
- [Anthropic (API + Claude CLI)](/es/providers/anthropic)
- [BytePlus (International)](/es/concepts/model-providers#byteplus-international)
- [Chutes](/es/providers/chutes)
- [ComfyUI](/es/providers/comfy)
- [Cloudflare AI Gateway](/es/providers/cloudflare-ai-gateway)
- [DeepInfra](/es/providers/deepinfra)
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

## Variantes adicionales de proveedores

- `anthropic-vertex`: instale `@openclaw/anthropic-vertex-provider` para compatibilidad implícita con Anthropic en Google Vertex cuando las credenciales de Vertex estén disponibles; sin opción separada de autenticación de incorporación
- `copilot-proxy`: puente local de VS Code Copilot Proxy; use `openclaw onboard --auth-choice copilot-proxy`
- `google-gemini-cli`: flujo de OAuth no oficial de Gemini CLI; requiere una instalación local de `gemini` (`brew install gemini-cli` o `npm install -g @google/gemini-cli`); modelo predeterminado `google-gemini-cli/gemini-3-flash-preview`; use `openclaw onboard --auth-choice google-gemini-cli` o `openclaw models auth login --provider google-gemini-cli --set-default`

Para el catálogo completo de proveedores (xAI, Groq, Mistral, etc.) y configuración avanzada,
consulte [Proveedores de modelos](/es/concepts/model-providers).

## Relacionado

- [Selección de modelo](/es/concepts/model-providers)
- [Conmutación por error de modelos](/es/concepts/model-failover)
- [CLI de modelos](/es/cli/models)
