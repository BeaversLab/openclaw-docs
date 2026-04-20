---
title: "Kilocode"
summary: "Utilisez l'API unifiée de Kilo Gateway pour accéder à de nombreux modèles dans OpenClaw"
read_when:
  - You want a single API key for many LLMs
  - You want to run models via Kilo Gateway in OpenClaw
---

# Kilo Gateway

Kilo Gateway fournit une **API unifiée** qui achemine les requêtes vers de nombreux modèles derrière un
seul point de terminaison et une seule clé API. Elle est compatible avec OpenAI, la plupart des SDK OpenAI fonctionnent donc simplement en changeant l'URL de base.

| Propriété   | Valeur                             |
| ----------- | ---------------------------------- |
| Provider    | `kilocode`                         |
| Auth        | `KILOCODE_API_KEY`                 |
| API         | OpenAI-compatible                  |
| URL de base | `https://api.kilo.ai/api/gateway/` |

## Getting started

<Steps>
  <Step title="Créer un compte">
    Rendez-vous sur [app.kilo.ai](https://app.kilo.ai), connectez-vous ou créez un compte, puis accédez aux API Keys et générez une nouvelle clé.
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

Le modèle par défaut est `kilocode/kilo/auto`, un modèle de smart-routing
appartenant au provider et géré par Kilo Gateway.

<Note>OpenClaw traite `kilocode/kilo/auto` comme la référence par défaut stable, mais ne publie pas de mappage tâche-vers-modèle-amont soutenu par une source pour cette route. Le routage amont exact derrière `kilocode/kilo/auto` est propriété de Kilo Gateway, et non codé en dur dans OpenClaw.</Note>

## Modèles disponibles

OpenClaw découvre dynamiquement les modèles disponibles depuis le Kilo Gateway au démarrage. Utilisez
`/models kilocode` pour voir la liste complète des modèles disponibles avec votre compte.

Tout modèle disponible sur la passerelle peut être utilisé avec le préfixe `kilocode/` :

| Réf modèle                             | Notes                                            |
| -------------------------------------- | ------------------------------------------------ |
| `kilocode/kilo/auto`                   | Par défaut — smart routing                       |
| `kilocode/anthropic/claude-sonnet-4`   | Anthropic via Kilo                               |
| `kilocode/openai/gpt-5.4`              | OpenAI via Kilo                                  |
| `kilocode/google/gemini-3-pro-preview` | Google via Kilo                                  |
| ...et bien d'autres                    | Utilisez `/models kilocode` pour tous les lister |

<Tip>Au démarrage, OpenClaw interroge `GET https://api.kilo.ai/api/gateway/models` et fusionne les modèles découverts avant le catalogue de repli statique. Le repli groupé inclut toujours `kilocode/kilo/auto` (`Kilo Auto`) avec `input: ["text", "image"]`, `reasoning: true`, `contextWindow: 1000000`, et `maxTokens: 128000`.</Tip>

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
    le chemin compatible OpenAI de type proxy plutôt que sur le formatage des demandes OpenAI natif.

    - Les références Kilo basées sur Gemini restent sur le chemin proxy-Gemini, donc OpenAI conserve
    le nettoyage de la signature de pensée Gemini sans activer la validation de relecture Gemini
    native ou les réécritures d'amorçage.
    - Kilo OpenAI utilise un jeton Bearer avec votre clé OpenClaw en arrière-plan.

  </Accordion>

  <Accordion title="Wrapper de flux et raisonnement">
    Le wrapper de flux partagé de Kilo ajoute l'en-tête de l'application du fournisseur et normalise
    les charges utiles de raisonnement proxy pour les références de modèles concrètes prises en charge.

    <Warning>
    `kilocode/kilo/auto` et autres indices non pris en charge pour le raisonnement proxy ignorent l'injection de raisonnement.
    Si vous avez besoin du support du raisonnement, utilisez une référence de modèle concrète telle que
    `kilocode/anthropic/claude-sonnet-4`.
    </Warning>

  </Accordion>

  <Accordion title="Dépannage">
    - Si la découverte de modèles échoue au démarrage, OpenClaw revient au catalogue statique inclus contenant `kilocode/kilo/auto`.
    - Confirmez que votre clé API est valide et que votre compte Kilo a les modèles souhaités activés.
    - Lorsque le Gateway s'exécute en tant que démon, assurez-vous que `KILOCODE_API_KEY` est disponible pour ce processus (par exemple dans `~/.openclaw/.env` ou via `env.shellEnv`).
  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection du modèle" href="/fr/concepts/model-providers" icon="layers">
    Choisir les fournisseurs, les références de modèles et le comportement de basculement.
  </Card>
  <Card title="Référence de configuration" href="/fr/gateway/configuration" icon="gear">
    Référence complète de la configuration OpenClaw.
  </Card>
  <Card title="Kilo Gateway" href="https://app.kilo.ai" icon="arrow-up-right-from-square">
    Tableau de bord Kilo Gateway, clés API et gestion de compte.
  </Card>
</CardGroup>
