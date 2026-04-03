---
title: "Configuración y configuración del complemento"
sidebarTitle: "Configuración"
summary: "Asistentes de configuración, setup-entry.ts, esquemas de configuración y metadatos de package."
read_when:
  - You are adding a setup wizard to a plugin
  - You need to understand setup-entry.ts vs index.ts
  - You are defining plugin config schemas or package.json openclaw metadata
---

# Configuración y ajustes del complemento

Referencia para el empaquetado de complementos (metadatos de `package.json`), manifiestos
(`openclaw.plugin.json`), entradas de configuración y esquemas de configuración.

<Tip>**¿Buscas un tutorial?** Las guías prácticas cubren el empaquetado en contexto: [Complementos de canal](/en/plugins/sdk-channel-plugins#step-1-package-and-manifest) y [Complementos de proveedor](/en/plugins/sdk-provider-plugins#step-1-package-and-manifest).</Tip>

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

**Complemento de proveedor / línea base de publicación en ClawHub:**

```json openclaw-clawhub-package.json
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

Si publica el complemento externamente en ClawHub, esos campos `compat` y `build`
son obligatorios. Los fragmentos de publicación canónicos se encuentran en
`docs/snippets/plugin-publish/`.

### Campos de `openclaw`

| Campo        | Tipo       | Descripción                                                                                   |
| ------------ | ---------- | --------------------------------------------------------------------------------------------- |
| `extensions` | `string[]` | Archivos de punto de entrada (relativos a la raíz del paquete)                                |
| `setupEntry` | `string`   | Entrada ligera solo de configuración (opcional)                                               |
| `channel`    | `object`   | Metadatos del canal: `id`, `label`, `blurb`, `selectionLabel`, `docsPath`, `order`, `aliases` |
| `providers`  | `string[]` | IDs de proveedor registrados por este complemento                                             |
| `install`    | `object`   | Sugerencias de instalación: `npmSpec`, `localPath`, `defaultChoice`                           |
| `startup`    | `object`   | Marcas de comportamiento de inicio                                                            |

### Carga completa diferida

Los complementos de canal pueden optar por una carga diferida con:

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

Cuando está habilitado, OpenClaw carga solo `setupEntry` durante la fase de inicio previa a la escucha, incluso para los canales ya configurados. La entrada completa se carga después de que el gateway comienza a escuchar.

<Warning>Habilite la carga diferida solo cuando su `setupEntry` registre todo lo que el gateway necesita antes de comenzar a escuchar (registro de canales, rutas HTTP, métodos de gateway). Si la entrada completa posee capacidades de inicio necesarias, mantenga el comportamiento predeterminado.</Warning>

## Manifiesto del complemento

Cada complemento nativo debe incluir un `openclaw.plugin.json` en la raíz del paquete.
OpenClaw lo usa para validar la configuración sin ejecutar el código del complemento.

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

Para los complementos de canal, agregue `kind` y `channels`:

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

Consulte [Plugin Manifest](/en/plugins/manifest) para obtener la referencia completa del esquema.

## Publicación en ClawHub

Para los paquetes de complementos, use el comando específico de ClawHub para paquetes:

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
```

El alias de publicación heredado solo para habilidades es para habilidades. Los paquetes de complementos siempre deben usar `clawhub package publish`.

## Entrada de configuración

El archivo `setup-entry.ts` es una alternativa ligera a `index.ts` que OpenClaw carga cuando solo necesita superficies de configuración (incorporación, reparación de configuración, inspección de canales deshabilitados).

```typescript
// setup-entry.ts
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/core";
import { myChannelPlugin } from "./src/channel.js";

export default defineSetupPluginEntry(myChannelPlugin);
```

Esto evita cargar código de tiempo de ejecución pesado (bibliotecas criptográficas, registros de CLI, servicios en segundo plano) durante los flujos de configuración.

**Cuando OpenClaw usa `setupEntry` en lugar de la entrada completa:**

- El canal está deshabilitado pero necesita superficies de configuración/incorporación
- El canal está habilitado pero no configurado
- La carga diferida está habilitada (`deferConfiguredChannelFullLoadUntilAfterListen`)

**Lo que `setupEntry` debe registrar:**

- El objeto del complemento de canal (vía `defineSetupPluginEntry`)
- Cualquier ruta HTTP necesaria antes de que el gateway escuche
- Cualquier método de gateway necesario durante el inicio

**Lo que `setupEntry` NO debe incluir:**

- Registros de CLI
- Servicios en segundo plano
- Importaciones pesadas de tiempo de ejecución (criptografía, SDK)
- Métodos de gateway necesarios solo después del inicio

## Esquema de configuración

La configuración del complemento se valida contra el esquema JSON en su manifiesto. Los usuarios configuran los complementos a través de:

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

Para una configuración específica del canal, utilice la sección de configuración del canal en su lugar:

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

### Creación de esquemas de configuración de canales

Use `buildChannelConfigSchema` de `openclaw/plugin-sdk/core` para convertir un
esquema Zod en el envoltorio `ChannelConfigSchema` que OpenClaw valida:

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
Consulte los paquetes de complementos incluidos (por ejemplo, el complemento de Discord `src/channel.setup.ts`) para
obtener ejemplos completos.

Para los avisos de lista de permitidos de MD que solo necesitan el flujo estándar
de `note -> prompt -> parse -> merge -> patch`, prefiera los asistentes de configuración
compartidos de `openclaw/plugin-sdk/setup`: `createPromptParsedAllowFromForAccount(...)`,
`createTopLevelChannelParsedAllowFromPrompt(...)` y
`createNestedChannelParsedAllowFromPrompt(...)`.

Para los bloques de estado de configuración del canal que solo varían en etiquetas, puntuaciones y líneas
opcionales adicionales, prefiera `createStandardChannelSetupStatus(...)` de
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

**Complementos externos:** publíquelos en [ClawHub](/en/tools/clawhub) o npm, luego instálelos:

```bash
openclaw plugins install @myorg/openclaw-my-plugin
```

OpenClaw intenta con ClawHub primero y recurre automáticamente a npm. También puede
forzar una fuente específica:

```bash
openclaw plugins install clawhub:@myorg/openclaw-my-plugin   # ClawHub only
openclaw plugins install npm:@myorg/openclaw-my-plugin       # npm only
```

**Complementos en el repositorio:** colóquelos debajo del árbol del espacio de trabajo del complemento incluido y se descubren automáticamente
durante la compilación.

**Los usuarios pueden navegar e instalar:**

```bash
openclaw plugins search <query>
openclaw plugins install <package-name>
```

<Info>Para instalaciones desde npm, `openclaw plugins install` ejecuta `npm install --ignore-scripts` (sin scripts de ciclo de vida). Mantenga los árboles de dependencias del plugin puros JS/TS y evite paquetes que requieran `postinstall`.</Info>

## Relacionado

- [Puntos de entrada del SDK](/en/plugins/sdk-entrypoints) -- `definePluginEntry` y `defineChannelPluginEntry`
- [Manifiesto de plugin](/en/plugins/manifest) -- referencia completa del esquema del manifiesto
- [Construcción de plugins](/en/plugins/building-plugins) -- guía de introducción paso a paso
