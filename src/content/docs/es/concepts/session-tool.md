---
summary: "Herramientas de agente para el estado entre sesiones, recuperación, mensajería y orquestación de sub-agentes"
read_when:
  - You want to understand what session tools the agent has
  - You want to configure cross-session access or sub-agent spawning
  - You want to inspect status or control spawned sub-agents
title: "Herramientas de sesión"
---

OpenClaw proporciona a los agentes herramientas para trabajar entre sesiones, inspeccionar el estado y orquestar sub-agentes.

## Herramientas disponibles

| Herramienta        | Lo que hace                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------- |
| `sessions_list`    | Lista sesiones con filtros opcionales (tipo, etiqueta, agente, reciente, vista previa)            |
| `sessions_history` | Lee la transcripción de una sesión específica                                                     |
| `sessions_send`    | Envía un mensaje a otra sesión y opcionalmente espera                                             |
| `sessions_spawn`   | Genera una sesión de sub-agente aislada para trabajo en segundo plano                             |
| `sessions_yield`   | Finaliza el turno actual y espera los resultados de seguimiento del sub-agente                    |
| `subagents`        | Lista, dirige o elimina sub-agentes generados para esta sesión                                    |
| `session_status`   | Muestra una tarjeta estilo `/status` y opcionalmente establece una anulación de modelo por sesión |

Estas herramientas todavía están sujetas al perfil de herramienta activo y a la política de permitir/denegar. `tools.profile: "coding"` incluye el conjunto completo de orquestación de sesión, incluyendo `sessions_spawn`, `sessions_yield` y `subagents`. `tools.profile: "messaging"` incluye herramientas de mensajería entre sesiones (`sessions_list`, `sessions_history`, `sessions_send`, `session_status`) pero no incluye la generación de sub-agentes. Para mantener un perfil de mensajería y aún permitir la delegación nativa, añada:

```json5
{
  tools: {
    profile: "messaging",
    alsoAllow: ["sessions_spawn", "sessions_yield", "subagents"],
  },
}
```

Las políticas de grupo, proveedor, sandbox y por agente aún pueden eliminar esas herramientas después de la etapa de perfil. Use `/tools` desde la sesión afectada para inspeccionar la lista efectiva de herramientas.

## Listar y leer sesiones

`sessions_list` devuelve sesiones con su clave, agentId, tipo, canal, modelo,
recuentos de tokens y marcas de tiempo. Filtrar por tipo (`main`, `group`, `cron`, `hook`,
`node`), `label` exacto, `agentId` exacto, texto de búsqueda o por antigüedad
(`activeMinutes`). Cuando necesitas una triaje estilo buzón, también puede pedir un
título derivado con ámbito de visibilidad, un fragmento de vista previa del último mensaje, o mensajes
recientes limitados en cada fila. Los títulos derivados y las vistas previas se producen solo para
las sesiones que el llamante ya puede ver bajo la política de visibilidad de herramientas de sesión
configurada, por lo que las sesiones no relacionadas permanecen ocultas.

`sessions_history` obtiene la transcripción de la conversación para una sesión específica.
Por defecto, los resultados de las herramientas están excluidos -- pasa `includeTools: true` para verlos.
La vista devuelta está intencionalmente limitada y filtrada por seguridad:

- el texto del asistente se normaliza antes de la recuperación:
  - las etiquetas de thinking se eliminan
  - los bloques de andamiaje `<relevant-memories>` / `<relevant_memories>` se eliminan
  - los bloques de carga XML de llamadas a herramientas en texto plano como `<tool_call>...</tool_call>`,
    `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>` y
    `<function_calls>...</function_calls>` se eliminan, incluyendo las cargas
    truncadas que nunca se cierran correctamente
  - el andamiaje de llamada a herramienta/resultado degradado como `[Tool Call: ...]`,
    `[Tool Result ...]` y `[Historical context ...]` se elimina
  - los tokens de control del modelo filtrados como `<|assistant|>`, otros tokens
    `<|...|>` ASCII y variantes de ancho completo `<｜...｜>` se eliminan
  - el XML de llamadas a herramientas de MiniMax mal formado como `<invoke ...>` /
    `</minimax:tool_call>` se elimina
- el texto tipo credencial/token se redacta antes de ser devuelto
- los bloques de texto largo se truncan
- los historiales muy grandes pueden eliminar filas antiguas o reemplazar una fila sobredimensionada con
  `[sessions_history omitted: message too large]`
- la herramienta reporta indicadores de resumen como `truncated`, `droppedMessages`,
  `contentTruncated`, `contentRedacted` y `bytes`

Ambas herramientas aceptan una **clave de sesión** (como `"main"`) o un **ID de sesión**
de una llamada de lista anterior.

Si necesita la transcripción byte por byte exacta, inspeccione el archivo de transcripción en
disco en lugar de tratar `sessions_history` como un volcado bruto.

## Envío de mensajes entre sesiones

`sessions_send` entrega un mensaje a otra sesión y, opcionalmente, espera la
respuesta:

- **Disparar y olvidar:** configure `timeoutSeconds: 0` para poner en cola y retornar
  inmediatamente.
- **Esperar respuesta:** configure un tiempo de espera y obtenga la respuesta en línea.

Las sesiones de chat con alcance de hilo (thread), como las claves de Slack o Discord que terminan en
`:thread:<id>`, no son destinos `sessions_send` válidos. Utilice la clave de sesión del canal principal
para la coordinación entre agentes, de modo que los mensajes enrutados por herramientas no aparezcan
dentro de un hilo activo orientado al usuario.

Los mensajes y las respuestas de seguimiento A2A se marcan como datos entre sesiones en el
prompt de recepción (`[Inter-session message ... isUser=false]`) y en la procedencia de la transcripción.
El agente receptor debe tratarlos como datos enrutados por herramientas, no como una
instrucción directa escrita por el usuario final.

Después de que el objetivo responda, OpenClaw puede ejecutar un **bucle de respuesta (reply-back loop)** donde los
agentes alternan mensajes (hasta 5 turnos). El agente objetivo puede responder
`REPLY_SKIP` para detenerse antes de tiempo.

## Ayudantes de estado y orquestación

`session_status` es la herramienta ligera equivalente a `/status` para la sesión
actual u otra sesión visible. Informa sobre el uso, el tiempo, el estado del modelo/ejecución y el
contexto de tareas en segundo plano vinculadas cuando están presentes. Al igual que `/status`, puede rellenar
contadores dispersos de tokens/caché desde la entrada de uso más reciente de la transcripción, y
`model=default` borra una anulación por sesión. Utilice `sessionKey="current"` para
la sesión actual del autor de la llamada; las etiquetas visibles del cliente como `openclaw-tui` no
son claves de sesión.

`sessions_yield` termina intencionalmente el turno actual para que el siguiente mensaje pueda ser
el evento de seguimiento que está esperando. Úselo después de generar sub-agentes cuando
quiera que los resultados de finalización lleguen como el siguiente mensaje en lugar de construir
bucles de sondeo (poll loops).

`subagents` es el asistente del plano de control para sub-agentes de OpenClaw ya generados.
Admite:

- `action: "list"` para inspeccionar ejecuciones activas/recientes
- `action: "steer"` para enviar orientación de seguimiento a un hijo en ejecución
- `action: "kill"` para detener un hijo o `all`

## Generación de sub-agentes

`sessions_spawn` crea una sesión aislada para una tarea en segundo plano de forma predeterminada.
Siempre es no bloqueante: devuelve inmediatamente un `runId` y
`childSessionKey`.

Opciones clave:

- `runtime: "subagent"` (predeterminado) o `"acp"` para agentes de arnés externos.
- `model` y `thinking` sobrescripciones para la sesión secundaria.
- `thread: true` para vincular la generación a un hilo de chat (Discord, Slack, etc.).
- `sandbox: "require"` para imponer el aislamiento en el secundario.
- `context: "fork"` para sub-agentes nativos cuando el secundario necesita la transcripción
  del solicitante actual; omítalo o usa `context: "isolated"` para un secundario limpio.
  Los sub-agentes nativos vinculados a un hilo por defecto son `context: "fork"` a menos que
  `threadBindings.defaultSpawnContext` indique lo contrario.

Los sub-agentes hoja predeterminados no obtienen herramientas de sesión. Cuando
`maxSpawnDepth >= 2`, los sub-agentes orquestadores de profundidad 1 adicionalmente reciben
`sessions_spawn`, `subagents`, `sessions_list`, y `sessions_history` para que
can gestionar a sus propios hijos. Las ejecuciones hoja todavía no obtienen herramientas
de orquestación recursivas.

Después de la finalización, un paso de anuncio publica el resultado en el canal del solicitante.
La entrega de finalización preserva el enrutamiento de hilo/tema vinculado cuando está disponible, y si
el origen de finalización solo identifica un canal OpenClaw aún puede reutilizar la
ruta almacenada de la sesión del solicitante (`lastChannel` / `lastTo`) para entrega
directa.

Para un comportamiento específico de ACP, consulte [ACP Agents](/es/tools/acp-agents).

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

## Lectura adicional

- [Gestión de sesiones](/es/concepts/session) -- enrutamiento, ciclo de vida, mantenimiento
- [Agentes ACP](/es/tools/acp-agents) -- generación de arnés externos
- [Multi-agent](/es/concepts/multi-agent) -- arquitectura multiagente
- [Gateway Configuration](/es/gateway/configuration) -- controles de configuración de herramientas de sesión

## Relacionado

- [Gestión de sesiones](/es/concepts/session)
- [Poda de sesiones](/es/concepts/session-pruning)
