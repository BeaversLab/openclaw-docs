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
- Espacio de trabajo + archivos de arranque (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md` cuando son nuevos, más `MEMORY.md` cuando está presente). Los turnos nativos de Codex no pegan el `MEMORY.md` sin procesar del espacio de trabajo del agente configurado cuando las herramientas de memoria están disponibles para ese espacio de trabajo; incluyen un pequeño puntero de memoria y utilizan herramientas de memoria bajo demanda. Si las herramientas están deshabilitadas, la búsqueda de memoria no está disponible, o el espacio de trabajo activo difiere del espacio de trabajo de memoria del agente, `MEMORY.md` utiliza la ruta normal de contexto de turno limitado. La raíz `memory.md` en minúsculas no se inyecta; es una entrada de reparación heredada para `openclaw doctor --fix` cuando se combina con `MEMORY.md`. Los archivos grandes inyectados se truncan mediante `agents.defaults.bootstrapMaxChars` (predeterminado: 12000), y la inyección total de arranque se limita mediante `agents.defaults.bootstrapTotalMaxChars` (predeterminado: 60000). Los archivos diarios `memory/*.md` no forman parte del mensaje de arranque normal; permanecen bajo demanda a través de herramientas de memoria en turnos ordinarios, pero las ejecuciones del modelo de restablecimiento/inicio pueden anteponer un bloque de contexto de inicio de un solo uso con la memoria diaria reciente para ese primer turno. Los comandos `/new` y `/reset` de chat básico se reconocen sin invocar el modelo. El preludio de inicio se controla mediante `agents.defaults.startupContext`. Los extractos de AGENTS.md posteriores a la compactación son separados y requieren una aceptación explícita de `agents.defaults.compaction.postCompactionSections`.
- Hora (UTC + zona horaria del usuario)
- Etiquetas de respuesta + comportamiento de latido
- Metadatos de tiempo de ejecución (host/SO/modelo/pensamiento)

Consulte el desglose completo en [System Prompt](/es/concepts/system-prompt).

Al documentar credenciales o fragmentos de autenticación, utilice las
[Convenciones de marcadores de posición para secretos](/es/reference/secret-placeholder-conventions) para
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

Las anulaciones por agente se encuentran en `agents.list[].contextLimits`. Estos controles son
para fragmentos de tiempo de ejecución limitados y bloques inyectados propiedad del tiempo de ejecución. Son
independientes de los límites de arranque, los límites de contexto de inicio y los límites del prompt de
habilidades.

`toolResultMaxChars` es un techo avanzado. Cuando no está establecido, OpenClaw elige
el límite dinámico de resultados de herramientas a partir de la ventana de contexto efectiva del modelo: `16000` caracteres
por debajo de 100K tokens, `32000` caracteres en 100K+ tokens, y `64000` caracteres en 200K+
tokens, todavía limitado por el guardián de uso compartido de contexto del tiempo de ejecución.

Para las imágenes, OpenClaw reduce la escala de las cargas de imágenes de transcripción/herramientas antes de las llamadas al proveedor.
Use `agents.defaults.imageMaxDimensionPx` (predeterminado: `1200`) para ajustar esto:

- Los valores más bajos generalmente reducen el uso de tokens de visión y el tamaño de la carga útil.
- Los valores más altos preservan más detalles visuales para capturas de pantalla con mucho OCR/UI.

Para un desglose práctico (por archivo inyectado, herramientas, habilidades y tamaño del prompt del sistema), use `/context list` o `/context detail`. Consulte [Contexto](/es/concepts/context).

## Cómo ver el uso actual de tokens

Use estos en el chat:

- `/status` → **tarjeta de estado rica en emojis** con el modelo de sesión, uso de contexto,
  tokens de entrada/salida de la última respuesta y **costo estimado** cuando la fijación de precios local está
  configurada para el modelo activo.
- `/usage off|tokens|full` → agrega un **pie de página de uso por respuesta** a cada respuesta.
  - Persiste por sesión (almacenado como `responseUsage`).
  - `/usage full` muestra el costo estimado solo cuando OpenClaw tiene metadatos de uso y
    precios locales para el modelo activo. De lo contrario, muestra solo los tokens.
- `/usage cost` → muestra un resumen de costos locales de los registros de sesión de OpenClaw.

Otras superficies:

- **TUI/Web TUI:** se admiten `/status` + `/usage`.
- **CLI:** `openclaw status --usage` y `openclaw channels list` muestran
  ventanas de cuota normalizadas del proveedor (`X% left`, no costos por respuesta).
  Proveedores de ventanas de uso actuales: Anthropic, GitHub Copilot, Gemini CLI,
  OpenAI Codex, MiniMax, Xiaomi y z.ai.

Las superficies de uso normalizan los alias de campos nativos comunes del proveedor antes de mostrarlos.
Para el tráfico de Responses de la familia OpenAI, eso incluye tanto `input_tokens` /
`output_tokens` como `prompt_tokens` / `completion_tokens`, por lo que los nombres de campos específicos del transporte no cambian `/status`, `/usage` o los resúmenes de sesión.
El uso de JSON de CLI de Gemini también se normaliza: el texto de respuesta proviene de `response`, y
`stats.cached` se asigna a `cacheRead` con `stats.input_tokens - stats.cached`
cuando la CLI omite un campo `stats.input` explícito.
Para el tráfico nativo de Responses de la familia OpenAI, los alias de uso de WebSocket/SSE se
normalizan de la misma manera, y los totales recurren a la entrada + salida normalizada cuando
`total_tokens` falta o es `0`.
Cuando la instantánea de la sesión actual es dispersa, `/status` y `session_status` también pueden
recuperar los contadores de tokens/caché y la etiqueta del modelo de tiempo de ejecución activo desde el
registro de uso de la transcripción más reciente. Los valores activos distintos de cero existentes aún tienen
prioridad sobre los valores de reserva de la transcripción, y los totales de transcripción orientados al prompt más grandes\pueden ganar cuando los totales almacenados faltan o son más pequeños.
La autenticación de uso para las ventanas de cuota del proveedor proviene de enlaces específicos del proveedor cuando
están disponibles; de lo contrario, OpenClaw recurre a hacer coincidir las credenciales de OAuth/API-key
de los perfiles de autenticación, variables de entorno o configuración.
Las entradas de la transcripción del asistente persisten la misma forma de uso normalizada, incluyendo
`usage.cost` cuando el modelo activo tiene precios configurados y el proveedor
devuelve metadatos de uso. Esto da a `/usage cost` y al estado de sesión respaldado por transcripción
una fuente estable incluso después de que el estado de tiempo de ejecución en vivo haya desaparecido.

OpenClaw mantiene la contabilidad de uso del proveedor separada de la instantánea
del contexto actual. El uso del `usage.total` puede incluir entrada
cacheada, salida y múltiples llamadas al modelo en bucles de herramientas, por lo
que es útil para costos y telemetría, pero puede exagerar la ventana de contexto
en vivo. Las visualizaciones de contexto y los diagnósticos utilizan la última
instantánea del mensaje (`promptTokens`, o la última llamada al modelo
cuando no hay ninguna instantánea de mensaje disponible) para `context.used`.

## Estimación de costos (cuando se muestra)

Los costos se estiman a partir de la configuración de precios de su modelo:

```
models.providers.<provider>.models[].cost
```

Estos son **USD por 1M de tokens** para `input`, `output`,
`cacheRead` y `cacheWrite`. Si faltan los precios, OpenClaw solo muestra
los tokens. La visualización de costos no se limita a la autenticación por clave
de API: los proveedores sin clave de API, como `aws-sdk`, pueden mostrar
el costo estimado cuando su entrada de modelo configurada incluye precios locales
y el proveedor devuelve metadatos de uso.

Después de que los sidecars y los canales alcanzan la ruta lista de la puerta de
enlace (Gateway), OpenClaw inicia un arranque de precios en segundo plano opcional
para las referencias de modelo configuradas que aún no tienen precios locales.
Ese arranque obtiene catálogos de precios remotos de OpenRouter y LiteLLM.
Establezca `models.pricing.enabled: false` para omitir esas recuperaciones de
catálogos en redes sin conexión o restringidas; las entradas explícitas de
`models.providers.*.models[].cost` continúan impulsando las estimaciones de costos locales.

## Impacto del TTL de la caché y la poda

El almacenamiento en caché del mensaje del proveedor solo se aplica dentro de la
ventana del TTL de la caché. OpenClaw puede ejecutar opcionalmente la **poda por
TTL de caché**: poda la sesión una vez que el TTL de la caché ha expirado y luego
reinicia la ventana de la caché para que las solicitudes posteriores puedan
reutilizar el contexto recién cacheado en lugar de volver a almacenar en caché
el historial completo. Esto mantiene los costos de escritura de la caché más
bajos cuando una sesión permanece inactiva más allá del TTL.

Configúrelo en [Configuración de la puerta de enlace (Gateway configuration)](/es/gateway/configuration) y consulte los
detalles del comportamiento en [Poda de sesiones (Session pruning)](/es/concepts/session-pruning).

El latido (heartbeat) puede mantener la caché **caliente** a través de los huecos
de inactividad. Si el TTL de la caché de su modelo es `1h`, establecer
el intervalo de latido justo por debajo de ese valor (por ejemplo,
`55m`) puede evitar volver a almacenar en caché el mensaje
completo, reduciendo los costos de escritura de la caché.

En configuraciones multiagente, puede mantener una configuración de modelo compartida y ajustar el comportamiento del caché
por agente con `agents.list[].params.cacheRetention`.

Para obtener una guía detallada control por control, consulte [Prompt Caching](/es/reference/prompt-caching).

Para la precios de la API de Anthropic, las lecturas de caché son significativamente más económicas que los tokens
de entrada, mientras que las escrituras de caché se facturan con un multiplicador más alto. Consulte los precios
del almacenamiento en caché de prompts de Anthropic para conocer las tarifas más recientes y los multiplicadores de TTL:
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

`agents.list[].params` se fusiona encima de la `params` del modelo seleccionado, por lo que puede
sobrescribir solo `cacheRetention` y heredar otros valores predeterminados del modelo sin cambios.

### Contexto 1M de Anthropic

OpenClaw dimensiona los modelos Claude 4.x con capacidad de GA, como Opus 4.8, Opus 4.7, Opus 4.6 y
Sonnet 4.6, con la ventana de contexto de 1M de Anthropic. No necesita
`params.context1m: true` para esos modelos.

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        alias: opus
```

Las configuraciones más antiguas pueden conservar `context1m: true`, pero OpenClaw ya no envía
el encabezado beta `context-1m-2025-08-07` retirado de Anthropic para esta configuración y
no expande los modelos Claude antiguos no compatibles a 1M.

Requisito: la credencial debe ser elegible para el uso de contexto largo. Si no,
Anthropic responde con un error de límite de velocidad del lado del proveedor para esa solicitud.

Si autentica Anthropic con tokens de OAuth/suscripción (`sk-ant-oat-*`),
OpenClaw conserva los encabezados beta de Anthropic requeridos por OAuth mientras elimina el
beta `context-1m-*` retirado si permanece en la configuración antigua.

## Consejos para reducir la presión de tokens

- Use `/compact` para resumir sesiones largas.
- Recorte las grandes salidas de herramientas en sus flujos de trabajo.
- Reducir `agents.defaults.imageMaxDimensionPx` para sesiones con muchas capturas de pantalla.
- Mantenga las descripciones de las habilidades cortas (la lista de habilidades se inyecta en el prompt).
- Prefiera modelos más pequeños para trabajos detallados y exploratorios.

Consulte [Skills](/es/tools/skills) para conocer la fórmula exacta de sobrecarga de la lista de habilidades.

## Relacionado

- [Uso y costos de la API](/es/reference/api-usage-costs)
- [Almacenamiento en caché de prompts](/es/reference/prompt-caching)
- [Seguimiento de uso](/es/concepts/usage-tracking)
