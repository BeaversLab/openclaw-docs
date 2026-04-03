---
summary: "Manifiesto del complemento + requisitos de esquema JSON (validación de configuración estricta)"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "Manifiesto del complemento"
---

# Manifiesto de complemento (openclaw.plugin.)

Esta página es solo para el **manifiesto de complemento nativo de OpenClaw**.

Para diseños de paquetes compatibles, consulte [Paquetes de complementos](/en/plugins/bundles).

Los formatos de paquete compatibles utilizan diferentes archivos de manifiesto:

- Paquete Codex: `.codex-plugin/plugin.json`
- Paquete Claude: `.claude-plugin/plugin.json` o el diseño del componente Claude predeterminado
  sin manifiesto
- Paquete Cursor: `.cursor-plugin/plugin.json`

OpenClaw también detecta automáticamente esos diseños de paquetes, pero no se validan
contra el esquema `openclaw.plugin.json` descrito aquí.

Para paquetes compatibles, OpenClaw actualmente lee los metadatos del paquete más las raíces
de habilidades declaradas, las raíces de comandos de Claude, los valores predeterminados del paquete Claude `settings.json` y
los paquetes de enlaces admitidos cuando el diseño coincide con las expectativas de tiempo de ejecución de OpenClaw.

Cada complemento nativo de OpenClaw **debe** incluir un archivo `openclaw.plugin.json` en la
**raíz del complemento**. OpenClaw usa este manifiesto para validar la configuración
**sin ejecutar el código del complemento**. Los manifiestos faltantes o no válidos se tratan como
errores del complemento y bloquean la validación de la configuración.

Consulte la guía completa del sistema de complementos: [Complementos](/en/tools/plugin).
Para el modelo de capacidades nativo y la guía actual de compatibilidad externa:
[Modelo de capacidades](/en/plugins/architecture#public-capability-model).

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
- sugerencias de la interfaz de usuario de configuración

No lo use para:

- registrar el comportamiento en tiempo de ejecución
- declarar puntos de entrada de código
- metadatos de instalación de npm

Esos pertenecen a su código de complemento y `package.json`.

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

## Ejemplo rico

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

| Campo                 | Obligatorio | Tipo                             | Lo que significa                                                                                                                                                                                  |
| --------------------- | ----------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                  | Sí          | `string`                         | Id. canónico del complemento. Este es el id. utilizado en `plugins.entries.<id>`.                                                                                                                 |
| `configSchema`        | Sí          | `object`                         | Esquema JSON en línea para la configuración de este complemento.                                                                                                                                  |
| `enabledByDefault`    | No          | `true`                           | Marca un complemento empaquetado como habilitado de forma predeterminada. Omítalo o establezca cualquier valor que no sea `true` para dejar el complemento deshabilitado de forma predeterminada. |
| `kind`                | No          | `"memory"` \| `"context-engine"` | Declara un tipo de complemento exclusivo utilizado por `plugins.slots.*`.                                                                                                                         |
| `channels`            | No          | `string[]`                       | ID de canal propiedad de este complemento. Se utiliza para el descubrimiento y la validación de la configuración.                                                                                 |
| `providers`           | No          | `string[]`                       | ID de proveedor propiedad de este complemento.                                                                                                                                                    |
| `cliBackends`         | No          | `string[]`                       | ID de backend de inferencia de CLI propiedad de este complemento. Se utiliza para la autoactivación al inicio desde referencias de configuración explícitas.                                      |
| `providerAuthEnvVars` | No          | `Record<string, string[]>`       | Metadatos de entorno de autenticación de proveedor económicos que OpenClaw puede inspeccionar sin cargar el código del complemento.                                                               |
| `providerAuthChoices` | No          | `object[]`                       | Metadatos de elección de autenticación económicos para selectores de incorporación, resolución de proveedor preferido y cableado simple de indicadores de CLI.                                    |
| `contracts`           | No          | `object`                         | Instantánea estática de capacidades empaquetadas para voz, comprensión de medios, generación de imágenes, búsqueda web y propiedad de herramientas.                                               |
| `skills`              | No          | `string[]`                       | Directorios de habilidades (skills) para cargar, relativos a la raíz del complemento.                                                                                                             |
| `name`                | No          | `string`                         | Nombre del complemento legible por humanos.                                                                                                                                                       |
| `description`         | No          | `string`                         | Resumen breve que se muestra en las superficies del complemento.                                                                                                                                  |
| `version`             | No          | `string`                         | Versión del complemento informativa.                                                                                                                                                              |
| `uiHints`             | No          | `Record<string, object>`         | Etiquetas de interfaz de usuario, marcadores de posición e indicadores de sensibilidad para los campos de configuración.                                                                          |

## referencia de providerAuthChoices

Cada entrada de `providerAuthChoices` describe una elección de incorporación o autenticación.
OpenClaw lee esto antes de que se cargue el tiempo de ejecución del proveedor.

| Campo              | Obligatorio | Tipo                                            | Lo que significa                                                                                                                 |
| ------------------ | ----------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `provider`         | Sí          | `string`                                        | ID de proveedor al que pertenece esta elección.                                                                                  |
| `method`           | Sí          | `string`                                        | Id. del método de autenticación al que enviar.                                                                                   |
| `choiceId`         | Sí          | `string`                                        | Id. establecido de elección de autenticación que se usa en los flujos de incorporación y de CLI.                                 |
| `choiceLabel`      | No          | `string`                                        | Etiqueta visible para el usuario. Si se omite, OpenClaw usa `choiceId`.                                                          |
| `choiceHint`       | No          | `string`                                        | Texto de ayuda breve para el selector.                                                                                           |
| `groupId`          | No          | `string`                                        | Id. de grupo opcional para agrupar opciones relacionadas.                                                                        |
| `groupLabel`       | No          | `string`                                        | Etiqueta visible para el usuario para ese grupo.                                                                                 |
| `groupHint`        | No          | `string`                                        | Texto de ayuda breve para el grupo.                                                                                              |
| `optionKey`        | No          | `string`                                        | Clave de opción interna para flujos de autenticación sencillos de una sola marca.                                                |
| `cliFlag`          | No          | `string`                                        | Nombre de la marca de CLI, como `--openrouter-api-key`.                                                                          |
| `cliOption`        | No          | `string`                                        | Forma completa de la opción de CLI, como `--openrouter-api-key <key>`.                                                           |
| `cliDescription`   | No          | `string`                                        | Descripción utilizada en la ayuda de CLI.                                                                                        |
| `onboardingScopes` | No          | `Array<"text-inference" \| "image-generation">` | Superficies de incorporación en las que debe aparecer esta opción. Si se omite, el valor predeterminado es `["text-inference"]`. |

## Referencia de uiHints

`uiHints` es un mapa de nombres de campos de configuración a pequeñas sugerencias de renderizado.

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

| Campo         | Tipo       | Lo que significa                                                |
| ------------- | ---------- | --------------------------------------------------------------- |
| `label`       | `string`   | Etiqueta del campo visible para el usuario.                     |
| `help`        | `string`   | Texto de ayuda breve.                                           |
| `tags`        | `string[]` | Etiquetas de IU opcionales.                                     |
| `advanced`    | `boolean`  | Marca el campo como avanzado.                                   |
| `sensitive`   | `boolean`  | Marca el campo como secreto o confidencial.                     |
| `placeholder` | `string`   | Texto de marcador de posición para las entradas del formulario. |

## referencia de contratos

Use `contracts` solo para metadatos estáticos de propiedad de capacidades que OpenClaw pueda
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

| Campo                         | Tipo       | Lo que significa                                                                                         |
| ----------------------------- | ---------- | -------------------------------------------------------------------------------------------------------- |
| `speechProviders`             | `string[]` | IDs de proveedores de voz que posee este complemento.                                                    |
| `mediaUnderstandingProviders` | `string[]` | IDs de proveedores de comprensión de medios que posee este complemento.                                  |
| `imageGenerationProviders`    | `string[]` | IDs de proveedores de generación de imágenes que posee este complemento.                                 |
| `webSearchProviders`          | `string[]` | IDs de proveedores de búsqueda web que posee este complemento.                                           |
| `tools`                       | `string[]` | Nombres de herramientas de agente que posee este complemento para verificaciones de contratos agrupados. |

Los niveles superiores heredados `speechProviders`, `mediaUnderstandingProviders` y
`imageGenerationProviders` están obsoletos. Use `openclaw doctor --fix` para moverlos
bajo `contracts`; la carga normal del manifiesto ya no los trata como
propiedad de capacidades.

## Manifiesto versus package.

Los dos archivos cumplen funciones diferentes:

| Archivo                | Úselo para                                                                                                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw.plugin.json` | Descubrimiento, validación de configuración, metadatos de elección de autenticación e indicaciones de UI que deben existir antes de que se ejecute el código del complemento |
| `package.json`         | Metadatos de npm, instalación de dependencias y el bloque `openclaw` utilizado para puntos de entrada y configuración o metadatos del catálogo                               |

Si no está seguro de dónde pertenece un metadato, use esta regla:

- si OpenClaw debe conocerlo antes de cargar el código del complemento, póngalo en `openclaw.plugin.json`
- si se trata del empaquetado, los archivos de entrada o el comportamiento de instalación de npm, póngalo en `package.json`

## Requisitos del esquema JSON

- **Cada complemento debe incluir un esquema JSON**, incluso si no acepta ninguna configuración.
- Se acepta un esquema vacío (por ejemplo, `{ "type": "object", "additionalProperties": false }`).
- Los esquemas se validan en el momento de lectura/escritura de la configuración, no en tiempo de ejecución.

## Comportamiento de validación

- Las claves `channels.*` desconocidas son **errores**, a menos que el ID del canal sea declarado por
  un manifiesto de complemento.
- `plugins.entries.<id>`, `plugins.allow`, `plugins.deny` y `plugins.slots.*`
  deben hacer referencia a IDs de plugins **detectables**. Los IDs desconocidos son **errores**.
- Si un complemento está instalado pero tiene un manifiesto o esquema roto o faltante,
  la validación falla y Doctor informa el error del complemento.
- Si existe la configuración del complemento pero el complemento está **deshabilitado**, la configuración se mantiene y
  se muestra una **advertencia** en Doctor + registros.

Consulte [Referencia de configuración](/en/gateway/configuration) para ver el esquema completo de `plugins.*`.

## Notas

- El manifiesto es **obligatorio para los complementos nativos de OpenClaw**, incluidas las cargas del sistema de archivos local.
- El tiempo de ejecución todavía carga el módulo del complemento por separado; el manifiesto es solo para
  descubrimiento + validación.
- Solo se leen los campos de manifiesto documentados por el cargador de manifiestos. Evite agregar
  claves personalizadas de nivel superior aquí.
- `providerAuthEnvVars` es la ruta de metadatos económica para sondas de autenticación, validación de marcadores de entorno
  y superficies de autenticación de proveedor similares que no deben iniciar el tiempo de ejecución del complemento
  solo para inspeccionar los nombres de las variables de entorno.
- `providerAuthChoices` es la ruta de metadatos económica para selectores de elección de autenticación,
  resolución de `--auth-choice`, mapeo de proveedor preferido y registro de indicadores de CLI de incorporación simple
  antes de que se cargue el tiempo de ejecución del proveedor. Para metadatos de asistente
  de tiempo de ejecución que requieren código de proveedor, consulte
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

## Relacionado

- [Construcción de complementos](/en/plugins/building-plugins) — introducción a los complementos
- [Arquitectura del complemento](/en/plugins/architecture) — arquitectura interna
- [Resumen del SDK](/en/plugins/sdk-overview) — referencia del SDK del complemento
