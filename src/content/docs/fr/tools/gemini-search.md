---
summary: "Recherche web Gemini avec Google Search grounding"
read_when:
  - You want to use Gemini for web_search
  - You need a GEMINI_API_KEY
  - You want Google Search grounding
title: "Recherche Gemini"
---

OpenClaw prend en charge les modèles Gemini avec [ancrage Google Search](https://ai.google.dev/gemini-api/docs/grounding) intégré,
qui renvoie des réponses synthétisées par l'IA basées sur les résultats en direct de Google Search avec
citations.

## Obtenir une clé API

<Steps>
  <Step title="Créer une clé">
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
Pour une installation de passerelle, mettez-le dans `~/.openclaw/.env`.

## Fonctionnement

Contrairement aux fournisseurs de recherche traditionnels qui renvoient une liste de liens et d'extraits,
Gemini utilise l'ancrage Google Search pour produire des réponses synthétisées par l'IA avec
citations en ligne. Les résultats incluent à la fois la réponse synthétisée et les
URL sources.

- Les URL de citation provenant de l'ancrage Gemini sont automatiquement résolues à partir des
  URL de redirection Google vers des URL directes.
- La résolution des redirections utilise le chemin de garde SSRF (HEAD + vérifications des redirections +
  validation http/https) avant de renvoyer l'URL de citation finale.
- La résolution des redirections utilise des valeurs par défaut SSRF strictes, donc les redirections vers
  des cibles privées/interne sont bloquées.

## Paramètres pris en charge

La recherche Gemini prend en charge `query`.

`count` est accepté pour la compatibilité `web_search` partagée, mais l'ancrage Gemini
renvoie toujours une réponse synthétisée avec des citations plutôt qu'une liste
de N résultats.

Les filtres spécifiques au fournisseur comme `country`, `language`, `freshness` et
`domain_filter` ne sont pas pris en charge.

## Sélection du modèle

Le modèle par défaut est `gemini-2.5-flash` (rapide et rentable). Tout modèle
Gemini prenant en charge l'ancrage peut être utilisé via
`plugins.entries.google.config.webSearch.model`.

## Connexes

- [Aperçu de la recherche Web](/fr/tools/web) -- tous les fournisseurs et détection automatique
- [Brave Search](/fr/tools/brave-search) -- résultats structurés avec extraits
- [Perplexity Search](/fr/tools/perplexity-search) -- résultats structurés + extraction de contenu
