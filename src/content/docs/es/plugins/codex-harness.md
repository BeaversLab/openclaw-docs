---
summary: "Ejecutar turnos del agente integrado de OpenClaw a través del arnés de Codex app-server incluido"
title: "Arnés de Codex"
read_when:
  - You want to use the bundled Codex app-server harness
  - You need Codex harness config examples
  - You want Codex-only deployments to fail instead of falling back to PI
---

El complemento `codex` incluido permite a OpenClaw ejecutar turnos de agente integrado de OpenAI
a través del servidor de aplicaciones de Codex en lugar del arnés PI integrado.

Use el arnés de Codex cuando desee que Codex sea propietario de la sesión del agente de bajo nivel:
reanudación de subprocesos nativos, continuación de herramientas nativas, compactación nativa y
ejecución del servidor de aplicaciones. OpenClaw sigue siendo propietario de los canales de chat, los archivos de sesión, la selección de modelos,
las herramientas dinámicas de OpenClaw, las aprobaciones, la entrega de medios y el espejo
del transcript visible.

La configuración normal utiliza referencias de modelos de OpenAI canónicas como `openai/gpt-5.5`.
No configure referencias de modelos `openai-codex/gpt-*`. `openai-codex` es el proveedor
perfiles de autenticación para perfiles de OAuth de Codex o claves API de Codex, no el prefijo
del proveedor de modelos para la configuración de nuevos agentes.

Para la división más amplia de modelo/proveedor/runtime, comience con
[Agent runtimes](/es/concepts/agent-runtimes). La versión corta es:
`openai/gpt-5.5` es la referencia del modelo, `codex` es el runtime, y Telegram,
Discord, Slack u otro canal sigue siendo la superficie de comunicación.

## Requisitos

- OpenClaw con el complemento `codex` incluido disponible.
- Si su configuración usa `plugins.allow`, incluya `codex`.
- Codex app-server `0.125.0` o más reciente. El plugin incluido gestiona un binario
  compatible de Codex app-server de forma predeterminada, por lo que los comandos locales `codex` en `PATH` no
  afectan el inicio normal del harness.
- Autenticación de Codex disponible a través de `openclaw models auth login --provider openai-codex`,
  una cuenta de app-server en el hogar de Codex del agente, o un perfil de
  autenticación explícito con API-key de Codex.

Para la precedencia de autenticación, aislamiento del entorno, comandos personalizados de app-server, descubrimiento
de modelos y todos los campos de configuración, consulte
[Referencia de Codex harness](/es/plugins/codex-harness-reference).

## Inicio rápido

La mayoría de los usuarios que desean Codex en OpenClaw buscan esta ruta: iniciar sesión con una
suscripción a ChatGPT/Codex, habilitar el plugin incluido `codex` y usar una
referencia de modelo `openai/gpt-*` canónica.

Inicie sesión con Codex OAuth:

```bash
openclaw models auth login --provider openai-codex
```

Habilite el complemento incluido `codex` y seleccione un modelo de agente de OpenAI:

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

Si su configuración usa `plugins.allow`, añada `codex` allí también:

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

La configuración de inicio rápido es la configuración mínima viable del arnés de Codex. Establezca las opciones del
arnés de Codex en la configuración de OpenClaw y use la CLI solo para la autenticación de Codex:

| Necesita                                                          | Establecer                                                                    | Donde                                      |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------ |
| Habilitar el arnés                                                | `plugins.entries.codex.enabled: true`                                         | Configuración de OpenClaw                  |
| Mantener una instalación de complemento en la lista de permitidos | Incluir `codex` en `plugins.allow`                                            | Configuración de OpenClaw                  |
| Enrutar los turnos del agente de OpenAI a través de Codex         | `agents.defaults.model` o `agents.list[].model` como `openai/gpt-*`           | Configuración del agente OpenClaw          |
| Iniciar sesión con Codex OAuth                                    | `openclaw models auth login --provider openai-codex`                          | Perfil de autenticación CLI                |
| Fallo cerrado cuando Codex no está disponible                     | Proveedor o modelo `agentRuntime.id: "codex"`                                 | Configuración de modelo/proveedor OpenClaw |
| Usar tráfico directo de la API de OpenAI                          | Proveedor o modelo `agentRuntime.id: "pi"` con autenticación normal de OpenAI | Configuración de modelo/proveedor OpenClaw |
| Ajustar el comportamiento del servidor de aplicaciones            | `plugins.entries.codex.config.appServer.*`                                    | Configuración del complemento Codex        |
| Habilitar aplicaciones nativas del complemento Codex              | `plugins.entries.codex.config.codexPlugins.*`                                 | Configuración del complemento Codex        |
| Habilitar el uso de computadora de Codex                          | `plugins.entries.codex.config.computerUse.*`                                  | Configuración del complemento Codex        |

Use `openai/gpt-*` referencias de modelo para turnos de agente OpenAI respaldados por Codex.
`openai-codex` es solo el nombre del proveedor del perfil de autenticación para perfiles Codex OAuth y
Codex API-key. No escriba nuevas `openai-codex/gpt-*` referencias de modelo.

El resto de esta página cubre variantes comunes entre las que los usuarios deben elegir:
forma de implementación, enrutamiento de cierre por fallo, política de aprobación del guardián, complementos nativos de Codex
y uso de computadora. Para listas de opciones completas, valores predeterminados, enumeraciones, descubrimiento,
aislamiento del entorno, tiempos de espera y campos de transporte del servidor de aplicaciones, consulte
[Referencia del arnés de Codex](/es/plugins/codex-harness-reference).

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

`/codex status` informa sobre la conectividad del servidor de aplicaciones, la cuenta, los límites de velocidad, los servidores MCP y las habilidades. `/codex models` lista el catálogo en vivo del servidor de aplicaciones Codex para el arnés y la cuenta. Si `/status` es sorprendente, consulte [Solución de problemas](#troubleshooting).

## Enrutamiento y selección de modelos

Mantenga las referencias de proveedores y la política de tiempo de ejecución separadas:

- Use `openai/gpt-*` para los turnos de agente OpenAI a través de Codex.
- No use `openai-codex/gpt-*` en la configuración. Ejecute `openclaw doctor --fix` para reparar referencias heredadas y pines de ruta de sesión obsoletos.
- `agentRuntime.id: "codex"` es opcional para el modo automático normal de OpenAI, pero útil cuando una implementación debería fallar cerrada si Codex no está disponible.
- `agentRuntime.id: "pi"` opta por un comportamiento directo de PI para un proveedor o modelo cuando eso es intencional.
- `/codex ...` controla las conversaciones nativas del servidor de aplicaciones Codex desde el chat.
- ACP/acpx es una ruta de arnés externo separada. Úsela solo cuando el usuario solicite
  ACP/acpx o un adaptador de arnés externo.

Enrutamiento de comandos común:

| Intención del usuario               | Usar                                     |
| ----------------------------------- | ---------------------------------------- |
| Adjuntar el chat actual             | `/codex bind [--cwd <path>]`             |
| Reanudar un hilo de Codex existente | `/codex resume <thread-id>`              |
| Listar o filtrar hilos de Codex     | `/codex threads [filter]`                |
| Enviar solo comentarios de Codex    | `/codex diagnostics [note]`              |
| Iniciar una tarea ACP/acpx          | Comandos de sesión ACP/acpx, no `/codex` |

| Caso de uso                                                         | Configurar                                                                  | Verificar                                         | Notas                                          |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------- |
| Suscripción a ChatGPT/Codex con tiempo de ejecución nativo de Codex | `openai/gpt-*` más el complemento `codex` habilitado                        | `/status` muestra `Runtime: OpenAI Codex`         | Ruta recomendada                               |
| Cerrar el fallo si Codex no está disponible                         | Proveedor o modelo `agentRuntime.id: "codex"`                               | El turno falla en lugar de usar el respaldo de PI | Usar para despliegues solo de Codex            |
| Dirigir el tráfico de la clave de API de OpenAI a través de PI      | Proveedor o modelo `agentRuntime.id: "pi"` y autenticación normal de OpenAI | `/status` muestra el tiempo de ejecución de PI    | Usar solo cuando PI sea intencional            |
| Configuración heredada                                              | `openai-codex/gpt-*`                                                        | `openclaw doctor --fix` la reescribe              | No escribas nueva configuración de esta manera |
| Adaptador de Codex ACP/acpx                                         | ACP `sessions_spawn({ runtime: "acp" })`                                    | Estado de tarea/sesión de ACP                     | Separado del arnés nativo de Codex             |

`agents.defaults.imageModel` sigue la misma división de prefijos. Use `openai/gpt-*`
para la ruta normal de OpenAI y `codex/gpt-*` solo cuando la comprensión de imágenes
debe ejecutarse a través de un turno limitado del servidor de aplicaciones Codex. No use
`openai-codex/gpt-*`; el doctor reescribe ese prefijo heredado a `openai/gpt-*`.

## Patrones de implementación

### Implementación básica de Codex

Use la configuración de inicio rápido cuando todos los turnos del agente OpenAI deban usar Codex por
defecto.

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
agente `codex` usa el servidor de aplicaciones Codex.

### Implementación de Codex a prueba de fallos (fail-closed)

Para los turnos del agente OpenAI, `openai/gpt-*` ya se resuelve a Codex cuando el
complemento incluido está disponible. Agregue una política de tiempo de ejecución explícita cuando desee una regla
de fail-closed escrita:

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
servidor de aplicaciones es demasiado antiguo o el servidor de aplicaciones no puede iniciarse.

## Política del servidor de aplicaciones

De manera predeterminada, el complemento inicia el binario administrado de Codex de OpenClaw localmente con transporte
stdio. Establezca `appServer.command` solo cuando intencionalmente desee ejecutar un
ejecutable diferente. Use el transporte WebSocket solo cuando un servidor de aplicaciones ya esté
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

Las sesiones locales del servidor de aplicaciones stdio predeterminan a la postura de operador local confiable:
`approvalPolicy: "never"`, `approvalsReviewer: "user"` y
`sandbox: "danger-full-access"`. Si los requisitos locales de Codex no permiten esa
postura implícita de YOLO, OpenClaw selecciona los permisos de guardian permitidos en su lugar.

Use el modo guardián cuando desee la revisión automática nativa de Codex antes de los escapes del sandbox
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

El modo guardián se expande a las aprobaciones del servidor de aplicaciones de Codex, generalmente
`approvalPolicy: "on-request"`, `approvalsReviewer: "auto_review"` y
`sandbox: "workspace-write"` cuando los requisitos locales permiten esos valores.

Para cada campo del servidor de aplicaciones, orden de autenticación, aislamiento del entorno, descubrimiento y
comportamiento de tiempo de espera, consulte [Referencia del arnés de Codex](/es/plugins/codex-harness-reference).

## Comandos y diagnósticos

El complemento incluido registra `/codex` como un comando de barra en cualquier canal que
soporte comandos de texto de OpenClaw.

Formas comunes:

- `/codex status` verifica la conectividad del servidor de aplicaciones, modelos, cuenta, límites de velocidad,
  servidores MCP y habilidades.
- `/codex models` enumera los modelos en vivo del servidor de aplicaciones de Codex.
- `/codex threads [filter]` enumera los hilos recientes del servidor de aplicaciones Codex.
- `/codex resume <thread-id>` adjunta la sesión actual de OpenClaw a un
  hilo existente de Codex.
- `/codex compact` solicita al servidor de aplicaciones Codex que compacte el hilo adjunto.
- `/codex review` inicia la revisión nativa de Codex para el hilo adjunto.
- `/codex diagnostics [note]` pregunta antes de enviar comentarios de Codex para el
  hilo adjunto.
- `/codex account` muestra el estado de la cuenta y el límite de velocidad.
- `/codex mcp` enumera el estado del servidor MCP del servidor de aplicaciones Codex.
- `/codex skills` enumera las habilidades del servidor de aplicaciones Codex.

Para la mayoría de los informes de soporte, comience con `/diagnostics [note]` en la conversación
donde ocurrió el error. Crea un informe de diagnóstico de Gateway y, para las sesiones
de Codex harness, solicita aprobación para enviar el paquete de comentarios de Codex relevante.
Consulte [Exportación de diagnósticos](/es/gateway/diagnostics) para conocer el modelo de privacidad y el comportamiento
del chat grupal.

Use `/codex diagnostics [note]` solo cuando específicamente desee la carga de comentarios de Codex
para el hilo conectado actualmente sin el paquete completo de diagnóstico de Gateway.

### Inspeccionar hilos de Codex localmente

La forma más rápida de inspeccionar una ejecución de Codex defectuosa suele ser abrir el hilo
nativo de Codex directamente:

```bash
codex resume <thread-id>
```

Obtenga el ID del hilo de la respuesta completada `/diagnostics`, `/codex binding` o
`/codex threads [filter]`.

Para conocer la mecánica de carga y los límites de diagnóstico a nivel de tiempo de ejecución, consulte
[Codex harness runtime](/es/plugins/codex-harness-runtime#codex-feedback-upload).

La autenticación se selecciona en este orden:

1. Un perfil de autenticación explícito de OpenClaw Codex para el agente.
2. La cuenta existente del servidor de aplicaciones en la inicio de Codex de ese agente.
3. Solo para lanzamientos locales del servidor de aplicaciones stdio, `CODEX_API_KEY`, luego
   `OPENAI_API_KEY`, cuando no hay ninguna cuenta de servidor de aplicaciones presente y la autenticación de OpenAI es
   aún necesaria.

Cuando OpenClaw detecta un perfil de autenticación de Codex estilo suscripción de ChatGPT, elimina
`CODEX_API_KEY` y `OPENAI_API_KEY` del proceso secundario de Codex generado. Esto
mantiene las claves de API a nivel de Gateway disponibles para incrustaciones o modelos directos de OpenAI
sin hacer que los turnos nativos del servidor de aplicaciones de Codex se facturen a través de la API por accidente.
Los perfiles explícitos de clave de API de Codex y la reserva de clave de entorno stdio local utilizan el inicio de sesión del servidor de aplicaciones
en lugar del entorno del proceso secundario heredado. Las conexiones del servidor de aplicaciones WebSocket
no reciben la reserva de clave de API de entorno de Gateway; use un perfil de autenticación explícito o la
cuenta propia del servidor de aplicaciones remoto.

Si un despliegue necesita aislamiento de entorno adicional, añada esas variables a
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

`appServer.clearEnv` solo afecta al proceso secundario del servidor de aplicaciones de Codex generado.

Las herramientas dinámicas de Codex se cargan de forma predeterminada con `searchable`. OpenClaw no expone
herramientas dinámicas que duplican las operaciones del espacio de trabajo nativas de Codex: `read`, `write`,
`edit`, `apply_patch`, `exec`, `process` y `update_plan`. Las herramientas de integración restantes de OpenClaw
tales como mensajería, sesiones, medios, cron, navegador, nodos,
gateway, `heartbeat_respond` y `web_search` están disponibles a través de la búsqueda de herramientas de Codex
bajo el espacio de nombres `openclaw`, manteniendo el contexto del modelo inicial
más pequeño.
`sessions_yield` y las respuestas de origen solo de herramienta de mensaje permanecen directas porque esos
son contratos de control de turnos. Las instrucciones de colaboración de latido indican a Codex que
busque `heartbeat_respond` antes de finalizar un turno de latido cuando la herramienta
ya no está cargada.

Establezca `codexDynamicToolsLoading: "direct"` solo al conectarse a un servidor de aplicaciones Codex personalizado que no pueda buscar herramientas dinámicas diferidas o al depurar la carga útil completa de la herramienta.

Campos principales admitidos del complemento Codex:

| Campo                      | Predeterminado | Significado                                                                                                                   |
| -------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `codexDynamicToolsLoading` | `"searchable"` | Use `"direct"` para poner las herramientas dinámicas de OpenClaw directamente en el contexto de herramienta inicial de Codex. |
| `codexDynamicToolsExclude` | `[]`           | Nombres adicionales de herramientas dinámicas de OpenClaw para omitir en los turnos del servidor de aplicaciones Codex.       |
| `codexPlugins`             | deshabilitado  | Soporte nativo de complemento/aplicación Codex para complementos curados instalados en origen migrados.                       |

Campos `appServer` admitidos:

| Campo                         | Predeterminado                                                        | Significado                                                                                                                                                                                                                                                                               |
| ----------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`                   | `"stdio"`                                                             | `"stdio"` inicia Codex; `"websocket"` se conecta a `url`.                                                                                                                                                                                                                                 |
| `command`                     | binario administrado de Codex                                         | Ejecutable para transporte stdio. Déjelo sin configurar para usar el binario administrado; configúrelo solo para una invalidación explícita.                                                                                                                                              |
| `args`                        | `["app-server", "--listen", "stdio://"]`                              | Argumentos para transporte stdio.                                                                                                                                                                                                                                                         |
| `url`                         | sin configurar                                                        | URL del servidor de aplicaciones WebSocket.                                                                                                                                                                                                                                               |
| `authToken`                   | sin configurar                                                        | Token de portador para transporte WebSocket.                                                                                                                                                                                                                                              |
| `headers`                     | `{}`                                                                  | Encabezados WebSocket adicionales.                                                                                                                                                                                                                                                        |
| `clearEnv`                    | `[]`                                                                  | Nombres de variables de entorno adicionales eliminados del proceso del servidor de aplicaciones stdio generado después de que OpenClaw construye su entorno heredado. `CODEX_HOME` y `HOME` están reservados para el aislamiento de Codex por agente de OpenClaw en lanzamientos locales. |
| `requestTimeoutMs`            | `60000`                                                               | Tiempo de espera para las llamadas al plano de control del servidor de aplicaciones.                                                                                                                                                                                                      |
| `turnCompletionIdleTimeoutMs` | `60000`                                                               | Ventana silenciosa después de una solicitud del servidor de aplicaciones Codex con alcance de turno mientras OpenClaw espera `turn/completed`. Aumente esto para fases de síntesis lentas después de la herramienta o solo de estado.                                                     |
| `mode`                        | `"yolo"` a menos que los requisitos locales de Codex no permitan YOLO | Preajuste para ejecución YOLO o revisada por guardián. Los requisitos locales de stdio que omiten `danger-full-access`, la aprobación `never` o el revisor `user` hacen que el guardián implícito sea el predeterminado.                                                                  |
| `approvalPolicy`              | `"never"` o una política de aprobación de guardián permitida          | Política de aprobación nativa de Codex enviada al inicio/reanudación/turno del hilo. Los valores predeterminados del guardián prefieren `"on-request"` cuando se permite.                                                                                                                 |
| `sandbox`                     | `"danger-full-access"` o un sandbox de guardián permitido             | Modo sandbox nativo de Codex enviado al inicio/reanudación del hilo. Los valores predeterminados del guardián prefieren `"workspace-write"` cuando se permite, de lo contrario `"read-only"`.                                                                                             |
| `approvalsReviewer`           | `"user"` o un revisor de guardián permitido                           | Use `"auto_review"` para permitir que Codex revise las indicaciones de aprobación nativas cuando se permita, de lo contrario `guardian_subagent` o `user`. `guardian_subagent` sigue siendo un alias heredado.                                                                            |
| `serviceTier`                 | unset                                                                 | Nivel de servicio opcional de Codex app-server. `"priority"` habilita el enrutamiento en modo rápido, `"flex"` solicita procesamiento flexible, `null` borra la anulación, y el `"fast"` heredado se acepta como `"priority"`.                                                            |

Las llamadas a herramientas dinámicas propiedad de OpenClaw están limitadas de forma independiente de `appServer.requestTimeoutMs`: las solicitudes `item/tool/call` de Codex usan un watchdog de OpenClaw de 30 segundos por defecto. Un argumento `timeoutMs` positivo por llamada extiende o acorta ese presupuesto específico de la herramienta. La herramienta `image_generate` también usa `agents.defaults.imageGenerationModel.timeoutMs` cuando la llamada a la herramienta no proporciona su propio tiempo de espera, y la herramienta de comprensión de medios `image` usa `tools.media.image.timeoutSeconds` o su valor predeterminado de medios de 60 segundos. Los presupuestos de herramientas dinámicas están limitados a 600000 ms. Al agotarse el tiempo, OpenClaw aborta la señal de la herramienta cuando es compatible y devuelve una respuesta de herramienta dinámica fallida a Codex para que el turno pueda continuar en lugar de dejar la sesión en `processing`.

Después de que OpenClaw responda a una solicitud de servidor de aplicaciones con ámbito de turno de Codex, el arnés también espera que Codex finalice el turno nativo con `turn/completed`. Si el servidor de aplicaciones permanece en silencio durante `appServer.turnCompletionIdleTimeoutMs` después de esa respuesta, OpenClaw interrumpe el turno de Codex con el mejor esfuerzo posible, registra un tiempo de espera de diagnóstico y libera el carril de sesión de OpenClaw para que los mensajes de chat posteriores no se pongan en cola detrás de un turno nativo obsoleto. Cualquier notificación no terminal para el mismo turno, incluyendo `rawResponseItem/completed`, desactiva ese perro guardián corto porque Codex ha demostrado que el turno todavía está vivo; el perro guardián terminal más largo continúa protegiendo los turnos realmente bloqueados. Los diagnósticos de tiempo de espera incluyen el último método de notificación del servidor de aplicaciones y, para los elementos de respuesta del asistente sin procesar, el tipo de elemento, rol, id y una vista previa del texto del asistente delimitada.

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
la configuración para despliegues repetibles porque mantiene el comportamiento del plugin en el
mismo archivo revisado que el resto de la configuración del arnés de Codex.

## Plugins nativos de Codex

El soporte de plugins nativos de Codex utiliza las propias capacidades de aplicación y
plugin del servidor de aplicaciones Codex en el mismo hilo de Codex que el turno del arnés de OpenClaw. OpenClaw
no traduce los plugins de Codex en herramientas dinámicas `codex_plugin_*` sintéticas de OpenClaw.

`codexPlugins` afecta solo a las sesiones que seleccionan el arnés nativo de Codex. No
tiene ningún efecto en las ejecuciones de PI, las ejecuciones normales del proveedor de OpenAI, los enlaces de
conversación de ACP u otros arneses.

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
            allow_destructive_actions: false,
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

La configuración de la aplicación del hilo se calcula cuando OpenClaw establece una sesión del arnés de Codex
o reemplaza un enlace de hilo de Codex obsoleto. No se recalcula en cada turno.
Después de cambiar `codexPlugins`, use `/new`, `/reset` o reinicie la puerta de enlace para que
las futuras sesiones del arnés de Codex comiencen con el conjunto de aplicaciones actualizado.

Para ver la elegibilidad de migración, el inventario de aplicaciones, la política de acciones destructivas,
las elicitaciones y los diagnósticos de complementos nativos, consulte
[Complementos nativos de Codex](/es/plugins/codex-native-plugins).

## Uso del equipo

El uso del equipo se trata en su propia guía de configuración:
[Uso del equipo de Codex](/es/plugins/codex-computer-use).

La versión corta: OpenClaw no distribuye la aplicación de control de escritorio ni ejecuta
acciones de escritorio por sí mismo. Prepara el servidor de aplicaciones Codex, verifica que el
servidor MCP `computer-use` esté disponible y luego permite que Codex sea el propietario de las llamadas
a herramientas MCP nativas durante los turnos en modo Codex.

## Límites de tiempo de ejecución

El arnés Codex cambia solo el ejecutor del agente integrado de bajo nivel.

- Las herramientas dinámicas de OpenClaw son compatibles. Codex le pide a OpenClaw que ejecute esas
  herramientas, por lo que OpenClaw permanece en la ruta de ejecución.
- Las herramientas nativas de shell, patch, MCP y de aplicaciones nativas de Codex son propiedad de Codex.
  OpenClaw puede observar o bloquear eventos nativos seleccionados a través del relé
  admitido, pero no reescribe los argumentos de las herramientas nativas.
- Codex es el propietario de la compactación nativa. OpenClaw mantiene un espejo de transcripción para el
  historial del canal, la búsqueda, `/new`, `/reset` y el cambio futuro de modelo o arnés.
- La generación de medios, la comprensión de medios, TTS, aprobaciones y la salida de herramientas de mensajería continúan a través de la configuración de proveedor/modelo de OpenClaw coincidente.
- `tool_result_persist` se aplica a los resultados de herramientas de transcripción propiedad de OpenClaw, no a los registros de resultados de herramientas nativas de Codex.

Para las capas de enlace, superficies V1 compatibles, manejo nativo de permisos, dirección de colas, mecánicas de carga de comentarios de Codex y detalles de compactación, consulte [Codex harness runtime](/es/plugins/codex-harness-runtime).

## Solución de problemas

**Codex no aparece como un proveedor `/model` normal:** eso es esperado para nuevas configuraciones. Seleccione un modelo `openai/gpt-*`, habilite `plugins.entries.codex.enabled` y verifique si `plugins.allow` excluye `codex`.

**OpenClaw usa PI en lugar de Codex:** asegúrese de que la referencia del modelo sea
`openai/gpt-*` en el proveedor oficial de OpenAI y que el complemento Codex esté
instalado y habilitado. Si necesita una prueba estricta durante las pruebas, configure el proveedor o
el modelo `agentRuntime.id: "codex"`. Un tiempo de ejecución de Codex forzado falla en lugar de
retroceder a PI.

**La configuración heredada de `openai-codex/*` persiste:** ejecute `openclaw doctor --fix`.
Doctor reescribe las referencias de modelos heredadas a `openai/*`, elimina los pines obsoletos de sesión y
de tiempo de ejecución de agente completo, y conserva las anulaciones existentes del perfil de autenticación.

**Se rechaza el servidor de aplicaciones:** utilice Codex app-server `0.125.0` o más reciente.
Las versiones de prerelease de la misma versión o versiones con sufijo de compilación como
`0.125.0-alpha.2` o `0.125.0+custom` son rechazadas porque OpenClaw prueba el
límite del protocolo `0.125.0` estable.

**`/codex status` no puede conectar:** compruebe que el plugin incluido `codex` está
habilitado, que `plugins.allow` lo incluye cuando se configura una lista de permitidos (allowlist), y
que cualquier `appServer.command`, `url`, `authToken`, o encabezados personalizados son válidos.

**El descubrimiento de modelos es lento:** reduzca
`plugins.entries.codex.config.discovery.timeoutMs` o deshabilite el descubrimiento. Consulte
[Referencia de Codex harness](/es/plugins/codex-harness-reference#model-discovery).

**El transporte WebSocket falla inmediatamente:** verifique `appServer.url`, `authToken`,
los encabezados y que el servidor de aplicaciones remoto hable la misma versión del
protocolo del servidor de aplicaciones Codex.

**Un modelo que no es Codex usa PI:** esto es esperado a menos que la política del
proveedor o del tiempo de ejecución del modelo la enrute a otro arnés. Las
referencias de proveedores que no son de OpenAI se mantienen en su ruta de
proveedor normal en el modo `auto`.

**Computer Use está instalado pero las herramientas no se ejecutan:** verifique
`/codex computer-use status` desde una sesión nueva. Si una herramienta reporta
`Native hook relay unavailable`, use `/new` o `/reset`; si persiste,
reinicie la puerta de enlace para borrar los registros de enlaces nativos obsoletos.
Vea [Uso de computadora de Codex](/es/plugins/codex-computer-use#troubleshooting).

## Relacionado

- [Referencia del arnés Codex](/es/plugins/codex-harness-reference)
- [Tiempo de ejecución del arnés de Codex](/es/plugins/codex-harness-runtime)
- [Complementos nativos de Codex](/es/plugins/codex-native-plugins)
- [Uso del equipo de Codex](/es/plugins/codex-computer-use)
- [Tiempos de ejecución del agente](/es/concepts/agent-runtimes)
- [Proveedores de modelos](/es/concepts/model-providers)
- [Proveedor OpenAI](/es/providers/openai)
- [Complementos de arnés de agente](/es/plugins/sdk-agent-harness)
- [Ganchos de complementos](/es/plugins/hooks)
- [Exportación de diagnósticos](/es/gateway/diagnostics)
- [Estado](/es/cli/status)
- [Pruebas](/es/help/testing-live#live-codex-app-server-harness-smoke)
