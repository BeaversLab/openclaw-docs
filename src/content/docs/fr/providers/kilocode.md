---
title: "Kilo Gateway"
summary: "Utilisez l'API unifiée de Kilo Gateway pour accéder à de nombreux modèles dans OpenClaw"
read_when:
  - You want a single API key for many LLMs
  - You want to run models via Kilo Gateway in OpenClaw
---

# Kilo Gateway

Kilo Gateway fournit une **API unifiée** qui achemine les requêtes vers de nombreux modèles derrière un
seul point de terminaison et une seule clé API. Elle est compatible avec OpenAI, la plupart des SDK OpenAI fonctionnent donc simplement en changeant l'URL de base.

## Obtenir une clé API

1. Accédez à [app.kilo.ai](https://app.kilo.ai)
2. Connectez-vous ou créez un compte
3. Accédez à API Keys et générez une nouvelle clé

## Configuration CLI

```bash
openclaw onboard --auth-choice kilocode-api-key
```

Ou définissez la variable d'environnement :

```bash
export KILOCODE_API_KEY="<your-kilocode-api-key>" # pragma: allowlist secret
```

## Extrait de configuration

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

## Modèle par défaut

Le model par défaut est `kilocode/kilo/auto`, un model de smart-routing appartenant au provider et géré par Kilo Gateway.

OpenClaw considère `kilocode/kilo/auto` comme la référence par défaut stable, mais ne publie pas de mappage tâche-vers-model-amont sourcé pour cette route.

## Modèles disponibles

OpenClaw découvre dynamiquement les modèles disponibles depuis le Kilo Gateway au démarrage. Utilisez `/models kilocode` pour voir la liste complète des modèles disponibles avec votre compte.

Tout modèle disponible sur la passerelle peut être utilisé avec le préfixe `kilocode/` :

```
kilocode/kilo/auto              (default - smart routing)
kilocode/anthropic/claude-sonnet-4
kilocode/openai/gpt-5.4
kilocode/google/gemini-3-pro-preview
...and many more
```

## Remarques

- Les références de modèle sont `kilocode/<model-id>` (par ex. `kilocode/anthropic/claude-sonnet-4`).
- Modèle par défaut : `kilocode/kilo/auto`
- URL de base : `https://api.kilo.ai/api/gateway/`
- Le catalogue de repli groupé inclut toujours `kilocode/kilo/auto` (`Kilo Auto`) avec `input: ["text", "image"]`, `reasoning: true`, `contextWindow: 1000000` et `maxTokens: 128000`
- Au démarrage, OpenClaw essaie `GET https://api.kilo.ai/api/gateway/models` et fusionne les modèles découverts avant le catalogue de repli statique
- Le routage amont exact derrière `kilocode/kilo/auto` est propriété de Kilo Gateway, et n'est pas codé en dur dans OpenClaw
- Kilo Gateway est documenté dans le code source comme compatible avec OpenRouter, il reste donc sur le chemin compatible avec OpenAI de style proxy plutôt que sur le façonnage des requêtes natif de OpenAI
- Les références Kilo basées sur Gemini restent sur le chemin proxy-Gemini, OpenClaw conserve donc la nettoyage de la signature de pensée de Gemini à cet endroit sans activer la validation de relecture native Gemini ou les réécritures d'amorçage.
- L'enveloppe de flux partagé de Kilo ajoute l'en-tête de l'application du provider et normalise les payloads de raisonnement proxy pour les références de modèles concrètes prises en charge. `kilocode/kilo/auto` et autres indicateurs non pris en charge par le raisonnement proxy ignorent cette injection de raisonnement.
- Pour plus d'options de model/provider, consultez [/concepts/model-providers](/en/concepts/model-providers).
- Kilo Gateway utilise un jeton Bearer avec votre clé API en arrière-plan.
