---
summary: "Referencia de CLI para `openclaw system` (eventos del sistema, latido, presencia)"
read_when:
  - You want to enqueue a system event without creating a cron job
  - You need to enable or disable heartbeats
  - You want to inspect system presence entries
title: "sistema"
---

# `openclaw system`

Auxiliares de nivel del sistema para la puerta de enlace (Gateway): poner en cola eventos del sistema, controlar los latidos
y ver la presencia.

## Comandos comunes

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
openclaw system heartbeat enable
openclaw system heartbeat last
openclaw system presence
```

## `system event`

Pone en cola un evento del sistema en la sesión **principal**. El siguiente latido lo inyectará
como una línea `System:` en el indicador. Use `--mode now` para activar el latido
inmediatamente; `next-heartbeat` espera el siguiente ciclo programado.

Opciones:

- `--text <text>`: texto del evento del sistema requerido.
- `--mode <mode>`: `now` o `next-heartbeat` (predeterminado).
- `--json`: salida legible por máquina.

## `system heartbeat last|enable|disable`

Controles de latido:

- `last`: muestra el último evento de latido.
- `enable`: reactiva los latidos (use esto si se desactivaron).
- `disable`: pausa los latidos.

Opciones:

- `--json`: salida legible por máquina.

## `system presence`

Enumera las entradas de presencia del sistema actuales que la puerta de enlace (Gateway) conoce (nodos,
instancias y líneas de estado similares).

Opciones:

- `--json`: salida legible por máquina.

## Notas

- Requiere una puerta de enlace (Gateway) en ejecución accesible por su configuración actual (local o remota).
- Los eventos del sistema son efímeros y no se guardan entre reinicios.
