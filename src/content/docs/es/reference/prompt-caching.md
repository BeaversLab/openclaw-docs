---
title: "Prompt Caching"
summary: "Controles de caché de avisos, orden de combinación, comportamiento del proveedor y patrones de ajuste"
read_when:
  - You want to reduce prompt token costs with cache retention
  - You need per-agent cache behavior in multi-agent setups
  - You are tuning heartbeat and cache-ttl pruning together
---

# Caché de prompts

El almacenamiento en caché de avisos significa que el proveedor del modelo puede reutilizar prefijos de aviso sin cambios (generalmente instrucciones del sistema/desarrollador y otro contexto estable) en varios turnos en lugar de procesarlos cada vez. OpenClaw normaliza el uso del proveedor en `cacheRead` y `cacheWrite` donde la API upstream expone esos contadores directamente.

Las superficies de estado también pueden recuperar los contadores de caché del registro de uso de la transcripción más reciente cuando falta la instantánea de la sesión en vivo, por lo que `/status` puede seguir mostrando una línea de caché después de una pérdida parcial de los metadatos de la sesión. Los valores de caché en vivo existentes distintos de cero tienen prioridad sobre los valores de respaldo de la transcripción.

Por qué esto es importante: menor costo de tokens, respuestas más rápidas y un rendimiento más predecible para sesiones de larga duración. Sin almacenamiento en caché, los avisos repetidos pagan el costo completo del aviso en cada turno, incluso cuando la mayoría de la entrada no cambió.

Esta página cubre todos los controles relacionados con el caché que afectan la reutilización de avisos y el costo de tokens.

Referencias del proveedor:

- Almacenamiento en caché de avisos de Anthropic: [https://platform.claude.com/docs/en/build-with-claude/prompt-caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- Almacenamiento en caché de avisos de OpenAI: [https://developers.openai.com/api/docs/guides/prompt-caching](https://developers.openai.com/api/docs/guides/prompt-caching)
- Encabezados de la API de OpenAI e IDs de solicitud: [https://developers.openai.com/api/reference/overview](https://developers.openai.com/api/reference/overview)
- IDs de solicitud de Anthropic y errores: [https://platform.claude.com/docs/en/api/errors](https://platform.claude.com/docs/en/api/errors)

## Controles principales

### `cacheRetention` (predeterminado global, modelo y por agente)

Establecer la retención de caché como un valor predeterminado global para todos los modelos:

```yaml
agents:
  defaults:
    params:
      cacheRetention: "long" # none | short | long
```

Anular por modelo:

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "short" # none | short | long
```

Anulación por agente:

```yaml
agents:
  list:
    - id: "alerts"
      params:
        cacheRetention: "none"
```

Orden de combinación de configuración:

1. `agents.defaults.params` (predeterminado global: se aplica a todos los modelos)
2. `agents.defaults.models["provider/model"].params` (anulación por modelo)
3. `agents.list[].params` (id de agente coincidente; anula por clave)

### `contextPruning.mode: "cache-ttl"`

Poda el contexto de resultados de herramientas antiguos después de las ventanas de TTL de caché para que las solicitudes posteriores a la inactividad no vuelvan a almacenar en caché un historial demasiado grande.

```yaml
agents:
  defaults:
    contextPruning:
      mode: "cache-ttl"
      ttl: "1h"
```

Consulte [Poda de sesiones](/en/concepts/session-pruning) para ver el comportamiento completo.

### Mantener caliente con latido (Heartbeat keep-warm)

El latido puede mantener las ventanas de caché calientes y reducir escrituras de caché repetidas después de períodos de inactividad.

```yaml
agents:
  defaults:
    heartbeat:
      every: "55m"
```

El latido por agente es compatible en `agents.list[].heartbeat`.

## Comportamiento del proveedor

### Anthropic (API directa)

- `cacheRetention` es compatible.
- Con los perfiles de autenticación de clave de API de Anthropic, OpenClaw inicializa `cacheRetention: "short"` para las referencias de modelos de Anthropic cuando no está configurado.
- Las respuestas nativas de Messages de Anthropic exponen tanto `cache_read_input_tokens` como `cache_creation_input_tokens`, por lo que OpenClaw puede mostrar tanto `cacheRead` como `cacheWrite`.
- Para las solicitudes nativas de Anthropic, `cacheRetention: "short"` se asigna al caché efímero predeterminado de 5 minutos, y `cacheRetention: "long"` actualiza al TTL de 1 hora solo en hosts `api.anthropic.com` directos.

### OpenAI (API directa)

- El almacenamiento en caché de indicaciones es automático en los modelos recientes compatibles. OpenClaw no necesita inyectar marcadores de caché a nivel de bloque.
- OpenClaw usa `prompt_cache_key` para mantener el enrutamiento de caché estable entre turnos y usa `prompt_cache_retention: "24h"` solo cuando se selecciona `cacheRetention: "long"` en hosts directos de OpenAI.
- Las respuestas de OpenAI exponen tokens de indicaciones en caché a través de `usage.prompt_tokens_details.cached_tokens` (o `input_tokens_details.cached_tokens` en eventos de la API de respuestas). OpenClaw asigna eso a `cacheRead`.
- OpenAI no expone un contador de tokens de escritura en caché por separado, por lo que `cacheWrite` se mantiene `0` en las rutas de OpenAI incluso cuando el proveedor está calentando un caché.
- OpenAI devuelve encabezados útiles de rastreo y límite de tasa, como `x-request-id`, `openai-processing-ms` y `x-ratelimit-*`, pero la contabilidad de aciertos de caché debe provenir de la carga útil de uso, no de los encabezados.
- En la práctica, OpenAI a menudo se comporta como un caché de prefijo inicial en lugar de un reutilización de historial completo móvil al estilo de Anthropic. Los turnos de texto de prefijo largo y estable pueden alcanzar una meseta de tokens en caché cercana a `4864` en las sondas en vivo actuales, mientras que las transcripciones con muchas herramientas o estilo MCP a menudo alcanzan una meseta cerca de `4608` tokens en caché incluso en repeticiones exactas.

### Anthropic Vertex

- Los modelos de Anthropic en Vertex AI (`anthropic-vertex/*`) admiten `cacheRetention` de la misma manera que Anthropic directo.
- `cacheRetention: "long"` se asigna al TTL real de caché de indicaciones de 1 hora en los puntos finales de Vertex AI.
- La retención de caché predeterminada para `anthropic-vertex` coincide con los valores predeterminados de Anthropic directo.
- Las solicitudes de Vertex se enrutan a través de una configuración de caché consciente de los límites, de modo que la reutilización de la caché se mantenga alineada con lo que realmente reciben los proveedores.

### Amazon Bedrock

- Las referencias de modelos de Anthropic Claude (`amazon-bedrock/*anthropic.claude*`) admiten el paso directo explícito de `cacheRetention`.
- Los modelos de Bedrock que no son de Anthropic se fuerzan a `cacheRetention: "none"` en tiempo de ejecución.

### Modelos de Anthropic de OpenRouter

Para referencias de modelos `openrouter/anthropic/*`, OpenClaw inyecta el `cache_control` de Anthropic en los bloques de instrucciones del sistema/desarrollador para mejorar la reutilización de la caché de instrucciones solo cuando la solicitud aún apunta a una ruta verificada de OpenRouter (`openrouter` en su punto final predeterminado, o cualquier URL de proveedor/base que se resuelva a `openrouter.ai`).

Si rediriges el modelo a una URL de proxy compatible con OpenAI arbitraria, OpenClaw
dejará de inyectar esos marcadores de caché de Anthropic específicos de OpenRouter.

### Otros proveedores

Si el proveedor no admite este modo de caché, `cacheRetention` no tiene ningún efecto.

### API directa de Google Gemini

- El transporte directo de Gemini (`api: "google-generative-ai"`) informa de los aciertos de caché
  a través de `cachedContentTokenCount`; OpenClaw lo asigna a `cacheRead`.
- Cuando `cacheRetention` se establece en un modelo directo de Gemini, OpenClaw crea,
  reutiliza y actualiza automáticamente los recursos `cachedContents` para los indicadores del sistema
  en las ejecuciones de Google AI Studio. Esto significa que ya no es necesario crear
  manualmente un identificador de contenido en caché de antemano.
- Todavía puede pasar un manejador de contenido en caché de Gemini preexistente como
  `params.cachedContent` (o el heredado `params.cached_content`) en el modelo
  configurado.
- Esto es independiente del almacenamiento en caché de prefijos de mensajes de Anthropic/OpenAI. Para Gemini,
  OpenClaw gestiona un recurso `cachedContents` nativo del proveedor en lugar de
  inyectar marcadores de caché en la solicitud.

### Uso de JSON de CLI de Gemini

- La salida JSON de la CLI de Gemini también puede mostrar aciertos de caché a través de `stats.cached`;
  OpenClaw asigna eso a `cacheRead`.
- Si la CLI omite un valor directo de `stats.input`, OpenClaw deriva los tokens de
  entrada de `stats.input_tokens - stats.cached`.
- Esto es solo una normalización del uso. No significa que OpenClaw esté creando
  marcadores de caché de prompts estilo Anthropic/OpenAI para Gemini CLI.

## Límite de caché del prompt del sistema

OpenClaw divide el prompt del sistema en un **prefijo estable** y un **sufijo
volátil** separados por un límite de prefijo de caché interno. El contenido por
encima del límite (definiciones de herramientas, metadatos de habilidades, archivos
del espacio de trabajo y otro contexto relativamente estático) se ordena para que
permanezca idéntico a nivel de bytes entre turnos. El contenido por debajo del
límite (por ejemplo `HEARTBEAT.md`, marcas de tiempo de ejecución y
otros metadatos por turno) puede cambiar sin invalidar el prefijo en caché.

Decisiones clave de diseño:

- Los archivos de contexto de proyecto del espacio de trabajo estables se ordenan antes de `HEARTBEAT.md` para
  que la actividad del latido no rompa el prefijo estable.
- El límite se aplica en el modelado de transporte de Anthropic-family, OpenAI-family,
  Google y CLI para que todos los proveedores compatibles se beneficien de la misma
  estabilidad de prefijo.
- Las respuestas de Codex y las solicitudes de Anthropic Vertex se enrutan a través
  del modelado de caché consciente del límite para que la reutilización de la caché
  se mantenga alineada con lo que los proveedores realmente reciben.
- Las huellas digitales del prompt del sistema se normalizan (espacios en blanco,
  finales de línea, contexto añadido por hooks, ordenamiento de capacidades de
  ejecución) para que los prompts semánticamente sin cambios compartan KV/caché
  entre turnos.

Si observas picos inesperados en `cacheWrite` después de un cambio de configuración
o del espacio de trabajo, verifica si el cambio cae por encima o por debajo del
límite de caché. Mover el contenido volátil por debajo del límite (o estabilizarlo)
a menudo resuelve el problema.

## Protecciones de estabilidad de caché de OpenClaw

OpenClaw también mantiene varias formas de carga sensibles a la caché de manera
determinista antes de que la solicitud llegue al proveedor:

- Los catálogos de herramientas MCP del Bundle se ordenan de manera determinista
  antes del registro de herramientas, para que los cambios en el orden de `listTools()` no
  alteren el bloque de herramientas y rompan los prefijos de caché de prompts.
- Las sesiones heredadas con bloques de imagen persistentes mantienen intactos los
  **3 turnos completos más recientes**; los bloques de imagen ya procesados más
  antiguos pueden ser reemplazados por un marcador para que las respuestas
  posteriores con muchas imágenes no sigan reenviando grandes cargas obsoletas.

## Patrones de ajuste

### Tráfico mixto (predeterminado recomendado)

Mantenga una línea base de larga duración en su agente principal, desactive el almacenamiento en caché en los agentes notificadores de ráfagas:

```yaml
agents:
  defaults:
    model:
      primary: "anthropic/claude-opus-4-6"
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "long"
  list:
    - id: "research"
      default: true
      heartbeat:
        every: "55m"
    - id: "alerts"
      params:
        cacheRetention: "none"
```

### Línea de base orientada al costo

- Establezca la línea de base `cacheRetention: "short"`.
- Habilite `contextPruning.mode: "cache-ttl"`.
- Mantenga el latido por debajo de su TTL solo para los agentes que se benefician de cachés calientes.

## Diagnósticos de caché

OpenClaw expone diagnósticos dedicados de seguimiento de caché para ejecuciones de agentes integrados.

Para diagnósticos normales orientados al usuario, `/status` y otros resúmenes de uso pueden usar
la entrada de uso de la transcripción más reciente como fuente alternativa para `cacheRead` /
`cacheWrite` cuando la entrada de la sesión en vivo no tiene esos contadores.

## Pruebas de regresión en vivo

OpenClaw mantiene una puerta de regresión de caché en vivo combinada para prefijos repetidos, turnos de herramientas, turnos de imágenes, transcripciones de herramientas estilo MCP y un control de no caché de Anthropic.

- `src/agents/live-cache-regression.live.test.ts`
- `src/agents/live-cache-regression-baseline.ts`

Ejecute la puerta en vivo estrecha con:

```sh
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache
```

El archivo de línea de base almacena los números en vivo observados más recientes junto con los suelos de regresión específicos del proveedor utilizados por la prueba.
El ejecutor también utiliza ID de sesión y espacios de nombres de提示 frescos por ejecución para que el estado de caché anterior no contamine la muestra de regresión actual.

Estas pruebas intencionalmente no utilizan criterios de éxito idénticos entre proveedores.

### Expectativas en vivo de Anthropic

- Espere escrituras explícitas de calentamiento a través de `cacheWrite`.
- Espere una reutilización casi completa del historial en turnos repetidos porque el control de caché de Anthropic hace avanzar el punto de interrupción de caché a través de la conversación.
- Las aserciones en vivo actuales todavía utilizan umbrales de tasa de aciertos altos para rutas estables, de herramientas y de imágenes.

### Expectativas en vivo de OpenAI

- Espere solo `cacheRead`. `cacheWrite` permanece `0`.
- Trate la reutilización de caché de turnos repetidos como una meseta específica del proveedor, no como una reutilización de historial completo en movimiento al estilo de Anthropic.
- Las aserciones en vivo actuales utilizan comprobaciones de suelo conservadoras derivadas del comportamiento en vivo observado en `gpt-5.4-mini`:
  - prefijo estable: `cacheRead >= 4608`, tasa de aciertos `>= 0.90`
  - transcripción de herramienta: `cacheRead >= 4096`, tasa de aciertos `>= 0.85`
  - transcripción de imagen: `cacheRead >= 3840`, tasa de aciertos `>= 0.82`
  - Transcripción estilo MCP: `cacheRead >= 4096`, tasa de aciertos `>= 0.85`

La verificación combinada en vivo reciente el 2026-04-04 arrojó:

- prefijo estable: `cacheRead=4864`, tasa de aciertos `0.966`
- transcripción de herramienta: `cacheRead=4608`, tasa de aciertos `0.896`
- transcripción de imagen: `cacheRead=4864`, tasa de aciertos `0.954`
- Transcripción estilo MCP: `cacheRead=4608`, tasa de aciertos `0.891`

El tiempo de reloj local reciente para la puerta combinada fue de aproximadamente `88s`.

Por qué difieren las afirmaciones:

- Anthropic expone puntos de interrupción de caché explícitos y reutilización móvil del historial de conversación.
- El almacenamiento en caché de mensajes de OpenAI sigue siendo sensible al prefijo exacto, pero el prefijo reutilizable efectivo en el tráfico de Respuestas en vivo puede alcanzar una meseta antes que el mensaje completo.
- Debido a eso, comparar Anthropic y OpenAI mediante un único umbral porcentual multiproveedor crea regresiones falsas.

### config `diagnostics.cacheTrace`

```yaml
diagnostics:
  cacheTrace:
    enabled: true
    filePath: "~/.openclaw/logs/cache-trace.jsonl" # optional
    includeMessages: false # default true
    includePrompt: false # default true
    includeSystem: false # default true
```

Valores predeterminados:

- `filePath`: `$OPENCLAW_STATE_DIR/logs/cache-trace.jsonl`
- `includeMessages`: `true`
- `includePrompt`: `true`
- `includeSystem`: `true`

### Interruptores de entorno (depuración única)

- `OPENCLAW_CACHE_TRACE=1` habilita el rastreo de caché.
- `OPENCLAW_CACHE_TRACE_FILE=/path/to/cache-trace.jsonl` anula la ruta de salida.
- `OPENCLAW_CACHE_TRACE_MESSAGES=0|1` alterna la captura completa de la carga del mensaje.
- `OPENCLAW_CACHE_TRACE_PROMPT=0|1` alterna la captura de texto del mensaje.
- `OPENCLAW_CACHE_TRACE_SYSTEM=0|1` alterna la captura del mensaje del sistema.

### Qué inspeccionar

- Los eventos de rastro de caché son JSONL e incluyen instantáneas por etapas como `session:loaded`, `prompt:before`, `stream:context` y `session:after`.
- El impacto de tokens de caché por turno es visible en las superficies de uso normal a través de `cacheRead` y `cacheWrite` (por ejemplo, `/usage full` y resúmenes de uso de la sesión).
- Para Anthropic, espere tanto `cacheRead` como `cacheWrite` cuando el almacenamiento en caché esté activo.
- Para OpenAI, espere `cacheRead` en los aciertos de caché y que `cacheWrite` permanezca `0`; OpenAI no publica un campo separado de tokens de escritura de caché.
- Si necesita seguimiento de solicitudes, registre los IDs de solicitud y los encabezados de límite de tasa por separado de las métricas de caché. La salida actual de seguimiento de caché de OpenClaw se centra en la forma del prompt/sesión y el uso normalizado de tokens, en lugar de los encabezados de respuesta sin procesar del proveedor.

## Solución rápida de problemas

- `cacheWrite` alto en la mayoría de los turnos: verifique si hay entradas de system-prompt volátiles y confirme que el modelo/proveedor admite su configuración de caché.
- `cacheWrite` alto en Anthropic: a menudo significa que el punto de interrupción de la caché está aterrizando en contenido que cambia en cada solicitud.
- `cacheRead` bajo de OpenAI: verifique que el prefijo estable esté al frente, que el prefijo repetido tenga al menos 1024 tokens y que se reutilice el mismo `prompt_cache_key` para los turnos que deberían compartir una caché.
- Sin efecto de `cacheRetention`: confirme que la clave del modelo coincide con `agents.defaults.models["provider/model"]`.
- Solicitudes de Bedrock Nova/Mistral con configuración de caché: se espera que el tiempo de ejecución fuerce `none`.

Documentos relacionados:

- [Anthropic](/en/providers/anthropic)
- [Uso de tokens y costes](/en/reference/token-use)
- [Poda de sesiones](/en/concepts/session-pruning)
- [Referencia de configuración de Gateway](/en/gateway/configuration-reference)
