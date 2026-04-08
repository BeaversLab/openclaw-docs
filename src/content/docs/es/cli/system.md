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

Todos los subcomandos de `system` usan el RPC de Gateway y aceptan los indicadores de cliente compartidos:

- `--url <url>`
- `--token <token>`
- `--timeout <ms>`
- `--expect-final`

## Comandos comunes

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
openclaw system event --text "Check for urgent follow-ups" --url ws://127.0.0.1:18789 --token "$OPENCLAW_GATEWAY_TOKEN"
openclaw system heartbeat enable
openclaw system heartbeat last
openclaw system presence
```

## `system event`

Pone en cola un evento del sistema en la sesión **principal**. El siguiente latido lo inyectará
como una línea `System:` en el mensaje. Use `--mode now` para activar el latido
inmediatamente; `next-heartbeat` espera el siguiente tic programado.

Indicadores:

- `--text <text>`: texto de evento del sistema requerido.
- `--mode <mode>`: `now` o `next-heartbeat` (predeterminado).
- `--json`: salida legible por máquina.
- `--url`, `--token`, `--timeout`, `--expect-final`: indicadores compartidos de Gateway RPC.

## `system heartbeat last|enable|disable`

Controles de latido:

- `last`: muestra el último evento de latido.
- `enable`: reactiva los latidos (úselo si se desactivaron).
- `disable`: pausa los latidos.

Indicadores:

- `--json`: salida legible por máquina.
- `--url`, `--token`, `--timeout`, `--expect-final`: indicadores compartidos de Gateway RPC.

## `system presence`

Enumera las entradas de presencia del sistema actuales que conoce el Gateway (nodos,
instancias y líneas de estado similares).

Indicadores:

- `--json`: salida legible por máquina.
- `--url`, `--token`, `--timeout`, `--expect-final`: indicadores compartidos de Gateway RPC.

## Notas

- Requiere un Gateway en ejecución accesible por su configuración actual (local o remota).
- Los eventos del sistema son efímeros y no se conservan entre reinicios.
