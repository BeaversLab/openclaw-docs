---
summary: "Recherche web SearXNG -- fournisseur de méta-recherche auto-hébergé et sans clé"
read_when:
  - You want a self-hosted web search provider
  - You want to use SearXNG for web_search
  - You need a privacy-focused or air-gapped search option
title: "Recherche SearXNG"
---

OpenClaw prend en charge [SearXNG](OpenClawhttps://docs.searxng.org/) en tant que fournisseur `web_search` **auto-hébergé, sans clé**. SearXNG est un méta-moteur de recherche open source qui agrège les résultats de Google, Bing, DuckDuckGo et d'autres sources.

Avantages :

- **Gratuit et illimité** -- aucune clé API ou abonnement commercial requis
- **Confidentialité / air-gap** -- les requêtes ne quittent jamais votre réseau
- **Fonctionne partout** -- aucune restriction régionale sur les API de recherche commerciales

## Configuration

<Steps>
  <Step title="Exécuter une instance SearXNG">
    ```bash
    docker run -d -p 8888:8080 searxng/searxng
    ```

    Ou utilisez n'importe quel déploiement SearXNG existant auquel vous avez accès. Consultez la [documentation SearXNG](https://docs.searxng.org/) pour la configuration de production.

  </Step>
  <Step title="Configurer">
    ```bash
    openclaw configure --section web
    # Select "searxng" as the provider
    ```

    Ou définissez la variable d'environnement et laissez la détection automatique la trouver :

    ```bash
    export SEARXNG_BASE_URL="http://localhost:8888"
    ```

  </Step>
</Steps>

## Config

```json5
{
  tools: {
    web: {
      search: {
        provider: "searxng",
      },
    },
  },
}
```

Paramètres au niveau du plugin pour l'instance SearXNG :

```json5
{
  plugins: {
    entries: {
      searxng: {
        config: {
          webSearch: {
            baseUrl: "http://localhost:8888",
            categories: "general,news", // optional
            language: "en", // optional
          },
        },
      },
    },
  },
}
```

Le champ `baseUrl` accepte également les objets SecretRef.

Règles de transport :

- `https://` fonctionne pour les hôtes SearXNG publics ou privés
- `http://` n'est accepté que pour les hôtes de réseau privé de confiance ou de boucle locale (loopback)
- les hôtes SearXNG publics doivent utiliser `https://`
- les hôtes privés/internes utilisent le garde réseau auto-hébergé ; les hôtes `https://` publics restent sur le garde de recherche web stricte et ne peuvent pas rediriger vers des adresses privées

## Variable d'environnement

Définissez `SEARXNG_BASE_URL` comme alternative à la configuration :

```bash
export SEARXNG_BASE_URL="http://localhost:8888"
```

Lorsque `SEARXNG_BASE_URL` est défini et qu'aucun fournisseur explicite n'est configuré, la détection automatique choisit SearXNG automatiquement (à la priorité la plus basse -- tout fournisseur API avec une clé gagne en premier).

## Référence de la configuration du plugin

| Champ        | Description                                                                    |
| ------------ | ------------------------------------------------------------------------------ |
| `baseUrl`    | URL de base de votre instance SearXNG (requis)                                 |
| `categories` | Catégories séparées par des virgules telles que `general`, `news` ou `science` |
| `language`   | Code de langue pour les résultats tel que `en`, `de` ou `fr`                   |

## Notes

- **JSON API** -- utilise le point de terminaison natif `format=json` de SearXNG, pas le scraping HTML
- **URL des résultats d'images** -- les résultats de la catégorie image incluent `img_src` lorsque SearXNG renvoie une URL d'image directe
- **Pas de clé API** -- fonctionne avec n'importe quelle instance SearXNG hors de la boîte
- **Validation de l'URL de base** -- `baseUrl` doit être une URL `http://` ou `https://` valide ; les hôtes publics doivent utiliser `https://`
- **Garde réseau** -- les points de terminaison SearXNG privés/internes optent pour l'accès au réseau privé ; les points de terminaison SearXNG `https://` publics gardent une protection SSRF stricte
- **Ordre de détection automatique** -- SearXNG est vérifié en dernier (ordre 200) lors
  de la détection automatique. Les fournisseurs prenant en charge l'API avec des clés configurées s'exécutent en premier, puis
  DuckDuckGo (ordre 100), puis Ollama Web Search (ordre 110)
- **Auto-hébergé** -- vous contrôlez l'instance, les requêtes et les moteurs de recherche amont
- **Catégories** définies par défaut sur `general` si elles ne sont pas configurées
- **Repli de catégorie** -- si une demande de catégorie non-`general` réussit mais
  renvoie zéro résultat, OpenClaw réessaie la même requête une fois avec `general`
  avant de renvoyer un ensemble de résultats vide

<Tip>Pour que l'API JSON de SearXNG fonctionne, assurez-vous que votre instance SearXNG a le format `json` activé dans son `settings.yml` sous `search.formats`.</Tip>

## Connexes

- [Aperçu de la recherche Web](/fr/tools/web) -- tous les fournisseurs et la détection automatique
- [Recherche DuckDuckGo](/fr/tools/duckduckgo-search) -- un autre repli sans clé
- [Recherche Brave](/fr/tools/brave-search) -- résultats structurés avec une offre gratuite
