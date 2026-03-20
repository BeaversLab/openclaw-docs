---
title: "Vercel AI Gateway"
summary: "Vercel AI Gateway configuration (auth + sélection du modèle)"
read_when:
  - Vous souhaitez utiliser Vercel AI Gateway avec OpenClaw
  - Vous avez besoin de la variable d'environnement de la clé API ou du choix d'authentification CLI
---

# Vercel AI Gateway

Le [Vercel AI Gateway](https://vercel.com/ai-gateway) fournit une API unifiée pour accéder à des centaines de modèles via un point de terminaison unique.

- Fournisseur : `vercel-ai-gateway`
- Auth : `AI_GATEWAY_API_KEY`
- API : compatible avec les messages Anthropic
- OpenClaw détecte automatiquement le catalogue du Gateway `/v1/models`, donc `/models vercel-ai-gateway`
  inclut les références de modèles actuelles telles que `vercel-ai-gateway/openai/gpt-5.4`.

## Quick start

1. Définissez la clé API (recommandé : stockez-la pour le Gateway) :

```bash
openclaw onboard --auth-choice ai-gateway-api-key
```

2. Définir un modèle par défaut :

```json5
{
  agents: {
    defaults: {
      model: { primary: "vercel-ai-gateway/anthropic/claude-opus-4.6" },
    },
  },
}
```

## Exemple non interactif

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice ai-gateway-api-key \
  --ai-gateway-api-key "$AI_GATEWAY_API_KEY"
```

## Note sur l'environnement

Si le Gateway s'exécute en tant que démon (launchd/systemd), assurez-vous que `AI_GATEWAY_API_KEY`
est disponible pour ce processus (par exemple, dans `~/.openclaw/.env` ou via
`env.shellEnv`).

## Raccourci de l'ID de modèle

OpenClaw accepte les références de modèles abrégées Vercel Claude et les normalise à
l'exécution :

- `vercel-ai-gateway/claude-opus-4.6` -> `vercel-ai-gateway/anthropic/claude-opus-4.6`
- `vercel-ai-gateway/opus-4.6` -> `vercel-ai-gateway/anthropic/claude-opus-4-6`

import fr from "/components/footer/fr.mdx";

<fr />
