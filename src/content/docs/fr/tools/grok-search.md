---
summary: "Recherche web Grok via les réponses ancrées sur le web xAI"
read_when:
  - You want to use Grok for web_search
  - You need an XAI_API_KEY for web search
title: "Recherche Grok"
---

OpenClaw prend en charge Grok en tant que fournisseur `web_search`, utilisant les réponses ancrées sur le Web d'xAI pour produire des réponses synthétisées par l'IA étayées par des résultats de recherche en direct avec des citations.

Le même `XAI_API_KEY` peut également alimenter l'outil `x_search` intégré pour la recherche de publications sur X (anciennement Twitter). Si vous stockez la clé sous `plugins.entries.xai.config.webSearch.apiKey`, OpenClaw la réutilise désormais également en tant que solution de secours pour le fournisseur de modèle xAI groupé.

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
  <Step title="Créer une clé">
    Obtenez une clé API à partir de [xAI](https://console.x.ai/).
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

## Connexes

- [Aperçu de la recherche Web](/fr/tools/web) -- tous les fournisseurs et détection automatique
- [x_search dans la recherche Web](/fr/tools/web#x_search) -- recherche X de premier plan via xAI
- [Recherche Gemini](/fr/tools/gemini-search) -- réponses synthétisées par IA via le grounding Google
