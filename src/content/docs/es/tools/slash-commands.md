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
- `/tasks` (enumerar las tareas en segundo plano para la sesión actual; muestra detalles de tareas activas y recientes con recuentos de retorno alternativo locales del agente)
- `/allowlist` (enumerar/añadir/eliminar entradas de lista de permitidos)
- `/approve <id> <decision>` (resuelve los avisos de aprobación de ejecución; usa el mensaje de aprobación pendiente para las decisiones disponibles)
- `/context [list|detail|json]` (explicar "contexto"; `detail` muestra el tamaño del indicador del sistema + por habilidad + por herramienta + por archivo)
- `/btw <question>` (hace una pregunta lateral efímera sobre la sesión actual sin cambiar el contexto de la sesión futura; ver [/tools/btw](/en/tools/btw))
- `/export-session [path]` (alias: `/export`) (exportar la sesión actual a HTML con el indicador del sistema completo)
- `/whoami` (mostrar su ID de remitente; alias: `/id`)
- `/session idle <duration|off>` (administrar la auto-desenfocada por inactividad para los enlaces de hilos enfocados)
- `/session max-age <duration|off>` (administrar la auto-desenfocada rígida de antigüedad máxima para los enlaces de hilos enfocados)
- `/subagents list|kill|log|info|send|steer|spawn` (inspeccionar, controlar o iniciar ejecuciones de subagentes para la sesión actual)
- `/acp spawn|cancel|steer|close|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|sessions` (inspeccionar y controlar sesiones de tiempo de ejecución de ACP)
- `/agents` (enumerar los agentes vinculados al hilo para esta sesión)
- `/focus <target>` (Discord: vincular este hilo, o un nuevo hilo, a un objetivo de sesión/subagente)
- `/unfocus` (Discord: eliminar el enlace del hilo actual)
- `/kill <id|#|all>` (abortar inmediatamente uno o todos los subagentes en ejecución para esta sesión; sin mensaje de confirmación)
- `/steer <id|#> <message>` (dirigir inmediatamente un subagente en ejecución: en ejecución cuando sea posible, de lo contrario, abortar el trabajo actual y reiniciar con el mensaje de dirección)
- `/tell <id|#> <message>` (alias para `/steer`)
- `/config show|get|set|unset` (guardar la configuración en el disco, solo para el propietario; requiere `commands.config: true`)
- `/mcp show|get|set|unset` (administrar la configuración del servidor MCP de OpenClaw, solo para el propietario; requiere `commands.mcp: true`)
- `/plugins list|show|get|install|enable|disable` (inspeccionar los complementos descubiertos, instalar nuevos y alternar su habilitación; solo para el propietario para escrituras; requiere `commands.plugins: true`)
  - `/plugin` es un alias de `/plugins`.
  - `/plugin install <spec>` acepta las mismas especificaciones de complemento que `openclaw plugins install`: ruta local/archivo, paquete npm o `clawhub:<pkg>`.
  - Las escrituras de habilitar/deshabilitar todavía responden con una sugerencia de reinicio. En una puerta de enlace en primer plano vigilada, OpenClaw puede realizar ese reinicio automáticamente justo después de la escritura.
- `/debug show|set|unset|reset` (anulaciones en tiempo de ejecución, solo para el propietario; requiere `commands.debug: true`)
- `/usage off|tokens|full|cost` (pie de página de uso por respuesta o resumen de costos local)
- `/tts off|always|inbound|tagged|status|provider|limit|summary|audio` (controla TTS; ver [/tts](/en/tools/tts))
  - Discord: el comando nativo es `/voice` (Discord reserva `/tts`); el texto `/tts` todavía funciona.
- `/stop`
- `/restart`
- `/dock-telegram` (alias: `/dock_telegram`) (cambiar las respuestas a Telegram)
- `/dock-discord` (alias: `/dock_discord`) (cambiar las respuestas a Discord)
- `/dock-slack` (alias: `/dock_slack`) (cambiar las respuestas a Slack)
- `/activation mention|always` (solo grupos)
- `/send on|off|inherit` (solo para el propietario)
- `/reset` o `/new [model]` (sugerencia de modelo opcional; el resto se pasa directamente)
- `/think <off|minimal|low|medium|high|xhigh>` (opciones dinámicas por modelo/proveedor; alias: `/thinking`, `/t`)
- `/fast status|on|off` (omitir el argumento muestra el estado actual efectivo del modo rápido)
- `/verbose on|full|off` (alias: `/v`)
- `/reasoning on|off|stream` (alias: `/reason`; cuando está activado, envía un mensaje separado prefijado `Reasoning:`; `stream` = solo borrador de Telegram)
- `/elevated on|off|ask|full` (alias: `/elev`; `full` omite las aprobaciones de ejecución)
- `/exec host=<auto|sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>` (envíe `/exec` para mostrar el actual)
- `/model <name>` (alias: `/models`; o `/<alias>` de `agents.defaults.models.*.alias`)
- `/queue <mode>` (más opciones como `debounce:2s cap:25 drop:summarize`; envíe `/queue` para ver la configuración actual)
- `/bash <command>` (solo host; alias para `! <command>`; requiere listas de permitidos `commands.bash: true` + `tools.elevated`)
- `/dreaming [on|off|status|help]` (activa/desactiva el "dreaming" global o muestra el estado; ver [Dreaming](/en/concepts/dreaming))

Solo texto:

- `/compact [instructions]` (ver [/concepts/compaction](/en/concepts/compaction))
- `! <command>` (solo host; uno a la vez; usa `!poll` + `!stop` para trabajos de larga duración)
- `!poll` (verifica la salida / estado; acepta `sessionId` opcional; `/bash poll` también funciona)
- `!stop` (detiene el trabajo bash en ejecución; acepta `sessionId` opcional; `/bash stop` también funciona)

Notas:

- Los comandos aceptan un `:` opcional entre el comando y los argumentos (ej. `/think: high`, `/send: on`, `/help:`).
- `/new <model>` acepta un alias de modelo, `provider/model`, o un nombre de proveedor (coincidencia aproximada); si no hay coincidencia, el texto se trata como el cuerpo del mensaje.
- Para un desglose completo del uso del proveedor, usa `openclaw status --usage`.
- `/allowlist add|remove` requiere `commands.config=true` y respeta el canal `configWrites`.
- En canales multicuenta, `/allowlist --account <id>` y `/config set channels.<provider>.accounts.<id>...` dirigidos a la configuración también respetan el `configWrites` de la cuenta de destino.
- `/usage` controla el pie de página de uso por respuesta; `/usage cost` imprime un resumen de costos local desde los registros de sesión de OpenClaw.
- `/restart` está habilitado por defecto; establece `commands.restart: false` para desactivarlo.
- Comando nativo solo de Discord: `/vc join|leave|status` controla los canales de voz (requiere `channels.discord.voice` y comandos nativos; no disponible como texto).
- Los comandos de vinculación de hilos de Discord (`/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age`) requieren que los enlaces de hilo efectivos estén habilitados (`session.threadBindings.enabled` y/o `channels.discord.threadBindings.enabled`).
- Referencia de comandos y comportamiento de tiempo de ejecución de ACP: [ACP Agents](/en/tools/acp-agents).
- `/verbose` está destinado a la depuración y visibilidad adicional; manténgalo **desactivado** en uso normal.
- `/fast on|off` persiste una anulación de sesión. Use la opción `inherit` de la interfaz de usuario de Sesiones para borrarla y volver a los valores predeterminados de configuración.
- `/fast` es específico del proveedor: OpenAI/OpenAI Codex lo asignan a `service_tier=priority` en los puntos finales nativos de Responses, mientras que las solicitudes públicas directas de Anthropic, incluido el tráfico autenticado por OAuth enviado a `api.anthropic.com`, lo asignan a `service_tier=auto` o `standard_only`. Vea [OpenAI](/en/providers/openai) y [Anthropic](/en/providers/anthropic).
- Los resúmenes de fallos de herramientas aún se muestran cuando es relevante, pero el texto de fallo detallado solo se incluye cuando `/verbose` es `on` o `full`.
- `/reasoning` (y `/verbose`) son arriesgados en configuraciones grupales: pueden revelar razonamiento interno o salida de herramientas que no tenía la intención de exponer. Prefiera dejarlos desactivados, especialmente en chats grupales.
- `/model` persiste el nuevo modelo de sesión inmediatamente.
- Si el agente está inactivo, la siguiente ejecución lo usa de inmediato.
- Si una ejecución ya está activa, OpenClaw marca un cambio en vivo como pendiente y solo se reinicia en el nuevo modelo en un punto de reintegro limpio.
- Si la actividad de la herramienta o la salida de respuesta ya ha comenzado, el cambio pendiente puede permanecer en cola hasta una oportunidad de reintento posterior o el próximo turno del usuario.
- **Ruta rápida:** los mensajes de solo comando de los remitentes en la lista blanca se manejan inmediatamente (omitir cola + modelo).
- **Bloqueo de mención de grupo:** los mensajes de solo comando de los remitentes en la lista blanca omiten los requisitos de mención.
- **Accesos directos en línea (solo remitentes en lista blanca):** ciertos comandos también funcionan cuando están incrustados en un mensaje normal y se eliminan antes de que el modelo vea el texto restante.
  - Ejemplo: `hey /status` activa una respuesta de estado y el texto restante continúa a través del flujo normal.
- Actualmente: `/help`, `/commands`, `/status`, `/whoami` (`/id`).
- Los mensajes de solo comando no autorizados se ignoran silenciosamente y los tokens `/...` en línea se tratan como texto sin formato.
- **Comandos de habilidad (Skill commands):** las habilidades `user-invocable` se exponen como comandos de barra. Los nombres se sanean a `a-z0-9_` (máx. 32 caracteres); las colisiones obtienen sufijos numéricos (ej. `_2`).
  - `/skill <name> [input]` ejecuta una habilidad por nombre (útil cuando los límites de comandos nativos impiden comandos por habilidad).
  - De forma predeterminada, los comandos de habilidad se reenvían al modelo como una solicitud normal.
  - Las habilidades pueden declarar opcionalmente `command-dispatch: tool` para enrutar el comando directamente a una herramienta (determinista, sin modelo).
  - Ejemplo: `/prose` (complemento OpenProse) — véase [OpenProse](/en/prose).
- **Argumentos de comandos nativos:** Discord usa autocompletado para opciones dinámicas (y menús de botones cuando omites argumentos obligatorios). Telegram y Slack muestran un menú de botones cuando un comando admite elecciones y omites el argumento.

## `/tools`

`/tools` responde una pregunta de tiempo de ejecución, no una pregunta de configuración: **qué puede usar este agente ahora mismo en esta conversación**.

- El `/tools` predeterminado es compacto y está optimizado para un escaneo rápido.
- `/tools verbose` añade descripciones breves.
- Las superficies de comandos nativos que admiten argumentos exponen el mismo interruptor de modo que `compact|verbose`.
- Los resultados tienen ámbito de sesión, por lo que cambiar el agente, el canal, el hilo, la autorización del remitente o el modelo puede cambiar la salida.
- `/tools` incluye herramientas que son realmente accesibles en tiempo de ejecución, incluyendo herramientas principales, herramientas de complementos conectados y herramientas propiedad del canal.

Para la edición de perfil y anulaciones, use el panel Herramientas de la UI de Control o las superficies de configuración/catálogo en lugar de tratar `/tools` como un catálogo estático.

## Superficies de uso (qué se muestra dónde)

- **Uso/cuota del proveedor** (ejemplo: “Claude 80% restante”) aparece en `/status` para el proveedor del modelo actual cuando el seguimiento de uso está habilitado. OpenClaw normaliza las ventanas del proveedor a `% left`; para MiniMax, los campos de porcentaje solo restantes se invierten antes de mostrarse, y las respuestas `model_remains` prefieren la entrada del modelo de chat más una etiqueta de plan etiquetada con el modelo.
- **Líneas de token/caché** en `/status` pueden volver a la última entrada de uso de la transcripción cuando la instantánea de la sesión en vivo es dispersa. Los valores en vivo distintos de cero existentes aún tienen prioridad, y el retorno a la transcripción también puede recuperar la etiqueta del modelo de tiempo de ejecución activo más un total orientado al prompt mayor cuando los totales almacenados faltan o son menores.
- **Tokens/costo por respuesta** está controlado por `/usage off|tokens|full` (agregado a las respuestas normales).
- `/model status` trata sobre **modelos/autorización/puntos finales**, no sobre el uso.

## Selección de modelo (`/model`)

`/model` se implementa como una directiva.

Ejemplos:

```
/model
/model list
/model 3
/model openai/gpt-5.4
/model opus@anthropic:default
/model status
```

Notas:

- `/model` y `/model list` muestran un selector numérico compacto (familia de modelo + proveedores disponibles).
- En Discord, `/model` y `/models` abren un selector interactivo con menús desplegables de proveedor y modelo más un paso de Envío.
- `/model <#>` selecciona de ese selector (y prefiere el proveedor actual cuando es posible).
- `/model status` muestra la vista detallada, incluyendo el punto final del proveedor configurado (`baseUrl`) y el modo de API (`api`) cuando están disponibles.

## Anulaciones de depuración

`/debug` te permite establecer anulaciones de configuración **solo en tiempo de ejecución** (memoria, no disco). Solo para propietarios. Deshabilitado de forma predeterminada; habilite con `commands.debug: true`.

Ejemplos:

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

Notas:

- Las anulaciones se aplican inmediatamente a las nuevas lecturas de configuración, pero **no** se escriben en `openclaw.json`.
- Use `/debug reset` para borrar todas las anulaciones y volver a la configuración en disco.

## Actualizaciones de configuración

`/config` escribe en su configuración en disco (`openclaw.json`). Solo para propietarios. Deshabilitado de forma predeterminada; habilite con `commands.config: true`.

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

`/mcp` escribe definiciones de servidores MCP administradas por OpenClaw bajo `mcp.servers`. Solo para propietarios. Deshabilitado de forma predeterminada; habilite con `commands.mcp: true`.

Ejemplos:

```text
/mcp show
/mcp show context7
/mcp set context7={"command":"uvx","args":["context7-mcp"]}
/mcp unset context7
```

Notas:

- `/mcp` almacena la configuración en la configuración de OpenClaw, no en la configuración del proyecto propiedad de Pi.
- Los adaptadores en tiempo de ejecución deciden qué transportes son realmente ejecutables.

## Actualizaciones de complementos

`/plugins` permite a los operadores inspeccionar los complementos descubiertos y alternar su habilitación en la configuración. Los flujos de solo lectura pueden usar `/plugin` como alias. Deshabilitado de forma predeterminada; habilite con `commands.plugins: true`.

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
- `/plugins enable|disable` actualiza solo la configuración del complemento; no instala ni desinstala complementos.
- Después de los cambios de habilitar/deshabilitar, reinicie la puerta de enlace para aplicarlos.

## Notas de superficie

- Los **comandos de texto** se ejecutan en la sesión de chat normal (los MD comparten `main`, los grupos tienen su propia sesión).
- Los **comandos nativos** usan sesiones aisladas:
  - Discord: `agent:<agentId>:discord:slash:<userId>`
  - Slack: `agent:<agentId>:slack:slash:<userId>` (prefijo configurable vía `channels.slack.slashCommand.sessionPrefix`)
  - Telegram: `telegram:slash:<userId>` (apunta a la sesión de chat vía `CommandTargetSessionKey`)
- **`/stop`** apunta a la sesión de chat activa para que pueda abortar la ejecución actual.
- **Slack:** `channels.slack.slashCommand` todavía se admite para un solo comando de estilo `/openclaw`. Si habilitas `commands.native`, debes crear un comando de barra de Slack por cada comando integrado (mismos nombres que `/help`). Los menús de argumentos de comando para Slack se entregan como botones efímeros de Block Kit.
  - Excepción nativa de Slack: registra `/agentstatus` (no `/status`) porque Slack reserva `/status`. El texto `/status` todavía funciona en los mensajes de Slack.

## Preguntas laterales BTW

`/btw` es una **pregunta lateral** rápida sobre la sesión actual.

A diferencia del chat normal:

- usa la sesión actual como contexto de fondo,
- se ejecuta como una llamada única y separada **sin herramientas**,
- no cambia el contexto futuro de la sesión,
- no se escribe en el historial de transcripciones,
- se entrega como un resultado lateral en vivo en lugar de un mensaje normal del asistente.

Esto hace que `/btw` sea útil cuando deseas una aclaración temporal mientras la tarea
principal continúa.

Ejemplo:

```text
/btw what are we doing right now?
```

Consulta [BTW Side Questions](/en/tools/btw) para obtener el comportamiento completo y los detalles de la experiencia
usuario del cliente.
