---
summary: "Proveedores de modelos (LLM) compatibles con OpenClaw"
read_when:
  - You want to choose a model provider
  - You need a quick overview of supported LLM backends
title: "Directorio de proveedores"
---

# Proveedores de modelos

OpenClaw puede utilizar muchos proveedores de LLM. Elija un proveedor, autentíquese y luego establezca el modelo predeterminado como `provider/model`.

¿Busca documentación sobre canales de chat (WhatsApp/Telegram/Discord/Slack/Mattermost (complemento)/etc.)? Consulte [Canales](/es/channels).

## Inicio rápido

1. Autentíquese con el proveedor (generalmente a través de `openclaw onboard`).
2. Establezca el modelo predeterminado:

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## Documentación de proveedores

- [Amazon Bedrock](/es/providers/bedrock)
- [Anthropic (API + Claude Code CLI)](/es/providers/anthropic)
- [Cloudflare AI Gateway](/es/providers/cloudflare-ai-gateway)
- [Modelos GLM](/es/providers/glm)
- [Google (Gemini)](/es/providers/google)
- [Groq (inferencia LPU)](/es/providers/groq)
- [Hugging Face (Inferencia)](/es/providers/huggingface)
- [Kilocode](/es/providers/kilocode)
- [LiteLLM (pasarela unificada)](/es/providers/litellm)
- [MiniMax](/es/providers/minimax)
- [Mistral](/es/providers/mistral)
- [Model Studio (Alibaba Cloud)](/es/providers/modelstudio)
- [Moonshot AI (Kimi + Kimi Coding)](/es/providers/moonshot)
- [NVIDIA](/es/providers/nvidia)
- [Ollama (modelos en la nube + locales)](/es/providers/ollama)
- [OpenAI (API + Codex)](/es/providers/openai)
- [OpenCode (Zen + Go)](/es/providers/opencode)
- [OpenRouter](/es/providers/openrouter)
- [Perplexity (búsqueda web)](/es/providers/perplexity-provider)
- [Qianfan](/es/providers/qianfan)
- [Qwen (OAuth)](/es/providers/qwen)
- [SGLang (modelos locales)](/es/providers/sglang)
- [Together AI](/es/providers/together)
- [Vercel AI Gateway](/es/providers/vercel-ai-gateway)
- [Venice (Venice AI, centrado en la privacidad)](/es/providers/venice)
- [vLLM (modelos locales)](/es/providers/vllm)
- [Volcengine (Doubao)](/es/providers/volcengine)
- [xAI](/es/providers/xai)
- [Xiaomi](/es/providers/xiaomi)
- [Z.AI](/es/providers/zai)

## Proveedores de transcripción

- [Deepgram (transcripción de audio)](/es/providers/deepgram)

## Herramientas comunitarias

- [Claude Max API Proxy](/es/providers/claude-max-api-proxy) - Proxy comunitario para credenciales de suscripción a Claude (verifique la política/términos de Anthropic antes de usarlo)

Para el catálogo completo de proveedores (xAI, Groq, Mistral, etc.) y la configuración avanzada,
consulte [Proveedores de modelos](/es/concepts/model-providers).

import es from "/components/footer/es.mdx";

<es />
