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

- Trabajos de cron: [Cron jobs](/es/automation/cron-jobs)

Sugerencia: ejecuta `openclaw cron --help` para ver la superficie completa de comandos.

Nota: los trabajos aislados `cron add` tienen por defecto el envío `--announce`. Usa `--no-deliver` para mantener
la salida interna. `--deliver` permanece como un alias obsoleto para `--announce`.

Nota: los trabajos de una sola vez (`--at`) se eliminan después del éxito de forma predeterminada. Usa `--keep-after-run` para mantenerlos.

Nota: los trabajos recurrentes ahora utilizan retroceso exponencial de reintentos después de errores consecutivos (30s → 1m → 5m → 15m → 60m) y luego vuelven al horario normal después de la próxima ejecución exitosa.

Nota: `openclaw cron run` ahora devuelve tan pronto como la ejecución manual se pone en cola para su ejecución. Las respuestas exitosas incluyen `{ ok: true, enqueued: true, runId }`; usa `openclaw cron runs --id <job-id>` para seguir el resultado final.

Nota: la retención/poda se controla en la configuración:

- `cron.sessionRetention` (por defecto `24h`) poda las sesiones de ejecución aisladas completadas.
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` podan `~/.openclaw/cron/runs/<jobId>.jsonl`.

Nota de actualización: si tienes trabajos de cron más antiguos de antes del formato de envío/almacenamiento actual, ejecuta
`openclaw doctor --fix`. Doctor ahora normaliza los campos de cron heredados (`jobId`, `schedule.cron`,
campos de envío de nivel superior, alias de envío de carga útil `provider`) y migra trabajos simples
`notify: true` de respaldo de webhook al envío explícito de webhook cuando `cron.webhook` está
configurado.

## Ediciones comunes

Actualizar la configuración de envío sin cambiar el mensaje:

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "123456789"
```

Deshabilitar el envío para un trabajo aislado:

```bash
openclaw cron edit <job-id> --no-deliver
```

Habilitar el contexto de arranque ligero para un trabajo aislado:

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

`--light-context` se aplica únicamente a trabajos de turno de agente aislados. Para ejecuciones de cron, el modo ligero mantiene el contexto de arranque vacío en lugar de inyectar el conjunto de arranque completo del espacio de trabajo.

import es from "/components/footer/es.mdx";

<es />
