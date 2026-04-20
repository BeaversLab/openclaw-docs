---
summary: "Slash commands: texto frente a nativo, configuración y comandos compatibles"
read_when:
  - Using or configuring chat commands
  - Debugging command routing or permissions
title: "Slash Commands"
---

# Comandos de barra

Los comandos son manejados por el Gateway. La mayoría de los comandos deben enviarse como un mensaje **independiente** que comience con `/`.
El comando de chat bash solo para host usa `! <cmd>` (con `/bash <cmd>` como alias).

Existen dos sistemas relacionados:

- **Comandos**: mensajes `/...` independientes.
- **Directivas**: `/think`, `/fast`, `/verbose`, `/trace`, `/reasoning`, `/elevated`, `/exec`, `/model`, `/queue`.
  - Las directivas se eliminan del mensaje antes de que el modelo lo vea.
  - En los mensajes de chat normales (no solo directivas), se tratan como "sugerencias en línea" y **no** mantienen la configuración de la sesión.
  - En los mensajes de solo directivas (el mensaje contiene solo directivas), se mantienen en la sesión y responden con una confirmación.
  - Las directivas solo se aplican a **remitentes autorizados**. Si se establece `commands.allowFrom`, es la única
    lista de permitidos utilizada; de lo contrario, la autorización proviene de las listas de permitidos/emparejamiento del canal más `commands.useAccessGroups`.
    Los remitentes no autorizados ven las directivas tratadas como texto sin formato.

También hay algunos **atajos en línea** (solo para remitentes autorizados/en lista de permitidos): `/help`, `/commands`, `/status`, `/whoami` (`/id`).
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

- `commands.text` (por defecto `true`) habilita el análisis de `/...` en los mensajes de chat.
  - En superficies sin comandos nativos (WhatsApp/WebChat/Signal/iMessage/Google Chat/Microsoft Teams), los comandos de texto siguen funcionando incluso si establece esto en `false`.
- `commands.native` (por defecto `"auto"`) registra comandos nativos.
  - Automático: activado para Discord/Telegram; desactivado para Slack (hasta que agregues comandos de barra); ignorado para proveedores sin soporte nativo.
  - Establezca `channels.discord.commands.native`, `channels.telegram.commands.native` o `channels.slack.commands.native` para anular por proveedor (bool o `"auto"`).
  - `false` borra los comandos registrados previamente en Discord/Telegram al inicio. Los comandos de Slack se gestionan en la aplicación de Slack y no se eliminan automáticamente.
- `commands.nativeSkills` (por defecto `"auto"`) registra comandos de **habilidades** de forma nativa cuando se admite.
  - Automático: activado para Discord/Telegram; desactivado para Slack (Slack requiere crear un comando de barra por habilidad).
  - Establezca `channels.discord.commands.nativeSkills`, `channels.telegram.commands.nativeSkills` o `channels.slack.commands.nativeSkills` para anular por proveedor (bool o `"auto"`).
- `commands.bash` (por defecto `false`) permite que `! <cmd>` ejecute comandos de shell del host (`/bash <cmd>` es un alias; requiere listas de permisos `tools.elevated`).
- `commands.bashForegroundMs` (por defecto `2000`) controla cuánto tiempo espera bash antes de cambiar al modo en segundo plano (`0` se pone en segundo plano inmediatamente).
- `commands.config` (por defecto `false`) habilita `/config` (lee/escribe `openclaw.json`).
- `commands.mcp` (por defecto `false`) habilita `/mcp` (lee/escribe la configuración MCP administrada por OpenClaw bajo `mcp.servers`).
- `commands.plugins` (por defecto `false`) habilita `/plugins` (descubrimiento/estado de complementos más controles de instalación + habilitar/deshabilitar).
- `commands.debug` (por defecto `false`) habilita `/debug` (anulaciones solo en tiempo de ejecución).
- `commands.restart` (por defecto `true`) habilita `/restart` más acciones de herramientas de reinicio de la puerta de enlace.
- `commands.ownerAllowFrom` (opcional) establece la lista de permisos explícita del propietario para superficies de comandos/herramientas solo para propietarios. Esto está separado de `commands.allowFrom`.
- `commands.ownerDisplay` controla cómo aparecen los ID de propietario en el mensaje del sistema: `raw` o `hash`.
- `commands.ownerDisplaySecret` establece opcionalmente el secreto HMAC utilizado cuando `commands.ownerDisplay="hash"`.
- `commands.allowFrom` (opcional) establece una lista de permitidos por proveedor para la autorización de comandos. Cuando se configura, es la única fuente de autorización para comandos y directivas (las listas de permitidas/emparejamiento de canales y `commands.useAccessGroups` se ignoran). Use `"*"` para un valor global predeterminado; las claves específicas del proveedor lo anulan.
- `commands.useAccessGroups` (predeterminado `true`) hace cumplir las listas de permitidos/políticas para los comandos cuando `commands.allowFrom` no está establecido.

## Lista de comandos

Fuente de verdad actual:

- los integrados principales provienen de `src/auto-reply/commands-registry.shared.ts`
- los comandos generados de dock provienen de `src/auto-reply/commands-registry.data.ts`
- los comandos de complementos provienen de llamadas a `registerCommand()` del complemento
- la disponibilidad real en su gateway aún depende de las banderas de configuración, la superficie del canal y los complementos instalados/habilitados

### Comandos integrados principales

Comandos integrados disponibles hoy:

- `/new [model]` inicia una nueva sesión; `/reset` es el alias de restablecimiento.
- `/compact [instructions]` compacta el contexto de la sesión. Consulte [/concepts/compaction](/es/concepts/compaction).
- `/stop` aborta la ejecución actual.
- `/session idle <duration|off>` y `/session max-age <duration|off>` gestionan la expiración del enlace de hilos.
- `/think <off|minimal|low|medium|high|xhigh>` establece el nivel de pensamiento. Alias: `/thinking`, `/t`.
- `/verbose on|off|full` alterna la salida detallada. Alias: `/v`.
- `/trace on|off` alterna la salida de traza del complemento para la sesión actual.
- `/fast [status|on|off]` muestra o establece el modo rápido.
- `/reasoning [on|off|stream]` alterna la visibilidad del razonamiento. Alias: `/reason`.
- `/elevated [on|off|ask|full]` alterna el modo elevado. Alias: `/elev`.
- `/exec host=<auto|sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>` muestra o establece los valores predeterminados de ejecución.
- `/model [name|#|status]` muestra o establece el modelo.
- `/models [provider] [page] [limit=<n>|size=<n>|all]` enumera los proveedores o modelos de un proveedor.
- `/queue <mode>` gestiona el comportamiento de la cola (`steer`, `interrupt`, `followup`, `collect`, `steer-backlog`) más opciones como `debounce:2s cap:25 drop:summarize`.
- `/help` muestra el resumen breve de ayuda.
- `/commands` muestra el catálogo de comandos generado.
- `/tools [compact|verbose]` muestra lo que el agente actual puede usar ahora mismo.
- `/status` muestra el estado de ejecución, incluido el uso/cuota del proveedor cuando esté disponible.
- `/tasks` enumera las tareas en segundo plano activas/recientes para la sesión actual.
- `/context [list|detail|json]` explica cómo se ensambla el contexto.
- `/export-session [path]` exporta la sesión actual a HTML. Alias: `/export`.
- `/whoami` muestra su ID de remitente. Alias: `/id`.
- `/skill <name> [input]` ejecuta una habilidad por nombre.
- `/allowlist [list|add|remove] ...` gestiona las entradas de la lista de permitidos. Solo texto.
- `/approve <id> <decision>` resuelve las solicitudes de aprobación de ejecución.
- `/btw <question>` hace una pregunta lateral sin cambiar el contexto de la sesión futura. Véase [/tools/btw](/es/tools/btw).
- `/subagents list|kill|log|info|send|steer|spawn` gestiona las ejecuciones de sub-agentes para la sesión actual.
- `/acp spawn|cancel|steer|close|sessions|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|help` gestiona las sesiones y opciones de tiempo de ejecución de ACP.
- `/focus <target>` vincula el hilo actual de Discord o tema/conversación de Telegram a un destino de sesión.
- `/unfocus` elimina el vínculo actual.
- `/agents` enumera los agentes vinculados al hilo para la sesión actual.
- `/kill <id|#|all>` aborta uno o todos los sub-agentes en ejecución.
- `/steer <id|#> <message>` envía dirección a un sub-agente en ejecución. Alias: `/tell`.
- `/config show|get|set|unset` lee o escribe `openclaw.json`. Solo para el propietario. Requiere `commands.config: true`.
- `/mcp show|get|set|unset` lee o escribe la configuración del servidor MCP gestionada por OpenClaw bajo `mcp.servers`. Solo para el propietario. Requiere `commands.mcp: true`.
- `/plugins list|inspect|show|get|install|enable|disable` inspecciona o muta el estado del complemento. `/plugin` es un alias. Solo para el propietario para escrituras. Requiere `commands.plugins: true`.
- `/debug show|set|unset|reset` gestiona las anulaciones de configuración solo en tiempo de ejecución. Solo para el propietario. Requiere `commands.debug: true`.
- `/usage off|tokens|full|cost` controla el pie de página de uso por respuesta o imprime un resumen de costos local.
- `/tts on|off|status|provider|limit|summary|audio|help` controla TTS. Consulte [/tools/tts](/es/tools/tts).
- `/restart` reinicia OpenClaw cuando está habilitado. Predeterminado: habilitado; establezca `commands.restart: false` para desactivarlo.
- `/activation mention|always` establece el modo de activación del grupo.
- `/send on|off|inherit` establece la política de envío. Solo para el propietario.
- `/bash <command>` ejecuta un comando de shell del host. Solo texto. Alias: `! <command>`. Requiere `commands.bash: true` más listas de permitidos `tools.elevated`.
- `!poll [sessionId]` verifica un trabajo de bash en segundo plano.
- `!stop [sessionId]` detiene un trabajo de bash en segundo plano.

### Comandos de dock generados

Los comandos de dock se generan a partir de complementos de canal con soporte de comandos nativos. Conjunto incluido actual:

- `/dock-discord` (alias: `/dock_discord`)
- `/dock-mattermost` (alias: `/dock_mattermost`)
- `/dock-slack` (alias: `/dock_slack`)
- `/dock-telegram` (alias: `/dock_telegram`)

### Comandos de complementos incluidos

Los complementos incluidos pueden agregar más comandos de barra. Comandos incluidos actuales en este repositorio:

- `/dreaming [on|off|status|help]` activa o desactiva el soñar de la memoria. Consulte [Dreaming](/es/concepts/dreaming).
- `/pair [qr|status|pending|approve|cleanup|notify]` gestiona el flujo de emparejamiento/configuración del dispositivo. Consulte [Pairing](/es/channels/pairing).
- `/phone status|arm <camera|screen|writes|all> [duration]|disarm` activa temporalmente los comandos de nodo de teléfono de alto riesgo.
- `/voice status|list [limit]|set <voiceId|name>` gestiona la configuración de voz de Talk. En Discord, el nombre del comando nativo es `/talkvoice`.
- `/card ...` envía preajustes de tarjetas enriquecidas de LINE. Consulte [LINE](/es/channels/line).
- `/codex status|models|threads|resume|compact|review|account|mcp|skills` inspecciona y controla el arnés del servidor de aplicaciones Codex incluido. Consulte [Codex Harness](/es/plugins/codex-harness).
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
- En canales multicuenta, `/allowlist --account <id>` y `/config set channels.<provider>.accounts.<id>...` dirigidos a la configuración también respetan `configWrites` de la cuenta de destino.
- `/usage` controla el pie de página de uso por respuesta; `/usage cost` imprime un resumen de costos locales desde los registros de sesión de OpenClaw.
- `/restart` está habilitado por defecto; establezca `commands.restart: false` para deshabilitarlo.
- `/plugins install <spec>` acepta las mismas especificaciones de complemento que `openclaw plugins install`: ruta local/archivo, paquete npm o `clawhub:<pkg>`.
- `/plugins enable|disable` actualiza la configuración del complemento y puede solicitar un reinicio.
- Comando nativo solo para Discord: `/vc join|leave|status` controla los canales de voz (requiere `channels.discord.voice` y comandos nativos; no disponible como texto).
- Los comandos de vinculación de hilos de Discord (`/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age`) requieren que los enlaces de hilos efectivos estén habilitados (`session.threadBindings.enabled` y/o `channels.discord.threadBindings.enabled`).
- Referencia de comandos y comportamiento en tiempo de ejecución de ACP: [ACP Agents](/es/tools/acp-agents).
- `/verbose` está pensado para la depuración y visibilidad adicional; manténgalo **desactivado** en uso normal.
- `/trace` es más limitado que `/verbose`: solo revela las líneas de seguimiento/depuración propiedad del complemento y mantiene desactivado el chatter normal y detallado de las herramientas.
- `/fast on|off` persiste una anulación de sesión. Use la opción de la interfaz de usuario de Sesiones `inherit` para borrarla y volver a los valores predeterminados de configuración.
- `/fast` es específico del proveedor: OpenAI/OpenAI Codex lo asignan a `service_tier=priority` en los puntos finales de Respuestas nativas, mientras que las solicitudes públicas directas de Anthropic, incluido el tráfico autenticado con OAuth enviado a `api.anthropic.com`, lo asignan a `service_tier=auto` o `standard_only`. Consulte [OpenAI](/es/providers/openai) y [Anthropic](/es/providers/anthropic).
- Los resúmenes de fallos de herramientas aún se muestran cuando corresponde, pero el texto detallado del fallo solo se incluye cuando `/verbose` es `on` o `full`.
- `/reasoning`, `/verbose` y `/trace` son arriesgados en configuraciones de grupo: pueden revelar razonamiento interno, resultados de herramientas o diagnósticos de complementos que no tenía intención de exponer. Es preferible dejarlos desactivados, especialmente en chats grupales.
- `/model` persiste el nuevo modelo de sesión inmediatamente.
- Si el agente está inactivo, la siguiente ejecución lo usa de inmediato.
- Si una ejecución ya está activa, OpenClaw marca un cambio en vivo como pendiente y solo se reinicia en el nuevo modelo en un punto de reintento limpio.
- Si la actividad de la herramienta o la salida de respuesta ya ha comenzado, el cambio pendiente puede permanecer en cola hasta una oportunidad de reintento posterior o el siguiente turno del usuario.
- **Fast path:** los mensajes que solo contienen comandos de remitentes en la lista de permitidos se manejan inmediatamente (omitiendo la cola + modelo).
- **Filtro de mención de grupo:** los mensajes que solo contienen comandos de remitentes en la lista de permitidos omiten los requisitos de mención.
- **Atajos en línea (solo remitentes en la lista de permitidos):** ciertos comandos también funcionan cuando se incrustan en un mensaje normal y se eliminan antes de que el modelo vea el texto restante.
  - Ejemplo: `hey /status` activa una respuesta de estado, y el texto restante continúa a través del flujo normal.
- Actualmente: `/help`, `/commands`, `/status`, `/whoami` (`/id`).
- Los mensajes que solo contienen comandos no autorizados se ignoran silenciosamente, y los tokens `/...` en línea se tratan como texto plano.
- **Comandos de habilidades (skills):** las habilidades `user-invocable` se exponen como comandos de barra. Los nombres se sanitizan a `a-z0-9_` (máx. 32 caracteres); las colisiones obtienen sufijos numéricos (ej. `_2`).
  - `/skill <name> [input]` ejecuta una habilidad por nombre (útil cuando los límites de comandos nativos impiden comandos por habilidad).
  - De forma predeterminada, los comandos de habilidades se reenvían al modelo como una solicitud normal.
  - Las habilidades pueden declarar opcionalmente `command-dispatch: tool` para enrutar el comando directamente a una herramienta (determinista, sin modelo).
  - Ejemplo: `/prose` (complemento OpenProse) — consulta [OpenProse](/es/prose).
- **Argumentos de comandos nativos:** Discord usa autocompletado para opciones dinámicas (y menús de botones cuando omites argumentos obligatorios). Telegram y Slack muestran un menú de botones cuando un comando admite elecciones y omites el argumento.

## `/tools`

`/tools` responde a una pregunta de tiempo de ejecución, no a una pregunta de configuración: **lo que este agente puede usar ahora mismo en esta conversación**.

- El `/tools` predeterminado es compacto y está optimizado para un escaneo rápido.
- `/tools verbose` añade descripciones breves.
- Las superficies de comandos nativos que admiten argumentos exponen el mismo interruptor de modo que `compact|verbose`.
- Los resultados tienen alcance de sesión, por lo que cambiar el agente, el canal, el hilo, la autorización del remitente o el modelo puede cambiar el resultado.
- `/tools` incluye herramientas que son realmente accesibles en tiempo de ejecución, incluyendo herramientas principales, herramientas de complementos conectados y herramientas propias del canal.

Para la edición de perfiles y anulaciones, use el panel Herramientas de la Interfaz de Control o las superficies de configuración/catálogo en lugar de tratar `/tools` como un catálogo estático.

## Superficies de uso (qué se muestra dónde)

- **Uso/cuota del proveedor** (ejemplo: "Claude 80% restante") aparece en `/status` para el proveedor del modelo actual cuando el seguimiento de uso está habilitado. OpenClaw normaliza las ventanas del proveedor a `% left`; para MiniMax, los campos de porcentaje solo restantes se invierten antes de mostrarse, y las respuestas de `model_remains` prefieren la entrada del modelo de chat más una etiqueta de plan etiquetada con el modelo.
- Las **líneas de tokens/caché** en `/status` pueden recurrir a la entrada de uso de la transcripción más reciente cuando la instantánea de la sesión en vivo es escasa. Los valores en vivo existentes distintos de cero aún tienen prioridad, y la recuperación de la transcripción también puede recuperar la etiqueta del modelo de tiempo de ejecución activo más un total orientado al prompt mayor cuando los totales almacenados faltan o son menores.
- El **coste/tokens por respuesta** está controlado por `/usage off|tokens|full` (adjunto a las respuestas normales).
- `/model status` se trata de **modelos/autenticación/puntos finales**, no del uso.

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

- `/model` y `/model list` muestran un selector numerado compacto (familia de modelo + proveedores disponibles).
- En Discord, `/model` y `/models` abren un selector interactivo con menús desplegables de proveedor y modelo más un paso Enviar.
- `/model <#>` selecciona de ese selector (y prefiere el proveedor actual cuando es posible).
- `/model status` muestra la vista detallada, incluyendo el punto final del proveedor configurado (`baseUrl`) y el modo de API (`api`) cuando están disponibles.

## Anulaciones de depuración

`/debug` te permite establecer anulaciones de configuración **solo en tiempo de ejecución** (memoria, no disco). Solo para propietarios. Deshabilitado de forma predeterminada; habilítelo con `commands.debug: true`.

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

## Salida de traza del complemento

`/trace` te permite alternar **líneas de traza/depuración de complementos con alcance de sesión** sin activar el modo detallado completo.

Ejemplos:

```text
/trace
/trace on
/trace off
```

Notas:

- `/trace` sin argumentos muestra el estado de traza de la sesión actual.
- `/trace on` habilita las líneas de traza del complemento para la sesión actual.
- `/trace off` las deshabilita de nuevo.
- Las líneas de traza del complemento pueden aparecer en `/status` y como un mensaje de diagnóstico de seguimiento después de la respuesta normal del asistente.
- `/trace` no reemplaza a `/debug`; `/debug` todavía administra las anulaciones de configuración solo en tiempo de ejecución.
- `/trace` no reemplaza a `/verbose`; la salida normal de herramienta/estado detallada todavía pertenece a `/verbose`.

## Actualizaciones de configuración

`/config` escribe en tu configuración en disco (`openclaw.json`). Solo para propietarios. Deshabilitado de forma predeterminada; habilítelo con `commands.config: true`.

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
- Las actualizaciones de `/config` persisten entre reinicios.

## Actualizaciones de MCP

`/mcp` escribe definiciones de servidores MCP administradas por OpenClaw bajo `mcp.servers`. Solo para propietarios. Deshabilitado de forma predeterminada; habilítelo con `commands.mcp: true`.

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

`/plugins` permite a los operadores inspeccionar los complementos descubiertos y activar o desactivar su habilitación en la configuración. Los flujos de solo lectura pueden usar `/plugin` como alias. Deshabilitado de forma predeterminada; habilite con `commands.plugins: true`.

Ejemplos:

```text
/plugins
/plugins list
/plugin show context7
/plugins enable context7
/plugins disable context7
```

Notas:

- `/plugins list` y `/plugins show` utilizan el descubrimiento real de complementos en el espacio de trabajo actual más la configuración en disco.
- `/plugins enable|disable` solo actualiza la configuración del complemento; no instala ni desinstala complementos.
- Después de los cambios de habilitar/deshabilitar, reinicie el gateway para aplicarlos.

## Notas de superficie

- Los **comandos de texto** se ejecutan en la sesión de chat normal (los MD comparten `main`, los grupos tienen su propia sesión).
- Los **comandos nativos** usan sesiones aisladas:
  - Discord: `agent:<agentId>:discord:slash:<userId>`
  - Slack: `agent:<agentId>:slack:slash:<userId>` (prefijo configurable vía `channels.slack.slashCommand.sessionPrefix`)
  - Telegram: `telegram:slash:<userId>` (apunta a la sesión de chat a través de `CommandTargetSessionKey`)
- **`/stop`** apunta a la sesión de chat activa para que pueda abortar la ejecución actual.
- **Slack:** `channels.slack.slashCommand` todavía es compatible para un solo comando estilo `/openclaw`. Si habilita `commands.native`, debe crear un comando de barra de Slack por cada comando integrado (los mismos nombres que `/help`). Los menús de argumentos de comandos para Slack se entregan como botones efímeros de Block Kit.
  - Excepción nativa de Slack: registre `/agentstatus` (no `/status`) porque Slack reserva `/status`. El texto `/status` todavía funciona en los mensajes de Slack.

## Preguntas laterales BTW

`/btw` es una **pregunta lateral** rápida sobre la sesión actual.

A diferencia del chat normal:

- usa la sesión actual como contexto de fondo,
- se ejecuta como una llamada única **sin herramientas** separada,
- no cambia el contexto de la sesión futura,
- no se escribe en el historial de transcripciones,
- se entrega como un resultado lateral en vivo en lugar de un mensaje normal del asistente.

Eso hace que `/btw` sea útil cuando desea una aclaración temporal mientras la tarea
principal continúa.

Ejemplo:

```text
/btw what are we doing right now?
```

Consulte [Preguntas laterales BTW](/es/tools/btw) para conocer el comportamiento completo y los detalles de la experiencia del usuario.
