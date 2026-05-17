---
summary: "Crea tu primer complemento de OpenClaw en minutos"
title: "Construcción de complementos"
sidebarTitle: "Primeros pasos"
read_when:
  - You want to create a new OpenClaw plugin
  - You need a quick-start for plugin development
  - You are adding a new channel, provider, tool, or other capability to OpenClaw
---

Los plugins amplían OpenClaw con nuevas capacidades: canales, proveedores de modelos,
voz, transcripción en tiempo real, voz en tiempo real, comprensión de medios, generación
de imágenes, generación de video, obtención web, búsqueda web, herramientas de agente, o cualquier
combinación.

No es necesario que añadas tu complemento al repositorio de OpenClaw. Publícalo en [ClawHub](/es/clawhub) y los usuarios lo instalarán con `openclaw plugins install clawhub:<package-name>`. Las especificaciones de paquetes básicos aún se instalan desde npm durante el cambio de lanzamiento.

## Requisitos previos

- Node >= 22 y un administrador de paquetes (npm o pnpm)
- Familiaridad con TypeScript (ESM)
- Para complementos en el repositorio: repositorio clonado y `pnpm install` hecho. El desarrollo de complementos con checkout de código fuente es exclusivo de pnpm porque OpenClaw carga complementos empaquetados desde los paquetes del espacio de trabajo `extensions/*`.

## ¿Qué tipo de plugin?

<CardGroup cols={3}>
  <Card title="Complemento de canal" icon="messages-square" href="/es/plugins/sdk-channel-plugins">
    Conecta OpenClaw a una plataforma de mensajería (Discord, IRC, etc.)
  </Card>
  <Card title="Complemento de proveedor" icon="cpu" href="/es/plugins/sdk-provider-plugins">
    Agrega un proveedor de modelos (LLM, proxy o punto de conexión personalizado)
  </Card>
  <Card title="Complemento de backend de CLI" icon="terminal" href="/es/plugins/cli-backend-plugins">
    Mapea una CLI de IA local en el ejecutor de reserva de texto de OpenClaw
  </Card>
  <Card title="Complemento de herramienta / hook" icon="wrench" href="/es/plugins/hooks">
    Registra herramientas de agente, hooks de eventos o servicios - continúa a continuación
  </Card>
</CardGroup>

Para un complemento de canal que no se garantiza que esté instalado cuando se ejecuta la incorporación/configuración,
usa `createOptionalChannelSetupSurface(...)` de
`openclaw/plugin-sdk/channel-setup`. Produce un par de adaptador de configuración + asistente
que anuncia el requisito de instalación y falla de forma cerrada en escrituras de configuración reales
hasta que se instale el complemento.

## Inicio rápido: complemento de herramienta

Este tutorial crea un complemento mínimo que registra una herramienta de agente. Los complementos de
canal y proveedor tienen guías dedicadas vinculadas anteriormente.

<Steps>
  <Step title="Crear el paquete y el manifiesto">
    <CodeGroup>
    ```json package.json
    {
      "name": "@myorg/openclaw-my-plugin",
      "version": "1.0.0",
      "type": "module",
      "openclaw": {
        "extensions": ["./index.ts"],
        "compat": {
          "pluginApi": ">=2026.3.24-beta.2",
          "minGatewayVersion": "2026.3.24-beta.2"
        },
        "build": {
          "openclawVersion": "2026.3.24-beta.2",
          "pluginSdkVersion": "2026.3.24-beta.2"
        }
      }
    }
    ```

    ```json openclaw.plugin.json
    {
      "id": "my-plugin",
      "name": "My Plugin",
      "description": "Adds a custom tool to OpenClaw",
      "contracts": {
        "tools": ["my_tool"]
      },
      "activation": {
        "onStartup": true
      },
      "configSchema": {
        "type": "object",
        "additionalProperties": false
      }
    }
    ```
    </CodeGroup>

    Cada complemento necesita un manifiesto, incluso sin configuración. Las herramientas registradas en tiempo de ejecución deben aparecer en `contracts.tools` para que OpenClaw pueda descubrir el complemento propietario sin cargar el tiempo de ejecución de cada complemento. Los complementos también deben declarar `activation.onStartup` intencionalmente. Este ejemplo lo establece en `true`. Consulta [Manifest](/es/plugins/manifest) para obtener el esquema completo. Los fragmentos de publicación canónicos de ClawHub viven en `docs/snippets/plugin-publish/`.

  </Step>

  <Step title="Escribir el punto de entrada">

    ```typescript
    // index.ts
    import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
    import { Type } from "@sinclair/typebox";

    export default definePluginEntry({
      id: "my-plugin",
      name: "My Plugin",
      description: "Adds a custom tool to OpenClaw",
      register(api) {
        api.registerTool({
          name: "my_tool",
          description: "Do a thing",
          parameters: Type.Object({ input: Type.String() }),
          async execute(_id, params) {
            return { content: [{ type: "text", text: `Got: ${params.input}` }] };
          },
        });
      },
    });
    ```

    `definePluginEntry` es para complementos que no son de canal. Para los canales, usa `defineChannelPluginEntry` - consulta [Channel Plugins](/es/plugins/sdk-channel-plugins).
    Para todas las opciones del punto de entrada, consulta [Entry Points](/es/plugins/sdk-entrypoints).

  </Step>

  <Step title="Probar y publicar">

    **Complementos externos:** valide y publique con ClawHub, luego instale:

    ```bash
    clawhub package publish your-org/your-plugin --dry-run
    clawhub package publish your-org/your-plugin
    openclaw plugins install clawhub:@myorg/openclaw-my-plugin
    ```

    Las especificaciones de paquete básicas como `@myorg/openclaw-my-plugin` se instalan desde npm durante
    el transitorio de lanzamiento. Use `clawhub:` cuando desee la resolución de ClawHub.

    **Complementos en el repositorio:** colóquelos en el árbol del espacio de trabajo del complemento empaquetado; se descubren automáticamente.

    ```bash
    pnpm test -- <bundled-plugin-root>/my-plugin/
    ```

  </Step>
</Steps>

## Capacidades del complemento

Un único plugin puede registrar cualquier número de capacidades a través del objeto `api`:

| Capacidad                                | Método de registro                               | Guía detallada                                                                     |
| ---------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Inferencia de texto (LLM)                | `api.registerProvider(...)`                      | [Provider Plugins](/es/plugins/sdk-provider-plugins)                               |
| Backend de inferencia de CLI             | `api.registerCliBackend(...)`                    | [CLI Backend Plugins](/es/plugins/cli-backend-plugins)                             |
| Canal / mensajería                       | `api.registerChannel(...)`                       | [Channel Plugins](/es/plugins/sdk-channel-plugins)                                 |
| Voz (TTS/STT)                            | `api.registerSpeechProvider(...)`                | [Provider Plugins](/es/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Transcripción en tiempo real             | `api.registerRealtimeTranscriptionProvider(...)` | [Provider Plugins](/es/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Voz en tiempo real                       | `api.registerRealtimeVoiceProvider(...)`         | [Provider Plugins](/es/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Comprensión de medios                    | `api.registerMediaUnderstandingProvider(...)`    | [Provider Plugins](/es/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Generación de imágenes                   | `api.registerImageGenerationProvider(...)`       | [Provider Plugins](/es/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Generación de música                     | `api.registerMusicGenerationProvider(...)`       | [Provider Plugins](/es/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Generación de video                      | `api.registerVideoGenerationProvider(...)`       | [Provider Plugins](/es/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Recuperación web                         | `api.registerWebFetchProvider(...)`              | [Provider Plugins](/es/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Búsqueda web                             | `api.registerWebSearchProvider(...)`             | [Provider Plugins](/es/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Middleware de resultados de herramientas | `api.registerAgentToolResultMiddleware(...)`     | [SDK Overview](/es/plugins/sdk-overview#registration-api)                          |
| Herramientas de agente                   | `api.registerTool(...)`                          | A continuación                                                                     |
| Comandos personalizados                  | `api.registerCommand(...)`                       | [Entry Points](/es/plugins/sdk-entrypoints)                                        |
| Ganchos de complementos                  | `api.on(...)`                                    | [Plugin hooks](/es/plugins/hooks)                                                  |
| Ganchos de eventos internos              | `api.registerHook(...)`                          | [Entry Points](/es/plugins/sdk-entrypoints)                                        |
| Rutas HTTP                               | `api.registerHttpRoute(...)`                     | [Aspectos internos](/es/plugins/architecture-internals#gateway-http-routes)        |
| Subcomandos de CLI                       | `api.registerCli(...)`                           | [Puntos de entrada](/es/plugins/sdk-entrypoints)                                   |

Para ver la API de registro completa, consulte [Descripción general del SDK](/es/plugins/sdk-overview#registration-api).

Los complementos empaquetados pueden usar `api.registerAgentToolResultMiddleware(...)` cuando
necesitan reescritura asíncrona de resultados de herramientas antes de que el modelo vea la salida. Declare los
runtimes de destino en `contracts.agentToolResultMiddleware`, por ejemplo
`["pi", "codex"]`. Esta es una costura de complemento empaquetado confiable; los
complementos externos deben preferir los enlaces de complemento habituales de OpenClaw a menos que OpenClaw desarrolle una
política de confianza explícita para esta capacidad.

Si su complemento registra métodos RPC de gateway personalizados, manténgalos en un prefijo específico del complemento. Los espacios de nombres de administración central (`config.*`, `exec.approvals.*`, `wizard.*`, `update.*`) permanecen reservados y siempre se resuelven en `operator.admin`, incluso si un complemento solicita un ámbito más estrecho.

Semánticas de protección de gancho a tener en cuenta:

- `before_tool_call`: `{ block: true }` es terminal y detiene los controladores de menor prioridad.
- `before_tool_call`: `{ block: false }` se trata como sin decisión.
- `before_tool_call`: `{ requireApproval: true }` pausa la ejecución del agente y solicita al usuario su aprobación a través de la superposición de aprobación de ejecución, botones de Telegram, interacciones de Discord o el comando `/approve` en cualquier canal.
- `before_install`: `{ block: true }` es terminal y detiene los manejadores de menor prioridad.
- `before_install`: `{ block: false }` se trata como ninguna decisión.
- `message_sending`: `{ cancel: true }` es terminal y detiene los manejadores de menor prioridad.
- `message_sending`: `{ cancel: false }` se trata como ninguna decisión.
- `message_received`: prefiera el campo con tipo `threadId` cuando necesite enrutamiento entrante de hilos/temas. Mantenga `metadata` para complementos específicos del canal.
- `message_sending`: prefiera los campos de enrutamiento con tipo `replyToId` / `threadId` en lugar de claves de metadatos específicas del canal.

El comando `/approve` gestiona tanto las aprobaciones de ejecución como las de complementos con un respaldo limitado: cuando no se encuentra un ID de aprobación de ejecución, OpenClaw reintenta el mismo ID a través de las aprobaciones de complementos. El reenvío de aprobaciones de complementos se puede configurar de forma independiente a través de `approvals.plugin` en la configuración.

Si la lógica personalizada de aprobación necesita detectar ese mismo caso de respaldo limitado, prefiera `isApprovalNotFoundError` de `openclaw/plugin-sdk/error-runtime` en lugar de hacer coincidir manualmente las cadenas de expiración de aprobación.

Consulte [Ganchos de complementos](/es/plugins/hooks) para ver ejemplos y la referencia de ganchos.

## Registro de herramientas de agente

Las herramientas son funciones tipificadas que el LLM puede llamar. Pueden ser obligatorias (siempre disponibles) u opcionales (opción del usuario):

```typescript
register(api) {
  // Required tool - always available
  api.registerTool({
    name: "my_tool",
    description: "Do a thing",
    parameters: Type.Object({ input: Type.String() }),
    async execute(_id, params) {
      return { content: [{ type: "text", text: params.input }] };
    },
  });

  // Optional tool - user must add to allowlist
  api.registerTool(
    {
      name: "workflow_tool",
      description: "Run a workflow",
      parameters: Type.Object({ pipeline: Type.String() }),
      async execute(_id, params) {
        return { content: [{ type: "text", text: params.pipeline }] };
      },
    },
    { optional: true },
  );
}
```

Las fábricas de herramientas reciben un objeto de contexto proporcionado en tiempo de ejecución. Use
`ctx.activeModel` cuando una herramienta necesite registrar, mostrar o adaptarse al modelo
activo para el turno actual. El objeto puede incluir `provider`, `modelId` y
`modelRef`. Trátelo como metadatos informativos en tiempo de ejecución, no como un límite de seguridad
contra el operador local, el código del complemento instalado o un tiempo de ejecución de OpenClaw modificado.
Para herramientas locales sensibles, mantenga una opción de participación explícita del complemento u operador
y falle cerrado cuando falten los metadatos del modelo activo o no sean adecuados.

Cada herramienta registrada con `api.registerTool(...)` también debe declararse en el
manifiesto del complemento:

```json
{
  "contracts": {
    "tools": ["my_tool", "workflow_tool"]
  },
  "toolMetadata": {
    "workflow_tool": {
      "optional": true
    }
  }
}
```

OpenClaw captura y almacena en caché el descriptor validado de la herramienta registrada,
por lo que los complementos no duplican `description` ni los datos del esquema en el manifiesto. El
contrato del manifiesto solo declara la propiedad y el descubrimiento; la ejecución aún llama
a la implementación de la herramienta registrada en vivo.
Establezca `toolMetadata.<tool>.optional: true` para las herramientas registradas con
`api.registerTool(..., { optional: true })` para que OpenClaw pueda evitar cargar ese
entorno de ejecución del complemento hasta que la herramienta se agregue explícitamente a la lista de permitidos.

Los usuarios habilitan herramientas opcionales en la configuración:

```json5
{
  tools: { allow: ["workflow_tool"] },
}
```

- Los nombres de las herramientas no deben entrar en conflicto con las herramientas principales (los conflictos se omiten)
- Las herramientas con objetos de registro mal formados, incluyendo `parameters` faltante, se omiten y se reportan en los diagnósticos del complemento en lugar de interrumpir las ejecuciones del agente
- Use `optional: true` para herramientas con efectos secundarios o requisitos binarios adicionales
- Los usuarios pueden habilitar todas las herramientas de un complemento agregando el id del complemento a `tools.allow`

## Registrar comandos de CLI

Los complementos pueden agregar grupos de comandos raíz `openclaw` con `api.registerCli`. Proporcione
`descriptors` para cada raíz de comando de nivel superior para que OpenClaw pueda mostrar y enrutar
el comando sin cargar ansiosamente todos los entornos de ejecución de complementos.

```typescript
register(api) {
  api.registerCli(
    ({ program }) => {
      const demo = program
        .command("demo-plugin")
        .description("Run demo plugin commands");

      demo
        .command("ping")
        .description("Check that the plugin CLI is executable")
        .action(() => {
          console.log("demo-plugin:pong");
        });
    },
    {
      descriptors: [
        {
          name: "demo-plugin",
          description: "Run demo plugin commands",
          hasSubcommands: true,
        },
      ],
    },
  );
}
```

Después de la instalación, verifique el registro en tiempo de ejecución y ejecute el comando:

```bash
openclaw plugins inspect demo-plugin --runtime --json
openclaw demo-plugin ping
```

## Convenciones de importación

Siempre importe desde rutas `openclaw/plugin-sdk/<subpath>` específicas:

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";

// Wrong: monolithic root (deprecated, will be removed)
import { ... } from "openclaw/plugin-sdk";
```

Para la referencia completa de subrutas, consulte [Información general del SDK](/es/plugins/sdk-overview).

Dentro de su complemento, use archivos barril locales (`api.ts`, `runtime-api.ts`) para
las importaciones internas; nunca importe su propio complemento a través de su ruta del SDK.

Para los complementos de proveedores, mantenga los asistentes específicos del proveedor en esos archivos barril
en la raíz del paquete, a menos que la unión sea verdaderamente genérica. Ejemplos empaquetados actuales:

- Anthropic: contenedores de flujo de Claude y asistentes `service_tier` / beta
- OpenAI: constructores de proveedores, asistentes de modelo predeterminado, proveedores en tiempo real
- OpenRouter: constructor de proveedores más asistentes de incorporación/configuración

Si un asistente solo es útil dentro de un paquete de proveedor empaquetado, manténgalo en esa
unión raíz del paquete en lugar de promoverlo a `openclaw/plugin-sdk/*`.

Algunas uniones de asistentes `openclaw/plugin-sdk/<bundled-id>` generadas todavía existen para
el mantenimiento de complementos empaquetados cuando tienen uso de propietario rastreado. Trate esas como
superficies reservadas, no como el patrón predeterminado para nuevos complementos de terceros.

## Lista de verificación previa al envío

<Check>**package.** tiene los metadatos `openclaw` correctos</Check>
<Check>El manifiesto **openclaw.plugin.** está presente y es válido</Check>
<Check>El punto de entrada usa `defineChannelPluginEntry` o `definePluginEntry`</Check>
<Check>Todas las importaciones usan rutas `plugin-sdk/<subpath>` específicas</Check>
<Check>Las importaciones internas usan módulos locales, no autoimportaciones del SDK</Check>
<Check>Las pruebas pasan (`pnpm test -- <bundled-plugin-root>/my-plugin/`)</Check>
<Check>`pnpm check` pasa (complementos en el repositorio)</Check>

## Pruebas de versión beta

1. Esté atento a las etiquetas de lanzamiento de GitHub en [openclaw/openclaw](https://github.com/openclaw/openclaw/releases) y suscríbase a través de `Watch` > `Releases`. Las etiquetas beta se parecen a `v2026.3.N-beta.1`. También puede activar las notificaciones para la cuenta oficial de OpenClaw X [@openclaw](https://x.com/openclaw) para recibir anuncios de lanzamiento.
2. Prueba tu complemento contra la etiqueta beta tan pronto como aparezca. La ventana anterior a la versión estable suele ser de solo unas pocas horas.
3. Publica en el hilo de tu complemento en el canal de Discord `plugin-forum` después de probar con `all good` o con lo que se rompió. Si aún no tienes un hilo, crea uno.
4. Si algo se rompe, abre o actualiza un issue titulado `Beta blocker: <plugin-name> - <summary>` y aplica la etiqueta `beta-blocker`. Pon el enlace del issue en tu hilo.
5. Abre un PR a `main` titulado `fix(<plugin-id>): beta blocker - <summary>` y vincula el issue tanto en el PR como en tu hilo de Discord. Los colaboradores no pueden etiquetar PRs, por lo que el título es la señal del lado del PR para los mantenedores y la automatización. Los bloqueadores con un PR se fusionan; los bloqueadores sin uno pueden lanzarse de todos modos. Los mantenedores observan estos hilos durante las pruebas beta.
6. El silencio significa verde (aprobar). Si pierdes la ventana, tu solución probablemente se incluirá en el siguiente ciclo.

## Próximos pasos

<CardGroup cols={2}>
  <Card title="Complementos de Canal" icon="messages-square" href="/es/plugins/sdk-channel-plugins">
    Compila un complemento de canal de mensajería
  </Card>
  <Card title="Complementos de Proveedor" icon="cpu" href="/es/plugins/sdk-provider-plugins">
    Compila un complemento de proveedor de modelos
  </Card>
  <Card title="Complementos de Backend CLI" icon="terminal" href="/es/plugins/cli-backend-plugins">
    Registra un backend de IA CLI local
  </Card>
  <Card title="Resumen del SDK" icon="book-open" href="/es/plugins/sdk-overview">
    Mapa de importación y referencia de la API de registro
  </Card>
  <Card title="Auxiliares de Tiempo de Ejecución" icon="settings" href="/es/plugins/sdk-runtime">
    TTS, búsqueda, subagente vía api.runtime
  </Card>
  <Card title="Pruebas" icon="test-tubes" href="/es/plugins/sdk-testing">
    Utilidades y patrones de pruebas
  </Card>
  <Card title="Manifiesto del plugin" icon="file-" href="/es/plugins/manifest">
    Referencia completa del esquema del manifiesto
  </Card>
</CardGroup>

## Relacionado

- [Arquitectura de plugins](/es/plugins/architecture) - inmersión profunda en la arquitectura interna
- [Descripción general del SDK](/es/plugins/sdk-overview) - referencia del SDK de plugins
- [Manifiesto](/es/plugins/manifest) - formato del manifiesto del plugin
- [Plugins de canal](/es/plugins/sdk-channel-plugins) - crear plugins de canal
- [Plugins de proveedor](/es/plugins/sdk-provider-plugins) - crear plugins de proveedor
