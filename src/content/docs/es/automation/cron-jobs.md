---
summary: "Trabajos programados, webhooks y activadores PubSub de Gmail para el planificador del Gateway"
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
- Todas las ejecuciones de cron crean registros de [tarea en segundo plano](/en/automation/tasks).
- Los trabajos de un solo uso (`--at`) se autoeliminan tras el éxito de forma predeterminada.
- Las ejecuciones de cron aisladas cierran con mejor esfuerzo las pestañas/procesos del navegador rastreados para su sesión `cron:<jobId>` cuando se completa la ejecución, por lo que la automatización del navegador desacoplada no deja procesos huérfanos.
- Las ejecuciones de cron aisladas también protegen contra respuestas de reconocimiento obsoletas. Si el primer resultado es solo una actualización de estado provisional (`on it`, `pulling everything together`, y sugerencias similares) y ninguna ejecución de subagente descendente sigue siendo responsable de la respuesta final, OpenClaw vuelve a solicitar una vez el resultado real antes de la entrega.

<a id="maintenance"></a>

La conciliación de tareas para cron es propiedad del tiempo de ejecución: una tarea de cron activa permanece activa mientras el tiempo de ejecución de cron todavía rastrea ese trabajo como en ejecución, incluso si aún existe una fila de sesión secundaria antigua. Una vez que el tiempo de ejecución deja de ser propietario del trabajo y expira la ventana de gracia de 5 minutos, el mantenimiento puede marcar la tarea como `lost`.

## Tipos de programación

| Tipo    | Opción de CLI | Descripción                                                     |
| ------- | ------------- | --------------------------------------------------------------- |
| `at`    | `--at`        | Marca de tiempo de un solo uso (ISO 8601 o relativa como `20m`) |
| `every` | `--every`     | Intervalo fijo                                                  |
| `cron`  | `--cron`      | Expresión cron de 5 o 6 campos con `--tz` opcional              |

Las marcas de tiempo sin zona horaria se tratan como UTC. Agregue `--tz America/New_York` para la programación de hora local.

Las expresiones recurrentes de hora en punto se escalonan automáticamente hasta 5 minutos para reducir los picos de carga. Use `--exact` para forzar una sincronización precisa o `--stagger 30s` para una ventana explícita.

## Estilos de ejecución

| Estilo               | Valor `--session`   | Se ejecuta en                         | Lo mejor para                                  |
| -------------------- | ------------------- | ------------------------------------- | ---------------------------------------------- |
| Sesión principal     | `main`              | Siguiente latido del heartbeat        | Recordatorios, eventos del sistema             |
| Aislado              | `isolated`          | `cron:<jobId>` dedicado               | Informes, tareas en segundo plano              |
| Sesión actual        | `current`           | Limitado en el momento de la creación | Trabajo recurrente consciente del contexto     |
| Sesión personalizada | `session:custom-id` | Sesión con nombre persistente         | Flujos de trabajo que se basan en el historial |

Los trabajos de **Sesión principal** ponen en cola un evento del sistema y, opcionalmente, despiertan el latido (`--wake now` o `--wake next-heartbeat`). Los trabajos **Aislados** ejecutan un turno de agente dedicado con una sesión nueva. Las **Sesiones personalizadas** (`session:xxx`) persisten el contexto entre ejecuciones, permitiendo flujos de trabajo como reuniones diarias que se basan en resúmenes anteriores.

Para trabajos aislados, el desmontaje del tiempo de ejecución ahora incluye una limpieza del navegador de mejor esfuerzo para esa sesión cron. Los fallos de limpieza se ignoran para que el resultado cron real todavía tenga prioridad.

Cuando las ejecuciones cron aisladas orquestan subagentes, la entrega también prefiere la salida del descendiente final sobre el texto intermedio del padre obsoleto. Si los descendentes aún se están ejecutando, OpenClaw suprime esa actualización parcial del padre en lugar de anunciarla.

### Opciones de carga útil para trabajos aislados

- `--message`: texto del aviso (requerido para aislado)
- `--model` / `--thinking`: modelo y anulación del nivel de pensamiento
- `--light-context`: omitir la inyección del archivo de arranque del espacio de trabajo
- `--tools exec,read`: restringir qué herramientas puede usar el trabajo

`--model` usa el modelo permitido seleccionado para ese trabajo. Si el modelo solicitado no está permitido, cron registra una advertencia y recurre a la selección del modelo predeterminado/por agente del trabajo en su lugar. Las cadenas de reserva configuradas todavía se aplican, pero una anulación de modelo simple sin una lista de reserva explícita por trabajo ya no añade el agente principal como un objetivo de reintento adicional oculto.

La precedencia de selección del modelo para trabajos aislados es:

1. Anulación del modelo de enlace de Gmail (cuando la ejecución proviene de Gmail y se permite esa anulación)
2. Carga útil por trabajo `model`
3. Anulación del modelo de sesión cron almacenada
4. Selección del modelo predeterminado/por agente

El modo rápido también sigue la selección en vivo resuelta. Si la configuración del modelo seleccionado tiene `params.fastMode`, el cron aislado usa eso por defecto. Una anulación `fastMode` de sesión almacenada todavía tiene prioridad sobre la configuración en cualquier dirección.

Si una ejecución aislada encuentra una entrega de cambio de modelo en vivo, cron lo reintenta con el proveedor/modelo cambiado y persiste esa selección en vivo antes de reintentar. Cuando el cambio también conlleva un nuevo perfil de autenticación, cron también persiste esa anulación del perfil de autenticación. Los reintentos están limitados: después del intento inicial más 2 reintentos de cambio, cron aborta en lugar de repetirse infinitamente.

## Entrega y salida

| Modo       | Lo que sucede                                                      |
| ---------- | ------------------------------------------------------------------ |
| `announce` | Entregar resumen al canal de destino (predeterminado para aislado) |
| `webhook`  | Publicar la carga útil del evento finalizado en una URL            |
| `none`     | Solo interno, sin entrega                                          |

Use `--announce --channel telegram --to "-1001234567890"` para la entrega al canal. Para temas de foro de Telegram, use `-1001234567890:topic:123`. Los destinos de Slack/Discord/Mattermost deben usar prefijos explícitos (`channel:<id>`, `user:<id>`).

Para trabajos aislados propiedad de cron, el ejecutor posee la ruta de entrega final. Se le pide al agente que devuelva un resumen en texto plano y ese resumen se envía a través de `announce`, `webhook`, o se mantiene internamente para `none`. `--no-deliver` no devuelve la entrega al agente; mantiene la ejecución internamente.

Si la tarea original indica explícitamente enviar un mensaje a algún destinatario externo, el agente debe indicar a quién/dónde debe ir ese mensaje en su salida en lugar de intentar enviarlo directamente.

Las notificaciones de error siguen una ruta de destino separada:

- `cron.failureDestination` establece un valor predeterminado global para las notificaciones de error.
- `job.delivery.failureDestination` anula eso por trabajo.
- Si no se establece ninguno y el trabajo ya se entrega a través de `announce`, las notificaciones de error ahora vuelven a ese destino de anuncio principal.
- `delivery.failureDestination` solo se admite en trabajos `sessionTarget="isolated"` a menos que el modo de entrega principal sea `webhook`.

## Ejemplos de CLI

Recordatorio de un solo disparo (sesión principal):

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

Trabajo aislado con modelo y anulación de pensamiento:

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

Cada solicitud debe incluir el token de enlace a través del encabezado:

- `Authorization: Bearer <token>` (recomendado)
- `x-openclaw-token: <token>`

Los tokens de cadena de consulta son rechazados.

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

### Hooks asignados (POST /hooks/\<name\>)

Los nombres de hook personalizados se resuelven mediante `hooks.mappings` en la configuración. Las asignaciones pueden transformar cargas útiles arbitrarias en acciones `wake` o `agent` con plantillas o transformaciones de código.

### Seguridad

- Mantenga los endpoints de hook detrás de un loopback, tailnet o proxy inverso de confianza.
- Use un token de hook dedicado; no reutilice tokens de autenticación de gateway.
- Mantenga `hooks.path` en una subruta dedicada; `/` es rechazado.
- Establezca `hooks.allowedAgentIds` para limitar el enrutamiento explícito de `agentId`.
- Mantenga `hooks.allowRequestSessionKey=false` a menos que requiera sesiones seleccionadas por el llamador.
- Si habilita `hooks.allowRequestSessionKey`, también establezca `hooks.allowedSessionKeyPrefixes` para restringir las formas permitidas de las claves de sesión.
- Las cargas útiles de hook se envuelven con límites de seguridad de forma predeterminada.

## Integración con Gmail PubSub

Conecte los disparadores de la bandeja de entrada de Gmail a OpenClaw a través de Google PubSub.

**Requisitos previos**: CLI de `gcloud`, `gog` (gogcli), hooks de OpenClaw habilitados, Tailscale para el endpoint HTTPS público.

### Configuración con asistente (recomendado)

```bash
openclaw webhooks gmail setup --account openclaw@gmail.com
```

Esto escribe la configuración de `hooks.gmail`, habilita el valor preestablecido de Gmail y usa Tailscale Funnel para el endpoint de inserción.

### Inicio automático de Gateway

Cuando `hooks.enabled=true` y `hooks.gmail.account` están configurados, el Gateway inicia `gog gmail watch serve` al arrancar y renueva automáticamente la vigilancia. Configure `OPENCLAW_SKIP_GMAIL_WATCHER=1` para optar por no participar.

### Configuración manual única

1. Seleccione el proyecto de GCP que posee el cliente OAuth utilizado por `gog`:

```bash
gcloud auth login
gcloud config set project <project-id>
gcloud services enable gmail.googleapis.com pubsub.googleapis.com
```

2. Cree el tema y otorgue acceso de push de Gmail:

```bash
gcloud pubsub topics create gog-gmail-watch
gcloud pubsub topics add-iam-policy-binding gog-gmail-watch \
  --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
  --role=roles/pubsub.publisher
```

3. Iniciar la vigilancia:

```bash
gog gmail watch start \
  --account openclaw@gmail.com \
  --label INBOX \
  --topic projects/<project-id>/topics/gog-gmail-watch
```

### Anulación del modelo de Gmail

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

Nota sobre anulación del modelo:

- `openclaw cron add|edit --model ...` cambia el modelo seleccionado del trabajo.
- Si el modelo está permitido, ese proveedor/modelo exacto llega a la ejecución
  del agente aislado.
- Si no está permitido, cron advierte y recurre a la selección del modelo
  predeterminado/agente del trabajo.
- Las cadenas de reserva configuradas todavía se aplican, pero una anulación `--model` simple
  sin una lista de reserva explícita por trabajo ya no pasa al
  principal del agente como un objetivo de reintento adicional silencioso.

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

**Reintento recurrente**: retroceso exponencial (30s a 60m) entre reintentos. El retroceso se restablece después de la próxima ejecución exitosa.

**Mantenimiento**: `cron.sessionRetention` (por defecto `24h`) poda las entradas de sesión de ejecución aislada. `cron.runLog.maxBytes` / `cron.runLog.keepLines` podan automáticamente los archivos de registro de ejecución.

## Solución de problemas

### Escalera de comandos

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

- Compruebe la variable de entorno `cron.enabled` y `OPENCLAW_SKIP_CRON`.
- Confirme que el Gateway se está ejecutando continuamente.
- Para los horarios `cron`, verifique la zona horaria (`--tz`) frente a la zona horaria del host.
- `reason: not-due` en la salida de ejecución significa que se verificó la ejecución manual con `openclaw cron run <jobId> --due` y el trabajo aún no vencía.

### Cron se ejecutó pero no hay entrega

- El modo de entrega es `none` significa que no se espera ningún mensaje externo.
- El destino de entrega faltante/inválido (`channel`/`to`) significa que se omitió la salida.
- Los errores de autenticación del canal (`unauthorized`, `Forbidden`) significan que la entrega fue bloqueada por las credenciales.
- Si la ejecución aislada devuelve solo el token silencioso (`NO_REPLY` / `no_reply`),
  OpenClaw suprime la entrega saliente directa y también suprime la ruta
  alternativa de resumen en cola, por lo que no se publica nada de nuevo en el chat.
- Para los trabajos aislados propiedad de cron, no esperes que el agente utilice la herramienta de mensaje
  como alternativa. El ejecutor es el propietario de la entrega final; `--no-deliver` la mantiene
  interna en lugar de permitir un envío directo.

### Problemas de zona horaria

- Cron sin `--tz` utiliza la zona horaria del host de la puerta de enlace.
- Las programaciones `at` sin zona horaria se tratan como UTC.
- El `activeHours` de Heartbeat utiliza la resolución de zona horaria configurada.

## Relacionado

- [Automatización y tareas](/en/automation) — todos los mecanismos de automatización de un vistazo
- [Tareas en segundo plano](/en/automation/tasks) — libro mayor de tareas para ejecuciones de cron
- [Heartbeat](/en/gateway/heartbeat) — turnos periódicos de la sesión principal
- [Zona horaria](/en/concepts/timezone) — configuración de zona horaria
