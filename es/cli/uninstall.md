---
summary: "Referencia de la CLI para `openclaw uninstall` (eliminar servicio de puerta de enlace + datos locales)"
read_when:
  - You want to remove the gateway service and/or local state
  - You want a dry-run first
title: "desinstalar"
---

# `openclaw uninstall`

Desinstale el servicio de puerta de enlace + los datos locales (la CLI permanece).

```bash
openclaw backup create
openclaw uninstall
openclaw uninstall --all --yes
openclaw uninstall --dry-run
```

Ejecute `openclaw backup create` primero si desea una instantánea restaurable antes de eliminar el estado o los espacios de trabajo.

import es from "/components/footer/es.mdx";

<es />
