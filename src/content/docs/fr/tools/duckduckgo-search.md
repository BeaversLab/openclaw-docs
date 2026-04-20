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
  <Step title="Configurer">```bash openclaw configure --section web # Select "duckduckgo" as the provider ```</Step>
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

Paramètres optionnels au niveau du plugin pour la région et SafeSearch :

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

| Paramètre    | Description                                                 |
| ------------ | ----------------------------------------------------------- |
| `query`      | Requête de recherche (requis)                               |
| `count`      | Résultats à renvoyer (1-10, défaut : 5)                     |
| `region`     | Code de région DuckDuckGo (ex. `us-en`, `uk-en`, `de-de`)   |
| `safeSearch` | Niveau SafeSearch : `strict`, `moderate` (défaut), ou `off` |

La région et SafeSearch peuvent également être définis dans la configuration du plugin (voir ci-dessus) — les paramètres de l'outil remplacent les valeurs de configuration pour chaque requête.

## Notes

- **Pas de clé API** — fonctionne hors de la boîte, configuration zéro
- **Expérimental** — récupère les résultats des pages de recherche HTML non-JavaScript de DuckDuckGo, et non une API officielle ou un SDK
- **Risque de défi bot** — DuckDuckGo peut afficher des CAPTCHAs ou bloquer les requêtes en cas d'utilisation intensive ou automatisée
- **Analyse HTML** — les résultats dépendent de la structure de la page, qui peut changer sans préavis
- **Ordre de détection automatique** — DuckDuckGo est le premier de secours sans clé (ordre 100) dans la détection automatique. Les providers soutenus par une API avec des clés configurées s'exécutent en premier, puis Ollama Web Search (ordre 110), puis SearXNG (ordre 200)
- **SafeSearch est modéré par défaut** lorsqu'il n'est pas configuré

<Tip>Pour une utilisation en production, envisagez [Recherche Brave](/fr/tools/brave-search) (gratuit disponible) ou un autre provider soutenu par une API.</Tip>

## Connexes

- [Aperçu de la recherche Web](/fr/tools/web) -- tous les providers et la détection automatique
- [Recherche Brave](/fr/tools/brave-search) -- résultats structurés avec offre gratuite
- [Recherche Exa](/fr/tools/exa-search) -- recherche neuronale avec extraction de contenu
