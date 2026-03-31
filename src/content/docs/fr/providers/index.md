---
summary: "Fournisseurs de modèles (LLM) pris en charge par OpenClaw"
read_when:
  - You want to choose a model provider
  - You need a quick overview of supported LLM backends
title: "Annuaire des fournisseurs"
---

# Fournisseurs de modèles

OpenClaw peut utiliser de nombreux fournisseurs de LLM. Choisissez un fournisseur, authentifiez-vous, puis définissez le modèle par défaut comme `provider/model`.

Vous recherchez de la documentation sur les canaux de chat (WhatsApp/Telegram/Discord/Slack/Mattermost (plugin)/etc.) ? Voir [Canaux](/en/channels).

## Démarrage rapide

1. Authentifiez-vous auprès du fournisseur (généralement via `openclaw onboard`).
2. Définir le modèle par défaut :

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## Documentation des fournisseurs

- [Amazon Bedrock](/en/providers/bedrock)
- [Anthropic (API + Claude Code CLI)](/en/providers/anthropic)
- [Cloudflare AI Gateway](/en/providers/cloudflare-ai-gateway)
- [DeepSeek](/en/providers/deepseek)
- [GitHub Copilot](/en/providers/github-copilot)
- [modèles GLM](/en/providers/glm)
- [Google (Gemini)](/en/providers/google)
- [Groq (inférence LPU)](/en/providers/groq)
- [Hugging Face (Inférence)](/en/providers/huggingface)
- [Kilocode](/en/providers/kilocode)
- [LiteLLM (passelle unifiée)](/en/providers/litellm)
- [MiniMax](/en/providers/minimax)
- [Mistral](/en/providers/mistral)
- [Moonshot AI (Kimi + Kimi Coding)](/en/providers/moonshot)
- [NVIDIA](/en/providers/nvidia)
- [Ollama (cloud + modèles locaux)](/en/providers/ollama)
- [OpenAI (API + Codex)](/en/providers/openai)
- [OpenCode](/en/providers/opencode)
- [OpenCode Go](/en/providers/opencode-go)
- [OpenRouter](/en/providers/openrouter)
- [Perplexity (recherche web)](/en/providers/perplexity-provider)
- [Qianfan](/en/providers/qianfan)
- [Qwen / Model Studio (Alibaba Cloud)](/en/providers/qwen_modelstudio)
- [SGLang (modèles locaux)](/en/providers/sglang)
- [Synthétique](/en/providers/synthetic)
- [Together AI](/en/providers/together)
- [Venice (Venice IA, axé sur la confidentialité)](/en/providers/venice)
- [Vercel AI Gateway](/en/providers/vercel-ai-gateway)
- [vLLM (modèles locaux)](/en/providers/vllm)
- [Volcengine (Doubao)](/en/providers/volcengine)
- [xAI](/en/providers/xai)
- [Xiaomi](/en/providers/xiaomi)
- [Z.AI](/en/providers/zai)

## Fournisseurs de transcription

- [Deepgram (transcription audio)](/en/providers/deepgram)

## Outils communautaires

- [Claude Max API Proxy](/en/providers/claude-max-api-proxy) - Proxy communautaire pour les identifiants d'abonnement Claude (vérifiez la politique/les conditions d'utilisation d'Anthropic avant utilisation)

Pour le catalogue complet de providers (xAI, Groq, Mistral, etc.) et la configuration avancée,
voyez [Model providers](/en/concepts/model-providers).
