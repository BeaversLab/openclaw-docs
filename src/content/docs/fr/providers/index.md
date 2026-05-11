---
summary: "Fournisseurs de modèles (LLM) pris en charge par OpenClaw"
read_when:
  - You want to choose a model provider
  - You need a quick overview of supported LLM backends
title: "Annuaire des fournisseurs"
---

# Fournisseurs de modèles

OpenClaw peut utiliser de nombreux fournisseurs de LLM. Choisissez un fournisseur, authentifiez-vous, puis définissez le modèle par défaut comme `provider/model`.

Vous cherchez de la documentation sur les canaux de discussion (WhatsApp/Telegram/Discord/Slack/Mattermost (plugin)/etc.) ? Voir [Canaux](/fr/channels).

## Démarrage rapide

1. Authentifiez-vous auprès du fournisseur (généralement via `openclaw onboard`).
2. Définir le modèle par défaut :

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## Documentation des fournisseurs

- [Alibaba Model Studio](/fr/providers/alibaba)
- [Amazon Bedrock](/fr/providers/bedrock)
- [Manteau Amazon Bedrock](/fr/providers/bedrock-mantle)
- [Anthropic (API + Claude CLI)](/fr/providers/anthropic)
- [Arcee AI (modèles Trinity)](/fr/providers/arcee)
- [Azure Speech](/fr/providers/azure-speech)
- [BytePlus (International)](/fr/concepts/model-providers#byteplus-international)
- [Cerebras](/fr/providers/cerebras)
- [Chutes](/fr/providers/chutes)
- [Cloudflare AI Gateway](/fr/providers/cloudflare-ai-gateway)
- [ComfyUI](/fr/providers/comfy)
- [DeepSeek](/fr/providers/deepseek)
- [ElevenLabs](/fr/providers/elevenlabs)
- [fal](/fr/providers/fal)
- [Fireworks](/fr/providers/fireworks)
- [GitHub Copilot](/fr/providers/github-copilot)
- [Gradium](/fr/providers/gradium)
- [GLM models](/fr/providers/glm)
- [Google (Gemini)](/fr/providers/google)
- [Groq (inférence LPU)](/fr/providers/groq)
- [Hugging Face (Inférence)](/fr/providers/huggingface)
- [inferrs (modèles locaux)](/fr/providers/inferrs)
- [Kilocode](/fr/providers/kilocode)
- [LiteLLM (passerelle unifiée)](/fr/providers/litellm)
- [LM Studio (modèles locaux)](/fr/providers/lmstudio)
- [MiniMax](/fr/providers/minimax)
- [Mistral](/fr/providers/mistral)
- [Moonshot AI (Kimi + Kimi Coding)](/fr/providers/moonshot)
- [NVIDIA](/fr/providers/nvidia)
- [Ollama (modèles cloud + locaux)](/fr/providers/ollama)
- [OpenAI (API + Codex)](/fr/providers/openai)
- [OpenCode](/fr/providers/opencode)
- [OpenCode Go](/fr/providers/opencode-go)
- [OpenRouter](/fr/providers/openrouter)
- [Perplexity (recherche web)](/fr/providers/perplexity-provider)
- [Qianfan](/fr/providers/qianfan)
- [Qwen Cloud](/fr/providers/qwen)
- [Runway](/fr/providers/runway)
- [SenseAudio](/fr/providers/senseaudio)
- [SGLang (modèles locaux)](/fr/providers/sglang)
- [StepFun](/fr/providers/stepfun)
- [Synthetic](/fr/providers/synthetic)
- [Tencent Cloud (TokenHub)](/fr/providers/tencent)
- [Together AI](/fr/providers/together)
- [Venice (Venice AI, axé sur la confidentialité)](/fr/providers/venice)
- [Vercel AI Gateway](/fr/providers/vercel-ai-gateway)
- [vLLM (modèles locaux)](/fr/providers/vllm)
- [Volcengine (Doubao)](/fr/providers/volcengine)
- [Vydra](/fr/providers/vydra)
- [xAI](/fr/providers/xai)
- [Xiaomi](/fr/providers/xiaomi)
- [Z.AI](/fr/providers/zai)

## Pages d'aperçu partagées

- [Variant groupées supplémentaires](/fr/providers/models#additional-bundled-provider-variants) - Anthropic Vertex, Copilot Proxy et Gemini CLI OAuth
- [Génération d'images](/fr/tools/image-generation) - outil `image_generate` partagé, sélection de provider et basculement
- [Génération de musique](/fr/tools/music-generation) - outil `music_generate` partagé, sélection de provider et basculement
- [Génération de vidéo](/fr/tools/video-generation) - outil `video_generate` partagé, sélection de provider et basculement

## Providers de transcription

- [Deepgram (transcription audio)](/fr/providers/deepgram)
- [ElevenLabs](/fr/providers/elevenlabs#speech-to-text)
- [Mistral](/fr/providers/mistral#audio-transcription-voxtral)
- [OpenAI](/fr/providers/openai#speech-to-text)
- [SenseAudio](/fr/providers/senseaudio)
- [xAI](/fr/providers/xai#speech-to-text)

## Outils communautaires

- [Claude Max API Proxy](/fr/providers/claude-max-api-proxy) - Proxy communautaire pour les identifiants d'abonnement Claude (vérifiez la politique/conditions d'Anthropic avant utilisation)

Pour le catalogue complet des providers (xAI, Groq, Mistral, etc.) et la configuration avancée,
voir [Model providers](/fr/concepts/model-providers).
