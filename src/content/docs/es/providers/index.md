---
summary: "Proveedores de modelos (LLM) compatibles con OpenClaw"
read_when:
  - You want to choose a model provider
  - You need a quick overview of supported LLM backends
title: "Directorio de proveedores"
---

OpenClaw puede usar muchos proveedores de LLM. Elija un proveedor, autentíquese y luego establezca el modelo predeterminado como `provider/model`.

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

- [Alibaba Model Studio](/es/providers/alibaba)
- [Amazon Bedrock](/es/providers/bedrock)
- [Amazon Bedrock Mantle](/es/providers/bedrock-mantle)
- [Anthropic (API + Claude CLI)](/es/providers/anthropic)
- [Arcee AI (Trinity models)](/es/providers/arcee)
- [Azure Speech](/es/providers/azure-speech)
- [BytePlus (International)](/es/concepts/model-providers#byteplus-international)
- [Cerebras](/es/providers/cerebras)
- [Chutes](/es/providers/chutes)
- [Cloudflare AI Gateway](/es/providers/cloudflare-ai-gateway)
- [ComfyUI](/es/providers/comfy)
- [DeepSeek](/es/providers/deepseek)
- [ds4 (DeepSeek V4 local)](/es/providers/ds4)
- [ElevenLabs](/es/providers/elevenlabs)
- [fal](/es/providers/fal)
- [Fireworks](/es/providers/fireworks)
- [GitHub Copilot](/es/providers/github-copilot)
- [Modelos GLM](/es/providers/glm)
- [Google (Gemini)](/es/providers/google)
- [Gradium](/es/providers/gradium)
- [Groq (inferencia LPU)](/es/providers/groq)
- [Hugging Face (Inferencia)](/es/providers/huggingface)
- [inferrs (modelos locales)](/es/providers/inferrs)
- [Kilocode](/es/providers/kilocode)
- [LiteLLM (pasarela unificada)](/es/providers/litellm)
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
- [SenseAudio](/es/providers/senseaudio)
- [SGLang (modelos locales)](/es/providers/sglang)
- [StepFun](/es/providers/stepfun)
- [Synthetic](/es/providers/synthetic)
- [Tencent Cloud (TokenHub)](/es/providers/tencent)
- [Together AI](/es/providers/together)
- [Venice (Venice AI, privacy-focused)](/es/providers/venice)
- [Vercel AI Gateway](/es/providers/vercel-ai-gateway)
- [vLLM (local models)](/es/providers/vllm)
- [Volcengine (Doubao)](/es/providers/volcengine)
- [Vydra](/es/providers/vydra)
- [xAI](/es/providers/xai)
- [Xiaomi](/es/providers/xiaomi)
- [Z.AI](/es/providers/zai)

## Páginas de descripción general compartidas

- [Variantes adicionales incluidas](/es/providers/models#additional-bundled-provider-variants) - Anthropic Vertex, Copilot Proxy y Gemini CLI OAuth
- [Generación de imágenes](/es/tools/image-generation) - Herramienta compartida `image_generate`, selección de proveedor y conmutación por error
- [Generación de música](/es/tools/music-generation) - Herramienta compartida `music_generate`, selección de proveedor y conmutación por error
- [Generación de video](/es/tools/video-generation) - Herramienta `video_generate` compartida, selección de proveedor y conmutación por error

## Proveedores de transcripción

- [Deepgram (transcripción de audio)](/es/providers/deepgram)
- [ElevenLabs](/es/providers/elevenlabs#speech-to-text)
- [Mistral](/es/providers/mistral#audio-transcription-voxtral)
- [OpenAI](/es/providers/openai#speech-to-text)
- [SenseAudio](/es/providers/senseaudio)
- [xAI](/es/providers/xai#speech-to-text)

## Herramientas comunitarias

- [Claude Max API Proxy](/es/providers/claude-max-api-proxy) - Proxy comunitario para las credenciales de suscripción de Claude (verifique la política/términos de Anthropic antes de usar)

Para el catálogo completo de proveedores (xAI, Groq, Mistral, etc.) y la configuración avanzada,
consulte [Proveedores de modelos](/es/concepts/model-providers).
