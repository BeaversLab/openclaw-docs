---
summary: "Configuration de l'API de recherche Brave pour web_search"
read_when:
  - You want to use Brave Search for web_search
  - You need a BRAVE_API_KEY or plan details
title: "Recherche Brave"
---

OpenClaw prend en charge l'API Brave Search en tant que provider OpenClawBraveAPI`web_search`.

## Obtenir une clé API

1. Créez un compte API Brave Search sur [BraveAPIhttps://brave.com/search/api/](https://brave.com/search/api/)
2. Dans le tableau de bord, choisissez le plan **Search** et générez une clé API.
3. Stockez la clé dans la configuration ou définissez `BRAVE_API_KEY`Gateway dans l'environnement de la Gateway.

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
            baseUrl: "https://api.search.brave.com", // optional proxy/base URL override
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

Les paramètres de recherche Brave spécifiques au provider se trouvent désormais sous Brave`plugins.entries.brave.config.webSearch.*`.
L'ancien `tools.web.search.apiKey` se charge toujours via la couche de compatibilité, mais ce n'est plus le chemin de configuration canonique.

`webSearch.mode`Brave contrôle le transport Brave :

- `web`Brave (par défaut) : recherche web Brave normale avec des titres, des URL et des extraits
- `llm-context`BraveLLMAPI : API de contexte LLM Brave avec des blocs de texte pré-extraits et des sources pour le grounding

`webSearch.baseUrl`BraveBraveOpenClaw peut diriger les requêtes Brave vers un proxy compatible Brave de confiance
ou une passerelle. OpenClaw ajoute `/res/v1/web/search` ou `/res/v1/llm/context` à
l'URL de base configurée et conserve l'URL de base dans la clé de cache. Les
points de terminaison publics doivent utiliser `https://` ; `http://` n'est accepté que pour les hôtes proxy de bouclage de confiance
ou de réseau privé.

## Paramètres de l'outil

<ParamField path="query" type="string" required>
  Requête de recherche.
</ParamField>

<ParamField path="count" type="number" default="5">
  Nombre de résultats à renvoyer (1–10).
</ParamField>

<ParamField path="country" type="string">
  Code de pays ISO à 2 lettres (par ex. `US`, `DE`).
</ParamField>

<ParamField path="language" type="string">
  Code de langue ISO 639-1 pour les résultats de recherche (par ex. `en`, `de`, `fr`).
</ParamField>

<ParamField path="search_lang" type="string">
  Code de langue de recherche Brave (p. ex. `en`, `en-gb`, `zh-hans`).
</ParamField>

<ParamField path="ui_lang" type="string">
  Code de langue ISO pour les éléments de l'interface utilisateur.
</ParamField>

<ParamField path="freshness" type="'day' | 'week' | 'month' | 'year'">
  Filtre temporel — `day` correspond à 24 heures.
</ParamField>

<ParamField path="date_after" type="string">
  Uniquement les résultats publiés après cette date (`YYYY-MM-DD`).
</ParamField>

<ParamField path="date_before" type="string">
  Uniquement les résultats publiés avant cette date (`YYYY-MM-DD`).
</ParamField>

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

- OpenClaw utilise le plan Brave **Search**. Si vous disposez d'un abonnement hérité (par exemple, le plan Free original avec 2 000 requêtes/mois), il reste valide mais n'inclut pas les fonctionnalités plus récentes telles que le contexte LLM ou des limites de débit plus élevées.
- Chaque plan Brave inclut **\$5/mois de crédit gratuit** (renouvelable). Le plan de recherche coûte \$5 pour 1 000 requêtes, donc le crédit couvre 1 000 requêtes par mois. Définissez votre limite d'utilisation dans le tableau de bord Brave pour éviter des frais inattendus. Consultez le [portail Brave API](https://brave.com/search/api/) pour les plans actuels.
- Le plan de recherche inclut le point de terminaison de contexte LLM et les droits d'inférence IA. Le stockage des résultats pour entraîner ou régler des modèles nécessite un plan avec des droits de stockage explicites. Voir les [Conditions d'utilisation](https://api-dashboard.search.brave.com/terms-of-service) de Brave.
- Le mode `llm-context` renvoie des entrées de source ancrées au lieu de la forme normale d'extrait de recherche Web.
- Le mode `llm-context` prend en charge `freshness` et les plages bornées `date_after` + `date_before`. Il ne prend pas en charge `ui_lang` ; `date_before` sans `date_after` est rejeté car Brave exige que les plages de fraîcheur personnalisées incluent les dates de début et de fin.
- `ui_lang` doit inclure une sous-balise de région comme `en-US`.
- Les résultats sont mis en cache pendant 15 minutes par défaut (configurable via `cacheTtlMinutes`).
- Les valeurs `webSearch.baseUrl`Brave personnalisées sont incluses dans l'identité du cache Brave, ce qui évite que les réponses spécifiques aux proxies ne entrent en conflit.
- Activez l'indicateur de diagnostic `brave.http`BraveAPI pour consigner les URL/paramètres de requête Brave, l'état/le timing de la réponse, ainsi que les événements de succès/échec/écriture du cache de recherche lors du troubleshooting. L'indicateur ne consigne jamais la clé API ou les corps de réponse, mais les requêtes de recherche peuvent être sensibles.

## Connexes

- [Aperçu de la recherche Web](/fr/tools/web) -- tous les fournisseurs et la détection automatique
- [Recherche Perplexity](/fr/tools/perplexity-search) -- résultats structurés avec filtrage par domaine
- [Recherche Exa](/fr/tools/exa-search) -- recherche neuronale avec extraction de contenu
