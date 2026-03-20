---
title: "Caché de prompt"
summary: "Controles de caché de prompt, orden de fusión, comportamiento del proveedor y patrones de ajuste"
read_when:
  - Deseas reducir los costos de tokens de prompt con la retención de caché
  - Necesitas comportamiento de caché por agente en configuraciones de múltiples agentes
  - Estás ajustando el latido y la poda de cache-ttl juntos
---

# Caché de prompt

El caché de prompt significa que el proveedor del modelo puede reutilizar prefijos de prompt sin cambios (generalmente instrucciones del sistema/desarrollador y otro contexto estable) en turnos en lugar de procesarlos nuevamente cada vez. La primera solicitud coincidente escribe tokens de caché (`cacheWrite`), y las solicitudes coincidentes posteriores pueden leerlos de nuevo (`cacheRead`).

Por qué esto es importante: menor costo de tokens, respuestas más rápidas y un rendimiento más predecible para sesiones de larga duración. Sin caché, los prompts repetidos pagan el costo total del prompt en cada turno incluso cuando la mayor parte de la entrada no cambió.

Esta página cubre todos los controles relacionados con el caché que afectan la reutilización de prompts y el costo de tokens.

Para detalles de precios de Anthropic, consulta:
[https://docs.anthropic.com/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/docs/build-with-claude/prompt-caching)

## Controles principales

### `cacheRetention` (modelo y por agente)

Establecer la retención de caché en los parámetros del modelo:

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

1. `agents.defaults.models["provider/model"].params`
2. `agents.list[].params` (id de agente coincidente; anula por clave)

### `cacheControlTtl` heredado

Los valores heredados aún se aceptan y asignan:

- `5m` -> `short`
- `1h` -> `long`

Prefiere `cacheRetention` para nueva configuración.

### `contextPruning.mode: "cache-ttl"`

Poda el contexto de resultados de herramientas antiguos después de las ventanas de TTL del caché para que las solicitudes posteriores a la inactividad no vuelvan a almacenar en caché un historial demasiado grande.

```yaml
agents:
  defaults:
    contextPruning:
      mode: "cache-ttl"
      ttl: "1h"
```

Consulta [Poda de sesiones](/es/concepts/session-pruning) para el comportamiento completo.

### Mantenimiento de latido (Heartbeat keep-warm)

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
- Con perfiles de autenticación de clave de API de Anthropic, OpenClaw inicializa `cacheRetention: "short"` para las referencias de modelos de Anthropic cuando no está configurado.

### Amazon Bedrock

- Las referencias de modelos de Anthropic Claude (`amazon-bedrock/*anthropic.claude*`) soportan el paso explícito de `cacheRetention`.
- Los modelos de Bedrock que no son de Anthropic se ven forzados a `cacheRetention: "none"` en tiempo de ejecución.

### Modelos de Anthropic de OpenRouter

Para las referencias de modelos `openrouter/anthropic/*`, OpenClaw inyecta `cache_control` de Anthropic en los bloques de prompts del sistema/desarrollador para mejorar la reutilización del caché de prompts.

### Otros proveedores

Si el proveedor no soporta este modo de caché, `cacheRetention` no tiene ningún efecto.

## Patrones de ajuste

### Tráfico mixto (predeterminado recomendado)

Mantenga una línea base de larga duración en su agente principal, desactive el almacenamiento en caché en los agentes de notificación intermitentes:

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

### Línea base centrada en el costo

- Establezca la línea base `cacheRetention: "short"`.
- Active `contextPruning.mode: "cache-ttl"`.
- Mantenga el latido por debajo de su TTL solo para los agentes que se benefician de cachés calientes.

## Diagnóstico de caché

OpenClaw expone diagnósticos de seguimiento de caché dedicados para ejecuciones de agentes integrados.

### configuración `diagnostics.cacheTrace`

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

- `OPENCLAW_CACHE_TRACE=1` activa el seguimiento de caché.
- `OPENCLAW_CACHE_TRACE_FILE=/path/to/cache-trace.jsonl` anula la ruta de salida.
- `OPENCLAW_CACHE_TRACE_MESSAGES=0|1` activa la captura completa de la carga útil del mensaje.
- `OPENCLAW_CACHE_TRACE_PROMPT=0|1` activa la captura de texto del prompt.
- `OPENCLAW_CACHE_TRACE_SYSTEM=0|1` activa la captura del prompt del sistema.

### Qué inspeccionar

- Los eventos de seguimiento de caché son JSONL e incluyen instantáneas por etapas como `session:loaded`, `prompt:before`, `stream:context` y `session:after`.
- El impacto de tokens de caché por turno es visible en las superficies de uso normal a través de `cacheRead` y `cacheWrite` (por ejemplo `/usage full` y resúmenes de uso de sesión).

## Solución rápida de problemas

- Alto `cacheWrite` en la mayoría de los turnos: compruebe si hay entradas de system prompt volátiles y verifique que el modelo/proveedor sea compatible con su configuración de caché.
- Sin efecto de `cacheRetention`: confirme que la clave del modelo coincide con `agents.defaults.models["provider/model"]`.
- Solicitudes de Bedrock Nova/Mistral con configuración de caché: se espera una fuerza de ejecución para `none`.

Documentación relacionada:

- [Anthropic](/es/providers/anthropic)
- [Uso de tokens y costes](/es/reference/token-use)
- [Poda de sesiones](/es/concepts/session-pruning)
- [Referencia de configuración de la puerta de enlace](/es/gateway/configuration-reference)

import es from "/components/footer/es.mdx";

<es />
