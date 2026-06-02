---
summary: "Trabajos programados, webhooks y activadores PubSub de Gmail para el programador de Gateway"
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
    openclaw cron create "2026-02-01T16:00:00Z" \
      --name "Reminder" \
      --session main \
      --system-event "Reminder: check the cron docs draft" \
      --wake now \
      --delete-after-run
    ```
  </Step>
  <Step title="Verificar tus trabajos">
    ```bash
    openclaw cron list
    openclaw cron get <job-id>
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
- Las definiciones de trabajos, el estado de ejecución y el historial de ejecuciones se guardan en la base de datos de estado compartido SQLite de OpenClaw, por lo que los reinicios no pierden las programaciones.
- Al actualizar, los archivos heredados `~/.openclaw/cron/jobs.json`, `jobs-state.json` y `runs/*.jsonl` se importan una vez y se renombran con un sufijo `.migrated`. Las filas de trabajos con formato incorrecto se omiten del tiempo de ejecución y se copian en `jobs-quarantine.json` para su reparación o revisión posterior.
- `cron.store` todavía nombra la clave lógica del almacenamiento cron y la ruta de importación heredada. Después de la importación, editar ese archivo JSON ya no cambia los trabajos cron activos; use `openclaw cron add|edit|remove` o los métodos RPC cron de Gateway en su lugar.
- Todas las ejecuciones cron crean registros de [tarea en segundo plano](/es/automation/tasks).
- Al iniciar Gateway, los trabajos aislados de turno del agente vencidos se reprograman fuera de la ventana de conexión del canal en lugar de reproducirse inmediatamente, para que el inicio de Discord/Telegram y la configuración de comandos nativos permanezcan receptivos después de los reinicios.
- Los trabajos de un solo disparo (`--at`) se eliminan automáticamente después del éxito de forma predeterminada.
- Las ejecuciones cron aisladas cierran con el mayor esfuerzo posible las pestañas/procesos del navegador rastreados para su sesión `cron:<jobId>` cuando finaliza la ejecución, de modo que la automatización del navegador separada no deje procesos huérfanos.
- Las ejecuciones cron aisladas que reciben la concesión estrecha de autolimpieza cron todavía pueden leer el estado del programador, una lista autofiltrada de su trabajo actual y el historial de ejecuciones de ese trabajo, para que las comprobaciones de estado/latido puedan inspeccionar su propia programación sin obtener acceso de mutación cron más amplio.
- Las ejecuciones cron aisladas también protegen contra respuestas de reconocimiento obsoletas. Si el primer resultado es solo una actualización de estado interina (`on it`, `pulling everything together` e indicaciones similares) y ninguna ejecución de subagente descendente sigue siendo responsable de la respuesta final, OpenClaw vuelve a solicitar una vez el resultado real antes de la entrega.
- Las ejecuciones cron aisladas utilizan metadatos estructurados de denegación de ejecución de la ejecución incrustada, incluyendo los contenedores de `UNAVAILABLE` cuyo mensaje de error anidado comienza con `SYSTEM_RUN_DENIED` o `INVALID_REQUEST`, de modo que un comando bloqueado no se reporte como una ejecución exitosa, mientras que la prosa ordinaria del asistente no se trata como una denegación.
- Las ejecuciones cron aisladas también tratan los fallos del agente a nivel de ejecución como errores del trabajo incluso cuando no se produce ninguna carga útil de respuesta, por lo que los fallos del modelo/proveedor incrementan los contadores de errores y activan notificaciones de fallo en lugar de marcar el trabajo como exitoso.
- Cuando un trabajo de turno de agente aislado alcanza `timeoutSeconds`, cron aborta la ejecución del agente subyacente y le da una breve ventana de limpieza. Si la ejecución no se drena, la limpieza propiedad de Gateway fuerza la liberación de la propiedad de la sesión de esa ejecución antes de que cron registre el tiempo de espera, para que el trabajo de chat en cola no quede rezagado tras una sesión de procesamiento obsoleta.
- Si un turno de agente aislado se detiene antes de que se inicie el ejecutor o antes de la primera llamada al modelo, cron registra un tiempo de espera específico de la fase, como `setup timed out before runner start` o `stalled before first model call (last phase: context-engine)`. Estos perros guardianes cubren a los proveedores incrustados y a los proveedores respaldados por CLI antes de que se inicie realmente su proceso CLI externo, y están limitados independientemente de los valores largos de `timeoutSeconds`, de modo que los fallos de inicio en frío/autenticación/contexto se manifiesten rápidamente en lugar de esperar el presupuesto completo del trabajo.
- Si utiliza el cron del sistema u otro programador externo para ejecutar `openclaw agent`, envuélvalo con una escalada de finalización forzada (hard-kill) aunque la CLI maneja `SIGTERM`/`SIGINT`. Las ejecuciones respaldadas por el Gateway solicitan al Gateway que aborte las ejecuciones aceptadas; las ejecuciones de respaldo locales e integradas reciben la misma señal de aborto. Para GNU `timeout`, prefiera `timeout -k 60 600 openclaw agent ...` en lugar de `timeout 600 ...` plano; el valor `-k` es el red de seguridad del supervisor si el proceso no puede drenarse. Para las unidades systemd, mantenga la misma forma usando una señal de detención `SIGTERM` más una ventana de gracia como `TimeoutStopSec` antes de cualquier eliminación final. Si un reintento reutiliza un `--run-id` mientras la ejecución original del Gateway aún está activa, el duplicado se reporta como en vuelo en lugar de iniciar una segunda ejecución.

<a id="maintenance"></a>

<Note>
La conciliación de tareas para cron es propiedad primero del tiempo de ejecución y respaldada por el historial duradero en segundo lugar: una tarea cron activa permanece viva mientras el tiempo de ejecución de cron todavía rastrea ese trabajo como en ejecución, incluso si aún existe una fila antigua de sesión secundaria. Una vez que el tiempo de ejecución deja de ser propietario del trabajo y expira la ventana de gracia de 5 minutos, el mantenimiento verifica los registros de ejecución persistidos y el estado del trabajo para la ejecución `cron:<jobId>:<startedAt>` coincidente. Si ese historial duradero muestra un resultado terminal, el libro mayor de tareas se finaliza a partir de él; de lo contrario, el mantenimiento propiedad del Gateway puede marcar la tarea como `lost`. La auditoría de la CLI sin conexión puede recuperarse del historial duradero, pero no trata su propio conjunto vacío de trabajos activos en proceso como prueba de que una ejecución de cron propiedad del Gateway ha desaparecido.
</Note>

## Tipos de programación

| Tipo    | Opción de CLI | Descripción                                                         |
| ------- | ------------- | ------------------------------------------------------------------- |
| `at`    | `--at`        | Marca de tiempo de un solo disparo (ISO 8601 o relativa como `20m`) |
| `every` | `--every`     | Intervalo fijo                                                      |
| `cron`  | `--cron`      | Expresión cron de 5 o 6 campos con `--tz` opcional                  |

Las marcas de tiempo sin zona horaria se tratan como UTC. Agregue `--tz America/New_York` para la programación local de reloj de pared.

Las expresiones recurrentes de cada hora se escalonan automáticamente hasta 5 minutos para reducir los picos de carga. Use `--exact` para forzar una sincronización precisa o `--stagger 30s` para una ventana explícita.

### El día del mes y el día de la semana usan lógica OR

Las expresiones cron se analizan mediante [croner](https://github.com/Hexagon/croner). Cuando tanto el campo día del mes como el campo día de la semana no son comodines, croner coincide cuando **alguno** de los campos coincide, no ambos. Este es el comportamiento estándar de Vixie cron.

```
# Intended: "9 AM on the 15th, only if it's a Monday"
# Actual:   "9 AM on every 15th, AND 9 AM on every Monday"
0 9 15 * 1
```

Esto se dispara aproximadamente de 5 a 6 veces por mes en lugar de 0 a 1 veces por mes. OpenClaw utiliza el comportamiento OR predeterminado de Croner aquí. Para requerir ambas condiciones, use el modificador de día de la semana `+` de Croner (`0 9 15 * +1`) o programe en un campo y proteja el otro en el aviso o comando de su trabajo.

## Estilos de ejecución

| Estilo               | valor `--session`   | Se ejecuta en                       | Mejor para                                     |
| -------------------- | ------------------- | ----------------------------------- | ---------------------------------------------- |
| Sesión principal     | `main`              | Carril de activación cron dedicado  | Recordatorios, eventos del sistema             |
| Aislado              | `isolated`          | `cron:<jobId>` dedicado             | Informes, tareas de fondo                      |
| Sesión actual        | `current`           | Vinculado en el momento de creación | Trabajo recurrente consciente del contexto     |
| Sesión personalizada | `session:custom-id` | Sesión nombrada persistente         | Flujos de trabajo que se basan en el historial |

<AccordionGroup>
  <Accordion title="Sesión principal vs aislada vs personalizada">
    Los trabajos de **Sesión principal** ponen en cola un evento del sistema en un carril de ejecución propiedad de cron y, opcionalmente, despiertan el heartbeat (`--wake now` o `--wake next-heartbeat`). Pueden utilizar el contexto de última entrega de la sesión principal de destino para las respuestas, pero no añaden turnos de cron rutinarios al carril de chat humano ni extienden la frescura de reinicio diario/inactivo para la sesión de destino. Los trabajos **Aislados** ejecutan un turno dedicado del agente con una sesión nueva. Las **Sesiones personalizadas** (`session:xxx`) persisten el contexto entre ejecuciones, permitiendo flujos de trabajo como reuniones diarias de estado que se basan en resúmenes anteriores.

    Los eventos cron de sesión principal son recordatorios de eventos del sistema autocontenidos. No incluyen automáticamente la instrucción "Leer HEARTBEAT.md" del prompt de heartbeat predeterminado. Si un recordatorio recurrente debe consultar `HEARTBEAT.md`, indíquelo explícitamente en el texto del evento cron o en las propias instrucciones del agente.

  </Accordion>
  <Accordion title="Qué significa 'sesión nueva' para los trabajos aislados">
    Para los trabajos aislados, "sesión nueva" significa una nueva transcripción/id de sesión para cada ejecución. OpenClaw puede transportar preferencias seguras como la configuración de pensamiento/rápido/verboso, etiquetas y anulaciones explícitas de modelo/autenticación seleccionadas por el usuario, pero no hereda el contexto de conversación ambiental de una fila de cron más antigua: enrutamiento de canal/grupo, política de envío o cola, elevación, origen o enlace de tiempo de ejecución de ACP. Use `current` o `session:<id>` cuando un trabajo recurrente deba deliberadamente basarse en el mismo contexto de conversación.
  </Accordion>
  <Accordion title="Limpieza en tiempo de ejecución">
    Para los trabajos aislados, el desmontaje en tiempo de ejecución ahora incluye la limpieza del navegador de mejor esfuerzo para esa sesión de cron. Los fallos de limpieza se ignoran para que el resultado real del cron prevalezca.

    Las ejecuciones de cron aisladas también eliminan cualquier instancia de tiempo de ejecución de MCP empaquetada creada para el trabajo a través de la ruta compartida de limpieza de tiempo de ejecución. Esto coincide con la forma en que se desmantelan los clientes MCP de sesión principal y sesión personalizada, por lo que los trabajos de cron aislados no filtran procesos secundarios stdio ni conexiones MCP de larga duración entre ejecuciones.

  </Accordion>
  <Accordion title="Subagent and Discord delivery">
    Cuando las ejecuciones aisladas de cron orquestan subagentes, la entrega también prefiere el resultado final del descendente sobre el texto interino del padre obsoleto. Si los descendentes aún se están ejecutando, OpenClaw suprime esa actualización parcial del padre en lugar de anunciarla.

    Para destinos de anuncio de Discord de solo texto, OpenClaw envía el texto canónico final del asistente una vez en lugar de reproducir tanto las cargas útiles de texto transmitidas/intermedias como la respuesta final. Los medios y las cargas útiles estructuradas de Discord aún se entregan como cargas útiles separadas para que no se pierdan los archivos adjuntos y los componentes.

  </Accordion>
</AccordionGroup>

### Opciones de carga útil para trabajos aislados

<ParamField path="--message" type="string" required>
  Texto del prompt (requerido para trabajos aislados).
</ParamField>
<ParamField path="--model" type="string">
  Anulación de modelo; usa el modelo permitido seleccionado para el trabajo.
</ParamField>
<ParamField path="--thinking" type="string">
  Anulación del nivel de pensamiento.
</ParamField>
<ParamField path="--light-context" type="boolean">
  Omitir la inyección del archivo de arranque del espacio de trabajo.
</ParamField>
<ParamField path="--tools" type="string">
  Restringir qué herramientas puede usar el trabajo, por ejemplo `--tools exec,read`.
</ParamField>

`--model` usa el modelo permitido seleccionado como modelo principal de ese trabajo. No es lo mismo que una anulación de `/model` de sesión de chat: las cadenas de respaldo configuradas todavía se aplican cuando falla el trabajo principal. Si el modelo solicitado no está permitido o no se puede resolver, cron falla la ejecución con un error de validación explícito en lugar de recurrir silenciosamente a la selección del modelo del agente/predeterminado del trabajo.

Los trabajos de Cron también pueden llevar `fallbacks` a nivel de carga útil. Cuando está presente, esa lista reemplaza la cadena de respaldo (fallback) configurada para el trabajo. Use `fallbacks: []` en la carga útil/API del trabajo cuando desee una ejecución de cron estricta que intente solo el modelo seleccionado. Si un trabajo tiene `--model` pero ni carga útil ni respaldos configurados, OpenClaw pasa una anulación de respaldo vacía explícita para que el agente principal no se agregue como un objetivo de reintento extra oculto.

Las comprobaciones preliminares (preflight) del proveedor local recorren los respaldos configurados antes de marcar una ejecución de cron como `skipped`; `fallbacks: []` mantiene esa ruta preliminar estricta.

La precedencia de selección de modelo para trabajos aislados es:

1. Anulación del modelo del enlace de Gmail (cuando la ejecución proviene de Gmail y se permite esa anulación)
2. `model` de carga útil por trabajo
3. Anulación del modelo de sesión de cron almacenada seleccionada por el usuario
4. Selección de modelo del agente/predeterminado

El modo rápido también sigue la selección en vivo resuelta. Si la configuración del modelo seleccionado tiene `params.fastMode`, el cron aislado la usa por defecto. Una anulación `fastMode` de sesión almacenada todavía gana sobre la configuración en cualquier dirección.

Si una ejecución aislada llega a un traspaso de cambio de modelo en vivo, cron reintenta con el proveedor/modelo cambiado y persiste esa selección en vivo para la ejecución activa antes de reintentar. Cuando el cambio también lleva un nuevo perfil de autenticación, cron también persiste esa anulación de perfil de autenticación para la ejecución activa. Los reintentos están limitados: después del intento inicial más 2 reintentos de cambio, cron aborta en lugar de buclear para siempre.

Antes de que una ejecución cron aislada entre en el ejecutor del agente, OpenClaw verifica los extremos del proveedor local alcanzables para proveedores `api: "ollama"` y `api: "openai-completions"` configurados cuyo `baseUrl` sea loopback, private-network o `.local`. Si ese extremo está caído, la ejecución se registra como `skipped` con un error claro de proveedor/modelo en lugar de iniciar una llamada al modelo. El resultado del extremo se almacena en caché durante 5 minutos, por lo que muchos trabajos pendientes que usan el mismo servidor local Ollama, vLLM, SGLang o LM Studio muerto comparten una pequeña prueba en lugar de crear una tormenta de solicitudes. Las ejecuciones omitidas de verificación previa del proveedor no incrementan el retroceso por error de ejecución; habilite `failureAlert.includeSkipped` cuando desee notificaciones repetidas de omisión.

## Entrega y salida

| Modo       | Qué sucede                                                           |
| ---------- | -------------------------------------------------------------------- |
| `announce` | Entrega de reserva del texto final al objetivo si el agente no envió |
| `webhook`  | POST de la carga útil del evento finalizado a una URL                |
| `none`     | Sin entrega de reserva del ejecutor                                  |

Use `--announce --channel telegram --to "-1001234567890"` para la entrega al canal. Para los temas del foro de Telegram, use `-1001234567890:topic:123`; OpenClaw también acepta la abreviatura `-1001234567890:123` propiedad de Telegram. Los llamantes directos de RPC/config pueden pasar `delivery.threadId` como una cadena o un número. Los objetivos de Slack/Discord/Mattermost deben usar prefijos explícitos (`channel:<id>`, `user:<id>`). Los IDs de sala de Matrix distinguen entre mayúsculas y minúsculas; use el ID de sala exacto o la forma `room:!room:server` de Matrix.

Cuando la entrega de anuncios usa `channel: "last"` u omite `channel`, un destino con prefijo de proveedor como `telegram:123` puede seleccionar el canal antes de que cron recurra al historial de sesiones o a un solo canal configurado. Solo los prefijos anunciados por el complemento cargado son selectores de proveedor. Si `delivery.channel` es explícito, el prefijo de destino debe nombrar al mismo proveedor; por ejemplo, `channel: "whatsapp"` con `to: "telegram:123"` se rechaza en lugar de dejar que WhatsApp interprete el ID de Telegram como un número de teléfono. Los prefijos de tipo de destino y servicio como `channel:<id>`, `user:<id>`, `imessage:<handle>` y `sms:<number>` siguen siendo sintaxis de destino propiedad del canal, no selectores de proveedor.

Para trabajos aislados, la entrega de chat es compartida. Si hay una ruta de chat disponible, el agente puede usar la herramienta `message` incluso cuando el trabajo usa `--no-deliver`. Si el agente envía al destino configurado/actual, OpenClaw omite el anuncio de respaldo. De lo contrario, `announce`, `webhook` y `none` solo controlan lo que el ejecutor hace con la respuesta final después del turno del agente.

Cuando un agente crea un recordatorio aislado desde un chat activo, OpenClaw almacena el destino de entrega en vivo preservado para la ruta de anuncio de respaldo. Las claves de sesión interna pueden estar en minúsculas; los destinos de entrega del proveedor no se reconstruyen a partir de esas claves cuando el contexto de chat actual está disponible.

La entrega implícita de anuncios usa listas de permitidos de canales configuradas para validar y redirigir destinos obsoletos. Las aprobaciones de almacenes de emparejamiento DM no son destinatarios de automatización de respaldo; configure `delivery.to` o configure la entrada `allowFrom` del canal cuando un trabajo programado debería enviar proactivamente a un DM.

## Idioma de salida

Los trabajos de cron no infieren un idioma de respuesta a partir del canal, la configuración regional o los
mensajes anteriores. Ponga la regla de idioma en el mensaje o plantilla programada:

```bash
openclaw cron edit <jobId> \
  --message "Summarize the updates. Respond in Chinese; keep URLs, code, and product names unchanged."
```

Para los archivos de plantilla, mantenga la instrucción de idioma en el mensaje renderizado y verifique que los marcadores de posición como `{{language}}` se completen antes de que se ejecute el trabajo. Si el resultado mezcla idiomas, haga que la regla sea explícita, por ejemplo: "Use chino para el texto narrativo y mantenga los términos técnicos en inglés".

Las notificaciones de error siguen una ruta de destino separada:

- `cron.failureDestination` establece un valor predeterminado global para las notificaciones de error.
- `job.delivery.failureDestination` anula eso por trabajo.
- Si no se establece ninguno de los dos y el trabajo ya se entrega a través de `announce`, las notificaciones de error ahora vuelven a ese destino de anuncio principal.
- `delivery.failureDestination` solo es compatible con trabajos `sessionTarget="isolated"` a menos que el modo de entrega principal sea `webhook`.
- `failureAlert.includeSkipped: true` activa una trabajo o una política de alerta global de cron en alertas repetidas de ejecuciones omitidas. Las ejecuciones omitidas mantienen un contador consecutivo separado, por lo que no afectan el retroceso por error de ejecución.

## Ejemplos de CLI

<Tabs>
  <Tab title="Recordatorio de un solo uso">```bash openclaw cron add \ --name "Calendar check" \ --at "20m" \ --session main \ --system-event "Next heartbeat: check calendar." \ --wake now ```</Tab>
  <Tab title="Trabajo aislado recurrente">```bash openclaw cron create "0 7 * * *" \ "Summarize overnight updates." \ --name "Morning brief" \ --tz "America/Los_Angeles" \ --session isolated \ --announce \ --channel slack \ --to "channel:C1234567890" ```</Tab>
  <Tab title="Anulación de modelo y pensamiento">```bash openclaw cron add \ --name "Deep analysis" \ --cron "0 6 * * 1" \ --tz "America/Los_Angeles" \ --session isolated \ --message "Weekly deep analysis of project progress." \ --model "opus" \ --thinking high \ --announce ```</Tab>
  <Tab title="Salida de webhook">```bash openclaw cron create "0 18 * * 1-5" \ "Summarize today's deploys as JSON." \ --name "Deploy digest" \ --webhook "https://example.invalid/openclaw/cron" ```</Tab>
</Tabs>

## Webhooks

Gateway puede exponer puntos finales HTTP de webhook para activadores externos. Habilítelo en la configuración:

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

Cada solicitud debe incluir el token del enlace (hook) a través del encabezado:

- `Authorization: Bearer <token>` (recomendado)
- `x-openclaw-token: <token>`

Se rechazan los tokens en la cadena de consulta (query-string).

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

    Campos: `message` (obligatorio), `name`, `agentId`, `wakeMode`, `deliver`, `channel`, `to`, `model`, `fallbacks`, `thinking`, `timeoutSeconds`.

  </Accordion>
  <Accordion title="Mapped hooks (POST /hooks/<name>)">
    Los nombres de hooks personalizados se resuelven mediante `hooks.mappings` en la configuración. Las asignaciones pueden transformar payloads arbitrarios en acciones `wake` o `agent` con plantillas o transformaciones de código.
  </Accordion>
</AccordionGroup>

<Warning>
Mantenga los endpoints de hook detrás de loopback, tailnet o un proxy inverso de confianza.

- Utilice un token de hook dedicado; no reutilice los tokens de autenticación de la puerta de enlace.
- Mantenga `hooks.path` en una subruta dedicada; `/` se rechaza.
- Configure `hooks.allowedAgentIds` para limitar qué agente efectivo puede objetivo un hook, incluyendo el agente predeterminado cuando se omite `agentId`.
- Mantenga `hooks.allowRequestSessionKey=false` a menos que requiera sesiones seleccionadas por quien llama.
- Si habilita `hooks.allowRequestSessionKey`, también configure `hooks.allowedSessionKeyPrefixes` para restringir las formas permitidas de claves de sesión.
- Los payloads de los hooks se envuelven con límites de seguridad de forma predeterminada.

</Warning>

## Integración con Gmail PubSub

Conecte los desencadenadores de la bandeja de entrada de Gmail a OpenClaw a través de Google PubSub.

<Note>**Requisitos previos:** `gcloud` CLI, `gog` (gogcli), OpenClaw hooks habilitados, Tailscale para el endpoint público HTTPS.</Note>

### Configuración del asistente (recomendada)

```bash
openclaw webhooks gmail setup --account openclaw@gmail.com
```

Esto escribe la configuración `hooks.gmail`, habilita el preset de Gmail y usa Tailscale Funnel para el endpoint push.

### Inicio automático del Gateway

Cuando `hooks.enabled=true` y `hooks.gmail.account` están configurados, el Gateway inicia `gog gmail watch serve` al arrancar y renueva automáticamente la vigilancia. Configure `OPENCLAW_SKIP_GMAIL_WATCHER=1` para optar por no participar.

### Configuración manual única

<Steps>
  <Step title="Seleccione el proyecto GCP">
    Seleccione el proyecto GCP que posee el cliente OAuth utilizado por `gog`:

    ```bash
    gcloud auth login
    gcloud config set project <project-id>
    gcloud services enable gmail.googleapis.com pubsub.googleapis.com
    ```

  </Step>
  <Step title="Crear tema y otorgar acceso push de Gmail">
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

## Gestionar trabajos

```bash
# List all jobs
openclaw cron list

# Get one stored job as JSON
openclaw cron get <jobId>

# Show one job, including resolved delivery route
openclaw cron show <jobId>

# Edit a job
openclaw cron edit <jobId> --message "Updated prompt" --model "opus"

# Force run a job now
openclaw cron run <jobId>

# Force run a job now and wait for its terminal status
openclaw cron run <jobId> --wait --wait-timeout 10m --poll-interval 2s

# Run only if due
openclaw cron run <jobId> --due

# View run history
openclaw cron runs --id <jobId> --limit 50

# View one exact run
openclaw cron runs --id <jobId> --run-id <runId>

# Delete a job
openclaw cron remove <jobId>

# Agent selection (multi-agent setups)
openclaw cron create "0 6 * * *" "Check ops queue" --name "Ops sweep" --session isolated --agent ops
openclaw cron edit <jobId> --clear-agent
```

`openclaw cron run <jobId>` regresa después de poner en cola la ejecución manual. Use `--wait` para hooks de apagado, scripts de mantenimiento u otra automatización que debe bloquearse hasta que finalice la ejecución en cola. El modo de espera sondea exactamente el `runId` devuelto; sale `0` para el estado `ok` y distinto de cero para `error`, `skipped` o un tiempo de espera de espera.

`openclaw cron create` es un alias de `openclaw cron add`, y los nuevos trabajos pueden usar una programación posicional (`"0 9 * * 1"`, `"every 1h"`, `"20m"`, o una marca de tiempo ISO) seguida de un mensaje de agente posicional. Use `--webhook <url>` en `cron add|create` o `cron edit` para hacer POST de la carga útil de la ejecución finalizada en un endpoint HTTP. La entrega por webhook no se puede combinar con indicadores de entrega de chat como `--announce`, `--channel`, `--to`, `--thread-id`, o `--account`.

<Note>
Nota de anulación de modelo:

- `openclaw cron add|edit --model ...` cambia el modelo seleccionado del trabajo.
- Si el modelo está permitido, ese proveedor/modelo exacto llega a la ejecución del agente aislado.
- Si no está permitido o no se puede resolver, cron falla la ejecución con un error de validación explícito.
- Las cadenas de retroceso configuradas todavía se aplican porque cron `--model` es un primario del trabajo, no una anulación de sesión `/model`.
- La carga útil `fallbacks` reemplaza los retrocesos configurados para ese trabajo; `fallbacks: []` deshabilita el retroceso y hace que la ejecución sea estricta.
- Un `--model` simple sin una lista de retroceso explícita o configurada no pasa al primario del agente como un objetivo de reintento adicional silencioso.

</Note>

## Configuración

```json5
{
  cron: {
    enabled: true,
    store: "~/.openclaw/cron/jobs.json",
    maxConcurrentRuns: 8,
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

`maxConcurrentRuns` limita tanto el despacho programado de cron como la ejecución de turnos de agente aislados, y por defecto es 8. Los turnos de agente aislados de cron usan internamente el carril de ejecución dedicado `cron-nested` de la cola, por lo que aumentar este valor permite que las ejecuciones de LLM de cron independientes progresen en paralelo en lugar de solo iniciar sus envoltorios externos de cron. El carril compartido `nested` no cron no se amplía con esta configuración.

`cron.store` es una clave de almacén lógica y una ruta de importación heredada. Los almacenes existentes se importan a SQLite en la primera carga y se archivan; los cambios futuros de cron deben hacerse a través de la CLI o la API de Gateway.

Desactivar cron: `cron.enabled: false` o `OPENCLAW_SKIP_CRON=1`.

<AccordionGroup>
  <Accordion title="Comportamiento de reintentos">
    **Reintento de una sola vez**: los errores transitorios (límite de tasa, sobrecarga, red, error del servidor) se reintentan hasta 3 veces con retroceso exponencial. Los errores permanentes se deshabilitan inmediatamente.

    **Reintento recurrente**: retroceso exponencial (30s a 60m) entre reintentos. El retroceso se restablece después de la próxima ejecución exitosa.

  </Accordion>
  <Accordion title="Mantenimiento">
    `cron.sessionRetention` (por defecto `24h`) poda las entradas de sesión de ejecución aisladas. `cron.runLog.keepLines` limita las filas de historial de ejecución de SQLite retenidas por trabajo; `maxBytes` se retiene para compatibilidad de configuración con registros de ejecución respaldados en archivo más antiguos.
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
    - Confirme que la Gateway se esté ejecutando continuamente.
    - Para programaciones `cron`, verifique la zona horaria (`--tz`) frente a la zona horaria del host.
    - `reason: not-due` en la salida de ejecución significa que se verificó una ejecución manual con `openclaw cron run <jobId> --due` y el trabajo aún no vencía.

  </Accordion>
  <Accordion title="Cron se disparó pero no hubo entrega">
    - El modo de entrega `none` significa que no se espera un envío de respaldo del ejecutor. El agente aún puede enviar directamente con la herramienta `message` cuando hay una ruta de chat disponible.
    - El destino de entrega faltante/no válido (`channel`/`to`) significa que se omitió el envío saliente.
    - Para Matrix, los trabajos copiados o heredados con IDs de sala `delivery.to` en minúsculas pueden fallar porque los IDs de sala de Matrix distinguen mayúsculas de minúsculas. Edite el trabajo al valor exacto `!room:server` o `room:!room:server` de Matrix.
    - Los errores de autenticación del canal (`unauthorized`, `Forbidden`) significan que la entrega fue bloqueada por las credenciales.
    - Si la ejecución aislada devuelve solo el token silencioso (`NO_REPLY` / `no_reply`), OpenClaw suprime la entrega saliente directa y también suprime la ruta de resumen en cola de respaldo, por lo que no se publica nada de vuelta al chat.
    - Si el agente debe enviar un mensaje al usuario por sí mismo, verifique que el trabajo tenga una ruta utilizable (`channel: "last"` con un chat anterior, o un canal/destino explícito).

  </Accordion>
  <Accordion title="Cron o heartbeat parece prevenir la transición /new-style">
    - La frescura del reinicio diario e inactivo no se basa en `updatedAt`; consulte [Gestión de sesiones](/es/concepts/session#session-lifecycle).
    - Las activaciones de cron, las ejecuciones de heartbeat, las notificaciones de ejecución y el mantenimiento de la puerta de enlace pueden actualizar la fila de sesión para el enrutamiento/estado, pero no extienden `sessionStartedAt` o `lastInteractionAt`.
    - Para las filas heredadas creadas antes de que existieran esos campos, OpenClaw puede recuperar `sessionStartedAt` del encabezado de sesión JSONL de la transcripción cuando el archivo todavía está disponible. Las filas inactivas heredadas sin `lastInteractionAt` usan esa hora de inicio recuperada como su línea base inactiva.

  </Accordion>
  <Accordion title="Trampas de zona horaria">
    - Cron sin `--tz` usa la zona horaria del host de la puerta de enlace.
    - Los programas `at` sin zona horaria se tratan como UTC.
    - Heartbeat `activeHours` usa la resolución de zona horaria configurada.

  </Accordion>
</AccordionGroup>

## Relacionado

- [Automatización](/es/automation) — todos los mecanismos de automatización de un vistazo
- [Tareas en segundo plano](/es/automation/tasks) — libro de tareas de ejecuciones cron
- [Heartbeat](/es/gateway/heartbeat) — turnos periódicos de la sesión principal
- [Zona horaria](/es/concepts/timezone) — configuración de zona horaria
