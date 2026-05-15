---
summary: "Recherche web Grok via les réponses ancrées sur le web xAI"
read_when:
  - You want to use Grok for web_search
  - You need an XAI_API_KEY for web search
title: "Recherche Grok"
---

OpenClaw prend en charge Grok en tant que fournisseur `web_search`, utilisant les réponses ancrées sur le Web d'xAI pour produire des réponses synthétisées par l'IA étayées par des résultats de recherche en direct avec des citations.

La même clé API xAI peut également alimenter l'outil API`x_search` intégré pour la recherche de publications sur X
(formerment Twitter) et l'outil `code_execution`. Si vous stockez
la clé sous `plugins.entries.xai.config.webSearch.apiKey`OpenClaw, OpenClaw la réutilise
maintenant également en tant que solution de repli pour le fournisseur de modèle xAI intégré.

Pour les métriques X au niveau de la publication telles que les republications, les réponses, les signets ou les vues, privilégiez `x_search` avec l'URL exacte de la publication ou l'ID de statut au lieu d'une requête de recherche large.

## Intégration et configuration

Si vous choisissez **Grok** pendant :

- `openclaw onboard`
- `openclaw configure --section web`

OpenClaw peut afficher une étape de suivi distincte pour activer `x_search` avec le même `XAI_API_KEY`. Ce suivi :

- n'apparaît qu'après avoir choisi Grok pour `web_search`
- n'est pas un choix distinct de fournisseur de recherche Web de premier niveau
- peut éventuellement définir le modèle `x_search` lors du même processus

Si vous l'ignorez, vous pouvez activer ou modifier `x_search` ultérieurement dans la configuration.

## Obtenir une clé API

<Steps>
  <Step title="Créer une clé"API>
    Obtenez une clé API auprès de [xAI](https://console.x.ai/).
  </Step>
  <Step title="Stocker la clé">
    Définissez `XAI_API_KEY` dans l'environnement Gateway, ou configurez via :

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
      xai: {
        config: {
          webSearch: {
            apiKey: "xai-...", // optional if XAI_API_KEY is set
            baseUrl: "https://api.x.ai/v1", // optional Responses API proxy/base URL override
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

Grok utilise des réponses ancrées sur le Web d'xAI pour synthétiser des réponses avec des citations en ligne, similaire à l'approche d'ancrage de Google Search de Gemini.

## Paramètres pris en charge

La recherche Grok prend en charge `query`.

`count` est accepté pour la compatibilité partagée `web_search`, mais Grok renvoie toujours une réponse synthétisée unique avec des citations plutôt qu'une liste de N résultats.

Les filtres spécifiques au fournisseur ne sont actuellement pas pris en charge.

Grok utilise un délai d'attente par défaut de 60 secondes spécifique au fournisseur, car les recherches web ancrées dans xAI Responses
peuvent prendre plus de temps que le `web_search` par défaut partagé. Définissez
`tools.web.search.timeoutSeconds` pour le remplacer.

## Remplacements de l'URL de base

Définissez `plugins.entries.xai.config.webSearch.baseUrl`OpenClaw lorsque la recherche web Grok doit
passer par un proxy opérateur ou un point de terminaison Responses compatible xAI. OpenClaw
envoie une requête à `<baseUrl>/responses` après avoir supprimé les barres obliques de fin. `x_search`
utilise le même repli `webSearch.baseUrl` à moins que
`plugins.entries.xai.config.xSearch.baseUrl` ne soit défini.

## Connexes

- [Aperçu de la recherche web](/fr/tools/web) -- tous les fournisseurs et détection automatique
- [x_search dans la recherche web](/fr/tools/web#x_search) -- recherche X de premier plan via xAI
- [Gemini Search](/fr/tools/gemini-search) -- réponses synthétisées par IA via le grounding de Google
