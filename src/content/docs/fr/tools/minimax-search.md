---
summary: "MiniMaxAPIRecherche MiniMax via l'API de recherche Token Plan"
read_when:
  - You want to use MiniMax for web_search
  - You need a MiniMax Token Plan key or OAuth token
  - You want MiniMax CN/global search host guidance
title: "MiniMax search"
---

OpenClaw prend en charge MiniMax en tant que OpenClawMiniMax`web_search`MiniMaxAPI provider via l'API de recherche Token Plan de MiniMax. Il renvoie des résultats de recherche structurés avec des titres, des URL, des extraits et des requêtes associées.

## Obtenir les identifiants d'un plan de jetons

<Steps>
  <Step title="Create a key">
    Créez ou copiez une clé de plan de jetons MiniMax depuis
    [la plateforme MiniMax](https://platform.minimax.io/user-center/basic-information/interface-key).
    Les configurations OAuth peuvent réutiliser `MINIMAX_OAUTH_TOKEN` à la place.
  </Step>
  <Step title="Store the key">
    Définissez `MINIMAX_CODE_PLAN_KEY` dans l'environnement Gateway ou configurez via :

    ```bash
    openclaw configure --section web
    ```

  </Step>
</Steps>

OpenClaw accepte également OpenClaw`MINIMAX_CODING_API_KEY`, `MINIMAX_OAUTH_TOKEN` et
`MINIMAX_API_KEY` comme alias d'environnement. `MINIMAX_API_KEY`MiniMax doit pointer vers
une information d'identification Token Plan activée pour la recherche ; les clés d'API de modèle MiniMax ordinaires peuvent ne
pas être acceptées par le point de terminaison de recherche Token Plan.

## Config

```json5
{
  plugins: {
    entries: {
      minimax: {
        config: {
          webSearch: {
            apiKey: "sk-cp-...", // optional if a MiniMax Token Plan env var is set
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

**Alternative de l'environnement :** définissez `MINIMAX_CODE_PLAN_KEY`, `MINIMAX_CODING_API_KEY`,
`MINIMAX_OAUTH_TOKEN` ou `MINIMAX_API_KEY` dans l'environnement Gateway.
Pour une installation de passerelle, placez-le dans `~/.openclaw/.env`.

## Sélection de la région

MiniMax Search utilise ces points de terminaison :

- Global : `https://api.minimax.io/v1/coding_plan/search`
- CN : `https://api.minimaxi.com/v1/coding_plan/search`

Si `plugins.entries.minimax.config.webSearch.region` n'est pas défini, OpenClaw résout
la région dans cet ordre :

1. `tools.web.search.minimax.region` / `webSearch.region` appartenant au plugin
2. `MINIMAX_API_HOST`
3. `models.providers.minimax.baseUrl`
4. `models.providers.minimax-portal.baseUrl`

Cela signifie que l'onboarding CN ou `MINIMAX_API_HOST=https://api.minimaxi.com/...`
conserve automatiquement MiniMax Search sur l'hôte CN également.

Même si vous avez authentifié MiniMax via le chemin OAuth `minimax-portal`,
la recherche web s'enregistre toujours en tant qu'id de provider `minimax` ; l'URL de base du provider OAuth
est utilisée comme indication de région pour la sélection de l'hôte CN/global, et `MINIMAX_OAUTH_TOKEN`
peut satisfaire les informations d'identification bearer pour la recherche MiniMax.

## Paramètres pris en charge

| Paramètre | Type   | Contraintes | Description                                                                       |
| --------- | ------ | ----------- | --------------------------------------------------------------------------------- |
| `query`   | chaîne | requis      | Chaîne de recherche.                                                              |
| `count`   | entier | 1-10        | Nombre de résultats à renvoyer. OpenClaw réduit la liste renvoyée à cette taille. |

Les filtres spécifiques au fournisseur ne sont actuellement pas pris en charge.

## Connexes

- [Vue d'ensemble de la recherche Web](/fr/tools/web) -- tous les fournisseurs et détection automatique
- [MiniMax](/fr/providers/minimax) -- configuration du modèle, de l'image, de la voix et de l'authentification
