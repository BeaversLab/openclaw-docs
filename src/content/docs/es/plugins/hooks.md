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

Use [internal hooks](/es/automation/hooks) en su lugar cuando desee un script `HOOK.md` pequeño instalado por el operador para eventos de comandos y Gateway, como `/new`, `/reset`, `/stop`, `agent:bootstrap` o `gateway:startup`.

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
- `message_received` - observar el contenido entrante, el remitente, el hilo y los metadatos
- **`message_sending`** - reescribir el contenido saliente o cancelar la entrega
- `message_sent` - observar el éxito o el fracaso de la entrega saliente
- **`before_dispatch`** - inspeccionar o reescribir un envío saliente antes de la transferencia del canal
- **`reply_dispatch`** - participar en la canalización final de envío de respuestas

**Sesiones y compactación**

- `session_start` / `session_end` - rastrea los límites del ciclo de vida de la sesión. El `reason` del evento es uno de `new`, `reset`, `idle`, `daily`, `compaction`, `deleted`, `shutdown`, `restart` o `unknown`. Los valores `shutdown` y `restart` se disparan desde el finalizador de apagado de la puerta de enlace (gateway) cuando el proceso se detiene o reinicia mientras las sesiones aún están activas, para que los complementos (plugins) posteriores (como los de memoria o almacenamiento de transcripciones) puedan finalizar las filas fantasma que de otro modo quedarían en un estado abierto tras los reinicios. El finalizador tiene un límite de tiempo, por lo que un complemento lento no puede bloquear SIGTERM/SIGINT.
- `before_compaction` / `after_compaction` - observar o anotar ciclos de compactación
- `before_reset` - observar eventos de restablecimiento de sesión (`/reset`, restablecimientos programáticos)

**Subagentes**

- `subagent_spawning` / `subagent_delivery_target` / `subagent_spawned` / `subagent_ended` - coordinar el enrutamiento de subagentes y la entrega de finalización

**Ciclo de vida**

- `gateway_start` / `gateway_stop` - iniciar o detener servicios propiedad del complemento con la puerta de enlace (Gateway)
- `deactivate` - alias de compatibilidad en desuso para `gateway_stop`; use `gateway_stop` en nuevos complementos
- `cron_changed` - observar cambios en el ciclo de vida del cron propiedad de la puerta de enlace (agregado, actualizado, eliminado, iniciado, finalizado, programado)
- **`before_install`** - inspeccionar escaneos de instalación de habilidades (skills) o complementos y bloquearlos opcionalmente

## Depurar hooks en tiempo de ejecución

Use `before_model_resolve` cuando un complemento necesite cambiar el proveedor o el modelo
para un turno de agente. Se ejecuta antes de la resolución del modelo; `llm_output` solo se ejecuta después
de que un intento de modelo produce una salida del asistente.

Para verificar el modelo de sesión efectivo, inspeccione los registros en tiempo de ejecución y luego
use `openclaw sessions` o las superficies de sesión/estado del Gateway. Al depurar
cargas útiles del proveedor, inicie el Gateway con `--raw-stream` y
`--raw-stream-path <path>`; esos indicadores escriben eventos de flujo de modelo sin procesar en un archivo
l.

## Política de llamadas a herramientas

`before_tool_call` recibe:

- `event.toolName`
- `event.params`
- opcional `event.derivedPaths`, que contiene sugerencias de ruta de destino derivadas del host
  con el mejor esfuerzo para envoltorios de herramientas conocidas como `apply_patch`; cuando están presentes,
  estas rutas pueden estar incompletas o pueden sobrestimar lo que la herramienta
  realmente tocará (por ejemplo, con entradas malformadas o parciales)
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

Comportamiento del guardia del enlace (hook) para enlaces de ciclo de vida tipados:

- `block: true` es terminal y omite los controladores de menor prioridad.
- `block: false` se trata como sin decisión.
- `params` reescribe los parámetros de la herramienta para la ejecución.
- `requireApproval` pausa la ejecución del agente y pregunta al usuario a través de
  aprobaciones del complemento. El comando `/approve` puede aprobar tanto las aprobaciones de ejecución como las del complemento.
- Un `block: true` de menor prioridad aún puede bloquear después de que un enlace
  de mayor prioridad haya solicitado aprobación.
- `onResolution` recibe la decisión de aprobación resuelta - `allow-once`,
  `allow-always`, `deny`, `timeout` o `cancelled`.

Los complementos agrupados que necesitan políticas a nivel de host pueden registrar políticas de herramientas confiables
con `api.registerTrustedToolPolicy(...)`. Estos se ejecutan antes que los hooks ordinarios
`before_tool_call` y antes de las decisiones de complementos externos. Úselos solo
para puertas de confianza del host, como la política del espacio de trabajo, la aplicación del presupuesto o
la seguridad del flujo de trabajo reservado. Los complementos externos deben usar los hooks normales `before_tool_call`.

### Persistencia del resultado de la herramienta

Los resultados de las herramientas pueden incluir `details` estructurados para la representación de la interfaz de usuario, diagnósticos,
enrutamiento de medios o metadatos propiedad del complemento. Trate `details` como metadatos de tiempo de ejecución,
no como contenido del aviso:

- OpenClaw elimina `toolResult.details` antes de la repetición del proveedor y la entrada de compactación
  para que los metadatos no se conviertan en contexto del modelo.
- Las entradas de sesión persistidas mantienen solo `details` limitados. Los detalles excesivos se
  reemplazan con un resumen compacto y `persistedDetailsTruncated: true`.
- `tool_result_persist` y `before_message_write` se ejecutan antes del límite
  de persistencia final. Los hooks aún deben mantener los `details` devueltos pequeños y evitar
  colocar texto relevante para el aviso solo en `details`; coloque la salida de la herramienta visible para el modelo
  en `content`.

## Hooks de aviso y modelo

Use los hooks específicos de la fase para nuevos complementos:

- `before_model_resolve`: recibe solo el aviso actual y los metadatos del
  adjunto. Devuelva `providerOverride` o `modelOverride`.
- `agent_turn_prepare`: recibe el aviso actual, los mensajes de sesión preparados
  y cualquier inyección en cola de exactamente una vez drenada para esta sesión. Devuelva
  `prependContext` o `appendContext`.
- `before_prompt_build`: recibe el aviso actual y los mensajes de sesión.
  Devuelva `prependContext`, `appendContext`, `systemPrompt`,
  `prependSystemContext` o `appendSystemContext`.
- `heartbeat_prompt_contribution`: se ejecuta solo para turnos de latido y devuelve
  `prependContext` o `appendContext`. Está diseñado para monitores en segundo plano
  que necesitan resumir el estado actual sin cambiar los turnos iniciados por el usuario.

`before_agent_start` permanece por compatibilidad. Prefiera los hooks explícitos anteriores
para que su complemento no dependa de una fase combinada heredada.

`before_agent_run` se ejecuta después de la construcción del mensaje y antes de cualquier entrada del modelo,
incluida la carga de imágenes locales del mensaje y la observación `llm_input`. Recibe
la entrada actual del usuario como `prompt`, más el historial de sesión cargado en `messages`
y el mensaje del sistema activo. Devuelva `{ outcome: "block", reason, message? }`
para detener la ejecución antes de que el modelo pueda leer el mensaje. `reason` es interno;
`message` es el reemplazo orientado al usuario. Los únicos resultados admitidos son
`pass` y `block`; las formas de decisión no admitidas fallan cerradas.

Cuando se bloquea una ejecución, OpenClaw almacena solo el texto de reemplazo en
`message.content` más metadatos de bloqueo no sensibles, como el ID del complemento de bloqueo
y la marca de tiempo. El texto original del usuario no se retiene en la transcripción ni en el contexto
futuro. Las razones internas del bloqueo se tratan como sensibles y se excluyen de
las cargas útiles de transcripción, historial, difusión, registro y diagnóstico. La observabilidad
debe utilizar campos sanitizados, como el ID del bloqueador, el resultado, la marca de tiempo o una categoría
segura.

`before_agent_start` y `agent_end` incluyen `event.runId` cuando OpenClaw puede
identificar la ejecución activa. El mismo valor también está disponible en `ctx.runId`.
Las ejecuciones impulsadas por cron también exponen `ctx.jobId` (el ID del trabajo cron de origen) para que
los hooks del complemento puedan delimitar métricas, efectos secundarios o estado a un trabajo
programado específico.

Para las ejecuciones originadas en el canal, `ctx.messageProvider` es la superficie del proveedor, como `discord` o `telegram`, mientras que `ctx.channelId` es el identificador de objetivo de la conversación cuando OpenClaw puede derivar uno de la clave de sesión o los metadatos de entrega.

`agent_end` es un hook de observación y se ejecuta de forma asíncrona (fire-and-forget) después del turno. El ejecutor de hooks aplica un tiempo de espera de 30 segundos para que un complemento bloqueado o un punto de conexión de incrustación no pueda dejar la promesa del hook pendiente para siempre. Se registra un tiempo de espera y OpenClaw continúa; no cancela el trabajo de red propiedad del complemento a menos que el complemento también use su propia señal de aborto.

Use `model_call_started` y `model_call_ended` para la telemetría de llamadas al proveedor que no debe recibir avisos sin procesar, historial, respuestas, encabezados, cuerpos de solicitud o ID de solicitud del proveedor. Estos hooks incluyen metadatos estables como `runId`, `callId`, `provider`, `model`, `api`/`transport` opcional, `durationMs`/`outcome` terminal, y `upstreamRequestIdHash` cuando OpenClaw puede derivar un hash de ID de solicitud del proveedor limitado. Cuando el tiempo de ejecución ha resuelto los metadatos de la ventana de contexto, el evento del hook y el contexto también incluyen `contextTokenBudget`, el presupuesto de tokens efectivo después de los límites del modelo/configuración/agente, más `contextWindowSource` y `contextWindowReferenceTokens` cuando se aplicó un límite inferior.

`before_agent_finalize` se ejecuta solo cuando un arnés está a punto de aceptar una respuesta final natural del asistente. No es la ruta de cancelación de `/stop` y no se ejecuta cuando el usuario aborta un turno. Devuelva `{ action: "revise", reason }` para pedir al arnés otro paso del modelo antes de la finalización, `{ action: "finalize", reason? }` para forzar la finalización, u omita un resultado para continuar. Los hooks nativos de Codex `Stop` se retransmiten a este hook como decisiones de OpenClaw `before_agent_finalize`.

Al devolver `action: "revise"`, los complementos pueden incluir metadatos `retry` para hacer
que el paso adicional del modelo sea limitado y seguro para la repetición:

```typescript
type BeforeAgentFinalizeRetry = {
  instruction: string;
  idempotencyKey?: string;
  maxAttempts?: number;
};
```

`instruction` se agrega al motivo de la revisión enviada al arnés.
`idempotencyKey` permite al host contar los reintentos para la misma solicitud de complemento a través de
decisiones de finalización equivalentes, y `maxAttempts` limita cuántos pasos adicionales permitirá
el host antes de continuar con la respuesta final natural.

Los complementos no empaquetados que necesiten enlaces de conversación sin procesar (`before_model_resolve`,
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

Los enlaces de modificación de mensajes (prompt) y las inyecciones duraderas del siguiente turno se pueden desactivar por complemento
con `plugins.entries.<id>.hooks.allowPromptInjection=false`.

### Extensiones de sesión e inyecciones del siguiente turno

Los complementos de flujo de trabajo pueden mantener un pequeño estado de sesión compatible con JSON con
`api.registerSessionExtension(...)` y actualizarlo a través del método de Gateway
`sessions.pluginPatch`. Las filas de sesión proyectan el estado de extensión registrado
a través de `pluginExtensions`, lo que permite a la interfaz de usuario de Control y otros clientes renderizar
el estado propiedad del complemento sin conocer los aspectos internos del mismo.

Use `api.enqueueNextTurnInjection(...)` cuando un complemento necesite un contexto duradero para
alcanzar exactamente una vez el siguiente turno del modelo. OpenClaw drena las inyecciones en cola antes de
los enlaces de mensajes, elimina las inyecciones caducadas y deduplica por `idempotencyKey`
por complemento. Este es el punto adecuado para reanudaciones de aprobación, resúmenes de políticas,
deltas de monitores en segundo plano y continuaciones de comandos que deben ser visibles para
el modelo en el siguiente turno pero que no deben convertirse en texto de mensaje del sistema permanente.

La semántica de limpieza es parte del contrato. Las devoluciones de llamada de limpieza de extensión de sesión y de limpieza del ciclo de vida de ejecución reciben `reset`, `delete`, `disable` o `restart`. El host elimina el estado de extensión de sesión persistente del complemento propietario y las inyecciones de siguiente turno pendientes para restablecimiento/eliminación/deshabilitación; el reinicio mantiene el estado de sesión duradero mientras que las devoluciones de llamada de limpieza permiten que los complementos liberen trabajos del programador, contexto de ejecución y otros recursos fuera de banda para la generación de ejecución anterior.

## Ganchos de mensajes

Use los ganchos de mensajes para el enrutamiento a nivel de canal y la política de entrega:

- `message_received`: observe el contenido entrante, el remitente, `threadId`, `messageId`, `senderId`, la correlación opcional de ejecución/sesión y los metadatos.
- `message_sending`: reescriba `content` o devuelva `{ cancel: true }`.
- `message_sent`: observe el éxito o el fracaso final.

Para las respuestas de TTS solo de audio, `content` puede contener la transcripción hablada oculta incluso cuando la carga útil del canal no tiene texto/subtítulo visible. Reescribir ese `content` actualiza solo la transcripción visible para el gancho; no se procesa como un subtítulo de medio.

Los contextos de los ganchos de mensajes exponen campos de correlación estables cuando están disponibles: `ctx.sessionKey`, `ctx.runId`, `ctx.messageId`, `ctx.senderId`, `ctx.trace`, `ctx.traceId`, `ctx.spanId`, `ctx.parentSpanId` y `ctx.callDepth`. Prefiera estos campos de primera clase antes de leer los metadatos heredados.

Prefiera los campos tipados `threadId` y `replyToId` antes de usar metadatos específicos del canal.

Reglas de decisión:

- `message_sending` con `cancel: true` es terminal.
- `message_sending` con `cancel: false` se trata como sin decisión.
- El `content` reescrito continúa con los hooks de menor prioridad a menos que un hook posterior
  cancele la entrega.
- `message_sending` puede devolver `cancelReason` y `metadata` delimitados con una
  cancelación. Las nuevas API del ciclo de vida de mensajes exponen esto como un resultado de entrega
  suprimido con el motivo `cancelled_by_message_sending_hook`; la entrega directa
  heredada sigue devolviendo un array de resultados vacío por compatibilidad.
- `message_sent` es solo de observación. Los fallos del manejador se registran y no
  cambian el resultado de la entrega.

## Hooks de instalación

`before_install` se ejecuta después del escaneo integrado de instalaciones de habilidades y plugins.
Devuelve hallazgos adicionales o `{ block: true, blockReason }` para detener la
instalación.

`block: true` es terminal. `block: false` se trata como sin decisión.

## Ciclo de vida del Gateway

Use `gateway_start` para servicios de plugin que necesiten estado propiedad del Gateway. El
contexto expone `ctx.config`, `ctx.workspaceDir` y `ctx.getCron?.()` para
la inspección y actualizaciones de cron. Use `gateway_stop` para limpiar recursos
de larga duración.

No confíe en el hook interno `gateway:startup` para servicios de tiempo de ejecución
propiedad del plugin.

`cron_changed` se dispara para eventos del ciclo de vida de cron propiedad de la gateway con una carga útil de evento tipificada que cubre las razones `added`, `updated`, `removed`, `started`, `finished`
y `scheduled`. El evento lleva una instantánea `PluginHookGatewayCronJob`
(incluyendo `state.nextRunAtMs`, `state.lastRunStatus` y
`state.lastError` cuando están presentes) además de un `PluginHookGatewayCronDeliveryStatus`
de `not-requested` | `delivered` | `not-delivered` | `unknown`. Los eventos
de eliminación aún llevan la instantánea del trabajo eliminado para que los programadores externos puedan
conciliar el estado. Utilice `ctx.getCron?.()` y `ctx.config` del contexto de
ejecución al sincronizar los programadores de activación externos, y mantenga a OpenClaw como la
fuente de verdad para las verificaciones de vencimiento y la ejecución.

## Próximas depreciaciones

Algunas superficies adyacentes a los hooks están depreciadas pero aún son compatibles. Migre
antes de la próxima versión principal:

- **Sobres de canal de texto plano** en los manejadores `inbound_claim` y `message_received`
  . Lea `BodyForAgent` y los bloques de contexto de usuario estructurados
  en lugar de analizar el texto plano del sobre. Véase
  [Sobres de canal de texto plano → BodyForAgent](/es/plugins/sdk-migration#active-deprecations).
- **`before_agent_start`** permanece por compatibilidad. Los nuevos plugins deben usar
  `before_model_resolve` y `before_prompt_build` en lugar de la fase
  combinada.
- **`deactivate`** permanece como un alias de compatibilidad de limpieza depreciado hasta
  después del 16-08-2026. Los nuevos plugins deben usar `gateway_stop`.
- **`onResolution` en `before_tool_call`** ahora usa la unión tipificada
  `PluginApprovalResolution` (`allow-once` / `allow-always` / `deny` /
  `timeout` / `cancelled`) en lugar de un `string` de forma libre.

Para la lista completa: registro de capacidades de memoria, perfil de pensamiento del proveedor, proveedores de autenticación externos, tipos de descubrimiento de proveedores, accesores del tiempo de ejecución de tareas y el cambio de nombre de `command-auth` → `command-status`, consulte [Migración del SDK de complementos → Deprecaciones activas](/es/plugins/sdk-migration#active-deprecations).

## Relacionado

- [Migración del SDK de complementos](/es/plugins/sdk-migration) - deprecaciones activas y cronograma de eliminación
- [Construcción de complementos](/es/plugins/building-plugins)
- [Descripción general del SDK de complementos](/es/plugins/sdk-overview)
- [Puntos de entrada del complemento](/es/plugins/sdk-entrypoints)
- [Ganchos internos](/es/automation/hooks)
- [Aspectos internos de la arquitectura de complementos](/es/plugins/architecture-internals)
