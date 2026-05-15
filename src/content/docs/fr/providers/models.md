---
summary: "Fournisseurs de modèles (LLM) pris en charge par OpenClaw"
read_when:
  - You want to choose a model provider
  - You want quick setup examples for LLM auth + model selection
title: "Démarrage rapide du provider de modèles"
---

OpenClaw peut utiliser de nombreux providers LLM. Choisissez-en un, authentifiez-vous, puis définissez le modèle par défaut sur OpenClawLLM`provider/model`.

## Quick start (deux étapes)

1. Authentifiez-vous auprès du provider (généralement via `openclaw onboard`).
2. Définir le modèle par défaut :

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## Providers pris en charge (ensemble de démarrage)

- [Alibaba Model Studio](/fr/providers/alibaba)
- [Amazon Bedrock](Amazon Bedrock/en/providers/bedrock)
- [Anthropic (API + Claude CLI)](AnthropicAPICLI/en/providers/anthropic)
- [BytePlus (International)](/fr/concepts/model-providers#byteplus-international)
- [Chutes](/fr/providers/chutes)
- [ComfyUI](/fr/providers/comfy)
- [Cloudflare AI Gateway](Gateway/en/providers/cloudflare-ai-gateway)
- [DeepInfra](/fr/providers/deepinfra)
- [fal](/fr/providers/fal)
- [Fireworks](/fr/providers/fireworks)
- [GLM models](GLM/en/providers/glm)
- [MiniMax](MiniMax/en/providers/minimax)
- [Mistral](/fr/providers/mistral)
- [Moonshot AI (Kimi + Kimi Coding)](Moonshot/en/providers/moonshot)
- [OpenAI (API + Codex)](OpenAIAPI/en/providers/openai)
- [OpenCode (Zen + Go)](/fr/providers/opencode)
- [OpenRouter](OpenRouter/en/providers/openrouter)
- [Qianfan](/fr/providers/qianfan)
- [Qwen](Qwen/en/providers/qwen)
- [Runway](/fr/providers/runway)
- [StepFun](/fr/providers/stepfun)
- [Synthetic](/fr/providers/synthetic)
- [Vercel AI Gateway](VercelGateway/en/providers/vercel-ai-gateway)
- [Venice (Venice AI)](VeniceVenice/en/providers/venice)
- [xAI](/fr/providers/xai)
- [Z.AI](/fr/providers/zai)

## Variantes de provider groupées supplémentaires

- `anthropic-vertex` - prise en charge implicite de Anthropic sur Google Vertex lorsque les informations d'identification Vertex sont disponibles ; aucun choix d'authentification onboarding distinct
- `copilot-proxy` - pont de proxy VS Code Copilot local ; utilisez `openclaw onboard --auth-choice copilot-proxy`
- `google-gemini-cli` - flux CLI OAuth OAuth non officiel ; nécessite une installation locale de `gemini` (`brew install gemini-cli` ou `npm install -g @google/gemini-cli`) ; model `google-gemini-cli/gemini-3-flash-preview` par défaut ; utilisez `openclaw onboard --auth-choice google-gemini-cli` ou `openclaw models auth login --provider google-gemini-cli --set-default`

Pour le catalogue complet des providers (xAI, Groq, Mistral, etc.) et la configuration avancée, consultez [Model providers](/fr/concepts/model-providers).

## Connexes

- [Sélection de modèle](/fr/concepts/model-providers)
- [Basculement de modèle](/fr/concepts/model-failover)
- [CLI Modèles](CLI/en/cli/models)
