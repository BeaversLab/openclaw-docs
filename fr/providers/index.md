---
summary: "Fournisseurs de modèles (LLM) pris en charge par OpenClaw"
read_when:
  - You want to choose a model provider
  - You need a quick overview of supported LLM backends
title: "Annuaire des fournisseurs"
---

# Fournisseurs de modèles

OpenClaw peut utiliser de nombreux fournisseurs de LLM. Choisissez un fournisseur, authentifiez-vous, puis définissez le modèle par défaut comme `provider/model`.

Vous recherchez de la documentation sur les canaux de chat (WhatsApp/Telegram/Discord/Slack/Mattermost (plugin)/etc.) ? Voir [Canaux](/fr/channels).

## Démarrage rapide

1. Authentifiez-vous auprès du fournisseur (généralement via `openclaw onboard`).
2. Définir le modèle par défaut :

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## Documentation des fournisseurs

- [Amazon Bedrock](/fr/providers/bedrock)
- [Anthropic (API + Claude Code CLI)](/fr/providers/anthropic)
- [Cloudflare AI Gateway](/fr/providers/cloudflare-ai-gateway)
- [Modèles GLM](/fr/providers/glm)
- [Google (Gemini)](/fr/providers/google)
- [Groq (inférence LPU)](/fr/providers/groq)
- [Hugging Face (Inférence)](/fr/providers/huggingface)
- [Kilocode](/fr/providers/kilocode)
- [LiteLLM (passerelle unifiée)](/fr/providers/litellm)
- [MiniMax](/fr/providers/minimax)
- [Mistral](/fr/providers/mistral)
- [Model Studio (Alibaba Cloud)](/fr/providers/modelstudio)
- [Moonshot AI (Kimi + Kimi Coding)](/fr/providers/moonshot)
- [NVIDIA](/fr/providers/nvidia)
- [Ollama (modèles cloud + locaux)](/fr/providers/ollama)
- [OpenAI (API + Codex)](/fr/providers/openai)
- [OpenCode (Zen + Go)](/fr/providers/opencode)
- [OpenRouter](/fr/providers/openrouter)
- [Perplexity (recherche web)](/fr/providers/perplexity-provider)
- [Qianfan](/fr/providers/qianfan)
- [Qwen (OAuth)](/fr/providers/qwen)
- [SGLang (modèles locaux)](/fr/providers/sglang)
- [Together AI](/fr/providers/together)
- [Vercel AI Gateway](/fr/providers/vercel-ai-gateway)
- [Venice (Venice AI, axé sur la confidentialité)](/fr/providers/venice)
- [vLLM (modèles locaux)](/fr/providers/vllm)
- [Volcengine (Doubao)](/fr/providers/volcengine)
- [xAI](/fr/providers/xai)
- [Xiaomi](/fr/providers/xiaomi)
- [Z.AI](/fr/providers/zai)

## Fournisseurs de transcription

- [Deepgram (transcription audio)](/fr/providers/deepgram)

## Outils communautaires

- [Claude Max API Proxy](/fr/providers/claude-max-api-proxy) - Proxy communautaire pour les identifiants d'abonnement Claude (vérifiez la politique/les conditions d'utilisation d'Anthropic avant utilisation)

Pour le catalogue complet des fournisseurs (xAI, Groq, Mistral, etc.) et la configuration avancée,
voyez [Model providers](/fr/concepts/model-providers).

import fr from "/components/footer/fr.mdx";

<fr />
