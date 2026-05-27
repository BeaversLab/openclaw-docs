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

Para la guía de creación de complementos, consulte [Resumen del SDK de complementos](/es/plugins/sdk-overview).

## Entrada de complemento

| Subruta                        | Exportaciones clave                                                                                                                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/plugin-entry`      | `definePluginEntry`                                                                                                                                                                      |
| `plugin-sdk/core`              | `defineChannelPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase`, `defineSetupPluginEntry`, `buildChannelConfigSchema`, `buildJsonChannelConfigSchema`                   |
| `plugin-sdk/config-schema`     | `OpenClawSchema`                                                                                                                                                                         |
| `plugin-sdk/provider-entry`    | `defineSingleProviderPluginEntry`                                                                                                                                                        |
| `plugin-sdk/migration`         | Ayudantes de elementos de proveedor de migración como `createMigrationItem`, constantes de motivo, marcadores de estado de elementos, ayudantes de redacción y `summarizeMigrationItems` |
| `plugin-sdk/migration-runtime` | Ayudantes de migración en tiempo de ejecución como `copyMigrationFileItem`, `withCachedMigrationConfigRuntime` y `writeMigrationReport`                                                  |
| `plugin-sdk/health`            | Registro, detección, reparación, selección, gravedad y tipos de hallazgo de las comprobaciones de estado de Doctor para consumidores de estado empaquetados                              |

### Asistentes de compatibilidad y pruebas en desuso

Estas subrutas siguen siendo exportaciones del paquete para complementos más antiguos y suites de pruebas de OpenClaw,
pero el código nuevo no debe agregar importaciones desde ellas: `agent-runtime-test-contracts`,
`channel-contract-testing`, `channel-target-testing`, `channel-test-helpers`,
`plugin-test-api`, `plugin-test-contracts`, `provider-http-test-mocks`,
`provider-test-contracts`, `test-env`, `test-fixtures`, `test-node-mocks`,
`testing`, `channel-runtime`, `compat`, `config-types`, `infra-runtime`,
`text-runtime` y `zod`. Importa `zod` directamente desde `zod` en el código nuevo de complementos.
`plugin-test-runtime` sigue siendo una subruta de asistente de pruebas enfocada y activa.

### Subrutas de ayuda reservadas para el complemento empaquetado

Estas subrutas son superficies de compatibilidad propiedad del complemento para su complemento empaquetado propietario, no API de SDK generales: `plugin-sdk/codex-mcp-projection` y `plugin-sdk/codex-native-task-runtime`. Las importaciones de extensiones de propietarios cruzados están bloqueadas por las protecciones del contrato del paquete.

### Subrutas públicas en desuso no utilizadas

Estas subrutas públicas existieron durante al menos un mes y actualmente no tienen
importaciones de producción en extensiones empaquetadas. Siguen siendo importables
por compatibilidad, pero el nuevo código de complementos debe usar subrutas del SDK
enfocadas y consumidas activamente en su lugar:
`agent-config-primitives`, `channel-config-schema-legacy`,
`channel-reply-pipeline`, `channel-runtime`, `channel-secret-runtime`,
`command-auth`, `compat`, `config-runtime`, `config-schema`, `discord`,
`group-access`, `infra-runtime`, `matrix`, `mattermost`,
`media-generation-runtime-shared`, `memory-core-engine-runtime`,
`memory-core-host-multimodal`, `memory-core-host-query`,
`music-generation-core`, `self-hosted-provider-setup`, `telegram-account`,
`telegram-command-config` y `zalouser`.

### Subrutas públicas raras en desuso

Las subrutas públicas que actualmente son utilizadas por solo uno o dos propietarios de complementos incluidos también están en desuso para el nuevo código de complementos. Siguen siendo exportaciones de paquete por compatibilidad, pero el nuevo código debería preferir costuras del SDK compartidas activamente o APIs de paquetes propios del complemento. Los mantenedores rastrean el conjunto exacto en `scripts/lib/plugin-sdk-deprecated-public-subpaths.json` y el presupuesto actual con `pnpm plugin-sdk:surface`.

### Barriles amplios en desuso

Estos barriles amplios de reexportación siguen siendo construibles para el código fuente de OpenClaw y las comprobaciones de compatibilidad, pero el código nuevo debería preferir subrutas enfocadas del SDK: `agent-runtime`, `channel-lifecycle`, `channel-runtime`, `cli-runtime`, `compat`, `config-types`, `conversation-runtime`, `hook-runtime`, `infra-runtime`, `media-runtime`, `plugin-runtime`, `security-runtime` y `text-runtime`. `channel-runtime`, `compat`, `config-types`, `infra-runtime` y `text-runtime` siguen siendo exportaciones del paquete solo por compatibilidad con versiones anteriores; en su lugar, utilice subrutas enfocadas de canal/tiempo de ejecución: `config-contracts`, `string-coerce-runtime`, `text-chunking`, `text-utility-runtime` y `logging-core`.

<AccordionGroup>
  <Accordion title="Subrutas del canal">
    | Subruta | Exportaciones clave |
    | --- | --- |
    | `plugin-sdk/channel-core` | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` |
    | `plugin-sdk/config-schema` | Exportación del esquema Zod `openclaw.json` raíz (`OpenClawSchema`) |
    | `plugin-sdk/json-schema-runtime` | Ayudante de validación de esquema JSON en caché para esquemas propiedad del complemento |
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`, además de `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` |
    | `plugin-sdk/setup` | Ayudantes compartidos del asistente de configuración, traductor de configuración, indicaciones de lista de permitidos, constructores de estado de configuración |
    | `plugin-sdk/setup-runtime` | `createSetupTranslator`, `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
    | `plugin-sdk/setup-adapter-runtime` | Alias de compatibilidad obsoleto; use `plugin-sdk/setup-runtime` |
    | `plugin-sdk/setup-tools` | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` |
    | `plugin-sdk/account-core` | Ayudantes de configuración/compu de acción multicuenta, ayudantes de reserva de cuenta predeterminada |
    | `plugin-sdk/account-id` | `DEFAULT_ACCOUNT_ID`, ayudantes de normalización de id de cuenta |
    | `plugin-sdk/account-resolution` | Búsqueda de cuenta + ayudantes de reserva predeterminada |
    | `plugin-sdk/account-helpers` | Ayudantes estrechos de lista de cuentas/acción de cuenta |
    | `plugin-sdk/access-groups` | Análisis de lista de permitidos de grupo de acceso y ayudantes de diagnóstico de grupo redactado |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | Ayudantes heredados de canalización de respuesta. El nuevo código de canalización de respuesta del canal debe usar `createChannelMessageReplyPipeline` y `resolveChannelMessageSourceReplyDeliveryMode` de `plugin-sdk/channel-message`. |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter`, `resolveChannelDmAccess`, `resolveChannelDmAllowFrom`, `resolveChannelDmPolicy`, `normalizeChannelDmPolicy`, `normalizeLegacyDmAliases` |
    | `plugin-sdk/channel-config-schema` | Primitivas de esquema de configuración de canal compartidas más constructores Zod y JSON/TypeBox directos |
    | `plugin-sdk/bundled-channel-config-schema` | Esquemas de configuración de canal OpenClaw agrupados solo para complementos agrupados mantenidos |
    | `plugin-sdk/channel-config-schema-legacy` | Alias de compatibilidad obsoleto para esquemas de configuración de canal agrupado |
    | `plugin-sdk/telegram-command-config` | Ayudantes de normalización/validación de comandos personalizados de Telegram con reserva de contrato agrupado |
    | `plugin-sdk/command-gating` | Ayudantes estrechos de compu de autorización de comandos |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-ingress` | Fachada de compatibilidad obsoleta de entrada de canal de bajo nivel. Las nuevas rutas de recepción deben usar `plugin-sdk/channel-ingress-runtime`. |
    | `plugin-sdk/channel-ingress-runtime` | Resolvedor de tiempo de ejecución de entrada de canal de alto nivel experimental y constructores de hechos de ruta para rutas de recepción de canal migradas. Se prefiere esto sobre el ensamblaje de listas de permitidos efectivas, listas de permitidos de comandos y proyecciones heredadas en cada complemento. Consulte [Channel ingress API](/es/plugins/sdk-channel-ingress). |
    | `plugin-sdk/channel-lifecycle` | `createAccountStatusSink`, `createChannelRunQueue`, y ayudantes heredados del ciclo de vida de flujo de borrador. El nuevo código de finalización de vista previa debe usar `plugin-sdk/channel-message`. |
    | `plugin-sdk/channel-message` | Ayudantes de contrato de ciclo de vida de mensaje económicos como `defineChannelMessageAdapter`, `createChannelMessageAdapterFromOutbound`, `createChannelMessageReplyPipeline`, `createReplyPrefixContext`, `resolveChannelMessageSourceReplyDeliveryMode`, derivación de capacidad final duradera, ayudantes de prueba de capacidad para capacidades de envío/recepción/efecto secundario, `MessageReceiveContext`, pruebas de política de reconocimiento de recepción, `defineFinalizableLivePreviewAdapter`, `deliverWithFinalizableLivePreviewAdapter`, pruebas de capacidad de vista previa en vivo y finalizador en vivo, estado de recuperación duradera, `RenderedMessageBatch`, tipos de recibo de mensaje y ayudantes de id de recibo. Consulte [Channel message API](/es/plugins/sdk-channel-message). Las fachadas heredadas de despacho de respuesta están obsoletas solo para compatibilidad. |
    | `plugin-sdk/channel-message-runtime` | Ayudantes de entrega en tiempo de ejecución que pueden cargar la entrega saliente, incluyendo `deliverInboundReplyWithMessageSendContext`, `sendDurableMessageBatch` y `withDurableMessageSendContext`. Los puentes de despacho de respuesta obsoletos siguen siendo importables solo para despachadores de compatibilidad. Úselo desde módulos de tiempo de ejecución de monitoreo/envío, no desde archivos de arranque en caliente del complemento. |
    | `plugin-sdk/inbound-envelope` | Ayudantes compartidos de ruta de entrada + constructor de sobre |
    | `plugin-sdk/inbound-reply-dispatch` | Ayudantes compartidos heredados de registro y despacho de entrada, predicados de despacho visible/final, y `deliverDurableInboundReplyPayload` obsoleto para la compatibilidad de despachadores de canal preparados. El nuevo código de recepción/despacho de canal debe importar ayudantes del ciclo de vida en tiempo de ejecución desde `plugin-sdk/channel-message-runtime`. |
    | `plugin-sdk/messaging-targets` | Alias de análisis de destino obsoleto; use `plugin-sdk/channel-targets` |
    | `plugin-sdk/outbound-media` | Ayudantes compartidos de carga de medios salientes |
    | `plugin-sdk/outbound-send-deps` | Búsqueda de dependencia de envío saliente ligera para adaptadores de canal |
    | `plugin-sdk/outbound-runtime` | Ayudantes de identidad saliente, delegado de envío, sesión, formato y planificación de carga. Los ayudantes de entrega directa como `deliverOutboundPayloads` son sustrato de compatibilidad obsoleto; use `plugin-sdk/channel-message-runtime` para nuevas rutas de envío. |
    | `plugin-sdk/poll-runtime` | Ayudantes estrechos de normalización de encuestas |
    | `plugin-sdk/thread-bindings-runtime` | Ayudantes de ciclo de vida y adaptador de enlace de hilos |
    | `plugin-sdk/agent-media-payload` | Constructor de carga de medios de agente heredado |
    | `plugin-sdk/conversation-runtime` | Ayudantes de enlace, emparejamiento y enlace configurado de conversación/hilos |
    | `plugin-sdk/runtime-config-snapshot` | Ayudante de instantánea de configuración en tiempo de ejecución |
    | `plugin-sdk/runtime-group-policy` | Ayudantes de resolución de políticas de grupo en tiempo de ejecución |
    | `plugin-sdk/channel-status` | Ayudantes compartidos de instantánea/resumen de estado del canal |
    | `plugin-sdk/channel-config-primitives` | Primitivas estrechas de esquema de configuración de canal |
    | `plugin-sdk/channel-config-writes` | Ayudantes de autorización de escritura de configuración de canal |
    | `plugin-sdk/channel-plugin-common` | Exportaciones compartidas de preludio del complemento de canal |
    | `plugin-sdk/allowlist-config-edit` | Ayudantes de edición/lectura de configuración de lista de permitidos |
    | `plugin-sdk/group-access` | Ayudantes compartidos de decisiones de acceso de grupo |
    | `plugin-sdk/direct-dm` | Ayudantes compartidos de autenticación/guardia de DM directo |
    | `plugin-sdk/discord` | Fachada de compatibilidad de Discord obsoleta para `@openclaw/discord@2026.3.13` publicado y compatibilidad de propietario rastreada; los nuevos complementos deben usar subrutas de SDK de canal genéricas |
    | `plugin-sdk/telegram-account` | Fachada de compatibilidad de resolución de cuenta de Telegram obsoleta para compatibilidad de propietario rastreada; los nuevos complementos deben usar ayudantes de tiempo de ejecución inyectados o subrutas de SDK de canal genéricas |
    | `plugin-sdk/zalouser` | Fachada de compatibilidad de Zalo Personal obsoleta para paquetes Lark/Zalo publicados que aún importan la autorización de comandos del remitente; los nuevos complementos deben usar `plugin-sdk/command-auth` |
    | `plugin-sdk/interactive-runtime` | Presentación semántica de mensajes, entrega y ayudantes heredados de respuesta interactiva. Consulte [Message Presentation](/es/plugins/message-presentation) |
    | `plugin-sdk/channel-inbound` | Ayudantes compartidos de entrada para clasificación de eventos, construcción de contexto, rebote, coincidencia de menciones, política de menciones y formato de sobre |
    | `plugin-sdk/channel-inbound-debounce` | Ayudantes estrechos de rebote de entrada |
    | `plugin-sdk/channel-mention-gating` | Ayudantes estrechos de política de menciones, marcador de menciones y texto de menciones sin la superficie de tiempo de ejecución de entrada más amplia |
    | `plugin-sdk/channel-envelope` | Ayudantes estrechos de formato de sobre de entrada |
    | `plugin-sdk/channel-location` | Ayudantes de contexto y formato de ubicación del canal |
    | `plugin-sdk/channel-logging` | Ayudantes de registro del canal para eliminaciones de entrada y fallos de escritura/reconocimiento |
    | `plugin-sdk/channel-send-result` | Tipos de resultado de respuesta |
    | `plugin-sdk/channel-actions` | Ayudantes de acción de mensaje del canal, además de ayudantes de esquema nativo obsoletos mantenidos para la compatibilidad del complemento |
    | `plugin-sdk/channel-route` | Normalización compartida de ruta, resolución de destino impulsada por analizador, conversión de id de hilo a cadena, claves de ruta de deduplicación/compactación, tipos de destino analizado y ayudantes de comparación de ruta/destino |
    | `plugin-sdk/channel-targets` | Ayudantes de análisis de destino; los que llaman a la comparación de rutas deben usar `plugin-sdk/channel-route` |
    | `plugin-sdk/channel-contract` | Tipos de contrato del canal |
    | `plugin-sdk/channel-feedback` | Cableado de comentarios/reacciones |
    | `plugin-sdk/channel-secret-runtime` | Ayudantes estrechos de contrato secreto como `collectSimpleChannelFieldAssignments`, `getChannelSurface`, `pushAssignment` y tipos de destino secreto |
  </Accordion>

<Accordion title="Rutas de acceso de proveedor">
  | Ruta de acceso (Subpath) | Exportaciones clave | | --- | --- | | `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry` | | `plugin-sdk/lmstudio` | Fachana de proveedor de LM Studio compatible para configuración, descubrimiento de catálogo y preparación del modelo en tiempo de ejecución | | `plugin-sdk/lmstudio-runtime` | Fachana de tiempo de ejecución de LM Studio compatible para
  valores predeterminados del servidor local, descubrimiento de modelos, encabezados de solicitud y asistentes de modelos cargados | | `plugin-sdk/provider-setup` | Asistentes de configuración de proveedor local/autoalojados curados | | `plugin-sdk/self-hosted-provider-setup` | Asistentes de configuración de proveedor autoalojado compatible con OpenAI enfocados | | `plugin-sdk/cli-backend` |
  Valores predeterminados del backend de CLI + constantes de perro guardián | | `plugin-sdk/provider-auth-runtime` | Asistentes de resolución de clave de API en tiempo de ejecución para complementos de proveedor | | `plugin-sdk/provider-auth-api-key` | Asistentes de incorporación/escritura de perfil de clave de API como `upsertApiKeyProfile` | | `plugin-sdk/provider-auth-result` | Generador de
  resultados de autenticación OAuth estándar | | `plugin-sdk/provider-env-vars` | Asistentes de búsqueda de variables de entorno de autenticación de proveedor | | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`, `ensureApiKeyFromOptionEnvOrPrompt`, `upsertAuthProfile`, `upsertApiKeyProfile`, `writeOAuthCredentials`, exportación de compatibilidad `resolveOpenClawAgentDir` obsoleta | |
  `plugin-sdk/provider-model-shared` | `ProviderReplayFamily`, `buildProviderReplayFamilyHooks`, `normalizeModelCompat`, constructores de políticas de repetición compartidas, asistentes de extremos de proveedor y asistentes de normalización de ID de modelo compartidos | | `plugin-sdk/provider-catalog-runtime` | Gancho de tiempo de ejecución de aumento de catálogo de proveedor y costuras de
  registro de complemento-proveedor para pruebas de contrato | | `plugin-sdk/provider-catalog-shared` | `findCatalogTemplate`, `buildSingleProviderApiKeyCatalog`, `buildManifestModelProviderConfig`, `supportsNativeStreamingUsageCompat`, `applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-http` | Asistentes de capacidades HTTP/endpoint de proveedor genéricas, errores HTTP de
  proveedor y asistentes de formulario multiparte para transcripción de audio | | `plugin-sdk/provider-web-fetch-contract` | Asistentes de contrato de configuración/selección de web-fetch angostos como `enablePluginInConfig` y `WebFetchProviderPlugin` | | `plugin-sdk/provider-web-fetch` | Asistentes de registro/caché de proveedor web-fetch | | `plugin-sdk/provider-web-search-config-contract` |
  Asistentes de configuración/credenciales de búsqueda web angostos para proveedores que no necesitan cableado de habilitación de complemento | | `plugin-sdk/provider-web-search-contract` | Asistentes de contrato de configuración/credenciales de búsqueda web angostos como `createWebSearchProviderContractFields`, `enablePluginInConfig`, `resolveProviderWebSearchPluginConfig`, y
  establecedores/obtenedores de credenciales con ámbito | | `plugin-sdk/provider-web-search` | Asistentes de registro/caché/tiempo de ejecución de proveedor de búsqueda web | | `plugin-sdk/embedding-providers` | Tipos de proveedor de incrustación generales y asistentes de lectura, incluidos `EmbeddingProviderAdapter`, `getEmbeddingProvider(...)` y `listEmbeddingProviders(...)`; los complementos
  registran proveedores a través de `api.registerEmbeddingProvider(...)` por lo que se aplica la propiedad del manifiesto | | `plugin-sdk/provider-tools` | `ProviderToolCompatFamily`, `buildProviderToolCompatFamilyHooks`, y limpieza/diagnóstico de esquema DeepSeek/Gemini/OpenAI | | `plugin-sdk/provider-usage` | `fetchClaudeUsage` y similares | | `plugin-sdk/provider-stream` |
  `ProviderStreamFamily`, `buildProviderStreamFamilyHooks`, `composeProviderStreamWrappers`, tipos de contenedor de secuencia y asistentes de contenedor compartidos Anthropic/Bedrock/DeepSeek V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot | | `plugin-sdk/provider-transport-runtime` | Asistentes de transporte de proveedor nativo como recuperación protegida, transformaciones de
  mensajes de transporte y flujos de eventos de transporte grabables | | `plugin-sdk/provider-onboard` | Asistentes de parches de configuración de incorporación | | `plugin-sdk/global-singleton` | Asistentes de singleton/mapa/caché locales de proceso | | `plugin-sdk/group-activation` | Modo de activación de grupo angosto y asistentes de análisis de comandos |
</Accordion>

<Accordion title="Subrutas de autenticación y seguridad">
  | Subruta | Exportaciones clave | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate`, ayudantes del registro de comandos que incluyen el formato dinámico del menú de argumentos, ayudantes de autorización del remitente | | `plugin-sdk/command-status` | Constructores de mensajes de comandos/ayuda, como `buildCommandsMessagePaginated` y `buildHelpMessage` | |
  `plugin-sdk/approval-auth-runtime` | Resolución del aprobador y ayudantes de autenticación de acciones en el mismo chat | | `plugin-sdk/approval-client-runtime` | Ayudantes de perfil/filtro de aprobación de ejecución nativa | | `plugin-sdk/approval-delivery-runtime` | Adaptadores de capacidad/entrega de aprobación nativa | | `plugin-sdk/approval-gateway-runtime` | Ayudante compartido de
  resolución de puerta de enlace de aprobación | | `plugin-sdk/approval-handler-adapter-runtime` | Ayudantes ligeros de carga de adaptadores de aprobación nativa para puntos de entrada de canal activo | | `plugin-sdk/approval-handler-runtime` | Ayudantes de tiempo de ejecución más amplios del controlador de aprobación; se prefieren las costuras más estrechas del adaptador/puerta de enlace cuando
  son suficientes | | `plugin-sdk/approval-native-runtime` | Ayudantes de destino de aprobación nativa + vinculación de cuenta | | `plugin-sdk/approval-reply-runtime` | Ayudantes de carga útil de respuesta de aprobación de ejecución/complemento | | `plugin-sdk/approval-runtime` | Ayudantes de carga útil de aprobación de ejecución/complemento, ayudantes de enrutamiento/tiempo de ejecución de
  aprobación nativa, y ayudantes de visualización de aprobación estructurada, como `formatApprovalDisplayPath` | | `plugin-sdk/reply-dedupe` | Ayudantes estrechos de restablecimiento de deduplicación de respuestas entrantes | | `plugin-sdk/channel-contract-testing` | Ayudantes de prueba de contrato de canal estrechos sin el barril de pruebas amplio | | `plugin-sdk/command-auth-native` |
  Autenticación de comandos nativa, formato dinámico del menú de argumentos y ayudantes de destino de sesión nativa | | `plugin-sdk/command-detection` | Ayudantes compartidos de detección de comandos | | `plugin-sdk/command-primitives-runtime` | Predicados de texto de comandos ligeros para rutas de canal activo | | `plugin-sdk/command-surface` | Normalización del cuerpo del comando y ayudantes de
  superficie del comando | | `plugin-sdk/allow-from` | `formatAllowFromLowercase` | | `plugin-sdk/channel-secret-runtime` | Ayudantes estrechos de colección de contratos secretos para superficies secretas de canal/complemento | | `plugin-sdk/secret-ref-runtime` | Ayudantes estrechos de tipado `coerceSecretRef` y SecretRef para el análisis de contratos secretos/configuración | |
  `plugin-sdk/security-runtime` | Ayudantes compartidos de confianza, limitación de MD, archivo/ruta limitados por raíz, que incluyen escrituras solo creación, reemplazo de archivo síncrono/asíncrono atómico, escrituras temporales hermanas, reserva de movimiento entre dispositivos, ayudantes de almacén de archivos privados, protectores de padres de enlaces simbólicos, contenido externo, redacción
  de texto sensible, comparación de secretos de tiempo constante y ayudantes de colección de secretos | | `plugin-sdk/ssrf-policy` | Lista de permitidos de host y ayudantes de política SSRF de red privada | | `plugin-sdk/ssrf-dispatcher` | Ayudantes estrechos de despachador anclado sin la superficie amplia de tiempo de ejecución de infraestructura | | `plugin-sdk/ssrf-runtime` | Despachador
  anclado, búsqueda protegida por SSRF, error SSRF y ayudantes de política SSRF | | `plugin-sdk/secret-input` | Ayudantes de análisis de entrada secreta | | `plugin-sdk/webhook-ingress` | Ayudantes de solicitud/destino de webhook y coerción de websocket/cuerpo sin procesar | | `plugin-sdk/webhook-request-guards` | Ayudantes de tamaño/tiempo de espera del cuerpo de la solicitud |
</Accordion>

<Accordion title="Subrutas de tiempo de ejecución y almacenamiento">
  | Subruta | Exportaciones clave | | --- | --- | | `plugin-sdk/runtime` | Asistentes amplios de tiempo de ejecución/registro/copias de seguridad/instalación de complementos | | `plugin-sdk/runtime-env` | Asistentes estrechos de entorno de tiempo de ejecución, registrador, tiempo de espera, reintento y retroceso | | `plugin-sdk/browser-config` | Fachada de configuración de navegador compatible
  para perfiles/valores predeterminados normalizados, análisis de URL de CDP y asistentes de autenticación de control de navegador | | `plugin-sdk/agent-harness-task-runtime` | Asistentes genéricos de ciclo de vida de tareas y entrega de finalización para agentes respaldados por arneses que usan un ámbito de tarea emitido por el host | | `plugin-sdk/codex-mcp-projection` | Asistente de Codex
  empaquetado reservado para proyectar la configuración del servidor MCP del usuario en la configuración del hilo de Codex; no para complementos de terceros | | `plugin-sdk/codex-native-task-runtime` | Asistente privado de Codex empaquetado para cableado nativo de espejo/tiempo de ejecución de tareas; no para complementos de terceros | | `plugin-sdk/channel-runtime-context` | Asistentes genéricos
  de registro y búsqueda de contexto de tiempo de ejecución de canal | | `plugin-sdk/matrix` | Fachada de compatibilidad de Matrix en desuso para paquetes de canal de terceros más antiguos; los nuevos complementos deben importar `plugin-sdk/run-command` directamente | | `plugin-sdk/mattermost` | Fachada de compatibilidad de Mattermost en desuso para paquetes de canal de terceros más antiguos; los
  nuevos complementos deben importar subrutas genéricas del SDK directamente | | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | | `plugin-sdk/plugin-runtime` | Asistentes compartidos de comandos/enlaces/http/interactivos de complementos | | `plugin-sdk/hook-runtime` | Asistentes compartidos de canalización de webhooks/enlaces internos | | `plugin-sdk/lazy-runtime` | Asistentes de
  importación/vinculación de tiempo de ejecución diferida, como `createLazyRuntimeModule`, `createLazyRuntimeMethod` y `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | Asistentes de ejecución de procesos | | `plugin-sdk/cli-runtime` | Asistentes de formato CLI, espera, versión, invocación de argumentos y grupos de comandos diferidos | | `plugin-sdk/gateway-method-runtime` | Asistente
  de despacho de método de Gateway reservado para rutas HTTP de complementos que declaran `contracts.gatewayMethodDispatch: ["authenticated-request"]` | | `plugin-sdk/gateway-runtime` | Cliente de Gateway, asistente de inicio de cliente listo para bucle de eventos, RPC CLI de Gateway, errores de protocolo de Gateway y asistentes de parches de estado del canal | | `plugin-sdk/config-contracts` |
  Superficie de configuración solo tipos enfocada para formas de configuración de complementos como `OpenClawConfig` y tipos de configuración de canal/proveedor | | `plugin-sdk/plugin-config-runtime` | Asistentes de búsqueda de configuración de complementos en tiempo de ejecución, como `requireRuntimeConfig`, `resolvePluginConfigObject` y `resolveLivePluginConfigObject` | |
  `plugin-sdk/config-mutation` | Asistentes de mutación de configuración transaccional, como `mutateConfigFile`, `replaceConfigFile` y `logConfigUpdated` | | `plugin-sdk/runtime-config-snapshot` | Asistentes de instantánea de configuración del proceso actual, como `getRuntimeConfig`, `getRuntimeConfigSnapshot` y establecedores de instantáneas de prueba | | `plugin-sdk/telegram-command-config` |
  Normalización de nombre de comando/descripción de Telegram y verificaciones de duplicados/conflictos, incluso cuando la superficie del contrato de Telegram empaquetado no está disponible | | `plugin-sdk/text-autolink-runtime` | Detección de autovínculos de referencia de archivo sin el barril de texto amplio | | `plugin-sdk/approval-runtime` | Asistentes de aprobación de ejecución/complementos,
  constructores de capacidades de aprobación, asistentes de autenticación/perfil, asistentes de enrutamiento/tiempo de ejecución nativos y formateo de ruta de visualización de aprobación estructurada | | `plugin-sdk/reply-runtime` | Asistentes compartidos de tiempo de ejecución de entrada/respuesta, fragmentación, despacho, latido y planificador de respuestas | |
  `plugin-sdk/reply-dispatch-runtime` | Asistentes estrechos de despacho/finalización de respuesta y etiquetas de conversación | | `plugin-sdk/reply-history` | Asistentes compartidos de historial de respuestas de ventana corta. El código nuevo de turnos de mensajes debe usar `createChannelHistoryWindow`; los asistentes de mapa de nivel inferior siguen siendo exportaciones de compatibilidad en
  desuso | | `plugin-sdk/reply-reference` | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | Asistentes estrechos de fragmentación de texto/markdown | | `plugin-sdk/session-store-runtime` | Asistentes de flujo de trabajo de sesión (`getSessionEntry`, `listSessionEntries`, `patchSessionEntry`, `upsertSessionEntry`), asistentes de ruta de tienda de sesiones/clave de sesión heredados,
  lecturas de actualización y asistentes de mutación de tienda completa en desuso | | `plugin-sdk/cron-store-runtime` | Asistentes de ruta/carga/guardado de tienda Cron | | `plugin-sdk/state-paths` | Asistentes de ruta de directorio State/OAuth | | `plugin-sdk/routing` | Asistentes de vinculación de ruta/clave de sesión/cuenta, como `resolveAgentRoute`, `buildAgentSessionKey` y
  `resolveDefaultAgentBoundAccountId` | | `plugin-sdk/status-helpers` | Asistentes compartidos de resumen de estado de canal/cuenta, valores predeterminados de estado de tiempo de ejecución y asistentes de metadatos de problemas | | `plugin-sdk/target-resolver-runtime` | Asistentes compartidos de resolución de objetivos | | `plugin-sdk/string-normalization-runtime` | Asistentes de normalización de
  slug/cadena | | `plugin-sdk/request-url` | Extraer URLs de cadena de entradas tipo fetch/request | | `plugin-sdk/run-command` | Ejecutor de comandos cronometrado con resultados normalizados de stdout/stderr | | `plugin-sdk/param-readers` | Lectores comunes de parámetros de herramientas/CLI | | `plugin-sdk/tool-plugin` | Definir un complemento de herramienta de agente tipado simple y exponer
  metadatos estáticos para la generación de manifiestos | | `plugin-sdk/tool-payload` | Extraer cargas útiles normalizadas de objetos de resultados de herramientas | | `plugin-sdk/tool-send` | Extraer campos de destino de envío canónicos de argumentos de herramientas | | `plugin-sdk/temp-path` | Asistentes compartidos de ruta de descarga temporal y espacios de trabajo temporales seguros privados |
  | `plugin-sdk/logging-core` | Asistentes de registrador de subsistemas y redacción | | `plugin-sdk/markdown-table-runtime` | Asistentes de modo y conversión de tablas Markdown | | `plugin-sdk/model-session-runtime` | Asistentes de anulación de modelo/sesión, como `applyModelOverrideToSessionEntry` y `resolveAgentMaxConcurrent` | | `plugin-sdk/talk-config-runtime` | Asistentes de resolución de
  configuración del proveedor Talk | | `plugin-sdk/json-store` | Asistentes pequeños de lectura/escritura de estado JSON | | `plugin-sdk/file-lock` | Asistentes de bloqueo de archivos reentrantes | | `plugin-sdk/persistent-dedupe` | Asistentes de caché de deduplicación respaldada en disco | | `plugin-sdk/acp-runtime` | Asistentes de tiempo de ejecución/sesión ACP y despacho de respuestas | |
  `plugin-sdk/acp-runtime-backend` | Asistentes ligeros de registro de backend ACP y despacho de respuestas para complementos cargados al inicio | | `plugin-sdk/acp-binding-resolve-runtime` | Resolución de enlace ACP de solo lectura sin importaciones de inicio de ciclo de vida | | `plugin-sdk/agent-config-primitives` | Primitivas estrechas de esquema de configuración de tiempo de ejecución de
  agentes | | `plugin-sdk/boolean-param` | Lector suelto de parámetros booleanos | | `plugin-sdk/dangerous-name-runtime` | Asistentes de resolución de coincidencia de nombres peligrosos | | `plugin-sdk/device-bootstrap` | Asistentes de arranque de dispositivo y token de emparejamiento | | `plugin-sdk/extension-shared` | Primitivas de asistentes compartidos de canal pasivo, estado y proxy ambiente
  | | `plugin-sdk/models-provider-runtime` | Asistentes de respuesta de comando/proveedor `/models` | | `plugin-sdk/skill-commands-runtime` | Asistentes de listado de comandos de habilidades | | `plugin-sdk/native-command-registry` | Asistentes de registro/compilación/serialización de comandos nativos | | `plugin-sdk/agent-harness` | Superficie experimental de complemento de confianza para arneses
  de agentes de bajo nivel: tipos de arneses, asistentes de dirección/interrupción de ejecución activa, asistentes de puente de herramientas OpenClaw, asistentes de política de herramientas de plan de tiempo de ejecución, clasificación de resultados terminales, asistentes de formato/detalles de progreso de herramientas y utilidades de resultados de intentos | | `plugin-sdk/provider-zai-endpoint` |
  Fachada en desuso de detección de puntos finales propiedad del proveedor Z.AI; use la API pública del complemento Z.AI | | `plugin-sdk/async-lock-runtime` | Asistente de bloqueo asíncrono local de proceso para archivos de estado de tiempo de ejecución pequeños | | `plugin-sdk/channel-activity-runtime` | Asistente de telemetría de actividad del canal | | `plugin-sdk/concurrency-runtime` |
  Asistente de concurrencia de tareas asíncronas delimitada | | `plugin-sdk/dedupe-runtime` | Asistentes de caché de deduplicación en memoria | | `plugin-sdk/delivery-queue-runtime` | Asistente de drenaje de entrega pendiente saliente | | `plugin-sdk/file-access-runtime` | Asistentes seguros de ruta de archivos locales y fuentes multimedia | | `plugin-sdk/heartbeat-runtime` | Asistentes de
  despertar, evento y visibilidad de latido | | `plugin-sdk/number-runtime` | Asistente de coerción numérica | | `plugin-sdk/secure-random-runtime` | Asistentes de token/UUID seguros | | `plugin-sdk/system-event-runtime` | Asistentes de cola de eventos del sistema | | `plugin-sdk/transport-ready-runtime` | Asistente de espera de preparación del transporte | | `plugin-sdk/infra-runtime` | Shim de
  compatibilidad en desuso; use las subrutas de tiempo de ejecución enfocadas arriba | | `plugin-sdk/collection-runtime` | Asistentes de caché delimitada pequeña | | `plugin-sdk/diagnostic-runtime` | Asistentes de bandera de diagnóstico, eventos y contexto de seguimiento | | `plugin-sdk/error-runtime` | Gráfico de errores, formato, asistentes compartidos de clasificación de errores,
  `isApprovalNotFoundError` | | `plugin-sdk/fetch-runtime` | Fetch envuelto, proxy, opción EnvHttpProxyAgent y asistentes de búsqueda fijada | | `plugin-sdk/runtime-fetch` | Fetch de tiempo de ejecución consciente del despachador sin importaciones de proxy/guarded-fetch | | `plugin-sdk/response-limit-runtime` | Lector de cuerpo de respuesta delimitado sin la superficie de tiempo de ejecución
  multimedia amplia | | `plugin-sdk/session-binding-runtime` | Estado de vinculación de conversación actual sin enrutamiento de vinculación configurado o tiendas de emparejamiento | | `plugin-sdk/session-store-runtime` | Asistentes de tienda de sesiones sin importaciones de escritura/mantenimiento de configuración amplia | | `plugin-sdk/context-visibility-runtime` | Resolución de visibilidad de
  contexto y filtrado de contexto suplementario sin importaciones de configuración/seguridad amplias | | `plugin-sdk/string-coerce-runtime` | Asistentes estrechos de coerción y normalización de registros primitivos/cadenas sin importaciones de markdown/registro | | `plugin-sdk/host-runtime` | Asistentes de normalización de nombre de host y host SCP | | `plugin-sdk/retry-runtime` | Asistentes de
  configuración de reintento y ejecutor de reintento | | `plugin-sdk/agent-runtime` | Asistentes de directorio/identidad/espacio de trabajo de agentes, incluyendo `resolveAgentDir`, `resolveDefaultAgentDir` y exportación de compatibilidad en desuso `resolveOpenClawAgentDir` | | `plugin-sdk/directory-runtime` | Consulta/deduplicación de directorio respaldada por configuración | |
  `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

<Accordion title="Subrutas de capacidades y pruebas">
  | Subruta | Exportaciones clave | | --- | --- | | `plugin-sdk/media-runtime` | Funciones auxiliares compartidas de obtención/transformación/almacenamiento de medios, incluyendo `saveRemoteMedia`, `saveResponseMedia`, `readRemoteMediaBuffer` y la obsoleta `fetchRemoteMedia`; se prefieren las funciones auxiliares de almacenamiento antes de las lecturas de búfer cuando una URL debe convertirse en
  un medio de OpenClaw | | `plugin-sdk/media-mime` | Normalización MIME estrecha, mapeo de extensión de archivo, detección MIME y funciones auxiliares de tipo de medio | | `plugin-sdk/media-store` | Funciones auxiliares de almacenamiento de medios estrechas, como `saveMediaBuffer` y `saveMediaStream` | | `plugin-sdk/media-generation-runtime` | Funciones auxiliares compartidas de conmutación por
  error de generación de medios, selección de candidatos y mensajería de modelos faltantes | | `plugin-sdk/media-understanding` | Tipos de proveedor de comprensión de medios más exportaciones de funciones auxiliares de imagen/audio/extracción estructurada orientadas al proveedor | | `plugin-sdk/meeting-notes` | Tipos de proveedor de origen de notas de reuniones, funciones auxiliares de registro y
  normalización de ID de proveedor | | `plugin-sdk/text-chunking` | Funciones auxiliares de fragmentación/procesamiento de texto y markdown, conversión de tablas markdown, eliminación de etiquetas de directiva y utilidades de texto seguro | | `plugin-sdk/text-chunking` | Función auxiliar de fragmentación de texto saliente | | `plugin-sdk/speech` | Tipos de proveedor de voz más exportaciones de
  funciones auxiliares de directiva, registro, validación, constructor TTS compatible con OpenAI y habla orientadas al proveedor | | `plugin-sdk/speech-core` | Tipos de proveedor de voz compartidos, registro, directiva, normalización y exportaciones de funciones auxiliares de habla | | `plugin-sdk/realtime-transcription` | Tipos de proveedor de transcripción en tiempo real, funciones auxiliares de
  registro y función auxiliar de sesión WebSocket compartida | | `plugin-sdk/realtime-bootstrap-context` | Función auxiliar de arranque de perfil en tiempo real para la inyección de contexto limitada de `IDENTITY.md`, `USER.md` y `SOUL.md` | | `plugin-sdk/realtime-voice` | Tipos de proveedor de voz en tiempo real y funciones auxiliares de registro | | `plugin-sdk/image-generation` | Tipos de
  proveedor de generación de imágenes más funciones auxiliares de activo/URL de datos de imagen y el constructor de proveedor de imágenes compatible con OpenAI | | `plugin-sdk/image-generation-core` | Tipos de generación de imágenes compartidos, conmutación por error, autenticación y funciones auxiliares de registro | | `plugin-sdk/music-generation` | Tipos de proveedor/solicitud/resultado de
  generación de música | | `plugin-sdk/music-generation-core` | Tipos de generación de música compartidos, funciones auxiliares de conmutación por error, búsqueda de proveedor y análisis de referencia de modelo | | `plugin-sdk/video-generation` | Tipos de proveedor/solicitud/resultado de generación de video | | `plugin-sdk/video-generation-core` | Tipos de generación de video compartidos,
  funciones auxiliares de conmutación por error, búsqueda de proveedor y análisis de referencia de modelo | | `plugin-sdk/meeting-notes` | Tipos de proveedor de origen de notas de reuniones compartidos, funciones auxiliares de registro, descriptores de sesión y metadatos de enunciado | | `plugin-sdk/webhook-targets` | Registro de destinos de webhook y funciones auxiliares de instalación de rutas |
  | `plugin-sdk/webhook-path` | Alias de compatibilidad obsoleto; use `plugin-sdk/webhook-ingress` | | `plugin-sdk/web-media` | Funciones auxiliares compartidas de carga de medios remotos/locales | | `plugin-sdk/zod` | Reexportación de compatibilidad obsoleta; importe `zod` desde `zod` directamente | | `plugin-sdk/testing` | Contenedor de compatibilidad obsoleto local en el repositorio para
  pruebas heredadas de OpenClaw. Las nuevas pruebas del repositorio deben importar subrutas de prueba locales enfocadas, como `plugin-sdk/agent-runtime-test-contracts`, `plugin-sdk/plugin-test-runtime`, `plugin-sdk/channel-test-helpers`, `plugin-sdk/test-env` o `plugin-sdk/test-fixtures`, en su lugar | | `plugin-sdk/plugin-test-api` | Función auxiliar `createTestPluginApi` mínima local en el
  repositorio para pruebas unitarias de registro directo de complementos sin importar puentes de funciones auxiliares de prueba del repositorio | | `plugin-sdk/agent-runtime-test-contracts` | Accesorios de contrato de adaptador de tiempo de ejecución de agente nativo local en el repositorio para pruebas de autenticación, entrega, respaldo, enlace de herramienta, superposición de instrucciones,
  esquema y proyección de transcripción | | `plugin-sdk/channel-test-helpers` | Funciones auxiliares de prueba orientadas al canal local en el repositorio para contratos genéricos de acciones/configuración/estado, aserciones de directorio, ciclo de vida de inicio de cuenta, procesamiento de configuración de envío, simulacros de tiempo de ejecución, problemas de estado, entrega saliente y registro
  de enlaces | | `plugin-sdk/channel-target-testing` | Conjunto de casos de error de resolución de destino compartido local en el repositorio para pruebas de canal | | `plugin-sdk/plugin-test-contracts` | Funciones auxiliares de contrato de paquete de complemento, registro, artefacto público, importación directa, API de tiempo de ejecución y efectos secundarios de importación local en el
  repositorio | | `plugin-sdk/provider-test-contracts` | Funciones auxiliares de contrato de tiempo de ejecución de proveedor, autenticación, descubrimiento, incorporación, catálogo, asistente, capacidad de medios, política de repetición, audio en vivo STT en tiempo real, búsqueda/obtención web y flujo local en el repositorio | | `plugin-sdk/provider-http-test-mocks` | Simulacros HTTP/auth de
  Vitest opcionales locales en el repositorio para pruebas de proveedor que ejercitan `plugin-sdk/provider-http` | | `plugin-sdk/test-fixtures` | Accesorios de captura de tiempo de ejecución de CLI genérica, contexto de sandbox, escritor de habilidades, mensaje de agente, evento del sistema, recarga de módulo, ruta de complemento agrupada, texto de terminal, fragmentación, token de autenticación y
  caso tipado local en el repositorio | | `plugin-sdk/test-node-mocks` | Funciones auxiliares de simulación de builtin de Node enfocadas local en el repositorio para usar dentro de fábricas `vi.mock("node:*")` de Vitest |
</Accordion>

<Accordion title="Subrutas de memoria">
  | Subruta | Exportaciones clave | | --- | --- | | `plugin-sdk/memory-core` | Superficie de ayuda de memory-core agrupada para ayudantes de administrador/configuración/archivo/CLI | | `plugin-sdk/memory-core-engine-runtime` | Fachada de tiempo de ejecución de índice/búsqueda de memoria | | `plugin-sdk/memory-core-host-engine-foundation` | Exportaciones del motor de base del host de memoria | |
  `plugin-sdk/memory-core-host-engine-embeddings` | Contratos de incrustación del host de memoria, acceso al registro, proveedor local y ayudantes genéricos de procesamiento por lotes/remotos | | `plugin-sdk/memory-core-host-engine-qmd` | Exportaciones del motor QMD del host de memoria | | `plugin-sdk/memory-core-host-engine-storage` | Exportaciones del motor de almacenamiento del host de memoria
  | | `plugin-sdk/memory-core-host-multimodal` | Ayudantes multimodales del host de memoria | | `plugin-sdk/memory-core-host-query` | Ayudantes de consulta del host de memoria | | `plugin-sdk/memory-core-host-secret` | Ayudantes de secretos del host de memoria | | `plugin-sdk/memory-core-host-events` | Alias de compatibilidad en desuso; use `plugin-sdk/memory-host-events` | |
  `plugin-sdk/memory-core-host-status` | Ayudantes de estado del host de memoria | | `plugin-sdk/memory-core-host-runtime-cli` | Ayudantes de tiempo de ejecución de CLI del host de memoria | | `plugin-sdk/memory-core-host-runtime-core` | Ayudantes de tiempo de ejecución principales del host de memoria | | `plugin-sdk/memory-core-host-runtime-files` | Ayudantes de archivo/tiempo de ejecución del
  host de memoria | | `plugin-sdk/memory-host-core` | Alias neutral al proveedor para los ayudantes de tiempo de ejecución principales del host de memoria | | `plugin-sdk/memory-host-events` | Alias neutral al proveedor para los ayudantes del diario de eventos del host de memoria | | `plugin-sdk/memory-host-files` | Alias de compatibilidad en desuso; use `plugin-sdk/memory-core-host-runtime-files`
  | | `plugin-sdk/memory-host-markdown` | Ayudantes de markdown administrados compartidos para complementos adyacentes a la memoria | | `plugin-sdk/memory-host-search` | Fachada de tiempo de ejecución de memoria activa para el acceso del administrador de búsqueda | | `plugin-sdk/memory-host-status` | Alias de compatibilidad en desuso; use `plugin-sdk/memory-core-host-status` |
</Accordion>

  <Accordion title="Subrutas de ayudantes agrupados reservadas">
    Las subrutas del SDK de ayudantes agrupados reservados son superficies específicas del propietario y estrechas para el código de complemento agrupado. Se rastrean en el inventario del SDK para que las compilaciones de paquetes y los alias sigan siendo deterministas, pero no son API generales de creación de complementos. Los nuevos contratos de host reutilizables deben usar subrutas genéricas del SDK como `plugin-sdk/gateway-runtime`, `plugin-sdk/security-runtime` y `plugin-sdk/plugin-config-runtime`.

    | Subruta | Propietario y propósito |
    | --- | --- |
    | `plugin-sdk/codex-mcp-projection` | Ayudante del complemento Codex agrupado para proyectar la configuración del servidor MCP del usuario en la configuración del hilo del servidor de aplicaciones Codex |
    | `plugin-sdk/codex-native-task-runtime` | Ayudante del complemento Codex agrupado para reflejar los subagentes nativos del servidor de aplicaciones Codex en el estado de la tarea OpenClaw |

  </Accordion>
</AccordionGroup>

## Relacionado

- [Descripción general del SDK de complementos](/es/plugins/sdk-overview)
- [Configuración del SDK de complementos](/es/plugins/sdk-setup)
- [Creación de complementos](/es/plugins/building-plugins)
