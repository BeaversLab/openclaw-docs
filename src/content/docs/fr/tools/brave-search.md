---
summary: "Configuration de l'API de recherche Brave pour web_search"
read_when:
  - You want to use Brave Search for web_search
  - You need a BRAVE_API_KEY or plan details
title: "Recherche Brave"
---

# API de recherche Brave

OpenClaw prend en charge l'API de recherche Brave en tant que fournisseur `web_search`.

## Obtenir une clé API

1. Créez un compte API Brave Search sur [https://brave.com/search/api/](https://brave.com/search/api/)
2. Dans le tableau de bord, choisissez le forfait **Search** et générez une clé API.
3. Stockez la clé dans la configuration ou définissez `BRAVE_API_KEY` dans l'environnement Gateway.

## Exemple de configuration

```json5
{
  plugins: {
    entries: {
      brave: {
        config: {
          webSearch: {
            apiKey: "BRAVE_API_KEY_HERE",
            mode: "web", // or "llm-context"
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "brave",
        maxResults: 5,
        timeoutSeconds: 30,
      },
    },
  },
}
```

Les paramètres de recherche Brave spécifiques au fournisseur se trouvent désormais sous `plugins.entries.brave.config.webSearch.*`.
L'ancien `tools.web.search.apiKey` se charge toujours via le shim de compatibilité, mais ce n'est plus le chemin de configuration canonique.

`webSearch.mode` contrôle le transport Brave :

- `web` (par défaut) : recherche web normale Brave avec des titres, des URL et des extraits
- `llm-context` : API de contexte LLM Brave avec des extraits de texte pré-extraits et des sources pour le grounding

## Paramètres de l'outil

| Paramètre     | Description                                                                              |
| ------------- | ---------------------------------------------------------------------------------------- |
| `query`       | Requête de recherche (requis)                                                            |
| `count`       | Nombre de résultats à renvoyer (1-10, par défaut : 5)                                    |
| `country`     | Code de pays ISO à 2 lettres (par exemple, "US", "DE")                                   |
| `language`    | Code de langue ISO 639-1 pour les résultats de recherche (par exemple, "en", "de", "fr") |
| `search_lang` | Code de langue de recherche Brave (par exemple, `en`, `en-gb`, `zh-hans`)                |
| `ui_lang`     | Code de langue ISO pour les éléments de l'interface utilisateur                          |
| `freshness`   | Filtre temporel : `day` (24h), `week`, `month` ou `year`                                 |
| `date_after`  | Uniquement les résultats publiés après cette date (YYYY-MM-DD)                           |
| `date_before` | Uniquement les résultats publiés avant cette date (YYYY-MM-DD)                           |

**Exemples :**

```javascript
// Country and language-specific search
await web_search({
  query: "renewable energy",
  country: "DE",
  language: "de",
});

// Recent results (past week)
await web_search({
  query: "AI news",
  freshness: "week",
});

// Date range search
await web_search({
  query: "AI developments",
  date_after: "2024-01-01",
  date_before: "2024-06-30",
});
```

## Notes

- OpenClaw utilise le plan Brave **Search**. Si vous disposez d'un abonnement hérité (par exemple, le plan Free original avec 2 000 requêtes/mois), il reste valide mais n'inclut pas les nouvelles fonctionnalités telles que le contexte LLM ou des limites de débit plus élevées.
- Chaque plan Brave comprend **\$5/mois de crédit gratuit** (renouvelable). Le plan Search coûte \$5 pour 1 000 requêtes, donc le crédit couvre 1 000 requêtes/mois. Définissez votre limite d'utilisation dans le tableau de bord Brave pour éviter des frais inattendus. Consultez le [portail API Brave](https://brave.com/search/api/) pour les plans actuels.
- Le plan Search inclut le point de terminaison de contexte LLM et les droits d'inférence IA. Le stockage des résultats pour entraîner ou affiner des modèles nécessite un plan avec des droits de stockage explicites. Consultez les [Conditions d'utilisation](https://api-dashboard.search.brave.com/terms-of-service) de Brave.
- Le mode `llm-context` renvoie des entrées de source grounded au lieu de la forme d'extrait de recherche web normale.
- `llm-context` mode ne prend pas en charge `ui_lang`, `freshness`, `date_after` ou `date_before`.
- `ui_lang` doit inclure une sous-balise de région comme `en-US`.
- Les résultats sont mis en cache pendant 15 minutes par défaut (configurable via `cacheTtlMinutes`).

## Connexes

- [Aperçu de la recherche Web](/fr/tools/web) -- tous les fournisseurs et la détection automatique
- [Perplexity Search](/fr/tools/perplexity-search) -- résultats structurés avec filtrage par domaine
- [Recherche Exa](/fr/tools/exa-search) -- recherche neurale avec extraction de contenu
