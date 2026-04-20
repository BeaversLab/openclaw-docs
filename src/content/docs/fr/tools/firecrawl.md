---
summary: "Recherche, scraping Firecrawl et repli web_fetch"
read_when:
  - You want Firecrawl-backed web extraction
  - You need a Firecrawl API key
  - You want Firecrawl as a web_search provider
  - You want anti-bot extraction for web_fetch
title: "Firecrawl"
---

# Firecrawl

OpenClaw peut utiliser **Firecrawl** de trois manières :

- en tant que fournisseur `web_search`
- en tant qu'outils de plugin explicites : `firecrawl_search` et `firecrawl_scrape`
- en tant qu'extracteur de repli pour `web_fetch`

C'est un service d'extraction/recherche hébergé qui prend en charge la contournement des bots et la mise en cache,
ce qui aide pour les sites lourds en JS ou les pages qui bloquent les récupérations HTTP simples.

## Obtenir une clé API

1. Créez un compte Firecrawl et générez une clé API.
2. Stockez-la dans la configuration ou définissez `FIRECRAWL_API_KEY` dans l'environnement de la passerelle.

## Configurer la recherche Firecrawl

```json5
{
  tools: {
    web: {
      search: {
        provider: "firecrawl",
      },
    },
  },
  plugins: {
    entries: {
      firecrawl: {
        enabled: true,
        config: {
          webSearch: {
            apiKey: "FIRECRAWL_API_KEY_HERE",
            baseUrl: "https://api.firecrawl.dev",
          },
        },
      },
    },
  },
}
```

Notes :

- Choisir Firecrawl lors de l'intégration ou `openclaw configure --section web` active automatiquement le plugin Firecrawl inclus.
- `web_search` avec Firecrawl prend en charge `query` et `count`.
- Pour les contrôles spécifiques à Firecrawl comme `sources`, `categories`, ou le scraping de résultats, utilisez `firecrawl_search`.
- Les remplacements de `baseUrl` doivent rester sur `https://api.firecrawl.dev`.
- `FIRECRAWL_BASE_URL` est la valeur de repli d'environnement partagée pour les URL de base de recherche et de scraping Firecrawl.

## Configurer le scraping Firecrawl + le repli web_fetch

```json5
{
  plugins: {
    entries: {
      firecrawl: {
        enabled: true,
        config: {
          webFetch: {
            apiKey: "FIRECRAWL_API_KEY_HERE",
            baseUrl: "https://api.firecrawl.dev",
            onlyMainContent: true,
            maxAgeMs: 172800000,
            timeoutSeconds: 60,
          },
        },
      },
    },
  },
}
```

Notes :

- Les tentatives de repli Firecrawl ne s'exécutent que lorsqu'une clé API est disponible (`plugins.entries.firecrawl.config.webFetch.apiKey` ou `FIRECRAWL_API_KEY`).
- `maxAgeMs` contrôle l'ancienneté maximale des résultats mis en cache (ms). La valeur par défaut est 2 jours.
- L'ancienne configuration `tools.web.fetch.firecrawl.*` est automatiquement migrée par `openclaw doctor --fix`.
- Les remplacements d'URL de base/scraping Firecrawl sont restreints à `https://api.firecrawl.dev`.

`firecrawl_scrape` réutilise les mêmes paramètres `plugins.entries.firecrawl.config.webFetch.*` et variables d'environnement.

## Outils du plugin Firecrawl

### `firecrawl_search`

Utilisez ceci lorsque vous souhaitez des contrôles de recherche spécifiques à Firecrawl au lieu de `web_search` génériques.

Paramètres principaux :

- `query`
- `count`
- `sources`
- `categories`
- `scrapeResults`
- `timeoutSeconds`

### `firecrawl_scrape`

Utilisez ceci pour les pages lourdes en JS ou protégées par des bots où le simple `web_fetch` est faible.

Paramètres principaux :

- `url`
- `extractMode`
- `maxChars`
- `onlyMainContent`
- `maxAgeMs`
- `proxy`
- `storeInCache`
- `timeoutSeconds`

## Furtivité / contournement de bots

Firecrawl expose un paramètre de **mode proxy** pour le contournement des bots (`basic`, `stealth` ou `auto`).
OpenClaw utilise toujours `proxy: "auto"` plus `storeInCache: true` pour les requêtes Firecrawl.
Si le proxy est omis, Firecrawl utilise par défaut `auto`. `auto` réessaie avec des proxys furtifs si une tentative de base échoue, ce qui peut utiliser plus de crédits
que le scraping basique uniquement.

## Comment `web_fetch` utilise Firecrawl

`web_fetch` ordre d'extraction :

1. Lisibilité (locale)
2. Firecrawl (si sélectionné ou détecté automatiquement comme le secours actif de web-fetch)
3. Nettoyage HTML de base (dernier recours)

Le bouton de sélection est `tools.web.fetch.provider`. Si vous l'omettez, OpenClaw
détecte automatiquement le premier provider web-fetch prêt parmi les informations d'identification disponibles.
Aujourd'hui, le provider inclus est Firecrawl.

## Connexes

- [Aperçu de la recherche Web](/fr/tools/web) -- tous les providers et détection automatique
- [Récupération Web](/fr/tools/web-fetch) -- outil web_fetch avec secours Firecrawl
- [Tavily](/fr/tools/tavily) -- outils de recherche et d'extraction
