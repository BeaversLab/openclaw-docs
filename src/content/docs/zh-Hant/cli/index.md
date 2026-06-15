---
summary: "OpenClaw CLI 索引：指令列表、全域旗標以及各指令頁面的連結"
read_when:
  - Finding the right `openclaw` subcommand
  - Looking up global flags or output styling rules
title: "CLI 參考資料"
---

`openclaw` 是主要的 CLI 進入點。每個核心指令都有專屬的參考頁面，或是與其別名指令一起記錄；本索引列出了指令、全域旗標，以及適用於整個 CLI 的輸出樣式規則。

根據意圖使用設定指令：

- `openclaw setup` 會建立基礎設定和工作區，而無需走過完整的引導式入門流程。
- `openclaw onboard` 是針對 gateway、模型驗證、工作區、通道、技能和健康狀況的完整引導式首次執行路徑。
- `openclaw configure` 會變更現有設定的目標部分，例如模型驗證、gateway、通道、外掛程式或技能。
- `openclaw channels add` 會在基礎存在後設定通道帳戶；不加旗標執行以進行引導式通道設定，或加上通道特定旗標以供指令碼使用。

## 指令頁面

| 區域               | 指令                                                                                                                                                                                                                                                              |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 設定與入門         | [`crestodian`](/zh-Hant/cli/crestodian) · [`setup`](/zh-Hant/cli/setup) · [`onboard`](/zh-Hant/cli/onboard) · [`configure`](/zh-Hant/cli/configure) · [`config`](/zh-Hant/cli/config) · [`completion`](/zh-Hant/cli/completion) · [`doctor`](/zh-Hant/cli/doctor) · [`dashboard`](/zh-Hant/cli/dashboard) |
| 重設與解除安裝     | [`backup`](/zh-Hant/cli/backup) · [`reset`](/zh-Hant/cli/reset) · [`uninstall`](/zh-Hant/cli/uninstall) · [`update`](/zh-Hant/cli/update)                                                                                                                                             |
| 訊息與代理程式     | [`message`](/zh-Hant/cli/message) · [`agent`](/zh-Hant/cli/agent) · [`agents`](/zh-Hant/cli/agents) · [`acp`](/zh-Hant/cli/acp) · [`mcp`](/zh-Hant/cli/mcp)                                                                                                                                |
| 健康狀況與工作階段 | [`status`](/zh-Hant/cli/status) · [`health`](/zh-Hant/cli/health) · [`sessions`](/zh-Hant/cli/sessions)                                                                                                                                                                          |
| Gateway 與日誌     | [`gateway`](/zh-Hant/cli/gateway) · [`logs`](/zh-Hant/cli/logs) · [`system`](/zh-Hant/cli/system)                                                                                                                                                                                |
| 模型與推論         | [`models`](/zh-Hant/cli/models) · [`infer`](/zh-Hant/cli/infer) · `capability`（[`infer`](/zh-Hant/cli/infer) 的別名） · [`memory`](/zh-Hant/cli/memory) · [`commitments`](/zh-Hant/cli/commitments) · [`wiki`](/zh-Hant/cli/wiki)                                                              |
| 網路與節點         | [`directory`](/zh-Hant/cli/directory) · [`nodes`](/zh-Hant/cli/nodes) · [`devices`](/zh-Hant/cli/devices) · [`node`](/zh-Hant/cli/node)                                                                                                                                               |
| 執行時期與沙箱     | [`approvals`](/zh-Hant/cli/approvals) · `exec-policy` (see [`approvals`](/zh-Hant/cli/approvals)) · [`sandbox`](/zh-Hant/cli/sandbox) · [`tui`](/zh-Hant/cli/tui) · `chat`/`terminal` (aliases for [`tui --local`](/zh-Hant/cli/tui)) · [`browser`](/zh-Hant/cli/browser)                       |
| 自動化             | [`cron`](/zh-Hant/cli/cron) · [`tasks`](/zh-Hant/cli/tasks) · [`hooks`](/zh-Hant/cli/hooks) · [`webhooks`](/zh-Hant/cli/webhooks) · [`transcripts`](/zh-Hant/cli/transcripts)                                                                                                              |
| 探索與文件         | [`dns`](/zh-Hant/cli/dns) · [`docs`](/zh-Hant/cli/docs)                                                                                                                                                                                                                     |
| 配對與頻道         | [`pairing`](/zh-Hant/cli/pairing) · [`qr`](/zh-Hant/cli/qr) · [`channels`](/zh-Hant/cli/channels)                                                                                                                                                                                |
| 安全性和外掛程式   | [`security`](/zh-Hant/cli/security) · [`secrets`](/zh-Hant/cli/secrets) · [`skills`](/zh-Hant/cli/skills) · [`plugins`](/zh-Hant/cli/plugins) · [`proxy`](/zh-Hant/cli/proxy)                                                                                                              |
| 舊版別名           | [`daemon`](/zh-Hant/cli/daemon) (gateway service) · [`clawbot`](/zh-Hant/cli/clawbot) (namespace)                                                                                                                                                                           |
| 外掛程式（選用）   | [`path`](/zh-Hant/cli/path) · [`policy`](/zh-Hant/cli/policy) · [`voicecall`](/zh-Hant/cli/voicecall) · [`workboard`](/zh-Hant/cli/workboard) (若已安裝)                                                                                                                              |

## 全域旗標

| 旗標                    | 用途                                                         |
| ----------------------- | ------------------------------------------------------------ |
| `--dev`                 | 將狀態隔離在 `~/.openclaw-dev` 下並移動預設連接埠            |
| `--profile <name>`      | 將狀態隔離在 `~/.openclaw-<name>` 下                         |
| `--container <name>`    | 指定命名的容器以執行                                         |
| `--no-color`            | 停用 ANSI 顏色（也會遵守 `NO_COLOR=1`）                      |
| `--update`              | [`openclaw update`](/zh-Hant/cli/update) 的簡寫（僅限原始碼安裝） |
| `-V`、`--version`、`-v` | 列印版本並結束                                               |

## 輸出模式

- ANSI 顏色和進度指示器僅在 TTY 工作階段中呈現。
- OSC-8 超連結在支援的情況下會呈現為可點擊的連結；否則 CLI 會回退為純文字 URL。
- `--json`（以及支援的 `--plain`）會停用樣式以產生乾淨的輸出。
- 長時間執行的指令會顯示進度指示器（支援時為 OSC 9;4）。

調色盤來源依據：`src/terminal/palette.ts`。

## 指令樹

<Accordion title="完整指令樹">

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

外掛程式可以新增額外的頂層指令，例如
[`openclaw workboard`](/zh-Hant/cli/workboard) 或 `openclaw voicecall`。

</Accordion>

## 聊天斜線指令

聊天訊息支援 `/...` 指令。請參閱 [斜線指令](/zh-Hant/tools/slash-commands)。

重點：

- `/status` — 快速診斷。
- `/trace` — 會話範圍的外掛程式追蹤/除錯行。
- `/config` — 持久化的設定變更。
- `/debug` — 僅限執行時期的設定覆寫（記憶體中，而非磁碟；需要 `commands.debug: true`）。

## 使用量追蹤

當有 OAuth/API 憑證時，`openclaw status --usage` 和控制 UI 介面會顯示供應商的使用量/配額。資料直接來自供應商的使用量端點，並標準化為 `X% left`。目前提供使用量視窗的供應商包括：Anthropic、GitHub Copilot、Gemini CLI、OpenAI Codex、MiniMax、Xiaomi 和 z.ai。

詳情請參閱 [Usage tracking](/zh-Hant/concepts/usage-tracking)。

## 相關內容

- [Slash commands](/zh-Hant/tools/slash-commands)
- [Configuration](/zh-Hant/gateway/configuration)
- [Environment](/zh-Hant/help/environment)
