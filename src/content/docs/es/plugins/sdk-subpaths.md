---
summary: "Catálogo de subrutas del Plugin SDK: qué importaciones viven dónde, agrupadas por área"
read_when:
  - Choosing the right plugin-sdk subpath for a plugin import
  - Auditing bundled-plugin subpaths and helper surfaces
title: "Subrutas del Plugin SDK"
---

El SDK de complementos se expone como un conjunto de subrutas estrechas bajo `openclaw/plugin-sdk/`.
Esta página cataloga las subrutas de uso común agrupadas por propósito. La lista
generada completa de más de 200 subrutas vive en `scripts/lib/plugin-sdk-entrypoints.json`;
las subrutas auxiliares de complementos empaquetados reservadas aparecen allí pero son un detalle de
implementación a menos que una página de documentación las promueva explícitamente.

Para la guía de creación de complementos, consulte [Información general del Plugin SDK](/es/plugins/sdk-overview).

## Entrada de complemento

| Subruta                        | Exportaciones clave                                                                                                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `plugin-sdk/plugin-entry`      | `definePluginEntry`                                                                                                                                                                        |
| `plugin-sdk/core`              | `defineChannelPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase`, `defineSetupPluginEntry`, `buildChannelConfigSchema`                                                     |
| `plugin-sdk/config-schema`     | `OpenClawSchema`                                                                                                                                                                           |
| `plugin-sdk/provider-entry`    | `defineSingleProviderPluginEntry`                                                                                                                                                          |
| `plugin-sdk/migration`         | Auxiliares de elementos del proveedor de migración como `createMigrationItem`, constantes de razón, marcadores de estado de elementos, auxiliares de redacción y `summarizeMigrationItems` |
| `plugin-sdk/migration-runtime` | Auxiliares de migración en tiempo de ejecución como `copyMigrationFileItem` y `writeMigrationReport`                                                                                       |

<AccordionGroup>
  <Accordion title="Subrutas del canal">
    | Subruta | Exportaciones clave |
    | --- | --- |
    | `plugin-sdk/channel-core` | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` |
    | `plugin-sdk/config-schema` | Exportación del esquema Zod `openclaw.json` raíz (`OpenClawSchema`) |
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`, además de `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` |
    | `plugin-sdk/setup` | Ayudantes del asistente de configuración compartido, avisos de lista de permitidos, constructores de estado de configuración |
    | `plugin-sdk/setup-runtime` | `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
    | `plugin-sdk/setup-adapter-runtime` | `createEnvPatchedAccountSetupAdapter` |
    | `plugin-sdk/setup-tools` | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` |
    | `plugin-sdk/account-core` | Ayudantes de configuración/compu de acción multicuenta, ayudantes de reserva de cuenta predeterminada |
    | `plugin-sdk/account-id` | `DEFAULT_ACCOUNT_ID`, ayudantes de normalización de account-id |
    | `plugin-sdk/account-resolution` | Búsqueda de cuenta + ayudantes de reserva predeterminada |
    | `plugin-sdk/account-helpers` | Ayudantes estrechos de lista de cuentas/acción de cuenta |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | `createChannelReplyPipeline` |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter` |
    | `plugin-sdk/channel-config-schema` | Primitivas de esquema de configuración de canal compartidas y constructor genérico |
    | `plugin-sdk/channel-config-schema-legacy` | Esquemas de configuración de canal agrupados (bundled) en desuso solo para compatibilidad agrupada |
    | `plugin-sdk/telegram-command-config` | Ayudantes de normalización/validación de comandos personalizados de Telegram con reserva de contrato agrupado |
    | `plugin-sdk/command-gating` | Ayudantes estrechos de compu de autorización de comandos |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-lifecycle` | `createAccountStatusSink`, ayudantes de ciclo de vida/finalización de flujo de borrador |
    | `plugin-sdk/inbound-envelope` | Ayudantes de ruta entrante compartida + constructor de sobre |
    | `plugin-sdk/inbound-reply-dispatch` | Ayudantes compartidos de registro y envío entrantes |
    | `plugin-sdk/messaging-targets` | Ayudantes de análisis/coincidencia de objetivos |
    | `plugin-sdk/outbound-media` | Ayudantes compartidos de carga de medios salientes |
    | `plugin-sdk/outbound-send-deps` | Búsqueda de dependencia de envío saliente ligera para adaptadores de canal |
    | `plugin-sdk/outbound-runtime` | Ayudantes de entrega saliente, identidad, delegado de envío, sesión, formato y planificación de carga útil |
    | `plugin-sdk/poll-runtime` | Ayudantes estrechos de normalización de encuestas |
    | `plugin-sdk/thread-bindings-runtime` | Ciclo de vida de vinculación de hilos y ayudantes de adaptador |
    | `plugin-sdk/agent-media-payload` | Constructor de carga útil de medios de agente heredado |
    | `plugin-sdk/conversation-runtime` | Ayudantes de vinculación, emparejamiento y vinculación configurada de conversación/hilos |
    | `plugin-sdk/runtime-config-snapshot` | Ayudante de instantánea de configuración en tiempo de ejecución |
    | `plugin-sdk/runtime-group-policy` | Ayudantes de resolución de política de grupo en tiempo de ejecución |
    | `plugin-sdk/channel-status` | Ayudantes de instantánea/resumen de estado de canal compartidos |
    | `plugin-sdk/channel-config-primitives` | Primitivas estrechas de esquema de configuración de canal |
    | `plugin-sdk/channel-config-writes` | Ayudantes de autorización de escritura de configuración de canal |
    | `plugin-sdk/channel-plugin-common` | Exportaciones preliminares de complemento de canal compartido |
    | `plugin-sdk/allowlist-config-edit` | Ayudantes de edición/lectura de configuración de lista de permitidos |
    | `plugin-sdk/group-access` | Ayudantes de decisión de acceso de grupo compartidos |
    | `plugin-sdk/direct-dm` | Ayudantes de autenticación/guardia de MD directo compartido |
    | `plugin-sdk/interactive-runtime` | Presentación semántica de mensajes, entrega y ayudantes de respuesta interactiva heredados. Consulte [Presentación de mensajes](/es/plugins/message-presentation) |
    | `plugin-sdk/channel-inbound` | Barril de compatibilidad para ayuda de rebote entrante, coincidencia de mención, ayudantes de política de mención y ayudantes de sobre |
    | `plugin-sdk/channel-inbound-debounce` | Ayudantes estrechos de rebote entrante |
    | `plugin-sdk/channel-mention-gating` | Ayudantes de política de mención y texto de mención estrechos sin la superficie de tiempo de ejecución entrante más amplia |
    | `plugin-sdk/channel-envelope` | Ayudantes estrechos de formato de sobre entrante |
    | `plugin-sdk/channel-location` | Contexto y ayudantes de formato de ubicación del canal |
    | `plugin-sdk/channel-logging` | Ayudantes de registro de canal para eliminaciones entrantes y fallos de escritura/reconocimiento |
    | `plugin-sdk/channel-send-result` | Tipos de resultados de respuesta |
    | `plugin-sdk/channel-actions` | Ayudantes de acción de mensaje de canal, además de ayudantes de esquema nativo en desuso mantenidos para compatibilidad de complementos |
    | `plugin-sdk/channel-targets` | Ayudantes de análisis/coincidencia de objetivos |
    | `plugin-sdk/channel-contract` | Tipos de contrato de canal |
    | `plugin-sdk/channel-feedback` | Cableado de comentarios/reacciones |
    | `plugin-sdk/channel-secret-runtime` | Ayudantes estrechos de contrato secreto como `collectSimpleChannelFieldAssignments`, `getChannelSurface`, `pushAssignment` y tipos de objetivos secretos |
  </Accordion>

<Accordion title="Rutas secundarias del proveedor">
  | Ruta secundaria | Exportaciones clave | | --- | --- | | `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry` | | `plugin-sdk/lmstudio` | Fachada de proveedor compatible con LM Studio para configuración, descubrimiento de catálogo y preparación de modelos en tiempo de ejecución | | `plugin-sdk/lmstudio-runtime` | Fachana de tiempo de ejecución compatible con LM Studio para valores
  predeterminados del servidor local, descubrimiento de modelos, encabezados de solicitud y asistentes de modelos cargados | | `plugin-sdk/provider-setup` | Asistentes de configuración de proveedores locales/autohospedados curados | | `plugin-sdk/self-hosted-provider-setup` | Asistentes de configuración de proveedores autohospedados compatibles con OpenAI enfocados | | `plugin-sdk/cli-backend` |
  Valores predeterminados del backend de CLI + constantes de watchdog | | `plugin-sdk/provider-auth-runtime` | Asistentes de resolución de claves API en tiempo de ejecución para complementos de proveedor | | `plugin-sdk/provider-auth-api-key` | Asistentes de incorporación/escritura de perfil de clave de API como `upsertApiKeyProfile` | | `plugin-sdk/provider-auth-result` | Constructor estándar de
  resultados de autenticación OAuth | | `plugin-sdk/provider-auth-login` | Asistentes de inicio de sesión interactivo compartidos para complementos de proveedor | | `plugin-sdk/provider-env-vars` | Asistentes de búsqueda de variables de entorno de autenticación de proveedor | | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`, `ensureApiKeyFromOptionEnvOrPrompt`, `upsertAuthProfile`,
  `upsertApiKeyProfile`, `writeOAuthCredentials` | | `plugin-sdk/provider-model-shared` | `ProviderReplayFamily`, `buildProviderReplayFamilyHooks`, `normalizeModelCompat`, constructores compartidos de políticas de repetición, asistentes de endpoints de proveedor y asistentes de normalización de ID de modelo como `normalizeNativeXaiModelId` | | `plugin-sdk/provider-catalog-shared` |
  `findCatalogTemplate`, `buildSingleProviderApiKeyCatalog`, `supportsNativeStreamingUsageCompat`, `applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-http` | Asistentes genéricos de capacidades HTTP/endpoint de proveedor, errores HTTP de proveedor y asistentes de formularios multiparte para transcripción de audio | | `plugin-sdk/provider-web-fetch-contract` | Asistentes de contrato
  de configuración/selección de web-fetch estrechos como `enablePluginInConfig` y `WebFetchProviderPlugin` | | `plugin-sdk/provider-web-fetch` | Asistentes de registro/caché de proveedor web-fetch | | `plugin-sdk/provider-web-search-config-contract` | Asistentes de configuración/credenciales de búsqueda web estrechos para proveedores que no necesitan cableado de habilitación de complemento | |
  `plugin-sdk/provider-web-search-contract` | Asistentes de contrato de configuración/credenciales de búsqueda web estrechos como `createWebSearchProviderContractFields`, `enablePluginInConfig`, `resolveProviderWebSearchPluginConfig` y establecedores/obtenedores de credenciales con ámbito | | `plugin-sdk/provider-web-search` | Asistentes de registro/caché/tiempo de ejecución del proveedor de
  búsqueda web | | `plugin-sdk/provider-tools` | `ProviderToolCompatFamily`, `buildProviderToolCompatFamilyHooks`, limpieza y diagnóstico del esquema de Gemini y asistentes de compatibilidad con xAI como `resolveXaiModelCompatPatch` / `applyXaiModelCompat` | | `plugin-sdk/provider-usage` | `fetchClaudeUsage` y similares | | `plugin-sdk/provider-stream` | `ProviderStreamFamily`,
  `buildProviderStreamFamilyHooks`, `composeProviderStreamWrappers`, tipos de contenedor de flujo y asistentes de contenedor compartidos para Anthropic/Bedrock/DeepSeek V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot | | `plugin-sdk/provider-transport-runtime` | Asistentes de transporte de proveedor nativo como recuperación protegida, transformaciones de mensajes de transporte
  y flujos de eventos de transporte grabables | | `plugin-sdk/provider-onboard` | Asistentes de parche de configuración de incorporación | | `plugin-sdk/global-singleton` | Asistentes de singleton/mapa/caché locales de proceso | | `plugin-sdk/group-activation` | Modo de activación de grupo estrecho y asistentes de análisis de comandos |
</Accordion>

<Accordion title="Subrutas de autenticación y seguridad">
  | Subruta | Exportaciones clave | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate`, funciones auxiliares del registro de comandos que incluyen el formato dinámico del menú de argumentos, funciones auxiliares de autorización del remitente | | `plugin-sdk/command-status` | Constructores de mensajes de comandos/ayuda, como `buildCommandsMessagePaginated` y `buildHelpMessage`
  | | `plugin-sdk/approval-auth-runtime` | Resolución del aprobador y funciones auxiliares de autenticación de acciones en el mismo chat | | `plugin-sdk/approval-client-runtime` | Funciones auxiliares de perfil/filtro de aprobación de ejecución nativa | | `plugin-sdk/approval-delivery-runtime` | Adaptadores de capacidad/entrega de aprobación nativa | | `plugin-sdk/approval-gateway-runtime` |
  Función auxiliar compartida de resolución de puerta de enlace de aprobación | | `plugin-sdk/approval-handler-adapter-runtime` | Funciones auxiliares de carga de adaptadores de aprobación nativa ligeros para puntos de entrada de canal activo | | `plugin-sdk/approval-handler-runtime` | Funciones auxiliares de tiempo de ejecución del controlador de aprobación más amplias; se prefieren las
  interfaces de adaptador/puerta de enlace más estrechas cuando sean suficientes | | `plugin-sdk/approval-native-runtime` | Funciones auxiliares de destino de aprobación nativa + vinculación de cuenta | | `plugin-sdk/approval-reply-runtime` | Funciones auxiliares de carga útil de respuesta de aprobación de ejecución/complemento | | `plugin-sdk/approval-runtime` | Funciones auxiliares de carga útil
  de aprobación de ejecución/complemento, funciones auxiliares de enrutamiento/tiempo de ejecución de aprobación nativa, y funciones auxiliares de visualización de aprobación estructurada, como `formatApprovalDisplayPath` | | `plugin-sdk/reply-dedupe` | Funciones auxiliares de restablecimiento de deduplicación de respuesta entrante estrecha | | `plugin-sdk/channel-contract-testing` | Funciones
  auxiliares de prueba de contrato de canal estrechas sin el barril de pruebas amplio | | `plugin-sdk/command-auth-native` | Autenticación de comando nativa, formato dinámico del menú de argumentos y funciones auxiliares de destino de sesión nativa | | `plugin-sdk/command-detection` | Funciones auxiliares compartidas de detección de comandos | | `plugin-sdk/command-primitives-runtime` | Predicados
  de texto de comando ligeros para rutas de canal activo | | `plugin-sdk/command-surface` | Normalización del cuerpo del comando y funciones auxiliares de superficie del comando | | `plugin-sdk/allow-from` | `formatAllowFromLowercase` | | `plugin-sdk/channel-secret-runtime` | Funciones auxiliares de colección de contratos secretos estrechos para superficies de secretos de canal/complemento | |
  `plugin-sdk/secret-ref-runtime` | Funciones auxiliares de escritura estrecha `coerceSecretRef` y SecretRef para el análisis de contratos/configuración secretos | | `plugin-sdk/security-runtime` | Confianza compartida, filtrado de MD, contenido externo, redacción de texto sensible, comparación de secretos de tiempo constante y funciones auxiliares de colección de secretos | |
  `plugin-sdk/ssrf-policy` | Lista de permitidos de host y funciones auxiliares de políticas SSRF de red privada | | `plugin-sdk/ssrf-dispatcher` | Funciones auxiliares de despachador anclado estrechas sin la superficie amplia de tiempo de ejecución de infraestructura | | `plugin-sdk/ssrf-runtime` | Despachador anclado, recuperación protegida por SSRF, error SSRF y funciones auxiliares de
  políticas SSRF | | `plugin-sdk/secret-input` | Funciones auxiliares de análisis de entrada secreta | | `plugin-sdk/webhook-ingress` | Funciones auxiliares de solicitud/destino de webhook y coerción de websocket/cuerpo sin procesar | | `plugin-sdk/webhook-request-guards` | Funciones auxiliares de tamaño/tiempo de espera del cuerpo de la solicitud |
</Accordion>

<Accordion title="Rutas secundarias de tiempo de ejecución y almacenamiento">
  | Ruta secundaria | Exportaciones clave | | --- | --- | | `plugin-sdk/runtime` | Funciones auxiliares amplias de tiempo de ejecución/registro/copia de seguridad/instalación de complementos | | `plugin-sdk/runtime-env` | Funciones auxiliares estrechas de entorno de tiempo de ejecución, registrador, tiempo de espera, reintento y retroceso exponencial | | `plugin-sdk/browser-config` | Fachada de
  configuración de navegador compatible para perfiles/valores predeterminados normalizados, análisis de URL de CDP y funciones auxiliares de autenticación de control de navegador | | `plugin-sdk/channel-runtime-context` | Funciones auxiliares de registro y búsqueda genéricas de contexto de tiempo de ejecución de canal | | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | |
  `plugin-sdk/plugin-runtime` | Funciones auxiliares compartidas de comandos/ganchos/http/interactivos de complementos | | `plugin-sdk/hook-runtime` | Funciones auxiliares compartidas de canalización de webhook/ganchos internos | | `plugin-sdk/lazy-runtime` | Funciones auxiliares de importación/vinculación de tiempo de ejecución diferidas, como `createLazyRuntimeModule`, `createLazyRuntimeMethod`
  y `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | Funciones auxiliares de ejecución de procesos | | `plugin-sdk/cli-runtime` | Funciones auxiliares de formato CLI, espera, versión, invocación de argumentos y grupos de comandos diferidos | | `plugin-sdk/gateway-runtime` | Cliente de puerta de enlace, RPC CLI de puerta de enlace, errores de protocolo de puerta de enlace y funciones
  auxiliares de parches de estado del canal | | `plugin-sdk/config-types` | Superficie de configuración solo de tipos para formas de configuración de complementos, como `OpenClawConfig` y tipos de configuración de canal/proveedor | | `plugin-sdk/plugin-config-runtime` | Funciones auxiliares de búsqueda de configuración de complementos en tiempo de ejecución, como `requireRuntimeConfig`,
  `resolvePluginConfigObject` y `resolveLivePluginConfigObject` | | `plugin-sdk/config-mutation` | Funciones auxiliares de mutación de configuración transaccional, como `mutateConfigFile`, `replaceConfigFile` y `logConfigUpdated` | | `plugin-sdk/runtime-config-snapshot` | Funciones auxiliares de instantáneas de configuración del proceso actual, como `getRuntimeConfig`, `getRuntimeConfigSnapshot` y
  definidores de instantáneas de prueba | | `plugin-sdk/telegram-command-config` | Normalización de nombre/descripción de comandos de Telegram y verificaciones de duplicados/conflictos, incluso cuando la superficie del contrato de Telegram incluido no está disponible | | `plugin-sdk/text-autolink-runtime` | Detección de enlaces automáticos de referencia de archivo sin el barril amplio de tiempo de
  ejecución de texto | | `plugin-sdk/approval-runtime` | Funciones auxiliares de aprobación de ejecución/complemento, constructores de capacidades de aprobación, funciones auxiliares de autenticación/perfil, funciones auxiliares de enrutamiento/tiempo de ejecución nativas y formato de ruta de visualización de aprobación estructurada | | `plugin-sdk/reply-runtime` | Funciones auxiliares de tiempo
  de ejecución compartidas de entrada/respuesta, fragmentación, despacho, latido y planificador de respuestas | | `plugin-sdk/reply-dispatch-runtime` | Funciones auxiliares estrechas de despacho/finalización de respuesta y etiquetas de conversación | | `plugin-sdk/reply-history` | Funciones auxiliares compartidas de historial de respuestas de ventana corta, como `buildHistoryContext`,
  `recordPendingHistoryEntry` y `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | Funciones auxiliares estrechas de fragmentación de texto/markdown | | `plugin-sdk/session-store-runtime` | Ruta de almacén de sesión, clave de sesión, fecha de actualización y funciones auxiliares de mutación de almacén | |
  `plugin-sdk/cron-store-runtime` | Funciones auxiliares de ruta/carga/guardado de almacén Cron | | `plugin-sdk/state-paths` | Funciones auxiliares de ruta de directorio Estado/OAuth | | `plugin-sdk/routing` | Funciones auxiliares de vinculación de ruta/clave de sesión/cuenta, como `resolveAgentRoute`, `buildAgentSessionKey` y `resolveDefaultAgentBoundAccountId` | | `plugin-sdk/status-helpers` |
  Funciones auxiliares compartidas de resumen de estado de canal/cuenta, valores predeterminados de estado de tiempo de ejecución y funciones auxiliares de metadatos de problemas | | `plugin-sdk/target-resolver-runtime` | Funciones auxiliares compartidas de resolución de objetivos | | `plugin-sdk/string-normalization-runtime` | Funciones auxiliares de normalización de slug/cadena | |
  `plugin-sdk/request-url` | Extraer URL de cadena de entradas similares a fetch/solicitud | | `plugin-sdk/run-command` | Ejecutor de comandos cronometrado con resultados normalizados de stdout/stderr | | `plugin-sdk/param-readers` | Lectores de parámetros comunes de herramientas/CLI | | `plugin-sdk/tool-payload` | Extraer cargas útiles normalizadas de objetos de resultados de herramientas | |
  `plugin-sdk/tool-send` | Extraer campos de destino de envío canónicos de argumentos de herramientas | | `plugin-sdk/temp-path` | Funciones auxiliares compartidas de ruta de descarga temporal | | `plugin-sdk/logging-core` | Registrador de subsistemas y funciones auxiliares de redacción | | `plugin-sdk/markdown-table-runtime` | Modo de tabla Markdown y funciones auxiliares de conversión | |
  `plugin-sdk/model-session-runtime` | Funciones auxiliares de anulación de modelo/sesión, como `applyModelOverrideToSessionEntry` y `resolveAgentMaxConcurrent` | | `plugin-sdk/talk-config-runtime` | Funciones auxiliares de resolución de configuración del proveedor Talk | | `plugin-sdk/json-store` | Pequeñas funciones auxiliares de lectura/escritura de estado JSON | | `plugin-sdk/file-lock` |
  Funciones auxiliares de bloqueo de archivo reentrante | | `plugin-sdk/persistent-dedupe` | Funciones auxiliares de caché de deduplicación respaldada en disco | | `plugin-sdk/acp-runtime` | Funciones auxiliares de tiempo de ejecución/sesión ACP y despacho de respuestas | | `plugin-sdk/acp-binding-resolve-runtime` | Resolución de vinculación ACP de solo lectura sin importaciones de inicio del
  ciclo de vida | | `plugin-sdk/agent-config-primitives` | Primitivas estrechas de esquema de configuración de tiempo de ejecución de agente | | `plugin-sdk/boolean-param` | Lector de parámetros booleanos suelto | | `plugin-sdk/dangerous-name-runtime` | Funciones auxiliares de resolución de coincidencia de nombres peligrosos | | `plugin-sdk/device-bootstrap` | Funciones auxiliares de token de
  arranque y emparejamiento de dispositivos | | `plugin-sdk/extension-shared` | Primitivas auxiliares compartidas de canal pasivo, estado y proxy ambiente | | `plugin-sdk/models-provider-runtime` | Funciones auxiliares de respuesta de comando/proveedor `/models` | | `plugin-sdk/skill-commands-runtime` | Funciones auxiliares de listado de comandos de habilidades | |
  `plugin-sdk/native-command-registry` | Funciones auxiliares de registro/compilación/serialización de comandos nativos | | `plugin-sdk/agent-harness` | Superficie experimental de complemento de confianza para arneses de agentes de bajo nivel: tipos de arnés, funciones auxiliares de dirección/interrupción de ejecución activa, funciones auxiliares de puente de herramientas OpenClaw, funciones
  auxiliares de políticas de herramientas de plan de tiempo de ejecución, clasificación de resultados de terminales, funciones auxiliares de formato/detalles de progreso de herramientas y utilidades de resultados de intentos | | `plugin-sdk/provider-zai-endpoint` | Funciones auxiliares de detección de extremos Z.AI | | `plugin-sdk/infra-runtime` | Funciones auxiliares de eventos/latidos del
  sistema | | `plugin-sdk/collection-runtime` | Pequeñas funciones auxiliares de caché delimitada | | `plugin-sdk/diagnostic-runtime` | Funciones auxiliares de indicadores de diagnóstico, eventos y contexto de seguimiento | | `plugin-sdk/error-runtime` | Gráfico de errores, formato, funciones auxiliares compartidas de clasificación de errores, `isApprovalNotFoundError` | |
  `plugin-sdk/fetch-runtime` | Funciones auxiliares de búsqueda, proxy y búsqueda fijada envueltas | | `plugin-sdk/runtime-fetch` | Búsqueda en tiempo de ejecución consciente del despachador sin importaciones de proxy/búsqueda protegida | | `plugin-sdk/response-limit-runtime` | Lector de cuerpo de respuesta delimitado sin la superficie amplia de tiempo de ejecución de medios | |
  `plugin-sdk/session-binding-runtime` | Estado de vinculación de conversación actual sin enrutamiento de vinculación configurado o almacenes de emparejamiento | | `plugin-sdk/session-store-runtime` | Funciones auxiliares de almacén de sesiones sin importaciones de escritura/mantenimiento de configuración amplias | | `plugin-sdk/context-visibility-runtime` | Resolución de visibilidad de contexto y
  filtrado de contexto complementario sin importaciones de configuración/seguridad amplias | | `plugin-sdk/string-coerce-runtime` | Funciones auxiliares estrechas de coerción/normalización de registros/cadenas primitivas sin importaciones de markdown/registro | | `plugin-sdk/host-runtime` | Funciones auxiliares de normalización de nombre de host y host SCP | | `plugin-sdk/retry-runtime` |
  Configuración de reintento y funciones auxiliares de ejecutor de reintento | | `plugin-sdk/agent-runtime` | Funciones auxiliares de directorio/identidad/espacio de trabajo de agente | | `plugin-sdk/directory-runtime` | Consulta/deduplicación de directorio respaldada por configuración | | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

<Accordion title="Subrutas de capacidades y pruebas">
  | Subruta | Exportaciones clave | | --- | --- | | `plugin-sdk/media-runtime` | Asistentes compartidos de obtención/transformación/almacenamiento de medios además de constructores de carga útil de medios | | `plugin-sdk/media-store` | Asistentes estrechos de almacenamiento de medios como `saveMediaBuffer` | | `plugin-sdk/media-generation-runtime` | Asistentes compartidos de conmutación por error
  de generación de medios, selección de candidatos y mensajes de modelo faltante | | `plugin-sdk/media-understanding` | Tipos de proveedor de comprensión de medios además de exportaciones de asistentes de imagen/audio orientadas al proveedor | | `plugin-sdk/text-runtime` | Asistentes compartidos de texto/markdown/registro, como eliminación de texto visible para el asistente, asistentes de
  representación/fragmentación/tablas de markdown, asistentes de redacción, asistentes de etiquetas de directiva y utilidades de texto seguro | | `plugin-sdk/text-chunking` | Asistente de fragmentación de texto saliente | | `plugin-sdk/speech` | Tipos de proveedor de voz además de exportaciones de asistentes de directiva, registro, validación y voz orientadas al proveedor | |
  `plugin-sdk/speech-core` | Tipos compartidos de proveedor de voz, registro, directiva, normalización y exportaciones de asistentes de voz | | `plugin-sdk/realtime-transcription` | Tipos de proveedor de transcripción en tiempo real, asistentes de registro y asistente compartido de sesión WebSocket | | `plugin-sdk/realtime-voice` | Tipos de proveedor de voz en tiempo real y asistentes de registro
  | | `plugin-sdk/image-generation` | Tipos de proveedor de generación de imágenes | | `plugin-sdk/image-generation-core` | Tipos compartidos de generación de imágenes, conmutación por error, autenticación y asistentes de registro | | `plugin-sdk/music-generation` | Tipos de proveedor/solicitud/resultado de generación de música | | `plugin-sdk/music-generation-core` | Tipos compartidos de
  generación de música, asistentes de conmutación por error, búsqueda de proveedores y análisis de referencia de modelo | | `plugin-sdk/video-generation` | Tipos de proveedor/solicitud/resultado de generación de video | | `plugin-sdk/video-generation-core` | Tipos compartidos de generación de video, asistentes de conmutación por error, búsqueda de proveedores y análisis de referencia de modelo | |
  `plugin-sdk/webhook-targets` | Registro de destino de webhook y asistentes de instalación de ruta | | `plugin-sdk/webhook-path` | Asistentes de normalización de ruta de webhook | | `plugin-sdk/web-media` | Asistentes compartidos de carga de medios remotos/locales | | `plugin-sdk/zod` | `zod` reexportado para consumidores del SDK de complementos | | `plugin-sdk/testing` |
  `installCommonResolveTargetErrorCases`, `shouldAckReaction` |
</Accordion>

<Accordion title="Subrutas de memoria">
  | Subruta | Exportaciones clave | | --- | --- | | `plugin-sdk/memory-core` | Superficie de ayuda de memory-core incluida para asistentes de administrador/configuración/archivo/CLI | | `plugin-sdk/memory-core-engine-runtime` | Fachada de tiempo de ejecución de índice/búsqueda de memoria | | `plugin-sdk/memory-core-host-engine-foundation` | Exportaciones del motor de base del host de memoria | |
  `plugin-sdk/memory-core-host-engine-embeddings` | Contratos de incrustación del host de memoria, acceso al registro, proveedor local y asistentes genéricos de proceso por lotes/remotos | | `plugin-sdk/memory-core-host-engine-qmd` | Exportaciones del motor QMD del host de memoria | | `plugin-sdk/memory-core-host-engine-storage` | Exportaciones del motor de almacenamiento del host de memoria | |
  `plugin-sdk/memory-core-host-multimodal` | Asistentes multimodales del host de memoria | | `plugin-sdk/memory-core-host-query` | Asistentes de consulta del host de memoria | | `plugin-sdk/memory-core-host-secret` | Asistentes de secretos del host de memoria | | `plugin-sdk/memory-core-host-events` | Asistentes de diario de eventos del host de memoria | | `plugin-sdk/memory-core-host-status` |
  Asistentes de estado del host de memoria | | `plugin-sdk/memory-core-host-runtime-cli` | Asistentes de tiempo de ejecución de CLI del host de memoria | | `plugin-sdk/memory-core-host-runtime-core` | Asistentes de tiempo de ejecución central del host de memoria | | `plugin-sdk/memory-core-host-runtime-files` | Asistentes de archivo/tiempo de ejecución del host de memoria | |
  `plugin-sdk/memory-host-core` | Alias neutral de proveedor para asistentes de tiempo de ejecución central del host de memoria | | `plugin-sdk/memory-host-events` | Alias neutral de proveedor para asistentes de diario de eventos del host de memoria | | `plugin-sdk/memory-host-files` | Alias neutral de proveedor para asistentes de archivo/tiempo de ejecución del host de memoria | |
  `plugin-sdk/memory-host-markdown` | Asistentes de markdown administrados compartidos para complementos adyacentes a la memoria | | `plugin-sdk/memory-host-search` | Fachada de tiempo de ejecución de memoria activa para el acceso del administrador de búsqueda | | `plugin-sdk/memory-host-status` | Alias neutral de proveedor para asistentes de estado del host de memoria | |
  `plugin-sdk/memory-lancedb` | Superficie de ayuda de memory-lancedb incluida |
</Accordion>

  <Accordion title="Subrutas de asistentes agrupadas reservadas">
    | Familia | Subrutas actuales | Uso previsto |
    | --- | --- | --- |
    | Navegador | `plugin-sdk/browser-cdp`, `plugin-sdk/browser-config-runtime`, `plugin-sdk/browser-config-support`, `plugin-sdk/browser-control-auth`, `plugin-sdk/browser-node-runtime`, `plugin-sdk/browser-profiles`, `plugin-sdk/browser-security-runtime`, `plugin-sdk/browser-setup-tools`, `plugin-sdk/browser-support` | Asistentes de soporte para complementos del navegador agrupados. `browser-profiles` exporta `resolveBrowserConfig`, `resolveProfile`, `ResolvedBrowserConfig`, `ResolvedBrowserProfile` y `ResolvedBrowserTabCleanupConfig` para la forma `browser.tabCleanup` normalizada. `browser-support` sigue siendo el barril de compatibilidad. |
    | Matrix | `plugin-sdk/matrix`, `plugin-sdk/matrix-helper`, `plugin-sdk/matrix-runtime-heavy`, `plugin-sdk/matrix-runtime-shared`, `plugin-sdk/matrix-runtime-surface`, `plugin-sdk/matrix-surface`, `plugin-sdk/matrix-thread-bindings` | Superficie de asistente/tiempo de ejecución de Matrix agrupada |
    | Line | `plugin-sdk/line`, `plugin-sdk/line-core`, `plugin-sdk/line-runtime`, `plugin-sdk/line-surface` | Superficie de asistente/tiempo de ejecución de LINE agrupada |
    | IRC | `plugin-sdk/irc`, `plugin-sdk/irc-surface` | Superficie de asistente de IRC agrupada |
    | Asistentes específicos del canal | `plugin-sdk/googlechat`, `plugin-sdk/googlechat-runtime-shared`, `plugin-sdk/zalouser`, `plugin-sdk/bluebubbles`, `plugin-sdk/bluebubbles-policy`, `plugin-sdk/mattermost`, `plugin-sdk/mattermost-policy`, `plugin-sdk/feishu`, `plugin-sdk/feishu-conversation`, `plugin-sdk/feishu-setup`, `plugin-sdk/msteams`, `plugin-sdk/nextcloud-talk`, `plugin-sdk/nostr`, `plugin-sdk/telegram-command-ui`, `plugin-sdk/tlon`, `plugin-sdk/twitch`, `plugin-sdk/zalo`, `plugin-sdk/zalo-setup` | Costuras de compatibilidad/asistente de canal agrupadas en desuso. Los nuevos complementos deben importar subrutas genéricas del SDK o barriles locales del complemento. |
    | Asistentes específicos de autenticación/complemento | `plugin-sdk/github-copilot-login`, `plugin-sdk/github-copilot-token`, `plugin-sdk/diagnostics-otel`, `plugin-sdk/diagnostics-prometheus`, `plugin-sdk/diffs`, `plugin-sdk/llm-task`, `plugin-sdk/memory-core`, `plugin-sdk/memory-lancedb`, `plugin-sdk/opencode`, `plugin-sdk/thread-ownership`, `plugin-sdk/voice-call` | Costuras de asistente de característica/complemento agrupadas; `plugin-sdk/github-copilot-token` actualmente exporta `DEFAULT_COPILOT_API_BASE_URL`, `deriveCopilotApiBaseUrlFromToken` y `resolveCopilotApiToken` |
  </Accordion>
</AccordionGroup>

## Relacionado

- [Información general del Plugin SDK](/es/plugins/sdk-overview)
- [Configuración del Plugin SDK](/es/plugins/sdk-setup)
- [Creación de complementos](/es/plugins/building-plugins)
