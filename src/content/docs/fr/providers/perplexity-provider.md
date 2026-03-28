---
title: "Perplexity (Provider)"
summary: "Perplexity web search provider setup (API key, search modes, filtering)"
read_when:
  - You want to configure Perplexity as a web search provider
  - You need the Perplexity API key or OpenRouter proxy setup
---

# Perplexity (Web Search Provider)

Le plugin Perplexity fournit des capacités de recherche web via l'Perplexity
Search API ou Perplexity Sonar via OpenRouter.

<Note>Cette page couvre la configuration du **provider** Perplexity. Pour l'**outil** Perplexity (comment l'agent l'utilise), voir [Perplexity tool](/fr/tools/perplexity-search).</Note>

- Type : web search provider (pas un model provider)
- Auth : `PERPLEXITY_API_KEY` (direct) ou `OPENROUTER_API_KEY` (via OpenRouter)
- Config path : `plugins.entries.perplexity.config.webSearch.apiKey`

## Quick start

1. Définir la clé API :

```bash
openclaw configure --section web
```

Ou la définir directement :

```bash
openclaw config set plugins.entries.perplexity.config.webSearch.apiKey "pplx-xxxxxxxxxxxx"
```

2. L'agent utilisera automatiquement Perplexity pour les recherches web une fois configuré.

## Search modes

Le plugin sélectionne automatiquement le transport en fonction du préfixe de clé API :

| Key prefix | Transport                    | Features                                             |
| ---------- | ---------------------------- | ---------------------------------------------------- |
| `pplx-`    | Native Perplexity Search API | Résultats structurés, filtres de domaine/langue/date |
| `sk-or-`   | OpenRouter (Sonar)           | Réponses synthétisées par IA avec citations          |

## Native API filtering

Lors de l'utilisation de l'Perplexity native API (clé `pplx-`), les recherches prennent en charge :

- **Country** : code pays à 2 lettres
- **Language** : code de langue ISO 639-1
- **Date range** : day, week, month, year
- **Domain filters** : allowlist/denylist (max 20 domaines)
- **Content budget** : `max_tokens`, `max_tokens_per_page`

## Environment note

Si la Gateway s'exécute en tant que démon (launchd/systemd), assurez-vous
que `PERPLEXITY_API_KEY` est disponible pour ce processus (par exemple, dans
`~/.openclaw/.env` ou via `env.shellEnv`).
