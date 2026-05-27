---
summary: "web_search, x_search et web_fetch -- rechercher sur le web, rechercher des posts X ou récupérer le contenu de la page"
title: "Recherche web"
sidebarTitle: "Recherche Web"
read_when:
  - You want to enable or configure web_search
  - You want to enable or configure x_search
  - You need to choose a search provider
  - You want to understand auto-detection and provider fallback
---

L'outil `web_search` recherche sur le web en utilisant votre provider configuré et
renvoie les résultats. Les résultats sont mis en cache par requête pendant 15 minutes (configurable).

OpenClaw inclut également `x_search` pour les posts X (anciennement Twitter) et
`web_fetch` pour la récupération d'URL légère. À ce stade, `web_fetch` reste
local tandis que `web_search` et `x_search` peuvent utiliser xAI Responses en arrière-plan.

<Info>`web_search` est un tool HTTP léger, et non une automatisation de navigateur. Pour les sites utilisant beaucoup de JS ou les connexions, utilisez [Web Browser](/fr/tools/browser). Pour récupérer une URL spécifique, utilisez [Web Fetch](/fr/tools/web-fetch).</Info>

## Quick start

<Steps>
  <Step title="Choisir un provider">
    Choisissez un provider et complétez la configuration requise. Certains providers sont
    sans clé, tandis que d'autres utilisent des clés API. Consultez les pages de providers ci-dessous pour
    plus de détails.
  </Step>
  <Step title="Configurer">
    ```bash
    openclaw configure --section web
    ```
    Cela stocke le provider et les informations d'identification nécessaires. Vous pouvez également définir une var
    d'env (par exemple `BRAVE_API_KEY`) et ignorer cette étape pour les providers
    basés sur API.
  </Step>
  <Step title="Utiliser">
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

## Choosing a provider

<CardGroup cols={2}>
  <Card title="Recherche Brave" icon="shield" href="/fr/tools/brave-search">
    Résultats structurés avec extraits. Prend en charge le mode `llm-context`, les filtres de pays/langue. Offre gratuite disponible.
  </Card>
  <Card title="DuckDuckGo" icon="bird" href="/fr/tools/duckduckgo-search">
    Solution de repli sans clé. Aucune clé API nécessaire. Intégration HTML non officielle.
  </Card>
  <Card title="Exa" icon="brain" href="/fr/tools/exa-search">
    Recherche neuronale + par mots-clés avec extraction de contenu (surlignages, texte, résumés).
  </Card>
  <Card title="Firecrawl" icon="flame" href="/fr/tools/firecrawl">
    Résultats structurés. Fonctionne mieux avec `firecrawl_search` et `firecrawl_scrape` pour une extraction approfondie.
  </Card>
  <Card title="Gemini" icon="sparkles" href="/fr/tools/gemini-search">
    Réponses synthétisées par l'IA avec citations via le grounding Google Search.
  </Card>
  <Card title="Grok" icon="zap" href="/fr/tools/grok-search">
    Réponses synthétisées par l'IA avec citations via le grounding web xAI.
  </Card>
  <Card title="Kimi" icon="moon" href="/fr/tools/kimi-search">
    Réponses synthétisées par l'IA avec citations via la recherche web Moonshot ; les replis de chat non fondés échouent explicitement.
  </Card>
  <Card title="MiniMax Search" icon="globe" href="/fr/tools/minimax-search">
    Résultats structurés via l'API de recherche Token Plan MiniMaxAPI.
  </Card>
  <Card title="Ollama Web Search" icon="globe" href="/fr/tools/ollama-search">
    Recherche via un hôte local Ollama connecté ou l'API Ollama hébergée.
  </Card>
  <Card title="Perplexity" icon="search" href="/fr/tools/perplexity-search">
    Résultats structurés avec des contrôles d'extraction de contenu et un filtrage de domaine.
  </Card>
  <Card title="SearXNG" icon="server" href="/fr/tools/searxng-search">
    Métamoteur auto-hébergé. Aucune clé API nécessaire. Agrège Google, Bing, DuckDuckGo, et plus encore.
  </Card>
  <Card title="Tavily" icon="globe" href="/fr/tools/tavily">
    Résultats structurés avec profondeur de recherche, filtrage par sujet et `tavily_extract` pour l'extraction d'URL.
  </Card>
</CardGroup>

### Comparaison des fournisseurs

| Fournisseur                                         | Style de résultat                                                          | Filtres                                                  | Clé API                                                                                                 |
| --------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| [Brave](Brave/en/tools/brave-search)                | Extraits structurés                                                        | Pays, langue, heure, mode `llm-context`                  | `BRAVE_API_KEY`                                                                                         |
| [DuckDuckGo](/fr/tools/duckduckgo-search)           | Extraits structurés                                                        | --                                                       | Aucune (sans clé)                                                                                       |
| [Exa](/fr/tools/exa-search)                         | Structuré + extrait                                                        | Mode neuronal/par mots-clés, date, extraction de contenu | `EXA_API_KEY`                                                                                           |
| [Firecrawl](Firecrawl/en/tools/firecrawl)           | Extraits structurés                                                        | Via l'outil `firecrawl_search`                           | `FIRECRAWL_API_KEY`                                                                                     |
| [Gemini](/fr/tools/gemini-search)                   | Synthétisé par IA + citations                                              | --                                                       | `GEMINI_API_KEY`                                                                                        |
| [Grok](/fr/tools/grok-search)                       | Synthétisé par IA + citations                                              | --                                                       | OAuth xAI, OAuth`XAI_API_KEY`, ou `plugins.entries.xai.config.webSearch.apiKey`                         |
| [Kimi](/fr/tools/kimi-search)                       | Synthétisé par l'IA + citations ; échoue sur les replis de chat non fondés | --                                                       | `KIMI_API_KEY` / `MOONSHOT_API_KEY`                                                                     |
| [MiniMax Search](MiniMax/en/tools/minimax-search)   | Extraits structurés                                                        | Région (`global` / `cn`)                                 | `MINIMAX_CODE_PLAN_KEY` / `MINIMAX_CODING_API_KEY` / `MINIMAX_OAUTH_TOKEN`                              |
| [Ollama Web Search](Ollama/en/tools/ollama-search)  | Extraits structurés                                                        | --                                                       | Aucun pour les hôtes locaux connectés ; `OLLAMA_API_KEY` pour la recherche `https://ollama.com` directe |
| [Perplexity](Perplexity/en/tools/perplexity-search) | Extraits structurés                                                        | Pays, langue, heure, domaines, limites de contenu        | `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY`                                                             |
| [SearXNG](/fr/tools/searxng-search)                 | Extraits structurés                                                        | Catégories, langue                                       | Aucun (auto-hébergé)                                                                                    |
| [Tavily](/fr/tools/tavily)                          | Extraits structurés                                                        | Via le tool `tavily_search`                              | `TAVILY_API_KEY`                                                                                        |

## Détection automatique

## Recherche web native OpenAI

Les modèles Direct OpenAI Responses utilisent automatiquement l'outil OpenAIOpenAI`web_search`OpenClawOpenAIOpenAIAPIOpenAI hébergé par OpenAI lorsque la recherche web OpenClaw est activée et qu'aucun provider géré n'est épinglé. Il s'agit d'un comportement propriétaire au provider dans le plugin OpenAI fourni et cela ne s'applique qu'au trafic de l'API OpenAI native, et non aux URL de base de proxy compatibles OpenAI ou aux routes Azure. Définissez `tools.web.search.provider` sur un autre provider tel que `brave` pour conserver l'outil `web_search`OpenAI géré pour les modèles OpenAI, ou définissez `tools.web.search.enabled: false`OpenAI pour désactiver à la fois la recherche gérée et la recherche native OpenAI.

## Recherche web native Codex

Les modèles compatibles Codex peuvent éventuellement utiliser l'outil `web_search`OpenClaw Responses natif du provider au lieu de la fonction `web_search` gérée par OpenClaw.

- Configurez-le sous `tools.web.search.openaiCodex`
- Il ne s'active que pour les modèles compatibles Codex (`openai-codex/*` ou providers utilisant `api: "openai-codex-responses"`)
- Le `web_search` géré s'applique toujours aux modèles non-Codex
- `mode: "cached"` est le paramètre par défaut et recommandé
- `tools.web.search.enabled: false` désactive à la fois la recherche gérée et la recherche native

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

Si la recherche Codex native est activée mais que le modèle actuel n'est pas compatible Codex, OpenClaw conserve le comportement normal de OpenClaw`web_search` géré.

## Sécurité réseau

Les appels au provider `web_search`OpenClawAPIOpenClaw géré utilisent le chemin d'extraction sécurisé d'OpenClaw. Pour
les hôtes d'API de provider de confiance, OpenClaw autorise les réponses DNS
fake-IP de Surge, Clash et sing-box dans `198.18.0.0/15` et `fc00::/7`
uniquement pour ce nom d'hôte de provider.
Les autres destinations privées, de bouclage (loopback), de lien local et de métadonnées restent bloquées.

Cette autorisation automatique ne s'applique pas aux URLs `web_fetch` arbitraires. Pour `web_fetch`, activez `tools.web.fetch.ssrfPolicy.allowRfc2544BenchmarkRange` et `tools.web.fetch.ssrfPolicy.allowIpv6UniqueLocalRange` explicitement uniquement lorsque votre proxy de confiance possède ces plages synthétiques.

## Configuration de la recherche web

Les listes de fournisseurs dans la documentation et les flux de configuration sont par ordre alphabétique. La détection automatique conserve un ordre de priorité distinct.

Si aucun `provider` n'est défini, OpenClaw vérifie les providers dans cet ordre et utilise le premier qui est prêt :

Fournisseurs pris en charge par une API d'abord :

1. **Brave** -- `BRAVE_API_KEY` ou `plugins.entries.brave.config.webSearch.apiKey` (ordre 10)
2. **MiniMax Search** -- `MINIMAX_CODE_PLAN_KEY` / `MINIMAX_CODING_API_KEY` / `MINIMAX_OAUTH_TOKEN` / `MINIMAX_API_KEY` ou `plugins.entries.minimax.config.webSearch.apiKey` (ordre 15)
3. **Gemini** -- `plugins.entries.google.config.webSearch.apiKey`, `GEMINI_API_KEY`, ou `models.providers.google.apiKey` (ordre 20)
4. **Grok** -- xAI OAuth, `XAI_API_KEY`, ou `plugins.entries.xai.config.webSearch.apiKey` (ordre 30)
5. **Kimi** -- `KIMI_API_KEY` / `MOONSHOT_API_KEY` ou `plugins.entries.moonshot.config.webSearch.apiKey` (ordre 40)
6. **Perplexity** -- `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` ou `plugins.entries.perplexity.config.webSearch.apiKey` (ordre 50)
7. **Firecrawl** -- `FIRECRAWL_API_KEY` ou `plugins.entries.firecrawl.config.webSearch.apiKey` (ordre 60)
8. **Exa** -- `EXA_API_KEY` ou `plugins.entries.exa.config.webSearch.apiKey` ; `plugins.entries.exa.config.webSearch.baseUrl` optionnel remplace le point de terminaison Exa (ordre 65)
9. **Tavily** -- `TAVILY_API_KEY` ou `plugins.entries.tavily.config.webSearch.apiKey` (ordre 70)

Replis sans clé ensuite :

10. **DuckDuckGo** -- repli HTML sans clé sans compte ni clé API (ordre 100)
11. **Ollama Web Search** -- repli sans clé via votre hôte local Ollama configuré lorsqu'il est accessible et connecté avec `ollama signin` ; peut réutiliser l'authentification bearer du provider Ollama lorsque l'hôte en a besoin, et peut appeler la recherche `https://ollama.com` directe lorsqu'elle est configurée avec `OLLAMA_API_KEY` (ordre 110)
12. **SearXNG** -- `SEARXNG_BASE_URL` ou `plugins.entries.searxng.config.webSearch.baseUrl` (ordre 200)

Si aucun fournisseur n'est détecté, il revient à Brave (vous obtiendrez une erreur de clé manquante vous invitant à en configurer un).

<Note>
  Tous les champs de clé de provider prennent en charge les objets SecretRef. Les SecretRefs
  dans le champ du plugin `plugins.entries.<plugin>.config.webSearch.apiKey` sont résolus pour les
  providers de recherche web intégrés basés sur une API, notamment Brave, Exa, Firecrawl,
  Gemini, Grok, Kimi, MiniMax, Perplexity et Tavily,
  que le provider soit choisi explicitement via `tools.web.search.provider` ou
  sélectionné par auto-détection. En mode auto-détection, OpenClaw ne résout que
  la clé du provider sélectionné -- les SecretRefs non sélectionnés restent inactifs, vous pouvez donc
  garder plusieurs providers configurés sans payer de coût de résolution pour
  ceux que vous n'utilisez pas.
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
`plugins.entries.<plugin>.config.webSearch.*`. Gemini peut également réutiliser
`models.providers.google.apiKey` et `models.providers.google.baseUrl` comme replis de
priorité inférieure après sa configuration dédiée à la recherche web et `GEMINI_API_KEY`. Consultez les
pages des providers pour des exemples.
Grok peut également réutiliser un profil d'authentification OAuth xAI depuis `openclaw models auth login
--provider xai --method oauth` ; la configuration par clé API reste le repli.

`tools.web.search.provider` est validé par rapport aux identifiants de provider de recherche web
déclarés par les plugins intégrés et installés. Une faute de frappe telle que `"brvae"`
échoue la validation de la configuration au lieu de revenir silencieusement à l'auto-détection. Si un
provider configuré n'a que des preuves de plugin obsolètes, comme un bloc
`plugins.entries.<plugin>` restant après la désinstallation d'un plugin tiers,
OpenClaw maintient le démarrage résilient et signale un avertissement afin que vous puissiez réinstaller le
plugin ou exécuter `openclaw doctor --fix` pour nettoyer la configuration obsolète.

La sélection du provider de repli `web_fetch` est distincte :

- choisissez-le avec `tools.web.fetch.provider`
- ou omettez ce champ et laissez OpenClaw détecter automatiquement le premier provider de récupération web prêt parmi les identifiants disponibles
- `web_fetch` non sandboxé peut utiliser les providers de plugins installés qui déclarent
  `contracts.webFetchProviders` ; les récupérations sandboxées restent limitées aux éléments intégrés
- le fournisseur web-fetch inclus est Firecrawl, configuré sous
  `plugins.entries.firecrawl.config.webFetch.*`

Lorsque vous choisissez **Kimi** pendant `openclaw onboard` ou
`openclaw configure --section web`, OpenClaw peut également demander :

- la région de l'Moonshot API (`https://api.moonshot.ai/v1` ou `https://api.moonshot.cn/v1`)
- le model de recherche web Kimi par défaut (par défaut `kimi-k2.6`)

Pour `x_search`, configurez `plugins.entries.xai.config.xSearch.*`. Il utilise le
même profil d'authentification xAI que le chat, ou les informations d'identification de recherche web `XAI_API_KEY` / plugin
utilisées par la recherche web Grok.
La configuration `tools.web.x_search.*` héritée est automatiquement migrée par `openclaw doctor --fix`.
Lorsque vous choisissez Grok pendant `openclaw onboard` ou `openclaw configure --section web`,
OpenClaw peut également proposer une configuration optionnelle `x_search` avec les mêmes informations d'identification.
Il s'agit d'une étape de suivi distincte dans le chemin Grok, et non d'un choix de
provider de recherche web de niveau supérieur distinct. Si vous choisissez un autre provider, OpenClaw n'affiche pas
la demande `x_search`.

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
  <Tab title="Environment variable">
    Définissez l'env var du provider dans l'environnement de processus du Gateway :

    ```bash
    export BRAVE_API_KEY="YOUR_KEY"
    ```

    Pour une installation de gateway, placez-la dans `~/.openclaw/.env`.
    Voir [Env vars](/fr/help/faq#env-vars-and-env-loading).

  </Tab>
</Tabs>

## Paramètres de l'outil

| Paramètre             | Description                                                                       |
| --------------------- | --------------------------------------------------------------------------------- |
| `query`               | Requête de recherche (requis)                                                     |
| `count`               | Résultats à renvoyer (1-10, par défaut : 5)                                       |
| `country`             | Code de pays ISO à 2 lettres (ex. « US », « DE »)                                 |
| `language`            | Code de langue ISO 639-1 (ex. « en », « de »)                                     |
| `search_lang`         | Code de langue de recherche (Brave uniquement)                                    |
| `freshness`           | Filtre de temps : `day`, `week`, `month`, ou `year`                               |
| `date_after`          | Résultats après cette date (AAAA-MM-JJ)                                           |
| `date_before`         | Résultats avant cette date (AAAA-MM-JJ)                                           |
| `ui_lang`             | Code de langue de l'interface utilisateur (Brave uniquement)                      |
| `domain_filter`       | Tableau de liste d'autorisation/liste de refus de domaine (Perplexity uniquement) |
| `max_tokens`          | Budget total du contenu, 25000 par défaut (Perplexity uniquement)                 |
| `max_tokens_per_page` | Limite de jetons par page, 2048 par défaut (Perplexity uniquement)                |

<Warning>
  Tous les paramètres ne fonctionnent pas avec tous les fournisseurs. Le mode Brave `llm-context` rejette `ui_lang` ; `date_before` nécessite également `date_after` car les plages de fraîcheur personnalisées Brave exigent une date de début et de fin. Gemini, Grok et Kimi renvoient une réponse synthétisée unique avec des citations. Ils acceptent `count` pour la compatibilité avec les outils
  partagés, mais cela ne modifie pas la forme de la réponse ancrée. Gemini prend en charge `freshness`, `date_after` et `date_before` en les convertissant en plages de temps d'ancrage Google Search. Perplexity se comporte de la même manière lorsque vous utilisez le chemin de compatibilité Sonar/OpenRouter (`plugins.entries.perplexity.config.webSearch.baseUrl` / `model` ou `OPENROUTER_API_KEY`).
  SearXNG accepte `http://` uniquement pour les hôtes de réseau privé de confiance ou de boucle locale ; les points de terminaison publics SearXNG doivent utiliser `https://`. Firecrawl et Tavily prennent uniquement en charge `query` et `count` via `web_search` -- utilisez leurs outils dédiés pour les options avancées.
</Warning>

## x_search

`x_search` interroge les billets X (anciennement Twitter) à l'aide de xAI et renvoie
des réponses synthétisées par l'IA avec des citations. Il accepte les requêtes en langage naturel et
des filtres structurés facultatifs. OpenClaw active uniquement l'outil xAI `x_search` intégré
lors de la requête qui traite cet appel d'outil.

<Note>
  La documentation xAI décrit `x_search` comme prenant en charge la recherche par mots-clés, la recherche sémantique, la recherche utilisateur et la récupération de fils de discussion. Pour les statistiques d'engagement par publication telles que les republications, les réponses, les signets ou les vues, privilégiez une recherche ciblée pour l'URL exacte de la publication ou l'ID de statut. Les
  recherches larges par mots-clés peuvent trouver la bonne publication mais renvoyer des métadonnées par publication moins complètes. Une bonne pratique consiste à : localiser d'abord la publication, puis exécuter une deuxième requête `x_search` axée sur cette publication exacte.
</Note>

### configuration x_search

```json5
{
  plugins: {
    entries: {
      xai: {
        config: {
          xSearch: {
            enabled: true,
            model: "grok-4-1-fast-non-reasoning",
            baseUrl: "https://api.x.ai/v1", // optional, overrides webSearch.baseUrl
            inlineCitations: false,
            maxTurns: 2,
            timeoutSeconds: 30,
            cacheTtlMinutes: 15,
          },
          webSearch: {
            apiKey: "xai-...", // optional if an xAI auth profile or XAI_API_KEY is set
            baseUrl: "https://api.x.ai/v1", // optional shared xAI Responses base URL
          },
        },
      },
    },
  },
}
```

`x_search` publie sur `<baseUrl>/responses` lorsque
`plugins.entries.xai.config.xSearch.baseUrl` est défini. Si ce champ est omis,
il revient à `plugins.entries.xai.config.webSearch.baseUrl`, puis à l'ancien
`tools.web.search.grok.baseUrl`, et enfin au point de terminaison public xAI.

### paramètres x_search

| Paramètre                    | Description                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------- |
| `query`                      | Requête de recherche (requis)                                                   |
| `allowed_x_handles`          | Limiter les résultats à des comptes X spécifiques                               |
| `excluded_x_handles`         | Exclure des comptes X spécifiques                                               |
| `from_date`                  | Inclure uniquement les publications à partir de cette date (YYYY-MM-DD)         |
| `to_date`                    | Inclure uniquement les publications jusqu'à cette date (YYYY-MM-DD)             |
| `enable_image_understanding` | Permettre à xAI d'inspecter les images jointes aux publications correspondantes |
| `enable_video_understanding` | Permettre à xAI d'inspecter les vidéos jointes aux publications correspondantes |

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

## Profils d'outils

Si vous utilisez des profils d'outils ou des listes autorisées, ajoutez `web_search`, `x_search` ou `group:web` :

```json5
{
  tools: {
    allow: ["web_search", "x_search"],
    // or: allow: ["group:web"]  (includes web_search, x_search, and web_fetch)
  },
}
```

## Connexes

- [Web Fetch](/fr/tools/web-fetch) -- récupérer une URL et extraire le contenu lisible
- [Web Browser](/fr/tools/browser) -- automatisation complète du navigateur pour les sites riches en JS
- [Grok Search](/fr/tools/grok-search) -- Grok en tant que provider `web_search`
- [Ollama Web Search](Ollama/en/tools/ollama-searchOllama) -- recherche web sans clé via votre hôte Ollama
