---
summary: "Asistentes de configuración, setup-entry.ts, esquemas de configuración y metadatos de package."
title: "Configuración y configuración del complemento"
sidebarTitle: "Configuración y configuración"
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
  Marcas de comportamiento de inicio.
</ParamField>

### `openclaw.channel`

`openclaw.channel` son metadatos de paquete económicos para la detección y las superficies de configuración de canales antes de la carga en tiempo de ejecución.

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
| `quickstartAllowFrom`                  | `boolean`  | Incluye este canal en el flujo de configuración `allowFrom` de inicio rápido estándar.                      |
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

`exposure` admite:

- `configured`: incluye el canal en las superficies de listado de estilo configurado/estado
- `setup`: incluye el canal en selectores de configuración interactivos
- `docs`: marca el canal como público en las superficies de documentación/navegación

<Note>`showConfigured` y `showInSetup` siguen siendo compatibles como alias heredados. Se prefiere `exposure`.</Note>

### `openclaw.install`

`openclaw.install` son metadatos del paquete, no metadatos del manifiesto.

| Campo                        | Tipo                                | Qué significa                                                                                                                     |
| ---------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `clawhubSpec`                | `string`                            | Especificación canónica de ClawHub para flujos de instalación/actualización y de instalación a petición durante la incorporación. |
| `npmSpec`                    | `string`                            | Especificación canónica de npm para flujos de reserva de instalación/actualización.                                               |
| `localPath`                  | `string`                            | Ruta de instalación de desarrollo local o agrupada.                                                                               |
| `defaultChoice`              | `"clawhub"` \| `"npm"` \| `"local"` | Fuente de instalación preferida cuando hay varias fuentes disponibles.                                                            |
| `minHostVersion`             | `string`                            | Versión mínima compatible de OpenClaw en forma de `>=x.y.z` o `>=x.y.z-prerelease`.                                               |
| `expectedIntegrity`          | `string`                            | Cadena de integridad esperada de dist npm, generalmente `sha512-...`, para instalaciones fijadas.                                 |
| `allowInvalidConfigRecovery` | `boolean`                           | Permite que los flujos de reinstalación de complementos agrupados se recuperen de fallos específicos de configuración obsoleta.   |

<AccordionGroup>
  <Accordion title="Comportamiento de incorporación">
    La incorporación interactiva también utiliza `openclaw.install` para superficies de instalación bajo demanda. Si su complemento expone opciones de autenticación del proveedor o metadatos de configuración/catálogo de canales antes de que se cargue el tiempo de ejecución, la incorporación puede mostrar esa opción, solicitar ClawHub, npm o instalación local, instalar o habilitar el complemento y luego continuar el flujo seleccionado. Las opciones de incorporación de ClawHub usan `clawhubSpec` y son las preferidas cuando están presentes; las opciones de npm requieren metadatos de catálogo de confianza con un registro `npmSpec`; las versiones exactas y `expectedIntegrity` son fijaciones opcionales de npm. Si `expectedIntegrity` está presente, los flujos de instalación/actualización lo hacen cumplir para npm. Mantenga los metadatos de "qué mostrar" en `openclaw.plugin.json` y los metadatos de "cómo instalarlo" en `package.json`.
  </Accordion>
  <Accordion title="Cumplimiento de minHostVersion">
    Si `minHostVersion` está configurado, tanto la instalación como la carga del registro de manifiestos no empaquetados lo hacen cumplir. Los hosts más antiguos omiten complementos externos; las cadenas de versión no válidas se rechazan. Se supone que los complementos de código fuente empaquetados tienen la misma versión que la confirmación del host.
  </Accordion>
  <Accordion title="Instalaciones fijas de npm">
    Para las instalaciones fijas de npm, mantenga la versión exacta en `npmSpec` y agregue la integridad del artefacto esperada:

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
  <Accordion title="Ámbito de allowInvalidConfigRecovery">
    `allowInvalidConfigRecovery` no es una solución general para configuraciones rotas. Es solo para la recuperación de complementos empaquetados de ámbito limitado, por lo que la reinstalación/configuración puede reparar restos conocidos de actualizaciones, como una ruta de complemento empaquetado faltante o una entrada obsoleta de `channels.<id>` para ese mismo complemento. Si la configuración está rota por razones no relacionadas, la instalación aún falla de forma cerrada e indica al operador que ejecute `openclaw doctor --fix`.
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

Cuando está habilitado, OpenClaw carga solo `setupEntry` durante la fase de inicio previa a la escucha, incluso para canales ya configurados. La entrada completa se carga después de que el gateway comienza a escuchar.

<Warning>Habilite la carga diferida solo cuando su `setupEntry` registre todo lo que el gateway necesita antes de comenzar a escuchar (registro de canales, rutas HTTP, métodos del gateway). Si la entrada completa posee capacidades de inicio requeridas, mantenga el comportamiento predeterminado.</Warning>

Si su entrada de configuración/completa registra métodos RPC del gateway, manténgalos en un prefijo específico del complemento. Los espacios de nombres reservados de administración principal (`config.*`, `exec.approvals.*`, `wizard.*`, `update.*`) permanecen propiedad del núcleo y siempre se resuelven en `operator.admin`.

## Manifiesto del complemento

Cada complemento nativo debe incluir un `openclaw.plugin.json` en la raíz del paquete. OpenClaw lo usa para validar la configuración sin ejecutar el código del complemento.

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

Incluso los complementos sin configuración deben enviar un esquema. Un esquema vacío es válido:

```json
{
  "id": "my-plugin",
  "configSchema": {
    "type": "object",
    "additionalProperties": false
  }
}
```

Consulta [Manifiesto del complemento](/es/plugins/manifest) para ver la referencia completa del esquema.

## Publicación en ClawHub

Para los paquetes de complementos, use el comando específico de paquete de ClawHub:

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

Esto evita cargar código de tiempo de ejecución pesado (bibliotecas criptográficas, registros de CLI, servicios en segundo plano) durante los flujos de configuración.

Los canales del espacio de trabajo agrupados que mantienen exportaciones seguras para la configuración en módulos auxiliares pueden usar `defineBundledChannelSetupEntry(...)` de `openclaw/plugin-sdk/channel-entry-contract` en lugar de `defineSetupPluginEntry(...)`. Ese contrato agrupado también admite una exportación `runtime` opcional para que el cableado del tiempo de ejecución en el momento de la configuración pueda mantenerse ligero y explícito.

<AccordionGroup>
  <Accordion title="Cuando OpenClaw usa setupEntry en lugar de la entrada completa">
    - El canal está deshabilitado pero necesita superfices de configuración/integración.
    - El canal está habilitado pero no configurado.
    - La carga diferida está habilitada (`deferConfiguredChannelFullLoadUntilAfterListen`).

  </Accordion>
  <Accordion title="Lo que setupEntry debe registrar">
    - El objeto del complemento del canal (vía `defineSetupPluginEntry`).
    - Cualquier ruta HTTP requerida antes de que la puerta de enlace escuche.
    - Cualquier método de puerta de enlace necesario durante el inicio.

    Esos métodos de puerta de enlace de inicio aún deben evitar los espacios de nombres administrativos principales reservados como `config.*` o `update.*`.

  </Accordion>
  <Accordion title="Lo que setupEntry NO debe incluir">
    - Registros de CLI.
    - Servicios en segundo plano.
    - Importaciones de tiempo de ejecución pesadas (criptografía, SDK).
    - Métodos de puerta de enlace necesarios solo después del inicio.

  </Accordion>
</AccordionGroup>

### Importaciones limitadas de ayudantes de configuración

Para rutas de acceso rápido solo de configuración, prefiera las costuras limitadas de ayudantes de configuración sobre el paraguas más amplio `plugin-sdk/setup` cuando solo necesite parte de la superficie de configuración:

| Ruta de importación                | Úselo para                                                                                                                         | Exportaciones clave                                                                                                                                                                                                                                                                                                   |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/setup-runtime`         | ayudantes de tiempo de ejecución de tiempo de configuración que permanecen disponibles en `setupEntry` / inicio diferido del canal | `createSetupTranslator`, `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
| `plugin-sdk/setup-adapter-runtime` | alias de compatibilidad obsoleto; use `plugin-sdk/setup-runtime`                                                                   | `createEnvPatchedAccountSetupAdapter`                                                                                                                                                                                                                                                                                 |
| `plugin-sdk/setup-tools`           | ayudantes de configuración/instalación de CLI/archivo/documentos                                                                   | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR`                                                                                                                                                                                                         |

Utilice la interfaz `plugin-sdk/setup` más amplia cuando desee el conjunto de herramientas de configuración compartida completa, incluidos los ayudantes de parches de configuración como `moveSingleAccountChannelSectionToDefaultAccount(...)`.

Use `createSetupTranslator(...)` para el texto fijo del asistente de configuración. Sigue la configuración regional del asistente de la CLI (`OPENCLAW_LOCALE`, luego las variables de configuración regional del sistema) y vuelve al inglés. Mantenga el texto de configuración específico del complemento en el código propiedad del complemento y use claves de catálogo compartidas solo para etiquetas de configuración comunes, texto de estado y copia de configuración oficial de complementos empaquetados.

Los adaptadores de parches de configuración se mantienen seguros en la ruta crítica al importar. Su búsqueda de superficie de contrato de promoción de cuenta única incluida es diferida, por lo que importar `plugin-sdk/setup-runtime` no carga ansiosamente el descubrimiento de superficie de contrato incluido antes de que el adaptador se use realmente.

### Promoción de cuenta única propiedad del canal

Cuando un canal actualiza desde una configuración de nivel superior de cuenta única a `channels.<id>.accounts.*`, el comportamiento compartido predeterminado es mover los valores promocionados con ámbito de cuenta a `accounts.default`.

Los canales incluidos pueden limitar o anular esa promoción a través de su superficie de contrato de configuración:

- `singleAccountKeysToMove`: claves adicionales de nivel superior que deben moverse a la cuenta promocionada
- `namedAccountPromotionKeys`: cuando ya existen cuentas nombradas, solo estas claves se mueven a la cuenta promocionada; las claves de política/entrega compartidas permanecen en la raíz del canal
- `resolveSingleAccountPromotionTarget(...)`: elige qué cuenta existente recibe los valores promovidos

<Note>Matrix es el ejemplo empaquetado actual. Si ya existe exactamente una cuenta de Matrix con nombre, o si `defaultAccount` apunta a una clave no canónica existente como `Ops`, la promoción preserva esa cuenta en lugar de crear una nueva entrada `accounts.default`.</Note>

## Esquema de configuración

La configuración del complemento se valida contra el JSON Schema en su manifiesto. Los usuarios configuran los complementos a través de:

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

Si ya defines el contrato como JSON Schema o TypeBox, usa el asistente directo para que OpenClaw pueda omitir la conversión de Zod a JSON Schema en las rutas de metadatos:

```typescript
import { Type } from "typebox";
import { buildJsonChannelConfigSchema } from "openclaw/plugin-sdk/channel-config-schema";

const configSchema = buildJsonChannelConfigSchema(
  Type.Object({
    token: Type.Optional(Type.String()),
    allowFrom: Type.Optional(Type.Array(Type.String())),
  }),
);
```

Para complementos de terceros, el contrato de ruta fría sigue siendo el manifiesto del complemento: refleja el JSON Schema generado en `openclaw.plugin.json#channelConfigs` para que el esquema de configuración, la configuración y las superficies de la interfaz de usuario puedan inspeccionar `channels.<id>` sin cargar código en tiempo de ejecución.

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
  <Accordion title="Solicitudes compartidas de allowFrom">
    Para las solicitudes de lista blanca de MD que solo necesitan el flujo estándar `note -> prompt -> parse -> merge -> patch`, prefiere los asistentes de configuración compartidos de `openclaw/plugin-sdk/setup`: `createPromptParsedAllowFromForAccount(...)`, `createTopLevelChannelParsedAllowFromPrompt(...)` y `createNestedChannelParsedAllowFromPrompt(...)`.
  </Accordion>
  <Accordion title="Estado de configuración estándar del canal">
    Para los bloques de estado de configuración del canal que solo varían en etiquetas, puntuaciones y líneas adicionales opcionales, prefiere `createStandardChannelSetupStatus(...)` de `openclaw/plugin-sdk/setup` en lugar de crear el mismo objeto `status` manualmente en cada complemento.
  </Accordion>
  <Accordion title="Superficie de configuración opcional del canal">
    Para las superficies de configuración opcionales que solo deben aparecer en ciertos contextos, usa `createOptionalChannelSetupSurface` de `openclaw/plugin-sdk/channel-setup`:

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

    `plugin-sdk/channel-setup` también expone los constructores de menor nivel `createOptionalChannelSetupAdapter(...)` y `createOptionalChannelSetupWizard(...)` cuando solo necesitas una mitad de esa superficie de instalación opcional.

    El adaptador/asistente opcional generado falla cerrado en escrituras de configuración reales. Reutilizan un mensaje de "instalación requerida" en `validateInput`, `applyAccountConfig` y `finalize`, y agregan un enlace a la documentación cuando `docsPath` está configurado.

  </Accordion>
  <Accordion title="Binary-backed setup helpers">
    Para interfaces de usuario de configuración respaldadas por binarios, prefiere los ayudantes delegados compartidos en lugar de copiar el mismo pegamento binario/de estado en cada canal:

    - `createDetectedBinaryStatus(...)` para bloques de estado que varían solo por etiquetas, sugerencias, puntuaciones y detección de binarios
    - `createCliPathTextInput(...)` para entradas de texto respaldadas por rutas
    - `createDelegatedSetupWizardStatusResolvers(...)`, `createDelegatedPrepare(...)`, `createDelegatedFinalize(...)` y `createDelegatedResolveConfigured(...)` cuando `setupEntry` necesita reenviar a un asistente completo más pesado de manera diferida
    - `createDelegatedTextInputShouldPrompt(...)` cuando `setupEntry` solo necesita delegar una decisión `textInputs[*].shouldPrompt`

  </Accordion>
</AccordionGroup>

## Publicación e instalación

**Plugins externos:** publique en [ClawHub](/es/clawhub) y luego instale:

<Tabs>
  <Tab title="npm">
    ```bash
    openclaw plugins install @myorg/openclaw-my-plugin
    ```

    Las especificaciones de paquete básicas se instalan desde npm durante la transición de lanzamiento.

  </Tab>
  <Tab title="Solo ClawHub">
    ```bash
    openclaw plugins install clawhub:@myorg/openclaw-my-plugin
    ```
  </Tab>
  <Tab title="Especificación de paquete npm">
    Use npm cuando un paquete aún no se haya movido a ClawHub, o cuando necesite
    una ruta de instalación npm directa durante la migración:

    ```bash
    openclaw plugins install npm:@myorg/openclaw-my-plugin
    ```

  </Tab>
</Tabs>

**Plugins en el repositorio:** colóquelos debajo del árbol del espacio de trabajo del plugin empaquetado y se descubrirán automáticamente durante la compilación.

**Los usuarios pueden instalar:**

```bash
openclaw plugins install <package-name>
```

<Info>Para instalaciones desde npm, `openclaw plugins install` instala el paquete en un proyecto por complemento bajo `~/.openclaw/npm/projects` con los scripts de ciclo de vida deshabilitados. Mantenga los árboles de dependencias de los complementos puramente JS/TS y evite paquetes que requieran compilaciones `postinstall`.</Info>

<Note>El inicio de Gateway no instala las dependencias de los complementos. Los flujos de instalación de npm/git/ClawHub poseen la convergencia de dependencias; los complementos locales ya deben tener instaladas sus dependencias.</Note>

Los metadatos del paquete empaquetado son explícitos, no se infieren del JavaScript construido en el inicio de Gateway. Las dependencias en tiempo de ejecución pertenecen al paquete del complemento que las posee; el inicio de OpenClaw empaquetado nunca repara ni duplica las dependencias del complemento.

## Relacionado

- [Construcción de complementos](/es/plugins/building-plugins) — guía de inicio paso a paso
- [Manifiesto del complemento](/es/plugins/manifest) — referencia completa del esquema del manifiesto
- [Puntos de entrada del SDK](/es/plugins/sdk-entrypoints) — `definePluginEntry` y `defineChannelPluginEntry`
