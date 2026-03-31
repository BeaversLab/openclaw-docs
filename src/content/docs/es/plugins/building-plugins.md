---
title: "Construcción de complementos"
sidebarTitle: "Para empezar"
summary: "Crea tu primer complemento de OpenClaw en minutos"
read_when:
  - You want to create a new OpenClaw plugin
  - You need a quick-start for plugin development
  - You are adding a new channel, provider, tool, or other capability to OpenClaw
---

# Construcción de complementos

Los complementos amplían OpenClaw con nuevas capacidades: canales, proveedores de modelos, voz,
generación de imágenes, búsqueda web, herramientas de agente, o cualquier combinación.

No es necesario que agregues tu complemento al repositorio de OpenClaw. Publica en
[ClawHub](/en/tools/clawhub) o npm y los usuarios instalan con
`openclaw plugins install <package-name>`. OpenClaw intenta con ClawHub primero y
automáticamente recurre a npm.

## Requisitos previos

- Node >= 22 y un gestor de paquetes (npm o pnpm)
- Familiaridad con TypeScript (ESM)
- Para complementos en el repositorio: repositorio clonado y `pnpm install` hecho

## ¿Qué tipo de complemento?

<CardGroup cols={3}>
  <Card title="Complemento de canal" icon="messages-square" href="/en/plugins/sdk-channel-plugins">
    Conecta OpenClaw a una plataforma de mensajería (Discord, IRC, etc.)
  </Card>
  <Card title="Complemento de proveedor" icon="cpu" href="/en/plugins/sdk-provider-plugins">
    Agrega un proveedor de modelos (LLM, proxy o endpoint personalizado)
  </Card>
  <Card title="Complemento de herramienta / hook" icon="wrench">
    Registra herramientas de agente, ganchos de eventos o servicios — continúa abajo
  </Card>
</CardGroup>

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
        "extensions": ["./index.ts"]
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

    Cada complemento necesita un manifiesto, incluso sin configuración. Consulta
    [Manifiesto](/en/plugins/manifest) para ver el esquema completo.

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

    `definePluginEntry` es para complementos que no son de canales. Para los canales, use
    `defineChannelPluginEntry` — consulte [Complementos de canal](/en/plugins/sdk-channel-plugins).
    Para obtener todas las opciones del punto de entrada, consulte [Puntos de entrada](/en/plugins/sdk-entrypoints).

  </Step>

  <Step title="Probar y publicar">

    **Complementos externos:** publíquelos en [ClawHub](/en/tools/clawhub) o npm, luego instale:

    ```bash
    openclaw plugins install @myorg/openclaw-my-plugin
    ```

    OpenClaw verifica ClawHub primero y luego recurre a npm.

    **Complementos en el repositorio:** colóquelos bajo `extensions/` — se detectan automáticamente.

    ```bash
    pnpm test -- extensions/my-plugin/
    ```

  </Step>
</Steps>

## Capacidades de los complementos

Un solo complemento puede registrar cualquier cantidad de capacidades a través del objeto `api`:

| Capacidad                    | Método de registro                            | Guía detallada                                                                              |
| ---------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Inferencia de texto (LLM)    | `api.registerProvider(...)`                   | [Complementos de proveedor](/en/plugins/sdk-provider-plugins)                               |
| Backend de inferencia de CLI | `api.registerCliBackend(...)`                 | [Backends de CLI](/en/gateway/cli-backends)                                                 |
| Canal / mensajería           | `api.registerChannel(...)`                    | [Complementos de canal](/en/plugins/sdk-channel-plugins)                                    |
| Voz (TTS/STT)                | `api.registerSpeechProvider(...)`             | [Complementos de proveedor](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Comprensión multimedia       | `api.registerMediaUnderstandingProvider(...)` | [Complementos de proveedor](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Generación de imágenes       | `api.registerImageGenerationProvider(...)`    | [Plugins de proveedores](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities)    |
| Búsqueda web                 | `api.registerWebSearchProvider(...)`          | [Plugins de proveedores](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities)    |
| Herramientas de agente       | `api.registerTool(...)`                       | A continuación                                                                              |
| Comandos personalizados      | `api.registerCommand(...)`                    | [Puntos de entrada](/en/plugins/sdk-entrypoints)                                            |
| Ganchos de eventos           | `api.registerHook(...)`                       | [Puntos de entrada](/en/plugins/sdk-entrypoints)                                            |
| Rutas HTTP                   | `api.registerHttpRoute(...)`                  | [Funciones internas](/en/plugins/architecture#gateway-http-routes)                          |
| Subcomandos de CLI           | `api.registerCli(...)`                        | [Puntos de entrada](/en/plugins/sdk-entrypoints)                                            |

Para conocer la API de registro completa, consulte [Descripción general del SDK](/en/plugins/sdk-overview#registration-api).

Semántica de protección de gancho a tener en cuenta:

- `before_tool_call`: `{ block: true }` es terminal y detiene los controladores de menor prioridad.
- `before_tool_call`: `{ block: false }` se trata como sin decisión.
- `message_sending`: `{ cancel: true }` es terminal y detiene los controladores de menor prioridad.
- `message_sending`: `{ cancel: false }` se trata como sin decisión.

Consulte [Semántica de decisión de gancho de descripción general del SDK](/en/plugins/sdk-overview#hook-decision-semantics) para obtener detalles.

## Registro de herramientas de agente

Las herramientas son funciones tipificadas que el LLM puede llamar. Pueden ser obligatorias (siempre
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

Los usuarios habilitan las herramientas opcionales en la configuración:

```json5
{
  tools: { allow: ["workflow_tool"] },
}
```

- Los nombres de las herramientas no deben entrar en conflicto con las herramientas principales (los conflictos se omiten)
- Use `optional: true` para herramientas con efectos secundarios o requisitos binarios adicionales
- Los usuarios pueden habilitar todas las herramientas de un complemento agregando el id del complemento a `tools.allow`

## Convenciones de importación

Importe siempre desde rutas `openclaw/plugin-sdk/<subpath>` enfocadas:

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";

// Wrong: monolithic root (deprecated, will be removed)
import { ... } from "openclaw/plugin-sdk";
```

Para la referencia completa de la subruta, consulte [Información general del SDK](/en/plugins/sdk-overview).

Dentro de su complemento, use archivos barrel locales (`api.ts`, `runtime-api.ts`) para
importaciones internas; nunca importe su propio complemento a través de su ruta SDK.

## Lista de verificación previa al envío

<Check>**package.** tiene los metadatos correctos `openclaw`</Check>
<Check>El manifiesto **openclaw.plugin.** está presente y es válido</Check>
<Check>El punto de entrada usa `defineChannelPluginEntry` o `definePluginEntry`</Check>
<Check>Todas las importaciones usan rutas `plugin-sdk/<subpath>` enfocadas</Check>
<Check>Las importaciones internas usan módulos locales, no auto-importaciones del SDK</Check>
<Check>Las pruebas pasan (`pnpm test -- extensions/my-plugin/`)</Check>
<Check>`pnpm check` pasa (complementos en el repositorio)</Check>

## Pruebas de lanzamiento beta

1. Esté atento a las etiquetas de lanzamiento de GitHub en [openclaw/openclaw](https://github.com/openclaw/openclaw/releases) y suscríbase a través de `Watch` > `Releases`. Las etiquetas beta tienen el aspecto `v2026.3.N-beta.1`. También puede activar las notificaciones para la cuenta oficial de OpenClaw X [@openclaw](https://x.com/openclaw) para recibir anuncios de lanzamiento.
2. Pruebe su complemento con la etiqueta beta tan pronto como aparezca. El período de tiempo antes de la versión estable suele ser de solo unas pocas horas.
3. Publique en el hilo de su complemento en el canal de Discord `plugin-forum` después de probar con `all good` o con lo que falló. Si aún no tiene un hilo, cree uno.
4. Si algo falla, abra o actualice un problema titulado `Beta blocker: <plugin-name> - <summary>` y aplique la etiqueta `beta-blocker`. Ponga el enlace del problema en su hilo.
5. Abra una PR a `main` titulada `fix(<plugin-id>): beta blocker - <summary>` y vincule el problema tanto en la PR como en su hilo de Discord. Los colaboradores no pueden etiquetar las PR, por lo que el título es la señal del lado de la PR para los mantenedores y la automatización. Los bloqueos con una PR se fusionan; los bloqueos sin una podrían lanzarse de todos modos. Los mantenedores observan estos hilos durante las pruebas beta.
6. El silencio significa que está bien (verde). Si pierde el plazo, su solución probablemente se incluirá en el próximo ciclo.

## Próximos pasos

<CardGroup cols={2}>
  <Card title="Complementos de canal" icon="messages-square" href="/en/plugins/sdk-channel-plugins">
    Cree un complemento de canal de mensajería
  </Card>
  <Card title="Complementos de proveedor" icon="cpu" href="/en/plugins/sdk-provider-plugins">
    Cree un complemento de proveedor de modelos
  </Card>
  <Card title="Resumen del SDK" icon="book-open" href="/en/plugins/sdk-overview">
    Mapa de importación y referencia de la API de registro
  </Card>
  <Card title="Asistentes de tiempo de ejecución" icon="settings" href="/en/plugins/sdk-runtime">
    TTS, búsqueda, subagente mediante api.runtime
  </Card>
  <Card title="Pruebas" icon="test-tubes" href="/en/plugins/sdk-testing">
    Utilidades y patrones de prueba
  </Card>
  <Card title="Manifiesto del complemento" icon="file-" href="/en/plugins/manifest">
    Referencia completa del esquema del manifiesto
  </Card>
</CardGroup>
