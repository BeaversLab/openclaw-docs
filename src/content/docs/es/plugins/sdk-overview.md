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

<Tip>**¿Buscas una guía práctica?** - ¿Es tu primer plugin? Empieza con [Introducción](/en/plugins/building-plugins) - ¿Plugin de canal? Consulta [Plugins de canal](/en/plugins/sdk-channel-plugins) - ¿Plugin de proveedor? Consulta [Plugins de proveedor](/en/plugins/sdk-provider-plugins)</Tip>

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
    | `plugin-sdk/channel-config-schema` | Tipos de esquema de configuración de canal |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-lifecycle` | `createAccountStatusSink` |
    | `plugin-sdk/channel-inbound` | Funciones auxiliares de rebote (debounce), coincidencia de menciones y sobres (envelopes) |
    | `plugin-sdk/channel-send-result` | Tipos de resultado de respuesta |
    | `plugin-sdk/channel-actions` | `createMessageToolButtonsSchema`, `createMessageToolCardSchema` |
    | `plugin-sdk/channel-targets` | Funciones auxiliares de análisis/coincidencia de objetivos |
    | `plugin-sdk/channel-contract` | Tipos de contrato de canal |
    | `plugin-sdk/channel-feedback` | Conexión de comentarios/reacciones |
  </Accordion>

<Accordion title="Subrutas de proveedores">
  | Subruta | Exportaciones clave | | --- | --- | | `plugin-sdk/cli-backend` | Valores predeterminados del backend de CLI + constantes de watchdog | | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`, `ensureApiKeyFromOptionEnvOrPrompt`, `upsertAuthProfile` | | `plugin-sdk/provider-model-shared` | `normalizeModelCompat` | | `plugin-sdk/provider-catalog-shared` | `findCatalogTemplate`,
  `buildSingleProviderApiKeyCatalog` | | `plugin-sdk/provider-usage` | `fetchClaudeUsage` y similares | | `plugin-sdk/provider-stream` | Tipos de envoltorio de flujo | | `plugin-sdk/provider-onboard` | Asistentes de parches de configuración de incorporación | | `plugin-sdk/global-singleton` | Asistentes de singleton/mapa/caché local de proceso |
</Accordion>

<Accordion title="Subrutas de autenticación y seguridad">
  | Subruta | Exportaciones clave | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate` | | `plugin-sdk/allow-from` | `formatAllowFromLowercase` | | `plugin-sdk/secret-input` | Asistentes de análisis de entrada de secretos | | `plugin-sdk/webhook-ingress` | Asistentes de solicitud/objetivo de webhook | | `plugin-sdk/webhook-request-guards` | Asistentes de tamaño de cuerpo de
  solicitud/tiempo de espera |
</Accordion>

<Accordion title="Subrutas de runtime y almacenamiento">
  | Subpath | Exportaciones clave | | --- | --- | | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | | `plugin-sdk/config-runtime` | Auxiliares de carga/escritura de configuración | | `plugin-sdk/approval-runtime` | Auxiliares de ejecución y aprobación de complementos | | `plugin-sdk/infra-runtime` | Auxiliares de eventos del sistema/latidos | | `plugin-sdk/collection-runtime` |
  Auxiliares de caché pequeña acotada | | `plugin-sdk/diagnostic-runtime` | Auxiliares de indicadores y eventos de diagnóstico | | `plugin-sdk/error-runtime` | Auxiliares de gráficos de errores y formato | | `plugin-sdk/fetch-runtime` | Auxiliares de búsqueda encapsulada, proxy y búsqueda fijada | | `plugin-sdk/host-runtime` | Auxiliares de normalización de nombre de host y host SCP | |
  `plugin-sdk/retry-runtime` | Auxiliares de configuración de reintento y ejecutor de reintento | | `plugin-sdk/agent-runtime` | Auxiliares de directorio/identidad/espacio de trabajo del agente | | `plugin-sdk/directory-runtime` | Consulta/deduplicación de directorio respaldada por configuración | | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

  <Accordion title="Subrutas de capacidades y pruebas">
    | Subpath | Exportaciones clave |
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

| Método                                        | Lo que registra                    |
| --------------------------------------------- | ---------------------------------- |
| `api.registerProvider(...)`                   | Inferencia de texto (LLM)          |
| `api.registerCliBackend(...)`                 | Backend de inferencia de CLI local |
| `api.registerChannel(...)`                    | Canal de mensajería                |
| `api.registerSpeechProvider(...)`             | Síntesis de texto a voz / STT      |
| `api.registerMediaUnderstandingProvider(...)` | Análisis de imagen/audio/vídeo     |
| `api.registerImageGenerationProvider(...)`    | Generación de imágenes             |
| `api.registerWebSearchProvider(...)`          | Búsqueda web                       |

### Herramientas y comandos

| Método                          | Lo que registra                                          |
| ------------------------------- | -------------------------------------------------------- |
| `api.registerTool(tool, opts?)` | Herramienta de agente (requerida u `{ optional: true }`) |
| `api.registerCommand(def)`      | Comando personalizado (omite el LLM)                     |

### Infraestructura

| Método                                         | Lo que registra                |
| ---------------------------------------------- | ------------------------------ |
| `api.registerHook(events, handler, opts?)`     | Gancho de eventos (Event hook) |
| `api.registerHttpRoute(params)`                | Endpoint HTTP de Gateway       |
| `api.registerGatewayMethod(name, handler)`     | Método RPC de Gateway          |
| `api.registerCli(registrar, opts?)`            | Subcomando de CLI              |
| `api.registerService(service)`                 | Servicio en segundo plano      |
| `api.registerInteractiveHandler(registration)` | Controlador interactivo        |

### Metadatos de registro de CLI

`api.registerCli(registrar, opts?)` acepta dos tipos de metadatos de nivel superior:

- `commands`: raíces de comandos explícitas propiedad del registrador
- `descriptors`: descriptores de comandos en tiempo de análisis utilizados para la ayuda de la CLI raíz,
  enrutamiento y registro diferido de la CLI del complemento

Si desea que un comando de complemento permanezca con carga diferida en la ruta normal de la CLI raíz,
proporcione `descriptors` que cubran cada raíz de comando de nivel superior expuesta por ese
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

Use `commands` por sí solo solo cuando no necesite el registro diferido de la CLI raíz.
Esa ruta de compatibilidad eager sigue siendo compatible, pero no instala
marcadores de posición con respaldo de descriptor para la carga diferida en tiempo de análisis.

### Registro de backend de CLI

`api.registerCliBackend(...)` permite que un complemento sea propietario de la configuración predeterminada para un
backend de CLI de IA local como `claude-cli` o `codex-cli`.

- El `id` del backend se convierte en el prefijo del proveedor en las referencias de modelos como `claude-cli/opus`.
- El `config` del backend usa la misma forma que `agents.defaults.cliBackends.<id>`.
- La configuración del usuario todavía tiene prioridad. OpenClaw fusiona `agents.defaults.cliBackends.<id>` sobre el
  valor predeterminado del complemento antes de ejecutar la CLI.
- Use `normalizeConfig` cuando un backend necesite reescrituras de compatibilidad después de la fusión
  (por ejemplo, normalizar formas antiguas de indicadores).

### Ranuras exclusivas

| Método                                     | Lo que registra                             |
| ------------------------------------------ | ------------------------------------------- |
| `api.registerContextEngine(id, factory)`   | Motor de contexto (uno activo a la vez)     |
| `api.registerMemoryPromptSection(builder)` | Generador de sección de prompt de memoria   |
| `api.registerMemoryFlushPlan(resolver)`    | Resolvedor de plan de vaciado de memoria    |
| `api.registerMemoryRuntime(runtime)`       | Adaptador de tiempo de ejecución de memoria |

### Adaptadores de incrustación de memoria

| Método                                         | Lo que registra                                            |
| ---------------------------------------------- | ---------------------------------------------------------- |
| `api.registerMemoryEmbeddingProvider(adapter)` | Adaptador de incrustación de memoria para el plugin activo |

- `registerMemoryPromptSection`, `registerMemoryFlushPlan` y
  `registerMemoryRuntime` son exclusivos de los plugins de memoria.
- `registerMemoryEmbeddingProvider` permite al plugin de memoria activo registrar uno
  o más ids de adaptadores de incrustación (por ejemplo `openai`, `gemini`, o un
  id definido por el plugin personalizado).
- La configuración de usuario como `agents.defaults.memorySearch.provider` y
  `agents.defaults.memorySearch.fallback` se resuelve contra esos ids de
  adaptadores registrados.

### Eventos y ciclo de vida

| Método                                       | Lo que hace                                  |
| -------------------------------------------- | -------------------------------------------- |
| `api.on(hookName, handler, opts?)`           | Gancho de ciclo de vida tipado               |
| `api.onConversationBindingResolved(handler)` | Retorno de llamada de enlace de conversación |

### Semántica de decisión del gancho

- `before_tool_call`: devolver `{ block: true }` es terminal. Una vez que cualquier manejador lo establece, se omiten los manejadores de menor prioridad.
- `before_tool_call`: devolver `{ block: false }` se trata como sin decisión (igual que omitir `block`), no como una anulación.
- `before_install`: devolver `{ block: true }` es terminal. Una vez que cualquier manejador lo establece, se omiten los manejadores de menor prioridad.
- `before_install`: devolver `{ block: false }` se trata como sin decisión (igual que omitir `block`), no como una anulación.
- `message_sending`: devolver `{ cancel: true }` es terminal. Una vez que cualquier manejador lo establece, se omiten los manejadores de menor prioridad.
- `message_sending`: devolver `{ cancel: false }` se trata como sin decisión (igual que omitir `cancel`), no como una anulación.

### Campos del objeto API

| Campo                    | Tipo                      | Descripción                                                                  |
| ------------------------ | ------------------------- | ---------------------------------------------------------------------------- |
| `api.id`                 | `string`                  | Id del plugin                                                                |
| `api.name`               | `string`                  | Nombre para mostrar                                                          |
| `api.version`            | `string?`                 | Versión del plugin (opcional)                                                |
| `api.description`        | `string?`                 | Descripción del plugin (opcional)                                            |
| `api.source`             | `string`                  | Ruta de origen del complemento                                               |
| `api.rootDir`            | `string?`                 | Directorio raíz del complemento (opcional)                                   |
| `api.config`             | `OpenClawConfig`          | Instantánea de la configuración actual                                       |
| `api.pluginConfig`       | `Record<string, unknown>` | Configuración específica del complemento desde `plugins.entries.<id>.config` |
| `api.runtime`            | `PluginRuntime`           | [Asistentes de tiempo de ejecución](/en/plugins/sdk-runtime)                 |
| `api.logger`             | `PluginLogger`            | Registrador con ámbito (`debug`, `info`, `warn`, `error`)                    |
| `api.registrationMode`   | `PluginRegistrationMode`  | `"full"`, `"setup-only"`, `"setup-runtime"` o `"cli-metadata"`               |
| `api.resolvePath(input)` | `(string) => string`      | Resolver ruta relativa a la raíz del complemento                             |

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

<Warning>
  El código de producción de la extensión también debe evitar las importaciones `openclaw/plugin-sdk/<other-plugin>`
  . Si un asistente es realmente compartido, promuévalo a una subruta de SDK neutral
  como `openclaw/plugin-sdk/speech`, `.../provider-model-shared` u otra
  superficie orientada a capacidades en lugar de acoplar dos complementos entre sí.
</Warning>

## Relacionado

- [Puntos de entrada](/en/plugins/sdk-entrypoints) — opciones `definePluginEntry` y `defineChannelPluginEntry`
- [Asistentes de tiempo de ejecución](/en/plugins/sdk-runtime) — referencia completa del espacio de nombres `api.runtime`
- [Configuración](/en/plugins/sdk-setup) — empaquetado, manifiestos, esquemas de configuración
- [Pruebas](/en/plugins/sdk-testing) — utilidades de prueba y reglas de lint
- [Migración del SDK](/en/plugins/sdk-migration) — migración desde superficies obsoletas
- [Aspectos internos del complemento](/en/plugins/architecture) — arquitectura profunda y modelo de capacidades
