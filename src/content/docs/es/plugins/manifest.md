---
summary: "Manifiesto de complemento + requisitos de esquema JSON (validación de configuración estricta)"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "Manifiesto de complemento"
---

# Manifiesto de complemento (openclaw.plugin.)

Esta página es solo para el **manifiesto de complemento nativo de OpenClaw**.

Para diseños de paquetes compatibles, consulte [Paquetes de complementos](/en/plugins/bundles).

Los formatos de paquete compatibles utilizan diferentes archivos de manifiesto:

- Paquete Codex: `.codex-plugin/plugin.json`
- Paquete Claude: `.claude-plugin/plugin.json` o el diseño de componente Claude predeterminado
  sin un manifiesto
- Paquete Cursor: `.cursor-plugin/plugin.json`

OpenClaw también detecta automáticamente esos diseños de paquetes, pero no se validan
contra el esquema `openclaw.plugin.json` descrito aquí.

Para paquetes compatibles, OpenClaw actualmente lee los metadatos del paquete más las
raíces de habilidades declaradas, las raíces de comandos de Claude, los valores predeterminados del `settings.json` del paquete Claude y
los paquetes de enlace compatibles cuando el diseño coincide con las expectativas de ejecución de OpenClaw.

Cada complemento nativo de OpenClaw **debe** incluir un archivo `openclaw.plugin.json` en la
**raíz del complemento**. OpenClaw utiliza este manifiesto para validar la configuración
**sin ejecutar el código del complemento**. Los manifiestos faltantes o no válidos se tratan como
errores del complemento y bloquean la validación de la configuración.

Consulte la guía completa del sistema de complementos: [Plugins](/en/tools/plugin).
Para el modelo de capacidades nativo y la guía actual de compatibilidad externa:
[Capability model](/en/plugins/architecture#public-capability-model).

## Qué hace este archivo

`openclaw.plugin.json` son los metadatos que OpenClaw lee antes de cargar su
código de complemento.

Úselo para:

- identidad del plugin
- validación de configuración
- metadatos de autenticación e incorporación que deben estar disponibles sin iniciar el tiempo de ejecución
  del plugin
- instantáneas estáticas de propiedad de capacidades utilizadas para el cableado de compatibilidad agrupado y
  cobertura de contratos
- sugerencias de interfaz de usuario de configuración

No lo use para:

- registrar el comportamiento en tiempo de ejecución
- declarar puntos de entrada de código
- metadatos de instalación de npm

Esos pertenecen a su código de complemento y a `package.json`.

## Ejemplo mínimo

```json
{
  "id": "voice-call",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {}
  }
}
```

## Ejemplo completo

```json
{
  "id": "openrouter",
  "name": "OpenRouter",
  "description": "OpenRouter provider plugin",
  "version": "1.0.0",
  "providers": ["openrouter"],
  "cliBackends": ["openrouter-cli"],
  "providerAuthEnvVars": {
    "openrouter": ["OPENROUTER_API_KEY"]
  },
  "providerAuthChoices": [
    {
      "provider": "openrouter",
      "method": "api-key",
      "choiceId": "openrouter-api-key",
      "choiceLabel": "OpenRouter API key",
      "groupId": "openrouter",
      "groupLabel": "OpenRouter",
      "optionKey": "openrouterApiKey",
      "cliFlag": "--openrouter-api-key",
      "cliOption": "--openrouter-api-key <key>",
      "cliDescription": "OpenRouter API key",
      "onboardingScopes": ["text-inference"]
    }
  ],
  "uiHints": {
    "apiKey": {
      "label": "API key",
      "placeholder": "sk-or-v1-...",
      "sensitive": true
    }
  },
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "apiKey": {
        "type": "string"
      }
    }
  }
}
```

## Referencia de campos de nivel superior

| Campo                 | Obligatorio | Tipo                             | Significado                                                                                                                                                                                    |
| --------------------- | ----------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                  | Sí          | `string`                         | Id canónico del complemento. Este es el id utilizado en `plugins.entries.<id>`.                                                                                                                |
| `configSchema`        | Sí          | `object`                         | Esquema JSON en línea para la configuración de este complemento.                                                                                                                               |
| `enabledByDefault`    | No          | `true`                           | Marca un complemento agrupado como habilitado de forma predeterminada. Omítalo o establezca cualquier valor que no sea `true` para dejar el complemento deshabilitado de forma predeterminada. |
| `kind`                | No          | `"memory"` \| `"context-engine"` | Declara un tipo exclusivo de complemento utilizado por `plugins.slots.*`.                                                                                                                      |
| `channels`            | No          | `string[]`                       | IDs de canales propiedad de este complemento. Se utiliza para el descubrimiento y la validación de la configuración.                                                                           |
| `providers`           | No          | `string[]`                       | IDs de proveedores propiedad de este complemento.                                                                                                                                              |
| `cliBackends`         | No          | `string[]`                       | IDs de backend de inferencia CLI propiedad de este complemento. Se utiliza para la autoactivación al inicio desde referencias de configuración explícitas.                                     |
| `providerAuthEnvVars` | No          | `Record<string, string[]>`       | Metadatos de entorno de autenticación de proveedores económicos que OpenClaw puede inspeccionar sin cargar el código del complemento.                                                          |
| `providerAuthChoices` | No          | `object[]`                       | Metadatos económicos de elección de autenticación para selectores de incorporación, resolución de proveedores preferidos y cableado simple de indicadores CLI.                                 |
| `contracts`           | No          | `object`                         | Instantánea estática de capacidades agrupadas para voz, comprensión de medios, generación de imágenes, búsqueda web y propiedad de herramientas.                                               |
| `skills`              | No          | `string[]`                       | Directorios de habilidades (skills) para cargar, relativos a la raíz del complemento.                                                                                                          |
| `name`                | No          | `string`                         | Nombre del complemento legible por humanos.                                                                                                                                                    |
| `description`         | No          | `string`                         | Resumen breve que se muestra en las superficies del complemento.                                                                                                                               |
| `version`             | No          | `string`                         | Versión del complemento informativa.                                                                                                                                                           |
| `uiHints`             | No          | `Record<string, object>`         | Etiquetas de la interfaz de usuario, marcadores de posición e indicaciones de sensibilidad para los campos de configuración.                                                                   |

## Referencia de providerAuthChoices

Cada entrada de `providerAuthChoices` describe una opción de incorporación o autenticación.
OpenClaw lee esto antes de que se cargue el tiempo de ejecución del proveedor.

| Campo              | Obligatorio | Tipo                                            | Significado                                                                                                                  |
| ------------------ | ----------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `provider`         | Sí          | `string`                                        | Id. del proveedor al que pertenece esta opción.                                                                              |
| `method`           | Sí          | `string`                                        | Id. del método de autenticación al que enviar.                                                                               |
| `choiceId`         | Sí          | `string`                                        | Id. estable de la opción de autenticación utilizado por los flujos de incorporación y CLI.                                   |
| `choiceLabel`      | No          | `string`                                        | Etiqueta orientada al usuario. Si se omite, OpenClaw recurre a `choiceId`.                                                   |
| `choiceHint`       | No          | `string`                                        | Texto de ayuda breve para el selector.                                                                                       |
| `groupId`          | No          | `string`                                        | Id. de grupo opcional para agrupar opciones relacionadas.                                                                    |
| `groupLabel`       | No          | `string`                                        | Etiqueta orientada al usuario para ese grupo.                                                                                |
| `groupHint`        | No          | `string`                                        | Texto de ayuda breve para el grupo.                                                                                          |
| `optionKey`        | No          | `string`                                        | Clave de opción interna para flujos de autenticación simples de una sola bandera.                                            |
| `cliFlag`          | No          | `string`                                        | Nombre de la bandera de CLI, como `--openrouter-api-key`.                                                                    |
| `cliOption`        | No          | `string`                                        | Forma completa de la opción de CLI, como `--openrouter-api-key <key>`.                                                       |
| `cliDescription`   | No          | `string`                                        | Descripción utilizada en la ayuda de CLI.                                                                                    |
| `onboardingScopes` | No          | `Array<"text-inference" \| "image-generation">` | En qué superficies de incorporación debe aparecer esta opción. Si se omite, el valor predeterminado es `["text-inference"]`. |

## referencia de uiHints

`uiHints` es un mapa desde los nombres de campos de configuración hasta pequeñas sugerencias de renderizado.

```json
{
  "uiHints": {
    "apiKey": {
      "label": "API key",
      "help": "Used for OpenRouter requests",
      "placeholder": "sk-or-v1-...",
      "sensitive": true
    }
  }
}
```

Cada sugerencia de campo puede incluir:

| Campo         | Tipo       | Lo que significa                                           |
| ------------- | ---------- | ---------------------------------------------------------- |
| `label`       | `string`   | Etiqueta del campo orientada al usuario.                   |
| `help`        | `string`   | Texto de ayuda breve.                                      |
| `tags`        | `string[]` | Etiquetas de IU opcionales.                                |
| `advanced`    | `boolean`  | Marca el campo como avanzado.                              |
| `sensitive`   | `boolean`  | Marca el campo como secreto o sensible.                    |
| `placeholder` | `string`   | Texto de marcador de posición para entradas de formulario. |

## referencia de contratos

Use `contracts` solo para metadatos de propiedad de capacidades estáticas que OpenClaw puede
leer sin importar el tiempo de ejecución del complemento.

```json
{
  "contracts": {
    "speechProviders": ["openai"],
    "mediaUnderstandingProviders": ["openai", "openai-codex"],
    "imageGenerationProviders": ["openai"],
    "webSearchProviders": ["gemini"],
    "tools": ["firecrawl_search", "firecrawl_scrape"]
  }
}
```

Cada lista es opcional:

| Campo                         | Tipo       | Lo que significa                                                                                            |
| ----------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------- |
| `speechProviders`             | `string[]` | IDs de proveedor de voz que posee este complemento.                                                         |
| `mediaUnderstandingProviders` | `string[]` | IDs de proveedor de comprensión de medios que posee este complemento.                                       |
| `imageGenerationProviders`    | `string[]` | IDs de proveedor de generación de imágenes que posee este complemento.                                      |
| `webSearchProviders`          | `string[]` | IDs de proveedor de búsqueda web que posee este complemento.                                                |
| `tools`                       | `string[]` | Nombres de herramientas de agente que posee este complemento para verificaciones de contratos empaquetados. |

Los niveles superiores heredados `speechProviders`, `mediaUnderstandingProviders` y
`imageGenerationProviders` están obsoletos. Use `openclaw doctor --fix` para moverlos
bajo `contracts`; la carga normal del manifiesto ya no los trata como
propiedad de capacidades.

## Manifiesto frente a package.

Los dos archivos sirven para diferentes trabajos:

| Archivo                | Úselo para                                                                                                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw.plugin.json` | Descubrimiento, validación de configuración, metadatos de elección de autenticación e indicaciones de UI que deben existir antes de que se ejecute el código del complemento |
| `package.json`         | Metadatos de npm, instalación de dependencias y el bloque `openclaw` usado para puntos de entrada y configuración o metadatos del catálogo                                   |

Si no está seguro de dónde pertenece un metadato, use esta regla:

- si OpenClaw debe saberlo antes de cargar el código del complemento, póngalo en `openclaw.plugin.json`
- si se trata del empaquetado, archivos de entrada o del comportamiento de npm install, póngalo en `package.json`

## Requisitos del esquema JSON

- **Cada complemento debe incluir un esquema JSON**, incluso si no acepta configuración.
- Se acepta un esquema vacío (por ejemplo, `{ "type": "object", "additionalProperties": false }`).
- Los esquemas se validan en el momento de lectura/escritura de la configuración, no en tiempo de ejecución.

## Comportamiento de validación

- Las claves `channels.*` desconocidas son **errores**, a menos que el id del canal sea declarado por
  un manifiesto de complemento.
- `plugins.entries.<id>`, `plugins.allow`, `plugins.deny` y `plugins.slots.*`
  deben hacer referencia a ids de complemento **discoverables**. Los ids desconocidos son **errores**.
- Si un complemento está instalado pero tiene un manifiesto o esquema roto o faltante,
  la validación falla y Doctor informa el error del complemento.
- Si la configuración del complemento existe pero el complemento está **desactivado**, la configuración se mantiene y
  se muestra una **advertencia** en Doctor + registros.

Consulte [Referencia de configuración](/en/gateway/configuration) para el esquema completo de `plugins.*`.

## Notas

- El manifiesto es **obligatorio para los complementos nativos de OpenClaw**, incluidas las cargas del sistema de archivos local.
- El tiempo de ejecución todavía carga el módulo del complemento por separado; el manifiesto es solo para
  descubrimiento + validación.
- Solo el cargador de manifiestos lee los campos de manifiesto documentados. Evite agregar
  claves personalizadas de nivel superior aquí.
- `providerAuthEnvVars` es la ruta de metadatos ligera para sondas de autenticación, validación de marcadores de entorno
  y superficies similares de autenticación de proveedores que no deben iniciar el tiempo de ejecución del complemento
  solo para inspeccionar nombres de entorno.
- `providerAuthChoices` es la ruta de metadatos ligera para selectores de elección de autenticación,
  resolución de `--auth-choice`, mapeo de proveedor preferido y registro simple de indicadores de CLI
  de incorporación antes de que se cargue el tiempo de ejecución del proveedor. Para los metadatos del asistente
  en tiempo de ejecución que requieren código de proveedor, consulte
  [Ganchos de tiempo de ejecución del proveedor](/en/plugins/architecture#provider-runtime-hooks).
- Los tipos de complementos exclusivos se seleccionan a través de `plugins.slots.*`.
  - `kind: "memory"` es seleccionado por `plugins.slots.memory`.
  - `kind: "context-engine"` es seleccionado por `plugins.slots.contextEngine`
    (predeterminado: `legacy` integrado).
- `channels`, `providers`, `cliBackends` y `skills` se pueden omitir cuando un
  complemento no los necesita.
- Si su complemento depende de módulos nativos, documente los pasos de compilación y cualquier
  requisito de lista de permitidos del administrador de paquetes (por ejemplo, pnpm `allow-build-scripts`
  - `pnpm rebuild <package>`).
