---
summary: "Configuración, autenticación, descubrimiento y referencia del servidor de aplicaciones para el arnés Codex"
title: "Referencia del arnés Codex"
read_when:
  - You need every Codex harness config field
  - You are changing app-server transport, auth, discovery, or timeout behavior
  - You are debugging Codex harness startup, model discovery, or environment isolation
---

Esta referencia cubre la configuración detallada del complemento `codex` incluido. Para decisiones de configuración y enrutamiento, comience con [Codex harness](/es/plugins/codex-harness).

## Superficie de configuración del complemento

Todos los ajustes del arnés Codex se encuentran en `plugins.entries.codex.config`.

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          discovery: {
            enabled: true,
            timeoutMs: 2500,
          },
          appServer: {
            mode: "guardian",
          },
        },
      },
    },
  },
}
```

Campos de nivel superior compatibles:

| Campo                      | Predeterminado                              | Significado                                                                                                                                                                                         |
| -------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `discovery`                | habilitado                                  | Configuración de descubrimiento de modelos para el servidor de aplicaciones Codex `model/list`.                                                                                                     |
| `appServer`                | servidor de aplicaciones stdio administrado | Configuraciones de transporte, comando, autenticación, aprobación, espacio aislado y tiempo de espera.                                                                                              |
| `codexDynamicToolsLoading` | `"searchable"`                              | Use `"direct"` para colocar las herramientas dinámicas de OpenClaw directamente en el contexto de la herramienta Codex inicial.                                                                     |
| `codexDynamicToolsExclude` | `[]`                                        | Nombres de herramientas dinámicas adicionales de OpenClaw para omitir en los turnos del servidor de aplicaciones de Codex.                                                                          |
| `codexPlugins`             | deshabilitado                               | Compatibilidad con complementos/aplicaciones nativas de Codex para complementos de Codex de primera parte configurados. Consulte [Complementos nativos de Codex](/es/plugins/codex-native-plugins). |
| `computerUse`              | deshabilitado                               | Configuración de uso de computadora Codex. Consulte [Codex Computer Use](/es/plugins/codex-computer-use).                                                                                           |

## Transporte del servidor de aplicaciones

De forma predeterminada, OpenClaw inicia el binario administrado de Codex enviado con el complemento
incluido:

```bash
codex app-server --listen stdio://
```

Esto mantiene la versión del servidor de aplicaciones vinculada al complemento `codex` incluido en lugar de
a cualquier CLI de Codex separado que suceda estar instalado localmente. Establezca
`appServer.command` solo cuando intencionalmente desee ejecutar un
ejecutable diferente.

Para un servidor de aplicaciones que ya se está ejecutando, use el transporte WebSocket:

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
            requestTimeoutMs: 60000,
          },
        },
      },
    },
  },
}
```

Campos `appServer` admitidos:

| Campo                                         | Predeterminado                                                        | Significado                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `transport`                                   | `"stdio"`                                                             | `"stdio"` genera Codex; `"websocket"` se conecta a `url`.                                                                                                                                                                                                                                                                                                                                                                                                          |
| `command`                                     | binario administrado de Codex                                         | Ejecutable para el transporte stdio. Déjelo sin configurar para usar el binario administrado.                                                                                                                                                                                                                                                                                                                                                                      |
| `args`                                        | `["app-server", "--listen", "stdio://"]`                              | Argumentos para el transporte stdio.                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `url`                                         | sin configurar                                                        | URL del servidor de aplicaciones WebSocket.                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `authToken`                                   | sin configurar                                                        | Token de portador para el transporte WebSocket.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `headers`                                     | `{}`                                                                  | Encabezados adicionales de WebSocket.                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `clearEnv`                                    | `[]`                                                                  | Nombres adicionales de variables de entorno eliminados del proceso del servidor de aplicaciones stdio generado después de que OpenClaw construye su entorno heredado.                                                                                                                                                                                                                                                                                              |
| `requestTimeoutMs`                            | `60000`                                                               | Tiempo de espera para las llamadas al plano de control del servidor de aplicaciones.                                                                                                                                                                                                                                                                                                                                                                               |
| `turnCompletionIdleTimeoutMs`                 | `60000`                                                               | Ventana de silencio después de que Codex acepta un turno o después de una solicitud de app-server con ámbito de turno, mientras OpenClaw espera `turn/completed`.                                                                                                                                                                                                                                                                                                  |
| `postToolRawAssistantCompletionIdleTimeoutMs` | `300000`                                                              | Guarda de finalización en inactividad y de progreso utilizada después de una entrega de herramienta, finalización de herramienta nativa o progreso del asistente sin procesar posterior a la herramienta mientras OpenClaw espera `turn/completed`. Úselo para cargas de trabajo confiables o pesadas donde la síntesis posterior a la herramienta puede legítimamente permanecer en silencio por más tiempo que el presupuesto de liberación final del asistente. |
| `mode`                                        | `"yolo"` a menos que los requisitos locales de Codex no permitan YOLO | Configuración preestablecida para ejecución YOLO o revisada por un guardián.                                                                                                                                                                                                                                                                                                                                                                                       |
| `approvalPolicy`                              | `"never"` o una política de aprobación de guardián permitida          | Política de aprobación nativa de Codex enviada al inicio, reanudación y turno del hilo.                                                                                                                                                                                                                                                                                                                                                                            |
| `sandbox`                                     | `"danger-full-access"` o un espacio aislado de guardián permitido     | Modo de espacio aislado nativo de Codex enviado al inicio y reanudación del hilo. Los espacios aislados activos de OpenClaw limitan los turnos de `danger-full-access` a Codex `workspace-write`; el indicador de red del turno sigue la salida del espacio aislado de OpenClaw.                                                                                                                                                                                   |
| `approvalsReviewer`                           | `"user"` o un revisor de guardián permitido                           | Use `"auto_review"` para permitir que Codex revise las indicaciones de aprobación nativas cuando esté permitido.                                                                                                                                                                                                                                                                                                                                                   |
| `defaultWorkspaceDir`                         | directorio del proceso actual                                         | Espacio de trabajo utilizado por `/codex bind` cuando se omite `--cwd`.                                                                                                                                                                                                                                                                                                                                                                                            |
| `serviceTier`                                 | sin establecer                                                        | Nivel de servicio opcional del servidor de aplicaciones Codex. `"priority"` habilita el enrutamiento en modo rápido, `"flex"` solicita procesamiento flexible y `null` borra la anulación. El `"fast"` heredado se acepta como `"priority"`.                                                                                                                                                                                                                       |
| `experimental.sandboxExecServer`              | `false`                                                               | Opt-in de vista previa que registra un entorno Codex respaldado por un entorno de pruebas (sandbox) de OpenClaw con Codex app-server 0.132.0 o más reciente para que la ejecución nativa de Codex pueda ejecutarse dentro del entorno de pruebas activo de OpenClaw.                                                                                                                                                                                               |

El complemento bloquea los protocolos de enlace del servidor de aplicaciones antiguos o sin versión. El servidor de aplicaciones Codex debe informar la versión estable `0.125.0` o más reciente.

## Modos de aprobación y espacio aislado (sandbox)

Las sesiones locales del servidor de aplicaciones stdio usan por defecto el modo YOLO:
`approvalPolicy: "never"`, `approvalsReviewer: "user"` y
`sandbox: "danger-full-access"`. Esta postura de operador local de confianza permite
que los turnos y latidos de OpenClaw no supervisados progresen sin avisos de aprobación
nativa que nadie esté presente para responder.

Si el archivo de requisitos del sistema local de Codex no permite la aprobación YOLO implícita,
valores de revisor o de sandbox, OpenClaw trata el valor predeterminado implícito como guardian
en su lugar y selecciona los permisos de guardian permitidos. `tools.exec.mode: "auto"`
también fuerza aprobaciones de Codex revisadas por guardian y no preserva anulaciones `approvalPolicy: "never"`
o `sandbox: "danger-full-access"` heredadas inseguras;
establezca `tools.exec.mode: "full"` para una postura intencional sin aprobación.
Las entradas `[[remote_sandbox_config]]` que coinciden con el nombre de host
en el mismo archivo de requisitos se respetan para la decisión predeterminada del sandbox.

Establezca `appServer.mode: "guardian"` para aprobaciones de Codex revisadas por guardian:

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

La preconfiguración `guardian` se expande a `approvalPolicy: "on-request"`,
`approvalsReviewer: "auto_review"` y `sandbox: "workspace-write"` cuando esos
valores están permitidos. Los campos de política individuales anulan `mode`. El valor
de revisor `guardian_subagent` más antiguo todavía se acepta como un alias de compatibilidad,
pero las nuevas configuraciones deben usar `auto_review`.

Cuando un sandbox de OpenClaw está activo, el proceso local del servidor de aplicaciones Codex aún
se ejecuta en el host de Gateway. Por lo tanto, OpenClaw deshabilita el modo de código nativo de Codex,
los servidores MCP de usuario y la ejecución de complementos respaldados por la aplicación para ese turno en lugar de
tratar el sandbox del lado del host de Codex como equivalente al backend del sandbox
de OpenClaw. El acceso a Shell se expone a través de herramientas dinámicas respaldadas por el sandbox de OpenClaw
tales como `sandbox_exec` y `sandbox_process` cuando las herramientas normales de exec/process
están disponibles.

En hosts de Ubuntu/AppArmor, Codex bwrap puede fallar bajo `workspace-write` antes
de que se inicie el comando del shell cuando ejecuta intencionadamente Codex nativo
`workspace-write` sin el sandboxing activo de OpenClaw. Si ve
`bwrap: setting up uid map: Permission denied` o
`bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted`, ejecute
`openclaw doctor` y corrija la política de espacio de nombres del host informada para el usuario del servicio OpenClaw
en lugar de otorgar privilegios más amplios al contenedor de Docker. Prefiera
un perfil de AppArmor con ámbito para el proceso del servicio; la alternativa
`kernel.apparmor_restrict_unprivileged_userns=0` es para todo el host y tiene
compensaciones de seguridad.

## Ejecución nativa en sandbox

El valor predeterminado establecido es fail-closed (fallar cerrado): el sandboxing activo de OpenClaw deshabilita las
superficies de ejecución nativa de Codex que, de otro modo, se ejecutarían desde el host del servidor de aplicaciones
de Codex. Use `appServer.experimental.sandboxExecServer: true` solo cuando quiera
probar la compatibilidad con el entorno remoto de Codex con el backend de sandbox de OpenClaw. Esta
ruta de vista previa requiere Codex app-server 0.132.0 o más reciente.

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            experimental: {
              sandboxExecServer: true,
            },
          },
        },
      },
    },
  },
}
```

Cuando el indicador está activado y la sesión actual de OpenClaw está en sandbox, OpenClaw
inicia un exec-server de bucle de retorno local respaldado por el sandbox activo, lo registra
con el servidor de aplicaciones de Codex e inicia el hilo y el turno de Codex con ese
entorno propiedad de OpenClaw. Si el servidor de aplicaciones no puede registrar el entorno,
la ejecución falla de forma cerrada en lugar de volver silenciosamente a la ejecución del host.

Esta ruta de vista previa es solo local. Un servidor de aplicaciones WebSocket remoto no puede alcanzar el
exec-server de bucle de retorno a menos que se esté ejecutando en el mismo host, por lo que OpenClaw rechaza
esa combinación.

## Autenticación y aislamiento del entorno

La autenticación se selecciona en este orden:

1. Un perfil de autenticación explícito de OpenClaw Codex para el agente.
2. La cuenta existente del servidor de aplicaciones en el directorio de inicio (home) de Codex de ese agente.
3. Solo para lanzamientos locales del servidor de aplicaciones stdio, `CODEX_API_KEY`, luego
   `OPENAI_API_KEY`, cuando no hay ninguna cuenta de servidor de aplicaciones y la autenticación de OpenAI es
   todavía necesaria.

Cuando OpenClaw ve un perfil de autenticación de Codex de estilo suscripción a ChatGPT, elimina
`CODEX_API_KEY` y `OPENAI_API_KEY` del proceso hijo de Codex generado. Eso
mantiene las claves API de nivel de Gateway disponibles para incrustaciones o modelos directos de OpenAI
sin hacer que los turnos del servidor de aplicaciones de Codex nativo se facturen a través de la API por accidente.

Los perfiles explícitos de API-key de Codex y la reserva de clave de entorno stdio local utilizan el inicio de sesión de app-server en lugar del entorno del proceso secundario heredado. Las conexiones de app-server WebSocket no reciben la reserva de API-key de entorno de Gateway; utilice un perfil de autenticación explícito o la propia cuenta del app-server remoto.

Los lanzamientos del servidor de aplicaciones stdio heredan el entorno de proceso de OpenClaw de forma predeterminada.
OpenClaw posee el puente de la cuenta del servidor de aplicaciones de Codex y establece `CODEX_HOME` en un
directorio por agente debajo del estado de OpenClaw de ese agente. Eso mantiene la configuración de Codex,
las cuentas, la caché/datos de complementos y el estado de los hilos limitados al agente de OpenClaw
en lugar de filtrarse desde el personal `~/.codex` home del operador.

OpenClaw no reescribe `HOME` para los lanzamientos normales del servidor de aplicaciones local. Los subprocesos de Codex-run como `openclaw`, `gh`, `git`, los CLIs de la nube y los comandos de shell ven el inicio del proceso normal y pueden encontrar la configuración y los tokens del inicio de usuario. Codex también puede descubrir `$HOME/.agents/skills` y `$HOME/.agents/plugins/marketplace.json`; ese `.agents` descubrimiento se comparte intencionalmente con el inicio del operador y está separado del estado `~/.codex` aislado.

Los complementos de OpenClaw y las instantáneas de habilidades de OpenClaw aún fluyen a través del propio registro de complementos y cargador de habilidades de OpenClaw. Los activos personales `~/.codex` de Codex no lo hacen. Si tiene habilidades útiles de CLI de Codex o complementos de un inicio de Codex que deberían convertirse en parte de un agente de OpenClaw, inventaríelos explícitamente:

```bash
openclaw migrate codex --dry-run
openclaw migrate apply codex --yes
```

Si un despliegue necesita aislamiento de entorno adicional, añada esas variables a `appServer.clearEnv`:

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

`appServer.clearEnv` solo afecta al proceso secundario del servidor de aplicaciones de Codex generado. OpenClaw elimina `CODEX_HOME` y `HOME` de esta lista durante la normalización del lanzamiento local: `CODEX_HOME` permanece por agente, y `HOME` permanece heredado para que los subprocesos puedan usar el estado normal del inicio de usuario.

## Herramientas dinámicas

Las herramientas dinámicas de Codex se cargan por defecto `searchable`. OpenClaw no expone herramientas dinámicas que duplican las operaciones del espacio de trabajo nativas de Codex:

- `read`
- `write`
- `edit`
- `apply_patch`
- `exec`
- `process`
- `update_plan`

La mayoría de las herramientas de integración de OpenClaw restantes, como mensajería, medios, cron, navegador, nodos, puerta de enlace, `heartbeat_respond` y `web_search`, están disponibles a través de la búsqueda de herramientas de Codex bajo el espacio de nombres `openclaw`. Esto mantiene el contexto inicial del modelo más pequeño. `sessions_yield` y las respuestas de origen exclusivas de herramientas de mensajes permanecen directas porque son contratos de control de turnos. `sessions_spawn` permanece buscable para que el `spawn_agent` nativo de Codex siga siendo la superficie principal del subagente Codex, mientras que la delegación explícita de OpenClaw o ACP todavía está disponible a través del espacio de nombres de herramientas dinámicas `openclaw`.

Establezca `codexDynamicToolsLoading: "direct"` solo al conectarse a un servidor de aplicaciones Codex personalizado que no pueda buscar herramientas dinámicas diferidas o al depurar la carga útil completa de la herramienta.

## Tiempos de espera

Las llamadas a herramientas dinámicas propiedad de OpenClaw están limitadas independientemente de `appServer.requestTimeoutMs`. Cada solicitud `item/tool/call` de Codex utiliza el primer tiempo de espera disponible en este orden:

- Un argumento `timeoutMs` positivo por llamada.
- Para `image_generate`, `agents.defaults.imageGenerationModel.timeoutMs`.
- Para `image_generate` sin un tiempo de espera configurado, el valor predeterminado de 120 segundos para la generación de imágenes.
- Para la herramienta `image` de comprensión de medios, `tools.media.image.timeoutSeconds` convertido a milisegundos, o el valor predeterminado de medios de 60 segundos.
- El valor predeterminado de 90 segundos para herramientas dinámicas.

Los presupuestos de herramientas dinámicas tienen un límite de 600000 ms. En caso de tiempo de espera, OpenClaw aborta la señal de la herramienta cuando es compatible y devuelve una respuesta de herramienta dinámica fallida a Codex para que el turno pueda continuar en lugar de dejar la sesión en `processing`.

Después de que Codex acepta un turno y después de que OpenClaw responde a una solicitud del servidor de aplicaciones con ámbito de turno, el arnés espera que Codex realice el progreso del turno actual y eventualmente finalice el turno nativo con `turn/completed`. Si el servidor de aplicaciones permanece en silencio durante `appServer.turnCompletionIdleTimeoutMs`, OpenClaw interrumpe el turno de Codex con el mejor esfuerzo, registra un tiempo de espera de diagnóstico y libera el carril de sesión de OpenClaw para que los mensajes de chat de seguimiento no se pongan en cola detrás de un turno nativo obsoleto.

La mayoría de las notificaciones no terminales para el mismo turno desactivan ese perro guardián (watchdog) corto porque Codex ha demostrado que el turno aún está vivo. Las transferencias de herramientas (tool handoffs) usan un presupuesto de inactividad posterior a la herramienta más largo: después de que OpenClaw devuelve una respuesta `item/tool/call`, después de que los elementos de herramientas nativas como `commandExecution` se completan, después de las `custom_tool_call_output` completiones sin procesar y después del progreso del asistente sin procesar posterior a la herramienta. El guardia usa `appServer.postToolRawAssistantCompletionIdleTimeoutMs` cuando está configurado y, de lo contrario, tiene como valor predeterminado cinco minutos. Ese mismo presupuesto posterior a la herramienta también extiende el perro guardián de progreso para la ventana de síntesis silenciosa antes de que Codex emita el siguiente evento de turno actual. Las `agentMessage` completiones de razonamiento, las `agentMessage` completiones de comentarios y el progreso sin procesar de razonamiento o asistente previo a la herramienta pueden ir seguidas de una respuesta final automática, por lo que usan el guardia de respuesta posterior al progreso en lugar de liberar el carril de sesión inmediatamente. Solo los elementos `agentMessage` completados finales/no comentarios y las `agentMessage` completiones del asistente sin procesar previo a la herramienta activan la liberación de salida del asistente: si Codex luego se queda en silencio sin `turn/completed`, OpenClaw interrumpe el turno nativo con el mejor esfuerzo posible y libera el carril de sesión. Los fallos del servidor de aplicaciones stdio seguros para repetición (replay-safe), incluidos los tiempos de espera de inactividad de finalización de turno sin asistente, herramienta, elemento activo o evidencia de efectos secundarios, se reintentan una vez en un nuevo intento del servidor de aplicaciones. Los tiempos de espera no seguros aún retiran el cliente del servidor de aplicaciones atascado y liberan el carril de sesión de OpenClaw. También borran el enlace del subproceso nativo obsoleto y muestran un mensaje de tiempo de espera recuperable para el juicio del usuario o del mantenedor en lugar de reproducirse automáticamente. Los diagnósticos de tiempo de espera incluyen el último método de notificación del servidor de aplicaciones y, para los elementos de respuesta del asistente sin procesar, el tipo de elemento, el rol, el identificador y una vista previa del texto del asistente limitada.

## Descubrimiento de modelos

De forma predeterminada, el complemento Codex solicita al servidor de aplicaciones los modelos disponibles. La disponibilidad de modelos es propiedad del servidor de aplicaciones Codex, por lo que la lista puede cambiar cuando OpenClaw actualiza la versión del `@openai/codex` incluido o cuando una implementación apunta `appServer.command` a un binario Codex diferente. La disponibilidad también puede estar limitada a una cuenta. Use `/codex models` en una puerta de enlace en ejecución para ver el catálogo en vivo para ese arnés y cuenta.

Si el descubrimiento falla o se agota el tiempo, OpenClaw usa un catálogo de respaldo incluido para:

- GPT-5.5
- GPT-5.4 mini
- GPT-5.2

El arnés incluido actualmente es `@openai/codex` `0.135.0`. Una sonda `model/list`
contra ese servidor de aplicaciones incluido devolvió:

| Id. de modelo         | Predeterminado | Oculto | Modalidades de entrada | Esfuerzos de razonamiento |
| --------------------- | -------------- | ------ | ---------------------- | ------------------------- |
| `gpt-5.5`             | Sí             | No     | texto, imagen          | bajo, medio, alto, xalto  |
| `gpt-5.4`             | No             | No     | texto, imagen          | bajo, medio, alto, xalto  |
| `gpt-5.4-mini`        | No             | No     | texto, imagen          | bajo, medio, alto, xalto  |
| `gpt-5.3-codex`       | No             | No     | texto, imagen          | bajo, medio, alto, xalto  |
| `gpt-5.3-codex-spark` | No             | No     | texto                  | bajo, medio, alto, xalto  |
| `gpt-5.2`             | No             | No     | texto, imagen          | bajo, medio, alto, xalto  |

Los modelos ocultos pueden ser devueltos por el catálogo del servidor de aplicaciones para flujos internos o especializados, pero no son opciones normales del selector de modelos.

Ajuste el descubrimiento bajo `plugins.entries.codex.config.discovery`:

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          discovery: {
            enabled: true,
            timeoutMs: 2500,
          },
        },
      },
    },
  },
}
```

Deshabilite el descubrimiento cuando desee que el inicio evite sondear Codex y utilice solo el catálogo de reserva:

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          discovery: {
            enabled: false,
          },
        },
      },
    },
  },
}
```

## Archivos de arranque del espacio de trabajo

Codex maneja `AGENTS.md` por sí mismo a través del descubrimiento nativo de documentos del proyecto. OpenClaw no escribe documentos de proyecto de Codex sintéticos ni depende de los nombres de archivo alternativos de Codex para los archivos de persona, porque las alternativas de Codex solo se aplican cuando `AGENTS.md` falta.

Para la paridad del espacio de trabajo de OpenClaw, el arnés Codex resuelve los otros archivos
de inicialización. `SOUL.md`, `IDENTITY.md`, `TOOLS.md` y `USER.md` se reenvían como
instrucciones de desarrollador de OpenClaw Codex porque definen el agente activo,
la guía del espacio de trabajo disponible y el perfil de usuario. La lista compacta de habilidades
de OpenClaw se reenvía como instrucciones de desarrollador de colaboración con alcance por turno.
El contenido de `HEARTBEAT.md` no se inyecta; los turnos de latido obtienen un puntero
en modo de colaboración para leer el archivo cuando existe y no está vacío. El contenido de `MEMORY.md`
del espacio de trabajo del agente configurado no se pega en la entrada de turno de Codex nativo
cuando las herramientas de memoria están disponibles para ese espacio de trabajo; cuando existe, el arnés
añade un pequeño puntero de memoria del espacio de trabajo a las instrucciones de desarrollador de colaboración
con alcance por turno y Codex debería usar `memory_search` o `memory_get` cuando la memoria
duradera sea relevante. Si las herramientas están deshabilitadas, la búsqueda de memoria no está disponible o el
espacio de trabajo activo difiere del espacio de trabajo de memoria del agente, `MEMORY.md` usa la
ruta normal de contexto de turno delimitado.
`BOOTSTRAP.md`, cuando está presente, se reenvía como contexto de referencia de entrada de turno de OpenClaw.

## Invalidaciones de entorno

Las invalidaciones de entorno siguen disponibles para las pruebas locales:

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

`OPENCLAW_CODEX_APP_SERVER_BIN` omite el binario administrado cuando
`appServer.command` no está establecido.

Se eliminó `OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1`. Use
`plugins.entries.codex.config.appServer.mode: "guardian"` en su lugar, o
`OPENCLAW_CODEX_APP_SERVER_MODE=guardian` para pruebas locales únicas. Se prefiere la configuración
para despliegues repetibles porque mantiene el comportamiento del complemento en el
mismo archivo revisado que el resto de la configuración del arnés Codex.

## Relacionado

- [Arnés Codex](/es/plugins/codex-harness)
- [Tiempo de ejecución del arnés Codex](/es/plugins/codex-harness-runtime)
- [Complementos nativos de Codex](/es/plugins/codex-native-plugins)
- [Uso del equipo de Codex](/es/plugins/codex-computer-use)
- [Proveedor OpenAI](/es/providers/openai)
- [Referencia de configuración](/es/gateway/configuration-reference)
