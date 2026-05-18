---
summary: "Construye herramientas de agentes tipificadas simples con defineToolPlugin y openclaw plugins init/build/validate"
title: "Complementos de herramientas"
sidebarTitle: "Complementos de herramientas"
read_when:
  - You want to build a simple OpenClaw plugin that only adds agent tools
  - You want to use defineToolPlugin instead of hand-writing plugin manifest metadata
  - You need to scaffold, generate, validate, test, or publish a tool-only plugin
---

Los complementos de herramientas añaden herramientas invocables por el agente a OpenClaw sin añadir un canal,
proveedor de modelo, hook, servicio o backend de configuración. Usa `defineToolPlugin` cuando el
complemento posee una lista fija de herramientas y deseas que OpenClaw genere los metadatos
del manifiesto que mantienen esas herramientas descubribles sin cargar código en tiempo de ejecución.

El flujo recomendado es:

1. Generar la estructura de un paquete con `openclaw plugins init`.
2. Escribir herramientas con `defineToolPlugin`.
3. Construir JavaScript.
4. Genere metadatos de `openclaw.plugin.json` y `package.json` con
   `openclaw plugins build`.
5. Valide los metadatos generados antes de publicar o instalar.

Para complementos de proveedor, canal, enlace, servicio o capacidades mixtas, comience con
[Building plugins](/es/plugins/building-plugins), [Channel Plugins](/es/plugins/sdk-channel-plugins),
o [Provider Plugins](/es/plugins/sdk-provider-plugins) en su lugar.

## Requisitos

- Node >= 22.
- Salida de paquete ESM de TypeScript.
- `typebox` para esquemas de configuración y parámetros de herramienta.
- `openclaw >=2026.5.17`, la primera versión de OpenClaw que exporta
  `openclaw/plugin-sdk/tool-plugin`.
- Una raíz de paquete que pueda enviar `dist/`, `openclaw.plugin.json` y
  `package.json`.

El complemento generado importa `typebox` en tiempo de ejecución, por lo que debes mantener `typebox` en
`dependencies`, no solo `devDependencies`.

## Inicio rápido

Cree un nuevo paquete de complemento:

```bash
openclaw plugins init stock-quotes --name "Stock Quotes"
cd stock-quotes
npm install
npm run plugin:build
npm run plugin:validate
npm test
```

El andamiaje crea:

- `src/index.ts`: una entrada `defineToolPlugin` con una herramienta `echo`.
- `src/index.test.ts`: una pequeña prueba de metadatos.
- `tsconfig.json`: salida TypeScript NodeNext a `dist/`.
- `package.json`: scripts, dependencias de tiempo de ejecución y
  `openclaw.extensions: ["./dist/index.js"]`.
- `openclaw.plugin.json`: metadatos de manifiesto generados para la herramienta inicial.

Salida de validación esperada:

```text
Plugin stock-quotes is valid.
```

## Escribir una herramienta

`defineToolPlugin` toma la identidad del complemento, un esquema de configuración opcional y una lista estática de herramientas. Los tipos de parámetros y de configuración se infieren a partir de los esquemas de TypeBox.

```typescript
import { Type } from "typebox";
import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";

export default defineToolPlugin({
  id: "stock-quotes",
  name: "Stock Quotes",
  description: "Fetch stock quote snapshots.",
  configSchema: Type.Object({
    apiKey: Type.Optional(Type.String({ description: "Quote API key." })),
    baseUrl: Type.Optional(Type.String({ description: "Quote API base URL." })),
  }),
  tools: (tool) => [
    tool({
      name: "stock_quote",
      label: "Stock Quote",
      description: "Fetch a stock quote snapshot.",
      parameters: Type.Object({
        symbol: Type.String({ description: "Ticker symbol, for example OPEN." }),
      }),
      async execute({ symbol }, config, context) {
        context.signal?.throwIfAborted();
        return {
          symbol: symbol.toUpperCase(),
          configured: Boolean(config.apiKey),
          baseUrl: config.baseUrl ?? "https://api.example.com",
        };
      },
    }),
  ],
});
```

Los nombres de las herramientas son la API estable. Elija nombres que sean únicos, en minúsculas y lo suficientemente específicos para evitar colisiones con las herramientas principales u otros complementos.

## Herramientas opcionales y de fábrica

Establezca `optional: true` cuando los usuarios deben incluir explícitamente la herramienta en una lista de permitidos antes de que se envíe a un modelo:

```typescript
tool({
  name: "workflow_run",
  description: "Run an external workflow.",
  parameters: Type.Object({ goal: Type.String() }),
  optional: true,
  execute: ({ goal }) => ({ queued: true, goal }),
});
```

`openclaw plugins build` escribe la entrada de manifiesto `toolMetadata.<tool>.optional` coincidente, para que OpenClaw pueda descubrir la herramienta sin cargar el código de tiempo de ejecución del complemento.

Use `factory` cuando una herramienta necesita el contexto de la herramienta de tiempo de ejecución antes de poder ser creada. La fábrica mantiene los metadatos estáticos al tiempo que permite a la herramienta optar por no participar en una ejecución específica, inspeccionar el estado del entorno restringido (sandbox) o vincular asistentes de tiempo de ejecución.

```typescript
tool({
  name: "local_workflow",
  description: "Run a local workflow outside sandboxed sessions.",
  parameters: Type.Object({ goal: Type.String() }),
  optional: true,
  factory({ api, toolContext }) {
    if (toolContext.sandboxed) {
      return null;
    }
    return createLocalWorkflowTool(api);
  },
});
```

Las fábricas siguen siendo para nombres de herramientas fijos. Use `definePluginEntry` directamente cuando
el complemento calcula dinámicamente los nombres de las herramientas o combina herramientas con ganchos,
servicios, proveedores, comandos u otras superficies de tiempo de ejecución.

## Valores de retorno

`defineToolPlugin` envuelve los valores de retorno simples en el formato de resultado de herramienta
de OpenClaw:

- Devuelva una cadena cuando el modelo deba ver exactamente ese texto.
- Devuelva un valor compatible con JSON cuando desee que el modelo vea JSON con formato
  y OpenClaw mantenga el valor original en `details`.

```typescript
tool({
  name: "echo_text",
  description: "Echo input text.",
  parameters: Type.Object({
    input: Type.String(),
  }),
  execute: ({ input }) => input,
});
```

```typescript
tool({
  name: "echo_json",
  description: "Echo input as structured JSON.",
  parameters: Type.Object({
    input: Type.String(),
  }),
  execute: ({ input }) => ({ input, length: input.length }),
});
```

Use una herramienta de fábrica cuando necesite devolver un `AgentToolResult` personalizado o reutilizar
una implementación `api.registerTool` existente. Use `definePluginEntry` en lugar
de `defineToolPlugin` cuando necesite herramientas totalmente dinámicas o capacidades de complemento
mixtas.

## Configuración

`configSchema` es opcional. Si lo omite, OpenClaw usa un esquema estricto de objeto vacío
y el manifiesto generado aún incluye `configSchema`.

```typescript
export default defineToolPlugin({
  id: "no-config-tools",
  name: "No Config Tools",
  description: "Adds tools that do not need configuration.",
  tools: () => [],
});
```

Cuando incluye `configSchema`, el segundo argumento `execute` se escribe a partir del
esquema:

```typescript
const configSchema = Type.Object({
  apiKey: Type.String(),
});

export default defineToolPlugin({
  id: "configured-tools",
  name: "Configured Tools",
  description: "Adds configured tools.",
  configSchema,
  tools: (tool) => [
    tool({
      name: "configured_ping",
      description: "Check whether configuration is available.",
      parameters: Type.Object({}),
      execute: (_params, config) => ({ hasKey: config.apiKey.length > 0 }),
    }),
  ],
});
```

OpenClaw lee la configuración del complemento desde la entrada del complemento en la configuración de Gateway. No
codifique secretos en el código fuente ni en ejemplos de documentación. Use configuración, variables de
entorno o SecretRefs según el modelo de seguridad del complemento.

## Metadatos generados

OpenClaw descubre los complementos instalados a partir de metadatos en frío. Debe ser capaz de leer
el manifiesto del complemento antes de importar el código de tiempo de ejecución del complemento. `defineToolPlugin`
expoone, por lo tanto, metadatos estáticos, y `openclaw plugins build` escribe esos
metadatos en el paquete.

Ejecute el generador después de cambiar el id del complemento, el nombre, la descripción, el esquema de configuración,
la activación o los nombres de las herramientas:

```bash
npm run build
openclaw plugins build --entry ./dist/index.js
```

Para un complemento de una sola herramienta, el manifiesto generado se ve así:

```json
{
  "id": "stock-quotes",
  "name": "Stock Quotes",
  "description": "Fetch stock quote snapshots.",
  "version": "0.1.0",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {}
  },
  "activation": {
    "onStartup": true
  },
  "contracts": {
    "tools": ["stock_quote"]
  }
}
```

`contracts.tools` es el contrato de descubrimiento importante. Le dice a OpenClaw qué
complemento posee cada herramienta sin cargar el tiempo de ejecución de cada complemento instalado. Si el
manifiesto está obsoleto, es posible que la herramienta falte en el descubrimiento o que se culpe al complemento equivocado
de un error de registro.

## Metadatos del paquete

Para el flujo de trabajo simple de complemento de herramienta, `openclaw plugins build` alinea
`package.json` con la entrada única de tiempo de ejecución seleccionada:

```json
{
  "type": "module",
  "files": ["dist", "openclaw.plugin.json", "README.md"],
  "dependencies": {
    "typebox": "^1.1.38"
  },
  "peerDependencies": {
    "openclaw": ">=2026.5.17"
  },
  "openclaw": {
    "extensions": ["./dist/index.js"]
  }
}
```

Use JavaScript compilado como `./dist/index.js` para paquetes instalados. Las entradas
de origen son útiles en el desarrollo del espacio de trabajo, pero los paquetes publicados no deben
depender de la carga del tiempo de ejecución de TypeScript.

## Validar en CI

Use `plugins build --check` para fallar la CI cuando los metadatos generados están obsoletos sin
reescribir archivos:

```bash
npm run build
openclaw plugins build --entry ./dist/index.js --check
openclaw plugins validate --entry ./dist/index.js
npm test
```

`plugins validate` comprueba que:

- `openclaw.plugin.json` existe y pasa el cargador de manifiestos normal.
- La entrada actual exporta metadatos `defineToolPlugin`.
- Los campos del manifiesto generado coinciden con los metadatos de la entrada.
- `contracts.tools` coincide con los nombres de las herramientas declaradas.
- `package.json` apunta `openclaw.extensions` a la entrada de tiempo de ejecución seleccionada.

## Instalar e inspeccionar localmente

Desde una copia de trabajo separada de OpenClaw o una CLI instalada, instale la ruta del paquete:

```bash
openclaw plugins install ./stock-quotes
openclaw plugins inspect stock-quotes --runtime
```

Para una prueba de humo del paquete, primero empaquételo e instale el archivo tar:

```bash
npm pack
openclaw plugins install npm-pack:./openclaw-plugin-stock-quotes-0.1.0.tgz
openclaw plugins inspect stock-quotes --runtime --json
```

Después de la instalación, inicie o reinicie el Gateway y pída al agente que use la
herramienta. Si está depurando la visibilidad de la herramienta, inspeccione el tiempo de ejecución del complemento y el
catálogo efectivo de herramientas antes de cambiar el código.

## Publicar

Publique a través de ClawHub cuando el paquete esté listo:

```bash
clawhub package publish your-org/stock-quotes --dry-run
clawhub package publish your-org/stock-quotes
```

Instale con un localizador explícito de ClawHub:

```bash
openclaw plugins install clawhub:your-org/stock-quotes
```

Las especificaciones de paquetes npm simples siguen siendo compatibles durante la transición de lanzamiento, pero ClawHub
es la superficie preferida de descubrimiento y distribución para los complementos de OpenClaw.

## Solución de problemas

### `plugin entry not found: ./dist/index.js`

El archivo de entrada seleccionado no existe. Ejecute `npm run build` y luego vuelva a ejecutar
`openclaw plugins build --entry ./dist/index.js` o
`openclaw plugins validate --entry ./dist/index.js`.

### `plugin entry does not expose defineToolPlugin metadata`

La entrada no exportó un valor creado por `defineToolPlugin`. Verifique que la
exportación predeterminada del módulo sea el resultado de `defineToolPlugin(...)`, o pase la
entrada correcta con `--entry`.

### `openclaw.plugin.json generated metadata is stale`

El manifiesto ya no coincide con los metadatos de la entrada. Ejecute:

```bash
npm run build
openclaw plugins build --entry ./dist/index.js
```

Confirme los cambios de `openclaw.plugin.json` y `package.json`.

### `package.json openclaw.extensions must include ./dist/index.js`

Los metadatos del paquete apuntan a una entrada de tiempo de ejecución diferente. Ejecute
`openclaw plugins build --entry ./dist/index.js` para que el generador alinee los
metadatos del paquete con la entrada que pretende enviar.

### `Cannot find package 'typebox'`

El complemento construido importa `typebox` en tiempo de ejecución. Mantenga `typebox` en
`dependencies`, reinstale las dependencias del paquete, reconstruya y vuelva a ejecutar la validación.

### La herramienta no aparece después de la instalación

Verifique esto en orden:

1. `openclaw plugins inspect <plugin-id> --runtime`
2. `openclaw plugins validate --root <plugin-root> --entry ./dist/index.js`
3. `openclaw.plugin.json` tiene `contracts.tools` con los nombres de herramientas esperados.
4. `package.json` tiene `openclaw.extensions: ["./dist/index.js"]`.
5. La puerta de enlace se reinició o recargó después de instalar el complemento.

## Ver también

- [Construcción de complementos](/es/plugins/building-plugins)
- [Puntos de entrada del complemento](/es/plugins/sdk-entrypoints)
- [Subrutas del SDK de complementos](/es/plugins/sdk-subpaths)
- [Manifiesto del complemento](/es/plugins/manifest)
- [CLI de complementos](/es/cli/plugins)
- [Publicación en ClawHub](/es/clawhub/publishing)
