---
summary: "Crea tu primer complemento de OpenClaw en minutos"
title: "Construcción de complementos"
sidebarTitle: "Introducción"
read_when:
  - You want to create a new OpenClaw plugin
  - You need a quick-start for plugin development
  - You are adding a new channel, provider, tool, or other capability to OpenClaw
---

Los plugins amplían OpenClaw con nuevas capacidades: canales, proveedores de modelos,
voz, transcripción en tiempo real, voz en tiempo real, comprensión de medios, generación
de imágenes, generación de video, obtención web, búsqueda web, herramientas de agente, o cualquier
combinación.

No es necesario que añadas tu complemento al repositorio de OpenClaw. Publícalo en
[ClawHub](/es/clawhub) y los usuarios lo instalan con
`openclaw plugins install clawhub:<package-name>`. Las especificaciones de paquetes básicos aún
se instalan desde npm durante la transición de lanzamiento.

## Requisitos previos

- Node >= 22 y un administrador de paquetes (npm o pnpm)
- Familiaridad con TypeScript (ESM)
- Para complementos en el repositorio: repositorio clonado y `pnpm install` hecho. El desarrollo
  del complemento con checkout del código fuente es solo para pnpm porque OpenClaw carga complementos
  agrupados desde los paquetes del espacio de trabajo `extensions/*`.

## ¿Qué tipo de plugin?

<CardGroup cols={3}>
  <Card title="Complemento de canal" icon="messages-square" href="/es/plugins/sdk-channel-plugins">
    Conecta OpenClaw a una plataforma de mensajería (Discord, IRC, etc.)
  </Card>
  <Card title="Complemento de proveedor" icon="cpu" href="/es/plugins/sdk-provider-plugins">
    Añade un proveedor de modelos (LLM, proxy o punto de conexión personalizado)
  </Card>
  <Card title="Complemento de backend CLI" icon="terminal" href="/es/plugins/cli-backend-plugins">
    Mapea una CLI de IA local en el ejecutor de respaldo de texto de OpenClaw
  </Card>
  <Card title="Complemento de herramienta" icon="wrench" href="/es/plugins/tool-plugins">
    Añade herramientas de agente tipadas simples con metadatos de manifiesto generados
  </Card>
  <Card title="Complemento de gancho" icon="plug" href="/es/plugins/hooks">
    Registra ganchos de eventos, servicios o integraciones de tiempo de ejecución avanzadas
  </Card>
</CardGroup>

Para un complemento de canal que no está garantizado que esté instalado cuando se ejecuta la incorporación/configuración, use `createOptionalChannelSetupSurface(...)` de `openclaw/plugin-sdk/channel-setup`. Produce un par de adaptador de configuración + asistente que anuncia el requisito de instalación y falla cerrado en escrituras de configuración reales hasta que el complemento esté instalado.

## Inicio rápido: complemento de herramienta

Este tutorial crea un complemento mínimo que registra una herramienta de agente. Los complementos de canal y proveedor tienen guías dedicadas vinculadas anteriormente.
Para el flujo de trabajo detallado solo de herramientas, consulte [Tool Plugins](/es/plugins/tool-plugins).

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

    Cada complemento necesita un manifiesto, incluso sin configuración. Las herramientas registradas en tiempo de ejecución deben listarse en `contracts.tools` para que OpenClaw pueda descubrir el complemento propietario sin cargar todos los tiempos de ejecución de complementos. Para complementos simples solo de herramientas, prefiera `defineToolPlugin` más `openclaw plugins build` para que los nombres de las herramientas y el esquema de configuración vacío se generen a partir de una única fuente de verdad. Los complementos también deben declarar `activation.onStartup` intencionalmente. Este ejemplo lo establece en `true`. Consulte [Manifest](/es/plugins/manifest) para ver el esquema completo. Los fragmentos canónicos de publicación en ClawHub viven en `docs/snippets/plugin-publish/`.

  </Step>

  <Step title="Escribir el punto de entrada">

    ```typescript
    // index.ts
    import { Type } from "typebox";
    import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";

    export default defineToolPlugin({
      id: "my-plugin",
      name: "My Plugin",
      description: "Adds a custom tool to OpenClaw",
      tools: (tool) => [
        tool({
          name: "my_tool",
          description: "Do a thing",
          parameters: Type.Object({ input: Type.String() }),
          async execute({ input }) {
            return { message: `Got: ${input}` };
          },
        }),
      ],
    });
    ```

    `defineToolPlugin` es para complementos simples de herramientas de agente. Para proveedores, hooks, servicios y otros complementos avanzados que no sean de canal, use `definePluginEntry`.
    Para canales, use `defineChannelPluginEntry` - consulte
    [Channel Plugins](/es/plugins/sdk-channel-plugins). Para el flujo de trabajo completo de
    `defineToolPlugin`, consulte [Tool Plugins](/es/plugins/tool-plugins). Para
    ver todas las opciones de punto de entrada, consulte [Entry Points](/es/plugins/sdk-entrypoints).

  </Step>

  <Step title="Generar y validar metadatos">

    ```bash
    npm run build
    openclaw plugins build --entry ./dist/index.js
    openclaw plugins validate --entry ./dist/index.js
    ```

    `openclaw plugins build` escribe `openclaw.plugin.json` y mantiene
    `package.json` `openclaw.extensions` apuntando al módulo de entrada. Para
    paquetes publicados, apúntelo a JavaScript construido como `./dist/index.js`.
    El manifiesto generado es el contrato de carga en frío que OpenClaw lee antes
    de la importación en tiempo de ejecución. `openclaw plugins validate` importa la entrada solo durante
    la validación del autor y comprueba que el manifiesto y los metadatos del paquete coincidan
    con los metadatos estáticos `defineToolPlugin`.

  </Step>

  <Step title="Probar y publicar">

    **Plugins externos:** valide y publique con ClawHub, luego instale:

    ```bash
    clawhub package publish your-org/your-plugin --dry-run
    clawhub package publish your-org/your-plugin
    openclaw plugins install clawhub:@myorg/openclaw-my-plugin
    ```

    Las especificaciones de paquetes simples como `@myorg/openclaw-my-plugin` se instalan desde npm durante
    la transición de lanzamiento. Use `clawhub:` cuando desee resolución ClawHub.

    **Plugins en el repositorio:** colóquelos bajo el árbol del espacio de trabajo del plugin agrupado - se descubren automáticamente.

    ```bash
    pnpm test -- <bundled-plugin-root>/my-plugin/
    ```

  </Step>
</Steps>

## Capacidades del plugin

Un solo plugin puede registrar cualquier número de capacidades a través del objeto `api`:

| Capacidad                                | Método de registro                               | Guía detallada                                                                                |
| ---------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Inferencia de texto (LLM)                | `api.registerProvider(...)`                      | [Plugins de proveedor](/es/plugins/sdk-provider-plugins)                                      |
| Backend de inferencia CLI                | `api.registerCliBackend(...)`                    | [Plugins de backend CLI](/es/plugins/cli-backend-plugins)                                     |
| Canal / mensajería                       | `api.registerChannel(...)`                       | [Plugins de canal](/es/plugins/sdk-channel-plugins)                                           |
| Habla (TTS/STT)                          | `api.registerSpeechProvider(...)`                | [Plugins de proveedor](/es/plugins/sdk-provider-plugins#step-5-add-extra-capabilities)        |
| Transcripción en tiempo real             | `api.registerRealtimeTranscriptionProvider(...)` | [Plugins de proveedor](/es/plugins/sdk-provider-plugins#step-5-add-extra-capabilities)        |
| Voz en tiempo real                       | `api.registerRealtimeVoiceProvider(...)`         | [Plugins de proveedor](/es/plugins/sdk-provider-plugins#step-5-add-extra-capabilities)        |
| Comprensión de medios                    | `api.registerMediaUnderstandingProvider(...)`    | [Plugins de proveedor](/es/plugins/sdk-provider-plugins#step-5-add-extra-capabilities)        |
| Generación de imágenes                   | `api.registerImageGenerationProvider(...)`       | [Complementos de proveedores](/es/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Generación de música                     | `api.registerMusicGenerationProvider(...)`       | [Complementos de proveedores](/es/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Generación de video                      | `api.registerVideoGenerationProvider(...)`       | [Complementos de proveedores](/es/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Recuperación web                         | `api.registerWebFetchProvider(...)`              | [Complementos de proveedores](/es/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Búsqueda web                             | `api.registerWebSearchProvider(...)`             | [Complementos de proveedores](/es/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Middleware de resultados de herramientas | `api.registerAgentToolResultMiddleware(...)`     | [Descripción general del SDK](/es/plugins/sdk-overview#registration-api)                      |
| Herramientas de agente                   | `api.registerTool(...)`                          | A continuación                                                                                |
| Comandos personalizados                  | `api.registerCommand(...)`                       | [Puntos de entrada](/es/plugins/sdk-entrypoints)                                              |
| Ganchos de complementos                  | `api.on(...)`                                    | [Ganchos de complementos](/es/plugins/hooks)                                                  |
| Ganchos de eventos internos              | `api.registerHook(...)`                          | [Puntos de entrada](/es/plugins/sdk-entrypoints)                                              |
| Rutas HTTP                               | `api.registerHttpRoute(...)`                     | [Elementos internos](/es/plugins/architecture-internals#gateway-http-routes)                  |
| Subcomandos de CLI                       | `api.registerCli(...)`                           | [Puntos de entrada](/es/plugins/sdk-entrypoints)                                              |

Para ver la API de registro completa, consulte [Descripción general del SDK](/es/plugins/sdk-overview#registration-api).

Los complementos agrupados pueden usar `api.registerAgentToolResultMiddleware(...)` cuando
necesitan reescritura asincrónica de resultados de herramientas antes de que el modelo vea la salida. Declare los
runtimes de destino en `contracts.agentToolResultMiddleware`, por ejemplo
`["pi", "codex"]`. Esta es una costura de complemento agrupado de confianza; los
complementos externos deben preferir los ganchos de complementos regulares de OpenClaw a menos que OpenClaw desarrolle una
política de confianza explícita para esta capacidad.

Si su complemento registra métodos RPC de puerta de enlace personalizados, manténgalos en un
prefijo específico del complemento. Los espacios de nombres de administración principales (`config.*`,
`exec.approvals.*`, `wizard.*`, `update.*`) permanecen reservados y siempre se resuelven en
`operator.admin`, incluso si un complemento solicita un alcance más estrecho.

`openclaw/plugin-sdk/gateway-method-runtime` es un puente de plano de control reservado
para las rutas HTTP de complementos que declaran
`contracts.gatewayMethodDispatch: ["authenticated-request"]`. Es una
protección de uso intencional para complementos nativos revisados, no un límite de espacio aislado (sandbox).

Semánticas de protección de enlaces (hook guard) a tener en cuenta:

- `before_tool_call`: `{ block: true }` es terminal y detiene los controladores de menor prioridad.
- `before_tool_call`: `{ block: false }` se trata como sin decisión.
- `before_tool_call`: `{ requireApproval: true }` pausa la ejecución del agente y solicita al usuario aprobación a través de la superposición de aprobación de ejecución, botones de Telegram, interacciones de Discord, o el comando `/approve` en cualquier canal.
- `before_install`: `{ block: true }` es terminal y detiene los controladores de menor prioridad.
- `before_install`: `{ block: false }` se trata como sin decisión.
- `message_sending`: `{ cancel: true }` es terminal y detiene los controladores de menor prioridad.
- `message_sending`: `{ cancel: false }` se trata como sin decisión.
- `message_received`: prefiera el campo tipado `threadId` cuando necesite enrutamiento entrante de hilos/temas. Mantenga `metadata` para extras específicos del canal.
- `message_sending`: prefiera los campos de enrutamiento tipados `replyToId` / `threadId` sobre las claves de metadatos específicas del canal.

El comando `/approve` maneja tanto las aprobaciones de ejecución como las de complementos con una alternativa limitada (fallback): cuando no se encuentra un id de aprobación de ejecución, OpenClaw reintentará el mismo id a través de las aprobaciones de complementos. El reenvío de aprobaciones de complementos se puede configurar independientemente mediante `approvals.plugin` en la configuración.

Si una tubería de aprobación personalizada necesita detectar ese mismo caso de alternativa limitada,
prefiera `isApprovalNotFoundError` de `openclaw/plugin-sdk/error-runtime`
en lugar de coincidir manualmente con las cadenas de vencimiento de aprobación.

Consulte [Enlaces de complementos (Plugin hooks)](/es/plugins/hooks) para ver ejemplos y la referencia de enlaces.

## Registro de herramientas de agente

Las herramientas son funciones tipificadas que el LLM puede llamar. Pueden ser obligatorias (siempre disponibles) u opcionales (opt-in del usuario):

Para complementos simples que solo poseen un conjunto fijo de herramientas, prefiera
[`defineToolPlugin`](/es/plugins/tool-plugins). Genera metadatos de manifiesto y
mantiene `contracts.tools` alineado. Use la superficie de `api.registerTool(...)`
de nivel inferior cuando el complemento también sea propietario de canales, proveedores, ganchos, servicios,
comandos o registro de herramientas completamente dinámico.

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
`modelRef`. Trátelo como metadatos informativos en tiempo de ejecución, no como un límite
de seguridad contra el operador local, el código del complemento instalado o un tiempo de ejecución
modificado de OpenClaw. Para herramientas locales sensibles, mantenga un complemento explícito o un operador
opt-in y cierre con error cuando falten los metadatos del modelo activo o no sean adecuados.

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
por lo que los complementos no duplican `description` o datos de esquema en el manifiesto. El
contrato del manifiesto solo declara la propiedad y el descubrimiento; la ejecución aún llama
a la implementación de la herramienta registrada en vivo.
Establezca `toolMetadata.<tool>.optional: true` para las herramientas registradas con
`api.registerTool(..., { optional: true })` para que OpenClaw pueda evitar cargar ese
tiempo de ejecución del complemento hasta que la herramienta se permita explícitamente.

Los usuarios habilitan herramientas opcionales en la configuración:

```json5
{
  tools: { allow: ["workflow_tool"] },
}
```

- Los nombres de las herramientas no deben entrar en conflicto con las herramientas principales (los conflictos se omiten)
- Las herramientas con objetos de registro mal formados, incluyendo `parameters` faltante, se omiten y se informan en los diagnósticos del complemento en lugar de interrumpir las ejecuciones del agente
- Use `optional: true` para herramientas con efectos secundarios o requisitos binarios adicionales
- Los usuarios pueden habilitar todas las herramientas de un complemento agregando el id del complemento a `tools.allow`

## Registrar comandos CLI

Los complementos pueden agregar grupos de comandos raíz `openclaw` con `api.registerCli`. Proporcione
`descriptors` para cada comando raíz de nivel superior para que OpenClaw pueda mostrar y enrutar
el comando sin cargar ansiosamente el tiempo de ejecución de cada complemento.

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

Siempre importe desde rutas `openclaw/plugin-sdk/<subpath>` enfocadas:

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";

// Wrong: monolithic root (deprecated, will be removed)
import { ... } from "openclaw/plugin-sdk";
```

Para la referencia completa de subrutas, consulte [Descripción general del SDK](/es/plugins/sdk-overview).

Dentro de su complemento, use archivos barril locales (`api.ts`, `runtime-api.ts`) para
importaciones internas; nunca importe su propio complemento a través de su ruta del SDK.

Para los complementos de proveedores, mantenga los auxiliares específicos del proveedor en esos archivos barril
en la raíz del paquete, a menos que la unión sea verdaderamente genérica. Ejemplos empaquetados actuales:

- Anthropic: envoltorios de flujo de Claude y auxiliares beta `service_tier`
- OpenAI: constructores de proveedores, auxiliares de modelo predeterminado, proveedores en tiempo real
- OpenRouter: constructor de proveedores más auxiliares de incorporación/configuración

Si un auxiliar solo es útil dentro de un paquete de proveedor empaquetado, manténgalo en esa
unión raíz del paquete en lugar de promoverlo a `openclaw/plugin-sdk/*`.

Algunas uniones auxiliares `openclaw/plugin-sdk/<bundled-id>` generadas todavía existen para
el mantenimiento de complementos empaquetados cuando tienen uso de propietario rastreado. Trate esas como
superficies reservadas, no como el patrón predeterminado para nuevos complementos de terceros.

## Lista de verificación previa al envío

<Check>**package.** tiene metadatos `openclaw` correctos</Check>
<Check>El manifiesto **openclaw.plugin.** está presente y es válido</Check>
<Check>El punto de entrada usa `defineToolPlugin`, `defineChannelPluginEntry` o `definePluginEntry`</Check>
<Check>Todas las importaciones usan rutas `plugin-sdk/<subpath>` enfocadas</Check>
<Check>Las importaciones internas usan módulos locales, no autoimportaciones del SDK</Check>
<Check>Las pruebas pasan (`pnpm test -- <bundled-plugin-root>/my-plugin/`)</Check>
<Check>`pnpm check` pasa (complementos en el repositorio)</Check>

## Pruebas de versión beta

1. Esté atento a las etiquetas de lanzamiento de GitHub en [openclaw/openclaw](https://github.com/openclaw/openclaw/releases) y suscríbase a través de `Watch` > `Releases`. Las etiquetas beta tienen el aspecto `v2026.3.N-beta.1`. También puede activar las notificaciones para la cuenta oficial de OpenClaw X [@openclaw](https://x.com/openclaw) para recibir anuncios de lanzamiento.
2. Pruebe su complemento con la etiqueta beta tan pronto como aparezca. La ventana anterior a la versión estable suele ser de solo unas pocas horas.
3. Publique en el hilo de su complemento en el canal de Discord `plugin-forum` después de probar con `all good` o con lo que haya fallado. Si aún no tiene un hilo, cree uno.
4. Si algo falla, abra o actualice un problema titulado `Beta blocker: <plugin-name> - <summary>` y aplique la etiqueta `beta-blocker`. Ponga el enlace del problema en su hilo.
5. Abra un PR a `main` titulado `fix(<plugin-id>): beta blocker - <summary>` y vincule el problema tanto en el PR como en su hilo de Discord. Los colaboradores no pueden etiquetar los PR, por lo que el título es la señal del lado del PR para los mantenedores y la automatización. Los bloqueadores con un PR se fusionan; los bloqueadores sin uno podrían publicarse de todos modos. Los mantenedores observan estos hilos durante las pruebas beta.
6. El silencio significa que está en verde. Si pierde la ventana, su solución probablemente se incluirá en el siguiente ciclo.

## Próximos pasos

<CardGroup cols={2}>
  <Card title="Complementos de Canal" icon="messages-square" href="/es/plugins/sdk-channel-plugins">
    Cree un complemento de canal de mensajería
  </Card>
  <Card title="Complementos de Proveedor" icon="cpu" href="/es/plugins/sdk-provider-plugins">
    Cree un complemento de proveedor de modelos
  </Card>
  <Card title="Complementos de Backend CLI" icon="terminal" href="/es/plugins/cli-backend-plugins">
    Registre un backend de CLI de IA local
  </Card>
  <Card title="Descripción general del SDK" icon="book-open" href="/es/plugins/sdk-overview">
    Referencia de la API de registro y mapa de importación
  </Card>
  <Card title="Asistentes de ejecución" icon="settings" href="/es/plugins/sdk-runtime">
    TTS, búsqueda, subagente vía api.runtime
  </Card>
  <Card title="Pruebas" icon="test-tubes" href="/es/plugins/sdk-testing">
    Utilidades y patrones de prueba
  </Card>
  <Card title="Manifiesto del complemento" icon="file-" href="/es/plugins/manifest">
    Referencia completa del esquema del manifiesto
  </Card>
</CardGroup>

## Relacionado

- [Arquitectura de complementos](/es/plugins/architecture) - inmersión profunda en la arquitectura interna
- [Descripción general del SDK](/es/plugins/sdk-overview) - Referencia del SDK de complementos
- [Manifiesto](/es/plugins/manifest) - formato del manifiesto del complemento
- [Complementos de canal](/es/plugins/sdk-channel-plugins) - creación de complementos de canal
- [Complementos de proveedor](/es/plugins/sdk-provider-plugins) - creación de complementos de proveedor
