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

Los complementos extienden OpenClaw con nuevas capacidades: canales, proveedores de modelos,
voz, transcripción en tiempo real, voz en tiempo real, comprensión de medios, generación
de imágenes, generación de video, obtención web, búsqueda web, herramientas de agente, o cualquier
combinación.

No es necesario agregar su complemento al repositorio de OpenClaw. Publíquelo en
[ClawHub](/en/tools/clawhub) o npm y los usuarios lo instalan con
`openclaw plugins install <package-name>`. OpenClaw intenta con ClawHub primero y
realiza una copia de seguridad en npm automáticamente.

## Requisitos previos

- Node >= 22 y un gestor de paquetes (npm o pnpm)
- Familiaridad con TypeScript (ESM)
- Para complementos en el repositorio: repositorio clonado y `pnpm install` realizado

## ¿Qué tipo de complemento?

<CardGroup cols={3}>
  <Card title="Complemento de canal" icon="messages-square" href="/en/plugins/sdk-channel-plugins">
    Conecte OpenClaw a una plataforma de mensajería (Discord, IRC, etc.)
  </Card>
  <Card title="Complemento de proveedor" icon="cpu" href="/en/plugins/sdk-provider-plugins">
    Añada un proveedor de modelos (LLM, proxy o endpoint personalizado)
  </Card>
  <Card title="Complemento de herramienta / gancho" icon="wrench">
    Registre herramientas de agente, ganchos de eventos o servicios — continúe abajo
  </Card>
</CardGroup>

Si un complemento de canal es opcional y puede no estar instalado cuando se ejecuta la incorporación/configuración,
use `createOptionalChannelSetupSurface(...)` de
`openclaw/plugin-sdk/channel-setup`. Produce un par de adaptador + asistente de configuración
que anuncia el requisito de instalación y falla de forma segura en las escrituras de configuración reales
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
      "configSchema": {
        "type": "object",
        "additionalProperties": false
      }
    }
    ```
    </CodeGroup>

    Cada complemento necesita un manifiesto, incluso sin configuración. Consulte
    [Manifest](/en/plugins/manifest) para ver el esquema completo. Los fragmentos de publicación
    canónicos de ClawHub viven en `docs/snippets/plugin-publish/`.

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
    `defineChannelPluginEntry` — consulte [Channel Plugins](/en/plugins/sdk-channel-plugins).
    Para ver todas las opciones de punto de entrada, consulte [Entry Points](/en/plugins/sdk-entrypoints).

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

    **Complementos en el repositorio:** colóquelos debajo del árbol del espacio de trabajo del complemento empaquetado — se descubren automáticamente.

    ```bash
    pnpm test -- <bundled-plugin-root>/my-plugin/
    ```

  </Step>
</Steps>

## Capacidades del complemento

Un único complemento puede registrar cualquier cantidad de capacidades a través del objeto `api`:

| Capacidad                    | Método de registro                               | Guía detallada                                                                              |
| ---------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Inferencia de texto (LLM)    | `api.registerProvider(...)`                      | [Complementos de proveedor](/en/plugins/sdk-provider-plugins)                               |
| Canal / mensajería           | `api.registerChannel(...)`                       | [Complementos de canal](/en/plugins/sdk-channel-plugins)                                    |
| Voz (TTS/STT)                | `api.registerSpeechProvider(...)`                | [Complementos de proveedor](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Transcripción en tiempo real | `api.registerRealtimeTranscriptionProvider(...)` | [Complementos de proveedor](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Voz en tiempo real           | `api.registerRealtimeVoiceProvider(...)`         | [Complementos de proveedor](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Comprensión de medios        | `api.registerMediaUnderstandingProvider(...)`    | [Complementos de proveedor](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Generación de imágenes       | `api.registerImageGenerationProvider(...)`       | [Complementos de proveedor](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Generación de música         | `api.registerMusicGenerationProvider(...)`       | [Complementos de proveedor](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Generación de video          | `api.registerVideoGenerationProvider(...)`       | [Complementos de proveedor](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Recuperación web             | `api.registerWebFetchProvider(...)`              | [Complementos de proveedor](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Búsqueda web                 | `api.registerWebSearchProvider(...)`             | [Complementos de proveedor](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Herramientas de agente       | `api.registerTool(...)`                          | A continuación                                                                              |
| Comandos personalizados      | `api.registerCommand(...)`                       | [Puntos de entrada](/en/plugins/sdk-entrypoints)                                            |
| Ganchos de eventos           | `api.registerHook(...)`                          | [Puntos de entrada](/en/plugins/sdk-entrypoints)                                            |
| Rutas HTTP                   | `api.registerHttpRoute(...)`                     | [Aspectos internos](/en/plugins/architecture#gateway-http-routes)                           |
| Subcomandos de CLI           | `api.registerCli(...)`                           | [Puntos de entrada](/en/plugins/sdk-entrypoints)                                            |

Para ver la API de registro completa, consulte [Descripción general del SDK](/en/plugins/sdk-overview#registration-api).

Si tu complemento registra métodos RPC de puerta de enlace personalizados, mantenlos en un prefijo específico del complemento. Los espacios de nombres de administración principales (`config.*`, `exec.approvals.*`, `wizard.*`, `update.*`) permanecen reservados y siempre se resuelven en `operator.admin`, incluso si un complemento solicita un ámbito más limitado.

Semánticas de guardias de gancho (hook guard) a tener en cuenta:

- `before_tool_call`: `{ block: true }` es terminal y detiene los controladores de menor prioridad.
- `before_tool_call`: `{ block: false }` se trata como una decisión nula.
- `before_tool_call`: `{ requireApproval: true }` pausa la ejecución del agente y solicita al usuario su aprobación a través de la superposición de aprobación de ejecución, botones de Telegram, interacciones de Discord o el comando `/approve` en cualquier canal.
- `before_install`: `{ block: true }` es terminal y detiene los controladores de menor prioridad.
- `before_install`: `{ block: false }` se trata como una decisión nula.
- `message_sending`: `{ cancel: true }` es terminal y detiene los controladores de menor prioridad.
- `message_sending`: `{ cancel: false }` se trata como una decisión nula.

El comando `/approve` maneja tanto las aprobaciones de ejecución como las de complementos con retroceso limitado: cuando no se encuentra un id de aprobación de ejecución, OpenClaw reintenta el mismo id a través de las aprobaciones de complementos. El reenvío de aprobaciones de complementos se puede configurar de forma independiente mediante `approvals.plugin` en la configuración.

Si la canalización de aprobación personalizada necesita detectar ese mismo caso de retroceso limitado, prefiere `isApprovalNotFoundError` de `openclaw/plugin-sdk/error-runtime` en lugar de hacer coincidir manualmente las cadenas de expiración de aprobación.

Consulta [semánticas de decisión de gancho en la descripción general del SDK](/en/plugins/sdk-overview#hook-decision-semantics) para obtener detalles.

## Registrar herramientas de agente

Las herramientas son funciones tipificadas que el LLM puede llamar. Pueden ser obligatorias (siempre disponibles) u opcionales (opt-in por el usuario):

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
- Usa `optional: true` para herramientas con efectos secundarios o requisitos binarios adicionales
- Los usuarios pueden habilitar todas las herramientas de un complemento añadiendo el id del complemento a `tools.allow`

## Convenciones de importación

Siempre importe desde rutas `openclaw/plugin-sdk/<subpath>` enfocadas:

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";

// Wrong: monolithic root (deprecated, will be removed)
import { ... } from "openclaw/plugin-sdk";
```

Para la referencia completa de subrutas, consulte [Información general del SDK](/en/plugins/sdk-overview).

Dentro de su complemento, utilice archivos barril locales (`api.ts`, `runtime-api.ts`) para
las importaciones internas; nunca importe su propio complemento a través de su ruta SDK.

Para los complementos de proveedores, mantenga los asistentes específicos del proveedor en esos archivos barril
raíz del paquete a menos que la unión sea verdaderamente genérica. Ejemplos empaquetados actuales:

- Anthropic: envoltorios de transmisión de Claude y asistentes `service_tier` / beta
- OpenAI: constructores de proveedores, asistentes de modelo predeterminado, proveedores en tiempo real
- OpenRouter: constructor de proveedores más asistentes de incorporación/configuración

Si un asistente solo es útil dentro de un paquete de proveedor empaquetado, manténgalo en esa
unión raíz del paquete en lugar de promoverlo a `openclaw/plugin-sdk/*`.

Algunas uniones de asistentes `openclaw/plugin-sdk/<bundled-id>` generadas todavía existen para
el mantenimiento y la compatibilidad de complementos empaquetados, por ejemplo
`plugin-sdk/feishu-setup` o `plugin-sdk/zalo-setup`. Trate esas como superficies
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

1. Esté atento a las etiquetas de lanzamiento de GitHub en [openclaw/openclaw](https://github.com/openclaw/openclaw/releases) y suscríbase mediante `Watch` > `Releases`. Las etiquetas beta se parecen a `v2026.3.N-beta.1`. También puede activar las notificaciones para la cuenta oficial de OpenClaw X [@openclaw](https://x.com/openclaw) para recibir anuncios de lanzamientos.
2. Pruebe su complemento contra la etiqueta beta tan pronto como aparezca. La ventana antes de la versión estable suele ser de solo unas pocas horas.
3. Publique en el hilo de su complemento en el canal de Discord `plugin-forum` después de probar con `all good` o con lo que se rompió. Si aún no tiene un hilo, cree uno.
4. Si algo se rompe, abra o actualice un problema titulado `Beta blocker: <plugin-name> - <summary>` y aplique la etiqueta `beta-blocker`. Ponga el enlace del problema en su hilo.
5. Abra un PR a `main` titulado `fix(<plugin-id>): beta blocker - <summary>` y vincule el problema tanto en el PR como en su hilo de Discord. Los colaboradores no pueden etiquetar los PR, por lo que el título es la señal del lado del PR para los mantenedores y la automatización. Los bloqueadores con un PR se fusionan; los bloqueadores sin uno pueden publicarse de todos modos. Los mantenedores observan estos hilos durante las pruebas beta.
6. El silencio significa luz verde. Si pierde la ventana, su solución probablemente se incluirá en el siguiente ciclo.

## Próximos pasos

<CardGroup cols={2}>
  <Card title="Complementos de Canal" icon="messages-square" href="/en/plugins/sdk-channel-plugins">
    Construya un complemento de canal de mensajería
  </Card>
  <Card title="Complementos de Proveedor" icon="cpu" href="/en/plugins/sdk-provider-plugins">
    Construya un complemento de proveedor de modelos
  </Card>
  <Card title="Resumen del SDK" icon="book-open" href="/en/plugins/sdk-overview">
    Referencia de API de mapa de importación y registro
  </Card>
  <Card title="Ayudantes de Tiempo de Ejecución" icon="settings" href="/en/plugins/sdk-runtime">
    TTS, búsqueda, subagente a través de api.runtime
  </Card>
  <Card title="Pruebas" icon="test-tubes" href="/en/plugins/sdk-testing">
    Utilidades y patrones de prueba
  </Card>
  <Card title="Manifiesto de Plugin" icon="file-" href="/en/plugins/manifest">
    Referencia completa del esquema de manifiesto
  </Card>
</CardGroup>

## Relacionado

- [Arquitectura de Plugins](/en/plugins/architecture) — inmersión profunda en la arquitectura interna
- [Resumen del SDK](/en/plugins/sdk-overview) — referencia del SDK de Plugins
- [Manifiesto](/en/plugins/manifest) — formato de manifiesto de plugin
- [Plugins de Canal](/en/plugins/sdk-channel-plugins) — construcción de plugins de canal
- [Plugins de Proveedor](/en/plugins/sdk-provider-plugins) — construcción de plugins de proveedor
