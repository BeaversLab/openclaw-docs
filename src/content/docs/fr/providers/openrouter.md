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
  <Step title="Obtenez votre clé d'API">
    Créez une clé d'API sur [openrouter.ai/keys](https://openrouter.ai/keys).
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
Les références de modèle suivent le modèle `openrouter/<provider>/<model>`. Pour la liste complète des
fournisseurs et modèles disponibles, consultez [/concepts/model-providers](/fr/concepts/model-providers).
</Note>

Exemples de repli groupés :

| Réf. modèle                          | Notes                          |
| ------------------------------------ | ------------------------------ |
| `openrouter/auto`                    | Routage automatique OpenRouter |
| `openrouter/moonshotai/kimi-k2.6`    | Kimi K2.6 via MoonshotAI       |
| `openrouter/openrouter/healer-alpha` | Route Alpha Healer OpenRouter  |
| `openrouter/openrouter/hunter-alpha` | Route Alpha Hunter OpenRouter  |

## Authentification et en-têtes

OpenRouter utilise un jeton Bearer avec votre clé d'API en arrière-plan.

Sur les vraies requêtes OpenRouter (`https://openrouter.ai/api/v1`), OpenClaw ajoute également
les en-têtes d'attribution d'application documentés de OpenRouter :

| En-tête                   | Valeur                |
| ------------------------- | --------------------- |
| `HTTP-Referer`            | `https://openclaw.ai` |
| `X-OpenRouter-Title`      | `OpenClaw`            |
| `X-OpenRouter-Categories` | `cli-agent`           |

<Warning>Si vous redirigez le fournisseur OpenRouter vers un autre proxy ou URL de base, OpenClaw n'injecte **pas** ces en-têtes spécifiques à OpenRouter ou les marqueurs de cache Anthropic.</Warning>

## Notes avancées

<AccordionGroup>
  <Accordion title="Marqueurs de cache Anthropic">
    Sur les routes OpenRouter vérifiées, les références de modèle Anthropic conservent les
    marqueurs `cache_control` OpenRouter spécifiques à Anthropic que OpenClaw utilise pour
    une meilleure réutilisation du cache de prompt sur les blocs de prompt système/développeur.
  </Accordion>

<Accordion title="Injection de réflexion / raisonnement">Sur les routes non-`auto` prises en charge, OpenClaw mappe le niveau de réflexion sélectionné aux charges utiles de raisonnement du proxy OpenRouter. Les indications de modèle non prises en charge et `openrouter/auto` ignorent cette injection de raisonnement.</Accordion>

<Accordion title="OpenAI-only request shaping">OpenRouter transite toujours par le chemin compatible OpenAI de type proxy, de sorte que la mise en forme des requêtes native OpenAI-only telle que `serviceTier`, Responses `store`, les payloads de raisonnement compatibles OpenAI et les indices de cache de prompt ne sont pas transmis.</Accordion>

<Accordion title="Gemini-backed routes">Les références OpenRouter alimentées par Gemini restent sur le chemin proxy-Gemini : OpenClaw conserve le nettoyage des signatures de pensée Gemini à cet endroit, mais n'active pas la validation de relecture native Gemini ou les réécritures d'amorçage.</Accordion>

  <Accordion title="Provider routing metadata">
    Si vous transmettez le routage du fournisseur OpenRouter sous les paramètres du modèle, OpenClaw le transmet
    en tant que métadonnées de routage OpenRouter avant l'exécution des wrappers de flux partagés.
  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Model selection" href="/fr/concepts/model-providers" icon="layers">
    Choix des fournisseurs, références de modèle et comportement de basculement.
  </Card>
  <Card title="Configuration reference" href="/fr/gateway/configuration-reference" icon="gear">
    Référence complète de la configuration pour les agents, les modèles et les fournisseurs.
  </Card>
</CardGroup>
