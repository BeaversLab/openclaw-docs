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

Para la guía de creación de complementos, consulte [Resumen del SDK del complemento](/es/plugins/sdk-overview).

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
  <Accordion title="Subrutas de canal">
    | Subruta | Exportaciones clave |
    | --- | --- |
    | `plugin-sdk/channel-core` | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` |
    | `plugin-sdk/config-schema` | Exportación del esquema Zod raíz `openclaw.json` (`OpenClawSchema`) |
    | `plugin-sdk/json-schema-runtime` | Asistente de validación de esquema JSON en caché para esquemas propios del complemento |
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`, además de `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` |
    | `plugin-sdk/setup` | Asistentes compartidos del asistente de configuración, avisos de lista de permitidos, constructores de estado de configuración |
    | `plugin-sdk/setup-runtime` | `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
    | `plugin-sdk/setup-adapter-runtime` | Alias de compatibilidad obsoleto; use `plugin-sdk/setup-runtime` |
    | `plugin-sdk/setup-tools` | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` |
    | `plugin-sdk/account-core` | Asistentes de configuración/puerta de acción multicuenta, asistentes de reserva de cuenta predeterminada |
    | `plugin-sdk/account-id` | `DEFAULT_ACCOUNT_ID`, asistentes de normalización de ID de cuenta |
    | `plugin-sdk/account-resolution` | Búsqueda de cuenta + asistentes de reserva predeterminada |
    | `plugin-sdk/account-helpers` | Asistentes limitados de lista de cuenta/acción de cuenta |
    | `plugin-sdk/access-groups` | Análisis de lista de permitidos de grupos de acceso y asistentes de diagnóstico de grupos redactados |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | Asistentes de canalización de respuesta heredados. El nuevo código de canalización de respuesta de canal debe usar `createChannelMessageReplyPipeline` y `resolveChannelMessageSourceReplyDeliveryMode` de `plugin-sdk/channel-message`. |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter`, `resolveChannelDmAccess`, `resolveChannelDmAllowFrom`, `resolveChannelDmPolicy`, `normalizeChannelDmPolicy`, `normalizeLegacyDmAliases` |
    | `plugin-sdk/channel-config-schema` | Primitivas de esquema de configuración de canal compartidas además de constructores Zod y JSON/TypeBox directos |
    | `plugin-sdk/bundled-channel-config-schema` | Esquemas de configuración de canal OpenClaw incluidos solo para complementos incluidos mantenidos |
    | `plugin-sdk/channel-config-schema-legacy` | Alias de compatibilidad obsoleto para esquemas de configuración de canal incluido |
    | `plugin-sdk/telegram-command-config` | Asistentes de normalización/validación de comandos personalizados de Telegram con reserva de contrato incluido |
    | `plugin-sdk/command-gating` | Asistentes limitados de puerta de autorización de comandos |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-ingress` | Fachada de compatibilidad de entrada de canal de bajo nivel obsoleta. Las nuevas rutas de recepción deben usar `plugin-sdk/channel-ingress-runtime`. |
    | `plugin-sdk/channel-ingress-runtime` | Resolvedor de tiempo de ejecución de entrada de canal de alto nivel experimental y constructores de hechos de ruta para rutas de recepción de canal migradas. Preferir esto sobre el ensamblaje de listas de permitidos efectivas, listas de permitidos de comandos y proyecciones heredadas en cada complemento. Vea [Channel ingress API](/es/plugins/sdk-channel-ingress). |
    | `plugin-sdk/channel-lifecycle` | `createAccountStatusSink`, `createChannelRunQueue` y asistentes de ciclo de vida de flujo de borrador heredados. El nuevo código de finalización de vista previa debe usar `plugin-sdk/channel-message`. |
    | `plugin-sdk/channel-message` | Asistentes de contrato de ciclo de vida de mensajes económicos, como `defineChannelMessageAdapter`, `createChannelMessageAdapterFromOutbound`, `createChannelMessageReplyPipeline`, `createReplyPrefixContext`, `resolveChannelMessageSourceReplyDeliveryMode`, derivación de capacidades finales duraderas, asistentes de prueba de capacidad para capacidades de envío/recepción/efecto secundario, `MessageReceiveContext`, pruebas de política de reconocimiento de recepción, `defineFinalizableLivePreviewAdapter`, `deliverWithFinalizableLivePreviewAdapter`, pruebas de capacidad de vista previa en vivo y finalizador en vivo, estado de recuperación duradero, `RenderedMessageBatch`, tipos de recepción de mensaje y asistentes de ID de recepción. Vea [Channel message API](/es/plugins/sdk-channel-message). Las fachadas de envío de respuesta heredadas son compatibilidad obsoleta solamente. |
    | `plugin-sdk/channel-message-runtime` | Asistentes de entrega en tiempo de ejecución que pueden cargar entrega saliente, incluyendo `deliverInboundReplyWithMessageSendContext`, `sendDurableMessageBatch` y `withDurableMessageSendContext`. Los puentes de envío de respuesta obsoletos siguen siendo importables solo para despachadores de compatibilidad. Úselo desde módulos de tiempo de ejecución de monitor/envío, no archivos de arranque en caliente de complementos. |
    | `plugin-sdk/inbound-envelope` | Asistentes compartidos de constructor de ruta de entrada + sobre |
    | `plugin-sdk/inbound-reply-dispatch` | Asistentes compartidos heredados de registro y envío de entrada, predicados de envío visible/final y compatibilidad obsoleta `deliverDurableInboundReplyPayload` para despachadores de canal preparados. El nuevo código de recepción/envío de canal debe importar asistentes de ciclo de vida en tiempo de ejecución desde `plugin-sdk/channel-message-runtime`. |
    | `plugin-sdk/messaging-targets` | Asistentes de análisis/coincidencia de objetivos |
    | `plugin-sdk/outbound-media` | Asistentes compartidos de carga de medios salientes |
    | `plugin-sdk/outbound-send-deps` | Búsqueda de dependencia de envío saliente ligera para adaptadores de canal |
    | `plugin-sdk/outbound-runtime` | Asistentes de identidad saliente, delegado de envío, sesión, formato y planificación de carga. Los asistentes de entrega directa, como `deliverOutboundPayloads`, son sustrato de compatibilidad obsoleto; use `plugin-sdk/channel-message-runtime` para nuevas rutas de envío. |
    | `plugin-sdk/poll-runtime` | Asistentes limitados de normalización de encuestas |
    | `plugin-sdk/thread-bindings-runtime` | Asistentes de ciclo de vida y adaptador de enlace de hilos |
    | `plugin-sdk/agent-media-payload` | Constructor de carga de medios de agente heredado |
    | `plugin-sdk/conversation-runtime` | Asistentes de enlace, emparejamiento y enlace configurado de conversación/hilos |
    | `plugin-sdk/runtime-config-snapshot` | Asistente de instantánea de configuración en tiempo de ejecución |
    | `plugin-sdk/runtime-group-policy` | Asistentes de resolución de política de grupo en tiempo de ejecución |
    | `plugin-sdk/channel-status` | Asistentes compartidos de instantánea/resumen de estado del canal |
    | `plugin-sdk/channel-config-primitives` | Primitivas limitadas de esquema de configuración de canal |
    | `plugin-sdk/channel-config-writes` | Asistentes de autorización de escritura de configuración de canal |
    | `plugin-sdk/channel-plugin-common` | Exportaciones compartidas de preludio del complemento de canal |
    | `plugin-sdk/allowlist-config-edit` | Asistentes de edición/lectura de configuración de lista de permitidos |
    | `plugin-sdk/group-access` | Asistentes compartidos de decisión de acceso de grupo |
    | `plugin-sdk/direct-dm` | Asistentes compartidos de aut/guardia de DM directo |
    | `plugin-sdk/discord` | Fachada de compatibilidad de Discord obsoleta para `@openclaw/discord@2026.3.13` publicado y compatibilidad de propietario rastreada; los nuevos complementos deben usar subrutas genéricas del SDK de canal |
    | `plugin-sdk/telegram-account` | Fachada de compatibilidad de resolución de cuenta de Telegram obsoleta para compatibilidad de propietario rastreada; los nuevos complementos deben usar asistentes de tiempo de ejecución inyectados o subrutas genéricas del SDK de canal |
    | `plugin-sdk/zalouser` | Fachada de compatibilidad de Zalo Personal obsoleta para paquetes Lark/Zalo publicados que todavía importan la autorización de comandos del remitente; los nuevos complementos deben usar `plugin-sdk/command-auth` |
    | `plugin-sdk/interactive-runtime` | Presentación de mensajes semántica, entrega y asistentes heredados de respuesta interactiva. Vea [Message Presentation](/es/plugins/message-presentation) |
    | `plugin-sdk/channel-inbound` | Barril de compatibilidad para rebote de entrada, coincidencia de mención, asistentes de política de mención y asistentes de sobre |
    | `plugin-sdk/channel-inbound-debounce` | Asistentes limitados de rebote de entrada |
    | `plugin-sdk/channel-mention-gating` | Asistentes limitados de política de mención, marcador de mención y texto de mención sin la superficie de tiempo de ejecución de entrada más amplia |
    | `plugin-sdk/channel-envelope` | Asistentes limitados de formato de sobre de entrada |
    | `plugin-sdk/channel-location` | Asistentes de contexto y formato de ubicación de canal |
    | `plugin-sdk/channel-logging` | Asistentes de registro de canal para rechazos de entrada y fallas de escritura/reconocimiento |
    | `plugin-sdk/channel-send-result` | Tipos de resultados de respuesta |
    | `plugin-sdk/channel-actions` | Asistentes de acción de mensaje de canal, además de asistentes de esquema nativo obsoleto mantenidos para compatibilidad de complementos |
    | `plugin-sdk/channel-route` | Normalización de ruta compartida, resolución de objetivos impulsada por analizador, cadena de ID de hilo, claves de ruta de desduplicación/compacción, tipos de objetivos analizados y asistentes de comparación de ruta/objetivo |
    | `plugin-sdk/channel-targets` | Asistentes de análisis de objetivos; los llamadores de comparación de rutas deben usar `plugin-sdk/channel-route` |
    | `plugin-sdk/channel-contract` | Tipos de contrato de canal |
    | `plugin-sdk/channel-feedback` | Cableado de comentarios/reacciones |
    | `plugin-sdk/channel-secret-runtime` | Asistentes limitados de contrato secreto, como `collectSimpleChannelFieldAssignments`, `getChannelSurface`, `pushAssignment` y tipos de objetivos secretos |
  </Accordion>

<Accordion title="Subrutas del proveedor">
  | Subruta | Exportaciones clave | | --- | --- | | `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry` | | `plugin-sdk/lmstudio` | Fachana de proveedor de LM Studio compatible para la configuración, descubrimiento del catálogo y preparación del modelo en tiempo de ejecución | | `plugin-sdk/lmstudio-runtime` | Fachana de tiempo de ejecución de LM Studio compatible para valores
  predeterminados del servidor local, descubrimiento de modelos, encabezados de solicitud y asistentes de modelos cargados | | `plugin-sdk/provider-setup` | Asistentes de configuración de proveedores locales/autohospedados curados | | `plugin-sdk/self-hosted-provider-setup` | Asistentes de configuración de proveedores autohospedados compatibles con OpenAI enfocados | | `plugin-sdk/cli-backend` |
  Valores predeterminados del backend de CLI + constantes de watchdog | | `plugin-sdk/provider-auth-runtime` | Asistentes de resolución de claves API en tiempo de ejecución para complementos de proveedor | | `plugin-sdk/provider-auth-api-key` | Asistentes de incorporación de claves API/escritura de perfiles, como `upsertApiKeyProfile` | | `plugin-sdk/provider-auth-result` | Constructor de
  resultados de autenticación OAuth estándar | | `plugin-sdk/provider-env-vars` | Asistentes de búsqueda de variables de entorno de autenticación del proveedor | | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`, `ensureApiKeyFromOptionEnvOrPrompt`, `upsertAuthProfile`, `upsertApiKeyProfile`, `writeOAuthCredentials`, exportación de compatibilidad `resolveOpenClawAgentDir` obsoleta |
  | `plugin-sdk/provider-model-shared` | `ProviderReplayFamily`, `buildProviderReplayFamilyHooks`, `normalizeModelCompat`, constructores de políticas de reproducción compartidas, asistentes de endpoints de proveedor y asistentes compartidos de normalización de ID de modelo | | `plugin-sdk/provider-catalog-runtime` | Gancho de tiempo de ejecución de aumento del catálogo de proveedores y costuras
  del registro de complementos-proveedores para pruebas de contrato | | `plugin-sdk/provider-catalog-shared` | `findCatalogTemplate`, `buildSingleProviderApiKeyCatalog`, `buildManifestModelProviderConfig`, `supportsNativeStreamingUsageCompat`, `applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-http` | Asistentes de capacidades HTTP/endpoint de proveedor genéricos, errores HTTP de
  proveedor y asistentes de formularios multiparte para transcripción de audio | | `plugin-sdk/provider-web-fetch-contract` | Asistentes de contrato de configuración/selección de web-fetch limitados, como `enablePluginInConfig` y `WebFetchProviderPlugin` | | `plugin-sdk/provider-web-fetch` | Asistentes de registro/caché de proveedores de web-fetch | |
  `plugin-sdk/provider-web-search-config-contract` | Asistentes de configuración/credenciales de búsqueda web limitados para proveedores que no necesitan cableado de habilitación de complemento | | `plugin-sdk/provider-web-search-contract` | Asistentes de contrato de configuración/credenciales de búsqueda web limitados, como `createWebSearchProviderContractFields`, `enablePluginInConfig`,
  `resolveProviderWebSearchPluginConfig`, y establecedores/obtenedores de credenciales con alcance | | `plugin-sdk/provider-web-search` | Asistentes de registro/caché/tiempo de ejecución de proveedores de búsqueda web | | `plugin-sdk/provider-tools` | `ProviderToolCompatFamily`, `buildProviderToolCompatFamilyHooks`, y limpieza de esquema de Gemini + diagnósticos | | `plugin-sdk/provider-usage` |
  `fetchClaudeUsage` y similares | | `plugin-sdk/provider-stream` | `ProviderStreamFamily`, `buildProviderStreamFamilyHooks`, `composeProviderStreamWrappers`, tipos de contenedores de flujo, y asistentes de contenedor compartidos Anthropic/Bedrock/DeepSeek V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot | | `plugin-sdk/provider-transport-runtime` | Asistentes de transporte de
  proveedor nativo, como fetch protegido, transformaciones de mensajes de transporte y flujos de eventos de transporte escribibles | | `plugin-sdk/provider-onboard` | Asistentes de parches de configuración de incorporación | | `plugin-sdk/global-singleton` | Asistentes de singleton/mapa/caché locales de proceso | | `plugin-sdk/group-activation` | Asistentes de modo de activación de grupo limitado
  y análisis de comandos |
</Accordion>

<Accordion title="Subrutas de autenticación y seguridad">
  | Subruta | Exportaciones clave | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate`, asistentes de registro de comandos que incluyen el formato dinámico del menú de argumentos, asistentes de autorización del remitente | | `plugin-sdk/command-status` | Constructores de mensajes de comandos/ayuda como `buildCommandsMessagePaginated` y `buildHelpMessage` | |
  `plugin-sdk/approval-auth-runtime` | Resolución del aprobador y asistentes de autenticación de acciones del mismo chat | | `plugin-sdk/approval-client-runtime` | Asistentes de perfil/filtro de aprobación de ejecución nativa | | `plugin-sdk/approval-delivery-runtime` | Adaptadores de capacidad/entrega de aprobación nativa | | `plugin-sdk/approval-gateway-runtime` | Asistente compartido de
  resolución de puerta de enlace de aprobación | | `plugin-sdk/approval-handler-adapter-runtime` | Asistentes ligeros de carga de adaptadores de aprobación nativa para puntos de entrada de canal activo | | `plugin-sdk/approval-handler-runtime` | Asistentes de tiempo de ejecución de controladores de aprobación más amplios; prefiera las costuras de adaptador/puerta de enlace más estrechas cuando
  sean suficientes | | `plugin-sdk/approval-native-runtime` | Asistentes de destino de aprobación nativa + vinculación de cuenta | | `plugin-sdk/approval-reply-runtime` | Asistentes de carga útil de respuesta de aprobación de ejecución/complemento | | `plugin-sdk/approval-runtime` | Asistentes de carga útil de aprobación de ejecución/complemento, asistentes de enrutamiento/tiempo de ejecución de
  aprobación nativa, y asistentes de visualización de aprobación estructurada como `formatApprovalDisplayPath` | | `plugin-sdk/reply-dedupe` | Asistentes estrechos de restablecimiento de deduplicación de respuestas entrantes | | `plugin-sdk/channel-contract-testing` | Asistentes estrechos de prueba de contrato de canal sin el barril de pruebas amplio | | `plugin-sdk/command-auth-native` |
  Autenticación de comando nativa, formato dinámico del menú de argumentos, y asistentes de destino de sesión nativa | | `plugin-sdk/command-detection` | Asistentes compartidos de detección de comandos | | `plugin-sdk/command-primitives-runtime` | Predicados de texto de comando ligeros para rutas de canal activo | | `plugin-sdk/command-surface` | Normalización del cuerpo del comando y asistentes
  de superficie del comando | | `plugin-sdk/allow-from` | `formatAllowFromLowercase` | | `plugin-sdk/channel-secret-runtime` | Asistentes estrechos de colección de contrato secreto para superficies de secretos de canal/complemento | | `plugin-sdk/secret-ref-runtime` | Asistentes estrechos de tipado `coerceSecretRef` y SecretRef para el análisis de contrato secreto/configuración | |
  `plugin-sdk/security-runtime` | Asistentes compartidos de confianza, restricción de MD, archivo/ruta limitado por raíz que incluyen escrituras solo de creación, reemplazo de archivo atómico síncrono/asincrónico, escrituras temporales de hermanos, reserva de movimiento entre dispositivos, asistentes de almacenamiento de archivos privados, guardias de padre de enlace simbólico, contenido externo,
  redacción de texto sensible, comparación de secretos de tiempo constante y asistentes de colección de secretos | | `plugin-sdk/ssrf-policy` | Asistentes de política de lista de permitidos de host y SSRF de red privada | | `plugin-sdk/ssrf-dispatcher` | Asistentes estrechos de despachador anclado sin la superficie de tiempo de ejecución de infraestructura amplia | | `plugin-sdk/ssrf-runtime` |
  Despachador anclado, búsqueda protegida contra SSRF, error SSRF y asistentes de política SSRF | | `plugin-sdk/secret-input` | Asistentes de análisis de entrada secreta | | `plugin-sdk/webhook-ingress` | Asistentes de solicitud/destino de Webhook y coerción de websocket/cuerpo sin procesar | | `plugin-sdk/webhook-request-guards` | Asistentes de tamaño/tiempo de espera del cuerpo de la solicitud |
</Accordion>

<Accordion title="Rutas de subacceso de ejecución y almacenamiento">
  | Ruta de subacceso | Exportaciones clave | | --- | --- | | `plugin-sdk/runtime` | Funciones auxiliares amplias de ejecución/registro/copias de seguridad/instalación de complementos | | `plugin-sdk/runtime-env` | Funciones auxiliares estrechas de entorno de ejecución, registrador, tiempo de espera, reintento y retroceso exponencial | | `plugin-sdk/browser-config` | Fachada de configuración de
  navegador compatible para perfiles/valores predeterminados normalizados, análisis de URL de CDP y funciones auxiliares de autenticación de control de navegador | | `plugin-sdk/codex-mcp-projection` | Función auxiliar de Codex agrupada reservada para proyectar la configuración del servidor MCP del usuario en la configuración del hilo de Codex; no para complementos de terceros | |
  `plugin-sdk/codex-native-task-runtime` | Función auxiliar de Codex agrupada reservada para la conexión del espejo/ejecución de tareas nativas; no para complementos de terceros | | `plugin-sdk/channel-runtime-context` | Funciones auxiliares de registro y búsqueda genéricas de contexto de ejecución de canal | | `plugin-sdk/matrix` | Fachada de compatibilidad de Matrix en desuso para paquetes de
  canales de terceros más antiguos; los complementos nuevos deben importar `plugin-sdk/run-command` directamente | | `plugin-sdk/mattermost` | Fachada de compatibilidad de Mattermost en desuso para paquetes de canales de terceros más antiguos; los complementos nuevos deben importar rutas de subacceso genéricas del SDK directamente | | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | |
  `plugin-sdk/plugin-runtime` | Funciones auxiliares compartidas de comandos/ganchos/http/interactivos de complementos | | `plugin-sdk/hook-runtime` | Funciones auxiliares compartidas de canalización de webhooks/ganchos internos | | `plugin-sdk/lazy-runtime` | Funciones auxiliares de importación/vinculación de ejecución diferida, como `createLazyRuntimeModule`, `createLazyRuntimeMethod` y
  `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | Funciones auxiliares de ejecución de procesos | | `plugin-sdk/cli-runtime` | Funciones auxiliares de formato de CLI, espera, versión, invocación de argumentos y grupos de comandos diferidos | | `plugin-sdk/gateway-runtime` | Cliente de puerta de enlace, función auxiliar de inicio de cliente listo para bucle de eventos, RPC de CLI de
  puerta de enlace, errores de protocolo de puerta de enlace y funciones auxiliares de parches de estado del canal | | `plugin-sdk/config-contracts` | Superficie de configuración solo de tipos enfocada para formas de configuración de complementos, como `OpenClawConfig` y tipos de configuración de canal/proveedor | | `plugin-sdk/plugin-config-runtime` | Funciones auxiliares de búsqueda de
  configuración de complementos en tiempo de ejecución, como `requireRuntimeConfig`, `resolvePluginConfigObject` y `resolveLivePluginConfigObject` | | `plugin-sdk/config-mutation` | Funciones auxiliares de mutación de configuración transaccional, como `mutateConfigFile`, `replaceConfigFile` y `logConfigUpdated` | | `plugin-sdk/runtime-config-snapshot` | Funciones auxiliares de instantáneas de
  configuración de proceso actual, como `getRuntimeConfig`, `getRuntimeConfigSnapshot` y definidores de instantáneas de prueba | | `plugin-sdk/telegram-command-config` | Normalización de nombre/descripción de comandos de Telegram y verificaciones de duplicados/conflictos, incluso cuando la superficie de contrato de Telegram agrupada no está disponible | | `plugin-sdk/text-autolink-runtime` |
  Detección de autovínculos de referencia de archivo sin el barril de texto amplio | | `plugin-sdk/approval-runtime` | Funciones auxiliares de aprobación de ejecución/complemento, constructores de capacidades de aprobación, funciones auxiliares de autenticación/perfil, funciones auxiliares de enrutamiento/ejecución nativas y formato de ruta de visualización de aprobación estructurada | |
  `plugin-sdk/reply-runtime` | Funciones auxiliares compartidas de tiempo de ejecución de entrada/respuesta, fragmentación, despacho, latido y planificador de respuestas | | `plugin-sdk/reply-dispatch-runtime` | Funciones auxiliares estrechas de despacho/finalización de respuesta y etiquetas de conversación | | `plugin-sdk/reply-history` | Funciones auxiliares y marcadores compartidos de historial
  de respuestas de ventana corta, como `buildHistoryContext`, `HISTORY_CONTEXT_MARKER`, `recordPendingHistoryEntry` y `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | Funciones auxiliares estrechas de fragmentación de texto/markdown | | `plugin-sdk/session-store-runtime` | Ruta de almacén de sesión, clave de sesión,
  fecha de actualización y funciones auxiliares de mutación de almacén | | `plugin-sdk/cron-store-runtime` | Funciones auxiliares de ruta/carga/guardado de almacén de Cron | | `plugin-sdk/state-paths` | Funciones auxiliares de ruta de directorio de estado/OAuth | | `plugin-sdk/routing` | Funciones auxiliares de vinculación de ruta/clave de sesión/cuenta, como `resolveAgentRoute`,
  `buildAgentSessionKey` y `resolveDefaultAgentBoundAccountId` | | `plugin-sdk/status-helpers` | Funciones auxiliares compartidas de resumen de estado de canal/cuenta, valores predeterminados de estado de ejecución y funciones auxiliares de metadatos de problemas | | `plugin-sdk/target-resolver-runtime` | Funciones auxiliares compartidas de resolución de objetivos | |
  `plugin-sdk/string-normalization-runtime` | Funciones auxiliares de normalización de slug/cadena | | `plugin-sdk/request-url` | Extraer URL de cadena de entradas tipo fetch/request | | `plugin-sdk/run-command` | Ejecutor de comandos temporizados con resultados de stdout/stderr normalizados | | `plugin-sdk/param-readers` | Lectores comunes de parámetros de herramienta/CLI | |
  `plugin-sdk/tool-payload` | Extraer cargas útiles normalizadas de objetos de resultados de herramientas | | `plugin-sdk/tool-send` | Extraer campos de destino de envío canónicos de argumentos de herramientas | | `plugin-sdk/temp-path` | Funciones auxiliares compartidas de ruta de descarga temporal y espacios de trabajo temporales privados y seguros | | `plugin-sdk/logging-core` | Registrador de
  subsistemas y funciones auxiliares de redacción | | `plugin-sdk/markdown-table-runtime` | Funciones auxiliares de modo y conversión de tablas de Markdown | | `plugin-sdk/model-session-runtime` | Funciones auxiliares de anulación de modelo/sesión, como `applyModelOverrideToSessionEntry` y `resolveAgentMaxConcurrent` | | `plugin-sdk/talk-config-runtime` | Funciones auxiliares de resolución de
  configuración de proveedor Talk | | `plugin-sdk/json-store` | Funciones auxiliares pequeñas de lectura/escritura de estado JSON | | `plugin-sdk/file-lock` | Funciones auxiliares de bloqueo de archivo reentrante | | `plugin-sdk/persistent-dedupe` | Funciones auxiliares de caché de deduplicación respaldada en disco | | `plugin-sdk/acp-runtime` | Funciones auxiliares de ejecución/sesión y despacho
  de respuestas de ACP | | `plugin-sdk/acp-runtime-backend` | Funciones auxiliares de registro y despacho de respuestas de backend de ACP ligero para complementos cargados al inicio | | `plugin-sdk/acp-binding-resolve-runtime` | Resolución de vinculación de ACP de solo lectura sin importaciones de inicio del ciclo de vida | | `plugin-sdk/agent-config-primitives` | Primitivas estrechas de esquema
  de configuración de ejecución de agente | | `plugin-sdk/boolean-param` | Lector suelto de parámetros booleanos | | `plugin-sdk/dangerous-name-runtime` | Funciones auxiliares de resolución de coincidencia de nombres peligrosos | | `plugin-sdk/device-bootstrap` | Funciones auxiliares de arranque de dispositivo y token de emparejamiento | | `plugin-sdk/extension-shared` | Primitivas auxiliares
  compartidas de canal pasivo, estado y proxy ambiente | | `plugin-sdk/models-provider-runtime` | Funciones auxiliares de respuesta de comando/proveedor `/models` | | `plugin-sdk/skill-commands-runtime` | Funciones auxiliares de listado de comandos de habilidades | | `plugin-sdk/native-command-registry` | Funciones auxiliares de registro/construcción/serialización de comandos nativos | |
  `plugin-sdk/agent-harness` | Superficie experimental de complemento confiable para arneses de agentes de bajo nivel: tipos de arnés, funciones auxiliares de dirección/aborto de ejecución activa, funciones auxiliares de puente de herramienta OpenClaw, funciones auxiliares de política de herramienta de plan de ejecución, clasificación de resultados terminales, funciones auxiliares de
  formato/detalle de progreso de herramienta y utilidades de resultados de intentos | | `plugin-sdk/provider-zai-endpoint` | Fachada de detección de punto final propiedad del proveedor Z.AI en desuso; use la API pública del complemento Z.AI | | `plugin-sdk/async-lock-runtime` | Función auxiliar de bloqueo asíncrono local de proceso para archivos pequeños de estado de ejecución | |
  `plugin-sdk/channel-activity-runtime` | Función auxiliar de telemetría de actividad del canal | | `plugin-sdk/concurrency-runtime` | Función auxiliar de concurrencia de tareas asíncronas limitadas | | `plugin-sdk/dedupe-runtime` | Funciones auxiliares de caché de deduplicación en memoria | | `plugin-sdk/delivery-queue-runtime` | Función auxiliar de drenaje de entrega pendiente saliente | |
  `plugin-sdk/file-access-runtime` | Funciones auxiliares seguras de ruta de archivo local y fuente de medios | | `plugin-sdk/heartbeat-runtime` | Funciones auxiliares de despertador, evento y visibilidad de latido | | `plugin-sdk/number-runtime` | Función auxiliar de coerción numérica | | `plugin-sdk/secure-random-runtime` | Funciones auxiliares seguras de token/UUID | |
  `plugin-sdk/system-event-runtime` | Funciones auxiliares de cola de eventos del sistema | | `plugin-sdk/transport-ready-runtime` | Función auxiliar de espera de preparación del transporte | | `plugin-sdk/infra-runtime` | Shim de compatibilidad en desuso; use las rutas de subacceso de ejecución enfocadas arriba | | `plugin-sdk/collection-runtime` | Funciones auxiliares pequeñas de caché limitada
  | | `plugin-sdk/diagnostic-runtime` | Funciones auxiliares de indicador de diagnóstico, evento y contexto de seguimiento | | `plugin-sdk/error-runtime` | Gráfico de errores, formato, funciones auxiliares compartidas de clasificación de errores, `isApprovalNotFoundError` | | `plugin-sdk/fetch-runtime` | Fetch envuelto, proxy, opción EnvHttpProxyAgent y funciones auxiliares de búsqueda anclada | |
  `plugin-sdk/runtime-fetch` | Fetch de ejecución consciente del despachador sin importaciones de proxy/guarded-fetch | | `plugin-sdk/response-limit-runtime` | Lector de cuerpo de respuesta limitado sin la superficie de ejecución de medios amplia | | `plugin-sdk/session-binding-runtime` | Estado de vinculación de conversación actual sin enrutamiento de vinculación configurado o almacenes de
  emparejamiento | | `plugin-sdk/session-store-runtime` | Funciones auxiliares de almacén de sesión sin importaciones amplias de escritura/mantenimiento de configuración | | `plugin-sdk/context-visibility-runtime` | Resolución de visibilidad de contexto y filtrado de contexto complementario sin importaciones amplias de configuración/seguridad | | `plugin-sdk/string-coerce-runtime` | Funciones
  auxiliares estrechas de coerción y normalización de registros/cadenas primitivas sin importaciones de markdown/registro | | `plugin-sdk/host-runtime` | Funciones auxiliares de normalización de nombre de host y host SCP | | `plugin-sdk/retry-runtime` | Configuración de reintento y funciones auxiliares de ejecutor de reintento | | `plugin-sdk/agent-runtime` | Funciones auxiliares de
  directorio/identidad/espacio de trabajo del agente, incluidas `resolveAgentDir`, `resolveDefaultAgentDir` y la exportación de compatibilidad en desuso `resolveOpenClawAgentDir` | | `plugin-sdk/directory-runtime` | Consulta/deduplicación de directorio respaldada por configuración | | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

<Accordion title="Subrutas de capacidades y pruebas">
  | Subruta | Exportaciones clave | | --- | --- | | `plugin-sdk/media-runtime` | Asistentes compartidos de obtención/transformación/almacenamiento de medios, incluyendo `saveRemoteMedia`, `saveResponseMedia`, `readRemoteMediaBuffer` y el obsoleto `fetchRemoteMedia`; prefiera los asistentes de almacenamiento antes de las lecturas de búfer cuando una URL deba convertirse en un medio de OpenClaw | |
  `plugin-sdk/media-mime` | Normalización MIME estrecha, mapeo de extensión de archivo, detección MIME y asistentes de tipo de medio | | `plugin-sdk/media-store` | Asistentes estrechos de almacenamiento de medios tales como `saveMediaBuffer` y `saveMediaStream` | | `plugin-sdk/media-generation-runtime` | Asistentes compartidos de conmutación por error de generación de medios, selección de
  candidatos y mensajería de modelos faltantes | | `plugin-sdk/media-understanding` | Tipos de proveedor de comprensión de medios más exportaciones de asistentes de imagen/audio/extracción estructurada orientadas al proveedor | | `plugin-sdk/text-chunking` | Asistentes de fragmentación/renderizado de texto y markdown, conversión de tablas markdown, eliminación de etiquetas de directiva y
  utilidades de texto seguro | | `plugin-sdk/text-chunking` | Asistente de fragmentación de texto saliente | | `plugin-sdk/speech` | Tipos de proveedor de voz más exportaciones de asistentes de directiva, registro, validación, generador TTS compatible con OpenAI y ayuda de voz orientados al proveedor | | `plugin-sdk/speech-core` | Tipos compartidos de proveedor de voz, registro, directiva,
  normalización y exportaciones de asistentes de voz | | `plugin-sdk/realtime-transcription` | Tipos de proveedor de transcripción en tiempo real, asistentes de registro y asistente compartido de sesión WebSocket | | `plugin-sdk/realtime-voice` | Tipos de proveedor de voz en tiempo real y asistentes de registro | | `plugin-sdk/image-generation` | Tipos de proveedor de generación de imágenes más
  asistentes de activo de imagen/URL de datos y el generador de proveedor de imágenes compatible con OpenAI | | `plugin-sdk/image-generation-core` | Tipos compartidos de generación de imágenes, asistentes de conmutación por error, autenticación y registro | | `plugin-sdk/music-generation` | Tipos de proveedor/solicitud/resultado de generación de música | | `plugin-sdk/music-generation-core` |
  Tipos compartidos de generación de música, asistentes de conmutación por error, búsqueda de proveedor y análisis de referencia de modelo | | `plugin-sdk/video-generation` | Tipos de proveedor/solicitud/resultado de generación de video | | `plugin-sdk/video-generation-core` | Tipos compartidos de generación de video, asistentes de conmutación por error, búsqueda de proveedor y análisis de
  referencia de modelo | | `plugin-sdk/webhook-targets` | Registro de destino de Webhook y asistentes de instalación de rutas | | `plugin-sdk/webhook-path` | Alias de compatibilidad obsoleto; use `plugin-sdk/webhook-ingress` | | `plugin-sdk/web-media` | Asistentes compartidos de carga de medios remotos/locales | | `plugin-sdk/zod` | Reexportación de compatibilidad obsoleta; importe `zod`
  directamente de `zod` | | `plugin-sdk/testing` | Contenedor de compatibilidad obsoleto local del repositorio para pruebas heredadas de OpenClaw. Las nuevas pruebas del repositorio deben importar subrutas de prueba locales enfocadas tales como `plugin-sdk/agent-runtime-test-contracts`, `plugin-sdk/plugin-test-runtime`, `plugin-sdk/channel-test-helpers`, `plugin-sdk/test-env` o
  `plugin-sdk/test-fixtures` en su lugar | | `plugin-sdk/plugin-test-api` | Asistente `createTestPluginApi` mínimo local del repositorio para pruebas unitarias de registro directo de complementos sin importar puentes de asistentes de prueba del repositorio | | `plugin-sdk/agent-runtime-test-contracts` | Accesorios de contrato de adaptador del tiempo de ejecución del agente nativo local del
  repositorio para pruebas de autenticación, entrega, conmutación por error, enlace de herramienta, superposición de solicitud, esquema y proyección de transcripción | | `plugin-sdk/channel-test-helpers` | Asistentes de prueba orientados al canal local del repositorio para contratos genéricos de acciones/configuración/estado, aserciones de directorio, ciclo de vida de inicio de cuenta,
  procesamiento de configuración de envío, simulacros de tiempo de ejecución, problemas de estado, entrega saliente y registro de enlaces | | `plugin-sdk/channel-target-testing` | Suite de casos de error de resolución de destino compartida local del repositorio para pruebas de canal | | `plugin-sdk/plugin-test-contracts` | Asistentes de contrato de paquete de complemento local del repositorio,
  registro, artefacto público, importación directa, API de tiempo de ejecución y efecto secundario de importación | | `plugin-sdk/provider-test-contracts` | Asistentes de contrato de tiempo de ejecución, autenticación, descubrimiento, incorporación, catálogo, asistente, capacidad de medios, política de repetición, audio en vivo STT en tiempo real, búsqueda web/obtención y flujo de proveedor local
  del repositorio | | `plugin-sdk/provider-http-test-mocks` | Simulacros HTTP/auth opcionales de Vitest local del repositorio para pruebas de proveedor que ejercitan `plugin-sdk/provider-http` | | `plugin-sdk/test-fixtures` | Accesorios genéricos de captura de tiempo de ejecución de CLI, contexto de espacio aislado, escritor de habilidades, mensaje de agente, evento del sistema, recarga de módulo,
  ruta de complemento agrupado, texto de terminal, fragmentación, token de autenticación y caso tipado local del repositorio | | `plugin-sdk/test-node-mocks` | Asistentes de simulacro centrados de Node builtin local del repositorio para usar dentro de fábricas `vi.mock("node:*")` de Vitest |
</Accordion>

<Accordion title="Subrutas de memoria">
  | Subruta | Exportaciones clave | | --- | --- | | `plugin-sdk/memory-core` | Superficie de ayuda agrupada de memory-core para ayudantes de administrador/configuración/archivo/CLI | | `plugin-sdk/memory-core-engine-runtime` | Fachada de tiempo de ejecución de índice/búsqueda de memoria | | `plugin-sdk/memory-core-host-engine-foundation` | Exportaciones del motor base del host de memoria | |
  `plugin-sdk/memory-core-host-engine-embeddings` | Contratos de incrustación del host de memoria, acceso al registro, proveedor local y ayudantes genéricos de procesamiento por lotes/remotos | | `plugin-sdk/memory-core-host-engine-qmd` | Exportaciones del motor QMD del host de memoria | | `plugin-sdk/memory-core-host-engine-storage` | Exportaciones del motor de almacenamiento del host de memoria
  | | `plugin-sdk/memory-core-host-multimodal` | Ayudantes multimodales del host de memoria | | `plugin-sdk/memory-core-host-query` | Ayudantes de consulta del host de memoria | | `plugin-sdk/memory-core-host-secret` | Ayudantes de secretos del host de memoria | | `plugin-sdk/memory-core-host-events` | Alias de compatibilidad obsoleto; use `plugin-sdk/memory-host-events` | |
  `plugin-sdk/memory-core-host-status` | Ayudantes de estado del host de memoria | | `plugin-sdk/memory-core-host-runtime-cli` | Ayudantes de tiempo de ejecución de CLI del host de memoria | | `plugin-sdk/memory-core-host-runtime-core` | Ayudantes de tiempo de ejecución básicos del host de memoria | | `plugin-sdk/memory-core-host-runtime-files` | Ayudantes de archivo/tiempo de ejecución del host
  de memoria | | `plugin-sdk/memory-host-core` | Alias neutral al proveedor para los ayudantes de tiempo de ejecución básicos del host de memoria | | `plugin-sdk/memory-host-events` | Alias neutral al proveedor para los ayudantes del diario de eventos del host de memoria | | `plugin-sdk/memory-host-files` | Alias de compatibilidad obsoleto; use `plugin-sdk/memory-core-host-runtime-files` | |
  `plugin-sdk/memory-host-markdown` | Ayudantes compartidos de markdown administrado para complementos adyacentes a la memoria | | `plugin-sdk/memory-host-search` | Fachada de tiempo de ejecución de memoria activa para el acceso del administrador de búsqueda | | `plugin-sdk/memory-host-status` | Alias de compatibilidad obsoleto; use `plugin-sdk/memory-core-host-status` |
</Accordion>

  <Accordion title="Subrutas de asistentes agrupadas reservadas">
    Las subrutas del SDK de asistentes agrupadas reservadas son superficies específicas del propietario y estrechas para el código de complementos agrupados. Se rastrean en el inventario del SDK para que las compilaciones de paquetes y los alias sigan siendo deterministas, pero no son API generales para la creación de complementos. Los nuevos contratos de host reutilizables deben usar subrutas genéricas del SDK como `plugin-sdk/gateway-runtime`, `plugin-sdk/security-runtime` y `plugin-sdk/plugin-config-runtime`.

    | Subruta | Propietario y propósito |
    | --- | --- |
    | `plugin-sdk/codex-mcp-projection` | Asistente del complemento Codex agrupado para proyectar la configuración del servidor MCP del usuario en la configuración del hilo del servidor de aplicaciones Codex |
    | `plugin-sdk/codex-native-task-runtime` | Asistente del complemento Codex agrupado para reflejar los subagentes nativos del servidor de aplicaciones Codex en el estado de la tarea OpenClaw |

  </Accordion>
</AccordionGroup>

## Relacionado

- [Descripción general del SDK de complementos](/es/plugins/sdk-overview)
- [Configuración del SDK de complementos](/es/plugins/sdk-setup)
- [Creación de complementos](/es/plugins/building-plugins)
