---
summary: "Notas de investigación para la inyección duplicada de finalización de ejecución asíncrona"
read_when:
  - Debugging repeated node exec completion events
  - Working on heartbeat/system-event dedupe
title: "Investigación de finalización duplicada de ejecución asíncrona"
---

## Alcance

- Sesión: `agent:main:telegram:group:-1003774691294:topic:1`
- Síntoma: la misma finalización de ejecución asíncrona para la sesión/ejecución `keen-nexus` se registró dos veces en LCM como turnos de usuario.
- Objetivo: identificar si esto es más probable una inyección de sesión duplicada o un reintento de entrega saliente simple.

## Conclusión

Lo más probable es que sea **inyección de sesión duplicada**, no un reintento puro de entrega saliente.

La brecha más fuerte del lado de la puerta de enlace está en la **ruta de finalización de ejecución de nodo**:

1. Una finalización de ejecución del lado del nodo emite `exec.finished` con el `runId` completo.
2. El `server-node-events` de la puerta de enlace lo convierte en un evento del sistema y solicita un latido (heartbeat).
3. La ejecución del latido inyecta el bloque de evento del sistema drenado en el mensaje (prompt) del agente.
4. El proceso embebido persiste ese mensaje como un nuevo turno de usuario en la transcripción de la sesión.

Si el mismo `exec.finished` llega a la puerta de enlace dos veces para el mismo `runId` por cualquier razón (repetición, duplicado de reconexión, reenvío ascendente, productor duplicado), OpenClaw actualmente no tiene **ninguna verificación de idempotencia claveada por `runId`/`contextKey`** en esta ruta. La segunda copia se convertirá en un segundo mensaje de usuario con el mismo contenido.

## Ruta de código exacta

### 1. Productor: evento de finalización de ejecución de nodo

- `src/node-host/invoke.ts:340-360`
  - `sendExecFinishedEvent(...)` emite `node.event` con el evento `exec.finished`.
  - La carga útil incluye `sessionKey` y el `runId` completo.

### 2. Ingestión de eventos de la puerta de enlace

- `src/gateway/server-node-events.ts:574-640`
  - Maneja `exec.finished`.
  - Construye el texto:
    - `Exec finished (node=..., id=<runId>, code ...)`
  - Lo pone en cola a través de:
    - `enqueueSystemEvent(text, { sessionKey, contextKey: runId ? \`exec:${runId}\` : "exec", trusted: false })`
  - Solicita inmediatamente un despertar:
    - `requestHeartbeatNow(scopedHeartbeatWakeOptions(sessionKey, { reason: "exec-event" }))`

### 3. Debilidad de deduplicación de eventos del sistema

- `src/infra/system-events.ts:90-115`
  - `enqueueSystemEvent(...)` solo suprime **texto duplicado consecutivo**:
    - `if (entry.lastText === cleaned) return false`
  - Almacena `contextKey`, pero **no** utiliza `contextKey` para la idempotencia.
  - Después del drenaje, la supresión de duplicados se restablece.

Esto significa que un `exec.finished` reproducido con el mismo `runId` puede ser aceptado nuevamente más tarde, aunque el código ya tuviera un candidato de idempotencia estable (`exec:<runId>`).

### 4. El manejo de activación (wake) no es el principal duplicador

- `src/infra/heartbeat-wake.ts:79-117`
  - Las activaciones se agrupan (coalesced) por `(agentId, sessionKey)`.
  - Las solicitudes de activación duplicadas para el mismo objetivo colapsan en una sola entrada de activación pendiente.

Esto hace que **el manejo de activación duplicado por sí solo** sea una explicación más débil que la ingesta de eventos duplicados.

### 5. El latido (heartbeat) consume el evento y lo convierte en entrada del prompt

- `src/infra/heartbeat-runner.ts:535-574`
  - El vuelo previo (preflight) observa los eventos del sistema pendientes y clasifica las ejecuciones de eventos exec.
- `src/auto-reply/reply/session-system-events.ts:86-90`
  - `drainFormattedSystemEvents(...)` drena la cola para la sesión.
- `src/auto-reply/reply/get-reply-run.ts:400-427`
  - El bloque de eventos del sistema drenado se antepone al cuerpo del prompt del agente.

### 6. Punto de inyección de la transcripción

- `src/agents/pi-embedded-runner/run/attempt.ts:2000-2017`
  - `activeSession.prompt(effectivePrompt)` envía el prompt completo a la sesión PI incrustada.
  - Ese es el punto donde el prompt derivado de la finalización se convierte en un turno de usuario persistente.

Por lo tanto, una vez que el mismo evento del sistema se reconstruye en el prompt dos veces, se esperan mensajes de usuario LCM duplicados.

## Por qué es menos probable el reintento de entrega saliente simple

Existe una ruta real de fallo de salida en el ejecutor de latidos:

- `src/infra/heartbeat-runner.ts:1194-1242`
  - La respuesta se genera primero.
  - La entrega de salida ocurre más tarde a través de `deliverOutboundPayloads(...)`.
  - El fallo allí devuelve `{ status: "failed" }`.

Sin embargo, para la misma entrada de cola de eventos del sistema, esto por sí solo **no es suficiente** para explicar los turnos de usuario duplicados:

- `src/auto-reply/reply/session-system-events.ts:86-90`
  - La cola de eventos del sistema ya se ha drenado antes de la entrega de salida.

Por lo tanto, un reintento de envío del canal por sí mismo no recrearía el mismo evento en cola exacto. Podría explicar una entrega externa faltante/fallida, pero no por sí solo un segundo mensaje de usuario de sesión idéntico.

## Posibilidad secundaria, con menor confianza

Hay un bucle de reintento de ejecución completa en el ejecutor del agente:

- `src/auto-reply/reply/agent-runner-execution.ts:741-1473`
  - Ciertos fallos transitorios pueden reintentar toda la ejecución y volver a enviar el mismo `commandBody`.

Eso puede duplicar un mensaje de usuario persistente **dentro de la misma ejecución de respuesta** si el mensaje ya se había anexado antes de que se activara la condición de reintento.

Clasifico esto con menor probabilidad que la ingesta duplicada de `exec.finished` porque:

- el espacio observado fue de unos 51 segundos, lo que parece más un segundo despertar/turno que un reintento en proceso;
- el informe ya menciona fallos repetidos de envío de mensajes, lo que apunta más hacia un turno posterior separado que a un reintento inmediato del modelo/tiempo de ejecución.

## Hipótesis de la Causa Raíz

Hipótesis de mayor confianza:

- La finalización del `keen-nexus` llegó a través de la **ruta de eventos de ejecución de nodos**.
- El mismo `exec.finished` se entregó a `server-node-events` dos veces.
- Gateway aceptó ambos porque `enqueueSystemEvent(...)` no realiza deduplicación por `contextKey` / `runId`.
- Cada evento aceptado activó un latido (heartbeat) y se inyectó como un turno de usuario en la transcripción del PI.

## Propuesta de Pequeña Corrección Quirúrgica

Si se desea una corrección, el cambio de alto valor más pequeño es:

- hacer que la idempotencia de exec/system-event respete `contextKey` por un horizonte breve, al menos para repeticiones exactas de `(sessionKey, contextKey, text)`;
- o agregar una deduplicación dedicada en `server-node-events` para `exec.finished` claveada por `(sessionKey, runId, event kind)`.

Eso bloquearía directamente los duplicados de `exec.finished` reproducidos antes de que se conviertan en turnos de sesión.

## Relacionado

- [Herramienta Exec](/es/tools/exec)
- [Gestión de sesiones](/es/concepts/session)
