---
summary: "Solucionar problemas de programación y entrega de cron y heartbeat"
read_when:
  - Cron did not run
  - Cron ran but no message was delivered
  - Heartbeat seems silent or skipped
title: "Solución de problemas de automatización"
---

# Solución de problemas de automatización

Use esta página para problemas del programador y de entrega (`cron` + `heartbeat`).

## Escalera de comandos

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

Luego ejecute comprobaciones de automatización:

```bash
openclaw cron status
openclaw cron list
openclaw system heartbeat last
```

## Cron no se ejecuta

```bash
openclaw cron status
openclaw cron list
openclaw cron runs --id <jobId> --limit 20
openclaw logs --follow
```

Una buena salida se ve así:

- `cron status` informa habilitado y un `nextWakeAtMs` futuro.
- El trabajo está habilitado y tiene una zona horaria/programación válida.
- `cron runs` muestra `ok` o un motivo explícito de omisión.

Firmas comunes:

- `cron: scheduler disabled; jobs will not run automatically` → cron deshabilitado en config/env.
- `cron: timer tick failed` → el tick del programador falló; inspeccione el contexto de pila/log circundante.
- `reason: not-due` en la salida de ejecución → se llamó a la ejecución manual sin `--force` y el trabajo aún no vence.

## Cron se ejecutó pero no hay entrega

```bash
openclaw cron runs --id <jobId> --limit 20
openclaw cron list
openclaw channels status --probe
openclaw logs --follow
```

Una buena salida se ve así:

- El estado de ejecución es `ok`.
- El modo/objetivo de entrega están configurados para trabajos aislados.
- El sondeo del canal informa que el canal objetivo está conectado.

Firmas comunes:

- La ejecución se realizó correctamente pero el modo de entrega es `none` → no se espera ningún mensaje externo.
- Objetivo de entrega faltante/no válido (`channel`/`to`) → la ejecución puede tener éxito internamente pero omitir el envío saliente.
- Errores de autenticación del canal (`unauthorized`, `missing_scope`, `Forbidden`) → entrega bloqueada por credenciales/permisos del canal.

## Latido (heartbeat) suprimido u omitido

```bash
openclaw system heartbeat last
openclaw logs --follow
openclaw config get agents.defaults.heartbeat
openclaw channels status --probe
```

Una buena salida se ve así:

- Latido habilitado con intervalo distinto de cero.
- El resultado del último latido es `ran` (o se entiende el motivo de la omisión).

Firmas comunes:

- `heartbeat skipped` con `reason=quiet-hours` → fuera de `activeHours`.
- `requests-in-flight` → carril principal ocupado; latido diferido.
- `empty-heartbeat-file` → latido de intervalo omitido porque `HEARTBEAT.md` no tiene contenido procesable y no hay ningún evento cron etiquetado en cola.
- `alerts-disabled` → la configuración de visibilidad suprime los mensajes de latido salientes.

## Problemas de zona horaria y activeHours

```bash
openclaw config get agents.defaults.heartbeat.activeHours
openclaw config get agents.defaults.heartbeat.activeHours.timezone
openclaw config get agents.defaults.userTimezone || echo "agents.defaults.userTimezone not set"
openclaw cron list
openclaw logs --follow
```

Reglas rápidas:

- `Config path not found: agents.defaults.userTimezone` significa que la clave no está establecida; el latido vuelve a la zona horaria del host (o a `activeHours.timezone` si está establecida).
- Cron sin `--tz` utiliza la zona horaria del host de la puerta de enlace.
- El latido `activeHours` utiliza la resolución de zona horaria configurada (`user`, `local` o zona horaria IANA explícita).
- Las programaciones de Cron `at` tratan las marcas de tiempo ISO sin zona horaria como UTC a menos que haya utilizado la CLI `--at "<offset-less-iso>" --tz <iana>`.

Firmas comunes:

- Los trabajos se ejecutan a la hora incorrecta del reloj después de los cambios de zona horaria del host.
- Heartbeat siempre se omite durante su horario diurno porque `activeHours.timezone` es incorrecto.

Relacionado:

- [/automation/cron-jobs](/es/automation/cron-jobs)
- [/gateway/heartbeat](/es/gateway/heartbeat)
- [/automation/cron-vs-heartbeat](/es/automation/cron-vs-heartbeat)
- [/concepts/timezone](/es/concepts/timezone)

import es from "/components/footer/es.mdx";

<es />
