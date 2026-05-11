---
summary: "Cómo OpenClaw construye el contexto del prompt y reporta el uso de tokens + costos"
read_when:
  - Explaining token usage, costs, or context windows
  - Debugging context growth or compaction behavior
title: "Uso de tokens y costos"
---

# Uso de tokens y costos

OpenClaw rastrea **tokens**, no caracteres. Los tokens son específicos del modelo, pero la mayoría de
los modelos de estilo OpenAI promedian ~4 caracteres por token para el texto en inglés.

## Cómo se construye el prompt del sistema

OpenClaw ensambla su propio prompt del sistema en cada ejecución. Incluye:

- Lista de herramientas + descripciones cortas
- Lista de habilidades (solo metadatos; las instrucciones se cargan bajo demanda con `read`).
  El bloque compacto de habilidades está delimitado por `skills.limits.maxSkillsPromptChars`,
  con un override opcional por agente en
  `agents.list[].skillsLimits.maxSkillsPromptChars`.
- Instrucciones de autoactualización
- Espacio de trabajo + archivos de arranque (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md` cuando son nuevos, más `MEMORY.md` cuando está presente). La raíz en minúsculas `memory.md` no se inyecta; es una entrada de reparación heredada para `openclaw doctor --fix` cuando se empareja con `MEMORY.md`. Los archivos grandes se truncan mediante `agents.defaults.bootstrapMaxChars` (predeterminado: 12000), y la inyección total de arranque está limitada por `agents.defaults.bootstrapTotalMaxChars` (predeterminado: 60000). Los archivos diarios `memory/*.md` no son parte del mensaje de arranque normal; permanecen bajo demanda a través de herramientas de memoria en turnos ordinarios, pero `/new` y `/reset` solos pueden anteponer un bloque de contexto de inicio único con memoria diaria reciente para ese primer turno. Ese preludio de inicio se controla mediante `agents.defaults.startupContext`.
- Hora (UTC + zona horaria del usuario)
- Etiquetas de respuesta + comportamiento de latido
- Metadatos de tiempo de ejecución (host/SO/modelo/pensamiento)

Vea el desglose completo en [System Prompt](/es/concepts/system-prompt).

## Qué cuenta en la ventana de contexto

Todo lo que recibe el modelo cuenta hacia el límite de contexto:

- Prompt del sistema (todas las secciones listadas anteriormente)
- Historial de conversación (mensajes de usuario + asistente)
- Llamadas a herramientas y resultados de herramientas
- Adjuntos/transcripciones (imágenes, audio, archivos)
- Resúmenes de compactación y artefactos de poda
- Los contenedores del proveedor o los encabezados de seguridad (no visibles, pero aún contados)

Algunas superficies con uso intensivo de tiempo de ejecución tienen sus propios límites explícitos:

- `agents.defaults.contextLimits.memoryGetMaxChars`
- `agents.defaults.contextLimits.memoryGetDefaultLines`
- `agents.defaults.contextLimits.toolResultMaxChars`
- `agents.defaults.contextLimits.postCompactionMaxChars`

Las anulaciones por agente se encuentran bajo `agents.list[].contextLimits`. Estos controles son
para extractos de tiempo de ejecución delimitados y bloques inyectados propiedad del tiempo de ejecución. Están
separados de los límites de arranque, los límites de contexto de inicio y los límites del mensaje
de habilidades.

Para las imágenes, OpenClaw reduce la escala de las cargas útiles de imágenes de herramientas/transcripciones antes de las llamadas al proveedor.
Use `agents.defaults.imageMaxDimensionPx` (predeterminado: `1200`) para ajustar esto:

- Los valores más bajos generalmente reducen el uso de tokens de visión y el tamaño de la carga útil.
- Los valores más altos preservan más detalles visuales para capturas de pantalla con mucho contenido de OCR/interfaz de usuario.

Para un desglose práctico (por archivo inyectado, herramientas, habilidades y tamaño del mensaje del sistema), use `/context list` o `/context detail`. Vea [Context](/es/concepts/context).

## Cómo ver el uso actual de tokens

Use estos en el chat:

- `/status` → **tarjeta de estado rica en emojis** con el modelo de sesión, uso del contexto,
  tokens de entrada/salida de la última respuesta y **costo estimado** (solo clave de API).
- `/usage off|tokens|full` → agrega un **pie de página de uso por respuesta** a cada respuesta.
  - Persiste por sesión (almacenado como `responseUsage`).
  - La autenticación OAuth **oculta el costo** (solo tokens).
- `/usage cost` → muestra un resumen de costos local de los registros de sesión de OpenClaw.

Otras superficies:

- **TUI/Web TUI:** se admiten `/status` + `/usage`.
- **CLI:** `openclaw status --usage` y `openclaw channels list` muestran
  ventanas de cuota de proveedor normalizadas (`X% left`, no costos por respuesta).
  Proveedores de ventana de uso actuales: Anthropic, GitHub Copilot, Gemini CLI,
  OpenAI Codex, MiniMax, Xiaomi y z.ai.

Las superficies de uso normalizan los alias de campos nativos comunes del proveedor antes de mostrarlos.
Para el tráfico de respuestas de la familia de OpenAI, eso incluye tanto `input_tokens` /
`output_tokens` como `prompt_tokens` / `completion_tokens`, por lo que los nombres de campos\ específicos del transporte no cambian `/status`, `/usage` o resúmenes de sesión.
El uso de JSON de la CLI de Gemini también se normaliza: el texto de respuesta proviene de `response`, y
`stats.cached` se asigna a `cacheRead` usando `stats.input_tokens - stats.cached`
cuando la CLI omite un campo explícito `stats.input`.
Para el tráfico de respuestas nativo de la familia de OpenAI, los alias de uso de WebSocket/SSE se
normalizan de la misma manera, y los totales recurren a la entrada y salida normalizadas cuando
`total_tokens` falta o es `0`.
Cuando la instantánea de la sesión actual es dispersa, `/status` y `session_status` también pueden
recuperar los contadores de token/caché y la etiqueta del modelo de tiempo de ejecución activo desde el
registro de uso de la transcripción más reciente. Los valores en vivo distintos de cero existentes aún tienen
prioridad sobre los valores de reserva de la transcripción, y los totales de la transcripción orientados al prompt más grandes\pueden ganar cuando los totales almacenados faltan o son menores.
La autorización de uso para las ventanas de cuota del proveedor proviene de enlaces específicos del proveedor cuando
están disponibles; de lo contrario, OpenClaw recurre a hacer coincidir las credenciales de OAuth/clave de API
desde perfiles de autenticación, variables de entorno o configuración.
Las entradas de la transcripción del asistente persisten la misma forma de uso normalizada, incluyendo
`usage.cost` cuando el modelo activo tiene precios configurados y el proveedor
devuelve metadatos de uso. Esto da a `/usage cost` y al estado de sesión respaldado por transcripción
una fuente estable incluso después de que el estado de tiempo de ejecución en vivo haya desaparecido.

OpenClaw mantiene la contabilidad de uso del proveedor separada de la instantánea del contexto actual. El `usage.total` del proveedor puede incluir entrada en caché, salida y múltiples llamadas al modelo en bucles de herramientas, por lo que es útil para los costos y la telemetría, pero puede exagerar la ventana de contexto en vivo. Las visualizaciones de contexto y los diagnósticos utilizan la última instantánea del mensaje (`promptTokens`, o la última llamada al modelo cuando no hay ninguna instantánea del mensaje disponible) para `context.used`.

## Estimación de costos (cuando se muestra)

Los costos se estiman a partir de la configuración de precios de su modelo:

```
models.providers.<provider>.models[].cost
```

Estos son **USD por 1M de tokens** para `input`, `output`, `cacheRead` y `cacheWrite`. Si falta el precio, OpenClaw solo muestra los tokens. Los tokens de OAuth nunca muestran el costo en dólares.

## Impacto del TTL y la poda de la caché

El almacenamiento en caché del mensaje del proveedor solo se aplica dentro de la ventana del TTL de la caché. OpenClaw puede opcionalmente ejecutar la **poda por TTL de caché**: poda la sesión una vez que el TTL de la caché ha expirado y luego restablece la ventana de la caché para que las solicitudes posteriores puedan reutilizar el contexto recién almacenado en caché en lugar de volver a almacenar en caché el historial completo. Esto mantiene los costos de escritura de la caché más bajos cuando una sesión permanece inactiva más allá del TTL.

Configúrelo en [Configuración de Gateway](/es/gateway/configuration) y consulte los detalles del comportamiento en [Poda de sesiones](/es/concepts/session-pruning).

El latido (heartbeat) puede mantener la caché **activa** durante los períodos de inactividad. Si el TTL de la caché de su modelo es `1h`, establecer el intervalo de latido justo por debajo de ese valor (por ejemplo, `55m`) puede evitar volver a almacenar en caché el mensaje completo, reduciendo los costos de escritura de la caché.

En configuraciones de múltiples agentes, puede mantener una configuración de modelo compartida y ajustar el comportamiento de la caché por agente con `agents.list[].params.cacheRetention`.

Para obtener una guía completa paso a paso, consulte [Almacenamiento en caché de mensajes](/es/reference/prompt-caching).

Para la precios de la API de Anthropic, las lecturas de caché son significativamente más baratas que los tokens de entrada, mientras que las escrituras de caché se facturan con un multiplicador más alto. Consulte los precios de almacenamiento en caché de mensajes de Anthropic para conocer las tarifas más recientes y los multiplicadores de TTL:
[https://docs.anthropic.com/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/docs/build-with-claude/prompt-caching)

### Ejemplo: mantener la caché de 1h activa con latido

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

`agents.list[].params` se fusiona encima de los `params` del modelo seleccionado, por lo que puedes
sobrescribir solo `cacheRetention` y heredar otros valores predeterminados del modelo sin cambios.

### Ejemplo: habilitar el encabezado beta de contexto 1M de Anthropic

La ventana de contexto de 1M de Anthropic está actualmente limitada a la versión beta. OpenClaw puede inyectar el
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

Esto se asigna al encabezado beta `context-1m-2025-08-07` de Anthropic.

Esto solo se aplica cuando se establece `context1m: true` en esa entrada del modelo.

Requisito: la credencial debe ser elegible para el uso de contexto largo. Si no lo es,
Anthropic responde con un error de límite de tasa del lado del proveedor para esa solicitud.

Si autenticas a Anthropic con tokens de OAuth/suscripción (`sk-ant-oat-*`),
OpenClaw omite el encabezado beta `context-1m-*` porque Anthropic actualmente
rechaza esa combinación con HTTP 401.

## Consejos para reducir la presión de tokens

- Usa `/compact` para resumir sesiones largas.
- Recorta las salidas de herramientas grandes en tus flujos de trabajo.
- Reduce `agents.defaults.imageMaxDimensionPx` para sesiones con muchas capturas de pantalla.
- Mantén las descripciones de las habilidades breves (la lista de habilidades se inyecta en el mensaje).
- Prefiere modelos más pequeños para trabajos verbosos y exploratorios.

Consulta [Habilidades](/es/tools/skills) para ver la fórmula exacta de sobrecarga de la lista de habilidades.

## Relacionado

- [Uso y costos de la API](/es/reference/api-usage-costs)
- [Caché de mensajes](/es/reference/prompt-caching)
- [Seguimiento de uso](/es/concepts/usage-tracking)
