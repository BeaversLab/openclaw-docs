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

<Tip>**¿Buscas una guía paso a paso?** - ¿Es tu primer complemento? Empieza con [Getting Started](/es/plugins/building-plugins) - ¿Complemento de canal? Consulta [Channel Plugins](/es/plugins/sdk-channel-plugins) - ¿Complemento de proveedor? Consulta [Provider Plugins](/es/plugins/sdk-provider-plugins)</Tip>

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
  <Accordion title="Subrutas de canal">
    | Subruta | Exportaciones clave |
    | --- | --- |
    | `plugin-sdk/channel-core` | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` |
    | `plugin-sdk/config-schema` | Exportación del esquema Zod `openclaw.json` raíz (`OpenClawSchema`) |
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`, más `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` |
    | `plugin-sdk/setup` | Asistentes compartidos del asistente de configuración, indicadores de lista de permitidos, constructores de estado de configuración |
    | `plugin-sdk/setup-runtime` | `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
    | `plugin-sdk/setup-adapter-runtime` | `createEnvPatchedAccountSetupAdapter` |
    | `plugin-sdk/setup-tools` | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` |
    | `plugin-sdk/account-core` | Asistentes de configuración/acción de puerta de múltiples cuentas, asistentes de reserva de cuenta predeterminada |
    | `plugin-sdk/account-id` | `DEFAULT_ACCOUNT_ID`, asistentes de normalización de ID de cuenta |
    | `plugin-sdk/account-resolution` | Búsqueda de cuenta + asistentes de reserva predeterminada |
    | `plugin-sdk/account-helpers` | Asistentes de lista de cuentas/acción de cuenta reducidos |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | `createChannelReplyPipeline` |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter` |
    | `plugin-sdk/channel-config-schema` | Tipos de esquema de configuración de canal |
    | `plugin-sdk/telegram-command-config` | Asistentes de normalización/validación de comandos personalizados de Telegram con reserva de contrato agrupado |
    | `plugin-sdk/command-gating` | Asistentes de puerta de autorización de comandos reducidos |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-lifecycle` | `createAccountStatusSink`, asistentes de ciclo de vida/finalización de flujo de borrador |
    | `plugin-sdk/inbound-envelope` | Asistentes compartidos de ruta de entrada + constructor de sobre |
    | `plugin-sdk/inbound-reply-dispatch` | Asistentes compartidos de registro y envío de entrada |
    | `plugin-sdk/messaging-targets` | Asistentes de análisis/coincidencia de objetivos |
    | `plugin-sdk/outbound-media` | Asistentes compartidos de carga de medios de salida |
    | `plugin-sdk/outbound-runtime` | Asistentes de identidad de salida, delegado de envío y planificación de carga útil |
    | `plugin-sdk/poll-runtime` | Asistentes de normalización de encuestas reducidas |
    | `plugin-sdk/thread-bindings-runtime` | Ciclo de vida de vinculación de hilos y asistentes de adaptador |
    | `plugin-sdk/agent-media-payload` | Constructor de carga útil de medios de agente heredado |
    | `plugin-sdk/conversation-runtime` | Asistentes de vinculación, emparejamiento y vinculación configurada de conversación/hilos |
    | `plugin-sdk/runtime-config-snapshot` | Asistente de instantánea de configuración en tiempo de ejecución |
    | `plugin-sdk/runtime-group-policy` | Asistentes de resolución de políticas de grupo en tiempo de ejecución |
    | `plugin-sdk/channel-status` | Asistentes compartidos de instantánea/resumen de estado del canal |
    | `plugin-sdk/channel-config-primitives` | Primitivas de esquema de configuración de canal reducidas |
    | `plugin-sdk/channel-config-writes` | Asistentes de autorización de escritura de configuración de canal |
    | `plugin-sdk/channel-plugin-common` | Exportaciones preliminares complementarias del complemento de canal |
    | `plugin-sdk/allowlist-config-edit` | Asistentes de edición/lectura de configuración de lista de permitidos |
    | `plugin-sdk/group-access` | Asistentes compartidos de decisiones de acceso de grupo |
    | `plugin-sdk/direct-dm` | Asistentes compartidos de autenticación/guardia de MD directo |
    | `plugin-sdk/interactive-runtime` | Presentación semántica de mensajes, entrega y asistentes de respuesta interactiva heredados. Consulte [Presentación de mensajes](/es/plugins/message-presentation) |
    | `plugin-sdk/channel-inbound` | Barril de compatibilidad para asistentes de rebote de entrada, coincidencia de mención, asistentes de política de mención y asistentes de sobre |
    | `plugin-sdk/channel-mention-gating` | Asistentes de política de mención reducidos sin la superficie de tiempo de ejecución de entrada más amplia |
    | `plugin-sdk/channel-location` | Asistentes de contexto y formato de ubicación del canal |
    | `plugin-sdk/channel-logging` | Asistentes de registro de canal para caídas de entrada y fallos de escritura/reconocimiento |
    | `plugin-sdk/channel-send-result` | Tipos de resultados de respuesta |
    | `plugin-sdk/channel-actions` | Asistentes de acción de mensaje de canal, más asistentes de esquema nativo obsoletos mantenidos para compatibilidad del complemento |
    | `plugin-sdk/channel-targets` | Asistentes de análisis/coincidencia de objetivos |
    | `plugin-sdk/channel-contract` | Tipos de contrato de canal |
    | `plugin-sdk/channel-feedback` | Cableado de comentarios/reacciones |
    | `plugin-sdk/channel-secret-runtime` | Asistentes de contrato secreto reducidos como `collectSimpleChannelFieldAssignments`, `getChannelSurface`, `pushAssignment` y tipos de objetivo secretos |
  </Accordion>

<Accordion title="Subrutas de proveedores">
  | Subruta | Exportaciones clave | | --- | --- | | `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry` | | `plugin-sdk/provider-setup` | Asistentes de configuración de proveedores locales/autoalojados curados | | `plugin-sdk/self-hosted-provider-setup` | Asistentes de configuración de proveedores autoalojados compatibles con OpenAI enfocados | | `plugin-sdk/cli-backend` | Valores
  predeterminados del backend de CLI + constantes de watchdog | | `plugin-sdk/provider-auth-runtime` | Asistentes de resolución de claves API en tiempo de ejecución para complementos de proveedor | | `plugin-sdk/provider-auth-api-key` | Asistentes de incorporación de claves API/escritura de perfiles, como `upsertApiKeyProfile` | | `plugin-sdk/provider-auth-result` | Constructor de resultados de
  autenticación OAuth estándar | | `plugin-sdk/provider-auth-login` | Asistentes de inicio de sesión interactivo compartidos para complementos de proveedor | | `plugin-sdk/provider-env-vars` | Asistentes de búsqueda de variables de entorno de autenticación de proveedor | | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`, `ensureApiKeyFromOptionEnvOrPrompt`, `upsertAuthProfile`,
  `upsertApiKeyProfile`, `writeOAuthCredentials` | | `plugin-sdk/provider-model-shared` | `ProviderReplayFamily`, `buildProviderReplayFamilyHooks`, `normalizeModelCompat`, constructores de políticas de repetición compartidas, asistentes de extremos de proveedor y asistentes de normalización de ID de modelo, como `normalizeNativeXaiModelId` | | `plugin-sdk/provider-catalog-shared` |
  `findCatalogTemplate`, `buildSingleProviderApiKeyCatalog`, `supportsNativeStreamingUsageCompat`, `applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-http` | Asistentes de capacidades HTTP/extremo de proveedor genéricos, incluidos asistentes de formularios multiparte para transcripción de audio | | `plugin-sdk/provider-web-fetch-contract` | Asistentes de contrato de
  configuración/selección de recuperación web estrecha, como `enablePluginInConfig` y `WebFetchProviderPlugin` | | `plugin-sdk/provider-web-fetch` | Asistentes de registro/caché de proveedores de recuperación web | | `plugin-sdk/provider-web-search-config-contract` | Asistentes de configuración/credenciales de búsqueda web estrecha para proveedores que no necesitan cableado de habilitación de
  complemento | | `plugin-sdk/provider-web-search-contract` | Asistentes de contrato de configuración/credenciales de búsqueda web estrecha, como `createWebSearchProviderContractFields`, `enablePluginInConfig`, `resolveProviderWebSearchPluginConfig`, y establecedores/obtenedores de credenciales con ámbito | | `plugin-sdk/provider-web-search` | Asistentes de registro/caché/tiempo de ejecución de
  proveedores de búsqueda web | | `plugin-sdk/provider-tools` | `ProviderToolCompatFamily`, `buildProviderToolCompatFamilyHooks`, limpieza de esquema de Gemini + diagnósticos, y asistentes de compatibilidad con xAI, como `resolveXaiModelCompatPatch` / `applyXaiModelCompat` | | `plugin-sdk/provider-usage` | `fetchClaudeUsage` y similares | | `plugin-sdk/provider-stream` | `ProviderStreamFamily`,
  `buildProviderStreamFamilyHooks`, `composeProviderStreamWrappers`, tipos de envoltura de flujo, y asistentes de envoltura compartidos para Anthropic/Bedrock/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot | | `plugin-sdk/provider-transport-runtime` | Asistentes de transporte de proveedor nativo, como recuperación protegida, transformaciones de mensajes de transporte y flujos de
  eventos de transporte grabables | | `plugin-sdk/provider-onboard` | Asistentes de parches de configuración de incorporación | | `plugin-sdk/global-singleton` | Asistentes de singleton/mapa/caché local a proceso |
</Accordion>

<Accordion title="Subrutas de autenticación y seguridad">
  | Subruta | Exportaciones clave | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate`, asistentes de registro de comandos, asistentes de autorización de remitente | | `plugin-sdk/command-status` | Constructores de mensajes de comandos/ayuda como `buildCommandsMessagePaginated` y `buildHelpMessage` | | `plugin-sdk/approval-auth-runtime` | Resolución del aprobador y asistentes
  de autenticación de acciones del mismo chat | | `plugin-sdk/approval-client-runtime` | Asistentes de perfil/filtro de aprobación de ejecución nativa | | `plugin-sdk/approval-delivery-runtime` | Adaptadores de capacidad/entrega de aprobación nativa | | `plugin-sdk/approval-gateway-runtime` | Asistente compartido de resolución de puerta de enlace de aprobación | |
  `plugin-sdk/approval-handler-adapter-runtime` | Asistentes de carga de adaptadores de aprobación nativa ligeros para puntos de entrada de canal en vivo | | `plugin-sdk/approval-handler-runtime` | Asistentes de tiempo de ejecución más amplios del controlador de aprobación; prefiera las costuras de adaptador/puerta de enlace más estrechas cuando sean suficientes | |
  `plugin-sdk/approval-native-runtime` | Objetivo de aprobación nativa + asistentes de vinculación de cuenta | | `plugin-sdk/approval-reply-runtime` | Asistentes de carga útil de respuesta de aprobación de ejecución/complemento | | `plugin-sdk/command-auth-native` | Autenticación de comando nativa + asistentes de destino de sesión nativa | | `plugin-sdk/command-detection` | Asistentes compartidos
  de detección de comandos | | `plugin-sdk/command-surface` | Normalización del cuerpo del comando y asistentes de superficie del comando | | `plugin-sdk/allow-from` | `formatAllowFromLowercase` | | `plugin-sdk/channel-secret-runtime` | Asistentes estrechos de recolección de contratos secretos para superficies secretas de canal/complemento | | `plugin-sdk/secret-ref-runtime` | Asistentes estrechos
  `coerceSecretRef` y de escritura SecretRef para análisis de contrato secreto/configuración | | `plugin-sdk/security-runtime` | Asistentes compartidos de confianza, bloqueo de DM, contenido externo y recolección de secretos | | `plugin-sdk/ssrf-policy` | Asistentes de lista de permitidos de host y política SSRF de red privada | | `plugin-sdk/ssrf-dispatcher` | Asistentes estrechos de despachador
  anclado sin la amplia superficie de tiempo de ejecución de infraestructura | | `plugin-sdk/ssrf-runtime` | Asistentes de despachador anclado, recuperación protegida por SSRF y política SSRF | | `plugin-sdk/secret-input` | Asistentes de análisis de entrada de secretos | | `plugin-sdk/webhook-ingress` | Asistentes de solicitud/destino de webhook | | `plugin-sdk/webhook-request-guards` | Asistentes
  de tamaño/tiempo de espera del cuerpo de la solicitud |
</Accordion>

<Accordion title="Rutas de tiempo de ejecución y almacenamiento">
  | Subpath | Exportaciones clave | | --- | --- | | `plugin-sdk/runtime` | Asistentes de tiempo de ejecución/registro/copias de seguridad/instalación de complementos amplios | | `plugin-sdk/runtime-env` | Asistentes estrechos de entorno de tiempo de ejecución, registro, tiempo de espera, reintento y retroceso | | `plugin-sdk/channel-runtime-context` | Asistentes genéricos de registro y búsqueda de
  contexto de tiempo de ejecución de canal | | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | | `plugin-sdk/plugin-runtime` | Asistentes compartidos de comandos de complementos/ganchos/http/interactivos | | `plugin-sdk/hook-runtime` | Asistentes compartidos de canalizaciones de webhook/ganchos internos | | `plugin-sdk/lazy-runtime` | Asistentes de importación/vinculación de tiempo de
  ejecución diferida, como `createLazyRuntimeModule`, `createLazyRuntimeMethod` y `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | Asistentes de ejecución de procesos | | `plugin-sdk/cli-runtime` | Asistentes de formato, espera y versión de CLI | | `plugin-sdk/gateway-runtime` | Asistentes de cliente de puerta de enlace y parches de estado de canal | | `plugin-sdk/config-runtime` |
  Asistentes de carga/escritura de configuración y búsqueda de configuración de complementos | | `plugin-sdk/telegram-command-config` | Normalización de nombre/descripción de comandos de Telegram y verificaciones de duplicados/conflictos, incluso cuando la superficie del contrato de Telegram incluido no está disponible | | `plugin-sdk/text-autolink-runtime` | Detección de autovínculos de
  referencia de archivos sin el barril de tiempo de ejecución de texto amplio | | `plugin-sdk/approval-runtime` | Asistentes de aprobación de ejecución/complemento, constructores de capacidades de aprobación, asistentes de autenticación/perfil, asistentes de enrutamiento/tiempo de ejecución nativos | | `plugin-sdk/reply-runtime` | Asistentes compartidos de tiempo de ejecución de entrada/respuesta,
  fragmentación, envío, latido y planificador de respuestas | | `plugin-sdk/reply-dispatch-runtime` | Asistentes estrechos de envío/finalización de respuestas | | `plugin-sdk/reply-history` | Asistentes compartidos de historial de respuestas de ventana corta, como `buildHistoryContext`, `recordPendingHistoryEntry` y `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` |
  `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | Asistentes estrechos de fragmentación de texto/markdown | | `plugin-sdk/session-store-runtime` | Asistentes de ruta de almacén de sesión + actualizado en | | `plugin-sdk/state-paths` | Asistentes de ruta de directorio de estado/OAuth | | `plugin-sdk/routing` | Asistentes de vinculación de ruta/clave de sesión/cuenta, como
  `resolveAgentRoute`, `buildAgentSessionKey` y `resolveDefaultAgentBoundAccountId` | | `plugin-sdk/status-helpers` | Asistentes compartidos de resumen de estado de canal/cuenta, valores predeterminados de estado de tiempo de ejecución y asistentes de metadatos de problemas | | `plugin-sdk/target-resolver-runtime` | Asistentes compartidos de resolución de objetivos | |
  `plugin-sdk/string-normalization-runtime` | Asistentes de normalización de slug/cadena | | `plugin-sdk/request-url` | Extraer URL de cadena de entradas similares a fetch/request | | `plugin-sdk/run-command` | Ejecutor de comandos cronometrado con resultados normalizados de stdout/stderr | | `plugin-sdk/param-readers` | Lectores comunes de parámetros de herramienta/CLI | |
  `plugin-sdk/tool-payload` | Extraer cargas útiles normalizadas de objetos de resultados de herramientas | | `plugin-sdk/tool-send` | Extraer campos de destino de envío canónicos de argumentos de herramienta | | `plugin-sdk/temp-path` | Asistentes compartidos de ruta de descarga temporal | | `plugin-sdk/logging-core` | Asistentes de registro y redacción de subsistemas | |
  `plugin-sdk/markdown-table-runtime` | Asistentes de modo de tabla Markdown | | `plugin-sdk/json-store` | Asistentes pequeños de lectura/escritura de estado JSON | | `plugin-sdk/file-lock` | Asistentes de bloqueo de archivos reentrantes | | `plugin-sdk/persistent-dedupe` | Asistentes de caché de deduplicación respaldada en disco | | `plugin-sdk/acp-runtime` | Asistentes de tiempo de
  ejecución/sesión y envío de respuestas de ACP | | `plugin-sdk/acp-binding-resolve-runtime` | Resolución de vinculación de ACP de solo lectura sin importaciones de inicio del ciclo de vida | | `plugin-sdk/agent-config-primitives` | Primitivas estrechas de esquema de configuración de tiempo de ejecución de agente | | `plugin-sdk/boolean-param` | Lector suelto de parámetros booleanos | |
  `plugin-sdk/dangerous-name-runtime` | Asistentes de resolución de coincidencia de nombres peligrosos | | `plugin-sdk/device-bootstrap` | Asistentes de token de arranque y emparejamiento de dispositivos | | `plugin-sdk/extension-shared` | Primitivas de asistente compartidas de canal pasivo, estado y proxy ambiental | | `plugin-sdk/models-provider-runtime` | Asistentes de respuesta de
  comando/proveedor `/models` | | `plugin-sdk/skill-commands-runtime` | Asistentes de listado de comandos de habilidades | | `plugin-sdk/native-command-registry` | Asistentes de registro/construcción/serialización de comandos nativos | | `plugin-sdk/agent-harness` | Superficie experimental de complementos de confianza para arneses de agentes de bajo nivel: tipos de arnés, asistentes de
  dirección/interrupción de ejecución activa, asistentes de puente de herramientas OpenClaw y utilidades de resultados de intentos | | `plugin-sdk/provider-zai-endpoint` | Asistentes de detección de puntos finales Z.AI | | `plugin-sdk/infra-runtime` | Asistentes de eventos/latidos del sistema | | `plugin-sdk/collection-runtime` | Asistentes de caché limitada pequeños | |
  `plugin-sdk/diagnostic-runtime` | Asistentes de indicadores y eventos de diagnóstico | | `plugin-sdk/error-runtime` | Gráfico de errores, formato, asistentes de clasificación de errores compartidos, `isApprovalNotFoundError` | | `plugin-sdk/fetch-runtime` | Asistentes de búsqueda, proxy y búsqueda fijada envueltos | | `plugin-sdk/runtime-fetch` | Búsqueda de tiempo de ejecución consciente del
  despachador sin importaciones de proxy/busqueda protegida | | `plugin-sdk/response-limit-runtime` | Lector de cuerpo de respuesta limitado sin la superficie de tiempo de ejecución de medios amplia | | `plugin-sdk/session-binding-runtime` | Estado de vinculación de conversación actual sin enrutamiento de vinculación configurado o almacenes de emparejamiento | | `plugin-sdk/session-store-runtime`
  | Asistentes de lectura de almacén de sesión sin importaciones amplias de escritura/mantenimiento de configuración | | `plugin-sdk/context-visibility-runtime` | Resolución de visibilidad de contexto y filtrado de contexto complementario sin importaciones amplias de configuración/seguridad | | `plugin-sdk/string-coerce-runtime` | Asistentes estrechos de coerción/normalización de registro/cadena
  primitiva sin importaciones de markdown/registro | | `plugin-sdk/host-runtime` | Asistentes de normalización de nombre de host y host SCP | | `plugin-sdk/retry-runtime` | Asistentes de configuración de reintento y ejecutor de reintento | | `plugin-sdk/agent-runtime` | Asistentes de directorio/identidad/espacio de trabajo de agente | | `plugin-sdk/directory-runtime` | Consulta/deduplicación de
  directorio respaldada por configuración | | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

<Accordion title="Subrutas de capacidades y pruebas">
  | Subruta | Exportaciones clave | | --- | --- | | `plugin-sdk/media-runtime` | Asistentes compartidos de obtención/transformación/almacenamiento de medios, además de constructores de cargas útiles de medios | | `plugin-sdk/media-generation-runtime` | Asistentes compartidos de conmutación por error de generación de medios, selección de candidatos y mensajería de modelos faltantes | |
  `plugin-sdk/media-understanding` | Tipos de proveedores de comprensión de medios, además de exportaciones de asistentes de imagen/audio para proveedores | | `plugin-sdk/text-runtime` | Asistentes compartidos de texto/markdown/registro, como eliminación de texto visible para el asistente, asistentes de representación/fragmentación/tablas de markdown, asistentes de redacción, asistentes de
  etiquetas de directivas y utilidades de texto seguro | | `plugin-sdk/text-chunking` | Asistente de fragmentación de texto saliente | | `plugin-sdk/speech` | Tipos de proveedores de voz, además de asistentes de directivas, registro y validación para proveedores | | `plugin-sdk/speech-core` | Tipos compartidos de proveedores de voz, registro, directivas y asistentes de normalización | |
  `plugin-sdk/realtime-transcription` | Tipos de proveedores de transcripción en tiempo real, asistentes de registro y asistente compartido de sesión WebSocket | | `plugin-sdk/realtime-voice` | Tipos de proveedores de voz en tiempo real y asistentes de registro | | `plugin-sdk/image-generation` | Tipos de proveedores de generación de imágenes | | `plugin-sdk/image-generation-core` | Tipos
  compartidos de generación de imágenes, conmutación por error, autenticación y asistentes de registro | | `plugin-sdk/music-generation` | Tipos de proveedor/solicitud/resultado de generación de música | | `plugin-sdk/music-generation-core` | Tipos compartidos de generación de música, asistentes de conmutación por error, búsqueda de proveedores y análisis de referencias de modelos | |
  `plugin-sdk/video-generation` | Tipos de proveedor/solicitud/resultado de generación de video | | `plugin-sdk/video-generation-core` | Tipos compartidos de generación de video, asistentes de conmutación por error, búsqueda de proveedores y análisis de referencias de modelos | | `plugin-sdk/webhook-targets` | Registro de destinos de webhook y asistentes de instalación de rutas | |
  `plugin-sdk/webhook-path` | Asistentes de normalización de rutas de webhook | | `plugin-sdk/web-media` | Asistentes compartidos de carga de medios remotos locales | | `plugin-sdk/zod` | `zod` reexportado para consumidores del SDK de complementos | | `plugin-sdk/testing` | `installCommonResolveTargetErrorCases`, `shouldAckReaction` |
</Accordion>

<Accordion title="Subrutas de memoria">
  | Subruta | Exportaciones clave | | --- | --- | | `plugin-sdk/memory-core` | Superficie de ayudante de memory-core incluida para ayudantes de gestor/configuración/archivo/CLI | | `plugin-sdk/memory-core-engine-runtime` | Fachada de tiempo de ejecución de índice/búsqueda de memoria | | `plugin-sdk/memory-core-host-engine-foundation` | Exportaciones del motor base del host de memoria | |
  `plugin-sdk/memory-core-host-engine-embeddings` | Contratos de integración del host de memoria, acceso al registro, proveedor local y ayudantes genéricos de proceso por lotes/remotos | | `plugin-sdk/memory-core-host-engine-qmd` | Exportaciones del motor QMD del host de memoria | | `plugin-sdk/memory-core-host-engine-storage` | Exportaciones del motor de almacenamiento del host de memoria | |
  `plugin-sdk/memory-core-host-multimodal` | Ayudantes multimodales del host de memoria | | `plugin-sdk/memory-core-host-query` | Ayudantes de consulta del host de memoria | | `plugin-sdk/memory-core-host-secret` | Ayudantes de secretos del host de memoria | | `plugin-sdk/memory-core-host-events` | Ayudantes de diario de eventos del host de memoria | | `plugin-sdk/memory-core-host-status` |
  Ayudantes de estado del host de memoria | | `plugin-sdk/memory-core-host-runtime-cli` | Ayudantes de tiempo de ejecución de CLI del host de memoria | | `plugin-sdk/memory-core-host-runtime-core` | Ayudantes de tiempo de ejecución central del host de memoria | | `plugin-sdk/memory-core-host-runtime-files` | Ayudantes de archivo/tiempo de ejecución del host de memoria | |
  `plugin-sdk/memory-host-core` | Alias neutral al proveedor para los ayudantes de tiempo de ejecución central del host de memoria | | `plugin-sdk/memory-host-events` | Alias neutral al proveedor para los ayudantes de diario de eventos del host de memoria | | `plugin-sdk/memory-host-files` | Alias neutral al proveedor para los ayudantes de archivo/tiempo de ejecución del host de memoria | |
  `plugin-sdk/memory-host-markdown` | Ayudantes de administrador-markdown compartidos para plugins adyacentes a la memoria | | `plugin-sdk/memory-host-search` | Fachada de tiempo de ejecución de memoria activa para el acceso al gestor de búsqueda | | `plugin-sdk/memory-host-status` | Alias neutral al proveedor para los ayudantes de estado del host de memoria | | `plugin-sdk/memory-lancedb` |
  Superficie de ayudante de memory-lancedb incluida |
</Accordion>

  <Accordion title="Subrutas de ayudantes agrupados reservados">
    | Familia | Subrutas actuales | Uso previsto |
    | --- | --- | --- |
    | Browser | `plugin-sdk/browser-cdp`, `plugin-sdk/browser-config-runtime`, `plugin-sdk/browser-config-support`, `plugin-sdk/browser-control-auth`, `plugin-sdk/browser-node-runtime`, `plugin-sdk/browser-profiles`, `plugin-sdk/browser-security-runtime`, `plugin-sdk/browser-setup-tools`, `plugin-sdk/browser-support` | Ayudantes de soporte de complementos del navegador agrupados (`browser-support` sigue siendo el barril de compatibilidad) |
    | Matrix | `plugin-sdk/matrix`, `plugin-sdk/matrix-helper`, `plugin-sdk/matrix-runtime-heavy`, `plugin-sdk/matrix-runtime-shared`, `plugin-sdk/matrix-runtime-surface`, `plugin-sdk/matrix-surface`, `plugin-sdk/matrix-thread-bindings` | Superficie de tiempo de ejecución/ayudante de Matrix agrupada |
    | Line | `plugin-sdk/line`, `plugin-sdk/line-core`, `plugin-sdk/line-runtime`, `plugin-sdk/line-surface` | Superficie de tiempo de ejecución/ayudante de LINE agrupada |
    | IRC | `plugin-sdk/irc`, `plugin-sdk/irc-surface` | Superficie de ayudante de IRC agrupada |
    | Channel-specific helpers | `plugin-sdk/googlechat`, `plugin-sdk/zalouser`, `plugin-sdk/bluebubbles`, `plugin-sdk/bluebubbles-policy`, `plugin-sdk/mattermost`, `plugin-sdk/mattermost-policy`, `plugin-sdk/feishu-conversation`, `plugin-sdk/msteams`, `plugin-sdk/nextcloud-talk`, `plugin-sdk/nostr`, `plugin-sdk/tlon`, `plugin-sdk/twitch` | Costuras de compatibilidad/ayudante de canal agrupadas |
    | Auth/plugin-specific helpers | `plugin-sdk/github-copilot-login`, `plugin-sdk/github-copilot-token`, `plugin-sdk/diagnostics-otel`, `plugin-sdk/diffs`, `plugin-sdk/llm-task`, `plugin-sdk/thread-ownership`, `plugin-sdk/voice-call` | Costuras de ayudante de complemento/característica agrupadas; `plugin-sdk/github-copilot-token` actualmente exporta `DEFAULT_COPILOT_API_BASE_URL`, `deriveCopilotApiBaseUrlFromToken` y `resolveCopilotApiToken` |
  </Accordion>
</AccordionGroup>

## API de registro

La devolución de llamada `register(api)` recibe un objeto `OpenClawPluginApi` con estos
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

| Método                                          | Lo que registra                                  |
| ----------------------------------------------- | ------------------------------------------------ |
| `api.registerHook(events, handler, opts?)`      | Gancho de eventos                                |
| `api.registerHttpRoute(params)`                 | Endpoint HTTP de puerta de enlace                |
| `api.registerGatewayMethod(name, handler)`      | Método RPC de puerta de enlace                   |
| `api.registerCli(registrar, opts?)`             | Subcomando de CLI                                |
| `api.registerService(service)`                  | Servicio en segundo plano                        |
| `api.registerInteractiveHandler(registration)`  | Controlador interactivo                          |
| `api.registerEmbeddedExtensionFactory(factory)` | Fábrica de extensión de ejecutor integrado de Pi |
| `api.registerMemoryPromptSupplement(builder)`   | Sección de prompt aditiva adyacente a la memoria |
| `api.registerMemoryCorpusSupplement(adapter)`   | Corpus de búsqueda/lectura de memoria aditiva    |

Los espacios de nombres de administración del núcleo reservados (`config.*`, `exec.approvals.*`, `wizard.*`,
`update.*`) siempre se mantienen `operator.admin`, incluso si un complemento intenta asignar un
alcance de método de pasarela más estrecho. Prefiera prefijos específicos del complemento para
los métodos propiedad del complemento.

Use `api.registerEmbeddedExtensionFactory(...)` cuando un complemento necesite tiempos de eventos
nativos de Pi durante las ejecuciones integradas de OpenClaw, por ejemplo reescrituras asíncronas de `tool_result`
que deben ocurrir antes de que se emita el mensaje final de resultado de herramienta.
Actualmente esta es una costura de complemento integrado (bundled-plugin): solo los complementos integrados pueden registrar uno, y
deben declarar `contracts.embeddedExtensionFactories: ["pi"]` en
`openclaw.plugin.json`. Mantenga los ganchos normales de complementos de OpenClaw para todo lo que
no requiera esa costura de nivel inferior.

### Metadatos de registro de CLI

`api.registerCli(registrar, opts?)` acepta dos tipos de metadatos de nivel superior:

- `commands`: raíces de comandos explícitas propiedad del registrador
- `descriptors`: descriptores de comandos en tiempo de análisis utilizados para la ayuda de la CLI raíz, el enrutamiento y el registro diferido de la CLI de complementos

Si desea que un comando de complemento permanezca con carga diferida en la ruta normal de la CLI raíz, proporcione `descriptors` que cubran cada raíz de comando de nivel superior expuesta por ese registrador.

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

Use `commands` por sí solo solo cuando no necesite el registro diferido de la CLI raíz. Esa ruta de compatibilidad ansiosa sigue siendo compatible, pero no instala marcadores de posición respaldados por descriptores para la carga diferida en tiempo de análisis.

### Registro del backend de CLI

`api.registerCliBackend(...)` permite que un complemento sea el propietario de la configuración predeterminada para un backend de CLI de IA local como `codex-cli`.

- El `id` del backend se convierte en el prefijo del proveedor en las referencias de modelo como `codex-cli/gpt-5`.
- El `config` del backend usa la misma forma que `agents.defaults.cliBackends.<id>`.
- La configuración del usuario sigue teniendo prioridad. OpenClaw fusiona `agents.defaults.cliBackends.<id>` sobre el valor predeterminado del complemento antes de ejecutar la CLI.
- Use `normalizeConfig` cuando un backend necesite reescrituras de compatibilidad después de la fusión (por ejemplo, para normalizar formas de antiguas marcas).

### Slots exclusivos

| Método                                     | Lo que registra                                                                                                                                                                   |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api.registerContextEngine(id, factory)`   | Motor de contexto (uno activo a la vez). La devolución de llamada `assemble()` recibe `availableTools` y `citationsMode` para que el motor pueda adaptar las adiciones al prompt. |
| `api.registerMemoryCapability(capability)` | Capacidad de memoria unificada                                                                                                                                                    |
| `api.registerMemoryPromptSection(builder)` | Constructor de sección de prompt de memoria                                                                                                                                       |
| `api.registerMemoryFlushPlan(resolver)`    | Resolvedor de plan de vaciado de memoria                                                                                                                                          |
| `api.registerMemoryRuntime(runtime)`       | Adaptador de tiempo de ejecución de memoria                                                                                                                                       |

### Adaptadores de incrustación de memoria

| Método                                         | Lo que registra                                                 |
| ---------------------------------------------- | --------------------------------------------------------------- |
| `api.registerMemoryEmbeddingProvider(adapter)` | Adaptador de incrustación de memoria para el complemento activo |

- `registerMemoryCapability` es la API exclusiva de complemento de memoria preferida.
- `registerMemoryCapability` también puede exponer `publicArtifacts.listArtifacts(...)`
  para que los complementos acompañantes puedan consumir los artefactos de memoria exportados a través de
  `openclaw/plugin-sdk/memory-host-core` en lugar de acceder al diseño privado de un complemento de memoria específico.
- `registerMemoryPromptSection`, `registerMemoryFlushPlan` y
  `registerMemoryRuntime` son API exclusivas de complementos de memoria compatibles con versiones anteriores.
- `registerMemoryEmbeddingProvider` permite que el complemento de memoria activo registre uno
  o más IDs de adaptador de incrustación (por ejemplo `openai`, `gemini` o un
  ID definido por el complemento personalizado).
- La configuración de usuario, como `agents.defaults.memorySearch.provider` y
  `agents.defaults.memorySearch.fallback`, se resuelve con respecto a esos IDs de
  adaptador registrados.

### Eventos y ciclo de vida

| Método                                       | Lo que hace                                     |
| -------------------------------------------- | ----------------------------------------------- |
| `api.on(hookName, handler, opts?)`           | Gancho de ciclo de vida tipado                  |
| `api.onConversationBindingResolved(handler)` | Devolución de llamada de enlace de conversación |

### Semántica de decisión del gancho

- `before_tool_call`: devolver `{ block: true }` es terminal. Una vez que cualquier controlador lo establece, se omiten los controladores de menor prioridad.
- `before_tool_call`: devolver `{ block: false }` se trata como sin decisión (igual que omitir `block`), no como una anulación.
- `before_install`: devolver `{ block: true }` es terminal. Una vez que cualquier controlador lo establece, se omiten los controladores de menor prioridad.
- `before_install`: devolver `{ block: false }` se trata como sin decisión (igual que omitir `block`), no como una anulación.
- `reply_dispatch`: devolver `{ handled: true, ... }` es terminal. Una vez que cualquier controlador reclama el envío, se omiten los controladores de menor prioridad y la ruta de envío del modelo predeterminado.
- `message_sending`: devolver `{ cancel: true }` es terminal. Una vez que cualquier controlador lo establece, se omiten los controladores de menor prioridad.
- `message_sending`: devolver `{ cancel: false }` se trata como sin decisión (igual que omitir `cancel`), no como una anulación.
- `message_received`: use el campo tipado `threadId` cuando necesite enrutamiento de hilos/temas entrantes. Mantenga `metadata` para extras específicos del canal.
- `message_sending`: utilice campos de enrutamiento `replyToId` / `threadId` tipados antes de recurrir a `metadata` específicos del canal.
- `gateway_start`: utilice `ctx.config`, `ctx.workspaceDir` y `ctx.getCron?.()` para el estado de inicio propiedad de la puerta de enlace en lugar de confiar en los enlaces `gateway:startup` internos.

### Campos del objeto API

| Campo                    | Tipo                      | Descripción                                                                                                       |
| ------------------------ | ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `api.id`                 | `string`                  | ID del complemento                                                                                                |
| `api.name`               | `string`                  | Nombre para mostrar                                                                                               |
| `api.version`            | `string?`                 | Versión del complemento (opcional)                                                                                |
| `api.description`        | `string?`                 | Descripción del complemento (opcional)                                                                            |
| `api.source`             | `string`                  | Ruta de origen del complemento                                                                                    |
| `api.rootDir`            | `string?`                 | Directorio raíz del complemento (opcional)                                                                        |
| `api.config`             | `OpenClawConfig`          | Instantánea de configuración actual (instantánea de tiempo de ejecución en memoria activa cuando está disponible) |
| `api.pluginConfig`       | `Record<string, unknown>` | Configuración específica del complemento de `plugins.entries.<id>.config`                                         |
| `api.runtime`            | `PluginRuntime`           | [Ayudantes de tiempo de ejecución](/es/plugins/sdk-runtime)                                                       |
| `api.logger`             | `PluginLogger`            | Registrador con alcance (`debug`, `info`, `warn`, `error`)                                                        |
| `api.registrationMode`   | `PluginRegistrationMode`  | Modo de carga actual; `"setup-runtime"` es la ventana ligera de inicio/configuración previa a la entrada completa |
| `api.resolvePath(input)` | `(string) => string`      | Resolver ruta relativa a la raíz del complemento                                                                  |

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
  Nunca importes tu propio plugin a través de `openclaw/plugin-sdk/<your-plugin>`
  desde el código de producción. Enruta las importaciones internas a través de `./api.ts` o
  `./runtime-api.ts`. La ruta del SDK es únicamente el contrato externo.
</Warning>

Las superficies públicas de los plugins empaquetados cargados por fachada (`api.ts`, `runtime-api.ts`,
`index.ts`, `setup-entry.ts` y archivos de entrada públicos similares) ahora prefieren la
instantánea de configuración de tiempo de ejecución activa cuando OpenClaw ya se está ejecutando. Si aún no existe ninguna
instantánea de tiempo de ejecución, recurren al archivo de configuración resuelto en disco.

Los plugins de proveedor también pueden exponer un contrato local de plugin limitado cuando un
asistente es intencionalmente específico del proveedor y aún no pertenece a una subruta genérica del
SDK. Ejemplo empaquetado actual: el proveedor Anthropic mantiene sus asistentes
de flujo Claude en su propia costura pública `api.ts` / `contract-api.ts` en lugar de
promover la lógica de encabezado beta de Anthropic y `service_tier` a un contrato
`plugin-sdk/*` genérico.

Otros ejemplos empaquetados actuales:

- `@openclaw/openai-provider`: `api.ts` exporta constructores de proveedores,
  asistentes de modelo predeterminado y constructores de proveedores en tiempo real
- `@openclaw/openrouter-provider`: `api.ts` exporta el constructor de proveedores más
  los asistentes de incorporación/configuración

<Warning>
  El código de producción de extensiones también debe evitar las importaciones `openclaw/plugin-sdk/<other-plugin>`
  . Si un asistente es realmente compartido, promuévelo a una subruta neutra del
  SDK como `openclaw/plugin-sdk/speech`, `.../provider-model-shared` u otra
  superficie orientada a capacidades en lugar de acoplar dos plugins juntos.
</Warning>

## Relacionado

- [Puntos de entrada](/es/plugins/sdk-entrypoints) — opciones `definePluginEntry` y `defineChannelPluginEntry`
- [Asistentes de tiempo de ejecución](/es/plugins/sdk-runtime) — referencia completa del espacio de nombres `api.runtime`
- [Configuración y ajustes](/es/plugins/sdk-setup) — empaquetado, manifiestos, esquemas de configuración
- [Pruebas](/es/plugins/sdk-testing) — utilidades de prueba y reglas de linting
- [Migración del SDK](/es/plugins/sdk-migration) — migración desde superficies obsoletas
- [Aspectos internos de los complementos](/es/plugins/architecture) — arquitectura profunda y modelo de capacidades
