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

Para la guía de creación de complementos, consulte [Plugin SDK overview](/es/plugins/sdk-overview).

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

Las subrutas obsoletas se siguen exportando para complementos antiguos, pero el código nuevo debe usar las
subrutas del SDK enfocadas a continuación. La lista mantenida es
`scripts/lib/plugin-sdk-deprecated-public-subpaths.json`; La CI rechaza las importaciones de producción
incluidas desde ella. Barriles amplios como `compat`, `config-types`,
`infra-runtime`, `text-runtime` y `zod` son solo de compatibilidad. Importe `zod`
directamente desde `zod`.

Las subrutas de auxiliares de pruebas con respaldo de Vitest de OpenClaw son solo locales del repositorio y ya no
son exportaciones de paquetes: `agent-runtime-test-contracts`,
`channel-contract-testing`, `channel-target-testing`, `channel-test-helpers`,
`plugin-test-api`, `plugin-test-contracts`, `plugin-test-runtime`,
`provider-http-test-mocks`, `provider-test-contracts`, `test-env`,
`test-fixtures`, `test-node-mocks` y `testing`.

### Subrutas de auxiliares de complementos incluidos reservadas

Estas subrutas son superficies de compatibilidad propiedad del complemento para su complemento incluido
propietario, no API de SDK generales: `plugin-sdk/codex-mcp-projection` y
`plugin-sdk/codex-native-task-runtime`. Las importaciones de extensión entre propietarios están bloqueadas
por las barreras de protección del contrato del paquete.

<AccordionGroup>
  <Accordion title="Subrutas de canal">
    | Subruta | Exportaciones clave |
    | --- | --- |
    | `plugin-sdk/channel-core` | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` |
    | `plugin-sdk/config-schema` | Exportación del esquema Zod de `openclaw.json` raíz (`OpenClawSchema`) |
    | `plugin-sdk/json-schema-runtime` | Ayudante de validación de esquema JSON en caché para esquemas propiedad del complemento |
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`, más `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` |
    | `plugin-sdk/setup` | Ayudantes compartidos del asistente de configuración, traductor de configuración, avisos de lista de permitidos, constructores de estado de configuración |
    | `plugin-sdk/setup-runtime` | `createSetupTranslator`, `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
    | `plugin-sdk/setup-adapter-runtime` | Alias de compatibilidad obsoleto; use `plugin-sdk/setup-runtime` |
    | `plugin-sdk/setup-tools` | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` |
    | `plugin-sdk/account-core` | Ayudantes de configuración/accionamiento de múltiples cuentas, ayudantes de reserva de cuenta predeterminada |
    | `plugin-sdk/account-id` | `DEFAULT_ACCOUNT_ID`, ayudantes de normalización de account-id |
    | `plugin-sdk/account-resolution` | Búsqueda de cuenta + ayudantes de reserva predeterminada |
    | `plugin-sdk/account-helpers` | Ayudantes específicos de lista de cuentas/acción de cuenta |
    | `plugin-sdk/access-groups` | Ayudantes de análisis de lista de permitidos de grupos de acceso y diagnósticos de grupos redactados |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | Fachada de compatibilidad obsoleta. Use `plugin-sdk/channel-outbound`. |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter`, `resolveChannelDmAccess`, `resolveChannelDmAllowFrom`, `resolveChannelDmPolicy`, `normalizeChannelDmPolicy`, `normalizeLegacyDmAliases` |
    | `plugin-sdk/channel-config-schema` | Primitivas de esquema de configuración de canal compartidas más constructores Zod y directos JSON/TypeBox |
    | `plugin-sdk/bundled-channel-config-schema` | Esquemas de configuración de canal OpenClaw empaquetados solo para complementos empaquetados mantenidos |
    | `plugin-sdk/chat-channel-ids` | `BUNDLED_CHAT_CHANNEL_IDS`, `BUNDLED_CHAT_CHANNEL_ENVELOPE_PREFIXES`, `ChatChannelId`. ID de canales de chat empaquetados/oficiales canónicos más etiquetas de formateador/alias para complementos que necesitan reconocer texto con prefijo de sobre sin codificar su propia tabla. |
    | `plugin-sdk/channel-config-schema-legacy` | Alias de compatibilidad obsoleto para esquemas de configuración de canal empaquetados |
    | `plugin-sdk/telegram-command-config` | Ayudantes de normalización/validación de comandos personalizados de Telegram con reserva de contrato empaquetado |
    | `plugin-sdk/command-gating` | Ayudantes específicos de compuerta de autorización de comandos |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-ingress` | Fachada de compatibilidad de entrada de canal de bajo nivel obsoleta. Las nuevas rutas de recepción deben usar `plugin-sdk/channel-ingress-runtime`. |
    | `plugin-sdk/channel-ingress-runtime` | Resolvedor de tiempo de ejecución de entrada de canal de alto nivel experimental y constructores de hechos de ruta para rutas de recepción de canal migradas. Preferir esto sobre el ensamblaje de listas de permitidas efectivas, listas de permitidas de comandos y proyecciones heredadas en cada complemento. Vea [Channel ingress API](/es/plugins/sdk-channel-ingress). |
    | `plugin-sdk/channel-lifecycle` | Fachada de compatibilidad obsoleta. Use `plugin-sdk/channel-outbound`. |
    | `plugin-sdk/channel-outbound` | Contratos del ciclo de vida del mensaje más opciones de canalización de respuesta, recibos, vista previa en vivo/transmisión, ayudantes del ciclo de vida, identidad saliente, planificación de carga útil, envíos duraderos y ayudantes de contexto de envío de mensajes. Vea [Channel outbound API](/es/plugins/sdk-channel-outbound). |
    | `plugin-sdk/channel-message` | Alias de compatibilidad obsoleto para `plugin-sdk/channel-outbound` más fachadas de despacho de respuesta heredadas. |
    | `plugin-sdk/channel-message-runtime` | Alias de compatibilidad obsoleto para `plugin-sdk/channel-outbound` más fachadas de despacho de respuesta heredadas. |
    | `plugin-sdk/inbound-envelope` | Ayudantes compartidos de ruta entrante + constructor de sobres |
    | `plugin-sdk/inbound-reply-dispatch` | Fachada de compatibilidad obsoleta. Use `plugin-sdk/channel-inbound` para ejecutores entrantes y predicados de despacho, y `plugin-sdk/channel-outbound` para ayudantes de entrega de mensajes. |
    | `plugin-sdk/messaging-targets` | Alias de análisis de destino obsoleto; use `plugin-sdk/channel-targets` |
    | `plugin-sdk/outbound-media` | Ayudantes compartidos de carga de medios salientes |
    | `plugin-sdk/outbound-send-deps` | Fachada de compatibilidad obsoleta. Use `plugin-sdk/channel-outbound`. |
    | `plugin-sdk/outbound-runtime` | Fachada de compatibilidad obsoleta. Use `plugin-sdk/channel-outbound`. |
    | `plugin-sdk/poll-runtime` | Ayudantes específicos de normalización de encuestas |
    | `plugin-sdk/thread-bindings-runtime` | Ayudantes del ciclo de vida y adaptador de enlace de hilos |
    | `plugin-sdk/agent-media-payload` | Constructor de carga de medios de agente heredado |
    | `plugin-sdk/conversation-runtime` | Ayudantes de vinculación, emparejamiento y vinculación configurada de conversación/hilos |
    | `plugin-sdk/runtime-config-snapshot` | Ayudante de instantánea de configuración en tiempo de ejecución |
    | `plugin-sdk/runtime-group-policy` | Ayudantes de resolución de políticas de grupo en tiempo de ejecución |
    | `plugin-sdk/channel-status` | Ayudantes compartidos de instantánea/resumen de estado del canal |
    | `plugin-sdk/channel-config-primitives` | Primitivas específicas de esquema de configuración de canal |
    | `plugin-sdk/channel-config-writes` | Ayudantes de autorización de escritura de configuración de canal |
    | `plugin-sdk/channel-plugin-common` | Exportaciones de preámbulo de complemento de canal compartidas |
    | `plugin-sdk/allowlist-config-edit` | Ayudantes de edición/lectura de configuración de lista de permitidos |
    | `plugin-sdk/group-access` | Ayudantes compartidos de decisiones de acceso a grupos |
    | `plugin-sdk/direct-dm`, `plugin-sdk/direct-dm-access` | Fachadas de compatibilidad obsoletas. Use `plugin-sdk/channel-inbound`. |
    | `plugin-sdk/direct-dm-guard-policy` | Ayudantes específicos de política de guardia previa a criptografía de MD directa |
    | `plugin-sdk/discord` | Fachada de compatibilidad obsoleta de Discord para `@openclaw/discord@2026.3.13` publicados y compatibilidad de propietario rastreada; los nuevos complementos deben usar subrutas de SDK de canal genéricas |
    | `plugin-sdk/telegram-account` | Fachada de compatibilidad obsoleta de resolución de cuenta de Telegram para compatibilidad de propietario rastreado; los nuevos complementos deben usar ayudantes de tiempo de ejecución inyectados o subrutas de SDK de canal genéricas |
    | `plugin-sdk/zalouser` | Fachada de compatibilidad obsoleta de Zalo Personal para paquetes Lark/Zalo publicados que aún importan la autorización de comandos del remitente; los nuevos complementos deben usar `plugin-sdk/command-auth` |
    | `plugin-sdk/interactive-runtime` | Presentación semántica de mensajes, entrega y ayudantes heredados de respuesta interactiva. Vea [Message Presentation](/es/plugins/message-presentation) |
    | `plugin-sdk/channel-inbound` | Ayudantes entrantes compartidos para clasificación de eventos, construcción de contexto, formato, raíces, rebote, coincidencia de menciones, política de menciones y registro entrante |
    | `plugin-sdk/channel-inbound-debounce` | Ayudantes específicos de rebote entrante |
    | `plugin-sdk/channel-mention-gating` | Ayudantes específicos de política de menciones, marcador de menciones y texto de menciones sin la superficie de tiempo de ejecución entrante más amplia |
    | `plugin-sdk/channel-envelope`, `plugin-sdk/channel-inbound-roots`, `plugin-sdk/channel-location`, `plugin-sdk/channel-logging` | Fachadas de compatibilidad obsoletas. Use `plugin-sdk/channel-inbound` o `plugin-sdk/channel-outbound`. |
    | `plugin-sdk/channel-pairing-paths` | Fachada de compatibilidad obsoleta. Use `plugin-sdk/channel-pairing`. |
    | `plugin-sdk/channel-reply-options-runtime` | Fachada de compatibilidad obsoleta. Use `plugin-sdk/channel-outbound`. |
    | `plugin-sdk/channel-streaming` | Fachada de compatibilidad obsoleta. Use `plugin-sdk/channel-outbound`. |
    | `plugin-sdk/channel-send-result` | Tipos de resultados de respuesta |
    | `plugin-sdk/channel-actions` | Ayudantes de acción de mensajes de canal, más ayudantes de esquema nativo obsoletos mantenidos para compatibilidad de complementos |
    | `plugin-sdk/channel-route` | Normalización de ruta compartida, resolución de destino impulsada por analizador, conversión de ID de hilo a cadena, claves de ruta desduplicadas/compactas, tipos de destino analizados y ayudantes de comparación de ruta/destino |
    | `plugin-sdk/channel-targets` | Ayudantes de análisis de destino; quienes llamen a la comparación de rutas deben usar `plugin-sdk/channel-route` |
    | `plugin-sdk/channel-contract` | Tipos de contrato de canal |
    | `plugin-sdk/channel-feedback` | Cableado de comentarios/reacciones |
    | `plugin-sdk/channel-secret-runtime` | Ayudantes específicos de contrato de secretos, como `collectSimpleChannelFieldAssignments`, `getChannelSurface`, `pushAssignment`, y tipos de destino de secretos |
  </Accordion>

Las familias de ayudantes de canal obsoletas permanecen disponibles solo para la compatibilidad de complementos publicados. El plan de eliminación es: mantenerlas durante la ventana de migración de complementos externos, mantener los complementos del repositorio/bundled en `channel-inbound` y `channel-outbound`, y luego eliminar las subrutas de compatibilidad en la próxima gran limpieza del SDK. Esto se aplica a las familias antiguas de message/runtime del canal, streaming del canal, acceso directo a DM, división de ayudantes entrantes, opciones de respuesta y ruta de emparejamiento.

<Accordion title="Rutas de subproveedores">
  | Ruta de subcarpeta | Exportaciones clave | | --- | --- | | `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry` | | `plugin-sdk/lmstudio` | Fachana de proveedor de LM Studio admitida para la configuración, el descubrimiento del catálogo y la preparación del modelo en tiempo de ejecución | | `plugin-sdk/lmstudio-runtime` | Fachana de tiempo de ejecución de LM Studio admitida para los
  valores predeterminados del servidor local, el descubrimiento de modelos, los encabezados de solicitud y los ayudantes de modelos cargados | | `plugin-sdk/provider-setup` | Ayudantes de configuración de proveedores locales/autohospedados curados | | `plugin-sdk/self-hosted-provider-setup` | Ayudantes de configuración de proveedores autohospedados compatibles con OpenAI | |
  `plugin-sdk/cli-backend` | Valores predeterminados del backend de la CLI + constantes de vigilancia | | `plugin-sdk/provider-auth-runtime` | Ayudantes de resolución de claves de API en tiempo de ejecución para complementos de proveedores | | `plugin-sdk/provider-oauth-runtime` | Tipos de devolución de llamada de OAuth genéricos del proveedor, representación de la página de devolución de llamada,
  ayudantes de PKCE/estado, análisis de entrada de autorización, ayudantes de expiración de token y ayudantes de interrupción | | `plugin-sdk/provider-auth-api-key` | Ayudantes de incorporación de claves de API/escritura de perfil, como `upsertApiKeyProfile` | | `plugin-sdk/provider-auth-result` | Generador de resultados de autenticación de OAuth estándar | | `plugin-sdk/provider-env-vars` |
  Ayudantes de búsqueda de variables de entorno de autenticación del proveedor | | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`, `ensureApiKeyFromOptionEnvOrPrompt`, `upsertAuthProfile`, `upsertApiKeyProfile`, `writeOAuthCredentials`, ayudantes de importación de autenticación de OpenAI Codex, exportación de compatibilidad `resolveOpenClawAgentDir` obsoleta | |
  `plugin-sdk/provider-model-shared` | `ProviderReplayFamily`, `buildProviderReplayFamilyHooks`, `normalizeModelCompat`, constructores de políticas de retransmisión compartidas, ayudantes de puntos finales del proveedor y ayudantes compartidos de normalización de ID de modelo | | `plugin-sdk/provider-catalog-runtime` | Gancho de tiempo de ejecución de aumento del catálogo del proveedor y costuras
  del registro del complemento del proveedor para pruebas de contrato | | `plugin-sdk/provider-catalog-shared` | `findCatalogTemplate`, `buildSingleProviderApiKeyCatalog`, `buildManifestModelProviderConfig`, `supportsNativeStreamingUsageCompat`, `applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-http` | Ayudantes de capacidades HTTP/punto final de proveedor genérico, errores HTTP
  del proveedor y ayudantes de formulario multiparte para transcripción de audio | | `plugin-sdk/provider-web-fetch-contract` | Ayudantes de contrato de configuración/selección de recuperación web limitados, como `enablePluginInConfig` y `WebFetchProviderPlugin` | | `plugin-sdk/provider-web-fetch` | Ayudantes de registro/caché del proveedor de recuperación web | |
  `plugin-sdk/provider-web-search-config-contract` | Ayudantes de configuración/credenciales de búsqueda web limitados para proveedores que no necesitan cableado de habilitación de complemento | | `plugin-sdk/provider-web-search-contract` | Ayudantes de contrato de configuración/credenciales de búsqueda web limitados, como `createWebSearchProviderContractFields`, `enablePluginInConfig`,
  `resolveProviderWebSearchPluginConfig` y definidores/obtenedores de credenciales con ámbito | | `plugin-sdk/provider-web-search` | Ayudantes de registro/caché/tiempo de ejecución del proveedor de búsqueda web | | `plugin-sdk/embedding-providers` | Tipos generales de proveedores de incrustación y ayudantes de lectura, incluidos `EmbeddingProviderAdapter`, `getEmbeddingProvider(...)` y
  `listEmbeddingProviders(...)`; los complementos registran proveedores a través de `api.registerEmbeddingProvider(...)` para que se haga cumplir la propiedad del manifiesto | | `plugin-sdk/provider-tools` | `ProviderToolCompatFamily`, `buildProviderToolCompatFamilyHooks` y limpieza de esquema DeepSeek/Gemini/OpenAI + diagnósticos | | `plugin-sdk/provider-usage` | Tipos de instantáneas de uso del
  proveedor, ayudantes compartidos de recuperación de uso y recuperadores del proveedor, como `fetchClaudeUsage` | | `plugin-sdk/provider-stream` | `ProviderStreamFamily`, `buildProviderStreamFamilyHooks`, `composeProviderStreamWrappers`, tipos de contenedor de transmisión, compatibilidad de llamadas a herramientas de texto sin formato y ayudantes compartidos de contenedor
  Anthropic/Bedrock/DeepSeek V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot | | `plugin-sdk/provider-stream-shared` | Ayudantes compartidos públicos de contenedor de transmisión del proveedor, incluidos `composeProviderStreamWrappers`, `createPlainTextToolCallCompatWrapper`, `createPayloadPatchStreamWrapper`, `createToolStreamWrapper` y utilidades de transmisión compatibles
  con Anthropic/DeepSeek/OpenAI | | `plugin-sdk/provider-transport-runtime` | Ayudantes de transporte de proveedor nativo, como recuperación protegida, transformaciones de mensajes de transporte y secuencias de eventos de transporte grabables | | `plugin-sdk/provider-onboard` | Ayudantes de parches de configuración de incorporación | | `plugin-sdk/global-singleton` | Ayudantes de
  singleton/mapa/caché local de proceso | | `plugin-sdk/group-activation` | Modo de activación de grupo limitado y ayudantes de análisis de comandos |
</Accordion>

Las instantáneas de uso del proveedor normalmente informan una o más cuotas `windows`, cada una con
una etiqueta, porcentaje usado y una hora de reinicio opcional. Los proveedores que expongan texto de saldo o
de estado de cuenta en lugar de ventanas de cuota reiniciables deben devolver
`summary` con un array `windows` vacío en lugar de fabricar porcentajes.
OpenClaw muestra ese texto de resumen en la salida de estado; use `error` solo cuando el
endpoint de uso falló o no devolvió datos de uso utilizables.

<Accordion title="Subrutas de autenticación y seguridad">
  | Subruta | Exportaciones clave | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate`, asistentes de registro de comandos que incluyen el formato dinámico del menú de argumentos, asistentes de autorización del remitente | | `plugin-sdk/command-status` | Constructores de mensajes de comandos/ayuda como `buildCommandsMessagePaginated` y `buildHelpMessage` | |
  `plugin-sdk/approval-auth-runtime` | Resolución del aprobador y asistentes de autorización de acciones del mismo chat | | `plugin-sdk/approval-client-runtime` | Asistentes de perfil/filtro de aprobación de ejecución nativa | | `plugin-sdk/approval-delivery-runtime` | Adaptadores de capacidad/entrega de aprobación nativa | | `plugin-sdk/approval-gateway-runtime` | Asistente compartido de
  resolución de puerta de enlace de aprobación | | `plugin-sdk/approval-handler-adapter-runtime` | Asistentes ligeros de carga de adaptadores de aprobación nativa para puntos de entrada de canal activo | | `plugin-sdk/approval-handler-runtime` | Asistentes de tiempo de ejecución más amplios del controlador de aprobación; prefiera las uniones de adaptador/puerta de enlace más estrechas cuando sean
  suficientes | | `plugin-sdk/approval-native-runtime` | Objetivo de aprobación nativa, vinculación de cuenta, puerta de ruta, respaldo de reenvío y asistentes de supresión de avisos de ejecución nativa local | | `plugin-sdk/approval-reaction-runtime` | Enlaces de reacción de aprobación codificados, cargas útiles de avisos de reacción, almacenes de objetivos de reacción y exportación de
  compatibilidad para la supresión de avisos de ejecución nativa local | | `plugin-sdk/approval-reply-runtime` | Asistentes de carga útil de respuesta de aprobación de ejecución/complemento | | `plugin-sdk/approval-runtime` | Asistentes de carga útil de aprobación de ejecución/complemento, asistentes de enrutamiento/tiempo de ejecución de aprobación nativa y asistentes de visualización de
  aprobación estructurada como `formatApprovalDisplayPath` | | `plugin-sdk/reply-dedupe` | Asistentes de restablecimiento de deduplicación de respuesta entrante estrecha | | `plugin-sdk/channel-contract-testing` | Asistentes de prueba de contrato de canal estrecho sin el barril de pruebas amplio | | `plugin-sdk/command-auth-native` | Autenticación de comando nativa, formato dinámico del menú de
  argumentos y asistentes de objetivo de sesión nativa | | `plugin-sdk/command-detection` | Asistentes compartidos de detección de comandos | | `plugin-sdk/command-primitives-runtime` | Predicados de texto de comando ligeros para rutas de canal activo | | `plugin-sdk/command-surface` | Normalización del cuerpo del comando y asistentes de superficie del comando | | `plugin-sdk/allow-from` |
  `formatAllowFromLowercase` | | `plugin-sdk/channel-secret-runtime` | Asistentes de colección de contratos de secretos estrechos para superficies de secretos de canal/complemento | | `plugin-sdk/secret-ref-runtime` | `coerceSecretRef` estrecho y asistentes de escritura SecretRef para el análisis de contratos de secretos/configuración | | `plugin-sdk/secret-provider-integration` | Manifiesto de
  integración de proveedor SecretRef solo de tipos y contratos preestablecidos para complementos que publican preestablecidos de proveedor de secretos externos | | `plugin-sdk/security-runtime` | Confianza compartida, filtrado de MD, asistentes de archivo/ruta limitados por raíz, que incluyen escrituras solo creación, reemplazo atómico de archivos síncrono/asíncrono, escrituras temporales
  hermanas, respaldo de movimiento entre dispositivos, asistentes de almacenamiento de archivos privados, protectores de padres de enlaces simbólicos, contenido externo, redacción de texto sensible, comparación de secretos de tiempo constante y asistentes de colección de secretos | | `plugin-sdk/ssrf-policy` | Asistentes de política SSRF de lista de permitidos de host y red privada | |
  `plugin-sdk/ssrf-dispatcher` | Asistentes de despachador anclado estrecho sin la superficie de tiempo de ejecución de infraestructura amplia | | `plugin-sdk/ssrf-runtime` | Despachador anclado, búsqueda protegida contra SSRF, error de SSRF y asistentes de política SSRF | | `plugin-sdk/secret-input` | Asistentes de análisis de entrada de secretos | | `plugin-sdk/webhook-ingress` | Asistentes de
  solicitud/objetivo de webhook y coacción de websocket/cuerpo sin procesar | | `plugin-sdk/webhook-request-guards` | Asistentes de tamaño/tiempo de espera del cuerpo de la solicitud |
</Accordion>

<Accordion title="Subrutas de tiempo de ejecución y almacenamiento">
  | Subruta | Exportaciones clave | | --- | --- | | `plugin-sdk/runtime` | Asistentes amplios de tiempo de ejecución/registro/copia de seguridad/instalación de complementos | | `plugin-sdk/runtime-env` | Asistentes estrechos de entorno de tiempo de ejecución, registrador, tiempo de espera, reintento y retroceso exponencial | | `plugin-sdk/browser-config` | Fachada de configuración de navegador
  compatible para perfiles/valores predeterminados normalizados, análisis de URL de CDP y asistentes de autenticación de control de navegador | | `plugin-sdk/agent-harness-task-runtime` | Asistentes genéricos de ciclo de vida de tareas y entrega de finalización para agentes respaldados por arnés utilizando un alcance de tarea emitido por el host | | `plugin-sdk/codex-mcp-projection` | Asistente
  reservado de Codex incluido para proyectar la configuración del servidor MCP del usuario en la configuración del hilo de Codex; no para complementos de terceros | | `plugin-sdk/codex-native-task-runtime` | Asistente privado de Codex incluido para la conexión cableada del espejo/tiempo de ejecución de la tarea nativa; no para complementos de terceros | | `plugin-sdk/channel-runtime-context` |
  Asistentes de registro y búsqueda de contexto de tiempo de ejecución de canal genérico | | `plugin-sdk/matrix` | Fachada de compatibilidad de Matrix obsoleta para paquetes de canal de terceros más antiguos; los nuevos complementos deben importar `plugin-sdk/run-command` directamente | | `plugin-sdk/mattermost` | Fachada de compatibilidad de Mattermost obsoleta para paquetes de canal de terceros
  más antiguos; los nuevos complementos deben importar subrutas genéricas del SDK directamente | | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | | `plugin-sdk/plugin-runtime` | Asistentes compartidos de comandos/enlaces HTTP/interactivos de complementos | | `plugin-sdk/hook-runtime` | Asistentes compartidos de canalización de webhooks/enlaces internos | | `plugin-sdk/lazy-runtime` |
  Asistentes de importación/vinculación de tiempo de ejecución diferida, como `createLazyRuntimeModule`, `createLazyRuntimeMethod` y `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | Asistentes de ejecución de procesos | | `plugin-sdk/cli-runtime` | Asistentes de formato CLI, espera, versión, invocación de argumentos y grupo de comandos diferido | |
  `plugin-sdk/qa-live-transport-scenarios` | Identificadores de escenario de QA de transporte en vivo compartidos, asistentes de cobertura de línea base y asistente de selección de escenario | | `plugin-sdk/gateway-method-runtime` | Asistente de despacho de método de Gateway reservado para rutas HTTP de complementos que declaran `contracts.gatewayMethodDispatch: ["authenticated-request"]` | |
  `plugin-sdk/gateway-runtime` | Cliente de Gateway, asistente de inicio de cliente listo para bucle de eventos, RPC CLI de Gateway, errores de protocolo de Gateway y asistentes de parches de estado del canal | | `plugin-sdk/config-contracts` | Superficie de configuración solo de tipos enfocada para formas de configuración de complementos, como `OpenClawConfig` y tipos de configuración de
  canal/proveedor | | `plugin-sdk/plugin-config-runtime` | Asistentes de búsqueda de configuración de complementos en tiempo de ejecución, como `requireRuntimeConfig`, `resolvePluginConfigObject` y `resolveLivePluginConfigObject` | | `plugin-sdk/config-mutation` | Asistentes de mutación de configuración transaccional, como `mutateConfigFile`, `replaceConfigFile` y `logConfigUpdated` | |
  `plugin-sdk/runtime-config-snapshot` | Asistentes de instantánea de configuración del proceso actual, como `getRuntimeConfig`, `getRuntimeConfigSnapshot` y definidores de instantáneas de prueba | | `plugin-sdk/telegram-command-config` | Normalización de nombre/descripción de comando de Telegram y verificaciones de duplicados/conflictos, incluso cuando la superficie del contrato de Telegram
  incluido no está disponible | | `plugin-sdk/text-autolink-runtime` | Detección de autovínculo de referencia de archivo sin el barril de texto amplio | | `plugin-sdk/approval-reaction-runtime` | Enlaces de reacción de aprobación codificados, cargas útiles de solicitud de reacción, almacenes de destino de reacción y exportación de compatibilidad para la supresión de solicitud de ejecución nativa
  local | | `plugin-sdk/approval-runtime` | Asistentes de aprobación de ejecución/complementos, constructores de capacidades de aprobación, asistentes de autenticación/perfil, asistentes de enrutamiento/tiempo de ejecución nativos y formato de ruta de visualización de aprobación estructurada | | `plugin-sdk/reply-runtime` | Asistentes compartidos de tiempo de ejecución de entrada/respuesta,
  fragmentación, despacho, latido y planificador de respuestas | | `plugin-sdk/reply-dispatch-runtime` | Asistentes estrechos de despacho/finalización de respuesta y etiquetas de conversación | | `plugin-sdk/reply-history` | Asistentes compartidos del historial de respuestas de ventana corta. El código nuevo de turno de mensaje debe usar `createChannelHistoryWindow`; los asistentes de mapa de
  nivel inferior permanecen solo como exportaciones de compatibilidad obsoletas | | `plugin-sdk/reply-reference` | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | Asistentes estrechos de fragmentación de texto/markdown | | `plugin-sdk/session-store-runtime` | Asistentes de flujo de trabajo de sesión (`getSessionEntry`, `listSessionEntries`, `patchSessionEntry`,
  `upsertSessionEntry`), asistentes de ruta de almacenamiento de sesión/clave de sesión heredados, lecturas de actualización y asistentes de mutación de almacenamiento completo obsoletos | | `plugin-sdk/cron-store-runtime` | Asistentes de ruta/carga/guardado de almacenamiento Cron | | `plugin-sdk/state-paths` | Asistentes de ruta de directorio de estado/OAuth | | `plugin-sdk/plugin-state-runtime`
  | Tipos de estado con clave de sidecar SQLite de complemento | | `plugin-sdk/routing` | Asistentes de vinculación de ruta de sesión/clave de ruta/cuenta, como `resolveAgentRoute`, `buildAgentSessionKey` y `resolveDefaultAgentBoundAccountId` | | `plugin-sdk/status-helpers` | Asistentes compartidos de resumen de estado de canal/cuenta, valores predeterminados de estado de tiempo de ejecución y
  asistentes de metadatos de problemas | | `plugin-sdk/target-resolver-runtime` | Asistentes compartidos de resolución de objetivos | | `plugin-sdk/string-normalization-runtime` | Asistentes de normalización de slug/cadena | | `plugin-sdk/request-url` | Extraer URL de cadena de entradas similares a fetch/request | | `plugin-sdk/run-command` | Ejecutor de comandos cronometrado con resultados
  normalizados de stdout/stderr | | `plugin-sdk/param-readers` | Lectores comunes de parámetros de herramienta/CLI | | `plugin-sdk/tool-plugin` | Definir un complemento de herramienta de agente tipado simple y exponer metadatos estáticos para la generación de manifiestos | | `plugin-sdk/tool-payload` | Extraer cargas útiles normalizadas de objetos de resultados de herramientas | |
  `plugin-sdk/tool-send` | Extraer campos de destino de envío canónicos de argumentos de herramienta | | `plugin-sdk/sandbox` | Tipos de backend de espacio aislado y asistentes de comandos SSH/OpenShell, incluido el prevuelo rápido de comandos de ejecución | | `plugin-sdk/temp-path` | Asistentes compartidos de ruta de descarga temporal y espacios de trabajo temporales privados y seguros | |
  `plugin-sdk/logging-core` | Asistentes de registrador y redacción de subsistemas | | `plugin-sdk/markdown-table-runtime` | Asistentes de modo y conversión de tablas Markdown | | `plugin-sdk/model-session-runtime` | Asistentes de anulación de modelo/sesión, como `applyModelOverrideToSessionEntry` y `resolveAgentMaxConcurrent` | | `plugin-sdk/talk-config-runtime` | Asistentes de resolución de
  configuración de proveedor Talk | | `plugin-sdk/json-store` | Asistentes pequeños de lectura/escritura de estado JSON | | `plugin-sdk/json-unsafe-integers` | Asistentes de análisis JSON que preservan literales de enteros no seguros como cadenas | | `plugin-sdk/file-lock` | Asistentes de bloqueo de archivo reentrante | | `plugin-sdk/persistent-dedupe` | Asistentes de caché de deduplicación
  respaldada en disco | | `plugin-sdk/acp-runtime` | Asistentes de tiempo de ejecución/sesión ACP y despacho de respuestas | | `plugin-sdk/acp-runtime-backend` | Asistentes ligeros de registro de backend ACP y despacho de respuestas para complementos cargados al inicio | | `plugin-sdk/acp-binding-resolve-runtime` | Resolución de vinculación ACP de solo lectura sin importaciones de inicio del ciclo
  de vida | | `plugin-sdk/agent-config-primitives` | Primitivas estrechas de esquema de configuración de tiempo de ejecución de agente | | `plugin-sdk/boolean-param` | Lector suelto de parámetros booleanos | | `plugin-sdk/dangerous-name-runtime` | Asistentes de resolución de coincidencia de nombres peligrosos | | `plugin-sdk/device-bootstrap` | Asistentes de token de emparejamiento y arranque de
  dispositivo | | `plugin-sdk/extension-shared` | Primitivas de asistente compartidas de canal pasivo, estado y proxy ambiental | | `plugin-sdk/models-provider-runtime` | Asistentes de respuesta de comando/proveedor `/models` | | `plugin-sdk/skill-commands-runtime` | Asistentes de listado de comandos de habilidades | | `plugin-sdk/native-command-registry` | Asistentes de
  registro/construcción/serialización de comandos nativos | | `plugin-sdk/agent-harness` | Superficie experimental de complemento de confianza para arneses de agentes de bajo nivel: tipos de arnés, asistentes de dirección/aborto de ejecución activa, asistentes de puente de herramientas OpenClaw, asistentes de política de herramientas de plan de tiempo de ejecución, clasificación de resultados
  terminales, asistentes de formato/detalle de progreso de herramientas y utilidades de resultados de intentos | | `plugin-sdk/provider-zai-endpoint` | Fachada obsoleta de detección de endpoint propiedad del proveedor Z.AI; use la API pública del complemento Z.AI | | `plugin-sdk/async-lock-runtime` | Asistente de bloqueo asíncrono local de proceso para pequeños archivos de estado de tiempo de
  ejecución | | `plugin-sdk/channel-activity-runtime` | Asistente de telemetría de actividad del canal | | `plugin-sdk/concurrency-runtime` | Asistente de concurrencia de tareas asíncronas limitadas | | `plugin-sdk/dedupe-runtime` | Asistentes de caché de deduplicación en memoria | | `plugin-sdk/delivery-queue-runtime` | Asistente de drenaje de entrega pendiente saliente | |
  `plugin-sdk/file-access-runtime` | Asistentes seguros de ruta de archivo local y fuente de medios | | `plugin-sdk/heartbeat-runtime` | Asistentes de activación, evento y visibilidad de latido | | `plugin-sdk/number-runtime` | Asistente de coerción numérica | | `plugin-sdk/secure-random-runtime` | Asistentes de token/UUID seguros | | `plugin-sdk/system-event-runtime` | Asistentes de cola de
  eventos del sistema | | `plugin-sdk/transport-ready-runtime` | Asistente de espera de preparación del transporte | | `plugin-sdk/exec-approvals-runtime` | Asistentes de archivo de política de aprobación de ejecución sin el barril amplio de tiempo de ejecución de infraestructura | | `plugin-sdk/infra-runtime` | Shim de compatibilidad obsoleto; use las subrutas de tiempo de ejecución enfocadas
  arriba | | `plugin-sdk/collection-runtime` | Asistentes pequeños de caché limitada | | `plugin-sdk/diagnostic-runtime` | Asistentes de indicador de diagnóstico, evento y contexto de seguimiento | | `plugin-sdk/error-runtime` | Gráfico de errores, formato, asistentes compartidos de clasificación de errores, `isApprovalNotFoundError` | | `plugin-sdk/fetch-runtime` | Fetch envuelto, proxy, opción
  EnvHttpProxyAgent y asistentes de búsqueda fijada | | `plugin-sdk/runtime-fetch` | Fetch de tiempo de ejecución consciente del despachador sin importaciones de proxy/guarded-fetch | | `plugin-sdk/inline-image-data-url-runtime` | Asistentes de saneador de URL de datos de imagen en línea y detección de firmas sin la superficie amplia de tiempo de ejecución de medios | |
  `plugin-sdk/response-limit-runtime` | Lector de cuerpo de respuesta limitado sin la superficie amplia de tiempo de ejecución de medios | | `plugin-sdk/session-binding-runtime` | Estado de vinculación de conversación actual sin enrutamiento de vinculación configurado o almacenes de emparejamiento | | `plugin-sdk/session-store-runtime` | Asistentes de almacenamiento de sesión sin importaciones de
  escritura/mantenimiento de configuración amplia | | `plugin-sdk/context-visibility-runtime` | Resolución de visibilidad de contexto y filtrado de contexto suplementario sin importaciones de configuración/seguridad amplias | | `plugin-sdk/string-coerce-runtime` | Asistentes estrechos de coerción/normalización de registro/cadena primitiva sin importaciones de markdown/registro | |
  `plugin-sdk/host-runtime` | Asistentes de normalización de nombre de host y host SCP | | `plugin-sdk/retry-runtime` | Asistentes de configuración de reintento y ejecutor de reintento | | `plugin-sdk/agent-runtime` | Asistentes de directorio/identidad/espacio de trabajo del agente, incluidos `resolveAgentDir`, `resolveDefaultAgentDir` y la exportación de compatibilidad `resolveOpenClawAgentDir`
  obsoleta | | `plugin-sdk/directory-runtime` | Consulta/deduplicación de directorio respaldada por configuración | | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

<Accordion title="Subrutas de capacidad y pruebas">
  | Subruta | Exportaciones clave | | --- | --- | | `plugin-sdk/media-runtime` | Asistentes compartidos de obtención/transformación/almacenamiento de medios, incluyendo `saveRemoteMedia`, `saveResponseMedia`, `readRemoteMediaBuffer` y el obsoleto `fetchRemoteMedia`; se prefieren los asistentes de almacenamiento antes de las lecturas de búfer cuando una URL debe convertirse en un medio de OpenClaw
  | | `plugin-sdk/media-mime` | Normalización MIME estrecha, mapeo de extensión de archivo, detección MIME y asistentes de tipo de medio | | `plugin-sdk/media-store` | Asistentes estrechos de almacenamiento de medios, como `saveMediaBuffer` y `saveMediaStream` | | `plugin-sdk/media-generation-runtime` | Asistentes compartidos de conmutación por error de generación de medios, selección de
  candidatos y mensajería de modelos faltantes | | `plugin-sdk/media-understanding` | Tipos de proveedor de comprensión de medios más exportaciones de asistentes de extracción estructurada de imagen/audio orientadas al proveedor | | `plugin-sdk/text-chunking` | Asistentes de fragmentación/renderizado de texto y markdown, conversión de tablas markdown, eliminación de etiquetas de directivas y
  utilidades de texto seguro | | `plugin-sdk/text-chunking` | Asistente de fragmentación de texto de salida | | `plugin-sdk/speech` | Tipos de proveedor de voz más exportaciones de asistentes de directiva, registro, validación, constructor TTS compatible con OpenAI y asistentes de voz orientados al proveedor | | `plugin-sdk/speech-core` | Tipos compartidos de proveedor de voz, registro, directiva,
  normalización y exportaciones de asistentes de voz | | `plugin-sdk/realtime-transcription` | Tipos de proveedor de transcripción en tiempo real, asistentes de registro y asistente compartido de sesión WebSocket | | `plugin-sdk/realtime-bootstrap-context` | Asistente de arranque de perfil en tiempo real para inyección de contexto acotada `IDENTITY.md`, `USER.md` y `SOUL.md` | |
  `plugin-sdk/realtime-voice` | Tipos de proveedor de voz en tiempo real, asistentes de registro y asistentes compartidos de comportamiento de voz en tiempo real, incluido el seguimiento de la actividad de salida | | `plugin-sdk/image-generation` | Tipos de proveedor de generación de imágenes más asistentes de URL de datos/activos de imágenes y el constructor de proveedor de imágenes compatible
  con OpenAI | | `plugin-sdk/image-generation-core` | Tipos compartidos de generación de imágenes, asistentes de conmutación por error, autenticación y registro | | `plugin-sdk/music-generation` | Tipos de proveedor/solicitud/resultado de generación de música | | `plugin-sdk/music-generation-core` | Tipos compartidos de generación de música, asistentes de conmutación por error, búsqueda de
  proveedor y análisis de referencia de modelo | | `plugin-sdk/video-generation` | Tipos de proveedor/solicitud/resultado de generación de video | | `plugin-sdk/video-generation-core` | Tipos compartidos de generación de video, asistentes de conmutación por error, búsqueda de proveedor y análisis de referencia de modelo | | `plugin-sdk/transcripts` | Tipos compartidos de proveedor de fuente de
  transcripciones, asistentes de registro, descriptores de sesión y metadatos de enunciado | | `plugin-sdk/webhook-targets` | Registro de destino de webhook y asistentes de instalación de rutas | | `plugin-sdk/webhook-path` | Alias de compatibilidad obsoleto; use `plugin-sdk/webhook-ingress` | | `plugin-sdk/web-media` | Asistentes compartidos de carga de medios remotos/locales | | `plugin-sdk/zod`
  | Reexportación de compatibilidad obsoleta; importe `zod` directamente desde `zod` | | `plugin-sdk/testing` | Contenedor de compatibilidad obsoleto local del repositorio para pruebas heredadas de OpenClaw. Las nuevas pruebas del repositorio deben importar subrutas de prueba local enfocadas, como `plugin-sdk/agent-runtime-test-contracts`, `plugin-sdk/plugin-test-runtime`,
  `plugin-sdk/channel-test-helpers`, `plugin-sdk/test-env` o `plugin-sdk/test-fixtures`, en su lugar | | `plugin-sdk/plugin-test-api` | Asistente `createTestPluginApi` mínimo local del repositorio para pruebas unitarias de registro directo de complementos sin importar puentes de asistentes de prueba del repositorio | | `plugin-sdk/agent-runtime-test-contracts` | Accesorios de contrato de adaptador
  de tiempo de ejecución de agente nativo local del repositorio para pruebas de autenticación, entrega, conmutación por error, enlace de herramientas, superposición de mensajes, esquema y proyección de transcripciones | | `plugin-sdk/channel-test-helpers` | Asistentes de prueba orientados al canal locales del repositorio para contratos genéricos de acciones/configuración/estado, aserciones de
  directorio, ciclo de vida de inicio de cuenta, subprocesos de configuración de envío, simulacros de tiempo de ejecución, problemas de estado, entrega saliente y registro de enlaces | | `plugin-sdk/channel-target-testing` | Suite compartida de casos de error de resolución de objetivos local del repositorio para pruebas de canal | | `plugin-sdk/plugin-test-contracts` | Asistentes de contrato de
  paquete de complementos, registro, artefactos públicos, importación directa, API de tiempo de ejecución y efectos secundarios de importación locales del repositorio | | `plugin-sdk/provider-test-contracts` | Asistentes de contrato de tiempo de ejecución de proveedor, autenticación, descubrimiento, incorporación, catálogo, asistente, capacidad de medios, política de repetición, audio en vivo STT
  en tiempo real, búsqueda/obención web y flujo local del repositorio | | `plugin-sdk/provider-http-test-mocks` | Simulacros opcionales de HTTP/autenticación de Vitest locales del repositorio para pruebas de proveedor que ejercen `plugin-sdk/provider-http` | | `plugin-sdk/test-fixtures` | Accesorios de captura de tiempo de ejecución de CLI genérica, contexto de sandbox, escritor de habilidades,
  mensaje de agente, evento del sistema, recarga de módulos, ruta de complemento empaquetado, texto de terminal, fragmentación, token de autenticación y caso tipado local del repositorio | | `plugin-sdk/test-node-mocks` | Asistentes de simulación concentrados de integrados de Node locales del repositorio para usar dentro de fábricas `vi.mock("node:*")` de Vitest |
</Accordion>

<Accordion title="Subrutas de memoria">
  | Subruta | Exportaciones clave | | --- | --- | | `plugin-sdk/memory-core` | Superficie de ayuda de memory-core incluida para ayudantes de administrador/configuración/archivo/CLI | | `plugin-sdk/memory-core-engine-runtime` | Fachada de tiempo de ejecución de índice/búsqueda de memoria | | `plugin-sdk/memory-core-host-embedding-registry` | Ayudantes de registro de proveedor de incrustación de
  memoria ligera | | `plugin-sdk/memory-core-host-engine-foundation` | Exportaciones del motor de base del host de memoria | | `plugin-sdk/memory-core-host-engine-embeddings` | Contratos de incrustación del host de memoria, acceso al registro, proveedor local y ayudantes genéricos de proceso remoto/lote. `registerMemoryEmbeddingProvider` en esta superficie está obsoleto; use la API de proveedor de
  incrustación genérico para nuevos proveedores. | | `plugin-sdk/memory-core-host-engine-qmd` | Exportaciones del motor QMD del host de memoria | | `plugin-sdk/memory-core-host-engine-storage` | Exportaciones del motor de almacenamiento del host de memoria | | `plugin-sdk/memory-core-host-multimodal` | Ayudantes multimodales del host de memoria | | `plugin-sdk/memory-core-host-query` | Ayudantes
  de consulta del host de memoria | | `plugin-sdk/memory-core-host-secret` | Ayudantes de secretos del host de memoria | | `plugin-sdk/memory-core-host-events` | Alias de compatibilidad obsoleto; use `plugin-sdk/memory-host-events` | | `plugin-sdk/memory-core-host-status` | Ayudantes de estado del host de memoria | | `plugin-sdk/memory-core-host-runtime-cli` | Ayudantes de tiempo de ejecución de
  CLI del host de memoria | | `plugin-sdk/memory-core-host-runtime-core` | Ayudantes de tiempo de ejecución central del host de memoria | | `plugin-sdk/memory-core-host-runtime-files` | Ayudantes de archivo/tiempo de ejecución del host de memoria | | `plugin-sdk/memory-host-core` | Alias neutral al proveedor para los ayudantes de tiempo de ejecución central del host de memoria | |
  `plugin-sdk/memory-host-events` | Alias neutral al proveedor para los ayudantes del diario de eventos del host de memoria | | `plugin-sdk/memory-host-files` | Alias de compatibilidad obsoleto; use `plugin-sdk/memory-core-host-runtime-files` | | `plugin-sdk/memory-host-markdown` | Ayudantes de markdown administrados compartidos para complementos adyacentes a la memoria | |
  `plugin-sdk/memory-host-search` | Fachada de tiempo de ejecución de memoria activa para el acceso del administrador de búsqueda | | `plugin-sdk/memory-host-status` | Alias de compatibilidad obsoleto; use `plugin-sdk/memory-core-host-status` |
</Accordion>

  <Accordion title="Subrutas de ayudantes agrupados reservadas">
    Las subrutas del SDK de ayudantes agrupados reservados son superficies específicas del propietario y estrechas para el código de complementos agrupados. Se rastrean en el inventario del SDK para que las compilaciones de paquetes y los alias sigan siendo deterministas, pero no son API generales de creación de complementos. Los nuevos contratos de host reutilizables deben usar subrutas genéricas del SDK como `plugin-sdk/gateway-runtime`, `plugin-sdk/security-runtime` y `plugin-sdk/plugin-config-runtime`.

    | Subruta | Propietario y propósito |
    | --- | --- |
    | `plugin-sdk/codex-mcp-projection` | Ayudante del complemento Codex agrupado para proyectar la configuración del servidor MCP del usuario en la configuración del hilo del servidor de aplicaciones Codex |
    | `plugin-sdk/codex-native-task-runtime` | Ayudante del complemento Codex agrupado para reflejar los subagentes nativos del servidor de aplicaciones Codex en el estado de la tarea OpenClaw |

  </Accordion>
</AccordionGroup>

## Relacionado

- [Descripción general del SDK de complementos](/es/plugins/sdk-overview)
- [Configuración del SDK de complementos](/es/plugins/sdk-setup)
- [Compilación de complementos](/es/plugins/building-plugins)
