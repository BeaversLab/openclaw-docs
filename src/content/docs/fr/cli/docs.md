---
summary: "CLIRéférence de la CLI pour `openclaw docs` (rechercher l'index de la documentation en direct)"
read_when:
  - You want to search the live OpenClaw docs from the terminal
  - You need to know which helper binaries the docs CLI shells out to
title: "Docs"
---

# `openclaw docs`

Recherchez l'index de la documentation OpenClaw en direct depuis le terminal. La commande fait appel au point de terminaison de recherche MCP de la documentation hébergée publiquement par Mintlify sur OpenClaw`https://docs.openclaw.ai/mcp.SearchOpenClaw` et affiche les résultats dans votre terminal.

## Utilisation

```bash
openclaw docs                       # print docs entrypoint and example search
openclaw docs <query...>            # search the live docs index
```

Arguments :

| Argument     | Description                                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `[query...]` | Recherche de forme libre. Les requêtes à plusieurs mots sont jointes par des espaces et envoyées comme une seule requête. |

## Exemples

```bash
openclaw docs browser existing-session
openclaw docs sandbox allowHostControl
openclaw docs gateway token secretref
```

Sans requête, `openclaw docs` affiche l'URL du point d'entrée de la documentation ainsi qu'une commande de recherche exemple au lieu d'effectuer une recherche.

## Fonctionnement

`openclaw docs` invoque la CLI `mcporter`CLI pour appeler l'outil MCP de recherche de documentation, puis analyse les blocs `Title: / Link: / Content:` de la sortie de l'outil pour obtenir une liste de résultats.

Pour résoudre `mcporter`OpenClaw, OpenClaw vérifie dans l'ordre :

1. `mcporter` sur `PATH` (utilisé directement si présent).
2. `pnpm dlx mcporter ...` si `pnpm` est installé.
3. `npx -y mcporter ...` si `npx` est installé.

Si aucun n'est disponible, la commande échoue avec une suggestion d'installer `pnpm` (`npm install -g pnpm`).

L'appel de recherche utilise un délai d'attente fixe de 30 secondes. Les extraits de résultats sont tronqués à environ 220 caractères par entrée.

## Sortie

Dans un terminal riche (TTY), les résultats sont affichés sous forme d'un titre suivi d'une liste à puces. Chaque puce affiche le titre de la page, l'URL de la documentation liée et un court extrait sur la ligne suivante. Les résultats vides affichent « Aucun résultat ».

En sortie non riche (redirigée via un tube, `--no-color`, scripts), les mêmes données sont rendues au format Markdown :

```markdown
# Docs search: <query>

- [Title](https://docs.openclaw.ai/...) - snippet
- [Title](https://docs.openclaw.ai/...) - snippet
```

## Codes de sortie

| Code | Signification                                                 |
| ---- | ------------------------------------------------------------- |
| `0`  | Recherche réussie (y compris les réponses sans résultat).     |
| `1`  | L'appel à l'outil MCP a échoué ; stderr est affiché en ligne. |

## Connexes

- [Référence de la CLI](CLI/en/cli)
- [Documentation en direct](https://docs.openclaw.ai)
