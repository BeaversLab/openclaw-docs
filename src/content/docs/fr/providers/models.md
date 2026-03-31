---
summary: "Fournisseurs de modèles (LLM) pris en charge par OpenClaw"
read_when:
  - You want to choose a model provider
  - You want quick setup examples for LLM auth + model selection
title: "Démarrage rapide du fournisseur de modèles"
---

# Fournisseurs de modèles

OpenClaw peut utiliser de nombreux fournisseurs LLM. Choisissez-en un, authentifiez-vous, puis définissez le modèle par défaut sur `provider/model`.

## Démarrage rapide (deux étapes)

1. Authentifiez-vous auprès du fournisseur (généralement via `openclaw onboard`).
2. Définir le modèle par défaut :

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## Fournisseurs pris en charge (ensemble de démarrage)

- [OpenAI (API + Codex)](/en/providers/openai)
- [Anthropic (API + Claude Code CLI)](/en/providers/anthropic)
- [OpenRouter](/en/providers/openrouter)
- [Vercel AI Gateway](/en/providers/vercel-ai-gateway)
- [Cloudflare AI Gateway](/en/providers/cloudflare-ai-gateway)
- [Moonshot AI (Kimi + Kimi Coding)](/en/providers/moonshot)
- [Mistral](/en/providers/mistral)
- [Synthetic](/en/providers/synthetic)
- [OpenCode (Zen + Go)](/en/providers/opencode)
- [Z.AI](/en/providers/zai)
- [Modèles GLM](/en/providers/glm)
- [MiniMax](/en/providers/minimax)
- [Venice (Venice AI)](/en/providers/venice)
- [Amazon Bedrock](/en/providers/bedrock)
- [Qianfan](/en/providers/qianfan)
- [xAI](/en/providers/xai)

Pour le catalogue complet des providers (xAI, Groq, Mistral, etc.) et la configuration avancée,
voir [Model providers](/en/concepts/model-providers).
