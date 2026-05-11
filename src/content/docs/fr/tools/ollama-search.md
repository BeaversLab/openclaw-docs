---
summary: "Recherche Web Ollama via un hôte Ollama local ou l'API Ollama hébergée"
read_when:
  - You want to use Ollama for web_search
  - You want a key-free web_search provider
  - You want to use hosted Ollama Web Search with OLLAMA_API_KEY
  - You need Ollama Web Search setup guidance
title: "Recherche Web Ollama"
---

OpenClaw prend en charge **Ollama Web Search** en tant que fournisseur `web_search` intégré. Il
utilise l'API de recherche web d'Ollama et renvoie des résultats structurés avec des titres, des URL,
et des extraits.

Pour Ollama en local ou auto-hébergé, cette configuration ne nécessite pas de clé API par
défaut. Elle nécessite cependant :

- un hôte Ollama accessible depuis OpenClaw
- `ollama signin`

Pour une recherche hébergée directe, définissez l'URL de base du fournisseur Ollama sur `https://ollama.com`
et fournissez une vraie `OLLAMA_API_KEY`.

## Configuration

<Steps>
  <Step title="Démarrer Ollama">
    Assurez-vous qu'Ollama est installé et en cours d'exécution.
  </Step>
  <Step title="Se connecter">
    Exécutez :

    ```bash
    ollama signin
    ```

  </Step>
  <Step title="Choisir Ollama Web Search">
    Exécutez :

    ```bash
    openclaw configure --section web
    ```

    Sélectionnez ensuite **Ollama Web Search** comme fournisseur.

  </Step>
</Steps>

Si vous utilisez déjà Ollama pour les modèles, la Recherche Web Ollama réutilise le même
hôte configuré.

## Config

```json5
{
  tools: {
    web: {
      search: {
        provider: "ollama",
      },
    },
  },
}
```

Remplacement facultatif de l'hôte Ollama :

```json5
{
  plugins: {
    entries: {
      ollama: {
        config: {
          webSearch: {
            baseUrl: "http://ollama-host:11434",
          },
        },
      },
    },
  },
}
```

Si vous avez déjà configuré Ollama comme fournisseur de modèle, le fournisseur de recherche web peut
réutiliser cet hôte à la place :

```json5
{
  models: {
    providers: {
      ollama: {
        baseUrl: "http://ollama-host:11434",
      },
    },
  },
}
```

Le fournisseur de modèle Ollama utilise `baseUrl` comme clé canonique. Le fournisseur de recherche web honore également `baseURL` sur `models.providers.ollama` pour la compatibilité avec les exemples de configuration style SDK OpenAI.

Si aucune URL de base Ollama explicite n'est définie, OpenClaw utilise `http://127.0.0.1:11434`.

Si votre hôte Ollama attend une authentification par porteur (bearer), OpenClaw réutilise
`models.providers.ollama.apiKey` (ou l'authentification du fournisseur correspondante basée sur les variables d'environnement)
pour les requêtes vers cet hôte configuré.

Recherche Web Ollama hébergée directe :

```json5
{
  models: {
    providers: {
      ollama: {
        baseUrl: "https://ollama.com",
        apiKey: "OLLAMA_API_KEY",
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "ollama",
      },
    },
  },
}
```

## Notes

- Aucun champ de clé API spécifique à la recherche web n'est requis pour ce fournisseur.
- Si l'hôte Ollama est protégé par une authentification, OpenClaw réutilise la clé API normale du
  fournisseur Ollama lorsqu'elle est présente.
- Si `baseUrl` est `https://ollama.com`, OpenClaw appelle
  `https://ollama.com/api/web_search` directement et envoie la clé API Ollama
  configurée en tant qu'authentification par porteur (bearer auth).
- Si l'hôte configuré n'expose pas la recherche web et que `OLLAMA_API_KEY` est défini,
  OpenClaw peut revenir à `https://ollama.com/api/web_search` sans envoyer
  cette clé d'environnement à l'hôte local.
- OpenClaw avertit lors de la configuration si Ollama est injoignable ou non connecté, mais
  cela ne bloque pas la sélection.
- L'auto-détection à l'exécution peut revenir à Ollama Web Search lorsqu'aucun provider
  avec identifiants de priorité plus élevée n'est configuré.
- Les hôtes de démonom Ollama locaux utilisent le point de terminaison de proxy local
  `/api/experimental/web_search`, qui signe et transfère vers Ollama Cloud.
- Les hôtes `https://ollama.com` utilisent le point de terminataire hébergé public
  `/api/web_search` directement avec l'authentification par clé API bearer.

## Connexes

- [Aperçu de la recherche web](/fr/tools/web) -- tous les providers et l'auto-détection
- [Ollama](/fr/providers/ollama) -- configuration du modèle Ollama et modes cloud/local
