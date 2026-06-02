---
summary: "Manifiesto de complemento + requisitos del esquema JSON (validación de configuración estricta)"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "Manifiesto de complemento"
---

Esta página es solo para el **manifiesto del complemento nativo de OpenClaw**.

Para diseños de paquetes compatibles, consulte [Paquetes de complementos](/es/plugins/bundles).

Los formatos de paquete compatibles utilizan diferentes archivos de manifiesto:

- Paquete Codex: `.codex-plugin/plugin.json`
- Paquete Claude: `.claude-plugin/plugin.json` o el diseño predeterminado del componente Claude
  sin manifiesto
- Paquete Cursor: `.cursor-plugin/plugin.json`

OpenClaw también detecta automáticamente esos diseños de paquetes, pero no se validan
contra el esquema `openclaw.plugin.json` descrito aquí.

Para los paquetes compatibles, OpenClaw actualmente lee los metadatos del paquete más las
raíces de habilidades declaradas, las raíces de comandos de Claude, los valores predeterminados del paquete Claude `settings.json`,
los valores predeterminados de LSP del paquete Claude y los paquetes de enlace compatibles cuando el diseño coincide
con las expectativas de tiempo de ejecución de OpenClaw.

Cada complemento nativo de OpenClaw **debe** incluir un archivo `openclaw.plugin.json` en la
**raíz del complemento**. OpenClaw utiliza este manifiesto para validar la configuración
**sin ejecutar el código del complemento**. Los manifiestos faltantes o no válidos se tratan como
errores del complemento y bloquean la validación de la configuración.

Consulte la guía completa del sistema de complementos: [Complementos](/es/tools/plugin).
Para el modelo de capacidades nativo y la orientación actual de compatibilidad externa:
[Modelo de capacidades](/es/plugins/architecture#public-capability-model).

## Qué hace este archivo

`openclaw.plugin.json` son los metadatos que OpenClaw lee **antes de cargar su
código de complemento**. Todo lo que aparece a continuación debe ser lo suficientemente económico para inspeccionar sin iniciar
el tiempo de ejecución del complemento.

**Úselo para:**

- identidad del complemento, validación de configuración e sugerencias de la interfaz de usuario de configuración
- metadatos de autenticación, incorporación y configuración (alias, habilitación automática, variables de entorno del proveedor, opciones de autenticación)
- sugerencias de activación para superficies del plano de control
- propiedad abreviada de familia de modelos
- instantáneas estáticas de propiedad de capacidades (`contracts`)
- metadatos del ejecutor de QA que el host `openclaw qa` compartido puede inspeccionar
- metadatos de configuración específicos del canal fusionados en el catálogo y superficies de validación

**No lo utilice para:** registrar el comportamiento en tiempo de ejecución, declarar puntos de entrada de código
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
| `enabledByDefault`                   | No          | `true`                           | Marca un complemento agrupado como habilitado de forma predeterminada. Omítalo o establezca cualquier valor que no sea `true` para dejar el complemento deshabilitado de forma predeterminada.                                                                                                                     |
| `enabledByDefaultOnPlatforms`        | No          | `string[]`                       | Marca un complemento agrupado como habilitado de forma predeterminada solo en las plataformas de Node.js listadas, por ejemplo `["darwin"]`. La configuración explícita tiene prioridad.                                                                                                                           |
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
| `secretProviderIntegrations`         | No          | `Record<string, object>`         | Ajustes predefinidos de proveedores exec SecretRef declarativos que las superficies de configuración o instalación pueden ofrecer sin codificar integraciones específicas del proveedor en el núcleo.                                                                                                              |
| `cliBackends`                        | No          | `string[]`                       | IDs de backend de inferencia de CLI propiedad de este complemento. Se utiliza para la autoactivación al inicio desde referencias de configuración explícitas.                                                                                                                                                      |
| `syntheticAuthRefs`                  | No          | `string[]`                       | Referencias de proveedor o backend de CLI cuyo gancho de autenticación sintético propiedad del complemento debe sondearse durante el descubrimiento de modelos en frío antes de las cargas de tiempo de ejecución.                                                                                                 |
| `nonSecretAuthMarkers`               | No          | `string[]`                       | Valores de clave de API de marcador de posición propiedad del complemento agrupado que representan un estado de credenciales local, OAuth o ambiente no secreto.                                                                                                                                                   |
| `commandAliases`                     | No          | `object[]`                       | Nombres de comandos propiedad de este complemento que deben generar configuración y diagnósticos de CLI conscientes del complemento antes de que se cargue el tiempo de ejecución.                                                                                                                                 |
| `providerAuthEnvVars`                | No          | `Record<string, string[]>`       | Metadatos de entorno de compatibilidad en desuso para la búsqueda de autenticación/estado del proveedor. Prefiera `setup.providers[].envVars` para complementos nuevos; OpenClaw todavía lee esto durante el período de obsolescencia.                                                                             |
| `providerAuthAliases`                | No          | `Record<string, string>`         | ID de proveedor que deben reutilizar otro ID de proveedor para la búsqueda de autenticación, por ejemplo, un proveedor de codificación que comparte la clave API del proveedor base y los perfiles de autenticación.                                                                                               |
| `channelEnvVars`                     | No          | `Record<string, string[]>`       | Metadatos de entorno de canal económico que OpenClaw puede inspeccionar sin cargar el código del complemento. Use esto para la configuración de canal impulsada por entorno o superficies de autenticación que los asistentes genéricos de inicio/configuración deberían ver.                                      |
| `providerAuthChoices`                | No          | `object[]`                       | Metadatos económicos de elección de autenticación para selectores de incorporación, resolución de proveedor preferido y cableado simple de indicadores CLI.                                                                                                                                                        |
| `activation`                         | No          | `object`                         | Metadatos económicos del planificador de activación para la carga activada por inicio, proveedor, comando, canal, ruta y capacidad. Solo metadatos; el tiempo de ejecución del complemento sigue siendo el propietario del comportamiento real.                                                                    |
| `setup`                              | No          | `object`                         | Descriptores económicos de configuración/incorporación que las superficies de descubrimiento y configuración pueden inspeccionar sin cargar el tiempo de ejecución del complemento.                                                                                                                                |
| `qaRunners`                          | No          | `object[]`                       | Descriptores económicos de ejecutor de QA utilizados por el host `openclaw qa` compartido antes de que se cargue el tiempo de ejecución del complemento.                                                                                                                                                           |
| `contracts`                          | No          | `object`                         | Instantánea estática de propiedad de capacidades para ganchos de autenticación externos, incrustaciones, voz, transcripción en tiempo real, voz en tiempo real, comprensión de medios, generación de imágenes, generación de música, generación de video, obtención web, búsqueda web y propiedad de herramientas. |
| `mediaUnderstandingProviderMetadata` | No          | `Record<string, object>`         | Valores predeterminados económicos de comprensión de medios para los ID de proveedor declarados en `contracts.mediaUnderstandingProviders`.                                                                                                                                                                        |
| `imageGenerationProviderMetadata`    | No          | `Record<string, object>`         | Metadatos de autenticación económica para la generación de imágenes para los ids de proveedor declarados en `contracts.imageGenerationProviders`, incluyendo alias de autenticación propios del proveedor y protecciones de URL base.                                                                              |
| `videoGenerationProviderMetadata`    | No          | `Record<string, object>`         | Metadatos de autenticación económica para la generación de videos para los ids de proveedor declarados en `contracts.videoGenerationProviders`, incluyendo alias de autenticación propios del proveedor y protecciones de URL base.                                                                                |
| `musicGenerationProviderMetadata`    | No          | `Record<string, object>`         | Metadatos de autenticación económica para la generación de música para los ids de proveedor declarados en `contracts.musicGenerationProviders`, incluyendo alias de autenticación propios del proveedor y protecciones de URL base.                                                                                |
| `toolMetadata`                       | No          | `Record<string, object>`         | Metadatos de disponibilidad económica para las herramientas propiedad del complemento declaradas en `contracts.tools`. Úselo cuando una herramienta no debe cargar el tiempo de ejecución a menos que existan evidencias de configuración, entorno o autenticación.                                                |
| `channelConfigs`                     | No          | `Record<string, object>`         | Metadatos de configuración de canal propiedad del manifiesto combinados en las superficies de descubrimiento y validación antes de que se cargue el tiempo de ejecución.                                                                                                                                           |
| `skills`                             | No          | `string[]`                       | Directorios de habilidades (skills) a cargar, relativos a la raíz del complemento.                                                                                                                                                                                                                                 |
| `name`                               | No          | `string`                         | Nombre del complemento legible por humanos.                                                                                                                                                                                                                                                                        |
| `description`                        | No          | `string`                         | Resumen breve que se muestra en las superficies del complemento.                                                                                                                                                                                                                                                   |
| `version`                            | No          | `string`                         | Versión del complemento informativa.                                                                                                                                                                                                                                                                               |
| `uiHints`                            | No          | `Record<string, object>`         | Etiquetas de interfaz de usuario, marcadores de posición e indicaciones de sensibilidad para los campos de configuración.                                                                                                                                                                                          |

## Referencia de metadatos del proveedor de generación

Los campos de metadatos del proveedor de generación describen señales de autenticación estática para los
proveedores declarados en la lista `contracts.*GenerationProviders` coincidente.
OpenClaw lee estos campos antes de que se cargue el tiempo de ejecución del proveedor para que las herramientas básicas puedan
decidir si un proveedor de generación está disponible sin importar todos los
complementos del proveedor.

Use estos campos solo para hechos declarativos económicos. El transporte, las
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

| Campo                  | Obligatorio | Tipo       | Lo que significa                                                                                                                                                                                 |
| ---------------------- | ----------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `aliases`              | No          | `string[]` | Ids de proveedores adicionales que deben contar como alias de autenticación estática para el proveedor de generación.                                                                            |
| `authProviders`        | No          | `string[]` | Ids de proveedores cuyos perfiles de autenticación configurados deben contar como autenticación para este proveedor de generación.                                                               |
| `configSignals`        | No          | `object[]` | Señales de disponibilidad baratas y solo de configuración para proveedores locales o autohospedados que se pueden configurar sin perfiles de autenticación o variables de entorno.               |
| `authSignals`          | No          | `object[]` | Señales de autenticación explícitas. Cuando están presentes, estas reemplazan el conjunto de señales predeterminado del id del proveedor, `aliases` y `authProviders`.                           |
| `referenceAudioInputs` | No          | `boolean`  | Solo para generación de video. Establézcalo en `true` cuando el proveedor acepta activos de audio de referencia; de lo contrario, `video_generate` oculta los parámetros de referencia de audio. |

Cada entrada `configSignals` admite:

| Campo         | Obligatorio | Tipo       | Lo que significa                                                                                                                                                                                                |
| ------------- | ----------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rootPath`    | Sí          | `string`   | Ruta de puntos al objeto de configuración propiedad del complemento para inspeccionar, por ejemplo, `plugins.entries.example.config`.                                                                           |
| `overlayPath` | No          | `string`   | Ruta de puntos dentro de la configuración raíz cuyo objeto debe superponerse al objeto raíz antes de evaluar la señal. Use esto para configuración específica de la capacidad, como `image`, `video` o `music`. |
| `required`    | No          | `string[]` | Rutas de puntos dentro de la configuración efectiva que deben tener valores configurados. Las cadenas no deben estar vacías; los objetos y las matrices no deben estar vacíos.                                  |
| `requiredAny` | No          | `string[]` | Rutas de puntos dentro de la configuración efectiva donde al menos una debe tener un valor configurado.                                                                                                         |
| `mode`        | No          | `object`   | Guardia de modo de cadena opcional dentro de la configuración efectiva. Use esto cuando la disponibilidad solo de configuración se aplique solo a un modo.                                                      |

Cada guardia `mode` admite:

| Campo        | Obligatorio | Tipo       | Qué significa                                                                         |
| ------------ | ----------- | ---------- | ------------------------------------------------------------------------------------- |
| `path`       | No          | `string`   | Ruta de puntos dentro de la configuración efectiva. Por defecto es `mode`.            |
| `default`    | No          | `string`   | Valor de modo a usar cuando la configuración omite la ruta.                           |
| `allowed`    | No          | `string[]` | Si está presente, la señal pasa solo cuando el modo efectivo es uno de estos valores. |
| `disallowed` | No          | `string[]` | Si está presente, la señal falla cuando el modo efectivo es uno de estos valores.     |

Cada entrada `authSignals` soporta:

| Campo             | Obligatorio | Tipo     | Qué significa                                                                                                                                                                                             |
| ----------------- | ----------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider`        | Sí          | `string` | Id del proveedor a verificar en los perfiles de autenticación configurados.                                                                                                                               |
| `providerBaseUrl` | No          | `object` | Guarda opcional que hace que la señal cuente solo cuando el proveedor configurado referenciado utiliza una URL base permitida. Use esto cuando un alias de autenticación es válido solo para ciertas API. |

Cada guarda `providerBaseUrl` soporta:

| Campo             | Obligatorio | Tipo       | Qué significa                                                                                                                                                                |
| ----------------- | ----------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider`        | Sí          | `string`   | Id de configuración del proveedor cuyo `baseUrl` debe ser verificado.                                                                                                        |
| `defaultBaseUrl`  | No          | `string`   | URL base a asumir cuando la configuración del proveedor omite `baseUrl`.                                                                                                     |
| `allowedBaseUrls` | Sí          | `string[]` | URLs base permitidas para esta señal de autenticación. La señal se ignora cuando la URL base configurada o predeterminada no coincide con uno de estos valores normalizados. |

## Referencia de metadatos de herramienta

`toolMetadata` usa las mismas formas `configSignals` y `authSignals` que
los metadatos del proveedor de generación, claveados por el nombre de la herramienta. `contracts.tools` declara
propiedad. `toolMetadata` declara evidencia de disponibilidad económica para que OpenClaw pueda
evitar importar un tiempo de ejecución de complemento solo para que su fábrica de herramientas devuelva `null`.

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
carga el complemento propietario cuando el contrato de la herramienta coincide con la política. Para herramientas en la ruta crítica
cuya fábrica depende de autenticación/configuración, los autores de complementos deben declarar
`toolMetadata` en lugar de hacer que el núcleo importe el tiempo de ejecución para preguntar.

## referencia de providerAuthChoices

Cada entrada `providerAuthChoices` describe una opción de incorporación o autenticación.
OpenClaw lee esto antes de que se cargue el tiempo de ejecución del proveedor.
Las listas de configuración del proveedor usan estas opciones del manifiesto, las opciones de configuración derivadas del descriptor
y los metadatos del catálogo de instalación sin cargar el tiempo de ejecución del proveedor.

| Campo                 | Obligatorio | Tipo                                                                  | Significado                                                                                                                    |
| --------------------- | ----------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `provider`            | Sí          | `string`                                                              | ID del proveedor al que pertenece esta opción.                                                                                 |
| `method`              | Sí          | `string`                                                              | ID del método de autenticación al que despachar.                                                                               |
| `choiceId`            | Sí          | `string`                                                              | ID estable de la opción de autenticación utilizado por los flujos de incorporación y CLI.                                      |
| `choiceLabel`         | No          | `string`                                                              | Etiqueta visible para el usuario. Si se omite, OpenClaw recurre a `choiceId`.                                                  |
| `choiceHint`          | No          | `string`                                                              | Texto de ayuda breve para el selector.                                                                                         |
| `assistantPriority`   | No          | `number`                                                              | Los valores más bajos se ordenan antes en los selectores interactivos impulsados por el asistente.                             |
| `assistantVisibility` | No          | `"visible"` \| `"manual-only"`                                        | Ocultar la opción de los selectores del asistente permitiendo al mismo tiempo la selección manual de CLI.                      |
| `deprecatedChoiceIds` | No          | `string[]`                                                            | IDs de opciones heredadas que deben redirigir a los usuarios a esta opción de reemplazo.                                       |
| `groupId`             | No          | `string`                                                              | ID de grupo opcional para agrupar opciones relacionadas.                                                                       |
| `groupLabel`          | No          | `string`                                                              | Etiqueta visible para el usuario para ese grupo.                                                                               |
| `groupHint`           | No          | `string`                                                              | Texto de ayuda breve para el grupo.                                                                                            |
| `optionKey`           | No          | `string`                                                              | Clave de opción interna para flujos de autenticación simples de una sola bandera.                                              |
| `cliFlag`             | No          | `string`                                                              | Nombre de la opción de CLI, tal como `--openrouter-api-key`.                                                                   |
| `cliOption`           | No          | `string`                                                              | Forma completa de la opción de CLI, tal como `--openrouter-api-key <key>`.                                                     |
| `cliDescription`      | No          | `string`                                                              | Descripción utilizada en la ayuda de la CLI.                                                                                   |
| `onboardingScopes`    | No          | `Array<"text-inference" \| "image-generation" \| "music-generation">` | En qué superficies de incorporación debe aparecer esta elección. Si se omite, el valor predeterminado es `["text-inference"]`. |

## referencia de commandAliases

Use `commandAliases` cuando un complemento sea propietario de un nombre de comando en tiempo de ejecución que los usuarios puedan
colocar erróneamente en `plugins.allow` o intentar ejecutar como un comando raíz de la CLI. OpenClaw
usa estos metadatos para diagnósticos sin importar el código de tiempo de ejecución del complemento.

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

| Campo        | Obligatorio | Tipo              | Lo que significa                                                                        |
| ------------ | ----------- | ----------------- | --------------------------------------------------------------------------------------- |
| `name`       | Sí          | `string`          | Nombre del comando que pertenece a este complemento.                                    |
| `kind`       | No          | `"runtime-slash"` | Marca el alias como un comando de barra de chat en lugar de un comando raíz de la CLI.  |
| `cliCommand` | No          | `string`          | Comando raíz de la CLI relacionado para sugerir para operaciones de CLI, si existe uno. |

## referencia de activation

Use `activation` cuando el complemento pueda declarar fácilmente qué eventos del plano de control
deben incluirlo en un plan de activación/carga.

Este bloque es metadatos del planificador, no una API del ciclo de vida. No registra
comportamiento en tiempo de ejecución, no reemplaza `register(...)` y no promete que
el código del complemento ya se haya ejecutado. El planificador de activación utiliza estos campos para
reducir los complementos candidatos antes de recurrir a los metadatos de propiedad del manifiesto
existentes, como `providers`, `channels`, `commandAliases`, `setup.providers`,
`contracts.tools` y hooks.

Prefiera los metadatos más estrechos que ya describan la propiedad. Use
`providers`, `channels`, `commandAliases`, descriptores de configuración o `contracts`
cuando esos campos expresen la relación. Use `activation` para sugerencias adicionales
del planificador que no puedan ser representadas por esos campos de propiedad.
Use `cliBackends` de nivel superior para alias de tiempo de ejecución de CLI como `claude-cli`,
`my-cli` o `google-gemini-cli`; `activation.onAgentHarnesses` es solo para
ids de arneses de agentes integrados que aún no tienen un campo de propiedad.

Este bloque es solo de metadatos. No registra comportamiento de tiempo de ejecución y no
reemplaza `register(...)`, `setupEntry` u otros puntos de entrada de tiempo de ejecución/complementos.
Los consumidores actuales lo usan como una sugerencia de reducción antes de la carga más amplia del complemento, por lo que
la falta de metadatos de activación no inicial generalmente solo cuesta rendimiento; no
debería cambiar la corrección mientras aún existan reservas de propiedad del manifiesto.

Cada complemento debe establecer `activation.onStartup` intencionalmente. Establézcalo en `true`
solo cuando el complemento debe ejecutarse durante el inicio de Gateway. Establézcalo en `false` cuando
el complemento está inactivo al inicio y debe cargarse solo desde disparadores más estrechos.
Omitir `onStartup` ya no carga el complemento implícitamente al inicio; use metadatos
de activación explícitos para inicio, canal, configuración, arnés de agente, memoria u
otros disparadores de activación más estrechos.

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

| Campo              | Obligatorio | Tipo                                                 | Lo que significa                                                                                                                                                                                                                     |
| ------------------ | ----------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `onStartup`        | No          | `boolean`                                            | Activación explícita al inicio de Gateway. Cada complemento debe establecer esto. `true` importa el complemento durante el inicio; `false` lo mantiene diferido al inicio a menos que otro disparador coincidente requiera su carga. |
| `onProviders`      | No          | `string[]`                                           | Ids de proveedores que deben incluir este complemento en los planes de activación/carga.                                                                                                                                             |
| `onAgentHarnesses` | No          | `string[]`                                           | IDs de tiempo de ejecución del arnés del agente integrado que deben incluir este complemento en los planes de activación/carga. Use `cliBackends` de nivel superior para los alias del backend de CLI.                               |
| `onCommands`       | No          | `string[]`                                           | IDs de comandos que deben incluir este complemento en los planes de activación/carga.                                                                                                                                                |
| `onChannels`       | No          | `string[]`                                           | IDs de canales que deben incluir este complemento en los planes de activación/carga.                                                                                                                                                 |
| `onRoutes`         | No          | `string[]`                                           | Tipos de rutas que deben incluir este complemento en los planes de activación/carga.                                                                                                                                                 |
| `onConfigPaths`    | No          | `string[]`                                           | Rutas de configuración relativas a la raíz que deben incluir este complemento en los planes de inicio/carga cuando la ruta está presente y no está deshabilitada explícitamente.                                                     |
| `onCapabilities`   | No          | `Array<"provider" \| "channel" \| "tool" \| "hook">` | Sugerencias de capacidades amplias utilizadas por la planificación de activación del plano de control. Prefiera campos más estrechos cuando sea posible.                                                                             |

Consumidores activos actuales:

- La planificación de inicio de Gateway usa `activation.onStartup` para la importación
  de inicio explícita
- la planificación de CLI activada por comandos recurre a `commandAliases[].cliCommand` o `commandAliases[].name` heredados
- la planificación de inicio del tiempo de ejecución del agente usa `activation.onAgentHarnesses` para
  arneses integrados y `cliBackends[]` de nivel superior para alias de tiempo de ejecución de CLI
- la planificación de configuración/canal activada por canales recurre a la propiedad `channels[]`
  heredada cuando falta metadatos de activación de canal explícitos
- la planificación de complementos de inicio usa `activation.onConfigPaths` para superficies de configuración
  raíz que no son de canal, como el bloque `browser` del complemento del navegador incluido
- la planificación de configuración/tiempo de ejecución activada por proveedores recurre a `providers[]` heredado
  y a la propiedad `cliBackends[]` de nivel superior cuando faltan metadatos de activación de proveedores explícitos

Los diagnósticos del planificador pueden distinguir las sugerencias de activación explícitas del respaldo de propiedad del manifiesto. Por ejemplo, `activation-command-hint` significa que `activation.onCommands` coincidió, mientras que `manifest-command-alias` significa que el planificador utilizó la propiedad `commandAliases` en su lugar. Estas etiquetas de motivo son para los diagnósticos y pruebas del host; los autores de plugins deben seguir declarando los metadatos que mejor describan la propiedad.

## Referencia de qaRunners

Use `qaRunners` cuando un plugin contribuye con uno o más transport runners debajo de la raíz `openclaw qa` compartida. Mantenga estos metadatos económicos y estáticos; el tiempo de ejecución del plugin sigue siendo el dueño del registro real de la CLI a través de una superficie `runtime-api.ts` ligera que exporta `qaRunnerCliRegistrations`.

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

| Campo         | Obligatorio | Tipo     | Lo que significa                                                                         |
| ------------- | ----------- | -------- | ---------------------------------------------------------------------------------------- |
| `commandName` | Sí          | `string` | Subcomando montado debajo de `openclaw qa`, por ejemplo `matrix`.                        |
| `description` | No          | `string` | Texto de ayuda de respaldo utilizado cuando el host compartido necesita un comando stub. |

## Referencia de configuración

Use `setup` cuando las superficies de configuración y incorporación necesitan metadatos propiedad del plugin económicos antes de que se cargue el tiempo de ejecución.

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

`cliBackends` de nivel superior permanece válido y sigue describiendo los backends de inferencia de la CLI. `setup.cliBackends` es la superficie del descriptor específica de configuración para los flujos de control plano/configuración que deben permanecer solo de metadatos.

Cuando están presentes, `setup.providers` y `setup.cliBackends` son la superficie de búsqueda preferida primero por descriptores para el descubrimiento de configuración. Si el descriptor solo reduce el plugin candidato y la configuración aún necesita ganchos de tiempo de ejecución más ricos en el momento de la configuración, establezca `requiresRuntime: true` y mantenga `setup-api` en su lugar como la ruta de ejecución de respaldo.

OpenClaw también incluye `setup.providers[].envVars` en búsquedas genéricas de autenticación de proveedores y variables de entorno. `providerAuthEnvVars` sigue siendo compatible a través de un adaptador de compatibilidad durante el período de desuso, pero los complementos no empaquetados que aún lo usan reciben un diagnóstico de manifiesto. Los nuevos complementos deben colocar los metadatos de entorno de configuración/estado en `setup.providers[].envVars`.

OpenClaw también puede derivar opciones de configuración simples de `setup.providers[].authMethods` cuando no hay una entrada de configuración disponible, o cuando `setup.requiresRuntime: false` declara que el tiempo de ejecución de configuración es innecesario. Las entradas explícitas de `providerAuthChoices` siguen siendo preferidas para etiquetas personalizadas, indicadores de CLI, alcance de incorporación y metadatos del asistente.

Establezca `requiresRuntime: false` solo cuando esos descriptores sean suficientes para la superficie de configuración. OpenClaw trata `false` explícito como un contrato de solo descriptor y no ejecutará `setup-api` o `openclaw.setupEntry` para la búsqueda de configuración. Si un complemento de solo descriptor aún envía una de esas entradas de tiempo de ejecución de configuración, OpenClaw informa un diagnóstico aditivo y continúa ignorándolo. Omitir `requiresRuntime` mantiene el comportamiento de reserva heredado para que los complementos existentes que agregaron descriptores sin el indicador no se rompan.

Dado que la búsqueda de configuración puede ejecutar código `setup-api` propiedad del complemento, los valores normalizados de `setup.providers[].id` y `setup.cliBackends[]` deben mantenerse únicos en todos los complementos descubiertos. La propiedad ambigua falla de forma cerrada en lugar de elegir un ganador del orden de descubrimiento.

Cuando se ejecuta el tiempo de ejecución de configuración, los diagnósticos del registro de configuración informan una desviación del descriptor si `setup-api` registra un proveedor o un backend de CLI que los descriptores del manifiesto no declaran, o si un descriptor no tiene un registro de tiempo de ejecución coincidente. Estos diagnósticos son aditivos y no rechazan los complementos heredados.

### referencia de setup.providers

| Campo          | Obligatorio | Tipo       | Qué significa                                                                                                                                              |
| -------------- | ----------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`           | Sí          | `string`   | Id. de proveedor expuesto durante la configuración o incorporación. Mantenga los ids. normalizados únicos globalmente.                                     |
| `authMethods`  | No          | `string[]` | IDs de métodos de configuración/autenticación que este proveedor admite sin cargar el tiempo de ejecución completo.                                        |
| `envVars`      | No          | `string[]` | Variables de entorno que las superficies genéricas de configuración/estado pueden verificar antes de que se cargue el tiempo de ejecución del complemento. |
| `authEvidence` | No          | `object[]` | Verificaciones de evidencia de autenticación local económicas para proveedores que pueden autenticarse mediante marcadores no secretos.                    |

`authEvidence` es para marcadores de credenciales locales propiedad del proveedor que pueden ser
verificados sin cargar código de tiempo de ejecución. Estas verificaciones deben mantenerse económicas y locales:
sin llamadas de red, sin lecturas de llaveros o gestores de secretos, sin comandos de shell y sin
sondas de API del proveedor.

Entradas de evidencia admitidas:

| Campo              | Requerido | Tipo       | Qué significa                                                                                                                    |
| ------------------ | --------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `type`             | Sí        | `string`   | Actualmente `local-file-with-env`.                                                                                               |
| `fileEnvVar`       | No        | `string`   | Variable de entorno que contiene una ruta de archivo de credenciales explícita.                                                  |
| `fallbackPaths`    | No        | `string[]` | Rutas de archivos de credenciales locales verificadas cuando `fileEnvVar` está ausente o vacío. Admite `${HOME}` y `${APPDATA}`. |
| `requiresAnyEnv`   | No        | `string[]` | Al menos una variable de entorno listada debe no estar vacía para que la evidencia sea válida.                                   |
| `requiresAllEnv`   | No        | `string[]` | Todas las variables de entorno listadas deben no estar vacías para que la evidencia sea válida.                                  |
| `credentialMarker` | Sí        | `string`   | Marcador no secreto devuelto cuando la evidencia está presente.                                                                  |
| `source`           | No        | `string`   | Etiqueta de origen orientada al usuario para la salida de autenticación/estado.                                                  |

### campos de configuración

| Campo              | Requerido | Tipo       | Qué significa                                                                                                                                                    |
| ------------------ | --------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `providers`        | No        | `object[]` | Descriptores de configuración del proveedor expuestos durante la configuración y el onboarding.                                                                  |
| `cliBackends`      | No        | `string[]` | IDs de backend en tiempo de configuración utilizados para la búsqueda de configuración basada en descriptores. Mantenga los IDs normalizados globalmente únicos. |
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
| `help`        | `string`   | Texto de ayuda corto.                                      |
| `tags`        | `string[]` | Etiquetas de interfaz de usuario opcionales.               |
| `advanced`    | `boolean`  | Marca el campo como avanzado.                              |
| `sensitive`   | `boolean`  | Marca el campo como secreto o confidencial.                |
| `placeholder` | `string`   | Texto de marcador de posición para entradas de formulario. |

## referencia de contratos

Use `contracts` solo para metadatos estáticos de propiedad de capacidad que OpenClaw puede
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
    "mediaUnderstandingProviders": ["openai"],
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

| Campo                            | Tipo       | Lo que significa                                                                                                                                |
| -------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `embeddedExtensionFactories`     | `string[]` | Ids de fábrica de extensión del servidor de aplicaciones Codex, actualmente `codex-app-server`.                                                 |
| `agentToolResultMiddleware`      | `string[]` | Ids de tiempo de ejecución para los que un complemento empaquetado puede registrar middleware de resultados de herramientas.                    |
| `externalAuthProviders`          | `string[]` | Ids de proveedores cuyo gancho de perfil de autenticación externa posee este complemento.                                                       |
| `embeddingProviders`             | `string[]` | Ids de proveedor de incrustación general que este complemento posee para el uso de incrustación de vectores reutilizables, incluida la memoria. |
| `speechProviders`                | `string[]` | Ids de proveedor de voz que posee este complemento.                                                                                             |
| `realtimeTranscriptionProviders` | `string[]` | Ids de proveedor de transcripción en tiempo real que posee este complemento.                                                                    |
| `realtimeVoiceProviders`         | `string[]` | Ids de proveedor de voz en tiempo real que posee este complemento.                                                                              |
| `memoryEmbeddingProviders`       | `string[]` | Ids de proveedores de incrustación específicos de memoria en desuso que posee este complemento.                                                 |
| `mediaUnderstandingProviders`    | `string[]` | Ids de proveedores de comprensión de medios que posee este complemento.                                                                         |
| `transcriptSourceProviders`      | `string[]` | Ids de proveedores de fuentes de transcripciones que posee este complemento.                                                                    |
| `imageGenerationProviders`       | `string[]` | Ids de proveedores de generación de imágenes que posee este complemento.                                                                        |
| `videoGenerationProviders`       | `string[]` | Ids de proveedores de generación de videos que posee este complemento.                                                                          |
| `webFetchProviders`              | `string[]` | Ids de proveedores de obtención web que posee este complemento.                                                                                 |
| `webSearchProviders`             | `string[]` | Ids de proveedores de búsqueda web que posee este complemento.                                                                                  |
| `migrationProviders`             | `string[]` | Ids de proveedores de importación que posee este complemento para `openclaw migrate`.                                                           |
| `gatewayMethodDispatch`          | `string[]` | Derecho reservado para las rutas HTTP autenticadas de complementos que despachan métodos de Gateway en proceso.                                 |
| `tools`                          | `string[]` | Nombres de herramientas de agente que posee este complemento.                                                                                   |

`contracts.embeddedExtensionFactories` se mantiene para las fábricas de extensiones
exclusivas del servidor de aplicaciones Codex empaquetado. Las transformaciones
de resultados de herramientas empaquetadas deben declarar
`contracts.agentToolResultMiddleware` y registrarse con
`api.registerAgentToolResultMiddleware(...)` en su lugar. Los complementos externos no
pueden registrar middleware de resultados de herramientas porque la costura puede reescribir la salida de herramientas de alta confianza
antes de que el modelo la vea.

Los registros de tiempo de ejecución `api.registerTool(...)` deben coincidir con `contracts.tools`.
El descubrimiento de herramientas utiliza esta lista para cargar solo los tiempos de ejecución de complementos que pueden poseer las
herramientas solicitadas.

Los complementos de proveedores que implementan `resolveExternalAuthProfiles` deben declarar
`contracts.externalAuthProviders`; se ignoran los ganchos de autenticación externa no declarados.

Los proveedores de incrustación generales deben declarar `contracts.embeddingProviders` para
cada adaptador registrado con `api.registerEmbeddingProvider(...)`. Use el
contrato general para la generación de vectores reutilizables, incluyendo los proveedores consumidos por
la búsqueda de memoria. `contracts.memoryEmbeddingProviders` es una compatibilidad
descontinuada específica para la memoria y permanece solo mientras los proveedores existentes migran
a la costura de proveedor de incrustación genérico.

`contracts.gatewayMethodDispatch` actualmente acepta
`"authenticated-request"`. Es una puerta de higiene de API para rutas HTTP de
complementos nativos que envían intencionalmente métodos del plano de control de Gateway en proceso, no
un sandbox contra complementos nativos maliciosos. Úselo solo para superficies empaquetadas/de operador revisadas minuciosamente
que ya requieren autenticación HTTP de Gateway.

## Referencia de mediaUnderstandingProviderMetadata

Use `mediaUnderstandingProviderMetadata` cuando un proveedor de comprensión de medios tiene
modelos predeterminados, prioridad de reserva de autenticación automática o compatibilidad con documentos nativos que
los ayudantes principales genéricos necesitan antes de las cargas de tiempo de ejecución. Las claves también deben declararse en
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

| Campo                  | Tipo                                | Lo que significa                                                                                         |
| ---------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `capabilities`         | `("image" \| "audio" \| "video")[]` | Capacidades de medios expuestas por este proveedor.                                                      |
| `defaultModels`        | `Record<string, string>`            | Valores predeterminados de capacidad a modelo cuando la configuración no especifica un modelo.           |
| `autoPriority`         | `Record<string, number>`            | Los números más bajos se ordenan antes para la reserva automática de proveedores basada en credenciales. |
| `nativeDocumentInputs` | `"pdf"[]`                           | Entradas de documentos nativos admitidas por el proveedor.                                               |

## Referencia de channelConfigs

Use `channelConfigs` cuando un complemento de canal necesita metadatos de configuración baratos antes
de que se cargue el tiempo de ejecución. El descubrimiento de configuración/estado de solo lectura del canal puede usar estos metadatos
directamente para canales externos configurados cuando no hay disponible ninguna entrada de configuración, o
cuando `setup.requiresRuntime: false` declara que el tiempo de ejecución de configuración es innecesario.

`channelConfigs` son metadatos del manifiesto del complemento, no una nueva sección de configuración de usuario de nivel superior. Los usuarios todavía configuran instancias de canal bajo `channels.<channel-id>`. OpenClaw lee los metadatos del manifiesto para decidir qué complemento posee ese canal configurado antes de que se ejecute el código de tiempo de ejecución del complemento.

Para un complemento de canal, `configSchema` y `channelConfigs` describen diferentes rutas:

- `configSchema` valida `plugins.entries.<plugin-id>.config`
- `channelConfigs.<channel-id>.schema` valida `channels.<channel-id>`

Los complementos no empaquetados que declaran `channels[]` también deben declarar entradas `channelConfigs` coincidentes. Sin ellas, OpenClaw aún puede cargar el complemento, pero el esquema de configuración de ruta fría (cold-path), la configuración y las superficies de la UI de Control no pueden conocer la forma de la opción propiedad del canal hasta que se ejecute el tiempo de ejecución del complemento.

`channelConfigs.<channel-id>.commands.nativeCommandsAutoEnabled` y `nativeSkillsAutoEnabled` pueden declarar valores predeterminados estáticos `auto` para verificaciones de configuración de comandos que se ejecutan antes de que se cargue el tiempo de ejecución del canal. Los canales empaquetados también pueden publicar los mismos valores predeterminados a través de `package.json#openclaw.channel.commands` junto con sus otros metadatos del catálogo de canales propiedad del paquete.

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

| Campo         | Tipo                     | Qué significa                                                                                                                                                |
| ------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `schema`      | `object`                 | Esquema JSON para `channels.<id>`. Obligatorio para cada entrada de configuración de canal declarada.                                                        |
| `uiHints`     | `Record<string, object>` | Etiquetas/placeholders/sugerencias sensibles de UI opcionales para esa sección de configuración de canal.                                                    |
| `label`       | `string`                 | Etiqueta del canal fusionada en las superficies de selector e inspección cuando los metadatos de tiempo de ejecución no están listos.                        |
| `description` | `string`                 | Descripción breve del canal para las superficies de inspección y catálogo.                                                                                   |
| `commands`    | `object`                 | Valores predeterminados automáticos de comandos nativos y habilidades nativas estáticas para verificaciones de configuración previas al tiempo de ejecución. |
| `preferOver`  | `string[]`               | IDs de complementos heredados o de menor prioridad que este canal debería superar en las superficies de selección.                                           |

### Reemplazar otro complemento de canal

Use `preferOver` cuando su complemento sea el propietario preferido para un id de canal que
otro complemento también puede proporcionar. Los casos comunes son un id de complemento renombrado, un
complemento independiente que reemplaza a un complemento incluido, o un fork mantenido que
mantiene el mismo id de canal para compatibilidad de configuración.

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
el id del complemento preferido. Si el complemento de menor prioridad solo fue seleccionado porque
está incluido o habilitado de forma predeterminada, OpenClaw lo deshabilita en la configuración
efectiva de tiempo de ejecución para que un complemento sea propietario del canal y sus herramientas. La selección
explícita del usuario todavía tiene prioridad: si el usuario habilita explícitamente ambos complementos, OpenClaw
mantiene esa elección e informa diagnósticos de canal/herramienta duplicados en lugar de
cambiar silenciosamente el conjunto de complementos solicitado.

Mantenga `preferOver` limitado a ids de complementos que realmente puedan proporcionar el mismo canal.
No es un campo de prioridad general y no cambia las claves de configuración de usuario.

## referencia de modelSupport

Use `modelSupport` cuando OpenClaw deba inferir su complemento de proveedor desde
ids de modelos abreviados como `gpt-5.5` o `claude-sonnet-4.6` antes de que se cargue el
tiempo de ejecución del complemento.

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
- `modelPatterns` tienen prioridad sobre `modelPrefixes`
- si coinciden un complemento no incluido y un complemento incluido, el complemento no incluido
  gana
- la ambigüedad restante se ignora hasta que el usuario o la configuración especifiquen un proveedor

Campos:

| Campo           | Tipo       | Significado                                                                                                                |
| --------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| `modelPrefixes` | `string[]` | Prefijos coincidentes con `startsWith` contra ids de modelos abreviados.                                                   |
| `modelPatterns` | `string[]` | Fuentes de expresiones regulares comparadas con ids de modelos abreviados después de la eliminación del sufijo del perfil. |

Las entradas `modelPatterns` se compilan a través de `compileSafeRegex`, que rechaza
patrones que contengan repetición anidada (por ejemplo `(a+)+$`). Los patrones que fallan
la verificación de seguridad se omiten silenciosamente, igual que las expresiones regex sintácticamente inválidas.
Mantenga los patrones simples y evite cuantificadores anidados.

## referencia de modelCatalog

Use `modelCatalog` cuando OpenClaw deba conocer los metadatos del modelo del proveedor antes
de cargar el tiempo de ejecución del complemento. Esta es la fuente propiedad del manifiesto para filas de
catálogo fijas, alias de proveedor, reglas de supresión y modo de descubrimiento. La actualización en tiempo
de ejecución aún pertenece al código de tiempo de ejecución del proveedor, pero el manifiesto le indica al núcleo cuándo se
requiere el tiempo de ejecución.

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
| `providers`      | `Record<string, object>`                                 | Filas de catálogo para ids de proveedor propiedad de este complemento. Las claves también deben aparecer en el nivel superior `providers`.                       |
| `aliases`        | `Record<string, object>`                                 | Alias de proveedor que deben resolverse en un proveedor propiedad para la planificación de catálogo o supresión.                                                 |
| `suppressions`   | `object[]`                                               | Filas de modelo de otra fuente que este complemento suprime por una razón específica del proveedor.                                                              |
| `discovery`      | `Record<string, "static" \| "refreshable" \| "runtime">` | Si el catálogo del proveedor se puede leer desde los metadatos del manifiesto, actualizarse en la caché o requiere tiempo de ejecución.                          |
| `runtimeAugment` | `boolean`                                                | Establézcalo en `true` solo cuando el tiempo de ejecución del proveedor deba agregar filas de catálogo después de la planificación del manifiesto/configuración. |

`aliases` participa en la búsqueda de propiedad del proveedor para la planificación del catálogo de modelos.
Los objetivos de alias deben ser proveedores de nivel superior propiedad del mismo complemento. Cuando una
lista filtrada por proveedor usa un alias, OpenClaw puede leer el manifieto propietario y
aplicar anulaciones de API/URL base del alias sin cargar el tiempo de ejecución del proveedor.
Los alias no expanden las listados de catálogo sin filtrar; las listas amplias emiten solo las filas
del proveedor canónico propietario.

`suppressions` reemplaza el antiguo gancho `suppressBuiltInModel` del tiempo de ejecución del proveedor.
Las entradas de supresión se respetan solo cuando el proveedor es propiedad del complemento o
declarado como una clave `modelCatalog.aliases` que tiene como objetivo un proveedor propio. Los ganchos
de supresión en tiempo de ejecución ya no se llaman durante la resolución del modelo.

Campos del proveedor:

| Campo     | Tipo                     | Lo que significa                                                                           |
| --------- | ------------------------ | ------------------------------------------------------------------------------------------ |
| `baseUrl` | `string`                 | URL base opcional predeterminada para los modelos en este catálogo de proveedores.         |
| `api`     | `ModelApi`               | Adaptador de API opcional predeterminado para los modelos en este catálogo de proveedores. |
| `headers` | `Record<string, string>` | Encabezados estáticos opcionales que se aplican a este catálogo de proveedores.            |
| `models`  | `object[]`               | Filas de modelo requeridas. Se ignoran las filas sin un `id`.                              |

Campos del modelo:

| Campo           | Tipo                                                           | Lo que significa                                                                                                 |
| --------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `id`            | `string`                                                       | ID de modelo local del proveedor, sin el prefijo `provider/`.                                                    |
| `name`          | `string`                                                       | Nombre para mostrar opcional.                                                                                    |
| `api`           | `ModelApi`                                                     | Anulación de API opcional por modelo.                                                                            |
| `baseUrl`       | `string`                                                       | Anulación de URL base opcional por modelo.                                                                       |
| `headers`       | `Record<string, string>`                                       | Encabezados estáticos opcionales por modelo.                                                                     |
| `input`         | `Array<"text" \| "image" \| "document" \| "audio" \| "video">` | Modalidades que el modelo acepta.                                                                                |
| `reasoning`     | `boolean`                                                      | Si el modelo expone comportamiento de razonamiento.                                                              |
| `contextWindow` | `number`                                                       | Ventana de contexto nativa del proveedor.                                                                        |
| `contextTokens` | `number`                                                       | Límite efectivo de contexto en tiempo de ejecución opcional cuando difiere de `contextWindow`.                   |
| `maxTokens`     | `number`                                                       | Tokens de salida máximos cuando se conocen.                                                                      |
| `cost`          | `object`                                                       | Precio opcional en USD por millón de tokens, incluyendo `tieredPricing` opcional.                                |
| `compat`        | `object`                                                       | Marcas de compatibilidad opcionales que coinciden con la compatibilidad de configuración del modelo de OpenClaw. |
| `status`        | `"available"` \| `"preview"` \| `"deprecated"` \| `"disabled"` | Estado de listado. Suprimir solo cuando la fila no debe aparecer en absoluto.                                    |
| `statusReason`  | `string`                                                       | Motivo opcional que se muestra con el estado no disponible.                                                      |
| `replaces`      | `string[]`                                                     | Ids de modelo locales del proveedor antiguos que este modelo reemplaza.                                          |
| `replacedBy`    | `string`                                                       | Id de modelo local del proveedor de reemplazo para filas obsoletas.                                              |
| `tags`          | `string[]`                                                     | Etiquetas estables utilizadas por selectores y filtros.                                                          |

Campos de supresión:

| Campo                      | Tipo       | Lo que significa                                                                                                                         |
| -------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `provider`                 | `string`   | Id del proveedor para la fila ascendente que se va a suprimir. Debe ser propiedad de este complemento o declararse como un alias propio. |
| `model`                    | `string`   | Id de modelo local del proveedor para suprimir.                                                                                          |
| `reason`                   | `string`   | Mensaje opcional que se muestra cuando se solicita directamente la fila suprimida.                                                       |
| `when.baseUrlHosts`        | `string[]` | Lista opcional de hosts de URL base efectivos del proveedor requeridos antes de que se aplique la supresión.                             |
| `when.providerConfigApiIn` | `string[]` | Lista opcional de valores exactos de `api` de configuración del proveedor requeridos antes de que se aplique la supresión.               |

No pongas datos que solo sean de tiempo de ejecución en `modelCatalog`. Usa `static` solo cuando las filas del manifiesto estén lo suficientemente completas para que las listas filtradas por proveedor y las superficies de selección puedan omitir el descubrimiento del registro/tiempo de ejecución. Usa `refreshable` cuando las filas del manifiesto sean semillas listables útiles o complementos, pero una actualización/caché pueda añadir más filas más adelante; las filas actualizables no son autoritarias por sí mismas. Usa `runtime` cuando OpenClaw deba cargar el tiempo de ejecución del proveedor para conocer la lista.

## referencia de modelIdNormalization

Usa `modelIdNormalization` para una limpieza económica de ID de modelo propiedad del proveedor que debe ocurrir antes de que se cargue el tiempo de ejecución del proveedor. Esto mantiene alias como nombres cortos de modelo, IDs heredados locales del proveedor y reglas de prefijo de proxy en el manifiesto del plugin propietario en lugar de en las tablas principales de selección de modelo.

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

| Campo                                | Tipo                    | Lo que significa                                                                                                                 |
| ------------------------------------ | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `aliases`                            | `Record<string,string>` | Alias de ID de modelo exactos que no distinguen entre mayúsculas y minúsculas. Los valores se devuelven tal como están escritos. |
| `stripPrefixes`                      | `string[]`              | Prefijos para eliminar antes de la búsqueda de alias, útil para la duplicación heredada de proveedor/modelo.                     |
| `prefixWhenBare`                     | `string`                | Prefijo para añadir cuando el ID de modelo normalizado aún no contiene `/`.                                                      |
| `prefixWhenBareAfterAliasStartsWith` | `object[]`              | Reglas condicionales de prefijo de ID simple después de la búsqueda de alias, clave por `modelPrefix` y `prefix`.                |

## referencia de providerEndpoints

Usa `providerEndpoints` para la clasificación de endpoints que la política genérica de solicitudes debe conocer antes de que se cargue el tiempo de ejecución del proveedor. Core sigue siendo el propietario del significado de cada `endpointClass`; los manifiestos de los plugins son propietarios de los metadatos del host y la URL base.

Campos de endpoint:

| Campo                          | Tipo       | Lo que significa                                                                                                       |
| ------------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| `endpointClass`                | `string`   | Clase de endpoint central conocida, como `openrouter`, `moonshot-native` o `google-vertex`.                            |
| `hosts`                        | `string[]` | Nombres de host exactos que se asignan a la clase de endpoint.                                                         |
| `hostSuffixes`                 | `string[]` | Sufijos de host que se asignan a la clase de extremo. Prefije con `.` para la coincidencia solo de sufijos de dominio. |
| `baseUrls`                     | `string[]` | URLs base normalizadas exactas de HTTP(S) que se asignan a la clase de extremo.                                        |
| `googleVertexRegion`           | `string`   | Región estática de Google Vertex para hosts globales exactos.                                                          |
| `googleVertexRegionHostSuffix` | `string`   | Sufijo que se debe eliminar de los hosts coincidentes para exponer el prefijo de región de Google Vertex.              |

## referencia de providerRequest

Use `providerRequest` para metadatos de compatibilidad de solicitudes económicos que la política de solicitud genérica necesita sin cargar el tiempo de ejecución del proveedor. Mantenga la reescritura de carga útil específica del comportamiento en los enlaces del tiempo de ejecución del proveedor o en los auxiliares compartidos de la familia de proveedores.

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

| Campo                 | Tipo         | Lo que significa                                                                                                       |
| --------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `family`              | `string`     | Etiqueta de familia de proveedores utilizada por decisiones genéricas de compatibilidad de solicitudes y diagnósticos. |
| `compatibilityFamily` | `"moonshot"` | Cubo de compatibilidad opcional de familia de proveedores para auxiliares de solicitudes compartidos.                  |
| `openAICompletions`   | `object`     | Marcadores de solicitud de finalizaciones compatibles con OpenAI, actualmente `supportsStreamingUsage`.                |

## referencia de secretProviderIntegrations

Use `secretProviderIntegrations` cuando un complemento pueda publicar un preajuste de proveedor exec SecretRef reutilizable. OpenClaw lee estos metadatos antes de que se cargue el tiempo de ejecución del complemento, almacena la propiedad del complemento en `secrets.providers.<alias>.pluginIntegration` y deja la resolución real de secretos para el tiempo de ejecución de SecretRef. Los preajustes solo se exponen para complementos empaquetados y complementos instalados descubiertos desde las raíces de instalación administradas de complementos, como instalaciones de git y ClawHub.

```json
{
  "secretProviderIntegrations": {
    "secret-store": {
      "providerAlias": "team-secrets",
      "displayName": "Team secrets",
      "source": "exec",
      "command": "${node}",
      "args": ["./bin/resolve-secrets.mjs"]
    }
  }
}
```

La clave del mapa es el id. de integración. Si se omite `providerAlias`, OpenClaw usa el id. de integración como alias del proveedor SecretRef. Los alias de proveedores deben coincidir con el patrón de alias de proveedor normal de SecretRef, por ejemplo `team-secrets` o `onepassword-work`.

Cuando un operador selecciona el preajuste, OpenClaw escribe una referencia de proveedor como:

```json
{
  "secrets": {
    "providers": {
      "team-secrets": {
        "source": "exec",
        "pluginIntegration": {
          "pluginId": "acme-secrets",
          "integrationId": "secret-store"
        }
      }
    }
  }
}
```

Al iniciar/recargar, OpenClaw resuelve ese proveedor cargando los metadatos del manifiesto del complemento actual, verificando que el complemento propietario esté instalado y activo, y materializando el comando exec desde el manifiesto. Deshabilitar o eliminar el complemento revoca el proveedor para los SecretRefs activos. Los operadores que deseen una configuración exec independiente aún pueden escribir proveedores `command`/`args` manuales directamente.

Actualmente solo se admiten los preajustes `source: "exec"`. `command` debe ser `${node}`, y `args[0]` debe ser un script de resolución relativo a la raíz del complemento `./`. OpenClaw lo materializa al iniciar/recargar hacia el ejecutable Node actual y la ruta absoluta del script dentro del complemento. Las opciones de Node como `--require`, `--import`, `--loader`, `--env-file`, `--eval` y `--print` no son parte del contrato del preajuste del manifiesto. Los operadores que necesiten comandos que no sean de Node pueden configurar proveedores exec manuales independientes directamente.

OpenClaw deriva `trustedDirs` para los preajustes del manifiesto desde la raíz del complemento y, para los preajustes `${node}`, el directorio del ejecutable Node actual. Los `trustedDirs` creados en el manifiesto se ignoran. Otras opciones de proveedor exec como `timeoutMs`, `maxOutputBytes`, `jsonOnly`, `env`, `passEnv` y `allowInsecurePath` se transmiten a la configuración normal del proveedor exec de SecretRef.

## referencia de modelPricing

Use `modelPricing` cuando un proveedor necesita un comportamiento de precios del plano de control antes de que se cargue el tiempo de ejecución. La caché de precios de Gateway lee estos metadatos sin importar el código de tiempo de ejecución del proveedor.

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

| Campo        | Tipo              | Lo que significa                                                                                                    |
| ------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| `external`   | `boolean`         | Establezca `false` para proveedores locales/autohospedados que nunca deben obtener precios de OpenRouter o LiteLLM. |
| `openRouter` | `false \| object` | Asignación de búsqueda de precios de OpenRouter. `false` desactiva la búsqueda de OpenRouter para este proveedor.   |
| `liteLLM`    | `false \| object` | Asignación de búsqueda de precios de LiteLLM. `false` desactiva la búsqueda de LiteLLM para este proveedor.         |

Campos de origen:

| Campo                      | Tipo               | Qué significa                                                                                                                             |
| -------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `provider`                 | `string`           | ID de proveedor de catálogo externo cuando difiere del ID de proveedor de OpenClaw, por ejemplo `z-ai` para un proveedor `zai`.           |
| `passthroughProviderModel` | `boolean`          | Tratar los IDs de modelo que contienen barras como referencias anidadas de proveedor/modelo, útil para proveedores proxy como OpenRouter. |
| `modelIdTransforms`        | `"version-dots"[]` | Variantes adicionales de ID de modelo de catálogo externo. `version-dots` intenta IDs de versión con puntos como `claude-opus-4.6`.       |

### Índice de proveedores de OpenClaw

El Índice de proveedores de OpenClaw son metadatos de vista previa propiedad de OpenClaw para proveedores
cuyos complementos aún pueden no estar instalados. No es parte de un manifiesto de complemento.
Los manifiestos de complementos siguen siendo la autoridad del complemento instalado. El Índice de proveedores es
el contrato de reserva interno que consumirán las superficies futuras de selector de modelos y proveedores instalables y preinstalados
cuando un complemento de proveedor no esté instalado.

Orden de autoridad del catálogo:

1. Configuración de usuario.
2. Manifiesto de complemento instalado `modelCatalog`.
3. Caché del catálogo de modelos de actualización explícita.
4. Filas de vista previa del Índice de proveedores de OpenClaw.

El Índice de Proveedores no debe contener secretos, estado habilitado, enlaces de tiempo de ejecución o
datos de modelos en vivo específicos de la cuenta. Sus catálogos de vista previa utilizan la misma
forma de fila de proveedor `modelCatalog` que los manifiestos de complementos, pero deben limitarse
a metadatos de visualización estables a menos que los campos del adaptador de tiempo de ejecución, como `api`,
`baseUrl`, precios o indicadores de compatibilidad, se mantengan intencionalmente alineados con
el manifiesto del complemento instalado. Los proveedores con descubrimiento `/models` en vivo deben
escribir filas actualizadas a través de la ruta de caché explícita del catálogo de modelos en lugar de
realizar llamadas normales de listado o incorporación a las API del proveedor.

Las entradas del Índice de Proveedores también pueden llevar metadatos de complemento instalable para proveedores
cuyo complemento ha salido del núcleo o aún no está instalado. Estos
metadatos reflejan el patrón del catálogo de canales: el nombre del paquete, la especificación de instalación de npm,
la integridad esperada y las etiquetas de elección de autenticación baratas son suficientes para mostrar una
opción de configuración instalable. Una vez que se instala el complemento, su manifiesto prevalece y
se ignora la entrada del Índice de Proveedores para ese proveedor.

Las claves de capacidades de nivel superior heredadas están en desuso. Use `openclaw doctor --fix` para
mover `speechProviders`, `realtimeTranscriptionProviders`,
`realtimeVoiceProviders`, `mediaUnderstandingProviders`,
`imageGenerationProviders`, `videoGenerationProviders`,
`webFetchProviders` y `webSearchProviders` debajo de `contracts`; la carga
normal de manifiestos ya no trata esos campos de nivel superior como propiedad
de la capacidad.

## Manifiesto versus package.

Los dos archivos sirven para diferentes trabajos:

| Archivo                | Úselo para                                                                                                                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw.plugin.json` | Descubrimiento, validación de configuración, metadatos de elección de autenticación e indicadores de interfaz de usuario que deben existir antes de que se ejecute el código del complemento |
| `package.json`         | metadatos de npm, instalación de dependencias y el bloque `openclaw` utilizado para puntos de entrada, restricciones de instalación, configuración o metadatos del catálogo                  |

Si no está seguro de dónde pertenece un metadato, use esta regla:

- si OpenClaw debe saberlo antes de cargar el código del complemento, póngalo en `openclaw.plugin.json`
- si se trata del empaquetado, archivos de entrada o el comportamiento de npm install, colóquelo en `package.json`

### campos de package. que afectan el descubrimiento

Algunos metadatos de complementos previos a la ejecución residen intencionalmente en `package.json` bajo el
bloque `openclaw` en lugar de en `openclaw.plugin.json`.
`openclaw.bundle` y `openclaw.bundle.json` no son contratos de complementos de OpenClaw;
los complementos nativos deben usar `openclaw.plugin.json` más los campos `package.json#openclaw` compatibles a continuación.

Ejemplos importantes:

| Campo                                                                                      | Lo que significa                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw.extensions`                                                                      | Declara los puntos de entrada de complementos nativos. Debe permanecer dentro del directorio del paquete del complemento.                                                                                                                               |
| `openclaw.runtimeExtensions`                                                               | Declara los puntos de entrada de tiempo de ejecución de JavaScript construidos para paquetes instalados. Debe permanecer dentro del directorio del paquete del complemento.                                                                             |
| `openclaw.setupEntry`                                                                      | Punto de entrada solo para configuración ligera que se usa durante la incorporación, el inicio diferido del canal y el descubrimiento de estado/SecretRef de solo lectura del canal. Debe permanecer dentro del directorio del paquete del complemento. |
| `openclaw.runtimeSetupEntry`                                                               | Declara el punto de entrada de configuración de JavaScript construido para paquetes instalados. Requiere `setupEntry`, debe existir y debe permanecer dentro del directorio del paquete del complemento.                                                |
| `openclaw.channel`                                                                         | Metadatos de catálogo de canal económicos, como etiquetas, rutas de documentos, alias y texto de selección.                                                                                                                                             |
| `openclaw.channel.commands`                                                                | Metadatos predeterminados automáticos de comandos nativos y habilidades nativas estáticas que utilizan las superficies de configuración, auditoría y lista de comandos antes de que se cargue el tiempo de ejecución del canal.                         |
| `openclaw.channel.configuredState`                                                         | Metadatos del verificador de estado configurado ligero que pueden responder "¿ya existe la configuración solo de entorno?" sin cargar el tiempo de ejecución completo del canal.                                                                        |
| `openclaw.channel.persistedAuthState`                                                      | Metadatos del verificador de autenticación persistente ligera que pueden responder "¿ya hay algo iniciado sesión?" sin cargar el tiempo de ejecución completo del canal.                                                                                |
| `openclaw.install.clawhubSpec` / `openclaw.install.npmSpec` / `openclaw.install.localPath` | Sugerencias de instalación/actualización para complementos empaquetados y publicados externamente.                                                                                                                                                      |
| `openclaw.install.defaultChoice`                                                           | Ruta de instalación preferida cuando hay varias fuentes de instalación disponibles.                                                                                                                                                                     |
| `openclaw.install.minHostVersion`                                                          | Versión mínima compatible del host OpenClaw, utilizando un límite inferior de semver como `>=2026.3.22` o `>=2026.5.1-beta.1`.                                                                                                                          |
| `openclaw.compat.pluginApi`                                                                | Rango mínimo de la API de complementos de OpenClaw requerido por este paquete, utilizando un límite inferior de semver como `>=2026.5.27`.                                                                                                              |
| `openclaw.install.expectedIntegrity`                                                       | Cadena de integridad de distribución npm esperada, como `sha512-...`; los flujos de instalación y actualización verifican el artefacto obtenido contra ella.                                                                                            |
| `openclaw.install.allowInvalidConfigRecovery`                                              | Permite una ruta de recuperación de reinstalación estrecha para complementos empaquetados cuando la configuración no es válida.                                                                                                                         |
| `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`                          | Permite que las superficies del canal de configuración en tiempo de ejecución se carguen antes de escuchar, y luego difiere el complemento de canal completamente configurado hasta la activación posterior a la escucha.                               |

Los metadatos del manifiesto deciden qué opciones de proveedor/canal/configuración aparecen en la incorporación antes de que se cargue el tiempo de ejecución. `package.json#openclaw.install` indica a la incorporación cómo obtener o habilitar ese complemento cuando el usuario elige una de esas opciones. No mueva las sugerencias de instalación a `openclaw.plugin.json`.

`openclaw.install.minHostVersion` se aplica durante la instalación y la carga del registro de manifiestos para fuentes de complementos no empaquetados. Los valores no válidos se rechazan; los valores más nuevos pero válidos omiten complementos externos en hosts más antiguos. Se asume que los complementos de fuente empaquetada tienen la misma versión que la revisión del host.

`openclaw.compat.pluginApi` se aplica durante la instalación del paquete para fuentes de complementos no empaquetados. Úselo para el límite inferior de la API de tiempo de ejecución/SDK del complemento OpenClaw contra la cual se construyó el paquete. Puede ser más estricto que `minHostVersion` cuando un paquete de complemento necesita una API más nueva pero aún mantiene una sugerencia de instalación más baja para otros flujos. La sincronización de lanzamiento oficial de OpenClaw actualiza los límites inferiores de la API de complementos oficiales existentes a la versión de lanzamiento de OpenClaw de manera predeterminada, pero los lanzamientos solo de complementos pueden mantener un límite inferior cuando el paquete admite intencionalmente hosts más antiguos. No use la versión del paquete por sí sola como contrato de compatibilidad. `peerDependencies.openclaw` sigue siendo metadatos del paquete npm; OpenClaw usa el contrato `openclaw.compat.pluginApi` para decisiones de compatibilidad de instalación.

Los metadatos oficiales de instalación bajo demanda deben usar `clawhubSpec` cuando el complemento se publique en ClawHub; el incorporado lo trata como la fuente remota preferida y registra los hechos del artefacto ClawHub después de la instalación. `npmSpec` sigue siendo la alternativa de compatibilidad para paquetes que aún no se han migrado a ClawHub.

El bloqueo de versión exacto de npm ya reside en `npmSpec`, por ejemplo `"npmSpec": "@wecom/wecom-openclaw-plugin@1.2.3"`. Las entradas oficiales de catálogos externos deben emparejar especificaciones exactas con `expectedIntegrity` para que los flujos de actualización fallen por completo si el artefacto npm obtenido ya no coincide con la versión bloqueada. El incorporado interactivo todavía ofrece especificaciones npm de registro confiables, incluidos nombres de paquetes simples y dist-tags, para compatibilidad. Los diagnósticos del catálogo pueden distinguir fuentes exactas, flotantes, bloqueadas por integridad, con integridad faltante, con discrepancia de nombre de paquete y de elección predeterminada no válida. También advierten cuando `expectedIntegrity` está presente pero no hay una fuente npm válida a la que pueda bloquear. Cuando `expectedIntegrity` está presente, los flujos de instalación/actualización lo hacen cumplir; cuando se omite, la resolución del registro se registra sin un bloqueo de integridad.

Los complementos de canal deben proporcionar `openclaw.setupEntry` cuando el estado, la lista de canales o los escaneos de SecretRef necesiten identificar cuentas configuradas sin cargar el tiempo de ejecución completo. La entrada de configuración debe exponer metadatos del canal más adaptadores de configuración, estado y secretos seguros para la configuración; mantenga los clientes de red, los escuchas de puerta de enlace y los tiempos de ejecución de transporte en el punto de entrada principal de la extensión.

Los campos del punto de entrada de tiempo de ejecución no anulan las comprobaciones de límites del paquete para los campos del punto de entrada de origen. Por ejemplo, `openclaw.runtimeExtensions` no puede que una ruta `openclaw.extensions` de escape sea cargable.

`openclaw.install.allowInvalidConfigRecovery` es intencionalmente estrecho. No hace que las configuraciones rotas arbitrarias sean instalables. Hoy solo permite que los flujos de instalación se recuperen de fallos específicos de actualización de complementos agrupados obsoletos, como una ruta de complemento agrupado faltante o una entrada `channels.<id>` obsoleta para ese mismo complemento agrupado. Los errores de configuración no relacionados todavía bloquean la instalación y envían a los operadores a `openclaw doctor --fix`.

`openclaw.channel.persistedAuthState` son metadatos del paquete para un módulo de verificación diminuto:

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

Úselo cuando los flujos de configuración, doctor, estado o presencia de solo lectura necesiten una sonda de autenticación sí/no económica antes de que cargue el complemento de canal completo. El estado de autenticación persistente no es el estado del canal configurado: no use estos metadatos para habilitar automáticamente los complementos, reparar dependencias en tiempo de ejecución o decidir si debe cargarse un tiempo de ejecución de canal. La exportación de destino debe ser una función pequeña que solo lea el estado persistente; no la enrute a través del barril completo del tiempo de ejecución del canal.

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

Úselo cuando un canal pueda responder el estado configurado desde el entorno u otras pequeñas entradas que no sean de tiempo de ejecución. Si la verificación necesita una resolución completa de configuración o el tiempo de ejecución real del canal, mantenga esa lógica en el enlace `config.hasConfiguredState` del complemento en su lugar.

## Precedencia de descubrimiento (ids de complemento duplicados)

OpenClaw descubre complementos desde varias raíces. Para ver el orden de escaneo del sistema de archivos sin procesar, consulte [Orden de escaneo de complementos](/es/gateway/configuration-reference#plugin-scan-order). Si dos descubrimientos comparten el mismo `id`, solo se mantiene el manifiesto de **mayor precedencia**; los duplicados de menor precedencia se descartan en lugar de cargarse junto a él.

Precedencia, de mayor a menor:

1. **Seleccionado por configuración** — una ruta fijada explícitamente en `plugins.entries.<id>`
2. **Empaquetado** — complementos enviados con OpenClaw
3. **Instalación global** — complementos instalados en la raíz global de complementos de OpenClaw
4. **Espacio de trabajo** — complementos descubiertos en relación con el espacio de trabajo actual

Implicaciones:

- Una copia bifurcada o obsoleta de un complemento empaquetado que se encuentre en el espacio de trabajo no ensombrecerá la compilación empaquetada.
- Para anular realmente un complemento empaquetado con uno local, fíjelo a través de `plugins.entries.<id>` para que gane por precedencia en lugar de confiar en el descubrimiento del espacio de trabajo.
- Las eliminaciones de duplicados se registran para que Doctor y los diagnósticos de inicio puedan señalar la copia descartada.
- Las anulaciones de duplicados seleccionadas por configuración se redactan como anulaciones explícitas en los diagnósticos, pero aún advierten para que las bifurcaciones obsoletas y las sombras accidentales sigan siendo visibles.

## Requisitos de esquema JSON

- **Cada complemento debe incluir un esquema JSON**, incluso si no acepta ninguna configuración.
- Un esquema vacío es aceptable (por ejemplo, `{ "type": "object", "additionalProperties": false }`).
- Los esquemas se validan en el momento de lectura/escritura de la configuración, no en tiempo de ejecución.
- Al extender o hacer un fork de un plugin empaquetado con nuevas claves de configuración, actualice el `openclaw.plugin.json` de ese plugin `configSchema` al mismo tiempo. Los esquemas de los plugins empaquetados son estrictos, por lo que agregar `plugins.entries.<id>.config.myNewKey` en la configuración de usuario sin agregar `myNewKey` al `configSchema.properties` se rechazará antes de que se cargue el tiempo de ejecución del plugin.

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
  un manifiesto de plugin.
- `plugins.entries.<id>`, `plugins.allow`, `plugins.deny` y `plugins.slots.*`
  deben hacer referencia a ids de plugins **detectables**. Los ids desconocidos son **errores**.
- Si un plugin está instalado pero tiene un manifiesto o esquema roto o faltante,
  la validación falla y Doctor informa el error del plugin.
- Si existe la configuración de un plugin pero el plugin está **deshabilitado**, la configuración se mantiene y
  se muestra una **advertencia** en Doctor + registros.

Consulte [Referencia de configuración](/es/gateway/configuration) para ver el esquema completo de `plugins.*`.

## Notas

- El manifiesto es **obligatorio para los plugins nativos de OpenClaw**, incluidas las cargas del sistema de archivos local. El tiempo de ejecución todavía carga el módulo del plugin por separado; el manifiesto es solo para descubrimiento + validación.
- Los manifiestos nativos se analizan con JSON5, por lo que se aceptan comentarios, comas finales y claves sin comillas siempre que el valor final siga siendo un objeto.
- El cargador de manifiestos solo lee los campos de manifiesto documentados. Evite claves personalizadas de nivel superior.
- `channels`, `providers`, `cliBackends` y `skills` pueden omitirse todos cuando un plugin no los necesita.
- `providerCatalogEntry` debe mantenerse ligero y no debe importar código de tiempo de ejecución amplio; úselo para metadatos estáticos del catálogo de proveedores o descriptores de descubrimiento estrechos, no para ejecución en el momento de la solicitud.
- Los tipos de complementos exclusivos se seleccionan a través de `plugins.slots.*`: `kind: "memory"` a través de `plugins.slots.memory`, `kind: "context-engine"` a través de `plugins.slots.contextEngine` (por defecto `legacy`).
- Declare el tipo de complemento exclusivo en este manifiesto. La entrada en tiempo de ejecución `OpenClawPluginDefinition.kind` está obsoleta y solo se mantiene como retroceso de compatibilidad para complementos antiguos.
- Los metadatos de variables de entorno (`setup.providers[].envVars`, `providerAuthEnvVars` obsoleto, y `channelEnvVars`) son solo declarativos. El estado, la auditoría, la validación de entrega cron y otras superficies de solo lectura todavía aplican la confianza del complemento y la política de activación efectiva antes de tratar una variable de entorno como configurada.
- Para obtener metadatos del asistente en tiempo de ejecución que requieren código de proveedor, consulte [Ganchos de tiempo de ejecución del proveedor](/es/plugins/architecture-internals#provider-runtime-hooks).
- Si su complemento depende de módulos nativos, documente los pasos de compilación y cualquier requisito de lista blanca del administrador de paquetes (por ejemplo, pnpm `allow-build-scripts` + `pnpm rebuild <package>`).

## Relacionado

<CardGroup cols={3}>
  <Card title="Construcción de complementos" href="/es/plugins/building-plugins" icon="rocket">
    Primeros pasos con los complementos.
  </Card>
  <Card title="Arquitectura de complementos" href="/es/plugins/architecture" icon="diagram-project">
    Arquitectura interna y modelo de capacidades.
  </Card>
  <Card title="Resumen del SDK" href="/es/plugins/sdk-overview" icon="book">
    Referencia del SDK de complementos e importaciones de subrutas.
  </Card>
</CardGroup>
