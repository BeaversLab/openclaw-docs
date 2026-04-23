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

Lorsque vous choisissez **Kimi** lors de `openclaw onboard` ou
`openclaw configure --section web`, OpenClaw peut également demander :

- la région de l'Moonshot API :
  - `https://api.moonshot.ai/v1`
  - `https://api.moonshot.cn/v1`
- le modèle de recherche web Kimi par défaut (par défaut `kimi-k2.6`)

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

Si vous utilisez l'hôte API de Chine pour la discussion (`models.providers.moonshot.baseUrl` :
`https://api.moonshot.cn/v1`), OpenClaw réutilise ce même hôte pour Kimi
`web_search` lorsque `tools.web.search.kimi.baseUrl` est omis, afin que les clés de
[platform.moonshot.cn](https://platform.moonshot.cn/) n'atteignent pas par erreur
le point de terminaison international (ce qui renvoie souvent HTTP 401). Remplacez
avec `tools.web.search.kimi.baseUrl` lorsque vous avez besoin d'une URL de base de recherche différente.

**Alternative d'environnement :** définissez `KIMI_API_KEY` ou `MOONSHOT_API_KEY` dans l'environnement
du Gateway. Pour une installation de passerelle, placez-le dans `~/.openclaw/.env`.

Si vous omettez `baseUrl`, OpenClaw utilise par défaut `https://api.moonshot.ai/v1`.
Si vous omettez `model`, OpenClaw utilise par défaut `kimi-k2.6`.

## Fonctionnement

Kimi utilise la recherche web Moonshot pour synthétiser des réponses avec des citations en ligne,
similaire à l'approche de réponse fondée de Gemini et Grok.

## Paramètres pris en charge

La recherche Kimi prend en charge `query`.

`count` est accepté pour la compatibilité partagée de `web_search`, mais Kimi renvoie toujours
une réponse synthétisée unique avec des citations plutôt qu'une liste de résultats N.

Les filtres spécifiques au fournisseur ne sont actuellement pas pris en charge.

## Connexes

- [Aperçu de la recherche Web](/fr/tools/web) -- tous les fournisseurs et la détection automatique
- [Moonshot AI](/fr/providers/moonshot) -- documentation du fournisseur de modèle Moonshot + Kimi Coding
- [Gemini Search](/fr/tools/gemini-search) -- réponses synthétisées par IA via le grounding Google
- [Grok Search](/fr/tools/grok-search) -- réponses synthétisées par IA via le grounding xAI
