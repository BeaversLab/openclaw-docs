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

- `session_start` / `session_end` - rastrea los límites del ciclo de vida de la sesión. El `reason` del evento es uno de `new`, `reset`, `idle`, `daily`, `compaction`, `deleted`, `shutdown`, `restart`, o `unknown`. Los valores `shutdown` y `restart` se activan desde el finalizador de apagado de la puerta de enlace cuando el proceso se detiene o se reinicia mientras las sesiones aún están activas, para que los complementos posteriores (como los almacenes de memoria o transcripciones) puedan finalizar las filas fantasma que, de otro modo, quedarían en un estado abierto entre reinicios. El finalizador tiene un límite de tiempo, por lo que un complemento lento no puede bloquear SIGTERM/SIGINT.
- `before_compaction` / `after_compaction` - observa o anota ciclos de compactación
- `before_reset` - observa eventos de restablecimiento de sesión (`/reset`, restablecimientos programáticos)

**Subagentes**

- `subagent_spawning` / `subagent_delivery_target` / `subagent_spawned` / `subagent_ended` - coordina el enrutamiento de subagentes y la entrega de finalización

**Ciclo de vida**

- `gateway_start` / `gateway_stop` - inicia o detiene servicios propiedad del complemento con la puerta de enlace
- `cron_changed` - observa cambios en el ciclo de vida de cron propiedad de la puerta de enlace (añadido, actualizado, eliminado, iniciado, finalizado, programado)
- **`before_install`** - inspecciona escaneos de instalación de habilidades o complementos y, opcionalmente, los bloquea

## Política de llamadas a herramientas

`before_tool_call` recibe:

- `event.toolName`
- `event.params`
- opcional `event.derivedPaths`, que contiene sugerencias de ruta de destino derivadas del host con el mejor esfuerzo para envoltorios de herramientas conocidos como `apply_patch`; cuando están presentes, estas rutas pueden estar incompletas o pueden sobreestimar lo que la herramienta realmente tocará (por ejemplo, con entradas malformadas o parciales)
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
- `requireApproval` pausa la ejecución del agente y pregunta al usuario a través de aprobaciones de complementos. El comando `/approve` puede aprobar tanto aprobaciones de ejecución como de complementos.
- Un `block: true` de menor prioridad aún puede bloquear después de que un enlace de mayor prioridad haya solicitado aprobación.
- `onResolution` recibe la decisión de aprobación resuelta: `allow-once`,
  `allow-always`, `deny`, `timeout` o `cancelled`.

Los complementos empaquetados que necesitan políticas a nivel de host pueden registrar políticas de herramientas de confianza con `api.registerTrustedToolPolicy(...)`. Estas se ejecutan antes que los enlaces `before_tool_call` ordinarios y antes de las decisiones de complementos externos. Úselas solo para puertas de confianza del host, como políticas del espacio de trabajo, cumplimiento del presupuesto o seguridad de flujo de trabajo reservada. Los complementos externos deben usar enlaces `before_tool_call` normales.

### Persistencia del resultado de la herramienta

Los resultados de las herramientas pueden incluir `details` estructurados para la representación de la interfaz de usuario, diagnóstico, enrutamiento de medios o metadatos propiedad del complemento. Trate `details` como metadatos de tiempo de ejecución, no como contenido del mensaje:

- OpenClaw elimina `toolResult.details` antes de la repetición del proveedor y la entrada de compactación para que los metadatos no se conviertan en contexto del modelo.
- Las entradas de sesión persistentes conservan solo `details` delimitado. Los detalles excesivos se
  reemplazan con un resumen compacto y `persistedDetailsTruncated: true`.
- `tool_result_persist` y `before_message_write` se ejecutan antes del límite final
  de persistencia. Los hooks aún deben mantener el `details` devuelto pequeño y evitar
  colocar texto relevante para el prompt solo en `details`; coloque la salida de herramienta visible para el modelo
  en `content`.

## Enlaces de prompt y modelo

Use los enlaces específicos de la fase para nuevos complementos:

- `before_model_resolve`: recibe solo el prompt actual y los metadatos de los
  archivos adjuntos. Devuelve `providerOverride` o `modelOverride`.
- `agent_turn_prepare`: recibe el prompt actual, los mensajes de sesión preparados
  y cualquier inyección en cola de exactamente una vez vaciada para esta sesión. Devuelve
  `prependContext` o `appendContext`.
- `before_prompt_build`: recibe el prompt actual y los mensajes de sesión.
  Devuelve `prependContext`, `appendContext`, `systemPrompt`,
  `prependSystemContext` o `appendSystemContext`.
- `heartbeat_prompt_contribution`: se ejecuta solo para turnos de latido (heartbeat) y devuelve
  `prependContext` o `appendContext`. Está destinado a monitores en segundo plano
  que necesitan resumir el estado actual sin cambiar los turnos iniciados por el usuario.

`before_agent_start` permanece por compatibilidad. Prefiera los hooks explícitos anteriores
para que su complemento no dependa de una fase combinada heredada.

`before_agent_run` se ejecuta después de la construcción del prompt y antes de cualquier entrada del modelo, incluyendo la carga de imágenes locales del prompt y la observación de `llm_input`. Recibe la entrada del usuario actual como `prompt`, más el historial de sesión cargado en `messages` y el prompt del sistema activo. Devuelva `{ outcome: "block", reason, message? }` para detener la ejecución antes de que el modelo pueda leer el prompt. `reason` es interno; `message` es el reemplazo orientado al usuario. Los únicos resultados admitidos son `pass` y `block`; las formas de decisión no admitidas fallan de forma cerrada.

Cuando se bloquea una ejecución, OpenClaw almacena solo el texto de reemplazo en `message.content` además de los metadatos de bloqueo no sensibles, como el ID del complemento de bloqueo y la marca de tiempo. El texto de usuario original no se retiene en la transcripción ni en el contexto futuro. Las razones de bloqueo interno se tratan como sensibles y se excluyen de las cargas útiles de transcripción, historial, transmisión, registro y diagnósticos. La observabilidad debe utilizar campos saneados, como el ID del bloqueador, el resultado, la marca de tiempo o una categoría segura.

`before_agent_start` y `agent_end` incluyen `event.runId` cuando OpenClaw puede identificar la ejecución activa. El mismo valor también está disponible en `ctx.runId`. Las ejecuciones impulsadas por Cron también exponen `ctx.jobId` (el ID del trabajo cron de origen) para que los enlaces del complemento puedan limitar métricas, efectos secundarios o estado a un trabajo programado específico.

Para las ejecuciones originadas en el canal, `ctx.messageProvider` es la superficie del proveedor, como `discord` o `telegram`, mientras que `ctx.channelId` es el identificador de objetivo de la conversación cuando OpenClaw puede derivar uno de la clave de sesión o los metadatos de entrega.

`agent_end` es un enlace de observación y se ejecuta de manera asíncrona (fire-and-forget) después del turno. El ejecutor de enlaces aplica un tiempo de espera de 30 segundos para que un complemento bloqueado o un endpoint de incrustación no pueda dejar la promesa del enlace pendiente para siempre. Un tiempo de espera se registra y OpenClaw continúa; no cancela el trabajo de red propiedad del complemento a menos que el complemento también utilice su propia señal de cancelación.

Use `model_call_started` y `model_call_ended` para telemetría de llamadas al proveedor
que no debe recibir avisos sin procesar, historial, respuestas, encabezados, cuerpos de
solicitud o ID de solicitud del proveedor. Estos hooks incluyen metadatos estables como
`runId`, `callId`, `provider`, `model`, `api`/`transport` opcionales,
terminal `durationMs`/`outcome`, y `upstreamRequestIdHash` cuando OpenClaw puede derivar
un hash de ID de solicitud del proveedor delimitado.

`before_agent_finalize` se ejecuta solo cuando un arnés está a punto de aceptar una
respuesta final natural del asistente. No es la ruta de cancelación de `/stop` y no se
ejecuta cuando el usuario aborta un turno. Devuelva `{ action: "revise", reason }` para pedir
al arnés un paso adicional del modelo antes de la finalización, `{ action:
"finalize", reason? }` para forzar la finalización, u omitir un resultado para continuar.
Los hooks nativos `Stop` de Codex se retransmiten a este hook como decisiones
de `before_agent_finalize` de OpenClaw.

Al devolver `action: "revise"`, los complementos pueden incluir metadatos `retry` para hacer
que el paso adicional del modelo sea delimitado y seguro para repetición:

```typescript
type BeforeAgentFinalizeRetry = {
  instruction: string;
  idempotencyKey?: string;
  maxAttempts?: number;
};
```

`instruction` se añade al motivo de revisión enviado al arnés.
`idempotencyKey` permite al host contar reintentos para la misma solicitud de complemento a través de
decisiones equivalentes de finalización, y `maxAttempts` limita cuántos pases adicionales permitirá
el host antes de continuar con la respuesta final natural.

Los complementos no agrupados que necesiten hooks de conversación sin procesar (`before_model_resolve`,
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

Los hooks que modifican avisos y las inyecciones duraderas del siguiente turno se pueden desactivar por complemento
con `plugins.entries.<id>.hooks.allowPromptInjection=false`.

### Extensiones de sesión e inyecciones de siguiente turno

Los complementos de flujo de trabajo pueden conservar un pequeño estado de sesión compatible con JSON con `api.registerSessionExtension(...)` y actualizarlo a través del método `sessions.pluginPatch` de la Gateway. Las filas de sesión proyectan el estado de extensión registrado a través de `pluginExtensions`, permitiendo que la interfaz de Control y otros clientes representen el estado propiedad del complemento sin conocer los detalles internos del complemento.

Use `api.enqueueNextTurnInjection(...)` cuando un complemento necesite un contexto duradero para llegar exactamente una vez al siguiente turno del modelo. OpenClaw drena las inyecciones en cola antes de los hooks de solicitud, elimina las inyecciones caducadas y deduplica por `idempotencyKey` por complemento. Este es el lugar adecuado para las reanudaciones de aprobación, los resúmenes de políticas, los deltas del monitor en segundo plano y las continuaciones de comandos que deben ser visibles para el modelo en el siguiente turno pero que no deben convertirse en texto permanente del prompt del sistema.

La semántica de limpieza es parte del contrato. Las devoluciones de llamada de limpieza de extensión de sesión y de ciclo de vida de ejecución reciben `reset`, `delete`, `disable` o `restart`. El host elimina el estado de extensión de sesión persistente del complemento propietario y las inyecciones pendientes del siguiente turno para restablecimiento/eliminación/deshabilitación; el reinicio mantiene el estado de sesión duradero mientras que las devoluciones de llamada de limpieza permiten a los complementos liberar trabajos del programador, contexto de ejecución y otros recursos fuera de banda para la generación de ejecución anterior.

## Hooks de mensajes

Use message hooks for channel-level routing and delivery policy:

- `message_received`: observar el contenido entrante, remitente, `threadId`, `messageId`, `senderId`, correlación opcional de ejecución/sesión y metadatos.
- `message_sending`: reescribir `content` o devolver `{ cancel: true }`.
- `message_sent`: observar el éxito o el fracaso final.

Para las respuestas de TTS de solo audio, `content` puede contener la transcripción hablada oculta incluso cuando la carga del canal no tiene texto/subtítulo visible. Reescribir ese `content` actualiza solo la transcripción visible para el hook; no se representa como un subtítulo de medios.

Los contextos de los enlaces de mensajes exponen campos de correlación estables cuando están disponibles:
`ctx.sessionKey`, `ctx.runId`, `ctx.messageId`, `ctx.senderId`, `ctx.trace`,
`ctx.traceId`, `ctx.spanId`, `ctx.parentSpanId` y `ctx.callDepth`. Prefiera
estos campos de primera clase antes de leer los metadatos heredados.

Prefiera los campos tipados `threadId` y `replyToId` antes de utilizar metadatos
específicos del canal.

Decision rules:

- `message_sending` con `cancel: true` es terminal.
- `message_sending` con `cancel: false` se trata como sin decisión.
- El `content` reescrito continúa con enlaces de menor prioridad a menos que un enlace posterior
  cancele la entrega.
- `message_sending` puede devolver `cancelReason` y `metadata` delimitado con una
  cancelación. Las nuevas API del ciclo de vida de mensajes exponen esto como un resultado de entrega
  suprimido con el motivo `cancelled_by_message_sending_hook`; la entrega directa heredada
  sigue devolviendo una matriz de resultados vacía para compatibilidad.
- `message_sent` es solo de observación. Los fallos del controlador se registran y no
  cambian el resultado de la entrega.

## Install hooks

`before_install` se ejecuta después del escaneo integrado para instalaciones de habilidades y complementos.
Devuelve hallazgos adicionales o `{ block: true, blockReason }` para detener la
instalación.

`block: true` es terminal. `block: false` se trata como sin decisión.

## Ciclo de vida de Gateway

Use `gateway_start` para servicios de complementos que necesitan estado propiedad del Gateway. El
contexto expone `ctx.config`, `ctx.workspaceDir` y `ctx.getCron?.()` para
la inspección y actualización de cron. Use `gateway_stop` para limpiar recursos de
ejecución prolongada.

No dependa del enlace interno `gateway:startup` para servicios de
tiempo de ejecución propiedad del complemento.

`cron_changed` se activa para eventos del ciclo de vida de cron propiedad de gateway con una carga de evento tipificada que cubre `added`, `updated`, `removed`, `started`, `finished`
y razones `scheduled`. El evento lleva una instantánea `PluginHookGatewayCronJob`
(incluyendo `state.nextRunAtMs`, `state.lastRunStatus` y
`state.lastError` cuando están presentes) más un `PluginHookGatewayCronDeliveryStatus`
de `not-requested` | `delivered` | `not-delivered` | `unknown`. Los eventos de eliminación
todavía llevan la instantánea del trabajo eliminado para que los planificadores externos puedan
conciliar el estado. Use `ctx.getCron?.()` y `ctx.config` del contexto de ejecución
al sincronizar los planificadores de activación externos, y mantenga OpenClaw como la
fuente de verdad para las comprobaciones de vencimiento y la ejecución.

## Próximas depreciaciones

Algunas superficies adyacentes a ganchos están en desuso pero aún son compatibles. Migre
antes del próximo lanzamiento principal:

- **Sobres de canales de texto sin formato** en los controladores `inbound_claim` y `message_received`
  . Lea `BodyForAgent` y los bloques de contexto de usuario estructurados
  en lugar de analizar el texto plano del sobre. Vea
  [Sobres de canales de texto sin formato → BodyForAgent](/es/plugins/sdk-migration#active-deprecations).
- **`before_agent_start`** permanece por compatibilidad. Los nuevos complementos deben usar
  `before_model_resolve` y `before_prompt_build` en lugar de la fase
  combinada.
- **`onResolution` en `before_tool_call`** ahora usa la unión tipificada
  `PluginApprovalResolution` (`allow-once` / `allow-always` / `deny` /
  `timeout` / `cancelled`) en lugar de un `string` de forma libre.

Para ver la lista completa: registro de capacidades de memoria, perfil de pensamiento del proveedor,
proveedores de autenticación externos, tipos de descubrimiento de proveedores, accesores de tiempo de ejecución
de tareas y el cambio de nombre `command-auth` → `command-status`, consulte
[Migración del SDK de complementos → Desusos activos](/es/plugins/sdk-migration#active-deprecations).

## Relacionado

- [Migración del SDK de complementos](/es/plugins/sdk-migration) - desaprobaciones activas y cronograma de eliminación
- [Creación de complementos](/es/plugins/building-plugins)
- [Descripción general del SDK de complementos](/es/plugins/sdk-overview)
- [Puntos de entrada de complementos](/es/plugins/sdk-entrypoints)
- [Ganchos internos](/es/automation/hooks)
- [Aspectos internos de la arquitectura de complementos](/es/plugins/architecture-internals)
