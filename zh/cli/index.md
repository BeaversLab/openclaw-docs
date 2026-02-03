---
summary: "OpenClaw CLI `openclaw` 命令、子命令与选项参考"
read_when:
  - 添加或修改 CLI 命令或选项时
  - 记录新的命令入口时
title: "CLI 参考"
---

# CLI 参考

本页描述当前 CLI 行为。若命令变更，请同步更新本文。

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
- [`plugins`](/zh/cli/plugins)（插件命令）
- [`channels`](/zh/cli/channels)
- [`security`](/zh/cli/security)
- [`skills`](/zh/cli/skills)
- [`voicecall`](/zh/cli/voicecall)（插件；已安装时可用）

## 全局标志

- `--dev`：将状态隔离到 `~/.openclaw-dev`，并调整默认端口。
- `--profile <name>`：将状态隔离到 `~/.openclaw-<name>`。
- `--no-color`：禁用 ANSI 颜色。
- `--update`：`openclaw update` 的简写（仅源码安装）。
- `-V`、`--version`、`-v`：打印版本并退出。

## 输出样式

- ANSI 颜色与进度指示仅在 TTY 会话中渲染。
- OSC-8 超链接在支持的终端中可点击；否则回退为纯 URL。
- `--json`（以及支持时的 `--plain`）禁用样式以获得干净输出。
- `--no-color` 禁用 ANSI 样式；也遵守 `NO_COLOR=1`。
- 长时间运行的命令会显示进度指示器（支持时为 OSC 9;4）。

## 颜色调色板

OpenClaw 在 CLI 输出中使用 lobster 调色板。

- `accent` (#FF5A2D)：标题、标签、主高亮。
- `accentBright` (#FF7A3D)：命令名、强调。
- `accentDim` (#D14A22)：次级高亮文本。
- `info` (#FF8A5B)：信息值。
- `success` (#2FBF71)：成功状态。
- `warn` (#FFB020)：警告、回退、提醒。
- `error` (#E23D2D)：错误、失败。
- `muted` (#8B7F77)：弱化、元数据。

调色板权威来源：`src/terminal/palette.ts`（又名“lobster seam”）。

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

注意：插件可以新增额外的顶层命令（例如 `openclaw voicecall`）。

## 安全

- `openclaw security audit` — 审计配置 + 本地状态中的常见安全隐患。
- `openclaw security audit --deep` — 尽力进行实时 Gateway 探测。
- `openclaw security audit --fix` — 收紧安全默认值并 chmod 状态/配置。

## 插件

管理扩展及其配置：

- `openclaw plugins list` — 发现插件（机器输出用 `--json`）。
- `openclaw plugins info <id>` — 显示插件详情。
- `openclaw plugins install <path|.tgz|npm-spec>` — 安装插件（或将插件路径加入 `plugins.load.paths`）。
- `openclaw plugins enable <id>` / `disable <id>` — 切换 `plugins.entries.<id>.enabled`。
- `openclaw plugins doctor` — 报告插件加载错误。

多数插件更改需要重启 gateway。见 [/plugin](/zh/plugin)。

## Memory

对 `MEMORY.md` + `memory/*.md` 进行向量检索：

- `openclaw memory status` — 显示索引统计。
- `openclaw memory index` — 重新索引 memory 文件。
- `openclaw memory search "<query>"` — 语义检索 memory。

## Chat 斜杠命令

聊天消息支持 `/...` 命令（文本与原生）。见 [/tools/slash-commands](/zh/tools/slash-commands)。

要点：

- `/status` 用于快速诊断。
- `/config` 用于持久化配置变更。
- `/debug` 用于仅运行时配置覆盖（内存，不写磁盘；需要 `commands.debug: true`）。

## Setup + onboarding

### `setup`

初始化配置 + 工作区。

选项：

- `--workspace <dir>`：agent 工作区路径（默认 `~/.openclaw/workspace`）。
- `--wizard`：运行 onboarding 向导。
- `--non-interactive`：无提示运行向导。
- `--mode <local|remote>`：向导模式。
- `--remote-url <url>`：远程 Gateway URL。
- `--remote-token <token>`：远程 Gateway token。

当存在任意向导标志（`--non-interactive`、`--mode`、`--remote-url`、`--remote-token`）时会自动运行向导。

### `onboard`

交互式向导，用于设置 gateway、工作区与技能。

选项：

- `--workspace <dir>`
- `--reset`（在向导前重置配置 + 凭据 + 会话 + 工作区）
- `--non-interactive`
- `--mode <local|remote>`
- `--flow <quickstart|advanced|manual>`（manual 是 advanced 的别名）
- `--auth-choice <setup-token|token|chutes|openai-codex|openai-api-key|openrouter-api-key|ai-gateway-api-key|moonshot-api-key|kimi-code-api-key|synthetic-api-key|venice-api-key|gemini-api-key|zai-api-key|apiKey|minimax-api|minimax-api-lightning|opencode-zen|skip>`
- `--token-provider <id>`（非交互；配合 `--auth-choice token` 使用）
- `--token <token>`（非交互；配合 `--auth-choice token` 使用）
- `--token-profile-id <id>`（非交互；默认：`<provider>:manual`）
- `--token-expires-in <duration>`（非交互；例如 `365d`、`12h`）
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
- `--no-install-daemon`（别名：`--skip-daemon`）
- `--daemon-runtime <node|bun>`
- `--skip-channels`
- `--skip-skills`
- `--skip-health`
- `--skip-ui`
- `--node-manager <npm|pnpm|bun>`（推荐 pnpm；bun 不推荐用于 Gateway runtime）
- `--json`

### `configure`

交互式配置向导（models、channels、skills、gateway）。

### `config`

非交互配置助手（get/set/unset）。无子命令时运行 `openclaw config` 会启动向导。

子命令：

- `config get <path>`：打印配置值（点/中括号路径）。
- `config set <path> <value>`：设置值（JSON5 或原始字符串）。
- `config unset <path>`：移除值。

### `doctor`

健康检查 + 快速修复（配置 + gateway + 旧服务）。

选项：

- `--no-workspace-suggestions`：禁用工作区 memory 提示。
- `--yes`：默认接受（无头运行）。
- `--non-interactive`：跳过提示；仅应用安全迁移。
- `--deep`：扫描系统服务，查找额外 gateway 安装。

## 频道助手

### `channels`

管理聊天频道账号（WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost（插件）/Signal/iMessage/MS Teams）。

子命令：

- `channels list`：显示已配置频道与认证配置文件。
- `channels status`：检查 gateway 连通性与频道健康（`--probe` 会运行额外检查；使用 `openclaw health` 或 `openclaw status --deep` 进行 gateway 健康探测）。
- 小提示：`channels status` 在可检测常见配置错误时会输出警告与修复建议（然后引导到 `openclaw doctor`）。
- `channels logs`：从 gateway 日志文件显示近期频道日志。
- `channels add`：无标志时进入向导式设置；有标志则切换到非交互模式。
- `channels remove`：默认禁用；传 `--delete` 可在无提示时移除配置项。
- `channels login`：交互式频道登录（仅 WhatsApp Web）。
- `channels logout`：退出频道会话（若支持）。

通用选项：

- `--channel <name>`：`whatsapp|telegram|discord|googlechat|slack|mattermost|signal|imessage|msteams`
- `--account <id>`：频道账号 id（默认 `default`）
- `--name <label>`：账号显示名

`channels login` 选项：

- `--channel <channel>`（默认 `whatsapp`；支持 `whatsapp`/`web`）
- `--account <id>`
- `--verbose`

`channels logout` 选项：

- `--channel <channel>`（默认 `whatsapp`）
- `--account <id>`

`channels list` 选项：

- `--no-usage`：跳过模型提供商用量/配额快照（仅 OAuth/API 认证）。
- `--json`：输出 JSON（若未设 `--no-usage` 仍包含用量）。

`channels logs` 选项：

- `--channel <name|all>`（默认 `all`）
- `--lines <n>`（默认 `200`）
- `--json`

更多详情：[/concepts/oauth](/zh/concepts/oauth)

示例：

```bash
openclaw channels add --channel telegram --account alerts --name "Alerts Bot" --token $TELEGRAM_BOT_TOKEN
openclaw channels add --channel discord --account work --name "Work Bot" --token $DISCORD_BOT_TOKEN
openclaw channels remove --channel discord --account work --delete
openclaw channels status --probe
openclaw status --deep
```

### `skills`

列出并检查可用技能与就绪情况。

子命令：

- `skills list`：列出技能（无子命令时为默认）。
- `skills info <name>`：显示某个技能的详情。
- `skills check`：汇总已就绪 vs 缺失需求。

选项：

- `--eligible`：仅显示已就绪的技能。
- `--json`：输出 JSON（不带样式）。
- `-v`、`--verbose`：包含缺失需求详情。

提示：使用 `npx clawdhub` 搜索、安装与同步技能。

### `pairing`

跨频道批准 DM 配对请求。

子命令：

- `pairing list <channel> [--json]`
- `pairing approve <channel> <code> [--notify]`

### `webhooks gmail`

Gmail Pub/Sub hook 设置与运行器。见 [/automation/gmail-pubsub](/zh/automation/gmail-pubsub)。

子命令：

- `webhooks gmail setup`（需要 `--account <email>`；支持 `--project`、`--topic`、`--subscription`、`--label`、`--hook-url`、`--hook-token`、`--push-token`、`--bind`、`--port`、`--path`、`--include-body`、`--max-bytes`、`--renew-minutes`、`--tailscale`、`--tailscale-path`、`--tailscale-target`、`--push-endpoint`、`--json`）
- `webhooks gmail run`（覆盖同名标志的运行时选项）

### `dns setup`

广域发现 DNS 助手（CoreDNS + Tailscale）。见 [/gateway/discovery](/zh/gateway/discovery)。

选项：

- `--apply`：安装/更新 CoreDNS 配置（需要 sudo；仅 macOS）。

## 消息 + agent

### `message`

统一的出站消息与频道操作。

见：[/cli/message](/zh/cli/message)

子命令：

- `message send|poll|react|reactions|read|edit|delete|pin|unpin|pins|permissions|search|timeout|kick|ban`
- `message thread <create|list|reply>`
- `message emoji <list|upload>`
- `message sticker <send|upload>`
- `message role <info|add|remove>`
- `message channel <info|list>`
- `message member info`
- `message voice status`
- `message event <list|create>`

示例：

- `openclaw message send --target +15555550123 --message "Hi"`
- `openclaw message poll --channel discord --target channel:123 --poll-question "Snack?" --poll-option Pizza --poll-option Sushi`

### `agent`

通过 Gateway（或 `--local` 内嵌）运行一次 agent turn。

必填：

- `--message <text>`

选项：

- `--to <dest>`（用于 session key 与可选投递）
- `--session-id <id>`
- `--thinking <off|minimal|low|medium|high|xhigh>`（仅 GPT-5.2 + Codex 模型）
- `--verbose <on|full|off>`
- `--channel <whatsapp|telegram|discord|slack|mattermost|signal|imessage|msteams>`
- `--local`
- `--deliver`
- `--json`
- `--timeout <seconds>`

### `agents`

管理隔离的 agents（工作区 + 认证 + 路由）。

#### `agents list`

列出已配置的 agents。

选项：

- `--json`
- `--bindings`

#### `agents add [name]`

新增一个隔离 agent。无标志（或 `--non-interactive`）时运行向导；非交互模式下要求 `--workspace`。

选项：

- `--workspace <dir>`
- `--model <id>`
- `--agent-dir <dir>`
- `--bind <channel[:accountId]>`（可重复）
- `--non-interactive`
- `--json`

绑定规格使用 `channel[:accountId]`。若 WhatsApp 未写 `accountId`，则使用默认账号 id。

#### `agents delete <id>`

删除 agent 并清理工作区 + 状态。

选项：

- `--force`
- `--json`

### `acp`

运行 ACP bridge，将 IDE 连接到 Gateway。

完整选项与示例见 [`acp`](/zh/cli/acp)。

### `status`

显示已链接会话健康状况与最近接收者。

选项：

- `--json`
- `--all`（完整诊断；只读、可粘贴）
- `--deep`（探测频道）
- `--usage`（显示模型提供商用量/配额）
- `--timeout <ms>`
- `--verbose`
- `--debug`（`--verbose` 的别名）

备注：

- 概览会在可用时包含 Gateway + 节点宿主服务状态。

### 用量跟踪

OpenClaw 在有 OAuth/API 凭据时可展示提供商用量/配额。

呈现方式：

- `/status`（可用时添加一条简短用量行）
- `openclaw status --usage`（打印完整提供商明细）
- macOS 菜单栏（Context 下的 Usage 区域）

备注：

- 数据直接来自提供商用量端点（无估算）。
- 提供商：Anthropic、GitHub Copilot、OpenAI Codex OAuth，以及启用提供商插件时的 Gemini CLI/Antigravity。
- 若无匹配凭据，用量会隐藏。
- 详情见：[Usage tracking](/zh/concepts/usage-tracking)。

### `health`

获取运行中 Gateway 的健康状态。

选项：

- `--json`
- `--timeout <ms>`
- `--verbose`

### `sessions`

列出存储的对话会话。

选项：

- `--json`
- `--verbose`
- `--store <path>`
- `--active <minutes>`

## Reset / Uninstall

### `reset`

重置本地配置/状态（CLI 仍保留）。

选项：

- `--scope <config|config+creds+sessions|full>`
- `--yes`
- `--non-interactive`
- `--dry-run`

备注：

- `--non-interactive` 需要 `--scope` 和 `--yes`。

### `uninstall`

卸载 gateway 服务 + 本地数据（CLI 保留）。

选项：

- `--service`
- `--state`
- `--workspace`
- `--app`
- `--all`
- `--yes`
- `--non-interactive`
- `--dry-run`

备注：

- `--non-interactive` 需要 `--yes` 且需要显式 scope（或 `--all`）。

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
- `--reset`（重置 dev 配置 + 凭据 + 会话 + 工作区）
- `--force`（杀掉已占用该端口的监听器）
- `--verbose`
- `--claude-cli-logs`
- `--ws-log <auto|full|compact>`
- `--compact`（`--ws-log compact` 的别名）
- `--raw-stream`
- `--raw-stream-path <path>`

### `gateway service`

管理 Gateway 服务（launchd/systemd/schtasks）。

子命令：

- `gateway status`（默认探测 Gateway RPC）
- `gateway install`（安装服务）
- `gateway uninstall`
- `gateway start`
- `gateway stop`
- `gateway restart`

备注：

- `gateway status` 默认使用服务解析到的端口/配置探测 Gateway RPC（用 `--url/--token/--password` 覆盖）。
- `gateway status` 支持 `--no-probe`、`--deep`、`--json` 以便脚本化。
- `gateway status` 还能在可检测时展示旧服务或额外 gateway 服务（`--deep` 添加系统级扫描）。命名为 profile 的 OpenClaw 服务会被视为一等公民，不会被标为“额外”。
- `gateway status` 会打印 CLI 使用的配置路径 vs 服务可能使用的配置路径（服务环境），以及解析后的探测目标 URL。
- `gateway install|uninstall|start|stop|restart` 支持 `--json`（默认输出仍为人类友好）。
- `gateway install` 默认 Node runtime；bun **不推荐**（WhatsApp/Telegram bug）。
- `gateway install` 选项：`--port`、`--runtime`、`--token`、`--force`、`--json`。

### `logs`

通过 RPC 追踪 Gateway 文件日志。

备注：

- TTY 会话渲染彩色结构化视图；非 TTY 回退为纯文本。
- `--json` 输出行分隔 JSON（每行一个日志事件）。

示例：

```bash
openclaw logs --follow
openclaw logs --limit 200
openclaw logs --plain
openclaw logs --json
openclaw logs --no-color
```

### `gateway <subcommand>`

Gateway CLI 助手（RPC 子命令使用 `--url`、`--token`、`--password`、`--timeout`、`--expect-final`）。

子命令：

- `gateway call <method> [--params <json>]`
- `gateway health`
- `gateway status`
- `gateway probe`
- `gateway discover`
- `gateway install|uninstall|start|stop|restart`
- `gateway run`

常用 RPC：

- `config.apply`（验证 + 写入配置 + 重启 + 唤醒）
- `config.patch`（合并部分更新 + 重启 + 唤醒）
- `update.run`（运行更新 + 重启 + 唤醒）

提示：直接调用 `config.set`/`config.apply`/`config.patch` 时，若已存在配置，请从 `config.get` 传 `baseHash`。

## Models

回退行为与扫描策略见 [/concepts/models](/zh/concepts/models)。

首选 Anthropic 认证（setup-token）：

```bash
claude setup-token
openclaw models auth setup-token --provider anthropic
openclaw models status
```

### `models`（根）

`openclaw models` 是 `models status` 的别名。

根选项：

- `--status-json`（`models status --json` 的别名）
- `--status-plain`（`models status --plain` 的别名）

### `models list`

选项：

- `--all`
- `--local`
- `--provider <name>`
- `--json`
- `--plain`

### `models status`

选项：

- `--json`
- `--plain`
- `--check`（exit 1=过期/缺失，2=即将过期）
- `--probe`（对已配置的认证 profile 进行实时探测）
- `--probe-provider <name>`
- `--probe-profile <id>`（可重复或逗号分隔）
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`

始终包含 auth 概览与 auth store 中 profile 的 OAuth 过期状态。
`--probe` 会执行实时请求（可能消耗 token 并触发限速）。

### `models set <model>`

设置 `agents.defaults.model.primary`。

### `models set-image <model>`

设置 `agents.defaults.imageModel.primary`。

### `models aliases list|add|remove`

选项：

- `list`：`--json`、`--plain`
- `add <alias> <model>`
- `remove <model>`

### `models fallbacks list|add|remove|clear`

选项：

- `list`：`--json`、`--plain`
- `add <model>`
- `remove <model>`
- `clear`

### `models image-fallbacks list|add|remove|clear`

选项：

- `list`：`--json`、`--plain`
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

- `add`：交互式认证助手
- `setup-token`：`--provider <name>`（默认 `anthropic`）、`--yes`
- `paste-token`：`--provider <name>`、`--profile-id <id>`、`--expires-in <duration>`

### `models auth order get|set|clear`

选项：

- `get`：`--provider <name>`、`--agent <id>`、`--json`
- `set`：`--provider <name>`、`--agent <id>`、`<profileIds...>`
- `clear`：`--provider <name>`、`--agent <id>`

## System

### `system event`

入队系统事件并可选触发 heartbeat（Gateway RPC）。

必填：

- `--text <text>`

选项：

- `--mode <now|next-heartbeat>`
- `--json`
- `--url`、`--token`、`--timeout`、`--expect-final`

### `system heartbeat last|enable|disable`

heartbeat 控制（Gateway RPC）。

选项：

- `--json`
- `--url`、`--token`、`--timeout`、`--expect-final`

### `system presence`

列出系统 presence 条目（Gateway RPC）。

选项：

- `--json`
- `--url`、`--token`、`--timeout`、`--expect-final`

## Cron

管理计划任务（Gateway RPC）。见 [/automation/cron-jobs](/zh/automation/cron-jobs)。

子命令：

- `cron status [--json]`
- `cron list [--all] [--json]`（默认表格输出；用 `--json` 获取原始输出）
- `cron add`（别名：`create`；需要 `--name` 且必须且仅能提供一个 `--at` | `--every` | `--cron`，以及必须且仅能提供一个 payload：`--system-event` | `--message`）
- `cron edit <id>`（patch 字段）
- `cron rm <id>`（别名：`remove`、`delete`）
- `cron enable <id>`
- `cron disable <id>`
- `cron runs --id <id> [--limit <n>]`
- `cron run <id> [--force]`

所有 `cron` 命令都接受 `--url`、`--token`、`--timeout`、`--expect-final`。

## Node host

`node` 运行 **无头 node host**，或将其管理为后台服务。见
[`openclaw node`](/zh/cli/node)。

子命令：

- `node run --host <gateway-host> --port 18789`
- `node status`
- `node install [--host <gateway-host>] [--port <port>] [--tls] [--tls-fingerprint <sha256>] [--node-id <id>] [--display-name <name>] [--runtime <node|bun>] [--force]`
- `node uninstall`
- `node stop`
- `node restart`

## Nodes

`nodes` 与 Gateway 通信并面向已配对节点。见 [/nodes](/zh/nodes)。

通用选项：

- `--url`、`--token`、`--timeout`、`--json`

子命令：

- `nodes status [--connected] [--last-connected <duration>]`
- `nodes describe --node <id|name|ip>`
- `nodes list [--connected] [--last-connected <duration>]`
- `nodes pending`
- `nodes approve <requestId>`
- `nodes reject <requestId>`
- `nodes rename --node <id|name|ip> --name <displayName>`
- `nodes invoke --node <id|name|ip> --command <command> [--params <json>] [--invoke-timeout <ms>] [--idempotency-key <key>]`
- `nodes run --node <id|name|ip> [--cwd <path>] [--env KEY=VAL] [--command-timeout <ms>] [--needs-screen-recording] [--invoke-timeout <ms>] <command...>`（mac node 或无头 node host）
- `nodes notify --node <id|name|ip> [--title <text>] [--body <text>] [--sound <name>] [--priority <passive|active|timeSensitive>] [--delivery <system|overlay|auto>] [--invoke-timeout <ms>]`（仅 mac）

摄像头：

- `nodes camera list --node <id|name|ip>`
- `nodes camera snap --node <id|name|ip> [--facing front|back|both] [--device-id <id>] [--max-width <px>] [--quality <0-1>] [--delay-ms <ms>] [--invoke-timeout <ms>]`
- `nodes camera clip --node <id|name|ip> [--facing front|back] [--device-id <id>] [--duration <ms|10s|1m>] [--no-audio] [--invoke-timeout <ms>]`

画布 + 屏幕：

- `nodes canvas snapshot --node <id|name|ip> [--format png|jpg|jpeg] [--max-width <px>] [--quality <0-1>] [--invoke-timeout <ms>]`
- `nodes canvas present --node <id|name|ip> [--target <urlOrPath>] [--x <px>] [--y <px>] [--width <px>] [--height <px>] [--invoke-timeout <ms>]`
- `nodes canvas hide --node <id|name|ip> [--invoke-timeout <ms>]`
- `nodes canvas navigate <url> --node <id|name|ip> [--invoke-timeout <ms>]`
- `nodes canvas eval [<js>] --node <id|name|ip> [--js <code>] [--invoke-timeout <ms>]`
- `nodes canvas a2ui push --node <id|name|ip> (--jsonl <path> | --text <text>) [--invoke-timeout <ms>]`
- `nodes canvas a2ui reset --node <id|name|ip> [--invoke-timeout <ms>]`
- `nodes screen record --node <id|name|ip> [--screen <index>] [--duration <ms|10s|1m>] [--fps <n>] [--no-audio] [--out <path>] [--invoke-timeout <ms>]`

定位：

- `nodes location get --node <id|name|ip> [--max-age <ms>] [--accuracy <coarse|balanced|precise>] [--location-timeout <ms>] [--invoke-timeout <ms>]`

## Browser

浏览器控制 CLI（独立 Chrome/Brave/Edge/Chromium）。见 [`openclaw browser`](/zh/cli/browser) 与 [Browser tool](/zh/tools/browser)。

通用选项：

- `--url`、`--token`、`--timeout`、`--json`
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

## Docs search

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
- `--timeout-ms <ms>`（默认为 `agents.defaults.timeoutSeconds`）
- `--history-limit <n>`
