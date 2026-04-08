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

- **`openclaw/plugin-sdk/compat`** — una sola importación que volvía a exportar docenas de
  asistentes. Se introdujo para mantener los complementos basados en ganchos antiguos funcionando mientras se
  construía la nueva arquitectura de complementos.
- **`openclaw/extension-api`** — un puente que daba a los complementos acceso directo a
  los asistentes del lado del host, como el ejecutor de agentes integrado.

Ambas superficies ahora están **obsoletas**. Todavía funcionan en tiempo de ejecución, pero los nuevos complementos no deben usarlas, y los complementos existentes deben migrar antes de que la próxima versión principal las elimine.

<Warning>La capa de compatibilidad hacia atrás se eliminará en una próxima versión mayor. Los complementos que sigan importando desde estas superficies se romperán cuando eso ocurra.</Warning>

## Por qué cambió esto

El enfoque anterior causó problemas:

- **Inicio lento** — al importar un solo ayudante se cargaban docenas de módulos no relacionados
- **Dependencias circulares** — las amplias reexportaciones facilitaban la creación de ciclos de importación
- **Superficie de API poco clara** — ninguna forma de saber qué exportaciones eran estables frente a las internas

El SDK de complementos moderno soluciona esto: cada ruta de importación (`openclaw/plugin-sdk/\<subpath\>`)
es un módulo pequeño y autónomo con un propósito claro y un contrato documentado.

Las costuras de conveniencia del proveedor heredado para los canales agrupados también han desaparecido. Las importaciones
tales como `openclaw/plugin-sdk/slack`, `openclaw/plugin-sdk/discord`,
`openclaw/plugin-sdk/signal`, `openclaw/plugin-sdk/whatsapp`,
costuras de asistentes con marca de canal y
`openclaw/plugin-sdk/telegram-core` eran atajos privados de mono-repositorio, no
contratos de complementos estables. En su lugar, utilice subrutas de SDK genéricas y estrechas. Dentro del
espacio de trabajo del complemento agrupado, mantenga los asistentes propiedad del proveedor en el propio
`api.ts` o `runtime-api.ts` de ese complemento.

Ejemplos de proveedores agrupados actuales:

- Anthropic mantiene los asistentes de transmisión específicos de Claude en su propia `api.ts` /
  `contract-api.ts` de costura
- OpenAI mantiene los constructores de proveedores, los asistentes de modelos predeterminados y los constructores de
  proveedores en tiempo real en su propio `api.ts`
- OpenRouter mantiene el constructor de proveedores y los asistentes de incorporación/configuración en su propio
  `api.ts`

## Cómo migrar

<Steps>
  <Step title="Auditar el comportamiento de reserva del contenedor de Windows">
    Si su complemento utiliza `openclaw/plugin-sdk/windows-spawn`, los contenedores de Windows
    `.cmd`/`.bat` sin resolver ahora fallan de forma cerrada a menos que pase explícitamente
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

    Si su llamador no depende intencionalmente de la reserva (fallback) del shell, no configure
    `allowShellFallback` y maneje el error lanzado en su lugar.

  </Step>

  <Step title="Buscar importaciones obsoletas">
    Busque en su complemento importaciones de cualquiera de las superficies obsoletas:

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

    Para los auxiliares del lado del host, utilice el tiempo de ejecución del complemento inyectado en lugar de importar
    directamente:

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

  <Step title="Compilar y probar">
    ```bash
    pnpm build
    pnpm test -- my-plugin/
    ```
  </Step>
</Steps>

## Referencia de ruta de importación

<Accordion title="Tabla de rutas de importación comunes">
  | Ruta de importación | Propósito | Exportaciones clave | | --- | --- | --- | | `plugin-sdk/plugin-entry` | Auxiliar de entrada de plugin canónico | `definePluginEntry` | | `plugin-sdk/core` | Re-exportación paraguas heredada para definiciones/constructores de entrada de canal | `defineChannelPluginEntry`, `createChatChannelPlugin` | | `plugin-sdk/config-schema` | Exportación del esquema de
  configuración raíz | `OpenClawSchema` | | `plugin-sdk/provider-entry` | Auxiliar de entrada de proveedor único | `defineSingleProviderPluginEntry` | | `plugin-sdk/channel-core` | Definiciones y constructores de entrada de canal enfocados | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` | | `plugin-sdk/setup` | Auxiliares compartidos del
  asistente de configuración | Prompts de lista de permitidos, constructores de estado de configuración | | `plugin-sdk/setup-runtime` | Auxiliares de tiempo de ejecución de configuración | Adaptadores de parches de configuración seguros para importaciones, auxiliares de notas de búsqueda, `promptResolvedAllowFrom`, `splitSetupEntries`, proxies de configuración delegados | |
  `plugin-sdk/setup-adapter-runtime` | Auxiliares de adaptador de configuración | `createEnvPatchedAccountSetupAdapter` | | `plugin-sdk/setup-tools` | Auxiliares de herramientas de configuración | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` | | `plugin-sdk/account-core` | Auxiliares multicuenta | Auxiliares de
  lista/configuración/compu de acción de cuenta | | `plugin-sdk/account-id` | Auxiliares de ID de cuenta | `DEFAULT_ACCOUNT_ID`, normalización de ID de cuenta | | `plugin-sdk/account-resolution` | Auxiliares de búsqueda de cuenta | Auxiliares de búsqueda de cuenta + reserva predeterminada | | `plugin-sdk/account-helpers` | Auxiliares de cuenta estrecha | Auxiliares de lista de cuenta/acción de
  cuenta | | `plugin-sdk/channel-setup` | Adaptadores del asistente de configuración | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`, además de `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` | | `plugin-sdk/channel-pairing` | Primitivas de emparejamiento MD |
  `createChannelPairingController` | | `plugin-sdk/channel-reply-pipeline` | Prefijo de respuesta + cableado de escritura | `createChannelReplyPipeline` | | `plugin-sdk/channel-config-helpers` | Fábricas de adaptador de configuración | `createHybridChannelConfigAdapter` | | `plugin-sdk/channel-config-schema` | Constructores de esquema de configuración | Tipos de esquema de configuración de canal |
  | `plugin-sdk/telegram-command-config` | Auxiliares de configuración de comandos de Telegram | Normalización de nombre de comando, recorte de descripción, validación de duplicados/conflictos | | `plugin-sdk/channel-policy` | Resolución de políticas de grupo/MD | `resolveChannelGroupRequireMention` | | `plugin-sdk/channel-lifecycle` | Seguimiento del estado de la cuenta |
  `createAccountStatusSink` | | `plugin-sdk/inbound-envelope` | Auxiliares de sobre entrante | Auxiliares de ruta compartida + constructor de sobre | | `plugin-sdk/inbound-reply-dispatch` | Auxiliares de respuesta entrante | Auxiliares de registro y despacho compartidos | | `plugin-sdk/messaging-targets` | Análisis de destino de mensajería | Auxiliares de análisis/coincidencia de destino | |
  `plugin-sdk/outbound-media` | Auxiliares de medios salientes | Carga de medios salientes compartida | | `plugin-sdk/outbound-runtime` | Auxiliares de tiempo de ejecución saliente | Auxiliares de identidad de salida/delegación de envío | | `plugin-sdk/thread-bindings-runtime` | Auxiliares de enlace de hilo | Auxiliares de ciclo de vida y adaptador de enlace de hilo | |
  `plugin-sdk/agent-media-payload` | Auxiliares de carga útil de medios heredados | Constructor de carga útil de medios de agente para diseños de campo heredados | | `plugin-sdk/channel-runtime` | Shim de compatibilidad en desuso | Utilidades de tiempo de ejecución de canal heredadas solamente | | `plugin-sdk/channel-send-result` | Tipos de resultado de envío | Tipos de resultado de respuesta | |
  `plugin-sdk/runtime-store` | Almacenamiento persistente de plugins | `createPluginRuntimeStore` | | `plugin-sdk/runtime` | Auxiliares amplios de tiempo de ejecución | Auxiliares de tiempo de ejecución/registro/reserva/instalación de plugin | | `plugin-sdk/runtime-env` | Auxiliares estrechos de entorno de tiempo de ejecución | Registrador/entorno de tiempo de ejecución, tiempo de espera,
  reintento y auxiliares de retroceso | | `plugin-sdk/plugin-runtime` | Auxiliares compartidos de tiempo de ejecución de plugin | Auxiliares de comandos/ganchos/http/interactivos de plugin | | `plugin-sdk/hook-runtime` | Auxiliares de canalización de ganchos | Auxiliares de canalización de webhook/ganchos internos compartidos | | `plugin-sdk/lazy-runtime` | Auxiliares perezosos de tiempo de
  ejecución | `createLazyRuntimeModule`, `createLazyRuntimeMethod`, `createLazyRuntimeMethodBinder`, `createLazyRuntimeNamedExport`, `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | Auxiliares de proceso | Auxiliares de ejecución compartidos | | `plugin-sdk/cli-runtime` | Auxiliares de tiempo de ejecución de CLI | Formato de comandos, esperas, auxiliares de versión | |
  `plugin-sdk/gateway-runtime` | Auxiliares de puerta de enlace | Cliente de puerta de enlace y auxiliares de parches de estado de canal | | `plugin-sdk/config-runtime` | Auxiliares de configuración | Auxiliares de carga/escritura de configuración | | `plugin-sdk/telegram-command-config` | Auxiliares de comandos de Telegram | Auxiliares de validación de comandos de Telegram estables de reserva
  cuando la superficie de contrato de Telegram incluida no está disponible | | `plugin-sdk/approval-runtime` | Auxiliares de prompt de aprobación | Carga útil de aprobación de ejecución/plugin, auxiliares de capacidad/perfil de aprobación, auxiliares de enrutamiento/tiempo de ejecución de aprobación nativa | | `plugin-sdk/approval-auth-runtime` | Auxiliares de autenticación de aprobación |
  Resolución de aprobador, autenticación de acción del mismo chat | | `plugin-sdk/approval-client-runtime` | Auxiliares de cliente de aprobación | Auxiliares de perfil/filtro de aprobación de ejecución nativa | | `plugin-sdk/approval-delivery-runtime` | Auxiliares de entrega de aprobación | Adaptadores de capacidad/entrega de aprobación nativa | | `plugin-sdk/approval-native-runtime` | Auxiliares
  de destino de aprobación | Auxiliares de destino de aprobación nativa/enlace de cuenta | | `plugin-sdk/approval-reply-runtime` | Auxiliares de respuesta de aprobación | Auxiliares de carga útil de respuesta de aprobación de ejecución/plugin | | `plugin-sdk/security-runtime` | Auxiliares de seguridad | Auxiliares de confianza compartida, compu de MD, contenido externo y recolección de secretos |
  | `plugin-sdk/ssrf-policy` | Auxiliares de políticas SSRF | Auxiliares de lista de permitidos de host y políticas de red privada | | `plugin-sdk/ssrf-runtime` | Auxiliares de tiempo de ejecución SSRF | Despachador anclado, búsqueda protegida, auxiliares de políticas SSRF | | `plugin-sdk/collection-runtime` | Auxiliares de caché delimitado | `pruneMapToMaxSize` | | `plugin-sdk/diagnostic-runtime`
  | Auxiliares de compu de diagnóstico | `isDiagnosticFlagEnabled`, `isDiagnosticsEnabled` | | `plugin-sdk/error-runtime` | Auxiliares de formato de error | `formatUncaughtError`, `isApprovalNotFoundError`, auxiliares de gráfico de error | | `plugin-sdk/fetch-runtime` | Auxiliares de búsqueda/proxy envueltos | `resolveFetch`, auxiliares de proxy | | `plugin-sdk/host-runtime` | Auxiliares de
  normalización de host | `normalizeHostname`, `normalizeScpRemoteHost` | | `plugin-sdk/retry-runtime` | Auxiliares de reintento | `RetryConfig`, `retryAsync`, ejecutores de políticas | | `plugin-sdk/allow-from` | Formato de lista de permitidos | `formatAllowFromLowercase` | | `plugin-sdk/allowlist-resolution` | Mapeo de entrada de lista de permitidos | `mapAllowlistResolutionInputs` | |
  `plugin-sdk/command-auth` | Compu de comandos y auxiliares de superficie de comandos | `resolveControlCommandGate`, auxiliares de autorización de remitente, auxiliares de registro de comandos | | `plugin-sdk/secret-input` | Análisis de entrada secreta | Auxiliares de entrada secreta | | `plugin-sdk/webhook-ingress` | Auxiliares de solicitud de Webhook | Utilidades de destino de Webhook | |
  `plugin-sdk/webhook-request-guards` | Auxiliares de guarda de cuerpo de Webhook | Auxiliares de lectura/límite del cuerpo de la solicitud | | `plugin-sdk/reply-runtime` | Tiempo de ejecución de respuesta compartida | Despacho entrante, latido, planificador de respuesta, fragmentación | | `plugin-sdk/reply-dispatch-runtime` | Auxiliares estrechos de despacho de respuesta | Finalizar + auxiliares
  de despacho de proveedor | | `plugin-sdk/reply-history` | Auxiliares de historial de respuestas | `buildHistoryContext`, `buildPendingHistoryContextFromMap`, `recordPendingHistoryEntry`, `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | Planificación de referencia de respuesta | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | Auxiliares de fragmentos de respuesta
  | Auxiliares de fragmentación de texto/markdown | | `plugin-sdk/session-store-runtime` | Auxiliares de almacén de sesiones | Auxiliares de ruta de almacén + actualizado en | | `plugin-sdk/state-paths` | Auxiliares de ruta de estado | Auxiliares de directorio de estado y OAuth | | `plugin-sdk/routing` | Auxiliares de enrutamiento/clave de sesión | `resolveAgentRoute`, `buildAgentSessionKey`,
  `resolveDefaultAgentBoundAccountId`, auxiliares de normalización de clave de sesión | | `plugin-sdk/status-helpers` | Auxiliares de estado del canal | Constructores de resumen de estado de canal/cuenta, valores predeterminados de estado de tiempo de ejecución, auxiliares de metadatos de problemas | | `plugin-sdk/target-resolver-runtime` | Auxiliares de resolvedor de destino | Auxiliares de
  resolvedor de destino compartidos | | `plugin-sdk/string-normalization-runtime` | Auxiliares de normalización de cadenas | Auxiliares de normalización de slug/cadena | | `plugin-sdk/request-url` | Auxiliares de URL de solicitud | Extraer cadenas URL de entradas similares a solicitudes | | `plugin-sdk/run-command` | Auxiliares de comando temporizado | Ejecutor de comando temporizado con
  stdout/stderr normalizados | | `plugin-sdk/param-readers` | Lectores de parámetros | Lectores de parámetros comunes de herramienta/CLI | | `plugin-sdk/tool-send` | Extracción de envío de herramienta | Extraer campos de destino de envío canónicos de argumentos de herramienta | | `plugin-sdk/temp-path` | Auxiliares de ruta temporal | Auxiliares de ruta de descarga temporal compartida | |
  `plugin-sdk/logging-core` | Auxiliares de registro | Auxiliares de registrador de subsistema y redacción | | `plugin-sdk/markdown-table-runtime` | Auxiliares de tabla Markdown | Auxiliares de modo de tabla Markdown | | `plugin-sdk/reply-payload` | Tipos de respuesta de mensaje | Tipos de carga útil de respuesta | | `plugin-sdk/provider-setup` | Auxiliares de configuración de proveedor
  local/autohospedado curados | Auxiliares de descubrimiento/configuración de proveedor autohospedado | | `plugin-sdk/self-hosted-provider-setup` | Auxiliares de configuración de proveedor autohospedado compatible con OpenAI enfocados | Mismos auxiliares de descubrimiento/configuración de proveedor autohospedado | | `plugin-sdk/provider-auth-runtime` | Auxiliares de autenticación de tiempo de
  ejecución de proveedor | Auxiliares de resolución de clave de API de tiempo de ejecución | | `plugin-sdk/provider-auth-api-key` | Auxiliares de configuración de clave de API de proveedor | Auxiliares de incorporación/escritura de perfil de clave de API | | `plugin-sdk/provider-auth-result` | Auxiliares de resultado de autenticación de proveedor | Constructor de resultado de autenticación OAuth
  estándar | | `plugin-sdk/provider-auth-login` | Auxiliares de inicio de sesión interactivo de proveedor | Auxiliares de inicio de sesión interactivo compartidos | | `plugin-sdk/provider-env-vars` | Auxiliares de variables de entorno de proveedor | Auxiliares de búsqueda de variables de entorno de autenticación de proveedor | | `plugin-sdk/provider-model-shared` | Auxiliares compartidos de
  modelo/reproducción de proveedor | `ProviderReplayFamily`, `buildProviderReplayFamilyHooks`, `normalizeModelCompat`, constructores de políticas de reproducción compartidas, auxiliares de punto final de proveedor y auxiliares de normalización de ID de modelo | | `plugin-sdk/provider-catalog-shared` | Auxiliares compartidos de catálogo de proveedor | `findCatalogTemplate`,
  `buildSingleProviderApiKeyCatalog`, `supportsNativeStreamingUsageCompat`, `applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-onboard` | Parches de incorporación de proveedor | Auxiliares de configuración de incorporación | | `plugin-sdk/provider-http` | Auxiliares HTTP de proveedor | Auxiliares de capacidad de HTTP/punto final de proveedor genérico | |
  `plugin-sdk/provider-web-fetch` | Auxiliares de búsqueda web de proveedor | Auxiliares de registro/caché de proveedor de búsqueda web | | `plugin-sdk/provider-web-search` | Auxiliares de búsqueda web de proveedor | Auxiliares de registro/caché/configuración de proveedor de búsqueda web | | `plugin-sdk/provider-tools` | Auxiliares de compatibilidad de herramienta/esquema de proveedor |
  `ProviderToolCompatFamily`, `buildProviderToolCompatFamilyHooks`, limpieza y diagnóstico del esquema de Gemini, y auxiliares de compatibilidad xAI como `resolveXaiModelCompatPatch` / `applyXaiModelCompat` | | `plugin-sdk/provider-usage` | Auxiliares de uso de proveedor | `fetchClaudeUsage`, `fetchGeminiUsage`, `fetchGithubCopilotUsage`, y otros auxiliares de uso de proveedor | |
  `plugin-sdk/provider-stream` | Auxiliares de envoltura de flujo de proveedor | `ProviderStreamFamily`, `buildProviderStreamFamilyHooks`, `composeProviderStreamWrappers`, tipos de envoltura de flujo, y auxiliares de envoltura compartidos de Anthropic/Bedrock/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot | | `plugin-sdk/keyed-async-queue` | Cola asíncrona ordenada |
  `KeyedAsyncQueue` | | `plugin-sdk/media-runtime` | Auxiliares de medios compartidos | Auxiliares de obtención/transformación/almacenamiento de medios más constructores de carga útil de medios | | `plugin-sdk/media-understanding` | Auxiliares de comprensión de medios | Tipos de proveedor de comprensión de medios más exportaciones de auxiliares de imagen/audio orientados al proveedor | |
  `plugin-sdk/text-runtime` | Auxiliares de texto compartidos | Eliminación de texto visible para el asistente, auxiliares de representación/fragmentación/tabla de markdown, auxiliares de redacción, auxiliares de etiquetas de directivas, utilidades de texto seguro, y auxiliares relacionados de texto/registro | | `plugin-sdk/text-chunking` | Auxiliares de fragmentación de texto | Auxiliar de
  fragmentación de texto saliente | | `plugin-sdk/speech` | Auxiliares de voz | Tipos de proveedor de voz más auxiliares de directiva, registro y validación orientados al proveedor | | `plugin-sdk/speech-core` | Núcleo de voz compartida | Tipos de proveedor de voz, registro, directivas, normalización | | `plugin-sdk/realtime-transcription` | Auxiliares de transcripción en tiempo real | Tipos de
  proveedor y auxiliares de registro | | `plugin-sdk/realtime-voice` | Auxiliares de voz en tiempo real | Tipos de proveedor y auxiliares de registro | | `plugin-sdk/image-generation-core` | Núcleo compartido de generación de imágenes | Tipos de generación de imágenes, conmutación por error, autenticación y auxiliares de registro | | `plugin-sdk/music-generation` | Auxiliares de generación de
  música | Tipos de proveedor/solicitud/resultado de generación de música | | `plugin-sdk/music-generation-core` | Núcleo compartido de generación de música | Tipos de generación de música, auxiliares de conmutación por error, búsqueda de proveedor y análisis de referencia de modelo | | `plugin-sdk/video-generation` | Auxiliares de generación de video | Tipos de proveedor/solicitud/resultado de
  generación de video | | `plugin-sdk/video-generation-core` | Núcleo compartido de generación de video | Tipos de generación de video, auxiliares de conmutación por error, búsqueda de proveedor y análisis de referencia de modelo | | `plugin-sdk/interactive-runtime` | Auxiliares de respuesta interactiva | Normalización/reducción de carga útil de respuesta interactiva | |
  `plugin-sdk/channel-config-primitives` | Primitivas de configuración de canal | Primitivas de esquema de configuración de canal estrecho | | `plugin-sdk/channel-config-writes` | Auxiliares de escritura de configuración de canal | Auxiliares de autorización de escritura de configuración de canal | | `plugin-sdk/channel-plugin-common` | Preludio compartido de canal | Exportaciones de preludio de
  plugin de canal compartido | | `plugin-sdk/channel-status` | Auxiliares de estado del canal | Auxiliares de instantánea/resumen de estado de canal compartido | | `plugin-sdk/allowlist-config-edit` | Auxiliares de configuración de lista de permitidos | Auxiliares de edición/lectura de configuración de lista de permitidos | | `plugin-sdk/group-access` | Auxiliares de acceso de grupo | Auxiliares
  de decisión de acceso de grupo compartido | | `plugin-sdk/direct-dm` | Auxiliares de MD directo | Auxiliares de autorización/guarda de MD directo compartido | | `plugin-sdk/extension-shared` | Auxiliares de extensión compartida | Primitivas de auxiliares de canal pasivo/estado | | `plugin-sdk/webhook-targets` | Auxiliares de destino de Webhook | Auxiliares de registro y instalación de ruta de
  destino de Webhook | | `plugin-sdk/webhook-path` | Auxiliares de ruta de Webhook | Auxiliares de normalización de ruta de Webhook | | `plugin-sdk/web-media` | Auxiliares de medios web compartidos | Auxiliares de carga de medios remotos/locales | | `plugin-sdk/zod` | Re-exportación Zod | `zod` re-exportado para consumidores del SDK de plugin | | `plugin-sdk/memory-core` | Auxiliares de núcleo de
  memoria incluidos | Superficie de auxiliar de administrador/configuración/archivo/CLI de memoria | | `plugin-sdk/memory-core-engine-runtime` | Fachada de tiempo de ejecución del motor de memoria | Fachada de tiempo de ejecución de índice/búsqueda de memoria | | `plugin-sdk/memory-core-host-engine-foundation` | Motor de base de memoria anfitriona | Exportaciones del motor de base de memoria
  anfitriona | | `plugin-sdk/memory-core-host-engine-embeddings` | Motor de incrustación de memoria anfitriona | Exportaciones del motor de incrustación de memoria anfitriona | | `plugin-sdk/memory-core-host-engine-qmd` | Motor QMD de memoria anfitriona | Exportaciones del motor QMD de memoria anfitriona | | `plugin-sdk/memory-core-host-engine-storage` | Motor de almacenamiento de memoria
  anfitriona | Exportaciones del motor de almacenamiento de memoria anfitriona | | `plugin-sdk/memory-core-host-multimodal` | Auxiliares multimodales de memoria anfitriona | Auxiliares multimodales de memoria anfitriona | | `plugin-sdk/memory-core-host-query` | Auxiliares de consulta de memoria anfitriona | Auxiliares de consulta de memoria anfitriona | | `plugin-sdk/memory-core-host-secret` |
  Auxiliares secretos de memoria anfitriona | Auxiliares secretos de memoria anfitriona | | `plugin-sdk/memory-core-host-status` | Auxiliares de estado de memoria anfitriona | Auxiliares de estado de memoria anfitriona | | `plugin-sdk/memory-core-host-runtime-cli` | Tiempo de ejecución de CLI de memoria anfitriona | Auxiliares de tiempo de ejecución de CLI de memoria anfitriona | |
  `plugin-sdk/memory-core-host-runtime-core` | Tiempo de ejecución central de memoria anfitriona | Auxiliares de tiempo de ejecución central de memoria anfitriona | | `plugin-sdk/memory-core-host-runtime-files` | Auxiliares de archivo/tiempo de ejecución de memoria anfitriona | Auxiliares de archivo/tiempo de ejecución de memoria anfitriona | | `plugin-sdk/memory-lancedb` | Auxiliares de
  memory-lancedb incluidos | Superficie de auxiliar de memory-lancedb | | `plugin-sdk/testing` | Utilidades de prueba | Auxiliares de prueba y simulacros |
</Accordion>

Esta tabla es intencionalmente el subconjunto común de migración, no la superficie
completa del SDK. La lista completa de más de 200 puntos de entrada se encuentra en
`scripts/lib/plugin-sdk-entrypoints.json`.

Esa lista todavía incluye algunos puntos de conexión auxiliares de complementos
incluidos, como `plugin-sdk/feishu`, `plugin-sdk/feishu-setup`, `plugin-sdk/zalo`,
`plugin-sdk/zalo-setup` y `plugin-sdk/matrix*`. Estos siguen exportados para
el mantenimiento y la compatibilidad de los complementos incluidos, pero se han
omitido intencionalmente de la tabla de migración común y no son el objetivo
recomendado para el código nuevo de complementos.

La misma regla se aplica a otras familias de auxiliares incluidos, como:

- auxiliares de soporte del navegador: `plugin-sdk/browser-cdp`, `plugin-sdk/browser-config-runtime`, `plugin-sdk/browser-config-support`, `plugin-sdk/browser-control-auth`, `plugin-sdk/browser-node-runtime`, `plugin-sdk/browser-profiles`, `plugin-sdk/browser-security-runtime`, `plugin-sdk/browser-setup-tools`, `plugin-sdk/browser-support`
- Matrix: `plugin-sdk/matrix*`
- LINE: `plugin-sdk/line*`
- IRC: `plugin-sdk/irc*`
- superficies de complementos/auxiliares incluidos como `plugin-sdk/googlechat`,
  `plugin-sdk/zalouser`, `plugin-sdk/bluebubbles*`,
  `plugin-sdk/mattermost*`, `plugin-sdk/msteams`,
  `plugin-sdk/nextcloud-talk`, `plugin-sdk/nostr`, `plugin-sdk/tlon`,
  `plugin-sdk/twitch`,
  `plugin-sdk/github-copilot-login`, `plugin-sdk/github-copilot-token`,
  `plugin-sdk/diagnostics-otel`, `plugin-sdk/diffs`, `plugin-sdk/llm-task`,
  `plugin-sdk/thread-ownership` y `plugin-sdk/voice-call`

`plugin-sdk/github-copilot-token` actualmente expone la superficie estrecha de auxiliares
de tokens `DEFAULT_COPILOT_API_BASE_URL`,
`deriveCopilotApiBaseUrlFromToken` y `resolveCopilotApiToken`.

Utilice la importación más estrecha que coincida con la tarea. Si no encuentra una
exportación, consulte el código fuente en `src/plugin-sdk/` o pregunte en Discord.

## Cronograma de eliminación

| Cuándo                        | Qué sucede                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| **Ahora**                     | Las superficies obsoletas emiten advertencias de tiempo de ejecución                |
| **Próxima versión principal** | Las superficies obsoletas se eliminarán; los complementos que aún las usen fallarán |

Todos los complementos principales ya se han migrado. Los complementos externos deben migrar
antes de la próxima versión principal.

## Suprimir las advertencias temporalmente

Establezca estas variables de entorno mientras trabaja en la migración:

```bash
OPENCLAW_SUPPRESS_PLUGIN_SDK_COMPAT_WARNING=1 openclaw gateway run
OPENCLAW_SUPPRESS_EXTENSION_API_WARNING=1 openclaw gateway run
```

Esta es una solución de escape temporal, no una solución permanente.

## Relacionado

- [Getting Started](/en/plugins/building-plugins) — crea tu primer complemento
- [SDK Overview](/en/plugins/sdk-overview) — referencia completa de importación de subrutas
- [Channel Plugins](/en/plugins/sdk-channel-plugins) — creación de complementos de canal
- [Provider Plugins](/en/plugins/sdk-provider-plugins) — creación de complementos de proveedor
- [Plugin Internals](/en/plugins/architecture) — inmersión profunda en la arquitectura
- [Plugin Manifest](/en/plugins/manifest) — referencia del esquema del manifiesto
