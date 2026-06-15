---
summary: "Migrar desde la capa de compatibilidad con versiones anteriores heredada hasta el SDK de plugin moderno"
title: "Migración del SDK de plugins"
sidebarTitle: "Migrar al SDK"
read_when:
  - You see the OPENCLAW_PLUGIN_SDK_COMPAT_DEPRECATED warning
  - You see the OPENCLAW_EXTENSION_API_DEPRECATED warning
  - You used api.registerEmbeddedExtensionFactory before OpenClaw 2026.4.25
  - You are updating a plugin to the modern plugin architecture
  - You maintain an external OpenClaw plugin
---

OpenClaw ha pasado de una amplia capa de compatibilidad con versiones anteriores a una arquitectura de plugins moderna con importaciones centradas y documentadas. Si su plugin se construyó antes de la nueva arquitectura, esta guía le ayuda a migrar.

## Qué está cambiando

El antiguo sistema de plugins proporcionaba dos superficies muy abiertas que permitían a los plugins importar cualquier cosa que necesitaran desde un único punto de entrada:

- **`openclaw/plugin-sdk/compat`** - una única importación que volvía a exportar docenas de
  asistentes. Se introdujo para mantener funcionando los plugins antiguos basados en hooks mientras se
  construía la nueva arquitectura de plugins.
- **`openclaw/plugin-sdk/infra-runtime`** - un barril amplio de asistentes de tiempo de ejecución que
  mezclaba eventos del sistema, estado de latido, colas de entrega, asistentes de recuperación/proxy,
  asistentes de archivos, tipos de aprobación y utilidades no relacionadas.
- **`openclaw/plugin-sdk/config-runtime`** - un barril amplio de compatibilidad de configuración
  que todavía contiene asistentes de carga/escritura directos obsoletos durante la ventana de
  migración.
- **`openclaw/extension-api`** - un puente que daba a los plugins acceso directo a
  asistentes del lado del host, como el ejecutor de agentes integrados.
- **`api.registerEmbeddedExtensionFactory(...)`** - un hook de extensión empaquetado solo para ejecutor integrado eliminado que podía observar eventos del ejecutor integrados como
  `tool_result`.

Las superficies de importación amplias ahora están **obsoletas**. Siguen funcionando en tiempo de ejecución,
pero los nuevos complementos no deben usarlas, y los complementos existentes deben migrar antes
que la próxima versión mayor las elimine. La API de registro de fábrica de extensiones solo para ejecutor integrado
se ha eliminado; use middleware de resultados de herramientas en su lugar.

OpenClaw no elimina ni reinterpreta el comportamiento documentado de los complementos en el mismo
cambio que introduce un reemplazo. Los cambios de ruptura de contrato primero deben pasar
por un adaptador de compatibilidad, diagnósticos, documentación y una ventana de obsolescencia.
Eso se aplica a las importaciones del SDK, campos de manifiesto, API de configuración, hooks y comportamiento
de registro en tiempo de ejecución.

<Warning>La capa de compatibilidad hacia atrás se eliminará en una versión mayor futura. Los complementos que todavía importen de estas superfices dejarán de funcionar cuando eso suceda. Los registros de fábrica de extensiones integradas heredados ya no se cargan.</Warning>

## Por qué esto cambió

El enfoque antiguo causaba problemas:

- **Inicio lento** - importar un asistente cargaba docenas de módulos no relacionados
- **Dependencias circulares** - las reexportaciones amplias facilitaban la creación de ciclos de importación
- **Superficie de API poco clara**: no hay forma de saber qué exportaciones eran estables frente a las internas

El SDK moderno de plugins soluciona esto: cada ruta de importación (`openclaw/plugin-sdk/\<subpath\>`)
es un módulo pequeño y autónomo con un propósito claro y un contrato documentado.

Las costuras de conveniencia del proveedor heredadas para canales empaquetados también han desaparecido.
Las costuras de asistentes con marca de canal eran accesos directos privados de mono-repositorio, no contratos de
plugins estables. Utilice en su lugar subrutas genéricas y estrechas del SDK. Dentro del espacio de trabajo
del plugin empaquetado, mantenga los asistentes propiedad del proveedor en su propio `api.ts` o
`runtime-api.ts` de ese plugin.

Ejemplos actuales de proveedores integrados:

- Anthropic mantiene los asistentes de transmisión específicos de Claude en su propia costura `api.ts` /
  `contract-api.ts`
- OpenAI mantiene los constructores de proveedores, los asistentes de modelos predeterminados y los constructores de proveedores en tiempo real
  en su propio `api.ts`
- OpenRouter mantiene el constructor de proveedores y los asistentes de incorporación/configuración en su propio
  `api.ts`

## Plan de migración de Talk y voz en tiempo real

El código de voz en tiempo real, telefonía, reuniones y Talk del navegador se está trasladando de la contabilidad de turnos local de superficie a un controlador de sesión de Talk compartido exportado por `openclaw/plugin-sdk/realtime-voice`. El nuevo controlador posee el sobre de eventos común de Talk, el estado del turno activo, el estado de captura, el estado de audio de salida, el historial de eventos reciente y el rechazo de turnos obsoletos. Los complementos del proveedor deben seguir siendo propietarios de las sesiones en tiempo real específicas del proveedor; los complementos de superficie deben seguir siendo propietarios de las peculiaridades de captura, reproducción, telefonía y reuniones.

Esta migración de Talk es intencionalmente una ruptura limpia:

1. Mantenga los primitivos del controlador/runtime compartidos en
   `plugin-sdk/realtime-voice`.
2. Mueva las superficies integradas al controlador compartido: relevo del navegador,
   transferencia de sala administrada, voz en tiempo real de llamada de voz, STT de transmisión de llamada de voz, Google
   Meet en tiempo real y pulsar para hablar nativo.
3. Reemplace las familias antiguas de RPC de Talk con la API final `talk.session.*` y
   `talk.client.*`.
4. Anuncie un canal de eventos de Talk en vivo en Gateway
   `hello-ok.features.events`: `talk.event`.
5. Elimine el punto final HTTP en tiempo real anterior y cualquier ruta de anulación de instrucciones
   en el momento de la solicitud.

El código nuevo no debe llamar a `createTalkEventSequencer(...)` directamente a menos que esté implementando un adaptador de bajo nivel o un dispositivo de prueba. Prefiera el controlador compartido para que no se puedan emitir eventos con ámbito de turno sin un ID de turno, las llamadas obsoletas a `turnEnd` /
`turnCancel` no puedan borrar un turno activo más reciente, y los eventos del ciclo de vida del audio de salida se mantengan consistentes en telefonía, reuniones, retransmisión del navegador, traspaso de sala administrada y clientes nativos de Talk.

La forma de la API pública objetivo es:

```typescript
// Gateway-owned Talk session API.
await gateway.request("talk.session.create", {
  mode: "realtime",
  transport: "gateway-relay",
  brain: "agent-consult",
  sessionKey: "main",
});
await gateway.request("talk.session.appendAudio", { sessionId, audioBase64 });
await gateway.request("talk.session.cancelOutput", { sessionId, reason: "barge-in" });
await gateway.request("talk.session.submitToolResult", {
  sessionId,
  callId,
  result: { status: "working" },
  options: { willContinue: true },
});
await gateway.request("talk.session.submitToolResult", {
  sessionId,
  callId,
  result: { status: "already_delivered" },
  options: { suppressResponse: true },
});
await gateway.request("talk.session.submitToolResult", { sessionId, callId, result });
await gateway.request("talk.session.close", { sessionId });

// Client-owned provider session API.
await gateway.request("talk.client.create", {
  mode: "realtime",
  transport: "webrtc",
  brain: "agent-consult",
  sessionKey: "main",
});
await gateway.request("talk.client.toolCall", { sessionKey, callId, name, args });
await gateway.request("talk.client.steer", { sessionKey, text, mode: "steer" });
```

Las sesiones de WebRTC/provider-websocket propiedad del navegador usan `talk.client.create`,
porque el navegador posee la negociación del proveedor y el transporte de medios, mientras que el
Gateway posee las credenciales, las instrucciones y la política de herramientas. `talk.session.*` es la
superficie común administrada por Gateway para sesiones en tiempo real con retransmisión a través de Gateway, transcripción con retransmisión a través de Gateway y sesiones nativas STT/TTS de sala administrada.

Las configuraciones heredadas que colocaban selectores en tiempo real junto con `talk.provider` /
`talk.providers` deben repararse con `openclaw doctor --fix`; el tiempo de ejecución de Talk
no reinterpretará la configuración del proveedor de voz/TTS como configuración del proveedor en tiempo real.

Las combinaciones de `talk.session.create` admitidas son intencionalmente pocas:

| Modo            | Transporte      | Cerebro         | Propietario            | Notas                                                                                                                                                        |
| --------------- | --------------- | --------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `realtime`      | `gateway-relay` | `agent-consult` | Gateway                | Audio de proveedor dúplex completo puenteado a través del Gateway; las llamadas a herramientas se enrutan a través de la herramienta de consulta de agentes. |
| `transcription` | `gateway-relay` | `none`          | Gateway                | Solo STT de streaming; los remitentes envían audio de entrada y reciben eventos de transcripción.                                                            |
| `stt-tts`       | `managed-room`  | `agent-consult` | Sala nativa/de cliente | Salas estilo pulsar para hablar y walkie-talkie donde el cliente es propietario de la captura/reproducción y el Gateway es propietario del estado del turno. |
| `stt-tts`       | `managed-room`  | `direct-tools`  | Sala nativa/de cliente | Modo de sala solo para administradores para superficies de primera parte confiables que ejecutan acciones de herramientas del Gateway directamente.          |

Mapa de métodos eliminados:

| Antiguo                          | Nuevo                                                   |
| -------------------------------- | ------------------------------------------------------- |
| `talk.realtime.session`          | `talk.client.create`                                    |
| `talk.realtime.toolCall`         | `talk.client.toolCall`                                  |
| `talk.realtime.relayAudio`       | `talk.session.appendAudio`                              |
| `talk.realtime.relayCancel`      | `talk.session.cancelOutput` o `talk.session.cancelTurn` |
| `talk.realtime.relayToolResult`  | `talk.session.submitToolResult`                         |
| `talk.realtime.relayStop`        | `talk.session.close`                                    |
| `talk.transcription.session`     | `talk.session.create({ mode: "transcription" })`        |
| `talk.transcription.relayAudio`  | `talk.session.appendAudio`                              |
| `talk.transcription.relayCancel` | `talk.session.cancelTurn`                               |
| `talk.transcription.relayStop`   | `talk.session.close`                                    |
| `talk.handoff.create`            | `talk.session.create({ transport: "managed-room" })`    |
| `talk.handoff.join`              | `talk.session.join`                                     |
| `talk.handoff.revoke`            | `talk.session.close`                                    |

El vocabulario de control unificado también es deliberadamente estrecho:

| Método                          | Se aplica a                                             | Contrato                                                                                                                                                                                                               |
| ------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `talk.session.appendAudio`      | `realtime/gateway-relay`, `transcription/gateway-relay` | Añadir un fragmento de audio PCM en base64 a la sesión del proveedor propiedad de la misma conexión Gateway.                                                                                                           |
| `talk.session.startTurn`        | `stt-tts/managed-room`                                  | Iniciar un turno de usuario en sala gestionada.                                                                                                                                                                        |
| `talk.session.endTurn`          | `stt-tts/managed-room`                                  | Finalizar el turno activo tras la validación de turno obsoleto.                                                                                                                                                        |
| `talk.session.cancelTurn`       | todas las sesiones propiedad de Gateway                 | Cancelar el trabajo activo de captura/proveedor/agente/TTS para un turno.                                                                                                                                              |
| `talk.session.cancelOutput`     | `realtime/gateway-relay`                                | Detener la salida de audio del asistente sin finalizar necesariamente el turno del usuario.                                                                                                                            |
| `talk.session.submitToolResult` | `realtime/gateway-relay`                                | Complete una llamada a herramienta del proveedor emitida por el relé; pase `options.willContinue` para una salida intermedia o `options.suppressResponse` para satisfacer la llamada sin otra respuesta del asistente. |
| `talk.session.steer`            | sesiones de Talk respaldadas por agente                 | Enviar control `status`, `steer`, `cancel` o `followup` hablado a la ejecución integrada activa resuelta desde la sesión de Talk.                                                                                      |
| `talk.session.close`            | todas las sesiones unificadas                           | Detener sesiones de relé o revocar el estado de sala administrada, y luego olvidar el id de sesión unificada.                                                                                                          |

No introduzca casos especiales de proveedor o plataforma en el núcleo para que esto funcione.
El núcleo posee la semántica de sesión de Talk. Los complementos del proveedor poseen la configuración de sesión del proveedor.
Voice-call y Google Meet poseen adaptadores de telefonía/reunión. Las aplicaciones de navegador y nativas
poseen la experiencia de usuario de captura/reproducción de dispositivos.

## Política de compatibilidad

Para complementos externos, el trabajo de compatibilidad sigue este orden:

1. agregar el nuevo contrato
2. mantener el comportamiento antiguo conectado a través de un adaptador de compatibilidad
3. emitir un diagnóstico o advertencia que nombre la ruta antigua y el reemplazo
4. cubrir ambas rutas en las pruebas
5. documentar la obsolescencia y la ruta de migración
6. eliminar solo después de la ventana de migración anunciada, generalmente en una versión principal

Los mantenedores pueden auditar la cola de migración actual con
`pnpm plugins:boundary-report`. Use `pnpm plugins:boundary-report:summary` para
recuentos compactos, `--owner <id>` para un complemento o propietario de compatibilidad, y
`pnpm plugins:boundary-report:ci` cuando una puerta de CI debería fallar debido a
registros de compatibilidad vencidos, importaciones reservadas del SDK entre propietarios, o subrutas reservadas del SDK
sin usar. El informe agrupa los registros de compatibilidad
deprecados por fecha de eliminación, cuenta las referencias de código/documentos locales,
exponen las importaciones reservadas del SDK entre propietarios, y resume el puente privado
del SDK del host de memoria para que la limpieza de compatibilidad se mantenga explícita en lugar de
confiar en búsquedas ad hoc. Las subrutas reservadas del SDK deben tener un uso del propietario rastreado;
las exportaciones de ayuda reservadas sin usar deben eliminarse del SDK público.

Si un campo de manifiesto todavía se acepta, los autores de complementos pueden seguir usándolo hasta que
los documentos y diagnósticos indiquen lo contrario. El nuevo código debe preferir el reemplazo documentado,
pero los complementos existentes no deberían romperse durante versiones menores ordinarias.

## Cómo migrar

<Steps>
  <Step title="Migrar los asistentes de carga/escritura de configuración en tiempo de ejecución">
    Los complementos empaquetados (bundled) deben dejar de llamar a
    `api.runtime.config.loadConfig()` y
    `api.runtime.config.writeConfigFile(...)` directamente. Se debe preferir la configuración que ya
    se haya pasado a la ruta de llamada activa. Los controladores de larga duración que necesiten
    la instantánea del proceso actual pueden usar `api.runtime.config.current()`. Las herramientas de
    agente de larga duración deben usar el `ctx.getRuntimeConfig()` del contexto de la herramienta dentro de
    `execute` para que una herramienta creada antes de una escritura de configuración aún vea la
    configuración en tiempo de ejecución actualizada.

    Las escrituras de configuración deben pasar a través de los asistentes transaccionales y elegir una
    política posterior a la escritura:

    ```typescript
    await api.runtime.config.mutateConfigFile({
      afterWrite: { mode: "auto" },
      mutate(draft) {
        draft.plugins ??= {};
      },
    });
    ```

    Use `afterWrite: { mode: "restart", reason: "..." }` cuando la persona que llama sabe
    que el cambio requiere un reinicio limpio de la puerta de enlace (gateway), y
    `afterWrite: { mode: "none", reason: "..." }` solo cuando la persona que llama es propietaria del
    seguimiento y deliberadamente desea suprimir el planificador de recarga.
    Los resultados de la mutación incluyen un resumen tipado `followUp` para pruebas y registro;
    la puerta de enlace sigue siendo responsable de aplicar o programar el reinicio.
    `loadConfig` y `writeConfigFile` permanecen como asistentes de compatibilidad
    en desuso para complementos externos durante el período de migración y advierten una vez con
    el código de compatibilidad `runtime-config-load-write`. Los complementos empaquetados y el código de
    tiempo de ejecución del repositorio están protegidos por barreras de escaneo en
    `pnpm check:deprecated-api-usage` y
    `pnpm check:no-runtime-action-load-config`: el uso de complementos de producción nuevos
    falla directamente, las escrituras directas de configuración fallan, los métodos del servidor de la puerta de enlace deben usar
    la instantánea de tiempo de ejecución de la solicitud, los asistentes de envío/acción/cliente del canal de tiempo de ejecución
    deben recibir la configuración de su límite, y los módulos de tiempo de ejecución de larga duración tienen
    cero llamadas `loadConfig()` ambientales permitidas.

    El nuevo código de complemento también debe evitar importar el barril de compatibilidad amplio
    `openclaw/plugin-sdk/config-runtime`. Use la subruta SDK estrecha que coincida con el trabajo:

    | Necesidad | Importar |
    | --- | --- |
    | Tipos de configuración como `OpenClawConfig` | `openclaw/plugin-sdk/config-contracts` |
    | Aserciones de configuración ya cargadas y búsqueda de configuración de entrada de complemento | `openclaw/plugin-sdk/plugin-config-runtime` |
    | Lecturas de la instantánea de tiempo de ejecución actual | `openclaw/plugin-sdk/runtime-config-snapshot` |
    | Escrituras de configuración | `openclaw/plugin-sdk/config-mutation` |
    | Asistentes de almacén de sesiones | `openclaw/plugin-sdk/session-store-runtime` |
    | Configuración de tabla Markdown | `openclaw/plugin-sdk/markdown-table-runtime` |
    | Asistentes de tiempo de ejecución de políticas de grupo | `openclaw/plugin-sdk/runtime-group-policy` |
    | Resolución de entrada secreta | `openclaw/plugin-sdk/secret-input-runtime` |
    | Invalidaciones de modelo/sesión | `openclaw/plugin-sdk/model-session-runtime` |

    Los complementos empaquetados y sus pruebas están protegidos por escáner contra el barril
    amplio, por lo que las importaciones y los simulacros (mocks) se mantienen locales para el comportamiento que necesitan. El barril
    amplio todavía existe para compatibilidad externa, pero el código nuevo no debe
    depender de él.

  </Step>

  <Step title="Migrar las extensiones de resultados de herramientas integradas a middleware">
    Los complementos incluidos deben reemplazar los controladores de
    resultados de herramientas `api.registerEmbeddedExtensionFactory(...)` solo para ejecutores integrados por
    middleware neutral en tiempo de ejecución.

    ```typescript
    // OpenClaw and Codex runtime dynamic tools
    api.registerAgentToolResultMiddleware(async (event) => {
      return compactToolResult(event);
    }, {
      runtimes: ["openclaw", "codex"],
    });
    ```

    Actualice el manifiesto del complemento al mismo tiempo:

    ```json
    {
      "contracts": {
        "agentToolResultMiddleware": ["openclaw", "codex"]
      }
    }
    ```

    Los complementos externos no pueden registrar middleware de resultados de herramientas porque puede
    reescribir la salida de herramientas de alta confianza antes de que el modelo la vea.

  </Step>

  <Step title="Migrar los controladores nativos de aprobación a capability facts">
    Los complementos de canal con capacidad de aprobación ahora exponen el comportamiento de aprobación nativo a través de
    `approvalCapability.nativeRuntime` más el registro compartido de contexto de tiempo de ejecución.

    Cambios clave:

    - Reemplazar `approvalCapability.handler.loadRuntime(...)` con
      `approvalCapability.nativeRuntime`
    - Mover la autenticación/entrega específica de la aprobación fuera de la cableación heredada `plugin.auth` /
      `plugin.approvals` y sobre `approvalCapability`
    - `ChannelPlugin.approvals` se ha eliminado del contrato público del complemento de canal;
      mueve los campos de entrega/nativo/renderizado sobre `approvalCapability`
    - `plugin.auth` permanece solo para los flujos de inicio de sesión/cierre de sesión del canal; los ganchos de autenticación de aprobación
      allí ya no son leídos por el núcleo
    - Registrar objetos de tiempo de ejecución propiedad del canal, como clientes, tokens o aplicaciones de Bolt,
      a través de `openclaw/plugin-sdk/channel-runtime-context`
    - No enviar avisos de redirección propiedad del complemento desde los controladores de aprobación nativos;
      el núcleo ahora es propietario de los avisos de enrutado en otro lugar de los resultados de entrega reales
    - Al pasar `channelRuntime` a `createChannelManager(...)`, proporcione una
      superficie `createPluginRuntime().channel` real. Se rechazan los stubs parciales.

    Consulte `/plugins/sdk-channel-plugins` para ver el diseño actual de la capacidad de aprobación.

  </Step>

  <Step title="Audite el comportamiento de reserva del contenedor de Windows">
    Si su complemento usa `openclaw/plugin-sdk/windows-spawn`, los contenedores de Windows sin resolver
    `.cmd`/`.bat` ahora fallan de forma cerrada a menos que pase explícitamente
    `allowShellFallback: true`.

    ```typescript
    // Before
    const program = applyWindowsSpawnProgramPolicy({ candidate });

    // After
    const program = applyWindowsSpawnProgramPolicy({
      candidate,
      // Only set this for trusted compatibility callers that intentionally
      // accept shell-mediated fallback.
      allowShellFallback: true,
    });
    ```

    Si su interlocutor no depende intencionalmente de la reserva del shell, no establezca
    `allowShellFallback` y maneje el error lanzado en su lugar.

  </Step>

  <Step title="Busque importaciones obsoletas">
    Busque en su complemento importaciones desde cualquiera de las dos superficies obsoletas:

    ```bash
    grep -r "plugin-sdk/compat" my-plugin/
    grep -r "plugin-sdk/infra-runtime" my-plugin/
    grep -r "plugin-sdk/config-runtime" my-plugin/
    grep -r "openclaw/extension-api" my-plugin/
    ```

  </Step>

  <Step title="Reemplazar con importaciones específicas">
    Cada exportación de la superficie antigua se asigna a una ruta de importación moderna específica:

    ```typescript
    // Before (deprecated backwards-compatibility layer)
    import {
      createChannelReplyPipeline,
      createPluginRuntimeStore,
      resolveControlCommandGate,
    } from "openclaw/plugin-sdk/compat";

    // After (modern focused imports)
    import { createChannelReplyPipeline } from "openclaw/plugin-sdk/channel-reply-pipeline";
    import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
    import { resolveControlCommandGate } from "openclaw/plugin-sdk/command-auth";
    ```

    Para los asistentes del lado del host, utilice el tiempo de ejecución del complemento inyectado en lugar de importar
    directamente:

    ```typescript
    // Before (deprecated extension-api bridge)
    import { runEmbeddedAgent } from "openclaw/extension-api";
    const result = await runEmbeddedAgent({ sessionId, prompt });

    // After (injected runtime)
    const result = await api.runtime.agent.runEmbeddedAgent({ sessionId, prompt });
    ```

    El mismo patrón se aplica a otros asistentes de puente heredados:

    | Importación antigua | Equivalente moderno |
    | --- | --- |
    | `resolveAgentDir` | `api.runtime.agent.resolveAgentDir` |
    | `resolveAgentWorkspaceDir` | `api.runtime.agent.resolveAgentWorkspaceDir` |
    | `resolveAgentIdentity` | `api.runtime.agent.resolveAgentIdentity` |
    | `resolveThinkingDefault` | `api.runtime.agent.resolveThinkingDefault` |
    | `resolveAgentTimeoutMs` | `api.runtime.agent.resolveAgentTimeoutMs` |
    | `ensureAgentWorkspace` | `api.runtime.agent.ensureAgentWorkspace` |
    | asistentes de almacenamiento de sesión | `api.runtime.agent.session.*` |

  </Step>

  <Step title="Reemplazar importaciones amplias de infra-runtime">
    `openclaw/plugin-sdk/infra-runtime` todavía existe por compatibilidad
    externa, pero el código nuevo debería importar la superficie de ayuda enfocada que
    realmente necesita:

    | Necesidad | Importar |
    | --- | --- |
    | Ayudantes de la cola de eventos del sistema | `openclaw/plugin-sdk/system-event-runtime` |
    | Ayudantes de activación de latido, evento y visibilidad | `openclaw/plugin-sdk/heartbeat-runtime` |
    | Drenaje de la cola de entrega pendiente | `openclaw/plugin-sdk/delivery-queue-runtime` |
    | Telemetría de actividad del canal | `openclaw/plugin-sdk/channel-activity-runtime` |
    | Cachés de deduplicación en memoria | `openclaw/plugin-sdk/dedupe-runtime` |
    | Ayudantes de ruta segura para archivos locales/multimedia | `openclaw/plugin-sdk/file-access-runtime` |
    | Fetch con conocimiento del despachador | `openclaw/plugin-sdk/runtime-fetch` |
    | Ayudantes de proxy y fetch protegido | `openclaw/plugin-sdk/fetch-runtime` |
    | Tipos de política del despachador SSRF | `openclaw/plugin-sdk/ssrf-dispatcher` |
    | Tipos de solicitud/resolución de aprobación | `openclaw/plugin-sdk/approval-runtime` |
    | Ayudantes de carga útil de respuesta de aprobación y comandos | `openclaw/plugin-sdk/approval-reply-runtime` |
    | Ayudantes de formato de error | `openclaw/plugin-sdk/error-runtime` |
    | Esperas de preparación del transporte | `openclaw/plugin-sdk/transport-ready-runtime` |
    | Ayudantes de token seguro | `openclaw/plugin-sdk/secure-random-runtime` |
    | Concurrencia de tareas asíncronas limitada | `openclaw/plugin-sdk/concurrency-runtime` |
    | Coerción numérica | `openclaw/plugin-sdk/number-runtime` |
    | Bloqueo asíncrono local de proceso | `openclaw/plugin-sdk/async-lock-runtime` |
    | Bloqueos de archivo | `openclaw/plugin-sdk/file-lock` |

    Los complementos incluidos están protegidos por escáner contra `infra-runtime`, por lo que el código del repositorio
    no puede revertir al barril amplio.

  </Step>

  <Step title="Migrar los asistentes de ruta de canal">
    El nuevo código de ruta de canal debe usar `openclaw/plugin-sdk/channel-route`.
    Los nombres más antiguos de clave de ruta y objetivo comparable permanecen como alias
    de compatibilidad durante el período de migración, pero los nuevos complementos deben usar los nombres
    de ruta que describen el comportamiento directamente:

    | Asistente antiguo | Asistente moderno |
    | --- | --- |
    | `channelRouteIdentityKey(...)` | `channelRouteDedupeKey(...)` |
    | `channelRouteKey(...)` | `channelRouteCompactKey(...)` |
    | `ComparableChannelTarget` | `ChannelRouteParsedTarget` |
    | `comparableChannelTargetsMatch(...)` | `channelRouteTargetsMatchExact(...)` |
    | `comparableChannelTargetsShareRoute(...)` | `channelRouteTargetsShareConversation(...)` |

    Los asistentes de ruta modernos normalizan `{ channel, to, accountId, threadId }`
    de manera consistente en aprobaciones nativas, supresión de respuestas, desduplicación entrante,
    entrega programada y enrutamiento de sesiones.

    No agregues nuevos usos de `ChannelMessagingAdapter.parseExplicitTarget` o
    los asistentes de ruta cargados por el analizador (`parseExplicitTargetForLoadedChannel`
    o `resolveRouteTargetForLoadedChannel`) o
    `resolveChannelRouteTargetWithParser(...)` de `plugin-sdk/channel-route`.
    Esos ganchos están obsoletos y permanecen solo para complementos más antiguos durante el
    período de migración. Los nuevos complementos de canal deben usar
    `messaging.targetResolver.resolveTarget(...)` para la normalización del ID de objetivo
    y la alternativa de fallo de directorio, `messaging.inferTargetChatType(...)` cuando el núcleo
    necesita un tipo de par temprano, y `messaging.resolveOutboundSessionRoute(...)`
    para la identidad de sesión e hilo nativa del proveedor.

  </Step>

  <Step title="Compilar y probar">
    ```bash
    pnpm build
    pnpm test -- my-plugin/
    ```
  </Step>
</Steps>

## Referencia de la ruta de importación

<Accordion title="Tabla común de rutas de importación">
  | Ruta de importación | Propósito | Exportaciones clave | | --- | --- | --- | | `plugin-sdk/plugin-entry` | Auxiliar de entrada canónica de complementos | `definePluginEntry` | | `plugin-sdk/core` | Reexportación heredada paraguas para definiciones/constructores de entrada de canal | `defineChannelPluginEntry`, `createChatChannelPlugin` | | `plugin-sdk/config-schema` | Exportación del esquema de
  configuración raíz | `OpenClawSchema` | | `plugin-sdk/provider-entry` | Auxiliar de entrada de proveedor único | `defineSingleProviderPluginEntry` | | `plugin-sdk/channel-core` | Definiciones y constructores de entrada de canal centrados | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` | | `plugin-sdk/setup` | Auxiliares compartidos del
  asistente de configuración | Traductor de configuración, avisos de lista de permitidos, constructores de estado de configuración | | `plugin-sdk/setup-runtime` | Auxiliares de tiempo de ejecución de configuración | `createSetupTranslator`, adaptadores de parches de configuración seguros para importar, auxiliares de nota de búsqueda, `promptResolvedAllowFrom`, `splitSetupEntries`, proxies de
  configuración delegados | | `plugin-sdk/setup-adapter-runtime` | Alias de adaptador de configuración obsoleto | Use `plugin-sdk/setup-runtime` | | `plugin-sdk/setup-tools` | Auxiliares de herramientas de configuración | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` | | `plugin-sdk/account-core` | Auxiliares multicuenta | Auxiliares
  de lista/configuración/puerta de acción de cuenta | | `plugin-sdk/account-id` | Auxiliares de ID de cuenta | `DEFAULT_ACCOUNT_ID`, normalización de ID de cuenta | | `plugin-sdk/account-resolution` | Auxiliares de búsqueda de cuenta | Auxiliares de búsqueda de cuenta + alternativas predeterminadas | | `plugin-sdk/account-helpers` | Auxiliares de cuenta estrechos | Auxiliares de lista de
  cuenta/acción de cuenta | | `plugin-sdk/channel-setup` | Adaptadores del asistente de configuración | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`, además de `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` | | `plugin-sdk/channel-pairing` | Primitivas de emparejamiento MD |
  `createChannelPairingController` | | `plugin-sdk/channel-reply-pipeline` | Prefijo de respuesta, escritura y cableado de entrega de origen | `createChannelReplyPipeline`, `resolveChannelSourceReplyDeliveryMode` | | `plugin-sdk/channel-config-helpers` | Fábricas de adaptadores de configuración y auxiliares de acceso MD | `createHybridChannelConfigAdapter`, `resolveChannelDmAccess`,
  `resolveChannelDmAllowFrom`, `resolveChannelDmPolicy`, `normalizeChannelDmPolicy`, `normalizeLegacyDmAliases` | | `plugin-sdk/channel-config-schema` | Constructores de esquema de configuración | Primitivas de esquema de configuración de canal compartido y solo el constructor genérico | | `plugin-sdk/bundled-channel-config-schema` | Esquemas de configuración agrupados | Solo para complementos
  agrupados mantenidos por OpenClaw; los complementos nuevos deben definir esquemas locales del complemento | | `plugin-sdk/channel-config-schema-legacy` | Esquemas de configuración agrupados obsoletos | Solo alias de compatibilidad; use `plugin-sdk/bundled-channel-config-schema` para complementos agrupados mantenidos | | `plugin-sdk/telegram-command-config` | Auxiliares de configuración de
  comandos de Telegram | Normalización de nombre de comando, recorte de descripción, validación de duplicados/conflictos | | `plugin-sdk/channel-policy` | Resolución de políticas de grupo/MD | `resolveChannelGroupRequireMention` | | `plugin-sdk/channel-lifecycle` | Fachada de compatibilidad obsoleta | Use `plugin-sdk/channel-outbound` | | `plugin-sdk/inbound-envelope` | Auxiliares de sobre de
  entrada | Auxiliares compartidos de ruta + constructor de sobre | | `plugin-sdk/channel-inbound` | Auxiliares de recepción de entrada | Construcción de contexto, formato, raíces, ejecutores, despacho de respuesta preparado y predicados de despacho | | `plugin-sdk/messaging-targets` | Ruta de importación de análisis de destino obsoleta | Use `plugin-sdk/channel-targets` para auxiliares genéricos
  de análisis de destino, `plugin-sdk/channel-route` para comparación de rutas, y `messaging.targetResolver` / `messaging.resolveOutboundSessionRoute` propiedad del complemento para resolución de destino específica del proveedor | | `plugin-sdk/outbound-media` | Auxiliares de medios de salida | Carga de medios de salida compartida | | `plugin-sdk/outbound-send-deps` | Fachada de compatibilidad
  obsoleta | Use `plugin-sdk/channel-outbound` | | `plugin-sdk/channel-outbound` | Auxiliares del ciclo de vida de mensajes de salida | Adaptadores de mensajes, recibos, auxiliares de envío duraderos, auxiliares de vista previa en vivo/transmisión, opciones de respuesta, auxiliares de ciclo de vida, identidad de salida y planificación de carga útil | | `plugin-sdk/channel-streaming` | Fachada de
  compatibilidad obsoleta | Use `plugin-sdk/channel-outbound` | | `plugin-sdk/outbound-runtime` | Fachada de compatibilidad obsoleta | Use `plugin-sdk/channel-outbound` | | `plugin-sdk/thread-bindings-runtime` | Auxiliares de vinculación de hilos | Auxiliares de ciclo de vida y adaptador de vinculación de hilos | | `plugin-sdk/agent-media-payload` | Auxiliares de carga útil de medios heredados |
  Constructor de carga útil de medios de agente para diseños de campo heredados | | `plugin-sdk/channel-runtime` | Shim de compatibilidad obsoleto | Solo utilidades de tiempo de ejecución de canal heredado | | `plugin-sdk/channel-send-result` | Tipos de resultado de envío | Tipos de resultado de respuesta | | `plugin-sdk/runtime-store` | Almacenamiento persistente de complementos |
  `createPluginRuntimeStore` | | `plugin-sdk/runtime` | Auxiliares amplios de tiempo de ejecución | Auxiliares de tiempo de ejecución/registro/respaldo/instalación de complementos | | `plugin-sdk/runtime-env` | Auxiliares estrechos de entorno de tiempo de ejecución | Registrador/entorno de tiempo de ejecución, tiempo de espera, reintento y auxiliares de retroceso | | `plugin-sdk/plugin-runtime` |
  Auxiliares compartidos de tiempo de ejecución de complementos | Auxiliares de comandos/ganchos/HTTP/interactivos de complementos | | `plugin-sdk/hook-runtime` | Auxiliares de canalización de ganchos | Auxiliares compartidos de canalización de ganchos web/internos | | `plugin-sdk/lazy-runtime` | Auxiliares perezosos de tiempo de ejecución | `createLazyRuntimeModule`, `createLazyRuntimeMethod`,
  `createLazyRuntimeMethodBinder`, `createLazyRuntimeNamedExport`, `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | Auxiliares de proceso | Auxiliares compartidos de ejecución | | `plugin-sdk/cli-runtime` | Auxiliares de tiempo de ejecución de CLI | Formato de comandos, esperas, auxiliares de versión | | `plugin-sdk/gateway-runtime` | Auxiliares de puerta de enlace | Cliente de puerta
  de enlace, auxiliar de inicio listo para bucle de eventos y auxiliares de parches de estado de canal | | `plugin-sdk/config-runtime` | Shim de compatibilidad de configuración obsoleto | Prefiera `config-contracts`, `plugin-config-runtime`, `runtime-config-snapshot` y `config-mutation` | | `plugin-sdk/telegram-command-config` | Auxiliares de comandos de Telegram | Auxiliares de validación de
  comandos de Telegram estables alternativos cuando la superficie de contrato de Telegram agrupada no está disponible | | `plugin-sdk/approval-runtime` | Auxiliares de avisos de aprobación | Carga útil de aprobación de ejecución/complemento, auxiliares de capacidad/perfil de aprobación, auxiliares de enrutamiento/tiempo de ejecución de aprobación nativos y formateo de ruta de visualización de
  aprobación estructurada | | `plugin-sdk/approval-auth-runtime` | Auxiliares de autenticación de aprobación | Resolución de aprobador, autenticación de acción del mismo chat | | `plugin-sdk/approval-client-runtime` | Auxiliares de cliente de aprobación | Auxiliares de perfil/filtro de aprobación de ejecución nativa | | `plugin-sdk/approval-delivery-runtime` | Auxiliares de entrega de aprobación |
  Adaptadores de capacidad/entrega de aprobación nativos | | `plugin-sdk/approval-gateway-runtime` | Auxiliares de puerta de enlace de aprobación | Auxiliar compartido de resolución de puerta de enlace de aprobación | | `plugin-sdk/approval-handler-adapter-runtime` | Auxiliares de adaptador de aprobación | Auxiliares de carga de adaptador de aprobación nativo ligero para puntos de entrada de canal
  en caliente | | `plugin-sdk/approval-handler-runtime` | Auxiliares de controlador de aprobación | Auxiliares de tiempo de ejecución más amplios del controlador de aprobación; prefiera las costuras de adaptador/puerta de enlace más estrechas cuando sean suficientes | | `plugin-sdk/approval-native-runtime` | Auxiliares de destino de aprobación | Auxiliares de vinculación de destino/cuenta de
  aprobación nativos | | `plugin-sdk/approval-reply-runtime` | Auxiliares de respuesta de aprobación | Auxiliares de carga útil de respuesta de aprobación de ejecución/complemento | | `plugin-sdk/channel-runtime-context` | Auxiliares de contexto de tiempo de ejecución de canal | Auxiliares compartidos de registro/obtención/observación de contexto de tiempo de ejecución de canal genérico | |
  `plugin-sdk/security-runtime` | Auxiliares de seguridad | Auxiliares compartidos de confianza, bloqueo de MD, archivo/ruta delimitado por raíz, contenido externo y recolección de secretos | | `plugin-sdk/ssrf-policy` | Auxiliares de políticas SSRF | Auxiliares de lista de permitidos de host y política de red privada | | `plugin-sdk/ssrf-runtime` | Auxiliares de tiempo de ejecución SSRF |
  Despachador anclado, búsqueda protegida, auxiliares de políticas SSRF | | `plugin-sdk/system-event-runtime` | Auxiliares de eventos del sistema | `enqueueSystemEvent`, `peekSystemEventEntries` | | `plugin-sdk/heartbeat-runtime` | Auxiliares de latido | Auxiliares de activación, evento y visibilidad de latido | | `plugin-sdk/delivery-queue-runtime` | Auxiliares de cola de entrega |
  `drainPendingDeliveries` | | `plugin-sdk/channel-activity-runtime` | Auxiliares de actividad del canal | `recordChannelActivity` | | `plugin-sdk/dedupe-runtime` | Auxiliares de deduplicación | Cachés de deduplicación en memoria | | `plugin-sdk/file-access-runtime` | Auxiliares de acceso a archivos | Auxiliares de ruta de archivo/medios locales seguros | | `plugin-sdk/transport-ready-runtime` |
  Auxiliares de preparación del transporte | `waitForTransportReady` | | `plugin-sdk/exec-approvals-runtime` | Auxiliares de políticas de aprobación de ejecución | `loadExecApprovals`, `resolveExecApprovalsFromFile`, `ExecApprovalsFile` | | `plugin-sdk/collection-runtime` | Auxiliares de caché delimitada | `pruneMapToMaxSize` | | `plugin-sdk/diagnostic-runtime` | Auxiliares de bloqueo de
  diagnóstico | `isDiagnosticFlagEnabled`, `isDiagnosticsEnabled` | | `plugin-sdk/error-runtime` | Auxiliares de formateo de errores | `formatUncaughtError`, `isApprovalNotFoundError`, auxiliares de gráfico de errores | | `plugin-sdk/fetch-runtime` | Auxiliares de búsqueda/proxy envueltos | `resolveFetch`, auxiliares de proxy, auxiliares de opción EnvHttpProxyAgent | | `plugin-sdk/host-runtime` |
  Auxiliares de normalización de host | `normalizeHostname`, `normalizeScpRemoteHost` | | `plugin-sdk/retry-runtime` | Auxiliares de reintento | `RetryConfig`, `retryAsync`, ejecutores de políticas | | `plugin-sdk/allow-from` | Formateo de lista de permitidos y mapeo de entrada | `formatAllowFromLowercase`, `mapAllowlistResolutionInputs` | | `plugin-sdk/command-auth` | Bloqueo de comandos y
  auxiliares de superficie de comandos | `resolveControlCommandGate`, auxiliares de autorización de remitente, auxiliares de registro de comandos incluyendo el formato de menú de argumentos dinámicos | | `plugin-sdk/command-status` | Representadores de estado/ayuda de comandos | `buildCommandsMessage`, `buildCommandsMessagePaginated`, `buildHelpMessage` | | `plugin-sdk/secret-input` | Análisis de
  entrada de secretos | Auxiliares de entrada de secretos | | `plugin-sdk/webhook-ingress` | Auxiliares de solicitudes de webhook | Utilidades de destino de webhook | | `plugin-sdk/webhook-request-guards` | Auxiliares de guarda de cuerpo de webhook | Auxiliares de lectura/limite de cuerpo de solicitud | | `plugin-sdk/reply-runtime` | Tiempo de ejecución de respuesta compartido | Despacho de
  entrada, latido, planificador de respuesta, fragmentación | | `plugin-sdk/reply-dispatch-runtime` | Auxiliares estrechos de despacho de respuesta | Finalizar, despacho de proveedor y auxiliares de etiquetas de conversación | | `plugin-sdk/reply-history` | Auxiliares de historial de respuestas | `createChannelHistoryWindow`; exportaciones de compatibilidad de auxiliares de mapas obsoletos como
  `buildPendingHistoryContextFromMap`, `recordPendingHistoryEntry` y `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | Planificación de referencia de respuesta | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | Auxiliares de fragmentos de respuesta | Auxiliares de fragmentación de texto/markdown | | `plugin-sdk/session-store-runtime` | Auxiliares de tienda de sesión
  | Auxiliares de ruta de tienda + actualizados en | | `plugin-sdk/state-paths` | Auxiliares de ruta de estado | Auxiliares de directorio de estado y OAuth | | `plugin-sdk/routing` | Auxiliares de ruta/clave de sesión de enrutamiento | `resolveAgentRoute`, `buildAgentSessionKey`, `resolveDefaultAgentBoundAccountId`, auxiliares de normalización de clave de sesión | | `plugin-sdk/status-helpers` |
  Auxiliares de estado del canal | Constructores de resumen de estado de canal/cuenta, valores predeterminados de estado de tiempo de ejecución, auxiliares de metadatos de problemas | | `plugin-sdk/target-resolver-runtime` | Auxiliares de resolvedor de destino | Auxiliares compartidos de resolvedor de destino | | `plugin-sdk/string-normalization-runtime` | Auxiliares de normalización de cadenas |
  Auxiliares de normalización de slug/cadena | | `plugin-sdk/request-url` | Auxiliares de URL de solicitud | Extraer cadenas de URL de entradas tipo solicitud | | `plugin-sdk/run-command` | Auxiliares de comandos cronometrados | Ejecutor de comandos cronometrados con stdout/stderr normalizados | | `plugin-sdk/param-readers` | Lectores de parámetros | Lectores comunes de parámetros de
  herramienta/CLI | | `plugin-sdk/tool-payload` | Extracción de carga útil de herramientas | Extraer cargas útiles normalizadas de objetos de resultado de herramientas | | `plugin-sdk/tool-send` | Extracción de envío de herramientas | Extraer campos de destino de envío canónicos de argumentos de herramientas | | `plugin-sdk/temp-path` | Auxiliares de ruta temporal | Auxiliares compartidos de ruta
  de descarga temporal | | `plugin-sdk/logging-core` | Auxiliares de registro | Auxiliares de registrador y redacción de subsistemas | | `plugin-sdk/markdown-table-runtime` | Auxiliares de tablas Markdown | Auxiliares de modo de tabla Markdown | | `plugin-sdk/reply-payload` | Tipos de respuesta de mensajes | Tipos de carga útil de respuesta | | `plugin-sdk/provider-setup` | Auxiliares de
  configuración de proveedor local/autohospedado curado | Auxiliares de descubrimiento/configuración de proveedor autohospedado | | `plugin-sdk/self-hosted-provider-setup` | Auxiliares de configuración de proveedor autohospedado compatible con OpenAI centrados | Mismos auxiliares de descubrimiento/configuración de proveedor autohospedado | | `plugin-sdk/provider-auth-runtime` | Auxiliares de
  autenticación de tiempo de ejecución de proveedor | Auxiliares de resolución de clave de API de tiempo de ejecución | | `plugin-sdk/provider-auth-api-key` | Auxiliares de configuración de clave de API de proveedor | Auxiliares de escritura de perfil/integración de clave de API | | `plugin-sdk/provider-auth-result` | Auxiliares de resultado de autenticación de proveedor | Constructor de resultado
  de autenticación OAuth estándar | | `plugin-sdk/provider-selection-runtime` | Auxiliares de selección de proveedor | Selección de proveedor configurada o automática y fusión de configuración de proveedor sin procesar | | `plugin-sdk/provider-env-vars` | Auxiliares de variables de entorno de proveedor | Auxiliares de búsqueda de variable de entorno de autenticación de proveedor | |
  `plugin-sdk/provider-model-shared` | Auxiliares compartidos de modelo/reproducción de proveedor | `ProviderReplayFamily`, `buildProviderReplayFamilyHooks`, `normalizeModelCompat`, constructores compartidos de políticas de reproducción, auxiliares de punto final de proveedor y auxiliares de normalización de ID de modelo | | `plugin-sdk/provider-catalog-shared` | Auxiliares compartidos de catálogo
  de proveedor | `findCatalogTemplate`, `buildSingleProviderApiKeyCatalog`, `buildManifestModelProviderConfig`, `supportsNativeStreamingUsageCompat`, `applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-onboard` | Parches de integración de proveedor | Auxiliares de configuración de integración | | `plugin-sdk/provider-http` | Auxiliares HTTP de proveedor | Auxiliares genéricos de
  capacidad HTTP/punto final de proveedor, incluyendo auxiliares de formulario multiparte de transcripción de audio | | `plugin-sdk/provider-web-fetch` | Auxiliares de recuperación web de proveedor | Auxiliares de registro/caché de proveedor de recuperación web | | `plugin-sdk/provider-web-search-config-contract` | Auxiliares de configuración de búsqueda web de proveedor | Auxiliares estrechos de
  configuración/credenciales de búsqueda web para proveedores que no necesitan cableado de habilitación de complemento | | `plugin-sdk/provider-web-search-contract` | Auxiliares de contrato de búsqueda web de proveedor | Auxiliares estrechos de contrato de configuración/credenciales de búsqueda web como `createWebSearchProviderContractFields`, `enablePluginInConfig`,
  `resolveProviderWebSearchPluginConfig` y establecedores/obtenedores de credenciales con alcance | | `plugin-sdk/provider-web-search` | Auxiliares de búsqueda web de proveedor | Auxiliares de registro/caché/tiempo de ejecución de proveedor de búsqueda web | | `plugin-sdk/provider-tools` | Auxiliares de compatibilidad de herramienta/esquema de proveedor | `ProviderToolCompatFamily`,
  `buildProviderToolCompatFamilyHooks` y limpieza/diagnósticos de esquema DeepSeek/Gemini/OpenAI | | `plugin-sdk/provider-usage` | Auxiliares de uso de proveedor | `fetchClaudeUsage`, `fetchGeminiUsage`, `fetchGithubCopilotUsage` y otros auxiliares de uso de proveedor | | `plugin-sdk/provider-stream` | Auxiliares de envoltorio de flujo de proveedor | `ProviderStreamFamily`,
  `buildProviderStreamFamilyHooks`, `composeProviderStreamWrappers`, tipos de envoltorio de flujo y auxiliares compartidos de envoltorio Anthropic/Bedrock/DeepSeek V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot | | `plugin-sdk/provider-transport-runtime` | Auxiliares de transporte de proveedor | Auxiliares de transporte de proveedor nativo como búsqueda protegida,
  transformaciones de mensajes de transporte y flujos de eventos de transporte grabables | | `plugin-sdk/keyed-async-queue` | Cola asíncrona ordenada | `KeyedAsyncQueue` | | `plugin-sdk/media-runtime` | Auxiliares compartidos de medios | Auxiliares de recuperación/transformación/almacenamiento de medios, sondaje de dimensiones de video respaldado por ffprobe y constructores de carga útil de medios
  | | `plugin-sdk/media-generation-runtime` | Auxiliares compartidos de generación de medios | Auxiliares compartidos de conmutación por error, selección de candidatos y mensajería de modelos faltantes para generación de imagen/video/música | | `plugin-sdk/media-understanding` | Auxiliares de comprensión de medios | Tipos de proveedor de comprensión de medios más exportaciones de auxiliares de
  imagen/audio orientados al proveedor | | `plugin-sdk/text-runtime` | Exportación de compatibilidad de texto amplio obsoleta | Use `string-coerce-runtime`, `text-chunking`, `text-utility-runtime` y `logging-core` | | `plugin-sdk/text-chunking` | Auxiliares de fragmentación de texto | Auxiliar de fragmentación de texto de salida | | `plugin-sdk/speech` | Auxiliares de voz | Tipos de proveedor de
  voz más directivas, registro, auxiliares de validación orientados al proveedor y constructor TTS compatible con OpenAI | | `plugin-sdk/speech-core` | Núcleo de voz compartido | Tipos, registro, directivas y normalización del proveedor de voz | | `plugin-sdk/realtime-transcription` | Auxiliares de transcripción en tiempo real | Tipos de proveedor, auxiliares de registro y auxiliar de sesión
  WebSocket compartida | | `plugin-sdk/realtime-voice` | Auxiliares de voz en tiempo real | Tipos de proveedor, auxiliares de registro/resolución, auxiliares de sesión de puente, colas de retroalimentación de agente compartidas, control de voz de ejecución activa, salud de transcripción/evento, supresión de eco, coincidencia de preguntas de consulta, coordinación de consulta forzada, seguimiento
  de contexto de turno, seguimiento de actividad de salida y auxiliares de consulta rápida de contexto | | `plugin-sdk/image-generation` | Auxiliares de generación de imágenes | Tipos de proveedor de generación de imágenes más auxiliares de URL de datos/activos de imágenes y el constructor de proveedor de imágenes compatible con OpenAI | | `plugin-sdk/image-generation-core` | Núcleo compartido de
  generación de imágenes | Tipos, conmutación por error, autenticación y auxiliares de registro de generación de imágenes | | `plugin-sdk/music-generation` | Auxiliares de generación de música | Tipos de solicitud/resultado/proveedor de generación de música | | `plugin-sdk/music-generation-core` | Núcleo compartido de generación de música | Tipos de generación de música, auxiliares de conmutación
  por error, búsqueda de proveedor y análisis de referencia de modelo | | `plugin-sdk/video-generation` | Auxiliares de generación de video | Tipos de solicitud/resultado/proveedor de generación de video | | `plugin-sdk/video-generation-core` | Núcleo compartido de generación de video | Tipos de generación de video, auxiliares de conmutación por error, búsqueda de proveedor y análisis de
  referencia de modelo | | `plugin-sdk/interactive-runtime` | Auxiliares de respuesta interactiva | Normalización/reducción de carga útil de respuesta interactiva | | `plugin-sdk/channel-config-primitives` | Primitivas de configuración de canal | Primitivas estrechas de esquema de configuración de canal | | `plugin-sdk/channel-config-writes` | Auxiliares de escritura de configuración de canal |
  Auxiliares de autorización de escritura de configuración de canal | | `plugin-sdk/channel-plugin-common` | Preludio compartido de canal | Exportaciones de preludio de complemento de canal compartido | | `plugin-sdk/channel-status` | Auxiliares de estado del canal | Auxiliares compartidos de instantánea/resumen de estado de canal | | `plugin-sdk/allowlist-config-edit` | Auxiliares de
  configuración de lista de permitidos | Auxiliares de edición/lectura de configuración de lista de permitidos | | `plugin-sdk/group-access` | Auxiliares de acceso a grupos | Auxiliares compartidos de decisiones de acceso a grupos | | `plugin-sdk/direct-dm`, `plugin-sdk/direct-dm-access` | Fachadas de compatibilidad obsoletas | Use `plugin-sdk/channel-inbound` | |
  `plugin-sdk/direct-dm-guard-policy` | Auxiliares de guarda MD directo | Auxiliares estrechos de políticas de guarda previa al cifrado | | `plugin-sdk/extension-shared` | Auxiliares compartidos de extensión | Primitivas de auxiliares de canal pasivo/estado y proxy ambiental | | `plugin-sdk/webhook-targets` | Auxiliares de destino de webhook | Registro de destino de webhook y auxiliares de
  instalación de ruta | | `plugin-sdk/webhook-path` | Alias de ruta de webhook obsoleto | Use `plugin-sdk/webhook-ingress` | | `plugin-sdk/web-media` | Auxiliares compartidos de medios web | Auxiliares de carga de medios remotos/locales | | `plugin-sdk/zod` | Reexportación de compatibilidad Zod obsoleta | Importe `zod` de `zod` directamente | | `plugin-sdk/memory-core` | Auxiliares de núcleo de
  memoria agrupado | Superficie de auxiliares de administrador/configuración/archivo/CLI de memoria | | `plugin-sdk/memory-core-engine-runtime` | Fachada de tiempo de ejecución del motor de memoria | Fachada de tiempo de ejecución de indexación/búsqueda de memoria | | `plugin-sdk/memory-core-host-embedding-registry` | Registro de incrustación de memoria | Auxiliares ligeros de registro de
  proveedor de incrustación de memoria | | `plugin-sdk/memory-core-host-engine-foundation` | Motor base de anfitrión de memoria | Exportaciones del motor base de anfitrión de memoria | | `plugin-sdk/memory-core-host-engine-embeddings` | Motor de incrustación de anfitrión de memoria | Contratos de incrustación de memoria, acceso al registro, proveedor local y auxiliares genéricos de lotes/remotos;
  los proveedores remotos concretos viven en sus complementos propietarios | | `plugin-sdk/memory-core-host-engine-qmd` | Motor QMD de anfitrión de memoria | Exportaciones del motor QMD de anfitrión de memoria | | `plugin-sdk/memory-core-host-engine-storage` | Motor de almacenamiento de anfitrión de memoria | Exportaciones del motor de almacenamiento de anfitrión de memoria | |
  `plugin-sdk/memory-core-host-multimodal` | Auxiliares multimodales de anfitrión de memoria | Auxiliares multimodales de anfitrión de memoria | | `plugin-sdk/memory-core-host-query` | Auxiliares de consulta de anfitrión de memoria | Auxiliares de consulta de anfitrión de memoria | | `plugin-sdk/memory-core-host-secret` | Auxiliares de secretos de anfitrión de memoria | Auxiliares de secretos de
  anfitrión de memoria | | `plugin-sdk/memory-core-host-events` | Alias de evento de memoria obsoleto | Use `plugin-sdk/memory-host-events` | | `plugin-sdk/memory-core-host-status` | Auxiliares de estado de anfitrión de memoria | Auxiliares de estado de anfitrión de memoria | | `plugin-sdk/memory-core-host-runtime-cli` | Tiempo de ejecución de CLI de anfitrión de memoria | Auxiliares de tiempo de
  ejecución de CLI de anfitrión de memoria | | `plugin-sdk/memory-core-host-runtime-core` | Tiempo de ejecución central de anfitrión de memoria | Auxiliares de tiempo de ejecución central de anfitrión de memoria | | `plugin-sdk/memory-core-host-runtime-files` | Auxiliares de archivo/tiempo de ejecución de anfitrión de memoria | Auxiliares de archivo/tiempo de ejecución de anfitrión de memoria | |
  `plugin-sdk/memory-host-core` | Alias de tiempo de ejecución central de anfitrión de memoria | Alias neutral al proveedor para auxiliares de tiempo de ejecución central de anfitrión de memoria | | `plugin-sdk/memory-host-events` | Alias de diario de eventos de anfitrión de memoria | Alias neutral al proveedor para auxiliares de diario de eventos de anfitrión de memoria | |
  `plugin-sdk/memory-host-files` | Alias de archivo/tiempo de ejecución de memoria obsoleto | Use `plugin-sdk/memory-core-host-runtime-files` | | `plugin-sdk/memory-host-markdown` | Auxiliares de markdown administrado | Auxiliares compartidos de markdown administrado para complementos adyacentes a la memoria | | `plugin-sdk/memory-host-search` | Fachada de búsqueda de memoria activa | Fachada de
  tiempo de ejecución perezosa del administrador de búsqueda de memoria activa | | `plugin-sdk/memory-host-status` | Alias de estado de anfitrión de memoria obsoleto | Use `plugin-sdk/memory-core-host-status` | | `plugin-sdk/testing` | Utilidades de prueba | Barril de compatibilidad obsoleto local al repositorio; use subrutas de prueba locales enfocadas como `plugin-sdk/plugin-test-runtime`,
  `plugin-sdk/channel-test-helpers`, `plugin-sdk/channel-target-testing`, `plugin-sdk/test-env` y `plugin-sdk/test-fixtures` |
</Accordion>

Esta tabla es intencionalmente el subconjunto común de migración, no la superficie completa del SDK. El inventario de puntos de entrada del compilador se encuentra en `scripts/lib/plugin-sdk-entrypoints.json`; las exportaciones de paquetes se generan desde el subconjunto público.

Las costuras de ayuda reservadas para complementos agrupados (bundled-plugin) se han retirado del mapa de exportación público del SDK, excepto para fachadas de compatibilidad explícitamente documentadas, como el shim obsoleto `plugin-sdk/discord` retenido para el paquete publicado `@openclaw/discord@2026.3.13`. Las ayudas específicas del propietario viven dentro del paquete del complemento propietario; el comportamiento compartido del host debe moverse a través de contratos genéricos del SDK como `plugin-sdk/gateway-runtime`, `plugin-sdk/security-runtime` y `plugin-sdk/plugin-config-runtime`.

Utilice la importación más estrecha que coincida con la tarea. Si no puede encontrar una exportación, verifique el código fuente en `src/plugin-sdk/` o pregunte a los mantenedores qué contrato genérico debería ser el propietario.

## Deprecaciones activas

Deprecaciones más específicas que se aplican en todo el SDK de complementos, el contrato del proveedor, la superficie de tiempo de ejecución y el manifiesto. Cada uno todavía funciona hoy, pero se eliminará en una versión principal futura. La entrada debajo de cada elemento asigna la API antigua a su reemplazo canónico.

<AccordionGroup>
  <Accordion title="command-auth help builders → command-status">
    **Antiguo (`openclaw/plugin-sdk/command-auth`)**: `buildCommandsMessage`,
    `buildCommandsMessagePaginated`, `buildHelpMessage`.

    **Nuevo (`openclaw/plugin-sdk/command-status`)**: mismas firmas, mismas exportaciones, solo importadas desde la subruta más estrecha. `command-auth`
    las reexporta como stubs de compatibilidad.

    ```typescript
    // Before
    import { buildHelpMessage } from "openclaw/plugin-sdk/command-auth";

    // After
    import { buildHelpMessage } from "openclaw/plugin-sdk/command-status";
    ```

  </Accordion>

  <Accordion title="Mention gating helpers → resolveInboundMentionDecision">
    **Antiguo**: `resolveInboundMentionRequirement({ facts, policy })` y
    `shouldDropInboundForMention(...)` de
    `openclaw/plugin-sdk/channel-inbound` o
    `openclaw/plugin-sdk/channel-mention-gating`.

    **Nuevo**: `resolveInboundMentionDecision({ facts, policy })` - devuelve un
    objeto de decisión único en lugar de dos llamadas separadas.

    Los complementos de canal descendentes (Slack, Discord, Matrix, MS Teams) ya han cambiado.

  </Accordion>

  <Accordion title="Shim de tiempo de ejecución del canal y ayudantes de acciones del canal">
    `openclaw/plugin-sdk/channel-runtime` es un shim de compatibilidad para complementos
    de canal antiguos. No lo importe en código nuevo; use
    `openclaw/plugin-sdk/channel-runtime-context` para registrar objetos en tiempo de
    ejecución.

    Los ayudantes `channelActions*` en `openclaw/plugin-sdk/channel-actions` están
    obsoletos junto con las exportaciones de canal "actions" (acciones) sin procesar. Exponga las capacidades
    a través de la superficie semántica `presentation` en su lugar: los complementos de canal
    declaran lo que representan (tarjetas, botones, selecciones) en lugar de qué nombres de
    acción sin procesar aceptan.

  </Accordion>

  <Accordion title="Ayudante tool() del proveedor de búsqueda web → createTool() en el complemento">
    **Antiguo**: fábrica `tool()` de `openclaw/plugin-sdk/provider-web-search`.

    **Nuevo**: implemente `createTool(...)` directamente en el complemento del proveedor.
    OpenClaw ya no necesita el ayudante del SDK para registrar el contenedor de la herramienta.

  </Accordion>

  <Accordion title="Sobres de canal de texto plano → BodyForAgent">
    **Antiguo**: `formatInboundEnvelope(...)` (y
    `ChannelMessageForAgent.channelEnvelope`) para construir un sobre de mensaje de texto plano
    a partir de los mensajes entrantes del canal.

    **Nuevo**: `BodyForAgent` más bloques de contexto de usuario estructurados. Los complementos
    de canal adjuntan metadatos de enrutamiento (hilo, tema, responder a, reacciones) como
    campos tipados en lugar de concatenarlos en una cadena de mensaje. El
    ayudante `formatAgentEnvelope(...)` todavía es compatible para sobres
    sintetizados orientados al asistente, pero los sobres de texto plano entrantes están en
    camino de desaparecer.

    Áreas afectadas: `inbound_claim`, `message_received` y cualquier complemento
    de canal personalizado que posprocesara texto `channelEnvelope`.

  </Accordion>

  <Accordion title="deactivate hook → gateway_stop">
    **Antiguo**: `api.on("deactivate", handler)`.

    **Nuevo**: `api.on("gateway_stop", handler)`. El evento y el contexto son el
    mismo contrato de limpieza de apagado; solo cambia el nombre del enlace (hook).

    ```typescript
    // Before
    api.on("deactivate", async (event, ctx) => {
      await stopPluginService(ctx);
    });

    // After
    api.on("gateway_stop", async (event, ctx) => {
      await stopPluginService(ctx);
    });
    ```

    `deactivate` permanece conectado como un alias de compatibilidad obsoleto hasta después del
    2026-08-16.

  </Accordion>

  <Accordion title="subagent_spawning hook → core thread binding">
    **Antiguo**: `api.on("subagent_spawning", handler)` devolviendo
    `threadBindingReady` o `deliveryOrigin`.

    **Nuevo**: permitir que el núcleo prepare enlaces `thread: true` de subagentes a través del
    adaptador de enlace de sesión del canal. Use `api.on("subagent_spawned", handler)`
    solo para la observación posterior al lanzamiento.

    ```typescript
    // Before
    api.on("subagent_spawning", async () => ({
      status: "ok",
      threadBindingReady: true,
      deliveryOrigin: { channel: "discord", to: "channel:123", threadId: "456" },
    }));

    // After
    api.on("subagent_spawned", async (event) => {
      await observeSubagentLaunch(event);
    });
    ```

    `subagent_spawning`, `PluginHookSubagentSpawningEvent`,
    `PluginHookSubagentSpawningResult` y
    `SubagentLifecycleHookRunner.runSubagentSpawning(...)` permanecen solo como
    superficies de compatibilidad obsoletas mientras migran los plugins externos.

  </Accordion>

  <Accordion title="Provider discovery types → provider catalog types">
    Cuatro alias de tipos de descubrimiento ahora son envoltorios delgados sobre los
    tipos de la era del catálogo:

    | Old alias                 | New type                  |
    | ------------------------- | ------------------------- |
    | `ProviderDiscoveryOrder`  | `ProviderCatalogOrder`    |
    | `ProviderDiscoveryContext`| `ProviderCatalogContext`  |
    | `ProviderDiscoveryResult` | `ProviderCatalogResult`   |
    | `ProviderPluginDiscovery` | `ProviderPluginCatalog`   |

    Además del contenedor estático `ProviderCapabilities` heredado; los plugins de
    proveedores deben usar enlaces de proveedor explícitos como `buildReplayPolicy`,
    `normalizeToolSchemas` y `wrapStreamFn` en lugar de un objeto estático.

  </Accordion>

  <Accordion title="Thinking policy hooks → resolveThinkingProfile">
    **Antiguo** (tres hooks separados en `ProviderThinkingPolicy`):
    `isBinaryThinking(ctx)`, `supportsXHighThinking(ctx)` y
    `resolveDefaultThinkingLevel(ctx)`.

    **Nuevo**: un único `resolveThinkingProfile(ctx)` que devuelve un
    `ProviderThinkingProfile` con el `id` canónico, `label` opcional y
    lista de niveles clasificados. OpenClaw degrada automáticamente los valores almacenados obsoletos por rango de perfil.

    El contexto incluye `provider`, `modelId` `reasoning` opcional combinados,
    y hechos de modelo `compat` opcionales combinados. Los proveedores de complementos pueden usar esos
    hechos del catálogo para exponer un perfil específico del modelo solo cuando el contrato de
    solicitud configurado lo admite.

    Implemente un hook en lugar de tres. Los hooks heredados siguen funcionando durante
    el período de desaprobación, pero no se componen con el resultado del perfil.

  </Accordion>

  <Accordion title="External auth providers → contracts.externalAuthProviders">
    **Antiguo**: implementar hooks de autenticación externa sin declarar el proveedor
    en el manifiesto del complemento.

    **Nuevo**: declarar `contracts.externalAuthProviders` en el manifiesto del complemento
    **y** implementar `resolveExternalAuthProfiles(...)`.

    ```json
    {
      "contracts": {
        "externalAuthProviders": ["anthropic", "openai"]
      }
    }
    ```

  </Accordion>

  <Accordion title="Provider env-var lookup → setup.providers[].envVars">
    Campo de manifiesto **antiguo**: `providerAuthEnvVars: { anthropic: ["ANTHROPIC_API_KEY"] }`.

    **Nuevo**: reflejar la misma búsqueda de variable de entorno en `setup.providers[].envVars`
    en el manifiesto. Esto consolida los metadatos de entorno de configuración/estado en un
    solo lugar y evita iniciar el tiempo de ejecución del complemento solo para responder búsquedas de
    variables de entorno.

    `providerAuthEnvVars` sigue siendo compatible a través de un adaptador de compatibilidad
    hasta que cierre el período de desaprobación.

  </Accordion>

  <Accordion title="Registro del complemento de memoria → registerMemoryCapability">
    **Antiguo**: tres llamadas separadas -
    `api.registerMemoryPromptSection(...)`,
    `api.registerMemoryFlushPlan(...)`,
    `api.registerMemoryRuntime(...)`.

    **Nuevo**: una llamada en la API de estado de memoria -
    `registerMemoryCapability(pluginId, { promptBuilder, flushPlanResolver, runtime })`.

    Mismas ranuras, llamada de registro única. Los auxiliares de indicador y corpus aditivos
    (`registerMemoryPromptSupplement`, `registerMemoryCorpusSupplement`) no
    se ven afectados.

  </Accordion>

  <Accordion title="API del proveedor de incrustaciones de memoria">
    **Antiguo**: `api.registerMemoryEmbeddingProvider(...)` más
    `contracts.memoryEmbeddingProviders`.

    **Nuevo**: `api.registerEmbeddingProvider(...)` más
    `contracts.embeddingProviders`.

    El contrato de proveedor de incrustaciones genérico es reutilizable fuera de la memoria y es
    la ruta admitida para nuevos proveedores. La API de registro específica de memoria
    permanece conectada como compatibilidad obsoleta mientras los proveedores existentes migran.
    La inspección de complementos informa el uso no agrupado como deuda de compatibilidad.

  </Accordion>

  <Accordion title="Tipos de mensajes de sesión de subagente renombrados">
    Dos alias de tipo heredados todavía exportados desde `src/plugins/runtime/types.ts`:

    | Antiguo                           | Nuevo                             |
    | ----------------------------- | ------------------------------- |
    | `SubagentReadSessionParams`   | `SubagentGetSessionMessagesParams` |
    | `SubagentReadSessionResult`   | `SubagentGetSessionMessagesResult` |

    El método de tiempo de ejecución `readSession` está obsoleto en favor de
    `getSessionMessages`. La misma firma; el método antiguo llama al
    nuevo.

  </Accordion>

  <Accordion title="runtime.tasks.flow → runtime.tasks.managedFlows">
    **Antiguo**: `runtime.tasks.flow` (singular) devolvía un descriptor de flujo de tareas en vivo.

    **Nuevo**: `runtime.tasks.managedFlows` mantiene el tiempo de ejecución de mutación
    TaskFlow administrado para complementos que crean, actualizan, cancelan o ejecutan tareas secundarias desde un
    flujo. Use `runtime.tasks.flows` cuando el complemento solo necesite lecturas basadas en DTO.

    ```typescript
    // Before
    const flow = api.runtime.tasks.flow.fromToolContext(ctx);
    // After
    const flow = api.runtime.tasks.managedFlows.fromToolContext(ctx);
    ```

  </Accordion>

<Accordion title="Embedded extension factories → agent tool-result middleware">
  Cubierto en "Cómo migrar → Migrar extensiones integradas de resultados de herramientas a middleware" arriba. Incluido aquí para completar: la ruta eliminada solo para embebidos `api.registerEmbeddedExtensionFactory(...)` es reemplazada por `api.registerAgentToolResultMiddleware(...)` con una lista de tiempo de ejecución explícita en `contracts.agentToolResultMiddleware`.
</Accordion>

  <Accordion title="OpenClawSchemaType alias → OpenClawConfig">
    `OpenClawSchemaType` reexportado desde `openclaw/plugin-sdk` es ahora un
    alias de una sola línea para `OpenClawConfig`. Prefiera el nombre canónico.

    ```typescript
    // Before
    import type { OpenClawSchemaType } from "openclaw/plugin-sdk";
    // After
    import type { OpenClawConfig } from "openclaw/plugin-sdk/config-schema";
    ```

  </Accordion>
</AccordionGroup>

<Note>
  Las obsolescencias a nivel de extensión (dentro de complementos de canal/proveedor empaquetados bajo `extensions/`) se rastrean dentro de sus propios contenedores `api.ts` y `runtime-api.ts`. No afectan los contratos de complementos de terceros y no se enumeran aquí. Si consume un contenedor local de un complemento empaquetado directamente, lea los comentarios de obsolescencia en ese contenedor
  antes de actualizar.
</Note>

## Cronograma de eliminación

| Cuándo                    | Qué sucede                                                                               |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| **Ahora**                 | Las superficies depreciadas emiten advertencias de tiempo de ejecución                   |
| **Próxima versión mayor** | Las superficies depreciadas serán eliminadas; los complementos que aún las usen fallarán |

Todos los complementos centrales ya han sido migrados. Los complementos externos deben migrar
antes de la próxima versión mayor.

## Suprimir temporalmente las advertencias

Establezca estas variables de entorno mientras trabaja en la migración:

```bash
OPENCLAW_SUPPRESS_PLUGIN_SDK_COMPAT_WARNING=1 openclaw gateway run
OPENCLAW_SUPPRESS_EXTENSION_API_WARNING=1 openclaw gateway run
```

Esta es una salida de emergencia temporal, no una solución permanente.

## Relacionado

- [Introducción](/es/plugins/building-plugins) - construya su primer complemento
- [Resumen del SDK](/es/plugins/sdk-overview) - referencia completa de importaciones de subrutas
- [Complementos de canal](/es/plugins/sdk-channel-plugins) - construcción de complementos de canal
- [Complementos de proveedor](/es/plugins/sdk-provider-plugins) - construcción de complementos de proveedor
- [Aspectos internos del complemento](/es/plugins/architecture) - inmersión profunda en la arquitectura
- [Manifiesto del complemento](/es/plugins/manifest) - referencia de esquema de manifiesto
