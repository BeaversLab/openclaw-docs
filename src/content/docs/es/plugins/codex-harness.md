---
summary: "Ejecuta turnos de agente integrado de OpenClaw a través del arnés del servidor de aplicaciones Codex incluido"
title: "Arnés de Codex"
read_when:
  - You want to use the bundled Codex app-server harness
  - You need Codex harness config examples
  - You want Codex-only deployments to fail instead of falling back to PI
---

El complemento `codex` incluido permite a OpenClaw ejecutar turnos de agente integrados a través del
servidor de aplicaciones Codex en lugar del arnés PI integrado.

Úselo cuando desee que Codex sea propietario de la sesión de agente de bajo nivel: descubrimiento
de modelos, reanudación de subprocesos nativos, compactación nativa y ejecución del servidor de aplicaciones.
OpenClaw sigue siendo propietario de los canales de chat, archivos de sesión, selección de modelos, herramientas,
aprobaciones, entrega de medios y el espejo visible de la transcripción.

Si está tratando de orientarse, comience con
[Runtimes de agente](/es/concepts/agent-runtimes). La versión corta es:
`openai/gpt-5.5` es la referencia del modelo, `codex` es el tiempo de ejecución, y Telegram,
Discord, Slack u otro canal sigue siendo la superficie de comunicación.

## Lo que cambia este complemento

El complemento `codex` incluido aporta varias capacidades separadas:

| Capacidad                                             | Cómo lo usa                                                  | Lo que hace                                                                                                      |
| ----------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Tiempo de ejecución integrado nativo                  | `agentRuntime.id: "codex"`                                   | Ejecuta turnos de agente integrado de OpenClaw a través del servidor de aplicaciones Codex.                      |
| Comandos nativos de control de chat                   | `/codex bind`, `/codex resume`, `/codex steer`, ...          | Vincula y controla los subprocesos del servidor de aplicaciones Codex desde una conversación de mensajería.      |
| Proveedor/Catálogo del servidor de aplicaciones Codex | aspectos internos de `codex`, expuestos a través del arnés   | Permite que el tiempo de ejecución descubra y valide los modelos del servidor de aplicaciones.                   |
| Ruta de comprensión multimedia de Codex               | rutas de compatibilidad de modelos de imagen `codex/*`       | Ejecuta turnos limitados del servidor de aplicaciones Codex para modelos compatibles de comprensión de imágenes. |
| Retransmisión de enlace nativo                        | Ganchos de complemento alrededor de eventos nativos de Codex | Permite que OpenClaw observe/bloquee eventos nativos de Codex compatibles de herramientas/finalización.          |

Habilitar el complemento hace que esas capacidades estén disponibles. **No**:

- comienza a usar Codex para cada modelo de OpenAI
- convierte las referencias de modelo `openai-codex/*` en el tiempo de ejecución nativo
- hace de ACP/acpx la ruta predeterminada de Codex
- cambia en caliente las sesiones existentes que ya registraron un tiempo de ejecución PI
- reemplazar la entrega de canales de OpenClaw, los archivos de sesión, el almacenamiento del perfil de autenticación o
  el enrutamiento de mensajes

El mismo complemento también posee la superficie de comandos de `/codex` chat-control nativa. Si
el complemento está habilitado y el usuario solicita vincular, reanudar, dirigir, detener o inspeccionar
hilos de Codex desde el chat, los agentes deben preferir `/codex ...` sobre ACP. ACP permanece
como el respaldo explícito cuando el usuario solicita ACP/acpx o está probando el adaptador
Codex de ACP.

Los turnos nativos de Codex mantienen los enlaces de complementos de OpenClaw como la capa de compatibilidad pública.
Estos son enlaces de OpenClaw en proceso, no enlaces de comandos `hooks.json` de Codex:

- `before_prompt_build`
- `before_compaction`, `after_compaction`
- `llm_input`, `llm_output`
- `before_tool_call`, `after_tool_call`
- `before_message_write` para registros de transcripciones reflejados
- `before_agent_finalize` a través del relé `Stop` de Codex
- `agent_end`

Los complementos también pueden registrar middleware de resultados de herramientas neutro al tiempo de ejecución para reescribir
los resultados de herramientas dinámicas de OpenClaw después de que OpenClaw ejecute la herramienta y antes de que
el resultado se devuelva a Codex. Esto está separado del enlace de complemento público
`tool_result_persist`, que transforma las escrituras de resultados de herramientas de transcripción
propiedad de OpenClaw.

Para las semánticas de los enlaces de complementos themselves, consulte [Plugin hooks](/es/plugins/hooks)
y [Plugin guard behavior](/es/tools/plugin).

El arnés está desactivado por defecto. Las nuevas configuraciones deben mantener las referencias de modelos de OpenAI
canónicas como `openai/gpt-*` y forzar explícitamente
`agentRuntime.id: "codex"` o `OPENCLAW_AGENT_RUNTIME=codex` cuando
deseen una ejecución nativa del servidor de aplicaciones. Las referencias de modelos `codex/*` heredadas aún seleccionan
automáticamente el arnés para compatibilidad, pero los prefijos de proveedores heredados respaldados por tiempo de ejecución no
se muestran como opciones normales de modelo/proveedor.

Si el complemento `codex` está habilitado pero el modelo principal sigue siendo `openai-codex/*`, `openclaw doctor` avisa en lugar de cambiar la ruta. Eso es intencional: `openai-codex/*` sigue siendo la ruta de OAuth/suscripción de PI Codex, y la ejecución nativa del servidor de aplicaciones sigue siendo una opción explícita en tiempo de ejecución.

## Mapa de ruta

Use esta tabla antes de cambiar la configuración:

| Comportamiento deseado                                         | Referencia del modelo                 | Configuración de tiempo de ejecución  | Requisito del complemento                       | Etiqueta de estado esperada                  |
| -------------------------------------------------------------- | ------------------------------------- | ------------------------------------- | ----------------------------------------------- | -------------------------------------------- |
| API de OpenAI a través del ejecutor normal de OpenClaw         | `openai/gpt-*`                        | omitido o `runtime: "pi"`             | Proveedor de OpenAI                             | `Runtime: OpenClaw Pi Default`               |
| OAuth/suscripción de Codex a través de PI                      | `openai-codex/gpt-*`                  | omitido o `runtime: "pi"`             | Proveedor OAuth de OpenAI Codex                 | `Runtime: OpenClaw Pi Default`               |
| Turnos integrados del servidor de aplicaciones nativo de Codex | `openai/gpt-*`                        | `agentRuntime.id: "codex"`            | complemento `codex`                             | `Runtime: OpenAI Codex`                      |
| Proveedores mixtos con modo automático conservador             | referencias específicas del proveedor | `agentRuntime.id: "auto"`             | Tiempos de ejecución de complementos opcionales | Depende del tiempo de ejecución seleccionado |
| Sesión explícita del adaptador ACP de Codex                    | Depende del prompt/modelo de ACP      | `sessions_spawn` con `runtime: "acp"` | backend `acpx` saludable                        | Estado de tarea/sesión de ACP                |

La división importante es proveedor frente a tiempo de ejecución:

- `openai-codex/*` responde "¿qué ruta de proveedor/autenticación debería usar PI?"
- `agentRuntime.id: "codex"` responde "¿qué bucle debe ejecutar este
  turno integrado?"
- `/codex ...` responde "¿a qué conversación nativa de Codex debe vincularse
  o controlar este chat?"
- ACP responde "¿qué proceso de arnés externo debería lanzar acpx?"

## Elija el prefijo de modelo correcto

Las rutas de la familia OpenAI son específicas del prefijo. Use `openai-codex/*` cuando quiera OAuth de Codex a través de PI; use `openai/*` cuando quiera acceso directo a la API de OpenAI o cuando esté forzando el arnés del servidor de aplicaciones nativo de Codex:

| Referencia del modelo                         | Ruta de tiempo de ejecución                                       | Usar cuando                                                                                   |
| --------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `openai/gpt-5.4`                              | Proveedor de OpenAI a través de la infraestructura de OpenClaw/PI | Desea el acceso directo actual a la API de la plataforma OpenAI con `OPENAI_API_KEY`.         |
| `openai-codex/gpt-5.5`                        | OAuth de OpenAI Codex a través de OpenClaw/PI                     | Desea autenticación de suscripción de ChatGPT/Codex con el ejecutor PI predeterminado.        |
| `openai/gpt-5.5` + `agentRuntime.id: "codex"` | Arnés del servidor de aplicaciones Codex                          | Desea ejecución nativa del servidor de aplicaciones Codex para el turno del agente integrado. |

GPT-5.5 es actualmente solo de suscripción/OAuth en OpenClaw. Use
`openai-codex/gpt-5.5` para PI OAuth, o `openai/gpt-5.5` con el arnés
del servidor de aplicaciones Codex. El acceso directo por clave API para `openai/gpt-5.5` es compatible
una vez que OpenAI habilite GPT-5.5 en la API pública.

Las referencias `codex/gpt-*` heredadas siguen siendo aceptadas como alias de compatibilidad. La migración
de compatibilidad del Doctor reescribe las referencias heredadas del tiempo de ejecución principal a referencias
de modelo canónicas y registra la política de tiempo de ejecución por separado, mientras que las referencias heredadas
solo de reserva se dejan sin cambios porque el tiempo de ejecución está configurado para todo el contenedor del agente.
Las nuevas configuraciones de OAuth de PI Codex deben usar `openai-codex/gpt-*`; las nuevas configuraciones
del arnés del servidor de aplicaciones nativo deben usar `openai/gpt-*` más
`agentRuntime.id: "codex"`.

`agents.defaults.imageModel` sigue la misma división de prefijos. Use
`openai-codex/gpt-*` cuando la comprensión de imágenes debe ejecutarse a través de la ruta
del proveedor OAuth de OpenAI Codex. Use `codex/gpt-*` cuando la comprensión de imágenes debe ejecutarse
a través de un turno acotado del servidor de aplicaciones Codex. El modelo del servidor de aplicaciones Codex debe
anunciar soporte de entrada de imagen; los modelos Codex de solo texto fallan antes de que el turno de medios
comience.

Use `/status` para confirmar el arnés efectivo para la sesión actual. Si la
selección es sorprendente, habilite el registro de depuración para el subsistema `agents/harness`
y revise el registro estructurado `agent harness selected` de la puerta de enlace. Este
incluye el id del arnés seleccionado, la razón de la selección, la política de tiempo de ejecución/reserva y,
en modo `auto`, el resultado de soporte de cada candidato de complemento.

### Qué significan las advertencias del doctor

`openclaw doctor` advierte cuando todos los siguientes son verdaderos:

- el complemento `codex` incluido está habilitado o permitido
- el modelo principal de un agente es `openai-codex/*`
- el tiempo de ejecución efectivo de ese agente no es `codex`

Esa advertencia existe porque los usuarios a menudo esperan que "complemento de Codex habilitado" implique
"tiempo de ejecución nativo del servidor de aplicaciones Codex". OpenClaw no da ese salto. La advertencia
significa:

- **No se requiere ningún cambio** si pretendías usar ChatGPT/Codex OAuth a través de PI.
- Cambia el modelo a `openai/<model>` y establece
  `agentRuntime.id: "codex"` si pretendías la ejecución nativa del
  servidor de aplicaciones.
- Las sesiones existentes aún necesitan `/new` o `/reset` después de un cambio de tiempo de ejecución,
  porque los pines del tiempo de ejecución de la sesión son persistentes.

La selección del arnés no es un control de sesión en vivo. Cuando se ejecuta un turno incrustado,
OpenClaw registra el id del arnés seleccionado en esa sesión y sigue usándolo para
turnos posteriores en el mismo id de sesión. Cambia la configuración `agentRuntime` o
`OPENCLAW_AGENT_RUNTIME` cuando quieras que las sesiones futuras usen otro arnés;
usa `/new` o `/reset` para iniciar una sesión nueva antes de cambiar una
conversación existente entre PI y Codex. Esto evita reproducir una transcripción a través
de dos sistemas de sesión nativos incompatibles.

Las sesiones heredadas creadas antes de los pines del arnés se tratan como fijadas a PI una vez que
tienen un historial de transcripciones. Usa `/new` o `/reset` para optar por esa conversión en
Codex después de cambiar la configuración.

`/status` muestra el tiempo de ejecución del modelo efectivo. El arnés PI predeterminado aparece como
`Runtime: OpenClaw Pi Default`, y el arnés del servidor de aplicaciones Codex aparece como
`Runtime: OpenAI Codex`.

## Requisitos

- OpenClaw con el complemento incluido `codex` disponible.
- Servidor de aplicaciones Codex `0.125.0` o más reciente. El complemento incluido gestiona un binario
  compatible del servidor de aplicaciones Codex de forma predeterminada, por lo que los comandos locales `codex` en `PATH` no
  afectan el inicio normal del arnés.
- Autenticación de Codex disponible para el proceso del servidor de aplicaciones.

El complemento bloquea protocolos de enlace de servidores de aplicaciones antiguos o sin versión. Esto mantiene
a OpenClaw en la superficie del protocolo contra la que se ha probado.

Para pruebas en vivo y pruebas de humo en Docker, la autenticación generalmente proviene de `OPENAI_API_KEY`, además de archivos opcionales de la CLI de Codex como `~/.codex/auth.json` y `~/.codex/config.toml`. Use el mismo material de autenticación que usa su servidor de aplicaciones Codex local.

## Configuración mínima

Use `openai/gpt-5.5`, habilite el complemento incluido y fuerce el arnés `codex`:

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
      agentRuntime: {
        id: "codex",
      },
    },
  },
}
```

Si su configuración usa `plugins.allow`, incluya también `codex` allí:

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

Las configuraciones heredadas que establecen `agents.defaults.model` o un modelo de agente en `codex/<model>` aún habilitan automáticamente el complemento `codex` incluido. Las nuevas configuraciones deben preferir `openai/<model>` más la entrada explícita `agentRuntime` anterior.

## Añadir Codex junto a otros modelos

No establezca `agentRuntime.id: "codex"` globalmente si el mismo agente debe cambiar libremente entre modelos de proveedores Codex y no Codex. Un tiempo de ejecución forzado se aplica a cada turno integrado para ese agente o sesión. Si selecciona un modelo de Anthropic mientras ese tiempo de ejecución está forzado, OpenClaw aún intenta el arnés Codex y falla cerrado en lugar de enrutar silenciosamente ese turno a través de PI.

Use una de estas formas en su lugar:

- Ponga Codex en un agente dedicado con `agentRuntime.id: "codex"`.
- Mantenga el agente predeterminado en `agentRuntime.id: "auto"` y el respaldo de PI para el uso normal de proveedores mixtos.
- Use referencias heredadas `codex/*` solo para compatibilidad. Las nuevas configuraciones deben preferir `openai/*` más una política explícita de tiempo de ejecución de Codex.

Por ejemplo, esto mantiene el agente predeterminado en selección automática normal y añade un agente Codex separado:

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
      agentRuntime: {
        id: "auto",
        fallback: "pi",
      },
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
        agentRuntime: {
          id: "codex",
        },
      },
    ],
  },
}
```

Con esta forma:

- El agente `main` predeterminado usa la ruta normal del proveedor y el respaldo de compatibilidad PI.
- El agente `codex` usa el arnés del servidor de aplicaciones Codex.
- Si Codex falta o no es compatible para el agente `codex`, el turno falla en lugar de usar PI silenciosamente.

## Enrutamiento de comandos del agente

Los agentes deben enrutar las solicitudes de los usuarios por intención, no solo por la palabra "Codex":

| El usuario pide...                                        | El agente debe usar...                         |
| --------------------------------------------------------- | ---------------------------------------------- |
| "Vincular este chat a Codex"                              | `/codex bind`                                  |
| "Reanudar hilo de Codex `<id>` aquí"                      | `/codex resume <id>`                           |
| "Mostrar hilos de Codex"                                  | `/codex threads`                               |
| "Usar Codex como el tiempo de ejecución para este agente" | cambio de configuración a `agentRuntime.id`    |
| "Usar mi suscripción a ChatGPT/Codex con OpenClaw normal" | referencias de modelos `openai-codex/*`        |
| "Ejecutar Codex a través de ACP/acpx"                     | ACP `sessions_spawn({ runtime: "acp", ... })`  |
| "Iniciar Claude Code/Gemini/OpenCode/Cursor en un hilo"   | ACP/acpx, no `/codex` y no sub-agentes nativos |

OpenClaw solo anuncia orientación de generación ACP a los agentes cuando ACP está habilitado,
disponible para despacho y respaldado por un tiempo de ejecución de backend cargado. Si ACP no está disponible,
el prompt del sistema y las habilidades del complemento no deben enseñar al agente sobre el enrutamiento
ACP.

## Despliegues solo de Codex

Fuerce el arnés de Codex cuando necesite probar que cada turno de agente integrado
usa Codex. Los tiempos de ejecución de complementos explícitos no tienen respaldo PI por defecto, por lo que
`fallback: "none"` es opcional pero a menudo útil como documentación:

```json5
{
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
      agentRuntime: {
        id: "codex",
        fallback: "none",
      },
    },
  },
}
```

Sobrescritura de entorno:

```bash
OPENCLAW_AGENT_RUNTIME=codex openclaw gateway run
```

Con Codex forzado, OpenClaw falla temprano si el complemento de Codex está deshabilitado, el
servidor de aplicaciones es demasiado antiguo, o el servidor de aplicaciones no puede iniciarse. Establezca
`OPENCLAW_AGENT_HARNESS_FALLBACK=pi` solo si intencionalmente desea que PI maneje
la selección de arnés faltante.

## Codex por agente

Puede hacer que un agente sea solo de Codex mientras que el agente predeterminado mantiene la
selección automática normal:

```json5
{
  agents: {
    defaults: {
      agentRuntime: {
        id: "auto",
        fallback: "pi",
      },
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
        agentRuntime: {
          id: "codex",
          fallback: "none",
        },
      },
    ],
  },
}
```

Use comandos de sesión normales para cambiar de agentes y modelos. `/new` crea una sesión
fresca de OpenClaw y el arnés de Codex crea o reanuda su hilo de sidecar del servidor de aplicaciones
según sea necesario. `/reset` borra el enlace de sesión de OpenClaw para ese hilo
y permite que el siguiente turno resuelva el arnés desde la configuración actual nuevamente.

## Descubrimiento de modelos

Por defecto, el complemento Codex solicita al servidor de aplicaciones los modelos disponibles. Si
el descubrimiento falla o agota el tiempo de espera, utiliza un catálogo de respaldo incluido para:

- GPT-5.5
- GPT-5.4 mini
- GPT-5.2

Puede ajustar el descubrimiento bajo `plugins.entries.codex.config.discovery`:

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

Desactive el descubrimiento cuando desee que el inicio evite sondear Codex y se apegue al
catálogo de respaldo:

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

## Conexión y política del servidor de aplicaciones

Por defecto, el complemento inicia el binario administrado de Codex de OpenClaw localmente con:

```bash
codex app-server --listen stdio://
```

El binario administrado se declara como una dependencia de tiempo de ejecución del complemento incluido y se implementa
con el resto de las dependencias del complemento `codex`. Esto mantiene la versión del servidor de aplicaciones
vinculada al complemento incluido en lugar de a la CLI de Codex separada que
suceda que esté instalada localmente. Establezca `appServer.command` solo cuando
intencionalmente desee ejecutar un ejecutable diferente.

De forma predeterminada, OpenClaw inicia sesiones locales de arnés de Codex en modo YOLO:
`approvalPolicy: "never"`, `approvalsReviewer: "user"` y
`sandbox: "danger-full-access"`. Esta es la postura del operador local de confianza utilizada
para latidos autónomos: Codex puede usar herramientas de shell y red sin
detenerse en indicaciones de aprobación nativa que nadie está presente para responder.

Para optar por las aprobaciones revisadas por el guardián de Codex, establezca `appServer.mode:
"guardian"`:

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            mode: "guardian",
            serviceTier: "fast",
          },
        },
      },
    },
  },
}
```

El modo guardián utiliza la ruta de aprobación de auto-revisión nativa de Codex. Cuando Codex solicita
salir del espacio aislado, escribir fuera del espacio de trabajo o agregar permisos como el acceso a la
red, Codex enruta esa solicitud de aprobación al revisor nativo en lugar de a un
indicador humano. El revisor aplica el marco de riesgo de Codex y aprueba o deniega
la solicitud específica. Use Guardian cuando desee más protecciones que el modo YOLO
pero aún necesite que los agentes desatendidos progresen.

El ajuste preestablecido `guardian` se expande a `approvalPolicy: "on-request"`,
`approvalsReviewer: "auto_review"` y `sandbox: "workspace-write"`.
Los campos de política individuales aún anulan `mode`, por lo que las implementaciones avanzadas pueden mezclar
el ajuste preestablecido con elecciones explícitas. El valor de revisor `guardian_subagent` más antiguo
aún se acepta como un alias de compatibilidad, pero las nuevas configuraciones deberían usar
`auto_review`.

Para un servidor de aplicaciones ya en ejecución, use el transporte WebSocket:

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            transport: "websocket",
            url: "ws://127.0.0.1:39175",
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

| Campo               | Predeterminado                           | Significado                                                                                                                                      |
| ------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `transport`         | `"stdio"`                                | `"stdio"` genera Codex; `"websocket"` se conecta a `url`.                                                                                        |
| `command`           | binario administrado de Codex            | Ejecutable para el transporte stdio. Déjelo sin establecer para usar el binario administrado; establézcalo solo para una invalidación explícita. |
| `args`              | `["app-server", "--listen", "stdio://"]` | Argumentos para el transporte stdio.                                                                                                             |
| `url`               | sin establecer                           | URL del servidor de aplicaciones WebSocket.                                                                                                      |
| `authToken`         | sin establecer                           | Token de portador para el transporte WebSocket.                                                                                                  |
| `headers`           | `{}`                                     | Encabezados adicionales de WebSocket.                                                                                                            |
| `requestTimeoutMs`  | `60000`                                  | Tiempo de espera para las llamadas al plano de control del servidor de aplicaciones.                                                             |
| `mode`              | `"yolo"`                                 | Ajuste preestablecido para la ejecución YOLO o revisada por un guardián.                                                                         |
| `approvalPolicy`    | `"never"`                                | Política de aprobación nativa de Codex enviada al inicio/reanudación/turno del hilo.                                                             |
| `sandbox`           | `"danger-full-access"`                   | Modo de sandbox nativo de Codex enviado al inicio/reanudación del hilo.                                                                          |
| `approvalsReviewer` | `"user"`                                 | Use `"auto_review"` para permitir que Codex revise los avisos de aprobación nativos. `guardian_subagent` sigue siendo un alias heredado.         |
| `serviceTier`       | sin establecer                           | Nivel de servicio opcional del servidor de aplicaciones Codex: `"fast"`, `"flex"` o `null`. Se ignoran los valores heredados no válidos.         |

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
`OPENCLAW_CODEX_APP_SERVER_MODE=guardian` para pruebas locales únicas. La configuración es
preferida para implementaciones repetibles porque mantiene el comportamiento del complemento en el
mismo archivo revisado que el resto de la configuración del arnés de Codex.

## Uso del equipo

Computer Use es un complemento MCP nativo de Codex. OpenClaw no distribuye la aplicación de control de escritorio ni ejecuta acciones de escritorio por sí mismo; habilita los complementos del servidor de aplicaciones de Codex, instala el complemento del mercado de Codex configurado cuando se solicita, verifica que el servidor MCP `computer-use` esté disponible y luego permite que Codex maneje las llamadas a herramientas MCP nativas durante los turnos en modo Codex.

Establezca `plugins.entries.codex.config.computerUse` cuando desee que los turnos en modo Codex requieran Computer Use:

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          computerUse: {
            autoInstall: true,
          },
        },
      },
    },
  },
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
      embeddedHarness: {
        runtime: "codex",
      },
    },
  },
}
```

Sin campos de mercado, OpenClaw le pide al servidor de aplicaciones de Codex que use sus mercados descubiertos. En un hogar de Codex nuevo, el servidor de aplicaciones inicializa el mercado oficial curado y OpenClaw sigue la misma forma de carga que Codex: sondea `plugin/list` durante la instalación antes de tratar Computer Use como no disponible. El tiempo de espera de descubrimiento predeterminado es de 60 segundos y se puede ajustar con `marketplaceDiscoveryTimeoutMs`. Si varios mercados conocidos de Codex contienen Computer Use, OpenClaw usa el orden de preferencia del mercado de Codex antes de fallar cerrando para coincidencias ambiguas desconocidas.

Use `marketplaceSource` para una fuente de mercado de Codex no predeterminada que el servidor de aplicaciones pueda agregar, o `marketplacePath` para un archivo de mercado local que ya exista en la máquina. Si el mercado ya está registrado con el servidor de aplicaciones de Codex, use `marketplaceName` en su lugar. Los valores predeterminados son `pluginName: "computer-use"` y `mcpServerName: "computer-use"`. Por seguridad, la auto-instalación al inicio del turno solo usa mercados que el servidor de aplicaciones ya ha descubierto. Use `/codex computer-use install` para instalaciones explícitas desde un `marketplaceSource` o `marketplacePath` configurado.

La misma configuración se puede verificar o instalar desde la superficie de comandos:

- `/codex computer-use status`
- `/codex computer-use install`
- `/codex computer-use install --source <marketplace-source>`
- `/codex computer-use install --marketplace-path <path>`

Computer Use es específico de macOS y puede requerir permisos locales del sistema operativo antes de que el servidor MCP de Codex pueda controlar las aplicaciones. Si `computerUse.enabled` es verdadero y el servidor MCP no está disponible, los turnos en modo Codex fallan antes de que comience el hilo en lugar de ejecutarse silenciosamente sin las herramientas nativas de Computer Use.

## Recetas comunes

Codex local con transporte stdio predeterminado:

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
}
```

Validación del arnés solo de Codex:

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
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
}
```

Aprobaciones de Codex revisadas por Guardian:

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            mode: "guardian",
            approvalPolicy: "on-request",
            approvalsReviewer: "auto_review",
            sandbox: "workspace-write",
          },
        },
      },
    },
  },
}
```

Servidor de aplicaciones remoto con encabezados explícitos:

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
            headers: {
              "X-OpenClaw-Agent": "main",
            },
          },
        },
      },
    },
  },
}
```

El cambio de modelo permanece controlado por OpenClaw. Cuando una sesión de OpenClaw está adjunta a un hilo de Codex existente, el siguiente turno envía el modelo de OpenAI, el proveedor, la política de aprobación, el sandbox y el nivel de servicio seleccionados actualmente al servidor de aplicaciones nuevamente. Cambiar de `openai/gpt-5.5` a `openai/gpt-5.2` mantiene el enlace del hilo pero pide a Codex que continúe con el modelo recién seleccionado.

## Comando Codex

El complemento incluido registra `/codex` como un comando de barra autorizado. Es genérico y funciona en cualquier canal que admita comandos de texto de OpenClaw.

Formas comunes:

- `/codex status` muestra la conectividad en vivo del servidor de aplicaciones, modelos, cuenta, límites de velocidad, servidores MCP y habilidades.
- `/codex models` enumera los modelos del servidor de aplicaciones Codex en vivo.
- `/codex threads [filter]` enumera los hilos de Codex recientes.
- `/codex resume <thread-id>` adjunta la sesión actual de OpenClaw a un hilo de Codex existente.
- `/codex compact` pide al servidor de aplicaciones Codex que compacte el hilo adjunto.
- `/codex review` inicia la revisión nativa de Codex para el hilo adjunto.
- `/codex computer-use status` verifica el complemento de Computer Use configurado y el servidor MCP.
- `/codex computer-use install` instala el complemento de Computer Use configurado y recarga los servidores MCP.
- `/codex account` muestra el estado de la cuenta y los límites de velocidad.
- `/codex mcp` enumera el estado del servidor MCP del servidor de aplicaciones Codex.
- `/codex skills` enumera las habilidades del servidor de aplicaciones Codex.

`/codex resume` escribe el mismo archivo de enlace sidecar que el arnés utiliza para turnos normales. En el siguiente mensaje, OpenClaw reanuda ese hilo de Codex, pasa el modelo OpenClaw seleccionado actualmente al servidor de aplicaciones y mantiene el historial extendido habilitado.

La superficie de comandos requiere el servidor de aplicaciones Codex `0.125.0` o más reciente. Los métodos de control individuales se reportan como `unsupported by this Codex app-server` si un servidor de aplicaciones futuro o personalizado no expone ese método JSON-RPC.

## Límites de los ganchos

El arnés de Codex tiene tres capas de ganchos:

| Capa                                                       | Propietario                         | Propósito                                                                                                |
| ---------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Ganchos del complemento OpenClaw                           | OpenClaw                            | Compatibilidad de productos/complementos entre los harnesses PI y Codex.                                 |
| Middleware de extensión del servidor de aplicaciones Codex | Complementos integrados de OpenClaw | Comportamiento del adaptador por turno alrededor de las herramientas dinámicas de OpenClaw.              |
| Ganchos nativos de Codex                                   | Codex                               | Ciclo de vida de bajo nivel de Codex y política de herramientas nativas desde la configuración de Codex. |

OpenClaw no utiliza archivos de configuración de Codex `hooks.json` de proyecto o globales para enrutar
el comportamiento de los complementos de OpenClaw. Para el puente de herramientas nativas y permisos admitido,
OpenClaw inyecta la configuración de Codex por subproceso para `PreToolUse`, `PostToolUse`,
`PermissionRequest` y `Stop`. Otros ganchos de Codex como `SessionStart` y
`UserPromptSubmit` siguen siendo controles a nivel de Codex; no se exponen como
ganchos de complementos de OpenClaw en el contrato v1.

Para las herramientas dinámicas de OpenClaw, OpenClaw ejecuta la herramienta después de que Codex solicita la
llamada, por lo que OpenClaw activa el comportamiento del complemento y middleware que posee en el
adaptador del harness. Para las herramientas nativas de Codex, Codex posee el registro canónico de la herramienta.
OpenClaw puede reflejar eventos seleccionados, pero no puede reescribir el subproceso nativo de
Codex a menos que Codex exponga esa operación a través del servidor de aplicaciones o devoluciones de llamada de
ganchos nativos.

Las proyecciones de compactación y ciclo de vida de LLM provienen de las notificaciones del servidor de aplicaciones de
Codex y el estado del adaptador de OpenClaw, no de los comandos de ganchos nativos de Codex.
Los eventos `before_compaction`, `after_compaction`, `llm_input` y
`llm_output` de OpenClaw son observaciones a nivel de adaptador, no capturas byte por byte
de las cargas útiles internas de solicitud o compactación de Codex.

Las notificaciones del servidor de aplicaciones nativas `hook/started` y `hook/completed` de Codex se
proyectan como eventos de agente `codex_app_server.hook` para la trayectoria y depuración.
No invocan ganchos de complementos de OpenClaw.

## Contrato de soporte V1

El modo Codex no es PI con una llamada de modelo diferente debajo. Codex posee más del
bucle de modelo nativo, y OpenClaw adapta sus superficies de complemento y sesión
alrededor de ese límite.

Admitido en el tiempo de ejecución de Codex v1:

| Superficie                                          | Soporte                                       | Por qué                                                                                                                                                                                                                                                                 |
| --------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bucle de modelo OpenAI a través de Codex            | Admitido                                      | El servidor de aplicaciones Codex posee el turno de OpenAI, la reanudación del subproceso nativo y la continuación de la herramienta nativa.                                                                                                                            |
| Enrutamiento y entrega de canales de OpenClaw       | Admitido                                      | Telegram, Discord, Slack, WhatsApp, iMessage y otros canales se mantienen fuera del tiempo de ejecución del modelo.                                                                                                                                                     |
| Herramientas dinámicas de OpenClaw                  | Admitido                                      | Codex le pide a OpenClaw que ejecute estas herramientas, por lo que OpenClaw se mantiene en la ruta de ejecución.                                                                                                                                                       |
| Complementos de aviso y contexto                    | Admitido                                      | OpenClaw crea superposiciones de avisos y proyecta el contexto en el turno de Codex antes de iniciar o reanudar el hilo.                                                                                                                                                |
| Ciclo de vida del motor de contexto                 | Admitido                                      | El ensamblaje, la ingestión o el mantenimiento posterior al turno, y la coordinación de compactación del motor de contexto se ejecutan para los turnos de Codex.                                                                                                        |
| Ganchos de herramientas dinámicas                   | Admitido                                      | `before_tool_call`, `after_tool_call` y el middleware de resultados de herramientas se ejecutan alrededor de las herramientas dinámicas propiedad de OpenClaw.                                                                                                          |
| Ganchos de ciclo de vida                            | Admitido como observaciones del adaptador     | `llm_input`, `llm_output`, `agent_end`, `before_compaction` y `after_compaction` se activan con cargas útiles de modo Codex honestas.                                                                                                                                   |
| Puerta de revisión de respuesta final               | Admitido a través del relé de ganchos nativos | Codex `Stop` se transmite a `before_agent_finalize`; `revise` le pide a Codex un pase de modelo más antes de la finalización.                                                                                                                                           |
| Bloqueo u observación nativa de shell, parche y MCP | Admitido a través del relé de ganchos nativos | Codex `PreToolUse` y `PostToolUse` se transmiten para superficies de herramientas nativas confirmadas, incluidas las cargas útiles de MCP en el servidor de aplicaciones Codex `0.125.0` o más reciente. El bloqueo es admitido; la reescritura de argumentos no lo es. |
| Política de permisos nativos                        | Admitido a través del relé de ganchos nativos | Codex `PermissionRequest` se puede enrutar a través de la política de OpenClaw donde el tiempo de ejecución la expone. Si OpenClaw no devuelve ninguna decisión, Codex continúa a través de su ruta normal de guardián o aprobación del usuario.                        |
| Captura de trayectoria del servidor de aplicaciones | Admitido                                      | OpenClaw registra la solicitud que envió al servidor de aplicaciones y las notificaciones del servidor de aplicaciones que recibe.                                                                                                                                      |

No admitido en el tiempo de ejecución de Codex v1:

| Superficie                                                            | Límite de V1                                                                                                                                                                    | Ruta futura                                                                                                              |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Mutación de argumentos de herramientas nativas                        | Los ganchos nativos pre-herramienta de Codex pueden bloquear, pero OpenClaw no reescribe los argumentos de herramientas nativas de Codex.                                       | Requiere soporte de hook/esquema de Codex para la entrada de herramienta de reemplazo.                                   |
| Historial de transcripciones nativo de Codex editable                 | Codex posee el historial canónico de hilos nativos. OpenClaw posee un espejo y puede proyectar contexto futuro, pero no debe mutar elementos internos no admitidos.             | Agregue API explícitas del servidor de aplicaciones Codex si se necesita cirugía de hilo nativo.                         |
| `tool_result_persist` para registros de herramientas nativas de Codex | Ese hook transforma las escrituras de transcripción propiedad de OpenClaw, no los registros de herramientas nativas de Codex.                                                   | Podría reflejar los registros transformados, pero la reescritura canónica necesita soporte de Codex.                     |
| Metadatos de compactación nativa enriquecidos                         | OpenClaw observa el inicio y la finalización de la compactación, pero no recibe una lista estable de elementos mantenidos/eliminados, delta de tokens ni carga útil de resumen. | Necesita eventos de compactación de Codex más enriquecidos.                                                              |
| Intervención de compactación                                          | Los hooks de compactación actuales de OpenClaw son de nivel de notificación en modo Codex.                                                                                      | Agregue hooks de pre/post compactación de Codex si los complementos necesitan vetar o reescribir la compactación nativa. |
| Captura de solicitudes de API de modelo byte a byte                   | OpenClaw puede capturar solicitudes y notificaciones del servidor de aplicaciones, pero el núcleo de Codex construye la solicitud final de la API de OpenAI internamente.       | Necesita un evento de seguimiento de solicitud de modelo de Codex o una API de depuración.                               |

## Herramientas, medios y compactación

El arnés de Codex solo cambia el ejecutor del agente incrustado de bajo nivel.

OpenClaw todavía construye la lista de herramientas y recibe resultados dinámicos de herramientas del
arnés. El texto, las imágenes, el video, la música, el TTS, las aprobaciones y la salida de la herramienta de mensajería
continúan a través de la ruta de entrega normal de OpenClaw.

El relé de hooks nativos es intencionalmente genérico, pero el contrato de soporte v1 está
limitado a las rutas de herramientas y permisos nativas de Codex que OpenClaw prueba. En
el tiempo de ejecución de Codex, eso incluye shell, patch, y cargas útiles de MCP `PreToolUse`,
`PostToolUse` y `PermissionRequest`. No asuma que cada evento futuro de
hook de Codex es una superficie de complemento de OpenClaw hasta que el contrato de tiempo de ejecución lo
nomine.

Para `PermissionRequest`, OpenClaw solo devuelve decisiones explícitas de permitir o denegar
cuando la política lo decide. Un resultado sin decisión no es un permiso. Codex lo trata como sin
decisión de hook y pasa a su propio guardián o ruta de aprobación del usuario.

Las solicitudes de aprobación de herramientas de Codex MCP se enrutan a través del flujo de aprobación de complementos de OpenClaw cuando Codex marca `_meta.codex_approval_kind` como `"mcp_tool_call"`. Los indicadores `request_user_input` de Codex se devuelven al chat de origen, y el siguiente mensaje de seguimiento en cola responde a esa solicitud del servidor nativo en lugar de ser dirigido como contexto adicional. Otras solicitudes de elicitación de MCP aún fallan cerradas.

Cuando el modelo seleccionado utiliza el arnés de Codex, la compactación de hilos nativos se delega al servidor de aplicaciones Codex. OpenClaw mantiene un espejo de transcripción para el historial del canal, búsqueda, `/new`, `/reset` y el cambio futuro de modelo o arnés. El espejo incluye el mensaje del usuario, el texto final del asistente y registros de razonamiento o planificación ligeros de Codex cuando el servidor de aplicaciones los emite. Hoy, OpenClaw solo registra las señales de inicio y finalización de la compactación nativa. Aún no expone un resumen de compactación legible por humanos ni una lista auditable de las entradas que Codex mantuvo después de la compactación.

Debido a que Codex posee el hilo nativo canónico, `tool_result_persist` actualmente no reescribe los registros de resultados de herramientas nativas de Codex. Solo se aplica cuando OpenClaw está escribiendo un resultado de herramienta de transcripción de sesión propiedad de OpenClaw.

La generación de medios no requiere PI. Imagen, video, música, PDF, TTS y la comprensión de medios continúan utilizando la configuración de proveedor/modelo coincidente, como `agents.defaults.imageGenerationModel`, `videoGenerationModel`, `pdfModel` y `messages.tts`.

## Solución de problemas

**Codex no aparece como un proveedor `/model` normal:** eso es esperado para nuevas configuraciones. Seleccione un modelo `openai/gpt-*` con `agentRuntime.id: "codex"` (o una referencia `codex/*` heredada), habilite `plugins.entries.codex.enabled` y verifique si `plugins.allow` excluye `codex`.

**OpenClaw usa PI en lugar de Codex:** `agentRuntime.id: "auto"` aún puede usar PI como el
backend de compatibilidad cuando ningún arnés Codex reclama la ejecución. Establezca
`agentRuntime.id: "codex"` para forzar la selección de Codex durante las pruebas. Un
entorno de ejecución de Codex forzado ahora falla en lugar de volver a PI a menos que
establezca explícitamente `agentRuntime.fallback: "pi"`. Una vez que se selecciona el servidor de aplicaciones de Codex,
sus fallas se muestran directamente sin configuración alternativa adicional.

**El servidor de aplicaciones es rechazado:** actualice Codex para que el handshake del servidor de aplicaciones
informe la versión `0.125.0` o más reciente. Los prereleases de la misma versión o versiones con sufijo de construcción
tales como `0.125.0-alpha.2` o `0.125.0+custom` son rechazados porque el
piso de protocolo estable `0.125.0` es lo que OpenClaw prueba.

**El descubrimiento de modelos es lento:** reduzca `plugins.entries.codex.config.discovery.timeoutMs`
o desactive el descubrimiento.

**El transporte WebSocket falla inmediatamente:** verifique `appServer.url`, `authToken`,
y que el servidor de aplicaciones remoto hable la misma versión del protocolo del servidor de aplicaciones de Codex.

**Un modelo no-Codex usa PI:** eso es esperado a menos que haya forzado
`agentRuntime.id: "codex"` para ese agente o haya seleccionado una referencia
`codex/*` heredada. Las referencias `openai/gpt-*` simples y de otros proveedores se mantienen en su ruta
normal de proveedor en el modo `auto`. Si fuerza `agentRuntime.id: "codex"`, cada turno
incrustado para ese agente debe ser un modelo OpenAI compatible con Codex.

## Relacionado

- [Plugins de arnés de agente](/es/plugins/sdk-agent-harness)
- [Entornos de ejecución de agente](/es/concepts/agent-runtimes)
- [Proveedores de modelos](/es/concepts/model-providers)
- [Proveedor OpenAI](/es/providers/openai)
- [Estado](/es/cli/status)
- [Ganchos de complementos](/es/plugins/hooks)
- [Referencia de configuración](/es/gateway/configuration-reference)
- [Pruebas](/es/help/testing-live#live-codex-app-server-harness-smoke)
