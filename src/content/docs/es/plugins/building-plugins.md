---
summary: "Crea tu primer plugin de OpenClaw en minutos"
title: "Construcción de plugins"
sidebarTitle: "Para empezar"
read_when:
  - You want to create a new OpenClaw plugin
  - You need a quick-start for plugin development
  - You are adding a new channel, provider, tool, or other capability to OpenClaw
---

Los plugins amplían OpenClaw con nuevas capacidades: canales, proveedores de modelos,
voz, transcripción en tiempo real, voz en tiempo real, comprensión de medios, generación
de imágenes, generación de video, obtención web, búsqueda web, herramientas de agente, o cualquier
combinación.

No es necesario agregar tu plugin al repositorio de OpenClaw. Publícalo en
[ClawHub](/es/tools/clawhub) o npm y los usuarios lo instalan con
`openclaw plugins install <package-name>`. OpenClaw intenta con ClawHub primero y
recurre a npm automáticamente.

## Requisitos previos

- Node >= 22 y un administrador de paquetes (npm o pnpm)
- Familiaridad con TypeScript (ESM)
- Para plugins en el repositorio: repositorio clonado y `pnpm install` completado

## ¿Qué tipo de plugin?

<CardGroup cols={3}>
  <Card title="Plugin de canal" icon="messages-square" href="/es/plugins/sdk-channel-plugins">
    Conecta OpenClaw a una plataforma de mensajería (Discord, IRC, etc.)
  </Card>
  <Card title="Plugin de proveedor" icon="cpu" href="/es/plugins/sdk-provider-plugins">
    Agrega un proveedor de modelos (LLM, proxy o punto de conexión personalizado)
  </Card>
  <Card title="Plugin de herramienta / hook" icon="wrench" href="/es/plugins/hooks">
    Registra herramientas de agente, ganchos de eventos o servicios — continúa a continuación
  </Card>
</CardGroup>

Para un plugin de canal que no esté garantizado que esté instalado cuando se ejecute la integración/configuración,
usa `createOptionalChannelSetupSurface(...)` de
`openclaw/plugin-sdk/channel-setup`. Produce un par adaptador de configuración + asistente
que anuncia el requisito de instalación y falla cerrado en escrituras de configuración reales
hasta que el plugin esté instalado.

## Inicio rápido: complemento de herramienta

Este tutorial crea un complemento mínimo que registra una herramienta de agente. Los
complementos de canal y proveedor tienen guías dedicadas vinculadas anteriormente.

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
      "configSchema": {
        "type": "object",
        "additionalProperties": false
      }
    }
    ```
    </CodeGroup>

    Cada complemento necesita un manifiesto, incluso si no tiene configuración. Consulte
    [Manifest](/es/plugins/manifest) para ver el esquema completo. Los fragmentos canónicos de
    publicación de ClawHub se encuentran en `docs/snippets/plugin-publish/`.

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

    `definePluginEntry` es para complementos que no son de canal. Para los canales, use
    `defineChannelPluginEntry` — consulte [Channel Plugins](/es/plugins/sdk-channel-plugins).
    Para ver todas las opciones de punto de entrada, consulte [Entry Points](/es/plugins/sdk-entrypoints).

  </Step>

  <Step title="Probar y publicar">

    **Complementos externos:** valide y publique con ClawHub, luego instale:

    ```bash
    clawhub package publish your-org/your-plugin --dry-run
    clawhub package publish your-org/your-plugin
    openclaw plugins install clawhub:@myorg/openclaw-my-plugin
    ```

    OpenClaw también verifica ClawHub antes que npm para especificaciones de paquetes simples como
    `@myorg/openclaw-my-plugin`.

    **Complementos en el repositorio:** colóquelos debajo del árbol del espacio de trabajo del complemento agrupado: se descubren automáticamente.

    ```bash
    pnpm test -- <bundled-plugin-root>/my-plugin/
    ```

  </Step>
</Steps>

## Capacidades de los complementos

Un solo complemento puede registrar cualquier cantidad de capacidades a través del objeto `api`:

| Capacidad                                | Método de registro                               | Guía detallada                                                                              |
| ---------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Inferencia de texto (LLM)                | `api.registerProvider(...)`                      | [Complementos de proveedor](/es/plugins/sdk-provider-plugins)                               |
| Backend de inferencia de CLI             | `api.registerCliBackend(...)`                    | [Backends de CLI](/es/gateway/cli-backends)                                                 |
| Canal / mensajería                       | `api.registerChannel(...)`                       | [Complementos de canal](/es/plugins/sdk-channel-plugins)                                    |
| Voz (TTS/STT)                            | `api.registerSpeechProvider(...)`                | [Complementos de proveedor](/es/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Transcripción en tiempo real             | `api.registerRealtimeTranscriptionProvider(...)` | [Complementos de proveedor](/es/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Voz en tiempo real                       | `api.registerRealtimeVoiceProvider(...)`         | [Complementos de proveedor](/es/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Comprensión de medios                    | `api.registerMediaUnderstandingProvider(...)`    | [Complementos de proveedor](/es/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Generación de imágenes                   | `api.registerImageGenerationProvider(...)`       | [Complementos de proveedor](/es/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Generación de música                     | `api.registerMusicGenerationProvider(...)`       | [Complementos de proveedor](/es/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Generación de video                      | `api.registerVideoGenerationProvider(...)`       | [Complementos de proveedor](/es/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Recuperación web                         | `api.registerWebFetchProvider(...)`              | [Complementos de proveedor](/es/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Búsqueda web                             | `api.registerWebSearchProvider(...)`             | [Complementos de proveedor](/es/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Middleware de resultados de herramientas | `api.registerAgentToolResultMiddleware(...)`     | [Descripción general del SDK](/es/plugins/sdk-overview#registration-api)                    |
| Herramientas de agente                   | `api.registerTool(...)`                          | A continuación                                                                              |
| Comandos personalizados                  | `api.registerCommand(...)`                       | [Puntos de entrada](/es/plugins/sdk-entrypoints)                                            |
| Ganchos de complementos                  | `api.on(...)`                                    | [Ganchos de complementos](/es/plugins/hooks)                                                |
| Ganchos de eventos internos              | `api.registerHook(...)`                          | [Puntos de entrada](/es/plugins/sdk-entrypoints)                                            |
| Rutas HTTP                               | `api.registerHttpRoute(...)`                     | [Aspectos internos](/es/plugins/architecture-internals#gateway-http-routes)                 |
| Subcomandos de CLI                       | `api.registerCli(...)`                           | [Puntos de entrada](/es/plugins/sdk-entrypoints)                                            |

Para ver la API de registro completa, consulte [Descripción general del SDK](/es/plugins/sdk-overview#registration-api).

Los complementos empaquetados pueden usar `api.registerAgentToolResultMiddleware(...)` cuando necesitan reescritura asincrónica de resultados de herramientas antes de que el modelo vea la salida. Declare los tiempos de ejecución objetivo en `contracts.agentToolResultMiddleware`, por ejemplo `["pi", "codex"]`. Esta es una costura de complemento empaquetado de confianza; los complementos externos deben preferir los ganchos de complementos regulares de OpenClaw a menos que OpenClaw desarrolle una política de confianza explícita para esta capacidad.

Si su complemento registra métodos RPC de gateway personalizados, manténgalos en un prefijo específico del complemento. Los espacios de nombres de administración principal (`config.*`, `exec.approvals.*`, `wizard.*`, `update.*`) permanecen reservados y siempre se resuelven en `operator.admin`, incluso si un complemento solicita un alcance más estrecho.

Semánticas de protección de ganchos a tener en cuenta:

- `before_tool_call`: `{ block: true }` es terminal y detiene los controladores de menor prioridad.
- `before_tool_call`: `{ block: false }` se trata como sin decisión.
- `before_tool_call`: `{ requireApproval: true }` pausa la ejecución del agente y solicita al usuario su aprobación a través de la superposición de aprobación de ejecución, botones de Telegram, interacciones de Discord o el comando `/approve` en cualquier canal.
- `before_install`: `{ block: true }` es terminal y detiene los controladores de menor prioridad.
- `before_install`: `{ block: false }` se trata como ninguna decisión.
- `message_sending`: `{ cancel: true }` es terminal y detiene los controladores de menor prioridad.
- `message_sending`: `{ cancel: false }` se trata como ninguna decisión.
- `message_received`: prefiera el campo tipado `threadId` cuando necesite enrutamiento entrante de hilos/temas. Mantenga `metadata` para extras específicos del canal.
- `message_sending`: prefiera los campos de enrutamiento tipados `replyToId` / `threadId` en lugar de claves de metadatos específicas del canal.

El comando `/approve` maneja tanto las aprobaciones de ejecución como las de complementos con una reserva limitada: cuando no se encuentra un id de aprobación de ejecución, OpenClaw reintenta el mismo id a través de las aprobaciones de complementos. El reenvío de aprobaciones de complementos se puede configurar de forma independiente a través de `approvals.plugin` en la configuración.

Si la infraestructura personalizada de aprobación necesita detectar ese mismo caso de reserva limitada,
prefiera `isApprovalNotFoundError` de `openclaw/plugin-sdk/error-runtime`
en lugar de hacer coincidir manualmente las cadenas de vencimiento de aprobación.

Consulte [Plugin hooks](/es/plugins/hooks) para ver ejemplos y la referencia de ganchos.

## Registrar herramientas de agente

Las herramientas son funciones tipadas que el LLM puede llamar. Pueden ser obligatorias (siempre
disponibles) u opcionales (elección del usuario):

```typescript
register(api) {
  // Required tool — always available
  api.registerTool({
    name: "my_tool",
    description: "Do a thing",
    parameters: Type.Object({ input: Type.String() }),
    async execute(_id, params) {
      return { content: [{ type: "text", text: params.input }] };
    },
  });

  // Optional tool — user must add to allowlist
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

Los usuarios habilitan herramientas opcionales en la configuración:

```json5
{
  tools: { allow: ["workflow_tool"] },
}
```

- Los nombres de las herramientas no deben entrar en conflicto con las herramientas principales (los conflictos se omiten)
- Las herramientas con objetos de registro malformados, incluyendo la falta de `parameters`, se omiten y se reportan en el diagnóstico del complemento en lugar de interrumpir las ejecuciones del agente
- Use `optional: true` para herramientas con efectos secundarios o requisitos binarios adicionales
- Los usuarios pueden habilitar todas las herramientas de un complemento agregando el id del complemento a `tools.allow`

## Convenciones de importación

Siempre importe desde rutas `openclaw/plugin-sdk/<subpath>` enfocadas:

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";

// Wrong: monolithic root (deprecated, will be removed)
import { ... } from "openclaw/plugin-sdk";
```

Para ver la referencia completa de las subrutas, consulte [Descripción general del SDK](/es/plugins/sdk-overview).

Dentro de su complemento, use archivos barril locales (`api.ts`, `runtime-api.ts`) para
las importaciones internas: nunca importe su propio complemento a través de su ruta del SDK.

Para los complementos de proveedores, mantenga los asistentes específicos del proveedor en esos barriles
raíz del paquete a menos que la costura sea verdaderamente genérica. Ejemplos empaquetados actuales:

- Anthropic: envoltorios de flujo de Claude y asistentes `service_tier` / beta
- OpenAI: constructores de proveedores, asistentes de modelo predeterminado, proveedores en tiempo real
- OpenRouter: constructor de proveedores más asistentes de incorporación/configuración

Si un asistente solo es útil dentro de un paquete de proveedor empaquetado, manténgalo en esa
costura raíz del paquete en lugar de promoverlo a `openclaw/plugin-sdk/*`.

Algunas costuras de asistente `openclaw/plugin-sdk/<bundled-id>` generadas todavía existen para
el mantenimiento y la compatibilidad de complementos empaquetados, por ejemplo
`plugin-sdk/feishu-setup` o `plugin-sdk/zalo-setup`. Trátelas como superficies
reservadas, no como el patrón predeterminado para nuevos complementos de terceros.

## Lista de verificación previa al envío

<Check>**package.** tiene metadatos `openclaw` correctos</Check>
<Check>El manifiesto **openclaw.plugin.** está presente y es válido</Check>
<Check>El punto de entrada usa `defineChannelPluginEntry` o `definePluginEntry`</Check>
<Check>Todas las importaciones usan rutas `plugin-sdk/<subpath>` enfocadas</Check>
<Check>Las importaciones internas usan módulos locales, no autoimportaciones del SDK</Check>
<Check>Las pruebas pasan (`pnpm test -- <bundled-plugin-root>/my-plugin/`)</Check>
<Check>`pnpm check` pasa (complementos en el repositorio)</Check>

## Pruebas de versión beta

1. Esté atento a las etiquetas de lanzamiento de GitHub en [openclaw/openclaw](https://github.com/openclaw/openclaw/releases) y suscríbase mediante `Watch` > `Releases`. Las etiquetas beta se parecen a `v2026.3.N-beta.1`. También puede activar las notificaciones para la cuenta oficial de X de OpenClaw [@openclaw](https://x.com/openclaw) para recibir anuncios de lanzamiento.
2. Pruebe su complemento con la etiqueta beta tan pronto como aparezca. La ventana antes de la versión estable suele ser de solo unas pocas horas.
3. Publique en el hilo de su complemento en el canal de Discord `plugin-forum` después de probar con `all good` o con lo que se rompió. Si aún no tiene un hilo, cree uno.
4. Si algo se rompe, abra o actualice un problema titulado `Beta blocker: <plugin-name> - <summary>` y aplique la etiqueta `beta-blocker`. Ponga el enlace del problema en su hilo.
5. Abra un PR a `main` titulado `fix(<plugin-id>): beta blocker - <summary>` y vincule el problema tanto en el PR como en su hilo de Discord. Los colaboradores no pueden etiquetar PR, por lo que el título es la señal del lado del PR para los mantenedores y la automatización. Los bloqueadores con un PR se fusionan; los bloqueadores sin uno podrían enviarse de todos modos. Los mantenedores vigilan estos hilos durante las pruebas beta.
6. Silencio significa luz verde. Si pierde la ventana, su solución probablemente llegará en el siguiente ciclo.

## Próximos pasos

<CardGroup cols={2}>
  <Card title="Complementos de canal" icon="messages-square" href="/es/plugins/sdk-channel-plugins">
    Cree un complemento de canal de mensajería
  </Card>
  <Card title="Complementos de proveedor" icon="cpu" href="/es/plugins/sdk-provider-plugins">
    Cree un complemento de proveedor de modelos
  </Card>
  <Card title="Descripción general del SDK" icon="book-open" href="/es/plugins/sdk-overview">
    Referencia de API de registro y mapa de importación
  </Card>
  <Card title="Asistentes de tiempo de ejecución" icon="settings" href="/es/plugins/sdk-runtime">
    TTS, búsqueda, subagente a través de api.runtime
  </Card>
  <Card title="Pruebas" icon="test-tubes" href="/es/plugins/sdk-testing">
    Utilidades y patrones de prueba
  </Card>
  <Card title="Manifiesto del plugin" icon="file-" href="/es/plugins/manifest">
    Referencia completa del esquema del manifiesto
  </Card>
</CardGroup>

## Relacionado

- [Arquitectura de plugins](/es/plugins/architecture) — inmersión profunda en la arquitectura interna
- [Resumen del SDK](/es/plugins/sdk-overview) — referencia del SDK de plugins
- [Manifiesto](/es/plugins/manifest) — formato del manifiesto del plugin
- [Plugins de canal](/es/plugins/sdk-channel-plugins) — creación de plugins de canal
- [Plugins de proveedor](/es/plugins/sdk-provider-plugins) — creación de plugins de proveedor
