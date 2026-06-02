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
    - `/new [model]` archiva la sesión actual e inicia una nueva; `/reset` borra la sesión actual en su lugar. No son alias.
    - La interfaz de usuario de control intercepta `/new` escrito para crear y cambiar a una nueva sesión del panel, excepto cuando `session.dmScope: "main"` está configurado y el padre actual es la sesión principal del agente; en ese caso, `/new` restablece la sesión principal en su lugar. `/reset` escrito aún ejecuta el restablecimiento en su lugar del Gateway.
    - `/reset soft [message]` mantiene la transcripción actual, elimina los ids de sesión del backend de CLI reutilizados y vuelve a ejecutar la carga de inicio/system-prompt en su lugar.
    - `/compact [instructions]` compacta el contexto de la sesión. Consulte [Compaction](/es/concepts/compaction).
    - `/stop` aborta la ejecución actual.
    - `/session idle <duration|off>` y `/session max-age <duration|off>` gestionan la caducidad del enlace de hilos.
    - `/export-session [path]` exporta la sesión actual a HTML. Alias: `/export`.
    - `/export-trajectory [path]` solicita aprobación de ejecución y luego exporta un [trajectory bundle](/es/tools/trajectory) JSONL para la sesión actual. Úselo cuando necesite la línea de tiempo del prompt, la herramienta y la transcripción para una sesión de OpenClaw. En chats grupales, la solicitud de aprobación y el resultado de la exportación se envían privadamente al propietario. Alias: `/trajectory`.

  </Accordion>
  <Accordion title="Modelo y controles de ejecución">
    - `/think <level|default>` establece el nivel de pensamiento o borra la anulación de la sesión. Las opciones provienen del perfil del proveedor del modelo activo; los niveles comunes son `off`, `minimal`, `low`, `medium` y `high`, con niveles personalizados como `xhigh`, `adaptive`, `max` o binario `on` solo cuando sea compatible. Alias: `/thinking`, `/t`.
    - `/verbose on|off|full` alterna la salida detallada. Los remitentes externos autorizados pueden persistir la anulación de la sesión; los clientes internos de gateway/webchat necesitan `operator.admin`. Alias: `/v`.
    - `/trace on|off` alterna la salida de traza del complemento para la sesión actual.
    - `/fast [status|on|off|default]` muestra, establece o borra el modo rápido.
    - `/reasoning [on|off|stream]` alterna la visibilidad del razonamiento. Alias: `/reason`.
    - `/elevated [on|off|ask|full]` alterna el modo elevado. Alias: `/elev`.
    - `/exec host=<auto|sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>` muestra o establece los valores predeterminados de ejecución.
    - `/model [name|#|status]` muestra o establece el modelo.
    - `/models [provider] [page] [limit=<n>|size=<n>|all]` enumera los proveedores configurados/disponibles para autenticación o los modelos de un proveedor; añada `all` para navegar por el catálogo completo de ese proveedor. Las entradas `provider/*` en `agents.defaults.models` hacen que `/model` y `/models` muestren solo los modelos descubiertos para esos proveedores.
    - `/queue <mode>` gestiona el comportamiento de la cola de ejecución activa (`steer`, `followup`, `collect`, `interrupt`) más opciones como `debounce:0.5s cap:25 drop:summarize`; `/queue default` o `/queue reset` borra la anulación de la sesión. Los indicaciones durante la ejecución guían de forma predeterminada sin una directiva de cola. Consulte [Cola de comandos](/es/concepts/queue) y [Cola de dirección](/es/concepts/queue-steering).
    - `/steer <message>` inyecta orientación en la ejecución activa para la sesión actual, independientemente del modo `/queue`. Si la dirección no está disponible o la sesión está inactiva, `<message>` continúa como una indicación normal. Alias: `/tell`. Consulte [Dirección](/es/tools/steer).

  </Accordion>
  <Accordion title="Descubrimiento y estado">
    - `/help` muestra el resumen breve de ayuda.
    - `/commands` muestra el catálogo de comandos generado.
    - `/tools [compact|verbose]` muestra lo que el agente actual puede usar ahora mismo.
    - `/status` muestra el estado de ejecución/tiempo de ejecución, el tiempo de actividad de Gateway y del sistema, más el uso/cuota del proveedor cuando esté disponible.
    - `/goal [status] | /goal start <objective> | /goal pause|resume|complete|block|clear` gestiona el [objetivo](/es/tools/goal) duradero de la sesión actual.
    - `/diagnostics [note]` es el flujo de informe de soporte solo para propietarios para errores de Gateway y ejecuciones del arnés Codex. Pide aprobación de ejecución explícita cada vez antes de ejecutar `openclaw gateway diagnostics export --json`; no apruebes diagnósticos con una regla de permitir todo. Después de la aprobación, envía un informe pegable con la ruta del paquete local, el resumen del manifiesto, notas de privacidad e identificadores de sesión relevantes. En chats grupales, el mensaje de aprobación y el informe van al propietario de forma privada. Cuando la sesión activa usa el arnés OpenAI Codex, la misma aprobación también envía comentarios relevantes de Codex a los servidores de OpenAI y la respuesta completada enumera los identificadores de sesión de OpenClaw, los identificadores de hilo de Codex y los comandos `codex resume <thread-id>`. Consulte [Exportación de diagnósticos](/es/gateway/diagnostics).
    - `/crestodian <request>` ejecuta el asistente de configuración y reparación de Crestodian desde un MD de propietario.
    - `/tasks` enumera las tareas en segundo plano activas/recientes para la sesión actual.
    - `/context [list|detail|map|json]` explica cómo se ensambla el contexto. `map` envía una imagen de treemap del contexto de la sesión actual.
    - `/whoami` muestra su identificador de remitente. Alias: `/id`.
    - `/usage off|tokens|full|cost` controla el pie de página de uso por respuesta o imprime un resumen de costos local.

  </Accordion>
  <Accordion title="Habilidades, listas de permitidos, aprobaciones">
    - `/skill <name> [input]` ejecuta una habilidad por nombre.
    - `/allowlist [list|add|remove] ...` gestiona las entradas de la lista de permitidos. Solo texto.
    - `/approve <id> <decision>` resuelve las indicaciones de aprobación de ejecución o complementos.
    - `/btw <question>` hace una pregunta lateral sin cambiar el contexto de la sesión futura. Alias: `/side`. Consulte [BTW](/es/tools/btw).

  </Accordion>
  <Accordion title="Subagentes y ACP">
    - `/subagents list|log|info` inspecciona las ejecuciones de subagentes para la sesión actual.
    - `/acp spawn|cancel|steer|close|sessions|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|help` gestiona las sesiones de ACP y las opciones de tiempo de ejecución.
    - `/focus <target>` vincula el hilo de Discord actual o el tema/conversación de Telegram a un objetivo de sesión.
    - `/unfocus` elimina el vínculo actual.
    - `/agents` enumera los agentes vinculados al hilo para la sesión actual.

  </Accordion>
  <Accordion title="Escrituras exclusivas para el propietario y administración">
    - `/config show|get|set|unset` lee o escribe `openclaw.json`. Solo propietario. Requiere `commands.config: true`.
    - `/mcp show|get|set|unset` lee o escribe la configuración del servidor MCP gestionada por OpenClaw bajo `mcp.servers`. Solo propietario. Requiere `commands.mcp: true`.
    - `/plugins list|inspect|show|get|install|enable|disable` inspecciona o modifica el estado de los complementos. `/plugin` es un alias. Solo propietario para escrituras. Requiere `commands.plugins: true`.
    - `/debug show|set|unset|reset` gestiona las anulaciones de configuración solo de tiempo de ejecución. Solo propietario. Requiere `commands.debug: true`.
    - `/restart` reinicia OpenClaw cuando está habilitado. Predeterminado: habilitado; establezca `commands.restart: false` para deshabilitarlo.
    - `/send on|off|inherit` establece la política de envío. Solo propietario.

  </Accordion>
  <Accordion title="Voz, TTS, control de canal">
    - `/tts on|off|status|chat|latest|provider|limit|summary|audio|help` controla el TTS. Consulte [TTS](/es/tools/tts).
    - `/activation mention|always` establece el modo de activación de grupo.
    - `/bash <command>` ejecuta un comando de shell del host. Solo texto. Alias: `! <command>`. Requiere listas de permitidos de `commands.bash: true` y `tools.elevated`.
    - `!poll [sessionId]` verifica un trabajo bash en segundo plano.
    - `!stop [sessionId]` detiene un trabajo bash en segundo plano.

  </Accordion>
</AccordionGroup>

### Comandos de muelle generados

Los comandos de acoplamiento cambian la ruta de respuesta de la sesión actual a otro canal vinculado. Consulte [Acoplamiento de canales](/es/concepts/channel-docking) para obtener instrucciones de configuración, ejemplos y solución de problemas.

Los comandos Dock se generan a partir de complementos de canal con soporte de comandos nativos. Conjunto incluido actual:

- `/dock-discord` (alias: `/dock_discord`)
- `/dock-mattermost` (alias: `/dock_mattermost`)
- `/dock-slack` (alias: `/dock_slack`)
- `/dock-telegram` (alias: `/dock_telegram`)

Utilice los comandos Dock desde un chat directo para cambiar la ruta de respuesta de la sesión actual a otro canal vinculado. El agente mantiene el mismo contexto de sesión, pero las respuestas futuras de esa sesión se entregan al par del canal seleccionado.

Los comandos de acoplamiento requieren `session.identityLinks`. El remitente de origen y el par de destino deben estar en el mismo grupo de identidad, por ejemplo `["telegram:123", "discord:456"]`. Si un usuario de Telegram con id `123` envía `/dock_discord`, OpenClaw almacena `lastChannel: "discord"` y `lastTo: "456"` en la sesión activa. Si el remitente no está vinculado a un par de Discord, el comando responde con una sugerencia de configuración en lugar de pasar al chat normal.

El acoplamiento solo cambia la ruta de la sesión activa. No crea cuentas de canal, otorga acceso, omite listas de permitidos del canal ni mueve el historial de transcripciones a otra sesión. Use `/dock-telegram`, `/dock-slack`, `/dock-mattermost` u otro comando de acoplamiento generado para cambiar la ruta nuevamente.

### Comandos de plugins incluidos

Los plugins incluidos pueden agregar más comandos de barra. Comandos incluidos actuales en este repositorio:

- `/dreaming [on|off|status|help]` activa o desactiva la soñación de la memoria. Consulte [Soñación](/es/concepts/dreaming).
- `/pair [qr|status|pending|approve|cleanup|notify]` gestiona el flujo de vinculación/configuración de dispositivos. Consulte [Vinculación](/es/channels/pairing).
- `/phone status|arm <camera|screen|writes|all> [duration]|disarm` arma temporalmente los comandos del nodo de teléfono de alto riesgo.
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
- el registro de comandos de habilidad nativos está controlado por `commands.nativeSkills` y `channels.<provider>.commands.nativeSkills`.
- las especificaciones de comandos pueden proporcionar `descriptionLocalizations` para superficies nativas que admiten descripciones localizadas, incluyendo Discord.

<AccordionGroup>
  <Accordion title="Notas sobre argumentos y analizadores">
    - Los comandos aceptan un `:` opcional entre el comando y los argumentos (ej. `/think: high`, `/send: on`, `/help:`).
    - `/new <model>` acepta un alias de modelo, `provider/model`, o un nombre de proveedor (coincidencia aproximada); si no hay coincidencia, el texto se trata como el cuerpo del mensaje.
    - Para un desglose completo del uso del proveedor, use `openclaw status --usage`.
    - `/allowlist add|remove` requiere `commands.config=true` y respeta el `configWrites` del canal.
    - En canales multicuenta, `/allowlist --account <id>` y `/config set channels.<provider>.accounts.<id>...` con destino de configuración también respetan el `configWrites` de la cuenta de destino.
    - `/usage` controla el pie de página de uso por respuesta; `/usage cost` imprime un resumen de costos local desde los registros de sesión de OpenClaw.
    - `/restart` está habilitado por defecto; establezca `commands.restart: false` para deshabilitarlo.
    - `/plugins install <spec>` acepta las mismas especificaciones de complemento que `openclaw plugins install`: ruta/archivo local, paquete npm, `git:<repo>`, o `clawhub:<pkg>`. Los Gateways administrados se reinician automáticamente porque cambiaron los módulos de origen del complemento.
    - `/plugins enable|disable` actualiza la configuración del complemento y activa la recarga del complemento del Gateway para nuevos turnos del agente.

  </Accordion>
  <Accordion title="Comportamiento específico del canal">
    - Comando nativo solo de Discord: `/vc join|leave|status` controla los canales de voz (no disponible como texto). `join` requiere un gremio y un canal de voz/escenario seleccionado. Requiere `channels.discord.voice` y comandos nativos.
    - Comandos de vinculación de hilos de Discord (`/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age`) requieren que las vinculaciones efectivas de hilos estén habilitadas (`session.threadBindings.enabled` y/o `channels.discord.threadBindings.enabled`).
    - Referencia de comandos y comportamiento en tiempo de ejecución de ACP: [agentes ACP](/es/tools/acp-agents).

  </Accordion>
  <Accordion title="Verbose / trace / fast / seguridad del razonamiento">
    - `/verbose` está diseñado para la depuración y una visibilidad adicional; manténgalo **desactivado** en el uso normal.
    - `/trace` es más limitado que `/verbose`: solo revela las líneas de traza/depuración propiedad de los complementos y mantiene desactivado el chat verbose normal de las herramientas.
    - `/fast on|off` persiste una anulación de sesión. Utilice la opción `inherit` de la IU de Sesiones para borrarla y volver a los valores predeterminados de configuración.
    - `/fast` es específico del proveedor: OpenAI/OpenAI Codex lo asignan a `service_tier=priority` en los puntos finales de Responses nativos, mientras que las solicitudes públicas directas de Anthropic, incluido el tráfico autenticado con OAuth enviado a `api.anthropic.com`, lo asignan a `service_tier=auto` o `standard_only`. Consulte [OpenAI](/es/providers/openai) y [Anthropic](/es/providers/anthropic).
    - Los resúmenes de fallos de herramientas aún se muestran cuando es pertinente, pero el texto detallado del fallo solo se incluye cuando `/verbose full` está activado.
    - `/reasoning`, `/verbose` y `/trace` son arriesgados en entornos grupales: pueden revelar razonamiento interno, resultados de herramientas o diagnósticos de complementos que no tenía intención de exponer. Es preferible dejarlos desactivados, especialmente en chats grupales.

  </Accordion>
  <Accordion title="Cambio de modelo">
    - `/model` persiste el nuevo modelo de sesión inmediatamente.
    - Si el agente está inactivo, la siguiente ejecución lo usa de inmediato.
    - Si una ejecución ya está activa, OpenClaw marca un cambio en vivo como pendiente y solo se reinicia en el nuevo modelo en un punto de reintento limpio.
    - Si la actividad de la herramienta o la salida de respuesta ya ha comenzado, el cambio pendiente puede permanecer en cola hasta una oportunidad de reintento posterior o el siguiente turno del usuario.
    - En la TUI local, `/crestodian [request]` regresa de la TUI del agente normal a Crestodian. Esto es independiente del modo de rescate del canal de mensajes y no otorga autoridad de configuración remota.

  </Accordion>
  <Accordion title="Acceso rápido y atajos en línea">
    - **Acceso rápido:** los mensajes que solo contienen comandos de remitentes autorizados se manejan inmediatamente (sin cola ni modelo).
    - **Filtrado por mención de grupo:** los mensajes que solo contienen comandos de remitentes autorizados omiten los requisitos de mención.
    - **Atajos en línea (solo para remitentes autorizados):** ciertos comandos también funcionan cuando se incrustan en un mensaje normal y se eliminan antes de que el modelo vea el texto restante.
      - Ejemplo: `hey /status` activa una respuesta de estado y el texto restante continúa a través del flujo normal.
    - Actualmente: `/help`, `/commands`, `/status`, `/whoami` (`/id`).
    - Los mensajes que solo contienen comandos no autorizados se ignoran silenciosamente y los tokens `/...` en línea se tratan como texto plano.

  </Accordion>
  <Accordion title="Comandos de habilidades y argumentos nativos">
    - **Comandos de habilidades:** las habilidades `user-invocable` se exponen como comandos de barra. Los nombres se sanean a `a-z0-9_` (máx. 32 caracteres); las colisiones obtienen sufijos numéricos (p. ej., `_2`).
      - `/skill <name> [input]` ejecuta una habilidad por nombre (útil cuando los límites de comandos nativos impiden comandos por habilidad).
      - De forma predeterminada, los comandos de habilidades se reenvían al modelo como una solicitud normal.
      - Las habilidades pueden declarar opcionalmente `command-dispatch: tool` para enrutar el comando directamente a una herramienta (determinista, sin modelo).
      - Ejemplo: `/prose` (complemento OpenProse) — consulte [OpenProse](/es/prose).
    - **Argumentos de comandos nativos:** Discord usa autocompletar para opciones dinámicas (y menús de botones cuando omite argumentos requeridos). Telegram y Slack muestran un menú de botones cuando un comando admite elecciones y omite el argumento. Las elecciones dinámicas se resuelven contra el modelo de sesión de destino, por lo que las opciones específicas del modelo, como los niveles de `/think`, siguen la invalidación de `/model` de esa sesión.

  </Accordion>
</AccordionGroup>

## `/tools`

`/tools` responde a una pregunta de tiempo de ejecución, no a una pregunta de configuración: **lo que este agente puede usar ahora mismo en esta conversación**.

- El `/tools` predeterminado es compacto y está optimizado para un escaneo rápido.
- `/tools verbose` añade descripciones breves.
- Las superficies de comandos nativos que soportan argumentos exponen el mismo interruptor de modo que `compact|verbose`.
- Los resultados están limitados a la sesión, por lo que cambiar el agente, el canal, el hilo, la autorización del remitente o el modelo puede cambiar la salida.
- `/tools` incluye herramientas que son realmente accesibles en tiempo de ejecución, incluyendo herramientas principales, herramientas de plugin conectadas y herramientas propiedad del canal.

Para la edición de perfiles y anulaciones, utilice el panel de herramientas de la Interfaz de Control (Control UI) o las superficies de configuración/catálogo en lugar de tratar `/tools` como un catálogo estático.

## Superficies de uso (qué se muestra dónde)

- El **Uso/cuota del proveedor** (ejemplo: "Claude 80% restante") aparece en `/status` para el proveedor del modelo actual cuando el seguimiento de uso está habilitado. OpenClaw normaliza las ventanas del proveedor a `% left`; para MiniMax, los campos de porcentaje de solo restante se invierten antes de mostrarse, y las respuestas de `model_remains` prefieren la entrada del modelo de chat más una etiqueta de plan etiquetada con el modelo.
- Las **Líneas de token/caché** en `/status` pueden recurrir a la última entrada de uso de la transcripción cuando la instantánea de la sesión en vivo es escasa. Los valores en vivo existentes distintos de cero siguen teniendo prioridad, y el recurso de respaldo de la transcripción también puede recuperar la etiqueta del modelo de tiempo de ejecución activo más un total orientado al prompt mayor cuando los totales almacenados faltan o son menores.
- **Ejecución vs tiempo de ejecución:** `/status` informa `Execution` para la ruta efectiva del sandbox y `Runtime` sobre quién está ejecutando realmente la sesión: `OpenClaw Default`, `OpenAI Codex`, un backend CLI, o un backend ACP.
- Los **Tokens/coste por respuesta** están controlados por `/usage off|tokens|full` (añadido a las respuestas normales).
- `/model status` trata sobre **modelos/autenticación/puntos de conexión**, no sobre el uso.

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

- `/model` y `/model list` muestran un selector numerado y compacto (familia de modelo + proveedores disponibles).
- En Discord, `/model` y `/models` abren un selector interactivo con menús desplegables de proveedor y modelo, además de un paso de envío. El selector respeta `agents.defaults.models`, incluidas las entradas `provider/*`, por lo que el descubrimiento con ámbito de proveedor puede mantener el selector por debajo del límite de 25 opciones de componente de Discord.
- `/model <#>` selecciona de ese selector (y prefiere el proveedor actual cuando es posible).
- `/model status` muestra la vista detallada, incluido el endpoint del proveedor configurado (`baseUrl`) y el modo de API (`api`) cuando está disponible.

## Invalidaciones de depuración

`/debug` te permite establecer anulaciones de configuración **solo en tiempo de ejecución** (memoria, no disco). Solo para propietarios. Desactivado por defecto; actívalo con `commands.debug: true`.

Ejemplos:

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

<Note>Las anulaciones se aplican inmediatamente a las nuevas lecturas de configuración, pero **no** se escriben en `openclaw.json`. Usa `/debug reset` para borrar todas las anulaciones y volver a la configuración en disco.</Note>

## Salida de traza de complementos

`/trace` te permite alternar **líneas de seguimiento/depuración de complementos con ámbito de sesión** sin activar el modo completo detallado.

Ejemplos:

```text
/trace
/trace on
/trace off
```

Notas:

- `/trace` sin argumentos muestra el estado de seguimiento de la sesión actual.
- `/trace on` activa las líneas de seguimiento del complemento para la sesión actual.
- `/trace off` las desactiva de nuevo.
- Las líneas de seguimiento del complemento pueden aparecer en `/status` y como un mensaje de diagnóstico de seguimiento después de la respuesta normal del asistente.
- `/trace` no reemplaza a `/debug`; `/debug` aún gestiona las anulaciones de configuración solo en tiempo de ejecución.
- `/trace` no reemplaza a `/verbose`; la salida normal y detallada de herramientas/estado todavía pertenece a `/verbose`.

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

<Note>La configuración se valida antes de escribirse; los cambios no válidos se rechazan. Las actualizaciones de `/config` persisten tras los reinicios.</Note>

## Actualizaciones de MCP

`/mcp` escribe definiciones de servidores MCP gestionados por OpenClaw bajo `mcp.servers`. Solo para propietarios. Deshabilitado por defecto; habilítelo con `commands.mcp: true`.

Ejemplos:

```text
/mcp show
/mcp show context7
/mcp set context7={"command":"uvx","args":["context7-mcp"]}
/mcp unset context7
```

<Note>`/mcp` almacena la configuración en la configuración de OpenClaw, no en la configuración del proyecto del agente integrado. Los adaptadores de tiempo de ejecución deciden qué transportes son realmente ejecutables.</Note>

## Actualizaciones de complementos

`/plugins` permite a los operadores inspeccionar los complementos descubiertos y alternar la habilitación en la configuración. Los flujos de solo lectura pueden usar `/plugin` como alias. Deshabilitado de forma predeterminada; habilítelo con `commands.plugins: true`.

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
- `/plugins install` se instala desde ClawHub, npm, git, directorios locales y archivos.
- `/plugins enable|disable` actualiza solo la configuración del complemento; no instala ni desinstala complementos.
- Los cambios de habilitar y deshabilitar recargan en caliente las superficies de tiempo de ejecución de los complementos de Gateway para nuevos turnos de agente; la instalación reinicia automáticamente las Gateways administradas porque cambiaron los módulos de origen de los complementos.

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
  <Accordion title="Específicos de Slack">
    `channels.slack.slashCommand` todavía es compatible con un solo comando de estilo `/openclaw`. Si habilita `commands.native`, debe crear un comando de barra de Slack por cada comando integrado (mismos nombres que `/help`). Los menús de argumentos de comandos para Slack se entregan como botones efímeros de Block Kit.

    Excepción nativa de Slack: registre `/agentstatus` (no `/status`) porque Slack reserva `/status`. El texto `/status` todavía funciona en los mensajes de Slack.

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

Esto hace que `/btw` sea útil cuando deseas una aclaración temporal mientras la tarea principal continúa.

Ejemplo:

```text
/btw what are we doing right now?
/side what changed while the main run continued?
```

Consulta [BTW Side Questions](/es/tools/btw) para obtener detalles completos sobre el comportamiento y la experiencia de usuario del cliente.

## Relacionado

- [Creación de habilidades](/es/tools/creating-skills)
- [Habilidades](/es/tools/skills)
- [Configuración de habilidades](/es/tools/skills-config)
