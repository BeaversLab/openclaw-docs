---
summary: "Referencia de definePluginEntry, defineChannelPluginEntry y defineSetupPluginEntry"
title: "Puntos de entrada del complemento"
sidebarTitle: "Puntos de entrada"
read_when:
  - You need the exact type signature of definePluginEntry or defineChannelPluginEntry
  - You want to understand registration mode (full vs setup vs CLI metadata)
  - You are looking up entry point options
---

Cada complemento exporta un objeto de entrada predeterminado. El SDK proporciona tres funciones auxiliares para crearlos.

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

`extensions` y `setupEntry` siguen siendo entradas de origen válidas para el desarrollo de espacios de trabajo y descargas de git. `runtimeExtensions` y `runtimeSetupEntry` son preferibles cuando OpenClaw carga un paquete instalado y permiten que los paquetes npm eviten la compilación de TypeScript en tiempo de ejecución. Si un paquete instalado solo declara una entrada de origen de TypeScript, OpenClaw usará un par `dist/*.js` compilado coincidente cuando exista uno, y luego volverá al origen de TypeScript.

Todas las rutas de entrada deben permanecer dentro del directorio del paquete del complemento. Las entradas en tiempo de ejecución y los pares de JavaScript compilados inferidos no hacen que una ruta de origen `extensions` o `setupEntry` de escape sea válida.

<Tip>**¿Buscas un tutorial?** Consulta [Complementos de canal](/es/plugins/sdk-channel-plugins) o [Complementos de proveedor](/es/plugins/sdk-provider-plugins) para guías paso a paso.</Tip>

## `definePluginEntry`

**Importar:** `openclaw/plugin-sdk/plugin-entry`

Para complementos de proveedor, complementos de herramienta, complementos de enlace y todo lo que **no** sea
un canal de mensajería.

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

| Campo          | Tipo                                                             | Requerido | Predeterminado          |
| -------------- | ---------------------------------------------------------------- | --------- | ----------------------- |
| `id`           | `string`                                                         | Sí        | —                       |
| `name`         | `string`                                                         | Sí        | —                       |
| `description`  | `string`                                                         | Sí        | —                       |
| `kind`         | `string`                                                         | No        | —                       |
| `configSchema` | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | No        | Esquema de objeto vacío |
| `register`     | `(api: OpenClawPluginApi) => void`                               | Sí        | —                       |

- `id` debe coincidir con su manifiesto `openclaw.plugin.json`.
- `kind` es para ranuras exclusivas: `"memory"` o `"context-engine"`.
- `configSchema` puede ser una función para la evaluación diferida.
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

- `setRuntime` se llama durante el registro para que puedas almacenar la referencia de tiempo de ejecución (típicamente a través de `createPluginRuntimeStore`). Se omite durante la captura de metadatos de la CLI.
- `registerCliMetadata` se ejecuta durante `api.registrationMode === "cli-metadata"`, `api.registrationMode === "discovery"` y `api.registrationMode === "full"`. Úselo como el lugar canónico para los descriptores de CLI propiedad del canal para que la ayuda raíz permanezca sin activación, las instantáneas de descubrimiento incluyan metadatos de comandos estáticos y el registro normal de comandos de CLI siga siendo compatible con las cargas completas de complementos.
- El registro de descubrimiento no es de activación, no libre de importaciones. OpenClaw puede evaluar la entrada del complemento de confianza y el módulo del complemento del canal para construir la instantánea, por lo que debe mantener las importaciones de nivel superior libres de efectos secundarios y colocar los sockets, clientes, trabajadores y servicios detrás de rutas exclusivas de `"full"`.
- `registerFull` solo se ejecuta cuando `api.registrationMode === "full"`. Se omite
  durante la carga solo de configuración.
- Al igual que `definePluginEntry`, `configSchema` puede ser una fábrica diferida y OpenClaw
  memoiza el esquema resuelto en el primer acceso.
- Para comandos CLI raíz propiedad del complemento, prefiera `api.registerCli(..., { descriptors: [...] })`
  cuando desee que el comando permanezca cargado de forma diferida sin desaparecer del
  árbol de análisis CLI raíz. Para complementos de canal, prefiera registrar esos descriptores
  desde `registerCliMetadata(...)` y mantenga `registerFull(...)` centrado solo en el trabajo en tiempo de ejecución.
- Si `registerFull(...)` también registra métodos RPC de puerta de enlace, manténgalos en un
  prefijo específico del complemento. Los espacios de nombres de administración principal reservados (`config.*`,
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
sin configurar, o cuando la carga diferida está habilitada. Vea
[Setup and Config](/es/plugins/sdk-setup#setup-entry) para saber cuándo esto importa.

En la práctica, combine `defineSetupPluginEntry(...)` con las familias de ayudantes de configuración estrechos:

- `openclaw/plugin-sdk/setup-runtime` para ayudantes de configuración seguros para el tiempo de ejecución, como
  adaptadores de parches de configuración seguros de importación, salida de nota de búsqueda,
  `promptResolvedAllowFrom`, `splitSetupEntries` y proxies de configuración delegados
- `openclaw/plugin-sdk/channel-setup` para superficies de configuración de instalación opcional
- `openclaw/plugin-sdk/setup-tools` para ayudantes de configuración/instalación CLI/archivo/documentos

Mantén los SDK pesados, el registro de CLI y los servicios de tiempo de ejecución de larga duración en la entrada
completa.

Los canales de espacio de trabajo empaquetados que dividen las superficies de configuración y tiempo de ejecución pueden usar
`defineBundledChannelSetupEntry(...)` de
`openclaw/plugin-sdk/channel-entry-contract` en su lugar. Ese contrato permite a la
entrada de configuración mantener exportaciones de complementos/secrets seguros para la configuración mientras aún expone un
definidor de tiempo de ejecución:

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

`api.registrationMode` le dice a su complemento cómo se cargó:

| Modo              | Cuándo                                                    | Qué registrar                                                                                                                                     |
| ----------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"full"`          | Inicio normal de la puerta de enlace                      | Todo                                                                                                                                              |
| `"discovery"`     | Descubrimiento de capacidades de solo lectura             | Registro de canal más descriptores estáticos de CLI; el código de entrada puede cargarse, pero omitir sockets, trabajadores, clientes y servicios |
| `"setup-only"`    | Canal deshabilitado/no configurado                        | Solo registro de canal                                                                                                                            |
| `"setup-runtime"` | Flujo de configuración con tiempo de ejecución disponible | Registro de canal más solo el tiempo de ejecución ligero necesario antes de que se cargue la entrada completa                                     |
| `"cli-metadata"`  | Ayuda raíz / captura de metadatos de CLI                  | Solo descriptores de CLI                                                                                                                          |

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

El modo de descubrimiento crea una instantánea del registro sin activación. Aún puede evaluar
la entrada del complemento y el objeto del complemento del canal para que OpenClaw pueda registrar las capacidades del canal
y los descriptores estáticos de CLI. Trate la evaluación del módulo en el descubrimiento como
confiable pero ligera: sin clientes de red, subprocesos, escuchas, conexiones de base
datos, trabajadores en segundo plano, lecturas de credenciales u otros efectos secundarios del tiempo de ejecución
en vivo en el nivel superior.

Trate `"setup-runtime"` como la ventana donde las superficies de inicio de solo configuración deben
existir sin volver a ingresar el tiempo de ejecución del canal empaquetado completo. Los ajustes adecuados son
el registro del canal, rutas HTTP seguras para la configuración, métodos de puerta de enlace seguros para la configuración y
ayudantes de configuración delegados. Los servicios pesados en segundo plano, registradores de CLI y
arranques de SDK de proveedor/cliente aún pertenecen a `"full"`.

Específicamente para los registradores de CLI:

- use `descriptors` cuando el registrador posee uno o más comandos raíz y usted
  quiere que OpenClaw cargue de forma diferida el módulo CLI real en la primera invocación
- asegúrese de que esos descriptores cubran cada raíz de comando de nivel superior expuesta por el
  registrador
- mantenga los nombres de los comandos del descriptor en letras, números, guion y guion bajo,
  comenzando con una letra o número; OpenClaw rechaza los nombres de descriptores fuera
  de esa forma y elimina las secuencias de control de terminal de las descripciones antes
  de renderizar la ayuda
- use `commands` solo solo para rutas de compatibilidad eager

## Formas de complementos

OpenClaw clasifica los complementos cargados por su comportamiento de registro:

| Forma                 | Descripción                                          |
| --------------------- | ---------------------------------------------------- |
| **plain-capability**  | Un tipo de capacidad (por ejemplo, solo proveedor)   |
| **hybrid-capability** | Múltiples tipos de capacidades (ej. proveedor + voz) |
| **solo-hooks**        | Solo hooks, sin capacidades                          |
| **sin-capacidad**     | Herramientas/comandos/servicios pero sin capacidades |

Usa `openclaw plugins inspect <id>` para ver la forma de un plugin.

## Relacionado

- [Resumen del SDK](/es/plugins/sdk-overview) — referencia de la API de registro y subrutas
- [Ayudantes de tiempo de ejecución](/es/plugins/sdk-runtime) — `api.runtime` y `createPluginRuntimeStore`
- [Configuración y ajustes](/es/plugins/sdk-setup) — manifiesto, entrada de configuración, carga diferida
- [Plugins de canal](/es/plugins/sdk-channel-plugins) — construir el objeto `ChannelPlugin`
- [Plugins de proveedor](/es/plugins/sdk-provider-plugins) — registro de proveedor y hooks
