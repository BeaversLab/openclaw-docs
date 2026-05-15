---
summary: "Cómo OpenClaw separa los proveedores de modelos, los modelos, los canales y los runtimes de agentes"
title: "Runtimes de agentes"
read_when:
  - You are choosing between PI, Codex, ACP, or another native agent runtime
  - You are confused by provider/model/runtime labels in status or config
  - You are documenting support parity for a native harness
---

Un **runtime de agente** es el componente que posee un bucle de modelo preparado: recibe el prompt, impulsa la salida del modelo, maneja las llamadas a herramientas nativas y devuelve el turno terminado a OpenClaw.

Es fácil confundir los runtimes con los proveedores porque ambos aparecen cerca de la configuración del modelo. Son capas diferentes:

| Capa              | Ejemplos                              | Qué significa                                                                     |
| ----------------- | ------------------------------------- | --------------------------------------------------------------------------------- |
| Proveedor         | `openai`, `anthropic`, `openai-codex` | Cómo OpenClaw se autentica, descubre modelos y nombra las referencias de modelos. |
| Modelo            | `gpt-5.5`, `claude-opus-4-6`          | El modelo seleccionado para el turno del agente.                                  |
| Runtime de agente | `pi`, `codex`, `claude-cli`           | El bucle o backend de bajo nivel que ejecuta el turno preparado.                  |
| Canal             | Telegram, Discord, Slack, WhatsApp    | Donde los mensajes entran y salen de OpenClaw.                                    |

También verás la palabra **harness** en el código. Un harness es la implementación
que proporciona un runtime de agente. Por ejemplo, el harness Codex incluido
implementa el runtime `codex`. La configuración pública usa `agentRuntime.id` en
entradas de proveedor o modelo; las claves de runtime de agente completo son obsoletas y se ignoran.
`openclaw doctor --fix` elimina los pines antiguos de runtime de agente completo y reescribe
las referencias de modelo de runtime obsoletas a referencias canónicas de proveedor/modelo más políticas de
de runtime con alcance de modelo donde sea necesario.

Hay dos familias de runtimes:

- **Harnesses integrados** se ejecutan dentro del bucle de agente preparado de OpenClaw. Hoy esto
  es el runtime integrado `pi` más harnesses de complementos registrados como
  `codex`.
- **Backends de CLI** ejecutan un proceso de CLI local manteniendo la referencia del modelo
  canónica. Por ejemplo, `anthropic/claude-opus-4-7` con
  un `agentRuntime.id: "claude-cli"` con alcance de modelo significa "seleccionar el modelo de
  Anthropic, ejecutar a través de Claude CLI". `claude-cli` no es un id de harness integrado
  y no se debe pasar a la selección de AgentHarness.

## Superficies de Codex

La mayor confusión proviene de varias superficies diferentes que comparten el nombre Codex:

| Superficie                                                                | Nombre/configuración de OpenClaw              | Lo que hace                                                                                                                                                  |
| ------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Runtime nativo de servidor de aplicaciones de Codex                       | Referencias de modelo `openai/*`              | Ejecuta turnos de agente integrado de OpenAI a través del servidor de aplicaciones Codex. Esta es la configuración de suscripción habitual de ChatGPT/Codex. |
| Perfiles de autenticación OAuth de Codex                                  | Proveedor de autenticación `openai-codex`     | Almacena la autenticación de suscripción ChatGPT/Codex que consume el harness del servidor de aplicaciones Codex.                                            |
| Adaptador de ACP de Codex                                                 | `runtime: "acp"`, `agentId: "codex"`          | Ejecuta Codex a través del plano de control externo ACP/acpx. Úselo solo cuando se solicite explícitamente ACP/acpx.                                         |
| Conjunto de comandos de control de chat nativo de Codex                   | `/codex ...`                                  | Vincula, reanuda, dirige, detiene e inspecciona los hilos del servidor de aplicaciones de Codex desde el chat.                                               |
| Ruta de API de la plataforma OpenAI para superficies que no son de agente | `openai/*` más autenticación con clave de API | Se utiliza para API directas de OpenAI como imágenes, incrustaciones, voz y tiempo real.                                                                     |

Esas superficies son intencionalmente independientes. Habilitar el complemento `codex` hace
que las características nativas del servidor de aplicaciones estén disponibles; `openclaw doctor --fix` posee la reparación
obsoleta de la ruta `openai-codex/*` y la limpieza de pines de sesión obsoletos. Seleccionar
`openai/*` para un modelo de agente ahora significa "ejecutar esto a través de Codex" a menos que se
esté utilizando una superficie de API de OpenAI que no sea de agente.

La configuración común de suscripción ChatGPT/Codex usa Codex OAuth para la autenticación, pero mantiene la referencia del modelo como `openai/*` y selecciona el runtime `codex`:

```json5
{
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
    },
  },
}
```

Eso significa que OpenClaw selecciona una referencia de modelo de OpenAI y luego le pide al runtime del servidor de aplicaciones de Codex que ejecute el turno del agente integrado. No significa "usar la facturación de la API" y tampoco significa que el canal, el catálogo de proveedores de modelos o el almacenamiento de sesiones de OpenClaw se conviertan en Codex.

Cuando el complemento incluido `codex` está habilitado, el control de Codex en lenguaje natural debe usar la superficie de comandos nativa `/codex` (`/codex bind`, `/codex threads`, `/codex resume`, `/codex steer`, `/codex stop`) en lugar de ACP. Use ACP para Codex solo cuando el usuario solicite explícitamente ACP/acpx o esté probando la ruta del adaptador ACP. Claude Code, Gemini CLI, OpenCode, Cursor y arneses externos similares todavía usan ACP.

Este es el árbol de decisión orientado al agente:

1. Si el usuario solicita **Codex bind/control/thread/resume/steer/stop**, use la
   superficie de comandos nativa `/codex` cuando el complemento incluido `codex` esté habilitado.
2. Si el usuario solicita **Codex como el runtime integrado** o desea la experiencia normal del agente Codex respaldada por suscripción, use `openai/<model>`.
3. Si el usuario elige explícitamente **PI para un modelo de OpenAI**, mantenga la referencia del modelo como `openai/<model>` y configure la política de runtime del proveedor/modelo en `agentRuntime.id: "pi"`. Un perfil de autenticación `openai-codex` seleccionado se enruta internamente a través del transporte de autenticación Codex heredado de PI.
4. Si la configuración heredada todavía contiene **referencias de modelo `openai-codex/*`**, repárela a `openai/<model>` con `openclaw doctor --fix`.
5. Si el usuario dice explícitamente **ACP**, **acpx** o **adaptador Codex ACP**, use ACP con `runtime: "acp"` y `agentId: "codex"`.
6. Si la solicitud es para **Claude Code, Gemini CLI, OpenCode, Cursor, Droid u otro arnés externo**, use ACP/acpx, no el runtime del subagente nativo.

| Quiere decir...                                                    | Usar...                                       |
| ------------------------------------------------------------------ | --------------------------------------------- |
| Control de chat/hilo del servidor de aplicaciones de Codex         | `/codex ...` del complemento `codex` incluido |
| Runtime del agente integrado del servidor de aplicaciones de Codex | Referencias de modelo de agente `openai/*`    |
| OpenAI Codex OAuth                                                 | Perfiles de autenticación `openai-codex`      |
| Claude Code u otro arnés externo                                   | ACP/acpx                                      |

Para ver la división del prefijo de la familia OpenAI, consulte [OpenAI](/es/providers/openai) y [Proveedores de modelos](/es/concepts/model-providers). Para ver el contrato de soporte del runtime de Codex, consulte [Runtime del arnés de Codex](/es/plugins/codex-harness-runtime#v1-support-contract).

## Propiedad del runtime

Diferentes runtimes poseen diferentes cantidades del bucle.

| Superficie                               | OpenClaw PI integrado                       | Servidor de aplicaciones de Codex                                                       |
| ---------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------- |
| Propietario del bucle del modelo         | OpenClaw a través del ejecutor integrado PI | Servidor de aplicaciones de Codex                                                       |
| Estado canónico del hilo                 | Transcripción de OpenClaw                   | Hilo de Codex, más espejo de transcripción de OpenClaw                                  |
| Herramientas dinámicas de OpenClaw       | Bucle de herramientas nativo de OpenClaw    | Puentead a través del adaptador Codex                                                   |
| Herramientas nativas de shell y archivos | Ruta PI/OpenClaw                            | Herramientas nativas de Codex, puenteadas a través de ganchos nativos cuando se admiten |
| Motor de contexto                        | Ensamblaje de contexto nativo de OpenClaw   | Proyectos de OpenClaw ensamblan el contexto en el turno de Codex                        |
| Compactación                             | OpenClaw o motor de contexto seleccionado   | Compactación nativa de Codex, con notificaciones de OpenClaw y mantenimiento de espejo  |
| Entrega de canales                       | OpenClaw                                    | OpenClaw                                                                                |

Esta división de propiedad es la regla principal de diseño:

- Si OpenClaw es el propietario de la superficie, OpenClaw puede proporcionar un comportamiento normal de enlace de complementos.
- Si el tiempo de ejecución nativo es el propietario de la superficie, OpenClaw necesita eventos de tiempo de ejecución o ganchos nativos.
- Si el tiempo de ejecución nativo posee el estado canónico del hilo, OpenClaw debe reflejar y proyectar el contexto, no reescribir los internos no admitidos.

## Selección del tiempo de ejecución

OpenClaw elige un tiempo de ejecución integrado después de la resolución del proveedor y el modelo:

1. La política de tiempo de ejecución con alcance de modelo tiene prioridad. Esto puede residir en una entrada de modelo de proveedor configurada o en `agents.defaults.models["provider/model"].agentRuntime` / `agents.list[].models["provider/model"].agentRuntime`.
2. A continuación, la política de tiempo de ejecución con alcance de proveedor en `models.providers.<provider>.agentRuntime`.
3. En el modo `auto`, los tiempos de ejecución de complementos registrados pueden reclamar pares de proveedor/modelo
   compatibles.
4. Si ningún tiempo de ejecución reclama un turno en el modo `auto`, OpenClaw usa PI como el tiempo de ejecución de compatibilidad. Use un ID de tiempo de ejecución explícito cuando la ejecución deba ser estricta.

Se ignoran los pines de tiempo de ejecución de toda la sesión y de todo el agente. Esto incluye `OPENCLAW_AGENT_RUNTIME`, el estado de sesión `agentHarnessId`/`agentRuntimeOverride`, `agents.defaults.agentRuntime` y `agents.list[].agentRuntime`. Ejecute `openclaw doctor --fix` para eliminar la configuración obsoleta del tiempo de ejecución de todo el agente y convertir las referencias de modelo de tiempo de ejecución heredadas donde OpenClaw pueda preservar la intención.

Los tiempos de ejecución de complementos de proveedor/modelo explícitos fallan cerrados. Por ejemplo, `agentRuntime.id: "codex"` en un proveedor o modelo significa Codex o un error claro de selección/tiempo de ejecución; nunca se redirige silenciosamente a PI.

Los alias de backend de CLI son diferentes de los ID de arnés integrados. La forma preferida de Claude CLI es:

```json5
{
  agents: {
    defaults: {
      model: "anthropic/claude-opus-4-7",
      models: {
        "anthropic/claude-opus-4-7": {
          agentRuntime: { id: "claude-cli" },
        },
      },
    },
  },
}
```

Las referencias heredadas como `claude-cli/claude-opus-4-7` siguen siendo compatibles, pero la nueva configuración debe mantener el proveedor/modelo canónico y colocar el backend de ejecución en la política de tiempo de ejecución del proveedor/modelo.

El modo `auto` es intencionalmente conservador para la mayoría de proveedores. Los modelos de agente de OpenAI son la excepción: el runtime no configurado y `auto` ambos se resuelven al arnés de Codex. La configuración explícita del runtime PI sigue siendo una ruta de compatificación opcional para los turnos de agente `openai/*`; cuando se combina con un perfil de autenticación `openai-codex` seleccionado, OpenClaw enruta PI internamente a través del transporte de autenticación heredado de Codex mientras mantiene la referencia del modelo público como `openai/*`. Los pines de sesión de OpenAI PI obsoletos son ignorados por la selección del runtime y se pueden limpiar con `openclaw doctor --fix`.

Si `openclaw doctor` advierte que el complemento `codex` está habilitado mientras `openai-codex/*` permanece en la configuración, trátelo como un estado de ruta heredada. Ejecute `openclaw doctor --fix` para reescribirlo a `openai/*` con el runtime de Codex.

## Contrato de compatibilidad

Cuando un runtime no es PI, debe documentar qué superficies de OpenClaw admite. Utilice este formato para la documentación de runtimes:

| Pregunta                                                  | Por qué es importante                                                                                                            |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| ¿Quién es el propietario del bucle del modelo?            | Determina dónde ocurren los reintentos, la continuación de herramientas y las decisiones de respuesta final.                     |
| ¿Quién es el propietario del historial canónico del hilo? | Determina si OpenClaw puede editar el historial o solo reflejarlo.                                                               |
| ¿Funcionan las herramientas dinámicas de OpenClaw?        | La mensajería, las sesiones, el cron y las herramientas propiedad de OpenClaw dependen de esto.                                  |
| ¿Funcionan los enlaces de herramientas dinámicas?         | Los complementos esperan `before_tool_call`, `after_tool_call` y middleware alrededor de las herramientas propiedad de OpenClaw. |
| ¿Funcionan los enlaces de herramientas nativas?           | Shell, parche y herramientas propiedad del runtime necesitan soporte de enlace nativo para políticas y observación.              |
| ¿Se ejecuta el ciclo de vida del motor de contexto?       | Los complementos de memoria y contexto dependen de los ciclos de vida de ensamblaje, ingesta, después del turno y compactación.  |
| ¿Qué datos de compactación están expuestos?               | Algunos complementos solo necesitan notificaciones, mientras que otros necesitan metadatos mantenidos/eliminados.                |
| ¿Qué no es compatible intencionalmente?                   | Los usuarios no deben asumir equivalencia con PI donde el runtime nativo posee más estado.                                       |

El contrato de soporte del runtime de Codex está documentado en
[Runtime de arnés de Codex](/es/plugins/codex-harness-runtime#v1-support-contract).

## Etiquetas de estado

La salida de estado puede mostrar etiquetas `Execution` y `Runtime`. Léalas como
diagnósticos, no como nombres de proveedor.

- Una referencia de modelo como `openai/gpt-5.5` indica el proveedor/modelo seleccionado.
- Un ID de tiempo de ejecución como `codex` indica qué bucle está ejecutando el turno.
- Una etiqueta de canal como Telegram o Discord indica dónde está ocurriendo la conversación.

Si una ejecución aún muestra un tiempo de ejecución inesperado, inspeccione primero la política de tiempo de ejecución del proveedor/modelo
seleccionado. Los fijos de tiempo de ejecución de sesión heredados ya no deciden el enrutamiento.

## Relacionado

- [Arnés de Codex](/es/plugins/codex-harness)
- [Tiempo de ejecución del arnés de Codex](/es/plugins/codex-harness-runtime)
- [OpenAI](/es/providers/openai)
- [Complementos del arnés de agentes](/es/plugins/sdk-agent-harness)
- [Bucle de agente](/es/concepts/agent-loop)
- [Modelos](/es/concepts/models)
- [Estado](/es/cli/status)
