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

<Tip>**¿Buscas una guía de procedimientos?** - ¿Es tu primer complemento? Comienza con [Introducción](/en/plugins/building-plugins) - ¿Complemento de canal? Consulta [Complementos de canal](/en/plugins/sdk-channel-plugins) - ¿Complemento de proveedor? Consulta [Complementos de proveedor](/en/plugins/sdk-provider-plugins)</Tip>

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
    | `plugin-sdk/config-schema` | Exportación del esquema Zod de `openclaw.json` raíz (`OpenClawSchema`) |
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`, más `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` |
    | `plugin-sdk/setup` | Asistentes compartidos del asistente de configuración, avisos de lista de permitidos, constructores de estado de configuración |
    | `plugin-sdk/setup-runtime` | `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
    | `plugin-sdk/setup-adapter-runtime` | `createEnvPatchedAccountSetupAdapter` |
    | `plugin-sdk/setup-tools` | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` |
    | `plugin-sdk/account-core` | Asistentes de configuración/acción-gate multicuenta, asistentes de reserva de cuenta predeterminada |
    | `plugin-sdk/account-id` | `DEFAULT_ACCOUNT_ID`, asistentes de normalización de account-id |
    | `plugin-sdk/account-resolution` | Búsqueda de cuenta + asistentes de reserva predeterminada |
    | `plugin-sdk/account-helpers` | Asistentes de lista de cuentas restringida/acción de cuenta |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | `createChannelReplyPipeline` |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter` |
    | `plugin-sdk/channel-config-schema` | Tipos de esquema de configuración de canal |
    | `plugin-sdk/telegram-command-config` | Asistentes de normalización/validación de comandos personalizados de Telegram con reserva de contrato agrupado |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-lifecycle` | `createAccountStatusSink` |
    | `plugin-sdk/inbound-envelope` | Asistentes compartidos de ruta entrante + constructor de sobre |
    | `plugin-sdk/inbound-reply-dispatch` | Asistentes compartidos de registro y envío entrantes |
    | `plugin-sdk/messaging-targets` | Asistentes de análisis/coincidencia de objetivos |
    | `plugin-sdk/outbound-media` | Asistentes compartidos de carga de medios salientes |
    | `plugin-sdk/outbound-runtime` | Asistentes de delegación de identidad/envío saliente |
    | `plugin-sdk/thread-bindings-runtime` | Ciclo de vida de vinculación de hilos y asistentes de adaptador |
    | `plugin-sdk/agent-media-payload` | Constructor de carga de medios de agente heredado |
    | `plugin-sdk/conversation-runtime` | Vinculación de conversación/hilos, emparejamiento y asistentes de vinculación configurada |
    | `plugin-sdk/runtime-config-snapshot` | Asistente de instantáneas de configuración en tiempo de ejecución |
    | `plugin-sdk/runtime-group-policy` | Asistentes de resolución de políticas de grupo en tiempo de ejecución |
    | `plugin-sdk/channel-status` | Asistentes compartidos de instantánea/resumen de estado del canal |
    | `plugin-sdk/channel-config-primitives` | Primitivas de esquema de configuración de canal restringido |
    | `plugin-sdk/channel-config-writes` | Asistentes de autorización de escritura de configuración de canal |
    | `plugin-sdk/channel-plugin-common` | Exportaciones de preámbulo compartidas del complemento de canal |
    | `plugin-sdk/allowlist-config-edit` | Asistentes de edición/lectura de configuración de lista de permitidos |
    | `plugin-sdk/group-access` | Asistentes compartidos de decisiones de acceso de grupo |
    | `plugin-sdk/direct-dm` | Asistentes compartidos de autorización/guardia de DM directo |
    | `plugin-sdk/interactive-runtime` | Asistentes de normalización/reducción de carga de respuesta interactiva |
    | `plugin-sdk/channel-inbound` | Rebote, coincidencia de mención, asistentes de sobre |
    | `plugin-sdk/channel-send-result` | Tipos de resultados de respuesta |
    | `plugin-sdk/channel-actions` | `createMessageToolButtonsSchema`, `createMessageToolCardSchema` |
    | `plugin-sdk/channel-targets` | Asistentes de análisis/coincidencia de objetivos |
    | `plugin-sdk/channel-contract` | Tipos de contrato de canal |
    | `plugin-sdk/channel-feedback` | Conexión de comentarios/reacciones |
  </Accordion>

<Accordion title="Subrutas de proveedores">
  | Subruta | Exportaciones clave | | --- | --- | | `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry` | | `plugin-sdk/provider-setup` | Auxiliares de configuración de proveedores locales/autoalojados curados | | `plugin-sdk/self-hosted-provider-setup` | Auxiliares de configuración de proveedores autoalojados compatibles con OpenAI enfocados | | `plugin-sdk/provider-auth-runtime` |
  Auxiliares de resolución de claves API en tiempo de ejecución para complementos de proveedor | | `plugin-sdk/provider-auth-api-key` | Auxiliares de incorporación de claves API/escritura de perfiles | | `plugin-sdk/provider-auth-result` | Constructor de resultados de autenticación OAuth estándar | | `plugin-sdk/provider-auth-login` | Auxiliares de inicio de sesión interactivo compartidos para
  complementos de proveedor | | `plugin-sdk/provider-env-vars` | Auxiliares de búsqueda de variables de entorno de autenticación de proveedor | | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`, `ensureApiKeyFromOptionEnvOrPrompt`, `upsertAuthProfile` | | `plugin-sdk/provider-model-shared` | `ProviderReplayFamily`, `buildProviderReplayFamilyHooks`, `normalizeModelCompat`,
  constructores de políticas de reproducción compartidas, auxiliares de puntos finales de proveedor y auxiliares de normalización de ID de modelo como `normalizeNativeXaiModelId` | | `plugin-sdk/provider-catalog-shared` | `findCatalogTemplate`, `buildSingleProviderApiKeyCatalog`, `supportsNativeStreamingUsageCompat`, `applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-http` |
  Auxiliares de capacidades HTTP/punto final genéricas de proveedor | | `plugin-sdk/provider-web-fetch` | Auxiliares de registro/caché de proveedor de recuperación web | | `plugin-sdk/provider-web-search` | Auxiliares de registro/caché/configuración de proveedor de búsqueda web | | `plugin-sdk/provider-tools` | `ProviderToolCompatFamily`, `buildProviderToolCompatFamilyHooks`, limpieza y
  diagnóstico del esquema de Gemini, y auxiliares de compatibilidad con xAI como `resolveXaiModelCompatPatch` / `applyXaiModelCompat` | | `plugin-sdk/provider-usage` | `fetchClaudeUsage` y similares | | `plugin-sdk/provider-stream` | `ProviderStreamFamily`, `buildProviderStreamFamilyHooks`, `composeProviderStreamWrappers`, tipos de envoltorio de flujo y auxiliares de envoltorio compartidos para
  Anthropic/Bedrock/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot | | `plugin-sdk/provider-onboard` | Auxiliares de parches de configuración de incorporación | | `plugin-sdk/global-singleton` | Auxiliares de singleton/mapa/caché locales de proceso |
</Accordion>

<Accordion title="Subrutas de autenticación y seguridad">
  | Subpath | Exportaciones clave | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate`, asistentes de registro de comandos, asistentes de autorización del remitente | | `plugin-sdk/approval-auth-runtime` | Resolución del aprobador y asistentes de autenticación de acciones del mismo chat | | `plugin-sdk/approval-client-runtime` | Asistentes de perfil/filtro de aprobación de
  ejecución nativa | | `plugin-sdk/approval-delivery-runtime` | Adaptadores de capacidad/entrega de aprobación nativa | | `plugin-sdk/approval-native-runtime` | Objetivo de aprobación nativa + asistentes de vinculación de cuentas | | `plugin-sdk/approval-reply-runtime` | Asistentes de carga útil de respuesta de aprobación de ejecución/complemento | | `plugin-sdk/command-auth-native` |
  Autenticación de comandos nativos + asistentes de destino de sesión nativa | | `plugin-sdk/command-detection` | Asistentes de detección de comandos compartidos | | `plugin-sdk/command-surface` | Normalización del cuerpo del comando y asistentes de superficie del comando | | `plugin-sdk/allow-from` | `formatAllowFromLowercase` | | `plugin-sdk/security-runtime` | Confianza compartida, restricción
  de DM, contenido externo y asistentes de recopilación de secretos | | `plugin-sdk/ssrf-policy` | Lista de permitidos de host y asistentes de política SSRF de red privada | | `plugin-sdk/ssrf-runtime` | Despachador anclado, búsqueda protegida por SSRF y asistentes de política SSRF | | `plugin-sdk/secret-input` | Asistentes de análisis de entrada de secretos | | `plugin-sdk/webhook-ingress` |
  Asistentes de solicitud/destino de Webhook | | `plugin-sdk/webhook-request-guards` | Asistentes de tamaño de cuerpo de solicitud/tiempo de espera |
</Accordion>

<Accordion title="Subrutas de tiempo de ejecución y almacenamiento">
  | Subruta | Exportaciones clave | | --- | --- | | `plugin-sdk/runtime` | Funciones auxiliares amplias de tiempo de ejecución/registro/copias de seguridad/instalación de complementos | | `plugin-sdk/runtime-env` | Funciones auxiliares estrechas de entorno de tiempo de ejecución, registrador, tiempo de espera, reintento y retroceso exponencial | | `plugin-sdk/runtime-store` |
  `createPluginRuntimeStore` | | `plugin-sdk/plugin-runtime` | Funciones auxiliares compartidas de comandos de complementos/ganchos/HTTP/interactivos | | `plugin-sdk/hook-runtime` | Funciones auxiliares compartidas de canalización de webhooks/ganchos internos | | `plugin-sdk/lazy-runtime` | Funciones auxiliares de importación/vinculación de tiempo de ejecución diferidas, como
  `createLazyRuntimeModule`, `createLazyRuntimeMethod` y `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | Funciones auxiliares de ejecución de procesos | | `plugin-sdk/cli-runtime` | Funciones auxiliares de formato CLI, espera y versión | | `plugin-sdk/gateway-runtime` | Funciones auxiliares de cliente de puerta de enlace y parches de estado de canal | | `plugin-sdk/config-runtime` |
  Funciones auxiliares de carga/escritura de configuración | | `plugin-sdk/telegram-command-config` | Normalización de nombre/descripción de comandos de Telegram y verificaciones de duplicados/conflictos, incluso cuando la superficie del contrato de Telegram empaquetado no está disponible | | `plugin-sdk/approval-runtime` | Funciones auxiliares de aprobación de ejecución/complemento, constructores
  de capacidades de aprobación, funciones auxiliares de autenticación/perfil, funciones auxiliares de enrutamiento nativo/tiempo de ejecución | | `plugin-sdk/reply-runtime` | Funciones auxiliares compartidas de tiempo de ejecución de entrada/respuesta, fragmentación, despacho, latido y planificador de respuestas | | `plugin-sdk/reply-dispatch-runtime` | Funciones auxiliares estrechas de
  despacho/finalización de respuestas | | `plugin-sdk/reply-history` | Funciones auxiliares compartidas de historial de respuestas de ventana corta, como `buildHistoryContext`, `recordPendingHistoryEntry` y `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | Funciones auxiliares estrechas de fragmentación de
  texto/markdown | | `plugin-sdk/session-store-runtime` | Funciones auxiliares de ruta de almacenamiento de sesión + actualizado en | | `plugin-sdk/state-paths` | Funciones auxiliares de ruta de directorio de estado/OAuth | | `plugin-sdk/routing` | Funciones auxiliares de vinculación de ruta/clave de sesión/cuenta, como `resolveAgentRoute`, `buildAgentSessionKey` y
  `resolveDefaultAgentBoundAccountId` | | `plugin-sdk/status-helpers` | Funciones auxiliares compartidas de resumen de estado de canal/cuenta, valores predeterminados de estado de tiempo de ejecución y funciones auxiliares de metadatos de problemas | | `plugin-sdk/target-resolver-runtime` | Funciones auxiliares compartidas de resolución de objetivos | | `plugin-sdk/string-normalization-runtime` |
  Funciones auxiliares de normalización de slug/cadena | | `plugin-sdk/request-url` | Extraer URLs de cadenas de entradas tipo fetch/request | | `plugin-sdk/run-command` | Ejecutor de comandos cronometrado con resultados normalizados de stdout/stderr | | `plugin-sdk/param-readers` | Lectores de parámetros comunes de herramienta/CLI | | `plugin-sdk/tool-send` | Extraer campos de destino de envío
  canónicos de argumentos de herramienta | | `plugin-sdk/temp-path` | Funciones auxiliares compartidas de ruta de descarga temporal | | `plugin-sdk/logging-core` | Funciones auxiliares de registrador de subsistema y redacción | | `plugin-sdk/markdown-table-runtime` | Funciones auxiliares de modo de tabla Markdown | | `plugin-sdk/json-store` | Funciones auxiliares pequeñas de lectura/escritura de
  estado JSON | | `plugin-sdk/file-lock` | Funciones auxiliares de bloqueo de archivos reentrantes | | `plugin-sdk/persistent-dedupe` | Funciones auxiliares de caché de deduplicación respaldada en disco | | `plugin-sdk/acp-runtime` | Funciones auxiliares de tiempo de ejecución/sesión ACP y despacho de respuestas | | `plugin-sdk/agent-config-primitives` | Primitivas estrechas de esquema de
  configuración de tiempo de ejecución de agente | | `plugin-sdk/boolean-param` | Lector suelto de parámetros booleanos | | `plugin-sdk/dangerous-name-runtime` | Funciones auxiliares de resolución de coincidencias de nombres peligrosos | | `plugin-sdk/device-bootstrap` | Funciones auxiliares de arranque de dispositivo y token de emparejamiento | | `plugin-sdk/extension-shared` | Primitivas
  compartidas de canal pasivo y funciones auxiliares de estado | | `plugin-sdk/models-provider-runtime` | Funciones auxiliares de respuesta de comando/proveedor `/models` | | `plugin-sdk/skill-commands-runtime` | Funciones auxiliares de listado de comandos de habilidades | | `plugin-sdk/native-command-registry` | Funciones auxiliares de registro/construcción/serialización de comandos nativos | |
  `plugin-sdk/provider-zai-endpoint` | Funciones auxiliares de detección de puntos finales Z.AI | | `plugin-sdk/infra-runtime` | Funciones auxiliares de eventos del sistema/latidos | | `plugin-sdk/collection-runtime` | Funciones auxiliares de caché pequeña y limitada | | `plugin-sdk/diagnostic-runtime` | Funciones auxiliares de banderas y eventos de diagnóstico | | `plugin-sdk/error-runtime` |
  Gráfico de errores, formato, funciones auxiliares compartidas de clasificación de errores, `isApprovalNotFoundError` | | `plugin-sdk/fetch-runtime` | Funciones auxiliares de búsqueda ajustada, proxy y búsqueda anclada | | `plugin-sdk/host-runtime` | Funciones auxiliares de normalización de nombre de host y host SCP | | `plugin-sdk/retry-runtime` | Funciones auxiliares de configuración de
  reintento y ejecutor de reintento | | `plugin-sdk/agent-runtime` | Funciones auxiliares de directorio/identidad/espacio de trabajo del agente | | `plugin-sdk/directory-runtime` | Consulta/deduplicación de directorio respaldada en configuración | | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

<Accordion title="Subrutas de capacidades y pruebas">
  | Subruta | Exportaciones clave | | --- | --- | | `plugin-sdk/media-runtime` | Asistentes compartidos de obtención/transformación/almacenamiento de medios más constructores de carga útil de medios | | `plugin-sdk/media-understanding` | Tipos de proveedor de comprensión de medios más exportaciones de asistentes de imagen/audio orientadas al proveedor | | `plugin-sdk/text-runtime` | Asistentes
  compartidos de texto/markdown/registro, como eliminación de texto visible para el asistente, asistentes de representación/fragmentación/tablas de markdown, asistentes de redacción, asistentes de etiquetas de directiva y utilidades de texto seguro | | `plugin-sdk/text-chunking` | Asistente de fragmentación de texto saliente | | `plugin-sdk/speech` | Tipos de proveedor de voz más asistentes de
  directiva, registro y validación orientados al proveedor | | `plugin-sdk/speech-core` | Tipos compartidos de proveedor de voz, registro, directiva y asistentes de normalización | | `plugin-sdk/realtime-transcription` | Tipos de proveedor de transcripción en tiempo real y asistentes de registro | | `plugin-sdk/realtime-voice` | Tipos de proveedor de voz en tiempo real y asistentes de registro | |
  `plugin-sdk/image-generation` | Tipos de proveedor de generación de imágenes | | `plugin-sdk/image-generation-core` | Tipos compartidos de generación de imágenes, conmutación por error, autenticación y asistentes de registro | | `plugin-sdk/music-generation` | Tipos de proveedor/solicitud/resultado de generación de música | | `plugin-sdk/music-generation-core` | Tipos compartidos de generación
  de música, asistentes de conmutación por error, búsqueda de proveedor y análisis de referencia de modelo | | `plugin-sdk/video-generation` | Tipos de proveedor/solicitud/resultado de generación de video | | `plugin-sdk/video-generation-core` | Tipos compartidos de generación de video, asistentes de conmutación por error, búsqueda de proveedor y análisis de referencia de modelo | |
  `plugin-sdk/webhook-targets` | Registro de destino de webhook y asistentes de instalación de rutas | | `plugin-sdk/webhook-path` | Asistentes de normalización de rutas de webhook | | `plugin-sdk/web-media` | Asistentes compartidos de carga de medios remotos/locale | | `plugin-sdk/zod` | `zod` reexportado para consumidores del SDK de complementos | | `plugin-sdk/testing` |
  `installCommonResolveTargetErrorCases`, `shouldAckReaction` |
</Accordion>

<Accordion title="Subrutas de memoria">
  | Subruta | Exportaciones clave | | --- | --- | | `plugin-sdk/memory-core` | Superficie de ayuda agrupada de memory-core para asistentes de manager/config/archivo/CLI | | `plugin-sdk/memory-core-engine-runtime` | Fachada de tiempo de ejecución de índice/búsqueda de memoria | | `plugin-sdk/memory-core-host-engine-foundation` | Exportaciones del motor de base de host de memoria | |
  `plugin-sdk/memory-core-host-engine-embeddings` | Exportaciones del motor de incrustación de host de memoria | | `plugin-sdk/memory-core-host-engine-qmd` | Exportaciones del motor QMD de host de memoria | | `plugin-sdk/memory-core-host-engine-storage` | Exportaciones del motor de almacenamiento de host de memoria | | `plugin-sdk/memory-core-host-multimodal` | Asistentes multimodales de host de
  memoria | | `plugin-sdk/memory-core-host-query` | Asistentes de consulta de host de memoria | | `plugin-sdk/memory-core-host-secret` | Asistentes de secretos de host de memoria | | `plugin-sdk/memory-core-host-status` | Asistentes de estado de host de memoria | | `plugin-sdk/memory-core-host-runtime-cli` | Asistentes de tiempo de ejecución de CLI de host de memoria | |
  `plugin-sdk/memory-core-host-runtime-core` | Asistentes de tiempo de ejecución central de host de memoria | | `plugin-sdk/memory-core-host-runtime-files` | Asistentes de archivo/tiempo de ejecución de host de memoria | | `plugin-sdk/memory-lancedb` | Superficie de ayuda agrupada de memory-lancedb |
</Accordion>

  <Accordion title="Subrutas de ayudantes empaquetados reservados">
    | Familia | Subrutas actuales | Uso previsto |
    | --- | --- | --- |
    | Navegador | `plugin-sdk/browser-cdp`, `plugin-sdk/browser-config-runtime`, `plugin-sdk/browser-config-support`, `plugin-sdk/browser-control-auth`, `plugin-sdk/browser-node-runtime`, `plugin-sdk/browser-profiles`, `plugin-sdk/browser-security-runtime`, `plugin-sdk/browser-setup-tools`, `plugin-sdk/browser-support` | Ayudantes de soporte para complementos del navegador empaquetados (`browser-support` sigue siendo el barril de compatibilidad) |
    | Matrix | `plugin-sdk/matrix`, `plugin-sdk/matrix-helper`, `plugin-sdk/matrix-runtime-heavy`, `plugin-sdk/matrix-runtime-shared`, `plugin-sdk/matrix-runtime-surface`, `plugin-sdk/matrix-surface`, `plugin-sdk/matrix-thread-bindings` | Superficie de ayudante/tiempo de ejecución de Matrix empaquetada |
    | Line | `plugin-sdk/line`, `plugin-sdk/line-core`, `plugin-sdk/line-runtime`, `plugin-sdk/line-surface` | Superficie de ayudante/tiempo de ejecución de LINE empaquetada |
    | IRC | `plugin-sdk/irc`, `plugin-sdk/irc-surface` | Superficie de ayudante de IRC empaquetada |
    | Ayudantes específicos del canal | `plugin-sdk/googlechat`, `plugin-sdk/zalouser`, `plugin-sdk/bluebubbles`, `plugin-sdk/bluebubbles-policy`, `plugin-sdk/mattermost`, `plugin-sdk/mattermost-policy`, `plugin-sdk/feishu-conversation`, `plugin-sdk/msteams`, `plugin-sdk/nextcloud-talk`, `plugin-sdk/nostr`, `plugin-sdk/tlon`, `plugin-sdk/twitch` | Costuras de compatibilidad/ayudante de canal empaquetadas |
    | Ayudantes específicos de autenticación/complementos | `plugin-sdk/github-copilot-login`, `plugin-sdk/github-copilot-token`, `plugin-sdk/diagnostics-otel`, `plugin-sdk/diffs`, `plugin-sdk/llm-task`, `plugin-sdk/thread-ownership`, `plugin-sdk/voice-call` | Costuras de ayudante de complementos/características empaquetadas; `plugin-sdk/github-copilot-token` actualmente exporta `DEFAULT_COPILOT_API_BASE_URL`, `deriveCopilotApiBaseUrlFromToken` y `resolveCopilotApiToken` |
  </Accordion>
</AccordionGroup>

## API de registro

La devolución de llamada `register(api)` recibe un objeto `OpenClawPluginApi` con estos
métodos:

### Registro de capacidades

| Método                                           | Lo que registra                             |
| ------------------------------------------------ | ------------------------------------------- |
| `api.registerProvider(...)`                      | Inferencia de texto (LLM)                   |
| `api.registerChannel(...)`                       | Canal de mensajería                         |
| `api.registerSpeechProvider(...)`                | Síntesis de texto a voz / STT               |
| `api.registerRealtimeTranscriptionProvider(...)` | Transcripción en tiempo real de transmisión |
| `api.registerRealtimeVoiceProvider(...)`         | Sesiones de voz en tiempo real dúplex       |
| `api.registerMediaUnderstandingProvider(...)`    | Análisis de imagen/audio/vídeo              |
| `api.registerImageGenerationProvider(...)`       | Generación de imágenes                      |
| `api.registerMusicGenerationProvider(...)`       | Generación de música                        |
| `api.registerVideoGenerationProvider(...)`       | Generación de vídeo                         |
| `api.registerWebFetchProvider(...)`              | Proveedor de recuperación/extracción web    |
| `api.registerWebSearchProvider(...)`             | Búsqueda web                                |

### Herramientas y comandos

| Método                          | Lo que registra                                            |
| ------------------------------- | ---------------------------------------------------------- |
| `api.registerTool(tool, opts?)` | Herramienta de agente (obligatoria u `{ optional: true }`) |
| `api.registerCommand(def)`      | Comando personalizado (omite el LLM)                       |

### Infraestructura

| Método                                         | Lo que registra                      |
| ---------------------------------------------- | ------------------------------------ |
| `api.registerHook(events, handler, opts?)`     | Gancho de eventos                    |
| `api.registerHttpRoute(params)`                | Punto final HTTP de puerta de enlace |
| `api.registerGatewayMethod(name, handler)`     | Método RPC de puerta de enlace       |
| `api.registerCli(registrar, opts?)`            | Subcomando de CLI                    |
| `api.registerService(service)`                 | Servicio en segundo plano            |
| `api.registerInteractiveHandler(registration)` | Controlador interactivo              |

Los espacios de nombres de administración principal reservados (`config.*`, `exec.approvals.*`, `wizard.*`,
`update.*`) siempre se mantienen `operator.admin`, incluso si un complemento intenta asignar un
alcance de método de puerta de enlace más estrecho. Se prefieren prefijos específicos del complemento para
los métodos propiedad del complemento.

### Metadatos de registro de CLI

`api.registerCli(registrar, opts?)` acepta dos tipos de metadatos de nivel superior:

- `commands`: raíces de comandos explícitas propiedad del registrador
- `descriptors`: descriptores de comandos en tiempo de análisis utilizados para la ayuda de la CLI raíz,
  enrutamiento y registro diferido de la CLI del complemento

Si desea que un comando de complemento se mantenga cargado de forma diferida en la ruta raíz normal de la CLI, proporcione `descriptors` que cubran cada raíz de comando de nivel superior expuesta por ese registrador.

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

Use `commands` por sí solo solo cuando no necesite el registro diferido de la CLI raíz. Esa ruta de compatidad ansiosa sigue siendo compatible, pero no instala marcadores de posición respaldados por descriptores para la carga diferida en el momento de análisis.

### Slots exclusivos

| Método                                     | Lo que registra                                  |
| ------------------------------------------ | ------------------------------------------------ |
| `api.registerContextEngine(id, factory)`   | Motor de contexto (uno activo a la vez)          |
| `api.registerMemoryPromptSection(builder)` | Generador de sección de instrucciones de memoria |
| `api.registerMemoryFlushPlan(resolver)`    | Resolución del plan de vaciado de memoria        |
| `api.registerMemoryRuntime(runtime)`       | Adaptador de tiempo de ejecución de memoria      |

### Adaptadores de incrustación de memoria

| Método                                         | Lo que registra                                                 |
| ---------------------------------------------- | --------------------------------------------------------------- |
| `api.registerMemoryEmbeddingProvider(adapter)` | Adaptador de incrustación de memoria para el complemento activo |

- `registerMemoryPromptSection`, `registerMemoryFlushPlan` y
  `registerMemoryRuntime` son exclusivos de los complementos de memoria.
- `registerMemoryEmbeddingProvider` permite que el complemento de memoria activo registre uno
  o más ID de adaptadores de incrustación (por ejemplo, `openai`, `gemini`, o un
  ID definido por el complemento personalizado).
- La configuración de usuario, como `agents.defaults.memorySearch.provider` y
  `agents.defaults.memorySearch.fallback`, se resuelve en función de esos ID de
  adaptadores registrados.

### Eventos y ciclo de vida

| Método                                       | Lo que hace                                          |
| -------------------------------------------- | ---------------------------------------------------- |
| `api.on(hookName, handler, opts?)`           | Gancho de ciclo de vida con tipo                     |
| `api.onConversationBindingResolved(handler)` | Devolución de llamada de vinculación de conversación |

### Semántica de decisión del gancho

- `before_tool_call`: devolver `{ block: true }` es terminal. Una vez que cualquier controlador lo establece, se omiten los controladores de menor prioridad.
- `before_tool_call`: devolver `{ block: false }` se trata como sin decisión (lo mismo que omitir `block`), no como una anulación.
- `before_install`: devolver `{ block: true }` es terminal. Una vez que cualquier controlador lo establece, se omiten los controladores de menor prioridad.
- `before_install`: devolver `{ block: false }` se trata como sin decisión (lo mismo que omitir `block`), no como una anulación.
- `reply_dispatch`: devolver `{ handled: true, ... }` es terminal. Una vez que cualquier controlador reclama el despacho, se omiten los controladores de menor prioridad y la ruta de despacho del modelo predeterminado.
- `message_sending`: devolver `{ cancel: true }` es terminal. Una vez que cualquier controlador lo establece, se omiten los controladores de menor prioridad.
- `message_sending`: devolver `{ cancel: false }` se trata como sin decisión (lo mismo que omitir `cancel`), no como una anulación.

### Campos del objeto API

| Campo                    | Tipo                      | Descripción                                                                                                       |
| ------------------------ | ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `api.id`                 | `string`                  | Id. del complemento                                                                                               |
| `api.name`               | `string`                  | Nombre para mostrar                                                                                               |
| `api.version`            | `string?`                 | Versión del complemento (opcional)                                                                                |
| `api.description`        | `string?`                 | Descripción del complemento (opcional)                                                                            |
| `api.source`             | `string`                  | Ruta de origen del complemento                                                                                    |
| `api.rootDir`            | `string?`                 | Directorio raíz del complemento (opcional)                                                                        |
| `api.config`             | `OpenClawConfig`          | Instantánea de configuración actual (instantánea de ejecución en memoria activa cuando esté disponible)           |
| `api.pluginConfig`       | `Record<string, unknown>` | Configuración específica del complemento de `plugins.entries.<id>.config`                                         |
| `api.runtime`            | `PluginRuntime`           | [Ayudantes de tiempo de ejecución](/en/plugins/sdk-runtime)                                                       |
| `api.logger`             | `PluginLogger`            | Registrador con alcance (`debug`, `info`, `warn`, `error`)                                                        |
| `api.registrationMode`   | `PluginRegistrationMode`  | Modo de carga actual; `"setup-runtime"` es la ventana de inicio/configuración previa ligera a la entrada completa |
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
  Nunca importe su propio complemento a través de `openclaw/plugin-sdk/<your-plugin>`
  desde el código de producción. Enrute las importaciones internas a través de `./api.ts` o
  `./runtime-api.ts`. La ruta del SDK es solo el contrato externo.
</Warning>

Las superficies públicas de complementos empaquetados cargados por fachada (`api.ts`, `runtime-api.ts`,
`index.ts`, `setup-entry.ts` y archivos de entrada públicos similares) ahora prefieren la
instantánea de configuración de tiempo de ejecución activa cuando OpenClaw ya se está ejecutando. Si aún no existe ninguna
instantánea de tiempo de ejecución, recurren al archivo de configuración resuelto en el disco.

Los complementos de proveedor también pueden exponer un contrato local de complemento estrecho cuando un
asistente es intencionalmente específico del proveedor y aún no pertenece a una subruta de SDK
genérica. Ejemplo empaquetado actual: el proveedor Anthropic mantiene sus asistentes
de flujo Claude en su propia costura pública `api.ts` / `contract-api.ts` en lugar de
promover la lógica de encabezado beta de Anthropic y `service_tier` a un contrato
`plugin-sdk/*` genérico.

Otros ejemplos empaquetados actuales:

- `@openclaw/openai-provider`: `api.ts` exporta constructores de proveedores,
  asistentes de modelo predeterminado y constructores de proveedores en tiempo real
- `@openclaw/openrouter-provider`: `api.ts` exporta el constructor del proveedor más
  asistentes de incorporación/configuración

<Warning>
  El código de producción de extensiones también debe evitar las importaciones `openclaw/plugin-sdk/<other-plugin>`.
  Si un asistente es realmente compartido, promuévalo a una subruta de SDK neutral
  como `openclaw/plugin-sdk/speech`, `.../provider-model-shared` u otra
  superficie orientada a capacidades en lugar de acoplar dos complementos juntos.
</Warning>

## Relacionado

- [Puntos de entrada](/en/plugins/sdk-entrypoints) — opciones `definePluginEntry` y `defineChannelPluginEntry`
- [Asistentes de tiempo de ejecución](/en/plugins/sdk-runtime) — referencia completa del espacio de nombres `api.runtime`
- [Configuración](/en/plugins/sdk-setup) — empaquetado, manifiestos, esquemas de configuración
- [Pruebas](/en/plugins/sdk-testing) — utilidades de prueba y reglas de linting
- [Migración del SDK](/en/plugins/sdk-migration) — migración desde superficies obsoletas
- [Aspectos internos de los complementos](/en/plugins/architecture) — arquitectura profunda y modelo de capacidades
