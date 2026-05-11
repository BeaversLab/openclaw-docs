---
summary: "Configuration de la passerelle AI Cloudflare (auth + sélection du modèle)"
title: "Passerelle AI Cloudflare"
read_when:
  - You want to use Cloudflare AI Gateway with OpenClaw
  - You need the account ID, gateway ID, or API key env var
---

La passerelle AI Cloudflare se situe devant les API des fournisseurs et vous permet d'ajouter des analyses, de la mise en cache et des contrôles. Pour Anthropic, OpenClaw utilise l'API de messages Anthropic via votre point de terminaison de passerelle.

| Propriété         | Valeur                                                                                             |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| Fournisseur       | `cloudflare-ai-gateway`                                                                            |
| URL de base       | `https://gateway.ai.cloudflare.com/v1/<account_id>/<gateway_id>/anthropic`                         |
| Modèle par défaut | `cloudflare-ai-gateway/claude-sonnet-4-6`                                                          |
| Clé API           | `CLOUDFLARE_AI_GATEWAY_API_KEY` (votre clé API de fournisseur pour les requêtes via la passerelle) |

<Note>Pour les modèles Anthropic acheminés via la passerelle AI Cloudflare, utilisez votre **clé API Anthropic** comme clé de fournisseur.</Note>

## Getting started

<Steps>
  <Step title="Définir la clé API du fournisseur et les détails de la passerelle">
    Exécutez l'intégration et choisissez l'option d'authentification de la passerelle AI Cloudflare :

    ```bash
    openclaw onboard --auth-choice cloudflare-ai-gateway-api-key
    ```

    Ceci demande votre ID de compte, l'ID de la passerelle et la clé API.

  </Step>
  <Step title="Définir un modèle par défaut">
    Ajoutez le modèle à votre configuration OpenClaw :

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "cloudflare-ai-gateway/claude-sonnet-4-6" },
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
    Si vous avez activé l'authentification de la passerelle dans Cloudflare, ajoutez l'en-tête `cf-aig-authorization`. Ceci est **en plus de** votre clé API de fournisseur.

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
    L'en-tête `cf-aig-authorization` authentifie auprès de la passerelle Cloudflare elle-même, tandis que la clé API du fournisseur (par exemple, votre clé Anthropic) authentifie auprès du fournisseur en amont.
    </Tip>

  </Accordion>

  <Accordion title="Remarque sur l'environnement">
    Si le Gateway s'exécute en tant que démon (launchd/systemd), assurez-vous que `CLOUDFLARE_AI_GATEWAY_API_KEY` est disponible pour ce processus.

    <Warning>
    Une clé présente uniquement dans `~/.profile` n'aidera pas un démon launchd/systemd à moins que cet environnement ne soit également importé. Définissez la clé dans `~/.openclaw/.env` ou via `env.shellEnv` pour vous assurer que le processus de la passerelle peut la lire.
    </Warning>

  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection du modèle" href="/fr/concepts/model-providers" icon="layers">
    Choix des fournisseurs, références de modèles et comportement de basculement.
  </Card>
  <Card title="Dépannage" href="/fr/help/troubleshooting" icon="wrench">
    Dépannage général et FAQ.
  </Card>
</CardGroup>
