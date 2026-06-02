---
summary: "Cómo OpenClaw separa los proveedores de modelos, los modelos, los canales y los tiempos de ejecución de los agentes"
title: "Tiempos de ejecución de agentes"
read_when:
  - You are choosing between OpenClaw, Codex, ACP, or another native agent runtime
  - You are confused by provider/model/runtime labels in status or config
  - You are documenting support parity for a native harness
---

Un **runtime de agente** es el componente que posee un bucle de modelo preparado: recibe el prompt, impulsa la salida del modelo, maneja las llamadas a herramientas nativas y devuelve el turno terminado a OpenClaw.

Es fácil confundir los runtimes con los proveedores porque ambos aparecen cerca de la configuración del modelo. Son capas diferentes:

| Capa              | Ejemplos                                     | Qué significa                                                                     |
| ----------------- | -------------------------------------------- | --------------------------------------------------------------------------------- |
| Proveedor         | `openai`, `anthropic`, `github-copilot`      | Cómo OpenClaw se autentica, descubre modelos y nombra las referencias de modelos. |
| Modelo            | `gpt-5.5`, `claude-opus-4-6`                 | El modelo seleccionado para el turno del agente.                                  |
| Runtime de agente | `openclaw`, `codex`, `copilot`, `claude-cli` | El bucle o backend de bajo nivel que ejecuta el turno preparado.                  |
| Canal             | Telegram, Discord, Slack, WhatsApp           | Donde los mensajes entran y salen de OpenClaw.                                    |

También verás la palabra **arnés** en el código. Un arnés es la implementación
que proporciona un tiempo de ejecución de agente. Por ejemplo, el arnés Codex incluido
implementa el tiempo de ejecución `codex`. La configuración pública usa `agentRuntime.id` en
las entradas de proveedor o modelo; las claves de tiempo de ejecución de agente completo son heredadas y se ignoran.
`openclaw doctor --fix` elimina las fijaciones antiguas de tiempo de ejecución de agente completo y reescribe
las referencias de modelo de tiempo de ejecución heredadas a referencias canónicas de proveedor/modelo más políticas de
tiempo de ejecución con ámbito de modelo donde sea necesario.

Hay dos familias de runtimes:

- **Arneses integrados** se ejecutan dentro del bucle de agente preparado de OpenClaw. Hoy esto
  es el tiempo de ejecución `openclaw` incorporado más arneses de complementos registrados como
  `codex` y `copilot`.
- **Backends de CLI** ejecutan un proceso de CLI local manteniendo la referencia del modelo
  canónica. Por ejemplo, `anthropic/claude-opus-4-8` con
  un `agentRuntime.id: "claude-cli"` con ámbito de modelo significa "seleccionar el modelo de Anthropic,
  ejecutar a través de Claude CLI". `claude-cli` no es un id de arnés integrado
  y no debe pasarse a la selección de AgentHarness.

El arnés `copilot` es un arnés de plugin externo opcional y separado para la
CLI de GitHub Copilot; consulte [GitHub Copilot agent runtime](/es/plugins/copilot)
para ver la decisión orientada al usuario entre PI, Codex y el runtime del agente de GitHub Copilot.

## Superficies de Codex

La mayor parte de la confusión proviene de varias superficies diferentes que comparten el nombre Codex:

| Superficie                                                                       | Nombre/configuración de OpenClaw             | Lo que hace                                                                                                                                                    |
| -------------------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tiempo de ejecución del servidor de aplicaciones de Codex nativo                 | Referencias de modelo `openai/*`             | Ejecuta turnos de agente integrado de OpenAI a través del servidor de aplicaciones de Codex. Esta es la configuración habitual de suscripción a ChatGPT/Codex. |
| Perfiles de autenticación OAuth de Codex                                         | Perfiles OAuth de `openai`                   | Almacena la autenticación de suscripción de ChatGPT/Codex que consume el harness del servidor de aplicaciones Codex.                                           |
| Adaptador de Codex ACP                                                           | `runtime: "acp"`, `agentId: "codex"`         | Ejecuta Codex a través del plano de control externo ACP/acpx. Úselo solo cuando se solicite explícitamente ACP/acpx.                                           |
| Conjunto de comandos de control de chat nativo de Codex                          | `/codex ...`                                 | Vincula, reanuda, dirige, detiene e inspecciona los hilos del servidor de aplicaciones Codex desde el chat.                                                    |
| Ruta de la API de la plataforma de OpenAI para superficies que no son de agentes | `openai/*` más autenticación de clave de API | Se utiliza para las API directas de OpenAI, como imágenes, incrustaciones, voz y tiempo real.                                                                  |

Esas superficies son intencionalmente independientes. Habilitar el plugin `codex` hace que
las características nativas del servidor de aplicaciones estén disponibles; `openclaw doctor --fix` posee el
reparo de rutas heredadas de Codex heredadas y la limpieza de pines de sesión obsoletos. Seleccionar
`openai/*` para un modelo de agente ahora significa "ejecutar esto a través de Codex" a menos que se esté
utilizando una superficie de API de OpenAI que no sea de agente.

La configuración común de suscripción ChatGPT/Codex usa Codex OAuth para la autenticación, pero mantiene
la referencia del modelo como `openai/*` y selecciona el runtime `codex`:

```json5
{
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
    },
  },
}
```

Eso significa que OpenClaw selecciona una referencia de modelo de OpenAI y luego le pide al tiempo de ejecución del servidor de aplicaciones Codex que ejecute el turno del agente incrustado. No significa "usar la facturación de la API" y no significa que el canal, el catálogo de proveedores de modelos o el almacén de sesiones de OpenClaw se conviertan en Codex.

Cuando el plugin `codex` incluido está habilitado, el control de Codex en lenguaje natural
debería usar la superficie de comandos nativa `/codex` (`/codex bind`, `/codex threads`,
`/codex resume`, `/codex steer`, `/codex stop`) en lugar de ACP. Use ACP para
Codex solo cuando el usuario solicite explícitamente ACP/acpx o esté probando la ruta del
adaptador ACP. Claude Code, Gemini CLI, OpenCode, Cursor y arneses externos
similares todavía usan ACP.

Este es el árbol de decisiones orientado al agente:

1. Si el usuario solicita **Codex bind/control/thread/resume/steer/stop**, use la
   superficie de comandos nativa `/codex` cuando el plugin `codex` incluido esté habilitado.
2. Si el usuario solicita **Codex como el runtime integrado** o desea la experiencia
   normal del agente Codex respaldada por suscripción, use `openai/<model>`.
3. Si el usuario elige explícitamente **OpenClaw para un modelo de OpenAI**, mantenga la referencia del modelo
   como `openai/<model>` y establezca la política de runtime del proveedor/modelo en
   `agentRuntime.id: "openclaw"`. Un perfil OAuth `openai` seleccionado se enruta
   internamente a través del transporte de autenticación Codex de OpenClaw.
4. Si la configuración heredada todavía contiene **referencias de modelos heredadas de Codex**, repárela a
   `openai/<model>` con `openclaw doctor --fix`; doctor mantiene la ruta de autenticación de Codex
   agregando `agentRuntime.id: "codex"` con ámbito de proveedor/modelo donde la
   antigua referencia del modelo lo implicaba.
   Las referencias de modelos heredadas de **`codex-cli/*`** se reparan a la misma ruta del servidor de aplicaciones `openai/<model>` Codex;
   OpenClaw ya no mantiene un backend CLI de Codex incluido.
5. Si el usuario dice explícitamente **ACP**, **acpx** o **adaptador ACP de Codex**, use
   ACP con `runtime: "acp"` y `agentId: "codex"`.
6. Si la solicitud es para **Claude Code, Gemini CLI, OpenCode, Cursor, Droid u
   otro arnés externo**, use ACP/acpx, no el tiempo de ejecución del subagente nativo.

| Quiere decir...                                                                | Usar...                                       |
| ------------------------------------------------------------------------------ | --------------------------------------------- |
| Control de chat/hilo del servidor de aplicaciones de Codex                     | `/codex ...` del complemento `codex` incluido |
| Tiempo de ejecución del agente integrado del servidor de aplicaciones de Codex | referencias de modelos de agente `openai/*`   |
| OAuth de OpenAI Codex                                                          | perfiles OAuth `openai`                       |
| Claude Code u otro arnés externo                                               | ACP/acpx                                      |

Para ver la división del prefijo de la familia OpenAI, consulte [OpenAI](/es/providers/openai) y
[Model providers](/es/concepts/model-providers). Para ver el contrato de soporte del tiempo de ejecución de Codex,
consulte [Codex harness runtime](/es/plugins/codex-harness-runtime#v1-support-contract).

## Propiedad del tiempo de ejecución

Diferentes tiempos de ejecución poseen diferentes cantidades del bucle.

| Superficie                                  | OpenClaw integrado                                   | Servidor de aplicaciones de Codex                                                             |
| ------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Propietario del bucle de modelo             | OpenClaw a través del ejecutor integrado de OpenClaw | Servidor de aplicaciones de Codex                                                             |
| Estado del hilo canónico                    | Transcripción de OpenClaw                            | Hilo de Codex, más reflejo de la transcripción de OpenClaw                                    |
| Herramientas dinámicas de OpenClaw          | Bucle de herramientas nativo de OpenClaw             | Puenteado a través del adaptador de Codex                                                     |
| Herramientas nativas de shell y de archivos | Ruta de OpenClaw                                     | Herramientas nativas de Codex, puenteadas a través de ganchos nativos cuando sean compatibles |
| Motor de contexto                           | Ensamblaje de contexto nativo de OpenClaw            | Los proyectos de OpenClaw ensamblan el contexto en el turno de Codex                          |
| Compactación                                | OpenClaw o motor de contexto seleccionado            | Compactación nativa de Codex, con notificaciones de OpenClaw y mantenimiento del reflejo      |
| Entrega de canales                          | OpenClaw                                             | OpenClaw                                                                                      |

Esta división de propiedad es la regla de diseño principal:

- Si OpenClaw posee la superficie, OpenClaw puede proporcionar el comportamiento normal de gancho de complemento.
- Si el tiempo de ejecución nativo posee la superficie, OpenClaw necesita eventos de tiempo de ejecución o ganchos nativos.
- Si el tiempo de ejecución nativo posee el estado del hilo canónico, OpenClaw debe reflejar y proyectar el contexto, no reescribir los internos no compatibles.

## Selección del tiempo de ejecución

OpenClaw elige un tiempo de ejecución integrado después de la resolución del proveedor y del modelo:

1. La política de tiempo de ejecución con ámbito de modelo tiene prioridad. Esto puede residir en una entrada de modelo de proveedor
   configurada o en `agents.defaults.models["provider/model"].agentRuntime` /
   `agents.list[].models["provider/model"].agentRuntime`. Un comodín de proveedor
   tal como `agents.defaults.models["vllm/*"].agentRuntime` se aplica después de la política
   exacta del modelo, por lo que los modelos de proveedor descubiertos dinámicamente pueden compartir un
   tiempo de ejecución sin anular las excepciones exactas por modelo.
2. A continuación, la política de tiempo de ejecución con ámbito de proveedor en
   `models.providers.<provider>.agentRuntime`.
3. En el modo `auto`, los tiempos de ejecución de complementos registrados pueden reclamar pares de proveedor/modelo
   compatibles.
4. Si ningún tiempo de ejecución reclama un turno en el modo `auto`, OpenClaw usa `openclaw` como el
   tiempo de ejecución de compatibilidad. Use un ID de tiempo de ejecución explícito cuando la ejecución deba ser
   estricta.

Se ignoran las fijaciones de tiempo de ejecución de toda la sesión y de todo el agente. Esto incluye
`OPENCLAW_AGENT_RUNTIME`, estado de sesión `agentHarnessId`/`agentRuntimeOverride`,
`agents.defaults.agentRuntime` y `agents.list[].agentRuntime`. Ejecute
`openclaw doctor --fix` para eliminar la configuración obsoleta del tiempo de ejecución de todo el agente y convertir
referencias de modelos de tiempo de ejecución heredadas donde OpenClaw pueda conservar la intención.

Los runtimes del complemento de proveedor/modelo explícitos fallan cerrados. Por ejemplo,
`agentRuntime.id: "codex"` en un proveedor o modelo significa Codex o un error
claro de selección/runtime; nunca se redirige silenciosamente de vuelta a OpenClaw.

Los alias del backend de CLI son diferentes de los ids de arneses integrados. La forma
preferida de Claude CLI es:

```json5
{
  agents: {
    defaults: {
      model: "anthropic/claude-opus-4-8",
      models: {
        "anthropic/claude-opus-4-8": {
          agentRuntime: { id: "claude-cli" },
        },
      },
    },
  },
}
```

Las referencias heredadas como `claude-cli/claude-opus-4-7` siguen siendo compatibles
por compatibilidad, pero la nueva configuración debe mantener el proveedor/modelo canónico y colocar
el backend de ejecución en la política de runtime de proveedor/modelo.

Las referencias heredadas `codex-cli/*` son diferentes: doctor las migra a `openai/*` para
que se ejecuten a través del arnés del servidor de aplicaciones de Codex en lugar de preservar un backend
de CLI de Codex.

El modo `auto` es intencionalmente conservador para la mayoría de los proveedores. Los modelos de agente
de OpenAI son la excepción: el runtime no establecido y `auto` ambos se resuelven al arnés
de Codex. La configuración explícita del runtime de OpenClaw sigue siendo una ruta de compatibilidad opcional para
los turnos de agente `openai/*`; cuando se combina con un perfil OAuth `openai` seleccionado,
OpenClaw enruta ese camino internamente a través del transporte Codex-auth mientras
mantiene la referencia pública del modelo como `openai/*`. Los pines obsoletos de sesión de runtime de OpenAI son
ignorados por la selección de runtime y se pueden limpiar con `openclaw doctor --fix`.

Si `openclaw doctor` advierte que el complemento `codex` está habilitado mientras
permanecen referencias de modelo heredadas de Codex en la configuración, trátelo como un estado de ruta heredada. Ejecute
`openclaw doctor --fix` para reescribirlo a `openai/*` con el runtime de Codex.

## Runtime del agente de GitHub Copilot

El complemento externo `@openclaw/copilot` registra un runtime `copilot` opcional
respaldado por la CLI de GitHub Copilot (`@github/copilot-sdk`). Reclama el
proveedor de suscripción canónico `github-copilot` y **nunca** es seleccionado por
`auto`. Participe por modelo o por proveedor a través de `agentRuntime.id`:

```json5
{
  agents: {
    defaults: {
      model: "github-copilot/gpt-5.5",
      models: {
        "github-copilot/gpt-5.5": {
          agentRuntime: { id: "copilot" },
        },
      },
    },
  },
}
```

El harness reclama su proveedor, runtime, clave de sesión de CLI y prefijo de perfil de autenticación en `extensions/copilot/doctor-contract-api.ts`, que `openclaw doctor` carga automáticamente. Para la configuración, autenticación, duplicación de transcripciones, compactación, la superficie de la sonda del doctor y la decisión más amplia de PI vs Codex vs Copilot SDK, consulte [GitHub Copilot agent runtime](/es/plugins/copilot).

## Contrato de compatibilidad

Cuando un tiempo de ejecución no es OpenClaw, debe documentar qué superficies de OpenClaw admite.
Use esta forma para la documentación de tiempos de ejecución:

| Pregunta                                                  | Por qué es importante                                                                                                                      |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| ¿Quién es el propietario del bucle del modelo?            | Determina dónde ocurren los reintentos, la continuación de herramientas y las decisiones de respuesta final.                               |
| ¿Quién es el propietario del historial canónico del hilo? | Determina si OpenClaw puede editar el historial o solo duplicarlo.                                                                         |
| ¿Funcionan las herramientas dinámicas de OpenClaw?        | La mensajería, las sesiones, el cron y las herramientas propiedad de OpenClaw dependen de esto.                                            |
| ¿Funcionan los enlaces (hooks) de herramientas dinámicas? | Los complementos esperan `before_tool_call`, `after_tool_call` y middleware alrededor de las herramientas propiedad de OpenClaw.           |
| ¿Funcionan los enlaces (hooks) de herramientas nativas?   | Shell, patch y las herramientas propiedad del tiempo de ejecución necesitan soporte de enlace nativo para políticas y observaciones.       |
| ¿Se ejecuta el ciclo de vida del motor de contexto?       | Los complementos de memoria y contexto dependen del ciclo de vida de ensamblaje, ingestión, después del turno (after-turn) y compactación. |
| ¿Qué datos de compactación están expuestos?               | Algunos complementos solo necesitan notificaciones, mientras que otros necesitan metadatos conservados/eliminados.                         |
| ¿Qué no es compatible intencionalmente?                   | Los usuarios no deben asumir la equivalencia con OpenClaw donde el tiempo de ejecución nativo posee más estado.                            |

El contrato de soporte del runtime de Codex está documentado en
[Codex harness runtime](/es/plugins/codex-harness-runtime#v1-support-contract).

## Etiquetas de estado

La salida de estado puede mostrar tanto las etiquetas `Execution` como `Runtime`. Léalas como
diagnósticos, no como nombres de proveedores.

- Una referencia de modelo como `openai/gpt-5.5` le indica el proveedor/modelo seleccionado.
- Un id de runtime como `codex` le indica qué bucle está ejecutando el turno.
- Una etiqueta de canal como Telegram o Discord le indica dónde está ocurriendo la conversación.

Si una ejecución aún muestra un tiempo de ejecución inesperado, inspeccione primero la política de tiempo de ejecución del proveedor/modelo seleccionado.
Los anclajes de tiempo de ejecución de sesión heredados ya no deciden el enrutamiento.

## Relacionado

- [Codex harness](/es/plugins/codex-harness)
- [Codex harness runtime](/es/plugins/codex-harness-runtime)
- [GitHub Copilot agent runtime](/es/plugins/copilot)
- [OpenAI](/es/providers/openai)
- [Agent harness plugins](/es/plugins/sdk-agent-harness)
- [Agent loop](/es/concepts/agent-loop)
- [Models](/es/concepts/models)
- [Status](/es/cli/status)
