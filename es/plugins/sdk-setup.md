---
title: "Plugin Setup and Config"
sidebarTitle: "Configuración y ajustes"
summary: "Asistentes de configuración, setup-entry.ts, esquemas de configuración y metadatos de package."
read_when:
  - You are adding a setup wizard to a plugin
  - You need to understand setup-entry.ts vs index.ts
  - You are defining plugin config schemas or package.json openclaw metadata
---

# Configuración y ajustes del complemento

Referencia para el empaquetado de complementos (metadatos de `package.json`), manifiestos
(`openclaw.plugin.json`), entradas de configuración y esquemas de configuración.

<Tip>
  **¿Buscas un tutorial?** Las guías prácticas cubren el empaquetado en contexto: [Complementos de
  canal](/es/plugins/sdk-channel-plugins#step-1-package-and-manifest) y [Complementos de
  proveedor](/es/plugins/sdk-provider-plugins#step-1-package-and-manifest).
</Tip>

## Metadatos del paquete

Su `package.json` necesita un campo `openclaw` que indique al sistema de complementos qué
proporciona su complemento:

**Complemento de canal:**

```json
{
  "name": "@myorg/openclaw-my-channel",
  "version": "1.0.0",
  "type": "module",
  "openclaw": {
    "extensions": ["./index.ts"],
    "setupEntry": "./setup-entry.ts",
    "channel": {
      "id": "my-channel",
      "label": "My Channel",
      "blurb": "Short description of the channel."
    }
  }
}
```

**Complemento de proveedor:**

```json
{
  "name": "@myorg/openclaw-my-provider",
  "version": "1.0.0",
  "type": "module",
  "openclaw": {
    "extensions": ["./index.ts"],
    "providers": ["my-provider"]
  }
}
```

### Campos de `openclaw`

| Campo        | Tipo       | Descripción                                                                                   |
| ------------ | ---------- | --------------------------------------------------------------------------------------------- |
| `extensions` | `string[]` | Archivos de punto de entrada (relativos a la raíz del paquete)                                |
| `setupEntry` | `string`   | Entrada ligera solo de configuración (opcional)                                               |
| `channel`    | `object`   | Metadatos del canal: `id`, `label`, `blurb`, `selectionLabel`, `docsPath`, `order`, `aliases` |
| `providers`  | `string[]` | Identificadores de proveedor registrados por este complemento                                 |
| `install`    | `object`   | Sugerencias de instalación: `npmSpec`, `localPath`, `defaultChoice`                           |
| `startup`    | `object`   | Marcas de comportamiento de inicio                                                            |

### Carga completa diferida

Los complementos de canal pueden optar por la carga diferida con:

```json
{
  "openclaw": {
    "extensions": ["./index.ts"],
    "setupEntry": "./setup-entry.ts",
    "startup": {
      "deferConfiguredChannelFullLoadUntilAfterListen": true
    }
  }
}
```

Cuando está habilitado, OpenClaw carga solo `setupEntry` durante la fase de inicio previa a la escucha,
incluso para canales ya configurados. La entrada completa se carga después de que
la puerta de enlace comienza a escuchar.

<Warning>
  Solo habilite la carga diferida cuando su `setupEntry` registre todo lo que la puerta de enlace
  necesita antes de que comience a escuchar (registro de canal, rutas HTTP, métodos de puerta de
  enlace). Si la entrada completa posee capacidades de inicio requeridas, mantenga el comportamiento
  predeterminado.
</Warning>

## Manifiesto del complemento

Cada complemento nativo debe incluir un `openclaw.plugin.json` en la raíz del paquete.
OpenClaw lo utiliza para validar la configuración sin ejecutar el código del complemento.

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "description": "Adds My Plugin capabilities to OpenClaw",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "webhookSecret": {
        "type": "string",
        "description": "Webhook verification secret"
      }
    }
  }
}
```

Para complementos de canal, añada `kind` y `channels`:

```json
{
  "id": "my-channel",
  "kind": "channel",
  "channels": ["my-channel"],
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {}
  }
}
```

Incluso los complementos sin configuración deben incluir un esquema. Un esquema vacío es válido:

```json
{
  "id": "my-plugin",
  "configSchema": {
    "type": "object",
    "additionalProperties": false
  }
}
```

Consulte [Plugin Manifest](/es/plugins/manifest) para la referencia completa del esquema.

## Entrada de configuración

El archivo `setup-entry.ts` es una alternativa ligera a `index.ts` que
OpenClaw carga cuando solo necesita superficies de configuración (incorporación, reparación de configuración,
inspección de canales deshabilitados).

```typescript
// setup-entry.ts
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/core";
import { myChannelPlugin } from "./src/channel.js";

export default defineSetupPluginEntry(myChannelPlugin);
```

Esto evita cargar código de ejecución pesado (bibliotecas criptográficas, registros de CLI,
servicios en segundo plano) durante los flujos de configuración.

**Cuándo OpenClaw usa `setupEntry` en lugar de la entrada completa:**

- El canal está deshabilitado pero necesita superficies de configuración/incorporación
- El canal está habilitado pero no configurado
- La carga diferida está habilitada (`deferConfiguredChannelFullLoadUntilAfterListen`)

**Lo que `setupEntry` debe registrar:**

- El objeto del complemento de canal (vía `defineSetupPluginEntry`)
- Cualquier ruta HTTP requerida antes de que la puerta de enlace escuche
- Cualquier método de puerta de enlace necesario durante el inicio

**Lo que `setupEntry` NO debe incluir:**

- Registros de CLI
- Servicios en segundo plano
- Importaciones pesadas de tiempo de ejecución (criptografía, SDK)
- Métodos de puerta de enlace necesarios solo después del inicio

## Esquema de configuración

La configuración del complemento se valida contra el esquema JSON en su manifiesto. Los usuarios
configuran los complementos a través de:

```json5
{
  plugins: {
    entries: {
      "my-plugin": {
        config: {
          webhookSecret: "abc123",
        },
      },
    },
  },
}
```

Su complemento recibe esta configuración como `api.pluginConfig` durante el registro.

Para la configuración específica del canal, utilice la sección de configuración del canal en su lugar:

```json5
{
  channels: {
    "my-channel": {
      token: "bot-token",
      allowFrom: ["user1", "user2"],
    },
  },
}
```

### Construcción de esquemas de configuración de canal

Use `buildChannelConfigSchema` de `openclaw/plugin-sdk/core` para convertir un
esquema Zod en el contenedor `ChannelConfigSchema` que OpenClaw valida:

```typescript
import { z } from "zod";
import { buildChannelConfigSchema } from "openclaw/plugin-sdk/core";

const accountSchema = z.object({
  token: z.string().optional(),
  allowFrom: z.array(z.string()).optional(),
  accounts: z.object({}).catchall(z.any()).optional(),
  defaultAccount: z.string().optional(),
});

const configSchema = buildChannelConfigSchema(accountSchema);
```

## Asistentes de configuración

Los complementos de canal pueden proporcionar asistentes de configuración interactivos para `openclaw onboard`.
El asistente es un objeto `ChannelSetupWizard` en el `ChannelPlugin`:

```typescript
import type { ChannelSetupWizard } from "openclaw/plugin-sdk/channel-setup";

const setupWizard: ChannelSetupWizard = {
  channel: "my-channel",
  status: {
    configuredLabel: "Connected",
    unconfiguredLabel: "Not configured",
    resolveConfigured: ({ cfg }) => Boolean((cfg.channels as any)?.["my-channel"]?.token),
  },
  credentials: [
    {
      inputKey: "token",
      providerHint: "my-channel",
      credentialLabel: "Bot token",
      preferredEnvVar: "MY_CHANNEL_BOT_TOKEN",
      envPrompt: "Use MY_CHANNEL_BOT_TOKEN from environment?",
      keepPrompt: "Keep current token?",
      inputPrompt: "Enter your bot token:",
      inspect: ({ cfg, accountId }) => {
        const token = (cfg.channels as any)?.["my-channel"]?.token;
        return {
          accountConfigured: Boolean(token),
          hasConfiguredValue: Boolean(token),
        };
      },
    },
  ],
};
```

El tipo `ChannelSetupWizard` admite `credentials`, `textInputs`,
`dmPolicy`, `allowFrom`, `groupAccess`, `prepare`, `finalize` y más.
Vea los complementos incluidos (p. ej. `extensions/discord/src/channel.setup.ts`) para
obtener ejemplos completos.

Para los avisos de lista de permitidos de DM que solo necesitan el flujo estándar
de `note -> prompt -> parse -> merge -> patch`, prefiera los asistentes de configuración
compartidos de `openclaw/plugin-sdk/setup`: `createPromptParsedAllowFromForAccount(...)`,
`createTopLevelChannelParsedAllowFromPrompt(...)` y
`createNestedChannelParsedAllowFromPrompt(...)`.

Para los bloques de estado de configuración del canal que solo varían en etiquetas, puntuaciones y líneas adicionales opcionales,
preferir `createStandardChannelSetupStatus(...)` de
`openclaw/plugin-sdk/setup` en lugar de crear manualmente el mismo objeto `status` en
cada complemento.

Para superficies de configuración opcionales que solo deben aparecer en ciertos contextos, use
`createOptionalChannelSetupSurface` de `openclaw/plugin-sdk/channel-setup`:

```typescript
import { createOptionalChannelSetupSurface } from "openclaw/plugin-sdk/channel-setup";

const setupSurface = createOptionalChannelSetupSurface({
  channel: "my-channel",
  label: "My Channel",
  npmSpec: "@myorg/openclaw-my-channel",
  docsPath: "/channels/my-channel",
});
// Returns { setupAdapter, setupWizard }
```

## Publicación e instalación

**Complementos externos:** publíquelos en [ClawHub](/es/tools/clawhub) o npm, luego instálelos:

```bash
openclaw plugins install @myorg/openclaw-my-plugin
```

OpenClaw intenta con ClawHub primero y recurre automáticamente a npm. También puede
forzar una fuente específica:

```bash
openclaw plugins install clawhub:@myorg/openclaw-my-plugin   # ClawHub only
openclaw plugins install npm:@myorg/openclaw-my-plugin       # npm only
```

**Complementos en el repositorio:** colóquelos bajo `extensions/` y se descubrirán automáticamente
durante la compilación.

**Los usuarios pueden navegar e instalar:**

```bash
openclaw plugins search <query>
openclaw plugins install <package-name>
```

<Info>
  Para las instalaciones obtenidas de npm, `openclaw plugins install` ejecuta `npm install
  --ignore-scripts` (sin scripts de ciclo de vida). Mantenga los árboles de dependencias de
  complementos puros JS/TS y evite paquetes que requieran compilaciones `postinstall`.
</Info>

## Relacionado

- [Puntos de entrada del SDK](/es/plugins/sdk-entrypoints) -- `definePluginEntry` y `defineChannelPluginEntry`
- [Manifiesto del complemento](/es/plugins/manifest) -- referencia completa del esquema del manifiesto
- [Construcción de complementos](/es/plugins/building-plugins) -- guía de introducción paso a paso

import es from "/components/footer/es.mdx";

<es />
