---
summary: "Manifiesto de complemento + requisitos de esquema JSON (validación de configuración estricta)"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "Manifiesto de complemento"
---

# Manifiesto de complemento (openclaw.plugin.)

Esta página es solo para el **manifiesto de complemento nativo de OpenClaw**.

Para diseños de paquetes compatibles, consulte [Paquetes de complementos](/es/plugins/bundles).

Los formatos de paquete compatibles utilizan diferentes archivos de manifiesto:

- Paquete Codex: `.codex-plugin/plugin.json`
- Paquete Claude: `.claude-plugin/plugin.json` o el diseño de componente Claude predeterminado
  sin manifiesto
- Paquete Cursor: `.cursor-plugin/plugin.json`

OpenClaw también detecta automáticamente esos diseños de paquetes, pero no se validan
contra el esquema `openclaw.plugin.json` descrito aquí.

Para paquetes compatibles, OpenClaw actualmente lee los metadatos del paquete más las
raíces de habilidades declaradas, raíces de comandos de Claude, valores predeterminados
`settings.json` del paquete Claude, valores predeterminados LSP del paquete Claude y paquetes de hooks compatibles cuando el diseño coincide
con las expectativas de ejecución de OpenClaw.

Cada complemento nativo de OpenClaw **debe** incluir un archivo `openclaw.plugin.json` en la
**raíz del complemento**. OpenClaw utiliza este manifiesto para validar la configuración
**sin ejecutar el código del complemento**. Los manifiestos faltantes o no válidos se tratan como
errores del complemento y bloquean la validación de la configuración.

Vea la guía completa del sistema de complementos: [Complementos](/es/tools/plugin).
Para el modelo de capacidades nativas y la guía actual de compatibilidad externa:
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
- metadatos de ejecutor de QA económicos que el host compartido `openclaw qa` puede inspeccionar
  antes de que se cargue el tiempo de ejecución del complemento
- metadatos de configuración específicos del canal que deben fusionarse en el catálogo y las superficies de validación
  sin cargar el tiempo de ejecución
- sugerencias de la interfaz de usuario de configuración

No lo use para:

- registrar el comportamiento del tiempo de ejecución
- declarar puntos de entrada del código
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
  "providerEndpoints": [
    {
      "endpointClass": "xai-native",
      "hosts": ["api.x.ai"]
    }
  ],
  "cliBackends": ["openrouter-cli"],
  "syntheticAuthRefs": ["openrouter-cli"],
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

| Campo                                | Obligatorio | Tipo                             | Lo que significa                                                                                                                                                                                                                                                                                  |
| ------------------------------------ | ----------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                 | Sí          | `string`                         | ID canónico del complemento. Este es el ID utilizado en `plugins.entries.<id>`.                                                                                                                                                                                                                   |
| `configSchema`                       | Sí          | `object`                         | Esquema JSON en línea para la configuración de este complemento.                                                                                                                                                                                                                                  |
| `enabledByDefault`                   | No          | `true`                           | Marca un complemento empaquetado como habilitado de forma predeterminada. Omítalo o establezca cualquier valor que no sea `true` para dejar el complemento deshabilitado de forma predeterminada.                                                                                                 |
| `legacyPluginIds`                    | No          | `string[]`                       | Id. heredados que se normalizan a este id. canónico del complemento.                                                                                                                                                                                                                              |
| `autoEnableWhenConfiguredProviders`  | No          | `string[]`                       | Id. de proveedores que deben habilitar automáticamente este complemento cuando la autenticación, la configuración o las referencias de modelo los mencionen.                                                                                                                                      |
| `kind`                               | No          | `"memory"` \| `"context-engine"` | Declara un tipo de complemento exclusivo utilizado por `plugins.slots.*`.                                                                                                                                                                                                                         |
| `channels`                           | No          | `string[]`                       | Id. de canales propiedad de este complemento. Se utiliza para el descubrimiento y la validación de la configuración.                                                                                                                                                                              |
| `providers`                          | No          | `string[]`                       | Id. de proveedores propiedad de este complemento.                                                                                                                                                                                                                                                 |
| `modelSupport`                       | No          | `object`                         | Metadatos abreviados de familia de modelos propiedad del manifiesto que se utilizan para cargar automáticamente el complemento antes del tiempo de ejecución.                                                                                                                                     |
| `providerEndpoints`                  | No          | `object[]`                       | Metadatos de host/baseUrl del punto de conexión propiedad del manifiesto para las rutas del proveedor que el núcleo debe clasificar antes de que se cargue el tiempo de ejecución del proveedor.                                                                                                  |
| `cliBackends`                        | No          | `string[]`                       | Ids de backend de inferencia de CLI propiedad de este plugin. Se utilizan para la autoactivación al inicio desde referencias de configuración explícitas.                                                                                                                                         |
| `syntheticAuthRefs`                  | No          | `string[]`                       | Referencias de backend de proveedor o CLI cuyo gancho de autenticación sintética propiedad del plugin debe sondearse durante el descubrimiento de modelos en frío antes de que se cargue el tiempo de ejecución.                                                                                  |
| `nonSecretAuthMarkers`               | No          | `string[]`                       | Valores de clave de API de marcador de posición propiedad del plugin empaquetado que representan un estado de credenciales no secreto local, OAuth o ambiental.                                                                                                                                   |
| `commandAliases`                     | No          | `object[]`                       | Nombres de comandos propiedad de este plugin que deben generar configuración con conocimiento del plugin y diagnósticos de CLI antes de que se cargue el tiempo de ejecución.                                                                                                                     |
| `providerAuthEnvVars`                | No          | `Record<string, string[]>`       | Metadatos de entorno de autenticación de proveedor baratos que OpenClaw puede inspeccionar sin cargar el código del plugin.                                                                                                                                                                       |
| `providerAuthAliases`                | No          | `Record<string, string>`         | Ids de proveedores que deben reutilizar otro id de proveedor para la búsqueda de autenticación, por ejemplo, un proveedor de codificación que comparte la clave de API del proveedor base y los perfiles de autenticación.                                                                        |
| `channelEnvVars`                     | No          | `Record<string, string[]>`       | Metadatos de entorno de canal baratos que OpenClaw puede inspeccionar sin cargar el código del plugin. Úselo para la configuración de canal controlada por entorno o superficies de autenticación que los asistentes genéricos de inicio/configuración deberían ver.                              |
| `providerAuthChoices`                | No          | `object[]`                       | Metadatos de elección de autenticación baratos para selectores de incorporación, resolución de proveedor preferido y cableado simple de banderas de CLI.                                                                                                                                          |
| `activation`                         | No          | `object`                         | Pistas de activación económicas para la carga activada por proveedor, comando, canal, ruta y capacidad. Solo metadatos; el tiempo de ejecución del complemento todavía posee el comportamiento real.                                                                                              |
| `setup`                              | No          | `object`                         | Descriptores de configuración/incorporación económicos que las superficies de descubrimiento y configuración pueden inspeccionar sin cargar el tiempo de ejecución del complemento.                                                                                                               |
| `qaRunners`                          | No          | `object[]`                       | Descriptores de ejecutor de QA baratos utilizados por el host `openclaw qa` compartido antes de que se cargue el tiempo de ejecución del complemento.                                                                                                                                             |
| `contracts`                          | No          | `object`                         | Instantánea estática de capacidades empaquetadas para enlaces de autenticación externa, voz, transcripción en tiempo real, voz en tiempo real, comprensión de medios, generación de imágenes, generación de música, generación de video, obtención web, búsqueda web y propiedad de herramientas. |
| `mediaUnderstandingProviderMetadata` | No          | `Record<string, object>`         | Valores predeterminados de comprensión de medios baratos para los IDs de proveedor declarados en `contracts.mediaUnderstandingProviders`.                                                                                                                                                         |
| `channelConfigs`                     | No          | `Record<string, object>`         | Metadatos de configuración de canal propiedad del manifiesto combinados en las superficies de descubrimiento y validación antes de que se cargue el tiempo de ejecución.                                                                                                                          |
| `skills`                             | No          | `string[]`                       | Directorios de habilidades para cargar, relativos a la raíz del complemento.                                                                                                                                                                                                                      |
| `name`                               | No          | `string`                         | Nombre del complemento legible para humanos.                                                                                                                                                                                                                                                      |
| `description`                        | No          | `string`                         | Resumen breve que se muestra en las superficies del complemento.                                                                                                                                                                                                                                  |
| `version`                            | No          | `string`                         | Versión informativa del complemento.                                                                                                                                                                                                                                                              |
| `uiHints`                            | No          | `Record<string, object>`         | Etiquetas de la interfaz de usuario, marcadores de posición e indicaciones de sensibilidad para los campos de configuración.                                                                                                                                                                      |

## Referencia de providerAuthChoices

Cada entrada de `providerAuthChoices` describe una opción de incorporación o autenticación.
OpenClaw lee esto antes de que se cargue el tiempo de ejecución del proveedor.

| Campo                 | Obligatorio | Tipo                                            | Significado                                                                                                                      |
| --------------------- | ----------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `provider`            | Sí          | `string`                                        | ID del proveedor al que pertenece esta opción.                                                                                   |
| `method`              | Sí          | `string`                                        | ID del método de autenticación al que se debe enviar.                                                                            |
| `choiceId`            | Sí          | `string`                                        | ID estable de la opción de autenticación utilizado por los flujos de incorporación y CLI.                                        |
| `choiceLabel`         | No          | `string`                                        | Etiqueta orientada al usuario. Si se omite, OpenClaw recurre a `choiceId`.                                                       |
| `choiceHint`          | No          | `string`                                        | Texto de ayuda breve para el selector.                                                                                           |
| `assistantPriority`   | No          | `number`                                        | Los valores más bajos se ordenan antes en los selectores interactivos impulsados por el asistente.                               |
| `assistantVisibility` | No          | `"visible"` \| `"manual-only"`                  | Ocultar la opción de los selectores del asistente, al tiempo que se permite la selección manual de CLI.                          |
| `deprecatedChoiceIds` | No          | `string[]`                                      | IDs de opciones heredadas que deben redirigir a los usuarios a esta opción de reemplazo.                                         |
| `groupId`             | No          | `string`                                        | ID de grupo opcional para agrupar opciones relacionadas.                                                                         |
| `groupLabel`          | No          | `string`                                        | Etiqueta orientada al usuario para ese grupo.                                                                                    |
| `groupHint`           | No          | `string`                                        | Texto de ayuda breve para el grupo.                                                                                              |
| `optionKey`           | No          | `string`                                        | Clave de opción interna para flujos de autenticación simples de una sola marca.                                                  |
| `cliFlag`             | No          | `string`                                        | Nombre de la marca de CLI, como `--openrouter-api-key`.                                                                          |
| `cliOption`           | No          | `string`                                        | Forma completa de la opción de CLI, como `--openrouter-api-key <key>`.                                                           |
| `cliDescription`      | No          | `string`                                        | Descripción utilizada en la ayuda de la CLI.                                                                                     |
| `onboardingScopes`    | No          | `Array<"text-inference" \| "image-generation">` | Superficies de incorporación en las que debe aparecer esta opción. Si se omite, el valor predeterminado es `["text-inference"]`. |

## referencia de commandAliases

Use `commandAliases` cuando un complemento posee un nombre de comando de tiempo de ejecución que los usuarios pueden poner erróneamente en `plugins.allow` o intentar ejecutar como un comando raíz de la CLI. OpenClaw utiliza estos metadatos para diagnósticos sin importar el código de tiempo de ejecución del complemento.

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

| Campo        | Obligatorio | Tipo              | Lo que significa                                                                             |
| ------------ | ----------- | ----------------- | -------------------------------------------------------------------------------------------- |
| `name`       | Sí          | `string`          | Nombre del comando que pertenece a este complemento.                                         |
| `kind`       | No          | `"runtime-slash"` | Marca el alias como un comando de barra diagonal de chat en lugar de un comando raíz de CLI. |
| `cliCommand` | No          | `string`          | Comando raíz de CLI relacionado para sugerir para operaciones de CLI, si existe uno.         |

## referencia de activation

Use `activation` cuando el complemento puede declarar de manera económica qué eventos del plano de control deben activarlo más adelante.

## referencia de qaRunners

Use `qaRunners` cuando un complemento contribuye con uno o más ejecutores de transporte bajo la raíz compartida `openclaw qa`. Mantenga estos metadatos económicos y estáticos; el tiempo de ejecución del complemento sigue siendo propietario del registro real de la CLI a través de una superficie ligera `runtime-api.ts` que exporta `qaRunnerCliRegistrations`.

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
| `description` | No          | `string` | Texto de ayuda de reserva que se usa cuando el host compartido necesita un comando stub. |

Este bloque es solo metadatos. No registra el comportamiento en tiempo de ejecución y no
reemplaza `register(...)`, `setupEntry` u otros puntos de entrada de complementos en tiempo de ejecución.
Los consumidores actuales lo usan como una sugerencia de filtrado antes de una carga más amplia de complementos, por lo que
la falta de metadatos de activación generalmente solo afecta el rendimiento; no debería
cambiar la corrección mientras existan los mecanismos de respaldo de propiedad del manifiesto heredado.

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

| Campo            | Obligatorio | Tipo                                                 | Qué significa                                                                                          |
| ---------------- | ----------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `onProviders`    | No          | `string[]`                                           | Ids de proveedores que deben activar este complemento cuando se soliciten.                             |
| `onCommands`     | No          | `string[]`                                           | Ids de comandos que deben activar este complemento.                                                    |
| `onChannels`     | No          | `string[]`                                           | Ids de canales que deben activar este complemento.                                                     |
| `onRoutes`       | No          | `string[]`                                           | Tipos de rutas que deben activar este complemento.                                                     |
| `onCapabilities` | No          | `Array<"provider" \| "channel" \| "tool" \| "hook">` | Sugerencias de capacidades amplias utilizadas por la planificación de activación del plano de control. |

Consumidores en vivo actuales:

- la planificación de la CLI activada por comandos recurre al sistema heredado
  `commandAliases[].cliCommand` o `commandAliases[].name`
- la planificación de configuración/canal activada por canales recurre a la propiedad heredada `channels[]`
  cuando faltan metadatos explícitos de activación del canal
- la planificación de configuración/tiempo de ejecución activada por proveedores recurre a la propiedad heredada
  `providers[]` y de nivel superior `cliBackends[]` cuando faltan metadatos
  explícitos de activación del proveedor

## referencia de configuración

Use `setup` cuando las superficies de configuración e incorporación necesiten metadatos económicos propiedad del complemento
antes de la carga en tiempo de ejecución.

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
de inferencia de la CLI. `setup.cliBackends` es la superficie del descriptor específica para la configuración
para los flujos de plano de control/configuración que deben mantenerse solo como metadatos.

Cuando están presentes, `setup.providers` y `setup.cliBackends` son la superficie de búsqueda prioritaria basada en descriptores para el descubrimiento de la configuración. Si el descriptor solo limita el complemento candidato y la configuración aún necesita enlaces de tiempo de ejecución más ricos, establezca `requiresRuntime: true` y mantenga `setup-api` en su lugar como la ruta de ejecución de respaldo.

Debido a que la búsqueda de configuración puede ejecutar código `setup-api` propiedad del complemento, los valores normalizados `setup.providers[].id` y `setup.cliBackends[]` deben mantenerse únicos en los complementos descubiertos. La propiedad ambigua falla de forma segura en lugar de elegir un ganador según el orden de descubrimiento.

### referencia de setup.providers

| Campo         | Obligatorio | Tipo       | Lo que significa                                                                                                                                           |
| ------------- | ----------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`          | Sí          | `string`   | Id. del proveedor expuesto durante la configuración o el incorporamiento. Mantenga los ids normalizados globalmente únicos.                                |
| `authMethods` | No          | `string[]` | Ids de métodos de configuración/autenticación que este proveedor admite sin cargar el tiempo de ejecución completo.                                        |
| `envVars`     | No          | `string[]` | Variables de entorno que las superficies genéricas de configuración/estado pueden verificar antes de que se cargue el tiempo de ejecución del complemento. |

### campos de configuración (setup)

| Campo              | Obligatorio | Tipo       | Lo que significa                                                                                                                                                 |
| ------------------ | ----------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `providers`        | No          | `object[]` | Descriptores de configuración del proveedor expuestos durante la configuración y el incorporamiento.                                                             |
| `cliBackends`      | No          | `string[]` | Ids de backend en tiempo de configuración utilizados para la búsqueda de configuración basada en descriptores. Mantenga los ids normalizados globalmente únicos. |
| `configMigrations` | No          | `string[]` | Ids de migración de configuración propiedad de la superficie de configuración de este complemento.                                                               |
| `requiresRuntime`  | No          | `boolean`  | Si la configuración aún necesita ejecución `setup-api` después de la búsqueda del descriptor.                                                                    |

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
| `label`       | `string`   | Etiqueta de campo orientada al usuario.                    |
| `help`        | `string`   | Texto de ayuda breve.                                      |
| `tags`        | `string[]` | Etiquetas de IU opcionales.                                |
| `advanced`    | `boolean`  | Marca el campo como avanzado.                              |
| `sensitive`   | `boolean`  | Marca el campo como secreto o sensible.                    |
| `placeholder` | `string`   | Texto de marcador de posición para entradas de formulario. |

## referencia de contratos

Use `contracts` solo para metadatos estáticos de propiedad de capacidades que OpenClaw puede
leer sin importar el tiempo de ejecución del complemento.

```json
{
  "contracts": {
    "embeddedExtensionFactories": ["pi"],
    "externalAuthProviders": ["acme-ai"],
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

| Campo                            | Tipo       | Lo que significa                                                                                            |
| -------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------- |
| `embeddedExtensionFactories`     | `string[]` | IDs de tiempo de ejecución integrados para los que un complemento empaquetado puede registrar fábricas.     |
| `externalAuthProviders`          | `string[]` | IDs de proveedores cuyo gancho de perfil de autenticación externa posee este complemento.                   |
| `speechProviders`                | `string[]` | IDs de proveedores de voz que posee este complemento.                                                       |
| `realtimeTranscriptionProviders` | `string[]` | IDs de proveedores de transcripción en tiempo real que posee este complemento.                              |
| `realtimeVoiceProviders`         | `string[]` | IDs de proveedores de voz en tiempo real que posee este complemento.                                        |
| `mediaUnderstandingProviders`    | `string[]` | IDs de proveedores de comprensión de medios que posee este complemento.                                     |
| `imageGenerationProviders`       | `string[]` | IDs de proveedores de generación de imágenes que posee este complemento.                                    |
| `videoGenerationProviders`       | `string[]` | IDs de proveedores de generación de video que posee este complemento.                                       |
| `webFetchProviders`              | `string[]` | IDs de proveedores de recuperación web que posee este complemento.                                          |
| `webSearchProviders`             | `string[]` | IDs de proveedores de búsqueda web que posee este complemento.                                              |
| `tools`                          | `string[]` | Nombres de herramientas de agente que posee este complemento para verificaciones de contratos empaquetados. |

Los complementos de proveedor que implementan `resolveExternalAuthProfiles` deben declarar
`contracts.externalAuthProviders`. Los complementos sin la declaración todavía se ejecutan
a través de una reserva de compatibilidad obsoleta, pero esa reserva es más lenta y
se eliminará después del período de migración.

## Referencia de mediaUnderstandingProviderMetadata

Use `mediaUnderstandingProviderMetadata` cuando un proveedor de comprensión de medios tenga modelos predeterminados, prioridad de reserva de autenticación automática o soporte nativo de documentos que los ayudantes principales genéricos necesitan antes de la carga del tiempo de ejecución. Las claves también deben declararse en `contracts.mediaUnderstandingProviders`.

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

| Campo                  | Tipo                                | Qué significa                                                                                           |
| ---------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `capabilities`         | `("image" \| "audio" \| "video")[]` | Capacidades de medios expuestas por este proveedor.                                                     |
| `defaultModels`        | `Record<string, string>`            | Predeterminados de capacidad a modelo utilizados cuando la configuración no especifica un modelo.       |
| `autoPriority`         | `Record<string, number>`            | Los números más bajos se ordenan antes para la reserva automática del proveedor basada en credenciales. |
| `nativeDocumentInputs` | `"pdf"[]`                           | Entradas de documento nativas compatibles con el proveedor.                                             |

## Referencia de channelConfigs

Use `channelConfigs` cuando un complemento de canal necesite metadatos de configuración económicos antes de que se cargue el tiempo de ejecución.

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

| Campo         | Tipo                     | Qué significa                                                                                                                        |
| ------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `schema`      | `object`                 | Esquema JSON para `channels.<id>`. Obligatorio para cada entrada de configuración de canal declarada.                                |
| `uiHints`     | `Record<string, object>` | Etiquetas de IU/marcadores de posición/sugerencias sensibles opcionales para esa sección de configuración de canal.                  |
| `label`       | `string`                 | Etiqueta de canal fusionada en el selector y superficies de inspección cuando los metadatos del tiempo de ejecución no están listos. |
| `description` | `string`                 | Descripción breve del canal para superficies de inspección y catálogo.                                                               |
| `preferOver`  | `string[]`               | Identificadores de complementos heredados o de menor prioridad que este canal debería superar en las superficies de selección.       |

## Referencia de modelSupport

Use `modelSupport` cuando OpenClaw debe inferir su complemento de proveedor desde identificadores de modelo abreviados como `gpt-5.4` o `claude-sonnet-4.6` antes de que se cargue el tiempo de ejecución del complemento.

```json
{
  "modelSupport": {
    "modelPrefixes": ["gpt-", "o1", "o3", "o4"],
    "modelPatterns": ["^computer-use-preview"]
  }
}
```

OpenClaw aplica esta precedencia:

- las referencias explícitas de `provider/model` utilizan los metadatos del manifiesto del `providers` propietario
- `modelPatterns` tiene preferencia sobre `modelPrefixes`
- si coinciden un plugin no empaquetado y uno empaquetado, el plugin no empaquetado
  gana
- la ambigüedad restante se ignora hasta que el usuario o la configuración especifiquen un proveedor

Campos:

| Campo           | Tipo       | Qué significa                                                                                                              |
| --------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| `modelPrefixes` | `string[]` | Prefijos coincidentes con `startsWith` contra identificadores de modelo abreviados.                                        |
| `modelPatterns` | `string[]` | Fuentes de regex coincidentes contra identificadores de modelo abreviados después de la eliminación del sufijo del perfil. |

Las claves de capacidades de nivel superior heredadas están obsoletas. Use `openclaw doctor --fix` para
mover `speechProviders`, `realtimeTranscriptionProviders`,
`realtimeVoiceProviders`, `mediaUnderstandingProviders`,
`imageGenerationProviders`, `videoGenerationProviders`,
`webFetchProviders` y `webSearchProviders` debajo de `contracts`; la carga
normal del manifiesto ya no trata esos campos de nivel superior como propiedad
de la capacidad.

## Manifiesto frente a package.

Los dos archivos sirven para diferentes trabajos:

| Archivo                | Úselo para                                                                                                                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw.plugin.json` | Descubrimiento, validación de configuración, metadatos de elección de autenticación e indicaciones de interfaz de usuario que deben existir antes de que se ejecute el código del complemento |
| `package.json`         | metadatos de npm, instalación de dependencias y el bloque `openclaw` utilizado para puntos de entrada, restricciones de instalación, configuración o metadatos del catálogo                   |

Si no está seguro de dónde pertenece un metadato, use esta regla:

- si OpenClaw debe saberlo antes de cargar el código del complemento, colóquelo en `openclaw.plugin.json`
- si se trata del empaquetado, los archivos de entrada o el comportamiento de instalación de npm, colóquelo en `package.json`

### campos de package. que afectan el descubrimiento

Algunos metadatos de complementos previos a la ejecución se encuentran intencionalmente en `package.json` bajo el
bloque `openclaw` en lugar de `openclaw.plugin.json`.

Ejemplos importantes:

| Campo                                                             | Qué significa                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw.extensions`                                             | Declara los puntos de entrada de los complementos nativos. Debe permanecer dentro del directorio del paquete del complemento.                                                                                                                         |
| `openclaw.runtimeExtensions`                                      | Declara los puntos de entrada del tiempo de ejecución de JavaScript compilados para los paquetes instalados. Debe permanecer dentro del directorio del paquete del complemento.                                                                       |
| `openclaw.setupEntry`                                             | Punto de entrada ligero solo de configuración que se usa durante la incorporación, el inicio diferido del canal y el estado del canal de solo lectura/descubrimiento de SecretRef. Debe permanecer dentro del directorio del paquete del complemento. |
| `openclaw.runtimeSetupEntry`                                      | Declara el punto de entrada de configuración de JavaScript compilado para los paquetes instalados. Debe permanecer dentro del directorio del paquete del complemento.                                                                                 |
| `openclaw.channel`                                                | Metadatos ligeros del catálogo de canales, como etiquetas, rutas de documentos, alias y texto de selección.                                                                                                                                           |
| `openclaw.channel.configuredState`                                | Metadatos del verificador de estado configurado ligero que pueden responder "¿ya existe la configuración solo de entorno?" sin cargar el tiempo de ejecución completo del canal.                                                                      |
| `openclaw.channel.persistedAuthState`                             | Metadatos del verificador de autenticación persistida ligero que pueden responder "¿hay algo ya iniciado sesión?" sin cargar el tiempo de ejecución completo del canal.                                                                               |
| `openclaw.install.npmSpec` / `openclaw.install.localPath`         | Sugerencias de instalación/actualización para complementos agrupados y publicados externamente.                                                                                                                                                       |
| `openclaw.install.defaultChoice`                                  | Ruta de instalación preferida cuando hay varias fuentes de instalación disponibles.                                                                                                                                                                   |
| `openclaw.install.minHostVersion`                                 | Versión mínima admitida del host OpenClaw, utilizando un límite semver como `>=2026.3.22`.                                                                                                                                                            |
| `openclaw.install.expectedIntegrity`                              | Cadena de integridad de distribución npm esperada, como `sha512-...`; los flujos de instalación y actualización verifican el artefacto obtenido contra ella.                                                                                          |
| `openclaw.install.allowInvalidConfigRecovery`                     | Permite una ruta de recuperación de reinstalación estrecha para complementos agrupados cuando la configuración no es válida.                                                                                                                          |
| `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` | Permite que las superficies del canal solo de configuración se carguen antes que el complemento de canal completo durante el inicio.                                                                                                                  |

Los metadatos del manifiesto deciden qué opciones de proveedor/canal/configuración aparecen en
la incorporación antes de que cargue el tiempo de ejecución. `package.json#openclaw.install` indica
a la incorporación cómo obtener o habilitar ese complemento cuando el usuario selecciona una de esas
opciones. No mueva las sugerencias de instalación a `openclaw.plugin.json`.

`openclaw.install.minHostVersion` se aplica durante la instalación y la carga
del registro de manifiestos. Los valores no válidos se rechazan; los valores válidos pero más nuevos omiten
el complemento en hosts antiguos.

El fijado exacto de la versión de npm ya reside en `npmSpec`, por ejemplo
`"npmSpec": "@wecom/wecom-openclaw-plugin@1.2.3"`. Combínelo con
`expectedIntegrity` cuando desee que los flujos de actualización fallen de forma cerrada si el artefacto
npm obtenido ya no coincide con la versión fijada. La incorporación interactiva
ofrece especificaciones npm de registros confiables, incluidos nombres de paquetes simples y etiquetas de distribución.
Cuando `expectedIntegrity` está presente, los flujos de instalación/actualización lo aplican; cuando se
omite, la resolución del registro se registra sin un pin de integridad.

Los complementos de canal deben proporcionar `openclaw.setupEntry` cuando el estado, la lista de canales
o los escaneos de SecretRef necesitan identificar cuentas configuradas sin cargar el tiempo de ejecución
completo. La entrada de configuración debe exponer metadatos del canal más adaptadores de configuración, estado y secretos seguros para la configuración; mantenga los clientes de red, los escuchas de puerta de enlace y
los tiempos de ejecución de transporte en el punto de entrada principal de la extensión.

Los campos de punto de entrada del tiempo de ejecución no anulan las comprobaciones de límites del paquete para los campos
de punto de entrada de origen. Por ejemplo, `openclaw.runtimeExtensions` no puede hacer que una ruta
`openclaw.extensions` que escape sea cargable.

`openclaw.install.allowInvalidConfigRecovery` es intencionalmente limitado. No
hace que las configuraciones rotas arbitrarias sean instalables. Hoy solo permite que los flujos
de instalación se recuperen de fallos específicos de actualización de complementos agrupados obsoletos, como una
ruta de complemento agrupado faltante o una entrada `channels.<id>` obsoleta para ese mismo
complemento agrupado. Los errores de configuración no relacionados todavía bloquean la instalación y envían a los operadores
a `openclaw doctor --fix`.

`openclaw.channel.persistedAuthState` son metadatos del paquete para un módulo de verificación
tiny:

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

Úselo cuando los flujos de configuración, doctor o de estado configurado necesiten una prueba de autenticación sí/no económica
antes de que se cargue el complemento de canal completo. La exportación de destino debe ser una
función pequeña que lea solo el estado persistido; no la enrute a través del barrel completo
del tiempo de ejecución del canal.

`openclaw.channel.configuredState` sigue la misma forma para comprobaciones de configuración económica solo de entorno:

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

Úselo cuando un canal pueda responder el estado configurado desde el entorno u otras
pequeñas entradas no en tiempo de ejecución. Si la verificación necesita una resolución completa de la configuración o el
canal en tiempo de ejecución real, mantenga esa lógica en el enlace `config.hasConfiguredState`
del complemento en su lugar.

## Precedencia de descubrimiento (ids de complementos duplicados)

OpenClaw descubre complementos desde varias raíces (agrupados, instalación global, espacio de trabajo, rutas seleccionadas explícitamente por configuración). Si dos descubrimientos comparten el mismo `id`, solo se mantiene el manifiesto de **mayor precedencia**; los duplicados de menor precedencia se descartan en lugar de cargarse junto a él.

Precedencia, de mayor a menor:

1. **Seleccionado por configuración** — una ruta fijada explícitamente en `plugins.entries.<id>`
2. **Agrupado** — complementos enviados con OpenClaw
3. **Instalación global** — complementos instalados en la raíz global de complementos de OpenClaw
4. **Espacio de trabajo** — complementos descubiertos en relación con el espacio de trabajo actual

Implicaciones:

- Una copia bifurcada o obsoleta de un complemento agrupado que se encuentre en el espacio de trabajo no ensombrecerá la compilación agrupada.
- Para anular realmente un complemento agrupado con uno local, fíjelo mediante `plugins.entries.<id>` para que gane por precedencia en lugar de confiar en el descubrimiento del espacio de trabajo.
- Las eliminaciones de duplicados se registran para que Doctor y los diagnósticos de inicio puedan señalar la copia descartada.

## Requisitos del esquema JSON

- **Cada complemento debe incluir un esquema JSON**, incluso si no acepta configuración.
- Se acepta un esquema vacío (por ejemplo, `{ "type": "object", "additionalProperties": false }`).
- Los esquemas se validan en el momento de lectura/escritura de la configuración, no en tiempo de ejecución.

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

- El manifiesto es **obligatorio para los complementos nativos de OpenClaw**, incluidas las cargas del sistema de archivos local.
- El tiempo de ejecución todavía carga el módulo del complemento por separado; el manifiesto es solo para
  descubrimiento + validación.
- Los manifiestos nativos se analizan con JSON5, por lo que se aceptan comentarios, comas finales y
  claves sin comillas siempre que el valor final siga siendo un objeto.
- Solo el cargador de manifiestos lee los campos de manifiesto documentados. Evite agregar
  claves personalizadas de nivel superior aquí.
- `providerAuthEnvVars` es la ruta de metadatos económica para sondas de autenticación, validación de marcadores de entorno
  y superficies similares de autenticación de proveedor que no deben iniciar el tiempo de ejecución del complemento
  solo para inspeccionar nombres de entorno.
- `providerAuthAliases` permite que las variantes del proveedor reutilicen las variables de entorno de autenticación
  de otro proveedor, perfiles de autenticación, autenticación respaldada por configuración y la elección de incorporación de clave API
  sin codificar esa relación en el núcleo.
- `providerEndpoints` permite que los complementos del proveedor posean metadatos de coincidencia simples de host/baseUrl del punto final.
  Úselo solo para clases de punto final que el núcleo ya admite;
  el complemento sigue siendo dueño del comportamiento del tiempo de ejecución.
- `syntheticAuthRefs` es la ruta de metadatos económica para enlaces de autenticación sintéticos
  propiedad del proveedor que deben ser visibles para el descubrimiento de modelos en frío antes de que
  exista el registro del tiempo de ejecución. Solo enumere referencias cuyo proveedor de tiempo de ejecución o backend de CLI realmente
  implemente `resolveSyntheticAuth`.
- `nonSecretAuthMarkers` es la ruta de metadatos económica para claves API de marcador de posición
  propiedad del complemento incluido, como marcadores de credenciales locales, OAuth o ambientales.
  El núcleo las trata como no secretos para la visualización de autenticación y auditorías de secretos sin
  codificar el proveedor propietario.
- `channelEnvVars` es la ruta de metadatos económica para la alternativa de entorno de shell, indicaciones de configuración
  y superficies de canal similares que no deben iniciar el tiempo de ejecución del complemento
  solo para inspeccionar nombres de entorno. Los nombres de entorno son metadatos, no activación por
  sí mismos: el estado, la auditoría, la validación de entrega cron y otras superficies de solo lectura
  todavía aplican la política de confianza y activación efectiva del complemento antes de que
  traten una variable de entorno como un canal configurado.
- `providerAuthChoices` es la ruta de metadatos ligera para selectores de elección de autenticación,
  resolución de `--auth-choice`, mapeo de proveedor preferido y incorporación sencilla del
  registro de banderas CLI antes de que se cargue el tiempo de ejecución del proveedor. Para metadatos del asistente
  en tiempo de ejecución que requieren código del proveedor, consulte
  [Provider runtime hooks](/es/plugins/architecture#provider-runtime-hooks).
- Los tipos de complementos exclusivos se seleccionan a través de `plugins.slots.*`.
  - `kind: "memory"` es seleccionado por `plugins.slots.memory`.
  - `kind: "context-engine"` es seleccionado por `plugins.slots.contextEngine`
    (por defecto: `legacy` integrado).
- `channels`, `providers`, `cliBackends` y `skills` se pueden omitir cuando un
  complemento no los necesita.
- Si su complemento depende de módulos nativos, documente los pasos de compilación y cualquier
  requisito de lista de permitidos del administrador de paquetes (por ejemplo, pnpm `allow-build-scripts`
  - `pnpm rebuild <package>`).

## Relacionado

- [Building Plugins](/es/plugins/building-plugins) — comenzando con los complementos
- [Plugin Architecture](/es/plugins/architecture) — arquitectura interna
- [SDK Overview](/es/plugins/sdk-overview) — referencia del SDK de complementos
