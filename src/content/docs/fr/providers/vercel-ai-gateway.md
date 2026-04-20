---
title: "Vercel AI Gateway"
summary: "Configuration de Vercel AI Gateway (auth + sélection de modèle)"
read_when:
  - You want to use Vercel AI Gateway with OpenClaw
  - You need the API key env var or CLI auth choice
---

# Vercel AI Gateway

Le [Vercel AI Gateway](https://vercel.com/ai-gateway) fournit une API unifiée pour
accéder à des centaines de modèles via un seul point de terminaison.

| Propriété            | Valeur                                     |
| -------------------- | ------------------------------------------ |
| Fournisseur          | `vercel-ai-gateway`                        |
| Auth                 | `AI_GATEWAY_API_KEY`                       |
| API                  | Compatible avec Anthropic Messages         |
| Catalogue de modèles | Découvert automatiquement via `/v1/models` |

<Tip>OpenClaw découvre automatiquement le catalogue `/v1/models` du Gateway, donc `/models vercel-ai-gateway` inclut les références actuelles des modèles telles que `vercel-ai-gateway/openai/gpt-5.4`.</Tip>

## Getting started

<Steps>
  <Step title="Définir la clé API">
    Exécutez l'intégration (onboarding) et choisissez l'option d'authentification AI Gateway :

    ```bash
    openclaw onboard --auth-choice ai-gateway-api-key
    ```

  </Step>
  <Step title="Définir un modèle par défaut">
    Ajoutez le modèle à votre configuration OpenClaw :

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "vercel-ai-gateway/anthropic/claude-opus-4.6" },
        },
      },
    }
    ```

  </Step>
  <Step title="Vérifier que le modèle est disponible">
    ```bash
    openclaw models list --provider vercel-ai-gateway
    ```
  </Step>
</Steps>

## Exemple non interactif

Pour les configurations scriptées ou CI, passez toutes les valeurs en ligne de commande :

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice ai-gateway-api-key \
  --ai-gateway-api-key "$AI_GATEWAY_API_KEY"
```

## Raccourci d'ID de modèle

OpenClaw accepte les références de modèle abrégées Vercel Claude et les normalise à
l'exécution :

| Saisie abrégée                      | Référence de modèle normalisée                |
| ----------------------------------- | --------------------------------------------- |
| `vercel-ai-gateway/claude-opus-4.6` | `vercel-ai-gateway/anthropic/claude-opus-4.6` |
| `vercel-ai-gateway/opus-4.6`        | `vercel-ai-gateway/anthropic/claude-opus-4-6` |

<Tip>Vous pouvez utiliser indifféremment le raccourci ou la référence de modèle complète dans votre configuration. OpenClaw résout automatiquement la forme canonique.</Tip>

## Notes avancées

<AccordionGroup>
  <Accordion title="Variable d'environnement pour les processus démon">
    Si le OpenClaw Gateway s'exécute en tant que démon (launchd/systemd), assurez-vous
    que `AI_GATEWAY_API_KEY` est disponible pour ce processus.

    <Warning>
    Une clé définie uniquement dans `~/.profile` ne sera pas visible pour un démon
    launchd/systemd, sauf si cet environnement est explicitement importé. Définissez la clé dans
    `~/.openclaw/.env` ou via `env.shellEnv` pour vous assurer que le processus de la passerelle peut
    la lire.
    </Warning>

  </Accordion>

  <Accordion title="Routage du fournisseur">
    Vercel AI Gateway route les demandes vers le fournisseur amont en fonction du préfixe de
    référence du modèle. Par exemple, `vercel-ai-gateway/anthropic/claude-opus-4.6` route
    via Anthropic, tandis que `vercel-ai-gateway/openai/gpt-5.4` route via
    OpenAI. Votre `AI_GATEWAY_API_KEY` unique gère l'authentification pour tous
    les fournisseurs amont.
  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection du modèle" href="/en/concepts/model-providers" icon="layers">
    Choisir les fournisseurs, les références de modèle et le comportement de basculement.
  </Card>
  <Card title="Résolution de problèmes" href="/en/help/troubleshooting" icon="wrench">
    Résolution de problèmes généraux et FAQ.
  </Card>
</CardGroup>
