---
summary: "`openclaw dns` 命令、子命令和选项的 OpenClaw CLI 参考"
read_when:
  - "Adding or modifying CLI commands or options"
  - "Documenting new command surfaces"
title: "CLI 参考"
---

# CLI reference

此页面描述当前的 CLI 行为。如果命令发生更改，请更新此文档。

## 命令页面

- [`setup`](/zh/cli/setup)
- [`onboard`](/zh/cli/onboard)
- [`configure`](/zh/cli/configure)
- [`config`](/zh/cli/config)
- [`doctor`](/zh/cli/doctor)
- [`dashboard`](/zh/cli/dashboard)
- [`reset`](/zh/cli/reset)
- [`uninstall`](/zh/cli/uninstall)
- [`update`](/zh/cli/update)
- [`message`](/zh/cli/message)
- [`agent`](/zh/cli/agent)
- [`agents`](/zh/cli/agents)
- [`acp`](/zh/cli/acp)
- [`status`](/zh/cli/status)
- [`health`](/zh/cli/health)
- [`sessions`](/zh/cli/sessions)
- [`gateway`](/zh/cli/gateway)
- [`logs`](/zh/cli/logs)
- [`system`](/zh/cli/system)
- [`models`](/zh/cli/models)
- [`memory`](/zh/cli/memory)
- [`nodes`](/zh/cli/nodes)
- [`devices`](/zh/cli/devices)
- [`node`](/zh/cli/node)
- [`approvals`](/zh/cli/approvals)
- [`sandbox`](/zh/cli/sandbox)
- [`tui`](/zh/cli/tui)
- [`browser`](/zh/cli/browser)
- [`cron`](/zh/cli/cron)
- [`dns`](/zh/cli/dns)
- [`docs`](/zh/cli/docs)
- [`hooks`](/zh/cli/hooks)
- [`webhooks`](/zh/cli/webhooks)
- [`pairing`](/zh/cli/pairing)
- [(/en/gateway/discovery)](/zh/gateway/configuration) (plugin commands)
- [`channels`](/zh/cli/channels)
- [`security`](/zh/cli/security)
- [`skills`](/zh/cli/skills)
- [%%P4%%]%%P5%% (plugin; if installed)

## Global flags

- %%P6%%: isolate state under %%P7%% and shift default ports.
- %%P8%%: isolate state under %%P9%%.
- %%P10%%: disable ANSI colors.
- %%P11%%: shorthand for %%P12%% (source installs only).
- %%P13%%, %%P14%%, %%P15%%: print version and exit.

## Output styling

- ANSI colors and progress indicators only render in TTY sessions.
- OSC-8 hyperlinks render as clickable links in supported terminals; otherwise we fall back to plain URLs.
- %%P16%% (and %%P17%% where supported) disables styling for clean output.
- %%P18%% disables ANSI styling; %%P19%% is also respected.
- Long-running commands show a progress indicator (OSC 9;4 when supported).

## Color palette

OpenClaw uses a lobster palette for CLI output.

- %%P20%% (#FF5A2D): headings, labels, primary highlights.
- %%P21%% (#FF7A3D): command names, emphasis.
- %%P22%% (#D14A22): secondary highlight text.
- %%P23%% (#FF8A5B): informational values.
- %%P24%% (#2FBF71): success states.
- %%P25%% (#FFB020): warnings, fallbacks, attention.
- %%P26%% (#E23D2D): errors, failures.
- %%P27%% (#8B7F77): de-emphasis, metadata.

Palette 真实来源：%%P28%%（又称 “lobster seam”）。

## 命令树

```
openclaw [--dev] [--profile <name>] <command>
  setup
  onboard
  configure
  config
    get
    set
    unset
  doctor
  security
    audit
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
  skills
    list
    info
    check
  plugins
    list
    info
    install
    enable
    disable
    doctor
  memory
    status
    index
    search
  message
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
  docs
  dns
    setup
  tui
```
注意：插件可以添加额外的顶级命令（例如 %%P29%%）。

## 安全性

- %%P30%% — 审计配置 + 本地状态中的常见安全隐患。
- %%P31%% — 尽力而为的实时 Gateway 探测。
- %%P32%% — 加强安全默认值并 chmod 状态/配置。

## 插件

管理扩展及其配置：

- %%P33%% — 发现插件（使用 %%P34%% 获取机器输出）。
- %%P35%% — 显示插件详细信息。
- %%P36%% — 安装插件（或向 %%P37%% 添加插件路径）。
- %%P38%% / %%P39%% — 切换 %%P40%%。
- %%P41%% — 报告插件加载错误。

Most plugin changes require a gateway restart. See [/plugin]%%P42%%.

## Memory

Vector search over %%P43%% + %%P44%%:

- %%P45%% — show index stats.
- %%P46%% — reindex memory files.
- %%P47%% — semantic search over memory.

## Chat slash commands

Chat messages support %%P48%% commands (text and native). See [/tools/slash-commands]%%P49%%.

Highlights:

- %%P50%% for quick diagnostics.
- %%P51%% for persisted config changes.
- %%P52%% for runtime-only config overrides (memory, not disk; requires %%P53%%).

## Setup + onboarding

### `setup`

Initialize config + workspace.

Options:

- %%P54%%: agent workspace path (default %%P55%%).
- %%P56%%: run the onboarding wizard.
- %%P57%%: run wizard without prompts.
- %%P58%%: wizard mode.
- %%P59%%: remote Gateway URL.
- %%P60%%: remote Gateway token.

Wizard auto-runs when any wizard flags are present (%%P61%%, %%P62%%, %%P63%%, %%P64%%).

### `onboard`

Interactive wizard to set up gateway, workspace, and skills.

选项：

- `--workspace <dir>`
- %%P65%%（在向导之前重置配置 + 凭证 + 会话 + 工作区）
- `--non-interactive`
- `--mode <local|remote>`
- %%P66%%（manual 是 advanced 的别名）
- `--auth-choice <setup-token|token|chutes|openai-codex|openai-api-key|openrouter-api-key|ai-gateway-api-key|moonshot-api-key|moonshot-api-key-cn|kimi-code-api-key|synthetic-api-key|venice-api-key|gemini-api-key|zai-api-key|apiKey|minimax-api|minimax-api-lightning|opencode-zen|skip>`
- %%P67%%（非交互式；与 %%P68%% 一起使用）
- %%P69%%（非交互式；与 %%P70%% 一起使用）
- %%P71%%（非交互式；默认：%%P72%%）
- %%P73%%（非交互式；例如 %%P74%%、%%P75%%）
- `--anthropic-api-key <key>`
- `--openai-api-key <key>`
- `--openrouter-api-key <key>`
- `--ai-gateway-api-key <key>`
- `--moonshot-api-key <key>`
- `--kimi-code-api-key <key>`
- `--gemini-api-key <key>`
- `--zai-api-key <key>`
- `--minimax-api-key <key>`
- `--opencode-zen-api-key <key>`
- `--gateway-port <port>`
- `--gateway-bind <loopback|lan|tailnet|auto|custom>`
- `--gateway-auth <token|password>`
- `--gateway-token <token>`
- `--gateway-password <password>`
- `--remote-url <url>`
- `--remote-token <token>`
- `--tailscale <off|serve|funnel>`
- `--tailscale-reset-on-exit`
- `--install-daemon`
- %%P76%%（别名：%%P77%%）
- `--daemon-runtime <node|bun>`
- `--skip-channels`
- `--skip-skills`
- `--skip-health`
- `--skip-ui`
- %%P78%% (pnpm recommended; bun not recommended for Gateway runtime)
- `--json`

### `configure`

Interactive configuration wizard (models, channels, skills, gateway).

### `config`

Non-interactive config helpers (get/set/unset). Running %%P79%% with no
subcommand launches the wizard.

Subcommands:

- %%P80%%: print a config value (dot/bracket path).
- %%P81%%: set a value (JSON5 or raw string).
- %%P82%%: remove a value.

### `doctor`

Health checks + quick fixes (config + gateway + legacy services).

Options:

- %%P83%%: disable workspace memory hints.
- %%P84%%: accept defaults without prompting (headless).
- %%P85%%: skip prompts; apply safe migrations only.
- %%P86%%: scan system services for extra gateway installs.

## Channel helpers

### `channels`

管理聊天频道帐户（WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost（插件）/Signal/iMessage/MS Teams）。

子命令：

- %%P87%%：显示已配置的频道和身份验证配置文件。
- %%P88%%：检查 Gateway 可达性和频道健康状况（%%P89%% 运行额外检查；使用 %%P90%% 或 %%P91%% 进行 Gateway 健康探测）。
- 提示：%%P92%% 在检测到常见错误配置时会打印带有建议修复的警告（然后指向 %%P93%%）。
- %%P94%%：从 Gateway 日志文件显示最近的频道日志。
- %%P95%%：不传递标志时使用向导式设置；标志切换到非交互模式。
- %%P96%%：默认禁用；传递 %%P97%% 以无提示删除配置条目。
- %%P98%%：交互式频道登录（仅 WhatsApp Web）。
- %%P99%%：登出频道会话（如果支持）。

常用选项：

- %%P100%%：%%P101%%
- %%P102%%：频道帐户 ID（默认 %%P103%%）
- %%P104%%：帐户的显示名称

%%P105%% options:

- %%P106%% (default %%P107%%; supports %%P108%%/%%P109%%)
- `--account <id>`
- `--verbose`

%%P110%% options:

- %%P111%% (default %%P112%%)
- `--account <id>`

%%P113%% options:

- %%P114%%: skip model provider usage/quota snapshots (OAuth/API-backed only).
- %%P115%%: output JSON (includes usage unless %%P116%% is set).

%%P117%% options:

- %%P118%% (default %%P119%%)
- %%P120%% (default %%P121%%)
- `--json`

More detail: [/concepts/oauth]%%P122%%

Examples:

```bash
openclaw channels add --channel telegram --account alerts --name "Alerts Bot" --token $TELEGRAM_BOT_TOKEN
openclaw channels add --channel discord --account work --name "Work Bot" --token $DISCORD_BOT_TOKEN
openclaw channels remove --channel discord --account work --delete
openclaw channels status --probe
openclaw status --deep
```
### `skills`

List and inspect available skills plus readiness info.

Subcommands:

- %%P123%%: list skills (default when no subcommand).
- %%P124%%: show details for one skill.
- %%P125%%: summary of ready vs missing requirements.

Options:

- %%P126%%: show only ready skills.
- %%P127%%: output JSON (no styling).
- %%P128%%, %%P129%%: include missing requirements detail.

提示：使用 %%P130%% 搜索、安装和同步技能。

### `pairing`

批准跨频道的私信配对请求。

Subcommands:

- `pairing list <channel> [--json]`
- `pairing approve <channel> <code> [--notify]`

### `webhooks gmail`

Gmail Pub/Sub hook 设置 + 运行器。参阅 [/automation/gmail-pubsub]%%P131%%。

Subcommands:

- %%P132%%（需要 %%P133%%；支持 %%P134%%、%%P135%%、%%P136%%、%%P137%%、%%P138%%、%%P139%%、%%P140%%、%%P141%%、%%P142%%、%%P143%%、%%P144%%、%%P145%%、%%P146%%、%%P147%%、%%P148%%、%%P149%%、%%P150%%、%%P151%%）
- %%P152%%（相同标志的运行时覆盖）

### `dns setup`

广域发现 DNS 助手（CoreDNS + Tailscale）。参阅 [/gateway/discovery]%%P153%%。

选项：

- %%P154%%：安装/更新 CoreDNS 配置（需要 sudo；仅 macOS）。

## 消息 + 代理

### `message`

Unified outbound messaging + channel actions.

See: [/cli/message]%%P155%%

Subcommands:

- `message send|poll|react|reactions|read|edit|delete|pin|unpin|pins|permissions|search|timeout|kick|ban`
- `message thread <create|list|reply>`
- `message emoji <list|upload>`
- `message sticker <send|upload>`
- `message role <info|add|remove>`
- `message channel <info|list>`
- `message member info`
- `message voice status`
- `message event <list|create>`

Examples:

- `openclaw message send --target +15555550123 --message "Hi"`
- `openclaw message poll --channel discord --target channel:123 --poll-question "Snack?" --poll-option Pizza --poll-option Sushi`

### `agent`

Run one agent turn via the Gateway (or %%P156%% embedded).

Required:

- `--message <text>`

Options:

- %%P157%% (for session key and optional delivery)
- `--session-id <id>`
- %%P158%% (GPT-5.2 + Codex models only)
- `--verbose <on|full|off>`
- `--channel <whatsapp|telegram|discord|slack|mattermost|signal|imessage|msteams>`
- `--local`
- `--deliver`
- `--json`
- `--timeout <seconds>`

### `agents`

Manage isolated agents (workspaces + auth + routing).

#### `agents list`

List configured agents.

Options:

- `--json`
- `--bindings`

#### `agents add [name]`

Add a new isolated agent. Runs the guided wizard unless flags (or %%P159%%) are passed; %%P160%% is required in non-interactive mode.

选项：

- `--workspace <dir>`
- `--model <id>`
- `--agent-dir <dir>`
- %%P161%%（可重复）
- `--non-interactive`
- `--json`

绑定规范使用 %%P162%%。当 WhatsApp 省略 %%P163%% 时，使用默认帐户 ID。

#### `agents delete <id>`

删除代理并清理其工作区 + 状态。

选项：

- `--force`
- `--json`

### `acp`

运行将 IDE 连接到 Gateway 的 ACP 网桥。

完整选项和示例请参阅 [%%P164%%]%%P165%%。

### `status`

显示链接的会话健康状况和最近的接收者。

选项：

- `--json`
- %%P166%% (full diagnosis; read-only, pasteable)
- %%P167%% (probe channels)
- %%P168%% (show model provider usage/quota)
- `--timeout <ms>`
- `--verbose`
- %%P169%% (alias for %%P170%%)

Notes:

- Overview includes Gateway + node host service status when available.

### Usage tracking

OpenClaw can surface provider usage/quota when OAuth/API creds are available.

Surfaces:

- %%P171%% (adds a short provider usage line when available)
- %%P172%% (prints full provider breakdown)
- macOS menu bar (Usage section under Context)

Notes:

- Data comes directly from provider usage endpoints (no estimates).
- Providers: Anthropic, GitHub Copilot, OpenAI Codex OAuth, plus Gemini CLI/Antigravity when those provider plugins are enabled.
- If no matching credentials exist, usage is hidden.
- Details: see [Usage tracking]%%P173%%.

### `health`

Fetch health from the running Gateway.

Options:

- `--json`
- `--timeout <ms>`
- `--verbose`

### `sessions`

List stored conversation sessions.

Options:

- `--json`
- `--verbose`
- `--store <path>`
- `--active <minutes>`

## Reset / Uninstall

### `reset`

Reset local config/state (keeps the CLI installed).

Options:

- `--scope <config|config+creds+sessions|full>`
- `--yes`
- `--non-interactive`
- `--dry-run`

注意：

- %%P174%% 需要 %%P175%% 和 %%P176%%。

### `uninstall`

卸载 Gateway 服务 + 本地数据（CLI 保留）。

选项：

- `--service`
- `--state`
- `--workspace`
- `--app`
- `--all`
- `--yes`
- `--non-interactive`
- `--dry-run`

注意：

- %%P177%% 需要 %%P178%% 和显式作用域（或 %%P179%%）。

## Gateway

### `gateway`

运行 WebSocket Gateway。

选项：

- `--port <port>`
- `--bind <loopback|tailnet|lan|auto|custom>`
- `--token <token>`
- `--auth <token|password>`
- `--password <password>`
- `--tailscale <off|serve|funnel>`
- `--tailscale-reset-on-exit`
- `--allow-unconfigured`
- `--dev`
- %%P180%% (reset dev config + credentials + sessions + workspace)
- %%P181%% (kill existing listener on port)
- `--verbose`
- `--claude-cli-logs`
- `--ws-log <auto|full|compact>`
- %%P182%% (alias for %%P183%%)
- `--raw-stream`
- `--raw-stream-path <path>`

### `gateway service`

Manage the Gateway service (launchd/systemd/schtasks).

Subcommands:

- %%P184%% (probes the Gateway RPC by default)
- %%P185%% (service install)
- `gateway uninstall`
- `gateway start`
- `gateway stop`
- `gateway restart`

Notes:

- %%P186%% probes the Gateway RPC by default using the service’s resolved port/config (override with %%P187%%).
- %%P188%% supports %%P189%%, %%P190%%, and %%P191%% for scripting.
- %%P192%% also surfaces legacy or extra gateway services when it can detect them (%%P193%% adds system-level scans). Profile-named OpenClaw services are treated as first-class and aren't flagged as "extra".
- %%P194%% prints which config path the CLI uses vs which config the service likely uses (service env), plus the resolved probe target URL.
- %%P195%% support %%P196%% for scripting (default output stays human-friendly).
- %%P197%% defaults to Node runtime; bun is **not recommended** (WhatsApp/Telegram bugs).
- %%P198%% options: %%P199%%, %%P200%%, %%P201%%, %%P202%%, %%P203%%.

### `logs`

Tail Gateway file logs via RPC.

Notes:

- TTY 会话呈现彩色、结构化视图；非 TTY 回退到纯文本。
- %%P204%% 发出行分隔的 JSON（每行一个日志事件）。

示例：

```bash
openclaw logs --follow
openclaw logs --limit 200
openclaw logs --plain
openclaw logs --json
openclaw logs --no-color
```
### `gateway <subcommand>`

Gateway CLI 助手（使用 %%P205%%、%%P206%%、%%P207%%、%%P208%%、%%P209%% 进行 RPC 子命令）。
当您传递 %%P210%% 时，CLI 不会自动应用配置或环境凭证。
显式包含 %%P211%% 或 %%P212%%。缺少显式凭证是一个错误。

子命令：

- `gateway call <method> [--params <json>]`
- `gateway health`
- `gateway status`
- `gateway probe`
- `gateway discover`
- `gateway install|uninstall|start|stop|restart`
- `gateway run`

常用 RPC：

- %%P213%%（验证 + 写入配置 + 重启 + 唤醒）
- %%P214%%（合并部分更新 + 重启 + 唤醒）
- %%P215%%（运行更新 + 重启 + 唤醒）

提示：直接调用 %%P216%%/%%P217%%/%%P218%% 时，如果配置已存在，请从 %%P220%% 传递 %%P219%%。

## Models

See [/concepts/models]%%P221%% for fallback behavior and scanning strategy.

Preferred Anthropic auth (setup-token):

```bash
claude setup-token
openclaw models auth setup-token --provider anthropic
openclaw models status
```
### %%P222%% (root)

%%P223%% is an alias for %%P224%%.

Root options:

- %%P225%% (alias for %%P226%%)
- %%P227%% (alias for %%P228%%)

### `models list`

Options:

- `--all`
- `--local`
- `--provider <name>`
- `--json`
- `--plain`

### `models status`

Options:

- `--json`
- `--plain`
- %%P229%% (exit 1=expired/missing, 2=expiring)
- %%P230%% (live probe of configured auth profiles)
- `--probe-provider <name>`
- %%P231%% (repeat or comma-separated)
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`

Always includes the auth overview and OAuth expiry status for profiles in the auth store.
%%P232%% runs live requests (may consume tokens and trigger rate limits).

### `models set <model>`

Set %%P233%%.

### `models set-image <model>`

Set %%P234%%.

### `models aliases list|add|remove`

Options:

- %%P241%%: %%P242%%, %%P243%%
- `add <alias> <model>`
- `remove <alias>`

### `models fallbacks list|add|remove|clear`

选项：

- %%P241%%：%%P242%%、%%P243%%
- `add <model>`
- `remove <model>`
- `clear`

### `models image-fallbacks list|add|remove|clear`

选项：

- %%P241%%：%%P242%%、%%P243%%
- `add <model>`
- `remove <model>`
- `clear`

### `models scan`

选项：

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

选项：

- %%P244%%: interactive auth helper
- %%P245%%: %%P246%% (default %%P247%%), %%P248%%
- %%P249%%: %%P250%%, %%P251%%, %%P252%%

### `models auth order get|set|clear`

Options:

- %%P253%%: %%P254%%, %%P255%%, %%P256%%
- %%P257%%: %%P258%%, %%P259%%, %%P260%%
- %%P261%%: %%P262%%, %%P263%%

## System

### `system event`

Enqueue a system event and optionally trigger a heartbeat (Gateway RPC).

Required:

- `--text <text>`

Options:

- `--mode <now|next-heartbeat>`
- `--json`
- %%P272%%, %%P273%%, %%P274%%, %%P275%%

### `system heartbeat last|enable|disable`

Heartbeat controls (Gateway RPC).

Options:

- `--json`
- %%P272%%, %%P273%%, %%P274%%, %%P275%%

### `system presence`

List system presence entries (Gateway RPC).

Options:

- `--json`
- %%P272%%, %%P273%%, %%P274%%, %%P275%%

## Cron

Manage scheduled jobs (Gateway RPC). See [/automation/cron-jobs]%%P276%%.

Subcommands:

- `cron status [--json]`
- %%P277%% (table output by default; use %%P278%% for raw)
- %%P279%% (alias: %%P280%%; requires %%P281%% and exactly one of %%P282%% | %%P283%% | %%P284%%, and exactly one payload of %%P285%% | %%P286%%)
- %%P287%% (patch fields)
- %%P288%% (aliases: %%P289%%, %%P290%%)
- `cron enable <id>`
- `cron disable <id>`
- `cron runs --id <id> [--limit <n>]`
- `cron run <id> [--force]`

所有 %%P291%% 命令都接受 %%P292%%、%%P293%%、%%P294%%、%%P295%%。

## 节点主机

%%P296%% 运行**无头节点主机**或将其作为后台服务管理。参阅
[%%P297%%]%%P298%%。

子命令：

- `node run --host <gateway-host> --port 18789`
- `node status`
- `node install [--host <gateway-host>] [--port <port>] [--tls] [--tls-fingerprint <sha256>] [--node-id <id>] [--display-name <name>] [--runtime <node|bun>] [--force]`
- `node uninstall`
- `node stop`
- `node restart`

## 节点

%%P299%% 与 Gateway 通信并定位配对的节点。参阅 [/nodes]%%P300%%。

常用选项：

- %%P310%%、%%P311%%、%%P312%%、%%P313%%

子命令：

- `nodes status [--connected] [--last-connected <duration>]`
- `nodes describe --node <id|name|ip>`
- `nodes list [--connected] [--last-connected <duration>]`
- `nodes pending`
- `nodes approve <requestId>`
- `nodes reject <requestId>`
- `nodes rename --node <id|name|ip> --name <displayName>`
- `nodes invoke --node <id|name|ip> --command <command> [--params <json>] [--invoke-timeout <ms>] [--idempotency-key <key>]`
- %%P305%% (mac node or headless node host)
- %%P306%% (mac only)

Camera:

- `nodes camera list --node <id|name|ip>`
- `nodes camera snap --node <id|name|ip> [--facing front|back|both] [--device-id <id>] [--max-width <px>] [--quality <0-1>] [--delay-ms <ms>] [--invoke-timeout <ms>]`
- `nodes camera clip --node <id|name|ip> [--facing front|back] [--device-id <id>] [--duration <ms|10s|1m>] [--no-audio] [--invoke-timeout <ms>]`

Canvas + screen:

- `nodes canvas snapshot --node <id|name|ip> [--format png|jpg|jpeg] [--max-width <px>] [--quality <0-1>] [--invoke-timeout <ms>]`
- `nodes canvas present --node <id|name|ip> [--target <urlOrPath>] [--x <px>] [--y <px>] [--width <px>] [--height <px>] [--invoke-timeout <ms>]`
- `nodes canvas hide --node <id|name|ip> [--invoke-timeout <ms>]`
- `nodes canvas navigate <url> --node <id|name|ip> [--invoke-timeout <ms>]`
- `nodes canvas eval [<js>] --node <id|name|ip> [--js <code>] [--invoke-timeout <ms>]`
- `nodes canvas a2ui push --node <id|name|ip> (--jsonl <path> | --text <text>) [--invoke-timeout <ms>]`
- `nodes canvas a2ui reset --node <id|name|ip> [--invoke-timeout <ms>]`
- `nodes screen record --node <id|name|ip> [--screen <index>] [--duration <ms|10s>] [--fps <n>] [--no-audio] [--out <path>] [--invoke-timeout <ms>]`

Location:

- `nodes location get --node <id|name|ip> [--max-age <ms>] [--accuracy <coarse|balanced|precise>] [--location-timeout <ms>] [--invoke-timeout <ms>]`

## 浏览器

浏览器控制 CLI（专用 Chrome/Brave/Edge/Chromium）。参阅 [%%P307%%]%%P308%% 和 [浏览器工具]%%P309%%。

常用选项：

- %%P310%%、%%P311%%、%%P312%%、%%P313%%
- `--browser-profile <name>`

管理：

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

检查：

- `browser screenshot [targetId] [--full-page] [--ref <ref>] [--element <selector>] [--type png|jpeg]`
- `browser snapshot [--format aria|ai] [--target-id <id>] [--limit <n>] [--interactive] [--compact] [--depth <n>] [--selector <sel>] [--out <path>]`

操作：

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

## 文档搜索

### `docs [query...]`

搜索实时文档索引。

## TUI

### `tui`

打开连接到 Gateway 的终端 UI。

选项：

- `--url <url>`
- `--token <token>`
- `--password <password>`
- `--session <key>`
- `--deliver`
- `--thinking <level>`
- `--message <text>`
- %%P314%%（默认为 %%P315%%）
- `--history-limit <n>`
