---
summary: "Proveedores de modelos (LLM) compatibles con OpenClaw"
read_when:
  - Quieres elegir un proveedor de modelos
  - Necesitas una visión general rápida de los backends LLM compatibles
title: "Directorio de proveedores"
---

# Proveedores de modelos

OpenClaw puede utilizar muchos proveedores de LLM. Elige un proveedor, autentícate y luego establece el modelo predeterminado como `provider/model`.

¿Buscas documentación sobre canales de chat (WhatsApp/Telegram/Discord/Slack/Mattermost (plugin)/etc.)? Consulta [Canales](/es/channels).

## Inicio rápido

1. Autenticarse con el proveedor (generalmente a través de `openclaw onboard`).
2. Establecer el modelo predeterminado:

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
- [Hugging Face (Inferencia)](/es/providers/huggingface)
- [Kilocode](/es/providers/kilocode)
- [LiteLLM (pasarela unificada)](/es/providers/litellm)
- [MiniMax](/es/providers/minimax)
- [Mistral](/es/providers/mistral)
- [Moonshot AI (Kimi + Kimi Coding)](/es/providers/moonshot)
- [NVIDIA](/es/providers/nvidia)
- [Ollama (modelos en la nube + locales)](/es/providers/ollama)
- [OpenAI (API + Codex)](/es/providers/openai)
- [OpenCode (Zen + Go)](/es/providers/opencode)
- [OpenRouter](/es/providers/openrouter)
- [Qianfan](/es/providers/qianfan)
- [Qwen (OAuth)](/es/providers/qwen)
- [Together AI](/es/providers/together)
- [Vercel AI Gateway](/es/providers/vercel-ai-gateway)
- [Venice (Venice AI, centrado en la privacidad)](/es/providers/venice)
- [vLLM (modelos locales)](/es/providers/vllm)
- [xAI](/es/providers/xai)
- [Xiaomi](/es/providers/xiaomi)
- [Z.AI](/es/providers/zai)

## Proveedores de transcripción

- [Deepgram (transcripción de audio)](/es/providers/deepgram)

## Herramientas de la comunidad

- [Claude Max API Proxy](/es/providers/claude-max-api-proxy) - Proxy comunitario para credenciales de suscripción de Claude (verifique la política/términos de Anthropic antes de usarlo)

Para el catálogo completo de proveedores (xAI, Groq, Mistral, etc.) y la configuración avanzada,
consulte [Model providers](/es/concepts/model-providers).

import es from "/components/footer/es.mdx";

<es />
