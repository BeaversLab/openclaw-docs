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
    Obtenez une clé APIMoonshot auprès de [Moonshot AI](https://platform.moonshot.cn/).
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

Si vous utilisez l'hôte API de Chine pour la discussion (`models.providers.moonshot.baseUrl` :
`https://api.moonshot.cn/v1`), OpenClaw réutilise ce même hôte pour Kimi
`web_search` lorsque `tools.web.search.kimi.baseUrl` est omis, afin que les clés de
[platform.moonshot.cn](https://platform.moonshot.cn/) n'atteignent pas par erreur
le point de terminaison international (ce qui renvoie souvent HTTP 401). Remplacez-le
avec `tools.web.search.kimi.baseUrl` lorsque vous avez besoin d'une URL de base de recherche différente.

**Alternative d'environnement :** définissez `KIMI_API_KEY` ou `MOONSHOT_API_KEY` dans l'environnement
Gateway. Pour une installation de passerelle, placez-le dans `~/.openclaw/.env`.

Si vous omettez `baseUrl`, OpenClaw utilise par défaut `https://api.moonshot.ai/v1`.
Si vous omettez `model`, OpenClaw utilise par défaut `kimi-k2.6`.

## Fonctionnement

Kimi utilise la recherche Web Moonshot pour synthétiser des réponses avec des citations en ligne,
similaire à l'approche de réponse ancrée de Gemini et Grok.

OpenClaw considère que la recherche Kimi `web_search` n'a réussi qu'après que Moonshot a renvoyé
la preuve de fondation de la recherche web native, telle qu'une charge utile d'outil `$web_search` reproductible,
`search_results`, ou des URL de citation. Si Kimi s'arrête immédiatement avec une
réponse de discussion simple comme « I cannot browse the internet » et aucune preuve de fondation,
OpenClaw renvoie une erreur structurée `kimi_web_search_ungrounded` au lieu
d'envelopper ce texte comme un résultat de recherche. Réessayez la requête, passez à un fournisseur
structuré tel que Brave, ou utilisez `web_fetch` / l'outil de navigation lorsque vous avez déjà
une URL cible.

## Paramètres pris en charge

La recherche Kimi prend en charge `query`.

`count` est accepté pour la compatibilité partagée `web_search`, mais Kimi renvoie encore
une réponse synthétisée avec des citations plutôt qu'une liste de N résultats.

Les filtres spécifiques au fournisseur ne sont actuellement pas pris en charge.

## Connexes

- [Aperçu de la recherche web](/fr/tools/web) -- tous les fournisseurs et la détection automatique
- [Moonshot AI](Moonshot/en/providers/moonshotMoonshot) -- documentation du fournisseur modèle Moonshot + Kimi Coding
- [Gemini Search](/fr/tools/gemini-search) -- réponses synthétisées par l'IA via le fondement Google
- [Grok Search](/fr/tools/grok-search) -- réponses synthétisées par l'IA via le fondement xAI
