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

- [`setup`](/en/cli/setup)
- [`onboard`](/en/cli/onboard)
- [`configure`](/en/cli/configure)
- [`config`](/en/cli/config)
- [`completion`](/en/cli/completion)
- [`doctor`](/en/cli/doctor)
- [`dashboard`](/en/cli/dashboard)
- [`backup`](/en/cli/backup)
- [`reset`](/en/cli/reset)
- [`uninstall`](/en/cli/uninstall)
- [`update`](/en/cli/update)
- [`message`](/en/cli/message)
- [`agent`](/en/cli/agent)
- [`agents`](/en/cli/agents)
- [`acp`](/en/cli/acp)
- [`mcp`](/en/cli/mcp)
- [`status`](/en/cli/status)
- [`health`](/en/cli/health)
- [`sessions`](/en/cli/sessions)
- [`gateway`](/en/cli/gateway)
- [`logs`](/en/cli/logs)
- [`system`](/en/cli/system)
- [`models`](/en/cli/models)
- [`memory`](/en/cli/memory)
- [`directory`](/en/cli/directory)
- [`nodes`](/en/cli/nodes)
- [`devices`](/en/cli/devices)
- [`node`](/en/cli/node)
- [`approvals`](/en/cli/approvals)
- [`sandbox`](/en/cli/sandbox)
- [`tui`](/en/cli/tui)
- [`browser`](/en/cli/browser)
- [`cron`](/en/cli/cron)
- [`tasks`](/en/cli/index#tasks)
- [`dns`](/en/cli/dns)
- [`docs`](/en/cli/docs)
- [`hooks`](/en/cli/hooks)
- [`webhooks`](/en/cli/webhooks)
- [`pairing`](/en/cli/pairing)
- [`qr`](/en/cli/qr)
- [`plugins`](/en/cli/plugins) (comandos de complemento)
- [`channels`](/en/cli/channels)
- [`security`](/en/cli/security)
- [`secrets`](/en/cli/secrets)
- [`skills`](/en/cli/skills)
- [`daemon`](/en/cli/daemon) (alias heredado para los comandos de servicio de puerta de enlace)
- [`clawbot`](/en/cli/clawbot) (espacio de nombres de alias heredado)
- [`voicecall`](/en/cli/voicecall) (complemento; si está instalado)

## Marcas globales

- `--dev`: aísle el estado bajo `~/.openclaw-dev` y desplace los puertos predeterminados.
- `--profile <name>`: aísle el estado bajo `~/.openclaw-<name>`.
- `--container <name>`: apunte a un contenedor con nombre para la ejecución.
- `--no-color`: desactive los colores ANSI.
- `--update`: abreviatura de `openclaw update` (solo instalaciones desde código fuente).
- `-V`, `--version`, `-v`: imprimir versión y salir.

## Estilo de salida

- Los colores ANSI y los indicadores de progreso solo se renderizan en sesiones TTY.
- Los hipervínculos OSC-8 se renderizan como enlaces clicables en terminales compatibles; de lo contrario, recurrimos a URLs simples.
- `--json` (y `--plain` cuando sea compatible) deshabilita el estilo para una salida limpia.
- `--no-color` deshabilita el estilo ANSI; `NO_COLOR=1` también se respeta.
- Los comandos de larga duración muestran un indicador de progreso (OSC 9;4 cuando sea compatible).

## Paleta de colores

OpenClaw utiliza una paleta de langosta para la salida de la CLI.

- `accent` (#FF5A2D): encabezados, etiquetas, resaltados principales.
- `accentBright` (#FF7A3D): nombres de comandos, énfasis.
- `accentDim` (#D14A22): texto de resaltado secundario.
- `info` (#FF8A5B): valores informativos.
- `success` (#2FBF71): estados de éxito.
- `warn` (#FFB020): advertencias, respaldos, atención.
- `error` (#E23D2D): errores, fallos.
- `muted` (#8B7F77): sin énfasis, metadatos.

Fuente de verdad de la paleta: `src/terminal/palette.ts` (la "paleta de langosta").

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
    bindings
    bind
    unbind
    set-identity
  acp
  mcp
  status
  health
  sessions
    cleanup
  tasks
    list
    show
    notify
    cancel
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
    auth add|login|login-github-copilot|setup-token|paste-token
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

Nota: los complementos pueden agregar comandos de nivel superior adicionales (por ejemplo `openclaw voicecall`).

## Seguridad

- `openclaw security audit` — auditar configuración + estado local para problemas de seguridad comunes.
- `openclaw security audit --deep` — sonda en vivo del Gateway con mejor esfuerzo.
- `openclaw security audit --fix` — reforzar los valores predeterminados seguros y chmod del estado/configuración.

## Secretos

- `openclaw secrets reload` — volver a resolver referencias e intercambiar atómicamente la instantánea de tiempo de ejecución.
- `openclaw secrets audit` — buscar residuos de texto plano, referencias sin resolver y derivas de precedencia (`--allow-exec` para ejecutar proveedores exec durante la auditoría).
- `openclaw secrets configure` — asistente interactivo para la configuración del proveedor + mapeo SecretRef + verificación previa/aplicación (`--allow-exec` para ejecutar proveedores exec durante la verificación previa y los flujos de aplicación que contienen exec).
- `openclaw secrets apply --from <plan.json>` — aplica un plan generado previamente (`--dry-run` admitido; usa `--allow-exec` para permitir proveedores exec en dry-run y planes de escritura que contienen exec).

## Complementos

Gestiona las extensiones y su configuración:

- `openclaw plugins list` — descubre complementos (usa `--json` para la salida de máquina).
- `openclaw plugins inspect <id>` — muestra los detalles de un complemento (`info` es un alias).
- `openclaw plugins install <path|.tgz|npm-spec|plugin@marketplace>` — instala un complemento (o añade una ruta de complemento a `plugins.load.paths`).
- `openclaw plugins marketplace list <marketplace>` — lista las entradas del marketplace antes de la instalación.
- `openclaw plugins enable <id>` / `disable <id>` — alterna `plugins.entries.<id>.enabled`.
- `openclaw plugins doctor` — reporta errores de carga de complementos.

La mayoría de los cambios de complementos requieren un reinicio de la puerta de enlace. Consulta [/plugin](/en/tools/plugin).

## Memoria

Búsqueda vectorial sobre `MEMORY.md` + `memory/*.md`:

- `openclaw memory status` — muestra las estadísticas del índice.
- `openclaw memory index` — reindexa los archivos de memoria.
- `openclaw memory search "<query>"` (o `--query "<query>"`) — búsqueda semántica sobre la memoria.

## Comandos de barra de chat

Los mensajes de chat admiten comandos `/...` (texto y nativos). Consulta [/tools/slash-commands](/en/tools/slash-commands).

Aspectos destacados:

- `/status` para diagnósticos rápidos.
- `/config` para cambios de configuración persistentes.
- `/debug` para anulaciones de configuración solo en tiempo de ejecución (memoria, no disco; requiere `commands.debug: true`).

## Configuración + incorporación

### `setup`

Inicializa la configuración + el espacio de trabajo.

Opciones:

- `--workspace <dir>`: ruta del espacio de trabajo del agente (por defecto `~/.openclaw/workspace`).
- `--wizard`: ejecuta la incorporación.
- `--non-interactive`: ejecuta la incorporación sin indicaciones.
- `--mode <local|remote>`: modo de incorporación.
- `--remote-url <url>`: URL remota de la puerta de enlace.
- `--remote-token <token>`: token de la puerta de enlace remota.

La incorporación se ejecuta automáticamente cuando hay presentes marcas de incorporación (`--non-interactive`, `--mode`, `--remote-url`, `--remote-token`).

### `onboard`

Incorporación interactiva para la puerta de enlace, el espacio de trabajo y las habilidades.

Opciones:

- `--workspace <dir>`
- `--reset` (restablecer configuración + credenciales + sesiones antes de la incorporación)
- `--reset-scope <config|config+creds+sessions|full>` (por defecto `config+creds+sessions`; use `full` para también eliminar el espacio de trabajo)
- `--non-interactive`
- `--mode <local|remote>`
- `--flow <quickstart|advanced|manual>` (manual es un alias para advanced)
- `--auth-choice <choice>` donde `<choice>` es uno de:
  `setup-token`, `token`, `chutes`, `deepseek-api-key`, `openai-codex`, `openai-api-key`,
  `openrouter-api-key`, `kilocode-api-key`, `litellm-api-key`, `ai-gateway-api-key`,
  `cloudflare-ai-gateway-api-key`, `moonshot-api-key`, `moonshot-api-key-cn`,
  `kimi-code-api-key`, `synthetic-api-key`, `venice-api-key`, `together-api-key`,
  `huggingface-api-key`, `apiKey`, `gemini-api-key`, `google-gemini-cli`, `zai-api-key`,
  `zai-coding-global`, `zai-coding-cn`, `zai-global`, `zai-cn`, `xiaomi-api-key`,
  `minimax-global-oauth`, `minimax-global-api`, `minimax-cn-oauth`, `minimax-cn-api`,
  `opencode-zen`, `opencode-go`, `github-copilot`, `copilot-proxy`, `xai-api-key`,
  `mistral-api-key`, `volcengine-api-key`, `byteplus-api-key`, `qianfan-api-key`,
  `modelstudio-standard-api-key-cn`, `modelstudio-standard-api-key`,
  `modelstudio-api-key-cn`, `modelstudio-api-key`, `custom-api-key`, `skip`
- `--token-provider <id>` (no interactivo; se usa con `--auth-choice token`)
- `--token <token>` (no interactivo; se usa con `--auth-choice token`)
- `--token-profile-id <id>` (no interactivo; predeterminado: `<provider>:manual`)
- `--token-expires-in <duration>` (no interactivo; p. ej. `365d`, `12h`)
- `--secret-input-mode <plaintext|ref>` (predeterminado `plaintext`; use `ref` para almacenar referencias de entorno predeterminadas del proveedor en lugar de claves en texto plano)
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
- `--custom-base-url <url>` (no interactivo; se usa con `--auth-choice custom-api-key`)
- `--custom-model-id <id>` (no interactivo; se usa con `--auth-choice custom-api-key`)
- `--custom-api-key <key>` (no interactivo; opcional; se usa con `--auth-choice custom-api-key`; recurre a `CUSTOM_API_KEY` cuando se omite)
- `--custom-provider-id <id>` (no interactivo; id de proveedor personalizado opcional)
- `--custom-compatibility <openai|anthropic>` (no interactivo; opcional; predeterminado `openai`)
- `--gateway-port <port>`
- `--gateway-bind <loopback|lan|tailnet|auto|custom>`
- `--gateway-auth <token|password>`
- `--gateway-token <token>`
- `--gateway-token-ref-env <name>` (no interactivo; almacenar `gateway.auth.token` como un SecretRef de entorno; requiere que se establezca la variable de entorno; no se puede combinar con `--gateway-token`)
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
- `--skip-search`
- `--skip-health`
- `--skip-ui`
- `--cloudflare-ai-gateway-account-id <id>`
- `--cloudflare-ai-gateway-gateway-id <id>`
- `--node-manager <npm|pnpm|bun>` (se recomienda pnpm; no se recomienda bun para el tiempo de ejecución de Gateway)
- `--json`

### `configure`

Asistente de configuración interactiva (modelos, canales, habilidades, puerta de enlace).

### `config`

Auxiliares de configuración no interactiva (get/set/unset/file/schema/validate). Ejecutar `openclaw config` sin ningún
subcomando inicia el asistente.

Subcomandos:

- `config get <path>`: imprimir un valor de configuración (ruta con punto/corchete).
- `config set`: admite cuatro modos de asignación:
  - modo de valor: `config set <path> <value>` (análisis de JSON5 o cadena)
  - modo de constructor SecretRef: `config set <path> --ref-provider <provider> --ref-source <source> --ref-id <id>`
  - modo de constructor de proveedor: `config set secrets.providers.<alias> --provider-source <env|file|exec> ...`
  - modo por lotes: `config set --batch-json '<json>'` o `config set --batch-file <path>`
- `config set --dry-run`: validar las asignaciones sin escribir `openclaw.json` (las comprobaciones de SecretRef exec se omiten de forma predeterminada).
- `config set --allow-exec --dry-run`: optar por las comprobaciones de ejecución de prueba de SecretRef (puede ejecutar comandos del proveedor).
- `config set --dry-run --json`: emitir salida de ejecución de prueba legible por máquina (comprobaciones + señal de completitud, operaciones, referencias verificadas/omitidas, errores).
- `config set --strict-json`: requiere análisis de JSON5 para la entrada de ruta/valor. `--json` sigue siendo un alias heredado para el análisis estricto fuera del modo de salida de ejecución de prueba.
- `config unset <path>`: eliminar un valor.
- `config file`: imprimir la ruta del archivo de configuración activo.
- `config schema`: imprimir el esquema JSON generado para `openclaw.json`.
- `config validate`: validar la configuración actual con el esquema sin iniciar la puerta de enlace.
- `config validate --json`: emitir salida JSON legible por máquina.

### `doctor`

Comprobaciones de estado + soluciones rápidas (configuración + puerta de enlace + servicios heredados).

Opciones:

- `--no-workspace-suggestions`: desactivar sugerencias de memoria del espacio de trabajo.
- `--yes`: aceptar los valores predeterminados sin preguntar (sin cabeza).
- `--non-interactive`: omitir preguntas; aplicar solo migraciones seguras.
- `--deep`: escanear los servicios del sistema en busca de instalaciones adicionales de la puerta de enlace.
- `--repair` (alias: `--fix`): intentar reparaciones automáticas para los problemas detectados.
- `--force`: forzar reparaciones incluso cuando no son estrictamente necesarias.
- `--generate-gateway-token`: generar un nuevo token de autenticación de puerta de enlace.

## Asistentes de canal

### `channels`

Gestionar cuentas de canales de chat (WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (plugin)/Signal/iMessage/Microsoft Teams).

Subcomandos:

- `channels list`: mostrar los canales configurados y los perfiles de autenticación.
- `channels status`: comprobar la accesibilidad de la puerta de enlace y el estado del canal (`--probe` ejecuta comprobaciones adicionales; use `openclaw health` o `openclaw status --deep` para sondas de estado de la puerta de enlace).
- Consejo: `channels status` imprime advertencias con soluciones sugeridas cuando puede detectar configuraciones incorrectas comunes (y luego le dirige a `openclaw doctor`).
- `channels logs`: mostrar registros recientes del canal desde el archivo de registro de la puerta de enlace.
- `channels add`: configuración estilo asistente cuando no se pasan indicadores; los indicadores cambian al modo no interactivo.
  - Al agregar una cuenta no predeterminada a un canal que aún usa la configuración de nivel superior de cuenta única, OpenClaw mueve los valores con ámbito de cuenta a `channels.<channel>.accounts.default` antes de escribir la nueva cuenta.
  - El `channels add` no interactivo no crea/actualiza automáticamente los enlaces; los enlaces solo de canal continúan coincidiendo con la cuenta predeterminada.
- `channels remove`: deshabilitado de forma predeterminada; pase `--delete` para eliminar entradas de configuración sin avisos.
- `channels login`: inicio de sesión interactivo en el canal (solo WhatsApp Web).
- `channels logout`: cerrar sesión en una sesión de canal (si es compatible).

Opciones comunes:

- `--channel <name>`: `whatsapp|telegram|discord|googlechat|slack|mattermost|signal|imessage|msteams`
- `--account <id>`: id de cuenta de canal (predeterminado `default`)
- `--name <label>`: nombre para mostrar de la cuenta

Opciones de `channels login`:

- `--channel <channel>` (predeterminado `whatsapp`; admite `whatsapp`/`web`)
- `--account <id>`
- `--verbose`

opciones de `channels logout`:

- `--channel <channel>` (predeterminado `whatsapp`)
- `--account <id>`

opciones de `channels list`:

- `--no-usage`: omitir instantáneas de uso/cuota del proveedor del modelo (solo para OAuth/API).
- `--json`: salida JSON (incluye uso a menos que se establezca `--no-usage`).

opciones de `channels logs`:

- `--channel <name|all>` (predeterminado `all`)
- `--lines <n>` (predeterminado `200`)
- `--json`

Más detalles: [/concepts/oauth](/en/concepts/oauth)

Ejemplos:

```bash
openclaw channels add --channel telegram --account alerts --name "Alerts Bot" --token $TELEGRAM_BOT_TOKEN
openclaw channels add --channel discord --account work --name "Work Bot" --token $DISCORD_BOT_TOKEN
openclaw channels remove --channel discord --account work --delete
openclaw channels status --probe
openclaw status --deep
```

### `skills`

Enumere e inspeccione las habilidades disponibles, además de la información de preparación.

Subcomandos:

- `skills search [query...]`: buscar habilidades en ClawHub.
- `skills install <slug>`: instalar una habilidad de ClawHub en el espacio de trabajo activo.
- `skills update <slug|--all>`: actualizar las habilidades de ClawHub rastreadas.
- `skills list`: listar habilidades (predeterminado cuando no hay subcomando).
- `skills info <name>`: mostrar detalles de una habilidad.
- `skills check`: resumen de requisitos listos frente a faltantes.

Opciones:

- `--eligible`: mostrar solo habilidades listas.
- `--json`: salida JSON (sin estilo).
- `-v`, `--verbose`: incluir detalles de requisitos faltantes.

Consejo: use `openclaw skills search`, `openclaw skills install` y `openclaw skills update` para habilidades respaldadas por ClawHub.

### `pairing`

Apruebe las solicitudes de emparejamiento de MD en varios canales.

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

Configuración y ejecución del hook de Gmail Pub/Sub. Consulte [/automation/gmail-pubsub](/en/automation/gmail-pubsub).

Subcomandos:

- `webhooks gmail setup` (requiere `--account <email>`; admite `--project`, `--topic`, `--subscription`, `--label`, `--hook-url`, `--hook-token`, `--push-token`, `--bind`, `--port`, `--path`, `--include-body`, `--max-bytes`, `--renew-minutes`, `--tailscale`, `--tailscale-path`, `--tailscale-target`, `--push-endpoint`, `--json`)
- `webhooks gmail run` (anulaciones en tiempo de ejecución para las mismas marcas)

### `dns setup`

Asistente DNS de detección de área amplia (CoreDNS + Tailscale). Consulte [/gateway/discovery](/en/gateway/discovery).

Opciones:

- `--apply`: instalar/actualizar la configuración de CoreDNS (requiere sudo; solo en macOS).

## Mensajería y agente

### `message`

Mensajería unificada de salida + acciones de canal.

Consulte: [/cli/message](/en/cli/message)

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

- `-m, --message <text>`

Opciones:

- `-t, --to <dest>` (para la clave de sesión y entrega opcional)
- `--session-id <id>`
- `--agent <id>` (id. de agente; anula los enlaces de enrutamiento)
- `--thinking <off|minimal|low|medium|high|xhigh>` (el soporte del proveedor varía; no está limitado por el modelo a nivel de CLI)
- `--verbose <on|off>`
- `--channel <channel>` (canal de entrega; omítalo para usar el canal de sesión principal)
- `--reply-to <target>` (anulación del destino de entrega, separada del enrutamiento de sesión)
- `--reply-channel <channel>` (anulación del canal de entrega)
- `--reply-account <id>` (anulación del id. de cuenta de entrega)
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

Agregar un nuevo agente aislado. Ejecuta el asistente guiado a menos que se pasen indicadores (o `--non-interactive`); `--workspace` es obligatorio en el modo no interactivo.

Opciones:

- `--workspace <dir>`
- `--model <id>`
- `--agent-dir <dir>`
- `--bind <channel[:accountId]>` (repetible)
- `--non-interactive`
- `--json`

Las especificaciones de enlace usan `channel[:accountId]`. Cuando se omite `accountId`, OpenClaw puede resolver el alcance de la cuenta a través de los valores predeterminados del canal/ganchos del complemento; de lo contrario, es un enlace de canal sin un alcance de cuenta explícito.

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

Eliminar enlaces de enrutamiento para un agente.

Opciones:

- `--agent <id>`
- `--bind <channel[:accountId]>` (repetible)
- `--all`
- `--json`

#### `agents delete <id>`

Elimina un agente y poda su espacio de trabajo y estado.

Opciones:

- `--force`
- `--json`

### `acp`

Ejecuta el puente ACP que conecta los IDE con la Gateway.

Consulte [`acp`](/en/cli/acp) para ver todas las opciones y ejemplos.

### `status`

Muestra el estado de salud de la sesión vinculada y los destinatarios recientes.

Opciones:

- `--json`
- `--all` (diagnóstico completo; de solo lectura, se puede pegar)
- `--deep` (sondear canales)
- `--usage` (mostrar uso/cuota del proveedor de modelos)
- `--timeout <ms>`
- `--verbose`
- `--debug` (alias para `--verbose`)

Notas:

- La descripción general incluye el estado del servicio de Gateway + host de nodo cuando está disponible.

### Seguimiento de uso

OpenClaw puede mostrar el uso/cuota del proveedor cuando las credenciales de OAuth/API están disponibles.

Superficies:

- `/status` (añade una línea breve de uso del proveedor cuando está disponible)
- `openclaw status --usage` (imprime el desglose completo del proveedor)
- Barra de menús de macOS (sección Uso bajo Contexto)

Notas:

- Los datos provienen directamente de los puntos finales de uso del proveedor (sin estimaciones).
- Proveedores: Anthropic, GitHub Copilot, OpenAI Codex OAuth, además de Gemini CLI a través del complemento incluido `google` y Antigravity donde esté configurado.
- Si no existen credenciales coincidentes, el uso se oculta.
- Detalles: consulte [Seguimiento de uso](/en/concepts/usage-tracking).

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
- `--agent <id>` (filtrar sesiones por agente)
- `--all-agents` (mostrar sesiones en todos los agentes)

Subcomandos:

- `sessions cleanup` — eliminar sesiones caducadas o huérfanas

## Restablecer / Desinstalar

### `reset`

Restablecer la configuración/estado local (mantiene la CLI instalada).

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

- `--non-interactive` requiere `--yes` y ámbitos explícitos (o `--all`).

### `tasks`

Enumerar y gestionar las ejecuciones de [tareas en segundo plano](/en/automation/tasks) en varios agentes.

- `tasks list` — mostrar las ejecuciones de tareas activas y recientes
- `tasks show <id>` — mostrar los detalles de una ejecución de tarea específica
- `tasks notify <id>` — cambiar la política de notificación para una ejecución de tarea
- `tasks cancel <id>` — cancelar una tarea en ejecución
- `tasks audit` — mostrar problemas operativos (obsoleto, perdido, fallos de entrega)

## Pasarela

### `gateway`

Ejecutar la pasarela WebSocket.

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
- `--cli-backend-logs`
- `--claude-cli-logs` (alias obsoleto)
- `--ws-log <auto|full|compact>`
- `--compact` (alias para `--ws-log compact`)
- `--raw-stream`
- `--raw-stream-path <path>`

### `gateway service`

Administrar el servicio Gateway (launchd/systemd/schtasks).

Subcomandos:

- `gateway status` (sondea el RPC de Gateway por defecto)
- `gateway install` (instalación del servicio)
- `gateway uninstall`
- `gateway start`
- `gateway stop`
- `gateway restart`

Notas:

- `gateway status` sondea el RPC de Gateway por defecto utilizando el puerto/configuración resuelta del servicio (anular con `--url/--token/--password`).
- `gateway status` admite `--no-probe`, `--deep`, `--require-rpc` y `--json` para secuencias de comandos.
- `gateway status` también muestra servicios de puerta de enlace heredados o adicionales cuando puede detectarlos (`--deep` añade escaneos a nivel de sistema). Los servicios de OpenClaw con nombre de perfil se tratan como de primera clase y no se marcan como "extra".
- `gateway status` imprime qué ruta de configuración utiliza la CLI frente a qué configuración utiliza probablemente el servicio (entorno de servicio), además de la URL objetivo de sondeo resuelta.
- Si los SecretRefs de autenticación de la puerta de enlace no se resuelven en la ruta del comando actual, `gateway status --json` informa `rpc.authWarning` solo cuando falla la conectividad/autenticación del sondeo (las advertencias se suprimen cuando el sondeo tiene éxito).
- En las instalaciones de Linux systemd, las comprobaciones de deriva de tokens de estado incluyen ambas fuentes de unidades `Environment=` y `EnvironmentFile=`.
- `gateway install|uninstall|start|stop|restart` admiten `--json` para secuencias de comandos (la salida predeterminada sigue siendo amigable para humanos).
- `gateway install` utiliza por defecto el tiempo de ejecución de Node; bun **no está recomendado** (errores de WhatsApp/Telegram).
- Opciones de `gateway install`: `--port`, `--runtime`, `--token`, `--force`, `--json`.

### `logs`

Seguir los registros de archivos de Gateway vía RPC.

Opciones:

- `--limit <n>`: número máximo de líneas de registro a devolver
- `--max-bytes <n>`: bytes máximos a leer del archivo de registro
- `--follow`: seguir el archivo de registro (estilo tail -f)
- `--interval <ms>`: intervalo de sondeo en ms al seguir
- `--local-time`: mostrar marcas de tiempo en hora local
- `--json`: emitir JSON delimitado por líneas
- `--plain`: desactivar el formato estructurado
- `--no-color`: desactivar colores ANSI

Ejemplos:

```bash
openclaw logs --follow
openclaw logs --limit 200
openclaw logs --plain
openclaw logs --json
openclaw logs --no-color
```

### `gateway <subcommand>`

Ayudantes de CLI de Gateway (use `--url`, `--token`, `--password`, `--timeout`, `--expect-final` para subcomandos RPC).
Cuando pasa `--url`, la CLI no aplica automáticamente las credenciales de configuración o entorno.
Incluya `--token` o `--password` explícitamente. La falta de credenciales explícitas es un error.

Subcomandos:

- `gateway call <method> [--params <json>]`
- `gateway health`
- `gateway status`
- `gateway probe`
- `gateway discover`
- `gateway install|uninstall|start|stop|restart`
- `gateway run`

RPC comunes:

- `config.set` (validar + escribir configuración completa; use `baseHash` para concurrencia optimista)
- `config.apply` (validar + escribir configuración + reiniciar + despertar)
- `config.patch` (fusionar una actualización parcial + reiniciar + despertar)
- `update.run` (ejecutar actualización + reiniciar + despertar)

Consejo: al llamar a `config.set`/`config.apply`/`config.patch` directamente, pase `baseHash` de
`config.get` si ya existe una configuración.
Consejo: estos RPC de escritura de configuración verifican previamente la resolución activa de SecretRef para las referencias en la carga útil de configuración enviada y rechazan las escrituras cuando una referencia enviada efectivamente activa no está resuelta.

## Modelos

Consulte [/concepts/models](/en/concepts/models) para conocer el comportamiento de reserva y la estrategia de escaneo.

Token de configuración de Anthropic (compatible):

```bash
claude setup-token
openclaw models auth setup-token --provider anthropic
openclaw models status
```

Nota de política: esto es compatibilidad técnica. Anthropic ha bloqueado
algún uso de suscripciones fuera de Claude Code en el pasado; verifique los
términos actuales de Anthropic antes de confiar en setup-token en producción.

Migración de la CLI de Anthropic Claude:

```bash
openclaw models auth login --provider anthropic --method cli --set-default
```

Nota: `--auth-choice anthropic-cli` es un alias heredado obsoleto. Use `models auth login` en su lugar.

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
- `--check` (salida 1=caducado/faltante, 2=por caducar)
- `--probe` (sondeo en vivo de perfiles de autenticación configurados)
- `--probe-provider <name>`
- `--probe-profile <id>` (repetir o separados por comas)
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`

Incluye siempre la descripción general de autenticación y el estado de caducidad de OAuth para los perfiles en el almacén de autenticación.
`--probe` ejecuta solicitudes en vivo (puede consumir tokens y activar límites de velocidad).

### `models set <model>`

Establecer `agents.defaults.model.primary`.

### `models set-image <model>`

Establecer `agents.defaults.imageModel.primary`.

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

### `models auth add|login|login-github-copilot|setup-token|paste-token`

Opciones:

- `add`: asistente de autenticación interactiva
- `login`: `--provider <name>`, `--method <method>`, `--set-default`
- `login-github-copilot`: flujo de inicio de sesión OAuth de GitHub Copilot
- `setup-token`: `--provider <name>` (predeterminado `anthropic`), `--yes`
- `paste-token`: `--provider <name>`, `--profile-id <id>`, `--expires-in <duration>`

### `models auth order get|set|clear`

Opciones:

- `get`: `--provider <name>`, `--agent <id>`, `--json`
- `set`: `--provider <name>`, `--agent <id>`, `<profileIds...>`
- `clear`: `--provider <name>`, `--agent <id>`

## Sistema

### `system event`

Poner en cola un evento del sistema y opcionalmente desencadenar un latido (Gateway RPC).

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

Administrar trabajos programados (Gateway RPC). Consulte [/automation/cron-jobs](/en/automation/cron-jobs).

Subcomandos:

- `cron status [--json]`
- `cron list [--all] [--json]` (salida de tabla por defecto; use `--json` para sin formato)
- `cron add` (alias: `create`; requiere `--name` y exactamente uno de `--at` | `--every` | `--cron`, y exactamente una carga de `--system-event` | `--message`)
- `cron edit <id>` (campos de parche)
- `cron rm <id>` (alias: `remove`, `delete`)
- `cron enable <id>`
- `cron disable <id>`
- `cron runs --id <id> [--limit <n>]`
- `cron run <id> [--force]`

Todos los comandos `cron` aceptan `--url`, `--token`, `--timeout`, `--expect-final`.

## Node host

`node` ejecuta un **node host sin cabeza** o lo administra como un servicio en segundo plano. Consulte
[`openclaw node`](/en/cli/node).

Subcomandos:

- `node run --host <gateway-host> --port 18789`
- `node status`
- `node install [--host <gateway-host>] [--port <port>] [--tls] [--tls-fingerprint <sha256>] [--node-id <id>] [--display-name <name>] [--runtime <node|bun>] [--force]`
- `node uninstall`
- `node stop`
- `node restart`

Notas de autenticación:

- `node` resuelve la autenticación de la puerta de enlace desde env/config (sin marcas `--token`/`--password`): `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`, luego `gateway.auth.*`. En el modo local, el host del nodo ignora intencionadamente `gateway.remote.*`; en `gateway.mode=remote`, `gateway.remote.*` participa según las reglas de precedencia remota.
- La resolución de autenticación del host del nodo solo honra las variables de entorno `OPENCLAW_GATEWAY_*`.

## Nodos

`nodes` se comunica con la puerta de enlace y apunta a los nodos emparejados. Consulte [/nodes](/en/nodes).

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
- `nodes notify --node <id|name|ip> [--title <text>] [--body <text>] [--sound <name>] [--priority <passive|active|timeSensitive>] [--delivery <system|overlay|auto>] [--invoke-timeout <ms>]` (solo Mac)

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

CLI de control del navegador (Chrome/Brave/Edge/Chromium dedicado). Consulte [`openclaw browser`](/en/cli/browser) y la [herramienta Navegador](/en/tools/browser).

Opciones comunes:

- `--url`, `--token`, `--timeout`, `--json`
- `--browser-profile <name>`

Administrar:

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

## Búsqueda de documentación

### `docs [query...]`

Busca en el índice de documentación en vivo.

## TUI

### `tui`

Abre la interfaz de usuario de terminal conectada a la Gateway.

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
