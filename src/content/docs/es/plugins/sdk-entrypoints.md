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

<Tip>**¿Buscas un tutorial?** Consulta [Complementos de canal](/en/plugins/sdk-channel-plugins) o [Complementos de proveedor](/en/plugins/sdk-provider-plugins) para guías paso a paso.</Tip>

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
- OpenClaw resuelve y memoriza ese esquema en el primer acceso, por lo que los constructores de esquemas costosos
  solo se ejecutan una vez.

## `defineChannelPluginEntry`

**Importar:** `openclaw/plugin-sdk/channel-core`

Envuelve `definePluginEntry` con cableado específico del canal. Llama automáticamente a
`api.registerChannel({ plugin })`, expone una costura opcional de metadatos de CLI de ayuda raíz
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
  de metadatos de CLI.
- `registerCliMetadata` se ejecuta tanto durante `api.registrationMode === "cli-metadata"`
  como durante `api.registrationMode === "full"`.
  Úsalo como el lugar canónico para los descriptores de CLI propiedad del canal para que la ayuda raíz
  permanezca sin activar mientras que el registro normal de comandos de CLI sigue siendo compatible
  con cargas completas de complementos.
- `registerFull` solo se ejecuta cuando `api.registrationMode === "full"`. Se omite
  durante la carga solo de configuración.
- Al igual que `definePluginEntry`, `configSchema` puede ser una fábrica diferida y OpenClaw
  memoriza el esquema resuelto en el primer acceso.
- Para comandos CLI raíz propiedad del complemento, prefiere `api.registerCli(..., { descriptors: [...] })`
  cuando quieras que el comando se mantenga con carga diferida (lazy-loaded) sin desaparecer del
  árbol de análisis CLI raíz. Para complementos de canal, prefiere registrar esos descriptores
  desde `registerCliMetadata(...)` y mantener `registerFull(...)` enfocado solo en el trabajo en tiempo de ejecución.
- Si `registerFull(...)` también registra métodos RPC de puerta de enlace, manténlos en un
  prefijo específico del complemento. Los espacios de nombres reservados de administración central (`config.*`,
  `exec.approvals.*`, `wizard.*`, `update.*`) siempre se fuerzan a
  `operator.admin`.

## `defineSetupPluginEntry`

**Importar:** `openclaw/plugin-sdk/channel-core`

Para el archivo `setup-entry.ts` liviano. Devuelve solo `{ plugin }` sin
cableado de tiempo de ejecución o CLI.

```typescript
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";

export default defineSetupPluginEntry(myChannelPlugin);
```

OpenClaw carga esto en lugar de la entrada completa cuando un canal está deshabilitado,
sin configurar o cuando la carga diferida está habilitada. Consulta
[Configuración e instalación](/en/plugins/sdk-setup#setup-entry) para saber cuándo es importante.

En la práctica, combina `defineSetupPluginEntry(...)` con las familias de asistentes de configuración estrechos:

- `openclaw/plugin-sdk/setup-runtime` para asistentes de configuración seguros en tiempo de ejecución, como
  adaptadores de parches de configuración seguros de importación, salida de nota de búsqueda,
  `promptResolvedAllowFrom`, `splitSetupEntries` y proxies de configuración delegados
- `openclaw/plugin-sdk/channel-setup` para superficies de configuración de instalación opcional
- `openclaw/plugin-sdk/setup-tools` para asistentes de configuración/instalación CLI/archive/docs

Mantén los SDK pesados, el registro CLI y los servicios de tiempo de ejecución de larga duración en la entrada completa.

## Modo de registro

`api.registrationMode` le indica a tu complemento cómo se cargó:

| Modo              | Cuándo                                                    | Qué registrar                                                                                                 |
| ----------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `"full"`          | Inicio normal de la puerta de enlace                      | Todo                                                                                                          |
| `"setup-only"`    | Canal deshabilitado/sin configurar                        | Solo registro de canal                                                                                        |
| `"setup-runtime"` | Flujo de configuración con tiempo de ejecución disponible | Registro de canal más solo el tiempo de ejecución ligero necesario antes de que se cargue la entrada completa |
| `"cli-metadata"`  | Ayuda raíz / captura de metadatos CLI                     | Solo descriptores CLI                                                                                         |

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

Trate `"setup-runtime"` como la ventana donde las superficies de inicio exclusivas de configuración deben
existir sin volver a entrar en el tiempo de ejecución del canal completo empaquetado. Las opciones adecuadas son
el registro del canal, rutas HTTP seguras para la configuración, métodos de gateway seguros para la configuración y
ayudantes de configuración delegados. Los servicios pesados en segundo plano, registradores de CLI y
arranques de SDK de proveedor/cliente aún pertenecen a `"full"`.

Específicamente para los registradores de CLI:

- use `descriptors` cuando el registrador posee uno o más comandos raíz y usted
  quiere que OpenClaw cargue de manera diferida el módulo CLI real en la primera invocación
- asegúrese de que esos descriptores cubran cada raíz de comando de nivel superior expuesta por el
  registrador
- use `commands` solo para rutas de compatibilidad eager

## Formas de complemento

OpenClaw clasifica los complementos cargados por su comportamiento de registro:

| Forma                 | Descripción                                              |
| --------------------- | -------------------------------------------------------- |
| **plain-capability**  | Un tipo de capacidad (p. ej., solo proveedor)            |
| **hybrid-capability** | Múltiples tipos de capacidades (p. ej., proveedor + voz) |
| **hook-only**         | Solo ganchos, sin capacidades                            |
| **non-capability**    | Herramientas/comandos/servicios pero sin capacidades     |

Use `openclaw plugins inspect <id>` para ver la forma de un complemento.

## Relacionado

- [Resumen del SDK](/en/plugins/sdk-overview) — referencia de API de registro y subrutas
- [Ayudantes de tiempo de ejecución](/en/plugins/sdk-runtime) — `api.runtime` y `createPluginRuntimeStore`
- [Configuración y configuración](/en/plugins/sdk-setup) — manifiesto, entrada de configuración, carga diferida
- [Complementos de canal](/en/plugins/sdk-channel-plugins) — construyendo el objeto `ChannelPlugin`
- [Complementos de proveedor](/en/plugins/sdk-provider-plugins) — registro de proveedor y ganchos
