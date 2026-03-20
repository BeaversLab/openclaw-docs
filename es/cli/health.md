---
summary: "Referencia de la CLI para `openclaw health` (endpoint de estado de la puerta de enlace a través de RPC)"
read_when:
  - Deseas verificar rápidamente el estado de la puerta de enlace en ejecución
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

- `--verbose` ejecuta sondeos en vivo e imprime los tiempos por cuenta cuando se configuran varias cuentas.
- La salida incluye almacenes de sesión por agente cuando se configuran varios agentes.

import es from "/components/footer/es.mdx";

<es />
