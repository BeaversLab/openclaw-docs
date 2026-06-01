---
summary: "Manifiesto de complemento + Requisitos de esquema JSON (validación de configuración estricta)"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "Manifiesto de complemento"
---

Esta página es solo para el **manifiesto del complemento nativo de OpenClaw**.

Para diseños de paquetes compatibles, consulte [Plugin bundles](/es/plugins/bundles).

Los formatos de paquete compatibles utilizan diferentes archivos de manifiesto:

- Paquete Codex: `.codex-plugin/plugin.json`
- Paquete Claude: `.claude-plugin/plugin.json` o el diseño predeterminado del componente Claude
  sin un manifiesto
- Paquete Cursor: `.cursor-plugin/plugin.json`

OpenClaw también detecta automáticamente esos diseños de paquetes, pero no se validan
contra el esquema `openclaw.plugin.json` descrito aquí.

Para paquetes compatibles, OpenClaw actualmente lee los metadatos del paquete más las
raíces de habilidades declaradas, las raíces de comandos de Claude, los valores predeterminados
`settings.json` del paquete Claude,
los valores predeterminados LSP del paquete Claude y los paquetes de hook admitidos cuando el diseño coincide
con las expectativas de tiempo de ejecución de OpenClaw.

Cada complemento nativo de OpenClaw **debe** incluir un archivo `openclaw.plugin.json` en la
**raíz del complemento**. OpenClaw usa este manifiesto para validar la configuración
**sin ejecutar el código del complemento**. Los manifiestos faltantes o no válidos se tratan como
errores del complemento y bloquean la validación de la configuración.

Consulte la guía completa del sistema de complementos: [Plugins](/es/tools/plugin).
Para el modelo de capacidades nativo y la guía actual de compatibilidad externa:
[Capability model](/es/plugins/architecture#public-capability-model).

## Qué hace este archivo

`openclaw.plugin.json` son los metadatos que OpenClaw lee **antes de cargar su
código de complemento**. Todo lo de abajo debe ser lo suficientemente barato de inspeccionar sin iniciar
el tiempo de ejecución del complemento.

**Úselo para:**

- identidad del complemento, validación de configuración e sugerencias de la interfaz de usuario de configuración
- metadatos de autenticación, incorporación y configuración (alias, habilitación automática, variables de entorno del proveedor, opciones de autenticación)
- sugerencias de activación para superficies del plano de control
- propiedad abreviada de familia de modelos
- instantáneas estáticas de propiedad de capacidades (`contracts`)
- metadatos del ejecutor de QA que el host `openclaw qa` compartido puede inspeccionar
- metadatos de configuración específicos del canal fusionados en el catálogo y superficies de validación

**No lo use para:** registrar el comportamiento en tiempo de ejecución, declarar puntos de entrada de código,
o metadatos de instalación de npm. Esos pertenecen a su código de complemento y `package.json`.

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
  "modelIdNormalization": {
    "providers": {
      "openrouter": {
        "prefixWhenBare": "openrouter"
      }
    }
  },
  "providerEndpoints": [
    {
      "endpointClass": "openrouter",
      "hostSuffixes": ["openrouter.ai"]
    }
  ],
  "providerRequest": {
    "providers": {
      "openrouter": {
        "family": "openrouter"
      }
    }
  },
  "cliBackends": ["openrouter-cli"],
  "syntheticAuthRefs": ["openrouter-cli"],
  "setup": {
    "providers": [
      {
        "id": "openrouter",
        "envVars": ["OPENROUTER_API_KEY"]
      }
    ]
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

| Campo                                | Obligatorio | Tipo                             | Lo que significa                                                                                                                                                                                                                                                                                                   |
| ------------------------------------ | ----------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                                 | Sí          | `string`                         | Id canónico del complemento. Este es el id utilizado en `plugins.entries.<id>`.                                                                                                                                                                                                                                    |
| `configSchema`                       | Sí          | `object`                         | Esquema JSON en línea para la configuración de este complemento.                                                                                                                                                                                                                                                   |
| `requiresPlugins`                    | No          | `string[]`                       | Ids de complementos que también deben instalarse para que este complemento tenga efecto. Discovery mantiene el complemento cargable pero advierte cuando falta algún complemento requerido.                                                                                                                        |
| `enabledByDefault`                   | No          | `true`                           | Marca un complemento empaquetado como habilitado por defecto. Omítalo o establece cualquier valor que no sea `true` para dejar el complemento deshabilitado por defecto.                                                                                                                                           |
| `enabledByDefaultOnPlatforms`        | No          | `string[]`                       | Marca un complemento empaquetado como habilitado por defecto solo en las plataformas de Node.js listadas, por ejemplo `["darwin"]`. La configuración explícita aún tiene prioridad.                                                                                                                                |
| `legacyPluginIds`                    | No          | `string[]`                       | Ids heredados que se normalizan a este id de complemento canónico.                                                                                                                                                                                                                                                 |
| `autoEnableWhenConfiguredProviders`  | No          | `string[]`                       | Ids de proveedores que deberían habilitar automáticamente este complemento cuando la autenticación, la configuración o las referencias de modelos los mencionen.                                                                                                                                                   |
| `kind`                               | No          | `"memory"` \| `"context-engine"` | Declara un tipo de complemento exclusivo utilizado por `plugins.slots.*`.                                                                                                                                                                                                                                          |
| `channels`                           | No          | `string[]`                       | Ids de canales propiedad de este complemento. Se utilizan para el descubrimiento y la validación de la configuración.                                                                                                                                                                                              |
| `providers`                          | No          | `string[]`                       | Ids de proveedores propiedad de este complemento.                                                                                                                                                                                                                                                                  |
| `providerCatalogEntry`               | No          | `string`                         | Ruta de módulo de catálogo de proveedores ligera, relativa a la raíz del complemento, para metadatos de catálogo de proveedores con ámbito de manifiesto que se pueden cargar sin activar el tiempo de ejecución completo del complemento.                                                                         |
| `modelSupport`                       | No          | `object`                         | Metadatos abreviados de familia de modelos propiedad del manifiesto, utilizados para cargar automáticamente el complemento antes del tiempo de ejecución.                                                                                                                                                          |
| `modelCatalog`                       | No          | `object`                         | Metadatos declarativos del catálogo de modelos para proveedores propiedad de este complemento. Este es el contrato del plano de control para listados de solo lectura futuros, incorporación, selectores de modelos, alias y supresión sin cargar el tiempo de ejecución del complemento.                          |
| `modelPricing`                       | No          | `object`                         | Política de búsqueda de precios externos propiedad del proveedor. Úsela para excluir a los proveedores locales/autoalojados de los catálogos de precios remotos o para asignar referencias de proveedores a IDs de catálogo de OpenRouter/LiteLLM sin codificar los IDs de proveedor en el núcleo.                 |
| `modelIdNormalization`               | No          | `object`                         | Limpieza de alias/prefijos de ID de modelo propiedad del proveedor que debe ejecutarse antes de que se cargue el tiempo de ejecución del proveedor.                                                                                                                                                                |
| `providerEndpoints`                  | No          | `object[]`                       | Metadatos de host/baseUrl del punto de conexión propiedad del manifiesto para las rutas del proveedor que el núcleo debe clasificar antes de que se cargue el tiempo de ejecución del proveedor.                                                                                                                   |
| `providerRequest`                    | No          | `object`                         | Metadatos de familia de proveedores y compatibilidad de solicitudes de bajo costo utilizados por la política de solicitud genérica antes de que se cargue el tiempo de ejecución del proveedor.                                                                                                                    |
| `cliBackends`                        | No          | `string[]`                       | IDs de backend de inferencia de CLI propiedad de este complemento. Se utiliza para la autoactivación al inicio desde referencias de configuración explícitas.                                                                                                                                                      |
| `syntheticAuthRefs`                  | No          | `string[]`                       | Referencias de proveedor o backend de CLI cuyo gancho de autenticación sintética propiedad del complemento debe sondearse durante el descubrimiento de modelos en frío antes de que se cargue el tiempo de ejecución.                                                                                              |
| `nonSecretAuthMarkers`               | No          | `string[]`                       | Valores de clave API de marcador de posición propiedad del complemento empaquetado que representan un estado de credenciales no secreto, local, OAuth o ambiental.                                                                                                                                                 |
| `commandAliases`                     | No          | `object[]`                       | Nombres de comandos propiedad de este complemento que deben producir diagnóstico de configuración y CLI compatible con el complemento antes de que se cargue el tiempo de ejecución.                                                                                                                               |
| `providerAuthEnvVars`                | No          | `Record<string, string[]>`       | Metadatos de entorno de compatibilidad en desuso para la búsqueda de autenticación/estado del proveedor. Prefiera `setup.providers[].envVars` para nuevos complementos; OpenClaw todavía lee esto durante el período de desuso.                                                                                    |
| `providerAuthAliases`                | No          | `Record<string, string>`         | IDs de proveedor que deben reutilizar otro ID de proveedor para la búsqueda de autenticación, por ejemplo, un proveedor de codificación que comparte la clave API del proveedor base y los perfiles de autenticación.                                                                                              |
| `channelEnvVars`                     | No          | `Record<string, string[]>`       | Metadatos de entorno de canal baratos que OpenClaw puede inspeccionar sin cargar el código del complemento. Úselo para la configuración de canal impulsada por entorno o superficies de autenticación que los asistentes genéricos de inicio/configuración deberían ver.                                           |
| `providerAuthChoices`                | No          | `object[]`                       | Metadatos de elección de autenticación baratos para selectores de incorporación, resolución de proveedor preferido y cableado simple de indicadores de CLI.                                                                                                                                                        |
| `activation`                         | No          | `object`                         | Metadatos del planificador de activación económicos para la carga activada por inicio, proveedor, comando, canal, ruta y capacidad. Solo metadatos; el tiempo de ejecución del complemento aún posee el comportamiento real.                                                                                       |
| `setup`                              | No          | `object`                         | Descriptores de configuración/incorporación económicos que las superficies de descubrimiento y configuración pueden inspeccionar sin cargar el tiempo de ejecución del complemento.                                                                                                                                |
| `qaRunners`                          | No          | `object[]`                       | Descriptores de ejecutor de QA económicos utilizados por el host compartido `openclaw qa` antes de que se cargue el tiempo de ejecución del complemento.                                                                                                                                                           |
| `contracts`                          | No          | `object`                         | Instantánea estática de propiedad de capacidades para enlaces de autenticación externos, incrustaciones, voz, transcripción en tiempo real, voz en tiempo real, comprensión de medios, generación de imágenes, generación de música, generación de video, obtención web, búsqueda web y propiedad de herramientas. |
| `mediaUnderstandingProviderMetadata` | No          | `Record<string, object>`         | Valores predeterminados de comprensión de medios económicos para los identificadores de proveedor declarados en `contracts.mediaUnderstandingProviders`.                                                                                                                                                           |
| `imageGenerationProviderMetadata`    | No          | `Record<string, object>`         | Metadatos de autenticación de generación de imágenes económicos para los identificadores de proveedor declarados en `contracts.imageGenerationProviders`, incluidos los alias de autenticación propiedad del proveedor y los guardias de URL base.                                                                 |
| `videoGenerationProviderMetadata`    | No          | `Record<string, object>`         | Metadatos de autenticación de generación de video económicos para los identificadores de proveedor declarados en `contracts.videoGenerationProviders`, incluidos los alias de autenticación propiedad del proveedor y los guardias de URL base.                                                                    |
| `musicGenerationProviderMetadata`    | No          | `Record<string, object>`         | Metadatos de autenticación de generación de música económicos para los identificadores de proveedor declarados en `contracts.musicGenerationProviders`, incluidos los alias de autenticación propiedad del proveedor y los guardias de URL base.                                                                   |
| `toolMetadata`                       | No          | `Record<string, object>`         | Metadatos de disponibilidad barata para las herramientas propias del complemento declaradas en `contracts.tools`. Úselo cuando una herramienta no debe cargar el tiempo de ejecución a menos que existan pruebas de configuración, entorno o autenticación.                                                        |
| `channelConfigs`                     | No          | `Record<string, object>`         | Metadatos de configuración de canal propiedad del manifiesto fusionados en las superficies de descubrimiento y validación antes de que se cargue el tiempo de ejecución.                                                                                                                                           |
| `skills`                             | No          | `string[]`                       | Directorios de habilidades (skills) para cargar, relativos a la raíz del complemento.                                                                                                                                                                                                                              |
| `name`                               | No          | `string`                         | Nombre del complemento legible por humanos.                                                                                                                                                                                                                                                                        |
| `description`                        | No          | `string`                         | Resumen breve que se muestra en las superficies del complemento.                                                                                                                                                                                                                                                   |
| `version`                            | No          | `string`                         | Versión del complemento informativa.                                                                                                                                                                                                                                                                               |
| `uiHints`                            | No          | `Record<string, object>`         | Etiquetas de la interfaz de usuario, marcadores de posición e indicaciones de sensibilidad para los campos de configuración.                                                                                                                                                                                       |

## Referencia de metadatos del proveedor de generación

Los campos de metadatos del proveedor de generación describen señales de autenticación estática para
los proveedores declarados en la lista `contracts.*GenerationProviders` coincidente.
OpenClaw lee estos campos antes de que se cargue el tiempo de ejecución del proveedor para que las herramientas principales puedan
decidir si un proveedor de generación está disponible sin importar todos
los complementos del proveedor.

Utilice estos campos solo para hechos declarativos baratos. El transporte, las
transformaciones de solicitudes, la actualización de tokens, la validación de credenciales y el comportamiento de generación real
permanecen en el tiempo de ejecución del complemento.

```json
{
  "contracts": {
    "imageGenerationProviders": ["example-image"]
  },
  "imageGenerationProviderMetadata": {
    "example-image": {
      "aliases": ["example-image-oauth"],
      "authProviders": ["example-image"],
      "configSignals": [
        {
          "rootPath": "plugins.entries.example-image.config",
          "overlayPath": "image",
          "mode": {
            "path": "mode",
            "default": "local",
            "allowed": ["local"]
          },
          "requiredAny": ["workflow", "workflowPath"],
          "required": ["promptNodeId"]
        }
      ],
      "authSignals": [
        {
          "provider": "example-image"
        },
        {
          "provider": "example-image-oauth",
          "providerBaseUrl": {
            "provider": "example-image",
            "defaultBaseUrl": "https://api.example.com/v1",
            "allowedBaseUrls": ["https://api.example.com/v1"]
          }
        }
      ]
    }
  }
}
```

Cada entrada de metadatos admite:

| Campo                  | Requerido | Tipo       | Lo que significa                                                                                                                                                                                 |
| ---------------------- | --------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `aliases`              | No        | `string[]` | ID de proveedor adicionales que deben contar como alias de autenticación estática para el proveedor de generación.                                                                               |
| `authProviders`        | No        | `string[]` | ID de proveedores cuyos perfiles de autenticación configurados deben contar como autenticación para este proveedor de generación.                                                                |
| `configSignals`        | No        | `object[]` | Señales de disponibilidad baratas solo de configuración para proveedores locales o autohospedados que se pueden configurar sin perfiles de autenticación o variables de entorno.                 |
| `authSignals`          | No        | `object[]` | Señales de autenticación explícitas. Cuando están presentes, estas reemplazan el conjunto de señales predeterminado del ID del proveedor, `aliases`, y `authProviders`.                          |
| `referenceAudioInputs` | No        | `boolean`  | Solo para generación de video. Establézcalo en `true` cuando el proveedor acepte activos de audio de referencia; de lo contrario, `video_generate` oculta los parámetros de referencia de audio. |

Cada entrada `configSignals` admite:

| Campo         | Obligatorio | Tipo       | Lo que significa                                                                                                                                                                                                 |
| ------------- | ----------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rootPath`    | Sí          | `string`   | Ruta de puntos al objeto de configuración propiedad del complemento para inspeccionar, por ejemplo `plugins.entries.example.config`.                                                                             |
| `overlayPath` | No          | `string`   | Ruta de puntos dentro de la configuración raíz cuyo objeto debe superponerse al objeto raíz antes de evaluar la señal. Úselo para una configuración específica de la capacidad, como `image`, `video` o `music`. |
| `required`    | No          | `string[]` | Rutas de puntos dentro de la configuración efectiva que deben tener valores configurados. Las cadenas no deben estar vacías; los objetos y las matrices no deben estar vacíos.                                   |
| `requiredAny` | No          | `string[]` | Rutas de puntos dentro de la configuración efectiva donde al menos una debe tener un valor configurado.                                                                                                          |
| `mode`        | No          | `object`   | Guardia de modo de cadena opcional dentro de la configuración efectiva. Úselo cuando la disponibilidad solo de configuración se aplique a un solo modo.                                                          |

Cada guardia `mode` admite:

| Campo        | Obligatorio | Tipo       | Lo que significa                                                                       |
| ------------ | ----------- | ---------- | -------------------------------------------------------------------------------------- |
| `path`       | No          | `string`   | Ruta de puntos dentro de la configuración efectiva. El valor predeterminado es `mode`. |
| `default`    | No          | `string`   | Valor de modo que se usará cuando la configuración omite la ruta.                      |
| `allowed`    | No          | `string[]` | Si está presente, la señal pasa solo cuando el modo efectivo es uno de estos valores.  |
| `disallowed` | No          | `string[]` | Si está presente, la señal falla cuando el modo efectivo es uno de estos valores.      |

Cada entrada `authSignals` admite:

| Campo             | Obligatorio | Tipo     | Lo que significa                                                                                                                                                                                           |
| ----------------- | ----------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider`        | Sí          | `string` | ID del proveedor para verificar en los perfiles de autenticación configurados.                                                                                                                             |
| `providerBaseUrl` | No          | `object` | Guardia opcional que hace que la señal cuente solo cuando el proveedor configurado referenciado utiliza una URL base permitida. Use esto cuando un alias de autenticación es válido solo para ciertas API. |

Cada guardia `providerBaseUrl` soporta:

| Campo             | Obligatorio | Tipo       | Lo que significa                                                                                                                                                             |
| ----------------- | ----------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider`        | Sí          | `string`   | Id de configuración del proveedor cuyo `baseUrl` debe ser verificado.                                                                                                        |
| `defaultBaseUrl`  | No          | `string`   | URL base a asumir cuando la configuración del proveedor omite `baseUrl`.                                                                                                     |
| `allowedBaseUrls` | Sí          | `string[]` | URLs base permitidas para esta señal de autenticación. La señal se ignora cuando la URL base configurada o predeterminada no coincide con uno de estos valores normalizados. |

## Referencia de metadatos de herramienta

`toolMetadata` usa las mismas formas `configSignals` y `authSignals` que
los metadatos del proveedor de generación, claveados por nombre de herramienta. `contracts.tools` declara
la propiedad. `toolMetadata` declara evidencia de disponibilidad económica para que OpenClaw pueda
evitar importar un tiempo de ejecución del complemento solo para que su fábrica de herramientas devuelva `null`.

```json
{
  "setup": {
    "providers": [
      {
        "id": "example",
        "envVars": ["EXAMPLE_API_KEY"]
      }
    ]
  },
  "contracts": {
    "tools": ["example_search"]
  },
  "toolMetadata": {
    "example_search": {
      "authSignals": [
        {
          "provider": "example"
        }
      ],
      "configSignals": [
        {
          "rootPath": "plugins.entries.example.config",
          "overlayPath": "search",
          "required": ["apiKey"]
        }
      ]
    }
  }
}
```

Si una herramienta no tiene `toolMetadata`, OpenClaw conserva el comportamiento existente y
carga el complemento propietario cuando el contrato de la herramienta coincide con la política. Para herramientas de ruta crítica
cuya fábrica depende de auth/config, los autores de complementos deben declarar
`toolMetadata` en lugar de hacer que el núcleo importe el tiempo de ejecución para preguntar.

## Referencia de providerAuthChoices

Cada entrada `providerAuthChoices` describe una opción de incorporación o autenticación.
OpenClaw lee esto antes de que se cargue el tiempo de ejecución del proveedor.
Las listas de configuración del proveedor usan estas opciones de manifiesto, opciones de configuración derivadas del descriptor
y metadatos del catálogo de instalación sin cargar el tiempo de ejecución del proveedor.

| Campo                 | Obligatorio | Tipo                                                                  | Lo que significa                                                                                                                  |
| --------------------- | ----------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `provider`            | Sí          | `string`                                                              | Id del proveedor al que pertenece esta opción.                                                                                    |
| `method`              | Sí          | `string`                                                              | Id del método de autenticación al cual enviar.                                                                                    |
| `choiceId`            | Sí          | `string`                                                              | Id estable de elección de autenticación utilizado por los flujos de incorporación y CLI.                                          |
| `choiceLabel`         | No          | `string`                                                              | Etiqueta orientada al usuario. Si se omite, OpenClaw recurre a `choiceId`.                                                        |
| `choiceHint`          | No          | `string`                                                              | Texto de ayuda breve para el selector.                                                                                            |
| `assistantPriority`   | No          | `number`                                                              | Los valores más bajos se ordenan antes en los selectores interactivos impulsados por el asistente.                                |
| `assistantVisibility` | No          | `"visible"` \| `"manual-only"`                                        | Oculta la elección de los selectores del asistente al tiempo que permite la selección manual de la CLI.                           |
| `deprecatedChoiceIds` | No          | `string[]`                                                            | Ids de elecciones heredadas que deben redirigir a los usuarios a esta elección de reemplazo.                                      |
| `groupId`             | No          | `string`                                                              | Id de grupo opcional para agrupar elecciones relacionadas.                                                                        |
| `groupLabel`          | No          | `string`                                                              | Etiqueta orientada al usuario para ese grupo.                                                                                     |
| `groupHint`           | No          | `string`                                                              | Texto de ayuda breve para el grupo.                                                                                               |
| `optionKey`           | No          | `string`                                                              | Clave de opción interna para flujos de autenticación simples de una sola bandera.                                                 |
| `cliFlag`             | No          | `string`                                                              | Nombre de la bandera de la CLI, como `--openrouter-api-key`.                                                                      |
| `cliOption`           | No          | `string`                                                              | Forma completa de la opción de la CLI, como `--openrouter-api-key <key>`.                                                         |
| `cliDescription`      | No          | `string`                                                              | Descripción utilizada en la ayuda de la CLI.                                                                                      |
| `onboardingScopes`    | No          | `Array<"text-inference" \| "image-generation" \| "music-generation">` | En qué superficies de incorporación debería aparecer esta elección. Si se omite, el valor predeterminado es `["text-inference"]`. |

## referencia de commandAliases

Use `commandAliases` cuando un complemento posee un nombre de comando en tiempo de ejecución que los usuarios pueden colocar erróneamente en `plugins.allow` o intentar ejecutar como un comando raíz de la CLI. OpenClaw utiliza estos metadatos para diagnósticos sin importar el código de tiempo de ejecución del complemento.

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

| Campo        | Obligatorio | Tipo              | Lo que significa                                                                       |
| ------------ | ----------- | ----------------- | -------------------------------------------------------------------------------------- |
| `name`       | Sí          | `string`          | Nombre del comando que pertenece a este complemento.                                   |
| `kind`       | No          | `"runtime-slash"` | Marca el alias como un comando de barra de chat en lugar de un comando raíz de la CLI. |
| `cliCommand` | No          | `string`          | Comando raíz de CLI relacionado para sugerir para operaciones de CLI, si existe uno.   |

## referencia de activación

Use `activation` cuando el complemento puede declarar fácilmente qué eventos del plano de control
deben incluirlo en un plan de activación/carga.

Este bloque es metadatos del planificador, no una API de ciclo de vida. No registra
comportamiento en tiempo de ejecución, no reemplaza `register(...)` y no promete que
el código del complemento ya se haya ejecutado. El planificador de activación utiliza estos campos para
restringir los complementos candidatos antes de recurrir a los metadatos de propiedad del manifiesto
existentes como `providers`, `channels`, `commandAliases`, `setup.providers`,
`contracts.tools` y hooks.

Prefiera los metadatos más específicos que ya describan la propiedad. Use
`providers`, `channels`, `commandAliases`, descriptores de configuración o `contracts`
cuando esos campos expresen la relación. Use `activation` para sugerencias adicionales del
planificador que no puedan ser representadas por esos campos de propiedad.
Use `cliBackends` de nivel superior para alias de tiempo de ejecución de CLI como `claude-cli`,
`my-cli` o `google-gemini-cli`; `activation.onAgentHarnesses` es solo para
ids de arneses de agentes integrados que aún no tienen un campo de propiedad.

Este bloque es solo metadatos. No registra comportamiento en tiempo de ejecución y no
reemplaza `register(...)`, `setupEntry` u otros puntos de entrada del complemento/tiempo de ejecución.
Los consumidores actuales lo usan como una sugerencia de restricción antes de una carga más amplia del complemento, por lo que
la falta de metadatos de activación que no sea de inicio generalmente solo cuesta rendimiento; no
debería cambiar la corrección siempre que los respaldos de propiedad del manifiesto sigan existiendo.

Cada complemento debe establecer `activation.onStartup` intencionalmente. Establézcalo en `true`
solo cuando el complemento deba ejecutarse durante el inicio de Gateway. Establézcalo en `false` cuando
el complemento esté inactivo al inicio y deba cargarse solo desde desencadenadores más específicos.
Omitir `onStartup` ya no carga implícitamente el complemento al inicio; use metadatos de
activación explícitos para el inicio, canal, configuración, arnés de agente, memoria u otros
desencadenadores de activación más específicos.

```json
{
  "activation": {
    "onStartup": false,
    "onProviders": ["openai"],
    "onCommands": ["models"],
    "onChannels": ["web"],
    "onRoutes": ["gateway-webhook"],
    "onConfigPaths": ["browser"],
    "onCapabilities": ["provider", "tool"]
  }
}
```

| Campo              | Obligatorio | Tipo                                                 | Significado                                                                                                                                                                                                                              |
| ------------------ | ----------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onStartup`        | No          | `boolean`                                            | Activación explícita al inicio de Gateway. Cada complemento debe establecer esto. `true` importa el complemento durante el inicio; `false` lo mantiene diferido al inicio a menos que otro desencadenador coincidente requiera la carga. |
| `onProviders`      | No          | `string[]`                                           | IDs de proveedores que deben incluir este complemento en los planes de activación/carga.                                                                                                                                                 |
| `onAgentHarnesses` | No          | `string[]`                                           | IDs de tiempo de ejecución del arnés de agente integrado que deben incluir este complemento en los planes de activación/carga. Use `cliBackends` de nivel superior para los alias del backend de CLI.                                    |
| `onCommands`       | No          | `string[]`                                           | IDs de comandos que deben incluir este complemento en los planes de activación/carga.                                                                                                                                                    |
| `onChannels`       | No          | `string[]`                                           | IDs de canales que deben incluir este complemento en los planes de activación/carga.                                                                                                                                                     |
| `onRoutes`         | No          | `string[]`                                           | Tipos de rutas que deben incluir este complemento en los planes de activación/carga.                                                                                                                                                     |
| `onConfigPaths`    | No          | `string[]`                                           | Rutas de configuración relativas a la raíz que deben incluir este complemento en los planes de inicio/carga cuando la ruta está presente y no está deshabilitada explícitamente.                                                         |
| `onCapabilities`   | No          | `Array<"provider" \| "channel" \| "tool" \| "hook">` | Sugerencias de capacidades generales utilizadas por la planificación de activación del plano de control. Preferir campos más específicos cuando sea posible.                                                                             |

Consumidores vivos actuales:

- La planificación del inicio de Gateway usa `activation.onStartup` para la importación
  explícita al inicio
- la planificación de CLI activada por comandos recurre al modo heredado
  `commandAliases[].cliCommand` o `commandAliases[].name`
- la planificación del inicio del tiempo de ejecución del agente utiliza `activation.onAgentHarnesses` para
  arneses integrados y `cliBackends[]` de nivel superior para los alias del tiempo de ejecución de la CLI
- la configuración/planificación desencadenada por el canal recurre a la propiedad `channels[]`
  heredada cuando faltan los metadatos explícitos de activación del canal
- la planificación del complemento de inicio utiliza `activation.onConfigPaths` para superficies de configuración raíz
  que no son de canal, como el bloque `browser` del complemento del navegador incluido
- la configuración/planificación del tiempo de ejecución desencadenada por el proveedor recurre a la propiedad
  `providers[]` heredada y a la propiedad `cliBackends[]` de nivel superior cuando faltan los metadatos
  explícitos de activación del proveedor

Los diagnósticos del planificador pueden distinguir las pistas de activación explícitas de la reserva de
propiedad del manifiesto. Por ejemplo, `activation-command-hint` significa que
`activation.onCommands` coincidió, mientras que `manifest-command-alias` significa que
el planificador utilizó en su lugar la propiedad `commandAliases`. Estas etiquetas de motivo son para
diagnósticos y pruebas del host; los autores de complementos deben seguir declarando los metadatos
que mejor describan la propiedad.

## referencia de qaRunners

Use `qaRunners` cuando un complemento contribuya con uno o más ejecutores de transporte debajo
de la raíz `openclaw qa` compartida. Mantenga estos metadatos económicos y estáticos; el tiempo de ejecución
del complemento sigue siendo el propietario del registro real de la CLI a través de una superficie `runtime-api.ts`
ligera que exporta `qaRunnerCliRegistrations`.

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

| Campo         | Obligatorio | Tipo     | Lo que significa                                                                            |
| ------------- | ----------- | -------- | ------------------------------------------------------------------------------------------- |
| `commandName` | Sí          | `string` | Subcomando montado debajo de `openclaw qa`, por ejemplo `matrix`.                           |
| `description` | No          | `string` | Texto de ayuda de reserva utilizado cuando el host compartido necesita un comando auxiliar. |

## referencia de configuración

Use `setup` cuando las superficies de configuración y incorporación necesiten metadatos económicos propiedad del complemento
antes de que se cargue el tiempo de ejecución.

```json
{
  "setup": {
    "providers": [
      {
        "id": "openai",
        "authMethods": ["api-key"],
        "envVars": ["OPENAI_API_KEY"],
        "authEvidence": [
          {
            "type": "local-file-with-env",
            "fileEnvVar": "OPENAI_CREDENTIALS_FILE",
            "requiresAllEnv": ["OPENAI_PROJECT"],
            "credentialMarker": "openai-local-credentials",
            "source": "openai local credentials"
          }
        ]
      }
    ],
    "cliBackends": ["openai-cli"],
    "configMigrations": ["legacy-openai-auth"],
    "requiresRuntime": false
  }
}
```

El nivel superior `cliBackends` sigue siendo válido y continúa describiendo los backends de inferencia de CLI. `setup.cliBackends` es la superficie descriptor específica de la configuración para los flujos de control plano/configuración que deben permanecer solo como metadatos.

Cuando están presentes, `setup.providers` y `setup.cliBackends` son la superficie de búsqueda con prioridad de descriptor primero para el descubrimiento de configuración. Si el descriptor solo reduce el plugin candidato y la configuración aún necesita ganchos de tiempo de ejecución más ricos, establezca `requiresRuntime: true` y mantenga `setup-api` en su lugar como la ruta de ejecución alternativa.

OpenClaw también incluye `setup.providers[].envVars` en búsquedas genéricas de autenticación de proveedor y variables de entorno. `providerAuthEnvVars` sigue siendo compatible a través de un adaptador de compatibilidad durante el período de depreciación, pero los plugins no empaquetados que aún lo usan reciben un diagnóstico de manifiesto. Los nuevos plugins deben poner metadatos de entorno de configuración/estado en `setup.providers[].envVars`.

OpenClaw también puede derivar opciones simples de configuración desde `setup.providers[].authMethods` cuando no hay ninguna entrada de configuración disponible, o cuando `setup.requiresRuntime: false` declara que el tiempo de ejecución de configuración es innecesario. Las entradas explícitas de `providerAuthChoices` siguen siendo preferidas para etiquetas personalizadas, banderas de CLI, alcance de incorporación y metadatos del asistente.

Establezca `requiresRuntime: false` solo cuando esos descriptores sean suficientes para la superficie de configuración. OpenClaw trata `false` explícito como un contrato solo de descriptor y no ejecutará `setup-api` o `openclaw.setupEntry` para la búsqueda de configuración. Si un plugin solo de descriptor aún envía una de esas entradas de tiempo de ejecución de configuración, OpenClaw informa un diagnóstico aditivo y continúa ignorándolo. Omitir `requiresRuntime` mantiene el comportamiento alternativo heredado para que los plugins existentes que agregaron descriptores sin la bandera no se rompan.

Debido a que la búsqueda de configuración puede ejecutar código `setup-api` propiedad del plugin, los valores normalizados de `setup.providers[].id` y `setup.cliBackends[]` deben mantenerse únicos entre los plugins descubiertos. La propiedad ambigua falla cerrada en lugar de elegir un ganador del orden de descubrimiento.

Cuando el tiempo de ejecución de configuración se ejecuta, los diagnósticos del registro de configuración reportan una deriva del descriptor si `setup-api` registra un proveedor o un backend de CLI que los descriptores del manifiesto no declaran, o si un descriptor no tiene un registro de tiempo de ejecución coincidente. Estos diagnósticos son aditivos y no rechazan los complementos heredados.

### referencia de setup.providers

| Campo          | Requerido | Tipo       | Qué significa                                                                                                                                              |
| -------------- | --------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`           | Sí        | `string`   | ID de proveedor expuesto durante la configuración o el incorporamiento. Mantenga los ID normalizados únicos globalmente.                                   |
| `authMethods`  | No        | `string[]` | IDs de métodos de configuración/autenticación que este proveedor admite sin cargar el tiempo de ejecución completo.                                        |
| `envVars`      | No        | `string[]` | Variables de entorno que las superficies de configuración/estado genéricas pueden verificar antes de que se cargue el tiempo de ejecución del complemento. |
| `authEvidence` | No        | `object[]` | Verificaciones locales económicas de evidencia de autenticación para proveedores que pueden autenticarse mediante marcadores no secretos.                  |

`authEvidence` es para marcadores de credenciales locales propiedad del proveedor que pueden ser
verificados sin cargar código de tiempo de ejecución. Estas verificaciones deben mantenerse económicas y locales:
sin llamadas de red, sin lecturas de llavero o administrador de secretos, sin comandos de shell y sin
sondas de API del proveedor.

Entradas de evidencia admitidas:

| Campo              | Requerido | Tipo       | Qué significa                                                                                                                    |
| ------------------ | --------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `type`             | Sí        | `string`   | Actualmente `local-file-with-env`.                                                                                               |
| `fileEnvVar`       | No        | `string`   | Variable de entorno que contiene una ruta de archivo de credenciales explícita.                                                  |
| `fallbackPaths`    | No        | `string[]` | Rutas de archivos de credenciales locales verificadas cuando `fileEnvVar` está ausente o vacío. Admite `${HOME}` y `${APPDATA}`. |
| `requiresAnyEnv`   | No        | `string[]` | Al menos una variable de entorno listada debe no estar vacía para que la evidencia sea válida.                                   |
| `requiresAllEnv`   | No        | `string[]` | Cada variable de entorno listada debe no estar vacía para que la evidencia sea válida.                                           |
| `credentialMarker` | Sí        | `string`   | Marcador no secreto devuelto cuando la evidencia está presente.                                                                  |
| `source`           | No        | `string`   | Etiqueta de origen orientada al usuario para la salida de autenticación/estado.                                                  |

### campos de configuración

| Campo              | Obligatorio | Tipo       | Lo que significa                                                                                                                                                 |
| ------------------ | ----------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `providers`        | No          | `object[]` | Descriptores de configuración del proveedor expuestos durante la configuración y la incorporación.                                                               |
| `cliBackends`      | No          | `string[]` | Ids de backend en tiempo de configuración utilizados para la búsqueda de configuración basada en descriptores. Mantenga los ids normalizados únicos globalmente. |
| `configMigrations` | No          | `string[]` | Ids de migración de configuración propiedad de la superficie de configuración de este complemento.                                                               |
| `requiresRuntime`  | No          | `boolean`  | Si la configuración aún necesita la ejecución de `setup-api` después de la búsqueda del descriptor.                                                              |

## referencia de uiHints

`uiHints` es un mapa de nombres de campos de configuración a pequeñas sugerencias de representación.

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
| `tags`        | `string[]` | Etiquetas de interfaz de usuario opcionales.               |
| `advanced`    | `boolean`  | Marca el campo como avanzado.                              |
| `sensitive`   | `boolean`  | Marca el campo como secreto o sensible.                    |
| `placeholder` | `string`   | Texto de marcador de posición para entradas de formulario. |

## referencia de contratos

Use `contracts` solo para metadatos estáticos de propiedad de capacidades que OpenClaw puede
leer sin importar el tiempo de ejecución del complemento.

```json
{
  "contracts": {
    "agentToolResultMiddleware": ["openclaw", "codex"],
    "externalAuthProviders": ["acme-ai"],
    "embeddingProviders": ["openai-compatible"],
    "speechProviders": ["openai"],
    "realtimeTranscriptionProviders": ["openai"],
    "realtimeVoiceProviders": ["openai"],
    "memoryEmbeddingProviders": ["local"],
    "mediaUnderstandingProviders": ["openai", "openai-codex"],
    "imageGenerationProviders": ["openai"],
    "videoGenerationProviders": ["qwen"],
    "webFetchProviders": ["firecrawl"],
    "webSearchProviders": ["gemini"],
    "migrationProviders": ["hermes"],
    "gatewayMethodDispatch": ["authenticated-request"],
    "tools": ["firecrawl_search", "firecrawl_scrape"]
  }
}
```

Cada lista es opcional:

| Campo                            | Tipo       | Lo que significa                                                                                                                                  |
| -------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `embeddedExtensionFactories`     | `string[]` | Ids de fábrica de extensiones del servidor de aplicaciones Codex, actualmente `codex-app-server`.                                                 |
| `agentToolResultMiddleware`      | `string[]` | Ids de tiempo de ejecución para los cuales un complemento empaquetado puede registrar middleware de resultados de herramientas.                   |
| `externalAuthProviders`          | `string[]` | Ids de proveedores cuyo enlace de perfil de autenticación externa posee este complemento.                                                         |
| `embeddingProviders`             | `string[]` | Ids de proveedores de incrustación general que este complemento posee para el uso de incrustación de vectores reutilizables, incluida la memoria. |
| `speechProviders`                | `string[]` | Ids de proveedores de voz que posee este complemento.                                                                                             |
| `realtimeTranscriptionProviders` | `string[]` | Ids de proveedores de transcripción en tiempo real que posee este complemento.                                                                    |
| `realtimeVoiceProviders`         | `string[]` | Ids de proveedores de voz en tiempo real que posee este complemento.                                                                              |
| `memoryEmbeddingProviders`       | `string[]` | Ids de proveedores de incrustación (embedding) específicos de memoria obsoletos que posee este complemento.                                       |
| `mediaUnderstandingProviders`    | `string[]` | Ids de proveedores de comprensión de medios que posee este complemento.                                                                           |
| `transcriptSourceProviders`      | `string[]` | Ids de proveedores de fuente de transcripción que posee este complemento.                                                                         |
| `imageGenerationProviders`       | `string[]` | Ids de proveedores de generación de imágenes que posee este complemento.                                                                          |
| `videoGenerationProviders`       | `string[]` | Ids de proveedores de generación de video que posee este complemento.                                                                             |
| `webFetchProviders`              | `string[]` | Ids de proveedores de recuperación web que posee este complemento.                                                                                |
| `webSearchProviders`             | `string[]` | Ids de proveedores de búsqueda web que posee este complemento.                                                                                    |
| `migrationProviders`             | `string[]` | Ids de proveedores de importación que posee este complemento para `openclaw migrate`.                                                             |
| `gatewayMethodDispatch`          | `string[]` | Derecho reservado para las rutas HTTP autenticadas del complemento que despachan métodos de Gateway en proceso.                                   |
| `tools`                          | `string[]` | Nombres de herramientas de agente que posee este complemento.                                                                                     |

`contracts.embeddedExtensionFactories` se conserva para las fábricas de extensiones solo del servidor de aplicaciones Codex agrupado. Las transformaciones de resultados de herramientas agrupadas deben declarar `contracts.agentToolResultMiddleware` y registrarse con `api.registerAgentToolResultMiddleware(...)` en su lugar. Los complementos externos no pueden registrar middleware de resultados de herramientas porque la costura puede reescribir la salida de herramientas de alta confianza antes de que el modelo la vea.

Los registros de tiempo de ejecución de `api.registerTool(...)` deben coincidir con `contracts.tools`. El descubrimiento de herramientas utiliza esta lista para cargar solo los tiempos de ejecución de complementos que pueden poseer las herramientas solicitadas.

Los complementos del proveedor que implementen `resolveExternalAuthProfiles` deben declarar
`contracts.externalAuthProviders`; se ignoran los enlaces de autenticación externa no declarados.

Los proveedores de incrustación generales deben declarar `contracts.embeddingProviders` para
cada adaptador registrado con `api.registerEmbeddingProvider(...)`. Utilice el
contrato general para la generación de vectores reutilizables, incluyendo los proveedores consumidos por
la búsqueda de memoria. `contracts.memoryEmbeddingProviders` es una compatibilidad
deprecada específica de la memoria y permanece solo mientras los proveedores existentes migran
a la costura de proveedor de incrustación genérico.

`contracts.gatewayMethodDispatch` actualmente acepta
`"authenticated-request"`. Es una puerta de higiene de API para las rutas HTTP de complementos nativos
que envían intencionalmente métodos del plano de control de Gateway en proceso, no
un sandbox contra complementos nativos maliciosos. Úselo solo para superficies de paquete/operador
revisadas minuciosamente que ya requieren autenticación HTTP de Gateway.

## referencia de mediaUnderstandingProviderMetadata

Use `mediaUnderstandingProviderMetadata` cuando un proveedor de comprensión de medios tenga
modelos predeterminados, prioridad de reserva de autenticación automática o soporte de documentos nativo que
los ayudantes principales genéricos necesitan antes de que se cargue el tiempo de ejecución. Las claves también deben declararse en
`contracts.mediaUnderstandingProviders`.

```json
{
  "contracts": {
    "mediaUnderstandingProviders": ["example"]
  },
  "mediaUnderstandingProviderMetadata": {
    "example": {
      "capabilities": ["image", "audio"],
      "defaultModels": {
        "image": "example-vision-latest",
        "audio": "example-transcribe-latest"
      },
      "autoPriority": {
        "image": 40
      },
      "nativeDocumentInputs": ["pdf"]
    }
  }
}
```

Cada entrada de proveedor puede incluir:

| Campo                  | Tipo                                | Lo que significa                                                                                          |
| ---------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `capabilities`         | `("image" \| "audio" \| "video")[]` | Capacidades de medios expuestas por este proveedor.                                                       |
| `defaultModels`        | `Record<string, string>`            | Valores predeterminados de capacidad a modelo utilizados cuando la configuración no especifica un modelo. |
| `autoPriority`         | `Record<string, number>`            | Los números más bajos se ordenan antes para la reserva automática del proveedor basada en credenciales.   |
| `nativeDocumentInputs` | `"pdf"[]`                           | Entradas de documentos nativas compatibles con el proveedor.                                              |

## referencia de channelConfigs

Use `channelConfigs` cuando un complemento de canal necesite metadatos de configuración económicos antes
de que se cargue el tiempo de ejecución. El descubrimiento de estado/configuración del canal de solo lectura puede usar estos metadatos
directamente para canales externos configurados cuando no hay disponible una entrada de configuración, o
cuando `setup.requiresRuntime: false` declara que el tiempo de ejecución de configuración no es necesario.

`channelConfigs` son metadatos del manifiesto del complemento, no una nueva sección de configuración de usuario de nivel superior. Los usuarios todavía configuran las instancias del canal bajo `channels.<channel-id>`. OpenClaw lee los metadatos del manifiesto para decidir qué complemento posee ese canal configurado antes de que se ejecute el código de tiempo de ejecución del complemento.

Para un complemento de canal, `configSchema` y `channelConfigs` describen diferentes rutas:

- `configSchema` valida `plugins.entries.<plugin-id>.config`
- `channelConfigs.<channel-id>.schema` valida `channels.<channel-id>`

Los complementos no empaquetados que declaran `channels[]` también deben declarar entradas `channelConfigs` coincidentes. Sin ellas, OpenClaw aún puede cargar el complemento, pero el esquema de configuración de la ruta de acceso no frecuente (cold-path), la configuración y las superficies de la interfaz de usuario de Control no pueden conocer la forma de la opción propiedad del canal hasta que se ejecute el tiempo de ejecución del complemento.

`channelConfigs.<channel-id>.commands.nativeCommandsAutoEnabled` y
`nativeSkillsAutoEnabled` pueden declarar valores predeterminados estáticos de `auto` para verificaciones de configuración de comandos que se ejecutan antes de que se cargue el tiempo de ejecución del canal. Los canales empaquetados también pueden publicar los mismos valores predeterminados a través de `package.json#openclaw.channel.commands` junto con sus otros metadatos del catálogo de canales propiedad del paquete.

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
      "commands": {
        "nativeCommandsAutoEnabled": true,
        "nativeSkillsAutoEnabled": true
      },
      "preferOver": ["matrix-legacy"]
    }
  }
}
```

Cada entrada de canal puede incluir:

| Campo         | Tipo                     | Significado                                                                                                                                                  |
| ------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `schema`      | `object`                 | Esquema JSON para `channels.<id>`. Obligatorio para cada entrada de configuración de canal declarada.                                                        |
| `uiHints`     | `Record<string, object>` | Etiquetas de interfaz de usuario opcionales/marcadores de posición/sugerencias confidenciales para esa sección de configuración de canal.                    |
| `label`       | `string`                 | Etiqueta del canal fusionada en las superficies del selector y de inspección cuando los metadatos de tiempo de ejecución no están listos.                    |
| `description` | `string`                 | Descripción breve del canal para las superficies de inspección y catálogo.                                                                                   |
| `commands`    | `object`                 | Valores predeterminados automáticos de comandos nativos y habilidades nativas estáticas para verificaciones de configuración previas al tiempo de ejecución. |
| `preferOver`  | `string[]`               | Identificadores de complementos heredados o de menor prioridad que este canal debería superar en las superficies de selección.                               |

### Reemplazar otro complemento de canal

Use `preferOver` cuando su complemento sea el propietario preferido para un id de canal que
otro complemento también puede proporcionar. Los casos comunes son un id de complemento renombrado, un
complemento independiente que reemplaza a un complemento incluido, o un fork mantenido que
conserva el mismo id de canal para compatibilidad de configuración.

```json
{
  "id": "acme-chat",
  "channels": ["chat"],
  "channelConfigs": {
    "chat": {
      "schema": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "webhookUrl": { "type": "string" }
        }
      },
      "preferOver": ["chat"]
    }
  }
}
```

Cuando se configura `channels.chat`, OpenClaw considera tanto el id del canal como
el id del complemento preferido. Si el complemento de menor prioridad se seleccionó solo porque
está incluido o habilitado de forma predeterminada, OpenClaw lo deshabilita en la configuración
de runtime efectiva para que un complemento sea propietario del canal y sus herramientas. La selección
explícita del usuario sigue ganando: si el usuario habilita explícitamente ambos complementos, OpenClaw
conserva esa elección e informa diagnósticos de canal/herramienta duplicados en lugar de
cambiar silenciosamente el conjunto de complementos solicitado.

Mantenga `preferOver` limitado a ids de complementos que realmente puedan proporcionar el mismo canal.
No es un campo de prioridad general y no renombra las claves de configuración del usuario.

## referencia de modelSupport

Use `modelSupport` cuando OpenClaw deba inferir su complemento de proveedor desde
ids de modelo abreviados como `gpt-5.5` o `claude-sonnet-4.6` antes de que se cargue el runtime del
complemento.

```json
{
  "modelSupport": {
    "modelPrefixes": ["gpt-", "o1", "o3", "o4"],
    "modelPatterns": ["^computer-use-preview"]
  }
}
```

OpenClaw aplica esta precedencia:

- las referencias `provider/model` explícitas usan los metadatos del manifiesto `providers` propietario
- `modelPatterns` ganan a `modelPrefixes`
- si un complemento no incluido y un complemento incluido coinciden ambos, gana el complemento
  no incluido
- la ambigüedad restante se ignora hasta que el usuario o la configuración especifiquen un proveedor

Campos:

| Campo           | Tipo       | Qué significa                                                                                                  |
| --------------- | ---------- | -------------------------------------------------------------------------------------------------------------- |
| `modelPrefixes` | `string[]` | Prefijos coincidentes con `startsWith` contra ids de modelo abreviados.                                        |
| `modelPatterns` | `string[]` | Fuentes de regex coincidentes contra ids de modelo abreviados después de la eliminación del sufijo del perfil. |

Las entradas `modelPatterns` se compilan a través de `compileSafeRegex`, que rechaza
patrones que contienen repeticiones anidadas (por ejemplo `(a+)+$`). Los patrones que no
pasan la verificación de seguridad se omiten silenciosamente, igual que las expresiones regex sintácticamente inválidas.
Mantenga los patrones simples y evite cuantificadores anidados.

## referencia de modelCatalog

Use `modelCatalog` cuando OpenClaw deba conocer los metadatos del modelo del proveedor antes
de cargar el tiempo de ejecución del complemento. Esta es la fuente propiedad del manifiesto para filas de catálogo
fijas, alias de proveedor, reglas de supresión y modo de descubrimiento. La actualización en tiempo de ejecución
aún pertenece al código de tiempo de ejecución del proveedor, pero el manifiesto le indica al núcleo cuándo se requiere
el tiempo de ejecución.

```json
{
  "providers": ["openai"],
  "modelCatalog": {
    "providers": {
      "openai": {
        "baseUrl": "https://api.openai.com/v1",
        "api": "openai-responses",
        "models": [
          {
            "id": "gpt-5.4",
            "name": "GPT-5.4",
            "input": ["text", "image"],
            "reasoning": true,
            "contextWindow": 256000,
            "maxTokens": 128000,
            "cost": {
              "input": 1.25,
              "output": 10,
              "cacheRead": 0.125
            },
            "status": "available",
            "tags": ["default"]
          }
        ]
      }
    },
    "aliases": {
      "azure-openai-responses": {
        "provider": "openai",
        "api": "azure-openai-responses"
      }
    },
    "suppressions": [
      {
        "provider": "azure-openai-responses",
        "model": "gpt-5.3-codex-spark",
        "reason": "not available on Azure OpenAI Responses"
      }
    ],
    "discovery": {
      "openai": "static"
    }
  }
}
```

Campos de nivel superior:

| Campo            | Tipo                                                     | Lo que significa                                                                                                                                                 |
| ---------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `providers`      | `Record<string, object>`                                 | Filas de catálogo para los ids de proveedor propiedad de este complemento. Las claves también deben aparecer en el nivel superior `providers`.                   |
| `aliases`        | `Record<string, object>`                                 | Alias de proveedor que deben resolverse a un proveedor propio para la planificación de catálogo o supresión.                                                     |
| `suppressions`   | `object[]`                                               | Filas de modelo de otra fuente que este complemento suprime por una razón específica del proveedor.                                                              |
| `discovery`      | `Record<string, "static" \| "refreshable" \| "runtime">` | Si el catálogo del proveedor se puede leer desde los metadatos del manifiesto, actualizar en caché o requiere tiempo de ejecución.                               |
| `runtimeAugment` | `boolean`                                                | Establézcalo en `true` solo cuando el tiempo de ejecución del proveedor deba agregar filas de catálogo después de la planificación del manifiesto/configuración. |

`aliases` participa en la búsqueda de propiedad del proveedor para la planificación del catálogo de modelos.
Los objetivos de alias deben ser proveedores de nivel superior propiedad del mismo complemento. Cuando una
lista filtrada por proveedor usa un alias, OpenClaw puede leer el manifiesto propietario y
aplicar los reemplazos de API/URL base del alias sin cargar el tiempo de ejecución del proveedor.
Los alias no expanden las listificaciones de catálogo sin filtrar; las listas amplias emiten solo las
filas del proveedor canónico propietario.

`suppressions` reemplaza el antiguo enlace `suppressBuiltInModel` del runtime del proveedor.
Las entradas de supresión se respetan solo cuando el proveedor es propiedad del complemento o
declarado como una clave `modelCatalog.aliases` que apunte a un proveedor propio. Los enlaces
de supresión del runtime ya no se llaman durante la resolución del modelo.

Campos del proveedor:

| Campo     | Tipo                     | Qué significa                                                                              |
| --------- | ------------------------ | ------------------------------------------------------------------------------------------ |
| `baseUrl` | `string`                 | URL base opcional predeterminada para los modelos en este catálogo de proveedores.         |
| `api`     | `ModelApi`               | Adaptador de API opcional predeterminado para los modelos en este catálogo de proveedores. |
| `headers` | `Record<string, string>` | Encabezados estáticos opcionales que se aplican a este catálogo de proveedores.            |
| `models`  | `object[]`               | Filas de modelo obligatorias. Se ignoran las filas sin un `id`.                            |

Campos del modelo:

| Campo           | Tipo                                                           | Qué significa                                                                                                 |
| --------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `id`            | `string`                                                       | ID de modelo local del proveedor, sin el prefijo `provider/`.                                                 |
| `name`          | `string`                                                       | Nombre para mostrar opcional.                                                                                 |
| `api`           | `ModelApi`                                                     | Anulación de API opcional por modelo.                                                                         |
| `baseUrl`       | `string`                                                       | Anulación de URL base opcional por modelo.                                                                    |
| `headers`       | `Record<string, string>`                                       | Encabezados estáticos opcionales por modelo.                                                                  |
| `input`         | `Array<"text" \| "image" \| "document" \| "audio" \| "video">` | Modalidades que el modelo acepta.                                                                             |
| `reasoning`     | `boolean`                                                      | Si el modelo expone un comportamiento de razonamiento.                                                        |
| `contextWindow` | `number`                                                       | Ventana de contexto del proveedor nativo.                                                                     |
| `contextTokens` | `number`                                                       | Límite de contexto de tiempo de ejecución efectivo opcional cuando difiere de `contextWindow`.                |
| `maxTokens`     | `number`                                                       | Tokens de salida máximos cuando se conocen.                                                                   |
| `cost`          | `object`                                                       | Precios opcionales en USD por millón de tokens, incluyendo `tieredPricing` opcional.                          |
| `compat`        | `object`                                                       | Marcas de compatibilidad opcionales que coinciden con la compatibilidad de configuración del modelo OpenClaw. |
| `status`        | `"available"` \| `"preview"` \| `"deprecated"` \| `"disabled"` | Estado de listado. Suprimir solo cuando la fila no debe aparecer en absoluto.                                 |
| `statusReason`  | `string`                                                       | Motivo opcional que se muestra con el estado no disponible.                                                   |
| `replaces`      | `string[]`                                                     | Identificadores de modelos locales del proveedor más antiguos que este modelo reemplaza.                      |
| `replacedBy`    | `string`                                                       | Identificador de modelo local del proveedor de reemplazo para filas obsoletas.                                |
| `tags`          | `string[]`                                                     | Etiquetas estables utilizadas por los selectores y filtros.                                                   |

Campos de supresión:

| Campo                      | Tipo       | Lo que significa                                                                                                                                    |
| -------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider`                 | `string`   | Identificador del proveedor para la fila ascendente que se va a suprimir. Debe ser propiedad de este complemento o declararse como un alias propio. |
| `model`                    | `string`   | Identificador de modelo local del proveedor para suprimir.                                                                                          |
| `reason`                   | `string`   | Mensaje opcional que se muestra cuando se solicita directamente la fila suprimida.                                                                  |
| `when.baseUrlHosts`        | `string[]` | Lista opcional de hosts de URL base efectivos del proveedor requeridos antes de que se aplique la supresión.                                        |
| `when.providerConfigApiIn` | `string[]` | Lista opcional de valores exactos de `api` de configuración del proveedor requeridos antes de que se aplique la supresión.                          |

No coloque datos solo de tiempo de ejecución en `modelCatalog`. Use `static` solo cuando las filas del manifiesto estén lo suficientemente completas para que las listas filtradas por proveedor y las superficies de selección omitan el descubrimiento de registro/tiempo de ejecución. Use `refreshable` cuando las filas del manifiesto sean semillas o suplementos listables útiles, pero una actualización/caché pueda agregar más filas más adelante; las filas actualizables no son autoritarias por sí mismas. Use `runtime` cuando OpenClaw deba cargar el tiempo de ejecución del proveedor para conocer la lista.

## Referencia de modelIdNormalization

Use `modelIdNormalization` para la limpieza económica de IDs de modelos propiedad del proveedor que debe ocurrir antes de que se cargue el tiempo de ejecución del proveedor. Esto mantiene alias como nombres cortos de modelos, IDs heredados locales del proveedor y reglas de prefijo de proxy en el manifiesto del complemento propietario en lugar de en las tablas centrales de selección de modelos.

```json
{
  "providers": ["anthropic", "openrouter"],
  "modelIdNormalization": {
    "providers": {
      "anthropic": {
        "aliases": {
          "sonnet-4.6": "claude-sonnet-4-6"
        }
      },
      "openrouter": {
        "prefixWhenBare": "openrouter"
      }
    }
  }
}
```

Campos del proveedor:

| Campo                                | Tipo                    | Lo que significa                                                                                                              |
| ------------------------------------ | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `aliases`                            | `Record<string,string>` | Alias exactos de ID de modelo que no distinguen entre mayúsculas y minúsculas. Los valores se devuelven tal como se escriben. |
| `stripPrefixes`                      | `string[]`              | Prefijos para eliminar antes de la búsqueda de alias, útil para la duplicación de proveedor/modelo heredada.                  |
| `prefixWhenBare`                     | `string`                | Prefijo para agregar cuando el ID de modelo normalizado aún no contiene `/`.                                                  |
| `prefixWhenBareAfterAliasStartsWith` | `object[]`              | Reglas condicionales de prefijo de ID simple después de la búsqueda de alias, clave por `modelPrefix` y `prefix`.             |

## Referencia de providerEndpoints

Use `providerEndpoints` para la clasificación de puntos finales que la política de solicitudes genérica debe conocer antes de que se cargue el tiempo de ejecución del proveedor. Core sigue siendo el propietario del significado de cada `endpointClass`; los manifiestos de los complementos son propietarios de los metadatos del host y la URL base.

Campos del punto final:

| Campo                          | Tipo       | Lo que significa                                                                                                        |
| ------------------------------ | ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| `endpointClass`                | `string`   | Clase de punto final central conocida, como `openrouter`, `moonshot-native` o `google-vertex`.                          |
| `hosts`                        | `string[]` | Nombres de host exactos que se asignan a la clase de punto final.                                                       |
| `hostSuffixes`                 | `string[]` | Sufijos de host que se asignan a la clase de endpoint. Prefije con `.` para una coincidencia de solo sufijo de dominio. |
| `baseUrls`                     | `string[]` | URLs base HTTP(S) normalizadas exactas que se asignan a la clase de endpoint.                                           |
| `googleVertexRegion`           | `string`   | Región estática de Google Vertex para hosts globales exactos.                                                           |
| `googleVertexRegionHostSuffix` | `string`   | Sufijo para eliminar de los hosts coincidentes para exponer el prefijo de región de Google Vertex.                      |

## referencia de providerRequest

Use `providerRequest` para metadatos de compatibilidad de solicitudes baratos que la política de solicitudes genérica necesita sin cargar el tiempo de ejecución del proveedor. Mantenga la reescritura de carga útil específica del comportamiento en los ganchos del tiempo de ejecución del proveedor o en los ayudantes compartidos de la familia de proveedores.

```json
{
  "providers": ["vllm"],
  "providerRequest": {
    "providers": {
      "vllm": {
        "family": "vllm",
        "openAICompletions": {
          "supportsStreamingUsage": true
        }
      }
    }
  }
}
```

Campos del proveedor:

| Campo                 | Tipo         | Significado                                                                                                          |
| --------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------- |
| `family`              | `string`     | Etiqueta de familia de proveedor utilizada por decisiones de compatibilidad de solicitudes genéricas y diagnósticos. |
| `compatibilityFamily` | `"moonshot"` | Cubo de compatibilidad de familia de proveedores opcional para ayudantes de solicitudes compartidas.                 |
| `openAICompletions`   | `object`     | Marcas de solicitud de finalizaciones compatibles con OpenAI, actualmente `supportsStreamingUsage`.                  |

## referencia de modelPricing

Use `modelPricing` cuando un proveedor necesita un comportamiento de precios del plano de control antes de que se cargue el tiempo de ejecución. La caché de precios de Gateway lee estos metadatos sin importar el código del tiempo de ejecución del proveedor.

```json
{
  "providers": ["ollama", "openrouter"],
  "modelPricing": {
    "providers": {
      "ollama": {
        "external": false
      },
      "openrouter": {
        "openRouter": {
          "passthroughProviderModel": true
        },
        "liteLLM": false
      }
    }
  }
}
```

Campos del proveedor:

| Campo        | Tipo              | Significado                                                                                                       |
| ------------ | ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| `external`   | `boolean`         | Establezca `false` para proveedores locales/autoalojados que nunca deben obtener precios de OpenRouter o LiteLLM. |
| `openRouter` | `false \| object` | Mapeo de búsqueda de precios de OpenRouter. `false` desactiva la búsqueda de OpenRouter para este proveedor.      |
| `liteLLM`    | `false \| object` | Mapeo de búsqueda de precios de LiteLLM. `false` desactiva la búsqueda de LiteLLM para este proveedor.            |

Campos de origen:

| Campo                      | Tipo               | Qué significa                                                                                                                             |
| -------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `provider`                 | `string`           | Id del proveedor de catálogo externo cuando difiere del id del proveedor de OpenClaw, por ejemplo `z-ai` para un proveedor `zai`.         |
| `passthroughProviderModel` | `boolean`          | Tratar los ids de modelo que contienen barras como referencias anidadas de proveedor/modelo, útil para proveedores proxy como OpenRouter. |
| `modelIdTransforms`        | `"version-dots"[]` | Variantes adicionales de ids de modelo de catálogo externo. `version-dots` intenta ids de versión con puntos como `claude-opus-4.6`.      |

### Índice de proveedores de OpenClaw

El Índice de proveedores de OpenClaw son metadatos de vista previa propiedad de OpenClaw para proveedores
cuyos complementos pueden no estar instalados aún. No es parte de un manifiesto de complemento.
Los manifiestos de complementos siguen siendo la autoridad de los complementos instalados. El Índice de proveedores es
el contrato de reserva interno que las futuras superficies de proveedor instalable y selector de modelos
preinstalado consumirán cuando no se haya instalado un complemento de proveedor.

Orden de autoridad del catálogo:

1. Configuración de usuario.
2. Manifiesto del complemento instalado `modelCatalog`.
3. Caché del catálogo de modelos de actualización explícita.
4. Filas de vista previa del Índice de proveedores de OpenClaw.

El Índice de proveedores no debe contener secretos, estado habilitado, ganchos de ejecución o
datos de modelo en vivo específicos de la cuenta. Sus catálogos de vista previa usan la misma
forma de fila de proveedor `modelCatalog` que los manifiestos de complementos, pero deben limitarse
a metadatos de visualización estables, a menos que los campos del adaptador de ejecución como `api`,
`baseUrl`, precios o indicadores de compatibilidad se mantengan intencionalmente alineados con
el manifiesto del complemento instalado. Los proveedores con descubrimiento en vivo de `/models` deben
escribir filas actualizadas a través de la ruta de caché del catálogo de modelos explícita en lugar de
realizar llamadas normales de listado o incorporación a las API del proveedor.

Las entradas del Índice de Proveedores también pueden contener metadatos de complementos instalables para proveedores cuyo complemento se ha movido fuera del núcleo o aún no está instalado. Estos metadatos reflejan el patrón del catálogo de canales: el nombre del paquete, la especificación de instalación de npm, la integridad esperada y las etiquetas de elección de autenticación barata son suficientes para mostrar una opción de configuración instalable. Una vez que el complemento está instalado, su manifiesto prevalece y se ignora la entrada del Índice de Proveedores para ese proveedor.

Las claves de capacidades de nivel superior heredadas están obsoletas. Use `openclaw doctor --fix` para mover `speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders` y `webSearchProviders` debajo de `contracts`; la carga normal del manifiesto ya no trata esos campos de nivel superior como propiedad de la capacidad.

## Manifiesto versus package.

Los dos archivos sirven para diferentes trabajos:

| Archivo                | Úselo para                                                                                                                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw.plugin.json` | Descubrimiento, validación de configuración, metadatos de elección de autenticación e indicaciones de interfaz de usuario que deben existir antes de que se ejecute el código del complemento |
| `package.json`         | Metadatos de npm, instalación de dependencias y el bloque `openclaw` utilizado para puntos de entrada, control de instalación, configuración o metadatos del catálogo                         |

Si no está seguro de dónde pertenece un fragmento de metadatos, use esta regla:

- si OpenClaw debe saberlo antes de cargar el código del complemento, póngalo en `openclaw.plugin.json`
- si se trata del empaquetado, los archivos de entrada o el comportamiento de instalación de npm, póngalo en `package.json`

### Campos de package. que afectan el descubrimiento

Algunos metadatos de complementos previos a la ejecución residen intencionalmente en `package.json` bajo el bloque `openclaw` en lugar de `openclaw.plugin.json`. `openclaw.bundle` y `openclaw.bundle.json` no son contratos de complementos de OpenClaw; los complementos nativos deben usar `openclaw.plugin.json` más los campos `package.json#openclaw` compatibles a continuación.

Ejemplos importantes:

| Campo                                                                                      | Lo que significa                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `openclaw.extensions`                                                                      | Declara los puntos de entrada de complementos nativos. Debe permanecer dentro del directorio del paquete del complemento.                                                                                                                        |
| `openclaw.runtimeExtensions`                                                               | Declara los puntos de entrada del tiempo de ejecución de JavaScript compilados para los paquetes instalados. Debe permanecer dentro del directorio del paquete del complemento.                                                                  |
| `openclaw.setupEntry`                                                                      | Punto de entrada ligero solo de configuración utilizado durante la incorporación, el inicio diferido del canal y el descubrimiento de estado de canal solo lectura/SecretRef. Debe permanecer dentro del directorio del paquete del complemento. |
| `openclaw.runtimeSetupEntry`                                                               | Declara el punto de entrada de configuración de JavaScript compilado para los paquetes instalados. Requiere `setupEntry`, debe existir y debe permanecer dentro del directorio del paquete del complemento.                                      |
| `openclaw.channel`                                                                         | Metadatos de catálogo de canal ligero como etiquetas, rutas de documentos, alias y copia de selección.                                                                                                                                           |
| `openclaw.channel.commands`                                                                | Metadatos predeterminados automáticos de comandos nativos y habilidades nativas estáticas utilizados por la configuración, la auditoría y las superficies de listas de comandos antes de que se cargue el tiempo de ejecución del canal.         |
| `openclaw.channel.configuredState`                                                         | Metadatos del comprobador de estado configurado ligero que pueden responder "¿ya existe la configuración solo de entorno?" sin cargar el tiempo de ejecución completo del canal.                                                                 |
| `openclaw.channel.persistedAuthState`                                                      | Metadatos del comprobador de autenticación persistente ligero que pueden responder "¿ya hay algo iniciado sesión?" sin cargar el tiempo de ejecución completo del canal.                                                                         |
| `openclaw.install.clawhubSpec` / `openclaw.install.npmSpec` / `openclaw.install.localPath` | Sugerencias de instalación/actualización para complementos empaquetados y publicados externamente.                                                                                                                                               |
| `openclaw.install.defaultChoice`                                                           | Ruta de instalación preferida cuando hay múltiples fuentes de instalación disponibles.                                                                                                                                                           |
| `openclaw.install.minHostVersion`                                                          | Versión mínima compatible del host OpenClaw, utilizando un suelo semver como `>=2026.3.22` o `>=2026.5.1-beta.1`.                                                                                                                                |
| `openclaw.compat.pluginApi`                                                                | Rango mínimo de API de complemento de OpenClaw requerido por este paquete, utilizando un suelo semver como `>=2026.5.27`.                                                                                                                        |
| `openclaw.install.expectedIntegrity`                                                       | Cadena de integridad de distribución npm esperada, como `sha512-...`; los flujos de instalación y actualización verifican el artefacto obtenido contra ella.                                                                                     |
| `openclaw.install.allowInvalidConfigRecovery`                                              | Permite una ruta de recuperación de reinstalación de complemento empaquetado estrecha cuando la configuración no es válida.                                                                                                                      |
| `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`                          | Permite que los canales de configuración en tiempo de ejecución se carguen antes de escuchar, y luego difiere el complemento de canal completamente configurado hasta la activación posterior a la escucha.                                      |

Los metadatos del manifiesto deciden qué opciones de proveedor/canal/configuración aparecen en la incorporación antes de que se cargue el tiempo de ejecución. `package.json#openclaw.install` indica a la incorporación cómo obtener o habilitar ese complemento cuando el usuario elige una de esas opciones. No mueva las sugerencias de instalación a `openclaw.plugin.json`.

`openclaw.install.minHostVersion` se hace cumplir durante la instalación y la carga del registro de manifiestos para fuentes de complementos no empaquetados. Los valores no válidos se rechazan; los valores más nuevos pero válidos omiten los complementos externos en hosts más antiguos. Se asume que los complementos de fuente empaquetados tienen la misma versión que el checkout del host.

`openclaw.compat.pluginApi` se hace cumplir durante la instalación del paquete para fuentes de complementos no empaquetadas. Úselo para la versión base de la API del SDK/tiempo de ejecución del complemento de OpenClaw contra la cual se construyó el paquete. Puede ser más estricto que `minHostVersion` cuando un paquete de complemento necesita una API más nueva pero aún mantiene una sugerencia de instalación más baja para otros flujos. La versión oficial de lanzamiento de OpenClaw sincroniza las versiones base de la API de complementos oficiales existentes con la versión de lanzamiento de OpenClaw de manera predeterminada, pero los lanzamientos solo de complementos pueden mantener una versión base más baja cuando el paquete admite intencionalmente hosts más antiguos. No use la versión del paquete por sí sola como contrato de compatibilidad. `peerDependencies.openclaw` sigue siendo metadatos del paquete npm; OpenClaw usa el contrato `openclaw.compat.pluginApi` para decisiones de compatibilidad de instalación.

Los metadatos oficiales de instalación bajo demanda deben usar `clawhubSpec` cuando el complemento se publique en ClawHub; la incorporación lo trata como la fuente remota preferida y registra los hechos del artefacto de ClawHub después de la instalación. `npmSpec` sigue siendo la reserva de compatibilidad para paquetes que aún no se han movido a ClawHub.

La fijación exacta de la versión de npm ya reside en `npmSpec`, por ejemplo
`"npmSpec": "@wecom/wecom-openclaw-plugin@1.2.3"`. Las entradas oficiales del catálogo externo
deben emparejar especificaciones exactas con `expectedIntegrity` para que los flujos de actualización fallen
cerrados si el artefacto de npm obtenido ya no coincide con la versión fijada.
La incorporación interactiva todavía ofrece especificaciones de npm de registro de confianza, incluyendo nombres
de paquetes simples y dist-tags, por compatibilidad. Los diagnósticos del catálogo pueden
distinguir fuentes exactas, flotantes, con integridad fijada, con integridad faltante, con discrepancia de nombre de paquete
y de elección predeterminada no válida. También advierten cuando
`expectedIntegrity` está presente pero no hay una fuente de npm válida que pueda fijar.
Cuando `expectedIntegrity` está presente,
los flujos de instalación/actualización lo hacen cumplir; cuando se omite, la resolución del registro se
registra sin un fijador de integridad.

Los complementos de canal deben proporcionar `openclaw.setupEntry` cuando el estado, la lista de canales,
o los escaneos de SecretRef necesitan identificar cuentas configuradas sin cargar el runtime
completo. La entrada de configuración debe exponer metadatos del canal más adaptadores de configuración,
estado y secretos seguros para la configuración; mantenga los clientes de red, los escuchas de puerta de enlace
y los runtimes de transporte en el punto de entrada principal de la extensión.

Los campos de punto de entrada del runtime no anulan las comprobaciones de límite del paquete para los campos
de punto de entrada de origen. Por ejemplo, `openclaw.runtimeExtensions` no puede hacer que una ruta
`openclaw.extensions` que se escapa sea cargable.

`openclaw.install.allowInvalidConfigRecovery` es intencionalmente limitado. No
hace que configuraciones rotas arbitrarias sean instalables. Hoy solo permite que los flujos
de instalación se recuperen de fallos específicos de actualización de complementos empaquetados obsoletos, tales como una
ruta de complemento empaquetado faltante o una entrada `channels.<id>` obsoleta para ese mismo
complemento empaquetado. Errores de configuración no relacionados aún bloquean la instalación y envían a los operadores
a `openclaw doctor --fix`.

`openclaw.channel.persistedAuthState` son metadatos del paquete para un tiny checker
módulo:

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

Úselo cuando los flujos de configuración, doctor, estado o presencia de solo lectura necesiten una prueba de autenticación sí/no económica antes de que se cargue el complemento de canal completo. El estado de autenticación persistente no es el estado del canal configurado: no use estos metadatos para habilitar complementos automáticamente, reparar dependencias en tiempo de ejecución o decidir si se debe cargar un tiempo de ejecución de canal. La exportación de destino debe ser una pequeña función que solo lea el estado persistente; no la enrute a través del barril completo del tiempo de ejecución del canal.

`openclaw.channel.configuredState` sigue la misma forma para verificaciones económicas configuradas solo por entorno:

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

Úselo cuando un canal pueda responder el estado configurado desde el entorno u otras pequeñas entradas que no son de tiempo de ejecución. Si la verificación necesita una resolución completa de la configuración o el tiempo de ejecución real del canal, mantenga esa lógica en el enlace `config.hasConfiguredState` del complemento en su lugar.

## Precedencia de descubrimiento (ids de complementos duplicados)

OpenClaw descubre complementos desde varias raíces. Para ver el orden de escaneo del sistema de archivos sin procesar, consulte [Orden de escaneo de complementos](/es/gateway/configuration-reference#plugin-scan-order). Si dos descubrimientos comparten el mismo `id`, solo se mantiene el manifiesto de **mayor precedencia**; los duplicados de menor precedencia se descartan en lugar de cargarse junto a él.

Precedencia, de mayor a menor:

1. **Seleccionado por configuración** — una ruta fijada explícitamente en `plugins.entries.<id>`
2. **Incluido en el paquete** — complementos enviados con OpenClaw
3. **Instalación global** — complementos instalados en la raíz global de complementos de OpenClaw
4. **Espacio de trabajo** — complementos descubiertos en relación con el espacio de trabajo actual

Implicaciones:

- Una copia bifurcada o obsoleta de un complemento incluido que se encuentre en el espacio de trabajo no eclipsará la compilación incluida.
- Para anular realmente un complemento incluido con uno local, fíjelo mediante `plugins.entries.<id>` para que gane por precedencia en lugar de confiar en el descubrimiento del espacio de trabajo.
- Las eliminaciones de duplicados se registran para que Doctor y los diagnósticos de inicio puedan señalar la copia descartada.
- Las anulaciones de duplicados seleccionados por configuración se redactan como anulaciones explícitas en los diagnósticos, pero aún advierten para que las bifurcaciones obsoletas y los sombreados accidentales sigan siendo visibles.

## Requisitos del esquema JSON

- **Cada complemento debe incluir un esquema JSON**, incluso si no acepta ninguna configuración.
- Un esquema vacío es aceptable (por ejemplo, `{ "type": "object", "additionalProperties": false }`).
- Los esquemas se validan en el momento de lectura/escritura de la configuración, no en tiempo de ejecución.
- Al extender o hacer un fork de un complemento empaquetado con nuevas claves de configuración, actualice el `openclaw.plugin.json` `configSchema` de ese complemento al mismo tiempo. Los esquemas de complementos empaquetados son estrictos, por lo que agregar `plugins.entries.<id>.config.myNewKey` en la configuración de usuario sin agregar `myNewKey` a `configSchema.properties` se rechazará antes de que se cargue el tiempo de ejecución del complemento.

Ejemplo de extensión de esquema:

```json
{
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "myNewKey": {
        "type": "string"
      }
    }
  }
}
```

## Comportamiento de validación

- Las claves `channels.*` desconocidas son **errores**, a menos que el id del canal sea declarado por
  un manifiesto de complemento.
- `plugins.entries.<id>`, `plugins.allow`, `plugins.deny` y `plugins.slots.*`
  deben hacer referencia a ids de complementos **discoverable**. Los ids desconocidos son **errores**.
- Si un complemento está instalado pero tiene un manifiesto o esquema roto o faltante,
  la validación falla y Doctor informa el error del complemento.
- Si existe la configuración del complemento pero el complemento está **deshabilitado**, la configuración se mantiene y
  se muestra una **advertencia** en Doctor + registros.

Consulte [Referencia de configuración](/es/gateway/configuration) para el esquema completo de `plugins.*`.

## Notas

- El manifiesto es **obligatorio para los complementos nativos de OpenClaw**, incluidas las cargas del sistema de archivos local. El tiempo de ejecución todavía carga el módulo del complemento por separado; el manifiesto es solo para descubrimiento + validación.
- Los manifiestos nativos se analizan con JSON5, por lo que se aceptan comentarios, comas finales y claves sin comillas siempre que el valor final siga siendo un objeto.
- El cargador de manifiestos solo lee los campos de manifiesto documentados. Evite claves personalizadas de nivel superior.
- `channels`, `providers`, `cliBackends` y `skills` pueden omitirse todos cuando un complemento no los necesita.
- `providerCatalogEntry` debe mantenerse ligero y no debe importar código de tiempo de ejecución amplio; úselo para metadatos estáticos del catálogo de proveedores o descriptores de descubrimiento estrechos, no para ejecución en el momento de la solicitud.
- Los tipos de complementos exclusivos se seleccionan a través de `plugins.slots.*`: `kind: "memory"` a través de `plugins.slots.memory`, `kind: "context-engine"` a través de `plugins.slots.contextEngine` (predeterminado `legacy`).
- Declara el tipo de complemento exclusivo en este manifiesto. La entrada de tiempo de ejecución `OpenClawPluginDefinition.kind` está obsoleta y permanece solo como una reserva de compatibilidad para complementos más antiguos.
- Los metadatos de las variables de entorno (`setup.providers[].envVars`, `providerAuthEnvVars` obsoleto y `channelEnvVars`) son solo declarativos. El estado, la auditoría, la validación de entrega cron y otras superficies de solo lectura todavía aplican la confianza del complemento y la política de activación efectiva antes de tratar una variable de entorno como configurada.
- Para los metadatos del asistente de tiempo de ejecución que requieren código de proveedor, consulta [Provider runtime hooks](/es/plugins/architecture-internals#provider-runtime-hooks).
- Si tu complemento depende de módulos nativos, documenta los pasos de compilación y cualquier requisito de lista de permitidos del administrador de paquetes (por ejemplo, pnpm `allow-build-scripts` + `pnpm rebuild <package>`).

## Relacionado

<CardGroup cols={3}>
  <Card title="Creación de complementos" href="/es/plugins/building-plugins" icon="rocket">
    Cómo empezar con los complementos.
  </Card>
  <Card title="Arquitectura de complementos" href="/es/plugins/architecture" icon="diagram-project">
    Arquitectura interna y modelo de capacidades.
  </Card>
  <Card title="Descripción general del SDK" href="/es/plugins/sdk-overview" icon="book">
    Referencia del SDK de complementos e importaciones de subrutas.
  </Card>
</CardGroup>
