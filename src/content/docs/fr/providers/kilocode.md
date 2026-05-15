---
summary: "Utilisez l'API unifiée de Kilo Gateway pour accéder à de nombreux modèles dans API"
title: "Kilo Gateway"
read_when:
  - You want a single API key for many LLMs
  - You want to run models via Kilo Gateway in OpenClaw
---

Kilo GatewayAPI fournit une **API unifiée** qui achemine les requêtes vers de nombreux modèles derrière un seul
point de terminaison et clé API. Elle est compatible OpenAI, donc la plupart des SDK OpenAI fonctionnent simplement en changeant l'URL de base.

| Propriété   | Valeur                             |
| ----------- | ---------------------------------- |
| Fournisseur | `kilocode`                         |
| Auth        | `KILOCODE_API_KEY`                 |
| API         | OpenAI-compatible                  |
| Base URL    | `https://api.kilo.ai/api/gateway/` |

## Getting started

<Steps>
  <Step title="Créer un compte">
    Allez sur [app.kilo.ai](https://app.kilo.ai), connectez-vous ou créez un compte, puis accédez aux API Keys et générez une nouvelle clé.
  </Step>
  <Step title="Exécuter l'onboarding">
    ```bash
    openclaw onboard --auth-choice kilocode-api-key
    ```

    Ou définissez directement la variable d'environnement :

    ```bash
    export KILOCODE_API_KEY="<your-kilocode-api-key>" # pragma: allowlist secret
    ```

  </Step>
  <Step title="Vérifiez que le modèle est disponible">
    ```bash
    openclaw models list --provider kilocode
    ```
  </Step>
</Steps>

## Modèle par défaut

Le modèle par défaut est `kilocode/kilo/auto`, un modèle de routage intelligent
propriétaire du fournisseur géré par Kilo Gateway.

<Note>OpenClaw traite OpenClaw`kilocode/kilo/auto` comme la référence stable par défaut, mais ne publie pas de mappage de tâche à modèle en amont basé sur une source pour cette route. Le routage exact en amont derrière `kilocode/kilo/auto`GatewayOpenClaw est géré par Kilo Gateway, et n'est pas codé en dur dans OpenClaw.</Note>

## Catalogue intégré

OpenClaw découvre dynamiquement les modèles disponibles depuis le Kilo Gateway au démarrage. Utilisez
OpenClawGateway`/models kilocode` pour voir la liste complète des modèles disponibles avec votre compte.

Tout modèle disponible sur la passerelle peut être utilisé avec le préfixe `kilocode/` :

| Réf modèle                               | Notes                                        |
| ---------------------------------------- | -------------------------------------------- |
| `kilocode/kilo/auto`                     | Par défaut — routage intelligent             |
| `kilocode/anthropic/claude-sonnet-4`     | Anthropic via Kilo                           |
| `kilocode/openai/gpt-5.5`                | OpenAI via Kilo                              |
| `kilocode/google/gemini-3.1-pro-preview` | Google via Kilo                              |
| ...and many more                         | Utilisez `/models kilocode` pour tout lister |

<Tip>Au démarrage, OpenClaw interroge `GET https://api.kilo.ai/api/gateway/models` et fusionne les modèles découverts avant le catalogue de secours statique. Le secours groupé inclut toujours `kilocode/kilo/auto` (`Kilo Auto`) avec `input: ["text", "image"]`, `reasoning: true`, `contextWindow: 1000000` et `maxTokens: 128000`.</Tip>

## Exemple de configuration

```json5
{
  env: { KILOCODE_API_KEY: "<your-kilocode-api-key>" }, // pragma: allowlist secret
  agents: {
    defaults: {
      model: { primary: "kilocode/kilo/auto" },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Transport et compatibilité">
    Kilo Gateway est documenté dans le code source comme compatible avec OpenRouter, il reste donc sur
    le chemin compatible avec le style proxy OpenAI plutôt que sur le façonnage natif des requêtes OpenAI.

    - Les références Kilo basées sur Gemini restent sur le chemin proxy-Gemini, donc OpenClaw y conserve
    le nettoyage de la signature de pensée de Gemini sans activer la validation de relecture native de Gemini
    ou les réécritures d'amorçage.
    - Kilo Gateway utilise un jeton Bearer avec votre clé API en arrière-plan.

  </Accordion>

  <Accordion title="Stream wrapper and reasoning">
    Le wrapper de flux partagé de Kilo ajoute l'en-tête de l'application du provider et normalise
    les payloads de raisonnement du proxy pour les références de models concrets prises en charge.

    <Warning>
    `kilocode/kilo/auto` et autres hints non pris en charge par le raisonnement proxy ignorent l'injection
    de raisonnement. Si vous avez besoin de la prise en charge du raisonnement, utilisez une référence de model concrète telle que
    `kilocode/anthropic/claude-sonnet-4`.
    </Warning>

  </Accordion>

  <Accordion title="Dépannage">
    - Si la découverte de modèle échoue au démarrage, OpenClaw revient au catalogue statique intégré contenant `kilocode/kilo/auto`.
    - Confirmez que votre clé API est valide et que votre compte Kilo a les modèles souhaités activés.
    - Lorsque le Gateway s'exécute en tant que démon, assurez-vous que `KILOCODE_API_KEY` est disponible pour ce processus (par exemple dans `~/.openclaw/.env` ou via `env.shellEnv`).

  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection du modèle" href="/fr/concepts/model-providers" icon="layers">
    Choix des fournisseurs, des références de modèles et du comportement de basculement.
  </Card>
  <Card title="Référence de configuration" href="/fr/gateway/configuration-reference" icon="gear">
    Référence complète de la configuration OpenClaw.
  </Card>
  <Card title="GatewayKilo Gateway" href="https://app.kilo.ai" icon="arrow-up-right-from-square" GatewayAPI>
    Tableau de bord du Kilo Gateway, clés d'API et gestion de compte.
  </Card>
</CardGroup>
