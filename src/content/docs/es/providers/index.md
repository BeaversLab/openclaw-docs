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
- [Amazon Bedrock Mantle](/es/providers/bedrock-mantle)
- [Anthropic (API + Claude CLI)](/es/providers/anthropic)
- [Arcee AI (modelos Trinity)](/es/providers/arcee)
- [BytePlus (Internacional)](/es/concepts/model-providers#byteplus-international)
- [Chutes](/es/providers/chutes)
- [Cloudflare AI Gateway](/es/providers/cloudflare-ai-gateway)
- [ComfyUI](/es/providers/comfy)
- [DeepSeek](/es/providers/deepseek)
- [ElevenLabs](/es/providers/elevenlabs)
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
- [Tencent Cloud (TokenHub)](/es/providers/tencent)
- [Together AI](/es/providers/together)
- [Venice (Venice AI, centrado en la privacidad)](/es/providers/venice)
- [Vercel AI Gateway](/es/providers/vercel-ai-gateway)
- [vLLM (modelos locales)](/es/providers/vllm)
- [Volcengine (Doubao)](/es/providers/volcengine)
- [Vydra](/es/providers/vydra)
- [xAI](/es/providers/xai)
- [Xiaomi](/es/providers/xiaomi)
- [Z.AI](/es/providers/zai)

## Páginas de descripción general compartidas

- [Variantes adicionales incluidas](/es/providers/models#additional-bundled-provider-variants) - Anthropic Vertex, Copilot Proxy y Gemini CLI OAuth
- [Generación de imágenes](/es/tools/image-generation) - Herramienta `image_generate` compartida, selección de proveedor y conmutación por error
- [Generación de música](/es/tools/music-generation) - Herramienta `music_generate` compartida, selección de proveedor y conmutación por error
- [Generación de video](/es/tools/video-generation) - Herramienta `video_generate` compartida, selección de proveedor y conmutación por error

## Proveedores de transcripción

- [Deepgram (transcripción de audio)](/es/providers/deepgram)
- [ElevenLabs](/es/providers/elevenlabs#speech-to-text)
- [Mistral](/es/providers/mistral#audio-transcription-voxtral)
- [OpenAI](/es/providers/openai#speech-to-text)
- [xAI](/es/providers/xai#speech-to-text)

## Herramientas comunitarias

- [Claude Max API Proxy](/es/providers/claude-max-api-proxy) - Proxy comunitario para credenciales de suscripción de Claude (verifique la política/términos de Anthropic antes de usarlo)

Para el catálogo completo de proveedores (xAI, Groq, Mistral, etc.) y la configuración avanzada,
consulte [Proveedores de modelos](/es/concepts/model-providers).
