---
summary: "Cómo OpenClaw construye el contexto del prompt y reporta el uso de tokens + costos"
read_when:
  - Explaining token usage, costs, or context windows
  - Debugging context growth or compaction behavior
title: "Uso de Tokens y Costos"
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
- Archivos de espacio de trabajo + de arranque (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md` cuando son nuevos, además de `MEMORY.md` cuando está presente o `memory.md` como alternativa en minúsculas). Los archivos grandes se truncan por `agents.defaults.bootstrapMaxChars` (predeterminado: 12000), y la inyección total de arranque está limitada por `agents.defaults.bootstrapTotalMaxChars` (predeterminado: 60000). Los archivos diarios `memory/*.md` no son parte del prompt de arranque normal; permanecen bajo demanda a través de herramientas de memoria en turnos ordinarios, pero `/new` y `/reset` simples pueden anteponer un bloque de contexto de inicio único con memoria diaria reciente para ese primer turno. Ese preludio de inicio está controlado por `agents.defaults.startupContext`.
- Hora (UTC + zona horaria del usuario)
- Etiquetas de respuesta + comportamiento de latido
- Metadatos de tiempo de ejecución (host/SO/modelo/pensamiento)

Vea el desglose completo en [Prompt del Sistema](/en/concepts/system-prompt).

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
separados de los límites de arranque, los límites de contexto de inicio y los límites del prompt de habilidades.

Para las imágenes, OpenClaw reduce la escala de las cargas útiles de imagen de transcripción/herramientas antes de las llamadas al proveedor.
Use `agents.defaults.imageMaxDimensionPx` (predeterminado: `1200`) para ajustar esto:

- Los valores más bajos generalmente reducen el uso de tokens de visión y el tamaño de la carga útil.
- Los valores más altos preservan más detalles visuales para capturas de pantalla con mucho contenido de OCR/interfaz de usuario.

Para un desglose práctico (por archivo inyectado, herramientas, habilidades y tamaño del prompt del sistema), use `/context list` o `/context detail`. Consulte [Contexto](/en/concepts/context).

## Cómo ver el uso actual de tokens

Use estos en el chat:

- `/status` → **tarjeta de estado rica en emojis** con el modelo de sesión, uso del contexto,
  tokens de entrada/salida de la última respuesta y **costo estimado** (solo clave de API).
- `/usage off|tokens|full` → agrega un **pie de página de uso por respuesta** a cada respuesta.
  - Persiste por sesión (almacenado como `responseUsage`).
  - La autenticación OAuth **oculta el costo** (solo tokens).
- `/usage cost` → muestra un resumen de costos local de los registros de sesión de OpenClaw.

Otras superficies:

- **TUI/Web TUI:** `/status` + `/usage` son compatibles.
- **CLI:** `openclaw status --usage` y `openclaw channels list` muestran
  ventanas de cuota del proveedor normalizadas (`X% left`, no costos por respuesta).
  Proveedores actuales de ventana de uso: Anthropic, GitHub Copilot, Gemini CLI,
  OpenAI Codex, MiniMax, Xiaomi y z.ai.

Las superficies de uso normalizan los alias comunes de campos nativos del proveedor antes de mostrarlos.
Para el tráfico de Responses de la familia OpenAI, esto incluye tanto `input_tokens` /
`output_tokens` como `prompt_tokens` / `completion_tokens`, por lo que los nombres de campos
específicos del transporte no cambian `/status`, `/usage` ni los resúmenes de sesión.
El uso de JSON de la CLI de Gemini también se normaliza: el texto de respuesta proviene de `response`, y
`stats.cached` se asigna a `cacheRead` usando `stats.input_tokens - stats.cached`
cuando la CLI omite un campo explícito `stats.input`.
Para el tráfico nativo de Responses de la familia OpenAI, los alias de uso de WebSocket/SSE se
normalizan de la misma manera, y los totales vuelven a la entrada y salida normalizadas cuando
`total_tokens` falta o es `0`.
Cuando la instantánea de la sesión actual es dispersa, `/status` y `session_status` también pueden
recuperar los contadores de tokens/caché y la etiqueta del modelo de tiempo de ejecución activo desde el
registro de uso de la transcripción más reciente. Los valores vivos distintos de cero existentes aún tienen
prioridad sobre los valores de reserva de la transcripción, y los totales de transcripción orientados al prompt
más grandes pueden prevalecer cuando los totales almacenados faltan o son más pequeños.
La autenticación de uso para las ventanas de cuota del proveedor proviene de ganchos específicos del proveedor cuando
están disponibles; de lo contrario, OpenClaw recurre a hacer coincidir las credenciales de OAuth/API-key
desde los perfiles de autenticación, las variables de entorno o la configuración.

## Estimación de costos (cuando se muestra)

Los costos se estiman a partir de la configuración de precios de su modelo:

```
models.providers.<provider>.models[].cost
```

Estos son **USD por 1M de tokens** para `input`, `output`, `cacheRead` y
`cacheWrite`. Si falta el precio, OpenClaw solo muestra tokens. Los tokens de OAuth
nunca muestran el costo en dólares.

## Impacto del TTL de caché y la poda

El almacenamiento en caché del prompt del proveedor solo se aplica dentro de la ventana TTL de caché. OpenClaw puede
ejecutar opcionalmente **poda de cache-ttl**: poda la sesión una vez que el TTL de caché
ha expirado y luego restablece la ventana de caché para que las solicitudes posteriores puedan reutilizar el
contexto recién almacenado en caché en lugar de volver a almacenar en caché el historial completo. Esto mantiene los costos
de escritura de caché más bajos cuando una sesión permanece inactiva más allá del TTL.

Configúrelo en [Configuración de Gateway](/en/gateway/configuration) y vea los
detalles del comportamiento en [Poda de sesiones](/en/concepts/session-pruning).

Heartbeat puede mantener la caché **caliente** durante los períodos de inactividad. Si el TTL de
la caché de su modelo es `1h`, establecer el intervalo de heartbeat justo por debajo de ese (p. ej., `55m`) puede evitar
volver a almacenar en caché el prompt completo, reduciendo los costos de escritura de caché.

En configuraciones multiagente, puede mantener una configuración de modelo compartida y ajustar el comportamiento de la caché
por agente con `agents.list[].params.cacheRetention`.

Para obtener una guía detallada paso a paso, consulte [Caché de prompts](/en/reference/prompt-caching).

Para la precios de la API de Anthropic, las lecturas de caché son significativamente más baratas que los
tokens de entrada, mientras que las escrituras de caché se facturan con un multiplicador más alto. Consulte la precios
de caché de prompts de Anthropic para conocer las tarifas más recientes y los multiplicadores de TTL:
[https://docs.anthropic.com/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/docs/build-with-claude/prompt-caching)

### Ejemplo: mantener la caché de 1 h caliente con heartbeat

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

`agents.list[].params` se fusiona encima del `params` del modelo seleccionado, por lo que puede
anular solo `cacheRetention` y heredar otros valores predeterminados del modelo sin cambios.

### Ejemplo: habilitar el encabezado beta de contexto 1M de Anthropic

La ventana de contexto de 1M de Anthropic actualmente está en beta. OpenClaw puede inyectar el
valor `anthropic-beta` requerido cuando habilita `context1m` en los modelos Opus
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

Esto solo se aplica cuando `context1m: true` se establece en esa entrada de modelo.

Requisito: la credencial debe ser elegible para el uso de contexto largo. Si no,
Anthropic responde con un error de límite de tasa del proveedor para esa solicitud.

Si autentica a Anthropic con tokens de OAuth/suscripción (`sk-ant-oat-*`),
OpenClaw omite el encabezado beta `context-1m-*` porque Anthropic actualmente
rechaza esa combinación con HTTP 401.

## Consejos para reducir la presión de tokens

- Use `/compact` para resumir sesiones largas.
- Recorte las salidas de herramientas grandes en sus flujos de trabajo.
- Reduzca `agents.defaults.imageMaxDimensionPx` para sesiones con muchas capturas de pantalla.
- Mantenga las descripciones de habilidades cortas (la lista de habilidades se inyecta en el prompt).
- Prefiera modelos más pequeños para trabajos verbosos y exploratorios.

Consulte [Skills](/en/tools/skills) para obtener la fórmula exacta de la sobrecarga de la lista de habilidades.
