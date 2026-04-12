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
  sin manifiesto
- Paquete Cursor: `.cursor-plugin/plugin.json`

OpenClaw también detecta automáticamente esos diseños de paquetes, pero no se validan
contra el esquema `openclaw.plugin.json` descrito aquí.

Para paquetes compatibles, OpenClaw actualmente lee los metadatos del paquete más las
raíces de habilidades declaradas, las raíces de comandos de Claude, los valores predeterminados
`settings.json` del paquete Claude,
los valores predeterminados LSP del paquete Claude y los paquetes de ganchos compatibles cuando el diseño coincide
con las expectativas de ejecución de OpenClaw.

Cada complemento nativo de OpenClaw **debe** incluir un archivo `openclaw.plugin.json` en la
**raíz del complemento**. OpenClaw utiliza este manifiesto para validar la configuración
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
- metadatos de alias y habilitación automática que deben resolverse antes de que se cargue el tiempo de ejecución del complemento
- metadatos abreviados de propiedad de familia de modelos que deben activar automáticamente el
  complemento antes de que se cargue el tiempo de ejecución
- instantáneas estáticas de propiedad de capacidades utilizadas para la cableado de compatibilidad agrupada y
  cobertura de contratos
- metadatos de configuración específicos del canal que deben fusionarse en el catálogo y las superficies de
  validación sin cargar el tiempo de ejecución
- sugerencias de la interfaz de usuario de configuración

No lo use para:

- registrar el comportamiento del tiempo de ejecución
- declarar puntos de entrada de código
- metadatos de instalación de npm

Esos elementos deben estar en el código de su complemento y en `package.json`.

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

| Campo                               | Obligatorio | Tipo                             | Lo que significa                                                                                                                                                                                                                                                               |
| ----------------------------------- | ----------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                                | Sí          | `string`                         | Id. canónico del complemento. Este es el id. utilizado en `plugins.entries.<id>`.                                                                                                                                                                                              |
| `configSchema`                      | Sí          | `object`                         | Esquema JSON en línea para la configuración de este complemento.                                                                                                                                                                                                               |
| `enabledByDefault`                  | No          | `true`                           | Marca un complemento empaquetado como habilitado de forma predeterminada. Omítalo o establece cualquier valor que no sea `true` para dejar el complemento deshabilitado de forma predeterminada.                                                                               |
| `legacyPluginIds`                   | No          | `string[]`                       | Ids. heredadas que se normalizan a este id. canónica del complemento.                                                                                                                                                                                                          |
| `autoEnableWhenConfiguredProviders` | No          | `string[]`                       | Ids. de proveedores que deberían habilitar automáticamente este complemento cuando la autenticación, la configuración o las referencias de modelos los mencionen.                                                                                                              |
| `kind`                              | No          | `"memory"` \| `"context-engine"` | Declara un tipo de complemento exclusivo utilizado por `plugins.slots.*`.                                                                                                                                                                                                      |
| `channels`                          | No          | `string[]`                       | Ids. de canales propiedad de este complemento. Se utilizan para el descubrimiento y la validación de la configuración.                                                                                                                                                         |
| `providers`                         | No          | `string[]`                       | Ids. de proveedores propiedad de este complemento.                                                                                                                                                                                                                             |
| `modelSupport`                      | No          | `object`                         | Metadatos abreviados de familia de modelos propiedad del manifiesto utilizados para cargar automáticamente el complemento antes del tiempo de ejecución.                                                                                                                       |
| `cliBackends`                       | No          | `string[]`                       | Ids de backend de inferencia de CLI propiedad de este complemento. Se utiliza para la autoactivación al inicio desde referencias de configuración explícitas.                                                                                                                  |
| `commandAliases`                    | No          | `object[]`                       | Nombres de comandos propiedad de este complemento que deben generar configuración y diagnósticos de CLI con conocimiento del complemento antes de que el tiempo de ejecución se cargue.                                                                                        |
| `providerAuthEnvVars`               | No          | `Record<string, string[]>`       | Metadatos de entorno de autenticación de proveedor económicos que OpenClaw puede inspeccionar sin cargar el código del complemento.                                                                                                                                            |
| `providerAuthAliases`               | No          | `Record<string, string>`         | Ids de proveedores que deben reutilizar otro id de proveedor para la búsqueda de autenticación, por ejemplo, un proveedor de codificación que comparte la clave API del proveedor base y los perfiles de autenticación.                                                        |
| `channelEnvVars`                    | No          | `Record<string, string[]>`       | Metadatos de entorno de canal económicos que OpenClaw puede inspeccionar sin cargar el código del complemento. Úselo para la configuración de canal impulsada por el entorno o superficies de autenticación que los asistentes genéricos de inicio/configuración deberían ver. |
| `providerAuthChoices`               | No          | `object[]`                       | Metadatos económicos de elección de autenticación para selectores de incorporación, resolución de proveedor preferido y cableado simple de indicadores de CLI.                                                                                                                 |
| `contracts`                         | No          | `object`                         | Instantánea estática de capacidades empaquetadas para voz, transcripción en tiempo real, voz en tiempo real, comprensión de medios, generación de imágenes, generación de música, generación de video, obtención web, búsqueda web y propiedad de herramientas.                |
| `channelConfigs`                    | No          | `Record<string, object>`         | Metadatos de configuración de canal propiedad del manifiesto fusionados en las superficies de descubrimiento y validación antes de que el tiempo de ejecución se cargue.                                                                                                       |
| `skills`                            | No          | `string[]`                       | Directorios de habilidades (skills) para cargar, relativos a la raíz del complemento.                                                                                                                                                                                          |
| `name`                              | No          | `string`                         | Nombre legible por humanos del complemento.                                                                                                                                                                                                                                    |
| `description`                       | No          | `string`                         | Resumen breve que se muestra en las superficies del complemento.                                                                                                                                                                                                               |
| `version`                           | No          | `string`                         | Versión del complemento informativa.                                                                                                                                                                                                                                           |
| `uiHints`                           | No          | `Record<string, object>`         | Etiquetas de interfaz de usuario, marcadores de posición e indicaciones de sensibilidad para los campos de configuración.                                                                                                                                                      |

## Referencia de providerAuthChoices

Cada entrada de `providerAuthChoices` describe una opción de incorporación o autenticación.
OpenClaw lee esto antes de que se cargue el tiempo de ejecución del proveedor.

| Campo                 | Obligatorio | Tipo                                            | Lo que significa                                                                                                               |
| --------------------- | ----------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `provider`            | Sí          | `string`                                        | ID del proveedor al que pertenece esta opción.                                                                                 |
| `method`              | Sí          | `string`                                        | ID del método de autenticación al que despachar.                                                                               |
| `choiceId`            | Sí          | `string`                                        | ID estable de opción de autenticación utilizado por los flujos de incorporación y CLI.                                         |
| `choiceLabel`         | No          | `string`                                        | Etiqueta orientada al usuario. Si se omite, OpenClaw recurre a `choiceId`.                                                     |
| `choiceHint`          | No          | `string`                                        | Texto de ayuda breve para el selector.                                                                                         |
| `assistantPriority`   | No          | `number`                                        | Los valores más bajos se ordenan antes en los selectores interactivos impulsados por el asistente.                             |
| `assistantVisibility` | No          | `"visible"` \| `"manual-only"`                  | Ocultar la opción de los selectores del asistente permitiendo aun así la selección manual de CLI.                              |
| `deprecatedChoiceIds` | No          | `string[]`                                      | IDs de opciones heredadas que deben redirigir a los usuarios a esta opción de reemplazo.                                       |
| `groupId`             | No          | `string`                                        | ID de grupo opcional para agrupar opciones relacionadas.                                                                       |
| `groupLabel`          | No          | `string`                                        | Etiqueta orientada al usuario para ese grupo.                                                                                  |
| `groupHint`           | No          | `string`                                        | Texto de ayuda breve para el grupo.                                                                                            |
| `optionKey`           | No          | `string`                                        | Clave de opción interna para flujos de autenticación simples de una sola marca.                                                |
| `cliFlag`             | No          | `string`                                        | Nombre de la marca CLI, como `--openrouter-api-key`.                                                                           |
| `cliOption`           | No          | `string`                                        | Forma completa de la opción CLI, como `--openrouter-api-key <key>`.                                                            |
| `cliDescription`      | No          | `string`                                        | Descripción utilizada en la ayuda de CLI.                                                                                      |
| `onboardingScopes`    | No          | `Array<"text-inference" \| "image-generation">` | En qué superficies de incorporación debe aparecer esta elección. Si se omite, el valor predeterminado es `["text-inference"]`. |

## Referencia de commandAliases

Use `commandAliases` cuando un complemento posee un nombre de comando de tiempo de ejecución que los usuarios pueden poner erróneamente en `plugins.allow` o intentar ejecutar como un comando CLI raíz. OpenClaw usa estos metadatos para diagnósticos sin importar el código de tiempo de ejecución del complemento.

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
| `cliCommand` | No          | `string`          | Comando CLI raíz relacionado para sugerir para operaciones CLI, si existe uno.   |

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
| `label`       | `string`   | Etiqueta del campo orientada al usuario.                   |
| `help`        | `string`   | Texto auxiliar corto.                                      |
| `tags`        | `string[]` | Etiquetas de interfaz de usuario opcionales.               |
| `advanced`    | `boolean`  | Marca el campo como avanzado.                              |
| `sensitive`   | `boolean`  | Marca el campo como secreto o sensible.                    |
| `placeholder` | `string`   | Texto de marcador de posición para entradas de formulario. |

## Referencia de contratos

Use `contracts` solo para metadatos estáticos de propiedad de capacidad que OpenClaw puede leer sin importar el tiempo de ejecución del complemento.

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

| Campo                            | Tipo       | Lo que significa                                                                                            |
| -------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------- |
| `speechProviders`                | `string[]` | IDs de proveedores de voz que posee este complemento.                                                       |
| `realtimeTranscriptionProviders` | `string[]` | IDs de proveedores de transcripción en tiempo real que posee este complemento.                              |
| `realtimeVoiceProviders`         | `string[]` | IDs de proveedores de voz en tiempo real que posee este complemento.                                        |
| `mediaUnderstandingProviders`    | `string[]` | IDs de proveedor de comprensión de medios que posee este complemento.                                       |
| `imageGenerationProviders`       | `string[]` | IDs de proveedor de generación de imágenes que posee este complemento.                                      |
| `videoGenerationProviders`       | `string[]` | IDs de proveedor de generación de video que posee este complemento.                                         |
| `webFetchProviders`              | `string[]` | IDs de proveedor de recuperación web que posee este complemento.                                            |
| `webSearchProviders`             | `string[]` | IDs de proveedor de búsqueda web que posee este complemento.                                                |
| `tools`                          | `string[]` | Nombres de herramientas de agente que posee este complemento para comprobaciones de contratos empaquetados. |

## referencia de channelConfigs

Use `channelConfigs` cuando un complemento de canal necesite metadatos de configuración económicos antes de
cargar el tiempo de ejecución.

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

| Campo         | Tipo                     | Lo que significa                                                                                                                       |
| ------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `schema`      | `object`                 | Esquema JSON para `channels.<id>`. Obligatorio para cada entrada de configuración de canal declarada.                                  |
| `uiHints`     | `Record<string, object>` | Etiquetas de IU, marcadores de posición o sugerencias sensibles opcionales para esa sección de configuración de canal.                 |
| `label`       | `string`                 | Etiqueta de canal fusionada en las superficies del selector e inspección cuando los metadatos del tiempo de ejecución no están listos. |
| `description` | `string`                 | Descripción breve del canal para las superficies de inspección y catálogo.                                                             |
| `preferOver`  | `string[]`               | IDs de complementos heredados o de menor prioridad que este canal debe superar en las superficies de selección.                        |

## referencia de modelSupport

Use `modelSupport` cuando OpenClaw deba inferir su complemento de proveedor a partir de
IDs de modelo abreviados como `gpt-5.4` o `claude-sonnet-4.6` antes de que se cargue el tiempo de ejecución del complemento.

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
- `modelPatterns` superan a `modelPrefixes`
- si un complemento no empaquetado y un complemento empaquetado coinciden ambos, gana el complemento
  no empaquetado
- la ambigüedad restante se ignora hasta que el usuario o la configuración especifica un proveedor

Campos:

| Campo           | Tipo       | Lo que significa                                                                                               |
| --------------- | ---------- | -------------------------------------------------------------------------------------------------------------- |
| `modelPrefixes` | `string[]` | Prefijos coincidentes con `startsWith` contra IDs de modelos abreviados.                                       |
| `modelPatterns` | `string[]` | Fuentes de Regex coincidentes contra IDs de modelos abreviados después de la eliminación del sufijo de perfil. |

Las claves de capacidades de nivel superior heredadas están obsoletas. Use `openclaw doctor --fix` para
mover `speechProviders`, `realtimeTranscriptionProviders`,
`realtimeVoiceProviders`, `mediaUnderstandingProviders`,
`imageGenerationProviders`, `videoGenerationProviders`,
`webFetchProviders` y `webSearchProviders` bajo `contracts`; la carga
normal del manifiesto ya no trata esos campos de nivel superior como propiedad
de capacidades.

## Manifiesto frente a package.

Los dos archivos sirven para diferentes trabajos:

| Archivo                | Úselo para                                                                                                                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw.plugin.json` | Descubrimiento, validación de configuración, metadatos de elección de autenticación e indicaciones de interfaz de usuario que deben existir antes de que se ejecute el código del complemento |
| `package.json`         | metadatos de npm, instalación de dependencias y el bloque `openclaw` utilizado para puntos de entrada, control de instalación, configuración o metadatos del catálogo                         |

Si no está seguro de dónde pertenece un metadato, use esta regla:

- si OpenClaw debe saberlo antes de cargar el código del complemento, póngalo en `openclaw.plugin.json`
- si se trata del empaquetado, archivos de entrada o el comportamiento de instalación de npm, póngalo en `package.json`

### campos de package. que afectan el descubrimiento

Algunos metadatos de complementos previos a la ejecución residen intencionalmente en `package.json` bajo el
bloque `openclaw` en lugar de `openclaw.plugin.json`.

Ejemplos importantes:

| Campo                                                             | Lo que significa                                                                                                                                                                |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw.extensions`                                             | Declara puntos de entrada de complementos nativos.                                                                                                                              |
| `openclaw.setupEntry`                                             | Punto de entrada ligero solo de configuración utilizado durante la incorporación y el inicio diferido del canal.                                                                |
| `openclaw.channel`                                                | Metadatos económicos del catálogo de canales como etiquetas, rutas de documentos, alias y texto de selección.                                                                   |
| `openclaw.channel.configuredState`                                | Metadatos del verificador de estado configurado ligero que puede responder "¿ya existe la configuración solo de entorno?" sin cargar el tiempo de ejecución completo del canal. |
| `openclaw.channel.persistedAuthState`                             | Metadatos del verificador de autenticación persistida ligero que puede responder "¿ya hay algo iniciado sesión?" sin cargar el tiempo de ejecución completo del canal.          |
| `openclaw.install.npmSpec` / `openclaw.install.localPath`         | Sugerencias de instalación/actualización para complementos agrupados y publicados externamente.                                                                                 |
| `openclaw.install.defaultChoice`                                  | Ruta de instalación preferida cuando hay múltiples fuentes de instalación disponibles.                                                                                          |
| `openclaw.install.minHostVersion`                                 | Versión mínima compatible del host OpenClaw, utilizando un límite semver como `>=2026.3.22`.                                                                                    |
| `openclaw.install.allowInvalidConfigRecovery`                     | Permite una ruta de recuperación de reinstalación de complemento agrupado estrecha cuando la configuración no es válida.                                                        |
| `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` | Permite que las superficies del canal de solo configuración se carguen antes que el complemento del canal completo durante el inicio.                                           |

`openclaw.install.minHostVersion` se aplica durante la instalación y la carga
del registro de manifiestos. Los valores no válidos se rechazan; los valores más nuevos pero válidos omiten el
complemento en hosts más antiguos.

`openclaw.install.allowInvalidConfigRecovery` es intencionalmente estrecho. No
hace que las configuraciones rotas arbitrarias sean instalables. Hoy solo permite que los flujos de
instalación se recuperen de fallas específicas de actualización de complementos agrupados obsoletos, como una
ruta de complemento agrupado faltante o una entrada `channels.<id>` obsoleta para ese mismo
complemento agrupado. Errores de configuración no relacionados aún bloquean la instalación y envían a los operadores
a `openclaw doctor --fix`.

`openclaw.channel.persistedAuthState` son metadatos de paquete para un pequeño módulo
de verificador:

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

Úselo cuando los flujos de configuración, doctor o estado configurado necesiten una prueba de autenticación sí/no barata antes de que se cargue el complemento del canal completo. La exportación de destino debe ser una pequeña función que solo lea el estado persistido; no la enrute a través del barril completo del tiempo de ejecución del canal.

`openclaw.channel.configuredState` sigue la misma forma para verificaciones de estado configurado solo de entorno baratas:

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

Úselo cuando un canal pueda responder el estado configurado desde el entorno u otras pequeñas entradas que no son de tiempo de ejecución. Si la verificación necesita una resolución completa de la configuración o el tiempo de ejecución real del canal, mantenga esa lógica en el enlace `config.hasConfiguredState`
del complemento en su lugar.

## Requisitos del esquema JSON

- **Cada complemento debe incluir un esquema JSON**, incluso si no acepta ninguna configuración.
- Un esquema vacío es aceptable (por ejemplo, `{ "type": "object", "additionalProperties": false }`).
- Los esquemas se validan en el momento de lectura/escritura de la configuración, no en tiempo de ejecución.

## Comportamiento de validación

- Las claves `channels.*` desconocidas son **errores**, a menos que el id del canal sea declarado por
  un manifiesto de complemento.
- `plugins.entries.<id>`, `plugins.allow`, `plugins.deny` y `plugins.slots.*`
  deben hacer referencia a ids de complementos **detectables**. Los ids desconocidos son **errores**.
- Si un complemento está instalado pero tiene un manifiesto o esquema roto o faltante,
  la validación falla y Doctor informa el error del complemento.
- Si existe la configuración del complemento pero el complemento está **deshabilitado**, la configuración se mantiene y
  se muestra una **advertencia** en Doctor + registros.

Consulte [Referencia de configuración](/en/gateway/configuration) para obtener el esquema completo de `plugins.*`.

## Notas

- El manifiesto es **obligatorio para los complementos nativos de OpenClaw**, incluidas las cargas del sistema de archivos local.
- El tiempo de ejecución todavía carga el módulo del complemento por separado; el manifiesto es solo para
  detección + validación.
- Los manifiestos nativos se analizan con JSON5, por lo que se aceptan comentarios, comas finales y
  claves sin comillas siempre que el valor final siga siendo un objeto.
- Solo el cargador de manifiestos lee los campos de manifiesto documentados. Evite agregar
  claves personalizadas de nivel superior aquí.
- `providerAuthEnvVars` es la ruta de metadatos económica para sondas de autenticación, validación de marcadores de entorno
  y superficies similares de autenticación de proveedores que no deben iniciar el tiempo de ejecución del complemento
  solo para inspeccionar los nombres de entorno.
- `providerAuthAliases` permite que las variantes del proveedor reutilicen las variables de entorno de autenticación, perfiles de autenticación,
  autenticación respaldada por configuración y la elección de incorporación de clave API de otro proveedor
  sin codificar esa relación en el núcleo.
- `channelEnvVars` es la ruta de metadatos económica para la alternativa de entorno de shell, indicaciones de configuración
  y superficies de canal similares que no deben iniciar el tiempo de ejecución del complemento
  solo para inspeccionar los nombres de entorno.
- `providerAuthChoices` es la ruta de metadatos económicos para selectores de elección de autenticación, resolución de `--auth-choice`, mapeo de proveedor preferido e incorporación simple registro de banderas CLI antes de que se cargue el tiempo de ejecución del proveedor. Para metadatos de asistentes de tiempo de ejecución que requieren código de proveedor, consulte [Provider runtime hooks](/en/plugins/architecture#provider-runtime-hooks).
- Los tipos de complementos exclusivos se seleccionan a través de `plugins.slots.*`.
  - `kind: "memory"` es seleccionado por `plugins.slots.memory`.
  - `kind: "context-engine"` es seleccionado por `plugins.slots.contextEngine`
    (predeterminado: integrado `legacy`).
- `channels`, `providers`, `cliBackends` y `skills` se pueden omitir cuando un
  complemento no los necesita.
- Si su complemento depende de módulos nativos, documente los pasos de compilación y cualquier
  requisito de lista blanca del administrador de paquetes (por ejemplo, pnpm `allow-build-scripts`
  - `pnpm rebuild <package>`).

## Relacionado

- [Building Plugins](/en/plugins/building-plugins) — primeros pasos con complementos
- [Plugin Architecture](/en/plugins/architecture) — arquitectura interna
- [SDK Overview](/en/plugins/sdk-overview) — referencia del SDK de complementos
