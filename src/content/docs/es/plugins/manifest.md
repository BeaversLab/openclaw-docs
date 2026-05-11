---
summary: "Manifiesto del complemento + Requisitos del esquema JSON (validación de configuración estricta)"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "Manifiesto del complemento"
---

Esta página es solo para el **manifiesto del complemento nativo de OpenClaw**.

Para diseños de paquetes compatibles, consulte [Paquetes de complementos](/es/plugins/bundles).

Los formatos de paquete compatibles utilizan diferentes archivos de manifiesto:

- Paquete Codex: `.codex-plugin/plugin.json`
- Paquete Claude: `.claude-plugin/plugin.json` o el diseño de componente Claude predeterminado
  sin manifiesto
- Paquete Cursor: `.cursor-plugin/plugin.json`

OpenClaw también detecta automáticamente esos diseños de paquetes, pero no se validan
contra el esquema `openclaw.plugin.json` descrito aquí.

Para paquetes compatibles, OpenClaw actualmente lee los metadatos del paquete más las
raíces de habilidades declaradas, las raíces de comandos de Claude, los valores predeterminados
`settings.json` del paquete Claude, los valores predeterminados LSP del paquete Claude y los paquetes de hooks compatibles cuando el diseño coincide
con las expectativas de tiempo de ejecución de OpenClaw.

Cada complemento nativo de OpenClaw **debe** incluir un archivo `openclaw.plugin.json` en la
**raíz del complemento**. OpenClaw utiliza este manifiesto para validar la configuración
**sin ejecutar el código del complemento**. Los manifiestos faltantes o no válidos se tratan como
errores del complemento y bloquean la validación de la configuración.

Vea la guía completa del sistema de complementos: [Complementos](/es/tools/plugin).
Para el modelo de capacidad nativo y la guía actual de compatibilidad externa:
[Modelo de capacidad](/es/plugins/architecture#public-capability-model).

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
- metadatos del ejecutor de pruebas (QA) que el host `openclaw qa` compartido puede inspeccionar
- metadatos de configuración específicos del canal fusionados en el catálogo y superficies de validación

**No lo utilice para:** registrar el comportamiento en tiempo de ejecución, declarar puntos de entrada de código, o metadatos de instalación de npm. Esos pertenecen al código de su complemento y `package.json`.

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

| Campo                                | Obligatorio | Tipo                             | Lo que significa                                                                                                                                                                                                                                                                                                       |
| ------------------------------------ | ----------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                 | Sí          | `string`                         | Id canónico del complemento. Este es el id utilizado en `plugins.entries.<id>`.                                                                                                                                                                                                                                        |
| `configSchema`                       | Sí          | `object`                         | Esquema JSON en línea para la configuración de este complemento.                                                                                                                                                                                                                                                       |
| `enabledByDefault`                   | No          | `true`                           | Marca un complemento agrupado como habilitado de forma predeterminada. Omita esto, o establezca cualquier valor que no sea `true`, para dejar el complemento deshabilitado de forma predeterminada.                                                                                                                    |
| `legacyPluginIds`                    | No          | `string[]`                       | Ids heredados que se normalizan a este id canónico de complemento.                                                                                                                                                                                                                                                     |
| `autoEnableWhenConfiguredProviders`  | No          | `string[]`                       | Ids de proveedores que deberían habilitar automáticamente este complemento cuando la autenticación, la configuración o las referencias de modelo los mencionen.                                                                                                                                                        |
| `kind`                               | No          | `"memory"` \| `"context-engine"` | Declara un tipo de complemento exclusivo utilizado por `plugins.slots.*`.                                                                                                                                                                                                                                              |
| `channels`                           | No          | `string[]`                       | Ids de canales propiedad de este complemento. Se utilizan para el descubrimiento y la validación de la configuración.                                                                                                                                                                                                  |
| `providers`                          | No          | `string[]`                       | Ids de proveedores propiedad de este complemento.                                                                                                                                                                                                                                                                      |
| `providerDiscoveryEntry`             | No          | `string`                         | Ruta de módulo ligero de descubrimiento de proveedores, relativa a la raíz del complemento, para metadatos del catálogo de proveedores con alcance de manifiesto que se pueden cargar sin activar el tiempo de ejecución completo del complemento.                                                                     |
| `modelSupport`                       | No          | `object`                         | Metadatos abreviados de familia de modelos propiedad del manifiesto utilizados para cargar automáticamente el complemento antes del tiempo de ejecución.                                                                                                                                                               |
| `modelCatalog`                       | No          | `object`                         | Metadatos declarativos del catálogo de modelos para proveedores propiedad de este complemento. Este es el contrato del plano de control para el listado de solo lectura, incorporación, selectores de modelos, alias y supresión futuros sin cargar el tiempo de ejecución del complemento.                            |
| `modelPricing`                       | No          | `object`                         | Política de búsqueda de precios externos propiedad del proveedor. Úsela para excluir a los proveedores locales/autohospedados de los catálogos de precios remotos o para asignar referencias de proveedor a identificadores de catálogo de OpenRouter/LiteLLM sin codificar identificadores de proveedor en el núcleo. |
| `modelIdNormalization`               | No          | `object`                         | Limpieza de alias/prefijos de ID de modelo propiedad del proveedor que debe ejecutarse antes de que se cargue el tiempo de ejecución del proveedor.                                                                                                                                                                    |
| `providerEndpoints`                  | No          | `object[]`                       | Metadatos de host/baseUrl del punto de conexión propiedad del manifiesto para las rutas del proveedor que el núcleo debe clasificar antes de que se cargue el tiempo de ejecución del proveedor.                                                                                                                       |
| `providerRequest`                    | No          | `object`                         | Metadatos de familia de proveedor y compatibilidad de solicitudes de bajo costo utilizados por la política de solicitudes genérica antes de que se cargue el tiempo de ejecución del proveedor.                                                                                                                        |
| `cliBackends`                        | No          | `string[]`                       | Identificadores de backend de inferencia de CLI propiedad de este complemento. Se utilizan para la autoactivación al inicio desde referencias de configuración explícitas.                                                                                                                                             |
| `syntheticAuthRefs`                  | No          | `string[]`                       | Referencias de proveedor o backend de CLI cuyo enlace de autenticación sintética propiedad del complemento debe sondearse durante el descubrimiento de modelos en frío antes de que se cargue el tiempo de ejecución.                                                                                                  |
| `nonSecretAuthMarkers`               | No          | `string[]`                       | Valores de clave de API de marcador de posición propiedad del complemento empaquetado que representan un estado de credencial no secreto, local, OAuth o ambiental.                                                                                                                                                    |
| `commandAliases`                     | No          | `object[]`                       | Nombres de comandos propiedad de este complemento que deben producir diagnóstico de configuración y CLI con conocimiento del complemento antes de que se cargue el tiempo de ejecución.                                                                                                                                |
| `providerAuthEnvVars`                | No          | `Record<string, string[]>`       | Metadatos de entorno de compatibilidad en desuso para la búsqueda de autenticación/estado del proveedor. Prefiera `setup.providers[].envVars` para complementos nuevos; OpenClaw todavía lee esto durante el período de desuso.                                                                                        |
| `providerAuthAliases`                | No          | `Record<string, string>`         | Identificadores de proveedor que deben reutilizar otro identificador de proveedor para la búsqueda de autenticación, por ejemplo, un proveedor de codificación que comparte la clave de API y los perfiles de autenticación del proveedor base.                                                                        |
| `channelEnvVars`                     | No          | `Record<string, string[]>`       | Metadatos de entorno de canal económicos que OpenClaw puede inspeccionar sin cargar el código del complemento. Úselo para la configuración de canales controlada por el entorno o superficies de autenticación que los asistentes genéricos de inicio/configuración deben ver.                                         |
| `providerAuthChoices`                | No          | `object[]`                       | Metadatos de elección de autenticación económica para selectores de incorporación, resolución de proveedor preferido y cableado simple de indicadores de CLI.                                                                                                                                                          |
| `activation`                         | No          | `object`                         | Metadatos del planificador de activación económica para la carga activada por proveedor, comando, canal, ruta y capacidad. Solo metadatos; el tiempo de ejecución del complemento todavía posee el comportamiento real.                                                                                                |
| `setup`                              | No          | `object`                         | Descriptores de configuración/incorporación económicos que las superficies de descubrimiento y configuración pueden inspeccionar sin cargar el tiempo de ejecución del complemento.                                                                                                                                    |
| `qaRunners`                          | No          | `object[]`                       | Descriptores de ejecutor de QA económicos utilizados por el host compartido `openclaw qa` antes de que se cargue el tiempo de ejecución del complemento.                                                                                                                                                               |
| `contracts`                          | No          | `object`                         | Instantánea de capacidad empaquetada estática para enlaces de autenticación externos, voz, transcripción en tiempo real, voz en tiempo real, comprensión de medios, generación de imágenes, generación de música, generación de video, obtención web, búsqueda web y propiedad de herramientas.                        |
| `mediaUnderstandingProviderMetadata` | No          | `Record<string, object>`         | Valores predeterminados de comprensión de medios económicos para los IDs de proveedor declarados en `contracts.mediaUnderstandingProviders`.                                                                                                                                                                           |
| `channelConfigs`                     | No          | `Record<string, object>`         | Metadatos de configuración de canal propiedad del manifiesto fusionados en las superficies de descubrimiento y validación antes de que se cargue el tiempo de ejecución.                                                                                                                                               |
| `skills`                             | No          | `string[]`                       | Directorios de habilidades para cargar, relativos a la raíz del complemento.                                                                                                                                                                                                                                           |
| `name`                               | No          | `string`                         | Nombre del complemento legible por humanos.                                                                                                                                                                                                                                                                            |
| `description`                        | No          | `string`                         | Resumen breve que se muestra en las superficies del complemento.                                                                                                                                                                                                                                                       |
| `version`                            | No          | `string`                         | Versión informativa del complemento.                                                                                                                                                                                                                                                                                   |
| `uiHints`                            | No          | `Record<string, object>`         | Etiquetas de interfaz de usuario, marcadores de posición e indicaciones de sensibilidad para los campos de configuración.                                                                                                                                                                                              |

## providerAuthChoices referencia

Cada entrada `providerAuthChoices` describe una opción de incorporación o autenticación.
OpenClaw lee esto antes de que se cargue el tiempo de ejecución del proveedor.
Las listas de configuración del proveedor usan estas opciones de manifiesto, opciones de configuración derivadas del descriptor,
y metadatos del catálogo de instalación sin cargar el tiempo de ejecución del proveedor.

| Campo                 | Obligatorio | Tipo                                            | Significado                                                                                                                    |
| --------------------- | ----------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `provider`            | Sí          | `string`                                        | Id del proveedor al que pertenece esta opción.                                                                                 |
| `method`              | Sí          | `string`                                        | Id del método de autenticación al que enviar.                                                                                  |
| `choiceId`            | Sí          | `string`                                        | Id estable de opción de autenticación utilizado por los flujos de incorporación y CLI.                                         |
| `choiceLabel`         | No          | `string`                                        | Etiqueta visible para el usuario. Si se omite, OpenClaw usa `choiceId` de forma predeterminada.                                |
| `choiceHint`          | No          | `string`                                        | Texto de ayuda breve para el selector.                                                                                         |
| `assistantPriority`   | No          | `number`                                        | Los valores más bajos se ordenan antes en los selectores interactivos impulsados por el asistente.                             |
| `assistantVisibility` | No          | `"visible"` \| `"manual-only"`                  | Oculta la opción de los selectores del asistente mientras sigue permitiendo la selección manual de CLI.                        |
| `deprecatedChoiceIds` | No          | `string[]`                                      | Ids de opciones heredadas que deben redirigir a los usuarios a esta opción de reemplazo.                                       |
| `groupId`             | No          | `string`                                        | Id de grupo opcional para agrupar opciones relacionadas.                                                                       |
| `groupLabel`          | No          | `string`                                        | Etiqueta visible para el usuario para ese grupo.                                                                               |
| `groupHint`           | No          | `string`                                        | Texto de ayuda breve para el grupo.                                                                                            |
| `optionKey`           | No          | `string`                                        | Clave de opción interna para flujos de autenticación simples de una sola bandera.                                              |
| `cliFlag`             | No          | `string`                                        | Nombre de la bandera de CLI, como `--openrouter-api-key`.                                                                      |
| `cliOption`           | No          | `string`                                        | Forma completa de la opción de CLI, como `--openrouter-api-key <key>`.                                                         |
| `cliDescription`      | No          | `string`                                        | Descripción utilizada en la ayuda de la CLI.                                                                                   |
| `onboardingScopes`    | No          | `Array<"text-inference" \| "image-generation">` | En qué superficies de incorporación debe aparecer esta elección. Si se omite, el valor predeterminado es `["text-inference"]`. |

## Referencia de commandAliases

Use `commandAliases` cuando un complemento posee un nombre de comando de tiempo de ejecución que los usuarios pueden poner por error en `plugins.allow` o intentar ejecutar como un comando raíz de la CLI. OpenClaw utiliza estos metadatos para el diagnóstico sin importar el código de tiempo de ejecución del complemento.

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

| Campo        | Obligatorio | Tipo              | Lo que significa                                                                           |
| ------------ | ----------- | ----------------- | ------------------------------------------------------------------------------------------ |
| `name`       | Sí          | `string`          | Nombre del comando que pertenece a este complemento.                                       |
| `kind`       | No          | `"runtime-slash"` | Marca el alias como un comando de barra de chat en lugar de un comando raíz de la CLI.     |
| `cliCommand` | No          | `string`          | Comando raíz de la CLI relacionado para sugerir para operaciones de la CLI, si existe uno. |

## Referencia de activation

Use `activation` cuando el complemento pueda declarar económicamente qué eventos del plano de control deben incluirlo en un plan de activación/carga.

Este bloque es metadatos del planificador, no una API del ciclo de vida. No registra el comportamiento en tiempo de ejecución, no reemplaza `register(...)` y no promete que el código del complemento ya se haya ejecutado. El planificador de activación utiliza estos campos para reducir los complementos candidatos antes de recurrir a los metadatos de propiedad del manifiesto existentes, como `providers`, `channels`, `commandAliases`, `setup.providers`, `contracts.tools` y enlaces (hooks).

Prefiera los metadatos más estrechos que ya describen la propiedad. Use
`providers`, `channels`, `commandAliases`, descriptores de configuración o `contracts`
cuando esos campos expresen la relación. Use `activation` para pistas adicionales del planificador
que no puedan ser representadas por esos campos de propiedad.
Use `cliBackends` de nivel superior para alias de tiempo de ejecución de CLI como `claude-cli`,
`codex-cli` o `google-gemini-cli`; `activation.onAgentHarnesses` es solo para
ids de arnés de agente integrado que aún no tienen un campo de propiedad.

Este bloque es solo metadatos. No registra comportamiento de tiempo de ejecución y no
reemplaza a `register(...)`, `setupEntry` u otros puntos de entrada de tiempo de ejecución/complementos.
Los consumidores actuales lo usan como una pista de reducción antes de la carga más amplia del complemento, por lo que
la falta de metadatos de activación generalmente solo cuesta rendimiento; no debería
cambiar la corrección mientras aún existan los respaldos de propiedad de manifiesto heredados.

```json
{
  "activation": {
    "onProviders": ["openai"],
    "onCommands": ["models"],
    "onChannels": ["web"],
    "onRoutes": ["gateway-webhook"],
    "onConfigPaths": ["browser"],
    "onCapabilities": ["provider", "tool"]
  }
}
```

| Campo              | Obligatorio | Tipo                                                 | Lo que significa                                                                                                                                                                                 |
| ------------------ | ----------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `onProviders`      | No          | `string[]`                                           | Ids de proveedores que deben incluir este complemento en los planes de activación/carga.                                                                                                         |
| `onAgentHarnesses` | No          | `string[]`                                           | Ids de tiempo de ejecución del arnés de agente integrado que deben incluir este complemento en los planes de activación/carga. Use `cliBackends` de nivel superior para alias de backend de CLI. |
| `onCommands`       | No          | `string[]`                                           | Ids de comandos que deben incluir este complemento en los planes de activación/carga.                                                                                                            |
| `onChannels`       | No          | `string[]`                                           | Ids de canales que deben incluir este complemento en los planes de activación/carga.                                                                                                             |
| `onRoutes`         | No          | `string[]`                                           | Tipos de rutas que deben incluir este complemento en los planes de activación/carga.                                                                                                             |
| `onConfigPaths`    | No          | `string[]`                                           | Rutas de configuración relativas a la raíz que deben incluir este complemento en los planes de inicio/carga cuando la ruta está presente y no está deshabilitada explícitamente.                 |
| `onCapabilities`   | No          | `Array<"provider" \| "channel" \| "tool" \| "hook">` | Sugerencias de capacidades amplias utilizadas por la planificación de activación del plano de control. Se prefieren campos más específicos cuando sea posible.                                   |

Consumidores activos actuales:

- la planificación de la CLI activada por comandos recurre a `commandAliases[].cliCommand` o `commandAliases[].name` heredados
- la planificación de inicio del tiempo de ejecución del agente utiliza `activation.onAgentHarnesses` para
  arneses integrados y `cliBackends[]` de nivel superior para alias del tiempo de ejecución de la CLI
- la planificación de configuración/canal activada por canal recurre a la propiedad
  `channels[]` heredada cuando faltan metadatos de activación de canal explícitos
- la planificación de complementos de inicio utiliza `activation.onConfigPaths` para superficies de configuración
  raíz que no son de canal, como el bloque `browser` del complemento del navegador incluido
- la planificación de configuración/tiempo de ejecución activada por el proveedor recurre a `providers[]` heredado
  y a la propiedad `cliBackends[]` de nivel superior cuando faltan metadatos de activación del proveedor explícitos

Los diagnósticos del planificador pueden distinguir las sugerencias de activación explícitas de la reserva de propiedad del manifiesto. Por ejemplo, `activation-command-hint` significa que `activation.onCommands` coincidió, mientras que `manifest-command-alias` significa que el planificador utilizó la propiedad `commandAliases` en su lugar. Estas etiquetas de motivo son para diagnósticos y pruebas del host; los autores de complementos deben seguir declarando los metadatos que mejor describen la propiedad.

## referencia de qaRunners

Use `qaRunners` cuando un complemento contribuya con uno o más ejecutores de transporte debajo de la raíz compartida `openclaw qa`. Mantenga estos metadatos económicos y estáticos; el tiempo de ejecución del complemento aún posee el registro real de la CLI a través de una superficie ligera `runtime-api.ts` que exporta `qaRunnerCliRegistrations`.

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

| Campo         | Obligatorio | Tipo     | Significado                                                                                 |
| ------------- | ----------- | -------- | ------------------------------------------------------------------------------------------- |
| `commandName` | Sí          | `string` | Subcomando montado debajo de `openclaw qa`, por ejemplo `matrix`.                           |
| `description` | No          | `string` | Texto de ayuda de reserva utilizado cuando el host compartido necesita un comando auxiliar. |

## referencia de configuración

Use `setup` cuando las superficies de configuración e incorporación necesitan metadatos baratos propiedad del complemento
antes de que se cargue el tiempo de ejecución.

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

El `cliBackends` de nivel superior sigue siendo válido y continúa describiendo los backends de inferencia de la CLI.
`setup.cliBackends` es la superficie del descriptor específica de configuración para
los flujos de control plano/configuración que deben mantenerse solo como metadatos.

Cuando están presentes, `setup.providers` y `setup.cliBackends` son la superficie de búsqueda preferida con
prioridad de descriptor para el descubrimiento de configuración. Si el descriptor solo
limita el complemento candidato y la configuración aún necesita enlaces de tiempo de ejecución más ricos en el momento de la configuración,
establezca `requiresRuntime: true` y mantenga `setup-api` en su lugar como la
ruta de ejecución de reserva.

OpenClaw también incluye `setup.providers[].envVars` en búsquedas genéricas de autenticación de proveedor
y variables de entorno. `providerAuthEnvVars` sigue siendo compatible a través de un adaptador de
compatibilidad durante el período de desuso, pero los complementos no agrupados que aún lo usan
reciben un diagnóstico de manifiesto. Los nuevos complementos deben poner los metadatos de entorno de configuración/estado
en `setup.providers[].envVars`.

OpenClaw también puede derivar opciones simples de configuración desde `setup.providers[].authMethods`
cuando no hay ninguna entrada de configuración disponible, o cuando `setup.requiresRuntime: false`
declara que el tiempo de ejecución de configuración es innecesario. Las entradas explícitas de `providerAuthChoices` siguen
siendo preferidas para etiquetas personalizadas, indicadores de CLI, alcance de incorporación y metadatos del asistente.

Establezca `requiresRuntime: false` solo cuando esos descriptores sean suficientes para la
superficie de configuración. OpenClaw trata el `false` explícito como un contrato solo de descriptor
y no ejecutará `setup-api` o `openclaw.setupEntry` para la búsqueda de configuración. Si
un complemento solo de descriptor todavía envía una de esas entradas de tiempo de ejecución de configuración,
OpenClaw informa un diagnóstico aditivo y continúa ignorándolo. La omisión
de `requiresRuntime` mantiene el comportamiento de reserva heredado para que los complementos existentes que agregaron
descriptores sin el indicador no se rompan.

Dado que la búsqueda de configuración (setup lookup) puede ejecutar código `setup-api` propiedad del complemento, los valores normalizados `setup.providers[].id` y `setup.cliBackends[]` deben mantenerse únicos en todos los complementos descubiertos. La propiedad ambigua falla de forma segura (fails closed) en lugar de elegir un ganador según el orden de descubrimiento.

Cuando se ejecuta el tiempo de ejecución de configuración, los diagnósticos del registro de configuración reportan una deriva del descriptor si `setup-api` registra un proveedor o un backend de CLI que los descriptores del manifiesto no declaran, o si un descriptor no tiene un registro de tiempo de ejecución coincidente. Estos diagnósticos son aditivos y no rechazan los complementos heredados.

### referencia de setup.providers

| Campo         | Obligatorio | Tipo       | Significado                                                                                                                                                |
| ------------- | ----------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`          | Sí          | `string`   | ID de proveedor expuesto durante la configuración o incorporación (onboarding). Mantenga los IDs normalizados únicos globalmente.                          |
| `authMethods` | No          | `string[]` | IDs de métodos de configuración/autenticación que este proveedor admite sin cargar el tiempo de ejecución completo.                                        |
| `envVars`     | No          | `string[]` | Variables de entorno que las superficies de configuración/estado genéricas pueden verificar antes de que se cargue el tiempo de ejecución del complemento. |

### campos de configuración (setup fields)

| Campo              | Obligatorio | Tipo       | Significado                                                                                                                                                           |
| ------------------ | ----------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `providers`        | No          | `object[]` | Descriptores de configuración del proveedor expuestos durante la configuración e incorporación.                                                                       |
| `cliBackends`      | No          | `string[]` | IDs de backend en tiempo de configuración utilizados para la búsqueda de configuración con prioridad de descriptor. Mantenga los IDs normalizados únicos globalmente. |
| `configMigrations` | No          | `string[]` | IDs de migración de configuración propiedad de la superficie de configuración de este complemento.                                                                    |
| `requiresRuntime`  | No          | `boolean`  | Si la configuración todavía necesita la ejecución de `setup-api` después de la búsqueda del descriptor.                                                               |

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

| Campo         | Tipo       | Significado                                                |
| ------------- | ---------- | ---------------------------------------------------------- |
| `label`       | `string`   | Etiqueta del campo orientada al usuario.                   |
| `help`        | `string`   | Texto de ayuda breve.                                      |
| `tags`        | `string[]` | Etiquetas de UI opcionales.                                |
| `advanced`    | `boolean`  | Marca el campo como avanzado.                              |
| `sensitive`   | `boolean`  | Marca el campo como secreto o sensible.                    |
| `placeholder` | `string`   | Texto de marcador de posición para entradas de formulario. |

## referencia de contratos

Use `contracts` solo para metadatos estáticos de propiedad de capacidades que OpenClaw puede
leer sin importar el tiempo de ejecución del complemento.

```json
{
  "contracts": {
    "agentToolResultMiddleware": ["pi", "codex"],
    "externalAuthProviders": ["acme-ai"],
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
    "tools": ["firecrawl_search", "firecrawl_scrape"]
  }
}
```

Cada lista es opcional:

| Campo                            | Tipo       | Lo que significa                                                                                                             |
| -------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `embeddedExtensionFactories`     | `string[]` | Ids de fábrica de extensión del servidor de aplicaciones Codex, actualmente `codex-app-server`.                              |
| `agentToolResultMiddleware`      | `string[]` | Ids de tiempo de ejecución para los que un complemento empaquetado puede registrar middleware de resultados de herramientas. |
| `externalAuthProviders`          | `string[]` | Ids de proveedor cuyo enlace de perfil de autenticación externa posee este complemento.                                      |
| `speechProviders`                | `string[]` | Ids de proveedor de voz que posee este complemento.                                                                          |
| `realtimeTranscriptionProviders` | `string[]` | Ids de proveedor de transcripción en tiempo real que posee este complemento.                                                 |
| `realtimeVoiceProviders`         | `string[]` | Ids de proveedor de voz en tiempo real que posee este complemento.                                                           |
| `memoryEmbeddingProviders`       | `string[]` | Ids de proveedor de incrustación de memoria que posee este complemento.                                                      |
| `mediaUnderstandingProviders`    | `string[]` | Ids de proveedor de comprensión de medios que posee este complemento.                                                        |
| `imageGenerationProviders`       | `string[]` | Ids de proveedor de generación de imágenes que posee este complemento.                                                       |
| `videoGenerationProviders`       | `string[]` | Ids de proveedor de generación de video que posee este complemento.                                                          |
| `webFetchProviders`              | `string[]` | Ids de proveedor de recuperación web que posee este complemento.                                                             |
| `webSearchProviders`             | `string[]` | Ids de proveedor de búsqueda web que posee este complemento.                                                                 |
| `migrationProviders`             | `string[]` | Ids de proveedor de importación que posee este complemento para `openclaw migrate`.                                          |
| `tools`                          | `string[]` | Nombres de herramientas de agente que posee este complemento para verificaciones de contratos agrupados.                     |

`contracts.embeddedExtensionFactories` se conserva para fábricas de extensiones
solo de servidor de aplicaciones Codex agrupadas. Las transformaciones de
resultados de herramientas agrupadas deben declarar
`contracts.agentToolResultMiddleware` y registrarse con
`api.registerAgentToolResultMiddleware(...)` en su lugar. Los complementos externos no
pueden registrar middleware de resultados de herramientas porque la costura puede reescribir la salida de herramientas de alta confianza
antes de que el modelo la vea.

Los complementos de proveedor que implementan `resolveExternalAuthProfiles` deben declarar
`contracts.externalAuthProviders`. Los complementos sin la declaración aún se ejecutan
a través de una reserva de compatibilidad obsoleta, pero esa reserva es más lenta y
se eliminará después del período de migración.

Los proveedores de incrustación de memoria agrupados deben declarar
`contracts.memoryEmbeddingProviders` para cada id. de adaptador que expongan, incluyendo
adaptadores integrados como `local`. Las rutas de CLI independientes usan este contrato de manifiesto
para cargar solo el complemento propietario antes de que el tiempo de ejecución completo de Gateway haya
registrado los proveedores.

## Referencia de mediaUnderstandingProviderMetadata

Use `mediaUnderstandingProviderMetadata` cuando un proveedor de comprensión de medios tiene
modelos predeterminados, prioridad de reserva de autenticación automática o soporte de documentos nativo que
los ayudantes centrales genéricos necesitan antes de que se cargue el tiempo de ejecución. Las claves también deben declararse en
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
| `autoPriority`         | `Record<string, number>`            | Los números más bajos se ordenan antes para la reserva automática de proveedores basada en credenciales.  |
| `nativeDocumentInputs` | `"pdf"[]`                           | Entradas de documentos nativos compatibles con el proveedor.                                              |

## Referencia de channelConfigs

Use `channelConfigs` cuando un complemento de canal necesita metadatos de configuración baratos antes de que se cargue el tiempo de ejecución. El descubrimiento de configuración/estado de solo lectura del canal puede usar estos metadatos directamente para canales externos configurados cuando no hay disponible una entrada de configuración, o cuando `setup.requiresRuntime: false` declara que el tiempo de ejecución de la configuración no es necesario.

`channelConfigs` son metadatos del manifiesto del complemento, no una nueva sección de configuración de usuario de nivel superior. Los usuarios siguen configurando las instancias del canal bajo `channels.<channel-id>`. OpenClaw lee los metadatos del manifiesto para decidir qué complemento posee ese canal configurado antes de que se ejecute el código de tiempo de ejecución del complemento.

Para un complemento de canal, `configSchema` y `channelConfigs` describen diferentes rutas:

- `configSchema` valida `plugins.entries.<plugin-id>.config`
- `channelConfigs.<channel-id>.schema` valida `channels.<channel-id>`

Los complementos no empaquetados que declaran `channels[]` también deben declarar entradas `channelConfigs` coincidentes. Sin ellas, OpenClaw aún puede cargar el complemento, pero el esquema de configuración de ruta fría, la configuración y las superficies de la interfaz de usuario de Control no pueden conocer la forma de la opción propiedad del canal hasta que se ejecute el tiempo de ejecución del complemento.

`channelConfigs.<channel-id>.commands.nativeCommandsAutoEnabled` y
`nativeSkillsAutoEnabled` pueden declarar valores predeterminados estáticos de `auto` para verificaciones de configuración de comandos que se ejecutan antes de que se cargue el tiempo de ejecución del canal. Los canales empaquetados también pueden publicar los mismos valores predeterminados a través de `package.json#openclaw.channel.commands` junto con
otros metadatos del catálogo de canales propiedad del paquete.

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

| Campo         | Tipo                     | Lo que significa                                                                                                                                     |
| ------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schema`      | `object`                 | Esquema JSON para `channels.<id>`. Obligatorio para cada entrada de configuración de canal declarada.                                                |
| `uiHints`     | `Record<string, object>` | Etiquetas de interfaz de usuario opcionales/marcadores de posición/sugerencias sensibles para esa sección de configuración de canal.                 |
| `label`       | `string`                 | Etiqueta del canal fusionada en las superficies del selector y de inspección cuando los metadatos del tiempo de ejecución no están listos.           |
| `description` | `string`                 | Descripción breve del canal para las superficies de inspección y catálogo.                                                                           |
| `commands`    | `object`                 | Valores predeterminados automáticos estáticos de comandos nativos y habilidades nativas para verificaciones de configuración previas a la ejecución. |
| `preferOver`  | `string[]`               | Identificadores de complementos heredados o de menor prioridad que este canal debe superar en las superficies de selección.                          |

### Reemplazar otro complemento de canal

Use `preferOver` cuando su complemento sea el propietario preferido para un identificador de canal que
otro complemento también puede proporcionar. Los casos comunes son un identificador de complemento renombrado, un
complemento independiente que reemplaza a un complemento empaquetado, o un fork mantenido que
mantiene el mismo identificador de canal para la compatibilidad de configuración.

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

Cuando se configura `channels.chat`, OpenClaw considera tanto el identificador del canal como
el identificador del complemento preferido. Si el complemento de menor prioridad se seleccionó solo porque
está empaquetado o habilitado de forma predeterminada, OpenClaw lo deshabilita en la configuración de
ejecución efectiva para que un complemento sea propietario del canal y sus herramientas. La selección
explícita del usuario aún tiene prioridad: si el usuario habilita explícitamente ambos complementos, OpenClaw
conserva esa elección e informa diagnósticos de canal/herramienta duplicados en lugar de
cambiar silenciosamente el conjunto de complementos solicitado.

Mantenga `preferOver` limitado a identificadores de complementos que realmente puedan proporcionar el mismo canal.
No es un campo de prioridad general y no cambia las claves de configuración del usuario.

## referencia de modelSupport

Use `modelSupport` cuando OpenClaw debe inferir su complemento de proveedor a partir de
identificadores de modelo abreviados como `gpt-5.5` o `claude-sonnet-4.6` antes de que se cargue el
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

- las referencias `provider/model` explícitas utilizan los metadatos del manifiesto `providers` propietario
- `modelPatterns` ganan a `modelPrefixes`
- si un complemento no empaquetado y un complemento empaquetado coinciden ambos, gana el complemento
  no empaquetado
- la ambigüedad restante se ignora hasta que el usuario o la configuración especifiquen un proveedor

Campos:

| Campo           | Tipo       | Significado                                                                                                              |
| --------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| `modelPrefixes` | `string[]` | Prefijos coincidentes con `startsWith` contra identificadores de modelo abreviados.                                      |
| `modelPatterns` | `string[]` | Fuentes de regex coincidentes con identificadores de modelos abreviados después de la eliminación del sufijo del perfil. |

## referencia de modelCatalog

Use `modelCatalog` cuando OpenClaw deba conocer los metadatos del modelo del proveedor antes de
cargar el tiempo de ejecución del complemento. Esta es la fuente propiedad del manifiesto para filas de catálogo
fijas, alias de proveedor, reglas de supresión y modo de descubrimiento. La actualización en tiempo de ejecución
aún pertenece al código del tiempo de ejecución del proveedor, pero el manifiesto indica al núcleo cuándo se requiere el
tiempo de ejecución.

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

| Campo          | Tipo                                                     | Lo que significa                                                                                                                                       |
| -------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `providers`    | `Record<string, object>`                                 | Filas de catálogo para identificadores de proveedor propiedad de este complemento. Las claves también deben aparecer en el nivel superior `providers`. |
| `aliases`      | `Record<string, object>`                                 | Alias de proveedor que deben resolverse en un proveedor propio para la planificación de catálogo o supresión.                                          |
| `suppressions` | `object[]`                                               | Filas de modelo de otra fuente que este complemento suprime por una razón específica del proveedor.                                                    |
| `discovery`    | `Record<string, "static" \| "refreshable" \| "runtime">` | Si el catálogo del proveedor se puede leer desde los metadatos del manifiesto, actualizar en la caché o requiere tiempo de ejecución.                  |

`aliases` participa en la búsqueda de propiedad del proveedor para la planificación del catálogo de modelos.
Los objetivos de los alias deben ser proveedores de nivel superior propiedad del mismo complemento. Cuando una
lista filtrada por proveedor usa un alias, OpenClaw puede leer el manifiesto propietario y
aplicar las anulaciones de API/URL base del alias sin cargar el tiempo de ejecución del proveedor.

`suppressions` es el reemplazo estático preferido para los ganchos `suppressBuiltInModel` del tiempo de ejecución del proveedor.
Las entradas de supresión se respetan solo cuando el proveedor es propiedad del complemento o se declara como una clave `modelCatalog.aliases` que
tiene como objetivo un proveedor propio. Los ganchos de supresión en tiempo de ejecución aún se ejecutan como mecanismo de
compatibilidad en desuso para los complementos que no han migrado.

Campos del proveedor:

| Campo     | Tipo                     | Lo que significa                                                                     |
| --------- | ------------------------ | ------------------------------------------------------------------------------------ |
| `baseUrl` | `string`                 | URL base opcional predeterminada para modelos en este catálogo de proveedor.         |
| `api`     | `ModelApi`               | Adaptador de API opcional predeterminado para modelos en este catálogo de proveedor. |
| `headers` | `Record<string, string>` | Encabezados estáticos opcionales que se aplican a este catálogo de proveedores.      |
| `models`  | `object[]`               | Filas de modelo requeridas. Se ignoran las filas sin un `id`.                        |

Campos del modelo:

| Campo           | Tipo                                                           | Qué significa                                                                                                        |
| --------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `id`            | `string`                                                       | ID de modelo local del proveedor, sin el prefijo `provider/`.                                                        |
| `name`          | `string`                                                       | Nombre para mostrar opcional.                                                                                        |
| `api`           | `ModelApi`                                                     | Invalidación de API opcional por modelo.                                                                             |
| `baseUrl`       | `string`                                                       | Invalidación de URL base opcional por modelo.                                                                        |
| `headers`       | `Record<string, string>`                                       | Encabezados estáticos opcionales por modelo.                                                                         |
| `input`         | `Array<"text" \| "image" \| "document" \| "audio" \| "video">` | Modalidades que acepta el modelo.                                                                                    |
| `reasoning`     | `boolean`                                                      | Si el modelo expone un comportamiento de razonamiento.                                                               |
| `contextWindow` | `number`                                                       | Ventana de contexto del proveedor nativo.                                                                            |
| `contextTokens` | `number`                                                       | Límite efectivo de contexto de ejecución opcional cuando es diferente de `contextWindow`.                            |
| `maxTokens`     | `number`                                                       | Tokens de salida máximos cuando se conocen.                                                                          |
| `cost`          | `object`                                                       | Precio en USD por millón de tokens opcional, incluyendo `tieredPricing` opcional.                                    |
| `compat`        | `object`                                                       | Marcadores de compatibilidad opcionales que coinciden con la compatibilidad de configuración del modelo de OpenClaw. |
| `status`        | `"available"` \| `"preview"` \| `"deprecated"` \| `"disabled"` | Estado de listado. Suprimir solo cuando la fila no debe aparecer en absoluto.                                        |
| `statusReason`  | `string`                                                       | Razón opcional que se muestra con estado no disponible.                                                              |
| `replaces`      | `string[]`                                                     | Ids de modelos locales del proveedor más antiguos que este modelo reemplaza.                                         |
| `replacedBy`    | `string`                                                       | Id de modelo local del proveedor de reemplazo para filas obsoletas.                                                  |
| `tags`          | `string[]`                                                     | Etiquetas estables utilizadas por selectores y filtros.                                                              |

No pongas datos solo de tiempo de ejecución en `modelCatalog`. Si un proveedor necesita el estado de la cuenta, una solicitud a la API o el descubrimiento de procesos locales para conocer el conjunto completo de modelos, declara ese proveedor como `refreshable` o `runtime` en `discovery`.

## referencia de modelIdNormalization

Usa `modelIdNormalization` para una limpieza de id de modelo propia del proveedor económica que debe ocurrir antes de que cargue el tiempo de ejecución del proveedor. Esto mantiene alias como nombres cortos de modelos, ids heredados locales del proveedor y reglas de prefijo de proxy en el manifiesto del complemento propietario en lugar de en las tablas principales de selección de modelos.

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

| Campo                                | Tipo                    | Qué significa                                                                                                                 |
| ------------------------------------ | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `aliases`                            | `Record<string,string>` | Alias de id de modelo exactos que no distinguen entre mayúsculas y minúsculas. Los valores se devuelven tal como se escriben. |
| `stripPrefixes`                      | `string[]`              | Prefijos para eliminar antes de la búsqueda de alias, útil para la duplicación de proveedores/modelos heredados.              |
| `prefixWhenBare`                     | `string`                | Prefijo para agregar cuando el id de modelo normalizado aún no contiene `/`.                                                  |
| `prefixWhenBareAfterAliasStartsWith` | `object[]`              | Reglas de prefijo de id simple condicionales después de la búsqueda de alias, clave por `modelPrefix` y `prefix`.             |

## referencia de providerEndpoints

Usa `providerEndpoints` para la clasificación de endpoints que la política de solicitud genérica debe conocer antes de que cargue el tiempo de ejecución del proveedor. Core sigue siendo el propietario del significado de cada `endpointClass`; los manifiestos de los complementos son los propietarios de los metadatos del host y la URL base.

Campos de Endpoint:

| Campo                          | Tipo       | Qué significa                                                                                                           |
| ------------------------------ | ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| `endpointClass`                | `string`   | Clase de endpoint principal conocida, como `openrouter`, `moonshot-native` o `google-vertex`.                           |
| `hosts`                        | `string[]` | Nombres de host exactos que se asignan a la clase de endpoint.                                                          |
| `hostSuffixes`                 | `string[]` | Sufijos de host que se asignan a la clase de endpoint. Prefije con `.` para una coincidencia solo de sufijo de dominio. |
| `baseUrls`                     | `string[]` | URLs base HTTP(S) normalizadas exactas que se asignan a la clase de endpoint.                                           |
| `googleVertexRegion`           | `string`   | Región estática de Google Vertex para hosts globales exactos.                                                           |
| `googleVertexRegionHostSuffix` | `string`   | Sufijo para eliminar de los hosts coincidentes para exponer el prefijo de región de Google Vertex.                      |

## referencia de providerRequest

Use `providerRequest` para metadatos económicos de compatibilidad de solicitudes que la política de solicitud genérica necesita sin cargar el tiempo de ejecución del proveedor. Mantenga la reescritura de carga específica del comportamiento en los enlaces del tiempo de ejecución del proveedor o en los asistentes compartidos de la familia del proveedor.

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

| Campo                 | Tipo         | Qué significa                                                                                                          |
| --------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `family`              | `string`     | Etiqueta de familia de proveedores utilizada por decisiones genéricas de compatibilidad de solicitudes y diagnósticos. |
| `compatibilityFamily` | `"moonshot"` | Cubo de compatibilidad de familia de proveedores opcional para asistentes de solicitudes compartidas.                  |
| `openAICompletions`   | `object`     | Marcadores de solicitud de completados compatibles con OpenAI, actualmente `supportsStreamingUsage`.                   |

## referencia de modelPricing

Use `modelPricing` cuando un proveedor necesita comportamiento de precios del plano de control antes de que se cargue el tiempo de ejecución. La caché de precios de Gateway lee estos metadatos sin importar el código del tiempo de ejecución del proveedor.

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

| Campo        | Tipo              | Qué significa                                                                                                         |
| ------------ | ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| `external`   | `boolean`         | Establezca `false` para proveedores locales/autohospedados que nunca deben recuperar precios de OpenRouter o LiteLLM. |
| `openRouter` | `false \| object` | Asignación de búsqueda de precios de OpenRouter. `false` deshabilita la búsqueda de OpenRouter para este proveedor.   |
| `liteLLM`    | `false \| object` | Mapeo de búsqueda de precios de LiteLLM. `false` deshabilita la búsqueda de LiteLLM para este proveedor.              |

Campos de origen:

| Campo                      | Tipo               | Lo que significa                                                                                                                          |
| -------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `provider`                 | `string`           | ID del proveedor del catálogo externo cuando difiere del ID del proveedor de OpenClaw, por ejemplo `z-ai` para un proveedor `zai`.        |
| `passthroughProviderModel` | `boolean`          | Tratar los IDs de modelo que contengan barras como referencias anidadas de proveedor/modelo, útil para proveedores proxy como OpenRouter. |
| `modelIdTransforms`        | `"version-dots"[]` | Variantes adicionales de IDs de modelo del catálogo externo. `version-dots` intenta IDs de versión con puntos como `claude-opus-4.6`.     |

### Índice de proveedores de OpenClaw

El Índice de proveedores de OpenClaw son metadatos de vista previa propiedad de OpenClaw para proveedores
cuyos complementos aún pueden no estar instalados. No es parte de un manifiesto de complemento.
Los manifiestos de complementos siguen siendo la autoridad del complemento instalado. El Índice de proveedores es
el contrato de reserva interno que las futuras superficies de proveedores instalables y de selección de modelos
pre-instalación consumirán cuando no se haya instalado un complemento de proveedor.

Orden de autoridad del catálogo:

1. Configuración de usuario.
2. Manifiesto de complemento instalado `modelCatalog`.
3. Caché del catálogo de modelos de una actualización explícita.
4. Filas de vista previa del Índice de proveedores de OpenClaw.

El Índice de proveedores no debe contener secretos, estado habilitado, ganchos de tiempo de ejecución o
datos de modelo en vivo específicos de la cuenta. Sus catálogos de vista previa utilizan la misma
forma de fila de proveedor `modelCatalog` que los manifiestos de complementos, pero deben mantenerse limitados
a metadatos de visualización estables, a menos que los campos del adaptador de tiempo de ejecución, como `api`,
`baseUrl`, precios o indicadores de compatibilidad, se mantengan intencionalmente alineados con
el manifiesto del complemento instalado. Los proveedores con descubrimiento `/models` en vivo deben
escribir filas actualizadas a través de la ruta de caché del catálogo de modelos explícita en lugar de
realizar llamadas de API de proveedor de listado o incorporación normales.

Las entradas del Índice de Proveedores también pueden llevar metadatos de complemento instalable para proveedores cuyo complemento se ha movido fuera del núcleo o aún no está instalado. Estos metadatos reflejan el patrón del catálogo de canales: el nombre del paquete, la especificación de instalación de npm, la integridad esperada y las etiquetas económicas de elección de autenticación son suficientes para mostrar una opción de configuración instalable. Una vez que el complemento está instalado, su manifiesto tiene prioridad y se ignora la entrada del Índice de Proveedores para ese proveedor.

Las claves de capacidades de nivel superior heredadas están obsoletas. Use `openclaw doctor --fix` para mover `speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders` y `webSearchProviders` bajo `contracts`; la carga normal del manifiesto ya no trata esos campos de nivel superior como propiedad de la capacidad.

## Manifiesto versus package.

Los dos archivos cumplen funciones diferentes:

| Archivo                | Úselo para                                                                                                                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw.plugin.json` | Descubrimiento, validación de configuración, metadatos de elección de autenticación e indicadores de interfaz de usuario que deben existir antes de que se ejecute el código del complemento |
| `package.json`         | metadatos de npm, instalación de dependencias y el bloque `openclaw` utilizado para puntos de entrada, control de instalación, configuración o metadatos del catálogo                        |

Si no está seguro de dónde pertenece un metadato, use esta regla:

- si OpenClaw debe conocerlo antes de cargar el código del complemento, póngalo en `openclaw.plugin.json`
- si se trata del empaquetado, los archivos de entrada o el comportamiento de instalación de npm, póngalo en `package.json`

### Campos de package. que afectan el descubrimiento

Algunos metadatos de complementos previos a la ejecución residen intencionalmente en `package.json` bajo el bloque `openclaw` en lugar de `openclaw.plugin.json`.

Ejemplos importantes:

| Campo                                                             | Lo que significa                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `openclaw.extensions`                                             | Declara puntos de entrada de complementos nativos. Debe permanecer dentro del directorio del paquete del complemento.                                                                                                                                  |
| `openclaw.runtimeExtensions`                                      | Declara puntos de entrada de tiempo de ejecución de JavaScript compilados para paquetes instalados. Debe permanecer dentro del directorio del paquete del complemento.                                                                                 |
| `openclaw.setupEntry`                                             | Punto de entrada ligero solo de configuración utilizado durante la incorporación, el inicio diferido del canal y el descubrimiento de estado del canal o SecretRef de solo lectura. Debe permanecer dentro del directorio del paquete del complemento. |
| `openclaw.runtimeSetupEntry`                                      | Declara el punto de entrada de configuración de JavaScript compilado para paquetes instalados. Debe permanecer dentro del directorio del paquete del complemento.                                                                                      |
| `openclaw.channel`                                                | Metadatos ligeros del catálogo de canales como etiquetas, rutas de documentación, alias y texto de selección.                                                                                                                                          |
| `openclaw.channel.commands`                                       | Metadatos predeterminados automáticos de comandos nativos y habilidades nativas estáticas utilizados por la configuración, la auditoría y las superficies de lista de comandos antes de que se cargue el tiempo de ejecución del canal.                |
| `openclaw.channel.configuredState`                                | Metadatos del verificador de estado configurado ligero que pueden responder "¿ya existe la configuración solo de entorno?" sin cargar el tiempo de ejecución completo del canal.                                                                       |
| `openclaw.channel.persistedAuthState`                             | Metadatos del verificador de autenticación persistida ligero que pueden responder "¿hay algo ya iniciado sesión?" sin cargar el tiempo de ejecución completo del canal.                                                                                |
| `openclaw.install.npmSpec` / `openclaw.install.localPath`         | Sugerencias de instalación/actualización para complementos empaquetados y publicados externamente.                                                                                                                                                     |
| `openclaw.install.defaultChoice`                                  | Ruta de instalación preferida cuando hay múltiples fuentes de instalación disponibles.                                                                                                                                                                 |
| `openclaw.install.minHostVersion`                                 | Versión mínima admitida del host de OpenClaw, utilizando un límite semver como `>=2026.3.22`.                                                                                                                                                          |
| `openclaw.install.expectedIntegrity`                              | Cadena de integridad de distribución npm esperada, como `sha512-...`; los flujos de instalación y actualización verifican el artefacto obtenido contra ella.                                                                                           |
| `openclaw.install.allowInvalidConfigRecovery`                     | Permite una ruta de recuperación de reinstalación estrecha para complementos empaquetados cuando la configuración no es válida.                                                                                                                        |
| `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` | Permite que las superficies del canal de solo configuración se carguen antes que el complemento de canal completo durante el inicio.                                                                                                                   |

Los metadatos del manifiesto deciden qué opciones de proveedor/canal/configuración aparecen en la incorporación antes de que se cargue el tiempo de ejecución. `package.json#openclaw.install` indica a la incorporación cómo obtener o habilitar ese complemento cuando el usuario elige una de esas opciones. No mueva las sugerencias de instalación a `openclaw.plugin.json`.

`openclaw.install.minHostVersion` se aplica durante la instalación y la carga del registro de manifiestos. Los valores no válidos se rechazan; los valores válidos pero más nuevos omiten el complemento en hosts antiguos.

El anclaje de la versión exacta de npm ya reside en `npmSpec`, por ejemplo
`"npmSpec": "@wecom/wecom-openclaw-plugin@1.2.3"`. Las entradas oficiales de catálogos externos
deben emparejar especificaciones exactas con `expectedIntegrity` para que los flujos de actualización fallen
cerrado si el artefacto de npm obtenido ya no coincide con la versión anclada.
La incorporación interactiva todavía ofrece especificaciones de npm de registro confiables, incluyendo nombres
de paquetes simples y dist-tags, para compatibilidad. Los diagnósticos del catálogo pueden
distinguir fuentes exactas, flotantes, ancladas por integridad, con integridad faltante, discordancia de nombre de paquete
y fuentes de elección predeterminada no válidas. También advierten cuando
`expectedIntegrity` está presente pero no hay una fuente npm válida que pueda anclar.
Cuando `expectedIntegrity` está presente,
los flujos de instalación/actualización lo hacen cumplir; cuando se omite, la resolución del registro se
registra sin un anclaje de integridad.

Los complementos de canal deben proporcionar `openclaw.setupEntry` cuando el estado, la lista de canales
o los análisis de SecretRef necesitan identificar cuentas configuradas sin cargar el tiempo de ejecución
completo. La entrada de configuración debe exponer los metadatos del canal más adaptadores de configuración,
estado y secretos seguros para la configuración; mantenga los clientes de red, los oyentes de puerta de enlace
y los tiempos de ejecución de transporte en el punto de entrada principal de la extensión.

Los campos del punto de entrada de tiempo de ejecución no anulan las comprobaciones de límites del paquete para los campos
del punto de entrada de origen. Por ejemplo, `openclaw.runtimeExtensions` no puede que una ruta `openclaw.extensions` de escape sea cargable.

`openclaw.install.allowInvalidConfigRecovery` es intencionalmente estrecho. No
hace que las configuraciones rotas arbitrarias sean instalables. Hoy solo permite que los flujos
de instalación se recuperen de fallos específicos de actualización de complementos agrupados obsoletos, tales como una
ruta de complemento agrupado faltante o una entrada `channels.<id>` obsoleta para ese mismo
complemento agrupado. Errores de configuración no relacionados siguen bloqueando la instalación y envían a los operadores
a `openclaw doctor --fix`.

`openclaw.channel.persistedAuthState` son metadatos del paquete para un módulo de verificación
pequeño:

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

Úselo cuando los flujos de configuración, médico o de estado configurado necesiten una sonda de autenticación de sí/no económica
antes de que se cargue el complemento de canal completo. La exportación de destino debe ser una pequeña
función que solo lea el estado persistido; no la enrute a través del barril completo
del tiempo de ejecución del canal.

`openclaw.channel.configuredState` sigue la misma forma para comprobaciones
baratas configuradas solo por entorno:

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
pequeñas entradas no en tiempo de ejecución. Si la comprobación necesita una resolución completa de la configuración o el
tiempo de ejecución real del canal, mantenga esa lógica en el enlace `config.hasConfiguredState`
del complemento en su lugar.

## Precedencia de descubrimiento (ids de complementos duplicados)

OpenClaw descubre complementos desde varias raíces (agrupados, instalación global, espacio de trabajo, rutas seleccionadas explícitamente por configuración). Si dos descubrimientos comparten el mismo `id`, solo se mantiene el manifiesto de **mayor precedencia**; los duplicados de menor precedencia se descartan en lugar de cargarse junto a él.

Precedencia, de mayor a menor:

1. **Seleccionado por configuración** — una ruta fijada explícitamente en `plugins.entries.<id>`
2. **Agrupado** — complementos enviados con OpenClaw
3. **Instalación global** — complementos instalados en la raíz global de complementos de OpenClaw
4. **Espacio de trabajo** — complementos descubiertos en relación con el espacio de trabajo actual

Implicaciones:

- Una copia bifurcada o obsoleta de un complemento agrupado que se encuentre en el espacio de trabajo no eclipsará la compilación agrupada.
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
  deben hacer referencia a ids de complementos **discoverable** (descubribles). Los ids desconocidos son **errores**.
- Si un complemento está instalado pero tiene un manifiesto o esquema roto o faltante,
  la validación falla y Doctor informa el error del complemento.
- Si existe la configuración del complemento pero el complemento está **desactivado**, la configuración se mantiene y
  se muestra una **advertencia** en Doctor + registros.

Consulte [Referencia de configuración](/es/gateway/configuration) para ver el esquema completo de `plugins.*`.

## Notas

- El manifiesto es **obligatorio para los complementos nativos de OpenClaw**, incluidas las cargas del sistema de archivos local. El tiempo de ejecución todavía carga el módulo del complemento por separado; el manifiesto es solo para el descubrimiento y la validación.
- Los manifiestos nativos se analizan con JSON5, por lo que se aceptan comentarios, comas finales y claves sin comillas, siempre que el valor final siga siendo un objeto.
- El cargador de manifiestos solo lee los campos de manifiesto documentados. Evite claves de nivel superior personalizadas.
- `channels`, `providers`, `cliBackends` y `skills` pueden omitirse cuando un complemento no los necesita.
- `providerDiscoveryEntry` debe mantenerse ligero y no debe importar código amplio del tiempo de ejecución; úselo para metadatos de catálogo de proveedores estáticos o descriptores de descubrimiento limitados, no para la ejecución en el momento de la solicitud.
- Los tipos de complementos exclusivos se seleccionan a través de `plugins.slots.*`: `kind: "memory"` a través de `plugins.slots.memory`, `kind: "context-engine"` a través de `plugins.slots.contextEngine` (por defecto `legacy`).
- Los metadatos de variables de entorno (`setup.providers[].envVars`, `providerAuthEnvVars` en desuso y `channelEnvVars`) son solo declarativos. El estado, la auditoría, la validación de entrega de cron y otras superficies de solo lectura aún aplican la confianza del complemento y la política de activación efectiva antes de tratar una variable de entorno como configurada.
- Para obtener metadatos del asistente en tiempo de ejecución que requieren código de proveedor, consulte [Ganchos de tiempo de ejecución del proveedor](/es/plugins/architecture-internals#provider-runtime-hooks).
- Si su complemento depende de módulos nativos, documente los pasos de compilación y los requisitos de la lista de permitidos del administrador de paquetes (por ejemplo, pnpm `allow-build-scripts` + `pnpm rebuild <package>`).

## Relacionado

<CardGroup cols={3}>
  <Card title="Construcción de complementos" href="/es/plugins/building-plugins" icon="rocket">
    Primeros pasos con los complementos.
  </Card>
  <Card title="Arquitectura del complemento" href="/es/plugins/architecture" icon="diagram-project">
    Arquitectura interna y modelo de capacidades.
  </Card>
  <Card title="Resumen del SDK" href="/es/plugins/sdk-overview" icon="book">
    Referencia del SDK de complementos e importaciones de subrutas.
  </Card>
</CardGroup>
