---
summary: "Mapa de importación, referencia de la API de registro y arquitectura del SDK"
title: "Resumen del SDK de complementos"
sidebarTitle: "Resumen del SDK"
read_when:
  - You need to know which SDK subpath to import from
  - You want a reference for all registration methods on OpenClawPluginApi
  - You are looking up a specific SDK export
---

El SDK de complementos es el contrato con tipo entre los complementos y el núcleo. Esta página es la referencia de **qué importar** y **qué puede registrar**.

<Tip>
  ¿Busca una guía paso a paso en su lugar?

- ¿Su primer complemento? Comience con [Construcción de complementos](/es/plugins/building-plugins).
- ¿Complemento de canal? Vea [Complementos de canal](/es/plugins/sdk-channel-plugins).
- ¿Complemento de proveedor? Vea [Complementos de proveedor](/es/plugins/sdk-provider-plugins).
- ¿Complemento de herramienta o enlace de ciclo de vida? Vea [Enlaces de complementos](/es/plugins/hooks).
  </Tip>

## Convención de importación

Importe siempre desde una subruta específica:

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";
```

Cada subruta es un módulo pequeño y autónomo. Esto mantiene el inicio rápido y evita problemas de dependencia circular. Para los asistentes de entrada/compilación específicos del canal, prefiera `openclaw/plugin-sdk/channel-core`; mantenga `openclaw/plugin-sdk/core` para la superficie general y los asistentes compartidos, como `buildChannelConfigSchema`.

Para la configuración del canal, publique el esquema JSON propiedad del canal a través de `openclaw.plugin.json#channelConfigs`. La subruta `plugin-sdk/channel-config-schema` es para primitivas de esquema compartidas y el constructor genérico. Las exportaciones de esquema de canal incluidas (bundled) y en desuso viven en `plugin-sdk/channel-config-schema-legacy` solo por compatibilidad incluida; no son un patrón para nuevos complementos.

<Warning>
  No importe costuras de convenencia con marca de proveedor o canal (por ejemplo
  `openclaw/plugin-sdk/slack`, `.../discord`, `.../signal`, `.../whatsapp`).
  Los plugins empaquetados componen subrutas genéricas del SDK dentro de sus propios barriles `api.ts` /
  `runtime-api.ts`; los consumidores principales deben usar esos barriles
  locales del plugin o agregar un contrato genérico y estrecho del SDK cuando una necesidad sea
  verdaderamente entre canales.

Un pequeño conjunto de costuras auxiliares de plugins empaquetados (`plugin-sdk/feishu`,
`plugin-sdk/zalo`, `plugin-sdk/matrix*`, y similares) todavía aparecen en el
mapa de exportación generado. Existen solo para el mantenimiento de plugins empaquetados y no son
rutas de importación recomendadas para nuevos plugins de terceros.

</Warning>

## Referencia de subrutas

El SDK del plugin se expone como un conjunto de subrutas estrechas agrupadas por área (entrada
del plugin, canal, proveedor, autenticación, tiempo de ejecución, capacidad, memoria y auxiliares
reservados de plugins empaquetados). Para el catálogo completo — agrupado y vinculado — consulte
[Subrutas del SDK de plugins](/es/plugins/sdk-subpaths).

La lista generada de más de 200 subrutas reside en `scripts/lib/plugin-sdk-entrypoints.json`.

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
| `api.registerRealtimeVoiceProvider(...)`         | Sesiones de voz en tiempo real dúplex          |
| `api.registerMediaUnderstandingProvider(...)`    | Análisis de imagen/audio/video                 |
| `api.registerImageGenerationProvider(...)`       | Generación de imágenes                         |
| `api.registerMusicGenerationProvider(...)`       | Generación de música                           |
| `api.registerVideoGenerationProvider(...)`       | Generación de video                            |
| `api.registerWebFetchProvider(...)`              | Proveedor de búsqueda/extracción web           |
| `api.registerWebSearchProvider(...)`             | Búsqueda web                                   |

### Herramientas y comandos

| Método                          | Lo que registra                                            |
| ------------------------------- | ---------------------------------------------------------- |
| `api.registerTool(tool, opts?)` | Herramienta de agente (obligatoria o `{ optional: true }`) |
| `api.registerCommand(def)`      | Comando personalizado (omite el LLM)                       |

Los comandos de los complementos pueden establecer `agentPromptGuidance` cuando el agente necesita una
sugerencia de enrutamiento breve y propiedad del comando. Mantenga ese texto sobre el comando mismo; no agregue
política específica del proveedor o del complemento a los constructores de indicadores principales.

### Infraestructura

| Método                                         | Lo que registra                                                 |
| ---------------------------------------------- | --------------------------------------------------------------- |
| `api.registerHook(events, handler, opts?)`     | Gancho de eventos                                               |
| `api.registerHttpRoute(params)`                | Endpoint HTTP de Gateway                                        |
| `api.registerGatewayMethod(name, handler)`     | Método RPC de Gateway                                           |
| `api.registerGatewayDiscoveryService(service)` | Anunciante de descubrimiento de Gateway local                   |
| `api.registerCli(registrar, opts?)`            | Subcomando CLI                                                  |
| `api.registerService(service)`                 | Servicio en segundo plano                                       |
| `api.registerInteractiveHandler(registration)` | Controlador interactivo                                         |
| `api.registerAgentToolResultMiddleware(...)`   | Middleware de resultados de herramientas en tiempo de ejecución |
| `api.registerMemoryPromptSupplement(builder)`  | Sección de indicador adyacente a la memoria aditiva             |
| `api.registerMemoryCorpusSupplement(adapter)`  | Corpus de búsqueda/lectura de memoria aditiva                   |

<Note>Los espacios de nombres de administración principal reservados (`config.*`, `exec.approvals.*`, `wizard.*`, `update.*`) siempre se mantienen `operator.admin`, incluso si un complemento intenta asignar un ámbito de método de gateway más estrecho. Prefiera prefijos específicos del complemento para métodos propiedad del complemento.</Note>

<Accordion title="Cuándo usar el middleware de resultados de herramientas">
  Los complementos empaquetados pueden usar `api.registerAgentToolResultMiddleware(...)` cuando
  necesitan reescribir un resultado de herramienta después de la ejecución y antes de que el tiempo de ejecución
  devuelva ese resultado al modelo. Esta es la costura neutral de confianza del tiempo de ejecución
  para reductores de salida asíncronos como tokenjuice.

Los complementos empaquetados deben declarar `contracts.agentToolResultMiddleware` para cada
tiempo de ejecución de destino, por ejemplo `["pi", "codex"]`. Los complementos externos
no pueden registrar este middleware; mantenga los ganchos normales de complementos de OpenClaw para el trabajo
que no necesita el momento del resultado de la herramienta previo al modelo. La ruta de registro de fábrica de extensiones integradas exclusiva de Pi antigua se ha eliminado.

</Accordion>

### Registro de descubrimiento de Gateway

`api.registerGatewayDiscoveryService(...)` permite que un complemento anuncie el Gateway activo
en un transporte de descubrimiento local como mDNS/Bonjour. OpenClaw llama al
servicio durante el inicio del Gateway cuando el descubrimiento local está habilitado, pasa los
puertos del Gateway actuales y datos de sugerencia TXT no secretos, y llama al controlador
`stop` devuelto durante el cierre del Gateway.

```typescript
api.registerGatewayDiscoveryService({
  id: "my-discovery",
  async advertise(ctx) {
    const handle = await startMyAdvertiser({
      gatewayPort: ctx.gatewayPort,
      tls: ctx.gatewayTlsEnabled,
      displayName: ctx.machineDisplayName,
    });
    return { stop: () => handle.stop() };
  },
});
```

Los complementos de descubrimiento de Gateway no deben tratar los valores TXT anunciados como secretos o
autenticación. El descubrimiento es una sugerencia de enrutamiento; la autenticación del Gateway y el fijado de TLS
aún poseen la confianza.

### Metadatos de registro de CLI

`api.registerCli(registrar, opts?)` acepta dos tipos de metadatos de nivel superior:

- `commands`: raíces de comandos explícitas propiedad del registrador
- `descriptors`: descriptores de comandos en tiempo de análisis utilizados para la ayuda de la CLI raíz,
  enrutamiento y registro perezoso de la CLI de complementos

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

Use `commands` por sí solo solo cuando no necesite registro perezoso de la CLI raíz.
Esa ruta de compatibilidad ansiosa sigue siendo compatible, pero no instala
marcadores de posición respaldados por descriptores para la carga diferida en tiempo de análisis.

### Registro de backend de CLI

`api.registerCliBackend(...)` permite que un complemento sea dueño de la configuración predeterminada para un
backend de CLI de IA local como `codex-cli`.

- El `id` del backend se convierte en el prefijo del proveedor en las referencias de modelo como `codex-cli/gpt-5`.
- El `config` del backend utiliza la misma forma que `agents.defaults.cliBackends.<id>`.
- La configuración del usuario todavía tiene prioridad. OpenClaw fusiona `agents.defaults.cliBackends.<id>` sobre la
  definida por el complemento antes de ejecutar la CLI.
- Use `normalizeConfig` cuando un backend necesita reescrituras de compatibilidad después de la fusión
  (por ejemplo, normalizar formas de banderas antiguas).

### Slots exclusivos

| Método                                     | Lo que registra                                                                                                                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `api.registerContextEngine(id, factory)`   | Motor de contexto (uno activo a la vez). La devolución de llamada `assemble()` recibe `availableTools` y `citationsMode` para que el motor pueda adaptar las adiciones al indicador. |
| `api.registerMemoryCapability(capability)` | Capacidad de memoria unificada                                                                                                                                                       |
| `api.registerMemoryPromptSection(builder)` | Generador de secciones de indicaciones de memoria                                                                                                                                    |
| `api.registerMemoryFlushPlan(resolver)`    | Resolutor de plan de vaciado de memoria                                                                                                                                              |
| `api.registerMemoryRuntime(runtime)`       | Adaptador de tiempo de ejecución de memoria                                                                                                                                          |

### Adaptadores de incrustación de memoria

| Método                                         | Lo que registra                                                 |
| ---------------------------------------------- | --------------------------------------------------------------- |
| `api.registerMemoryEmbeddingProvider(adapter)` | Adaptador de incrustación de memoria para el complemento activo |

- `registerMemoryCapability` es la API exclusiva del complemento de memoria preferida.
- `registerMemoryCapability` también puede exponer `publicArtifacts.listArtifacts(...)`
  para que los complementos complementarios puedan consumir artefactos de memoria exportados a través de
  `openclaw/plugin-sdk/memory-host-core` en lugar de acceder al diseño privado
  de un complemento de memoria específico.
- `registerMemoryPromptSection`, `registerMemoryFlushPlan` y
  `registerMemoryRuntime` son API exclusivas de complementos de memoria compatibles con versiones anteriores.
- `registerMemoryEmbeddingProvider` permite al complemento de memoria activo registrar uno
  o más identificadores de adaptador de incrustación (por ejemplo `openai`, `gemini`, o un
  identificador personalizado definido por el complemento).
- La configuración del usuario, como `agents.defaults.memorySearch.provider` y
  `agents.defaults.memorySearch.fallback`, se resuelve respecto a esos identificadores
  de adaptador registrados.

### Eventos y ciclo de vida

| Método                                       | Lo que hace                                          |
| -------------------------------------------- | ---------------------------------------------------- |
| `api.on(hookName, handler, opts?)`           | Gancho de ciclo de vida tipado                       |
| `api.onConversationBindingResolved(handler)` | Devolución de llamada de vinculación de conversación |

Consulte [Ganchos de complementos](/es/plugins/hooks) para ver ejemplos, nombres comunes de ganchos y semántica
de protección.

### Semántica de decisión del gancho

- `before_tool_call`: devolver `{ block: true }` es terminal. Una vez que cualquier controlador lo establece, se omiten los controladores de menor prioridad.
- `before_tool_call`: devolver `{ block: false }` se trata como sin decisión (lo mismo que omitir `block`), no como una anulación.
- `before_install`: devolver `{ block: true }` es terminal. Una vez que cualquier controlador lo establece, se omiten los controladores de menor prioridad.
- `before_install`: devolver `{ block: false }` se trata como sin decisión (lo mismo que omitir `block`), no como una anulación.
- `reply_dispatch`: devolver `{ handled: true, ... }` es terminal. Una vez que cualquier controlador reclama el despacho, se omiten los controladores de menor prioridad y la ruta de despacho del modelo predeterminado.
- `message_sending`: devolver `{ cancel: true }` es terminal. Una vez que cualquier controlador lo establece, se omiten los controladores de menor prioridad.
- `message_sending`: devolver `{ cancel: false }` se trata como sin decisión (igual que omitir `cancel`), no como una anulación.
- `message_received`: use el campo con tipo `threadId` cuando necesite enrutamiento de hilos/temas entrantes. Mantenga `metadata` para adicionales específicos del canal.
- `message_sending`: use los campos de enrutamiento con tipo `replyToId` / `threadId` antes de recurrir a `metadata` específicos del canal.
- `gateway_start`: use `ctx.config`, `ctx.workspaceDir` y `ctx.getCron?.()` para el estado de inicio propiedad de la puerta de enlace en lugar de confiar en los ganchos internos `gateway:startup`.

### Campos de objeto de API

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
| `api.logger`             | `PluginLogger`            | Registrador con ámbito (`debug`, `info`, `warn`, `error`)                                                         |
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
  Nunca importe su propio complemento a través de `openclaw/plugin-sdk/<your-plugin>`
  desde el código de producción. Enruta las importaciones internas a través de `./api.ts` o
  `./runtime-api.ts`. La ruta del SDK es solo el contrato externo.
</Warning>

Las superficies públicas de complementos empaquetados cargados por fachada (`api.ts`, `runtime-api.ts`,
`index.ts`, `setup-entry.ts` y archivos de entrada públicos similares) prefieren la
instantánea de configuración de tiempo de ejecución activa cuando OpenClaw ya se está ejecutando. Si aún no existe ninguna
instantánea de tiempo de ejecución, recurren al archivo de configuración resuelto en el disco.

Los complementos de proveedores pueden exponer un barril de contrato local de complemento limitado cuando un
asistente es intencionalmente específico del proveedor y aún no pertenece a una subruta de SDK
genérica. Ejemplos empaquetados:

- **Anthropic**: costura pública `api.ts` / `contract-api.ts` para Claude
  de encabezado beta y asistentes de flujo `service_tier`.
- **`@openclaw/openai-provider`**: `api.ts` exporta constructores de proveedores,
  asistentes de modelo predeterminados y constructores de proveedores en tiempo real.
- **`@openclaw/openrouter-provider`**: `api.ts` exporta el constructor de proveedores
  más asistentes de incorporación/configuración.

<Warning>
  El código de producción de extensiones también debe evitar `openclaw/plugin-sdk/<other-plugin>`
  importaciones. Si un asistente es realmente compartido, promuévalo a una subruta de SDK neutral
  como `openclaw/plugin-sdk/speech`, `.../provider-model-shared` u otra
  superficie orientada a capacidades en lugar de acoplar dos complementos juntos.
</Warning>

## Relacionado

<CardGroup cols={2}>
  <Card title="Puntos de entrada" icon="door-open" href="/es/plugins/sdk-entrypoints">
    Opciones `definePluginEntry` y `defineChannelPluginEntry`.
  </Card>
  <Card title="Ayudas de tiempo de ejecución" icon="gears" href="/es/plugins/sdk-runtime">
    Referencia completa del espacio de nombres `api.runtime`.
  </Card>
  <Card title="Configuración y ajustes" icon="sliders" href="/es/plugins/sdk-setup">
    Empaquetado, manifiestos y esquemas de configuración.
  </Card>
  <Card title="Pruebas" icon="vial" href="/es/plugins/sdk-testing">
    Utilidades de prueba y reglas de linting.
  </Card>
  <Card title="Migración del SDK" icon="arrows-turn-right" href="/es/plugins/sdk-migration">
    Migración desde superficies obsoletas.
  </Card>
  <Card title="Interno del complemento" icon="diagram-project" href="/es/plugins/architecture">
    Arquitectura profunda y modelo de capacidades.
  </Card>
</CardGroup>
