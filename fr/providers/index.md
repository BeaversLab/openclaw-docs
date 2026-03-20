---
summary: "Model providers (LLMs) supported by OpenClaw"
read_when:
  - Vous souhaitez choisir un provider de model
  - Vous avez besoin d'une vue d'ensemble rapide des backends LLM
title: "Provider Directory"
---

# Model Providers

OpenClaw peut utiliser de nombreux providers LLM. Choisissez un provider, authentifiez-vous, puis définissez le
model par défaut sur `provider/model`.

Vous cherchez de la documentation sur les channel de chat (WhatsApp/Telegram/Discord/Slack/Mattermost (plugin)/etc.) ? Voir [Channels](/fr/channels).

## Quick start

1. Authentifiez-vous auprès du provider (généralement via `openclaw onboard`).
2. Définir le model par défaut :

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## Provider docs

- [Amazon Bedrock](/fr/providers/bedrock)
- [Anthropic (API + Claude Code CLI)](/fr/providers/anthropic)
- [Cloudflare AI Gateway](/fr/providers/cloudflare-ai-gateway)
- [modèles GLM](/fr/providers/glm)
- [Hugging Face (Inference)](/fr/providers/huggingface)
- [Kilocode](/fr/providers/kilocode)
- [LiteLLM (unified gateway)](/fr/providers/litellm)
- [MiniMax](/fr/providers/minimax)
- [Mistral](/fr/providers/mistral)
- [Moonshot AI (Kimi + Kimi Coding)](/fr/providers/moonshot)
- [NVIDIA](/fr/providers/nvidia)
- [Ollama (cloud + modèles locaux)](/fr/providers/ollama)
- [OpenAI (API + Codex)](/fr/providers/openai)
- [OpenCode (Zen + Go)](/fr/providers/opencode)
- [OpenRouter](/fr/providers/openrouter)
- [Qianfan](/fr/providers/qianfan)
- [Qwen (OAuth)](/fr/providers/qwen)
- [Together AI](/fr/providers/together)
- [Vercel AI Gateway](/fr/providers/vercel-ai-gateway)
- [Venice (Venice AI, respectueux de la vie privée)](/fr/providers/venice)
- [vLLM (modèles locaux)](/fr/providers/vllm)
- [xAI](/fr/providers/xai)
- [Xiaomi](/fr/providers/xiaomi)
- [Z.AI](/fr/providers/zai)

## Providers de transcription

- [Deepgram (transcription audio)](/fr/providers/deepgram)

## Outils communautaires

- [Claude Max API Proxy](/fr/providers/claude-max-api-proxy) - Proxy communautaire pour les identifiants d'abonnement Claude (vérifiez la politique/les conditions de Anthropic avant utilisation)

Pour le catalogue complet de providers (xAI, Groq, Mistral, etc.) et la configuration avancée,
voir [Model providers](/fr/concepts/model-providers).

import en from "/components/footer/en.mdx";

<en />
