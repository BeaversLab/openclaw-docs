---
title: "Migración del SDK de complementos"
sidebarTitle: "Migrar al SDK"
summary: "Migrar desde la capa de compatibilidad con versiones anteriores heredada hasta el SDK de complementos moderno"
read_when:
  - You see the OPENCLAW_PLUGIN_SDK_COMPAT_DEPRECATED warning
  - You see the OPENCLAW_EXTENSION_API_DEPRECATED warning
  - You are updating a plugin to the modern plugin architecture
  - You maintain an external OpenClaw plugin
---

# Migración del SDK de complementos

OpenClaw ha pasado de una amplia capa de compatibilidad con versiones anteriores a una arquitectura de complementos moderna con importaciones centradas y documentadas. Si su complemento se construyó antes de la nueva arquitectura, esta guía le ayuda a migrar.

## Qué está cambiando

El antiguo sistema de complementos proporcionaba dos superficies muy abiertas que permitían a los complementos importar cualquier cosa que necesitaran desde un único punto de entrada:

- **`openclaw/plugin-sdk/compat`** — una única importación que reexportaba docenas
  de asistentes. Se introdujo para mantener funcionando los complementos (plugins)
  antiguos basados en ganchos mientras se construía la nueva arquitectura de
  complementos.
- **`openclaw/extension-api`** — un puente que otorgaba a los complementos
  acceso directo a los asistentes del lado del host, como el ejecutor de agentes
  integrado.

Ambas superficies ahora están **obsoletas**. Todavía funcionan en tiempo de ejecución, pero los nuevos complementos no deben usarlas, y los complementos existentes deben migrar antes de que la próxima versión principal las elimine.

<Warning>La capa de compatibilidad hacia atrás se eliminará en una próxima versión mayor. Los complementos que sigan importando desde estas superficies se romperán cuando eso ocurra.</Warning>

## Por qué cambió esto

El enfoque anterior causó problemas:

- **Inicio lento** — al importar un solo ayudante se cargaban docenas de módulos no relacionados
- **Dependencias circulares** — las amplias reexportaciones facilitaban la creación de ciclos de importación
- **Superficie de API poco clara** — ninguna forma de saber qué exportaciones eran estables frente a las internas

El SDK moderno de complementos soluciona esto: cada ruta de importación
(`openclaw/plugin-sdk/\<subpath\>`) es un módulo pequeño y autónomo con un
propósito claro y un contrato documentado.

Las costuras de conveniencia heredadas del proveedor para los canales
agrupados también han desaparecido. Las importaciones como
`openclaw/plugin-sdk/slack`, `openclaw/plugin-sdk/discord`,
`openclaw/plugin-sdk/signal`, `openclaw/plugin-sdk/whatsapp`,
las costuras de asistentes con marca de canal y
`openclaw/plugin-sdk/telegram-core` eran atajos privados de un mono-repositorio,
no contratos estables de complementos. Utilice en su lugar subrutas genéricas
y estrechas del SDK. Dentro del espacio de trabajo del complemento agrupado,
mantenga los asistentes propiedad del proveedor en el propio
`api.ts` o `runtime-api.ts` de ese complemento.

Ejemplos de proveedores agrupados actuales:

- Anthropic mantiene los asistentes de transmisión específicos de Claude en su
  propia costura `api.ts` / `contract-api.ts`
- OpenAI mantiene los constructores de proveedores, los asistentes de modelos
  predeterminados y los constructores de proveedores en tiempo real en su propio
  `api.ts`
- OpenRouter mantiene el constructor de proveedores y los asistentes de
  incorporación/configuración en su propio `api.ts`

## Cómo migrar

<Steps>
  <Step title="Migrate approval-native handlers to capability facts">
    Los complementos de canal con capacidad de aprobación ahora exponen el comportamiento de aprobación nativo a través de
    `approvalCapability.nativeRuntime` además del registro de contexto de tiempo de ejecución compartido.

    Cambios clave:

    - Reemplace `approvalCapability.handler.loadRuntime(...)` con
      `approvalCapability.nativeRuntime`
    - Mueva la autenticación/entrega específica de la aprobación fuera del cableado heredado `plugin.auth` /
      `plugin.approvals` y hacia `approvalCapability`
    - `ChannelPlugin.approvals` se ha eliminado del contrato público del complemento de canal;
      mueva los campos de entrega/nativo/renderizado hacia `approvalCapability`
    - `plugin.auth` permanece solo para los flujos de inicio de sesión/cierre de sesión del canal; los ganchos de autenticación de aprobación
      allí ya no son leídos por el núcleo
    - Registre objetos de tiempo de ejecución propiedad del canal, como clientes, tokens o aplicaciones
      Bolt a través de `openclaw/plugin-sdk/channel-runtime-context`
    - No envíe avisos de redirección propiedad del complemento desde los controladores de aprobación nativos;
      el núcleo ahora posee los avisos de enrutado a otro lugar de los resultados de entrega reales
    - Al pasar `channelRuntime` a `createChannelManager(...)`, proporcione una
      superficie `createPluginRuntime().channel` real. Los stubs parciales son rechazados.

    Consulte `/plugins/sdk-channel-plugins` para ver el diseño actual de la capacidad de
      aprobación.

  </Step>

  <Step title="Audit Windows wrapper fallback behavior">
    Si su complemento usa `openclaw/plugin-sdk/windows-spawn`, los contenedores de Windows `.cmd`/`.bat` no resueltos ahora fallan de forma cerrada a menos que pase explícitamente
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

    Si su llamador no depende intencionalmente de la alternativa de shell, no configure
    `allowShellFallback` y maneje el error lanzado en su lugar.

  </Step>

  <Step title="Find deprecated imports">
    Busque en su complemento las importaciones de cualquiera de las superficies en desuso:

    ```bash
    grep -r "plugin-sdk/compat" my-plugin/
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

    Para los ayudantes del lado del host, utilice el tiempo de ejecución del complemento inyectado en lugar de importar
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
    | ayudantes de almacenamiento de sesión | `api.runtime.agent.session.*` |

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
  | Ruta de importación | Propósito | Exportaciones clave | | --- | --- | --- | | `plugin-sdk/plugin-entry` | Auxiliar de entrada de plugin canónico | `definePluginEntry` | | `plugin-sdk/core` | Reexportación heredada general para definiciones/constructores de entrada de canal | `defineChannelPluginEntry`, `createChatChannelPlugin` | | `plugin-sdk/config-schema` | Exportación del esquema de
  configuración raíz | `OpenClawSchema` | | `plugin-sdk/provider-entry` | Auxiliar de entrada de proveedor único | `defineSingleProviderPluginEntry` | | `plugin-sdk/channel-core` | Definiciones y constructores de entrada de canal enfocados | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` | | `plugin-sdk/setup` | Auxiliares compartidos del
  asistente de configuración | Prompts de lista de permitidos, constructores de estado de configuración | | `plugin-sdk/setup-runtime` | Auxiliares de tiempo de ejecución de configuración | Adaptadores de parches de configuración seguros para importar, auxiliares de notas de búsqueda, `promptResolvedAllowFrom`, `splitSetupEntries`, proxies de configuración delegados | |
  `plugin-sdk/setup-adapter-runtime` | Auxiliares de adaptador de configuración | `createEnvPatchedAccountSetupAdapter` | | `plugin-sdk/setup-tools` | Auxiliares de herramientas de configuración | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` | | `plugin-sdk/account-core` | Auxiliares multicuenta | Auxiliares de
  lista/configuración/puerta de acción de cuenta | | `plugin-sdk/account-id` | Auxiliares de ID de cuenta | `DEFAULT_ACCOUNT_ID`, normalización de ID de cuenta | | `plugin-sdk/account-resolution` | Auxiliares de búsqueda de cuenta | Auxiliares de búsqueda de cuenta + respaldo predeterminado | | `plugin-sdk/account-helpers` | Auxiliares de cuenta estrechos | Auxiliares de lista de cuenta/acción de
  cuenta | | `plugin-sdk/channel-setup` | Adaptadores del asistente de configuración | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`, más `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` | | `plugin-sdk/channel-pairing` | Primitivas de emparejamiento de MD |
  `createChannelPairingController` | | `plugin-sdk/channel-reply-pipeline` | Prefijo de respuesta + cableado de escritura | `createChannelReplyPipeline` | | `plugin-sdk/channel-config-helpers` | Fábricas de adaptadores de configuración | `createHybridChannelConfigAdapter` | | `plugin-sdk/channel-config-schema` | Constructores de esquemas de configuración | Tipos de esquemas de configuración de
  canal | | `plugin-sdk/telegram-command-config` | Auxiliares de configuración de comandos de Telegram | Normalización de nombre de comando, recorte de descripción, validación de duplicados/conflictos | | `plugin-sdk/channel-policy` | Resolución de políticas de grupo/MD | `resolveChannelGroupRequireMention` | | `plugin-sdk/channel-lifecycle` | Seguimiento del estado de la cuenta |
  `createAccountStatusSink` | | `plugin-sdk/inbound-envelope` | Auxiliares de sobre de entrada | Auxiliares de ruta compartida + constructor de sobre | | `plugin-sdk/inbound-reply-dispatch` | Auxiliares de respuesta de entrada | Auxiliares compartidos de registro y despacho | | `plugin-sdk/messaging-targets` | Análisis de destino de mensajería | Auxiliares de análisis/coincidencia de destino | |
  `plugin-sdk/outbound-media` | Auxiliares de medios de salida | Carga de medios de salida compartida | | `plugin-sdk/outbound-runtime` | Auxiliares de tiempo de ejecución de salida | Auxiliares de identidad de salida/delegado de envío y planificación de carga útil | | `plugin-sdk/thread-bindings-runtime` | Auxiliares de vinculación de hilos | Auxiliares de ciclo de vida y adaptador de vinculación
  de hilos | | `plugin-sdk/agent-media-payload` | Auxiliares de carga útil de medios heredados | Constructor de carga útil de medios de agente para diseños de campo heredados | | `plugin-sdk/channel-runtime` | Shim de compatibilidad obsoleto | Solo utilidades de tiempo de ejecución de canal heredadas | | `plugin-sdk/channel-send-result` | Tipos de resultados de envío | Tipos de resultados de
  respuesta | | `plugin-sdk/runtime-store` | Almacenamiento persistente de plugins | `createPluginRuntimeStore` | | `plugin-sdk/runtime` | Auxiliares amplios de tiempo de ejecución | Auxiliares de tiempo de ejecución/registro/respaldo/instalación de plugins | | `plugin-sdk/runtime-env` | Auxiliares estrechos de entorno de tiempo de ejecución | Registrador/entorno de tiempo de ejecución, tiempo de
  espera, reintento y auxiliares de retroceso | | `plugin-sdk/plugin-runtime` | Auxiliares compartidos de tiempo de ejecución de plugins | Auxiliares de comandos/ganchos/http/interactivos de plugins | | `plugin-sdk/hook-runtime` | Auxiliares de canalización de ganchos | Auxiliares compartidos de canalización de webhook/ganchos internos | | `plugin-sdk/lazy-runtime` | Auxiliares de tiempo de
  ejecución diferidos | `createLazyRuntimeModule`, `createLazyRuntimeMethod`, `createLazyRuntimeMethodBinder`, `createLazyRuntimeNamedExport`, `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | Auxiliares de proceso | Auxiliares compartidos de ejecución | | `plugin-sdk/cli-runtime` | Auxiliares de tiempo de ejecución de CLI | Formato de comandos, esperas, auxiliares de versión | |
  `plugin-sdk/gateway-runtime` | Auxiliares de puerta de enlace | Cliente de puerta de enlace y auxiliares de parches de estado de canal | | `plugin-sdk/config-runtime` | Auxiliares de configuración | Auxiliares de carga/escritura de configuración | | `plugin-sdk/telegram-command-config` | Auxiliares de comandos de Telegram | Auxiliares de validación de comandos de Telegram con respaldo estable
  cuando la superficie del contrato de Telegram incluido no está disponible | | `plugin-sdk/approval-runtime` | Auxiliares de avisos de aprobación | Carga útil de aprobación de ejecución/plugin, auxiliares de capacidad/perfil de aprobación, auxiliares de enrutamiento/tiempo de ejecución de aprobación nativos | | `plugin-sdk/approval-auth-runtime` | Auxiliares de autenticación de aprobación |
  Resolución del aprobador, autenticación de acción del mismo chat | | `plugin-sdk/approval-client-runtime` | Auxiliares de cliente de aprobación | Auxiliares de perfil/filtro de aprobación de ejecución nativa | | `plugin-sdk/approval-delivery-runtime` | Auxiliares de entrega de aprobación | Adaptadores de capacidad/entrega de aprobación nativos | | `plugin-sdk/approval-gateway-runtime` |
  Auxiliares de puerta de enlace de aprobación | Auxiliar compartido de resolución de puerta de enlace de aprobación | | `plugin-sdk/approval-handler-adapter-runtime` | Auxiliares de adaptador de aprobación | Auxiliares de carga de adaptador de aprobación nativa ligero para puntos de entrada de canal en caliente | | `plugin-sdk/approval-handler-runtime` | Auxiliares de controlador de aprobación |
  Auxiliares de tiempo de ejecución de controlador de aprobación más amplios; prefiera las costuras de adaptador/puerta de enlace más estrechas cuando sean suficientes | | `plugin-sdk/approval-native-runtime` | Auxiliares de destino de aprobación | Auxiliares de vinculación de destino/cuenta de aprobación nativos | | `plugin-sdk/approval-reply-runtime` | Auxiliares de respuesta de aprobación |
  Auxiliares de carga útil de respuesta de aprobación de ejecución/plugin | | `plugin-sdk/channel-runtime-context` | Auxiliares de contexto de tiempo de ejecución de canal | Auxiliares de registro/obtención/observación de contexto de tiempo de ejecución de canal genérico | | `plugin-sdk/security-runtime` | Auxiliares de seguridad | Auxiliares compartidos de confianza, puerta de MD, contenido
  externo y recopilación de secretos | | `plugin-sdk/ssrf-policy` | Auxiliares de políticas SSRF | Auxiliares de políticas de lista de permitidos y red privada | | `plugin-sdk/ssrf-runtime` | Auxiliares de tiempo de ejecución SSRF | Despachador anclado, búsqueda protegida, auxiliares de políticas SSRF | | `plugin-sdk/collection-runtime` | Auxiliares de caché delimitado | `pruneMapToMaxSize` | |
  `plugin-sdk/diagnostic-runtime` | Auxiliares de puerta de diagnóstico | `isDiagnosticFlagEnabled`, `isDiagnosticsEnabled` | | `plugin-sdk/error-runtime` | Auxiliares de formato de error | `formatUncaughtError`, `isApprovalNotFoundError`, auxiliares de gráfico de errores | | `plugin-sdk/fetch-runtime` | Auxiliares de búsqueda/proxy envueltos | `resolveFetch`, auxiliares de proxy | |
  `plugin-sdk/host-runtime` | Auxiliares de normalización de host | `normalizeHostname`, `normalizeScpRemoteHost` | | `plugin-sdk/retry-runtime` | Auxiliares de reintento | `RetryConfig`, `retryAsync`, ejecutores de políticas | | `plugin-sdk/allow-from` | Formato de lista de permitidos | `formatAllowFromLowercase` | | `plugin-sdk/allowlist-resolution` | Mapeo de entrada de lista de permitidos |
  `mapAllowlistResolutionInputs` | | `plugin-sdk/command-auth` | Auxiliares de puerta de comandos y superficie de comandos | `resolveControlCommandGate`, auxiliares de autorización de remitente, auxiliares de registro de comandos | | `plugin-sdk/command-status` | Renderizadores de estado/ayuda de comandos | `buildCommandsMessage`, `buildCommandsMessagePaginated`, `buildHelpMessage` | |
  `plugin-sdk/secret-input` | Análisis de entrada secreta | Auxiliares de entrada secreta | | `plugin-sdk/webhook-ingress` | Auxiliares de solicitud de webhook | Utilidades de destino de webhook | | `plugin-sdk/webhook-request-guards` | Auxiliares de protección de cuerpo de webhook | Auxiliares de lectura/limite de cuerpo de solicitud | | `plugin-sdk/reply-runtime` | Tiempo de ejecución de
  respuesta compartido | Despacho de entrada, latido, planificador de respuesta, fragmentación | | `plugin-sdk/reply-dispatch-runtime` | Auxiliares de despacho de respuesta estrechos | Auxiliares de finalización + despacho de proveedor | | `plugin-sdk/reply-history` | Auxiliares de historial de respuesta | `buildHistoryContext`, `buildPendingHistoryContextFromMap`, `recordPendingHistoryEntry`,
  `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | Planificación de referencia de respuesta | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | Auxiliares de fragmento de respuesta | Auxiliares de fragmentación de texto/markdown | | `plugin-sdk/session-store-runtime` | Auxiliares de tienda de sesión | Auxiliares de ruta de tienda + actualizado en | |
  `plugin-sdk/state-paths` | Auxiliares de ruta de estado | Auxiliares de directorio de estado y OAuth | | `plugin-sdk/routing` | Auxiliares de enrutamiento/clave de sesión | `resolveAgentRoute`, `buildAgentSessionKey`, `resolveDefaultAgentBoundAccountId`, auxiliares de normalización de clave de sesión | | `plugin-sdk/status-helpers` | Auxiliares de estado del canal | Constructores de resumen de
  estado de canal/cuenta, valores predeterminados de estado de tiempo de ejecución, auxiliares de metadatos de problemas | | `plugin-sdk/target-resolver-runtime` | Auxiliares de resolución de destino | Auxiliares compartidos de resolución de destino | | `plugin-sdk/string-normalization-runtime` | Auxiliares de normalización de cadenas | Auxiliares de normalización de slug/cadena | |
  `plugin-sdk/request-url` | Auxiliares de URL de solicitud | Extraer cadenas URL de entradas tipo solicitud | | `plugin-sdk/run-command` | Auxiliares de comando temporizado | Ejecutor de comando temporizado con stdout/stderr normalizados | | `plugin-sdk/param-readers` | Lectores de parámetros | Lectores comunes de parámetros de herramienta/CLI | | `plugin-sdk/tool-payload` | Extracción de carga
  útil de herramienta | Extraer cargas útiles normalizadas de objetos de resultados de herramientas | | `plugin-sdk/tool-send` | Extracción de envío de herramienta | Extraer campos de destino de envío canónicos de argumentos de herramientas | | `plugin-sdk/temp-path` | Auxiliares de ruta temporal | Auxiliares compartidos de ruta de descarga temporal | | `plugin-sdk/logging-core` | Auxiliares de
  registro | Registrador de subsistema y auxiliares de redacción | | `plugin-sdk/markdown-table-runtime` | Auxiliares de tabla de markdown | Auxiliares de modo de tabla de markdown | | `plugin-sdk/reply-payload` | Tipos de respuesta de mensaje | Tipos de carga útil de respuesta | | `plugin-sdk/provider-setup` | Auxiliares de configuración de proveedor local/autohospedado curado | Auxiliares de
  descubrimiento/configuración de proveedor autohospedado | | `plugin-sdk/self-hosted-provider-setup` | Auxiliares de configuración de proveedor autohospedado compatible con OpenAI enfocados | Mismos auxiliares de descubrimiento/configuración de proveedor autohospedado | | `plugin-sdk/provider-auth-runtime` | Auxiliares de autenticación de tiempo de ejecución de proveedor | Auxiliares de
  resolución de clave API de tiempo de ejecución | | `plugin-sdk/provider-auth-api-key` | Auxiliares de configuración de clave API de proveedor | Auxiliares de incorporación/escritura de perfil de clave API | | `plugin-sdk/provider-auth-result` | Auxiliares de resultado de autenticación de proveedor | Constructor de resultado de autenticación OAuth estándar | | `plugin-sdk/provider-auth-login` |
  Auxiliares de inicio de sesión interactivo de proveedor | Auxiliares compartidos de inicio de sesión interactivo | | `plugin-sdk/provider-env-vars` | Auxiliares de variable de entorno de proveedor | Auxiliares de búsqueda de variable de entorno de autenticación de proveedor | | `plugin-sdk/provider-model-shared` | Auxiliares compartidos de modelo/reproducción de proveedor |
  `ProviderReplayFamily`, `buildProviderReplayFamilyHooks`, `normalizeModelCompat`, constructores compartidos de políticas de reproducción, auxiliares de punto final de proveedor y auxiliares de normalización de ID de modelo | | `plugin-sdk/provider-catalog-shared` | Auxiliares compartidos de catálogo de proveedor | `findCatalogTemplate`, `buildSingleProviderApiKeyCatalog`,
  `supportsNativeStreamingUsageCompat`, `applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-onboard` | Parches de incorporación de proveedor | Auxiliares de configuración de incorporación | | `plugin-sdk/provider-http` | Auxiliares HTTP de proveedor | Auxiliares genéricos de capacidad HTTP/punto final de proveedor | | `plugin-sdk/provider-web-fetch` | Auxiliares de búsqueda web de
  proveedor | Auxiliares de registro/caché de proveedor de búsqueda web | | `plugin-sdk/provider-web-search-config-contract` | Auxiliares de configuración de búsqueda web de proveedor | Auxiliares estrechos de configuración/credenciales de búsqueda web para proveedores que no necesitan cableado de habilitación de plugin | | `plugin-sdk/provider-web-search-contract` | Auxiliares de contrato de
  búsqueda web de proveedor | Auxiliares estrechos de contrato de configuración/credenciales de búsqueda web como `createWebSearchProviderContractFields`, `enablePluginInConfig`, `resolveProviderWebSearchPluginConfig`, y establecedores/obtenedores de credenciales con alcance | | `plugin-sdk/provider-web-search` | Auxiliares de búsqueda web de proveedor | Auxiliares de registro/caché/tiempo de
  ejecución de proveedor de búsqueda web | | `plugin-sdk/provider-tools` | Auxiliares de compatibilidad de herramienta/esquema de proveedor | `ProviderToolCompatFamily`, `buildProviderToolCompatFamilyHooks`, limpieza + diagnósticos de esquema de Gemini y auxiliares de compatibilidad de xAI como `resolveXaiModelCompatPatch` / `applyXaiModelCompat` | | `plugin-sdk/provider-usage` | Auxiliares de uso
  de proveedor | `fetchClaudeUsage`, `fetchGeminiUsage`, `fetchGithubCopilotUsage`, y otros auxiliares de uso de proveedor | | `plugin-sdk/provider-stream` | Auxiliares de contenedor de flujo de proveedor | `ProviderStreamFamily`, `buildProviderStreamFamilyHooks`, `composeProviderStreamWrappers`, tipos de contenedor de flujo y auxiliares de contenedor compartidos
  Anthropic/Bedrock/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot | | `plugin-sdk/provider-transport-runtime` | Auxiliares de transporte de proveedor | Auxiliares de transporte de proveedor nativo como búsqueda protegida, transformaciones de mensajes de transporte y flujos de eventos de transporte grabables | | `plugin-sdk/keyed-async-queue` | Cola asíncrona ordenada |
  `KeyedAsyncQueue` | | `plugin-sdk/media-runtime` | Auxiliares compartidos de medios | Auxiliares de búsqueda/transformación/almacenamiento de medios más constructores de carga útil de medios | | `plugin-sdk/media-generation-runtime` | Auxiliares compartidos de generación de medios | Auxiliares compartidos de conmutación por error, selección de candidatos y mensajería de modelo faltante para
  generación de imagen/video/música | | `plugin-sdk/media-understanding` | Auxiliares de comprensión de medios | Tipos de proveedor de comprensión de medios más exportaciones de auxiliares de imagen/audio orientadas al proveedor | | `plugin-sdk/text-runtime` | Auxiliares compartidos de texto | Eliminación de texto visible para el asistente, auxiliares de representación/fragmentación/tabla de
  markdown, auxiliares de redacción, auxiliares de etiqueta de directiva, utilidades de texto seguro y auxiliares relacionados de texto/registro | | `plugin-sdk/text-chunking` | Auxiliares de fragmentación de texto | Auxiliar de fragmentación de texto de salida | | `plugin-sdk/speech` | Auxiliares de voz | Tipos de proveedor de voz más auxiliares de directiva, registro y validación orientados al
  proveedor | | `plugin-sdk/speech-core` | Núcleo de voz compartido | Tipos de proveedor de voz, registro, directivas, normalización | | `plugin-sdk/realtime-transcription` | Auxiliares de transcripción en tiempo real | Tipos de proveedor y auxiliares de registro | | `plugin-sdk/realtime-voice` | Auxiliares de voz en tiempo real | Tipos de proveedor y auxiliares de registro | |
  `plugin-sdk/image-generation-core` | Núcleo compartido de generación de imágenes | Tipos de generación de imágenes, conmutación por error, autenticación y auxiliares de registro | | `plugin-sdk/music-generation` | Auxiliares de generación de música | Tipos de solicitud/resultado/proveedor de generación de música | | `plugin-sdk/music-generation-core` | Núcleo compartido de generación de música |
  Tipos de generación de música, auxiliares de conmutación por error, búsqueda de proveedor y análisis de referencia de modelo | | `plugin-sdk/video-generation` | Auxiliares de generación de video | Tipos de solicitud/resultado/proveedor de generación de video | | `plugin-sdk/video-generation-core` | Núcleo compartido de generación de video | Tipos de generación de video, auxiliares de conmutación
  por error, búsqueda de proveedor y análisis de referencia de modelo | | `plugin-sdk/interactive-runtime` | Auxiliares de respuesta interactiva | Normalización/reducción de carga útil de respuesta interactiva | | `plugin-sdk/channel-config-primitives` | Primitivas de configuración de canal | Primitivas de esquema de configuración de canal estrechas | | `plugin-sdk/channel-config-writes` |
  Auxiliares de escritura de configuración de canal | Auxiliares de autorización de escritura de configuración de canal | | `plugin-sdk/channel-plugin-common` | Preludio compartido de canal | Exportaciones de preludio de plugin de canal compartido | | `plugin-sdk/channel-status` | Auxiliares de estado del canal | Auxiliares compartidos de instantánea/resumen de estado de canal | |
  `plugin-sdk/allowlist-config-edit` | Auxiliares de configuración de lista de permitidos | Auxiliares de edición/lectura de configuración de lista de permitidos | | `plugin-sdk/group-access` | Auxiliares de acceso a grupo | Auxiliares compartidos de decisiones de acceso a grupo | | `plugin-sdk/direct-dm` | Auxiliares de MD directo | Auxiliares compartidos de autenticación/protección de MD directo
  | | `plugin-sdk/extension-shared` | Auxiliares compartidos de extensión | Primitivas de auxiliares de proxy ambiente y de canal pasivo/estado | | `plugin-sdk/webhook-targets` | Auxiliares de destino de webhook | Auxiliares de registro de destino de webhook e instalación de ruta | | `plugin-sdk/webhook-path` | Auxiliares de ruta de webhook | Auxiliares de normalización de ruta de webhook | |
  `plugin-sdk/web-media` | Auxiliares compartidos de medios web | Auxiliares de carga de medios remotos/locales | | `plugin-sdk/zod` | Reexportación de Zod | `zod` reexportado para consumidores del SDK de plugins | | `plugin-sdk/memory-core` | Auxiliares incluidos de núcleo de memoria | Superficie de auxiliares de archivo/CLI/configuración/gestor de memoria | |
  `plugin-sdk/memory-core-engine-runtime` | Fachada de tiempo de ejecución del motor de memoria | Fachada de tiempo de ejecución de búsqueda/índice de memoria | | `plugin-sdk/memory-core-host-engine-foundation` | Motor de base del host de memoria | Exportaciones del motor de base del host de memoria | | `plugin-sdk/memory-core-host-engine-embeddings` | Motor de incrustación del host de memoria |
  Contratos de incrustación de memoria, acceso al registro, proveedor local y auxiliares genéricos de procesamiento por lotes/remoto; los proveedores remotos concretos viven en sus plugins propietarios | | `plugin-sdk/memory-core-host-engine-qmd` | Motor QMD del host de memoria | Exportaciones del motor QMD del host de memoria | | `plugin-sdk/memory-core-host-engine-storage` | Motor de
  almacenamiento del host de memoria | Exportaciones del motor de almacenamiento del host de memoria | | `plugin-sdk/memory-core-host-multimodal` | Auxiliares multimodales del host de memoria | Auxiliares multimodales del host de memoria | | `plugin-sdk/memory-core-host-query` | Auxiliares de consulta del host de memoria | Auxiliares de consulta del host de memoria | |
  `plugin-sdk/memory-core-host-secret` | Auxiliares secretos del host de memoria | Auxiliares secretos del host de memoria | | `plugin-sdk/memory-core-host-events` | Auxiliares de diario de eventos del host de memoria | Auxiliares de diario de eventos del host de memoria | | `plugin-sdk/memory-core-host-status` | Auxiliares de estado del host de memoria | Auxiliares de estado del host de memoria |
  | `plugin-sdk/memory-core-host-runtime-cli` | Tiempo de ejecución de CLI del host de memoria | Auxiliares de tiempo de ejecución de CLI del host de memoria | | `plugin-sdk/memory-core-host-runtime-core` | Tiempo de ejecución central del host de memoria | Auxiliares de tiempo de ejecución central del host de memoria | | `plugin-sdk/memory-core-host-runtime-files` | Auxiliares de archivo/tiempo de
  ejecución del host de memoria | Auxiliares de archivo/tiempo de ejecución del host de memoria | | `plugin-sdk/memory-host-core` | Alias de tiempo de ejecución central del host de memoria | Alias neutral del proveedor para los auxiliares de tiempo de ejecución central del host de memoria | | `plugin-sdk/memory-host-events` | Alias de diario de eventos del host de memoria | Alias neutral del
  proveedor para los auxiliares de diario de eventos del host de memoria | | `plugin-sdk/memory-host-files` | Alias de archivo/tiempo de ejecución del host de memoria | Alias neutral del proveedor para los auxiliares de archivo/tiempo de ejecución del host de memoria | | `plugin-sdk/memory-host-markdown` | Auxiliares de markdown gestionado | Auxiliares compartidos de markdown gestionado para
  plugins adyacentes a la memoria | | `plugin-sdk/memory-host-search` | Fachada de búsqueda de memoria activa | Fachada de tiempo de ejecución diferida del gestor de búsqueda de memoria activa | | `plugin-sdk/memory-host-status` | Alias de estado del host de memoria | Alias neutral del proveedor para los auxiliares de estado del host de memoria | | `plugin-sdk/memory-lancedb` | Auxiliares
  incluidos de memory-lancedb | Superficie de auxiliares de memory-lancedb | | `plugin-sdk/testing` | Utilidades de prueba | Auxiliares y simulaciones de prueba |
</Accordion>

Esta tabla es intencionalmente el subconjunto de migración común, no la superficie completa del SDK. La lista completa de más de 200 puntos de entrada se encuentra en `scripts/lib/plugin-sdk-entrypoints.json`.

Esa lista aún incluye algunas capas de ayuda de plugins empaquetados, como `plugin-sdk/feishu`, `plugin-sdk/feishu-setup`, `plugin-sdk/zalo`, `plugin-sdk/zalo-setup` y `plugin-sdk/matrix*`. Estos siguen exportados para el mantenimiento y la compatibilidad de los plugins empaquetados, pero se omiten intencionalmente de la tabla de migración común y no son el objetivo recomendado para el código de nuevos plugins.

La misma regla se aplica a otras familias de ayudas integradas como:

- ayudas de soporte del navegador: `plugin-sdk/browser-cdp`, `plugin-sdk/browser-config-runtime`, `plugin-sdk/browser-config-support`, `plugin-sdk/browser-control-auth`, `plugin-sdk/browser-node-runtime`, `plugin-sdk/browser-profiles`, `plugin-sdk/browser-security-runtime`, `plugin-sdk/browser-setup-tools`, `plugin-sdk/browser-support`
- Matrix: `plugin-sdk/matrix*`
- LINE: `plugin-sdk/line*`
- IRC: `plugin-sdk/irc*`
- superficies de ayuda/plugins empaquetados como `plugin-sdk/googlechat`, `plugin-sdk/zalouser`, `plugin-sdk/bluebubbles*`, `plugin-sdk/mattermost*`, `plugin-sdk/msteams`, `plugin-sdk/nextcloud-talk`, `plugin-sdk/nostr`, `plugin-sdk/tlon`, `plugin-sdk/twitch`, `plugin-sdk/github-copilot-login`, `plugin-sdk/github-copilot-token`, `plugin-sdk/diagnostics-otel`, `plugin-sdk/diffs`, `plugin-sdk/llm-task`, `plugin-sdk/thread-ownership` y `plugin-sdk/voice-call`

`plugin-sdk/github-copilot-token` actualmente expone la superficie estrecha de ayuda de tokens `DEFAULT_COPILOT_API_BASE_URL`, `deriveCopilotApiBaseUrlFromToken` y `resolveCopilotApiToken`.

Utilice la importación más estrecha que coincida con la tarea. Si no puede encontrar una exportación, verifique el código fuente en `src/plugin-sdk/` o pregunte en Discord.

## Cronograma de eliminación

| Cuándo                    | Qué sucede                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------- |
| **Ahora**                 | Las superficies obsoletas emiten advertencias de tiempo de ejecución                |
| **Próxima versión mayor** | Las superficies en desuso se eliminarán; los complementos que aún las usen fallarán |

Todos los complementos principales ya han sido migrados. Los complementos externos deben migrar
antes de la próxima versión mayor.

## Suprimir las advertencias temporalmente

Establezca estas variables de entorno mientras trabaja en la migración:

```bash
OPENCLAW_SUPPRESS_PLUGIN_SDK_COMPAT_WARNING=1 openclaw gateway run
OPENCLAW_SUPPRESS_EXTENSION_API_WARNING=1 openclaw gateway run
```

Esta es una solución temporal, no una solución permanente.

## Relacionado

- [Introducción](/es/plugins/building-plugins) — construye tu primer plugin
- [Resumen del SDK](/es/plugins/sdk-overview) — referencia completa de importación de subrutas
- [Channel Plugins](/es/plugins/sdk-channel-plugins) — creación de complementos de canal
- [Provider Plugins](/es/plugins/sdk-provider-plugins) — creación de complementos de proveedor
- [Interno del complemento](/es/plugins/architecture) — inmersión profunda en la arquitectura
- [Plugin Manifest](/es/plugins/manifest) — referencia del esquema de manifiesto
