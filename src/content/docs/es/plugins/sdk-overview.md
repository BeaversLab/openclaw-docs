---
title: "Plugin SDK Overview"
sidebarTitle: "Resumen del SDK"
summary: "Mapa de importación, referencia de la API de registro y arquitectura del SDK"
read_when:
  - You need to know which SDK subpath to import from
  - You want a reference for all registration methods on OpenClawPluginApi
  - You are looking up a specific SDK export
---

# Resumen del SDK de complementos

El SDK de complementos es el contrato con tipo entre los complementos y el núcleo. Esta página es la
referencia de **qué importar** y **qué puede registrar**.

<Tip>**¿Buscas una guía de inicio?** - ¿Primer plugin? Empieza con [Getting Started](/en/plugins/building-plugins) - ¿Plugin de canal? Consulta [Channel Plugins](/en/plugins/sdk-channel-plugins) - ¿Plugin de proveedor? Consulta [Provider Plugins](/en/plugins/sdk-provider-plugins)</Tip>

## Convención de importación

Importa siempre desde una subruta específica:

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";
```

Cada subruta es un módulo pequeño y autónomo. Esto mantiene el inicio rápido y
evita problemas de dependencia circular. Para asistentes de entrada/construcción
canales específicos, prefiere `openclaw/plugin-sdk/channel-core`; mantén `openclaw/plugin-sdk/core` para
la superficie paraguas más amplia y asistentes compartidos como
`buildChannelConfigSchema`.

No agregues ni dependas de uniones de conveniencia nombradas por el proveedor tales como
`openclaw/plugin-sdk/slack`, `openclaw/plugin-sdk/discord`,
`openclaw/plugin-sdk/signal`, `openclaw/plugin-sdk/whatsapp`, o
uniones de asistentes con marca de canal. Los complementos empaquetados deben componer
subrutas genéricas del SDK dentro de sus propios contenedores `api.ts` o `runtime-api.ts`, y el núcleo
debe usar esos contenedores locales del complemento o agregar un contrato genérico y estrecho del SDK
cuando la necesidad sea verdaderamente entre canales.

El mapa de exportación generado todavía contiene un pequeño conjunto de uniones de asistentes
de complementos empaquetados tales como `plugin-sdk/feishu`, `plugin-sdk/feishu-setup`,
`plugin-sdk/zalo`, `plugin-sdk/zalo-setup`, y `plugin-sdk/matrix*`. Esas
subrutas existen solo para el mantenimiento y la compatibilidad de los complementos empaquetados; se
omitieron intencionalmente de la tabla común a continuación y no son la ruta de importación
recomendada para nuevos complementos de terceros.

## Referencia de subruta

Las subrutas más utilizadas, agrupadas por propósito. La lista completa generada de
más de 200 subrutas se encuentra en `scripts/lib/plugin-sdk-entrypoints.json`.

Las subrutas de asistentes de complementos empaquetados reservadas todavía aparecen en esa lista generada.
Trátalas como detalles de implementación/superficies de compatibilidad a menos que una página de documentación
promocione explícitamente una como pública.

### Entrada de complemento

| Subruta                     | Exportaciones clave                                                                                                                    |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/plugin-entry`   | `definePluginEntry`                                                                                                                    |
| `plugin-sdk/core`           | `defineChannelPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase`, `defineSetupPluginEntry`, `buildChannelConfigSchema` |
| `plugin-sdk/config-schema`  | `OpenClawSchema`                                                                                                                       |
| `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry`                                                                                                      |

<AccordionGroup>
  <Accordion title="Subrutas del canal">
    | Subruta | Exportaciones clave |
    | --- | --- |
    | `plugin-sdk/channel-core` | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` |
    | `plugin-sdk/config-schema` | Exportación del esquema Zod `openclaw.json` raíz (`OpenClawSchema`) |
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`, más `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` |
    | `plugin-sdk/setup` | Ayudantes del asistente de configuración compartida, mensajes de lista de permitidos, constructores de estado de configuración |
    | `plugin-sdk/setup-runtime` | `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
    | `plugin-sdk/setup-adapter-runtime` | `createEnvPatchedAccountSetupAdapter` |
    | `plugin-sdk/setup-tools` | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` |
    | `plugin-sdk/account-core` | Ayudantes de configuración/acción de puerta multicuenta, ayudantes de reserva de cuenta predeterminada |
    | `plugin-sdk/account-id` | `DEFAULT_ACCOUNT_ID`, ayudantes de normalización de id de cuenta |
    | `plugin-sdk/account-resolution` | Búsqueda de cuenta + ayudantes de reserva predeterminada |
    | `plugin-sdk/account-helpers` | Ayudantes de lista de cuenta/acción de cuenta estrecha |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | `createChannelReplyPipeline` |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter` |
    | `plugin-sdk/channel-config-schema` | Tipos de esquema de configuración del canal |
    | `plugin-sdk/telegram-command-config` | Ayudantes de normalización/validación de comandos personalizados de Telegram con reserva de contrato empaquetado |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-lifecycle` | `createAccountStatusSink` |
    | `plugin-sdk/inbound-envelope` | Ayudantes compartidos de ruta entrante + constructor de sobre |
    | `plugin-sdk/inbound-reply-dispatch` | Ayudantes compartidos de registro y envío entrantes |
    | `plugin-sdk/messaging-targets` | Ayudantes de análisis/coincidencia de objetivos |
    | `plugin-sdk/outbound-media` | Ayudantes compartidos de carga de medios salientes |
    | `plugin-sdk/outbound-runtime` | Ayudantes de delegación de identidad/envío saliente |
    | `plugin-sdk/thread-bindings-runtime` | Ciclo de vida de vinculación de hilos y ayudantes de adaptador |
    | `plugin-sdk/agent-media-payload` | Constructor de carga de medios de agente heredado |
    | `plugin-sdk/conversation-runtime` | Vinculación de conversación/hilo, emparejamiento y ayudantes de vinculación configurada |
    | `plugin-sdk/runtime-config-snapshot` | Ayudante de instantánea de configuración en tiempo de ejecución |
    | `plugin-sdk/runtime-group-policy` | Ayudantes de resolución de políticas de grupo en tiempo de ejecución |
    | `plugin-sdk/channel-status` | Ayudantes compartidos de instantánea/resumen de estado del canal |
    | `plugin-sdk/channel-config-primitives` | Primitivas de esquema de configuración de canal estrecho |
    | `plugin-sdk/channel-config-writes` | Ayudantes de autorización de escritura de configuración del canal |
    | `plugin-sdk/channel-plugin-common` | Exportaciones preliminares compartidas de complementos de canal |
    | `plugin-sdk/allowlist-config-edit` | Ayudantes de edición/lectura de configuración de lista de permitidos |
    | `plugin-sdk/group-access` | Ayudantes compartidos de decisiones de acceso de grupo |
    | `plugin-sdk/direct-dm` | Ayudantes compartidos de autenticación/guardia de DM directo |
    | `plugin-sdk/interactive-runtime` | Ayudantes de normalización/reducción de carga útil de respuesta interactiva |
    | `plugin-sdk/channel-inbound` | Desaceleración entrante, coincidencia de mención, ayudantes de política de mención y ayudantes de sobre |
    | `plugin-sdk/channel-send-result` | Tipos de resultados de respuesta |
    | `plugin-sdk/channel-actions` | `createMessageToolButtonsSchema`, `createMessageToolCardSchema` |
    | `plugin-sdk/channel-targets` | Ayudantes de análisis/coincidencia de objetivos |
    | `plugin-sdk/channel-contract` | Tipos de contrato del canal |
    | `plugin-sdk/channel-feedback` | Cableado de comentarios/reacciones |
    | `plugin-sdk/channel-secret-runtime` | Ayudantes de contrato secreto estrecho como `collectSimpleChannelFieldAssignments`, `getChannelSurface`, `pushAssignment` y tipos de objetivos secretos |
  </Accordion>

<Accordion title="Subrutas de proveedor">
  | Subruta | Exportaciones clave | | --- | --- | | `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry` | | `plugin-sdk/provider-setup` | Asistentes de configuración local/autohospedada curada para proveedores | | `plugin-sdk/self-hosted-provider-setup` | Asistentes de configuración autohospedada para proveedores compatibles con OpenAI | | `plugin-sdk/cli-backend` | Valores
  predeterminados del backend de CLI + constantes de watchdog | | `plugin-sdk/provider-auth-runtime` | Asistentes de resolución de claves API en tiempo de ejecución para complementos de proveedor | | `plugin-sdk/provider-auth-api-key` | Asistentes de incorporación de clave API/escritura de perfil, como `upsertApiKeyProfile` | | `plugin-sdk/provider-auth-result` | Constructor de resultados de
  autenticación OAuth estándar | | `plugin-sdk/provider-auth-login` | Asistentes de inicio de sesión interactivo compartidos para complementos de proveedor | | `plugin-sdk/provider-env-vars` | Asistentes de búsqueda de variables de entorno de autenticación del proveedor | | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`, `ensureApiKeyFromOptionEnvOrPrompt`, `upsertAuthProfile`,
  `upsertApiKeyProfile`, `writeOAuthCredentials` | | `plugin-sdk/provider-model-shared` | `ProviderReplayFamily`, `buildProviderReplayFamilyHooks`, `normalizeModelCompat`, constructores de políticas de retransmisión compartidas, asistentes de endpoint de proveedor y asistentes de normalización de ID de modelo, como `normalizeNativeXaiModelId` | | `plugin-sdk/provider-catalog-shared` |
  `findCatalogTemplate`, `buildSingleProviderApiKeyCatalog`, `supportsNativeStreamingUsageCompat`, `applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-http` | Asistentes de capacidades HTTP/endpoint genéricas de proveedor | | `plugin-sdk/provider-web-fetch-contract` | Asistentes de contrato de configuración/selección de obtención web específica, como `enablePluginInConfig` y
  `WebFetchProviderPlugin` | | `plugin-sdk/provider-web-fetch` | Asistentes de registro/caché de proveedor de obtención web | | `plugin-sdk/provider-web-search-config-contract` | Asistentes de configuración/credenciales de búsqueda web específica para proveedores que no necesitan cableado de habilitación de complemento | | `plugin-sdk/provider-web-search-contract` | Asistentes de contrato de
  configuración/credenciales de búsqueda web específica, como `createWebSearchProviderContractFields`, `enablePluginInConfig`, `resolveProviderWebSearchPluginConfig`, y establecedores/obtenedores de credenciales con ámbito | | `plugin-sdk/provider-web-search` | Asistentes de registro/caché/tiempo de ejecución de proveedor de búsqueda web | | `plugin-sdk/provider-tools` |
  `ProviderToolCompatFamily`, `buildProviderToolCompatFamilyHooks`, limpieza de esquemas de Gemini + diagnósticos, y asistentes de compatibilidad con xAI, como `resolveXaiModelCompatPatch` / `applyXaiModelCompat` | | `plugin-sdk/provider-usage` | `fetchClaudeUsage` y similares | | `plugin-sdk/provider-stream` | `ProviderStreamFamily`, `buildProviderStreamFamilyHooks`,
  `composeProviderStreamWrappers`, tipos de contenedor de flujo, y asistentes de contenedor compartidos para Anthropic/Bedrock/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot | | `plugin-sdk/provider-onboard` | Asistentes de parche de configuración de incorporación | | `plugin-sdk/global-singleton` | Asistentes de singleton/mapa/caché locales de proceso |
</Accordion>

<Accordion title="Subrutas de autenticación y seguridad">
  | Subruta | Exportaciones clave | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate`, asistentes del registro de comandos, asistentes de autorización del remitente | | `plugin-sdk/command-status` | Constructores de mensajes de comandos/ayuda como `buildCommandsMessagePaginated` y `buildHelpMessage` | | `plugin-sdk/approval-auth-runtime` | Resolución del aprobador y
  asistentes de autenticación de acciones en el mismo chat | | `plugin-sdk/approval-client-runtime` | Asistentes de perfil/filtro de aprobación de ejecución nativa | | `plugin-sdk/approval-delivery-runtime` | Adaptadores de capacidad/entrega de aprobación nativa | | `plugin-sdk/approval-gateway-runtime` | Asistente compartido de resolución de puerta de enlace de aprobación | |
  `plugin-sdk/approval-handler-adapter-runtime` | Asistentes de carga de adaptadores de aprobación nativa ligeros para puntos de entrada de canal en vivo | | `plugin-sdk/approval-handler-runtime` | Asistentes de tiempo de ejecución del controlador de aprobación más amplios; prefiera las costuras de adaptador/puerta de enlace más estrechas cuando sean suficientes | |
  `plugin-sdk/approval-native-runtime` | Asistentes de objetivo de aprobación nativa + vinculación de cuenta | | `plugin-sdk/approval-reply-runtime` | Asistentes de carga útil de respuesta de aprobación de ejecución/complemento | | `plugin-sdk/command-auth-native` | Asistentes de autenticación de comandos nativos + objetivo de sesión nativa | | `plugin-sdk/command-detection` | Asistentes
  compartidos de detección de comandos | | `plugin-sdk/command-surface` | Asistentes de normalización del cuerpo del comando y de superficie del comando | | `plugin-sdk/allow-from` | `formatAllowFromLowercase` | | `plugin-sdk/channel-secret-runtime` | Asistentes de colección de contratos secretos estrechos para superficies de secretos de canal/complemento | | `plugin-sdk/secret-ref-runtime` |
  Asistentes de escritura `coerceSecretRef` estrecha y SecretRef para el análisis de contratos secretos/configuración | | `plugin-sdk/security-runtime` | Asistentes compartidos de confianza, restricción de DM, contenido externo y colección de secretos | | `plugin-sdk/ssrf-policy` | Asistentes de política de SSRF de lista de permitidos de host y red privada | | `plugin-sdk/ssrf-runtime` |
  Asistentes de política de SSRF, recuperación protegida por SSRF y despachador anclado | | `plugin-sdk/secret-input` | Asistentes de análisis de entrada de secretos | | `plugin-sdk/webhook-ingress` | Asistentes de solicitud/objetivo de webhook | | `plugin-sdk/webhook-request-guards` | Asistentes de tamaño de cuerpo de solicitud/tiempo de espera |
</Accordion>

<Accordion title="Subrutas de tiempo de ejecución y almacenamiento">
  | Subruta | Exportaciones clave | | --- | --- | | `plugin-sdk/runtime` | Asistentes amplios de tiempo de ejecución/registro/respaldo/instalación de complementos | | `plugin-sdk/runtime-env` | Asistentes estrechos de entorno de tiempo de ejecución, registrador, tiempo de espera, reintento y retroceso | | `plugin-sdk/channel-runtime-context` | Asistentes genéricos de registro y búsqueda de
  contexto de tiempo de ejecución de canal | | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | | `plugin-sdk/plugin-runtime` | Asistentes compartidos de comandos/ganchos/http/interactivos de complementos | | `plugin-sdk/hook-runtime` | Asistentes compartidos de canalizaciones de webhooks/ganchos internos | | `plugin-sdk/lazy-runtime` | Asistentes de importación/vinculación diferida de
  tiempo de ejecución como `createLazyRuntimeModule`, `createLazyRuntimeMethod` y `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | Asistentes de ejecución de procesos | | `plugin-sdk/cli-runtime` | Asistentes de formato CLI, espera y versión | | `plugin-sdk/gateway-runtime` | Asistentes de cliente de puerta de enlace y parches de estado de canal | | `plugin-sdk/config-runtime` |
  Asistentes de carga/escritura de configuración | | `plugin-sdk/telegram-command-config` | Normalización de nombre/descripción de comandos de Telegram y verificaciones de duplicados/conflictos, incluso cuando la superficie del contrato Telegram incluido no está disponible | | `plugin-sdk/approval-runtime` | Asistentes de aprobación de ejecución/complemento, constructores de capacidades de
  aprobación, asistentes de autenticación/perfil, asistentes de enrutamiento/tiempo de ejecución nativos | | `plugin-sdk/reply-runtime` | Asistentes compartidos de tiempo de ejecución de entrada/respuesta, fragmentación, envío, latido y planificador de respuesta | | `plugin-sdk/reply-dispatch-runtime` | Asistentes estrechos de envío/finalización de respuesta | | `plugin-sdk/reply-history` |
  Asistentes compartidos de historial de respuestas de ventana corta como `buildHistoryContext`, `recordPendingHistoryEntry` y `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | Asistentes estrechos de fragmentación de texto/markdown | | `plugin-sdk/session-store-runtime` | Asistentes de ruta de tienda de sesión +
  actualizado en | | `plugin-sdk/state-paths` | Asistentes de ruta de directorio Estado/OAuth | | `plugin-sdk/routing` | Asistentes de vinculación de ruta/clave de sesión/cuenta como `resolveAgentRoute`, `buildAgentSessionKey` y `resolveDefaultAgentBoundAccountId` | | `plugin-sdk/status-helpers` | Asistentes compartidos de resumen de estado de canal/cuenta, valores predeterminados de estado de
  tiempo de ejecución y asistentes de metadatos de problemas | | `plugin-sdk/target-resolver-runtime` | Asistentes compartidos de resolución de objetivos | | `plugin-sdk/string-normalization-runtime` | Asistentes de normalización de Slug/cadena | | `plugin-sdk/request-url` | Extraer URL de cadenas de entradas tipo fetch/request | | `plugin-sdk/run-command` | Ejecutor de comandos cronometrado con
  resultados normalizados de stdout/stderr | | `plugin-sdk/param-readers` | Lectores de parámetros comunes de herramienta/CLI | | `plugin-sdk/tool-payload` | Extraer cargas normalizadas de objetos de resultados de herramientas | | `plugin-sdk/tool-send` | Extraer campos de destino de envío canónicos de argumentos de herramienta | | `plugin-sdk/temp-path` | Asistentes compartidos de ruta de
  descarga temporal | | `plugin-sdk/logging-core` | Registrador de subsistemas y asistentes de redacción | | `plugin-sdk/markdown-table-runtime` | Asistentes de modo de tabla Markdown | | `plugin-sdk/json-store` | Asistentes pequeños de lectura/escritura de estado JSON | | `plugin-sdk/file-lock` | Asistentes de bloqueo de archivos reentrantes | | `plugin-sdk/persistent-dedupe` | Asistentes de
  caché de deduplicación respaldada en disco | | `plugin-sdk/acp-runtime` | Asistentes de tiempo de ejecución/sesión ACP y envío de respuesta | | `plugin-sdk/agent-config-primitives` | Primitivas estrechas de esquema de configuración de tiempo de ejecución de agente | | `plugin-sdk/boolean-param` | Lector suelto de parámetros booleanos | | `plugin-sdk/dangerous-name-runtime` | Asistentes de
  resolución de coincidencia de nombres peligrosos | | `plugin-sdk/device-bootstrap` | Asistentes de token de arranque y emparejamiento de dispositivos | | `plugin-sdk/extension-shared` | Primitivas de asistente compartidas de canal pasivo, estado y proxy ambiental | | `plugin-sdk/models-provider-runtime` | Asistentes de respuesta de comando/proveedor `/models` | |
  `plugin-sdk/skill-commands-runtime` | Asistentes de listado de comandos de habilidades | | `plugin-sdk/native-command-registry` | Asistentes de registro/construcción/serialización de comandos nativos | | `plugin-sdk/agent-harness` | Superficie experimental de complemento de confianza para arneses de agentes de bajo nivel: tipos de arnés, asistentes de dirección/aborto de ejecución activa,
  asistentes de puente de herramientas OpenClaw y utilidades de resultados de intentos | | `plugin-sdk/provider-zai-endpoint` | Asistentes de detección de puntos finales Z.AI | | `plugin-sdk/infra-runtime` | Asistentes de eventos/latidos del sistema | | `plugin-sdk/collection-runtime` | Asistentes pequeños de caché limitada | | `plugin-sdk/diagnostic-runtime` | Indicadores de diagnóstico y
  asistentes de eventos | | `plugin-sdk/error-runtime` | Gráfico de errores, formato, asistentes compartidos de clasificación de errores, `isApprovalNotFoundError` | | `plugin-sdk/fetch-runtime` | Asistentes de búsqueda, proxy y búsqueda anclada envueltos | | `plugin-sdk/host-runtime` | Asistentes de normalización de nombre de host y host SCP | | `plugin-sdk/retry-runtime` | Asistentes de
  configuración de reintento y ejecutor de reintento | | `plugin-sdk/agent-runtime` | Asistentes de directorio/identidad/espacio de trabajo de agente | | `plugin-sdk/directory-runtime` | Consulta/deduplicación de directorio respaldada por configuración | | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

<Accordion title="Subrutas de capacidad y pruebas">
  | Subruta | Exportaciones clave | | --- | --- | | `plugin-sdk/media-runtime` | Asistentes compartidos de obtención/transformación/almacenamiento de medios, además de constructores de carga útil de medios | | `plugin-sdk/media-generation-runtime` | Asistentes compartidos de conmutación por error de generación de medios, selección de candidatos y mensajería de modelo faltante | |
  `plugin-sdk/media-understanding` | Tipos de proveedor de comprensión de medios más exportaciones de asistentes de imagen/audio orientadas al proveedor | | `plugin-sdk/text-runtime` | Asistentes compartidos de texto/markdown/registro, como eliminación de texto visible para el asistente, asistentes de representación/división/tablas de markdown, asistentes de redacción, asistentes de etiquetas de
  directiva y utilidades de texto seguro | | `plugin-sdk/text-chunking` | Asistente de división de texto saliente | | `plugin-sdk/speech` | Tipos de proveedor de voz más asistentes de directiva, registro y validación orientados al proveedor | | `plugin-sdk/speech-core` | Tipos de proveedor de voz compartidos, asistentes de registro, directiva y normalización | | `plugin-sdk/realtime-transcription`
  | Tipos de proveedor de transcripción en tiempo real y asistentes de registro | | `plugin-sdk/realtime-voice` | Tipos de proveedor de voz en tiempo real y asistentes de registro | | `plugin-sdk/image-generation` | Tipos de proveedor de generación de imágenes | | `plugin-sdk/image-generation-core` | Tipos de generación de imágenes compartidos, conmutación por error, autenticación y asistentes de
  registro | | `plugin-sdk/music-generation` | Tipos de proveedor/solicitud/resultado de generación de música | | `plugin-sdk/music-generation-core` | Tipos de generación de música compartidos, asistentes de conmutación por error, búsqueda de proveedor y análisis de referencias de modelo | | `plugin-sdk/video-generation` | Tipos de proveedor/solicitud/resultado de generación de video | |
  `plugin-sdk/video-generation-core` | Tipos de generación de video compartidos, asistentes de conmutación por error, búsqueda de proveedor y análisis de referencias de modelo | | `plugin-sdk/webhook-targets` | Registro de destinos de webhook y asistentes de instalación de rutas | | `plugin-sdk/webhook-path` | Asistentes de normalización de rutas de webhook | | `plugin-sdk/web-media` | Asistentes
  compartidos de carga de medios remotos locales | | `plugin-sdk/zod` | `zod` reexportado para consumidores del SDK de complementos | | `plugin-sdk/testing` | `installCommonResolveTargetErrorCases`, `shouldAckReaction` |
</Accordion>

<Accordion title="Subrutas de memoria">
  | Subruta | Exportaciones clave | | --- | --- | | `plugin-sdk/memory-core` | Superficie de ayuda de memory-core incluida para asistentes de administrador/configuración/archivo/CLI | | `plugin-sdk/memory-core-engine-runtime` | Fachada de tiempo de ejecución de índice/búsqueda de memoria | | `plugin-sdk/memory-core-host-engine-foundation` | Exportaciones del motor de fundación del host de memoria
  | | `plugin-sdk/memory-core-host-engine-embeddings` | Exportaciones del motor de incrustación del host de memoria | | `plugin-sdk/memory-core-host-engine-qmd` | Exportaciones del motor QMD del host de memoria | | `plugin-sdk/memory-core-host-engine-storage` | Exportaciones del motor de almacenamiento del host de memoria | | `plugin-sdk/memory-core-host-multimodal` | Asistentes multimodales del
  host de memoria | | `plugin-sdk/memory-core-host-query` | Asistentes de consulta del host de memoria | | `plugin-sdk/memory-core-host-secret` | Asistentes de secretos del host de memoria | | `plugin-sdk/memory-core-host-events` | Asistentes de diario de eventos del host de memoria | | `plugin-sdk/memory-core-host-status` | Asistentes de estado del host de memoria | |
  `plugin-sdk/memory-core-host-runtime-cli` | Asistentes de tiempo de ejecución de CLI del host de memoria | | `plugin-sdk/memory-core-host-runtime-core` | Asistentes de tiempo de ejecución principal del host de memoria | | `plugin-sdk/memory-core-host-runtime-files` | Asistentes de archivo/tiempo de ejecución del host de memoria | | `plugin-sdk/memory-host-core` | Alias neutral al proveedor para
  los asistentes de tiempo de ejecución principal del host de memoria | | `plugin-sdk/memory-host-events` | Alias neutral al proveedor para los asistentes de diario de eventos del host de memoria | | `plugin-sdk/memory-host-files` | Alias neutral al proveedor para los asistentes de archivo/tiempo de ejecución del host de memoria | | `plugin-sdk/memory-host-markdown` | Asistentes de markdown
  administrados compartidos para plugins adyacentes a la memoria | | `plugin-sdk/memory-host-search` | Fachada de tiempo de ejecución de memoria activa para el acceso del gestor de búsqueda | | `plugin-sdk/memory-host-status` | Alias neutral al proveedor para los asistentes de estado del host de memoria | | `plugin-sdk/memory-lancedb` | Superficie de ayuda de memory-lancedb incluida |
</Accordion>

  <Accordion title="Subrutas de auxiliares empaquetados reservados">
    | Familia | Subrutas actuales | Uso previsto |
    | --- | --- | --- |
    | Navegador | `plugin-sdk/browser-cdp`, `plugin-sdk/browser-config-runtime`, `plugin-sdk/browser-config-support`, `plugin-sdk/browser-control-auth`, `plugin-sdk/browser-node-runtime`, `plugin-sdk/browser-profiles`, `plugin-sdk/browser-security-runtime`, `plugin-sdk/browser-setup-tools`, `plugin-sdk/browser-support` | Auxiliares de soporte de complementos del navegador empaquetados (`browser-support` sigue siendo el barril de compatibilidad) |
    | Matrix | `plugin-sdk/matrix`, `plugin-sdk/matrix-helper`, `plugin-sdk/matrix-runtime-heavy`, `plugin-sdk/matrix-runtime-shared`, `plugin-sdk/matrix-runtime-surface`, `plugin-sdk/matrix-surface`, `plugin-sdk/matrix-thread-bindings` | Superficie de tiempo de ejecución/auxiliar de Matrix empaquetada |
    | Line | `plugin-sdk/line`, `plugin-sdk/line-core`, `plugin-sdk/line-runtime`, `plugin-sdk/line-surface` | Superficie de tiempo de ejecución/auxiliar de LINE empaquetada |
    | IRC | `plugin-sdk/irc`, `plugin-sdk/irc-surface` | Superficie auxiliar de IRC empaquetada |
    | Auxiliares específicos del canal | `plugin-sdk/googlechat`, `plugin-sdk/zalouser`, `plugin-sdk/bluebubbles`, `plugin-sdk/bluebubbles-policy`, `plugin-sdk/mattermost`, `plugin-sdk/mattermost-policy`, `plugin-sdk/feishu-conversation`, `plugin-sdk/msteams`, `plugin-sdk/nextcloud-talk`, `plugin-sdk/nostr`, `plugin-sdk/tlon`, `plugin-sdk/twitch` | Costuras de compatibilidad/auxiliares de canal empaquetadas |
    | Auxiliares específicos de autenticación/complemento | `plugin-sdk/github-copilot-login`, `plugin-sdk/github-copilot-token`, `plugin-sdk/diagnostics-otel`, `plugin-sdk/diffs`, `plugin-sdk/llm-task`, `plugin-sdk/thread-ownership`, `plugin-sdk/voice-call` | Costuras de auxiliares de características/complementos empaquetados; `plugin-sdk/github-copilot-token` actualmente exporta `DEFAULT_COPILOT_API_BASE_URL`, `deriveCopilotApiBaseUrlFromToken` y `resolveCopilotApiToken` |
  </Accordion>
</AccordionGroup>

## API de registro

La función de retorno `register(api)` recibe un objeto `OpenClawPluginApi` con estos
métodos:

### Registro de capacidades

| Método                                           | Lo que registra                                |
| ------------------------------------------------ | ---------------------------------------------- |
| `api.registerProvider(...)`                      | Inferencia de texto (LLM)                      |
| `api.registerAgentHarness(...)`                  | Ejecutor de agentes de bajo nivel experimental |
| `api.registerCliBackend(...)`                    | Backend de inferencia de CLI local             |
| `api.registerChannel(...)`                       | Canal de mensajería                            |
| `api.registerSpeechProvider(...)`                | Síntesis de texto a voz / STT                  |
| `api.registerRealtimeTranscriptionProvider(...)` | Transcripción en tiempo real en streaming      |
| `api.registerRealtimeVoiceProvider(...)`         | Sesiones de voz dúplex en tiempo real          |
| `api.registerMediaUnderstandingProvider(...)`    | Análisis de imagen/audio/vídeo                 |
| `api.registerImageGenerationProvider(...)`       | Generación de imágenes                         |
| `api.registerMusicGenerationProvider(...)`       | Generación de música                           |
| `api.registerVideoGenerationProvider(...)`       | Generación de vídeo                            |
| `api.registerWebFetchProvider(...)`              | Proveedor de recuperación/extracción web       |
| `api.registerWebSearchProvider(...)`             | Búsqueda web                                   |

### Herramientas y comandos

| Método                          | Lo que registra                                            |
| ------------------------------- | ---------------------------------------------------------- |
| `api.registerTool(tool, opts?)` | Herramienta de agente (obligatoria u `{ optional: true }`) |
| `api.registerCommand(def)`      | Comando personalizado (evita el LLM)                       |

### Infraestructura

| Método                                         | Lo que registra                                  |
| ---------------------------------------------- | ------------------------------------------------ |
| `api.registerHook(events, handler, opts?)`     | Gancho de eventos                                |
| `api.registerHttpRoute(params)`                | Endpoint HTTP de puerta de enlace                |
| `api.registerGatewayMethod(name, handler)`     | Método RPC de puerta de enlace                   |
| `api.registerCli(registrar, opts?)`            | Subcomando de CLI                                |
| `api.registerService(service)`                 | Servicio en segundo plano                        |
| `api.registerInteractiveHandler(registration)` | Controlador interactivo                          |
| `api.registerMemoryPromptSupplement(builder)`  | Sección de prompt aditiva adyacente a la memoria |
| `api.registerMemoryCorpusSupplement(adapter)`  | Corpus de búsqueda/lectura de memoria aditiva    |

Los espacios de nombres administrativos principales reservados (`config.*`, `exec.approvals.*`, `wizard.*`,
`update.*`) siempre permanecen `operator.admin`, incluso si un complemento intenta asignar un
alcance de método de puerta de enlace más estrecho. Se prefieren prefijos específicos del complemento para
los métodos propiedad del complemento.

### Metadatos de registro de CLI

`api.registerCli(registrar, opts?)` acepta dos tipos de metadatos de nivel superior:

- `commands`: raíces de comandos explícitas propiedad del registrador
- `descriptors`: descriptores de comandos en tiempo de análisis utilizados para la ayuda de la CLI raíz,
  enrutamiento y registro perezoso de la CLI del complemento

Si desea que un comando de complemento se mantenga cargado de forma perezosa en la ruta normal de la CLI raíz,
proporcione `descriptors` que cubra cada raíz de comando de nivel superior expuesta por ese
registrador.

```typescript
api.registerCli(
  async ({ program }) => {
    const { registerMatrixCli } = await import("./src/cli.js");
    registerMatrixCli({ program });
  },
  {
    descriptors: [
      {
        name: "matrix",
        description: "Manage Matrix accounts, verification, devices, and profile state",
        hasSubcommands: true,
      },
    ],
  },
);
```

Use `commands` por sí solo solo cuando no necesite el registro perezoso de la CLI raíz.
Esa ruta de compatibilidad diligente sigue siendo compatible, pero no instala
marcadores de posición respaldados por descriptores para la carga perezosa en tiempo de análisis.

### Registro del backend de la CLI

`api.registerCliBackend(...)` permite que un complemento sea propietario de la configuración predeterminada para un
backend de CLI de IA local como `codex-cli`.

- El `id` del backend se convierte en el prefijo del proveedor en las referencias de modelo como `codex-cli/gpt-5`.
- El `config` del backend utiliza la misma forma que `agents.defaults.cliBackends.<id>`.
- La configuración del usuario siempre tiene preferencia. OpenClaw fusiona `agents.defaults.cliBackends.<id>` sobre la
  predeterminada del complemento antes de ejecutar la CLI.
- Use `normalizeConfig` cuando un backend necesita reescrituras de compatibilidad después de la fusión
  (por ejemplo, normalizar formas de banderas antiguas).

### Slots exclusivos

| Método                                     | Lo que registra                                                                                                                                                                   |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api.registerContextEngine(id, factory)`   | Motor de contexto (uno activo a la vez). La devolución de llamada `assemble()` recibe `availableTools` y `citationsMode` para que el motor pueda adaptar las adiciones al prompt. |
| `api.registerMemoryCapability(capability)` | Capacidad de memoria unificada                                                                                                                                                    |
| `api.registerMemoryPromptSection(builder)` | Generador de sección de prompt de memoria                                                                                                                                         |
| `api.registerMemoryFlushPlan(resolver)`    | Resolución de plan de vaciado de memoria                                                                                                                                          |
| `api.registerMemoryRuntime(runtime)`       | Adaptador de tiempo de ejecución de memoria                                                                                                                                       |

### Adaptadores de incrustación de memoria

| Método                                         | Lo que registra                                                 |
| ---------------------------------------------- | --------------------------------------------------------------- |
| `api.registerMemoryEmbeddingProvider(adapter)` | Adaptador de incrustación de memoria para el complemento activo |

- `registerMemoryCapability` es la API exclusiva preferida para complementos de memoria.
- `registerMemoryCapability` también puede exponer `publicArtifacts.listArtifacts(...)`
  para que los complementos complementarios puedan consumir artefactos de memoria exportados a través de
  `openclaw/plugin-sdk/memory-host-core` en lugar de acceder al diseño privado
  de un complemento de memoria específico.
- `registerMemoryPromptSection`, `registerMemoryFlushPlan` y
  `registerMemoryRuntime` son API exclusivas de complementos de memoria compatibles con versiones anteriores.
- `registerMemoryEmbeddingProvider` permite que el complemento de memoria activo registre uno
  o más ids de adaptador de incrustación (por ejemplo `openai`, `gemini` o un id
  definido por el complemento personalizado).
- La configuración de usuario como `agents.defaults.memorySearch.provider` y
  `agents.defaults.memorySearch.fallback` se resuelve con esos ids de
  adaptador registrados.

### Eventos y ciclo de vida

| Método                                       | Lo que hace                                     |
| -------------------------------------------- | ----------------------------------------------- |
| `api.on(hookName, handler, opts?)`           | Gancho de ciclo de vida tipado                  |
| `api.onConversationBindingResolved(handler)` | Devolución de llamada de enlace de conversación |

### Semántica de decisión del gancho

- `before_tool_call`: devolver `{ block: true }` es terminal. Una vez que cualquier controlador lo establezca, se omiten los controladores de menor prioridad.
- `before_tool_call`: devolver `{ block: false }` se trata como sin decisión (igual que omitir `block`), no como una anulación.
- `before_install`: devolver `{ block: true }` es terminal. Una vez que cualquier controlador lo establezca, se omiten los controladores de menor prioridad.
- `before_install`: devolver `{ block: false }` se trata como sin decisión (igual que omitir `block`), no como una anulación.
- `reply_dispatch`: devolver `{ handled: true, ... }` es terminal. Una vez que cualquier controlador reclama el envío, se omiten los controladores de menor prioridad y la ruta de envío del modelo predeterminado.
- `message_sending`: devolver `{ cancel: true }` es terminal. Una vez que cualquier controlador lo establezca, se omiten los controladores de menor prioridad.
- `message_sending`: devolver `{ cancel: false }` se trata como sin decisión (igual que omitir `cancel`), no como una anulación.

### Campos del objeto API

| Campo                    | Tipo                      | Descripción                                                                                                          |
| ------------------------ | ------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `api.id`                 | `string`                  | Id del complemento                                                                                                   |
| `api.name`               | `string`                  | Nombre para mostrar                                                                                                  |
| `api.version`            | `string?`                 | Versión del complemento (opcional)                                                                                   |
| `api.description`        | `string?`                 | Descripción del complemento (opcional)                                                                               |
| `api.source`             | `string`                  | Ruta de origen del complemento                                                                                       |
| `api.rootDir`            | `string?`                 | Directorio raíz del complemento (opcional)                                                                           |
| `api.config`             | `OpenClawConfig`          | Instantánea de la configuración actual (instantánea de tiempo de ejecución en memoria activa cuando está disponible) |
| `api.pluginConfig`       | `Record<string, unknown>` | Configuración específica del complemento de `plugins.entries.<id>.config`                                            |
| `api.runtime`            | `PluginRuntime`           | [Ayudantes de tiempo de ejecución](/en/plugins/sdk-runtime)                                                          |
| `api.logger`             | `PluginLogger`            | Registrador con ámbito (`debug`, `info`, `warn`, `error`)                                                            |
| `api.registrationMode`   | `PluginRegistrationMode`  | Modo de carga actual; `"setup-runtime"` es la ventana de inicio/configuración previa ligera a la entrada completa    |
| `api.resolvePath(input)` | `(string) => string`      | Resolver ruta relativa a la raíz del complemento                                                                     |

## Convención de módulo interno

Dentro de su complemento, use archivos barril locales para importaciones internas:

```
my-plugin/
  api.ts            # Public exports for external consumers
  runtime-api.ts    # Internal-only runtime exports
  index.ts          # Plugin entry point
  setup-entry.ts    # Lightweight setup-only entry (optional)
```

<Warning>
  Nunca importe su propio complemento a través de `openclaw/plugin-sdk/<your-plugin>`
  desde el código de producción. Dirija las importaciones internas a través de `./api.ts` o
  `./runtime-api.ts`. La ruta del SDK es solo el contrato externo.
</Warning>

Las superficies públicas de complementos empaquetados cargados por fachada (`api.ts`, `runtime-api.ts`,
`index.ts`, `setup-entry.ts` y archivos de entrada públicos similares) ahora prefieren la
instantánea de configuración de tiempo de ejecución activa cuando OpenClaw ya se está ejecutando. Si aún no existe ninguna
instantánea de tiempo de ejecución, recurren al archivo de configuración resuelto en el disco.

Los complementos del proveedor también pueden exponer un contrato de barril local del complemento estrecho cuando un auxiliar es intencionalmente específico del proveedor y aún no pertenece a una subruta genérica del SDK. Ejemplo empaquetado actual: el proveedor Anthropic mantiene sus auxiliares de flujo Claude en su propia costura pública `api.ts` / `contract-api.ts` en lugar de promover la lógica de encabezado beta de Anthropic y `service_tier` a un contrato `plugin-sdk/*` genérico.

Otros ejemplos empaquetados actuales:

- `@openclaw/openai-provider`: `api.ts` exporta los constructores del proveedor,
  auxiliares de modelo predeterminado y constructores de proveedores en tiempo real
- `@openclaw/openrouter-provider`: `api.ts` exporta el constructor del proveedor más
  los auxiliares de incorporación/configuración

<Warning>
  El código de producción de la extensión también debe evitar las importaciones `openclaw/plugin-sdk/<other-plugin>`.
  Si un auxiliar es realmente compartido, promuévalo a una subruta neutra del SDK
  como `openclaw/plugin-sdk/speech`, `.../provider-model-shared`, u otra
  superficie orientada a capacidades en lugar de acoplar dos complementos entre sí.
</Warning>

## Relacionado

- [Puntos de entrada](/en/plugins/sdk-entrypoints) — opciones `definePluginEntry` y `defineChannelPluginEntry`
- [Auxiliares de tiempo de ejecución](/en/plugins/sdk-runtime) — referencia completa del espacio de nombres `api.runtime`
- [Configuración y ajustes](/en/plugins/sdk-setup) — empaquetado, manifiestos, esquemas de configuración
- [Pruebas](/en/plugins/sdk-testing) — utilidades de prueba y reglas de linting
- [Migración del SDK](/en/plugins/sdk-migration) — migración desde superficies obsoletas
- [Interno del complemento](/en/plugins/architecture) — arquitectura profunda y modelo de capacidades
