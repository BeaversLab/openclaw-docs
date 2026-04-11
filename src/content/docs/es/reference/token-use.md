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

Vea el desglose completo en [System Prompt](/en/concepts/system-prompt).

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

Para un desglose práctico (por archivo inyectado, herramientas, habilidades y tamaño del prompt del sistema), use `/context list` o `/context detail`. Vea [Context](/en/concepts/context).

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
  ventanas de cuota de proveedor normalizadas (`X% left`, no costos por respuesta).
  Proveedores de ventanas de uso actuales: Anthropic, GitHub Copilot, Gemini CLI,
  OpenAI Codex, MiniMax, Xiaomi y z.ai.

Las superficies de uso normalizan los alias de campos nativos comunes del proveedor antes de mostrarlos.
Para el tráfico de Responses de la familia OpenAI, eso incluye tanto `input_tokens` /
`output_tokens` como `prompt_tokens` / `completion_tokens`, por lo que los nombres de campos específicos del transporte
no cambian `/status`, `/usage` o resúmenes de sesión.
El uso JSON de Gemini CLI también se normaliza: el texto de respuesta proviene de `response`, y
`stats.cached` se asigna a `cacheRead` con `stats.input_tokens - stats.cached`
utilizado cuando la CLI omite un campo `stats.input` explícito.
Para el tráfico nativo de Responses de la familia OpenAI, los alias de uso de WebSocket/SSE se
normalizan de la misma manera, y los totales vuelven a la entrada y salida normalizadas cuando
`total_tokens` falta o `0`.
Cuando la instantánea de la sesión actual es dispersa, `/status` y `session_status` también pueden
recuperar los contadores de token/caché y la etiqueta del modelo de tiempo de ejecución activo del
registro de uso de la transcripción más reciente. Los valores en vivo distintos de cero existentes aún tienen
prioridad sobre los valores de reserva de la transcripción, y los totales de transcripción orientados al prompt más grandes
ganan cuando los totales almacenados faltan o son más pequeños.
La autenticación de uso para las ventanas de cuota del proveedor proviene de enlaces específicos del proveedor cuando
están disponibles; de lo contrario, OpenClaw recurre a coincidir con las credenciales de OAuth/API-key
de los perfiles de autenticación, el entorno o la configuración.

## Estimación de costos (cuando se muestra)

Los costos se estiman a partir de la configuración de precios de su modelo:

```
models.providers.<provider>.models[].cost
```

Estos son **USD por 1M de tokens** para `input`, `output`, `cacheRead` y
`cacheWrite`. Si falta la tarifa, OpenClaw muestra solo los tokens. Los tokens de OAuth
nunca muestran el costo en dólares.

## Impacto de la caché TTL y la poda

El almacenamiento en caché del proveedor solo se aplica dentro de la ventana de TTL de la caché. OpenClaw puede
opcionalmente ejecutar la **poda de TTL de caché**: poda la sesión una vez que el TTL de la caché
ha expirado y luego restablece la ventana de la caché para que las solicitudes posteriores puedan reutilizar el
contexto recién almacenado en caché en lugar de volver a almacenar todo el historial. Esto mantiene los costos de
escritura de caché más bajos cuando una sesión permanece inactiva más allá del TTL.

Configúrelo en [Gateway configuration](/en/gateway/configuration) y vea los
detalles del comportamiento en [Session pruning](/en/concepts/session-pruning).

El latido puede mantener la caché ** caliente** a través de los intervalos de inactividad. Si el TTL de la caché de su modelo
es `1h`, establecer el intervalo de latido justo por debajo de eso (por ejemplo, `55m`) puede evitar
volver a almacenar el mensaje completo, reduciendo los costos de escritura de caché.

En configuraciones de múltiples agentes, puede mantener una configuración de modelo compartida y ajustar el comportamiento de la caché
por agente con `agents.list[].params.cacheRetention`.

Para una guía completa control por control, vea [Prompt Caching](/en/reference/prompt-caching).

Para los precios de la API de Anthropic, las lecturas de caché son significativamente más baratas que los tokens de entrada,
mientras que las escrituras de caché se facturan con un multiplicador más alto. Vea los precios de
caché de prompts de Anthropic para las tarifas y multiplicadores TTL más recientes:
[https://docs.anthropic.com/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/docs/build-with-claude/prompt-caching)

### Ejemplo: mantener 1h de caché caliente con latido

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

`agents.list[].params` se fusiona encima de `params` del modelo seleccionado, por lo que puede
anular solo `cacheRetention` y heredar otros valores predeterminados del modelo sin cambios.

### Ejemplo: habilitar el encabezado beta de contexto 1M de Anthropic

La ventana de contexto de 1M de Anthropic actualmente está en versión beta. OpenClaw puede inyectar el
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

Esto solo se aplica cuando `context1m: true` está configurado en esa entrada de modelo.

Requisito: la credencial debe ser elegible para el uso de contexto largo. Si no,
Anthropic responde con un error de límite de velocidad del proveedor para esa solicitud.

Si autentica a Anthropic con tokens de OAuth/suscripción (`sk-ant-oat-*`),
OpenClaw omite el encabezado beta `context-1m-*` porque Anthropic actualmente
rechaza esa combinación con HTTP 401.

## Consejos para reducir la presión de tokens

- Use `/compact` para resumir sesiones largas.
- Recorta las salidas grandes de las herramientas en tus flujos de trabajo.
- Reduzca `agents.defaults.imageMaxDimensionPx` para sesiones con muchas capturas de pantalla.
- Mantén las descripciones de las habilidades breves (la lista de habilidades se inyecta en el mensaje).
- Prefiere modelos más pequeños para el trabajo detallado y exploratorio.

Vea [Skills](/en/tools/skills) para la fórmula exacta de sobrecarga de la lista de habilidades.
