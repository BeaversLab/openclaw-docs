---
summary: "Referencia de la CLI para `openclaw cron` (programar y ejecutar trabajos en segundo plano)"
read_when:
  - Quieres trabajos programados y despertadores
  - Estás depurando la ejecución y los registros de cron
title: "cron"
---

# `openclaw cron`

Administra los trabajos de cron para el planificador de Gateway.

Relacionado:

- Trabajos de cron: [Trabajos de cron](/es/automation/cron-jobs)

Consejo: ejecuta `openclaw cron --help` para ver la superficie completa de comandos.

Nota: los trabajos aislados `cron add` tienen por defecto la entrega `--announce`. Usa `--no-deliver` para mantener
la salida interna. `--deliver` permanece como un alias obsoleto para `--announce`.

Nota: los trabajos de una sola vez (`--at`) se eliminan después del éxito por defecto. Usa `--keep-after-run` para mantenerlos.

Nota: los trabajos recurrentes ahora usan un retroceso exponencial de reintentos después de errores consecutivos (30 s → 1 m → 5 m → 15 m → 60 m) y luego regresan al horario normal después de la próxima ejecución exitosa.

Nota: `openclaw cron run` ahora regresa tan pronto como la ejecución manual se pone en la cola para su ejecución. Las respuestas exitosas incluyen `{ ok: true, enqueued: true, runId }`; usa `openclaw cron runs --id <job-id>` para seguir el resultado final.

Nota: la retención/poda se controla en la configuración:

- `cron.sessionRetention` (por defecto `24h`) poda las sesiones de ejecución aisladas completadas.
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` podan `~/.openclaw/cron/runs/<jobId>.jsonl`.

Nota de actualización: si tienes trabajos de cron antiguos de antes del formato actual de entrega/almacenamiento, ejecuta
`openclaw doctor --fix`. Doctor ahora normaliza los campos heredados de cron (`jobId`, `schedule.cron`,
campos de entrega de nivel superior, alias de entrega de carga útil `provider`) y migra los trabajos simples
de respaldo de webhook `notify: true` a la entrega explícita de webhook cuando `cron.webhook` está
configurado.

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

`--light-context` se aplica únicamente a trabajos de turno de agente aislados. Para ejecuciones de cron, el modo ligero mantiene el contexto de arranque vacío en lugar de inyectar el conjunto completo de arranque del espacio de trabajo.

import es from "/components/footer/es.mdx";

<es />
