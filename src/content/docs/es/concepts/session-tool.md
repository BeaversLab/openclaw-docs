---
summary: "Herramientas de agente para el estado entre sesiones, recuperación, mensajería y orquestación de sub-agentes"
read_when:
  - You want to understand what session tools the agent has
  - You want to configure cross-session access or sub-agent spawning
  - You want to inspect status or control spawned sub-agents
title: "Herramientas de sesión"
---

# Herramientas de sesión

OpenClaw proporciona a los agentes herramientas para trabajar a través de sesiones, inspeccionar el estado y orquestar sub-agentes.

## Herramientas disponibles

| Herramienta        | Lo que hace                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| `sessions_list`    | Lista sesiones con filtros opcionales (tipo, recentness)                                            |
| `sessions_history` | Lee la transcripción de una sesión específica                                                       |
| `sessions_send`    | Envía un mensaje a otra sesión y opcionalmente espera                                               |
| `sessions_spawn`   | Genera una sesión de sub-agente aislada para trabajos en segundo plano                              |
| `sessions_yield`   | Termina el turno actual y espera los resultados de seguimiento del sub-agente                       |
| `subagents`        | Listar, dirigir o eliminar sub-agentes generados para esta sesión                                   |
| `session_status`   | Muestra una tarjeta estilo `/status` y, opcionalmente, establece una anulación de modelo por sesión |

## Listar y leer sesiones

`sessions_list` devuelve sesiones con su clave, tipo, canal, modelo, recuento de tokens y marcas de tiempo. Filtrar por tipo (`main`, `group`, `cron`, `hook`, `node`) o por recencia (`activeMinutes`).

`sessions_history` obtiene la transcripción de la conversación para una sesión específica. De forma predeterminada, los resultados de las herramientas se excluyen; pasa `includeTools: true` para verlos. La vista devuelta está intencionalmente limitada y filtrada por seguridad:

- el texto del asistente se normaliza antes de la recuperación:
  - se eliminan las etiquetas de pensamiento (thinking tags)
  - se eliminan los bloques de andamiaje `<relevant-memories>` / `<relevant_memories>`
  - se eliminan los bloques de carga útil XML de llamadas a herramientas en texto plano, como `<tool_call>...</tool_call>`, `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>` y `<function_calls>...</function_calls>`, incluidas las cargas útiles truncadas que nunca se cierran correctamente
  - se elimina el andamiaje de llamadas/resultado de herramientas degradado, como `[Tool Call: ...]`, `[Tool Result ...]` y `[Historical context ...]`
  - se eliminan los tokens de control del modelo filtrados, como `<|assistant|>`, otros tokens ASCII `<|...|>` y variantes de ancho completo `<｜...｜>`
  - se elimina el XML malformado de llamadas a herramientas de MiniMax, como `<invoke ...>` / `</minimax:tool_call>`
- el texto similar a credenciales/tokens se redacta antes de devolverse
- los bloques de texto largo se truncan
- los historiales muy grandes pueden descartar filas antiguas o reemplazar una fila sobredimensionada con
  `[sessions_history omitted: message too large]`
- la herramienta reporta banderas de resumen como `truncated`, `droppedMessages`,
  `contentTruncated`, `contentRedacted` y `bytes`

Ambas herramientas aceptan una **clave de sesión** (como `"main"`) o un **ID de sesión**
de una llamada de lista anterior.

Si necesita la transcripción byte por byte exacta, inspeccione el archivo de transcripción en
disco en lugar de tratar `sessions_history` como un volcado bruto.

## Envío de mensajes entre sesiones

`sessions_send` entrega un mensaje a otra sesión y opcionalmente espera
la respuesta:

- **Disparar y olvidar (fire-and-forget):** configure `timeoutSeconds: 0` para poner en cola y retornar
  inmediatamente.
- **Esperar respuesta:** configure un tiempo de espera y obtenga la respuesta en línea.

Después de que el destino responda, OpenClaw puede ejecutar un **bucle de respuesta (reply-back loop)** donde los
agentes alternan mensajes (hasta 5 turnos). El agente de destino puede responder
`REPLY_SKIP` para detenerse antes.

## Ayudantes de estado y orquestación

`session_status` es la herramienta equivalente ligera a `/status` para la sesión
actual u otra visible. Reporta el uso, el tiempo, el estado del modelo/tiempo de ejecución y
el contexto de tareas en segundo plano vinculadas cuando están presentes. Al igual que `/status`, puede rellenar
contadores dispersos de tokens/caché desde la última entrada de uso de la transcripción, y
`model=default` borra una anulación por sesión.

`sessions_yield` finaliza intencionalmente el turno actual para que el siguiente mensaje pueda ser
el evento de seguimiento que está esperando. Úselo después de generar sub-agentes cuando
quiera que los resultados de finalización lleguen como el siguiente mensaje en lugar de construir
bucles de sondeo (poll loops).

`subagents` es el ayudante del plano de control para los sub-agentes de OpenClaw
ya generados. Soporta:

- `action: "list"` para inspeccionar ejecuciones activas/recientes
- `action: "steer"` para enviar orientación de seguimiento a un hijo en ejecución
- `action: "kill"` para detener un hijo o `all`

## Generación de sub-agentes

`sessions_spawn` crea una sesión aislada para una tarea en segundo plano. Siempre es
sin bloqueo -- devuelve inmediatamente un `runId` y un `childSessionKey`.

Opciones clave:

- `runtime: "subagent"` (predeterminado) o `"acp"` para agentes de arnés externos.
- `model` y `thinking` sobrescrituras para la sesión hija.
- `thread: true` para vincular el inicio a un hilo de chat (Discord, Slack, etc.).
- `sandbox: "require"` para forzar el aislamiento (sandbox) en el hijo.

Los sub-agentes hoja predeterminados no reciben herramientas de sesión. Cuando
`maxSpawnDepth >= 2`, los sub-agentes orquestadores de profundidad 1 adicionalmente reciben
`sessions_spawn`, `subagents`, `sessions_list` y `sessions_history` para que
puedan gestionar a sus propios hijos. Las ejecuciones hoja aún no reciben herramientas
de orquestación recursiva.

Tras la finalización, un paso de anuncio publica el resultado en el canal del solicitante.
La entrega de finalización preserva el enrutamiento de hilo/tema vinculado cuando está disponible, y si
el origen de finalización solo identifica un canal, OpenClaw aún puede reutilizar la
ruta almacenada de la sesión del solicitante (`lastChannel` / `lastTo`) para la entrega
directa.

Para un comportamiento específico de ACP, consulte [ACP Agents](/en/tools/acp-agents).

## Visibilidad

Las herramientas de sesión tienen un ámbito para limitar lo que el agente puede ver:

| Nivel   | Ámbito                                                 |
| ------- | ------------------------------------------------------ |
| `self`  | Solo la sesión actual                                  |
| `tree`  | Sesión actual + sub-agentes generados                  |
| `agent` | Todas las sesiones para este agente                    |
| `all`   | Todas las sesiones (entre agentes si está configurado) |

El valor predeterminado es `tree`. Las sesiones aisladas se limitan a `tree` independientemente de
la configuración.

## Lecturas adicionales

- [Session Management](/en/concepts/session) -- enrutamiento, ciclo de vida, mantenimiento
- [ACP Agents](/en/tools/acp-agents) -- generación de arnés externo
- [Multi-agent](/en/concepts/multi-agent) -- arquitectura multiagente
- [Configuración de la pasarela](/en/gateway/configuration) -- controles de configuración de herramientas de sesión
