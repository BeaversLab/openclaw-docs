---
summary: "Ejecuta harnesses de codificación externos (Claude Code, Cursor, Gemini CLI, Codex ACP explícito, OpenClaw ACP, OpenCode) a través del backend ACP"
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
permiten que OpenClaw ejecute harnesses de codificación externos (por ejemplo, Pi, Claude Code,
Cursor, Copilot, Droid, OpenClaw ACP, OpenCode, Gemini CLI y otros
harnesses ACPX compatibles) a través de un plugin de backend ACP.

Cada generación de sesión de ACP se rastrea como una [tarea en segundo plano](/es/automation/tasks).

<Note>
**ACP es la ruta de harness externo, no la ruta de Codex predeterminada.** El
plugin nativo del servidor de aplicaciones de Codex posee los controles `/codex ...` y el
runtime integrado `agentRuntime.id: "codex"`; ACP posee
los controles `/acp ...` y las sesiones `sessions_spawn({ runtime: "acp" })`.

Si deseas que Codex o Claude Code se conecten como un cliente MCP externo
directamente a las conversaciones de canal de OpenClaw existentes, usa
[`openclaw mcp serve`](/es/cli/mcp) en lugar de ACP.

</Note>

## ¿Qué página quiero?

| Quieres…                                                                                            | Usa esto                                    | Notas                                                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vincular o controlar Codex en la conversación actual                                                | `/codex bind`, `/codex threads`             | Ruta nativa del servidor de aplicaciones de Codex cuando el plugin `codex` está habilitado; incluye respuestas de chat vinculadas, reenvío de imágenes, modelo/rápido/permisos, controles de parada y dirección. ACP es una alternativa explícita |
| Ejecutar Claude Code, Gemini CLI, Codex ACP explícito u otro harness externo _a través_ de OpenClaw | Esta página                                 | Sesiones vinculadas al chat, `/acp spawn`, `sessions_spawn({ runtime: "acp" })`, tareas en segundo plano, controles de runtime                                                                                                                    |
| Exponer una sesión de OpenClaw Gateway _como_ un servidor ACP para un editor o cliente              | [`openclaw acp`](/es/cli/acp)               | Modo puente. El IDE/cliente habla ACP con OpenClaw a través de stdio/WebSocket                                                                                                                                                                    |
| Reutilizar una CLI de IA local como modelo de reserva solo de texto                                 | [Backends de CLI](/es/gateway/cli-backends) | No es ACP. Sin herramientas de OpenClaw, sin controles ACP, sin runtime de harness                                                                                                                                                                |

## ¿Esto funciona fuera de la caja?

Generalmente sí. Las instalaciones nuevas incluyen el complemento de tiempo de ejecución `acpx` habilitado de forma predeterminada con un binario `acpx` anclado localmente en el complemento que OpenClaw detecta y repara por sí solo al iniciarse. Ejecute `/acp doctor` para verificar el estado de preparación.

OpenClaw solo enseña a los agentes sobre la generación de ACP cuando ACP es **realmente
utilizable**: ACP debe estar habilitado, el despacho no debe estar deshabilitado, la sesión
actual no debe estar bloqueada por el sandbox y se debe cargar
un tiempo de ejecución de backend. Si esas condiciones no se cumplen, las habilidades del complemento ACP y
la guía de ACP `sessions_spawn` permanecen ocultas para que el agente no sugiera
un backend no disponible.

<AccordionGroup>
  <Accordion title="Contratiempos de la primera ejecución">
    - Si `plugins.allow` está configurado, es un inventario de complementos restrictivo y **debe** incluir `acpx`; de lo contrario, el valor predeterminado incluido se bloquea intencionalmente y `/acp doctor` informa la entrada faltante en la lista de permitidos.
    - Los adaptadores de arnés de destino (Codex, Claude, etc.) pueden obtenerse bajo demanda con `npx` la primera vez que los use.
    - La autenticación del proveedor aún debe existir en el host para ese arnés.
    - Si el host no tiene acceso a npm o red, las descargas de adaptadores de la primera ejecución fallarán hasta que los cachés se precarguen o el adaptador se instale de otra manera.
  </Accordion>
  <Accordion title="Requisitos de tiempo de ejecución">
    ACP inicia un proceso de arnés externo real. OpenClaw gestiona el enrutamiento,
    el estado de las tareas en segundo plano, la entrega, los enlaces y las políticas; el arnés
    gestiona su inicio de sesión de proveedor, su catálogo de modelos, su comportamiento del sistema de archivos y sus
    herramientas nativas.

    Antes de culpar a OpenClaw, verifique:

    - `/acp doctor` informa un backend habilitado y saludable.
    - El id de destino está permitido por `acp.allowedAgents` cuando se establece esa lista blanca.
    - El comando del arnés puede iniciarse en el host Gateway.
    - La autenticación del proveedor está presente para ese arnés (`claude`, `codex`, `gemini`, `opencode`, `droid`, etc.).
    - El modelo seleccionado existe para ese arnés: los ids de modelo no son portables entre arneses.
    - El `cwd` solicitado existe y es accesible, u omita `cwd` y deje que el backend use su valor predeterminado.
    - El modo de permiso coincide con el trabajo. Las sesiones no interactivas no pueden hacer clic en avisos de permisos nativos, por lo que las ejecuciones de código con muchas escrituras/ejecuciones generalmente necesitan un perfil de permisos ACPX que pueda proceder sin interacción.

  </Accordion>
</AccordionGroup>

Las herramientas de complementos de OpenClaw y las herramientas integradas de OpenClaw **no** están expuestas a
los arneses ACP de manera predeterminada. Habilite los puentes MCP explícitos en
[ACP agents — setup](/es/tools/acp-agents-setup) solo cuando el arnés
deba llamar a esas herramientas directamente.

## Objetivos de arneses compatibles

Con el backend `acpx` incluido, use estos ids de arnés como objetivos `/acp spawn <id>`
o `sessions_spawn({ runtime: "acp", agentId: "<id>" })`:

| Id del arnés | Backend típico                                        | Notas                                                                                       |
| ------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `claude`     | Adaptador ACP de Claude Code                          | Requiere autenticación de Claude Code en el host.                                           |
| `codex`      | Adaptador ACP de Codex                                | Respaldo ACP explícito solo cuando el `/codex` nativo no está disponible o se solicita ACP. |
| `copilot`    | Adaptador ACP de GitHub Copilot                       | Requiere autenticación de CLI/runtime de Copilot.                                           |
| `cursor`     | ACP de Cursor CLI (`cursor-agent acp`)                | Anule el comando acpx si una instalación local expone un punto de entrada ACP diferente.    |
| `droid`      | CLI de Factory Droid                                  | Requiere autenticación de Factory/Droid o `FACTORY_API_KEY` en el entorno del arnés.        |
| `gemini`     | Adaptador ACP de Gemini CLI                           | Requiere autenticación de Gemini CLI o configuración de clave API.                          |
| `iflow`      | CLI de iFlow                                          | La disponibilidad del adaptador y el control del modelo dependen de la CLI instalada.       |
| `kilocode`   | CLI de Kilo Code                                      | La disponibilidad del adaptador y el control del modelo dependen de la CLI instalada.       |
| `kimi`       | CLI de Kimi/Moonshot                                  | Requiere autenticación de Kimi/Moonshot en el host.                                         |
| `kiro`       | CLI de Kiro                                           | La disponibilidad del adaptador y el control del modelo dependen de la CLI instalada.       |
| `opencode`   | Adaptador ACP de OpenCode                             | Requiere autenticación del proveedor/CLI de OpenCode.                                       |
| `openclaw`   | Puente de OpenClaw Gateway a través de `openclaw acp` | Permite que un arnés con capacidad ACP responda a una sesión de OpenClaw Gateway.           |
| `pi`         | Tiempo de ejecución de Pi/OpenClaw integrado          | Se utiliza para experimentos con arneses nativos de OpenClaw.                               |
| `qwen`       | Qwen Code / Qwen CLI                                  | Requiere autenticación compatible con Qwen en el host.                                      |

Los alias de agentes acpx personalizados se pueden configurar en el propio acpx, pero la política de OpenClaw todavía verifica `acp.allowedAgents` y cualquier asignación `agents.list[].runtime.acp.agent` antes del envío.

## Manual del operador

Flujo rápido de `/acp` desde el chat:

<Steps>
  <Step title="Generar">
    `/acp spawn claude --bind here`,
    `/acp spawn gemini --mode persistent --thread auto` o explícito
    `/acp spawn codex --bind here`.
  </Step>
  <Step title="Trabajar">
    Continuar en la conversación o hilo vinculado (o apuntar a la clave de sesión explícitamente).
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
  <Step title="Stop">
    `/acp cancel` (turno actual) o `/acp close` (sesión + enlaces).
  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="Detalles del ciclo de vida">
    - Spawn crea o reanuda una sesión de tiempo de ejecución de ACP, registra los metadatos de ACP en el almacén de sesiones de OpenClaw y puede crear una tarea en segundo plano cuando la ejecución es propiedad del padre.
    - Los mensajes de seguimiento enlazados van directamente a la sesión de ACP hasta que se cierra, desenfoca, restablece o expira el enlace.
    - Los comandos de la puerta de enlace se mantienen locales. `/acp ...`, `/status` y `/unfocus` nunca se envían como texto de aviso normal a un arnés ACP enlazado.
    - `cancel` aborta el turno activo cuando el backend admite la cancelación; no elimina el enlace ni los metadatos de la sesión.
    - `close` finaliza la sesión de ACP desde el punto de vista de OpenClaw y elimina el enlace. Un arnés todavía puede mantener su propio historial ascendente si admite la reanudación.
    - Los trabajadores de tiempo de ejecución inactivos son elegibles para la limpieza después de `acp.runtime.ttlMinutes`; los metadatos de la sesión almacenada permanecen disponibles durante `/acp sessions`.
  </Accordion>
  <Accordion title="Reglas de enrutamiento nativo de Codex">
    Activadores en lenguaje natural que deben enrutar al **complemento
    nativo de Codex** cuando está habilitado:

    - "Vincular este canal de Discord a Codex."
    - "Adjuntar este chat al hilo de Codex `<id>`."
    - "Mostrar hilos de Codex, luego vincular este."

    La vinculación de conversaciones nativas de Codex es la ruta de control
    de chat predeterminada. Las herramientas dinámicas de OpenClaw aún se
    ejecutan a través de OpenClaw, mientras que las herramientas nativas de
    Codex como shell/apply-patch se ejecutan dentro de Codex. Para eventos
    de herramientas nativas de Codex, OpenClaw inyecta un relé de enlace
    nativo por turno para que los enlaces de complementos puedan bloquear
    `before_tool_call`, observar `after_tool_call` y enrutar
    eventos de Codex `PermissionRequest` a través de aprobaciones de
    OpenClaw. Los enlaces de Codex `Stop` se retransmiten
    a OpenClaw `before_agent_finalize`, donde los complementos pueden
    solicitar un pase más del modelo antes de que Codex finalice su respuesta.
    El relé permanece deliberadamente conservador: no muta los argumentos
    de herramientas nativas de Codex ni reescribe los registros de hilos
    de Codex. Use ACP explícito solo cuando desee el modelo de tiempo de
    ejecución/sesión de ACP. El límite de soporte de Codex integrado se
    documenta en el [contrato de soporte de Codex harness v1](/es/plugins/codex-harness#v1-support-contract).

  </Accordion>
  <Accordion title="Hoja de referencia de selección de modelo / proveedor / tiempo de ejecución">
    - `openai-codex/*` — ruta de OAuth/suscripción de PI Codex.
    - `openai/*` más `agentRuntime.id: "codex"` — tiempo de ejecución integrado del servidor de aplicaciones nativo de Codex.
    - `/codex ...` — control de conversación nativo de Codex.
    - `/acp ...` o `runtime: "acp"` — control ACP/acpx explícito.
  </Accordion>
  <Accordion title="Disparadores de lenguaje natural para enrutamiento ACP">
    Disparadores que deben enrutar al tiempo de ejecución de ACP:

    - "Ejecuta esto como una sesión ACP de Claude Code de un solo disparo y resume el resultado."
    - "Usa Gemini CLI para esta tarea en un hilo, luego mantén los seguimientos en ese mismo hilo."
    - "Ejecuta Codex a través de ACP en un hilo en segundo plano."

    OpenClaw selecciona `runtime: "acp"`, resuelve el arnés `agentId`,
    se vincula a la conversación o hilo actual cuando es compatible y
    enruta los seguimientos a esa sesión hasta el cierre/caducidad. Codex solo
    sigue esta ruta cuando ACP/acpx es explícito o el complemento nativo de
    Codex no está disponible para la operación solicitada.

    Para `sessions_spawn`, `runtime: "acp"` se anuncia solo cuando ACP
    está habilitado, el solicitante no está en sandbox y un tiempo de ejecución
    de backend de ACP está cargado. `acp.dispatch.enabled=false` pausa el envío
    automático de hilos de ACP pero no oculta ni bloquea llamadas
    explícitas `sessions_spawn({ runtime: "acp" })`. Apunta a IDs de arneses ACP como `codex`,
    `claude`, `droid`, `gemini` o `opencode`. No pases un
    ID de agente de configuración normal de OpenClaw desde `agents_list` a menos que esa entrada esté
    configurada explícitamente con `agents.list[].runtime.type="acp"`;
    de lo contrario, usa el tiempo de ejecución de subagente predeterminado. Cuando un agente
    de OpenClaw está configurado con `runtime.type="acp"`, OpenClaw usa
    `runtime.acp.agent` como el ID del arnés subyacente.

  </Accordion>
</AccordionGroup>

## ACP frente a subagentes

Usa ACP cuando quieras un tiempo de ejecución de arnés externo. Usa el **servidor de aplicaciones nativo de
Codex** para el enlace/control de conversaciones de Codex cuando el complemento `codex`
está habilitado. Usa **subagentes** cuando quieras ejecuciones delegadas nativas de OpenClaw.

| Área                      | Sesión ACP                                        | Ejecución de subagente                                |
| ------------------------- | ------------------------------------------------- | ----------------------------------------------------- |
| Tiempo de ejecución       | Complemento de backend de ACP (por ejemplo, acpx) | Tiempo de ejecución de subagente nativo de OpenClaw   |
| Clave de sesión           | `agent:<agentId>:acp:<uuid>`                      | `agent:<agentId>:subagent:<uuid>`                     |
| Comandos principales      | `/acp ...`                                        | `/subagents ...`                                      |
| Herramienta de generación | `sessions_spawn` con `runtime:"acp"`              | `sessions_spawn` (tiempo de ejecución predeterminado) |

Consulte también [Sub-agentes](/es/tools/subagents).

## Cómo ACP ejecuta Claude Code

Para Claude Code a través de ACP, la pila es:

1. Plano de control de sesión ACP de OpenClaw.
2. Complemento de tiempo de ejecución `acpx` incluido.
3. Adaptador ACP de Claude.
4. Mecanismo de tiempo de ejecución/sesión del lado de Claude.

ACP Claude es una **harness session** con controles ACP, reanudación de sesión, seguimiento de tareas en segundo plano y enlace opcional de conversación/hilo.

Los backends de CLI son tiempos de ejecución de reserva locales separados, solo de texto; consulte [CLI Backends](/es/gateway/cli-backends).

Para los operadores, la regla práctica es:

- **¿Quiere `/acp spawn`, sesiones enlazables, controles de tiempo de ejecución o trabajo de arnés persistente?** Use ACP.
- **¿Quiere una reserva de texto local simple a través de la CLI sin procesar?** Use los backends de CLI.

## Sesiones enlazadas

### Modelo mental

- **Superficie de chat** — donde las personas siguen hablando (canal de Discord, tema de Telegram, chat de iMessage).
- **Sesión ACP** — el estado duradero del tiempo de ejecución de Codex/Claude/Gemini al que OpenClaw enruta.
- **Hilo/tema secundario** — una superficie de mensajería adicional opcional creada solo por `--thread ...`.
- **Espacio de trabajo de tiempo de ejecución** — la ubicación del sistema de archivos (`cwd`, descarga de repositorio, espacio de trabajo de backend) donde se ejecuta el arnés. Independiente de la superficie de chat.

### Enlaces de conversación actual

`/acp spawn <harness> --bind here` fija la conversación actual a la sesión ACP generada — sin hilo secundario, misma superficie de chat. OpenClaw sigue siendo propietario del transporte, la autenticación, la seguridad y la entrega. Los mensajes de seguimiento en esa conversación se enrutan a la misma sesión; `/new` y `/reset` restablecen la sesión en su lugar; `/acp close` elimina el enlace.

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
  <Accordion title="Reglas de vinculación y exclusividad">
    - `--bind here` y `--thread ...` son mutuamente excluyentes.
    - `--bind here` solo funciona en canales que anuncian vinculación a la conversación actual; de lo contrario, OpenClaw devuelve un mensaje claro de no admitido. Las vinculaciones persisten tras los reinicios de la puerta de enlace.
    - En Discord, `spawnAcpSessions` solo se requiere cuando OpenClaw necesita crear un hilo secundario para `--thread auto|here` — no para `--bind here`.
    - Si generas una instancia para un agente ACP diferente sin `--cwd`, OpenClaw hereda el espacio de trabajo del **agente de destino** por defecto. Las rutas heredadas faltantes (`ENOENT`/`ENOTDIR`) vuelven al valor predeterminado del backend; otros errores de acceso (p. ej. `EACCES`) aparecen como errores de generación.
    - Los comandos de gestión de la puerta de enlace se mantienen locales en las conversaciones vinculadas — los comandos `/acp ...` son manejados por OpenClaw incluso cuando el texto de seguimiento normal se enruta a la sesión ACP vinculada; `/status` y `/unfocus` también se mantienen locales siempre que el manejo de comandos esté habilitado para esa superficie.
  </Accordion>
  <Accordion title="Sesiones vinculadas a hilos">
    Cuando los enlaces de hilos están habilitados para un adaptador de canal:

    - OpenClaw vincula un hilo a una sesión ACP de destino.
    - Los mensajes de seguimiento en ese hilo se envían a la sesión ACP vinculada.
    - La salida de ACP se devuelve al mismo hilo.
    - La pérdida de enfoque, cierre, archivo, tiempo de espera de inactividad o la expiración por antigüedad máxima elimina el vínculo.
    - `/acp close`, `/acp cancel`, `/acp status`, `/status` y `/unfocus` son comandos de Gateway, no indicaciones para el harness ACP.

    Marcas de características requeridas para ACP vinculado a hilos:

    - `acp.enabled=true`
    - `acp.dispatch.enabled` está activado por defecto (configure `false` para pausar el envío automático de hilos ACP; las llamadas explícitas a `sessions_spawn({ runtime: "acp" })` siguen funcionando).
    - Marca de creación de hilos ACP del adaptador de canal habilitada (específica del adaptador):
      - Discord: `channels.discord.threadBindings.spawnAcpSessions=true`
      - Telegram: `channels.telegram.threadBindings.spawnAcpSessions=true`

    La compatibilidad con la vinculación de hilos es específica del adaptador. Si el adaptador de canal activo no admite vínculos de hilos, OpenClaw devuelve un mensaje claro de no compatible/no disponible.

  </Accordion>
  <Accordion title="Canales compatibles con hilos">
    - Cualquier adaptador de canal que exponga capacidad de vinculación de sesión/hilo.
    - Soporte integrado actual: hilos/canales de **Discord**, temas de **Telegram** (temas de foro en grupos/supergrupos y temas de MD).
    - Los canales de complementos pueden agregar soporte a través de la misma interfaz de vinculación.
  </Accordion>
</AccordionGroup>

## Vínculos de canal persistentes

Para flujos de trabajo no efímeros, configure vínculos ACP persistentes en
entradas de nivel superior `bindings[]`.

### Modelo de vinculación

<ParamField path="bindings[].type" type='"acp"'>
  Marca un vínculo de conversación ACP persistente.
</ParamField>
<ParamField path="bindings[].match" type="object">
  Identifica la conversación de destino. Formas por canal:

- **Canal/hilo de Discord:** `match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
- **Tema de foro de Telegram:** `match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
- **BlueBubbles DM/grupo:** `match.channel="bluebubbles"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`. Se prefiere `chat_id:*` o `chat_identifier:*` para enlaces de grupo estables.
- **iMessage DM/grupo:** `match.channel="imessage"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`. Se prefiere `chat_id:*` para enlaces de grupo estables.
  </ParamField>
<ParamField path="bindings[].agentId" type="string">
El ID del agente propietario de OpenClaw.
</ParamField>
<ParamField path="bindings[].acp.mode" type='"persistent" | "oneshot"'>
Anulación de ACP opcional.
</ParamField>
<ParamField path="bindings[].acp.label" type="string">
Etiqueta opcional para el operador.
</ParamField>
<ParamField path="bindings[].acp.cwd" type="string">
Directorio de trabajo de ejecución opcional.
</ParamField>
<ParamField path="bindings[].acp.backend" type="string">
Anulación de backend opcional.
</ParamField>

### Valores predeterminados de ejecución por agente

Use `agents.list[].runtime` para definir los valores predeterminados de ACP una vez por agente:

- `agents.list[].runtime.type="acp"`
- `agents.list[].runtime.acp.agent` (id de arnés, p. ej., `codex` o `claude`)
- `agents.list[].runtime.acp.backend`
- `agents.list[].runtime.acp.mode`
- `agents.list[].runtime.acp.cwd`

**Precedencia de anulación para sesiones ACP vinculadas:**

1. `bindings[].acp.*`
2. `agents.list[].runtime.acp.*`
3. Valores predeterminados globales de ACP (p. ej., `acp.backend`)

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

- OpenClaw asegura que la sesión ACP configurada exista antes de su uso.
- Los mensajes en ese canal o tema se enrutan a la sesión ACP configurada.
- En conversaciones vinculadas, `/new` y `/reset` restablecen la misma clave de sesión ACP en su lugar.
- Los enlaces de tiempo de ejecución temporales (por ejemplo, los creados por flujos de enfoque de hilos) aún se aplican donde estén presentes.
- Para inicios de ACP entre agentes sin un `cwd` explícito, OpenClaw hereda el espacio de trabajo del agente de destino desde la configuración del agente.
- Las rutas de espacio de trabajo heredadas que faltan vuelven al cwd predeterminado del backend; los fallos de acceso no faltantes se muestran como errores de inicio.

## Iniciar sesiones ACP

Dos formas de iniciar una sesión ACP:

<Tabs>
  <Tab title="From sessions_spawn">
    Use `runtime: "acp"` para iniciar una sesión de ACP desde un turno de agente o
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
    `runtime` por defecto es `subagent`, así que establezca `runtime: "acp"` explícitamente
    para sesiones de ACP. Si `agentId` se omite, OpenClaw usa
    `acp.defaultAgent` cuando está configurado. `mode: "session"` requiere
    `thread: true` para mantener una conversación vinculada persistente.
    </Note>

  </Tab>
  <Tab title="From /acp command">
    Use `/acp spawn` para un control explícito del operador desde el chat.

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

    Consulte [Slash commands](/es/tools/slash-commands).

  </Tab>
</Tabs>

### Parámetros de `sessions_spawn`

<ParamField path="task" type="string" required>
  Prompt inicial enviado a la sesión de ACP.
</ParamField>
<ParamField path="runtime" type='"acp"' required>
  Debe ser `"acp"` para las sesiones de ACP.
</ParamField>
<ParamField path="agentId" type="string">
  Id del harness de destino de ACP. Recurre a `acp.defaultAgent` si se establece.
</ParamField>
<ParamField path="thread" type="boolean" default="false">
  Solicitar el flujo de vinculación de hilos donde sea compatible.
</ParamField>
<ParamField path="mode" type='"run" | "session"' default="run">
  `"run"` es de un solo uso; `"session"` es persistente. Si `thread: true` y
  `mode` se omiten, OpenClaw puede adoptar por defecto el comportamiento persistente por
  ruta de ejecución. `mode: "session"` requiere `thread: true`.
</ParamField>
<ParamField path="cwd" type="string">
  Directorio de trabajo de ejecución solicitado (validado por la política de backend/ejecución).
  Si se omite, el inicio de ACP hereda el espacio de trabajo del agente de destino
  cuando está configurado; las rutas heredadas faltantes recurren a los valores predeterminados del backend,
  mientras que los errores de acceso reales se devuelven.
</ParamField>
<ParamField path="label" type="string">
  Etiqueta orientada al operador utilizada en el texto de sesión/banner.
</ParamField>
<ParamField path="resumeSessionId" type="string">
  Reanuda una sesión de ACP existente en lugar de crear una nueva. El
  agente reproduce su historial de conversación a través de `session/load`. Requiere
  `runtime: "acp"`.
</ParamField>
<ParamField path="streamTo" type='"parent"'>
  `"parent"` transmite resúmenes de progreso de ejecución inicial de ACP de vuelta a la
  sesión solicitante como eventos del sistema. Las respuestas aceptadas incluyen
  `streamLogPath` que apunta a un registro JSONL con ámbito de sesión
  (`<sessionId>.acp-stream.jsonl`) del que puedes hacer seguimiento para obtener el historial de retransmisión completo.
</ParamField>
<ParamField path="runTimeoutSeconds" type="number">
  Aborta el turno secundario de ACP después de N segundos. `0` mantiene el turno en la
  ruta sin tiempo de espera de la puerta de enlace. El mismo valor se aplica a la ejecución de la puerta de enlace
  y al tiempo de ejecución de ACP para que los harnesses bloqueados/sin cuota no
  ocupen el carril del agente principal indefinidamente.
</ParamField>
<ParamField path="model" type="string">
  Sustitución explícita del modelo para la sesión secundaria de ACP. Los inicios de ACP de Codex
  normalizan las referencias de Codex de OpenClaw como `openai-codex/gpt-5.4` a la configuración de
  inicio de ACP de Codex antes de `session/new`; las formas con barra como
  `openai-codex/gpt-5.4/high` también establecen el esfuerzo de razonamiento de ACP de Codex.
  Otros harnesses deben anunciar ACP `models` y admitir
  `session/set_model`; de lo contrario, OpenClaw/acpx falla claramente en lugar de
  recurrir silenciosamente al agente de destino predeterminado.
</ParamField>
<ParamField path="thinking" type="string">
  Esfuerzo de pensamiento/razonamiento explícito. Para ACP de Codex, `minimal` se asigna a
  esfuerzo bajo, `low`/`medium`/`high`/`xhigh` se asignan directamente, y `off`
  omite la sustitución de inicio de esfuerzo de razonamiento.
</ParamField>

## Modos de enlace e hilo de generación

<Tabs>
  <Tab title="--bind here|off">
    | Modo   | Comportamiento                                                               |
    | ------ | ---------------------------------------------------------------------- |
    | `here` | Vincular la conversación activa actual en su lugar; fallar si no hay ninguna activa. |
    | `off`  | No crear un vínculo de conversación actual.                          |

    Notas:

    - `--bind here` es la ruta de operador más simple para "hacer que este canal o chat esté respaldado por Codex."
    - `--bind here` no crea un hilo secundario.
    - `--bind here` solo está disponible en canales que exponen soporte de vinculación de conversación actual.
    - `--bind` y `--thread` no se pueden combinar en la misma llamada `/acp spawn`.

  </Tab>
  <Tab title="--thread auto|here|off">
    | Modo   | Comportamiento                                                                                            |
    | ------ | --------------------------------------------------------------------------------------------------- |
    | `auto` | En un hilo activo: vincular ese hilo. Fuera de un hilo: crear/vincular un hilo secundario cuando sea compatible. |
    | `here` | Requerir hilo activo actual; fallar si no se está en uno.                                                  |
    | `off`  | Sin vinculación. La sesión comienza sin vincular.                                                                 |

    Notas:

    - En superficies sin vinculación de hilos, el comportamiento predeterminado es efectivamente `off`.
    - La generación vinculada a hilos requiere soporte de política de canal:
      - Discord: `channels.discord.threadBindings.spawnAcpSessions=true`
      - Telegram: `channels.telegram.threadBindings.spawnAcpSessions=true`
    - Use `--bind here` cuando desee fijar la conversación actual sin crear un hilo secundario.

  </Tab>
</Tabs>

## Modelo de entrega

Las sesiones de ACP pueden ser espacios de trabajo interactivos o trabajo en segundo plano
propiedad del elemento principal. La ruta de entrega depende de esa forma.

<AccordionGroup>
  <Accordion title="Sesiones interactivas de ACP">
    Las sesiones interactivas están diseñadas para mantener la conversación en una
    superficie de chat visible:

    - `/acp spawn ... --bind here` vincula la conversación actual a la sesión de ACP.
    - `/acp spawn ... --thread ...` vincula un hilo/tema de canal a la sesión de ACP.
    - Configuración persistente de `bindings[].type="acp"` que enruta las conversaciones coincidentes a la misma sesión de ACP.

    Los mensajes de seguimiento en la conversación vinculada se enrutan directamente a la
    sesión de ACP, y la salida de ACP se devuelve al mismo
    canal/hilo/tema.

    Lo que OpenClaw envía al harness:

    - Los seguimientos vinculados normales se envían como texto de solicitud, además de archivos adjuntos solo cuando el harness/backend los admite.
    - Los comandos de gestión `/acp` y los comandos locales de Gateway se interceptan antes del envío de ACP.
    - Los eventos de finalización generados en tiempo de ejecución se materializan por objetivo. Los agentes de OpenClaw obtienen el sobre de contexto de tiempo de ejecución interno de OpenClaw; los harnesses externos de ACP obtienen una solicitud simple con el resultado secundario y la instrucción. El sobre `<<<BEGIN_OPENCLAW_INTERNAL_CONTEXT>>>` sin procesar nunca debe enviarse a harnesses externos ni persistirse como texto de transcripción de usuario de ACP.
    - Las entradas de la transcripción de ACP usan el texto de activación visible para el usuario o la solicitud de finalización simple. Los metadatos de eventos internos se mantienen estructurados en OpenClaw cuando es posible y no se tratan como contenido de chat creado por el usuario.

  </Accordion>
  <Accordion title="Sesiones ACP de un solo uso propiedad del padre">
    Las sesiones ACP de un solo uso generadas por otra ejecución de agente son hijas en segundo plano, similares a los subagentes:

    - El padre solicita trabajo con `sessions_spawn({ runtime: "acp", mode: "run" })`.
    - El hijo se ejecuta en su propia sesión de arnés ACP.
    - Los turnos del hijo se ejecutan en el mismo carril en segundo plano utilizado por las generaciones de subagentes nativos, por lo que un arnés ACP lento no bloquea el trabajo de la sesión principal no relacionado.
    - La finalización se informa a través de la ruta de anuncio de finalización de tareas. OpenClaw convierte los metadatos de finalización internos en un mensaje ACP simple antes de enviarlos a un arnés externo, por lo que los arneses no ven los marcadores de contexto de ejecución exclusivos de OpenClaw.
    - El padre reescribe el resultado del hijo con la voz normal del asistente cuando una respuesta orientada al usuario es útil.

    **No** trate esta ruta como un chat punto a punto entre el padre y el hijo. El hijo ya tiene un canal de finalización de vuelta al padre.

  </Accordion>
  <Accordion title="sessions_send y entrega A2A">
    `sessions_send` puede apuntar a otra sesión después de generarse. Para sesiones punto a punto normales, OpenClaw utiliza una ruta de seguimiento de agente a agente (A2A) después de inyectar el mensaje:

    - Esperar la respuesta de la sesión objetivo.
    - Opcionalmente, permitir que el solicitante y el objetivo intercambien un número limitado de turnos de seguimiento.
    - Pedir al objetivo que genere un mensaje de anuncio.
    - Entregar ese anuncio al canal o hilo visible.

    Esa ruta A2A es una alternativa para los envíos punto a punto donde el remitente necesita un seguimiento visible. Permanece habilitada cuando una sesión no relacionada puede ver y enviar un mensaje a un objetivo ACP, por ejemplo en configuraciones amplias de `tools.sessions.visibility`.

    OpenClaw omite el seguimiento A2A solo cuando el solicitante es el padre de su propio hijo ACP de un solo uso propiedad del padre. En ese caso, ejecutar A2A sobre la finalización de la tarea puede despertar al padre con el resultado del hijo, reenviar la respuesta del padre de vuelta al hijo y crear un bucle de eco padre/hijo. El resultado de `sessions_send` informa `delivery.status="skipped"` para ese caso de hijo propiedad porque la ruta de finalización ya es responsable del resultado.

  </Accordion>
  <Accordion title="Reanudar una sesión existente">
    Use `resumeSessionId` para continuar una sesión ACP anterior en lugar de
    empezar de cero. El agente reproduce su historial de conversación a través de
    `session/load`, por lo que continúa con el contexto completo de lo que ocurrió anteriormente.

    ```json
    {
      "task": "Continue where we left off — fix the remaining test failures",
      "runtime": "acp",
      "agentId": "codex",
      "resumeSessionId": "<previous-session-id>"
    }
    ```

    Casos de uso comunes:

    - Pasar una sesión de Codex de su portátil a su teléfono — dígale a su agente que continúe donde lo dejó.
    - Continuar una sesión de codificación que inició de forma interactiva en la CLI, ahora sin periféricos a través de su agente.
    - Retomar el trabajo que fue interrumpido por un reinicio de la puerta de enlace o un tiempo de espera por inactividad.

    Notas:

    - `resumeSessionId` solo se aplica cuando `runtime: "acp"`; el tiempo de ejecución del subagente predeterminado ignora este campo exclusivo de ACP.
    - `streamTo` solo se aplica cuando `runtime: "acp"`; el tiempo de ejecución del subagente predeterminado ignora este campo exclusivo de ACP.
    - `resumeSessionId` es un id de reanudación de ACP/harness local del host, no una clave de sesión de canal de OpenClaw; OpenClaw aún verifica la política de generación de ACP y la política del agente objetivo antes del despacho, mientras que el backend de ACP o el harness posee la autorización para cargar ese id ascendente.
    - `resumeSessionId` restaura el historial de conversación de ACP ascendente; `thread` y `mode` todavía se aplican normalmente a la nueva sesión de OpenClaw que está creando, por lo que `mode: "session"` todavía requiere `thread: true`.
    - El agente objetivo debe admitir `session/load` (Codex y Claude Code lo hacen).
    - Si no se encuentra el id de sesión, la generación falla con un error claro — sin respaldo silencioso a una nueva sesión.

  </Accordion>
  <Accordion title="Prueba de humo posterior al despliegue">
    Después de un despliegue de puerta de enlace, ejecute una verificación de extremo a extremo en vivo en lugar de
    confiar en las pruebas unitarias:

    1. Verifique la versión de la puerta de enlace desplegada y el commit en el host de destino.
    2. Abra una sesión de puente ACPX temporal con un agente en vivo.
    3. Pida a ese agente que llame a `sessions_spawn` con `runtime: "acp"`, `agentId: "codex"`, `mode: "run"` y tarea `Reply with exactly LIVE-ACP-SPAWN-OK`.
    4. Verifique `accepted=yes`, un `childSessionKey` real y que no haya errores del validador.
    5. Limpie la sesión del puente temporal.

    Mantenga la puerta de enlace en `mode: "run"` y omita `streamTo: "parent"` —
    las rutas `mode: "session"` vinculadas al hilo y de retransmisión de flujo son pasos de integración más ricos y separados.

  </Accordion>
</AccordionGroup>

## Compatibilidad con el sandbox

Las sesiones de ACP actualmente se ejecutan en el tiempo de ejecución del host, **no** dentro del
sandbox de OpenClaw.

<Warning>
**Límite de seguridad:**

- El arnés externo puede leer/escribir de acuerdo con sus propios permisos de CLI y el `cwd` seleccionado.
- La política de sandbox de OpenClaw **no** envuelve la ejecución del arnés ACP.
- OpenClaw todavía hace cumplir los feature gates de ACP, los agentes permitidos, la propiedad de la sesión, los enlaces del canal y la política de entrega de la Gateway.
- Use `runtime: "subagent"` para el trabajo nativo de OpenClaw con cumplimiento de sandbox.
  </Warning>

Limitaciones actuales:

- Si la sesión solicitante está en un sandbox, las generaciones de ACP se bloquean tanto para `sessions_spawn({ runtime: "acp" })` como para `/acp spawn`.
- `sessions_spawn` con `runtime: "acp"` no admite `sandbox: "require"`.

## Resolución del objetivo de sesión

La mayoría de las acciones de `/acp` aceptan un objetivo de sesión opcional (`session-key`,
`session-id` o `session-label`).

**Orden de resolución:**

1. Argumento de objetivo explícito (o `--session` para `/acp steer`)
   - intenta la clave
   - luego el id de sesión con forma de UUID
   - luego la etiqueta
2. Enlace del hilo actual (si esta conversación/hilo está vinculado a una sesión ACP).
3. Reserva de la sesión solicitante actual.

Los enlaces de conversación actual y los enlaces de hilos participan en
el paso 2.

Si no se resuelve ningún destino, OpenClaw devuelve un error claro
(`Unable to resolve session target: ...`).

## Controles de ACP

| Comando              | Lo que hace                                                                  | Ejemplo                                                       |
| -------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `/acp spawn`         | Crear sesión ACP; enlace actual opcional o enlace de hilo.                   | `/acp spawn codex --bind here --cwd /repo`                    |
| `/acp cancel`        | Cancelar turno en curso para la sesión de destino.                           | `/acp cancel agent:codex:acp:<uuid>`                          |
| `/acp steer`         | Enviar instrucción de dirección a la sesión en ejecución.                    | `/acp steer --session support inbox prioritize failing tests` |
| `/acp close`         | Cerrar sesión y desvincular destinos de hilo.                                | `/acp close`                                                  |
| `/acp status`        | Mostrar backend, modo, estado, opciones de tiempo de ejecución, capacidades. | `/acp status`                                                 |
| `/acp set-mode`      | Establecer modo de tiempo de ejecución para la sesión de destino.            | `/acp set-mode plan`                                          |
| `/acp set`           | Escritura de opción de configuración de tiempo de ejecución genérica.        | `/acp set model openai/gpt-5.4`                               |
| `/acp cwd`           | Establecer anulación del directorio de trabajo de tiempo de ejecución.       | `/acp cwd /Users/user/Projects/repo`                          |
| `/acp permissions`   | Establecer perfil de política de aprobación.                                 | `/acp permissions strict`                                     |
| `/acp timeout`       | Establecer tiempo de espera de ejecución (segundos).                         | `/acp timeout 120`                                            |
| `/acp model`         | Establecer anulación del modelo de tiempo de ejecución.                      | `/acp model anthropic/claude-opus-4-6`                        |
| `/acp reset-options` | Eliminar anulaciones de opciones de tiempo de ejecución de la sesión.        | `/acp reset-options`                                          |
| `/acp sessions`      | Listar sesiones recientes de ACP del almacenamiento.                         | `/acp sessions`                                               |
| `/acp doctor`        | Salud del backend, capacidades, correcciones accionables.                    | `/acp doctor`                                                 |
| `/acp install`       | Imprimir pasos de instalación y habilitación deterministas.                  | `/acp install`                                                |

`/acp status` muestra las opciones de tiempo de ejecución efectivas más los identificadores de sesión a nivel de tiempo de ejecución y de backend. Los errores de control no admitido aparecen claramente cuando a un backend le falta una capacidad. `/acp sessions` lee el almacén para la sesión vinculada actual o de solicitante; los tokens de destino (`session-key`, `session-id` o `session-label`) se resuelven mediante el descubrimiento de sesión de la puerta de enlace, incluidas las raíces `session.store` personalizadas por agente.

### Asignación de opciones de tiempo de ejecución

`/acp` tiene comandos de conveniencia y un establecedor genérico. Operaciones equivalentes:

| Comando                      | Asigna a                                                        | Notas                                                                                                                                                                                        |
| ---------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/acp model <id>`            | clave de configuración de tiempo de ejecución `model`           | Para Codex ACP, OpenClaw normaliza `openai-codex/<model>` al id del modelo del adaptador y mapea los sufijos de razonamiento de barra como `openai-codex/gpt-5.4/high` a `reasoning_effort`. |
| `/acp set thinking <level>`  | clave de configuración de tiempo de ejecución `thinking`        | Para Codex ACP, OpenClaw envía el `reasoning_effort` correspondiente cuando el adaptador admite uno.                                                                                         |
| `/acp permissions <profile>` | clave de configuración de tiempo de ejecución `approval_policy` | —                                                                                                                                                                                            |
| `/acp timeout <seconds>`     | clave de configuración de tiempo de ejecución `timeout`         | —                                                                                                                                                                                            |
| `/acp cwd <path>`            | anulación de cwd de tiempo de ejecución                         | Actualización directa.                                                                                                                                                                       |
| `/acp set <key> <value>`     | genérico                                                        | `key=cwd` usa la ruta de anulación de cwd.                                                                                                                                                   |
| `/acp reset-options`         | borra todas las anulaciones de tiempo de ejecución              | —                                                                                                                                                                                            |

## arnés acpx, configuración de complemento y permisos

Para la configuración del arnés acpx (alias de Claude Code / Codex / Gemini CLI), los puentes MCP de herramientas de complementos y herramientas de OpenClaw, y los modos de permiso ACP, consulte
[ACP agents — setup](/es/tools/acp-agents-setup).

## Solución de problemas

| Síntoma                                                                     | Causa probable                                                                                   | Solución                                                                                                                                                                                                             |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ACP runtime backend is not configured`                                     | Falta el complemento de backend, está deshabilitado o está bloqueado por `plugins.allow`.        | Instale y habilite el complemento de backend, incluya `acpx` en `plugins.allow` cuando esa lista de permitidos esté configurada, y luego ejecute `/acp doctor`.                                                      |
| `ACP is disabled by policy (acp.enabled=false)`                             | ACP deshabilitado globalmente.                                                                   | Establezca `acp.enabled=true`.                                                                                                                                                                                       |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`           | Despacho automático desde mensajes de hilos normales deshabilitado.                              | Establezca `acp.dispatch.enabled=true` para reanudar el enrutamiento automático de hilos; las llamadas explícitas a `sessions_spawn({ runtime: "acp" })` aún funcionan.                                              |
| `ACP agent "<id>" is not allowed by policy`                                 | Agente no en la lista de permitidos.                                                             | Use un `agentId` permitido o actualice `acp.allowedAgents`.                                                                                                                                                          |
| `/acp doctor` informa que el backend no está listo justo después del inicio | El sondeo de dependencias del complemento o la autorreparación aún se están ejecutando.          | Espere brevemente y vuelva a ejecutar `/acp doctor`; si sigue sin estar saludable, inspeccione el error de instalación del backend y la política de permiso/denegación del complemento.                              |
| Comando de arnés no encontrado                                              | La CLI del adaptador no está instalada o falló la recuperación de `npx` de la primera ejecución. | Instale/precaliente el adaptador en el host de la puerta de enlace o configure el comando del agente acpx explícitamente.                                                                                            |
| Modelo no encontrado desde el arnés                                         | El ID del modelo es válido para otro proveedor/arnés pero no para este objetivo de ACP.          | Use un modelo listado por ese arnés, configure el modelo en el arnés u omita la anulación.                                                                                                                           |
| Error de autenticación del proveedor desde el arnés                         | OpenClaw está saludable, pero la CLI/proveedor objetivo no ha iniciado sesión.                   | Inicie sesión o proporcione la clave de proveedor requerida en el entorno del host de la puerta de enlace.                                                                                                           |
| `Unable to resolve session target: ...`                                     | Token de clave/ID/etiqueta incorrecto.                                                           | Ejecute `/acp sessions`, copie la clave/etiqueta exacta, reintente.                                                                                                                                                  |
| `--bind here requires running /acp spawn inside an active ... conversation` | `--bind here` usado sin una conversación enlazable activa.                                       | Muévase al chat/canal objetivo y reintente, o use una generación no enlazada.                                                                                                                                        |
| `Conversation bindings are unavailable for <channel>.`                      | El adaptador carece de capacidad de enlace ACP de conversación actual.                           | Use `/acp spawn ... --thread ...` donde sea compatible, configure `bindings[]` de nivel superior, o muévase a un canal compatible.                                                                                   |
| `--thread here requires running /acp spawn inside an active ... thread`     | `--thread here` usado fuera de un contexto de hilo.                                              | Muévase al hilo objetivo o use `--thread auto`/`off`.                                                                                                                                                                |
| `Only <user-id> can rebind this channel/conversation/thread.`               | Otro usuario es propietario del objetivo de enlace activo.                                       | Vuelva a enlazar como propietario o use una conversación o hilo diferente.                                                                                                                                           |
| `Thread bindings are unavailable for <channel>.`                            | El adaptador carece de capacidad de vinculación de hilos.                                        | Use `--thread off` o cambie a un adaptador/canal compatible.                                                                                                                                                         |
| `Sandboxed sessions cannot spawn ACP sessions ...`                          | El tiempo de ejecución de ACP está en el lado del host; la sesión solicitante está en sandbox.   | Use `runtime="subagent"` desde sesiones en sandbox, o ejecute el inicio de ACP desde una sesión sin sandbox.                                                                                                         |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`     | Se solicitó `sandbox="require"` para el tiempo de ejecución de ACP.                              | Use `runtime="subagent"` para el sandbox necesario, o use ACP con `sandbox="inherit"` desde una sesión sin sandbox.                                                                                                  |
| `Cannot apply --model ... did not advertise model support`                  | El harness de destino no expone el cambio de modelo genérico de ACP.                             | Use un harness que anuncie ACP `models`/`session/set_model`, use referencias de modelo ACP de Codex, o configure el modelo directamente en el harness si tiene su propio indicador de inicio.                        |
| Faltan metadatos de ACP para la sesión vinculada                            | Metadatos de sesión ACP obsoletos/eliminados.                                                    | Vuelva a crear con `/acp spawn`, luego vuelva a vincular/enfocar el hilo.                                                                                                                                            |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`    | `permissionMode` bloquea escrituras/ejec en sesión ACP no interactiva.                           | Establezca `plugins.entries.acpx.config.permissionMode` en `approve-all` y reinicie la puerta de enlace. Vea [Configuración de permisos](/es/tools/acp-agents-setup#permission-configuration).                       |
| La sesión ACP falla temprano con poco resultado                             | Los avisos de permiso están bloqueados por `permissionMode`/`nonInteractivePermissions`.         | Verifique los registros de la puerta de enlace buscando `AcpRuntimeError`. Para permisos completos, establezca `permissionMode=approve-all`; para degradación elegante, establezca `nonInteractivePermissions=deny`. |
| La sesión ACP se detiene indefinidamente después de completar el trabajo    | El proceso del harness finalizó pero la sesión ACP no informó la finalización.                   | Monitoree con `ps aux \| grep acpx`; elimine manualmente los procesos obsoletos.                                                                                                                                     |
| El harness ve `<<<BEGIN_OPENCLAW_INTERNAL_CONTEXT>>>`                       | El sobre de evento interno se filtró a través del límite de ACP.                                 | Actualice OpenClaw y vuelva a ejecutar el flujo de finalización; los harnesses externos deberían recibir solo avisos de finalización sin formato.                                                                    |

## Relacionado

- [Agentes ACP: configuración](/es/tools/acp-agents-setup)
- [Envío de agente](/es/tools/agent-send)
- [Backends de CLI](/es/gateway/cli-backends)
- [Arnés de Codex](/es/plugins/codex-harness)
- [Herramientas de espacio aislado multiagente](/es/tools/multi-agent-sandbox-tools)
- [`openclaw acp` (modo puente)](/es/cli/acp)
- [Subagentes](/es/tools/subagents)
