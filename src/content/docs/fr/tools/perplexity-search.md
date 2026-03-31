---
summary: "API de recherche Perplexity et compatibilité Sonar/OpenRouter pour web_search"
read_when:
  - You want to use Perplexity Search for web search
  - You need PERPLEXITY_API_KEY or OPENROUTER_API_KEY setup
title: "Recherche Perplexity"
---

# API de recherche Perplexity

OpenClaw prend en charge l'API de recherche Perplexity en tant que fournisseur `web_search`.
Elle renvoie des résultats structurés avec les champs `title`, `url` et `snippet`.

Pour assurer la compatibilité, OpenClaw prend également en charge les configurations Perplexity Sonar/OpenRouter existantes.
Si vous utilisez `OPENROUTER_API_KEY`, une clé `sk-or-...` dans `plugins.entries.perplexity.config.webSearch.apiKey`, ou définissez `plugins.entries.perplexity.config.webSearch.baseUrl` / `model`, le fournisseur bascule vers le chemin chat-completions et renvoie des réponses synthétisées par l'IA avec des citations au lieu des résultats structurés de l'API de recherche.

## Obtenir une clé API Perplexity

1. Créez un compte Perplexity sur [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api)
2. Générez une clé API dans le tableau de bord
3. Stockez la clé dans la configuration ou définissez `PERPLEXITY_API_KEY` dans l'environnement de la Gateway.

## Compatibilité OpenRouter

Si vous utilisiez déjà OpenRouter pour Perplexity Sonar, gardez `provider: "perplexity"` et définissez `OPENROUTER_API_KEY` dans l'environnement de la Gateway, ou stockez une clé `sk-or-...` dans `plugins.entries.perplexity.config.webSearch.apiKey`.

Contrôles de compatibilité optionnels :

- `plugins.entries.perplexity.config.webSearch.baseUrl`
- `plugins.entries.perplexity.config.webSearch.model`

## Exemples de configuration

### API de recherche Perplexity native

```json5
{
  plugins: {
    entries: {
      perplexity: {
        config: {
          webSearch: {
            apiKey: "pplx-...",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "perplexity",
      },
    },
  },
}
```

### Compatibilité OpenRouter / Sonar

```json5
{
  plugins: {
    entries: {
      perplexity: {
        config: {
          webSearch: {
            apiKey: "<openrouter-api-key>",
            baseUrl: "https://openrouter.ai/api/v1",
            model: "perplexity/sonar-pro",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "perplexity",
      },
    },
  },
}
```

## Où définir la clé

**Via la configuration :** exécutez `openclaw configure --section web`. Cela stocke la clé dans
`~/.openclaw/openclaw.json` sous `plugins.entries.perplexity.config.webSearch.apiKey`.
Ce champ accepte également les objets SecretRef.

**Via l'environnement :** définissez `PERPLEXITY_API_KEY` ou `OPENROUTER_API_KEY`
dans l'environnement de processus du Gateway. Pour une installation de passerelle, placez-le dans
`~/.openclaw/.env` (ou votre environnement de service). Voir [Variables d'environnement](/en/help/faq#env-vars-and-env-loading).

Si `provider: "perplexity"` est configuré et que le SecretRef de la clé Perplexity n'est pas résolu sans solution de repli d'environnement, le démarrage/rechargement échoue rapidement.

## Paramètres de l'outil

Ces paramètres s'appliquent au chemin de l'API native Perplexity Search API.

| Paramètre             | Description                                                           |
| --------------------- | --------------------------------------------------------------------- |
| `query`               | Requête de recherche (requis)                                         |
| `count`               | Nombre de résultats à renvoyer (1-10, par défaut : 5)                 |
| `country`             | Code pays ISO à 2 lettres (par exemple, "US", "DE")                   |
| `language`            | Code de langue ISO 639-1 (par exemple, "en", "de", "fr")              |
| `freshness`           | Filtre temporel : `day` (24h), `week`, `month` ou `year`              |
| `date_after`          | Uniquement les résultats publiés après cette date (YYYY-MM-DD)        |
| `date_before`         | Uniquement les résultats publiés avant cette date (YYYY-MM-DD)        |
| `domain_filter`       | Tableau de liste d'autorisation/liste de blocage de domaines (max 20) |
| `max_tokens`          | Budget total de contenu (par défaut : 25000, max : 1000000)           |
| `max_tokens_per_page` | Limite de jetons par page (par défaut : 2048)                         |

Pour le chemin de compatibilité Sonar/OpenRouter hérité, seuls `query` et `freshness` sont pris en charge.
Les filtres exclusifs à l'API de recherche API tels que `country`, `language`, `date_after`, `date_before`, `domain_filter`, `max_tokens` et `max_tokens_per_page` renvoient des erreurs explicites.

**Exemples :**

```javascript
// Country and language-specific search
await web_search({
  query: "renewable energy",
  country: "DE",
  language: "de",
});

// Recent results (past week)
await web_search({
  query: "AI news",
  freshness: "week",
});

// Date range search
await web_search({
  query: "AI developments",
  date_after: "2024-01-01",
  date_before: "2024-06-30",
});

// Domain filtering (allowlist)
await web_search({
  query: "climate research",
  domain_filter: ["nature.com", "science.org", ".edu"],
});

// Domain filtering (denylist - prefix with -)
await web_search({
  query: "product reviews",
  domain_filter: ["-reddit.com", "-pinterest.com"],
});

// More content extraction
await web_search({
  query: "detailed AI research",
  max_tokens: 50000,
  max_tokens_per_page: 4096,
});
```

### Règles de filtrage de domaine

- Maximum 20 domaines par filtre
- Impossible de mélanger la liste d'autorisation et la liste de blocage dans la même requête
- Utilisez le préfixe `-` pour les entrées de la liste de blocage (par exemple, `["-reddit.com"]`)

## Notes

- L'API Perplexity Search API renvoie des résultats de recherche Web structurés (`title`, `url`, `snippet`)
- OpenRouter ou les commutateurs explicites `plugins.entries.perplexity.config.webSearch.baseUrl` / `model` ramènent Perplexity aux complétés de chat Sonar pour compatibilité
- Les résultats sont mis en cache pendant 15 minutes par défaut (configurable via `cacheTtlMinutes`)

## Connexes

- [Aperçu de la recherche Web](/en/tools/web) -- tous les fournisseurs et la détection automatique
- [Documentation de l'Perplexity de recherche API](https://docs.perplexity.ai/docs/search/quickstart) -- documentation officielle de Perplexity
- [Recherche Brave](/en/tools/brave-search) -- résultats structurés avec des filtres de pays/langue
- [Recherche Exa](/en/tools/exa-search) -- recherche neurale avec extraction de contenu
