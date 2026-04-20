---
summary: "Recherche web Gemini avec Google Search grounding"
read_when:
  - You want to use Gemini for web_search
  - You need a GEMINI_API_KEY
  - You want Google Search grounding
title: "Recherche Gemini"
---

# Recherche Gemini

OpenClaw prend en charge les modèles Gemini avec un [ancrage Google Search](https://ai.google.dev/gemini-api/docs/grounding) intégré, qui renvoie des answers synthétisées par l'IA basées sur les résultats en direct de Google Search avec des citations.

## Obtenir une clé API

<Steps>
  <Step title="Create a key">
    Allez sur [Google AI Studio](https://aistudio.google.com/apikey) et créez une
    clé API.
  </Step>
  <Step title="Stocker la clé">
    Définissez `GEMINI_API_KEY` dans l'environnement du Gateway, ou configurez via :

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
            apiKey: "AIza...", // optional if GEMINI_API_KEY is set
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

**Alternative d'environnement :** définissez `GEMINI_API_KEY` dans l'environnement du Gateway.
Pour une installation de passerelle, placez-la dans `~/.openclaw/.env`.

## Fonctionnement

Contrairement aux fournisseurs de recherche traditionnels qui renvoient une liste de liens et d'extraits, Gemini utilise Google Search grounding pour produire des réponses synthétisées par l'IA avec des citations en ligne. Les résultats incluent à la fois la réponse synthétisée et les URL source.

- Les URL de citation provenant du grounding Gemini sont automatiquement résolues depuis les URL de redirection de Google vers des URL directes.
- La résolution des redirections utilise le chemin de garde SSRF (HEAD + vérifications des redirections + validation http/https) avant de renvoyer l'URL de citation finale.
- La résolution des redirections utilise des paramètres SSRF stricts par défaut, par conséquent les redirections vers des cibles privées/internes sont bloquées.

## Paramètres pris en charge

Gemini search prend en charge `query`.

`count` est accepté pour la compatibilité partagée `web_search`, mais l'ancrage Gemini renvoie toujours une réponse synthétisée unique avec des citations plutôt qu'une liste de N résultats.

Les filtres spécifiques aux fournisseurs comme `country`, `language`, `freshness` et `domain_filter` ne sont pas pris en charge.

## Sélection du modèle

Le modèle par défaut est `gemini-2.5-flash` (rapide et rentable). Tout modèle Gemini prenant en charge l'ancrage peut être utilisé via `plugins.entries.google.config.webSearch.model`.

## Connexes

- [Aperçu de la recherche Web](/fr/tools/web) -- tous les fournisseurs et la détection automatique
- [Brave Search](/fr/tools/brave-search) -- résultats structurés avec extraits
- [Perplexity Search](/fr/tools/perplexity-search) -- résultats structurés + extraction de contenu
