---
summary: "Recherche web Kimi via la recherche web Moonshot"
read_when:
  - You want to use Kimi for web_search
  - You need a KIMI_API_KEY or MOONSHOT_API_KEY
title: "Recherche Kimi"
---

# Recherche Kimi

OpenClaw prend en charge Kimi en tant que `web_search` provider, en utilisant la recherche web Moonshot pour produire des réponses synthétisées par l'IA avec des citations.

## Obtenir une clé API

<Steps>
  <Step title="Créer une clé">
    Obtenez une clé API auprès de [Moonshot AI](https://platform.moonshot.cn/).
  </Step>
  <Step title="Stocker la clé">
    Définissez `KIMI_API_KEY` ou `MOONSHOT_API_KEY` dans l'environnement du Gateway ou
    configurez via :

    ```bash
    openclaw configure --section web
    ```

  </Step>
</Steps>

## Config

```json5
{
  plugins: {
    entries: {
      moonshot: {
        config: {
          webSearch: {
            apiKey: "sk-...", // optional if KIMI_API_KEY or MOONSHOT_API_KEY is set
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "kimi",
      },
    },
  },
}
```

**Alternative d'environnement :** définissez `KIMI_API_KEY` ou `MOONSHOT_API_KEY` dans l'environnement du Gateway. Pour une installation de passerelle, placez-le dans `~/.openclaw/.env`.

## Fonctionnement

Kimi utilise la recherche web Moonshot pour synthétiser des réponses avec des citations en ligne, similaire à l'approche de réponse fondée de Gemini et Grok.

## Paramètres pris en charge

La recherche Kimi prend en charge les paramètres standard `query` et `count`.
Les filtres spécifiques au provider ne sont actuellement pas pris en charge.

## Connexes

- [Aperçu de la recherche web](/fr/tools/web) -- tous les providers et la détection automatique
- [Recherche Gemini](/fr/tools/gemini-search) -- réponses synthétisées par l'IA via le grounding Google
- [Recherche Grok](/fr/tools/grok-search) -- réponses synthétisées par l'IA via le grounding xAI

import fr from "/components/footer/fr.mdx";

<fr />
