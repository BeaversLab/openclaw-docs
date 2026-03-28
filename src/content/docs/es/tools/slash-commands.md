---
summary: "Slash commands: texto frente a nativo, configuración y comandos compatibles"
read_when:
  - Using or configuring chat commands
  - Debugging command routing or permissions
title: "Slash Commands"
---

# Comandos de barra

Los comandos son manejados por el Gateway. La mayoría de los comandos deben enviarse como un mensaje **independiente** que comienza con `/`.
El comando de chat bash solo para host usa `! <cmd>` (con `/bash <cmd>` como alias).

Existen dos sistemas relacionados:

- **Comandos**: mensajes `/...` independientes.
- **Directivas**: `/think`, `/fast`, `/verbose`, `/reasoning`, `/elevated`, `/exec`, `/model`, `/queue`.
  - Las directivas se eliminan del mensaje antes de que el modelo lo vea.
  - En los mensajes de chat normales (no solo directivas), se tratan como "sugerencias en línea" y **no** mantienen la configuración de la sesión.
  - En los mensajes de solo directivas (el mensaje contiene solo directivas), se mantienen en la sesión y responden con una confirmación.
  - Las directivas solo se aplican para **remitentes autorizados**. Si `commands.allowFrom` está configurado, es la única
    lista de permitidos utilizada; de lo contrario, la autorización proviene de las listas de permitidos/pairing del canal más `commands.useAccessGroups`.
    Los remitentes no autorizados ven las directivas tratadas como texto sin formato.

También hay algunos **atajos en línea** (solo para remitentes en la lista de permitidos/autorizados): `/help`, `/commands`, `/status`, `/whoami` (`/id`).
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

- `commands.text` (predeterminado `true`) habilita el análisis `/...` en los mensajes de chat.
  - En superficies sin comandos nativos (WhatsApp/WebChat/Signal/iMessage/Google Chat/Microsoft Teams), los comandos de texto aún funcionan incluso si configuras esto en `false`.
- `commands.native` (por defecto `"auto"`) registra comandos nativos.
  - Automático: activado para Discord/Telegram; desactivado para Slack (hasta que agregues comandos de barra); ignorado para proveedores sin soporte nativo.
  - Configura `channels.discord.commands.native`, `channels.telegram.commands.native` o `channels.slack.commands.native` para anular por proveedor (bool o `"auto"`).
  - `false` borra los comandos registrados previamente en Discord/Telegram al iniciar. Los comandos de Slack se gestionan en la aplicación de Slack y no se eliminan automáticamente.
- `commands.nativeSkills` (por defecto `"auto"`) registra comandos de **habilidad** (**skill**) de forma nativa cuando es compatible.
  - Automático: activado para Discord/Telegram; desactivado para Slack (Slack requiere crear un comando de barra por habilidad).
  - Establezca `channels.discord.commands.nativeSkills`, `channels.telegram.commands.nativeSkills` o `channels.slack.commands.nativeSkills` para anular por proveedor (bool o `"auto"`).
- `commands.bash` (por defecto `false`) habilita `! <cmd>` para ejecutar comandos de shell del host (`/bash <cmd>` es un alias; requiere listas de permitidos `tools.elevated`).
- `commands.bashForegroundMs` (por defecto `2000`) controla cuánto tiempo espera bash antes de cambiar al modo de segundo plano (`0` pasa a segundo plano inmediatamente).
- `commands.config` (por defecto `false`) habilita `/config` (lee/escribe `openclaw.json`).
- `commands.mcp` (predeterminado `false`) habilita `/mcp` (lee/escribe la configuración de MCP gestionada por OpenClaw bajo `mcp.servers`).
- `commands.plugins` (predeterminado `false`) habilita `/plugins` (descubrimiento/estado de complementos más controles de instalación + habilitar/deshabilitar).
- `commands.debug` (predeterminado `false`) habilita `/debug` (solo anulaciones en tiempo de ejecución).
- `commands.allowFrom` (opcional) establece una lista de permitidos por proveedor para la autorización de comandos. Cuando se configura, es la
  única fuente de autorización para comandos y directivas (listas de permitidos de canales/emparejamiento y `commands.useAccessGroups`
  se ignoran). Use `"*"` para un valor predeterminado global; las claves específicas del proveedor lo anulan.
- `commands.useAccessGroups` (por defecto `true`) hace cumplir las listas de permitidos/políticas para los comandos cuando `commands.allowFrom` no está establecido.

## Lista de comandos

Texto + nativo (cuando está habilitado):

- `/help`
- `/commands`
- `/tools [compact|verbose]` (muestra lo que el agente actual puede usar ahora mismo; `verbose` añade descripciones)
- `/skill <name> [input]` (ejecuta una habilidad por nombre)
- `/status` (muestra el estado actual; incluye el uso/cuota del proveedor para el proveedor del modelo actual cuando está disponible)
- `/allowlist` (lista/añade/elimina entradas de lista de permitidos)
- `/approve <id> allow-once|allow-always|deny` (resuelve los avisos de aprobación de ejecución)
- `/context [list|detail|json]` (explica el "contexto"; `detail` muestra el tamaño por archivo + por herramienta + por habilidad + del prompt del sistema)
- `/btw <question>` (hace una pregunta lateral efímera sobre la sesión actual sin cambiar el contexto de la sesión futura; consulte [/tools/btw](/es/tools/btw))
- `/export-session [path]` (alias: `/export`) (exporta la sesión actual a HTML con el prompt del sistema completo)
- `/whoami` (muestra su id de remitente; alias: `/id`)
- `/session idle <duration|off>` (gestiona la auto-desactivación por inactividad para enlaces de hilos enfocados)
- `/session max-age <duration|off>` (gestiona la auto-desactivación por antigüedad máxima fija para enlaces de hilos enfocados)
- `/subagents list|kill|log|info|send|steer|spawn` (inspecciona, controla o genera ejecuciones de sub-agentes para la sesión actual)
- `/acp spawn|cancel|steer|close|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|sessions` (inspecciona y controla las sesiones de tiempo de ejecución de ACP)
- `/agents` (lista los agentes vinculados al hilo para esta sesión)
- `/focus <target>` (Discord: vincula este hilo, o un nuevo hilo, a un objetivo de sesión/subagente)
- `/unfocus` (Discord: elimina el vínculo del hilo actual)
- `/kill <id|#|all>` (aborta inmediatamente uno o todos los sub-agentes en ejecución para esta sesión; sin mensaje de confirmación)
- `/steer <id|#> <message>` (dirige inmediatamente un subagente en ejecución: durante la ejecución cuando sea posible, de lo contrario aborta el trabajo actual y se reinicia con el mensaje de dirección)
- `/tell <id|#> <message>` (alias para `/steer`)
- `/config show|get|set|unset` (persistir la configuración en el disco, solo para el propietario; requiere `commands.config: true`)
- `/mcp show|get|set|unset` (gestionar la configuración del servidor MCP OpenClaw, solo para el propietario; requiere `commands.mcp: true`)
- `/plugins list|show|get|install|enable|disable` (inspeccionar plugins descubiertos, instalar nuevos y alternar la habilitación; solo para el propietario para escrituras; requiere `commands.plugins: true`)
  - `/plugin` es un alias de `/plugins`.
  - `/plugin install <spec>` acepta las mismas especificaciones de plugin que `openclaw plugins install`: ruta/archivo local, paquete npm o `clawhub:<pkg>`.
  - Las escrituras de habilitar/deshabilitar todavía responden con una sugerencia de reinicio. En una puerta de enlace en primer plano observada, OpenClaw puede realizar ese reinicio automáticamente justo después de la escritura.
- `/debug show|set|unset|reset` (anulaciones en tiempo de ejecución, solo para el propietario; requiere `commands.debug: true`)
- `/usage off|tokens|full|cost` (pie de página de uso por respuesta o resumen de costos locales)
- `/tts off|always|inbound|tagged|status|provider|limit|summary|audio` (controlar TTS; ver [/tts](/es/tools/tts))
  - Discord: el comando nativo es `/voice` (Discord reserva `/tts`); el texto `/tts` todavía funciona.
- `/stop`
- `/restart`
- `/dock-telegram` (alias: `/dock_telegram`) (cambiar respuestas a Telegram)
- `/dock-discord` (alias: `/dock_discord`) (cambiar respuestas a Discord)
- `/dock-slack` (alias: `/dock_slack`) (cambiar respuestas a Slack)
- `/activation mention|always` (solo grupos)
- `/send on|off|inherit` (solo para el propietario)
- `/reset` o `/new [model]` (sugerencia de modelo opcional; el resto se pasa a través)
- `/think <off|minimal|low|medium|high|xhigh>` (opciones dinámicas por modelo/proveedor; alias: `/thinking`, `/t`)
- `/fast status|on|off` (omitir el argumento muestra el estado efectivo actual del modo rápido)
- `/verbose on|full|off` (alias: `/v`)
- `/reasoning on|off|stream` (alias: `/reason`; cuando está activado, envía un mensaje separado con el prefijo `Reasoning:`; `stream` = solo borrador de Telegram)
- `/elevated on|off|ask|full` (alias: `/elev`; `full` omite las aprobaciones de ejecución)
- `/exec host=<sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>` (envíe `/exec` para mostrar lo actual)
- `/model <name>` (alias: `/models`; o `/<alias>` desde `agents.defaults.models.*.alias`)
- `/queue <mode>` (más opciones como `debounce:2s cap:25 drop:summarize`; envíe `/queue` para ver la configuración actual)
- `/bash <command>` (solo host; alias para `! <command>`; requiere listas de permitidos `commands.bash: true` + `tools.elevated`)

Solo texto:

- `/compact [instructions]` (consulte [/concepts/compaction](/es/concepts/compaction))
- `! <command>` (solo host; uno a la vez; use `!poll` + `!stop` para trabajos de larga duración)
- `!poll` (verificar salida / estado; acepta `sessionId` opcional; `/bash poll` también funciona)
- `!stop` (detener el trabajo bash en ejecución; acepta `sessionId` opcional; `/bash stop` también funciona)

Notas:

- Los comandos aceptan un `:` opcional entre el comando y los argumentos (por ejemplo, `/think: high`, `/send: on`, `/help:`).
- `/new <model>` acepta un alias de modelo, `provider/model`, o un nombre de proveedor (coincidencia aproximada); si no hay coincidencia, el texto se trata como el cuerpo del mensaje.
- Para un desglose completo del uso del proveedor, use `openclaw status --usage`.
- `/allowlist add|remove` requiere `commands.config=true` y respeta el `configWrites` del canal.
- En canales multicuenta, `/allowlist --account <id>` y `/config set channels.<provider>.accounts.<id>...` destinados a la configuración también respetan el `configWrites` de la cuenta de destino.
- `/usage` controla el pie de página de uso por respuesta; `/usage cost` imprime un resumen de costos local desde los registros de sesión de OpenClaw.
- `/restart` está habilitado por defecto; establezca `commands.restart: false` para deshabilitarlo.
- Comando nativo solo para Discord: `/vc join|leave|status` controla los canales de voz (requiere `channels.discord.voice` y comandos nativos; no disponible como texto).
- Los comandos de vinculación de hilos de Discord (`/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age`) requieren que las vinculaciones de hilos efectivas estén habilitadas (`session.threadBindings.enabled` y/o `channels.discord.threadBindings.enabled`).
- Referencia de comandos y comportamiento en tiempo de ejecución de ACP: [ACP Agents](/es/tools/acp-agents).
- `/verbose` está destinado a la depuración y visibilidad adicional; manténgalo **desactivado** en el uso normal.
- `/fast on|off` persiste una anulación de sesión. Use la opción `inherit` de la interfaz de usuario de Sesiones para borrarla y volver a los valores predeterminados de configuración.
- Los resúmenes de fallos de herramientas aún se muestran cuando es relevante, pero el texto detallado del fallo solo se incluye cuando `/verbose` es `on` o `full`.
- `/reasoning` (y `/verbose`) son arriesgados en entornos grupales: pueden revelar razonamiento interno o salida de herramientas que no tenía intención de exponer. Es preferible dejarlos desactivados, especialmente en chats grupales.
- **Ruta rápida:** los mensajes que solo contienen comandos de remitentes en la lista de permitidos se manejan inmediatamente (omitir cola + modelo).
- **Filtrado de mención grupal:** los mensajes que solo contienen comandos de remitentes en la lista de permitidos omiten los requisitos de mención.
- **Accesos directos en línea (solo remitentes en la lista de permitidos):** ciertos comandos también funcionan cuando se incrustan en un mensaje normal y se eliminan antes de que el modelo vea el texto restante.
  - Ejemplo: `hey /status` activa una respuesta de estado, y el texto restante continúa a través del flujo normal.
- Actualmente: `/help`, `/commands`, `/status`, `/whoami` (`/id`).
- Los mensajes de solo comando no autorizados se ignoran silenciosamente, y los tokens en línea `/...` se tratan como texto sin formato.
- **Comandos de habilidades (Skill commands):** Las habilidades `user-invocable` se exponen como comandos de barra diagonal. Los nombres se sanean a `a-z0-9_` (máx. 32 caracteres); las colisiones obtienen sufijos numéricos (p. ej. `_2`).
  - `/skill <name> [input]` ejecuta una habilidad por nombre (útil cuando los límites de comandos nativos impiden comandos por habilidad).
  - Por defecto, los comandos de habilidades se reenvían al modelo como una solicitud normal.
  - Las habilidades pueden declarar opcionalmente `command-dispatch: tool` para enrutar el comando directamente a una herramienta (determinista, sin modelo).
  - Ejemplo: `/prose` (complemento OpenProse) — ver [OpenProse](/es/prose).
- **Argumentos de comandos nativos:** Discord usa autocompletado para opciones dinámicas (y menús de botones cuando omites argumentos obligatorios). Telegram y Slack muestran un menú de botones cuando un comando admite elecciones y omites el argumento.

## `/tools`

`/tools` responde a una pregunta en tiempo de ejecución, no a una pregunta de configuración: **lo que este agente puede usar ahora mismo en esta conversación**.

- El valor predeterminado `/tools` es compacto y está optimizado para una lectura rápida.
- `/tools verbose` añade descripciones breves.
- Las superficies de comandos nativos que admiten argumentos exponen el mismo selector de modo que `compact|verbose`.
- Los resultados están limitados a la sesión, por lo que cambiar el agente, el canal, el hilo, la autorización del remitente o el modelo puede cambiar la salida.
- `/tools` incluye herramientas que son realmente accesibles en tiempo de ejecución, incluyendo herramientas principales, herramientas de complementos conectadas y herramientas propiedad del canal.

Para la edición de perfiles y anulaciones, utiliza el panel Herramientas de la interfaz de control o las superficies de configuración/catálogo en lugar de tratar `/tools` como un catálogo estático.

## Superficies de uso (qué se muestra dónde)

- **Uso/cuota del proveedor** (ejemplo: "Claude 80% restante") aparece en `/status` para el proveedor del modelo actual cuando el seguimiento de uso está habilitado.
- **Tokens/coste por respuesta** está controlado por `/usage off|tokens|full` (añadido a las respuestas normales).
- `/model status` se trata de **modelos/auth/endpoints**, no del uso.

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

- `/model` y `/model list` muestran un selector numérico compacto (familia de modelo + proveedores disponibles).
- En Discord, `/model` y `/models` abren un selector interactivo con menús desplegables de proveedor y modelo más un paso de Enviar.
- `/model <#>` selecciona de ese selector (y prefiere el proveedor actual cuando es posible).
- `/model status` muestra la vista detallada, incluyendo el endpoint del proveedor configurado (`baseUrl`) y el modo de API (`api`) cuando está disponible.

## Sobrescrituras de depuración

`/debug` te permite establecer sobrescrituras de configuración **solo en tiempo de ejecución** (memoria, no disco). Solo para propietarios. Deshabilitado por defecto; habilite con `commands.debug: true`.

Ejemplos:

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

Notas:

- Las sobrescrituras se aplican inmediatamente a las nuevas lecturas de configuración, pero **no** escriben en `openclaw.json`.
- Use `/debug reset` para borrar todas las sobrescrituras y volver a la configuración en disco.

## Actualizaciones de configuración

`/config` escribe en su configuración en disco (`openclaw.json`). Solo para propietarios. Deshabilitado por defecto; habilite con `commands.config: true`.

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

`/mcp` escribe las definiciones de servidores MCP gestionados por OpenClaw bajo `mcp.servers`. Solo para propietarios. Deshabilitado por defecto; habilite con `commands.mcp: true`.

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

`/plugins` permite a los operadores inspeccionar los complementos descubiertos y alternar su habilitación en la configuración. Los flujos de solo lectura pueden usar `/plugin` como alias. Deshabilitado por defecto; habilítelo con `commands.plugins: true`.

Ejemplos:

```text
/plugins
/plugins list
/plugin show context7
/plugins enable context7
/plugins disable context7
```

Notas:

- `/plugins list` y `/plugins show` utilizan el descubrimiento real de complementos contra el espacio de trabajo actual más la configuración en disco.
- `/plugins enable|disable` actualiza solo la configuración del complemento; no instala ni desinstala complementos.
- Después de los cambios de habilitar/deshabilitar, reinicie el gateway para aplicarlos.

## Notas de superficie

- Los **comandos de texto** se ejecutan en la sesión de chat normal (los MD comparten `main`, los grupos tienen su propia sesión).
- Los **comandos nativos** utilizan sesiones aisladas:
  - Discord: `agent:<agentId>:discord:slash:<userId>`
  - Slack: `agent:<agentId>:slack:slash:<userId>` (prefijo configurable mediante `channels.slack.slashCommand.sessionPrefix`)
  - Telegram: `telegram:slash:<userId>` (apunta a la sesión de chat a través de `CommandTargetSessionKey`)
- **`/stop`** apunta a la sesión de chat activa para que pueda abortar la ejecución actual.
- **Slack:** `channels.slack.slashCommand` todavía es compatible con un solo comando estilo `/openclaw`. Si habilita `commands.native`, debe crear un comando de barra de Slack para cada comando integrado (mismos nombres que `/help`). Los menús de argumentos de comandos para Slack se entregan como botones efímeros de Block Kit.
  - Excepción nativa de Slack: registre `/agentstatus` (no `/status`) porque Slack reserva `/status`. El texto `/status` todavía funciona en los mensajes de Slack.

## Preguntas laterales BTW

`/btw` es una **pregunta lateral** rápida sobre la sesión actual.

A diferencia del chat normal:

- utiliza la sesión actual como contexto de fondo,
- se ejecuta como una llamada única separada **sin herramientas**,
- no cambia el contexto de la sesión futura,
- no se escribe en el historial de transcripciones,
- se entrega como un resultado lateral en vivo en lugar de un mensaje normal del asistente.

Esto hace que `/btw` sea útil cuando quieres una aclaración temporal mientras la tarea principal continúa.

Ejemplo:

```text
/btw what are we doing right now?
```

Consulta [Preguntas laterales BTW](/es/tools/btw) para obtener detalles sobre el comportamiento completo y la experiencia del usuario.
