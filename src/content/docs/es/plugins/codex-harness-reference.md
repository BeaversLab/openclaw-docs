---
summary: "Configuración, autenticación, descubrimiento y referencia del servidor de aplicaciones para el arnés de Codex"
title: "Referencia del arnés de Codex"
read_when:
  - You need every Codex harness config field
  - You are changing app-server transport, auth, discovery, or timeout behavior
  - You are debugging Codex harness startup, model discovery, or environment isolation
---

Esta referencia cubre la configuración detallada para el complemento incluido `codex`. Para decisiones de configuración y enrutamiento, comience con [Arnés de Codex](/es/plugins/codex-harness).

## Superficie de configuración del complemento

Todas las configuraciones del arnés de Codex se encuentran bajo `plugins.entries.codex.config`.

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

| Campo                      | Predeterminado                              | Significado                                                                                                                                                                                              |
| -------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `discovery`                | habilitado                                  | Configuración de descubrimiento de modelos para el servidor de aplicaciones de Codex `model/list`.                                                                                                       |
| `appServer`                | servidor de aplicaciones stdio administrado | Configuraciones de transporte, comando, autenticación, aprobación, espacio aislado y tiempo de espera.                                                                                                   |
| `codexDynamicToolsLoading` | `"searchable"`                              | Use `"direct"` para colocar las herramientas dinámicas de OpenClaw directamente en el contexto de la herramienta inicial de Codex.                                                                       |
| `codexDynamicToolsExclude` | `[]`                                        | Nombres de herramientas dinámicas adicionales de OpenClaw para omitir en los turnos del servidor de aplicaciones de Codex.                                                                               |
| `codexPlugins`             | deshabilitado                               | Soporte nativo de complementos/aplicaciones de Codex para complementos curados instalados desde el código fuente y migrados. Consulte [Complementos nativos de Codex](/es/plugins/codex-native-plugins). |
| `computerUse`              | deshabilitado                               | Configuración de uso de computadora de Codex. Consulte [Uso de computadora de Codex](/es/plugins/codex-computer-use).                                                                                    |

## Transporte del servidor de aplicaciones

De forma predeterminada, OpenClaw inicia el binario administrado de Codex enviado con el complemento
incluido:

```bash
codex app-server --listen stdio://
```

Esto mantiene la versión del servidor de aplicaciones vinculada al complemento `codex` incluido en lugar de
cualquier CLI de Codex separado que suceda estar instalado localmente. Establezca
`appServer.command` solo cuando intencionalmente desee ejecutar un diferente
ejecutable.

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

Campos `appServer` compatibles:

| Campo                         | Predeterminado                                                        | Significado                                                                                                                                                                                                                                                                       |
| ----------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`                   | `"stdio"`                                                             | `"stdio"` genera Codex; `"websocket"` se conecta a `url`.                                                                                                                                                                                                                         |
| `command`                     | binario administrado de Codex                                         | Ejecutable para el transporte stdio. Déjelo sin configurar para usar el binario administrado.                                                                                                                                                                                     |
| `args`                        | `["app-server", "--listen", "stdio://"]`                              | Argumentos para el transporte stdio.                                                                                                                                                                                                                                              |
| `url`                         | sin configurar                                                        | URL del servidor de aplicaciones WebSocket.                                                                                                                                                                                                                                       |
| `authToken`                   | sin configurar                                                        | Token de portador para el transporte WebSocket.                                                                                                                                                                                                                                   |
| `headers`                     | `{}`                                                                  | Encabezados adicionales de WebSocket.                                                                                                                                                                                                                                             |
| `clearEnv`                    | `[]`                                                                  | Nombres adicionales de variables de entorno eliminados del proceso del servidor de aplicaciones stdio generado después de que OpenClaw construye su entorno heredado.                                                                                                             |
| `requestTimeoutMs`            | `60000`                                                               | Tiempo de espera para las llamadas al plano de control del servidor de aplicaciones.                                                                                                                                                                                              |
| `turnCompletionIdleTimeoutMs` | `60000`                                                               | Ventana de silencio después de que Codex acepta un turno o después de una solicitud al servidor de aplicaciones con alcance de turno mientras OpenClaw espera `turn/completed`.                                                                                                   |
| `mode`                        | `"yolo"` a menos que los requisitos locales de Codex no permitan YOLO | Preset para ejecución YOLO o revisada por un guardián.                                                                                                                                                                                                                            |
| `approvalPolicy`              | `"never"` o una política de aprobación de guardián permitida          | Política de aprobación nativa de Codex enviada al inicio, reanudación y turno del hilo.                                                                                                                                                                                           |
| `sandbox`                     | `"danger-full-access"` o un sandbox de guardián permitido             | Modo de espacio aislado (sandbox) nativo de Codex enviado al inicio y reanudación del hilo. Los espacios aislados OpenClaw activos limitan los turnos `danger-full-access` a Codex `workspace-write`; el indicador de red del turno sigue la salida del espacio aislado OpenClaw. |
| `approvalsReviewer`           | `"user"` o un revisor guardián permitido                              | Use `"auto_review"` para permitir que Codex revise las indicaciones de aprobación nativas cuando se permita.                                                                                                                                                                      |
| `defaultWorkspaceDir`         | directorio del proceso actual                                         | Espacio de trabajo utilizado por `/codex bind` cuando se omite `--cwd`.                                                                                                                                                                                                           |
| `serviceTier`                 | sin configurar                                                        | Nivel de servicio opcional del servidor de aplicaciones Codex. `"priority"` habilita el enrutamiento en modo rápido, `"flex"` solicita el procesamiento flexible y `null` borra la anulación. El `"fast"` heredado se acepta como `"priority"`.                                   |

El complemento bloquea protocolos de enlace (handshakes) del servidor de aplicaciones antiguos o sin versión. El servidor de aplicaciones Codex debe informar la versión estable `0.125.0` o más reciente.

## Modos de aprobación y sandbox

Las sesiones locales del servidor de aplicaciones stdio son de modo YOLO de forma predeterminada: `approvalPolicy: "never"`, `approvalsReviewer: "user"` y `sandbox: "danger-full-access"`. Esta postura de operador local confiable permite que los turnos y latidos de OpenClaw no atendidos progresen sin indicaciones de aprobación nativas que nadie esté presente para responder.

Si el archivo de requisitos del sistema local de Codex no permite valores de aprobación, revisor o espacio aislado YOLO implícitos, OpenClaw trata el valor predeterminado implícito como guardián y selecciona permisos de guardián permitidos. Las entradas `[[remote_sandbox_config]]` que coinciden con el nombre de host en el mismo archivo de requisitos se respetan para la decisión predeterminada del espacio aislado.

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

La configuración predeterminada `guardian` se expande a `approvalPolicy: "on-request"`,
`approvalsReviewer: "auto_review"` y `sandbox: "workspace-write"` cuando esos
valores están permitidos. Los campos de política individuales anulan `mode`. El valor anterior
del revisor `guardian_subagent` todavía se acepta como alias de compatibilidad,
pero las nuevas configuraciones deberían usar `auto_review`.

Cuando un sandbox OpenClaw está activo, el proceso local del servidor de aplicaciones Codex todavía
se ejecuta en el host de Gateway. Por lo tanto, OpenClaw mantiene el sandbox del propio sistema de archivos
de Codex para turnos en modo de código nativo. Los turnos `danger-full-access` se limitan a
Codex `workspace-write`, y el `workspace-write` de turno `networkAccess` se deriva
del ajuste de salida del sandbox OpenClaw: Docker `network: "none"` permanece
sin conexión, mientras que `network: "bridge"` o una red Docker personalizada permite el acceso
saliente.

## Autenticación y aislamiento del entorno

La autenticación se selecciona en este orden:

1. Un perfil de autenticación Codex de OpenClaw explícito para el agente.
2. La cuenta existente del servidor de aplicaciones en el hogar Codex de ese agente.
3. Solo para lanzamientos locales del servidor de aplicaciones stdio, `CODEX_API_KEY` y luego
   `OPENAI_API_KEY`, cuando no hay ninguna cuenta de servidor de aplicaciones presente y la autenticación de OpenAI es
   aún necesaria.

Cuando OpenClaw ve un perfil de autenticación Codex estilo suscripción ChatGPT, elimina
`CODEX_API_KEY` y `OPENAI_API_KEY` del proceso hijo Codex generado. Eso
mantiene las claves API a nivel de Gateway disponibles para incrustaciones o modelos directos de OpenAI
sin hacer que los turnos del servidor de aplicaciones Codex nativo se cobren a través de la API por accidente.

Los perfiles explícitos de clave API de Codex y la alternativa de clave de entorno stdio local usan el inicio de sesión del servidor de aplicaciones
en lugar del entorno del proceso hijo heredado. Las conexiones del servidor de aplicaciones WebSocket
no reciben la alternativa de clave API del entorno de Gateway; use un perfil de autenticación explícito o la
propia cuenta del servidor de aplicaciones remoto.

Los lanzamientos de servidores de aplicaciones Stdio heredan el entorno de proceso de OpenClaw de forma predeterminada.
OpenClaw posee el puente de cuentas del servidor de aplicaciones Codex y establece `CODEX_HOME` en un
directorio por agente bajo el estado de OpenClaw de ese agente. Esto mantiene la configuración de Codex,
las cuentas, el caché/datos de complementos y el estado del subproceso limitados al agente de OpenClaw
en lugar de filtrarse desde el `~/.codex` personal del operador.

OpenClaw no reescribe `HOME` para los lanzamientos normales de servidores de aplicaciones locales. Los subprocesos
ejecutados por Codex, como `openclaw`, `gh`, `git`, las CLI de la nube y los comandos de shell ven
el inicio del proceso normal y pueden encontrar la configuración y los tokens del inicio del usuario. Codex también puede
descubrir `$HOME/.agents/skills` y `$HOME/.agents/plugins/marketplace.json`;
esa detección de `.agents` se comparte intencionalmente con el inicio del operador y está
separada del estado aislado `~/.codex`.

Los complementos de OpenClaw y las instantáneas de habilidades de OpenClaw aún fluyen a través del propio registro de
complementos y cargador de habilidades de OpenClaw. Los activos personales `~/.codex` de Codex no lo hacen. Si
tiene habilidades útiles de CLI de Codex o complementos de un inicio de Codex que deberían convertirse
en parte de un agente de OpenClaw, invéntarielos explícitamente:

```bash
openclaw migrate codex --dry-run
openclaw migrate apply codex --yes
```

Si una implementación necesita aislamiento de entorno adicional, agregue esas variables a
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
OpenClaw elimina `CODEX_HOME` y `HOME` de esta lista durante la normalización del
lanzamiento local: `CODEX_HOME` permanece por agente, y `HOME` permanece heredado para que
los subprocesos puedan usar el estado normal del inicio del usuario.

## Herramientas dinámicas

Las herramientas dinámicas de Codex se cargan de forma predeterminada con `searchable`. OpenClaw no expone
herramientas dinámicas que duplican las operaciones del espacio de trabajo nativas de Codex:

- `read`
- `write`
- `edit`
- `apply_patch`
- `exec`
- `process`
- `update_plan`

La mayoría de las herramientas de integración de OpenClaw restantes, como mensajería, medios, cron,
navegador, nodos, puerta de enlace, `heartbeat_respond` y `web_search`, están disponibles
a través de la búsqueda de herramientas de Codex bajo el espacio de nombres `openclaw`. Esto mantiene el contexto
inicial del modelo más pequeño. `sessions_yield` y las respuestas de origen solo de herramienta de mensajes
se mantienen directas porque esos son contratos de control de turnos. `sessions_spawn` permanece
buscable para que la `spawn_agent` nativa de Codex siga siendo la superficie principal del subagente
Codex, mientras que la delegación explícita de OpenClaw o ACP aún está disponible a través
del espacio de nombres de herramientas dinámicas `openclaw`.

Establezca `codexDynamicToolsLoading: "direct"` solo cuando se conecte a un servidor de aplicaciones Codex
personalizado que no pueda buscar herramientas dinámicas diferidas o al depurar la carga útil completa
de la herramienta.

## Tiempos de espera

Las llamadas a herramientas dinámicas propiedad de OpenClaw están limitadas de forma independiente de
`appServer.requestTimeoutMs`. Cada solicitud `item/tool/call` de Codex utiliza el primer
tiempo de espera disponible en este orden:

- Un argumento `timeoutMs` positivo por llamada.
- Para `image_generate`, `agents.defaults.imageGenerationModel.timeoutMs`.
- Para `image_generate` sin un tiempo de espera configurado, el valor predeterminado de 120 segundos para la generación de imágenes.
- Para la herramienta de comprensión de medios `image`, `tools.media.image.timeoutSeconds` convertido a milisegundos, o el valor predeterminado de 60 segundos para medios.
- El valor predeterminado de 30 segundos para herramientas dinámicas.

Los presupuestos de herramientas dinámicas están limitados a 600000 ms. En caso de tiempo de espera, OpenClaw aborta la señal de la herramienta cuando es compatible y devuelve una respuesta fallida de herramienta dinámica a Codex para que el turno pueda continuar en lugar de dejar la sesión en `processing`.

Después de que Codex acepta un turno, y después de que OpenClaw responde a una solicitud del servidor de aplicaciones con alcance al turno, el arnés espera que Codex avance en el turno actual y eventualmente finalice el turno nativo con `turn/completed`. Si el servidor de aplicaciones permanece en silencio durante `appServer.turnCompletionIdleTimeoutMs`, OpenClaw interrumpe el turno de Codex con el mejor esfuerzo posible, registra un tiempo de espera de diagnóstico y libera el carril de sesión de OpenClaw para que los mensajes de chat de seguimiento no se pongan en cola detrás de un turno nativo obsoleto.

La mayoría de las notificaciones no terminales para el mismo turno desactivan ese perro guardián corto porque Codex ha demostrado que el turno sigue vivo. Las finalizaciones `custom_tool_call_output` mantienen activado el perro guardián corto posterior a la herramienta porque son la entrega de resultados de herramientas con ámbito de turno. Los elementos `agentMessage` completados y los elementos del asistente `rawResponseItem/completed` brutos previos a la herramienta activan la liberación de salida del asistente: si Codex luego se queda en silencio sin `turn/completed`, OpenClaw interrumpe con el mejor esfuerzo el turno nativo y libera el carril de la sesión. El progreso del asistente `turn/completed` posterior a la herramienta sigue esperando o el perro guardián terminal. Los diagnósticos de tiempo de espera incluyen el último método de notificación del servidor de aplicaciones y, para los elementos de respuesta del asistente `turn/completed`, el tipo de elemento, rol, id y una vista previa delimitada del texto del asistente.

## Descubrimiento de modelos

De forma predeterminada, el complemento Codex solicita al servidor de aplicaciones los modelos disponibles. La disponibilidad de modelos es propiedad del servidor de aplicaciones Codex, por lo que la lista puede cambiar cuando OpenClaw actualiza la versión `@openai/codex` incluida o cuando una implementación apunta `appServer.command` a un binario Codex diferente. La disponibilidad también puede tener alcance de cuenta. Use `/codex models` en una puerta de enlace en ejecución para ver el catálogo en vivo para ese arnés y cuenta.

Si el descubrimiento falla o se agota el tiempo de espera, OpenClaw usa un catálogo de respaldo incluido para:

- GPT-5.5
- GPT-5.4 mini
- GPT-5.2

El arnés incluido actual es `@openai/codex` `0.130.0`. Un sondeo `model/list` contra ese servidor de aplicaciones incluido devolvió:

| ID del modelo         | Predeterminado | Oculto | Modalidades de entrada | Esfuerzos de razonamiento |
| --------------------- | -------------- | ------ | ---------------------- | ------------------------- |
| `gpt-5.5`             | Sí             | No     | texto, imagen          | bajo, medio, alto, xalto  |
| `gpt-5.4`             | No             | No     | texto, imagen          | bajo, medio, alto, xalto  |
| `gpt-5.4-mini`        | No             | No     | texto, imagen          | bajo, medio, alto, xalto  |
| `gpt-5.3-codex`       | No             | No     | texto, imagen          | bajo, medio, alto, xalto  |
| `gpt-5.3-codex-spark` | No             | No     | texto                  | bajo, medio, alto, xalto  |
| `gpt-5.2`             | No             | No     | texto, imagen          | bajo, medio, alto, xalto  |

Los modelos ocultos pueden ser devueltos por el catálogo del servidor de la aplicación para flujos internos o especializados, pero no son opciones normales del selector de modelos.

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

Deshabilite el descubrimiento cuando desee que el inicio evite sondear Codex y use únicamente el catálogo de reserva (fallback):

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

Codex maneja `AGENTS.md` por sí mismo a través del descubrimiento nativo de documentos del proyecto. OpenClaw no escribe archivos de documento del proyecto Codex sintéticos ni depende de los nombres de archivo de reserva de Codex para los archivos de persona, porque las reservas de Codex solo se aplican cuando falta `AGENTS.md`.

Para la paridad del espacio de trabajo de OpenClaw, el arnés de Codex resuelve los otros archivos de arranque. `SOUL.md`, `IDENTITY.md`, `TOOLS.md` y `USER.md` se reenvían como instrucciones de desarrollador de OpenClaw Codex porque definen el agente activo, la orientación del espacio de trabajo disponible y el perfil de usuario. El contenido de `HEARTBEAT.md` no se inyecta; los turnos de latido obtienen un puntero en modo de colaboración para leer el archivo cuando existe y no está vacío. `BOOTSTRAP.md` y `MEMORY.md`, cuando están presentes, se reenvían como contexto de referencia de entrada de turno de OpenClaw.

## Sobrescrituras de entorno

Las sobrescrituras de entorno siguen disponibles para pruebas locales:

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

`OPENCLAW_CODEX_APP_SERVER_BIN` omite el binario administrado cuando
`appServer.command` no está establecido.

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` se eliminó. Use
`plugins.entries.codex.config.appServer.mode: "guardian"` en su lugar, o
`OPENCLAW_CODEX_APP_SERVER_MODE=guardian` para pruebas locales puntuales. Se prefiere la configuración para despliegues repetibles porque mantiene el comportamiento del complemento en el mismo archivo revisado que el resto de la configuración del arnés de Codex.

## Relacionado

- [Arnés de Codex](/es/plugins/codex-harness)
- [Tiempo de ejecución del arnés de Codex](/es/plugins/codex-harness-runtime)
- [Complementos nativos de Codex](/es/plugins/codex-native-plugins)
- [Uso del ordenador de Codex](/es/plugins/codex-computer-use)
- [Proveedor OpenAI](/es/providers/openai)
- [Referencia de configuración](/es/gateway/configuration-reference)
