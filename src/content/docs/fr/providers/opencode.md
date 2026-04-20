---
summary: "Utilisez les catalogues Zen et Go d'OpenCode avec OpenClaw"
read_when:
  - You want OpenCode-hosted model access
  - You want to pick between the Zen and Go catalogs
title: "OpenCode"
---

# OpenCode

OpenCode expose deux catalogues hébergés sur OpenClaw :

| Catalogue | Préfixe           | Fournisseur d'exécution |
| --------- | ----------------- | ----------------------- |
| **Zen**   | `opencode/...`    | `opencode`              |
| **Go**    | `opencode-go/...` | `opencode-go`           |

Les deux catalogues utilisent la même clé d'API OpenCode. OpenClaw conserve les identifiants des fournisseurs d'exécution séparés afin que le routage en amont par modèle reste correct, mais l'intégration et la documentation les traitent comme une seule configuration OpenCode.

## Getting started

<Tabs>
  <Tab title="Catalogue Zen">
    **Idéal pour :** le proxy multi-modèles OpenCode sélectionné (Claude, GPT, Gemini).

    <Steps>
      <Step title="Exécuter l'intégration">
        ```bash
        openclaw onboard --auth-choice opencode-zen
        ```

        Ou passez la clé directement :

        ```bash
        openclaw onboard --opencode-zen-api-key "$OPENCODE_API_KEY"
        ```
      </Step>
      <Step title="Définir un modèle Zen par défaut">
        ```bash
        openclaw config set agents.defaults.model.primary "opencode/claude-opus-4-6"
        ```
      </Step>
      <Step title="Vérifier la disponibilité des modèles">
        ```bash
        openclaw models list --provider opencode
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="Catalogue Go">
    **Idéal pour :** la gamme Kimi, GLM et MiniMax hébergée par OpenCode.

    <Steps>
      <Step title="Exécuter l'intégration">
        ```bash
        openclaw onboard --auth-choice opencode-go
        ```

        Ou passez la clé directement :

        ```bash
        openclaw onboard --opencode-go-api-key "$OPENCODE_API_KEY"
        ```
      </Step>
      <Step title="Définir un modèle Go par défaut">
        ```bash
        openclaw config set agents.defaults.model.primary "opencode-go/kimi-k2.5"
        ```
      </Step>
      <Step title="Vérifier la disponibilité des modèles">
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
  env: { OPENCODE_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-6" } } },
}
```

## Catalogues

### Zen

| Propriété               | Valeur                                                                  |
| ----------------------- | ----------------------------------------------------------------------- |
| Fournisseur d'exécution | `opencode`                                                              |
| Exemples de modèles     | `opencode/claude-opus-4-6`, `opencode/gpt-5.4`, `opencode/gemini-3-pro` |

### Go

| Propriété               | Valeur                                                                   |
| ----------------------- | ------------------------------------------------------------------------ |
| Fournisseur d'exécution | `opencode-go`                                                            |
| Exemples de modèles     | `opencode-go/kimi-k2.5`, `opencode-go/glm-5`, `opencode-go/minimax-m2.5` |

## Notes avancées

<AccordionGroup>
  <Accordion title="Alias de clé d'API">
    `OPENCODE_ZEN_API_KEY` est également pris en charge comme alias pour `OPENCODE_API_KEY`.
  </Accordion>

<Accordion title="Identifiants partagés">Saisir une clé OpenCode lors de la configuration stocke les identifiants pour les deux fournisseurs d'exécution. Vous n'avez pas besoin d'intégrer chaque catalogue séparément.</Accordion>

<Accordion title="Facturation et tableau de bord">Vous vous connectez à OpenCode, ajoutez les détails de facturation et copiez votre clé API. La facturation et la disponibilité des catalogues sont gérées depuis le tableau de bord OpenCode.</Accordion>

<Accordion title="Comportement de rejeu Gemini">Les références OpenCode basées sur Gemini restent sur le chemin proxy-Gemini, donc OpenClaw conserve le nettoyage de la signature de pensée Gemini sans activer la validation native de rejeu Gemini ou les réécritures d'amorçage.</Accordion>

  <Accordion title="Comportement de rejeu non-Gemini">
    Les références OpenCode non-Gemini conservent la stratégie de rejeu minimale compatible avec OpenAI.
  </Accordion>
</AccordionGroup>

<Tip>La saisie d'une clé OpenCode lors de la configuration stocke les identifiants pour les deux fournisseurs d'exécution Zen et Go, vous n'avez donc besoin de vous intégrer qu'une seule fois.</Tip>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection du modèle" href="/en/concepts/model-providers" icon="layers">
    Choisir les fournisseurs, les références de modèle et le comportement de basculement.
  </Card>
  <Card title="Référence de configuration" href="/en/gateway/configuration-reference" icon="gear">
    Référence complète de la configuration pour les agents, les modèles et les fournisseurs.
  </Card>
</CardGroup>
