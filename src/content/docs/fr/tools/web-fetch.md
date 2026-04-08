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

Pour les sites avec beaucoup de JS ou les pages protégées par une connexion, utilisez le
[Web Browser](/en/tools/browser) à la place.

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
  <Step title="Récupération">Envoie un HTTP GET avec un User-Agent semblable à Chrome et l'en-tête `Accept-Language`. Bloque les noms d'hôte privés/internes et vérifie les redirections.</Step>
  <Step title="Extraction">Exécute Readability (extraction du contenu principal) sur la réponse HTML.</Step>
  <Step title="Fallback (optional)">Si Readability échoue et que Firecrawl est configuré, de nouvelles tentatives sont effectuées via l'Firecrawl API en mode de contournement des bots.</Step>
  <Step title="Cache">Les résultats sont mis en cache pendant 15 minutes (configurable) pour réduire les récupérations répétées de la même URL.</Step>
</Steps>

## Configuration

```json5
{
  tools: {
    web: {
      fetch: {
        enabled: true, // default: true
        provider: "firecrawl", // optional; omit for auto-detect
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

Si l'extraction Readability échoue, `web_fetch` peut revenir à
[Firecrawl](/en/tools/firecrawl) pour contourner les bots et améliorer l'extraction :

```json5
{
  tools: {
    web: {
      fetch: {
        provider: "firecrawl", // optional; omit for auto-detect from available credentials
      },
    },
  },
  plugins: {
    entries: {
      firecrawl: {
        enabled: true,
        config: {
          webFetch: {
            apiKey: "fc-...", // optional if FIRECRAWL_API_KEY is set
            baseUrl: "https://api.firecrawl.dev",
            onlyMainContent: true,
            maxAgeMs: 86400000, // cache duration (1 day)
            timeoutSeconds: 60,
          },
        },
      },
    },
  },
}
```

`plugins.entries.firecrawl.config.webFetch.apiKey` prend en charge les objets SecretRef.
L'ancienne configuration `tools.web.fetch.firecrawl.*` est automatiquement migrée par `openclaw doctor --fix`.

<Note>Si Firecrawl est activé et que son SecretRef n'est pas résolu sans de repli d'environnement `FIRECRAWL_API_KEY`, le démarrage de la passerelle échoue rapidement.</Note>

<Note>Les remplacements `baseUrl` de Firecrawl sont verrouillés : ils doivent utiliser `https://` et l'hôte officiel Firecrawl (`api.firecrawl.dev`).</Note>

Comportement actuel de l'exécution :

- `tools.web.fetch.provider` sélectionne explicitement le fournisseur de repli de récupération.
- Si `provider` est omis, OpenClaw détecte automatiquement le premier fournisseur
  de récupération web prêt parmi les identifiants disponibles. Aujourd'hui, le fournisseur inclus est Firecrawl.
- Si Readability est désactivé, `web_fetch` passe directement au repli du
  fournisseur sélectionné. Si aucun fournisseur n'est disponible, il échoue en mode fermé.

## Limites et sécurité

- `maxChars` est limité à `tools.web.fetch.maxCharsCap`
- Le corps de la réponse est plafonné à `maxResponseBytes` avant l'analyse ; les réponses
  trop volumineuses sont tronquées avec un avertissement
- Les noms d'hôte privés/internes sont bloqués
- Les redirections sont vérifiées et limitées par `maxRedirects`
- `web_fetch` est au mieux -- certains sites ont besoin du [Web Browser](/en/tools/browser)

## Profils d'outil

Si vous utilisez des profils d'outil ou des listes autorisées, ajoutez `web_fetch` ou `group:web` :

```json5
{
  tools: {
    allow: ["web_fetch"],
    // or: allow: ["group:web"]  (includes web_fetch, web_search, and x_search)
  },
}
```

## Connexes

- [Web Search](/en/tools/web) -- rechercher sur le web avec plusieurs fournisseurs
- [Web Browser](/en/tools/browser) -- automatisation complète du navigateur pour les sites avec beaucoup de JS
- [Firecrawl](/en/tools/firecrawl) -- outils de recherche et d'extraction Firecrawl
