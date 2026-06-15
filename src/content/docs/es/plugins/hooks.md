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

Utilice [internal hooks](/es/automation/hooks) en su lugar cuando desee un pequeño script `HOOK.md` instalado por el operador para eventos de comandos y Gateway, como `/new`, `/reset`, `/stop`, `agent:bootstrap` o `gateway:startup`.

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
- `resolve_exec_env` - contribuir con variables de entorno propias del complemento a `exec`
- **`tool_result_persist`** - reescribir el mensaje del asistente producido a partir de un resultado de herramienta
- **`before_message_write`** - inspeccionar o bloquear una escritura de mensaje en curso (raro)

**Mensajes y entrega**

- **`inbound_claim`** - reclamar un mensaje entrante antes del enrutamiento del agente (respuestas sintéticas)
- `message_received` — observar contenido entrante, remitente, hilo y metadatos
- **`message_sending`** — reescribir contenido saliente o cancelar la entrega
- **`reply_payload_sending`** — mutar o cancelar cargas útiles de respuesta normalizadas antes de la entrega
- `message_sent` — observar el éxito o fracaso de la entrega saliente
- **`before_dispatch`** - inspeccionar o reescribir un despacho saliente antes de la transferencia al canal
- **`reply_dispatch`** - participar en la canalización final de despacho de respuestas

**Sesiones y compactación**

- `session_start` / `session_end` - rastrear los límites del ciclo de vida de la sesión. El `reason` del evento es uno de `new`, `reset`, `idle`, `daily`, `compaction`, `deleted`, `shutdown`, `restart` o `unknown`. Los valores `shutdown` y `restart` se activan desde el finalizador de apagado de la gateway cuando el proceso se detiene o reinicia mientras las sesiones aún están activas, para que los complementos descendentes (como los almacenes de memoria o transcripciones) puedan finalizar las filas fantasma que de otro modo quedarían en un estado abierto entre reinicios. El finalizador está limitado para que un complemento lento no pueda bloquear SIGTERM/SIGINT.
- `before_compaction` / `after_compaction` - observar o anotar ciclos de compactación
- `before_reset` - observar eventos de restablecimiento de sesión (`/reset`, restablecimientos programáticos)

**Subagentes**

- `subagent_spawned` / `subagent_ended` - observar el lanzamiento y finalización del subagente.
- `subagent_delivery_target` - enlace de compatibilidad para la entrega de finalización cuando ningún enlace de sesión central puede proyectar una ruta.
- `subagent_spawning` - enlace de compatibilidad en desuso. Core ahora prepara enlaces de subagente `thread: true` a través de adaptadores de enlace de sesión de canal antes de que se dispare `subagent_spawned`.
- `subagent_spawned` incluye `resolvedModel` y `resolvedProvider` cuando OpenClaw ha resuelto el modelo nativo de la sesión secundaria antes del lanzamiento.

**Ciclo de vida**

- `gateway_start` / `gateway_stop` - iniciar o detener servicios propiedad del complemento con el Gateway
- `deactivate` - alias de compatibilidad en desuso para `gateway_stop`; use `gateway_stop` en complementos nuevos
- `cron_changed` - observar cambios en el ciclo de vida de cron propiedad del gateway (agregado, actualizado, eliminado, iniciado, finalizado, programado)
- **`before_install`** - inspeccionar escaneos de instalación de habilidades o complementos y bloquear opcionalmente

## Depurar enlaces de tiempo de ejecución

Use `before_model_resolve` cuando un complemento necesite cambiar el proveedor o el modelo
para un turno de agente. Se ejecuta antes de la resolución del modelo; `llm_output` solo se ejecuta después
de que un intento de modelo produzca salida del asistente.

Para comprobar el modelo de sesión efectivo, inspeccione los registros de tiempo de ejecución y luego
use `openclaw sessions` o las superficies de sesión/estado del Gateway. Al depurar
las cargas útiles del proveedor, inicie el Gateway con `--raw-stream` y
`--raw-stream-path <path>`; esas banderas escriben eventos de flujo de modelo sin procesar en un archivo
l.

## Política de llamadas a herramientas

`before_tool_call` recibe:

- `event.toolName`
- `event.params`
- `event.toolKind` y `event.toolInputKind` opcionales, discriminadores con autoridad del host
  para herramientas que intencionalmente comparten nombres; por ejemplo, las llamadas
  `exec` en modo de código externo usan `toolKind: "code_mode_exec"` e
  incluyen `toolInputKind: "javascript" | "typescript"` cuando se conoce el idioma de entrada
- `event.derivedPaths` opcional, que contiene sugerencias de mejor esfuerzo de ruta de destino derivadas del host
  para contenedores de herramientas conocidas como `apply_patch`; cuando están presentes,
  estas rutas pueden estar incompletas o pueden sobrestimar lo que la herramienta
  realmente tocará (por ejemplo, con entradas malformadas o parciales)
- `event.runId` opcional
- `event.toolCallId` opcional
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

Comportamiento del guardia de enlace para enlaces de ciclo de vida tipados:

- `block: true` es terminal y omite los controladores de menor prioridad.
- `block: false` se trata como sin decisión.
- `params` reescribe los parámetros de la herramienta para la ejecución.
- `requireApproval` pausa la ejecución del agente y pregunta al usuario a través de aprobaciones
  de complemento. El comando `/approve` puede aprobar tanto las aprobaciones de exec como las de complemento.
  En los retransmisores `PreToolUse` nativos del modo de informe del servidor de aplicaciones Codex, esto se difiere
  a la solicitud de aprobación del servidor de aplicaciones coincidente; consulte [Codex harness runtime](/es/plugins/codex-harness-runtime#hook-boundaries).
- Un `block: true` de menor prioridad aún puede bloquear después de que un enlace de mayor prioridad
  solicitara aprobación.
- `onResolution` recibe la decisión de aprobación resuelta - `allow-once`,
  `allow-always`, `deny`, `timeout` o `cancelled`.

Consulte [Solicitudes de permisos de complementos](/es/plugins/plugin-permission-requests) para obtener información sobre el enrutamiento de aprobaciones, el comportamiento de decisión y cuándo usar `requireApproval` en lugar de herramientas opcionales o aprobaciones de ejecución.

Los complementos empaquetados que necesitan políticas a nivel de host pueden registrar políticas de herramientas de confianza con `api.registerTrustedToolPolicy(...)`. Estas se ejecutan antes que los enlaces `before_tool_call` ordinarios y antes que las decisiones de complementos externos. Úselos solo para puertas de confianza del host, como la política del espacio de trabajo, la aplicación del presupuesto o la seguridad de flujo de trabajo reservada. Los complementos externos deben usar los enlaces `before_tool_call` normales.

### Enlace de entorno de ejecución

`resolve_exec_env` permite a los complementos contribuir variables de entorno a las invocaciones de herramientas `exec` después de que se construye el entorno de ejecución base y antes de que se ejecute el comando. Recibe:

- `event.sessionKey`
- `event.toolName`, actualmente siempre `"exec"`
- `event.host`, uno de `"gateway"`, `"sandbox"` o `"node"`
- campos de contexto como `ctx.agentId`, `ctx.sessionKey`,
  `ctx.messageProvider` y `ctx.channelId`

Devuelva un `Record<string, string>` para fusionar en el entorno de ejecución. Los controladores
se ejecutan en orden de prioridad y los resultados de enlaces posteriores anulan los resultados de enlaces anteriores para
la misma clave.

La salida del enlace se filtra a través de la política de claves del entorno de ejecución del host antes de que
se fusione. Las claves no válidas, `PATH`, y las claves peligrosas de anulación del host, como
`LD_*`, `DYLD_*`, `NODE_OPTIONS`, las variables de proxy y las variables de anulación de TLS
se eliminan. El entorno de complemento filtrado se incluye en los metadatos de aprobación/auditoría
del gateway y se reenvía a las solicitudes de ejecución del nodo host.

### Persistencia del resultado de la herramienta

Los resultados de las herramientas pueden incluir `details` estructurados para la representación de la interfaz de usuario, el diagnóstico,
el enrutamiento de medios o los metadatos propiedad del complemento. Trate `details` como metadatos de tiempo de ejecución,
no como contenido del mensaje:

- OpenClaw elimina `toolResult.details` antes de la repetición del proveedor y la entrada de compactación para que los metadatos no se conviertan en contexto del modelo.
- Las entradas de sesión persistidas conservan solo `details` limitado. Los detalles excesivos se reemplazan con un resumen compacto y `persistedDetailsTruncated: true`.
- `tool_result_persist` y `before_message_write` se ejecutan antes del límite final de persistencia. Los hooks aún deben mantener el `details` devuelto pequeño y evitar colocar texto relevante para el prompt solo en `details`; coloque la salida de la herramienta visible para el modelo en `content`.

## Hooks de prompt y modelo

Use los hooks específicos de la fase para nuevos complementos:

- `before_model_resolve`: recibe solo el prompt actual y los metadatos de los archivos adjuntos. Devuelva `providerOverride` o `modelOverride`.
- `agent_turn_prepare`: recibe el prompt actual, los mensajes de sesión preparados y cualquier inyección en cola de una sola vez drenada para esta sesión. Devuelva `prependContext` o `appendContext`.
- `before_prompt_build`: recibe el prompt actual y los mensajes de sesión. Devuelva `prependContext`, `appendContext`, `systemPrompt`, `prependSystemContext` o `appendSystemContext`.
- `heartbeat_prompt_contribution`: se ejecuta solo para turnos de latido y devuelve `prependContext` o `appendContext`. Está destinado a monitores en segundo plano que necesitan resumir el estado actual sin cambiar los turnos iniciados por el usuario.

`before_agent_start` permanece por compatibilidad. Prefiera los hooks explícitos anteriores para que su complemento no dependa de una fase combinada heredada.

`before_agent_run` se ejecuta después de la construcción del mensaje y antes de cualquier entrada del modelo, incluyendo la carga de imágenes locales del mensaje y la observación de `llm_input`. Recibe la entrada actual del usuario como `prompt`, más el historial de sesión cargado en `messages` y el mensaje del sistema activo. Devuelva `{ outcome: "block", reason, message? }` para detener la ejecución antes de que el modelo pueda leer el mensaje. `reason` es interno; `message` es el reemplazo orientado al usuario. Los únicos resultados admitidos son `pass` y `block`; las formas de decisión no admitidas fallan de forma cerrada.

Cuando se bloquea una ejecución, OpenClaw almacena solo el texto de reemplazo en `message.content` más metadatos de bloqueo no sensibles, como el id del complemento de bloqueo y la marca de tiempo. El texto original del usuario no se conserva en la transcripción ni en el contexto futuro. Las razones de bloqueo interno se tratan como sensibles y se excluyen de las cargas de transcripción, historial, difusión, registro y diagnóstico. La observabilidad debe usar campos saneados, como el id del bloqueador, el resultado, la marca de tiempo o una categoría segura.

`before_agent_start` y `agent_end` incluyen `event.runId` cuando OpenClaw puede identificar la ejecución activa. El mismo valor también está disponible en `ctx.runId`. Las ejecuciones impulsadas por cron también exponen `ctx.jobId` (el id del trabajo cron de origen) para que los ganchos del complemento puedan limitar las métricas, los efectos secundarios o el estado a un trabajo programado específico.

Para las ejecuciones originadas en un canal, `ctx.messageProvider` es la superficie del proveedor, como `discord` o `telegram`, mientras que `ctx.channelId` es el identificador del objetivo de la conversación cuando OpenClaw puede derivar uno de la clave de sesión o los metadatos de entrega.

`agent_end` es un hook de observación. Las rutas de Gateway y del harness persistente lo ejecutan de forma fire-and-forget después del turno, mientras que las rutas CLI efímeras de un solo uso esperan a la promesa del hook antes de la limpieza del proceso para que los plugins de confianza puedan vaciar la observabilidad de la terminal o capturar el estado. El ejecutor de hooks aplica un tiempo de espera de 30 segundos para que un plugin bloqueado o un punto final de integración no pueda dejar la promesa del hook pendiente para siempre. Se registra un tiempo de espera y OpenClaw continúa; no cancela el trabajo de red propiedad del plugin a menos que el plugin también use su propia señal de aborto.

Use `model_call_started` y `model_call_ended` para la telemetría de llamadas al proveedor que no debe recibir indicaciones (prompts) sin procesar, historial, respuestas, encabezados, cuerpos de solicitud o IDs de solicitud del proveedor. Estos hooks incluyen metadatos estables como `runId`, `callId`, `provider`, `model`, `api`/`transport` opcionales, `durationMs`/`outcome` de terminal, y `upstreamRequestIdHash` cuando OpenClaw puede derivar un hash del ID de solicitud del proveedor limitado. Cuando el tiempo de ejecución ha resuelto los metadatos de la ventana de contexto, el evento del hook y el contexto también incluyen `contextTokenBudget`, el presupuesto efectivo de tokens después de los límites del modelo/configuración/agente, más `contextWindowSource` y `contextWindowReferenceTokens` cuando se aplicó un límite más bajo.

`before_agent_finalize` se ejecuta solo cuando un harness está a punto de aceptar una respuesta final natural del asistente. No es la ruta de cancelación de `/stop` y no se ejecuta cuando el usuario aborta un turno. Devuelva `{ action: "revise", reason }` para pedirle al harness un pase de modelo más antes de la finalización, `{ action: "finalize", reason? }` para forzar la finalización, u omita el resultado para continuar. Los hooks nativos de Codex `Stop` se retransmiten a este hook como decisiones de OpenClaw `before_agent_finalize`.

Al devolver `action: "revise"`, los plugins pueden incluir metadatos de `retry` para hacer que el pase de modelo adicional esté limitado y sea seguro para repetición:

```typescript
type BeforeAgentFinalizeRetry = {
  instruction: string;
  idempotencyKey?: string;
  maxAttempts?: number;
};
```

`instruction` se añade al motivo de la revisión enviado al arnés.
`idempotencyKey` permite al anfitrión contar los reintentos para la misma solicitud de complemento a través de
decisiones de finalización equivalentes, y `maxAttempts` limita cuántos pases adicionales permitirá
el anfitrión antes de continuar con la respuesta final natural.

Los complementos no agrupados que necesitan ganchos de conversación sin procesar (`before_model_resolve`,
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

Los ganchos de modificación de mensajes y las inyecciones persistentes del siguiente turno se pueden desactivar por complemento
con `plugins.entries.<id>.hooks.allowPromptInjection=false`.

### Extensiones de sesión e inyecciones del siguiente turno

Los complementos de flujo de trabajo pueden mantener un pequeño estado de sesión compatible con JSON con
`api.registerSessionExtension(...)` y actualizarlo a través del método de la puerta de enlace
`sessions.pluginPatch`. Las filas de sesión proyectan el estado de extensión registrado
a través de `pluginExtensions`, permitiendo que la interfaz de usuario de Control y otros clientes muestren
el estado propiedad del complemento sin conocer los detalles internos del complemento.

Use `api.enqueueNextTurnInjection(...)` cuando un complemento necesite un contexto duradero para
llegar al siguiente turno del modelo exactamente una vez. OpenClaw drena las inyecciones en cola antes de
los ganchos de mensajes, elimina las inyecciones caducadas y deduplica por `idempotencyKey`
por complemento. Este es el punto adecuado para reanudaciones de aprobación, resúmenes de políticas,
deltas del monitor en segundo plano y continuaciones de comandos que deben ser visibles para
el modelo en el siguiente turno pero no deben convertirse en texto permanente del mensaje del sistema.

La semántica de limpieza es parte del contrato. Las devoluciones de llamada de limpieza de extensiones de sesión y
del ciclo de vida de tiempo de ejecución reciben `reset`, `delete`, `disable`, o
`restart`. El anfitrión elimina el estado persistente de la extensión de sesión del complemento propietario
y las inyecciones pendientes del siguiente turno para restablecimiento/eliminación/deshabilitación; el reinicio mantiene
el estado duradero de la sesión mientras que las devoluciones de llamada de limpieza permiten que los complementos liberen trabajos
del programador, contexto de ejecución y otros recursos fuera de banda para la antigua generación
de tiempo de ejecución.

## Ganchos de mensaje

Use message hooks for channel-level routing and delivery policy:

- `message_received`: observe inbound content, sender, `threadId`, `messageId`,
  `senderId`, optional run/session correlation, and metadata.
- `message_sending`: rewrite `content` or return `{ cancel: true }`.
- `reply_payload_sending`: rewrite normalized `ReplyPayload` objects (including
  `presentation`, `delivery`, media refs, and text) or return `{ cancel: true }`.
- `message_sent`: observe final success or failure.

For audio-only TTS replies, `content` may contain the hidden spoken transcript
even when the channel payload has no visible text/caption. Rewriting that
`content` updates the hook-visible transcript only; it is not rendered as a
media caption.

Message hook contexts expose stable correlation fields when available:
`ctx.sessionKey`, `ctx.runId`, `ctx.messageId`, `ctx.senderId`, `ctx.trace`,
`ctx.traceId`, `ctx.spanId`, `ctx.parentSpanId`, and `ctx.callDepth`. Inbound
and `before_dispatch` contexts also expose reply metadata when the channel has
visibility-filtered quoted message data: `replyToId`, `replyToBody`, and
`replyToSender`. Prefer these first-class fields before reading legacy metadata.

Prefer typed `threadId` and `replyToId` fields before using channel-specific
metadata.

Decision rules:

- `message_sending` with `cancel: true` is terminal.
- `message_sending` with `cancel: false` is treated as no decision.
- Rewritten `content` continues to lower-priority hooks unless a later hook
  cancels delivery.
- `reply_payload_sending` se ejecuta después de la normalización de la carga útil y antes de la entrega del canal, incluidas las respuestas enrutadas de vuelta al canal de origen. Los controladores se ejecutan secuencialmente y cada controlador ve la carga útil más reciente producida por los controladores de mayor prioridad.
- Las cargas útiles de `reply_payload_sending` no exponen marcadores de confianza de tiempo de ejecución como `trustedLocalMedia`; los complementos pueden editar la forma de la carga útil, pero no pueden otorgar confianza de medios locales.
- `message_sending` puede devolver `cancelReason` y `metadata` delimitados con una cancelación. Las nuevas API del ciclo de vida de mensajes exponen esto como un resultado de entrega suprimido con el motivo `cancelled_by_message_sending_hook`; la entrega directa heredada sigue devolviendo una matriz de resultados vacía para compatibilidad.
- `message_sent` es solo de observación. Los fallos del controlador se registran y no cambian el resultado de la entrega.

## Ganchos de instalación

`before_install` se ejecuta después del escaneo integrado de instalaciones de habilidades y complementos. Devuelve hallazgos adicionales o `{ block: true, blockReason }` para detener la instalación.

`block: true` es terminal. `block: false` se trata como sin decisión.

## Ciclo de vida de Gateway

Use `gateway_start` para servicios de complementos que necesitan un estado propiedad de Gateway. El contexto expone `ctx.config`, `ctx.workspaceDir` y `ctx.getCron?.()` para la inspección y actualizaciones de cron. Use `gateway_stop` para limpiar recursos de larga duración.

No confíe en el gancho interno `gateway:startup` para servicios de tiempo de ejecución propiedad de complementos.

`cron_changed` se activa para eventos del ciclo de vida de cron propiedad de la puerta de enlace con una carga útil de evento tipificada que cubre `added`, `updated`, `removed`, `started`, `finished` y razones `scheduled`. El evento lleva una instantánea `PluginHookGatewayCronJob` (incluyendo `state.nextRunAtMs`, `state.lastRunStatus` y `state.lastError` cuando están presentes) además de un `PluginHookGatewayCronDeliveryStatus` de `not-requested` | `delivered` | `not-delivered` | `unknown`. Los eventos eliminados todavía transportan la instantánea del trabajo eliminado para que los programadores externos puedan conciliar el estado. Utilice `ctx.getCron?.()` y `ctx.config` del contexto de ejecución al sincronizar los programadores de activación externos, y mantenga a OpenClaw como la fuente de verdad para las comprobaciones de vencimiento y la ejecución.

## Próximas desaprobaciones

Algunas superficies adyacentes a los hooks están desaprobadas pero aún son compatibles. Migre antes del próximo lanzamiento principal:

- **Sobres de canal de texto sin formato** en los controladores `inbound_claim` y `message_received`. Lea `BodyForAgent` y los bloques de contexto de usuario estructurados en lugar de analizar el texto del sobre plano. Consulte [Sobres de canal de texto sin formato → BodyForAgent](/es/plugins/sdk-migration#active-deprecations).
- **`before_agent_start`** se mantiene por compatibilidad. Los nuevos complementos deben usar `before_model_resolve` y `before_prompt_build` en lugar de la fase combinada.
- **`subagent_spawning`** se mantiene por compatibilidad con complementos anteriores, pero los nuevos complementos no deben devolver el enrutamiento de hilos desde él. El núcleo prepara los enlaces de subagente `thread: true` a través de adaptadores de enlace de sesión de canal antes de que se dispare `subagent_spawned`.
- **`deactivate`** permanece como un alias de compatibilidad de limpieza desaprobado hasta después del 16-08-2026. Los nuevos complementos deben usar `gateway_stop`.
- **`onResolution` en `before_tool_call`** ahora usa la unión tipada `PluginApprovalResolution` (`allow-once` / `allow-always` / `deny` /
  `timeout` / `cancelled`) en lugar de un `string` de forma libre.

Para obtener la lista completa —registro de capacidades de memoria, perfil de pensamiento del proveedor, proveedores de autenticación externos, tipos de descubrimiento de proveedores, accesores de tiempo de ejecución de tareas y el cambio de nombre de `command-auth` → `command-status`— consulte
[Plugin SDK migration → Active deprecations](/es/plugins/sdk-migration#active-deprecations).

## Relacionado

- [Plugin SDK migration](/es/plugins/sdk-migration) - depreciaciones activas y cronograma de eliminación
- [Building plugins](/es/plugins/building-plugins)
- [Plugin SDK overview](/es/plugins/sdk-overview)
- [Plugin entry points](/es/plugins/sdk-entrypoints)
- [Internal hooks](/es/automation/hooks)
- [Plugin architecture internals](/es/plugins/architecture-internals)
