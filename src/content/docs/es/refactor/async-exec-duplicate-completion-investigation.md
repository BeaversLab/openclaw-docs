---
summary: "Notas de investigación para la inyección duplicada de finalización de ejecución asíncrona"
read_when:
  - Debugging repeated node exec completion events
  - Working on heartbeat/system-event dedupe
title: "Investigación de Finalización Duplicada de Exec Asíncrono"
---

# Investigación de Finalización Duplicada de Exec Asíncrono

## Alcance

- Sesión: `agent:main:telegram:group:-1003774691294:topic:1`
- Síntoma: la misma finalización de exec asíncrono para la sesión/ejecución `keen-nexus` se registró dos veces en LCM como turnos de usuario.
- Objetivo: identificar si esto es más probablemente una inyección de sesión duplicada o un simple reintento de entrega saliente.

## Conclusión

Lo más probable es que se trate de **inyección de sesión duplicada**, no de un simple reintento de entrega saliente.

La brecha más fuerte del lado de la puerta de enlace está en la **ruta de finalización de exec del nodo**:

1. Una finalización de exec del lado del nodo emite `exec.finished` con el `runId` completo.
2. La puerta de enlace `server-node-events` convierte eso en un evento del sistema y solicita un latido (heartbeat).
3. La ejecución del latido inyecta el bloque de eventos del sistema drenado en el prompt del agente.
4. El ejecutor incrustado persiste ese prompt como un nuevo turno de usuario en la transcripción de la sesión.

Si el mismo `exec.finished` llega a la puerta de enlace dos veces para el mismo `runId` por cualquier motivo (reproducción, duplicado de reconexión, reenvío ascendente, productor duplicado), OpenClaw actualmente no tiene **ninguna verificación de idempotencia claveada por `runId`/`contextKey`** en esta ruta. La segunda copia se convertirá en un segundo mensaje de usuario con el mismo contenido.

## Ruta Exacta del Código

### 1. Productor: evento de finalización de exec del nodo

- `src/node-host/invoke.ts:340-360`
  - `sendExecFinishedEvent(...)` emite `node.event` con el evento `exec.finished`.
  - La carga útil incluye `sessionKey` y el `runId` completo.

### 2. Ingesta de eventos de la puerta de enlace

- `src/gateway/server-node-events.ts:574-640`
  - Maneja `exec.finished`.
  - Construye texto:
    - `Exec finished (node=..., id=<runId>, code ...)`
  - Lo pone en cola a través de:
    - `enqueueSystemEvent(text, { sessionKey, contextKey: runId ? \`exec:${runId}\` : "exec", trusted: false })`
  - Solicita inmediatamente un despertar (wake):
    - `requestHeartbeatNow(scopedHeartbeatWakeOptions(sessionKey, { reason: "exec-event" }))`

### 3. Debilidad de deduplicación de eventos del sistema

- `src/infra/system-events.ts:90-115`
  - `enqueueSystemEvent(...)` solo suprime **texto consecutivo duplicado**:
    - `if (entry.lastText === cleaned) return false`
  - Almacena `contextKey`, pero **no** usa `contextKey` para la idempotencia.
  - Después del drenaje, la supresión de duplicados se reinicia.

Esto significa que un `exec.finished` repetido con el mismo `runId` puede ser aceptado de nuevo más tarde, aunque el código ya tuviera un candidato de idempotencia estable (`exec:<runId>`).

### 4. El manejo de activación (wake) no es el principal duplicador

- `src/infra/heartbeat-wake.ts:79-117`
  - Las activaciones se combinan mediante `(agentId, sessionKey)`.
  - Las solicitudes de activación duplicadas para el mismo objetivo se reducen a una entrada de activación pendiente.

Esto hace que el **manejo de activación duplicado por sí solo** sea una explicación más débil que la ingesta de eventos duplicados.

### 5. El latido consume el evento y lo convierte en entrada del prompt

- `src/infra/heartbeat-runner.ts:535-574`
  - El prevuelo inspecciona los eventos del sistema pendientes y clasifica las ejecuciones de eventos de ejecución.
- `src/auto-reply/reply/session-system-events.ts:86-90`
  - `drainFormattedSystemEvents(...)` drena la cola para la sesión.
- `src/auto-reply/reply/get-reply-run.ts:400-427`
  - El bloque de eventos del sistema drenado se antepone al cuerpo del prompt del agente.

### 6. Punto de inyección de la transcripción

- `src/agents/pi-embedded-runner/run/attempt.ts:2000-2017`
  - `activeSession.prompt(effectivePrompt)` envía el prompt completo a la sesión PI incrustada.
  - Ese es el punto donde el prompt derivado de la finalización se convierte en un turno de usuario persistente.

Por lo tanto, una vez que el mismo evento del sistema se reconstruye en el prompt dos veces, se esperan mensajes de usuario LCM duplicados.

## Por qué es menos probable el reintento de entrega simple de salida

Existe una ruta real de fallo de salida en el ejecutor de latidos:

- `src/infra/heartbeat-runner.ts:1194-1242`
  - La respuesta se genera primero.
  - La entrega de salida ocurre más tarde a través de `deliverOutboundPayloads(...)`.
  - El fallo ahí devuelve `{ status: "failed" }`.

Sin embargo, para la misma entrada de cola de eventos del sistema, esto por sí solo **no es suficiente** para explicar los turnos de usuario duplicados:

- `src/auto-reply/reply/session-system-events.ts:86-90`
  - La cola de eventos del sistema ya está drenada antes de la entrega de salida.

Por lo tanto, un reintento de envío por canal por sí mismo no recrearía el mismo evento en cola exacto. Podría explicar una entrega externa fallida o faltante, pero no por sí mismo un segundo mensaje de usuario de sesión idéntico.

## Posibilidad secundaria, con menor confianza

Hay un bucle de reintento de ejecución completa en el agente de ejecución:

- `src/auto-reply/reply/agent-runner-execution.ts:741-1473`
  - Ciertos fallos transitorios pueden reintentar toda la ejecución y volver a enviar el mismo `commandBody`.

Eso puede duplicar un prompt de usuario persistente **dentro de la misma ejecución de respuesta** si el prompt ya se había añadido antes de que se activara la condición de reintento.

Considero esto menos probable que la ingesta duplicada de `exec.finished` porque:

- el intervalo observado fue de alrededor de 51 segundos, lo que parece más una segunda activación/turno que un reintento en proceso;
- el informe ya menciona fallos repetidos de envío de mensajes, lo que apunta más a un turno posterior separado que a un reintento inmediato del modelo/tiempo de ejecución.

## Hipótesis de la Causa Raíz

Hipótesis de máxima confianza:

- La finalización de `keen-nexus` llegó a través de la **ruta de eventos de ejecución de nodos**.
- El mismo `exec.finished` se entregó a `server-node-events` dos veces.
- Gateway aceptó ambos porque `enqueueSystemEvent(...)` no realiza la deduplicación por `contextKey` / `runId`.
- Cada evento aceptado activó un latido (heartbeat) y se inyectó como un turno de usuario en la transcripción de PI.

## Pequeña Solución Quirúrgica Propuesta

Si se desea una solución, el cambio de alto valor más pequeño es:

- hacer que la idempotencia de exec/system-event respete `contextKey` durante un corto periodo, al menos para repeticiones exactas de `(sessionKey, contextKey, text)`;
- o añadir una deduplicación dedicada en `server-node-events` para `exec.finished` claveada por `(sessionKey, runId, event kind)`.

Eso bloquearía directamente los duplicados de `exec.finished` reproducidos antes de que se conviertan en turnos de sesión.
