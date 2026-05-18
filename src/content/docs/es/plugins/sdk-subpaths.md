---
summary: "Catálogo de subrutas del Plugin SDK: qué importaciones viven dónde, agrupadas por área"
read_when:
  - Choosing the right plugin-sdk subpath for a plugin import
  - Auditing bundled-plugin subpaths and helper surfaces
title: "Subrutas del Plugin SDK"
---

El SDK del complemento se expone como un conjunto de subrutas públicas estrechas bajo
`openclaw/plugin-sdk/`. Esta página cataloga las subrutas de uso común agrupadas por
propósito. El inventario generado de puntos de entrada del compilador se encuentra en
`scripts/lib/plugin-sdk-entrypoints.json`; las exportaciones del paquete son el subconjunto público
después de restar las subrutas de prueba/internas locales del repositorio listadas en
`scripts/lib/plugin-sdk-private-local-only-subpaths.json`. Los mantenedores pueden auditar
el conteo de exportaciones públicas con `pnpm plugin-sdk:surface` y las subrutas de ayuda reservadas activas
con `pnpm plugins:boundary-report:summary`; las exportaciones de ayuda reservadas sin uso
hacen fallar el informe de CI en lugar de permanecer en el SDK público como
debt de compatibilidad inactiva.

Para ver la guía de creación de complementos, consulte [Información general del SDK de complementos](/es/plugins/sdk-overview).

## Entrada de complemento

| Subruta                        | Exportaciones clave                                                                                                                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/plugin-entry`      | `definePluginEntry`                                                                                                                                                                      |
| `plugin-sdk/core`              | `defineChannelPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase`, `defineSetupPluginEntry`, `buildChannelConfigSchema`, `buildJsonChannelConfigSchema`                   |
| `plugin-sdk/config-schema`     | `OpenClawSchema`                                                                                                                                                                         |
| `plugin-sdk/provider-entry`    | `defineSingleProviderPluginEntry`                                                                                                                                                        |
| `plugin-sdk/migration`         | Ayudantes de elementos de proveedor de migración como `createMigrationItem`, constantes de motivo, marcadores de estado de elementos, ayudantes de redacción y `summarizeMigrationItems` |
| `plugin-sdk/migration-runtime` | Ayudantes de migración en tiempo de ejecución como `copyMigrationFileItem`, `withCachedMigrationConfigRuntime` y `writeMigrationReport`                                                  |

### Ayudantes de compatibilidad y pruebas obsoletas

Estas rutas secundarias siguen siendo exportaciones del paquete para complementos antiguos y suites de pruebas de OpenClaw, pero el código nuevo no debe agregar importaciones desde ellas: `agent-runtime-test-contracts`, `channel-contract-testing`, `channel-target-testing`, `channel-test-helpers`, `plugin-test-api`, `plugin-test-contracts`, `provider-http-test-mocks`, `provider-test-contracts`, `test-env`, `test-fixtures`, `test-node-mocks`, `testing`, `channel-runtime`, `compat`, `config-types`, `infra-runtime`, `text-runtime` y `zod`. Importa `zod` directamente desde `zod` en el código nuevo de complementos. `plugin-test-runtime` sigue siendo una ruta secundaria de ayuda de prueba enfocada activa.

### Rutas secundarias de ayuda de complementos agrupados reservadas

Estas rutas secundarias son superficies de compatibilidad propiedad de los complementos reservadas para su complemento agrupado propietario, no API generales del SDK: `plugin-sdk/codex-mcp-projection` y `plugin-sdk/codex-native-task-runtime`. Las importaciones de extensiones de propietarios cruzados están bloqueadas por las barreras de protección del contrato del paquete.

### Rutas secundarias públicas en desuso sin uso

Estas subrutas públicas existieron durante al menos un mes y actualmente no tienen
importaciones de producción de extensiones agrupadas. Siguen siendo importables
por compatibilidad, pero el nuevo código de complementos debería utilizar
subrutas del SDK enfocadas y consumidas activamente en su lugar:
`agent-config-primitives`, `channel-config-schema-legacy`,
`channel-reply-pipeline`, `channel-runtime`, `channel-secret-runtime`,
`command-auth`, `compat`, `config-runtime`, `config-schema`, `discord`,
`group-access`, `infra-runtime`, `matrix`, `mattermost`,
`media-generation-runtime-shared`, `memory-core-engine-runtime`,
`memory-core-host-multimodal`, `memory-core-host-query`,
`music-generation-core`, `self-hosted-provider-setup`, `telegram-account`,
`telegram-command-config` y `zalouser`.

### Subrutas públicas raras en desuso

Las subrutas públicas utilizadas actualmente solo por uno o dos propietarios de
complementos agrupados también están en desuso para el nuevo código de
complementos. Siguen siendo exportaciones de paquetes por compatibilidad, pero
el nuevo código debería preferir costuras del SDK compartidas activamente o API
de paquetes propiedad de complementos. Los mantenedores rastrean el conjunto
exacto en `scripts/lib/plugin-sdk-deprecated-public-subpaths.json` y el presupuesto actual
con `pnpm plugin-sdk:surface`.

### Barriles amplios en desuso

Estos barriles de reexportación amplios siguen siendo construibles para el código fuente de OpenClaw y
las comprobaciones de compatibilidad, pero el código nuevo debería preferir subrutas del SDK enfocadas:
`agent-runtime`, `channel-lifecycle`, `channel-runtime`, `cli-runtime`,
`compat`, `config-types`, `conversation-runtime`, `hook-runtime`,
`infra-runtime`, `media-runtime`, `plugin-runtime`, `security-runtime`, y
`text-runtime`. `channel-runtime`, `compat`, `config-types`, `infra-runtime`,
y `text-runtime` siguen siendo exportaciones del paquete solo para compatibilidad con versiones anteriores; utilice
subrutas enfocadas de canal/ejecución, `config-contracts`, `string-coerce-runtime`,
`text-chunking`, `text-utility-runtime`, y `logging-core` en su lugar.

<AccordionGroup>
  <Accordion title="Subrutas del canal">
    | Subruta | Exportaciones clave |
    | --- | --- |
    | `plugin-sdk/channel-core` | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` |
    | `plugin-sdk/config-schema` | Exportación del esquema Zod `openclaw.json` raíz (`OpenClawSchema`) |
    | `plugin-sdk/json-schema-runtime` | Ayudante de validación de esquema JSON en caché para esquemas propiedad del complemento |
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`, más `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` |
    | `plugin-sdk/setup` | Ayudantes compartidos del asistente de configuración, traductor de configuración, prompts de lista de permitidos, constructores de estado de configuración |
    | `plugin-sdk/setup-runtime` | `createSetupTranslator`, `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
    | `plugin-sdk/setup-adapter-runtime` | Alias de compatibilidad en desuso; use `plugin-sdk/setup-runtime` |
    | `plugin-sdk/setup-tools` | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` |
    | `plugin-sdk/account-core` | Ayudantes de configuración/barrera de acción multicuenta, ayudantes de retorno a la cuenta predeterminada |
    | `plugin-sdk/account-id` | `DEFAULT_ACCOUNT_ID`, ayudantes de normalización de id de cuenta |
    | `plugin-sdk/account-resolution` | Búsqueda de cuenta + ayudantes de retorno al predeterminado |
    | `plugin-sdk/account-helpers` | Ayudantes estrechos de lista de cuenta/acción de cuenta |
    | `plugin-sdk/access-groups` | Ayudantes de análisis de lista de permitidos de grupo de acceso y diagnóstico de grupo redactado |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | Ayudantes heredados de canalización de respuesta. El nuevo código de canalización de respuesta del canal debe usar `createChannelMessageReplyPipeline` y `resolveChannelMessageSourceReplyDeliveryMode` de `plugin-sdk/channel-message`. |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter`, `resolveChannelDmAccess`, `resolveChannelDmAllowFrom`, `resolveChannelDmPolicy`, `normalizeChannelDmPolicy`, `normalizeLegacyDmAliases` |
    | `plugin-sdk/channel-config-schema` | Primitivas de esquema de configuración de canal compartido más constructores Zod y directos JSON/TypeBox |
    | `plugin-sdk/bundled-channel-config-schema` | Esquemas de configuración de canal OpenClaw agrupados solo para complementos agrupados mantenidos |
    | `plugin-sdk/channel-config-schema-legacy` | Alias de compatibilidad en desuso para esquemas de configuración de canal agrupados |
    | `plugin-sdk/telegram-command-config` | Ayudantes de normalización/validación de comandos personalizados de Telegram con retorno al contrato agrupado |
    | `plugin-sdk/command-gating` | Ayudantes estrechos de barrera de autorización de comandos |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-ingress` | Fachada de compatibilidad de bajo nivel en desuso para el ingreso del canal. Las nuevas rutas de recepción deben usar `plugin-sdk/channel-ingress-runtime`. |
    | `plugin-sdk/channel-ingress-runtime` | Resolvedor de tiempo de ejecución de alto nivel experimental para el ingreso del canal y constructores de hechos de ruta para rutas de recepción de canal migradas. Se prefiere esto sobre ensamblar listas de permitidos efectivas, listas de permitidos de comandos y proyecciones heredadas en cada complemento. Vea [Channel ingress API](/es/plugins/sdk-channel-ingress). |
    | `plugin-sdk/channel-lifecycle` | `createAccountStatusSink`, `createChannelRunQueue`, y ayudantes heredados del ciclo de vida del flujo de borrador. El nuevo código de finalización de vista previa debería usar `plugin-sdk/channel-message`. |
    | `plugin-sdk/channel-message` | Ayudantes de contrato de ciclo de vida de mensajes económicos como `defineChannelMessageAdapter`, `createChannelMessageAdapterFromOutbound`, `createChannelMessageReplyPipeline`, `createReplyPrefixContext`, `resolveChannelMessageSourceReplyDeliveryMode`, derivación de capacidad final duradera, ayudantes de prueba de capacidad para capacidades de envío/recibo/efecto secundario, `MessageReceiveContext`, pruebas de política de reconocimiento de recibo, `defineFinalizableLivePreviewAdapter`, `deliverWithFinalizableLivePreviewAdapter`, pruebas de capacidad de vista previa en vivo y finalizador en vivo, estado de recuperación duradero, `RenderedMessageBatch`, tipos de recibo de mensaje y ayudantes de id de recibo. Vea [Channel message API](/es/plugins/sdk-channel-message). Las fachadas de envío de respuesta heredadas están en desuso solo para compatibilidad. |
    | `plugin-sdk/channel-message-runtime` | Ayudantes de entrega en tiempo de ejecución que pueden cargar la entrega saliente, incluyendo `deliverInboundReplyWithMessageSendContext`, `sendDurableMessageBatch`, y `withDurableMessageSendContext`. Los puentes de envío de respuesta en desuso siguen siendo importables solo para despachadores de compatibilidad. Úselo desde módulos de tiempo de ejecución de monitoreo/envío, no desde archivos de arranque en caliente de complementos. |
    | `plugin-sdk/inbound-envelope` | Ayudantes compartidos de ruta de entrada + constructor de sobre |
    | `plugin-sdk/inbound-reply-dispatch` | Ayudantes heredados compartidos de registro y despacho de entrada, predicados de despacho visible/final, y `deliverDurableInboundReplyPayload` en desuso para compatibilidad con despachadores de canal preparados. El nuevo código de recepción/despacho de canal debería importar ayudantes del ciclo de vida en tiempo de ejecución desde `plugin-sdk/channel-message-runtime`. |
    | `plugin-sdk/messaging-targets` | Ayudantes de análisis/coincidencia de objetivos |
    | `plugin-sdk/outbound-media` | Ayudantes compartidos de carga de medios salientes |
    | `plugin-sdk/outbound-send-deps` | Búsqueda de dependencia de envío saliente ligera para adaptadores de canal |
    | `plugin-sdk/outbound-runtime` | Ayudantes de identidad saliente, delegado de envío, sesión, formateo y planificación de carga. Los ayudantes de entrega directa como `deliverOutboundPayloads` son un sustrato de compatibilidad en desuso; use `plugin-sdk/channel-message-runtime` para nuevas rutas de envío. |
    | `plugin-sdk/poll-runtime` | Ayudantes estrechos de normalización de encuestas |
    | `plugin-sdk/thread-bindings-runtime` | Ayudantes de ciclo de vida y adaptador de enlace de hilos |
    | `plugin-sdk/agent-media-payload` | Constructor heredado de carga de medios de agente |
    | `plugin-sdk/conversation-runtime` | Ayudantes de enlace, emparejamiento y enlace configurado de conversación/hilos |
    | `plugin-sdk/runtime-config-snapshot` | Ayudante de instantánea de configuración en tiempo de ejecución |
    | `plugin-sdk/runtime-group-policy` | Ayudantes de resolución de política de grupo en tiempo de ejecución |
    | `plugin-sdk/channel-status` | Ayudantes compartidos de instantánea/resumen de estado del canal |
    | `plugin-sdk/channel-config-primitives` | Primitivas estrechas de esquema de configuración de canal |
    | `plugin-sdk/channel-config-writes` | Ayudantes de autorización de escritura de configuración de canal |
    | `plugin-sdk/channel-plugin-common` | Exportaciones compartidas del preludio del complemento del canal |
    | `plugin-sdk/allowlist-config-edit` | Ayudantes de edición/lectura de configuración de lista de permitidos |
    | `plugin-sdk/group-access` | Ayudantes compartidos de decisión de acceso de grupo |
    | `plugin-sdk/direct-dm` | Ayudantes compartidos de autenticación/guardia de DM directo |
    | `plugin-sdk/discord` | Fachada de compatibilidad de Discord en desuso para `@openclaw/discord@2026.3.13` publicados y compatibilidad de propietario rastreada; los nuevos complementos deberían usar subrutas genéricas del SDK del canal |
    | `plugin-sdk/telegram-account` | Fachada de compatibilidad de resolución de cuenta de Telegram en desuso para compatibilidad de propietario rastreada; los nuevos complementos deberían usar ayudantes de tiempo de ejecución inyectados o subrutas genéricas del SDK del canal |
    | `plugin-sdk/zalouser` | Fachada de compatibilidad de Zalo Personal en desuso para paquetes Lark/Zalo publicados que aún importan la autorización de comandos del remitente; los nuevos complementos deberían usar `plugin-sdk/command-auth` |
    | `plugin-sdk/interactive-runtime` | Presentación semántica de mensajes, entrega y ayudantes heredados de respuesta interactiva. Vea [Message Presentation](/es/plugins/message-presentation) |
    | `plugin-sdk/channel-inbound` | Ayudantes compartidos de entrada para clasificación de eventos, construcción de contexto, rebote, coincidencia de mención, política de mención y formato de sobre |
    | `plugin-sdk/channel-inbound-debounce` | Ayudantes estrechos de rebote de entrada |
    | `plugin-sdk/channel-mention-gating` | Ayudantes estrechos de política de mención, marcador de mención y texto de mención sin la superficie de tiempo de ejecución de entrada más amplia |
    | `plugin-sdk/channel-envelope` | Ayudantes estrechos de formato de sobre de entrada |
    | `plugin-sdk/channel-location` | Ayudantes de contexto y formato de ubicación del canal |
    | `plugin-sdk/channel-logging` | Ayudantes de registro del canal para caídas de entrada y fallas de escritura/reconocimiento |
    | `plugin-sdk/channel-send-result` | Tipos de resultado de respuesta |
    | `plugin-sdk/channel-actions` | Ayudantes de acción de mensaje del canal, más ayudantes de esquema nativo en desuso mantenidos para compatibilidad del complemento |
    | `plugin-sdk/channel-route` | Normalización compartida de rutas, resolución de objetivos impulsada por analizador, conversión de id de hilo a cadena, claves de ruta de deduplicación/compactación, tipos de objetivo analizado y ayudantes de comparación de ruta/objetivo |
    | `plugin-sdk/channel-targets` | Ayudantes de análisis de objetivos; las personas que llaman a la comparación de rutas deben usar `plugin-sdk/channel-route` |
    | `plugin-sdk/channel-contract` | Tipos de contrato del canal |
    | `plugin-sdk/channel-feedback` | Cableado de comentarios/reacciones |
    | `plugin-sdk/channel-secret-runtime` | Ayudantes estrechos de contrato secreto como `collectSimpleChannelFieldAssignments`, `getChannelSurface`, `pushAssignment` y tipos de objetivos secretos |
  </Accordion>

<Accordion title="Rutas secundarias del proveedor">
  | Ruta secundaria | Exportaciones clave | | --- | --- | | `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry` | | `plugin-sdk/lmstudio` | Fachana de proveedor compatible con LM Studio para configuración, descubrimiento de catálogo y preparación de modelos en tiempo de ejecución | | `plugin-sdk/lmstudio-runtime` | Fachana de tiempo de ejecución compatible con LM Studio para valores
  predeterminados del servidor local, descubrimiento de modelos, encabezados de solicitud y auxiliares de modelos cargados | | `plugin-sdk/provider-setup` | Auxiliares de configuración de proveedores locales/autoalojados curados | | `plugin-sdk/self-hosted-provider-setup` | Auxiliares de configuración de proveedores autoalojados compatibles con OpenAI específicos | | `plugin-sdk/cli-backend` |
  Valores predeterminados del backend de CLI + constantes de watchdog | | `plugin-sdk/provider-auth-runtime` | Auxiliares de resolución de claves de API en tiempo de ejecución para complementos de proveedor | | `plugin-sdk/provider-auth-api-key` | Auxiliares de incorporación de claves de API/escritura de perfiles, como `upsertApiKeyProfile` | | `plugin-sdk/provider-auth-result` | Constructor de
  resultados de autenticación OAuth estándar | | `plugin-sdk/provider-env-vars` | Auxiliares de búsqueda de variables de entorno de autenticación del proveedor | | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`, `ensureApiKeyFromOptionEnvOrPrompt`, `upsertAuthProfile`, `upsertApiKeyProfile`, `writeOAuthCredentials`, exportación de compatibilidad `resolveOpenClawAgentDir` obsoleta |
  | `plugin-sdk/provider-model-shared` | `ProviderReplayFamily`, `buildProviderReplayFamilyHooks`, `normalizeModelCompat`, constructores de políticas de reproducción compartidas, auxiliares de puntos finales del proveedor y auxiliares compartidos de normalización de identificadores de modelo | | `plugin-sdk/provider-catalog-runtime` | Gancho de tiempo de ejecución de aumento del catálogo de
  proveedores y costuras del registro de proveedores de complementos para pruebas de contrato | | `plugin-sdk/provider-catalog-shared` | `findCatalogTemplate`, `buildSingleProviderApiKeyCatalog`, `buildManifestModelProviderConfig`, `supportsNativeStreamingUsageCompat`, `applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-http` | Auxiliares de capacidades HTTP/punto final de proveedor
  genéricas, errores HTTP de proveedor y auxiliares de formularios multiparte para transcripción de audio | | `plugin-sdk/provider-web-fetch-contract` | Auxiliares de contrato de configuración/selección de recuperación web estrechos, como `enablePluginInConfig` y `WebFetchProviderPlugin` | | `plugin-sdk/provider-web-fetch` | Auxiliares de registro/caché del proveedor de recuperación web | |
  `plugin-sdk/provider-web-search-config-contract` | Auxiliares de configuración/credenciales de búsqueda web estrechos para proveedores que no necesitan cableado de habilitación de complementos | | `plugin-sdk/provider-web-search-contract` | Auxiliares de contrato de configuración/credenciales de búsqueda web estrechos, como `createWebSearchProviderContractFields`, `enablePluginInConfig`,
  `resolveProviderWebSearchPluginConfig`, y establecedores/obtenedores de credenciales con ámbito | | `plugin-sdk/provider-web-search` | Auxiliares de registro/caché/tiempo de ejecución del proveedor de búsqueda web | | `plugin-sdk/provider-tools` | `ProviderToolCompatFamily`, `buildProviderToolCompatFamilyHooks`, y limpieza y diagnósticos del esquema de Gemini | | `plugin-sdk/provider-usage` |
  `fetchClaudeUsage` y similares | | `plugin-sdk/provider-stream` | `ProviderStreamFamily`, `buildProviderStreamFamilyHooks`, `composeProviderStreamWrappers`, tipos de contenedor de transmisión, y auxiliares de contenedor compartidos Anthropic/Bedrock/DeepSeek V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot | | `plugin-sdk/provider-transport-runtime` | Auxiliares de transporte
  de proveedor nativo, como recuperación protegida, transformaciones de mensajes de transporte y flujos de eventos de transporte grabables | | `plugin-sdk/provider-onboard` | Auxiliares de parches de configuración de incorporación | | `plugin-sdk/global-singleton` | Auxiliares de singleton/mapa/caché local de proceso | | `plugin-sdk/group-activation` | Auxiliares de modo de activación de grupo
  estrecho y análisis de comandos |
</Accordion>

<Accordion title="Subrutas de autenticación y seguridad">
  | Subruta | Exportaciones clave | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate`, asistentes del registro de comandos que incluyen el formato dinámico del menú de argumentos, asistentes de autorización del remitente | | `plugin-sdk/command-status` | Constructores de mensajes de comandos/ayuda como `buildCommandsMessagePaginated` y `buildHelpMessage` | |
  `plugin-sdk/approval-auth-runtime` | Resolución del aprobador y asistentes de autenticación de acciones en el mismo chat | | `plugin-sdk/approval-client-runtime` | Asistentes de perfil/filtro de aprobación de ejecución nativa | | `plugin-sdk/approval-delivery-runtime` | Adaptadores de capacidad/entrega de aprobación nativa | | `plugin-sdk/approval-gateway-runtime` | Asistente compartido de
  resolución de puerta de enlace de aprobación | | `plugin-sdk/approval-handler-adapter-runtime` | Asistentes ligeros de carga de adaptadores de aprobación nativa para puntos de entrada de canal en vivo | | `plugin-sdk/approval-handler-runtime` | Asistentes de tiempo de ejecución más amplios del controlador de aprobación; prefiera las costuras más estrechas de adaptador/puerta de enlace cuando
  sean suficientes | | `plugin-sdk/approval-native-runtime` | Asistentes de objetivo de aprobación nativa + vinculación de cuenta | | `plugin-sdk/approval-reply-runtime` | Asistentes de carga útil de respuesta de aprobación de ejecución/complemento | | `plugin-sdk/approval-runtime` | Asistentes de carga útil de aprobación de ejecución/complemento, asistentes de enrutamiento/tiempo de ejecución de
  aprobación nativa, y asistentes de visualización de aprobación estructurada como `formatApprovalDisplayPath` | | `plugin-sdk/reply-dedupe` | Asistentes estrechos de restablecimiento de deduplicación de respuesta entrante | | `plugin-sdk/channel-contract-testing` | Asistentes estrechos de prueba de contrato de canal sin el barril de pruebas amplio | | `plugin-sdk/command-auth-native` |
  Autenticación de comandos nativos, formato dinámico del menú de argumentos y asistentes de objetivo de sesión nativa | | `plugin-sdk/command-detection` | Asistentes compartidos de detección de comandos | | `plugin-sdk/command-primitives-runtime` | Predicados de texto de comandos ligeros para rutas de canal en vivo | | `plugin-sdk/command-surface` | Normalización del cuerpo del comando y
  asistentes de superficie del comando | | `plugin-sdk/allow-from` | `formatAllowFromLowercase` | | `plugin-sdk/channel-secret-runtime` | Asistentes estrechos de recolección de contratos de secretos para superficies de secretos de canal/complemento | | `plugin-sdk/secret-ref-runtime` | Asistentes estrechos de `coerceSecretRef` y escritura SecretRef para el análisis de contrato de
  secretos/configuración | | `plugin-sdk/security-runtime` | Asistentes compartidos de confianza, restricción de DM, archivo/ruta delimitados por raíz, que incluyen escrituras de solo creación, reemplazo atómico de archivos síncrono/asíncrono, escrituras temporales de hermanos, respaldo de movimiento entre dispositivos, asistentes de almacenamiento de archivos privados, protectores de padres de
  enlaces simbólicos, contenido externo, redacción de texto sensible, comparación de secretos de tiempo constante y asistentes de recolección de secretos | | `plugin-sdk/ssrf-policy` | Asistentes de política de SSRF de lista de permitidos de host y red privada | | `plugin-sdk/ssrf-dispatcher` | Asistentes estrechos de despachador anclado sin la superficie amplia de tiempo de ejecución de
  infraestructura | | `plugin-sdk/ssrf-runtime` | Despachador anclado, recuperación protegida contra SSRF, error SSRF y asistentes de política SSRF | | `plugin-sdk/secret-input` | Asistentes de análisis de entrada de secretos | | `plugin-sdk/webhook-ingress` | Asistentes de solicitud/objetivo de webhook y coerción de websocket/cuerpo sin procesar | | `plugin-sdk/webhook-request-guards` |
  Asistentes de tamaño/tiempo de espera del cuerpo de la solicitud |
</Accordion>

<Accordion title="Subrutas de tiempo de ejecución y almacenamiento">
  | Subruta | Exportaciones clave | | --- | --- | | `plugin-sdk/runtime` | Asistentes amplios de tiempo de ejecución/registro/copia de seguridad/instalación de complementos | | `plugin-sdk/runtime-env` | Asistentes estrechos de entorno de tiempo de ejecución, registrador, tiempo de espera, reintento y retroceso exponencial | | `plugin-sdk/browser-config` | Fachada de configuración de navegador
  compatible para perfiles/valores predeterminados normalizados, análisis de URL de CDP y asistentes de autenticación de control de navegador | | `plugin-sdk/codex-mcp-projection` | Asistente de Codex empaquetado reservado para proyectar la configuración del servidor MCP del usuario en la configuración del hilo de Codex; no para complementos de terceros | | `plugin-sdk/codex-native-task-runtime` |
  Asistente de Codex empaquetado reservado para el cableado nativo del espejo/tiempo de ejecución de tareas; no para complementos de terceros | | `plugin-sdk/channel-runtime-context` | Asistentes genéricos de registro y búsqueda del contexto de tiempo de ejecución del canal | | `plugin-sdk/matrix` | Fachada de compatibilidad de Matrix en desuso para paquetes de canal de terceros antiguos; los
  nuevos complementos deben importar `plugin-sdk/run-command` directamente | | `plugin-sdk/mattermost` | Fachada de compatibilidad de Mattermost en desuso para paquetes de canal de terceros antiguos; los nuevos complementos deben importar las subrutas genéricas del SDK directamente | | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | | `plugin-sdk/plugin-runtime` | Asistentes compartidos
  de comandos/ganchos/HTTP/interactivos de complementos | | `plugin-sdk/hook-runtime` | Asistentes compartidos de canalización de webhook/ganchos internos | | `plugin-sdk/lazy-runtime` | Asistentes de importación/vinculación de tiempo de ejecución diferida, como `createLazyRuntimeModule`, `createLazyRuntimeMethod` y `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | Asistentes de
  ejecución de procesos | | `plugin-sdk/cli-runtime` | Asistentes de formato CLI, espera, versión, invocación de argumentos y grupos de comandos diferidos | | `plugin-sdk/gateway-method-runtime` | Asistente de despacho de método de Gateway reservado para rutas HTTP de complementos que declaran `contracts.gatewayMethodDispatch: ["authenticated-request"]` | | `plugin-sdk/gateway-runtime` | Cliente
  de Gateway, asistente de inicio de cliente listo para el bucle de eventos, RPC CLI de gateway, errores de protocolo de gateway y asistentes de parches de estado del canal | | `plugin-sdk/config-contracts` | Superficie de configuración de solo tipo centrada para formas de configuración de complementos, como `OpenClawConfig` y tipos de configuración de canal/proveedor | |
  `plugin-sdk/plugin-config-runtime` | Asistentes de búsqueda de configuración de complementos en tiempo de ejecución, como `requireRuntimeConfig`, `resolvePluginConfigObject` y `resolveLivePluginConfigObject` | | `plugin-sdk/config-mutation` | Asistentes de mutación de configuración transaccional, como `mutateConfigFile`, `replaceConfigFile` y `logConfigUpdated` | |
  `plugin-sdk/runtime-config-snapshot` | Asistentes de instantánea de configuración del proceso actual, como `getRuntimeConfig`, `getRuntimeConfigSnapshot` y establecedores de instantáneas de prueba | | `plugin-sdk/telegram-command-config` | Normalización de nombre/descripción de comandos de Telegram y verificaciones de duplicados/conflictos, incluso cuando la superficie del contrato de Telegram
  empaquetado no está disponible | | `plugin-sdk/text-autolink-runtime` | Detección de autovínculos de referencia de archivos sin el barril de texto amplio | | `plugin-sdk/approval-runtime` | Asistentes de aprobación de ejecución/complemento, constructores de capacidades de aprobación, asistentes de autenticación/perfil, asistentes de enrutamiento/tiempo de ejecución nativos y formato de ruta de
  visualización de aprobación estructurada | | `plugin-sdk/reply-runtime` | Asistentes compartidos de tiempo de ejecución de entrada/respuesta, fragmentación, despacho, latido y planificador de respuestas | | `plugin-sdk/reply-dispatch-runtime` | Asistentes estrechos de despacho/finalización de respuesta y etiquetas de conversación | | `plugin-sdk/reply-history` | Asistentes compartidos del
  historial de respuestas de ventana corta. El nuevo código de turno de mensaje debe usar `createChannelHistoryWindow`; los asistentes de mapa de menor nivel permanecen solo como exportaciones de compatibilidad en desuso | | `plugin-sdk/reply-reference` | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | Asistentes estrechos de fragmentación de texto/markdown | |
  `plugin-sdk/session-store-runtime` | Ruta de almacenamiento de sesión, clave de sesión, fecha de actualización y asistentes de mutación de almacenamiento | | `plugin-sdk/cron-store-runtime` | Asistentes de ruta/carga/guardado del almacenamiento Cron | | `plugin-sdk/state-paths` | Asistentes de ruta de directorio de Estado/OAuth | | `plugin-sdk/routing` | Asistentes de vinculación de ruta/clave
  de sesión/cuenta, como `resolveAgentRoute`, `buildAgentSessionKey` y `resolveDefaultAgentBoundAccountId` | | `plugin-sdk/status-helpers` | Asistentes compartidos de resumen de estado de canal/cuenta, valores predeterminados de estado de tiempo de ejecución y asistentes de metadatos de problemas | | `plugin-sdk/target-resolver-runtime` | Asistentes compartidos de resolución de objetivos | |
  `plugin-sdk/string-normalization-runtime` | Asistentes de normalización de slug/cadena | | `plugin-sdk/request-url` | Extraer URL de cadena de entradas tipo fetch/request | | `plugin-sdk/run-command` | Ejecutor de comandos cronometrado con resultados normalizados de stdout/stderr | | `plugin-sdk/param-readers` | Lectores de parámetros comunes de herramientas/CLI | | `plugin-sdk/tool-plugin` |
  Definir un complemento de herramienta de agente tipado simple y exponer metadatos estáticos para la generación de manifiestos | | `plugin-sdk/tool-payload` | Extraer cargas útiles normalizadas de objetos de resultados de herramientas | | `plugin-sdk/tool-send` | Extraer campos de destino de envío canónicos de argumentos de herramientas | | `plugin-sdk/temp-path` | Asistentes compartidos de ruta
  de descarga temporal y espacios de trabajo temporales privados y seguros | | `plugin-sdk/logging-core` | Registrador de subsistema y asistentes de redacción | | `plugin-sdk/markdown-table-runtime` | Modo de tabla Markdown y asistentes de conversión | | `plugin-sdk/model-session-runtime` | Asistentes de anulación de modelo/sesión, como `applyModelOverrideToSessionEntry` y
  `resolveAgentMaxConcurrent` | | `plugin-sdk/talk-config-runtime` | Asistentes de resolución de configuración del proveedor Talk | | `plugin-sdk/json-store` | Asistentes pequeños de lectura/escritura de estado JSON | | `plugin-sdk/file-lock` | Asistentes de bloqueo de archivos reentrante | | `plugin-sdk/persistent-dedupe` | Asistentes de caché de deduplicación respaldada en disco | |
  `plugin-sdk/acp-runtime` | Asistentes de tiempo de ejecución/sesión ACP y despacho de respuestas | | `plugin-sdk/acp-runtime-backend` | Asistentes ligeros de registro y despacho de respuestas del backend ACP para complementos cargados al inicio | | `plugin-sdk/acp-binding-resolve-runtime` | Resolución de vinculación ACP de solo lectura sin importaciones de inicio del ciclo de vida | |
  `plugin-sdk/agent-config-primitives` | Primitivos estrechos de esquema de configuración de tiempo de ejecución de agentes | | `plugin-sdk/boolean-param` | Lector de parámetros booleanos suelto | | `plugin-sdk/dangerous-name-runtime` | Asistentes de resolución de coincidencia de nombres peligrosos | | `plugin-sdk/device-bootstrap` | Asistentes de token de emparejamiento y arranque de dispositivo
  | | `plugin-sdk/extension-shared` | Primitivos compartidos de canal pasivo, estado y proxy ambiental | | `plugin-sdk/models-provider-runtime` | Asistentes de respuesta de comando/proveedor `/models` | | `plugin-sdk/skill-commands-runtime` | Asistentes de listado de comandos de habilidades | | `plugin-sdk/native-command-registry` | Asistentes de registro/compilación/serialización de comandos
  nativos | | `plugin-sdk/agent-harness` | Superficie experimental de complemento confiable para arneses de agentes de bajo nivel: tipos de arnés, asistentes de dirección/aborto de ejecución activa, asistentes de puente de herramientas OpenClaw, asistentes de política de herramientas de plan de tiempo de ejecución, clasificación de resultados terminales, asistentes de formato/detalles de progreso
  de herramientas y utilidades de resultados de intentos | | `plugin-sdk/provider-zai-endpoint` | Fachada de detección de puntos finales propiedad del proveedor Z.AI en desuso; use la API pública del complemento Z.AI | | `plugin-sdk/async-lock-runtime` | Asistente de bloqueo asíncrono local de proceso para archivos pequeños de estado de tiempo de ejecución | | `plugin-sdk/channel-activity-runtime`
  | Asistente de telemetría de actividad del canal | | `plugin-sdk/concurrency-runtime` | Asistente de concurrencia de tareas asíncronas limitadas | | `plugin-sdk/dedupe-runtime` | Asistentes de caché de deduplicación en memoria | | `plugin-sdk/delivery-queue-runtime` | Asistente de drenaje de entrega pendiente saliente | | `plugin-sdk/file-access-runtime` | Asistentes seguros de ruta de archivo
  local y fuente de medios | | `plugin-sdk/heartbeat-runtime` | Asistentes de activación, evento y visibilidad de latido | | `plugin-sdk/number-runtime` | Asistente de coerción numérica | | `plugin-sdk/secure-random-runtime` | Asistentes seguros de token/UUID | | `plugin-sdk/system-event-runtime` | Asistentes de cola de eventos del sistema | | `plugin-sdk/transport-ready-runtime` | Asistente de
  espera de preparación del transporte | | `plugin-sdk/infra-runtime` | Shim de compatibilidad en desuso; use las subrutas de tiempo de ejecución centradas anteriores | | `plugin-sdk/collection-runtime` | Asistentes pequeños de caché limitada | | `plugin-sdk/diagnostic-runtime` | Asistentes de indicador de diagnóstico, evento y contexto de seguimiento | | `plugin-sdk/error-runtime` | Gráfico de
  errores, formato, asistentes compartidos de clasificación de errores, `isApprovalNotFoundError` | | `plugin-sdk/fetch-runtime` | Fetch envuelto, proxy, opción EnvHttpProxyAgent y asistentes de búsqueda anclada | | `plugin-sdk/runtime-fetch` | Fetch de tiempo de ejecución consciente del despachador sin importaciones de proxy/fetch protegido | | `plugin-sdk/response-limit-runtime` | Lector de
  cuerpo de respuesta limitado sin la superficie amplia de tiempo de ejecución de medios | | `plugin-sdk/session-binding-runtime` | Estado de vinculación de conversación actual sin enrutamiento de vinculación configurado o almacenes de emparejamiento | | `plugin-sdk/session-store-runtime` | Asistentes de almacenamiento de sesión sin importaciones amplias de escritura/mantenimiento de configuración
  | | `plugin-sdk/context-visibility-runtime` | Resolución de visibilidad de contexto y filtrado de contexto suplementario sin importaciones amplias de configuración/seguridad | | `plugin-sdk/string-coerce-runtime` | Asistentes estrechos de coerción y normalización de registros/cadenas primitivas sin importaciones de markdown/registro | | `plugin-sdk/host-runtime` | Asistentes de normalización de
  nombre de host y host SCP | | `plugin-sdk/retry-runtime` | Asistentes de configuración de reintento y ejecutor de reintento | | `plugin-sdk/agent-runtime` | Asistentes de directorio/identidad/espacio de trabajo del agente, incluyendo `resolveAgentDir`, `resolveDefaultAgentDir` y la exportación de compatibilidad en desuso `resolveOpenClawAgentDir` | | `plugin-sdk/directory-runtime` |
  Consulta/deduplicación de directorio respaldada por configuración | | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

<Accordion title="Subrutas de capacidades y pruebas">
  | Subruta | Exportaciones clave | | --- | --- | | `plugin-sdk/media-runtime` | Funciones auxiliares compartidas de obtención/transformación/almacenamiento de medios, incluyendo `saveRemoteMedia`, `saveResponseMedia`, `readRemoteMediaBuffer` y la obsoleta `fetchRemoteMedia`; prefiera las funciones auxiliares de almacenamiento antes que las lecturas de búfer cuando una URL deba convertirse en
  medios de OpenClaw | | `plugin-sdk/media-mime` | Normalización MIME estrecha, mapeo de extensiones de archivo, detección MIME y funciones auxiliares de tipo de medio | | `plugin-sdk/media-store` | Funciones auxiliares estrechas de almacenamiento de medios como `saveMediaBuffer` y `saveMediaStream` | | `plugin-sdk/media-generation-runtime` | Funciones auxiliares compartidas de conmutación por
  error de generación de medios, selección de candidatos y mensajería de modelo faltante | | `plugin-sdk/media-understanding` | Tipos de proveedor de comprensión de medios más exportaciones de funciones auxiliares de extracción de imagen/audio/estructurada orientadas al proveedor | | `plugin-sdk/text-chunking` | Funciones auxiliares de fragmentación/renderizado de texto y markdown, conversión de
  tablas markdown, eliminación de etiquetas de directivas y utilidades de texto seguro | | `plugin-sdk/text-chunking` | Función auxiliar de fragmentación de texto saliente | | `plugin-sdk/speech` | Tipos de proveedor de voz más exportaciones de funciones auxiliares de directivas, registro, validación, generador de TTS compatible con OpenAI y auxiliares de voz orientadas al proveedor | |
  `plugin-sdk/speech-core` | Tipos compartidos de proveedor de voz, registro, directivas, normalización y exportaciones de funciones auxiliares de voz | | `plugin-sdk/realtime-transcription` | Tipos de proveedor de transcripción en tiempo real, funciones auxiliares de registro y función auxiliar de sesión WebSocket compartida | | `plugin-sdk/realtime-voice` | Tipos de proveedor de voz en tiempo
  real y funciones auxiliares de registro | | `plugin-sdk/image-generation` | Tipos de proveedor de generación de imágenes más funciones auxiliares de URL de activos/datos de imágenes y el generador de proveedor de imágenes compatible con OpenAI | | `plugin-sdk/image-generation-core` | Tipos compartidos de generación de imágenes, funciones auxiliares de conmutación por error, autenticación y
  registro | | `plugin-sdk/music-generation` | Tipos de proveedor/solicitud/resultado de generación de música | | `plugin-sdk/music-generation-core` | Tipos compartidos de generación de música, funciones auxiliares de conmutación por error, búsqueda de proveedores y análisis de referencia de modelo | | `plugin-sdk/video-generation` | Tipos de proveedor/solicitud/resultado de generación de video |
  | `plugin-sdk/video-generation-core` | Tipos compartidos de generación de video, funciones auxiliares de conmutación por error, búsqueda de proveedores y análisis de referencia de modelo | | `plugin-sdk/webhook-targets` | Registro de destino de webhook y funciones auxiliares de instalación de rutas | | `plugin-sdk/webhook-path` | Alias de compatibilidad obsoleto; use `plugin-sdk/webhook-ingress`
  | | `plugin-sdk/web-media` | Funciones auxiliares compartidas de carga de medios remotos/locales | | `plugin-sdk/zod` | Reexportación de compatibilidad obsoleta; importe `zod` directamente desde `zod` | | `plugin-sdk/testing` | Barril de compatibilidad obsoleto local del repositorio para pruebas heredadas de OpenClaw. Las nuevas pruebas del repositorio deben importar subrutas de prueba locales
  enfocadas como `plugin-sdk/agent-runtime-test-contracts`, `plugin-sdk/plugin-test-runtime`, `plugin-sdk/channel-test-helpers`, `plugin-sdk/test-env` o `plugin-sdk/test-fixtures` en su lugar | | `plugin-sdk/plugin-test-api` | Función auxiliar `createTestPluginApi` mínima local del repositorio para pruebas unitarias de registro directo de complementos sin importar puentes de funciones auxiliares
  de prueba del repositorio | | `plugin-sdk/agent-runtime-test-contracts` | Accesorios de contrato de adaptador de tiempo de ejecución de agente nativos locales del repositorio para pruebas de autenticación, entrega, conmutación por error, enlace de herramientas, superposición de indicaciones, esquema y proyección de transcripciones | | `plugin-sdk/channel-test-helpers` | Funciones auxiliares de
  prueba orientadas a canales locales del repositorio para contratos genéricos de acciones/configuración/estado, aserciones de directorio, ciclo de vida de inicio de cuenta, enhebrado de configuración de envío, simulacros de tiempo de ejecución, problemas de estado, entrega saliente y registro de enlaces | | `plugin-sdk/channel-target-testing` | Suite de casos de error de resolución de objetivos
  compartida local del repositorio para pruebas de canal | | `plugin-sdk/plugin-test-contracts` | Funciones auxiliares de contrato de paquete de complemento, registro, artefacto público, importación directa, API de tiempo de ejecución y efectos secundarios de importación locales del repositorio | | `plugin-sdk/provider-test-contracts` | Funciones auxiliares de contrato de tiempo de ejecución de
  proveedor, autenticación, descubrimiento, incorporación, catálogo, asistente, capacidad de medios, política de reproducción, audio en vivo STT en tiempo real, búsqueda/obtención web y flujo locales del repositorio | | `plugin-sdk/provider-http-test-mocks` | Simulacros HTTP/auth opcionales de Vitest locales del repositorio para pruebas de proveedor que ejercitan `plugin-sdk/provider-http` | |
  `plugin-sdk/test-fixtures` | Accesorios de captura de tiempo de ejecución de CLI genérica, contexto de espacio aislado, escritor de habilidades, mensaje de agente, evento del sistema, recarga de módulo, ruta de complemento empaquetado, texto de terminal, fragmentación, token de autenticación y casos tipados locales del repositorio | | `plugin-sdk/test-node-mocks` | Funciones auxiliares de
  simulacros integrados de Node enfocadas locales del repositorio para usar dentro de fábricas `vi.mock("node:*")` de Vitest |
</Accordion>

<Accordion title="Subrutas de memoria">
  | Subruta | Exportaciones clave | | --- | --- | | `plugin-sdk/memory-core` | Superficie de ayuda de memory-core agrupada para ayudantes de gestor/config/archivo/CLI | | `plugin-sdk/memory-core-engine-runtime` | Fachada de tiempo de ejecución de índice/búsqueda de memoria | | `plugin-sdk/memory-core-host-engine-foundation` | Exportaciones del motor de fundación del host de memoria | |
  `plugin-sdk/memory-core-host-engine-embeddings` | Contratos de incorporación del host de memoria, acceso al registro, proveedor local y ayudantes genéricos de proceso por lotes/remotos | | `plugin-sdk/memory-core-host-engine-qmd` | Exportaciones del motor QMD del host de memoria | | `plugin-sdk/memory-core-host-engine-storage` | Exportaciones del motor de almacenamiento del host de memoria | |
  `plugin-sdk/memory-core-host-multimodal` | Ayudantes multimodales del host de memoria | | `plugin-sdk/memory-core-host-query` | Ayudantes de consulta del host de memoria | | `plugin-sdk/memory-core-host-secret` | Ayudantes de secretos del host de memoria | | `plugin-sdk/memory-core-host-events` | Alias de compatibilidad en desuso; use `plugin-sdk/memory-host-events` | |
  `plugin-sdk/memory-core-host-status` | Ayudantes de estado del host de memoria | | `plugin-sdk/memory-core-host-runtime-cli` | Ayudantes de tiempo de ejecución de CLI del host de memoria | | `plugin-sdk/memory-core-host-runtime-core` | Ayudantes de tiempo de ejecución central del host de memoria | | `plugin-sdk/memory-core-host-runtime-files` | Ayudantes de archivo/tiempo de ejecución del host
  de memoria | | `plugin-sdk/memory-host-core` | Alias neutral de proveedor para los ayudantes de tiempo de ejecución central del host de memoria | | `plugin-sdk/memory-host-events` | Alias neutral de proveedor para los ayudantes de diario de eventos del host de memoria | | `plugin-sdk/memory-host-files` | Alias de compatibilidad en desuso; use `plugin-sdk/memory-core-host-runtime-files` | |
  `plugin-sdk/memory-host-markdown` | Ayudantes de markdown administrados compartidos para complementos adyacentes a la memoria | | `plugin-sdk/memory-host-search` | Fachada de tiempo de ejecución de memoria activa para el acceso al gestor de búsqueda | | `plugin-sdk/memory-host-status` | Alias de compatibilidad en desuso; use `plugin-sdk/memory-core-host-status` |
</Accordion>

  <Accordion title="Reserved bundled-helper subpaths">
    Las subrutas del SDK de ayudantes agrupados reservadas son superficies específicas del propietario y estrechas para el código de complementos agrupados. Se rastrean en el inventario del SDK para que las compilaciones de paquetes y los alias sigan siendo deterministas, pero no son API generales de creación de complementos. Los nuevos contratos de host reutilizables deben usar subrutas genéricas del SDK como `plugin-sdk/gateway-runtime`, `plugin-sdk/security-runtime` y
    `plugin-sdk/plugin-config-runtime`.

    | Subpath | Propietario y propósito |
    | --- | --- |
    | `plugin-sdk/codex-mcp-projection` | Ayudante del complemento Codex agrupado para proyectar la configuración del servidor MCP del usuario en la configuración del hilo del servidor de aplicaciones Codex |
    | `plugin-sdk/codex-native-task-runtime` | Ayudante del complemento Codex agrupado para reflejar los subagentes nativos del servidor de aplicaciones Codex en el estado de la tarea OpenClaw |

  </Accordion>
</AccordionGroup>

## Relacionado

- [Descripción general del SDK de complementos](/es/plugins/sdk-overview)
- [Configuración del SDK de complementos](/es/plugins/sdk-setup)
- [Compilación de complementos](/es/plugins/building-plugins)
