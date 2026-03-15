---
summary: "Référence de la CLI pour `openclaw reset` (réinitialiser l'état/la configuration locale)"
read_when:
  - You want to wipe local state while keeping the CLI installed
  - You want a dry-run of what would be removed
title: "reset"
---

# `openclaw reset`

Réinitialiser la configuration/l'état locaux (garde la CLI installée).

```bash
openclaw backup create
openclaw reset
openclaw reset --dry-run
openclaw reset --scope config+creds+sessions --yes --non-interactive
```

Exécutez d'abord `openclaw backup create` si vous souhaitez une snapshot restaurable avant de supprimer l'état local.

import fr from '/components/footer/fr.mdx';

<fr />
