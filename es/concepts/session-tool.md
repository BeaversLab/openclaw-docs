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

## sessions_send

Enviar un mensaje a otra sesión.

Parámetros:

- `sessionKey` (obligatorio; acepta clave de sesión o `sessionId` de `sessions_list`)
- `message` (obligatorio)
- `timeoutSeconds?: number` (por defecto >0; 0 = disparar y olvidar)

Comportamiento:

- `timeoutSeconds = 0`: poner en cola y devolver `{ runId, status: "accepted" }`.
- `timeoutSeconds > 0`: esperar hasta N segundos para la finalización, luego devolver `{ runId, status: "ok", reply }`.
- Si se agota el tiempo de espera: `{ runId, status: "timeout", error }`. La ejecución continúa; llamar a `sessions_history` más tarde.
- Si la ejecución falla: `{ runId, status: "error", error }`.
- La ejecución de entrega de anuncios se ejecuta después de que la ejecución principal se completa y es de mejor esfuerzo; `status: "ok"` no garantiza que el anuncio se entregara.
- Espera a través de la puerta de enlace `agent.wait` (lado del servidor) para que las reconexiones no interrumpan la espera.
- El contexto del mensaje de agente a agente se inyecta para la ejecución principal.
- Los mensajes entre sesiones se persisten con `message.provenance.kind = "inter_session"` para que los lectores de transcripciones puedan distinguir las instrucciones del agente enrutado de la entrada del usuario externo.
- Después de que se completa la ejecución principal, OpenClaw ejecuta un **bucle de respuesta (reply-back loop)**:
  - La ronda 2+ alterna entre el agente solicitante y el agente objetivo.
  - Responda exactamente `REPLY_SKIP` para detener el ping‑pong.
  - El número máximo de turnos es `session.agentToAgent.maxPingPongTurns` (0–5, predeterminado 5).
- Una vez que termina el bucle, OpenClaw ejecuta el **paso de anuncio de agente a agente** (solo agente objetivo):
  - Responda exactamente `ANNOUNCE_SKIP` para permanecer en silencio.
  - Cualquier otra respuesta se envía al canal objetivo.
  - El paso de anuncio incluye la solicitud original + respuesta de la ronda 1 + última respuesta de ping‑pong.

## Campo de canal

- Para grupos, `channel` es el canal registrado en la entrada de la sesión.
- Para chats directos, `channel` se mapea desde `lastChannel`.
- Para cron/hook/node, `channel` es `internal`.
- Si falta, `channel` es `unknown`.

## Seguridad / Política de envío

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
- Configurable mediante `sessions.patch` o `/send on|off|inherit` solo para el propietario (mensaje independiente).

Puntos de aplicación:

- `chat.send` / `agent` (puerta de enlace)
- lógica de entrega de respuesta automática

## sessions_spawn

Inicia una ejecución de subagente en una sesión aislada y anuncia el resultado de vuelta al canal de chat solicitante.

Parámetros:

- `task` (obligatorio)
- `label?` (opcional; se usa para registros/interfaz de usuario)
- `agentId?` (opcional; iniciar bajo otro id de agente si está permitido)
- `model?` (opcional; anula el modelo del subagente; los valores no válidos dan error)
- `thinking?` (opcional; anula el nivel de pensamiento para la ejecución del subagente)
- `runTimeoutSeconds?` (el valor predeterminado es `agents.defaults.subagents.runTimeoutSeconds` cuando se establece, de lo contrario `0`; cuando se establece, aborta la ejecución del subagente después de N segundos)
- `thread?` (por defecto false; solicita enrutamiento ligado al hilo para este spawn cuando sea compatible con el canal/complemento)
- `mode?` (`run|session`; por defecto `run`, pero por defecto `session` cuando `thread=true`; `mode="session"` requiere `thread=true`)
- `cleanup?` (`delete|keep`, por defecto `keep`)
- `sandbox?` (`inherit|require`, por defecto `inherit`; `require` rechaza el spawn a menos que el tiempo de ejecución del hijo de destino esté en sandbox)
- `attachments?` (matriz opcional de archivos en línea; solo tiempo de ejecución de subagente, ACP rechaza). Cada entrada: `{ name, content, encoding?: "utf8" | "base64", mimeType? }`. Los archivos se materializan en el espacio de trabajo del hijo en `.openclaw/attachments/<uuid>/`. Devuelve un recibo con sha256 por archivo.
- `attachAs?` (opcional; `{ mountPath? }` sugerencia reservada para implementaciones de montaje futuras)

Lista de permitidos:

- `agents.list[].subagents.allowAgents`: lista de ids de agentes permitidos a través de `agentId` (`["*"]` para permitir cualquier). Predeterminado: solo el agente solicitante.
- Protección de herencia de sandbox: si la sesión solicitante está en sandbox, `sessions_spawn` rechaza los objetivos que se ejecutarían sin sandbox.

Descubrimiento:

- Use `agents_list` para descubrir qué ids de agentes están permitidos para `sessions_spawn`.

Comportamiento:

- Inicia una nueva sesión `agent:<agentId>:subagent:<uuid>` con `deliver: false`.
- Los subagentes tienen por defecto el conjunto completo de herramientas **menos las herramientas de sesión** (configurable a través de `tools.subagents.tools`).
- A los subagentes no se les permite llamar a `sessions_spawn` (no hay subagente → generación de subagente).
- Siempre sin bloqueo: devuelve `{ status: "accepted", runId, childSessionKey }` inmediatamente.
- Con `thread=true`, los complementos de canal pueden vincular la entrega/enrutamiento a un destino de hilo (el soporte de Discord está controlado por `session.threadBindings.*` y `channels.discord.threadBindings.*`).
- Tras la finalización, OpenClaw ejecuta un **paso de anuncio** del subagente y publica el resultado en el canal de chat del solicitante.
  - Si la respuesta final del asistente está vacía, se incluye el `toolResult` más reciente del historial del subagente como `Result`.
- Responda exactamente `ANNOUNCE_SKIP` durante el paso de anuncio para mantenerse en silencio.
- Las respuestas de anuncio se normalizan a `Status`/`Result`/`Notes`; `Status` proviene del resultado de la ejecución (no del texto del modelo).
- Las sesiones de los subagentes se archivan automáticamente después de `agents.defaults.subagents.archiveAfterMinutes` (predeterminado: 60).
- Las respuestas de anuncio incluyen una línea de estadísticas (tiempo de ejecución, tokens, sessionKey/sessionId, ruta de la transcripción y costo opcional).

## Visibilidad de la sesión de espacio aislado (sandbox)

Las herramientas de sesión se pueden limitar para reducir el acceso entre sesiones.

Comportamiento predeterminado:

- `tools.sessions.visibility` se predetermina a `tree` (sesión actual + sesiones de subagentes generados).
- Para las sesiones en espacio aislado, `agents.defaults.sandbox.sessionToolsVisibility` puede limitar estrictamente la visibilidad.

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
- `all`: cualquier sesión (el acceso entre agentes aún requiere `tools.agentToAgent`).
- Cuando una sesión está en espacio aislado y `sessionToolsVisibility="spawned"`, OpenClaw limita la visibilidad a `tree` incluso si establece `tools.sessions.visibility="all"`.

import es from "/components/footer/es.mdx";

<es />
