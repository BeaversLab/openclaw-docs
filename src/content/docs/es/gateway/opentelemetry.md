---
summary: "Exportar diagnósticos de OpenClaw a cualquier recopilador de OpenTelemetry a través del complemento diagnostics-otel (OTLP/HTTP)"
title: "Exportación de OpenTelemetry"
read_when:
  - You want to send OpenClaw model usage, message flow, or session metrics to an OpenTelemetry collector
  - You are wiring traces, metrics, or logs into Grafana, Datadog, Honeycomb, New Relic, Tempo, or another OTLP backend
  - You need the exact metric names, span names, or attribute shapes to build dashboards or alerts
---

OpenClaw exporta diagnósticos a través del complemento incluido `diagnostics-otel`
utilizando **OTLP/HTTP (protobuf)**. Cualquier recopilador o backend que acepte OTLP/HTTP
funciona sin cambios en el código. Para ver los registros de archivos locales y cómo leerlos, consulte
[Logging](/es/logging).

## Cómo se integra

- Los **eventos de diagnóstico** son registros estructurados en proceso emitidos por el
  Gateway y los complementos incluidos para ejecuciones de modelos, flujo de mensajes, sesiones, colas
  y exec.
- El **complemento `diagnostics-otel`** se suscribe a esos eventos y los exporta como
  **métricas**, **trazas** y **registros** de OpenTelemetry a través de OTLP/HTTP.
- Las **Llamadas al proveedor** reciben un encabezado W3C `traceparent` del contexto de span de
  llamada al modelo de confianza de OpenClaw cuando el transporte del proveedor acepta encabezados
  personalizados. El contexto de traza emitido por el complemento no se propaga.
- Los exportadores solo se adjuntan cuando tanto la superficie de diagnóstico como el complemento están
  habilitados, por lo que el costo en el proceso permanece cerca de cero de forma predeterminada.

## Inicio rápido

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

<Note>`protocol` actualmente solo admite `http/protobuf`. Se ignorará `grpc`.</Note>

## Señales exportadas

| Señal         | Qué contiene                                                                                                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Métricas**  | Contadores e histogramas para el uso de tokens, costo, duración de la ejecución, flujo de mensajes, carriles de cola, estado de sesión, exec y presión de memoria.                               |
| **Trazas**    | Spans para el uso del modelo, llamadas al modelo, ciclo de vida del arnés, ejecución de herramientas, exec, procesamiento de webhooks/mensajes, ensamblaje de contexto y bucles de herramientas. |
| **Registros** | Registros estructurados `logging.file` exportados a través de OTLP cuando `diagnostics.otel.logs` está habilitado.                                                                               |

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

| Variable                                                                                                          | Propósito                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `OTEL_EXPORTER_OTLP_ENDPOINT`                                                                                     | Anula `diagnostics.otel.endpoint`. Si el valor ya contiene `/v1/traces`, `/v1/metrics` o `/v1/logs`, se usa tal cual.                                                                                                                                                                                                                |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` / `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` / `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` | Invalidaciones de endpoint específicas de la señal que se utilizan cuando la clave de configuración `diagnostics.otel.*Endpoint` coincidente no está establecida. La configuración específica de la señal tiene prioridad sobre la variable de entorno específica de la señal, la cual tiene prioridad sobre el endpoint compartido. |
| `OTEL_SERVICE_NAME`                                                                                               | Anula `diagnostics.otel.serviceName`.                                                                                                                                                                                                                                                                                                |
| `OTEL_EXPORTER_OTLP_PROTOCOL`                                                                                     | Anula el protocolo de conexión (actualmente solo se respeta `http/protobuf`).                                                                                                                                                                                                                                                        |
| `OTEL_SEMCONV_STABILITY_OPT_IN`                                                                                   | Establézcalo en `gen_ai_latest_experimental` para emitir el último atributo experimental de span GenAI (`gen_ai.provider.name`) en lugar del `gen_ai.system` heredado. Las métricas GenAI siempre utilizan atributos semánticos limitados y de baja cardinalidad, independientemente.                                                |
| `OPENCLAW_OTEL_PRELOADED`                                                                                         | Establézcalo en `1` cuando otro proceso de carga previa (preload) o host ya haya registrado el SDK global de OpenTelemetry. El complemento (plugin) entonces omite su propio ciclo de vida de NodeSDK pero aún conecta los escuchas de diagnóstico y respeta `traces`/`metrics`/`logs`.                                              |

## Privacidad y captura de contenido

El contenido del modelo/herramienta en bruto **no** se exporta de forma predeterminada. Los spans transportan identificadores limitados
(canal, proveedor, modelo, categoría de error, IDs de solicitud solo con hash)
y nunca incluyen texto del prompt, texto de respuesta, entradas de herramientas, salidas de herramientas o
claves de sesión.

Las solicitudes de modelo salientes pueden incluir un encabezado W3C `traceparent`. Dicho encabezado se
genera únicamente a partir del contexto de seguimiento de diagnóstico propiedad de OpenClaw para la llamada al modelo
activa. Los encabezados `traceparent` proporcionados por el llamador existente se reemplazan, por lo que los complementos o
las opciones personalizadas del proveedor no pueden falsificar el linaje de seguimiento entre servicios.

Establezca `diagnostics.otel.captureContent.*` en `true` solo cuando su recopilador y
política de retención estén aprobados para el texto de prompt, respuesta, herramienta o prompt del
sistema. Cada subclave es de participación independiente:

- `inputMessages` — contenido del prompt del usuario.
- `outputMessages` — contenido de la respuesta del modelo.
- `toolInputs` — cargas útiles de argumentos de herramientas.
- `toolOutputs` — cargas útiles de resultados de herramientas.
- `systemPrompt` — prompt del sistema/desarrollador ensamblado.

Cuando se habilita cualquier subclave, los spans de modelo y de herramienta obtienen atributos `openclaw.content.*` limitados y redactados solo para esa clase.

## Muestreo y vaciado

- **Trazas:** `diagnostics.otel.sampleRate` (solo span raíz, `0.0` descarta todo,
  `1.0` mantiene todo).
- **Métricas:** `diagnostics.otel.flushIntervalMs` (mínimo `1000`).
- **Registros:** Los registros OTLP respetan `logging.level` (nivel de registro de archivo). Utilizan la
  ruta de redacción de registros de diagnóstico, no el formato de consola. Las instalaciones
  de alto volumen deberían preferir el muestreo/filtrado del recolector OTLP sobre el muestreo local.
- **Correlación de registros de archivo:** Los registros de archivo JSONL incluyen `traceId`,
  `spanId`, `parentSpanId` y `traceFlags` de nivel superior cuando la llamada de registro lleva un
  contexto de traza de diagnóstico válido, lo que permite a los procesadores de registros unir las líneas de registro locales con
  los spans exportados.
- **Correlación de solicitudes:** Las solicitudes HTTP del Gateway y los tramas WebSocket crean un
  ámbito de traza de solicitud interno. Los registros y eventos de diagnóstico dentro de ese ámbito
  heredan la traza de solicitud de forma predeterminada, mientras que los spans de ejecución de agente y llamada de modelo se
  crean como hijos para que los encabezados `traceparent` del proveedor se mantengan en la misma traza.

## Métricas exportadas

### Uso del modelo

- `openclaw.tokens` (contador, attrs: `openclaw.token`, `openclaw.channel`, `openclaw.provider`, `openclaw.model`, `openclaw.agent`)
- `openclaw.cost.usd` (contador, attrs: `openclaw.channel`, `openclaw.provider`, `openclaw.model`)
- `openclaw.run.duration_ms` (histograma, attrs: `openclaw.channel`, `openclaw.provider`, `openclaw.model`)
- `openclaw.context.tokens` (histogram, attrs: `openclaw.context`, `openclaw.channel`, `openclaw.provider`, `openclaw.model`)
- `gen_ai.client.token.usage` (histogram, métrica de convenciones semánticas de GenAI, attrs: `gen_ai.token.type` = `input`/`output`, `gen_ai.provider.name`, `gen_ai.operation.name`, `gen_ai.request.model`)
- `gen_ai.client.operation.duration` (histogram, segundos, métrica de convenciones semánticas de GenAI, attrs: `gen_ai.provider.name`, `gen_ai.operation.name`, `gen_ai.request.model`, opcional `error.type`)
- `openclaw.model_call.duration_ms` (histogram, attrs: `openclaw.provider`, `openclaw.model`, `openclaw.api`, `openclaw.transport`, además de `openclaw.errorCategory` y `openclaw.failureKind` en errores clasificados)
- `openclaw.model_call.request_bytes` (histogram, tamaño en bytes UTF-8 de la carga útil final de la solicitud del modelo; sin contenido de la carga útil sin procesar)
- `openclaw.model_call.response_bytes` (histogram, tamaño en bytes UTF-8 de los eventos de respuesta del modelo transmitidos; sin contenido de respuesta sin procesar)
- `openclaw.model_call.time_to_first_byte_ms` (histogram, tiempo transcurrido antes del primer evento de respuesta transmitido)

### Flujo de mensajes

- `openclaw.webhook.received` (contador, attrs: `openclaw.channel`, `openclaw.webhook`)
- `openclaw.webhook.error` (contador, attrs: `openclaw.channel`, `openclaw.webhook`)
- `openclaw.webhook.duration_ms` (histogram, attrs: `openclaw.channel`, `openclaw.webhook`)
- `openclaw.message.queued` (contador, attrs: `openclaw.channel`, `openclaw.source`)
- `openclaw.message.processed` (contador, attrs: `openclaw.channel`, `openclaw.outcome`)
- `openclaw.message.duration_ms` (histogram, attrs: `openclaw.channel`, `openclaw.outcome`)
- `openclaw.message.delivery.started` (contador, attrs: `openclaw.channel`, `openclaw.delivery.kind`)
- `openclaw.message.delivery.duration_ms` (histograma, attrs: `openclaw.channel`, `openclaw.delivery.kind`, `openclaw.outcome`, `openclaw.errorCategory`)

### Colas y sesiones

- `openclaw.queue.lane.enqueue` (contador, attrs: `openclaw.lane`)
- `openclaw.queue.lane.dequeue` (contador, attrs: `openclaw.lane`)
- `openclaw.queue.depth` (histograma, attrs: `openclaw.lane` o `openclaw.channel=heartbeat`)
- `openclaw.queue.wait_ms` (histograma, attrs: `openclaw.lane`)
- `openclaw.session.state` (contador, attrs: `openclaw.state`, `openclaw.reason`)
- `openclaw.session.stuck` (contador, attrs: `openclaw.state`)
- `openclaw.session.stuck_age_ms` (histograma, attrs: `openclaw.state`)
- `openclaw.run.attempt` (contador, attrs: `openclaw.attempt`)

### Ciclo de vida del arnés

- `openclaw.harness.duration_ms` (histograma, attrs: `openclaw.harness.id`, `openclaw.harness.plugin`, `openclaw.outcome`, `openclaw.harness.phase` en errores)

### Exec

- `openclaw.exec.duration_ms` (histograma, attrs: `openclaw.exec.target`, `openclaw.exec.mode`, `openclaw.outcome`, `openclaw.failureKind`)

### Interno de diagnósticos (memoria y bucle de herramientas)

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
  - `openclaw.errorCategory` y `openclaw.failureKind` opcional en caso de error
  - `openclaw.model_call.request_bytes`, `openclaw.model_call.response_bytes`, `openclaw.model_call.time_to_first_byte_ms`
  - `openclaw.provider.request_id_hash` (hash basado en SHA limitado del id de solicitud del proveedor ascendente; los ids sin procesar no se exportan)
- `openclaw.harness.run`
  - `openclaw.harness.id`, `openclaw.harness.plugin`, `openclaw.outcome`, `openclaw.provider`, `openclaw.model`, `openclaw.channel`
  - Al completarse: `openclaw.harness.result_classification`, `openclaw.harness.yield_detected`, `openclaw.harness.items.started`, `openclaw.harness.items.completed`, `openclaw.harness.items.active`
  - En caso de error: `openclaw.harness.phase`, `openclaw.errorCategory`, `openclaw.harness.cleanup_failed` opcional
- `openclaw.tool.execution`
  - `gen_ai.tool.name`, `openclaw.toolName`, `openclaw.errorCategory`, `openclaw.tool.params.*`
- `openclaw.exec`
  - `openclaw.exec.target`, `openclaw.exec.mode`, `openclaw.outcome`, `openclaw.failureKind`, `openclaw.exec.command_length`, `openclaw.exec.exit_code`, `openclaw.exec.timed_out`
- `openclaw.webhook.processed`
  - `openclaw.channel`, `openclaw.webhook`, `openclaw.chatId`
- `openclaw.webhook.error`
  - `openclaw.channel`, `openclaw.webhook`, `openclaw.chatId`, `openclaw.error`
- `openclaw.message.processed`
  - `openclaw.channel`, `openclaw.outcome`, `openclaw.chatId`, `openclaw.messageId`, `openclaw.reason`
- `openclaw.message.delivery`
  - `openclaw.channel`, `openclaw.delivery.kind`, `openclaw.outcome`, `openclaw.errorCategory`, `openclaw.delivery.result_count`
- `openclaw.session.stuck`
  - `openclaw.state`, `openclaw.ageMs`, `openclaw.queueDepth`
- `openclaw.context.assembled`
  - `openclaw.prompt.size`, `openclaw.history.size`, `openclaw.context.tokens`, `openclaw.errorCategory` (sin contenido de prompt, historial, respuesta o clave de sesión)
- `openclaw.tool.loop`
  - `openclaw.toolName`, `openclaw.outcome`, `openclaw.iterations`, `openclaw.errorCategory` (sin mensajes de bucle, parámetros o resultados de herramientas)
- `openclaw.memory.pressure`
  - `openclaw.memory.level`, `openclaw.memory.heap_used_bytes`, `openclaw.memory.rss_bytes`

Cuando la captura de contenido está explícitamente habilitada, los intervalos de modelo y herramienta también pueden incluir atributos `openclaw.content.*` limitados y redactados para las clases de contenido específicas que aceptó.

## Catálogo de eventos de diagnóstico

Los eventos a continuación respaldan las métricas y los intervalos anteriores. Los complementos también pueden suscribirse a ellos directamente sin exportación OTLP.

**Uso del modelo**

- `model.usage` — tokens, costo, duración, contexto, proveedor/modelo/canal,
  ids de sesión. `usage` es la contabilidad del proveedor/turno para costo y telemetría;
  `context.used` es la instantánea actual del prompt/contexto y puede ser menor que
  la del proveedor `usage.total` cuando están involucradas entradas en caché o llamadas a bucles de herramientas.

**Flujo de mensajes**

- `webhook.received` / `webhook.processed` / `webhook.error`
- `message.queued` / `message.processed`
- `message.delivery.started` / `message.delivery.completed` / `message.delivery.error`

**Cola y sesión**

- `queue.lane.enqueue` / `queue.lane.dequeue`
- `session.state` / `session.stuck`
- `run.attempt`
- `diagnostic.heartbeat` (contadores agregados: webhooks/cola/sesión)

**Ciclo de vida del arnés**

- `harness.run.started` / `harness.run.completed` / `harness.run.error` —
  ciclo de vida por ejecución para el arnés del agente. Incluye `harnessId`, opcional
  `pluginId`, proveedor/modelo/canal e id de ejecución. La finalización añade
  `durationMs`, `outcome`, opcional `resultClassification`, `yieldDetected`,
  y recuentos `itemLifecycle`. Los errores añaden `phase`
  (`prepare`/`start`/`send`/`resolve`/`cleanup`), `errorCategory`, y
  opcional `cleanupFailed`.

**Exec**

- `exec.process.completed` — resultado terminal, duración, objetivo, modo, código
  de salida y tipo de fallo. El texto del comando y los directorios de trabajo no están
  incluidos.

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

O como una anulación de env de una sola vez:

```bash
OPENCLAW_DIAGNOSTICS=telegram.http,telegram.payload openclaw gateway
```

El resultado de los indicadores va al archivo de registro estándar (`logging.file`) y todavía
es redactado por `logging.redactSensitive`. Guía completa:
[Indicadores de diagnóstico](/es/diagnostics/flags).

## Desactivar

```json5
{
  diagnostics: { otel: { enabled: false } },
}
```

También puede dejar `diagnostics-otel` fuera de `plugins.allow`, o ejecutar
`openclaw plugins disable diagnostics-otel`.

## Relacionado

- [Registro](/es/logging) — registros de archivos, salida de consola, seguimiento de CLI y la pestaña Registros de la interfaz de usuario de Control
- [Aspectos internos del registro de Gateway](/es/gateway/logging) — estilos de registro WS, prefijos de subsistema y captura de consola
- [Indicadores de diagnóstico](/es/diagnostics/flags) — indicadores de registro de depuración específicos
- [Exportación de diagnóstico](/es/gateway/diagnostics) — herramienta de paquete de soporte para operadores (separada de la exportación OTEL)
- [Referencia de configuración](/es/gateway/configuration-reference#diagnostics) — referencia completa del campo `diagnostics.*`
