---
summary: "Plugin hooks: intercept agent, tool, message, session, and Gateway lifecycle events"
title: "Plugin hooks"
read_when:
  - You are building a plugin that needs before_tool_call, before_agent_reply, message hooks, or lifecycle hooks
  - You need to block, rewrite, or require approval for tool calls from a plugin
  - You are deciding between internal hooks and plugin hooks
---

Los ganchos de complementos son puntos de extensión en proceso para los complementos de OpenClaw. Úselos
cuando un complemento necesite inspeccionar o cambiar ejecuciones de agentes, llamadas a herramientas, flujo de mensajes,
ciclo de vida de la sesión, enrutamiento de subagentes, instalaciones o el inicio de Gateway.

Use [internal hooks](/es/automation/hooks) instead when you want a small
operator-installed `HOOK.md` script for command and Gateway events such as
`/new`, `/reset`, `/stop`, `agent:bootstrap`, or `gateway:startup`.

## Inicio rápido

Registre ganchos de complemento con tipos usando `api.on(...)` desde la entrada de su complemento:

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

export default definePluginEntry({
  id: "tool-preflight",
  name: "Tool Preflight",
  register(api) {
    api.on(
      "before_tool_call",
      async (event) => {
        if (event.toolName !== "web_search") {
          return;
        }

        return {
          requireApproval: {
            title: "Run web search",
            description: `Allow search query: ${String(event.params.query ?? "")}`,
            severity: "info",
            timeoutMs: 60_000,
            timeoutBehavior: "deny",
          },
        };
      },
      { priority: 50 },
    );
  },
});
```

Los controladores de enlace se ejecutan secuencialmente en `priority` descendente. Los enlaces con la misma prioridad
mantienen el orden de registro.

`api.on(name, handler, opts?)` acepta:

- `priority` - orden del controlador (los más altos se ejecutan primero).
- `timeoutMs` - presupuesto opcional por enlace. Cuando se establece, el ejecutor de enlaces aborta ese
  controlador después de que el presupuesto transcurre y continúa con el siguiente, en lugar de
  permitir que una configuración lenta o el trabajo de recuperación consuman el tiempo de espera del modelo
  configurado por quien llama. Omítalo para usar el tiempo de espera de observación/decisión predeterminado que el
  ejecutor de enlaces aplica genéricamente.

Los operadores también pueden establecer presupuestos de enlace sin modificar el código del complemento:

```json
{
  "plugins": {
    "entries": {
      "my-plugin": {
        "hooks": {
          "timeoutMs": 30000,
          "timeouts": {
            "before_prompt_build": 90000,
            "agent_end": 60000
          }
        }
      }
    }
  }
}
```

`hooks.timeouts.<hookName>` anula `hooks.timeoutMs`, que anula el valor
`api.on(..., { timeoutMs })` creado por el autor del complemento. Cada valor configurado debe
ser un entero positivo no mayor a 600000 milisegundos. Prefiera anulaciones por enlace
para enlaces lentos conocidos para que un complemento no obtenga un presupuesto más largo
en todas partes.

Cada enlace recibe `event.context.pluginConfig`, la configuración resuelta para el
complemento que registró ese controlador. Úsela para decisiones de enlace que necesiten
opciones de complemento actuales; OpenClaw la inyecta por controlador sin mutar el
objeto de evento compartido visto por otros complementos.

## Catálogo de enlaces

Los enlaces se agrupan por la superficie que extienden. Los nombres en **negrita** aceptan un
resultado de decisión (bloquear, cancelar, anular o requerir aprobación); todos los demás son
solo de observación.

**Turno de agente**

- `before_model_resolve` - anular el proveedor o el modelo antes de cargar los mensajes de la sesión
- `agent_turn_prepare` - consume las inyecciones de turnos del plugin en cola y agrega contexto del mismo turno antes de los hooks del prompt
- `before_prompt_build` - agrega contexto dinámico o texto del sistema del prompt antes de la llamada al modelo
- `before_agent_start` - fase combinada solo para compatibilidad; prefiere los dos hooks anteriores
- **`before_agent_run`** - inspecciona el prompt final y los mensajes de la sesión antes del envío al modelo y opcionalmente bloquea la ejecución
- **`before_agent_reply`** - cortocircuita el turno del modelo con una respuesta sintética o silencio
- **`before_agent_finalize`** - inspecciona la respuesta final natural y solicita un paso más del modelo
- `agent_end` - observa los mensajes finales, el estado de éxito y la duración de la ejecución
- `heartbeat_prompt_contribution` - agrega contexto solo de latido para monitores en segundo plano y plugins de ciclo de vida

**Observación de conversación**

- `model_call_started` / `model_call_ended` - observa metadatos, tiempos, resultados y hashes de ID de solicitud delimitados de llamadas al proveedor/modelo saneados, sin contenido de prompt o respuesta
- `llm_input` - observa la entrada del proveedor (prompt del sistema, prompt, historial)
- `llm_output` - observar la salida del proveedor, el uso y el `contextTokenBudget` resuelto cuando esté disponible

**Herramientas**

- **`before_tool_call`** - reescribir los parámetros de la herramienta, bloquear la ejecución o requerir aprobación
- `after_tool_call` - observar los resultados de la herramienta, los errores y la duración
- **`tool_result_persist`** - reescribir el mensaje del asistente producido a partir de un resultado de la herramienta
- **`before_message_write`** - inspeccionar o bloquear una escritura de mensaje en curso (poco frecuente)

**Mensajes y entrega**

- **`inbound_claim`** - reclamar un mensaje entrante antes del enrutamiento del agente (respuestas sintéticas)
- `message_received` — observe inbound content, sender, thread, and metadata
- **`message_sending`** — rewrite outbound content or cancel delivery
- **`reply_payload_sending`** — mutate or cancel normalized reply payloads before delivery
- `message_sent` — observe outbound delivery success or failure
- **`before_dispatch`** - inspect or rewrite an outbound dispatch before channel handoff
- **`reply_dispatch`** - participate in the final reply-dispatch pipeline

**Sessions and compaction**

- `session_start` / `session_end` - track session lifecycle boundaries. The event's `reason` is one of `new`, `reset`, `idle`, `daily`, `compaction`, `deleted`, `shutdown`, `restart`, or `unknown`. The `shutdown` and `restart` values fire from the gateway shutdown finalizer when the process is stopped or restarted while sessions are still active, so downstream plugins (such as memory or transcript stores) can finalize ghost rows that would otherwise be left in an open state across restarts. The finalizer is bounded so a slow plugin cannot block SIGTERM/SIGINT.
- `before_compaction` / `after_compaction` - observe or annotate compaction cycles
- `before_reset` - observe session-reset events (`/reset`, programmatic resets)

**Subagents**

- `subagent_spawned` / `subagent_ended` - observe subagent launch and completion.
- `subagent_delivery_target` - compatibility hook for completion delivery when no core session binding can project a route.
- `subagent_spawning` - deprecated compatibility hook. Core now prepares `thread: true` subagent bindings through channel session-binding adapters before `subagent_spawned` fires.
- `subagent_spawned` includes `resolvedModel` and `resolvedProvider` when OpenClaw has resolved the child session's native model before launch.

**Lifecycle**

- `gateway_start` / `gateway_stop` - start or stop plugin-owned services with the Gateway
- `deactivate` - deprecated compatibility alias for `gateway_stop`; use `gateway_stop` in new plugins
- `cron_changed` - observe gateway-owned cron lifecycle changes (added, updated, removed, started, finished, scheduled)
- **`before_install`** - inspect skill or plugin install scans and optionally block

## Debug runtime hooks

Use `before_model_resolve` when a plugin needs to switch the provider or model
for an agent turn. It runs before model resolution; `llm_output` only runs after
a model attempt produces assistant output.

For proof of the effective session model, inspect runtime registrations, then
use `openclaw sessions` or the Gateway session/status surfaces. When debugging
provider payloads, start the Gateway with `--raw-stream` and
`--raw-stream-path <path>`; those flags write raw model stream events to a l
file.

## Tool call policy

`before_tool_call` receives:

- `event.toolName`
- `event.params`
- opcional `event.toolKind` y `event.toolInputKind`, discriminadores autoritativos por el host
  para herramientas que comparten intencionalmente nombres; por ejemplo, las llamadas
  externas en modo de código `exec` usan `toolKind: "code_mode_exec"` e
  incluyen `toolInputKind: "javascript" | "typescript"` cuando se conoce
  el idioma de entrada
- opcional `event.derivedPaths`, que contiene sugerencias de ruta de destino derivadas
  del host con el mejor esfuerzo para envoltorios de herramientas conocidas, como `apply_patch`;
  cuando están presentes, estas rutas pueden estar incompletas o pueden sobrestimar lo que la herramienta
  realmente tocará (por ejemplo, con entradas malformadas o parciales)
- opcional `event.runId`
- opcional `event.toolCallId`
- campos de contexto como `ctx.agentId`, `ctx.sessionKey`, `ctx.sessionId`,
  `ctx.runId`, `ctx.jobId` (establecido en ejecuciones impulsadas por cron), `ctx.toolKind`,
  `ctx.toolInputKind` y `ctx.trace` de diagnóstico

Puede devolver:

```typescript
type BeforeToolCallResult = {
  params?: Record<string, unknown>;
  block?: boolean;
  blockReason?: string;
  requireApproval?: {
    title: string;
    description: string;
    severity?: "info" | "warning" | "critical";
    timeoutMs?: number;
    timeoutBehavior?: "allow" | "deny";
    allowedDecisions?: Array<"allow-once" | "allow-always" | "deny">;
    pluginId?: string;
    onResolution?: (decision: "allow-once" | "allow-always" | "deny" | "timeout" | "cancelled") => Promise<void> | void;
  };
};
```

Comportamiento del guardia del enlace para enlaces de ciclo de vida tipados:

- `block: true` es terminal y omite los controladores de menor prioridad.
- `block: false` se trata como sin decisión.
- `params` reescribe los parámetros de la herramienta para la ejecución.
- `requireApproval` pausa la ejecución del agente y pregunta al usuario a través de
  aprobaciones del complemento. El comando `/approve` puede aprobar tanto las aprobaciones de ejecución como las del complemento.
  En los relés nativos `PreToolUse` en modo de informe del servidor de aplicaciones Codex, esto se difiere
  a la solicitud de aprobación del servidor de aplicaciones correspondiente; consulte [Tiempo de ejecución del arnés Codex](/es/plugins/codex-harness-runtime#hook-boundaries).
- Un `block: true` de menor prioridad aún puede bloquear después de que un enlace
  de mayor prioridad haya solicitado aprobación.
- `onResolution` recibe la decisión de aprobación resuelta: `allow-once`,
  `allow-always`, `deny`, `timeout` o `cancelled`.

Consulte [Solicitudes de permisos de complementos](/es/plugins/plugin-permission-requests) para obtener
información sobre el enrutamiento de aprobaciones, el comportamiento de decisión y cuándo usar `requireApproval` en lugar
de aprobaciones de herramientas opcionales o exec.

Los complementos integrados que necesitan políticas de nivel de host pueden registrar políticas de herramientas de confianza
con `api.registerTrustedToolPolicy(...)`. Estas se ejecutan antes que los ganchos `before_tool_call`
normales y antes que las decisiones de complementos externos. Úselas solo
para puertas de confianza del host, como políticas del espacio de trabajo, aplicación de presupuestos o
seguridad de flujos de trabajo reservados. Los complementos externos deben usar los ganchos normales `before_tool_call`.

### Persistencia del resultado de la herramienta

Los resultados de las herramientas pueden incluir `details` estructurados para la representación de la interfaz de usuario, diagnósticos,
enrutamiento de medios o metadatos propiedad del complemento. Trate `details` como metadatos de tiempo de ejecución,
no como contenido del prompt:

- OpenClaw elimina `toolResult.details` antes de la repetición del proveedor y la entrada de
  compactación para que los metadatos no se conviertan en contexto del modelo.
- Las entradas de sesión persistentes conservan solo `details` delimitado. Los detalles excesivamente grandes se
  reemplazan con un resumen compacto y `persistedDetailsTruncated: true`.
- `tool_result_persist` y `before_message_write` se ejecutan antes del límite
  de persistencia final. Los ganchos aún deben mantener los `details` devueltos pequeños y evitar
  colocar texto relevante para el prompt solo en `details`; coloque la salida de la herramienta visible para el modelo
  en `content`.

## Ganchos de prompt y modelo

Use los ganchos específicos de la fase para nuevos complementos:

- `before_model_resolve`: recibe solo el prompt actual y los metadatos de
  los archivos adjuntos. Devuelva `providerOverride` o `modelOverride`.
- `agent_turn_prepare`: recibe el prompt actual, los mensajes de sesión preparados
  y cualquier inyección en cola de exactamente una vez drenada para esta sesión. Devuelva
  `prependContext` o `appendContext`.
- `before_prompt_build`: recibe el prompt actual y los mensajes de sesión.
  Devuelva `prependContext`, `appendContext`, `systemPrompt`,
  `prependSystemContext` o `appendSystemContext`.
- `heartbeat_prompt_contribution`: se ejecuta solo para turnos de latido y devuelve
  `prependContext` o `appendContext`. Está destinado a monitores en segundo plano
  que necesitan resumir el estado actual sin cambiar los turnos iniciados por el usuario.

`before_agent_start` permanece por compatibilidad. Prefiera los hooks explícitos anteriores
para que su complemento no dependa de una fase combinada heredada.

`before_agent_run` se ejecuta después de la construcción del aviso y antes de cualquier entrada del modelo,
incluida la carga de imágenes locales del aviso y la observación de `llm_input`. Recibe
la entrada del usuario actual como `prompt`, más el historial de sesión cargado en `messages`
y el aviso del sistema activo. Devuelva `{ outcome: "block", reason, message? }`
para detener la ejecución antes de que el modelo pueda leer el aviso. `reason` es interno;
`message` es el reemplazo orientado al usuario. Los únicos resultados admitidos son
`pass` y `block`; las formas de decisión no admitidas fallan de forma cerrada.

Cuando se bloquea una ejecución, OpenClaw almacena solo el texto de reemplazo en
`message.content` más metadatos de bloqueo no confidenciales, como el id del complemento bloqueante
y la marca de tiempo. El texto original del usuario no se conserva en la transcripción ni en el contexto
futuro. Los motivos de bloqueo interno se tratan como confidenciales y se excluyen de
las cargas de transcripción, historial, transmisión, registro y diagnóstico. La observabilidad
debe usar campos saneados, como el id del bloqueador, el resultado, la marca de tiempo o una categoría segura.

`before_agent_start` y `agent_end` incluyen `event.runId` cuando OpenClaw puede
identificar la ejecución activa. El mismo valor también está disponible en `ctx.runId`.
Las ejecuciones impulsadas por Cron también exponen `ctx.jobId` (el id del trabajo cron de origen) para que
los hooks del complemento puedan delimitar métricas, efectos secundarios o estado a un trabajo
programado específico.

Para las ejecuciones originadas en el canal, `ctx.messageProvider` es la superficie del proveedor, como
`discord` o `telegram`, mientras que `ctx.channelId` es el identificador del objetivo de
la conversación cuando OpenClaw puede derivar uno de la clave de sesión o los metadatos
de entrega.

`agent_end` es un hook de observación. Las rutas de Gateway y del arnés persistente lo ejecutan
fire-and-forget después del turno, mientras que las rutas CLI de corto alcance y de un solo uso esperan la
promesa del hook antes de la limpieza del proceso, para que los plugins de confianza puedan vaciar la
observabilidad de la terminal o capturar el estado. El ejecutor de hooks aplica un tiempo de espera de 30 segundos para que un
plugin bloqueado o un punto final de integración no pueda dejar la promesa del hook pendiente
para siempre. Se registra un tiempo de espera y OpenClaw continúa; no cancela
el trabajo de red propiedad del plugin a menos que el plugin también use su propia señal de aborto.

Use `model_call_started` y `model_call_ended` para la telemetría de llamadas al proveedor
que no debe recibir mensajes sin procesar, historial, respuestas, encabezados, cuerpos de
solicitud o ID de solicitud del proveedor. Estos hooks incluyen metadatos estables como
`runId`, `callId`, `provider`, `model`, `api`/`transport` opcionales,
`durationMs`/`outcome` terminales, y
`upstreamRequestIdHash` cuando OpenClaw puede derivar un
hash acotado de ID de solicitud del proveedor. Cuando el tiempo de ejecución ha resuelto los metadatos
de la ventana de contexto, el evento y el contexto del hook también incluyen `contextTokenBudget`, el
presupuesto efectivo de tokens después de los límites de modelo/configuración/agente, además
de `contextWindowSource` y `contextWindowReferenceTokens` cuando se aplicó
un límite inferior.

`before_agent_finalize` se ejecuta solo cuando un arnés está a punto de aceptar una
respuesta final natural del asistente. No es la ruta de cancelación de `/stop` y no
se ejecuta cuando el usuario aborta un turno. Devuelva `{ action: "revise", reason }` para pedir
al arnés un pase más del modelo antes de la finalización, `{ action:
"finalize", reason? }` para forzar la finalización, u omita un resultado para continuar.
Los ganchos nativos de Codex `Stop` se retransmiten a este gancho como decisiones de OpenClaw
`before_agent_finalize`.

Al devolver `action: "revise"`, los complementos pueden incluir metadatos `retry` para hacer
que el pase adicional del modelo sea limitado y seguro para la repetición:

```typescript
type BeforeAgentFinalizeRetry = {
  instruction: string;
  idempotencyKey?: string;
  maxAttempts?: number;
};
```

`instruction` se anexa al motivo de revisión enviado al arnés.
`idempotencyKey` permite al host contar reintentos para la misma solicitud de complemento en
decisiones de finalización equivalentes, y `maxAttempts` limita cuántos pases adicionales el
host permitirá antes de continuar con la respuesta final natural.

Los complementos no empaquetados que necesiten ganchos de conversación sin procesar (`before_model_resolve`,
`before_agent_reply`, `llm_input`, `llm_output`, `before_agent_finalize`,
`agent_end`, o `before_agent_run`) deben establecer:

```json
{
  "plugins": {
    "entries": {
      "my-plugin": {
        "hooks": {
          "allowConversationAccess": true
        }
      }
    }
  }
}
```

Los ganchos de modificación de avisos y las inyecciones duraderas de siguiente turno se pueden desactivar por complemento
con `plugins.entries.<id>.hooks.allowPromptInjection=false`.

### Extensiones de sesión e inyecciones de siguiente turno

Los complementos de flujo de trabajo pueden persistir un pequeño estado de sesión compatible con JSON con
`api.registerSessionExtension(...)` y actualizarlo a través del método del Gateway
`sessions.pluginPatch`. Las filas de sesión proyectan el estado de extensión registrado
a través de `pluginExtensions`, lo que permite a la interfaz de usuario de Control y otros clientes representar
el estado propiedad del complemento sin conocer los aspectos internos del complemento.

Use `api.enqueueNextTurnInjection(...)` cuando un complemento necesita un contexto duradero para
alcanzar el siguiente turno del modelo exactamente una vez. OpenClaw drena las inyecciones en cola antes de
los hooks de solicitud (prompt hooks), elimina las inyecciones caducadas y deduplica por `idempotencyKey`
por complemento. Este es el punto de conexión adecuado para reanudaciones de aprobación, resúmenes de políticas,
deltas de monitoreo en segundo plano y continuaciones de comandos que deben ser visibles para
el modelo en el siguiente turno pero no deben convertirse en texto permanente del indicador del sistema.

La semántica de limpieza es parte del contrato. Las devoluciones de llamada de limpieza de extensiones de sesión y
del ciclo de vida en tiempo de ejecución reciben `reset`, `delete`, `disable` o
`restart`. El host elimina el estado persistente de la extensión de sesión del complemento propietario
y las inyecciones pendientes para el siguiente turno para restablecimiento/eliminación/deshabilitación; el reinicio mantiene
el estado duradero de la sesión mientras que las devoluciones de llamada de limpieza permiten a los complementos liberar trabajos del
programador, contexto de ejecución y otros recursos fuera de banda para la antigua generación
de tiempo de ejecución.

## Message hooks

Use message hooks para el enrutamiento a nivel de canal y la política de entrega:

- `message_received`: observe inbound content, sender, `threadId`, `messageId`,
  `senderId`, optional run/session correlation, and metadata.
- `message_sending`: rewrite `content` or return `{ cancel: true }`.
- `reply_payload_sending`: rewrite normalized `ReplyPayload` objects (including
  `presentation`, `delivery`, media refs, and text) or return `{ cancel: true }`.
- `message_sent`: observe final success or failure.

Para respuestas de TTS solo de audio, `content` puede contener la transcripción hablada oculta
eincluso cuando la carga útil del canal no tiene texto/subtítulo visible. Reescribir ese
`content` actualiza solo la transcripción visible para el hook; no se representa como un
subtítulo de medio.

Los contextos de los hooks de mensajes exponen campos de correlación estables cuando están disponibles:
`ctx.sessionKey`, `ctx.runId`, `ctx.messageId`, `ctx.senderId`, `ctx.trace`,
`ctx.traceId`, `ctx.spanId`, `ctx.parentSpanId` y `ctx.callDepth`. Prefer
estos campos de primera clase antes de leer los metadatos heredados.

Prefiera los campos con tipo `threadId` y `replyToId` antes de usar metadatos
específicos del canal.

Reglas de decisión:

- `message_sending` con `cancel: true` es terminal.
- `message_sending` con `cancel: false` se trata como sin decisión.
- Un `content` reescrito continúa con los hooks de menor prioridad a menos que un hook posterior
  cancele la entrega.
- `reply_payload_sending` se ejecuta después de la normalización de la carga útil y antes de la entrega
  del canal, incluidas las respuestas enrutadas de vuelta al canal de origen. Los manejadores
  se ejecutan secuencialmente y cada manejador ve la última carga útil producida por
  los manejadores de mayor prioridad.
- Las cargas útiles de `reply_payload_sending` no exponen marcadores de confianza de tiempo de ejecución como
  `trustedLocalMedia`; los plugins pueden editar la forma de la carga útil, pero no pueden otorgar
  confianza de medios local.
- `message_sending` puede devolver `cancelReason` y `metadata` limitados con una
  cancelación. Las nuevas API del ciclo de vida de mensajes exponen esto como un resultado de entrega
  suprimido con el motivo `cancelled_by_message_sending_hook`; la entrega directa heredada
  sigue devolviendo una matriz de resultados vacía para compatibilidad.
- `message_sent` es solo de observación. Los fallos del manejador se registran y no
  cambian el resultado de la entrega.

## Hooks de instalación

`before_install` se ejecuta después del escaneo integrado de instalaciones de habilidades y plugins.
Devuelva hallazgos adicionales o `{ block: true, blockReason }` para detener la
instalación.

`block: true` es terminal. `block: false` se trata como sin decisión.

## Ciclo de vida del Gateway

Use `gateway_start` para los servicios de complementos que necesitan un estado propiedad del Gateway. El contexto expone `ctx.config`, `ctx.workspaceDir` y `ctx.getCron?.()` para la inspección y actualización de cron. Use `gateway_stop` para limpiar recursos de larga ejecución.

No confíe en el hook interno `gateway:startup` para servicios de tiempo de ejecución propiedad del complemento.

`cron_changed` se activa para eventos del ciclo de vida de cron propiedad del gateway con una carga útil de evento tipificada que cubre los motivos `added`, `updated`, `removed`, `started`, `finished` y `scheduled`. El evento lleva una instantánea de `PluginHookGatewayCronJob` (incluyendo `state.nextRunAtMs`, `state.lastRunStatus` y `state.lastError` cuando están presentes) más un `PluginHookGatewayCronDeliveryStatus` de `not-requested` | `delivered` | `not-delivered` | `unknown`. Los eventos de eliminación aún transportan la instantánea del trabajo eliminado para que los planificadores externos puedan conciliar el estado. Use `ctx.getCron?.()` y `ctx.config` del contexto de tiempo de ejecución al sincronizar planificadores de activación externos, y mantenga a OpenClaw como la fuente de verdad para las verificaciones de vencimiento y la ejecución.

## Próximas obsolescencias

Algunas superficies adyacentes a los hooks están obsoletas pero aún son compatibles. Migre antes de la próxima versión principal:

- **Sobres de canal de texto plano** en los controladores `inbound_claim` y `message_received`. Lea `BodyForAgent` y los bloques de contexto de usuario estructurados en lugar de analizar el texto del sobre plano. Vea [Sobres de canal de texto plano → BodyForAgent](/es/plugins/sdk-migration#active-deprecations).
- **`before_agent_start`** se mantiene por compatibilidad. Los nuevos complementos deben usar `before_model_resolve` y `before_prompt_build` en lugar de la fase combinada.
- **`subagent_spawning`** permanece por compatibilidad con plugins antiguos, pero
  los nuevos plugins no deberían devolver el enrutamiento de hilos desde él. Core prepara
  los enlaces del subagente `thread: true` a través de adaptadores de vinculación de sesión de canal
  antes de que se dispare `subagent_spawned`.
- **`deactivate`** permanece como un alias de compatibilidad de limpieza obsoleto hasta
  después del 2026-08-16. Los nuevos plugins deberían usar `gateway_stop`.
- **`onResolution` en `before_tool_call`** ahora usa la unión tipada
  `PluginApprovalResolution` (`allow-once` / `allow-always` / `deny` /
  `timeout` / `cancelled`) en lugar de un `string` de forma libre.

Para obtener la lista completa — registro de capacidades de memoria, perfil de pensamiento del proveedor,
proveedores de autenticación externos, tipos de descubrimiento de proveedores, accesores de tiempo de ejecución de tareas
y el cambio de nombre de `command-auth` → `command-status` — consulte
[Migración del SDK de plugins → Desaprobcaciones activas](/es/plugins/sdk-migration#active-deprecations).

## Relacionado

- [Migración del SDK de plugins](/es/plugins/sdk-migration) - desaprobcaciones activas y cronograma de eliminación
- [Construcción de plugins](/es/plugins/building-plugins)
- [Descripción general del SDK de plugins](/es/plugins/sdk-overview)
- [Puntos de entrada del plugin](/es/plugins/sdk-entrypoints)
- [Ganchos internos](/es/automation/hooks)
- [Aspectos internos de la arquitectura de plugins](/es/plugins/architecture-internals)
