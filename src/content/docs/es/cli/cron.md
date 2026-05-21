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
    - `isolated` crea una transcripción y un ID de sesión nuevos para cada ejecución.
    - `current` se vincula a la sesión activa en el momento de la creación.
    - `session:<id>` se fija a una clave de sesión persistente explícita.

  </Accordion>
  <Accordion title="Semántica de sesión aislada">
    Las ejecuciones aisladas restablecen el contexto de conversación ambiental. El enrutamiento de canales y grupos, la política de envío/cola, la elevación, el origen y el enlace de tiempo de ejecución de ACP se restablecen para la nueva ejecución. Las preferencias seguras y las anulaciones explícitas del modelo o autenticación seleccionadas por el usuario pueden persistir entre ejecuciones.
  </Accordion>
</AccordionGroup>

## Entrega

`openclaw cron list` y `openclaw cron show <job-id>` obtienen una vista previa de la ruta de entrega resuelta. Para `channel: "last"`, la vista previa muestra si la ruta se resolvió desde la sesión principal o actual, o si fallará cerrada.

Los destinos con prefijo de proveedor pueden desambiguar canales de anuncio no resueltos. Por ejemplo, `to: "telegram:123"` selecciona Telegram cuando `delivery.channel` se omite o `last`. Solo los prefijos anunciados por el complemento cargado son selectores de proveedor. Si `delivery.channel` es explícito, el prefijo debe coincidir con ese canal; `channel: "whatsapp"` con `to: "telegram:123"` se rechaza. Los prefijos de servicio como `imessage:` y `sms:` siguen siendo sintaxis de destino propiedad del canal.

<Note>Los trabajos aislados de `cron add` tienen por defecto la entrega `--announce`. Use `--no-deliver` para mantener la salida interna. `--deliver` permanece como un alias obsoleto para `--announce`.</Note>

### Propiedad de la entrega

La entrega de chat cron aislada se comparte entre el agente y el ejecutor:

- El agente puede enviar directamente usando la herramienta `message` cuando hay una ruta de chat disponible.
- `announce` entrega la respuesta final solo cuando el agente no envió directamente al objetivo resuelto.
- `webhook` publica el payload finalizado en una URL.
- `none` deshabilita la entrega de respaldo del ejecutor.

`--announce` es la entrega de respaldo del ejecutor para la respuesta final. `--no-deliver` deshabilita ese respaldo pero no elimina la herramienta `message` del agente cuando hay una ruta de chat disponible.

Los recordatorios creados desde un chat activo conservan el objetivo de entrega del chat en vivo para la entrega de anuncios de reserva. Las claves de sesión internas pueden estar en minúsculas; no las use como una fuente de verdad para los ID de proveedores sensibles a mayúsculas y minúsculas, como los ID de habitación de Matrix.

### Entrega de fallos

Las notificaciones de fallo se resuelven en este orden:

1. `delivery.failureDestination` en el trabajo.
2. `cron.failureDestination` global.
3. El objetivo de anuncio principal del trabajo (cuando no se establece un destino de fallo explícito).

<Note>Los trabajos de sesión principal solo pueden usar `delivery.failureDestination` cuando el modo de entrega principal es `webhook`. Los trabajos aislados lo aceptan en todos los modos.</Note>

Nota: las ejecuciones de cron aisladas tratan los fallos del agente a nivel de ejecución como errores del trabajo incluso cuando no se produce ningún payload de respuesta, por lo que los fallos del modelo/proveedor aún incrementan los contadores de errores y activan las notificaciones de fallo.

Si una ejecución aislada agota el tiempo de espera antes de la primera solicitud al modelo, `openclaw cron show`
y `openclaw cron runs` incluyen un error específico de la fase como
`setup timed out before runner start` o
`stalled before first model call (last phase: context-engine)`.
Para los proveedores basados en CLI, el perro guardián pre-modelo permanece activo hasta que comienza
el turno externo de la CLI, por lo que las búsquedas de sesión, enlaces, autenticación, avisos y bloqueos de configuración de CLI se
reportan como fallos de cron pre-modelo.

## Programación

### Trabajos de una sola vez

`--at <datetime>` programa una ejecución única. Las fechas y horas sin desfase se tratan como UTC a menos que también pase `--tz <iana>`, que interpreta la hora del reloj de pared en la zona horaria dada.

<Note>Los trabajos únicos se eliminan después del éxito de forma predeterminada. Use `--keep-after-run` para conservarlos.</Note>

### Trabajos recurrentes

Los trabajos recurrentes utilizan un retroceso exponencial de reintentos después de errores consecutivos: 30s, 1m, 5m, 15m, 60m. El programa vuelve a la normalidad después de la próxima ejecución exitosa.

Las ejecuciones omitidas se rastrean por separado de los errores de ejecución. No afectan el retroceso de reintentos, pero `openclaw cron edit <job-id> --failure-alert-include-skipped` puede optar por las alertas de fallo para notificaciones repetidas de ejecuciones omitidas.

Para trabajos aislados que tienen como objetivo un proveedor de modelo configurado localmente, cron ejecuta una verificación previa ligera del proveedor antes de iniciar el turno del agente. Los proveedores de Loopback, red privada y `.local` `api: "ollama"` se sondean en `/api/tags`; los proveedores locales compatibles con OpenAI, como vLLM, SGLang y LM Studio, se sondean en `/models`. Si el punto final es inalcanzable, la ejecución se registra como `skipped` y se reintenta en un horario posterior; los puntos finales muertos coincidentes se almacenan en caché durante 5 minutos para evitar que muchos trabajos sobrecarguen el mismo servidor local.

Nota: las definiciones de trabajos cron residen en `jobs.json`, mientras que el estado de tiempo de ejecución pendiente reside en `jobs-state.json`. Si `jobs.json` se edita externamente, Gateway vuelve a cargar los horarios modificados y borra las ranuras pendientes obsoletas; las reescrituras que solo cambian el formato no borran la ranura pendiente.

### Ejecuciones manuales

`openclaw cron run <job-id>` fuerza la ejecución de forma predeterminada y regresa tan pronto como la ejecución manual se pone en la cola. Las respuestas exitosas incluyen `{ ok: true, enqueued: true, runId }`. Use el `runId` devuelto para inspeccionar el resultado posterior:

```bash
openclaw cron run <job-id>
openclaw cron runs --id <job-id> --run-id <run-id>
```

Agregue `--wait` cuando un script debe bloquearse hasta que esa ejecución en cola específica registre un estado terminal:

```bash
openclaw cron run <job-id> --wait --wait-timeout 10m --poll-interval 2s
```

Con `--wait`, la CLI todavía llama primero a `cron.run` y luego sondea `cron.runs` para el `runId` devuelto. El comando sale `0` solo cuando la ejecución finaliza con el estado `ok`. Sale con un valor distinto de cero cuando la ejecución finaliza con `error` o `skipped`, cuando la respuesta de Gateway no incluye un `runId`, o cuando `--wait-timeout` expira. `--poll-interval` debe ser mayor que cero.

<Note>Use `--due` cuando desee que el comando manual se ejecute solo si el trabajo está actualmente pendiente. Si `--due --wait` no pone una ejecución en la cola, el comando devuelve la respuesta normal de no ejecución en lugar de sondear.</Note>

## Modelos

`cron add|edit --model <ref>` selecciona un modelo permitido para el trabajo.

<Warning>Si el modelo no está permitido o no se puede resolver, cron falla la ejecución con un error de validación explícito en lugar de volver al agente del trabajo o a la selección del modelo predeterminado.</Warning>

Cron `--model` es un **job primary**, no una anulación de chat-session `/model`. Esto significa:

- Los modelos de respaldo configurados aún se aplican cuando falla el modelo de trabajo seleccionado.
- El payload por trabajo `fallbacks` reemplaza la lista de respaldo configurada cuando está presente.
- Una lista de respaldo vacía por trabajo (`fallbacks: []` en el payload/API del trabajo) hace que la ejecución de cron sea estricta.
- Cuando un trabajo tiene `--model` pero no se configura ninguna lista de respaldo, OpenClaw pasa una anulación de respaldo vacía explícita para que el agente primario no se agregue como un objetivo de reintento oculto.

`openclaw doctor` informa de los trabajos que ya tienen `payload.model` establecido, incluyendo recuentos de espacios de nombres del proveedor e incoincidencias con `agents.defaults.model`. Use esa verificación cuando el comportamiento de autenticación, proveedor o facturación se vea diferente entre el chat en vivo y los trabajos programados.

### Precedencia del modelo cron aislado

Cron aislado resuelve el modelo activo en este orden:

1. Anulación de Gmail-hook.
2. Por trabajo `--model`.
3. Anulación de modelo de sesión cron almacenada (cuando el usuario seleccionó uno).
4. Selección de modelo de agente o predeterminado.

### Modo rápido

El modo rápido de cron aislado sigue la selección del modelo en vivo resuelta. La configuración del modelo `params.fastMode` se aplica de manera predeterminada, pero una anulación de sesión almacenada `fastMode` todavía tiene prioridad sobre la configuración.

### Reintentos de cambio de modelo en vivo

Si una ejecución aislada lanza `LiveSessionModelSwitchError`, cron mantiene el proveedor y modelo cambiados (y la anulación del perfil de autenticación cambiado cuando está presente) para la ejecución activa antes de reintentar. El bucle de reinterno externo está limitado a dos reintentos de cambio después del intento inicial, luego aborta en lugar de buclear para siempre.

## Salida de ejecución y denegaciones

### Supresión de reconocimiento obsoleto

Cron aislado activa la supresión de respuestas de reconocimiento obsoleto únicamente. Si el primer resultado es solo una actualización de estado interina y ninguna ejecución de subagente descendente es responsable de la respuesta final, cron vuelve a preguntar una vez para el resultado real antes de la entrega.

### Supresión silenciosa de tokens

Si una ejecución aislada de cron devuelve solo el token silencioso (`NO_REPLY` o `no_reply`), cron suprime tanto la entrega directa de salida como la ruta de resumen en cola de respaldo, por lo que no se publica nada de vuelta en el chat.

### Denegaciones estructuradas

Las ejecuciones aisladas de cron utilizan metadatos estructurados de denegación de ejecución de la ejecución incrustada como la señal de denegación autorizada. También respetan los contenedores `UNAVAILABLE` del nodo host cuando el mensaje de error estructurado anidado comienza con `SYSTEM_RUN_DENIED` o `INVALID_REQUEST`.

Cron no clasifica la prosa de salida final ni las frases de rechazo que parecen aprobación como denegaciones, a menos que la ejecución incrustada también proporcione metadatos de denegación estructurada, por lo que el texto ordinario del asistente no se trata como un comando bloqueado.

`cron list` y el historial de ejecuciones muestran el motivo de la denegación en lugar de informar un comando bloqueado como `ok`.

## Retención

La retención y la poda se controlan en la configuración:

- `cron.sessionRetention` (por defecto `24h`) poda las sesiones de ejecución aisladas completadas.
- `cron.runLog.maxBytes` y `cron.runLog.keepLines` podan `~/.openclaw/cron/runs/<jobId>.jsonl`.

## Migración de trabajos antiguos

<Note>
  Si tiene trabajos de cron de antes del formato actual de entrega y almacenamiento, ejecute `openclaw doctor --fix`. Doctor normaliza los campos de cron heredados (`jobId`, `schedule.cron`, campos de entrega de nivel superior incluyendo `threadId` heredado, alias de entrega de carga útil `provider`) y migra trabajos simples de webhook alternativo `notify: true` a una entrega de webhook explícita
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

`--light-context` se aplica solo a trabajos aislados de turno de agente. Para las ejecuciones de cron, el modo ligero mantiene el contexto de arranque vacío en lugar de inyectar el conjunto de arranque completo del espacio de trabajo.

## Comandos comunes de administración

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

`openclaw cron list` muestra todos los trabajos coincidentes de manera predeterminada. Pase `--agent <id>` para mostrar solo los trabajos cuyo ID de agente normalizado efectivo coincida; los trabajos sin un ID de agente almacenado cuentan como el agente predeterminado configurado.

`openclaw cron get <job-id>` devuelve el JSON del trabajo almacenado directamente. Use `cron show <job-id>` cuando desee la vista legible por humanos con la vista previa de la ruta de entrega.

`cron list --json` y `cron show <job-id> --json` incluyen un campo `status` de nivel superior en cada trabajo, calculado a partir de `enabled`, `state.runningAtMs` y `state.lastRunStatus`. Valores: `disabled`, `running`, `ok`, `error`, `skipped` o `idle`. Esto refleja la columna de estado legible por humanos para que las herramientas externas puedan leer el estado del trabajo sin volver a derivarlo.

Las entradas `cron runs` incluyen diagnósticos de entrega con el objetivo cron previsto, el objetivo resuelto, los envíos de la herramienta de mensajes, el uso de reserva y el estado de entrega.

Redirección de agente y sesión:

```bash
openclaw cron edit <job-id> --agent ops
openclaw cron edit <job-id> --clear-agent
openclaw cron edit <job-id> --session current
openclaw cron edit <job-id> --session "session:daily-brief"
```

`openclaw cron add` advierte cuando `--agent` se omite en los trabajos de turno de agente y vuelve al agente predeterminado (`main`). Pase `--agent <id>` en el momento de la creación para fijar un agente específico.

Ajustes de entrega:

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
openclaw cron edit <job-id> --best-effort-deliver
openclaw cron edit <job-id> --no-best-effort-deliver
openclaw cron edit <job-id> --no-deliver
```

## Relacionado

- [Referencia de la CLI](/es/cli)
- [Tareas programadas](/es/automation/cron-jobs)
