---
summary: "Referencia de la CLI de OpenClaw para `openclaw` comandos, subcomandos y opciones"
read_when:
  - Adding or modifying CLI commands or options
  - Documenting new command surfaces
title: "Referencia de la CLI"
---

# Referencia de la CLI

Esta página describe el comportamiento actual de la CLI. Si los comandos cambian, actualice este documento.

## Páginas de comandos

- [`setup`](/es/cli/setup)
- [`onboard`](/es/cli/onboard)
- [`configure`](/es/cli/configure)
- [`config`](/es/cli/config)
- [`completion`](/es/cli/completion)
- [`doctor`](/es/cli/doctor)
- [`dashboard`](/es/cli/dashboard)
- [`backup`](/es/cli/backup)
- [`reset`](/es/cli/reset)
- [`uninstall`](/es/cli/uninstall)
- [`update`](/es/cli/update)
- [`message`](/es/cli/message)
- [`agent`](/es/cli/agent)
- [`agents`](/es/cli/agents)
- [`acp`](/es/cli/acp)
- [`status`](/es/cli/status)
- [`health`](/es/cli/health)
- [`sessions`](/es/cli/sessions)
- [`gateway`](/es/cli/gateway)
- [`logs`](/es/cli/logs)
- [`system`](/es/cli/system)
- [`models`](/es/cli/models)
- [`memory`](/es/cli/memory)
- [`directory`](/es/cli/directory)
- [`nodes`](/es/cli/nodes)
- [`devices`](/es/cli/devices)
- [`node`](/es/cli/node)
- [`approvals`](/es/cli/approvals)
- [`sandbox`](/es/cli/sandbox)
- [`tui`](/es/cli/tui)
- [`browser`](/es/cli/browser)
- [`cron`](/es/cli/cron)
- [`dns`](/es/cli/dns)
- [`docs`](/es/cli/docs)
- [`hooks`](/es/cli/hooks)
- [`webhooks`](/es/cli/webhooks)
- [`pairing`](/es/cli/pairing)
- [`qr`](/es/cli/qr)
- [`plugins`](/es/cli/plugins) (comandos de complemento)
- [`channels`](/es/cli/channels)
- [`security`](/es/cli/security)
- [`secrets`](/es/cli/secrets)
- [`skills`](/es/cli/skills)
- [`daemon`](/es/cli/daemon) (alias heredado para comandos de servicio de puerta de enlace)
- [`clawbot`](/es/cli/clawbot) (espacio de nombres de alias heredado)
- [`voicecall`](/es/cli/voicecall) (complemento; si está instalado)

## Marcas globales

- `--dev`: aislar el estado bajo `~/.openclaw-dev` y cambiar los puertos predeterminados.
- `--profile <name>`: aislar el estado bajo `~/.openclaw-<name>`.
- `--no-color`: deshabilitar colores ANSI.
- `--update`: abreviatura de `openclaw update` (solo instalaciones desde código fuente).
- `-V`, `--version`, `-v`: imprimir la versión y salir.

## Estilo de salida

- Los colores ANSI y los indicadores de progreso solo se representan en sesiones TTY.
- Los hipervínculos OSC-8 se representan como enlaces en los que se puede hacer clic en las terminales compatibles; de lo contrario, se recurre a URL sin formato.
- `--json` (y `--plain` cuando se admite) desactiva el estilo para una salida limpia.
- `--no-color` desactiva el estilo ANSI; `NO_COLOR=1` también se respeta.
- Los comandos de larga duración muestran un indicador de progreso (OSC 9;4 cuando se admite).

## Paleta de colores

OpenClaw usa una paleta langosta para la salida de la CLI.

- `accent` (#FF5A2D): encabezados, etiquetas, resaltados principales.
- `accentBright` (#FF7A3D): nombres de comandos, énfasis.
- `accentDim` (#D14A22): texto de resaltado secundario.
- `info` (#FF8A5B): valores informativos.
- `success` (#2FBF71): estados de éxito.
- `warn` (#FFB020): advertencias, alternativas, atención.
- `error` (#E23D2D): errores, fallos.
- `muted` (#8B7F77): menos énfasis, metadatos.

Fuente de verdad de la paleta: `src/terminal/palette.ts` (la "paleta langosta").

## Árbol de comandos

```
openclaw [--dev] [--profile <name>] <command>
  setup
  onboard
  configure
  config
    get
    set
    unset
    file
    validate
  completion
  doctor
  dashboard
  backup
    create
    verify
  security
    audit
  secrets
    reload
    audit
    configure
    apply
  reset
  uninstall
  update
  channels
    list
    status
    logs
    add
    remove
    login
    logout
  directory
  skills
    list
    info
    check
  plugins
    list
    inspect
    install
    uninstall
    update
    enable
    disable
    doctor
    marketplace list
  memory
    status
    index
    search
  message
    send
    broadcast
  agent
  agents
    list
    add
    delete
  acp
  status
  health
  sessions
  gateway
    call
    health
    status
    probe
    discover
    install
    uninstall
    start
    stop
    restart
    run
  daemon
    status
    install
    uninstall
    start
    stop
    restart
  logs
  system
    event
    heartbeat last|enable|disable
    presence
  models
    list
    status
    set
    set-image
    aliases list|add|remove
    fallbacks list|add|remove|clear
    image-fallbacks list|add|remove|clear
    scan
    auth add|setup-token|paste-token
    auth order get|set|clear
  sandbox
    list
    recreate
    explain
  cron
    status
    list
    add
    edit
    rm
    enable
    disable
    runs
    run
  nodes
  devices
  node
    run
    status
    install
    uninstall
    start
    stop
    restart
  approvals
    get
    set
    allowlist add|remove
  browser
    status
    start
    stop
    reset-profile
    tabs
    open
    focus
    close
    profiles
    create-profile
    delete-profile
    screenshot
    snapshot
    navigate
    resize
    click
    type
    press
    hover
    drag
    select
    upload
    fill
    dialog
    wait
    evaluate
    console
    pdf
  hooks
    list
    info
    check
    enable
    disable
    install
    update
  webhooks
    gmail setup|run
  pairing
    list
    approve
  qr
  clawbot
    qr
  docs
  dns
    setup
  tui
```

Nota: los complementos pueden agregar comandos de nivel superior adicionales (por ejemplo, `openclaw voicecall`).

## Seguridad

- `openclaw security audit` — auditar configuración + estado local para detectar problemas comunes de seguridad.
- `openclaw security audit --deep` — sondeo de Gateway en vivo con el mejor esfuerzo.
- `openclaw security audit --fix` — ajustar los valores predeterminados seguros y chmod de estado/configuración.

## Secretos

- `openclaw secrets reload` — volver a resolver referencias e intercambiar atómicamente la instantánea de tiempo de ejecución.
- `openclaw secrets audit` — escanear residuos de texto plano, referencias no resueltas y deriva de precedencia (`--allow-exec` para ejecutar proveedores exec durante la auditoría).
- `openclaw secrets configure` — asistente interactivo para la configuración del proveedor + asignación SecretRef + verificación previa/aplicación (`--allow-exec` para ejecutar proveedores exec durante la verificación previa y los flujos de aplicación que contienen exec).
- `openclaw secrets apply --from <plan.json>` — aplicar un plan generado previamente (`--dry-run` compatible; use `--allow-exec` para permitir proveedores exec en planes de escritura que contienen exec y de ejecución en seco).

## Complementos

Administrar extensiones y su configuración:

- `openclaw plugins list` — detectar complementos (use `--json` para la salida de máquina).
- `openclaw plugins inspect <id>` — muestra detalles de un plugin (`info` es un alias).
- `openclaw plugins install <path|.tgz|npm-spec|plugin@marketplace>` — instala un plugin (o añade una ruta de plugin a `plugins.load.paths`).
- `openclaw plugins marketplace list <marketplace>` — enumera las entradas del mercado antes de la instalación.
- `openclaw plugins enable <id>` / `disable <id>` — alternar `plugins.entries.<id>.enabled`.
- `openclaw plugins doctor` — reportar errores de carga de plugins.

La mayoría de los cambios de complemento requieren un reinicio de la puerta de enlace. Consulte [/plugin](/es/tools/plugin).

## Memoria

Búsqueda vectorial sobre `MEMORY.md` + `memory/*.md`:

- `openclaw memory status` — mostrar estadísticas del índice.
- `openclaw memory index` — reindexar archivos de memoria.
- `openclaw memory search "<query>"` (o `--query "<query>"`) — búsqueda semántica sobre la memoria.

## Comandos de barra del chat

Los mensajes de chat admiten comandos `/...` (texto y nativos). Consulte [/tools/slash-commands](/es/tools/slash-commands).

Aspectos destacados:

- `/status` para diagnósticos rápidos.
- `/config` para cambios de configuración persistidos.
- `/debug` para anulaciones de configuración solo en tiempo de ejecución (memoria, no disco; requiere `commands.debug: true`).

## Configuración + incorporación

### `setup`

Inicializar configuración + espacio de trabajo.

Opciones:

- `--workspace <dir>`: ruta del espacio de trabajo del agente (por defecto `~/.openclaw/workspace`).
- `--wizard`: ejecutar la incorporación.
- `--non-interactive`: ejecutar la incorporación sin indicaciones.
- `--mode <local|remote>`: modo de incorporación.
- `--remote-url <url>`: URL remota de la puerta de enlace.
- `--remote-token <token>`: token de la puerta de enlace remota.

La incorporación se ejecuta automáticamente cuando hay presentes marcadores de incorporación (`--non-interactive`, `--mode`, `--remote-url`, `--remote-token`).

### `onboard`

Incorporación interactiva para gateway, espacio de trabajo y habilidades.

Opciones:

- `--workspace <dir>`
- `--reset` (restablecer configuración + credenciales + sesiones antes de la incorporación)
- `--reset-scope <config|config+creds+sessions|full>` (por defecto `config+creds+sessions`; use `full` para también eliminar el espacio de trabajo)
- `--non-interactive`
- `--mode <local|remote>`
- `--flow <quickstart|advanced|manual>` (manual es un alias de advanced)
- `--auth-choice <setup-token|token|chutes|openai-codex|openai-api-key|openrouter-api-key|ollama|ai-gateway-api-key|moonshot-api-key|moonshot-api-key-cn|kimi-code-api-key|synthetic-api-key|venice-api-key|gemini-api-key|zai-api-key|mistral-api-key|apiKey|minimax-api|minimax-api-lightning|opencode-zen|opencode-go|custom-api-key|skip>`
- `--token-provider <id>` (no interactivo; se usa con `--auth-choice token`)
- `--token <token>` (no interactivo; se usa con `--auth-choice token`)
- `--token-profile-id <id>` (no interactivo; predeterminado: `<provider>:manual`)
- `--token-expires-in <duration>` (no interactivo; p. ej. `365d`, `12h`)
- `--secret-input-mode <plaintext|ref>` (predeterminado `plaintext`; usa `ref` para almacenar las referencias de entorno predeterminadas del proveedor en lugar de claves de texto sin formato)
- `--anthropic-api-key <key>`
- `--openai-api-key <key>`
- `--mistral-api-key <key>`
- `--openrouter-api-key <key>`
- `--ai-gateway-api-key <key>`
- `--moonshot-api-key <key>`
- `--kimi-code-api-key <key>`
- `--gemini-api-key <key>`
- `--zai-api-key <key>`
- `--minimax-api-key <key>`
- `--opencode-zen-api-key <key>`
- `--opencode-go-api-key <key>`
- `--custom-base-url <url>` (no interactivo; se usa con `--auth-choice custom-api-key` o `--auth-choice ollama`)
- `--custom-model-id <id>` (no interactivo; se usa con `--auth-choice custom-api-key` o `--auth-choice ollama`)
- `--custom-api-key <key>` (no interactivo; opcional; se usa con `--auth-choice custom-api-key`; vuelve a `CUSTOM_API_KEY` cuando se omite)
- `--custom-provider-id <id>` (no interactivo; id de proveedor personalizado opcional)
- `--custom-compatibility <openai|anthropic>` (no interactivo; opcional; predeterminado `openai`)
- `--gateway-port <port>`
- `--gateway-bind <loopback|lan|tailnet|auto|custom>`
- `--gateway-auth <token|password>`
- `--gateway-token <token>`
- `--gateway-token-ref-env <name>` (no interactivo; almacenar `gateway.auth.token` como env SecretRef; requiere que se establezca la variable de entorno; no se puede combinar con `--gateway-token`)
- `--gateway-password <password>`
- `--remote-url <url>`
- `--remote-token <token>`
- `--tailscale <off|serve|funnel>`
- `--tailscale-reset-on-exit`
- `--install-daemon`
- `--no-install-daemon` (alias: `--skip-daemon`)
- `--daemon-runtime <node|bun>`
- `--skip-channels`
- `--skip-skills`
- `--skip-health`
- `--skip-ui`
- `--node-manager <npm|pnpm|bun>` (pnpm recomendado; no se recomienda bun para el tiempo de ejecución de Gateway)
- `--json`

### `configure`

Asistente de configuración interactiva (modelos, canales, habilidades, puerta de enlace).

### `config`

Asistentes de configuración no interactivos (get/set/unset/file/validate). Ejecutar `openclaw config` sin ningún
subcomando inicia el asistente.

Subcomandos:

- `config get <path>`: imprime un valor de configuración (ruta con puntos/corchetes).
- `config set`: admite cuatro modos de asignación:
  - modo de valor: `config set <path> <value>` (análisis JSON5 o cadena)
  - modo de constructor SecretRef: `config set <path> --ref-provider <provider> --ref-source <source> --ref-id <id>`
  - modo de constructor de proveedor: `config set secrets.providers.<alias> --provider-source <env|file|exec> ...`
  - modo por lotes: `config set --batch-json '<json>'` o `config set --batch-file <path>`
- `config set --dry-run`: valida las asignaciones sin escribir `openclaw.json` (las comprobaciones exec SecretRef se omiten de forma predeterminada).
- `config set --allow-exec --dry-run`: optar por las comprobaciones de ejecución en seco de exec SecretRef (puede ejecutar comandos del proveedor).
- `config set --dry-run --json`: emite salida de ejecución en seco legible por máquina (comprobaciones + señal de integridad, operaciones, referencias comprobadas/omitidas, errores).
- `config set --strict-json`: requiere análisis JSON5 para la entrada de ruta/valor. `--json` sigue siendo un alias heredado para el análisis estricto fuera del modo de salida de ejecución en seco.
- `config unset <path>`: elimina un valor.
- `config file`: imprime la ruta del archivo de configuración activo.
- `config validate`: valida la configuración actual contra el esquema sin iniciar la puerta de enlace.
- `config validate --json`: emite salida JSON legible por máquina.

### `doctor`

Verificaciones de estado + soluciones rápidas (configuración + puerta de enlace + servicios heredados).

Opciones:

- `--no-workspace-suggestions`: deshabilita las sugerencias de memoria del espacio de trabajo.
- `--yes`: acepta los valores predeterminados sin solicitar confirmación (sin cabeza).
- `--non-interactive`: omite las solicitudes; aplica solo migraciones seguras.
- `--deep`: escanea los servicios del sistema en busca de instalaciones adicionales de la puerta de enlace.

## Asistentes de canal

### `channels`

Administra cuentas de canales de chat (WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (complemento)/Signal/iMessage/Microsoft Teams).

Subcomandos:

- `channels list`: muestra los canales configurados y los perfiles de autenticación.
- `channels status`: comprueba la accesibilidad de la puerta de enlace y el estado del canal (`--probe` ejecuta comprobaciones adicionales; usa `openclaw health` o `openclaw status --deep` para sondeos de estado de la puerta de enlace).
- Sugerencia: `channels status` imprime advertencias con soluciones sugeridas cuando puede detectar configuraciones incorrectas comunes (y luego te dirige a `openclaw doctor`).
- `channels logs`: muestra los registros recientes del canal desde el archivo de registro de la puerta de enlace.
- `channels add`: configuración estilo asistente cuando no se pasan marcas; las marcas cambian al modo no interactivo.
  - Al agregar una cuenta no predeterminada a un canal que aún usa la configuración de nivel superior de cuenta única, OpenClaw mueve los valores con ámbito de cuenta a `channels.<channel>.accounts.default` antes de escribir la nueva cuenta.
  - El `channels add` no interactivo no crea/actualiza automáticamente los enlaces; los enlaces solo de canal continúan coincidiendo con la cuenta predeterminada.
- `channels remove`: deshabilitado por defecto; pasa `--delete` para eliminar entradas de configuración sin solicitudes.
- `channels login`: inicio de sesión interactivo del canal (solo WhatsApp Web).
- `channels logout`: cierra la sesión de una sesión de canal (si es compatible).

Opciones comunes:

- `--channel <name>`: `whatsapp|telegram|discord|googlechat|slack|mattermost|signal|imessage|msteams`
- `--account <id>`: id de cuenta de canal (predeterminado `default`)
- `--name <label>`: nombre visible para la cuenta

Opciones de `channels login`:

- `--channel <channel>` (predeterminado `whatsapp`; admite `whatsapp`/`web`)
- `--account <id>`
- `--verbose`

opciones de `channels logout`:

- `--channel <channel>` (predeterminado `whatsapp`)
- `--account <id>`

opciones de `channels list`:

- `--no-usage`: omite las instantáneas de uso/cuota del proveedor del modelo (solo con OAuth/API).
- `--json`: salida JSON (incluye el uso a menos que se establezca `--no-usage`).

opciones de `channels logs`:

- `--channel <name|all>` (predeterminado `all`)
- `--lines <n>` (predeterminado `200`)
- `--json`

Más detalles: [/concepts/oauth](/es/concepts/oauth)

Ejemplos:

```bash
openclaw channels add --channel telegram --account alerts --name "Alerts Bot" --token $TELEGRAM_BOT_TOKEN
openclaw channels add --channel discord --account work --name "Work Bot" --token $DISCORD_BOT_TOKEN
openclaw channels remove --channel discord --account work --delete
openclaw channels status --probe
openclaw status --deep
```

### `skills`

Lista e inspecciona las habilidades disponibles más la información de estado.

Subcomandos:

- `skills search [query...]`: buscar habilidades de ClawHub.
- `skills install <slug>`: instalar una habilidad de ClawHub en el espacio de trabajo activo.
- `skills update <slug|--all>`: actualizar habilidades rastreadas de ClawHub.
- `skills list`: listar habilidades (predeterminado cuando no hay subcomando).
- `skills info <name>`: mostrar detalles de una habilidad.
- `skills check`: resumen de requisitos listos frente a faltantes.

Opciones:

- `--eligible`: mostrar solo habilidades listas.
- `--json`: salida JSON (sin estilo).
- `-v`, `--verbose`: incluir detalles de requisitos faltantes.

Sugerencia: use `openclaw skills search`, `openclaw skills install` y `openclaw skills update` para habilidades respaldadas por ClawHub.

### `pairing`

Apruebe las solicitudes de emparejamiento de MD en todos los canales.

Subcomandos:

- `pairing list [channel] [--channel <channel>] [--account <id>] [--json]`
- `pairing approve <channel> <code> [--account <id>] [--notify]`
- `pairing approve --channel <channel> [--account <id>] <code> [--notify]`

### `devices`

Administre las entradas de emparejamiento de dispositivos de puerta de enlace y los tokens de dispositivo por rol.

Subcomandos:

- `devices list [--json]`
- `devices approve [requestId] [--latest]`
- `devices reject <requestId>`
- `devices remove <deviceId>`
- `devices clear --yes [--pending]`
- `devices rotate --device <id> --role <role> [--scope <scope...>]`
- `devices revoke --device <id> --role <role>`

### `webhooks gmail`

Configuración y ejecución del enlace de Gmail Pub/Sub. Consulte [/automation/gmail-pubsub](/es/automation/gmail-pubsub).

Subcomandos:

- `webhooks gmail setup` (requiere `--account <email>`; admite `--project`, `--topic`, `--subscription`, `--label`, `--hook-url`, `--hook-token`, `--push-token`, `--bind`, `--port`, `--path`, `--include-body`, `--max-bytes`, `--renew-minutes`, `--tailscale`, `--tailscale-path`, `--tailscale-target`, `--push-endpoint`, `--json`)
- `webhooks gmail run` (anulaciones en tiempo de ejecución para los mismos indicadores)

### `dns setup`

Asistente de DNS para descubrimiento de área amplia (CoreDNS + Tailscale). Consulte [/gateway/discovery](/es/gateway/discovery).

Opciones:

- `--apply`: instalar/actualizar la configuración de CoreDNS (requiere sudo; solo macOS).

## Mensajería y agente

### `message`

Mensajería saliente unificada + acciones de canal.

Consulte: [/cli/message](/es/cli/message)

Subcomandos:

- `message send|poll|react|reactions|read|edit|delete|pin|unpin|pins|permissions|search|timeout|kick|ban`
- `message thread <create|list|reply>`
- `message emoji <list|upload>`
- `message sticker <send|upload>`
- `message role <info|add|remove>`
- `message channel <info|list>`
- `message member info`
- `message voice status`
- `message event <list|create>`

Ejemplos:

- `openclaw message send --target +15555550123 --message "Hi"`
- `openclaw message poll --channel discord --target channel:123 --poll-question "Snack?" --poll-option Pizza --poll-option Sushi`

### `agent`

Ejecutar un turno de agente a través de la puerta de enlace (o `--local` integrado).

Obligatorio:

- `--message <text>`

Opciones:

- `--to <dest>` (para la clave de sesión y entrega opcional)
- `--session-id <id>`
- `--thinking <off|minimal|low|medium|high|xhigh>` (solo modelos GPT-5.2 + Codex)
- `--verbose <on|full|off>`
- `--channel <whatsapp|telegram|discord|slack|mattermost|signal|imessage|msteams>`
- `--local`
- `--deliver`
- `--json`
- `--timeout <seconds>`

### `agents`

Administrar agentes aislados (espacios de trabajo + autenticación + enrutamiento).

#### `agents list`

Enumerar los agentes configurados.

Opciones:

- `--json`
- `--bindings`

#### `agents add [name]`

Agregar un nuevo agente aislado. Ejecuta el asistente guiado a menos que se pasen marcas (o `--non-interactive`); `--workspace` es obligatorio en el modo no interactivo.

Opciones:

- `--workspace <dir>`
- `--model <id>`
- `--agent-dir <dir>`
- `--bind <channel[:accountId]>` (repetible)
- `--non-interactive`
- `--json`

Las especificaciones de enlace usan `channel[:accountId]`. Cuando se omite `accountId`, OpenClaw puede resolver el ámbito de la cuenta a través de los valores predeterminados del canal/enlaces de complemento; de lo contrario, es un enlace de canal sin un ámbito de cuenta explícito.

#### `agents bindings`

Enumerar enlaces de enrutamiento.

Opciones:

- `--agent <id>`
- `--json`

#### `agents bind`

Agregar enlaces de enrutamiento para un agente.

Opciones:

- `--agent <id>`
- `--bind <channel[:accountId]>` (repetible)
- `--json`

#### `agents unbind`

Elimina los enlaces de enrutamiento de un agente.

Opciones:

- `--agent <id>`
- `--bind <channel[:accountId]>` (repetible)
- `--all`
- `--json`

#### `agents delete <id>`

Elimina un agente y poda su espacio de trabajo + estado.

Opciones:

- `--force`
- `--json`

### `acp`

Ejecuta el puente ACP que conecta los IDE con la Gateway.

Consulte [`acp`](/es/cli/acp) para obtener opciones completas y ejemplos.

### `status`

Muestra el estado de salud de la sesión vinculada y los destinatarios recientes.

Opciones:

- `--json`
- `--all``--all` (diagnóstico completo; solo lectura, pegable)
- `--deep` (sondear canales)
- `--usage` (mostrar uso/cuota del proveedor del modelo)
- `--timeout <ms>`
- `--verbose`
- `--debug` (alias para `--verbose`)

Notas:

- La descripción general incluye el estado del servicio de Gateway + host de nodo cuando está disponible.

### Seguimiento de uso

OpenClaw puede mostrar el uso/cuota del proveedor cuando hay credenciales OAuth/API disponibles.

Superficies:

- `/status` (agrega una línea breve de uso del proveedor cuando está disponible)
- `openclaw status --usage` (imprime el desglose completo del proveedor)
- Barra de menú de macOS (sección de Uso en Contexto)

Notas:

- Los datos provienen directamente de los extremos de uso del proveedor (sin estimaciones).
- Proveedores: Anthropic, GitHub Copilot, OpenAI Codex OAuth, además de Gemini CLI a través del complemento incluido `google` y Antigravity donde esté configurado.
- Si no existen credenciales coincidentes, el uso se oculta.
- Detalles: consulte [Seguimiento de uso](/es/concepts/usage-tracking).

### `health`

Obtener el estado de salud de la Gateway en ejecución.

Opciones:

- `--json`
- `--timeout <ms>`
- `--verbose`

### `sessions`

Enumerar las sesiones de conversación almacenadas.

Opciones:

- `--json`
- `--verbose`
- `--store <path>`
- `--active <minutes>`

## Restablecer / Desinstalar

### `reset`

Restablecer configuración/estado local (mantiene la CLI instalada).

Opciones:

- `--scope <config|config+creds+sessions|full>`
- `--yes`
- `--non-interactive`
- `--dry-run`

Notas:

- `--non-interactive` requiere `--scope` y `--yes`.

### `uninstall`

Desinstalar el servicio de puerta de enlace + datos locales (la CLI permanece).

Opciones:

- `--service`
- `--state`
- `--workspace`
- `--app`
- `--all`
- `--yes`
- `--non-interactive`
- `--dry-run`

Notas:

- `--non-interactive` requiere `--yes` y alcances explícitos (o `--all`).

## Puerta de enlace

### `gateway`

Ejecutar la Puerta de enlace WebSocket.

Opciones:

- `--port <port>`
- `--bind <loopback|tailnet|lan|auto|custom>`
- `--token <token>`
- `--auth <token|password>`
- `--password <password>`
- `--password-file <path>`
- `--tailscale <off|serve|funnel>`
- `--tailscale-reset-on-exit`
- `--allow-unconfigured`
- `--dev`
- `--reset` (restablecer configuración de desarrollo + credenciales + sesiones + espacio de trabajo)
- `--force` (matar el escucha existente en el puerto)
- `--verbose`
- `--claude-cli-logs`
- `--ws-log <auto|full|compact>`
- `--compact` (alias para `--ws-log compact`)
- `--raw-stream`
- `--raw-stream-path <path>`

### `gateway service`

Administrar el servicio de Puerta de enlace (launchd/systemd/schtasks).

Subcomandos:

- `gateway status` (sondea la RPC de la Puerta de enlace de forma predeterminada)
- `gateway install` (instalación del servicio)
- `gateway uninstall`
- `gateway start`
- `gateway stop`
- `gateway restart`

Notas:

- `gateway status` sondea el RPC de Gateway de forma predeterminada utilizando el puerto/configuración resueltos del servicio (anular con `--url/--token/--password`).
- `gateway status` admite `--no-probe`, `--deep`, `--require-rpc` y `--json` para secuencias de comandos.
- `gateway status` también muestra servicios de puerta de enlace heredados o adicionales cuando puede detectarlos (`--deep` añade escaneos a nivel de sistema). Los servicios OpenClaw con nombre de perfil se tratan como de primera clase y no se marcan como "extra".
- `gateway status` imprime qué ruta de configuración utiliza la CLI frente a qué configuración probablemente utiliza el servicio (entorno de servicio), además de la URL objetivo de sondaje resuelta.
- Si los SecretRefs de autenticación de la puerta de enlace no se resuelven en la ruta de comando actual, `gateway status --json` informa `rpc.authWarning` solo cuando falla la conectividad/autenticación del sondeo (las advertencias se suprimen cuando el sondeo tiene éxito).
- En las instalaciones de Linux systemd, las comprobaciones de deriva de token de estado incluyen fuentes de unidades `Environment=` y `EnvironmentFile=`.
- `gateway install|uninstall|start|stop|restart` admite `--json` para secuencias de comandos (la salida predeterminada sigue siendo amigable para humanos).
- `gateway install` utiliza el tiempo de ejecución de Node de forma predeterminada; bun **no está recomendado** (errores de WhatsApp/Telegram).
- Opciones de `gateway install`: `--port`, `--runtime`, `--token`, `--force`, `--json`.

### `logs`

Siga los registros de archivos de Gateway a través de RPC.

Notas:

- Las sesiones TTY renderizan una vista estructurada y coloreada; las sesiones no TTY vuelven al texto sin formato.
- `--json` emite JSON delimitado por líneas (un evento de registro por línea).

Ejemplos:

```bash
openclaw logs --follow
openclaw logs --limit 200
openclaw logs --plain
openclaw logs --json
openclaw logs --no-color
```

### `gateway <subcommand>`

Asistentes de CLI de Gateway (use `--url`, `--token`, `--password`, `--timeout`, `--expect-final` para subcomandos RPC).
Cuando pasa `--url`, la CLI no aplica automáticamente las credenciales de configuración o del entorno.
Incluya `--token` o `--password` explícitamente. La falta de credenciales explícitas es un error.

Subcomandos:

- `gateway call <method> [--params <json>]`
- `gateway health`
- `gateway status`
- `gateway probe`
- `gateway discover`
- `gateway install|uninstall|start|stop|restart`
- `gateway run`

RPCs comunes:

- `config.apply` (validar + escribir configuración + reiniciar + despertar)
- `config.patch` (combinar una actualización parcial + reiniciar + despertar)
- `update.run` (ejecutar actualización + reiniciar + despertar)

Consejo: al llamar a `config.set`/`config.apply`/`config.patch` directamente, pase `baseHash` de
`config.get` si ya existe una configuración.

## Modelos

Consulte [/concepts/models](/es/concepts/models) para conocer el comportamiento de reserva y la estrategia de escaneo.

Token de configuración de Anthropic (compatible):

```bash
claude setup-token
openclaw models auth setup-token --provider anthropic
openclaw models status
```

Nota de política: esta es compatibilidad técnica. Anthropic ha bloqueado algún uso de suscripciones fuera de Claude Code en el pasado; verifique los términos actuales de Anthropic antes de confiar en el token de configuración en producción.

### `models` (raíz)

`openclaw models` es un alias para `models status`.

Opciones raíz:

- `--status-json` (alias para `models status --json`)
- `--status-plain` (alias para `models status --plain`)

### `models list`

Opciones:

- `--all`
- `--local`
- `--provider <name>`
- `--json`
- `--plain`

### `models status`

Opciones:

- `--json`
- `--plain`
- `--check` (salida 1=expirado/faltante, 2=por expirar)
- `--probe` (sondeo en vivo de perfiles de autenticación configurados)
- `--probe-provider <name>`
- `--probe-profile <id>` (repetir o separados por comas)
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`

Incluye siempre la descripción general de autenticación y el estado de expiración de OAuth para los perfiles en el almacén de autenticación.
`--probe` ejecuta solicitudes en vivo (puede consumir tokens y activar límites de velocidad).

### `models set <model>`

Establezca `agents.defaults.model.primary`.

### `models set-image <model>`

Establezca `agents.defaults.imageModel.primary`.

### `models aliases list|add|remove`

Opciones:

- `list`: `--json`, `--plain`
- `add <alias> <model>`
- `remove <alias>`

### `models fallbacks list|add|remove|clear`

Opciones:

- `list`: `--json`, `--plain`
- `add <model>`
- `remove <model>`
- `clear`

### `models image-fallbacks list|add|remove|clear`

Opciones:

- `list`: `--json`, `--plain`
- `add <model>`
- `remove <model>`
- `clear`

### `models scan`

Opciones:

- `--min-params <b>`
- `--max-age-days <days>`
- `--provider <name>`
- `--max-candidates <n>`
- `--timeout <ms>`
- `--concurrency <n>`
- `--no-probe`
- `--yes`
- `--no-input`
- `--set-default`
- `--set-image`
- `--json`

### `models auth add|setup-token|paste-token`

Opciones:

- `add`: asistente de autenticación interactivo
- `setup-token`: `--provider <name>` (predeterminado `anthropic`), `--yes`
- `paste-token`: `--provider <name>`, `--profile-id <id>`, `--expires-in <duration>`

### `models auth order get|set|clear`

Opciones:

- `get`: `--provider <name>`, `--agent <id>`, `--json`
- `set`: `--provider <name>`, `--agent <id>`, `<profileIds...>`
- `clear`: `--provider <name>`, `--agent <id>`

## Sistema

### `system event`

Pone en cola un evento del sistema y, opcionalmente, activa un latido (Gateway RPC).

Obligatorio:

- `--text <text>`

Opciones:

- `--mode <now|next-heartbeat>`
- `--json`
- `--url`, `--token`, `--timeout`, `--expect-final`

### `system heartbeat last|enable|disable`

Controles de latido (Gateway RPC).

Opciones:

- `--json`
- `--url`, `--token`, `--timeout`, `--expect-final`

### `system presence`

Enumerar las entradas de presencia del sistema (Gateway RPC).

Opciones:

- `--json`
- `--url`, `--token`, `--timeout`, `--expect-final`

## Cron

Administrar trabajos programados (Gateway RPC). Consulte [/automation/cron-jobs](/es/automation/cron-jobs).

Subcomandos:

- `cron status [--json]`
- `cron list [--all] [--json]` (salida de tabla de forma predeterminada; use `--json` para datos sin procesar)
- `cron add` (alias: `create`; requiere `--name` y exactamente uno de `--at` | `--every` | `--cron`, y exactamente una carga útil de `--system-event` | `--message`)
- `cron edit <id>` (campos de parche)
- `cron rm <id>` (alias: `remove`, `delete`)
- `cron enable <id>`
- `cron disable <id>`
- `cron runs --id <id> [--limit <n>]`
- `cron run <id> [--force]`

Todos los comandos `cron` aceptan `--url`, `--token`, `--timeout`, `--expect-final`.

## Anfitrión de nodo

`node` ejecuta un **anfitrión de nodo sin cabeza** o lo administra como un servicio en segundo plano. Consulte
[`openclaw node`](/es/cli/node).

Subcomandos:

- `node run --host <gateway-host> --port 18789`
- `node status`
- `node install [--host <gateway-host>] [--port <port>] [--tls] [--tls-fingerprint <sha256>] [--node-id <id>] [--display-name <name>] [--runtime <node|bun>] [--force]`
- `node uninstall`
- `node stop`
- `node restart`

Notas de autenticación:

- `node` resuelve la autenticación de la puerta de enlace desde env/config (sin marcas `--token`/`--password`): `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`, luego `gateway.auth.*`. En modo local, el anfitrión del nodo ignora intencionalmente `gateway.remote.*`; en `gateway.mode=remote`, `gateway.remote.*` participa según las reglas de precedencia remota.
- La resolución de autenticación del anfitrión del nodo solo respeta las variables de entorno `OPENCLAW_GATEWAY_*`.

## Nodos

`nodes` se comunica con la puerta de enlace y apunta a los nodos emparejados. Consulte [/nodes](/es/nodes).

Opciones comunes:

- `--url`, `--token`, `--timeout`, `--json`

Subcomandos:

- `nodes status [--connected] [--last-connected <duration>]`
- `nodes describe --node <id|name|ip>`
- `nodes list [--connected] [--last-connected <duration>]`
- `nodes pending`
- `nodes approve <requestId>`
- `nodes reject <requestId>`
- `nodes rename --node <id|name|ip> --name <displayName>`
- `nodes invoke --node <id|name|ip> --command <command> [--params <json>] [--invoke-timeout <ms>] [--idempotency-key <key>]`
- `nodes run --node <id|name|ip> [--cwd <path>] [--env KEY=VAL] [--command-timeout <ms>] [--needs-screen-recording] [--invoke-timeout <ms>] <command...>` (nodo mac o anfitrión de nodo sin cabeza)
- `nodes notify --node <id|name|ip> [--title <text>] [--body <text>] [--sound <name>] [--priority <passive|active|timeSensitive>] [--delivery <system|overlay|auto>] [--invoke-timeout <ms>]` (solo mac)

Cámara:

- `nodes camera list --node <id|name|ip>`
- `nodes camera snap --node <id|name|ip> [--facing front|back|both] [--device-id <id>] [--max-width <px>] [--quality <0-1>] [--delay-ms <ms>] [--invoke-timeout <ms>]`
- `nodes camera clip --node <id|name|ip> [--facing front|back] [--device-id <id>] [--duration <ms|10s|1m>] [--no-audio] [--invoke-timeout <ms>]`

Canvas + pantalla:

- `nodes canvas snapshot --node <id|name|ip> [--format png|jpg|jpeg] [--max-width <px>] [--quality <0-1>] [--invoke-timeout <ms>]`
- `nodes canvas present --node <id|name|ip> [--target <urlOrPath>] [--x <px>] [--y <px>] [--width <px>] [--height <px>] [--invoke-timeout <ms>]`
- `nodes canvas hide --node <id|name|ip> [--invoke-timeout <ms>]`
- `nodes canvas navigate <url> --node <id|name|ip> [--invoke-timeout <ms>]`
- `nodes canvas eval [<js>] --node <id|name|ip> [--js <code>] [--invoke-timeout <ms>]`
- `nodes canvas a2ui push --node <id|name|ip> (--jsonl <path> | --text <text>) [--invoke-timeout <ms>]`
- `nodes canvas a2ui reset --node <id|name|ip> [--invoke-timeout <ms>]`
- `nodes screen record --node <id|name|ip> [--screen <index>] [--duration <ms|10s>] [--fps <n>] [--no-audio] [--out <path>] [--invoke-timeout <ms>]`

Ubicación:

- `nodes location get --node <id|name|ip> [--max-age <ms>] [--accuracy <coarse|balanced|precise>] [--location-timeout <ms>] [--invoke-timeout <ms>]`

## Navegador

CLI de control del navegador (Chrome/Brave/Edge/Chromium dedicado). Consulte [`openclaw browser`](/es/cli/browser) y la [herramienta Navegador](/es/tools/browser).

Opciones comunes:

- `--url`, `--token`, `--timeout`, `--json`
- `--browser-profile <name>`

Gestionar:

- `browser status`
- `browser start`
- `browser stop`
- `browser reset-profile`
- `browser tabs`
- `browser open <url>`
- `browser focus <targetId>`
- `browser close [targetId]`
- `browser profiles`
- `browser create-profile --name <name> [--color <hex>] [--cdp-url <url>]`
- `browser delete-profile --name <name>`

Inspeccionar:

- `browser screenshot [targetId] [--full-page] [--ref <ref>] [--element <selector>] [--type png|jpeg]`
- `browser snapshot [--format aria|ai] [--target-id <id>] [--limit <n>] [--interactive] [--compact] [--depth <n>] [--selector <sel>] [--out <path>]`

Acciones:

- `browser navigate <url> [--target-id <id>]`
- `browser resize <width> <height> [--target-id <id>]`
- `browser click <ref> [--double] [--button <left|right|middle>] [--modifiers <csv>] [--target-id <id>]`
- `browser type <ref> <text> [--submit] [--slowly] [--target-id <id>]`
- `browser press <key> [--target-id <id>]`
- `browser hover <ref> [--target-id <id>]`
- `browser drag <startRef> <endRef> [--target-id <id>]`
- `browser select <ref> <values...> [--target-id <id>]`
- `browser upload <paths...> [--ref <ref>] [--input-ref <ref>] [--element <selector>] [--target-id <id>] [--timeout-ms <ms>]`
- `browser fill [--fields <json>] [--fields-file <path>] [--target-id <id>]`
- `browser dialog --accept|--dismiss [--prompt <text>] [--target-id <id>] [--timeout-ms <ms>]`
- `browser wait [--time <ms>] [--text <value>] [--text-gone <value>] [--target-id <id>]`
- `browser evaluate --fn <code> [--ref <ref>] [--target-id <id>]`
- `browser console [--level <error|warn|info>] [--target-id <id>]`
- `browser pdf [--target-id <id>]`

## Búsqueda de documentos

### `docs [query...]`

Busca en el índice de documentos en vivo.

## Interfaz de terminal (TUI)

### `tui`

Abre la interfaz de usuario del terminal conectada a la puerta de enlace (Gateway).

Opciones:

- `--url <url>`
- `--token <token>`
- `--password <password>`
- `--session <key>`
- `--deliver`
- `--thinking <level>`
- `--message <text>`
- `--timeout-ms <ms>` (el valor predeterminado es `agents.defaults.timeoutSeconds`)
- `--history-limit <n>`
