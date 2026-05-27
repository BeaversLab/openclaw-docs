---
summary: "Cómo OpenClaw construye el contexto del prompt y reporta el uso de tokens + costos"
read_when:
  - Explaining token usage, costs, or context windows
  - Debugging context growth or compaction behavior
title: "Uso de tokens y costos"
---

OpenClaw rastrea **tokens**, no caracteres. Los tokens son específicos del modelo, pero la mayoría
los modelos estilo OpenAI promedian ~4 caracteres por token para el texto en inglés.

## Cómo se construye el mensaje del sistema

OpenClaw ensambla su propio mensaje del sistema en cada ejecución. Incluye:

- Lista de herramientas + descripciones breves
- Lista de habilidades (solo metadatos; las instrucciones se cargan a pedido con `read`).
  El bloque compacto de habilidades está delimitado por `skills.limits.maxSkillsPromptChars`,
  con un override opcional por agente en
  `agents.list[].skillsLimits.maxSkillsPromptChars`.
- Instrucciones de autoactualización
- Archivos de espacio de trabajo + arranque (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md` cuando son nuevos, más `MEMORY.md` cuando está presente). La raíz en minúsculas `memory.md` no se inyecta; es una entrada de reparación heredada para `openclaw doctor --fix` cuando se combina con `MEMORY.md`. Los archivos grandes se truncan mediante `agents.defaults.bootstrapMaxChars` (predeterminado: 12000), y la inyección total de arranque está limitada por `agents.defaults.bootstrapTotalMaxChars` (predeterminado: 60000). Los archivos diarios `memory/*.md` no son parte del mensaje de arranque normal; permanecen bajo demanda a través de herramientas de memoria en turnos ordinarios, pero las ejecuciones del modelo de reinicio/inicio pueden anteponer un bloque de contexto de inicio de un solo uso con memoria diaria reciente para ese primer turno. Los comandos de chat simple `/new` y `/reset` se reconocen sin invocar el modelo. El preludio de inicio se controla mediante `agents.defaults.startupContext`.
- Hora (UTC + zona horaria del usuario)
- Etiquetas de respuesta + comportamiento de latido
- Metadatos de tiempo de ejecución (host/SO/modelo/pensamiento)

Vea el desglose completo en [System Prompt](/es/concepts/system-prompt).

Al documentar credenciales o fragmentos de autenticación, use las
[Secret Placeholder Conventions](/es/reference/secret-placeholder-conventions) para
evitar falsos positivos del escáner de secretos en cambios solo de documentación.

## Qué cuenta en la ventana de contexto

Todo lo que recibe el modelo cuenta hacia el límite de contexto:

- System prompt (todas las secciones listadas arriba)
- Historial de conversación (mensajes de usuario + asistente)
- Llamadas a herramientas y resultados de herramientas
- Archivos adjuntos/transcripciones (imágenes, audio, archivos)
- Resúmenes de compactación y artefactos de poda
- Envoltorios de proveedor o encabezados de seguridad (no visibles, pero aún contados)

Algunas superficies con mucha carga de tiempo de ejecución tienen sus propios límites explícitos:

- `agents.defaults.contextLimits.memoryGetMaxChars`
- `agents.defaults.contextLimits.memoryGetDefaultLines`
- `agents.defaults.contextLimits.toolResultMaxChars`
- `agents.defaults.contextLimits.postCompactionMaxChars`

Las anulaciones por agente viven bajo `agents.list[].contextLimits`. Estos controles son
para fragmentos de tiempo de ejecución delimitados y bloques inyectados propiedad del tiempo de ejecución. Están
separados de los límites de arranque, límites de contexto de inicio y límites del prompt de habilidades.

Para las imágenes, OpenClaw reduce la escala de las cargas de imagen de transcripción/herramientas antes de las llamadas al proveedor.
Use `agents.defaults.imageMaxDimensionPx` (predeterminado: `1200`) para ajustar esto:

- Los valores más bajos generalmente reducen el uso de tokens de visión y el tamaño de la carga.
- Los valores más altos conservan más detalles visuales para capturas de pantalla con mucho OCR/UI.

Para un desglose práctico (por archivo inyectado, herramientas, habilidades y tamaño del prompt del sistema), use `/context list` o `/context detail`. Vea [Context](/es/concepts/context).

## Cómo ver el uso actual de tokens

Use estos en el chat:

- `/status` → **tarjeta de estado rica en emojis** con el modelo de la sesión, uso de contexto,
  tokens de entrada/salida de la última respuesta y **costo estimado** cuando la precios local está
  configurado para el modelo activo.
- `/usage off|tokens|full` → añade un **pie de uso por respuesta** a cada respuesta.
  - Persiste por sesión (almacenado como `responseUsage`).
  - `/usage full` muestra el costo estimado solo cuando OpenClaw tiene metadatos de uso y
    precios local para el modelo activo. De lo contrario, muestra solo tokens.
- `/usage cost` → muestra un resumen de costes local de los registros de sesión de OpenClaw.

Otras superficies:

- **TUI/Web TUI:** `/status` + `/usage` son compatibles.
- **CLI:** `openclaw status --usage` y `openclaw channels list` muestran
  las ventanas de cuota normalizadas del proveedor (`X% left`, no los costes por respuesta).
  Proveedores de ventana de uso actual: Anthropic, GitHub Copilot, Gemini CLI,
  OpenAI Codex, MiniMax, Xiaomi y z.ai.

Las superficies de uso normalizan los alias de campos nativos comunes del proveedor antes de mostrarlos.
Para el tráfico de respuestas de la familia OpenAI, esto incluye tanto `input_tokens` /
`output_tokens` como `prompt_tokens` / `completion_tokens`, por lo que los nombres de campos
eespecíficos del transporte no cambian `/status`, `/usage`, ni los resúmenes de sesión.
El uso de JSON de CLI de Gemini también se normaliza: el texto de respuesta proviene de `response`, y
`stats.cached` se asigna a `cacheRead` con `stats.input_tokens - stats.cached`
usado cuando la CLI omite un campo explícito `stats.input`.
Para el tráfico de respuestas nativas de la familia OpenAI, los alias de uso de WebSocket/SSE se
normalizan de la misma manera, y los totales vuelven a la entrada y salida normalizadas cuando
`total_tokens` falta o es `0`.
Cuando la instantánea de la sesión actual es dispersa, `/status` y `session_status` también pueden
recuperar los contadores de tokens/caché y la etiqueta del modelo de tiempo de ejecución activo desde el
registro de uso de la transcripción más reciente. Los valores activos distintos de cero existentes aún tienen
prioridad sobre los valores de reserva de la transcripción, y los totales de transcripción orientados al prompt
más grandes pueden prevalecer cuando los totales almacenados faltan o son más pequeños.
La autenticación de uso para las ventanas de cuota del proveedor proviene de enlaces específicos del proveedor cuando
están disponibles; de lo contrario, OpenClaw recurre a hacer coincidir las credenciales de OAuth/API-key
desde los perfiles de autenticación, las variables de entorno o la configuración.
Las entradas de la transcripción del asistente persisten la misma forma de uso normalizada, incluyendo
`usage.cost` cuando el modelo activo tiene precios configurados y el proveedor
devuelve metadatos de uso. Esto da `/usage cost` y al estado de sesión respaldado por transcripción
una fuente estable incluso después de que el estado del tiempo de ejecución activo haya desaparecido.

OpenClaw mantiene la contabilidad de uso del proveedor separada de la instantánea del contexto actual. El `usage.total` del proveedor puede incluir entrada almacenada en caché, salida y múltiples llamadas al modelo en bucles de herramientas, por lo que es útil para costes y telemetría, pero puede exagerar la ventana de contexto en vivo. Las visualizaciones de contexto y los diagnósticos utilizan la última instantánea del mensaje (`promptTokens`, o la última llamada al modelo cuando no hay ninguna instantánea del mensaje disponible) para `context.used`.

## Estimación de costes (cuando se muestra)

Los costes se estiman a partir de la configuración de precios de su modelo:

```
models.providers.<provider>.models[].cost
```

Estos son **USD por 1M de tokens** para `input`, `output`, `cacheRead` y `cacheWrite`. Si faltan los precios, OpenClaw muestra solo los tokens. La visualización de costes no se limita a la autenticación con clave de API: los proveedores sin clave de API, como `aws-sdk`, pueden mostrar el coste estimado cuando su entrada de modelo configurada incluye precios locales y el proveedor devuelve metadatos de uso.

Después de que los sidecars y los canales llegan a la ruta lista de Gateway, OpenClaw inicia una carga opcional de precios en segundo plano para las referencias de modelo configuradas que aún no tienen precios locales. Esa carga obtiene catálogos de precios remotos de OpenRouter y LiteLLM. Establezca `models.pricing.enabled: false` para omitir esas obtenciones de catálogo en redes restringidas o sin conexión; las entradas explícitas de `models.providers.*.models[].cost` siguen impulsando las estimaciones de costes locales.

## Impacto del TTL de caché y la poda

El almacenamiento en caché de mensajes del proveedor solo se aplica dentro de la ventana TTL de caché. OpenClaw opcionalmente puede ejecutar la **poda de TTL de caché**: poda la sesión una vez que ha expirado el TTL de caché y luego restablece la ventana de caché para que las solicitudes posteriores puedan reutilizar el contexto recién almacenado en caché en lugar de volver a almacenar en caché el historial completo. Esto mantiene los costes de escritura de caché más bajos cuando una sesión permanece inactiva más allá del TTL.

Configúrelo en [Configuración de Gateway](/es/gateway/configuration) y consulte los detalles del comportamiento en [Poda de sesión](/es/concepts/session-pruning).

El latido puede mantener la caché **caliente** a través de intervalos de inactividad. Si el TTL de caché de su modelo es `1h`, establecer el intervalo de latido justo por debajo de ese valor (por ejemplo, `55m`) puede evitar volver a almacenar en caché el mensaje completo, reduciendo los costes de escritura de caché.

En configuraciones de múltiples agentes, puedes mantener una configuración de modelo compartida y ajustar el comportamiento de la caché por agente con `agents.list[].params.cacheRetention`.

Para obtener una guía completa paso a paso, consulta [Prompt Caching](/es/reference/prompt-caching).

Para la precios de la API de Anthropic, las lecturas de caché son significativamente más baratas que los tokens de entrada, mientras que las escrituras de caché se facturan con un multiplicador más alto. Consulta los precios de caché de prompts de Anthropic para conocer las tarifas más recientes y los multiplicadores de TTL:
[https://docs.anthropic.com/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/docs/build-with-claude/prompt-caching)

### Ejemplo: mantener la caché caliente durante 1h con un latido

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

`agents.list[].params` se fusiona encima del `params` del modelo seleccionado, por lo que puedes anular solo `cacheRetention` y heredar otros valores predeterminados del modelo sin cambios.

### Contexto 1M de Anthropic

OpenClaw dimensiona los modelos Claude 4.x con capacidad de GA, como Opus 4.6, Opus 4.7 y Sonnet 4.6, con la ventana de contexto de 1M de Anthropic. No necesitas `params.context1m: true` para esos modelos.

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        alias: opus
```

Las configuraciones antiguas pueden conservar `context1m: true`, pero OpenClaw ya no envía el encabezado beta retirado `context-1m-2025-08-07` de Anthropic para esta configuración y no expande los modelos Claude antiguos no compatibles a 1M.

Requisito: la credencial debe ser elegible para el uso de contexto largo. Si no lo es,
Anthropic responde con un error de límite de tasa del lado del proveedor para esa solicitud.

Si autenticas a Anthropic con tokens de OAuth/suscripción (`sk-ant-oat-*`), OpenClaw conserva los encabezados beta de Anthropic requeridos por OAuth mientras elimina el beta retirado `context-1m-*` si aún permanece en la configuración antigua.

## Consejos para reducir la presión de tokens

- Usa `/compact` para resumir sesiones largas.
- Recorta las salidas de herramientas grandes en tus flujos de trabajo.
- Reduce `agents.defaults.imageMaxDimensionPx` para sesiones con muchas capturas de pantalla.
- Mantén las descripciones de las habilidades breves (la lista de habilidades se inyecta en el mensaje).
- Prefiere modelos más pequeños para trabajos verbosos y exploratorios.

Consulta [Skills](/es/tools/skills) para conocer la fórmula exacta de sobrecarga de la lista de habilidades.

## Relacionado

- [Uso y costes de la API](/es/reference/api-usage-costs)
- [Caché de prompts](/es/reference/prompt-caching)
- [Seguimiento de uso](/es/concepts/usage-tracking)
