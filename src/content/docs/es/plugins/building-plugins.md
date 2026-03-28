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

No es necesario que añadas tu complemento al repositorio de OpenClaw. Publícalo en
[ClawHub](/es/tools/clawhub) o npm y los usuarios lo instalan con
`openclaw plugins install <package-name>`. OpenClaw intenta con ClawHub primero y
recurre a npm automáticamente.

## Requisitos previos

- Node >= 22 y un gestor de paquetes (npm o pnpm)
- Familiaridad con TypeScript (ESM)
- Para complementos en el repositorio: repositorio clonado y `pnpm install` realizado

## ¿Qué tipo de complemento?

<CardGroup cols={3}>
  <Card title="Complemento de canal" icon="messages-square" href="/es/plugins/sdk-channel-plugins">
    Conecta OpenClaw a una plataforma de mensajería (Discord, IRC, etc.)
  </Card>
  <Card title="Complemento de proveedor" icon="cpu" href="/es/plugins/sdk-provider-plugins">
    Añade un proveedor de modelos (LLM, proxy o punto de conexión personalizado)
  </Card>
  <Card title="Complemento de herramienta / hook" icon="wrench">
    Registra herramientas de agente, hooks de eventos o servicios — continúa abajo
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
    [Manifest](/es/plugins/manifest) para ver el esquema completo.

  </Step>

  <Step title="Escriba el punto de entrada">

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
    `defineChannelPluginEntry` — consulte [Complementos de canal](/es/plugins/sdk-channel-plugins).
    Para obtener opciones completas de puntos de entrada, consulte [Puntos de entrada](/es/plugins/sdk-entrypoints).

  </Step>

  <Step title="Prueba y publicación">

    **Complementos externos:** publíquelos en [ClawHub](/es/tools/clawhub) o npm, luego instálelos:

    ```bash
    openclaw plugins install @myorg/openclaw-my-plugin
    ```

    OpenClaw verifica primero ClawHub y luego recurre a npm.

    **Complementos en el repositorio:** colóquelos bajo `extensions/` — se detectan automáticamente.

    ```bash
    pnpm test -- extensions/my-plugin/
    ```

  </Step>
</Steps>

## Capacidades de los complementos

Un único complemento puede registrar cualquier cantidad de capacidades a través del objeto `api`:

| Capacidad                 | Método de registro                            | Guía detallada                                                                              |
| ------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Inferencia de texto (LLM) | `api.registerProvider(...)`                   | [Complementos de proveedor](/es/plugins/sdk-provider-plugins)                               |
| Canal / mensajería        | `api.registerChannel(...)`                    | [Complementos de canal](/es/plugins/sdk-channel-plugins)                                    |
| Voz (TTS/STT)             | `api.registerSpeechProvider(...)`             | [Complementos de proveedor](/es/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Comprensión de medios     | `api.registerMediaUnderstandingProvider(...)` | [Complementos de proveedor](/es/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Generación de imágenes    | `api.registerImageGenerationProvider(...)`    | [Complementos de proveedor](/es/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Búsqueda web              | `api.registerWebSearchProvider(...)`          | [Complementos de proveedor](/es/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Herramientas de agente    | `api.registerTool(...)`                       | A continuación                                                                              |
| Comandos personalizados   | `api.registerCommand(...)`                    | [Puntos de entrada](/es/plugins/sdk-entrypoints)                                            |
| Ganchos de eventos        | `api.registerHook(...)`                       | [Puntos de entrada](/es/plugins/sdk-entrypoints)                                            |
| Rutas HTTP                | `api.registerHttpRoute(...)`                  | [Aspectos internos](/es/plugins/architecture#gateway-http-routes)                           |
| Subcomandos de CLI        | `api.registerCli(...)`                        | [Puntos de entrada](/es/plugins/sdk-entrypoints)                                            |

Para obtener la API de registro completa, consulte [Descripción general del SDK](/es/plugins/sdk-overview#registration-api).

Semántica de protección de ganchos a tener en cuenta:

- `before_tool_call`: `{ block: true }` es terminal y detiene los controladores de menor prioridad.
- `before_tool_call`: `{ block: false }` se trata como sin decisión.
- `message_sending`: `{ cancel: true }` es terminal y detiene los controladores de menor prioridad.
- `message_sending` `{ cancel: false }` se trata como sin decisión.

Consulte [semánticas de decisión de hook del SDK Overview](/es/plugins/sdk-overview#hook-decision-semantics) para obtener detalles.

## Registro de herramientas de agente

Las herramientas son funciones tipificadas que el LLM puede llamar. Pueden ser obligatorias (siempre disponibles) u opcionales (opción del usuario):

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
- Los usuarios pueden habilitar todas las herramientas de un complemento agregando el ID del complemento a `tools.allow`

## Convenciones de importación

Siempre importe desde rutas `openclaw/plugin-sdk/<subpath>` enfocadas:

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";

// Wrong: monolithic root (deprecated, will be removed)
import { ... } from "openclaw/plugin-sdk";
```

Para obtener la referencia completa de subrutas, consulte [SDK Overview](/es/plugins/sdk-overview).

Dentro de su complemento, use archivos barril locales (`api.ts`, `runtime-api.ts`) para importaciones internas; nunca importe su propio complemento a través de su ruta del SDK.

## Lista de verificación previa al envío

<Check>**package.** tiene metadatos `openclaw` correctos</Check>
<Check>El manifiesto **openclaw.plugin.** está presente y es válido</Check>
<Check>El punto de entrada usa `defineChannelPluginEntry` o `definePluginEntry`</Check>
<Check>Todas las importaciones usan rutas `plugin-sdk/<subpath>` enfocadas</Check>
<Check>Las importaciones internas usan módulos locales, no autoimportaciones del SDK</Check>
<Check>Las pruebas pasan (`pnpm test -- extensions/my-plugin/`)</Check>
<Check>`pnpm check` pasa (complementos en el repositorio)</Check>

## Siguientes pasos

<CardGroup cols={2}>
  <Card title="Complementos de canal" icon="messages-square" href="/es/plugins/sdk-channel-plugins">
    Cree un complemento de canal de mensajería
  </Card>
  <Card title="Complementos de proveedor" icon="cpu" href="/es/plugins/sdk-provider-plugins">
    Construye un complemento de proveedor de modelos
  </Card>
  <Card title="Resumen del SDK" icon="book-open" href="/es/plugins/sdk-overview">
    Mapa de importación y referencia de la API de registro
  </Card>
  <Card title="Ayudantes de runtime" icon="settings" href="/es/plugins/sdk-runtime">
    TTS, búsqueda, subagente vía api.runtime
  </Card>
  <Card title="Pruebas" icon="test-tubes" href="/es/plugins/sdk-testing">
    Utilidades y patrones de prueba
  </Card>
  <Card title="Manifiesto del complemento" icon="file-json" href="/es/plugins/manifest">
    Referencia completa del esquema de manifiesto
  </Card>
</CardGroup>
