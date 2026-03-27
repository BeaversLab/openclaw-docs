---
summary: "Recherche web Grok via les réponses ancrées sur le web xAI"
read_when:
  - You want to use Grok for web_search
  - You need an XAI_API_KEY for web search
title: "Recherche Grok"
---

# Recherche Grok

OpenClaw prend en charge Grok en tant que `web_search` provider, en utilisant des réponses ancrées sur le web xAI pour produire des réponses synthétisées par l'IA basées sur des résultats de recherche en direct avec citations.

## Obtenir une clé API

<Steps>
  <Step title="Créer une clé">
    Obtenez une clé API auprès de [xAI](https://console.x.ai/).
  </Step>
  <Step title="Stocker la clé">
    Définissez `XAI_API_KEY` dans l'environnement Gateway, ou configurez via :

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
      xai: {
        config: {
          webSearch: {
            apiKey: "xai-...", // optional if XAI_API_KEY is set
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "grok",
      },
    },
  },
}
```

**Alternative d'environnement :** définissez `XAI_API_KEY` dans l'environnement Gateway.
Pour une installation de passerelle, placez-la dans `~/.openclaw/.env`.

## Fonctionnement

Grok utilise des réponses ancrées sur le web xAI pour synthétiser des réponses avec des citations en ligne, similaires à l'approche d'ancrage de Google Search de Gemini.

## Paramètres pris en charge

La recherche Grok prend en charge les paramètres standard `query` et `count`.
Les filtres spécifiques au provider ne sont actuellement pas pris en charge.

## Connexes

- [Aperçu de la recherche web](/fr/tools/web) -- tous les providers et détection automatique
- [Recherche Gemini](/fr/tools/gemini-search) -- réponses synthétisées par l'IA via l'ancrage Google

import fr from "/components/footer/fr.mdx";

<fr />
