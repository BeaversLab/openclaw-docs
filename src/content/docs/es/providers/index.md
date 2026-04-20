---
summary: "Proveedores de modelos (LLM) compatibles con OpenClaw"
read_when:
  - You want to choose a model provider
  - You need a quick overview of supported LLM backends
title: "Directorio de proveedores"
---

# Proveedores de modelos

OpenClaw puede utilizar muchos proveedores de LLM. Elija un proveedor, autentíquese y luego establezca el modelo predeterminado como `provider/model`.

¿Buscas documentación sobre canales de chat (WhatsApp/Telegram/Discord/Slack/Mattermost (complemento)/etc.)? Consulta [Canales](/es/channels).

## Inicio rápido

1. Autentíquese con el proveedor (generalmente a través de `openclaw onboard`).
2. Establezca el modelo predeterminado:

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## Documentación de proveedores

- [Alibaba Model Studio](/es/providers/alibaba)
- [Amazon Bedrock](/es/providers/bedrock)
- [Anthropic (API + Claude CLI)](/es/providers/anthropic)
- [Arcee AI (modelos Trinity)](/es/providers/arcee)
- [BytePlus (Internacional)](/es/concepts/model-providers#byteplus-international)
- [Chutes](/es/providers/chutes)
- [ComfyUI](/es/providers/comfy)
- [Cloudflare AI Gateway](/es/providers/cloudflare-ai-gateway)
- [DeepSeek](/es/providers/deepseek)
- [fal](/es/providers/fal)
- [Fireworks](/es/providers/fireworks)
- [GitHub Copilot](/es/providers/github-copilot)
- [Modelos GLM](/es/providers/glm)
- [Google (Gemini)](/es/providers/google)
- [Groq (inferencia LPU)](/es/providers/groq)
- [Hugging Face (Inferencia)](/es/providers/huggingface)
- [inferrs (modelos locales)](/es/providers/inferrs)
- [Kilocode](/es/providers/kilocode)
- [LiteLLM (puerta de enlace unificada)](/es/providers/litellm)
- [LM Studio (modelos locales)](/es/providers/lmstudio)
- [MiniMax](/es/providers/minimax)
- [Mistral](/es/providers/mistral)
- [Moonshot AI (Kimi + Kimi Coding)](/es/providers/moonshot)
- [NVIDIA](/es/providers/nvidia)
- [Ollama (modelos en la nube + locales)](/es/providers/ollama)
- [OpenAI (API + Codex)](/es/providers/openai)
- [OpenCode](/es/providers/opencode)
- [OpenCode Go](/es/providers/opencode-go)
- [OpenRouter](/es/providers/openrouter)
- [Perplexity (búsqueda web)](/es/providers/perplexity-provider)
- [Qianfan](/es/providers/qianfan)
- [Qwen Cloud](/es/providers/qwen)
- [Runway](/es/providers/runway)
- [SGLang (modelos locales)](/es/providers/sglang)
- [StepFun](/es/providers/stepfun)
- [Synthetic](/es/providers/synthetic)
- [Together AI](/es/providers/together)
- [Venice (Venice AI, centrado en la privacidad)](/es/providers/venice)
- [Vercel AI Gateway](/es/providers/vercel-ai-gateway)
- [Vydra](/es/providers/vydra)
- [vLLM (modelos locales)](/es/providers/vllm)
- [Volcengine (Doubao)](/es/providers/volcengine)
- [xAI](/es/providers/xai)
- [Xiaomi](/es/providers/xiaomi)
- [Z.AI](/es/providers/zai)

## Páginas de descripción general compartidas

- [Variantes incluidas adicionales](/es/providers/models#additional-bundled-provider-variants) - Anthropic Vertex, Copilot Proxy y Gemini CLI OAuth
- [Generación de imágenes](/es/tools/image-generation) - Herramienta compartida `image_generate`, selección de proveedor y conmutación por error
- [Generación de música](/es/tools/music-generation) - Herramienta compartida `music_generate`, selección de proveedor y conmutación por error
- [Generación de video](/es/tools/video-generation) - Herramienta compartida `video_generate`, selección de proveedor y conmutación por error

## Proveedores de transcripción

- [Deepgram (transcripción de audio)](/es/providers/deepgram)

## Herramientas de la comunidad

- [Claude Max API Proxy](/es/providers/claude-max-api-proxy) - Proxy comunitario para credenciales de suscripción a Claude (verifique la política/términos de Anthropic antes de usar)

Para el catálogo completo de proveedores (xAI, Groq, Mistral, etc.) y la configuración avanzada,
consulte [Model providers](/es/concepts/model-providers).
