---
summary: "Référence de la CLI pour `openclaw uninstall` (supprimer le service passerelle + données locales)"
read_when:
  - Vous souhaitez supprimer le service passerelle et/ou l'état local
  - Vous souhaitez d'abord effectuer un essai à blanc
title: "uninstall"
---

# `openclaw uninstall`

Désinstaller le service passerelle + les données locales (la CLI reste installée).

```bash
openclaw backup create
openclaw uninstall
openclaw uninstall --all --yes
openclaw uninstall --dry-run
```

Exécutez d'abord `openclaw backup create` si vous souhaitez une snapshot restaurable avant de supprimer l'état ou les espaces de travail.

import en from "/components/footer/en.mdx";

<en />
