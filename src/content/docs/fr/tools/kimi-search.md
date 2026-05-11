---
summary: "Recherche web Kimi via la recherche web Moonshot"
read_when:
  - You want to use Kimi for web_search
  - You need a KIMI_API_KEY or MOONSHOT_API_KEY
title: "Recherche Kimi"
---

OpenClaw prend en charge Kimi en tant que fournisseur `web_search`, utilisant la recherche Web OpenClaw pour produire des réponses synthétisées par l'IA avec des citations.

## Obtenir une clé API

<Steps>
  <Step title="Créer une clé">
    Obtenez une clé API auprès de [Moonshot AI](https://platform.moonshot.cn/).
  </Step>
  <Step title="Stocker la clé">
    Définissez `KIMI_API_KEY` ou `MOONSHOT_API_KEY` dans l'environnement Gateway, ou
    configurez via :

    ```bash
    openclaw configure --section web
    ```

  </Step>
</Steps>

Lorsque vous choisissez **Kimi** pendant `openclaw onboard` ou
`openclaw configure --section web`, OpenClaw peut également demander :

- la région de l'Moonshot API :
  - `https://api.moonshot.ai/v1`
  - `https://api.moonshot.cn/v1`
- le modèle de recherche Web Kimi par défaut (par défaut `kimi-k2.6`)

## Config

```json5
{
  plugins: {
    entries: {
      moonshot: {
        config: {
          webSearch: {
            apiKey: "sk-...", // optional if KIMI_API_KEY or MOONSHOT_API_KEY is set
            baseUrl: "https://api.moonshot.ai/v1",
            model: "kimi-k2.6",
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

Si vous utilisez l'hôte de l'API Chine pour le chat (`models.providers.moonshot.baseUrl` :
`https://api.moonshot.cn/v1`), OpenClaw réutilise ce même hôte pour Kimi
`web_search` lorsque `tools.web.search.kimi.baseUrl` est omis, afin que les clés de
[platform.moonshot.cn](https://platform.moonshot.cn/) n'atteignent pas par erreur
le point de terminaison international (qui renvoie souvent HTTP 401). Remplacez
par `tools.web.search.kimi.baseUrl` lorsque vous avez besoin d'une URL de base de recherche différente.

**Alternative d'environnement :** définissez `KIMI_API_KEY` ou `MOONSHOT_API_KEY` dans l'environnement
Gateway. Pour une installation de passerelle, placez-le dans `~/.openclaw/.env`.

Si vous omettez `baseUrl`, OpenClaw utilise par défaut `https://api.moonshot.ai/v1`.
Si vous omettez `model`, OpenClaw utilise par défaut `kimi-k2.6`.

## Fonctionnement

Kimi utilise la recherche Web Moonshot pour synthétiser des réponses avec des citations en ligne,
similaire à l'approche de réponse ancrée de Gemini et Grok.

## Paramètres pris en charge

La recherche Kimi prend en charge `query`.

`count` est accepté pour la compatibilité partagée `web_search`, mais Kimi renvoie toujours une réponse synthétisée avec des citations plutôt qu'une liste de N résultats.

Les filtres spécifiques au provider ne sont actuellement pas pris en charge.

## Connexes

- [Vue d'ensemble de la recherche web](/fr/tools/web) -- tous les providers et détection automatique
- [Moonshot AI](/fr/providers/moonshot) -- model Moonshot + docs du provider Kimi Coding
- [Gemini Search](/fr/tools/gemini-search) -- réponses synthétisées par l'IA via Google grounding
- [Grok Search](/fr/tools/grok-search) -- réponses synthétisées par l'IA via xAI grounding
