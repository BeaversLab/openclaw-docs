---
summary: "Asistentes de configuración, setup-entry.ts, esquemas de configuración y metadatos de package."
title: "Configuración y configuración del complemento"
sidebarTitle: "Configuración y config"
read_when:
  - You are adding a setup wizard to a plugin
  - You need to understand setup-entry.ts vs index.ts
  - You are defining plugin config schemas or package.json openclaw metadata
---

Referencia para el empaquetado de complementos (metadatos de `package.json`), manifiestos (`openclaw.plugin.json`), entradas de configuración y esquemas de configuración.

<Tip>**¿Buscas un tutorial?** Las guías prácticas cubren el empaquetado en contexto: [Complementos de canal](/es/plugins/sdk-channel-plugins#step-1-package-and-manifest) y [Complementos de proveedor](/es/plugins/sdk-provider-plugins#step-1-package-and-manifest).</Tip>

## Metadatos del paquete

Tu `package.json` necesita un campo `openclaw` que indique al sistema de complementos qué proporciona tu complemento:

<Tabs>
  <Tab title="Complemento de canal">
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
  </Tab>
  <Tab title="Complemento de proveedor / línea base de ClawHub">
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
  </Tab>
</Tabs>

<Note>Si publicas el complemento externamente en ClawHub, esos campos `compat` y `build` son obligatorios. Los fragmentos de publicación canónicos residen en `docs/snippets/plugin-publish/`.</Note>

### Campos de `openclaw`

<ParamField path="extensions" type="string[]">
  Archivos de punto de entrada (relativos a la raíz del paquete).
</ParamField>
<ParamField path="setupEntry" type="string">
  Punto de entrada ligero solo para configuración (opcional).
</ParamField>
<ParamField path="channel" type="object">
  Metadatos del catálogo de canales para las superficies de configuración, selector, inicio rápido y estado.
</ParamField>
<ParamField path="providers" type="string[]">
  IDs de proveedores registrados por este complemento.
</ParamField>
<ParamField path="install" type="object">
  Sugerencias de instalación: `npmSpec`, `localPath`, `defaultChoice`, `minHostVersion`, `expectedIntegrity`, `allowInvalidConfigRecovery`.
</ParamField>
<ParamField path="startup" type="object">
  Indicadores de comportamiento de inicio.
</ParamField>

### `openclaw.channel`

`openclaw.channel` son metadatos de paquete ligeros para el descubrimiento de canales y superficies de configuración antes de que se cargue el tiempo de ejecución.

| Campo                                  | Tipo       | Significado                                                                                                 |
| -------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------- |
| `id`                                   | `string`   | ID canónico del canal.                                                                                      |
| `label`                                | `string`   | Etiqueta principal del canal.                                                                               |
| `selectionLabel`                       | `string`   | Etiqueta de selector/configuración cuando debe diferir de `label`.                                          |
| `detailLabel`                          | `string`   | Etiqueta de detalle secundario para catálogos de canales más ricos y superficies de estado.                 |
| `docsPath`                             | `string`   | Ruta de documentos para los enlaces de configuración y selección.                                           |
| `docsLabel`                            | `string`   | Etiqueta de anulación utilizada para los enlaces de documentos cuando debe diferir del ID del canal.        |
| `blurb`                                | `string`   | Descripción breve de incorporación/catálogo.                                                                |
| `order`                                | `number`   | Orden de clasificación en los catálogos de canales.                                                         |
| `aliases`                              | `string[]` | Alias de búsqueda adicionales para la selección de canales.                                                 |
| `preferOver`                           | `string[]` | Ids de complemento/canal de menor prioridad que este canal debe superar.                                    |
| `systemImage`                          | `string`   | Nombre opcional de icono/imagen del sistema para catálogos de la interfaz de usuario del canal.             |
| `selectionDocsPrefix`                  | `string`   | Texto de prefijo antes de los enlaces a la documentación en superficies de selección.                       |
| `selectionDocsOmitLabel`               | `boolean`  | Muestra la ruta de la documentación directamente en lugar de un enlace etiquetado en la copia de selección. |
| `selectionExtras`                      | `string[]` | Cadenas de texto muy cortas agregadas en la copia de selección.                                             |
| `markdownCapable`                      | `boolean`  | Marca el canal como capaz de manejar markdown para decisiones de formato de salida.                         |
| `exposure`                             | `object`   | Controles de visibilidad del canal para configuración, listas configuradas y superficies de documentación.  |
| `quickstartAllowFrom`                  | `boolean`  | Incluye este canal en el flujo de configuración estándar de inicio rápido `allowFrom`.                      |
| `forceAccountBinding`                  | `boolean`  | Requiere vinculación explícita de cuenta incluso cuando solo existe una cuenta.                             |
| `preferSessionLookupForAnnounceTarget` | `boolean`  | Prefiere la búsqueda de sesión al resolver objetivos de anuncio para este canal.                            |

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

`exposure` soporta:

- `configured`: incluir el canal en superficies de listado de tipo configurado/estado
- `setup`: incluir el canal en selectores interactivos de configuración
- `docs`: marcar el canal como público en superficies de documentación/navegación

<Note>`showConfigured` y `showInSetup` siguen siendo compatibles como alias heredados. Se prefiere `exposure`.</Note>

### `openclaw.install`

`openclaw.install` son metadatos del paquete, no metadatos del manifiesto.

| Campo                        | Tipo                 | Qué significa                                                                                                                   |
| ---------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `npmSpec`                    | `string`             | Especificación canónica de npm para flujos de instalación/actualización.                                                        |
| `localPath`                  | `string`             | Ruta de instalación para desarrollo local o agrupado (bundled).                                                                 |
| `defaultChoice`              | `"npm"` \| `"local"` | Fuente de instalación preferida cuando ambas están disponibles.                                                                 |
| `minHostVersion`             | `string`             | Versión mínima compatible de OpenClaw en formato `>=x.y.z`.                                                                     |
| `expectedIntegrity`          | `string`             | Cadena de integridad esperada de la distribución npm, generalmente `sha512-...`, para instalaciones fijas (pinned).             |
| `allowInvalidConfigRecovery` | `boolean`            | Permite que los flujos de reinstalación de complementos agrupados se recuperen de fallos específicos de configuración obsoleta. |

<AccordionGroup>
  <Accordion title="Comportamiento de incorporación (onboarding)">
    La incorporación interactiva también usa `openclaw.install` para superficies de instalación bajo demanda. Si su complemento expone opciones de autenticación de proveedor o metadatos de configuración/catálogo de canales antes de que se cargue el tiempo de ejecución, la incorporación puede mostrar esa opción, solicitar la instalación de npm vs local, instalar o habilitar el complemento y luego continuar el flujo seleccionado. Las opciones de incorporación de npm requieren metadatos de catálogo de confianza con un registro `npmSpec`; las versiones exactas y `expectedIntegrity` son pines opcionales. Si `expectedIntegrity` está presente, los flujos de instalación/actualización lo hacen cumplir. Mantenga los metadatos de "qué mostrar" en `openclaw.plugin.json` y los metadatos de "cómo instalarlo" en `package.json`.
  </Accordion>
  <Accordion title="Cumplimiento de minHostVersion">
    Si `minHostVersion` está configurado, tanto la instalación como la carga del registro de manifiestos lo hacen cumplir. Los hosts más antiguos omiten el complemento; las cadenas de versión no válidas se rechazan.
  </Accordion>
  <Accordion title="Instalaciones fijas (pinned) de npm">
    Para instalaciones fijas de npm, mantenga la versión exacta en `npmSpec` y agregue la integridad del artefacto esperado:

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

  </Accordion>
  <Accordion title="allowInvalidConfigRecovery scope">
    `allowInvalidConfigRecovery` no es una solución general para configuraciones rotas. Es solo para la recuperación limitada de complementos empaquetados, por lo que la reinstalación/configuración puede reparar restos conocidos de actualizaciones, como una ruta de complemento empaquetado faltante o una entrada obsoleta de `channels.<id>` para ese mismo complemento. Si la configuración está rota por razones no relacionadas, la instalación aún falla y le indica al operador que ejecute `openclaw doctor --fix`.
  </Accordion>
</AccordionGroup>

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

Cuando está habilitado, OpenClaw carga solo `setupEntry` durante la fase de inicio previa a la escucha, incluso para canales ya configurados. La entrada completa se carga después de que la puerta de enlace comienza a escuchar.

<Warning>Habilite la carga diferida solo cuando su `setupEntry` registre todo lo que la puerta de enlace necesita antes de que comience a escuchar (registro de canales, rutas HTTP, métodos de puerta de enlace). Si la entrada completa posee capacidades de inicio requeridas, mantenga el comportamiento predeterminado.</Warning>

Si su entrada de configuración/completa registra métodos RPC de puerta de enlace, manténgalos en un prefijo específico del complemento. Los espacios de nombres de administración central reservados (`config.*`, `exec.approvals.*`, `wizard.*`, `update.*`) permanecen propiedad de la central y siempre resuelven a `operator.admin`.

## Manifiesto del complemento

Cada complemento nativo debe incluir un `openclaw.plugin.json` en la raíz del paquete. OpenClaw lo utiliza para validar la configuración sin ejecutar el código del complemento.

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

Consulte [Manifiesto del complemento](/es/plugins/manifest) para obtener la referencia completa del esquema.

## Publicación en ClawHub

Para los paquetes de complementos, utilice el comando específico de ClawHub para el paquete:

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
```

<Note>El alias de publicación heredado solo para habilidades es para habilidades. Los paquetes de complementos siempre deben usar `clawhub package publish`.</Note>

## Entrada de configuración

El archivo `setup-entry.ts` es una alternativa ligera a `index.ts` que OpenClaw carga cuando solo necesita superficies de configuración (incorporación, reparación de configuración, inspección de canales deshabilitados).

```typescript
// setup-entry.ts
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
import { myChannelPlugin } from "./src/channel.js";

export default defineSetupPluginEntry(myChannelPlugin);
```

Esto evita cargar código de ejecución pesado (bibliotecas criptográficas, registros de CLI, servicios en segundo plano) durante los flujos de configuración.

Los canales de espacio de trabajo empaquetados que mantienen exportaciones seguras para la configuración en módulos sidecar pueden usar `defineBundledChannelSetupEntry(...)` de `openclaw/plugin-sdk/channel-entry-contract` en lugar de `defineSetupPluginEntry(...)`. Ese contrato empaquetado también admite una exportación opcional `runtime` para que el cableado del tiempo de ejecución de configuración pueda mantenerse ligero y explícito.

<AccordionGroup>
  <Accordion title="Cuándo OpenClaw usa setupEntry en lugar de la entrada completa">
    - El canal está deshabilitado pero necesita superficies de configuración/incorporación.
    - El canal está habilitado pero sin configurar.
    - La carga diferida está habilitada (`deferConfiguredChannelFullLoadUntilAfterListen`).
  </Accordion>
  <Accordion title="Qué debe registrar setupEntry">
    - El objeto del complemento del canal (vía `defineSetupPluginEntry`).
    - Cualquier ruta HTTP requerida antes de que la puerta de enlace escuche.
    - Cualquier método de puerta de enlace necesario durante el inicio.

    Esos métodos de puerta de enlace de inicio aún deben evitar los espacios de nombres reservados de administración central, como `config.*` o `update.*`.

  </Accordion>
  <Accordion title="Qué NO debe incluir setupEntry">
    - Registros de CLI.
    - Servicios en segundo plano.
    - Importaciones de tiempo de ejecución pesadas (criptografía, SDK).
    - Métodos de puerta de enlace necesarios solo después del inicio.
  </Accordion>
</AccordionGroup>

### Importaciones de ayudas de configuración estrechas

Para rutas de acceso rápido solo de configuración, prefiera las costuras de ayudas de configuración estrechas sobre el paraguas más amplio `plugin-sdk/setup` cuando solo necesite parte de la superficie de configuración:

| Ruta de importación                | Úselo para                                                                                                            | Exportaciones clave                                                                                                                                                                                                                                                                          |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/setup-runtime`         | ayudas de tiempo de ejecución de configuración que permanecen disponibles en `setupEntry` / inicio diferido del canal | `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
| `plugin-sdk/setup-adapter-runtime` | adaptadores de configuración de cuenta con reconocimiento del entorno                                                 | `createEnvPatchedAccountSetupAdapter`                                                                                                                                                                                                                                                        |
| `plugin-sdk/setup-tools`           | asistentes de configuración/instalación/CLI/archivo/documentos                                                        | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR`                                                                                                                                                                                |

Use la costura `plugin-sdk/setup` más amplia cuando desee el conjunto de herramientas de configuración compartida completo, incluidos los asistentes de parches de configuración como `moveSingleAccountChannelSectionToDefaultAccount(...)`.

Los adaptadores de parches de configuración permanecen seguros en la ruta crítica al importar. Su búsqueda de superficie de contrato de promoción de cuenta única empaquetada es diferida, por lo que importar `plugin-sdk/setup-runtime` no carga con entusiasmo el descubrimiento de superficie de contrato empaquetado antes de que el adaptador se use realmente.

### Promoción de cuenta única propiedad del canal

Cuando un canal actualiza desde una configuración de nivel superior de cuenta única a `channels.<id>.accounts.*`, el comportamiento compartido predeterminado es mover los valores promocionados con ámbito de cuenta a `accounts.default`.

Los canales empaquetados pueden limitar o anular esa promoción a través de su superficie de contrato de configuración:

- `singleAccountKeysToMove`: claves adicionales de nivel superior que deben moverse a la cuenta promocionada
- `namedAccountPromotionKeys`: cuando ya existen cuentas nombradas, solo estas claves se mueven a la cuenta promocionada; las claves compartidas de política/entrega permanecen en la raíz del canal
- `resolveSingleAccountPromotionTarget(...)`: elija qué cuenta existente recibe los valores promocionados

<Note>Matrix es el ejemplo empaquetado actual. Si ya existe exactamente una cuenta de Matrix nombrada, o si `defaultAccount` apunta a una clave no canónica existente como `Ops`, la promoción preserva esa cuenta en lugar de crear una nueva entrada `accounts.default`.</Note>

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

### Construcción de esquemas de configuración de canal

Use `buildChannelConfigSchema` para convertir un esquema Zod en el contenedor `ChannelConfigSchema` utilizado por los artefactos de configuración propiedad del complemento:

```typescript
import { z } from "zod";
import { buildChannelConfigSchema } from "openclaw/plugin-sdk/channel-config-schema";

const accountSchema = z.object({
  token: z.string().optional(),
  allowFrom: z.array(z.string()).optional(),
  accounts: z.object({}).catchall(z.any()).optional(),
  defaultAccount: z.string().optional(),
});

const configSchema = buildChannelConfigSchema(accountSchema);
```

Para complementos de terceros, el contrato de ruta fría sigue siendo el manifiesto del complemento: refleje el esquema JSON generado en `openclaw.plugin.json#channelConfigs` para que el esquema de configuración, la configuración y las superficies de la interfaz de usuario puedan inspeccionar `channels.<id>` sin cargar código en tiempo de ejecución.

## Asistentes de configuración

Los complementos de canal pueden proporcionar asistentes de configuración interactivos para `openclaw onboard`. El asistente es un objeto `ChannelSetupWizard` en el `ChannelPlugin`:

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

El tipo `ChannelSetupWizard` admite `credentials`, `textInputs`, `dmPolicy`, `allowFrom`, `groupAccess`, `prepare`, `finalize` y más. Consulte los paquetes de complementos incluidos (por ejemplo, el complemento de Discord `src/channel.setup.ts`) para ver ejemplos completos.

<AccordionGroup>
  <Accordion title="Prompts compartidos de allowFrom">
    Para los prompts de lista de permitidos de MD que solo necesitan el flujo estándar de `note -> prompt -> parse -> merge -> patch`, prefiera los asistentes de configuración compartidos de `openclaw/plugin-sdk/setup`: `createPromptParsedAllowFromForAccount(...)`, `createTopLevelChannelParsedAllowFromPrompt(...)` y `createNestedChannelParsedAllowFromPrompt(...)`.
  </Accordion>
  <Accordion title="Estado de configuración estándar del canal">
    Para los bloques de estado de configuración del canal que solo varían en etiquetas, puntuaciones y líneas adicionales opcionales, prefiera `createStandardChannelSetupStatus(...)` de `openclaw/plugin-sdk/setup` en lugar de crear el mismo objeto `status` manualmente en cada complemento.
  </Accordion>
  <Accordion title="Superficie de configuración opcional del canal">
    Para superficies de configuración opcionales que solo deben aparecer en ciertos contextos, use `createOptionalChannelSetupSurface` de `openclaw/plugin-sdk/channel-setup`:

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

    `plugin-sdk/channel-setup` también expone los constructores de menor nivel `createOptionalChannelSetupAdapter(...)` y `createOptionalChannelSetupWizard(...)` cuando solo necesita una mitad de esa superficie de instalación opcional.

    El adaptador/asistente opcional generado falla cerrado en escrituras de configuración reales. Reutilizan un mensaje de instalación requerido en `validateInput`, `applyAccountConfig` y `finalize`, y añaden un enlace a la documentación cuando `docsPath` está configurado.

  </Accordion>
  <Accordion title="Asistentes de configuración con respaldo binario">
    Para interfaces de usuario de configuración con respaldo binario, prefiera los asistentes delegados compartidos en lugar de copiar el mismo pegamento binario/estado en cada canal:

    - `createDetectedBinaryStatus(...)` para bloques de estado que varían solo por etiquetas, sugerencias, puntuaciones y detección binaria
    - `createCliPathTextInput(...)` para entradas de texto con respaldo de ruta
    - `createDelegatedSetupWizardStatusResolvers(...)`, `createDelegatedPrepare(...)`, `createDelegatedFinalize(...)` y `createDelegatedResolveConfigured(...)` cuando `setupEntry` necesita reenviar a un asistente completo más pesado de forma diferida
    - `createDelegatedTextInputShouldPrompt(...)` cuando `setupEntry` solo necesita delegar una decisión `textInputs[*].shouldPrompt`

  </Accordion>
</AccordionGroup>

## Publicación e instalación

**Plugins externos:** publique en [ClawHub](/es/tools/clawhub) o npm, luego instale:

<Tabs>
  <Tab title="Automático (ClawHub luego npm)">
    ```bash
    openclaw plugins install @myorg/openclaw-my-plugin
    ```

    OpenClaw intenta con ClawHub primero y recurre automáticamente a npm.

  </Tab>
  <Tab title="Solo ClawHub">
    ```bash
    openclaw plugins install clawhub:@myorg/openclaw-my-plugin
    ```
  </Tab>
  <Tab title="npm package spec">
    No hay una anulación de `npm:` coincidente. Utilice la especificación normal del paquete npm cuando desee la ruta de npm después de la alternativa de ClawHub:

    ```bash
    openclaw plugins install @myorg/openclaw-my-plugin
    ```

  </Tab>
</Tabs>

**Plugins en el repositorio:** colóquelos bajo el árbol del espacio de trabajo del plugin agrupado y se descubrirán automáticamente durante la compilación.

**Los usuarios pueden instalar:**

```bash
openclaw plugins install <package-name>
```

<Info>Para las instalaciones obtenidas de npm, `openclaw plugins install` ejecuta `npm install --ignore-scripts` local al proyecto (sin scripts de ciclo de vida), ignorando la configuración heredada de instalación global de npm. Mantenga los árboles de dependencia de los plugins en JS/TS puro y evite paquetes que requieran compilaciones `postinstall`.</Info>

<Note>
  Los plugins agrupados propiedad de OpenClaw son la única excepción de reparación al inicio: cuando una instalación empaquetada detecta uno habilitado por la configuración del plugin, la configuración del canal heredada o su manifiesto agrupado habilitado por defecto, el inicio instala las dependencias de tiempo de ejecución faltantes de ese plugin antes de la importación. Los plugins de terceros
  no deben depender de las instalaciones al inicio; siga utilizando el instalador explícito de plugins.
</Note>

## Relacionado

- [Compilación de plugins](/es/plugins/building-plugins) — guía de introducción paso a paso
- [Manifiesto de plugin](/es/plugins/manifest) — referencia completa del esquema del manifiesto
- [Puntos de entrada del SDK](/es/plugins/sdk-entrypoints) — `definePluginEntry` y `defineChannelPluginEntry`
