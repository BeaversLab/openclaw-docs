---
summary: "OpenClaw CLI index: command list, global flags, and links to per-command pages"
read_when:
  - Finding the right `openclaw` subcommand
  - Looking up global flags or output styling rules
title: "CLI reference"
---

`openclaw` is the main CLI entry point. Each core command has either a
dedicated reference page or is documented with the command it aliases; this
index lists the commands, the global flags, and the output styling rules that
apply across the CLI.

## Command pages

| Area                 | Commands                                                                                                                                                                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Setup and onboarding | [`crestodian`](/en/cli/crestodian) · [`setup`](/en/cli/setup) · [`onboard`](/en/cli/onboard) · [`configure`](/en/cli/configure) · [`config`](/en/cli/config) · [`completion`](/en/cli/completion) · [`doctor`](/en/cli/doctor) · [`dashboard`](/en/cli/dashboard) |
| Reset and uninstall  | [`backup`](/en/cli/backup) · [`reset`](/en/cli/reset) · [`uninstall`](/en/cli/uninstall) · [`update`](/en/cli/update)                                                                                                                                 |
| Messaging and agents | [`message`](/en/cli/message) · [`agent`](/en/cli/agent) · [`agents`](/en/cli/agents) · [`acp`](/en/cli/acp) · [`mcp`](/en/cli/mcp)                                                                                                                       |
| Health and sessions  | [`status`](/en/cli/status) · [`health`](/en/cli/health) · [`sessions`](/en/cli/sessions)                                                                                                                                                           |
| Gateway and logs     | [`gateway`](/en/cli/gateway) · [`logs`](/en/cli/logs) · [`system`](/en/cli/system)                                                                                                                                                                 |
| Models and inference | [`models`](/en/cli/models) · [`infer`](/en/cli/infer) · `capability` (alias for [`infer`](/en/cli/infer)) · [`memory`](/en/cli/memory) · [`wiki`](/en/cli/wiki)                                                                                          |
| Network and nodes    | [`directory`](/en/cli/directory) · [`nodes`](/en/cli/nodes) · [`devices`](/en/cli/devices) · [`node`](/en/cli/node)                                                                                                                                   |
| Runtime and sandbox  | [`approvals`](/en/cli/approvals) · `exec-policy` (see [`approvals`](/en/cli/approvals)) · [`sandbox`](/en/cli/sandbox) · [`tui`](/en/cli/tui) · `chat`/`terminal` (aliases for [`tui --local`](/en/cli/tui)) · [`browser`](/en/cli/browser)                 |
| Automation           | [`cron`](/en/cli/cron) · [`tasks`](/en/cli/tasks) · [`hooks`](/en/cli/hooks) · [`webhooks`](/en/cli/webhooks)                                                                                                                                         |
| Discovery and docs   | [`dns`](/en/cli/dns) · [`docs`](/en/cli/docs)                                                                                                                                                                                                   |
| Pairing and channels | [`pairing`](/en/cli/pairing) · [`qr`](/en/cli/qr) · [`channels`](/en/cli/channels)                                                                                                                                                                 |
| Security and plugins | [`security`](/en/cli/security) · [`secrets`](/en/cli/secrets) · [`skills`](/en/cli/skills) · [`plugins`](/en/cli/plugins) · [`proxy`](/en/cli/proxy)                                                                                                     |
| Legacy aliases       | [`daemon`](/en/cli/daemon) (gateway service) · [`clawbot`](/en/cli/clawbot) (namespace)                                                                                                                                                         |
| Plugins (optional)   | [`voicecall`](/en/cli/voicecall) (if installed)                                                                                                                                                                                              |

## Global flags

| Flag                    | Purpose                                                               |
| ----------------------- | --------------------------------------------------------------------- |
| `--dev`                 | Isolate state under `~/.openclaw-dev` and shift default ports         |
| `--profile <name>`      | Isolate state under `~/.openclaw-<name>`                              |
| `--container <name>`    | Target a named container for execution                                |
| `--no-color`            | Disable ANSI colors (`NO_COLOR=1` is also respected)                  |
| `--update`              | Shorthand for [`openclaw update`](/en/cli/update) (source installs only) |
| `-V`, `--version`, `-v` | Print version and exit                                                |

## Output modes

- ANSI colors and progress indicators render only in TTY sessions.
- OSC-8 hyperlinks render as clickable links where supported; otherwise the
  CLI falls back to plain URLs.
- `--json` (and `--plain` where supported) disables styling for clean output.
- Long-running commands show a progress indicator (OSC 9;4 when supported).

Palette source of truth: `src/terminal/palette.ts`.

## Command tree

<Accordion title="Full command tree">

```
openclaw [--dev] [--profile <name>] <command>
  crestodian
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
  wiki
    status
    doctor
    init
    ingest
    compile
    lint
    search
    get
    apply
    bridge import
    unsafe-local import
    obsidian status|search|open|command|daily
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
  infer (alias: capability)
    list
    inspect
    model run|list|inspect|providers|auth login|logout|status
    image generate|edit|describe|describe-many|providers
    audio transcribe|providers
    tts convert|voices|providers|status|enable|disable|set-provider
    video generate|describe|providers
    web search|fetch|providers
    embedding create|providers
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
  exec-policy
    show
    preset
    set
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
  proxy
    start
    run
    coverage
    sessions
    query
    blob
    purge
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
  chat (alias: tui --local)
  terminal (alias: tui --local)
```

Plugins can add additional top-level commands (for example `openclaw voicecall`).

</Accordion>

## Chat slash commands

Chat messages support `/...` commands. See [slash commands](/en/tools/slash-commands).

Highlights:

- `/status` — quick diagnostics.
- `/trace` — session-scoped plugin trace/debug lines.
- `/config` — persisted config changes.
- `/debug` — runtime-only config overrides (memory, not disk; requires `commands.debug: true`).

## Usage tracking

`openclaw status --usage` and the Control UI surface provider usage/quota when
OAuth/API credentials are available. Data comes directly from provider usage
endpoints and is normalized to `X% left`. Providers with current usage
windows: Anthropic, GitHub Copilot, Gemini CLI, OpenAI Codex, MiniMax,
Xiaomi, and z.ai.

See [Usage tracking](/en/concepts/usage-tracking) for details.

## Related

- [Slash commands](/en/tools/slash-commands)
- [Configuration](/en/gateway/configuration)
- [Environment](/en/help/environment)
