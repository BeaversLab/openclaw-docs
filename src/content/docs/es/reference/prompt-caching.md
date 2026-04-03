---
title: "Prompt Caching"
summary: "Controles de caché de prompts, orden de combinación, comportamiento del proveedor y patrones de ajuste"
read_when:
  - You want to reduce prompt token costs with cache retention
  - You need per-agent cache behavior in multi-agent setups
  - You are tuning heartbeat and cache-ttl pruning together
---

# Caché de prompts

El almacenamiento en caché de prompts (prompt caching) significa que el proveedor del modelo puede reutilizar los prefijos de prompt sin cambios (generalmente instrucciones del sistema/desarrollador y otro contexto estable) a lo largo de los turnos en lugar de procesarlos cada vez. La primera solicitud coincidente escribe tokens de caché (`cacheWrite`), y las solicitudes coincidentes posteriores pueden leerlos de nuevo (`cacheRead`).

Por qué es importante: menor costo de tokens, respuestas más rápidas y un rendimiento más predecible para sesiones de larga duración. Sin caché, los prompts repetidos pagan el costo completo del prompt en cada turno incluso cuando la mayor parte de la entrada no cambió.

Esta página cubre todos los controles relacionados con el caché que afectan la reutilización de prompts y el costo de tokens.

Para más detalles sobre precios de Anthropic, consulte:
[https://docs.anthropic.com/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/docs/build-with-claude/prompt-caching)

## Controles principales

### `cacheRetention` (predeterminado global, modelo y por agente)

Establezca la retención de caché como predeterminado global para todos los modelos:

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

1. `agents.defaults.params` (predeterminado global — se aplica a todos los modelos)
2. `agents.defaults.models["provider/model"].params` (anulación por modelo)
3. `agents.list[].params` (id de agente coincidente; anula por clave)

### `cacheControlTtl` heredado

Los valores heredados todavía se aceptan y mapean:

- `5m` -> `short`
- `1h` -> `long`

Prefiera `cacheRetention` para nueva configuración.

### `contextPruning.mode: "cache-ttl"`

Poda el contexto de resultados de herramientas antiguos después de las ventanas de TTL de caché para que las solicitudes posteriores a la inactividad no vuelvan a almacenar en caché un historial demasiado grande.

```yaml
agents:
  defaults:
    contextPruning:
      mode: "cache-ttl"
      ttl: "1h"
```

Consulte [Session Pruning](/en/concepts/session-pruning) para el comportamiento completo.

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
- Con perfiles de autenticación de clave API de Anthropic, OpenClaw inicializa `cacheRetention: "short"` para las referencias de modelos de Anthropic cuando no está establecido.

### Amazon Bedrock

- Las referencias de modelos Anthropic Claude (`amazon-bedrock/*anthropic.claude*`) admiten el paso directo explícito de `cacheRetention`.
- Los modelos de Bedrock que no son de Anthropic se fuerzan a `cacheRetention: "none"` en tiempo de ejecución.

### Modelos de Anthropic en OpenRouter

Para referencias de modelos `openrouter/anthropic/*`, OpenClaw inyecta `cache_control` de Anthropic en los bloques de instrucciones del sistema/desarrollador para mejorar la reutilización del caché de instrucciones.

### Otros proveedores

Si el proveedor no admite este modo de caché, `cacheRetention` no tiene ningún efecto.

## Patrones de ajuste

### Tráfico mixto (predeterminado recomendado)

Mantenga una línea base de larga duración en su agente principal, desactive el almacenamiento en caché en los agentes notificadores intermitentes:

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

### Lí base basada en costes

- Establezca la línea base `cacheRetention: "short"`.
- Active `contextPruning.mode: "cache-ttl"`.
- Mantenga el latido por debajo de su TTL solo para los agentes que se benefician de cachés activos.

## Diagnósticos de caché

OpenClaw expone diagnósticos de seguimiento de caché dedicados para ejecuciones de agentes integrados.

### Configuración `diagnostics.cacheTrace`

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

### Modificadores de entorno (depuración única)

- `OPENCLAW_CACHE_TRACE=1` activa el seguimiento de caché.
- `OPENCLAW_CACHE_TRACE_FILE=/path/to/cache-trace.jsonl` anula la ruta de salida.
- `OPENCLAW_CACHE_TRACE_MESSAGES=0|1` activa la captura completa de la carga útil del mensaje.
- `OPENCLAW_CACHE_TRACE_PROMPT=0|1` activa la captura de texto de instrucción.
- `OPENCLAW_CACHE_TRACE_SYSTEM=0|1` activa la captura de instrucciones del sistema.

### Qué inspeccionar

- Los eventos de seguimiento de caché son JSONL e incluyen instantáneas por etapas como `session:loaded`, `prompt:before`, `stream:context` y `session:after`.
- El impacto del token de caché por turno es visible en las superficies de uso normal a través de `cacheRead` y `cacheWrite` (por ejemplo, `/usage full` y resúmenes de uso de la sesión).

## Solución rápida de problemas

- `cacheWrite` alto en la mayoría de los turnos: verifique si hay entradas de instrucciones del sistema volátiles y verifique que el modelo/proveedor admite su configuración de caché.
- Sin efecto de `cacheRetention`: confirme que la clave del modelo coincide con `agents.defaults.models["provider/model"]`.
- Solicitudes de Bedrock Nova/Mistral con configuración de caché: se espera que el tiempo de ejecución fuerce `none`.

Documentación relacionada:

- [Anthropic](/en/providers/anthropic)
- [Uso de tokens y costos](/en/reference/token-use)
- [Poda de sesiones](/en/concepts/session-pruning)
- [Referencia de configuración de la puerta de enlace](/en/gateway/configuration-reference)
