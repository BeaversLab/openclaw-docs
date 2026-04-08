---
summary: "OpenClaw CLI 参考文档，涵盖 `openclaw` 命令、子命令和选项"
read_when:
  - Adding or modifying CLI commands or options
  - Documenting new command surfaces
title: "CLI 参考文档"
---

# CLI 参考文档

此页面描述了当前的 CLI 行为。如果命令发生更改，请更新此文档。

## 命令页面

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
- [`plugins`](/en/cli/plugins) (插件命令)
- [`channels`](/en/cli/channels)
- [`security`](/en/cli/security)
- [`secrets`](/en/cli/secrets)
- [`skills`](/en/cli/skills)
- [`daemon`](/en/cli/daemon) (网关服务命令的旧别名)
- [`clawbot`](/en/cli/clawbot) (旧别名命名空间)
- [`voicecall`](/en/cli/voicecall) (插件；如果已安装)

## 全局标志

- `--dev`: 在 `~/.openclaw-dev` 下隔离状态并移动默认端口。
- `--profile <name>`: 在 `~/.openclaw-<name>` 下隔离状态。
- `--container <name>`: 定向到指定容器以执行命令。
- `--no-color`: 禁用 ANSI 颜色。
- `--update`：`openclaw update` 的简写（仅限源码安装）。
- `-V`、`--version`、`-v`：打印版本并退出。

## 输出样式

- ANSI 颜色和进度指示器仅在 TTY 会话中渲染。
- OSC-8 超链接在支持的终端中渲染为可点击链接；否则我们将回退到纯文本 URL。
- `--json`（以及在支持的终端中的 `--plain`）禁用样式以实现清洁输出。
- `--no-color` 禁用 ANSI 样式；`NO_COLOR=1` 也会被遵守。
- 长时间运行的命令会显示进度指示器（支持时为 OSC 9;4）。

## 调色板

OpenClaw 对 CLI 输出使用龙虾调色板。

- `accent` (#FF5A2D)：标题、标签、主要高亮。
- `accentBright` (#FF7A3D)：命令名称、强调。
- `accentDim` (#D14A22)：次要高亮文本。
- `info` (#FF8A5B)：信息值。
- `success` (#2FBF71)：成功状态。
- `warn` (#FFB020)：警告、回退、注意。
- `error` (#E23D2D)：错误、失败。
- `muted` (#8B7F77)：弱化、元数据。

调色板事实来源：`src/terminal/palette.ts`（即“龙虾调色板”）。

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

注意：插件可以添加额外的顶级命令（例如 `openclaw voicecall`）。

## 安全性

- `openclaw security audit` — 审计配置和本地状态中常见的安全隐患。
- `openclaw security audit --deep` — 尽力而为的实时 Gateway(网关) 探测。
- `openclaw security audit --fix` — 收紧安全默认值以及状态/配置权限。

## 机密

### `secrets`

管理 SecretRef 及相关的运行时/配置卫生状况。

子命令：

- `secrets reload`
- `secrets audit`
- `secrets configure`
- `secrets apply --from <path>`

`secrets reload` 选项：

- `--url`, `--token`, `--timeout`, `--expect-final`, `--json`

`secrets audit` 选项：

- `--check`
- `--allow-exec`
- `--json`

`secrets configure` 选项：

- `--apply`
- `--yes`
- `--providers-only`
- `--skip-provider-setup`
- `--agent <id>`
- `--allow-exec`
- `--plan-out <path>`
- `--json`

`secrets apply --from <path>` 选项：

- `--dry-run`
- `--allow-exec`
- `--json`

备注：

- `reload` 是 Gateway(网关) RPC，当解析失败时会保留最后已知良好的运行时快照。
- `audit --check` 在发现结果时返回非零值；未解析的引用使用更高优先级的非零退出代码。
- 默认情况下跳过试运行执行检查；请使用 `--allow-exec` 选择加入。

## 插件

管理扩展及其配置：

- `openclaw plugins list` — 发现插件（使用 `--json` 获取机器可读输出）。
- `openclaw plugins inspect <id>` — 显示插件详细信息（`info` 是别名）。
- `openclaw plugins install <path|.tgz|npm-spec|plugin@marketplace>` — 安装插件（或将插件路径添加到 `plugins.load.paths`；使用 `--force` 覆盖现有安装目标）。
- `openclaw plugins marketplace list <marketplace>` — 安装前列出市场条目。
- `openclaw plugins enable <id>` / `disable <id>` — 切换 `plugins.entries.<id>.enabled`。
- `openclaw plugins doctor` — 报告插件加载错误。

大多数插件更改需要重启网关。请参阅 [/plugin](/en/tools/plugin)。

## 记忆

对 `MEMORY.md` + `memory/*.md` 进行向量搜索：

- `openclaw memory status` — 显示索引统计信息；使用 `--deep` 进行向量 + 嵌入就绪检查，或使用 `--fix` 修复过时的召回/提升工件。
- `openclaw memory index` — 重新索引内存文件。
- `openclaw memory search "<query>"` (或 `--query "<query>"`) — 对内存进行语义搜索。
- `openclaw memory promote` — 对短期召回进行排序，并可选择将顶部条目附加到 `MEMORY.md` 中。

## 沙箱

管理用于隔离代理执行的沙箱运行时。参见 [/cli/sandbox](/en/cli/sandbox)。

子命令：

- `sandbox list [--browser] [--json]`
- `sandbox recreate [--all] [--session <key>] [--agent <id>] [--browser] [--force]`
- `sandbox explain [--session <key>] [--agent <id>] [--json]`

注意：

- `sandbox recreate` 会移除现有的运行时，以便下次使用时根据当前配置重新初始化。
- 对于 `ssh` 和 OpenShell `remote` 后端，recreate 会删除所选作用域的规范远程工作区。

## 聊天斜杠命令

聊天消息支持 `/...` 命令（文本和原生）。参见 [/tools/slash-commands](/en/tools/slash-commands)。

亮点：

- `/status` 用于快速诊断。
- `/config` 用于持久化的配置更改。
- `/debug` 用于仅运行时的配置覆盖（内存，非磁盘；需要 `commands.debug: true`）。

## 设置 + 新手引导

### `completion`

生成 Shell 自动补全脚本，并可选择将其安装到您的 Shell 配置文件中。

选项：

- `-s, --shell <zsh|bash|powershell|fish>`
- `-i, --install`
- `--write-state`
- `-y, --yes`

注意：

- 如果没有 `--install` 或 `--write-state`，`completion` 会将脚本打印到标准输出。
- `--install` 会在您的 Shell 配置文件中写入一个 `OpenClaw Completion` 块，并将其指向 OpenClaw 状态目录下的缓存脚本。

### `setup`

初始化配置 + 工作区。

选项：

- `--workspace <dir>`：代理工作区路径（默认为 `~/.openclaw/workspace`）。
- `--wizard`：运行新手引导。
- `--non-interactive`：运行新手引导（无提示）。
- `--mode <local|remote>`：引导模式。
- `--remote-url <url>`：远程 Gateway(网关) URL。
- `--remote-token <token>`：远程 Gateway(网关) 令牌。

当存在任何新手引导标志时（`--non-interactive`、`--mode`、`--remote-url`、`--remote-token`），新手引导将自动运行。

### `onboard`

针对 gateway(网关)、工作区和技能的交互式新手引导。

选项：

- `--workspace <dir>`
- `--reset`（在新手引导之前重置配置 + 凭据 + 会话）
- `--reset-scope <config|config+creds+sessions|full>`（默认为 `config+creds+sessions`；使用 `full` 也可删除工作区）
- `--non-interactive`
- `--mode <local|remote>`
- `--flow <quickstart|advanced|manual>`（manual 是 advanced 的别名）
- `--auth-choice <choice>` 其中 `<choice>` 是以下之一：
  `chutes`、`deepseek-api-key`、`openai-codex`、`openai-api-key`，
  `openrouter-api-key`、`kilocode-api-key`、`litellm-api-key`、`ai-gateway-api-key`，
  `cloudflare-ai-gateway-api-key`、`moonshot-api-key`、`moonshot-api-key-cn`，
  `kimi-code-api-key`、`synthetic-api-key`、`venice-api-key`、`together-api-key`，
  `huggingface-api-key`、`apiKey`、`gemini-api-key`、`zai-api-key`，
  `zai-coding-global`、`zai-coding-cn`、`zai-global`、`zai-cn`、`xiaomi-api-key`，
  `minimax-global-oauth`、`minimax-global-api`、`minimax-cn-oauth`、`minimax-cn-api`，
  `opencode-zen`、`opencode-go`、`github-copilot`、`copilot-proxy`、`xai-api-key`，
  `mistral-api-key`、`volcengine-api-key`、`byteplus-api-key`、`qianfan-api-key`，
  `qwen-standard-api-key-cn`、`qwen-standard-api-key`、`qwen-api-key-cn`、`qwen-api-key`，
  `modelstudio-standard-api-key-cn`、`modelstudio-standard-api-key`，
  `modelstudio-api-key-cn`、`modelstudio-api-key`、`custom-api-key`、`skip`
- Qwen 注意：`qwen-*` 是规范的 auth-choice 系列。`modelstudio-*`
  id 仍然作为旧版兼容性别名被接受。
- `--secret-input-mode <plaintext|ref>` （默认为 `plaintext`；使用 `ref` 来存储提供商默认的环境变量引用，而不是纯文本密钥）
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
- `--custom-base-url <url>` (非交互式；与 `--auth-choice custom-api-key` 一起使用)
- `--custom-model-id <id>` (非交互式；与 `--auth-choice custom-api-key` 一起使用)
- `--custom-api-key <key>` (非交互式；可选；与 `--auth-choice custom-api-key` 一起使用；省略时回退到 `CUSTOM_API_KEY`)
- `--custom-provider-id <id>` (非交互式；可选的自定义提供商 ID)
- `--custom-compatibility <openai|anthropic>` (非交互式；可选；默认为 `openai`)
- `--gateway-port <port>`
- `--gateway-bind <loopback|lan|tailnet|auto|custom>`
- `--gateway-auth <token|password>`
- `--gateway-token <token>`
- `--gateway-token-ref-env <name>` (非交互式；将 `gateway.auth.token` 存储为环境变量 SecretRef；要求设置该环境变量；不能与 `--gateway-token` 结合使用)
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
- `--skip-search`
- `--skip-health`
- `--skip-ui`
- `--cloudflare-ai-gateway-account-id <id>`
- `--cloudflare-ai-gateway-gateway-id <id>`
- `--node-manager <npm|pnpm|bun>` (setup/新手引导 skills 的节点管理器；推荐使用 pnpm，也支持 bun)
- `--json`

### `configure`

交互式配置向导（模型、渠道、skills、网关）。

选项：

- `--section <section>` (可重复；将向导限制在特定部分)

### `config`

非交互式配置辅助工具（get/set/unset/file/schema/validate）。不带子命令运行 `openclaw config` 将启动向导。

子命令：

- `config get <path>`：打印配置值（点/括号路径）。
- `config set`：支持四种赋值模式：
  - 值模式：`config set <path> <value>`（JSON5 或字符串解析）
  - SecretRef 构建器模式：`config set <path> --ref-provider <provider> --ref-source <source> --ref-id <id>`
  - 提供商构建器模式：`config set secrets.providers.<alias> --provider-source <env|file|exec> ...`
  - 批处理模式：`config set --batch-json '<json>'` 或 `config set --batch-file <path>`
- `config set --dry-run`：验证赋值而不写入 `openclaw.json`（默认情况下跳过 exec SecretRef 检查）。
- `config set --allow-exec --dry-run`：选择启用 exec SecretRef 模拟运行检查（可能会执行提供商命令）。
- `config set --dry-run --json`：发出机器可读的模拟运行输出（检查 + 完整性信号、操作、已检查/已跳过的引用、错误）。
- `config set --strict-json`：要求对路径/值输入进行 JSON5 解析。`--json` 仍然是模拟运行输出模式之外进行严格解析的传统别名。
- `config unset <path>`：删除一个值。
- `config file`：打印活动配置文件路径。
- `config schema`：打印 `openclaw.json` 的生成 JSON 架构，包括跨嵌套对象、通配符、数组项和组合分支传播的字段 `title` / `description` 文档元数据，以及尽力而为的实时插件/渠道架构元数据。
- `config validate`：根据架构验证当前配置而不启动网关。
- `config validate --json`：发出机器可读的 JSON 输出。

### `doctor`

健康检查 + 快速修复（配置 + 网关 + 传统服务）。

选项：

- `--no-workspace-suggestions`：禁用工作区内存提示。
- `--yes`：不经提示接受默认值（无头模式）。
- `--non-interactive`：跳过提示；仅应用安全迁移。
- `--deep`：扫描系统服务以查找额外的网关安装。
- `--repair`（别名：`--fix`）：尝试自动修复检测到的问题。
- `--force`：即使并非严格需要也强制修复。
- `--generate-gateway-token`：生成新的网关认证令牌。

### `dashboard`

使用当前令牌打开控制 UI。

选项：

- `--no-open`：打印 URL 但不启动浏览器

注意：

- 对于由 SecretRef 管理的网关令牌，`dashboard` 会打印或打开不带令牌的 URL，而不是在终端输出或浏览器启动参数中暴露该密钥。

### `update`

更新已安装的 CLI。

根选项：

- `--json`
- `--no-restart`
- `--dry-run`
- `--channel <stable|beta|dev>`
- `--tag <dist-tag|version|spec>`
- `--timeout <seconds>`
- `--yes`

子命令：

- `update status`
- `update wizard`

`update status` 选项：

- `--json`
- `--timeout <seconds>`

`update wizard` 选项：

- `--timeout <seconds>`

注意：

- `openclaw --update` 重写为 `openclaw update`。

### `backup`

为 OpenClaw 状态创建并验证本地备份存档。

子命令：

- `backup create`
- `backup verify <archive>`

`backup create` 选项：

- `--output <path>`
- `--json`
- `--dry-run`
- `--verify`
- `--only-config`
- `--no-include-workspace`

`backup verify <archive>` 选项：

- `--json`

## 渠道助手

### `channels`

管理聊天渠道帐户（WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (plugin)/Signal/iMessage/Microsoft Teams）。

子命令：

- `channels list`：显示已配置的渠道和身份验证配置文件。
- `channels status`：检查网关可达性和渠道健康状况（当网关可达时，`--probe` 运行实时的按账户探测/审计检查；如果不可达，则会回退到仅配置的渠道摘要。请使用 `openclaw health` 或 `openclaw status --deep` 进行更广泛的网关健康探测）。
- 提示：当 `channels status` 检测到常见配置错误时，会打印包含建议修复方法的警告（然后将您指向 `openclaw doctor`）。
- `channels logs`：显示来自网关日志文件的最新渠道日志。
- `channels add`：在不传递标志时采用向导式设置；标志切换到非交互模式。
  - 当向仍使用单账户顶级配置的渠道添加非默认账户时，OpenClaw 会在写入新账户之前将账户范围的值提升到渠道账户映射中。大多数渠道使用 `accounts.default`；Matrix 可以改为保留现有的匹配命名/默认目标。
  - 非交互式 `channels add` 不会自动创建/升级绑定；仅限渠道的绑定继续匹配默认账户。
- `channels remove`：默认禁用；传递 `--delete` 可在不提示的情况下删除配置条目。
- `channels login`：交互式渠道登录（仅限 WhatsApp Web）。
- `channels logout`：登出渠道会话（如果支持）。

常用选项：

- `--channel <name>`：`whatsapp|telegram|discord|googlechat|slack|mattermost|signal|imessage|msteams`
- `--account <id>`：渠道账户 ID（默认为 `default`）
- `--name <label>`：账户的显示名称

`channels login` 选项：

- `--channel <channel>`（默认 `whatsapp`；支持 `whatsapp`/`web`）
- `--account <id>`
- `--verbose`

`channels logout` 选项：

- `--channel <channel>`（默认 `whatsapp`）
- `--account <id>`

`channels list` 选项：

- `--no-usage`：跳过模型提供商的使用/配额快照（仅限 OAuth/API 支持）。
- `--json`：输出 JSON（除非设置了 `--no-usage`，否则包含使用情况）。

`channels status` 选项：

- `--probe`
- `--timeout <ms>`
- `--json`

`channels capabilities` 选项：

- `--channel <name>`
- `--account <id>`（仅适用于 `--channel`）
- `--target <dest>`
- `--timeout <ms>`
- `--json`

`channels resolve` 选项：

- `<entries...>`
- `--channel <name>`
- `--account <id>`
- `--kind <auto|user|group>`
- `--json`

`channels logs` 选项：

- `--channel <name|all>`（默认为 `all`）
- `--lines <n>`（默认为 `200`）
- `--json`

注意：

- `channels login` 支持 `--verbose`。
- `channels capabilities --account` 仅在设置了 `--channel` 时适用。
- `channels status --probe` 可以显示传输状态以及探测/审计结果，例如 `works`、`probe failed`、`audit ok` 或 `audit failed`，具体取决于渠道支持。

更多详情：[/concepts/oauth](/en/concepts/oauth)

示例：

```bash
openclaw channels add --channel telegram --account alerts --name "Alerts Bot" --token $TELEGRAM_BOT_TOKEN
openclaw channels add --channel discord --account work --name "Work Bot" --token $DISCORD_BOT_TOKEN
openclaw channels remove --channel discord --account work --delete
openclaw channels status --probe
openclaw status --deep
```

### `directory`

查找暴露了目录表面的渠道的自我、对等和组 ID。请参阅 [`openclaw directory`](/en/cli/directory)。

通用选项：

- `--channel <name>`
- `--account <id>`
- `--json`

子命令：

- `directory self`
- `directory peers list [--query <text>] [--limit <n>]`
- `directory groups list [--query <text>] [--limit <n>]`
- `directory groups members --group-id <id> [--limit <n>]`

### `skills`

列出并检查可用技能以及就绪信息。

子命令：

- `skills search [query...]`：搜索 ClawHub 技能。
- `skills search --limit <n> --json`：限制搜索结果或输出机器可读的输出。
- `skills install <slug>`：将技能从 ClawHub 安装到当前工作区。
- `skills install <slug> --version <version>`：安装特定版本的 ClawHub。
- `skills install <slug> --force`：覆盖现有的工作区技能文件夹。
- `skills update <slug|--all>`：更新已跟踪的 ClawHub 技能。
- `skills list`：列出技能（不带子命令时的默认操作）。
- `skills list --json`：在 stdout 上输出机器可读的技能清单。
- `skills list --verbose`：在表格中包含缺失的依赖项。
- `skills info <name>`：显示一个技能的详细信息。
- `skills info <name> --json`：在 stdout 上输出机器可读的详细信息。
- `skills check`：就绪与缺失依赖项的摘要。
- `skills check --json`：在 stdout 上输出机器可读的就绪状态输出。

选项：

- `--eligible`：仅显示就绪的技能。
- `--json`：输出 JSON（无样式）。
- `-v`、`--verbose`：包含缺失依赖项的详细信息。

提示：对于基于 ClawHub 的技能，请使用 `openclaw skills search`、`openclaw skills install` 和 `openclaw skills update`。

### `pairing`

跨渠道批准私信配对请求。

子命令：

- `pairing list [channel] [--channel <channel>] [--account <id>] [--json]`
- `pairing approve <channel> <code> [--account <id>] [--notify]`
- `pairing approve --channel <channel> [--account <id>] <code> [--notify]`

备注：

- 如果仅配置了一个支持配对的渠道，则 `pairing approve <code>` 也是允许的。
- `list` 和 `approve` 都支持 `--account <id>` 以用于多账号渠道。

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

备注：

- 当直接配对作用域不可用时，`devices list` 和 `devices approve` 可以回退到 local loopback 上的本地配对文件。
- 当未传递 `requestId` 或设置了 `--latest` 时，`devices approve` 会自动选择最新的待处理请求。
- 存储令牌重连会重用令牌缓存的作用域；显式的 `devices rotate --scope ...` 会更新该存储的作用域集，以供将来的缓存令牌重连使用。
- `devices rotate` 和 `devices revoke` 返回 JSON 有效载荷。

### `qr`

根据当前的 Gateway 配置生成移动配对 QR 码和设置代码。参见 [`openclaw qr`](/en/cli/qr)。

选项：

- `--remote`
- `--url <url>`
- `--public-url <url>`
- `--token <token>`
- `--password <password>`
- `--setup-code-only`
- `--no-ascii`
- `--json`

注意：

- `--token` 和 `--password` 互斥。
- 设置代码携带的是短期引导令牌，而不是共享的网关令牌/密码。
- 内置引导交接将主节点令牌保留在 `scopes: []`。
- 任何交接的操作员引导令牌都受限于 `operator.approvals`、`operator.read`、`operator.talk.secrets` 和 `operator.write`。
- 引导作用域检查带有角色前缀，因此操作员允许列表仅满足操作员请求；非操作员角色仍需要在其自己的角色前缀下拥有作用域。
- `--remote` 可以使用 `gateway.remote.url` 或活动的 Tailscale Serve/Funnel URL。
- 扫描后，使用 `openclaw devices list` / `openclaw devices approve <requestId>` 批准请求。

### `clawbot`

旧版别名命名空间。目前支持 `openclaw clawbot qr`，它映射到 [`openclaw qr`](/en/cli/qr)。

### `hooks`

管理内部代理钩子。

子命令：

- `hooks list`
- `hooks info <name>`
- `hooks check`
- `hooks enable <name>`
- `hooks disable <name>`
- `hooks install <path-or-spec>` (`openclaw plugins install` 的已弃用别名)
- `hooks update [id]` (`openclaw plugins update` 的已弃用别名)

常用选项：

- `--json`
- `--eligible`
- `-v`, `--verbose`

注：

- 插件管理的钩子无法通过 `openclaw hooks` 启用或禁用；请改为启用或禁用拥有该钩子的插件。
- `hooks install` 和 `hooks update` 仍可作为兼容性别名使用，但它们会打印弃用警告并转发到插件命令。

### `webhooks`

Webhook 辅助工具。当前的内置界面包括 Gmail Pub/Sub 设置 + 运行器：

- `webhooks gmail setup`
- `webhooks gmail run`

### `webhooks gmail`

Gmail Pub/Sub 钩子设置 + 运行器。请参阅 [Gmail Pub/Sub](/en/automation/cron-jobs#gmail-pubsub-integration)。

子命令：

- `webhooks gmail setup` (需要 `--account <email>`；支持 `--project`, `--topic`, `--subscription`, `--label`, `--hook-url`, `--hook-token`, `--push-token`, `--bind`, `--port`, `--path`, `--include-body`, `--max-bytes`, `--renew-minutes`, `--tailscale`, `--tailscale-path`, `--tailscale-target`, `--push-endpoint`, `--json`)
- `webhooks gmail run` (相同标志的运行时覆盖)

注：

- `setup` 配置 Gmail 监视以及面向 OpenClaw 的推送路径。
- `run` 启动本地 Gmail 监视器/续订循环，并带有可选的运行时覆盖。

### `dns`

广域发现 DNS 助手（CoreDNS + Tailscale）。当前内置表面：

- `dns setup [--domain <domain>] [--apply]`

### `dns setup`

广域发现 DNS 助手（CoreDNS + Tailscale）。参见 [/gateway/discovery](/en/gateway/discovery)。

选项：

- `--domain <domain>`
- `--apply`：安装/更新 CoreDNS 配置（需要 sudo；仅限 macOS）。

注意：

- 如果没有 `--apply`，这是一个规划助手，可打印推荐的 OpenClaw + Tailscale DNS 配置。
- `--apply` 目前仅支持带有 Homebrew CoreDNS 的 macOS。

## 消息传递 + 代理

### `message`

统一出站消息传递 + 渠道操作。

参见：[/cli/message](/en/cli/message)

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

通过 Gateway(网关)（或嵌入式 `--local`）运行一次代理轮次。

至少传递一个会话选择器：`--to`、`--session-id` 或 `--agent`。

必填：

- `-m, --message <text>`

选项：

- `-t, --to <dest>`（用于会话密钥和可选投递）
- `--session-id <id>`
- `--agent <id>`（代理 ID；覆盖路由绑定）
- `--thinking <off|minimal|low|medium|high|xhigh>`（提供商支持情况各异；在 CLI 级别不受模型限制）
- `--verbose <on|off>`
- `--channel <channel>`（投递渠道；省略以使用主会话渠道）
- `--reply-to <target>`（投递目标覆盖，与会话路由分开）
- `--reply-channel <channel>`（投递渠道覆盖）
- `--reply-account <id>`（覆盖交付账号 ID）
- `--local`（嵌入式运行；插件注册表仍会先预加载）
- `--deliver`
- `--json`
- `--timeout <seconds>`

备注：

- 当 Gateway(网关) 请求失败时，Gateway(网关) 模式会回退到嵌入式代理。
- `--local` 仍然会预加载插件注册表，因此在嵌入式运行期间，插件提供的提供者、工具和渠道仍然可用。
- `--channel`、`--reply-channel` 和 `--reply-account` 影响回复交付，而不影响路由。

### `agents`

管理隔离的代理（工作区 + 身份验证 + 路由）。

运行不带子命令的 `openclaw agents` 等同于 `openclaw agents list`。

#### `agents list`

列出已配置的代理。

选项：

- `--json`
- `--bindings`

#### `agents add [name]`

添加一个新的隔离代理。除非传递了标志（或 `--non-interactive`），否则将运行引导向导；在非交互模式下，`--workspace` 是必需的。

选项：

- `--workspace <dir>`
- `--model <id>`
- `--agent-dir <dir>`
- `--bind <channel[:accountId]>`（可重复）
- `--non-interactive`
- `--json`

绑定规范使用 `channel[:accountId]`。当省略 `accountId` 时，OpenClaw 可能会通过渠道默认值/插件钩子解析账号范围；否则这是没有明确账号范围的渠道绑定。
传递任何显式的添加标志会将命令切换到非交互路径。`main` 已被保留，不能用作新代理 ID。

#### `agents bindings`

列出路由绑定。

选项：

- `--agent <id>`
- `--json`

#### `agents bind`

为代理添加路由绑定。

选项：

- `--agent <id>`（默认为当前默认代理）
- `--bind <channel[:accountId]>`（可重复）
- `--json`

#### `agents unbind`

移除代理的路由绑定。

选项：

- `--agent <id>`（默认为当前默认代理）
- `--bind <channel[:accountId]>`（可重复）
- `--all`
- `--json`

请使用 `--all` 或 `--bind` 之一，不要同时使用两者。

#### `agents delete <id>`

删除代理并清理其工作区和状态。

选项：

- `--force`
- `--json`

注意：

- `main` 无法被删除。
- 如果没有 `--force`，则需要进行交互式确认。

#### `agents set-identity`

更新代理身份（名称/主题/表情符号/头像）。

选项：

- `--agent <id>`
- `--workspace <dir>`
- `--identity-file <path>`
- `--from-identity`
- `--name <name>`
- `--theme <theme>`
- `--emoji <emoji>`
- `--avatar <value>`
- `--json`

注意：

- 可以使用 `--agent` 或 `--workspace` 来选择目标代理。
- 当未提供显式的身份字段时，该命令将读取 `IDENTITY.md`。

### `acp`

运行连接 IDE 到 Gateway(网关) 的 ACP 桥接器。

根选项：

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

用于桥接器调试的交互式 ACP 客户端。

选项：

- `--cwd <dir>`
- `--server <command>`
- `--server-args <args...>`
- `--server-verbose`
- `--verbose`

有关完整行为、安全说明和示例，请参阅 [`acp`](/en/cli/acp)。

### `mcp`

管理已保存的 MCP 服务器定义并通过 MCP stdio 暴露 OpenClaw 渠道。

#### `mcp serve`

通过 MCP stdio 暴露路由的 OpenClaw 渠道会话。

选项：

- `--url <url>`
- `--token <token>`
- `--token-file <path>`
- `--password <password>`
- `--password-file <path>`
- `--claude-channel-mode <auto|on|off>`
- `--verbose`

#### `mcp list`

列出已保存的 MCP 服务器定义。

选项：

- `--json`

#### `mcp show [name]`

显示一个已保存的 MCP 服务器定义或完整的已保存 MCP 服务器对象。

选项：

- `--json`

#### `mcp set <name> <value>`

从 JSON 对象保存一个 MCP 服务器定义。

#### `mcp unset <name>`

移除一个已保存的 MCP 服务器定义。

### `approvals`

管理执行审批。别名：`exec-approvals`。

#### `approvals get`

获取执行审批快照和有效策略。

选项：

- `--node <node>`
- `--gateway`
- `--json`
- 来自 `openclaw nodes` 的节点 RPC 选项

#### `approvals set`

使用来自文件或 stdin 的 JSON 替换执行审批。

选项：

- `--node <node>`
- `--gateway`
- `--file <path>`
- `--stdin`
- `--json`
- 来自 `openclaw nodes` 的节点 RPC 选项

#### `approvals allowlist add|remove`

编辑每个代理的执行允许列表。

选项：

- `--node <node>`
- `--gateway`
- `--agent <id>`（默认为 `*`）
- `--json`
- 来自 `openclaw nodes` 的节点 RPC 选项

### `status`

显示已链接会话的健康状况和最近的接收者。

选项：

- `--json`
- `--all`（完整诊断；只读，可粘贴）
- `--deep`（向网关请求实时健康探测，并在支持时包含渠道探测）
- `--usage`（显示模型提供商使用量/配额）
- `--timeout <ms>`
- `--verbose`
- `--debug`（`--verbose` 的别名）

注意：

- 概览包含 Gateway(网关) + 节点主机服务状态（如果可用）。
- `--usage` 将标准化的提供商使用窗口打印为 `X% left`。

### 使用量跟踪

当有 OAuth/API 凭据可用时，OpenClaw 可以显示提供商使用量/配额。

展示界面：

- `/status`（在可用时添加简短的提供商使用量行）
- `openclaw status --usage`（打印完整的提供商细分）
- macOS 菜单栏（上下文下的使用量部分）

注意：

- 数据直接来自提供商使用量端点（无估算）。
- 可读输出在各提供商之间标准化为 `X% left`。
- 具有当前使用量窗口的提供商：Anthropic、GitHub Copilot、Gemini CLI、OpenAI Codex、MiniMax、Xiaomi 和 z.ai。
- MiniMax 说明：原始 `usage_percent` / `usagePercent` 表示剩余配额，因此 OpenClaw 在显示前将其反转；当存在基于计数的字段时，它们优先。`model_remains` 响应优先选择聊天模型条目，在需要时从时间戳派生窗口标签，并在计划标签中包含模型名称。
- 使用量认证在可用时来自提供商特定的钩子；否则 OpenClaw 回退到从身份配置文件、环境或配置中匹配 OAuth/API 密钥凭据。如果未解析任何凭据，则隐藏使用量。
- 详细信息：请参阅 [使用量跟踪](/en/concepts/usage-tracking)。

### `health`

从运行中的 Gateway(网关) 获取健康状况。

选项：

- `--json`
- `--timeout <ms>`
- `--verbose`（强制进行实时探测并打印网关连接详细信息）
- `--debug`（`--verbose` 的别名）

注意：

- 默认 `health` 可以返回新的缓存网关快照。
- `health --verbose` 强制进行实时探测，并在所有配置的帐户和代理上扩展可读输出。

### `sessions`

列出存储的对话会话。

选项：

- `--json`
- `--verbose`
- `--store <path>`
- `--active <minutes>`
- `--agent <id>`（按代理过滤会话）
- `--all-agents`（显示所有代理的会话）

子命令：

- `sessions cleanup` — 移除过期或孤立的会话

注意：

- `sessions cleanup` 还支持 `--fix-missing` 以清除转录文件已丢失的条目。

## 重置 / 卸载

### `reset`

重置本地配置/状态（保留 CLI 已安装）。

选项：

- `--scope <config|config+creds+sessions|full>`
- `--yes`
- `--non-interactive`
- `--dry-run`

注意：

- `--non-interactive` 需要 `--scope` 和 `--yes`。

### `uninstall`

卸载网关服务和本地数据（CLI 保留）。

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

- `--non-interactive` 需要 `--yes` 和显式范围（或 `--all`）。
- `--all` 会同时移除服务、状态、工作区和应用。

### `tasks`

列出和管理跨代理的[后台任务](/en/automation/tasks)运行。

- `tasks list` — 显示活动和近期任务运行
- `tasks show <id>` — 显示特定任务运行的详细信息
- `tasks notify <id>` — 更改任务运行的通知策略
- `tasks cancel <id>` — 取消正在运行的任务
- `tasks audit` — 显示操作问题（陈旧、丢失、传递失败）
- `tasks maintenance [--apply] [--json]` — 预览或应用任务以及 TaskFlow 清理/协调（ACP/subagent 子会话、活动的 cron 作业、活动的 CLI 运行）
- `tasks flow list` — 列出活动和近期的 Task Flow 流程
- `tasks flow show <lookup>` — 通过 ID 或查找键检查流程
- `tasks flow cancel <lookup>` — 取消正在运行的流程及其活动任务

### `flows`

旧版文档快捷方式。Flow 命令位于 `openclaw tasks flow` 下：

- `tasks flow list [--json]`
- `tasks flow show <lookup>`
- `tasks flow cancel <lookup>`

## Gateway

### `gateway`

运行 WebSocket Gateway。

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
- `--reset`（重置开发配置 + 凭证 + 会话 + 工作区）
- `--force`（终止端口上现有的监听器）
- `--verbose`
- `--ws-log <auto|full|compact>`
- `--compact`（`--ws-log compact` 的别名）
- `--raw-stream`
- `--raw-stream-path <path>`

### `gateway service`

管理 Gateway 服务（launchd/systemd/schtasks）。

子命令：

- `gateway status`（默认探测 Gateway RPC）
- `gateway install`（服务安装）
- `gateway uninstall`
- `gateway start`
- `gateway stop`
- `gateway restart`

注意：

- `gateway status` 默认使用服务解析的端口/配置探测 Gateway RPC（可用 `--url/--token/--password` 覆盖）。
- `gateway status` 支持 `--no-probe`、`--deep`、`--require-rpc` 和 `--json` 用于脚本编写。
- 当能够检测到遗留或额外的 Gateway 服务时，`gateway status` 也会显示它们（`--deep` 会增加系统级扫描）。以 Profile 命名的 OpenClaw 服务被视为一等服务，不会被标记为“额外”。
- 即使本地 CLI 配置缺失或无效，`gateway status` 仍可用于诊断。
- `gateway status` 会打印解析后的文件日志路径、CLI 与服务的配置路径/有效性快照以及解析后的探测目标 URL。
- 如果 Gateway 认证的 SecretRefs 在当前命令路径中未解析，仅当探测连接性/认证失败时，`gateway status --json` 才会报告 `rpc.authWarning`（探测成功时会抑制警告）。
- 在 Linux systemd 安装中，状态令牌漂移检查包括 `Environment=` 和 `EnvironmentFile=` 单元源。
- `gateway install|uninstall|start|stop|restart` 支持 `--json` 以便进行脚本编写（默认输出保持人类友好）。
- `gateway install` 默认使用 Node 运行时；**不建议**使用 bun（由于 WhatsApp/Telegram 的 bug）。
- `gateway install` 选项：`--port`、`--runtime`、`--token`、`--force`、`--json`。

### `daemon`

Gateway 服务管理命令的旧别名。请参阅 [/cli/daemon](/en/cli/daemon)。

子命令：

- `daemon status`
- `daemon install`
- `daemon uninstall`
- `daemon start`
- `daemon stop`
- `daemon restart`

常用选项：

- `status`：`--url`、`--token`、`--password`、`--timeout`、`--no-probe`、`--require-rpc`、`--deep`、`--json`
- `install`: `--port`, `--runtime <node|bun>`, `--token`, `--force`, `--json`
- `uninstall|start|stop|restart`: `--json`

### `logs`

通过 Gateway(网关) 跟踪 RPC 文件日志。

选项：

- `--limit <n>`: 要返回的日志行数上限
- `--max-bytes <n>`: 从日志文件读取的最大字节数
- `--follow`: 跟踪日志文件（tail -f 风格）
- `--interval <ms>`: 跟踪时的轮询间隔（毫秒）
- `--local-time`: 以本地时间显示时间戳
- `--json`: 输出行分隔的 JSON
- `--plain`: 禁用结构化格式
- `--no-color`: 禁用 ANSI 颜色
- `--url <url>`: 显式的 Gateway(网关) WebSocket URL
- `--token <token>`: Gateway(网关) 令牌
- `--timeout <ms>`: Gateway(网关) RPC 超时
- `--expect-final`: 需要时等待最终响应

示例：

```bash
openclaw logs --follow
openclaw logs --limit 200
openclaw logs --plain
openclaw logs --json
openclaw logs --no-color
```

说明：

- 如果您传递 `--url`，CLI 将不会自动应用配置或环境凭据。
- 本地环回配对失败会回退到已配置的本地日志文件；显式的 `--url` 目标则不会。

### `gateway <subcommand>`

Gateway(网关) CLI 辅助工具（对 RPC 子命令使用 `--url`、`--token`、`--password`、`--timeout`、`--expect-final`）。
当您传递 `--url` 时，CLI 不会自动应用配置或环境凭据。
明确包含 `--token` 或 `--password`。缺少明确的凭据将导致错误。

子命令：

- `gateway call <method> [--params <json>] [--url <url>] [--token <token>] [--password <password>] [--timeout <ms>] [--expect-final] [--json]`
- `gateway health`
- `gateway status`
- `gateway probe`
- `gateway discover`
- `gateway install|uninstall|start|stop|restart`
- `gateway run`

说明：

- `gateway status --deep` 添加系统级服务扫描。使用 `gateway probe`、`health --verbose` 或顶级 `status --deep` 以获取更深入的运行时探测详细信息。

常用 RPC：

- `config.schema.lookup`（使用浅层模式节点、匹配的提示元数据和直接子摘要检查一个配置子树）
- `config.get`（读取当前配置快照 + 哈希）
- `config.set`（验证 + 写入完整配置；使用 `baseHash` 进行乐观并发控制）
- `config.apply`（验证 + 写入配置 + 重启 + 唤醒）
- `config.patch`（合并部分更新 + 重启 + 唤醒）
- `update.run`（运行更新 + 重启 + 唤醒）

提示：直接调用 `config.set`/`config.apply`/`config.patch` 时，如果配置已存在，请从 `config.get` 传递 `baseHash`。
提示：对于部分编辑，请先使用 `config.schema.lookup` 进行检查，并优先使用 `config.patch`。
提示：这些配置写入 RPC 会预先检查所提交配置负载中引用的活动 SecretRef 解析情况，并在有效活动提交的引用未解析时拒绝写入。
提示：仅限所有者的 `gateway` 运行时工具仍然拒绝重写 `tools.exec.ask` 或 `tools.exec.security`；旧的 `tools.bash.*` 别名会规范化为相同的受保护执行路径。

## 模型

有关回退行为和扫描策略，请参阅 [/concepts/models](/en/concepts/models)。

计费说明：对于 OpenClaw 中的 Anthropic，实际划分是 **API 密钥** 或 **带有额外使用量的 Claude 订阅**。Anthropic 在 **2026 年 4 月 4 日太平洋时间下午 12:00 / 英国夏令时晚上 8:00** 通知 OpenClaw 用户，**OpenClaw** Claude 登录路径被视为第三方工具使用，并且需要从订阅中单独计费的 **额外使用量**。我们的本地复现也显示，OpenClaw 识别提示字符串不会在 Anthropic SDK + API 密钥路径上复现。对于生产环境，首选 Anthropic API 密钥或其他支持的订阅式提供商，例如 OpenAI Codex、阿里云 Model Studio 编码计划、MiniMax 编码计划或 Z.AI / GLM 编码计划。

Anthropic 设置令牌 再次作为旧版/手动身份验证路径可用。请仅在预期 Anthropic 告知 OpenClaw 用户 OpenClaw 管理的 Anthropic 订阅路径需要 **额外使用量** 的情况下使用它。

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
- `--check`（退出代码 1=已过期/缺失，2=即将过期）
- `--probe`（实时探测已配置的身份验证配置文件）
- `--probe-provider <name>`
- `--probe-profile <id>`（重复或逗号分隔）
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`
- `--agent <id>`

始终包含身份验证概要和身份验证存储中配置文件的 OAuth 过期状态。
`--probe` 运行实时请求（可能会消耗令牌并触发速率限制）。
探测行可以来自身份验证配置文件、环境凭据或 `models.json`。
预期探测状态包括 `ok`、`auth`、`rate_limit`、`billing`、`timeout`、
`format`、`unknown` 和 `no_model`。
当显式的 `auth.order.<provider>` 省略了存储的配置文件时，探测会报告
`excluded_by_auth_order`，而不是静默尝试该配置文件。

### `models set <model>`

设置 `agents.defaults.model.primary`。

### `models set-image <model>`

设置 `agents.defaults.imageModel.primary`。

### `models aliases list|add|remove`

选项：

- `list`：`--json`、`--plain`
- `add <alias> <model>`
- `remove <alias>`

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

### `models auth add|login|login-github-copilot|setup-token|paste-token`

选项：

- `add`: 交互式身份验证助手（提供商身份验证流程或令牌粘贴）
- `login`: `--provider <name>`、`--method <method>`、`--set-default`
- `login-github-copilot`: GitHub Copilot OAuth 登录流程（`--yes`）
- `setup-token`: `--provider <name>`、`--yes`
- `paste-token`: `--provider <name>`、`--profile-id <id>`、`--expires-in <duration>`

注：

- `setup-token` 和 `paste-token` 是针对暴露令牌身份验证方法的提供商的通用令牌命令。
- `setup-token` 需要交互式 TTY 并运行提供商的令牌身份验证方法。
- `paste-token` 提示输入令牌值，当省略 `--profile-id` 时，默认为身份验证配置文件 ID `<provider>:manual`。
- Anthropic `setup-token` / `paste-token` 再次作为传统/手动 OpenClaw 路径可用。Anthropic 告知 OpenClaw 用户，此路径需要在 Claude 账户上使用 **Extra Usage**。

### `models auth order get|set|clear`

选项：

- `get`: `--provider <name>`、`--agent <id>`、`--json`
- `set`: `--provider <name>`、`--agent <id>`、`<profileIds...>`
- `clear`: `--provider <name>`、`--agent <id>`

## 系统

### `system event`

将系统事件加入队列，并可选择触发心跳（Gateway(网关) RPC）。

必填：

- `--text <text>`

选项：

- `--mode <now|next-heartbeat>`
- `--json`
- `--url`、`--token`、`--timeout`、`--expect-final`

### `system heartbeat last|enable|disable`

心跳控制（Gateway(网关) RPC）。

选项：

- `--json`
- `--url`, `--token`, `--timeout`, `--expect-final`

### `system presence`

列出系统在场条目（Gateway(网关) RPC）。

选项：

- `--json`
- `--url`, `--token`, `--timeout`, `--expect-final`

## Cron

管理定时作业（Gateway(网关) RPC）。请参阅 [/automation/cron-jobs](/en/automation/cron-jobs)。

子命令：

- `cron status [--json]`
- `cron list [--all] [--json]`（默认为表格输出；使用 `--json` 获取原始输出）
- `cron add`（别名：`create`；需要 `--name` 以及 `--at` | `--every` | `--cron` 中的确切一个，以及 `--system-event` | `--message` 中的一个有效负载）
- `cron edit <id>`（修补字段）
- `cron rm <id>`（别名：`remove`、`delete`）
- `cron enable <id>`
- `cron disable <id>`
- `cron runs --id <id> [--limit <n>]`
- `cron run <id> [--due]`

所有 `cron` 命令都接受 `--url`、`--token`、`--timeout`、`--expect-final`。

`cron add|edit --model ...` 使用为该作业选择的允许模型。如果该模型不被允许，cron 会发出警告并回退到作业的代理/默认模型选择。配置的回退链仍然适用，但没有明确按作业回退列表的纯模型覆盖不再将代理主节点作为隐藏的额外重试目标追加。

## 节点主机

### `node`

`node` 运行**无头节点主机**或将其作为后台服务进行管理。请参阅 [`openclaw node`](/en/cli/node)。

子命令：

- `node run --host <gateway-host> --port 18789`
- `node status`
- `node install [--host <gateway-host>] [--port <port>] [--tls] [--tls-fingerprint <sha256>] [--node-id <id>] [--display-name <name>] [--runtime <node|bun>] [--force]`
- `node uninstall`
- `node stop`
- `node restart`

身份验证说明：

- `node` 从环境变量/配置解析网关身份验证（无 `--token`/`--password` 标志）：`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`，然后是 `gateway.auth.*`。在本地模式下，节点主机有意忽略 `gateway.remote.*`；在 `gateway.mode=remote` 中，`gateway.remote.*` 根据远程优先级规则参与。
- 节点主机身份验证解析仅遵循 `OPENCLAW_GATEWAY_*` 环境变量。

## 节点

`nodes` 与 Gateway（网关）通信并针对已配对的节点。请参阅 [/nodes](/en/nodes)。

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
- `nodes notify --node <id|name|ip> [--title <text>] [--body <text>] [--sound <name>] [--priority <passive|active|timeSensitive>] [--delivery <system|overlay|auto>] [--invoke-timeout <ms>]`（仅限 mac）

相机：

- `nodes camera list --node <id|name|ip>`
- `nodes camera snap --node <id|name|ip> [--facing front|back|both] [--device-id <id>] [--max-width <px>] [--quality <0-1>] [--delay-ms <ms>] [--invoke-timeout <ms>]`
- `nodes camera clip --node <id|name|ip> [--facing front|back] [--device-id <id>] [--duration <ms|10s|1m>] [--no-audio] [--invoke-timeout <ms>]`

Canvas + 屏幕截图：

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

浏览器控制 CLI（专用于 Chrome/Brave/Edge/Chromium）。请参阅 [`openclaw browser`](/en/cli/browser) 和 [浏览器工具](/en/tools/browser)。

常用选项：

- `--url`，`--token`，`--timeout`，`--expect-final`，`--json`
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
- `browser create-profile --name <name> [--color <hex>] [--cdp-url <url>] [--driver existing-session] [--user-data-dir <path>]`
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

## 语音通话

### `voicecall`

插件提供的语音通话工具。仅在安装并启用语音通话插件时显示。参见[`openclaw voicecall`](/en/cli/voicecall)。

常用命令：

- `voicecall call --to <phone> --message <text> [--mode notify|conversation]`
- `voicecall start --to <phone> [--message <text>] [--mode notify|conversation]`
- `voicecall continue --call-id <id> --message <text>`
- `voicecall speak --call-id <id> --message <text>`
- `voicecall end --call-id <id>`
- `voicecall status --call-id <id>`
- `voicecall tail [--file <path>] [--since <n>] [--poll <ms>]`
- `voicecall latency [--file <path>] [--last <n>]`
- `voicecall expose [--mode off|serve|funnel] [--path <path>] [--port <port>] [--serve-path <path>]`

## 文档搜索

### `docs`

搜索实时的 OpenClaw 文档索引。

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
- `--timeout-ms <ms>`（默认为 `agents.defaults.timeoutSeconds`）
- `--history-limit <n>`
