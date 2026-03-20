---
summary: "Référence de la CLI pour `openclaw reset` (réinitialiser l'état/config local)"
read_when:
  - Vous souhaitez effacer l'état local tout en gardant la CLI installée
  - Vous souhaitez un essai à blanc (dry-run) de ce qui serait supprimé
title: "reset"
---

# `openclaw reset`

Réinitialise la configuration/l'état local (garde la CLI installée).

```bash
openclaw backup create
openclaw reset
openclaw reset --dry-run
openclaw reset --scope config+creds+sessions --yes --non-interactive
```

Exécutez `openclaw backup create` d'abord si vous souhaitez une instantanée (snapshot) restorable avant de supprimer l'état local.

import en from "/components/footer/en.mdx";

<en />
