---
title: "Puntos de entrada del complemento"
sidebarTitle: "Puntos de entrada"
summary: "Referencia de definePluginEntry, defineChannelPluginEntry y defineSetupPluginEntry"
read_when:
  - You need the exact type signature of definePluginEntry or defineChannelPluginEntry
  - You want to understand registration mode (full vs setup vs CLI metadata)
  - You are looking up entry point options
---

# Puntos de entrada del complemento

Cada complemento exporta un objeto de entrada predeterminado. El SDK proporciona tres asistentes para
crearlos.

<Tip>**¿Buscas un tutorial?** Consulta [Complementos de canal](/en/plugins/sdk-channel-plugins) o [Complementos de proveedor](/en/plugins/sdk-provider-plugins) para obtener guías paso a paso.</Tip>

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

| Campo          | Tipo                                                             | Obligatorio | Predeterminado          |
| -------------- | ---------------------------------------------------------------- | ----------- | ----------------------- |
| `id`           | `string`                                                         | Sí          | —                       |
| `name`         | `string`                                                         | Sí          | —                       |
| `description`  | `string`                                                         | Sí          | —                       |
| `kind`         | `string`                                                         | No          | —                       |
| `configSchema` | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | No          | Esquema de objeto vacío |
| `register`     | `(api: OpenClawPluginApi) => void`                               | Sí          | —                       |

- `id` debe coincidir con tu manifiesto `openclaw.plugin.json`.
- `kind` es para ranuras exclusivas: `"memory"` o `"context-engine"`.
- `configSchema` puede ser una función para una evaluación diferida.

## `defineChannelPluginEntry`

**Importar:** `openclaw/plugin-sdk/core`

Envuelve `definePluginEntry` con cableado específico del canal. Llama automáticamente a
`api.registerChannel({ plugin })`, expone una costura opcional de metadatos de CLI de ayuda raíz
y condiciona `registerFull` al modo de registro.

```typescript
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/core";

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
| `id`                  | `string`                                                         | Sí          | —                       |
| `name`                | `string`                                                         | Sí          | —                       |
| `description`         | `string`                                                         | Sí          | —                       |
| `plugin`              | `ChannelPlugin`                                                  | Sí          | —                       |
| `configSchema`        | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | No          | Esquema de objeto vacío |
| `setRuntime`          | `(runtime: PluginRuntime) => void`                               | No          | —                       |
| `registerCliMetadata` | `(api: OpenClawPluginApi) => void`                               | No          | —                       |
| `registerFull`        | `(api: OpenClawPluginApi) => void`                               | No          | —                       |

- `setRuntime` se llama durante el registro para que puedas almacenar la referencia de tiempo de ejecución
  (típicamente a través de `createPluginRuntimeStore`). Se omite durante la captura
  de metadatos de CLI.
- `registerCliMetadata` se ejecuta tanto durante `api.registrationMode === "cli-metadata"`
  como durante `api.registrationMode === "full"`.
  Úselo como el lugar canónico para los descriptores de CLI propiedad del canal para que la ayuda raíz
  permanezca sin activar mientras que el registro normal de comandos de CLI sigue siendo compatible
  con las cargas completas de complementos.
- `registerFull` solo se ejecuta cuando `api.registrationMode === "full"`. Se omite
  durante la carga de solo configuración.
- Para comandos raíz de CLI propiedad del complemento, prefiera `api.registerCli(..., { descriptors: [...] })`
  cuando desee que el comando permanezca cargado de forma diferida sin desaparecer del
  árbol de análisis de la CLI raíz. Para los complementos de canal, prefiera registrar esos descriptores
  desde `registerCliMetadata(...)` y mantenga `registerFull(...)` enfocado únicamente en el trabajo en tiempo de ejecución.

## `defineSetupPluginEntry`

**Importar:** `openclaw/plugin-sdk/core`

Para el archivo ligero `setup-entry.ts`. Devuelve solo `{ plugin }` sin
cableado de tiempo de ejecución o CLI.

```typescript
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/core";

export default defineSetupPluginEntry(myChannelPlugin);
```

OpenClaw carga esto en lugar de la entrada completa cuando un canal está deshabilitado,
sin configurar o cuando la carga diferida está habilitada. Consulte
[Configuración y configuración](/en/plugins/sdk-setup#setup-entry) para saber cuándo es importante.

## Modo de registro

`api.registrationMode` indica a su complemento cómo se cargó:

| Modo              | Cuándo                                                    | Qué registrar                      |
| ----------------- | --------------------------------------------------------- | ---------------------------------- |
| `"full"`          | Inicio normal de la puerta de enlace                      | Todo                               |
| `"setup-only"`    | Canal deshabilitado/sin configurar                        | Solo registro de canal             |
| `"setup-runtime"` | Flujo de configuración con tiempo de ejecución disponible | Canal + tiempo de ejecución ligero |
| `"cli-metadata"`  | Ayuda raíz / captura de metadatos de CLI                  | Solo descriptores de CLI           |

`defineChannelPluginEntry` maneja esta división automáticamente. Si usa
`definePluginEntry` directamente para un canal, verifique el modo usted mismo:

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

Específicamente para registradores de CLI:

- use `descriptors` cuando el registrador posee uno o más comandos raíz y desea
  que OpenClaw cargue de forma diferida el módulo CLI real en la primera invocación
- asegúrese de que esos descriptores cubran cada raíz de comando de nivel superior expuesta por el
  registrador
- use `commands` solo para rutas de compatificación ansiosa

## Formas de complemento

OpenClaw clasifica los complementos cargados según su comportamiento de registro:

| Forma                 | Descripción                                            |
| --------------------- | ------------------------------------------------------ |
| **capacidad-simple**  | Un tipo de capacidad (p. ej., solo proveedor)          |
| **capacidad-híbrida** | Múltiples tipos de capacidad (p. ej., proveedor + voz) |
| **solo-hooks**        | Solo hooks, sin capacidades                            |
| **sin-capacidad**     | Herramientas/comandos/servicios pero sin capacidades   |

Use `openclaw plugins inspect <id>` para ver la forma de un complemento.

## Relacionado

- [Resumen del SDK](/en/plugins/sdk-overview) — referencia de la API de registro y subrutas
- [Ayudantes de tiempo de ejecución](/en/plugins/sdk-runtime) — `api.runtime` y `createPluginRuntimeStore`
- [Configuración y configuración](/en/plugins/sdk-setup) — manifiesto, entrada de configuración, carga diferida
- [Complementos de canal](/en/plugins/sdk-channel-plugins) — construcción del objeto `ChannelPlugin`
- [Complementos de proveedor](/en/plugins/sdk-provider-plugins) — registro y hooks del proveedor
