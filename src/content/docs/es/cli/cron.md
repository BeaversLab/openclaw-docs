---
summary: "Referencia de CLI para `openclaw cron` (programar y ejecutar trabajos en segundo plano)"
read_when:
  - You want scheduled jobs and wakeups
  - You are debugging cron execution and logs
title: "Cron"
---

# `openclaw cron`

Administra trabajos de cron para el programador del Gateway.

<Tip>Ejecute `openclaw cron --help` para obtener la superficie de comandos completa. Consulte [Cron jobs](/es/automation/cron-jobs) para obtener la guía conceptual.</Tip>

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
    Las ejecuciones aisladas restablecen el contexto de conversación ambiental. El enrutamiento de canales y grupos, la política de envío/cola, la elevación, el origen y el enlace de tiempo de ejecución de ACP se restablecen para la nueva ejecución. Las preferencias seguras y las anulaciones explícitas de modelo o autenticación seleccionadas por el usuario pueden mantenerse en las ejecuciones.
  </Accordion>
</AccordionGroup>

## Entrega

`openclaw cron list` y `openclaw cron show <job-id>` previsualizan la ruta de entrega resuelta. Para `channel: "last"`, la vista previa muestra si la ruta se resolvió desde la sesión principal o actual, o si fallará cerrada.

Los destinos con prefijo de proveedor pueden desambiguar los canales de anuncio no resueltos. Por ejemplo, `to: "telegram:123"` selecciona Telegram cuando `delivery.channel` se omite o `last`. Solo los prefijos anunciados por el plugin cargado son selectores de proveedor. Si `delivery.channel` es explícito, el prefijo debe coincidir con ese canal; `channel: "whatsapp"` con `to: "telegram:123"` se rechaza. Los prefijos de servicio como `imessage:` y `sms:` siguen siendo sintaxis de destino propiedad del canal.

<Note>Los trabajos `cron add` aislados tienen por defecto la entrega `--announce`. Use `--no-deliver` para mantener la salida interna. `--deliver` permanece como un alias obsoleto para `--announce`.</Note>

### Propiedad de la entrega

La entrega de chat cron aislada se comparte entre el agente y el ejecutor:

- El agente puede enviar directamente usando la herramienta `message` cuando hay una ruta de chat disponible.
- `announce` realiza una entrega de reserva de la respuesta final solo cuando el agente no envió directamente al objetivo resuelto.
- `webhook` publica el payload finalizado en una URL.
- `none` deshabilita la entrega de reserva del ejecutor.

`--announce` es la entrega de reserva del ejecutor para la respuesta final. `--no-deliver` deshabilita esa reserva pero no elimina la herramienta `message` del agente cuando hay una ruta de chat disponible.

Los recordatorios creados desde un chat activo conservan el objetivo de entrega del chat en vivo para la entrega de anuncios de reserva. Las claves de sesión internas pueden estar en minúsculas; no las use como una fuente de verdad para los ID de proveedores sensibles a mayúsculas y minúsculas, como los ID de habitación de Matrix.

### Entrega de fallos

Las notificaciones de fallo se resuelven en este orden:

1. `delivery.failureDestination` en el trabajo.
2. `cron.failureDestination` global.
3. El objetivo de anuncio principal del trabajo (cuando no se establece un destino de fallo explícito).

<Note>Los trabajos de sesión principal solo pueden usar `delivery.failureDestination` cuando el modo de entrega principal es `webhook`. Los trabajos aislados lo aceptan en todos los modos.</Note>

Nota: las ejecuciones de cron aisladas tratan los fallos del agente a nivel de ejecución como errores del trabajo incluso cuando no se produce ningún payload de respuesta, por lo que los fallos del modelo/proveedor aún incrementan los contadores de errores y activan las notificaciones de fallo.

## Programación

### Trabajos de una sola vez

`--at <datetime>` programa una ejecución de una sola vez. Las fechas y horas sin desplazamiento se tratan como UTC a menos que también pase `--tz <iana>`, que interpreta la hora del reloj en la zona horaria dada.

<Note>Los trabajos de una sola vez se eliminan después del éxito por defecto. Use `--keep-after-run` para conservarlos.</Note>

### Trabajos recurrentes

Los trabajos recurrentes utilizan un retroceso exponencial de reintentos después de errores consecutivos: 30 s, 1 m, 5 m, 15 m, 60 m. La programación vuelve a la normalidad después de la siguiente ejecución exitosa.

Las ejecuciones omitidas se rastrean por separado de los errores de ejecución. No afectan el retroceso de reintentos, pero `openclaw cron edit <job-id> --failure-alert-include-skipped` puede optar por que las alertas de error reciban notificaciones repetidas de ejecuciones omitidas.

Para trabajos aislados que tienen como objetivo un proveedor de modelos local configurado, cron ejecuta un verificación previa ligera del proveedor antes de iniciar el turno del agente. Los proveedores de bucle invertido (loopback), red privada y `.local` `api: "ollama"` se sondean en `/api/tags`; los proveedores locales compatibles con OpenAI como vLLM, SGLang y LM Studio se sondean en `/models`. Si el punto de conexión es inalcanzable, la ejecución se registra como `skipped` y se reintenta en una programación posterior; los puntos de conexión muertos coincidentes se almacenan en caché durante 5 minutos para evitar que muchos trabajos golpeen el mismo servidor local.

Nota: las definiciones de trabajos de cron residen en `jobs.json`, mientras que el estado de tiempo de ejecución pendiente reside en `jobs-state.json`. Si `jobs.json` se edita externamente, el Gateway recarga las programaciones cambiadas y borra las ranuras pendientes obsoletas; las reescrituras solo de formato no borran la ranura pendiente.

### Ejecuciones manuales

`openclaw cron run` regresa tan pronto como se pone en cola la ejecución manual. Las respuestas exitosas incluyen `{ ok: true, enqueued: true, runId }`. Use `openclaw cron runs --id <job-id>` para seguir el resultado final.

<Note>
`openclaw cron run <job-id>` fuerza la ejecución de forma predeterminada. Use `--due` para mantener el comportamiento antiguo de "ejecutar solo si está pendiente".
</Note>

## Modelos

`cron add|edit --model <ref>` selecciona un modelo permitido para el trabajo.

<Warning>Si el modelo no está permitido o no se puede resolver, cron falla la ejecución con un error de validación explícito en lugar de recurrir al agente del trabajo o a la selección de modelo predeterminada.</Warning>

Cron `--model` es un **principal del trabajo**, no una anulación de la `/model` de la sesión de chat. Eso significa:

- Los retrocesos (fallbacks) de modelo configurados aún se aplican cuando falla el modelo de trabajo seleccionado.
- La `fallbacks` de carga útil por trabajo reemplaza la lista de retroceso configurada cuando está presente.
- Una lista de reserva por trabajo vacía (`fallbacks: []` en el payload/API del trabajo) hace que la ejecución de cron sea estricta.
- Cuando un trabajo tiene `--model` pero no se configura ninguna lista de reserva, OpenClaw pasa una anulación de reserva vacía explícita para que el agente principal no se agregue como un objetivo de reintentos oculto.

### Precedencia del modelo de cron aislado

El cron aislado resuelve el modelo activo en este orden:

1. Anulación de Gmail-hook.
2. Por trabajo `--model`.
3. Anulación del modelo de sesión de cron almacenada (cuando el usuario seleccionó uno).
4. Selección del modelo del agente o predeterminado.

### Modo rápido

El modo rápido de cron aislado sigue la selección del modelo en vivo resuelta. La configuración del modelo `params.fastMode` se aplica de manera predeterminada, pero una anulación `fastMode` de sesión almacenada aún tiene prioridad sobre la configuración.

### Reintentos de cambio de modelo en vivo

Si una ejecución aislada lanza `LiveSessionModelSwitchError`, cron persiste el proveedor y modelo cambiados (y la anulación del perfil de autenticación cambiado cuando está presente) para la ejecución activa antes de reintentar. El bucle de reintento externo está limitado a dos reintentos de cambio después del intento inicial, luego se aborta en lugar de buclear para siempre.

## Salida de ejecución y denegaciones

### Supresión de reconocimiento obsoleto

El cron aislado activa la supresión de respuestas de solo reconocimiento obsoleto. Si el primer resultado es solo una actualización de estado interina y ninguna ejecución de subagente descendente es responsable de la respuesta final, cron vuelve a solicitar una vez el resultado real antes de la entrega.

### Supresión de token silencioso

Si una ejecución de cron aislada devuelve solo el token silencioso (`NO_REPLY` o `no_reply`), cron suprime tanto la entrega directa de salida como la ruta de resumen en cola de reserva, por lo que no se publica nada de vuelta en el chat.

### Denegaciones estructuradas

Las ejecuciones de cron aisladas prefieren metadatos de denegación de ejecución estructurados de la ejecución incrustada, luego recurren a marcadores de denegación conocidos en la salida final, como `SYSTEM_RUN_DENIED`, `INVALID_REQUEST` y frases de rechazo de vinculación de aprobación.

`cron list` y el historial de ejecuciones muestran el motivo de la denegación en lugar de reportar un comando bloqueado como `ok`.

## Retención

La retención y la poda se controlan en la configuración:

- `cron.sessionRetention` (por defecto `24h`) poda las sesiones de ejecución aisladas completadas.
- `cron.runLog.maxBytes` y `cron.runLog.keepLines` podan `~/.openclaw/cron/runs/<jobId>.jsonl`.

## Migración de trabajos antiguos

<Note>
  Si tiene trabajos cron anteriores al formato de entrega y almacenamiento actual, ejecute `openclaw doctor --fix`. Doctor normaliza los campos cron heredados (`jobId`, `schedule.cron`, campos de entrega de nivel superior incluidos los heredados `threadId`, alias de entrega de payload `provider`) y migra los trabajos de reserva simples de webhook `notify: true` a una entrega de webhook explícita
  cuando `cron.webhook` está configurado.
</Note>

## Ediciones comunes

Actualizar la configuración de entrega sin cambiar el mensaje:

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "123456789"
```

Desactivar la entrega de un trabajo aislado:

```bash
openclaw cron edit <job-id> --no-deliver
```

Activar el contexto de arranque ligero para un trabajo aislado:

```bash
openclaw cron edit <job-id> --light-context
```

Anunciar en un canal específico:

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
```

Anunciar en un tema de foro de Telegram:

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "-1001234567890" --thread-id 42
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

`--light-context` se aplica solo a los trabajos de turno de agente aislados. Para las ejecuciones cron, el modo ligero mantiene el contexto de arranque vacío en lugar de inyectar el conjunto de arranque completo del espacio de trabajo.

## Comandos de administración comunes

Ejecución manual e inspección:

```bash
openclaw cron list
openclaw cron list --agent ops
openclaw cron show <job-id>
openclaw cron run <job-id>
openclaw cron run <job-id> --due
openclaw cron runs --id <job-id> --limit 50
```

`openclaw cron list` muestra todos los trabajos coincidentes de forma predeterminada. Pase `--agent <id>` para mostrar solo los trabajos cuyo id de agente normalizado efectivo coincida; los trabajos sin un id de agente almacenado cuentan como el agente predeterminado configurado.

`cron list --json` y `cron show <job-id> --json` incluyen un campo `status` de nivel superior en cada trabajo, calculado a partir de `enabled`, `state.runningAtMs` y `state.lastRunStatus`. Valores: `disabled`, `running`, `ok`, `error`, `skipped` o `idle`. Esto refleja la columna de estado legible por humanos para que las herramientas externas puedan leer el estado del trabajo sin volver a derivarlo.

Las entradas `cron runs` incluyen diagnósticos de entrega con el objetivo cron previsto, el objetivo resuelto, envíos de message-tool, uso de reserva y estado de entrega.

Redireccionamiento de agente y sesión:

```bash
openclaw cron edit <job-id> --agent ops
openclaw cron edit <job-id> --clear-agent
openclaw cron edit <job-id> --session current
openclaw cron edit <job-id> --session "session:daily-brief"
```

`openclaw cron add` advierte cuando se omite `--agent` en trabajos de turno de agente y vuelve al agente predeterminado (`main`). Pase `--agent <id>` en el momento de la creación para fijar un agente específico.

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
