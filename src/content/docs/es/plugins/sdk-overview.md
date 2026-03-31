---
title: "Resumen del SDK de complementos"
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

<Tip>**¿Buscas una guía de cómo hacerlo?** - ¿Tu primer plugin? Empieza con [Getting Started](/en/plugins/building-plugins) - ¿Plugin de canal? Consulta [Channel Plugins](/en/plugins/sdk-channel-plugins) - ¿Plugin de proveedor? Consulta [Provider Plugins](/en/plugins/sdk-provider-plugins)</Tip>

## Convención de importación

Importa siempre desde una subruta específica:

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/core";
```

Cada subruta es un módulo pequeño y autónomo. Esto mantiene el inicio rápido y
previene problemas de dependencias circulares.

## Referencia de subrutas

Las subrutas más utilizadas, agrupadas por propósito. La lista completa de más de 100
subrutas está en `scripts/lib/plugin-sdk-entrypoints.json`.

### Entrada del complemento

| Subruta                   | Exportaciones clave                                                                                                                    |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/plugin-entry` | `definePluginEntry`                                                                                                                    |
| `plugin-sdk/core`         | `defineChannelPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase`, `defineSetupPluginEntry`, `buildChannelConfigSchema` |

<AccordionGroup>
  <Accordion title="Subrutas de canal">
    | Subruta | Exportaciones clave |
    | --- | --- |
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface` |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | `createChannelReplyPipeline` |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter` |
    | `plugin-sdk/channel-config-schema` | Tipos de esquema de configuración del canal |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-lifecycle` | `createAccountStatusSink` |
    | `plugin-sdk/channel-inbound` | Funciones auxiliares de rebote, coincidencia de mención y sobre |
    | `plugin-sdk/channel-send-result` | Tipos de resultado de respuesta |
    | `plugin-sdk/channel-actions` | `createMessageToolButtonsSchema`, `createMessageToolCardSchema` |
    | `plugin-sdk/channel-targets` | Funciones auxiliares de análisis/coincidencia de objetivos |
    | `plugin-sdk/channel-contract` | Tipos de contrato de canal |
    | `plugin-sdk/channel-feedback` | Cableado de comentarios/reacciones |
  </Accordion>

<Accordion title="Subrutas del proveedor">
  | Subruta | Exportaciones clave | | --- | --- | | `plugin-sdk/cli-backend` | Valores predeterminados del backend de CLI + constantes de vigilancia | | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`, `ensureApiKeyFromOptionEnvOrPrompt`, `upsertAuthProfile` | | `plugin-sdk/provider-models` | Alias del modelo de proveedor compat heredados; se prefieren las subrutas específicas del
  proveedor o `plugin-sdk/provider-model-shared` | | `plugin-sdk/provider-model-shared` | `normalizeModelCompat` | | `plugin-sdk/provider-catalog-shared` | `findCatalogTemplate`, `buildSingleProviderApiKeyCatalog` | | `plugin-sdk/provider-catalog` | Alias del constructor de proveedor compat heredados; se prefieren las subrutas específicas del proveedor o `plugin-sdk/provider-catalog-shared` | |
  `plugin-sdk/provider-usage` | `fetchClaudeUsage` y similares | | `plugin-sdk/provider-stream` | Tipos de envoltorio de flujo | | `plugin-sdk/provider-onboard` | Asistentes de parche de configuración de incorporación | | `plugin-sdk/global-singleton` | Asistentes de singleton/mapa/caché local de proceso |
</Accordion>

<Accordion title="Subrutas de autenticación y seguridad">
  | Subruta | Exportaciones clave | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate` | | `plugin-sdk/allow-from` | `formatAllowFromLowercase` | | `plugin-sdk/secret-input` | Funciones auxiliares de análisis de entrada de secretos | | `plugin-sdk/webhook-ingress` | Funciones auxiliares de solicitud/destino de webhook | | `plugin-sdk/webhook-request-guards` | Funciones
  auxiliares de tamaño de cuerpo de solicitud/tiempo de espera |
</Accordion>

<Accordion title="Subrutas de tiempo de ejecución y almacenamiento">
  | Subruta | Exportaciones clave | | --- | --- | | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | | `plugin-sdk/config-runtime` | Asistentes de carga/escritura de configuración | | `plugin-sdk/approval-runtime` | Asistentes de ejecución y aprobación de complementos | | `plugin-sdk/infra-runtime` | Asistentes de eventos del sistema y latidos | | `plugin-sdk/collection-runtime` |
  Asistentes de caché pequeña y limitada | | `plugin-sdk/diagnostic-runtime` | Asistentes de bandera de diagnóstico y eventos | | `plugin-sdk/error-runtime` | Asistentes de gráfico de errores y formato | | `plugin-sdk/fetch-runtime` | Asistentes de recuperación envuelta, proxy y búsqueda anclada | | `plugin-sdk/host-runtime` | Asistentes de normalización de nombre de host y host SCP | |
  `plugin-sdk/retry-runtime` | Asistentes de configuración de reintento y ejecutor de reintento | | `plugin-sdk/agent-runtime` | Asistentes de directorio/identidad/espacio de trabajo del agente | | `plugin-sdk/directory-runtime` | Consulta/deduplicación de directorio respaldada por configuración | | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

  <Accordion title="Subrutas de capacidades y pruebas">
    | Subruta | Exportaciones clave |
    | --- | --- |
    | `plugin-sdk/image-generation` | Tipos de proveedor de generación de imágenes |
    | `plugin-sdk/media-understanding` | Tipos de proveedor de comprensión de medios |
    | `plugin-sdk/speech` | Tipos de proveedor de voz |
    | `plugin-sdk/testing` | `installCommonResolveTargetErrorCases`, `shouldAckReaction` |
  </Accordion>
</AccordionGroup>

## API de registro

La devolución de llamada `register(api)` recibe un objeto `OpenClawPluginApi` con estos
métodos:

### Registro de capacidades

| Método                                        | Lo que registra                  |
| --------------------------------------------- | -------------------------------- |
| `api.registerProvider(...)`                   | Inferencia de texto (LLM)        |
| `api.registerCliBackend(...)`                 | Motor de inferencia de CLI local |
| `api.registerChannel(...)`                    | Canal de mensajería              |
| `api.registerSpeechProvider(...)`             | Síntesis de texto a voz / STT    |
| `api.registerMediaUnderstandingProvider(...)` | Análisis de imagen/audio/vídeo   |
| `api.registerImageGenerationProvider(...)`    | Generación de imágenes           |
| `api.registerWebSearchProvider(...)`          | Búsqueda web                     |

### Herramientas y comandos

| Método                          | Lo que registra                                            |
| ------------------------------- | ---------------------------------------------------------- |
| `api.registerTool(tool, opts?)` | Herramienta de agente (obligatoria u `{ optional: true }`) |
| `api.registerCommand(def)`      | Comando personalizado (omite el LLM)                       |

### Infraestructura

| Método                                         | Lo que registra                      |
| ---------------------------------------------- | ------------------------------------ |
| `api.registerHook(events, handler, opts?)`     | Gancho de evento                     |
| `api.registerHttpRoute(params)`                | Endpoint HTTP de la puerta de enlace |
| `api.registerGatewayMethod(name, handler)`     | Método RPC de la puerta de enlace    |
| `api.registerCli(registrar, opts?)`            | Subcomando de CLI                    |
| `api.registerService(service)`                 | Servicio en segundo plano            |
| `api.registerInteractiveHandler(registration)` | Controlador interactivo              |

### Registro del backend de CLI

`api.registerCliBackend(...)` permite que un complemento sea el propietario de la configuración predeterminada para un
backend de CLI de IA local como `claude-cli` o `codex-cli`.

- El backend `id` se convierte en el prefijo del proveedor en referencias de modelos como `claude-cli/opus`.
- El backend `config` utiliza la misma forma que `agents.defaults.cliBackends.<id>`.
- La configuración del usuario todavía tiene prioridad. OpenClaw combina `agents.defaults.cliBackends.<id>` sobre la
  predeterminada del complemento antes de ejecutar la CLI.
- Use `normalizeConfig` cuando un backend necesite reescrituras de compatibilidad después de la combinación
  (por ejemplo, normalizar formas de banderas antiguas).

### Ranuras exclusivas

| Método                                     | Lo que registra                             |
| ------------------------------------------ | ------------------------------------------- |
| `api.registerContextEngine(id, factory)`   | Motor de contexto (uno activo a la vez)     |
| `api.registerMemoryPromptSection(builder)` | Generador de sección de aviso de memoria    |
| `api.registerMemoryFlushPlan(resolver)`    | Resolutor de plan de vaciado de memoria     |
| `api.registerMemoryRuntime(runtime)`       | Adaptador de tiempo de ejecución de memoria |

### Adaptadores de incrustación de memoria

| Método                                         | Lo que registra                                                 |
| ---------------------------------------------- | --------------------------------------------------------------- |
| `api.registerMemoryEmbeddingProvider(adapter)` | Adaptador de incrustación de memoria para el complemento activo |

- `registerMemoryPromptSection`, `registerMemoryFlushPlan` y
  `registerMemoryRuntime` son exclusivos de los complementos de memoria.
- `registerMemoryEmbeddingProvider` permite que el complemento de memoria activo registre uno
  o más identificadores de adaptador de incrustación (por ejemplo `openai`, `gemini` o un
  identificador definido por un complemento personalizado).
- La configuración de usuario, como `agents.defaults.memorySearch.provider` y
  `agents.defaults.memorySearch.fallback`, se resuelve respecto a esos identificadores
  de adaptador registrados.

### Eventos y ciclo de vida

| Método                                       | Lo que hace                                          |
| -------------------------------------------- | ---------------------------------------------------- |
| `api.on(hookName, handler, opts?)`           | Gancho de ciclo de vida tipado                       |
| `api.onConversationBindingResolved(handler)` | Devolución de llamada de vinculación de conversación |

### Semántica de decisión del gancho

- `before_tool_call`: devolver `{ block: true }` es terminal. Una vez que cualquier controlador lo establece, los controladores de menor prioridad se omiten.
- `before_tool_call`: devolver `{ block: false }` se trata como sin decisión (igual que omitir `block`), no como una anulación.
- `message_sending`: devolver `{ cancel: true }` es terminal. Una vez que cualquier controlador lo establece, los controladores de menor prioridad se omiten.
- `message_sending`: devolver `{ cancel: false }` se trata como sin decisión (igual que omitir `cancel`), no como una anulación.

### Campos del objeto API

| Campo                    | Tipo                      | Descripción                                                               |
| ------------------------ | ------------------------- | ------------------------------------------------------------------------- |
| `api.id`                 | `string`                  | Id. del complemento                                                       |
| `api.name`               | `string`                  | Nombre para mostrar                                                       |
| `api.version`            | `string?`                 | Versión del complemento (opcional)                                        |
| `api.description`        | `string?`                 | Descripción del complemento (opcional)                                    |
| `api.source`             | `string`                  | Ruta de origen del complemento                                            |
| `api.rootDir`            | `string?`                 | Directorio raíz del complemento (opcional)                                |
| `api.config`             | `OpenClawConfig`          | Instantánea de la configuración actual                                    |
| `api.pluginConfig`       | `Record<string, unknown>` | Configuración específica del complemento de `plugins.entries.<id>.config` |
| `api.runtime`            | `PluginRuntime`           | [Funciones auxiliares de ejecución](/en/plugins/sdk-runtime)              |
| `api.logger`             | `PluginLogger`            | Registrador con alcance (`debug`, `info`, `warn`, `error`)                |
| `api.registrationMode`   | `PluginRegistrationMode`  | `"full"`, `"setup-only"`, o `"setup-runtime"`                             |
| `api.resolvePath(input)` | `(string) => string`      | Resolver ruta relativa a la raíz del complemento                          |

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
  `./runtime-api.ts`. La ruta del SDK es solo el contrato externo.
</Warning>

## Relacionado

- [Puntos de entrada](/en/plugins/sdk-entrypoints) — opciones `definePluginEntry` y `defineChannelPluginEntry`
- [Ayudantes de tiempo de ejecución](/en/plugins/sdk-runtime) — referencia completa del espacio de nombres `api.runtime`
- [Configuración y ajustes](/en/plugins/sdk-setup) — empaquetado, manifiestos, esquemas de configuración
- [Pruebas](/en/plugins/sdk-testing) — utilidades de prueba y reglas de linting
- [Migración del SDK](/en/plugins/sdk-migration) — migración desde superficies obsoletas
- [Internos del Plugin](/en/plugins/architecture) — arquitectura profunda y modelo de capacidades
