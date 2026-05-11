---
summary: "Configuration de la passerelle AI Vercel (auth + sélection de modèle)"
title: "Passerelle AI Vercel"
read_when:
  - You want to use Vercel AI Gateway with OpenClaw
  - You need the API key env var or CLI auth choice
---

La [Vercel AI Gateway](https://vercel.com/ai-gateway) fournit une API unifiée pour
accéder à des centaines de modèles via un seul point de terminaison.

| Propriété            | Valeur                                     |
| -------------------- | ------------------------------------------ |
| Fournisseur          | `vercel-ai-gateway`                        |
| Auth                 | `AI_GATEWAY_API_KEY`                       |
| API                  | Compatible avec les messages Anthropic     |
| Catalogue de modèles | Découvert automatiquement via `/v1/models` |

<Tip>OpenClaw découvre automatiquement le catalogue `/v1/models` de la passerelle, donc `/models vercel-ai-gateway` inclut des références de modèles actuelles telles que `vercel-ai-gateway/openai/gpt-5.5` et `vercel-ai-gateway/moonshotai/kimi-k2.6`.</Tip>

## Getting started

<Steps>
  <Step title="Définir la clé API">
    Exécutez l'intégration (onboarding) et choisissez l'option d'authentification de la passerelle AI :

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

OpenClaw accepte les références de modèle raccourcies Vercel Claude et les normalise au
moment de l'exécution :

| Saisie abrégée                      | Référence de modèle normalisée                |
| ----------------------------------- | --------------------------------------------- |
| `vercel-ai-gateway/claude-opus-4.6` | `vercel-ai-gateway/anthropic/claude-opus-4.6` |
| `vercel-ai-gateway/opus-4.6`        | `vercel-ai-gateway/anthropic/claude-opus-4-6` |

<Tip>Vous pouvez utiliser soit le raccourci, soit la référence de modèle entièrement qualifiée dans votre configuration. OpenClaw résout la forme canonique automatiquement.</Tip>

## Configuration avancée

<AccordionGroup>
  <Accordion title="Environment variable for daemon processes">
    Si le OpenClaw Gateway s'exécute en tant que démon (launchd/systemd), assurez-vous que
    `AI_GATEWAY_API_KEY` est disponible pour ce processus.

    <Warning>
    Une clé définie uniquement dans `~/.profile` ne sera pas visible pour un démon launchd/systemd
    à moins que cet environnement ne soit explicitement importé. Définissez la clé dans
    `~/.openclaw/.env` ou via `env.shellEnv` pour garantir que le processus de la passerelle puisse
    la lire.
    </Warning>

  </Accordion>

  <Accordion title="Provider routing">
    Le Vercel AI Gateway achemine les requêtes vers le fournisseur amont en fonction du préfixe
    de référence du modèle. Par exemple, `vercel-ai-gateway/anthropic/claude-opus-4.6` transite
    via Anthropic, tandis que `vercel-ai-gateway/openai/gpt-5.5` transite via
    OpenAI et `vercel-ai-gateway/moonshotai/kimi-k2.6` transite via
    MoonshotAI. Votre unique `AI_GATEWAY_API_KEY` gère l'authentification pour tous
    les fournisseurs amont.
  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Model selection" href="/fr/concepts/model-providers" icon="layers">
    Choisir les fournisseurs, les références de modèles et le comportement de basculement.
  </Card>
  <Card title="Troubleshooting" href="/fr/help/troubleshooting" icon="wrench">
    Dépannage général et FAQ.
  </Card>
</CardGroup>
