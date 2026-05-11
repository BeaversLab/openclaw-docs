---
summary: "Migrar desde la capa de compatibilidad con versiones anteriores heredada hasta el SDK de plugins moderno"
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

- **`openclaw/plugin-sdk/compat`** — una única importación que reexportaba docenas de
  asistentes. Se introdujo para mantener los plugins antiguos basados en hooks funcionando mientras se
  construía la nueva arquitectura de plugins.
- **`openclaw/extension-api`** — un puente que daba a los plugins acceso directo a
  los asistentes del lado del host, como el ejecutor de agentes integrados.
- **`api.registerEmbeddedExtensionFactory(...)`** — un hook de extensión agrupado solo para Pi eliminado que
  podía observar eventos del ejecutor integrado, como
  `tool_result`.

Las superficies de importación amplias ahora están **en desuso**. Todavía funcionan en tiempo de ejecución,
pero los nuevos plugins no deben usarlas, y los plugins existentes deben migrar antes de
que la próxima versión mayor las elimine. La API de registro de fábricas de extensiones integradas, solo para Pi, ha sido eliminada; use el middleware de resultados de herramientas en su lugar.

OpenClaw no elimina ni reinterpreta el comportamiento documentado de los plugins en el mismo
cambio que introduce un reemplazo. Los cambios de ruptura de contrato deben pasar primero
por un adaptador de compatibilidad, diagnósticos, documentación y un período de desuso.
Esto se aplica a las importaciones del SDK, campos de manifiesto, API de configuración, hooks y comportamiento de
registro en tiempo de ejecución.

<Warning>La capa de compatibilidad con versiones anteriores se eliminará en una versión mayor futura. Los plugins que aún importen desde estas superfices dejarán de funcionar cuando eso ocurra. Los registros de fábricas de extensiones integradas solo para Pi ya no se cargan.</Warning>

## Por qué cambió esto

El enfoque antiguo causaba problemas:

- **Inicio lento** — importar un asistente cargaba docenas de módulos no relacionados
- **Dependencias circulares** — las reexportaciones amplias facilitaban la creación de ciclos de importación
- **Superficie de API poco clara** — no hay forma de saber qué exportaciones eran estables frente a las internas

El SDK de plugins moderno soluciona esto: cada ruta de importación (`openclaw/plugin-sdk/\<subpath\>`) es un módulo pequeño y autónomo con un propósito claro y un contrato documentado.

Las capas de conveniencia del proveedor heredado para canales integrados también han desaparecido. Las capas de ayuda con marca de canal eran accesos directos privados de mono-repositorio, no contratos de plugins estables. Utilice en su lugar subrutas de SDK genéricas y estrechas. Dentro del espacio de trabajo del plugin integrado, mantenga las ayudas propiedad del proveedor en su propio `api.ts` o `runtime-api.ts`.

Ejemplos actuales de proveedores integrados:

- Anthropic mantiene los ayudantes de transmisión específicos de Claude en su propia capa `api.ts` / `contract-api.ts`
- OpenAI mantiene los constructores de proveedores, los ayudantes de modelo predeterminado y los constructores de proveedores en tiempo real en su propio `api.ts`
- OpenRouter mantiene el constructor de proveedores y los ayudantes de incorporación/configuración en su propio `api.ts`

## Política de compatibilidad

Para plugins externos, el trabajo de compatibilidad sigue este orden:

1. agregar el nuevo contrato
2. mantener el comportamiento antiguo conectado a través de un adaptador de compatibilidad
3. emitir un diagnóstico o advertencia que nombre la ruta antigua y el reemplazo
4. cubrir ambas rutas en las pruebas
5. documentar la obsolescencia y la ruta de migración
6. eliminar solo después de la ventana de migración anunciada, generalmente en una versión mayor

Si un campo de manifiesto aún se acepta, los autores de plugins pueden seguir usándolo hasta que la documentación y los diagnósticos indiquen lo contrario. El código nuevo debe preferir el reemplazo documentado, pero los plugins existentes no romperse durante versiones menores ordinarias.

## Cómo migrar

<Steps>
  <Step title="Migrar los asistentes de carga/escritura de configuración en tiempo de ejecución">
    Los plugins integrados deben dejar de llamar a
    `api.runtime.config.loadConfig()` y
    `api.runtime.config.writeConfigFile(...)` directamente. Se prefiere la configuración que ya
    se haya pasado a la ruta de llamada activa. Los controladores de larga duración que necesiten
    la instantánea del proceso actual pueden usar `api.runtime.config.current()`. Las herramientas de
    agente de larga duración deben usar el `ctx.getRuntimeConfig()` del contexto de la herramienta dentro
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
    seguimiento y deliberadamente quiere suprimir el planificador de recarga.
    Los resultados de mutación incluyen un resumen tipado `followUp` para pruebas y registro;
    la puerta de enlace sigue siendo responsable de aplicar o programar el reinicio.
    `loadConfig` y `writeConfigFile` permanecen como asistentes de compatibilidad
    obsoletos para plugins externos durante la ventana de migración y advierten una vez con el
    código de compatibilidad `runtime-config-load-write`. Los plugins integrados y el código
    en tiempo de ejecución del repositorio están protegidos por guardabarros del escáner en
    `pnpm check:deprecated-internal-config-api` y
    `pnpm check:no-runtime-action-load-config`: el uso del nuevo plugin de producción
    falla directamente, fallan las escrituras directas de configuración, los métodos del servidor de la puerta de enlace deben usar
    la instantánea en tiempo de ejecución de la solicitud, los asistentes de envío/acción/cliente del canal en tiempo de ejecución
    deben recibir la configuración de su límite, y los módulos en tiempo de ejecución de larga duración tienen
    cero llamadas `loadConfig()` ambiente permitidas.

    El nuevo código de plugin también debe evitar importar el barril de compatibilidad
    amplio `openclaw/plugin-sdk/config-runtime`. Use la subruta SDK
    estrecha que coincida con el trabajo:

    | Necesidad | Importar |
    | --- | --- |
    | Tipos de configuración como `OpenClawConfig` | `openclaw/plugin-sdk/config-types` |
    | Aserciones de configuración ya cargadas y búsqueda de configuración de entrada de plugin | `openclaw/plugin-sdk/plugin-config-runtime` |
    | Lecturas de instantánea en tiempo de ejecución actual | `openclaw/plugin-sdk/runtime-config-snapshot` |
    | Escrituras de configuración | `openclaw/plugin-sdk/config-mutation` |
    | Asistentes de almacén de sesión | `openclaw/plugin-sdk/session-store-runtime` |
    | Configuración de tabla Markdown | `openclaw/plugin-sdk/markdown-table-runtime` |
    | Asistentes en tiempo de ejecución de política de grupo | `openclaw/plugin-sdk/runtime-group-policy` |
    | Resolución de entrada secreta | `openclaw/plugin-sdk/secret-input-runtime` |
    | Sobrescrituras de modelo/sesión | `openclaw/plugin-sdk/model-session-runtime` |

    Los plugins integrados y sus pruebas están protegidas por escáner contra el barril
    amplio, por lo que las importaciones y simulaciones se mantienen locales para el comportamiento que necesitan. El barril
    amplio todavía existe para compatibilidad externa, pero el nuevo código no debe
    depender de él.

  </Step>

  <Step title="Migrar las extensiones de resultados de herramientas de Pi a middleware">
    Los complementos agrupados deben reemplazar los controladores de
    `api.registerEmbeddedExtensionFactory(...)` de resultados de herramientas solo de Pi con
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

  <Step title="Migrar los controladores nativos de aprobación a capacidades de hechos">
    Los complementos de canal con capacidad de aprobación ahora exponen el comportamiento nativo de aprobación a través de
    `approvalCapability.nativeRuntime` más el registro compartido de contexto de tiempo de ejecución.

    Cambios clave:

    - Reemplace `approvalCapability.handler.loadRuntime(...)` con
      `approvalCapability.nativeRuntime`
    - Mueva la autenticación/entrega específica de la aprobación fuera del cableado heredado `plugin.auth` /
      `plugin.approvals` y a `approvalCapability`
    - `ChannelPlugin.approvals` se ha eliminado del contrato público del complemento de canal;
      mueva los campos de entrega, nativo y renderizado a `approvalCapability`
    - `plugin.auth` permanece solo para los flujos de inicio de sesión/cierre de sesión del canal; los ganchos de
      autenticación de aprobación allí ya no son leídos por el núcleo
    - Registre objetos de tiempo de ejecución propiedad del canal, como clientes, tokens o aplicaciones
      Bolt a través de `openclaw/plugin-sdk/channel-runtime-context`
    - No envíe avisos de redirección propiedad del complemento desde los controladores de aprobación nativos;
      el núcleo ahora posee los avisos de enrutado a otro lugar de los resultados de entrega reales
    - Al pasar `channelRuntime` a `createChannelManager(...)`, proporcione una
      superficie `createPluginRuntime().channel` real. Los stubs parciales son rechazados.

    Consulte `/plugins/sdk-channel-plugins` para ver el diseño actual de la capacidad de
      aprobación.

  </Step>

  <Step title="Auditar el comportamiento de reserva del contenedor de Windows">
    Si su complemento utiliza `openclaw/plugin-sdk/windows-spawn`, los contenedores de `.cmd`/`.bat` de Windows sin resolver ahora fallan de forma segura (closed) a menos que pase explícitamente `allowShellFallback: true`.

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

    Si su llamador no depende intencionalmente de la reserva (fallback) del shell, no establezca `allowShellFallback` y maneje el error lanzado en su lugar.

  </Step>

  <Step title="Buscar importaciones obsoletas">
    Busque en su complemento las importaciones de cualquiera de las dos superficies obsoletas:

    ```bash
    grep -r "plugin-sdk/compat" my-plugin/
    grep -r "plugin-sdk/config-runtime" my-plugin/
    grep -r "openclaw/extension-api" my-plugin/
    ```

  </Step>

  <Step title="Reemplazar con importaciones específicas">
    Cada exportación de la superficie anterior se asigna a una ruta de importación moderna específica:

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

    Para los ayudantes del lado del host, utilice el tiempo de ejecución del complemento inyectado en lugar de importar directamente:

    ```typescript
    // Before (deprecated extension-api bridge)
    import { runEmbeddedPiAgent } from "openclaw/extension-api";
    const result = await runEmbeddedPiAgent({ sessionId, prompt });

    // After (injected runtime)
    const result = await api.runtime.agent.runEmbeddedPiAgent({ sessionId, prompt });
    ```

    El mismo patrón se aplica a otros ayudantes del puente heredado:

    | Importación antigua | Equivalente moderno |
    | --- | --- |
    | `resolveAgentDir` | `api.runtime.agent.resolveAgentDir` |
    | `resolveAgentWorkspaceDir` | `api.runtime.agent.resolveAgentWorkspaceDir` |
    | `resolveAgentIdentity` | `api.runtime.agent.resolveAgentIdentity` |
    | `resolveThinkingDefault` | `api.runtime.agent.resolveThinkingDefault` |
    | `resolveAgentTimeoutMs` | `api.runtime.agent.resolveAgentTimeoutMs` |
    | `ensureAgentWorkspace` | `api.runtime.agent.ensureAgentWorkspace` |
    | ayudantes de almacenamiento de sesión | `api.runtime.agent.session.*` |

  </Step>

  <Step title="Compilar y probar">
    ```bash
    pnpm build
    pnpm test -- my-plugin/
    ```
  </Step>
</Steps>

## Referencia de ruta de importación

<Accordion title="Tabla de rutas de importación comunes">
  | Ruta de importación | Propósito | Exportaciones clave | | --- | --- | --- | | `plugin-sdk/plugin-entry` | Auxiliar de entrada de complemento canónico | `definePluginEntry` | | `plugin-sdk/core` | Reexportación heredada paraguas para definiciones/constructores de entrada de canal | `defineChannelPluginEntry`, `createChatChannelPlugin` | | `plugin-sdk/config-schema` | Exportación de esquema de
  configuración raíz | `OpenClawSchema` | | `plugin-sdk/provider-entry` | Auxiliar de entrada de proveedor único | `defineSingleProviderPluginEntry` | | `plugin-sdk/channel-core` | Definiciones y constructores de entrada de canal enfocados | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` | | `plugin-sdk/setup` | Asistentes compartidos del
  asistente de configuración | Mensajes de lista de permitidos, constructores de estado de configuración | | `plugin-sdk/setup-runtime` | Asistentes de tiempo de ejecución de configuración | Adaptadores de parches de configuración seguros para importar, asistentes de notas de búsqueda, `promptResolvedAllowFrom`, `splitSetupEntries`, proxies de configuración delegados | |
  `plugin-sdk/setup-adapter-runtime` | Asistentes de adaptador de configuración | `createEnvPatchedAccountSetupAdapter` | | `plugin-sdk/setup-tools` | Asistentes de herramientas de configuración | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` | | `plugin-sdk/account-core` | Asistentes multicuenta | Asistentes de
  lista/configuración/acción de cuenta | | `plugin-sdk/account-id` | Asistentes de ID de cuenta | `DEFAULT_ACCOUNT_ID`, normalización de ID de cuenta | | `plugin-sdk/account-resolution` | Asistentes de búsqueda de cuenta | Asistentes de búsqueda de cuenta + reserva predeterminada | | `plugin-sdk/account-helpers` | Asistentes de cuenta estrechos | Asistentes de lista de cuenta/acción de cuenta | |
  `plugin-sdk/channel-setup` | Adaptadores del asistente de configuración | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`, además de `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` | | `plugin-sdk/channel-pairing` | Primitivas de emparejamiento de MD |
  `createChannelPairingController` | | `plugin-sdk/channel-reply-pipeline` | Prefijo de respuesta + cableado de escritura | `createChannelReplyPipeline` | | `plugin-sdk/channel-config-helpers` | Fábricas de adaptadores de configuración | `createHybridChannelConfigAdapter` | | `plugin-sdk/channel-config-schema` | Constructores de esquemas de configuración | Primitivas de esquema de configuración de
  canal compartido y solo el constructor genérico | | `plugin-sdk/channel-config-schema-legacy` | Esquemas de configuración agrupados en desuso | Solo compatibilidad agrupada; los nuevos complementos deben definir esquemas locales del complemento | | `plugin-sdk/telegram-command-config` | Asistentes de configuración de comandos de Telegram | Normalización de nombre de comando, recorte de
  descripción, validación de duplicados/conflictos | | `plugin-sdk/channel-policy` | Resolución de políticas de grupo/MD | `resolveChannelGroupRequireMention` | | `plugin-sdk/channel-lifecycle` | Asistentes de estado de cuenta y ciclo de vida de flujo de borrador | `createAccountStatusSink`, asistentes de finalización de vista previa de borrador | | `plugin-sdk/inbound-envelope` | Asistentes de
  sobre entrante | Asistentes compartidos de ruta + constructor de sobre | | `plugin-sdk/inbound-reply-dispatch` | Asistentes de respuesta entrante | Asistentes compartidos de registro y despacho | | `plugin-sdk/messaging-targets` | Análisis de destino de mensajería | Asistentes de análisis/coincidencia de destino | | `plugin-sdk/outbound-media` | Asistentes de medios salientes | Carga de medios
  salientes compartida | | `plugin-sdk/outbound-send-deps` | Asistentes de dependencia de envío saliente | Búsqueda ligera de `resolveOutboundSendDep` sin importar el tiempo de ejecución saliente completo | | `plugin-sdk/outbound-runtime` | Asistentes de tiempo de ejecución saliente | Asistentes de entrega saliente, delegado de identidad/envío, sesión, formato y planificación de carga útil | |
  `plugin-sdk/thread-bindings-runtime` | Asistentes de vinculación de hilos | Asistentes de ciclo de vida y adaptador de vinculación de hilos | | `plugin-sdk/agent-media-payload` | Asistentes de carga útil de medios heredados | Constructor de carga útil de medios de agente para diseños de campo heredados | | `plugin-sdk/channel-runtime` | Shim de compatibilidad en desuso | Solo utilidades de
  tiempo de ejecución de canal heredado | | `plugin-sdk/channel-send-result` | Tipos de resultado de envío | Tipos de resultado de respuesta | | `plugin-sdk/runtime-store` | Almacenamiento persistente de complementos | `createPluginRuntimeStore` | | `plugin-sdk/runtime` | Asistentes amplios de tiempo de ejecución | Asistentes de tiempo de ejecución/registro/copia de seguridad/instalación de
  complementos | | `plugin-sdk/runtime-env` | Asistentes estrechos de entorno de tiempo de ejecución | Registrador/entorno de tiempo de ejecución, tiempo de espera, reintento y asistentes de retroceso | | `plugin-sdk/plugin-runtime` | Asistentes compartidos de tiempo de ejecución de complementos | Asistentes de comandos/ganchos/HTTP/interactivos de complementos | | `plugin-sdk/hook-runtime` |
  Asistentes de canalización de ganchos | Asistentes compartidos de canalización de ganchos web/internos | | `plugin-sdk/lazy-runtime` | Asistentes diferidos de tiempo de ejecución | `createLazyRuntimeModule`, `createLazyRuntimeMethod`, `createLazyRuntimeMethodBinder`, `createLazyRuntimeNamedExport`, `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | Asistentes de proceso | Asistentes
  compartidos de ejecución | | `plugin-sdk/cli-runtime` | Asistentes de tiempo de ejecución de CLI | Formato de comando, esperas, asistentes de versión | | `plugin-sdk/gateway-runtime` | Asistentes de puerta de enlace | Asistentes de cliente de puerta de enlace y parches de estado de canal | | `plugin-sdk/config-runtime` | Asistentes de configuración | Asistentes de carga/escritura de
  configuración | | `plugin-sdk/telegram-command-config` | Asistentes de comandos de Telegram | Asistentes de validación de comandos de Telegram con reserva estable cuando la superficie de contrato de Telegram agrupada no está disponible | | `plugin-sdk/approval-runtime` | Asistentes de solicitud de aprobación | Carga útil de aprobación de ejecución/complemento, asistentes de capacidad/perfil de
  aprobación, asistentes de enrutamiento/tiempo de ejecución de aprobación nativa y formateo de ruta de visualización de aprobación estructurada | | `plugin-sdk/approval-auth-runtime` | Asistentes de autenticación de aprobación | Resolución de aprobador, autenticación de acción del mismo chat | | `plugin-sdk/approval-client-runtime` | Asistentes de cliente de aprobación | Asistentes de
  perfil/filtro de aprobación de ejecución nativa | | `plugin-sdk/approval-delivery-runtime` | Asistentes de entrega de aprobación | Adaptadores de capacidad/entrega de aprobación nativa | | `plugin-sdk/approval-gateway-runtime` | Asistentes de puerta de enlace de aprobación | Asistente compartido de resolución de puerta de enlace de aprobación | | `plugin-sdk/approval-handler-adapter-runtime` |
  Asistentes de adaptador de aprobación | Asistentes de carga ligera de adaptadores de aprobación nativa para puntos de entrada de canal activos | | `plugin-sdk/approval-handler-runtime` | Asistentes de controlador de aprobación | Asistentes de tiempo de ejecución de controlador de aprobación más amplios; prefiera las costuras de adaptador/puerta de enlace más estrechas cuando sean suficientes | |
  `plugin-sdk/approval-native-runtime` | Asistentes de destino de aprobación | Asistentes de vinculación de destino/cuenta de aprobación nativa | | `plugin-sdk/approval-reply-runtime` | Asistentes de respuesta de aprobación | Asistentes de carga útil de respuesta de aprobación de ejecución/complemento | | `plugin-sdk/channel-runtime-context` | Asistentes de contexto de tiempo de ejecución de canal
  | Asistentes compartidos de registro/obtención/observación de contexto de tiempo de ejecución de canal genérico | | `plugin-sdk/security-runtime` | Asistentes de seguridad | Asistentes compartidos de confianza, filtrado de MD, contenido externo y recopilación de secretos | | `plugin-sdk/ssrf-policy` | Asistentes de políticas de SSRF | Asistentes de política de red privada y lista de permitidos
  de host | | `plugin-sdk/ssrf-runtime` | Asistentes de tiempo de ejecución de SSRF | Despachador anclado, búsqueda protegida, asistentes de políticas de SSRF | | `plugin-sdk/collection-runtime` | Asistentes de caché delimitado | `pruneMapToMaxSize` | | `plugin-sdk/diagnostic-runtime` | Asistentes de filtrado de diagnóstico | `isDiagnosticFlagEnabled`, `isDiagnosticsEnabled` | |
  `plugin-sdk/error-runtime` | Asistentes de formateo de errores | `formatUncaughtError`, `isApprovalNotFoundError`, asistentes de gráfico de errores | | `plugin-sdk/fetch-runtime` | Asistentes de búsqueda/proxy envueltos | `resolveFetch`, asistentes de proxy | | `plugin-sdk/host-runtime` | Asistentes de normalización de host | `normalizeHostname`, `normalizeScpRemoteHost` | |
  `plugin-sdk/retry-runtime` | Asistentes de reintento | `RetryConfig`, `retryAsync`, ejecutores de políticas | | `plugin-sdk/allow-from` | Formato de lista de permitidos | `formatAllowFromLowercase` | | `plugin-sdk/allowlist-resolution` | Mapeo de entrada de lista de permitidos | `mapAllowlistResolutionInputs` | | `plugin-sdk/command-auth` | Asistentes de filtrado y superficie de comandos |
  `resolveControlCommandGate`, asistentes de autorización del remitente, asistentes de registro de comandos incluido el formateo de menú de argumentos dinámicos | | `plugin-sdk/command-status` | Renderizadores de estado/ayuda de comandos | `buildCommandsMessage`, `buildCommandsMessagePaginated`, `buildHelpMessage` | | `plugin-sdk/secret-input` | Análisis de entrada secreta | Asistentes de entrada
  secreta | | `plugin-sdk/webhook-ingress` | Asistentes de solicitud de webhook | Utilidades de destino de webhook | | `plugin-sdk/webhook-request-guards` | Asistentes de guardia de cuerpo de webhook | Asistentes de lectura/límite de cuerpo de solicitud | | `plugin-sdk/reply-runtime` | Tiempo de ejecución de respuesta compartida | Despacho entrante, latido, planificador de respuesta, fragmentación
  | | `plugin-sdk/reply-dispatch-runtime` | Asistentes estrechos de despacho de respuesta | Finalizar, despacho de proveedor y asistentes de etiqueta de conversación | | `plugin-sdk/reply-history` | Asistentes de historial de respuesta | `buildHistoryContext`, `buildPendingHistoryContextFromMap`, `recordPendingHistoryEntry`, `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` |
  Planificación de referencia de respuesta | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | Asistentes de fragmento de respuesta | Asistentes de fragmentación de texto/markdown | | `plugin-sdk/session-store-runtime` | Asistentes de almacenamiento de sesión | Asistentes de ruta de almacenamiento + actualización en | | `plugin-sdk/state-paths` | Asistentes de ruta de estado |
  Asistentes de directorio de estado y OAuth | | `plugin-sdk/routing` | Asistentes de clave de enrutamiento/sesión | `resolveAgentRoute`, `buildAgentSessionKey`, `resolveDefaultAgentBoundAccountId`, asistentes de normalización de clave de sesión | | `plugin-sdk/status-helpers` | Asistentes de estado de canal | Constructores de resumen de estado de canal/cuenta, valores predeterminados de estado de
  tiempo de ejecución, asistentes de metadatos de problemas | | `plugin-sdk/target-resolver-runtime` | Asistentes de resolución de destino | Asistentes compartidos de resolución de destino | | `plugin-sdk/string-normalization-runtime` | Asistentes de normalización de cadenas | Asistentes de normalización de cadena/slug | | `plugin-sdk/request-url` | Asistentes de URL de solicitud | Extraer URL de
  cadena de entradas tipo solicitud | | `plugin-sdk/run-command` | Asistentes de comando cronometrado | Ejecutor de comando cronometrado con stdout/stderr normalizado | | `plugin-sdk/param-readers` | Lectores de parámetros | Lectores comunes de parámetros de herramienta/CLI | | `plugin-sdk/tool-payload` | Extracción de carga útil de herramienta | Extraer cargas útiles normalizadas de objetos de
  resultado de herramienta | | `plugin-sdk/tool-send` | Extracción de envío de herramienta | Extraer campos de destino de envío canónico de argumentos de herramienta | | `plugin-sdk/temp-path` | Asistentes de ruta temporal | Asistentes compartidos de ruta de descarga temporal | | `plugin-sdk/logging-core` | Asistentes de registro | Asistentes de registrador y redacción de subsistema | |
  `plugin-sdk/markdown-table-runtime` | Asistentes de tabla Markdown | Asistentes de modo de tabla Markdown | | `plugin-sdk/reply-payload` | Tipos de respuesta de mensaje | Tipos de carga útil de respuesta | | `plugin-sdk/provider-setup` | Asistentes de configuración de proveedor local/autohospedado curado | Asistentes de descubrimiento/configuración de proveedor autohospedado | |
  `plugin-sdk/self-hosted-provider-setup` | Asistentes enfocados de configuración de proveedor autohospedado compatible con OpenAI | Mismos asistentes de descubrimiento/configuración de proveedor autohospedado | | `plugin-sdk/provider-auth-runtime` | Asistentes de autenticación de tiempo de ejecución de proveedor | Asistentes de resolución de clave de API de tiempo de ejecución | |
  `plugin-sdk/provider-auth-api-key` | Asistentes de configuración de clave de API de proveedor | Asistentes de incorporación/escritura de perfil de clave de API | | `plugin-sdk/provider-auth-result` | Asistentes de resultado de autenticación de proveedor | Constructor de resultado de autenticación OAuth estándar | | `plugin-sdk/provider-auth-login` | Asistentes de inicio de sesión interactivo de
  proveedor | Asistentes compartidos de inicio de sesión interactivo | | `plugin-sdk/provider-selection-runtime` | Asistentes de selección de proveedor | Selección de proveedor configurado o automático y fusión de configuración de proveedor sin procesar | | `plugin-sdk/provider-env-vars` | Asistentes de variable de entorno de proveedor | Asistentes de búsqueda de variable de entorno de
  autenticación de proveedor | | `plugin-sdk/provider-model-shared` | Asistentes compartidos de modelo/reproducción de proveedor | `ProviderReplayFamily`, `buildProviderReplayFamilyHooks`, `normalizeModelCompat`, constructores de políticas de reproducción compartidas, asistentes de punto final de proveedor y asistentes de normalización de ID de modelo | | `plugin-sdk/provider-catalog-shared` |
  Asistentes compartidos de catálogo de proveedor | `findCatalogTemplate`, `buildSingleProviderApiKeyCatalog`, `supportsNativeStreamingUsageCompat`, `applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-onboard` | Parches de incorporación de proveedor | Asistentes de configuración de incorporación | | `plugin-sdk/provider-http` | Asistentes HTTP de proveedor | Asistentes de capacidad
  de HTTP/punto final de proveedor genérico, incluidos los asistentes de formulario multiparte de transcripción de audio | | `plugin-sdk/provider-web-fetch` | Asistentes de búsqueda web de proveedor | Asistentes de registro/caché de proveedor de búsqueda web | | `plugin-sdk/provider-web-search-config-contract` | Asistentes de configuración de búsqueda web de proveedor | Asistentes estrechos de
  configuración/credenciales de búsqueda web para proveedores que no necesitan cableado de habilitación de complemento | | `plugin-sdk/provider-web-search-contract` | Asistentes de contrato de búsqueda web de proveedor | Asistentes de contrato de configuración/credenciales de búsqueda web estrechos como `createWebSearchProviderContractFields`, `enablePluginInConfig`,
  `resolveProviderWebSearchPluginConfig`, y establecedores/obtenedores de credenciales con alcance | | `plugin-sdk/provider-web-search` | Asistentes de búsqueda web de proveedor | Asistentes de registro/caché/tiempo de ejecución de proveedor de búsqueda web | | `plugin-sdk/provider-tools` | Asistentes de compatibilidad de herramienta/esquema de proveedor | `ProviderToolCompatFamily`,
  `buildProviderToolCompatFamilyHooks`, limpieza y diagnóstico del esquema de Gemini, y asistentes de compatibilidad con xAI como `resolveXaiModelCompatPatch` / `applyXaiModelCompat` | | `plugin-sdk/provider-usage` | Asistentes de uso de proveedor | `fetchClaudeUsage`, `fetchGeminiUsage`, `fetchGithubCopilotUsage`, y otros asistentes de uso de proveedor | | `plugin-sdk/provider-stream` |
  Asistentes de contenedor de flujo de proveedor | `ProviderStreamFamily`, `buildProviderStreamFamilyHooks`, `composeProviderStreamWrappers`, tipos de contenedor de flujo, y asistentes compartidos de contenedor Anthropic/Bedrock/DeepSeek V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot | | `plugin-sdk/provider-transport-runtime` | Asistentes de transporte de proveedor |
  Asistentes de transporte de proveedor nativo como búsqueda protegida, transformaciones de mensajes de transporte y flujos de eventos de transporte grabables | | `plugin-sdk/keyed-async-queue` | Cola asíncrona ordenada | `KeyedAsyncQueue` | | `plugin-sdk/media-runtime` | Asistentes compartidos de medios | Asistentes de obtención/transformación/almacenamiento de medios más constructores de carga
  útil de medios | | `plugin-sdk/media-generation-runtime` | Asistentes compartidos de generación de medios | Asistentes compartidos de conmutación por error, selección de candidatos y mensajería de modelo faltante para generación de imagen/video/música | | `plugin-sdk/media-understanding` | Asistentes de comprensión de medios | Tipos de proveedor de comprensión de medios más exportaciones de
  asistentes de imagen/audio para proveedores | | `plugin-sdk/text-runtime` | Asistentes compartidos de texto | Eliminación de texto visible para el asistente, asistentes de representación/fragmentación/tabla de markdown, asistentes de redacción, asistentes de etiquetas de directiva, utilidades de texto seguro y asistentes de texto/registro relacionados | | `plugin-sdk/text-chunking` | Asistentes
  de fragmentación de texto | Asistente de fragmentación de texto saliente | | `plugin-sdk/speech` | Asistentes de voz | Tipos de proveedor de voz más asistentes de directiva, registro y validación para proveedores | | `plugin-sdk/speech-core` | Núcleo de voz compartido | Tipos de proveedor de voz, registro, directivas, normalización | | `plugin-sdk/realtime-transcription` | Asistentes de
  transcripción en tiempo real | Tipos de proveedor, asistentes de registro y asistente compartido de sesión WebSocket | | `plugin-sdk/realtime-voice` | Asistentes de voz en tiempo real | Tipos de proveedor, asistentes de registro/resolución y asistentes de sesión de puente | | `plugin-sdk/image-generation-core` | Núcleo compartido de generación de imágenes | Tipos de generación de imágenes,
  conmutación por error, autenticación y asistentes de registro | | `plugin-sdk/music-generation` | Asistentes de generación de música | Tipos de proveedor/solicitud/resultado de generación de música | | `plugin-sdk/music-generation-core` | Núcleo compartido de generación de música | Tipos de generación de música, asistentes de conmutación por error, búsqueda de proveedor y análisis de referencia
  de modelo | | `plugin-sdk/video-generation` | Asistentes de generación de video | Tipos de proveedor/solicitud/resultado de generación de video | | `plugin-sdk/video-generation-core` | Núcleo compartido de generación de video | Tipos de generación de video, asistentes de conmutación por error, búsqueda de proveedor y análisis de referencia de modelo | | `plugin-sdk/interactive-runtime` |
  Asistentes de respuesta interactiva | Normalización/reducción de carga útil de respuesta interactiva | | `plugin-sdk/channel-config-primitives` | Primitivas de configuración de canal | Primitivas estrechas de esquema de configuración de canal | | `plugin-sdk/channel-config-writes` | Asistentes de escritura de configuración de canal | Asistentes de autorización de escritura de configuración de
  canal | | `plugin-sdk/channel-plugin-common` | Preludio compartido de canal | Exportaciones compartidas de preludio de complemento de canal | | `plugin-sdk/channel-status` | Asistentes de estado de canal | Asistentes compartidos de instantánea/resumen de estado de canal | | `plugin-sdk/allowlist-config-edit` | Asistentes de configuración de lista de permitidos | Asistentes de edición/lectura de
  configuración de lista de permitidos | | `plugin-sdk/group-access` | Asistentes de acceso a grupo | Asistentes compartidos de decisiones de acceso a grupo | | `plugin-sdk/direct-dm` | Asistentes de MD directo | Asistentes compartidos de autorización/guarda de MD directo | | `plugin-sdk/extension-shared` | Asistentes compartidos de extensión | Primitivas de asistente de proxy ambiental y de canal
  pasivo/estado | | `plugin-sdk/webhook-targets` | Asistentes de destino de webhook | Asistentes de registro y instalación de ruta de destino de webhook | | `plugin-sdk/webhook-path` | Asistentes de ruta de webhook | Asistentes de normalización de ruta de webhook | | `plugin-sdk/web-media` | Asistentes compartidos de medios web | Asistentes de carga de medios remotos/locales | | `plugin-sdk/zod` |
  Reexportación de Zod | `zod` reexportado para consumidores del SDK de complementos | | `plugin-sdk/memory-core` | Asistentes agrupados de núcleo de memoria | Superficie de asistente de administrador/configuración/archivo/CLI de memoria | | `plugin-sdk/memory-core-engine-runtime` | Fachada de tiempo de ejecución del motor de memoria | Fachada de tiempo de ejecución de índice/búsqueda de memoria |
  | `plugin-sdk/memory-core-host-engine-foundation` | Motor base de host de memoria | Exportaciones del motor base de host de memoria | | `plugin-sdk/memory-core-host-engine-embeddings` | Motor de incrustación de host de memoria | Contratos de incrustación de memoria, acceso al registro, proveedor local y asistentes genéricos de lotes/remotos; los proveedores remotos concretos viven en sus
  complementos propietarios | | `plugin-sdk/memory-core-host-engine-qmd` | Motor QMD de host de memoria | Exportaciones del motor QMD de host de memoria | | `plugin-sdk/memory-core-host-engine-storage` | Motor de almacenamiento de host de memoria | Exportaciones del motor de almacenamiento de host de memoria | | `plugin-sdk/memory-core-host-multimodal` | Asistentes multimodales de host de memoria
  | Asistentes multimodales de host de memoria | | `plugin-sdk/memory-core-host-query` | Asistentes de consulta de host de memoria | Asistentes de consulta de host de memoria | | `plugin-sdk/memory-core-host-secret` | Asistentes de secretos de host de memoria | Asistentes de secretos de host de memoria | | `plugin-sdk/memory-core-host-events` | Asistentes de diario de eventos de host de memoria |
  Asistentes de diario de eventos de host de memoria | | `plugin-sdk/memory-core-host-status` | Asistentes de estado de host de memoria | Asistentes de estado de host de memoria | | `plugin-sdk/memory-core-host-runtime-cli` | Tiempo de ejecución de CLI de host de memoria | Asistentes de tiempo de ejecución de CLI de host de memoria | | `plugin-sdk/memory-core-host-runtime-core` | Tiempo de
  ejecución básico de host de memoria | Asistentes de tiempo de ejecución básico de host de memoria | | `plugin-sdk/memory-core-host-runtime-files` | Asistentes de archivo/tiempo de ejecución de host de memoria | Asistentes de archivo/tiempo de ejecución de host de memoria | | `plugin-sdk/memory-host-core` | Alias de tiempo de ejecución básico de host de memoria | Alias neutral del proveedor para
  asistentes de tiempo de ejecución básico de host de memoria | | `plugin-sdk/memory-host-events` | Alias de diario de eventos de host de memoria | Alias neutral del proveedor para asistentes de diario de eventos de host de memoria | | `plugin-sdk/memory-host-files` | Alias de archivo/tiempo de ejecución de host de memoria | Alias neutral del proveedor para asistentes de archivo/tiempo de
  ejecución de host de memoria | | `plugin-sdk/memory-host-markdown` | Asistentes de markdown administrado | Asistentes compartidos de markdown administrado para complementos adyacentes a la memoria | | `plugin-sdk/memory-host-search` | Fachada de búsqueda de memoria activa | Fachada de tiempo de ejecución diferida del administrador de búsqueda de memoria activa | | `plugin-sdk/memory-host-status`
  | Alias de estado de host de memoria | Alias neutral del proveedor para asistentes de estado de host de memoria | | `plugin-sdk/memory-lancedb` | Asistentes agrupados de memoria-lancedb | Superficie de asistente de memoria-lancedb | | `plugin-sdk/testing` | Utilidades de prueba | Asistentes y simulacros de prueba |
</Accordion>

Esta tabla es intencionalmente el subconjunto común de migración, no la superficie completa del SDK.
La lista completa de más de 200 puntos de entrada vive en
`scripts/lib/plugin-sdk-entrypoints.json`.

Esa lista todavía incluye algunos puntos de conexión de ayuda para plugins incluidos, como
`plugin-sdk/feishu`, `plugin-sdk/feishu-setup`, `plugin-sdk/zalo`,
`plugin-sdk/zalo-setup` y `plugin-sdk/matrix*`. Estos siguen exportándose para
el mantenimiento y la compatibilidad de los plugins incluidos, pero se omiten intencionalmente
de la tabla de migración común y no son el objetivo recomendado para
el código de nuevos plugins.

La misma regla se aplica a otras familias de ayudas incluidas, como:

- ayudas de soporte del navegador: `plugin-sdk/browser-cdp`, `plugin-sdk/browser-config-runtime`, `plugin-sdk/browser-config-support`, `plugin-sdk/browser-control-auth`, `plugin-sdk/browser-node-runtime`, `plugin-sdk/browser-profiles`, `plugin-sdk/browser-security-runtime`, `plugin-sdk/browser-setup-tools`, `plugin-sdk/browser-support`
- Matrix: `plugin-sdk/matrix*`
- LINE: `plugin-sdk/line*`
- IRC: `plugin-sdk/irc*`
- superficies de ayuda/plugins incluidos como `plugin-sdk/googlechat`,
  `plugin-sdk/zalouser`, `plugin-sdk/bluebubbles*`,
  `plugin-sdk/mattermost*`, `plugin-sdk/msteams`,
  `plugin-sdk/nextcloud-talk`, `plugin-sdk/nostr`, `plugin-sdk/tlon`,
  `plugin-sdk/twitch`,
  `plugin-sdk/github-copilot-login`, `plugin-sdk/github-copilot-token`,
  `plugin-sdk/diagnostics-otel`, `plugin-sdk/diagnostics-prometheus`,
  `plugin-sdk/diffs`, `plugin-sdk/llm-task`, `plugin-sdk/thread-ownership`
  y `plugin-sdk/voice-call`

`plugin-sdk/github-copilot-token` actualmente expone la superficie estrecha de ayuda de tokens
`DEFAULT_COPILOT_API_BASE_URL`,
`deriveCopilotApiBaseUrlFromToken` y `resolveCopilotApiToken`.

Utilice la importación más estrecha que coincida con el trabajo. Si no puede encontrar una exportación,
verifique el código fuente en `src/plugin-sdk/` o pregunte en Discord.

## Deprecaciones activas

Deprecaciones más específicas que se aplican en todo el SDK del complemento, el contrato del proveedor,
la superficie de ejecución y el manifiesto. Cada una todavía funciona hoy pero se eliminará
en una versión principal futura. La entrada debajo de cada elemento asigna la API antigua a su
reemplazo canónico.

<AccordionGroup>
  <Accordion title="command-auth help builders → command-status">
    **Antiguo (`openclaw/plugin-sdk/command-auth`)**: `buildCommandsMessage`,
    `buildCommandsMessagePaginated`, `buildHelpMessage`.

    **Nuevo (`openclaw/plugin-sdk/command-status`)**: mismas firmas, mismas
    exportaciones, solo importadas desde la subruta más específica. `command-auth`
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

    **Nuevo**: `resolveInboundMentionDecision({ facts, policy })` — devuelve un
    único objeto de decisión en lugar de dos llamadas separadas.

    Los complementos de canal descendente (Slack, Discord, Matrix, MS Teams) ya han

cambiado.

  </Accordion>

  <Accordion title="Channel runtime shim and channel actions helpers">
    `openclaw/plugin-sdk/channel-runtime` es un shim de compatibilidad para complementos
de canal más antiguos. No lo importe en código nuevo; use
    `openclaw/plugin-sdk/channel-runtime-context` para registrar objetos de
    tiempo de ejecución.

    Los ayudantes `channelActions*` en `openclaw/plugin-sdk/channel-actions` están

deprecados junto con las exportaciones de canal de "acciones" sin procesar. Exponga capacidades
a través de la superficie semántica `presentation` en su lugar: los complementos de
canal declaran lo que renderizan (tarjetas, botones, selecciones) en lugar de qué nombres de
acciones sin procesar aceptan.

  </Accordion>

  <Accordion title="Web search provider tool() helper → createTool() on the plugin">
    **Antiguo**: `tool()` fábrica de `openclaw/plugin-sdk/provider-web-search`.

    **Nuevo**: implementar `createTool(...)` directamente en el proveedor del plugin.
    OpenClaw ya no necesita el asistente del SDK para registrar el contenedor de la herramienta.

  </Accordion>

  <Accordion title="Plaintext channel envelopes → BodyForAgent">
    **Antiguo**: `formatInboundEnvelope(...)` (y
    `ChannelMessageForAgent.channelEnvelope`) para construir un sobre de aviso
de texto plano plano a partir de los mensajes del canal entrante.

    **Nuevo**: `BodyForAgent` más bloques de contexto de usuario estructurados. Los
    plugins de canal adjuntan metadatos de enrutamiento (hilo, tema, responder a, reacciones) como
    campos tipados en lugar de concatenarlos en una cadena de aviso. El
    asistente `formatAgentEnvelope(...)` todavía es compatible con sobres
    sintetizados orientados al asistente, pero los sobres de texto plano entrantes están en
    camino de desaparecer.

    Áreas afectadas: `inbound_claim`, `message_received` y cualquier plugin
    de canal personalizado que procesara posteriormente el texto de `channelEnvelope`.

  </Accordion>

  <Accordion title="Provider discovery types → provider catalog types">
    Cuatro alias de tipo de descubrimiento son ahora envoltorios finos sobre los
    tipos de la era del catálogo:

    | Old alias                 | New type                  |
    | ------------------------- | ------------------------- |
    | `ProviderDiscoveryOrder`  | `ProviderCatalogOrder`    |
    | `ProviderDiscoveryContext`| `ProviderCatalogContext`  |
    | `ProviderDiscoveryResult` | `ProviderCatalogResult`   |
    | `ProviderPluginDiscovery` | `ProviderPluginCatalog`   |

    Además, la bolsa estática heredada `ProviderCapabilities` — los plugins de
    proveedor deben adjuntar datos de capacidad a través del contrato de tiempo de ejecución del
    proveedor en lugar de un objeto estático.

  </Accordion>

  <Accordion title="Thinking policy hooks → resolveThinkingProfile">
    **Antiguo** (tres hooks separados en `ProviderThinkingPolicy`):
    `isBinaryThinking(ctx)`, `supportsXHighThinking(ctx)` y
    `resolveDefaultThinkingLevel(ctx)`.

    **Nuevo**: un único `resolveThinkingProfile(ctx)` que devuelve un
    `ProviderThinkingProfile` con el `id` canónico, `label` opcional y
    lista de niveles clasificada. OpenClaw degrada automáticamente los valores almacenados obsoletos por el rango del perfil.

    Implemente un hook en lugar de tres. Los hooks heredados siguen funcionando durante el período de obsolescencia, pero no se componen con el resultado del perfil.

  </Accordion>

  <Accordion title="External OAuth provider fallback → contracts.externalAuthProviders">
    **Antiguo**: implementar `resolveExternalOAuthProfiles(...)` sin
    declarar el proveedor en el manifiesto del complemento.

    **Nuevo**: declarar `contracts.externalAuthProviders` en el manifiesto del complemento
    **y** implementar `resolveExternalAuthProfiles(...)`. La antigua ruta de "respaldo de autenticación"
    emite una advertencia en tiempo de ejecución y se eliminará.

    ```json
    {
      "contracts": {
        "externalAuthProviders": ["anthropic", "openai"]
      }
    }
    ```

  </Accordion>

  <Accordion title="Provider env-var lookup → setup.providers[].envVars">
    **Antiguo** campo de manifiesto: `providerAuthEnvVars: { anthropic: ["ANTHROPIC_API_KEY"] }`.

    **Nuevo**: reflejar la misma búsqueda de variable de entorno en `setup.providers[].envVars`
    en el manifiesto. Esto consolida los metadatos del entorno de configuración/estado en un solo lugar y evita iniciar el tiempo de ejecución del complemento solo para responder búsquedas de variables de entorno.

    `providerAuthEnvVars` sigue siendo compatible a través de un adaptador de compatibilidad hasta que cierre el período de obsolescencia.

  </Accordion>

  <Accordion title="Memory plugin registration → registerMemoryCapability">
    **Antiguo**: tres llamadas separadas —
    `api.registerMemoryPromptSection(...)`,
    `api.registerMemoryFlushPlan(...)`,
    `api.registerMemoryRuntime(...)`.

    **Nuevo**: una llamada en la API de estado de memoria —
    `registerMemoryCapability(pluginId, { promptBuilder, flushPlanResolver, runtime })`.

    Mismas ranuras, llamada de registro única. Los asistentes de memoria adicionales
    (`registerMemoryPromptSupplement`, `registerMemoryCorpusSupplement`,
    `registerMemoryEmbeddingProvider`) no se ven afectados.

  </Accordion>

  <Accordion title="Subagent session messages types renamed">
    Dos alias de tipo heredados todavía exportados desde `src/plugins/runtime/types.ts`:

    | Antiguo                           | Nuevo                             |
    | ----------------------------- | ------------------------------- |
    | `SubagentReadSessionParams`   | `SubagentGetSessionMessagesParams` |
    | `SubagentReadSessionResult`   | `SubagentGetSessionMessagesResult` |

    El método en tiempo de ejecución `readSession` está obsoleto en favor de
    `getSessionMessages`. Misma firma; el método antiguo llama al
    nuevo.

  </Accordion>

  <Accordion title="runtime.tasks.flow → runtime.tasks.flows">
    **Antiguo**: `runtime.tasks.flow` (singular) devolvía un accesor de flujo de tareas en vivo.

    **Nuevo**: `runtime.tasks.flows` (plural) devuelve acceso TaskFlow basado en DTO,
    lo cual es seguro para importar y no requiere que se cargue
    el tiempo de ejecución completo de tareas.

    ```typescript
    // Before
    const flow = api.runtime.tasks.flow(ctx);
    // After
    const flows = api.runtime.tasks.flows(ctx);
    ```

  </Accordion>

<Accordion title="Embedded extension factories → agent tool-result middleware">
  Cubierto en "Cómo migrar → Migrar las extensiones de resultados de herramientas de Pi a middleware" arriba. Se incluye aquí para mayor integridad: la ruta `api.registerEmbeddedExtensionFactory(...)` eliminada solo de Pi se reemplaza por `api.registerAgentToolResultMiddleware(...)` con una lista de tiempo de ejecución explícita en `contracts.agentToolResultMiddleware`.
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
  Las desaprobaciones a nivel de extensión (dentro de los complementos de canal/proveedor agrupados bajo `extensions/`) se rastrean dentro de sus propios `api.ts` y `runtime-api.ts` barrels. No afectan los contratos de complementos de terceros y no se enumeran aquí. Si consume el barrel local de un complemento agrupado directamente, lea los comentarios de desaprobación en ese barrel antes de
  actualizar.
</Note>

## Cronograma de eliminación

| Cuándo                        | Qué sucede                                                                             |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| **Ahora**                     | Las superficies desaprobadas emiten advertencias de tiempo de ejecución                |
| **Próxima versión principal** | Las superficies desaprobadas se eliminarán; los complementos que aún las usen fallarán |

Todos los complementos principales ya han sido migrados. Los complementos externos deben migrar
antes de la próxima versión principal.

## Suprimir las advertencias temporalmente

Establezca estas variables de entorno mientras trabaja en la migración:

```bash
OPENCLAW_SUPPRESS_PLUGIN_SDK_COMPAT_WARNING=1 openclaw gateway run
OPENCLAW_SUPPRESS_EXTENSION_API_WARNING=1 openclaw gateway run
```

Esta es una solución de escape temporal, no una solución permanente.

## Relacionado

- [Comenzando](/es/plugins/building-plugins) — construya su primer complemento
- [Descripción general del SDK](/es/plugins/sdk-overview) — referencia completa de importación de subrutas
- [Complementos de canal](/es/plugins/sdk-channel-plugins) — construcción de complementos de canal
- [Complementos de proveedor](/es/plugins/sdk-provider-plugins) — construcción de complementos de proveedor
- [Aspectos internos del complemento](/es/plugins/architecture) — inmersión profunda en la arquitectura
- [Manifiesto del complemento](/es/plugins/manifest) — referencia del esquema del manifiesto
