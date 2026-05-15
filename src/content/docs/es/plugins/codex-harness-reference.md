---
summary: "Configuración, autenticación, descubrimiento y referencia del servidor de aplicaciones para el arnés de Codex"
title: "Referencia del arnés de Codex"
read_when:
  - You need every Codex harness config field
  - You are changing app-server transport, auth, discovery, or timeout behavior
  - You are debugging Codex harness startup, model discovery, or environment isolation
---

Esta referencia cubre la configuración detallada para el complemento `codex`
bundled. Para decisiones de configuración y enrutamiento, comience con
[Codex harness](/es/plugins/codex-harness).

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

| Campo                      | Predeterminado                              | Significado                                                                                                                                                                               |
| -------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `discovery`                | habilitado                                  | Configuración de descubrimiento de modelos para el servidor de aplicaciones de Codex `model/list`.                                                                                        |
| `appServer`                | servidor de aplicaciones stdio administrado | Configuraciones de transporte, comando, autenticación, aprobación, espacio aislado y tiempo de espera.                                                                                    |
| `codexDynamicToolsLoading` | `"searchable"`                              | Use `"direct"` para colocar las herramientas dinámicas de OpenClaw directamente en el contexto de la herramienta inicial de Codex.                                                        |
| `codexDynamicToolsExclude` | `[]`                                        | Nombres de herramientas dinámicas adicionales de OpenClaw para omitir en los turnos del servidor de aplicaciones de Codex.                                                                |
| `codexPlugins`             | deshabilitado                               | Soporte nativo de complementos/aplicaciones de Codex para complementos curados instalados en fuente migrados. Consulte [Complementos nativos de Codex](/es/plugins/codex-native-plugins). |
| `computerUse`              | deshabilitado                               | Configuración de Uso de Computadora de Codex. Consulte [Uso de Computadora de Codex](/es/plugins/codex-computer-use).                                                                     |

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

| Campo                         | Predeterminado                                                        | Significado                                                                                                                                                                                                                                     |
| ----------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`                   | `"stdio"`                                                             | `"stdio"` genera Codex; `"websocket"` se conecta a `url`.                                                                                                                                                                                       |
| `command`                     | binario administrado de Codex                                         | Ejecutable para el transporte stdio. Déjelo sin configurar para usar el binario administrado.                                                                                                                                                   |
| `args`                        | `["app-server", "--listen", "stdio://"]`                              | Argumentos para el transporte stdio.                                                                                                                                                                                                            |
| `url`                         | sin configurar                                                        | URL del servidor de aplicaciones WebSocket.                                                                                                                                                                                                     |
| `authToken`                   | sin configurar                                                        | Token de portador para el transporte WebSocket.                                                                                                                                                                                                 |
| `headers`                     | `{}`                                                                  | Encabezados adicionales de WebSocket.                                                                                                                                                                                                           |
| `clearEnv`                    | `[]`                                                                  | Nombres adicionales de variables de entorno eliminados del proceso del servidor de aplicaciones stdio generado después de que OpenClaw construye su entorno heredado.                                                                           |
| `requestTimeoutMs`            | `60000`                                                               | Tiempo de espera para las llamadas al plano de control del servidor de aplicaciones.                                                                                                                                                            |
| `turnCompletionIdleTimeoutMs` | `60000`                                                               | Ventana silenciosa después de una solicitud del servidor de aplicaciones con ámbito de turno mientras OpenClaw espera `turn/completed`.                                                                                                         |
| `mode`                        | `"yolo"` a menos que los requisitos locales de Codex no permitan YOLO | Preset para ejecución YOLO o revisada por un guardián.                                                                                                                                                                                          |
| `approvalPolicy`              | `"never"` o una política de aprobación de guardián permitida          | Política de aprobación nativa de Codex enviada al inicio, reanudación y turno del hilo.                                                                                                                                                         |
| `sandbox`                     | `"danger-full-access"` o un sandbox de guardián permitido             | Modo sandbox nativo de Codex enviado al inicio y reanudación del hilo.                                                                                                                                                                          |
| `approvalsReviewer`           | `"user"` o un revisor de guardián permitido                           | Use `"auto_review"` para permitir que Codex revise los mensajes de aprobación nativos cuando se permita.                                                                                                                                        |
| `defaultWorkspaceDir`         | directorio del proceso actual                                         | Espacio de trabajo utilizado por `/codex bind` cuando se omite `--cwd`.                                                                                                                                                                         |
| `serviceTier`                 | sin configurar                                                        | Nivel de servicio opcional del servidor de aplicaciones de Codex. `"priority"` habilita el enrutamiento en modo rápido, `"flex"` solicita procesamiento flexible y `null` borra la anulación. El `"fast"` heredado se acepta como `"priority"`. |

El complemento bloquea los protocolos de enlace (handshakes) de app-server antiguos o sin versión. El app-server de Codex debe reportar una versión estable `0.125.0` o más reciente.

## Modos de aprobación y sandbox

Las sesiones locales de app-server stdio tienen como valor predeterminado el modo YOLO:
`approvalPolicy: "never"`, `approvalsReviewer: "user"` y
`sandbox: "danger-full-access"`. Esta postura de operador local confiable permite
que los turnos y latidos de OpenClaw no atendidos progresen sin indicaciones de aprobación
nativas que nadie esté presente para responder.

Si el archivo de requisitos del sistema local de Codex no permite valores implícitos de aprobación YOLO,
revisor o sandbox, OpenClaw trata el valor predeterminado implícito como guardián
en su lugar y selecciona los permisos de guardián permitidos. Las entradas `[[remote_sandbox_config]]` que coincidan con el nombre de host
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
valores están permitidos. Los campos de política individuales anulan `mode`. El antiguo
valor de revisor `guardian_subagent` todavía se acepta como alias de compatibilidad,
pero las nuevas configuraciones deberían usar `auto_review`.

## Autenticación y aislamiento del entorno

La autenticación se selecciona en este orden:

1. Un perfil de autenticación de Codex de OpenClaw explícito para el agente.
2. La cuenta existente del app-server en el hogar de Codex de ese agente.
3. Solo para inicios de app-server stdio locales, `CODEX_API_KEY` y luego
   `OPENAI_API_KEY`, cuando no hay ninguna cuenta de app-server presente y la autenticación de OpenAI es
   aún necesaria.

Cuando OpenClaw ve un perfil de autenticación de Codex estilo suscripción de ChatGPT, elimina
`CODEX_API_KEY` y `OPENAI_API_KEY` del proceso secundario de Codex generado. Eso
mantiene las claves API a nivel de Gateway disponibles para incrustaciones o modelos directos de OpenAI
sin hacer que los turnos nativos del app-server de Codex se cobren a través de la API por accidente.

Los perfiles explícitos de clave de API de Codex y la reserva de clave de entorno stdio local utilizan el inicio de sesión del servidor de aplicaciones en lugar del entorno del proceso secundario heredado. Las conexiones WebSocket del servidor de aplicaciones no reciben la reserva de clave de API del entorno Gateway; utilice un perfil de autenticación explícito o la cuenta propia del servidor de aplicaciones remoto.

De forma predeterminada, los inicios del servidor de aplicaciones stdio heredan el entorno del proceso de OpenClaw, pero OpenClaw posee el puente de cuenta del servidor de aplicaciones de Codex y establece tanto `CODEX_HOME` como `HOME` en directorios por agente bajo el estado de OpenClaw de ese agente. El cargador de habilidades propio de Codex lee `$CODEX_HOME/skills` y `$HOME/.agents/skills`, por lo que ambos valores están aislados para los inicios locales del servidor de aplicaciones. Esto mantiene las habilidades, los complementos, la configuración, las cuentas y el estado de los subprocesos nativos de Codex limitados al agente de OpenClaw en lugar de filtrarse desde el inicio personal de la CLI de Codex del operador.

Los complementos de OpenClaw y las instantáneas de habilidades de OpenClaw aún fluyen a través del propio registro de complementos y cargador de habilidades de OpenClaw. Los activos personales de la CLI de Codex no lo hacen. Si tiene habilidades o complementos útiles de la CLI de Codex que deben convertirse en parte de un agente de OpenClaw, inventaríelos explícitamente:

```bash
openclaw migrate codex --dry-run
openclaw migrate apply codex --yes
```

Si una implementación necesita aislamiento de entorno adicional, agregue esas variables a `appServer.clearEnv`:

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

`appServer.clearEnv` solo afecta al proceso secundario del servidor de aplicaciones de Codex generado. `CODEX_HOME` y `HOME` permanecen reservados para el aislamiento de Codex por agente de OpenClaw en inicios locales.

## Herramientas dinámicas

Las herramientas dinámicas de Codex se cargan de forma predeterminada en `searchable`. OpenClaw no expone herramientas dinámicas que dupliquen operaciones del espacio de trabajo nativas de Codex:

- `read`
- `write`
- `edit`
- `apply_patch`
- `exec`
- `process`
- `update_plan`

Las herramientas de integración de OpenClaw restantes, como mensajería, sesiones, medios, cron,
navegador, nodos, puerta de enlace, `heartbeat_respond` y `web_search`, están disponibles
a través de la búsqueda de herramientas de Codex bajo el espacio de nombres `openclaw`. Esto mantiene el contexto
inicial del modelo más pequeño. `sessions_yield` y las respuestas de origen solo de herramienta de mensajes
se mantienen directas porque esos son contratos de control de turnos.

Establezca `codexDynamicToolsLoading: "direct"` solo cuando se conecte a un servidor de aplicaciones Codex
personalizado que no pueda buscar herramientas dinámicas diferidas o al depurar la carga útil
de herramientas completa.

## Tiempos de espera

Las llamadas a herramientas dinámicas propiedad de OpenClaw están limitadas independientemente de
`appServer.requestTimeoutMs`. Cada solicitud `item/tool/call` de Codex utiliza el primer
tiempo de espera disponible en este orden:

- Un argumento `timeoutMs` positivo por llamada.
- Para `image_generate`, `agents.defaults.imageGenerationModel.timeoutMs`.
- Para la herramienta `image` de comprensión de medios, `tools.media.image.timeoutSeconds`
  convertida a milisegundos, o el valor predeterminado de medios de 60 segundos.
- El valor predeterminado de herramienta dinámica de 30 segundos.

Los presupuestos de herramientas dinámicas están limitados a 600000 ms. Al agotarse el tiempo, OpenClaw aborta la
señal de la herramienta donde sea compatible y devuelve una respuesta fallida de herramienta dinámica a Codex
para que el turno pueda continuar en lugar de dejar la sesión en `processing`.

Después de que OpenClaw responde a una solicitud del servidor de aplicaciones con ámbito de turno de Codex, el arnés
también espera que Codex finalice el turno nativo con `turn/completed`. Si el
servidor de aplicaciones permanece en silencio durante `appServer.turnCompletionIdleTimeoutMs` después de esa
respuesta, OpenClaw interrumpe el turno de Codex con el mejor esfuerzo posible, registra un tiempo de espera
de diagnóstico y libera el carril de sesión de OpenClaw para que los mensajes de chat de seguimiento no
se pongan en cola detrás de un turno nativo obsoleto.

Cualquier notificación no terminal para el mismo turno, incluyendo
`rawResponseItem/completed`, desactiva ese perro guardián corto porque Codex ha
probado que el turno todavía está vivo. El perro guardián terminal más largo continúa
protegiendo los turnos realmente atascados. Los diagnósticos de tiempo de espera incluyen el último método
de notificación del servidor de aplicaciones y, para los elementos de respuesta del asistente sin procesar, el tipo de elemento, rol,
ID y una vista previa delimitada del texto del asistente.

## Descubrimiento de modelos

De manera predeterminada, el complemento Codex solicita al servidor de aplicaciones los modelos disponibles. La disponibilidad de los modelos es propiedad del servidor de aplicaciones Codex, por lo que la lista puede cambiar cuando OpenClaw actualiza la versión incluida de `@openai/codex` o cuando una implementación apunta `appServer.command` a un binario Codex diferente. La disponibilidad también puede estar limitada a una cuenta. Use `/codex models` en una puerta de enlace en ejecución para ver el catálogo en vivo para ese arnés y cuenta.

Si el descubrimiento falla o agota el tiempo de espera, OpenClaw utiliza un catálogo de respaldo incluido para:

- GPT-5.5
- GPT-5.4 mini
- GPT-5.2

El arnés incluido actual es `@openai/codex` `0.130.0`. Un sondeo `model/list` contra ese servidor de aplicaciones incluido devolvió:

| Model id              | Default | Hidden | Input modalities | Reasoning efforts        |
| --------------------- | ------- | ------ | ---------------- | ------------------------ |
| `gpt-5.5`             | Yes     | No     | texto, imagen    | baja, media, alta, xalta |
| `gpt-5.4`             | No      | No     | text, image      | low, medium, high, xhigh |
| `gpt-5.4-mini`        | No      | No     | text, image      | low, medium, high, xhigh |
| `gpt-5.3-codex`       | No      | No     | text, image      | low, medium, high, xhigh |
| `gpt-5.3-codex-spark` | No      | No     | text             | low, medium, high, xhigh |
| `gpt-5.2`             | No      | No     | text, image      | low, medium, high, xhigh |

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

Desactive el descubrimiento cuando desee que el inicio evite sondear Codex y use solo el catálogo de reserva:

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

Codex maneja `AGENTS.md` por sí mismo a través del descubrimiento nativo de project-doc. OpenClaw no escribe archivos project-doc sintéticos de Codex ni depende de los nombres de archivo alternativos de Codex para los archivos de persona, porque las alternativas de Codex solo se aplican cuando falta `AGENTS.md`.

Para la paridad del área de trabajo de OpenClaw, el arnés Codex resuelve los otros archivos
de arranque, incluyendo `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`,
`HEARTBEAT.md`, `BOOTSTRAP.md` y `MEMORY.md` cuando están presentes, y los reenvía
a través de las instrucciones de desarrollador de Codex en `thread/start` y `thread/resume`.
Esto mantiene el contexto del perfil y la persona del área de trabajo visible en el carril nativo
de modelado de comportamiento de Codex sin duplicar `AGENTS.md`.

## Opciones de configuración del entorno

Las opciones de configuración del entorno siguen disponibles para pruebas locales:

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

`OPENCLAW_CODEX_APP_SERVER_BIN` omite el binario administrado cuando
`appServer.command` no está establecido.

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` se eliminó. Use
`plugins.entries.codex.config.appServer.mode: "guardian"` en su lugar, o
`OPENCLAW_CODEX_APP_SERVER_MODE=guardian` para pruebas locales únicas. Se prefiere la configuración para despliegues repetibles porque mantiene el comportamiento del complemento en el mismo archivo revisado que el resto de la configuración del arnés Codex.

## Relacionado

- [Arnés de Codex](/es/plugins/codex-harness)
- [Tiempo de ejecución del arnés de Codex](/es/plugins/codex-harness-runtime)
- [Complementos nativos de Codex](/es/plugins/codex-native-plugins)
- [Uso del equipo de Codex](/es/plugins/codex-computer-use)
- [Proveedor de OpenAI](/es/providers/openai)
- [Referencia de configuración](/es/gateway/configuration-reference)
