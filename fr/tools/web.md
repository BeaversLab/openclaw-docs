---
summary: "Outils de recherche web + récupération (providers Brave, Firecrawl, Gemini, Grok, Kimi, Perplexity et Tavily)"
read_when:
  - You want to enable web_search or web_fetch
  - You need provider API key setup
  - You want to use Gemini with Google Search grounding
title: "Outils Web"
---

# Outils Web

OpenClaw fournit deux outils Web légers :

- `web_search` — Rechercher sur le web en utilisant l'API de recherche Brave, Firecrawl Search, Gemini avec ancrage Google Search, Grok, Kimi, l'API Perplexity Search ou l'API Tavily Search.
- `web_fetch` — Récupération HTTP + extraction lisible (HTML → markdown/texte).

Ce ne sont **pas** des outils d'automatisation de navigateur. Pour les sites gourmands en JS ou les connexions, utilisez l'[outil de navigateur](/fr/tools/browser).

## Fonctionnement

- `web_search` appelle votre provider configuré et renvoie les résultats.
- Les résultats sont mis en cache par requête pendant 15 minutes (configurable).
- `web_fetch` effectue une requête HTTP GET simple et extrait le contenu lisible
  (HTML → markdown/texte). Il n'exécute **pas** JavaScript.
- `web_fetch` est activé par défaut (sauf s'il est explicitement désactivé).
- Le plugin Firecrawl intégré ajoute également `firecrawl_search` et `firecrawl_scrape` lorsqu'il est activé.
- Le plugin Tavily intégré ajoute également `tavily_search` et `tavily_extract` lorsqu'il est activé.

Consultez la [configuration de Brave Search](/fr/tools/brave-search), la [configuration de Perplexity Search](/fr/tools/perplexity-search) et la [configuration de Tavily Search](/fr/tools/tavily) pour les détails spécifiques aux providers.

## Choisir un provider de recherche

| Provider                        | Format du résultat                       | Filtres spécifiques au provider                                                   | Notes                                                                                                       | Clé API                                     |
| ------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **API de recherche Brave**      | Résultats structurés avec extraits       | `country`, `language`, `ui_lang`, temps                                           | Prend en charge le mode `llm-context` de Brave                                                              | `BRAVE_API_KEY`                             |
| **Recherche Firecrawl**         | Résultats structurés avec extraits       | Utilisez `firecrawl_search` pour les options de recherche spécifiques à Firecrawl | Idéal pour associer la recherche au scraping/extraction Firecrawl                                           | `FIRECRAWL_API_KEY`                         |
| **Gemini**                      | Réponses synthétisées par IA + citations | —                                                                                 | Utilise l'ancrage Google Search                                                                             | `GEMINI_API_KEY`                            |
| **Grok**                        | Réponses synthétisées par IA + citations | —                                                                                 | Utilise les réponses ancrées au web xAI                                                                     | `XAI_API_KEY`                               |
| **Kimi**                        | Réponses synthétisées par IA + citations | —                                                                                 | Utilise la recherche web Moonshot                                                                           | `KIMI_API_KEY` / `MOONSHOT_API_KEY`         |
| **API de recherche Perplexity** | Résultats structurés avec extraits       | `country`, `language`, heure, `domain_filter`                                     | Prend en charge les contrôles d'extraction de contenu ; OpenRouter utilise le chemin de compatibilité Sonar | `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` |
| **API de recherche Tavily**     | Résultats structurés avec extraits       | Utilisez `tavily_search` pour les options de recherche spécifiques à Tavily       | Profondeur de recherche, filtrage par sujet, réponses IA, extraction d'URL via `tavily_extract`             | `TAVILY_API_KEY`                            |

### Détection automatique

Le tableau ci-dessus est classé par ordre alphabétique. Si aucun `provider` n'est explicitement défini, la détection automatique à l'exécution vérifie les providers dans cet ordre :

1. **Brave** — variable d'environnement `BRAVE_API_KEY` ou `plugins.entries.brave.config.webSearch.apiKey`
2. **Gemini** — variable d'environnement `GEMINI_API_KEY` ou `plugins.entries.google.config.webSearch.apiKey`
3. **Grok** — variable d'environnement `XAI_API_KEY` ou `plugins.entries.xai.config.webSearch.apiKey`
4. **Kimi** — variable d'environnement `KIMI_API_KEY` / `MOONSHOT_API_KEY` ou `plugins.entries.moonshot.config.webSearch.apiKey`
5. **Perplexity** — `PERPLEXITY_API_KEY`, `OPENROUTER_API_KEY` ou `plugins.entries.perplexity.config.webSearch.apiKey`
6. **Firecrawl** — variable d'environnement `FIRECRAWL_API_KEY` ou `plugins.entries.firecrawl.config.webSearch.apiKey`
7. **Tavily** — variable d'environnement `TAVILY_API_KEY` ou `plugins.entries.tavily.config.webSearch.apiKey`

Si aucune clé n'est trouvée, le système revient à Brave (vous obtiendrez une erreur de clé manquante vous invitant à en configurer une).

Comportement du SecretRef à l'exécution :

- Les SecretRefs des outils web sont résolus de manière atomique au démarrage/rechargement de la passerelle.
- En mode détection automatique, OpenClaw résout uniquement la clé du provider sélectionné. Les SecretRefs des providers non sélectionnés restent inactifs jusqu'à leur sélection.
- Si le SecretRef du provider sélectionné n'est pas résolu et qu'aucune variable d'environnement de provider de secours n'existe, le démarrage/rechargement échoue rapidement.

## Configuration de la recherche web

Utilisez `openclaw configure --section web` pour configurer votre clé API et choisir un provider.

### Recherche Brave

1. Créez un compte Brave Search API sur [brave.com/search/api](https://brave.com/search/api/)
2. Dans le tableau de bord, choisissez le forfait **Search** et générez une clé API.
3. Exécutez `openclaw configure --section web` pour stocker la clé dans la configuration, ou définissez `BRAVE_API_KEY` dans votre environnement.

Chaque forfait Brave inclut **\$5/mois de crédit gratuit** (renouvelable). Le forfait Search coûte \$5 pour 1 000 requêtes, donc le crédit couvre 1 000 requêtes par mois. Définissez votre limite d'utilisation dans le tableau de bord Brave pour éviter des frais inattendus. Consultez le [portail Brave API](https://brave.com/search/api/) pour les forfaits et tarifs actuels.

### Perplexity Search

1. Créez un compte Perplexity sur [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api)
2. Générez une clé API dans le tableau de bord
3. Exécutez `openclaw configure --section web` pour stocker la clé dans la configuration, ou définissez `PERPLEXITY_API_KEY` dans votre environnement.

Pour la compatibilité avec l'ancien Sonar/OpenRouter, définissez `OPENROUTER_API_KEY` à la place, ou configurez `plugins.entries.perplexity.config.webSearch.apiKey` avec une clé `sk-or-...`. Définir `plugins.entries.perplexity.config.webSearch.baseUrl` ou `model` réintègre également Perplexity dans le chemin de compatibilité chat-completions.

La configuration de recherche web spécifique au fournisseur se trouve désormais sous `plugins.entries.<plugin>.config.webSearch.*`.
Les anciens chemins de fournisseur `tools.web.search.*` se chargent toujours via une shim de compatibilité pour une version, mais ils ne doivent pas être utilisés dans les nouvelles configurations.

Consultez la documentation de l'Perplexity de recherche API (https://docs.perplexity.ai/guides/search-quickstart) pour plus de détails.

### Où stocker la clé

**Via la configuration :** exécutez `openclaw configure --section web`. Elle stocke la clé sous le chemin de configuration spécifique au fournisseur :

- Brave : `plugins.entries.brave.config.webSearch.apiKey`
- Firecrawl : `plugins.entries.firecrawl.config.webSearch.apiKey`
- Gemini : `plugins.entries.google.config.webSearch.apiKey`
- Grok : `plugins.entries.xai.config.webSearch.apiKey`
- Kimi : `plugins.entries.moonshot.config.webSearch.apiKey`
- Perplexity : `plugins.entries.perplexity.config.webSearch.apiKey`
- Tavily : `plugins.entries.tavily.config.webSearch.apiKey`

Tous ces champs prennent également en charge les objets SecretRef.

**Via l'environnement :** définissez les env vars du provider dans l'environnement du processus Gateway :

- Brave : `BRAVE_API_KEY`
- Firecrawl : `FIRECRAWL_API_KEY`
- Gemini : `GEMINI_API_KEY`
- Grok : `XAI_API_KEY`
- Kimi : `KIMI_API_KEY` ou `MOONSHOT_API_KEY`
- Perplexity : `PERPLEXITY_API_KEY` ou `OPENROUTER_API_KEY`
- Tavily : `TAVILY_API_KEY`

Pour une installation de passerelle, placez-les dans `~/.openclaw/.env` (ou votre environnement de service). Voir [Env vars](/fr/help/faq#how-does-openclaw-load-environment-variables).

### Exemples de configuration

**Recherche Brave :**

```json5
{
  plugins: {
    entries: {
      brave: {
        config: {
          webSearch: {
            apiKey: "YOUR_BRAVE_API_KEY", // optional if BRAVE_API_KEY is set // pragma: allowlist secret
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "brave",
      },
    },
  },
}
```

**Recherche Firecrawl :**

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
      search: {
        enabled: true,
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
            apiKey: "fc-...", // optional if FIRECRAWL_API_KEY is set
            baseUrl: "https://api.firecrawl.dev",
          },
        },
      },
    },
  },
}
```

Lorsque vous choisissez Firecrawl lors de l'intégration ou `openclaw configure --section web`, OpenClaw active automatiquement le plugin Firecrawl inclus, de sorte que `web_search`, `firecrawl_search` et `firecrawl_scrape` sont tous disponibles.

**Recherche Tavily :**

```json5
{
  plugins: {
    entries: {
      tavily: {
        enabled: true,
        config: {
          webSearch: {
            apiKey: "tvly-...", // optional if TAVILY_API_KEY is set
            baseUrl: "https://api.tavily.com",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "tavily",
      },
    },
  },
}
```

Lorsque vous choisissez Tavily lors de l'intégration ou `openclaw configure --section web`, OpenClaw active automatiquement le plugin Tavily inclus, de sorte que `web_search`, `tavily_search` et `tavily_extract` sont tous disponibles.

**Mode de contexte Brave LLM :**

```json5
{
  plugins: {
    entries: {
      brave: {
        config: {
          webSearch: {
            apiKey: "YOUR_BRAVE_API_KEY", // optional if BRAVE_API_KEY is set // pragma: allowlist secret
            mode: "llm-context",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "brave",
      },
    },
  },
}
```

`llm-context` renvoie des extraits de pages extraits pour le grounding au lieu des extraits Brave standard.
Dans ce mode, `country` et `language` / `search_lang` fonctionnent toujours, mais `ui_lang`,
`freshness`, `date_after` et `date_before` sont rejetés.

**Recherche Perplexity :**

```json5
{
  plugins: {
    entries: {
      perplexity: {
        config: {
          webSearch: {
            apiKey: "pplx-...", // optional if PERPLEXITY_API_KEY is set
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "perplexity",
      },
    },
  },
}
```

**Perplexity via OpenRouter / compatibilité Sonar :**

```json5
{
  plugins: {
    entries: {
      perplexity: {
        config: {
          webSearch: {
            apiKey: "<openrouter-api-key>", // optional if OPENROUTER_API_KEY is set
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
        enabled: true,
        provider: "perplexity",
      },
    },
  },
}
```

## Utilisation de Gemini (grounding Google Search)

Les modèles Gemini prennent en charge le [grounding Google Search](https://ai.google.dev/gemini-api/docs/grounding) intégré,
qui renvoie des réponses synthétisées par l'IA étayées par des résultats en direct de Google Search avec des citations.

### Obtenir une clé API Gemini

1. Accédez à [Google AI Studio](https://aistudio.google.com/apikey)
2. Créer une clé API
3. Définissez `GEMINI_API_KEY` dans l'environnement de la passerelle, ou configurez `plugins.entries.google.config.webSearch.apiKey`

### Configuration de la recherche Gemini

```json5
{
  plugins: {
    entries: {
      google: {
        config: {
          webSearch: {
            // API key (optional if GEMINI_API_KEY is set)
            apiKey: "AIza...",
            // Model (defaults to "gemini-2.5-flash")
            model: "gemini-2.5-flash",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "gemini",
      },
    },
  },
}
```

**Alternative d'environnement :** définissez `GEMINI_API_KEY` dans l'environnement de la passerelle.
Pour une installation de passerelle, placez-la dans `~/.openclaw/.env`.

### Notes

- Les URL de citation provenant du grounding Gemini sont automatiquement résolues à partir des
  URL de redirection de Google vers les URL directes.
- La résolution des redirections utilise le chemin de protection SSRF (HEAD + vérifications des redirections + validation http/https) avant de renvoyer l'URL de citation finale.
- La résolution des redirections utilise des paramètres SSRF stricts, par conséquent les redirections vers des cibles privées/internes sont bloquées.
- Le modèle par défaut (`gemini-2.5-flash`) est rapide et rentable.
  Tout modèle Gemini prenant en charge le grounding peut être utilisé.

## web_search

Rechercher sur le Web en utilisant votre fournisseur configuré.

### Conditions requises

- `tools.web.search.enabled` ne doit pas être `false` (par défaut : activé)
- Clé API pour votre fournisseur choisi :
  - **Brave** : `BRAVE_API_KEY` ou `plugins.entries.brave.config.webSearch.apiKey`
  - **Firecrawl** : `FIRECRAWL_API_KEY` ou `plugins.entries.firecrawl.config.webSearch.apiKey`
  - **Gemini** : `GEMINI_API_KEY` ou `plugins.entries.google.config.webSearch.apiKey`
  - **Grok** : `XAI_API_KEY` ou `plugins.entries.xai.config.webSearch.apiKey`
  - **Kimi** : `KIMI_API_KEY`, `MOONSHOT_API_KEY`, ou `plugins.entries.moonshot.config.webSearch.apiKey`
  - **Perplexity** : `PERPLEXITY_API_KEY`, `OPENROUTER_API_KEY`, ou `plugins.entries.perplexity.config.webSearch.apiKey`
  - **Tavily** : `TAVILY_API_KEY` ou `plugins.entries.tavily.config.webSearch.apiKey`
- Tous les champs de clé de fournisseur ci-dessus prennent en charge les objets SecretRef.

### Configuration

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        apiKey: "BRAVE_API_KEY_HERE", // optional if BRAVE_API_KEY is set
        maxResults: 5,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
      },
    },
  },
}
```

### Paramètres de l'outil

Les paramètres dépendent du fournisseur sélectionné.

Le chemin de compatibilité OpenRouter / Sonar de Perplexity ne prend en charge que `query` et `freshness`.
Si vous définissez `plugins.entries.perplexity.config.webSearch.baseUrl` / `model`, utilisez `OPENROUTER_API_KEY`, ou configurez une clé `sk-or-...` sous `plugins.entries.perplexity.config.webSearch.apiKey`, les filtres exclusifs à l'OpenRouter de recherche renvoient des erreurs explicites.

| Paramètre             | Description                                                                         |
| --------------------- | ----------------------------------------------------------------------------------- |
| `query`               | Requête de recherche (requis)                                                       |
| `count`               | Résultats à renvoyer (1-10, par défaut : 5)                                         |
| `country`             | Code de pays ISO à 2 lettres (ex. "US", "DE")                                       |
| `language`            | Code de langue ISO 639-1 (ex. "en", "de")                                           |
| `freshness`           | Filtre de temps : `day`, `week`, `month` ou `year`                                  |
| `date_after`          | Résultats après cette date (YYYY-MM-DD)                                             |
| `date_before`         | Résultats avant cette date (YYYY-MM-DD)                                             |
| `ui_lang`             | Code de langue de l'interface (Brave uniquement)                                    |
| `domain_filter`       | Tableau de liste d'autorisation/liste de blocage de domaine (Perplexity uniquement) |
| `max_tokens`          | Budget total de contenu, par défaut 25000 (Perplexity uniquement)                   |
| `max_tokens_per_page` | Limite de jetons par page, par défaut 2048 (Perplexity uniquement)                  |

Firecrawl `web_search` prend en charge `query` et `count`. Pour les contrôles spécifiques à Firecrawl comme `sources`, `categories`, le scraping de résultats ou le délai d'attente du scraping, utilisez `firecrawl_search` depuis le plugin Firecrawl inclus.

Tavily `web_search` prend en charge `query` et `count` (jusqu'à 20 résultats). Pour les contrôles spécifiques à Tavily comme `search_depth`, `topic`, `include_answer` ou les filtres de domaine, utilisez `tavily_search` depuis le plugin Tavily inclus. Pour l'extraction de contenu d'URL, utilisez `tavily_extract`. Consultez [Tavily](/fr/tools/tavily) pour plus de détails.

**Exemples :**

```javascript
// German-specific search
await web_search({
  query: "TV online schauen",
  country: "DE",
  language: "de",
});

// Recent results (past week)
await web_search({
  query: "TMBG interview",
  freshness: "week",
});

// Date range search
await web_search({
  query: "AI developments",
  date_after: "2024-01-01",
  date_before: "2024-06-30",
});

// Domain filtering (Perplexity only)
await web_search({
  query: "climate research",
  domain_filter: ["nature.com", "science.org", ".edu"],
});

// Exclude domains (Perplexity only)
await web_search({
  query: "product reviews",
  domain_filter: ["-reddit.com", "-pinterest.com"],
});

// More content extraction (Perplexity only)
await web_search({
  query: "detailed AI research",
  max_tokens: 50000,
  max_tokens_per_page: 4096,
});
```

Lorsque le mode Brave `llm-context` est activé, `ui_lang`, `freshness`, `date_after` et
`date_before` ne sont pas pris en charge. Utilisez le mode Brave `web` pour ces filtres.

## web_fetch

Récupérer une URL et extraire le contenu lisible.

### web_fetch exigences

- `tools.web.fetch.enabled` ne doit pas être `false` (par défaut : activé)
- Alternative de repli Firecrawl optionnelle : définissez `tools.web.fetch.firecrawl.apiKey` ou `FIRECRAWL_API_KEY`.
- `tools.web.fetch.firecrawl.apiKey` prend en charge les objets SecretRef.

### web_fetch configuration

```json5
{
  tools: {
    web: {
      fetch: {
        enabled: true,
        maxChars: 50000,
        maxCharsCap: 50000,
        maxResponseBytes: 2000000,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
        maxRedirects: 3,
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        readability: true,
        firecrawl: {
          enabled: true,
          apiKey: "FIRECRAWL_API_KEY_HERE", // optional if FIRECRAWL_API_KEY is set
          baseUrl: "https://api.firecrawl.dev",
          onlyMainContent: true,
          maxAgeMs: 86400000, // ms (1 day)
          timeoutSeconds: 60,
        },
      },
    },
  },
}
```

### web_fetch paramètres de l'outil

- `url` (requis, http/https uniquement)
- `extractMode` (`markdown` | `text`)
- `maxChars` (tronquer les longues pages)

Notes :

- `web_fetch` utilise Readability (extraction du contenu principal) en premier, puis Firecrawl (si configuré). Si les deux échouent, l'outil renvoie une erreur.
- Les requêtes Firecrawl utilisent le mode de contournement des bots et mettent en cache les résultats par défaut.
- Les SecretRefs Firecrawl ne sont résolus que lorsque Firecrawl est actif (`tools.web.fetch.enabled !== false` et `tools.web.fetch.firecrawl.enabled !== false`).
- Si Firecrawl est actif et que son SecretRef n'est pas résolu sans repli `FIRECRAWL_API_KEY`, le démarrage/rechargement échoue rapidement.
- `web_fetch` envoie un User-Agent semblable à Chrome et `Accept-Language` par défaut ; remplacez `userAgent` si nécessaire.
- `web_fetch` bloque les noms d'hôte privés/internes et vérifie à nouveau les redirections (limitez avec `maxRedirects`).
- `maxChars` est limité à `tools.web.fetch.maxCharsCap`.
- `web_fetch` limite la taille du corps de réponse téléchargé à `tools.web.fetch.maxResponseBytes` avant l'analyse ; les réponses trop volumineuses sont tronquées et incluent un avertissement.
- `web_fetch` est une extraction au mieux effort ; certains sites auront besoin de l'outil de navigateur.
- Voir [Firecrawl](/fr/tools/firecrawl) pour la configuration de la clé et les détails du service.
- Les réponses sont mises en cache (par défaut 15 minutes) pour réduire les récupérations répétées.
- Si vous utilisez des profils d'outils/listes d'autorisation, ajoutez `web_search`/`web_fetch` ou `group:web`.
- Si la clé API est manquante, `web_search` renvoie un court indice de configuration avec un lien vers la documentation.

import fr from "/components/footer/fr.mdx";

<fr />
