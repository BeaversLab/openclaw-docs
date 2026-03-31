---
summary: "Recherche Web DuckDuckGo -- fournisseur de secours sans clé (expérimental, basé sur HTML)"
read_when:
  - You want a web search provider that requires no API key
  - You want to use DuckDuckGo for web_search
  - You need a zero-config search fallback
title: "Recherche DuckDuckGo"
---

# Recherche DuckDuckGo

OpenClaw prend en charge DuckDuckGo en tant que fournisseur `web_search` **sans clé**. Aucune clé OpenClaw
ni compte n'est requis.

<Warning>DuckDuckGo est une intégration **expérimentale et non officielle** qui extrait les résultats des pages de recherche non-JavaScript de DuckDuckGo — et non de l'API officielle. Attendez-vous-vous à des pannes occasionnelles dues aux pages de défi pour bots ou aux modifications HTML.</Warning>

## Configuration

Aucune clé API nécessaire — définissez simplement DuckDuckGo comme votre fournisseur :

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

| Paramètre    | Description                                                    |
| ------------ | -------------------------------------------------------------- |
| `query`      | Requête de recherche (requis)                                  |
| `count`      | Résultats à renvoyer (1-10, par défaut : 5)                    |
| `region`     | Code de région DuckDuckGo (ex. `us-en`, `uk-en`, `de-de`)      |
| `safeSearch` | Niveau SafeSearch : `strict`, `moderate` (par défaut) ou `off` |

La région et SafeSearch peuvent également être définis dans la configuration du plugin (voir ci-dessus) — les
paramètres de l'outil remplacent les valeurs de configuration par requête.

## Notes

- **Pas de clé API** — fonctionne hors de la boîte, zéro configuration
- **Expérimental** — récupère les résultats des pages de recherche HTML
  non-JavaScript de DuckDuckGo, et non d'une API officielle ou d'un SDK
- **Risque de défi pour les bots** — DuckDuckGo peut servir des CAPTCHAs ou bloquer les requêtes
  en cas d'utilisation intensive ou automatisée
- **Analyse HTML** — les résultats dépendent de la structure de la page, qui peut changer sans
  préavis
- **Ordre de détection automatique** — DuckDuckGo est vérifié en dernier (ordre 100) lors de
  la détection automatique, tout fournisseur API avec une clé est donc prioritaire
- **SafeSearch est modéré par défaut** lorsqu'il n'est pas configuré

<Tip>Pour une utilisation en production, envisagez [Brave Search](/en/tools/brave-search) (version gratuite disponible) ou un autre provider supporté par une API.</Tip>

## Connexes

- [Aperçu de la recherche Web](/en/tools/web) -- tous les fournisseurs et la détection automatique
- [Recherche Brave](/en/tools/brave-search) -- résultats structurés avec gratuit disponible
- [Exa Search](/en/tools/exa-search) -- recherche neurale avec extraction de contenu
