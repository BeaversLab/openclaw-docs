---
summary: "Cómo OpenClaw construye el contexto del prompt e informa el uso y los costos de los tokens"
read_when:
  - Explaining token usage, costs, or context windows
  - Debugging context growth or compaction behavior
title: "Uso de tokens y costos"
---

# Uso de tokens y costos

OpenClaw rastrea **tokens**, no caracteres. Los tokens son específicos del modelo, pero la mayoría de
los modelos de estilo OpenAI promedian ~4 caracteres por token para texto en inglés.

## Cómo se construye el prompt del sistema

OpenClaw ensambla su propio prompt del sistema en cada ejecución. Incluye:

- Lista de herramientas + descripciones breves
- Lista de habilidades (solo metadatos; las instrucciones se cargan bajo demanda con `read`)
- Instrucciones de autoactualización
- Archivos de espacio de trabajo + arranque (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md` cuando son nuevos, además de `MEMORY.md` cuando está presente o `memory.md` como alternativa en minúsculas). Los archivos grandes se truncan mediante `agents.defaults.bootstrapMaxChars` (predeterminado: 20000), y la inyección total de arranque se limita mediante `agents.defaults.bootstrapTotalMaxChars` (predeterminado: 150000). Los archivos `memory/*.md` son bajo demanda a través de herramientas de memoria y no se inyectan automáticamente.
- Hora (UTC + zona horaria del usuario)
- Etiquetas de respuesta + comportamiento de latido
- Metadatos de tiempo de ejecución (host/SO/modelo/pensamiento)

Vea el desglose completo en [System Prompt](/es/concepts/system-prompt).

## Qué cuenta en la ventana de contexto

Todo lo que recibe el modelo cuenta hacia el límite de contexto:

- Prompt del sistema (todas las secciones enumeradas anteriormente)
- Historial de conversación (mensajes de usuario + asistente)
- Llamadas a herramientas y resultados de herramientas
- Archivos adjuntos/transcripciones (imágenes, audio, archivos)
- Resúmenes de compactación y artefactos de poda
- Envoltorios de proveedor o encabezados de seguridad (no visibles, pero aún contados)

Para las imágenes, OpenClaw reduce la escala de las cargas útiles de imagen de transcripción/herramienta antes de las llamadas al proveedor.
Use `agents.defaults.imageMaxDimensionPx` (predeterminado: `1200`) para ajustar esto:

- Los valores más bajos generalmente reducen el uso de tokens de visión y el tamaño de la carga útil.
- Los valores más altos preservan más detalles visuales para capturas de pantalla con mucho OCR/interfaz de usuario.

Para un desglose práctico (por archivo inyectado, herramientas, habilidades y tamaño del prompt del sistema), use `/context list` o `/context detail`. Consulte [Context](/es/concepts/context).

## Cómo ver el uso actual de tokens

Use estos en el chat:

- `/status` → **tarjeta de estado rica en emojis** con el modelo de la sesión, uso del contexto,
  tokens de entrada/salida de la última respuesta y **costo estimado** (solo clave de API).
- `/usage off|tokens|full` → añade un **pie de uso por respuesta** a cada respuesta.
  - Persiste por sesión (almacenado como `responseUsage`).
  - La autenticación OAuth **oculta el costo** (solo tokens).
- `/usage cost` → muestra un resumen de costos local de los registros de sesión de OpenClaw.

Otras interfaces:

- **TUI/Web TUI:** se admiten `/status` + `/usage`.
- **CLI:** `openclaw status --usage` y `openclaw channels list` muestran
  las ventanas de cuota del proveedor (no los costos por respuesta).

## Estimación de costos (cuando se muestra)

Los costos se estiman a partir de la configuración de precios de su modelo:

```
models.providers.<provider>.models[].cost
```

Estos son **USD por 1M de tokens** para `input`, `output`, `cacheRead` y
`cacheWrite`. Si faltan los precios, OpenClaw muestra solo los tokens. Los tokens de OAuth
nunca muestran el costo en dólares.

## Impacto del TTL y la poda de la caché

El almacenamiento en caché de prompts del proveedor solo se aplica dentro de la ventana TTL de la caché. OpenClaw puede
opcionalmente ejecutar **poda por TTL de caché**: poda la sesión una vez que el TTL de la caché
ha expirado y luego restablece la ventana de caché para que las solicitudes posteriores puedan reutilizar el
contexto recién almacenado en caché en lugar de volver a almacenar todo el historial. Esto mantiene los costos de
escritura de caché más bajos cuando una sesión permanece inactiva más allá del TTL.

Configúrelo en [Configuración del Gateway](/es/gateway/configuration) y consulte los
detalles del comportamiento en [Poda de sesiones](/es/concepts/session-pruning).

El latido puede mantener la caché **activa** a través de períodos de inactividad. Si el TTL de la caché de su modelo
es `1h`, establecer el intervalo de latido justo por debajo de ese valor (por ejemplo, `55m`) puede evitar
volver a almacenar el prompt completo, reduciendo los costos de escritura de la caché.

En configuraciones multiagente, puedes mantener una configuración de modelo compartida y ajustar el comportamiento del caché
por agente con `agents.list[].params.cacheRetention`.

Para una guía completa paso a paso, consulta [Prompt Caching](/es/reference/prompt-caching).

Para los precios de la API de Anthropic, las lecturas de caché son significativamente más baratas que los tokens
de entrada, mientras que las escrituras de caché se facturan con un multiplicador más alto. Consulta los precios
de almacenamiento en caché de prompts de Anthropic para las tarifas más recientes y los multiplicadores TTL:
[https://docs.anthropic.com/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/docs/build-with-claude/prompt-caching)

### Ejemplo: mantener el caché de 1h caliente con latido

```yaml
agents:
  defaults:
    model:
      primary: "anthropic/claude-opus-4-6"
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "long"
    heartbeat:
      every: "55m"
```

### Ejemplo: tráfico mixto con estrategia de caché por agente

```yaml
agents:
  defaults:
    model:
      primary: "anthropic/claude-opus-4-6"
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "long" # default baseline for most agents
  list:
    - id: "research"
      default: true
      heartbeat:
        every: "55m" # keep long cache warm for deep sessions
    - id: "alerts"
      params:
        cacheRetention: "none" # avoid cache writes for bursty notifications
```

`agents.list[].params` se fusiona encima de `params` del modelo seleccionado, por lo que puedes
sobrescribir solo `cacheRetention` y heredar otros valores predeterminados del modelo sin cambios.

### Ejemplo: habilitar el encabezado beta de contexto 1M de Anthropic

La ventana de contexto de 1M de Anthropic actualmente está en versión beta restringida. OpenClaw puede inyectar el
valor `anthropic-beta` requerido cuando habilitas `context1m` en los modelos Opus
o Sonnet compatibles.

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        params:
          context1m: true
```

Esto corresponde al encabezado beta `context-1m-2025-08-07` de Anthropic.

Esto solo se aplica cuando `context1m: true` está establecido en esa entrada de modelo.

Requisito: la credencial debe ser elegible para el uso de contexto largo (facturación de clave de
API o suscripción con Uso adicional habilitado). Si no, Anthropic responde
con `HTTP 429: rate_limit_error: Extra usage is required for long context requests`.

Si autenticas a Anthropic con tokens de OAuth/suscripción (`sk-ant-oat-*`),
OpenClaw omite el encabezado beta `context-1m-*` porque Anthropic actualmente
rechaza esa combinación con HTTP 401.

## Consejos para reducir la presión de tokens

- Usa `/compact` para resumir sesiones largas.
- Recorta las salidas grandes de herramientas en tus flujos de trabajo.
- Reduce `agents.defaults.imageMaxDimensionPx` para sesiones con muchas capturas de pantalla.
- Mantén las descripciones de las habilidades cortas (la lista de habilidades se inyecta en el prompt).
- Prefiere modelos más pequeños para trabajos detallados y exploratorios.

Consulta [Skills](/es/tools/skills) para la fórmula exacta de sobrecarga de la lista de habilidades.

import es from "/components/footer/es.mdx";

<es />
