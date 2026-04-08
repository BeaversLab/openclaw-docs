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
- [`flows`](/en/cli/flows)
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
- [`daemon`](/en/cli/daemon) (alias heredado para los comandos del servicio de puerta de enlace)
- [`clawbot`](/en/cli/clawbot) (espacio de nombres de alias heredado)
- [`voicecall`](/en/cli/voicecall) (complemento; si está instalado)

## Marcas globales

- `--dev`: aísle el estado bajo `~/.openclaw-dev` y cambie los puertos predeterminados.
- `--profile <name>`: aísle el estado bajo `~/.openclaw-<name>`.
- `--container <name>`: apunte a un contenedor con nombre para su ejecución.
- `--no-color`: deshabilite los colores ANSI.
- `--update`: abreviatura de `openclaw update` (solo instalaciones desde el código fuente).
- `-V`, `--version`, `-v`: imprime la versión y sale.

## Estilo de salida

- Los colores ANSI y los indicadores de progreso solo se renderizan en sesiones TTY.
- Los hipervínculos OSC-8 se renderizan como enlaces clicables en terminales compatibles; de lo contrario, recurrimos a URL simples.
- `--json` (y `--plain` donde sea compatible) desactiva el estilo para una salida limpia.
- `--no-color` desactiva el estilo ANSI; también se respeta `NO_COLOR=1`.
- Los comandos de larga duración muestran un indicador de progreso (OSC 9;4 cuando sea compatible).

## Paleta de colores

OpenClaw utiliza una paleta de langosta para la salida de la CLI.

- `accent` (#FF5A2D): encabezados, etiquetas, destacados principales.
- `accentBright` (#FF7A3D): nombres de comandos, énfasis.
- `accentDim` (#D14A22): texto de destacado secundario.
- `info` (#FF8A5B): valores informativos.
- `success` (#2FBF71): estados de éxito.
- `warn` (#FFB020): advertencias, alternativas, atención.
- `error` (#E23D2D): errores, fallos.
- `muted` (#8B7F77): énfasis suave, metadatos.

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
    schema
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
    wizard
    status
  channels
    list
    status
    capabilities
    resolve
    logs
    add
    remove
    login
    logout
  directory
    self
    peers list
    groups list|members
  skills
    search
    install
    update
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
    poll
    react
    reactions
    read
    edit
    delete
    pin
    unpin
    pins
    permissions
    search
    thread create|list|reply
    emoji list|upload
    sticker send|upload
    role info|add|remove
    channel info|list
    member info
    voice status
    event list|create
    timeout
    kick
    ban
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
    serve
    list
    show
    set
    unset
  status
  health
  sessions
    cleanup
  tasks
    list
    audit
    maintenance
    show
    notify
    cancel
    flow list|show|cancel
  gateway
    call
    usage-cost
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
    status
    describe
    list
    pending
    approve
    reject
    rename
    invoke
    notify
    push
    canvas snapshot|present|hide|navigate|eval
    canvas a2ui push|reset
    camera list|snap|clip
    screen record
    location get
  devices
    list
    remove
    clear
    approve
    reject
    rotate
    revoke
  node
    run
    status
    install
    uninstall
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

Nota: los complementos pueden añadir comandos adicionales de nivel superior (por ejemplo `openclaw voicecall`).

## Seguridad

- `openclaw security audit` — audita la configuración y el estado local en busca de problemas comunes de seguridad.
- `openclaw security audit --deep` — sondeo en vivo del mejor esfuerzo del Gateway.
- `openclaw security audit --fix` — ajusta los valores predeterminados seguros y los permisos de estado/configuración.

## Secretos

### `secrets`

Administra SecretRefs e higiene relacionada con el tiempo de ejecución/configuración.

Subcomandos:

- `secrets reload`
- `secrets audit`
- `secrets configure`
- `secrets apply --from <path>`

Opciones de `secrets reload`:

- `--url`, `--token`, `--timeout`, `--expect-final`, `--json`

opciones de `secrets audit`:

- `--check`
- `--allow-exec`
- `--json`

opciones de `secrets configure`:

- `--apply`
- `--yes`
- `--providers-only`
- `--skip-provider-setup`
- `--agent <id>`
- `--allow-exec`
- `--plan-out <path>`
- `--json`

opciones de `secrets apply --from <path>`:

- `--dry-run`
- `--allow-exec`
- `--json`

Notas:

- `reload` es un RPC de Gateway y mantiene la última instantánea de ejecución conocida correcta cuando falla la resolución.
- `audit --check` devuelve un valor distinto de cero cuando hay hallazgos; las referencias sin resolver usan un código de salida distinto de cero de mayor prioridad.
- Las comprobaciones de ejecución de prueba (dry-run) se omiten de forma predeterminada; use `--allow-exec` para optar por participar.

## Complementos

Administrar extensiones y su configuración:

- `openclaw plugins list` — descubrir complementos (use `--json` para la salida de máquina).
- `openclaw plugins inspect <id>` — mostrar detalles de un complemento (`info` es un alias).
- `openclaw plugins install <path|.tgz|npm-spec|plugin@marketplace>` — instalar un complemento (o agregar una ruta de complemento a `plugins.load.paths`; use `--force` para sobrescribir un objetivo de instalación existente).
- `openclaw plugins marketplace list <marketplace>` — listar las entradas del mercado antes de la instalación.
- `openclaw plugins enable <id>` / `disable <id>` — alternar `plugins.entries.<id>.enabled`.
- `openclaw plugins doctor` — reportar errores de carga del complemento.

La mayoría de los cambios en los complementos requieren un reinicio de la puerta de enlace. Consulte [/plugin](/en/tools/plugin).

## Memoria

Búsqueda vectorial sobre `MEMORY.md` + `memory/*.md`:

- `openclaw memory status` — mostrar estadísticas del índice; use `--deep` para verificaciones de preparación de vectores + incrustaciones o `--fix` para reparar artefactos de recuperación/promoción obsoletos.
- `openclaw memory index` — reindexar archivos de memoria.
- `openclaw memory search "<query>"` (o `--query "<query>"`) — búsqueda semántica en la memoria.
- `openclaw memory promote` — clasificar recuperaciones a corto plazo y opcionalmente agregar las entradas principales a `MEMORY.md`.

## Sandbox

Administre los tiempos de ejecución de sandbox para la ejecución aislada de agentes. Consulte [/cli/sandbox](/en/cli/sandbox).

Subcomandos:

- `sandbox list [--browser] [--json]`
- `sandbox recreate [--all] [--session <key>] [--agent <id>] [--browser] [--force]`
- `sandbox explain [--session <key>] [--agent <id>] [--json]`

Notas:

- `sandbox recreate` elimina los tiempos de ejecución existentes para que el siguiente uso los inicialice nuevamente con la configuración actual.
- Para los backends `ssh` y OpenShell `remote`, recreate elimina el espacio de trabajo remoto canónico para el alcance seleccionado.

## Comandos de barra del chat

Los mensajes de chat admiten comandos `/...` (texto y nativos). Consulte [/tools/slash-commands](/en/tools/slash-commands).

Aspectos destacados:

- `/status` para un diagnóstico rápido.
- `/config` para cambios de configuración persistente.
- `/debug` para anulaciones de configuración solo en tiempo de ejecución (memoria, no disco; requiere `commands.debug: true`).

## Configuración + incorporación

### `completion`

Generar scripts de finalización de shell y opcionalmente instalarlos en su perfil de shell.

Opciones:

- `-s, --shell <zsh|bash|powershell|fish>`
- `-i, --install`
- `--write-state`
- `-y, --yes`

Notas:

- Sin `--install` o `--write-state`, `completion` imprime el script en stdout.
- `--install` escribe un bloque `OpenClaw Completion` en su perfil de shell y lo apunta al script en caché bajo el directorio de estado de OpenClaw.

### `setup`

Inicializar configuración + espacio de trabajo.

Opciones:

- `--workspace <dir>`: ruta del espacio de trabajo del agente (predeterminado `~/.openclaw/workspace`).
- `--wizard`: ejecutar la incorporación.
- `--non-interactive`: ejecutar la incorporación sin indicaciones.
- `--mode <local|remote>`: modo de incorporación.
- `--remote-url <url>`: URL remota de Gateway.
- `--remote-token <token>`: token remoto de Gateway.

La incorporación se ejecuta automáticamente cuando hay alguna bandera de incorporación presente (`--non-interactive`, `--mode`, `--remote-url`, `--remote-token`).

### `onboard`

Incorporación interactiva para gateway, espacio de trabajo y habilidades.

Opciones:

- `--workspace <dir>`
- `--reset` (restablecer configuración + credenciales + sesiones antes de la incorporación)
- `--reset-scope <config|config+creds+sessions|full>` (predeterminado `config+creds+sessions`; use `full` para también eliminar el espacio de trabajo)
- `--non-interactive`
- `--mode <local|remote>`
- `--flow <quickstart|advanced|manual>` (manual es un alias para advanced)
- `--auth-choice <choice>` donde `<choice>` es uno de:
  `chutes`, `deepseek-api-key`, `openai-codex`, `openai-api-key`,
  `openrouter-api-key`, `kilocode-api-key`, `litellm-api-key`, `ai-gateway-api-key`,
  `cloudflare-ai-gateway-api-key`, `moonshot-api-key`, `moonshot-api-key-cn`,
  `kimi-code-api-key`, `synthetic-api-key`, `venice-api-key`, `together-api-key`,
  `huggingface-api-key`, `apiKey`, `gemini-api-key`, `zai-api-key`,
  `zai-coding-global`, `zai-coding-cn`, `zai-global`, `zai-cn`, `xiaomi-api-key`,
  `minimax-global-oauth`, `minimax-global-api`, `minimax-cn-oauth`, `minimax-cn-api`,
  `opencode-zen`, `opencode-go`, `github-copilot`, `copilot-proxy`, `xai-api-key`,
  `mistral-api-key`, `volcengine-api-key`, `byteplus-api-key`, `qianfan-api-key`,
  `qwen-standard-api-key-cn`, `qwen-standard-api-key`, `qwen-api-key-cn`, `qwen-api-key`,
  `modelstudio-standard-api-key-cn`, `modelstudio-standard-api-key`,
  `modelstudio-api-key-cn`, `modelstudio-api-key`, `custom-api-key`, `skip`
- Nota de Qwen: `qwen-*` es la familia canónica de elección de autenticación. Los identificadores `modelstudio-*`
  siguen siendo aceptados solo como alias de compatibilidad heredados.
- `--secret-input-mode <plaintext|ref>` (predeterminado `plaintext`; use `ref` para almacenar referencias de variables de entorno predeterminadas del proveedor en lugar de claves en texto plano)
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
- `--custom-base-url <url>` (no interactivo; usado con `--auth-choice custom-api-key`)
- `--custom-model-id <id>` (no interactivo; usado con `--auth-choice custom-api-key`)
- `--custom-api-key <key>` (no interactivo; opcional; usado con `--auth-choice custom-api-key`; por defecto a `CUSTOM_API_KEY` cuando se omite)
- `--custom-provider-id <id>` (no interactivo; id de proveedor personalizado opcional)
- `--custom-compatibility <openai|anthropic>` (no interactivo; opcional; por defecto `openai`)
- `--gateway-port <port>`
- `--gateway-bind <loopback|lan|tailnet|auto|custom>`
- `--gateway-auth <token|password>`
- `--gateway-token <token>`
- `--gateway-token-ref-env <name>` (no interactivo; almacenar `gateway.auth.token` como un env SecretRef; requiere que la variable de entorno esté configurada; no se puede combinar con `--gateway-token`)
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
- `--node-manager <npm|pnpm|bun>` (configurador/registro del administrador de nodos para habilidades; se recomienda pnpm, también se soporta bun)
- `--json`

### `configure`

Asistente de configuración interactiva (modelos, canales, habilidades, puerta de enlace).

Opciones:

- `--section <section>` (repetible; limitar el asistente a secciones específicas)

### `config`

Asistentes de configuración no interactivos (get/set/unset/file/schema/validate). Ejecutar `openclaw config` sin
subcomando inicia el asistente.

Subcomandos:

- `config get <path>`: imprime un valor de configuración (ruta con punto/corchete).
- `config set`: admite cuatro modos de asignación:
  - modo de valor: `config set <path> <value>` (análisis JSON5 o cadena)
  - modo de constructor SecretRef: `config set <path> --ref-provider <provider> --ref-source <source> --ref-id <id>`
  - modo de constructor de proveedor: `config set secrets.providers.<alias> --provider-source <env|file|exec> ...`
  - modo por lotes: `config set --batch-json '<json>'` o `config set --batch-file <path>`
- `config set --dry-run`: valida las asignaciones sin escribir `openclaw.json` (las comprobaciones exec SecretRef se omiten de forma predeterminada).
- `config set --allow-exec --dry-run`: opta por realizar comprobaciones de ejecución en seco de exec SecretRef (puede ejecutar comandos de proveedor).
- `config set --dry-run --json`: emite salida de ejecución en seco legible por máquina (comprobaciones + señal de completitud, operaciones, referencias comprobadas/omitidas, errores).
- `config set --strict-json`: requiere análisis JSON5 para la entrada de ruta/valor. `--json` sigue siendo un alias heredado para el análisis estricto fuera del modo de salida de ejecución en seco.
- `config unset <path>`: elimina un valor.
- `config file`: imprime la ruta del archivo de configuración activo.
- `config schema`: imprime el esquema JSON generado para `openclaw.json`, incluidos los metadatos de documentación de campo propagados `title` / `description` en ramas de objetos anidados, comodines, elementos de matriz y composición, además de metadatos de esquema de complemento/canal en vivo con el mejor esfuerzo.
- `config validate`: valida la configuración actual contra el esquema sin iniciar la puerta de enlace.
- `config validate --json`: emite salida JSON legible por máquina.

### `doctor`

Verificaciones de estado + soluciones rápidas (configuración + puerta de enlace + servicios heredados).

Opciones:

- `--no-workspace-suggestions`: desactiva las sugerencias de memoria del espacio de trabajo.
- `--yes`: acepta los valores predeterminados sin preguntar (sin cabeza).
- `--non-interactive`: omite las indicaciones; aplica solo migraciones seguras.
- `--deep`: escanear servicios del sistema en busca de instalaciones adicionales de puerta de enlace.
- `--repair` (alias: `--fix`): intentar reparaciones automáticas para los problemas detectados.
- `--force`: forzar reparaciones incluso cuando no son estrictamente necesarias.
- `--generate-gateway-token`: generar un nuevo token de autenticación de puerta de enlace.

### `dashboard`

Abra la interfaz de usuario de Control con su token actual.

Opciones:

- `--no-open`: imprimir la URL pero no iniciar un navegador

Notas:

- Para tokens de puerta de enlace administrados por SecretRef, `dashboard` imprime o abre una URL sin token en lugar de exponer el secreto en la salida de la terminal o en los argumentos de inicio del navegador.

### `update`

Actualice la CLI instalada.

Opciones raíz:

- `--json`
- `--no-restart`
- `--dry-run`
- `--channel <stable|beta|dev>`
- `--tag <dist-tag|version|spec>`
- `--timeout <seconds>`
- `--yes`

Subcomandos:

- `update status`
- `update wizard`

Opciones de `update status`:

- `--json`
- `--timeout <seconds>`

Opciones de `update wizard`:

- `--timeout <seconds>`

Notas:

- `openclaw --update` se reescribe como `openclaw update`.

### `backup`

Cree y verifique archivos de copia de seguridad locales para el estado de OpenClaw.

Subcomandos:

- `backup create`
- `backup verify <archive>`

Opciones de `backup create`:

- `--output <path>`
- `--json`
- `--dry-run`
- `--verify`
- `--only-config`
- `--no-include-workspace`

Opciones de `backup verify <archive>`:

- `--json`

## Auxiliares de canal

### `channels`

Administre cuentas de canales de chat (WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (complemento)/Signal/iMessage/Microsoft Teams).

Subcomandos:

- `channels list`: mostrar los canales configurados y los perfiles de autenticación.
- `channels status`: verifica la accesibilidad de la puerta de enlace y el estado del canal (`--probe` ejecuta comprobaciones de sondeo/auditoría en vivo por cuenta cuando la puerta de enlace es accesible; si no, recurre a resúmenes de canal solo de configuración. Usa `openclaw health` o `openclaw status --deep` para sondeos de estado más amplios de la puerta de enlace).
- Sugerencia: `channels status` imprime advertencias con soluciones sugeridas cuando puede detectar configuraciones incorrectas comunes (y luego te remite a `openclaw doctor`).
- `channels logs`: muestra los registros recientes del canal desde el archivo de registro de la puerta de enlace.
- `channels add`: configuración estilo asistente cuando no se pasan indicadores; los indicadores cambian al modo no interactivo.
  - Al agregar una cuenta no predeterminada a un canal que aún usa la configuración de nivel superior de una sola cuenta, OpenClaw promueve los valores con ámbito de cuenta al mapa de cuentas del canal antes de escribir la nueva cuenta. La mayoría de los canales usan `accounts.default`; Matrix puede conservar en su lugar un destino con nombre/predeterminado existente que coincida.
  - El `channels add` no interactivo no crea/mejora automáticamente los enlaces; los enlaces solo del canal continúan coincidiendo con la cuenta predeterminada.
- `channels remove`: deshabilitado de forma predeterminada; pasa `--delete` para eliminar entradas de configuración sin preguntas.
- `channels login`: inicio de sesión interactivo del canal (solo WhatsApp Web).
- `channels logout`: cierra la sesión de una sesión de canal (si es compatible).

Opciones comunes:

- `--channel <name>`: `whatsapp|telegram|discord|googlechat|slack|mattermost|signal|imessage|msteams`
- `--account <id>`: id de cuenta del canal (predeterminado `default`)
- `--name <label>`: nombre para mostrar de la cuenta

Opciones de `channels login`:

- `--channel <channel>` (predeterminado `whatsapp`; admite `whatsapp`/`web`)
- `--account <id>`
- `--verbose`

Opciones de `channels logout`:

- `--channel <channel>` (predeterminado `whatsapp`)
- `--account <id>`

Opciones de `channels list`:

- `--no-usage`: omite las instantáneas de uso/cuota del proveedor del modelo (solo OAuth/API).
- `--json`: salida JSON (incluye el uso a menos que se establezca `--no-usage`).

opciones de `channels status`:

- `--probe`
- `--timeout <ms>`
- `--json`

opciones de `channels capabilities`:

- `--channel <name>`
- `--account <id>` (solo con `--channel`)
- `--target <dest>`
- `--timeout <ms>`
- `--json`

opciones de `channels resolve`:

- `<entries...>`
- `--channel <name>`
- `--account <id>`
- `--kind <auto|user|group>`
- `--json`

opciones de `channels logs`:

- `--channel <name|all>` (por defecto `all`)
- `--lines <n>` (por defecto `200`)
- `--json`

Notas:

- `channels login` admite `--verbose`.
- `channels capabilities --account` solo se aplica cuando se establece `--channel`.
- `channels status --probe` puede mostrar el estado del transporte más los resultados de sondeo/auditoría, como `works`, `probe failed`, `audit ok` o `audit failed`, dependiendo del soporte del canal.

Más detalles: [/concepts/oauth](/en/concepts/oauth)

Ejemplos:

```bash
openclaw channels add --channel telegram --account alerts --name "Alerts Bot" --token $TELEGRAM_BOT_TOKEN
openclaw channels add --channel discord --account work --name "Work Bot" --token $DISCORD_BOT_TOKEN
openclaw channels remove --channel discord --account work --delete
openclaw channels status --probe
openclaw status --deep
```

### `directory`

Busque IDs propios, de pares y de grupo para canales que exponen una superficie de directorio. Consulte [`openclaw directory`](/en/cli/directory).

Opciones comunes:

- `--channel <name>`
- `--account <id>`
- `--json`

Subcomandos:

- `directory self`
- `directory peers list [--query <text>] [--limit <n>]`
- `directory groups list [--query <text>] [--limit <n>]`
- `directory groups members --group-id <id> [--limit <n>]`

### `skills`

Enumerar e inspeccionar las habilidades disponibles más la información de preparación.

Subcomandos:

- `skills search [query...]`: busca habilidades de ClawHub.
- `skills search --limit <n> --json`: limita los resultados de búsqueda o emite salida legible por máquina.
- `skills install <slug>`: instala una habilidad desde ClawHub en el espacio de trabajo activo.
- `skills install <slug> --version <version>`: instala una versión específica de ClawHub.
- `skills install <slug> --force`: sobrescribe una carpeta de habilidad del espacio de trabajo existente.
- `skills update <slug|--all>`: actualiza las habilidades de ClawHub rastreadas.
- `skills list`: enumera las habilidades (por defecto cuando no hay subcomando).
- `skills list --json`: emite un inventario de habilidades legible por máquina en stdout.
- `skills list --verbose`: incluye los requisitos faltantes en la tabla.
- `skills info <name>`: muestra detalles de una habilidad.
- `skills info <name> --json`: emite detalles legibles por máquina en stdout.
- `skills check`: resumen de requisitos listos frente a faltantes.
- `skills check --json`: emite salida de preparación legible por máquina en stdout.

Opciones:

- `--eligible`: muestra solo habilidades listas.
- `--json`: salida JSON (sin estilo).
- `-v`, `--verbose`: incluye el detalle de los requisitos faltantes.

Consejo: usa `openclaw skills search`, `openclaw skills install` y `openclaw skills update` para habilidades respaldadas por ClawHub.

### `pairing`

Aprueba solicitudes de emparejamiento de MD a través de canales.

Subcomandos:

- `pairing list [channel] [--channel <channel>] [--account <id>] [--json]`
- `pairing approve <channel> <code> [--account <id>] [--notify]`
- `pairing approve --channel <channel> [--account <id>] <code> [--notify]`

Notas:

- Si hay exactamente un canal con capacidad de emparejamiento configurado, también se permite `pairing approve <code>`.
- `list` y `approve` ambos soportan `--account <id>` para canales multicuenta.

### `devices`

Administra entradas de emparejamiento de dispositivos de puerta de enlace y tokens de dispositivo por rol.

Subcomandos:

- `devices list [--json]`
- `devices approve [requestId] [--latest]`
- `devices reject <requestId>`
- `devices remove <deviceId>`
- `devices clear --yes [--pending]`
- `devices rotate --device <id> --role <role> [--scope <scope...>]`
- `devices revoke --device <id> --role <role>`

Notas:

- `devices list` y `devices approve` pueden usar archivos de emparejamiento locales en el bucle local (loopback) cuando el ámbito de emparejamiento directo no está disponible.
- `devices approve` selecciona automáticamente la solicitud pendiente más reciente cuando no se pasa ningún `requestId` o se establece `--latest`.
- Las reconexiones con token almacenado reutilizan los ámbitos aprobados en caché del token; la `devices rotate --scope ...` explícita actualiza ese conjunto de ámbitos almacenados para futuras reconexiones con token en caché.
- `devices rotate` y `devices revoke` devuelven cargas JSON.

### `qr`

Genera un código QR y un código de configuración de emparejamiento móvil a partir de la configuración actual de Gateway. Consulte [`openclaw qr`](/en/cli/qr).

Opciones:

- `--remote`
- `--url <url>`
- `--public-url <url>`
- `--token <token>`
- `--password <password>`
- `--setup-code-only`
- `--no-ascii`
- `--json`

Notas:

- `--token` y `--password` son mutuamente excluyentes.
- El código de configuración lleva un token de arranque (bootstrap) de corta duración, no el token/contraseña compartida del gateway.
- El traspaso de arranque integrado mantiene el token del nodo principal en `scopes: []`.
- Cualquier token de arranque de operador traspasado permanece limitado a `operator.approvals`, `operator.read`, `operator.talk.secrets` y `operator.write`.
- Las comprobaciones de ámbito de arranque tienen prefijo de rol, de modo que la lista de permitidos del operador solo satisface las solicitudes del operador; los roles no operadores aún necesitan ámbitos bajo su propio prefijo de rol.
- `--remote` puede usar `gateway.remote.url` o la URL activa de Tailscale Serve/Funnel.
- Después de escanear, apruebe la solicitud con `openclaw devices list` / `openclaw devices approve <requestId>`.

### `clawbot`

Espacio de nombres de alias heredado. Actualmente admite `openclaw clawbot qr`, que se asigna a [`openclaw qr`](/en/cli/qr).

### `hooks`

Administrar los hooks internos del agente.

Subcomandos:

- `hooks list`
- `hooks info <name>`
- `hooks check`
- `hooks enable <name>`
- `hooks disable <name>`
- `hooks install <path-or-spec>` (alias obsoleto para `openclaw plugins install`)
- `hooks update [id]` (alias obsoleto para `openclaw plugins update`)

Opciones comunes:

- `--json`
- `--eligible`
- `-v`, `--verbose`

Notas:

- Los hooks gestionados por complementos no se pueden activar o desactivar a través de `openclaw hooks`; en su lugar, active o desactive el complemento propietario.
- `hooks install` y `hooks update` todavía funcionan como alias de compatibilidad, pero imprimen advertencias de obsolescencia y reenvían a los comandos del complemento.

### `webhooks`

Auxiliares de webhooks. La superficie integrada actual es la configuración de Gmail Pub/Sub + runner:

- `webhooks gmail setup`
- `webhooks gmail run`

### `webhooks gmail`

Configuración y ejecución del hook de Gmail Pub/Sub. Consulte [Gmail Pub/Sub](/en/automation/cron-jobs#gmail-pubsub-integration).

Subcomandos:

- `webhooks gmail setup` (requiere `--account <email>`; soporta `--project`, `--topic`, `--subscription`, `--label`, `--hook-url`, `--hook-token`, `--push-token`, `--bind`, `--port`, `--path`, `--include-body`, `--max-bytes`, `--renew-minutes`, `--tailscale`, `--tailscale-path`, `--tailscale-target`, `--push-endpoint`, `--json`)
- `webhooks gmail run` (anulaciones en tiempo de ejecución para las mismas opciones)

Notas:

- `setup` configura la vigilancia de Gmail más la ruta de envío orientada a OpenClaw.
- `run` inicia el bucle local de vigilancia/renovación de Gmail con anulaciones opcionales en tiempo de ejecución.

### `dns`

Auxiliares de DNS de descubrimiento de área amplia (CoreDNS + Tailscale). Superficie integrada actual:

- `dns setup [--domain <domain>] [--apply]`

### `dns setup`

Auxiliar de DNS de descubrimiento de área amplia (CoreDNS + Tailscale). Consulte [/gateway/discovery](/en/gateway/discovery).

Opciones:

- `--domain <domain>`
- `--apply`: instalar/actualizar la configuración de CoreDNS (requiere sudo; solo macOS).

Notas:

- Sin `--apply`, esto es un auxiliar de planificación que imprime la configuración recomendada de OpenClaw + Tailscale DNS.
- `--apply` actualmente es compatible con macOS solo con CoreDNS de Homebrew.

## Mensajería + agente

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

Ejecuta un turno de agente a través de Gateway (o `--local` integrado).

Pase al menos un selector de sesión: `--to`, `--session-id` o `--agent`.

Obligatorio:

- `-m, --message <text>`

Opciones:

- `-t, --to <dest>` (para la clave de sesión y entrega opcional)
- `--session-id <id>`
- `--agent <id>` (id. de agente; anula los enlaces de enrutamiento)
- `--thinking <off|minimal|low|medium|high|xhigh>` (el soporte del proveedor varía; no restringido por modelo a nivel de CLI)
- `--verbose <on|off>`
- `--channel <channel>` (canal de entrega; omitir para usar el canal de sesión principal)
- `--reply-to <target>` (anulación del destino de entrega, separada del enrutamiento de sesión)
- `--reply-channel <channel>` (anulación del canal de entrega)
- `--reply-account <id>` (invalidación del id de cuenta de entrega)
- `--local` (ejecución integrada; el registro de complementos todavía se precarga primero)
- `--deliver`
- `--json`
- `--timeout <seconds>`

Notas:

- El modo de puerta de enlace recurre al agente integrado cuando falla la solicitud de la puerta de enlace.
- `--local` todavía precarga el registro de complementos, por lo que los proveedores, herramientas y canales proporcionados por complementos permanecen disponibles durante las ejecuciones integradas.
- `--channel`, `--reply-channel` y `--reply-account` afectan la entrega de respuestas, no el enrutamiento.

### `agents`

Administrar agentes aislados (espacios de trabajo + autenticación + enrutamiento).

Ejecutar `openclaw agents` sin un subcomando es equivalente a `openclaw agents list`.

#### `agents list`

Listar los agentes configurados.

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

Las especificaciones de enlace usan `channel[:accountId]`. Cuando se omite `accountId`, OpenClaw puede resolver el alcance de la cuenta a través de los valores predeterminados del canal/ganchos de complementos; de lo contrario, es un enlace de canal sin un alcance de cuenta explícito.
Pasar cualquier indicador de adición explícito cambia el comando a la ruta no interactiva. `main` está reservado y no se puede usar como el nuevo id de agente.

#### `agents bindings`

Listar enlaces de enrutamiento.

Opciones:

- `--agent <id>`
- `--json`

#### `agents bind`

Agregar enlaces de enrutamiento para un agente.

Opciones:

- `--agent <id>` (el valor predeterminado es el agente predeterminado actual)
- `--bind <channel[:accountId]>` (repetible)
- `--json`

#### `agents unbind`

Eliminar los enlaces de enrutamiento para un agente.

Opciones:

- `--agent <id>` (el valor predeterminado es el agente predeterminado actual)
- `--bind <channel[:accountId]>` (repetible)
- `--all`
- `--json`

Use `--all` o `--bind`, pero no ambos.

#### `agents delete <id>`

Eliminar un agente y podar su espacio de trabajo + estado.

Opciones:

- `--force`
- `--json`

Notas:

- `main` no se puede eliminar.
- Sin `--force`, se requiere confirmación interactiva.

#### `agents set-identity`

Actualizar la identidad de un agente (nombre/tema/emoji/avatar).

Opciones:

- `--agent <id>`
- `--workspace <dir>`
- `--identity-file <path>`
- `--from-identity`
- `--name <name>`
- `--theme <theme>`
- `--emoji <emoji>`
- `--avatar <value>`
- `--json`

Notas:

- Se puede usar `--agent` o `--workspace` para seleccionar el agente de destino.
- Cuando no se proporcionan campos de identidad explícitos, el comando lee `IDENTITY.md`.

### `acp`

Ejecutar el puente ACP que conecta los IDE con la puerta de enlace (Gateway).

Opciones raíz:

- `--url <url>`
- `--token <token>`
- `--token-file <path>`
- `--password <password>`
- `--password-file <path>`
- `--session <key>`
- `--session-label <label>`
- `--require-existing`
- `--reset-session`
- `--no-prefix-cwd`
- `--provenance <off|meta|meta+receipt>`
- `--verbose`

#### `acp client`

Cliente interactivo de ACP para la depuración del puente.

Opciones:

- `--cwd <dir>`
- `--server <command>`
- `--server-args <args...>`
- `--server-verbose`
- `--verbose`

Consulte [`acp`](/en/cli/acp) para obtener el comportamiento completo, las notas de seguridad y los ejemplos.

### `mcp`

Administrar definiciones guardadas de servidor MCP y exponer canales OpenClaw a través de MCP stdio.

#### `mcp serve`

Exponer conversaciones de canales OpenClaw enrutadas a través de MCP stdio.

Opciones:

- `--url <url>`
- `--token <token>`
- `--token-file <path>`
- `--password <password>`
- `--password-file <path>`
- `--claude-channel-mode <auto|on|off>`
- `--verbose`

#### `mcp list`

Listar definiciones guardadas de servidor MCP.

Opciones:

- `--json`

#### `mcp show [name]`

Mostrar una definición guardada de servidor MCP o el objeto completo de servidor MCP guardado.

Opciones:

- `--json`

#### `mcp set <name> <value>`

Guardar una definición de servidor MCP desde un objeto JSON.

#### `mcp unset <name>`

Eliminar una definición guardada de servidor MCP.

### `approvals`

Administrar aprobaciones de exec. Alias: `exec-approvals`.

#### `approvals get`

Obtener la instantánea de aprobaciones de exec y la política efectiva.

Opciones:

- `--node <node>`
- `--gateway`
- `--json`
- opciones RPC de nodo de `openclaw nodes`

#### `approvals set`

Reemplazar aprobaciones de exec con JSON de un archivo o stdin.

Opciones:

- `--node <node>`
- `--gateway`
- `--file <path>`
- `--stdin`
- `--json`
- opciones RPC de nodo de `openclaw nodes`

#### `approvals allowlist add|remove`

Editar la lista blanca de exec por agente.

Opciones:

- `--node <node>`
- `--gateway`
- `--agent <id>` (por defecto `*`)
- `--json`
- opciones RPC de nodo de `openclaw nodes`

### `status`

Mostrar el estado de salud de la sesión vinculada y los destinatarios recientes.

Opciones:

- `--json`
- `--all`%% (diagnóstico completo; solo lectura, pegable)
- `--deep` (solicita al gateway una sonda de estado en vivo, incluyendo sondas de canal cuando sea compatible)
- `--usage` (muestra el uso/cuota del proveedor del modelo)
- `--timeout <ms>`
- `--verbose`
- `--debug` (alias para `--verbose`)

Notas:

- La descripción general incluye el estado del servicio del Gateway + host del nodo cuando esté disponible.
- `--usage` imprime las ventanas de uso del proveedor normalizadas como `X% left`.

### Seguimiento del uso

OpenClaw puede mostrar el uso/cuota del proveedor cuando las credenciales de OAuth/API están disponibles.

Muestra:

- `/status` (añade una línea breve de uso del proveedor cuando esté disponible)
- `openclaw status --usage` (imprime el desglose completo del proveedor)
- Barra de menús de macOS (sección Uso en Contexto)

Notas:

- Los datos provienen directamente de los puntos finales de uso del proveedor (sin estimaciones).
- La salida legible para humanos se normaliza a `X% left` entre proveedores.
- Proveedores con ventanas de uso actuales: Anthropic, GitHub Copilot, Gemini CLI, OpenAI Codex, MiniMax, Xiaomi y z.ai.
- Nota sobre MiniMax: `usage_percent` / `usagePercent` sin procesar significa cuota restante, por lo que OpenClaw lo invierte antes de mostrarlo; los campos basados en recuentos aún tienen prioridad cuando están presentes. Las respuestas de `model_remains` prefieren la entrada del modelo de chat, derivan la etiqueta de la ventana de las marcas de tiempo cuando es necesario e incluyen el nombre del modelo en la etiqueta del plan.
- La autenticación de uso proviene de enlaces específicos del proveedor cuando están disponibles; de lo contrario, OpenClaw recurre a hacer coincidir las credenciales de clave de OAuth/API de los perfiles de autenticación, variables de entorno o configuración. Si ninguna se resuelve, el uso se oculta.
- Detalles: consulte [Seguimiento del uso](/en/concepts/usage-tracking).

### `health`

Obtener el estado del Gateway que se está ejecutando.

Opciones:

- `--json`
- `--timeout <ms>`
- `--verbose` (fuerza una sonda en vivo e imprime los detalles de la conexión del gateway)
- `--debug` (alias para `--verbose`)

Notas:

- El `health` predeterminado puede devolver una instantánea en caché reciente del gateway.
- `health --verbose` fuerza una sonda en vivo y expande la salida legible por humanos en todas las cuentas y agentes configurados.

### `sessions`

Lista las sesiones de conversación almacenadas.

Opciones:

- `--json`
- `--verbose`
- `--store <path>`
- `--active <minutes>`
- `--agent <id>` (filtrar sesiones por agente)
- `--all-agents` (mostrar sesiones en todos los agentes)

Subcomandos:

- `sessions cleanup` — eliminar sesiones caducadas o huérfanas

Notas:

- `sessions cleanup` también admite `--fix-missing` para eliminar entradas cuyos archivos de transcripción hayan desaparecido.

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

Desinstalar el servicio de puerta de enlace + datos locales (la CLI se mantiene).

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
- `--all` elimina el servicio, el estado, el espacio de trabajo y la aplicación juntos.

### `tasks`

Administrar y listar las ejecuciones de [tareas en segundo plano](/en/automation/tasks) en los agentes.

- `tasks list` — mostrar ejecuciones de tareas activas y recientes
- `tasks show <id>` — mostrar detalles de una ejecución de tarea específica
- `tasks notify <id>` — cambiar la política de notificación para una ejecución de tarea
- `tasks cancel <id>` — cancelar una tarea en ejecución
- `tasks audit` — mostrar problemas operativos (obsoletos, perdidos, errores de entrega)
- `tasks maintenance [--apply] [--json]` — vista previa o aplicar tareas y limpieza/conciliación de TaskFlow (sesiones secundarias de ACP/subagente, trabajos cron activos, ejecuciones de CLI en vivo)
- `tasks flow list` — listar flujos de Task Flow activos y recientes
- `tasks flow show <lookup>` — inspeccionar un flujo por id o clave de búsqueda
- `tasks flow cancel <lookup>` — cancelar un flujo en ejecución y sus tareas activas

### `flows`

Acceso directo a documentación heredada. Los comandos de flujo se encuentran bajo `openclaw tasks flow`:

- `tasks flow list [--json]`
- `tasks flow show <lookup>`
- `tasks flow cancel <lookup>`

## Gateway

### `gateway`

Ejecutar el WebSocket Gateway.

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
- `--force` (matar escucha existente en el puerto)
- `--verbose`
- `--ws-log <auto|full|compact>`
- `--compact` (alias para `--ws-log compact`)
- `--raw-stream`
- `--raw-stream-path <path>`

### `gateway service`

Administrar el servicio Gateway (launchd/systemd/schtasks).

Subcomandos:

- `gateway status` (sondea el RPC de Gateway de forma predeterminada)
- `gateway install` (instalación del servicio)
- `gateway uninstall`
- `gateway start`
- `gateway stop`
- `gateway restart`

Notas:

- `gateway status` sondea el RPC de Gateway de forma predeterminada utilizando el puerto/configuración resuelta del servicio (anular con `--url/--token/--password`).
- `gateway status` admite `--no-probe`, `--deep`, `--require-rpc` y `--json` para secuencias de comandos.
- `gateway status` también muestra servicios de puerta de enlace heredados o adicionales cuando puede detectarlos (`--deep` agrega escaneos a nivel del sistema). Los servicios de OpenClaw con nombre de perfil se tratan como de primera clase y no se marcan como "extra".
- `gateway status` permanece disponible para diagnósticos incluso cuando falta la configuración local de la CLI o no es válida.
- `gateway status` imprime la ruta del registro de archivos resuelta, la instantánea de rutas/validez de la configuración de CLI frente a servicio, y la URL de destino de sondeo resuelta.
- Si los SecretRefs de autenticación de la puerta de enlace no se resuelven en la ruta del comando actual, `gateway status --json` informa `rpc.authWarning` solo cuando falla la conectividad/autenticación del sondeo (las advertencias se suprimen cuando el sondeo tiene éxito).
- En las instalaciones de systemd en Linux, las comprobaciones de deriva de token de estado incluyen ambas fuentes de unidades `Environment=` y `EnvironmentFile=`.
- `gateway install|uninstall|start|stop|restart` soporta `--json` para secuencias de comandos (la salida predeterminada sigue siendo amigable para humanos).
- `gateway install` usa el tiempo de ejecución de Node de forma predeterminada; bun **no es recomendable** (errores de WhatsApp/Telegram).
- Opciones de `gateway install`: `--port`, `--runtime`, `--token`, `--force`, `--json`.

### `daemon`

Alias heredado para los comandos de gestión de servicio de la puerta de enlace. Consulte [/cli/daemon](/en/cli/daemon).

Subcomandos:

- `daemon status`
- `daemon install`
- `daemon uninstall`
- `daemon start`
- `daemon stop`
- `daemon restart`

Opciones comunes:

- `status`: `--url`, `--token`, `--password`, `--timeout`, `--no-probe`, `--require-rpc`, `--deep`, `--json`
- `install`: `--port`, `--runtime <node|bun>`, `--token`, `--force`, `--json`
- `uninstall|start|stop|restart`: `--json`

### `logs`

Seguir registros de archivos de Gateway a través de RPC.

Opciones:

- `--limit <n>`: número máximo de líneas de registro a devolver
- `--max-bytes <n>`: bytes máximos a leer del archivo de registro
- `--follow`: seguir el archivo de registro (estilo tail -f)
- `--interval <ms>`: intervalo de sondeo en ms al seguir
- `--local-time`: mostrar marcas de tiempo en hora local
- `--json`: emitir JSON delimitado por líneas
- `--plain`: deshabilitar el formato estructurado
- `--no-color`: deshabilitar colores ANSI
- `--url <url>`: URL explícita de WebSocket de Gateway
- `--token <token>`: token de Gateway
- `--timeout <ms>`: tiempo de espera de RPC de Gateway
- `--expect-final`: esperar una respuesta final cuando sea necesario

Ejemplos:

```bash
openclaw logs --follow
openclaw logs --limit 200
openclaw logs --plain
openclaw logs --json
openclaw logs --no-color
```

Notas:

- Si pasa `--url`, la CLI no aplica automáticamente la configuración ni las credenciales del entorno.
- Los fallos de emparejamiento de bucle local local vuelven al archivo de registro local configurado; los destinos `--url` explícitos no.

### `gateway <subcommand>`

Auxiliares de CLI de Gateway (use `--url`, `--token`, `--password`, `--timeout`, `--expect-final` para subcomandos RPC).
Cuando pase `--url`, la CLI no aplica automáticamente la configuración ni las credenciales del entorno.
Incluya `--token` o `--password` explícitamente. La falta de credenciales explícitas es un error.

Subcomandos:

- `gateway call <method> [--params <json>] [--url <url>] [--token <token>] [--password <password>] [--timeout <ms>] [--expect-final] [--json]`
- `gateway health`
- `gateway status`
- `gateway probe`
- `gateway discover`
- `gateway install|uninstall|start|stop|restart`
- `gateway run`

Notas:

- `gateway status --deep` añade un escaneo de servicio a nivel del sistema. Use `gateway probe`,
  `health --verbose`, o el `status --deep` de nivel superior para obtener más detalles de la sonda de ejecución.

RPCs comunes:

- `config.schema.lookup` (inspeccionar un subárbol de configuración con un nodo de esquema superficial, metadatos de sugerencia coincidentes y resúmenes de hijos inmediatos)
- `config.get` (leer instantánea de configuración actual + hash)
- `config.set` (validar + escribir configuración completa; use `baseHash` para concurrencia optimista)
- `config.apply` (validar + escribir configuración + reiniciar + despertar)
- `config.patch` (combinar una actualización parcial + reiniciar + despertar)
- `update.run` (ejecutar actualización + reiniciar + despertar)

Sugerencia: al llamar a `config.set`/`config.apply`/`config.patch` directamente, pase `baseHash` de
`config.get` si ya existe una configuración.
Sugerencia: para ediciones parciales, inspeccione primero con `config.schema.lookup` y prefiera `config.patch`.
Sugerencia: estos RPCs de escritura de configuración verifican previamente la resolución activa de SecretRef para las referencias en la carga útil de configuración enviada y rechazan las escrituras cuando una referencia enviada efectivamente activa no está resuelta.
Sugerencia: la herramienta de tiempo de ejecución `gateway` solo para propietarios aún se niega a reescribir `tools.exec.ask` o `tools.exec.security`; los alias `tools.bash.*` heredados se normalizan a las mismas rutas de ejecución protegidas.

## Modelos

Consulte [/concepts/models](/en/concepts/models) para conocer el comportamiento de reserva y la estrategia de escaneo.

Nota de facturación: para Anthropic en OpenClaw, la división práctica es **API key** o
**suscripción Claude con Extra Usage**. Anthropic notificó a los usuarios de OpenClaw el
**4 de abril de 2026 a las 12:00 PM PT / 8:00 PM BST** que la ruta de inicio de sesión de
**OpenClaw** Claude cuenta como uso de arnés de terceros y requiere
**Extra Usage** facturado por separado de la suscripción. Nuestras reproduciones locales también
muestran que la cadena de identificación de OpenClaw no se reproduce en la ruta del
SDK de Anthropic + clave API. Para producción, se prefiere una clave API de Anthropic u
otro proveedor compatible con estilo de suscripción, como OpenAI Codex, Alibaba
Cloud Model Studio Coding Plan, MiniMax Coding Plan o Z.AI / GLM Coding
Plan.

El token de configuración de Anthropic (setup-token) está disponible nuevamente como una ruta de autenticación heredada/manual.
Úselo solo con la expectativa de que Anthropic informó a los usuarios de OpenClaw que la ruta de suscripción de Anthropic administrada por OpenClaw requiere **Extra Usage**.

### `models` (raíz)

`openclaw models` es un alias de `models status`.

Opciones raíz:

- `--status-json` (alias de `models status --json`)
- `--status-plain` (alias de `models status --plain`)

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
- `--check` (salida 1=expirado/ausente, 2=por expirar)
- `--probe` (sondeo en vivo de perfiles de autenticación configurados)
- `--probe-provider <name>`
- `--probe-profile <id>` (repetir o separados por comas)
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`
- `--agent <id>`

Siempre incluye la descripción general de autenticación y el estado de expiración de OAuth para los perfiles en el almacén de autenticación.
`--probe` ejecuta solicitudes en vivo (puede consumir tokens y activar límites de velocidad).
Las filas de prueba pueden provenir de perfiles de autenticación, credenciales de entorno o `models.json`.
Espere estados de prueba como `ok`, `auth`, `rate_limit`, `billing`, `timeout`,
`format`, `unknown` y `no_model`.
Cuando un `auth.order.<provider>` explícito omite un perfil almacenado, la prueba reporta
`excluded_by_auth_order` en lugar de intentar silenciosamente ese perfil.

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

### `models auth add|login|login-github-copilot|setup-token|paste-token`

Opciones:

- `add`: asistente de autenticación interactiva (flujo de autenticación del proveedor o pegado de token)
- `login`: `--provider <name>`, `--method <method>`, `--set-default`
- `login-github-copilot`: flujo de inicio de sesión OAuth de GitHub Copilot (`--yes`)
- `setup-token`: `--provider <name>`, `--yes`
- `paste-token`: `--provider <name>`, `--profile-id <id>`, `--expires-in <duration>`

Notas:

- `setup-token` y `paste-token` son comandos genéricos de token para proveedores que exponen métodos de autenticación por token.
- `setup-token` requiere un TTY interactivo y ejecuta el método token-auth del proveedor.
- `paste-token` solicita el valor del token y utiliza por defecto el id de perfil de autenticación `<provider>:manual` cuando se omite `--profile-id`.
- Anthropic `setup-token` / `paste-token` están disponibles nuevamente como una ruta heredada/manual de OpenClaw. Anthropic informó a los usuarios de OpenClaw que esta ruta requiere **Uso Adicional** en la cuenta de Claude.

### `models auth order get|set|clear`

Opciones:

- `get`: `--provider <name>`, `--agent <id>`, `--json`
- `set`: `--provider <name>`, `--agent <id>`, `<profileIds...>`
- `clear`: `--provider <name>`, `--agent <id>`

## Sistema

### `system event`

Poner en cola un evento del sistema y opcionalmente activar un latido (Gateway RPC).

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

Lista las entradas de presencia del sistema (Gateway RPC).

Opciones:

- `--json`
- `--url`, `--token`, `--timeout`, `--expect-final`

## Cron

Administra trabajos programados (Gateway RPC). Consulta [/automation/cron-jobs](/en/automation/cron-jobs).

Subcomandos:

- `cron status [--json]`
- `cron list [--all] [--json]` (salida de tabla por defecto; usa `--json` para datos brutos)
- `cron add` (alias: `create`; requiere `--name` y exactamente uno de `--at` | `--every` | `--cron`, y exactamente una carga de `--system-event` | `--message`)
- `cron edit <id>` (campos de parche)
- `cron rm <id>` (alias: `remove`, `delete`)
- `cron enable <id>`
- `cron disable <id>`
- `cron runs --id <id> [--limit <n>]`
- `cron run <id> [--due]`

Todos los comandos `cron` aceptan `--url`, `--token`, `--timeout`, `--expect-final`.

`cron add|edit --model ...` usa el modelo permitido seleccionado para el trabajo. Si
el modelo no está permitido, cron advierte y recurre a la selección del modelo
agente/predeterminado del trabajo en su lugar. Las cadenas de retroceso configuradas
siguen aplicándose, pero una anulación de modelo simple sin una lista de retroceso
explícita por trabajo ya no agrega el principal del agente como un objetivo de
reintento adicional oculto.

## Node host

### `node`

`node` ejecuta un **node host** sin interfaz o lo gestiona como
un servicio en segundo plano. Consulta [`openclaw node`](/en/cli/node).

Subcomandos:

- `node run --host <gateway-host> --port 18789`
- `node status`
- `node install [--host <gateway-host>] [--port <port>] [--tls] [--tls-fingerprint <sha256>] [--node-id <id>] [--display-name <name>] [--runtime <node|bun>] [--force]`
- `node uninstall`
- `node stop`
- `node restart`

Notas de autenticación:

- `node` resuelve la autenticación de la puerta de enlace desde el entorno/configuración (sin marcadores `--token`/`--password`): `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`, luego `gateway.auth.*`. En modo local, el host del nodo ignora intencionalmente `gateway.remote.*`; en `gateway.mode=remote`, `gateway.remote.*` participa según las reglas de precedencia remota.
- La resolución de autenticación del host del nodo solo respeta las variables de entorno `OPENCLAW_GATEWAY_*`.

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

Lienzo + pantalla:

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

- `--url`, `--token`, `--timeout`, `--expect-final`, `--json`
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
- `browser create-profile --name <name> [--color <hex>] [--cdp-url <url>] [--driver existing-session] [--user-data-dir <path>]`
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

## Llamada de voz

### `voicecall`

Utilidades de llamada de voz proporcionadas por el complemento. Solo aparecen cuando el complemento de llamada de voz está instalado y habilitado. Consulte [`openclaw voicecall`](/en/cli/voicecall).

Comandos comunes:

- `voicecall call --to <phone> --message <text> [--mode notify|conversation]`
- `voicecall start --to <phone> [--message <text>] [--mode notify|conversation]`
- `voicecall continue --call-id <id> --message <text>`
- `voicecall speak --call-id <id> --message <text>`
- `voicecall end --call-id <id>`
- `voicecall status --call-id <id>`
- `voicecall tail [--file <path>] [--since <n>] [--poll <ms>]`
- `voicecall latency [--file <path>] [--last <n>]`
- `voicecall expose [--mode off|serve|funnel] [--path <path>] [--port <port>] [--serve-path <path>]`

## Búsqueda en la documentación

### `docs`

Busque en el índice de la documentación en vivo de OpenClaw.

### `docs [query...]`

Busque en el índice de la documentación en vivo.

## TUI

### `tui`

Abra la interfaz de usuario de terminal conectada a Gateway.

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
