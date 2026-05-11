---
summary: "Recherche Web DuckDuckGo -- fournisseur de secours sans clé (expérimental, basé sur HTML)"
read_when:
  - You want a web search provider that requires no API key
  - You want to use DuckDuckGo for web_search
  - You need a zero-config search fallback
title: "DuckDuckGo search"
---

OpenClaw prend en charge DuckDuckGo en tant que provider **sans clé** `web_search`. Aucune clé API ni compte n'est requis.

<Warning>DuckDuckGo est une intégration **expérimentale, non officielle** qui récupère les résultats des pages de recherche non-JavaScript de DuckDuckGo — et non une API officielle. Attendez-vous à des pannes occasionnelles dues aux pages de défi pour bots ou aux modifications HTML.</Warning>

## Configuration

Aucune clé API nécessaire — définissez simplement DuckDuckGo comme votre provider :

<Steps>
  <Step title="Configure">```bash openclaw configure --section web # Select "duckduckgo" as the provider ```</Step>
</Steps>

## Config

```json5
{
  tools: {
    web: {
      search: {
        provider: "duckduckgo",
      },
    },
  },
}
```

Paramètres facultatifs au niveau du plugin pour la région et SafeSearch :

```json5
{
  plugins: {
    entries: {
      duckduckgo: {
        config: {
          webSearch: {
            region: "us-en", // DuckDuckGo region code
            safeSearch: "moderate", // "strict", "moderate", or "off"
          },
        },
      },
    },
  },
}
```

## Paramètres de l'outil

<ParamField path="query" type="string" required>
  Requête de recherche.
</ParamField>

<ParamField path="count" type="number" default="5">
  Résultats à renvoyer (1–10).
</ParamField>

<ParamField path="region" type="string">
  Code de région DuckDuckGo (par ex. `us-en`, `uk-en`, `de-de`).
</ParamField>

<ParamField path="safeSearch" type="'strict' | 'moderate' | 'off'" default="moderate">
  Niveau SafeSearch.
</ParamField>

La région et SafeSearch peuvent également être définis dans la configuration du plugin (voir ci-dessus) — les paramètres de l'outil remplacent les valeurs de configuration pour chaque requête.

## Notes

- **Pas de clé API** — fonctionne immédiatement, sans configuration
- **Expérimental** — récupère les résultats à partir des pages de recherche HTML non-JavaScript de DuckDuckGo, et non via une API ou un SDK officiel
- **Risque de défi pour bots** — DuckDuckGo peut servir des CAPTCHAs ou bloquer les requêtes en cas d'utilisation intensive ou automatisée
- **Analyse HTML** — les résultats dépendent de la structure de la page, qui peut changer sans préavis
- **Ordre de détection automatique** — DuckDuckGo est le premier repli sans clé (ordre 100) dans la détection automatique. Les providers soutenus par une API avec des clés configurées s'exécutent en premier, puis Ollama Web Search (ordre 110), puis SearXNG (ordre 200)
- **SafeSearch est réglé sur modéré par défaut** lorsqu'il n'est pas configuré

<Tip>Pour une utilisation en production, envisagez [Brave Search](/fr/tools/brave-search) (gratuit disponible) ou un autre provider soutenu par une API.</Tip>

## Connexes

- [Aperçu de la recherche Web](/fr/tools/web) -- tous les providers et la détection automatique
- [Brave Search](/fr/tools/brave-search) -- résultats structurés avec offre gratuite
- [Exa Search](/fr/tools/exa-search) -- recherche neurale avec extraction de contenu
