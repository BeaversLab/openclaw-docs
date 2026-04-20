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

- Trabajos de Cron: [Cron jobs](/es/automation/cron-jobs)

Sugerencia: ejecute `openclaw cron --help` para ver la superficie completa de comandos.

Nota: los trabajos aislados de `cron add` utilizan de forma predeterminada la entrega `--announce`. Use `--no-deliver` para mantener
la salida interna. `--deliver` permanece como un alias obsoleto para `--announce`.

Nota: las ejecuciones aisladas propiedad de cron esperan un resumen de texto plano y el ejecutor es propietario
del camino final de envío. `--no-deliver` mantiene la ejecución interna; no entrega
la devolución al mensaje de la herramienta del agente.

Nota: los trabajos de una sola vez (`--at`) se eliminan tras el éxito de forma predeterminada. Use `--keep-after-run` para mantenerlos.

Nota: `--session` es compatible con `main`, `isolated`, `current` y `session:<id>`.
Use `current` para vincularse a la sesión activa en el momento de la creación, o `session:<id>` para
una clave de sesión persistente explícita.

Nota: para los trabajos de CLI de una sola vez, las fechas y horas de `--at` sin desplazamiento se tratan como UTC a menos que también pase
`--tz <iana>`, que interpreta esa hora del reloj local en la zona horaria dada.

Nota: los trabajos recurrentes ahora utilizan un retroceso de reintentos exponencial después de errores consecutivos (30 s → 1 m → 5 m → 15 m → 60 m) y luego regresan al horario normal después de la próxima ejecución exitosa.

Nota: `openclaw cron run` ahora devuelve tan pronto como la ejecución manual se pone en cola para su ejecución. Las respuestas exitosas incluyen `{ ok: true, enqueued: true, runId }`; use `openclaw cron runs --id <job-id>` para seguir el resultado final.

Nota: `openclaw cron run <job-id>` fuerza la ejecución de forma predeterminada. Use `--due` para mantener
el comportamiento anterior "ejecutar solo si corresponde".

Nota: el cron aislado suprime las respuestas de reconocimiento obsoletas. Si el primer resultado es solo una actualización de estado provisional y ninguna ejecución de subagente descendente es responsable de la respuesta final, cron solicita nuevamente una vez para obtener el resultado real antes de la entrega.

Nota: si una ejecución de cron aislada devuelve solo el token silencioso (`NO_REPLY` / `no_reply`), cron suprime tanto la entrega directa saliente como la ruta de resumen en cola de reserva, por lo que no se publica nada de vuelta en el chat.

Nota: `cron add|edit --model ...` usa ese modelo permitido seleccionado para el trabajo. Si el modelo no está permitido, cron advierte y recurre a la selección del modelo del agente/predeterminado del trabajo en su lugar. Las cadenas de reserva configuradas aún se aplican, pero una anulación de modelo simple sin una lista de reserva explícita por trabajo ya no añade el agente principal como un objetivo adicional de reintento oculto.

Nota: la precedencia del modelo de cron aislado es primero la anulación del gancho de Gmail, luego `--model` por trabajo, luego cualquier anulación de modelo de sesión de cron almacenada, y finalmente la selección normal de agente/predeterminado.

Nota: el modo rápido de cron aislado sigue la selección del modelo en vivo resuelto. La `params.fastMode` del modelo se aplica de manera predeterminada, pero una anulación de sesión almacenada `fastMode` todavía tiene prioridad sobre la configuración.

Nota: si una ejecución aislada lanza `LiveSessionModelSwitchError`, cron persiste el proveedor/modelo cambiado (y la anulación del perfil de autenticación cambiado cuando está presente) antes de reintentar. El bucle de reintento externo está limitado a 2 reintentos de cambio después del intento inicial, luego se aborta en lugar de repetirse infinitamente.

Nota: las notificaciones de fallas usan `delivery.failureDestination` primero, luego el `cron.failureDestination` global, y finalmente recurren al objetivo principal de anuncio del trabajo cuando no se configura un destino de falla explícito.

Nota: la retención/poda se controla en la configuración:

- `cron.sessionRetention` (predeterminado `24h`) poda las sesiones de ejecución aisladas completadas.
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` podan `~/.openclaw/cron/runs/<jobId>.jsonl`.

Nota de actualización: si tiene trabajos cron antiguos de antes del formato de entrega/almacenamiento actual, ejecute
`openclaw doctor --fix`. Doctor ahora normaliza los campos cron heredados (`jobId`, `schedule.cron`,
campos de entrega de nivel superior incluidos los heredados `threadId`, alias de entrega del payload `provider`) y migra los trabajos
`notify: true` de respaldo de webhook simples a una entrega de webhook explícita cuando `cron.webhook` está
configurado.

## Ediciones comunes

Actualizar la configuración de entrega sin cambiar el mensaje:

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "123456789"
```

Deshabilitar la entrega para un trabajo aislado:

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

`--light-context` se aplica solo a trabajos aislados de turno de agente. Para las ejecuciones cron, el modo ligero mantiene el contexto de arranque vacío en lugar de inyectar el conjunto de arranque completo del espacio de trabajo.

Nota sobre la propiedad de la entrega:

- Los trabajos aislados propiedad de cron siempre enrutan la entrega final visible para el usuario a través del
  ejecutor cron (`announce`, `webhook` o solo interno `none`).
- Si la tarea menciona enviar un mensaje a algún destinatario externo, el agente debe
  describir el destino previsto en su resultado en lugar de intentar enviarlo
  directamente.

## Comandos comunes de administración

Ejecución manual:

```bash
openclaw cron run <job-id>
openclaw cron run <job-id> --due
openclaw cron runs --id <job-id> --limit 50
```

Redirección de agente/sesión:

```bash
openclaw cron edit <job-id> --agent ops
openclaw cron edit <job-id> --clear-agent
openclaw cron edit <job-id> --session current
openclaw cron edit <job-id> --session "session:daily-brief"
```

Ajustes de entrega:

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
openclaw cron edit <job-id> --best-effort-deliver
openclaw cron edit <job-id> --no-best-effort-deliver
openclaw cron edit <job-id> --no-deliver
```

Nota sobre entrega en caso de fallo:

- `delivery.failureDestination` es compatible con trabajos aislados.
- Los trabajos de sesión principal solo pueden usar `delivery.failureDestination` cuando el modo de entrega
  principal es `webhook`.
- Si no establece ningún destino de fallo y el trabajo ya anuncia a un
  canal, las notificaciones de fallo reutilizan ese mismo objetivo de anuncio.
