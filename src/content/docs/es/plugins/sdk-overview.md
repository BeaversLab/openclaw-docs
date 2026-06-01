---
summary: "Mapa de importación, referencia de la API de registro y arquitectura del SDK"
title: "Resumen del SDK de complementos"
sidebarTitle: "Resumen del SDK de complementos"
read_when:
  - You need to know which SDK subpath to import from
  - You want a reference for all registration methods on OpenClawPluginApi
  - You are looking up a specific SDK export
---

El SDK de complementos es el contrato con tipo entre los complementos y el núcleo. Esta página es la referencia de **qué importar** y **qué puede registrar**.

<Note>Esta página es para autores de complementos que usan `openclaw/plugin-sdk/*` dentro de OpenClaw. Para aplicaciones externas, scripts, tableros, trabajos de CI y extensiones de IDE que deseen ejecutar agentes a través de Gateway, utilice [OpenClaw App SDK](/es/concepts/openclaw-sdk) y el paquete `@openclaw/sdk` en su lugar.</Note>

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

Cada subruta es un módulo pequeño y autónomo. Esto mantiene el inicio rápido y
evita problemas de dependencias circulares. Para ayudantes de entrada/compilación específicos del canal,
prefiera `openclaw/plugin-sdk/channel-core`; mantenga `openclaw/plugin-sdk/core` para
la superficie general paraguas y ayudantes compartidos como
`buildChannelConfigSchema`.

Para la configuración del canal, publique el JSON Schema propiedad del canal a través de
`openclaw.plugin.json#channelConfigs`. La subruta `plugin-sdk/channel-config-schema`
es para primitivas de esquema compartidas y el constructor genérico. Los complementos
incluidos con OpenClaw usan `plugin-sdk/bundled-channel-config-schema` para esquemas
de canales incluidos retenidos. Las exportaciones de compatibilidad obsoletas permanecen en
`plugin-sdk/channel-config-schema-legacy`; ninguna subruta de esquema incluida es un
patrón para nuevos complementos.

<Warning>
  No importe costuras de conveniencia con marca de proveedor o canal (por ejemplo
  `openclaw/plugin-sdk/slack`, `.../discord`, `.../signal`, `.../whatsapp`).
  Los plugins integrados componen subrutas genéricas del SDK dentro de sus propios barriles `api.ts` /
  `runtime-api.ts`; los consumidores principales deben usar esos barriles locales del plugin
  o agregar un contrato genérico y estrecho del SDK cuando la necesidad sea realmente
  multi-canal.

Un pequeño conjunto de costuras de ayuda para plugins integrados todavía aparece en el mapa de exportación generado
cuando tienen uso de propietario rastreado. Existen solo para el mantenimiento de plugins integrados
y no son rutas de importación recomendadas para nuevos plugins de terceros.

`openclaw/plugin-sdk/discord` y `openclaw/plugin-sdk/telegram-account` se
mantienen también como fachadas de compatibilidad en desuso para el uso de propietarios rastreados. No
copie esas rutas de importación en nuevos plugins; use ayudas de tiempo de ejecución inyectadas y
subrutas genéricas del SDK de canal en su lugar.

</Warning>

## Referencia de subruta

El SDK de complementos se expone como un conjunto de subrutas estrechas agrupadas por área (entrada de complemento,
canal, proveedor, autenticación, tiempo de ejecución, capacidad, memoria y asistentes reservados
de complementos agrupados). Para el catálogo completo — agrupado y vinculado — consulte
[Plugin SDK subpaths](/es/plugins/sdk-subpaths).

El inventario del punto de entrada del compilador se encuentra en
`scripts/lib/plugin-sdk-entrypoints.json`; las exportaciones del paquete se generan a partir
del subconjunto público después de restar las subrutas de prueba/internas locales del repositorio listadas en
`scripts/lib/plugin-sdk-private-local-only-subpaths.json`. Ejecute
`pnpm plugin-sdk:surface` para auditar el recuento de exportaciones públicas. Las subrutas públicas en desuso
que son lo suficientemente antiguas y no utilizadas por el código de producción de extensiones integradas están
rastreadas en `scripts/lib/plugin-sdk-deprecated-public-subpaths.json`; los barriles amplios
de reexportación en desuso están rastreados en
`scripts/lib/plugin-sdk-deprecated-barrel-subpaths.json`.

## API de registro

La devolución de llamada `register(api)` recibe un objeto `OpenClawPluginApi` con estos
métodos:

### Registro de capacidades

| Método                                           | Lo que registra                                  |
| ------------------------------------------------ | ------------------------------------------------ |
| `api.registerProvider(...)`                      | Inferencia de texto (LLM)                        |
| `api.registerAgentHarness(...)`                  | Ejecutor de agentes de bajo nivel experimental   |
| `api.registerCliBackend(...)`                    | Backend de inferencia de CLI local               |
| `api.registerChannel(...)`                       | Canal de mensajería                              |
| `api.registerEmbeddingProvider(...)`             | Proveedor de incrustación de vector reutilizable |
| `api.registerSpeechProvider(...)`                | Síntesis de texto a voz / STT                    |
| `api.registerRealtimeTranscriptionProvider(...)` | Transcripción en tiempo real por secuencias      |
| `api.registerRealtimeVoiceProvider(...)`         | Sesiones de voz en tiempo real dúplex            |
| `api.registerMediaUnderstandingProvider(...)`    | Análisis de imagen/audio/video                   |
| `api.registerImageGenerationProvider(...)`       | Generación de imágenes                           |
| `api.registerMusicGenerationProvider(...)`       | Generación de música                             |
| `api.registerVideoGenerationProvider(...)`       | Generación de video                              |
| `api.registerWebFetchProvider(...)`              | Proveedor de recuperación/extracción web         |
| `api.registerWebSearchProvider(...)`             | Búsqueda web                                     |

Los proveedores de incrustaciones registrados con `api.registerEmbeddingProvider(...)` también
deben figurar en `contracts.embeddingProviders` en el manifiesto del complemento. Esta
es la superficie de incrustación genérica para la generación de vectores reutilizable. La búsqueda de
memoria puede consumir esta superficie de proveedor genérica. La
interfaz `api.registerMemoryEmbeddingProvider(...)` y
`contracts.memoryEmbeddingProviders` más antigua es una compatibilidad desaprobada mientras
los proveedores existentes específicos de la memoria migran.

### Herramientas y comandos

Use [`defineToolPlugin`](/es/plugins/tool-plugins) para complementos simples de solo herramientas
con nombres de herramientas fijos. Use `api.registerTool(...)` directamente para complementos mixtos
o registro de herramientas completamente dinámico.

| Método                          | Lo que registra                                            |
| ------------------------------- | ---------------------------------------------------------- |
| `api.registerTool(tool, opts?)` | Herramienta de agente (obligatoria u `{ optional: true }`) |
| `api.registerCommand(def)`      | Comando personalizado (omite el LLM)                       |

Los comandos de complemento pueden establecer `agentPromptGuidance` cuando el agente necesita una
sugerencia de enrutamiento breve y propiedad del comando. Mantenga ese texto sobre el
comando en sí; no añada políticas específicas del proveedor o del complemento a los
constructores de mensajes principales.

Las entradas de orientación pueden ser cadenas heredadas, que se aplican a cada superficie
de mensaje, o entradas estructuradas:

```ts
agentPromptGuidance: ["Global command hint.", { text: "Only show this in the main OpenClaw prompt.", surfaces: ["openclaw_main"] }];
```

El `surfaces` estructurado puede incluir `openclaw_main`, `codex_app_server`,
`cli_backend`, `acp_backend` o `subagent`. `pi_main` sigue siendo un alias desaprobado
para `openclaw_main`. Omita `surfaces` para una orientación intencional de todas las superficies. No
pase una matriz `surfaces` vacía; se rechaza para que la pérdida accidental de alcance no
se convierta en texto de prompt global.

Las instrucciones del desarrollador del servidor de aplicaciones de Codex nativo son más estrictas que otras
superficies de prompt: solo la orientación explícitamente limitada a `codex_app_server` se promueve a
ese carril de mayor prioridad. La orientación de cadena heredada y la orientación estructurada sin ámbito
siguen disponibles para las superficies de prompt que no son de Codex por compatibilidad.

### Infraestructura

| Método                                         | Lo que registra                                                 |
| ---------------------------------------------- | --------------------------------------------------------------- |
| `api.registerHook(events, handler, opts?)`     | Gancho de eventos                                               |
| `api.registerHttpRoute(params)`                | Punto final HTTP de Gateway                                     |
| `api.registerGatewayMethod(name, handler)`     | Método RPC de Gateway                                           |
| `api.registerGatewayDiscoveryService(service)` | Anunciador de descubrimiento de Gateway local                   |
| `api.registerCli(registrar, opts?)`            | Subcomando de CLI                                               |
| `api.registerNodeCliFeature(registrar, opts?)` | CLI de características de nodo bajo `openclaw nodes`            |
| `api.registerService(service)`                 | Servicio en segundo plano                                       |
| `api.registerInteractiveHandler(registration)` | Controlador interactivo                                         |
| `api.registerAgentToolResultMiddleware(...)`   | Middleware de resultados de herramientas en tiempo de ejecución |
| `api.registerMemoryPromptSupplement(builder)`  | Sección de mensaje aditiva adyacente a la memoria               |
| `api.registerMemoryCorpusSupplement(adapter)`  | Corpus de búsqueda/lectura de memoria aditiva                   |

### Ganchos de host para complementos de flujo de trabajo

Los enlaces del host son los puntos de unión del SDK para complementos que necesitan participar en el ciclo de vida del host en lugar de solo agregar un proveedor, canal o herramienta. Son contratos genéricos; el modo Plan puede usarlos, pero también los flujos de trabajo de aprobación, las puertas de políticas del espacio de trabajo, los monitores en segundo plano, los asistentes de configuración y los complementos de interfaz de usuario complementarios.

| Método                                                                               | Contrato al que pertenece                                                                                                                                                       |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api.session.state.registerSessionExtension(...)`                                    | Estado de sesión propiedad del complemento y compatible con JSON, proyectado a través de sesiones del Gateway                                                                   |
| `api.session.workflow.enqueueNextTurnInjection(...)`                                 | Contexto duradero de exactamente una vez inyectado en el siguiente turno del agente para una sesión                                                                             |
| `api.registerTrustedToolPolicy(...)`                                                 | Política de herramienta previa al complemento, agrupada/confiable, que puede bloquear o reescribir los parámetros de la herramienta                                             |
| `api.registerToolMetadata(...)`                                                      | Metadatos de visualización del catálogo de herramientas sin cambiar la implementación de la herramienta                                                                         |
| `api.registerCommand(...)`                                                           | Comandos de complementos con ámbito; los resultados de los comandos pueden establecer `continueAgent: true`; los comandos nativos de Discord admiten `descriptionLocalizations` |
| `api.session.controls.registerControlUiDescriptor(...)`                              | Descriptores de contribución a la interfaz de usuario de control para sesiones, herramientas, ejecuciones o superficies de configuración                                        |
| `api.lifecycle.registerRuntimeLifecycle(...)`                                        | Devoluciones de llamada de limpieza para recursos de tiempo de ejecución propiedad del complemento en rutas de restablecimiento/eliminación/recarga                             |
| `api.agent.events.registerAgentEventSubscription(...)`                               | Suscripciones a eventos saneados para el estado del flujo de trabajo y los monitores                                                                                            |
| `api.runContext.setRunContext(...)` / `getRunContext(...)` / `clearRunContext(...)`  | Estado de trabajo provisional del complemento por ejecución, borrado en el ciclo de vida de ejecución terminal                                                                  |
| `api.session.workflow.registerSessionSchedulerJob(...)`                              | Metadatos de limpieza para trabajos del programador propiedad del complemento; no programa trabajo ni crea registros de tareas                                                  |
| `api.session.workflow.sendSessionAttachment(...)`                                    | Entrega de archivos adjuntos mediada por el host, solo agrupada, a la ruta de sesión de salida directa activa                                                                   |
| `api.session.workflow.scheduleSessionTurn(...)` / `unscheduleSessionTurnsByTag(...)` | Turnos de sesión programados respaldados por Cron, solo agrupados, más limpieza basada en etiquetas                                                                             |
| `api.session.controls.registerSessionAction(...)`                                    | Acciones de sesión tipificadas que los clientes pueden enviar a través del Gateway                                                                                              |

Use los espacios de nombres agrupados para el nuevo código del complemento:

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

Los métodos planos equivalentes siguen disponibles como alias de compatibilidad
obsoletos para los complementos existentes. No agregues nuevo código de complemento
que llame directamente a `api.registerSessionExtension`, `api.enqueueNextTurnInjection`,
`api.registerControlUiDescriptor`, `api.registerRuntimeLifecycle`,
`api.registerAgentEventSubscription`, `api.emitAgentEvent`,
`api.setRunContext`, `api.getRunContext`, `api.clearRunContext`,
`api.registerSessionSchedulerJob`, `api.registerSessionAction`,
`api.sendSessionAttachment`, `api.scheduleSessionTurn` o
`api.unscheduleSessionTurnsByTag`.

`scheduleSessionTurn(...)` es una conveniencia con ámbito de sesión sobre el
programador Cron de Gateway. Cron controla el tiempo y crea el registro de tareas
en segundo plano cuando se ejecuta el turno; el Plugin SDK solo restringe la
sesión de destino, la nomenclatura propiedad del complemento y la limpieza.
Utiliza `api.runtime.tasks.managedFlows` dentro del turno programado cuando el trabajo
mismo necesita un estado de flujo de tareas de varios pasos duradero.

Los contratos dividen intencionalmente la autoridad:

- Los complementos externos pueden ser propietarios de extensiones de sesión, descriptores de interfaz de usuario, comandos, metadatos de herramientas, inyecciones de siguiente turno y enlaces normales.
- Las políticas de herramientas de confianza se ejecutan antes que los ganchos
  ordinarios `before_tool_call` y solo están disponibles en versiones
  incluidas (bundled-only) porque participan en la política de seguridad del host.
- La propiedad reservada de comandos está disponible solo en paquetes. Los complementos externos deben usar sus propios nombres de comandos o alias.
- `allowPromptInjection=false` deshabilita los hooks de modificación de prompt, incluyendo
  `agent_turn_prepare`, `before_prompt_build`, `heartbeat_prompt_contribution`,
  campos de prompt del `before_agent_start` heredado y
  `enqueueNextTurnInjection`.

Ejemplos de consumidores que no son de Plan:

| Arquetipo de complemento                             | Enlaces utilizados                                                                                                                                                                           |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Flujo de trabajo de aprobación                       | Extensión de sesión, continuación de comando, inyección de siguiente turno, descriptor de interfaz de usuario                                                                                |
| Puerta de política de presupuesto/espacio de trabajo | Política de herramientas de confianza, metadatos de herramientas, proyección de sesión                                                                                                       |
| Monitor del ciclo de vida en segundo plano           | Limpieza del ciclo de vida de ejecución, suscripción a eventos de agente, propiedad/limpieza del programador de sesiones, contribución de aviso de latido, descriptor de interfaz de usuario |
| Asistente de configuración o incorporación           | Extensión de sesión, comandos con ámbito, descriptor de interfaz de usuario de control                                                                                                       |

<Note>Los espacios de nombres de administrador central reservados (`config.*`, `exec.approvals.*`, `wizard.*`, `update.*`) siempre se mantienen `operator.admin`, incluso si un complemento intenta asignar un ámbito de método de gateway más estrecho. Se prefieren prefijos específicos del complemento para métodos propiedad del complemento.</Note>

<Accordion title="Cuándo usar el middleware de resultados de herramientas">
  Los complementos agrupados pueden usar `api.registerAgentToolResultMiddleware(...)` cuando
  necesitan reescribir un resultado de herramienta después de la ejecución y antes de que el tiempo de ejecución
  introduzca ese resultado de nuevo en el modelo. Esta es la costura neutral de tiempo de ejecución confiable
  para reductores de salida asíncronos como tokenjuice.

Los complementos agrupados deben declarar `contracts.agentToolResultMiddleware` para cada
tiempo de ejecución objetivo, por ejemplo `["openclaw", "codex"]`. Los complementos externos
no pueden registrar este middleware; mantenga los hooks normales de complementos de OpenClaw para el trabajo
que no necesite el tiempo de resultado de herramienta pre-modelo. La antigua ruta de registro de fábrica de extensiones solo para ejecutor integrado
ha sido eliminada.

</Accordion>

### Registro de descubrimiento de puerta de enlace

`api.registerGatewayDiscoveryService(...)` permite que un complemento anuncie el Gateway
activo en un transporte de descubrimiento local como mDNS/Bonjour. OpenClaw llama al
servicio durante el inicio del Gateway cuando el descubrimiento local está habilitado, pasa los
puertos del Gateway actuales y datos de sugerencia TXT no secretos, y llama al controlador `stop`
devuelto durante el apagado del Gateway.

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

Los complementos de descubrimiento de puerta de enlace no deben tratar los valores TXT anunciados como secretos o
autenticación. El descubrimiento es una sugerencia de enrutamiento; la autenticación de la puerta de enlace y el anclaje TLS aún
poseen la confianza.

### Metadatos de registro de CLI

`api.registerCli(registrar, opts?)` acepta dos tipos de metadatos de comando:

- `commands`: nombres de comandos explícitos propiedad del registrador
- `descriptors`: descriptores de comandos en tiempo de análisis utilizados para la ayuda de CLI,
  enrutamiento y registro perezoso de CLI de complementos
- `parentPath`: ruta de comando principal opcional para grupos de comandos anidados, como
  `["nodes"]`

Para características de nodos emparejados, prefiera
`api.registerNodeCliFeature(registrar, opts?)`. Es un pequeño contenedor alrededor de
`api.registerCli(..., { parentPath: ["nodes"] })` y hace que comandos como
`openclaw nodes canvas` sean características de nodo propiedad explícita del complemento.

Si desea que un comando de complemento permanezca cargado de forma diferida en la ruta raíz normal de la CLI,
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

Use `commands` por sí solo solo cuando no necesite el registro diferido de la CLI raíz.
Esa ruta de compatificación ansiosa sigue siendo compatible, pero no instala
marcadores de posición respaldados por descriptores para la carga diferida en el momento del análisis.

### Registro de backend de CLI

`api.registerCliBackend(...)` permite que un complemento sea propietario de la configuración predeterminada para un
backend local de IA de la CLI, como `claude-cli` o `my-cli`.

- El `id` del backend se convierte en el prefijo del proveedor en las referencias de modelos como `my-cli/gpt-5`.
- El `config` del backend usa la misma forma que `agents.defaults.cliBackends.<id>`.
- La configuración del usuario todavía tiene prioridad. OpenClaw combina `agents.defaults.cliBackends.<id>` sobre la
  predeterminada del complemento antes de ejecutar la CLI.
- Use `normalizeConfig` cuando un backend necesite reescrituras de compatibilidad después de la combinación
  (por ejemplo, normalizar formas antiguas de indicadores).
- Use `resolveExecutionArgs` para reescrituras de argv con ámbito de solicitud que pertenezcan a
  al dialecto de la CLI, como mapear los niveles de pensamiento de OpenClaw a un indicador de esfuerzo nativo.

Para una guía de creación de extremo a extremo, consulta
[Complementos de backend de CLI](/es/plugins/cli-backend-plugins).

### Slots exclusivos

| Método                                     | Lo que registra                                                                                                                                                                    |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api.registerContextEngine(id, factory)`   | Motor de contexto (uno activo a la vez). La devolución de llamada `assemble()` recibe `availableTools` y `citationsMode` para que el motor pueda adaptar las adiciones del prompt. |
| `api.registerMemoryCapability(capability)` | Capacidad de memoria unificada                                                                                                                                                     |
| `api.registerMemoryPromptSection(builder)` | Generador de sección de mensaje de memoria                                                                                                                                         |
| `api.registerMemoryFlushPlan(resolver)`    | Resolutor de plan de vaciado de memoria                                                                                                                                            |
| `api.registerMemoryRuntime(runtime)`       | Adaptador de tiempo de ejecución de memoria                                                                                                                                        |

### Adaptadores de incrustación de memoria en desuso

| Método                                         | Lo que registra                                                 |
| ---------------------------------------------- | --------------------------------------------------------------- |
| `api.registerMemoryEmbeddingProvider(adapter)` | Adaptador de incrustación de memoria para el complemento activo |

- `registerMemoryCapability` es la API exclusiva preferida para complementos de memoria.
- `registerMemoryCapability` también puede exponer `publicArtifacts.listArtifacts(...)`
  para que los complementos complementarios puedan consumir artefactos de memoria exportados a través de
  `openclaw/plugin-sdk/memory-host-core` en lugar de acceder al diseño privado
  de un complemento de memoria específico.
- `registerMemoryPromptSection`, `registerMemoryFlushPlan` y
  `registerMemoryRuntime` son APIs exclusivas de complementos de memoria compatibles con versiones heredadas.
- `MemoryFlushPlan.model` puede fijar el turno de vaciado en una referencia `provider/model`
  exacta, como `ollama/qwen3:8b`, sin heredar la cadena de reserva
  activa.
- `registerMemoryEmbeddingProvider` está obsoleto. Los nuevos proveedores de inserción
  deben usar `api.registerEmbeddingProvider(...)` y
  `contracts.embeddingProviders`.
- Los proveedores existentes específicos de memoria continúan funcionando durante el período de migración,
  pero la inspección de complementos informa esto como una deuda de compatibilidad para
  los complementos no incluidos.

### Eventos y ciclo de vida

| Método                                       | Lo que hace                                          |
| -------------------------------------------- | ---------------------------------------------------- |
| `api.on(hookName, handler, opts?)`           | Gancho de ciclo de vida tipado                       |
| `api.onConversationBindingResolved(handler)` | Devolución de llamada de vinculación de conversación |

Consulte [Ganchos de complemento](/es/plugins/hooks) para ver ejemplos, nombres comunes de ganchos y semántica
de protección.

### Semántica de decisión de gancho

- `before_tool_call`: devolver `{ block: true }` es terminal. Una vez que cualquier controlador lo establece, se omiten los controladores de menor prioridad.
- `before_tool_call`: devolver `{ block: false }` se trata como sin decisión (lo mismo que omitir `block`), no como una invalidación.
- `before_install`: devolver `{ block: true }` es terminal. Una vez que cualquier controlador lo establece, se omiten los controladores de menor prioridad.
- `before_install`: devolver `{ block: false }` se trata como sin decisión (lo mismo que omitir `block`), no como una anulación.
- `reply_dispatch`: devolver `{ handled: true, ... }` es terminal. Una vez que cualquier controlador reclama el envío, se omiten los controladores de menor prioridad y la ruta de envío del modelo predeterminado.
- `message_sending`: devolver `{ cancel: true }` es terminal. Una vez que cualquier controlador lo establece, se omiten los controladores de menor prioridad.
- `message_sending`: devolver `{ cancel: false }` se trata como sin decisión (lo mismo que omitir `cancel`), no como una anulación.
- `message_received`: use el campo con tipo `threadId` cuando necesite enrutamiento de hilos/temas entrantes. Mantenga `metadata` para elementos adicionales específicos del canal.
- `message_sending`: use los campos de enrutamiento con tipo `replyToId` / `threadId` antes de recurrir a `metadata` específicos del canal.
- `gateway_start`: use `ctx.config`, `ctx.workspaceDir` y `ctx.getCron?.()` para el estado de inicio propiedad de la puerta de enlace en lugar de confiar en los ganchos internos `gateway:startup`.
- `cron_changed`: observe los cambios del ciclo de vida de cron propiedad de la puerta de enlace. Use `event.job?.state?.nextRunAtMs` y `ctx.getCron?.()` al sincronizar planificadores de activación externos, y mantenga OpenClaw como la fuente de verdad para las comprobaciones de vencimiento y la ejecución.

### Campos del objeto API

| Campo                    | Tipo                      | Descripción                                                                                                       |
| ------------------------ | ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `api.id`                 | `string`                  | ID del complemento                                                                                                |
| `api.name`               | `string`                  | Nombre para mostrar                                                                                               |
| `api.version`            | `string?`                 | Versión del complemento (opcional)                                                                                |
| `api.description`        | `string?`                 | Descripción del complemento (opcional)                                                                            |
| `api.source`             | `string`                  | Ruta de origen del complemento                                                                                    |
| `api.rootDir`            | `string?`                 | Directorio raíz del complemento (opcional)                                                                        |
| `api.config`             | `OpenClawConfig`          | Instantánea de configuración actual (instantánea de ejecución en memoria activa cuando esté disponible)           |
| `api.pluginConfig`       | `Record<string, unknown>` | Configuración específica del complemento desde `plugins.entries.<id>.config`                                      |
| `api.runtime`            | `PluginRuntime`           | [Asistentes de tiempo de ejecución](/es/plugins/sdk-runtime)                                                      |
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
  desde el código de producción. Dirija las importaciones internas a través de `./api.ts` o
  `./runtime-api.ts`. La ruta del SDK es solo el contrato externo.
</Warning>

Las superficies públicas de complementos agrupados cargados por fachada (`api.ts`, `runtime-api.ts`,
`index.ts`, `setup-entry.ts`, y archivos de entrada públicos similares) prefieren la
instantánea de configuración de tiempo de ejecución activa cuando OpenClaw ya se está ejecutando. Si aún no existe una
instantánea de tiempo de ejecución, recurren al archivo de configuración resuelto en el disco.
Las fachadas de complementos agrupados empaquetados deben cargarse a través de los cargadores de fachadas
de complementos de OpenClaw; las importaciones directas desde `dist/extensions/...` omiten el manifiesto
y las comprobaciones de sidecar de tiempo de ejecución que las instalaciones empaquetadas usan para el código propio del complemento.

Los complementos de proveedor pueden exponer un barril de contrato local de complemento estrecho cuando un
asistente es intencionalmente específico del proveedor y aún no pertenece a una subruta de SDK genérica.
Ejemplos agrupados:

- **Anthropic**: costura pública `api.ts` / `contract-api.ts` para Claude
  beta-header y `service_tier` asistentes de flujo.
- **`@openclaw/openai-provider`**: `api.ts` exporta constructores de proveedores,
  asistentes de modelo predeterminado y constructores de proveedores en tiempo real.
- **`@openclaw/openrouter-provider`**: `api.ts` exporta el constructor de proveedores
  además de asistentes de incorporación/configuración.

<Warning>
  El código de producción de Extensiones también debe evitar `openclaw/plugin-sdk/<other-plugin>`
  importaciones. Si un asistente es realmente compartido, promuévalo a una subruta SDK neutral
  como `openclaw/plugin-sdk/speech`, `.../provider-model-shared`, u otra
  superficie orientada a capacidades en lugar de acoplar dos complementos entre sí.
</Warning>

## Relacionado

<CardGroup cols={2}>
  <Card title="Puntos de entrada" icon="door-open" href="/es/plugins/sdk-entrypoints">
    `definePluginEntry` y `defineChannelPluginEntry` opciones.
  </Card>
  <Card title="Asistentes de tiempo de ejecución" icon="gears" href="/es/plugins/sdk-runtime">
    Referencia completa del espacio de nombres `api.runtime`.
  </Card>
  <Card title="Configuración y ajustes" icon="sliders" href="/es/plugins/sdk-setup">
    Empaquetado, manifiestos y esquemas de configuración.
  </Card>
  <Card title="Pruebas" icon="vial" href="/es/plugins/sdk-testing">
    Utilidades de prueba y reglas de lint.
  </Card>
  <Card title="Migración del SDK" icon="arrows-turn-right" href="/es/plugins/sdk-migration">
    Migración desde superficies obsoletas.
  </Card>
  <Card title="Internos del complemento" icon="diagram-project" href="/es/plugins/architecture">
    Arquitectura profunda y modelo de capacidades.
  </Card>
</CardGroup>
