---
summary: "Outils de recherche et d'extraction Tavily"
read_when:
  - You want Tavily-backed web search
  - You need a Tavily API key
  - You want Tavily as a web_search provider
  - You want content extraction from URLs
title: "Tavily"
---

# Tavily

OpenClaw peut utiliser **Tavily** de deux manières :

- en tant que provider `web_search`
- en tant qu'outils de plugin explicites : `tavily_search` et `tavily_extract`

Tavily est une API de recherche API conçue pour les applications IA, renvoyant des résultats structurés
optimisés pour la consommation par LLM. Elle prend en charge une profondeur de recherche configurable, le filtrage
par sujet, les filtres de domaine, les résumés de réponses générés par l'IA et l'extraction de contenu
à partir d'URL (y compris les pages rendues en JavaScript).

## Obtenir une clé API

1. Créez un compte Tavily sur [tavily.com](https://tavily.com/).
2. Générez une clé API dans le tableau de bord.
3. Stockez-la dans la configuration ou définissez `TAVILY_API_KEY` dans l'environnement de la passerelle.

## Configurer la recherche Tavily

```json5
{
  plugins: {
    entries: {
      tavily: {
        enabled: true,
        config: {
          webSearch: {
            apiKey: "tvly-...", // optional if TAVILY_API_KEY is set
            baseUrl: "https://api.tavily.com",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "tavily",
      },
    },
  },
}
```

Notes :

- Choisir Tavily lors de l'onboarding ou `openclaw configure --section web` active
  automatiquement le plugin Tavily inclus.
- Stockez la configuration Tavily sous `plugins.entries.tavily.config.webSearch.*`.
- `web_search` avec Tavily prend en charge `query` et `count` (jusqu'à 20 résultats).
- Pour les contrôles spécifiques à Tavily comme `search_depth`, `topic`, `include_answer`,
  ou les filtres de domaine, utilisez `tavily_search`.

## Outils de plugin Tavily

### `tavily_search`

Utilisez ceci lorsque vous souhaitez des contrôles de recherche spécifiques à Tavily au lieu de `web_search`
générique.

| Paramètre         | Description                                                                    |
| ----------------- | ------------------------------------------------------------------------------ |
| `query`           | Chaîne de requête de recherche (garder sous 400 caractères)                    |
| `search_depth`    | `basic` (par défaut, équilibré) ou `advanced` (pertinence maximale, plus lent) |
| `topic`           | `general` (par défaut), `news` (mises à jour en temps réel), ou `finance`      |
| `max_results`     | Nombre de résultats, 1-20 (par défaut : 5)                                     |
| `include_answer`  | Inclure un résumé de réponse généré par l'IA (par défaut : false)              |
| `time_range`      | Filtrer par date : `day`, `week`, `month` ou `year`                            |
| `include_domains` | Tableau de domaines pour restreindre les résultats                             |
| `exclude_domains` | Tableau de domaines à exclure des résultats                                    |

**Profondeur de recherche :**

| Profondeur | Vitesse     | Pertinence     | Idéal pour                              |
| ---------- | ----------- | -------------- | --------------------------------------- |
| `basic`    | Plus rapide | Élevée         | Requêtes à usage général (par défaut)   |
| `advanced` | Plus lent   | La plus élevée | Précision, faits spécifiques, recherche |

### `tavily_extract`

Utilisez ceci pour extraire du contenu propre d'une ou plusieurs URL. Gère
les pages rendues par JavaScript et prend en charge le découpage ciblé par requête pour une extraction
précise.

| Paramètre           | Description                                                               |
| ------------------- | ------------------------------------------------------------------------- |
| `urls`              | Tableau d'URL à extraire (1-20 par requête)                               |
| `query`             | Réorganiser les extraits par pertinence pour cette requête                |
| `extract_depth`     | `basic` (par défaut, rapide) ou `advanced` (pour les pages lourdes en JS) |
| `chunks_per_source` | Extraits par URL, 1-5 (nécessite `query`)                                 |
| `include_images`    | Inclure les URL d'images dans les résultats (par défaut : false)          |

**Profondeur d'extraction :**

| Profondeur | Quand utiliser                                  |
| ---------- | ----------------------------------------------- |
| `basic`    | Pages simples - essayez ceci d'abord            |
| `advanced` | SPA rendues par JS, contenu dynamique, tableaux |

Conseils :

- Maximum 20 URL par requête. Regroupez les listes plus importantes en plusieurs appels.
- Utilisez `query` + `chunks_per_source` pour obtenir uniquement le contenu pertinent au lieu des pages complètes.
- Essayez d'abord `basic` ; revenez à `advanced` si le contenu est manquant ou incomplet.

## Choisir le bon outil

| Besoin                                        | Outil            |
| --------------------------------------------- | ---------------- |
| Recherche Web rapide, pas d'options spéciales | `web_search`     |
| Recherche avec profondeur, sujet, réponses IA | `tavily_search`  |
| Extraire le contenu d'URL spécifiques         | `tavily_extract` |

## Connexes

- [Vue d'ensemble de la recherche Web](/fr/tools/web) -- tous les fournisseurs et détection automatique
- [Firecrawl](/fr/tools/firecrawl) -- recherche + scraping avec extraction de contenu
- [Recherche Exa](/fr/tools/exa-search) -- recherche neuronale avec extraction de contenu
