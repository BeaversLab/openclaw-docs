---
summary: "Referencia de la CLI para `openclaw reset` (restablecer el estado/configuración local)"
read_when:
  - You want to wipe local state while keeping the CLI installed
  - You want a dry-run of what would be removed
title: "restablecer"
---

# `openclaw reset`

Restablecer la configuración/estado local (mantiene la CLI instalada).

```bash
openclaw backup create
openclaw reset
openclaw reset --dry-run
openclaw reset --scope config+creds+sessions --yes --non-interactive
```

Ejecute `openclaw backup create` primero si desea una instantánea recuperable antes de eliminar el estado local.
