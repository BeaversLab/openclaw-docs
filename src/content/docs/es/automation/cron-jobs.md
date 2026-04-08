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
- Los trabajos de un solo uso (`--at`) se eliminan automáticamente tras el éxito de forma predeterminada.
- Las ejecuciones aisladas de cron cierran con el mejor esfuerzo posible las pestañas/procesos del navegador rastreados para su sesión `cron:<jobId>` cuando finaliza la ejecución, de modo que la automatización de navegador desacoplada no deje procesos huérfanos.
- Las ejecuciones aisladas de cron también protegen contra respuestas de reconocimiento obsoletas. Si el primer resultado es solo una actualización de estado interina (`on it`, `pulling everything together` y sugerencias similares) y ninguna ejecución de subagente descendente sigue siendo responsable de la respuesta final, OpenClaw vuelve a solicitar una vez el resultado real antes de la entrega.

La conciliación de tareas para cron es propiedad del tiempo de ejecución: una tarea de cron activa permanece activa mientras el tiempo de ejecución de cron sigue rastreando ese trabajo como en ejecución, incluso si todavía existe una fila de sesión secundaria antigua. Una vez que el tiempo de ejecución deja de ser propietario del trabajo y expira el período de gracia de 5 minutos, el mantenimiento puede marcar la tarea como `lost`.

## Tipos de programación

| Tipo    | Opción de CLI | Descripción                                                     |
| ------- | ------------- | --------------------------------------------------------------- |
| `at`    | `--at`        | Marca de tiempo de un solo uso (ISO 8601 o relativa como `20m`) |
| `every` | `--every`     | Intervalo fijo                                                  |
| `cron`  | `--cron`      | Expresión cron de 5 o 6 campos con `--tz` opcional              |

Las marcas de tiempo sin zona horaria se tratan como UTC. Añada `--tz America/New_York` para la programación local de hora del reloj.

Las expresiones recurrentes de cada hora se escalonan automáticamente hasta 5 minutos para reducir picos de carga. Use `--exact` para forzar una sincronización precisa o `--stagger 30s` para una ventana explícita.

## Estilos de ejecución

| Estilo               | Valor `--session`   | Se ejecuta en                       | Mejor para                                     |
| -------------------- | ------------------- | ----------------------------------- | ---------------------------------------------- |
| Sesión principal     | `main`              | Próximo ciclo de latido             | Recordatorios, eventos del sistema             |
| Aislado              | `isolated`          | `cron:<jobId>` dedicado             | Informes, tareas en segundo plano              |
| Sesión actual        | `current`           | Vinculado en el momento de creación | Trabajo recurrente con conciencia del contexto |
| Sesión personalizada | `session:custom-id` | Sesión con nombre persistente       | Flujos de trabajo que se basan en el historial |

Los trabajos de **Sesión principal** ponen en cola un evento del sistema y, opcionalmente, despiertan el latido (`--wake now` o `--wake next-heartbeat`). Los trabajos **Aislados** ejecutan un ciclo de agente dedicado con una sesión nueva. Las **Sesiones personalizadas** (`session:xxx`) mantienen el contexto entre ejecuciones, lo que permite flujos de trabajo como reuniones diarias que se basan en resúmenes anteriores.

Para los trabajos aislados, el desmontaje del tiempo de ejecución ahora incluye una limpieza del navegador de mejor esfuerzo para esa sesión de cron. Los fallos de limpieza se ignoran para que el resultado real de cron prevalezca.

Cuando las ejecuciones de cron aisladas orquestan subagentes, la entrega también prefiere la salida final del descendiente sobre el texto interino principal obsoleto. Si los descendentes aún se están ejecutando, OpenClaw suprime esa actualización parcial del padre en lugar de anunciarla.

### Opciones de carga útil para trabajos aislados

- `--message`: texto del indicador (requerido para aislados)
- `--model` / `--thinking`: anulaciones de modelo y nivel de pensamiento
- `--light-context`: omitir la inyección del archivo de arranque del espacio de trabajo
- `--tools exec,read`: restringir qué herramientas puede usar el trabajo

`--model` usa el modelo permitido seleccionado para ese trabajo. Si el modelo solicitado no está permitido, cron registra una advertencia y recurre a la selección del modelo predeterminado del agente/trabajo. Las cadenas de respaldo configuradas aún se aplican, pero una anulación de modelo simple sin una lista de respaldo explícita por trabajo ya no agrega el agente principal como un objetivo de reintento adicional oculto.

La precedencia de selección de modelo para trabajos aislados es:

1. Invalidación del modelo de enlace de Gmail (cuando la ejecución proviene de Gmail y se permite esa invalidación)
2. Carga útil por trabajo `model`
3. Invalidación del modelo de sesión de cron almacenada
4. Selección de modelo de agente/predeterminado

El modo rápido también sigue la selección en vivo resuelta. Si la configuración del modelo seleccionado
tiene `params.fastMode`, el cron aislado usa eso por defecto. Una invalidación de sesión
almacenada `fastMode` aún tiene prioridad sobre la configuración en cualquier dirección.

Si una ejecución aislada llega a un traspaso de cambio de modelo en vivo, cron reintenta con el
proveedor/modelo cambiado y persiste esa selección en vivo antes de reintentar. Cuando
el cambio también lleva un nuevo perfil de autenticación, cron también persiste esa invalidación
del perfil de autenticación. Los reintentos están limitados: después del intento inicial más 2 reintentos
de cambio, cron aborta en lugar de repetir en bucle para siempre.

## Entrega y salida

| Modo       | Lo que sucede                                                      |
| ---------- | ------------------------------------------------------------------ |
| `announce` | Entregar resumen al canal de destino (predeterminado para aislado) |
| `webhook`  | POST de la carga útil del evento finalizado a una URL              |
| `none`     | Solo interno, sin entrega                                          |

Use `--announce --channel telegram --to "-1001234567890"` para la entrega al canal. Para los temas del foro de Telegram, use `-1001234567890:topic:123`. Los objetivos de Slack/Discord/Mattermost deben usar prefijos explícitos (`channel:<id>`, `user:<id>`).

Para trabajos aislados propiedad de cron, el ejecutor posee la ruta de entrega final. Se
solicita al agente que devuelva un resumen en texto plano y ese resumen se envía
a través de `announce`, `webhook`, o se mantiene internamente para `none`. `--no-deliver`
no devuelve la entrega al agente; mantiene la ejecución internamente.

Si la tarea original indica explícitamente enviar un mensaje a algún destinatario externo, el
agente debe indicar a quién/dónde debe ir ese mensaje en su salida en lugar de
intentar enviarlo directamente.

Las notificaciones de fallo siguen una ruta de destino separada:

- `cron.failureDestination` establece un predeterminado global para las notificaciones de fallo.
- `job.delivery.failureDestination` invalida eso por trabajo.
- Si no se establece ninguno y el trabajo ya se entrega a través de `announce`, las notificaciones de fallah ahora recurren a ese objetivo de anuncio principal.
- `delivery.failureDestination` solo es compatible con trabajos `sessionTarget="isolated"` a menos que el modo de entrega principal sea `webhook`.

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

Gateway puede exponer endpoints de webhook HTTP para disparadores externos. Habilitar en la configuración:

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

### Ganchos asignados (POST /hooks/\<name\>)

Los nombres de gancho personalizados se resuelven a través de `hooks.mappings` en la configuración. Las asignaciones pueden transformar cargas útiles arbitrarias en acciones `wake` o `agent` con plantillas o transformaciones de código.

### Seguridad

- Mantenga los endpoints de enlace detrás de loopback, tailnet o proxy inverso de confianza.
- Use un token de enlace dedicado; no reutilice los tokens de autenticación de gateway.
- Mantenga `hooks.path` en una subruta dedicada; `/` es rechazado.
- Establezca `hooks.allowedAgentIds` para limitar el enrutamiento explícito de `agentId`.
- Mantenga `hooks.allowRequestSessionKey=false` a menos que necesite sesiones seleccionadas por el interlocutor.
- Si habilita `hooks.allowRequestSessionKey`, también configure `hooks.allowedSessionKeyPrefixes` para restringir las formas permitidas de claves de sesión.
- De forma predeterminada, los payloads de los enlaces se envuelven con límites de seguridad.

## Integración con Gmail PubSub

Conecte los disparadores de la bandeja de entrada de Gmail a OpenClaw a través de Google PubSub.

**Requisitos previos**: CLI de `gcloud`, `gog` (gogcli), enlaces de OpenClaw habilitados, Tailscale para el endpoint público HTTPS.

### Configuración mediante asistente (recomendado)

```bash
openclaw webhooks gmail setup --account openclaw@gmail.com
```

Esto escribe la configuración `hooks.gmail`, habilita el preset de Gmail y usa Tailscale Funnel para el endpoint push.

### Inicio automático de la Gateway

Cuando `hooks.enabled=true` y `hooks.gmail.account` están configurados, la Gateway inicia `gog gmail watch serve` al arrancar y renueva automáticamente la vigilancia. Configure `OPENCLAW_SKIP_GMAIL_WATCHER=1` para optar por no participar.

### Configuración manual única

1. Seleccione el proyecto de GCP que posee el cliente OAuth utilizado por `gog`:

```bash
gcloud auth login
gcloud config set project <project-id>
gcloud services enable gmail.googleapis.com pubsub.googleapis.com
```

2. Crear el tema y conceder acceso de push de Gmail:

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

Nota sobre la anulación del modelo:

- `openclaw cron add|edit --model ...` cambia el modelo seleccionado del trabajo.
- Si se permite el modelo, ese proveedor/modelo exacto llega a la ejecución
  del agente aislado.
- Si no se permite, cron avisa y recurre a la selección de modelo
  predeterminado/del agente del trabajo.
- Las cadenas de respaldo configuradas aún se aplican, pero una anulación `--model` simple
  sin una lista de respaldo explícita por trabajo ya no recurre al principal
  del agente como un objetivo de reintento adicional silencioso.

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

**Reintento único**: los errores transitorios (límite de tasa, sobrecarga, red, error del servidor) se reintentan hasta 3 veces con retroceso exponencial. Los errores permanentes se desactivan inmediatamente.

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
- Confirme que la Gateway se está ejecutando continuamente.
- Para las programaciones `cron`, verifique la zona horaria (`--tz`) frente a la zona horaria del host.
- `reason: not-due` en la salida de ejecución significa que se verificó una ejecución manual con `openclaw cron run <jobId> --due` y el trabajo aún no vencía.

### Cron se ejecutó pero no hubo entrega

- El modo de entrega es `none` significa que no se espera ningún mensaje externo.
- El destino de entrega faltante/inválido (`channel`/`to`) significa que se omitió la salida.
- Los errores de autenticación del canal (`unauthorized`, `Forbidden`) significan que la entrega fue bloqueada por las credenciales.
- Si la ejecución aislada devuelve solo el token silencioso (`NO_REPLY` / `no_reply`),
  OpenClaw suprime la entrega saliente directa y también suprime la ruta de
  resumen en cola alternativa, por lo que no se publica nada de nuevo en el chat.
- Para los trabajos aislados propiedad de cron, no espere que el agente use la herramienta de mensaje
  como alternativa. El ejecutor es el propietario de la entrega final; `--no-deliver` la mantiene
  interna en lugar de permitir un envío directo.

### Problemas de zona horaria

- Cron sin `--tz` utiliza la zona horaria del host de la puerta de enlace.
- Las programaciones `at` sin zona horaria se tratan como UTC.
- El latido `activeHours` utiliza la resolución de zona horaria configurada.

## Relacionado

- [Automatización y tareas](/en/automation) — todos los mecanismos de automatización a un vistazo
- [Tareas en segundo plano](/en/automation/tasks) — libro mayor de tareas para ejecuciones de cron
- [Latido](/en/gateway/heartbeat) — turnos periódicos de sesión principal
- [Zona horaria](/en/concepts/timezone) — configuración de zona horaria
