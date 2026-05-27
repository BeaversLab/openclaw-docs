---
summary: "Configuración, autenticación, descubrimiento y referencia del servidor de aplicaciones para el arnés Codex"
title: "Referencia del arnés Codex"
read_when:
  - You need every Codex harness config field
  - You are changing app-server transport, auth, discovery, or timeout behavior
  - You are debugging Codex harness startup, model discovery, or environment isolation
---

Esta referencia cubre la configuración detallada para el complemento `codex`
incluido. Para la configuración y las decisiones de enrutamiento, comience con
[Arnés Codex](/es/plugins/codex-harness).

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

| Campo                      | Predeterminado                              | Significado                                                                                                                                                                                  |
| -------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `discovery`                | habilitado                                  | Configuración de descubrimiento de modelos para el servidor de aplicaciones Codex `model/list`.                                                                                              |
| `appServer`                | servidor de aplicaciones stdio administrado | Configuraciones de transporte, comando, autenticación, aprobación, espacio aislado y tiempo de espera.                                                                                       |
| `codexDynamicToolsLoading` | `"searchable"`                              | Use `"direct"` para colocar las herramientas dinámicas de OpenClaw directamente en el contexto de la herramienta Codex inicial.                                                              |
| `codexDynamicToolsExclude` | `[]`                                        | Nombres de herramientas dinámicas adicionales de OpenClaw para omitir en los turnos del servidor de aplicaciones de Codex.                                                                   |
| `codexPlugins`             | deshabilitado                               | Soporte nativo del complemento/aplicación Codex para complementos curados instalados desde la fuente y migrados. Consulte [Complementos nativos de Codex](/es/plugins/codex-native-plugins). |
| `computerUse`              | deshabilitado                               | Configuración de uso de computadora de Codex. Consulte [Uso de computadora de Codex](/es/plugins/codex-computer-use).                                                                        |

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

| Campo                                         | Predeterminado                                                                 | Significado                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`                                   | `"stdio"`                                                                      | `"stdio"` genera Codex; `"websocket"` se conecta a `url`.                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `command`                                     | binario administrado de Codex                                                  | Ejecutable para el transporte stdio. Déjelo sin configurar para usar el binario administrado.                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `args`                                        | `["app-server", "--listen", "stdio://"]`                                       | Argumentos para el transporte stdio.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `url`                                         | sin configurar                                                                 | URL del servidor de aplicaciones WebSocket.                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `authToken`                                   | sin configurar                                                                 | Token de portador para el transporte WebSocket.                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `headers`                                     | `{}`                                                                           | Encabezados adicionales de WebSocket.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `clearEnv`                                    | `[]`                                                                           | Nombres adicionales de variables de entorno eliminados del proceso del servidor de aplicaciones stdio generado después de que OpenClaw construye su entorno heredado.                                                                                                                                                                                                                                                                                                                                                   |
| `requestTimeoutMs`                            | `60000`                                                                        | Tiempo de espera para las llamadas al plano de control del servidor de aplicaciones.                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `turnCompletionIdleTimeoutMs`                 | `60000`                                                                        | Ventana de silencio después de que Codex acepta un turno o después de una solicitud de app-server con ámbito de turno, mientras OpenClaw espera `turn/completed`.                                                                                                                                                                                                                                                                                                                                                       |
| `postToolRawAssistantCompletionIdleTimeoutMs` | sin establecer                                                                 | Guardia de inactividad de finalización utilizado después de una entrega de herramienta cuando Codex emite una finalización o progreso en bruto del asistente, pero no envía `turn/completed`. Por defecto es el tiempo de espera de inactividad de finalización del asistente cuando no está establecido. Use esto para cargas de trabajo confiables o pesadas donde la síntesis posterior a la herramienta legítimamente puede permanecer en silencio más tiempo que el presupuesto de liberación final del asistente. |
| `mode`                                        | `"yolo"` a menos que los requisitos locales de Codex no permitan YOLO          | Configuración preestablecida para ejecución YOLO o revisada por un guardián.                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `approvalPolicy`                              | `"never"` o una política de aprobación de guardián permitida                   | Política de aprobación nativa de Codex enviada al inicio, reanudación y turno del hilo.                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `sandbox`                                     | `"danger-full-access"` o un entorno de pruebas (sandbox) de guardián permitido | Modo de entorno de pruebas (sandbox) nativo de Codex enviado al inicio y reanudación del hilo. Los entornos de pruebas activos de OpenClaw limitan los turnos de `danger-full-access` a Codex `workspace-write`; el indicador de red del turno sigue la salida del entorno de pruebas de OpenClaw.                                                                                                                                                                                                                      |
| `approvalsReviewer`                           | `"user"` o un revisor guardián permitido                                       | Use `"auto_review"` para permitir que Codex revise las indicaciones de aprobación nativas cuando esté permitido.                                                                                                                                                                                                                                                                                                                                                                                                        |
| `defaultWorkspaceDir`                         | directorio del proceso actual                                                  | Espacio de trabajo utilizado por `/codex bind` cuando se omite `--cwd`.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `serviceTier`                                 | sin establecer                                                                 | Nivel de servicio opcional del app-server de Codex. `"priority"` habilita el enrutamiento en modo rápido, `"flex"` solicita procesamiento flexible y `null` borra la anulación. El `"fast"` heredado se acepta como `"priority"`.                                                                                                                                                                                                                                                                                       |
| `experimental.sandboxExecServer`              | `false`                                                                        | Opt-in de vista previa que registra un entorno Codex respaldado por un entorno de pruebas (sandbox) de OpenClaw con Codex app-server 0.132.0 o más reciente para que la ejecución nativa de Codex pueda ejecutarse dentro del entorno de pruebas activo de OpenClaw.                                                                                                                                                                                                                                                    |

El complemento bloquea los protocolos de enlace de app-server antiguos o sin versión. El app-server de Codex debe informar la versión estable `0.125.0` o más reciente.

## Modos de aprobación y espacio aislado (sandbox)

Las sesiones locales de app-server stdio por defecto están en modo YOLO:
`approvalPolicy: "never"`, `approvalsReviewer: "user"` y
`sandbox: "danger-full-access"`. Esta postura de operador local de confianza permite
que los turnos y latidos de OpenClaw no atendidos progresen sin avisos de aprobación
nativa que nadie esté presente para responder.

Si el archivo de requisitos del sistema local de Codex no permite valores implícitos de aprobación YOLO,
revisor (reviewer) o sandbox, OpenClaw trata el valor implícito predeterminado como guardián
(guardian) en su lugar y selecciona los permisos de guardián permitidos. Las entradas `[[remote_sandbox_config]]` que coincidan con el nombre de host
en el mismo archivo de requisitos se respetan
para la decisión del sandbox predeterminado.

Establezca `appServer.mode: "guardian"` para las aprobaciones revisadas por el guardián de Codex:

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

El preajuste `guardian` se expande a `approvalPolicy: "on-request"`,
`approvalsReviewer: "auto_review"` y `sandbox: "workspace-write"` cuando esos
valores están permitidos. Los campos de política individuales anulan `mode`. El valor de
revisor (reviewer) `guardian_subagent` más antiguo todavía se acepta como alias de compatibilidad,
pero las nuevas configuraciones deben usar `auto_review`.

Cuando un sandbox de OpenClaw está activo, el proceso local del app-server de Codex todavía
se ejecuta en el host Gateway. Por lo tanto, OpenClaw deshabilita el modo de código nativo de Codex,
los servidores MCP del usuario y la ejecución de complementos respaldados por aplicaciones para ese turno, en lugar de
tratar el aislamiento (sandboxing) del lado del host de Codex como equivalente al backend del
sandbox de OpenClaw. El acceso a Shell se expone a través de herramientas dinámicas respaldadas por el sandbox de OpenClaw
tales como `sandbox_exec` y `sandbox_process` cuando las herramientas normales de exec/proceso
están disponibles.

En hosts Ubuntu/AppArmor, Codex bwrap puede fallar bajo `workspace-write` antes
de que se inicie el comando del shell cuando ejecuta intencionalmente el Codex
`workspace-write` nativo sin el sandboxing activo de OpenClaw. Si ve
`bwrap: setting up uid map: Permission denied` o
`bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted`, ejecute
`openclaw doctor` y corrija la política de espacio de nombres del host informada para el usuario del servicio OpenClaw
en lugar de otorgar privilegios más amplios al contenedor Docker. Prefiera
un perfil AppArmor limitado para el proceso del servicio; la
alternativa `kernel.apparmor_restrict_unprivileged_userns=0` es para todo el host y tiene
ventajas y desventajas de seguridad.

## Ejecución nativa en sandbox

El valor predeterminado estable es fail-closed (fallar cerrado): el sandboxing activo de OpenClaw deshabilita las superficies de ejecución nativas de
Codex que, de otro modo, se ejecutarían desde el host del servidor de aplicaciones de Codex
. Use `appServer.experimental.sandboxExecServer: true` solo cuando desee
probar la compatibilidad con entornos remotos de Codex con el backend de sandbox de OpenClaw. Esta
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
3. Solo para lanzamientos del servidor de aplicaciones stdio locales, `CODEX_API_KEY` y luego
   `OPENAI_API_KEY`, cuando no hay ninguna cuenta del servidor de aplicaciones y la autenticación de OpenAI es
   aún necesaria.

Cuando OpenClaw detecta un perfil de autenticación de Codex de estilo suscripción a ChatGPT, elimina
`CODEX_API_KEY` y `OPENAI_API_KEY` del proceso secundario de Codex generado. Eso
mantiene las claves API de nivel de Gateway disponibles para incrustaciones o modelos directos de OpenAI
sin hacer que los turnos del servidor de aplicaciones nativo de Codex se facturen a través de la API por accidente.

Los perfiles explícitos de API-key de Codex y la reserva de clave de entorno stdio local utilizan el inicio de sesión de app-server en lugar del entorno del proceso secundario heredado. Las conexiones de app-server WebSocket no reciben la reserva de API-key de entorno de Gateway; utilice un perfil de autenticación explícito o la propia cuenta del app-server remoto.

Los lanzamientos de app-server stdio heredan el entorno de proceso de OpenClaw de forma predeterminada. OpenClaw posee el puente de cuenta del app-server de Codex y establece `CODEX_HOME` en un directorio por agente bajo el estado de OpenClaw de ese agente. Eso mantiene la configuración de Codex, las cuentas, la caché/datos de complementos y el estado del hilo limitados al agente de OpenClaw en lugar de filtrarse desde el directorio personal `~/.codex` del operador.

OpenClaw no reescribe `HOME` para los lanzamientos locales normales de app-server. Los subprocesos ejecutados por Codex, como `openclaw`, `gh`, `git`, las CLI de la nube y los comandos de shell, ven el directorio principal del proceso normal y pueden encontrar la configuración y los tokens del directorio principal del usuario. Codex también puede descubrir `$HOME/.agents/skills` y `$HOME/.agents/plugins/marketplace.json`; ese descubrimiento de `.agents` se comparte intencionalmente con el directorio principal del operador y es independiente del estado `~/.codex` aislado.

Los complementos de OpenClaw y las instantáneas de habilidades de OpenClaw aún fluyen a través del registro de complementos y el cargador de habilidades de OpenClaw. Los activos personales de `~/.codex` de Codex no lo hacen. Si tiene habilidades útiles de CLI de Codex o complementos de un directorio de inicio de Codex que deben convertirse en parte de un agente de OpenClaw, inventaríelos explícitamente:

```bash
openclaw migrate codex --dry-run
openclaw migrate apply codex --yes
```

Si un despliegue necesita aislamiento de entorno adicional, agregue esas variables a `appServer.clearEnv`:

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

`appServer.clearEnv` solo afecta al proceso secundario del app-server de Codex generado. OpenClaw elimina `CODEX_HOME` y `HOME` de esta lista durante la normalización del lanzamiento local: `CODEX_HOME` permanece por agente, y `HOME` permanece heredado para que los subprocesos puedan usar el estado normal del directorio principal del usuario.

## Herramientas dinámicas

Las herramientas dinámicas de Codex se cargan de forma predeterminada mediante `searchable`. OpenClaw no expone herramientas dinámicas que dupliquen las operaciones del área de trabajo nativas de Codex:

- `read`
- `write`
- `edit`
- `apply_patch`
- `exec`
- `process`
- `update_plan`

La mayoría de las herramientas de integración de OpenClaw restantes, como mensajería, medios, cron, navegador, nodos, puerta de enlace, `heartbeat_respond` y `web_search`, están disponibles a través de la búsqueda de herramientas de Codex en el espacio de nombres `openclaw`. Esto mantiene el contexto inicial del modelo más pequeño. Las respuestas fuente de `sessions_yield` y solo de herramienta de mensaje se mantienen directas porque esos son contratos de control de turnos. `sessions_spawn` permanece buscable para que el `spawn_agent` nativo de Codex siga siendo la superficie principal del subagente de Codex, mientras que la delegación explícita de OpenClaw o ACP todavía está disponible a través del espacio de nombres de herramientas dinámicas `openclaw`.

Establezca `codexDynamicToolsLoading: "direct"` solo al conectarse a un servidor de aplicaciones Codex personalizado que no pueda buscar herramientas dinámicas diferidas o al depurar la carga completa de herramientas.

## Tiempos de espera

Las llamadas a herramientas dinámicas propiedad de OpenClaw están limitadas independientemente de `appServer.requestTimeoutMs`. Cada solicitud de `item/tool/call` de Codex usa el primer tiempo de espera disponible en este orden:

- Un argumento `timeoutMs` positivo por llamada.
- Para `image_generate`, `agents.defaults.imageGenerationModel.timeoutMs`.
- Para `image_generate` sin un tiempo de espera configurado, el valor predeterminado de generación de imágenes de 120 segundos.
- Para la herramienta de comprensión de medios `image`, `tools.media.image.timeoutSeconds` convertido a milisegundos o el valor predeterminado de medios de 60 segundos.
- El valor predeterminado de herramienta dinámica de 30 segundos.

Los presupuestos de herramientas dinámicas están limitados a 600000 ms. En caso de tiempo de espera, OpenClaw anula la señal de la herramienta cuando es compatible y devuelve una respuesta de herramienta dinámica fallida a Codex para que el turno pueda continuar en lugar de dejar la sesión en `processing`.

Después de que Codex acepta un turno, y después de que OpenClaw responde a una solicitud
app-server con ámbito de turno, el harness espera que Codex avance en el turno actual y eventualmente
termine el turno nativo con `turn/completed`. Si el app-server permanece en silencio durante
`appServer.turnCompletionIdleTimeoutMs`, OpenClaw interrumpe el turno de Codex con el mejor esfuerzo posible,
registra un tiempo de espera de diagnóstico y libera el carril de sesión de OpenClaw para que los
mensajes de chat de seguimiento no se pongan en cola detrás de un turno nativo obsoleto.

La mayoría de las notificaciones no terminales para el mismo turno desactivan ese perro guardián
corto porque Codex ha demostrado que el turno todavía está vivo. Las finalizaciones `custom_tool_call_output`
mantienen activado el perro guardián corto posterior a la herramienta porque son la transferencia
del resultado de la herramienta con ámbito de turno. Los elementos `agentMessage` completados y los elementos `rawResponseItem/completed` sin procesar
previos a la herramienta activan la liberación de salida del asistente: si
Codex luego permanece en silencio sin `turn/completed`, OpenClaw interrumpe con el mejor esfuerzo posible
el turno nativo y libera el carril de la sesión. El progreso del asistente sin procesar posterior a la herramienta
sigue esperando `turn/completed` mientras una guardia de inactividad de finalización permanece activada; la
guardia usa `appServer.postToolRawAssistantCompletionIdleTimeoutMs` cuando
se configura y, de lo contrario, recurre al tiempo de espera de inactividad de finalización del asistente.
Los diagnósticos de tiempo de espera incluyen el último método de notificación del app-server y, para los elementos
de respuesta del asistente sin procesar, el tipo de elemento, el rol, el id. y una vista previa del texto del asistente delimitada.

## Descubrimiento de modelos

De manera predeterminada, el complemento Codex solicita al app-server los modelos disponibles. La
disponibilidad del modelo es propiedad de Codex app-server, por lo que la lista puede cambiar cuando OpenClaw
actualiza la versión de `@openai/codex` incluida o cuando una implementación apunta
`appServer.command` a un binario Codex diferente. La disponibilidad también puede estar
limitada a la cuenta. Use `/codex models` en una puerta de enlace en ejecución para ver el catálogo en vivo
para ese harness y esa cuenta.

Si el descubrimiento falla o se agota el tiempo, OpenClaw usa un catálogo de respaldo incluido para:

- GPT-5.5
- GPT-5.4 mini
- GPT-5.2

El harness incluido actual es `@openai/codex` `0.132.0`. Una sonda `model/list`
contra ese app-server incluido devolvió:

| Id. de modelo       | Predeterminado | Oculto | Modalidades de entrada | Esfuerzos de razonamiento |
| ------------------- | -------------- | ------ | ---------------------- | ------------------------- |
| `gpt-5.5`           | Sí             | No     | texto, imagen          | bajo, medio, alto, xalto  |
| `gpt-5.4`           | No             | No     | texto, imagen          | bajo, medio, alto, xalto  |
| `gpt-5.4-mini`      | No             | No     | texto, imagen          | bajo, medio, alto, xalto  |
| `gpt-5.3-codex`     | No             | No     | texto, imagen          | bajo, medio, alto, xalto  |
| `gpt-5.2`           | No             | No     | texto, imagen          | bajo, medio, alto, xalto  |
| `codex-auto-review` | No             | Sí     | texto, imagen          | bajo, medio, alto, xalto  |

Los modelos ocultos pueden ser devueltos por el catálogo del servidor de aplicaciones para flujos internos o especializados, pero no son opciones normales del selector de modelos.

Ajustar el descubrimiento bajo `plugins.entries.codex.config.discovery`:

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

Codex maneja `AGENTS.md` por sí mismo a través del descubrimiento nativo de documentos del proyecto. OpenClaw no escribe archivos de documentos de proyecto Codex sintéticos ni depende de los nombres de archivo de reserva de Codex para los archivos de persona, porque las reservas de Codex solo se aplican cuando `AGENTS.md` falta.

Para la paridad del espacio de trabajo de OpenClaw, el arnés de Codex resuelve los otros archivos de arranque. `SOUL.md`, `IDENTITY.md`, `TOOLS.md` y `USER.md` se reenvían como instrucciones de desarrollador de OpenClaw Codex porque definen el agente activo, la guía del espacio de trabajo disponible y el perfil de usuario. El contenido de `HEARTBEAT.md` no se inyecta; los turnos de latido reciben un puntero en modo de colaboración para leer el archivo cuando existe y no está vacío. `BOOTSTRAP.md` y `MEMORY.md`, cuando están presentes, se reenvían como contexto de referencia de entrada de turno de OpenClaw.

## Invalidaciones de entorno

Las invalidaciones de entorno siguen disponibles para las pruebas locales:

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

`OPENCLAW_CODEX_APP_SERVER_BIN` omite el binario administrado cuando
`appServer.command` no está establecido.

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` se eliminó. Utilice
`plugins.entries.codex.config.appServer.mode: "guardian"` en su lugar, o
`OPENCLAW_CODEX_APP_SERVER_MODE=guardian` para pruebas locales puntuales. La configuración es
preferida para despliegues repetibles porque mantiene el comportamiento del plugin en el
mismo archivo revisado que el resto de la configuración del Codex harness.

## Relacionado

- [Codex harness](/es/plugins/codex-harness)
- [Codex harness runtime](/es/plugins/codex-harness-runtime)
- [Native Codex plugins](/es/plugins/codex-native-plugins)
- [Codex Computer Use](/es/plugins/codex-computer-use)
- [OpenAI provider](/es/providers/openai)
- [Configuration reference](/es/gateway/configuration-reference)
