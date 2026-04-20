---
summary: "Recherche web Grok via les réponses ancrées sur le web xAI"
read_when:
  - You want to use Grok for web_search
  - You need an XAI_API_KEY for web search
title: "Recherche Grok"
---

# Recherche Grok

OpenClaw prend en charge Grok en tant que `web_search` provider, en utilisant des réponses ancrées sur le web xAI pour produire des réponses synthétisées par l'IA basées sur des résultats de recherche en direct avec citations.

La même `XAI_API_KEY` peut également alimenter l'outil intégré `x_search` pour la recherche de publications sur X
(ex-Twitter). Si vous stockez la clé sous
`plugins.entries.xai.config.webSearch.apiKey`, OpenClaw la réutilise désormais en tant que
solution de secours pour le provider de modèle xAI inclus.

Pour les métriques de niveau publication sur X telles que les repartages, les réponses, les marque-pages ou les vues, préférez
`x_search` avec l'URL exacte de la publication ou l'ID de statut au lieu d'une requête de
recherche large.

## Intégration et configuration

Si vous choisissez **Grok** pendant :

- `openclaw onboard`
- `openclaw configure --section web`

OpenClaw peut afficher une étape de suivi distincte pour activer `x_search` avec la même
`XAI_API_KEY`. Cette étape :

- n'apparaît qu'après avoir choisi Grok pour `web_search`
- n'est pas un choix distinct de fournisseur de recherche web de premier niveau
- peut éventuellement définir le modèle `x_search` lors du même flux

Si vous l'ignorez, vous pouvez activer ou modifier `x_search` ultérieurement dans la configuration.

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

Grok utilise les responses basées sur le web d'xAI pour synthétiser des réponses avec des
citations en ligne, approche similaire au Google Search grounding de Gemini.

## Paramètres pris en charge

La recherche Grok prend en charge `query`.

`count` est accepté pour la compatibilité partagée avec `web_search`, mais Grok renvoie toujours une réponse synthétisée unique avec des citations plutôt qu'une liste de N résultats.

Les filtres spécifiques au fournisseur ne sont actuellement pas pris en charge.

## Connexes

- [Vue d'ensemble de la recherche Web](/fr/tools/web) -- tous les fournisseurs et la détection automatique
- [x_search dans la recherche Web](/fr/tools/web#x_search) -- recherche X de première classe via xAI
- [Gemini Search](/fr/tools/gemini-search) -- réponses synthétisées par l'IA via le grounding Google
