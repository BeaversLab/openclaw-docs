---
summary: "Trabajos programados, webhooks y activadores PubSub de Gmail para el planificador del Gateway"
read_when:
  - Scheduling background jobs or wakeups
  - Wiring external triggers (webhooks, Gmail) into OpenClaw
  - Deciding between heartbeat and cron for scheduled tasks
title: "Tareas programadas"
sidebarTitle: "Tareas programadas"
---

Cron es el planificador integrado del Gateway. Persiste los trabajos, despierta al agente en el momento adecuado y puede devolver el resultado a un canal de chat o a un endpoint de webhook.

## Inicio rápido

<Steps>
  <Step title="Añadir un recordatorio de un solo uso">
    ```bash
    openclaw cron add \
      --name "Reminder" \
      --at "2026-02-01T16:00:00Z" \
      --session main \
      --system-event "Reminder: check the cron docs draft" \
      --wake now \
      --delete-after-run
    ```
  </Step>
  <Step title="Verificar sus trabajos">
    ```bash
    openclaw cron list
    openclaw cron show <job-id>
    ```
  </Step>
  <Step title="Ver historial de ejecuciones">
    ```bash
    openclaw cron runs --id <job-id>
    ```
  </Step>
</Steps>

## Cómo funciona cron

- Cron se ejecuta **dentro del proceso** del Gateway (no dentro del modelo).
- Las definiciones de trabajos persisten en `~/.openclaw/cron/jobs.json` por lo que los reinicios no pierden las programaciones.
- El estado de ejecución en tiempo de ejecución persiste junto a él en `~/.openclaw/cron/jobs-state.json`. Si rastrea las definiciones de cron en git, rastree `jobs.json` y agregue `jobs-state.json` a gitignore.
- Después de la división, las versiones anteriores de OpenClaw pueden leer `jobs.json` pero pueden tratar los trabajos como nuevos porque los campos de tiempo de ejecución ahora viven en `jobs-state.json`.
- Cuando se edita `jobs.json` mientras el Gateway está en ejecución o detenido, OpenClaw compara los campos de programación modificados con los metadatos de la ranura de tiempo de ejecución pendiente y borra los valores obsoletos de `nextRunAtMs`. Las reescrituras de formato puro o solo de orden de claves preservan la ranura pendiente.
- Todas las ejecuciones de cron crean registros de [tareas en segundo plano](/es/automation/tasks).
- Los trabajos de un solo uso (`--at`) se eliminan automáticamente después del éxito de forma predeterminada.
- Las ejecuciones aisladas de cron cierran con el mayor esfuerzo posible las pestañas/procesos del navegador rastreados para su sesión `cron:<jobId>` cuando se completa la ejecución, de modo que la automatización del navegador desvinculada no deje procesos huérfanos.
- Las ejecuciones aisladas de cron también protegen contra las respuestas de reconocimiento obsoletas. Si el primer resultado es solo una actualización de estado intermedia (`on it`, `pulling everything together` e indicaciones similares) y ninguna ejecución de subagente descendente sigue siendo responsable de la respuesta final, OpenClaw vuelve a solicitar una vez el resultado real antes de la entrega.
- Las ejecuciones aisladas de cron prefieren metadatos estructurados de denegación de ejecución de la ejecución integrada y, posteriormente, recurren a marcadores de resumen/salida finales conocidos como `SYSTEM_RUN_DENIED` y `INVALID_REQUEST`, de modo que un comando bloqueado no se informe como una ejecución correcta (en verde).
- Las ejecuciones aisladas de cron también tratan los errores del agente a nivel de ejecución como errores del trabajo incluso cuando no se produce ninguna carga útil de respuesta, por lo que los fallos del modelo/proveedor incrementan los contadores de errores y activan notificaciones de fallo en lugar de marcar el trabajo como exitoso.

<a id="maintenance"></a>

<Note>
La conciliación de tareas para cron es propiedad首先 del tiempo de ejecución y respaldada por el historial duradero en segundo lugar: una tarea de cron activa permanece activa mientras el tiempo de ejecución de cron todavía rastrea ese trabajo como en ejecución, incluso si todavía existe una fila antigua de sesión secundaria. Una vez que el tiempo de ejecución deja de ser propietario del trabajo y expira la ventana de gracia de 5 minutos, el mantenimiento verifica los registros de ejecución persistidos y el estado del trabajo para la ejecución coincidente `cron:<jobId>:<startedAt>`. Si ese historial duradero muestra un resultado terminal, el libro mayor de tareas se finaliza a partir de él; de lo contrario, el mantenimiento propiedad de Gateway puede marcar la tarea como `lost`. La auditoría de CLI sin conexión puede recuperarse del historial duradero, pero no trata su propio conjunto vacío de trabajos activos en proceso como una prueba de que una ejecución de cron propiedad de Gateway ha desaparecido.
</Note>

## Tipos de programación

| Tipo    | Opción de CLI | Descripción                                                         |
| ------- | ------------- | ------------------------------------------------------------------- |
| `at`    | `--at`        | Marca de tiempo de un solo disparo (ISO 8601 o relativa como `20m`) |
| `every` | `--every`     | Intervalo fijo                                                      |
| `cron`  | `--cron`      | Expresión cron de 5 o 6 campos con `--tz` opcional                  |

Las marcas de tiempo sin zona horaria se tratan como UTC. Agregue `--tz America/New_York` para la programación local de reloj de pared.

Las expresiones recurrentes de inicio de hora se escalonan automáticamente hasta 5 minutos para reducir picos de carga. Use `--exact` para forzar una sincronización precisa o `--stagger 30s` para una ventana explícita.

### El día del mes y el día de la semana usan lógica OR

Las expresiones cron se analizan mediante [croner](https://github.com/Hexagon/croner). Cuando tanto el campo día-del-mes como el campo día-de-la-semana no son comodines, croner coincide cuando **cualquiera** de los campos coincide, no ambos. Este es el comportamiento estándar de Vixie cron.

```
# Intended: "9 AM on the 15th, only if it's a Monday"
# Actual:   "9 AM on every 15th, AND 9 AM on every Monday"
0 9 15 * 1
```

Esto se dispara ~5-6 veces por mes en lugar de 0-1 veces por mes. OpenClaw utiliza el comportamiento OR predeterminado de Croner aquí. Para requerir ambas condiciones, use el modificador día-de-la-semana de Croner `+` (`0 9 15 * +1`) o programe en un campo y proteja el otro en el mensaje o comando de su trabajo.

## Estilos de ejecución

| Estilo               | valor `--session`   | Se ejecuta en                       | Lo mejor para                                  |
| -------------------- | ------------------- | ----------------------------------- | ---------------------------------------------- |
| Sesión principal     | `main`              | Siguiente turno de latido           | Recordatorios, eventos del sistema             |
| Aislado              | `isolated`          | `cron:<jobId>` dedicado             | Informes, tareas de fondo                      |
| Sesión actual        | `current`           | Vinculado en el momento de creación | Trabajo recurrente con contexto                |
| Sesión personalizada | `session:custom-id` | Sesión con nombre persistente       | Flujos de trabajo que se basan en el historial |

<AccordionGroup>
  <Accordion title="Sesión principal frente a aislada frente a personalizada">
    Los trabajos de **Sesión principal** ponen en cola un evento del sistema y opcionalmente despiertan el latido (`--wake now` o `--wake next-heartbeat`). Esos eventos del sistema no extienden la frescura de restablecimiento diario/inactivo para la sesión de destino. Los trabajos **Aislados** ejecutan un turno de agente dedicado con una sesión nueva. Las **Sesiones personalizadas** (`session:xxx`) mantienen el contexto entre ejecuciones, permitiendo flujos de trabajo como reuniones diarias que se basan en resúmenes anteriores.
  </Accordion>
  <Accordion title="Qué significa "sesión nueva" para trabajos aislados">
    Para trabajos aislados, "sesión nueva" significa un nuevo id de transcripción/sesión para cada ejecución. OpenClaw puede llevar preferencias seguras como la configuración de pensamiento/rápido/verboso, etiquetas y anulaciones explícitas de modelo/autenticación seleccionadas por el usuario, pero no hereda el contexto de conversación ambiente de una fila cron antigua: enrutamiento de canal/grupo, política de envío o cola, elevación, origen o enlace de tiempo de ejecución de ACP. Use `current` o `session:<id>` cuando un trabajo recurrente debe construirse deliberadamente sobre el mismo contexto de conversación.
  </Accordion>
  <Accordion title="Limpieza de tiempo de ejecución">
    Para trabajos aislados, el desmontaje del tiempo de ejecución ahora incluye la limpieza del navegador de mejor esfuerzo para esa sesión cron. Los fallos de limpieza se ignoran para que el resultado cron real aún tenga prioridad.

    Las ejecuciones cron aisladas también eliminan cualquier instancia de tiempo de ejecución de MCP agrupada creada para el trabajo a través de la ruta compartida de limpieza de tiempo de ejecución. Esto coincide con cómo se desmantelan los clientes MCP de sesión principal y sesión personalizada, por lo que los trabajos cron aislados no filtran procesos secundarios stdio ni conexiones MCP de larga duración entre ejecuciones.

  </Accordion>
  <Accordion title="Subagente y entrega en Discord">
    Cuando las ejecuciones cron aisladas orquestan subagentes, la entrega también prefiere la salida del descendiente final sobre el texto interino principal obsoleto. Si los descendentes aún se están ejecutando, OpenClaw suprime esa actualización parcial principal en lugar de anunciarla.

    Para objetivos de anuncio de Discord solo de texto, OpenClaw envía el texto final canónico del asistente una vez en lugar de reproducir tanto las cargas útiles de texto transmitidas/intermedias como la respuesta final. Los medios y las cargas útiles estructuradas de Discord aún se entregan como cargas útiles separadas para que no se pierdan los archivos adjuntos y los componentes.

  </Accordion>
</AccordionGroup>

### Opciones de carga útil para trabajos aislados

<ParamField path="--message" type="string" required>
  Texto del prompt (requerido para trabajos aislados).
</ParamField>
<ParamField path="--model" type="string">
  Sobrescritura del modelo; usa el modelo permitido seleccionado para el trabajo.
</ParamField>
<ParamField path="--thinking" type="string">
  Sobrescritura del nivel de pensamiento.
</ParamField>
<ParamField path="--light-context" type="boolean">
  Omitir la inyección del archivo de inicio del espacio de trabajo.
</ParamField>
<ParamField path="--tools" type="string">
  Restringir qué herramientas puede usar el trabajo, por ejemplo `--tools exec,read`.
</ParamField>

`--model` usa el modelo permitido seleccionado para ese trabajo. Si el modelo solicitado no está permitido, cron registra una advertencia y vuelve a la selección del modelo del agente/predeterminado del trabajo. Las cadenas de reserva configuradas todavía se aplican, pero una sobrescritura de modelo simple sin una lista de reserva explícita por trabajo ya no añade el agente principal como un objetivo de reintento extra oculto.

La precedencia de selección del modelo para trabajos aislados es:

1. Sobrescritura del modelo del enlace de Gmail (cuando la ejecución proviene de Gmail y esa sobrescritura está permitida)
2. Sobrescritura del modelo en el payload por trabajo `model`
3. Sobrescritura del modelo de sesión cron almacenada seleccionada por el usuario
4. Selección del modelo de agente/predeterminado

El modo rápido también sigue la selección en vivo resuelta. Si la configuración del modelo seleccionado tiene `params.fastMode`, el cron aislado usa eso por defecto. Una sobrescritura de sesión almacenada `fastMode` todavía gana a la configuración en cualquier dirección.

Si una ejecución aislada alcanza un traspaso de cambio de modelo en vivo, cron vuelve a intentar con el proveedor/modelo cambiado y persiste esa selección en vivo para la ejecución activa antes de reintentar. Cuando el cambio también lleva un nuevo perfil de autenticación, cron también persiste esa sobrescritura del perfil de autenticación para la ejecución activa. Los reintentos están limitados: después del intento inicial más 2 reintentos de cambio, cron aborta en lugar de entrar en bucle para siempre.

## Entrega y salida

| Modo       | Lo que sucede                                                           |
| ---------- | ----------------------------------------------------------------------- |
| `announce` | Entrega de reserva del texto final al objetivo si el agente no lo envió |
| `webhook`  | Enviar mediante POST el payload del evento finalizado a una URL         |
| `none`     | Sin entrega de reserva del ejecutor                                     |

Use `--announce --channel telegram --to "-1001234567890"` para la entrega al canal. Para los temas del foro de Telegram, use `-1001234567890:topic:123`. Los destinos de Slack/Discord/Mattermost deben usar prefijos explícitos (`channel:<id>`, `user:<id>`). Los IDs de las salas de Matrix distinguen entre mayúsculas y minúsculas; use el ID de la sala exacto o la forma `room:!room:server` de Matrix.

Para los trabajos aislados, la entrega al chat es compartida. Si hay una ruta de chat disponible, el agente puede usar la herramienta `message` incluso cuando el trabajo usa `--no-deliver`. Si el agente envía al destino configurado/actual, OpenClaw omite el anuncio de respaldo. De lo contrario, `announce`, `webhook` y `none` solo controlan lo que el ejecutor hace con la respuesta final después del turno del agente.

Cuando un agente crea un recordatorio aislado desde un chat activo, OpenClaw almacena el destino de entrega en vivo preservado para la ruta de anuncio de respaldo. Las claves de sesión interna pueden estar en minúsculas; los destinos de entrega del proveedor no se reconstruyen a partir de esas claves cuando el contexto de chat actual está disponible.

Las notificaciones de error siguen una ruta de destino separada:

- `cron.failureDestination` establece un valor predeterminado global para las notificaciones de error.
- `job.delivery.failureDestination` anula eso por trabajo.
- Si no se establece ninguno y el trabajo ya se entrega a través de `announce`, las notificaciones de error ahora recurren a ese destino de anuncio principal.
- `delivery.failureDestination` solo es compatible con trabajos `sessionTarget="isolated"` a menos que el modo de entrega principal sea `webhook`.
- `failureAlert.includeSkipped: true` opta por un trabajo o una política de alerta cron global para recibir alertas repetidas de ejecuciones omitidas. Las ejecuciones omitidas mantienen un contador consecutivo de omisiones separado, por lo que no afectan la retirada por error de ejecución.

## Ejemplos de CLI

<Tabs>
  <Tab title="Recordatorio único">```bash openclaw cron add \ --name "Calendar check" \ --at "20m" \ --session main \ --system-event "Next heartbeat: check calendar." \ --wake now ```</Tab>
  <Tab title="Trabajo aislado recurrente">```bash openclaw cron add \ --name "Morning brief" \ --cron "0 7 * * *" \ --tz "America/Los_Angeles" \ --session isolated \ --message "Summarize overnight updates." \ --announce \ --channel slack \ --to "channel:C1234567890" ```</Tab>
  <Tab title="Modelo y anulación de pensamiento">```bash openclaw cron add \ --name "Deep analysis" \ --cron "0 6 * * 1" \ --tz "America/Los_Angeles" \ --session isolated \ --message "Weekly deep analysis of project progress." \ --model "opus" \ --thinking high \ --announce ```</Tab>
</Tabs>

## Webhooks

Gateway puede exponer endpoints de webhook HTTP para disparadores externos. Activar en la configuración:

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

Cada solicitud debe incluir el token de hook a través del encabezado:

- `Authorization: Bearer <token>` (recomendado)
- `x-openclaw-token: <token>`

Los tokens de cadena de consulta son rechazados.

<AccordionGroup>
  <Accordion title="POST /hooks/wake">
    Poner en cola un evento del sistema para la sesión principal:

    ```bash
    curl -X POST http://127.0.0.1:18789/hooks/wake \
      -H 'Authorization: Bearer SECRET' \
      -H 'Content-Type: application/json' \
      -d '{"text":"New email received","mode":"now"}'
    ```

    <ParamField path="text" type="string" required>
      Descripción del evento.
    </ParamField>
    <ParamField path="mode" type="string" default="now">
      `now` o `next-heartbeat`.
    </ParamField>

  </Accordion>
  <Accordion title="POST /hooks/agent">
    Ejecutar un turno de agente aislado:

    ```bash
    curl -X POST http://127.0.0.1:18789/hooks/agent \
      -H 'Authorization: Bearer SECRET' \
      -H 'Content-Type: application/json' \
      -d '{"message":"Summarize inbox","name":"Email","model":"openai/gpt-5.4"}'
    ```

    Campos: `message` (obligatorio), `name`, `agentId`, `wakeMode`, `deliver`, `channel`, `to`, `model`, `thinking`, `timeoutSeconds`.

  </Accordion>
  <Accordion title="Mapped hooks (POST /hooks/<name>)">
    Los nombres de hook personalizados se resuelven mediante `hooks.mappings` en la configuración. Las asignaciones pueden transformar cargas útiles arbitrarias en acciones `wake` o `agent` con plantillas o transformaciones de código.
  </Accordion>
</AccordionGroup>

<Warning>
Mantenga los endpoints de los hooks detrás de un loopback, tailnet o un proxy inverso de confianza.

- Utilice un token de hook dedicado; no reutilice los tokens de autenticación de la puerta de enlace.
- Mantenga `hooks.path` en una subruta dedicada; `/` se rechaza.
- Establezca `hooks.allowedAgentIds` para limitar el enrutamiento explícito de `agentId`.
- Mantenga `hooks.allowRequestSessionKey=false` a menos que requiera sesiones seleccionadas por el llamador.
- Si habilita `hooks.allowRequestSessionKey`, también establezca `hooks.allowedSessionKeyPrefixes` para restringir las formas permitidas de las claves de sesión.
- Las cargas útiles de los hooks se envuelven con límites de seguridad de forma predeterminada.
  </Warning>

## Integración con Gmail PubSub

Conecte los disparadores de la bandeja de entrada de Gmail a OpenClaw a través de Google PubSub.

<Note>**Requisitos previos:** CLI de `gcloud`, `gog` (gogcli), hooks de OpenClaw habilitados, Tailscale para el endpoint HTTPS público.</Note>

### Configuración mediante asistente (recomendado)

```bash
openclaw webhooks gmail setup --account openclaw@gmail.com
```

Esto escribe la configuración de `hooks.gmail`, habilita el preset de Gmail y utiliza Tailscale Funnel para el endpoint de inserción.

### Inicio automático de la puerta de enlace

Cuando `hooks.enabled=true` y `hooks.gmail.account` están establecidos, la puerta de enlace inicia `gog gmail watch serve` en el arranque y renueva automáticamente la vigilancia. Establezca `OPENCLAW_SKIP_GMAIL_WATCHER=1` para no participar.

### Configuración manual única

<Steps>
  <Step title="Seleccione el proyecto de GCP">
    Seleccione el proyecto de GCP que posee el cliente OAuth utilizado por `gog`:

    ```bash
    gcloud auth login
    gcloud config set project <project-id>
    gcloud services enable gmail.googleapis.com pubsub.googleapis.com
    ```

  </Step>
  <Step title="Crear tema y otorgar acceso de inserción de Gmail">
    ```bash
    gcloud pubsub topics create gog-gmail-watch
    gcloud pubsub topics add-iam-policy-binding gog-gmail-watch \
      --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
      --role=roles/pubsub.publisher
    ```
  </Step>
  <Step title="Iniciar la vigilancia">
    ```bash
    gog gmail watch start \
      --account openclaw@gmail.com \
      --label INBOX \
      --topic projects/<project-id>/topics/gog-gmail-watch
    ```
  </Step>
</Steps>

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

<Note>
Nota de anulación del modelo:

- `openclaw cron add|edit --model ...` cambia el modelo seleccionado del trabajo.
- Si el modelo está permitido, ese proveedor/modelo exacto llega a la ejecución del agente aislado.
- Si no está permitido, cron avisa y vuelve a la selección del modelo predeterminado/agente del trabajo.
- Las cadenas de retroceso configuradas todavía se aplican, pero una anulación simple `--model` sin una lista de retroceso explícita por trabajo ya no pasa al agente principal como un objetivo de reintento adicional silencioso.
  </Note>

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

`maxConcurrentRuns` limita tanto el envío programado de cron como la ejecución de turnos de agente aislados. Los turnos de agente de cron aislados usan internamente el carril de ejecución dedicado `cron-nested` de la cola, por lo que aumentar este valor permite que las ejecuciones independientes de LLM de cron progresen en paralelo en lugar de solo iniciar sus envoltorios externos de cron. El carril compartido no cron `nested` no se amplía con esta configuración.

El sidecar del estado de tiempo de ejecución se deriva de `cron.store`: un almacén `.json` tal como `~/clawd/cron/jobs.json` usa `~/clawd/cron/jobs-state.json`, mientras que una ruta de almacén sin un sufijo `.json` añade `-state.json`.

Si edita manualmente `jobs.json`, deje `jobs-state.json` fuera del control de código fuente. OpenClaw usa ese sidecar para las ranuras pendientes, los marcadores activos, los metadatos de la última ejecución y la identidad de la programación que le dice al planificador cuándo un trabajo editado externamente necesita un `nextRunAtMs` nuevo.

Desactivar cron: `cron.enabled: false` o `OPENCLAW_SKIP_CRON=1`.

<AccordionGroup>
  <Accordion title="Comportamiento de reintento">
    **Reintento de un solo disparo**: los errores transitorios (límite de velocidad, sobrecarga, red, error del servidor) se reintentan hasta 3 veces con retroceso exponencial. Los errores permanentes se desactivan inmediatamente.

    **Reintento recurrente**: retroceso exponencial (30s a 60m) entre reintentos. El retroceso se restablece después de la siguiente ejecución exitosa.

  </Accordion>
  <Accordion title="Mantenimiento">
    `cron.sessionRetention` (por defecto `24h`) poda las entradas aisladas de sesión de ejecución. `cron.runLog.maxBytes` / `cron.runLog.keepLines` podan automáticamente los archivos de registro de ejecución.
  </Accordion>
</AccordionGroup>

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

<AccordionGroup>
  <Accordion title="Cron no se ejecuta">
    - Verifique las variables de entorno `cron.enabled` y `OPENCLAW_SKIP_CRON`.
    - Confirme que el Gateway se está ejecutando continuamente.
    - Para las programaciones `cron`, verifique la zona horaria (`--tz`) frente a la zona horaria del host.
    - `reason: not-due` en la salida de ejecución significa que se verificó una ejecución manual con `openclaw cron run <jobId> --due` y el trabajo aún no debía ejecutarse.
  </Accordion>
  <Accordion title="Cron se ejecutó pero no hubo entrega">
    - El modo de entrega `none` significa que no se espera un envío de respaldo del ejecutor. El agente aún puede enviar directamente con la herramienta `message` cuando hay una ruta de chat disponible.
    - El destino de entrega faltante/inválido (`channel`/`to`) significa que se omitió el envío saliente.
    - Para Matrix, los trabajos copiados o heredados con IDs de sala `delivery.to` en minúsculas pueden fallar porque los IDs de sala de Matrix distinguen entre mayúsculas y minúsculas. Edite el trabajo con el valor exacto `!room:server` o `room:!room:server` de Matrix.
    - Los errores de autenticación del canal (`unauthorized`, `Forbidden`) significan que la entrega fue bloqueada por las credenciales.
    - Si la ejecución aislada devuelve solo el token silencioso (`NO_REPLY` / `no_reply`), OpenClaw suprime la entrega saliente directa y también suprime la ruta de resumen en cola de respaldo, por lo que no se publica nada de vuelta en el chat.
    - Si el agente debe enviarle un mensaje al usuario, verifique que el trabajo tenga una ruta utilizable (`channel: "last"` con un chat anterior, o un canal/destino explícito).
  </Accordion>
  <Accordion title="Cron o heartbeat parece prevenir el cambio a /new-style">
    - La frescura del restablecimiento diario e inactivo no se basa en `updatedAt`; consulte [Gestión de sesiones](/es/concepts/session#session-lifecycle).
    - Los despertares de cron, ejecuciones de heartbeat, notificaciones de exec y tareas de contabilidad del gateway pueden actualizar la fila de sesión para el enrutamiento/estado, pero no extienden `sessionStartedAt` ni `lastInteractionAt`.
    - Para las filas heredadas creadas antes de que existieran esos campos, OpenClaw puede recuperar `sessionStartedAt` del encabezado de sesión JSONL de la transcripción cuando el archivo aún está disponible. Las filas inactivas heredadas sin `lastInteractionAt` utilizan esa hora de inicio recuperada como su línea base inactiva.
  </Accordion>
  <Accordion title="Problemas de zona horaria">
    - Cron sin `--tz` utiliza la zona horaria del host de la puerta de enlace.
    - Los programas `at` sin zona horaria se tratan como UTC.
    - El `activeHours` del heartbeat utiliza la resolución de zona horaria configurada.
  </Accordion>
</AccordionGroup>

## Relacionado

- [Automatización y tareas](/es/automation) — todos los mecanismos de automatización a un vistazo
- [Tareas en segundo plano](/es/automation/tasks) — libro mayor de tareas para ejecuciones de cron
- [Heartbeat](/es/gateway/heartbeat) — turnos periódicos de la sesión principal
- [Zona horaria](/es/concepts/timezone) — configuración de zona horaria
