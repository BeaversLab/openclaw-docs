---
summary: "Archivos de registro, salida de consola, seguimiento de CLI y la pestaña Registros de la interfaz de control"
read_when:
  - You need a beginner-friendly overview of OpenClaw logging
  - You want to configure log levels, formats, or redaction
  - You are troubleshooting and need to find logs quickly
title: "Registro"
---

OpenClaw tiene dos superficies principales de registro:

- **Archivos de registro** (líneas JSON) escritos por el Gateway.
- **Salida de consola** que se muestra en terminales y en la interfaz de depuración del Gateway.

La pestaña **Registros** de la interfaz de control realiza un seguimiento del archivo de registro del gateway. Esta página explica dónde residen los registros, cómo leerlos y cómo configurar los niveles y formatos de registro.

## Dónde residen los registros

De forma predeterminada, el Gateway escribe un archivo de registro rotativo en:

`/tmp/openclaw/openclaw-YYYY-MM-DD.log`

La fecha usa la zona horaria local del host del gateway.

Cada archivo rota cuando alcanza `logging.maxFileBytes` (predeterminado: 100 MB).
OpenClaw conserva hasta cinco archivos numerados junto al archivo activo, como
`openclaw-YYYY-MM-DD.1.log`, y sigue escribiendo en un registro activo nuevo en lugar de
suprimir el diagnóstico.

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

Opciones actuales útiles:

- `--local-time`: renderiza las marcas de tiempo en su zona horaria local
- `--url <url>` / `--token <token>` / `--timeout <ms>`: indicadores RPC estándar del Gateway
- `--expect-final`: indicador de espera de respuesta final de RPC con respaldo de agente (aceptado aquí a través de la capa de cliente compartida)

Modos de salida:

- **Sesiones TTY**: líneas de registro estructuradas, con colores y bonitas.
- **Sesiones que no son TTY**: texto sin formato.
- `--json`: JSON delimitado por líneas (un evento de registro por línea).
- `--plain`: fuerza texto sin formato en sesiones TTY.
- `--no-color`: deshabilita los colores ANSI.

Cuando pasa un `--url` explícito, la CLI no aplica automáticamente la configuración o las credenciales del entorno; incluya `--token` usted mismo si el Gateway de destino requiere autenticación.

En modo JSON, la CLI emite objetos etiquetados con `type`:

- `meta`: metadatos de la secuencia (archivo, cursor, tamaño)
- `log`: entrada de registro analizada
- `notice`: sugerencias de truncamiento / rotación
- `raw`: línea de registro no analizada

Si el Gateway de bucle de retorno local solicita emparejamiento, `openclaw logs` vuelve automáticamente al archivo de registro local configurado. Los destinos `--url` explícitos no usan esta alternativa.

Si el Gateway no está accesible, la CLI imprime un breve consejo para ejecutar:

```bash
openclaw doctor
```

### Interfaz de usuario de control (web)

La pestaña **Logs** (Registros) de la Interfaz de Control realiza un seguimiento del mismo archivo usando `logs.tail`.
Vea [/web/control-ui](/es/web/control-ui) para saber cómo abrirla.

### Registros solo del canal

Para filtrar la actividad del canal (WhatsApp/Telegram/etc), use:

```bash
openclaw channels logs --channel whatsapp
```

## Formatos de registro

### Registros de archivo (JSONL)

Cada línea en el archivo de registro es un objeto JSON. La CLI y la Interfaz de Control analizan estas entradas para generar una salida estructurada (hora, nivel, subsistema, mensaje).

Los registros JSONL de archivos también incluyen campos de nivel superior filtrables por máquina cuando
están disponibles:

- `hostname`: nombre de host del gateway.
- `message`: texto de mensaje de registro aplanado para búsqueda de texto completo.
- `agent_id`: id del agente activo cuando la llamada de registro lleva contexto de agente.
- `session_id`: id/clave de sesión activa cuando la llamada de registro lleva contexto de sesión.
- `channel`: canal activo cuando la llamada de registro lleva contexto de canal.

OpenClaw preserva los argumentos de registro estructurados originales junto con estos campos
para que los analizadores existentes que leen claves de argumentos numeradas de tslog sigan funcionando.

### Salida de consola

Los registros de la consola son **conscientes de TTY** y están formateados para facilitar la lectura:

- Prefijos de subsistema (ej. `gateway/channels/whatsapp`)
- Coloreado por nivel (info/warn/error)
- Modo compacto o JSON opcional

El formato de la consola está controlado por `logging.consoleStyle`.

### Registros de WebSocket del Gateway

`openclaw gateway` también tiene registro de protocolo WebSocket para el tráfico RPC:

- modo normal: solo resultados interesantes (errores, errores de análisis, llamadas lentas)
- `--verbose`: todo el tráfico de solicitud/respuesta
- `--ws-log auto|compact|full`: elegir el estilo de representación detallado
- `--compact`: alias para `--ws-log compact`

Ejemplos:

```bash
openclaw gateway
openclaw gateway --verbose --ws-log compact
openclaw gateway --verbose --ws-log full
```

## Configuración del registro

Toda la configuración de registro se encuentra bajo `logging` en `~/.openclaw/openclaw.json`.

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

Puede anular ambos mediante la variable de entorno **`OPENCLAW_LOG_LEVEL`** (ej. `OPENCLAW_LOG_LEVEL=debug`). La variable de entorno tiene prioridad sobre el archivo de configuración, por lo que puede aumentar la verbosidad para una sola ejecución sin editar `openclaw.json`. También puede pasar la opción global de CLI **`--log-level <level>`** (por ejemplo, `openclaw --log-level debug gateway run`), que anula la variable de entorno para ese comando.

`--verbose` solo afecta la salida de la consola y la verbosidad de los registros de WS; no cambia
los niveles de registro de archivos.

### Correlación de trazas

Los registros de archivo son JSONL. Cuando una llamada de registro lleva un contexto de trazas de diagnóstico válido,
OpenClaw escribe los campos de trazas como claves JSON de nivel superior (`traceId`, `spanId`,
`parentSpanId`, `traceFlags`) para que los procesadores de registros externos puedan correlacionar la línea
con los spans OTEL y la propagación del proveedor `traceparent`.

Las solicitudes HTTP de Gateway y los tramas de WebSocket de Gateway establecen un ámbito de trazas de solicitud
interno. Los registros y eventos de diagnóstico emitidos dentro de ese ámbito asíncrono heredan
la traza de solicitud cuando no pasan un contexto de trazas explícito. Las ejecuciones de agente y
las trazas de llamadas a modelo se convierten en hijos de la traza de solicitud activa, por lo que los registros locales,
las instantáneas de diagnóstico, los spans OTEL y los encabezados de proveedor de confianza `traceparent` pueden
unirse mediante `traceId` sin registrar el contenido sin procesar de la solicitud o del modelo.

### Tamaño y cronometraje de la llamada al modelo

Los diagnósticos de llamadas a modelo registran mediciones de solicitud/respuesta delimitadas sin
capturar el contenido sin procesar del prompt o de la respuesta:

- `requestPayloadBytes`: tamaño en bytes UTF-8 de la carga útil de la solicitud final del modelo
- `responseStreamBytes`: tamaño en bytes UTF-8 de los eventos de respuesta del modelo transmitidos
- `timeToFirstByteMs`: tiempo transcurrido antes del primer evento de respuesta transmitido
- `durationMs`: duración total de la llamada al modelo

Estos campos están disponibles para las instantáneas de diagnóstico, los ganchos de complementos de llamadas a modelo y
los spans/métricas de llamadas a modelo de OTEL cuando la exportación de diagnósticos está habilitada.

### Estilos de consola

`logging.consoleStyle`:

- `pretty`: amigable para humanos, coloreado, con marcas de tiempo.
- `compact`: salida más compacta (ideal para sesiones largas).
- `json`: JSON por línea (para procesadores de registros).

### Redacción

OpenClaw puede redactar tokens sensibles antes de que lleguen a la salida de la consola, los registros de archivo,
los registros OTLP o el texto de la transcripción de la sesión persistida:

- `logging.redactSensitive`: `off` | `tools` (predeterminado: `tools`)
- `logging.redactPatterns`: lista de cadenas de expresiones regulares para anular el conjunto predeterminado

Los registros de archivo y las transcripciones de sesión permanecen en formato JSONL, pero los valores secretos que coincidan se enmascaran antes de que la línea o mensaje se escriba en el disco. La redacción es de mejor esfuerzo: se aplica al contenido de los mensajes que contienen texto y a las cadenas de registro, no a todos los identificadores o campos de carga binaria.

## Diagnósticos y OpenTelemetry

Los diagnósticos son eventos estructurados y legibles por máquina para ejecuciones de modelos y telemetría de flujo de mensajes (webhooks, colas, estado de sesión). No reemplazan los registros; alimentan métricas, trazas y exportadores. Los eventos se emiten en proceso, independientemente de si los exporta o no.

Dos superficies adyacentes:

- **Exportación de OpenTelemetry** — envía métricas, trazas y registros a través de OTLP/HTTP a cualquier recopilador o backend compatible con OpenTelemetry (Grafana, Datadog, Honeycomb, New Relic, Tempo, etc.). La configuración completa, el catálogo de señales, los nombres de métricas/trazas, las variables de entorno y el modelo de privacidad se encuentran en una página dedicada: [OpenTelemetry export](/es/gateway/opentelemetry).
- **Marcadores de diagnóstico** — marcadores de registro de depuración específicos que enrutan registros adicionales a `logging.file` sin elevar `logging.level`. Los marcadores no distinguen entre mayúsculas y minúsculas y admiten comodines (`telegram.*`, `*`). Configúrelos bajo `diagnostics.flags` o a través de la sustitución de entorno `OPENCLAW_DIAGNOSTICS=...`. Guía completa: [Diagnostics flags](/es/diagnostics/flags).

Para habilitar eventos de diagnóstico para complementos o sumideros personalizados sin exportación OTLP:

```json5
{
  diagnostics: { enabled: true },
}
```

Para la exportación OTLP a un recopilador, consulte [OpenTelemetry export](/es/gateway/opentelemetry).

## Consejos de solución de problemas

- **¿No se puede alcanzar el Gateway?** Ejecute primero `openclaw doctor`.
- **¿Los registros están vacíos?** Compruebe que el Gateway se esté ejecutando y escribiendo en la ruta de archivo en `logging.file`.
- **¿Necesita más detalles?** Establezca `logging.level` en `debug` o `trace` y vuelva a intentarlo.

## Relacionado

- [OpenTelemetry export](/es/gateway/opentelemetry) — exportación OTLP/HTTP, catálogo de métricas/trazas, modelo de privacidad
- [Diagnostics flags](/es/diagnostics/flags) — marcadores de registro de depuración específicos
- [Interno del registro de Gateway](/es/gateway/logging) — estilos de registro WS, prefijos de subsistema y captura de consola
- [Referencia de configuración](/es/gateway/configuration-reference#diagnostics) — referencia completa del campo `diagnostics.*`
