---
summary: "Recherche MiniMax via l'API de recherche Coding Plan"
read_when:
  - You want to use MiniMax for web_search
  - You need a MiniMax Coding Plan key
  - You want MiniMax CN/global search host guidance
title: "MiniMax search"
---

OpenClaw prend en charge MiniMax en tant que `web_search` provider via l'API de recherche MiniMax Coding Plan. Il renvoie des résultats de recherche structurés avec des titres, des URL, des extraits et des requêtes associées.

## Obtenir une clé Coding Plan

<Steps>
  <Step title="Create a key">
    Créez ou copiez une clé MiniMax Coding Plan depuis
    [MiniMax Platform](https://platform.minimax.io/user-center/basic-information/interface-key).
  </Step>
  <Step title="Store the key">
    Définissez `MINIMAX_CODE_PLAN_KEY` dans l'environnement Gateway, ou configurez via :

    ```bash
    openclaw configure --section web
    ```

  </Step>
</Steps>

OpenClaw accepte également `MINIMAX_CODING_API_KEY` comme alias d'environnement. `MINIMAX_API_KEY`
est toujours lu en tant que solution de repli de compatibilité lorsqu'il pointe déjà vers un jeton coding-plan.

## Config

```json5
{
  plugins: {
    entries: {
      minimax: {
        config: {
          webSearch: {
            apiKey: "sk-cp-...", // optional if MINIMAX_CODE_PLAN_KEY is set
            region: "global", // or "cn"
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "minimax",
      },
    },
  },
}
```

**Alternative d'environnement :** définissez `MINIMAX_CODE_PLAN_KEY` dans l'environnement Gateway.
Pour une installation gateway, placez-le dans `~/.openclaw/.env`.

## Sélection de la région

MiniMax Search utilise ces points de terminaison :

- Global : `https://api.minimax.io/v1/coding_plan/search`
- CN : `https://api.minimaxi.com/v1/coding_plan/search`

Si `plugins.entries.minimax.config.webSearch.region` n'est pas défini, OpenClaw résout
la région dans cet ordre :

1. `tools.web.search.minimax.region` / plugin-owned `webSearch.region`
2. `MINIMAX_API_HOST`
3. `models.providers.minimax.baseUrl`
4. `models.providers.minimax-portal.baseUrl`

Cela signifie que l'onboarding CN ou `MINIMAX_API_HOST=https://api.minimaxi.com/...`
conserve automatiquement MiniMax Search sur l'hôte CN également.

Même lorsque vous avez authentifié MiniMax via le chemin `minimax-portal` OAuth,
la recherche web s'enregistre toujours en tant que provider id `minimax` ; l'URL de base du provider OAuth
est utilisée uniquement comme indicateur de région pour la sélection de l'hôte CN/global.

## Paramètres pris en charge

MiniMax Search prend en charge :

- `query`
- `count` (OpenClaw réduit la liste des résultats renvoyés au nombre demandé)

Les filtres spécifiques au provider ne sont actuellement pas pris en charge.

## Connexes

- [Web Search overview](/fr/tools/web) -- tous les providers et la détection automatique
- [MiniMax](/fr/providers/minimax) -- modèle, image, voix et authentification
