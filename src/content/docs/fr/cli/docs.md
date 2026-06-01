---
summary: "CLIRéférence de la CLI pour `openclaw docs` (rechercher l'index de la documentation en direct)"
read_when:
  - You want to search the live OpenClaw docs from the terminal
  - You need to know which hosted search API the docs CLI calls
title: "Docs"
---

# `openclaw docs`

Recherchez l'index des documents OpenClaw en direct depuis le terminal. La commande appelle l'API de recherche de documents hébergée par Cloudflare de OpenClawAPI et affiche les résultats dans votre terminal.

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

Sans requête, `openclaw docs` affiche l'URL du point d'entrée des documents ainsi qu'un exemple de commande de recherche au lieu d'effectuer une recherche.

## Fonctionnement

`openclaw docs` appelle `https://docs.openclaw.ai/api/search` et restitue les résultats JSON. L'appel de recherche utilise un délai d'expiration fixe de 30 secondes.

## Sortie

Dans un terminal riche (TTY), les résultats s'affichent sous forme d'un titre suivi d'une liste à puces. Chaque puce affiche le titre de la page, l'URL des documents liée et un court extrait sur la ligne suivante. Les résultats vides affichent "Aucun résultat.".

Dans une sortie non riche (redirigée, `--no-color`, scripts), les mêmes données sont restituées sous forme de Markdown :

```markdown
# Docs search: <query>

- [Title](https://docs.openclaw.ai/...) - snippet
- [Title](https://docs.openclaw.ai/...) - snippet
```

## Codes de sortie

| Code | Signification                                                                              |
| ---- | ------------------------------------------------------------------------------------------ |
| `0`  | Recherche réussie (y compris les réponses sans résultat).                                  |
| `1`  | L'appel à l'API de recherche de documents hébergée a échoué ; stderr est affiché en ligne. |

## Connexes

- [Référence CLI](/fr/cli)
- [Documents en direct](https://docs.openclaw.ai)
