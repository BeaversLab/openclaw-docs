---
title: "Cloudflare AI Gateway"
summary: "Configuration de Cloudflare AI Gateway (auth + sélection du modèle)"
read_when:
  - You want to use Cloudflare AI Gateway with OpenClaw
  - You need the account ID, gateway ID, or API key env var
---

# Cloudflare AI Gateway

Cloudflare AI Gateway se place devant les API des fournisseurs et vous permet d'ajouter des analyses, de la mise en cache et des contrôles. Pour Anthropic, OpenClaw utilise l'API Anthropic Messages via le point de terminaison de votre Gateway.

- Fournisseur : `cloudflare-ai-gateway`
- URL de base : `https://gateway.ai.cloudflare.com/v1/<account_id>/<gateway_id>/anthropic`
- Modèle par défaut : `cloudflare-ai-gateway/claude-sonnet-4-5`
- Clé API : `CLOUDFLARE_AI_GATEWAY_API_KEY` (votre clé API de fournisseur pour les requêtes via la Gateway)

Pour les modèles Anthropic, utilisez votre clé API Anthropic.

## Quick start

1. Définissez la clé API du fournisseur et les détails de la Gateway :

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

## Non-interactive example

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice cloudflare-ai-gateway-api-key \
  --cloudflare-ai-gateway-account-id "your-account-id" \
  --cloudflare-ai-gateway-gateway-id "your-gateway-id" \
  --cloudflare-ai-gateway-api-key "$CLOUDFLARE_AI_GATEWAY_API_KEY"
```

## Authenticated gateways

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

## Environment note

Si la Gateway s'exécute en tant que démon (launchd/systemd), assurez-vous que `CLOUDFLARE_AI_GATEWAY_API_KEY` est disponible pour ce processus (par exemple, dans `~/.openclaw/.env` ou via `env.shellEnv`).

import fr from "/components/footer/fr.mdx";

<fr />
