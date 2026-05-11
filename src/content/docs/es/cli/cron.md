---
summary: "Referencia de CLI para `openclaw cron` (programar y ejecutar trabajos en segundo plano)"
read_when:
  - You want scheduled jobs and wakeups
  - You are debugging cron execution and logs
title: "Cron"
---

# `openclaw cron`

Administra trabajos de cron para el programador del Gateway.

<Tip>Ejecute `openclaw cron --help` para ver la superficie completa de comandos. Consulte [Cron jobs](/es/automation/cron-jobs) para la guía conceptual.</Tip>

## Sesiones

`--session` acepta `main`, `isolated`, `current` o `session:<id>`.

<AccordionGroup>
  <Accordion title="Claves de sesión">
    - `main` se vincula a la sesión principal del agente.
    - `isolated` crea una transcripción y un id de sesión nuevos para cada ejecución.
    - `current` se vincula a la sesión activa en el momento de la creación.
    - `session:<id>` se fija a una clave de sesión persistente explícita.
  </Accordion>
  <Accordion title="Semántica de sesión aislada">
    Las ejecuciones aisladas restablecen el contexto de conversación ambiente. El enrutamiento de canales y grupos, la política de envío/cola, la elevación, el origen y el enlace de tiempo de ejecución de ACP se restablecen para la nueva ejecución. Las preferencias seguras y las anulaciones explícitas de modelo o autenticación seleccionadas por el usuario pueden persistir entre ejecuciones.
  </Accordion>
</AccordionGroup>

## Entrega

`openclaw cron list` y `openclaw cron show <job-id>` previsualizan la ruta de entrega resuelta. Para `channel: "last"`, la vista previa muestra si la ruta se resolvió desde la sesión principal o actual, o si fallará cerrada.

<Note>Los trabajos `cron add` aislados tienen por defecto la entrega `--announce`. Use `--no-deliver` para mantener la salida interna. `--deliver` permanece como un alias en desuso para `--announce`.</Note>

### Propiedad de la entrega

La entrega de chat cron aislada se comparte entre el agente y el ejecutor:

- El agente puede enviar directamente usando la herramienta `message` cuando una ruta de chat está disponible.
- `announce` realiza la entrega de reserva de la respuesta final solo cuando el agente no envió directamente al objetivo resuelto.
- `webhook` publica el payload finalizado en una URL.
- `none` desactiva la entrega de respaldo (fallback) del runner.

`--announce` es la entrega de respaldo del runner para la respuesta final. `--no-deliver` desactiva ese respaldo pero no elimina la herramienta `message` del agente cuando hay una ruta de chat disponible.

Los recordatorios creados desde un chat activo conservan el destino de entrega del chat en vivo para la entrega de anuncios de respaldo. Las claves de sesión interna pueden estar en minúsculas; no las utilice como fuente de verdad para los ID de proveedores que distinguen entre mayúsculas y minúsculas, como los ID de sala de Matrix.

### Entrega de fallos

Las notificaciones de fallo se resuelven en este orden:

1. `delivery.failureDestination` en el trabajo.
2. `cron.failureDestination` global.
3. El destino principal de anuncio del trabajo (cuando no se establece un destino de fallo explícito).

<Note>Los trabajos de sesión principal solo pueden usar `delivery.failureDestination` cuando el modo de entrega principal es `webhook`. Los trabajos aislados lo aceptan en todos los modos.</Note>

Nota: las ejecuciones aisladas de cron tratan los fallos del agente a nivel de ejecución como errores del trabajo incluso cuando no se produce ningún payload de respuesta, por lo que los fallos de modelo/proveedor todavía incrementan los contadores de errores y activan las notificaciones de fallo.

## Programación

### Trabajos de una sola vez

`--at <datetime>` programa una ejecución de una sola vez. Las fechas y horas sin desplazamiento (offset-less) se tratan como UTC a menos que también pase `--tz <iana>`, que interpreta la hora del reloj de pared en la zona horaria dada.

<Note>Los trabajos de una sola vez se eliminan tras el éxito de forma predeterminada. Use `--keep-after-run` para conservarlos.</Note>

### Trabajos recurrentes

Los trabajos recurrentes utilizan un retroceso exponencial de reintentos después de errores consecutivos: 30 s, 1 m, 5 m, 15 m, 60 m. El programa vuelve a la normalidad después de la próxima ejecución exitosa.

Las ejecuciones omitidas se rastrean por separado de los errores de ejecución. No afectan el retroceso de reintentos, pero `openclaw cron edit <job-id> --failure-alert-include-skipped` puede optar por que las alertas de fallo reciban notificaciones repetidas de ejecuciones omitidas.

Nota: las definiciones de trabajos de cron residen en `jobs.json`, mientras que el estado de tiempo de ejecución pendiente reside en `jobs-state.json`. Si `jobs.json` se edita externamente, el Gateway recarga los programas cambiados y borra las ranuras pendientes obsoletas; las reescrituras solo de formato no borran la ranura pendiente.

### Ejecuciones manuales

`openclaw cron run` regresa tan pronto como se pone en cola la ejecución manual. Las respuestas exitosas incluyen `{ ok: true, enqueued: true, runId }`. Usa `openclaw cron runs --id <job-id>` para seguir el resultado final.

<Note>
`openclaw cron run <job-id>` fuerza la ejecución por defecto. Usa `--due` para mantener el comportamiento antiguo de "ejecutar solo si corresponde".
</Note>

## Modelos

`cron add|edit --model <ref>` selecciona un modelo permitido para el trabajo.

<Warning>Si el modelo no está permitido, cron avisa y recurre a la selección del modelo del agente del trabajo o al modelo predeterminado. Las cadenas de recuperación configuradas aún se aplican, pero una anulación simple de modelo sin una lista de recuperación explícita por trabajo ya no añade el agente principal como un objetivo de reintento extra oculto.</Warning>

### Precedencia del modelo cron aislado

El cron aislado resuelve el modelo activo en este orden:

1. Anulación de Gmail-hook.
2. Por trabajo `--model`.
3. Anulación de modelo de sesión de cron almacenada (cuando el usuario seleccionó uno).
4. Selección de modelo del agente o predeterminado.

### Modo rápido

El modo rápido de cron aislado sigue la selección del modelo en vivo resuelta. La configuración del modelo `params.fastMode` se aplica por defecto, pero una anulación de sesión almacenada `fastMode` todavía gana sobre la configuración.

### Reintentos de cambio de modelo en vivo

Si una ejecución aislada lanza `LiveSessionModelSwitchError`, cron persiste el proveedor y modelo cambiados (y la anulación del perfil de autenticación cambiado cuando está presente) para la ejecución activa antes de reintentar. El bucle de reintento externo está limitado a dos reintentos de cambio después del intento inicial, luego aborta en lugar de hacer un bucle infinito.

## Salida de ejecución y denegaciones

### Supresión de reconocimiento obsoleto

El cron aislado activa la supresión de respuestas de solo reconocimiento obsoleto. Si el primer resultado es solo una actualización de estado interina y ninguna ejecución de subagente descendente es responsable de la respuesta final, cron vuelve a preguntar una vez para el resultado real antes de la entrega.

### Supresión de token silencioso

Si una ejecución de cron aislado devuelve solo el token silencioso (`NO_REPLY` o `no_reply`), cron suprime tanto la entrega saliente directa como la ruta de resumen en cola de respaldo, por lo que no se publica nada de vuelta en el chat.

### Denegaciones estructuradas

Las ejecuciones aisladas de cron prefieren metadatos estructurados de denegación de ejecución de la ejecución incrustada y, luego, recurren a marcadores de denegación conocidos en la salida final, como `SYSTEM_RUN_DENIED`, `INVALID_REQUEST` y frases de rechazo de vinculación de aprobación.

`cron list` y el historial de ejecuciones muestran el motivo de la denegación en lugar de informar un comando bloqueado como `ok`.

## Retención

La retención y la poda se controlan en la configuración:

- `cron.sessionRetention` (por defecto `24h`) poda las sesiones de ejecución aisladas completadas.
- `cron.runLog.maxBytes` y `cron.runLog.keepLines` podan `~/.openclaw/cron/runs/<jobId>.jsonl`.

## Migración de trabajos antiguos

<Note>
  Si tiene trabajos de cron de antes del formato actual de entrega y almacenamiento, ejecute `openclaw doctor --fix`. Doctor normaliza los campos de cron heredados (`jobId`, `schedule.cron`, campos de entrega de nivel superior incluyendo `threadId` heredado, alias de entrega de payload `provider`) y migra trabajos de reserva simples de webhook `notify: true` a una entrega de webhook explícita
  cuando `cron.webhook` está configurado.
</Note>

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

`--light-context` se aplica solo a trabajos aislados de turno de agente. Para las ejecuciones de cron, el modo ligero mantiene el contexto de arranque vacío en lugar de inyectar el conjunto de arranque completo del espacio de trabajo.

## Comandos comunes de administración

Ejecución manual e inspección:

```bash
openclaw cron list
openclaw cron show <job-id>
openclaw cron run <job-id>
openclaw cron run <job-id> --due
openclaw cron runs --id <job-id> --limit 50
```

Las entradas de `cron runs` incluyen diagnósticos de entrega con el objetivo de cron previsto, el objetivo resuelto, envíos de herramienta de mensaje, uso de reserva y estado de entrega.

Redirección de agente y sesión:

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

## Relacionado

- [Referencia de CLI](/es/cli)
- [Tareas programadas](/es/automation/cron-jobs)
