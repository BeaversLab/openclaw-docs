---
summary: "Ejecuta arneses de codificación externos (Claude Code, Cursor, Gemini CLI, Codex ACP explícito, OpenClaw ACP, OpenCode) a través del backend ACP"
read_when:
  - Running coding harnesses through ACP
  - Setting up conversation-bound ACP sessions on messaging channels
  - Binding a message-channel conversation to a persistent ACP session
  - Troubleshooting ACP backend, plugin wiring, or completion delivery
  - Operating /acp commands from chat
title: "Agentes ACP"
sidebarTitle: "Agentes ACP"
---

Las sesiones del [Protocolo de Cliente de Agente (ACP)](https://agentclientprotocol.com/)
permiten que OpenClaw ejecute arneses de codificación externos (por ejemplo, Claude Code,
Cursor, Copilot, Droid, OpenClaw ACP, OpenCode, Gemini CLI y otros
arneses ACPX compatibles) a través de un plugin de backend ACP.

Cada creación de sesión de ACP se rastrea como una [tarea en segundo plano](/es/automation/tasks).

<Note>
**ACP es la ruta de arnés externo, no la ruta Codex predeterminada.** El
plugin del servidor de aplicaciones nativo de Codex posee los controles `/codex ...` y el tiempo de ejecución
`openai/gpt-*` incrustado predeterminado para los turnos del agente; ACP posee
los controles `/acp ...` y las sesiones `sessions_spawn({ runtime: "acp" })`.

Si desea que Codex o Claude Code se conecten como un cliente MCP externo
directamente a las conversaciones del canal OpenClaw existentes, use
[`openclaw mcp serve`](/es/cli/mcp) en lugar de ACP.

</Note>

## ¿Qué página quiero?

| Quieres…                                                                                            | Usa esto                                    | Notas                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Vincular o controlar Codex en la conversación actual                                                | `/codex bind`, `/codex threads`             | Ruta del servidor de aplicaciones nativo de Codex cuando el plugin `codex` está habilitado; incluye respuestas de chat vinculadas, reenvío de imágenes, modelo/rápido/permisos, y controles de detención y dirección. ACP es una alternativa explícita |
| Ejecutar Claude Code, Gemini CLI, Codex ACP explícito u otro harness externo _a través_ de OpenClaw | Esta página                                 | Sesiones vinculadas al chat, `/acp spawn`, `sessions_spawn({ runtime: "acp" })`, tareas en segundo plano, controles de tiempo de ejecución                                                                                                             |
| Exponer una sesión de OpenClaw Gateway _como_ un servidor ACP para un editor o cliente              | [`openclaw acp`](/es/cli/acp)               | Modo puente. El IDE/cliente habla ACP con OpenClaw a través de stdio/WebSocket                                                                                                                                                                         |
| Reutilizar una CLI de IA local como modelo de reserva solo de texto                                 | [Backends de CLI](/es/gateway/cli-backends) | No es ACP. Sin herramientas de OpenClaw, sin controles ACP, sin runtime de harness                                                                                                                                                                     |

## ¿Esto funciona fuera de la caja?

Sí, después de instalar el plugin oficial del tiempo de ejecución ACP:

```bash
openclaw plugins install @openclaw/acpx
openclaw config set plugins.entries.acpx.enabled true
```

Las fuentes descargadas pueden usar el plugin del espacio de trabajo local `extensions/acpx` después de
`pnpm install`. Ejecute `/acp doctor` para una verificación de preparación.

OpenClaw solo enseña a los agentes sobre la creación de ACP cuando ACP es **realmente
utilizable**: ACP debe estar habilitado, el despacho no debe estar deshabilitado, la sesión
actual no debe estar bloqueada por el sandbox y se debe cargar un backend de tiempo de ejecución.
Si esas condiciones no se cumplen, las habilidades del plugin ACP y la
guía `sessions_spawn` de ACP permanecen ocultas para que el agente no sugiera
un backend no disponible.

<AccordionGroup>
  <Accordion title="First-run gotchas">
    - Si `plugins.allow` está configurado, es un inventario de complementos restrictivo y **debe** incluir `acpx`; de lo contrario, el backend de ACP instalado se bloquea intencionalmente y `/acp doctor` informa de la entrada faltante en la lista de permitidos.
    - El adaptador ACP de Codex se implementa con el complemento `acpx` y se inicia localmente cuando es posible.
    - El ACP de Codex se ejecuta con un `CODEX_HOME` aislado; OpenClaw copia las entradas de proyectos de confianza más la configuración de enrutamiento de modelos/proveedores seguros desde la configuración de Codex del host, mientras que la autenticación, las notificaciones y los ganchos permanecen en la configuración del host.
    - Otros adaptadores de arnes de destino aún pueden obtenerse bajo demanda con `npx` la primera vez que los utilice.
    - La autenticación del proveedor todavía debe existir en el host para ese arnés.
    - Si el host no tiene acceso a npm o a la red, las descargas de adaptadores de primera ejecución fallan hasta que los cachés se precargan o el adaptador se instala de otra manera.

  </Accordion>
  <Accordion title="Requisitos de tiempo de ejecución">
    ACP inicia un proceso real de arnés externo. OpenClaw gestiona el enrutamiento,
    el estado de las tareas en segundo plano, la entrega, los enlaces y las políticas; el arnés
    gestiona su inicio de sesión de proveedor, el catálogo de modelos, el comportamiento del sistema de archivos y
    las herramientas nativas.

    Antes de culpar a OpenClaw, verifique:

    - `/acp doctor` informa un backend habilitado y saludable.
    - El id de destino está permitido por `acp.allowedAgents` cuando esa lista blanca está configurada.
    - El comando del arnés puede iniciarse en el host Gateway.
    - La autenticación del proveedor está presente para ese arnés (`claude`, `codex`, `gemini`, `opencode`, `droid`, etc.).
    - El modelo seleccionado existe para ese arnés: los ids de modelo no son portables entre arneses.
    - El `cwd` solicitado existe y es accesible, u omita `cwd` y deje que el backend use su valor predeterminado.
    - El modo de permiso coincide con el trabajo. Las sesiones no interactivas no pueden hacer clic en los avisos de permisos nativos, por lo que las ejecuciones de codificación intensivas en escritura/ejecución generalmente necesitan un perfil de permisos ACPX que pueda proceder sin cabeza.

  </Accordion>
</AccordionGroup>

Las herramientas del complemento OpenClaw y las herramientas integradas de OpenClaw **no** están expuestas a
los arneses ACP de forma predeterminada. Habilite los puentes MCP explícitos en
[ACP agents - setup](/es/tools/acp-agents-setup) solo cuando el arnés
deba llamar a esas herramientas directamente.

## Objetivos de arneses compatibles

Con el backend `acpx`, use estos ids de arnés como objetivos `/acp spawn <id>`
o `sessions_spawn({ runtime: "acp", agentId: "<id>" })`:

| Id del arnés | Backend típico                                     | Notas                                                                                         |
| ------------ | -------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `claude`     | Adaptador ACP de Claude Code                       | Requiere autenticación de Claude Code en el host.                                             |
| `codex`      | Adaptador ACP de Codex                             | Respaldo explícito a ACP solo cuando el `/codex` nativo no está disponible o se solicita ACP. |
| `copilot`    | Adaptador ACP de GitHub Copilot                    | Requiere autenticación de CLI/runtime de Copilot.                                             |
| `cursor`     | Cursor CLI ACP (`cursor-agent acp`)                | Anule el comando acpx si una instalación local expone un punto de entrada ACP diferente.      |
| `droid`      | CLI de Droid de fábrica                            | Requiere autenticación de Factory/Droid o `FACTORY_API_KEY` en el entorno del arnés.          |
| `gemini`     | Adaptador ACP de CLI de Gemini                     | Requiere autenticación de CLI de Gemini o configuración de clave de API.                      |
| `iflow`      | CLI de iFlow                                       | La disponibilidad del adaptador y el control del modelo dependen de la CLI instalada.         |
| `kilocode`   | CLI de Kilo Code                                   | La disponibilidad del adaptador y el control del modelo dependen de la CLI instalada.         |
| `kimi`       | CLI de Kimi/Moonshot                               | Requiere autenticación de Kimi/Moonshot en el host.                                           |
| `kiro`       | CLI de Kiro                                        | La disponibilidad del adaptador y el control del modelo dependen de la CLI instalada.         |
| `opencode`   | Adaptador ACP de OpenCode                          | Requiere autenticación de CLI/proveedor de OpenCode.                                          |
| `openclaw`   | Puente OpenClaw Gateway a través de `openclaw acp` | Permite que un arnés compatible con ACP responda a una sesión de Gateway de OpenClaw.         |
| `qwen`       | Qwen Code / Qwen CLI                               | Requiere autenticación compatible con Qwen en el host.                                        |

Los alias de agente acpx personalizados se pueden configurar en acpx mismo, pero la política de OpenClaw todavía verifica `acp.allowedAgents` y cualquier mapeo `agents.list[].runtime.acp.agent` antes del envío.

## Manual del operador

Flujo rápido de `/acp` desde el chat:

<Steps>
  <Step title="Generar">
    `/acp spawn claude --bind here`,
    `/acp spawn gemini --mode persistent --thread auto`, o explícitamente
    `/acp spawn codex --bind here`.
  </Step>
  <Step title="Work">
    Continúe en la conversación o hilo enlazado (o apunte a la clave de
    sesión explícitamente).
  </Step>
  <Step title="Verificar estado">
    `/acp status`
  </Step>
  <Step title="Ajustar">
    `/acp model <provider/model>`,
    `/acp permissions <profile>`,
    `/acp timeout <seconds>`.
  </Step>
  <Step title="Dirigir">
    Sin reemplazar el contexto: `/acp steer tighten logging and continue`.
  </Step>
  <Step title="Detener">
    `/acp cancel` (turno actual) o `/acp close` (sesión + vinculaciones).
  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="Detalles del ciclo de vida">
    - Spawn crea o reanuda una sesión de runtime de ACP, registra los metadatos de ACP en el almacén de sesiones de OpenClaw y puede crear una tarea en segundo plano cuando la ejecución es propiedad del padre.
    - Las sesiones de ACP propiedad del padre se tratan como trabajo en segundo plano incluso cuando la sesión de runtime es persistente; la finalización y la entrega entre superficies pasan a través del notificador de tareas principal en lugar de actuar como una sesión de chat normal para el usuario.
    - El mantenimiento de tareas cierra sesiones de ACP de un solo uso propiedad del padre que son terminales o huérfanas. Las sesiones persistentes de ACP se conservan mientras permanezca un enlace de conversación activo; las sesiones persistentes obsoletas sin un enlace activo se cierran para que no se reanuden silenciosamente después de que la tarea propietaria haya terminado o su registro de tarea haya desaparecido.
    - Los mensajes de seguimiento enlazados van directamente a la sesión de ACP hasta que el enlace se cierra, pierde el foco, se restablece o caduca.
    - Los comandos de Gateway se mantienen locales. `/acp ...`, `/status` y `/unfocus` nunca se envían como texto de solicitud normal a un harness de ACP enlazado.
    - `cancel` aborta el turno activo cuando el backend admite la cancelación; no elimina el enlace ni los metadatos de la sesión.
    - `close` finaliza la sesión de ACP desde el punto de vista de OpenClaw y elimina el enlace. Un harness aún puede mantener su propio historial ascendente si admite la reanudación.
    - El complemento acpx limpia los árboles de procesos de contenedor y adaptador propiedad de OpenClaw después de `close` y recolecta huérfanos de ACPX propiedad de OpenClaw obsoletos durante el inicio de Gateway.
    - Los trabajadores de runtime inactivos son elegibles para la limpieza después de `acp.runtime.ttlMinutes`; los metadatos de sesión almacenados permanecen disponibles durante `/acp sessions`.

  </Accordion>
  <Accordion title="Reglas de enrutamiento nativo de Codex">
    Desencadenadores en lenguaje natural que deben enrutarse al **complemento
    nativo de Codex** cuando está habilitado:

    - "Enlazar este canal de Discord a Codex."
    - "Adjuntar este chat al hilo de Codex `<id>`."
    - "Mostrar hilos de Codex, luego enlazar este."

    El enlace de conversación nativo de Codex es la ruta de control de chat predeterminada.
    Las herramientas dinámicas de OpenClaw aún se ejecutan a través de OpenClaw, mientras que
    las herramientas nativas de Codex como shell/apply-patch se ejecutan dentro de Codex.
    Para los eventos de herramientas nativas de Codex, OpenClaw inyecta un relé de enlace nativo
    por turno para que los enlaces del complemento puedan bloquear `before_tool_call`, observar
    `after_tool_call` y enrutar eventos Codex `PermissionRequest`
    a través de aprobaciones de OpenClaw. Los enlaces Codex `Stop` se reenvían a
    OpenClaw `before_agent_finalize`, donde los complementos pueden solicitar un pase
    más del modelo antes de que Codex finalice su respuesta. El relé permanece
    deliberadamente conservador: no muta los argumentos de herramientas nativas de Codex
    ni reescribe los registros de hilos de Codex. Use ACP explícito solo
    cuando desee el modelo de tiempo de ejecución/sesión de ACP. El límite de soporte
    de Codex integrado está documentado en el
    [contrato de soporte de Codex harness v1](/es/plugins/codex-harness-runtime#v1-support-contract).

  </Accordion>
  <Accordion title="Hoja de referencia para la selección de modelo/proveedor/tiempo de ejecución">
    - Referencias de modelos heredadas de Codex - ruta modelo OAuth/suscripción heredada de Codex reparada por doctor.
    - `openai/*` - tiempo de ejecución integrado del servidor de aplicaciones nativo de Codex para turnos de agente OpenAI.
    - `/codex ...` - control de conversación nativo de Codex.
    - `/acp ...` o `runtime: "acp"` - control explícito ACP/acpx.

  </Accordion>
  <Accordion title="Desencadenadores en lenguaje natural de enrutamiento ACP">
    Desencadenantes que deben enrutar al tiempo de ejecución de ACP:

    - "Ejecuta esto como una sesión ACP de Claude Code de un solo uso y resume el resultado."
    - "Usa Gemini CLI para esta tarea en un hilo, luego mantén los seguimientos en ese mismo hilo."
    - "Ejecuta Codex a través de ACP en un hilo en segundo plano."

    OpenClaw selecciona `runtime: "acp"`, resuelve el arnés `agentId`,
    se vincula a la conversación o hilo actual cuando es compatible y
    enruta los seguimientos a esa sesión hasta que se cierre/caduque. Codex solo
    sigue esta ruta cuando ACP/acpx es explícito o el complemento nativo de
    Codex no está disponible para la operación solicitada.

    Para `sessions_spawn`, `runtime: "acp"` se anuncia solo cuando ACP
    está habilitado, el solicitante no está en sandbox y un tiempo de ejecución
    de backend de ACP está cargado. `acp.dispatch.enabled=false` pausa el
    despacho automático de hilos de ACP pero no oculta ni bloquea las llamadas
    explícitas `sessions_spawn({ runtime: "acp" })`. Apunta a ids de arnés ACP como `codex`,
    `claude`, `droid`, `gemini` o `opencode`. No pases un id de
    agente de configuración normal de OpenClaw de `agents_list` a menos que esa entrada esté
    configurada explícitamente con `agents.list[].runtime.type="acp"`;
    de lo contrario, usa el tiempo de ejecución de subagente predeterminado. Cuando un agente de OpenClaw
    está configurado con `runtime.type="acp"`, OpenClaw usa
    `runtime.acp.agent` como el id de arnés subyacente.

  </Accordion>
</AccordionGroup>

## ACP frente a subagentes

Usa ACP cuando quieras un tiempo de ejecución de arnés externo. Usa **app-server nativo de
Codex** para el enlace/control de conversaciones de Codex cuando el complemento
`codex` está habilitado. Usa **sub-agentes** cuando quieras ejecuciones
delegadas nativas de OpenClaw.

| Área                      | Sesión ACP                                     | Ejecución de subagente                                |
| ------------------------- | ---------------------------------------------- | ----------------------------------------------------- |
| Tiempo de ejecución       | Complemento de backend ACP (por ejemplo, acpx) | Tiempo de ejecución de subagente nativo de OpenClaw   |
| Clave de sesión           | `agent:<agentId>:acp:<uuid>`                   | `agent:<agentId>:subagent:<uuid>`                     |
| Comandos principales      | `/acp ...`                                     | `/subagents ...`                                      |
| Herramienta de generación | `sessions_spawn` con `runtime:"acp"`           | `sessions_spawn` (tiempo de ejecución predeterminado) |

Consulta también [Sub-agentes](/es/tools/subagents).

## Cómo ACP ejecuta Claude Code

Para Claude Code a través de ACP, la pila es:

1. Plano de control de sesión ACP de OpenClaw.
2. Complemento oficial de tiempo de ejecución `@openclaw/acpx`.
3. Adaptador Claude ACP.
4. Maquinaria de tiempo de ejecución/sesión del lado de Claude.

ACP Claude es una **harness session** con controles ACP, reanudación de sesión, seguimiento de tareas en segundo plano y vinculación opcional de conversación/hilo.

Los backends de CLI son tiempos de ejecución locales de solo texto y de respaldo separados; consulte
[CLI Backends](/es/gateway/cli-backends).

Para los operadores, la regla práctica es:

- **¿Quiere `/acp spawn`, sesiones vinculables, controles de tiempo de ejecución o trabajo de arnés persistente?** Use ACP.
- **¿Quiere una alternativa local de texto simple a través de la CLI sin formato?** Use los backends de CLI.

## Sesiones vinculadas

### Modelo mental

- **Superficie de chat** - donde la gente sigue hablando (canal de Discord, tema de Telegram, chat de iMessage).
- **Sesión ACP** - el estado duradero del tiempo de ejecución de Codex/Claude/Gemini al que OpenClaw enruta.
- **Hilo/Tema secundario** - una superficie de mensajería adicional opcional creada solo por `--thread ...`.
- **Espacio de trabajo de tiempo de ejecución** - la ubicación del sistema de archivos (`cwd`, repositorio checkout, espacio de trabajo del backend) donde se ejecuta el arnés. Independiente de la superficie del chat.

### Vínculos de conversación actual

`/acp spawn <harness> --bind here` fija la conversación actual a la
sesión ACP generada - sin hilo secundario, misma superficie de chat. OpenClaw sigue
siendo el propietario del transporte, la autenticación, la seguridad y la entrega. Los mensajes de seguimiento en esa
conversación se dirigen a la misma sesión; `/new` y `/reset` restablecen la
sesión en su lugar; `/acp close` elimina el enlace.

Ejemplos:

```text
/codex bind                                              # native Codex bind, route future messages here
/codex model gpt-5.4                                     # tune the bound native Codex thread
/codex stop                                              # control the active native Codex turn
/acp spawn codex --bind here                             # explicit ACP fallback for Codex
/acp spawn codex --thread auto                           # may create a child thread/topic and bind there
/acp spawn codex --bind here --cwd /workspace/repo       # same chat binding, Codex runs in /workspace/repo
```

<AccordionGroup>
  <Accordion title="Reglas de enlace y exclusividad">
    - `--bind here` y `--thread ...` son mutuamente excluyentes.
    - `--bind here` solo funciona en canales que anuncian el enlace de conversación actual; de lo contrario, OpenClaw devuelve un mensaje claro no compatible. Los enlaces persisten a través de reinicios de la puerta de enlace.
    - En Discord, `spawnSessions` limita la creación de hilos secundarios para `--thread auto|here` - no para `--bind here`.
    - Si genera un agente ACP diferente sin `--cwd`, OpenClaw hereda el espacio de trabajo del **agente de destino** de forma predeterminada. Las rutas heredadas faltantes (`ENOENT`/`ENOTDIR`)** vuelven al valor predeterminado del backend; otros errores de acceso (p. ej., `EACCES`) aparecen como errores de generación.
    - Los comandos de gestión de la puerta de enlace se mantienen locales en las conversaciones enlazadas; los comandos `/acp ...` son manejados por OpenClaw incluso cuando el texto de seguimiento normal se dirige a la sesión ACP enlazada; `/status` y `/unfocus` también se mantienen locales siempre que el manejo de comandos esté habilitado para esa superficie.

  </Accordion>
  <Accordion title="Sesiones vinculadas a hilos">
    Cuando los enlaces de hilos están habilitados para un adaptador de canal:

    - OpenClaw vincula un hilo a una sesión ACP de destino.
    - Los mensajes de seguimiento en ese hilo se enrutan a la sesión ACP vinculada.
    - La salida de ACP se entrega de vuelta al mismo hilo.
    - La pérdida de enfoque/cierre/archivación/timeout de inactividad o la expiración por antigüedad máxima elimina el enlace.
    - `/acp close`, `/acp cancel`, `/acp status`, `/status` y `/unfocus` son comandos de Gateway, no indicaciones para el harness de ACP.

    Marcadores de función requeridos para ACP vinculado a hilos:

    - `acp.enabled=true`
    - `acp.dispatch.enabled` está activado por defecto (establezca `false` para pausar el despacho automático de hilos ACP; las llamadas explícitas a `sessions_spawn({ runtime: "acp" })` aún funcionan).
    - Creaciones de sesiones de hilos del adaptador de canal habilitadas (predeterminado: `true`):
      - Discord: `channels.discord.threadBindings.spawnSessions=true`
      - Telegram: `channels.telegram.threadBindings.spawnSessions=true`

    La compatibilidad con enlaces de hilos es específica del adaptador. Si el adaptador de canal activo no admite enlaces de hilos, OpenClaw devuelve un mensaje claro de no admitido/no disponible.

  </Accordion>
  <Accordion title="Canales compatibles con hilos">
    - Cualquier adaptador de canal que exponga la capacidad de vinculación de sesión/hilo.
    - Soporte integrado actual: hilos/canales de **Discord**, temas de **Telegram** (temas de foro en grupos/supergrupos y temas de MD).
    - Los canales de complementos pueden agregar soporte a través de la misma interfaz de vinculación.

  </Accordion>
</AccordionGroup>

## Vinculaciones de canal persistentes

Para flujos de trabajo no efímeros, configure enlaces ACP persistentes en
entradas `bindings[]` de nivel superior.

### Modelo de vinculación

<ParamField path="bindings[].type" type='"acp"'>
  Marca una vinculación de conversación ACP persistente.
</ParamField>
<ParamField path="bindings[].match" type="object">
  Identifica la conversación de destino. Formas por canal:

- **Canal/hilo de Discord:** `match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
- **Canal/MD de Slack:** `match.channel="slack"` + `match.peer.id="<channelId|channel:<channelId>|#<channelId>|userId|user:<userId>|slack:<userId>|<@userId>>"`. Se prefieren los ids de Slack estables; los enlaces de canal también coinciden con las respuestas dentro de los hilos de ese canal.
- **Tema del foro de Telegram:** `match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
- **MD/grupo de iMessage:** `match.channel="imessage"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`. Se prefiere `chat_id:*` para enlaces de grupo estables.

</ParamField>
<ParamField path="bindings[].agentId" type="string">
  El id del agente propietario de OpenClaw.
</ParamField>
<ParamField path="bindings[].acp.mode" type='"persistent" | "oneshot"'>
  Sobrescritura opcional de ACP.
</ParamField>
<ParamField path="bindings[].acp.label" type="string">
  Etiqueta opcional orientada al operador.
</ParamField>
<ParamField path="bindings[].acp.cwd" type="string">
  Directorio de trabajo de ejecución opcional.
</ParamField>
<ParamField path="bindings[].acp.backend" type="string">
  Sobrescritura opcional de backend.
</ParamField>

### Valores predeterminados de ejecución por agente

Use `agents.list[].runtime` para definir los valores predeterminados de ACP una vez por agente:

- `agents.list[].runtime.type="acp"`
- `agents.list[].runtime.acp.agent` (id de harness, p. ej., `codex` o `claude`)
- `agents.list[].runtime.acp.backend`
- `agents.list[].runtime.acp.mode`
- `agents.list[].runtime.acp.cwd`

**Precedencia de sobrescritura para sesiones ACP vinculadas:**

1. `bindings[].acp.*`
2. `agents.list[].runtime.acp.*`
3. Valores predeterminados globales de ACP (p. ej. `acp.backend`)

### Ejemplo

```json5
{
  agents: {
    list: [
      {
        id: "codex",
        runtime: {
          type: "acp",
          acp: {
            agent: "codex",
            backend: "acpx",
            mode: "persistent",
            cwd: "/workspace/openclaw",
          },
        },
      },
      {
        id: "claude",
        runtime: {
          type: "acp",
          acp: { agent: "claude", backend: "acpx", mode: "persistent" },
        },
      },
    ],
  },
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "discord",
        accountId: "default",
        peer: { kind: "channel", id: "222222222222222222" },
      },
      acp: { label: "codex-main" },
    },
    {
      type: "acp",
      agentId: "claude",
      match: {
        channel: "telegram",
        accountId: "default",
        peer: { kind: "group", id: "-1001234567890:topic:42" },
      },
      acp: { cwd: "/workspace/repo-b" },
    },
    {
      type: "route",
      agentId: "main",
      match: { channel: "discord", accountId: "default" },
    },
    {
      type: "route",
      agentId: "main",
      match: { channel: "telegram", accountId: "default" },
    },
  ],
  channels: {
    discord: {
      guilds: {
        "111111111111111111": {
          channels: {
            "222222222222222222": { requireMention: false },
          },
        },
      },
    },
    telegram: {
      groups: {
        "-1001234567890": {
          topics: { "42": { requireMention: false } },
        },
      },
    },
  },
}
```

### Comportamiento

- OpenClaw asegura que la sesión ACP configurada exista antes de usarla.
- Los mensajes en ese canal o tema se enrutan a la sesión ACP configurada.
- En conversaciones vinculadas, `/new` y `/reset` restablecen la misma clave de sesión ACP en su lugar.
- Los enlaces de tiempo de ejecución temporales (por ejemplo, los creados por flujos de enfoque de hilos) todavía se aplican donde están presentes.
- Para inicios de ACP entre agentes sin un `cwd` explícito, OpenClaw hereda el espacio de trabajo del agente de destino desde la configuración del agente.
- Las rutas del espacio de trabajo heredadas que faltan vuelven al cwd predeterminado del backend; los fallos de acceso que no faltan aparecen como errores de generación.

## Iniciar sesiones de ACP

Dos formas de iniciar una sesión de ACP:

<Tabs>
  <Tab title="Desde sessions_spawn">
    Utilice `runtime: "acp"` para iniciar una sesión ACP desde un turno de agente o
    llamada de herramienta.

    ```json
    {
      "task": "Open the repo and summarize failing tests",
      "runtime": "acp",
      "agentId": "codex",
      "thread": true,
      "mode": "session"
    }
    ```

    <Note>
    `runtime` se predetermina en `subagent`, así que establezca `runtime: "acp"` explícitamente
    para sesiones ACP. Si se omite `agentId`, OpenClaw usa
    `acp.defaultAgent` cuando está configurado. `mode: "session"` requiere
    `thread: true` para mantener una conversación vinculada persistente.
    </Note>

  </Tab>
  <Tab title="Desde el comando /acp">
    Utilice `/acp spawn` para un control explícito del operador desde el chat.

    ```text
    /acp spawn codex --mode persistent --thread auto
    /acp spawn codex --mode oneshot --thread off
    /acp spawn codex --bind here
    /acp spawn codex --thread here
    ```

    Indicadores clave:

    - `--mode persistent|oneshot`
    - `--bind here|off`
    - `--thread auto|here|off`
    - `--cwd <absolute-path>`
    - `--label <name>`

    Consulte [Comandos de barra diagonal](/es/tools/slash-commands).

  </Tab>
</Tabs>

### parámetros `sessions_spawn`

<ParamField path="task" type="string" required>
  Prompt inicial enviado a la sesión de ACP.
</ParamField>
<ParamField path="runtime" type='"acp"' required>
  Debe ser `"acp"` para las sesiones de ACP.
</ParamField>
<ParamField path="agentId" type="string">
  ID del arnés de destino ACP. Se vuelve a `acp.defaultAgent` si está configurado.
</ParamField>
<ParamField path="thread" type="boolean" default="false">
  Solicitar el flujo de vinculación de hilos donde sea compatible.
</ParamField>
<ParamField path="mode" type='"run" | "session"' default="run">
  `"run"` es de un solo uso; `"session"` es persistente. Si `thread: true` y
  `mode` se omiten, OpenClaw puede adoptar por defecto un comportamiento persistente según
  la ruta de ejecución. `mode: "session"` requiere `thread: true`.
</ParamField>
<ParamField path="cwd" type="string">
  Directorio de trabajo de ejecución solicitado (validado por la política de backend/ejecución).
  Si se omite, la creación de la instancia de ACP hereda el espacio de trabajo del agente de destino
  cuando esté configurado; las rutas heredadas faltantes vuelven a los valores predeterminados del backend,
  mientras que los errores de acceso reales se devuelven.
</ParamField>
<ParamField path="label" type="string">
  Etiqueta orientada al operador utilizada en el texto de sesión/banner.
</ParamField>
<ParamField path="resumeSessionId" type="string">
  Reanudar una sesión de ACP existente en lugar de crear una nueva. El
  agente reproduce su historial de conversación a través de `session/load`. Requiere
  `runtime: "acp"`.
</ParamField>
<ParamField path="streamTo" type='"parent"'>
  `"parent"` transmite resúmenes de progreso de la ejecución inicial de ACP de vuelta a la
  sesión solicitante como eventos del sistema. Las respuestas aceptadas incluyen
  `streamLogPath` que apunta a un registro JSONL con ámbito de sesión
  (`<sessionId>.acp-stream.jsonl`) que puedes seguir para ver el historial completo de retransmisión.
</ParamField>

Las ejecuciones de ACP `sessions_spawn` utilizan `agents.defaults.subagents.runTimeoutSeconds` para
su límite predeterminado de turnos secundarios. La herramienta no acepta
invalidaciones de tiempo de espera por llamada.

<ParamField path="model" type="string">
  Invalidación explícita del modelo para la sesión secundaria de ACP. Las
  instancias de Codex ACP normalizan referencias de OpenAI como `openai/gpt-5.4` en la
  configuración de inicio de Codex ACP antes de `session/new`; las formas con barra
  como `openai/gpt-5.4/high` también establecen el esfuerzo de razonamiento de Codex ACP.
  Cuando se omite, `sessions_spawn({ runtime: "acp" })` utiliza los valores predeterminados
  del modelo de subagente existente (`agents.defaults.subagents.model` o
  `agents.list[].subagents.model`) cuando están configurados; de lo contrario, permite que
  el arnés de ACP utilice su propio modelo predeterminado.
  Otros arneses deben anunciar `models` de ACP y admitir
  `session/set_model`; de lo contrario, OpenClaw/acpx falla claramente en lugar de
  volver silenciosamente al valor predeterminado del agente de destino.
</ParamField>
<ParamField path="thinking" type="string">
  Esfuerzo de pensamiento/razonamiento explícito. Para Codex ACP, `minimal` se asigna a
  un esfuerzo bajo, `low`/`medium`/`high`/`xhigh` se asignan directamente, y `off`
  omite la invalidación de inicio del esfuerzo de razonamiento.
  Cuando se omite, las instancias de ACP utilizan los valores predeterminados de pensamiento
  del subagente existente y `agents.defaults.models["provider/model"].params.thinking` por modelo
  para el modelo seleccionado.
</ParamField>

## Modos de enlace e hilo de instancia

<Tabs>
  <Tab title="--bind here|off">
    | Modo   | Comportamiento                                                               |
    | ------ | ----------------------------------------------------------------------------- |
    | `here` | Vincular la conversación activa actual en su lugar; fallar si ninguna está activa. |
    | `off`  | No crear una vinculación de conversación actual.                             |

    Notas:

    - `--bind here` es la ruta de operador más sencilla para "hacer que este canal o chat esté respaldado por Codex".
    - `--bind here` no crea un hilo secundario.
    - `--bind here` solo está disponible en canales que exponen soporte de vinculación de conversación actual.
    - `--bind` y `--thread` no se pueden combinar en la misma llamada `/acp spawn`.

  </Tab>
  <Tab title="--thread auto|here|off">
    | Modo   | Comportamiento                                                                                            |
    | ------ | --------------------------------------------------------------------------------------------------------- |
    | `auto` | En un hilo activo: vincular ese hilo. Fuera de un hilo: crear/vincular un hilo secundario cuando sea compatible. |
    | `here` | Requiere un hilo activo actual; falla si no se está en uno.                                                  |
    | `off`  | Sin vinculación. La sesión se inicia sin vincular.                                                             |

    Notas:

    - En superficies sin vinculación de hilos, el comportamiento predeterminado es efectivamente `off`.
    - La generación vinculada a hilos requiere soporte de política de canal:
      - Discord: `channels.discord.threadBindings.spawnSessions=true`
      - Telegram: `channels.telegram.threadBindings.spawnSessions=true`
    - Use `--bind here` cuando desee fijar la conversación actual sin crear un hilo secundario.

  </Tab>
</Tabs>

## Modelo de entrega

Las sesiones de ACP pueden ser espacios de trabajo interactivos o trabajos en segundo plano propiedad del padre.
La ruta de entrega depende de esa forma.

<AccordionGroup>
  <Accordion title="Sesiones interactivas de ACP">
    Las sesiones interactivas están diseñadas para mantener una conversación en una superficie de chat visible:

    - `/acp spawn ... --bind here` vincula la conversación actual a la sesión de ACP.
    - `/acp spawn ... --thread ...` vincula un hilo/tema del canal a la sesión de ACP.
    - La configuración persistente de `bindings[].type="acp"` dirige las conversaciones coincidentes a la misma sesión de ACP.

    Los mensajes de seguimiento en la conversación vinculada se enrutan directamente a la sesión de ACP, y la salida de ACP se devuelve al mismo canal/hilo/tema.

    Lo que OpenClaw envía al arnés:

    - Los seguimientos vinculados normales se envían como texto de solicitud, además de archivos adjuntos solo cuando el arnés/backend los admite.
    - Los comandos de gestión de `/acp` y los comandos locales de Gateway se interceptan antes del envío de ACP.
    - Los eventos de finalización generados en tiempo de ejecución se materializan por objetivo. Los agentes de OpenClaw obtienen el sobre de contexto de tiempo de ejecución interno de OpenClaw; los arneses externos de ACP obtienen una solicitud simple con el resultado secundario y la instrucción. El sobre `<<<BEGIN_OPENCLAW_INTERNAL_CONTEXT>>>` sin procesar nunca debe enviarse a arneses externos ni persistirse como texto de transcripción de usuario de ACP.
    - Las entradas de la transcripción de ACP utilizan el texto de activación visible para el usuario o la solicitud de finalización simple. Los metadatos de eventos internos se mantienen estructurados en OpenClaw cuando sea posible y no se tratan como contenido de chat creado por el usuario.

  </Accordion>
  <Accordion title="Sesiones ACP de un solo tiro propiedad del padre">
    Las sesiones ACP de un solo tiro generadas por otra ejecución de agente son hijos en segundo plano,
    similares a los subagentes:

    - El padre solicita trabajo con `sessions_spawn({ runtime: "acp", mode: "run" })`.
    - El hijo se ejecuta en su propia sesión de harness ACP.
    - Los turnos del hijo se ejecutan en el mismo carril en segundo plano utilizado por las generaciones de subagentes nativos, por lo que un harness ACP lento no bloquea el trabajo de la sesión principal no relacionado.
    - La finalización se informa a través de la ruta de anuncio de finalización de tareas. OpenClaw convierte los metadatos de finalización interna en un prompt ACP plano antes de enviarlo a un harness externo, por lo que los harnesses no ven los marcadores de contexto de tiempo de ejecución exclusivos de OpenClaw.
    - El padre reescribe el resultado del hijo con la voz normal del asistente cuando una respuesta orientada al usuario es útil.

    **No** trate esta ruta como un chat entre pares entre el padre
    y el hijo. El hijo ya tiene un canal de finalización de vuelta al
    padre.

  </Accordion>
  <Accordion title="sessions_send y entrega A2A">
    `sessions_send` puede apuntar a otra sesión después de la generación. Para las
    sesiones entre pares normales, OpenClaw utiliza una ruta de seguimiento agente a agente (A2A)
    después de inyectar el mensaje:

    - Espere la respuesta de la sesión de destino.
    - Opcionalmente, permita que el solicitante y el destino intercambien un número limitado de turnos de seguimiento.
    - Pida al destino que produzca un mensaje de anuncio.
    - Entregue ese anuncio al canal o hilo visible.

    Esa ruta A2A es un respaldo para envíos entre pares donde el remitente necesita un
    seguimiento visible. Permanece habilitada cuando una sesión no relacionada puede
    ver y enviar mensajes a un destino ACP, por ejemplo bajo configuraciones
    `tools.sessions.visibility` amplias.

    OpenClaw omite el seguimiento A2A solo cuando el solicitante es el
    padre de su propio hijo ACP de un solo tiro propiedad del padre. En ese caso,
    ejecutar A2A sobre la finalización de tareas puede despertar al padre con el
    resultado del hijo, reenviar la respuesta del padre de vuelta al hijo y
    crear un bucle de eco padre/hijo. El resultado de `sessions_send` informa
    `delivery.status="skipped"` para ese caso de hijo propiedad porque la
    ruta de finalización ya es responsable del resultado.

  </Accordion>
  <Accordion title="Reanudar una sesión existente">
    Use `resumeSessionId` para continuar una sesión de ACP anterior en lugar de
    iniciar una nueva. El agente reproduce su historial de conversación a través de
    `session/load`, por lo que continúa con el contexto completo de lo que sucedió antes.

    ```json
    {
      "task": "Continue where we left off - fix the remaining test failures",
      "runtime": "acp",
      "agentId": "codex",
      "resumeSessionId": "<previous-session-id>"
    }
    ```

    Casos de uso comunes:

    - Pasar una sesión de Codex de su portátil a su teléfono: diga a su agente que continúe donde lo dejó.
    - Continuar una sesión de codificación que inició de forma interactiva en la CLI, ahora sin interfaz a través de su agente.
    - Reanudar el trabajo que se interrumpió por un reinicio de la puerta de enlace o un tiempo de espera de inactividad.

    Notas:

    - `resumeSessionId` solo se aplica cuando `runtime: "acp"`; el runtime de subagente predeterminado ignora este campo exclusivo de ACP.
    - `streamTo` solo se aplica cuando `runtime: "acp"`; el runtime de subagente predeterminado ignora este campo exclusivo de ACP.
    - `resumeSessionId` es un id de reanudación de ACP/harness local del host, no una clave de sesión de canal de OpenClaw; OpenClaw aún verifica la política de generación de ACP y la política de agente de destino antes del envío, mientras que el backend de ACP o el harness posee la autorización para cargar ese id upstream.
    - `resumeSessionId` restaura el historial de conversación de ACP upstream; `thread` y `mode` aún se aplican normalmente a la nueva sesión de OpenClaw que está creando, por lo que `mode: "session"` aún requiere `thread: true`.
    - El agente de destino debe admitir `session/load` (Codex y Claude Code lo hacen).
    - Si no se encuentra el id de sesión, la generación falla con un error claro; no hay retroceso silencioso a una nueva sesión.

  </Accordion>
  <Accordion title="Prueba de humo posterior al despliegue">
    Después de desplegar un gateway, realice una comprobación de extremo a extremo en vivo en lugar de
    confiar en las pruebas unitarias:

    1. Verifique la versión y el commit del gateway desplegado en el host de destino.
    2. Abra una sesión de puente ACPX temporal con un agente en vivo.
    3. Pida a ese agente que llame a `sessions_spawn` con `runtime: "acp"`, `agentId: "codex"`, `mode: "run"` y tarea `Reply with exactly LIVE-ACP-SPAWN-OK`.
    4. Verifique `accepted=yes`, un `childSessionKey` real y ningún error de validador.
    5. Limpie la sesión del puente temporal.

    Mantenga el gate en `mode: "run"` y omita `streamTo: "parent"` -
    las rutas `mode: "session"` ligadas al hilo y de retransmisión de flujo son pasos de integración
    más ricos y separados.

  </Accordion>
</AccordionGroup>

## Compatibilidad con el sandbox

Las sesiones de ACP se ejecutan actualmente en el tiempo de ejecución del host, **no** dentro del
sandbox de OpenClaw.

<Warning>
**Límite de seguridad:**

- El arnés externo puede leer/escribir según sus propios permisos de CLI y el `cwd` seleccionado.
- La política de sandbox de OpenClaw **no** envuelve la ejecución del arnés ACP.
- OpenClaw aún hace cumplir los gates de características de ACP, los agentes permitidos, la propiedad de la sesión, los enlaces de canal y la política de entrega del Gateway.
- Use `runtime: "subagent"` para el trabajo nativo de OpenClaw aplicado por sandbox.

</Warning>

Limitaciones actuales:

- Si la sesión solicitante está en el sandbox, las generaciones de ACP se bloquean tanto para `sessions_spawn({ runtime: "acp" })` como para `/acp spawn`.
- `sessions_spawn` con `runtime: "acp"` no es compatible con `sandbox: "require"`.

## Resolución del objetivo de la sesión

La mayoría de las acciones `/acp` aceptan un objetivo de sesión opcional (`session-key`,
`session-id` o `session-label`).

**Orden de resolución:**

1. Argumento de objetivo explícito (o `--session` para `/acp steer`)
   - intenta la clave
   - luego el id de sesión con forma de UUID
   - luego la etiqueta
2. Enlace del hilo actual (si esta conversación/hilo está vinculado a una sesión ACP).
3. Respaldo de la sesión solicitante actual.

Los enlaces de conversación actual y los enlaces de hilos participan
ambos en el paso 2.

Si no se resuelve ningún objetivo, OpenClaw devuelve un error claro
(`Unable to resolve session target: ...`).

## Controles de ACP

| Comando              | Lo que hace                                                            | Ejemplo                                                       |
| -------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------- |
| `/acp spawn`         | Crear sesión de ACP; enlace actual opcional o enlace de hilo.          | `/acp spawn codex --bind here --cwd /repo`                    |
| `/acp cancel`        | Cancelar turno en curso para la sesión objetivo.                       | `/acp cancel agent:codex:acp:<uuid>`                          |
| `/acp steer`         | Enviar instrucción de dirección a la sesión en ejecución.              | `/acp steer --session support inbox prioritize failing tests` |
| `/acp close`         | Cerrar sesión y desvincular objetivos de hilo.                         | `/acp close`                                                  |
| `/acp status`        | Mostrar backend, modo, estado, opciones de ejecución, capacidades.     | `/acp status`                                                 |
| `/acp set-mode`      | Establecer modo de ejecución para la sesión objetivo.                  | `/acp set-mode plan`                                          |
| `/acp set`           | Escritura genérica de opción de configuración de tiempo de ejecución.  | `/acp set model openai/gpt-5.4`                               |
| `/acp cwd`           | Establecer anulación del directorio de trabajo de tiempo de ejecución. | `/acp cwd /Users/user/Projects/repo`                          |
| `/acp permissions`   | Establecer perfil de política de aprobación.                           | `/acp permissions strict`                                     |
| `/acp timeout`       | Establecer tiempo de espera de ejecución (segundos).                   | `/acp timeout 120`                                            |
| `/acp model`         | Establecer anulación de modelo de tiempo de ejecución.                 | `/acp model anthropic/claude-opus-4-6`                        |
| `/acp reset-options` | Eliminar anulaciones de opciones de tiempo de ejecución de la sesión.  | `/acp reset-options`                                          |
| `/acp sessions`      | Enumerar sesiones recientes de ACP del almacenamiento.                 | `/acp sessions`                                               |
| `/acp doctor`        | Salud del backend, capacidades, soluciones accionables.                | `/acp doctor`                                                 |
| `/acp install`       | Imprimir pasos de instalación y habilitación deterministas.            | `/acp install`                                                |

`/acp status` muestra las opciones efectivas de tiempo de ejecución más los identificadores de sesión a nivel de tiempo de ejecución y a nivel de backend. Los errores de control no admitido aparecen claramente cuando a un backend le falta una capacidad. `/acp sessions` lee el almacenamiento para la sesión vinculada actual o de solicitante; los tokens de destino (`session-key`, `session-id` o `session-label`) se resuelven mediante el descubrimiento de sesión de la puerta de enlace, incluidas las raíces `session.store` personalizadas por agente.

### Asignación de opciones de tiempo de ejecución

`/acp` tiene comandos de conveniencia y un definidor genérico. Operaciones equivalentes:

| Comando                      | Se asigna a                                           | Notas                                                                                                                                                                                                                            |
| ---------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/acp model <id>`            | clave de configuración de tiempo de ejecución `model` | Para Codex ACP, OpenClaw normaliza `openai/<model>` al id del modelo del adaptador y asigna sufijos de razonamiento de barra como `openai/gpt-5.4/high` a `reasoning_effort`.                                                    |
| `/acp set thinking <level>`  | opción canónica `thinking`                            | OpenClaw envía el equivalente anunciado por el backend cuando está presente, prefiriendo `thinking`, luego `effort`, `reasoning_effort` o `thought_level`. Para Codex ACP, el adaptador asigna los valores a `reasoning_effort`. |
| `/acp permissions <profile>` | opción canónica `permissionProfile`                   | OpenClaw envía el equivalente anunciado por el backend cuando está presente, como `approval_policy`, `permission_profile`, `permissions` o `permission_mode`.                                                                    |
| `/acp timeout <seconds>`     | opción canónica `timeoutSeconds`                      | OpenClaw envía el equivalente anunciado por el backend cuando está presente, como `timeout` o `timeout_seconds`.                                                                                                                 |
| `/acp cwd <path>`            | anulación de cwd de tiempo de ejecución               | Actualización directa.                                                                                                                                                                                                           |
| `/acp set <key> <value>`     | genérico                                              | `key=cwd` usa la ruta de anulación de cwd.                                                                                                                                                                                       |
| `/acp reset-options`         | borra todas las anulaciones de tiempo de ejecución    | -                                                                                                                                                                                                                                |

## arnés acpx, configuración del complemento y permisos

Para la configuración del arnés acpx (alias de Claude Code / Codex / Gemini CLI), los puentes MCP de plugin-tools y OpenClaw-tools, y los modos de permisos de ACP, consulte
[ACP agents - setup](/es/tools/acp-agents-setup).

## Solución de problemas

| Síntoma                                                                     | Causa probable                                                                                                                                               | Solución                                                                                                                                                                                                          |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ACP runtime backend is not configured`                                     | Falta el plugin de backend, está deshabilitado o bloqueado por `plugins.allow`.                                                                              | Instale y habilite el plugin de backend, incluya `acpx` en `plugins.allow` cuando se establezca esa lista de permitidos (allowlist) y luego ejecute `/acp doctor`.                                                |
| `ACP is disabled by policy (acp.enabled=false)`                             | ACP deshabilitado globalmente.                                                                                                                               | Establezca `acp.enabled=true`.                                                                                                                                                                                    |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`           | Despacho automático desde mensajes de hilos normales deshabilitado.                                                                                          | Establezca `acp.dispatch.enabled=true` para reanudar el enrutamiento automático de hilos; las llamadas explícitas a `sessions_spawn({ runtime: "acp" })` aún funcionan.                                           |
| `ACP agent "<id>" is not allowed by policy`                                 | Agente no en la lista de permitidos.                                                                                                                         | Use un `agentId` permitido o actualice `acp.allowedAgents`.                                                                                                                                                       |
| `/acp doctor` informa que el backend no está listo justo después del inicio | Falta el plugin de backend, está deshabilitado, bloqueado por una política de permitir/denegar, o su ejecutable configurado no está disponible.              | Instale/habilite el plugin de backend, vuelva a ejecutar `/acp doctor` e inspeccione el error de instalación o política del backend si sigue sin funcionar.                                                       |
| Comando de arnés no encontrado                                              | El CLI del adaptador no está instalado, falta el plugin externo, o la recuperación de `npx` en la primera ejecución falló para un adaptador que no es Codex. | Ejecute `/acp doctor`, instale/precaliente el adaptador en el host de Gateway, o configure explícitamente el comando del agente acpx.                                                                             |
| Modelo no encontrado (Model-not-found) del arnés                            | El ID del modelo es válido para otro proveedor/arnés, pero no para este destino ACP.                                                                         | Use un modelo listado por ese arnés, configure el modelo en el arnés, o omita la anulación.                                                                                                                       |
| Error de autenticación del proveedor (Vendor auth error) desde el arnés     | OpenClaw está saludable, pero el CLI/proveedor de destino no ha iniciado sesión.                                                                             | Inicie sesión o proporcione la clave de proveedor requerida en el entorno del host de Gateway.                                                                                                                    |
| `Unable to resolve session target: ...`                                     | Token de clave/id/etiqueta incorrecto.                                                                                                                       | Ejecute `/acp sessions`, copie la clave/etiqueta exacta, reintente.                                                                                                                                               |
| `--bind here requires running /acp spawn inside an active ... conversation` | `--bind here` usado sin una conversación enlazable activa.                                                                                                   | Vaya al chat/canal de destino y vuelva a intentarlo, o use un inicio no enlazado.                                                                                                                                 |
| `Conversation bindings are unavailable for <channel>.`                      | El adaptador carece de capacidad de enlace ACP de conversación actual.                                                                                       | Use `/acp spawn ... --thread ...` donde sea compatible, configure `bindings[]` de nivel superior, o vaya a un canal compatible.                                                                                   |
| `--thread here requires running /acp spawn inside an active ... thread`     | `--thread here` usado fuera de un contexto de hilo.                                                                                                          | Vaya al hilo de destino o use `--thread auto`/`off`.                                                                                                                                                              |
| `Only <user-id> can rebind this channel/conversation/thread.`               | Otro usuario es el propietario del destino de enlace activo.                                                                                                 | Vuelva a enlazar como propietario o use una conversación o hilo diferente.                                                                                                                                        |
| `Thread bindings are unavailable for <channel>.`                            | El adaptador carece de capacidad de enlace de hilo.                                                                                                          | Use `--thread off` o vaya a un adaptador/canal compatible.                                                                                                                                                        |
| `Sandboxed sessions cannot spawn ACP sessions ...`                          | El tiempo de ejecución de ACP está en el lado del host; la sesión solicitante está en espacio aislado.                                                       | Use `runtime="subagent"` desde sesiones en espacio aislado, o ejecute el inicio de ACP desde una sesión que no esté en espacio aislado.                                                                           |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`     | `sandbox="require"` solicitado para el tiempo de ejecución de ACP.                                                                                           | Use `runtime="subagent"` para el aislamiento requerido, o use ACP con `sandbox="inherit"` desde una sesión que no esté en espacio aislado.                                                                        |
| `Cannot apply --model ... did not advertise model support`                  | El arnés de destino no expone el cambio genérico de modelo ACP.                                                                                              | Use un arnés que anuncie ACP `models`/`session/set_model`, use referencias de modelo ACP de Codex, o configure el modelo directamente en el arnés si tiene su propia marca de inicio.                             |
| Faltan metadatos de ACP para la sesión enlazada                             | Metadatos de sesión ACP obsoletos/eliminados.                                                                                                                | Vuelva a crear con `/acp spawn`, luego vuelva a enlazar/enfocar el hilo.                                                                                                                                          |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`    | `permissionMode` bloquea escrituras/ejec en sesión ACP no interactiva.                                                                                       | Establezca `plugins.entries.acpx.config.permissionMode` en `approve-all` y reinicie la puerta de enlace. Vea [Configuración de permisos](/es/tools/acp-agents-setup#permission-configuration).                    |
| La sesión ACP falla temprano con poca salida                                | Las solicitudes de permiso están bloqueadas por `permissionMode`/`nonInteractivePermissions`.                                                                | Revise los registros de la puerta de enlace para `AcpRuntimeError`. Para permisos completos, establezca `permissionMode=approve-all`; para una degradación elegante, establezca `nonInteractivePermissions=deny`. |
| La sesión de ACP se detiene indefinidamente después de completar el trabajo | El proceso del arnés finalizó, pero la sesión de ACP no reportó la finalización.                                                                             | Actualice OpenClaw; la limpieza actual de acpx elimina los procesos obsoletos de contenedor y adaptador propiedad de OpenClaw al cerrar y al iniciar la puerta de enlace.                                         |
| El arnés ve `<<<BEGIN_OPENCLAW_INTERNAL_CONTEXT>>>`                         | El sobre de evento interno se filtró a través del límite de ACP.                                                                                             | Actualice OpenClaw y vuelva a ejecutar el flujo de finalización; los arneses externos deberían recibir solo avisos de finalización sin formato.                                                                   |

<Note>
  `Command blocked by PreToolUse hook: Native hook relay unavailable` pertenece al relé de enlace nativo de Codex, no a ACP/acpx. En un chat de Codex vinculado, inicie una sesión nueva con `/new` o `/reset`; si funciona una vez y luego regresa en la siguiente llamada a herramienta nativa, reinicie el servidor de aplicaciones Codex o la puerta de enlace de OpenClaw en lugar de repetir `/new`.
  Consulte [Solución de problemas del arnés Codex](/es/plugins/codex-harness#troubleshooting).
</Note>

## Relacionado

- [Agentes de ACP - configuración](/es/tools/acp-agents-setup)
- [Envío de agente](/es/tools/agent-send)
- [Backends de CLI](/es/gateway/cli-backends)
- [Arnés de Codex](/es/plugins/codex-harness)
- [Tiempo de ejecución del arnés de Codex](/es/plugins/codex-harness-runtime)
- [Herramientas de espacio aislado multiagente](/es/tools/multi-agent-sandbox-tools)
- [`openclaw acp` (modo puente)](/es/cli/acp)
- [Sub-agentes](/es/tools/subagents)
