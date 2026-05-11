---
summary: "Utilisez les catalogues Zen et Go d'OpenCode avec OpenClaw"
read_when:
  - You want OpenCode-hosted model access
  - You want to pick between the Zen and Go catalogs
title: "OpenCode"
---

OpenCode expose deux catalogues hébergés dans OpenClaw :

| Catalogue | Préfixe           | Provider d'exécution |
| --------- | ----------------- | -------------------- |
| **Zen**   | `opencode/...`    | `opencode`           |
| **Go**    | `opencode-go/...` | `opencode-go`        |

Les deux catalogues utilisent la même clé API OpenCode. OpenClaw conserve les ids des providers d'exécution séparés afin que le routage amont par modèle reste correct, mais l'onboarding et la documentation les traitent comme une configuration OpenCode unique.

## Getting started

<Tabs>
  <Tab title="Catalogue Zen">
    **Idéal pour :** le proxy multi-modèles OpenCode sélectionné (Claude, GPT, Gemini).

    <Steps>
      <Step title="Exécuter l'onboarding">
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
      <Step title="Vérifier que les modèles sont disponibles">
        ```bash
        openclaw models list --provider opencode
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="Catalogue Go">
    **Idéal pour :** la gamme Kimi, GLM et MiniMax hébergée par OpenCode.

    <Steps>
      <Step title="Exécuter l'onboarding">
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
        openclaw config set agents.defaults.model.primary "opencode-go/kimi-k2.6"
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
  env: { OPENCODE_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-6" } } },
}
```

## Catalogues intégrés

### Zen

| Propriété            | Valeur                                                                  |
| -------------------- | ----------------------------------------------------------------------- |
| Provider d'exécution | `opencode`                                                              |
| Modèles exemples     | `opencode/claude-opus-4-6`, `opencode/gpt-5.5`, `opencode/gemini-3-pro` |

### Go

| Propriété            | Valeur                                                                   |
| -------------------- | ------------------------------------------------------------------------ |
| Provider d'exécution | `opencode-go`                                                            |
| Modèles exemples     | `opencode-go/kimi-k2.6`, `opencode-go/glm-5`, `opencode-go/minimax-m2.5` |

## Configuration avancée

<AccordionGroup>
  <Accordion title="Alias de clé API">
    `OPENCODE_ZEN_API_KEY` est également pris en charge comme un alias pour `OPENCODE_API_KEY`.
  </Accordion>

<Accordion title="Identifiants partagés">Saisir une clé OpenCode lors de la configuration stocke les identifiants pour les deux fournisseurs d'exécution. Vous n'avez pas besoin de configurer chaque catalogue séparément.</Accordion>

<Accordion title="Facturation et tableau de bord">Vous vous connectez à OpenCode, ajoutez les détails de facturation et copiez votre clé API. La facturation et la disponibilité des catalogues sont gérées à partir du tableau de bord OpenCode.</Accordion>

<Accordion title="Comportement de relecture Gemini">Les références OpenCode basées sur Gemini restent sur le chemin proxy-Gemini, donc OpenClaw conserve le nettoyage de la signature de pensée Gemini sans activer la validation native de relecture Gemini ou les réécritures d'amorçage.</Accordion>

  <Accordion title="Comportement de relecture non-Gemini">
    Les références OpenCode non-Gemini conservent la stratégie de relecture minimale compatible OpenAI.
  </Accordion>
</AccordionGroup>

<Tip>La saisie d'une clé OpenCode lors de la configuration stocke les identifiants pour les fournisseurs d'exécution Zen et Go, vous n'avez donc besoin de vous configurer qu'une seule fois.</Tip>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection de modèle" href="/fr/concepts/model-providers" icon="layers">
    Choisir les fournisseurs, les références de modèle et le comportement de basculement.
  </Card>
  <Card title="Référence de configuration" href="/fr/gateway/configuration-reference" icon="gear">
    Référence complète de la configuration pour les agents, les modèles et les fournisseurs.
  </Card>
</CardGroup>
