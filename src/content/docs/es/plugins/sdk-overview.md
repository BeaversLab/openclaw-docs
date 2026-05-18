---
summary: "Mapa de importación, referencia de API de registro y arquitectura del SDK"
title: "Resumen del SDK de plugins"
sidebarTitle: "Resumen del SDK de plugins"
read_when:
  - You need to know which SDK subpath to import from
  - You want a reference for all registration methods on OpenClawPluginApi
  - You are looking up a specific SDK export
---

El SDK de complementos es el contrato con tipo entre los complementos y el núcleo. Esta página es la referencia de **qué importar** y **qué puede registrar**.

<Note>Esta página es para autores de complementos que utilizan `openclaw/plugin-sdk/*` dentro de OpenClaw. Para aplicaciones externas, scripts, paneles, trabajos de CI y extensiones de IDE que deseen ejecutar agentes a través de Gateway, utilice [OpenClaw App SDK](/es/concepts/openclaw-sdk) y el paquete `@openclaw/sdk` en su lugar.</Note>

<Tip>
  ¿Busca una guía de procedimientos en su lugar? Comience con [Building plugins](/es/plugins/building-plugins), use [Channel plugins](/es/plugins/sdk-channel-plugins) para complementos de canal, [Provider plugins](/es/plugins/sdk-provider-plugins) para complementos de proveedor, [CLI backend plugins](/es/plugins/cli-backend-plugins) para backends de CLI de IA local, y [Plugin
  hooks](/es/plugins/hooks) para complementos de herramientas o ganchos de ciclo de vida.
</Tip>

## Convención de importación

Importa siempre desde una subruta específica:

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";
```

Cada subruta es un pequeño módulo autónomo. Esto mantiene el inicio rápido y
previene problemas de dependencias circulares. Para asistentes de entrada/compilación específicos del canal,
prefiera `openclaw/plugin-sdk/channel-core`; mantenga `openclaw/plugin-sdk/core` para
la superficie general paraguas y los asistentes compartidos, como
`buildChannelConfigSchema`.

Para la configuración del canal, publique el esquema JSON propiedad del canal a través de
`openclaw.plugin.json#channelConfigs`. La subruta `plugin-sdk/channel-config-schema`
es para primitivas de esquema compartidas y el generador genérico. Los plugins
incluidos con OpenClaw usan `plugin-sdk/bundled-channel-config-schema` para esquemas
de canal incluidos retenidos. Las exportaciones de compatibilidad en desuso permanecen en
`plugin-sdk/channel-config-schema-legacy`; ninguna subruta de esquema incluido es un
patrón para nuevos plugins.

<Warning>
  No importe juntas de conveniencia con marca de proveedor o canal (por ejemplo
  `openclaw/plugin-sdk/slack`, `.../discord`, `.../signal`, `.../whatsapp`).
  Los plugins incluidos componen subrutas genéricas del SDK dentro de sus propios
  barriles `api.ts` / `runtime-api.ts`; los consumidores
  principales deben usar esos barriles locales del plugin o agregar un contrato
  genérico y estrecho del SDK cuando una necesidad sea verdaderamente
  multi-canal.

Un pequeño conjunto de juntas de ayuda de plugins incluidos aún aparece en el
mapa de exportación generado cuando tienen uso de propietario rastreado. Existen
solo para el mantenimiento de los plugins incluidos y no son rutas de importación
recomendadas para nuevos plugins de terceros.

`openclaw/plugin-sdk/discord` y `openclaw/plugin-sdk/telegram-account` también se
mantienen como fachadas de compatibilidad desaprobadas para uso de propietario
rastreado. No copie esas rutas de importación en nuevos plugins; use ayudas de
tiempo de ejecución inyectadas y subrutas de SDK de canal genéricas en su lugar.

</Warning>

## Referencia de subruta

El SDK de complementos se expone como un conjunto de subrutas estrechas agrupadas por área (entrada del complemento, canal, proveedor, autenticación, tiempo de ejecución, capacidad, memoria y asistentes reservados de complementos agrupados). Para el catálogo completo, agrupado y vinculado, consulte [Subrutas del SDK de complementos](/es/plugins/sdk-subpaths).

El inventario de puntos de entrada del compilador reside en
`scripts/lib/plugin-sdk-entrypoints.json`; las exportaciones de paquetes se generan a partir
del subconjunto público después de restar las subrutas de prueba/internas locales del repositorio listadas en
`scripts/lib/plugin-sdk-private-local-only-subpaths.json`. Ejecute
`pnpm plugin-sdk:surface` para auditar el conteo de exportaciones públicas. Las subrutas públicas obsoletas
que son lo suficientemente antiguas y no utilizadas por el código de producción de extensiones agrupadas se
rastrean en `scripts/lib/plugin-sdk-deprecated-public-subpaths.json`; los barriles
de reexportación obsoletos amplios se rastrean en
`scripts/lib/plugin-sdk-deprecated-barrel-subpaths.json`.

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
| `api.registerRealtimeTranscriptionProvider(...)` | Transcripción en tiempo real de transmisión    |
| `api.registerRealtimeVoiceProvider(...)`         | Sesiones de voz duplex en tiempo real          |
| `api.registerMediaUnderstandingProvider(...)`    | Análisis de imagen/audio/video                 |
| `api.registerImageGenerationProvider(...)`       | Generación de imágenes                         |
| `api.registerMusicGenerationProvider(...)`       | Generación de música                           |
| `api.registerVideoGenerationProvider(...)`       | Generación de video                            |
| `api.registerWebFetchProvider(...)`              | Proveedor de recuperación/extracción web       |
| `api.registerWebSearchProvider(...)`             | Búsqueda web                                   |

### Herramientas y comandos

Use [`defineToolPlugin`](/es/plugins/tool-plugins) para complementos simples de solo herramientas con nombres de herramientas fijos. Use `api.registerTool(...)` directamente para complementos mixtos o registro de herramientas totalmente dinámico.

| Método                          | Lo que registra                                            |
| ------------------------------- | ---------------------------------------------------------- |
| `api.registerTool(tool, opts?)` | Herramienta de agente (obligatoria o `{ optional: true }`) |
| `api.registerCommand(def)`      | Comando personalizado (omite el LLM)                       |

Los comandos de los complementos pueden establecer `agentPromptGuidance` cuando el agente necesita una sugerencia de enrutamiento breve y propiedad del comando. Mantenga ese texto sobre el comando mismo; no añada políticas específicas del proveedor o del complemento a los constructores de mensajes principales.

### Infraestructura

| Método                                         | Lo que registra                                                 |
| ---------------------------------------------- | --------------------------------------------------------------- |
| `api.registerHook(events, handler, opts?)`     | Gancho de eventos                                               |
| `api.registerHttpRoute(params)`                | Endpoint HTTP de Gateway                                        |
| `api.registerGatewayMethod(name, handler)`     | Método RPC de Gateway                                           |
| `api.registerGatewayDiscoveryService(service)` | Anunciante de descubrimiento de Gateway local                   |
| `api.registerCli(registrar, opts?)`            | Subcomando de CLI                                               |
| `api.registerNodeCliFeature(registrar, opts?)` | CLI de características de nodo bajo `openclaw nodes`            |
| `api.registerService(service)`                 | Servicio en segundo plano                                       |
| `api.registerInteractiveHandler(registration)` | Controlador interactivo                                         |
| `api.registerAgentToolResultMiddleware(...)`   | Middleware de resultados de herramientas en tiempo de ejecución |
| `api.registerMemoryPromptSupplement(builder)`  | Sección de prompt aditiva adyacente a la memoria                |
| `api.registerMemoryCorpusSupplement(adapter)`  | Corpus de búsqueda/lectura de memoria aditiva                   |

### Ganchos de host para complementos de flujo de trabajo

Los ganchos de host son las costuras del SDK para complementos que necesitan participar en el ciclo de vida del host en lugar de simplemente agregar un proveedor, canal o herramienta. Son contratos genéricos; el modo Plan puede usarlos, pero también los flujos de trabajo de aprobación, las puertas de políticas del espacio de trabajo, los monitores en segundo plano, los asistentes de configuración y los complementos de acompañamiento de la interfaz de usuario.

| Método                                                                               | Contrato que posee                                                                                                                                                             |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `api.session.state.registerSessionExtension(...)`                                    | Estado de sesión compatible con JSON y propiedad del complemento, proyectado a través de sesiones del Gateway                                                                  |
| `api.session.workflow.enqueueNextTurnInjection(...)`                                 | Contexto duradero de exactamente una vez inyectado en el siguiente turno del agente para una sesión                                                                            |
| `api.registerTrustedToolPolicy(...)`                                                 | Política de herramienta de precomplemento empaquetada/confiable que puede bloquear o reescribir parámetros de herramienta                                                      |
| `api.registerToolMetadata(...)`                                                      | Metadatos de visualización del catálogo de herramientas sin cambiar la implementación de la herramienta                                                                        |
| `api.registerCommand(...)`                                                           | Comandos de complemento con ámbito; los resultados de los comandos pueden establecer `continueAgent: true`; los comandos nativos de Discord admiten `descriptionLocalizations` |
| `api.session.controls.registerControlUiDescriptor(...)`                              | Descriptores de contribución de la interfaz de usuario de control para superficies de sesión, herramienta, ejecución o configuración                                           |
| `api.lifecycle.registerRuntimeLifecycle(...)`                                        | Devoluciones de llamada de limpieza para recursos de tiempo de ejecución propiedad del complemento en rutas de restablecimiento/eliminación/recarga                            |
| `api.agent.events.registerAgentEventSubscription(...)`                               | Suscripciones a eventos saneados para el estado y monitores del flujo de trabajo                                                                                               |
| `api.runContext.setRunContext(...)` / `getRunContext(...)` / `clearRunContext(...)`  | Estado de borrador del complemento por ejecución borrado en el ciclo de vida de ejecución terminal                                                                             |
| `api.session.workflow.registerSessionSchedulerJob(...)`                              | Metadatos de limpieza para trabajos del planificador propiedad del complemento; no programa trabajo ni crea registros de tareas                                                |
| `api.session.workflow.sendSessionAttachment(...)`                                    | Entrega de adjuntos de archivos mediada por el host y solo agrupada a la ruta de sesión de salida directa activa                                                               |
| `api.session.workflow.scheduleSessionTurn(...)` / `unscheduleSessionTurnsByTag(...)` | Turnos de sesión programados respaldados por Cron y solo agrupados, además de limpieza basada en etiquetas                                                                     |
| `api.session.controls.registerSessionAction(...)`                                    | Acciones de sesión tipificadas que los clientes pueden enviar a través de la Gateway                                                                                           |

Use los espacios de nombres agrupados para el nuevo código de complemento:

- `api.session.state.registerSessionExtension(...)`
- `api.session.workflow.enqueueNextTurnInjection(...)`
- `api.session.workflow.registerSessionSchedulerJob(...)`
- `api.session.workflow.sendSessionAttachment(...)`
- `api.session.workflow.scheduleSessionTurn(...)`
- `api.session.workflow.unscheduleSessionTurnsByTag(...)`
- `api.session.controls.registerSessionAction(...)`
- `api.session.controls.registerControlUiDescriptor(...)`
- `api.agent.events.registerAgentEventSubscription(...)`
- `api.agent.events.emitAgentEvent(...)`
- `api.runContext.setRunContext(...)` / `getRunContext(...)` / `clearRunContext(...)`
- `api.lifecycle.registerRuntimeLifecycle(...)`

Los métodos planos equivalentes siguen disponibles como alias de compatibilidad en desuso para los complementos existentes. No agregues nuevo código de complemento que llame a `api.registerSessionExtension`, `api.enqueueNextTurnInjection`, `api.registerControlUiDescriptor`, `api.registerRuntimeLifecycle`, `api.registerAgentEventSubscription`, `api.emitAgentEvent`, `api.setRunContext`, `api.getRunContext`, `api.clearRunContext`, `api.registerSessionSchedulerJob`, `api.registerSessionAction`, `api.sendSessionAttachment`, `api.scheduleSessionTurn` o `api.unscheduleSessionTurnsByTag` directamente.

`scheduleSessionTurn(...)` es una conveniencia con alcance de sesión sobre el programador
Cron de Gateway. Cron posee la sincronización y crea el registro de tarea en segundo plano cuando se
ejecuta el turno; el Plugin SDK solo restringe la sesión de destino, la nomenclatura
propia del complemento y la limpieza. Use `api.runtime.tasks.managedFlows` dentro del turno
programado cuando el trabajo en sí necesita un estado de flujo de tareas de varios pasos duradero.

Los contratos dividen intencionalmente la autoridad:

- Los complementos externos pueden poseer extensiones de sesión, descriptores de interfaz de usuario, comandos,
  metadatos de herramientas, inyecciones del siguiente turno y ganchos normales.
- Las políticas de herramientas confiables se ejecutan antes que los ganchos `before_tool_call` ordinarios y son
  exclusivas de los paquetes integrados porque participan en la política de seguridad del host.
- La propiedad reservada de comandos es exclusiva de los paquetes integrados. Los complementos externos deben usar sus
  propios nombres de comandos o alias.
- `allowPromptInjection=false` deshabilita los hooks de mutación de prompts, incluidos
  `agent_turn_prepare`, `before_prompt_build`, `heartbeat_prompt_contribution`,
  campos de prompt del legado `before_agent_start` y
  `enqueueNextTurnInjection`.

Ejemplos de consumidores que no son Plan:

| Arquetipo de complemento                             | Hooks utilizados                                                                                                                                                                              |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Flujo de trabajo de aprobación                       | Extensión de sesión, continuación de comandos, inyección de siguiente turno, descriptor de interfaz de usuario                                                                                |
| Puerta de política de presupuesto/espacio de trabajo | Política de herramientas de confianza, metadatos de herramientas, proyección de sesión                                                                                                        |
| Monitor de ciclo de vida en segundo plano            | Limpieza del ciclo de vida de ejecución, suscripción a eventos de agente, propiedad/limpieza del programador de sesiones, contribución de prompt de latido, descriptor de interfaz de usuario |
| Asistente de configuración o incorporación           | Extensión de sesión, comandos con ámbito, descriptor de interfaz de usuario de control                                                                                                        |

<Note>Los espacios de nombres reservados del núcleo de administración (`config.*`, `exec.approvals.*`, `wizard.*`, `update.*`) siempre permanecen `operator.admin`, incluso si un complemento intenta asignar un ámbito de método de puerta de enlace más estrecho. Se prefieren prefijos específicos del complemento para los métodos propiedad del complemento.</Note>

<Accordion title="Cuándo usar el middleware de resultados de herramientas">
  Los complementos empaquetados pueden usar `api.registerAgentToolResultMiddleware(...)` cuando
  necesitan reescribir un resultado de herramienta después de la ejecución y antes de que el tiempo de ejecución
  introduzca ese resultado de nuevo en el modelo. Esta es la costura neutra respecto al tiempo de ejecución
  y confiable para reductores de salida asíncronos como tokenjuice.

Los complementos empaquetados deben declarar `contracts.agentToolResultMiddleware` para cada
tiempo de ejecución específico, por ejemplo `["pi", "codex"]`. Los complementos externos
no pueden registrar este middleware; mantenga los enlaces normales de complementos de OpenClaw para el trabajo
que no necesita la sincronización de resultados de herramientas previa al modelo. La antigua ruta de registro
de fábrica de extensiones integradas solo para Pi se ha eliminado.

</Accordion>

### Registro de descubrimiento de Gateway

`api.registerGatewayDiscoveryService(...)` permite que un complemento anuncie el Gateway activo en un transporte de descubrimiento local como mDNS/Bonjour. OpenClaw llama al servicio durante el inicio del Gateway cuando el descubrimiento local está habilitado, pasa los puertos actuales del Gateway y los datos de sugerencia TXT no secretos, y llama al controlador `stop` devuelto durante el apagado del Gateway.

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

Los complementos de descubrimiento de Gateway no deben tratar los valores TXT anunciados como secretos o autenticación. El descubrimiento es una sugerencia de enrutamiento; la autenticación del Gateway y la fijación de TLS siguen siendo propietarias de la confianza.

### Metadatos de registro de CLI

`api.registerCli(registrar, opts?)` acepta dos tipos de metadatos de comandos:

- `commands`: nombres de comandos explícitos propiedad del registrador
- `descriptors`: descriptores de comandos en tiempo de análisis utilizados para la ayuda de la CLI, el enrutamiento y el registro perezoso de la CLI del complemento
- `parentPath`: ruta de comando principal opcional para grupos de comandos anidados, como
  `["nodes"]`

Para funciones de nodo emparejado, prefiera
`api.registerNodeCliFeature(registrar, opts?)`. Es un pequeño contenedor alrededor de
`api.registerCli(..., { parentPath: ["nodes"] })` y hace que comandos como
`openclaw nodes canvas` sean funciones de nodo propiedad explícita del complemento.

Si desea que un comando de complemento permanezca cargado de forma diferida en la ruta raíz normal de la CLI,
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

Los comandos anidados reciben el comando principal resuelto como `program`:

```typescript
api.registerCli(
  async ({ program }) => {
    const { registerNodesCanvasCommands } = await import("./src/cli.js");
    registerNodesCanvasCommands(program);
  },
  {
    parentPath: ["nodes"],
    descriptors: [
      {
        name: "canvas",
        description: "Capture or render canvas content from a paired node",
        hasSubcommands: true,
      },
    ],
  },
);
```

Use `commands` por sí solo solo cuando no necesite el registro de raíz de CLI diferida.
Esa ruta de compatibilidad entusiasta sigue siendo compatible, pero no instala
marcadores de posición respaldados por descriptores para la carga diferida en tiempo de análisis.

### Registro de backend de CLI

`api.registerCliBackend(...)` permite que un complemento sea el propietario de la configuración predeterminada para un
backend de CLI de AI local como `claude-cli` o `my-cli`.

- El `id` del backend se convierte en el prefijo del proveedor en las referencias de modelos como `my-cli/gpt-5`.
- El `config` del backend utiliza la misma forma que `agents.defaults.cliBackends.<id>`.
- La configuración del usuario aún tiene prioridad. OpenClaw combina `agents.defaults.cliBackends.<id>` sobre la
  definición predeterminada del complemento antes de ejecutar la CLI.
- Use `normalizeConfig` cuando un backend necesita reescrituras de compatibilidad después de la combinación
  (por ejemplo, normalizar formas de antiguos indicadores).
- Use `resolveExecutionArgs` para reescrituras de argv con ámbito de solicitud que pertenecen a
  el dialecto de la CLI, como mapear los niveles de pensamiento de OpenClaw a un indicador de esfuerzo nativo.

Para una guía de creación de extremo a extremo, consulte
[Plugins de backend de CLI](/es/plugins/cli-backend-plugins).

### Slots exclusivos

| Método                                     | Lo que registra                                                                                                                                                                         |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api.registerContextEngine(id, factory)`   | Motor de contexto (uno activo a la vez). La devolución de llamada `assemble()` recibe `availableTools` y `citationsMode` para que el motor pueda personalizar las adiciones del prompt. |
| `api.registerMemoryCapability(capability)` | Capacidad de memoria unificada                                                                                                                                                          |
| `api.registerMemoryPromptSection(builder)` | Generador de sección de prompt de memoria                                                                                                                                               |
| `api.registerMemoryFlushPlan(resolver)`    | Resolutor de plan de vaciado de memoria                                                                                                                                                 |
| `api.registerMemoryRuntime(runtime)`       | Adaptador de tiempo de ejecución de memoria                                                                                                                                             |

### Adaptadores de incrustación de memoria

| Método                                         | Lo que registra                                                 |
| ---------------------------------------------- | --------------------------------------------------------------- |
| `api.registerMemoryEmbeddingProvider(adapter)` | Adaptador de incrustación de memoria para el complemento activo |

- `registerMemoryCapability` es la API exclusiva de complemento de memoria preferida.
- `registerMemoryCapability` también puede exponer `publicArtifacts.listArtifacts(...)`
  para que los complementos acompañantes puedan consumir artefactos de memoria exportados a través de
  `openclaw/plugin-sdk/memory-host-core` en lugar de acceder al diseño privado
  de un complemento de memoria específico.
- `registerMemoryPromptSection`, `registerMemoryFlushPlan` y
  `registerMemoryRuntime` son API exclusivas de complementos de memoria compatibles con versiones anteriores.
- `MemoryFlushPlan.model` puede fijar el turno de vaciado en una referencia `provider/model`
  exacta, como `ollama/qwen3:8b`, sin heredar la cadena alternativa
  activa.
- `registerMemoryEmbeddingProvider` permite que el complemento de memoria activo registre uno
  o más identificadores de adaptador de incrustación (por ejemplo `openai`, `gemini`, o un
  identificador definido por un complemento personalizado).
- La configuración de usuario como `agents.defaults.memorySearch.provider` y
  `agents.defaults.memorySearch.fallback` se resuelve con esos ids de
  adaptador registrados.

### Eventos y ciclo de vida

| Método                                       | Lo que hace                                       |
| -------------------------------------------- | ------------------------------------------------- |
| `api.on(hookName, handler, opts?)`           | Gancho de ciclo de vida tipado                    |
| `api.onConversationBindingResolved(handler)` | Retorno de llamada de vinculación de conversación |

Consulte [Ganchos de complemento](/es/plugins/hooks) para ver ejemplos, nombres comunes de ganchos y semántica
de guardia.

### Semántica de decisión del gancho

- `before_tool_call`: devolver `{ block: true }` es terminal. Una vez que cualquier controlador lo establece, se omiten los controladores de menor prioridad.
- `before_tool_call`: devolver `{ block: false }` se trata como sin decisión (igual que omitir `block`), no como una anulación.
- `before_install`: devolver `{ block: true }` es terminal. Una vez que cualquier controlador lo establece, se omiten los controladores de menor prioridad.
- `before_install`: devolver `{ block: false }` se trata como sin decisión (igual que omitir `block`), no como una anulación.
- `reply_dispatch`: devolver `{ handled: true, ... }` es terminal. Una vez que cualquier controlador reclama el envío, se omiten los controladores de menor prioridad y la ruta de envío del modelo predeterminado.
- `message_sending`: devolver `{ cancel: true }` es terminal. Una vez que cualquier controlador lo establece, se omiten los controladores de menor prioridad.
- `message_sending`: devolver `{ cancel: false }` se trata como sin decisión (igual que omitir `cancel`), no como una anulación.
- `message_received`: use el campo tipado `threadId` cuando necesites enrutamiento entrante de hilo/tema. Mantén `metadata` para extras específicos del canal.
- `message_sending`: usa los campos de enrutamiento tipados `replyToId` / `threadId` antes de recurrir a `metadata` específicos del canal.
- `gateway_start`: usa `ctx.config`, `ctx.workspaceDir` y `ctx.getCron?.()` para el estado de inicio propiedad de la gateway en lugar de confiar en los enlaces internos `gateway:startup`.
- `cron_changed`: observa los cambios del ciclo de vida de cron propiedad de la puerta de enlace. Usa `event.job?.state?.nextRunAtMs` y `ctx.getCron?.()` al sincronizar planificadores de activación externos, y mantén a OpenClaw como la fuente de verdad para las comprobaciones de vencimiento y la ejecución.

### Campos del objeto API

| Campo                    | Tipo                      | Descripción                                                                                                       |
| ------------------------ | ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `api.id`                 | `string`                  | ID del complemento                                                                                                |
| `api.name`               | `string`                  | Nombre para mostrar                                                                                               |
| `api.version`            | `string?`                 | Versión del complemento (opcional)                                                                                |
| `api.description`        | `string?`                 | Descripción del complemento (opcional)                                                                            |
| `api.source`             | `string`                  | Ruta de origen del complemento                                                                                    |
| `api.rootDir`            | `string?`                 | Directorio raíz del complemento (opcional)                                                                        |
| `api.config`             | `OpenClawConfig`          | Instantánea de la configuración actual (instantánea de ejecución en memoria activa cuando está disponible)        |
| `api.pluginConfig`       | `Record<string, unknown>` | Configuración específica del complemento de `plugins.entries.<id>.config`                                         |
| `api.runtime`            | `PluginRuntime`           | [Asistentes de ejecución](/es/plugins/sdk-runtime)                                                                |
| `api.logger`             | `PluginLogger`            | Registrador con ámbito (`debug`, `info`, `warn`, `error`)                                                         |
| `api.registrationMode`   | `PluginRegistrationMode`  | Modo de carga actual; `"setup-runtime"` es la ventana ligera de inicio/configuración previa a la entrada completa |
| `api.resolvePath(input)` | `(string) => string`      | Resolver ruta relativa a la raíz del complemento                                                                  |

## Convención de módulo interno

Dentro de tu complemento, utiliza archivos barril locales para las importaciones internas:

```
my-plugin/
  api.ts            # Public exports for external consumers
  runtime-api.ts    # Internal-only runtime exports
  index.ts          # Plugin entry point
  setup-entry.ts    # Lightweight setup-only entry (optional)
```

<Warning>
  Nunca importes tu propio complemento a través de `openclaw/plugin-sdk/<your-plugin>`
  desde el código de producción. Enruta las importaciones internas a través de `./api.ts` o
  `./runtime-api.ts`. La ruta del SDK es únicamente el contrato externo.
</Warning>

Las superficies públicas de complementos empaquetados cargados por fachada (`api.ts`, `runtime-api.ts`,
`index.ts`, `setup-entry.ts` y archivos de entrada públicos similares) prefieren la
instantánea de configuración de runtime activa cuando OpenClaw ya se está ejecutando. Si aún no existe ninguna
instantánea de runtime, recurren al archivo de configuración resuelto en el disco.
Las fachadas de complementos empaquetados deben cargarse a través de los cargadores de
fachadas de complementos de OpenClaw; las importaciones directas desde `dist/extensions/...` omiten el manifiesto
y las comprobaciones del sidecar de runtime que las instalaciones empaquetadas utilizan para el código propiedad del complemento.

Los complementos de proveedor pueden exponer un barril de contrato local de complemento limitado cuando un
asistente es intencionalmente específico del proveedor y aún no pertenece a una subruta de SDK
genérica. Ejemplos empaquetados:

- **Anthropic**: costura pública `api.ts` / `contract-api.ts` para Claude
  encabezado beta y auxiliares de flujo `service_tier`.
- **`@openclaw/openai-provider`**: `api.ts` exporta constructores de proveedores,
  auxiliares de modelo predeterminado y constructores de proveedores en tiempo real.
- **`@openclaw/openrouter-provider`**: `api.ts` exporta el constructor de proveedores
  además de auxiliares de incorporación/configuración.

<Warning>
  El código de producción de extensiones también debe evitar `openclaw/plugin-sdk/<other-plugin>`
  importaciones. Si un auxiliar es realmente compartido, promuévalo a una subruta SDK neutral
  como `openclaw/plugin-sdk/speech`, `.../provider-model-shared`, u otra
  superficie orientada a capacidades en lugar de acoplar dos complementos entre sí.
</Warning>

## Relacionado

<CardGroup cols={2}>
  <Card title="Puntos de entrada" icon="door-open" href="/es/plugins/sdk-entrypoints">
    Opciones `definePluginEntry` y `defineChannelPluginEntry`.
  </Card>
  <Card title="Asistentes de tiempo de ejecución" icon="gears" href="/es/plugins/sdk-runtime">
    Referencia completa del espacio de nombres `api.runtime`.
  </Card>
  <Card title="Configuración" icon="sliders" href="/es/plugins/sdk-setup">
    Empaquetado, manifiestos y esquemas de configuración.
  </Card>
  <Card title="Pruebas" icon="vial" href="/es/plugins/sdk-testing">
    Utilidades de prueba y reglas de lint.
  </Card>
  <Card title="Migración del SDK" icon="arrows-turn-right" href="/es/plugins/sdk-migration">
    Migración desde superficies obsoletas.
  </Card>
  <Card title="Interno del complemento" icon="diagram-project" href="/es/plugins/architecture">
    Arquitectura profunda y modelo de capacidades.
  </Card>
</CardGroup>
