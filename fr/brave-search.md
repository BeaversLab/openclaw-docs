---
summary: "Configuration de l'API de recherche Brave pour web_search"
read_when:
  - Vous souhaitez utiliser la recherche Brave pour web_search
  - Vous avez besoin d'un BRAVE_API_KEY ou des détails du plan
title: "Recherche Brave"
---

# API de recherche Brave

OpenClaw prend en charge l'API de recherche Brave en tant que fournisseur `web_search`.

## Obtenir une clé API

1. Créez un compte API de recherche Brave sur [https://brave.com/search/api/](https://brave.com/search/api/)
2. Dans le tableau de bord, choisissez le plan **Search** et générez une clé API.
3. Stockez la clé dans la configuration ou définissez `BRAVE_API_KEY` dans l'environnement de la Gateway.

## Exemple de configuration

```json5
{
  plugins: {
    entries: {
      brave: {
        config: {
          webSearch: {
            apiKey: "BRAVE_API_KEY_HERE",
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
L'ancien `tools.web.search.apiKey` se charge toujours via la shim de compatibilité, mais ce n'est plus le chemin de configuration canonique.

## Paramètres de l'outil

| Paramètre     | Description                                                         |
| ------------- | ------------------------------------------------------------------- |
| `query`       | Requête de recherche (requis)                                             |
| `count`       | Nombre de résultats à renvoyer (1-10, par défaut : 5)                      |
| `country`     | Code de pays ISO à 2 lettres (par exemple, "US", "DE")                        |
| `language`    | Code de langue ISO 639-1 pour les résultats de recherche (par exemple, "en", "de", "fr") |
| `ui_lang`     | Code de langue ISO pour les éléments de l'interface utilisateur                                   |
| `freshness`   | Filtre temporel : `day` (24h), `week`, `month` ou `year`                |
| `date_after`  | Uniquement les résultats publiés après cette date (AAAA-MM-JJ)                 |
| `date_before` | Uniquement les résultats publiés avant cette date (AAAA-MM-JJ)                |

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

- OpenClaw utilise le plan **Search** de Brave. Si vous disposez d'un abonnement hérité (par exemple, le plan Free original avec 2 000 requêtes/mois), il reste valide mais n'inclut pas les nouvelles fonctionnalités telles que le contexte LLM ou des limites de débit plus élevées.
- Chaque plan Brave comprend **\$5/mois de crédit gratuit** (renouvelable). Le plan Search coûte \$5 pour 1 000 requêtes, donc le crédit couvre 1 000 requêtes/mois. Définissez votre limite d'utilisation dans le tableau de bord Brave pour éviter des frais inattendus. Consultez le [portail API Brave](https://brave.com/search/api/) pour les plans actuels.
- Le plan de recherche comprend le point de terminaison de contexte LLM et les droits d'inférence IA. Le stockage des résultats pour entraîner ou régler des modèles nécessite un plan avec des droits de stockage explicites. Voir les Brave [Conditions d'utilisation](https://api-dashboard.search.brave.com/terms-of-service).
- Les résultats sont mis en cache pendant 15 minutes par défaut (configurable via `cacheTtlMinutes`).

Voir [Outils Web](/fr/tools/web) pour la configuration complète de web_search.

import en from "/components/footer/en.mdx";

<en />
