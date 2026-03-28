---
title: "Puntos de entrada del complemento"
sidebarTitle: "Puntos de entrada"
summary: "Referencia de definePluginEntry, defineChannelPluginEntry y defineSetupPluginEntry"
read_when:
  - You need the exact type signature of definePluginEntry or defineChannelPluginEntry
  - You want to understand registration mode (full vs setup)
  - You are looking up entry point options
---

# Puntos de entrada del complemento

Cada complemento exporta un objeto de entrada predeterminado. El SDK proporciona tres asistentes para
crearlos.

<Tip>**¿Buscas un tutorial?** Consulta [Complementos de canal](/es/plugins/sdk-channel-plugins) o [Complementos de proveedor](/es/plugins/sdk-provider-plugins) para obtener guías paso a paso.</Tip>

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

Envuelve `definePluginEntry` con el cableado específico del canal. Llama automáticamente
a `api.registerChannel({ plugin })` y condiciona `registerFull` en el modo de registro.

```typescript
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/core";

export default defineChannelPluginEntry({
  id: "my-channel",
  name: "My Channel",
  description: "Short summary",
  plugin: myChannelPlugin,
  setRuntime: setMyRuntime,
  registerFull(api) {
    api.registerCli(/* ... */);
    api.registerGatewayMethod(/* ... */);
  },
});
```

| Campo          | Tipo                                                             | Obligatorio | Predeterminado          |
| -------------- | ---------------------------------------------------------------- | ----------- | ----------------------- |
| `id`           | `string`                                                         | Sí          | —                       |
| `name`         | `string`                                                         | Sí          | —                       |
| `description`  | `string`                                                         | Sí          | —                       |
| `plugin`       | `ChannelPlugin`                                                  | Sí          | —                       |
| `configSchema` | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | No          | Esquema de objeto vacío |
| `setRuntime`   | `(runtime: PluginRuntime) => void`                               | No          | —                       |
| `registerFull` | `(api: OpenClawPluginApi) => void`                               | No          | —                       |

- `setRuntime` se llama durante el registro para que puedas almacenar la referencia del tiempo de ejecución
  (típicamente a través de `createPluginRuntimeStore`).
- `registerFull` solo se ejecuta cuando `api.registrationMode === "full"`. Se omite
  durante la carga de solo configuración.

## `defineSetupPluginEntry`

**Importar:** `openclaw/plugin-sdk/core`

Para el archivo `setup-entry.ts` ligero. Devuelve solo `{ plugin }` sin
conexión de tiempo de ejecución o CLI.

```typescript
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/core";

export default defineSetupPluginEntry(myChannelPlugin);
```

OpenClaw carga esto en lugar de la entrada completa cuando un canal está deshabilitado,
sin configurar, o cuando la carga diferida está habilitada. Consulte
[Configuración y ajustes](/es/plugins/sdk-setup#setup-entry) para saber cuándo importa esto.

## Modo de registro

`api.registrationMode` le dice a su complemento cómo se cargó:

| Modo              | Cuándo                                                    | Qué registrar                      |
| ----------------- | --------------------------------------------------------- | ---------------------------------- |
| `"full"`          | Inicio normal de la puerta de enlace                      | Todo                               |
| `"setup-only"`    | Canal deshabilitado/sin configurar                        | Solo registro de canal             |
| `"setup-runtime"` | Flujo de configuración con tiempo de ejecución disponible | Canal + tiempo de ejecución ligero |

`defineChannelPluginEntry` maneja esta división automáticamente. Si usa
`definePluginEntry` directamente para un canal, verifique el modo usted mismo:

```typescript
register(api) {
  api.registerChannel({ plugin: myPlugin });
  if (api.registrationMode !== "full") return;

  // Heavy runtime-only registrations
  api.registerCli(/* ... */);
  api.registerService(/* ... */);
}
```

## Formas de complemento

OpenClaw clasifica los complementos cargados por su comportamiento de registro:

| Forma                 | Descripción                                                   |
| --------------------- | ------------------------------------------------------------- |
| **plain-capability**  | Un tipo de capacidad (por ejemplo, solo proveedor)            |
| **hybrid-capability** | Múltiples tipos de capacidades (por ejemplo, proveedor + voz) |
| **hook-only**         | Solo hooks, sin capacidades                                   |
| **non-capability**    | Herramientas/comandos/servicios pero sin capacidades          |

Use `openclaw plugins inspect <id>` para ver la forma de un complemento.

## Relacionado

- [Resumen del SDK](/es/plugins/sdk-overview) — referencia de la API de registro y subrutas
- [Ayudantes de tiempo de ejecución](/es/plugins/sdk-runtime) — `api.runtime` y `createPluginRuntimeStore`
- [Configuración y ajustes](/es/plugins/sdk-setup) — manifiesto, entrada de configuración, carga diferida
- [Channel Plugins](/es/plugins/sdk-channel-plugins) — construir el objeto `ChannelPlugin`
- [Provider Plugins](/es/plugins/sdk-provider-plugins) — registro de proveedores y hooks
