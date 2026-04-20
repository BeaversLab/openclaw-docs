---
title: "Arcee AI"
summary: "Configuration Arcee AI (auth + sélection de model)"
read_when:
  - You want to use Arcee AI with OpenClaw
  - You need the API key env var or CLI auth choice
---

# Arcee AI

[Arcee AI](https://arcee.ai) fournit l'accès à la famille Trinity de modèles mixture-of-experts via une OpenAI compatible API. Tous les modèles Trinity sont sous licence Apache 2.0.

Les modèles Arcee AI sont accessibles directement via la plateforme Arcee ou via [OpenRouter](/en/providers/openrouter).

| Propriété   | Valeur                                                                                |
| ----------- | ------------------------------------------------------------------------------------- |
| Fournisseur | `arcee`                                                                               |
| Auth        | `ARCEEAI_API_KEY` (direct) ou `OPENROUTER_API_KEY` (via OpenRouter)                   |
| API         | Compatible OpenAI                                                                     |
| URL de base | `https://api.arcee.ai/api/v1` (direct) ou `https://openrouter.ai/api/v1` (OpenRouter) |

## Getting started

<Tabs>
  <Tab title="Direct (plateforme Arcee)">
    <Steps>
      <Step title="Obtenir une clé API">
        Créez une clé API sur [Arcee AI](https://chat.arcee.ai/).
      </Step>
      <Step title="Exécuter l'onboarding">
        ```bash
        openclaw onboard --auth-choice arceeai-api-key
        ```
      </Step>
      <Step title="Définir un model par défaut">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "arcee/trinity-large-thinking" },
            },
          },
        }
        ```
      </Step>
    </Steps>
  </Tab>

  <Tab title="Via OpenRouter">
    <Steps>
      <Step title="Obtenir une clé API">
        Créez une clé API sur [OpenRouter](https://openrouter.ai/keys).
      </Step>
      <Step title="Exécuter l'onboarding">
        ```bash
        openclaw onboard --auth-choice arceeai-openrouter
        ```
      </Step>
      <Step title="Définir un model par défaut">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "arcee/trinity-large-thinking" },
            },
          },
        }
        ```

        Les mêmes références de model fonctionnent pour les configurations directes et OpenRouter (par exemple `arcee/trinity-large-thinking`).
      </Step>
    </Steps>

  </Tab>
</Tabs>

## Configuration non interactive

<Tabs>
  <Tab title="Direct (Arcee platform)">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice arceeai-api-key \
      --arceeai-api-key "$ARCEEAI_API_KEY"
    ```
  </Tab>

  <Tab title="Via OpenRouter">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice arceeai-openrouter \
      --openrouter-api-key "$OPENROUTER_API_KEY"
    ```
  </Tab>
</Tabs>

## Catalogue intégré

OpenClaw fournit actuellement ce catalogue Arcee intégré :

| Réf. model                     | Nom                    | Entrée | Contexte | Coût (entrée/sortie par 1M) | Notes                                   |
| ------------------------------ | ---------------------- | ------ | -------- | --------------------------- | --------------------------------------- |
| `arcee/trinity-large-thinking` | Trinity Large Thinking | texte  | 256K     | $0,25 / $0,90               | Modèle par défaut ; raisonnement activé |
| `arcee/trinity-large-preview`  | Trinity Large Preview  | texte  | 128K     | $0,25 / $1,00               | Usage général ; 400B params, 13B actifs |
| `arcee/trinity-mini`           | Trinity Mini 26B       | texte  | 128K     | $0,045 / $0,15              | Rapide et rentable ; appel de fonction  |

<Tip>La préréglage d'intégration (onboarding) définit `arcee/trinity-large-thinking` comme modèle par défaut.</Tip>

## Fonctionnalités prises en charge

| Fonctionnalité                               | Pris en charge               |
| -------------------------------------------- | ---------------------------- |
| Streaming                                    | Oui                          |
| Utilisation d'outils / appel de fonction     | Oui                          |
| Sortie structurée (mode JSON et schéma JSON) | Oui                          |
| Réflexion étendue                            | Oui (Trinity Large Thinking) |

<AccordionGroup>
  <Accordion title="Note d'environnement">
    Si le Gateway s'exécute en tant que démon (launchd/systemd), assurez-vous que `ARCEEAI_API_KEY`
    (ou `OPENROUTER_API_KEY`) est disponible pour ce processus (par exemple, dans
    `~/.openclaw/.env` ou via `env.shellEnv`).
  </Accordion>

  <Accordion title="Routage OpenRouter">
    Lors de l'utilisation des modèles Arcee via OpenRouter, les mêmes références de modèle `arcee/*` s'appliquent.
    OpenClaw gère le routage de manière transparente en fonction de votre choix d'authentification. Consultez la
    [documentation du fournisseur OpenRouter](/en/providers/openrouter) pour les détails de configuration
    spécifiques à OpenRouter.
  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="OpenRouter" href="/en/providers/openrouter" icon="shuffle">
    Accédez aux modèles Arcee et à bien d'autres via une seule clé API.
  </Card>
  <Card title="Sélection du modèle" href="/en/concepts/model-providers" icon="layers">
    Choisir les fournisseurs, les références de modèle et le comportement de basculement.
  </Card>
</CardGroup>
