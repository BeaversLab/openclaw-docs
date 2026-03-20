---
summary: "Cómo OpenClaw construye el contexto del prompt y reporta el uso de tokens + costos"
read_when:
  - Explicando el uso de tokens, costos o ventanas de contexto
  - Depurando el crecimiento o comportamiento de compactación del contexto
title: "Uso de tokens y costos"
---

# Uso de tokens y costos

OpenClaw rastrea **tokens**, no caracteres. Los tokens son específicos del modelo, pero la mayoría
de los modelos estilo OpenAI promedian ~4 caracteres por token para texto en inglés.

## Cómo se construye el prompt del sistema

OpenClaw ensambla su propio prompt del sistema en cada ejecución. Incluye:

- Lista de herramientas + breves descripciones
- Lista de habilidades (solo metadatos; las instrucciones se cargan bajo demanda con `read`)
- Instrucciones de autoactualización
- Archivos del espacio de trabajo + de arranque (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md` cuando son nuevos). Los archivos grandes se truncan por `agents.defaults.bootstrapMaxChars` (predeterminado: 20000).
- Hora (UTC + zona horaria del usuario)
- Etiquetas de respuesta + comportamiento de latido
- Metadatos de tiempo de ejecución (host/SO/modelo/pensamiento)

Vea el desglose completo en [Prompt del sistema](/es/concepts/system-prompt).

## Qué cuenta en la ventana de contexto

Todo lo que el modelo recibe cuenta hacia el límite de contexto:

- Prompt del sistema (todas las secciones listadas arriba)
- Historial de conversación (mensajes de usuario + asistente)
- Llamadas a herramientas y resultados de herramientas
- Archivos adjuntos/transcripciones (imágenes, audio, archivos)
- Resúmenes de compactación y artefactos de poda
- Envoltorios del proveedor o encabezados de seguridad (no visibles, pero aún contados)

Para un desglose práctico (por archivo inyectado, herramientas, habilidades y tamaño del prompt del sistema), use `/context list` o `/context detail`. Vea [Contexto](/es/concepts/context).

## Cómo ver el uso actual de tokens

Use estos en el chat:

- `/status` → **tarjeta de estado con muchos emojis** con el modelo de la sesión, uso del contexto,
  tokens de entrada/salida de la última respuesta y **costo estimado** (solo clave de API).
- `/usage off|tokens|full` → agrega un **pie de página de uso por respuesta** a cada respuesta.
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
`cacheWrite`. Si faltan los precios, OpenClaw solo muestra los tokens. Los tokens de OAuth
nunca muestran el costo en dólares.

## Impacto del TTL y la poda de la caché

El almacenamiento en caché del proveedor solo se aplica dentro de la ventana del TTL de la caché. OpenClaw puede
opcionalmente ejecutar la **poda por TTL de caché**: poda la sesión una vez que el TTL de la caché
ha expirado y luego restablece la ventana de caché para que las solicitudes posteriores puedan reutilizar el
contexto recién almacenado en caché en lugar de volver a almacenar en caché el historial completo. Esto mantiene los costos de
escritura de caché más bajos cuando una sesión permanece inactiva más allá del TTL.

Configúrelo en [Configuración de Gateway](/es/gateway/configuration) y vea los
detalles del comportamiento en [Poda de sesión](/es/concepts/session-pruning).

Heartbeat puede mantener la caché **activa** a través de los períodos de inactividad. Si el TTL de la caché de su modelo
es `1h`, establecer el intervalo de heartbeat justo debajo de eso (p. ej., `55m`) puede evitar
volver a almacenar en caché el mensaje completo, reduciendo los costos de escritura de caché.

Para la fijación de precios de la API de Anthropic, las lecturas de caché son significativamente más baratas que los tokens
de entrada, mientras que las escrituras de caché se facturan con un multiplicador más alto. Consulte los precios de
almacenamiento en caché de mensajes de Anthropic para ver las tasas y multiplicadores de TTL más recientes:
https://docs.anthropic.com/docs/build-with-claude/prompt-caching

### Ejemplo: mantener la caché de 1h activa con heartbeat

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
- Recorte las salidas grandes de las herramientas en sus flujos de trabajo.
- Mantenga las descripciones de las habilidades cortas (la lista de habilidades se inyecta en el mensaje).
- Prefiera modelos más pequeños para trabajos verbosos y exploratorios.

Consulte [Habilidades](/es/tools/skills) para obtener la fórmula exacta de sobrecarga de la lista de habilidades.

import es from "/components/footer/es.mdx";

<es />
