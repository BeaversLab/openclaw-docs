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

Si el Gateway de loopback local implícito solicita emparejamiento, se cierra durante la conexión o expira antes de que `logs.tail` responda, `openclaw logs` vuelve automáticamente al archivo de registro del Gateway configurado. Los destinos `--url` explícitos no utilizan este respaldo.

Si el Gateway no está accesible, la CLI imprime un breve consejo para ejecutar:

```bash
openclaw doctor
```

### Interfaz de usuario de control (web)

La pestaña **Logs** (Registros) de la Interfaz de usuario de control sigue el mismo archivo usando `logs.tail`.
Consulte [Control UI](/es/web/control-ui) para saber cómo abrirla.

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

La actividad de Talk, voz en tiempo real y salas administradas emite registros de ciclo de vida delimitados a través de esta misma canalización de registro de archivo. Estos registros incluyen tipo de evento, modo, transporte, proveedor y mediciones de tamaño/tiempo cuando están disponibles, pero omiten el texto de la transcripción, las cargas útiles de audio, los ids de turno, los ids de llamada y los ids de elementos del proveedor.

### Salida de consola

Los registros de la consola son **conscientes de TTY** y están formateados para facilitar la lectura:

- Prefijos de subsistema (p. ej., `gateway/channels/whatsapp`)
- Coloreado por nivel (información/advertencia/error)
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

Toda la configuración de registro reside en `logging` en `~/.openclaw/openclaw.json`.

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

Puede anular ambos mediante la variable de entorno **`OPENCLAW_LOG_LEVEL`** (por ejemplo, `OPENCLAW_LOG_LEVEL=debug`). La variable de entorno tiene prioridad sobre el archivo de configuración, por lo que puede aumentar el nivel de detalle para una sola ejecución sin editar `openclaw.json`. También puede pasar la opción global de CLI **`--log-level <level>`** (por ejemplo, `openclaw --log-level debug gateway run`), que anula la variable de entorno para ese comando.

`--verbose` solo afecta el nivel de detalle de los registros de la consola y de WS; no cambia los niveles de registro de archivo.

### Correlación de trazas

Los registros de archivo son JSONL. Cuando una llamada de registro lleva un contexto de diagnóstico de traza válido, OpenClaw escribe los campos de traza como claves JSON de nivel superior (`traceId`, `spanId`, `parentSpanId`, `traceFlags`) para que los procesadores de registros externos puedan correlacionar la línea con los intervalos OTEL y la propagación del `traceparent` del proveedor.

Las solicitudes HTTP de Gateway y los marcos WebSocket de Gateway establecen un ámbito de traza de solicitud interno. Los registros y eventos de diagnóstico emitidos dentro de ese ámbito asíncrono heredan la traza de solicitud cuando no pasan un contexto de traza explícito. Las trazas de ejecución de agente y de llamada al modelo se convierten en hijas de la traza de solicitud activa, por lo que los registros locales, las instantáneas de diagnóstico, los intervalos OTEL y los encabezados `traceparent` de proveedores de confianza pueden unirse por `traceId` sin registrar el contenido sin procesar de la solicitud o del modelo.

Los registros del ciclo de vida de las conversaciones también fluyen hacia los registros OTLP cuando la exportación de registros de OpenTelemetry está habilitada, utilizando los mismos atributos delimitados que los registros de archivo.

### Tamaño y momento de la llamada al modelo

Los diagnósticos de llamadas al modelo registran mediciones delimitadas de solicitud/respuesta sin capturar el contenido sin procesar del prompt o la respuesta:

- `requestPayloadBytes`: tamaño en bytes UTF-8 de la carga útil final de la solicitud del modelo
- `responseStreamBytes`: tamaño en bytes UTF-8 de los eventos de respuesta del modelo transmitidos
- `timeToFirstByteMs`: tiempo transcurrido antes del primer evento de respuesta transmitido
- `durationMs`: duración total de la llamada al modelo

Estos campos están disponibles para las instantáneas de diagnóstico, los ganchos de complementos de llamadas al modelo y los intervalos/métricas de llamadas al modelo OTEL cuando la exportación de diagnósticos está habilitada.

### Estilos de consola

`logging.consoleStyle`:

- `pretty`: amigable para humanos, con colores y marcas de tiempo.
- `compact`: salida más compacta (ideal para sesiones largas).
- `json`: JSON por línea (para procesadores de registros).

### Redacción

OpenClaw puede redactar tokens confidenciales antes de que lleguen a la salida de la consola, los registros de archivos,
los registros de eventos OTLP, el texto de la transcripción de la sesión persistida o las cargas útiles de eventos de
herramientas de la interfaz de usuario de control (argumentos de inicio de herramienta, cargas útiles de resultados
parciales/finales, salida ejec derivada y resúmenes de parches):

- `logging.redactSensitive`: `off` | `tools` (predeterminado: `tools`)
- `logging.redactPatterns`: lista de cadenas de regex para anular el conjunto predeterminado. Los patrones personalizados se aplican además de los valores predeterminados integrados para las cargas útiles de herramientas de la interfaz de usuario de control, por lo que agregar un patrón nunca debilita la redacción de los valores ya capturados por los valores predeterminados.

Los registros de archivos y las transcripciones de sesión permanecen en formato JSONL, pero los valores secretos que coinciden se
enmascaran antes de que la línea o el mensaje se escriba en el disco. La redacción es de mejor esfuerzo:
se aplica al contenido de mensajes con texto y cadenas de registro, no a todos
los campos de identificador o carga útil binaria.

Los valores predeterminados integrados cubren credenciales de API comunes y nombres de campos de credenciales de pago
tales como el número de tarjeta, CVC/CVV, token de pago compartido y credencial de pago
cuando aparecen como campos JSON, parámetros de URL, indicadores de CLI o asignaciones.

`logging.redactSensitive: "off"` solo deshabilita esta política general de registro/transcripción.
OpenClaw todavía redacta las cargas útiles en el límite de seguridad que se pueden mostrar a los clientes
de la interfaz de usuario, paquetes de soporte, observadores de diagnóstico, avisos de aprobación o herramientas
de agente. Los ejemplos incluyen eventos de llamadas a herramientas de la interfaz de usuario de control, salida `sessions_history`,
exportaciones de soporte de diagnóstico, observaciones de errores del proveedor, visualización de comandos de aprobación de ejecución
y registros del protocolo WebSocket de Gateway. Los patrones personalizados `logging.redactPatterns`
aún pueden agregar patrones específicos del proyecto en esas superficies.

## Diagnóstico y OpenTelemetry

Los diagnósticos son eventos estructurados y legibles por máquina para ejecuciones de modelo y
telemetría de flujo de mensajes (webhooks, puestos en cola, estado de sesión). **No**
reemplazan los registros; alimentan métricas, trazas y exportadores. Los eventos se emiten
en proceso, independientemente de si los exporta o no.

Dos superficies adyacentes:

- **Exportación de OpenTelemetry** — envía métricas, trazas y registros a través de OTLP/HTTP a
  cualquier recopilador o backend compatible con OpenTelemetry (Grafana, Datadog,
  Honeycomb, New Relic, Tempo, etc.). La configuración completa, el catálogo de señales,
  los nombres de métricas/trazas, las variables de entorno y el modelo de privacidad se encuentran en una página dedicada:
  [Exportación de OpenTelemetry](/es/gateway/opentelemetry).
- **Marcadores de diagnóstico** — marcadores de registro de depuración específicos que dirigen registros adicionales a
  `logging.file` sin elevar `logging.level`. Los marcadores no distinguen entre mayúsculas y minúsculas
  y admiten comodines (`telegram.*`, `*`). Configúrelos bajo `diagnostics.flags`
  o mediante la anulación de la variable de entorno `OPENCLAW_DIAGNOSTICS=...`. Guía completa:
  [Marcadores de diagnóstico](/es/diagnostics/flags).

Para habilitar eventos de diagnóstico para complementos o receptores personalizados sin exportación OTLP:

```json5
{
  diagnostics: { enabled: true },
}
```

Para la exportación OTLP a un recopilador, consulte [Exportación de OpenTelemetry](/es/gateway/opentelemetry).

## Consejos de solución de problemas

- **¿No se puede alcanzar el Gateway?** Ejecute `openclaw doctor` primero.
- **¿Registros vacíos?** Verifique que el Gateway se esté ejecutando y escribiendo en la ruta del archivo
  en `logging.file`.
- **¿Necesita más detalles?** Establezca `logging.level` en `debug` o `trace` y vuelva a intentarlo.

## Relacionado

- [Exportación de OpenTelemetry](/es/gateway/opentelemetry) — exportación OTLP/HTTP, catálogo de métricas/trazas, modelo de privacidad
- [Marcadores de diagnóstico](/es/diagnostics/flags) — marcadores de registro de depuración específicos
- [Interno del registro del Gateway](/es/gateway/logging) — estilos de registro WS, prefijos de subsistema y captura de consola
- [Referencia de configuración](/es/gateway/configuration-reference#diagnostics) — referencia completa del campo `diagnostics.*`
