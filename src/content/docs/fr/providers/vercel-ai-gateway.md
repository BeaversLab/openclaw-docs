---
summary: "Configuration de la passerelle AI Vercel (auth + sélection de modèle)"
title: "Passerelle AI Vercel"
read_when:
  - You want to use Vercel AI Gateway with OpenClaw
  - You need the API key env var or CLI auth choice
---

Le [Vercel AI Gateway](https://vercel.com/ai-gateway) fournit une API unifiée pour
accéder à des centaines de modèles via un point de terminaison unique.

| Propriété            | Valeur                                     |
| -------------------- | ------------------------------------------ |
| Fournisseur          | `vercel-ai-gateway`                        |
| Auth                 | `AI_GATEWAY_API_KEY`                       |
| API                  | Compatible avec les messages Anthropic     |
| Catalogue de modèles | Découvert automatiquement via `/v1/models` |

<Tip>OpenClaw découvre automatiquement le catalogue Gateway `/v1/models`, donc `/models vercel-ai-gateway` inclut les références de modèles actuelles telles que `vercel-ai-gateway/openai/gpt-5.5` et `vercel-ai-gateway/moonshotai/kimi-k2.6`.</Tip>

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
  <Accordion title="Variable d'environnement pour les processus daemon">
    Si le OpenClaw Gateway s'exécute en tant que daemon (launchd/systemd), assurez-vous
    que `AI_GATEWAY_API_KEY` est disponible pour ce processus.

    <Warning>
    Une clé exportée uniquement dans un shell interactif ne sera pas visible pour un
    daemon launchd/systemd, sauf si cet environnement est explicitement importé. Définissez
    la clé dans `~/.openclaw/.env` ou via `env.shellEnv` pour garantir que le processus
    de passerelle puisse la lire.
    </Warning>

  </Accordion>

  <Accordion title="Routage du fournisseur">
    Le Vercel AI Gateway achemine les requêtes vers le fournisseur en amont en fonction du préfixe
    de référence du modèle. Par exemple, `vercel-ai-gateway/anthropic/claude-opus-4.6` achemine
    via Anthropic, tandis que `vercel-ai-gateway/openai/gpt-5.5` achemine via
    OpenAI et `vercel-ai-gateway/moonshotai/kimi-k2.6` achemine via
    MoonshotAI. Votre seul `AI_GATEWAY_API_KEY` gère l'authentification pour tous
    les fournisseurs en amont.
  </Accordion>
  <Accordion title="Niveaux de réflexion">
    Les options `/think` suivent les préfixes de modèles en amont approuvés lorsque OpenClaw connaît
    le contrat du fournisseur en amont. `vercel-ai-gateway/anthropic/...` utilise le
    profil de réflexion Claude, y compris les valeurs adaptatives par défaut pour les modèles Claude 4.6.
    `vercel-ai-gateway/openai/gpt-5.4`, `gpt-5.5` et les références de style Codex exposent
    `/think xhigh` tout comme les fournisseurs directs OpenAI/OpenAI Codex. Les autres
    références espacées de noms conservent les niveaux de raisonnement normaux, sauf si leurs métadonnées
    de catalogue en déclarent davantage.
  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Model selection" href="/fr/concepts/model-providers" icon="layers">
    Choix des fournisseurs, des références de modèle et du comportement de basculement.
  </Card>
  <Card title="Troubleshooting" href="/fr/help/troubleshooting" icon="wrench">
    Dépannage général et FAQ.
  </Card>
</CardGroup>
