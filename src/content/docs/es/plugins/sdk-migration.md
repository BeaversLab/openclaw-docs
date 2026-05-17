---
summary: "Migre desde la capa de compatibilidad hacia atrás heredada hasta el SDK de complementos moderno"
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
  de asistentes. Se introdujo para mantener los complementos antiguos basados en hooks funcionando mientras se
  construía la nueva arquitectura de complementos.
- **`openclaw/plugin-sdk/infra-runtime`** - un barril amplio de asistentes de tiempo de ejecución que
  mezclaba eventos del sistema, estado de heartbeat, colas de entrega, asistentes de fetch/proxy,
  asistentes de archivos, tipos de aprobación y utilidades no relacionadas.
- **`openclaw/plugin-sdk/config-runtime`** - un barril amplio de compatibilidad de configuración
  que aún transporta asistentes de carga/escritura directos obsoletos durante la ventana
  de migración.
- **`openclaw/extension-api`** - un puente que otorgaba a los complementos acceso directo a
  los asistentes del lado del host, como el ejecutor de agentes integrados.
- **`api.registerEmbeddedExtensionFactory(...)`** - un hook de extensión incluido, eliminado y solo para Pi,
  que podía observar eventos del ejecutor integrado, como
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
es un módulo pequeño y autosuficiente con un propósito claro y un contrato documentado.

Las capas de conveniencia del proveedor heredado para los canales integrados también han desaparecido.
Las capas de ayuda con marca de canal eran accesos directos privados de mono-repositorio, no contratos de complemento estables.
Utilice subrutas de SDK genéricas y estrechas en su lugar. Dentro del espacio de trabajo del complemento integrado,
mantenga las ayudas propiedad del proveedor en el propio `api.ts` o
`runtime-api.ts` de ese complemento.

Ejemplos actuales de proveedores integrados:

- Anthropic mantiene las ayudas de transmisión específicas de Claude en su propia capa `api.ts` /
  `contract-api.ts`
- OpenAI mantiene los constructores de proveedores, las ayudas de modelos predeterminados y los constructores de proveedores
  de tiempo real en su propio `api.ts`
- OpenRouter mantiene el constructor de proveedores y las ayudas de incorporación/configuración en su propio
  `api.ts`

## Plan de migración de Talk y voz en tiempo real

El código de voz en tiempo real, telefonía, reuniones y Talk del navegador se está moviendo del
registro de turnos local de la superficie a un controlador de sesión Talk compartido exportado por
`openclaw/plugin-sdk/realtime-voice`. El nuevo controlador posee el sobre de eventos común de Talk,
el estado del turno activo, el estado de captura, el estado de audio de salida, el historial de
eventos reciente y el rechazo de turnos obsoletos. Los complementos del proveedor deben seguir siendo propietarios de
las sesiones en tiempo real específicas del proveedor; los complementos de superficie deben seguir siendo propietarios de las peculiaridades de
captura, reproducción, telefonía y reuniones.

Esta migración de Talk es intencionalmente una ruptura limpia:

1. Mantenga los primitivos del controlador/compartido en tiempo real en
   `plugin-sdk/realtime-voice`.
2. Mueva las superficies integradas al controlador compartido: relevo del navegador,
   transferencia de sala administrada, voz en tiempo real de llamada de voz, STT de transmisión de llamada de voz, Google
   Meet en tiempo real y pulsar para hablar nativo.
3. Reemplace las familias antiguas de RPC de Talk con la API final `talk.session.*` y
   `talk.client.*`.
4. Anuncie un canal de eventos Talk en vivo en Gateway
   `hello-ok.features.events`: `talk.event`.
5. Elimine el punto final HTTP en tiempo real anterior y cualquier ruta de anulación de instrucciones
   en el momento de la solicitud.

El código nuevo no debe llamar a `createTalkEventSequencer(...)` directamente a menos que esté implementando un adaptador de bajo nivel o un dispositivo de prueba. Se prefiere el controlador compartido para que los eventos con ámbito de turno no puedan emitirse sin un ID de turno, las llamadas obsoletas a `turnEnd` / `turnCancel` no puedan borrar un turno activo más reciente y los eventos del ciclo de vida del audio de salida se mantengan consistentes a través de telefonía, reuniones, retransmisión del navegador, traspaso de sala administrada y clientes nativos de Talk.

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

Las sesiones de WebRTC/provider-websocket propiedad del navegador usan `talk.client.create`, porque el navegador es propietario de la negociación del proveedor y el transporte de medios, mientras que el Gateway es propietario de las credenciales, las instrucciones y la política de herramientas. `talk.session.*` es la superficie común administrada por el Gateway para retransmisiones en tiempo real del gateway, transcripciones de retransmisión del gateway y sesiones nativas de STT/TTS de sala administrada.

Las configuraciones heredadas que colocaban selectores en tiempo real junto con `talk.provider` / `talk.providers` deben repararse con `openclaw doctor --fix`; el tiempo de ejecución de Talk no reinterpretará la configuración del proveedor de voz/TTS como configuración del proveedor en tiempo real.

Las combinaciones `talk.session.create` admitidas son intencionalmente pocas:

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
| `talk.session.submitToolResult` | `realtime/gateway-relay`                                | Completar una llamada a herramienta de proveedor emitida por el relé; pasar `options.willContinue` para la salida intermedia o `options.suppressResponse` para satisfacer la llamada sin otra respuesta del asistente. |
| `talk.session.close`            | todas las sesiones unificadas                           | Detener las sesiones de relé o revocar el estado de la sala gestionada, y luego olvidar el id de sesión unificada.                                                                                                     |

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

Los mantenedores pueden auditar la cola de migración actual con
`pnpm plugins:boundary-report`. Usa `pnpm plugins:boundary-report:summary` para
recuentos compactos, `--owner <id>` para un complemento o propietario de compatibilidad, y
`pnpm plugins:boundary-report:ci` cuando una puerta de CI deba fallar debido a
registros de compatibilidad vencidos, importaciones reservadas del SDK entre propietarios o subrutas reservadas del SDK
sin usar. El informe agrupa los registros de compatibilidad
deprecados por fecha de eliminación, cuenta las referencias de código/documentos locales,
expone las importaciones reservadas del SDK entre propietarios y resume el
puente SDK privado de host de memoria para que la limpieza de compatibilidad sea explícita en lugar de
confiar en búsquedas ad hoc. Las subrutas reservadas del SDK deben tener un uso de propietario rastreado;
las exportaciones auxiliares reservadas sin usar deben eliminarse del SDK público.

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
    se haya pasado a la ruta de llamada activa. Los controladores de larga duración que necesiten
    la instantánea del proceso actual pueden usar `api.runtime.config.current()`. Las herramientas de
    agentes de larga duración deben usar el `ctx.getRuntimeConfig()` del contexto de la herramienta dentro
    de `execute` para que una herramienta creada antes de una escritura de configuración todavía vea la configuración
    en tiempo de ejecución actualizada.

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

    Use `afterWrite: { mode: "restart", reason: "..." }` cuando quien llama sabe
    que el cambio requiere un reinicio limpio de la puerta de enlace, y
    `afterWrite: { mode: "none", reason: "..." }` solo cuando quien llama es dueño del
    seguimiento y deliberadamente desea suprimir el planificador de recarga.
    Los resultados de la mutación incluyen un resumen tipado `followUp` para pruebas y registro;
    la puerta de enlace sigue siendo responsable de aplicar o programar el reinicio.
    `loadConfig` y `writeConfigFile` permanecen como asistentes de compatibilidad
    obsoletos para complementos externos durante la ventana de migración y advierten una vez con el
    código de compatibilidad `runtime-config-load-write`. Los complementos empaquetados y el código
    en tiempo de ejecución del repositorio están protegidos por guardraíles del escáner en
    `pnpm check:deprecated-api-usage` y
    `pnpm check:no-runtime-action-load-config`: el uso de nuevos complementos de producción
    falla directamente, las escrituras directas de configuración fallan, los métodos del servidor de la puerta de enlace deben usar
    la instantánea en tiempo de ejecución de la solicitud, los asistentes de envío/acción/cliente del canal en tiempo de ejecución
    deben recibir la configuración de su límite, y los módulos en tiempo de ejecución de larga duración tienen
    cero llamadas `loadConfig()` ambientales permitidas.

    El nuevo código de complemento también debe evitar importar el barril de
    compatibilidad amplio `openclaw/plugin-sdk/config-runtime`. Use la
    subruta SDK estrecha que coincida con el trabajo:

    | Necesidad | Importación |
    | --- | --- |
    | Tipos de configuración como `OpenClawConfig` | `openclaw/plugin-sdk/config-contracts` |
    | Aserciones de configuración ya cargadas y búsqueda de configuración de entrada del complemento | `openclaw/plugin-sdk/plugin-config-runtime` |
    | Lecturas de instantánea en tiempo de ejecución actuales | `openclaw/plugin-sdk/runtime-config-snapshot` |
    | Escrituras de configuración | `openclaw/plugin-sdk/config-mutation` |
    | Asistentes de almacén de sesiones | `openclaw/plugin-sdk/session-store-runtime` |
    | Configuración de tabla Markdown | `openclaw/plugin-sdk/markdown-table-runtime` |
    | Asistentes en tiempo de ejecución de política de grupo | `openclaw/plugin-sdk/runtime-group-policy` |
    | Resolución de entrada secreta | `openclaw/plugin-sdk/secret-input-runtime` |
    | Invalidaciones de modelo/sesión | `openclaw/plugin-sdk/model-session-runtime` |

    Los complementos empaquetados y sus pruebas están protegidos por el escáner contra el barril
    amplio para que las importaciones y simulaciones se mantengan locales para el comportamiento que necesitan. El barril
    amplio todavía existe para compatibilidad externa, pero el nuevo código no debe
    depender de él.

  </Step>

  <Step title="Migrar las extensiones de resultados de herramientas de Pi a middleware">
    Los complementos agrupados deben reemplazar los controladores de
    resultados de herramientas `api.registerEmbeddedExtensionFactory(...)` solo de Pi con
    middleware neutral al tiempo de ejecución.

    ```typescript
    // Pi and Codex runtime dynamic tools
    api.registerAgentToolResultMiddleware(async (event) => {
      return compactToolResult(event);
    }, {
      runtimes: ["pi", "codex"],
    });
    ```

    Actualice el manifiesto del complemento al mismo tiempo:

    ```json
    {
      "contracts": {
        "agentToolResultMiddleware": ["pi", "codex"]
      }
    }
    ```

    Los complementos externos no pueden registrar middleware de resultados de herramientas porque puede
    reescribir la salida de herramientas de alta confianza antes de que el modelo la vea.

  </Step>

  <Step title="Migrar los controladores nativos de aprobación a capacidades (capability facts)">
    Los complementos de canal con capacidad de aprobación ahora exponen el comportamiento nativo de aprobación a través de
    `approvalCapability.nativeRuntime` más el registro compartido de contexto de ejecución.

    Cambios clave:

    - Reemplazar `approvalCapability.handler.loadRuntime(...)` con
      `approvalCapability.nativeRuntime`
    - Mover la autenticación/entrega específica de la aprobación fuera de la cableadora heredada `plugin.auth` /
      `plugin.approvals` y sobre `approvalCapability`
    - `ChannelPlugin.approvals` se ha eliminado del contrato público del complemento de canal;
      mueve los campos de entrega/nativo/renderizado a `approvalCapability`
    - `plugin.auth` permanece solo para los flujos de inicio de sesión/cierre de sesión del canal; los ganchos de
      autenticación de aprobación allí ya no son leídos por el núcleo
    - Registrar objetos de tiempo de ejecución propiedad del canal, como clientes, tokens o aplicaciones Bolt,
      a través de `openclaw/plugin-sdk/channel-runtime-context`
    - No envíe avisos de redirección propiedad del complemento desde los controladores nativos de aprobación;
      el núcleo ahora es propietario de los avisos de enrutado a otro lugar desde los resultados reales de entrega
    - Al pasar `channelRuntime` a `createChannelManager(...)`, proporcione una
      superficie `createPluginRuntime().channel` real. Se rechazan los stubs parciales.

    Consulte `/plugins/sdk-channel-plugins` para ver el diseño actual de la capacidad de
    aprobación.

  </Step>

  <Step title="Auditar el comportamiento de reserva del contenedor de Windows">
    Si su complemento usa `openclaw/plugin-sdk/windows-spawn`, los contenedores de Windows sin resolver `.cmd`/`.bat` ahora fallan cerrados a menos que pase explícitamente `allowShellFallback: true`.

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

    Si su interlocutor no depende intencionalmente de la reserva del shell, no configure `allowShellFallback` y maneje el error lanzado en su lugar.

  </Step>

  <Step title="Buscar importaciones obsoletas">
    Busque en su complemento las importaciones de cualquiera de las dos superficies obsoletas:

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

    Para los auxiliares del lado del host, use el tiempo de ejecución del complemento inyectado en lugar de importar directamente:

    ```typescript
    // Before (deprecated extension-api bridge)
    import { runEmbeddedPiAgent } from "openclaw/extension-api";
    const result = await runEmbeddedPiAgent({ sessionId, prompt });

    // After (injected runtime)
    const result = await api.runtime.agent.runEmbeddedPiAgent({ sessionId, prompt });
    ```

    El mismo patrón se aplica a otros auxiliares de puente heredados:

    | Importación antigua | Equivalente moderno |
    | --- | --- |
    | `resolveAgentDir` | `api.runtime.agent.resolveAgentDir` |
    | `resolveAgentWorkspaceDir` | `api.runtime.agent.resolveAgentWorkspaceDir` |
    | `resolveAgentIdentity` | `api.runtime.agent.resolveAgentIdentity` |
    | `resolveThinkingDefault` | `api.runtime.agent.resolveThinkingDefault` |
    | `resolveAgentTimeoutMs` | `api.runtime.agent.resolveAgentTimeoutMs` |
    | `ensureAgentWorkspace` | `api.runtime.agent.ensureAgentWorkspace` |
    | auxiliares de la tienda de sesión | `api.runtime.agent.session.*` |

  </Step>

  <Step title="Reemplazar importaciones amplias de infra-runtime">
    `openclaw/plugin-sdk/infra-runtime` todavía existe por compatibilidad
    externa, pero el código nuevo debería importar la superficie de ayuda enfocada que
    realmente necesita:

    | Necesidad | Importar |
    | --- | --- |
    | Ayudantes de cola de eventos del sistema | `openclaw/plugin-sdk/system-event-runtime` |
    | Ayudantes de despertar de latido, evento y visibilidad | `openclaw/plugin-sdk/heartbeat-runtime` |
    | Drenaje de cola de entrega pendiente | `openclaw/plugin-sdk/delivery-queue-runtime` |
    | Telemetría de actividad del canal | `openclaw/plugin-sdk/channel-activity-runtime` |
    | Cachés de deduplicación en memoria | `openclaw/plugin-sdk/dedupe-runtime` |
    | Ayudantes de ruta segura para archivos locales/multimedia | `openclaw/plugin-sdk/file-access-runtime` |
    | Fetch con conocimiento del despachador | `openclaw/plugin-sdk/runtime-fetch` |
    | Ayudantes de fetch proxy y protegido | `openclaw/plugin-sdk/fetch-runtime` |
    | Tipos de política de despachador SSRF | `openclaw/plugin-sdk/ssrf-dispatcher` |
    | Tipos de solicitud/resolución de aprobación | `openclaw/plugin-sdk/approval-runtime` |
    | Ayudantes de carga útil de respuesta de aprobación y comandos | `openclaw/plugin-sdk/approval-reply-runtime` |
    | Ayudantes de formato de error | `openclaw/plugin-sdk/error-runtime` |
    | Esperas de preparación del transporte | `openclaw/plugin-sdk/transport-ready-runtime` |
    | Ayudantes de token seguro | `openclaw/plugin-sdk/secure-random-runtime` |
    | Concurrencia de tareas asíncronas delimitada | `openclaw/plugin-sdk/concurrency-runtime` |
    | Coerción numérica | `openclaw/plugin-sdk/number-runtime` |
    | Bloqueo asíncrono local de proceso | `openclaw/plugin-sdk/async-lock-runtime` |
    | Bloqueos de archivo | `openclaw/plugin-sdk/file-lock` |

    Los plugins incluidos están protegidos por escáner contra `infra-runtime`, por lo que el código del repositorio
    no puede regresar al barril amplio.

  </Step>

  <Step title="Migrar los asistentes de ruta de canal">
    El nuevo código de ruta de canal debe usar `openclaw/plugin-sdk/channel-route`.
    Los nombres más antiguos de route-key y comparable-target permanecen como alias
    de compatibilidad durante el período de migración, pero los nuevos complementos deben usar los nombres de ruta
    que describen el comportamiento directamente:

    | Asistente antiguo | Asistente moderno |
    | --- | --- |
    | `channelRouteIdentityKey(...)` | `channelRouteDedupeKey(...)` |
    | `channelRouteKey(...)` | `channelRouteCompactKey(...)` |
    | `ComparableChannelTarget` | `ChannelRouteParsedTarget` |
    | `resolveComparableTargetForChannel(...)` | `resolveRouteTargetForChannel(...)` |
    | `resolveComparableTargetForLoadedChannel(...)` | `resolveRouteTargetForLoadedChannel(...)` |
    | `comparableChannelTargetsMatch(...)` | `channelRouteTargetsMatchExact(...)` |
    | `comparableChannelTargetsShareRoute(...)` | `channelRouteTargetsShareConversation(...)` |

    Los asistentes de ruta modernos normalizan `{ channel, to, accountId, threadId }`
    de manera consistente en aprobaciones nativas, supresión de respuestas, deduplicación entrante,
    entrega cron y enrutamiento de sesión. Si su complemento posee una gramática de objetivo
    personalizada, use `resolveChannelRouteTargetWithParser(...)` para adaptar ese
    analizador al mismo contrato de objetivo de ruta.

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
  | Ruta de importación | Propósito | Exportaciones clave | | --- | --- | --- | | `plugin-sdk/plugin-entry` | Asistente de entrada de complemento canónico | `definePluginEntry` | | `plugin-sdk/core` | Reexportación paraguas heredada para definiciones/constructores de entrada de canal | `defineChannelPluginEntry`, `createChatChannelPlugin` | | `plugin-sdk/config-schema` | Exportación de esquema de
  configuración raíz | `OpenClawSchema` | | `plugin-sdk/provider-entry` | Asistente de entrada de proveedor único | `defineSingleProviderPluginEntry` | | `plugin-sdk/channel-core` | Definiciones y constructores de entrada de canal enfocados | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` | | `plugin-sdk/setup` | Asistentes compartidos
  del asistente de configuración | Prompts de lista de permitidos, constructores de estado de configuración | | `plugin-sdk/setup-runtime` | Asistentes de tiempo de ejecución de configuración | Adaptadores de parches de configuración seguros para importar, asistentes de notas de búsqueda, `promptResolvedAllowFrom`, `splitSetupEntries`, proxies de configuración delegados | |
  `plugin-sdk/setup-adapter-runtime` | Alias de adaptador de configuración obsoleto | Use `plugin-sdk/setup-runtime` | | `plugin-sdk/setup-tools` | Asistentes de herramientas de configuración | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` | | `plugin-sdk/account-core` | Asistentes multicuenta | Asistentes de
  lista/configuración/acción de puerta de cuenta | | `plugin-sdk/account-id` | Asistentes de ID de cuenta | `DEFAULT_ACCOUNT_ID`, normalización de ID de cuenta | | `plugin-sdk/account-resolution` | Asistentes de búsqueda de cuenta | Asistentes de búsqueda de cuenta + valores predeterminados de reserva | | `plugin-sdk/account-helpers` | Asistentes de cuenta estrechos | Asistentes de lista de
  cuenta/acción de cuenta | | `plugin-sdk/channel-setup` | Adaptadores del asistente de configuración | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`, más `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` | | `plugin-sdk/channel-pairing` | Primitivas de emparejamiento MD |
  `createChannelPairingController` | | `plugin-sdk/channel-reply-pipeline` | Prefijo de respuesta, escritura y cableado de entrega de origen | `createChannelReplyPipeline`, `resolveChannelSourceReplyDeliveryMode` | | `plugin-sdk/channel-config-helpers` | Fábricas de adaptadores de configuración y asistentes de acceso MD | `createHybridChannelConfigAdapter`, `resolveChannelDmAccess`,
  `resolveChannelDmAllowFrom`, `resolveChannelDmPolicy`, `normalizeChannelDmPolicy`, `normalizeLegacyDmAliases` | | `plugin-sdk/channel-config-schema` | Constructores de esquema de configuración | Primitivas de esquema de configuración de canal compartido y solo el constructor genérico | | `plugin-sdk/bundled-channel-config-schema` | Esquemas de configuración empaquetados | Solo para complementos
  empaquetados mantenidos por OpenClaw; los nuevos complementos deben definir esquemas locales del complemento | | `plugin-sdk/channel-config-schema-legacy` | Esquemas de configuración empaquetados obsoletos | Solo alias de compatibilidad; use `plugin-sdk/bundled-channel-config-schema` para complementos empaquetados mantenidos | | `plugin-sdk/telegram-command-config` | Asistentes de configuración
  de comandos de Telegram | Normalización de nombre de comando, recorte de descripción, validación de duplicados/conflictos | | `plugin-sdk/channel-policy` | Resolución de política de grupo/MD | `resolveChannelGroupRequireMention` | | `plugin-sdk/channel-lifecycle` | Asistentes de ciclo de vida de estado de cuenta y flujo de borrador | `createAccountStatusSink`, asistentes de finalización de vista
  previa de borrador | | `plugin-sdk/inbound-envelope` | Asistentes de sobre entrante | Asistentes compartidos de ruta + constructor de sobre | | `plugin-sdk/inbound-reply-dispatch` | Asistentes de respuesta entrante | Asistentes compartidos de registro y despacho | | `plugin-sdk/messaging-targets` | Análisis de destino de mensajería | Asistentes de análisis/coincidencia de destino | |
  `plugin-sdk/outbound-media` | Asistentes de medios salientes | Carga de medios salientes compartida | | `plugin-sdk/outbound-send-deps` | Asistentes de dependencia de envío saliente | Búsqueda ligera de `resolveOutboundSendDep` sin importar el tiempo de ejecución saliente completo | | `plugin-sdk/outbound-runtime` | Asistentes de tiempo de ejecución saliente | Asistentes de entrega saliente,
  delegado de identidad/envío, sesión, formato y planificación de carga útil | | `plugin-sdk/thread-bindings-runtime` | Asistentes de enlace de hilos | Asistentes de ciclo de vida y adaptador de enlace de hilos | | `plugin-sdk/agent-media-payload` | Asistentes de carga útil de medios heredados | Constructor de carga útil de medios de agente para diseños de campo heredados | |
  `plugin-sdk/channel-runtime` | Shim de compatibilidad obsoleto | Solo utilidades de tiempo de ejecución de canal heredadas | | `plugin-sdk/channel-send-result` | Tipos de resultado de envío | Tipos de resultado de respuesta | | `plugin-sdk/runtime-store` | Almacenamiento persistente de complementos | `createPluginRuntimeStore` | | `plugin-sdk/runtime` | Asistentes amplios de tiempo de ejecución
  | Asistentes de tiempo de ejecución/registro/respaldo/instalación de complementos | | `plugin-sdk/runtime-env` | Asistentes de entorno de tiempo de ejecución estrechos | Registrador/entorno de tiempo de ejecución, tiempo de espera, reintento y asistentes de retroceso | | `plugin-sdk/plugin-runtime` | Asistentes compartidos de tiempo de ejecución de complementos | Asistentes de
  comandos/ganchos/http/interactivos de complementos | | `plugin-sdk/hook-runtime` | Asistentes de canalización de ganchos | Asistentes compartidos de canalización de webhooks/ganchos internos | | `plugin-sdk/lazy-runtime` | Asistentes de tiempo de ejecución diferidos | `createLazyRuntimeModule`, `createLazyRuntimeMethod`, `createLazyRuntimeMethodBinder`, `createLazyRuntimeNamedExport`,
  `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | Asistentes de proceso | Asistentes compartidos de ejecución | | `plugin-sdk/cli-runtime` | Asistentes de tiempo de ejecución de CLI | Formato de comandos, esperas, asistentes de versión | | `plugin-sdk/gateway-runtime` | Asistentes de puerta de enlace | Cliente de puerta de enlace, asistente de inicio listo para bucle de eventos y
  asistentes de parches de estado de canal | | `plugin-sdk/config-runtime` | Shim de compatibilidad de configuración obsoleto | Prefiera `config-contracts`, `plugin-config-runtime`, `runtime-config-snapshot` y `config-mutation` | | `plugin-sdk/telegram-command-config` | Asistentes de comandos de Telegram | Asistentes de validación de comandos de Telegram estables de reserva cuando la superficie
  del contrato de Telegram empaquetado no está disponible | | `plugin-sdk/approval-runtime` | Asistentes de solicitud de aprobación | Carga útil de aprobación de ejec/complemento, asistentes de capacidad/perfil de aprobación, asistentes de enrutamiento/tiempo de ejecución de aprobación nativa y formateo de ruta de visualización de aprobación estructurada | | `plugin-sdk/approval-auth-runtime` |
  Asistentes de autenticación de aprobación | Resolución del aprobador, autenticación de acción del mismo chat | | `plugin-sdk/approval-client-runtime` | Asistentes de cliente de aprobación | Asistentes de perfil/filtro de aprobación de ejecución nativa | | `plugin-sdk/approval-delivery-runtime` | Asistentes de entrega de aprobación | Adaptadores de capacidad/entrega de aprobación nativa | |
  `plugin-sdk/approval-gateway-runtime` | Asistentes de puerta de enlace de aprobación | Asistente compartido de resolución de puerta de enlace de aprobación | | `plugin-sdk/approval-handler-adapter-runtime` | Asistentes de adaptador de aprobación | Asistentes ligeros de carga de adaptadores de aprobación nativos para puntos de entrada de canal en caliente | | `plugin-sdk/approval-handler-runtime`
  | Asistentes de controlador de aprobación | Asistentes de tiempo de ejecución más amplios del controlador de aprobación; prefiera las costuras de adaptador/puerta de enlace más estrechas cuando sean suficientes | | `plugin-sdk/approval-native-runtime` | Asistentes de destino de aprobación | Asistentes de vinculación de destino/cuenta de aprobación nativa | | `plugin-sdk/approval-reply-runtime` |
  Asistentes de respuesta de aprobación | Asistentes de carga útil de respuesta de aprobación de ejec/complemento | | `plugin-sdk/channel-runtime-context` | Asistentes de contexto de tiempo de ejecución del canal | Asistentes compartidos de registro/obtención/observación de contexto de tiempo de ejecución de canal genérico | | `plugin-sdk/security-runtime` | Asistentes de seguridad | Asistentes
  compartidos de confianza, bloqueo de MD, archivo/ruta limitados a la raíz, contenido externo y colección de secretos | | `plugin-sdk/ssrf-policy` | Asistentes de política SSRF | Asistentes de lista de permitidos de host y política de red privada | | `plugin-sdk/ssrf-runtime` | Asistentes de tiempo de ejecución SSRF | Despachador anclado, búsqueda protegida, asistentes de política SSRF | |
  `plugin-sdk/system-event-runtime` | Asistentes de eventos del sistema | `enqueueSystemEvent`, `peekSystemEventEntries` | | `plugin-sdk/heartbeat-runtime` | Asistentes de latido | Asistentes de activación, evento y visibilidad de latido | | `plugin-sdk/delivery-queue-runtime` | Asistentes de cola de entrega | `drainPendingDeliveries` | | `plugin-sdk/channel-activity-runtime` | Asistentes de
  actividad del canal | `recordChannelActivity` | | `plugin-sdk/dedupe-runtime` | Asistentes de deduplicación | Cachés de deduplicación en memoria | | `plugin-sdk/file-access-runtime` | Asistentes de acceso a archivos | Asistentes seguros de ruta de archivo/medios local | | `plugin-sdk/transport-ready-runtime` | Asistentes de preparación del transporte | `waitForTransportReady` | |
  `plugin-sdk/collection-runtime` | Asistentes de caché limitado | `pruneMapToMaxSize` | | `plugin-sdk/diagnostic-runtime` | Asistentes de bloqueo de diagnóstico | `isDiagnosticFlagEnabled`, `isDiagnosticsEnabled` | | `plugin-sdk/error-runtime` | Asistentes de formato de error | `formatUncaughtError`, `isApprovalNotFoundError`, asistentes de gráfico de errores | | `plugin-sdk/fetch-runtime` |
  Asistentes de búsqueda/proxy envueltos | `resolveFetch`, asistentes de proxy, asistentes de opción EnvHttpProxyAgent | | `plugin-sdk/host-runtime` | Asistentes de normalización de host | `normalizeHostname`, `normalizeScpRemoteHost` | | `plugin-sdk/retry-runtime` | Asistentes de reintento | `RetryConfig`, `retryAsync`, ejecutores de políticas | | `plugin-sdk/allow-from` | Formato de lista de
  permitidos | `formatAllowFromLowercase` | | `plugin-sdk/allowlist-resolution` | Mapeo de entrada de lista de permitidos | `mapAllowlistResolutionInputs` | | `plugin-sdk/command-auth` | Asistentes de bloqueo y superficie de comandos | `resolveControlCommandGate`, asistentes de autorización del remitente, asistentes de registro de comandos que incluyen el formato de menú de argumentos dinámicos |
  | `plugin-sdk/command-status` | Representadores de estado/ayuda de comandos | `buildCommandsMessage`, `buildCommandsMessagePaginated`, `buildHelpMessage` | | `plugin-sdk/secret-input` | Análisis de entrada secreta | Asistentes de entrada secreta | | `plugin-sdk/webhook-ingress` | Asistentes de solicitudes de webhooks | Utilidades de destino de webhooks | | `plugin-sdk/webhook-request-guards` |
  Asistentes de guardia de cuerpo de webhook | Asistentes de lectura/limite de cuerpo de solicitud | | `plugin-sdk/reply-runtime` | Tiempo de ejecución de respuesta compartida | Despacho entrante, latido, planificador de respuesta, fragmentación | | `plugin-sdk/reply-dispatch-runtime` | Asistentes de despacho de respuesta estrechos | Finalizar, despacho de proveedor y asistentes de etiqueta de
  conversación | | `plugin-sdk/reply-history` | Asistentes de historial de respuesta | `buildHistoryContext`, `buildPendingHistoryContextFromMap`, `recordPendingHistoryEntry`, `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | Planificación de referencia de respuesta | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | Asistentes de fragmento de respuesta | Asistentes
  de fragmentación de texto/markdown | | `plugin-sdk/session-store-runtime` | Asistentes de almacén de sesiones | Asistentes de ruta de almacén + actualizado en | | `plugin-sdk/state-paths` | Asistentes de ruta de estado | Asistentes de directorio de estado y OAuth | | `plugin-sdk/routing` | Asistentes de enrutamiento/clave de sesión | `resolveAgentRoute`, `buildAgentSessionKey`,
  `resolveDefaultAgentBoundAccountId`, asistentes de normalización de clave de sesión | | `plugin-sdk/status-helpers` | Asistentes de estado del canal | Constructores de resumen de estado de canal/cuenta, valores predeterminados de estado de tiempo de ejecución, asistentes de metadatos de problemas | | `plugin-sdk/target-resolver-runtime` | Asistentes de resolución de destino | Asistentes
  compartidos de resolución de destino | | `plugin-sdk/string-normalization-runtime` | Asistentes de normalización de cadenas | Asistentes de normalización de slug/cadena | | `plugin-sdk/request-url` | Asistentes de URL de solicitud | Extraer URL de cadena de entradas tipo solicitud | | `plugin-sdk/run-command` | Asistentes de comandos cronometrados | Ejecutor de comandos cronometrados con
  stdout/stderr normalizados | | `plugin-sdk/param-readers` | Lectores de parámetros | Lectores comunes de parámetros de herramienta/CLI | | `plugin-sdk/tool-payload` | Extracción de carga útil de herramienta | Extraer cargas útiles normalizadas de objetos de resultado de herramienta | | `plugin-sdk/tool-send` | Extracción de envío de herramienta | Extraer campos de destino de envío canónicos de
  argumentos de herramienta | | `plugin-sdk/temp-path` | Asistentes de ruta temporal | Asistentes compartidos de ruta de descarga temporal | | `plugin-sdk/logging-core` | Asistentes de registro | Asistentes de registrador y redacción de subsistemas | | `plugin-sdk/markdown-table-runtime` | Asistentes de tabla Markdown | Asistentes de modo de tabla Markdown | | `plugin-sdk/reply-payload` | Tipos de
  respuesta de mensaje | Tipos de carga útil de respuesta | | `plugin-sdk/provider-setup` | Asistentes de configuración de proveedor local/autohospedado curados | Asistentes de descubrimiento/configuración de proveedor autohospedado | | `plugin-sdk/self-hosted-provider-setup` | Asistentes de configuración de proveedor autohospedado compatible con OpenAI enfocado | Mismos asistentes de
  descubrimiento/configuración de proveedor autohospedado | | `plugin-sdk/provider-auth-runtime` | Asistentes de autenticación de tiempo de ejecución de proveedor | Asistentes de resolución de clave de API de tiempo de ejecución | | `plugin-sdk/provider-auth-api-key` | Asistentes de configuración de clave de API de proveedor | Asistentes de escritura de perfil/incorporación de clave de API | |
  `plugin-sdk/provider-auth-result` | Asistentes de resultado de autenticación de proveedor | Constructor de resultado de autenticación OAuth estándar | | `plugin-sdk/provider-selection-runtime` | Asistentes de selección de proveedor | Selección de proveedor configurado o automático y combinación de configuración de proveedor sin procesar | | `plugin-sdk/provider-env-vars` | Asistentes de variable
  de entorno de proveedor | Asistentes de búsqueda de variable de entorno de autenticación de proveedor | | `plugin-sdk/provider-model-shared` | Asistentes compartidos de modelo/reproducción de proveedor | `ProviderReplayFamily`, `buildProviderReplayFamilyHooks`, `normalizeModelCompat`, constructores compartidos de política de reproducción, asistentes de punto final de proveedor y asistentes de
  normalización de ID de modelo | | `plugin-sdk/provider-catalog-shared` | Asistentes compartidos de catálogo de proveedor | `findCatalogTemplate`, `buildSingleProviderApiKeyCatalog`, `buildManifestModelProviderConfig`, `supportsNativeStreamingUsageCompat`, `applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-onboard` | Parches de incorporación de proveedor | Asistentes de
  configuración de incorporación | | `plugin-sdk/provider-http` | Asistentes HTTP de proveedor | Asistentes genéricos de capacidad HTTP/punto final de proveedor, incluidos asistentes de formulario multiparte de transcripción de audio | | `plugin-sdk/provider-web-fetch` | Asistentes de búsqueda web de proveedor | Asistentes de registro/caché de proveedor de búsqueda web | |
  `plugin-sdk/provider-web-search-config-contract` | Asistentes de configuración de búsqueda web de proveedor | Asistentes estrechos de configuración/credencial de búsqueda web para proveedores que no necesitan cableado de habilitación de complemento | | `plugin-sdk/provider-web-search-contract` | Asistentes de contrato de búsqueda web de proveedor | Asistentes de contrato de
  configuración/credencial de búsqueda web estrechos como `createWebSearchProviderContractFields`, `enablePluginInConfig`, `resolveProviderWebSearchPluginConfig` y establecedores/obtenedores de credenciales con alcance | | `plugin-sdk/provider-web-search` | Asistentes de búsqueda web de proveedor | Asistentes de registro/caché/tiempo de ejecución de proveedor de búsqueda web | |
  `plugin-sdk/provider-tools` | Asistentes de compatibilidad de herramienta/esquema de proveedor | `ProviderToolCompatFamily`, `buildProviderToolCompatFamilyHooks` y limpieza de esquema de Gemini + diagnósticos | | `plugin-sdk/provider-usage` | Asistentes de uso de proveedor | `fetchClaudeUsage`, `fetchGeminiUsage`, `fetchGithubCopilotUsage` y otros asistentes de uso de proveedor | |
  `plugin-sdk/provider-stream` | Asistentes de envoltorio de flujo de proveedor | `ProviderStreamFamily`, `buildProviderStreamFamilyHooks`, `composeProviderStreamWrappers`, tipos de envoltorio de flujo y asistentes compartidos de envoltorio Anthropic/Bedrock/DeepSeek V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot | | `plugin-sdk/provider-transport-runtime` | Asistentes de
  transporte de proveedor | Asistentes de transporte de proveedor nativo como búsqueda protegida, transformaciones de mensajes de transporte y flujos de eventos de transporte escribibles | | `plugin-sdk/keyed-async-queue` | Cola asíncrona ordenada | `KeyedAsyncQueue` | | `plugin-sdk/media-runtime` | Asistentes compartidos de medios | Asistentes de búsqueda/transformación/almacenamiento de medios,
  sondeo de dimensiones de video respaldado por ffprobe y constructores de carga útil de medios | | `plugin-sdk/media-generation-runtime` | Asistentes compartidos de generación de medios | Asistentes compartidos de conmutación por error, selección de candidatos y mensajería de modelo faltante para generación de imagen/video/música | | `plugin-sdk/media-understanding` | Asistentes de comprensión de
  medios | Tipos de proveedor de comprensión de medios más exportaciones de asistentes de imagen/audio orientadas al proveedor | | `plugin-sdk/text-runtime` | Exportación de compatibilidad de texto amplio obsoleta | Use `string-coerce-runtime`, `text-chunking`, `text-utility-runtime` y `logging-core` | | `plugin-sdk/text-chunking` | Asistentes de fragmentación de texto | Asistente de fragmentación
  de texto saliente | | `plugin-sdk/speech` | Asistentes de voz | Tipos de proveedor de voz más asistentes de directiva, registro y validación orientados al proveedor, y constructor TTS compatible con OpenAI | | `plugin-sdk/speech-core` | Núcleo de voz compartido | Tipos de proveedor de voz, registro, directivas, normalización | | `plugin-sdk/realtime-transcription` | Asistentes de transcripción
  en tiempo real | Tipos de proveedor, asistentes de registro y asistente compartido de sesión WebSocket | | `plugin-sdk/realtime-voice` | Asistentes de voz en tiempo real | Tipos de proveedor, asistentes de registro/resolución, asistentes de sesión de puente, colas compartidas de respuesta del agente, salud de transcripción/evento, supresión de eco y asistentes de consulta de contexto rápido | |
  `plugin-sdk/image-generation` | Asistentes de generación de imágenes | Tipos de proveedor de generación de imágenes más asistentes de activo/URL de datos de imágenes y el constructor de proveedor de imágenes compatible con OpenAI | | `plugin-sdk/image-generation-core` | Núcleo de generación de imágenes compartido | Tipos de generación de imágenes, conmutación por error, autenticación y
  asistentes de registro | | `plugin-sdk/music-generation` | Asistentes de generación de música | Tipos de proveedor/solicitud/resultado de generación de música | | `plugin-sdk/music-generation-core` | Núcleo de generación de música compartido | Tipos de generación de música, asistentes de conmutación por error, búsqueda de proveedor y análisis de referencia de modelo | |
  `plugin-sdk/video-generation` | Asistentes de generación de video | Tipos de proveedor/solicitud/resultado de generación de video | | `plugin-sdk/video-generation-core` | Núcleo de generación de video compartido | Tipos de generación de video, asistentes de conmutación por error, búsqueda de proveedor y análisis de referencia de modelo | | `plugin-sdk/interactive-runtime` | Asistentes de
  respuesta interactiva | Normalización/reducción de carga útil de respuesta interactiva | | `plugin-sdk/channel-config-primitives` | Primitivas de configuración de canal | Primitivas estrechas de esquema de configuración de canal | | `plugin-sdk/channel-config-writes` | Asistentes de escritura de configuración de canal | Asistentes de autorización de escritura de configuración de canal | |
  `plugin-sdk/channel-plugin-common` | Preludio compartido de canal | Exportaciones compartidas de preludio de complemento de canal | | `plugin-sdk/channel-status` | Asistentes de estado del canal | Asistentes compartidos de instantánea/resumen de estado de canal | | `plugin-sdk/allowlist-config-edit` | Asistentes de configuración de lista de permitidos | Asistentes de edición/lectura de
  configuración de lista de permitidos | | `plugin-sdk/group-access` | Asistentes de acceso a grupos | Asistentes compartidos de decisión de acceso a grupos | | `plugin-sdk/direct-dm` | Asistentes de MD directo | Asistentes compartidos de aut/guardia de MD directo | | `plugin-sdk/extension-shared` | Asistentes compartidos de extensión | Primitivas de asistente de proxy pasivo de canal/estado y
  ambiental | | `plugin-sdk/webhook-targets` | Asistentes de destino de webhook | Asistentes de registro de destino de webhook e instalación de ruta | | `plugin-sdk/webhook-path` | Alias de ruta de webhook obsoleto | Use `plugin-sdk/webhook-ingress` | | `plugin-sdk/web-media` | Asistentes compartidos de medios web | Asistentes de carga de medios remotos/locale | | `plugin-sdk/zod` | Reexportación
  de compatibilidad Zod obsoleta | Importe `zod` desde `zod` directamente | | `plugin-sdk/memory-core` | Asistentes de núcleo de memoria empaquetados | Superficie de asistente de administrador/configuración/archivo/CLI de memoria | | `plugin-sdk/memory-core-engine-runtime` | Fachada de tiempo de ejecución del motor de memoria | Fachada de tiempo de ejecución de índice/búsqueda de memoria | |
  `plugin-sdk/memory-core-host-engine-foundation` | Motor base del host de memoria | Exportaciones del motor base del host de memoria | | `plugin-sdk/memory-core-host-engine-embeddings` | Motor de incrustación del host de memoria | Contratos de incrustación de memoria, acceso al registro, proveedor local y asistentes genéricos de procesamiento por lotes/remoto; los proveedores remotos concretos
  viven en sus complementos propietarios | | `plugin-sdk/memory-core-host-engine-qmd` | Motor QMD del host de memoria | Exportaciones del motor QMD del host de memoria | | `plugin-sdk/memory-core-host-engine-storage` | Motor de almacenamiento del host de memoria | Exportaciones del motor de almacenamiento del host de memoria | | `plugin-sdk/memory-core-host-multimodal` | Asistentes multimodales
  del host de memoria | Asistentes multimodales del host de memoria | | `plugin-sdk/memory-core-host-query` | Asistentes de consulta del host de memoria | Asistentes de consulta del host de memoria | | `plugin-sdk/memory-core-host-secret` | Asistentes secretos del host de memoria | Asistentes secretos del host de memoria | | `plugin-sdk/memory-core-host-events` | Alias de evento de memoria
  obsoleto | Use `plugin-sdk/memory-host-events` | | `plugin-sdk/memory-core-host-status` | Asistentes de estado del host de memoria | Asistentes de estado del host de memoria | | `plugin-sdk/memory-core-host-runtime-cli` | Tiempo de ejecución de CLI del host de memoria | Asistentes de tiempo de ejecución de CLI del host de memoria | | `plugin-sdk/memory-core-host-runtime-core` | Tiempo de
  ejecución principal del host de memoria | Asistentes de tiempo de ejecución principal del host de memoria | | `plugin-sdk/memory-core-host-runtime-files` | Asistentes de archivo/tiempo de ejecución del host de memoria | Asistentes de archivo/tiempo de ejecución del host de memoria | | `plugin-sdk/memory-host-core` | Alias de tiempo de ejecución principal del host de memoria | Alias neutral del
  proveedor para asistentes de tiempo de ejecución principal del host de memoria | | `plugin-sdk/memory-host-events` | Alias de diario de eventos del host de memoria | Alias neutral del proveedor para asistentes de diario de eventos del host de memoria | | `plugin-sdk/memory-host-files` | Alias de archivo/tiempo de ejecución de memoria obsoleto | Use `plugin-sdk/memory-core-host-runtime-files` | |
  `plugin-sdk/memory-host-markdown` | Asistentes de markdown administrado | Asistentes compartidos de markdown administrado para complementos adyacentes a la memoria | | `plugin-sdk/memory-host-search` | Fachada de búsqueda de memoria activa | Fachada de tiempo de ejecución diferida del administrador de búsqueda de memoria activa | | `plugin-sdk/memory-host-status` | Alias de estado del host de
  memoria obsoleto | Use `plugin-sdk/memory-core-host-status` | | `plugin-sdk/testing` | Utilidades de prueba | Barril de compatibilidad obsoleto local del repositorio; use subrutas de prueba locales enfocadas como `plugin-sdk/plugin-test-runtime`, `plugin-sdk/channel-test-helpers`, `plugin-sdk/channel-target-testing`, `plugin-sdk/test-env` y `plugin-sdk/test-fixtures` |
</Accordion>

Esta tabla es intencionalmente el subconjunto común de migración, no la superficie completa del SDK. El inventario del punto de entrada del compilador reside en `scripts/lib/plugin-sdk-entrypoints.json`; las exportaciones del paquete se generan a partir del subconjunto público.

Las costuras de ayuda reservadas para complementos agrupados se han retirado del mapa de exportación del SDK público, excepto para las fachadas de compatibilidad documentadas explícitamente, como el shim `plugin-sdk/discord` en desuso que se conserva para el paquete publicado `@openclaw/discord@2026.3.13`. Los ayudantes específicos del propietario residen dentro del paquete del complemento propietario; el comportamiento compartido del host debe moverse a través de contratos genéricos del SDK como `plugin-sdk/gateway-runtime`, `plugin-sdk/security-runtime` y `plugin-sdk/plugin-config-runtime`.

Utilice la importación más estrecha que coincida con la tarea. Si no puede encontrar una exportación, verifique el código fuente en `src/plugin-sdk/` o pregunte a los mantenedores qué contrato genérico debería ser el propietario.

## Obsolescencias activas

Obsolescencias más específicas que se aplican en todo el SDK del complemento, el contrato del proveedor, la superficie de tiempo de ejecución y el manifiesto. Cada una todavía funciona hoy, pero se eliminará en una versión principal futura. La entrada debajo de cada elemento asigna la API anterior a su reemplazo canónico.

<AccordionGroup>
  <Accordion title="ayuda para autenticación de comandos → estado del comando">
    **Antiguo (`openclaw/plugin-sdk/command-auth`)**: `buildCommandsMessage`,
    `buildCommandsMessagePaginated`, `buildHelpMessage`.

    **Nuevo (`openclaw/plugin-sdk/command-status`)**: mismas firmas, mismas
    exportaciones, solo importadas desde la sub-ruta más estrecha. `command-auth`
    las reexporta como stubs de compatibilidad.

    ```typescript
    // Before
    import { buildHelpMessage } from "openclaw/plugin-sdk/command-auth";

    // After
    import { buildHelpMessage } from "openclaw/plugin-sdk/command-status";
    ```

  </Accordion>

  <Accordion title="ayudantes de bloqueo de menciones → resolveInboundMentionDecision">
    **Antiguo**: `resolveInboundMentionRequirement({ facts, policy })` y
    `shouldDropInboundForMention(...)` de
    `openclaw/plugin-sdk/channel-inbound` o
    `openclaw/plugin-sdk/channel-mention-gating`.

    **Nuevo**: `resolveInboundMentionDecision({ facts, policy })` - devuelve un
    único objeto de decisión en lugar de dos llamadas separadas.

    Los complementos de canal descendentes (Slack, Discord, Matrix, MS Teams) ya han
    cambiado.

  </Accordion>

  <Accordion title="Channel runtime shim and channel actions helpers">
    `openclaw/plugin-sdk/channel-runtime` es una capa de compatibilidad para complementos
    de canal antiguos. No lo importe en código nuevo; use
    `openclaw/plugin-sdk/channel-runtime-context` para registrar objetos en tiempo
    de ejecución.

    Los auxiliares `channelActions*` en `openclaw/plugin-sdk/channel-actions` están
    obsoletos junto con las exportaciones de canal de "acciones" sin procesar. Exponga las capacidades
    a través de la superficie semántica `presentation` en su lugar: los complementos
    de canal declaran lo que renderizan (tarjetas, botones, selecciones) en lugar de qué nombres
    de acciones sin procesar aceptan.

  </Accordion>

  <Accordion title="Web search provider tool() helper → createTool() on the plugin">
    **Antiguo**: fábrica `tool()` de `openclaw/plugin-sdk/provider-web-search`.

    **Nuevo**: implemente `createTool(...)` directamente en el complemento del proveedor.
    OpenClaw ya no necesita el auxiliar del SDK para registrar el contenedor de la herramienta.

  </Accordion>

  <Accordion title="Plaintext channel envelopes → BodyForAgent">
    **Antiguo**: `formatInboundEnvelope(...)` (y
    `ChannelMessageForAgent.channelEnvelope`) para construir un sobre de
    solicitud de texto plano simple a partir de mensajes entrantes del canal.

    **Nuevo**: `BodyForAgent` más bloques de contexto de usuario estructurados. Los complementos
    de canal adjuntan metadatos de enrutamiento (hilo, tema, responder a, reacciones) como
    campos tipificados en lugar de concatenarlos en una cadena de solicitud. El
    auxiliar `formatAgentEnvelope(...)` todavía es compatible con sobres
    sintetizados orientados al asistente, pero los sobres de texto plano entrantes están en
    vías de desaparición.

    Áreas afectadas: `inbound_claim`, `message_received` y cualquier complemento
    de canal personalizado que haya procesado posteriormente el texto `channelEnvelope`.

  </Accordion>

  <Accordion title="Tipos de descubrimiento de proveedores → tipos de catálogo de proveedores">
    Cuatro alias de tipo de descubrimiento son ahora envoltorios finos sobre los
    tipos de la era del catálogo:

    | Alias anterior                 | Nuevo tipo                  |
    | ------------------------- | ------------------------- |
    | `ProviderDiscoveryOrder`  | `ProviderCatalogOrder`    |
    | `ProviderDiscoveryContext`| `ProviderCatalogContext`  |
    | `ProviderDiscoveryResult` | `ProviderCatalogResult`   |
    | `ProviderPluginDiscovery` | `ProviderPluginCatalog`   |

    Además, la bolsa estática `ProviderCapabilities` heredada: los complementos del proveedor
    deben usar hooks de proveedor explícitos como `buildReplayPolicy`,
    `normalizeToolSchemas` y `wrapStreamFn` en lugar de un objeto estático.

  </Accordion>

  <Accordion title="Hooks de política de pensamiento → resolveThinkingProfile">
    **Antiguo** (tres hooks separados en `ProviderThinkingPolicy`):
    `isBinaryThinking(ctx)`, `supportsXHighThinking(ctx)` y
    `resolveDefaultThinkingLevel(ctx)`.

    **Nuevo**: un único `resolveThinkingProfile(ctx)` que devuelve un
    `ProviderThinkingProfile` con el `id` canónico, `label` opcional y
    lista de niveles clasificada. OpenClaw degrada automáticamente los valores almacenados obsoletos por
    rango de perfil.

    Implemente un hook en lugar de tres. Los hooks heredados siguen funcionando durante
    el período de desaprobación, pero no se componen con el resultado del perfil.

  </Accordion>

  <Accordion title="Reserva del proveedor OAuth externo → contracts.externalAuthProviders">
    **Antiguo**: implementar `resolveExternalOAuthProfiles(...)` sin
    declarar el proveedor en el manifiesto del complemento.

    **Nuevo**: declarar `contracts.externalAuthProviders` en el manifiesto del complemento
    **y** implementar `resolveExternalAuthProfiles(...)`. La ruta de "reserva de autenticación"
    antigua emite una advertencia en tiempo de ejecución y se eliminará.

    ```json
    {
      "contracts": {
        "externalAuthProviders": ["anthropic", "openai"]
      }
    }
    ```

  </Accordion>

  <Accordion title="Provider env-var lookup → setup.providers[].envVars">
    **Campo** del manifiesto antiguo: `providerAuthEnvVars: { anthropic: ["ANTHROPIC_API_KEY"] }`.

    **Nuevo**: reflejar la misma búsqueda de variable de entorno en `setup.providers[].envVars`
    en el manifiesto. Esto consolida los metadatos de entorno de configuración/estado en un
    solo lugar y evita iniciar el tiempo de ejecución del complemento solo para responder búsquedas
    de variables de entorno.

    `providerAuthEnvVars` sigue siendo compatible a través de un adaptador de compatibilidad
    hasta que cierre el período de desaprobación.

  </Accordion>

  <Accordion title="Memory plugin registration → registerMemoryCapability">
    **Antiguo**: tres llamadas separadas -
    `api.registerMemoryPromptSection(...)`,
    `api.registerMemoryFlushPlan(...)`,
    `api.registerMemoryRuntime(...)`.

    **Nuevo**: una llamada en la API de estado de memoria -
    `registerMemoryCapability(pluginId, { promptBuilder, flushPlanResolver, runtime })`.

    Mismos slots, una única llamada de registro. Los asistentes de memoria adicionales
    (`registerMemoryPromptSupplement`, `registerMemoryCorpusSupplement`,
    `registerMemoryEmbeddingProvider`) no se ven afectados.

  </Accordion>

  <Accordion title="Subagent session messages types renamed">
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
    **Antiguo**: `runtime.tasks.flow` (singular) devolvía un accesor de flujo de tareas en vivo.

    **Nuevo**: `runtime.tasks.managedFlows` mantiene el tiempo de ejecución de mutación de TaskFlow administrado
    para complementos que crean, actualizan, cancelan o ejecutan tareas secundarias desde un
    flujo. Use `runtime.tasks.flows` cuando el complemento solo necesite lecturas basadas en DTO.

    ```typescript
    // Before
    const flow = api.runtime.tasks.flow.fromToolContext(ctx);
    // After
    const flow = api.runtime.tasks.managedFlows.fromToolContext(ctx);
    ```

  </Accordion>

<Accordion title="Embedded extension factories → agent tool-result middleware">
  Cubierto en "Cómo migrar → Migrar extensiones de resultados de herramientas de Pi a middleware" arriba. Se incluye aquí por completitud: la ruta `api.registerEmbeddedExtensionFactory(...)` exclusiva de Pi eliminada se reemplaza por `api.registerAgentToolResultMiddleware(...)` con una lista de tiempo de ejecución explícita en `contracts.agentToolResultMiddleware`.
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
  Las desaprobaciones a nivel de extensión (dentro de los complementos de canal/proveedor empaquetados bajo `extensions/`) se rastrean dentro de sus propios `api.ts` y `runtime-api.ts` barrels. No afectan los contratos de complementos de terceros y no se enumeran aquí. Si consume un barrel local de un complemento empaquetado directamente, lea los comentarios de desaprobación en ese barrel antes de
  actualizar.
</Note>

## Cronograma de eliminación

| Cuándo                        | Qué sucede                                                                             |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| **Ahora**                     | Las superficies desaprobadas emiten advertencias en tiempo de ejecución                |
| **Próxima versión principal** | Las superficies desaprobadas se eliminarán; los complementos que aún las usen fallarán |

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

- [Cómo empezar](/es/plugins/building-plugins) - construya su primer complemento
- [Resumen del SDK](/es/plugins/sdk-overview) - referencia completa de importación de subrutas
- [Complementos de canal](/es/plugins/sdk-channel-plugins) - construir complementos de canal
- [Complementos de proveedor](/es/plugins/sdk-provider-plugins) - construir complementos de proveedor
- [Aspectos internos del complemento](/es/plugins/architecture) - inmersión profunda en la arquitectura
- [Manifiesto del complemento](/es/plugins/manifest) - referencia del esquema del manifiesto
