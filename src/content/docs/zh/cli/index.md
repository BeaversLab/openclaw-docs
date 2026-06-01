---
summary: "OpenClaw CLI 索引：命令列表、全局标志以及指向各命令页面的链接"
read_when:
  - Finding the right `openclaw` subcommand
  - Looking up global flags or output styling rules
title: "CLI 参考"
---

`openclaw` 是主要的 CLI 入口点。每个核心命令都有一个专门的参考页面，或者在它所别名的命令下进行记录；该索引列出了这些命令、全局标志以及适用于整个 CLI 的输出样式规则。

根据意图使用设置命令：

- `openclaw setup` 创建基准配置和工作区，而无需经历完整的引导式新手引导流程。
- `openclaw onboard` 是网关、模型身份验证、工作区、渠道、技能和健康检查的完整首次运行引导路径。
- `openclaw configure` 更改现有设置的特定部分，例如模型身份验证、网关、渠道、插件或技能。
- `openclaw channels add` 在基准存在后配置渠道账户；不带标志运行以进行引导式渠道设置，或使用特定于渠道的标志以用于脚本。

## 命令页面

| 区域                 | 命令                                                                                                                                                                                                                                                              |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 设置和新手引导       | [`crestodian`](/zh/cli/crestodian) · [`setup`](/zh/cli/setup) · [`onboard`](/zh/cli/onboard) · [`configure`](/zh/cli/configure) · [`config`](/zh/cli/config) · [`completion`](/zh/cli/completion) · [`doctor`](/zh/cli/doctor) · [`dashboard`](/zh/cli/dashboard) |
| 重置和卸载           | [`backup`](/zh/cli/backup) · [`reset`](/zh/cli/reset) · [`uninstall`](/zh/cli/uninstall) · [`update`](/zh/cli/update)                                                                                                                                             |
| 消息和代理           | [`message`](/zh/cli/message) · [`agent`](/zh/cli/agent) · [`agents`](/zh/cli/agents) · [`acp`](/zh/cli/acp) · [`mcp`](/zh/cli/mcp)                                                                                                                                |
| 健康检查和会话       | [`status`](/zh/cli/status) · [`health`](/zh/cli/health) · [`sessions`](/zh/cli/sessions)                                                                                                                                                                          |
| Gateway(网关) 和日志 | [`gateway`](/zh/cli/gateway) · [`logs`](/zh/cli/logs) · [`system`](/zh/cli/system)                                                                                                                                                                                |
| 模型和推理           | [`models`](/zh/cli/models) · [`infer`](/zh/cli/infer) · `capability`（[`infer`](/zh/cli/infer) 的别名） · [`memory`](/zh/cli/memory) · [`commitments`](/zh/cli/commitments) · [`wiki`](/zh/cli/wiki)                                                              |
| 网络和节点           | [`directory`](/zh/cli/directory) · [`nodes`](/zh/cli/nodes) · [`devices`](/zh/cli/devices) · [`node`](/zh/cli/node)                                                                                                                                               |
| 运行时和沙盒         | [`approvals`](/zh/cli/approvals) · `exec-policy`（参见 [`approvals`](/zh/cli/approvals)） · [`sandbox`](/zh/cli/sandbox) · [`tui`](/zh/cli/tui) · `chat`/`terminal`（[`tui --local`](/zh/cli/tui) 的别名） · [`browser`](/zh/cli/browser)                         |
| 自动化               | [`cron`](/zh/cli/cron) · [`tasks`](/zh/cli/tasks) · [`hooks`](/zh/cli/hooks) · [`webhooks`](/zh/cli/webhooks) · [`transcripts`](/zh/cli/transcripts)                                                                                                              |
| 设备发现和文档       | [`dns`](/zh/cli/dns) · [`docs`](/zh/cli/docs)                                                                                                                                                                                                                     |
| 配对和频道           | [`pairing`](/zh/cli/pairing) · [`qr`](/zh/cli/qr) · [`channels`](/zh/cli/channels)                                                                                                                                                                                |
| 安全性与插件         | [`security`](/zh/cli/security) · [`secrets`](/zh/cli/secrets) · [`skills`](/zh/cli/skills) · [`plugins`](/zh/cli/plugins) · [`proxy`](/zh/cli/proxy)                                                                                                              |
| 旧版别名             | [`daemon`](/zh/cli/daemon) (gateway service) · [`clawbot`](/zh/cli/clawbot) (namespace)                                                                                                                                                                           |
| 插件（可选）         | [`path`](/zh/cli/path) · [`policy`](/zh/cli/policy) · [`voicecall`](/zh/cli/voicecall) (if installed)                                                                                                                                                             |

## 全局标志

| 标志                    | 用途                                                       |
| ----------------------- | ---------------------------------------------------------- |
| `--dev`                 | 将状态隔离在 `~/.openclaw-dev` 下并移动默认端口            |
| `--profile <name>`      | 将状态隔离在 `~/.openclaw-<name>` 下                       |
| `--container <name>`    | 指定命名的容器以供执行                                     |
| `--no-color`            | 禁用 ANSI 颜色（同时也遵守 `NO_COLOR=1`）                  |
| `--update`              | [`openclaw update`](/zh/cli/update) 的简写（仅限源码安装） |
| `-V`、`--version`、`-v` | 打印版本并退出                                             |

## 输出模式

- ANSI 颜色和进度指示器仅在 TTY 会话中渲染。
- OSC-8 超链接在支持的地方渲染为可点击链接；否则 CLI
  会回退到纯文本 URL。
- `--json`（以及在支持的情况下的 `--plain`）会禁用样式以输出干净的文本。
- 长时间运行的命令会显示进度指示器（支持时使用 OSC 9;4）。

调色板的唯一真实来源：`src/terminal/palette.ts`。

## 命令树

<Accordion title="完整命令树">

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
  commitments
    list
    dismiss
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

插件可以添加额外的顶级命令（例如 `openclaw voicecall`）。

</Accordion>

## 聊天斜杠命令

聊天消息支持 `/...` 命令。请参阅 [斜杠命令](/zh/tools/slash-commands)。

亮点：

- `/status` — 快速诊断。
- `/trace` — 会话范围的插件跟踪/调试行。
- `/config` — 持久化的配置更改。
- `/debug` — 仅运行时的配置覆盖（内存中，而非磁盘；需要 `commands.debug: true`）。

## 使用情况跟踪

当可用 OAuth/API 凭据时，`openclaw status --usage`OAuthAPI 和 Control UI 会显示提供商的使用情况/配额。数据直接来自提供商的使用终端，并已标准化为 `X% left`AnthropicGitHubCLIOpenAIMiniMaxXiaomi。具有当前使用窗口的提供商包括：Anthropic、GitHub Copilot、Gemini CLI、OpenAI Codex、MiniMax、Xiaomi 和 z.ai。

有关详细信息，请参阅[使用跟踪](/zh/concepts/usage-tracking)。

## 相关

- [斜杠命令](/zh/tools/slash-commands)
- [配置](/zh/gateway/configuration)
- [环境](/zh/help/environment)
