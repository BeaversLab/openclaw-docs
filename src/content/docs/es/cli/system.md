---
summary: "Referencia de CLI para `openclaw system` (eventos del sistema, latido, presencia)"
read_when:
  - You want to enqueue a system event without creating a cron job
  - You need to enable or disable heartbeats
  - You want to inspect system presence entries
title: "Sistema"
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

Pone en cola un evento del sistema en la sesión **main** de manera predeterminada. El siguiente latido
lo inyectará como una línea `System:` en el prompt. Use `--mode now` para activar
el latido inmediatamente; `next-heartbeat` espera el siguiente tick programado.

Pase `--session-key` para apuntar a una sesión específica (por ejemplo, para retransmitir la
finalización de una tarea asincrónica de vuelta al canal que la inició).

> **Excepción de tiempo con `--session-key`:** cuando se proporciona `--session-key`,
> `--mode next-heartbeat` colapsa en un activado específico inmediato en lugar de
> esperar el siguiente tick programado. Los activados específicos usan la intención de latido
> `immediate` por lo que evitan la compuerta de no vencido del runner que de otro modo
> diferiría (y efectivamente dejaría caer) un activado de intención `event`. Si desea una entrega
> retrasada, omita `--session-key` para que el evento aterrice en la sesión principal y
> monte el siguiente latido regular.

Opciones:

- `--text <text>`: texto de evento del sistema requerido.
- `--mode <mode>`: `now` o `next-heartbeat` (predeterminado).
- `--session-key <sessionKey>` opcional; apunta a una sesión de agente específica
  en lugar de la sesión principal del agente. Las claves que no pertenecen al
  agente resuelto vuelven a la sesión principal del agente.
- `--json`: salida legible por máquina.
- `--url`, `--token`, `--timeout`, `--expect-final`: opciones compartidas de Gateway RPC.

## `system heartbeat last|enable|disable`

Controles de latido:

- `last`: mostrar el último evento de latido.
- `enable`: volver a activar los latidos (use esto si estaban desactivados).
- `disable`: pausar los latidos.

Opciones:

- `--json`: salida legible por máquina.
- `--url`, `--token`, `--timeout`, `--expect-final`: opciones compartidas de Gateway RPC.

## `system presence`

Enumera las entradas de presencia del sistema actuales que el Gateway conoce (nodos,
instancias y líneas de estado similares).

Opciones:

- `--json`: salida legible por máquina.
- `--url`, `--token`, `--timeout`, `--expect-final`: opciones compartidas de RPC del Gateway.

## Notas

- Requiere un Gateway en ejecución accesible por su configuración actual (local o remota).
- Los eventos del sistema son efímeros y no se conservan entre reinicios.

## Relacionado

- [Referencia de la CLI](/es/cli)
