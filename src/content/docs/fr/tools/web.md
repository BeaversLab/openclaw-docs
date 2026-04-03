---
title: "Recherche Web"
sidebarTitle: "Recherche Web"
summary: "web_search, x_search et web_fetch -- recherchez le web, les billets X ou récupérez le contenu des pages"
read_when:
  - You want to enable or configure web_search
  - You want to enable or configure x_search
  - You need to choose a search provider
  - You want to understand auto-detection and provider fallback
---

# Recherche Web

L'outil `web_search` recherche le web en utilisant votre provider configuré et
renvoie les résultats. Les résultats sont mis en cache par requête pendant 15 minutes (configurable).

OpenClaw inclut également `x_search` pour les billets X (anciennement Twitter) et
`web_fetch` pour la récupération légère d'URL. À ce stade, `web_fetch` reste
local tandis que `web_search` et `x_search` peuvent utiliser xAI Responses en arrière-plan.

<Info>`web_search` est un outil HTTP léger, et non une automatisation de navigateur. Pour les sites utilisant beaucoup de JS ou les connexions, utilisez le [Navigateur Web](/en/tools/browser). Pour récupérer une URL spécifique, utilisez [Web Fetch](/en/tools/web-fetch).</Info>

## Quick start

<Steps>
  <Step title="Obtenir une clé d'API">
    Choisissez un provider et obtenez une clé d'API. Consultez les pages des providers ci-dessous pour
    les liens d'inscription.
  </Step>
  <Step title="Configurer">
    ```bash
    openclaw configure --section web
    ```
    Cela stocke la clé et définit le provider. Vous pouvez également définir une env var
    (ex. `BRAVE_API_KEY`) et passer cette étape.
  </Step>
  <Step title="Utiliser">
    L'agent peut maintenant appeler `web_search` :

    ```javascript
    await web_search({ query: "OpenClaw plugin SDK" });
    ```

    Pour les billets X, utilisez :

    ```javascript
    await x_search({ query: "dinner recipes" });
    ```

  </Step>
</Steps>

## Choisir un provider

<CardGroup cols={2}>
  <Card title="Recherche Brave" icon="shield" href="/en/tools/brave-search">
    Résultats structurés avec extraits. Prend en charge le mode `llm-context`, les filtres de pays/langue. Palier gratuit disponible.
  </Card>
  <Card title="DuckDuckGo" icon="bird" href="/en/tools/duckduckgo-search">
    Solution de repli sans clé. Aucune clé API nécessaire. Intégration non officielle basée sur HTML.
  </Card>
  <Card title="Exa" icon="brain" href="/en/tools/exa-search">
    Recherche neurale + par mots-clés avec extraction de contenu (extraits, texte, résumés).
  </Card>
  <Card title="Firecrawl" icon="flame" href="/en/tools/firecrawl">
    Résultats structurés. Fonctionne mieux avec `firecrawl_search` et `firecrawl_scrape` pour une extraction approfondie.
  </Card>
  <Card title="Gemini" icon="sparkles" href="/en/tools/gemini-search">
    Réponses synthétisées par l'IA avec citations via le Google Search grounding.
  </Card>
  <Card title="Grok" icon="zap" href="/en/tools/grok-search">
    Réponses synthétisées par l'IA avec citations via le xAI web grounding.
  </Card>
  <Card title="Kimi" icon="moon" href="/en/tools/kimi-search">
    Réponses synthétisées par l'IA avec citations via la recherche web Moonshot.
  </Card>
  <Card title="Perplexity" icon="search" href="/en/tools/perplexity-search">
    Résultats structurés avec contrôles d'extraction de contenu et filtrage de domaine.
  </Card>
  <Card title="SearXNG" icon="server" href="/en/tools/searxng-search">
    Moteur de recherche méta auto-hébergé. Aucune clé API nécessaire. Agrège Google, Bing, DuckDuckGo, et plus encore.
  </Card>
  <Card title="Tavily" icon="globe" href="/en/tools/tavily">
    Résultats structurés avec profondeur de recherche, filtrage par sujet, et `tavily_extract` pour l'extraction d'URL.
  </Card>
</CardGroup>

### Comparaison des fournisseurs

| Fournisseur                               | Style de résultat             | Filtres                                                  | Clé API                                     |
| ----------------------------------------- | ----------------------------- | -------------------------------------------------------- | ------------------------------------------- |
| [Brave](/en/tools/brave-search)           | Extraits structurés           | Pays, langue, heure, mode `llm-context`                  | `BRAVE_API_KEY`                             |
| [DuckDuckGo](/en/tools/duckduckgo-search) | Extraits structurés           | --                                                       | Aucune (sans clé)                           |
| [Exa](/en/tools/exa-search)               | Structuré + extrait           | Mode neuronal/par mots-clés, date, extraction de contenu | `EXA_API_KEY`                               |
| [Firecrawl](/en/tools/firecrawl)          | Extraits structurés           | Via l'outil `firecrawl_search`                           | `FIRECRAWL_API_KEY`                         |
| [Gemini](/en/tools/gemini-search)         | Synthétisé par IA + citations | --                                                       | `GEMINI_API_KEY`                            |
| [Grok](/en/tools/grok-search)             | Synthétisé par IA + citations | --                                                       | `XAI_API_KEY`                               |
| [Kimi](/en/tools/kimi-search)             | Synthétisé par IA + citations | --                                                       | `KIMI_API_KEY` / `MOONSHOT_API_KEY`         |
| [Perplexity](/en/tools/perplexity-search) | Extraits structurés           | Pays, langue, heure, domaines, limites de contenu        | `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` |
| [SearXNG](/en/tools/searxng-search)       | Extraits structurés           | Catégories, langue                                       | Aucune (auto-hébergé)                       |
| [Tavily](/en/tools/tavily)                | Extraits structurés           | Via l'outil `tavily_search`                              | `TAVILY_API_KEY`                            |

## Détection automatique

## Recherche web native Codex

Les modèles compatibles avec Codex peuvent utiliser l'outil `web_search` Responses natif du fournisseur au lieu de la fonction gérée `web_search` de OpenClaw.

- Configurez-le sous `tools.web.search.openaiCodex`
- Il ne s'active que pour les modèles compatibles Codex (`openai-codex/*` ou fournisseurs utilisant `api: "openai-codex-responses"`)
- Le `web_search` géré s'applique toujours aux modèles non Codex
- `mode: "cached"` est le paramètre par défaut et recommandé
- `tools.web.search.enabled: false` désactive la recherche gérée et native

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        openaiCodex: {
          enabled: true,
          mode: "cached",
          allowedDomains: ["example.com"],
          contextSize: "high",
          userLocation: {
            country: "US",
            city: "New York",
            timezone: "America/New_York",
          },
        },
      },
    },
  },
}
```

Si la recherche native Codex est activée mais que le modèle actuel n'est pas compatible Codex, OpenClaw conserve le comportement normal géré `web_search`.

## Configuration de la recherche web

Les listes de fournisseurs dans la documentation et les flux de configuration sont par ordre alphabétique. La détection automatique conserve un ordre de priorité distinct :

Si aucun `provider` n'est défini, OpenClaw vérifie les clés API dans cet ordre et utilise la première trouvée :

1. **Brave** -- `BRAVE_API_KEY` ou `plugins.entries.brave.config.webSearch.apiKey`
2. **Gemini** -- `GEMINI_API_KEY` ou `plugins.entries.google.config.webSearch.apiKey`
3. **Grok** -- `XAI_API_KEY` ou `plugins.entries.xai.config.webSearch.apiKey`
4. **Kimi** -- `KIMI_API_KEY` / `MOONSHOT_API_KEY` ou `plugins.entries.moonshot.config.webSearch.apiKey`
5. **Perplexity** -- `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` ou `plugins.entries.perplexity.config.webSearch.apiKey`
6. **Firecrawl** -- `FIRECRAWL_API_KEY` ou `plugins.entries.firecrawl.config.webSearch.apiKey`
7. **Tavily** -- `TAVILY_API_KEY` ou `plugins.entries.tavily.config.webSearch.apiKey`

Les fournisseurs sans clé sont vérifiés après les fournisseurs pris en charge par API :

8. **DuckDuckGo** -- aucune clé nécessaire (ordre de détection automatique 100)
9. **SearXNG** -- `SEARXNG_BASE_URL` ou `plugins.entries.searxng.config.webSearch.baseUrl` (ordre de détection automatique 200)

Si aucun fournisseur n'est détecté, il revient à Brave (vous obtiendrez une erreur de clé manquante vous invitant à en configurer une).

<Note>Tous les champs de clé de fournisseur prennent en charge les objets SecretRef. En mode de détection automatique, OpenClaw résout uniquement la clé du fournisseur sélectionné -- les SecretRef non sélectionnés restent inactifs.</Note>

## Configuration

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
des exemples.

Pour `x_search`, configurez `tools.web.x_search.*` directement. Il utilise le même
fallback `XAI_API_KEY` que la recherche web Grok.
Lorsque vous choisissez Grok pendant `openclaw onboard` ou `openclaw configure --section web`,
OpenClaw peut également proposer une configuration `x_search` facultative avec la même clé.
Il s'agit d'une étape de suivi distincte dans le chemin Grok, et non d'un choix distinct de
fournisseur de recherche web de niveau supérieur. Si vous choisissez un autre fournisseur, OpenClaw n'affiche pas
la demande `x_search`.

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
    Définissez la variable d'environnement du provider dans l'environnement du processus Gateway :

    ```bash
    export BRAVE_API_KEY="YOUR_KEY"
    ```

    Pour une installation de passerelle, placez-la dans `~/.openclaw/.env`.
    Voir [Variables d'environnement](/en/help/faq#env-vars-and-env-loading).

  </Tab>
</Tabs>

## Paramètres de l'outil

| Paramètre             | Description                                                        |
| --------------------- | ------------------------------------------------------------------ |
| `query`               | Requête de recherche (requis)                                      |
| `count`               | Résultats à renvoyer (1-10, par défaut : 5)                        |
| `country`             | Code pays ISO à 2 lettres (ex. "US", "DE")                         |
| `language`            | Code de langue ISO 639-1 (ex. "en", "de")                          |
| `freshness`           | Filtre temporel : `day`, `week`, `month` ou `year`                 |
| `date_after`          | Résultats après cette date (YYYY-MM-DD)                            |
| `date_before`         | Résultats avant cette date (YYYY-MM-DD)                            |
| `ui_lang`             | Code de langue de l'interface (Brave uniquement)                   |
| `domain_filter`       | Tableau de liste verte/noire de domaines (Perplexity uniquement)   |
| `max_tokens`          | Budget total de contenu, par défaut 25000 (Perplexity uniquement)  |
| `max_tokens_per_page` | Limite de jetons par page, par défaut 2048 (Perplexity uniquement) |

<Warning>Tous les paramètres ne fonctionnent pas avec tous les providers. Le mode `llm-context` de Brave rejette `ui_lang`, `freshness`, `date_after` et `date_before`. Firecrawl et Tavily ne prennent en charge que `query` et `count` via `web_search` -- utilisez leurs outils dédiés pour les options avancées.</Warning>

## x_search

`x_search` interroge les publications X (anciennement Twitter) à l'aide de xAI et renvoie des réponses synthétisées par l'IA avec des citations. Il accepte les requêtes en langage naturel et des filtres structurés optionnels. OpenClaw n'active l'outil xAI `x_search` intégré que sur la demande qui traite cet appel d'outil.

<Note>
  xAI documente `x_search` comme prenant en charge la recherche par mots-clés, la recherche sémantique, la recherche utilisateur et la récupération de fils de discussion. Pour les statistiques d'engagement par publication telles que les repartages, les réponses, les signets ou les vues, privilégiez une recherche ciblée pour l'URL exacte de la publication ou l'identifiant de statut. Les recherches
  par mots-clés larges peuvent trouver la bonne publication mais renvoient des métadonnées par publication moins complètes. Une bonne pratique consiste à : localiser d'abord la publication, puis exécuter une deuxième requête `x_search` ciblée sur cette publication exacte.
</Note>

### Configuration x_search

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

### Paramètres x_search

| Paramètre                    | Description                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------- |
| `query`                      | Requête de recherche (requis)                                                 |
| `allowed_x_handles`          | Limiter les résultats à des comptes X spécifiques                             |
| `excluded_x_handles`         | Exclure des comptes X spécifiques                                             |
| `from_date`                  | Inclure uniquement les publications à partir de cette date (AAAA-MM-JJ)       |
| `to_date`                    | Inclure uniquement les publications jusqu'à cette date (AAAA-MM-JJ)           |
| `enable_image_understanding` | Autoriser xAI à inspecter les images jointes aux publications correspondantes |
| `enable_video_understanding` | Autoriser xAI à inspecter les vidéos jointes aux publications correspondantes |

### Exemple x_search

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

## Profils d'outils

Si vous utilisez des profils d'outils ou des listes d'autorisation, ajoutez `web_search`, `x_search` ou `group:web` :

```json5
{
  tools: {
    allow: ["web_search", "x_search"],
    // or: allow: ["group:web"]  (includes web_search, x_search, and web_fetch)
  },
}
```

## Connexes

- [Web Fetch](/en/tools/web-fetch) -- Récupérer une URL et extraire le contenu lisible
- [Web Browser](/en/tools/browser) -- Automatisation complète du navigateur pour les sites riches en JS
- [Grok Search](/en/tools/grok-search) -- Grok en tant que fournisseur `web_search`
