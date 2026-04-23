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
openclaw cron show <job-id>

# See run history
openclaw cron runs --id <job-id>
```

## Cómo funciona cron

- Cron se ejecuta **dentro del proceso** del Gateway (no dentro del modelo).
- Las definiciones de trabajos persisten en `~/.openclaw/cron/jobs.json`, por lo que los reinicios no pierden las programaciones.
- El estado de ejecución en tiempo de ejecución persiste junto a él en `~/.openclaw/cron/jobs-state.json`. Si haces un seguimiento de las definiciones de cron en git, rastrea `jobs.json` y pon en gitignore `jobs-state.json`.
- Después de la división, las versiones anteriores de OpenClaw pueden leer `jobs.json` pero pueden tratar los trabajos como nuevos porque los campos de tiempo de ejecución ahora viven en `jobs-state.json`.
- Todas las ejecuciones de cron crean registros de [tarea en segundo plano](/es/automation/tasks).
- Los trabajos de un solo disparo (`--at`) se eliminan automáticamente después del éxito de forma predeterminada.
- Las ejecuciones de cron aisladas cierran con mejor esfuerzo las pestañas/procesos del navegador rastreados para su sesión `cron:<jobId>` cuando finaliza la ejecución, de modo que la automatización del navegador separada no deje procesos huérfanos.
- Las ejecuciones de cron aisladas también protegen contra respuestas de reconocimiento obsoletas. Si el primer resultado es solo una actualización de estado interina (`on it`, `recopilando todo`, y sugerencias similares) y ninguna ejecución de subagente descendente sigue siendo responsable de la respuesta final, OpenClaw vuelve a solicitar una vez el resultado real antes de la entrega.

<a id="maintenance"></a>

La conciliación de tareas para cron es propiedad del tiempo de ejecución: una tarea de cron activa permanece en vivo mientras el tiempo de ejecución de cron todavía rastrea ese trabajo como en ejecución, incluso si todavía existe una fila de sesión secundaria antigua. Una vez que el tiempo de ejecución deja de ser propietario del trabajo y expira el período de gracia de 5 minutos, el mantenimiento puede marcar la tarea como `lost`.

## Tipos de programación

| Tipo    | Marca CLI | Descripción                                                         |
| ------- | --------- | ------------------------------------------------------------------- |
| `at`    | `--at`    | Marca de tiempo de un solo disparo (ISO 8601 o relativa como `20m`) |
| `every` | `--every` | Intervalo fijo                                                      |
| `cron`  | `--cron`  | Expresión cron de 5 campos o 6 campos con `--tz` opcional           |

Las marcas de tiempo sin zona horaria se tratan como UTC. Agrega `--tz America/New_York` para la programación de reloj de pared local.

Las expresiones recurrentes de cada hora se escalonan automáticamente hasta 5 minutos para reducir picos de carga. Use `--exact` para forzar una sincronización precisa o `--stagger 30s` para una ventana explícita.

### Día del mes y día de la semana usan lógica OR

Las expresiones de cron son analizadas por [croner](https://github.com/Hexagon/croner). Cuando tanto el campo de día del mes como el de día de la semana no son comodines, croner coincide cuando **cualquiera** de los campos coincide, no ambos. Este es el comportamiento estándar de Vixie cron.

```
# Intended: "9 AM on the 15th, only if it's a Monday"
# Actual:   "9 AM on every 15th, AND 9 AM on every Monday"
0 9 15 * 1
```

Esto se dispara ~5–6 veces por mes en lugar de 0–1 veces por mes. OpenClaw usa el comportamiento OR predeterminado de Croner aquí. Para requerir ambas condiciones, use el modificador de día de la semana `+` de Croner (`0 9 15 * +1`) o programe en un campo y proteja el otro en el aviso o comando de su trabajo.

## Estilos de ejecución

| Estilo               | valor `--session`   | Se ejecuta en                       | Lo mejor para                                  |
| -------------------- | ------------------- | ----------------------------------- | ---------------------------------------------- |
| Sesión principal     | `main`              | Siguiente turno de latido           | Recordatorios, eventos del sistema             |
| Aislado              | `isolated`          | `cron:<jobId>` dedicado             | Informes, tareas en segundo plano              |
| Sesión actual        | `current`           | Vinculado en el momento de creación | Trabajo recurrente consciente del contexto     |
| Sesión personalizada | `session:custom-id` | Sesión con nombre persistente       | Flujos de trabajo que se basan en el historial |

Los trabajos de **Sesión principal** ponen en cola un evento del sistema y, opcionalmente, despiertan el latido (`--wake now` o `--wake next-heartbeat`). Los trabajos **Aislados** ejecutan un turno de agente dedicado con una sesión nueva. Las **Sesiones personalizadas** (`session:xxx`) mantienen el contexto entre ejecuciones, permitiendo flujos de trabajo como reuniones diarias que se basan en resúmenes anteriores.

Para los trabajos aislados, el desmontaje del tiempo de ejecución ahora incluye una limpieza del navegador de mejor esfuerzo para esa sesión de cron. Los fallos de limpieza se ignoran para que el resultado real del cron prevalezca.

Cuando las ejecuciones de cron aisladas orquestan subagentes, la entrega también prefiere la salida descendente final sobre el texto intermedio obsoleto del padre. Si los descendentes todavía se están ejecutando, OpenClaw suprime esa actualización parcial del padre en lugar de anunciarla.

### Opciones de carga útil para trabajos aislados

- `--message`: texto del aviso (requerido para aislado)
- `--model` / `--thinking`: anulaciones del modelo y nivel de pensamiento
- `--light-context`: omitir la inyección del archivo de arranque del espacio de trabajo
- `--tools exec,read`: restringir qué herramientas puede usar el trabajo

`--model` utiliza el modelo permitido seleccionado para ese trabajo. Si el modelo solicitado
no está permitido, cron registra una advertencia y recurre a la selección del
modelo predeterminado/agente del trabajo. Las cadenas de respaldo configuradas
siguen aplicándose, pero una anulación de modelo simple sin una lista de respaldo
explícita por trabajo ya no añade el agente principal como un objetivo de
reintento adicional oculto.

La precedencia de selección de modelo para trabajos aislados es:

1. Anulación del modelo del enlace de Gmail (cuando la ejecución proviene de Gmail y esa anulación está permitida)
2. Payload del trabajo `model`
3. Anulación del modelo de sesión de cron almacenada
4. Selección de modelo predeterminado/agente

El modo rápido también sigue la selección en vivo resuelta. Si la configuración
del modelo seleccionado tiene `params.fastMode`, cron aislado lo usa por defecto. Una anulación `fastMode` de sesión almacenada
todavía gana sobre la configuración en cualquier dirección.

Si una ejecución aislada alcanza un traspaso de cambio de modelo en vivo, cron
reintenta con el proveedor/modelo cambiado y persiste esa selección en vivo antes
de reintentar. Cuando el cambio también lleva un nuevo perfil de autenticación,
cron también persiste esa anulación de perfil de autenticación. Los reintentos
están limitados: después del intento inicial más 2 reintentos de cambio,
cron aborta en lugar de hacer un bucle infinito.

## Entrega y salida

| Modo       | Lo que sucede                                                         |
| ---------- | --------------------------------------------------------------------- |
| `announce` | Entrega de texto final al objetivo por respaldo si el agente no envió |
| `webhook`  | Enviar payload de evento terminado por POST a una URL                 |
| `none`     | Sin entrega de respaldo del ejecutor                                  |

Use `--announce --channel telegram --to "-1001234567890"` para la entrega al canal. Para temas de foro de Telegram, use `-1001234567890:topic:123`. Los objetivos de Slack/Discord/Mattermost deben usar prefijos explícitos (`channel:<id>`, `user:<id>`).

Para trabajos aislados, la entrega por chat es compartida. Si hay una ruta de chat disponible, el agente puede usar la herramienta `message` incluso cuando el trabajo usa `--no-deliver`. Si el agente envía al objetivo configurado/actual, OpenClaw omite el anuncio de respaldo. De lo contrario, `announce`, `webhook` y `none` solo controlan lo que el ejecutor hace con la respuesta final después del turno del agente.

Las notificaciones de error siguen una ruta de destino separada:

- `cron.failureDestination` establece un valor predeterminado global para las notificaciones de error.
- `job.delivery.failureDestination` anula eso por trabajo.
- Si no se establece ninguno y el trabajo ya entrega a través de `announce`, las notificaciones de error ahora recurren a ese objetivo de anuncio principal.
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

Gateway puede exponer endpoints de webhook HTTP para activadores externos. Habilite en la configuración:

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

Cada solicitud debe incluir el token del enlace a través del encabezado:

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

- `text` (requerido): descripción del evento
- `mode` (opcional): `now` (predeterminado) o `next-heartbeat`

### POST /hooks/agent

Ejecutar un turno de agente aislado:

```bash
curl -X POST http://127.0.0.1:18789/hooks/agent \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"message":"Summarize inbox","name":"Email","model":"openai/gpt-5.4-mini"}'
```

Campos: `message` (requerido), `name`, `agentId`, `wakeMode`, `deliver`, `channel`, `to`, `model`, `thinking`, `timeoutSeconds`.

### Enlaces mapeados (POST /hooks/\<name\>)

Los nombres de hook personalizados se resuelven mediante `hooks.mappings` en la configuración. Las asignaciones pueden transformar cargas útiles arbitrarias en acciones `wake` o `agent` con plantillas o transformaciones de código.

### Seguridad

- Mantenga los endpoints de hook detrás de loopback, tailnet o un proxy inverso de confianza.
- Use un token de hook dedicado; no reutilice los tokens de autenticación de la puerta de enlace.
- Mantenga `hooks.path` en una subruta dedicada; `/` es rechazado.
- Establezca `hooks.allowedAgentIds` para limitar el enrutamiento explícito de `agentId`.
- Mantenga `hooks.allowRequestSessionKey=false` a menos que requiera sesiones seleccionadas por el autor de la llamada.
- Si habilita `hooks.allowRequestSessionKey`, también establezca `hooks.allowedSessionKeyPrefixes` para restringir las formas permitidas de las claves de sesión.
- Las cargas útiles de hook se envuelven con límites de seguridad de forma predeterminada.

## Integración con Gmail PubSub

Conecte los disparadores de la bandeja de entrada de Gmail a OpenClaw a través de Google PubSub.

**Requisitos previos**: CLI de `gcloud`, `gog` (gogcli), hooks de OpenClaw habilitados, Tailscale para el endpoint HTTPS público.

### Configuración mediante asistente (recomendado)

```bash
openclaw webhooks gmail setup --account openclaw@gmail.com
```

Esto escribe la configuración `hooks.gmail`, habilita el preajuste de Gmail y usa Tailscale Funnel para el endpoint de inserción.

### Inicio automático de la puerta de enlace

Cuando `hooks.enabled=true` y `hooks.gmail.account` están configurados, la puerta de enlace inicia `gog gmail watch serve` al arrancar y renueva automáticamente la vigilancia. Configure `OPENCLAW_SKIP_GMAIL_WATCHER=1` para optar por no participar.

### Configuración manual única

1. Seleccione el proyecto de GCP que posee el cliente de OAuth utilizado por `gog`:

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

# Show one job, including resolved delivery route
openclaw cron show <jobId>

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
- Si el modelo está permitido, ese proveedor/modelo exacto llega a la ejecución
  del agente aislado.
- Si no está permitido, cron advierte y vuelve a la selección del modelo
  predeterminado/agente del trabajo.
- Las cadenas de respaldo configuradas todavía se aplican, pero una invalidación `--model` simple
  sin una lista de respaldo explícita por trabajo ya no pasa al principal
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

El sidecar del estado de ejecución se deriva de `cron.store`: un almacén `.json` tal como `~/clawd/cron/jobs.json` usa `~/clawd/cron/jobs-state.json`, mientras que una ruta de almacén sin el sufijo `.json` añade `-state.json`.

Deshabilitar cron: `cron.enabled: false` o `OPENCLAW_SKIP_CRON=1`.

**Reintentos de un solo disparo**: los errores transitorios (límite de velocidad, sobrecarga, red, error del servidor) se reintentan hasta 3 veces con retroceso exponencial. Los errores permanentes se deshabilitan inmediatamente.

**Reintentos recurrentes**: retroceso exponencial (30s a 60m) entre reintentos. El retroceso se restablece después de la siguiente ejecución exitosa.

**Mantenimiento**: `cron.sessionRetention` (por defecto `24h`) poda las entradas de sesión de ejecución aisladas. `cron.runLog.maxBytes` / `cron.runLog.keepLines` depuran automáticamente los archivos de registro de ejecución.

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
- `reason: not-due` en la salida de ejecución significa que se verificó una ejecución manual con `openclaw cron run <jobId> --due` y el trabajo aún no estaba programado.

### Cron se ejecutó pero no hubo entrega

- El modo de entrega `none` significa que no se espera un envío de respaldo del ejecutor. El agente aún puede enviar directamente con la herramienta `message` cuando hay una ruta de chat disponible.
- El destino de entrega faltante/no válido (`channel`/`to`) significa que se omitió la salida.
- Los errores de autenticación del canal (`unauthorized`, `Forbidden`) significan que la entrega fue bloqueada por las credenciales.
- Si la ejecución aislada devuelve solo el token silencioso (`NO_REPLY` / `no_reply`), OpenClaw suprime la entrega directa de salida y también suprime la ruta de resumen en cola de respaldo, por lo que no se publica nada de nuevo en el chat.
- Si el agente debe enviarle un mensaje al usuario, verifique que el trabajo tenga una ruta utilizable (`channel: "last"` con un chat anterior, o un canal/destino explícito).

### Advertencias de zona horaria

- Cron sin `--tz` usa la zona horaria del host de la puerta de enlace.
- Las programaciones `at` sin zona horaria se tratan como UTC.
- El latido `activeHours` usa la resolución de zona horaria configurada.

## Relacionado

- [Automatización y tareas](/es/automation) — todos los mecanismos de automatización de un vistazo
- [Tareas en segundo plano](/es/automation/tasks) — libro mayor de tareas para ejecuciones de cron
- [Latido](/es/gateway/heartbeat) — turnos periódicos de la sesión principal
- [Zona horaria](/es/concepts/timezone) — configuración de zona horaria
