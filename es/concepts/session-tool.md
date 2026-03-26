---
summary: "Herramientas de sesión de agente para listar sesiones, obtener el historial y enviar mensajes entre sesiones"
read_when:
  - Adding or modifying session tools
title: "Herramientas de sesión"
---

# Herramientas de sesión

Objetivo: un conjunto de herramientas pequeño y difícil de usar incorrectamente para que los agentes puedan listar sesiones, recuperar el historial y enviar a otra sesión.

## Nombres de herramientas

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

## Modelo de clave

- El depósito principal de chat directo siempre es la clave literal `"main"` (resuelta a la clave principal del agente actual).
- Los chats grupales usan `agent:<agentId>:<channel>:group:<id>` o `agent:<agentId>:<channel>:channel:<id>` (pase la clave completa).
- Los trabajos de Cron usan `cron:<job.id>`.
- Los hooks usan `hook:<uuid>` a menos que se establezcan explícitamente.
- Las sesiones de nodo usan `node-<nodeId>` a menos que se establezcan explícitamente.

`global` y `unknown` son valores reservados y nunca se listan. Si `session.scope = "global"`, lo convertimos en un alias de `main` para todas las herramientas, de modo que los llamadores nunca vean `global`.

## sessions_list

Lista las sesiones como una matriz de filas.

Parámetros:

- `kinds?: string[]` filtro: cualquiera de `"main" | "group" | "cron" | "hook" | "node" | "other"`
- `limit?: number` máx. de filas (predeterminado: predeterminado del servidor, límite p. ej. 200)
- `activeMinutes?: number` solo sesiones actualizadas dentro de N minutos
- `messageLimit?: number` 0 = sin mensajes (predeterminado 0); >0 = incluye los últimos N mensajes

Comportamiento:

- `messageLimit > 0` obtiene `chat.history` por sesión e incluye los últimos N mensajes.
- Los resultados de las herramientas se filtran en la salida de la lista; use `sessions_history` para los mensajes de herramientas.
- Cuando se ejecuta en una sesión de agente **en sandbox**, las herramientas de sesión tienen como valor predeterminado **visibilidad solo generada** (ver más abajo).

Forma de fila (JSON):

- `key`: clave de sesión (cadena)
- `kind`: `main | group | cron | hook | node | other`
- `channel`: `whatsapp | telegram | discord | signal | imessage | webchat | internal | unknown`
- `displayName` (etiqueta de visualización del grupo si está disponible)
- `updatedAt` (ms)
- `sessionId`
- `model`, `contextTokens`, `totalTokens`
- `thinkingLevel`, `verboseLevel`, `systemSent`, `abortedLastRun`
- `sendPolicy` (anulación de sesión si está configurada)
- `lastChannel`, `lastTo`
- `deliveryContext` (`{ channel, to, accountId }` normalizado cuando está disponible)
- `transcriptPath` (ruta de mejor esfuerzo derivada del directorio de almacenamiento + sessionId)
- `messages?` (solo cuando `messageLimit > 0`)

## sessions_history

Obtener la transcripción de una sesión.

Parámetros:

- `sessionKey` (obligatorio; acepta clave de sesión o `sessionId` de `sessions_list`)
- `limit?: number` máx. de mensajes (el servidor limita)
- `includeTools?: boolean` (por defecto falso)

Comportamiento:

- `includeTools=false` filtra los mensajes `role: "toolResult"`.
- Devuelve el array de mensajes en el formato de transcripción sin procesar.
- Cuando se le da un `sessionId`, OpenClaw lo resuelve a la clave de sesión correspondiente (error de ids faltantes).

## API de historial de sesión de puerta de enlace y transcripción en vivo

La interfaz de usuario de Control y los clientes de puerta de enlace pueden usar las superficies de historial y transcripción en vivo de nivel inferior directamente.

HTTP:

- `GET /sessions/{sessionKey}/history`
- Parámetros de consulta: `limit`, `cursor`, `includeTools=1`, `follow=1`
- Las sesiones desconocidas devuelven HTTP `404` con `error.type = "not_found"`
- `follow=1` actualiza la respuesta a un flujo SSE de actualizaciones de transcripción para esa sesión

WebSocket:

- `sessions.subscribe` se suscribe a todos los eventos del ciclo de vida de la sesión y de transcripción visibles para el cliente
- `sessions.messages.subscribe { key }` se suscribe solo a los eventos de `session.message` para una sesión
- `sessions.messages.unsubscribe { key }` elimina esa suscripción de transcripción específica
- `session.message` lleva mensajes de transcripción adjuntos más metadatos de uso en vivo cuando están disponibles
- `sessions.changed` emite `phase: "message"` para los anexos de transcripción para que las listas de sesiones puedan actualizar contadores y vistas previas

## sessions_send

Envía un mensaje a otra sesión.

Parámetros:

- `sessionKey` (obligatorio; acepta clave de sesión o `sessionId` de `sessions_list`)
- `message` (obligatorio)
- `timeoutSeconds?: number` (predeterminado >0; 0 = disparar y olvidar)

Comportamiento:

- `timeoutSeconds = 0`: poner en cola y devolver `{ runId, status: "accepted" }`.
- `timeoutSeconds > 0`: esperar hasta N segundos para completar, luego devolver `{ runId, status: "ok", reply }`.
- Si la espera se agota: `{ runId, status: "timeout", error }`. La ejecución continúa; llame a `sessions_history` más tarde.
- Si la ejecución falla: `{ runId, status: "error", error }`.
- La ejecución de entrega de anuncios se produce después de que se completa la ejecución principal y es de mejor esfuerzo; `status: "ok"` no garantiza que se haya entregado el anuncio.
- Las esperas a través de la puerta de enlace `agent.wait` (lado del servidor) para que las reconexiones no eliminen la espera.
- El contexto del mensaje de agente a agente se inyecta para la ejecución principal.
- Los mensajes entre sesiones se conservan con `message.provenance.kind = "inter_session"` para que los lectores de transcripciones puedan distinguir las instrucciones del agente enrutado de la entrada de usuario externa.
- Una vez que se completa la ejecución principal, OpenClaw ejecuta un **bucle de respuesta (reply-back loop)**:
  - La Ronda 2+ alterna entre el agente solicitante y el agente objetivo.
  - Responda exactamente con `REPLY_SKIP` para detener el ping‑pong.
  - El máximo de turnos es `session.agentToAgent.maxPingPongTurns` (0–5, predeterminado 5).
- Una vez que termina el bucle, OpenClaw ejecuta el **paso de anuncio entre agentes (agent‑to‑agent announce step)** (solo agente objetivo):
  - Responda exactamente con `ANNOUNCE_SKIP` para permanecer en silencio.
  - Cualquier otra respuesta se envía al canal objetivo.
  - El paso de anuncio incluye la solicitud original + respuesta de ronda 1 + última respuesta de ping‑pong.

## Campo de Canal

- Para grupos, `channel` es el canal registrado en la entrada de sesión.
- Para chats directos, `channel` se mapea desde `lastChannel`.
- Para cron/hook/node, `channel` es `internal`.
- Si falta, `channel` es `unknown`.

## Seguridad / Política de Envío

Bloqueo basado en políticas por tipo de canal/chat (no por id de sesión).

```json
{
  "session": {
    "sendPolicy": {
      "rules": [
        {
          "match": { "channel": "discord", "chatType": "group" },
          "action": "deny"
        }
      ],
      "default": "allow"
    }
  }
}
```

Anulación en tiempo de ejecución (por entrada de sesión):

- `sendPolicy: "allow" | "deny"` (sin establecer = heredar configuración)
- Configurable vía `sessions.patch` o solo propietario `/send on|off|inherit` (mensaje independiente).

Puntos de cumplimiento:

- `chat.send` / `agent` (gateway)
- lógica de entrega de respuesta automática

## sessions_spawn

Genera una ejecución de subagente en una sesión aislada y anuncia el resultado de vuelta al canal de chat solicitante.

Parámetros:

- `task` (obligatorio)
- `label?` (opcional; usado para registros/UI)
- `agentId?` (opcional; genera bajo otro id de agente si está permitido)
- `model?` (opcional; anula el modelo del subagente; valores no válidos dan error)
- `thinking?` (opcional; anula el nivel de pensamiento para la ejecución del subagente)
- `runTimeoutSeconds?` (por defecto `agents.defaults.subagents.runTimeoutSeconds` cuando se establece, de lo contrario `0`; cuando se establece, aborta la ejecución del subagente después de N segundos)
- `thread?` (por defecto false; solicita enrutamiento vinculado al hilo para este spawn cuando el canal/plugin lo admita)
- `mode?` (`run|session`; por defecto `run`, pero por defecto `session` cuando `thread=true`; `mode="session"` requiere `thread=true`)
- `cleanup?` (`delete|keep`, por defecto `keep`)
- `sandbox?` (`inherit|require`, por defecto `inherit`; `require` rechaza el spawn a menos que el tiempo de ejecución del hijo objetivo esté en sandbox)
- `attachments?` (matriz opcional de archivos en línea; solo tiempo de ejecución de subagente, ACP rechaza). Cada entrada: `{ name, content, encoding?: "utf8" | "base64", mimeType? }`. Los archivos se materializan en el espacio de trabajo del hijo en `.openclaw/attachments/<uuid>/`. Devuelve un recibo con sha256 por archivo.
- `attachAs?` (opcional; sugerencia `{ mountPath? }` reservada para implementaciones de montaje futuras)

Lista de permitidos:

- `agents.list[].subagents.allowAgents`: lista de ids de agentes permitidos a través de `agentId` (`["*"]` para permitir cualquiera). Por defecto: solo el agente solicitante.
- Guarda de herencia de sandbox: si la sesión solicitante está en sandbox, `sessions_spawn` rechaza los objetivos que se ejecutarían sin sandbox.

Descubrimiento:

- Use `agents_list` para descubrir qué ids de agentes están permitidos para `sessions_spawn`.

Comportamiento:

- Inicia una nueva sesión `agent:<agentId>:subagent:<uuid>` con `deliver: false`.
- Los sub-agentes por defecto tienen el conjunto de herramientas completo **menos las herramientas de sesión** (configurable vía `tools.subagents.tools`).
- No se permite que los sub-agentes llamen a `sessions_spawn` (sin generación de sub-agente → sub-agente).
- Siempre no bloqueante: devuelve `{ status: "accepted", runId, childSessionKey }` inmediatamente.
- Con `thread=true`, los complementos del canal pueden vincular la entrega/enrutamiento a un objetivo de hilo (el soporte de Discord está controlado por `session.threadBindings.*` y `channels.discord.threadBindings.*`).
- Tras la finalización, OpenClaw ejecuta un **paso de anuncio** del subagente y publica el resultado en el canal de chat solicitante.
  - Si la respuesta final del asistente está vacía, se incluye el `toolResult` más reciente del historial del subagente como `Result`.
- Responda exactamente `ANNOUNCE_SKIP` durante el paso de anuncio para permanecer en silencio.
- Las respuestas de anuncio se normalizan a `Status`/`Result`/`Notes`; `Status` proviene del resultado en tiempo de ejecución (no del texto del modelo).
- Las sesiones de subagentes se archivan automáticamente después de `agents.defaults.subagents.archiveAfterMinutes` (predeterminado: 60).
- Las respuestas de anuncio incluyen una línea de estadísticas (tiempo de ejecución, tokens, sessionKey/sessionId, ruta de la transcripción y costo opcional).

## Visibilidad de la sesión en entorno limitado

Las herramientas de sesión se pueden limitar para reducir el acceso entre sesiones.

Comportamiento predeterminado:

- `tools.sessions.visibility` se predetermina a `tree` (sesión actual + sesiones de subagentes generados).
- Para las sesiones en entorno limitado, `agents.defaults.sandbox.sessionToolsVisibility` puede fijar estrictamente la visibilidad.

Configuración:

```json5
{
  tools: {
    sessions: {
      // "self" | "tree" | "agent" | "all"
      // default: "tree"
      visibility: "tree",
    },
  },
  agents: {
    defaults: {
      sandbox: {
        // default: "spawned"
        sessionToolsVisibility: "spawned", // or "all"
      },
    },
  },
}
```

Notas:

- `self`: solo la clave de sesión actual.
- `tree`: sesión actual + sesiones generadas por la sesión actual.
- `agent`: cualquier sesión que pertenezca al id de agente actual.
- `all`: cualquier sesión (el acceso entre agentes todavía requiere `tools.agentToAgent`).
- Cuando una sesión está en un entorno limitado y `sessionToolsVisibility="spawned"`, OpenClaw limita la visibilidad a `tree` incluso si establece `tools.sessions.visibility="all"`.

import es from "/components/footer/es.mdx";

<es />
