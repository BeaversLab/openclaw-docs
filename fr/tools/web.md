---
summary: "web_search tool -- recherchez sur le Web avec Brave, Firecrawl, Gemini, Grok, Kimi, Perplexity ou Tavily"
read_when:
  - You want to enable or configure web_search
  - You need to choose a search provider
  - You want to understand auto-detection and provider fallback
title: "Recherche Web"
sidebarTitle: "Recherche Web"
---

# Recherche Web

L'outil `web_search` recherche sur le Web en utilisant votre provider configuré et
renvoie les résultats. Les résultats sont mis en cache par requête pendant 15 minutes (configurable).

<Info>
  `web_search` est un outil HTTP léger, et non une automatisation de navigateur. Pour les sites
  riches en JS ou les connexions, utilisez le [Navigateur Web](/fr/tools/browser). Pour récupérer
  une URL spécifique, utilisez [Web Fetch](/fr/tools/web-fetch).
</Info>

## Quick start

<Steps>
  <Step title="Obtenir une clé d'API">
    Choisissez un provider et obtenez une clé d'API. Consultez les pages du provider ci-dessous pour
    les liens d'inscription.
  </Step>
  <Step title="Configurer">
    ```bash
    openclaw configure --section web
    ```
    Cela stocke la clé et définit le provider. Vous pouvez également définir une env var
    (ex. `BRAVE_API_KEY`) et ignorer cette étape.
  </Step>
  <Step title="Utiliser">
    L'agent peut maintenant appeler `web_search` :

    ```javascript
    await web_search({ query: "OpenClaw plugin SDK" });
    ```

  </Step>
</Steps>

## Choosing a provider

<CardGroup cols={2}>
  <Card title="Recherche Brave" icon="shield" href="/fr/tools/brave-search">
    Résultats structurés avec extraits. Prend en charge le mode `llm-context`, les filtres de
    pays/langue. Niveau gratuit disponible.
  </Card>
  <Card title="DuckDuckGo" icon="bird" href="/fr/tools/duckduckgo-search">
    Solution de repli sans clé. Aucune clé d'API nécessaire. Intégration HTML non officielle.
  </Card>
  <Card title="Exa" icon="brain" href="/fr/tools/exa-search">
    Recherche neuronale + par mots-clés avec extraction de contenu (surlignages, texte, résumés).
  </Card>
  <Card title="Firecrawl" icon="flame" href="/fr/tools/firecrawl">
    Résultats structurés. Idéal en combinaison avec `firecrawl_search` et `firecrawl_scrape` pour
    une extraction approfondie.
  </Card>
  <Card title="Gemini" icon="sparkles" href="/fr/tools/gemini-search">
    Réponses synthétisées par l'IA avec citations via le fondement Google Search.
  </Card>
  <Card title="Grok" icon="zap" href="/fr/tools/grok-search">
    Réponses synthétisées par l'IA avec citations via le fondement Web xAI.
  </Card>
  <Card title="Kimi" icon="moon" href="/fr/tools/kimi-search">
    Réponses synthétisées par l'IA avec citations via la recherche Web Moonshot.
  </Card>
  <Card title="Perplexity" icon="search" href="/fr/tools/perplexity-search">
    Résultats structurés avec des contrôles d'extraction de contenu et un filtrage de domaine.
  </Card>
  <Card title="Tavily" icon="globe" href="/fr/tools/tavily">
    Résultats structurés avec profondeur de recherche, filtrage par sujet et `tavily_extract` pour
    l'extraction d'URL.
  </Card>
</CardGroup>

### Comparaison des fournisseurs

| Fournisseur                               | Style de résultat               | Filtres                                              | Clé API                                     |
| ----------------------------------------- | ------------------------------- | ---------------------------------------------------- | ------------------------------------------- |
| [Brave](/fr/tools/brave-search)           | Extraits structurés             | Pays, langue, heure, mode `llm-context`              | `BRAVE_API_KEY`                             |
| [DuckDuckGo](/fr/tools/duckduckgo-search) | Extraits structurés             | --                                                   | Aucune (sans clé)                           |
| [Exa](/fr/tools/exa-search)               | Structuré + extrait             | Mode neuronal/mots-clés, date, extraction de contenu | `EXA_API_KEY`                               |
| [Firecrawl](/fr/tools/firecrawl)          | Extraits structurés             | Via l'outil `firecrawl_search`                       | `FIRECRAWL_API_KEY`                         |
| [Gemini](/fr/tools/gemini-search)         | Synthétisé par l'IA + citations | --                                                   | `GEMINI_API_KEY`                            |
| [Grok](/fr/tools/grok-search)             | Synthétisé par l'IA + citations | --                                                   | `XAI_API_KEY`                               |
| [Kimi](/fr/tools/kimi-search)             | Synthèse IA + citations         | --                                                   | `KIMI_API_KEY` / `MOONSHOT_API_KEY`         |
| [Perplexity](/fr/tools/perplexity-search) | Extraits structurés             | Pays, langue, heure, domaines, limites de contenu    | `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` |
| [Tavily](/fr/tools/tavily)                | Extraits structurés             | Via le tool `tavily_search`                          | `TAVILY_API_KEY`                            |

## Détection automatique

Les listes de providers dans la documentation et les flux de configuration sont par ordre alphabétique. La détection automatique conserve un ordre de priorité distinct :

Si aucun `provider` n'est défini, OpenClaw vérifie les clés API dans cet ordre et utilise la première trouvée :

1. **Brave** -- `BRAVE_API_KEY` ou `plugins.entries.brave.config.webSearch.apiKey`
2. **Gemini** -- `GEMINI_API_KEY` ou `plugins.entries.google.config.webSearch.apiKey`
3. **Grok** -- `XAI_API_KEY` ou `plugins.entries.xai.config.webSearch.apiKey`
4. **Kimi** -- `KIMI_API_KEY` / `MOONSHOT_API_KEY` ou `plugins.entries.moonshot.config.webSearch.apiKey`
5. **Perplexity** -- `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` ou `plugins.entries.perplexity.config.webSearch.apiKey`
6. **Firecrawl** -- `FIRECRAWL_API_KEY` ou `plugins.entries.firecrawl.config.webSearch.apiKey`
7. **Tavily** -- `TAVILY_API_KEY` ou `plugins.entries.tavily.config.webSearch.apiKey`

Si aucune clé n'est trouvée, il revient à Brave (vous obtiendrez une erreur de clé manquante vous invitant à en configurer une).

<Note>
  Tous les champs de clé de provider prennent en charge les objets SecretRef. En mode détection
  automatique, OpenClaw ne résout que la clé du provider sélectionné -- les SecretRef non
  sélectionnés restent inactifs.
</Note>

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

La configuration spécifique au provider (clés API, URL de base, modes) se trouve sous
`plugins.entries.<plugin>.config.webSearch.*`. Consultez les pages du provider pour
des exemples.

### Stockage des clés API

<Tabs>
  <Tab title="Config file">
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

    Pour une installation gateway, placez-la dans `~/.openclaw/.env`.
    Voir [Variables d'environnement](/fr/help/faq#env-vars-and-env-loading).

  </Tab>
</Tabs>

## Paramètres de l'outil

| Paramètre             | Description                                                              |
| --------------------- | ------------------------------------------------------------------------ |
| `query`               | Requête de recherche (requis)                                            |
| `count`               | Résultats à renvoyer (1-10, par défaut : 5)                              |
| `country`             | Code de pays ISO à 2 lettres (par ex. "US", "DE")                        |
| `language`            | Code de langue ISO 639-1 (par ex. "en", "de")                            |
| `freshness`           | Filtre temporel : `day`, `week`, `month`, ou `year`                      |
| `date_after`          | Résultats après cette date (YYYY-MM-DD)                                  |
| `date_before`         | Résultats avant cette date (YYYY-MM-DD)                                  |
| `ui_lang`             | Code de langue de l'interface (Brave uniquement)                         |
| `domain_filter`       | Tableau de liste d'autorisation/refus de domaine (Perplexity uniquement) |
| `max_tokens`          | Budget total de contenu, par défaut 25000 (Perplexity uniquement)        |
| `max_tokens_per_page` | Limite de jetons par page, par défaut 2048 (Perplexity uniquement)       |

<Warning>
  Tous les paramètres ne fonctionnent pas avec tous les providers. Le mode Brave `llm-context`
  rejette `ui_lang`, `freshness`, `date_after` et `date_before`. Firecrawl et Tavily ne prennent en
  charge que `query` et `count` via `web_search` -- utilisez leurs outils dédiés pour les options
  avancées.
</Warning>

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

Si vous utilisez des profils d'outils ou des listes d'autorisation, ajoutez `web_search` ou `group:web` :

```json5
{
  tools: {
    allow: ["web_search"],
    // or: allow: ["group:web"]  (includes both web_search and web_fetch)
  },
}
```

## Connexes

- [Web Fetch](/fr/tools/web-fetch) -- récupérer une URL et extraire le contenu lisible
- [Web Browser](/fr/tools/browser) -- automatisation complète du navigateur pour les sites lourds en JS

import fr from "/components/footer/fr.mdx";

<fr />
