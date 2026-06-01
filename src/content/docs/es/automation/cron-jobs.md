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
- Las definiciones de trabajos persisten en `~/.openclaw/cron/jobs.json` por lo que los reinicios no hacen perder las programaciones.
- El estado de ejecución en tiempo de ejecución persiste junto a él en `~/.openclaw/cron/jobs-state.json`. Si rastreas las definiciones de cron en git, rastrea `jobs.json` y añade a gitignore `jobs-state.json`.
- Si `jobs.json` contiene filas con formato incorrecto, Gateway mantiene ejecutándose los trabajos válidos, elimina las filas mal formadas del almacén activo y guarda las filas sin procesar junto a él en `jobs-quarantine.json` para su reparación o revisión posterior.
- Después de la división, las versiones anteriores de OpenClaw pueden leer `jobs.json` pero pueden tratar los trabajos como nuevos porque los campos de tiempo de ejecución ahora viven en `jobs-state.json`.
- Cuando `jobs.json` se edita mientras Gateway se está ejecutando o detenido, OpenClaw compara los campos de programación cambiados con los metadatos de ranuras de tiempo de ejecución pendientes y borra los valores obsoletos de `nextRunAtMs`. Las reescrituras de formato puro o solo de orden de claves preservan la ranura pendiente.
- Todas las ejecuciones de cron crean registros de [tarea en segundo plano](/es/automation/tasks).
- Al iniciar Gateway, los trabajos aislados de turno de agente vencidos se reprograman fuera de la ventana de conexión del canal en lugar de reproducirse inmediatamente, para que el inicio de Discord/Telegram y la configuración de comandos nativos se mantengan receptivos después de los reinicios.
- Los trabajos de un solo uso (`--at`) se eliminan automáticamente después del éxito de forma predeterminada.
- El cron aislado cierra, con el mejor esfuerzo posible, las pestañas/procesos del navegador rastreados para su sesión `cron:<jobId>` cuando finaliza la ejecución, de modo que la automatización del navegador desacoplada no deje procesos huérfanos.
- Las ejecuciones de cron aisladas que reciben la subvención de autolimpieza restringida de cron aún pueden leer el estado del programador, una lista autofiltrada de su trabajo actual y el historial de ejecuciones de ese trabajo, de modo que las comprobaciones de estado/latido puedan inspeccionar su propio programa sin obtener acceso de mutación de cron más amplio.
- Las ejecuciones de cron aisladas también protegen contra respuestas de reconocimiento obsoletas. Si el primer resultado es solo una actualización de estado interina (`on it`, `pulling everything together` e indicaciones similares) y ninguna ejecución de subagente descendente sigue siendo responsable de la respuesta final, OpenClaw vuelve a solicitar una vez el resultado real antes de la entrega.
- Las ejecuciones de cron aisladas utilizan metadatos estructurados de denegación de ejecución de la ejecución incrustada, incluidos los contenedores `UNAVAILABLE` de host de nodo cuyo mensaje de error anidado comienza con `SYSTEM_RUN_DENIED` o `INVALID_REQUEST`, de modo que un comando bloqueado no se reporte como una ejecución exitosa (verde), mientras que la prosa ordinaria del asistente no se trate como una denegación.
- Las ejecuciones de cron aisladas también tratan los fallos del agente a nivel de ejecución como errores del trabajo incluso cuando no se produce ninguna carga útil de respuesta, de modo que los fallos del modelo/proveedor incrementan los contadores de error y activan notificaciones de fallo en lugar de marcar el trabajo como exitoso.
- Cuando un trabajo de turno de agente aislado alcanza `timeoutSeconds`, el cron aborta la ejecución del agente subyacente y le da una breve ventana de limpieza. Si la ejecución no se vacía, la limpieza propiedad de Gateway fuerza la limpieza de la propiedad de la sesión de esa ejecución antes de que el cron registre el tiempo de espera, de modo que el trabajo de chat en cola no quede rezagado tras una sesión de procesamiento obsoleta.
- Si un turno de agente aislado se detiene antes de que se inicie el ejecutor o antes de la primera llamada al modelo, el cron registra un tiempo de espera específico de la fase, como `setup timed out before runner start` o `stalled before first model call (last phase: context-engine)`. Estos perros guardianes cubren los proveedores incrustados y los proveedores respaldados por CLI antes de que se inicie realmente su proceso CLI externo, y están limitados de forma independiente a los valores largos de `timeoutSeconds`, de modo que los fallos de inicio en frío/autenticación/contexto surjan rápidamente en lugar de esperar el presupuesto completo del trabajo.
- Si utiliza el cron del sistema u otro planificador externo para ejecutar `openclaw agent`, envuélvalo con una escalada de terminación forzada (hard-kill) aunque la CLI maneje `SIGTERM`/`SIGINT`. Las ejecuciones respaldadas por Gateway solicitan a Gateway que aborte las ejecuciones aceptadas; las ejecuciones de reserva locales e integradas reciben la misma señal de aborto. Para GNU `timeout`, prefiera `timeout -k 60 600 openclaw agent ...` en lugar de `timeout 600 ...` plano; el valor `-k` es el respaldo del supervisor si el proceso no puede drenarse. Para las unidades systemd, mantenga la misma forma utilizando una señal de detención `SIGTERM` más una ventana de gracia como `TimeoutStopSec` antes de cualquier terminación final. Si un reintento reutiliza un `--run-id` mientras la ejecución original de Gateway aún está activa, el duplicado se reporta como en curso (in-flight) en lugar de iniciar una segunda ejecución.

<a id="maintenance"></a>

<Note>
La conciliación de tareas para cron es propiedad del tiempo de ejecución primero y respaldada por el historial duradero en segundo lugar: una tarea cron activa permanece activa mientras el tiempo de ejecución de cron aún rastrea ese trabajo como en ejecución, incluso si aún existe una fila antigua de sesión secundaria. Una vez que el tiempo de ejecución deja de ser propietario del trabajo y expira la ventana de gracia de 5 minutos, el mantenimiento verifica los registros de ejecución persistidos y el estado del trabajo para la ejecución `cron:<jobId>:<startedAt>` coincidente. Si ese historial duradero muestra un resultado terminal, el libro mayor de tareas se finaliza a partir de él; de lo contrario, el mantenimiento propiedad de Gateway puede marcar la tarea como `lost`. La auditoría de CLI sin conexión puede recuperarse del historial duradero, pero no trata su propio conjunto vacío de trabajos activos en proceso como una prueba de que una ejecución cron propiedad de Gateway ha desaparecido.
</Note>

## Tipos de programación

| Tipo    | Opción de CLI | Descripción                                                         |
| ------- | ------------- | ------------------------------------------------------------------- |
| `at`    | `--at`        | Marca de tiempo de un solo disparo (ISO 8601 o relativa como `20m`) |
| `every` | `--every`     | Intervalo fijo                                                      |
| `cron`  | `--cron`      | Expresión cron de 5 o 6 campos con `--tz` opcional                  |

Las marcas de tiempo sin zona horaria se tratan como UTC. Agregue `--tz America/New_York` para la programación local de la hora del reloj de pared.

Las expresiones recurrentes de cada hora se escalonan automáticamente hasta 5 minutos para reducir picos de carga. Use `--exact` para forzar una sincronización precisa o `--stagger 30s` para una ventana explícita.

### Día del mes y día de la semana usan lógica OR

Las expresiones cron son analizadas por [croner](https://github.com/Hexagon/croner). Cuando tanto el campo del día del mes como el del día de la semana no son comodines, croner coincide cuando **cualquiera** de los campos coincide —no ambos. Este es el comportamiento estándar de Vixie cron.

```
# Intended: "9 AM on the 15th, only if it's a Monday"
# Actual:   "9 AM on every 15th, AND 9 AM on every Monday"
0 9 15 * 1
```

Esto se dispara ~5-6 veces por mes en lugar de 0-1 veces por mes. OpenClaw utiliza el comportamiento OR predeterminado de Croner aquí. Para requerir ambas condiciones, use el modificador de día de la semana `+` de Croner (`0 9 15 * +1`) o programe en un campo y proteja el otro en el prompt o comando de su trabajo.

## Estilos de ejecución

| Estilo               | Valor `--session`   | Se ejecuta en                       | Mejor para                                     |
| -------------------- | ------------------- | ----------------------------------- | ---------------------------------------------- |
| Sesión principal     | `main`              | Carril dedicado de activación cron  | Recordatorios, eventos del sistema             |
| Aislado              | `isolated`          | `cron:<jobId>` dedicado             | Informes, tareas en segundo plano              |
| Sesión actual        | `current`           | Vinculado en el momento de creación | Trabajo recurrente con contexto                |
| Sesión personalizada | `session:custom-id` | Sesión con nombre persistente       | Flujos de trabajo que se basan en el historial |

<AccordionGroup>
  <Accordion title="Sesión principal frente a aislada frente a personalizada">
    Los trabajos de **Sesión principal** ponen en cola un evento del sistema en un carril de ejecución propiedad de cron y, opcionalmente, despiertan el latido (`--wake now` o `--wake next-heartbeat`). Pueden utilizar el contexto de la última entrega de la sesión principal de destino para las respuestas, pero no añaden turnos de rutina de cron al carril de chat humano y no extienden la frescura de restablecimiento diario/inactivo para la sesión de destino. Los trabajos **Aislados** ejecutan un turno de agente dedicado con una sesión nueva. Las **Sesiones personalizadas** (`session:xxx`) mantienen el contexto entre ejecuciones, permitiendo flujos de trabajo como reuniones diarias que se basan en resúmenes anteriores.

    Los eventos cron de sesión principal son recordatorios de eventos del sistema autónomos. No
    incluyen automáticamente la instrucción "Leer
    HEARTBEAT.md" del mensaje de latido predeterminado. Si un recordatorio recurrente debe consultar
    `HEARTBEAT.md`, indíquelo explícitamente en el texto del evento cron o en las
    propias instrucciones del agente.

  </Accordion>
  <Accordion title="Qué significa 'sesión nueva' para los trabajos aislados">
    Para los trabajos aislados, "sesión nueva" significa una nueva identificación de transcripción/sesión para cada ejecución. OpenClaw puede llevar preferencias seguras como la configuración de pensamiento/rápido/verboso, etiquetas y anulaciones explícitas de modelo/autenticación seleccionadas por el usuario, pero no hereda el contexto de conversación ambiental de una fila de cron anterior: enrutamiento de canal/grupo, política de envío o cola, elevación, origen o vinculación de tiempo de ejecución de ACP. Use `current` o `session:<id>` cuando un trabajo recurrente debe basarse deliberadamente en el mismo contexto de conversación.
  </Accordion>
  <Accordion title="Limpieza del tiempo de ejecución">
    Para los trabajos aislados, el desmontaje del tiempo de ejecución ahora incluye la limpieza del navegador de mejor esfuerzo para esa sesión de cron. Los fallos de limpieza se ignoran para que el resultado real de cron siga prevaleciendo.

    Las ejecuciones de cron aisladas también eliminan cualquier instancia de tiempo de ejecución de MCP agrupada creada para el trabajo a través de la ruta compartida de limpieza de tiempo de ejecución. Esto coincide con la forma en que se desmontan los clientes MCP de sesión principal y sesión personalizada, por lo que los trabajos de cron aislados no filtran procesos secundarios stdio ni conexiones MCP de larga duración entre ejecuciones.

  </Accordion>
  <Accordion title="Entrega de subagente y Discord">
    Cuando las ejecuciones cron aisladas orquestan subagentes, la entrega también prefiere la salida del descendiente final en lugar del texto intermedio del padre obsoleto. Si los descendientes todavía se están ejecutando, OpenClaw suprime esa actualización parcial del padre en lugar de anunciarla.

    Para objetivos de anuncio de Discord de solo texto, OpenClaw envía el texto canónico final del asistente una vez en lugar de reproducir tanto las cargas útiles de texto transmitidas/intermedias como la respuesta final. Los medios y las cargas útiles estructuradas de Discord todavía se entregan como cargas útiles separadas para que no se pierdan los archivos adjuntos y los componentes.

  </Accordion>
</AccordionGroup>

### Opciones de carga útil para trabajos aislados

<ParamField path="--message" type="string" required>
  Texto del prompt (requerido para aislado).
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

`--model` usa el modelo permitido seleccionado como modelo principal de ese trabajo. No es lo mismo que una anulación de `/model` de sesión de chat: las cadenas de reserva configuradas todavía se aplican cuando falla el principal del trabajo. Si el modelo solicitado no está permitido o no se puede resolver, cron falla la ejecución con un error de validación explícito en lugar de recurrir silenciosamente a la selección del modelo agente/predeterminado del trabajo.

Los trabajos de Cron también pueden llevar `fallbacks` a nivel de payload. Cuando están presentes, esa lista reemplaza la cadena de fallback configurada para el trabajo. Use `fallbacks: []` en el payload/API del trabajo cuando desee una ejecución de cron estricta que intente solo el modelo seleccionado. Si un trabajo tiene `--model` pero ni payload ni fallbacks configurados, OpenClaw pasa una anulación de fallback vacía explícita para que el agente primario no se añada como un objetivo de reintento adicional oculto.

Las comprobaciones previas de vuelo del proveedor local recorren los fallbacks configurados antes de marcar una ejecución de cron como `skipped`; `fallbacks: []` mantiene esa ruta de verificación previa estricta.

La precedencia de selección de modelo para trabajos aislados es:

1. Anulación del modelo del enlace de Gmail (cuando la ejecución proviene de Gmail y se permite esa anulación)
2. Payload por trabajo `model`
3. Anulación del modelo de sesión de cron almacenada seleccionada por el usuario
4. Selección de modelo del agente/predeterminado

El modo rápido también sigue la selección en vivo resuelta. Si la configuración del modelo seleccionado tiene `params.fastMode`, el cron aislado usa eso por defecto. Una anulación de sesión almacenada `fastMode` todavía gana sobre la configuración en cualquier dirección.

Si una ejecución aislada alcanza un traspaso de cambio de modelo en vivo, cron reintenta con el proveedor/modelo cambiado y persiste esa selección en vivo para la ejecución activa antes de reintentar. Cuando el cambio también lleva un nuevo perfil de autenticación, cron también persiste esa anulación de perfil de autenticación para la ejecución activa. Los reintentos están limitados: después del intento inicial más 2 reintentos de cambio, cron aborta en lugar de entrar en un bucle infinito.

Antes de que una ejecución de cron aislada entre en el ejecutor del agente, OpenClaw verifica los endpoints de proveedores locales accesibles para proveedores configurados de `api: "ollama"` y `api: "openai-completions"` cuyo `baseUrl` sea loopback, private-network o `.local`. Si ese endpoint está caído, la ejecución se registra como `skipped` con un error claro de proveedor/modelo en lugar de iniciar una llamada al modelo. El resultado del endpoint se almacena en caché durante 5 minutos, por lo que muchas tareas pendientes que usan el mismo servidor local Ollama, vLLM, SGLang o LM Studio muerto comparten una pequeña sond en lugar de crear una tormenta de solicitudes. Las ejecuciones omitidas de preverificación del proveedor no incrementan el retroceso de error de ejecución; active `failureAlert.includeSkipped` cuando desee notificaciones repetidas de omisión.

## Entrega y salida

| Modo       | Qué sucede                                                           |
| ---------- | -------------------------------------------------------------------- |
| `announce` | Entrega de reserva del texto final al objetivo si el agente no envió |
| `webhook`  | Enviar la carga útil del evento finalizado a una URL mediante POST   |
| `none`     | Sin entrega de reserva del ejecutor                                  |

Use `--announce --channel telegram --to "-1001234567890"` para la entrega al canal. Para temas de foros de Telegram, use `-1001234567890:topic:123`; OpenClaw también acepta la abreviatura `-1001234567890:123` propiedad de Telegram. Los llamantes directos de RPC/config pueden pasar `delivery.threadId` como una cadena o un número. Los objetivos de Slack/Discord/Mattermost deben usar prefijos explícitos (`channel:<id>`, `user:<id>`). Los IDs de las salas de Matrix distinguen entre mayúsculas y minúsculas; use el ID exacto de la sala o el formato `room:!room:server` de Matrix.

Cuando la entrega de anuncios usa `channel: "last"` o omite `channel`, un destino con prefijo de proveedor como `telegram:123` puede seleccionar el canal antes de que cron recurra al historial de sesiones o a un único canal configurado. Solo los prefijos anunciados por el complemento cargado son selectores de proveedor. Si `delivery.channel` es explícito, el prefijo de destino debe nombrar al mismo proveedor; por ejemplo, `channel: "whatsapp"` con `to: "telegram:123"` se rechaza en lugar de dejar que WhatsApp interprete el ID de Telegram como un número de teléfono. Los prefijos de tipo de destino y de servicio como `channel:<id>`, `user:<id>`, `imessage:<handle>` y `sms:<number>` siguen siendo sintaxis de destino propiedad del canal, no selectores de proveedor.

Para trabajos aislados, la entrega de chat se comparte. Si hay una ruta de chat disponible, el agente puede usar la herramienta `message` incluso cuando el trabajo usa `--no-deliver`. Si el agente envía al destino configurado/actual, OpenClaw omite el anuncio de respaldo. De lo contrario, `announce`, `webhook` y `none` solo controlan lo que el ejecutor hace con la respuesta final después del turno del agente.

Cuando un agente crea un recordatorio aislado desde un chat activo, OpenClaw almacena el destino de entrega en vivo preservado para la ruta de anuncio de respaldo. Las claves de sesión internas pueden estar en minúsculas; los destinos de entrega del proveedor no se reconstruyen a partir de esas claves cuando el contexto de chat actual está disponible.

La entrega implícita de anuncios usa listas de permitidos de canales configuradas para validar y redirigir destinos obsoletos. Las aprobaciones de la tienda de emparejamiento de DM no son destinatarios de automatización de respaldo; configure `delivery.to` o configure la entrada `allowFrom` del canal cuando un trabajo programado debe enviar proactivamente a un DM.

## Idioma de salida

Los trabajos de cron no infieren un idioma de respuesta del canal, la configuración regional o los mensajes anteriores. Ponga la regla de idioma en el mensaje programado o en la plantilla:

```bash
openclaw cron edit <jobId> \
  --message "Summarize the updates. Respond in Chinese; keep URLs, code, and product names unchanged."
```

Para los archivos de plantilla, mantenga la instrucción de idioma en el mensaje renderizado y
verifique que los marcadores de posición como `{{language}}` se completen antes de que se ejecute el trabajo. Si
la salida mezcla idiomas, haga que la regla sea explícita, por ejemplo: "Use chino
para el texto narrativo y mantenga los términos técnicos en inglés".

Las notificaciones de error siguen una ruta de destino separada:

- `cron.failureDestination` establece un valor predeterminado global para las notificaciones de error.
- `job.delivery.failureDestination` anula eso por cada trabajo.
- Si no se establece ninguno de los dos y el trabajo ya se entrega a través de `announce`, las notificaciones de error ahora vuelven a ese objetivo de anuncio principal.
- `delivery.failureDestination` solo es compatible con trabajos `sessionTarget="isolated"` a menos que el modo de entrega principal sea `webhook`.
- `failureAlert.includeSkipped: true` opta por un trabajo o una política de alerta cron global para recibir alertas repetidas de ejecuciones omitidas. Las ejecuciones omitidas mantienen un contador consecutivo de omisiones separado, por lo que no afectan al retroceso por error de ejecución.

## Ejemplos de CLI

<Tabs>
  <Tab title="Recordatorio de un solo uso">```bash openclaw cron add \ --name "Calendar check" \ --at "20m" \ --session main \ --system-event "Next heartbeat: check calendar." \ --wake now ```</Tab>
  <Tab title="Trabajo aislado recurrente">```bash openclaw cron create "0 7 * * *" \ "Summarize overnight updates." \ --name "Morning brief" \ --tz "America/Los_Angeles" \ --session isolated \ --announce \ --channel slack \ --to "channel:C1234567890" ```</Tab>
  <Tab title="Anulación de modelo y pensamiento">```bash openclaw cron add \ --name "Deep analysis" \ --cron "0 6 * * 1" \ --tz "America/Los_Angeles" \ --session isolated \ --message "Weekly deep analysis of project progress." \ --model "opus" \ --thinking high \ --announce ```</Tab>
  <Tab title="Salida de webhook">```bash openclaw cron create "0 18 * * 1-5" \ "Summarize today's deploys as JSON." \ --name "Deploy digest" \ --webhook "https://example.invalid/openclaw/cron" ```</Tab>
</Tabs>

## Webhooks

Gateway puede exponer endpoints de webhook HTTP para activadores externos. Habilítelo en la configuración:

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

Los tokens de cadena de consulta (query-string) son rechazados.

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
    Los nombres de hook personalizados se resuelven mediante `hooks.mappings` en la configuración. Las asignaciones pueden transformar cargas útiles arbitrarias en acciones `wake` o `agent` con plantillas o transformaciones de código.
  </Accordion>
</AccordionGroup>

<Warning>
Mantenga los endpoints de hook detrás de loopback, tailnet o proxy inverso de confianza.

- Use un token de hook dedicado; no reutilice tokens de autenticación de gateway.
- Mantenga `hooks.path` en una subruta dedicada; `/` se rechaza.
- Establezca `hooks.allowedAgentIds` para limitar a qué agente efectivo puede apuntar un hook, incluido el agente predeterminado cuando se omite `agentId`.
- Mantenga `hooks.allowRequestSessionKey=false` a menos que requiera sesiones seleccionadas por la persona que llama.
- Si habilita `hooks.allowRequestSessionKey`, también establezca `hooks.allowedSessionKeyPrefixes` para restringir las formas permitidas de claves de sesión.
- Las cargas útiles de hook se envuelven con límites de seguridad de forma predeterminada.

</Warning>

## Integración con Gmail PubSub

Conecte los disparadores de la bandeja de entrada de Gmail a OpenClaw a través de Google PubSub.

<Note>**Requisitos previos:** CLI `gcloud`, `gog` (gogcli), hooks de OpenClaw habilitados, Tailscale para el endpoint público HTTPS.</Note>

### Configuración mediante asistente (recomendada)

```bash
openclaw webhooks gmail setup --account openclaw@gmail.com
```

Esto escribe la configuración `hooks.gmail`, habilita el preajuste de Gmail y usa Tailscale Funnel para el endpoint de inserción.

### Inicio automático de Gateway

Cuando se establecen `hooks.enabled=true` y `hooks.gmail.account`, el Gateway inicia `gog gmail watch serve` al arrancar y renueva automáticamente la vigilancia. Establezca `OPENCLAW_SKIP_GMAIL_WATCHER=1` para no participar.

### Configuración manual única

<Steps>
  <Step title="Selecciona el proyecto de GCP">
    Selecciona el proyecto de GCP que posee el cliente OAuth usado por `gog`:

    ```bash
    gcloud auth login
    gcloud config set project <project-id>
    gcloud services enable gmail.googleapis.com pubsub.googleapis.com
    ```

  </Step>
  <Step title="Crear tema y conceder acceso de inserción de Gmail">
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

`openclaw cron run <jobId>` regresa después de poner en cola la ejecución manual. Use `--wait` para hooks de apagado, scripts de mantenimiento u otra automatización que debe bloquearse hasta que finalice la ejecución en cola. El modo de espera sondeaba el `runId` devuelto exacto; sale `0` para el estado `ok` y distinto de cero para `error`, `skipped` o un tiempo de espera de espera.

`openclaw cron create` es un alias para `openclaw cron add`, y los nuevos trabajos pueden usar una programación posicional (`"0 9 * * 1"`, `"every 1h"`, `"20m"`, o una marca de tiempo ISO) seguida de un mensaje de agente posicional. Use `--webhook <url>` en `cron add|create` o `cron edit` para hacer POST de la carga útil de la ejecución finalizada en un endpoint HTTP. La entrega por webhook no se puede combinar con indicadores de entrega de chat como `--announce`, `--channel`, `--to`, `--thread-id`, o `--account`.

<Note>
Nota de anulación de modelo:

- `openclaw cron add|edit --model ...` cambia el modelo seleccionado del trabajo.
- Si se permite el modelo, ese proveedor/modelo exacto llega a la ejecución del agente aislado.
- Si no se permite o no se puede resolver, cron falla la ejecución con un error de validación explícito.
- Las cadenas de retroceso (fallback) configuradas aún se aplican porque cron `--model` es un trabajo principal, no una anulación de sesión `/model`.
- La carga útil `fallbacks` reemplaza los retrocesos configurados para ese trabajo; `fallbacks: []` deshabilita el retroceso y hace que la ejecución sea estricta.
- Un `--model` simple sin una lista de retroceso explícita o configurada no pasa al agente principal como un objetivo adicional de reintento silencioso.

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

`maxConcurrentRuns` limita tanto el despacho cron programado como la ejecución del turno de agente aislado, y por defecto es 8. Los turnos de agente cron aislados usan internamente el carril de ejecución dedicado `cron-nested` de la cola, por lo que aumentar este valor permite que las ejecuciones independientes de LLM de cron progresen en paralelo en lugar de solo iniciar sus envoltorios cron externos. El carril compartido no-cron `nested` no se amplía con esta configuración.

El sidecar de estado de tiempo de ejecución se deriva de `cron.store`: un almacén `.json` como `~/clawd/cron/jobs.json` usa `~/clawd/cron/jobs-state.json`, mientras que una ruta de almacén sin sufijo `.json` añade `-state.json`.

Si editas `jobs.json` manualmente, mantén `jobs-state.json` fuera del control de código fuente. OpenClaw utiliza ese archivo adjunto para slots pendientes, marcadores activos, metadatos de la última ejecución y la identidad de la programación que indica al planificador cuándo un trabajo editado externamente necesita un `nextRunAtMs` nuevo.

Deshabilitar cron: `cron.enabled: false` o `OPENCLAW_SKIP_CRON=1`.

<AccordionGroup>
  <Accordion title="Comportamiento de reintento">
    **Reintento de un solo disparo**: los errores transitorios (límite de velocidad, sobrecarga, red, error del servidor) se reintentan hasta 3 veces con retroceso exponencial. Los errores permanentes se deshabilitan inmediatamente.

    **Reintento recurrente**: retroceso exponencial (30s a 60m) entre reintentos. El retroceso se restablece después de la próxima ejecución exitosa.

  </Accordion>
  <Accordion title="Mantenimiento">
    `cron.sessionRetention` (por defecto `24h`) poda las entradas de sesión de ejecución aisladas. `cron.runLog.maxBytes` / `cron.runLog.keepLines` podan automáticamente los archivos de registro de ejecución.
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
    - Verifica la variable de entorno `cron.enabled` y `OPENCLAW_SKIP_CRON`.
    - Confirma que la Gateway se esté ejecutando continuamente.
    - Para programaciones `cron`, verifica la zona horaria (`--tz`) frente a la zona horaria del host.
    - `reason: not-due` en la salida de ejecución significa que se verificó una ejecución manual con `openclaw cron run <jobId> --due` y el trabajo aún no correspondía.

  </Accordion>
  <Accordion title="Cron se ejecutó pero no hubo entrega">
    - El modo de entrega `none` significa que no se espera un envío de respaldo del ejecutor. El agente aún puede enviar directamente con la herramienta `message` cuando una ruta de chat esté disponible.
    - El destino de entrega faltante/no válido (`channel`/`to`) significa que se omitió el envío saliente.
    - Para Matrix, los trabajos copiados o heredados con IDs de sala `delivery.to` en minúsculas pueden fallar porque los IDs de sala de Matrix distinguen entre mayúsculas y minúsculas. Edite el trabajo con el valor exacto `!room:server` o `room:!room:server` de Matrix.
    - Los errores de autenticación del canal (`unauthorized`, `Forbidden`) significan que la entrega fue bloqueada por las credenciales.
    - Si la ejecución aislada devuelve solo el token silencioso (`NO_REPLY` / `no_reply`), OpenClaw suprime la entrega saliente directa y también suprime la ruta de resumen en cola de respaldo, por lo que no se publica nada de nuevo en el chat.
    - Si el agente debe enviar un mensaje al usuario por sí mismo, verifique que el trabajo tenga una ruta utilizable (`channel: "last"` con un chat anterior, o un canal/destino explícito).

  </Accordion>
  <Accordion title="Cron o heartbeat parece evitar el cambio de estilo /new-style">
    - La frescura del reinicio diario e inactivo no se basa en `updatedAt`; consulte [Gestión de sesiones](/es/concepts/session#session-lifecycle).
    - Las activaciones de Cron, ejecuciones de heartbeat, notificaciones de ejecución y mantenimiento de la puerta de enlace pueden actualizar la fila de sesión para el estado/enrutamiento, pero no extienden `sessionStartedAt` o `lastInteractionAt`.
    - Para las filas heredadas creadas antes de que existieran esos campos, OpenClaw puede recuperar `sessionStartedAt` del encabezado de sesión JSONL de la transcripción cuando el archivo todavía está disponible. Las filas inactivas heredadas sin `lastInteractionAt` usan esa hora de inicio recuperada como su línea base inactiva.

  </Accordion>
  <Accordion title="Advertencias de zona horaria">
    - Cron sin `--tz` usa la zona horaria del host de la puerta de enlace.
    - Las programaciones `at` sin zona horaria se tratan como UTC.
    - El latido `activeHours` de Heartbeat utiliza la resolución de zona horaria configurada.

  </Accordion>
</AccordionGroup>

## Relacionado

- [Automatización](/es/automation) — todos los mecanismos de automatización a un vistazo
- [Tareas en segundo plano](/es/automation/tasks) — libro mayor de tareas para ejecuciones de cron
- [Heartbeat](/es/gateway/heartbeat) — turnos periódicos de la sesión principal
- [Zona horaria](/es/concepts/timezone) — configuración de zona horaria
