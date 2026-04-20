---
summary: "Utiliser le catalogue OpenCode Go avec la configuration OpenCode partagée"
read_when:
  - You want the OpenCode Go catalog
  - You need the runtime model refs for Go-hosted models
title: "OpenCode Go"
---

# OpenCode Go

OpenCode Go est le catalogue Go au sein de [OpenCode](/fr/providers/opencode).
Il utilise le même `OPENCODE_API_KEY` que le catalogue Zen, mais conserve l'identifiant du
provider d'exécution `opencode-go` afin que le routage en amont par modèle reste correct.

| Propriété             | Valeur                             |
| --------------------- | ---------------------------------- |
| Provider d'exécution  | `opencode-go`                      |
| Auth                  | `OPENCODE_API_KEY`                 |
| Configuration parente | [OpenCode](/fr/providers/opencode) |

## Modèles pris en charge

| Réf modèle                 | Nom          |
| -------------------------- | ------------ |
| `opencode-go/kimi-k2.5`    | Kimi K2.5    |
| `opencode-go/glm-5`        | GLM 5        |
| `opencode-go/minimax-m2.5` | MiniMax M2.5 |

## Getting started

<Tabs>
  <Tab title="Interactif">
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

  <Tab title="Non interactif">
    <Steps>
      <Step title="Pass the key directly">
        ```bash
        openclaw onboard --opencode-go-api-key "$OPENCODE_API_KEY"
        ```
      </Step>
      <Step title="Verify models are available">
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
    `opencode-go/...`. Aucune configuration de fournisseur supplémentaire n'est requise.
  </Accordion>

<Accordion title="Convention de référence d'exécution">Les références d'exécution restent explicites : `opencode/...` pour Zen, `opencode-go/...` pour Go. Cela permet de maintenir le routage amont par modèle correct sur les deux catalogues.</Accordion>

  <Accordion title="Identifiants partagés">
    Le même `OPENCODE_API_KEY` est utilisé par les catalogues Zen et Go. Saisir
    la clé lors de la configuration stocke les identifiants pour les deux fournisseurs d'exécution.
  </Accordion>
</AccordionGroup>

<Tip>Voir [OpenCode](/fr/providers/opencode) pour la présentation de l'onboarding partagé et la référence complète du catalogue Zen + Go.</Tip>

## Connexes

<CardGroup cols={2}>
  <Card title="OpenCode (parent)" href="/fr/providers/opencode" icon="server">
    Onboarding partagé, présentation du catalogue et notes avancées.
  </Card>
  <Card title="Sélection du modèle" href="/fr/concepts/model-providers" icon="layers">
    Choix des fournisseurs, références de modèles et comportement de basculement.
  </Card>
</CardGroup>
