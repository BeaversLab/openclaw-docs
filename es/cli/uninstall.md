---
summary: "Referencia de CLI para `openclaw uninstall` (eliminar servicio de puerta de enlace + datos locales)"
read_when:
  - Deseas eliminar el servicio de puerta de enlace y/o el estado local
  - Deseas hacer una prueba en seco primero
title: "uninstall"
---

# `openclaw uninstall`

Desinstala el servicio de puerta de enlace + datos locales (la CLI permanece).

```bash
openclaw backup create
openclaw uninstall
openclaw uninstall --all --yes
openclaw uninstall --dry-run
```

Ejecuta `openclaw backup create` primero si deseas una instantánea restaurable antes de eliminar el estado o los espacios de trabajo.

import en from "/components/footer/en.mdx";

<en />
