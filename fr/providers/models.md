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

- [OpenAI (API + Codex)](/fr/providers/openai)
- [Anthropic (API + Claude Code CLI)](/fr/providers/anthropic)
- [OpenRouter](/fr/providers/openrouter)
- [Vercel AI Gateway](/fr/providers/vercel-ai-gateway)
- [Cloudflare AI Gateway](/fr/providers/cloudflare-ai-gateway)
- [Moonshot AI (Kimi + Kimi Coding)](/fr/providers/moonshot)
- [Mistral](/fr/providers/mistral)
- [Synthetic](/fr/providers/synthetic)
- [OpenCode (Zen + Go)](/fr/providers/opencode)
- [Z.AI](/fr/providers/zai)
- [Modèles GLM](/fr/providers/glm)
- [MiniMax](/fr/providers/minimax)
- [Venice (Venice AI)](/fr/providers/venice)
- [Amazon Bedrock](/fr/providers/bedrock)
- [Qianfan](/fr/providers/qianfan)

Pour le catalogue complet des fournisseurs (xAI, Groq, Mistral, etc.) et la configuration avancée, consultez [Fournisseurs de modèles](/fr/concepts/model-providers).

import fr from "/components/footer/fr.mdx";

<fr />
