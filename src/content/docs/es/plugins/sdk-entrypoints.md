---
summary: "Referencia para defineToolPlugin, definePluginEntry, defineChannelPluginEntry y defineSetupPluginEntry"
title: "Puntos de entrada del complemento"
sidebarTitle: "Puntos de entrada"
read_when:
  - You need the exact type signature of defineToolPlugin, definePluginEntry, or defineChannelPluginEntry
  - You want to understand registration mode (full vs setup vs CLI metadata)
  - You are looking up entry point options
---

Cada complemento exporta un objeto de entrada predeterminado. El SDK proporciona auxiliares para crearlos.

Para los complementos instalados, `package.json` debe apuntar la carga en tiempo de ejecución al JavaScript compilado cuando esté disponible:

```json
{
  "openclaw": {
    "extensions": ["./src/index.ts"],
    "runtimeExtensions": ["./dist/index.js"],
    "setupEntry": "./src/setup-entry.ts",
    "runtimeSetupEntry": "./dist/setup-entry.js"
  }
}
```

`extensions` y `setupEntry` siguen siendo entradas de origen válidas para el desarrollo en el espacio de trabajo y en la comprobación de git. Se prefieren `runtimeExtensions` y `runtimeSetupEntry` cuando OpenClaw carga un paquete instalado y permiten que los paquetes npm eviten la compilación de TypeScript en tiempo de ejecución. Se requieren entradas de tiempo de ejecución explícitas: `runtimeSetupEntry` requiere `setupEntry`, y faltar los artefactos `runtimeExtensions` o `runtimeSetupEntry` hace que la instalación/detección falle en lugar de volver silenciosamente al origen. Si un paquete instalado solo declara una entrada de origen TypeScript, OpenClaw usará un par `dist/*.js` compilado coincidente cuando exista uno, y luego volverá al origen TypeScript.

Todas las rutas de entrada deben permanecer dentro del directorio del paquete del complemento. Las entradas de tiempo de ejecución y los pares de JavaScript compilados inferidos no hacen que una ruta de origen `extensions` o `setupEntry` de escape sea válida.

<Tip>**¿Buscas un tutorial?** Consulta [Complementos de herramientas](/es/plugins/tool-plugins), [Complementos de canales](/es/plugins/sdk-channel-plugins) o [Complementos de proveedores](/es/plugins/sdk-provider-plugins) para obtener guías paso a paso.</Tip>

## `defineToolPlugin`

**Importar:** `openclaw/plugin-sdk/tool-plugin`

Para complementos simples que solo agregan herramientas de agente. `defineToolPlugin` mantiene el origen de creación pequeño, infiere los tipos de configuración y parámetros de herramienta a partir de esquemas TypeBox, envuelve los valores de retorno simples en el formato de resultado de herramienta de OpenClaw y expone metadatos estáticos que `openclaw plugins build` escribe en el manifiesto del complemento.

```typescript
import { Type } from "typebox";
import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";

export default defineToolPlugin({
  id: "stock-quotes",
  name: "Stock Quotes",
  description: "Fetch stock quotes.",
  configSchema: Type.Object({
    apiKey: Type.Optional(Type.String({ description: "API key." })),
  }),
  tools: (tool) => [
    tool({
      name: "quote",
      label: "Quote",
      description: "Fetch a quote.",
      parameters: Type.Object({
        symbol: Type.String({ description: "Ticker symbol." }),
      }),
      execute: async ({ symbol }, config) => ({ symbol, hasKey: Boolean(config.apiKey) }),
    }),
  ],
});
```

- `configSchema` es opcional. Cuando se omite, OpenClaw usa un esquema estricto de objeto vacío
  y el manifiesto generado todavía incluye `configSchema`.
- `execute` devuelve una cadena simple o un valor serializable en JSON. El auxiliar lo envuelve
  como un resultado de herramienta de texto con `details`.
- Los nombres de las herramientas son estáticos. `openclaw plugins build` deriva `contracts.tools`
  de las herramientas declaradas, por lo que los autores no duplican nombres manualmente.
- La carga en tiempo de ejecución se mantiene estricta. Los complementos instalados aún necesitan
  `openclaw.plugin.json` y `package.json` `openclaw.extensions`; OpenClaw no
  ejecuta el código del complemento para inferir datos faltantes del manifiesto.

## `definePluginEntry`

**Importar:** `openclaw/plugin-sdk/plugin-entry`

Para complementos de proveedor, complementos de herramientas avanzadas, complementos de enlace y cualquier cosa que
**no** sea un canal de mensajería.

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

export default definePluginEntry({
  id: "my-plugin",
  name: "My Plugin",
  description: "Short summary",
  register(api) {
    api.registerProvider({
      /* ... */
    });
    api.registerTool({
      /* ... */
    });
  },
});
```

| Campo          | Tipo                                                             | Obligatorio | Predeterminado          |
| -------------- | ---------------------------------------------------------------- | ----------- | ----------------------- |
| `id`           | `string`                                                         | Sí          | -                       |
| `name`         | `string`                                                         | Sí          | -                       |
| `description`  | `string`                                                         | Sí          | -                       |
| `kind`         | `string`                                                         | No          | -                       |
| `configSchema` | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | No          | Esquema de objeto vacío |
| `register`     | `(api: OpenClawPluginApi) => void`                               | Sí          | -                       |

- `id` debe coincidir con su manifiesto `openclaw.plugin.json`.
- `kind` es para ranuras exclusivas: `"memory"` o `"context-engine"`.
- `configSchema` puede ser una función para la evaluación diferida.
- OpenClaw resuelve y memoiza ese esquema en el primer acceso, por lo que los constructores
  de esquemas costosos solo se ejecutan una vez.

## `defineChannelPluginEntry`

**Importar:** `openclaw/plugin-sdk/channel-core`

Envuelve `definePluginEntry` con cableado específico del canal. Llama automáticamente
a `api.registerChannel({ plugin })`, expone una costura opcional de metadatos de ayuda raíz de CLI
y controla `registerFull` según el modo de registro.

```typescript
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";

export default defineChannelPluginEntry({
  id: "my-channel",
  name: "My Channel",
  description: "Short summary",
  plugin: myChannelPlugin,
  setRuntime: setMyRuntime,
  registerCliMetadata(api) {
    api.registerCli(/* ... */);
  },
  registerFull(api) {
    api.registerGatewayMethod(/* ... */);
  },
});
```

| Campo                 | Tipo                                                             | Obligatorio | Predeterminado          |
| --------------------- | ---------------------------------------------------------------- | ----------- | ----------------------- |
| `id`                  | `string`                                                         | Sí          | -                       |
| `name`                | `string`                                                         | Sí          | -                       |
| `description`         | `string`                                                         | Sí          | -                       |
| `plugin`              | `ChannelPlugin`                                                  | Sí          | -                       |
| `configSchema`        | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | No          | Esquema de objeto vacío |
| `setRuntime`          | `(runtime: PluginRuntime) => void`                               | No          | -                       |
| `registerCliMetadata` | `(api: OpenClawPluginApi) => void`                               | No          | -                       |
| `registerFull`        | `(api: OpenClawPluginApi) => void`                               | No          | -                       |

- `setRuntime` se llama durante el registro para que puedas guardar la referencia de tiempo de ejecución
  (típicamente a través de `createPluginRuntimeStore`). Se omite durante la captura
  de metadatos de la CLI.
- `registerCliMetadata` se ejecuta durante `api.registrationMode === "cli-metadata"`,
  `api.registrationMode === "discovery"` y
  `api.registrationMode === "full"`.
  Úselo como el lugar canónico para los descriptores de CLI propiedad del canal, de modo que la ayuda raíz
  permanezca sin activación, las instantáneas de descubrimiento incluyan metadatos de comandos estáticos y
  el registro normal de comandos de CLI siga siendo compatible con las cargas completas de complementos.
- El registro de descubrimiento es no activador, no libre de importaciones. OpenClaw puede
  evaluar la entrada del complemento de confianza y el módulo del complemento del canal para construir la
  instantánea, por lo que mantenga las importaciones de nivel superior libres de efectos secundarios y coloque los sockets,
  clientes, trabajadores y servicios detrás de rutas exclusivas de `"full"`.
- `registerFull` solo se ejecuta cuando `api.registrationMode === "full"`. Se omite
  durante la carga de solo configuración.
- Al igual que `definePluginEntry`, `configSchema` puede ser una fábrica diferida y OpenClaw
  memoriza el esquema resuelto en el primer acceso.
- Para los comandos raíz de la CLI propiedad del complemento, prefiera `api.registerCli(..., { descriptors: [...] })`
  cuando desee que el comando permanezca cargado de forma diferida sin desaparecer del
  árbol de análisis de la CLI raíz. Para los comandos de características de nodo emparejado, prefiera
  `api.registerNodeCliFeature(...)` para que el comando se ubique bajo `openclaw nodes`.
  Para otros comandos de complemento anidados, agregue `parentPath` y registre los comandos en
  el objeto `program` pasado al registrador; OpenClaw lo resuelve al
  comando principal antes de llamar al complemento. Para los complementos de canal, prefiera
  registrar esos descriptores desde `registerCliMetadata(...)` y mantenga
  `registerFull(...)` centrado en el trabajo solo de tiempo de ejecución.
- Si `registerFull(...)` también registra métodos RPC de puerta de enlace, manténgalos en un
  prefijo específico del complemento. Los espacios de nombres de administración central reservados (`config.*`,
  `exec.approvals.*`, `wizard.*`, `update.*`) siempre se fuerzan a
  `operator.admin`.

## `defineSetupPluginEntry`

**Importar:** `openclaw/plugin-sdk/channel-core`

Para el archivo ligero `setup-entry.ts`. Devuelve solo `{ plugin }` sin
cableado de tiempo de ejecución o CLI.

```typescript
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";

export default defineSetupPluginEntry(myChannelPlugin);
```

OpenClaw carga esto en lugar de la entrada completa cuando un canal está deshabilitado,
sin configurar o cuando la carga diferida está habilitada. Consulta
[Configuración y ajustes](/es/plugins/sdk-setup#setup-entry) para saber cuándo es importante.

En la práctica, empareje `defineSetupPluginEntry(...)` con las familias de ayudantes de configuración estrechos:

- `openclaw/plugin-sdk/setup-runtime` para ayudantes de configuración seguros para el tiempo de ejecución como
  `createSetupTranslator`, adaptadores de parches de configuración seguros para importar, salida de nota de búsqueda,
  `promptResolvedAllowFrom`, `splitSetupEntries` y proxies de configuración delegados
- `openclaw/plugin-sdk/channel-setup` para superficies de configuración de instalación opcional
- `openclaw/plugin-sdk/setup-tools` para ayudantes de configuración/instalación de CLI/archivo/documentos

Mantenga los SDK pesados, el registro de CLI y los servicios de tiempo de ejecución de larga duración en la entrada completa.

Los canales del espacio de trabajo empaquetados que dividen las superficies de configuración y tiempo de ejecución pueden usar
`defineBundledChannelSetupEntry(...)` de
`openclaw/plugin-sdk/channel-entry-contract` en su lugar. Ese contrato permite que la entrada de configuración mantenga exportaciones de complementos y secretos seguros para la configuración, exponiendo al mismo tiempo un definidor de tiempo de ejecución:

```typescript
import { defineBundledChannelSetupEntry } from "openclaw/plugin-sdk/channel-entry-contract";

export default defineBundledChannelSetupEntry({
  importMetaUrl: import.meta.url,
  plugin: {
    specifier: "./channel-plugin-api.js",
    exportName: "myChannelPlugin",
  },
  runtime: {
    specifier: "./runtime-api.js",
    exportName: "setMyChannelRuntime",
  },
  registerSetupRuntime(api) {
    api.registerHttpRoute({
      path: "/my-channel/events",
      auth: "plugin",
      handler: async (req, res) => {
        /* setup-safe route */
      },
    });
  },
});
```

Use ese contrato empaquetado solo cuando los flujos de configuración realmente necesiten un
establecedor de tiempo de ejecución ligero o una superficie de puerta de enlace segura para la configuración antes de que se cargue la entrada completa del canal.
`registerSetupRuntime` se ejecuta solo para cargas `"setup-runtime"`; manténgalo limitado a
rutas o métodos solo de configuración que deben existir antes de la activación completa diferida.

## Modo de registro

`api.registrationMode` indica a su complemento cómo se cargó:

| Modo              | Cuándo                                                    | Qué registrar                                                                                                                                       |
| ----------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"full"`          | Inicio normal de la puerta de enlace                      | Todo                                                                                                                                                |
| `"discovery"`     | Descubrimiento de capacidades de solo lectura             | Registro de canales más descriptores estáticos de CLI; el código de entrada puede cargarse, pero omitir sockets, trabajadores, clientes y servicios |
| `"setup-only"`    | Canal deshabilitado/sin configurar                        | Solo registro de canales                                                                                                                            |
| `"setup-runtime"` | Flujo de configuración con tiempo de ejecución disponible | Registro de canales más solo el tiempo de ejecución ligero necesario antes de que se cargue la entrada completa                                     |
| `"cli-metadata"`  | Captura de ayuda raíz / metadatos de CLI                  | Solo descriptores de CLI                                                                                                                            |

`defineChannelPluginEntry` maneja esta división automáticamente. Si usa
`definePluginEntry` directamente para un canal, verifique el modo usted mismo:

```typescript
register(api) {
  if (
    api.registrationMode === "cli-metadata" ||
    api.registrationMode === "discovery" ||
    api.registrationMode === "full"
  ) {
    api.registerCli(/* ... */);
    if (api.registrationMode === "cli-metadata") return;
  }

  api.registerChannel({ plugin: myPlugin });
  if (api.registrationMode !== "full") return;

  // Heavy runtime-only registrations
  api.registerService(/* ... */);
}
```

El modo de descubrimiento crea una instantánea de registro no activante. Aún puede evaluar la entrada del complemento y el objeto del complemento del canal para que OpenClaw pueda registrar capacidades del canal y descriptores CLI estáticos. Trate la evaluación de módulos en el descubrimiento como confiable pero ligera: sin clientes de red, subprocesos, escuchas, conexiones de base de datos, trabajadores en segundo plano, lecturas de credenciales u otros efectos secundarios de tiempo de ejecución en vivo en el nivel superior.

Trate `"setup-runtime"` como la ventana donde las superficies de inicio solo de configuración deben
existir sin volver a entrar en el tiempo de ejecución completo del canal empaquetado. Las opciones adecuadas son
el registro del canal, rutas HTTP seguras para la configuración, métodos de puerta de enlace seguros para la configuración y
ayudantes de configuración delegados. Los servicios pesados en segundo plano, registradores de CLI y
arranques de SDK de proveedor/cliente aún pertenecen a `"full"`.

Específicamente para los registradores de CLI:

- use `descriptors` cuando el registrador posea uno o más comandos raíz y usted
  quiera que OpenClaw cargue de forma diferida el módulo real de CLI en la primera invocación
- asegúrate de que esos descriptores cubran cada raíz de comando de nivel superior
  expuesta por el registrador
- mantén los nombres de los comandos del descriptor en letras, números, guiones y
  guiones bajos, comenzando con una letra o un número; OpenClaw rechaza los nombres
  de descriptores fuera de esa forma y elimina las secuencias de control de
  terminal de las descripciones antes de renderizar la ayuda
- use `commands` solo para rutas de compatibilidad anticipada

## Formas de complementos (Plugin shapes)

OpenClaw clasifica los complementos cargados por su comportamiento de registro:

| Forma                 | Descripción                                          |
| --------------------- | ---------------------------------------------------- |
| **plain-capability**  | Un tipo de capacidad (ej. solo proveedor)            |
| **hybrid-capability** | Múltiples tipos de capacidades (ej. proveedor + voz) |
| **hook-only**         | Solo hooks, sin capacidades                          |
| **non-capability**    | Herramientas/comandos/servicios pero sin capacidades |

Use `openclaw plugins inspect <id>` para ver la forma de un complemento.

## Relacionado

- [Descripción general del SDK](/es/plugins/sdk-overview) - referencia de API de registro y subruta
- [Auxiliares de tiempo de ejecución](/es/plugins/sdk-runtime) - `api.runtime` y `createPluginRuntimeStore`
- [Configuración y ajustes](/es/plugins/sdk-setup) - manifiesto, entrada de configuración, carga diferida
- [Complementos de canal](/es/plugins/sdk-channel-plugins) - construir el objeto `ChannelPlugin`
- [Complementos de proveedor](/es/plugins/sdk-provider-plugins) - registro de proveedor y ganchos
