---
summary: "Comandos de barra: texto frente a nativo, configuración y comandos compatibles"
read_when:
  - Using or configuring chat commands
  - Debugging command routing or permissions
title: "Comandos de barra"
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
    lista de permitidos utilizada; de lo contrario, la autorización proviene de las listas de permitidos/emparejamiento del canal más `commands.useAccessGroups`.
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

- `commands.text` (predeterminado `true`) habilita el análisis de `/...` en los mensajes de chat.
  - En las superficies sin comandos nativos (WhatsApp/WebChat/Signal/iMessage/Google Chat/MS Teams), los comandos de texto siguen funcionando incluso si configuras esto en `false`.
- `commands.native` (por defecto `"auto"`) registra comandos nativos.
  - Automático: activado para Discord/Telegram; desactivado para Slack (hasta que agregues comandos de barra); ignorado para proveedores sin soporte nativo.
  - Establece `channels.discord.commands.native`, `channels.telegram.commands.native` o `channels.slack.commands.native` para anular por proveedor (bool o `"auto"`).
  - `false` borra los comandos registrados previamente en Discord/Telegram al inicio. Los comandos de Slack se gestionan en la aplicación de Slack y no se eliminan automáticamente.
- `commands.nativeSkills` (por defecto `"auto"`) registra comandos de **habilidad** de forma nativa cuando es compatible.
  - Automático: activado para Discord/Telegram; desactivado para Slack (Slack requiere crear un comando de barra por habilidad).
  - Establece `channels.discord.commands.nativeSkills`, `channels.telegram.commands.nativeSkills` o `channels.slack.commands.nativeSkills` para anular por proveedor (bool o `"auto"`).
- `commands.bash` (por defecto `false`) habilita `! <cmd>` para ejecutar comandos de shell del host (`/bash <cmd>` es un alias; requiere listas de permitidos `tools.elevated`).
- `commands.bashForegroundMs` (por defecto `2000`) controla cuánto tiempo espera bash antes de cambiar al modo en segundo plano (`0` pasa a segundo plano inmediatamente).
- `commands.config` (por defecto `false`) habilita `/config` (lee/escribe `openclaw.json`).
- `commands.debug` (por defecto `false`) habilita `/debug` (anulaciones solo en tiempo de ejecución).
- `commands.allowFrom` (opcional) establece una lista de permitidos por proveedor para la autorización de comandos. Cuando se configura, es la
  única fuente de autorización para comandos y directivas (listas de permitidos de canales/emparejamiento y `commands.useAccessGroups`
  se ignoran). Usa `"*"` para un valor predeterminado global; las claves específicas del proveedor lo anulan.
- `commands.useAccessGroups` (predeterminado `true`) aplica listas de permitidos/políticas para los comandos cuando `commands.allowFrom` no está establecido.

## Lista de comandos

Texto + nativo (cuando está habilitado):

- `/help`
- `/commands`
- `/skill <name> [input]` (ejecutar una habilidad por nombre)
- `/status` (mostrar el estado actual; incluye el uso/cuota del proveedor para el proveedor del modelo actual cuando está disponible)
- `/allowlist` (listar/añadir/eliminar entradas de la lista de permitidos)
- `/approve <id> allow-once|allow-always|deny` (resolver avisos de aprobación de ejecución)
- `/context [list|detail|json]` (explica el "contexto"; `detail` muestra el tamaño del prompt del sistema + por herramienta + por habilidad + por archivo)
- `/btw <question>` (hacer una pregunta lateral efímera sobre la sesión actual sin cambiar el contexto de la sesión futura; consulte [/tools/btw](/es/tools/btw))
- `/export-session [path]` (alias: `/export`) (exportar la sesión actual a HTML con el prompt del sistema completo)
- `/whoami` (muestra su identificador de remitente; alias: `/id`)
- `/session idle <duration|off>` (gestionar la auto-desactivación por inactividad para los enlaces de hilos enfocados)
- `/session max-age <duration|off>` (gestionar la auto-desactivación por antigüedad máxima (hard max-age) para los enlaces de hilos enfocados)
- `/subagents list|kill|log|info|send|steer|spawn` (inspeccionar, controlar o iniciar ejecuciones de sub-agentes para la sesión actual)
- `/acp spawn|cancel|steer|close|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|sessions` (inspeccionar y controlar sesiones de tiempo de ejecución de ACP)
- `/agents` (listar los agentes vinculados al hilo para esta sesión)
- `/focus <target>` (Discord: vincular este hilo, o un nuevo hilo, a un objetivo de sesión/subagente)
- `/unfocus` (Discord: eliminar el enlace del hilo actual)
- `/kill <id|#|all>` (abortar inmediatamente uno o todos los sub-agentes en ejecución para esta sesión; sin mensaje de confirmación)
- `/steer <id|#> <message>` (guiar inmediatamente un sub-agente en ejecución: durante la ejecución cuando sea posible; de lo contrario, abortar el trabajo actual y reiniciar con el mensaje de guía)
- `/tell <id|#> <message>` (alias para `/steer`)
- `/config show|get|set|unset` (persiste la configuración en disco, solo propietario; requiere `commands.config: true`)
- `/debug show|set|unset|reset` (anulaciones en tiempo de ejecución, solo propietario; requiere `commands.debug: true`)
- `/usage off|tokens|full|cost` (pie de página de uso por respuesta o resumen de costo local)
- `/tts off|always|inbound|tagged|status|provider|limit|summary|audio` (controlar TTS; consulte [/tts](/es/tts))
  - Discord: el comando nativo es `/voice` (Discord reserva `/tts`); el texto `/tts` todavía funciona.
- `/stop`
- `/restart`
- `/dock-telegram` (alias: `/dock_telegram`) (cambiar las respuestas a Telegram)
- `/dock-discord` (alias: `/dock_discord`) (cambiar las respuestas a Discord)
- `/dock-slack` (alias: `/dock_slack`) (cambiar las respuestas a Slack)
- `/activation mention|always` (solo grupos)
- `/send on|off|inherit` (solo propietario)
- `/reset` o `/new [model]` (sugerencia de modelo opcional; el resto se pasa a través)
- `/think <off|minimal|low|medium|high|xhigh>` (opciones dinámicas por modelo/proveedor; alias: `/thinking`, `/t`)
- `/fast status|on|off` (omitir el argumento muestra el estado actual efectivo del modo rápido)
- `/verbose on|full|off` (alias: `/v`)
- `/reasoning on|off|stream` (alias: `/reason`; cuando está activado, envía un mensaje separado con el prefijo `Reasoning:`; `stream` = solo borrador de Telegram)
- `/elevated on|off|ask|full` (alias: `/elev`; `full` omite las aprobaciones de ejecución)
- `/exec host=<sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>` (envíe `/exec` para mostrar el actual)
- `/model <name>` (alias: `/models`; o `/<alias>` desde `agents.defaults.models.*.alias`)
- `/queue <mode>` (más opciones como `debounce:2s cap:25 drop:summarize`; envía `/queue` para ver la configuración actual)
- `/bash <command>` (solo host; alias para `! <command>`; requiere listas de permitidos `commands.bash: true` + `tools.elevated`)

Solo texto:

- `/compact [instructions]` (ver [/concepts/compaction](/es/concepts/compaction))
- `! <command>` (solo host; uno a la vez; usa `!poll` + `!stop` para trabajos de larga duración)
- `!poll` (verificar salida / estado; acepta `sessionId` opcional; `/bash poll` también funciona)
- `!stop` (detener el trabajo bash en ejecución; acepta `sessionId` opcional; `/bash stop` también funciona)

Notas:

- Los comandos aceptan un `:` opcional entre el comando y los argumentos (por ejemplo, `/think: high`, `/send: on`, `/help:`).
- `/new <model>` acepta un alias de modelo, `provider/model`, o un nombre de proveedor (coincidencia aproximada); si no hay coincidencia, el texto se trata como el cuerpo del mensaje.
- Para un desglose completo del uso del proveedor, usa `openclaw status --usage`.
- `/allowlist add|remove` requiere `commands.config=true` y respeta el `configWrites` del canal.
- En canales multicuenta, `/allowlist --account <id>` y `/config set channels.<provider>.accounts.<id>...` dirigidos a la configuración también respetan el `configWrites` de la cuenta de destino.
- `/usage` controla el pie de página de uso por respuesta; `/usage cost` imprime un resumen de costos local desde los registros de sesión de OpenClaw.
- `/restart` está habilitado por defecto; establece `commands.restart: false` para deshabilitarlo.
- Comando nativo solo de Discord: `/vc join|leave|status` controla los canales de voz (requiere `channels.discord.voice` y comandos nativos; no disponible como texto).
- Los comandos de vinculación de hilos de Discord (`/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age`) requieren que las vinculaciones de hilos efectivas estén habilitadas (`session.threadBindings.enabled` y/o `channels.discord.threadBindings.enabled`).
- Referencia de comandos y comportamiento de ejecución de ACP: [Agentes ACP](/es/tools/acp-agents).
- `/verbose` está pensado para la depuración y mayor visibilidad; mantenlo **desactivado** en uso normal.
- `/fast on|off` persiste una anulación de sesión. Usa la opción `inherit` de la interfaz de usuario de Sesiones para borrarla y volver a los valores predeterminados de configuración.
- Los resúmenes de fallos de herramientas todavía se muestran cuando es relevante, pero el texto detallado de fallos solo se incluye cuando `/verbose` es `on` o `full`.
- `/reasoning` (y `/verbose`) son arriesgados en entornos grupales: pueden revelar razonamiento interno o salida de herramientas que no tenías la intención de exponer. Es preferible dejarlos desactivados, especialmente en chats grupales.
- **Ruta rápida:** los mensajes de solo comando de remitentes en la lista de permitidos se manejan inmediatamente (omitir cola + modelo).
- **Bloqueo de mención de grupo:** los mensajes de solo comando de remitentes en la lista de permitidos omiten los requisitos de mención.
- **Accesos directos en línea (solo remitentes en la lista de permitidos):** ciertos comandos también funcionan cuando se incrustan en un mensaje normal y se eliminan antes de que el modelo vea el texto restante.
  - Ejemplo: `hey /status` activa una respuesta de estado y el texto restante continúa a través del flujo normal.
- Actualmente: `/help`, `/commands`, `/status`, `/whoami` (`/id`).
- Los mensajes de solo comando no autorizados se ignoran silenciosamente y los tokens `/...` en línea se tratan como texto plano.
- **Comandos de habilidades (skills):** las habilidades `user-invocable` se exponen como comandos de barra. Los nombres se sanean a `a-z0-9_` (máx. 32 caracteres); las colisiones obtienen sufijos numéricos (ej. `_2`).
  - `/skill <name> [input]` ejecuta una habilidad por nombre (útil cuando los límites de comandos nativos impiden comandos por habilidad).
  - De manera predeterminada, los comandos de habilidad se reenvían al modelo como una solicitud normal.
  - Las habilidades pueden declarar opcionalmente `command-dispatch: tool` para enrutar el comando directamente a una herramienta (determinista, sin modelo).
  - Ejemplo: `/prose` (complemento OpenProse) — consulte [OpenProse](/es/prose).
- **Argumentos de comandos nativos:** Discord usa autocompletar para opciones dinámicas (y menús de botones cuando omite argumentos obligatorios). Telegram y Slack muestran un menú de botones cuando un comando admite elecciones y omite el argumento.

## Superficies de uso (qué se muestra dónde)

- **Uso/cuota del proveedor** (ejemplo: "Claude 80% restante") aparece en `/status` para el proveedor de modelos actual cuando el seguimiento de uso está habilitado.
- **Tokens/costo por respuesta** está controlado por `/usage off|tokens|full` (agregado a las respuestas normales).
- `/model status` trata sobre **modelos/autenticación/puntos finales**, no sobre el uso.

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

- `/model` y `/model list` muestran un selector numerado compacto (familia de modelo + proveedores disponibles).
- En Discord, `/model` y `/models` abren un selector interactivo con menús desplegables de proveedor y modelo, además de un paso de envío.
- `/model <#>` selecciona de ese selector (y prefiere el proveedor actual cuando es posible).
- `/model status` muestra la vista detallada, incluido el punto final del proveedor configurado (`baseUrl`) y el modo de API (`api`) cuando están disponibles.

## Invalidaciones de depuración

`/debug` le permite establecer invalidaciones de configuración **solo en tiempo de ejecución** (memoria, no disco). Solo para propietarios. Deshabilitado de manera predeterminada; habilítelo con `commands.debug: true`.

Ejemplos:

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

Notas:

- Las invalidaciones se aplican inmediatamente a nuevas lecturas de configuración, pero **no** escriben en `openclaw.json`.
- Use `/debug reset` para borrar todas las invalidaciones y volver a la configuración en disco.

## Actualizaciones de configuración

`/config` escribe en tu configuración en disco (`openclaw.json`). Solo para propietarios. Desactivado por defecto; activar con `commands.config: true`.

Ejemplos:

```
/config show
/config show messages.responsePrefix
/config get messages.responsePrefix
/config set messages.responsePrefix="[openclaw]"
/config unset messages.responsePrefix
```

Notas:

- La configuración se valida antes de escribirse; los cambios no válidos se rechazan.
- Las actualizaciones de `/config` persisten tras los reinicios.

## Notas de superficie

- Los **comandos de texto** se ejecutan en la sesión de chat normal (los MDs comparten `main`, los grupos tienen su propia sesión).
- Los **comandos nativos** usan sesiones aisladas:
  - Discord: `agent:<agentId>:discord:slash:<userId>`
  - Slack: `agent:<agentId>:slack:slash:<userId>` (prefijo configurable mediante `channels.slack.slashCommand.sessionPrefix`)
  - Telegram: `telegram:slash:<userId>` (apunta a la sesión de chat mediante `CommandTargetSessionKey`)
- **`/stop`** apunta a la sesión de chat activa para que pueda abortar la ejecución actual.
- **Slack:** `channels.slack.slashCommand` todavía se admite para un solo comando de estilo `/openclaw`. Si activas `commands.native`, debes crear un comando de barra de Slack por cada comando integrado (mismos nombres que `/help`). Los menús de argumentos de comando para Slack se entregan como botones efímeros de Block Kit.
  - Excepción nativa de Slack: registra `/agentstatus` (no `/status`) porque Slack reserva `/status`. El texto `/status` todavía funciona en los mensajes de Slack.

## Preguntas laterales BTW

`/btw` es una **pregunta lateral** rápida sobre la sesión actual.

A diferencia del chat normal:

- usa la sesión actual como contexto de fondo,
- se ejecuta como una llamada única separada **sin herramientas**,
- no cambia el contexto futuro de la sesión,
- no se escribe en el historial de transcripciones,
- se entrega como un resultado lateral en vivo en lugar de un mensaje normal del asistente.

Eso hace que `/btw` sea útil cuando quieres una aclaración temporal mientras la tarea
principal continúa.

Ejemplo:

```text
/btw what are we doing right now?
```

Consulta [BTW Side Questions](/es/tools/btw) para obtener el comportamiento completo y los detalles de la
experiencia de usuario del cliente.

import es from "/components/footer/es.mdx";

<es />
