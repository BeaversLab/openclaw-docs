---
summary: "Referencia de la CLI para `openclaw health` (endpoint de estado de la puerta de enlace a través de RPC)"
read_when:
  - You want to quickly check the running Gateway’s health
title: "health"
---

# `openclaw health`

Obtener el estado de la puerta de enlace en ejecución.

```bash
openclaw health
openclaw health --json
openclaw health --verbose
```

Notas:

- `--verbose` ejecuta sondeos en vivo e imprime tiempos por cuenta cuando se configuran varias cuentas.
- La salida incluye almacenes de sesión por agente cuando se configuran varios agentes.

import es from "/components/footer/es.mdx";

<es />
