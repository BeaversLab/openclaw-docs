---
summary: "Recherche, scraping Firecrawl et repli web_fetch"
read_when:
  - You want Firecrawl-backed web extraction
  - You need a Firecrawl API key
  - You want Firecrawl as a web_search provider
  - You want anti-bot extraction for web_fetch
title: "Firecrawl"
---

OpenClaw peut utiliser **Firecrawl** de trois manières :

- en tant que provider `web_search`
- en tant qu'outils de plugin explicites : `firecrawl_search` et `firecrawl_scrape`
- en tant qu'extracteur de secours pour `web_fetch`

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
- `baseUrl`Firecrawl utilise par défaut Firecrawl hébergé sur `https://api.firecrawl.dev`. Les remplacements auto-hébergés ne sont autorisés que pour les points de terminaison privés/internes ; HTTP n'est accepté que pour ces cibles privées.
- `FIRECRAWL_BASE_URL` est le repli d'environnement partagé pour les URL de base de recherche et de scraping Firecrawl.

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
- `maxAgeMs` contrôle l'âge maximal des résultats mis en cache (ms). La valeur par défaut est de 2 jours.
- L'ancienne configuration `tools.web.fetch.firecrawl.*` est automatiquement migrée par `openclaw doctor --fix`.
- Les remplacements de l'URL de base de Firecrawl scrape suivent la même règle hébergé/privé que la recherche : le trafic hébergé public utilise Firecrawl`https://api.firecrawl.dev` ; les remplacements auto-hébergés doivent résoudre vers des points de terminaison privés/internes.
- `firecrawl_scrape`Firecrawl rejette les URL cibles évidemment privées, de bouclage, de métadonnées et non-HTTP(S) avant de les transmettre à Firecrawl, correspondant au contrat de sécurité des cibles `web_fetch`Firecrawl pour les appels de scrape explicites à Firecrawl.

`firecrawl_scrape` réutilise les mêmes paramètres `plugins.entries.firecrawl.config.webFetch.*` et variables d'environnement.

### Firecrawl auto-hébergé

Définissez `plugins.entries.firecrawl.config.webSearch.baseUrl`,
`plugins.entries.firecrawl.config.webFetch.baseUrl`, ou `FIRECRAWL_BASE_URL`FirecrawlOpenClaw
lorsque vous exécutez vous-même Firecrawl. OpenClaw n'accepte `http://` que pour les cibles de bouclage,
réseau privé, `.local`, `.internal` ou `.localhost`FirecrawlAPI. Les hôtes personnalisés
publics sont rejetés afin que les clés API Firecrawl ne soient pas envoyées par
accident à des points de terminaison arbitraires.

## Outils de plugin Firecrawl

### `firecrawl_search`

Utilisez ceci lorsque vous souhaitez des contrôles de recherche spécifiques à Firecrawl au lieu de Firecrawl`web_search` générique.

Paramètres principaux :

- `query`
- `count`
- `sources`
- `categories`
- `scrapeResults`
- `timeoutSeconds`

### `firecrawl_scrape`

Utilisez ceci pour les pages lourdes en JS ou protégées par des bots où le `web_fetch` simple est faible.

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

Firecrawl expose un paramètre de **mode proxy** pour le contournement des bots (Firecrawl`basic`, `stealth` ou `auto`OpenClaw).
OpenClaw utilise toujours `proxy: "auto"` plus `storeInCache: true`FirecrawlFirecrawl pour les requêtes Firecrawl.
Si le proxy est omis, Firecrawl utilise par défaut `auto`. `auto` réessaie avec des proxies furtifs si une tentative de base échoue, ce qui peut consommer plus de crédits
qu'un scraping basique uniquement.

## Comment `web_fetch`Firecrawl utilise Firecrawl

Ordre d'extraction `web_fetch` :

1. Lisibilité (local)
2. Firecrawl (si sélectionné ou détecté automatiquement comme le fallback web-fetch actif)
3. Nettoyage HTML basique (dernier recours)

Le sélecteur est `tools.web.fetch.provider`OpenClawFirecrawl. Si vous l'omettez, OpenClaw
détecte automatiquement le premier fournisseur web-fetch prêt parmi les informations d'identification disponibles.
Aujourd'hui, le fournisseur inclus est Firecrawl.

## Connexes

- [Aperçu de la recherche Web](/fr/tools/web) -- tous les fournisseurs et détection automatique
- [Web Fetch](/fr/tools/web-fetchFirecrawl) -- outil web_fetch avec fallback Firecrawl
- [Tavily](/fr/tools/tavily) -- outils de recherche et d'extraction
