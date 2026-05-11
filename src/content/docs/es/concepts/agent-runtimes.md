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

También verás la palabra **harness** (arnés) en el código. Un harness es la implementación que proporciona un runtime de agente. Por ejemplo, el harness Codex incluido implementa el runtime `codex`. La configuración pública usa `agentRuntime.id`; `openclaw
doctor --fix` reescribe las claves de políticas de runtime más antiguas a ese formato.

Hay dos familias de runtimes:

- **Harnesses integrados** se ejecutan dentro del bucle de agente preparado de OpenClaw. Hoy en día este es el runtime integrado `pi` más los harnesses de complementos registrados como `codex`.
- **Backends de CLI** ejecutan un proceso de CLI local manteniendo la referencia del modelo canónica. Por ejemplo, `anthropic/claude-opus-4-7` con `agentRuntime.id: "claude-cli"` significa "seleccionar el modelo de Anthropic, ejecutar a través de Claude CLI". `claude-cli` no es un id de harness integrado y no debe pasarse a la selección de AgentHarness.

## Tres cosas llamadas Codex

La mayor confusión proviene de tres superficies diferentes que comparten el nombre Codex:

| Superficie                                                           | Nombre/configuración de OpenClaw       | Lo que hace                                                                                                                   |
| -------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Ruta del proveedor OAuth de Codex                                    | Referencias de modelo `openai-codex/*` | Usa la suscripción OAuth de ChatGPT/Codex a través del ejecutor normal de OpenClaw PI.                                        |
| Runtime del servidor de aplicaciones nativo de Codex                 | `agentRuntime.id: "codex"`             | Ejecuta el turno del agente incrustado a través del arnés del servidor de aplicaciones de Codex incluido.                     |
| Adaptador de ACP de Codex                                            | `runtime: "acp"`, `agentId: "codex"`   | Ejecuta Codex a través del plano de control externo ACP/acpx. Úselo solo cuando se solicite explícitamente ACP/acpx.          |
| Conjunto de comandos de control de chat nativo de Codex              | `/codex ...`                           | Vincula, reanuda, dirige, detiene e inspecciona los hilos del servidor de aplicaciones de Codex desde el chat.                |
| Ruta de la API de la plataforma OpenAI para modelos estilo GPT/Codex | Referencias de modelos `openai/*`      | Usa autenticación por clave de API de OpenAI a menos que una anulación de runtime, como `runtime: "codex"`, ejecute el turno. |

Esas superficies son intencionalmente independientes. Habilitar el complemento `codex` pone a disposición las funciones del servidor de aplicaciones nativo; no reescribe `openai-codex/*` en `openai/*`, no cambia las sesiones existentes y no hace que ACP sea el valor predeterminado de Codex. Seleccionar `openai-codex/*` significa "usar la ruta del proveedor OAuth de Codex" a menos que fuerce un runtime por separado.

La configuración común de Codex usa el proveedor `openai` con el runtime `codex`:

```json5
{
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
      agentRuntime: {
        id: "codex",
      },
    },
  },
}
```

Eso significa que OpenClaw selecciona una referencia de modelo de OpenAI y luego le pide al runtime del servidor de aplicaciones de Codex que ejecute el turno del agente incrustado. No significa que el canal, el catálogo de proveedores de modelos o el almacén de sesiones de OpenClaw se conviertan en Codex.

Cuando el complemento incluido `codex` está habilitado, el control de Codex en lenguaje natural debe usar la superficie de comandos nativa `/codex` (`/codex bind`, `/codex threads`, `/codex resume`, `/codex steer`, `/codex stop`) en lugar de ACP. Use ACP para Codex solo cuando el usuario solicite explícitamente ACP/acpx o esté probando la ruta del adaptador ACP. Claude Code, Gemini CLI, OpenCode, Cursor y arneses externos similares todavía usan ACP.

Este es el árbol de decisión orientado al agente:

1. Si el usuario solicita **Codex bind/control/thread/resume/steer/stop**, use la
   superficie de comandos nativa `/codex` cuando el complemento incluido `codex` esté habilitado.
2. Si el usuario solicita **Codex como el tiempo de ejecución integrado**, use
   `openai/<model>` con `agentRuntime.id: "codex"`.
3. Si el usuario solicita **Codex OAuth/subscription auth en el ejecutor normal de OpenClaw**, use `openai-codex/<model>` y deje el tiempo de ejecución como PI.
4. Si el usuario dice explícitamente **ACP**, **acpx**, o **adaptador ACP de Codex**, use
   ACP con `runtime: "acp"` y `agentId: "codex"`.
5. Si la solicitud es para **Claude Code, Gemini CLI, OpenCode, Cursor, Droid, u
   otro arnés externo**, use ACP/acpx, no el tiempo de ejecución del subagente nativo.

| Quiere decir...                                                                | Use...                                        |
| ------------------------------------------------------------------------------ | --------------------------------------------- |
| Control de chat/hilo del servidor de aplicaciones de Codex                     | `/codex ...` del complemento incluido `codex` |
| Tiempo de ejecución del agente integrado del servidor de aplicaciones de Codex | `agentRuntime.id: "codex"`                    |
| OpenAI Codex OAuth en el ejecutor PI                                           | Referencias de modelo `openai-codex/*`        |
| Claude Code u otro arnés externo                                               | ACP/acpx                                      |

Para la división del prefijo de la familia OpenAI, consulte [OpenAI](/es/providers/openai) y
[Proveedores de modelos](/es/concepts/model-providers). Para el contrato de soporte del tiempo de ejecución de Codex, consulte [Arnés de Codex](/es/plugins/codex-harness#v1-support-contract).

## Propiedad del tiempo de ejecución

Diferentes tiempos de ejecución poseen diferentes cantidades del bucle.

| Superficie                               | OpenClaw PI integrado                       | Servidor de aplicaciones de Codex                                                       |
| ---------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------- |
| Propietario del bucle de modelo          | OpenClaw a través del ejecutor integrado PI | Servidor de aplicaciones de Codex                                                       |
| Estado canónico del hilo                 | Transcripción de OpenClaw                   | Hilo de Codex, más espejo de transcripción de OpenClaw                                  |
| Herramientas dinámicas de OpenClaw       | Bucle de herramientas nativo de OpenClaw    | Puenteadas a través del adaptador de Codex                                              |
| Herramientas nativas de shell y archivos | Ruta PI/OpenClaw                            | Herramientas nativas de Codex, puenteadas a través de ganchos nativos cuando se admiten |
| Motor de contexto                        | Ensamblaje de contexto nativo de OpenClaw   | Proyectos de OpenClaw ensamblan el contexto en el turno de Codex                        |
| Compactación                             | OpenClaw o motor de contexto seleccionado   | Compactación nativa de Codex, con notificaciones de OpenClaw y mantenimiento del espejo |
| Entrega de canal                         | OpenClaw                                    | OpenClaw                                                                                |

Esta división de propiedad es la principal regla de diseño:

- Si OpenClaw es propietario de la superficie, OpenClaw puede proporcionar el comportamiento normal de enlace de complemento.
- Si el tiempo de ejecución nativo es propietario de la superficie, OpenClaw necesita eventos de tiempo de ejecución o enlaces nativos.
- Si el tiempo de ejecución nativo es propietario del estado canónico del hilo, OpenClaw debe reflejar y proyectar el contexto, no reescribir los elementos internos no compatibles.

## Selección del tiempo de ejecución

OpenClaw elige un tiempo de ejecución integrado después de la resolución del proveedor y del modelo:

1. El tiempo de ejecución registrado de una sesión gana. Los cambios de configuración no cambian en caliente
   una transcripción existente a un sistema de hilos nativo diferente.
2. `OPENCLAW_AGENT_RUNTIME=<id>` fuerza ese tiempo de ejecución para sesiones nuevas o restablecidas.
3. `agents.defaults.agentRuntime.id` o `agents.list[].agentRuntime.id` pueden establecer
   `auto`, `pi`, un id de arnés integrado registrado como `codex`, o un
   alias de backend de CLI compatible como `claude-cli`.
4. En el modo `auto`, los tiempos de ejecución de complementos registrados pueden reclamar pares de proveedor/modelo
   compatibles.
5. Si ningún tiempo de ejecución reclama un turno en el modo `auto` y `fallback: "pi"` está establecido
   (predeterminado), OpenClaw usa PI como respaldo de compatibilidad. Establezca
   `fallback: "none"` para hacer que la selección del modo `auto` no coincidente falle en su lugar.

Los tiempos de ejecución explícitos de complementos fallan cerrados de forma predeterminada. Por ejemplo,
`runtime: "codex"` significa Codex o un error de selección claro a menos que establezca
`fallback: "pi"` en el mismo ámbito de anulación. Una anulación de tiempo de ejecución no hereda
una configuración de respaldo más amplia, por lo que un `runtime: "codex"` a nivel de agente no se enruta
silenciosamente de vuelta a PI solo porque los valores predeterminados usaron `fallback: "pi"`.

Los alias de backend de CLI son diferentes de los ids de arnés integrados. La forma preferida
de Claude CLI es:

```json5
{
  agents: {
    defaults: {
      model: "anthropic/claude-opus-4-7",
      agentRuntime: { id: "claude-cli" },
    },
  },
}
```

Las referencias heredadas como `claude-cli/claude-opus-4-7` siguen siendo compatibles
por compatibilidad, pero la nueva configuración debe mantener el proveedor/modelo canónico y colocar
el backend de ejecución en `agentRuntime.id`.

El modo `auto` es intencionalmente conservador. Los runtimes de complementos pueden reclamar pares proveedor/modelo que entienden, pero el complemento Codex no reclama el proveedor `openai-codex` en el modo `auto`. Esto mantiene `openai-codex/*` como la ruta explícita de OAuth de PI Codex y evita mover silenciosamente las configuraciones de autenticación de suscripción al harness nativo del servidor de aplicaciones.

Si `openclaw doctor` advierte que el complemento `codex` está habilitado mientras `openai-codex/*` aún enruta a través de PI, trátelo como un diagnóstico, no como una migración. Mantenga la configuración sin cambios cuando OAuth de PI Codex es lo que desea. Cambie a `openai/<model>` más `agentRuntime.id: "codex"` solo cuando desee ejecución nativa del servidor de aplicaciones Codex.

## Contrato de compatibilidad

Cuando un runtime no es PI, debe documentar qué superficies de OpenClaw admite. Utilice este formato para la documentación de runtimes:

| Pregunta                                                  | Por qué es importante                                                                                                            |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| ¿Quién es el propietario del bucle del modelo?            | Determina dónde ocurren los reintentos, la continuación de herramientas y las decisiones de respuesta final.                     |
| ¿Quién es el propietario del historial canónico de hilos? | Determina si OpenClaw puede editar el historial o solo reflejarlo.                                                               |
| ¿Funcionan las herramientas dinámicas de OpenClaw?        | La mensajería, las sesiones, el cron y las herramientas propiedad de OpenClaw dependen de esto.                                  |
| ¿Funcionan los ganchos de herramientas dinámicas?         | Los complementos esperan `before_tool_call`, `after_tool_call` y middleware alrededor de las herramientas propiedad de OpenClaw. |
| ¿Funcionan los ganchos de herramientas nativas?           | Shell, parche y las herramientas propiedad del runtime necesitan soporte de gancho nativo para políticas y observaciones.        |
| ¿Se ejecuta el ciclo de vida del motor de contexto?       | Los complementos de memoria y contexto dependen del ciclo de vida de ensamblaje, ingestión, después del turno y compactación.    |
| ¿Qué datos de compactación están expuestos?               | Algunos complementos solo necesitan notificaciones, mientras que otros necesitan metadatos mantenidos/eliminados.                |
| ¿Qué no está admitido intencionalmente?                   | Los usuarios no deben asumir equivalencia con PI donde el runtime nativo posee más estado.                                       |

El contrato de soporte del runtime de Codex está documentado en
[Codex harness](/es/plugins/codex-harness#v1-support-contract).

## Etiquetas de estado

La salida de estado puede mostrar etiquetas `Execution` y `Runtime`. Léalas como
diagnósticos, no como nombres de proveedores.

- Una referencia de modelo como `openai/gpt-5.5` te indica el proveedor/modelo seleccionado.
- Un id de runtime como `codex` te indica qué bucle está ejecutando el turno.
- Una etiqueta de canal como Telegram o Discord te indica dónde está ocurriendo la conversación.

Si una sesión todavía muestra PI después de cambiar la configuración del runtime, inicia una nueva sesión
con `/new` o borra la actual con `/reset`. Las sesiones existentes mantienen su
runtime registrado para que una transcripción no se reproduzca a través de dos sistemas de sesión
nativos incompatibles.

## Relacionado

- [Arnés de Codex](/es/plugins/codex-harness)
- [OpenAI](/es/providers/openai)
- [Complementos del arnés de agentes](/es/plugins/sdk-agent-harness)
- [Bucle de agente](/es/concepts/agent-loop)
- [Modelos](/es/concepts/models)
- [Estado](/es/cli/status)
