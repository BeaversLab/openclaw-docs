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

- [Alibaba Model Studio](/fr/providers/alibaba)
- [Anthropic (API + Claude CLI)](/fr/providers/anthropic)
- [Amazon Bedrock](/fr/providers/bedrock)
- [BytePlus (International)](/fr/concepts/model-providers#byteplus-international)
- [Chutes](/fr/providers/chutes)
- [ComfyUI](/fr/providers/comfy)
- [Cloudflare AI Gateway](/fr/providers/cloudflare-ai-gateway)
- [fal](/fr/providers/fal)
- [Fireworks](/fr/providers/fireworks)
- [GLM models](/fr/providers/glm)
- [MiniMax](/fr/providers/minimax)
- [Mistral](/fr/providers/mistral)
- [Moonshot AI (Kimi + Kimi Coding)](/fr/providers/moonshot)
- [OpenAI (API + Codex)](/fr/providers/openai)
- [OpenCode (Zen + Go)](/fr/providers/opencode)
- [OpenRouter](/fr/providers/openrouter)
- [Qianfan](/fr/providers/qianfan)
- [Qwen](/fr/providers/qwen)
- [Runway](/fr/providers/runway)
- [StepFun](/fr/providers/stepfun)
- [Synthetic](/fr/providers/synthetic)
- [Vercel AI Gateway](/fr/providers/vercel-ai-gateway)
- [Venice (Venice AI)](/fr/providers/venice)
- [xAI](/fr/providers/xai)
- [Z.AI](/fr/providers/zai)

## Variantes de provider groupées supplémentaires

- `anthropic-vertex` - prise en charge implicite de Anthropic sur Google Vertex lorsque les informations d'identification Vertex sont disponibles ; aucun choix d'authentification onboarding distinct
- `copilot-proxy` - pont de proxy VS Code Copilot local ; utilisez `openclaw onboard --auth-choice copilot-proxy`
- `google-gemini-cli` - flux CLI OAuth OAuth non officiel ; nécessite une installation locale de `gemini` (`brew install gemini-cli` ou `npm install -g @google/gemini-cli`) ; model `google-gemini-cli/gemini-3-flash-preview` par défaut ; utilisez `openclaw onboard --auth-choice google-gemini-cli` ou `openclaw models auth login --provider google-gemini-cli --set-default`

Pour le catalogue complet des fournisseurs (xAI, Groq, Mistral, etc.) et la configuration avancée,
voyez [Model providers](/fr/concepts/model-providers).
