---
summary: "Referencia de la CLI para `openclaw health` (instantánea de salud de la puerta de enlace a través de RPC)"
read_when:
  - You want to quickly check the running Gateway’s health
title: "health"
---

# `openclaw health`

Obtener el estado de la puerta de enlace en ejecución.

Opciones:

- `--json`: salida legible por máquina
- `--timeout <ms>`: tiempo de espera de conexión en milisegundos (predeterminado `10000`)
- `--verbose`: registro detallado
- `--debug`: alias para `--verbose`

Ejemplos:

```bash
openclaw health
openclaw health --json
openclaw health --timeout 2500
openclaw health --verbose
openclaw health --debug
```

Notas:

- El `openclaw health` predeterminado le pide a la puerta de enlace en ejecución su instantánea de salud. Cuando la
  puerta de enlace ya tiene una instantánea en caché fresca, puede devolver esa carga útil en caché y
  actualizarla en segundo plano.
- `--verbose` fuerza una sondel en vivo, imprime los detalles de conexión de la puerta de enlace y expande la
  salida legible por humanos en todas las cuentas y agentes configurados.
- La salida incluye almacenes de sesión por agente cuando se configuran múltiples agentes.
