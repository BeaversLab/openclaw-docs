---
summary: "Référence CLI pour `openclaw uninstall` (supprimer le service de passerelle + les données locales)"
read_when:
  - You want to remove the gateway service and/or local state
  - You want a dry-run first
title: "uninstall"
---

# `openclaw uninstall`

Désinstaller le service de passerelle + les données locales (le CLI reste).

```bash
openclaw backup create
openclaw uninstall
openclaw uninstall --all --yes
openclaw uninstall --dry-run
```

Exécutez d'abord `openclaw backup create` si vous souhaitez une restauration par instantané avant de supprimer l'état ou les espaces de travail.

import fr from "/components/footer/fr.mdx";

<fr />
