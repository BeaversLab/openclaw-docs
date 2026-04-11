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
    restart: true,
    ownerAllowFrom: ["discord:123456789012345678"],
    ownerDisplay: "raw",
    ownerDisplaySecret: "${OWNER_ID_HASH_SECRET}",
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
- `commands.restart` (por defecto `true`) habilita `/restart` más acciones de herramientas de reinicio del gateway.
- `commands.ownerAllowFrom` (opcional) establece la lista de permitidos explícita del propietario para superficies de comandos/herramientas solo para propietarios. Esto es independiente de `commands.allowFrom`.
- `commands.ownerDisplay` controla cómo aparecen los ids de propietario en el prompt del sistema: `raw` o `hash`.
- `commands.ownerDisplaySecret` establece opcionalmente el secreto HMAC utilizado cuando `commands.ownerDisplay="hash"`.
- `commands.allowFrom` (opcional) establece una lista de permitidos por proveedor para la autorización de comandos. Cuando se configura, es la
  única fuente de autorización para comandos y directivas (las listas de permitidos/emparejamiento de canales y `commands.useAccessGroups`
  se ignoran). Use `"*"` para un valor predeterminado global; las claves específicas del proveedor lo anulan.
- `commands.useAccessGroups` (por defecto `true`) hace cumplir las listas de permitidos/políticas para los comandos cuando `commands.allowFrom` no está establecido.

## Lista de comandos

Fuente de verdad actual:

- los comandos integrados principales provienen de `src/auto-reply/commands-registry.shared.ts`
- los comandos de dock generados provienen de `src/auto-reply/commands-registry.data.ts`
- los comandos de complementos provienen de las llamadas `registerCommand()` del complemento
- la disponibilidad real en su gateway aún depende de las banderas de configuración, la superficie del canal y los complementos instalados/habilitados

### Comandos integrados principales

Comandos integrados disponibles hoy:

- `/new [model]` inicia una nueva sesión; `/reset` es el alias de restablecimiento.
- `/compact [instructions]` compacta el contexto de la sesión. Consulte [/concepts/compaction](/en/concepts/compaction).
- `/stop` aborta la ejecución actual.
- `/session idle <duration|off>` y `/session max-age <duration|off>` gestionan la caducidad del enlace de hilos.
- `/think <off|minimal|low|medium|high|xhigh>` establece el nivel de pensamiento. Alias: `/thinking`, `/t`.
- `/verbose on|off|full` alterna la salida detallada. Alias: `/v`.
- `/fast [status|on|off]` muestra o establece el modo rápido.
- `/reasoning [on|off|stream]` alterna la visibilidad del razonamiento. Alias: `/reason`.
- `/elevated [on|off|ask|full]` alterna el modo elevado. Alias: `/elev`.
- `/exec host=<auto|sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>` muestra o establece los valores predeterminados de exec.
- `/model [name|#|status]` muestra o establece el modelo.
- `/models [provider] [page] [limit=<n>|size=<n>|all]` enumera los proveedores o modelos de un proveedor.
- `/queue <mode>` gestiona el comportamiento de la cola (`steer`, `interrupt`, `followup`, `collect`, `steer-backlog`) más opciones como `debounce:2s cap:25 drop:summarize`.
- `/help` muestra el resumen de ayuda breve.
- `/commands` muestra el catálogo de comandos generados.
- `/tools [compact|verbose]` muestra lo que el agente actual puede usar ahora mismo.
- `/status` muestra el estado de tiempo de ejecución, incluido el uso/cuota del proveedor cuando está disponible.
- `/tasks` enumera las tareas en segundo plano activas/recientes de la sesión actual.
- `/context [list|detail|json]` explica cómo se ensambla el contexto.
- `/export-session [path]` exporta la sesión actual a HTML. Alias: `/export`.
- `/whoami` muestra su ID de remitente. Alias: `/id`.
- `/skill <name> [input]` ejecuta una habilidad por nombre.
- `/allowlist [list|add|remove] ...` gestiona las entradas de la lista de permitidos. Solo texto.
- `/approve <id> <decision>` resuelve las solicitudes de aprobación de exec.
- `/btw <question>` hace una pregunta lateral sin cambiar el contexto de la sesión futura. Consulte [/tools/btw](/en/tools/btw).
- `/subagents list|kill|log|info|send|steer|spawn` gestiona las ejecuciones de subagentes para la sesión actual.
- `/acp spawn|cancel|steer|close|sessions|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|help` gestiona las sesiones de ACP y las opciones de tiempo de ejecución.
- `/focus <target>` vincula el hilo actual de Discord o el tema/conversación de Telegram a un objetivo de sesión.
- `/unfocus` elimina el vínculo actual.
- `/agents` enumera los agentes vinculados al hilo para la sesión actual.
- `/kill <id|#|all>` aborta uno o todos los subagentes en ejecución.
- `/steer <id|#> <message>` envía dirección a un subagente en ejecución. Alias: `/tell`.
- `/config show|get|set|unset` lee o escribe `openclaw.json`. Solo para el propietario. Requiere `commands.config: true`.
- `/mcp show|get|set|unset` lee o escribe la configuración del servidor MCP gestionada por OpenClaw en `mcp.servers`. Solo para el propietario. Requiere `commands.mcp: true`.
- `/plugins list|inspect|show|get|install|enable|disable` inspecciona o muta el estado del complemento. `/plugin` es un alias. Solo para el propietario para escrituras. Requiere `commands.plugins: true`.
- `/debug show|set|unset|reset` gestiona las anulaciones de configuración solo de tiempo de ejecución. Solo para el propietario. Requiere `commands.debug: true`.
- `/usage off|tokens|full|cost` controla el pie de página de uso por respuesta o imprime un resumen de costos local.
- `/tts on|off|status|provider|limit|summary|audio|help` controla el TTS. Consulte [/tools/tts](/en/tools/tts).
- `/restart` reinicia OpenClaw cuando está habilitado. Predeterminado: habilitado; establezca `commands.restart: false` para desactivarlo.
- `/activation mention|always` establece el modo de activación de grupo.
- `/send on|off|inherit` establece la política de envío. Solo para el propietario.
- `/bash <command>` ejecuta un comando de shell del host. Solo texto. Alias: `! <command>`. Requiere `commands.bash: true` más listas de permitidos `tools.elevated`.
- `!poll [sessionId]` verifica un trabajo bash en segundo plano.
- `!stop [sessionId]` detiene un trabajo bash en segundo plano.

### Comandos de dock generados

Los comandos de dock se generan a partir de complementos de canal con soporte de comandos nativos. Conjunto incluido actual:

- `/dock-discord` (alias: `/dock_discord`)
- `/dock-mattermost` (alias: `/dock_mattermost`)
- `/dock-slack` (alias: `/dock_slack`)
- `/dock-telegram` (alias: `/dock_telegram`)

### Comandos de complementos incluidos

Los complementos incluidos pueden agregar más comandos de barra. Comandos incluidos actuales en este repositorio:

- `/dreaming [on|off|status|help]` activa o desactiva el sueño de la memoria. Consulte [Dreaming](/en/concepts/dreaming).
- `/pair [qr|status|pending|approve|cleanup|notify]` gestiona el flujo de emparejamiento/configuración del dispositivo. Consulte [Emparejamiento](/en/channels/pairing).
- `/phone status|arm <camera|screen|writes|all> [duration]|disarm` arma temporalmente los comandos de nodo de teléfono de alto riesgo.
- `/voice status|list [limit]|set <voiceId|name>` gestiona la configuración de voz de Talk. En Discord, el nombre del comando nativo es `/talkvoice`.
- `/card ...` envía preajustes de rich card de LINE. Consulte [LINE](/en/channels/line).
- Comandos solo para QQBot:
  - `/bot-ping`
  - `/bot-version`
  - `/bot-help`
  - `/bot-upgrade`
  - `/bot-logs`

### Comandos de habilidades dinámicas

Las habilidades invocables por el usuario también se exponen como comandos de barra:

- `/skill <name> [input]` siempre funciona como el punto de entrada genérico.
- las habilidades también pueden aparecer como comandos directos como `/prose` cuando la habilidad/complemento las registra.
- el registro nativo de comandos de habilidad está controlado por `commands.nativeSkills` y `channels.<provider>.commands.nativeSkills`.

Notas:

- Los comandos aceptan un `:` opcional entre el comando y los argumentos (por ejemplo, `/think: high`, `/send: on`, `/help:`).
- `/new <model>` acepta un alias de modelo, `provider/model`, o un nombre de proveedor (coincidencia aproximada); si no hay coincidencia, el texto se trata como el cuerpo del mensaje.
- Para un desglose completo del uso del proveedor, use `openclaw status --usage`.
- `/allowlist add|remove` requiere `commands.config=true` y respeta el canal `configWrites`.
- En canales multicuenta, `/allowlist --account <id>` y `/config set channels.<provider>.accounts.<id>...` orientados a la configuración también respetan `configWrites` de la cuenta objetivo.
- `/usage` controla el pie de página de uso por respuesta; `/usage cost` imprime un resumen de costos local desde los registros de sesión de OpenClaw.
- `/restart` está habilitado de forma predeterminada; configure `commands.restart: false` para desactivarlo.
- `/plugins install <spec>` acepta las mismas especificaciones de complemento que `openclaw plugins install`: ruta local/archivo, paquete npm o `clawhub:<pkg>`.
- `/plugins enable|disable` actualiza la configuración del complemento y puede solicitar un reinicio.
- Comando nativo solo de Discord: `/vc join|leave|status` controla los canales de voz (requiere `channels.discord.voice` y comandos nativos; no disponible como texto).
- Los comandos de vinculación de hilos de Discord (`/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age`) requieren que los enlaces de hilos efectivos estén habilitados (`session.threadBindings.enabled` y/o `channels.discord.threadBindings.enabled`).
- Referencia de comandos ACP y comportamiento en tiempo de ejecución: [ACP Agents](/en/tools/acp-agents).
- `/verbose` está destinado a la depuración y visibilidad adicional; manténgalo **desactivado** en uso normal.
- `/fast on|off` conserva una anulación de sesión. Use la opción `inherit` de la interfaz de usuario de Sesiones para borrarla y volver a los valores predeterminados de configuración.
- `/fast` es específico del proveedor: OpenAI/OpenAI Codex lo asignan a `service_tier=priority` en los puntos finales de Respuestas nativos, mientras que las solicitudes públicas directas de Anthropic, incluido el tráfico autenticado mediante OAuth enviado a `api.anthropic.com`, lo asignan a `service_tier=auto` o `standard_only`. Consulte [OpenAI](/en/providers/openai) y [Anthropic](/en/providers/anthropic).
- Los resúmenes de fallos de herramientas aún se muestran cuando es relevante, pero el texto detallado de fallos solo se incluye cuando `/verbose` es `on` o `full`.
- `/reasoning` (y `/verbose`) son riesgosos en entornos grupales: pueden revelar razonamientos internos o resultados de herramientas que no tenía la intención de exponer. Es preferible dejarlos desactivados, especialmente en chats grupales.
- `/model` conserva el nuevo modelo de sesión inmediatamente.
- Si el agente está inactivo, la siguiente ejecución lo usa de inmediato.
- Si una ejecución ya está activa, OpenClaw marca un cambio en vivo como pendiente y solo se reinicia en el nuevo modelo en un punto de reintento limpio.
- Si la actividad de la herramienta o la salida de la respuesta ya ha comenzado, el cambio pendiente puede permanecer en cola hasta una oportunidad de reintento posterior o el siguiente turno del usuario.
- **Ruta rápida:** los mensajes de solo comando de remitentes en la lista permitida se manejan inmediatamente (omitir cola + modelo).
- **Bloqueo de mención de grupo:** los mensajes de solo comando de remitentes en la lista permitida omiten los requisitos de mención.
- **Accesos directos en línea (solo remitentes en la lista permitida):** ciertos comandos también funcionan cuando se incrustan en un mensaje normal y se eliminan antes de que el modelo vea el texto restante.
  - Ejemplo: `hey /status` activa una respuesta de estado y el texto restante continúa a través del flujo normal.
- Actualmente: `/help`, `/commands`, `/status`, `/whoami` (`/id`).
- Los mensajes de solo comando no autorizados se ignoran silenciosamente y los tokens en línea `/...` se tratan como texto sin formato.
- **Comandos de habilidad:** las habilidades `user-invocable` se exponen como comandos de barra. Los nombres se sanean a `a-z0-9_` (máx. 32 caracteres); las colisiones obtienen sufijos numéricos (p. ej., `_2`).
  - `/skill <name> [input]` ejecuta una habilidad por nombre (útil cuando los límites de comandos nativos impiden los comandos por habilidad).
  - De forma predeterminada, los comandos de habilidad se reenvían al modelo como una solicitud normal.
  - Las habilidades pueden declarar opcionalmente `command-dispatch: tool` para enrutar el comando directamente a una herramienta (determinista, sin modelo).
  - Ejemplo: `/prose` (complemento OpenProse) — consulte [OpenProse](/en/prose).
- **Argumentos de comandos nativos:** Discord usa autocompletar para opciones dinámicas (y menús de botones cuando omite argumentos obligatorios). Telegram y Slack muestran un menú de botones cuando un comando admite elecciones y omite el argumento.

## `/tools`

`/tools` responde a una pregunta de tiempo de ejecución, no a una pregunta de configuración: **lo que este agente puede usar ahora mismo en esta conversación**.

- El `/tools` predeterminado es compacto y está optimizado para un escaneo rápido.
- `/tools verbose` añade descripciones breves.
- Las superficies de comandos nativos que soportan argumentos exponen el mismo cambio de modo que `compact|verbose`.
- Los resultados están limitados a la sesión, por lo que cambiar el agente, el canal, el hilo, la autorización del remitente o el modelo puede cambiar la salida.
- `/tools` incluye herramientas que son realmente accesibles en tiempo de ejecución, incluyendo herramientas principales, herramientas de complementos conectadas y herramientas propiedad del canal.

Para la edición de perfiles y anulaciones, utilice el panel de Herramientas de la interfaz de usuario de Control o las superficies de configuración/catálogo en lugar de tratar `/tools` como un catálogo estático.

## Superficies de uso (qué se muestra dónde)

- **Uso/cuota del proveedor** (ejemplo: “Claude 80% restante”) aparece en `/status` para el proveedor del modelo actual cuando el seguimiento de uso está habilitado. OpenClaw normaliza las ventanas del proveedor a `% left`; para MiniMax, los campos de porcentaje de solo restante se invierten antes de mostrarse, y las respuestas de `model_remains` prefieren la entrada del modelo de chat más una etiqueta de plan etiquetada con el modelo.
- Las **líneas de token/caché** en `/status` pueden volver a la última entrada de uso de la transcripción cuando la instantánea de la sesión en vivo es escasa. Los valores en vivo existentes distintos de cero todavía tienen prioridad, y la reserva de la transcripción también puede recuperar la etiqueta del modelo de tiempo de ejecución activo más un total orientado al mensaje más grande cuando los totales almacenados faltan o son menores.
- Los **tokens/costo por respuesta** se controlan mediante `/usage off|tokens|full` (añadido a las respuestas normales).
- `/model status` se trata de **modelos/autorización/puntos finales**, no del uso.

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
- `/model status` muestra la vista detallada, incluido el punto de conexión del proveedor configurado (`baseUrl`) y el modo de API (`api`) cuando estén disponibles.

## Depuración de anulaciones

`/debug` le permite establecer anulaciones de configuración **solo en tiempo de ejecución** (memoria, no disco). Solo para propietarios. Deshabilitado por defecto; habilítelo con `commands.debug: true`.

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

`/config` escribe en su configuración en disco (`openclaw.json`). Solo para propietarios. Deshabilitado por defecto; habilítelo con `commands.config: true`.

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

## Actualizaciones de MCP

`/mcp` escribe definiciones de servidores MCP gestionadas por OpenClaw bajo `mcp.servers`. Solo para propietarios. Deshabilitado por defecto; habilítelo con `commands.mcp: true`.

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

- `/plugins list` y `/plugins show` usan el descubrimiento real de complementos contra el espacio de trabajo actual más la configuración en disco.
- `/plugins enable|disable` solo actualiza la configuración del complemento; no instala ni desinstala complementos.
- Después de los cambios de habilitar/deshabilitar, reinicie la puerta de enlace para aplicarlos.

## Notas de superficie

- Los **comandos de texto** se ejecutan en la sesión de chat normal (los MD comparten `main`, los grupos tienen su propia sesión).
- Los **comandos nativos** usan sesiones aisladas:
  - Discord: `agent:<agentId>:discord:slash:<userId>`
  - Slack: `agent:<agentId>:slack:slash:<userId>` (prefijo configurable a través de `channels.slack.slashCommand.sessionPrefix`)
  - Telegram: `telegram:slash:<userId>` (apunta a la sesión de chat a través de `CommandTargetSessionKey`)
- **`/stop`** apunta a la sesión de chat activa para que pueda abortar la ejecución actual.
- **Slack:** `channels.slack.slashCommand` todavía es compatible para un solo comando de estilo `/openclaw`. Si habilita `commands.native`, debe crear un comando de barra de Slack por cada comando integrado (mismos nombres que `/help`). Los menús de argumentos de comandos para Slack se entregan como botones efímeros de Block Kit.
  - Excepción nativa de Slack: registre `/agentstatus` (no `/status`) porque Slack reserva `/status`. El texto `/status` todavía funciona en los mensajes de Slack.

## Preguntas laterales BTW

`/btw` es una **pregunta lateral** rápida sobre la sesión actual.

A diferencia del chat normal:

- usa la sesión actual como contexto de fondo,
- se ejecuta como una llamada única separada **sin herramientas**,
- no cambia el contexto futuro de la sesión,
- no se escribe en el historial de transcripciones,
- se entrega como un resultado lateral en vivo en lugar de un mensaje normal del asistente.

Eso hace que `/btw` sea útil cuando desea una aclaración temporal mientras la tarea principal continúa.

Ejemplo:

```text
/btw what are we doing right now?
```

Consulte [BTW Side Questions](/en/tools/btw) para obtener el comportamiento completo y los detalles de la experiencia del usuario del cliente.
