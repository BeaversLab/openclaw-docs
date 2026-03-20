---
summary: "OpenClaw CLI 参考，包含 `openclaw` 命令、子命令和选项"
read_when:
  - 添加或修改 CLI 命令或选项
  - 记录新的命令表面
title: "CLI 参考"
---

# CLI 参考

此页面描述当前的 CLI 行为。如果命令发生更改，请更新此文档。

## 命令页面

- [`setup`](/zh/cli/setup)
- [`onboard`](/zh/cli/onboard)
- [`configure`](/zh/cli/configure)
- [`config`](/zh/cli/config)
- [`completion`](/zh/cli/completion)
- [`doctor`](/zh/cli/doctor)
- [`dashboard`](/zh/cli/dashboard)
- [`backup`](/zh/cli/backup)
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
- [`directory`](/zh/cli/directory)
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
- [`qr`](/zh/cli/qr)
- [`plugins`](/zh/cli/plugins) (插件命令)
- [`channels`](/zh/cli/channels)
- [`security`](/zh/cli/security)
- [`secrets`](/zh/cli/secrets)
- [`skills`](/zh/cli/skills)
- [`daemon`](/zh/cli/daemon) (网关服务命令的传统别名)
- [`clawbot`](/zh/cli/clawbot) (传统别名命名空间)
- [`voicecall`](/zh/cli/voicecall) (插件；如果已安装)

## 全局标志

- `--dev`: 将状态隔离在 `~/.openclaw-dev` 下并移动默认端口。
- `--profile <name>`: 将状态隔离在 `~/.openclaw-<name>` 下。
- `--no-color`: 禁用 ANSI 颜色。
- `--update`: `openclaw update` 的简写（仅限源码安装）。
- `-V`、`--version`、`-v`：打印版本并退出。

## 输出样式

- ANSI 颜色和进度指示器仅在 TTY 会话中渲染。
- OSC-8 超链接在支持的终端中渲染为可点击链接；否则我们将回退到纯 URL。
- `--json`（以及在支持的终端中的 `--plain`）会禁用样式以获得干净的输出。
- `--no-color` 禁用 ANSI 样式；`NO_COLOR=1` 也会被遵守。
- 长时间运行的命令会显示进度指示器（在支持的情况下使用 OSC 9;4）。

## 调色板

OpenClaw 使用龙虾色板来显示 CLI 输出。

- `accent` (#FF5A2D)：标题、标签、主要高亮。
- `accentBright` (#FF7A3D)：命令名称、强调。
- `accentDim` (#D14A22)：次要高亮文本。
- `info` (#FF8A5B)：信息性值。
- `success` (#2FBF71)：成功状态。
- `warn` (#FFB020)：警告、回退、注意。
- `error` (#E23D2D)：错误、失败。
- `muted` (#8B7F77)：弱化、元数据。

调色板的唯一真实来源：`src/terminal/palette.ts`（即“龙虾色板”）。

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
    migrate
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

注意：插件可以添加额外的顶层命令（例如 `openclaw voicecall`）。

## 安全性

- `openclaw security audit` — 审计配置 + 本地状态，查找常见的安全隐患。
- `openclaw security audit --deep` — 尽力而为的实时 Gateway(网关) 探测。
- `openclaw security audit --fix` — 收紧安全默认值并对状态/配置进行 chmod 设置。

## 密钥

- `openclaw secrets reload` — 重新解析引用并原子交换运行时快照。
- `openclaw secrets audit` — 扫描明文残留、未解析的引用和优先级漂移（`--allow-exec` 以在审计期间执行 exec 提供商）。
- `openclaw secrets configure` — 用于提供商设置 + SecretRef 映射 + 预检/应用 的交互式助手（`--allow-exec` 以在预检和包含 exec 的应用流程期间执行 exec 提供商）。
- `openclaw secrets apply --from <plan.json>` — 应用先前生成的计划（支持 `--dry-run`；使用 `--allow-exec` 以允许在试运行和包含 exec 的写入计划中使用 exec 提供程序）。

## 插件

管理扩展及其配置：

- `openclaw plugins list` — 发现插件（使用 `--json` 获取机器输出）。
- `openclaw plugins inspect <id>` — 显示插件详细信息（`info` 是别名）。
- `openclaw plugins install <path|.tgz|npm-spec|plugin@marketplace>` — 安装插件（或将插件路径添加到 `plugins.load.paths`）。
- `openclaw plugins marketplace list <marketplace>` — 安装前列出市场条目。
- `openclaw plugins enable <id>` / `disable <id>` — 切换 `plugins.entries.<id>.enabled`。
- `openclaw plugins doctor` — 报告插件加载错误。

大多数插件更改需要重启 Gateway(网关)。请参阅 [/plugin](/zh/tools/plugin)。

## 内存

对 `MEMORY.md` + `memory/*.md` 进行向量搜索：

- `openclaw memory status` — 显示索引统计信息。
- `openclaw memory index` — 重新索引内存文件。
- `openclaw memory search "<query>"`（或 `--query "<query>"`）— 对内存进行语义搜索。

## 聊天斜杠命令

聊天消息支持 `/...` 命令（文本和原生）。请参阅 [/tools/slash-commands](/zh/tools/slash-commands)。

亮点：

- `/status` 用于快速诊断。
- `/config` 用于持久化配置更改。
- `/debug` 用于仅运行时配置覆盖（内存，而非磁盘；需要 `commands.debug: true`）。

## 设置 + 新手引导

### `setup`

初始化配置 + 工作区。

选项：

- `--workspace <dir>`：代理工作区路径（默认为 `~/.openclaw/workspace`）。
- `--wizard`：运行新手引导。
- `--non-interactive`：运行无提示新手引导。
- `--mode <local|remote>`：引导模式。
- `--remote-url <url>`：远程 Gateway(网关) URL。
- `--remote-token <token>`：远程 Gateway(网关) 令牌。

当存在任何新手引导标志时（`--non-interactive`、`--mode`、`--remote-url`、`--remote-token`），新手引导将自动运行。

### `onboard`

针对网关、工作区和技能的交互式新手引导。

选项：

- `--workspace <dir>`
- `--reset`（在新手引导前重置配置 + 凭证 + 会话）
- `--reset-scope <config|config+creds+sessions|full>`（默认为 `config+creds+sessions`；使用 `full` 还可以移除工作区）
- `--non-interactive`
- `--mode <local|remote>`
- `--flow <quickstart|advanced|manual>`（manual 是 advanced 的别名）
- `--auth-choice <setup-token|token|chutes|openai-codex|openai-api-key|openrouter-api-key|ollama|ai-gateway-api-key|moonshot-api-key|moonshot-api-key-cn|kimi-code-api-key|synthetic-api-key|venice-api-key|gemini-api-key|zai-api-key|mistral-api-key|apiKey|minimax-api|minimax-api-lightning|opencode-zen|opencode-go|custom-api-key|skip>`
- `--token-provider <id>`（非交互式；与 `--auth-choice token` 一起使用）
- `--token <token>`（非交互式；与 `--auth-choice token` 一起使用）
- `--token-profile-id <id>`（非交互式；默认：`<provider>:manual`）
- `--token-expires-in <duration>`（非交互式；例如 `365d`、`12h`）
- `--secret-input-mode <plaintext|ref>`（默认为 `plaintext`；使用 `ref` 可以存储提供商的默认环境变量引用，而不是纯文本密钥）
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
- `--custom-base-url <url>`（非交互式；与 `--auth-choice custom-api-key` 或 `--auth-choice ollama` 一起使用）
- `--custom-model-id <id>`（非交互式；与 `--auth-choice custom-api-key` 或 `--auth-choice ollama` 一起使用）
- `--custom-api-key <key>`（非交互式；可选；与 `--auth-choice custom-api-key` 一起使用；如果省略，则回退到 `CUSTOM_API_KEY`）
- `--custom-provider-id <id>` (非交互式；可选的自定义提供商 ID)
- `--custom-compatibility <openai|anthropic>` (非交互式；可选；默认 `openai`)
- `--gateway-port <port>`
- `--gateway-bind <loopback|lan|tailnet|auto|custom>`
- `--gateway-auth <token|password>`
- `--gateway-token <token>`
- `--gateway-token-ref-env <name>` (非交互式；将 `gateway.auth.token` 存储为环境变量 SecretRef；要求设置该环境变量；不能与 `--gateway-token` 组合使用)
- `--gateway-password <password>`
- `--remote-url <url>`
- `--remote-token <token>`
- `--tailscale <off|serve|funnel>`
- `--tailscale-reset-on-exit`
- `--install-daemon`
- `--no-install-daemon` (别名：`--skip-daemon`)
- `--daemon-runtime <node|bun>`
- `--skip-channels`
- `--skip-skills`
- `--skip-health`
- `--skip-ui`
- `--node-manager <npm|pnpm|bun>` (推荐使用 pnpm；不建议将 bun 用于 Gateway(网关) 运行时)
- `--json`

### `configure`

交互式配置向导（模型、渠道、技能、网关）。

### `config`

非交互式配置辅助工具（get/set/unset/file/validate）。不带子命令运行 `openclaw config` 将启动向导。

子命令：

- `config get <path>`：打印配置值（点号/括号路径）。
- `config set`：支持四种赋值模式：
  - 值模式：`config set <path> <value>` (JSON5 或字符串解析)
  - SecretRef 构建器模式：`config set <path> --ref-provider <provider> --ref-source <source> --ref-id <id>`
  - 提供商构建器模式：`config set secrets.providers.<alias> --provider-source <env|file|exec> ...`
  - 批处理模式：`config set --batch-json '<json>'` 或 `config set --batch-file <path>`
- `config set --dry-run`：在不写入 `openclaw.json` 的情况下验证赋值（默认跳过 exec SecretRef 检查）。
- `config set --allow-exec --dry-run`：选择加入 exec SecretRef 试运行检查（可能会执行提供商命令）。
- `config set --dry-run --json`: 输出机器可读的试运行输出（检查 + 完整性信号、操作、已检查/跳过的引用、错误）。
- `config set --strict-json`: 要求对路径/值输入进行 JSON5 解析。`--json` 仍然是试运行输出模式之外严格解析的旧版别名。
- `config unset <path>`: 移除一个值。
- `config file`: 打印当前配置文件路径。
- `config validate`: 针对架构验证当前配置，而不启动网关。
- `config validate --json`: 输出机器可读的 JSON。

### `doctor`

健康检查 + 快速修复（配置 + 网关 + 旧版服务）。

选项：

- `--no-workspace-suggestions`: 禁用工作区内存提示。
- `--yes`: 接受默认值而不提示（无头模式）。
- `--non-interactive`: 跳过提示；仅应用安全迁移。
- `--deep`: 扫描系统服务以查找额外的网关安装。

## 渠道辅助工具

### `channels`

管理聊天渠道账号（WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (插件)/Signal/iMessage/MS Teams）。

子命令：

- `channels list`: 显示已配置的渠道和身份验证配置文件。
- `channels status`: 检查网关可达性和渠道健康状况（`--probe` 运行额外检查；使用 `openclaw health` 或 `openclaw status --deep` 进行网关健康探测）。
- 提示：当 `channels status` 检测到常见配置错误时，会打印带有建议修复的警告（然后将您指向 `openclaw doctor`）。
- `channels logs`: 显示网关日志文件中最近的渠道日志。
- `channels add`: 未传递标志时的向导式设置；标志切换到非交互模式。
  - 当向仍在使用单账号顶级配置的渠道添加非默认账号时，OpenClaw 会在写入新账号之前将账号范围内的值移动到 `channels.<channel>.accounts.default` 中。
  - 非交互式 `channels add` 不会自动创建/升级绑定；仅限渠道的绑定继续匹配默认账户。
- `channels remove`：默认禁用；传递 `--delete` 以在不提示的情况下删除配置条目。
- `channels login`：交互式渠道登录（仅限 WhatsApp Web）。
- `channels logout`：退出渠道会话（如果支持）。

常用选项：

- `--channel <name>`：`whatsapp|telegram|discord|googlechat|slack|mattermost|signal|imessage|msteams`
- `--account <id>`：渠道账户 ID（默认 `default`）
- `--name <label>`：账户的显示名称

`channels login` 选项：

- `--channel <channel>`（默认 `whatsapp`；支持 `whatsapp`/`web`）
- `--account <id>`
- `--verbose`

`channels logout` 选项：

- `--channel <channel>`（默认 `whatsapp`）
- `--account <id>`

`channels list` 选项：

- `--no-usage`：跳过模型提供商使用量/配额快照（仅限 OAuth/API 支持）。
- `--json`：输出 JSON（除非设置了 `--no-usage`，否则包含使用情况）。

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

列出并检查可用技能及就绪信息。

子命令：

- `skills list`：列出技能（不带子命令时的默认操作）。
- `skills info <name>`：显示一个技能的详细信息。
- `skills check`：就绪与缺失需求的摘要。

选项：

- `--eligible`：仅显示就绪的技能。
- `--json`：输出 JSON（无样式）。
- `-v`, `--verbose`: 包括缺失的详细信息。

提示：使用 `npx clawhub` 来搜索、安装和同步技能。

### `pairing`

跨渠道批准私信配对请求。

子命令：

- `pairing list [channel] [--channel <channel>] [--account <id>] [--json]`
- `pairing approve <channel> <code> [--account <id>] [--notify]`
- `pairing approve --channel <channel> [--account <id>] <code> [--notify]`

### `devices`

管理网关设备配对条目和基于角色的设备令牌。

子命令：

- `devices list [--json]`
- `devices approve [requestId] [--latest]`
- `devices reject <requestId>`
- `devices remove <deviceId>`
- `devices clear --yes [--pending]`
- `devices rotate --device <id> --role <role> [--scope <scope...>]`
- `devices revoke --device <id> --role <role>`

### `webhooks gmail`

Gmail Pub/Sub hook 设置 + 运行器。参见 [/automation/gmail-pubsub](/zh/automation/gmail-pubsub)。

子命令：

- `webhooks gmail setup` (需要 `--account <email>`；支持 `--project`, `--topic`, `--subscription`, `--label`, `--hook-url`, `--hook-token`, `--push-token`, `--bind`, `--port`, `--path`, `--include-body`, `--max-bytes`, `--renew-minutes`, `--tailscale`, `--tailscale-path`, `--tailscale-target`, `--push-endpoint`, `--json`)
- `webhooks gmail run` (相同标志的运行时覆盖)

### `dns setup`

广域发现 DNS 助手 (CoreDNS + Tailscale)。参见 [/gateway/discovery](/zh/gateway/discovery)。

选项：

- `--apply`: 安装/更新 CoreDNS 配置 (需要 sudo；仅限 macOS)。

## 消息传递 + 代理

### `message`

统一出站消息传递 + 渠道操作。

参见：[/cli/message](/zh/cli/message)

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

通过 Gateway(网关)（或 `--local` 嵌入式）运行一个代理轮次。

必需：

- `--message <text>`

选项：

- `--to <dest>` （用于会话密钥和可选投递）
- `--session-id <id>`
- `--thinking <off|minimal|low|medium|high|xhigh>` （仅限 GPT-5.2 + Codex 模型）
- `--verbose <on|full|off>`
- `--channel <whatsapp|telegram|discord|slack|mattermost|signal|imessage|msteams>`
- `--local`
- `--deliver`
- `--json`
- `--timeout <seconds>`

### `agents`

管理隔离的代理（工作区 + 认证 + 路由）。

#### `agents list`

列出已配置的代理。

选项：

- `--json`
- `--bindings`

#### `agents add [name]`

添加一个新的隔离代理。除非传递了标志（或 `--non-interactive`），否则运行引导向导；在非交互模式下，`--workspace` 是必需的。

选项：

- `--workspace <dir>`
- `--model <id>`
- `--agent-dir <dir>`
- `--bind <channel[:accountId]>` （可重复）
- `--non-interactive`
- `--json`

绑定规范使用 `channel[:accountId]`。当省略 `accountId` 时，OpenClaw 可以通过渠道默认值/插件挂钩解析账户范围；否则，这是没有明确账户范围的渠道绑定。

#### `agents bindings`

列出路由绑定。

选项：

- `--agent <id>`
- `--json`

#### `agents bind`

为代理添加路由绑定。

选项：

- `--agent <id>`
- `--bind <channel[:accountId]>` （可重复）
- `--json`

#### `agents unbind`

为代理移除路由绑定。

选项：

- `--agent <id>`
- `--bind <channel[:accountId]>`（可重复）
- `--all`
- `--json`

#### `agents delete <id>`

删除代理并清理其工作区和状态。

选项：

- `--force`
- `--json`

### `acp`

运行 ACP 网桥，将 IDE 连接到 Gateway(网关)。

有关完整选项和示例，请参阅 [`acp`](/zh/cli/acp)。

### `status`

显示已链接会话的健康状况和最近的接收者。

选项：

- `--json`
- `--all`（完整诊断；只读，可粘贴）
- `--deep`（探测通道）
- `--usage`（显示模型提供商的使用情况/配额）
- `--timeout <ms>`
- `--verbose`
- `--debug`（`--verbose` 的别名）

注意：

- 概览包括 Gateway(网关) 和节点主机服务状态（如果可用）。

### 使用情况跟踪

当 OAuth/API 凭据可用时，OpenClaw 可以显示提供商使用情况/配额。

显示位置：

- `/status`（如果可用，添加简短的使用情况说明行）
- `openclaw status --usage`（打印完整的提供商细分信息）
- macOS 菜单栏（Context 下的 Usage 部分）

注意：

- 数据直接来自提供商使用情况端点（无估算）。
- 提供商：Anthropic、GitHub Copilot、OpenAI Codex OAuth，以及通过捆绑的 `google` 插件实现的 Gemini CLI，以及在配置了 Antigravity 的地方。
- 如果不存在匹配的凭据，则使用情况会被隐藏。
- 详细信息：请参阅 [使用情况跟踪](/zh/concepts/usage-tracking)。

### `health`

从正在运行的 Gateway 获取健康状况。

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

## 重置 / 卸载

### `reset`

重置本地配置/状态（保留已安装的 CLI）。

选项：

- `--scope <config|config+creds+sessions|full>`
- `--yes`
- `--non-interactive`
- `--dry-run`

注：

- `--non-interactive` 需要 `--scope` 和 `--yes`。

### `uninstall`

卸载网关服务 + 本地数据（CLI 保留）。

选项：

- `--service`
- `--state`
- `--workspace`
- `--app`
- `--all`
- `--yes`
- `--non-interactive`
- `--dry-run`

注：

- `--non-interactive` 需要 `--yes` 和明确的范围（或 `--all`）。

## Gateway(网关)

### `gateway`

运行 WebSocket Gateway(网关)。

选项：

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
- `--reset`（重置开发配置 + 凭据 + 会话 + 工作区）
- `--force`（终止端口上的现有监听器）
- `--verbose`
- `--claude-cli-logs`
- `--ws-log <auto|full|compact>`
- `--compact`（`--ws-log compact` 的别名）
- `--raw-stream`
- `--raw-stream-path <path>`

### `gateway service`

管理 Gateway(网关) 服务（launchd/systemd/schtasks）。

子命令：

- `gateway status`（默认探测 Gateway(网关) RPC）
- `gateway install`（服务安装）
- `gateway uninstall`
- `gateway start`
- `gateway stop`
- `gateway restart`

注：

- `gateway status` 默认使用服务的已解析端口/配置探测 Gateway(网关) RPC（可通过 `--url/--token/--password` 覆盖）。
- `gateway status` 支持 `--no-probe`、`--deep`、`--require-rpc` 和 `--json` 用于脚本编写。
- `gateway status` 还会在检测到旧版或额外的网关服务时显示它们（`--deep` 会添加系统级扫描）。以配置文件命名的 OpenClaw 服务被视为一流服务，不会被标记为“额外”。
- `gateway status` 会打印 CLI 使用的配置路径与服务可能使用的配置（服务环境）之间的差异，以及已解析的探测目标 URL。
- 如果在当前命令路径中未解析网关身份验证 SecretRefs，则 `gateway status --json` 仅在探测连接/身份验证失败时报告 `rpc.authWarning`（探测成功时会抑制警告）。
- 在 Linux systemd 安装中，状态令牌漂移检查包括 `Environment=` 和 `EnvironmentFile=` 单元源。
- `gateway install|uninstall|start|stop|restart` 支持 `--json` 用于脚本编写（默认输出保持便于人类阅读）。
- `gateway install` 默认使用 Node 运行时；**不建议**使用 bun（存在 WhatsApp/Telegram Bug）。
- `gateway install` 选项：`--port`、`--runtime`、`--token`、`--force`、`--json`。

### `logs`

通过 RPC 跟踪网关文件日志。

备注：

- TTY 会话呈现彩色、结构化视图；非 TTY 则回退到纯文本。
- `--json` 发出换行符分隔的 JSON（每行一个日志事件）。

示例：

```bash
openclaw logs --follow
openclaw logs --limit 200
openclaw logs --plain
openclaw logs --json
openclaw logs --no-color
```

### `gateway <subcommand>`

网关 CLI 帮助程序（对 RPC 子命令使用 `--url`、`--token`、`--password`、`--timeout`、`--expect-final`）。
当您传递 `--url` 时，CLI 不会自动应用配置或环境凭据。
请显式包含 `--token` 或 `--password`。缺少显式凭据即为错误。

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

提示：直接调用 `config.set`/`config.apply`/`config.patch` 时，如果配置已存在，请从
`config.get` 传递 `baseHash`。

## 模型

有关回退行为和扫描策略，请参阅 [/concepts/models](/zh/concepts/models)。

Anthropic setup-token（支持）：

```bash
claude setup-token
openclaw models auth setup-token --provider anthropic
openclaw models status
```

策略说明：这是技术兼容性。Anthropic 过去曾阻止在 Claude Code 之外的某些
订阅使用；在生产环境中依赖 setup-token 之前，请验证当前的 Anthropic
条款。

### `models`（根目录）

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
- `--check`（退出 1=已过期/缺失，2=即将过期）
- `--probe`（对已配置的身份配置文件进行实时探测）
- `--probe-provider <name>`
- `--probe-profile <id>`（重复或逗号分隔）
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`

始终包括身份验证存储中的配置文件的身份验证概述和 OAuth 过期状态。
`--probe` 运行实时请求（可能会消耗令牌并触发速率限制）。

### `models set <model>`

设置 `agents.defaults.model.primary`。

### `models set-image <model>`

设置 `agents.defaults.imageModel.primary`。

### `models aliases list|add|remove`

选项：

- `list`： `--json`、`--plain`
- `add <alias> <model>`
- `remove <alias>`

### `models fallbacks list|add|remove|clear`

选项：

- `list`： `--json`、`--plain`
- `add <model>`
- `remove <model>`
- `clear`

### `models image-fallbacks list|add|remove|clear`

选项：

- `list`： `--json`、`--plain`
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

- `add`：交互式身份验证助手
- `setup-token`：`--provider <name>`（默认 `anthropic`）、`--yes`
- `paste-token`： `--provider <name>`、`--profile-id <id>`、`--expires-in <duration>`

### `models auth order get|set|clear`

选项：

- `get`： `--provider <name>`、`--agent <id>`、`--json`
- `set`: `--provider <name>`, `--agent <id>`, `<profileIds...>`
- `clear`: `--provider <name>`, `--agent <id>`

## 系统

### `system event`

Enqueue a system event and optionally trigger a heartbeat (Gateway(网关) RPC)。

必需：

- `--text <text>`

选项：

- `--mode <now|next-heartbeat>`
- `--json`
- `--url`, `--token`, `--timeout`, `--expect-final`

### `system heartbeat last|enable|disable`

Heartbeat controls (Gateway(网关) RPC)。

选项：

- `--json`
- `--url`, `--token`, `--timeout`, `--expect-final`

### `system presence`

List system presence entries (Gateway(网关) RPC)。

选项：

- `--json`
- `--url`, `--token`, `--timeout`, `--expect-final`

## Cron

Manage scheduled jobs (Gateway(网关) RPC)。See [/automation/cron-jobs](/zh/automation/cron-jobs)。

子命令：

- `cron status [--json]`
- `cron list [--all] [--json]` (默认为表格输出；使用 `--json` 获取原始输出)
- `cron add` (别名：`create`；需要 `--name` 以及 `--at` | `--every` | `--cron` 中的一个，以及 `--system-event` | `--message` 中的一个有效载荷)
- `cron edit <id>` (修补字段)
- `cron rm <id>` (别名：`remove`, `delete`)
- `cron enable <id>`
- `cron disable <id>`
- `cron runs --id <id> [--limit <n>]`
- `cron run <id> [--force]`

所有 `cron` 命令都接受 `--url`、`--token`、`--timeout`、`--expect-final`。

## Node host

`node` 运行**无头节点主机**或将其作为后台服务进行管理。请参阅 [`openclaw node`](/zh/cli/node)。

子命令：

- `node run --host <gateway-host> --port 18789`
- `node status`
- `node install [--host <gateway-host>] [--port <port>] [--tls] [--tls-fingerprint <sha256>] [--node-id <id>] [--display-name <name>] [--runtime <node|bun>] [--force]`
- `node uninstall`
- `node stop`
- `node restart`

身份验证说明：

- `node` 从环境/配置解析网关身份验证（无 `--token`/`--password` 标志）：`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`，然后是 `gateway.auth.*`。在本地模式下，节点主机故意忽略 `gateway.remote.*`；在 `gateway.mode=remote` 中，`gateway.remote.*` 按照远程优先级规则参与。
- 旧版 `CLAWDBOT_GATEWAY_*` 环境变量在节点主机身份验证解析中被有意忽略。

## 节点

`nodes` 与 Gateway(网关) 通信并以已配对的节点为目标。请参阅 [/nodes](/zh/nodes)。

常用选项：

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
- `nodes run --node <id|name|ip> [--cwd <path>] [--env KEY=VAL] [--command-timeout <ms>] [--needs-screen-recording] [--invoke-timeout <ms>] <command...>`（mac 节点或无头节点主机）
- `nodes notify --node <id|name|ip> [--title <text>] [--body <text>] [--sound <name>] [--priority <passive|active|timeSensitive>] [--delivery <system|overlay|auto>] [--invoke-timeout <ms>]`（仅限 mac）

摄像头：

- `nodes camera list --node <id|name|ip>`
- `nodes camera snap --node <id|name|ip> [--facing front|back|both] [--device-id <id>] [--max-width <px>] [--quality <0-1>] [--delay-ms <ms>] [--invoke-timeout <ms>]`
- `nodes camera clip --node <id|name|ip> [--facing front|back] [--device-id <id>] [--duration <ms|10s|1m>] [--no-audio] [--invoke-timeout <ms>]`

Canvas + 屏幕：

- `nodes canvas snapshot --node <id|name|ip> [--format png|jpg|jpeg] [--max-width <px>] [--quality <0-1>] [--invoke-timeout <ms>]`
- `nodes canvas present --node <id|name|ip> [--target <urlOrPath>] [--x <px>] [--y <px>] [--width <px>] [--height <px>] [--invoke-timeout <ms>]`
- `nodes canvas hide --node <id|name|ip> [--invoke-timeout <ms>]`
- `nodes canvas navigate <url> --node <id|name|ip> [--invoke-timeout <ms>]`
- `nodes canvas eval [<js>] --node <id|name|ip> [--js <code>] [--invoke-timeout <ms>]`
- `nodes canvas a2ui push --node <id|name|ip> (--jsonl <path> | --text <text>) [--invoke-timeout <ms>]`
- `nodes canvas a2ui reset --node <id|name|ip> [--invoke-timeout <ms>]`
- `nodes screen record --node <id|name|ip> [--screen <index>] [--duration <ms|10s>] [--fps <n>] [--no-audio] [--out <path>] [--invoke-timeout <ms>]`

位置：

- `nodes location get --node <id|name|ip> [--max-age <ms>] [--accuracy <coarse|balanced|precise>] [--location-timeout <ms>] [--invoke-timeout <ms>]`

## 浏览器

浏览器控制 CLI（专用的 Chrome/Brave/Edge/Chromium）。请参阅 [`openclaw browser`](/zh/cli/browser) 和 [浏览器工具](/zh/tools/browser)。

常用选项：

- `--url`, `--token`, `--timeout`, `--json`
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

打开连接到 Gateway(网关) 的终端 UI。

选项：

- `--url <url>`
- `--token <token>`
- `--password <password>`
- `--session <key>`
- `--deliver`
- `--thinking <level>`
- `--message <text>`
- `--timeout-ms <ms>` (默认为 `agents.defaults.timeoutSeconds`)
- `--history-limit <n>`

import zh from "/components/footer/zh.mdx";

<zh />
