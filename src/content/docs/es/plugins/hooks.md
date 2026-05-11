---
summary: "Ganchos de complementos: interceptar eventos del ciclo de vida del agente, herramienta, mensaje, sesión y Gateway"
title: "Ganchos de complementos"
read_when:
  - You are building a plugin that needs before_tool_call, before_agent_reply, message hooks, or lifecycle hooks
  - You need to block, rewrite, or require approval for tool calls from a plugin
  - You are deciding between internal hooks and plugin hooks
---

Los ganchos de complementos son puntos de extensión en proceso para los complementos de OpenClaw. Úselos
cuando un complemento necesite inspeccionar o cambiar ejecuciones de agentes, llamadas a herramientas, flujo de mensajes,
ciclo de vida de la sesión, enrutamiento de subagentes, instalaciones o el inicio de Gateway.

Use [ganchos internos](/es/automation/hooks) en su lugar cuando desee un pequeño
script `HOOK.md` instalado por el operador para eventos de comando y Gateway, tales como
`/new`, `/reset`, `/stop`, `agent:bootstrap`, o `gateway:startup`.

## Inicio rápido

Registre ganchos de complementos tipados con `api.on(...)` desde la entrada de su complemento:

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

Los manejadores de ganchos se ejecutan secuencialmente en orden descendente de `priority`. Los ganchos de la misma prioridad
mantienen el orden de registro.

## Catálogo de ganchos

Los ganchos se agrupan por la superficie que extienden. Los nombres en **negrita** aceptan un
resultado de decisión (bloquear, cancelar, anular o requerir aprobación); todos los demás son
solo de observación.

**Turno del agente**

- `before_model_resolve` — anular el proveedor o el modelo antes de cargar los mensajes de la sesión
- `before_prompt_build` — agregar contexto dinámico o texto del sistema del prompt antes de la llamada al modelo
- `before_agent_start` — fase combinada solo para compatibilidad; prefiera los dos ganchos anteriores
- **`before_agent_reply`** — cortocircuitar el turno del modelo con una respuesta sintética o silencio
- **`before_agent_finalize`** — inspeccionar la respuesta final natural y solicitar una pasada más del modelo
- `agent_end` — observar los mensajes finales, el estado de éxito y la duración de la ejecución

**Observación de conversación**

- `model_call_started` / `model_call_ended` — observar metadatos de llamadas al proveedor/modelo saneados, cronometría, resultado y hashes de ID de solicitud delimitados sin contenido de prompt o respuesta
- `llm_input` — observar la entrada del proveedor (prompt del sistema, prompt, historial)
- `llm_output` — observar la salida del proveedor

**Herramientas**

- **`before_tool_call`** — reescribir los parámetros de la herramienta, bloquear la ejecución o requerir aprobación
- `after_tool_call` — observar los resultados de la herramienta, los errores y la duración
- **`tool_result_persist`** — reescribir el mensaje del asistente producido a partir de un resultado de la herramienta
- **`before_message_write`** — inspeccionar o bloquear una escritura de mensaje en curso (poco común)

**Mensajes y entrega**

- **`inbound_claim`** — reclamar un mensaje entrante antes del enrutamiento del agente (respuestas sintéticas)
- `message_received` — observar el contenido entrante, el remitente, el hilo y los metadatos
- **`message_sending`** — reescribir el contenido saliente o cancelar la entrega
- `message_sent` — observar el éxito o el fracaso de la entrega saliente
- **`before_dispatch`** — inspeccionar o reescribir un envío saliente antes de la transferencia al canal
- **`reply_dispatch`** — participar en la canalización final de envío de respuestas

**Sesiones y compactación**

- `session_start` / `session_end` — realizar un seguimiento de los límites del ciclo de vida de la sesión
- `before_compaction` / `after_compaction` — observar o anotar los ciclos de compactación
- `before_reset` — observar eventos de restablecimiento de sesión (`/reset`, restablecimientos programáticos)

**Subagentes**

- `subagent_spawning` / `subagent_delivery_target` / `subagent_spawned` / `subagent_ended` — coordinar el enrutamiento de subagentes y la entrega de finalización

**Ciclo de vida**

- `gateway_start` / `gateway_stop` — iniciar o detener servicios propiedad del complemento con el Gateway
- **`before_install`** — inspeccionar los escaneos de instalación de habilidades o complementos y, opcionalmente, bloquearlos

## Política de llamadas a herramientas

`before_tool_call` recibe:

- `event.toolName`
- `event.params`
- opcional `event.runId`
- opcional `event.toolCallId`
- campos de contexto como `ctx.agentId`, `ctx.sessionKey`, `ctx.sessionId`,
  `ctx.runId`, `ctx.jobId` (establecidos en ejecuciones impulsadas por cron) y `ctx.trace` de diagnóstico

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
- `requireApproval` pausa la ejecución del agente y solicita al usuario a través de
  aprobaciones del complemento. El comando `/approve` puede aprobar tanto las aprobaciones de ejecución como las del complemento.
- Un `block: true` de menor prioridad aún puede bloquear después de que un enlace de mayor prioridad
  haya solicitado aprobación.
- `onResolution` recibe la decisión de aprobación resuelta — `allow-once`,
  `allow-always`, `deny`, `timeout` o `cancelled`.

### Persistencia del resultado de la herramienta

Los resultados de las herramientas pueden incluir `details` estructurados para la representación de la interfaz de usuario, diagnóstico,
enrutamiento de medios o metadatos propiedad del complemento. Trate `details` como metadatos en tiempo de ejecución,
no como contenido del prompt:

- OpenClaw elimina `toolResult.details` antes de la repetición del proveedor y la entrada de compactación
  para que los metadatos no se conviertan en contexto del modelo.
- Las entradas de sesión persistidas conservan solo `details` limitados. Los detalles excesivos se
  reemplazan con un resumen compacto y `persistedDetailsTruncated: true`.
- `tool_result_persist` y `before_message_write` se ejecutan antes del límite final
  de persistencia. Los enlaces aún deben mantener el `details` devuelto pequeño y evitar
  colocar texto relevante para el prompt solo en `details`; ponga la salida de la herramienta visible para el modelo
  en `content`.

## Ganchos de prompt y modelo

Utilice los ganchos específicos de la fase para nuevos complementos:

- `before_model_resolve`: recibe solo el prompt actual y los metadatos de
  los archivos adjuntos. Devuelva `providerOverride` o `modelOverride`.
- `before_prompt_build`: recibe el mensaje actual y los mensajes de la sesión.
  Devuelve `prependContext`, `systemPrompt`, `prependSystemContext` o
  `appendSystemContext`.

`before_agent_start` se mantiene por compatibilidad. Prefiere los ganchos explícitos anteriores
para que tu complemento no dependa de una fase combinada heredada.

`before_agent_start` y `agent_end` incluyen `event.runId` cuando OpenClaw puede
identificar la ejecución activa. El mismo valor también está disponible en `ctx.runId`.
Las ejecuciones impulsadas por cron también exponen `ctx.jobId` (el id del trabajo cron de origen) para que
los ganchos del complemento puedan limitar métricas, efectos secundarios o estado a un trabajo
programado específico.

Usa `model_call_started` y `model_call_ended` para la telemetría de llamadas al proveedor
que no debe recibir mensajes sin formato, historial, respuestas, encabezados, cuerpos de
solicitud o IDs de solicitud del proveedor. Estos ganchos incluyen metadatos estables como
`runId`, `callId`, `provider`, `model`, opcional `api`/`transport`, terminal
`durationMs`/`outcome`, y `upstreamRequestIdHash` cuando OpenClaw puede derivar un
hash del ID de solicitud del proveedor limitado.

`before_agent_finalize` se ejecuta solo cuando un arnés está a punto de aceptar una respuesta
final natural del asistente. No es la ruta de cancelación de `/stop` y no se
ejecuta cuando el usuario aborta un turno. Devuelve `{ action: "revise", reason }` para pedir
al arnés un pase más del modelo antes de la finalización, `{ action:
"finalize", reason? }` para forzar la finalización, u omite un resultado para continuar.
Los ganchos nativos de `Stop` de Codex se retransmiten a este gancho como decisiones de OpenClaw
`before_agent_finalize`.

Los complementos no agrupados que necesitan `llm_input`, `llm_output`,
`before_agent_finalize`, o `agent_end` deben establecer:

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

Los ganchos de modificación de mensajes se pueden deshabilitar por complemento con
`plugins.entries.<id>.hooks.allowPromptInjection=false`.

## Ganchos de mensajes

Use los ganchos de mensajes para el enrutamiento a nivel de canal y la política de entrega:

- `message_received`: observe el contenido entrante, el remitente, `threadId`, `messageId`,
  `senderId`, la correlación opcional de ejecución/sesión y los metadatos.
- `message_sending`: reescriba `content` o devuelva `{ cancel: true }`.
- `message_sent`: observe el éxito o el fracaso final.

Para las respuestas de TTS solo de audio, `content` puede contener la transcripción hablada oculta
e incluso cuando la carga útil del canal no tenga texto/subtítulo visible. Reescribir ese
`content` actualiza solo la transcripción visible por el gancho; no se representa como un
subtítulo de medios.

Los contextos de los ganchos de mensajes exponen campos de correlación estables cuando están disponibles:
`ctx.sessionKey`, `ctx.runId`, `ctx.messageId`, `ctx.senderId`, `ctx.trace`,
`ctx.traceId`, `ctx.spanId`, `ctx.parentSpanId` y `ctx.callDepth`. Prefiera
estos campos de primera clase antes de leer los metadatos heredados.

Prefiera los campos tipados `threadId` y `replyToId` antes de usar metadatos
c específicos del canal.

Reglas de decisión:

- `message_sending` con `cancel: true` es terminal.
- `message_sending` con `cancel: false` se trata como sin decisión.
- El `content` reescrito continúa a los ganchos de menor prioridad a menos que un gancho posterior
  cancele la entrega.

## Instalar ganchos

`before_install` se ejecuta después del escaneo integrado de instalaciones de habilidades y complementos.
Devuelva hallazgos adicionales o `{ block: true, blockReason }` para detener la
instalación.

`block: true` es terminal. `block: false` se trata como sin decisión.

## Ciclo de vida de Gateway

Use `gateway_start` para servicios de complementos que necesitan un estado propiedad del Gateway. El
contexto expone `ctx.config`, `ctx.workspaceDir` y `ctx.getCron?.()` para
la inspección y actualizaciones de cron. Use `gateway_stop` para limpiar recursos
de larga ejecución.

No confíe en el enlace interno `gateway:startup` para servicios de
tiempo de ejecución propiedad del complemento.

## Próximas obsolescencias

Algunas superficies adyacentes a los enlaces están obsoletas pero aún son compatibles. Migrar
antes de la próxima versión mayor:

- **Sobres de canal de texto plano** en `inbound_claim` y `message_received`
  controladores. Lea `BodyForAgent` y los bloques de contexto de usuario estructurados
  en lugar de analizar el texto de sobre plano. Vea
  [Sobres de canal de texto plano → BodyForAgent](/es/plugins/sdk-migration#active-deprecations).
- **`before_agent_start`** permanece por compatibilidad. Los nuevos complementos deben usar
  `before_model_resolve` y `before_prompt_build` en lugar de la fase
  combinada.
- **`onResolution` en `before_tool_call`** ahora usa la unión tipificada
  `PluginApprovalResolution` (`allow-once` / `allow-always` / `deny` /
  `timeout` / `cancelled`) en lugar de un `string` de forma libre.

Para la lista completa — registro de capacidades de memoria, perfil de pensamiento del
proveedor, proveedores de autenticación externos, tipos de descubrimiento de proveedores, accesores de
tiempo de ejecución de tareas y el cambio de nombre de `command-auth` → `command-status` — vea
[Migración del SDK de complementos → Obsolescencias activas](/es/plugins/sdk-migration#active-deprecations).

## Relacionado

- [Migración del SDK de complementos](/es/plugins/sdk-migration) — obsolescencias activas y cronograma de eliminación
- [Construcción de complementos](/es/plugins/building-plugins)
- [Descripción general del SDK de complementos](/es/plugins/sdk-overview)
- [Puntos de entrada de complementos](/es/plugins/sdk-entrypoints)
- [Enlaces internos](/es/automation/hooks)
- [Interno de la arquitectura de complementos](/es/plugins/architecture-internals)
