---
title: "Puntos de entrada del complemento"
sidebarTitle: "Puntos de entrada"
summary: "Referencia para definePluginEntry, defineChannelPluginEntry y defineSetupPluginEntry"
read_when:
  - You need the exact type signature of definePluginEntry or defineChannelPluginEntry
  - You want to understand registration mode (full vs setup vs CLI metadata)
  - You are looking up entry point options
---

# Puntos de entrada del complemento

Cada complemento exporta un objeto de entrada predeterminado. El SDK proporciona tres asistentes para
crearlos.

Para los complementos instalados, `package.json` debe apuntar la carga en tiempo de ejecución al JavaScript
construido cuando esté disponible:

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

`extensions` y `setupEntry` siguen siendo entradas de origen válidas para el desarrollo del
código fuente del espacio de trabajo y de git. `runtimeExtensions` y `runtimeSetupEntry` son preferibles
cuando OpenClaw carga un paquete instalado y permiten a los paquetes npm evitar la compilación
en tiempo de ejecución de TypeScript. Si un paquete instalado solo declara una entrada de
origen de TypeScript, OpenClaw usará un par `dist/*.js` construido coincidente cuando exista
uno, y luego volverá al origen de TypeScript.

Todas las rutas de entrada deben permanecer dentro del directorio del paquete del complemento. Las entradas
en tiempo de ejecución y los pares de JavaScript construidos inferidos no hacen que una ruta de origen
`extensions` o `setupEntry` que se escape sea válida.

<Tip>**¿Buscas un tutorial?** Consulta [Complementos de canal](/es/plugins/sdk-channel-plugins) o [Complementos de proveedor](/es/plugins/sdk-provider-plugins) para guías paso a paso.</Tip>

## `definePluginEntry`

**Importar:** `openclaw/plugin-sdk/plugin-entry`

Para complementos de proveedor, complementos de herramientas, complementos de enlace y todo lo que **no**
sea un canal de mensajería.

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

| Campo          | Tipo                                                             | Requerido | Por defecto             |
| -------------- | ---------------------------------------------------------------- | --------- | ----------------------- |
| `id`           | `string`                                                         | Sí        | —                       |
| `name`         | `string`                                                         | Sí        | —                       |
| `description`  | `string`                                                         | Sí        | —                       |
| `kind`         | `string`                                                         | No        | —                       |
| `configSchema` | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | No        | Esquema de objeto vacío |
| `register`     | `(api: OpenClawPluginApi) => void`                               | Sí        | —                       |

- `id` debe coincidir con su manifiesto `openclaw.plugin.json`.
- `kind` es para ranuras exclusivas: `"memory"` o `"context-engine"`.
- `configSchema` puede ser una función para evaluación diferida.
- OpenClaw resuelve y memoriza ese esquema en el primer acceso, por lo que los constructores de esquemas costosos solo se ejecutan una vez.

## `defineChannelPluginEntry`

**Importar:** `openclaw/plugin-sdk/channel-core`

Envuelve `definePluginEntry` con cableado específico del canal. Llama automáticamente a `api.registerChannel({ plugin })`, expone una costura opcional de metadatos de CLI de ayuda raíz y condiciona `registerFull` al modo de registro.

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

| Campo                 | Tipo                                                             | Requerido | Predeterminado          |
| --------------------- | ---------------------------------------------------------------- | --------- | ----------------------- |
| `id`                  | `string`                                                         | Sí        | —                       |
| `name`                | `string`                                                         | Sí        | —                       |
| `description`         | `string`                                                         | Sí        | —                       |
| `plugin`              | `ChannelPlugin`                                                  | Sí        | —                       |
| `configSchema`        | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | No        | Esquema de objeto vacío |
| `setRuntime`          | `(runtime: PluginRuntime) => void`                               | No        | —                       |
| `registerCliMetadata` | `(api: OpenClawPluginApi) => void`                               | No        | —                       |
| `registerFull`        | `(api: OpenClawPluginApi) => void`                               | No        | —                       |

- `setRuntime` se llama durante el registro para que pueda almacenar la referencia de tiempo de ejecución (típicamente a través de `createPluginRuntimeStore`). Se omite durante la captura de metadatos de la CLI.
- `registerCliMetadata` se ejecuta tanto durante `api.registrationMode === "cli-metadata"` como durante `api.registrationMode === "full"`. Úselo como el lugar canónico para los descriptores de CLI propiedad del canal, de modo que la ayuda raíz permanezca sin activación mientras que el registro normal de comandos de CLI sigue siendo compatible con las cargas completas de complementos.
- `registerFull` solo se ejecuta cuando `api.registrationMode === "full"`. Se omite durante la carga solo de configuración.
- Al igual que `definePluginEntry`, `configSchema` puede ser una fábrica diferida y OpenClaw memoriza el esquema resuelto en el primer acceso.
- Para comandos CLI raíz propiedad del plugin, prefiere `api.registerCli(..., { descriptors: [...] })`
  cuando quieras que el comando se mantenga con carga diferida (lazy-loaded) sin desaparecer del
  árbol de análisis (parse tree) del CLI raíz. Para plugins de canal, prefiere registrar esos descriptores
  desde `registerCliMetadata(...)` y mantener `registerFull(...)` enfocado solo en el trabajo en tiempo de ejecución.
- Si `registerFull(...)` también registra métodos RPC de puerta de enlace (gateway), mantenlos en un
  prefijo específico del plugin. Los espacios de nombres reservados de administración del núcleo (`config.*`,
  `exec.approvals.*`, `wizard.*`, `update.*`) siempre se fuerzan a
  `operator.admin`.

## `defineSetupPluginEntry`

**Importar:** `openclaw/plugin-sdk/channel-core`

Para el archivo ligero `setup-entry.ts`. Devuelve solo `{ plugin }` sin
conexiones de tiempo de ejecución o CLI.

```typescript
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";

export default defineSetupPluginEntry(myChannelPlugin);
```

OpenClaw carga esto en lugar de la entrada completa cuando un canal está deshabilitado,
sin configurar, o cuando la carga diferida está habilitada. Consulta
[Configuración e instalación](/es/plugins/sdk-setup#setup-entry) para saber cuándo importa esto.

En la práctica, combina `defineSetupPluginEntry(...)` con las familias de ayudantes de
configuración (setup) estrechos:

- `openclaw/plugin-sdk/setup-runtime` para ayudantes de configuración seguros para el tiempo de ejecución, tales como
  adaptadores de parches de configuración seguros para la importación, salida de lookup-note,
  `promptResolvedAllowFrom`, `splitSetupEntries`, y servidores proxy de configuración delegados
- `openclaw/plugin-sdk/channel-setup` para superficies de configuración de instalación opcional
- `openclaw/plugin-sdk/setup-tools` para ayudantes de configuración/instalación de CLI/archivos/documentos

Mantén los SDK pesados, el registro de CLI y los servicios de tiempo de ejecución de larga duración en la entrada
completa.

Los canales de espacio de trabajo agrupados (bundled) que dividen las superficies de configuración y tiempo de ejecución pueden usar
`defineBundledChannelSetupEntry(...)` de
`openclaw/plugin-sdk/channel-entry-contract` en su lugar. Ese contrato permite a la
entrada de configuración mantener exportaciones de complementos (plugins)/secretos seguras para la configuración mientras aún expone un
establecedor de tiempo de ejecución:

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
});
```

Usa ese contrato agrupado solo cuando los flujos de configuración realmente necesiten un establecedor de tiempo de ejecución ligero
antes de que se cargue la entrada completa del canal.

## Modo de registro

`api.registrationMode` le dice a tu complemento cómo se cargó:

| Modo              | Cuándo                                                    | Qué registrar                                                                                               |
| ----------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `"full"`          | Inicio normal de la puerta de enlace                      | Todo                                                                                                        |
| `"setup-only"`    | Canal deshabilitado/sin configurar                        | Solo registro del canal                                                                                     |
| `"setup-runtime"` | Flujo de configuración con tiempo de ejecución disponible | Registro del canal más solo el tiempo de ejecución ligero necesario antes de que cargue la entrada completa |
| `"cli-metadata"`  | Captura de ayuda raíz / metadatos de CLI                  | Solo descriptores de CLI                                                                                    |

`defineChannelPluginEntry` maneja esta división automáticamente. Si usas
`definePluginEntry` directamente para un canal, verifica el modo tú mismo:

```typescript
register(api) {
  if (api.registrationMode === "cli-metadata" || api.registrationMode === "full") {
    api.registerCli(/* ... */);
    if (api.registrationMode === "cli-metadata") return;
  }

  api.registerChannel({ plugin: myPlugin });
  if (api.registrationMode !== "full") return;

  // Heavy runtime-only registrations
  api.registerService(/* ... */);
}
```

Trata `"setup-runtime"` como la ventana donde las superficies de inicio solo de configuración deben
existir sin volver a entrar al tiempo de ejecución completo del canal empaquetado. Buenos candidatos son
el registro del canal, rutas HTTP seguras para configuración, métodos de puerta de enlace seguros para configuración y
ayudantes de configuración delegados. Los servicios pesados en segundo plano, registradores de CLI y
arranques de SDK de proveedor/cliente aún pertenecen a `"full"`.

Específicamente para registradores de CLI:

- usa `descriptors` cuando el registrador posee uno o más comandos raíz y tú
  quieres que OpenClaw cargue de forma diferida el módulo CLI real en la primera invocación
- asegúrate de que esos descriptores cubran cada raíz de comando de nivel superior expuesta por el
  registrador
- usa `commands` solo para rutas de compatificación eager

## Formas de plugin

OpenClaw clasifica los plugins cargados por su comportamiento de registro:

| Forma                 | Descripción                                          |
| --------------------- | ---------------------------------------------------- |
| **plain-capability**  | Un tipo de capacidad (ej. solo proveedor)            |
| **hybrid-capability** | Múltiples tipos de capacidades (ej. proveedor + voz) |
| **hook-only**         | Solo hooks, sin capacidades                          |
| **non-capability**    | Herramientas/comandos/servicios pero sin capacidades |

Usa `openclaw plugins inspect <id>` para ver la forma de un plugin.

## Relacionado

- [Resumen del SDK](/es/plugins/sdk-overview) — referencia de API de registro y subrutas
- [Ayudantes de tiempo de ejecución](/es/plugins/sdk-runtime) — `api.runtime` y `createPluginRuntimeStore`
- [Configuración y configuración](/es/plugins/sdk-setup) — manifiesto, entrada de configuración, carga diferida
- [Plugins de canal](/es/plugins/sdk-channel-plugins) — construyendo el objeto `ChannelPlugin`
- [Plugins de proveedor](/es/plugins/sdk-provider-plugins) — registro de proveedor y hooks
