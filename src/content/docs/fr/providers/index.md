---
summary: "Fournisseurs de modèles (LLM) pris en charge par OpenClaw"
read_when:
  - You want to choose a model provider
  - You need a quick overview of supported LLM backends
title: "Annuaire des fournisseurs"
---

OpenClaw peut utiliser de nombreux providers de LLM. Choisissez un provider, authentifiez-vous, puis définissez le model par défaut comme `provider/model`.

Vous cherchez de la documentation sur les canaux de chat (WhatsApp/Telegram/Discord/Slack/Mattermost (plugin)/etc.) ? Voir [Canaux](/fr/channels).

## Quick start

1. Authentifiez-vous auprès du provider (généralement via `openclaw onboard`).
2. Définissez le model par défaut :

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## Provider docs

- [Alibaba Model Studio](/fr/providers/alibaba)
- [Amazon Bedrock](/fr/providers/bedrock)
- [Amazon Bedrock Mantle](/fr/providers/bedrock-mantle)
- [Anthropic (API + Claude CLI)](/fr/providers/anthropic)
- [Arcee AI (Trinity models)](/fr/providers/arcee)
- [Azure Speech](/fr/providers/azure-speech)
- [BytePlus (International)](/fr/concepts/model-providers#byteplus-international)
- [Cerebras](/fr/providers/cerebras)
- [Chutes](/fr/providers/chutes)
- [Cloudflare AI Gateway](/fr/providers/cloudflare-ai-gateway)
- [ComfyUI](/fr/providers/comfy)
- [DeepSeek](/fr/providers/deepseek)
- [ds4 (local DeepSeek V4)](/fr/providers/ds4)
- [ElevenLabs](/fr/providers/elevenlabs)
- [fal](/fr/providers/fal)
- [Fireworks](/fr/providers/fireworks)
- [GitHub Copilot](/fr/providers/github-copilot)
- [GLM models](/fr/providers/glm)
- [Google (Gemini)](/fr/providers/google)
- [Gradium](/fr/providers/gradium)
- [Groq (LPU inference)](/fr/providers/groq)
- [Hugging Face (Inference)](/fr/providers/huggingface)
- [inferrs (local models)](/fr/providers/inferrs)
- [Kilocode](/fr/providers/kilocode)
- [LiteLLM (unified gateway)](/fr/providers/litellm)
- [LM Studio (local models)](/fr/providers/lmstudio)
- [MiniMax](/fr/providers/minimax)
- [Mistral](/fr/providers/mistral)
- [Moonshot AI (Kimi + Kimi Coding)](/fr/providers/moonshot)
- [NVIDIA](/fr/providers/nvidia)
- [Ollama (cloud + local models)](/fr/providers/ollama)
- [OpenAI (API + Codex)](/fr/providers/openai)
- [OpenCode](/fr/providers/opencode)
- [OpenCode Go](/fr/providers/opencode-go)
- [OpenRouter](/fr/providers/openrouter)
- [Perplexity (web search)](/fr/providers/perplexity-provider)
- [Qianfan](/fr/providers/qianfan)
- [Qwen Cloud](/fr/providers/qwen)
- [Runway](/fr/providers/runway)
- [SenseAudio](/fr/providers/senseaudio)
- [SGLang (local models)](/fr/providers/sglang)
- [StepFun](/fr/providers/stepfun)
- [Synthetic](/fr/providers/synthetic)
- [Tencent Cloud (TokenHub)](/fr/providers/tencent)
- [Together AI](/fr/providers/together)
- [Venice (Venice AI, privacy-focused)](/fr/providers/venice)
- [Vercel AI VercelGateway](/fr/providers/vercel-ai-gateway)
- [vLLM (modèles locaux)](/fr/providers/vllm)
- [Volcengine (Doubao)](/fr/providers/volcengine)
- [Vydra](/fr/providers/vydra)
- [xAI](/fr/providers/xai)
- [Xiaomi](/fr/providers/xiaomi)
- [Z.AI](/fr/providers/zai)

## Pages d'aperçu partagées

- [Variantes groupées supplémentaires](/fr/providers/models#additional-bundled-provider-variants) - Anthropic Vertex, Copilot Proxy et Gemini CLI OAuth
- [Génération d'images](/fr/tools/image-generation) - Tool partagé `image_generate`, sélection du provider et basculement
- [Génération de musique](/fr/tools/music-generation) - Tool partagé `music_generate`, sélection du provider et basculement
- [Génération de vidéo](/fr/tools/video-generation) - Tool partagé `video_generate`, sélection du provider et basculement

## Providers de transcription

- [Deepgram (transcription audio)](/fr/providers/deepgram)
- [ElevenLabs](/fr/providers/elevenlabs#speech-to-text)
- [Mistral](/fr/providers/mistral#audio-transcription-voxtral)
- [OpenAI](/fr/providers/openai#speech-to-text)
- [SenseAudio](/fr/providers/senseaudio)
- [xAI](/fr/providers/xai#speech-to-text)

## Outils communautaires

- [Claude Max API Proxy](/fr/providers/claude-max-api-proxy) - Proxy communautaire pour les identifiants d'abonnement Claude (vérifiez la politique/conditions d'utilisation d'Anthropic avant utilisation)

Pour le catalogue complet des providers (xAI, Groq, Mistral, etc.) et la configuration avancée,
voir [Model providers](/fr/concepts/model-providers).
