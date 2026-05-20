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

OpenClaw inicia los subprocesos del servidor de aplicaciones Codex con el modo de código nativo de Codex habilitado
mientras deja code-mode-only desactivado por defecto. Eso mantiene el espacio de trabajo nativo de Codex
y las capacidades de código disponibles mientras las herramientas dinámicas de OpenClaw continúan a través del
puente del servidor de aplicaciones `item/tool/call`. Las políticas de herramientas restringidas aún deshabilitan
por completo el modo de código nativo.

Para la división más amplia de modelo/proveedor/runtime, comience con
[Runtimes de agente](/es/concepts/agent-runtimes). La versión corta es:
`openai/gpt-5.5` es la referencia del modelo, `codex` es el runtime, y Telegram,
Discord, Slack u otro canal sigue siendo la superficie de comunicación.

## Requisitos

- OpenClaw con el complemento `codex` incluido disponible.
- Si su configuración usa `plugins.allow`, incluya `codex`.
- Servidor de aplicaciones Codex `0.125.0` o más reciente. El complemento incluido gestiona un binario
  compatible del servidor de aplicaciones Codex por defecto, por lo que los comandos locales `codex` en `PATH` no
  afectan el inicio normal del harness.
- Autenticación de Codex disponible a través de `openclaw models auth login --provider openai-codex`,
  una cuenta de servidor de aplicaciones en el hogar de Codex del agente, o un perfil de autenticación
  explícito con clave de API de Codex.

Para la precedencia de autenticación, aislamiento del entorno, comandos personalizados del servidor de aplicaciones, descubrimiento
de modelos y todos los campos de configuración, consulte
[Referencia del harness de Codex](/es/plugins/codex-harness-reference).

## Inicio rápido

La mayoría de los usuarios que quieren Codex en OpenClaw quieren esta ruta: iniciar sesión con una
suscripción a ChatGPT/Codex, habilitar el complemento `codex` incluido y usar una
referencia de modelo `openai/gpt-*` canónica.

Inicie sesión con Codex OAuth:

```bash
openclaw models auth login --provider openai-codex
```

Habilite el complemento `codex` incluido y seleccione un modelo de agente OpenAI:

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
tiene una sesión, use `/new` o `/reset` antes de probar los cambios de runtime para que el siguiente
turno resuelva el harness desde la configuración actual.

## Configuración

La configuración de inicio rápido es la configuración mínima viable del arnés Codex. Establezca las opciones del arnés Codex en la configuración de OpenClaw y use la CLI solo para la autenticación de Codex:

| Necesita                                                          | Establecer                                                                                                  | Donde                                                   |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Habilitar el arnés                                                | `plugins.entries.codex.enabled: true`                                                                       | Configuración de OpenClaw                               |
| Mantener una instalación de complemento en la lista de permitidos | Incluya `codex` en `plugins.allow`                                                                          | Configuración de OpenClaw                               |
| Enrutar los turnos del agente OpenAI a través de Codex            | `agents.defaults.model` o `agents.list[].model` como `openai/gpt-*`                                         | Configuración del agente OpenClaw                       |
| Inicie sesión con Codex OAuth                                     | `openclaw models auth login --provider openai-codex`                                                        | Perfil de autenticación CLI                             |
| Añadir copia de seguridad de clave API para ejecuciones de Codex  | Perfil de clave de API `openai:*` listado después de la autenticación de suscripción en `auth.order.openai` | Perfil de autenticación CLI + Configuración de OpenClaw |
| Fallo cerrado cuando Codex no está disponible                     | Proveedor o modelo `agentRuntime.id: "codex"`                                                               | Configuración de modelo/proveedor OpenClaw              |
| Usar tráfico directo de la API de OpenAI                          | Proveedor o modelo `agentRuntime.id: "pi"` con autenticación normal de OpenAI                               | Configuración de modelo/proveedor OpenClaw              |
| Ajustar el comportamiento del servidor de aplicaciones            | `plugins.entries.codex.config.appServer.*`                                                                  | Configuración del complemento Codex                     |
| Habilitar aplicaciones nativas del complemento Codex              | `plugins.entries.codex.config.codexPlugins.*`                                                               | Configuración del complemento Codex                     |
| Habilitar el uso de computadora de Codex                          | `plugins.entries.codex.config.computerUse.*`                                                                | Configuración del complemento Codex                     |

Use referencias de modelo `openai/gpt-*` para turnos de agente OpenAI respaldados por Codex. Prefiera
`auth.order.openai` para el orden de suscripción primero/respaldo de clave de API. Los perfiles
de autenticación `openai-codex:*` existentes y `auth.order.openai-codex` siguen siendo válidos, pero
no escriba nuevas referencias de modelo `openai-codex/gpt-*`.

No configure `compaction.model` ni `compaction.provider` en agentes respaldados por Codex
a menos que un motor de contexto seleccionado sea el propietario de la compactación. Sin un motor de contexto
propietario, Codex compacta a través de su estado de subproceso nativo del servidor de aplicaciones, por lo que OpenClaw
ignora esas anulaciones locales del resumidor en tiempo de ejecución y `openclaw doctor --fix`
las elimina cuando el agente usa Codex.

Lossless sigue siendo compatible como motor de contexto. Configúrelo a través de
`plugins.slots.contextEngine: "lossless-claw"` y
`plugins.entries.lossless-claw.config.summaryModel`, no a través de
`agents.defaults.compaction.provider`. `openclaw doctor --fix` migra la forma antigua
`compaction.provider: "lossless-claw"` a la ranura del motor de contexto Lossless
cuando Codex es el tiempo de ejecución activo.

Cuando el motor de contexto activo informa `ownsCompaction: true`, `/compact` ejecuta
el ciclo de vida de compactación de ese motor e invalida el subproceso del servidor de aplicaciones Codex
vinculado. El siguiente turno de Codex inicia un subproceso de backend nuevo y lo rehidrata desde
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

En esa forma, ambos perfiles aún se ejecutan a través de Codex para turnos de agente
`openai/gpt-*`. La clave de API es solo un respaldo de autenticación, no una solicitud para cambiar a PI o
Respuestas OpenAI simples.

El resto de esta página cubre las variantes comunes entre las que los usuarios deben elegir:
forma de despliegue, enrutamiento de fallo cerrado, política de aprobación del guardián, complementos nativos de Codex
y uso de computadora. Para listas completas de opciones, valores predeterminados, enumeraciones, descubrimiento,
aislamiento del entorno, tiempos de espera y campos de transporte del servidor de aplicaciones, consulte
[Referencia del arnés de Codex](/es/plugins/codex-harness-reference).

## Verificar el tiempo de ejecución de Codex

Use `/status` en el chat donde espera Codex. Un turno de agente OpenAI respaldado por Codex
muestra:

```text
Runtime: OpenAI Codex
```

Luego verifique el estado de Codex app-server:

```text
/codex status
/codex models
```

`/codex status` informa la conectividad del servidor de aplicaciones, la cuenta, los límites de velocidad, los servidores MCP
y las habilidades. `/codex models` lista el catálogo en vivo del servidor de aplicaciones Codex para
el arnés y la cuenta. Si `/status` es sorprendente, consulte
[Solución de problemas](#troubleshooting).

## Enrutamiento y selección de modelos

Mantenga las referencias de proveedor y la política de tiempo de ejecución separadas:

- Use `openai/gpt-*` para los turnos del agente OpenAI a través de Codex.
- No use `openai-codex/gpt-*` en la configuración. Ejecute `openclaw doctor --fix` para
  reparar referencias heredadas y pines de ruta de sesión obsoletos.
- `agentRuntime.id: "codex"` es opcional para el modo automático normal de OpenAI, pero útil
  cuando un despliegue debería fallar cerrado si Codex no está disponible.
- `agentRuntime.id: "pi"` opta por un proveedor o modelo para un comportamiento directo de PI cuando
  eso es intencional.
- `/codex ...` controla las conversaciones nativas del servidor de aplicaciones Codex desde el chat.
- ACP/acpx es una ruta de harness externo separada. Úsela solo cuando el usuario solicite
  ACP/acpx o un adaptador de harness externo.

Enrutamiento común de comandos:

| Intención del usuario                                               | Usar                                                                                                      |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Adjuntar el chat actual                                             | `/codex bind [--cwd <path>]`                                                                              |
| Reanudar un hilo de Codex existente                                 | `/codex resume <thread-id>`                                                                               |
| Listar o filtrar hilos de Codex                                     | `/codex threads [filter]`                                                                                 |
| Adjuntar una sesión de CLI de Codex existente en un nodo emparejado | `/codex sessions --host <node> [filter]`, entonces `/codex resume <session-id> --host <node> --bind here` |
| Enviar solo comentarios de Codex                                    | `/codex diagnostics [note]`                                                                               |
| Iniciar una tarea ACP/acpx                                          | Comandos de sesión ACP/acpx, no `/codex`                                                                  |

| Caso de uso                                                          | Configurar                                                                  | Verificar                                      | Notas                                             |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------- |
| Suscripción de ChatGPT/Codex con tiempo de ejecución nativo de Codex | `openai/gpt-*` más el complemento `codex` habilitado                        | `/status` muestra `Runtime: OpenAI Codex`      | Ruta recomendada                                  |
| Fallo cerrado si Codex no está disponible                            | Proveedor o modelo `agentRuntime.id: "codex"`                               | El turno falla en lugar de la alternativa PI   | Usar para implementaciones solo de Codex          |
| Tráfico directo de clave de API de OpenAI a través de PI             | Proveedor o modelo `agentRuntime.id: "pi"` y autenticación normal de OpenAI | `/status` muestra el tiempo de ejecución de PI | Usar solo cuando PI sea intencional               |
| Configuración heredada                                               | `openai-codex/gpt-*`                                                        | `openclaw doctor --fix` lo reescribe           | No escribas configuraciones nuevas de esta manera |
| Adaptador de Codex ACP/acpx                                          | ACP `sessions_spawn({ runtime: "acp" })`                                    | Estado de tarea/sesión ACP                     | Separado del arnés nativo de Codex                |

`agents.defaults.imageModel` sigue la misma división de prefijos. Use `openai/gpt-*`
para la ruta normal de OpenAI y `codex/gpt-*` solo cuando la comprensión de imágenes
deba ejecutarse a través de un turno limitado del servidor de aplicaciones Codex. No use
`openai-codex/gpt-*`; doctor reescribe ese prefijo heredado a `openai/gpt-*`.

## Patrones de implementación

### Implementación básica de Codex

Usa la configuración de inicio rápido cuando todos los turnos de agentes de OpenAI deban usar Codex de
manera predeterminada.

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

### Implementación de proveedor mixto

Esta forma mantiene a Claude como el agente predeterminado y agrega un agente de Codex con nombre:

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
agente `codex` usa el servidor de aplicaciones Codex.

### Implementación de Codex con fallo cerrado

Para los turnos del agente OpenAI, `openai/gpt-*` ya se resuelve a Codex cuando el
complemento incluido está disponible. Agregue una política de tiempo de ejecución explícita cuando desee una regla
escrita de fail-closed:

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

Con Codex forzado, OpenClaw falla temprano si el complemento de Codex está deshabilitado, el
servidor de aplicaciones es demasiado antiguo o el servidor de aplicaciones no se puede iniciar.

## Política del servidor de aplicaciones

De manera predeterminada, el complemento inicia el binario administrado de Codex de OpenClaw localmente con transporte
stdio. Establezca `appServer.command` solo cuando intencionalmente desee ejecutar un
ejecutable diferente. Use el transporte WebSocket solo cuando un servidor de aplicaciones ya esté
en ejecución en otro lugar:

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

Las sesiones locales del servidor de aplicaciones stdio tienen como valor predeterminado la postura del operador local confiable:
`approvalPolicy: "never"`, `approvalsReviewer: "user"` y
`sandbox: "danger-full-access"`. Si los requisitos locales de Codex no permiten esa
postura implícita de YOLO, OpenClaw selecciona los permisos de guardian permitidos en su lugar.
Cuando un sandbox de OpenClaw está activo para la sesión, OpenClaw restringe el `danger-full-access` de Codex al `workspace-write` de Codex para que los turnos
nativos de modo código de Codex se mantengan dentro del espacio de trabajo con sandbox. El indicador de red del turno de Codex sigue la
política de egreso del sandbox de OpenClaw: Docker `network: "none"` se mantiene sin conexión, mientras
que `network: "bridge"` o una red Docker personalizada permite el acceso de salida.
Los turnos explícitos de `workspace-write` de Codex usan el mismo indicador de red derivado del egreso.

Use el modo guardián cuando desee una auto-revisión nativa de Codex antes de escapar del sandbox
o permisos adicionales:

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

El modo Guardian se expande a las aprobaciones del servidor de aplicaciones Codex, generalmente
`approvalPolicy: "on-request"`, `approvalsReviewer: "auto_review"` y
`sandbox: "workspace-write"` cuando los requisitos locales permiten esos valores.

Para cada campo del servidor de aplicaciones, orden de autenticación, aislamiento del entorno, descubrimiento y
comportamiento de tiempo de espera, consulte [Referencia de arnés de Codex](/es/plugins/codex-harness-reference).

## Comandos y diagnósticos

El complemento incluido registra `/codex` como un comando de barra en cualquier canal que admita comandos de texto de OpenClaw.

Formas comunes:

- `/codex status` verifica la conectividad del servidor de aplicaciones, modelos, cuenta, límites de velocidad, servidores MCP y habilidades.
- `/codex models` enumera los modelos del servidor de aplicaciones Codex activos.
- `/codex threads [filter]` enumera los hilos recientes del servidor de aplicaciones Codex.
- `/codex resume <thread-id>` adjunta la sesión actual de OpenClaw a un hilo Codex existente.
- `/codex compact` solicita al servidor de aplicaciones Codex que compacte el hilo adjunto.
- `/codex review` inicia la revisión nativa de Codex para el hilo adjunto.
- `/codex diagnostics [note]` pregunta antes de enviar comentarios de Codex para el hilo adjunto.
- `/codex account` muestra el estado de la cuenta y los límites de velocidad.
- `/codex mcp` enumera el estado del servidor MCP del servidor de aplicaciones Codex.
- `/codex skills` enumera las habilidades del servidor de aplicaciones Codex.

Para la mayoría de los informes de soporte, comience con `/diagnostics [note]` en la conversación donde ocurrió el error. Crea un informe de diagnóstico de Gateway y, para las sesiones del arnés Codex, solicita aprobación para enviar el paquete de comentarios de Codex relevante. Consulte [Exportación de diagnósticos](/es/gateway/diagnostics) para ver el modelo de privacidad y el comportamiento del chat grupal.

Use `/codex diagnostics [note]` solo cuando específicamente desee la carga de comentarios de Codex para el hilo adjunto actualmente sin el paquete completo de diagnósticos de Gateway.

### Inspeccionar hilos de Codex localmente

La forma más rápida de inspeccionar una ejecución defectuosa de Codex es a menudo abrir el hilo
nativo de Codex directamente:

```bash
codex resume <thread-id>
```

Obtenga el ID del hilo de la respuesta completada `/diagnostics`, `/codex binding`, o `/codex threads [filter]`.

Para conocer los mecanismos de carga y los límites de diagnóstico a nivel de tiempo de ejecución, consulte [Tiempo de ejecución del arnés Codex](/es/plugins/codex-harness-runtime#codex-feedback-upload).

La autenticación se selecciona en este orden:

1. Perfiles de autenticación de OpenAI ordenados para el agente, preferiblemente bajo `auth.order.openai`. Los ID de perfil `openai-codex:*` existentes siguen siendo válidos.
2. La cuenta existente del app-server en el hogar de Codex de ese agente.
3. Solo para lanzamientos locales del servidor de aplicaciones stdio, `CODEX_API_KEY`, luego `OPENAI_API_KEY`, cuando no hay ninguna cuenta de servidor de aplicaciones presente y aún se requiere autenticación de OpenAI.

Cuando OpenClaw detecta un perfil de autenticación Codex estilo suscripción ChatGPT, elimina
`CODEX_API_KEY` y `OPENAI_API_KEY` del proceso secundario Codex generado. Eso
mantiene las claves de API a nivel de Gateway disponibles para incrustaciones o modelos directos de OpenAI
sin que, por accidente, los turnos nativos del servidor de aplicaciones de Codex se facturen a través de la API.
Los perfiles explícitos de clave de API de Codex y la reserva de clave de entorno stdio local utilizan el inicio de sesión
en el servidor de aplicaciones en lugar del entorno heredado del proceso secundario. Las conexiones del servidor de
aplicaciones WebSocket no reciben la reserva de clave de API de entorno del Gateway; utilice un perfil de autenticación
explícito o la cuenta propia del servidor de aplicaciones remoto.

Si un perfil de suscripción alcanza un límite de uso de Codex, OpenClaw registra la hora de restablecimiento
cuando Codex informa una e intenta el siguiente perfil de autenticación ordenado para la misma
ejecución de Codex. Cuando pasa la hora de restablecimiento, el perfil de suscripción vuelve a ser elegible
sin cambiar el modelo `openai/gpt-*` seleccionado ni el tiempo de ejecución de Codex.

Para los lanzamientos locales del servidor de aplicaciones stdio, OpenClaw establece `CODEX_HOME` en un directorio
por agente para que, de forma predeterminada, la configuración de Codex, los archivos de autenticación/cuenta, la caché/datos
del complemento y el estado del subproceso nativo no lean ni escriban el `~/.codex` personal del operador.
OpenClaw conserva el proceso normal `HOME`; los subprocesos ejecutados por Codex
todavía pueden encontrar la configuración y los tokens de inicio del usuario, y Codex puede descubrir entradas
compartidas de `$HOME/.agents/skills` y `$HOME/.agents/plugins/marketplace.json`.

Si una implementación necesita aislamiento adicional del entorno, agregue esas variables a
`appServer.clearEnv`:

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

`appServer.clearEnv` solo afecta al proceso secundario del servidor de aplicaciones Codex generado.
OpenClaw elimina `CODEX_HOME` y `HOME` de esta lista durante la normalización
del lanzamiento local: `CODEX_HOME` permanece por agente, y `HOME` permanece heredado para
que los subprocesos puedan usar el estado normal de inicio del usuario.

Las herramientas dinámicas de Codex cargan de forma predeterminada con `searchable`. OpenClaw no expone herramientas dinámicas que dupliquen las operaciones nativas del espacio de trabajo de Codex: `read`, `write`, `edit`, `apply_patch`, `exec`, `process` y `update_plan`. La mayoría de las herramientas de integración restantes de OpenClaw, como mensajería, medios, cron, navegador, nodos, puerta de enlace, `heartbeat_respond` y `web_search`, están disponibles a través de la búsqueda de herramientas de Codex bajo el espacio de nombres `openclaw`, manteniendo el contexto del modelo inicial más pequeño.
`sessions_yield` y las respuestas de origen de solo herramienta de mensaje se mantienen directas porque esos son contratos de control de turnos. `sessions_spawn` permanece searchable para que el `spawn_agent` nativo de Codex siga siendo la superficie principal del subagente de Codex, mientras que la delegación explícita de OpenClaw o ACP todavía está disponible a través del espacio de nombres de la herramienta dinámica `openclaw`. Las instrucciones de colaboración de Heartbeat le indican a Codex que busque `heartbeat_respond` antes de finalizar un turno de latido cuando la herramienta aún no está cargada.

Establezca `codexDynamicToolsLoading: "direct"` solo cuando se conecte a un servidor de aplicaciones Codex personalizado que no pueda buscar herramientas dinámicas diferidas o al depurar la carga útil completa de la herramienta.

Campos de nivel superior compatibles del complemento Codex:

| Campo                      | Predeterminado | Significado                                                                                                                   |
| -------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `codexDynamicToolsLoading` | `"searchable"` | Use `"direct"` para poner las herramientas dinámicas de OpenClaw directamente en el contexto inicial de la herramienta Codex. |
| `codexDynamicToolsExclude` | `[]`           | Nombres adicionales de herramientas dinámicas de OpenClaw para omitir en los turnos del servidor de aplicaciones de Codex.    |
| `codexPlugins`             | deshabilitado  | Compatibilidad nativa de complementos/aplicaciones de Codex para complementos curados instalados en el origen migrados.       |

Campos `appServer` compatibles:

| Campo                         | Predeterminado                                                        | Significado                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`                   | `"stdio"`                                                             | `"stdio"` genera Codex; `"websocket"` se conecta a `url`.                                                                                                                                                                                                                                                                                                                                    |
| `command`                     | binario administrado de Codex                                         | Ejecutable para el transporte stdio. Déjelo sin establecer para usar el binario administrado; establézcalo solo para una invalidación explícita.                                                                                                                                                                                                                                             |
| `args`                        | `["app-server", "--listen", "stdio://"]`                              | Argumentos para el transporte stdio.                                                                                                                                                                                                                                                                                                                                                         |
| `url`                         | sin definir                                                           | URL del servidor de aplicaciones WebSocket.                                                                                                                                                                                                                                                                                                                                                  |
| `authToken`                   | sin definir                                                           | Token de portador para el transporte WebSocket.                                                                                                                                                                                                                                                                                                                                              |
| `headers`                     | `{}`                                                                  | Cabeceras WebSocket adicionales.                                                                                                                                                                                                                                                                                                                                                             |
| `clearEnv`                    | `[]`                                                                  | Nombres de variables de entorno adicionales eliminados del proceso de la app-server stdio generada después de que OpenClaw construye su entorno heredado. OpenClaw mantiene `CODEX_HOME` por agente y `HOME` heredadas para lanzamientos locales.                                                                                                                                            |
| `requestTimeoutMs`            | `60000`                                                               | Tiempo de espera para las llamadas al plano de control del servidor de aplicaciones.                                                                                                                                                                                                                                                                                                         |
| `turnCompletionIdleTimeoutMs` | `60000`                                                               | Ventana de silencio después de que Codex acepta un turno o después de una solicitud de app-server con alcance de turno mientras OpenClaw espera `turn/completed`. Aumente esto para fases de síntesis lentas posteriores a la herramienta o solo de estado.                                                                                                                                  |
| `mode`                        | `"yolo"` a menos que los requisitos locales de Codex no permitan YOLO | Ajuste preestablecido para ejecución YOLO o revisada por guardián. Los requisitos locales de stdio que omiten `danger-full-access`, la aprobación `never` o el revisor `user` convierten al guardián predeterminado implícito.                                                                                                                                                               |
| `approvalPolicy`              | `"never"` o una política de aprobación de guardián permitida          | Política de aprobación nativa de Codex enviada al inicio/reanudación/turno del hilo. Los valores predeterminados del guardián prefieren `"on-request"` cuando se permite.                                                                                                                                                                                                                    |
| `sandbox`                     | `"danger-full-access"` o un sandbox de guardián permitido             | Modo sandbox nativo de Codex enviado al inicio/reanudación del hilo. Los valores predeterminados del guardián prefieren `"workspace-write"` cuando se permite, de lo contrario `"read-only"`. Cuando un sandbox de OpenClaw está activo, los turnos `danger-full-access` usan `workspace-write` de Codex con acceso a la red derivado de la configuración de salida del sandbox de OpenClaw. |
| `approvalsReviewer`           | `"user"` o un revisor de guardián permitido                           | Use `"auto_review"` para permitir que Codex revise las solicitudes de aprobación nativas cuando se permita, de lo contrario `guardian_subagent` o `user`. `guardian_subagent` sigue siendo un alias heredado.                                                                                                                                                                                |
| `serviceTier`                 | unset                                                                 | Nivel de servicio opcional de la aplicación Codex app-server. `"priority"` habilita el enrutamiento en modo rápido, `"flex"` solicita procesamiento flexible, `null` borra la anulación y el `"fast"` heredado se acepta como `"priority"`.                                                                                                                                                  |

Las llamadas a herramientas dinámicas propiedad de OpenClaw están delimitadas de forma independiente de `appServer.requestTimeoutMs`: las solicitudes de `item/tool/call` de Codex usan un perro guardián de OpenClaw de 30 segundos de manera predeterminada. Un argumento positivo de `timeoutMs` por llamada extiende o acorta ese presupuesto de herramienta específico. La herramienta `image_generate` también usa `agents.defaults.imageGenerationModel.timeoutMs` cuando la llamada a la herramienta no proporciona su propio tiempo de espera, y la herramienta de comprensión de medios `image` usa `tools.media.image.timeoutSeconds` o su valor predeterminado de 60 segundos para medios. Los presupuestos de herramientas dinámicas están limitados a 600000 ms. Al agotarse el tiempo, OpenClaw aborta la señal de la herramienta cuando es compatible y devuelve una respuesta de herramienta dinámica fallida a Codex para que el turno pueda continuar en lugar de dejar la sesión en `processing`.

Después de que Codex acepta un turno, y después de que OpenClaw responde a una solicitud
del servidor de aplicaciones con alcance de turno, el arnés espera que Codex realice
progresos en el turno actual y eventualmente finalice el turno nativo con `turn/completed`. Si el servidor de aplicaciones
permanece en silencio durante `appServer.turnCompletionIdleTimeoutMs`, OpenClaw interrumpe
el turno de Codex con el mejor esfuerzo posible, registra un tiempo de espera de diagnóstico
y libera el carril de la sesión de OpenClaw para que los mensajes de chat de seguimiento no
se pongan en cola detrás de un turno nativo obsoleto. La mayoría de las notificaciones no
terminales para el mismo turno desactivan ese perro guardián corto porque Codex ha demostrado
que el turno todavía está vivo; las completaciones `custom_tool_call_output` mantienen
armado el perro guardián corto posterior a la herramienta porque son la entrega del resultado
de la herramienta con alcance de turno. Las notificaciones globales del servidor de aplicaciones,
tales como actualizaciones de límites de velocidad, no restablecen el progreso de inactividad
del turno. Los elementos `agentMessage` completados y los elementos de
asistente `rawResponseItem/completed` sin procesar previos a la herramienta arman
la liberación de la salida del asistente: si Codex luego permanece en silencio sin `turn/completed`,
OpenClaw interrumpe el turno nativo con el mejor esfuerzo y libera el carril de la sesión.
El progreso del asistente sin procesar posterior a la herramienta sigue esperando `turn/completed`
o el perro guardián terminal. Los diagnósticos de tiempo de espera incluyen el último método
de notificación del servidor de aplicaciones y, para los elementos de respuesta del asistente
sin procesar, el tipo de elemento, el rol, el id y una vista previa del texto del asistente limitada.

Las anulaciones de entorno siguen disponibles para pruebas locales:

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

`OPENCLAW_CODEX_APP_SERVER_BIN` omite el binario administrado cuando
`appServer.command` no está establecido.

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` se eliminó. Use
`plugins.entries.codex.config.appServer.mode: "guardian"` en su lugar, o
`OPENCLAW_CODEX_APP_SERVER_MODE=guardian` para pruebas locales puntuales. Se prefiere
la configuración para despliegues repetibles porque mantiene el comportamiento del complemento
en el mismo archivo revisado que el resto de la configuración del arnés de Codex.

## Complementos nativos de Codex

La compatibilidad con complementos nativos de Codex utiliza las propias capacidades de
aplicación y complementos del servidor de aplicaciones de Codex en el mismo hilo de Codex
que el turno del arnés de OpenClaw. OpenClaw no traduce los complementos de Codex en herramientas
dinámicas `codex_plugin_*` sintéticas de OpenClaw.

`codexPlugins` afecta solo a las sesiones que seleccionan el harness nativo de Codex. No tiene ningún efecto en las ejecuciones de PI, las ejecuciones normales del proveedor de OpenAI, los enlaces de conversaciones de ACP u otros harnesses.

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

La configuración de la aplicación del subproceso se calcula cuando OpenClaw establece una sesión de harness de Codex o reemplaza un enlace de subproceso de Codex obsoleto. No se recalcula en cada turno. Después de cambiar `codexPlugins`, use `/new`, `/reset` o reinicie la puerta de enlace para que las sesiones futuras del harness de Codex comiencen con el conjunto de aplicaciones actualizado.

Para la elegibilidad de migración, el inventario de aplicaciones, la política de acciones destructivas, las elicitaciones y los diagnósticos de complementos nativos, consulte [Complementos nativos de Codex](/es/plugins/codex-native-plugins).

## Uso del ordenador

El uso del equipo se trata en su propia guía de configuración: [Uso del equipo de Codex](/es/plugins/codex-computer-use).

La versión corta: OpenClaw no proporciona la aplicación de control del escritorio ni ejecuta acciones del escritorio por sí mismo. Prepara el servidor de aplicaciones de Codex, verifica que el servidor MCP `computer-use` esté disponible y luego permite que Codex sea el propietario de las llamadas a herramientas MCP nativas durante los turnos en modo Codex.

## Límites de tiempo de ejecución

El arnés de Codex cambia solo el ejecutor del agente integrado de bajo nivel.

- Se admiten herramientas dinámicas de OpenClaw. Codex pide a OpenClaw que ejecute esas herramientas, por lo que OpenClaw permanece en la ruta de ejecución.
- Las herramientas nativas de shell, patch, MCP y de aplicación nativas de Codex son propiedad de Codex. OpenClaw puede observar o bloquear eventos nativos seleccionados a través del relé admitido, pero no reescribe los argumentos de las herramientas nativas.
- Codex es el propietario de la compactación nativa a menos que el motor de contexto de OpenClaw activo declare `ownsCompaction: true`. OpenClaw mantiene un espejo de la transcripción para el historial del canal, la búsqueda, `/new`, `/reset` y el cambio futuro de modelo o harness.
- La generación de medios, la comprensión de medios, el TTS, las aprobaciones y el resultado de la herramienta de mensajería continúan a través de la configuración de proveedor/modelo de OpenClaw coincidente.
- `tool_result_persist` se aplica a los resultados de la herramienta de transcripción propiedad de OpenClaw, no a los registros de resultados de herramientas nativas de Codex.

Para las capas de enlaces, las superficies V1 admitidas, el manejo de permisos nativos, la dirección de la cola, la mecánica de carga de comentarios de Codex y los detalles de compactación, consulte [Tiempo de ejecución del harness de Codex](/es/plugins/codex-harness-runtime).

## Solución de problemas

**Codex no aparece como un proveedor `/model` normal:** esto es esperado para las nuevas configuraciones. Seleccione un modelo `openai/gpt-*`, habilite `plugins.entries.codex.enabled` y verifique si `plugins.allow` excluye `codex`.

**OpenClaw usa PI en lugar de Codex:** asegúrese de que la referencia del modelo sea
`openai/gpt-*` en el proveedor oficial de OpenAI y que el complemento Codex esté
instalado y habilitado. Si necesita una prueba estricta durante las pruebas, establezca el proveedor o
el modelo `agentRuntime.id: "codex"`. Un tiempo de ejecución de Codex forzado falla en lugar de
recuperar con PI.

**El tiempo de ejecución de OpenAI Codex vuelve a la ruta de clave de API:** recopile un extracto de puerta de enlace redactado que muestre el modelo, el tiempo de ejecución, el proveedor seleccionado y el fallo. Pida a los colaboradores afectados que ejecuten este comando de solo lectura en su host OpenClaw:

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

Los extractos útiles suelen incluir `openai/gpt-5.5` o `openai/gpt-5.4`,
`Runtime: OpenAI Codex`, `agentRuntime.id` o `harnessRuntime`,
`candidateProvider: "openai"`, y un resultado `401`, `Incorrect API key` o
`No API key`. Una ejecución corregida debería mostrar la ruta OAuth `openai-codex`
en lugar de un fallo de clave API de OpenAI sin formato.

**La configuración heredada `openai-codex/*` permanece:** ejecute `openclaw doctor --fix`.
Doctor reescribe las referencias de modelo heredadas a `openai/*`, elimina los pines de tiempo de ejecución de sesión obsoletos y
de agente completo, y conserva las anulaciones de perfil de autenticación existentes.

**El servidor de aplicaciones es rechazado:** use el servidor de aplicaciones Codex `0.125.0` o más reciente.
Las versiones preliminares de la misma versión o versiones con sufijo de compilación, como
`0.125.0-alpha.2` o `0.125.0+custom`, son rechazadas porque OpenClaw prueba el
piso del protocolo estable `0.125.0`.

**`/codex status` no puede conectarse:** verifique que el complemento incluido `codex` esté
habilitado, que `plugins.allow` lo incluya cuando se configure una lista de permitidos, y
que cualquier `appServer.command`, `url`, `authToken` o encabezados personalizados sean válidos.

**El descubrimiento de modelos es lento:** reduzca
`plugins.entries.codex.config.discovery.timeoutMs` o desactive el descubrimiento. Consulte
[Referencia del arnés de Codex](/es/plugins/codex-harness-reference#model-discovery).

**El transporte WebSocket falla inmediatamente:** verifique `appServer.url`, `authToken`,
los encabezados y que el servidor de aplicaciones remoto hable la misma versión del protocolo del
servidor de aplicaciones Codex.

**Un modelo que no es de Codex usa PI:** eso es esperado a menos que la política del proveedor o del tiempo de ejecución del modelo la enrute a otro arnés. Las referencias de proveedores que no son de OpenAI se mantienen en su ruta de proveedor normal en el modo `auto`.

**Computer Use está instalado pero las herramientas no se ejecutan:** verifique `/codex computer-use status` desde una sesión nueva. Si una herramienta reporta `Native hook relay unavailable`, use `/new` o `/reset`; si persiste, reinicie la puerta de enlace para borrar los registros de enlaces nativos obsoletos. Vea [Codex Computer Use](/es/plugins/codex-computer-use#troubleshooting).

## Relacionado

- [Referencia del arnés Codex](/es/plugins/codex-harness-reference)
- [Tiempo de ejecución del arnés Codex](/es/plugins/codex-harness-runtime)
- [Complementos nativos de Codex](/es/plugins/codex-native-plugins)
- [Uso de computadora de Codex](/es/plugins/codex-computer-use)
- [Tiempos de ejecución del agente](/es/concepts/agent-runtimes)
- [Proveedores de modelos](/es/concepts/model-providers)
- [Proveedor OpenAI](/es/providers/openai)
- [Complementos de arnés de agente](/es/plugins/sdk-agent-harness)
- [Ganchos de complementos](/es/plugins/hooks)
- [Exportación de diagnósticos](/es/gateway/diagnostics)
- [Estado](/es/cli/status)
- [Pruebas](/es/help/testing-live#live-codex-app-server-harness-smoke)
