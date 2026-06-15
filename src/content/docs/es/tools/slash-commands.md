---
title: "Comandos de barra"
sidebarTitle: "Comandos de barra"
summary: "Todos los comandos de barra, directivas y atajos en línea disponibles — configuración, enrutamiento y comportamiento por superficie."
read_when:
  - Using or configuring chat commands
  - Debugging command routing or permissions
  - Understanding how skill commands are registered
---

El Gateway maneja los comandos enviados como mensajes independientes que comienzan con `/`.
Los comandos de bash solo para host usan `! <cmd>` (con `/bash <cmd>` como alias).

Cuando una conversación está vinculada a una sesión de ACP, el texto normal se enruta al arnés de ACP.
Los comandos de administración del Gateway permanecen locales: `/acp ...` siempre alcanza
el controlador de comandos de OpenClaw, y `/status` más `/unfocus` se mantienen locales siempre que
el manejo de comandos esté habilitado para la superficie.

## Tres tipos de comandos

<CardGroup cols={3}>
  <Card title="Comandos" icon="terminal">
    Mensajes independientes de `/...` manejados por el Gateway. Deben enviarse como el único contenido en el mensaje.
  </Card>
  <Card title="Directivas" icon="sliders">
    `/think`, `/fast`, `/verbose`, `/trace`, `/reasoning`, `/elevated`, `/exec`, `/model`, `/queue` — se eliminan del mensaje antes de que el modelo lo vea. Persisten la configuración de la sesión cuando se envían solos; actúan como pistas en línea cuando se envían con otro texto.
  </Card>
  <Card title="Atajos en línea" icon="bolt">
    `/help`, `/commands`, `/status`, `/whoami` — se ejecutan inmediatamente y se eliminan antes de que el modelo vea el texto restante. Solo para remitentes autorizados.
  </Card>
</CardGroup>

<AccordionGroup>
  <Accordion title="Detalles del comportamiento de las directivas">
    - Las directivas se eliminan del mensaje antes de que el modelo lo vea. - En mensajes de **solo directivas** (el mensaje es solo directivas), estas persisten en la sesión y responden con una confirmación. - En mensajes de **chat normal** con otro texto, actúan como pistas en línea y **no** persisten en la configuración de la sesión. - Las directivas solo se aplican a **remitentes
    autorizados**. Si `commands.allowFrom` está configurado, es la única lista de permitidos utilizada; de lo contrario, la autorización proviene de las listas de permitidos/emparejamiento del canal más `commands.useAccessGroups`. Los remitentes no autorizados ven las directivas tratadas como texto sin formato.
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
  Activa el análisis de `/...` en los mensajes de chat. En superficies sin comandos nativos (WhatsApp, WebChat, Signal, iMessage, Google Chat, Microsoft Teams), los comandos de texto funcionan incluso cuando se establecen en `false`.
</ParamField>

<ParamField path="commands.native" type='boolean | "auto"' default='"auto"'>
  Registra comandos nativos. Automático: activado para Discord/Telegram; desactivado para Slack;
  ignorado para proveedores sin soporte nativo. Anular por canal con
  `channels.<provider>.commands.native`. En Discord, `false` omite el registro de comandos de barra;
  los comandos registrados previamente pueden permanecer visibles hasta que se eliminen.
</ParamField>

<ParamField path="commands.nativeSkills" type='boolean | "auto"' default='"auto"'>
  Registra comandos de habilidad de forma nativa cuando se admite. Automático: activado para
  Discord/Telegram; desactivado para Slack. Anular con
  `channels.<provider>.commands.nativeSkills`.
</ParamField>

<ParamField path="commands.bash" type="boolean" default="false">
  Habilita `! <cmd>` para ejecutar comandos de shell del host (alias `/bash <cmd>`). Requiere
  listas de permitidos `tools.elevated`.
</ParamField>

<ParamField path="commands.bashForegroundMs" type="number" default="2000">
  Cuánto tiempo espera bash antes de cambiar al modo en segundo plano (`0` pone en segundo plano inmediatamente).
</ParamField>

<ParamField path="commands.config" type="boolean" default="false">
  Habilita `/config` (lee/escribe `openclaw.json`). Solo para el propietario.
</ParamField>

<ParamField path="commands.mcp" type="boolean" default="false">
  Habilita `/mcp` (lee/escribe la configuración de MCP gestionada por OpenClaw bajo `mcp.servers`). Solo para el propietario.
</ParamField>

<ParamField path="commands.plugins" type="boolean" default="false">
  Habilita `/plugins` (descubrimiento/estado de complementos más instalación + habilitar/deshabilitar). Solo para el propietario para escrituras.
</ParamField>

<ParamField path="commands.debug" type="boolean" default="false">
  Habilita `/debug` (anulaciones de configuración solo en tiempo de ejecución). Solo para el propietario.
</ParamField>

<ParamField path="commands.restart" type="boolean" default="true">
  Habilita `/restart` y las acciones de herramientas de reinicio de la puerta de enlace.
</ParamField>

<ParamField path="commands.ownerAllowFrom" type="string[]">
  Lista de permitidos explícita del propietario para superficies de comandos solo para el propietario. Separada de `commands.allowFrom` y el acceso de emparejamiento por MD.
</ParamField>

<ParamField path="channels.<channel>.commands.enforceOwnerForCommands" type="boolean" default="false">
  Por canal: requiere identidad de propietario para comandos solo para el propietario. Cuando `true`, el remitente debe coincidir con `commands.ownerAllowFrom` o tener el alcance interno `operator.admin` . Una entrada de comodín `allowFrom` **no** es suficiente.
</ParamField>

<ParamField path="commands.ownerDisplay" type='"raw" | "hash"'>
  Controla cómo aparecen los identificadores de propietario en el mensaje del sistema.
</ParamField>

<ParamField path="commands.ownerDisplaySecret" type="string">
  Secreto HMAC utilizado cuando `commands.ownerDisplay: "hash"`.
</ParamField>

<ParamField path="commands.allowFrom" type="object">
  Lista blanca por proveedor para la autorización de comandos. Cuando se configura, es la **única** fuente de autorización para comandos y directivas. Use `"*"` para un valor predeterminado global; las claves específicas del proveedor lo anulan.
</ParamField>

<ParamField path="commands.useAccessGroups" type="boolean" default="true">
  Hace cumplir las listas blancas/políticas para los comandos cuando `commands.allowFrom` no está configurado.
</ParamField>

## Lista de comandos

Los comandos provienen de tres fuentes:

- **Integrados principales:** `src/auto-reply/commands-registry.shared.ts`
- **Comandos generados del dock:** `src/auto-reply/commands-registry.data.ts`
- **Comandos de complemento:** llamadas `registerCommand()` del complemento

La disponibilidad depende de las marcas de configuración, la superficie del canal y los complementos
instalados/habilitados.

### Comandos principales

<AccordionGroup>
  <Accordion title="Sesiones y ejecuciones">
    | Comando | Descripción |
    | --- | --- |
    | `/new [model]` | Archivar la sesión actual e iniciar una nueva |
    | `/reset [soft [message]]` | Restablecer la sesión actual en su lugar. `soft` mantiene la transcripción, elimina los identificadores de sesión del backend CLI reutilizados y vuelve a ejecutar el inicio |
    | `/compact [instructions]` | Compactar el contexto de la sesión. Consulte [Compactación](/es/concepts/compaction) |
    | `/stop` | Abortar la ejecución actual |
    | `/session idle <duration\|off>` | Gestionar la caducidad por inactividad del enlace de subprocesos |
    | `/session max-age <duration\|off>` | Gestionar la caducidad por antigüedad máxima del enlace de subprocesos |
    | `/export-session [path]` | Exportar la sesión actual a HTML. Alias: `/export` |
    | `/export-trajectory [path]` | Exportar un paquete de trayectoria JSONL para la sesión actual. Alias: `/trajectory` |

    <Note>
      La interfaz de usuario de control intercepta el comando escrito `/new` para crear y cambiar a una sesión de panel nueva, excepto cuando `session.dmScope: "main"` está configurado y el elemento principal actual es la sesión principal del agente; en ese caso, `/new` restablece la sesión principal en su lugar. El comando escrito `/reset` aún ejecuta el restablecimiento en su lugar del Gateway.
    </Note>

  </Accordion>

  <Accordion title="Control de modelo y ejecución">
    | Comando | Descripción |
    | --- | --- |
    | `/think <level\|default>` | Establece el nivel de pensamiento o borra la anulación de sesión. Alias: `/thinking`, `/t` |
    | `/verbose on\|off\|full` | Alterna la salida detallada. Alias: `/v` |
    | `/trace on\|off` | Alterna la salida de traza del complemento para la sesión actual |
    | `/fast [status\|on\|off\|default]` | Muestra, establece o borra el modo rápido |
    | `/reasoning [on\|off\|stream]` | Alterna la visibilidad del razonamiento. Alias: `/reason` |
    | `/elevated [on\|off\|ask\|full]` | Alterna el modo elevado. Alias: `/elev` |
    | `/exec host=<auto\|sandbox\|gateway\|node> security=<deny\|allowlist\|full> ask=<off\|on-miss\|always> node=<id>` | Muestra o establece los valores predeterminados de exec |
    | `/model [name\|#\|status]` | Muestra o establece el modelo |
    | `/models [provider] [page] [limit=<n>\|all]` | Lista los proveedores o modelos configurados/disponibles para autenticación |
    | `/queue <mode>` | Administra el comportamiento de la cola de ejecuciones activas. Consulta [Cola](/es/concepts/queue) y [Dirección de la cola](/es/concepts/queue-steering) |
    | `/steer <message>` | Inyecta orientación en la ejecución activa. Alias: `/tell`. Consulta [Dirección](/es/tools/steer) |

    <AccordionGroup>
      <Accordion title="seguridad de verbose / trace / fast / reasoning">
        - `/verbose` es para depuración — mantenlo desactivado en uso normal.
        - `/trace` revela solo líneas de traza/depuración propiedad del complemento; el charla detallada normal permanece desactivada.
        - `/fast on|off` persiste una anulación de sesión; usa la opción de la Interfaz de Sesiones `inherit` para borrarla.
        - `/fast` es específico del proveedor: OpenAI/Codex lo mapean a `service_tier=priority`; las solicitudes directas a Anthropic lo mapean a `service_tier=auto` o `standard_only`.
        - `/reasoning`, `/verbose` y `/trace` son arriesgados en entornos grupales; pueden revelar el razonamiento interno o diagnósticos de complementos. Mantenlos desactivados en chats grupales.

      </Accordion>
      <Accordion title="Detalles del cambio de modelo">
        - `/model` guarda el nuevo modelo inmediatamente en la sesión.
        - Si el agente está inactivo, la siguiente ejecución lo usará de inmediato.
        - Si hay una ejecución activa, el cambio se marca como pendiente y se aplica en el siguiente punto de reintento limpio.

      </Accordion>
    </AccordionGroup>

  </Accordion>

  <Accordion title="Descubrimiento y estado">
    | Comando | Descripción |
    | --- | --- |
    | `/help` | Mostrar el resumen de ayuda breve |
    | `/commands` | Mostrar el catálogo de comandos generado |
    | `/tools [compact\|verbose]` | Mostrar lo que el agente actual puede usar ahora mismo |
    | `/status` | Mostrar el estado de ejecución/tiempo de ejecución, tiempo de actividad de Gateway y del sistema, más uso/cuota del proveedor |
    | `/goal [status\|start\|pause\|resume\|complete\|block\|clear] ...` | Gestionar el [objetivo](/es/tools/goal) duradero de la sesión actual |
    | `/diagnostics [note]` | Flujo de informe de soporte solo para propietarios. Pide aprobación de ejecución cada vez |
    | `/crestodian <request>` | Ejecutar el asistente de configuración y reparación de Crestodian desde un MD de propietario |
    | `/tasks` | Listar tareas en segundo plano activas/recientes para la sesión actual |
    | `/context [list\|detail\|map\|json]` | Explicar cómo se ensambla el contexto |
    | `/whoami` | Mostrar su id. de remitente. Alias: `/id` |
    | `/usage off\|tokens\|full\|cost` | Controlar el pie de página de uso por respuesta o imprimir un resumen de costos local |
  </Accordion>

  <Accordion title="Habilidades, listas de permitidos, aprobaciones">
    | Comando | Descripción |
    | --- | --- |
    | `/skill <name> [input]` | Ejecutar una habilidad por nombre |
    | `/allowlist [list\|add\|remove] ...` | Gestionar entradas de la lista de permitidos. Solo texto |
    | `/approve <id> <decision>` | Resolver avisos de aprobación de ejecución o complemento |
    | `/btw <question>` | Hacer una pregunta lateral sin cambiar el contexto de la sesión. Alias: `/side`. Consulte [BTW](/es/tools/btw) |
  </Accordion>

  <Accordion title="Subagentes y ACP">
    | Comando | Descripción |
    | --- | --- |
    | `/subagents list\|log\|info` | Inspeccionar ejecuciones de subagentes para la sesión actual |
    | `/acp spawn\|cancel\|steer\|close\|sessions\|status\|set-mode\|set\|cwd\|permissions\|timeout\|model\|reset-options\|doctor\|install\|help` | Gestionar sesiones de ACP y opciones de tiempo de ejecución |
    | `/focus <target>` | Vincular el hilo de Discord actual o el tema de Telegram a un objetivo de sesión |
    | `/unfocus` | Eliminar la vinculación del hilo actual |
    | `/agents` | Listar agentes vinculados al hilo para la sesión actual |
  </Accordion>

<Accordion title="Escrituras solo para el propietario y administración">
  | Comando | Requiere | Descripción | | --- | --- | --- | | `/config show\|get\|set\|unset` | `commands.config: true` | Leer o escribir `openclaw.json`. Solo propietario | | `/mcp show\|get\|set\|unset` | `commands.mcp: true` | Leer o escribir configuración de servidor MCP gestionada por OpenClaw. Solo propietario | | `/plugins list\|inspect\|show\|get\|install\|enable\|disable` |
  `commands.plugins: true` | Inspeccionar o mutar el estado del complemento. Solo propietario para escrituras. Alias: `/plugin` | | `/debug show\|set\|unset\|reset` | `commands.debug: true` | Sobrescrituras de configuración solo de tiempo de ejecución. Solo propietario | | `/restart` | `commands.restart: true` (predeterminado) | Reiniciar OpenClaw | | `/send on\|off\|inherit` | owner | Establecer
  política de envío |
</Accordion>

  <Accordion title="Voz, TTS, control de canal">
    | Comando | Descripción |
    | --- | --- |
    | `/tts on\|off\|status\|chat\|latest\|provider\|limit\|summary\|audio\|help` | Controlar TTS. Consulte [TTS](/es/tools/tts) |
    | `/activation mention\|always` | Establecer el modo de activación de grupo |
    | `/bash <command>` | Ejecutar un comando de shell del host. Alias: `! <command>`. Requiere `commands.bash: true` |
    | `!poll [sessionId]` | Verificar un trabajo bash en segundo plano |
    | `!stop [sessionId]` | Detener un trabajo bash en segundo plano |
  </Accordion>
</AccordionGroup>

### Comandos Dock

Los comandos Dock cambian la ruta de respuesta de la sesión activa a otro canal vinculado.
Consulte [Canalización de canales](/es/concepts/channel-docking) para la configuración y solución de problemas.

Generado desde complementos de canal con soporte de comandos nativos:

- `/dock-discord` (alias: `/dock_discord`)
- `/dock-mattermost` (alias: `/dock_mattermost`)
- `/dock-slack` (alias: `/dock_slack`)
- `/dock-telegram` (alias: `/dock_telegram`)

Los comandos de Dock requieren `session.identityLinks`. El remitente de origen y el par de destino
deben estar en el mismo grupo de identidad.

### Comandos de complementos incluidos

| Comando                                                                                      | Descripción                                                                                                |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `/dreaming [on\|off\|status\|help]`                                                          | Alternñar el soñar de la memoria. Consulte [Dreaming](/es/concepts/dreaming)                               |
| `/pair [qr\|status\|pending\|approve\|cleanup\|notify]`                                      | Administrar el emparejamiento de dispositivos. Consulte [Pairing](/es/channels/pairing)                    |
| `/phone status\|arm ...\|disarm`                                                             | Activar temporalmente los comandos de nodo de teléfono de alto riesgo                                      |
| `/voice status\|list\|set <voiceId>`                                                         | Administrar configuración de voz de Talk. Nombre nativo de Discord: `/talkvoice`                           |
| `/card ...`                                                                                  | Enviar preajustes de tarjetas enriquecidas de LINE. Consulte [LINE](/es/channels/line)                     |
| `/codex status\|models\|threads\|resume\|compact\|review\|diagnostics\|account\|mcp\|skills` | Controlar el arnés del servidor de aplicaciones Codex. Consulte [Codex harness](/es/plugins/codex-harness) |

Solo para QQBot: `/bot-ping`, `/bot-version`, `/bot-help`, `/bot-upgrade`, `/bot-logs`

### Comandos de habilidades

Las habilidades invocables por el usuario se exponen como comandos de barra:

- `/skill <name> [input]` siempre funciona como el punto de entrada genérico.
- Las habilidades pueden registrarse como comandos directos (ej. `/prose` para OpenProse).
- El registro de comandos de habilidad nativos está controlado por `commands.nativeSkills` y
  `channels.<provider>.commands.nativeSkills`.
- Los nombres se sanitizan a `a-z0-9_` (máx. 32 caracteres); las colisiones obtienen sufijos numéricos.

<AccordionGroup>
  <Accordion title="Despacho de comandos de habilidades">
    Por defecto, los comandos de habilidades se envían al modelo como una solicitud normal.

    Las habilidades pueden declarar `command-dispatch: tool` para enrutar directamente a una herramienta
    (determinista, sin intervención del modelo). Ejemplo: `/prose` (complemento OpenProse)
    — ver [OpenProse](/es/prose).

  </Accordion>
  <Accordion title="Argumentos de comandos nativos">
    Discord usa autocompletado para opciones dinámicas y menús de botones cuando se omiten
    argumentos requeridos. Telegram y Slack muestran un menú de botones para comandos con
    opciones. Las opciones dinámicas se resuelven contra el modelo de la sesión de destino, por lo que las opciones
    específicas del modelo como los niveles de `/think` siguen la anulación de `/model` de la sesión.
  </Accordion>
</AccordionGroup>

## `/tools` — lo que el agente puede usar ahora

`/tools` responde a una pregunta en tiempo de ejecución: **lo que este agente puede usar justo ahora en esta
conversación** — no un catálogo de configuración estática.

```text
/tools         # compact view
/tools verbose # with short descriptions
```

Los resultados están limitados a la sesión. Cambiar el agente, el canal, el hilo, la autorización
del remitente o el modelo puede cambiar la salida. Para la edición de perfiles y anulaciones,
use el panel de Herramientas de la interfaz de usuario de Control o las superficies de configuración.

## `/model` — selección de modelo

```text
/model             # show model picker
/model list        # same
/model 3           # select by number from picker
/model openai/gpt-5.4
/model opus@anthropic:default
/model status      # detailed view with endpoint and API mode
```

En Discord, `/model` y `/models` abren un selector interactivo con menús desplegables de proveedor y
modelo. El selector respeta `agents.defaults.models`, incluyendo
entradas de `provider/*`.

## `/config` — escrituras de configuración en disco

<Note>Solo para el propietario. Deshabilitado por defecto — habilítelo con `commands.config: true`.</Note>

```text
/config show
/config show messages.responsePrefix
/config get messages.responsePrefix
/config set messages.responsePrefix="[openclaw]"
/config unset messages.responsePrefix
```

La configuración se valida antes de escribirse. Los cambios no válidos se rechazan. Las actualizaciones
de `/config`
persisten entre reinicios.

## `/mcp` — configuración del servidor MCP

<Note>Solo para el propietario. Deshabilitado por defecto — habilítelo con `commands.mcp: true`.</Note>

```text
/mcp show
/mcp show context7
/mcp set context7={"command":"uvx","args":["context7-mcp"]}
/mcp unset context7
```

`/mcp` almacena la configuración en la configuración de OpenClaw, no en la configuración del proyecto del agente integrado.

## `/debug` — anulaciones solo en tiempo de ejecución

<Note>Solo para el propietario. Desactivado de forma predeterminada — actívelo con `commands.debug: true`. Las anulaciones se aplican inmediatamente a las nuevas lecturas de configuración pero **no** se escriben en el disco.</Note>

```text
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

## `/plugins` — gestión de complementos

<Note>Solo para el propietario para escrituras. Desactivado de forma predeterminada — actívelo con `commands.plugins: true`.</Note>

```text
/plugins
/plugins list
/plugin show context7
/plugins enable context7
/plugins disable context7
/plugins install ./path/to/plugin
```

`/plugins enable|disable` actualiza la configuración del complemento y recarga en caliente el tiempo de ejecución del complemento Gateway para nuevos turnos del agente. `/plugins install` reinicia los Gateways administrados automáticamente porque cambiaron los módulos fuente del complemento.

## `/trace` — salida de traza del complemento

```text
/trace          # show current trace state
/trace on
/trace off
```

`/trace` revela las líneas de traza/depuración del complemento con ámbito de sesión sin el modo detallado completo. No reemplaza a `/debug` (anulaciones de tiempo de ejecución) ni a `/verbose` (salida de herramienta normal).

## `/btw` — preguntas laterales

`/btw` es una pregunta lateral rápida sobre el contexto de la sesión actual. Alias: `/side`.

```text
/btw what are we doing right now?
/side what changed while the main run continued?
```

A diferencia de un mensaje normal:

- Usa la sesión actual como contexto de fondo.
- En las sesiones de arnés Codex, se ejecuta como un hilo lateral efímero de Codex.
- **No** cambia el contexto futuro de la sesión.
- No se escribe en el historial de transcripciones.

Consulte [Preguntas laterales BTW](/es/tools/btw) para conocer el comportamiento completo.

## Notas de superficie

<AccordionGroup>
  <Accordion title="Ámbito de sesión por superficie">
    - **Comandos de texto:** se ejecutan en la sesión de chat normal (los MD comparten `main`, los grupos tienen su propia sesión).
    - **Comandos nativos de Discord:** `agent:<agentId>:discord:slash:<userId>`
    - **Comandos nativos de Slack:** `agent:<agentId>:slack:slash:<userId>` (prefijo configurable vía `channels.slack.slashCommand.sessionPrefix`)
    - **Comandos nativos de Telegram:** `telegram:slash:<userId>` (apunta a la sesión de chat vía `CommandTargetSessionKey`)
    - **`/stop`** apunta a la sesión de chat activa para abortar la ejecución actual.

  </Accordion>
  <Accordion title="Específicos de Slack">
    `channels.slack.slashCommand` admite un solo comando de estilo `/openclaw`.
    Con `commands.native: true`, cree un comando de barra de Slack por cada comando
    integrado. Registre `/agentstatus` (no `/status`) porque Slack reserva
    `/status`. El texto `/status` todavía funciona en los mensajes de Slack.
  </Accordion>
  <Accordion title="Atajos de ruta rápida y en línea">
    - Los mensajes solo de comando de remitentes en la lista de permitidos se manejan inmediatamente (omitir cola + modelo).
    - Los atajos en línea (`/help`, `/commands`, `/status`, `/whoami`) también funcionan incrustados en mensajes normales y se eliminan antes de que el modelo vea el texto restante.
    - Los mensajes solo de comando no autorizados se ignoran silenciosamente; los tokens `/...` en línea se tratan como texto plano.

  </Accordion>
  <Accordion title="Notas sobre argumentos">
    - Los comandos aceptan un `:` opcional entre el comando y los argumentos (`/think: high`, `/send: on`).
    - `/new <model>` acepta un alias de modelo, `provider/model`, o un nombre de proveedor (coincidencia aproximada); si no hay coincidencia, el texto se trata como el cuerpo del mensaje.
    - `/allowlist add|remove` requiere `commands.config: true` y respeta el `configWrites` del canal.

  </Accordion>
</AccordionGroup>

## Uso y estado del proveedor

- **Uso/cuota del proveedor** (p. ej., "Claude 80% restante") aparece en `/status` para el proveedor del modelo actual cuando el seguimiento de uso está habilitado.
- **Líneas de tokens/caché** en `/status` pueden volver a la entrada de uso de la transcripción más reciente cuando la instantánea de la sesión en vivo es escasa.
- **Ejecución vs tiempo de ejecución:** `/status` informa `Execution` para la ruta efectiva del sandbox y `Runtime` sobre quién está ejecutando la sesión: `OpenClaw Default`, `OpenAI Codex`, un backend de CLI o un backend de ACP.
- **Tokens/costo por respuesta:** controlado por `/usage off|tokens|full`.
- `/model status` se trata de modelos/autenticación/puntos finales, no de uso.

## Relacionado

<CardGroup cols={2}>
  <Card title="Habilidades" href="/es/tools/skills" icon="puzzle-piece">
    Cómo se registran y controlan los comandos de barra de habilidades.
  </Card>
  <Card title="Creación de habilidades" href="/es/tools/creating-skills" icon="hammer">
    Cree una habilidad que registre su propio comando de barra.
  </Card>
  <Card title="BTW" href="/es/tools/btw" icon="comments">
    Preguntas secundarias sin cambiar el contexto de la sesión.
  </Card>
  <Card title="Dirigir" href="/es/tools/steer" icon="compass">
    Guíe al agente durante la ejecución con `/steer`.
  </Card>
</CardGroup>
