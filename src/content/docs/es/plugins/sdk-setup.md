---
title: "Configuración y complementos"
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

<Tip>**¿Buscas un tutorial?** Las guías prácticas cubren el empaquetado en contexto: [Complementos de canal](/es/plugins/sdk-channel-plugins#step-1-package-and-manifest) y [Complementos de proveedor](/es/plugins/sdk-provider-plugins#step-1-package-and-manifest).</Tip>

## Metadatos del paquete

Tu `package.json` necesita un campo `openclaw` que indique al sistema de complementos qué
proporciona tu complemento:

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

Si publicas el complemento externamente en ClawHub, esos campos `compat` y `build`
son obligatorios. Los fragmentos de publicación canónicos residen en
`docs/snippets/plugin-publish/`.

### Campos de `openclaw`

| Campo        | Tipo       | Descripción                                                                                                         |
| ------------ | ---------- | ------------------------------------------------------------------------------------------------------------------- |
| `extensions` | `string[]` | Archivos de punto de entrada (relativos a la raíz del paquete)                                                      |
| `setupEntry` | `string`   | Entrada ligera solo de configuración (opcional)                                                                     |
| `channel`    | `object`   | Metadatos del catálogo de canales para las superficies de configuración, selector, inicio rápido y estado           |
| `providers`  | `string[]` | IDs de proveedor registrados por este complemento                                                                   |
| `install`    | `object`   | Sugerencias de instalación: `npmSpec`, `localPath`, `defaultChoice`, `minHostVersion`, `allowInvalidConfigRecovery` |
| `startup`    | `object`   | Marcas de comportamiento de inicio                                                                                  |

### `openclaw.channel`

`openclaw.channel` son metadatos de paquete ligeros para el descubrimiento de canales y las superficies de configuración
antes de la carga en tiempo de ejecución.

| Campo                                  | Tipo       | Significado                                                                                                             |
| -------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| `id`                                   | `string`   | ID canónico del canal.                                                                                                  |
| `label`                                | `string`   | Etiqueta principal del canal.                                                                                           |
| `selectionLabel`                       | `string`   | Etiqueta de selector/configuración cuando deba diferir de `label`.                                                      |
| `detailLabel`                          | `string`   | Etiqueta de detalle secundaria para catálogos de canales más ricos y superficies de estado.                             |
| `docsPath`                             | `string`   | Ruta de documentos para enlaces de configuración y selección.                                                           |
| `docsLabel`                            | `string`   | Sobrescribir etiqueta utilizada para enlaces de documentos cuando deba diferir del id del canal.                        |
| `blurb`                                | `string`   | Descripción breve de incorporación/catálogo.                                                                            |
| `order`                                | `number`   | Orden de clasificación en catálogos de canales.                                                                         |
| `aliases`                              | `string[]` | Alias de búsqueda adicionales para la selección de canales.                                                             |
| `preferOver`                           | `string[]` | Ids de complemento/canal de menor prioridad que este canal debe superar.                                                |
| `systemImage`                          | `string`   | Nombre de icono/imagen del sistema opcional para catálogos de interfaz de usuario de canales.                           |
| `selectionDocsPrefix`                  | `string`   | Texto de prefijo antes de los enlaces de documentos en las superficies de selección.                                    |
| `selectionDocsOmitLabel`               | `boolean`  | Mostrar la ruta de los documentos directamente en lugar de un enlace de documentos etiquetado en la copia de selección. |
| `selectionExtras`                      | `string[]` | Cadenas cortas adicionales añadidas en la copia de selección.                                                           |
| `markdownCapable`                      | `boolean`  | Marca el canal como capaz de usar markdown para decisiones de formato de salida.                                        |
| `exposure`                             | `object`   | Controles de visibilidad del canal para configuración, listas configuradas y superficies de documentos.                 |
| `quickstartAllowFrom`                  | `boolean`  | Incluir este canal en el flujo de configuración de inicio rápido estándar `allowFrom`.                                  |
| `forceAccountBinding`                  | `boolean`  | Requerir vinculación explícita de la cuenta incluso cuando solo existe una cuenta.                                      |
| `preferSessionLookupForAnnounceTarget` | `boolean`  | Preferir búsqueda de sesión al resolver objetivos de anuncio para este canal.                                           |

Ejemplo:

```json
{
  "openclaw": {
    "channel": {
      "id": "my-channel",
      "label": "My Channel",
      "selectionLabel": "My Channel (self-hosted)",
      "detailLabel": "My Channel Bot",
      "docsPath": "/channels/my-channel",
      "docsLabel": "my-channel",
      "blurb": "Webhook-based self-hosted chat integration.",
      "order": 80,
      "aliases": ["mc"],
      "preferOver": ["my-channel-legacy"],
      "selectionDocsPrefix": "Guide:",
      "selectionExtras": ["Markdown"],
      "markdownCapable": true,
      "exposure": {
        "configured": true,
        "setup": true,
        "docs": true
      },
      "quickstartAllowFrom": true
    }
  }
}
```

`exposure` admite:

- `configured`: incluir el canal en superficies de lista de estilo configurado/estado
- `setup`: incluir el canal en selectores de configuración/configuración interactiva
- `docs`: marcar el canal como público en superficies de documentación/navegación

`showConfigured` y `showInSetup` siguen siendo compatibles como alias heredados. Se prefiere
`exposure`.

### `openclaw.install`

`openclaw.install` son metadatos del paquete, no metadatos del manifiesto.

| Campo                        | Tipo                 | Significado                                                                                                                     |
| ---------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `npmSpec`                    | `string`             | Especificación canónica de npm para flujos de instalación/actualización.                                                        |
| `localPath`                  | `string`             | Ruta de desarrollo local o instalación agrupada.                                                                                |
| `defaultChoice`              | `"npm"` \| `"local"` | Fuente de instalación preferida cuando ambas están disponibles.                                                                 |
| `minHostVersion`             | `string`             | Versión mínima compatible de OpenClaw en el formato `>=x.y.z`.                                                                  |
| `allowInvalidConfigRecovery` | `boolean`            | Permite que los flujos de reinstalación de complementos agrupados se recuperen de fallos específicos de configuración obsoleta. |

Si se establece `minHostVersion`, tanto la instalación como la carga del registro de manifiestos lo hacen cumplir.
Los hosts más antiguos omiten el complemento; las cadenas de versión no válidas se rechazan.

`allowInvalidConfigRecovery` no es una solución general para configuraciones rotas. Es
solo para una recuperación estrecha de complementos agrupados, de modo que la reinstalación/configuración pueda reparar restos conocidos
de actualización, como una ruta de complemento agrupado faltante o una entrada obsoleta de `channels.<id>`
para ese mismo complemento. Si la configuración está rota por razones no relacionadas, la instalación
aún falla cerrada e indica al operador que ejecute `openclaw doctor --fix`.

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

<Warning>Solo active la carga diferida cuando su `setupEntry` registre todo lo que la puerta de enlace necesita antes de comenzar a escuchar (registro de canales, rutas HTTP, métodos de puerta de enlace). Si la entrada completa posee capacidades de inicio requeridas, mantenga el comportamiento predeterminado.</Warning>

Si su entrada de configuración/completa registra métodos RPC de puerta de enlace, manténgalos en un
prefijo específico del complemento. Los espacios de nombres administrativos centrales reservados (`config.*`,
`exec.approvals.*`, `wizard.*`, `update.*`) permanecen propiedad del núcleo y siempre se resuelven
a `operator.admin`.

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

Consulte [Manifiesto del complemento](/es/plugins/manifest) para obtener la referencia completa del esquema.

## Publicación en ClawHub

Para paquetes de complementos, use el comando específico de ClawHub para paquetes:

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
```

El alias de publicación heredado solo para habilidades es para habilidades. Los paquetes de complementos deben
usar siempre `clawhub package publish`.

## Entrada de configuración

El archivo `setup-entry.ts` es una alternativa ligera a `index.ts` que
OpenClaw carga cuando solo necesita superficies de configuración (incorporación, reparación de configuración,
inspección de canales deshabilitados).

```typescript
// setup-entry.ts
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
import { myChannelPlugin } from "./src/channel.js";

export default defineSetupPluginEntry(myChannelPlugin);
```

Esto evita cargar código de ejecución pesado (bibliotecas criptográficas, registros de CLI,
servicios en segundo plano) durante los flujos de configuración.

Los canales del espacio de trabajo empaquetados que mantienen exportaciones seguras para la configuración en módulos auxiliares pueden
usar `defineBundledChannelSetupEntry(...)` de
`openclaw/plugin-sdk/channel-entry-contract` en lugar de
`defineSetupPluginEntry(...)`. Ese contrato empaquetado también admite una exportación
`runtime` opcional para que el cableado en tiempo de ejecución durante la configuración pueda mantenerse ligero y explícito.

**Cuando OpenClaw usa `setupEntry` en lugar de la entrada completa:**

- El canal está deshabilitado pero necesita superficies de configuración/incorporación
- El canal está habilitado pero no configurado
- La carga diferida está habilitada (`deferConfiguredChannelFullLoadUntilAfterListen`)

**Lo que `setupEntry` debe registrar:**

- El objeto del complemento del canal (vía `defineSetupPluginEntry`)
- Cualquier ruta HTTP requerida antes de que la puerta de enlace escuche
- Cualquier método de puerta de enlace necesario durante el inicio

Esos métodos de puerta de enlace de inicio aún deben evitar los espacios de nombres administrativos principales reservados
tales como `config.*` o `update.*`.

**Lo que `setupEntry` NO debe incluir:**

- Registros de CLI
- Servicios en segundo plano
- Importaciones pesadas en tiempo de ejecución (crypto, SDKs)
- Métodos de puerta de enlace necesarios solo después del inicio

### Importaciones auxiliares de configuración estrechas

Para rutas de acceso rápidas solo de configuración, prefiera los puntos auxiliares de configuración estrechos en lugar del paraguas más amplio
`plugin-sdk/setup` cuando solo necesite parte de la superficie de configuración:

| Ruta de importación                | Úselo para                                                                                                                | Exportaciones clave                                                                                                                                                                                                                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/setup-runtime`         | auxiliares de tiempo de ejecución de configuración que permanecen disponibles en `setupEntry` / inicio diferido del canal | `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
| `plugin-sdk/setup-adapter-runtime` | adaptadores de configuración de cuenta conscientes del entorno                                                            | `createEnvPatchedAccountSetupAdapter`                                                                                                                                                                                                                                                        |
| `plugin-sdk/setup-tools`           | ayudantes de setup/install CLI/archive/docs                                                                               | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR`                                                                                                                                                                                |

Use el seam `plugin-sdk/setup` más amplio cuando desee el conjunto de herramientas de configuración compartida completo, incluidos los auxiliares de parches de configuración como `moveSingleAccountChannelSectionToDefaultAccount(...)`.

Los adaptadores de parches de configuración (setup patch adapters) siguen siendo seguros para la ruta de acceso activa (hot-path) al importar. Su búsqueda de superficie de contrato de promoción de cuenta única empaquetada es diferida (lazy), por lo que importar `plugin-sdk/setup-runtime` no carga con ansiedad el descubrimiento de superficie de contrato empaquetado antes de que el adaptador se use realmente.

### Promoción de cuenta única propiedad del canal

Cuando un canal actualiza desde una configuración de nivel superior de cuenta única a `channels.<id>.accounts.*`, el comportamiento compartido predeterminado es mover los valores con ámbito de cuenta promocionados a `accounts.default`.

Los canales empaquetados pueden limitar o anular esa promoción a través de su superficie de contrato de configuración:

- `singleAccountKeysToMove`: claves de nivel superior adicionales que deben moverse a la cuenta promocionada
- `namedAccountPromotionKeys`: cuando ya existen cuentas con nombre, solo estas claves se mueven a la cuenta promocionada; las claves compartidas de política/entrega se mantienen en la raíz del canal
- `resolveSingleAccountPromotionTarget(...)`: elige qué cuenta existente recibe los valores promocionados

Matrix es el ejemplo empaquetado actual. Si ya existe exactamente una cuenta de Matrix con nombre, o si `defaultAccount` apunta a una clave canónica no existente como `Ops`, la promoción preserva esa cuenta en lugar de crear una nueva entrada `accounts.default`.

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

### Creación de esquemas de configuración de canal

Use `buildChannelConfigSchema` de `openclaw/plugin-sdk/core` para convertir un esquema Zod en el contenedor `ChannelConfigSchema` que OpenClaw valida:

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
`dmPolicy`, `allowFrom`, `groupAccess`, `prepare`, `finalize`, y más.
Vea los paquetes de complementos incluidos (por ejemplo, el complemento de Discord `src/channel.setup.ts`) para
ejemplos completos.

Para indicaciones de lista de permitidos de MD que solo necesitan el flujo estándar
`note -> prompt -> parse -> merge -> patch`, prefiera los ayudantes de configuración
compartidos de `openclaw/plugin-sdk/setup`: `createPromptParsedAllowFromForAccount(...)`,
`createTopLevelChannelParsedAllowFromPrompt(...)`, y
`createNestedChannelParsedAllowFromPrompt(...)`.

Para bloques de estado de configuración de canal que solo varían en etiquetas, puntuaciones y líneas
adicionales opcionales, prefiera `createStandardChannelSetupStatus(...)` de
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

`plugin-sdk/channel-setup` también expone los constructores de nivel inferior
`createOptionalChannelSetupAdapter(...)` y
`createOptionalChannelSetupWizard(...)` cuando solo necesita una mitad de
esa superficie de instalación opcional.

El adaptador/asistente opcional generado falla cerrado en escrituras de configuración reales. Reutilizan
un mensaje de instalación requerido en `validateInput`,
`applyAccountConfig`, y `finalize`, y añaden un enlace a la documentación cuando `docsPath` está
configurado.

Para interfaces de usuario de configuración respaldadas por binarios, prefiera los ayudantes delegados compartidos en lugar de
copiar el mismo pegamento de binario/estado en cada canal:

- `createDetectedBinaryStatus(...)` para bloques de estado que solo varían en etiquetas,
  sugerencias, puntuaciones y detección de binarios
- `createCliPathTextInput(...)` para entradas de texto respaldadas por rutas
- `createDelegatedSetupWizardStatusResolvers(...)`,
  `createDelegatedPrepare(...)`, `createDelegatedFinalize(...)`, y
  `createDelegatedResolveConfigured(...)` cuando `setupEntry` necesita reenviar a
  un asistente completo más pesado de forma diferida
- `createDelegatedTextInputShouldPrompt(...)` cuando `setupEntry` solo necesita
  delegar una decisión `textInputs[*].shouldPrompt`

## Publicación e instalación

**Plugins externos:** publícalos en [ClawHub](/es/tools/clawhub) o npm, luego instala:

```bash
openclaw plugins install @myorg/openclaw-my-plugin
```

OpenClaw intenta con ClawHub primero y recurre a npm automáticamente. También puedes
forzar ClawHub explícitamente:

```bash
openclaw plugins install clawhub:@myorg/openclaw-my-plugin   # ClawHub only
```

No hay una anulación `npm:` coincidente. Usa la especificación de paquete npm normal cuando
quieras la ruta de npm después de la recuperación de ClawHub:

```bash
openclaw plugins install @myorg/openclaw-my-plugin
```

**Plugins en el repositorio:** colócalos bajo el árbol del espacio de trabajo del paquete de plugins y se descubren automáticamente
durante la compilación.

**Los usuarios pueden instalar:**

```bash
openclaw plugins install <package-name>
```

<Info>Para las instalaciones desde npm, `openclaw plugins install` ejecuta `npm install --ignore-scripts` (sin scripts de ciclo de vida). Mantén los árboles de dependencias de los plugins puros JS/TS y evita paquetes que requieran compilaciones `postinstall`.</Info>

Los complementos propiedad de OpenClaw incluidos en el paquete son la única excepción de reparación al inicio: cuando una instalación empaquetada detecta uno habilitado por la configuración del complemento, la configuración heredada del canal o su manifiesto habilitado por defecto incluido, el inicio instala las dependencias de tiempo de ejecución faltantes de ese complemento antes de la importación. Los complementos de terceros no deben depender de las instalaciones al inicio; siga utilizando el instalador explícito de complementos.

## Relacionado

- [Puntos de entrada del SDK](/es/plugins/sdk-entrypoints) -- `definePluginEntry` y `defineChannelPluginEntry`
- [Manifiesto del complemento](/es/plugins/manifest) -- referencia completa del esquema del manifiesto
- [Construcción de complementos](/es/plugins/building-plugins) -- guía paso a paso para comenzar
