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

<Tip>**¿Buscas una guía práctica?** - ¿Primer complemento? Comienza con [Cómo empezar](/es/plugins/building-plugins) - ¿Complemento de canal? Consulta [Complementos de canal](/es/plugins/sdk-channel-plugins) - ¿Complemento de proveedor? Consulta [Complementos de proveedor](/es/plugins/sdk-provider-plugins)</Tip>

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
  | Subruta | Exportaciones clave | | --- | --- | | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`, `ensureApiKeyFromOptionEnvOrPrompt`, `upsertAuthProfile` | | `plugin-sdk/provider-models` | `normalizeModelCompat` | | `plugin-sdk/provider-catalog` | Reexportaciones de tipos de catálogo | | `plugin-sdk/provider-usage` | `fetchClaudeUsage` y similares | | `plugin-sdk/provider-stream`
  | Tipos de envoltura de flujo | | `plugin-sdk/provider-onboard` | Funciones auxiliares de parches de configuración de onboarding |
</Accordion>

<Accordion title="Subrutas de autenticación y seguridad">
  | Subruta | Exportaciones clave | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate` | | `plugin-sdk/allow-from` | `formatAllowFromLowercase` | | `plugin-sdk/secret-input` | Funciones auxiliares de análisis de entrada de secretos | | `plugin-sdk/webhook-ingress` | Funciones auxiliares de solicitud/objetivo de webhook |
</Accordion>

<Accordion title="Subrutas de tiempo de ejecución y almacenamiento">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | | `plugin-sdk/config-runtime` | Config load/write helpers | | `plugin-sdk/infra-runtime` | System event/heartbeat helpers | | `plugin-sdk/agent-runtime` | Agent dir/identity/workspace helpers | | `plugin-sdk/directory-runtime` | Config-backed directory query/dedup | |
  `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

  <Accordion title="Subrutas de capacidades y pruebas">
    | Subpath | Key exports |
    | --- | --- |
    | `plugin-sdk/image-generation` | Image generation provider types |
    | `plugin-sdk/media-understanding` | Media understanding provider types |
    | `plugin-sdk/speech` | Speech provider types |
    | `plugin-sdk/testing` | `installCommonResolveTargetErrorCases`, `shouldAckReaction` |
  </Accordion>
</AccordionGroup>

## API de registro

La devolución de llamada `register(api)` recibe un objeto `OpenClawPluginApi` con estos
métodos:

### Registro de capacidades

| Método                                        | Lo que registra                |
| --------------------------------------------- | ------------------------------ |
| `api.registerProvider(...)`                   | Inferencia de texto (LLM)      |
| `api.registerChannel(...)`                    | Canal de mensajería            |
| `api.registerSpeechProvider(...)`             | Síntesis de texto a voz / STT  |
| `api.registerMediaUnderstandingProvider(...)` | Análisis de imagen/audio/vídeo |
| `api.registerImageGenerationProvider(...)`    | Generación de imágenes         |
| `api.registerWebSearchProvider(...)`          | Búsqueda web                   |

### Herramientas y comandos

| Método                          | Lo que registra                                            |
| ------------------------------- | ---------------------------------------------------------- |
| `api.registerTool(tool, opts?)` | Herramienta de agente (obligatoria u `{ optional: true }`) |
| `api.registerCommand(def)`      | Comando personalizado (omite la LLM)                       |

### Infraestructura

| Método                                         | Lo que registra                  |
| ---------------------------------------------- | -------------------------------- |
| `api.registerHook(events, handler, opts?)`     | Gancho de evento                 |
| `api.registerHttpRoute(params)`                | Extremo HTTP de puerta de enlace |
| `api.registerGatewayMethod(name, handler)`     | Método RPC de puerta de enlace   |
| `api.registerCli(registrar, opts?)`            | Subcomando CLI                   |
| `api.registerService(service)`                 | Servicio en segundo plano        |
| `api.registerInteractiveHandler(registration)` | Controlador interactivo          |

### Slots exclusivos

| Método                                     | Lo que registra                             |
| ------------------------------------------ | ------------------------------------------- |
| `api.registerContextEngine(id, factory)`   | Motor de contexto (uno activo a la vez)     |
| `api.registerMemoryPromptSection(builder)` | Constructor de sección de prompt de memoria |

### Eventos y ciclo de vida

| Método                                       | Lo que hace                                     |
| -------------------------------------------- | ----------------------------------------------- |
| `api.on(hookName, handler, opts?)`           | Hook de ciclo de vida tipado                    |
| `api.onConversationBindingResolved(handler)` | Devolución de llamada de enlace de conversación |

### Semántica de decisión del hook

- `before_tool_call`: devolver `{ block: true }` es terminal. Una vez que cualquier controlador lo establece, los controladores de menor prioridad se omiten.
- `before_tool_call`: devolver `{ block: false }` se trata como sin decisión (igual que omitir `block`), no como una anulación.
- `message_sending`: devolver `{ cancel: true }` es terminal. Una vez que cualquier controlador lo establece, los controladores de menor prioridad se omiten.
- `message_sending`: devolver `{ cancel: false }` se trata como sin decisión (igual que omitir `cancel`), no como una anulación.

### Campos del objeto API

| Campo                    | Tipo                      | Descripción                                                               |
| ------------------------ | ------------------------- | ------------------------------------------------------------------------- |
| `api.id`                 | `string`                  | Id del complemento                                                        |
| `api.name`               | `string`                  | Nombre para mostrar                                                       |
| `api.version`            | `string?`                 | Versión del complemento (opcional)                                        |
| `api.description`        | `string?`                 | Descripción del complemento (opcional)                                    |
| `api.source`             | `string`                  | Ruta de origen del complemento                                            |
| `api.rootDir`            | `string?`                 | Directorio raíz del complemento (opcional)                                |
| `api.config`             | `OpenClawConfig`          | Instantánea de configuración actual                                       |
| `api.pluginConfig`       | `Record<string, unknown>` | Configuración específica del complemento de `plugins.entries.<id>.config` |
| `api.runtime`            | `PluginRuntime`           | [Ayudantes de tiempo de ejecución](/es/plugins/sdk-runtime)               |
| `api.logger`             | `PluginLogger`            | Registrador con ámbito (`debug`, `info`, `warn`, `error`)                 |
| `api.registrationMode`   | `PluginRegistrationMode`  | `"full"`, `"setup-only"`, o `"setup-runtime"`                             |
| `api.resolvePath(input)` | `(string) => string`      | Resolver la ruta relativa a la raíz del complemento                       |

## Convención de módulos internos

Dentro de su complemento, use archivos de barril locales para importaciones internas:

```
my-plugin/
  api.ts            # Public exports for external consumers
  runtime-api.ts    # Internal-only runtime exports
  index.ts          # Plugin entry point
  setup-entry.ts    # Lightweight setup-only entry (optional)
```

<Warning>
  Nunca importe su propio complemento a través de `openclaw/plugin-sdk/<your-plugin>`
  desde el código de producción. Enruta las importaciones internas a través de `./api.ts` o
  `./runtime-api.ts`. La ruta del SDK es solo el contrato externo.
</Warning>

## Relacionado

- [Puntos de entrada](/es/plugins/sdk-entrypoints) — opciones `definePluginEntry` y `defineChannelPluginEntry`
- [Ayudantes de tiempo de ejecución](/es/plugins/sdk-runtime) — referencia completa del espacio de nombres `api.runtime`
- [Configuración y configuración](/es/plugins/sdk-setup) — empaquetado, manifiestos, esquemas de configuración
- [Pruebas](/es/plugins/sdk-testing) — utilidades de prueba y reglas de linting
- [Migración del SDK](/es/plugins/sdk-migration) — migración desde superficies obsoletas
- [Interno del complemento](/es/plugins/architecture) — arquitectura profunda y modelo de capacidades
