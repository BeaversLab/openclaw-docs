---
summary: "Référence CLI pour `openclaw docs` (rechercher dans l'index de la documentation en direct)"
read_when:
  - You want to search the live OpenClaw docs from the terminal
title: "docs"
---

# `openclaw docs`

Rechercher dans l'index de la documentation en direct.

Arguments :

- `[query...]` : termes de recherche à envoyer à l'index de la documentation en direct

Exemples :

```bash
openclaw docs
openclaw docs browser existing-session
openclaw docs sandbox allowHostControl
openclaw docs gateway token secretref
```

Notes :

- Sans requête, `openclaw docs` ouvre le point d'entrée de recherche de la documentation en direct.
- Les requêtes à plusieurs mots sont transmises en tant que demande de recherche unique.
