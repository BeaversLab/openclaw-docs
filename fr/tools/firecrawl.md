---
summary: "Firecrawl secours pour web_fetch (anti-bot + extraction mise en cache)"
read_when:
  - You want Firecrawl-backed web extraction
  - You need a Firecrawl API key
  - You want anti-bot extraction for web_fetch
title: "Firecrawl"
---

# Firecrawl

OpenClaw peut utiliser **Firecrawl** comme extracteur de secours pour `web_fetch`. C'est un service d'extraction de contenu hébergé qui prend en charge la contournement des bots et la mise en cache, ce qui aide pour les sites lourds en JS ou les pages qui bloquent les récupérations HTTP simples.

## Obtenir une clé API

1. Créez un compte Firecrawl et générez une clé API.
2. Stockez-la dans la configuration ou définissez `FIRECRAWL_API_KEY` dans l'environnement de la passerelle.

## Configurer Firecrawl

```json5
{
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

- `firecrawl.enabled` est défini par défaut sur `true` sauf s'il est explicitement défini sur `false`.
- Les tentatives de secours Firecrawl ne s'exécutent que lorsqu'une clé API est disponible (`tools.web.fetch.firecrawl.apiKey` ou `FIRECRAWL_API_KEY`).
- `maxAgeMs` contrôle l'ancienneté possible des résultats mis en cache (ms). La valeur par défaut est de 2 jours.

## Furtivité / contournement des bots

Firecrawl expose un paramètre de **mode proxy** pour le contournement des bots (`basic`, `stealth` ou `auto`).
OpenClaw utilise toujours `proxy: "auto"` plus `storeInCache: true` pour les requêtes Firecrawl.
Si le proxy est omis, Firecrawl utilise par défaut `auto`. `auto` réessaie avec des proxies furtifs si une tentative de base échoue, ce qui peut utiliser plus de crédits que le scraping de base uniquement.

## Comment `web_fetch` utilise Firecrawl

Ordre d'extraction `web_fetch` :

1. Lisibilité (local)
2. Firecrawl (si configuré)
3. Nettoyage HTML de base (dernier recours)

Voir [Web tools](/fr/tools/web) pour la configuration complète de l'outil Web.

import fr from '/components/footer/fr.mdx';

<fr />
