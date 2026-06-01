---
summary: "Slash commands: texto frente a nativo, configuración y comandos compatibles"
read_when:
  - Using or configuring chat commands
  - Debugging command routing or permissions
title: "Comandos de barra"
sidebarTitle: "Comandos de barra"
---

Los comandos son gestionados por el Gateway. La mayoría de los comandos deben enviarse como un mensaje **independiente** que comience con `/`. El comando de chat de bash solo para el host utiliza `! <cmd>` (con `/bash <cmd>` como alias).

Cuando una conversación o hilo está vinculado a una sesión de ACP, el texto de seguimiento normal se enruta a ese arnés de ACP. Los comandos de administración del Gateway siguen siendo locales: `/acp ...` siempre llega al gestor de comandos ACP de OpenClaw, y `/status` más `/unfocus` se mantienen locales siempre que el manejo de comandos esté habilitado para la superficie.

Hay dos sistemas relacionados:

<AccordionGroup>
  <Accordion title="Comandos">
    Mensajes `/...` independientes.
  </Accordion>
  <Accordion title="Directivas">
    `/think`, `/fast`, `/verbose`, `/trace`, `/reasoning`, `/elevated`, `/exec`, `/model`, `/queue`.

    - Las directivas se eliminan del mensaje antes de que el modelo lo vea.
    - En los mensajes de chat normales (no solo de directivas), se tratan como "sugerencias en línea" y **no** persisten en la configuración de la sesión.
    - En los mensajes de solo directivas (el mensaje contiene solo directivas), persisten en la sesión y responden con un acuse de recibo.
    - Las directivas solo se aplican a **remitentes autorizados**. Si se establece `commands.allowFrom`, es la única lista de permitidos utilizada; de lo contrario, la autorización proviene de las listas de permitidos/emparejamiento del canal más `commands.useAccessGroups`. Los remitentes no autorizados ven las directivas tratadas como texto sin formato.

  </Accordion>
  <Accordion title="Accesos directos en línea">
    Solo para remitentes autorizados/en lista blanca: `/help`, `/commands`, `/status`, `/whoami` (`/id`).

    Se ejecutan inmediatamente, se eliminan antes de que el modelo vea el mensaje y el texto restante continúa a través del flujo normal.

  </Accordion>
</AccordionGroup>

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

<ParamField path="commands.text" type="boolean" default="true">
  Habilita el análisis de `/...` en los mensajes de chat. En superficies sin comandos nativos (WhatsApp/WebChat/Signal/iMessage/Google Chat/Microsoft Teams), los comandos de texto aún funcionan incluso si establece esto en `false`.
</ParamField>
<ParamField path="commands.native" type='boolean | "auto"' default='"auto"'>
  Registra comandos nativos. Automático: activado para Discord/Telegram; desactivado para Slack (hasta que agregue comandos de barra); ignorado para proveedores sin soporte nativo. Establezca `channels.discord.commands.native`, `channels.telegram.commands.native` o `channels.slack.commands.native` para anular por proveedor (booleano o `"auto"`). En Discord, `false` omite el registro y la limpieza de comandos de barra durante el inicio; los comandos registrados previamente pueden permanecer visibles hasta que los elimine de la aplicación de Discord. Los comandos de Slack se administran en la aplicación de Slack y no se eliminan automáticamente.
</ParamField>
En Discord, las especificaciones de comandos nativos pueden incluir `descriptionLocalizations`, que OpenClaw publica como `description_localizations` de Discord e incluye en las comparaciones de conciliación.
<ParamField path="commands.nativeSkills" type='boolean | "auto"' default='"auto"'>
  Registra comandos de **habilidad** de forma nativa cuando se admite. Automático: activado para Discord/Telegram; desactivado para Slack (Slack requiere crear un comando de barra por cada habilidad). Establezca `channels.discord.commands.nativeSkills`, `channels.telegram.commands.nativeSkills` o `channels.slack.commands.nativeSkills` para anular por proveedor (booleano o `"auto"`).
</ParamField>
<ParamField path="commands.bash" type="boolean" default="false">
  Habilita `! <cmd>` para ejecutar comandos de shell del host (`/bash <cmd>` es un alias; requiere listas de permitidos `tools.elevated`).
</ParamField>
<ParamField path="commands.bashForegroundMs" type="number" default="2000">
  Controla cuánto tiempo espera bash antes de cambiar al modo en segundo plano (`0` pasa a segundo plano inmediatamente).
</ParamField>
<ParamField path="commands.config" type="boolean" default="false">
  Habilita `/config` (lee/escribe `openclaw.json`).
</ParamField>
<ParamField path="commands.mcp" type="boolean" default="false">
  Habilita `/mcp` (lee/escribe la configuración MCP administrada por OpenClaw bajo `mcp.servers`).
</ParamField>
<ParamField path="commands.plugins" type="boolean" default="false">
  Habilita `/plugins` (descubrimiento/estado de complementos más controles de instalación + habilitar/deshabilitar).
</ParamField>
<ParamField path="commands.debug" type="boolean" default="false">
  Habilita `/debug` (anulaciones solo en tiempo de ejecución).
</ParamField>
<ParamField path="commands.restart" type="boolean" default="true">
  Habilita `/restart` más acciones de herramientas de reinicio de la puerta de enlace.
</ParamField>
<ParamField path="commands.ownerAllowFrom" type="string[]">
  Establece la lista de permitidos explícita del propietario para superficies de comandos solo para propietarios y acciones de canal con puerta de propietario. Esta es la cuenta del operador humano que puede aprobar acciones peligrosas y ejecutar comandos como `/diagnostics`, `/export-trajectory` y `/config`. Es independiente de `commands.allowFrom` y del acceso de emparejamiento de DM.
</ParamField>
<ParamField path="channels.<channel>.commands.enforceOwnerForCommands" type="boolean" default="false">
  Por canal: hace que los comandos solo para propietarios requieran **identidad de propietario** para ejecutarse en esa superficie. Cuando es `true`, el remitente debe coincidir con un candidato de propietario resuelto (por ejemplo, una entrada en `commands.ownerAllowFrom` o metadatos de propietario nativos del proveedor) o tener el alcance `operator.admin` interno en un canal de mensaje interno. Una entrada comodín en el canal `allowFrom`, o una lista de candidatos de propietario vacía/no resuelta, **no** es suficiente; los comandos solo para propietarios fallan cerrados en ese canal. Déjelo desactivado si desea que los comandos solo para propietarios estén restringidos solo por `ownerAllowFrom` y las listas de permitidos de comandos estándar.
</ParamField>
<ParamField path="commands.ownerDisplay" type='"raw" | "hash"'>
  Controla cómo aparecen los identificadores de propietario en el mensaje del sistema.
</ParamField>
<ParamField path="commands.ownerDisplaySecret" type="string">
  Opcionalmente establece el secreto HMAC utilizado cuando `commands.ownerDisplay="hash"`.
</ParamField>
<ParamField path="commands.allowFrom" type="object">
  Lista de permitidos por proveedor para la autorización de comandos. Cuando se configura, es la única fuente de autorización para comandos y directivas (las listas de permitidos/emparejamiento de canales y `commands.useAccessGroups` se ignoran). Use `"*"` para un valor predeterminado global; las claves específicas del proveedor lo anulan.
</ParamField>
<ParamField path="commands.useAccessGroups" type="boolean" default="true">
  Hace cumplir las listas de permitidos/políticas para los comandos cuando `commands.allowFrom` no está establecido.
</ParamField>

## Lista de comandos

Fuente de verdad actual:

- los comandos integrados principales provienen de `src/auto-reply/commands-registry.shared.ts`
- los comandos generados por dock provienen de `src/auto-reply/commands-registry.data.ts`
- los comandos de complemento provienen de las llamadas `registerCommand()` del complemento
- la disponibilidad real en su puerta de enlace todavía depende de las banderas de configuración, la superficie del canal y los complementos instalados/habilitados

### Comandos integrados básicos

<AccordionGroup>
  <Accordion title="Sesiones y ejecuciones">
    - `/new [model]` archiva la sesión actual e inicia una nueva; `/reset` borra la sesión actual in situ. No son alias.
    - La interfaz de usuario de Control intercepta `/new` escrito para crear y cambiar a una nueva sesión del panel, excepto cuando `session.dmScope: "main"` está configurado y el padre actual es la sesión principal del agente; en ese caso, `/new` restablece la sesión principal in situ. `/reset` escrito todavía ejecuta el restablecimiento in situ del Gateway.
    - `/reset soft [message]` mantiene la transcripción actual, elimina los ids de sesión del backend CLI reutilizados y vuelve a ejecutar la carga de inicio/system-prompt in situ.
    - `/compact [instructions]` compacta el contexto de la sesión. Consulte [Compactación](/es/concepts/compaction).
    - `/stop` aborta la ejecución actual.
    - `/session idle <duration|off>` y `/session max-age <duration|off>` gestionan la caducidad del enlace de hilos (thread-binding).
    - `/export-session [path]` exporta la sesión actual a HTML. Alias: `/export`.
    - `/export-trajectory [path]` solicita aprobación de ejecución y luego exporta un [paquete de trayectoria](/es/tools/trajectory) JSONL para la sesión actual. Úselo cuando necesite la línea de tiempo de prompt, herramienta y transcripción para una sesión de OpenClaw. En chats grupales, la solicitud de aprobación y el resultado de exportación van al propietario de forma privada. Alias: `/trajectory`.

  </Accordion>
  <Accordion title="Modelo y controles de ejecución">
    - `/think <level|default>` establece el nivel de pensamiento o borra la anulación de la sesión. Las opciones provienen del perfil del proveedor del modelo activo; los niveles comunes son `off`, `minimal`, `low`, `medium` y `high`, con niveles personalizados como `xhigh`, `adaptive`, `max` o binario `on` solo donde se admitan. Alias: `/thinking`, `/t`.
    - `/verbose on|off|full` alterna la salida detallada. Los remitentes externos autorizados pueden persistir la anulación de la sesión; los clientes internos de gateway/webchat necesitan `operator.admin`. Alias: `/v`.
    - `/trace on|off` alterna la salida de traza del complemento para la sesión actual.
    - `/fast [status|on|off|default]` muestra, establece o borra el modo rápido.
    - `/reasoning [on|off|stream]` alterna la visibilidad del razonamiento. Alias: `/reason`.
    - `/elevated [on|off|ask|full]` alterna el modo elevado. Alias: `/elev`.
    - `/exec host=<auto|sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>` muestra o establece los valores predeterminados de ejecución.
    - `/model [name|#|status]` muestra o establece el modelo.
    - `/models [provider] [page] [limit=<n>|size=<n>|all]` enumera los proveedores configurados/disponibles para auth o los modelos de un proveedor; añada `all` para navegar por el catálogo completo de ese proveedor. Las entradas `provider/*` en `agents.defaults.models` hacen que `/model` y `/models` muestren solo los modelos descubiertos para esos proveedores.
    - `/queue <mode>` gestiona el comportamiento de la cola de ejecución activa (`steer`, `followup`, `collect`, `interrupt`) más opciones como `debounce:0.5s cap:25 drop:summarize`; `/queue default` o `/queue reset` borra la anulación de la sesión. Los avisos durante la ejecución dirigen por defecto sin una directiva de cola. Consulte [Cola de comandos](/es/concepts/queue) y [Cola de dirección](/es/concepts/queue-steering).
    - `/steer <message>` inyecta orientación en la ejecución activa para la sesión actual, independientemente del modo `/queue`. Si la dirección no está disponible o la sesión está inactiva, `<message>` continúa como un aviso normal. Alias: `/tell`. Consulte [Dirigir (Steer)](/es/tools/steer).

  </Accordion>
  <Accordion title="Descubrimiento y estado">
    - `/help` muestra el resumen de ayuda breve.
    - `/commands` muestra el catálogo de comandos generado.
    - `/tools [compact|verbose]` muestra lo que el agente actual puede usar ahora mismo.
    - `/status` muestra el estado de ejecución/tiempo de ejecución, tiempo de actividad de Gateway y del sistema, además del uso/cuota del proveedor cuando esté disponible.
    - `/diagnostics [note]` es el flujo de reporte de soporte solo para propietarios para errores de Gateway y ejecuciones del arnés Codex. Pide aprobación de ejecución explícita cada vez antes de ejecutar `openclaw gateway diagnostics export --json`; no apruebes diagnósticos con una regla de permitir-todo. Después de la aprobación, envía un reporte pegable con la ruta del bundle local, resumen del manifiesto, notas de privacidad e ids de sesión relevantes. En chats grupales, el aviso de aprobación y el reporte van al propietario de forma privada. Cuando la sesión activa usa el arnés OpenAI Codex, la misma aprobación también envía retroalimentación relevante de Codex a los servidores de OpenAI y la respuesta completada lista los ids de sesión de OpenClaw, los ids de hilo de Codex y los comandos `codex resume <thread-id>`. Consulte [Exportación de diagnósticos](/es/gateway/diagnostics).
    - `/crestodian <request>` ejecuta el asistente de configuración y reparación de Crestodian desde un MD de propietario.
    - `/tasks` lista las tareas de fondo activas/recientes para la sesión actual.
    - `/context [list|detail|map|json]` explica cómo se ensambla el contexto. `map` envía una imagen de treemap del contexto de la sesión actual.
    - `/whoami` muestra su id de remitente. Alias: `/id`.
    - `/usage off|tokens|full|cost` controla el pie de página de uso por respuesta o imprime un resumen de costos local.

  </Accordion>
  <Accordion title="Habilidades, listas de permitidos, aprobaciones">
    - `/skill <name> [input]` ejecuta una habilidad por nombre.
    - `/allowlist [list|add|remove] ...` gestiona las entradas de la lista de permitidos. Solo texto.
    - `/approve <id> <decision>` resuelve las promesas de aprobación de exec o plugin.
    - `/btw <question>` hace una pregunta lateral sin cambiar el contexto de la sesión futura. Alias: `/side`. Consulte [BTW](/es/tools/btw).

  </Accordion>
  <Accordion title="Subagentes y ACP">
    - `/subagents list|log|info` inspecciona las ejecuciones de subagentes para la sesión actual.
    - `/acp spawn|cancel|steer|close|sessions|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|help` gestiona las sesiones de ACP y las opciones de tiempo de ejecución.
    - `/focus <target>` vincula el hilo de Discord actual o el tema/conversación de Telegram a un objetivo de sesión.
    - `/unfocus` elimina el vínculo actual.
    - `/agents` enumera los agentes vinculados al hilo para la sesión actual.

  </Accordion>
  <Accordion title="Escrituras solo para el propietario y administración">
    - `/config show|get|set|unset` lee o escribe `openclaw.json`. Solo para el propietario. Requiere `commands.config: true`.
    - `/mcp show|get|set|unset` lee o escribe la configuración del servidor MCP gestionada por OpenClaw bajo `mcp.servers`. Solo para el propietario. Requiere `commands.mcp: true`.
    - `/plugins list|inspect|show|get|install|enable|disable` inspecciona o modifica el estado del complemento. `/plugin` es un alias. Solo para el propietario para escrituras. Requiere `commands.plugins: true`.
    - `/debug show|set|unset|reset` gestiona las anulaciones de configuración solo de tiempo de ejecución. Solo para el propietario. Requiere `commands.debug: true`.
    - `/restart` reinicia OpenClaw cuando está habilitado. Predeterminado: habilitado; configure `commands.restart: false` para deshabilitarlo.
    - `/send on|off|inherit` establece la política de envío. Solo para el propietario.

  </Accordion>
  <Accordion title="Voz, TTS, control de canal">
    - `/tts on|off|status|chat|latest|provider|limit|summary|audio|help` controla el TTS. Consulte [TTS](/es/tools/tts).
    - `/activation mention|always` establece el modo de activación de grupo.
    - `/bash <command>` ejecuta un comando de shell del host. Solo texto. Alias: `! <command>`. Requiere listas de permitidos `commands.bash: true` más `tools.elevated`.
    - `!poll [sessionId]` comprueba un trabajo de bash en segundo plano.
    - `!stop [sessionId]` detiene un trabajo de bash en segundo plano.

  </Accordion>
</AccordionGroup>

### Comandos de muelle generados

Los comandos de dock cambian la ruta de respuesta de la sesión actual a otro canal vinculado. Consulte [Channel docking](/es/concepts/channel-docking) para la configuración, ejemplos y solución de problemas.

Los comandos Dock se generan a partir de complementos de canal con soporte de comandos nativos. Conjunto incluido actual:

- `/dock-discord` (alias: `/dock_discord`)
- `/dock-mattermost` (alias: `/dock_mattermost`)
- `/dock-slack` (alias: `/dock_slack`)
- `/dock-telegram` (alias: `/dock_telegram`)

Utilice los comandos Dock desde un chat directo para cambiar la ruta de respuesta de la sesión actual a otro canal vinculado. El agente mantiene el mismo contexto de sesión, pero las respuestas futuras de esa sesión se entregan al par del canal seleccionado.

Los comandos de dock requieren `session.identityLinks`. El remitente de origen y el par de destino deben estar en el mismo grupo de identidad, por ejemplo `["telegram:123", "discord:456"]`. Si un usuario de Telegram con id `123` envía `/dock_discord`, OpenClaw almacena `lastChannel: "discord"` y `lastTo: "456"` en la sesión activa. Si el remitente no está vinculado a un par de Discord, el comando responde con una sugerencia de configuración en lugar de pasar al chat normal.

El acoplamiento cambia solo la ruta de la sesión activa. No crea cuentas de canal, otorga acceso, omite las listas de permitidos del canal ni mueve el historial de transcripciones a otra sesión. Use `/dock-telegram`, `/dock-slack`, `/dock-mattermost` u otro comando de dock generado para cambiar la ruta nuevamente.

### Comandos de plugins incluidos

Los plugins incluidos pueden agregar más comandos de barra. Comandos incluidos actuales en este repositorio:

- `/dreaming [on|off|status|help]` alterna la memoria de ensueño. Consulte [Dreaming](/es/concepts/dreaming).
- `/pair [qr|status|pending|approve|cleanup|notify]` gestiona el flujo de emparejamiento/configuración del dispositivo. Consulte [Pairing](/es/channels/pairing).
- `/phone status|arm <camera|screen|writes|all> [duration]|disarm` activa temporalmente comandos de nodos de teléfono de alto riesgo.
- `/voice status|list [limit]|set <voiceId|name>` gestiona la configuración de voz de Talk. En Discord, el nombre del comando nativo es `/talkvoice`.
- `/card ...` envía preajustes de tarjetas enriquecidas de LINE. Consulte [LINE](/es/channels/line).
- `/codex status|models|threads|resume|compact|review|diagnostics|account|mcp|skills` inspecciona y controla el arnés del servidor de aplicaciones Codex incluido. Consulte [Codex harness](/es/plugins/codex-harness).
- Comandos solo de QQBot:
  - `/bot-ping`
  - `/bot-version`
  - `/bot-help`
  - `/bot-upgrade`
  - `/bot-logs`

### Comandos de habilidades dinámicas

Las habilidades invocables por el usuario también se exponen como comandos de barra:

- `/skill <name> [input]` siempre funciona como el punto de entrada genérico.
- las habilidades también pueden aparecer como comandos directos como `/prose` cuando la habilidad/complemento las registra.
- el registro nativo de comandos de habilidades está controlado por `commands.nativeSkills` y `channels.<provider>.commands.nativeSkills`.
- las especificaciones de comandos pueden proporcionar `descriptionLocalizations` para superficies nativas que admiten descripciones localizadas, incluyendo Discord.

<AccordionGroup>
  <Accordion title="Notas sobre argumentos y analizadores">
    - Los comandos aceptan un `:` opcional entre el comando y los argumentos (por ejemplo, `/think: high`, `/send: on`, `/help:`).
    - `/new <model>` acepta un alias de modelo, `provider/model`, o un nombre de proveedor (coincidencia aproximada); si no hay coincidencia, el texto se trata como el cuerpo del mensaje.
    - Para un desglose completo del uso del proveedor, use `openclaw status --usage`.
    - `/allowlist add|remove` requiere `commands.config=true` y respeta el `configWrites` del canal.
    - En canales multicuenta, `/allowlist --account <id>` y `/config set channels.<provider>.accounts.<id>...` orientados a la configuración también respetan el `configWrites` de la cuenta de destino.
    - `/usage` controla el pie de página de uso por respuesta; `/usage cost` imprime un resumen de costos local desde los registros de sesión de OpenClaw.
    - `/restart` está habilitado de forma predeterminada; establezca `commands.restart: false` para desactivarlo.
    - `/plugins install <spec>` acepta las mismas especificaciones de complemento que `openclaw plugins install`: ruta local/archivo, paquete npm, `git:<repo>`, o `clawhub:<pkg>`. Las Gateways administradas se reinician automáticamente porque cambiaron los módulos de origen del complemento.
    - `/plugins enable|disable` actualiza la configuración del complemento y activa la recarga del complemento de Gateway para nuevos turnos del agente.

  </Accordion>
  <Accordion title="Comportamiento específico del canal">
    - Comando nativo solo de Discord: `/vc join|leave|status` controla los canales de voz (no disponible como texto). `join` requiere un servidor y un canal de voz/escenario seleccionado. Requiere `channels.discord.voice` y comandos nativos.
    - Comandos de vinculación de hilos de Discord (`/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age`) requieren que las vinculaciones efectivas de hilos estén habilitadas (`session.threadBindings.enabled` y/o `channels.discord.threadBindings.enabled`).
    - Referencia de comandos ACP y comportamiento en tiempo de ejecución: [ACP agents](/es/tools/acp-agents).

  </Accordion>
  <Accordion title="Verbose / trace / fast / seguridad del razonamiento">
    - `/verbose` está pensado para la depuración y visibilidad adicional; manténgalo **desactivado** en uso normal.
    - `/trace` es más específico que `/verbose`: solo revela líneas de rasturo/depuración propias del complemento y mantiene desactivado el ruido detallado normal de las herramientas.
    - `/fast on|off` persiste una anulación de sesión. Use la opción `inherit` de la IU de Sesiones para borrarla y volver a los valores predeterminados de configuración.
    - `/fast` es específico del proveedor: OpenAI/OpenAI Codex lo mapean a `service_tier=priority` en endpoints nativos de Responses, mientras que las solicitudes directas públicas a Anthropic, incluido el tráfico autenticado con OAuth enviado a `api.anthropic.com`, lo mapean a `service_tier=auto` o `standard_only`. Consulte [OpenAI](/es/providers/openai) y [Anthropic](/es/providers/anthropic).
    - Los resúmenes de fallos de herramientas todavía se muestran cuando es relevante, pero el texto detallado del fallo solo se incluye cuando `/verbose full` está activado.
    - `/reasoning`, `/verbose` y `/trace` son arriesgados en entornos grupales: pueden revelar razonamiento interno, resultados de herramientas o diagnósticos de complementos que no tenía intención de exponer. Es preferible dejarlos desactivados, especialmente en chats grupales.

  </Accordion>
  <Accordion title="Cambio de modelo">
    - `/model` persiste el nuevo modelo de sesión inmediatamente.
    - Si el agente está inactivo, la siguiente ejecución lo usa de inmediato.
    - Si una ejecución ya está activa, OpenClaw marca un cambio en vivo como pendiente y solo se reinicia en el nuevo modelo en un punto de reintento limpio.
    - Si la actividad de la herramienta o la salida de la respuesta ya ha comenzado, el cambio pendiente puede permanecer en cola hasta una oportunidad de reintento posterior o el siguiente turno del usuario.
    - En la TUI local, `/crestodian [request]` regresa de la TUI normal del agente a Crestodian. Esto es independiente del modo de rescate del canal de mensajes y no otorga autoridad de configuración remota.

  </Accordion>
  <Accordion title="Ruta rápida y accesos directos en línea">
    - **Ruta rápida:** los mensajes que solo contienen comandos de remitentes en la lista permitida se manejan inmediatamente (sin pasar por cola ni modelo).
    - **Filtrado por mención de grupo:** los mensajes que solo contienen comandos de remitentes en la lista permitida omiten los requisitos de mención.
    - **Accesos directos en línea (solo para remitentes en la lista permitida):** ciertos comandos también funcionan cuando se incrustan en un mensaje normal y se eliminan antes de que el modelo vea el texto restante.
      - Ejemplo: `hey /status` activa una respuesta de estado y el texto restante continúa a través del flujo normal.
    - Actualmente: `/help`, `/commands`, `/status`, `/whoami` (`/id`).
    - Los mensajes que solo contienen comandos no autorizados se ignoran silenciosamente y los tokens `/...` en línea se tratan como texto plano.

  </Accordion>
  <Accordion title="Comandos de habilidades y argumentos nativos">
    - **Comandos de habilidades:** las habilidades `user-invocable` se exponen como comandos de barra. Los nombres se sanitizan a `a-z0-9_` (máx. 32 caracteres); las colisiones obtienen sufijos numéricos (p. ej., `_2`).
      - `/skill <name> [input]` ejecuta una habilidad por nombre (útil cuando los límites de comandos nativos impiden comandos por habilidad).
      - De forma predeterminada, los comandos de habilidades se reenvían al modelo como una solicitud normal.
      - Las habilidades pueden declarar opcionalmente `command-dispatch: tool` para enrutar el comando directamente a una herramienta (determinista, sin modelo).
      - Ejemplo: `/prose` (complemento OpenProse) — consulte [OpenProse](/es/prose).
    - **Argumentos de comandos nativos:** Discord usa autocompletado para opciones dinámicas (y menús de botones cuando omite argumentos obligatorios). Telegram y Slack muestran un menú de botones cuando un comando admite opciones y omite el argumento. Las opciones dinámicas se resuelven con el modelo de sesión de destino, por lo que las opciones específicas del modelo, como los niveles de `/think`, siguen la anulación `/model` de esa sesión.

  </Accordion>
</AccordionGroup>

## `/tools`

`/tools` responde a una pregunta de tiempo de ejecución, no a una pregunta de configuración: **lo que este agente puede usar ahora mismo en esta conversación**.

- El `/tools` predeterminado es compacto y está optimizado para un escaneo rápido.
- `/tools verbose` añade descripciones breves.
- Las superficies de comandos nativos que soportan argumentos exponen el mismo interruptor de modo que `compact|verbose`.
- Los resultados están limitados a la sesión, por lo que cambiar el agente, el canal, el hilo, la autorización del remitente o el modelo puede cambiar la salida.
- `/tools` incluye herramientas que son realmente accesibles en tiempo de ejecución, incluyendo herramientas principales, herramientas de complementos conectadas y herramientas propias del canal.

Para la edición de perfiles y anulaciones, utilice el panel de Herramientas de la Interfaz de Control (Control UI) o las superficies de configuración/catálogo en lugar de tratar `/tools` como un catálogo estático.

## Superficies de uso (qué se muestra dónde)

- **Uso/cuota del proveedor** (ejemplo: "Claude 80% restante") aparece en `/status` para el proveedor de modelo actual cuando el seguimiento de uso está habilitado. OpenClaw normaliza las ventanas del proveedor a `% left`; para MiniMax, los campos de porcentaje solo restantes se invierten antes de mostrarse, y las respuestas `model_remains` prefieren la entrada del modelo de chat más una etiqueta de plan etiquetada con el modelo.
- Las **líneas de token/caché** en `/status` pueden recurrir a la última entrada de uso de la transcripción cuando la instantánea de la sesión en vivo es escasa. Los valores en vivo existentes distintos de cero todavía tienen prioridad, y el recurso de seguridad de la transcripción también puede recuperar la etiqueta del modelo de tiempo de ejecución activo más un total orientado al indicador mayor cuando los totales almacenados faltan o son menores.
- **Ejecución vs. tiempo de ejecución:** `/status` informa `Execution` para la ruta efectiva del sandbox y `Runtime` sobre quién está ejecutando realmente la sesión: `OpenClaw Default`, `OpenAI Codex`, un backend CLI, o un backend ACP.
- **Tokens/coste por respuesta** está controlado por `/usage off|tokens|full` (añadido a las respuestas normales).
- `/model status` trata sobre **modelos/autenticación/puntos finales**, no sobre el uso.

## Selección de modelo (`/model`)

`/model` está implementado como una directiva.

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

- `/model` y `/model list` muestran un selector compacto y numerado (familia de modelo + proveedores disponibles).
- En Discord, `/model` y `/models` abren un selector interactivo con menús desplegables de proveedor y modelo, además de un paso Enviar. El selector respeta `agents.defaults.models`, incluyendo `provider/*` entradas, por lo que el descubrimiento con ámbito de proveedor puede mantener el selector por debajo del límite de 25 opciones de componente de Discord.
- `/model <#>` selecciona de ese selector (y prefiere el proveedor actual cuando es posible).
- `/model status` muestra la vista detallada, incluyendo el punto de conexión del proveedor configurado (`baseUrl`) y el modo de API (`api`) cuando está disponible.

## Invalidaciones de depuración

`/debug` te permite establecer anulaciones de configuración **solo en tiempo de ejecución** (memoria, no disco). Solo para propietarios. Deshabilitado por defecto; habilítelo con `commands.debug: true`.

Ejemplos:

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

<Note>Las anulaciones se aplican inmediatamente a las nuevas lecturas de configuración, pero **no** se escriben en `openclaw.json`. Use `/debug reset` para borrar todas las anulaciones y volver a la configuración en disco.</Note>

## Salida de traza de complementos

`/trace` te permite alternar **líneas de rastreo/depuración de complementos con ámbito de sesión** sin activar el modo detallado completo.

Ejemplos:

```text
/trace
/trace on
/trace off
```

Notas:

- `/trace` sin argumentos muestra el estado de rastreo de la sesión actual.
- `/trace on` habilita las líneas de rastreo del complemento para la sesión actual.
- `/trace off` las deshabilita nuevamente.
- Las líneas de rastreo del complemento pueden aparecer en `/status` y como un mensaje de diagnóstico de seguimiento después de la respuesta normal del asistente.
- `/trace` no reemplaza a `/debug`; `/debug` todavía gestiona las anulaciones de configuración solo en tiempo de ejecución.
- `/trace` no reemplaza a `/verbose`; la salida detallada normal de herramientas/estado todavía pertenece a `/verbose`.

## Actualizaciones de configuración

`/config` escribe en tu configuración en disco (`openclaw.json`). Solo para propietarios. Deshabilitado por defecto; habilítelo con `commands.config: true`.

Ejemplos:

```
/config show
/config show messages.responsePrefix
/config get messages.responsePrefix
/config set messages.responsePrefix="[openclaw]"
/config unset messages.responsePrefix
```

<Note>La configuración se valida antes de escribir; los cambios no válidos se rechazan. Las actualizaciones de `/config` persisten entre reinicios.</Note>

## Actualizaciones de MCP

`/mcp` escribe las definiciones de servidores MCP gestionados por OpenClaw bajo `mcp.servers`. Solo para propietarios. Deshabilitado por defecto; habilítelo con `commands.mcp: true`.

Ejemplos:

```text
/mcp show
/mcp show context7
/mcp set context7={"command":"uvx","args":["context7-mcp"]}
/mcp unset context7
```

<Note>`/mcp` almacena la configuración en la configuración de OpenClaw, no en la configuración del proyecto del agente integrado. Los adaptadores de tiempo de ejecución deciden qué transportes son realmente ejecutables.</Note>

## Actualizaciones de complementos

`/plugins` permite a los operadores inspeccionar los complementos descubiertos y alternar la habilitación en la configuración. Los flujos de solo lectura pueden usar `/plugin` como alias. Deshabilitado por defecto; habilítelo con `commands.plugins: true`.

Ejemplos:

```text
/plugins
/plugins list
/plugin show context7
/plugins enable context7
/plugins disable context7
```

<Note>
- `/plugins list` y `/plugins show` usan el descubrimiento real de complementos contra el espacio de trabajo actual más la configuración en disco.
- `/plugins install` instala desde ClawHub, npm, git, directorios locales y archivos.
- `/plugins enable|disable` actualiza solo la configuración del complemento; no instala ni desinstala complementos.
- Los cambios de habilitar y deshabilitar recargan en caliente las superficies de tiempo de ejecución de complementos del Gateway para nuevos turnos del agente; la instalación reinicia los Gateways administrados automáticamente porque cambiaron los módulos de origen del complemento.

</Note>

## Notas de superficie

<AccordionGroup>
  <Accordion title="Sesiones por superficie">
    - Los **comandos de texto** se ejecutan en la sesión de chat normal (los MDs comparten `main`, los grupos tienen su propia sesión).
    - Los **comandos nativos** usan sesiones aisladas:
      - Discord: `agent:<agentId>:discord:slash:<userId>`
      - Slack: `agent:<agentId>:slack:slash:<userId>` (prefijo configurable vía `channels.slack.slashCommand.sessionPrefix`)
      - Telegram: `telegram:slash:<userId>` (apunta a la sesión de chat vía `CommandTargetSessionKey`)
    - **`/stop`** apunta a la sesión de chat activa para que pueda abortar la ejecución actual.

  </Accordion>
  <Accordion title="Slack specifics">
    `channels.slack.slashCommand` todavía es compatible para un solo comando de estilo `/openclaw`. Si habilitas `commands.native`, debes crear un comando de barra de Slack para cada comando integrado (mismos nombres que `/help`). Los menús de argumentos de comandos para Slack se entregan como botones efímeros de Block Kit.

    Excepción nativa de Slack: registra `/agentstatus` (no `/status`) porque Slack reserva `/status`. El texto `/status` todavía funciona en los mensajes de Slack.

  </Accordion>
</AccordionGroup>

## Preguntas secundarias BTW

`/btw` es una **pregunta lateral** rápida sobre la sesión actual. `/side` es un alias.

A diferencia del chat normal:

- usa la sesión actual como contexto de fondo,
- en las sesiones del arnés Codex, se ejecuta como un hilo lateral efímero de Codex con los
  permisos actuales de Codex y la superficie de herramienta nativa,
- en sesiones que no son de Codex, mantiene el comportamiento anterior de llamada lateral directa de un solo uso,
- no cambia el contexto de la sesión futura,
- no se escribe en el historial de transcripciones,
- se entrega como un resultado lateral en vivo en lugar de un mensaje normal del asistente.

Esto hace que `/btw` sea útil cuando quieres una aclaración temporal mientras la tarea principal continúa.

Ejemplo:

```text
/btw what are we doing right now?
/side what changed while the main run continued?
```

Consulta [BTW Side Questions](/es/tools/btw) para obtener detalles completos sobre el comportamiento y la experiencia de usuario del cliente.

## Relacionado

- [Creating skills](/es/tools/creating-skills)
- [Skills](/es/tools/skills)
- [Skills config](/es/tools/skills-config)
