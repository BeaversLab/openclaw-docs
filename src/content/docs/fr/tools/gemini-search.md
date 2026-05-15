---
summary: "Recherche web Gemini avec Google Search grounding"
read_when:
  - You want to use Gemini for web_search
  - You need a GEMINI_API_KEY or models.providers.google.apiKey
  - You want Google Search grounding
title: "Recherche Gemini"
---

OpenClaw prend en charge les modèles Gemini avec un
[Google Search grounding](https://ai.google.dev/gemini-api/docs/grounding)
intégré, qui renvoie des réponses synthétisées par l'IA et étayées par
les résultats en direct de Google Search avec des citations.

## Obtenir une clé API

<Steps>
  <Step title="Create a key">
    Rendez-vous sur [Google AI Studio](https://aistudio.google.com/apikey) et créez une
    clé API.
  </Step>
  <Step title="Stocker la clé">
    Définissez `GEMINI_API_KEY` dans l'environnement du Gateway, réutilisez
    `models.providers.google.apiKey`, ou configurez une clé de recherche web dédiée via :

    ```bash
    openclaw configure --section web
    ```

  </Step>
</Steps>

## Configuration

```json5
{
  plugins: {
    entries: {
      google: {
        config: {
          webSearch: {
            apiKey: "AIza...", // optional if GEMINI_API_KEY or models.providers.google.apiKey is set
            baseUrl: "https://generativelanguage.googleapis.com/v1beta", // optional; falls back to models.providers.google.baseUrl
            model: "gemini-2.5-flash", // default
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

**Priorité des identifiants :** La recherche web Gemini utilise
`plugins.entries.google.config.webSearch.apiKey` en premier, puis `GEMINI_API_KEY`,
puis `models.providers.google.apiKey`. Pour les URL de base, l'élément dédié
`plugins.entries.google.config.webSearch.baseUrl` prime sur
`models.providers.google.baseUrl`.

Pour une installation passerelle, placez les clés d'environnement dans `~/.openclaw/.env`.

## Fonctionnement

Contrairement aux fournisseurs de recherche traditionnels qui renvoient une liste de liens et d'extraits, Gemini utilise Google Search grounding pour produire des réponses synthétisées par l'IA avec des citations en ligne. Les résultats incluent à la fois la réponse synthétisée et les URL source.

- Les URL de citation provenant du grounding Gemini sont automatiquement résolues depuis les URL de redirection de Google vers des URL directes.
- La résolution des redirections utilise le chemin de garde SSRF (HEAD + vérifications des redirections + validation http/https) avant de renvoyer l'URL de citation finale.
- La résolution des redirections utilise des paramètres SSRF stricts par défaut, par conséquent les redirections vers des cibles privées/internes sont bloquées.

## Paramètres pris en charge

La recherche Gemini prend en charge `query`, `freshness`, `date_after` et `date_before`.

`count` est accepté pour la compatibilité partagée `web_search`, mais le grounding Gemini renvoie tout de même une réponse synthétisée avec des citations plutôt qu'une liste de N résultats.

`freshness` accepte `day`, `week`, `month`, `year` et les raccourcis partagés
`pd`, `pw`, `pm` et `py`. OpenClaw convertit ces valeurs ou une plage explicite
`date_after`/`date_before` en `timeRangeFilter` du mappage Google Search de Gemini.
`country`, `language` et `domain_filter` ne sont pas pris en charge.

## Sélection du modèle

Le modèle par défaut est `gemini-2.5-flash` (rapide et économique). Tout modèle Gemini prenant en charge le grounding peut être utilisé via `plugins.entries.google.config.webSearch.model`.

## Remplacements de l'URL de base

Définissez `plugins.entries.google.config.webSearch.baseUrl` lorsque la recherche Web Gemini doit passer par un proxy d'opérateur ou un point de terminaison personnalisé compatible Gemini. Si ce paramètre n'est pas défini, la recherche Web Gemini réutilise `models.providers.google.baseUrl`. Une valeur `https://generativelanguage.googleapis.com` simple est normalisée en `https://generativelanguage.googleapis.com/v1beta` ; les chemins de proxy personnalisés sont conservés tels quels après suppression des barres obliques de fin.

## Connexes

- [Aperçu de la recherche Web](/fr/tools/web) -- tous les fournisseurs et détection automatique
- [Recherche Brave](Brave/en/tools/brave-search) -- résultats structurés avec extraits
- [Recherche Perplexity](Perplexity/en/tools/perplexity-search) -- résultats structurés + extraction de contenu
