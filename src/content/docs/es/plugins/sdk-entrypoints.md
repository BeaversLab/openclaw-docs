---
title: "Puntos de entrada del plugin"
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

<Tip>**¿Buscas un tutorial?** Consulta [Plugins de canal](/en/plugins/sdk-channel-plugins) o [Plugins de proveedor](/en/plugins/sdk-provider-plugins) para guías paso a paso.</Tip>

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

- `id` debe coincidir con tu manifiesto de `openclaw.plugin.json`.
- `kind` es para espacios exclusivos: `"memory"` o `"context-engine"`.
- `configSchema` puede ser una función para evaluación diferida.
- OpenClaw resuelve y memoriza ese esquema en el primer acceso, por lo que los constructores de esquemas costosos
  solo se ejecutan una vez.

## `defineChannelPluginEntry`

**Importar:** `openclaw/plugin-sdk/channel-core`

Envuelve `definePluginEntry` con cableado específico del canal. Llama automáticamente a
`api.registerChannel({ plugin })`, expone una costura opcional de metadatos de CLI de ayuda raíz
y condiciona `registerFull` al modo de registro.

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

- `setRuntime` se llama durante el registro para que puedas almacenar la referencia de tiempo de ejecución
  (típicamente a través de `createPluginRuntimeStore`). Se omite durante la captura
  de metadatos de la CLI.
- `registerCliMetadata` se ejecuta tanto durante `api.registrationMode === "cli-metadata"`
  como durante `api.registrationMode === "full"`.
  Úsalo como el lugar canónico para los descriptores de CLI propiedad del canal, de modo que la ayuda raíz
  permanezca sin activar mientras que el registro normal de comandos de CLI sigue siendo compatible
  con las cargas completas de complementos.
- `registerFull` solo se ejecuta cuando `api.registrationMode === "full"`. Se omite
  durante la carga de solo configuración.
- Al igual que `definePluginEntry`, `configSchema` puede ser una fábrica diferida y OpenClaw
  memoriza el esquema resuelto en el primer acceso.
- Para los comandos de CLI raíz propiedad del complemento, prefiere `api.registerCli(..., { descriptors: [...] })`
  cuando quieras que el comando permanezca cargado de forma diferida sin desaparecer del
  árbol de análisis de la CLI raíz. Para los complementos de canal, prefiere registrar esos descriptores
  desde `registerCliMetadata(...)` y mantener `registerFull(...)` enfocado solo en el trabajo de tiempo de ejecución.
- Si `registerFull(...)` también registra métodos RPC de puerta de enlace, mantenlos en un
  prefijo específico del complemento. Los espacios de nombres de administración central reservados (`config.*`,
  `exec.approvals.*`, `wizard.*`, `update.*`) siempre se fuerzan a
  `operator.admin`.

## `defineSetupPluginEntry`

**Importar:** `openclaw/plugin-sdk/channel-core`

Para el archivo `setup-entry.ts` ligero. Devuelve solo `{ plugin }` sin
conexiones de tiempo de ejecución o CLI.

```typescript
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";

export default defineSetupPluginEntry(myChannelPlugin);
```

OpenClaw carga esto en lugar de la entrada completa cuando un canal está deshabilitado,
no configurado, o cuando la carga diferida está habilitada. Consulta
[Configuración y Config](/en/plugins/sdk-setup#setup-entry) para saber cuándo importa esto.

En la práctica, combina `defineSetupPluginEntry(...)` con las familias de asistentes de configuración
estrechos:

- `openclaw/plugin-sdk/setup-runtime` para asistentes de configuración seguros para el tiempo de ejecución, como
  adaptadores de parches de configuración seguros de importación, salida de notas de búsqueda,
  `promptResolvedAllowFrom`, `splitSetupEntries`, y proxies de configuración delegados
- `openclaw/plugin-sdk/channel-setup` para superficies de configuración de instalación opcional
- `openclaw/plugin-sdk/setup-tools` para asistentes de CLI de configuración/instalación, archivos y documentación

Mantén los SDK pesados, el registro CLI y los servicios de tiempo de ejecución de larga duración en la entrada completa.

Los canales del espacio de trabajo agrupados que dividen las superficies de configuración y tiempo de ejecución pueden usar
`defineBundledChannelSetupEntry(...)` de
`openclaw/plugin-sdk/channel-entry-contract` en su lugar. Ese contrato permite que la
entrada de configuración mantenga exportaciones de complementos/seguros de configuración, mientras que todavía expone un
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

Use ese contrato agrupado solo cuando los flujos de configuración realmente necesiten un establecedor de tiempo de ejecución
ligero antes de que se cargue la entrada completa del canal.

## Modo de registro

`api.registrationMode` indica a su complemento cómo se cargó:

| Modo              | Cuándo                                                    | Qué registrar                                                                                                  |
| ----------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `"full"`          | Inicio normal de la puerta de enlace                      | Todo                                                                                                           |
| `"setup-only"`    | Canal deshabilitado/sin configurar                        | Solo registro del canal                                                                                        |
| `"setup-runtime"` | Flujo de configuración con tiempo de ejecución disponible | Registro del canal más solo el tiempo de ejecución ligero necesario antes de que se cargue la entrada completa |
| `"cli-metadata"`  | Ayuda raíz / captura de metadatos de CLI                  | Solo descriptores de CLI                                                                                       |

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

Trate `"setup-runtime"` como la ventana donde las superficies de inicio solo de configuración deben existir sin volver a entrar en el tiempo de ejecución completo del canal agrupado. Las opciones adecuadas son el registro del canal, rutas HTTP seguras para la configuración, métodos de puerta de enlace seguros para la configuración y asistentes de configuración delegados. Los servicios pesados en segundo plano, los registradores de CLI y los arranques del SDK de proveedor/cliente aún pertenecen a `"full"`.

Específicamente para los registradores de CLI:

- use `descriptors` cuando el registrador posee uno o más comandos raíz y desea que OpenClaw cargue de forma diferida el módulo CLI real en la primera invocación
- asegúrese de que esos descriptores cubran cada raíz de comando de nivel superior expuesta por el registrador
- use `commands` solo para rutas de compatibilidad ansiosa

## Formas de complementos

OpenClaw clasifica los complementos cargados según su comportamiento de registro:

| Forma                 | Descripción                                                   |
| --------------------- | ------------------------------------------------------------- |
| **capacidad simple**  | Un tipo de capacidad (por ejemplo, solo proveedor)            |
| **capacidad híbrida** | Múltiples tipos de capacidades (por ejemplo, proveedor + voz) |
| **solo enlace**       | Solo enlaces, sin capacidades                                 |
| **sin capacidad**     | Herramientas/comandos/servicios pero sin capacidades          |

Use `openclaw plugins inspect <id>` to see a plugin's shape.

## Related

- [SDK Overview](/en/plugins/sdk-overview) — registration API and subpath reference
- [Runtime Helpers](/en/plugins/sdk-runtime) — `api.runtime` and `createPluginRuntimeStore`
- [Setup and Config](/en/plugins/sdk-setup) — manifest, setup entry, deferred loading
- [Channel Plugins](/en/plugins/sdk-channel-plugins) — building the `ChannelPlugin` object
- [Provider Plugins](/en/plugins/sdk-provider-plugins) — provider registration and hooks
