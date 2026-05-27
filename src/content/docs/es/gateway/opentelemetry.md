---
summary: "Exportar diagnósticos de OpenClaw a cualquier recopilador de OpenTelemetry mediante el complemento diagnostics-otel (OTLP/HTTP)"
title: "Exportación de OpenTelemetry"
read_when:
  - You want to send OpenClaw model usage, message flow, or session metrics to an OpenTelemetry collector
  - You are wiring traces, metrics, or logs into Grafana, Datadog, Honeycomb, New Relic, Tempo, or another OTLP backend
  - You need the exact metric names, span names, or attribute shapes to build dashboards or alerts
---

OpenClaw exporta diagnósticos a través del complemento oficial `diagnostics-otel`
utilizando **OTLP/HTTP (protobuf)**. Cualquier recopilador o backend que acepte OTLP/HTTP
funciona sin cambios en el código. Para ver los registros de archivos locales y cómo leerlos, consulte
[Logging](/es/logging).

## Cómo se integra

- Los **eventos de diagnóstico** son registros estructurados en proceso emitidos por el
  Gateway y los complementos incluidos para ejecuciones de modelos, flujo de mensajes, sesiones, colas
  y exec.
- El **complemento `diagnostics-otel`** se suscribe a esos eventos y los exporta como
  **métricas**, **trazas** y **registros** de OpenTelemetry a través de OTLP/HTTP.
- Las **LLamadas al proveedor** reciben un encabezado W3C `traceparent` del contexto de span
  de llamada al modelo de confianza de OpenClaw cuando el transporte del proveedor acepta
  encabezados personalizados. El contexto de traza emitido por el complemento no se propaga.
- Los exportadores solo se adjuntan cuando tanto la superficie de diagnóstico como el complemento están
  habilitados, por lo que el costo en el proceso permanece cerca de cero de forma predeterminada.

## Inicio rápido

Para instalaciones empaquetadas, instale primero el complemento:

```bash
openclaw plugins install clawhub:@openclaw/diagnostics-otel
```

```json5
{
  plugins: {
    allow: ["diagnostics-otel"],
    entries: {
      "diagnostics-otel": { enabled: true },
    },
  },
  diagnostics: {
    enabled: true,
    otel: {
      enabled: true,
      endpoint: "http://otel-collector:4318",
      protocol: "http/protobuf",
      serviceName: "openclaw-gateway",
      traces: true,
      metrics: true,
      logs: true,
      sampleRate: 0.2,
      flushIntervalMs: 60000,
    },
  },
}
```

También puede habilitar el complemento desde la CLI:

```bash
openclaw plugins enable diagnostics-otel
```

<Note>`protocol` actualmente solo admite `http/protobuf`. `grpc` se ignora.</Note>

## Señales exportadas

| Señal         | Qué contiene                                                                                                                                                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Métricas**  | Contadores e histogramas para el uso de tokens, costos, duración de la ejecución, uso de habilidades, flujo de mensajes, eventos de Talk, carriles de cola, estado/recuperación de sesión, ejecución de herramientas, exec y presión de memoria. |
| **Trazas**    | Spans para el uso de modelos, llamadas a modelos, ciclo de vida del arnés, uso de habilidades, ejecución de herramientas, exec, procesamiento de webhooks/mensajes, ensamblaje de contexto y bucles de herramientas.                             |
| **Registros** | Registros `logging.file` estructurados exportados a través de OTLP cuando `diagnostics.otel.logs` está habilitado; los cuerpos de los registros se retienen a menos que la captura de contenido esté explícitamente habilitada.                  |

Alterne `traces`, `metrics` y `logs` de forma independiente. Los tres están activados de forma predeterminada
cuando `diagnostics.otel.enabled` es verdadero.

## Referencia de configuración

```json5
{
  diagnostics: {
    enabled: true,
    otel: {
      enabled: true,
      endpoint: "http://otel-collector:4318",
      tracesEndpoint: "http://otel-collector:4318/v1/traces",
      metricsEndpoint: "http://otel-collector:4318/v1/metrics",
      logsEndpoint: "http://otel-collector:4318/v1/logs",
      protocol: "http/protobuf", // grpc is ignored
      serviceName: "openclaw-gateway",
      headers: { "x-collector-token": "..." },
      traces: true,
      metrics: true,
      logs: true,
      sampleRate: 0.2, // root-span sampler, 0.0..1.0
      flushIntervalMs: 60000, // metric export interval (min 1000ms)
      captureContent: {
        enabled: false,
        inputMessages: false,
        outputMessages: false,
        toolInputs: false,
        toolOutputs: false,
        systemPrompt: false,
      },
    },
  },
}
```

### Variables de entorno

| Variable                                                                                                          | Propósito                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT`                                                                                     | Anular `diagnostics.otel.endpoint`. Si el valor ya contiene `/v1/traces`, `/v1/metrics` o `/v1/logs`, se usa tal cual.                                                                                                                                                                                                                               |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` / `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` / `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` | Las anulaciones del punto de conexión específicas de la señal se utilizan cuando la clave de configuración `diagnostics.otel.*Endpoint` coincidente no está establecida. La configuración específica de la señal tiene prioridad sobre la variable de entorno específica de la señal, la cual tiene prioridad sobre el punto de conexión compartido. |
| `OTEL_SERVICE_NAME`                                                                                               | Anular `diagnostics.otel.serviceName`.                                                                                                                                                                                                                                                                                                               |
| `OTEL_EXPORTER_OTLP_PROTOCOL`                                                                                     | Anular el protocolo de conexión (actualmente solo `http/protobuf` se respeta).                                                                                                                                                                                                                                                                       |
| `OTEL_SEMCONV_STABILITY_OPT_IN`                                                                                   | Establézcalo en `gen_ai_latest_experimental` para emitir el atributo de span experimental más reciente de GenAI (`gen_ai.provider.name`) en lugar del heredado `gen_ai.system`. Las métricas de GenAI siempre utilizan atributos semánticos delimitados y de baja cardinalidad, independientemente de esto.                                          |
| `OPENCLAW_OTEL_PRELOADED`                                                                                         | Establézcalo en `1` cuando otro proceso de precarga o de host ya haya registrado el SDK global de OpenTelemetry. El complemento entonces omite su propio ciclo de vida de NodeSDK, pero aún conecta los oyentes de diagnóstico y respeta `traces`/`metrics`/`logs`.                                                                                  |

## Privacidad y captura de contenido

El contenido de modelos/herramientas sin procesar **no** se exporta de forma predeterminada. Los spans portan identificadores
delimitados (canal, proveedor, modelo, categoría de error, ids de solicitud solo con hash,
origen de la herramienta, propietario de la herramienta y nombre/origen de la habilidad) y nunca incluyen texto de solicitud,
texto de respuesta, entradas de herramientas, salidas de herramientas, rutas de archivos de habilidades o claves de sesión.
Los registros de registros OTLP mantienen la gravedad, el registrador, la ubicación del código, el contexto de trazado de confianza
y atributos saneados de forma predeterminada, pero el cuerpo del mensaje de registro sin procesar se exporta
solo cuando `diagnostics.otel.captureContent` se establece en booleano `true`. Las subclaves
granulares de `captureContent.*` no habilitan los cuerpos de los registros. Las etiquetas que parecen
claves de sesión de agente con ámbito se reemplazan con `unknown`.
Las métricas de Talk exportan solo metadatos de eventos delimitados, como modo, transporte,
proveedor y tipo de evento. No incluyen transcripciones, cargas de audio,
ids de sesión, ids de turno, ids de llamada, ids de sala o tokens de transferencia.

Las solicitudes de modelos salientes pueden incluir un encabezado W3C `traceparent`. Ese encabezado se
genera solo a partir del contexto de trazado de diagnóstico propiedad de OpenClaw para la llamada al modelo
activa. Los encabezados `traceparent` existentes proporcionados por el llamador se reemplazan, por lo que los complementos o
las opciones personalizadas del proveedor no pueden falsificar el linaje de trazas entre servicios.

Establezca `diagnostics.otel.captureContent.*` en `true` solo cuando su recopilador y su política de retención estén aprobados para el texto del prompt, la respuesta, la herramienta o el prompt del sistema. Cada subclave es opt-in de forma independiente:

- `inputMessages` - contenido del prompt del usuario.
- `outputMessages` - contenido de la respuesta del modelo.
- `toolInputs` - cargas útiles de argumentos de herramientas.
- `toolOutputs` - cargas útiles de resultados de herramientas.
- `systemPrompt` - prompt del sistema/desarrollador ensamblado.

Cuando se habilita cualquier subclave, los intervalos del modelo y de la herramienta obtienen atributos `openclaw.content.*` delimitados y redactados solo para esa clase. Use el booleano `captureContent: true` solo para capturas de diagnósticos generales donde los cuerpos de mensajes de registro OTLP también estén aprobados para su exportación.

## Muestreo y vaciado

- **Rastros:** `diagnostics.otel.sampleRate` (solo el span raíz, `0.0` descarta todos,
  `1.0` mantiene todos).
- **Métricas:** `diagnostics.otel.flushIntervalMs` (mínimo `1000`).
- **Registros:** Los registros OTLP respetan `logging.level` (nivel de registro de archivo). Utilizan la ruta de
  redacción de registros de diagnóstico, no el formato de consola. Las instalaciones
  de alto volumen deben preferir el muestreo/filtrado del recolector OTLP sobre el muestreo local.
- **Correlación de registros de archivo:** Los registros de archivo JSONL incluyen `traceId` de nivel superior,
  `spanId`, `parentSpanId` y `traceFlags` cuando la llamada al registro lleva un contexto
  de rastro de diagnóstico válido, lo que permite a los procesadores de registros unir las líneas de registro locales con
  los spans exportados.
- **Correlación de solicitudes:** Las solicitudes HTTP y los marcos WebSocket del Gateway crean un ámbito de rastreo de solicitud interno. Los registros y eventos de diagnóstico dentro de ese ámbito heredan el rastreo de la solicitud de manera predeterminada, mientras que los intervalos (spans) de ejecución del agente y de llamadas al modelo se crean como elementos secundarios, por lo que los encabezados del proveedor `traceparent` permanecen en el mismo rastreo.

## Métricas exportadas

### Uso del modelo

- `openclaw.tokens` (contador, attrs: `openclaw.token`, `openclaw.channel`, `openclaw.provider`, `openclaw.model`, `openclaw.agent`)
- `openclaw.cost.usd` (contador, attrs: `openclaw.channel`, `openclaw.provider`, `openclaw.model`)
- `openclaw.run.duration_ms` (histograma, attrs: `openclaw.channel`, `openclaw.provider`, `openclaw.model`)
- `openclaw.context.tokens` (histogram, attrs: `openclaw.context`, `openclaw.channel`, `openclaw.provider`, `openclaw.model`)
- `gen_ai.client.token.usage` (histogram, métrica de convenciones semánticas de GenAI, attrs: `gen_ai.token.type` = `input`/`output`, `gen_ai.provider.name`, `gen_ai.operation.name`, `gen_ai.request.model`)
- `gen_ai.client.operation.duration` (histogram, segundos, métrica de convenciones semánticas de GenAI, attrs: `gen_ai.provider.name`, `gen_ai.operation.name`, `gen_ai.request.model`, opcional `error.type`)
- `openclaw.model_call.duration_ms` (histogram, attrs: `openclaw.provider`, `openclaw.model`, `openclaw.api`, `openclaw.transport`, más `openclaw.errorCategory` y `openclaw.failureKind` en errores clasificados)
- `openclaw.model_call.request_bytes` (histogram, tamaño en bytes UTF-8 del payload final de la solicitud del modelo; sin contenido de payload sin procesar)
- `openclaw.model_call.response_bytes` (histogram, tamaño en bytes UTF-8 de los eventos de respuesta del modelo transmitidos; sin contenido de respuesta sin procesar)
- `openclaw.model_call.time_to_first_byte_ms` (histogram, tiempo transcurrido antes del primer evento de respuesta transmitido)
- `openclaw.skill.used` (contador, attrs: `openclaw.skill.name`, `openclaw.skill.source`, `openclaw.skill.activation`, `openclaw.agent` opcional, `openclaw.toolName` opcional)

### Flujo de mensajes

- `openclaw.webhook.received` (contador, attrs: `openclaw.channel`, `openclaw.webhook`)
- `openclaw.webhook.error` (contador, attrs: `openclaw.channel`, `openclaw.webhook`)
- `openclaw.webhook.duration_ms` (histograma, attrs: `openclaw.channel`, `openclaw.webhook`)
- `openclaw.message.queued` (contador, attrs: `openclaw.channel`, `openclaw.source`)
- `openclaw.message.received` (contador, attrs: `openclaw.channel`, `openclaw.source`)
- `openclaw.message.dispatch.started` (contador, attrs: `openclaw.channel`, `openclaw.source`)
- `openclaw.message.dispatch.completed` (contador, attrs: `openclaw.channel`, `openclaw.outcome`, `openclaw.reason`, `openclaw.source`)
- `openclaw.message.dispatch.duration_ms` (histograma, attrs: `openclaw.channel`, `openclaw.outcome`, `openclaw.reason`, `openclaw.source`)
- `openclaw.message.processed` (contador, attrs: `openclaw.channel`, `openclaw.outcome`)
- `openclaw.message.duration_ms` (histograma, attrs: `openclaw.channel`, `openclaw.outcome`)
- `openclaw.message.delivery.started` (contador, attrs: `openclaw.channel`, `openclaw.delivery.kind`)
- `openclaw.message.delivery.duration_ms` (histogram, attrs: `openclaw.channel`, `openclaw.delivery.kind`, `openclaw.outcome`, `openclaw.errorCategory`)

### Hablar

- `openclaw.talk.event` (counter, attrs: `openclaw.talk.event_type`, `openclaw.talk.mode`, `openclaw.talk.transport`, `openclaw.talk.brain`, `openclaw.talk.provider`)
- `openclaw.talk.event.duration_ms` (histogram, attrs: igual que `openclaw.talk.event`; emitido cuando un evento Talk reporta la duración)
- `openclaw.talk.audio.bytes` (histogram, attrs: igual que `openclaw.talk.event`; emitido para eventos de fotograma de audio de Talk que reportan la longitud en bytes)

### Colas y sesiones

- `openclaw.queue.lane.enqueue` (counter, attrs: `openclaw.lane`)
- `openclaw.queue.lane.dequeue` (contador, attrs: `openclaw.lane`)
- `openclaw.queue.depth` (histogram, attrs: `openclaw.lane` o `openclaw.channel=heartbeat`)
- `openclaw.queue.wait_ms` (histogram, attrs: `openclaw.lane`)
- `openclaw.session.state` (counter, attrs: `openclaw.state`, `openclaw.reason`)
- `openclaw.session.stuck` (counter, attrs: `openclaw.state`; emitido solo para el mantenimiento de sesiones obsoletas sin trabajo activo)
- `openclaw.session.stuck_age_ms` (histogram, attrs: `openclaw.state`; emitido solo para el mantenimiento de sesiones obsoletas sin trabajo activo)
- `openclaw.session.turn.created` (counter, attrs: `openclaw.agent`, `openclaw.channel`, `openclaw.trigger`)
- `openclaw.session.recovery.requested` (counter, attrs: `openclaw.state`, `openclaw.action`, `openclaw.active_work_kind`, `openclaw.reason`)
- `openclaw.session.recovery.completed` (counter, attrs: `openclaw.state`, `openclaw.action`, `openclaw.status`, `openclaw.active_work_kind`, `openclaw.reason`)
- `openclaw.session.recovery.age_ms` (histogram, attrs: igual que el contador de recuperación coincidente)
- `openclaw.run.attempt` (counter, attrs: `openclaw.attempt`)

### Telemetría de actividad de sesión

`diagnostics.stuckSessionWarnMs` es el umbral de antigüedad sin progreso para el diagnóstico de actividad de sesión. Una sesión `processing` no envejece hacia este umbral mientras OpenClaw observa progreso de respuesta, herramienta, estado, bloque o tiempo de ejecución de ACP. Los keepalives de escritura no se cuentan como progreso, por lo que aún se puede detectar un modelo o arnés silencioso.

OpenClaw clasifica las sesiones según el trabajo que aún puede observar:

- `session.long_running`: el trabajo integrado activo, las llamadas al modelo o las llamadas a herramientas todavía están progresando.
- `session.stalled`: existe trabajo activo, pero la ejecución activa no ha informado
  progreso reciente. Las ejecuciones integradas estancadas permanecen primero en modo de solo observación, y luego
  abortan y drenan después de `diagnostics.stuckSessionAbortMs` sin progreso para que los turnos
  en cola detrás del carril puedan reanudarse. Si no se establece, el umbral de aborto predeterminado es
  la ventana extendida más segura de al menos 5 minutos y 3 veces
  `diagnostics.stuckSessionWarnMs`.
- `session.stuck`: contabilidad de sesión obsoleta sin trabajo activo. Esto libera
  el carril de la sesión afectada inmediatamente.

La recuperación emite eventos estructurados `session.recovery.requested` y
`session.recovery.completed`. El estado de diagnóstico de la sesión se marca como inactivo
solo después de un resultado de recuperación mutante (`aborted` o `released`) y solo si la
misma generación de procesamiento sigue siendo actual.

Solo `session.stuck` emite el contador `openclaw.session.stuck`, el
histograma `openclaw.session.stuck_age_ms` y el intervalo (span)
`openclaw.session.stuck`. Los diagnósticos repetidos `session.stuck` se reducen (back off) mientras la sesión permanece
sin cambios, por lo que los paneles deberían alertar sobre aumentos sostenidos en lugar de en cada
tic de latido. Para el control de configuración y los valores predeterminados, consulte
[Referencia de configuración](/es/gateway/configuration-reference#diagnostics).

### Ciclo de vida del arnés

- `openclaw.harness.duration_ms` (histograma, atributos: `openclaw.harness.id`, `openclaw.harness.plugin`, `openclaw.outcome`, `openclaw.harness.phase` en errores)

### Exec

- `openclaw.exec.duration_ms` (histograma, atributos: `openclaw.exec.target`, `openclaw.exec.mode`, `openclaw.outcome`, `openclaw.failureKind`)

### Aspectos internos de diagnóstico (memoria y bucle de herramientas)

- `openclaw.memory.heap_used_bytes` (histograma, atributos: `openclaw.memory.kind`)
- `openclaw.memory.rss_bytes` (histograma)
- `openclaw.memory.pressure` (contador, atributos: `openclaw.memory.level`)
- `openclaw.tool.loop.iterations` (contador, atributos: `openclaw.toolName`, `openclaw.outcome`)
- `openclaw.tool.loop.duration_ms` (histogram, attrs: `openclaw.toolName`, `openclaw.outcome`)

## Spans exportados

- `openclaw.model.usage`
  - `openclaw.channel`, `openclaw.provider`, `openclaw.model`
  - `openclaw.tokens.*` (input/output/cache_read/cache_write/total)
  - `gen_ai.system` por defecto, o `gen_ai.provider.name` cuando se opta por las últimas convenciones semánticas de GenAI
  - `gen_ai.request.model`, `gen_ai.operation.name`, `gen_ai.usage.*`
- `openclaw.run`
  - `openclaw.outcome`, `openclaw.channel`, `openclaw.provider`, `openclaw.model`, `openclaw.errorCategory`
- `openclaw.model.call`
  - `gen_ai.system` por defecto, o `gen_ai.provider.name` cuando se opta por las últimas convenciones semánticas de GenAI
  - `gen_ai.request.model`, `gen_ai.operation.name`, `openclaw.provider`, `openclaw.model`, `openclaw.api`, `openclaw.transport`
  - `openclaw.errorCategory` y `openclaw.failureKind` opcional en errores
  - `openclaw.model_call.request_bytes`, `openclaw.model_call.response_bytes`, `openclaw.model_call.time_to_first_byte_ms`
  - `openclaw.provider.request_id_hash` (hash basado en SHA limitado del id de solicitud del proveedor ascendente; los ids sin procesar no se exportan)
- `openclaw.harness.run`
  - `openclaw.harness.id`, `openclaw.harness.plugin`, `openclaw.outcome`, `openclaw.provider`, `openclaw.model`, `openclaw.channel`
  - Al completar: `openclaw.harness.result_classification`, `openclaw.harness.yield_detected`, `openclaw.harness.items.started`, `openclaw.harness.items.completed`, `openclaw.harness.items.active`
  - En caso de error: `openclaw.harness.phase`, `openclaw.errorCategory`, `openclaw.harness.cleanup_failed` opcional
- `openclaw.tool.execution`
  - `gen_ai.tool.name`, `openclaw.toolName`, `openclaw.errorCategory`, `openclaw.tool.params.*`
- `openclaw.exec`
  - `openclaw.exec.target`, `openclaw.exec.mode`, `openclaw.outcome`, `openclaw.failureKind`, `openclaw.exec.command_length`, `openclaw.exec.exit_code`, `openclaw.exec.timed_out`
- `openclaw.webhook.processed`
  - `openclaw.channel`, `openclaw.webhook`
- `openclaw.webhook.error`
  - `openclaw.channel`, `openclaw.webhook`, `openclaw.error`
- `openclaw.message.processed`
  - `openclaw.channel`, `openclaw.outcome`, `openclaw.reason`
- `openclaw.message.delivery`
  - `openclaw.channel`, `openclaw.delivery.kind`, `openclaw.outcome`, `openclaw.errorCategory`, `openclaw.delivery.result_count`
- `openclaw.session.stuck`
  - `openclaw.state`, `openclaw.ageMs`, `openclaw.queueDepth`
- `openclaw.context.assembled`
  - `openclaw.prompt.size`, `openclaw.history.size`, `openclaw.context.tokens`, `openclaw.errorCategory` (sin contenido de prompt, historial, respuesta o clave de sesión)
- `openclaw.tool.loop`
  - `openclaw.toolName`, `openclaw.outcome`, `openclaw.iterations`, `openclaw.errorCategory` (sin mensajes de bucle, parámetros o salida de herramientas)
- `openclaw.memory.pressure`
  - `openclaw.memory.level`, `openclaw.memory.heap_used_bytes`, `openclaw.memory.rss_bytes`

Cuando la captura de contenido está explícitamente habilitada, los intervalos de modelo y herramienta también pueden incluir atributos `openclaw.content.*` limitados y redactados para las clases de contenido específicas que aceptaste.

## Catálogo de eventos de diagnóstico

Los eventos a continuación respaldan las métricas e intervalos mencionados anteriormente. Los complementos también pueden suscribirse a ellos directamente sin exportación OTLP.

**Uso del modelo**

- `model.usage` - tokens, coste, duración, contexto, proveedor/modelo/canal,
  ids de sesión. `usage` es la contabilidad del proveedor/turno para coste y telemetría;
  `context.used` es la instantánea actual del prompt/contexto y puede ser menor que
  el `usage.total` del proveedor cuando estén involucradas entradas en caché o llamadas a bucles de herramientas (tool-loop).

**Flujo de mensajes**

- `webhook.received` / `webhook.processed` / `webhook.error`
- `message.queued` / `message.processed`
- `message.delivery.started` / `message.delivery.completed` / `message.delivery.error`

**Cola y sesión**

- `queue.lane.enqueue` / `queue.lane.dequeue`
- `session.state` / `session.long_running` / `session.stalled` / `session.stuck`
- `run.attempt` / `run.progress`
- `diagnostic.heartbeat` (contadores agregados: webhooks/cola/sesión)

**Ciclo de vida del arnés**

- `harness.run.started` / `harness.run.completed` / `harness.run.error` -
  ciclo de vida por ejecución para el arnés del agente. Incluye `harnessId`, opcional
  `pluginId`, proveedor/modelo/canal e id de ejecución. La finalización añade
  `durationMs`, `outcome`, opcional `resultClassification`, `yieldDetected`,
  y conteos de `itemLifecycle`. Los errores añaden `phase`
  (`prepare`/`start`/`send`/`resolve`/`cleanup`), `errorCategory`, y
  opcional `cleanupFailed`.

**Exec**

- `exec.process.completed` - resultado final, duración, objetivo, modo, código
  de salida y tipo de fallo. El texto del comando y los directorios de trabajo no
  están incluidos.

## Sin un exportador

Puede mantener los eventos de diagnóstico disponibles para complementos o sumideros personalizados sin
ejecutar `diagnostics-otel`:

```json5
{
  diagnostics: { enabled: true },
}
```

Para obtener resultados de depuración específicos sin elevar `logging.level`, use indicadores
de diagnóstico. Los indicadores no distinguen entre mayúsculas y minúsculas y admiten comodines (por ejemplo, `telegram.*` o
`*`):

```json5
{
  diagnostics: { flags: ["telegram.http"] },
}
```

O como una anulación de entorno única:

```bash
OPENCLAW_DIAGNOSTICS=telegram.http,telegram.payload openclaw gateway
```

La salida de los indicadores va al archivo de registro estándar (`logging.file`) y todavía
se redacta por `logging.redactSensitive`. Guía completa:
[Indicadores de diagnóstico](/es/diagnostics/flags).

## Desactivar

```json5
{
  diagnostics: { otel: { enabled: false } },
}
```

También puede omitir `diagnostics-otel` en `plugins.allow`, o ejecutar
`openclaw plugins disable diagnostics-otel`.

## Relacionado

- [Registro (Logging)](/es/logging) - registros de archivos, salida de consola, seguimiento de CLI y la pestaña Registros de la UI de Control
- [Funciones internas de registro del Gateway](/es/gateway/logging) - estilos de registro de WS, prefijos de subsistema y captura de consola
- [Indicadores de diagnóstico](/es/diagnostics/flags) - indicadores de registro de depuración específicos
- [Exportación de diagnósticos](/es/gateway/diagnostics) - herramienta de paquete de soporte del operador (separada de la exportación OTEL)
- [Referencia de configuración](/es/gateway/configuration-reference#diagnostics) - referencia completa del campo `diagnostics.*`
