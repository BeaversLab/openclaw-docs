---
summary: "Referencia de la CLI para `openclaw reset` (restablecer el estado/configuración local)"
read_when:
  - Deseas eliminar el estado local manteniendo la CLI instalada
  - Deseas una simulación de lo que se eliminaría
title: "reset"
---

# `openclaw reset`

Restablecer la configuración/estado local (mantiene la CLI instalada).

```bash
openclaw backup create
openclaw reset
openclaw reset --dry-run
openclaw reset --scope config+creds+sessions --yes --non-interactive
```

Ejecuta `openclaw backup create` primero si deseas una instantánea restaurable antes de eliminar el estado local.

import es from "/components/footer/es.mdx";

<es />
