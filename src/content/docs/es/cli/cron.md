---
summary: "Referencia de la CLI para `openclaw cron` (programar y ejecutar trabajos en segundo plano)"
read_when:
  - You want scheduled jobs and wakeups
  - You’re debugging cron execution and logs
title: "cron"
---

# `openclaw cron`

Administra trabajos de cron para el programador del Gateway.

Relacionado:

- Trabajos de cron: [Trabajos de cron](/en/automation/cron-jobs)

Sugerencia: ejecuta `openclaw cron --help` para ver la superficie completa de comandos.

Nota: los trabajos aislados `cron add` tienen por defecto el envío `--announce`. Usa `--no-deliver` para mantener
la salida interna. `--deliver` permanece como un alias obsoleto para `--announce`.

Nota: los trabajos de una sola vez (`--at`) se eliminan después del éxito de forma predeterminada. Usa `--keep-after-run` para mantenerlos.

Nota: para trabajos de CLI de una sola vez, las fechas y horas `--at` sin desfase se tratan como UTC a menos que también pases `--tz <iana>`, lo que interpreta esa hora local del reloj de pared en la zona horaria dada.

Nota: los trabajos recurrentes ahora utilizan un retroceso de reintentos exponencial después de errores consecutivos (30s → 1m → 5m → 15m → 60m) y luego vuelven a la programación normal después de la próxima ejecución exitosa.

Nota: `openclaw cron run` ahora regresa tan pronto como se pone en cola la ejecución manual. Las respuestas exitosas incluyen `{ ok: true, enqueued: true, runId }`; usa `openclaw cron runs --id <job-id>` para seguir el resultado final.

Nota: la retención/poda se controla en la configuración:

- `cron.sessionRetention` (por defecto `24h`) poda las sesiones de ejecución aisladas completadas.
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` podan `~/.openclaw/cron/runs/<jobId>.jsonl`.

Nota de actualización: si tienes trabajos de cron antiguos de antes del formato de entrega/almacenamiento actual, ejecuta `openclaw doctor --fix`. Doctor ahora normaliza los campos de cron heredados (`jobId`, `schedule.cron`, campos de entrega de nivel superior, payload `provider` alias de entrega) y migra trabajos de respaldo de webhook `notify: true` simples a entrega explícita de webhook cuando `cron.webhook` está configurado.

## Ediciones comunes

Actualizar la configuración de entrega sin cambiar el mensaje:

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "123456789"
```

Desactivar la entrega para un trabajo aislado:

```bash
openclaw cron edit <job-id> --no-deliver
```

Activar el contexto de arranque ligero para un trabajo aislado:

```bash
openclaw cron edit <job-id> --light-context
```

Anunciar a un canal específico:

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
```

Crear un trabajo aislado con contexto de arranque ligero:

```bash
openclaw cron add \
  --name "Lightweight morning brief" \
  --cron "0 7 * * *" \
  --session isolated \
  --message "Summarize overnight updates." \
  --light-context \
  --no-deliver
```

`--light-context` se aplica solo a trabajos de turno de agente aislados. Para las ejecuciones de cron, el modo ligero mantiene el contexto de arranque vacío en lugar de inyectar el conjunto de arranque completo del espacio de trabajo.
