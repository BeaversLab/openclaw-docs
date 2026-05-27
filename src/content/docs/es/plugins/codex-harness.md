---
summary: "Ejecutar turnos de agente integrado de OpenClaw a través del arnés de app-server de Codex incluido"
title: "Arnés de Codex"
read_when:
  - You want to use the bundled Codex app-server harness
  - You need Codex harness config examples
  - You want Codex-only deployments to fail instead of falling back to PI
---

El complemento `codex` incluido permite que OpenClaw ejecute turnos de agente OpenAI integrados a través de Codex app-server en lugar del arnés PI integrado.

Use el arnés de Codex cuando desee que Codex sea propietario de la sesión del agente de bajo nivel:
reanudación de subprocesos nativos, continuación de herramientas nativas, compactación nativa y
ejecución del servidor de aplicaciones. OpenClaw sigue siendo propietario de los canales de chat, los archivos de sesión, la selección de modelos,
las herramientas dinámicas de OpenClaw, las aprobaciones, la entrega de medios y el espejo
del transcript visible.

La configuración normal utiliza referencias de modelos canónicas de OpenAI como `openai/gpt-5.5`. No configure referencias de modelos `openai-codex/gpt-*`. Coloque el orden de autenticación del agente OpenAI bajo `auth.order.openai`; los perfiles `openai-codex:*` más antiguos y las entradas `auth.order.openai-codex` siguen siendo compatibles para instalaciones existentes.

Cuando no hay ningún sandbox de OpenClaw activo, OpenClaw inicia subprocesos del servidor de aplicaciones de Codex
con el modo de código nativo de Codex habilitado y deja el modo "solo código" desactivado de forma predeterminada.
Esto mantiene las capacidades de código y el espacio de trabajo nativo de Codex disponibles mientras
las herramientas dinámicas de OpenClaw continúan a través del puente `item/tool/call` del servidor de aplicaciones.
El sandbox activo de OpenClaw y las políticas de herramientas restringidas desactivan el modo de código nativo
por completo a menos que se opte por la ruta experimental del servidor de ejecución del sandbox.

Esta función nativa de Codex es independiente del
[modo de código de OpenClaw](/es/reference/code-mode), que es un tiempo de ejecución QuickJS-WASI
opcional para ejecuciones genéricas de OpenClaw con una forma de entrada `exec` diferente.

Para la división más amplia de modelo/proveedor/tiempo de ejecución, comience con
[Tiempos de ejecución de agentes](/es/concepts/agent-runtimes). La versión corta es:
`openai/gpt-5.5` es la referencia del modelo, `codex` es el tiempo de ejecución, y Telegram,
Discord, Slack u otro canal sigue siendo la superficie de comunicación.

## Requisitos

- OpenClaw con el complemento `codex` incluido disponible.
- Si su configuración usa `plugins.allow`, incluya `codex`.
- Servidor de aplicaciones de Codex `0.125.0` o más reciente. El complemento incluido gestiona un binario
  del servidor de aplicaciones de Codex compatible de forma predeterminada, por lo que los comandos locales `codex` en `PATH` no
  afectan el inicio normal del arnés.
- Autenticación de Codex disponible a través de `openclaw models auth login --provider openai-codex`,
  una cuenta de servidor de aplicaciones en el inicio de Codex del agente, o un perfil de autenticación
  explícito con clave de API de Codex.

Para conocer la precedencia de autenticación, el aislamiento del entorno, los comandos personalizados del servidor de aplicaciones, el descubrimiento
de modelos y todos los campos de configuración, consulte
[Referencia del arnés de Codex](/es/plugins/codex-harness-reference).

## Inicio rápido

La mayoría de los usuarios que quieren Codex en OpenClaw buscan esta ruta: iniciar sesión con un
suscripción de ChatGPT/Codex, habilitar el complemento incluido `codex` y usar una
referencia de modelo `openai/gpt-*` canónica.

Inicie sesión con Codex OAuth:

```bash
openclaw models auth login --provider openai-codex
```

Habilite el complemento incluido `codex` y seleccione un modelo de agente OpenAI:

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
    },
  },
}
```

Si su configuración usa `plugins.allow`, agregue `codex` allí también:

```json5
{
  plugins: {
    allow: ["codex"],
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
}
```

Reinicie la puerta de enlace después de cambiar la configuración del complemento. Si un chat existente ya
tiene una sesión, use `/new` o `/reset` antes de probar los cambios en tiempo de ejecución para que el siguiente
turno resuelva el arnés desde la configuración actual.

## Configuración

La configuración de inicio rápido es la configuración mínima viable del arnés de Codex. Establezca las opciones
del arnés de Codex en la configuración de OpenClaw y use la CLI solo para la autenticación de Codex:

| Necesidad                                                         | Establecer                                                                                               | Donde                                                      |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Habilitar el arnés                                                | `plugins.entries.codex.enabled: true`                                                                    | Configuración de OpenClaw                                  |
| Mantener una instalación de complemento en lista blanca           | Incluir `codex` en `plugins.allow`                                                                       | Configuración de OpenClaw                                  |
| Enrutar los turnos del agente de OpenAI a través de Codex         | `agents.defaults.model` o `agents.list[].model` como `openai/gpt-*`                                      | Configuración del agente de OpenClaw                       |
| Iniciar sesión con OAuth de Codex                                 | `openclaw models auth login --provider openai-codex`                                                     | Perfil de autenticación de CLI                             |
| Agregar copia de seguridad de clave API para ejecuciones de Codex | Perfil de clave API `openai:*` listado después de la autenticación de suscripción en `auth.order.openai` | Perfil de autenticación de CLI + configuración de OpenClaw |
| Fallo cerrado cuando Codex no está disponible                     | Proveedor o modelo `agentRuntime.id: "codex"`                                                            | Configuración de modelo/proveedor de OpenClaw              |
| Usar el tráfico directo de la API de OpenAI                       | Proveedor o modelo `agentRuntime.id: "pi"` con autenticación normal de OpenAI                            | Configuración de modelo/proveedor de OpenClaw              |
| Ajustar el comportamiento del servidor de aplicaciones            | `plugins.entries.codex.config.appServer.*`                                                               | Configuración del complemento de Codex                     |
| Habilitar aplicaciones nativas del complemento de Codex           | `plugins.entries.codex.config.codexPlugins.*`                                                            | Configuración del complemento de Codex                     |
| Habilitar el uso de computadora de Codex                          | `plugins.entries.codex.config.computerUse.*`                                                             | Configuración del complemento de Codex                     |

Use referencias de modelo `openai/gpt-*` para turnos de agente de OpenAI respaldados por Codex. Prefiera
`auth.order.openai` para el orden de primero suscripción/respaldo de clave API. Los perfiles
de autenticación `openai-codex:*` existentes y `auth.order.openai-codex` siguen siendo válidos, pero
no escriba nuevas referencias de modelo `openai-codex/gpt-*`.

No establezca `compaction.model` ni `compaction.provider` en agentes respaldados por Codex
a menos que un motor de contexto seleccionado sea el propietario de la compactación. Sin un motor de contexto propietario,
Codex compacta a través de su estado de subproceso nativo del servidor de aplicaciones, por lo que OpenClaw
ignora esas anulaciones locales del resumen en tiempo de ejecución y `openclaw doctor --fix`
las elimina cuando el agente usa Codex.

Lossless sigue siendo compatible como motor de contexto. Configúrelo a través de
`plugins.slots.contextEngine: "lossless-claw"` y
`plugins.entries.lossless-claw.config.summaryModel`, no a través de
`agents.defaults.compaction.provider`. `openclaw doctor --fix` migra la antigua
estructura `compaction.provider: "lossless-claw"` a la ranura del motor de contexto Lossless
cuando Codex es el tiempo de ejecución activo.

El arnés nativo del servidor de aplicaciones Codex admite motores de contexto que requieren
el ensamblaje previo del prompt. Los backends de CLI genéricos, incluyendo `codex-cli`, no proporcionan
capacidad de host.

Cuando el motor de contexto activo informa `ownsCompaction: true`, `/compact` ejecuta
el ciclo de vida de compactación de ese motor e invalida el subproceso del servidor de aplicaciones Codex vinculado.
El siguiente turno de Codex inicia un subproceso de backend nuevo y lo rehidrata desde
el motor de contexto en lugar de superponer la compactación nativa de Codex encima del
resumen semántico propiedad del motor.

```json5
{
  auth: {
    order: {
      openai: ["openai-codex:user@example.com", "openai:api-key-backup"],
    },
  },
}
```

En esa forma, ambos perfiles siguen ejecutándose a través de Codex para `openai/gpt-*` turnos de agente.
La clave API es solo una alternativa de autenticación, no una solicitud para cambiar a PI o
respuestas OpenAI simples.

El resto de esta página cubre las variantes comunes entre las que los usuarios deben elegir:
forma de implementación, enrutamiento de cierre por fallo, política de aprobación del guardián, complementos nativos de
Codex y Computer Use. Para listas completas de opciones, valores predeterminados, enumeraciones, descubrimiento,
aislamiento del entorno, tiempos de espera y campos de transporte del servidor de aplicaciones, consulte
[Referencia del arnés Codex](/es/plugins/codex-harness-reference).

## Verificar el tiempo de ejecución de Codex

Use `/status` en el chat donde espera Codex. Un turno de agente OpenAI respaldado por Codex
muestra:

```text
Runtime: OpenAI Codex
```

Luego verifique el estado del servidor de aplicaciones Codex:

```text
/codex status
/codex models
```

`/codex status` informa sobre la conectividad del servidor de aplicaciones, la cuenta, los límites de velocidad, los servidores MCP y las habilidades. `/codex models` enumera el catálogo en vivo del servidor de aplicaciones Codex para el arnés y la cuenta. Si `/status` es sorprendente, consulte [Solución de problemas](#troubleshooting).

## Enrutamiento y selección de modelos

Mantenga las referencias del proveedor y la política de tiempo de ejecución separadas:

- Use `openai/gpt-*` para los turnos del agente OpenAI a través de Codex.
- No use `openai-codex/gpt-*` en la configuración. Ejecute `openclaw doctor --fix` para reparar referencias heredadas y pines de ruta de sesión obsoletos.
- `agentRuntime.id: "codex"` es opcional para el modo automático normal de OpenAI, pero útil cuando una implementación debería fallar cerrada si Codex no está disponible.
- `agentRuntime.id: "pi"` opta por un proveedor o modelo para un comportamiento directo de PI cuando eso es intencional.
- `/codex ...` controla las conversaciones nativas del servidor de aplicaciones Codex desde el chat.
- ACP/acpx es una ruta de arnés externa separada. Úsela solo cuando el usuario solicite ACP/acpx o un adaptador de arnés externo.

Enrutamiento común de comandos:

| Intención del usuario                                               | Usar                                                                                                   |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Adjuntar el chat actual                                             | `/codex bind [--cwd <path>]`                                                                           |
| Reanudar un hilo Codex existente                                    | `/codex resume <thread-id>`                                                                            |
| Enumerar o filtrar hilos Codex                                      | `/codex threads [filter]`                                                                              |
| Enumerar complementos nativos de Codex                              | `/codex plugins list`                                                                                  |
| Habilitar o deshabilitar un complemento nativo de Codex configurado | `/codex plugins enable <name>`, `/codex plugins disable <name>`                                        |
| Adjuntar una sesión existente de CLI de Codex en un nodo emparejado | `/codex sessions --host <node> [filter]`, luego `/codex resume <session-id> --host <node> --bind here` |
| Enviar solo comentarios de Codex                                    | `/codex diagnostics [note]`                                                                            |
| Iniciar una tarea ACP/acpx                                          | Comandos de sesión ACP/acpx, no `/codex`                                                               |

| Caso de uso                                                       | Configurar                                                                  | Verificar                                         | Notas                                         |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------- |
| Suscripción ChatGPT/Codex con tiempo de ejecución nativo de Codex | `openai/gpt-*` más el complemento `codex` habilitado                        | `/status` muestra `Runtime: OpenAI Codex`         | Ruta recomendada                              |
| Fallo cerrado si Codex no está disponible                         | Proveedor o modelo `agentRuntime.id: "codex"`                               | El turno falla en lugar de usar el respaldo de PI | Usar para implementaciones solo de Codex      |
| Tráfico directo de clave de API de OpenAI a través de PI          | Proveedor o modelo `agentRuntime.id: "pi"` y autenticación normal de OpenAI | `/status` muestra el tiempo de ejecución de PI    | Usar solo cuando PI sea intencional           |
| Configuración heredada                                            | `openai-codex/gpt-*`                                                        | `openclaw doctor --fix` lo reescribe              | No escriba nueva configuración de esta manera |
| Adaptador ACP/acpx Codex                                          | ACP `sessions_spawn({ runtime: "acp" })`                                    | Estado de tarea/sesión ACP                        | Separado del harness nativo de Codex          |

`agents.defaults.imageModel` sigue la misma división de prefijos. Use `openai/gpt-*`
para la ruta normal de OpenAI y `codex/gpt-*` solo cuando la comprensión de imágenes
debe ejecutarse a través de un turno de app-server de Codex limitado. No use
`openai-codex/gpt-*`; el doctor reescribe ese prefijo heredado a `openai/gpt-*`.

## Patrones de despliegue

### Despliegue básico de Codex

Use la configuración de inicio rápido cuando todos los turnos del agente OpenAI deban usar Codex de
forma predeterminada.

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
    },
  },
}
```

### Despliegue de proveedor mixto

Esta forma mantiene a Claude como el agente predeterminado y añade un agente Codex con nombre:

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
  agents: {
    defaults: {
      model: "anthropic/claude-opus-4-6",
    },
    list: [
      {
        id: "main",
        default: true,
        model: "anthropic/claude-opus-4-6",
      },
      {
        id: "codex",
        name: "Codex",
        model: "openai/gpt-5.5",
      },
    ],
  },
}
```

Con esta configuración, el agente `main` usa su ruta de proveedor normal y el
agente `codex` usa el app-server de Codex.

### Despliegue de Codex con fallo cerrado (fail-closed)

Para los turnos del agente OpenAI, `openai/gpt-*` ya se resuelve a Codex cuando el
complemento incluido está disponible. Añada una política de tiempo de ejecución explícita cuando desee una regla
de fallo cerrado escrita:

```json5
{
  models: {
    providers: {
      openai: {
        agentRuntime: {
          id: "codex",
        },
      },
    },
  },
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
    },
  },
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
}
```

Con Codex forzado, OpenClaw falla temprano si el complemento Codex está deshabilitado, el
app-server es demasiado antiguo o el app-server no puede iniciarse.

## Política del app-server

De forma predeterminada, el complemento inicia el binario administrado de Codex de OpenClaw localmente con transporte
stdio. Establezca `appServer.command` solo cuando intencionalmente desee ejecutar un
diferente ejecutable. Use el transporte WebSocket solo cuando un app-server ya esté
ejecutándose en otro lugar:

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            transport: "websocket",
            url: "ws://gateway-host:39175",
            authToken: "${CODEX_APP_SERVER_TOKEN}",
          },
        },
      },
    },
  },
}
```

Las sesiones de app-server stdio locales por defecto tienen la postura de operador local de confianza: `approvalPolicy: "never"`, `approvalsReviewer: "user"` y `sandbox: "danger-full-access"`. Si los requisitos locales de Codex no permiten esa postura YOLO implícita, OpenClaw selecciona los permisos de guardian permitidos en su lugar. Cuando un sandbox de OpenClaw está activo para la sesión, OpenClaw deshabilita el modo de código nativo de Codex, los servidores MCP del usuario y la ejecución de complementos respaldados por la aplicación para ese turno, en lugar de confiar en el sandbox del lado del host de Codex. El acceso a Shell se expone a través de herramientas dinámicas respaldadas por el sandbox de OpenClaw, como `sandbox_exec` y `sandbox_process`, cuando las herramientas normales de ejecución/proceso están disponibles.

Use el modo guardian cuando desee una revisión automática nativa de Codex antes de las escapadas del sandbox o permisos adicionales:

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            mode: "guardian",
            serviceTier: "priority",
          },
        },
      },
    },
  },
}
```

El modo guardian se expande a las aprobaciones del app-server de Codex, generalmente `approvalPolicy: "on-request"`, `approvalsReviewer: "auto_review"` y `sandbox: "workspace-write"`, cuando los requisitos locales permiten esos valores.

Para cada campo del app-server, orden de autenticación, aislamiento del entorno, descubrimiento y comportamiento de tiempo de espera, consulte [Referencia del arnés de Codex](/es/plugins/codex-harness-reference).

## Comandos y diagnósticos

El complemento incluido registra `/codex` como un comando de barra en cualquier canal que admita comandos de texto de OpenClaw.

Formas comunes:

- `/codex status` verifica la conectividad del app-server, modelos, cuenta, límites de velocidad, servidores MCP y habilidades.
- `/codex models` enumera los modelos en vivo del app-server de Codex.
- `/codex threads [filter]` enumera los hilos recientes del app-server de Codex.
- `/codex resume <thread-id>` adjunta la sesión actual de OpenClaw a un hilo existente de Codex.
- `/codex compact` solicita al app-server de Codex que compacte el hilo adjunto.
- `/codex review` inicia la revisión nativa de Codex para el hilo adjunto.
- `/codex diagnostics [note]` pregunta antes de enviar comentarios de Codex para el hilo adjunto.
- `/codex account` muestra el estado de la cuenta y el límite de velocidad.
- `/codex mcp` enumera el estado del servidor MCP del app-server de Codex.
- `/codex skills` enumera las habilidades del app-server de Codex.

Para la mayoría de los informes de soporte, comience con `/diagnostics [note]` en la conversación
donde ocurrió el error. Crea un informe de diagnóstico de Gateway y, para las sesiones
de harness de Codex, solicita aprobación para enviar el paquete de comentarios de Codex relevante.
Consulte [Exportación de diagnósticos](/es/gateway/diagnostics) para conocer el modelo de privacidad y el comportamiento
del chat en grupo.

Use `/codex diagnostics [note]` solo cuando específicamente desee la carga de comentarios de Codex
para el hilo adjunto actualmente sin el paquete de diagnóstico completo
de Gateway.

### Inspeccionar hilos de Codex localmente

La forma más rápida de inspeccionar una ejecución de Codex incorrecta suele ser abrir el hilo
nativo de Codex directamente:

```bash
codex resume <thread-id>
```

Obtenga el id del hilo de la respuesta completada de `/diagnostics`, `/codex binding`, o
`/codex threads [filter]`.

Para conocer los mecanismos de carga y los límites de diagnóstico a nivel de ejecución, consulte
[Codex harness runtime](/es/plugins/codex-harness-runtime#codex-feedback-upload).

La autenticación se selecciona en este orden:

1. Perfiles de autenticación de OpenAI ordenados para el agente, preferiblemente en
   `auth.order.openai`. Los ids de perfil `openai-codex:*` existentes siguen siendo válidos.
2. La cuenta existente del app-server en el hogar de Codex de ese agente.
3. Solo para lanzamientos locales de app-server stdio, `CODEX_API_KEY`, luego
   `OPENAI_API_KEY`, cuando no hay cuenta de app-server presente y la autenticación de OpenAI es
   aún necesaria.

Cuando OpenClaw detecta un perfil de autenticación de Codex estilo suscripción ChatGPT, elimina
`CODEX_API_KEY` y `OPENAI_API_KEY` del proceso hijo de Codex generado. Esto
mantiene las claves API a nivel de Gateway disponibles para incrustaciones o modelos directos de OpenAI
sin hacer que los turnos del app-server nativo de Codex se facturen a través de la API por accidente.
Los perfiles explícitos de clave API de Codex y la reserva de clave de entorno stdio local usan el inicio de sesión del app-server
en lugar del entorno del proceso hijo heredado. Las conexiones del app-server WebSocket
no reciben la reserva de clave API de entorno de Gateway; use un perfil de autenticación explícito o la
cuenta propia del app-server remoto.

Si un perfil de suscripción alcanza un límite de uso de Codex, OpenClaw registra la hora de restablecimiento cuando Codex informa de una y prueba el siguiente perfil de autenticación ordenado para la misma ejecución de Codex. Cuando pasa la hora de restablecimiento, el perfil de suscripción vuelve a ser elegible sin cambiar el modelo `openai/gpt-*` seleccionado ni el tiempo de ejecución de Codex.

Para los lanzamientos locales del servidor de aplicaciones stdio, OpenClaw establece `CODEX_HOME` en un directorio por agente, por lo que la configuración de Codex, los archivos de autenticación/cuenta, la caché/datos de los complementos y el estado del subproceso nativo no leen ni escriben el `~/.codex` personal del operador de forma predeterminada. OpenClaw preserva el `HOME` normal del proceso; los subprocesos ejecutados por Codex aún pueden encontrar la configuración y los tokens del directorio de inicio del usuario, y Codex puede descubrir entradas compartidas de `$HOME/.agents/skills` y `$HOME/.agents/plugins/marketplace.json`.

Si una implementación necesita aislamiento adicional del entorno, agregue esas variables a `appServer.clearEnv`:

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            clearEnv: ["CODEX_API_KEY", "OPENAI_API_KEY"],
          },
        },
      },
    },
  },
}
```

`appServer.clearEnv` solo afecta al proceso hijo del servidor de aplicaciones Codex generado. OpenClaw elimina `CODEX_HOME` y `HOME` de esta lista durante la normalización del lanzamiento local: `CODEX_HOME` se mantiene por agente, y `HOME` se mantiene heredado para que los subprocesos puedan usar el estado normal del directorio de inicio del usuario.

Las herramientas dinámicas de Codex se cargan de forma `searchable` de manera predeterminada. OpenClaw no expone herramientas dinámicas que duplican las operaciones del área de trabajo nativas de Codex: `read`, `write`, `edit`, `apply_patch`, `exec`, `process` y `update_plan`. La mayoría de las herramientas de integración restantes de OpenClaw, como mensajería, medios, cron, navegador, nodos, puerta de enlace, `heartbeat_respond` y `web_search`, están disponibles a través de la búsqueda de herramientas de Codex en el espacio de nombres `openclaw`, manteniendo el contexto del modelo inicial más pequeño.
Las `sessions_yield` y las respuestas de origen solo con herramienta de mensaje se mantienen directas porque son contratos de control de turno. `sessions_spawn` permanece seleccionable para que el `spawn_agent` nativo de Codex siga siendo la superficie principal del subagente Codex, mientras que la delegación explícita de OpenClaw o ACP todavía está disponible a través del espacio de nombres de la herramienta dinámica `openclaw`. Las instrucciones de colaboración de latido indican a Codex que busque `heartbeat_respond` antes de finalizar un turno de latido cuando la herramienta aún no está cargada.

Establezca `codexDynamicToolsLoading: "direct"` solo cuando se conecte a un servidor de aplicaciones Codex personalizado que no pueda buscar herramientas dinámicas diferidas o al depurar la carga útil completa de la herramienta.

Campos de complemento de Codex de nivel superior compatibles:

| Campo                      | Predeterminado | Significado                                                                                                                   |
| -------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `codexDynamicToolsLoading` | `"searchable"` | Use `"direct"` para poner las herramientas dinámicas de OpenClaw directamente en el contexto de herramienta inicial de Codex. |
| `codexDynamicToolsExclude` | `[]`           | Nombres adicionales de herramientas dinámicas de OpenClaw para omitir de los turnos del servidor de aplicaciones Codex.       |
| `codexPlugins`             | deshabilitado  | Soporte nativo de complementos/aplicaciones de Codex para complementos curados instalados en la fuente migrados.              |

Campos `appServer` compatibles:

| Campo                                         | Predeterminado                                                        | Significado                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`                                   | `"stdio"`                                                             | `"stdio"` inicia Codex; `"websocket"` se conecta a `url`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `command`                                     | binario administrado de Codex                                         | Ejecutable para el transporte stdio. Déjelo sin establecer para usar el binario administrado; establézcalo solo para una invalidación explícita.                                                                                                                                                                                                                                                                                                                                                                                      |
| `args`                                        | `["app-server", "--listen", "stdio://"]`                              | Argumentos para el transporte stdio.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `url`                                         | sin establecer                                                        | URL del servidor de aplicaciones WebSocket.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `authToken`                                   | sin establecer                                                        | Token de portador para el transporte WebSocket.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `headers`                                     | `{}`                                                                  | Encabezados adicionales de WebSocket.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `clearEnv`                                    | `[]`                                                                  | Nombres de variables de entorno adicionales eliminados del proceso del servidor de aplicaciones stdio generado después de que OpenClaw construye su entorno heredado. OpenClaw mantiene `CODEX_HOME` por agente y `HOME` heredadas para los inicios locales.                                                                                                                                                                                                                                                                          |
| `codeModeOnly`                                | `false`                                                               | Optar por la superficie de herramientas solo en modo de código de Codex. Las herramientas dinámicas de OpenClaw permanecen registradas con Codex para que las llamadas anidadas `tools.*` regresen a través del puente `item/tool/call` del servidor de aplicaciones.                                                                                                                                                                                                                                                                 |
| `requestTimeoutMs`                            | `60000`                                                               | Tiempo de espera para las llamadas al plano de control del servidor de aplicaciones.                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `turnCompletionIdleTimeoutMs`                 | `60000`                                                               | Ventana de silencio después de que Codex acepta un turno o después de una solicitud al servidor de aplicaciones con alcance de turno mientras OpenClaw espera `turn/completed`. Aumente esto para fases de síntesis posteriores a herramientas o solo de estado lentas.                                                                                                                                                                                                                                                               |
| `postToolRawAssistantCompletionIdleTimeoutMs` | sin establecer                                                        | Guardia de inactividad de finalización utilizado después de una transferencia de herramienta cuando Codex emite una finalización o progreso del asistente en bruto pero no envía `turn/completed`. El valor predeterminado es el tiempo de espera de inactividad de finalización del asistente cuando no está establecido. Úselo para cargas de trabajo confiables o pesadas donde la síntesis posterior a la herramienta puede legítimamente permanecer en silencio más tiempo que el presupuesto de liberación final del asistente. |
| `mode`                                        | `"yolo"` a menos que los requisitos locales de Codex no permitan YOLO | Configuración predeterminada para ejecución tipo YOLO o revisada por un tutor. Los requisitos locales de stdio que omiten `danger-full-access`, la aprobación `never` o el revisor `user` hacen que el tutor predeterminado implícito sea el predeterminado.                                                                                                                                                                                                                                                                          |
| `approvalPolicy`                              | `"never"` o una política de aprobación de tutor permitida             | Política de aprobación nativa de Codex enviada al inicio/reanudación/turno del hilo. Los valores predeterminados del tutor prefieren `"on-request"` cuando se permite.                                                                                                                                                                                                                                                                                                                                                                |
| `sandbox`                                     | `"danger-full-access"` o un entorno sandbox de tutor permitido        | Modo de entorno sandbox nativo de Codex enviado al inicio/reanudación del hilo. Los valores predeterminados del tutor prefieren `"workspace-write"` cuando se permite, de lo contrario `"read-only"`. Cuando hay un entorno sandbox de OpenClaw activo, los turnos `danger-full-access` usan el entorno sandbox `workspace-write` de Codex con acceso a la red derivado de la configuración de salida del entorno sandbox de OpenClaw.                                                                                                |
| `approvalsReviewer`                           | `"user"` o un revisor de tutor permitido                              | Use `"auto_review"` para permitir que Codex revise los avisos de aprobación nativos cuando se permite, de lo contrario `guardian_subagent` o `user`. `guardian_subagent` sigue siendo un alias heredado.                                                                                                                                                                                                                                                                                                                              |
| `serviceTier`                                 | sin definir                                                           | Nivel de servicio opcional del servidor de aplicaciones Codex. `"priority"` habilita el enrutamiento en modo rápido, `"flex"` solicita procesamiento flexible, `null` borra la anulación y el valor heredado `"fast"` se acepta como `"priority"`.                                                                                                                                                                                                                                                                                    |
| `experimental.sandboxExecServer`              | `false`                                                               | Opt-in de vista previa que registra un entorno Codex respaldado por un entorno sandbox de OpenClaw con Codex app-server 0.132.0 o más reciente para que la ejecución nativa de Codex pueda ejecutarse dentro del entorno sandbox de OpenClaw activo.                                                                                                                                                                                                                                                                                  |

Las llamadas a herramientas dinámicas propiedad de OpenClaw están limitadas independientemente de `appServer.requestTimeoutMs`: las solicitudes `item/tool/call` de Codex usan un watchdog de OpenClaw de 30 segundos por defecto. Un argumento `timeoutMs` positivo por llamada extiende o acorta ese presupuesto específico de la herramienta. La herramienta `image_generate` usa `agents.defaults.imageGenerationModel.timeoutMs` cuando la llamada a la herramienta no proporciona su propio tiempo de espera, o un valor predeterminado de 120 segundos para la generación de imágenes en caso contrario. La herramienta de comprensión de medios `image` usa `tools.media.image.timeoutSeconds` o su valor predeterminado de 60 segundos para medios. Los presupuestos de herramientas dinámicas están limitados a 600000 ms. Al agotarse el tiempo, OpenClaw aborta la señal de la herramienta cuando es compatible y devuelve una respuesta de herramienta dinámica fallida a Codex para que el turno pueda continuar en lugar de dejar la sesión en `processing`.

Después de que Codex acepta un turno, y después de que OpenClaw responde a una solicitud de servidor de aplicaciones con alcance de turno, el arnés espera que Codex avance en el turno actual y eventualmente termine el turno nativo con `turn/completed`. Si el servidor de aplicaciones permanece en silencio durante `appServer.turnCompletionIdleTimeoutMs`, OpenClaw interrumpe el turno de Codex con el mejor esfuerzo posible, registra un tiempo de espera de diagnóstico y libera el carril de sesión de OpenClaw para que los mensajes de chat de seguimiento no se pongan en cola detrás de un turno nativo obsoleto. La mayoría de las notificaciones no terminales para el mismo turno desactivan ese perro guardián corto porque Codex ha demostrado que el turno todavía está vivo; las terminaciones `custom_tool_call_output` mantienen activo el perro guardián corto posterior a la herramienta porque son la transferencia del resultado de la herramienta con alcance de turno. Las notificaciones globales del servidor de aplicaciones, como las actualizaciones de límite de velocidad, no restablecen el progreso de inactividad del turno. Los elementos `agentMessage` completados y los elementos `rawResponseItem/completed` del asistente en bruto previos a la herramienta activan la liberación de salida del asistente: si Codex luego permanece en silencio sin `turn/completed`, OpenClaw interrumpe el turno nativo con el mejor esfuerzo posible y libera el carril de sesión. El progreso del asistente en bruto posterior a la herramienta sigue esperando `turn/completed` mientras permanece activo un guardia de inactividad de finalización; el guardia usa `appServer.postToolRawAssistantCompletionIdleTimeoutMs` cuando está configurado y, de lo contrario, recurre al tiempo de espera de inactividad de finalización del asistente. Los diagnósticos de tiempo de espera incluyen el último método de notificación del servidor de aplicaciones y, para los elementos de respuesta del asistente en bruto, el tipo de elemento, el rol, el id. y una vista previa del texto del asistente delimitada.

Las anulaciones de entorno siguen disponibles para pruebas locales:

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

`OPENCLAW_CODEX_APP_SERVER_BIN` omite el binario administrado cuando `appServer.command` no está configurado.

Se eliminó `OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1`. Use `plugins.entries.codex.config.appServer.mode: "guardian"` en su lugar, o `OPENCLAW_CODEX_APP_SERVER_MODE=guardian` para pruebas locales únicas. Se prefiere la configuración para despliegues repetibles porque mantiene el comportamiento del complemento en el mismo archivo revisado que el resto de la configuración del arnés de Codex.

## Complementos nativos de Codex

La compatibilidad con complementos nativos de Codex utiliza las propias capacidades de aplicaciones y complementos del servidor de aplicaciones de Codex en el mismo hilo de Codex que el turno del arnés de OpenClaw. OpenClaw no traduce los complementos de Codex en herramientas dinámicas `codex_plugin_*` sintéticas de OpenClaw.

`codexPlugins` afecta solo a las sesiones que seleccionan el arnés nativo de Codex. No tiene efecto en las ejecuciones de PI, las ejecuciones normales del proveedor OpenAI, los enlaces de conversación de ACP u otros arneses.

Configuración migrada mínima:

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          codexPlugins: {
            enabled: true,
            allow_destructive_actions: true,
            plugins: {
              "google-calendar": {
                enabled: true,
                marketplaceName: "openai-curated",
                pluginName: "google-calendar",
              },
            },
          },
        },
      },
    },
  },
}
```

La configuración de la aplicación del hilo se calcula cuando OpenClaw establece una sesión del arnés de Codex o reemplaza un enlace de hilo de Codex obsoleto. No se vuelve a calcular en cada turno. Después de cambiar `codexPlugins`, use `/new`, `/reset`, o reinicie la puerta de enlace para que las futuras sesiones del arnés de Codex comiencen con el conjunto de aplicaciones actualizado.

Para consultar la elegibilidad de migración, el inventario de aplicaciones, la política de acciones destructivas, las elicitaciones y los diagnósticos de complementos nativos, consulte [Complementos nativos de Codex](/es/plugins/codex-native-plugins).

## Uso del equipo

El uso del equipo se trata en su propia guía de configuración: [Uso del equipo de Codex](/es/plugins/codex-computer-use).

La versión corta: OpenClaw no distribuye la aplicación de control del escritorio ni ejecuta acciones del escritorio por sí mismo. Prepara el servidor de aplicaciones de Codex, verifica que el servidor MCP `computer-use` esté disponible y luego permite que Codex sea el propietario de las llamadas a herramientas MCP nativas durante los turnos en modo Codex.

## Límites de tiempo de ejecución

El arnés de Codex solo cambia el ejecutor del agente integrado de bajo nivel.

- Las herramientas dinámicas de OpenClaw son compatibles. Codex le pide a OpenClaw que ejecute esas herramientas, por lo que OpenClaw permanece en la ruta de ejecución.
- Las herramientas nativas de shell, parche, MCP y aplicaciones nativas de Codex son propiedad de Codex. OpenClaw puede observar o bloquear eventos nativos seleccionados a través del relé compatible, pero no reescribe los argumentos de las herramientas nativas.
- Codex es propietario de la compactación nativa a menos que el motor de contexto de OpenClaw activo declare `ownsCompaction: true`. OpenClaw mantiene un espejo de transcripción para el historial del canal, la búsqueda, `/new`, `/reset` y el cambio futuro de modelo o arnés.
- La generación de medios, la comprensión de medios, TTS, las aprobaciones y la salida de herramientas de mensajería continúan a través de la configuración de proveedor/modelo de OpenClaw correspondiente.
- `tool_result_persist` se aplica a los resultados de la herramienta de transcripción propiedad de OpenClaw, no a los registros de resultados de herramientas nativas de Codex.

Para conocer las capas de enlace, las superficies V1 compatibles, el manejo nativo de permisos, la dirección de la cola, los mecanismos de carga de comentarios de Codex y los detalles de compactación, consulte [Codex harness runtime](/es/plugins/codex-harness-runtime).

## Solución de problemas

**Codex no aparece como un proveedor `/model` normal:** eso es esperado para configuraciones nuevas. Seleccione un modelo `openai/gpt-*`, habilite `plugins.entries.codex.enabled` y verifique si `plugins.allow` excluye `codex`.

**OpenClaw usa PI en lugar de Codex:** asegúrese de que la referencia del modelo sea `openai/gpt-*` en el proveedor oficial de OpenAI y de que el complemento Codex esté instalado y habilitado. Si necesita una prueba estricta mientras realiza pruebas, establezca el proveedor o el modelo `agentRuntime.id: "codex"`. Un tiempo de ejecución de Codex forzado falla en lugar de recurrir a PI.

**El tiempo de ejecución de OpenAI Codex recurre a la ruta de clave de API:** recopile un extracto de puerta de enlace redactado que muestre el modelo, el tiempo de ejecución, el proveedor seleccionado y el fallo. Pida a los colaboradores afectados que ejecuten este comando de solo lectura en su host de OpenClaw:

```bash
(
  pattern='openai/gpt-5\.[45]|agentRuntime(\.id)?|harnessRuntime|Runtime: OpenAI Codex|openai-codex|resolveSelectedOpenAIPiRuntimeProvider|candidateProvider[": ]+openai|status[": ]+401|Incorrect API key|No API key|api-key path|API-key path|OAuth'

  if ls /tmp/openclaw/openclaw-*.log >/dev/null 2>&1; then
    grep -E -i -n "$pattern" /tmp/openclaw/openclaw-*.log 2>/dev/null || true
  else
    journalctl --user -u openclaw-gateway --since today --no-pager 2>/dev/null \
      | grep -E -i "$pattern" || true
  fi
) | sed -E \
    -e 's/(Authorization: Bearer )[A-Za-z0-9._~+\/-]+/\1[REDACTED]/Ig' \
    -e 's/(Bearer )[A-Za-z0-9._~+\/-]+/\1[REDACTED]/Ig' \
    -e 's/(api[_ -]?key[=: ]+)[^ ,}"]+/\1[REDACTED]/Ig' \
    -e 's/(OPENAI_API_KEY[=: ]+)[^ ,}"]+/\1[REDACTED]/Ig' \
    -e 's/sk-[A-Za-z0-9_-]{12,}/sk-[REDACTED]/g' \
    -e 's/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/[EMAIL-REDACTED]/g' \
  | tail -200
```

Los extractos útiles generalmente incluyen `openai/gpt-5.5` o `openai/gpt-5.4`, `Runtime: OpenAI Codex`, `agentRuntime.id` o `harnessRuntime`, `candidateProvider: "openai"`, y un resultado `401`, `Incorrect API key` o `No API key`. Una ejecución corregida debería mostrar la ruta OAuth `openai-codex` en lugar de un fallo de clave de API simple de OpenAI.

**La configuración heredada de `openai-codex/*` permanece:** ejecute `openclaw doctor --fix`. Doctor reescribe las referencias de modelos heredadas a `openai/*`, elimina pines de sesión obsoletos y pines de tiempo de ejecución de todo el agente, y preserva las anulaciones de perfil de autenticación existentes.

**El servidor de aplicaciones es rechazado:** use el servidor de aplicaciones de Codex `0.125.0` o más reciente.
Las versiones preliminares de la misma versión o las versiones con sufijo de compilación, como
`0.125.0-alpha.2` o `0.125.0+custom`, son rechazadas porque OpenClaw prueba el
piso del protocolo estable `0.125.0`.

**`/codex status` no puede conectarse:** verifique que el complemento incluido `codex` esté
habilitado, que `plugins.allow` lo incluya cuando se configure una lista blanca y
que cualquier `appServer.command`, `url`, `authToken` o encabezados personalizados sean válidos.

**El descubrimiento de modelos es lento:** reduzca
`plugins.entries.codex.config.discovery.timeoutMs` o desactive el descubrimiento. Consulte
[Referencia del arnés de Codex](/es/plugins/codex-harness-reference#model-discovery).

**El transporte WebSocket falla inmediatamente:** verifique `appServer.url`, `authToken`,
los encabezados y que el servidor de aplicaciones remoto hable la misma versión del
protocolo del servidor de aplicaciones de Codex.

**Un modelo que no es de Codex usa PI:** eso es esperado a menos que la política del proveedor o del tiempo de ejecución del modelo
la enrute a otro arnés. Las referencias de proveedores que no son de OpenAI simples se mantienen en
su ruta de proveedor normal en el modo `auto`.

**Computer Use está instalado pero las herramientas no se ejecutan:** verifique
`/codex computer-use status` desde una sesión nueva. Si una herramienta reporta
`Native hook relay unavailable`, use `/new` o `/reset`; si persiste, reinicie
la puerta de enlace para borrar los registros de enlaces nativos obsoletos. Consulte
[Computer Use de Codex](/es/plugins/codex-computer-use#troubleshooting).

## Relacionado

- [Referencia del arnés de Codex](/es/plugins/codex-harness-reference)
- [Tiempo de ejecución del arnés de Codex](/es/plugins/codex-harness-runtime)
- [Complementos nativos de Codex](/es/plugins/codex-native-plugins)
- [Computer Use de Codex](/es/plugins/codex-computer-use)
- [Tiempos de ejecución del agente](/es/concepts/agent-runtimes)
- [Proveedores de modelos](/es/concepts/model-providers)
- [Proveedor OpenAI](/es/providers/openai)
- [Complementos del arnés del agente](/es/plugins/sdk-agent-harness)
- [Ganchos de complementos](/es/plugins/hooks)
- [Exportación de diagnósticos](/es/gateway/diagnostics)
- [Estado](/es/cli/status)
- [Pruebas](/es/help/testing-live#live-codex-app-server-harness-smoke)
