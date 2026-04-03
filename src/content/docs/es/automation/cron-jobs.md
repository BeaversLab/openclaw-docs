---
summary: "Cron jobs + wakeups para el planificador del Gateway"
read_when:
  - Scheduling background jobs or wakeups
  - Wiring automation that should run with or alongside heartbeats
  - Deciding between heartbeat and cron for scheduled tasks
title: "Cron Jobs"
---

# Trabajos Cron (programador del Gateway)

> **¿Cron vs Heartbeat?** Consulte [Cron vs Heartbeat](/en/automation/cron-vs-heartbeat) para obtener orientación sobre cuándo usar cada uno.

Cron es el programador integrado del Gateway. Persiste los trabajos, despierta al agente en el momento adecuado y, opcionalmente, puede entregar el resultado de vuelta a un chat.

Todas las ejecuciones de cron crean registros de [tarea en segundo plano](/en/automation/tasks). La diferencia clave es la visibilidad:

- `sessionTarget: "main"` crea una tarea con la política de notificación `silent` — programa un evento del sistema para el flujo de la sesión principal y del latido, pero no genera notificaciones.
- `sessionTarget: "isolated"` o `sessionTarget: "session:..."` crea una tarea visible que aparece en `openclaw tasks` con notificaciones de entrega.

Si desea _"ejecutar esto cada mañana"_ o _"activar el agente en 20 minutos"_,
cron es el mecanismo.

Solución de problemas: [/automation/troubleshooting](/en/automation/troubleshooting)

## TL;DR

- Cron se ejecuta **dentro del Gateway** (no dentro del modelo).
- Los trabajos persisten bajo `~/.openclaw/cron/` por lo que los reinicios no pierden las programaciones.
- Dos estilos de ejecución:
  - **Sesión principal**: poner en cola un evento del sistema y luego ejecutarlo en el siguiente latido.
  - **Aislada**: ejecutar un turno dedicado del agente en `cron:<jobId>` o en una sesión personalizada, con entrega (anunciar de forma predeterminada o ninguno).
  - **Sesión actual**: vincular a la sesión donde se crea el cron (`sessionTarget: "current"`).
  - **Sesión personalizada**: ejecutar en una sesión persistente con nombre (`sessionTarget: "session:custom-id"`).
- Las activaciones (wakeups) son de primera clase: un trabajo puede solicitar "activar ahora" vs "siguiente latido".
- La publicación de webhooks es por trabajo mediante `delivery.mode = "webhook"` + `delivery.to = "<url>"`.
- La reserva de compatibilidad (legacy fallback) permanece para los trabajos almacenados con `notify: true` cuando `cron.webhook` está configurado; migre esos trabajos al modo de entrega de webhook.
- Para las actualizaciones, `openclaw doctor --fix` puede normalizar los campos del almacenamiento cron heredados, incluidas las sugerencias de entrega de nivel superior antiguas como `threadId`.

## Inicio rápido (accionable)

Cree un recordatorio de un solo uso, verifique que existe y ejecútelo inmediatamente:

```bash
openclaw cron add \
  --name "Reminder" \
  --at "2026-02-01T16:00:00Z" \
  --session main \
  --system-event "Reminder: check the cron docs draft" \
  --wake now \
  --delete-after-run

openclaw cron list
openclaw cron run <job-id>
openclaw cron runs --id <job-id>
```

Programe un trabajo aislado recurrente con entrega:

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

## Equivalentes de llamadas a herramientas (herramienta cron del Gateway)

Para las formas canónicas de JSON y ejemplos, consulte [JSON schema for tool calls](/en/automation/cron-jobs#json-schema-for-tool-calls).

## Dónde se almacenan los trabajos cron

Los trabajos cron se guardan persistentemente en el host de Gateway en `~/.openclaw/cron/jobs.json` de forma predeterminada.
Gateway carga el archivo en memoria y lo vuelve a escribir cuando hay cambios, por lo que las ediciones manuales
solo son seguras cuando Gateway está detenido. Se prefieren `openclaw cron add/edit` o la API de\llamada a la herramienta cron para realizar cambios.

## Descripción general para principiantes

Piense en un trabajo cron como: **cuándo** ejecutar + **qué** hacer.

1. **Elegir un horario**
   - Recordatorio de una sola vez → `schedule.kind = "at"` (CLI: `--at`)
   - Trabajo repetitivo → `schedule.kind = "every"` o `schedule.kind = "cron"`
   - Si su marca de tiempo ISO omite una zona horaria, se trata como **UTC**.

2. **Elegir dónde se ejecuta**
   - `sessionTarget: "main"` → ejecutar durante el próximo latido con el contexto principal.
   - `sessionTarget: "isolated"` → ejecutar un turno de agente dedicado en `cron:<jobId>`.
   - `sessionTarget: "current"` → vincular a la sesión actual (resuelto en el momento de la creación a `session:<sessionKey>`).
   - `sessionTarget: "session:custom-id"` → ejecutar en una sesión con nombre persistente que mantiene el contexto entre ejecuciones.

   Comportamiento predeterminado (sin cambios):
   - Las cargas útiles de `systemEvent` son `main` de forma predeterminada
   - Las cargas útiles de `agentTurn` son `isolated` de forma predeterminada

   Para utilizar el enlace a la sesión actual, establezca explícitamente `sessionTarget: "current"`.

3. **Elegir la carga útil**
   - Sesión principal → `payload.kind = "systemEvent"`
   - Sesión aislada → `payload.kind = "agentTurn"`

Opcional: los trabajos de una sola vez (`schedule.kind = "at"`) se eliminan después del éxito de forma predeterminada. Establezca
`deleteAfterRun: false` para mantenerlos (se deshabilitarán después del éxito).

## Conceptos

### Trabajos

Un trabajo cron es un registro almacenado con:

- un **horario** (cuándo debe ejecutarse),
- una **carga útil** (qué debe hacer),
- **modo de entrega** opcional (`announce`, `webhook` o `none`).
- **vinculación de agente** opcional (`agentId`): ejecutar el trabajo bajo un agente específico; si
  falta o se desconoce, la puerta de enlace (gateway) vuelve al agente predeterminado.

Los trabajos se identifican mediante un `jobId` estable (utilizado por las APIs de CLI/Gateway).
En las llamadas a herramientas del agente, `jobId` es el canónico; se acepta el `id` heredado por compatibilidad.
Los trabajos de un solo uso se eliminan automáticamente tras el éxito de forma predeterminada; establezca `deleteAfterRun: false` para mantenerlos.

### Programaciones

Cron admite tres tipos de programación:

- `at`: marca de tiempo de un solo uso a través de `schedule.at` (ISO 8601).
- `every`: intervalo fijo (ms).
- `cron`: expresión cron de 5 campos (o 6 campos con segundos) con zona horaria IANA opcional.

Las expresiones cron utilizan `croner`. Si se omite una zona horaria, se utiliza la
zona horaria local del host Gateway.

Para reducir los picos de carga al inicio de la hora en múltiples gateways, OpenClaw aplica una
ventana de escalonamiento determinista por trabajo de hasta 5 minutos para expresiones
recurrentes al inicio de la hora (por ejemplo `0 * * * *`, `0 */2 * * *`). Las expresiones
de hora fija como `0 7 * * *` se mantienen exactas.

Para cualquier programación cron, puede establecer una ventana de escalonamiento explícita con `schedule.staggerMs`
(`0` mantiene la sincronización exacta). Atajos de CLI:

- `--stagger 30s` (o `1m`, `5m`) para establecer una ventana de escalonamiento explícita.
- `--exact` para forzar `staggerMs = 0`.

### Ejecución principal vs. aislada

#### Trabajos de sesión principal (eventos del sistema)

Los trabajos principales ponen en cola un evento del sistema y opcionalmente despiertan el ejecutor de latidos.
Deben usar `payload.kind = "systemEvent"`.

- `wakeMode: "now"` (predeterminado): el evento activa una ejecución inmediata del latido.
- `wakeMode: "next-heartbeat"`: el evento espera el siguiente latido programado.

Esta es la mejor opción cuando desea el prompt de latido normal + el contexto de la sesión principal.
Consulte [Heartbeat](/en/gateway/heartbeat).

Los trabajos cron de sesión principal crean registros de [tarea en segundo plano](/en/automation/tasks) con la política de notificación `silent` (sin notificaciones de forma predeterminada). Aparecen en `openclaw tasks list` pero no generan mensajes de entrega.

#### Trabajos aislados (sesiones cron dedicadas)

Los trabajos aislados ejecutan un turno de agente dedicado en la sesión `cron:<jobId>` o en una sesión personalizada.

Comportamientos clave:

- El prompt tiene el prefijo `[cron:<jobId> <job name>]` para su rastreabilidad.
- Cada ejecución inicia un **id de sesión nuevo** (sin continuidad de la conversación previa), a menos que se use una sesión personalizada.
- Las sesiones personalizadas (`session:xxx`) persisten el contexto entre ejecuciones, permitiendo flujos de trabajo como reuniones diarias que se basan en resúmenes anteriores.
- Comportamiento predeterminado: si se omite `delivery`, los trabajos aislados anuncian un resumen (`delivery.mode = "announce"`).
- `delivery.mode` determina qué sucede:
  - `announce`: envía un resumen al canal de destino y publica un breve resumen en la sesión principal.
  - `webhook`: envía por POST el payload del evento finalizado a `delivery.to` cuando el evento finalizado incluye un resumen.
  - `none`: solo interno (sin entrega, sin resumen de la sesión principal).
- `wakeMode` controla cuándo se publica el resumen de la sesión principal:
  - `now`: latido inmediato.
  - `next-heartbeat`: espera el próximo latido programado.

Use trabajos aislados para tareas ruidosas, frecuentes o "tareas en segundo plano" que no deberían saturar
su historial de chat principal.

Estas ejecuciones separadas crean registros de [tarea en segundo plano](/en/automation/tasks) visibles en `openclaw tasks` y sujetos a auditoría y mantenimiento de tareas.

### Formatos de payload (lo que se ejecuta)

Se admiten dos tipos de payload:

- `systemEvent`: solo sesión principal, enrutado a través del prompt de latido.
- `agentTurn`: solo sesión aislada, ejecuta un turno de agente dedicado.

Campos comunes de `agentTurn`:

- `message`: prompt de texto obligatorio.
- `model` / `thinking`: anulaciones opcionales (ver más abajo).
- `timeoutSeconds`: anulación de tiempo de espera opcional.
- `lightContext`: modo de arranque ligero opcional para trabajos que no necesitan la inyección de archivos de arranque del espacio de trabajo.
- `toolsAllow`: array opcional de nombres de herramientas para restringir qué herramientas puede usar el trabajo (p. ej., `["exec", "read", "write"]`).

Configuración de entrega:

- `delivery.mode`: `none` | `announce` | `webhook`.
- `delivery.channel`: `last` o un canal específico.
- `delivery.to`: objetivo específico del canal (anuncio) o URL de webhook (modo webhook).
- `delivery.threadId`: ID de hilo o tema explícito opcional cuando el canal de destino admite entrega con hilos.
- `delivery.bestEffort`: evita que el trabajo falle si la entrega del anuncio falla.

La entrega de anuncios suprime los envíos de herramientas de mensajería para la ejecución; usa `delivery.channel`/`delivery.to`
para dirigirte al chat en su lugar. Cuando `delivery.mode = "none"`, no se publica ningún resumen en la sesión principal.

Si se omite `delivery` para trabajos aislados, OpenClaw usa por defecto `announce`.

#### Flujo de entrega de anuncios

Cuando `delivery.mode = "announce"`, cron entrega directamente a través de los adaptadores de canal de salida.
El agente principal no se inicia para redactar o reenviar el mensaje.

Detalles del comportamiento:

- Contenido: la entrega utiliza las cargas útiles de salida (texto/medios) de la ejecución aislada con fragmentación normal y
  formato de canal.
- Las respuestas solo de latido (`HEARTBEAT_OK` sin contenido real) no se entregan.
- Si la ejecución aislada ya envió un mensaje al mismo destino a través de la herramienta de mensaje, la entrega se
  omite para evitar duplicados.
- Los objetivos de entrega faltantes o inválidos hacen que el trabajo falle a menos que `delivery.bestEffort = true`.
- Un breve resumen se publica en la sesión principal solo cuando `delivery.mode = "announce"`.
- El resumen de la sesión principal respeta `wakeMode`: `now` activa un latido inmediato y
  `next-heartbeat` espera el próximo latido programado.

#### Flujo de entrega de Webhook

Cuando `delivery.mode = "webhook"`, cron publica la carga útil del evento finalizado en `delivery.to` cuando el evento finalizado incluye un resumen.

Detalles del comportamiento:

- El punto final debe ser una URL HTTP(S) válida.
- No se intenta la entrega al canal en modo webhook.
- No se publica ningún resumen de la sesión principal en modo webhook.
- Si `cron.webhookToken` está establecido, el encabezado de autenticación es `Authorization: Bearer <cron.webhookToken>`.
- Retorno obsoleto: los trabajos heredados almacenados con `notify: true` todavía se publican en `cron.webhook` (si están configurados), con una advertencia para que pueda migrar a `delivery.mode = "webhook"`.

### Anulaciones de modelo y pensamiento

Los trabajos aislados (`agentTurn`) pueden anular el modelo y el nivel de pensamiento:

- `model`: Cadena de proveedor/modelo (p. ej., `anthropic/claude-sonnet-4-20250514`) o alias (p. ej., `opus`)
- `thinking`: Nivel de pensamiento (`off`, `minimal`, `low`, `medium`, `high`, `xhigh`; solo modelos GPT-5.2 + Codex)

Nota: También puede establecer `model` en los trabajos de la sesión principal, pero cambia el modelo de la sesión principal compartida. Recomendamos las anulaciones de modelo solo para trabajos aislados para evitar cambios de contexto inesperados.

Prioridad de resolución:

1. Anulación del payload del trabajo (la más alta)
2. Valores predeterminados específicos del enlace (p. ej., `hooks.gmail.model`)
3. Valor predeterminado de configuración del agente

### Contexto de arranque ligero

Los trabajos aislados (`agentTurn`) pueden establecer `lightContext: true` para ejecutarse con un contexto de arranque ligero.

- Úselo para tareas programadas que no necesitan la inyección de archivos de arranque del espacio de trabajo.
- En la práctica, el tiempo de ejecución integrado se ejecuta con `bootstrapContextMode: "lightweight"`, lo que mantiene el contexto de arranque de cron vacío a propósito.
- Equivalentes de CLI: `openclaw cron add --light-context ...` y `openclaw cron edit --light-context`.

### Entrega (canal + destino)

Los trabajos aislados pueden entregar la salida a un canal a través de la configuración de nivel superior `delivery`:

- `delivery.mode`: `announce` (entrega al canal), `webhook` (HTTP POST) o `none`.
- `delivery.channel`: `last` o cualquier ID de canal entregable, por ejemplo `discord`, `matrix`, `telegram` o `whatsapp`.
- `delivery.to`: destino del destinatario específico del canal.
- `delivery.threadId`: anulación opcional de hilo/tema para canales como Telegram, Slack, Discord o Matrix cuando deseas un hilo específico sin codificarlo en `delivery.to`.

La entrega `announce` solo es válida para trabajos aislados (`sessionTarget: "isolated"`).
La entrega `webhook` es válida para trabajos principales y aislados.

Si se omite `delivery.channel` o `delivery.to`, cron puede recurrir a la "última ruta" de la sesión principal (el último lugar donde respondió el agente).

Recordatorios de formato de destino:

- Los destinos de Slack/Discord/Mattermost (plugin) deben usar prefijos explícitos (por ejemplo, `channel:<id>`, `user:<id>`) para evitar ambigüedades.
  Los IDs desnudos de 26 caracteres de Mattermost se resuelven **primero el usuario** (MD si el usuario existe, en caso contrario canal); usa `user:<id>` o `channel:<id>` para un enrutamiento determinista.
- Los temas de Telegram deben usar la forma `:topic:` (ver abajo).

#### Destinos de entrega de Telegram (temas / hilos del foro)

Telegram admite temas de foro a través de `message_thread_id`. Para la entrega de cron, puedes codificar el tema/hilo en el campo `to`:

- `-1001234567890` (solo ID de chat)
- `-1001234567890:topic:123` (preferido: marcador de tema explícito)
- `-1001234567890:123` (abreviado: sufijo numérico)

También se aceptan destinos con prefijo como `telegram:...` / `telegram:group:...`:

- `telegram:group:-1001234567890:topic:123`

## Esquema JSON para llamadas a herramientas

Use estas formas al llamar a las herramientas de Gateway `cron.*` directamente (llamadas a herramientas de agente o RPC).
Las banderas de CLI aceptan duraciones humanas como `20m`, pero las llamadas a herramientas deben usar una cadena ISO 8601
para `schedule.at` y milisegundos para `schedule.everyMs`.

### Parámetros de cron.add

Trabajo de una sola vez, de sesión principal (evento del sistema):

```json
{
  "name": "Reminder",
  "schedule": { "kind": "at", "at": "2026-02-01T16:00:00Z" },
  "sessionTarget": "main",
  "wakeMode": "now",
  "payload": { "kind": "systemEvent", "text": "Reminder text" },
  "deleteAfterRun": true
}
```

Trabajo recurrente, aislado con entrega:

```json
{
  "name": "Morning brief",
  "schedule": { "kind": "cron", "expr": "0 7 * * *", "tz": "America/Los_Angeles" },
  "sessionTarget": "isolated",
  "wakeMode": "next-heartbeat",
  "payload": {
    "kind": "agentTurn",
    "message": "Summarize overnight updates.",
    "lightContext": true
  },
  "delivery": {
    "mode": "announce",
    "channel": "slack",
    "to": "channel:C1234567890",
    "bestEffort": true
  }
}
```

Trabajo recurrente vinculado a la sesión actual (resuelto automáticamente en la creación):

```json
{
  "name": "Daily standup",
  "schedule": { "kind": "cron", "expr": "0 9 * * *" },
  "sessionTarget": "current",
  "payload": {
    "kind": "agentTurn",
    "message": "Summarize yesterday's progress."
  }
}
```

Trabajo recurrente en una sesión personalizada persistente:

```json
{
  "name": "Project monitor",
  "schedule": { "kind": "every", "everyMs": 300000 },
  "sessionTarget": "session:project-alpha-monitor",
  "payload": {
    "kind": "agentTurn",
    "message": "Check project status and update the running log."
  }
}
```

Notas:

- `schedule.kind`: `at` (`at`), `every` (`everyMs`), o `cron` (`expr`, opcional `tz`).
- `schedule.at` acepta ISO 8601. Los valores de Herramienta/API sin zona horaria se tratan como UTC; la CLI también acepta `openclaw cron add|edit --at "<offset-less-iso>" --tz <iana>` para disparos únicos de reloj local.
- `everyMs` está en milisegundos.
- `sessionTarget`: `"main"`, `"isolated"`, `"current"`, o `"session:<custom-id>"`.
- `"current"` se resuelve a `"session:<sessionKey>"` en el momento de la creación.
- Las sesiones personalizadas (`session:xxx`) mantienen un contexto persistente entre ejecuciones.
- Campos opcionales: `agentId`, `description`, `enabled`, `deleteAfterRun` (por defecto es true para `at`),
  `delivery`, `toolsAllow`.
- `toolsAllow`: matriz opcional de nombres de herramientas para restringir qué herramientas puede usar el trabajo (p. ej. `["exec", "read"]`). Omita o establezca `null` para usar todas las herramientas.
- `wakeMode` por defecto es `"now"` cuando se omite.

### Parámetros de cron.update

```json
{
  "jobId": "job-123",
  "patch": {
    "enabled": false,
    "schedule": { "kind": "every", "everyMs": 3600000 }
  }
}
```

Notas:

- `jobId` es el canónico; `id` se acepta por compatibilidad.
- Use `agentId: null` en el parche para borrar un enlace de agente.

### Parámetros de cron.run y cron.remove

```json
{ "jobId": "job-123", "mode": "force" }
```

```json
{ "jobId": "job-123" }
```

## Almacenamiento e historial

- Almacén de trabajos: `~/.openclaw/cron/jobs.json` (JSON gestionado por Gateway).
- Historial de ejecuciones: `~/.openclaw/cron/runs/<jobId>.jsonl` (JSONL, depurado automáticamente por tamaño y número de líneas).
- Las sesiones de ejecución de cron aisladas en `sessions.json` se depuran mediante `cron.sessionRetention` (por defecto `24h`; configure `false` para desactivar).
- Anular la ruta del almacén: `cron.store` en la configuración.

## Política de reintentos

Cuando un trabajo falla, OpenClaw clasifica los errores como **transitorios** (reintentables) o **permanentes** (desactivar inmediatamente).

### Errores transitorios (reintentados)

- Límite de tasa (429, demasiadas solicitudes, recursos agotados)
- Sobrecarga del proveedor (por ejemplo Anthropic `529 overloaded_error`, resúmenes de respaldo por sobrecarga)
- Errores de red (tiempo de espera, ECONNRESET, error de búsqueda, socket)
- Errores del servidor (5xx)
- Errores relacionados con Cloudflare

### Errores permanentes (sin reintentos)

- Fallos de autenticación (clave API no válida, no autorizado)
- Errores de configuración o validación
- Otros errores no transitorios

### Comportamiento predeterminado (sin configuración)

**Trabajos de una sola vez (`schedule.kind: "at"`):**

- Ante un error transitorio: reintentar hasta 3 veces con retroceso exponencial (30s → 1m → 5m).
- Ante un error permanente: desactivar inmediatamente.
- Ante éxito o omisión: desactivar (o eliminar si `deleteAfterRun: true`).

**Trabajos recurrentes (`cron` / `every`):**

- Ante cualquier error: aplicar retroceso exponencial (30s → 1m → 5m → 15m → 60m) antes de la siguiente ejecución programada.
- El trabajo permanece activo; el retroceso se restablece después de la siguiente ejecución exitosa.

Configure `cron.retry` para anular estos valores predeterminados (vea [Configuración](/en/automation/cron-jobs#configuration)).

## Configuración

```json5
{
  cron: {
    enabled: true, // default true
    store: "~/.openclaw/cron/jobs.json",
    maxConcurrentRuns: 1, // default 1
    // Optional: override retry policy for one-shot jobs
    retry: {
      maxAttempts: 3,
      backoffMs: [60000, 120000, 300000],
      retryOn: ["rate_limit", "overloaded", "network", "server_error"],
    },
    webhook: "https://example.invalid/legacy", // deprecated fallback for stored notify:true jobs
    webhookToken: "replace-with-dedicated-webhook-token", // optional bearer token for webhook mode
    sessionRetention: "24h", // duration string or false
    runLog: {
      maxBytes: "2mb", // default 2_000_000 bytes
      keepLines: 2000, // default 2000
    },
  },
}
```

Comportamiento de depuración del registro de ejecución:

- `cron.runLog.maxBytes`: tamaño máximo del archivo de registro de ejecución antes de la depuración.
- `cron.runLog.keepLines`: al depurar, mantener solo las N líneas más recientes.
- Ambos se aplican a los archivos `cron/runs/<jobId>.jsonl`.

Comportamiento del webhook:

- Preferido: configure `delivery.mode: "webhook"` con `delivery.to: "https://..."` por trabajo.
- Las URL de webhook deben ser URL `http://` o `https://` válidas.
- Cuando se envía, el payload es el JSON del evento de finalización del cron.
- Si `cron.webhookToken` está establecido, el encabezado de autenticación es `Authorization: Bearer <cron.webhookToken>`.
- Si `cron.webhookToken` no está establecido, no se envía ningún encabezado `Authorization`.
- Retorno obsoleto: los trabajos heredados almacenados con `notify: true` todavía usan `cron.webhook` cuando está presente.

Desactivar cron por completo:

- `cron.enabled: false` (config)
- `OPENCLAW_SKIP_CRON=1` (env)

## Mantenimiento

Cron tiene dos rutas de mantenimiento integradas: retención de sesión de ejecución aislada y poda de registros de ejecución.

### Valores predeterminados

- `cron.sessionRetention`: `24h` (establezca `false` para desactivar la poda de sesión de ejecución)
- `cron.runLog.maxBytes`: `2_000_000` bytes
- `cron.runLog.keepLines`: `2000`

### Cómo funciona

- Las ejecuciones aisladas crean entradas de sesión (`...:cron:<jobId>:run:<uuid>`) y archivos de transcripción.
- El reaper elimina las entradas de sesión de ejecución caducadas anteriores a `cron.sessionRetention`.
- Para las sesiones de ejecución eliminadas que ya no son referenciadas por el almacenamiento de sesiones, OpenClaw archiva los archivos de transcripción y purga los archivos eliminados antiguos en la misma ventana de retención.
- Después de cada anexo de ejecución, `cron/runs/<jobId>.jsonl` es verificado por tamaño:
  - si el tamaño del archivo excede `runLog.maxBytes`, se recorta a las `runLog.keepLines` líneas más recientes.

### Advertencia de rendimiento para planificadores de alto volumen

Las configuraciones de cron de alta frecuencia pueden generar grandes huellas de sesión de ejecución y registro de ejecución. El mantenimiento está integrado, pero los límites flexibles aún pueden crear trabajos de E/S y limpieza evitables.

Qué vigilar:

- ventanas largas de `cron.sessionRetention` con muchas ejecuciones aisladas
- `cron.runLog.keepLines` alto combinado con `runLog.maxBytes` grande
- muchos trabajos recurrentes ruidosos escribiendo al mismo `cron/runs/<jobId>.jsonl`

Qué hacer:

- mantenga `cron.sessionRetention` tan corto como lo permitan sus necesidades de depuración/auditoría
- mantenga los registros de ejecución limitados con `runLog.maxBytes` y `runLog.keepLines` moderados
- mueva los trabajos de fondo ruidosos al modo aislado con reglas de entrega que eviten charlas innecesarias
- revisa el crecimiento periódicamente con `openclaw cron runs` y ajusta la retención antes de que los registros se vuelvan grandes

### Personalizar ejemplos

Mantener las sesiones de ejecución durante una semana y permitir registros de ejecución más grandes:

```json5
{
  cron: {
    sessionRetention: "7d",
    runLog: {
      maxBytes: "10mb",
      keepLines: 5000,
    },
  },
}
```

Desactivar la poda de sesiones de ejecución aisladas pero mantener la poda de registros de ejecución:

```json5
{
  cron: {
    sessionRetention: false,
    runLog: {
      maxBytes: "5mb",
      keepLines: 3000,
    },
  },
}
```

Ajustar para un uso de cron de alto volumen (ejemplo):

```json5
{
  cron: {
    sessionRetention: "12h",
    runLog: {
      maxBytes: "3mb",
      keepLines: 1500,
    },
  },
}
```

## Inicio rápido de CLI

Recordatorio de un solo uso (UTC ISO, eliminar automáticamente después del éxito):

```bash
openclaw cron add \
  --name "Send reminder" \
  --at "2026-01-12T18:00:00Z" \
  --session main \
  --system-event "Reminder: submit expense report." \
  --wake now \
  --delete-after-run
```

Recordatorio de un solo uso (sesión principal, despertar inmediatamente):

```bash
openclaw cron add \
  --name "Calendar check" \
  --at "20m" \
  --session main \
  --system-event "Next heartbeat: check calendar." \
  --wake now
```

Trabajo aislado recurrente (anunciar a WhatsApp):

```bash
openclaw cron add \
  --name "Morning status" \
  --cron "0 7 * * *" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Summarize inbox + calendar for today." \
  --announce \
  --channel whatsapp \
  --to "+15551234567"
```

Trabajo cron recurrente con escalonamiento explícito de 30 segundos:

```bash
openclaw cron add \
  --name "Minute watcher" \
  --cron "0 * * * * *" \
  --tz "UTC" \
  --stagger 30s \
  --session isolated \
  --message "Run minute watcher checks." \
  --announce
```

Trabajo aislado recurrente (entregar a un tema de Telegram):

```bash
openclaw cron add \
  --name "Nightly summary (topic)" \
  --cron "0 22 * * *" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Summarize today; send to the nightly topic." \
  --announce \
  --channel telegram \
  --to "-1001234567890:topic:123"
```

Trabajo aislado con modelo y anulación de pensamiento (thinking):

```bash
openclaw cron add \
  --name "Deep analysis" \
  --cron "0 6 * * 1" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Weekly deep analysis of project progress." \
  --model "opus" \
  --thinking high \
  --announce \
  --channel whatsapp \
  --to "+15551234567"
```

Selección de agente (configuraciones multiagente):

```bash
# Pin a job to agent "ops" (falls back to default if that agent is missing)
openclaw cron add --name "Ops sweep" --cron "0 6 * * *" --session isolated --message "Check ops queue" --agent ops

# Switch or clear the agent on an existing job
openclaw cron edit <jobId> --agent ops
openclaw cron edit <jobId> --clear-agent
```

Listas de permitidos de herramientas (restringir qué herramientas puede usar un trabajo):

```bash
# Only allow exec and read tools for this job
openclaw cron add --name "Scoped job" --cron "0 8 * * *" --session isolated --message "Run scoped checks" --tools exec,read

# Update an existing job's tool allowlist
openclaw cron edit <jobId> --tools exec,read,write

# Remove a tool allowlist (use all tools)
openclaw cron edit <jobId> --clear-tools
```

Ejecución manual (forzar es el valor predeterminado, use `--due` para ejecutar solo cuando corresponda):

```bash
openclaw cron run <jobId>
openclaw cron run <jobId> --due
```

`cron.run` ahora reconoce una vez que la ejecución manual está en cola, no después de que finaliza el trabajo. Las respuestas de cola exitosas se parecen a `{ ok: true, enqueued: true, runId }`. Si el trabajo ya se está ejecutando o `--due` no encuentra nada pendiente, la respuesta sigue siendo `{ ok: true, ran: false, reason }`. Use `openclaw cron runs --id <jobId>` o el método de gateway `cron.runs` para inspeccionar la entrada finalizada eventual.

Editar un trabajo existente (campos de parche):

```bash
openclaw cron edit <jobId> \
  --message "Updated prompt" \
  --model "opus" \
  --thinking low
```

Forzar que un trabajo cron existente se ejecute exactamente según lo programado (sin escalonamiento):

```bash
openclaw cron edit <jobId> --exact
```

Historial de ejecuciones:

```bash
openclaw cron runs --id <jobId> --limit 50
```

Evento inmediato del sistema sin crear un trabajo:

```bash
openclaw system event --mode now --text "Next heartbeat: check battery."
```

## Superficie de la API de Gateway

- `cron.list`, `cron.status`, `cron.add`, `cron.update`, `cron.remove`
- `cron.run` (forzar o pendiente), `cron.runs`
  Para eventos inmediatos del sistema sin un trabajo, use [`openclaw system event`](/en/cli/system).

## Solución de problemas

### "Nada se ejecuta"

- Verifique que cron esté habilitado: `cron.enabled` y `OPENCLAW_SKIP_CRON`.
- Verifique que el Gateway se esté ejecutando continuamente (cron se ejecuta dentro del proceso del Gateway).
- Para programas `cron`: confirme la zona horaria (`--tz`) frente a la zona horaria del host.

### Un trabajo recurrente sigue retrasándose después de los fallos

- OpenClaw aplica un retroceso exponencial de reintentos para trabajos recurrentes después de errores consecutivos:
  30s, 1m, 5m, 15m, y luego 60m entre reintentos.
- El retroceso se restablece automáticamente después de la próxima ejecución exitosa.
- Los trabajos de un solo disparo (`at`) reintentan errores transitorios (límite de tasa, sobrecarga, red, server_error) hasta 3 veces con retroceso; los errores permanentes se deshabilitan inmediatamente. Consulte [Retry policy](/en/automation/cron-jobs#retry-policy).

### Telegram entrega en el lugar equivocado

- Para temas del foro, use `-100…:topic:<id>` para que sea explícito e inequívoco.
- Si ve prefijos `telegram:...` en los registros o en los objetivos de "última ruta" almacenados, es normal;
  la entrega de cron los acepta y aún analiza los ID de los temas correctamente.

### Reintentos de entrega de anuncios de subagente

- Cuando se completa una ejecución de subagente, la puerta de enlace anuncia el resultado a la sesión solicitante.
- Si el flujo de anuncio devuelve `false` (por ejemplo, la sesión solicitante está ocupada), la puerta de enlace reintenta hasta 3 veces con seguimiento a través de `announceRetryCount`.
- Los anuncios anteriores a 5 minutos después de `endedAt` caducan forzosamente para evitar que las entradas obsoletas bucleen indefinidamente.
- Si ve entregas de anuncios repetidas en los registros, verifique el registro de subagentes en busca de entradas con valores altos de `announceRetryCount`.

## Relacionado

- [Automation Overview](/en/automation) — todos los mecanismos de automatización de un vistazo
- [Cron vs Heartbeat](/en/automation/cron-vs-heartbeat) — cuándo usar cada uno
- [Background Tasks](/en/automation/tasks) — libro mayor de tareas para ejecuciones de cron
- [Heartbeat](/en/gateway/heartbeat) — turnos periódicos de la sesión principal
- [Troubleshooting](/en/automation/troubleshooting) — depuración de problemas de automatización
