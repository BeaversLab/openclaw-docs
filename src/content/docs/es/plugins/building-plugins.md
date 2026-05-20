---
summary: "Crea tu primer complemento de OpenClaw en minutos"
title: "Construyendo complementos"
sidebarTitle: "Introducción"
doc-schema-version: 1
read_when:
  - You want to create a new OpenClaw plugin
  - You need a quick-start for plugin development
  - You are choosing between channel, provider, CLI backend, tool, or hook docs
---

Los complementos extienden OpenClaw sin cambiar el núcleo. Un complemento puede agregar un canal de mensajería, proveedor de modelos, backend local de CLI, herramienta de agente, enlace, proveedor de medios u otra capacidad propiedad del complemento.

No es necesario agregar un complemento externo al repositorio de OpenClaw. Publica el paquete en [ClawHub](/es/clawhub) y los usuarios lo instalan con:

```bash
openclaw plugins install clawhub:<package-name>
```

Las especificaciones de paquete básicas todavía se instalan desde npm durante la transición de lanzamiento. Usa el prefijo `clawhub:` cuando quieras la resolución de ClawHub.

## Requisitos

- Usa Node 22.19 o más reciente y un gestor de paquetes como `npm` o `pnpm`.
- Estar familiarizado con los módulos ESM de TypeScript.
- Para el trabajo de complementos agrupados en el repositorio, clona el repositorio y ejecuta `pnpm install`.
  El desarrollo de complementos con código fuente es exclusivo de pnpm porque OpenClaw carga los complementos agrupados desde paquetes del espacio de trabajo `extensions/*`.

## Elige el tipo de complemento

<CardGroup cols={2}>
  <Card title="Complemento de canal" icon="messages-square" href="/es/plugins/sdk-channel-plugins">
    Conecta OpenClaw a una plataforma de mensajería.
  </Card>
  <Card title="Complemento de proveedor" icon="cpu" href="/es/plugins/sdk-provider-plugins">
    Agrega un proveedor de modelos, medios, búsqueda, recuperación, voz o tiempo real.
  </Card>
  <Card title="Complemento de backend de CLI" icon="terminal" href="/es/plugins/cli-backend-plugins">
    Ejecuta una CLI de IA local a través del respaldo de modelos de OpenClaw.
  </Card>
  <Card title="Complemento de herramienta" icon="wrench" href="/es/plugins/tool-plugins">
    Registra herramientas de agente.
  </Card>
</CardGroup>

## Inicio rápido

Cree un complemento de herramienta mínimo registrando una herramienta de agente obligatoria. Esta es la forma de complemento útil más corta y muestra el paquete, el manifiesto, el punto de entrada y la prueba local.

<Steps>
  <Step title="Crear metadatos del paquete">
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

    Los complementos externos publicados deben apuntar las entradas de tiempo de ejecución a archivos JavaScript construidos.
    Consulte [Puntos de entrada del SDK](/es/plugins/sdk-entrypoints) para ver el contrato completo del
    punto de entrada.

    Cada complemento necesita un manifiesto, incluso cuando no tiene configuración. Las herramientas de tiempo de ejecución
    deben aparecer en `contracts.tools` para que OpenClaw pueda descubrir la propiedad sin
    cargar ansiosamente todos los tiempos de ejecución de complementos. Configure `activation.onStartup`
    intencionalmente. Este ejemplo se inicia al iniciar Gateway.

    Para cada campo de manifiesto, consulte [Manifiesto del complemento](/es/plugins/manifest).

  </Step>

  <Step title="Registrar la herramienta">
    ```typescript index.ts
    import { Type } from "typebox";
    import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

    export default definePluginEntry({
      id: "my-plugin",
      name: "My Plugin",
      description: "Adds a custom tool to OpenClaw",
      register(api) {
        api.registerTool({
          name: "my_tool",
          description: "Echo one input value",
          parameters: Type.Object({ input: Type.String() }),
          async execute(_id, params) {
            return {
              content: [{ type: "text", text: `Got: ${params.input}` }],
            };
          },
        });
      },
    });
    ```

    Use `definePluginEntry` para complementos que no sean de canal. Los complementos de canal usan
    `defineChannelPluginEntry`.

  </Step>

  <Step title="Probar el tiempo de ejecución">
    Para un complemento instalado o externo, inspeccione el tiempo de ejecución cargado:

    ```bash
    openclaw plugins inspect my-plugin --runtime --json
    ```

    Si el complemento registra un comando CLI, ejecute ese comando también. Por ejemplo,
    un comando de demostración debe tener una prueba de ejecución como
    `openclaw demo-plugin ping`.

    Para un complemento incluido en este repositorio, OpenClaw descubre paquetes de complementos
    de fuente extraída del espacio de trabajo `extensions/*`. Ejecute la prueba dirigida más cercana:

    ```bash
    pnpm test -- extensions/my-plugin/
    pnpm check
    ```

  </Step>

  <Step title="Publicar">
    Valide el paquete antes de publicarlo:

    ```bash
    clawhub package publish your-org/your-plugin --dry-run
    clawhub package publish your-org/your-plugin
    ```

    Los fragmentos canónicos de ClawHub viven en `docs/snippets/plugin-publish/`.

  </Step>

  <Step title="Instalar">
    Instale el paquete publicado a través de ClawHub:

    ```bash
    openclaw plugins install clawhub:your-org/your-plugin
    ```

  </Step>
</Steps>

<a id="registering-agent-tools"></a>

## Registro de herramientas

Las herramientas pueden ser obligatorias u opcionales. Las herramientas obligatorias siempre están disponibles cuando el complemento está habilitado. Las herramientas opcionales requieren la aceptación explícita del usuario.

```typescript
register(api) {
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

Cada herramienta registrada con `api.registerTool(...)` también debe declararse en el manifiesto del complemento:

```json
{
  "contracts": {
    "tools": ["workflow_tool"]
  },
  "toolMetadata": {
    "workflow_tool": {
      "optional": true
    }
  }
}
```

Los usuarios aceptan con `tools.allow`:

```json5
{
  tools: { allow: ["workflow_tool"] }, // or ["my-plugin"] for all tools from one plugin
}
```

Use herramientas opcionales para efectos secundarios, binarios inusuales o capacidades que no deben exponerse de forma predeterminada. Los nombres de las herramientas no deben entrar en conflicto con las herramientas principales; los conflictos se omiten y se informan en los diagnósticos del complemento. Los registros con formato incorrecto, incluidos los descriptores de herramientas sin `parameters`, se omiten y se informan de la misma manera. Las herramientas registradas son funciones tipificadas que el modelo puede llamar después de pasar las comprobaciones de política y lista de permitidos.

Las fábricas de herramientas reciben un objeto de contexto proporcionado por el tiempo de ejecución. Use `ctx.activeModel` cuando una herramienta necesite registrar, mostrar o adaptarse al modelo activo para el turno actual. El objeto puede incluir `provider`, `modelId` y `modelRef`. Trátelo como metadatos informativos del tiempo de ejecución, no como un límite de seguridad contra el operador local, el código del complemento instalado o un tiempo de ejecución de OpenClaw modificado. Las herramientas locales sensibles aún deben requerir una aceptación explícita del complemento o del operador y deben fallar de forma cerrada cuando faltan o no son adecuados los metadatos del modelo activo.

El manifiesto declara la propiedad y el descubrimiento; la ejecución aún llama a la implementación de la herramienta registrada en vivo. Mantenga `toolMetadata.<tool>.optional: true` alineado con `api.registerTool(..., { optional: true })` para que OpenClaw pueda evitar cargar ese tiempo de ejecución del complemento hasta que la herramienta se haya agregado explícitamente a la lista de permitidos.

## Convenciones de importación

Importe desde subrutas enfocadas del SDK:

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
```

No importe desde el barril raíz en desuso:

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk";
```

Dentro de su paquete de complementos, use archivos barril locales como `api.ts` y `runtime-api.ts` para importaciones internas. No importe su propio complemento a través de una ruta del SDK. Los asistentes específicos del proveedor deben permanecer en el paquete del proveedor a menos que la unión sea verdaderamente genérica.

Los métodos RPC de Gateway personalizados son un punto de entrada avanzado. Manténgalos en un prefijo específico del complemento; los espacios de nombres de administración principal como `config.*`, `exec.approvals.*`, `operator.admin.*`, `wizard.*` y `update.*` permanecen reservados y resuelven a `operator.admin`. El puente `openclaw/plugin-sdk/gateway-method-runtime` está reservado para las rutas HTTP de complementos que declaran `contracts.gatewayMethodDispatch: ["authenticated-request"]`.

Para ver el mapa de importación completo, consulte [Plugin SDK overview](/es/plugins/sdk-overview).

## Lista de verificación previa al envío

<Check>**package.** tiene los metadatos correctos `openclaw`</Check>
<Check>El manifiesto **openclaw.plugin.** está presente y es válido</Check>
<Check>El punto de entrada usa `defineChannelPluginEntry` o `definePluginEntry`</Check>
<Check>Todas las importaciones usan rutas `plugin-sdk/<subpath>` enfocadas</Check>
<Check>Las importaciones internas usan módulos locales, no auto-importaciones del SDK</Check>
<Check>Las pruebas pasan (`pnpm test -- <bundled-plugin-root>/my-plugin/`)</Check>
<Check>`pnpm check` pasa (complementos dentro del repositorio)</Check>

## Probar contra versiones beta

1. Esté atento a las etiquetas de lanzamiento de GitHub en [openclaw/openclaw](https://github.com/openclaw/openclaw/releases) y suscríbase a través de `Watch` > `Releases`. Las etiquetas beta se parecen a `v2026.3.N-beta.1`. También puede activar las notificaciones para la cuenta oficial de OpenClaw X [@openclaw](https://x.com/openclaw) para anuncios de lanzamiento.
2. Pruebe su complemento contra la etiqueta beta tan pronto como aparezca. La ventana antes de la versión estable suele ser de solo unas pocas horas.
3. Publique en el hilo de su complemento en el canal de Discord `plugin-forum` después de probar con `all good` o con lo que se rompió. Si aún no tiene un hilo, cree uno.
4. Si algo se rompe, abra o actualice un problema titulado `Beta blocker: <plugin-name> - <summary>` y aplique la etiqueta `beta-blocker`. Ponga el enlace del problema en su hilo.
5. Abre una PR a `main` titulada `fix(<plugin-id>): beta blocker - <summary>` y vincula la incidencia tanto en la PR como en tu hilo de Discord. Los colaboradores no pueden etiquetar las PR, por lo que el título es la señal del lado de la PR para los mantenedores y la automatización. Los bloqueos con una PR se fusionan; los bloqueos sin una podrían lanzarse de todos modos. Los mantenedores supervisan estos hilos durante las pruebas beta.
6. El silencio significa luz verde. Si pierdes la ventana, tu corrección probablemente se incluirá en el siguiente ciclo.

## Siguientes pasos

<CardGroup cols={2}>
  <Card title="Plugins de canal" icon="messages-square" href="/es/plugins/sdk-channel-plugins">
    Crea un plugin de canal de mensajería
  </Card>
  <Card title="Plugins de proveedor" icon="cpu" href="/es/plugins/sdk-provider-plugins">
    Crea un plugin de proveedor de modelos
  </Card>
  <Card title="Plugins de backend de CLI" icon="terminal" href="/es/plugins/cli-backend-plugins">
    Registra un backend de CLI de IA local
  </Card>
  <Card title="Resumen del SDK" icon="book-open" href="/es/plugins/sdk-overview">
    Mapa de importación y referencia de la API de registro
  </Card>
  <Card title="Ayudantes de tiempo de ejecución" icon="settings" href="/es/plugins/sdk-runtime">
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

- [Ganchos de plugins](/es/plugins/hooks)
- [Arquitectura de plugins](/es/plugins/architecture)
