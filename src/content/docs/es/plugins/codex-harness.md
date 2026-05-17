---
summary: "Ejecutar turnos de agente integrados de OpenClaw a través del arnés Codex app-server incluido"
title: "Arnés Codex"
read_when:
  - You want to use the bundled Codex app-server harness
  - You need Codex harness config examples
  - You want Codex-only deployments to fail instead of falling back to PI
---

El complemento `codex` incluido permite a OpenClaw ejecutar turnos de agente OpenAI integrados a través de Codex app-server en lugar del arnés PI integrado.

Use el arnés de Codex cuando desee que Codex sea propietario de la sesión del agente de bajo nivel:
reanudación de subprocesos nativos, continuación de herramientas nativas, compactación nativa y
ejecución del servidor de aplicaciones. OpenClaw sigue siendo propietario de los canales de chat, los archivos de sesión, la selección de modelos,
las herramientas dinámicas de OpenClaw, las aprobaciones, la entrega de medios y el espejo
del transcript visible.

La configuración normal utiliza referencias de modelos canónicas de OpenAI como `openai/gpt-5.5`. No configure referencias de modelos `openai-codex/gpt-*`. Coloque el orden de autenticación del agente OpenAI bajo `auth.order.openai`; los perfiles `openai-codex:*` más antiguos y las entradas `auth.order.openai-codex` siguen siendo compatibles para instalaciones existentes.

OpenClaw inicia subprocesos de Codex app-server con el modo de código nativo de Codex y solo modo de código habilitado. Esto mantiene las herramientas dinámicas de OpenClaw diferidas/busables dentro de la propia superficie de ejecución de código y búsqueda de herramientas de Codex, en lugar de agregar un contenedor de búsqueda de herramientas estilo PI encima de Codex.

Para la división más amplia de modelo/proveedor/tiempo de ejecución, comience con [Tiempos de ejecución del agente](/es/concepts/agent-runtimes). La versión corta es: `openai/gpt-5.5` es la referencia del modelo, `codex` es el tiempo de ejecución, y Telegram, Discord, Slack u otro canal sigue siendo la superficie de comunicación.

## Requisitos

- OpenClaw con el complemento `codex` incluido disponible.
- Si su configuración usa `plugins.allow`, incluya `codex`.
- Codex app-server `0.125.0` o más reciente. El complemento incluido gestiona un binario compatible de Codex app-server de forma predeterminada, por lo que los comandos locales `codex` en `PATH` no afectan el inicio normal del arnés.
- Autenticación de Codex disponible a través de `openclaw models auth login --provider openai-codex`, una cuenta de app-server en el hogar de Codex del agente, o un perfil de autenticación explícito con clave de API de Codex.

Para conocer la precedencia de autenticación, el aislamiento del entorno, los comandos personalizados de app-server, el descubrimiento de modelos y todos los campos de configuración, consulte [Referencia del arnés Codex](/es/plugins/codex-harness-reference).

## Inicio rápido

La mayoría de los usuarios que quieren Codex en OpenClaw prefieren esta ruta: iniciar sesión con una suscripción a ChatGPT/Codex, habilitar el complemento incluido `codex` y usar una referencia de modelo `openai/gpt-*` canónica.

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

Si su configuración usa `plugins.allow`, añada `codex` también allí:

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

Reinicie la puerta de enlace después de cambiar la configuración del complemento. Si un chat existente ya tiene una sesión, use `/new` o `/reset` antes de probar los cambios en tiempo de ejecución para que el siguiente turno resuelva el arnés desde la configuración actual.

## Configuración

La configuración de inicio rápido es la configuración mínima viable del arnés Codex. Establezca las opciones del arnés Codex en la configuración de OpenClaw y use la CLI solo para la autenticación de Codex:

| Necesita                                                          | Establecer                                                                                               | Donde                                                   |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Habilitar el arnés                                                | `plugins.entries.codex.enabled: true`                                                                    | Configuración de OpenClaw                               |
| Mantener una instalación de complemento en la lista de permitidos | Incluir `codex` en `plugins.allow`                                                                       | Configuración de OpenClaw                               |
| Enrutar los turnos del agente OpenAI a través de Codex            | `agents.defaults.model` o `agents.list[].model` como `openai/gpt-*`                                      | Configuración del agente OpenClaw                       |
| Inicie sesión con Codex OAuth                                     | `openclaw models auth login --provider openai-codex`                                                     | Perfil de autenticación CLI                             |
| Añadir copia de seguridad de clave API para ejecuciones de Codex  | Perfil de clave API `openai:*` listado después de la autenticación de suscripción en `auth.order.openai` | Perfil de autenticación CLI + Configuración de OpenClaw |
| Fallo cerrado cuando Codex no está disponible                     | Proveedor o modelo `agentRuntime.id: "codex"`                                                            | Configuración de modelo/proveedor OpenClaw              |
| Usar tráfico directo de la API de OpenAI                          | Proveedor o modelo `agentRuntime.id: "pi"` con autenticación normal de OpenAI                            | Configuración de modelo/proveedor OpenClaw              |
| Ajustar el comportamiento del servidor de aplicaciones            | `plugins.entries.codex.config.appServer.*`                                                               | Configuración del complemento Codex                     |
| Habilitar aplicaciones nativas del complemento Codex              | `plugins.entries.codex.config.codexPlugins.*`                                                            | Configuración del complemento Codex                     |
| Habilitar el uso de computadora de Codex                          | `plugins.entries.codex.config.computerUse.*`                                                             | Configuración del complemento Codex                     |

Use `openai/gpt-*` referencias de modelo para turnos de agente OpenAI respaldados por Codex. Prefiera
`auth.order.openai` para un orden con prioridad de suscripción/respaldo con clave de API. Los
perfiles de autenticación `openai-codex:*` y `auth.order.openai-codex` existentes siguen siendo válidos, pero
no escriba nuevas referencias de modelo `openai-codex/gpt-*`.

```json5
{
  auth: {
    order: {
      openai: ["openai-codex:user@example.com", "openai:api-key-backup"],
    },
  },
}
```

En esa forma, ambos perfiles todavía se ejecutan a través de Codex para turnos de
agente `openai/gpt-*`. La clave de API es solo una alternativa de autenticación, no una solicitud para cambiar a PI o
Respuestas simples de OpenAI.

El resto de esta página cubre variantes comunes entre las que los usuarios deben elegir:
forma de implementación, enrutamiento de falla cerrada, política de aprobación del guardián, complementos nativos de
Codex y uso de computadora. Para listas completas de opciones, valores predeterminados, enumeraciones, descubrimiento,
aislamiento del entorno, tiempos de espera y campos de transporte del servidor de aplicaciones, consulte
[Referencia de arnés de Codex](/es/plugins/codex-harness-reference).

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

`/codex status` reporta la conectividad del servidor de aplicaciones, la cuenta, los límites de velocidad, los servidores
MCP y las habilidades. `/codex models` enumera el catálogo en vivo del servidor de aplicaciones Codex para
el arnés y la cuenta. Si `/status` es sorprendente, consulte
[Solución de problemas](#troubleshooting).

## Enrutamiento y selección de modelos

Mantenga las referencias de proveedores y la política de tiempo de ejecución separadas:

- Use `openai/gpt-*` para turnos de agente OpenAI a través de Codex.
- No use `openai-codex/gpt-*` en la configuración. Ejecute `openclaw doctor --fix` para
  reparar referencias heredadas y pines de ruta de sesión obsoletos.
- `agentRuntime.id: "codex"` es opcional para el modo automático normal de OpenAI, pero útil
  cuando una implementación debería fallar cerrada si Codex no está disponible.
- `agentRuntime.id: "pi"` opta por un proveedor o modelo para el comportamiento directo de PI cuando
  eso es intencional.
- `/codex ...` controla las conversaciones nativas del servidor de aplicaciones Codex desde el chat.
- ACP/acpx es una ruta de arnés externa separada. Úsela solo cuando el usuario solicite
  ACP/acpx o un adaptador de arnés externo.

Enrutamiento de comandos comunes:

| Intención del usuario            | Uso                                      |
| -------------------------------- | ---------------------------------------- |
| Adjuntar el chat actual          | `/codex bind [--cwd <path>]`             |
| Reanudar un hilo Codex existente | `/codex resume <thread-id>`              |
| Listar o filtrar hilos Codex     | `/codex threads [filter]`                |
| Enviar solo comentarios de Codex | `/codex diagnostics [note]`              |
| Iniciar una tarea ACP/acpx       | Comandos de sesión ACP/acpx, no `/codex` |

| Caso de uso                                                       | Configurar                                                                  | Verificar                                      | Notas                                         |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------- |
| Suscripción ChatGPT/Codex con tiempo de ejecución nativo de Codex | `openai/gpt-*` más el plugin `codex` habilitado                             | `/status` muestra `Runtime: OpenAI Codex`      | Ruta recomendada                              |
| Fallo cerrado si Codex no está disponible                         | Proveedor o modelo `agentRuntime.id: "codex"`                               | El turno falla en lugar de retroceder a PI     | Usar para implementaciones solo de Codex      |
| Tráfico directo de clave API de OpenAI a través de PI             | Proveedor o modelo `agentRuntime.id: "pi"` y autenticación normal de OpenAI | `/status` muestra el tiempo de ejecución de PI | Usar solo cuando PI es intencional            |
| Configuración heredada                                            | `openai-codex/gpt-*`                                                        | `openclaw doctor --fix` lo reescribe           | No escriba nueva configuración de esta manera |
| Adaptador Codex ACP/acpx                                          | ACP `sessions_spawn({ runtime: "acp" })`                                    | Estado de tarea/sesión ACP                     | Separado del arnés nativo de Codex            |

`agents.defaults.imageModel` sigue la misma división de prefijos. Use `openai/gpt-*`
para la ruta normal de OpenAI y `codex/gpt-*` solo cuando la comprensión de imágenes
deba ejecutarse a través de un turno del servidor de aplicaciones Codex delimitado. No use
`openai-codex/gpt-*`; doctor reescribe ese prefijo heredado a `openai/gpt-*`.

## Patrones de implementación

### Implementación básica de Codex

Use la configuración de inicio rápido cuando todos los turnos del agente OpenAI deban usar Codex de forma predeterminada.

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

Esta forma mantiene a Claude como el agente predeterminado y agrega un agente Codex con nombre:

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
complemento incluido está disponible. Agregue una política explícita de tiempo de ejecución cuando desee una regla de fallo cerrado escrita:

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
servidor de aplicaciones es demasiado antiguo o el servidor de aplicaciones no puede iniciarse.

## Política del servidor de aplicaciones

De manera predeterminada, el complemento inicia el binario administrado de Codex de OpenClaw localmente con transporte stdio.
Establezca `appServer.command` solo cuando intencionalmente desee ejecutar un
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
postura YOLO implícita, OpenClaw selecciona los permisos de guardian permitidos en su lugar.
Cuando un sandbox de OpenClaw está activo para la sesión, OpenClaw limita los
`danger-full-access` de Codex al `workspace-write` de Codex para que los turnos de modo de código nativos de Codex
permanezcan dentro del espacio de trabajo con sandbox.

Use el modo guardian cuando desee la auto-revisión nativa de Codex antes de las escapadas del sandbox
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

El modo guardian se expande a las aprobaciones del servidor de aplicaciones de Codex, generalmente
`approvalPolicy: "on-request"`, `approvalsReviewer: "auto_review"` y
`sandbox: "workspace-write"` cuando los requisitos locales permiten esos valores.

Para cada campo del servidor de aplicaciones, orden de autenticación, aislamiento del entorno, descubrimiento y
comportamiento de tiempo de espera, consulte [Referencia de Codex harness](/es/plugins/codex-harness-reference).

## Comandos y diagnósticos

El complemento incluido registra `/codex` como un comando de barra en cualquier canal que
soporte comandos de texto de OpenClaw.

Formas comunes:

- `/codex status` verifica la conectividad del servidor de aplicaciones, modelos, cuenta, límites de velocidad,
  servidores MCP y habilidades.
- `/codex models` enumera los modelos activos del servidor de aplicaciones de Codex.
- `/codex threads [filter]` enumera los hilos recientes del servidor de aplicaciones de Codex.
- `/codex resume <thread-id>` adjunta la sesión actual de OpenClaw a un
  hilo existente de Codex.
- `/codex compact` pide al servidor de aplicaciones de Codex que compacte el hilo adjunto.
- `/codex review` inicia la revisión nativa de Codex para el hilo adjunto.
- `/codex diagnostics [note]` pregunta antes de enviar comentarios de Codex para el
  hilo adjunto.
- `/codex account` muestra el estado de la cuenta y los límites de velocidad.
- `/codex mcp` enumera el estado del servidor MCP del servidor de aplicaciones de Codex.
- `/codex skills` enumera las habilidades del servidor de aplicaciones Codex.

Para la mayoría de los informes de soporte, comience con `/diagnostics [note]` en la conversación
donde ocurrió el error. Crea un informe de diagnóstico de Gateway y, para las sesiones
del arnés Codex, solicita aprobación para enviar el paquete de retroalimentación Codex relevante.
Consulte [Exportación de diagnósticos](/es/gateway/diagnostics) para conocer el modelo de privacidad y el comportamiento
del chat en grupo.

Use `/codex diagnostics [note]` solo cuando específicamente desee la carga de retroalimentación
de Codex para el hilo adjunto actualmente sin el paquete de diagnóstico completo
de Gateway.

### Inspeccionar hilos Codex localmente

La forma más rápida de inspeccionar una ejecución incorrecta de Codex es a menudo abrir el hilo
nativo de Codex directamente:

```bash
codex resume <thread-id>
```

Obtenga el id del hilo de la respuesta completada de `/diagnostics`, `/codex binding`, o
`/codex threads [filter]`.

Para conocer los mecanismos de carga y los límites de diagnóstico a nivel de tiempo de ejecución, consulte
[Tiempo de ejecución del arnés Codex](/es/plugins/codex-harness-runtime#codex-feedback-upload).

La autenticación se selecciona en este orden:

1. Perfiles de autenticación de OpenAI ordenados para el agente, preferiblemente bajo
   `auth.order.openai`. Los ids de perfil `openai-codex:*` existentes siguen siendo válidos.
2. La cuenta existente del servidor de aplicaciones en el hogar Codex de ese agente.
3. Solo para lanzamientos locales del servidor de aplicaciones stdio, `CODEX_API_KEY`, luego
   `OPENAI_API_KEY`, cuando no hay una cuenta de servidor de aplicaciones presente y la autenticación de OpenAI es
   aún necesaria.

Cuando OpenClaw detecta un perfil de autenticación Codex estilo suscripción ChatGPT, elimina
`CODEX_API_KEY` y `OPENAI_API_KEY` del proceso hijo Codex generado. Eso
mantiene las claves API a nivel de Gateway disponibles para incrustaciones o modelos directos de OpenAI
sin hacer que los turnos del servidor de aplicaciones Codex nativo se facturen a través de la API por accidente.
Los perfiles explícitos de clave API de Codex y la reserva de clave de entorno stdio local usan el inicio de sesión
del servidor de aplicaciones en lugar del entorno del proceso hijo heredado. Las conexiones del servidor de
aplicaciones WebSocket no reciben la reserva de clave API de entorno de Gateway; use un perfil de autenticación
explícito o la cuenta propia del servidor de aplicaciones remoto.

Si un perfil de suscripción alcanza un límite de uso de Codex, OpenClaw registra la hora de restablecimiento cuando Codex reporta uno e intenta con el siguiente perfil de autenticación ordenado para la misma ejecución de Codex. Cuando pasa la hora de restablecimiento, el perfil de suscripción vuelve a ser elegible sin cambiar el modelo `openai/gpt-*` seleccionado ni el tiempo de ejecución de Codex.

Si un despliegue necesita aislamiento adicional del entorno, añada esas variables a `appServer.clearEnv`:

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

Las herramientas dinámicas de Codex cargan por defecto de forma `searchable`. OpenClaw no expone herramientas dinámicas que dupliquen las operaciones nativas del espacio de trabajo de Codex: `read`, `write`, `edit`, `apply_patch`, `exec`, `process` y `update_plan`. Las herramientas de integración restantes de OpenClaw, como mensajería, sesiones, medios, cron, navegador, nodos, puerta de enlace, `heartbeat_respond` y `web_search`, están disponibles a través de la búsqueda de herramientas de Codex bajo el espacio de nombres `openclaw`, manteniendo el contexto del modelo inicial más pequeño.
`sessions_yield` y las respuestas de origen solo con herramienta de mensajes permanecen directas porque son contratos de control de turnos. Las instrucciones de colaboración de latido indican a Codex que busque `heartbeat_respond` antes de finalizar un turno de latido cuando la herramienta aún no está cargada.

Establezca `codexDynamicToolsLoading: "direct"` solo al conectarse a un servidor de aplicaciones Codex personalizado que no pueda buscar herramientas dinámicas diferidas o al depurar la carga completa de la herramienta.

Campos del complemento Codex de nivel superior compatibles:

| Campo                      | Predeterminado | Significado                                                                                                                   |
| -------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `codexDynamicToolsLoading` | `"searchable"` | Use `"direct"` para poner las herramientas dinámicas de OpenClaw directamente en el contexto de la herramienta Codex inicial. |
| `codexDynamicToolsExclude` | `[]`           | Nombres adicionales de herramientas dinámicas de OpenClaw para omitir en los turnos del servidor de aplicaciones Codex.       |
| `codexPlugins`             | deshabilitado  | Soporte nativo de complementos/aplicaciones de Codex para complementos curados instalados en el origen y migrados.            |

Campos `appServer` admitidos:

| Campo                         | Predeterminado                                                        | Significado                                                                                                                                                                                                                                                                                   |
| ----------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`                   | `"stdio"`                                                             | `"stdio"` inicia Codex; `"websocket"` se conecta a `url`.                                                                                                                                                                                                                                     |
| `command`                     | binario gestionado de Codex                                           | Ejecutable para el transporte stdio. Déjelo sin configurar para usar el binario gestionado; establézcalo solo para una invalidación explícita.                                                                                                                                                |
| `args`                        | `["app-server", "--listen", "stdio://"]`                              | Argumentos para el transporte stdio.                                                                                                                                                                                                                                                          |
| `url`                         | sin configurar                                                        | URL del servidor de aplicaciones WebSocket.                                                                                                                                                                                                                                                   |
| `authToken`                   | sin configurar                                                        | Token de portador para el transporte WebSocket.                                                                                                                                                                                                                                               |
| `headers`                     | `{}`                                                                  | Encabezados WebSocket adicionales.                                                                                                                                                                                                                                                            |
| `clearEnv`                    | `[]`                                                                  | Nombres de variables de entorno adicionales eliminados del proceso del servidor de aplicaciones stdio iniciado después de que OpenClaw construya su entorno heredado. `CODEX_HOME` y `HOME` están reservados para el aislamiento de Codex por agente de OpenClaw en lanzamientos locales.     |
| `requestTimeoutMs`            | `60000`                                                               | Tiempo de espera para las llamadas al plano de control del servidor de aplicaciones.                                                                                                                                                                                                          |
| `turnCompletionIdleTimeoutMs` | `60000`                                                               | Ventana silenciosa después de una solicitud del servidor de aplicaciones Codex con alcance de turno mientras OpenClaw espera `turn/completed`. Aumente esto para fases de síntesis lentas posteriores a la herramienta o solo de estado.                                                      |
| `mode`                        | `"yolo"` a menos que los requisitos locales de Codex no permitan YOLO | Ajuste preestablecido para ejecución YOLO o revisada por guardián. Los requisitos locales de stdio que omiten `danger-full-access`, la aprobación `never` o el revisor `user` convierten al guardián predeterminado implícito.                                                                |
| `approvalPolicy`              | `"never"` o una política de aprobación de guardián permitida          | Política de aprobación nativa de Codex enviada al inicio/reanudación/turno del hilo. Los valores predeterminados del guardián prefieren `"on-request"` cuando se permite.                                                                                                                     |
| `sandbox`                     | `"danger-full-access"` o un sandbox de guardián permitido             | Modo de arena nativa de Codex enviado al inicio/reanudación del hilo. Los valores predeterminados de Guardian prefieren `"workspace-write"` cuando se permite, de lo contrario `"read-only"`. Cuando hay un sandbox de OpenClaw activo, `danger-full-access` se limita a `"workspace-write"`. |
| `approvalsReviewer`           | `"user"` o un revisor de guardian permitido                           | Use `"auto_review"` para permitir que Codex revise las solicitudes de aprobación nativas cuando se permite, de lo contrario `guardian_subagent` o `user`. `guardian_subagent` sigue siendo un alias heredado.                                                                                 |
| `serviceTier`                 | sin establecer                                                        | Nivel de servicio opcional del servidor de aplicaciones Codex. `"priority"` habilita el enrutamiento en modo rápido, `"flex"` solicita procesamiento flexible, `null` borra la anulación y el `"fast"` heredado se acepta como `"priority"`.                                                  |

Las llamadas a herramientas dinámicas propiedad de OpenClaw están limitadas independientemente de `appServer.requestTimeoutMs`: las solicitudes `item/tool/call` de Codex usan un watchdog de OpenClaw de 30 segundos por defecto. Un argumento `timeoutMs` positivo por llamada extiende o acorta ese presupuesto de herramienta específico. La herramienta `image_generate` también usa `agents.defaults.imageGenerationModel.timeoutMs` cuando la llamada a la herramienta no proporciona su propio tiempo de espera, y la herramienta `image` de comprensión de medios usa `tools.media.image.timeoutSeconds` o su valor predeterminado de medios de 60 segundos. Los presupuestos de herramientas dinámicas tienen un límite de 600000 ms. Al agotarse el tiempo, OpenClaw aborta la señal de la herramienta cuando es compatible y devuelve una respuesta de herramienta dinámica fallida a Codex para que el turno pueda continuar en lugar de dejar la sesión en `processing`.

Después de que OpenClaw responde a una solicitud de servidor de aplicaciones con ámbito de turno de Codex, el arnés también espera que Codex finalice el turno nativo con `turn/completed`. Si el servidor de aplicaciones permanece en silencio durante `appServer.turnCompletionIdleTimeoutMs` después de esa respuesta, OpenClaw interrumpe el turno de Codex con el mejor esfuerzo posible, registra un tiempo de espera de diagnóstico y libera el carril de sesión de OpenClaw para que los mensajes de chat de seguimiento no se pongan en cola detrás de un turno nativo obsoleto. Cualquier notificación no terminal para el mismo turno, incluyendo `rawResponseItem/completed`, desactiva ese perro guardián corto porque Codex ha demostrado que el turno aún está vivo; el perro guardián terminal más largo continúa protegiendo los turnos realmente atascados. Las notificaciones globales del servidor de aplicaciones, como las actualizaciones de límites de velocidad, no restablecen el progreso de inactividad del turno. Cuando Codex emite un elemento `agentMessage` completado y luego permanece en silencio sin `turn/completed`, OpenClaw trata la salida del asistente como efectivamente completa, interrumpe el turno nativo de Codex con el mejor esfuerzo posible y libera el carril de sesión. Los diagnósticos de tiempo de espera incluyen el último método de notificación del servidor de aplicaciones y, para los elementos de respuesta bruta del asistente, el tipo de elemento, el rol, el identificador y una vista previa del texto del asistente delimitada.

Las anulaciones del entorno siguen disponibles para pruebas locales:

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

`OPENCLAW_CODEX_APP_SERVER_BIN` omite el binario administrado cuando `appServer.command` no está establecido.

Se eliminó `OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1`. Use `plugins.entries.codex.config.appServer.mode: "guardian"` en su lugar, o `OPENCLAW_CODEX_APP_SERVER_MODE=guardian` para pruebas locales puntuales. Se prefiere la configuración para implementaciones repetibles porque mantiene el comportamiento del complemento en el mismo archivo revisado que el resto de la configuración del arnés de Codex.

## Complementos nativos de Codex

La compatibilidad con complementos nativos de Codex utiliza las propias capacidades de aplicación y complementos del servidor de aplicaciones de Codex en el mismo hilo de Codex que el turno del arnés de OpenClaw. OpenClaw no traduce los complementos de Codex en herramientas dinámicas `codex_plugin_*` sintéticas de OpenClaw.

`codexPlugins` afecta solo a las sesiones que seleccionan el arnés de Codex nativo. No
tiene ningún efecto en las ejecuciones de PI, las ejecuciones normales del proveedor OpenAI, los enlaces de
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

La configuración de la aplicación del hilo se calcula cuando OpenClaw establece una sesión del arnés de Codex
o reemplaza un enlace de hilo de Codex obsoleto. No se recalcula en cada turno.
Después de cambiar `codexPlugins`, use `/new`, `/reset` o reinicie la puerta de enlace para
que las futuras sesiones del arnés de Codex comiencen con el conjunto de aplicaciones actualizado.

Para obtener información sobre la elegibilidad de migración, el inventario de aplicaciones, la política de acciones destructivas,
las elicitaciones y el diagnóstico de complementos nativos, consulte
[Complementos nativos de Codex](/es/plugins/codex-native-plugins).

## Uso del equipo

El uso del equipo se trata en su propia guía de configuración:
[Uso del equipo de Codex](/es/plugins/codex-computer-use).

La versión corta: OpenClaw no distribuye la aplicación de control del escritorio ni ejecuta
acciones del escritorio por sí mismo. Prepara el servidor de aplicaciones de Codex, verifica que el
servidor MCP `computer-use` esté disponible y luego permite que Codex sea el propietario de las llamadas a herramientas MCP
nativas durante los turnos en modo Codex.

## Límites de tiempo de ejecución

El arnés de Codex solo cambia el ejecutor del agente integrado de bajo nivel.

- Las herramientas dinámicas de OpenClaw son compatibles. Codex le pide a OpenClaw que ejecute esas
  herramientas, por lo que OpenClaw permanece en la ruta de ejecución.
- Las herramientas de shell, parche, MCP y de aplicación nativas de Codex son propiedad de Codex.
  OpenClaw puede observar o bloquear eventos nativos seleccionados a través del relé
  compatible, pero no reescribe los argumentos de las herramientas nativas.
- Codex es propietario de la compactación nativa. OpenClaw mantiene un espejo de transcripción para el historial
  del canal, la búsqueda, `/new`, `/reset` y el cambio futuro de modelo o arnés.
- La generación de medios, la comprensión de medios, el texto a voz (TTS), las aprobaciones y la salida de la
  herramienta de mensajería continúan a través de la configuración de proveedor/modelo de OpenClaw correspondiente.
- `tool_result_persist` se aplica a los resultados de herramientas de transcripción propiedad de OpenClaw, no
  a los registros de resultados de herramientas nativas de Codex.

Para obtener información sobre las capas de enlaces, las superficies V1 compatibles, el manejo de permisos nativos, la dirección
de la cola, los mecanismos de carga de comentarios de Codex y los detalles de compactación, consulte
[Tiempo de ejecución del arnés de Codex](/es/plugins/codex-harness-runtime).

## Solución de problemas

**Codex no aparece como un proveedor `/model` normal:** esto es esperado para
nuevas configuraciones. Seleccione un modelo `openai/gpt-*`, habilite
`plugins.entries.codex.enabled`, y verifique si `plugins.allow` excluye
`codex`.

**OpenClaw usa PI en lugar de Codex:** asegúrese de que la referencia del modelo sea
`openai/gpt-*` en el proveedor oficial de OpenAI y que el complemento Codex esté
instalado y habilitado. Si necesita una prueba estricta mientras prueba, configure el proveedor o
modelo `agentRuntime.id: "codex"`. Un tiempo de ejecución de Codex forzado falla en lugar de
retroceder a PI.

**La configuración heredada `openai-codex/*` permanece:** ejecute `openclaw doctor --fix`.
Doctor reescribe las referencias de modelos heredadas a `openai/*`, elimina pines de sesiones obsoletas y
de tiempo de ejecución de agentes completos, y preserva las anulaciones de perfiles de autenticación existentes.

**El servidor de aplicaciones es rechazado:** use un servidor de aplicaciones Codex `0.125.0` o más nuevo.
Las versiones preliminares de la misma versión o versiones con sufijos de compilación como
`0.125.0-alpha.2` o `0.125.0+custom` son rechazadas porque OpenClaw prueba el
piso del protocolo estable `0.125.0`.

**`/codex status` no puede conectarse:** verifique que el complemento `codex` incluido esté
habilitado, que `plugins.allow` lo incluya cuando se configure una lista de permitidos, y
que cualquier `appServer.command`, `url`, `authToken` personalizado, o encabezados sean válidos.

**El descubrimiento de modelos es lento:** reduzca
`plugins.entries.codex.config.discovery.timeoutMs` o deshabilite el descubrimiento. Vea
[Referencia del arnés de Codex](/es/plugins/codex-harness-reference#model-discovery).

**El transporte WebSocket falla inmediatamente:** verifique `appServer.url`, `authToken`,
encabezados, y que el servidor de aplicaciones remoto hable la misma versión del
protocolo del servidor de aplicaciones Codex.

**Un modelo que no es Codex usa PI:** esto es esperado a menos que la política de tiempo de ejecución del proveedor o modelo
la enrute a otro arnés. Las referencias de proveedores que no son de OpenAI se mantienen en
su ruta de proveedor normal en el modo `auto`.

**Computer Use está instalado pero las herramientas no se ejecutan:** verifique `/codex computer-use status` desde una sesión nueva. Si una herramienta informa `Native hook relay unavailable`, use `/new` o `/reset`; si persiste, reinicie la puerta de enlace para borrar los registros de enlaces nativos obsoletos. Consulte [Codex Computer Use](/es/plugins/codex-computer-use#troubleshooting).

## Relacionado

- [Referencia de arnés de Codex](/es/plugins/codex-harness-reference)
- [Tiempo de ejecución del arnés de Codex](/es/plugins/codex-harness-runtime)
- [Complementos nativos de Codex](/es/plugins/codex-native-plugins)
- [Uso de computadora de Codex](/es/plugins/codex-computer-use)
- [Tiempos de ejecución del agente](/es/concepts/agent-runtimes)
- [Proveedores de modelos](/es/concepts/model-providers)
- [Proveedor de OpenAI](/es/providers/openai)
- [Complementos de arnés de agente](/es/plugins/sdk-agent-harness)
- [Ganchos de complementos](/es/plugins/hooks)
- [Exportación de diagnósticos](/es/gateway/diagnostics)
- [Estado](/es/cli/status)
- [Pruebas](/es/help/testing-live#live-codex-app-server-harness-smoke)
