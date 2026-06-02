---
summary: "Ejecutar turnos de agente integrado de OpenClaw a través del arnés de app-server de Codex incluido"
title: "Arnés de Codex"
read_when:
  - You want to use the bundled Codex app-server harness
  - You need Codex harness config examples
  - You want Codex-only deployments to fail instead of falling back to OpenClaw
---

El complemento `codex` incluido permite a OpenClaw ejecutar turnos de agente OpenAI incrustados a través del servidor de aplicaciones Codex en lugar del arnés OpenClaw integrado.

Use el arnés de Codex cuando desee que Codex sea propietario de la sesión del agente de bajo nivel:
reanudación de subprocesos nativos, continuación de herramientas nativas, compactación nativa y
ejecución del servidor de aplicaciones. OpenClaw sigue siendo propietario de los canales de chat, los archivos de sesión, la selección de modelos,
las herramientas dinámicas de OpenClaw, las aprobaciones, la entrega de medios y el espejo
del transcript visible.

La configuración normal utiliza referencias de modelos canónicas de OpenAI como `openai/gpt-5.5`.
No configure referencias GPT heredadas de Codex. Coloque el orden de autenticación del agente OpenAI
bajo `auth.order.openai`; los identificadores heredados de perfiles de autenticación de Codex
y las entradas heredadas del orden de autenticación de Codex son estados heredados reparados por
`openclaw doctor --fix`.

Cuando no hay ningún sandbox de OpenClaw activo, OpenClaw inicia hilos del servidor de aplicaciones Codex
con el modo de código nativo de Codex habilitado mientras deja code-mode-only desactivado de forma predeterminada.
Esto mantiene disponibles las capacidades de espacio de trabajo y código nativo de Codex mientras
las herramientas dinámicas de OpenClaw continúan a través del puente `item/tool/call` del servidor de aplicaciones.
El sandbox activo de OpenClaw y las políticas de herramientas restringidas desactivan el modo de código nativo
por completo a menos que opte por la ruta experimental del servidor de ejecución de sandbox.

Esta característica nativa de Codex es independiente de
[modo de código de OpenClaw](/es/reference/code-mode), que es un tiempo de ejecución QuickJS-WASI
opcional para ejecuciones genéricas de OpenClaw con una forma de entrada `exec` diferente.

Para la división más amplia de modelo/proveedor/tiempo de ejecución, comience con
[Tiempos de ejecución de agentes](/es/concepts/agent-runtimes). La versión corta es:
`openai/gpt-5.5` es la referencia del modelo, `codex` es el tiempo de ejecución, y Telegram,
Discord, Slack u otro canal permanece como la superficie de comunicación.

## Requisitos

- OpenClaw con el complemento `codex` incluido disponible.
- Si su configuración utiliza `plugins.allow`, incluya `codex`.
- Servidor de aplicaciones Codex `0.125.0` o más reciente. El complemento incluido gestiona un binario
  compatible del servidor de aplicaciones Codex de forma predeterminada, por lo que los comandos locales `codex` en `PATH` no
  afectan el inicio normal del arnés.
- Autenticación de Codex disponible a través de `openclaw models auth login --provider openai`,
  una cuenta de servidor de aplicaciones en el inicio de Codex del agente, o un perfil de
  autenticación explícito con clave de API de Codex.

Para la precedencia de autenticación, aislamiento del entorno, comandos personalizados del servidor de aplicaciones, descubrimiento
de modelos y todos los campos de configuración, consulte
[Referencia del arnés de Codex](/es/plugins/codex-harness-reference).

## Inicio rápido

La mayoría de los usuarios que quieren Codex en OpenClaw prefieren esta ruta: iniciar sesión con una
suscripción a ChatGPT/Codex, habilitar el complemento incluido `codex` y usar una
referencia de modelo `openai/gpt-*` canónica.

Inicie sesión con Codex OAuth:

```bash
openclaw models auth login --provider openai
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
tiene una sesión, use `/new` o `/reset` antes de probar los cambios en tiempo de ejecución para que el
siguiente turno resuelva el arnés desde la configuración actual.

## Configuración

La configuración de inicio rápido es la configuración mínima viable del arnés de Codex. Establezca las opciones
del arnés de Codex en la configuración de OpenClaw y use la CLI solo para la autenticación de Codex:

| Necesidad                                                         | Establecer                                                                                                  | Donde                                                      |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Habilitar el arnés                                                | `plugins.entries.codex.enabled: true`                                                                       | Configuración de OpenClaw                                  |
| Mantener una instalación de complemento en lista blanca           | Incluir `codex` en `plugins.allow`                                                                          | Configuración de OpenClaw                                  |
| Enrutar los turnos del agente de OpenAI a través de Codex         | `agents.defaults.model` o `agents.list[].model` como `openai/gpt-*`                                         | Configuración del agente de OpenClaw                       |
| Iniciar sesión con OAuth de ChatGPT/Codex                         | `openclaw models auth login --provider openai`                                                              | Perfil de autenticación de CLI                             |
| Agregar copia de seguridad de clave API para ejecuciones de Codex | Perfil de clave de API `openai:*` listado después de la autenticación de suscripción en `auth.order.openai` | Perfil de autenticación de CLI + configuración de OpenClaw |
| Fallo cerrado cuando Codex no está disponible                     | Proveedor o modelo `agentRuntime.id: "codex"`                                                               | Configuración de modelo/proveedor de OpenClaw              |
| Usar el tráfico directo de la API de OpenAI                       | Proveedor o modelo `agentRuntime.id: "openclaw"` con autenticación normal de OpenAI                         | Configuración de modelo/proveedor de OpenClaw              |
| Ajustar el comportamiento del servidor de aplicaciones            | `plugins.entries.codex.config.appServer.*`                                                                  | Configuración del complemento de Codex                     |
| Habilitar aplicaciones nativas del complemento de Codex           | `plugins.entries.codex.config.codexPlugins.*`                                                               | Configuración del complemento de Codex                     |
| Habilitar el uso de computadora de Codex                          | `plugins.entries.codex.config.computerUse.*`                                                                | Configuración del complemento de Codex                     |

Use referencias de modelo `openai/gpt-*` para turnos de agente OpenAI respaldados por Codex. Prefiera
`auth.order.openai` para el orden de suscripción primero/respaldo de clave de API. Los
ids de perfil de autenticación de Codex heredados existentes y el orden de autenticación de Codex heredado son estados heredados
solo para doctores; no escriba nuevas referencias GPT de Codex heredadas.

No configure `compaction.model` o `compaction.provider` en agentes respaldados por Codex.
Codex compacta a través de su estado de subproceso nativo del servidor de aplicaciones, por lo que OpenClaw ignora
esas anulaciones locales del resumen en tiempo de ejecución y `openclaw doctor --fix` las elimina
cuando el agente usa Codex.

Lossless sigue siendo compatible como motor de contexto para el ensamblaje, ingestión y
mantenimiento alrededor de los turnos de Codex. Configúrelo a través de
`plugins.slots.contextEngine: "lossless-claw"` y
`plugins.entries.lossless-claw.config.summaryModel`, no a través de
`agents.defaults.compaction.provider`. `openclaw doctor --fix` migra la antigua
forma `compaction.provider: "lossless-claw"` a la ranura del motor de contexto Lossless
cuando Codex es el tiempo de ejecución activo, pero el Codex nativo aún es propietario de la compactación.

El arnés nativo del servidor de aplicaciones Codex es compatible con motores de contexto que requieren
ensamblaje previo del prompt. Los backends de CLI genéricos, incluidos `codex-cli`, no proporcionan
dicha capacidad de host.

Para los agentes respaldados por Codex, `/compact` inicia la compactación nativa del servidor de aplicaciones Codex en
el subproceso enlazado. OpenClaw no espera a que se complete, impone un tiempo de espera de OpenClaw,
reinicia el servidor de aplicaciones compartido ni recurre a un motor de contexto o
resumen público de OpenAI. Si falta el enlace del subproceso nativo de Codex o
está obsoleto, el comando falla de forma cerrada para que el operador vea el límite real del tiempo de ejecución
en lugar de cambiar silenciosamente los backends de compactación.

```json5
{
  auth: {
    order: {
      openai: ["openai:user@example.com", "openai:api-key-backup"],
    },
  },
}
```

En esa forma, ambos perfiles aún se ejecutan a través de Codex para los turnos del agente
`openai/gpt-*`. La clave de API es solo una alternativa de autenticación, no una solicitud para cambiar a OpenClaw o
respuestas de OpenAI simples.

El resto de esta página cubre variantes comunes entre las que los usuarios deben elegir:
forma de implementación, enrutamiento de falla cerrada, política de aprobación del guardián, complementos nativos de Codex
y Computer Use. Para listas de opciones completas, valores predeterminados, enumeraciones, descubrimiento,
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

`/codex status` informa la conectividad del servidor de aplicaciones, la cuenta, los límites de tasa, los servidores MCP
y las habilidades. `/codex models` enumera el catálogo en vivo del servidor de aplicaciones Codex para
el arnés y la cuenta. Si `/status` es sorprendente, consulte
[Solución de problemas](#troubleshooting).

## Enrutamiento y selección de modelos

Mantenga las referencias del proveedor y la política de tiempo de ejecución separadas:

- Use `openai/gpt-*` para los turnos de agente OpenAI a través de Codex.
- No use referencias heredadas de Codex GPT en la configuración. Ejecute `openclaw doctor --fix` para reparar las referencias heredadas y los pines de ruta de sesión obsoletos.
- `agentRuntime.id: "codex"` es opcional para el modo automático normal de OpenAI, pero útil cuando una implementación debería fallar cerrada si Codex no está disponible.
- `agentRuntime.id: "openclaw"` opta por un proveedor o modelo en el tiempo de ejecución integrado de OpenClaw cuando esto es intencional.
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

| Caso de uso                                                          | Configurar                                                                        | Verificar                                            | Notas                                         |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------- |
| Suscripción ChatGPT/Codex con tiempo de ejecución nativo de Codex    | `openai/gpt-*` más el complemento `codex` habilitado                              | `/status` muestra `Runtime: OpenAI Codex`            | Ruta recomendada                              |
| Fallo cerrado si Codex no está disponible                            | Proveedor o modelo `agentRuntime.id: "codex"`                                     | El turno falla en lugar de una alternativa integrada | Usar para implementaciones solo de Codex      |
| Dirigir el tráfico de la clave de API de OpenAI a través de OpenClaw | Proveedor o modelo `agentRuntime.id: "openclaw"` y autenticación normal de OpenAI | `/status` muestra el tiempo de ejecución de OpenClaw | Usar solo cuando OpenClaw sea intencional     |
| Configuración heredada                                               | referencias heredadas de Codex GPT                                                | `openclaw doctor --fix` lo reescribe                 | No escriba nueva configuración de esta manera |
| Adaptador ACP/acpx Codex                                             | ACP `sessions_spawn({ runtime: "acp" })`                                          | Estado de tarea/sesión ACP                           | Separado del harness nativo de Codex          |

`agents.defaults.imageModel` sigue la misma división de prefijos. Use `openai/gpt-*` para la ruta normal de OpenAI y `codex/gpt-*` solo cuando la comprensión de imágenes debe ejecutarse a través de un turno del servidor de aplicaciones Codex delimitado. No use referencias heredadas de Codex GPT; el médico reescribe ese prefijo heredado a `openai/gpt-*`.

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

Con esta configuración, el agente `main` usa su ruta de proveedor normal y el agente `codex` usa el servidor de aplicaciones Codex.

### Despliegue de Codex con fallo cerrado (fail-closed)

Para los turnos del agente OpenAI, `openai/gpt-*` ya se resuelve a Codex cuando el complemento incluido está disponible. Agregue una política de tiempo de ejecución explícita cuando desee una regla de falla cerrada escrita:

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

De forma predeterminada, el complemento inicia el binario de Codex administrado por OpenClaw localmente con transporte stdio. Establezca `appServer.command` solo cuando intencionalmente desee ejecutar un ejecutable diferente. Use el transporte WebSocket solo cuando un servidor de aplicaciones ya se esté ejecutando en otro lugar:

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

Las sesiones locales de servidor de aplicaciones stdio tienen como valor predeterminado la postura de operador local de confianza: `approvalPolicy: "never"`, `approvalsReviewer: "user"` y `sandbox: "danger-full-access"`. Si los requisitos locales de Codex no permiten esa postura YOLO implícita, OpenClaw selecciona los permisos de guardián permitidos en su lugar. Cuando hay un sandbox de OpenClaw activo para la sesión, OpenClaw deshabilita el modo de código nativo de Codex, los servidores MCP del usuario y la ejecución de complementos respaldados por aplicaciones para ese turno, en lugar de confiar en el sandbox del lado del host de Codex. El acceso al shell se expone a través de herramientas dinámicas respaldadas por el sandbox de OpenClaw, como `sandbox_exec` y `sandbox_process`, cuando las herramientas normales de ejecución/proceso están disponibles.

Use el modo exec normalizado de OpenClaw cuando desee la auto-revisión nativa de Codex antes
de escapes del sandbox o permisos adicionales:

```json5
{
  tools: {
    exec: {
      mode: "auto",
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

Para las sesiones del servidor de aplicaciones de Codex, OpenClaw asigna `tools.exec.mode: "auto"` a las aprobaciones revisadas por el guardián de Codex, generalmente `approvalPolicy: "on-request"`, `approvalsReviewer: "auto_review"` y `sandbox: "workspace-write"`, cuando los requisitos locales permiten esos valores. En `tools.exec.mode: "auto"`, OpenClaw no conserva las anulaciones inseguras heredadas de Codex `approvalPolicy: "never"` o `sandbox: "danger-full-access"`; use `tools.exec.mode: "full"` para una postura intencional de Codex sin aprobaciones. El ajuste preestablecido heredado `plugins.entries.codex.config.appServer.mode: "guardian"` todavía funciona, pero `tools.exec.mode: "auto"` es la superficie normalizada de OpenClaw.

Para cada campo del servidor de aplicaciones, orden de autenticación, aislamiento del entorno, descubrimiento y comportamiento de tiempo de espera, consulte [Referencia de arnés de Codex](/es/plugins/codex-harness-reference).

## Comandos y diagnósticos

El complemento integrado registra `/codex` como un comando de barra en cualquier canal que admita comandos de texto de OpenClaw.

Formas comunes:

- `/codex status` verifica la conectividad del servidor de aplicaciones, modelos, cuenta, límites de velocidad, servidores MCP y habilidades.
- `/codex models` enumera los modelos en vivo del servidor de aplicaciones de Codex.
- `/codex threads [filter]` enumera los hilos recientes del servidor de aplicaciones de Codex.
- `/codex resume <thread-id>` adjunta la sesión actual de OpenClaw a un
  hilo de Codex existente.
- `/codex compact` solicita al servidor de aplicaciones Codex que compacte el hilo adjunto.
- `/codex review` inicia la revisión nativa de Codex para el hilo adjunto.
- `/codex diagnostics [note]` solicita permiso antes de enviar comentarios de Codex para el
  hilo adjunto.
- `/codex account` muestra el estado de la cuenta y del límite de velocidad.
- `/codex mcp` enumera el estado del servidor MCP del servidor de aplicaciones Codex.
- `/codex skills` enumera las habilidades del servidor de aplicaciones Codex.

Para la mayoría de los informes de soporte, comience con `/diagnostics [note]` en la conversación
donde ocurrió el error. Crea un informe de diagnóstico de Gateway y, para las sesiones de
arnés de Codex, solicita aprobación para enviar el paquete de comentarios relevante de Codex.
Consulte [Exportación de diagnósticos](/es/gateway/diagnostics) para conocer el modelo de privacidad y el comportamiento
del chat grupal.

Use `/codex diagnostics [note]` solo cuando específicamente desee la carga de comentarios de Codex
para el hilo actualmente adjunto sin el paquete de diagnóstico completo de Gateway.

### Inspeccionar hilos de Codex localmente

La forma más rápida de inspeccionar una ejecución de Codex incorrecta suele ser abrir el hilo
nativo de Codex directamente:

```bash
codex resume <thread-id>
```

Obtenga el id del hilo de la respuesta completada de `/diagnostics`, `/codex binding`, o
`/codex threads [filter]`.

Para ver los mecanismos de carga y los límites de diagnóstico a nivel de tiempo de ejecución, consulte
[Tiempo de ejecución del arnés de Codex](/es/plugins/codex-harness-runtime#codex-feedback-upload).

La autenticación se selecciona en este orden:

1. Perfiles de autenticación de OpenAI ordenados para el agente, preferiblemente bajo
   `auth.order.openai`. Ejecute `openclaw doctor --fix` para migrar los
   ids de perfil de autenticación heredados de Codex más antiguos y el orden de autenticación heredado de Codex.
2. La cuenta existente del app-server en el hogar de Codex de ese agente.
3. Solo para lanzamientos locales del servidor de aplicaciones stdio, `CODEX_API_KEY`, luego
   `OPENAI_API_KEY`, cuando no hay ninguna cuenta de servidor de aplicaciones presente y la autenticación de OpenAI es
   aún necesaria.

Cuando OpenClaw detecta un perfil de autenticación de Codex estilo suscripción a ChatGPT, elimina `CODEX_API_KEY` y `OPENAI_API_KEY` del proceso secundario de Codex generado. Eso mantiene las claves de API a nivel de Gateway disponibles para incrustaciones o modelos directos de OpenAI sin hacer que los turnos nativos del servidor de aplicaciones de Codex se facturen a través de la API por accidente. Los perfiles explícitos de clave de API de Codex y la reserva de clave de entorno stdio local utilizan el inicio de sesión del servidor de aplicaciones en lugar del entorno del proceso secundario heredado. Las conexiones del servidor de aplicaciones WebSocket no reciben la reserva de clave de API de entorno Gateway; utilice un perfil de autenticación explícito o la propia cuenta del servidor de aplicaciones remoto.

Si un perfil de suscripción alcanza un límite de uso de Codex, OpenClaw registra la hora de restablecimiento cuando Codex informa una e intenta el siguiente perfil de autenticación ordenado para la misma ejecución de Codex. Cuando pasa la hora de restablecimiento, el perfil de suscripción vuelve a ser elegible sin cambiar el modelo `openai/gpt-*` seleccionado o el tiempo de ejecución de Codex.

Para los lanzamientos del servidor de aplicaciones stdio local, OpenClaw establece `CODEX_HOME` en un directorio por agente, de modo que la configuración de Codex, los archivos de autenticación/cuenta, la caché/datos de complementos y el estado del subproceso nativo no lean ni escriban el `~/.codex` personal del operador de forma predeterminada. OpenClaw preserva el `HOME` del proceso normal; los subprocesos ejecutados por Codex aún pueden encontrar la configuración y los tokens del directorio de inicio del usuario, y Codex puede descubrir entradas compartidas de `$HOME/.agents/skills` y `$HOME/.agents/plugins/marketplace.json`.

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

`appServer.clearEnv` solo afecta al proceso secundario del servidor de aplicaciones de Codex generado. OpenClaw elimina `CODEX_HOME` y `HOME` de esta lista durante la normalización del lanzamiento local: `CODEX_HOME` se mantiene por agente, y `HOME` se mantiene heredado para que los subprocesos puedan usar el estado normal del directorio de inicio del usuario.

Las herramientas dinámicas de Codex cargan de forma diferida por defecto. OpenClaw no expone herramientas dinámicas que dupliquen las operaciones del espacio de trabajo nativas de Codex: `searchable``read`, `write`,
`edit`, `apply_patch`, `exec`, `process` y `update_plan`. La mayoría de las herramientas de integración restantes de OpenClaw, como mensajería, medios, cron, navegador, nodos,
gateway, `heartbeat_respond` y `web_search`, están disponibles a través de la búsqueda de herramientas de Codex en el espacio de nombres `openclaw`, manteniendo el contexto del modelo inicial
más pequeño.
`sessions_yield` y las respuestas de origen solo de herramienta de mensaje permanecen directas porque
esos son contratos de control de turnos. `sessions_spawn` permanece searchable para que la `spawn_agent` nativa de Codex siga siendo la superficie principal del subagente de Codex, mientras que la delegación explícita de OpenClaw o ACP todavía está disponible a través del espacio de nombres de la herramienta dinámica `openclaw`. Las instrucciones de colaboración de latido indican a Codex que busque `heartbeat_respond` antes de finalizar un turno de latido cuando la herramienta aún no está cargada.

Configure `codexDynamicToolsLoading: "direct"` solo cuando se conecte a un servidor de aplicaciones Codex personalizado que no pueda buscar herramientas dinámicas diferidas o al depurar la carga útil completa de la herramienta.

Campos de complemento de Codex de nivel superior compatibles:

| Campo                      | Predeterminado | Significado                                                                                                                      |
| -------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `codexDynamicToolsLoading` | `"searchable"` | Use `"direct"` para poner las herramientas dinámicas de OpenClaw directamente en el contexto de la herramienta inicial de Codex. |
| `codexDynamicToolsExclude` | `[]`           | Nombres adicionales de herramientas dinámicas de OpenClaw para omitir de los turnos del servidor de aplicaciones Codex.          |
| `codexPlugins`             | deshabilitado  | Soporte nativo de complementos/aplicaciones de Codex para complementos curados instalados en la fuente migrados.                 |

Campos `appServer` compatibles:

| Campo                                         | Predeterminado                                                        | Significado                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`                                   | `"stdio"`                                                             | `"stdio"` inicia Codex; `"websocket"` se conecta a `url`.                                                                                                                                                                                                                                                                                                                                                                                                               |
| `command`                                     | binario administrado de Codex                                         | Ejecutable para el transporte stdio. Déjelo sin establecer para usar el binario administrado; establézcalo solo para una invalidación explícita.                                                                                                                                                                                                                                                                                                                        |
| `args`                                        | `["app-server", "--listen", "stdio://"]`                              | Argumentos para el transporte stdio.                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `url`                                         | sin establecer                                                        | URL del servidor de aplicaciones WebSocket.                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `authToken`                                   | sin establecer                                                        | Token de portador para el transporte WebSocket.                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `headers`                                     | `{}`                                                                  | Encabezados adicionales de WebSocket.                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `clearEnv`                                    | `[]`                                                                  | Nombres de variables de entorno adicionales eliminados del proceso de servidor de aplicaciones stdio generado después de que OpenClaw construye su entorno heredado. OpenClaw mantiene `CODEX_HOME` por agente y `HOME` heredadas para los lanzamientos locales.                                                                                                                                                                                                        |
| `codeModeOnly`                                | `false`                                                               | Optar por la superficie de herramientas solo en modo código de Codex. Las herramientas dinámicas de OpenClaw permanecen registradas con Codex para que las llamadas `tools.*` anidadas regresen a través del puente `item/tool/call` del servidor de aplicaciones.                                                                                                                                                                                                      |
| `requestTimeoutMs`                            | `60000`                                                               | Tiempo de espera para las llamadas al plano de control del servidor de aplicaciones.                                                                                                                                                                                                                                                                                                                                                                                    |
| `turnCompletionIdleTimeoutMs`                 | `60000`                                                               | Ventana de silencio después de que Codex acepta un turno o después de una solicitud de servidor de aplicaciones con ámbito de turno mientras OpenClaw espera `turn/completed`.                                                                                                                                                                                                                                                                                          |
| `postToolRawAssistantCompletionIdleTimeoutMs` | `300000`                                                              | Guardia de finalización-inactividad y progreso utilizada después de una transferencia de herramienta, finalización de herramienta nativa, o progreso del asistente sin procesar posterior a la herramienta mientras OpenClaw espera `turn/completed`. Use esto para cargas de trabajo confiables o pesadas donde la síntesis posterior a la herramienta legítimamente puede permanecer en silencio por más tiempo que el presupuesto de liberación del asistente final. |
| `mode`                                        | `"yolo"` a menos que los requisitos locales de Codex no permitan YOLO | Preset para YOLO o ejecución revisada por guardián. Los requisitos locales de stdio que omiten `danger-full-access`, aprobación `never`, o el revisor `user` hacen que el guardián predeterminado implícito.                                                                                                                                                                                                                                                            |
| `approvalPolicy`                              | `"never"` o una política de aprobación de guardián permitida          | Política de aprobación nativa de Codex enviada al inicio/reanudación/turno del hilo. Los valores predeterminados del guardián prefieren `"on-request"` cuando se permite.                                                                                                                                                                                                                                                                                               |
| `sandbox`                                     | `"danger-full-access"` o un sandbox de guardián permitido             | Modo de sandbox nativo de Codex enviado para iniciar/reanudar el hilo. Los valores predeterminados de Guardian prefieren `"workspace-write"` cuando está permitido; de lo contrario, `"read-only"`. Cuando un sandbox de OpenClaw está activo, los turnos `danger-full-access` usan Codex `workspace-write` con acceso a red derivado de la configuración de salida del sandbox de OpenClaw.                                                                            |
| `approvalsReviewer`                           | `"user"` o un revisor de guardian permitido                           | Use `"auto_review"` para permitir que Codex revise las solicitudes de aprobación nativas cuando se permita, de lo contrario `guardian_subagent` o `user`. `guardian_subagent` sigue siendo un alias heredado.                                                                                                                                                                                                                                                           |
| `serviceTier`                                 | sin definir                                                           | Nivel de servicio opcional de la aplicación del servidor Codex. `"priority"` habilita el enrutamiento en modo rápido, `"flex"` solicita el procesamiento flexible, `null` borra la anulación y el `"fast"` heredado se acepta como `"priority"`.                                                                                                                                                                                                                        |
| `experimental.sandboxExecServer`              | `false`                                                               | Opt-in de vista previa que registra un entorno Codex respaldado por un entorno sandbox de OpenClaw con Codex app-server 0.132.0 o más reciente para que la ejecución nativa de Codex pueda ejecutarse dentro del entorno sandbox de OpenClaw activo.                                                                                                                                                                                                                    |

Las llamadas a herramientas dinámicas propiedad de OpenClaw están limitadas de forma independiente de `appServer.requestTimeoutMs`: las solicitudes `item/tool/call` de Codex usan un watchdog de OpenClaw de 90 segundos de manera predeterminada. Un argumento `timeoutMs` positivo por llamada extiende o acorta ese presupuesto específico de la herramienta. La herramienta `image_generate` usa `agents.defaults.imageGenerationModel.timeoutMs` cuando la llamada a la herramienta no proporciona su propio tiempo de espera, o un tiempo de espera predeterminado de generación de imágenes de 120 segundos de lo contrario. La herramienta de comprensión de medios `image` usa `tools.media.image.timeoutSeconds` o su predeterminado de medios de 60 segundos. Los presupuestos de herramientas dinámicas tienen un límite de 600000 ms. Al agotarse el tiempo de espera, OpenClaw aborta la señal de la herramienta donde es compatible y devuelve una respuesta de herramienta dinámica fallida a Codex para que el turno pueda continuar en lugar de dejar la sesión en `processing`.

Una vez que Codex acepta un turno y después de que OpenClaw responde a una solicitud de servidor de aplicación con ámbito de turno, el arnés espera que Codex realice un progreso en el turno actual y eventualmente finalice el turno nativo con `turn/completed`. Si el servidor de aplicación permanece en silencio durante `appServer.turnCompletionIdleTimeoutMs`, OpenClaw interrumpe el turno de Codex con el mejor esfuerzo posible, registra un tiempo de espera de diagnóstico y libera el carril de la sesión de OpenClaw para que los mensajes de chat de seguimiento no se pongan en cola detrás de un turno nativo obsoleto. La mayoría de las notificaciones no terminales para el mismo turno desactivan ese perro guardián corto porque Codex ha demostrado que el turno todavía está vivo. Las transferencias de herramientas utilizan un presupuesto de inactividad posterior a la herramienta más largo: después de que OpenClaw devuelve una respuesta `item/tool/call`, después de que completan los elementos de herramientas nativas como `commandExecution`, después de las `custom_tool_call_output` completas y después del progreso del asistente sin procesar posterior a la herramienta. El guarda utiliza `appServer.postToolRawAssistantCompletionIdleTimeoutMs` cuando está configurado y por defecto es de cinco minutos en caso contrario. Ese mismo presupuesto posterior a la herramienta también extiende el perro guardián de progreso para la ventana de síntesis silenciosa antes de que Codex emita el siguiente evento del turno actual. Las notificaciones globales del servidor de aplicación, como las actualizaciones de límite de tasa, no restablecen el progreso de inactividad del turno. Las completas de razonamiento, las completas de `agentMessage` y el progreso del asistente o razonamiento sin procesar previo a la herramienta pueden ir seguidas de una respuesta final automática, por lo que utilizan el guarda de respuesta posterior al progreso en lugar de liberar el carril de la sesión inmediatamente. Solo los elementos completados finales/sin comentarios de `agentMessage` y las completas del asistente sin procesar previas a la herramienta activan la liberación de salida del asistente: si Codex luego entra en silencio sin `turn/completed`, OpenClaw interrumpe el turno nativo con el mejor esfuerzo posible y libera el carril de la sesión. Los fallos del servidor de aplicación stdio seguros para repetición, incluidos los tiempos de espera de inactividad de finalización de turno sin asistente, herramienta, elemento activo o evidencia de efecto secundario, se reintentan una vez en un nuevo intento del servidor de aplicación. Los tiempos de espera no seguros aún retiran el cliente del servidor de aplicación atascado y liberan el carril de la sesión de OpenClaw. También borran el enlace del subproceso nativo obsoleto y muestran un mensaje de tiempo de espera recuperable para el juicio del usuario o del mantenedor en lugar de repetirse automáticamente. Los diagnósticos de tiempo de espera incluyen el último método de notificación del servidor de aplicación y, para los elementos de respuesta del asistente sin procesar, el tipo de elemento, el rol, el id y una vista previa del texto del asistente limitada.

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
`OPENCLAW_CODEX_APP_SERVER_MODE=guardian` para pruebas locales únicas. Se prefiere la configuración
para implementaciones repetibles porque mantiene el comportamiento del complemento en el
mismo archivo revisado que el resto de la configuración del arnés de Codex.

## Complementos nativos de Codex

La compatibilidad con complementos nativos de Codex utiliza las propias capacidades de aplicación y complementos
del servidor de aplicaciones Codex en el mismo hilo de Codex que el turno del arnés de OpenClaw. OpenClaw
no traduce los complementos de Codex en herramientas dinámicas `codex_plugin_*` de OpenClaw
sintéticas.

`codexPlugins` afecta solo a las sesiones que seleccionan el arnés nativo de Codex. No
tiene ningún efecto en las ejecuciones del arnés integrado, las ejecuciones normales del proveedor OpenAI, los enlaces de conversación
de ACP u otros arneses.

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
Después de cambiar `codexPlugins`, use `/new`, `/reset` o reinicie la puerta de enlace para que
las futuras sesiones del arnés de Codex comiencen con el conjunto de aplicaciones actualizado.

Para la elegibilidad de migración, el inventario de aplicaciones, la política de acciones destructivas,
las elicitaciones y los diagnósticos de complementos nativos, consulte
[Complementos nativos de Codex](/es/plugins/codex-native-plugins).

## Uso del equipo

El uso del equipo está cubierto en su propia guía de configuración:
[Uso del equipo de Codex](/es/plugins/codex-computer-use).

La versión corta: OpenClaw no distribuye la aplicación de control de escritorio ni ejecuta
acciones de escritorio por sí mismo. Prepara el servidor de aplicaciones Codex, verifica que el
servidor MCP `computer-use` esté disponible y luego permite que Codex sea el propietario de las llamadas a la herramienta MCP
nativa durante los turnos en modo Codex.

## Límites de tiempo de ejecución

El arnés de Codex solo cambia el ejecutor del agente integrado de bajo nivel.

- Las herramientas dinámicas de OpenClaw son compatibles. Codex le pide a OpenClaw que ejecute esas herramientas, por lo que OpenClaw permanece en la ruta de ejecución.
- Las herramientas nativas de shell, parche, MCP y aplicaciones nativas de Codex son propiedad de Codex. OpenClaw puede observar o bloquear eventos nativos seleccionados a través del relé compatible, pero no reescribe los argumentos de las herramientas nativas.
- Codex posee la compactación nativa. OpenClaw mantiene un espejo de la transcripción para el historial del canal, búsqueda, `/new`, `/reset` y cambios futuros de modelo o arnés, pero no reemplaza la compactación de Codex con un resumidor de OpenClaw o de motor de contexto.
- La generación de medios, la comprensión de medios, TTS, las aprobaciones y la salida de herramientas de mensajería continúan a través de la configuración de proveedor/modelo de OpenClaw correspondiente.
- `tool_result_persist` se aplica a los resultados de herramientas de transcripción propiedad de OpenClaw, no a los registros de resultados de herramientas nativas de Codex.

Para las capas de enlaces, superficies V1 compatibles, manejo nativo de permisos, dirección de colas, mecánicas de carga de comentarios de Codex y detalles de compactación, consulte [Codex harness runtime](/es/plugins/codex-harness-runtime).

## Solución de problemas

**Codex no aparece como un proveedor `/model` normal:** esto es esperado para nuevas configuraciones. Seleccione un modelo `openai/gpt-*`, habilite `plugins.entries.codex.enabled` y verifique si `plugins.allow` excluye `codex`.

**OpenClaw usa el arnés integrado en lugar de Codex:** asegúrese de que la referencia del modelo sea `openai/gpt-*` en el proveedor oficial de OpenAI y de que el complemento Codex esté instalado y habilitado. Si necesita una prueba estricta durante las pruebas, establezca el `agentRuntime.id: "codex"` del proveedor o modelo. Un tiempo de ejecución de Codex forzado falla en lugar de volver a OpenClaw.

**El tiempo de ejecución de OpenAI Codex recurre a la ruta de clave de API:** recopile un extracto de puerta de enlace redactado que muestre el modelo, el tiempo de ejecución, el proveedor seleccionado y el fallo. Pida a los colaboradores afectados que ejecuten este comando de solo lectura en su host de OpenClaw:

```bash
(
  pattern='openai/gpt-5\.[45]|openai[-]codex|agentRuntime(\.id)?|harnessRuntime|Runtime: OpenAI Codex|legacy OpenAI Codex prefix|resolveSelectedOpenAIRuntimeProvider|candidateProvider[": ]+openai|status[": ]+401|Incorrect API key|No API key|api-key path|API-key path|OAuth'

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

Los extractos útiles generalmente incluyen `openai/gpt-5.5` o `openai/gpt-5.4`, `Runtime: OpenAI Codex`, `agentRuntime.id` o `harnessRuntime`, `candidateProvider: "openai"` y un resultado `401`, `Incorrect API key` o `No API key`. Una ejecución corregida debería mostrar la ruta OAuth de OpenAI en lugar de un fallo de clave de API de OpenAI simple.

**La configuración de referencias de modelo heredadas de Codex persiste:** ejecute `openclaw doctor --fix`. Doctor reescribe las referencias de modelo heredadas a `openai/*`, elimina las fijaciones obsoletas de sesión y tiempo de ejecución de agente completo, y preserva las anulaciones de perfil de autenticación existentes.

**Se rechaza el servidor de la aplicación:** use el servidor de la aplicación Codex `0.125.0` o una versión más nueva.
Las versiones preliminares de la misma versión o las versiones con sufijo de compilación, como `0.125.0-alpha.2` o `0.125.0+custom`, se rechazan porque OpenClaw prueba el
piso del protocolo estable `0.125.0`.

**`/codex status` no puede conectarse:** compruebe que el complemento `codex` incluido esté
habilitado, que `plugins.allow` lo incluya cuando se configure una lista de permitidos y
que cualquier `appServer.command`, `url`, `authToken` o encabezados personalizados sean válidos.

**El descubrimiento de modelos es lento:** reduzca
`plugins.entries.codex.config.discovery.timeoutMs` o desactive el descubrimiento. Consulte
[Referencia de arnés Codex](/es/plugins/codex-harness-reference#model-discovery).

**El transporte WebSocket falla inmediatamente:** compruebe `appServer.url`, `authToken`,
los encabezados y que el servidor de la aplicación remoto hable la misma versión del
protocolo del servidor de la aplicación Codex.

**Las herramientas de shell nativas o de parche están bloqueadas con `Native hook relay unavailable`:**
el hilo de Codex todavía está intentando utilizar un id de relé de enlace nativo que OpenClaw ya
no tiene registrado. Este es un problema de transporte de enlace nativo de Codex, no un fallo del
backend ACP, proveedor, GitHub o comando de shell. Inicie una sesión nueva en
el chat afectado con `/new` o `/reset` y luego reintente un comando inofensivo. Si eso
funciona una vez pero la siguiente llamada de herramienta nativa vuelve a fallar, trate `/new` solo como una
solución temporal: copie el mensaje en una sesión nueva después de reiniciar el servidor de
la aplicación Codex o OpenClaw Gateway para que los hilos antiguos se eliminen y los registros de
enlaces nativos se vuelvan a crear.

**Un modelo que no es de Codex usa el arnés integrado:** eso es lo esperado a menos que
la política del proveedor o del tiempo de ejecución del modelo la enrute a otro arnés. Las referencias de proveedores que no son de OpenAI
se mantienen en su ruta de proveedor normal en el modo `auto`.

**Computer Use está instalado pero las herramientas no se ejecutan:** verifique `/codex computer-use status` desde una sesión nueva. Si una herramienta informa `Native hook relay unavailable`, use la recuperación de retransmisión de gancho nativo anterior. Consulte [Codex Computer Use](/es/plugins/codex-computer-use#troubleshooting).

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
