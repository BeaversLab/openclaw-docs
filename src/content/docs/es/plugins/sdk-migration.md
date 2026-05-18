---
summary: "Migre desde la capa de compatibilidad con versiones anteriores heredada hasta el SDK de complementos moderno"
title: "Migración del SDK de complementos"
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

- **`openclaw/plugin-sdk/compat`** - una sola importación que reexportaba docenas
  de asistentes. Se introdujo para mantener los complementos más antiguos basados en hooks funcionando mientras se
  construía la nueva arquitectura de complementos.
- **`openclaw/plugin-sdk/infra-runtime`** - un barril amplio de asistentes de tiempo de ejecución que
  mezclaba eventos del sistema, estado de latido, colas de entrega, asistentes de fetch/proxy,
  asistentes de archivos, tipos de aprobación y utilidades no relacionadas.
- **`openclaw/plugin-sdk/config-runtime`** - un barril amplio de compatibilidad de configuración
  que todavía transporta asistentes obsoletos de carga/escritura directa durante la ventana
  de migración.
- **`openclaw/extension-api`** - un puente que otorgaba a los complementos acceso directo a
  asistentes del lado del host, como el ejecutor del agente integrado.
- **`api.registerEmbeddedExtensionFactory(...)`** - un gancho de extensión agrupado y eliminado
  exclusivo de Pi que podía observar eventos del ejecutor integrado, tales como
  `tool_result`.

Las superficies de importación amplias ahora están **obsoletas**. Todavía funcionan en tiempo de ejecución,
pero los nuevos complementos no deben usarlas, y los complementos existentes deben migrar antes
de que la próxima versión principal las elimine. La API de registro de fábrica de extensiones integradas,
solo para Pi, ha sido eliminada; use el middleware de resultados de herramientas (tool-result) en su lugar.

OpenClaw no elimina ni reinterpreta el comportamiento documentado de los complementos en el mismo
cambio que introduce un reemplazo. Los cambios de ruptura de contrato primero deben pasar
por un adaptador de compatibilidad, diagnósticos, documentación y una ventana de obsolescencia.
Eso se aplica a las importaciones del SDK, campos de manifiesto, API de configuración, hooks y comportamiento
de registro en tiempo de ejecución.

<Warning>La capa de compatibilidad hacia atrás se eliminará en una versión mayor futura. Los complementos que todavía importen de estas superficies se romperán cuando eso suceda. Los registros de fábrica de extensiones integradas solo para Pi ya no se cargan.</Warning>

## Por qué esto cambió

El enfoque antiguo causaba problemas:

- **Inicio lento** - importar un asistente cargaba docenas de módulos no relacionados
- **Dependencias circulares** - las reexportaciones amplias facilitaban la creación de ciclos de importación
- **Superficie de API poco clara**: no hay forma de saber qué exportaciones eran estables frente a las internas

El SDK de complementos moderno soluciona esto: cada ruta de importación (`openclaw/plugin-sdk/\<subpath\>`)
es un módulo pequeño y autónomo con un propósito claro y un contrato documentado.

Las costuras de conveniencia del proveedor heredadas para canales agrupados también han desaparecido.
Las costuras de asistentes con marca de canal eran atajos privados de mono-repositorio, no contratos
de complementos estables. Utilice en su lugar subrutas genéricas y estrechas del SDK. Dentro del espacio
de trabajo del complemento agrupado, mantenga los asistentes propiedad del proveedor en el propio `api.ts` o
`runtime-api.ts` de ese complemento.

Ejemplos actuales de proveedores integrados:

- Anthropic mantiene los auxiliares de transmisión específicos de Claude en su propia `api.ts` / `contract-api.ts` seam
- OpenAI mantiene los constructores de proveedores, los auxiliares de modelos predeterminados y los constructores de proveedores en tiempo real en su propia `api.ts`
- OpenRouter mantiene el constructor de proveedores y los auxiliares de incorporación/configuración en su propia `api.ts`

## Plan de migración de Talk y voz en tiempo real

El código de voz en tiempo real, telefonía, reuniones y Talk del navegador se está moviendo del control de turnos local de la superficie a un controlador de sesión Talk compartido exportado por `openclaw/plugin-sdk/realtime-voice`. El nuevo controlador posee el sobre de eventos común de Talk, el estado del turno activo, el estado de captura, el estado de audio de salida, el historial de eventos reciente y el rechazo de turnos obsoletos. Los complementos del proveedor deben seguir siendo propietarios de las sesiones en tiempo real específicas del proveedor; los complementos de la superficie deben seguir siendo propietarios de las peculiaridades de captura, reproducción, telefonía y reuniones.

Esta migración de Talk es intencionalmente una ruptura limpia:

1. Mantenga las primitivas compartidas de controlador/runtime en
   `plugin-sdk/realtime-voice`.
2. Mueva las superficies integradas al controlador compartido: relevo del navegador,
   transferencia de sala administrada, voz en tiempo real de llamada de voz, STT de transmisión de llamada de voz, Google
   Meet en tiempo real y pulsar para hablar nativo.
3. Reemplace las antiguas familias de Talk RPC con la API `talk.session.*` y
   `talk.client.*` definitiva.
4. Anuncie un canal de eventos de Talk en vivo en Gateway
   `hello-ok.features.events`: `talk.event`.
5. Elimine el punto final HTTP en tiempo real anterior y cualquier ruta de anulación de instrucciones
   en el momento de la solicitud.

El código nuevo no debería llamar a `createTalkEventSequencer(...)` directamente a menos que esté
implementando un adaptador de bajo nivel o un dispositivo de prueba. Prefiera el controlador compartido
para que los eventos con ámbito de turno no puedan emitirse sin un ID de turno, las llamadas obsoletas a `turnEnd` /
`turnCancel` no puedan borrar un turno activo más reciente, y los eventos del ciclo de vida
de audio de salida se mantengan consistentes entre telefonía, reuniones, retransmisión del navegador, traspaso
de salas administradas y clientes nativos de Talk.

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
```

Las sesiones de WebRTC/proveedor-websocket propiedad del navegador usan `talk.client.create`,
porque el navegador es propietario de la negociación del proveedor y el transporte de medios, mientras que la
Gateway es propietaria de las credenciales, las instrucciones y la política de herramientas. `talk.session.*` es la
superficie administrada común de la Gateway para tiempo real de retransmisión (gateway-relay), transcripción de retransmisión
y sesiones nativas STT/TTS de sala administrada.

Las configuraciones heredadas que colocaban selectores de tiempo real junto con `talk.provider` /
`talk.providers` deben repararse con `openclaw doctor --fix`; el tiempo de ejecución de Talk
no reinterpretará la configuración del proveedor de voz/TTS como configuración del proveedor de tiempo real.

Las combinaciones compatibles de `talk.session.create` son intencionalmente reducidas:

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

| Método                          | Se aplica a                                             | Contrato                                                                                                                                                                                                                  |
| ------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `talk.session.appendAudio`      | `realtime/gateway-relay`, `transcription/gateway-relay` | Añadir un fragmento de audio PCM en base64 a la sesión del proveedor propiedad de la misma conexión Gateway.                                                                                                              |
| `talk.session.startTurn`        | `stt-tts/managed-room`                                  | Iniciar un turno de usuario en sala gestionada.                                                                                                                                                                           |
| `talk.session.endTurn`          | `stt-tts/managed-room`                                  | Finalizar el turno activo tras la validación de turno obsoleto.                                                                                                                                                           |
| `talk.session.cancelTurn`       | todas las sesiones propiedad de Gateway                 | Cancelar el trabajo activo de captura/proveedor/agente/TTS para un turno.                                                                                                                                                 |
| `talk.session.cancelOutput`     | `realtime/gateway-relay`                                | Detener la salida de audio del asistente sin finalizar necesariamente el turno del usuario.                                                                                                                               |
| `talk.session.submitToolResult` | `realtime/gateway-relay`                                | Complete una llamada de herramienta de proveedor emitida por el relé; pase `options.willContinue` para resultados provisionales o `options.suppressResponse` para satisfacer la llamada sin otra respuesta del asistente. |
| `talk.session.close`            | todas las sesiones unificadas                           | Detener las sesiones de relé o revocar el estado de la sala gestionada, y luego olvidar el id de sesión unificada.                                                                                                        |

No introduzcas casos especiales de proveedor o plataforma en el núcleo para hacer que esto funcione.
El núcleo posee la semántica de la sesión Talk. Los complementos del proveedor poseen la configuración de la sesión del proveedor. Voice-call y Google Meet poseen los adaptadores de telefonía/reunión. El navegador y las aplicaciones
nativas poseen la experiencia de usuario de captura/reproducción de dispositivos.

## Política de compatibilidad

Para complementos externos, el trabajo de compatibilidad sigue este orden:

1. agregar el nuevo contrato
2. mantener el comportamiento antiguo conectado a través de un adaptador de compatibilidad
3. emitir un diagnóstico o advertencia que nombre la ruta antigua y el reemplazo
4. cubrir ambas rutas en las pruebas
5. documentar la obsolescencia y la ruta de migración
6. eliminar solo después de la ventana de migración anunciada, generalmente en una versión mayor

Los responsables pueden auditar la cola de migración actual con
`pnpm plugins:boundary-report`. Use `pnpm plugins:boundary-report:summary` para
recuentos compactos, `--owner <id>` para un complemento o propietario de compatibilidad, y
`pnpm plugins:boundary-report:ci` cuando una puerta de CI debe fallar por registros de compatibilidad vencidos,
importaciones del SDK reservadas de varios propietarios o subrutas del SDK reservadas sin usar. El informe agrupa los registros de compatibilidad
desaprobados por fecha de eliminación, cuenta las referencias locales de código/documentos,
expone las importaciones del SDK reservadas de varios propietarios y resume el puente del SDK
privado de host de memoria para que la limpieza de compatibilidad permanezca explícita en lugar de
confiar en búsquedas ad hoc. Las subrutas del SDK reservadas deben tener un uso de propietario rastreado;
las exportaciones de ayuda reservadas sin uso deben eliminarse del SDK público.

Si un campo de manifiesto todavía se acepta, los autores de complementos pueden seguir usándolo hasta que
la documentación y los diagnósticos indiquen lo contrario. El nuevo código debe preferir el reemplazo
documentado, pero los complementos existentes no deben romperse durante versiones menores
ordinarias.

## Cómo migrar

<Steps>
  <Step title="Migrar los asistentes de carga/escritura de configuración en tiempo de ejecución">
    Los complementos empaquetados deben dejar de llamar a
    `api.runtime.config.loadConfig()` y
    `api.runtime.config.writeConfigFile(...)` directamente. Se prefiere la configuración que ya
    se pasó a la ruta de llamada activa. Los controladores de larga duración que necesiten
    la instantánea del proceso actual pueden usar `api.runtime.config.current()`. Las herramientas de
    agentes de larga duración deben usar el `ctx.getRuntimeConfig()` del contexto de la herramienta dentro
    de `execute` para que una herramienta creada antes de una escritura de configuración aún vea la configuración
    en tiempo de ejecución actualizada.

    Las escrituras de configuración deben realizarse a través de los asistentes transaccionales y elegir una
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
    que el cambio requiere un reinicio limpio de la puerta de enlace, y
    `afterWrite: { mode: "none", reason: "..." }` solo cuando la persona que llama es propietaria del
    seguimiento y deliberadamente desea suprimir el planificador de recarga.
    Los resultados de la mutación incluyen un resumen tipado `followUp` para pruebas y registro;
    la puerta de enlace sigue siendo responsable de aplicar o programar el reinicio.
    `loadConfig` y `writeConfigFile` permanecen como asistentes de compatibilidad
    obsoletos para complementos externos durante la ventana de migración y advierten una vez con
    el código de compatibilidad `runtime-config-load-write`. Los complementos empaquetados y el código
    en tiempo de ejecución del repositorio están protegidos por guardabarros del escáner en
    `pnpm check:deprecated-api-usage` y
    `pnpm check:no-runtime-action-load-config`: el uso del complemento de producción nuevo
    falla directamente, las escrituras directas de configuración fallan, los métodos del servidor de puerta de enlace deben usar
    la instantánea en tiempo de ejecución de la solicitud, los asistentes de envío/acción/cliente del canal en tiempo de ejecución
    deben recibir la configuración de su límite, y los módulos en tiempo de ejecución de larga duración tienen
    cero llamadas `loadConfig()` ambientales permitidas.

    El nuevo código del complemento también debe evitar importar el barril de
    compatibilidad `openclaw/plugin-sdk/config-runtime` amplio. Use la subruta SDK
    estrecha que coincida con el trabajo:

    | Necesidad | Importar |
    | --- | --- |
    | Tipos de configuración como `OpenClawConfig` | `openclaw/plugin-sdk/config-contracts` |
    | Aserciones de configuración ya cargadas y búsqueda de configuración de entrada de complemento | `openclaw/plugin-sdk/plugin-config-runtime` |
    | Lecturas de instantánea de tiempo de ejecución actual | `openclaw/plugin-sdk/runtime-config-snapshot` |
    | Escrituras de configuración | `openclaw/plugin-sdk/config-mutation` |
    | Asistentes de almacén de sesiones | `openclaw/plugin-sdk/session-store-runtime` |
    | Configuración de tabla Markdown | `openclaw/plugin-sdk/markdown-table-runtime` |
    | Asistentes de tiempo de ejecución de políticas de grupo | `openclaw/plugin-sdk/runtime-group-policy` |
    | Resolución de entrada secreta | `openclaw/plugin-sdk/secret-input-runtime` |
    | anulaciones de modelo/sesión | `openclaw/plugin-sdk/model-session-runtime` |

    Los complementos empaquetados y sus pruebas están protegidas por el escáner contra el barril
    amplio para que las importaciones y simulaciones se mantengan locales para el comportamiento que necesitan. El barril
    amplio aún existe para la compatibilidad externa, pero el código nuevo no debe
    depender de él.

  </Step>

  <Step title="Migrate las extensiones de resultados de herramientas de Pi a middleware">
    Los plugins empaquetados deben reemplazar los controladores de resultados de herramientas solo para Pi
    `api.registerEmbeddedExtensionFactory(...)` con middleware
    neutral al tiempo de ejecución.

    ```typescript
    // Pi and Codex runtime dynamic tools
    api.registerAgentToolResultMiddleware(async (event) => {
      return compactToolResult(event);
    }, {
      runtimes: ["pi", "codex"],
    });
    ```

    Actualice el manifiesto del plugin al mismo tiempo:

    ```json
    {
      "contracts": {
        "agentToolResultMiddleware": ["pi", "codex"]
      }
    }
    ```

    Los plugins externos no pueden registrar middleware de resultados de herramientas porque puede
    reescribir la salida de herramientas de alta confianza antes de que el modelo la vea.

  </Step>

  <Step title="Migrate approval-native handlers to capability facts">
    Los plugins de canal con capacidad de aprobación ahora exponen el comportamiento nativo de aprobación a través de
    `approvalCapability.nativeRuntime` más el registro compartido de contexto de ejecución.

    Cambios clave:

    - Reemplazar `approvalCapability.handler.loadRuntime(...)` con
      `approvalCapability.nativeRuntime`
    - Mover la autenticación/entrega específica de la aprobación desde la conexión heredada `plugin.auth` /
      `plugin.approvals` hacia `approvalCapability`
    - `ChannelPlugin.approvals` se ha eliminado del contrato público del plugin de canal;
      mover los campos delivery/native/render a `approvalCapability`
    - `plugin.auth` permanece solo para los flujos de inicio/cierre de sesión del canal; los hooks de
      autenticación de aprobación allí ya no son leídos por el núcleo
    - Registrar objetos de ejecución propiedad del canal, como clientes, tokens o aplicaciones Bolt,
      a través de `openclaw/plugin-sdk/channel-runtime-context`
    - No enviar avisos de redirección propiedad del plugin desde los controladores nativos de aprobación;
      el núcleo ahora posee los avisos de enrutado a otro lugar de los resultados reales de entrega
    - Al pasar `channelRuntime` a `createChannelManager(...)`, proporcionar una
      superficie `createPluginRuntime().channel` real. Se rechazan los stubs parciales.

    Consulte `/plugins/sdk-channel-plugins` para ver el diseño actual de la capacidad de
    aprobación.

  </Step>

  <Step title="Audit Windows wrapper fallback behavior">
    Si su complemento usa `openclaw/plugin-sdk/windows-spawn`, los contenedores de `.cmd`/`.bat` de Windows no resueltos ahora fallan de forma cerrada a menos que pase explícitamente `allowShellFallback: true`.

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

    Si su invocador no depende intencionalmente del respaldo (fallback) del shell, no establezca `allowShellFallback` y maneje el error lanzado en su lugar.

  </Step>

  <Step title="Find deprecated imports">
    Busque en su complemento importaciones desde cualquiera de las superficies obsoletas:

    ```bash
    grep -r "plugin-sdk/compat" my-plugin/
    grep -r "plugin-sdk/infra-runtime" my-plugin/
    grep -r "plugin-sdk/config-runtime" my-plugin/
    grep -r "openclaw/extension-api" my-plugin/
    ```

  </Step>

  <Step title="Reemplazar con importaciones enfocadas">
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

    Para los ayudantes del lado del host, use el tiempo de ejecución del complemento inyectado en lugar de importar
    directamente:

    ```typescript
    // Before (deprecated extension-api bridge)
    import { runEmbeddedPiAgent } from "openclaw/extension-api";
    const result = await runEmbeddedPiAgent({ sessionId, prompt });

    // After (injected runtime)
    const result = await api.runtime.agent.runEmbeddedPiAgent({ sessionId, prompt });
    ```

    El mismo patrón se aplica a otros ayudantes del puente heredados:

    | Importación antigua | Equivalente moderno |
    | --- | --- |
    | `resolveAgentDir` | `api.runtime.agent.resolveAgentDir` |
    | `resolveAgentWorkspaceDir` | `api.runtime.agent.resolveAgentWorkspaceDir` |
    | `resolveAgentIdentity` | `api.runtime.agent.resolveAgentIdentity` |
    | `resolveThinkingDefault` | `api.runtime.agent.resolveThinkingDefault` |
    | `resolveAgentTimeoutMs` | `api.runtime.agent.resolveAgentTimeoutMs` |
    | `ensureAgentWorkspace` | `api.runtime.agent.ensureAgentWorkspace` |
    | ayudantes de almacén de sesiones | `api.runtime.agent.session.*` |

  </Step>

  <Step title="Reemplazar importaciones amplias de infra-runtime">
    `openclaw/plugin-sdk/infra-runtime` todavía existe por compatibilidad
    externa, pero el código nuevo debería importar la superficie de auxiliares
    enfocada que realmente necesita:

    | Necesidad | Importación |
    | --- | --- |
    | Auxiliares de cola de eventos del sistema | `openclaw/plugin-sdk/system-event-runtime` |
    | Auxiliares de despertar de latido, eventos y visibilidad | `openclaw/plugin-sdk/heartbeat-runtime` |
    | Drenaje de cola de entrega pendiente | `openclaw/plugin-sdk/delivery-queue-runtime` |
    | Telemetría de actividad del canal | `openclaw/plugin-sdk/channel-activity-runtime` |
    | Cachés de deduplicación en memoria | `openclaw/plugin-sdk/dedupe-runtime` |
    | Auxiliares de ruta segura para archivos locales/medios | `openclaw/plugin-sdk/file-access-runtime` |
    | Recuperación con conocimiento del despachador | `openclaw/plugin-sdk/runtime-fetch` |
    | Auxiliares de recuperación por proxy y protegida | `openclaw/plugin-sdk/fetch-runtime` |
    | Tipos de política de despachador SSRF | `openclaw/plugin-sdk/ssrf-dispatcher` |
    | Tipos de solicitud/resolución de aprobación | `openclaw/plugin-sdk/approval-runtime` |
    | Auxiliares de carga útil de respuesta y comando de aprobación | `openclaw/plugin-sdk/approval-reply-runtime` |
    | Auxiliares de formato de error | `openclaw/plugin-sdk/error-runtime` |
    | Esperas de preparación del transporte | `openclaw/plugin-sdk/transport-ready-runtime` |
    | Auxiliares de token seguro | `openclaw/plugin-sdk/secure-random-runtime` |
    | Concurrencia de tareas asíncronas limitada | `openclaw/plugin-sdk/concurrency-runtime` |
    | Coerción numérica | `openclaw/plugin-sdk/number-runtime` |
    | Bloqueo asíncrono local de proceso | `openclaw/plugin-sdk/async-lock-runtime` |
    | Bloqueos de archivo | `openclaw/plugin-sdk/file-lock` |

    Los complementos agrupados están protegidos por escáner contra `infra-runtime`, por lo que el código del repositorio
    no puede retroceder al barril amplio.

  </Step>

  <Step title="Migrate channel route helpers">
    El nuevo código de ruta de canal debe usar `openclaw/plugin-sdk/channel-route`.
    Los nombres más antiguos de clave de ruta y objetivo comparable permanecen como
    alias de compatibilidad durante el periodo de migración, pero los nuevos
    complementos deben usar los nombres de ruta que describen el comportamiento
    directamente:

    | Ayudante antiguo | Ayudante moderno |
    | --- | --- |
    | `channelRouteIdentityKey(...)` | `channelRouteDedupeKey(...)` |
    | `channelRouteKey(...)` | `channelRouteCompactKey(...)` |
    | `ComparableChannelTarget` | `ChannelRouteParsedTarget` |
    | `resolveComparableTargetForChannel(...)` | `resolveRouteTargetForChannel(...)` |
    | `resolveComparableTargetForLoadedChannel(...)` | `resolveRouteTargetForLoadedChannel(...)` |
    | `comparableChannelTargetsMatch(...)` | `channelRouteTargetsMatchExact(...)` |
    | `comparableChannelTargetsShareRoute(...)` | `channelRouteTargetsShareConversation(...)` |

    Los ayudantes de ruta modernos normalizan `{ channel, to, accountId, threadId }`
    de manera consistente en aprobaciones nativas, supresión de respuestas,
    deduplicación de entrada, entrega por cron y enrutamiento de sesión. Si su
    complemento posee gramática de destino personalizada, use `resolveChannelRouteTargetWithParser(...)`
    para adaptar ese analizador al mismo contrato de destino de ruta.

  </Step>

  <Step title="Compilar y probar">
    ```bash
    pnpm build
    pnpm test -- my-plugin/
    ```
  </Step>
</Steps>

## Referencia de la ruta de importación

<Accordion title="Tabla de rutas de importación comunes">
  | Ruta de importación | Propósito | Exportaciones clave | | --- | --- | --- | | `plugin-sdk/plugin-entry` | Auxiliar de entrada de plugin canónica | `definePluginEntry` | | `plugin-sdk/core` | Reexportación heredada tipo paraguas para definiciones/constructores de entrada de canal | `defineChannelPluginEntry`, `createChatChannelPlugin` | | `plugin-sdk/config-schema` | Exportación del esquema de
  configuración raíz | `OpenClawSchema` | | `plugin-sdk/provider-entry` | Auxiliar de entrada de proveedor único | `defineSingleProviderPluginEntry` | | `plugin-sdk/channel-core` | Definiciones y constructores de entrada de canal enfocados | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` | | `plugin-sdk/setup` | Auxiliares compartidos del
  asistente de configuración | Traductor de configuración, avisos de lista de permitidos, constructores de estado de configuración | | `plugin-sdk/setup-runtime` | Auxiliares de tiempo de ejecución de configuración | `createSetupTranslator`, adaptadores de parches de configuración seguros para importar, auxiliares de notas de búsqueda, `promptResolvedAllowFrom`, `splitSetupEntries`, proxies de
  configuración delegados | | `plugin-sdk/setup-adapter-runtime` | Alias de adaptador de configuración obsoleto | Use `plugin-sdk/setup-runtime` | | `plugin-sdk/setup-tools` | Auxiliares de herramientas de configuración | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` | | `plugin-sdk/account-core` | Auxiliares multicuenta | Auxiliares
  de lista/configuración/portal de acción de cuenta | | `plugin-sdk/account-id` | Auxiliares de ID de cuenta | `DEFAULT_ACCOUNT_ID`, normalización de ID de cuenta | | `plugin-sdk/account-resolution` | Auxiliares de búsqueda de cuenta | Búsqueda de cuenta + auxiliares de reserva predeterminada | | `plugin-sdk/account-helpers` | Auxiliares de cuenta estrechos | Auxiliares de lista de cuenta/acción
  de cuenta | | `plugin-sdk/channel-setup` | Adaptadores del asistente de configuración | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`, más `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` | | `plugin-sdk/channel-pairing` | Primitivas de emparejamiento MD |
  `createChannelPairingController` | | `plugin-sdk/channel-reply-pipeline` | Prefijo de respuesta, escritura y cableado de entrega de origen | `createChannelReplyPipeline`, `resolveChannelSourceReplyDeliveryMode` | | `plugin-sdk/channel-config-helpers` | Fábricas de adaptadores de configuración y auxiliares de acceso MD | `createHybridChannelConfigAdapter`, `resolveChannelDmAccess`,
  `resolveChannelDmAllowFrom`, `resolveChannelDmPolicy`, `normalizeChannelDmPolicy`, `normalizeLegacyDmAliases` | | `plugin-sdk/channel-config-schema` | Constructores de esquema de configuración | Primitivas de esquema de configuración de canal compartidas y solo el constructor genérico | | `plugin-sdk/bundled-channel-config-schema` | Esquemas de configuración incluidos | Solo para plugins
  incluidos mantenidos por OpenClaw; los plugins nuevos deben definir esquemas locales del plugin | | `plugin-sdk/channel-config-schema-legacy` | Esquemas de configuración incluidos obsoletos | Solo alias de compatibilidad; use `plugin-sdk/bundled-channel-config-schema` para plugins incluidos mantenidos | | `plugin-sdk/telegram-command-config` | Auxiliares de configuración de comandos de Telegram
  | Normalización de nombre de comando, recorte de descripción, validación de duplicados/conflictos | | `plugin-sdk/channel-policy` | Resolución de política de grupo/MD | `resolveChannelGroupRequireMention` | | `plugin-sdk/channel-lifecycle` | Auxiliares de estado de cuenta y ciclo de vida del flujo de borrador | `createAccountStatusSink`, auxiliares de finalización de vista previa de borrador | |
  `plugin-sdk/inbound-envelope` | Auxiliares de sobre entrante | Auxiliares de ruta compartida + constructor de sobre | | `plugin-sdk/inbound-reply-dispatch` | Auxiliares de respuesta entrante | Auxiliares de registro y despacho compartidos | | `plugin-sdk/messaging-targets` | Análisis de objetivo de mensajería | Auxiliares de análisis/coincidencia de objetivos | | `plugin-sdk/outbound-media` |
  Auxiliares de medios salientes | Carga de medios salientes compartida | | `plugin-sdk/outbound-send-deps` | Auxiliares de dependencia de envío saliente | Búsqueda ligera de `resolveOutboundSendDep` sin importar el tiempo de ejecución saliente completo | | `plugin-sdk/outbound-runtime` | Auxiliares de tiempo de ejecución saliente | Entrega saliente, delegado de identidad/envío, sesión, formato y
  auxiliares de planificación de carga útil | | `plugin-sdk/thread-bindings-runtime` | Auxiliares de enlace de hilo | Auxiliares de ciclo de vida y adaptador de enlace de hilo | | `plugin-sdk/agent-media-payload` | Auxiliares heredados de carga útil de medios | Constructor de carga útil de medios de agente para diseños de campo heredados | | `plugin-sdk/channel-runtime` | Shim de compatibilidad
  obsoleto | Solo utilidades de tiempo de ejecución de canal heredadas | | `plugin-sdk/channel-send-result` | Tipos de resultados de envío | Tipos de resultados de respuesta | | `plugin-sdk/runtime-store` | Almacenamiento persistente de plugins | `createPluginRuntimeStore` | | `plugin-sdk/runtime` | Auxiliares generales de tiempo de ejecución | Auxiliares de tiempo de
  ejecución/registro/respaldo/instalación de plugin | | `plugin-sdk/runtime-env` | Auxiliares de entorno de tiempo de ejecución estrechos | Registrador/entorno de tiempo de ejecución, tiempo de espera, reintento y auxiliares de retroceso | | `plugin-sdk/plugin-runtime` | Auxiliares compartidos de tiempo de ejecución de plugin | Auxiliares de comandos/hooks/http/interactivos de plugin | |
  `plugin-sdk/hook-runtime` | Auxiliares de canalización de hooks | Auxiliares de canalización de webhook/hooks internos compartidos | | `plugin-sdk/lazy-runtime` | Auxiliares de tiempo de ejecución diferidos | `createLazyRuntimeModule`, `createLazyRuntimeMethod`, `createLazyRuntimeMethodBinder`, `createLazyRuntimeNamedExport`, `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` |
  Auxiliares de proceso | Auxiliares de ejecución compartidos | | `plugin-sdk/cli-runtime` | Auxiliares de tiempo de ejecución de CLI | Formato de comando, esperas, auxiliares de versión | | `plugin-sdk/gateway-runtime` | Auxiliares de puerta de enlace | Cliente de puerta de enlace, auxiliar de inicio listo para bucle de eventos y auxiliares de parches de estado de canal | |
  `plugin-sdk/config-runtime` | Shim de compatibilidad de configuración obsoleto | Prefiera `config-contracts`, `plugin-config-runtime`, `runtime-config-snapshot` y `config-mutation` | | `plugin-sdk/telegram-command-config` | Auxiliares de comandos de Telegram | Auxiliares de validación de comandos de Telegram estables de reserva cuando la superficie del contrato de Telegram incluida no está
  disponible | | `plugin-sdk/approval-runtime` | Auxiliares de avisos de aprobación | Carga útil de aprobación de ejecución/plugin, auxiliares de capacidad/perfil de aprobación, auxiliares de enrutamiento/tiempo de ejecución de aprobación nativa y formato de ruta de visualización de aprobación estructurada | | `plugin-sdk/approval-auth-runtime` | Auxiliares de autenticación de aprobación |
  Resolución del aprobador, autenticación de acción del mismo chat | | `plugin-sdk/approval-client-runtime` | Auxiliares de cliente de aprobación | Auxiliares de perfil/filtro de aprobación de ejecución nativa | | `plugin-sdk/approval-delivery-runtime` | Auxiliares de entrega de aprobación | Adaptadores de capacidad/entrega de aprobación nativa | | `plugin-sdk/approval-gateway-runtime` |
  Auxiliares de puerta de enlace de aprobación | Auxiliar compartido de resolución de puerta de enlace de aprobación | | `plugin-sdk/approval-handler-adapter-runtime` | Auxiliares de adaptador de aprobación | Auxiliares de carga ligera de adaptadores de aprobación nativos para puntos de entrada de canal en caliente | | `plugin-sdk/approval-handler-runtime` | Auxiliares de controlador de aprobación
  | Auxiliares de tiempo de ejecución de controlador de aprobación más amplios; prefiera las costuras de adaptador/puerta de enlace más estrechas cuando sean suficientes | | `plugin-sdk/approval-native-runtime` | Auxiliares de objetivo de aprobación | Auxiliares de enlace de objetivo/cuenta de aprobación nativa | | `plugin-sdk/approval-reply-runtime` | Auxiliares de respuesta de aprobación |
  Auxiliares de carga útil de respuesta de aprobación de ejecución/plugin | | `plugin-sdk/channel-runtime-context` | Auxiliares de contexto de tiempo de ejecución de canal | Auxiliares genéricos de registro/obtención/observación de contexto de tiempo de ejecución de canal | | `plugin-sdk/security-runtime` | Auxiliares de seguridad | Auxiliares compartidos de confianza, restricción de MD,
  archivo/ruta delimitados por raíz, contenido externo y colección de secretos | | `plugin-sdk/ssrf-policy` | Auxiliares de política SSRF | Auxiliares de política de red privada y lista de permitidos de host | | `plugin-sdk/ssrf-runtime` | Auxiliares de tiempo de ejecución SSRF | Despachador anclado, búsqueda protegida, auxiliares de política SSRF | | `plugin-sdk/system-event-runtime` | Auxiliares
  de eventos del sistema | `enqueueSystemEvent`, `peekSystemEventEntries` | | `plugin-sdk/heartbeat-runtime` | Auxiliares de latido | Auxiliares de activación, evento y visibilidad de latido | | `plugin-sdk/delivery-queue-runtime` | Auxiliares de cola de entrega | `drainPendingDeliveries` | | `plugin-sdk/channel-activity-runtime` | Auxiliares de actividad de canal | `recordChannelActivity` | |
  `plugin-sdk/dedupe-runtime` | Auxiliares de deduplicación | Cachés de deduplicación en memoria | | `plugin-sdk/file-access-runtime` | Auxiliares de acceso a archivos | Auxiliares de ruta de archivo/medios local seguros | | `plugin-sdk/transport-ready-runtime` | Auxiliares de preparación de transporte | `waitForTransportReady` | | `plugin-sdk/collection-runtime` | Auxiliares de caché delimitada |
  `pruneMapToMaxSize` | | `plugin-sdk/diagnostic-runtime` | Auxiliares de restricción de diagnóstico | `isDiagnosticFlagEnabled`, `isDiagnosticsEnabled` | | `plugin-sdk/error-runtime` | Auxiliares de formato de error | `formatUncaughtError`, `isApprovalNotFoundError`, auxiliares de gráfico de errores | | `plugin-sdk/fetch-runtime` | Auxiliares de búsqueda/proxy envueltos | `resolveFetch`,
  auxiliares de proxy, auxiliares de opción EnvHttpProxyAgent | | `plugin-sdk/host-runtime` | Auxiliares de normalización de host | `normalizeHostname`, `normalizeScpRemoteHost` | | `plugin-sdk/retry-runtime` | Auxiliares de reintento | `RetryConfig`, `retryAsync`, ejecutores de política | | `plugin-sdk/allow-from` | Formato de lista de permitidos | `formatAllowFromLowercase` | |
  `plugin-sdk/allowlist-resolution` | Mapeo de entrada de lista de permitidos | `mapAllowlistResolutionInputs` | | `plugin-sdk/command-auth` | Auxiliares de restricción de comandos y superficie de comandos | `resolveControlCommandGate`, auxiliares de autorización del remitente, auxiliares de registro de comandos incluido el formato de menú de argumentos dinámicos | | `plugin-sdk/command-status` |
  Renderizadores de estado/ayuda de comandos | `buildCommandsMessage`, `buildCommandsMessagePaginated`, `buildHelpMessage` | | `plugin-sdk/secret-input` | Análisis de entrada secreta | Auxiliares de entrada secreta | | `plugin-sdk/webhook-ingress` | Auxiliares de solicitudes de webhook | Utilidades de objetivo de webhook | | `plugin-sdk/webhook-request-guards` | Auxiliares de guardia de cuerpo de
  webhook | Auxiliares de lectura/limite de cuerpo de solicitud | | `plugin-sdk/reply-runtime` | Tiempo de ejecución de respuesta compartido | Despacho entrante, latido, planificador de respuesta, fragmentación | | `plugin-sdk/reply-dispatch-runtime` | Auxiliares de despacho de respuesta estrechos | Finalizar, despacho de proveedor y auxiliares de etiquetas de conversación | |
  `plugin-sdk/reply-history` | Auxiliares de historial de respuesta | `createChannelHistoryWindow`; exportaciones de compatibilidad de auxiliares de mapa obsoletas como `buildPendingHistoryContextFromMap`, `recordPendingHistoryEntry` y `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | Planificación de referencia de respuesta | `createReplyReferencePlanner` | |
  `plugin-sdk/reply-chunking` | Auxiliares de fragmento de respuesta | Auxiliares de fragmentación de texto/markdown | | `plugin-sdk/session-store-runtime` | Auxiliares de almacenamiento de sesión | Auxiliares de ruta de almacenamiento + actualizado en | | `plugin-sdk/state-paths` | Auxiliares de ruta de estado | Auxiliares de directorio de estado y OAuth | | `plugin-sdk/routing` | Auxiliares de
  ruta/clave de sesión de enrutamiento | `resolveAgentRoute`, `buildAgentSessionKey`, `resolveDefaultAgentBoundAccountId`, auxiliares de normalización de clave de sesión | | `plugin-sdk/status-helpers` | Auxiliares de estado de canal | Constructores de resumen de estado de canal/cuenta, valores predeterminados de estado de tiempo de ejecución, auxiliares de metadatos de problemas | |
  `plugin-sdk/target-resolver-runtime` | Auxiliares de resolución de objetivos | Auxiliares compartidos de resolución de objetivos | | `plugin-sdk/string-normalization-runtime` | Auxiliares de normalización de cadenas | Auxiliares de normalización de slug/cadena | | `plugin-sdk/request-url` | Auxiliares de URL de solicitud | Extraer URL de cadena de entradas similares a solicitudes | |
  `plugin-sdk/run-command` | Auxiliares de comandos cronometrados | Ejecutor de comandos cronometrados con stdout/stderr normalizados | | `plugin-sdk/param-readers` | Lectores de parámetros | Lectores de parámetros comunes de herramienta/CLI | | `plugin-sdk/tool-payload` | Extracción de carga útil de herramientas | Extraer cargas útiles normalizadas de objetos de resultados de herramientas | |
  `plugin-sdk/tool-send` | Extracción de envío de herramienta | Extraer campos de objetivo de envío canónicos de argumentos de herramientas | | `plugin-sdk/temp-path` | Auxiliares de ruta temporal | Auxiliares compartidos de ruta de descarga temporal | | `plugin-sdk/logging-core` | Auxiliares de registro | Auxiliares de registrador y redacción de subsistemas | | `plugin-sdk/markdown-table-runtime`
  | Auxiliares de tabla Markdown | Auxiliares de modo de tabla Markdown | | `plugin-sdk/reply-payload` | Tipos de respuesta de mensaje | Tipos de carga útil de respuesta | | `plugin-sdk/provider-setup` | Auxiliares de configuración de proveedor local/autoalojado curado | Auxiliares de descubrimiento/configuración de proveedor autoalojado | | `plugin-sdk/self-hosted-provider-setup` | Auxiliares de
  configuración de proveedor autoalojado compatible con OpenAI enfocados | Mismos auxiliares de descubrimiento/configuración de proveedor autoalojado | | `plugin-sdk/provider-auth-runtime` | Auxiliares de autenticación de tiempo de ejecución de proveedor | Auxiliares de resolución de clave de API de tiempo de ejecución | | `plugin-sdk/provider-auth-api-key` | Auxiliares de configuración de clave
  de API de proveedor | Auxiliares de incorporación/escritura de perfil de clave de API | | `plugin-sdk/provider-auth-result` | Auxiliares de resultado de autenticación de proveedor | Constructor de resultado de autenticación OAuth estándar | | `plugin-sdk/provider-selection-runtime` | Auxiliares de selección de proveedor | Selección de proveedor configurado o automático y fusión de configuración
  de proveedor sin procesar | | `plugin-sdk/provider-env-vars` | Auxiliares de variable de entorno de proveedor | Auxiliares de búsqueda de variable de entorno de autenticación de proveedor | | `plugin-sdk/provider-model-shared` | Auxiliares compartidos de modelo/reproducción de proveedor | `ProviderReplayFamily`, `buildProviderReplayFamilyHooks`, `normalizeModelCompat`, constructores de política
  de reproducción compartidos, auxiliares de punto final de proveedor y auxiliares de normalización de ID de modelo | | `plugin-sdk/provider-catalog-shared` | Auxiliares compartidos de catálogo de proveedor | `findCatalogTemplate`, `buildSingleProviderApiKeyCatalog`, `buildManifestModelProviderConfig`, `supportsNativeStreamingUsageCompat`, `applyProviderNativeStreamingUsageCompat` | |
  `plugin-sdk/provider-onboard` | Parches de incorporación de proveedor | Auxiliares de configuración de incorporación | | `plugin-sdk/provider-http` | Auxiliares HTTP de proveedor | Auxiliares genéricos de capacidad HTTP/punto final de proveedor, incluidos auxiliares de formulario multiparte de transcripción de audio | | `plugin-sdk/provider-web-fetch` | Auxiliares de búsqueda web de proveedor |
  Auxiliares de registro/caché de proveedor de búsqueda web | | `plugin-sdk/provider-web-search-config-contract` | Auxiliares de configuración de búsqueda web de proveedor | Auxiliares estrechos de configuración/credenciales de búsqueda web para proveedores que no necesitan cableado de habilitación de plugin | | `plugin-sdk/provider-web-search-contract` | Auxiliares de contrato de búsqueda web de
  proveedor | Auxiliares estrechos de contrato de configuración/credenciales de búsqueda web como `createWebSearchProviderContractFields`, `enablePluginInConfig`, `resolveProviderWebSearchPluginConfig` y establecedores/obtenedores de credenciales con ámbito | | `plugin-sdk/provider-web-search` | Auxiliares de búsqueda web de proveedor | Auxiliares de registro/caché/tiempo de ejecución de proveedor
  de búsqueda web | | `plugin-sdk/provider-tools` | Auxiliares de compatibilidad de herramienta/esquema de proveedor | `ProviderToolCompatFamily`, `buildProviderToolCompatFamilyHooks` y limpieza de esquema de Gemini + diagnósticos | | `plugin-sdk/provider-usage` | Auxiliares de uso de proveedor | `fetchClaudeUsage`, `fetchGeminiUsage`, `fetchGithubCopilotUsage` y otros auxiliares de uso de
  proveedor | | `plugin-sdk/provider-stream` | Auxiliares de contenedor de flujo de proveedor | `ProviderStreamFamily`, `buildProviderStreamFamilyHooks`, `composeProviderStreamWrappers`, tipos de contenedor de flujo y auxiliares de contenedor compartidos Anthropic/Bedrock/DeepSeek V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot | | `plugin-sdk/provider-transport-runtime` |
  Auxiliares de transporte de proveedor | Auxiliares de transporte de proveedor nativo como búsqueda protegida, transformaciones de mensajes de transporte y flujos de eventos de transporte grabables | | `plugin-sdk/keyed-async-queue` | Cola asíncrona ordenada | `KeyedAsyncQueue` | | `plugin-sdk/media-runtime` | Auxiliares de medios compartidos | Auxiliares de búsqueda/transformación/almacenamiento
  de medios, sondeo de dimensiones de video respaldado por ffprobe y constructores de carga útil de medios | | `plugin-sdk/media-generation-runtime` | Auxiliares compartidos de generación de medios | Auxiliares compartidos de conmutación por error, selección de candidatos y mensajería de modelo faltante para generación de imagen/video/música | | `plugin-sdk/media-understanding` | Auxiliares de
  comprensión de medios | Tipos de proveedor de comprensión de medios más exportaciones de auxiliares de imagen/audio orientadas al proveedor | | `plugin-sdk/text-runtime` | Exportación de compatibilidad de texto amplio obsoleta | Use `string-coerce-runtime`, `text-chunking`, `text-utility-runtime` y `logging-core` | | `plugin-sdk/text-chunking` | Auxiliares de fragmentación de texto | Auxiliar de
  fragmentación de texto saliente | | `plugin-sdk/speech` | Auxiliares de voz | Tipos de proveedor de voz más auxiliares de directiva, registro, validación orientados al proveedor y constructor de TTS compatible con OpenAI | | `plugin-sdk/speech-core` | Núcleo de voz compartido | Tipos, registro, directivas y normalización de proveedor de voz | | `plugin-sdk/realtime-transcription` | Auxiliares de
  transcripción en tiempo real | Tipos de proveedor, auxiliares de registro y auxiliar de sesión WebSocket compartido | | `plugin-sdk/realtime-voice` | Auxiliares de voz en tiempo real | Tipos de proveedor, auxiliares de registro/resolución, auxiliares de sesión puente, colas de retroalimentación de agente compartidas, salud de transcripción/eventos, supresión de eco y auxiliares de consulta
  rápida de contexto | | `plugin-sdk/image-generation` | Auxiliares de generación de imágenes | Tipos de proveedor de generación de imágenes más auxiliares de URL de datos/activos de imagen y el constructor de proveedor de imágenes compatible con OpenAI | | `plugin-sdk/image-generation-core` | Núcleo compartido de generación de imágenes | Tipos de generación de imágenes, conmutación por error,
  autenticación y auxiliares de registro | | `plugin-sdk/music-generation` | Auxiliares de generación de música | Tipos de proveedor/solicitud/resultado de generación de música | | `plugin-sdk/music-generation-core` | Núcleo compartido de generación de música | Tipos de generación de música, auxiliares de conmutación por error, búsqueda de proveedor y análisis de referencia de modelo | |
  `plugin-sdk/video-generation` | Auxiliares de generación de video | Tipos de proveedor/solicitud/resultado de generación de video | | `plugin-sdk/video-generation-core` | Núcleo compartido de generación de video | Tipos de generación de video, auxiliares de conmutación por error, búsqueda de proveedor y análisis de referencia de modelo | | `plugin-sdk/interactive-runtime` | Auxiliares de
  respuesta interactiva | Normalización/reducción de carga útil de respuesta interactiva | | `plugin-sdk/channel-config-primitives` | Primitivas de configuración de canal | Primitivas estrechas de esquema de configuración de canal | | `plugin-sdk/channel-config-writes` | Auxiliares de escritura de configuración de canal | Auxiliares de autorización de escritura de configuración de canal | |
  `plugin-sdk/channel-plugin-common` | Preludio compartido de canal | Exportaciones de prelude de plugin de canal compartido | | `plugin-sdk/channel-status` | Auxiliares de estado de canal | Auxiliares compartidos de instantánea/resumen de estado de canal | | `plugin-sdk/allowlist-config-edit` | Auxiliares de configuración de lista de permitidos | Auxiliares de edición/lectura de configuración de
  lista de permitidos | | `plugin-sdk/group-access` | Auxiliares de acceso de grupo | Auxiliares compartidos de decisiones de acceso de grupo | | `plugin-sdk/direct-dm` | Auxiliares de MD directo | Auxiliares compartidos de autorización/restricción de MD directo | | `plugin-sdk/extension-shared` | Auxiliares de extensión compartida | Primitivas de auxiliares de proxy ambiental y de canal
  pasivo/estado | | `plugin-sdk/webhook-targets` | Auxiliares de objetivo de webhook | Registro de objetivo de webhook y auxiliares de instalación de ruta | | `plugin-sdk/webhook-path` | Alias de ruta de webhook obsoleto | Use `plugin-sdk/webhook-ingress` | | `plugin-sdk/web-media` | Auxiliares de medios web compartidos | Auxiliares de carga de medios remotos/locales | | `plugin-sdk/zod` |
  Reexportación de compatibilidad Zod obsoleta | Importe `zod` desde `zod` directamente | | `plugin-sdk/memory-core` | Auxiliares de núcleo de memoria incluidos | Superficie de auxiliar de archivo/configuración/CLI de administrador de memoria | | `plugin-sdk/memory-core-engine-runtime` | Fachada de tiempo de ejecución del motor de memoria | Fachada de tiempo de ejecución de búsqueda/índice de
  memoria | | `plugin-sdk/memory-core-host-engine-foundation` | Motor base de host de memoria | Exportaciones del motor base de host de memoria | | `plugin-sdk/memory-core-host-engine-embeddings` | Motor de incrustación de host de memoria | Contratos de incrustación de memoria, acceso al registro, proveedor local y auxiliares genéricos de remoto/lotes; los proveedores remotos concretos viven en
  sus plugins propietarios | | `plugin-sdk/memory-core-host-engine-qmd` | Motor QMD de host de memoria | Exportaciones del motor QMD de host de memoria | | `plugin-sdk/memory-core-host-engine-storage` | Motor de almacenamiento de host de memoria | Exportaciones del motor de almacenamiento de host de memoria | | `plugin-sdk/memory-core-host-multimodal` | Auxiliares multimodales de host de memoria |
  Auxiliares multimodales de host de memoria | | `plugin-sdk/memory-core-host-query` | Auxiliares de consulta de host de memoria | Auxiliares de consulta de host de memoria | | `plugin-sdk/memory-core-host-secret` | Auxiliares secretos de host de memoria | Auxiliares secretos de host de memoria | | `plugin-sdk/memory-core-host-events` | Alias de evento de memoria obsoleto | Use
  `plugin-sdk/memory-host-events` | | `plugin-sdk/memory-core-host-status` | Auxiliares de estado de host de memoria | Auxiliares de estado de host de memoria | | `plugin-sdk/memory-core-host-runtime-cli` | Tiempo de ejecución CLI de host de memoria | Auxiliares de tiempo de ejecución CLI de host de memoria | | `plugin-sdk/memory-core-host-runtime-core` | Tiempo de ejecución central de host de
  memoria | Auxiliares de tiempo de ejecución central de host de memoria | | `plugin-sdk/memory-core-host-runtime-files` | Auxiliares de archivo/tiempo de ejecución de host de memoria | Auxiliares de archivo/tiempo de ejecución de host de memoria | | `plugin-sdk/memory-host-core` | Alias de tiempo de ejecución central de host de memoria | Alias neutral al proveedor para auxiliares de tiempo de
  ejecución central de host de memoria | | `plugin-sdk/memory-host-events` | Alias de diario de eventos de host de memoria | Alias neutral al proveedor para auxiliares de diario de eventos de host de memoria | | `plugin-sdk/memory-host-files` | Alias de archivo/tiempo de ejecución de memoria obsoleto | Use `plugin-sdk/memory-core-host-runtime-files` | | `plugin-sdk/memory-host-markdown` |
  Auxiliares de markdown administrado | Auxiliares de markdown administrado compartidos para plugins adyacentes a la memoria | | `plugin-sdk/memory-host-search` | Fachada de búsqueda de memoria activa | Fachada de tiempo de ejecución del administrador de búsqueda de memoria activa diferida | | `plugin-sdk/memory-host-status` | Alias de estado de host de memoria obsoleto | Use
  `plugin-sdk/memory-core-host-status` | | `plugin-sdk/testing` | Utilidades de prueba | Barril de compatibilidad obsoleto local del repositorio; use subrutas de prueba locales enfocadas como `plugin-sdk/plugin-test-runtime`, `plugin-sdk/channel-test-helpers`, `plugin-sdk/channel-target-testing`, `plugin-sdk/test-env` y `plugin-sdk/test-fixtures` |
</Accordion>

Esta tabla es intencionalmente el subconjunto común de migración, no la superficie completa del SDK. El inventario del punto de entrada del compilador reside en `scripts/lib/plugin-sdk-entrypoints.json`; las exportaciones del paquete se generan a partir del subconjunto público.

Las costuras de ayuda reservadas para complementos agrupados se han retirado del mapa de exportación público del SDK, excepto para las fachadas de compatibilidad documentadas explícitamente, como el shim obsoleto `plugin-sdk/discord` conservado para el paquete publicado `@openclaw/discord@2026.3.13`. Los ayudantes específicos del propietario viven dentro del paquete del complemento propietario; el comportamiento compartido del host debería moverse a través de contratos genéricos del SDK como `plugin-sdk/gateway-runtime`, `plugin-sdk/security-runtime` y `plugin-sdk/plugin-config-runtime`.

Utilice la importación más estrecha que coincida con la tarea. Si no puede encontrar una exportación, consulte el código fuente en `src/plugin-sdk/` o pregunte a los mantenedores qué contrato genérico debería ser el propietario.

## Obsolescencias activas

Obsolescencias más específicas que se aplican en todo el SDK del complemento, el contrato del proveedor, la superficie de tiempo de ejecución y el manifiesto. Cada una todavía funciona hoy, pero se eliminará en una versión principal futura. La entrada debajo de cada elemento asigna la API anterior a su reemplazo canónico.

<AccordionGroup>
  <Accordion title="command-auth help builders → command-status">
    **Antiguo (`openclaw/plugin-sdk/command-auth`)**: `buildCommandsMessage`,
    `buildCommandsMessagePaginated`, `buildHelpMessage`.

    **Nuevo (`openclaw/plugin-sdk/command-status`)**: mismas firmas, mismas
    exportaciones - simplemente importadas desde la subruta más estrecha. `command-auth`
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
    único objeto de decisión en lugar de dos llamadas separadas.

    Los complementos de canal descendente (Slack, Discord, Matrix, MS Teams) ya han

cambiado.

  </Accordion>

  <Accordion title="Shim de tiempo de ejecución del canal y asistentes de acciones del canal">
    `openclaw/plugin-sdk/channel-runtime` es un shim de compatibilidad para complementos
    de canal más antiguos. No lo importe en código nuevo; use
    `openclaw/plugin-sdk/channel-runtime-context` para registrar objetos de
    tiempo de ejecución.

    Los asistentes `channelActions*` en `openclaw/plugin-sdk/channel-actions` están
    obsoletos junto con las exportaciones de canal de "acciones" sin procesar. Exponga las capacidades
    a través de la superficie semántica `presentation` en su lugar: los complementos
    de canal declaran lo que renderizan (tarjetas, botones, selecciones) en lugar de qué nombres de
    acciones sin procesar aceptan.

  </Accordion>

  <Accordion title="Ayudante tool() del proveedor de búsqueda web → createTool() en el complemento">
    **Antiguo**: fábrica `tool()` de `openclaw/plugin-sdk/provider-web-search`.

    **Nuevo**: implementar `createTool(...)` directamente en el complemento del proveedor.
    OpenClaw ya no necesita el ayudante del SDK para registrar el contenedor de la herramienta.

  </Accordion>

  <Accordion title="Sobres de canal de texto plano → BodyForAgent">
    **Antiguo**: `formatInboundEnvelope(...)` (y
    `ChannelMessageForAgent.channelEnvelope`) para construir un sobre de solicitud (prompt) de texto plano a partir de los mensajes entrantes del canal.

    **Nuevo**: `BodyForAgent` más bloques de contexto de usuario estructurados. Los complementos del canal adjuntan metadatos de enrutamiento (hilo, tema, respuesta a, reacciones) como campos con tipo en lugar de concatenarlos en una cadena de solicitud. El asistente `formatAgentEnvelope(...)` todavía es compatible para sobres sintetizados orientados al asistente, pero los sobres de texto plano entrantes están en vías de desaparición.

    Áreas afectadas: `inbound_claim`, `message_received` y cualquier complemento de canal personalizado que haya procesado posteriormente el texto `channelEnvelope`.

  </Accordion>

  <Accordion title="deactivate hook → gateway_stop">
    **Antiguo**: `api.on("deactivate", handler)`.

    **Nuevo**: `api.on("gateway_stop", handler)`. El evento y el contexto son el
    mismo contrato de limpieza de apagado; solo cambia el nombre del hook.

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

    `deactivate` permanece conectado como un alias de compatibilidad en desuso hasta después del
    2026-08-16.

  </Accordion>

  <Accordion title="Tipos de descubrimiento de proveedor → tipos de catálogo de proveedor">
    Cuatro alias de tipos de descubrimiento son ahora envoltorios finos sobre los
    tipos de la era del catálogo:

    | Alias antiguo                 | Tipo nuevo                  |
    | ------------------------- | ------------------------- |
    | `ProviderDiscoveryOrder`  | `ProviderCatalogOrder`    |
    | `ProviderDiscoveryContext`| `ProviderCatalogContext`  |
    | `ProviderDiscoveryResult` | `ProviderCatalogResult`   |
    | `ProviderPluginDiscovery` | `ProviderPluginCatalog`   |

    Además del objeto estático heredado `ProviderCapabilities`: los complementos de proveedor
    deben usar hooks de proveedor explícitos como `buildReplayPolicy`,
    `normalizeToolSchemas` y `wrapStreamFn` en lugar de un objeto estático.

  </Accordion>

  <Accordion title="Ganchos de política de pensamiento → resolveThinkingProfile">
    **Antiguo** (tres ganchos separados en `ProviderThinkingPolicy`):
    `isBinaryThinking(ctx)`, `supportsXHighThinking(ctx)` y
    `resolveDefaultThinkingLevel(ctx)`.

    **Nuevo**: un único `resolveThinkingProfile(ctx)` que devuelve un
    `ProviderThinkingProfile` con el `id` canónico, el `label` opcional y
    la lista de niveles clasificada. OpenClaw degrada automáticamente los valores almacenados obsoletos por rango de perfil.

    Implemente un gancho en lugar de tres. Los ganchos heredados siguen funcionando durante el período de desaprobación, pero no se componen con el resultado del perfil.

  </Accordion>

  <Accordion title="Respaldo del proveedor de OAuth externo → contracts.externalAuthProviders">
    **Antiguo**: implementar `resolveExternalOAuthProfiles(...)` sin
    declarar el proveedor en el manifiesto del complemento.

    **Nuevo**: declarar `contracts.externalAuthProviders` en el manifiesto del complemento
    **y** implementar `resolveExternalAuthProfiles(...)`. La antigua ruta de "respaldo
    de autenticación" emite una advertencia en tiempo de ejecución y se eliminará.

    ```json
    {
      "contracts": {
        "externalAuthProviders": ["anthropic", "openai"]
      }
    }
    ```

  </Accordion>

  <Accordion title="Provider búsqueda de var. de entorno → setup.providers[].envVars">
    **Campo** del manifiesto antiguo: `providerAuthEnvVars: { anthropic: ["ANTHROPIC_API_KEY"] }`.

    **Nuevo**: reflejar la misma búsqueda de var. de entorno en `setup.providers[].envVars`
    en el manifiesto. Esto consolida los metadatos de entorno de configuración/estado en un
    solo lugar y evita iniciar el runtime del plugin solo para responder a búsquedas
    de variables de entorno.

    `providerAuthEnvVars` sigue siendo compatible a través de un adaptador de
    compatibilidad hasta que cierre el período de desuso.

  </Accordion>

  <Accordion title="Registro del complemento de memoria → registerMemoryCapability">
    **Antiguo**: tres llamadas separadas -
    `api.registerMemoryPromptSection(...)`,
    `api.registerMemoryFlushPlan(...)`,
    `api.registerMemoryRuntime(...)`.

    **Nuevo**: una llamada en la API de estado de memoria -
    `registerMemoryCapability(pluginId, { promptBuilder, flushPlanResolver, runtime })`.

    Mismas ranuras, llamada de registro único. Los asistentes de memoria aditivos
    (`registerMemoryPromptSupplement`, `registerMemoryCorpusSupplement`,
    `registerMemoryEmbeddingProvider`) no se ven afectados.

  </Accordion>

  <Accordion title="Tipos de mensajes de sesión de subagente renombrados">
    Dos alias de tipo heredados aún se exportan desde `src/plugins/runtime/types.ts`:

    | Antiguo                           | Nuevo                             |
    | ----------------------------- | ------------------------------- |
    | `SubagentReadSessionParams`   | `SubagentGetSessionMessagesParams` |
    | `SubagentReadSessionResult`   | `SubagentGetSessionMessagesResult` |

    El método de tiempo de ejecución `readSession` está obsoleto en favor de
    `getSessionMessages`. La misma firma; el método antiguo llama al
    nuevo.

  </Accordion>

  <Accordion title="runtime.tasks.flow → runtime.tasks.managedFlows">
    **Antiguo**: `runtime.tasks.flow` (singular) devolvía un accesor de flujo de tareas en vivo.

    **Nuevo**: `runtime.tasks.managedFlows` mantiene el tiempo de ejecución de mutación de TaskFlow gestionado para complementos que crean, actualizan, cancelan o ejecutan tareas secundarias desde un flujo. Use `runtime.tasks.flows` cuando el complemento solo necesite lecturas basadas en DTO.

    ```typescript
    // Before
    const flow = api.runtime.tasks.flow.fromToolContext(ctx);
    // After
    const flow = api.runtime.tasks.managedFlows.fromToolContext(ctx);
    ```

  </Accordion>

<Accordion title="Embedded extension factories → agent tool-result middleware">
  Cubierto en "Cómo migrar → Migrar las extensiones de resultados de herramientas de Pi a middleware" arriba. Se incluye aquí por integridad: la ruta eliminada solo para Pi `api.registerEmbeddedExtensionFactory(...)` es reemplazada por `api.registerAgentToolResultMiddleware(...)` con una lista explícita en tiempo de ejecución en `contracts.agentToolResultMiddleware`.
</Accordion>

  <Accordion title="OpenClawSchemaType alias → OpenClawConfig">
    `OpenClawSchemaType` reexportado desde `openclaw/plugin-sdk` es ahora un
    alias de una sola línea para `OpenClawConfig`. Se prefiere el nombre canónico.

    ```typescript
    // Before
    import type { OpenClawSchemaType } from "openclaw/plugin-sdk";
    // After
    import type { OpenClawConfig } from "openclaw/plugin-sdk/config-schema";
    ```

  </Accordion>
</AccordionGroup>

<Note>
  Las obsolescencias a nivel de extensión (dentro de los complementos de canal/proveedor empaquetados bajo `extensions/`) se rastrean dentro de sus propios barriles `api.ts` y `runtime-api.ts`. No afectan los contratos de complementos de terceros y no se enumeran aquí. Si consumes un barril local de un complemento empaquetado directamente, lee los comentarios de obsolescencia en ese barril antes
  de actualizar.
</Note>

## Cronograma de eliminación

| Cuándo                        | Qué sucede                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| **Ahora**                     | Las superficies obsoletas emiten advertencias de tiempo de ejecución                |
| **Próxima versión principal** | Las superficies obsoletas se eliminarán; los complementos que aún las usen fallarán |

Todos los complementos principales ya han sido migrados. Los complementos externos deben migrar
antes de la próxima versión principal.

## Suprimir temporalmente las advertencias

Establezca estas variables de entorno mientras trabaja en la migración:

```bash
OPENCLAW_SUPPRESS_PLUGIN_SDK_COMPAT_WARNING=1 openclaw gateway run
OPENCLAW_SUPPRESS_EXTENSION_API_WARNING=1 openclaw gateway run
```

Esta es una solución de escape temporal, no una solución permanente.

## Relacionado

- [Comenzando](/es/plugins/building-plugins) - construye tu primer complemento
- [Resumen del SDK](/es/plugins/sdk-overview) - referencia completa de importación de subrutas
- [Complementos de canal](/es/plugins/sdk-channel-plugins) - construcción de complementos de canal
- [Complementos de proveedor](/es/plugins/sdk-provider-plugins) - construcción de complementos de proveedor
- [Aspectos internos del complemento](/es/plugins/architecture) - inmersión profunda en la arquitectura
- [Manifiesto del complemento](/es/plugins/manifest) - referencia del esquema del manifiesto
