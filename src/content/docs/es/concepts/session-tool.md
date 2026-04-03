---
summary: "Herramientas de agente para listar sesiones, leer historial y mensajería entre sesiones"
read_when:
  - You want to understand what session tools the agent has
  - You want to configure cross-session access or sub-agent spawning
title: "Herramientas de sesión"
---

# Herramientas de sesión

OpenClaw proporciona a los agentes herramientas para trabajar en varias sesiones: listar conversaciones,
leer el historial, enviar mensajes a otras sesiones y generar sub-agentes.

## Herramientas disponibles

| Herramienta        | Lo que hace                                                            |
| ------------------ | ---------------------------------------------------------------------- |
| `sessions_list`    | Lista sesiones con filtros opcionales (tipo, recentness)               |
| `sessions_history` | Lee la transcripción de una sesión específica                          |
| `sessions_send`    | Envía un mensaje a otra sesión y opcionalmente espera                  |
| `sessions_spawn`   | Genera una sesión de sub-agente aislada para trabajos en segundo plano |

## Listar y leer sesiones

`sessions_list` devuelve sesiones con su clave, tipo, canal, modelo,
recuento de tokens y marcas de tiempo. Filtrar por tipo (`main`, `group`, `cron`, `hook`,
`node`) o reciente (`activeMinutes`).

`sessions_history` obtiene la transcripción de la conversación para una sesión específica.
De forma predeterminada, los resultados de las herramientas se excluyen; pase `includeTools: true` para verlos.

Ambas herramientas aceptan una **clave de sesión** (como `"main"`) o un **ID de sesión**
de una llamada de lista anterior.

## Enviar mensajes entre sesiones

`sessions_send` entrega un mensaje a otra sesión y opcionalmente espera
la respuesta:

- **Disparar y olvidar:** configure `timeoutSeconds: 0` para poner en cola y volver
  inmediatamente.
- **Esperar respuesta:** establezca un tiempo de espera y obtenga la respuesta en línea.

Después de que el objetivo responda, OpenClaw puede ejecutar un **bucle de respuesta** donde los
agentes alternan mensajes (hasta 5 turnos). El agente objetivo puede responder
`REPLY_SKIP` para detenerse antes.

## Generar sub-agentes

`sessions_spawn` crea una sesión aislada para una tarea en segundo plano. Siempre es
no bloqueante: regresa inmediatamente con un `runId` y `childSessionKey`.

Opciones clave:

- `runtime: "subagent"` (predeterminado) o `"acp"` para agentes de arnés externos.
- `model` y anulaciones `thinking` para la sesión secundaria.
- `thread: true` para vincular el generado a un hilo de chat (Discord, Slack, etc.).
- `sandbox: "require"` para imponer el sandbox en el hijo.

Los sub-agentes obtienen el conjunto completo de herramientas menos las herramientas de sesión (sin generación recursiva).
Después de la finalización, un paso de anuncio publica el resultado en el canal del solicitante.

Para un comportamiento específico de ACP, consulte [ACP Agents](/en/tools/acp-agents).

## Visibilidad

Las herramientas de sesión tienen un ámbito para limitar lo que el agente puede ver:

| Nivel   | Ámbito                                                 |
| ------- | ------------------------------------------------------ |
| `self`  | Solo la sesión actual                                  |
| `tree`  | Sesión actual + sub-agentes generados                  |
| `agent` | Todas las sesiones para este agente                    |
| `all`   | Todas las sesiones (entre agentes si está configurado) |

El valor predeterminado es `tree`. Las sesiones en sandbox se limitan a `tree` independientemente de la
configuración.

## Lecturas adicionales

- [Session Management](/en/concepts/session) -- enrutamiento, ciclo de vida, mantenimiento
- [ACP Agents](/en/tools/acp-agents) -- generación de arnés externo
- [Multi-agent](/en/concepts/multi-agent) -- arquitectura multiagente
- [Gateway Configuration](/en/gateway/configuration) -- controles de configuración de herramientas de sesión
