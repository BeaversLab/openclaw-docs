---
summary: "Trabajos programados, webhooks y activadores PubSub de Gmail para el programador de Gateway"
read_when:
  - Scheduling background jobs or wakeups
  - Wiring external triggers (webhooks, Gmail) into OpenClaw
  - Deciding between heartbeat and cron for scheduled tasks
title: "Tareas programadas"
---

# Tareas programadas (Cron)

Cron es el planificador integrado del Gateway. Persiste los trabajos, despierta al agente en el momento adecuado y puede devolver el resultado a un canal de chat o a un endpoint de webhook.

## Inicio rápido

```bash
# Add a one-shot reminder
openclaw cron add \
  --name "Reminder" \
  --at "2026-02-01T16:00:00Z" \
  --session main \
  --system-event "Reminder: check the cron docs draft" \
  --wake now \
  --delete-after-run

# Check your jobs
openclaw cron list

# See run history
openclaw cron runs --id <job-id>
```

## Cómo funciona cron

- Cron se ejecuta **dentro del proceso** del Gateway (no dentro del modelo).
- Los trabajos persisten en `~/.openclaw/cron/jobs.json` por lo que los reinicios no hacen perder las programaciones.
- Todas las ejecuciones de cron crean registros de [tarea en segundo plano](/es/automation/tasks).
- Los trabajos de un solo uso (`--at`) se autoeliminan tras el éxito de forma predeterminada.
- Las ejecuciones de cron aisladas cierran con mejor esfuerzo las pestañas/procesos del navegador rastreados para su sesión `cron:<jobId>` cuando se completa la ejecución, por lo que la automatización de navegador desasociada no deja procesos huérfanos.
- Las ejecuciones de cron aisladas también protegen contra respuestas de reconocimiento obsoletas. Si el primer resultado es solo una actualización de estado interina (`on it`, `pulling everything together`, y sugerencias similares) y ninguna ejecución de subagente descendente sigue siendo responsable de la respuesta final, OpenClaw vuelve a solicitar una vez el resultado real antes de la entrega.

<a id="maintenance"></a>

La conciliación de tareas para cron es propiedad del tiempo de ejecución: una tarea de cron activa permanece en vivo mientras el tiempo de ejecución de cron sigue rastreando ese trabajo como en ejecución, incluso si todavía existe una fila de sesión secundaria antigua. Una vez que el tiempo de ejecución deja de ser propietario del trabajo y expira el período de gracia de 5 minutos, el mantenimiento puede marcar la tarea como `lost`.

## Tipos de programación

| Tipo    | Opción de CLI | Descripción                                                     |
| ------- | ------------- | --------------------------------------------------------------- |
| `at`    | `--at`        | Marca de tiempo de un solo uso (ISO 8601 o relativa como `20m`) |
| `every` | `--every`     | Intervalo fijo                                                  |
| `cron`  | `--cron`      | Expresión cron de 5 o 6 campos con `--tz` opcional              |

Las marcas de tiempo sin zona horaria se tratan como UTC. Agregue `--tz America/New_York` para la programación de reloj de pared local.

Las expresiones recurrentes de inicio de hora se escalonan automáticamente hasta 5 minutos para reducir picos de carga. Use `--exact` para forzar una sincronización precisa o `--stagger 30s` para una ventana explícita.

### El día del mes y el día de la semana usan lógica OR

Las expresiones cron se analizan mediante [croner](https://github.com/Hexagon/croner). Cuando los campos del día del mes y del día de la semana no son comodines, croner coincide cuando **cualquiera** de los campos coincide, no ambos. Este es el comportamiento estándar de Vixie cron.

```
# Intended: "9 AM on the 15th, only if it's a Monday"
# Actual:   "9 AM on every 15th, AND 9 AM on every Monday"
0 9 15 * 1
```

Esto se dispara ~5-6 veces por mes en lugar de 0-1 veces por mes. OpenClaw utiliza el comportamiento OR predeterminado de Croner aquí. Para requerir ambas condiciones, utiliza el modificador de día de la semana `+` de Croner (`0 9 15 * +1`) o programa en un campo y protege el otro en el prompt o comando de tu trabajo.

## Estilos de ejecución

| Estilo               | valor `--session`   | Se ejecuta en                       | Lo mejor para                                    |
| -------------------- | ------------------- | ----------------------------------- | ------------------------------------------------ |
| Sesión principal     | `main`              | Próximo turno de latido             | Recordatorios, eventos del sistema               |
| Aislado              | `isolated`          | `cron:<jobId>` dedicado             | Informes, tareas en segundo plano                |
| Sesión actual        | `current`           | Vinculado en el momento de creación | Trabajo recurrente con conocimiento del contexto |
| Sesión personalizada | `session:custom-id` | Sesión persistente con nombre       | Flujos de trabajo que se basan en el historial   |

Los trabajos de **Sesión principal** ponen en cola un evento del sistema y opcionalmente despiertan el latido (`--wake now` o `--wake next-heartbeat`). Los trabajos **Aislados** ejecutan un turno de agente dedicado con una sesión nueva. Las **Sesiones personalizadas** (`session:xxx`) mantienen el contexto entre ejecuciones, permitiendo flujos de trabajo como reuniones diarias que se basan en resúmenes anteriores.

Para los trabajos aislados, la limpieza del tiempo de ejecución ahora incluye una limpieza del navegador de mejor esfuerzo para esa sesión cron. Se ignoran los fallos de limpieza para que el resultado cron real todavía prevalezca.

Cuando las ejecuciones cron aisladas orquestan subagentes, la entrega también prefiere la salida del descendiente final sobre el texto intermedio del padre obsoleto. Si los descendentes todavía se están ejecutando, OpenClaw suprime esa actualización parcial del padre en lugar de anunciarla.

### Opciones de carga útil para trabajos aislados

- `--message`: texto del prompt (requerido para aislados)
- `--model` / `--thinking`: anulaciones del modelo y nivel de pensamiento
- `--light-context`: omitir la inyección del archivo de arranque del espacio de trabajo
- `--tools exec,read`: restringir qué herramientas puede usar el trabajo

`--model` utiliza el modelo permitido seleccionado para ese trabajo. Si el modelo solicitado
no está permitido, cron registra un aviso y recurre a la selección del modelo
por defecto del agente/trabajo en su lugar. Las cadenas de fallback configuradas aún se aplican, pero una
sustitución de modelo simple sin una lista de fallback explícita por trabajo ya no añade el
primario del agente como un objetivo de reintento extra oculto.

La precedencia de selección de modelo para trabajos aislados es:

1. Sustitución de modelo del enlace de Gmail (cuando la ejecución proviene de Gmail y esa sustitución está permitida)
2. Payload por trabajo `model`
3. Sustitución de modelo de sesión de cron almacenada
4. Selección de modelo del agente/por defecto

El modo rápido también sigue la selección en vivo resuelta. Si la configuración del modelo seleccionado
tiene `params.fastMode`, el cron aislado lo utiliza por defecto. Una sesión almacenada
con la sustitución `fastMode` todavía tiene prioridad sobre la configuración en cualquier dirección.

Si una ejecución aislada alcanza una transferencia de cambio de modelo en vivo, cron reintenta con el
proveedor/modelo cambiado y persiste esa selección en vivo antes de reintentar. Cuando
el cambio también lleva un nuevo perfil de autenticación, cron también persiste esa sustitución de
perfil de autenticación. Los reintentos están limitados: después del intento inicial más 2 reintentos
de cambio, cron aborta en lugar de entrar en un bucle infinito.

## Entrega y salida

| Modo       | Lo que sucede                                                       |
| ---------- | ------------------------------------------------------------------- |
| `announce` | Entregar resumen al canal de destino (predeterminado para aislados) |
| `webhook`  | Enviar payload de evento finalizado por POST a una URL              |
| `none`     | Solo interno, sin entrega                                           |

Use `--announce --channel telegram --to "-1001234567890"` para la entrega al canal. Para los temas del foro de Telegram, use `-1001234567890:topic:123`. Los objetivos de Slack/Discord/Mattermost deben usar prefijos explícitos (`channel:<id>`, `user:<id>`).

Para trabajos aislados propiedad de cron, el runner posee la ruta de entrega final. Se
indica al agente que devuelva un resumen de texto sin formato y ese resumen se envía
a través de `announce`, `webhook`, o se mantiene internamente para `none`. `--no-deliver`
no devuelve la entrega al agente; mantiene la ejecución de forma interna.

Si la tarea original indica explícitamente enviar un mensaje a algún destinatario externo, el agente debe indicar en su salida a quién/dónde debe ir ese mensaje en lugar de intentar enviarlo directamente.

Las notificaciones de error siguen una ruta de destino separada:

- `cron.failureDestination` establece un valor predeterminado global para las notificaciones de error.
- `job.delivery.failureDestination` anula eso por cada trabajo.
- Si no se establece ninguno de los dos y el trabajo ya se entrega a través de `announce`, las notificaciones de error ahora recurren a ese objetivo de anuncio principal.
- `delivery.failureDestination` solo es compatible con trabajos `sessionTarget="isolated"` a menos que el modo de entrega principal sea `webhook`.

## Ejemplos de CLI

Recordatorio de una sola vez (sesión principal):

```bash
openclaw cron add \
  --name "Calendar check" \
  --at "20m" \
  --session main \
  --system-event "Next heartbeat: check calendar." \
  --wake now
```

Trabajo aislado recurrente con entrega:

```bash
openclaw cron add \
  --name "Morning brief" \
  --cron "0 7 * * *" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Summarize overnight updates." \
  --announce \
  --channel slack \
  --to "channel:C1234567890"
```

Trabajo aislado con anulación de modelo y pensamiento:

```bash
openclaw cron add \
  --name "Deep analysis" \
  --cron "0 6 * * 1" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Weekly deep analysis of project progress." \
  --model "opus" \
  --thinking high \
  --announce
```

## Webhooks

Gateway puede exponer endpoints de webhook HTTP para disparadores externos. Habilítelo en la configuración:

```json5
{
  hooks: {
    enabled: true,
    token: "shared-secret",
    path: "/hooks",
  },
}
```

### Autenticación

Cada solicitud debe incluir el token del enlace (hook token) a través del encabezado:

- `Authorization: Bearer <token>` (recomendado)
- `x-openclaw-token: <token>`

Los tokens de cadena de consulta (query-string) son rechazados.

### POST /hooks/wake

Poner en cola un evento del sistema para la sesión principal:

```bash
curl -X POST http://127.0.0.1:18789/hooks/wake \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"text":"New email received","mode":"now"}'
```

- `text` (obligatorio): descripción del evento
- `mode` (opcional): `now` (predeterminado) o `next-heartbeat`

### POST /hooks/agent

Ejecutar un turno de agente aislado:

```bash
curl -X POST http://127.0.0.1:18789/hooks/agent \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"message":"Summarize inbox","name":"Email","model":"openai/gpt-5.4-mini"}'
```

Campos: `message` (obligatorio), `name`, `agentId`, `wakeMode`, `deliver`, `channel`, `to`, `model`, `thinking`, `timeoutSeconds`.

### Enlaces asignados (Mapped hooks) (POST /hooks/\<name\>)

Los nombres de enlace personalizados se resuelven mediante `hooks.mappings` en la configuración. Las asignaciones pueden transformar cargas útiles arbitrarias en acciones `wake` o `agent` con plantillas o transformaciones de código.

### Seguridad

- Mantenga los endpoints de enlace detrás de un bucle local (loopback), una red de cola (tailnet) o un proxy inverso confiable.
- Use un token de enlace dedicado; no reutilice los tokens de autenticación de la puerta de enlace (gateway).
- Mantenga `hooks.path` en una subruta dedicada; `/` se rechaza.
- Establezca `hooks.allowedAgentIds` para limitar el enrutamiento explícito de `agentId`.
- Mantenga `hooks.allowRequestSessionKey=false` a menos que requiera sesiones seleccionadas por el llamador.
- Si habilita `hooks.allowRequestSessionKey`, también establezca `hooks.allowedSessionKeyPrefixes` para restringir las formas permitidas de las claves de sesión.
- Las cargas útiles de los hooks se envuelven con límites de seguridad de forma predeterminada.

## Integración con Gmail PubSub

Conecte los disparadores de la bandeja de entrada de Gmail a OpenClaw a través de Google PubSub.

**Requisitos previos**: CLI `gcloud`, `gog` (gogcli), hooks de OpenClaw habilitados, Tailscale para el punto final HTTPS público.

### Configuración mediante asistente (recomendado)

```bash
openclaw webhooks gmail setup --account openclaw@gmail.com
```

Esto escribe la configuración `hooks.gmail`, habilita el preajuste de Gmail y usa Tailscale Funnel para el punto final de inserción.

### Inicio automático de Gateway

Cuando `hooks.enabled=true` y `hooks.gmail.account` están establecidos, el Gateway inicia `gog gmail watch serve` al arrancar y renueva automáticamente la vigilancia. Establezca `OPENCLAW_SKIP_GMAIL_WATCHER=1` para optar por no participar.

### Configuración manual única

1. Seleccione el proyecto de GCP que posee el cliente OAuth utilizado por `gog`:

```bash
gcloud auth login
gcloud config set project <project-id>
gcloud services enable gmail.googleapis.com pubsub.googleapis.com
```

2. Cree el tema y otorgue acceso de inserción de Gmail:

```bash
gcloud pubsub topics create gog-gmail-watch
gcloud pubsub topics add-iam-policy-binding gog-gmail-watch \
  --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
  --role=roles/pubsub.publisher
```

3. Inicie la vigilancia:

```bash
gog gmail watch start \
  --account openclaw@gmail.com \
  --label INBOX \
  --topic projects/<project-id>/topics/gog-gmail-watch
```

### Invalidación del modelo de Gmail

```json5
{
  hooks: {
    gmail: {
      model: "openrouter/meta-llama/llama-3.3-70b-instruct:free",
      thinking: "off",
    },
  },
}
```

## Gestión de trabajos

```bash
# List all jobs
openclaw cron list

# Edit a job
openclaw cron edit <jobId> --message "Updated prompt" --model "opus"

# Force run a job now
openclaw cron run <jobId>

# Run only if due
openclaw cron run <jobId> --due

# View run history
openclaw cron runs --id <jobId> --limit 50

# Delete a job
openclaw cron remove <jobId>

# Agent selection (multi-agent setups)
openclaw cron add --name "Ops sweep" --cron "0 6 * * *" --session isolated --message "Check ops queue" --agent ops
openclaw cron edit <jobId> --clear-agent
```

Nota sobre la invalidación del modelo:

- `openclaw cron add|edit --model ...` cambia el modelo seleccionado del trabajo.
- Si se permite el modelo, ese proveedor/modelo exacto llega a la ejecución
  del agente aislado.
- Si no está permitido, cron advierte y recurre a la selección del modelo
  predeterminado/por agente del trabajo.
- Las cadenas de respaldo configuradas todavía se aplican, pero una invalidación simple `--model` sin
  una lista de respaldo explícita por trabajo ya no pasa al agente
  principal como un objetivo de reintento adicional silencioso.

## Configuración

```json5
{
  cron: {
    enabled: true,
    store: "~/.openclaw/cron/jobs.json",
    maxConcurrentRuns: 1,
    retry: {
      maxAttempts: 3,
      backoffMs: [60000, 120000, 300000],
      retryOn: ["rate_limit", "overloaded", "network", "server_error"],
    },
    webhookToken: "replace-with-dedicated-webhook-token",
    sessionRetention: "24h",
    runLog: { maxBytes: "2mb", keepLines: 2000 },
  },
}
```

Desactivar cron: `cron.enabled: false` o `OPENCLAW_SKIP_CRON=1`.

**Reintento de un solo disparo**: los errores transitorios (límite de tasa, sobrecarga, red, error del servidor) se reintentan hasta 3 veces con retroceso exponencial. Los errores permanentes se desactivan inmediatamente.

**Reintento recurrente**: retroceso exponencial (30 s a 60 m) entre reintentos. El retroceso se restablece después de la próxima ejecución exitosa.

**Mantenimiento**: `cron.sessionRetention` (por defecto `24h`) poda las entradas de sesión de ejecución aisladas. `cron.runLog.maxBytes` / `cron.runLog.keepLines` podan automáticamente los archivos de registro de ejecución.

## Solución de problemas

### Jerarquía de comandos

```bash
openclaw status
openclaw gateway status
openclaw cron status
openclaw cron list
openclaw cron runs --id <jobId> --limit 20
openclaw system heartbeat last
openclaw logs --follow
openclaw doctor
```

### Cron no se ejecuta

- Verifique la variable de entorno `cron.enabled` y `OPENCLAW_SKIP_CRON`.
- Confirme que el Gateway se está ejecutando continuamente.
- Para las programaciones `cron`, verifique la zona horaria (`--tz`) frente a la zona horaria del host.
- `reason: not-due` en la salida de ejecución significa que se verificó una ejecución manual con `openclaw cron run <jobId> --due` y el trabajo aún no debía ejecutarse.

### Cron se ejecutó pero no hubo entrega

- El modo de entrega es `none` significa que no se espera ningún mensaje externo.
- El destino de entrega faltante/no válido (`channel`/`to`) significa que se omitió el envío saliente.
- Los errores de autenticación del canal (`unauthorized`, `Forbidden`) significan que la entrega fue bloqueada por las credenciales.
- Si la ejecución aislada devuelve solo el token silencioso (`NO_REPLY` / `no_reply`),
  OpenClaw suprime la entrega saliente directa y también suprime la ruta de
  resumen en cola de respaldo, por lo que no se publica nada de nuevo en el chat.
- Para trabajos aislados propiedad de cron, no esperes que el agente use la herramienta de mensaje
  como alternativa. El ejecutor se encarga de la entrega final; `--no-deliver` la mantiene
  interna en lugar de permitir un envío directo.

### Problemas de zona horaria

- Cron sin `--tz` usa la zona horaria del host de la puerta de enlace.
- Las programaciones `at` sin zona horaria se tratan como UTC.
- El `activeHours` de Heartbeat usa la resolución de zona horaria configurada.

## Relacionado

- [Automatización y tareas](/es/automation) — todos los mecanismos de automatización de un vistazo
- [Tareas en segundo plano](/es/automation/tasks) — libro mayor de tareas para ejecuciones de cron
- [Heartbeat](/es/gateway/heartbeat) — turnos periódicos de la sesión principal
- [Zona horaria](/es/concepts/timezone) — configuración de zona horaria
