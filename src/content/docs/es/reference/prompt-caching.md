---
summary: "Controles de caché de solicitudes, orden de fusión, comportamiento del proveedor y patrones de ajuste"
title: "Caché de solicitudes"
read_when:
  - You want to reduce prompt token costs with cache retention
  - You need per-agent cache behavior in multi-agent setups
  - You are tuning heartbeat and cache-ttl pruning together
---

El caché de solicitudes significa que el proveedor del modelo puede reutilizar prefijos de solicitud sin cambios (generalmente instrucciones del sistema/desarrollador y otro contexto estable) en los turnos en lugar de procesarlos cada vez. OpenClaw normaliza el uso del proveedor en `cacheRead` y `cacheWrite` donde la API aguas arriba expone esos contadores directamente.

Las superficies de estado también pueden recuperar contadores de caché del registro de uso
transcrito más reciente cuando la instantánea de la sesión en vivo no los tiene, por lo que `/status` puede seguir
mostrando una línea de caché después de una pérdida parcial de metadatos de la sesión. Los valores de caché en vivo distintos de cero existentes
todavía tienen prioridad sobre los valores de reserva de la transcripción.

Por qué es importante: menor costo de tokens, respuestas más rápidas y un rendimiento más predecible para sesiones de larga duración. Sin caché, los prompts repetidos pagan el costo completo del prompt en cada turno incluso cuando la mayor parte de la entrada no cambió.

Las secciones a continuación cubren cada control relacionado con el caché que afecta la reutilización de la solicitud y el costo de los tokens.

Referencias del proveedor:

- Caché de prompts de Anthropic: [https://platform.claude.com/docs/en/build-with-claude/prompt-caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- Caché de prompts de OpenAI: [https://developers.openai.com/api/docs/guides/prompt-caching](https://developers.openai.com/api/docs/guides/prompt-caching)
- Encabezados de la API de OpenAI e IDs de solicitud: [https://developers.openai.com/api/reference/overview](https://developers.openai.com/api/reference/overview)
- IDs de solicitud y errores de Anthropic: [https://platform.claude.com/docs/en/api/errors](https://platform.claude.com/docs/en/api/errors)

## Controles principales

### `cacheRetention` (predeterminado global, modelo y por agente)

Establezca la retención de caché como un predeterminado global para todos los modelos:

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

Orden de fusión de configuración:

1. `agents.defaults.params` (predeterminado global: se aplica a todos los modelos)
2. `agents.defaults.models["provider/model"].params` (anulación por modelo)
3. `agents.list[].params` (id de agente coincidente; anula por clave)

### `contextPruning.mode: "cache-ttl"`

Poda el contexto de resultados de herramientas antiguo después de las ventanas TTL de caché para que las solicitudes posteriores a la inactividad no vuelvan a almacenar en caché un historial demasiado grande.

```yaml
agents:
  defaults:
    contextPruning:
      mode: "cache-ttl"
      ttl: "1h"
```

Consulte [Session Pruning](/es/concepts/session-pruning) para obtener el comportamiento completo.

### Mantener caliente con latido

El latido puede mantener las ventanas de caché calientes y reducir escrituras de caché repetidas después de los intervalos de inactividad.

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
- Con los perfiles de autenticación por clave de API de Anthropic, OpenClaw inicializa `cacheRetention: "short"` para las referencias de modelos de Anthropic cuando no está establecido.
- Las respuestas nativas de Messages de Anthropic exponen tanto `cache_read_input_tokens` como `cache_creation_input_tokens`, por lo que OpenClaw puede mostrar tanto `cacheRead` como `cacheWrite`.
- Para las solicitudes nativas de Anthropic, `cacheRetention: "short"` se asigna a la caché efímera predeterminada de 5 minutos, y `cacheRetention: "long"` actualiza al TTL de 1 hora solo en los hosts directos `api.anthropic.com`.

### OpenAI (API directa)

- El almacenamiento en caché de indicaciones es automático en los modelos recientes compatibles. OpenClaw no necesita inyectar marcadores de caché a nivel de bloque.
- OpenClaw utiliza `prompt_cache_key` para mantener el enrutamiento de caché estable a través de los turnos. Los hosts directos de OpenAI usan `prompt_cache_retention: "24h"` cuando se selecciona `cacheRetention: "long"`.
- Los proveedores de Completions compatibles con OpenAI reciben `prompt_cache_key` solo cuando su configuración de modelo establece explícitamente `compat.supportsPromptCacheKey: true`; con esa misma aceptación, el `cacheRetention: "long"` explícito también reenvía `prompt_cache_retention: "24h"`, y `cacheRetention: "none"` suprime ambos campos.
- Las respuestas de OpenAI exponen tokens de prompt almacenados en caché a través de `usage.prompt_tokens_details.cached_tokens` (o `input_tokens_details.cached_tokens` en eventos de la API de Responses). OpenClaw asigna esto a `cacheRead`.
- OpenAI no expone un contador de tokens de escritura de caché separado, por lo que `cacheWrite` se mantiene en `0` en las rutas de OpenAI incluso cuando el proveedor está calentando un caché.
- OpenAI devuelve encabezados útiles de rastreo y límite de tasa, como `x-request-id`, `openai-processing-ms` y `x-ratelimit-*`, pero la contabilidad de aciertos de caché debe provenir del payload de uso, no de los encabezados.
- En la práctica, OpenAI a menudo se comporta como un caché de prefijo inicial en lugar de un reuso completo del historial móvil estilo Anthropic. Los turnos de texto de prefijo largo y estable pueden situarse cerca de una meseta de tokens en caché de `4864` en las sondas en vivo actuales, mientras que las transcripciones con muchas herramientas o estilo MCP a menudo alcanzan una meseta cerca de `4608` tokens en caché incluso en repeticiones exactas.

### Anthropic Vertex

- Los modelos de Anthropic en Vertex AI (`anthropic-vertex/*`) admiten `cacheRetention` de la misma manera que Anthropic directo.
- `cacheRetention: "long"` se asigna al TTL real de caché de prompt de 1 hora en los puntos finales de Vertex AI.
- La retención de caché predeterminada para `anthropic-vertex` coincide con los valores predeterminados de Anthropic directo.
- Las solicitudes de Vertex se enrutan a través de una configuración de caché consciente de los límites, de modo que la reutilización de la caché se mantenga alineada con lo que realmente reciben los proveedores.

### Amazon Bedrock

- Las referencias de modelos Anthropic Claude (`amazon-bedrock/*anthropic.claude*`) admiten el paso directo explícito de `cacheRetention`.
- Los modelos de Bedrock que no son de Anthropic se ven obligados a `cacheRetention: "none"` en tiempo de ejecución.

### Modelos de OpenRouter

Para las referencias de modelos `openrouter/anthropic/*`, OpenClaw inyecta `cache_control` de Anthropic
en los bloques de mensajes del sistema/desarrollador para mejorar la reutilización del caché del
solo cuando la solicitud todavía apunta a una ruta verificada de OpenRouter
(`openrouter` en su punto final predeterminado, o cualquier proveedor/URL base que se resuelva
a `openrouter.ai`).

Para las referencias de modelos `openrouter/deepseek/*`, `openrouter/moonshot*/*` y `openrouter/zai/*`,
se permite `contextPruning.mode: "cache-ttl"` porque OpenRouter maneja
el almacenamiento en caché de avisos del lado del proveedor automáticamente. OpenClaw no inyecta
marcadores `cache_control` de Anthropic en esas solicitudes.

La construcción de caché de DeepSeek es de mejor esfuerzo y puede tardar unos segundos. Un
seguimiento inmediato aún puede mostrar `cached_tokens: 0`; verifíquelo con una solicitud
repetida del mismo prefijo después de una breve demora y use `usage.prompt_tokens_details.cached_tokens`
como la señal de acierto de caché.

Si redirige el modelo a una URL de proxy compatible con OpenAI arbitraria, OpenClaw
dejará de inyectar esos marcadores de caché de Anthropic específicos de OpenRouter.

### Otros proveedores

Si el proveedor no admite este modo de caché, `cacheRetention` no tiene ningún efecto.

### API directa de Google Gemini

- El transporte directo Gemini (`api: "google-generative-ai"`) informa los aciertos de caché
  a través del contador `cachedContentTokenCount` aguas arriba; OpenClaw asigna eso a `cacheRead`.
- Cuando se establece `cacheRetention` en un modelo Gemini directo, OpenClaw crea,
  reutiliza y actualiza automáticamente los recursos `cachedContents` para los avisos
  del sistema en las ejecuciones de Google AI Studio. Esto significa que ya no necesita crear manualmente
  un identificador de contenido en caché de antemano.
- Todavía puede pasar un identificador de contenido en caché de Gemini preexistente como
  `params.cachedContent` (o el heredado `params.cached_content`) en el modelo
  configurado.
- Esto es independiente del almacenamiento en caché de prefijos de avisos de Anthropic/OpenAI. Para Gemini,
  OpenClaw gestiona un recurso `cachedContents` nativo del proveedor en lugar de
  inyectar marcadores de caché en la solicitud.

### Uso de JSON en CLI de Gemini

- La salida JSON de la CLI de Gemini también puede mostrar aciertos de caché a través de `stats.cached`;
  OpenClaw asigna esto a `cacheRead`.
- Si la CLI omite un valor directo de `stats.input`, OpenClaw deriva los tokens de entrada
  de `stats.input_tokens - stats.cached`.
- Esto es solo una normalización de uso. No significa que OpenClaw esté creando
  marcadores de caché de estilo Anthropic/OpenAI para la CLI de Gemini.

## Límite de caché del prompt del sistema

OpenClaw divide el mensaje del sistema en un **prefijo estable** y un **sufijo
volátil** separados por un límite de prefijo de caché interno. El contenido por encima
del límite (definiciones de herramientas, metadatos de habilidades, archivos del espacio de trabajo y otro
contexto relativamente estático) se ordena para que permanezca idéntico a nivel de bytes entre turnos.
El contenido por debajo del límite (por ejemplo `HEARTBEAT.md`, marcas de tiempo de ejecución y
otros metadatos por turno) puede cambiar sin invalidar el prefijo
cacheado.

Decisiones clave de diseño:

- Los archivos estables de contexto de proyecto del espacio de trabajo se ordenan antes de `HEARTBEAT.md` para que
  el churn del latido no invalide el prefijo estable.
- El límite se aplica en la conformación del transporte de Anthropic, OpenAI, Google y CLI,
  para que todos los proveedores compatibles se beneficien de la misma estabilidad de
  prefijo.
- Las respuestas de Codex y las solicitudes de Anthropic Vertex se enrutan a través de
  una conformación de caché consciente de los límites, para que la reutilización de la
  caché se mantenga alineada con lo que los proveedores reciben realmente.
- Las huellas digitales del sistema de instrucciones se normalizan (espacios en blanco, finales de línea, contexto agregado por hooks, ordenamiento de capacidades en tiempo de ejecución) para que las instrucciones semánticamente inalteradas compartan el caché KV a través de los turnos.

Si observa picos inesperados de `cacheWrite` después de un cambio de configuración o del espacio de trabajo,
verifique si el cambio se coloca por encima o por debajo del límite de caché. Mover
el contenido volátil por debajo del límite (o estabilizarlo) a menudo resuelve
el problema.

## Guardias de estabilidad de caché de OpenClaw

OpenClaw también mantiene deterministas varias formas de carga útil sensibles al caché antes de que la solicitud llegue al proveedor:

- Los catálogos de herramientas MCP del paquete se ordenan de manera determinista antes del registro
  de herramientas, por lo que los cambios en el orden de `listTools()` no alteran el bloque de herramientas y
  invalidan los prefijos de caché de mensajes.
- Las sesiones heredadas con bloques de imagen persistidos mantienen intactos los **3 turnos completados más recientes**; los bloques de imagen ya procesados y más antiguos pueden ser reemplazados por un marcador para que las respuestas posteriores con muchas imágenes no sigan reenviando grandes cargas útiles obsoletas.

## Patrones de ajuste

### Tráfico mixto (predeterminado recomendado)

Mantenga una línea base de larga duración en su agente principal, desactive el almacenamiento en caché en los agentes notificadores con ráfagas:

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

### Línea base con prioridad de costos

- Establezca `cacheRetention: "short"` de línea base.
- Habilite `contextPruning.mode: "cache-ttl"`.
- Mantenga el latido por debajo de su TTL solo para los agentes que se benefician de cachés cálidos.

## Diagnósticos de caché

OpenClaw expone diagnósticos dedicados de seguimiento de caché para ejecuciones de agentes integrados.

Para diagnósticos normales orientados al usuario, `/status` y otros resúmenes de uso pueden usar
la última entrada de uso de la transcripción como fuente alternativa para `cacheRead` /
`cacheWrite` cuando la entrada de la sesión en vivo no tiene esos contadores.

## Pruebas de regresión en vivo

OpenClaw mantiene una puerta de regresión de caché en vivo combinada para prefijos repetidos, turnos de herramientas, turnos de imagen, transcripciones de herramientas estilo MCP y un control de no caché de Anthropic.

- `src/agents/live-cache-regression.live.test.ts`
- `src/agents/live-cache-regression-baseline.ts`

Ejecute la puerta en vivo estrecha con:

```sh
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache
```

El archivo de línea base almacena los números en vivo observados más recientes además de los suelos de regresión específicos del proveedor utilizados por la prueba. El ejecutor también utiliza ID de sesión y espacios de nombres de instrucciones nuevos por ejecución para que el estado de caché anterior no contamine la muestra de regresión actual.

Estas pruebas intencionalmente no usan criterios de éxito idénticos en todos los proveedores.

### Expectativas en vivo de Anthropic

- Espere escrituras explícitas de calentamiento a través de `cacheWrite`.
- Se espera una reutilización casi completa del historial en turnos repetidos porque el control de caché de Anthropic avanza el punto de interrupción de la caché a través de la conversación.
- Las afirmaciones en vivo actuales todavía usan umbrales de tasa de aciertos altos para rutas estables, de herramientas y de imágenes.

### Expectativas en vivo de OpenAI

- Espere solo `cacheRead`. `cacheWrite` permanece `0`.
- Trate la reutilización de caché en turnos repetidos como una meseta específica del proveedor, no como una reutilización de historial completo móvil estilo Anthropic.
- Las aserciones en vivo actuales usan verificaciones de suelo conservadoras derivadas del comportamiento en vivo observado en `gpt-5.4-mini`:
  - prefijo estable: `cacheRead >= 4608`, tasa de aciertos `>= 0.90`
  - transcripción de herramienta: `cacheRead >= 4096`, tasa de aciertos `>= 0.85`
  - transcripción de imagen: `cacheRead >= 3840`, tasa de aciertos `>= 0.82`
  - transcripción estilo MCP: `cacheRead >= 4096`, tasa de aciertos `>= 0.85`

La verificación combinada en vivo actualizada el 2026-04-04 arrojó:

- prefijo estable: `cacheRead=4864`, tasa de aciertos `0.966`
- transcripción de herramienta: `cacheRead=4608`, tasa de aciertos `0.896`
- transcripción de imagen: `cacheRead=4864`, tasa de aciertos `0.954`
- transcripción estilo MCP: `cacheRead=4608`, tasa de aciertos `0.891`

El tiempo local reciente de reloj de pared para la compuerta combinada fue de aproximadamente `88s`.

Por qué difieren las afirmaciones:

- Anthropic expone puntos de interrupción de caché explícitos y una reutilización móvil del historial de conversaciones.
- El almacenamiento en caché de indicaciones de OpenAI sigue siendo sensible al prefijo exacto, pero el prefijo reutilizable efectivo en el tráfico de Respuestas en vivo puede alcanzar una meseta antes que el indicador completo.
- Debido a eso, comparar Anthropic y OpenAI mediante un único umbral porcentual multi-proveedor crea regresiones falsas.

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

### Interruptores de entorno (depuración puntual)

- `OPENCLAW_CACHE_TRACE=1` habilita el rastreo de caché.
- `OPENCLAW_CACHE_TRACE_FILE=/path/to/cache-trace.jsonl` anula la ruta de salida.
- `OPENCLAW_CACHE_TRACE_MESSAGES=0|1` alterna la captura completa de la carga útil del mensaje.
- `OPENCLAW_CACHE_TRACE_PROMPT=0|1` alterna la captura de texto del prompt.
- `OPENCLAW_CACHE_TRACE_SYSTEM=0|1` alterna la captura del prompt del sistema.

### Qué inspeccionar

- Los eventos de rastreo de caché son JSONL e incluyen instantáneas preparadas como `session:loaded`, `prompt:before`, `stream:context` y `session:after`.
- El impacto de tokens de caché por turno es visible en las superficies de uso normales a través de `cacheRead` y `cacheWrite` (por ejemplo `/usage full` y resúmenes de uso de la sesión).
- Para Anthropic, espere tanto `cacheRead` como `cacheWrite` cuando el almacenamiento en caché está activo.
- Para OpenAI, espere `cacheRead` en aciertos de caché y que `cacheWrite` permanezca `0`; OpenAI no publica un campo separado de tokens de escritura en caché.
- Si necesita rastreo de solicitudes, registre los IDs de solicitud y los encabezados de límite de tasa por separado de las métricas de caché. La salida actual de rastreo de caché de OpenClaw se centra en la forma del prompt/sesión y el uso normalizado de tokens en lugar de los encabezados de respuesta brutos del proveedor.

## Solución rápida de problemas

- Alto `cacheWrite` en la mayoría de los turnos: verifique si hay entradas de system-prompt volátiles y confirme que el modelo/proveedor es compatible con su configuración de caché.
- Alto `cacheWrite` en Anthropic: a menudo significa que el punto de interrupción de la caché está situándose en contenido que cambia en cada solicitud.
- OpenAI `cacheRead` bajo: verifique que el prefijo estable esté al frente, que el prefijo repetido tenga al menos 1024 tokens y que se reutilice el mismo `prompt_cache_key` para los turnos que deberían compartir una caché.
- Sin efecto de `cacheRetention`: confirme que la clave del modelo coincide con `agents.defaults.models["provider/model"]`.
- Solicitudes de Bedrock Nova/Mistral con configuración de caché: se espera un tiempo de ejecución forzado a `none`.

Documentación relacionada:

- [Anthropic](/es/providers/anthropic)
- [Uso y costos de tokens](/es/reference/token-use)
- [Poda de sesiones](/es/concepts/session-pruning)
- [Referencia de configuración de Gateway](/es/gateway/configuration-reference)

## Relacionado

- [Uso y costos de tokens](/es/reference/token-use)
- [Uso y costos de la API](/es/reference/api-usage-costs)
