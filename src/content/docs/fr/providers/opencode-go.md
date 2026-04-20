---
summary: "Utiliser le catalogue OpenCode Go avec la configuration OpenCode partagée"
read_when:
  - You want the OpenCode Go catalog
  - You need the runtime model refs for Go-hosted models
title: "OpenCode Go"
---

# OpenCode Go

OpenCode Go est le catalogue Go au sein de [OpenCode](/en/providers/opencode).
Il utilise le même `OPENCODE_API_KEY` que le catalogue Zen, mais conserve l'identifiant du
provider d'exécution `opencode-go` afin que le routage en amont par modèle reste correct.

| Propriété             | Valeur                             |
| --------------------- | ---------------------------------- |
| Provider d'exécution  | `opencode-go`                      |
| Auth                  | `OPENCODE_API_KEY`                 |
| Configuration parente | [OpenCode](/en/providers/opencode) |

## Modèles pris en charge

| Réf modèle                 | Nom          |
| -------------------------- | ------------ |
| `opencode-go/kimi-k2.5`    | Kimi K2.5    |
| `opencode-go/glm-5`        | GLM 5        |
| `opencode-go/minimax-m2.5` | MiniMax M2.5 |

## Getting started

<Tabs>
  <Tab title="Interactive">
    <Steps>
      <Step title="Run onboarding">
        ```bash
        openclaw onboard --auth-choice opencode-go
        ```
      </Step>
      <Step title="Set a Go model as default">
        ```bash
        openclaw config set agents.defaults.model.primary "opencode-go/kimi-k2.5"
        ```
      </Step>
      <Step title="Verify models are available">
        ```bash
        openclaw models list --provider opencode-go
        ```
      </Step>
    </Steps>
  </Tab>

  <Tab title="Non-interactive">
    <Steps>
      <Step title="Passer la clé directement">
        ```bash
        openclaw onboard --opencode-go-api-key "$OPENCODE_API_KEY"
        ```
      </Step>
      <Step title="Vérifier que les modèles sont disponibles">
        ```bash
        openclaw models list --provider opencode-go
        ```
      </Step>
    </Steps>
  </Tab>
</Tabs>

## Exemple de configuration

```json5
{
  env: { OPENCODE_API_KEY: "YOUR_API_KEY_HERE" }, // pragma: allowlist secret
  agents: { defaults: { model: { primary: "opencode-go/kimi-k2.5" } } },
}
```

## Notes avancées

<AccordionGroup>
  <Accordion title="Comportement du routage">
    OpenClaw gère le routage par modèle automatiquement lorsque la référence du modèle utilise
    `opencode-go/...`. Aucune configuration de provider supplémentaire n'est requise.
  </Accordion>

<Accordion title="Convention des références d'exécution">Les références d'exécution restent explicites : `opencode/...` pour Zen, `opencode-go/...` pour Go. Cela permet de garder le routage par modèle en amont correct sur les deux catalogues.</Accordion>

  <Accordion title="Identifiants partagés">
    Le même `OPENCODE_API_KEY` est utilisé par les catalogues Zen et Go. Saisir
    la clé lors de la configuration stocke les identifiants pour les deux providers d'exécution.
  </Accordion>
</AccordionGroup>

<Tip>Voir [OpenCode](/en/providers/opencode) pour la vue d'ensemble de l'intégration partagée et la référence complète des catalogues Zen + Go.</Tip>

## Connexes

<CardGroup cols={2}>
  <Card title="OpenCode (parent)" href="/en/providers/opencode" icon="server">
    Onboarding partagé, aperçu du catalogue et notes avancées.
  </Card>
  <Card title="Sélection de model" href="/en/concepts/model-providers" icon="layers">
    Choix des fournisseurs, des références de model et du comportement de basculement.
  </Card>
</CardGroup>
