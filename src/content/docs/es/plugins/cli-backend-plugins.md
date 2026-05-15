---
summary: "Construir un complemento que registre un backend de IA local de CLI"
title: "Construyendo complementos de backend de CLI"
sidebarTitle: "Complementos de backend de CLI"
read_when:
  - You are building a local AI CLI backend plugin
  - You want to register a backend for model refs such as acme-cli/model
  - You need to map a third-party CLI into OpenClaw's text fallback runner
---

Los complementos de backend de CLI permiten que OpenClaw invoque una CLI de IA local como backend de inferencia de texto. El backend aparece como un prefijo de proveedor en las referencias de modelos:

```text
acme-cli/acme-large
```

Use un backend de CLI cuando la integración ascendente ya esté expuesta como un comando local, cuando la CLI posea el estado de inicio de sesión local, o cuando la CLI sea una alternativa útil si los proveedores de API no están disponibles.

<Info>Si el servicio ascendente expone una API de modelo HTTP normal, escriba un [complemento de proveedor](/es/plugins/sdk-provider-plugins) en su lugar. Si el tiempo de ejecución ascendente posee sesiones completas de agentes, eventos de herramientas, compactación o estado de tareas en segundo plano, use un [arnés de agentes](/es/plugins/sdk-agent-harness).</Info>

## Lo que posee el complemento

Un complemento de backend de CLI tiene tres contratos:

| Contrato                        | Archivo                | Propósito                                                                         |
| ------------------------------- | ---------------------- | --------------------------------------------------------------------------------- |
| Entrada del paquete             | `package.json`         | Apunta OpenClaw al módulo de tiempo de ejecución del complemento                  |
| Propiedad del manifiesto        | `openclaw.plugin.json` | Declara el ID del backend antes de que se cargue el tiempo de ejecución           |
| Registro en tiempo de ejecución | `index.ts`             | Llama a `api.registerCliBackend(...)` con los valores predeterminados del comando |

El manifiesto son metadatos de descubrimiento. No ejecuta la CLI y no
registra el comportamiento del tiempo de ejecución. El comportamiento del tiempo de ejecución comienza cuando la entrada del complemento llama
a `api.registerCliBackend(...)`.

## Complemento de backend mínimo

<Steps>
  <Step title="Crear metadatos del paquete">
    ```json package.json
    {
      "name": "@acme/openclaw-acme-cli",
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
      },
      "dependencies": {
        "openclaw": "^2026.3.24"
      },
      "devDependencies": {
        "typescript": "^5.9.0"
      }
    }
    ```

    Los paquetes publicados deben incluir los archivos de tiempo de ejecución de JavaScript compilados. Si su entrada de origen es `./src/index.ts`, agregue `openclaw.runtimeExtensions` que apunte al par JavaScript compilado. Consulte [Puntos de entrada](/es/plugins/sdk-entrypoints).

  </Step>

  <Step title="Declarar la propiedad del backend">
    ```json openclaw.plugin.json
    {
      "id": "acme-cli",
      "name": "Acme CLI",
      "description": "Run Acme's local AI CLI through OpenClaw",
      "cliBackends": ["acme-cli"],
      "setup": {
        "cliBackends": ["acme-cli"],
        "requiresRuntime": false
      },
      "activation": {
        "onStartup": false
      },
      "configSchema": {
        "type": "object",
        "additionalProperties": false
      }
    }
    ```

    `cliBackends` es la lista de propiedad del tiempo de ejecución. Permite a OpenClaw cargar automáticamente el
    complemento cuando la configuración o la selección de modelo menciona `acme-cli/...`.

    `setup.cliBackends` es la superficie de configuración basada primero en descriptores. Agréguelo cuando
    el descubrimiento de modelos, la incorporación o el estado deben reconocer el backend sin
    cargar el tiempo de ejecución del complemento. Use `requiresRuntime: false` solo cuando esos descriptores
    estáticos sean suficientes para la configuración.

  </Step>

  <Step title="Registrar el backend">
    ```typescript index.ts
    import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
    import {
      CLI_FRESH_WATCHDOG_DEFAULTS,
      CLI_RESUME_WATCHDOG_DEFAULTS,
      type CliBackendPlugin,
    } from "openclaw/plugin-sdk/cli-backend";

    function buildAcmeCliBackend(): CliBackendPlugin {
      return {
        id: "acme-cli",
        liveTest: {
          defaultModelRef: "acme-cli/acme-large",
          defaultImageProbe: false,
          defaultMcpProbe: false,
          docker: {
            npmPackage: "@acme/acme-cli",
            binaryName: "acme",
          },
        },
        config: {
          command: "acme",
          args: ["chat", "--json"],
          output: "json",
          input: "stdin",
          modelArg: "--model",
          sessionArg: "--session",
          sessionMode: "existing",
          sessionIdFields: ["session_id", "conversation_id"],
          systemPromptFileArg: "--system-file",
          systemPromptWhen: "first",
          imageArg: "--image",
          imageMode: "repeat",
          reliability: {
            watchdog: {
              fresh: { ...CLI_FRESH_WATCHDOG_DEFAULTS },
              resume: { ...CLI_RESUME_WATCHDOG_DEFAULTS },
            },
          },
          serialize: true,
        },
      };
    }

    export default definePluginEntry({
      id: "acme-cli",
      name: "Acme CLI",
      description: "Run Acme's local AI CLI through OpenClaw",
      register(api) {
        api.registerCliBackend(buildAcmeCliBackend());
      },
    });
    ```

    El id del backend debe coincidir con la entrada del manifiesto `cliBackends`. El `config` registrado
    es solo el predeterminado; la configuración del usuario en
    `agents.defaults.cliBackends.acme-cli` se fusiona sobre este en tiempo de ejecución.

  </Step>
</Steps>

## Forma de la configuración

`CliBackendConfig` describe cómo OpenClaw debe iniciar y analizar la CLI:

| Campo                                     | Uso                                                             |
| ----------------------------------------- | --------------------------------------------------------------- |
| `command`                                 | Nombre del binario o ruta de comando absoluta                   |
| `args`                                    | Base argv para ejecuciones nuevas                               |
| `resumeArgs`                              | argv alternativo para sesiones reanudadas; admite `{sessionId}` |
| `output` / `resumeOutput`                 | Analizador: `json`, `jsonl` o `text`                            |
| `input`                                   | Transporte del prompt: `arg` o `stdin`                          |
| `modelArg`                                | Flag usada antes del id del modelo                              |
| `modelAliases`                            | Mapear ids de modelos de OpenClaw a ids nativos de CLI          |
| `sessionArg` / `sessionArgs`              | Cómo pasar un id de sesión                                      |
| `sessionMode`                             | `always`, `existing` o `none`                                   |
| `sessionIdFields`                         | Campos JSON que OpenClaw lee de la salida de la CLI             |
| `systemPromptArg` / `systemPromptFileArg` | Transporte del prompt del sistema                               |
| `systemPromptWhen`                        | `first`, `always` o `never`                                     |
| `imageArg` / `imageMode`                  | Soporte de ruta de imagen                                       |
| `serialize`                               | Mantener las ejecuciones del mismo backend ordenadas            |
| `reliability.watchdog`                    | Ajuste del tiempo de espera sin salida                          |

Prefiera la configuración estática más pequeña que coincida con la CLI. Agregue devoluciones de llamada del complemento
solo para el comportamiento que realmente pertenezca al backend.

## Ganchos avanzados del backend

`CliBackendPlugin` también puede definir:

| Gancho (Hook)                      | Uso                                                                                 |
| ---------------------------------- | ----------------------------------------------------------------------------------- |
| `normalizeConfig(config, context)` | Reescribir la configuración de usuario heredada después de la fusión                |
| `resolveExecutionArgs(ctx)`        | Agregar indicadores con ámbito de solicitud, como el esfuerzo de pensamiento        |
| `prepareExecution(ctx)`            | Crear puentes de autenticación o configuración temporales antes del lanzamiento     |
| `transformSystemPrompt(ctx)`       | Aplicar una transformación final del prompt del sistema específica de la CLI        |
| `textTransforms`                   | Reemplazos bidireccionales de prompt/salida                                         |
| `defaultAuthProfileId`             | Preferir un perfil de autenticación específico de OpenClaw                          |
| `authEpochMode`                    | Decidir cómo los cambios de autenticación invalidan las sesiones de CLI almacenadas |
| `nativeToolMode`                   | Declarar si la CLI tiene herramientas nativas siempre activas                       |
| `bundleMcp` / `bundleMcpMode`      | Optar por el puente de herramientas MCP de bucle de retorno de OpenClaw             |

Mantenga estos ganchos bajo la propiedad del proveedor. No agregue ramas específicas de la CLI al núcleo cuando un gancho de backend pueda expresar el comportamiento.

## Puente de herramientas MCP

Los backends de CLI no reciben las herramientas de OpenClaw de manera predeterminada. Si la CLI puede consumir una configuración de MCP, opte explícitamente:

```typescript
return {
  id: "acme-cli",
  bundleMcp: true,
  bundleMcpMode: "codex-config-overrides",
  config: {
    command: "acme",
    args: ["chat", "--json"],
    output: "json",
  },
};
```

Los modos de puente compatibles son:

| Modo                     | Uso                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------- |
| `claude-config-file`     | CLIs que aceptan un archivo de configuración MCP                                      |
| `codex-config-overrides` | CLIs que aceptan anulaciones de configuración en argv                                 |
| `gemini-system-settings` | CLI que leen la configuración de MCP desde su directorio de configuración del sistema |

Habilite el puente solo cuando la CLI pueda consumirlo realmente. Si la CLI tiene su propia capa de herramientas integrada que no se puede deshabilitar, configure `nativeToolMode:
"always-on"` para que OpenClaw pueda fallar de forma cerrada cuando una llamada requiera que no haya herramientas nativas.

## Configuración de usuario

Los usuarios pueden anular cualquier valor predeterminado del backend:

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "acme-cli": {
          command: "/opt/acme/bin/acme",
          args: ["chat", "--json", "--profile", "work"],
          modelAliases: {
            large: "acme-large-2026",
          },
        },
      },
      model: {
        primary: "openai/gpt-5.5",
        fallbacks: ["acme-cli/large"],
      },
    },
  },
}
```

Documente la invalidación mínima que los usuarios probablemente necesiten. Por lo general, esa es solo `command` cuando el binario está fuera de `PATH`.

## Verificación

Para los complementos incluidos, agregue una prueba enfocada alrededor del constructor y el registro de configuración, luego ejecute el carril de prueba específico del complemento:

```bash
pnpm test extensions/acme-cli
```

Para complementos locales o instalados, verifique el descubrimiento y una ejecución real del modelo:

```bash
openclaw plugins inspect acme-cli --runtime --json
openclaw agent --message "reply exactly: backend ok" --model acme-cli/acme-large
```

Si el backend admite imágenes o MCP, agregue una prueba de humo en vivo que demuestre esas rutas con el CLI real. No confíe en la inspección estática para el comportamiento de prompt, imagen, MCP o reanudación de sesión.

## Lista de verificación

<Check>`package.json` tiene `openclaw.extensions` y entradas de tiempo de ejecución compiladas para paquetes publicados</Check>
<Check>`openclaw.plugin.json` declara `cliBackends` e `activation.onStartup` intencional</Check>
<Check>`setup.cliBackends` está presente cuando la configuración/descubrimiento del modelo debe ver el backend en frío</Check>
<Check>`api.registerCliBackend(...)` usa el mismo id de backend que el manifiesto</Check>
<Check>Las invalidaciones del usuario bajo `agents.defaults.cliBackends.<id>` aún tienen prioridad</Check>
<Check>La configuración de sesión, prompt del sistema, imagen y analizador de salida coincide con el contrato real del CLI</Check>
<Check>Las pruebas específicas y al menos una prueba de humo del CLI en vivo demuestran la ruta del backend</Check>

## Relacionado

- [Backends de CLI](/es/gateway/cli-backends) - configuración de usuario y comportamiento en tiempo de ejecución
- [Construcción de complementos](/es/plugins/building-plugins) - conceptos básicos de paquete y manifiesto
- [Resumen del SDK de complementos](/es/plugins/sdk-overview) - referencia de API de registro
- [Manifiesto del complemento](/es/plugins/manifest) - `cliBackends` y descriptores de configuración
- [Arnés de agentes](/es/plugins/sdk-agent-harness) - tiempos de ejecución de agentes externos completos
