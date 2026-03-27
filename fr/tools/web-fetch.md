---
summary: "outil web_fetch -- récupération HTTP avec extraction de contenu lisible"
read_when:
  - You want to fetch a URL and extract readable content
  - You need to configure web_fetch or its Firecrawl fallback
  - You want to understand web_fetch limits and caching
title: "Récupération Web"
sidebarTitle: "Récupération Web"
---

# Récupération Web

L'outil `web_fetch` effectue une requête HTTP GET simple et extrait le contenu lisible
(HTML en markdown ou texte). Il n'exécute **pas** JavaScript.

Pour les sites utilisant beaucoup de JS ou les pages protégées par connexion, utilisez
[Web Browser](/fr/tools/browser) à la place.

## Démarrage rapide

`web_fetch` est **activé par défaut** -- aucune configuration requise. L'agent peut
l'appeler immédiatement :

```javascript
await web_fetch({ url: "https://example.com/article" });
```

## Paramètres de l'outil

| Paramètre     | Type     | Description                                     |
| ------------- | -------- | ----------------------------------------------- |
| `url`         | `string` | URL à récupérer (requis, http/https uniquement) |
| `extractMode` | `string` | `"markdown"` (par défaut) ou `"text"`           |
| `maxChars`    | `number` | Tronquer la sortie à ce nombre de caractères    |

## Fonctionnement

<Steps>
  <Step title="Récupérer">
    Envoie un HTTP GET avec un User-Agent de type Chrome et l'en-tête `Accept-Language`. Bloque les
    noms d'hôte privés/internes et vérifie les redirections.
  </Step>
  <Step title="Extraire">
    Exécute Readability (extraction du contenu principal) sur la réponse HTML.
  </Step>
  <Step title="Secours (optionnel)">
    Si Readabilité échoue et que Firecrawl est configuré, réessaie via l'Firecrawl API avec le mode
    de contournement de bot.
  </Step>
  <Step title="Cache">
    Les résultats sont mis en cache pendant 15 minutes (configurable) pour réduire les récupérations
    répétées de la même URL.
  </Step>
</Steps>

## Configuration

```json5
{
  tools: {
    web: {
      fetch: {
        enabled: true, // default: true
        maxChars: 50000, // max output chars
        maxCharsCap: 50000, // hard cap for maxChars param
        maxResponseBytes: 2000000, // max download size before truncation
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
        maxRedirects: 3,
        readability: true, // use Readability extraction
        userAgent: "Mozilla/5.0 ...", // override User-Agent
      },
    },
  },
}
```

## Firecrawl de secours

Si l'extraction par Readabilité échoue, `web_fetch` peut revenir à
[Firecrawl](/fr/tools/firecrawl) pour le contournement de bot et une meilleure extraction :

```json5
{
  tools: {
    web: {
      fetch: {
        firecrawl: {
          enabled: true,
          apiKey: "fc-...", // optional if FIRECRAWL_API_KEY is set
          baseUrl: "https://api.firecrawl.dev",
          onlyMainContent: true,
          maxAgeMs: 86400000, // cache duration (1 day)
          timeoutSeconds: 60,
        },
      },
    },
  },
}
```

`tools.web.fetch.firecrawl.apiKey` prend en charge les objets SecretRef.

<Note>
  Si Firecrawl est activé et que son SecretRef n'est pas résolu sans aucune valeur de repli
  (fallback) d'env `FIRECRAWL_API_KEY`, le démarrage de la passerelle échoue rapidement.
</Note>

## Limites et sécurité

- `maxChars` est limité à `tools.web.fetch.maxCharsCap`
- Le corps de la réponse est plafonné à `maxResponseBytes` avant l'analyse ; les réponses
  trop volumineuses sont tronquées avec un avertissement
- Les noms d'hôte privés/internes sont bloqués
- Les redirections sont vérifiées et limitées par `maxRedirects`
- `web_fetch` est au mieux -- certains sites ont besoin du [Web Browser](/fr/tools/browser)

## Profils d'outil

Si vous utilisez des profils d'outil ou des listes autorisées (allowlists), ajoutez `web_fetch` ou `group:web` :

```json5
{
  tools: {
    allow: ["web_fetch"],
    // or: allow: ["group:web"]  (includes both web_fetch and web_search)
  },
}
```

## Connexes

- [Web Search](/fr/tools/web) -- rechercher sur le web avec plusieurs fournisseurs
- [Web Browser](/fr/tools/browser) -- automatisation complète du navigateur pour les sites utilisant beaucoup de JS
- [Firecrawl](/fr/tools/firecrawl) -- outils de recherche et de scraping Firecrawl

import fr from "/components/footer/fr.mdx";

<fr />
