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

- Trabajos cron: [Trabajos cron](/es/automation/cron-jobs)

Sugerencia: ejecute `openclaw cron --help` para ver la superficie completa de comandos.

Nota: `openclaw cron list` y `openclaw cron show <job-id>` previsualizan la
ruta de entrega resuelta. Para `channel: "last"`, la vista previa muestra si la
ruta se resolvió desde la sesión principal/actual o fallará cerrada.

Nota: los trabajos `cron add` aislados por defecto usan entrega `--announce`. Use `--no-deliver` para mantener
la salida interna. `--deliver` permanece como un alias obsoleto para `--announce`.

Nota: la entrega de chat cron aislada se comparte. `--announce` es la entrega de respaldo del ejecutor
para la respuesta final; `--no-deliver` deshabilita ese respaldo pero no
elimina la herramienta `message` del agente cuando hay una ruta de chat disponible.

Nota: los trabajos de una sola vez (`--at`) se eliminan después del éxito por defecto. Use `--keep-after-run` para mantenerlos.

Nota: `--session` admite `main`, `isolated`, `current` y `session:<id>`.
Use `current` para vincular a la sesión activa en el momento de creación, o `session:<id>` para
una clave de sesión persistente explícita.

Nota: para trabajos CLI de una sola vez, las fechas y horas `--at` sin desfase se tratan como UTC a menos que también pase
`--tz <iana>`, que interpreta esa hora local del reloj en la zona horaria dada.

Nota: los trabajos recurrentes ahora usan retroceso exponencial de reintentos después de errores consecutivos (30s → 1m → 5m → 15m → 60m), luego regresan al horario normal después de la próxima ejecución exitosa.

Nota: `openclaw cron run` ahora regresa tan pronto como la ejecución manual se pone en la cola. Las respuestas exitosas incluyen `{ ok: true, enqueued: true, runId }`; use `openclaw cron runs --id <job-id>` para seguir el resultado eventual.

Nota: `openclaw cron run <job-id>` se ejecuta a la fuerza por defecto. Use `--due` para mantener el
comportamiento anterior "solo ejecutar si está programado".

Nota: las ejecuciones de cron aisladas suprimen las respuestas de reconocimiento solo obsoletas. Si el primer resultado es solo una actualización de estado provisional y ninguna ejecución de subagente descendente es responsable de la respuesta final, cron vuelve a solicitar una vez el resultado real antes de la entrega.

Nota: si una ejecución de cron aislada devuelve solo el token silencioso (`NO_REPLY` / `no_reply`), cron suprime tanto la entrega directa saliente como la ruta alternativa de resumen en cola, por lo que no se publica nada de vuelta en el chat.

Nota: `cron add|edit --model ...` usa ese modelo permitido seleccionado para el trabajo. Si el modelo no está permitido, cron advierte y vuelve a la selección del modelo predeterminado/agente del trabajo en su lugar. Las cadenas de reserva configuradas todavía se aplican, pero una anulación de modelo simple sin una lista de reserva explícita por trabajo ya no añade el agente principal como un objetivo de reintento extra oculto.

Nota: la precedencia del modelo de cron aislado es primero la anulación del enlace de Gmail, luego `--model` por trabajo, luego cualquier anulación de modelo de sesión de cron almacenada, y finalmente la selección normal de agente/predeterminado.

Nota: el modo rápido de cron aislado sigue la selección del modelo en vivo resuelta. La configuración del modelo `params.fastMode` se aplica de forma predeterminada, pero una anulación de sesión almacenada `fastMode` todavía tiene prioridad sobre la configuración.

Nota: si una ejecución aislada lanza `LiveSessionModelSwitchError`, cron persiste el proveedor/modelo cambiado (y la anulación del perfil de autenticación cambiado cuando está presente) antes de reintentar. El bucle de reinterno exterior está limitado a 2 reintentos de cambio después del intento inicial, luego aborta en lugar de hacer un bucle para siempre.

Nota: las notificaciones de error usan primero `delivery.failureDestination`, luego `cron.failureDestination` global, y finalmente recurren al objetivo de anuncio principal del trabajo cuando no se configura ningún destino de error explícito.

Nota: la retención/poda se controla en la configuración:

- `cron.sessionRetention` (predeterminado `24h`) poda las sesiones de ejecución aisladas completadas.
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` podan `~/.openclaw/cron/runs/<jobId>.jsonl`.

Nota de actualización: si tiene trabajos cron antiguos anteriores al formato de entrega/almacenamiento actual, ejecute `openclaw doctor --fix`. Doctor ahora normaliza los campos cron heredados (`jobId`, `schedule.cron`, campos de entrega de nivel superior que incluyen el `threadId` heredado, alias de entrega del payload `provider`) y migra los trabajos de reserva de webhook `notify: true` simples a una entrega de webhook explícita cuando `cron.webhook` está configurado.

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

`--light-context` se aplica solo a trabajos de turno de agente aislados. Para las ejecuciones cron, el modo ligero mantiene el contexto de arranque vacío en lugar de inyectar el conjunto de arranque completo del espacio de trabajo.

Nota sobre la propiedad de entrega:

- La entrega de chat cron aislada es compartida. El agente puede enviar directamente con la herramienta `message` cuando hay una ruta de chat disponible.
- `announce` entrega por reserva la respuesta final solo cuando el agente no envió directamente al objetivo resuelto. `webhook` publica el payload terminado en una URL. `none` desactiva la entrega de reserva del ejecutor.

## Comandos de administración comunes

Ejecución manual:

```bash
openclaw cron list
openclaw cron show <job-id>
openclaw cron run <job-id>
openclaw cron run <job-id> --due
openclaw cron runs --id <job-id> --limit 50
```

Las entradas `cron runs` incluyen diagnósticos de entrega con el objetivo cron previsto, el objetivo resuelto, envíos de la herramienta de mensaje, uso de reserva y estado de entrega.

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

Nota sobre entrega por fallo:

- `delivery.failureDestination` es compatible con trabajos aislados.
- Los trabajos de sesión principal solo pueden usar `delivery.failureDestination` cuando el modo de entrega principal es `webhook`.
- Si no establece ningún destino de fallo y el trabajo ya anuncia a un canal, las notificaciones de fallo reutilizan ese mismo objetivo de anuncio.
