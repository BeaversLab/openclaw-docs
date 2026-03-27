---
summary: "Manifiesto de plugin + Requisitos del esquema JSON (validación de configuración estricta)"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "Manifiesto de Plugin"
---

# Manifiesto de complemento (openclaw.plugin.)

Esta página es solo para el **manifiesto de complemento nativo de OpenClaw**.

Para diseños de paquetes compatibles, consulte [Paquetes de plugins](/es/plugins/bundles).

Los formatos de paquete compatibles utilizan diferentes archivos de manifiesto:

- Paquete Codex: `.codex-plugin/plugin.json`
- Paquete Claude: `.claude-plugin/plugin.json` o el diseño de componente Claude predeterminado
  sin manifiesto
- Paquete Cursor: `.cursor-plugin/plugin.json`

OpenClaw también detecta automáticamente esos diseños de paquetes, pero no se validan
contra el esquema `openclaw.plugin.json` descrito aquí.

Para paquetes compatibles, OpenClaw actualmente lee los metadatos del paquete más las
raíces de habilidades declaradas, las raíces de comandos de Claude, los valores predeterminados del paquete Claude `settings.json` y
los paquetes de hooks compatibles cuando el diseño coincide con las expectativas de tiempo de ejecución de OpenClaw.

Cada plugin nativo de OpenClaw **debe** incluir un archivo `openclaw.plugin.json` en la
**raíz del plugin**. OpenClaw utiliza este manifiesto para validar la configuración
**sin ejecutar el código del plugin**. Los manifiestos faltantes o no válidos se tratan como
errores del plugin y bloquean la validación de la configuración.

Vea la guía completa del sistema de plugins: [Plugins](/es/tools/plugin).
Para el modelo de capacidades nativo y la guía actual de compatibilidad externa:
[Modelo de capacidades](/es/plugins/architecture#public-capability-model).

## Qué hace este archivo

`openclaw.plugin.json` son los metadatos que OpenClaw lee antes de cargar su
código de plugin.

Úselo para:

- identidad del plugin
- validación de configuración
- metadatos de autenticación e incorporación que deben estar disponibles sin iniciar el tiempo de ejecución
  del plugin
- sugerencias de interfaz de usuario de configuración

No lo use para:

- registrar el comportamiento en tiempo de ejecución
- declarar puntos de entrada de código
- metadatos de instalación de npm

Esos pertenecen a su código de plugin y `package.json`.

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

| Campo                 | Requerido | Tipo                             | Qué significa                                                                                                                                                                                    |
| --------------------- | --------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                  | Sí        | `string`                         | Id canónico del plugin. Este es el id utilizado en `plugins.entries.<id>`.                                                                                                                       |
| `configSchema`        | Sí        | `object`                         | Esquema JSON en línea para la configuración de este plugin.                                                                                                                                      |
| `enabledByDefault`    | No        | `true`                           | Marca un complemento empaquetado como habilitado de forma predeterminada. Omítalo o establece cualquier valor que no sea `true` para dejar el complemento deshabilitado de forma predeterminada. |
| `kind`                | No        | `"memory"` \| `"context-engine"` | Declara un tipo de complemento exclusivo utilizado por `plugins.slots.*`.                                                                                                                        |
| `channels`            | No        | `string[]`                       | IDs de canales propiedad de este complemento. Se utilizan para el descubrimiento y la validación de configuración.                                                                               |
| `providers`           | No        | `string[]`                       | IDs de proveedores propiedad de este complemento.                                                                                                                                                |
| `providerAuthEnvVars` | No        | `Record<string, string[]>`       | Metadatos de entorno de autenticación de proveedores ligeros que OpenClaw puede inspeccionar sin cargar el código del complemento.                                                               |
| `providerAuthChoices` | No        | `object[]`                       | Metadatos de elección de autenticación ligeros para selectores de incorporación, resolución de proveedores preferidos y cableado simple de indicadores de CLI.                                   |
| `skills`              | No        | `string[]`                       | Directorios de habilidades (skills) para cargar, relativos a la raíz del complemento.                                                                                                            |
| `name`                | No        | `string`                         | Nombre del complemento legible por humanos.                                                                                                                                                      |
| `description`         | No        | `string`                         | Resumen breve que se muestra en las superficies del complemento.                                                                                                                                 |
| `version`             | No        | `string`                         | Versión informativa del complemento.                                                                                                                                                             |
| `uiHints`             | No        | `Record<string, object>`         | Etiquetas de interfaz de usuario, marcadores de posición e indicadores de sensibilidad para los campos de configuración.                                                                         |

## referencia de providerAuthChoices

Cada entrada de `providerAuthChoices` describe una opción de incorporación o autenticación.
OpenClaw lee esto antes de que se cargue el tiempo de ejecución del proveedor.

| Campo              | Obligatorio | Tipo                                            | Lo que significa                                                                                                             |
| ------------------ | ----------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `provider`         | Sí          | `string`                                        | ID del proveedor al que pertenece esta opción.                                                                               |
| `method`           | Sí          | `string`                                        | ID del método de autenticación al que despachar.                                                                             |
| `choiceId`         | Sí          | `string`                                        | ID de elección de autenticación estable utilizado por los flujos de CLI e incorporación.                                     |
| `choiceLabel`      | No          | `string`                                        | Etiqueta orientada al usuario. Si se omite, OpenClaw usa por defecto `choiceId`.                                             |
| `choiceHint`       | No          | `string`                                        | Texto de ayuda breve para el selector.                                                                                       |
| `groupId`          | No          | `string`                                        | Id. de grupo opcional para agrupar opciones relacionadas.                                                                    |
| `groupLabel`       | No          | `string`                                        | Etiqueta orientada al usuario para ese grupo.                                                                                |
| `groupHint`        | No          | `string`                                        | Texto de ayuda breve para el grupo.                                                                                          |
| `optionKey`        | No          | `string`                                        | Clave de opción interna para flujos de autenticación simples de una sola marca.                                              |
| `cliFlag`          | No          | `string`                                        | Nombre de la marca CLI, como `--openrouter-api-key`.                                                                         |
| `cliOption`        | No          | `string`                                        | Forma completa de la opción CLI, como `--openrouter-api-key <key>`.                                                          |
| `cliDescription`   | No          | `string`                                        | Descripción utilizada en la ayuda de CLI.                                                                                    |
| `onboardingScopes` | No          | `Array<"text-inference" \| "image-generation">` | En qué superficies de incorporación debe aparecer esta opción. Si se omite, el valor predeterminado es `["text-inference"]`. |

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

| Campo         | Tipo       | Lo que significa                                           |
| ------------- | ---------- | ---------------------------------------------------------- |
| `label`       | `string`   | Etiqueta de campo orientada al usuario.                    |
| `help`        | `string`   | Texto de ayuda breve.                                      |
| `tags`        | `string[]` | Etiquetas de interfaz de usuario opcionales.               |
| `advanced`    | `boolean`  | Marca el campo como avanzado.                              |
| `sensitive`   | `boolean`  | Marca el campo como secreto o sensible.                    |
| `placeholder` | `string`   | Texto de marcador de posición para entradas de formulario. |

## Manifiesto versus package.

Los dos archivos cumplen funciones diferentes:

| Archivo                | Úselo para                                                                                                                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw.plugin.json` | Descubrimiento, validación de configuración, metadatos de elección de autenticación e indicaciones de interfaz de usuario que deben existir antes de que se ejecute el código del complemento |
| `package.json`         | metadatos de npm, instalación de dependencias y el bloque `openclaw` utilizado para puntos de entrada y metadatos de configuración o catálogo                                                 |

Si no está seguro de dónde pertenece un metadato, use esta regla:

- si OpenClaw debe saberlo antes de cargar el código del complemento, póngalo en `openclaw.plugin.json`
- si se trata del empaquetado, archivos de entrada o del comportamiento de npm install, póngalo en `package.json`

## Requisitos de JSON Schema

- **Cada complemento debe incluir un JSON Schema**, incluso si no acepta configuración.
- Se acepta un esquema vacío (por ejemplo, `{ "type": "object", "additionalProperties": false }`).
- Los esquemas se validan en el momento de lectura/escritura de la configuración, no en tiempo de ejecución.

## Comportamiento de validación

- Las claves `channels.*` desconocidas son **errores**, a menos que el id del canal sea declarado por
  un manifiesto de complemento.
- `plugins.entries.<id>`, `plugins.allow`, `plugins.deny` y `plugins.slots.*`
  deben hacer referencia a ids de complementos **descubribles**. Los ids desconocidos son **errores**.
- Si un complemento está instalado pero tiene un manifiesto o esquema roto o faltante,
  la validación falla y Doctor informa el error del complemento.
- Si existe la configuración del complemento pero el complemento está **deshabilitado**, la configuración se mantiene y
  se muestra una **advertencia** en Doctor + registros.

Consulte [Referencia de configuración](/es/gateway/configuration) para ver el esquema completo de `plugins.*`.

## Notas

- El manifiesto es **obligatorio para los complementos nativos de OpenClaw**, incluidas las cargas del sistema de archivos local.
- El tiempo de ejecución todavía carga el módulo del complemento por separado; el manifiesto es solo para
  descubrimiento + validación.
- El cargador de manifiestos solo lee los campos de manifiesto documentados. Evite agregar
  claves personalizadas de nivel superior aquí.
- `providerAuthEnvVars` es la ruta de metadatos económica para sondas de autenticación, validación de marcadores de entorno
  y superficies similares de autenticación de proveedores que no deben iniciar el tiempo de ejecución del complemento
  solo para inspeccionar nombres de entorno.
- `providerAuthChoices` es la ruta de metadatos económica para selectores de elección de autenticación,
  resolución `--auth-choice`, mapeo de proveedor preferido y registro de indicadores CLI de incorporación simple
  antes de que se cargue el tiempo de ejecución del proveedor. Para metadatos del asistente
  de tiempo de ejecución que requieren código de proveedor, consulte
  [Ganchos de tiempo de ejecución del proveedor](/es/plugins/architecture#provider-runtime-hooks).
- Los tipos de complementos exclusivos se seleccionan a través de `plugins.slots.*`.
  - `kind: "memory"` es seleccionado por `plugins.slots.memory`.
  - `kind: "context-engine"` es seleccionado por `plugins.slots.contextEngine`
    (predeterminado: integrado `legacy`).
- `channels`, `providers` y `skills` se pueden omitir cuando un complemento no
  los necesita.
- Si su complemento depende de módulos nativos, documente los pasos de compilación y cualquier
  requisito de lista de permitidos del administrador de paquetes (por ejemplo, pnpm `allow-build-scripts`
  - `pnpm rebuild <package>`).

import es from "/components/footer/es.mdx";

<es />
