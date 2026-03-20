---
summary: "Recherche Firecrawl, scraping, et repli web_fetch"
read_when:
  - Vous souhaitez une extraction web soutenue par Firecrawl
  - Vous avez besoin d'une clé Firecrawl API
  - Vous souhaitez Firecrawl en tant que fournisseur web_search
  - Vous souhaitez une extraction anti-bot pour web_fetch
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

- Choisir Firecrawl lors de l'onboarding ou `openclaw configure --section web` active automatiquement le plugin Firecrawl groupé.
- `web_search` avec Firecrawl prend en charge `query` et `count`.
- Pour les contrôles spécifiques à Firecrawl comme `sources`, `categories`, ou le scraping de résultats, utilisez `firecrawl_search`.

## Configurer le scraping Firecrawl + le repli web_fetch

```json5
{
  plugins: {
    entries: {
      firecrawl: {
        enabled: true,
      },
    },
  },
  tools: {
    web: {
      fetch: {
        firecrawl: {
          apiKey: "FIRECRAWL_API_KEY_HERE",
          baseUrl: "https://api.firecrawl.dev",
          onlyMainContent: true,
          maxAgeMs: 172800000,
          timeoutSeconds: 60,
        },
      },
    },
  },
}
```

Notes :

- `firecrawl.enabled` par défaut est `true` sauf s'il est explicitement défini sur `false`.
- Les tentatives de repli Firecrawl ne s'exécutent que lorsqu'une clé API est disponible (`tools.web.fetch.firecrawl.apiKey` ou `FIRECRAWL_API_KEY`).
- `maxAgeMs` contrôle l'ancienneté maximale des résultats mis en cache (ms). La valeur par défaut est de 2 jours.

`firecrawl_scrape` réutilise les mêmes paramètres `tools.web.fetch.firecrawl.*` et variables d'environnement.

## Outils du plugin Firecrawl

### `firecrawl_search`

Utilisez ceci lorsque vous souhaitez des contrôles de recherche spécifiques à Firecrawl au lieu de `web_search` générique.

Paramètres principaux :

- `query`
- `count`
- `sources`
- `categories`
- `scrapeResults`
- `timeoutSeconds`

### `firecrawl_scrape`

Utilisez ceci pour les pages fortement basées sur JS ou protégées par des bots où un simple `web_fetch` est faible.

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
Si le proxy est omis, Firecrawl utilise par défaut `auto`. `auto` réessaie avec des proxies furtifs si une tentative de base échoue, ce qui peut utiliser plus de crédits
qu'un scraping basique uniquement.

## Comment `web_fetch` utilise Firecrawl

Ordre d'extraction `web_fetch` :

1. Lisibilité (local)
2. Firecrawl (si configuré)
3. Nettoyage HTML basique (dernier recours)

Voir [Outils Web](/fr/tools/web) pour la configuration complète de l'outil Web.

import en from "/components/footer/en.mdx";

<en />
