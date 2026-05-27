---
summary: "Recherche web Grok via les réponses fondées sur le web xAI"
read_when:
  - You want to use Grok for web_search
  - You want to use xAI OAuth or an XAI_API_KEY for web search
title: "Recherche Grok"
---

OpenClaw prend en charge Grok en tant que `web_search` provider, utilisant les réponses fondées sur le web xAI pour produire des réponses synthétisées par l'IA basées sur des résultats de recherche en direct avec des citations.

La recherche web Grok privilégie votre connexion xAI OAuth existante lorsqu'elle est disponible. Si aucun profil OAuth n'existe, la même clé API xAI peut également alimenter l'outil `x_search` intégré pour la recherche de publications X (anciennement Twitter) et l'outil `code_execution`. Si vous stockez la clé sous `plugins.entries.xai.config.webSearch.apiKey`, OpenClaw la réutilise comme solution de repli pour le provider de model xAI groupé également.

Pour les métriques X au niveau de la publication telles que les reparts, les réponses, les signets ou les vues, préférez `x_search` avec l'URL exacte de la publication ou l'ID de statut au lieu d'une requête de recherche large.

## Intégration et configuration

Si vous choisissez **Grok** pendant :

- `openclaw onboard`
- `openclaw configure --section web`

OpenClaw peut utiliser un profil xAI OAuth existant sans demander de clé de recherche web distincte. Si OAuth n'est pas disponible, il revient à la configuration par clé API xAI. OpenClaw peut également afficher une étape de suivi distincte pour activer `x_search` avec les mêmes identifiants xAI. Cette étape de suivi :

- n'apparaît qu'après avoir choisi Grok pour `web_search`
- n'est pas un choix distinct de fournisseur de recherche Web de premier niveau
- peut éventuellement définir le model `x_search` lors du même flux

Si vous l'ignorez, vous pouvez activer ou modifier `x_search` ultérieurement dans la configuration.

## Connectez-vous ou obtenez une clé API

<Steps>
  <Step title="Utiliser xAI OAuth">
    Si vous vous êtes déjà connecté avec xAI lors de l'onboarding ou de l'authentification du model, choisissez
    Grok comme le `web_search` provider. Aucune clé API distincte n'est requise :

    ```bash
    openclaw onboard --auth-choice xai-oauth
    openclaw config set tools.web.search.provider grok
    ```

  </Step>
  <Step title="APIUtiliser une clé API de secours"API>
    Obtenez une clé API auprès de [xAI](https://console.x.ai/) lorsque OAuth n'est pas disponible
    ou si vous souhaitez volontairement une configuration de recherche web basée sur une clé.
  </Step>
  <Step title="Stocker la clé">
    Définissez `XAI_API_KEY` dans l'environnement de la Gateway, ou configurez via :

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
            apiKey: "xai-...", // optional if xAI OAuth or XAI_API_KEY is available
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

**Alternatives d'identification :** connectez-vous avec `openclaw models auth login
--provider xai --method oauth`, set `XAI_API_KEY` dans l'environnement de la Gateway,
ou stockez `plugins.entries.xai.config.webSearch.apiKey`. Pour une installation de passerelle,
mettez les env vars dans `~/.openclaw/.env`.

## Fonctionnement

Grok utilise les responses basées sur le web d'xAI pour synthétiser des réponses avec des
citations en ligne, approche similaire au Google Search grounding de Gemini.

## Paramètres pris en charge

La recherche Grok prend en charge `query`.

`count` est accepté pour la compatibilité partagée avec `web_search`, mais Grok renvoie
toujours une réponse synthétisée unique avec des citations plutôt qu'une liste de N résultats.

Les filtres spécifiques au fournisseur ne sont actuellement pas pris en charge.

Grok utilise un délai d'expiration par défaut de 60 secondes spécifique au fournisseur car les recherches web ancrées d'xAI Responses
peuvent durer plus longtemps que le défaut partagé `web_search`. Définissez
`tools.web.search.timeoutSeconds` pour le remplacer.

## Remplacements de l'URL de base

Définissez `plugins.entries.xai.config.webSearch.baseUrl` lorsque la recherche web Grok doit
passer par un proxy opérateur ou un point de terminaison Responses compatible xAI. OpenClaw
envoie des requêtes à `<baseUrl>/responses` après avoir supprimé les barres obliques de fin. `x_search`
utilise le même repli `webSearch.baseUrl` sauf si
`plugins.entries.xai.config.xSearch.baseUrl` est défini.

## Connexes

- [Aperçu de la recherche web](/fr/tools/web) -- tous les fournisseurs et détection automatique
- [x_search dans la recherche web](/fr/tools/web#x_search) -- recherche X de premier plan via xAI
- [Recherche Gemini](/fr/tools/gemini-search) -- réponses synthétisées par IA via l'ancrage Google
