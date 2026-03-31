---
summary: "Cómo OpenClaw construye el contexto del prompt y reporta el uso de tokens + costos"
read_when:
  - Explaining token usage, costs, or context windows
  - Debugging context growth or compaction behavior
title: "Uso de Tokens y Costos"
---

# Uso de tokens y costos

OpenClaw rastrea **tokens**, no caracteres. Los tokens son específicos del modelo, pero la mayoría de los modelos de estilo OpenAI promedian ~4 caracteres por token para texto en inglés.

## Cómo se construye el prompt del sistema

OpenClaw ensambla su propio prompt del sistema en cada ejecución. Incluye:

- Lista de herramientas + descripciones breves
- Lista de habilidades (solo metadatos; las instrucciones se cargan a pedido con `read`)
- Instrucciones de autoactualización
- Archivos de área de trabajo + de inicio (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md` cuando son nuevos). Los archivos grandes se truncan por `agents.defaults.bootstrapMaxChars` (predeterminado: 20000).
- Hora (UTC + zona horaria del usuario)
- Etiquetas de respuesta + comportamiento de latido
- Metadatos de tiempo de ejecución (host/SO/modelo/pensamiento)

Vea el desglose completo en [Prompt del Sistema](/en/concepts/system-prompt).

## Qué cuenta en la ventana de contexto

Todo lo que recibe el modelo cuenta hacia el límite de contexto:

- Prompt del sistema (todas las secciones listadas arriba)
- Historial de conversación (mensajes de usuario + asistente)
- Llamadas a herramientas y resultados de herramientas
- Archivos adjuntos/transcripciones (imágenes, audio, archivos)
- Resúmenes de compactación y artefactos de poda
- Envoltorios del proveedor o encabezados de seguridad (no visibles, pero aún contados)

Para un desglose práctico (por archivo inyectado, herramientas, habilidades y tamaño del prompt del sistema), use `/context list` o `/context detail`. Vea [Contexto](/en/concepts/context).

## Cómo ver el uso actual de tokens

Use estos en el chat:

- `/status` → **tarjeta de estado rica en emojis** con el modelo de sesión, uso de contexto,
  tokens de entrada/salida de la última respuesta y **costo estimado** (solo clave de API).
- `/usage off|tokens|full` → agrega un **pie de página de uso por respuesta** a cada respuesta.
  - Persiste por sesión (almacenado como `responseUsage`).
  - La autenticación OAuth **oculta el costo** (solo tokens).
- `/usage cost` → muestra un resumen de costos local de los registros de sesión de OpenClaw.

Otras superficies:

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

## Impacto de TTL y poda de caché

El almacenamiento en caché del prompt del proveedor solo se aplica dentro de la ventana TTL de la caché. OpenClaw puede
opcionalmente ejecutar la **poda de TTL de caché**: poda la sesión una vez que el TTL de la caché
ha expirado y luego restablece la ventana de caché para que las solicitudes posteriores puedan reutilizar el
contexto recién almacenado en caché en lugar de volver a almacenar en caché el historial completo. Esto mantiene los costos de
escritura de caché más bajos cuando una sesión permanece inactiva más allá del TTL.

Configúrelo en [Configuración de Gateway](/en/gateway/configuration) y vea los
detalles del comportamiento en [Poda de sesión](/en/concepts/session-pruning).

El latido (heartbeat) puede mantener la caché **caliente** a través de brechas de inactividad. Si el TTL de caché de su modelo
es `1h`, establecer el intervalo de latido justo por debajo de eso (por ejemplo, `55m`) puede evitar
volver a almacenar en caché el prompt completo, reduciendo los costos de escritura de caché.

Para la precios de la API de Anthropic, las lecturas de caché son significativamente más baratas que los tokens
de entrada, mientras que las escrituras de caché se facturan con un multiplicador más alto. Consulte los precios
de almacenamiento en caché de prompts de Anthropic para conocer las tarifas y multiplicadores TTL más recientes:
https://docs.anthropic.com/docs/build-with-claude/prompt-caching

### Ejemplo: mantener la caché de 1h caliente con latido

```yaml
agents:
  defaults:
    model:
      primary: "anthropic/claude-opus-4-5"
    models:
      "anthropic/claude-opus-4-5":
        params:
          cacheRetention: "long"
    heartbeat:
      every: "55m"
```

## Consejos para reducir la presión de tokens

- Use `/compact` para resumir sesiones largas.
- Recorte las salidas grandes de herramientas en sus flujos de trabajo.
- Mantenga las descripciones de habilidades cortas (la lista de habilidades se inyecta en el prompt).
- Prefiera modelos más pequeños para trabajos verbosos y exploratorios.

Consulte [Habilidades](/en/tools/skills) para la fórmula exacta de sobrecarga de la lista de habilidades.
