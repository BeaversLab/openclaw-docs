---
summary: "API de recherche Perplexity et compatibilité Sonar/OpenRouter pour web_search"
read_when:
  - You want to use Perplexity Search for web search
  - You need PERPLEXITY_API_KEY or OPENROUTER_API_KEY setup
title: "Recherche Perplexity"
---

OpenClaw prend en charge l'API de recherche Perplexity en tant que fournisseur OpenClawPerplexityAPI`web_search`.
Elle retourne des résultats structurés avec les champs `title`, `url` et `snippet`.

Pour assurer la compatibilité, OpenClaw prend également en charge les configurations Perplexity Sonar/OpenRouter existantes.
Si vous utilisez OpenClawPerplexityOpenRouter`OPENROUTER_API_KEY`, une clé `sk-or-...` dans `plugins.entries.perplexity.config.webSearch.apiKey`, ou définissez `plugins.entries.perplexity.config.webSearch.baseUrl` / `model`API, le fournisseur bascule vers le chemin chat-completions et retourne des réponses synthétisées par l'IA avec des citations au lieu des résultats structurés de l'API de recherche.

## Obtenir une clé API Perplexity

1. Créez un compte Perplexity sur [perplexity.ai/settings/api](Perplexityhttps://www.perplexity.ai/settings/api)
2. Générez une clé API dans le tableau de bord
3. Stockez la clé dans la configuration ou définissez `PERPLEXITY_API_KEY`Gateway dans l'environnement de la passerelle.

## Compatibilité OpenRouter

Si vous utilisiez déjà OpenRouter pour Perplexity Sonar, conservez OpenRouterPerplexity`provider: "perplexity"` et définissez `OPENROUTER_API_KEY`Gateway dans l'environnement de la passerelle, ou stockez une clé `sk-or-...` dans `plugins.entries.perplexity.config.webSearch.apiKey`.

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

**Via la configuration :** exécutez `openclaw configure --section web`. Elle stocke la clé dans
`~/.openclaw/openclaw.json` sous `plugins.entries.perplexity.config.webSearch.apiKey`.
Ce champ accepte également les objets SecretRef.

**Via environment :** définissez `PERPLEXITY_API_KEY` ou `OPENROUTER_API_KEY`
dans l'environnement du processus Gateway. Pour une installation de passerelle, placez-le dans
`~/.openclaw/.env` (ou votre environnement de service). Voir [Env vars](/fr/help/faq#env-vars-and-env-loading).

Si `provider: "perplexity"` est configuré et que le SecretRef de la clé Perplexity n'est pas résolu sans repli vers l'environnement, le démarrage/rechargement échoue rapidement.

## Paramètres de l'outil

Ces paramètres s'appliquent au chemin de l'API de recherche PerplexityAPI native.

<ParamField path="query" type="string" required>
  Requête de recherche.
</ParamField>

<ParamField path="count" type="number" default="5">
  Nombre de résultats à renvoyer (1-10).
</ParamField>

<ParamField path="country" type="string">
  Code pays ISO à 2 lettres (ex. `US`, `DE`).
</ParamField>

<ParamField path="language" type="string">
  Code de langue ISO 639-1 (ex. `en`, `de`, `fr`).
</ParamField>

<ParamField path="freshness" type="'day' | 'week' | 'month' | 'year'">
  Filtre temporel - `day` correspond à 24 heures.
</ParamField>

<ParamField path="date_after" type="string">
  Uniquement les résultats publiés après cette date (`YYYY-MM-DD`).
</ParamField>

<ParamField path="date_before" type="string">
  Uniquement les résultats publiés avant cette date (`YYYY-MM-DD`).
</ParamField>

<ParamField path="domain_filter" type="string[]">
  Tableau de liste d'autorisation/liste de blocage de domaines (max 20).
</ParamField>

<ParamField path="max_tokens" type="number" default="25000">
  Budget total de contenu (max 1000000).
</ParamField>

<ParamField path="max_tokens_per_page" type="number" default="2048">
  Limite de jetons par page.
</ParamField>

Pour le chemin de compatibilité hérité Sonar/OpenRouter :

- `query`, `count` et `freshness` sont acceptés
- `count` n'y sert qu'à la compatibilité ; la réponse est toujours une réponse synthétisée avec citations plutôt qu'une liste de N résultats
- Les filtres exclusifs à l'API de recherche tels que `country`, `language`, `date_after`, `date_before`, `domain_filter`, `max_tokens` et `max_tokens_per_page` renvoient des erreurs explicites

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

- L'Perplexity de recherche API renvoie des résultats de recherche web structurés (`title`, `url`, `snippet`)
- OpenRouter ou les commutateurs explicites `plugins.entries.perplexity.config.webSearch.baseUrl` / `model` ramènent Perplexity aux compléments de chat Sonar pour la compatibilité
- La compatibilité Sonar/OpenRouter renvoie une réponse synthétisée avec citations, et non des lignes de résultats structurés
- Les résultats sont mis en cache pendant 15 minutes par défaut (configurable via `cacheTtlMinutes`)

## Connexes

<CardGroup cols={2}>
  <Card title="Aperçu de la recherche web" href="/fr/tools/web" icon="globe">
    Tous les fournisseurs et les règles de détection automatique.
  </Card>
  <Card title="Recherche Brave" href="/fr/tools/brave-search" icon="shield">
    Résultats structurés avec filtres de pays et de langue.
  </Card>
  <Card title="Exa search" href="/fr/tools/exa-search" icon="magnifying-glass">
    Recherche neurale avec extraction de contenu.
  </Card>
  <Card title="Perplexity Search API docs" href="https://docs.perplexity.ai/docs/search/quickstart" icon="arrow-up-right-from-square">
    Guide de démarrage rapide et référence de l'Perplexity Search API officielle.
  </Card>
</CardGroup>
