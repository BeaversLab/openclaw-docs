---
title: "Recherche Web"
sidebarTitle: "Recherche Web"
summary: "web_search, x_search et web_fetch -- rechercher le web, rechercher des publications X ou récupérer le contenu de la page"
read_when:
  - You want to enable or configure web_search
  - You want to enable or configure x_search
  - You need to choose a search provider
  - You want to understand auto-detection and provider fallback
---

# Recherche Web

L'outil `web_search` recherche sur le web en utilisant votre provider configuré et retourne les résultats. Les résultats sont mis en cache par requête pendant 15 minutes (configurable).

OpenClaw comprend également `x_search` pour les billets X (anciennement Twitter) et
`web_fetch` pour la récupération d'URL légère. À ce stade, `web_fetch` reste
local tandis que `web_search` et `x_search` peuvent utiliser xAI Responses en arrière-plan.

<Info>`web_search` est un outil HTTP léger, et non une automatisation de navigateur. Pour les sites utilisant beaucoup de JS ou les connexions, utilisez le [Navigateur Web](/en/tools/browser). Pour récupérer une URL spécifique, utilisez [Web Fetch](/en/tools/web-fetch).</Info>

## Quick start

<Steps>
  <Step title="Obtenir une clé API">
    Choisissez un fournisseur et obtenez une clé API. Consultez les pages des fournisseurs ci-dessous pour
    les liens d'inscription.
  </Step>
  <Step title="Configurer">
    ```bash
    openclaw configure --section web
    ```
    Cela stocke la clé et définit le provider. Vous pouvez également définir une env var
    (ex. `BRAVE_API_KEY`) et ignorer cette étape.
  </Step>
  <Step title="Utilisez-le">
    L'agent peut maintenant appeler `web_search` :

    ```javascript
    await web_search({ query: "OpenClaw plugin SDK" });
    ```

    Pour les posts X, utilisez :

    ```javascript
    await x_search({ query: "dinner recipes" });
    ```

  </Step>
</Steps>

## Choisir un provider

<CardGroup cols={2}>
  <Card title="Recherche Brave" icon="shield" href="/en/tools/brave-search">
    Résultats structurés avec extraits. Prend en charge le mode `llm-context`, les filtres de pays/langue. Offre gratuite disponible.
  </Card>
  <Card title="DuckDuckGo" icon="bird" href="/en/tools/duckduckgo-search">
    Solution de repli sans clé. Aucune clé API requise. Intégration non officielle basée sur HTML.
  </Card>
  <Card title="Exa" icon="brain" href="/en/tools/exa-search">
    Recherche neurale + par mots-clés avec extraction de contenu (points forts, texte, résumés).
  </Card>
  <Card title="Firecrawl" icon="flame" href="/en/tools/firecrawl">
    Résultats structurés. Fonctionne mieux avec `firecrawl_search` et `firecrawl_scrape` pour une extraction approfondie.
  </Card>
  <Card title="Gemini" icon="sparkles" href="/en/tools/gemini-search">
    Réponses synthétisées par l'IA avec citations via le fondement de la recherche Google.
  </Card>
  <Card title="Grok" icon="zap" href="/en/tools/grok-search">
    Réponses synthétisées par l'IA avec citations via le référencement web xAI.
  </Card>
  <Card title="Kimi" icon="moon" href="/en/tools/kimi-search">
    Réponses synthétisées par l'IA avec citations via la recherche web Moonshot.
  </Card>
  <Card title="Perplexity" icon="search" href="/en/tools/perplexity-search">
    Résultats structurés avec des contrôles d'extraction de contenu et un filtrage de domaine.
  </Card>
  <Card title="Tavily" icon="globe" href="/en/tools/tavily">
    Résultats structurés avec profondeur de recherche, filtrage par sujet et `tavily_extract` pour l'extraction d'URL.
  </Card>
</CardGroup>

### Comparaison des fournisseurs

| Fournisseur                               | Style de résultat               | Filtres                                                | Clé API                                     |
| ----------------------------------------- | ------------------------------- | ------------------------------------------------------ | ------------------------------------------- |
| [Brave](/en/tools/brave-search)           | Extraits structurés             | Pays, langue, heure, mode `llm-context`                | `BRAVE_API_KEY`                             |
| [DuckDuckGo](/en/tools/duckduckgo-search) | Extraits structurés             | --                                                     | Aucun (sans clé)                            |
| [Exa](/en/tools/exa-search)               | Structuré + extrait             | Mode neuronal/par mot-clé, date, extraction de contenu | `EXA_API_KEY`                               |
| [Firecrawl](/en/tools/firecrawl)          | Extraits structurés             | Via `firecrawl_search` tool                            | `FIRECRAWL_API_KEY`                         |
| [Gemini](/en/tools/gemini-search)         | Synthétisé par l'IA + citations | --                                                     | `GEMINI_API_KEY`                            |
| [Grok](/en/tools/grok-search)             | IA synthétisée + citations      | --                                                     | `XAI_API_KEY`                               |
| [Kimi](/en/tools/kimi-search)             | Synthèse par IA + citations     | --                                                     | `KIMI_API_KEY` / `MOONSHOT_API_KEY`         |
| [Perplexity](/en/tools/perplexity-search) | Extraits structurés             | Pays, langue, heure, domaines, limites de contenu      | `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` |
| [Tavily](/en/tools/tavily)                | Extraits structurés             | Via `tavily_search` tool                               | `TAVILY_API_KEY`                            |

## Détection automatique

Les listes de fournisseurs dans la documentation et les flux de configuration sont classées par ordre alphabétique. La détection automatique conserve un ordre de priorité distinct :

Si aucun `provider` n'est défini, OpenClaw vérifie les clés API dans cet ordre et utilise
la première trouvée :

1. **Brave** -- `BRAVE_API_KEY` ou `plugins.entries.brave.config.webSearch.apiKey`
2. **Gemini** -- `GEMINI_API_KEY` ou `plugins.entries.google.config.webSearch.apiKey`
3. **Grok** -- `XAI_API_KEY` ou `plugins.entries.xai.config.webSearch.apiKey`
4. **Kimi** -- `KIMI_API_KEY` / `MOONSHOT_API_KEY` ou `plugins.entries.moonshot.config.webSearch.apiKey`
5. **Perplexity** -- `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` ou `plugins.entries.perplexity.config.webSearch.apiKey`
6. **Firecrawl** -- `FIRECRAWL_API_KEY` ou `plugins.entries.firecrawl.config.webSearch.apiKey`
7. **Tavily** -- `TAVILY_API_KEY` ou `plugins.entries.tavily.config.webSearch.apiKey`

Si aucune clé n'est trouvée, il revient à Brave (vous obtiendrez une erreur de clé manquante
vous invitant à en configurer une).

<Note>Tous les champs de clé de provider prennent en charge les objets SecretRef. En mode détection automatique, OpenClaw ne résout que la clé du provider sélectionné -- les SecretRefs non sélectionnés restent inactifs.</Note>

## Config

```json5
{
  tools: {
    web: {
      search: {
        enabled: true, // default: true
        provider: "brave", // or omit for auto-detection
        maxResults: 5,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
      },
    },
  },
}
```

La configuration spécifique au fournisseur (clés API, URL de base, modes) se trouve sous
`plugins.entries.<plugin>.config.webSearch.*`. Consultez les pages des fournisseurs pour
plus d'exemples.

Pour `x_search`, configurez `tools.web.x_search.*` directement. Il utilise le même
`XAI_API_KEY` de repli que la recherche web Grok.

### Stockage des clés API

<Tabs>
  <Tab title="Fichier de configuration">
    Exécutez `openclaw configure --section web` ou définissez la clé directement :

    ```json5
    {
      plugins: {
        entries: {
          brave: {
            config: {
              webSearch: {
                apiKey: "YOUR_KEY", // pragma: allowlist secret
              },
            },
          },
        },
      },
    }
    ```

  </Tab>
  <Tab title="Variable d'environnement">
    Définissez la env var du fournisseur dans l'environnement du processus Gateway :

    ```bash
    export BRAVE_API_KEY="YOUR_KEY"
    ```

    Pour une installation gateway, placez-la dans `~/.openclaw/.env`.
    Voir [Env vars](/en/help/faq#env-vars-and-env-loading).

  </Tab>
</Tabs>

## Paramètres de l'outil

| Paramètre             | Description                                                        |
| --------------------- | ------------------------------------------------------------------ |
| `query`               | Requête de recherche (requis)                                      |
| `count`               | Résultats à renvoyer (1-10, par défaut : 5)                        |
| `country`             | Code de pays ISO à 2 lettres (ex. « US », « DE »)                  |
| `language`            | Code de langue ISO 639-1 (par ex. « en », « de »)                  |
| `freshness`           | Filtre temporel : `day`, `week`, `month` ou `year`                 |
| `date_after`          | Résultats après cette date (YYYY-MM-DD)                            |
| `date_before`         | Résultats avant cette date (YYYY-MM-DD)                            |
| `ui_lang`             | Code de langue de l'interface (Brave uniquement)                   |
| `domain_filter`       | Tableau d'autorisation/blocage de domaines (Perplexity uniquement) |
| `max_tokens`          | Budget total du contenu, par défaut 25000 (Perplexity uniquement)  |
| `max_tokens_per_page` | Limite de jetons par page, 2048 par défaut (Perplexity uniquement) |

<Warning>Tous les paramètres ne fonctionnent pas avec tous les fournisseurs. Le mode Brave `llm-context` rejette `ui_lang`, `freshness`, `date_after` et `date_before`. Firecrawl et Tavily ne prennent en charge que `query` et `count` via `web_search` -- utilisez leurs outils dédiés pour les options avancées.</Warning>

## x_search

`x_search` interroge les publications X (anciennement Twitter) à l'aide de xAI et renvoie des réponses synthétisées par l'IA avec des citations. Il accepte des requêtes en langage naturel et des filtres structurés optionnels. OpenClaw n'active l'outil `x_search` xAI intégré que sur la requête qui traite cet appel d'outil.

<Note>
  xAI indique que `x_search` prend en charge la recherche par mots-clés, la recherche sémantique, la recherche utilisateur et la récupération de fils de discussion. Pour les statistiques d'engagement par publication telles que les repartages, les réponses, les favoris ou les vues, il est préférable d'effectuer une recherche ciblée sur l'URL exacte de la publication ou l'ID de statut. Les
  recherches par mots-clés larges peuvent trouver la bonne publication mais renvoyer des métadonnées par publication moins complètes. Une bonne pratique consiste à : localiser d'abord la publication, puis exécuter une seconde requête `x_search` ciblée sur cette publication exacte.
</Note>

### configuration x_search

```json5
{
  tools: {
    web: {
      x_search: {
        enabled: true,
        apiKey: "xai-...", // optional if XAI_API_KEY is set
        model: "grok-4-1-fast-non-reasoning",
        inlineCitations: false,
        maxTurns: 2,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
      },
    },
  },
}
```

### paramètres x_search

| Paramètre                    | Description                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------- |
| `query`                      | Requête de recherche (requis)                                                 |
| `allowed_x_handles`          | Limiter les résultats à des comptes X spécifiques                             |
| `excluded_x_handles`         | Exclure des comptes X spécifiques                                             |
| `from_date`                  | Inclure uniquement les messages à partir de cette date (YYYY-MM-DD)           |
| `to_date`                    | Inclure uniquement les messages jusqu'à cette date (YYYY-MM-DD)               |
| `enable_image_understanding` | Autoriser xAI à inspecter les images jointes aux publications correspondantes |
| `enable_video_understanding` | Permettre à xAI d'inspecter les vidéos jointes aux posts correspondants       |

### exemple x_search

```javascript
await x_search({
  query: "dinner recipes",
  allowed_x_handles: ["nytfood"],
  from_date: "2026-03-01",
});
```

```javascript
// Per-post stats: use the exact status URL or status ID when possible
await x_search({
  query: "https://x.com/huntharo/status/1905678901234567890",
});
```

## Exemples

```javascript
// Basic search
await web_search({ query: "OpenClaw plugin SDK" });

// German-specific search
await web_search({ query: "TV online schauen", country: "DE", language: "de" });

// Recent results (past week)
await web_search({ query: "AI developments", freshness: "week" });

// Date range
await web_search({
  query: "climate research",
  date_after: "2024-01-01",
  date_before: "2024-06-30",
});

// Domain filtering (Perplexity only)
await web_search({
  query: "product reviews",
  domain_filter: ["-reddit.com", "-pinterest.com"],
});
```

## Profils d'outil

Si vous utilisez des profils d'outils ou des listes d'autorisation, ajoutez `web_search`, `x_search`, ou `group:web` :

```json5
{
  tools: {
    allow: ["web_search", "x_search"],
    // or: allow: ["group:web"]  (includes web_search, x_search, and web_fetch)
  },
}
```

## Connexes

- [Web Fetch](/en/tools/web-fetch) -- récupérer une URL et extraire le contenu lisible
- [Navigateur Web](/en/tools/browser) -- automatisation complète du navigateur pour les sites riches en JS
- [Grok Search](/en/tools/grok-search) -- Grok en tant que provider `web_search`
