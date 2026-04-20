---
summary: "Utilisez l'API unifiée d'OpenRouter pour accéder à de nombreux modèles dans API"
read_when:
  - You want a single API key for many LLMs
  - You want to run models via OpenRouter in OpenClaw
title: "OpenRouter"
---

# OpenRouter

OpenRouter fournit une **API unifiée (API)** qui achemine les requêtes vers de nombreux modèles derrière un seul point de terminaison et une seule clé API. Elle est compatible avec OpenAI. Par conséquent, la plupart des SDK OpenAI fonctionnent en changeant l'URL de base.

## Getting started

<Steps>
  <Step title="Obtenez votre clé API">
    Créez une clé API sur [openrouter.ai/keys](https://openrouter.ai/keys).
  </Step>
  <Step title="Lancer l'onboarding">
    ```bash
    openclaw onboard --auth-choice openrouter-api-key
    ```
  </Step>
  <Step title="(Facultatif) Passer à un model spécifique">
    L'onboarding est configuré par défaut sur `openrouter/auto`. Choisissez un model concret plus tard :

    ```bash
    openclaw models set openrouter/<provider>/<model>
    ```

  </Step>
</Steps>

## Config example

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      model: { primary: "openrouter/auto" },
    },
  },
}
```

## Model references

<Note>
Les références de model suivent le modèle `openrouter/<provider>/<model>`. Pour la liste complète des providers et des models disponibles, consultez [/concepts/model-providers](/en/concepts/model-providers).
</Note>

## Authentication and headers

OpenRouter utilise un jeton Bearer avec votre clé API en arrière-plan.

Sur les vraies requêtes OpenRouter (`https://openrouter.ai/api/v1`), OpenClaw ajoute également les en-têtes d'attribution d'application documentés d'OpenRouter :

| Header                    | Value                 |
| ------------------------- | --------------------- |
| `HTTP-Referer`            | `https://openclaw.ai` |
| `X-OpenRouter-Title`      | `OpenClaw`            |
| `X-OpenRouter-Categories` | `cli-agent`           |

<Warning>Si vous redirigez le provider OpenRouter vers un autre proxy ou URL de base, OpenClaw n'injecte **pas** ces en-têtes spécifiques à OpenRouter ni les marqueurs de cache Anthropic.</Warning>

## Advanced notes

<AccordionGroup>
  <Accordion title="Marqueurs de cache Anthropic">
    Sur les routes OpenRouter vérifiées, les références de model Anthropic conservent les marqueurs `cache_control` spécifiques à OpenRouter de Anthropic que OpenClaw utilise pour une meilleure réutilisation du cache de prompt sur les blocs de prompts système/développeur.
  </Accordion>

<Accordion title="Thinking / reasoning injection">Sur les routes non-`auto` prises en charge, OpenClaw mappe le niveau de réflexion sélectionné aux payloads de raisonnement du proxy OpenRouter. Les indications de modèle non prises en charge et `openrouter/auto` sautent cette injection de raisonnement.</Accordion>

<Accordion title="OpenAI-only request shaping">OpenRouter passe toujours par le chemin compatible OpenAI de type proxy, donc la mise en forme des requêtes native uniquement OpenAI telle que `serviceTier`, Responses `store`, les payloads compatibles avec le raisonnement OpenAI et les indications de cache de prompt ne sont pas transmis.</Accordion>

<Accordion title="Gemini-backed routes">Les refs OpenRouter soutenues par Gemini restent sur le chemin proxy-Gemini : OpenClaw y maintient le nettoyage de la signature de pensée Gemini, mais n'active pas la validation de relecture native Gemini ou les réécritures d'amorçage.</Accordion>

  <Accordion title="Provider routing metadata">
    Si vous transmettez le routage du fournisseur OpenRouter sous les paramètres du modèle, OpenClaw le transmet
    en tant que métadonnées de routage OpenRouter avant l'exécution des wrappers de flux partagés.
  </Accordion>
</AccordionGroup>

## Apparenté

<CardGroup cols={2}>
  <Card title="Model selection" href="/en/concepts/model-providers" icon="layers">
    Choix des fournisseurs, des références de modèle et du comportement de basculement.
  </Card>
  <Card title="Configuration reference" href="/en/gateway/configuration-reference" icon="gear">
    Référence de configuration complète pour les agents, les modèles et les fournisseurs.
  </Card>
</CardGroup>
