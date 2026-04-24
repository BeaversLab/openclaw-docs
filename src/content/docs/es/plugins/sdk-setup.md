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

| Campo        | Tipo       | Descripción                                                                                                                              |
| ------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `extensions` | `string[]` | Archivos de punto de entrada (relativos a la raíz del paquete)                                                                           |
| `setupEntry` | `string`   | Entrada ligera solo de configuración (opcional)                                                                                          |
| `channel`    | `object`   | Metadatos del catálogo de canales para las superficies de configuración, selector, inicio rápido y estado                                |
| `providers`  | `string[]` | IDs de proveedor registrados por este complemento                                                                                        |
| `install`    | `object`   | Sugerencias de instalación: `npmSpec`, `localPath`, `defaultChoice`, `minHostVersion`, `expectedIntegrity`, `allowInvalidConfigRecovery` |
| `startup`    | `object`   | Marcas de comportamiento de inicio                                                                                                       |

### `openclaw.channel`

`openclaw.channel` son metadatos de paquete ligeros para el descubrimiento de canales y las superficies de configuración
antes de la carga en tiempo de ejecución.

| Campo                                  | Tipo       | Significado                                                                                                             |
| -------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| `id`                                   | `string`   | ID canónico del canal.                                                                                                  |
| `label`                                | `string`   | Etiqueta principal del canal.                                                                                           |
| `selectionLabel`                       | `string`   | Etiqueta del selector/configuración cuando debe diferir de `label`.                                                     |
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
| `quickstartAllowFrom`                  | `boolean`  | Incluir este canal en el flujo de configuración rápida estándar `allowFrom`.                                            |
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

- `configured`: incluir el canal en superficies de listado de estilo configurado/estado
- `setup`: incluir el canal en selectores de configuración/configuración interactivos
- `docs`: marcar el canal como público en las superficies de documentación/navegación

`showConfigured` y `showInSetup` siguen siendo compatibles como alias heredados. Se prefiere
`exposure`.

### `openclaw.install`

`openclaw.install` son metadatos del paquete, no metadatos del manifiesto.

| Campo                        | Tipo                 | Significado                                                                                                             |
| ---------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `npmSpec`                    | `string`             | Especificación canónica de npm para flujos de instalación/actualización.                                                |
| `localPath`                  | `string`             | Ruta de desarrollo local o instalación agrupada.                                                                        |
| `defaultChoice`              | `"npm"` \| `"local"` | Fuente de instalación preferida cuando ambas están disponibles.                                                         |
| `minHostVersion`             | `string`             | Versión mínima compatible de OpenClaw en el formato `>=x.y.z`.                                                          |
| `expectedIntegrity`          | `string`             | Cadena de integridad esperada de la distribución npm, generalmente `sha512-...`, para instalaciones fijas.              |
| `allowInvalidConfigRecovery` | `boolean`            | Permite que los flujos de reinstalación de bundled-plugin se recuperen de fallos específicos de configuración obsoleta. |

La integración interactiva también usa `openclaw.install` para superficies de instalación bajo demanda.
Si su complemento expone opciones de autenticación del proveedor o metadatos de configuración/catálogo
del canal antes de que se cargue el tiempo de ejecución, la integración puede mostrar esa opción, solicitar npm
versus instalación local, instalar o habilitar el complemento y luego continuar el flujo seleccionado.
Las opciones de integración de npm requieren metadatos de catálogo confiables con un registro
`npmSpec`; las versiones exactas y `expectedIntegrity` son pines opcionales. Si
`expectedIntegrity` está presente, los flujos de instalación/actualización lo hacen cumplir. Mantenga los metadatos de "qué
mostrar" en `openclaw.plugin.json` y los metadatos de "cómo instalarlo"
en `package.json`.

Si `minHostVersion` está configurado, tanto la instalación como la carga del registro de manifiestos lo hacen cumplir.
Los hosts más antiguos omiten el complemento; las cadenas de versión no válidas son rechazadas.

Para instalaciones fijas de npm, mantenga la versión exacta en `npmSpec` y añada la
integridad del artefacto esperada:

```json
{
  "openclaw": {
    "install": {
      "npmSpec": "@wecom/wecom-openclaw-plugin@1.2.3",
      "expectedIntegrity": "sha512-REPLACE_WITH_NPM_DIST_INTEGRITY",
      "defaultChoice": "npm"
    }
  }
}
```

`allowInvalidConfigRecovery` no es una solución general para configuraciones rotas. Es
solo para una recuperación estrecha de bundled-plugin, para que la reinstalación/configuración pueda reparar
residuos conocidos de actualizaciones, como una ruta de complemento agrupada faltante o una entrada obsoleta `channels.<id>`
para ese mismo complemento. Si la configuración está rota por razones no relacionadas, la instalación
aún falla de forma cerrada e indica al operador que ejecute `openclaw doctor --fix`.

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

Cuando está habilitado, OpenClaw carga solo `setupEntry` durante la fase de inicio previa a la escucha
(incluso para canales ya configurados). La entrada completa se carga después de que
la puerta de enlace comienza a escuchar.

<Warning>Habilite la carga diferida solo cuando su `setupEntry` registre todo lo que la puerta de enlace necesita antes de comenzar a escuchar (registro de canales, rutas HTTP, métodos de puerta de enlace). Si la entrada completa posee capacidades de inicio requeridas, mantenga el comportamiento predeterminado.</Warning>

Si tu entrada de configuración/entrada completa registra métodos RPC de puerta de enlace, mantenlos en un prefijo específico del complemento. Los espacios de nombres reservados de administración central (`config.*`,
`exec.approvals.*`, `wizard.*`, `update.*`) siguen siendo propiedad de la central y siempre se resuelven
en `operator.admin`.

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

Para complementos de canal, añade `kind` y `channels`:

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

Consulta [Plugin Manifest](/es/plugins/manifest) para obtener la referencia completa del esquema.

## Publicación en ClawHub

Para los paquetes de complementos, utiliza el comando específico de paquete de ClawHub:

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
```

El alias de publicación heredado solo para habilidades (skills) es para las habilidades. Los paquetes de complementos siempre deben
usar `clawhub package publish`.

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

Esto evita cargar código de tiempo de ejecución pesado (bibliotecas de criptografía, registros de CLI,
servicios en segundo plano) durante los flujos de configuración.

Los canales de espacio de trabajo agrupados (bundled) que mantienen exportaciones seguras para la configuración en módulos sidecar pueden
usar `defineBundledChannelSetupEntry(...)` de
`openclaw/plugin-sdk/channel-entry-contract` en lugar de
`defineSetupPluginEntry(...)`. Ese contrato agrupado también admite una exportación opcional
`runtime` para que el cableado del tiempo de ejecución en el momento de la configuración pueda permanecer ligero y explícito.

**Cuando OpenClaw usa `setupEntry` en lugar de la entrada completa:**

- El canal está deshabilitado pero necesita superficies de configuración/incorporación
- El canal está habilitado pero no configurado
- La carga diferida está habilitada (`deferConfiguredChannelFullLoadUntilAfterListen`)

**Lo que `setupEntry` debe registrar:**

- El objeto del complemento de canal (vía `defineSetupPluginEntry`)
- Cualquier ruta HTTP requerida antes de que la puerta de enlace escuche
- Cualquier método de puerta de enlace necesario durante el inicio

Esos métodos de puerta de enlace de inicio aún deben evitar los espacios de nombres
reservados del núcleo de administración, como `config.*` o `update.*`.

**Lo que `setupEntry` NO debe incluir:**

- Registros de CLI
- Servicios en segundo plano
- Importaciones pesadas en tiempo de ejecución (crypto, SDKs)
- Métodos de puerta de enlace necesarios solo después del inicio

### Importaciones limitadas de asistentes de configuración

Para rutas de acceso rápido exclusivas de configuración, prefiera las costuras
limitadas de asistentes de configuración sobre el paraguas más amplio
`plugin-sdk/setup` cuando solo necesite parte de la superficie de configuración:

| Ruta de importación                      | Úselo para                                                                                                                                                                                                                                                                                   | Exportaciones clave                                                                                           |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/setup-runtime`               | asistentes de tiempo de ejecución en tiempo de configuración que permanecen disponibles en                                                                                                                                                                                                   |
| `setupEntry` / inicio diferido del canal | `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
| `plugin-sdk/setup-adapter-runtime`       | adaptadores de configuración de cuenta con conocimiento del entorno                                                                                                                                                                                                                          | `createEnvPatchedAccountSetupAdapter`                                                                         |
| `plugin-sdk/setup-tools`                 | asistentes de configuración/instalación CLI/archivo/documentos                                                                                                                                                                                                                               | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` |

Utilice la costura más amplia `plugin-sdk/setup` cuando desee el conjunto de herramientas de
configuración compartida completo, incluidos los asistentes de parches de configuración,
como `moveSingleAccountChannelSectionToDefaultAccount(...)`.

Los adaptadores de parches de configuración permanecen seguros en la ruta de acceso rápido al importarlos.
Su búsqueda de superficie de contrato de promoción de cuenta única incluida es diferida,
por lo que importar `plugin-sdk/setup-runtime` no carga ansiosamente el descubrimiento de
superficie de contrato incluido antes de que el adaptador se use realmente.

### Promoción de cuenta única propiedad del canal

Cuando un canal se actualiza desde una configuración de nivel superior de cuenta única a
`channels.<id>.accounts.*`, el comportamiento compartido predeterminado es mover los valores
promocionados con ámbito de cuenta a `accounts.default`.

Los canales incluidos pueden limitar o anular esa promoción a través de su superficie de
contrato de configuración:

- `singleAccountKeysToMove`: claves adicionales de nivel superior que deben trasladarse a la
  cuenta promovida
- `namedAccountPromotionKeys`: cuando ya existen cuentas con nombre, solo estas
  claves se trasladan a la cuenta promovida; las claves compartidas de política/envío se mantienen en la
  raíz del canal
- `resolveSingleAccountPromotionTarget(...)`: elige qué cuenta existente
  recibe los valores promovidos

Matrix es el ejemplo incluido actualmente. Si ya existe exactamente una cuenta de Matrix con nombre,
o si `defaultAccount` apunta a una clave no canónica existente
tal como `Ops`, la promoción preserva esa cuenta en lugar de crear una nueva
entrada `accounts.default`.

## Esquema de configuración

La configuración del complemento se valida contra el JSON Schema en su manifiesto. Los usuarios
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
Consulte los paquetes de complementos incluidos (por ejemplo, el complemento de Discord `src/channel.setup.ts`) para
ver ejemplos completos.

Para mensajes de lista de permitidos de MD que solo necesitan el flujo estándar
`note -> prompt -> parse -> merge -> patch`, prefiera los auxiliares de configuración
compartidos de `openclaw/plugin-sdk/setup`: `createPromptParsedAllowFromForAccount(...)`,
`createTopLevelChannelParsedAllowFromPrompt(...)` y
`createNestedChannelParsedAllowFromPrompt(...)`.

Para los bloques de estado de configuración de canal que solo varían por etiquetas, puntuaciones y líneas adicionales opcionales, prefiere `createStandardChannelSetupStatus(...)` de `openclaw/plugin-sdk/setup` en lugar de crear manualmente el mismo objeto `status` en cada complemento.

Para superficies de configuración opcionales que solo deben aparecer en ciertos contextos, usa `createOptionalChannelSetupSurface` de `openclaw/plugin-sdk/channel-setup`:

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

`plugin-sdk/channel-setup` también expone los constructores de nivel inferior `createOptionalChannelSetupAdapter(...)` y `createOptionalChannelSetupWizard(...)` cuando solo necesitas una mitad de esa superficie de instalación opcional.

El adaptador/asistente opcional generado falla cerrado en escrituras de configuración reales. Reutilizan un mensaje de instalación requerido en `validateInput`, `applyAccountConfig` y `finalize`, y añaden un enlace a la documentación cuando `docsPath` está configurado.

Para interfaces de usuario de configuración respaldadas por binarios, prefiere los ayudantes delegados compartidos en lugar de copiar el mismo pegamento binario/de estado en cada canal:

- `createDetectedBinaryStatus(...)` para bloques de estado que solo varían por etiquetas, sugerencias, puntuaciones y detección de binarios
- `createCliPathTextInput(...)` para entradas de texto respaldadas por rutas
- `createDelegatedSetupWizardStatusResolvers(...)`, `createDelegatedPrepare(...)`, `createDelegatedFinalize(...)` y `createDelegatedResolveConfigured(...)` cuando `setupEntry` necesita reenviar a un asistente completo más pesado de manera diferida
- `createDelegatedTextInputShouldPrompt(...)` cuando `setupEntry` solo necesita delegar una decisión `textInputs[*].shouldPrompt`

## Publicación e instalación

**Complementos externos:** publica en [ClawHub](/es/tools/clawhub) o npm, luego instala:

```bash
openclaw plugins install @myorg/openclaw-my-plugin
```

OpenClaw intenta ClawHub primero y recurre a npm automáticamente. También puedes forzar ClawHub explícitamente:

```bash
openclaw plugins install clawhub:@myorg/openclaw-my-plugin   # ClawHub only
```

No hay una sobrescritura `npm:` coincidente. Usa la especificación de paquete npm normal cuando quieras la ruta de npm después de la recuperación de ClawHub:

```bash
openclaw plugins install @myorg/openclaw-my-plugin
```

**Complementos en el repositorio:** colócalos debajo del árbol del espacio de trabajo del complemento empaquetado y se descubren automáticamente durante la compilación.

**Los usuarios pueden instalar:**

```bash
openclaw plugins install <package-name>
```

<Info>Para las instalaciones fuente de npm, `openclaw plugins install` ejecuta `npm install --ignore-scripts` (sin scripts de ciclo de vida). Mantenga los árboles de dependencias del plugin puramente JS/TS y evite paquetes que requieran compilaciones `postinstall`.</Info>

Los plugins agrupados propiedad de OpenClaw son la única excepción de reparación al inicio: cuando una instalación empaquetada ve uno habilitado por la configuración del plugin, la configuración heredada del canal, o su manifiesto agrupado habilitado por defecto, el inicio instala las dependencias de tiempo de ejecución faltantes de ese plugin antes de la importación. Los plugins de terceros no deben depender de instalaciones al inicio; siga usando el instalador explícito de plugins.

## Relacionado

- [Puntos de entrada del SDK](/es/plugins/sdk-entrypoints) -- `definePluginEntry` y `defineChannelPluginEntry`
- [Manifiesto de Plugin](/es/plugins/manifest) -- referencia completa del esquema de manifiesto
- [Construcción de Plugins](/es/plugins/building-plugins) -- guía de introducción paso a paso
