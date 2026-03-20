---
title: "Cloudflare AI Gateway"
summary: "Cloudflare AI Gateway configuration (auth + sélection de modèle)"
read_when:
  - Vous souhaitez utiliser Cloudflare AI Gateway avec OpenClaw
  - Vous avez besoin de l'ID du compte, de l'ID de la passerelle ou de la variable d'environnement de la clé API
---

# Cloudflare AI Gateway

Cloudflare AI Gateway se place devant les API des fournisseurs et vous permet d'ajouter des analytiques, du cache et des contrôles. Pour Anthropic, OpenClaw utilise l'API de messages Anthropic via le point de terminaison de votre API.

- Provider : `cloudflare-ai-gateway`
- URL de base : `https://gateway.ai.cloudflare.com/v1/<account_id>/<gateway_id>/anthropic`
- Modèle par défaut : `cloudflare-ai-gateway/claude-sonnet-4-5`
- Clé API : `CLOUDFLARE_AI_GATEWAY_API_KEY` (votre clé API de fournisseur pour les requêtes via le Gateway)

Pour les modèles Anthropic, utilisez votre clé Anthropic API.

## Quick start

1. Définissez la clé API du fournisseur et les détails du Gateway :

```bash
openclaw onboard --auth-choice cloudflare-ai-gateway-api-key
```

2. Définir un modèle par défaut :

```json5
{
  agents: {
    defaults: {
      model: { primary: "cloudflare-ai-gateway/claude-sonnet-4-5" },
    },
  },
}
```

## Exemple non interactif

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice cloudflare-ai-gateway-api-key \
  --cloudflare-ai-gateway-account-id "your-account-id" \
  --cloudflare-ai-gateway-gateway-id "your-gateway-id" \
  --cloudflare-ai-gateway-api-key "$CLOUDFLARE_AI_GATEWAY_API_KEY"
```

## Passerelles authentifiées

Si vous avez activé l'authentification Gateway dans Cloudflare, ajoutez l'en-tête `cf-aig-authorization` (cela s'ajoute à votre clé API de fournisseur).

```json5
{
  models: {
    providers: {
      "cloudflare-ai-gateway": {
        headers: {
          "cf-aig-authorization": "Bearer <cloudflare-ai-gateway-token>",
        },
      },
    },
  },
}
```

## Note sur l'environnement

Si le Gateway s'exécute en tant que démon (launchd/systemd), assurez-vous que `CLOUDFLARE_AI_GATEWAY_API_KEY` est disponible pour ce processus (par exemple, dans `~/.openclaw/.env` ou via `env.shellEnv`).

import fr from "/components/footer/fr.mdx";

<fr />
