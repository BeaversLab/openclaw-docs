---
summary: "Resumen del registro: registros de archivo, salida de consola, seguimiento en vivo de la CLI y la interfaz de usuario de control"
read_when:
  - You need a beginner-friendly overview of logging
  - You want to configure log levels or formats
  - You are troubleshooting and need to find logs quickly
title: "Resumen del registro"
---

# Registro

OpenClaw registra en dos lugares:

- **Registros de archivo** (líneas JSON) escritos por el Gateway.
- **Salida de consola** que se muestra en terminales y en la interfaz de usuario de control.

Esta página explica dónde residen los registros, cómo leerlos y cómo configurar los
niveles y formatos de registro.

## Dónde residen los registros

De forma predeterminada, el Gateway escribe un archivo de registro rotativo en:

`/tmp/openclaw/openclaw-YYYY-MM-DD.log`

La fecha utiliza la zona horaria local del host de la puerta de enlace.

Puedes anular esto en `~/.openclaw/openclaw.json`:

```json
{
  "logging": {
    "file": "/path/to/openclaw.log"
  }
}
```

## Cómo leer los registros

### CLI: seguimiento en vivo (recomendado)

Usa la CLI para hacer un seguimiento del archivo de registro de la puerta de enlace a través de RPC:

```bash
openclaw logs --follow
```

Modos de salida:

- **Sesiones TTY**: líneas de registro estructuradas, bonitas y coloreadas.
- **Sesiones que no son TTY**: texto sin formato.
- `--json`: JSON delimitado por líneas (un evento de registro por línea).
- `--plain`: forzar texto sin formato en sesiones TTY.
- `--no-color`: deshabilitar colores ANSI.

En modo JSON, la CLI emite objetos etiquetados con `type`:

- `meta`: metadatos de la secuencia (archivo, cursor, tamaño)
- `log`: entrada de registro analizada
- `notice`: sugerencias de truncamiento / rotación
- `raw`: línea de registro no analizada

Si el Gateway es inalcanzable, la CLI imprime una breve sugerencia para ejecutar:

```bash
openclaw doctor
```

### Interfaz de usuario de control (web)

La pestaña **Registros** de la interfaz de usuario de control realiza un seguimiento del mismo archivo usando `logs.tail`.
Consulta [/web/control-ui](/en/web/control-ui) para saber cómo abrirla.

### Registros solo de canal

Para filtrar la actividad del canal (WhatsApp/Telegram/etc), usa:

```bash
openclaw channels logs --channel whatsapp
```

## Formatos de registro

### Registros de archivo (JSONL)

Cada línea del archivo de registro es un objeto JSON. La CLI y la interfaz de usuario de control analizan estas
entradas para representar una salida estructurada (hora, nivel, subsistema, mensaje).

### Salida de consola

Los registros de la consola son **conscientes de TTY** y están formateados para facilitar la lectura:

- Prefijos de subsistema (p. ej., `gateway/channels/whatsapp`)
- Coloreado de niveles (información/advertencia/error)
- Modo compacto o JSON opcional

El formato de la consola está controlado por `logging.consoleStyle`.

## Configuración del registro

Toda la configuración de registro se encuentra en `logging` en `~/.openclaw/openclaw.json`.

```json
{
  "logging": {
    "level": "info",
    "file": "/tmp/openclaw/openclaw-YYYY-MM-DD.log",
    "consoleLevel": "info",
    "consoleStyle": "pretty",
    "redactSensitive": "tools",
    "redactPatterns": ["sk-.*"]
  }
}
```

### Niveles de registro

- `logging.level`: nivel de **registros de archivo** (JSONL).
- `logging.consoleLevel`: nivel de verbosidad de la **consola**.

Puede anular ambos mediante la variable de entorno **`OPENCLAW_LOG_LEVEL`** (por ejemplo, `OPENCLAW_LOG_LEVEL=debug`). La variable de entorno tiene prioridad sobre el archivo de configuración, por lo que puede aumentar la verbosidad para una sola ejecución sin editar `openclaw.json`. También puede pasar la opción global de CLI **`--log-level <level>`** (por ejemplo, `openclaw --log-level debug gateway run`), que anula la variable de entorno para ese comando.

`--verbose` solo afecta la salida de la consola; no cambia los niveles de registro de archivo.

### Estilos de consola

`logging.consoleStyle`:

- `pretty`\_\_: fácil de usar, colorido, con marcas de tiempo.
- `compact`\_\_: salida más compacta (ideal para sesiones largas).
- `json`\_\_: JSON por línea (para procesadores de registros).

### Ocultación

Los resúmenes de herramientas pueden ocultar tokens sensibles antes de que lleguen a la consola:

- `logging.redactSensitive`: `off` | `tools` (predeterminado: `tools`)
- `logging.redactPatterns`: lista de cadenas de regex para anular el conjunto predeterminado

La ocultación afecta solo a la **salida de la consola** y no altera los registros de archivo.

## Diagnóstico + OpenTelemetry

Los diagnósticos son eventos estructurados y legibles por máquina para ejecuciones de modelos **y**
telemetría de flujo de mensajes (webhooks, cola, estado de la sesión). **No**
reemplazan los registros; existen para alimentar métricas, trazas y otros exportadores.

Los eventos de diagnóstico se emiten en proceso, pero los exportadores solo se adjuntan cuando
el diagnóstico + el complemento del exportador están habilitados.

### OpenTelemetry vs OTLP

- **OpenTelemetry (OTel)**: el modelo de datos + SDK para trazas, métricas y registros.
- **OTLP**: el protocolo de cable utilizado para exportar datos OTel a un recolector/backend.
- OpenClaw exporta actualmente a través de **OTLP/HTTP (protobuf)**.

### Señales exportadas

- **Métricas**: contadores + histogramas (uso de tokens, flujo de mensajes, cola).
- **Trazas**: intervalos para el uso del modelo + procesamiento de webhooks/mensajes.
- **Registros**: exportados a través de OTLP cuando `diagnostics.otel.logs` está habilitado. El
  volumen de registros puede ser alto; tenga en cuenta `logging.level` y los filtros del exportador.

### Catálogo de eventos de diagnóstico

Uso del modelo:

- `model.usage`: tokens, costo, duración, contexto, proveedor/modelo/canal, ids de sesión.

Flujo de mensajes:

- `webhook.received`: ingreso de webhook por canal.
- `webhook.processed`: webhook manejado + duración.
- `webhook.error`: errores del manejador de webhook.
- `message.queued`: mensaje puesto en cola para procesamiento.
- `message.processed`: resultado + duración + error opcional.

Cola + sesión:

- `queue.lane.enqueue`: puesta en cola del carril de la cola de comandos + profundidad.
- `queue.lane.dequeue`: extracción del carril de la cola de comandos + tiempo de espera.
- `session.state`: transición de estado de sesión + motivo.
- `session.stuck`: advertencia de sesión atascada + antigüedad.
- `run.attempt`: metadatos de reintento/intento de ejecución.
- `diagnostic.heartbeat`: contadores agregados (webhooks/cola/sesión).

### Habilitar diagnóstico (sin exportador)

Use esto si desea que los eventos de diagnóstico estén disponibles para complementos o receptores personalizados:

```json
{
  "diagnostics": {
    "enabled": true
  }
}
```

### Marcadores de diagnóstico (registros específicos)

Use marcadores para activar registros de depuración adicionales y específicos sin aumentar `logging.level`.
Los marcadores no distinguen entre mayúsculas y minúsculas y admiten comodines (por ejemplo, `telegram.*` o `*`).

```json
{
  "diagnostics": {
    "flags": ["telegram.http"]
  }
}
```

Sobrescritura de entorno (único):

```
OPENCLAW_DIAGNOSTICS=telegram.http,telegram.payload
```

Notas:

- Los registros de marcadores van al archivo de registro estándar (igual que `logging.file`).
- El resultado todavía se redacta según `logging.redactSensitive`.
- Guía completa: [/diagnostics/flags](/en/diagnostics/flags).

### Exportar a OpenTelemetry

Los diagnósticos se pueden exportar a través del complemento `diagnostics-otel` (OTLP/HTTP). Esto
funciona con cualquier recopilador/backend de OpenTelemetry que acepte OTLP/HTTP.

```json
{
  "plugins": {
    "allow": ["diagnostics-otel"],
    "entries": {
      "diagnostics-otel": {
        "enabled": true
      }
    }
  },
  "diagnostics": {
    "enabled": true,
    "otel": {
      "enabled": true,
      "endpoint": "http://otel-collector:4318",
      "protocol": "http/protobuf",
      "serviceName": "openclaw-gateway",
      "traces": true,
      "metrics": true,
      "logs": true,
      "sampleRate": 0.2,
      "flushIntervalMs": 60000
    }
  }
}
```

Notas:

- También puede habilitar el complemento con `openclaw plugins enable diagnostics-otel`.
- `protocol` actualmente solo admite `http/protobuf`. `grpc` se ignora.
- Las métricas incluyen el uso de tokens, costo, tamaño del contexto, duración de la ejecución y contadores/histogramas de flujo de mensajes (webhooks, puesta en cola, estado de la sesión, profundidad de cola/espera).
- Las trazas/métricas se pueden activar o desactivar con `traces` / `metrics` (predeterminado: activado). Las trazas incluyen intervalos de uso del modelo más intervalos de procesamiento de webhooks/mensajes cuando están activadas.
- Establezca `headers` cuando su recopilador requiera autenticación.
- Variables de entorno compatibles: `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME`, `OTEL_EXPORTER_OTLP_PROTOCOL`.

### Métricas exportadas (nombres + tipos)

Uso del modelo:

- `openclaw.tokens` (contador, attrs: `openclaw.token`, `openclaw.channel`, `openclaw.provider`, `openclaw.model`)
- `openclaw.cost.usd` (contador, attrs: `openclaw.channel`, `openclaw.provider`, `openclaw.model`)
- `openclaw.run.duration_ms` (histograma, attrs: `openclaw.channel`, `openclaw.provider`, `openclaw.model`)
- `openclaw.context.tokens` (histograma, attrs: `openclaw.context`, `openclaw.channel`, `openclaw.provider`, `openclaw.model`)

Flujo de mensajes:

- `openclaw.webhook.received` (contador, attrs: `openclaw.channel`, `openclaw.webhook`)
- `openclaw.webhook.error` (contador, attrs: `openclaw.channel`, `openclaw.webhook`)
- `openclaw.webhook.duration_ms` (histograma, attrs: `openclaw.channel`, `openclaw.webhook`)
- `openclaw.message.queued` (contador, attrs: `openclaw.channel`, `openclaw.source`)
- `openclaw.message.processed` (contador, attrs: `openclaw.channel`, `openclaw.outcome`)
- `openclaw.message.duration_ms` (histograma, attrs: `openclaw.channel`, `openclaw.outcome`)

Colas + sesiones:

- `openclaw.queue.lane.enqueue` (contador, attrs: `openclaw.lane`)
- `openclaw.queue.lane.dequeue` (contador, attrs: `openclaw.lane`)
- `openclaw.queue.depth` (histograma, attrs: `openclaw.lane` o
  `openclaw.channel=heartbeat`)
- `openclaw.queue.wait_ms` (histograma, attrs: `openclaw.lane`)
- `openclaw.session.state` (contador, attrs: `openclaw.state`, `openclaw.reason`)
- `openclaw.session.stuck` (contador, attrs: `openclaw.state`)
- `openclaw.session.stuck_age_ms` (histograma, attrs: `openclaw.state`)
- `openclaw.run.attempt` (contador, attrs: `openclaw.attempt`)

### Spans exportados (nombres + atributos clave)

- `openclaw.model.usage`
  - `openclaw.channel`, `openclaw.provider`, `openclaw.model`
  - `openclaw.sessionKey`, `openclaw.sessionId`
  - `openclaw.tokens.*` (input/output/cache_read/cache_write/total)
- `openclaw.webhook.processed`
  - `openclaw.channel`, `openclaw.webhook`, `openclaw.chatId`
- `openclaw.webhook.error`
  - `openclaw.channel`, `openclaw.webhook`, `openclaw.chatId`,
    `openclaw.error`
- `openclaw.message.processed`
  - `openclaw.channel`, `openclaw.outcome`, `openclaw.chatId`,
    `openclaw.messageId`, `openclaw.sessionKey`, `openclaw.sessionId`,
    `openclaw.reason`
- `openclaw.session.stuck`
  - `openclaw.state`, `openclaw.ageMs`, `openclaw.queueDepth`,
    `openclaw.sessionKey`, `openclaw.sessionId`

### Muestreo y vaciado

- Muestreo de trazas: `diagnostics.otel.sampleRate` (0.0–1.0, solo spans raíz).
- Intervalo de exportación de métricas: `diagnostics.otel.flushIntervalMs` (mínimo 1000ms).

### Notas del protocolo

- Los endpoints OTLP/HTTP se pueden configurar mediante `diagnostics.otel.endpoint` o
  `OTEL_EXPORTER_OTLP_ENDPOINT`.
- Si el extremo ya contiene `/v1/traces` o `/v1/metrics`, se usa tal cual.
- Si el extremo ya contiene `/v1/logs`, se usa tal cual para los registros.
- `diagnostics.otel.logs` habilita la exportación de registros OTLP para la salida del registrador principal.

### Comportamiento de la exportación de registros

- Los registros OTLP utilizan los mismos registros estructurados escritos en `logging.file`.
- Respeta `logging.level` (nivel de registro de archivo). La redacción de la consola **no** se aplica
  a los registros OTLP.
- Las instalaciones de gran volumen deberían preferir el muestreo/filtrado del recopilador OTLP.

## Consejos de solución de problemas

- **¿No se puede alcanzar la puerta de enlace?** Ejecute primero `openclaw doctor`.
- **¿Registros vacíos?** Compruebe que la puerta de enlace se esté ejecutando y escribiendo en la ruta de archivo
  en `logging.file`.
- **¿Necesita más detalles?** Establezca `logging.level` en `debug` o `trace` y vuelva a intentarlo.
