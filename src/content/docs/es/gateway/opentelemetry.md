---
summary: "Exportar diagnósticos de OpenClaw a cualquier recopilador de OpenTelemetry mediante el complemento diagnostics-otel (OTLP/HTTP)"
title: "Exportación de OpenTelemetry"
read_when:
  - You want to send OpenClaw model usage, message flow, or session metrics to an OpenTelemetry collector
  - You are wiring traces, metrics, or logs into Grafana, Datadog, Honeycomb, New Relic, Tempo, or another OTLP backend
  - You need the exact metric names, span names, or attribute shapes to build dashboards or alerts
---

OpenClaw exporta diagnósticos a través del complemento oficial `diagnostics-otel`
usando **OTLP/HTTP (protobuf)**. Cualquier recopilador o backend que acepte OTLP/HTTP
funciona sin cambios en el código. Para los registros de archivos locales y cómo leerlos, consulte
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

| Señal         | Qué contiene                                                                                                                                                                                                                                                                                             |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Métricas**  | Contadores e histogramas para el uso de tokens, costo, duración de la ejecución, conmutación por error, uso de habilidades, flujo de mensajes, eventos de Talk, carriles de cola, estado/recuperación de sesión, ejecución de herramientas, cargas úlicas sobredimensionadas, exec y presión de memoria. |
| **Trazas**    | Spans para el uso de modelos, llamadas a modelos, ciclo de vida del arnés, uso de habilidades, ejecución de herramientas, exec, procesamiento de webhooks/mensajes, ensamblaje de contexto y bucles de herramientas.                                                                                     |
| **Registros** | Registros `logging.file` estructurados exportados a través de OTLP cuando `diagnostics.otel.logs` está habilitado; los cuerpos de los registros se retienen a menos que la captura de contenido esté explícitamente habilitada.                                                                          |

Alterne `traces`, `metrics` y `logs` de forma independiente. Las trazas y las métricas
se activan de forma predeterminada cuando `diagnostics.otel.enabled` es verdadero. Los registros se desactivan de forma predeterminada y
solo se exportan cuando `diagnostics.otel.logs` es explícitamente `true`.

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
        toolDefinitions: false,
      },
    },
  },
}
```

### Variables de entorno

| Variable                                                                                                          | Propósito                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT`                                                                                     | Anule `diagnostics.otel.endpoint`. Si el valor ya contiene `/v1/traces`, `/v1/metrics` o `/v1/logs`, se usa tal cual.                                                                                                                                                                                                                                                                              |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` / `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` / `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` | Anulaciones de endpoint específicas de señal que se usan cuando la clave de configuración `diagnostics.otel.*Endpoint` coincidente no está establecida. La configuración específica de la señal tiene prioridad sobre la variable de entorno específica de la señal, que a su vez tiene prioridad sobre el endpoint compartido.                                                                    |
| `OTEL_SERVICE_NAME`                                                                                               | Anule `diagnostics.otel.serviceName`.                                                                                                                                                                                                                                                                                                                                                              |
| `OTEL_EXPORTER_OTLP_PROTOCOL`                                                                                     | Anule el protocolo de cable (actualmente solo se respeta `http/protobuf`).                                                                                                                                                                                                                                                                                                                         |
| `OTEL_SEMCONV_STABILITY_OPT_IN`                                                                                   | Establézcalo en `gen_ai_latest_experimental` para emitir la forma experimental más reciente del intervalo de inferencia GenAI, incluyendo nombres de intervalo `{gen_ai.operation.name} {gen_ai.request.model}`, tipo de intervalo `CLIENT` y `gen_ai.provider.name` en lugar del `gen_ai.system` heredado. Las métricas GenAI siempre usan atributos semánticos limitados y de baja cardinalidad. |
| `OPENCLAW_OTEL_PRELOADED`                                                                                         | Establezca en `1` cuando otra precarga o proceso host ya haya registrado el SDK global de OpenTelemetry. El complemento luego omite su propio ciclo de vida de NodeSDK, pero aún conecta los oyentes de diagnóstico y respeta `traces`/`metrics`/`logs`.                                                                                                                                           |

## Privacidad y captura de contenido

El contenido sin procesar del modelo/herramienta **no** se exporta de forma predeterminada. Los intervalos llevan identificadores limitados (canal, proveedor, modelo, categoría de error, identificadores de solicitud solo con hash, origen de la herramienta, propietario de la herramienta y nombre/origen de la habilidad) y nunca incluyen texto de solicitud, texto de respuesta, entradas de herramientas, salidas de herramientas, rutas de archivo de habilidades o claves de sesión. Los registros de registro OTLP mantienen la gravedad, el registrador, la ubicación del código, el contexto de rastreo confiable y los atributos saneados de forma predeterminada, pero el cuerpo del mensaje de registro sin procesar se exporta solo cuando `diagnostics.otel.captureContent` se establece en booleano `true`. Las subclaves granulares `captureContent.*` no habilitan los cuerpos de los registros. Las etiquetas que parecen claves de sesión de agente con ámbito se reemplazan con `unknown`. Las métricas de conversación exportan solo metadatos de eventos limitados, como modo, transporte, proveedor y tipo de evento. No incluyen transcripciones, cargas de audio, identificadores de sesión, identificadores de turno, identificadores de llamada, identificadores de sala o tokens de transferencia.

Las solicitudes de modelos salientes pueden incluir un encabezado W3C `traceparent`. Ese encabezado se genera solo a partir del contexto de rastreo de diagnóstico propiedad de OpenClaw para la llamada al modelo activa. Los encabezados `traceparent` existentes proporcionados por el llamador se reemplazan, por lo que los complementos o las opciones personalizadas del proveedor no pueden falsificar el ascendiente de rastreo entre servicios.

Establezca `diagnostics.otel.captureContent.*` en `true` solo cuando su recopilador y política de retención estén aprobados para texto de solicitud, respuesta, herramienta o mensaje del sistema. Cada subclave es de inclusión opcional de forma independiente:

- `inputMessages` - contenido del mensaje del usuario.
- `outputMessages` - contenido de la respuesta del modelo.
- `toolInputs` - cargas útiles de argumentos de herramientas.
- `toolOutputs` - cargas útiles de resultados de herramientas.
- `systemPrompt` - mensaje del sistema/desarrollador ensamblado.
- `toolDefinitions` - nombres, descripciones y esquemas de herramientas del modelo.

Cuando se activa cualquier subclave, los spans de modelo y herramienta obtienen atributos acotados y redactados
`openclaw.content.*` solo para esa clase. Use el booleano
`captureContent: true` solo para capturas de diagnóstico amplias donde los cuerpos de mensajes de registro OTLP también estén aprobados para su exportación.

## Muestreo y vaciado

- **Trazas:** `diagnostics.otel.sampleRate` (solo span raíz, `0.0` descarta todo,
  `1.0` lo mantiene todo).
- **Métricas:** `diagnostics.otel.flushIntervalMs` (mínimo `1000`).
- **Registros:** Los registros OTLP respetan `logging.level` (nivel de registro de archivo). Utilizan la ruta de redacción de registros de diagnóstico, no el formato de consola. Las instalaciones de alto volumen deben preferir el muestreo/filtrado del colector OTLP sobre el muestreo local.
- **Correlación de registros de archivo:** Los registros de archivo JSONL incluyen `traceId`,
  `spanId`, `parentSpanId` y `traceFlags` de nivel superior cuando la llamada de registro lleva un contexto de seguimiento de diagnóstico válido, lo que permite a los procesadores de registros unir las líneas de registro locales con los spans exportados.
- **Correlación de solicitudes:** Las solicitudes HTTP del Gateway y los marcos WebSocket crean un alcance de seguimiento de solicitud interno. Los registros y eventos de diagnóstico dentro de ese ámbito heredan el seguimiento de solicitud de forma predeterminada, mientras que los spans de ejecución de agente y llamada de modelo se crean como elementos secundarios para que los encabezados `traceparent` del proveedor permanezcan en el mismo seguimiento.

## Métricas exportadas

### Uso del modelo

- `openclaw.tokens` (contador, attrs: `openclaw.token`, `openclaw.channel`, `openclaw.provider`, `openclaw.model`, `openclaw.agent`)
- `openclaw.cost.usd` (contador, attrs: `openclaw.channel`, `openclaw.provider`, `openclaw.model`)
- `openclaw.run.duration_ms` (histograma, attrs: `openclaw.channel`, `openclaw.provider`, `openclaw.model`)
- `openclaw.context.tokens` (histograma, attrs: `openclaw.context`, `openclaw.channel`, `openclaw.provider`, `openclaw.model`)
- `gen_ai.client.token.usage` (histogram, métrica de convenciones semánticas de GenAI, attrs: `gen_ai.token.type` = `input`/`output`, `gen_ai.provider.name`, `gen_ai.operation.name`, `gen_ai.request.model`)
- `gen_ai.client.operation.duration` (histogram, segundos, métrica de convenciones semánticas de GenAI, attrs: `gen_ai.provider.name`, `gen_ai.operation.name`, `gen_ai.request.model`, opcional `error.type`)
- `openclaw.model_call.duration_ms` (histogram, attrs: `openclaw.provider`, `openclaw.model`, `openclaw.api`, `openclaw.transport`, además de `openclaw.errorCategory` y `openclaw.failureKind` en errores clasificados)
- `openclaw.model_call.request_bytes` (histogram, tamaño en bytes UTF-8 de la carga útil final de la solicitud del modelo; sin contenido de la carga útil sin procesar)
- `openclaw.model_call.response_bytes` (histogram, tamaño en bytes UTF-8 de los eventos de respuesta del modelo transmitidos; sin contenido de respuesta sin procesar)
- `openclaw.model_call.time_to_first_byte_ms` (histogram, tiempo transcurrido antes del primer evento de respuesta transmitido)
- `openclaw.model.failover` (contador, attrs: `openclaw.provider`, `openclaw.model`, `openclaw.failover.to_provider`, `openclaw.failover.to_model`, `openclaw.failover.reason`, `openclaw.failover.suspended`, `openclaw.lane`)
- `openclaw.skill.used` (contador, attrs: `openclaw.skill.name`, `openclaw.skill.source`, `openclaw.skill.activation`, opcional `openclaw.agent`, opcional `openclaw.toolName`)

### Flujo de mensajes

- `openclaw.webhook.received` (contador, attrs: `openclaw.channel`, `openclaw.webhook`)
- `openclaw.webhook.error` (contador, attrs: `openclaw.channel`, `openclaw.webhook`)
- `openclaw.webhook.duration_ms` (histogram, attrs: `openclaw.channel`, `openclaw.webhook`)
- `openclaw.message.queued` (contador, attrs: `openclaw.channel`, `openclaw.source`)
- `openclaw.message.received` (contador, attrs: `openclaw.channel`, `openclaw.source`)
- `openclaw.message.dispatch.started` (contador, attrs: `openclaw.channel`, `openclaw.source`)
- `openclaw.message.dispatch.completed` (contador, attrs: `openclaw.channel`, `openclaw.outcome`, `openclaw.reason`, `openclaw.source`)
- `openclaw.message.dispatch.duration_ms` (histograma, attrs: `openclaw.channel`, `openclaw.outcome`, `openclaw.reason`, `openclaw.source`)
- `openclaw.message.processed` (contador, attrs: `openclaw.channel`, `openclaw.outcome`)
- `openclaw.message.duration_ms` (histograma, attrs: `openclaw.channel`, `openclaw.outcome`)
- `openclaw.message.delivery.started` (contador, attrs: `openclaw.channel`, `openclaw.delivery.kind`)
- `openclaw.message.delivery.duration_ms` (histograma, attrs: `openclaw.channel`, `openclaw.delivery.kind`, `openclaw.outcome`, `openclaw.errorCategory`)

### Hablar

- `openclaw.talk.event` (contador, attrs: `openclaw.talk.event_type`, `openclaw.talk.mode`, `openclaw.talk.transport`, `openclaw.talk.brain`, `openclaw.talk.provider`)
- `openclaw.talk.event.duration_ms` (histograma, attrs: igual que `openclaw.talk.event`; emitido cuando un evento Talk reporta duración)
- `openclaw.talk.audio.bytes` (histograma, attrs: igual que `openclaw.talk.event`; emitido para eventos de fotograma de audio Talk que reportan longitud en bytes)

### Colas y sesiones

- `openclaw.queue.lane.enqueue` (contador, attrs: `openclaw.lane`)
- `openclaw.queue.lane.dequeue` (contador, attrs: `openclaw.lane`)
- `openclaw.queue.depth` (histograma, attrs: `openclaw.lane` o `openclaw.channel=heartbeat`)
- `openclaw.queue.wait_ms` (histogram, attrs: `openclaw.lane`)
- `openclaw.session.state` (contador, attrs: `openclaw.state`, `openclaw.reason`)
- `openclaw.session.stuck` (contador, attrs: `openclaw.state`; emitido para la contabilidad de sesiones obsoletas recuperables)
- `openclaw.session.stuck_age_ms` (histograma, attrs: `openclaw.state`; emitido para la contabilidad de sesiones obsoletas recuperables)
- `openclaw.session.turn.created` (contador, attrs: `openclaw.agent`, `openclaw.channel`, `openclaw.trigger`)
- `openclaw.session.recovery.requested` (contador, attrs: `openclaw.state`, `openclaw.action`, `openclaw.active_work_kind`, `openclaw.reason`)
- `openclaw.session.recovery.completed` (contador, attrs: `openclaw.state`, `openclaw.action`, `openclaw.status`, `openclaw.active_work_kind`, `openclaw.reason`)
- `openclaw.session.recovery.age_ms` (histograma, attrs: igual que el contador de recuperación coincidente)
- `openclaw.run.attempt` (contador, attrs: `openclaw.attempt`)

### Telemetría de actividad de sesión

`diagnostics.stuckSessionWarnMs` es el umbral de antigüedad sin progreso para el diagnóstico de actividad de sesión. Una sesión `processing` no envejece hacia este umbral mientras OpenClaw observa el progreso de la respuesta, la herramienta, el estado, el bloque o el tiempo de ejecución de ACP. Las señales de mantenimiento de escritura (typing keepalives) no se cuentan como progreso, por lo que todavía se puede detectar un modelo o arnés silencioso.

OpenClaw clasifica las sesiones según el trabajo que aún puede observar:

- `session.long_running`: el trabajo integrado activo, las llamadas al modelo o las llamadas a herramientas aún están progresando.
- `session.stalled`: existe trabajo activo, pero la ejecución activa no ha informado un progreso reciente. Las ejecuciones integradas estancadas permanecen primero en modo de solo observación y luego abortan y drenan después de `diagnostics.stuckSessionAbortMs` sin progreso para que los turnos en cola detrás del carril puedan reanudarse. Cuando no está configurado, el umbral de aborto predeterminado a la ventana extendida más segura de al menos 5 minutos y 3x `diagnostics.stuckSessionWarnMs`.
- `session.stuck`: contabilidad de sesiones obsoletas sin trabajo activo, o una sesión en cola inactiva con actividad de modelo/herramienta obsoleta sin propietario. Esto libera el carril de la sesión afectado inmediatamente después de que pasan las puertas de recuperación.

La recuperación emite eventos estructurados `session.recovery.requested` y
`session.recovery.completed`. El estado de diagnóstico de la sesión se marca como inactivo
después de un resultado de recuperación de mutación (`aborted` o `released`) y solo si la
misma generación de procesamiento sigue siendo actual.

Solo `session.stuck` emite el contador `openclaw.session.stuck`, el
histograma `openclaw.session.stuck_age_ms` y el intervalo `openclaw.session.stuck`.
Los diagnósticos repetidos `session.stuck` se reducen (back off) mientras la sesión permanece
sin cambios, por lo que los tableros deben alertar sobre aumentos sostenidos en lugar de en cada
tick de latido. Para el control de configuración y los valores predeterminados, consulte
[Configuration reference](/es/gateway/configuration-reference#diagnostics).

Las advertencias de actividad (liveness) también emiten:

- `openclaw.liveness.warning` (contador, attrs: `openclaw.liveness.reason`)
- `openclaw.liveness.event_loop_delay_p99_ms` (histograma, attrs: `openclaw.liveness.reason`)
- `openclaw.liveness.event_loop_delay_max_ms` (histograma, attrs: `openclaw.liveness.reason`)
- `openclaw.liveness.event_loop_utilization` (histograma, attrs: `openclaw.liveness.reason`)
- `openclaw.liveness.cpu_core_ratio` (histograma, attrs: `openclaw.liveness.reason`)

### Ciclo de vida del arnés

- `openclaw.harness.duration_ms` (histograma, attrs: `openclaw.harness.id`, `openclaw.harness.plugin`, `openclaw.outcome`, `openclaw.harness.phase` en errores)

### Ejecución de herramientas

- `openclaw.tool.execution.duration_ms` (histograma, attrs: `gen_ai.tool.name`, `openclaw.toolName`, `openclaw.tool.source`, `openclaw.tool.owner`, `openclaw.tool.params.kind`, más `openclaw.errorCategory` en errores)
- `openclaw.tool.execution.blocked` (contador, attrs: `gen_ai.tool.name`, `openclaw.toolName`, `openclaw.tool.source`, `openclaw.tool.owner`, `openclaw.tool.params.kind`, `openclaw.deniedReason`)

### Exec

- `openclaw.exec.duration_ms` (histograma, attrs: `openclaw.exec.target`, `openclaw.exec.mode`, `openclaw.outcome`, `openclaw.failureKind`)

### Interno de diagnóstico (memoria y bucle de herramientas)

- `openclaw.payload.large` (contador, attrs: `openclaw.payload.surface`, `openclaw.payload.action`, `openclaw.channel`, `openclaw.plugin`, `openclaw.reason`)
- `openclaw.payload.large_bytes` (histograma, attrs: igual que `openclaw.payload.large`)
- `openclaw.memory.heap_used_bytes` (histograma, attrs: `openclaw.memory.kind`)
- `openclaw.memory.rss_bytes` (histograma)
- `openclaw.memory.pressure` (contador, attrs: `openclaw.memory.level`)
- `openclaw.tool.loop.iterations` (contador, attrs: `openclaw.toolName`, `openclaw.outcome`)
- `openclaw.tool.loop.duration_ms` (histograma, attrs: `openclaw.toolName`, `openclaw.outcome`)

## Spans exportados

- `openclaw.model.usage`
  - `openclaw.channel`, `openclaw.provider`, `openclaw.model`
  - `openclaw.tokens.*` (input/output/cache_read/cache_write/total)
  - `gen_ai.system` de forma predeterminada, o `gen_ai.provider.name` cuando se opta por las últimas convenciones semánticas de GenAI
  - `gen_ai.request.model`, `gen_ai.operation.name`, `gen_ai.usage.*`
- `openclaw.run`
  - `openclaw.outcome`, `openclaw.channel`, `openclaw.provider`, `openclaw.model`, `openclaw.errorCategory`
- `openclaw.model.call`
  - `gen_ai.system` de forma predeterminada, o `gen_ai.provider.name` cuando se opta por las últimas convenciones semánticas de GenAI
  - `gen_ai.request.model`, `gen_ai.operation.name`, `openclaw.provider`, `openclaw.model`, `openclaw.api`, `openclaw.transport`
  - `openclaw.errorCategory` y `openclaw.failureKind` opcional en errores
  - `openclaw.model_call.request_bytes`, `openclaw.model_call.response_bytes`, `openclaw.model_call.time_to_first_byte_ms`
  - `openclaw.provider.request_id_hash` (hash basado en SHA delimitado del id de solicitud del proveedor upstream; los ids brutos no se exportan)
  - Con `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental`, los spans de llamadas al modelo usan el último nombre de span de inferencia GenAI `{gen_ai.operation.name} {gen_ai.request.model}` y el tipo de span `CLIENT` en lugar de `openclaw.model.call`.
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

Cuando la captura de contenido está explícitamente habilitada, los spans de modelo y herramienta también pueden
incluir atributos `openclaw.content.*` limitados y redactados para las
categorías de contenido específicas que aceptó.

## Catálogo de eventos de diagnóstico

Los siguientes eventos respaldan las métricas y los spans anteriores. Los complementos también pueden suscribirse
a ellos directamente sin exportación OTLP.

**Uso del modelo**

- `model.usage` - tokens, costo, duración, contexto, proveedor/modelo/canal,
  ids de sesión. `usage` es la contabilidad del proveedor/turno para costos y telemetría;
  `context.used` es la instantánea actual del prompt/contexto y puede ser menor que
  el proveedor `usage.total` cuando están involucradas entradas en caché o llamadas de bucle de herramientas.

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
  y recuentos de `itemLifecycle`. Los errores añaden `phase`
  (`prepare`/`start`/`send`/`resolve`/`cleanup`), `errorCategory`, y
  opcional `cleanupFailed`.

**Exec**

- `exec.process.completed` - resultado final, duración, objetivo, modo, código
  de salida y tipo de fallo. El texto del comando y los directorios de trabajo no están
  incluidos.

## Sin un exportador

Puede mantener los eventos de diagnóstico disponibles para complementos o receptores personalizados sin
ejecutar `diagnostics-otel`:

```json5
{
  diagnostics: { enabled: true },
}
```

Para obtener resultados de depuración específicos sin generar `logging.level`, utilice indicadores
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

El resultado de los indicadores va al archivo de registro estándar (`logging.file`) y todavía
está redactado por `logging.redactSensitive`. Guía completa:
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

- [Registro](/es/logging) - registros de archivo, salida de consola, seguimiento de CLI y la pestaña Registros de la Interfaz de usuario de control
- [Internos de registro de Gateway](/es/gateway/logging) - estilos de registro WS, prefijos de subsistema y captura de consola
- [Indicadores de diagnóstico](/es/diagnostics/flags) - indicadores de registro de depuración específicos
- [Exportación de diagnósticos](/es/gateway/diagnostics) - herramienta del paquete de soporte para operadores (separada de la exportación OTEL)
- [Referencia de configuración](/es/gateway/configuration-reference#diagnostics) - referencia completa del campo `diagnostics.*`
