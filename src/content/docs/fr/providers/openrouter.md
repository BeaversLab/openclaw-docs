---
summary: "Utilisez l'API unifiée d'OpenRouter pour accéder à plusieurs modèles dans API"
read_when:
  - You want a single API key for many LLMs
  - You want to run models via OpenRouter in OpenClaw
title: "OpenRouter"
---

# OpenRouter

OpenRouter fournit une **API unifiée (API)** qui achemine les requêtes vers de nombreux modèles derrière un seul point de terminaison et une seule clé API. Elle est compatible avec OpenAI. Par conséquent, la plupart des SDK OpenAI fonctionnent en changeant l'URL de base.

## Configuration CLI

```bash
openclaw onboard --auth-choice openrouter-api-key
```

## Extrait de configuration

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

## Notes

- Les références de modèle sont `openrouter/<provider>/<model>`.
- Onboarding est par défaut `openrouter/auto`. Passez à un modèle concret ultérieurement avec `openclaw models set openrouter/<provider>/<model>`.
- Pour plus d'options de modèle/fournisseur, consultez [/concepts/model-providers](/en/concepts/model-providers).
- OpenRouter utilise un jeton Bearer avec votre clé API en arrière-plan.
- Sur les requêtes OpenRouter réelles (`https://openrouter.ai/api/v1`), OpenClaw ajoute également les en-tères d'attribution d'application documentés d'OpenRouter : `HTTP-Referer: https://openclaw.ai`, `X-OpenRouter-Title: OpenClaw`, et `X-OpenRouter-Categories: cli-agent`.
- Sur les routes OpenRouter vérifiées, les références de modèle Anthropic conservent également les marqueurs `cache_control` spécifiques à OpenRouter qu'OpenClaw utilise pour une meilleure réutilisation du cache de prompt sur les blocs de prompt système/développeur.
- Si vous redirigez le fournisseur OpenRouter vers un autre proxy/URL de base, OpenClaw n'injecte pas ces en-tères spécifiques à OpenRouter ou les marqueurs de cache Anthropic.
- OpenRouter continue de passer par le chemin compatible OpenAI de style proxy, donc le façonnage des requêtes natif uniquement pour OpenAI tel que `serviceTier`, les réponses `store`, les charges utiles de compatibilité de raisonnement OpenAI, et les indices de cache de prompt ne sont pas transmis.
- Les références OpenRouter basées sur Gemini restent sur le chemin proxy-Gemini : OpenClaw y maintient la nettoyage de la signature de pensée Gemini, mais n'active pas la validation de relecture native Gemini ou les réécritures d'amorçage.
- Sur les routes non-`auto` prises en charge, OpenClaw mappe le niveau de réflexion sélectionné sur les charges utiles de raisonnement de proxy OpenRouter. Les indices de modèle non pris en charge et `openrouter/auto` ignorent cette injection de raisonnement.
- Si vous transmettez le routage du fournisseur OpenRouter sous les paramètres du modèle, OpenClaw le transmet en tant que métadonnées de routage OpenRouter avant l'exécution des wrappers de flux partagés.
