---
summary: "OpenClaw CLI index: command list, global flags, and links to per-command pages"
read_when:
  - Finding the right `openclaw` subcommand
  - Looking up global flags or output styling rules
title: "CLI reference"
---

`openclaw` is the main CLI entry point. Each core command has a dedicated
reference page or is documented with the command it aliases; this index lists
the commands, global flags, and output styling rules that apply across the CLI.

Setup commands by intent:

- `openclaw setup` and `openclaw onboard` verify inference first, then start OpenClaw for Gateway, workspace, channels, skills, and health setup.
- `openclaw setup --baseline` creates the baseline config and workspace without walking the guided onboarding flow.
- `openclaw configure` changes targeted parts of an existing setup: model auth, gateway, channels, plugins, or skills.
- `openclaw channels add` configures channel accounts after the baseline exists; a channel selection alone uses guided setup, while account, credential, or channel-config flags use the direct path for scripts.

## Command pages

| Area                         | Commands                                                                                                                                                                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Setup and onboarding         | [`openclaw`](/en/cli/openclaw) · [`setup`](/en/cli/setup) · [`onboard`](/en/cli/onboard) · [`configure`](/en/cli/configure) · [`config`](/en/cli/config) · [`completion`](/en/cli/completion) · [`doctor`](/en/cli/doctor) · [`dashboard`](/en/cli/dashboard) |
| Reset, backup, and migration | [`backup`](/en/cli/backup) · [`migrate`](/en/cli/migrate) · [`reset`](/en/cli/reset) · [`uninstall`](/en/cli/uninstall) · [`update`](/en/cli/update)                                                                                                 |
| Messaging and agents         | [`message`](/en/cli/message) · [`agent`](/en/cli/agent) · [`agents`](/en/cli/agents) · [`attach`](/en/cli/attach) · [`acp`](/en/cli/acp) · [`mcp`](/en/cli/mcp)                                                                                         |
| Health and sessions          | [`status`](/en/cli/status) · [`health`](/en/cli/health) · [`sessions`](/en/cli/sessions) · [`resume`](/en/cli/resume) · [`audit`](/en/cli/audit)                                                                                                     |
| Gateway and logs             | [`gateway`](/en/cli/gateway) · [`logs`](/en/cli/logs) · [`system`](/en/cli/system)                                                                                                                                                             |
| Models and inference         | [`models`](/en/cli/models) · [`promos`](/en/cli/promos) · [`infer`](/en/cli/infer) · `capability` (alias for [`infer`](/en/cli/infer)) · [`memory`](/en/cli/memory) · [`wiki`](/en/cli/wiki)                                                            |
| Network and nodes            | [`directory`](/en/cli/directory) · [`nodes`](/en/cli/nodes) · [`devices`](/en/cli/devices) · [`node`](/en/cli/node) · [`worker`](/en/cli/worker)                                                                                                     |
| Runtime and sandbox          | [`approvals`](/en/cli/approvals) · `exec-policy` (see [`approvals`](/en/cli/approvals)) · [`sandbox`](/en/cli/sandbox) · [`tui`](/en/cli/tui) · `chat`/`terminal` (aliases for [`tui --local`](/en/cli/tui)) · [`browser`](/en/cli/browser)             |
| Automation                   | [`cron`](/en/cli/cron) · [`tasks`](/en/cli/tasks) · [`hooks`](/en/cli/hooks) · [`webhooks`](/en/cli/webhooks) · [`transcripts`](/en/cli/transcripts)                                                                                                 |
| Discovery and docs           | [`dns`](/en/cli/dns) · [`docs`](/en/cli/docs)                                                                                                                                                                                               |
| Pairing and channels         | [`pairing`](/en/cli/pairing) · [`qr`](/en/cli/qr) · [`channels`](/en/cli/channels)                                                                                                                                                             |
| Security and plugins         | [`security`](/en/cli/security) · [`secrets`](/en/cli/secrets) · [`skills`](/en/cli/skills) · [`plugins`](/en/cli/plugins) · [`proxy`](/en/cli/proxy)                                                                                                 |
| Legacy aliases               | [`daemon`](/en/cli/daemon) (gateway service) · [`clawbot`](/en/cli/clawbot) (namespace)                                                                                                                                                     |
| Plugins (optional)           | [`path`](/en/cli/path) · [`policy`](/en/cli/policy) · [`voicecall`](/en/cli/voicecall) · [`workboard`](/en/cli/workboard) (if installed)                                                                                                          |

## Global flags

| Flag                    | Purpose                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| `--dev`                 | Isolate state under `~/.openclaw-dev`, default gateway port 19001, and shift derived ports              |
| `--profile <name>`      | Isolate state under `~/.openclaw-<name>` (`OPENCLAW_STATE_DIR`/`OPENCLAW_CONFIG_PATH`)                  |
| `--container <name>`    | Run the CLI inside a running Podman/Docker container named `<name>` (default: env `OPENCLAW_CONTAINER`) |
| `--log-level <level>`   | Override the global log level for file + console output                                                 |
| `--no-color`            | Disable ANSI colors (`NO_COLOR=1` is also respected)                                                    |
| `--update`              | Shorthand for [`openclaw update`](/en/cli/update); works for both source checkouts and package installs    |
| `-V`, `--version`, `-v` | Print version and exit                                                                                  |

A named `--profile` replaces canonical state and config paths inherited from
another profile, including a running Gateway service. Explicitly customized
state directories and config paths remain unchanged.

## Output modes

- ANSI colors and progress indicators render only in TTY sessions.
- OSC-8 hyperlinks render as clickable links where supported; otherwise the
  CLI falls back to plain URLs.
- On bounded reporting commands, `--json` reserves stdout for one JSON document;
  styling and progress output are suppressed, and warnings and diagnostics stay on
  stderr.
- Interactive UIs and wizards, long-running servers and streams, shell integration,
  and pure side-effect commands may omit `--json` when they have no meaningful
  report to return.
- Long-running commands show a progress indicator (OSC 9;4 when supported).

### JSON failures

Successful JSON payloads remain command-specific. When a command in JSON output
mode fails, it exits nonzero and writes one JSON document to stdout with this
envelope:

```json
{
  "ok": false,
  "error": {
    "type": "cli_error",
    "message": "Description of the failure"
  }
}
```

A command may add domain-specific fields, such as per-item results, beside this
envelope. Failure messages are sanitized. Human-readable diagnostics may also be
written to stderr, so scripts should parse stdout and still check the exit status.

## Color palette

OpenClaw uses a lobster palette for CLI output:

| Token          | Hex       | Used for                             |
| -------------- | --------- | ------------------------------------ |
| `accent`       | `#FF5A2D` | Headings, labels, primary highlights |
| `accentBright` | `#FF7A3D` | Command names, emphasis              |
| `accentDim`    | `#D14A22` | Secondary highlight text             |
| `info`         | `#FF8A5B` | Informational values                 |
| `success`      | `#2FBF71` | Success states                       |
| `warn`         | `#FFB020` | Warnings, option flags, fallbacks    |
| `error`        | `#E23D2D` | Errors, failures                     |
| `muted`        | `#8B7F77` | De-emphasis, metadata                |

Palette source of truth: `packages/terminal-core/src/palette.ts`.

## Command tree

<Accordion title="Full command tree">

This map covers core commands and their primary subcommands. Plugin-added
subcommands (for example under `skills`, `plugins`, and `wiki`) evolve
independently; run `<command> --help` for the authoritative, current list.

```
openclaw [--dev] [--profile <name>] <command>
  openclaw
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
  migrate
    list
    plan <provider>
    apply <provider>
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
    repair
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
    verify
    workshop list|inspect|propose-create|propose-update|revise|apply|reject|quarantine
    list
    info
    check
  plugins
    list
    search
    inspect
    install
    uninstall
    update
    enable
    disable
    doctor
    build
    validate
    init
    registry
    marketplace list|entries|refresh
  workboard
    list
    create
    show
    dispatch
  memory
    status
    index
    search
  transcripts
    list
    show
    path
  path
    resolve
    find
    set
    validate
    emit
  wiki
    status
    doctor
    init
    compile
    lint
    ingest
    okf import
    search
    get
    apply synthesis|metadata
    bridge import
    unsafe-local import
    chatgpt import|rollback
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
  attach
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
  audit
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
    stability
    diagnostics export
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
    auth list|add|login|setup-token|paste-token|paste-api-key|login-github-copilot
    auth order get|set|clear
  promos
    list
    claim <slug>
  infer (alias: capability)
    list
    inspect
    model run|list|inspect|providers|auth login|logout|status
    image generate|edit|describe|describe-many|providers
    audio transcribe|providers
    tts convert|voices|personas|providers|status|enable|disable|set-provider|set-persona
    video generate|describe|providers
    web search|fetch|providers
    embedding create|providers
  sandbox
    list
    recreate
    explain
  cron
    status
    list
    get
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
    canvas present|hide|navigate
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
  worker
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
  resume
  tui
  chat (alias: tui --local)
  terminal (alias: tui --local)
```

Plugins can add additional top-level commands, such as
[`openclaw workboard`](/en/cli/workboard) or `openclaw voicecall`.

</Accordion>

## Chat slash commands

Chat messages support `/...` commands. See [slash commands](/en/tools/slash-commands).

Highlights:

- `/status` - quick diagnostics.
- `/trace` - session-scoped plugin trace/debug lines.
- `/config` - persisted config changes.
- `/debug` - runtime-only config overrides (memory, not disk; requires `commands.debug: true`).

## Usage tracking

`openclaw status --usage` and the Control UI surface provider usage/quota when
OAuth/API credentials are available. Data comes directly from provider usage
endpoints and is normalized to `X% left`. Providers with current usage
windows: Anthropic, Gemini CLI, GitHub Copilot, MiniMax, OpenAI Codex,
Xiaomi, and z.ai.

See [Usage tracking](/en/concepts/usage-tracking) for details.

## Related

- [Slash commands](/en/tools/slash-commands)
- [Configuration](/en/gateway/configuration)
- [Environment](/en/help/environment)
