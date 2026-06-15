---
summary: "Referencia de CLI para `openclaw cron` (programar y ejecutar trabajos en segundo plano)"
read_when:
  - You want scheduled jobs and wakeups
  - You are debugging cron execution and logs
title: "Cron"
---

# `openclaw cron`

Administra trabajos de cron para el programador del Gateway.

<Tip>Ejecute `openclaw cron --help` para ver la superficie completa de comandos. Consulte [Cron jobs](/es/automation/cron-jobs) para obtener la guía conceptual.</Tip>

## Crear trabajos rápidamente

`openclaw cron create` es un alias de `openclaw cron add`. Para trabajos nuevos, ponga primero el programa y luego el aviso:

```bash
openclaw cron create "0 7 * * *" \
  "Summarize overnight updates." \
  --name "Morning brief" \
  --agent ops
```

Use `--webhook <url>` cuando el trabajo deba PUBLICAR (POST) la carga finalizada en lugar de entregarla a un destino de chat:

```bash
openclaw cron create "0 18 * * 1-5" \
  "Summarize today's deploys as JSON." \
  --name "Deploy digest" \
  --webhook "https://example.invalid/openclaw/cron"
```

## Sesiones

`--session` acepta `main`, `isolated`, `current` o `session:<id>`.

<AccordionGroup>
  <Accordion title="Claves de sesión">
    - `main` se vincula a la sesión principal del agente.
    - `isolated` crea una transcripción nueva y un id. de sesión para cada ejecución.
    - `current` se vincula a la sesión activa en el momento de la creación.
    - `session:<id>` se fija a una clave de sesión persistente explícita.

  </Accordion>
  <Accordion title="Semántica de sesión aislada">
    Las ejecuciones aisladas restablecen el contexto de conversación ambiental. El enrutamiento de canales y grupos, la política de envío/cola, la elevación, el origen y el enlace de tiempo de ejecución de ACP se restablecen para la nueva ejecución. Las preferencias seguras y las anulaciones explícitas de modelo o autenticación seleccionadas por el usuario pueden extenderse a través de ejecuciones.
  </Accordion>
</AccordionGroup>

## Entrega

`openclaw cron list` y `openclaw cron show <job-id>` previsualizan la ruta de entrega resuelta. Para `channel: "last"`, la previsualización muestra si la ruta se resolvió desde la sesión principal o la actual, o si fallará cerrada.

Los destinos con prefijo de proveedor pueden desambiguar canales de anuncio no resueltos. Por ejemplo, `to: "telegram:123"` selecciona Telegram cuando se omite `delivery.channel` o es `last`. Solo los prefijos anunciados por el complemento cargado son selectores de proveedor. Si `delivery.channel` es explícito, el prefijo debe coincidir con ese canal; `channel: "whatsapp"` con `to: "telegram:123"` se rechaza. Los prefijos de servicio como `imessage:` y `sms:` siguen siendo sintaxis de destino propiedad del canal.

<Note>Los trabajos `cron add` aislados tienen por defecto una entrega `--announce`. Use `--no-deliver` para mantener la salida interna. `--deliver` permanece como un alias obsoleto para `--announce`.</Note>

### Propiedad de la entrega

La entrega de chat cron aislada se comparte entre el agente y el ejecutor:

- El agente puede enviar directamente usando la herramienta `message` cuando hay una ruta de chat disponible.
- `announce` realiza una entrega de reserva de la respuesta final solo cuando el agente no envió directamente al destino resuelto.
- `webhook` publica la carga útil finalizada en una URL.
- `none` deshabilita la entrega de reserva del ejecutor.

Use `cron add|create --webhook <url>` o `cron edit <job-id> --webhook <url>` para configurar la entrega de webhook. No combine `--webhook` con banderas de entrega de chat como `--announce`, `--no-deliver`, `--channel`, `--to`, `--thread-id` o `--account`.

`--announce` es la entrega de reserva del ejecutor para la respuesta final. `--no-deliver` deshabilita esa reserva pero no elimina la herramienta `message` del agente cuando hay una ruta de chat disponible.

Los recordatorios creados desde un chat activo preservan el destino de entrega del chat en vivo para la entrega de anuncios de reserva. Las claves de sesión interna pueden estar en minúsculas; no las use como una fuente de verdad para los ID de proveedores sensibles a mayúsculas y minúsculas, como los ID de sala de Matrix.

### Entrega de fallos

Las notificaciones de fallos se resuelven en este orden:

1. `delivery.failureDestination` en el trabajo.
2. `cron.failureDestination` global.
3. El destino de anuncio principal del trabajo (cuando no se establece un destino de falla explícito).

<Note>Los trabajos de sesión principal solo pueden usar `delivery.failureDestination` cuando el modo de entrega principal es `webhook`. Los trabajos aislados lo aceptan en todos los modos.</Note>

Nota: las ejecuciones cron aisladas tratan las fallas del agente a nivel de ejecución como errores del trabajo incluso cuando no se produce una carga útil de respuesta, por lo que las fallas del modelo/proveedor aún incrementan los contadores de errores y activan notificaciones de falla.

Si una ejecución aislada agota el tiempo de espera antes de la primera solicitud del modelo, `openclaw cron show` y `openclaw cron runs` incluyen un error específico de la fase como `setup timed out before runner start` o `stalled before first model call (last phase: context-engine)`. Para los proveedores respaldados por CLI, el watchdog previo al modelo permanece activo hasta que comienza el turno externo de la CLI, por lo que las detenciones en la búsqueda de sesión, los enlaces, la autenticación, el aviso y la configuración de la CLI se reportan como fallas cron previas al modelo.

## Programación

### Trabajos únicos

`--at <datetime>` programa una ejecución única. Las fechas y horas sin desfase se tratan como UTC a menos que también pases `--tz <iana>`, que interpreta la hora del reloj en la zona horaria dada.

<Note>Los trabajos únicos se eliminan después del éxito de forma predeterminada. Usa `--keep-after-run` para conservarlos.</Note>

### Trabajos recurrentes

Los trabajos recurrentes usan un retroceso exponencial de reintentos después de errores consecutivos: 30s, 1m, 5m, 15m, 60m. El programa vuelve a la normalidad después de la próxima ejecución exitosa.

Las ejecuciones omitidas se rastrean por separado de los errores de ejecución. No afectan el retroceso de reintentos, pero `openclaw cron edit <job-id> --failure-alert-include-skipped` puede optar por las alertas de falla para recibir notificaciones repetidas de ejecuciones omitidas.

Para trabajos aislados que tienen como objetivo un proveedor de modelos configurado localmente, cron ejecuta una verificación previa ligera del proveedor antes de iniciar el turno del agente. Los proveedores de bucle de retorno (loopback), red privada y `.local` `api: "ollama"` se sondean en `/api/tags`; los proveedores locales compatibles con OpenAI, como vLLM, SGLang y LM Studio, se sondean en `/models`. Si el punto final es inalcanzable, la ejecución se registra como `skipped` y se reintenta en un horario posterior; los puntos finales muertos coincidentes se almacenan en caché durante 5 minutos para evitar que muchos trabajos sobrecarguen el mismo servidor local.

Nota: los trabajos de cron, el estado de tiempo de ejecución pendiente y el historial de ejecuciones residen en la base de datos de estado SQLite compartida. Los archivos heredados `jobs.json`, `jobs-state.json` y `runs/*.jsonl` se importan una vez y se renombran con un sufijo `.migrated`. Después de la importación, edite las programaciones con `openclaw cron add|edit|remove` en lugar de editar archivos JSON.

### Ejecuciones manuales

`openclaw cron run <job-id>` fuerza la ejecución de forma predeterminada y regresa tan pronto como la ejecución manual se pone en cola. Las respuestas exitosas incluyen `{ ok: true, enqueued: true, runId }`. Use el `runId` devuelto para inspeccionar el resultado posterior:

```bash
openclaw cron run <job-id>
openclaw cron runs --id <job-id> --run-id <run-id>
```

Agregue `--wait` cuando un script debe bloquearse hasta que esa ejecución en cola específica registre un estado terminal:

```bash
openclaw cron run <job-id> --wait --wait-timeout 10m --poll-interval 2s
```

Con `--wait`, la CLI todavía llama primero a `cron.run` y luego sondea `cron.runs` para el `runId` devuelto. El comando sale `0` solo cuando la ejecución finaliza con el estado `ok`. Sale con un valor distinto de cero cuando la ejecución finaliza con `error` o `skipped`, cuando la respuesta del Gateway no incluye un `runId`, o cuando `--wait-timeout` expira. `--poll-interval` debe ser mayor que cero.

<Note>Use `--due` cuando quieras que el comando manual se ejecute solo si el trabajo está actualmente programado. Si `--due --wait` no pone en cola una ejecución, el comando devuelve la respuesta normal de no ejecución en lugar de sondear.</Note>

## Modelos

`cron add|edit --model <ref>` selecciona un modelo permitido para el trabajo.

<Warning>Si el modelo no está permitido o no se puede resolver, cron falla la ejecución con un error de validación explícito en lugar de volver a la selección del modelo del agente o predeterminado del trabajo.</Warning>

Cron `--model` es un **principal del trabajo**, no una anulación de `/model` de sesión de chat. Esto significa:

- Las reservas de modelos configuradas todavía se aplican cuando falla el modelo de trabajo seleccionado.
- La carga útil `fallbacks` por trabajo reemplaza la lista de reserva configurada cuando está presente.
- Una lista de reserva por trabajo vacía (`fallbacks: []` en la carga útil/API del trabajo) hace que la ejecución de cron sea estricta.
- Cuando un trabajo tiene `--model` pero no se ha configurado ninguna lista de reserva, OpenClaw pasa una anulación de reserva vacía explícita para que el principal del agente no se agregue como un objetivo de reintentos oculto.
- Las verificaciones previas al vuelo del proveedor local recorren las reservas configuradas antes de marcar una ejecución de cron como `skipped`.

`openclaw doctor` informa de los trabajos que ya tienen `payload.model` establecido, incluidos los recuentos de espacios de nombres del proveedor y las discordancias con `agents.defaults.model`. Usa esa verificación cuando el comportamiento de autenticación, proveedor o facturación se ve diferente entre el chat en vivo y los trabajos programados.

### Precedencia del modelo de cron aislado

El cron aislado resuelve el modelo activo en este orden:

1. Anulación de enlace de Gmail.
2. `--model` por trabajo.
3. Anulación del modelo de sesión de cron almacenada (cuando el usuario seleccionó uno).
4. Selección de modelo de agente o predeterminado.

### Modo rápido

El modo rápido de cron aislado sigue la selección del modelo en vivo resuelta. La configuración del modelo `params.fastMode` se aplica de forma predeterminada, pero una anulación de `fastMode` de sesión almacenada todavía tiene prioridad sobre la configuración.

### Reintentos de cambio de modelo en vivo

Si una ejecución aislada lanza `LiveSessionModelSwitchError`, cron persiste el proveedor y modelo cambiados (y la invalidación del perfil de autenticación cambiado cuando está presente) para la ejecución activa antes de reintentar. El bucle de reinterno externo está limitado a dos reintentos de cambio después del intento inicial, luego se aborta en lugar de repetirse para siempre.

## Salida y denegaciones de ejecución

### Supresión de reconocimientos obsoletos

Las ejecuciones aisladas de cron suprimen las respuestas que solo son reconocimientos obsoletos. Si el primer resultado es solo una actualización de estado interina y ninguna ejecución de subagente descendente es responsable de la respuesta final, cron vuelve a solicitar una vez el resultado real antes de la entrega.

### Supresión de tokens silenciosos

Si una ejecución aislada de cron devuelve solo el token silencioso (`NO_REPLY` o `no_reply`), cron suprime tanto la entrega directa saliente como la ruta alternativa de resumen en cola, por lo que no se publica nada de vuelta en el chat.

### Denegaciones estructuradas

Las ejecuciones aisladas de cron utilizan metadatos estructurados de denegación de ejecución de la ejecución incrustada como la señal de denegación autorizada. También respetan los contenedores `UNAVAILABLE` del nodo host cuando el mensaje de error estructurado anidado comienza con `SYSTEM_RUN_DENIED` o `INVALID_REQUEST`.

Cron no clasifica la prosa de salida final ni las frases de rechazo que parecen aprobaciones como denegaciones, a menos que la ejecución incrustada también proporcione metadatos de denegación estructurada, por lo que el texto ordinario del asistente no se trata como un comando bloqueado.

`cron list` y el historial de ejecuciones muestran el motivo de la denegación en lugar de informar un comando bloqueado como `ok`.

## Retención

La retención y la poda se controlan en la configuración:

- `cron.sessionRetention` (predeterminado `24h`) poda las sesiones de ejecución aisladas completadas.
- `cron.runLog.keepLines` limpia las filas del historial de ejecuciones de SQLite retenidas por trabajo. `cron.runLog.maxBytes` sigue siendo aceptado por compatibilidad con registros de ejecución respaldados en archivos antiguos.

## Migración de trabajos antiguos

<Note>
  Si tiene trabajos cron anteriores al formato actual de entrega y almacenamiento, ejecute `openclaw doctor --fix`. Doctor normaliza los campos de cron heredados (`jobId`, `schedule.cron`, campos de entrega de nivel superior, incluidos los `threadId` heredados, alias de entrega de carga útil `provider`) y migra los trabajos de respaldo de webhook `notify: true` de `cron.webhook` a una entrega de
  webhook explícita. Los trabajos que ya anuncian a un chat mantienen esa entrega y obtienen un destino de webhook de finalización.
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

Anunciar a un canal específico:

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
```

Anunciar a un tema de foro de Telegram:

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "-1001234567890" --thread-id 42
```

Crear un trabajo aislado con contexto de arranque ligero:

```bash
openclaw cron create "0 7 * * *" \
  "Summarize overnight updates." \
  --name "Lightweight morning brief" \
  --session isolated \
  --light-context \
  --no-deliver
```

`--light-context` se aplica solo a trabajos de turno de agente aislados. Para las ejecuciones de cron, el modo ligero mantiene el contexto de arranque vacío en lugar de inyectar el conjunto de arranque completo del espacio de trabajo.

## Comandos de administración comunes

Ejecución manual e inspección:

```bash
openclaw cron list
openclaw cron list --agent ops
openclaw cron get <job-id>
openclaw cron show <job-id>
openclaw cron run <job-id>
openclaw cron run <job-id> --due
openclaw cron run <job-id> --wait --wait-timeout 10m
openclaw cron run <job-id> --wait --wait-timeout 10m --poll-interval 2s
openclaw cron runs --id <job-id> --limit 50
openclaw cron runs --id <job-id> --run-id <run-id>
```

`openclaw cron list` muestra todos los trabajos coincidentes de forma predeterminada. Pase `--agent <id>` para mostrar solo los trabajos cuyo ID de agente normalizado efectivo coincida; los trabajos sin un ID de agente almacenado cuentan como el agente predeterminado configurado.

`openclaw cron get <job-id>` devuelve el JSON del trabajo almacenado directamente. Use `cron show <job-id>` cuando desee la vista legible por humanos con la vista previa de la ruta de entrega.

`cron list --json` y `cron show <job-id> --json` incluyen un campo `status` de nivel superior en cada trabajo, calculado a partir de `enabled`, `state.runningAtMs` y `state.lastRunStatus`. Valores: `disabled`, `running`, `ok`, `error`, `skipped` o `idle`. Esto refleja la columna de estado legible por humanos para que las herramientas externas puedan leer el estado del trabajo sin derivarlo nuevamente.

Las entradas de `cron runs` incluyen diagnósticos de entrega con el objetivo cron previsto, el objetivo resuelto, los envíos de la herramienta de mensajes, el uso de alternativa y el estado de entrega.

Redirección de agente y sesión:

```bash
openclaw cron edit <job-id> --agent ops
openclaw cron edit <job-id> --clear-agent
openclaw cron edit <job-id> --session current
openclaw cron edit <job-id> --session "session:daily-brief"
```

`openclaw cron add` advierte cuando se omite `--agent` en los trabajos de agente y vuelve al agente predeterminado (`main`). Pase `--agent <id>` en el momento de la creación para fijar un agente específico.

Ajustes de entrega:

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
openclaw cron edit <job-id> --webhook "https://example.invalid/openclaw/cron"
openclaw cron edit <job-id> --best-effort-deliver
openclaw cron edit <job-id> --no-best-effort-deliver
openclaw cron edit <job-id> --no-deliver
```

## Relacionado

- [Referencia de la CLI](/es/cli)
- [Tareas programadas](/es/automation/cron-jobs)
