---
title: "Cloudflare AI Gateway"
summary: "Configuration du Cloudflare AI Gateway (auth + sélection du modèle)"
read_when:
  - You want to use Cloudflare AI Gateway with OpenClaw
  - You need the account ID, gateway ID, or API key env var
---

# Cloudflare AI Gateway

Cloudflare AI Gateway se place devant les API des fournisseurs et vous permet d'ajouter des analyses, de la mise en cache et des contrôles. Pour Anthropic, OpenClaw utilise l'API Anthropic Messages via le point de terminaison de votre Gateway.

| Propriété         | Valeur                                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| Fournisseur       | `cloudflare-ai-gateway`                                                                         |
| URL de base       | `https://gateway.ai.cloudflare.com/v1/<account_id>/<gateway_id>/anthropic`                      |
| Modèle par défaut | `cloudflare-ai-gateway/claude-sonnet-4-5`                                                       |
| Clé API           | `CLOUDFLARE_AI_GATEWAY_API_KEY` (votre clé de fournisseur API pour les requêtes via le Gateway) |

<Note>Pour les modèles Anthropic routés via le Cloudflare AI Gateway, utilisez votre **clé API Anthropic** comme clé de fournisseur.</Note>

## Getting started

<Steps>
  <Step title="Définir la clé API du fournisseur et les détails du Gateway">
    Exécutez le onboarding et choisissez l'option d'authentification Cloudflare AI Gateway :

    ```bash
    openclaw onboard --auth-choice cloudflare-ai-gateway-api-key
    ```

    Cela vous demande votre identifiant de compte, votre identifiant de passerelle (gateway ID) et votre clé API.

  </Step>
  <Step title="Définir un modèle par défaut">
    Ajoutez le modèle à votre configuration OpenClaw :

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "cloudflare-ai-gateway/claude-sonnet-4-5" },
        },
      },
    }
    ```

  </Step>
  <Step title="Vérifier que le modèle est disponible">
    ```bash
    openclaw models list --provider cloudflare-ai-gateway
    ```
  </Step>
</Steps>

## Exemple non interactif

Pour les configurations scriptées ou CI, passez toutes les valeurs sur la ligne de commande :

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice cloudflare-ai-gateway-api-key \
  --cloudflare-ai-gateway-account-id "your-account-id" \
  --cloudflare-ai-gateway-gateway-id "your-gateway-id" \
  --cloudflare-ai-gateway-api-key "$CLOUDFLARE_AI_GATEWAY_API_KEY"
```

## Configuration avancée

<AccordionGroup>
  <Accordion title="Passerelles authentifiées">
    Si vous avez activé l'authentification Gateway dans Cloudflare, ajoutez l'en-tête `cf-aig-authorization`. Cela s'ajoute **en plus de** votre clé API de fournisseur.

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

    <Tip>
    L'en-tête `cf-aig-authorization` authentifie auprès du Cloudflare Gateway lui-même, tandis que la clé API du fournisseur (par exemple, votre clé Anthropic) authentifie auprès du fournisseur en amont.
    </Tip>

  </Accordion>

  <Accordion title="Note sur l'environnement">
    Si le Gateway s'exécute en tant que démon (launchd/systemd), assurez-vous que `CLOUDFLARE_AI_GATEWAY_API_KEY` est disponible pour ce processus.

    <Warning>
    Une clé présente uniquement dans `~/.profile` ne sera pas utile à un démon launchd/systemd, sauf si cet environnement est également importé. Définissez la clé dans `~/.openclaw/.env` ou via `env.shellEnv` pour vous assurer que le processus de passerelle peut la lire.
    </Warning>

  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection du modèle" href="/fr/concepts/model-providers" icon="layers">
    Choisir les fournisseurs, les références de modèle et le comportement de basculement.
  </Card>
  <Card title="Résolution de problèmes" href="/fr/help/troubleshooting" icon="wrench">
    Résolution de problèmes généraux et FAQ.
  </Card>
</CardGroup>
