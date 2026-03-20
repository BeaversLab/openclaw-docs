---
summary: "Slash commands: texto frente a nativo, configuración y comandos compatibles"
read_when:
  - Uso o configuración de comandos de chat
  - Depuración del enrutamiento o los permisos de comandos
title: "Slash Commands"
---

# Comandos de barra

Los comandos son manejados por el Gateway. La mayoría de los comandos deben enviarse como un mensaje **independiente** que comience con `/`.
El comando de chat bash solo para el host usa `! <cmd>` (con `/bash <cmd>` como alias).

Existen dos sistemas relacionados:

- **Comandos**: mensajes `/...` independientes.
- **Directivas**: `/think`, `/fast`, `/verbose`, `/reasoning`, `/elevated`, `/exec`, `/model`, `/queue`.
  - Las directivas se eliminan del mensaje antes de que el modelo lo vea.
  - En los mensajes de chat normales (no solo directivas), se tratan como "sugerencias en línea" y **no** mantienen la configuración de la sesión.
  - En los mensajes que solo contienen directivas (el mensaje contiene solo directivas), se mantienen en la sesión y responden con una confirmación.
  - Las directivas solo se aplican para **remitentes autorizados**. Si se establece `commands.allowFrom`, es la única
    lista de permitidos utilizada; de lo contrario, la autorización proviene de las listas de permitidos/emparejamiento del canal más `commands.useAccessGroups`.
    Los remitentes no autorizados ven las directivas tratadas como texto plano.

También hay algunos **atajos en línea** (solo para remitentes en lista de permitidos/autorizados): `/help`, `/commands`, `/status`, `/whoami` (`/id`).
Se ejecutan inmediatamente, se eliminan antes de que el modelo vea el mensaje y el texto restante continúa a través del flujo normal.

## Configuración

```json5
{
  commands: {
    native: "auto",
    nativeSkills: "auto",
    text: true,
    bash: false,
    bashForegroundMs: 2000,
    config: false,
    mcp: false,
    plugins: false,
    debug: false,
    restart: false,
    allowFrom: {
      "*": ["user1"],
      discord: ["user:123"],
    },
    useAccessGroups: true,
  },
}
```

- `commands.text` (por defecto `true`) habilita el análisis de `/...` en los mensajes de chat.
  - En superficies sin comandos nativos (WhatsApp/WebChat/Signal/iMessage/Google Chat/MS Teams), los comandos de texto aún funcionan incluso si establece esto en `false`.
- `commands.native` (por defecto `"auto"`) registra comandos nativos.
  - Auto: activado para Discord/Telegram; desactivado para Slack (hasta que añadas comandos de barra); ignorado para proveedores sin soporte nativo.
  - Establezca `channels.discord.commands.native`, `channels.telegram.commands.native` o `channels.slack.commands.native` para anular por proveedor (booleano o `"auto"`).
  - `false` borra los comandos registrados previamente en Discord/Telegram al inicio. Los comandos de Slack se gestionan en la aplicación de Slack y no se eliminan automáticamente.
- `commands.nativeSkills` (por defecto `"auto"`) registra comandos de **habilidad** de forma nativa cuando es compatible.
  - Auto: activado para Discord/Telegram; desactivado para Slack (Slack requiere crear un comando de barra por habilidad).
  - Establezca `channels.discord.commands.nativeSkills`, `channels.telegram.commands.nativeSkills` o `channels.slack.commands.nativeSkills` para anular por proveedor (booleano o `"auto"`).
- `commands.bash` (por defecto `false`) permite que `! <cmd>` ejecute comandos de shell del host (`/bash <cmd>` es un alias; requiere listas de permitidos de `tools.elevated`).
- `commands.bashForegroundMs` (por defecto `2000`) controla cuánto tiempo espera bash antes de cambiar al modo en segundo plano (`0` se pone en segundo plano inmediatamente).
- `commands.config` (por defecto `false`) habilita `/config` (lee/escribe `openclaw.json`).
- `commands.mcp` (por defecto `false`) habilita `/mcp` (lee/escribe la configuración de MCP gestionada por OpenClaw en `mcp.servers`).
- `commands.plugins` (por defecto `false`) habilita `/plugins` (descubrimiento/estado de complementos más interruptores de activación/desactivación).
- `commands.debug` (por defecto `false`) habilita `/debug` (anulaciones solo en tiempo de ejecución).
- `commands.allowFrom` (opcional) establece una lista de permitidos por proveedor para la autorización de comandos. Cuando se configura, es la única fuente de autorización para comandos y directivas (las listas de permitidos/pairing de canales y `commands.useAccessGroups` se ignoran). Use `"*"` para un valor predeterminado global; las claves específicas del proveedor lo sobrescriben.
- `commands.useAccessGroups` (predeterminado `true`) hace cumplir las listas de permitidos/políticas para los comandos cuando `commands.allowFrom` no está establecido.

## Lista de comandos

Texto + nativo (cuando está habilitado):

- `/help`
- `/commands`
- `/skill <name> [input]` (ejecutar una habilidad por nombre)
- `/status` (mostrar el estado actual; incluye el uso/cuota del proveedor para el proveedor del modelo actual cuando esté disponible)
- `/allowlist` (listar/añadir/eliminar entradas de la lista de permitidos)
- `/approve <id> allow-once|allow-always|deny` (resolver las indicaciones de aprobación de ejecución)
- `/context [list|detail|json]` (explicar el "contexto"; `detail` muestra el tamaño por archivo + por herramienta + por habilidad + del sistema de indicaciones)
- `/btw <question>` (hacer una pregunta lateral efímera sobre la sesión actual sin cambiar el contexto de la sesión futura; consulte [/tools/btw](/es/tools/btw))
- `/export-session [path]` (alias: `/export`) (exportar la sesión actual a HTML con la indicación completa del sistema)
- `/whoami` (mostrar su ID de remitente; alias: `/id`)
- `/session idle <duration|off>` (gestionar la autoeliminación del enfoque por inactividad para los enlaces de hilos enfocados)
- `/session max-age <duration|off>` (gestionar la autoeliminación del enfoque de antigüedad máxima estricta para los enlaces de hilos enfocados)
- `/subagents list|kill|log|info|send|steer|spawn` (inspeccionar, controlar o iniciar ejecuciones de subagentes para la sesión actual)
- `/acp spawn|cancel|steer|close|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|sessions` (inspeccionar y controlar las sesiones de tiempo de ejecución de ACP)
- `/agents` (listar los agentes vinculados al hilo para esta sesión)
- `/focus <target>` (Discord: vincular este hilo, o un nuevo hilo, a un destino de sesión/subagente)
- `/unfocus` (Discord: eliminar el enlace del hilo actual)
- `/kill <id|#|all>` (abortar inmediatamente uno o todos los subagentes en ejecución para esta sesión; sin mensaje de confirmación)
- `/steer <id|#> <message>` (dirigir inmediatamente un subagente en ejecución: durante la ejecución si es posible, de lo contrario abortar el trabajo actual y reiniciar con el mensaje de dirección)
- `/tell <id|#> <message>` (alias de `/steer`)
- `/config show|get|set|unset` (guardar la configuración en el disco, solo para el propietario; requiere `commands.config: true`)
- `/mcp show|get|set|unset` (gestionar la configuración del servidor MCP OpenClaw, solo para el propietario; requiere `commands.mcp: true`)
- `/plugins list|show|get|enable|disable` (inspeccionar los complementos descubiertos y alternar su habilitación, solo para el propietario para escrituras; requiere `commands.plugins: true`)
- `/debug show|set|unset|reset` (anulaciones en tiempo de ejecución, solo para el propietario; requiere `commands.debug: true`)
- `/usage off|tokens|full|cost` (pie de página de uso por respuesta o resumen de costos local)
- `/tts off|always|inbound|tagged|status|provider|limit|summary|audio` (controlar TTS; ver [/tts](/es/tts))
  - Discord: el comando nativo es `/voice` (Discord reserva `/tts`); el texto `/tts` todavía funciona.
- `/stop`
- `/restart`
- `/dock-telegram` (alias: `/dock_telegram`) (cambiar las respuestas a Telegram)
- `/dock-discord` (alias: `/dock_discord`) (cambiar las respuestas a Discord)
- `/dock-slack` (alias: `/dock_slack`) (cambiar las respuestas a Slack)
- `/activation mention|always` (solo grupos)
- `/send on|off|inherit` (solo para el propietario)
- `/reset` o `/new [model]` (pista de modelo opcional; el resto se pasa a través)
- `/think <off|minimal|low|medium|high|xhigh>` (opciones dinámicas por modelo/proveedor; alias: `/thinking`, `/t`)
- `/fast status|on|off` (omitir el argumento muestra el estado efectivo actual del modo rápido)
- `/verbose on|full|off` (alias: `/v`)
- `/reasoning on|off|stream` (alias: `/reason`; when on, sends a separate message prefixed `Reasoning:`; `stream` = Telegram draft only)
- `/elevated on|off|ask|full` (alias: `/elev`; `full` skips exec approvals)
- `/exec host=<sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>` (send `/exec` to show current)
- `/model <name>` (alias: `/models`; or `/<alias>` from `agents.defaults.models.*.alias`)
- `/queue <mode>` (plus options like `debounce:2s cap:25 drop:summarize`; send `/queue` to see current settings)
- `/bash <command>` (host-only; alias for `! <command>`; requires `commands.bash: true` + `tools.elevated` allowlists)

Solo texto:

- `/compact [instructions]` (see [/concepts/compaction](/es/concepts/compaction))
- `! <command>` (host-only; one at a time; use `!poll` + `!stop` for long-running jobs)
- `!poll` (check output / status; accepts optional `sessionId`; `/bash poll` also works)
- `!stop` (stop the running bash job; accepts optional `sessionId`; `/bash stop` also works)

Notas:

- Commands accept an optional `:` between the command and args (e.g. `/think: high`, `/send: on`, `/help:`).
- `/new <model>` accepts a model alias, `provider/model`, or a provider name (fuzzy match); if no match, the text is treated as the message body.
- For full provider usage breakdown, use `openclaw status --usage`.
- `/allowlist add|remove` requires `commands.config=true` and honors channel `configWrites`.
- En canales multicuenta, `/allowlist --account <id>` y `/config set channels.<provider>.accounts.<id>...` dirigidos a la configuración también respetan el `configWrites` de la cuenta de destino.
- `/usage` controla el pie de página de uso por respuesta; `/usage cost` imprime un resumen de costos local desde los registros de sesión de OpenClaw.
- `/restart` está habilitado por defecto; establezca `commands.restart: false` para deshabilitarlo.
- Comando nativo solo de Discord: `/vc join|leave|status` controla los canales de voz (requiere `channels.discord.voice` y comandos nativos; no disponible como texto).
- Los comandos de enlace de hilos de Discord (`/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age`) requieren que los enlaces de hilos efectivos estén habilitados (`session.threadBindings.enabled` y/o `channels.discord.threadBindings.enabled`).
- Referencia de comandos ACP y comportamiento en tiempo de ejecución: [ACP Agents](/es/tools/acp-agents).
- `/verbose` está pensado para la depuración y visibilidad adicional; manténgalo **desactivado** en el uso normal.
- `/fast on|off` persiste una anulación de sesión. Utilice la opción `inherit` de la interfaz de usuario de Sesiones para borrarla y volver a los valores predeterminados de configuración.
- Los resúmenes de fallos de herramientas aún se muestran cuando es relevante, pero el texto detallado de fallos solo se incluye cuando `/verbose` es `on` o `full`.
- `/reasoning` (y `/verbose`) son arriesgados en configuraciones de grupo: pueden revelar razonamiento interno o resultados de herramientas que no tenía la intención de exponer. Es preferible dejarlos desactivados, especialmente en chats grupales.
- **Ruta rápida:** los mensajes que contienen solo comandos de remitentes en la lista de permitidos se manejan inmediatamente (omitir cola + modelo).
- **Bloqueo de mención de grupo:** los mensajes que contienen solo comandos de remitentes en la lista de permitidos omiten los requisitos de mención.
- **Atajos en línea (solo remitentes en la lista de permitidos):** ciertos comandos también funcionan cuando se incrustan en un mensaje normal y se eliminan antes de que el modelo vea el texto restante.
  - Ejemplo: `hey /status` activa una respuesta de estado y el texto restante continúa a través del flujo normal.
- Actualmente: `/help`, `/commands`, `/status`, `/whoami` (`/id`).
- Los mensajes de solo comando no autorizados se ignoran silenciosamente y los tokens `/...` en línea se tratan como texto plano.
- **Comandos de habilidades (skills):** Las habilidades de `user-invocable` se exponen como comandos de barra. Los nombres se sanitizan a `a-z0-9_` (máx. 32 caracteres); las colisiones obtienen sufijos numéricos (p. ej., `_2`).
  - `/skill <name> [input]` ejecuta una habilidad por nombre (útil cuando los límites de comandos nativos impiden comandos por habilidad).
  - De forma predeterminada, los comandos de habilidades se reenvían al modelo como una solicitud normal.
  - Las habilidades pueden declarar opcionalmente `command-dispatch: tool` para enrutar el comando directamente a una herramienta (determinista, sin modelo).
  - Ejemplo: `/prose` (complemento OpenProse) — consulte [OpenProse](/es/prose).
- **Argumentos de comandos nativos:** Discord usa autocompletado para opciones dinámicas (y menús de botones cuando omite argumentos obligatorios). Telegram y Slack muestran un menú de botones cuando un comando admite opciones y omite el argumento.

## Superficies de uso (qué se muestra dónde)

- **Uso/cuota del proveedor** (ejemplo: "Claude 80% restante") aparece en `/status` para el proveedor del modelo actual cuando el seguimiento de uso está habilitado.
- **Tokens/costo por respuesta** está controlado por `/usage off|tokens|full` (adjunto a las respuestas normales).
- `/model status` se trata sobre **modelos/autenticación/puntos de conexión**, no sobre el uso.

## Selección de modelo (`/model`)

`/model` se implementa como una directiva.

Ejemplos:

```
/model
/model list
/model 3
/model openai/gpt-5.2
/model opus@anthropic:default
/model status
```

Notas:

- `/model` y `/model list` muestran un selector numérico compacto (familia de modelos + proveedores disponibles).
- En Discord, `/model` y `/models` abren un selector interactivo con menús desplegables de proveedor y modelo, además de un paso Enviar.
- `/model <#>` selecciona de ese selector (y prefiere el proveedor actual cuando es posible).
- `/model status` muestra la vista detallada, incluyendo el endpoint del proveedor configurado (`baseUrl`) y el modo de API (`api`) cuando esté disponible.

## Depuración de anulaciones

`/debug` te permite establecer anulaciones de configuración **solo en tiempo de ejecución** (memoria, no disco). Solo para el propietario. Deshabilitado por defecto; habilítalo con `commands.debug: true`.

Ejemplos:

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

Notas:

- Las anulaciones se aplican inmediatamente a las nuevas lecturas de configuración, pero **no** escriben en `openclaw.json`.
- Usa `/debug reset` para borrar todas las anulaciones y volver a la configuración en disco.

## Actualizaciones de configuración

`/config` escribe en tu configuración en disco (`openclaw.json`). Solo para el propietario. Deshabilitado por defecto; habilítalo con `commands.config: true`.

Ejemplos:

```
/config show
/config show messages.responsePrefix
/config get messages.responsePrefix
/config set messages.responsePrefix="[openclaw]"
/config unset messages.responsePrefix
```

Notas:

- La configuración se valida antes de escribirse; los cambios inválidos se rechazan.
- Las actualizaciones de `/config` persisten tras los reinicios.

## Actualizaciones de MCP

`/mcp` escribe las definiciones de servidores MCP administradas por OpenClaw bajo `mcp.servers`. Solo para el propietario. Deshabilitado por defecto; habilítalo con `commands.mcp: true`.

Ejemplos:

```text
/mcp show
/mcp show context7
/mcp set context7={"command":"uvx","args":["context7-mcp"]}
/mcp unset context7
```

Notas:

- `/mcp` almacena la configuración en la configuración de OpenClaw, no en la configuración del proyecto propiedad de Pi.
- Los adaptadores de tiempo de ejecución deciden qué transportes son realmente ejecutables.

## Actualizaciones de complementos

`/plugins` permite a los operadores inspeccionar los complementos descubiertos y alternar su habilitación en la configuración. Los flujos de solo lectura pueden usar `/plugin` como alias. Deshabilitado por defecto; habilítalo con `commands.plugins: true`.

Ejemplos:

```text
/plugins
/plugins list
/plugin show context7
/plugins enable context7
/plugins disable context7
```

Notas:

- `/plugins list` y `/plugins show` usan el descubrimiento real de complementos contra el espacio de trabajo actual más la configuración en disco.
- `/plugins enable|disable` solo actualiza la configuración del complemento; no instala ni desinstala complementos.
- Después de los cambios de habilitar/deshabilitar, reinicia la puerta de enlace para aplicarlos.

## Notas de superficie

- Los **comandos de texto** se ejecutan en la sesión de chat normal (los MDs comparten `main`, los grupos tienen su propia sesión).
- **Los comandos nativos** usan sesiones aisladas:
  - Discord: `agent:<agentId>:discord:slash:<userId>`
  - Slack: `agent:<agentId>:slack:slash:<userId>` (prefijo configurable mediante `channels.slack.slashCommand.sessionPrefix`)
  - Telegram: `telegram:slash:<userId>` (apunta a la sesión de chat mediante `CommandTargetSessionKey`)
- **`/stop`** apunta a la sesión de chat activa para que pueda abortar la ejecución actual.
- **Slack:** `channels.slack.slashCommand` todavía es compatible con un solo comando de estilo `/openclaw`. Si habilitas `commands.native`, debes crear un comando de barra de Slack por cada comando integrado (mismos nombres que `/help`). Los menús de argumentos de comandos para Slack se entregan como botones efímeros de Block Kit.
  - Excepción nativa de Slack: registra `/agentstatus` (no `/status`) porque Slack reserva `/status`. El texto `/status` todavía funciona en los mensajes de Slack.

## Preguntas laterales BTW

`/btw` es una **pregunta lateral** rápida sobre la sesión actual.

A diferencia del chat normal:

- usa la sesión actual como contexto de fondo,
- se ejecuta como una llamada única separada **sin herramientas**,
- no cambia el contexto de la sesión futura,
- no se escribe en el historial de transcripciones,
- se entrega como un resultado lateral en vivo en lugar de un mensaje de asistente normal.

Eso hace que `/btw` sea útil cuando deseas una aclaración temporal mientras la tarea principal continúa.

Ejemplo:

```text
/btw what are we doing right now?
```

Consulta [Preguntas laterales BTW](/es/tools/btw) para obtener detalles completos sobre el comportamiento y la experiencia del usuario del cliente.

import en from "/components/footer/en.mdx";

<en />
