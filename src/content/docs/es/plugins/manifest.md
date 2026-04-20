---
summary: "Manifiesto del complemento + Requisitos del esquema JSON (validación de configuración estricta)"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "Manifiesto del complemento"
---

# Manifiesto de complemento (openclaw.plugin.)

Esta página es solo para el **manifiesto de complemento nativo de OpenClaw**.

Para diseños de paquetes compatibles, consulte [Paquetes de complementos](/es/plugins/bundles).

Los formatos de paquete compatibles utilizan diferentes archivos de manifiesto:

- Paquete Codex: `.codex-plugin/plugin.json`
- Paquete Claude: `.claude-plugin/plugin.json` o el diseño predeterminado de componentes de Claude
  sin un manifiesto
- Paquete Cursor: `.cursor-plugin/plugin.json`

OpenClaw también detecta automáticamente esos diseños de paquetes, pero no se validan
contra el esquema `openclaw.plugin.json` descrito aquí.

Para paquetes compatibles, OpenClaw actualmente lee los metadatos del paquete más las
raíces de habilidades declaradas, las raíces de comandos de Claude, los valores predeterminados
`settings.json` del paquete Claude,
los valores predeterminados de LSP del paquete Claude y los paquetes de enlaces admitidos cuando el diseño coincide
con las expectativas de tiempo de ejecución de OpenClaw.

Cada complemento nativo de OpenClaw **debe** incluir un archivo `openclaw.plugin.json` en la
**raíz del complemento**. OpenClaw utiliza este manifiesto para validar la configuración
**sin ejecutar el código del complemento**. Los manifiestos que faltan o no son válidos se tratan como
errores del complemento y bloquean la validación de la configuración.

Consulte la guía completa del sistema de complementos: [Complementos](/es/tools/plugin).
Para el modelo de capacidades nativo y la guía actual de compatibilidad externa:
[Modelo de capacidades](/es/plugins/architecture#public-capability-model).

## Qué hace este archivo

`openclaw.plugin.json` son los metadatos que OpenClaw lee antes de cargar su
código de complemento.

Úselo para:

- identidad del plugin
- validación de configuración
- metadatos de autenticación e incorporación que deben estar disponibles sin iniciar el tiempo de ejecución
  del plugin
- sugerencias de activación económicas que las superficies del plano de control pueden inspeccionar antes de que el tiempo de ejecución
  cargue
- descriptores de configuración económicos que las superficies de configuración/incorporación pueden inspeccionar antes de que el
  tiempo de ejecución cargue
- metadatos de alias y habilitación automática que deben resolverse antes de que se cargue el tiempo de ejecución del complemento
- metadatos de propiedad abreviada de familia de modelos que deben activar automáticamente el
  complemento antes de que se cargue el tiempo de ejecución
- instantáneas estáticas de propiedad de capacidades utilizadas para el cableado de compatibilidad agrupado y
  cobertura de contratos
- metadatos económicos del ejecutor de QA que el host `openclaw qa` compartido puede inspeccionar
  antes de que se cargue el tiempo de ejecución del complemento
- metadatos de configuración específicos del canal que deben fusionarse en el catálogo y las superficies de validación
  sin cargar el tiempo de ejecución
- sugerencias de la interfaz de usuario de configuración

No lo use para:

- registrar el comportamiento del tiempo de ejecución
- declarar puntos de entrada del código
- metadatos de instalación de npm

Esos pertenecen al código de su complemento y `package.json`.

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
  "modelSupport": {
    "modelPrefixes": ["router-"]
  },
  "cliBackends": ["openrouter-cli"],
  "providerAuthEnvVars": {
    "openrouter": ["OPENROUTER_API_KEY"]
  },
  "providerAuthAliases": {
    "openrouter-coding": "openrouter"
  },
  "channelEnvVars": {
    "openrouter-chatops": ["OPENROUTER_CHATOPS_TOKEN"]
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

| Campo                               | Obligatorio | Tipo                             | Lo que significa                                                                                                                                                                                                                                                            |
| ----------------------------------- | ----------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                | Sí          | `string`                         | Id. canónico del complemento. Este es el id. utilizado en `plugins.entries.<id>`.                                                                                                                                                                                           |
| `configSchema`                      | Sí          | `object`                         | Esquema JSON en línea para la configuración de este complemento.                                                                                                                                                                                                            |
| `enabledByDefault`                  | No          | `true`                           | Marca un complemento empaquetado como habilitado de manera predeterminada. Omítalo o establezca cualquier valor que no sea `true` para dejar el complemento deshabilitado de manera predeterminada.                                                                         |
| `legacyPluginIds`                   | No          | `string[]`                       | Id. heredados que se normalizan a este id. canónico del complemento.                                                                                                                                                                                                        |
| `autoEnableWhenConfiguredProviders` | No          | `string[]`                       | Id. de proveedores que deben habilitar automáticamente este complemento cuando la autenticación, la configuración o las referencias de modelo los mencionen.                                                                                                                |
| `kind`                              | No          | `"memory"` \| `"context-engine"` | Declara una clase de complemento exclusiva utilizada por `plugins.slots.*`.                                                                                                                                                                                                 |
| `channels`                          | No          | `string[]`                       | Id. de canales propiedad de este complemento. Se utiliza para el descubrimiento y la validación de la configuración.                                                                                                                                                        |
| `providers`                         | No          | `string[]`                       | Id. de proveedores propiedad de este complemento.                                                                                                                                                                                                                           |
| `modelSupport`                      | No          | `object`                         | Metadatos abreviados de familia de modelos propiedad del manifiesto que se utilizan para cargar automáticamente el complemento antes del tiempo de ejecución.                                                                                                               |
| `cliBackends`                       | No          | `string[]`                       | Id. de backend de inferencia de CLI propiedad de este complemento. Se utiliza para la autoactivación al inicio a partir de referencias de configuración explícitas.                                                                                                         |
| `commandAliases`                    | No          | `object[]`                       | Nombres de comandos propiedad de este complemento que deben producir diagnóstico de configuración y CLI con reconocimiento del complemento antes de las cargas del tiempo de ejecución.                                                                                     |
| `providerAuthEnvVars`               | No          | `Record<string, string[]>`       | Metadatos baratos de entorno de autenticación de proveedores que OpenClaw puede inspeccionar sin cargar el código del complemento.                                                                                                                                          |
| `providerAuthAliases`               | No          | `Record<string, string>`         | Ids de proveedores que deben reutilizar otro id de proveedor para la búsqueda de autenticación, por ejemplo, un proveedor de codificación que comparte la clave de API del proveedor base y los perfiles de autenticación.                                                  |
| `channelEnvVars`                    | No          | `Record<string, string[]>`       | Metadatos de entorno de canal económicos que OpenClaw puede inspeccionar sin cargar el código del complemento. Úselo para la configuración de canal impulsada por entorno o superficies de autenticación que los asistentes genéricos de inicio/configuración deberían ver. |
| `providerAuthChoices`               | No          | `object[]`                       | Metadatos económicos de elección de autenticación para selectores de incorporación, resolución de proveedor preferido y cableado simple de indicadores de CLI.                                                                                                              |
| `activation`                        | No          | `object`                         | Pistas de activación económicas para la carga activada por proveedor, comando, canal, ruta y capacidad. Solo metadatos; el tiempo de ejecución del complemento aún posee el comportamiento real.                                                                            |
| `setup`                             | No          | `object`                         | Descriptores económicos de configuración/incorporación que las superficies de descubrimiento y configuración pueden inspeccionar sin cargar el tiempo de ejecución del complemento.                                                                                         |
| `qaRunners`                         | No          | `object[]`                       | Descriptores económicos de ejecutor de QA utilizados por el host `openclaw qa` compartido antes de que se cargue el tiempo de ejecución del complemento.                                                                                                                    |
| `contracts`                         | No          | `object`                         | Instantánea estática agrupada de capacidades para voz, transcripción en tiempo real, voz en tiempo real, comprensión de medios, generación de imágenes, generación de música, generación de video, obtención web, búsqueda web y propiedad de herramientas.                 |
| `channelConfigs`                    | No          | `Record<string, object>`         | Metadatos de configuración de canal propiedad del manifiesto fusionados en las superficies de descubrimiento y validación antes de que se cargue el tiempo de ejecución.                                                                                                    |
| `skills`                            | No          | `string[]`                       | Directorios de habilidades (skills) para cargar, relativos a la raíz del complemento.                                                                                                                                                                                       |
| `name`                              | No          | `string`                         | Nombre del complemento legible por humanos.                                                                                                                                                                                                                                 |
| `description`                       | No          | `string`                         | Resumen breve que se muestra en las superficies del complemento.                                                                                                                                                                                                            |
| `version`                           | No          | `string`                         | Versión del complemento informativa.                                                                                                                                                                                                                                        |
| `uiHints`                           | No          | `Record<string, object>`         | Etiquetas de interfaz de usuario, marcadores de posición y pistas de sensibilidad para los campos de configuración.                                                                                                                                                         |

## Referencia de providerAuthChoices

Cada entrada de `providerAuthChoices` describe una opción de incorporación o autenticación.
OpenClaw lee esto antes de que se cargue el tiempo de ejecución del proveedor.

| Campo                 | Obligatorio | Tipo                                            | Significado                                                                                                        |
| --------------------- | ----------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `provider`            | Sí          | `string`                                        | ID del proveedor al que pertenece esta opción.                                                                     |
| `method`              | Sí          | `string`                                        | ID del método de autenticación al que enviar.                                                                      |
| `choiceId`            | Sí          | `string`                                        | ID de opción de autenticación estable utilizado por los flujos de incorporación y CLI.                             |
| `choiceLabel`         | No          | `string`                                        | Etiqueta visible para el usuario. Si se omite, OpenClaw recurre a `choiceId`.                                      |
| `choiceHint`          | No          | `string`                                        | Texto de ayuda breve para el selector.                                                                             |
| `assistantPriority`   | No          | `number`                                        | Los valores más bajos se ordenan antes en los selectores interactivos impulsados por el asistente.                 |
| `assistantVisibility` | No          | `"visible"` \| `"manual-only"`                  | Oculta la opción de los selectores del asistente, pero permite la selección manual de CLI.                         |
| `deprecatedChoiceIds` | No          | `string[]`                                      | IDs de opciones heredadas que deben redirigir a los usuarios a esta opción de reemplazo.                           |
| `groupId`             | No          | `string`                                        | ID de grupo opcional para agrupar opciones relacionadas.                                                           |
| `groupLabel`          | No          | `string`                                        | Etiqueta visible para el usuario para ese grupo.                                                                   |
| `groupHint`           | No          | `string`                                        | Texto de ayuda breve para el grupo.                                                                                |
| `optionKey`           | No          | `string`                                        | Clave de opción interna para flujos de autenticación simples de una sola bandera.                                  |
| `cliFlag`             | No          | `string`                                        | Nombre de la bandera de CLI, como `--openrouter-api-key`.                                                          |
| `cliOption`           | No          | `string`                                        | Forma completa de la opción de CLI, como `--openrouter-api-key <key>`.                                             |
| `cliDescription`      | No          | `string`                                        | Descripción utilizada en la ayuda de CLI.                                                                          |
| `onboardingScopes`    | No          | `Array<"text-inference" \| "image-generation">` | En qué superficies de incorporación debe aparecer esta elección. Si se omite, por defecto es `["text-inference"]`. |

## referencia de commandAliases

Use `commandAliases` cuando un complemento posee un nombre de comando de tiempo de ejecución que los usuarios pueden poner por error en `plugins.allow` o intentar ejecutar como un comando CLI raíz. OpenClaw utiliza estos metadatos para diagnósticos sin importar el código de tiempo de ejecución del complemento.

```json
{
  "commandAliases": [
    {
      "name": "dreaming",
      "kind": "runtime-slash",
      "cliCommand": "memory"
    }
  ]
}
```

| Campo        | Obligatorio | Tipo              | Lo que significa                                                                 |
| ------------ | ----------- | ----------------- | -------------------------------------------------------------------------------- |
| `name`       | Sí          | `string`          | Nombre del comando que pertenece a este complemento.                             |
| `kind`       | No          | `"runtime-slash"` | Marca el alias como un comando de barra de chat en lugar de un comando CLI raíz. |
| `cliCommand` | No          | `string`          | Comando CLI raíz relacionado que sugerir para operaciones CLI, si existe uno.    |

## referencia de activation

Use `activation` cuando el complemento puede declarar de forma económica qué eventos del plano de control deben activarlo más adelante.

## referencia de qaRunners

Use `qaRunners` cuando un complemento contribuye con uno o más ejecutores de transporte bajo la raíz `openclaw qa` compartida. Mantenga estos metadatos económicos y estáticos; el tiempo de ejecución del complemento aún posee el registro CLI real a través de una superficie `runtime-api.ts` ligera que exporta `qaRunnerCliRegistrations`.

```json
{
  "qaRunners": [
    {
      "commandName": "matrix",
      "description": "Run the Docker-backed Matrix live QA lane against a disposable homeserver"
    }
  ]
}
```

| Campo         | Obligatorio | Tipo     | Lo que significa                                                                          |
| ------------- | ----------- | -------- | ----------------------------------------------------------------------------------------- |
| `commandName` | Sí          | `string` | Subcomando montado debajo de `openclaw qa`, por ejemplo `matrix`.                         |
| `description` | No          | `string` | Texto de ayuda alternativo que se usa cuando el host compartido necesita un comando stub. |

Este bloque es solo metadatos. No registra el comportamiento del tiempo de ejecución y no reemplaza `register(...)`, `setupEntry` u otros puntos de entrada de tiempo de ejecución/complemento. Los consumidores actuales lo usan como una sugerencia de reducción antes de la carga más amplia del complemento, por lo que la falta de metadatos de activación generalmente solo cuesta rendimiento; no debería cambiar la corrección mientras aún existan respaldos de propiedad de manifiesto heredados.

```json
{
  "activation": {
    "onProviders": ["openai"],
    "onCommands": ["models"],
    "onChannels": ["web"],
    "onRoutes": ["gateway-webhook"],
    "onCapabilities": ["provider", "tool"]
  }
}
```

| Campo            | Obligatorio | Tipo                                                 | Lo que significa                                                                                       |
| ---------------- | ----------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `onProviders`    | No          | `string[]`                                           | Ids de proveedores que deben activar este complemento cuando se soliciten.                             |
| `onCommands`     | No          | `string[]`                                           | Ids de comandos que deben activar este complemento.                                                    |
| `onChannels`     | No          | `string[]`                                           | Ids de canales que deben activar este complemento.                                                     |
| `onRoutes`       | No          | `string[]`                                           | Tipos de rutas que deben activar este complemento.                                                     |
| `onCapabilities` | No          | `Array<"provider" \| "channel" \| "tool" \| "hook">` | Sugerencias de capacidades amplias utilizadas por la planificación de activación del plano de control. |

Consumidores activos actuales:

- la planificación de la CLI activada por comandos recurre a la herencia
  `commandAliases[].cliCommand` o `commandAliases[].name`
- la planificación de configuración/canal activada por canales recurre a la herencia `channels[]`
  cuando falta el metadato de activación de canal explícito
- la planificación de configuración/tiempo de ejecución activada por proveedores recurre a la herencia
  `providers[]` y a la propiedad de nivel superior `cliBackends[]` cuando falta el
  metadato de activación de proveedor explícito

## referencia de configuración

Use `setup` cuando las superficies de configuración e incorporación necesiten metadatos
propiedad del complemento económicos antes de que se cargue el tiempo de ejecución.

```json
{
  "setup": {
    "providers": [
      {
        "id": "openai",
        "authMethods": ["api-key"],
        "envVars": ["OPENAI_API_KEY"]
      }
    ],
    "cliBackends": ["openai-cli"],
    "configMigrations": ["legacy-openai-auth"],
    "requiresRuntime": false
  }
}
```

El `cliBackends` de nivel superior sigue siendo válido y continúa describiendo los backends
de inferencia de la CLI. `setup.cliBackends` es la superficie de descriptor específica para la configuración
para los flujos de plano de control/configuración que deben mantenerse solo como metadatos.

Cuando están presentes, `setup.providers` y `setup.cliBackends` son la superficie de búsqueda
preferida con prioridad de descriptor para el descubrimiento de configuración. Si el descriptor solo
limita el complemento candidato y la configuración aún necesita enlaces de tiempo de ejecución
más ricos, establezca `requiresRuntime: true` y mantenga `setup-api` en su lugar como la
ruta de ejecución de reserva.

Debido a que la búsqueda de configuración puede ejecutar código `setup-api` propiedad del complemento, los valores
normalizados `setup.providers[].id` y `setup.cliBackends[]` deben mantenerse únicos entre
los complementos descubiertos. La propiedad ambigua falla cerrada en lugar de elegir un
ganador del orden de descubrimiento.

### referencia de setup.providers

| Campo         | Obligatorio | Tipo       | Lo que significa                                                                                                                                           |
| ------------- | ----------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`          | Sí          | `string`   | Id del proveedor expuesto durante la configuración o incorporación. Mantenga los ids normalizados globalmente únicos.                                      |
| `authMethods` | No          | `string[]` | Ids de métodos de configuración/autenticación que este proveedor admite sin cargar el tiempo de ejecución completo.                                        |
| `envVars`     | No          | `string[]` | Variables de entorno que las superficies genéricas de configuración/estado pueden verificar antes de que se cargue el tiempo de ejecución del complemento. |

### campos de configuración

| Campo              | Requerido | Tipo       | Lo que significa                                                                                                                                                 |
| ------------------ | --------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `providers`        | No        | `object[]` | Descriptores de configuración del proveedor expuestos durante la configuración e incorporación.                                                                  |
| `cliBackends`      | No        | `string[]` | Ids de backend en tiempo de configuración utilizados para la búsqueda de configuración basada en descriptores. Mantenga los ids normalizados globalmente únicos. |
| `configMigrations` | No        | `string[]` | Ids de migración de configuración propiedad de la superficie de configuración de este complemento.                                                               |
| `requiresRuntime`  | No        | `boolean`  | Si la configuración aún necesita la ejecución de `setup-api` después de la búsqueda del descriptor.                                                              |

## referencia de uiHints

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
| `label`       | `string`   | Etiqueta del campo orientada al usuario.                   |
| `help`        | `string`   | Texto de ayuda breve.                                      |
| `tags`        | `string[]` | Etiquetas de IU opcionales.                                |
| `advanced`    | `boolean`  | Marca el campo como avanzado.                              |
| `sensitive`   | `boolean`  | Marca el campo como secreto o confidencial.                |
| `placeholder` | `string`   | Texto de marcador de posición para entradas de formulario. |

## referencia de contratos

Use `contracts` solo para metadatos de propiedad de capacidad estática que OpenClaw puede
leer sin importar el tiempo de ejecución del complemento.

```json
{
  "contracts": {
    "speechProviders": ["openai"],
    "realtimeTranscriptionProviders": ["openai"],
    "realtimeVoiceProviders": ["openai"],
    "mediaUnderstandingProviders": ["openai", "openai-codex"],
    "imageGenerationProviders": ["openai"],
    "videoGenerationProviders": ["qwen"],
    "webFetchProviders": ["firecrawl"],
    "webSearchProviders": ["gemini"],
    "tools": ["firecrawl_search", "firecrawl_scrape"]
  }
}
```

Cada lista es opcional:

| Campo                            | Tipo       | Lo que significa                                                                                                        |
| -------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| `speechProviders`                | `string[]` | Ids de proveedores de voz que posee este complemento.                                                                   |
| `realtimeTranscriptionProviders` | `string[]` | Ids de proveedor de transcripción en tiempo real de los que este complemento es propietario.                            |
| `realtimeVoiceProviders`         | `string[]` | Ids de proveedor de voz en tiempo real de los que este complemento es propietario.                                      |
| `mediaUnderstandingProviders`    | `string[]` | Ids de proveedor de comprensión multimedia de los que este complemento es propietario.                                  |
| `imageGenerationProviders`       | `string[]` | Ids de proveedor de generación de imágenes de los que este complemento es propietario.                                  |
| `videoGenerationProviders`       | `string[]` | Ids de proveedor de generación de video de los que este complemento es propietario.                                     |
| `webFetchProviders`              | `string[]` | Ids de proveedor de recuperación web de los que este complemento es propietario.                                        |
| `webSearchProviders`             | `string[]` | Ids de proveedor de búsqueda web de los que este complemento es propietario.                                            |
| `tools`                          | `string[]` | Nombres de herramientas de agente de los que este complemento es propietario para verificaciones de contrato agrupadas. |

## Referencia de channelConfigs

Use `channelConfigs` cuando un complemento de canal necesite metadatos de configuración económicos antes de
que se cargue el tiempo de ejecución.

```json
{
  "channelConfigs": {
    "matrix": {
      "schema": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "homeserverUrl": { "type": "string" }
        }
      },
      "uiHints": {
        "homeserverUrl": {
          "label": "Homeserver URL",
          "placeholder": "https://matrix.example.com"
        }
      },
      "label": "Matrix",
      "description": "Matrix homeserver connection",
      "preferOver": ["matrix-legacy"]
    }
  }
}
```

Cada entrada de canal puede incluir:

| Campo         | Tipo                     | Lo que significa                                                                                                                          |
| ------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `schema`      | `object`                 | Esquema JSON para `channels.<id>`. Requerido para cada entrada de configuración de canal declarada.                                       |
| `uiHints`     | `Record<string, object>` | Etiquetas de interfaz de usuario opcionales/marcadores de posición/sugerencias confidenciales para esa sección de configuración de canal. |
| `label`       | `string`                 | Etiqueta de canal fusionada en el selector y las superficies de inspección cuando los metadatos del tiempo de ejecución no están listos.  |
| `description` | `string`                 | Descripción breve del canal para superficies de inspección y catálogo.                                                                    |
| `preferOver`  | `string[]`               | Ids de complementos heredados o de menor prioridad que este canal debe superar en las superficies de selección.                           |

## Referencia de modelSupport

Use `modelSupport` cuando OpenClaw debe inferir su complemento de proveedor a partir de
ids de modelo abreviados como `gpt-5.4` o `claude-sonnet-4.6` antes de que se cargue el tiempo de ejecución del complemento.

```json
{
  "modelSupport": {
    "modelPrefixes": ["gpt-", "o1", "o3", "o4"],
    "modelPatterns": ["^computer-use-preview"]
  }
}
```

OpenClaw aplica esta precedencia:

- las referencias `provider/model` explícitas utilizan los metadatos del manifiesto `providers` propietario
- `modelPatterns` ganan a `modelPrefixes`
- si coinciden tanto un plugin no empaquetado como uno empaquetado, el plugin no
  empaquetado gana
- la ambigüedad restante se ignora hasta que el usuario o la configuración especifiquen un proveedor

Campos:

| Campo           | Tipo       | Lo que significa                                                                                                           |
| --------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| `modelPrefixes` | `string[]` | Prefijos coincidentes con `startsWith` contra identificadores de modelo abreviados.                                        |
| `modelPatterns` | `string[]` | Fuentes de regex coincidentes contra identificadores de modelo abreviados después de la eliminación del sufijo del perfil. |

Las claves de capacidades de nivel superior heredadas están obsoletas. Use `openclaw doctor --fix` para
mover `speechProviders`, `realtimeTranscriptionProviders`,
`realtimeVoiceProviders`, `mediaUnderstandingProviders`,
`imageGenerationProviders`, `videoGenerationProviders`,
`webFetchProviders` y `webSearchProviders` bajo `contracts`; la carga
normal del manifiesto ya no trata esos campos de nivel superior como propiedad
de la capacidad.

## Manifiesto versus package.

Los dos archivos sirven para diferentes trabajos:

| Archivo                | Úselo para                                                                                                                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw.plugin.json` | Descubrimiento, validación de configuración, metadatos de elección de autenticación e indicaciones de interfaz de usuario que deben existir antes de que se ejecute el código del complemento |
| `package.json`         | metadatos de npm, instalación de dependencias y el bloque `openclaw` utilizado para puntos de entrada, restricción de instalación, configuración o metadatos del catálogo                     |

Si no está seguro de dónde pertenece un metadato, use esta regla:

- si OpenClaw debe saberlo antes de cargar el código del complemento, póngalo en `openclaw.plugin.json`
- si se trata del empaquetado, archivos de entrada o del comportamiento de instalación de npm, póngalo en `package.json`

### campos de package. que afectan el descubrimiento

Algunos metadatos de complementos previos a la ejecución residen intencionalmente en `package.json` bajo el
bloque `openclaw` en lugar de `openclaw.plugin.json`.

Ejemplos importantes:

| Campo                                                             | Lo que significa                                                                                                                                                                 |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw.extensions`                                             | Declara los puntos de entrada del complemento nativo.                                                                                                                            |
| `openclaw.setupEntry`                                             | Punto de entrada ligero exclusivo de configuración que se usa durante la integración y el inicio diferido del canal.                                                             |
| `openclaw.channel`                                                | Metadatos ligeros de catálogo de canales, como etiquetas, rutas de documentos, alias y texto de selección.                                                                       |
| `openclaw.channel.configuredState`                                | Metadatos del comprobador de estado configurado ligero que pueden responder "¿ya existe la configuración solo de entorno?" sin cargar el tiempo de ejecución completo del canal. |
| `openclaw.channel.persistedAuthState`                             | Metadatos del comprobador de autenticación persistida ligero que pueden responder "¿ya hay algo iniciado sesión?" sin cargar el tiempo de ejecución completo del canal.          |
| `openclaw.install.npmSpec` / `openclaw.install.localPath`         | Sugerencias de instalación/actualización para complementos empaquetados y publicados externamente.                                                                               |
| `openclaw.install.defaultChoice`                                  | Ruta de instalación preferida cuando hay varias fuentes de instalación disponibles.                                                                                              |
| `openclaw.install.minHostVersion`                                 | Versión mínima compatible del host OpenClaw, utilizando un suelo semver como `>=2026.3.22`.                                                                                      |
| `openclaw.install.allowInvalidConfigRecovery`                     | Permite una ruta estrecha de recuperación de reinstalación de complementos empaquetados cuando la configuración no es válida.                                                    |
| `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` | Permite que las superficies del canal de solo configuración se carguen antes que el complemento de canal completo durante el inicio.                                             |

`openclaw.install.minHostVersion` se aplica durante la instalación y la carga del registro de manifiestos. Los valores no válidos se rechazan; los valores válidos pero más nuevos omiten el complemento en hosts más antiguos.

`openclaw.install.allowInvalidConfigRecovery` es intencionalmente estrecho. No hace que las configuraciones rotas arbitrarias sean instalables. Hoy solo permite que los flujos de instalación se recuperen de fallos específicos de actualización de complementos agrupados obsoletos, como una ruta de complemento agrupado faltante o una entrada `channels.<id>` obsoleta para ese mismo complemento agrupado. Los errores de configuración no relacionados aún bloquean la instalación y envían a los operadores a `openclaw doctor --fix`.

`openclaw.channel.persistedAuthState` son metadatos del paquete para un pequeño módulo de verificación:

```json
{
  "openclaw": {
    "channel": {
      "id": "whatsapp",
      "persistedAuthState": {
        "specifier": "./auth-presence",
        "exportName": "hasAnyWhatsAppAuth"
      }
    }
  }
}
```

Úselo cuando los flujos de configuración, doctoría o estado configurado necesiten una sonda de autenticación sí/no barata antes de que se cargue el complemento de canal completo. La exportación de destino debe ser una función pequeña que solo lea el estado persistido; no la enrute a través del barril de tiempo de ejecución del canal completo.

`openclaw.channel.configuredState` sigue la misma forma para verificaciones de configuración baratas solo de entorno:

```json
{
  "openclaw": {
    "channel": {
      "id": "telegram",
      "configuredState": {
        "specifier": "./configured-state",
        "exportName": "hasTelegramConfiguredState"
      }
    }
  }
}
```

Úselo cuando un canal pueda responder el estado configurado desde el entorno u otros
pequeños elementos de entrada que no son de tiempo de ejecución. Si la verificación
requiere una resolución completa de la configuración o el tiempo de ejecución real del
canal, mantenga esa lógica en el enlace `config.hasConfiguredState` del complemento.

## Requisitos del esquema JSON

- **Cada complemento debe incluir un esquema JSON**, incluso si no acepta ninguna configuración.
- Se acepta un esquema vacío (por ejemplo, `{ "type": "object", "additionalProperties": false }`).
- Los esquemas se validan en el momento de lectura/escritura de la configuración, no en tiempo de ejecución.

## Comportamiento de validación

- Las claves `channels.*` desconocidas son **errores**, a menos que el id del canal sea declarado por
  un manifiesto de complemento.
- `plugins.entries.<id>`, `plugins.allow`, `plugins.deny` y `plugins.slots.*`
  deben hacer referencia a ids de complementos **detectables**. Los ids desconocidos son **errores**.
- Si un complemento está instalado pero tiene un manifiesto o esquema roto o faltante,
  la validación falla y Doctor informa el error del complemento.
- Si existe la configuración de un complemento pero el complemento está **deshabilitado**, la configuración se mantiene y
  se muestra una **advertencia** en Doctor + registros.

Consulte [Referencia de configuración](/es/gateway/configuration) para ver el esquema completo `plugins.*`.

## Notas

- El manifiesto es **obligatorio para los complementos nativos de OpenClaw**, incluidas las cargas del sistema de archivos local.
- El tiempo de ejecución sigue cargando el módulo del complemento por separado; el manifiesto es solo para
  detección + validación.
- Los manifiestos nativos se analizan con JSON5, por lo que se aceptan comentarios, comas finales y
  claves sin comillas siempre que el valor final siga siendo un objeto.
- Solo el cargador de manifiestos lee los campos de manifiesto documentados. Evite agregar
  claves personalizadas de nivel superior aquí.
- `providerAuthEnvVars` es la ruta de metadatos económicos para sondas de autenticación, validación de marcadores de entorno
  y superficies de autenticación de proveedores similares que no deben iniciar el tiempo de ejecución del complemento
  solo para inspeccionar nombres de entorno.
- `providerAuthAliases` permite que las variantes del proveedor reutilicen las variables de entorno de autenticación,
  perfiles de autenticación, autenticación respaldada por configuración y la elección de incorporación de clave API
  de otro proveedor sin codificar esa relación en el núcleo.
- `channelEnvVars` es la ruta de metadatos económicos para la reserva de entorno de shell, indicaciones de configuración
  y superficies de canal similares que no deben iniciar el tiempo de ejecución del complemento
  solo para inspeccionar nombres de entorno.
- `providerAuthChoices` es la ruta de metadatos económica para los selectores de elección de autenticación,
  la resolución de `--auth-choice`, el mapeo de proveedor preferido y el registro simple de banderas de CLI
  antes de que se cargue el tiempo de ejecución del proveedor. Para los metadatos del asistente en tiempo de ejecución
  que requieren código de proveedor, consulte
  [Provider runtime hooks](/es/plugins/architecture#provider-runtime-hooks).
- Los tipos de complementos exclusivos se seleccionan a través de `plugins.slots.*`.
  - `kind: "memory"` es seleccionado por `plugins.slots.memory`.
  - `kind: "context-engine"` es seleccionado por `plugins.slots.contextEngine`
    (predeterminado: `legacy` incorporado).
- `channels`, `providers`, `cliBackends` y `skills` pueden omitirse cuando un
  complemento no los necesita.
- Si su complemento depende de módulos nativos, documente los pasos de compilación y cualquier
  requisito de lista de permitidos del administrador de paquetes (por ejemplo, pnpm `allow-build-scripts`
  - `pnpm rebuild <package>`).

## Relacionado

- [Construcción de complementos](/es/plugins/building-plugins) — cómo empezar con los complementos
- [Arquitectura de complementos](/es/plugins/architecture) — arquitectura interna
- [Resumen del SDK](/es/plugins/sdk-overview) — Referencia del SDK de complementos
