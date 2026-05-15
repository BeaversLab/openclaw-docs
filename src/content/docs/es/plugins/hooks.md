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
- `llm_output` - observa la salida del proveedor

**Herramientas**

- **`before_tool_call`** - reescribe los parámetros de la herramienta, bloquea la ejecución o requiere aprobación
- `after_tool_call` - observa los resultados de la herramienta, los errores y la duración
- **`tool_result_persist`** - reescribe el mensaje del asistente producido a partir de un resultado de herramienta
- **`before_message_write`** - inspecciona o bloquea una escritura de mensaje en curso (poco común)

**Mensajes y entrega**

- **`inbound_claim`** - reclama un mensaje entrante antes del enrutamiento del agente (respuestas sintéticas)
- `message_received` - observa el contenido entrante, el remitente, el hilo y los metadatos
- **`message_sending`** - reescribe el contenido saliente o cancela la entrega
- `message_sent` - observa el éxito o fracaso de la entrega saliente
- **`before_dispatch`** - inspecciona o reescribe un envío saliente antes de la transferencia al canal
- **`reply_dispatch`** - participa en la canalización final de envío de respuestas

**Sesiones y compactación**

- `session_start` / `session_end` - realizar un seguimiento de los límites del ciclo de vida de la sesión
- `before_compaction` / `after_compaction` - observar o anotar ciclos de compactación
- `before_reset` - observar eventos de restablecimiento de sesión (`/reset`, restablecimientos programáticos)

**Subagentes**

- `subagent_spawning` / `subagent_delivery_target` / `subagent_spawned` / `subagent_ended` - coordinar el enrutamiento de subagentes y la entrega de finalización

**Ciclo de vida**

- `gateway_start` / `gateway_stop` - iniciar o detener servicios propiedad del complemento con el Gateway
- `cron_changed` - observar cambios en el ciclo de vida de cron propiedad del gateway (agregado, actualizado, eliminado, iniciado, finalizado, programado)
- **`before_install`** - inspeccionar análisis de instalación de habilidades o complementos y bloquear opcionalmente

## Política de llamadas a herramientas

`before_tool_call` recibe:

- `event.toolName`
- `event.params`
- opcional `event.derivedPaths`, que contiene sugerencias de ruta de destino derivadas del host con el mejor esfuerzo
  para sobres de herramientas conocidas como `apply_patch`; cuando están presentes,
  estas rutas pueden estar incompletas o pueden sobreestimar lo que la herramienta
  tocará realmente (por ejemplo, con entradas malformadas o parciales)
- opcional `event.runId`
- opcional `event.toolCallId`
- campos de contexto como `ctx.agentId`, `ctx.sessionKey`, `ctx.sessionId`,
  `ctx.runId`, `ctx.jobId` (establecido en ejecuciones impulsadas por cron) y diagnóstico `ctx.trace`

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
    pluginId?: string;
    onResolution?: (decision: "allow-once" | "allow-always" | "deny" | "timeout" | "cancelled") => Promise<void> | void;
  };
};
```

Reglas:

- `block: true` es terminal y omite los controladores de menor prioridad.
- `block: false` se trata como sin decisión.
- `params` reescribe los parámetros de la herramienta para la ejecución.
- `requireApproval` pausa la ejecución del agente y pregunta al usuario a través de aprobaciones
  del complemento. El comando `/approve` puede aprobar tanto las aprobaciones de ejecución como las del complemento.
- Un `block: true` de menor prioridad aún puede bloquear después de que un enlace
  de mayor prioridad haya solicitado aprobación.
- `onResolution` recibe la decisión de aprobación resuelta: `allow-once`,
  `allow-always`, `deny`, `timeout` o `cancelled`.

Los complementos (plugins) empaquetados que necesiten políticas a nivel de host pueden registrar políticas de herramientas de confianza
con `api.registerTrustedToolPolicy(...)`. Estas se ejecutan antes que los enlaces `before_tool_call`
ordinarios y antes que las decisiones de complementos externos. Úselos solo
para puertas de confianza del host, como políticas del espacio de trabajo, cumplimiento del presupuesto o
seguridad de flujos de trabajo reservados. Los complementos externos deben usar los enlaces `before_tool_call`
normales.

### Persistencia del resultado de la herramienta

Los resultados de las herramientas pueden incluir `details` estructurados para el renderizado de la interfaz de usuario, diagnósticos,
enrutamiento de medios o metadatos propiedad del complemento. Trate `details` como metadatos de tiempo de ejecución,
no como contenido del prompt:

- OpenClaw elimina `toolResult.details` antes de la repetición del proveedor y la entrada de compactación
  para que los metadatos no se conviertan en contexto del modelo.
- Las entradas de sesión persistentes mantienen solo `details` delimitados. Los detalles excesivamente grandes se
  reemplazan con un resumen compacto y `persistedDetailsTruncated: true`.
- `tool_result_persist` y `before_message_write` se ejecutan antes del límite final
  de persistencia. Los enlaces aun deben mantener `details` devueltos pequeños y evitar
  colocar texto relevante para el prompt solo en `details`; coloque la salida de herramientas visible para el modelo
  en `content`.

## Enlaces de prompt y modelo

Use los enlaces específicos de la fase para nuevos complementos:

- `before_model_resolve`: recibe solo el prompt actual y los metadatos de los
  adjuntos. Devuelva `providerOverride` o `modelOverride`.
- `agent_turn_prepare`: recibe el prompt actual, los mensajes de sesión preparados
  y cualquier inyección en cola de una sola vez drenada para esta sesión. Devuelva
  `prependContext` o `appendContext`.
- `before_prompt_build`: recibe el mensaje actual y los mensajes de la sesión.
  Devuelve `prependContext`, `appendContext`, `systemPrompt`,
  `prependSystemContext` o `appendSystemContext`.
- `heartbeat_prompt_contribution`: se ejecuta solo para turnos de latido y devuelve
  `prependContext` o `appendContext`. Está destinado a monitores en segundo plano
  que necesitan resumir el estado actual sin cambiar los turnos iniciados por el usuario.

`before_agent_start` permanece por compatibilidad. Prefiera los enlaces explícitos anteriores
para que su complemento no dependa de una fase combinada heredada.

`before_agent_run` se ejecuta después de la construcción del mensaje y antes de cualquier entrada del modelo,
incluida la carga de imágenes locales del mensaje y la observación `llm_input`. Recibe
la entrada de usuario actual como `prompt`, más el historial de sesión cargado en `messages`
y el mensaje del sistema activo. Devuelva `{ outcome: "block", reason, message? }`
para detener la ejecución antes de que el modelo pueda leer el mensaje. `reason` es interno;
`message` es el reemplazo orientado al usuario. Los únicos resultados admitidos son
`pass` y `block`; las formas de decisión no admitidas fallan de forma cerrada.

Cuando se bloquea una ejecución, OpenClaw almacena solo el texto de reemplazo en
`message.content` más metadatos de bloqueo no confidenciales, como el id del complemento bloqueante
y la marca de tiempo. El texto de usuario original no se retiene en la transcripción ni en el contexto
futuro. Las razones internas del bloqueo se tratan como confidenciales y se excluyen de
las cargas de transcripción, historial, difusión, registro y diagnósticos. La observabilidad
debe usar campos sanitizados como el id del bloqueador, el resultado, la marca de tiempo o una categoría
segura.

`before_agent_start` y `agent_end` incluyen `event.runId` cuando OpenClaw puede
identificar la ejecución activa. El mismo valor también está disponible en `ctx.runId`.
Las ejecuciones impulsadas por cron también exponen `ctx.jobId` (el id del trabajo cron de origen) para que
los enlaces de complementos puedan limitar métricas, efectos secundarios o estado a un trabajo
programado específico.

Para ejecuciones originadas en canales, `ctx.messageProvider` es la superficie del proveedor, como `discord` o `telegram`, mientras que `ctx.channelId` es el identificador del objetivo de la conversación cuando OpenClaw puede derivar uno de la clave de sesión o los metadatos de entrega.

`agent_end` es un hook de observación y se ejecuta en modo "fire-and-forget" (disparar y olvidar) después del turno. El ejecutor de hooks aplica un tiempo de espera de 30 segundos para que un plugin bloqueado o un punto final de integración (embedding) no pueda dejar la promesa del hook pendiente para siempre. Se registra un tiempo de espera y OpenClaw continúa; no cancela el trabajo de red propiedad del plugin a menos que el plugin también use su propia señal de aborto.

Use `model_call_started` y `model_call_ended` para la telemetría de llamadas al proveedor que no debe recibir indicaciones sin procesar (raw prompts), historial, respuestas, encabezados, cuerpos de solicitud o ID de solicitud del proveedor. Estos hooks incluyen metadatos estables como `runId`, `callId`, `provider`, `model`, `api`/`transport` opcional, `durationMs`/`outcome` terminal, y `upstreamRequestIdHash` cuando OpenClaw puede derivar un hash del ID de solicitud del proveedor limitado (bounded).

`before_agent_finalize` se ejecuta solo cuando un arnés está a punto de aceptar una respuesta final natural del asistente. No es la ruta de cancelación de `/stop` y no se ejecuta cuando el usuario aborta un turno. Devuelva `{ action: "revise", reason }` para pedirle al arnés un paso de modelo más antes de la finalización, `{ action: "finalize", reason? }` para forzar la finalización, u omita un resultado para continuar. Los hooks nativos de Codex `Stop` se retransmiten a este hook como decisiones de OpenClaw `before_agent_finalize`.

Al devolver `action: "revise"`, los plugins pueden incluir metadatos de `retry` para hacer que el paso de modelo adicional sea limitado y seguro para repetición:

```typescript
type BeforeAgentFinalizeRetry = {
  instruction: string;
  idempotencyKey?: string;
  maxAttempts?: number;
};
```

`instruction` se anexa al motivo de la revisión enviado al arnés.
`idempotencyKey` permite al host contar los reintentos para la misma solicitud de complemento a través de
decisiones de finalización equivalentes, y `maxAttempts` limita cuántos pases adicionales el
host permitirá antes de continuar con la respuesta final natural.

Los complementos no incluidos que necesitan hooks de conversación sin procesar (`before_model_resolve`,
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

Los hooks de modificación de prompts y las inyecciones duraderas de siguiente turno se pueden deshabilitar por complemento
con `plugins.entries.<id>.hooks.allowPromptInjection=false`.

### Extensiones de sesión e inyecciones de siguiente turno

Los complementos de flujo de trabajo pueden mantener un pequeño estado de sesión compatible con JSON con
`api.registerSessionExtension(...)` y actualizarlo a través del método
`sessions.pluginPatch` de Gateway. Las filas de sesión proyectan el estado de extensión registrado
a través de `pluginExtensions`, permitiendo que Control UI y otros clientes representen
el estado propiedad del complemento sin conocer los aspectos internos del complemento.

Use `api.enqueueNextTurnInjection(...)` cuando un complemento necesite un contexto duradero para
alcanzar el siguiente turno del modelo exactamente una vez. OpenClaw drena las inyecciones en cola antes de
los hooks de prompt, elimina las inyecciones caducadas y deduplica por `idempotencyKey`
por complemento. Este es el punto adecuado para reanudaciones de aprobación, resúmenes de políticas,
deltas de monitores en segundo plano y continuaciones de comandos que deben ser visibles para
el modelo en el siguiente turno pero no deben convertirse en texto de prompt del sistema permanente.

La semántica de limpieza es parte del contrato. Las devoluciones de llamada de limpieza de extensiones de sesión y
del ciclo de vida de tiempo de ejecución reciben `reset`, `delete`, `disable`, o
`restart`. El host elimina el estado persistente de extensión de sesión del complemento propietario
y las inyecciones pendientes de siguiente turno para restablecimiento/eliminación/deshabilitación; el reinicio mantiene
el estado duradero de la sesión mientras que las devoluciones de llamada de limpieza permiten que los complementos liberen trabajos
del programador, contexto de ejecución y otros recursos fuera de banda para la generación de tiempo de ejecución
antigua.

## Hooks de mensajes

Use message hooks for channel-level routing and delivery policy:

- `message_received`: observe inbound content, sender, `threadId`, `messageId`,
  `senderId`, optional run/session correlation, and metadata.
- `message_sending`: rewrite `content` or return `{ cancel: true }`.
- `message_sent`: observe final success or failure.

For audio-only TTS replies, `content` may contain the hidden spoken transcript
even when the channel payload has no visible text/caption. Rewriting that
`content` updates the hook-visible transcript only; it is not rendered as a
media caption.

Message hook contexts expose stable correlation fields when available:
`ctx.sessionKey`, `ctx.runId`, `ctx.messageId`, `ctx.senderId`, `ctx.trace`,
`ctx.traceId`, `ctx.spanId`, `ctx.parentSpanId`, and `ctx.callDepth`. Prefer
these first-class fields before reading legacy metadata.

Prefer typed `threadId` and `replyToId` fields before using channel-specific
metadata.

Decision rules:

- `message_sending` with `cancel: true` is terminal.
- `message_sending` with `cancel: false` is treated as no decision.
- Rewritten `content` continues to lower-priority hooks unless a later hook
  cancels delivery.
- `message_sending` can return `cancelReason` and bounded `metadata` with a
  cancellation. New message lifecycle APIs expose this as a suppressed delivery
  outcome with reason `cancelled_by_message_sending_hook`; legacy direct
  delivery keeps returning an empty result array for compatibility.
- `message_sent` is observation-only. Handler failures are logged and do not
  change the delivery result.

## Install hooks

`before_install` se ejecuta después del escaneo integrado para instalaciones de habilidades y complementos.
Devuelve hallazgos adicionales o `{ block: true, blockReason }` para detener la
instalación.

`block: true` es terminal. `block: false` se trata como sin decisión.

## Ciclo de vida de Gateway

Usa `gateway_start` para los servicios de complementos que necesitan un estado propiedad de Gateway. El
contexto expone `ctx.config`, `ctx.workspaceDir` y `ctx.getCron?.()` para
la inspección y actualizaciones de cron. Usa `gateway_stop` para limpiar recursos de
larga ejecución.

No confíes en el gancho interno `gateway:startup` para servicios de
tiempo de ejecución propiedad del complemento.

`cron_changed` se activa para eventos del ciclo de vida de cron propiedad de Gateway con una carga útil
de evento tipificada que cubre `added`, `updated`, `removed`, `started`, `finished`,
y `scheduled` motivos. El evento lleva una instantánea `PluginHookGatewayCronJob`
(incluyendo `state.nextRunAtMs`, `state.lastRunStatus` y
`state.lastError` cuando están presentes) más un `PluginHookGatewayCronDeliveryStatus`
de `not-requested` | `delivered` | `not-delivered` | `unknown`. Los eventos
de eliminación todavía llevan la instantánea del trabajo eliminado para que los programadores externos puedan
conciliar el estado. Usa `ctx.getCron?.()` y `ctx.config` del contexto de
tiempo de ejecución al sincronizar programadores de activación externos, y mantén a OpenClaw como la
fuente de verdad para comprobaciones de vencimiento y ejecución.

## Próximas depreciaciones

Algunas superficies adyacentes a ganchos están en desuso pero aún son compatibles. Migre
antes del próximo lanzamiento principal:

- **Sobres de canal de texto sin formato** en los controladores `inbound_claim` y `message_received`
  . Lea `BodyForAgent` y los bloques de contexto de usuario estructurados
  en lugar de analizar el texto del sobre plano. Consulte
  [Sobres de canal de texto sin formato → BodyForAgent](/es/plugins/sdk-migration#active-deprecations).
- **`before_agent_start`** permanece por compatibilidad. Los nuevos complementos deben usar
  `before_model_resolve` y `before_prompt_build` en lugar de la fase
  combinada.
- **`onResolution` en `before_tool_call`** ahora usa la unión
  tipada `PluginApprovalResolution` (`allow-once` / `allow-always` / `deny` /
  `timeout` / `cancelled`) en lugar de un `string` de forma libre.

Para obtener la lista completa: registro de capacidades de memoria, perfil de
pensamiento del proveedor, proveedores de autenticación externos, tipos de descubrimiento
del proveedor, accesores del tiempo de ejecución de tareas y el cambio de nombre de
`command-auth` → `command-status`, consulte
[Migración del SDK de complementos → Desaprobaciones activas](/es/plugins/sdk-migration#active-deprecations).

## Relacionado

- [Migración del SDK de complementos](/es/plugins/sdk-migration) - desaprobaciones activas y cronograma de eliminación
- [Creación de complementos](/es/plugins/building-plugins)
- [Descripción general del SDK de complementos](/es/plugins/sdk-overview)
- [Puntos de entrada de complementos](/es/plugins/sdk-entrypoints)
- [Hooks internos](/es/automation/hooks)
- [Aspectos internos de la arquitectura de complementos](/es/plugins/architecture-internals)
