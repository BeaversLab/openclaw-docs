---
summary: "Outils de recherche web + récupération (fournisseurs Brave, Gemini, Grok, Kimi et Perplexity)"
read_when:
  - You want to enable web_search or web_fetch
  - You need provider API key setup
  - You want to use Gemini with Google Search grounding
title: "Outils Web"
---

# Outils Web

OpenClaw fournit deux outils Web légers :

- `web_search` — Recherche le web en utilisant l'Brave de recherche API, Gemini avec Google Search grounding, Grok, Kimi ou l'Perplexity de recherche API.
- `web_fetch` — Récupération HTTP + extraction lisible (HTML → markdown/texte).

Ce n'est **pas** une automatisation de navigateur. Pour les sites riches en JS ou les connexions, utilisez l'
[outil de navigateur](/fr/tools/browser).

## Fonctionnement

- `web_search` appelle votre fournisseur configuré et renvoie les résultats.
- Les résultats sont mis en cache par requête pendant 15 minutes (configurable).
- `web_fetch` effectue une requête HTTP GET simple et extrait le contenu lisible
  (HTML → markdown/texte). Il n'exécute **pas** JavaScript.
- `web_fetch` est activé par défaut (sauf s'il est explicitement désactivé).

Voir la [configuration de la recherche Brave](/fr/brave-search) et la [configuration de la recherche Perplexity](/fr/perplexity) pour les détails spécifiques au fournisseur.

## Choisir un fournisseur de recherche

| Fournisseur                 | Format des résultats                     | Filtres spécifiques au fournisseur            | Notes                                                                                                       | Clé API                                     |
| --------------------------- | ---------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Brave de recherche API      | Résultats structurés avec extraits       | `country`, `language`, `ui_lang`, heure       | Prend en charge le mode `llm-context` de Brave                                                              | `BRAVE_API_KEY`                             |
| **Gemini**                  | Réponses synthétisées par IA + citations | —                                             | Utilise le grounding Google Search                                                                          | `GEMINI_API_KEY`                            |
| **Grok**                    | Réponses synthétisées par IA + citations | —                                             | Utilise les réponses ancrées sur le web d'xAI                                                               | `XAI_API_KEY`                               |
| **Kimi**                    | Réponses synthétisées par IA + citations | —                                             | Utilise la recherche web Moonshot                                                                           | `KIMI_API_KEY` / `MOONSHOT_API_KEY`         |
| Perplexity de recherche API | Résultats structurés avec extraits       | `country`, `language`, heure, `domain_filter` | Prend en charge les contrôles d'extraction de contenu ; OpenRouter utilise le chemin de compatibilité Sonar | `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` |

### Détection automatique

Le tableau ci-dessus est classé par ordre alphabétique. Si aucun `provider` n'est explicitement défini, la détection automatique à l'exécution vérifie les providers dans cet ordre :

1. **Brave** — variable d'env `BRAVE_API_KEY` ou config `tools.web.search.apiKey`
2. **Gemini** — variable d'env `GEMINI_API_KEY` ou config `tools.web.search.gemini.apiKey`
3. **Grok** — variable d'env `XAI_API_KEY` ou config `tools.web.search.grok.apiKey`
4. **Kimi** — variable d'env `KIMI_API_KEY` / `MOONSHOT_API_KEY` ou config `tools.web.search.kimi.apiKey`
5. **Perplexity** — config `PERPLEXITY_API_KEY`, `OPENROUTER_API_KEY`, ou `tools.web.search.perplexity.apiKey`

Si aucune clé n'est trouvée, le système revient à Brave (vous obtiendrez une erreur de clé manquante vous invitant à en configurer une).

Comportement SecretRef à l'exécution :

- Les SecretRefs des outils Web sont résolus de manière atomique au démarrage/rechargement de la passerelle.
- En mode détection automatique, OpenClaw résout uniquement la clé du provider sélectionné. Les SecretRefs des providers non sélectionnés restent inactifs jusqu'à leur sélection.
- Si le SecretRef du provider sélectionné n'est pas résolu et qu'aucune repli d'env de provider n'existe, le démarrage/rechargement échoue rapidement.

## Configuration de la recherche Web

Utilisez `openclaw configure --section web` pour configurer votre clé API et choisir un provider.

### Recherche Brave

1. Créez un compte de recherche Brave API sur [brave.com/search/api](https://brave.com/search/api/)
2. Dans le tableau de bord, choisissez le plan **Search** et générez une clé API.
3. Exécutez `openclaw configure --section web` pour stocker la clé dans la configuration, ou définissez `BRAVE_API_KEY` dans votre environnement.

Chaque forfait Brave inclut **\$5/mois de crédit gratuit** (renouvelable). Le forfait Search coûte \$5 pour 1 000 requêtes, donc le crédit couvre 1 000 requêtes par mois. Définissez votre limite d'utilisation dans le tableau de bord Brave pour éviter des frais inattendus. Consultez le [portail Brave API](https://brave.com/search/api/) pour les forfaits et tarifs actuels.

### Recherche Perplexity

1. Créez un compte Perplexity sur [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api)
2. Générez une clé API dans le tableau de bord
3. Exécutez `openclaw configure --section web` pour stocker la clé dans la configuration, ou définissez `PERPLEXITY_API_KEY` dans votre environnement.

Pour la compatibilité héritée avec Sonar/OpenRouter, définissez `OPENROUTER_API_KEY` à la place, ou configurez `tools.web.search.perplexity.apiKey` avec une clé `sk-or-...`. Définir `tools.web.search.perplexity.baseUrl` ou `model` réactive également Perplexity dans le chemin de compatibilité des complétions de chat.

Consultez la [documentation de l'Perplexity de recherche API](https://docs.perplexity.ai/guides/search-quickstart) pour plus de détails.

### Où stocker la clé

**Via la configuration :** exécutez `openclaw configure --section web`. Elle stocke la clé sous le chemin de configuration spécifique au provider :

- Brave : `tools.web.search.apiKey`
- Gemini : `tools.web.search.gemini.apiKey`
- Grok : `tools.web.search.grok.apiKey`
- Kimi : `tools.web.search.kimi.apiKey`
- Perplexity : `tools.web.search.perplexity.apiKey`

Tous ces champs prennent également en charge les objets SecretRef.

**Via l'environnement :** définissez les variables d'environnement du provider dans l'environnement du processus Gateway :

- Brave : `BRAVE_API_KEY`
- Gemini : `GEMINI_API_KEY`
- Grok : `XAI_API_KEY`
- Kimi : `KIMI_API_KEY` ou `MOONSHOT_API_KEY`
- Perplexity : `PERPLEXITY_API_KEY` ou `OPENROUTER_API_KEY`

Pour une installation de gateway, placez-les dans `~/.openclaw/.env` (ou dans l'environnement de votre service). Consultez [Variables d'environnement](/fr/help/faq#how-does-openclaw-load-environment-variables).

### Exemples de configuration

**Recherche Brave :**

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "brave",
        apiKey: "YOUR_BRAVE_API_KEY", // optional if BRAVE_API_KEY is set // pragma: allowlist secret
      },
    },
  },
}
```

**Mode de contexte Brave LLM :**

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "brave",
        apiKey: "YOUR_BRAVE_API_KEY", // optional if BRAVE_API_KEY is set // pragma: allowlist secret
        brave: {
          mode: "llm-context",
        },
      },
    },
  },
}
```

`llm-context` renvoie des extraits de page extraits pour le grounding au lieu des extraits standards Brave.
Dans ce mode, `country` et `language` / `search_lang` fonctionnent toujours, mais `ui_lang`,
`freshness`, `date_after` et `date_before` sont rejetés.

**Recherche Perplexity :**

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "perplexity",
        perplexity: {
          apiKey: "pplx-...", // optional if PERPLEXITY_API_KEY is set
        },
      },
    },
  },
}
```

**Perplexity via OpenRouter / compatibilité Sonar :**

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "perplexity",
        perplexity: {
          apiKey: "<openrouter-api-key>", // optional if OPENROUTER_API_KEY is set
          baseUrl: "https://openrouter.ai/api/v1",
          model: "perplexity/sonar-pro",
        },
      },
    },
  },
}
```

## Utilisation de Gemini (Google Search grounding)

Les modèles Gemini prennent en charge le [Google Search grounding](https://ai.google.dev/gemini-api/docs/grounding) intégré,
qui renvoie des réponses synthétisées par l'IA basées sur les résultats en temps réel de Google Search avec des citations.

### Obtenir une clé API Gemini

1. Accéder à [Google AI Studio](https://aistudio.google.com/apikey)
2. Créer une clé API
3. Définissez `GEMINI_API_KEY` dans l'environnement Gateway ou configurez `tools.web.search.gemini.apiKey`

### Configuration de la recherche Gemini

```json5
{
  tools: {
    web: {
      search: {
        provider: "gemini",
        gemini: {
          // API key (optional if GEMINI_API_KEY is set)
          apiKey: "AIza...",
          // Model (defaults to "gemini-2.5-flash")
          model: "gemini-2.5-flash",
        },
      },
    },
  },
}
```

**Alternative d'environnement :** définissez `GEMINI_API_KEY` dans l'environnement Gateway.
Pour une installation de passerelle, placez-la dans `~/.openclaw/.env`.

### Notes

- Les URL de citation provenant du grounding Gemini sont automatiquement résolues à partir des
  URL de redirection de Google vers les URL directes.
- La résolution des redirections utilise le chemin de garde SSRF (HEAD + vérifications des redirections + validation http/https) avant de renvoyer l'URL de citation finale.
- La résolution des redirections utilise les paramètres SSRF stricts, donc les redirections vers des cibles privées/internal sont bloquées.
- Le modèle par défaut (`gemini-2.5-flash`) est rapide et rentable.
  Tout modèle Gemini prenant en charge le grounding peut être utilisé.

## web_search

Rechercher sur le Web en utilisant votre provider configuré.

### Conditions requises

- `tools.web.search.enabled` ne doit pas être `false` (par défaut : activé)
- Clé API pour le provider de votre choix :
  - **Brave** : `BRAVE_API_KEY` ou `tools.web.search.apiKey`
  - **Gemini** : `GEMINI_API_KEY` ou `tools.web.search.gemini.apiKey`
  - **Grok** : `XAI_API_KEY` ou `tools.web.search.grok.apiKey`
  - **Kimi** : `KIMI_API_KEY`, `MOONSHOT_API_KEY` ou `tools.web.search.kimi.apiKey`
  - **Perplexity** : `PERPLEXITY_API_KEY`, `OPENROUTER_API_KEY` ou `tools.web.search.perplexity.apiKey`
- Tous les champs de clé de provider ci-dessus prennent en charge les objets SecretRef.

### Config

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

Tous les paramètres fonctionnent pour Brave et pour l'API de recherche native Perplexity, sauf indication contraire.

Le chemin de compatibilité Perplexity / Sonar de OpenRouter prend uniquement en charge `query` et `freshness`.
Si vous définissez `tools.web.search.perplexity.baseUrl` / `model`, utilisez `OPENROUTER_API_KEY` ou configurez une clé `sk-or-...`, les filtres exclusifs à l'API de recherche API renvoient des erreurs explicites.

| Paramètre             | Description                                                                     |
| --------------------- | ------------------------------------------------------------------------------- |
| `query`               | Requête de recherche (requise)                                                  |
| `count`               | Résultats à renvoyer (1-10, par défaut : 5)                                     |
| `country`             | Code de pays ISO à 2 lettres (par exemple, "US", "DE")                          |
| `language`            | Code de langue ISO 639-1 (par exemple, "en", "de")                              |
| `freshness`           | Filtre temporel : `day`, `week`, `month` ou `year`                              |
| `date_after`          | Résultats après cette date (YYYY-MM-DD)                                         |
| `date_before`         | Résultats avant cette date (YYYY-MM-DD)                                         |
| `ui_lang`             | Code de langue de l'interface (Brave uniquement)                                |
| `domain_filter`       | Tableau de liste d'autorisation/d'exclusion de domaines (Perplexity uniquement) |
| `max_tokens`          | Budget total de contenu, par défaut 25000 (Perplexity uniquement)               |
| `max_tokens_per_page` | Limite de jetons par page, par défaut 2048 (Perplexity uniquement)              |

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

Lorsque le mode `llm-context` de Brave est activé, `ui_lang`, `freshness`, `date_after` et
`date_before` ne sont pas pris en charge. Utilisez le mode `web` de Brave pour ces filtres.

## web_fetch

Récupérer une URL et extraire le contenu lisible.

### conditions requises pour web_fetch

- `tools.web.fetch.enabled` ne doit pas être `false` (par défaut : activé)
- Secours Firecrawl facultatif : définissez `tools.web.fetch.firecrawl.apiKey` ou `FIRECRAWL_API_KEY`.
- `tools.web.fetch.firecrawl.apiKey` prend en charge les objets SecretRef.

### configuration web_fetch

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

### paramètres de l'outil web_fetch

- `url` (requis, http/https uniquement)
- `extractMode` (`markdown` | `text`)
- `maxChars` (tronquer les longues pages)

Notes :

- `web_fetch` utilise d'abord Readability (extraction du contenu principal), puis Firecrawl (si configuré). Si les deux échouent, l'outil renvoie une erreur.
- Les requêtes Firecrawl utilisent le mode de contournement des bots et mettent en cache les résultats par défaut.
- Les SecretRefs Firecrawl ne sont résolus que lorsque Firecrawl est actif (`tools.web.fetch.enabled !== false` et `tools.web.fetch.firecrawl.enabled !== false`).
- Si Firecrawl est actif et que son SecretRef n'est pas résolu sans secours `FIRECRAWL_API_KEY`, le démarrage/rechargement échoue rapidement.
- `web_fetch` envoie un User-Agent de type Chrome et `Accept-Language` par défaut ; remplacez `userAgent` si nécessaire.
- `web_fetch` bloque les noms d'hôte privés/internes et vérifie à nouveau les redirections (limitez avec `maxRedirects`).
- `maxChars` est limité à `tools.web.fetch.maxCharsCap`.
- `web_fetch` limite la taille du corps de réponse téléchargé à `tools.web.fetch.maxResponseBytes` avant l'analyse ; les réponses trop volumineuses sont tronquées et incluent un avertissement.
- `web_fetch` est une extraction au mieux effort ; certains sites auront besoin de l'outil de navigateur.
- Voir [Firecrawl](/fr/tools/firecrawl) pour la configuration de la clé et les détails du service.
- Les réponses sont mises en cache (15 minutes par défaut) pour réduire les récupérations répétées.
- Si vous utilisez des profils/listes d'autorisation de outils, ajoutez `web_search`/`web_fetch` ou `group:web`.
- Si la clé API est manquante, `web_search` renvoie un court indice de configuration avec un lien vers la documentation.

import fr from "/components/footer/fr.mdx";

<fr />
