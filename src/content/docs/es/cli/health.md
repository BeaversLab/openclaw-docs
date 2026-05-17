---
summary: "Referencia de la CLI para `openclaw health` (instantánea de salud de la puerta de enlace a través de RPC)"
read_when:
  - You want to quickly check the running Gateway's health
title: "Salud"
---

# `openclaw health`

Obtener el estado de la puerta de enlace en ejecución.

## Opciones

| Opción           | Predeterminado | Descripción                                                                  |
| ---------------- | -------------- | ---------------------------------------------------------------------------- |
| `--json`         | `false`        | Imprime JSON legible por máquina en lugar de texto.                          |
| `--timeout <ms>` | `10000`        | Tiempo de espera de conexión en milisegundos.                                |
| `--verbose`      | `false`        | Registro detallado. Fuerza un sondeo en vivo y expande la salida por agente. |
| `--debug`        | `false`        | Alias para `--verbose`.                                                      |

Ejemplos:

```bash
openclaw health
openclaw health --json
openclaw health --timeout 2500
openclaw health --verbose
openclaw health --debug
```

Notas:

- El `openclaw health` predeterminado solicita a la puerta de enlace en ejecución su instantánea de salud. Cuando la
  puerta de enlace ya tiene una instantánea en caché fresca, puede devolver esa carga útil en caché y
  actualizarla en segundo plano.
- `--verbose` fuerza un sondeo en vivo, imprime los detalles de conexión de la puerta de enlace y expande la
  salida legible por humanos en todas las cuentas y agentes configurados.
- La salida incluye almacenes de sesión por agente cuando se configuran múltiples agentes.

## Relacionado

- [Referencia de la CLI](/es/cli)
- [Salud de la puerta de enlace](/es/gateway/health)
