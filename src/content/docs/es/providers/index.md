---
summary: "Proveedores de modelos (LLM) compatibles con OpenClaw"
read_when:
  - You want to choose a model provider
  - You need a quick overview of supported LLM backends
title: "Directorio de proveedores"
---

# Proveedores de modelos

OpenClaw puede utilizar muchos proveedores de LLM. Elija un proveedor, autentíquese y luego establezca el modelo predeterminado como `provider/model`.

¿Busca documentación sobre canales de chat (WhatsApp/Telegram/Discord/Slack/Mattermost (complemento)/etc.)? Consulte [Canales](/en/channels).

## Inicio rápido

1. Autentíquese con el proveedor (generalmente a través de `openclaw onboard`).
2. Establezca el modelo predeterminado:

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## Documentación de proveedores

- [Amazon Bedrock](/en/providers/bedrock)
- [Anthropic (API + Claude Code CLI)](/en/providers/anthropic)
- [Cloudflare AI Gateway](/en/providers/cloudflare-ai-gateway)
- [DeepSeek](/en/providers/deepseek)
- [GitHub Copilot](/en/providers/github-copilot)
- [Modelos GLM](/en/providers/glm)
- [Google (Gemini)](/en/providers/google)
- [Groq (inferencia LPU)](/en/providers/groq)
- [Hugging Face (Inferencia)](/en/providers/huggingface)
- [Kilocode](/en/providers/kilocode)
- [LiteLLM (puerta de enlace unificada)](/en/providers/litellm)
- [MiniMax](/en/providers/minimax)
- [Mistral](/en/providers/mistral)
- [Moonshot AI (Kimi + Kimi Coding)](/en/providers/moonshot)
- [NVIDIA](/en/providers/nvidia)
- [Ollama (modelos en la nube + locales)](/en/providers/ollama)
- [OpenAI (API + Codex)](/en/providers/openai)
- [OpenCode](/en/providers/opencode)
- [OpenCode Go](/en/providers/opencode-go)
- [OpenRouter](/en/providers/openrouter)
- [Perplexity (búsqueda web)](/en/providers/perplexity-provider)
- [Qianfan](/en/providers/qianfan)
- [Qwen / Model Studio (Alibaba Cloud)](/en/providers/qwen_modelstudio)
- [SGLang (modelos locales)](/en/providers/sglang)
- [Synthetic](/en/providers/synthetic)
- [Together AI](/en/providers/together)
- [Venice (Venice AI, centrado en la privacidad)](/en/providers/venice)
- [Vercel AI Gateway](/en/providers/vercel-ai-gateway)
- [vLLM (modelos locales)](/en/providers/vllm)
- [Volcengine (Doubao)](/en/providers/volcengine)
- [xAI](/en/providers/xai)
- [Xiaomi](/en/providers/xiaomi)
- [Z.AI](/en/providers/zai)

## Proveedores de transcripción

- [Deepgram (transcripción de audio)](/en/providers/deepgram)

## Herramientas de la comunidad

- [Claude Max API Proxy](/en/providers/claude-max-api-proxy) - Proxy comunitario para las credenciales de suscripción de Claude (verifique la política/términos de Anthropic antes de usar)

Para el catálogo completo de proveedores (xAI, Groq, Mistral, etc.) y la configuración avanzada,
vea [Proveedores de modelos](/en/concepts/model-providers).
