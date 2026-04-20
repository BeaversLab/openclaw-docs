---
summary: "OpenClaw CLI 參考手冊，包含 `openclaw` 指令、子指令和選項"
read_when:
  - Adding or modifying CLI commands or options
  - Documenting new command surfaces
title: "CLI 參考手冊"
---

# CLI 參考

本頁面描述目前的 CLI 行為。如果指令有所變更，請更新此文件。

## 指令頁面

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
- [`infer`](/en/cli/infer)
- [`memory`](/en/cli/memory)
- [`wiki`](/en/cli/wiki)
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
- [`plugins`](/en/cli/plugins) (外掛程式指令)
- [`channels`](/en/cli/channels)
- [`security`](/en/cli/security)
- [`secrets`](/en/cli/secrets)
- [`skills`](/en/cli/skills)
- [`daemon`](/en/cli/daemon) (閘道服務指令的舊版別名)
- [`clawbot`](/en/cli/clawbot) (舊版別名命名空間)
- [`voicecall`](/en/cli/voicecall) (外掛程式；若已安裝)

## 全域旗標

- `--dev`: 在 `~/.openclaw-dev` 下隔離狀態並轉移預設連接埠。
- `--profile <name>`: 在 `~/.openclaw-<name>` 下隔離狀態。
- `--container <name>`: 指定已命名的容器以執行。
- `--no-color`: 停用 ANSI 顏色。
- `--update`: `openclaw update` 的簡寫 (僅限原始碼安裝)。
- `-V`、`--version`、`-v`：列印版本並退出。

## 輸出樣式

- ANSI 顏色和進度指示器僅在 TTY 會話中呈現。
- OSC-8 超連結在支援的終端機中會呈現為可點擊的連結；否則我們會退回至純文字 URL。
- `--json`（以及支援的 `--plain`）會停用樣式以提供乾淨的輸出。
- `--no-color` 會停用 ANSI 樣式；`NO_COLOR=1` 也會被納入考量。
- 長時間執行的指令會顯示進度指示器（若支援則使用 OSC 9;4）。

## 色彩盤

OpenClaw 針對 CLI 輸出使用龍蝦色彩盤。

- `accent` (#FF5A2D)：標題、標籤、主要強調。
- `accentBright` (#FF7A3D)：指令名稱、強調。
- `accentDim` (#D14A22)：次要強調文字。
- `info` (#FF8A5B)：資訊性數值。
- `success` (#2FBF71)：成功狀態。
- `warn` (#FFB020)：警告、後備方案、注意。
- `error` (#E23D2D)：錯誤、失敗。
- `muted` (#8B7F77)：淡化、詮釋資料。

色彩盤來源依據：`src/terminal/palette.ts`（「龍蝦色彩盤」）。

## 指令樹

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

注意：外掛程式可以新增額外的頂層指令（例如 `openclaw voicecall`）。

## 安全性

- `openclaw security audit` — 稽核組態 + 本地狀態，檢查常見的安全性陷阱。
- `openclaw security audit --deep` — 盡力而為的即時 Gateway 探測。
- `openclaw security audit --fix` — 收緊安全的預設值以及狀態/組態權限。

## 機密

### `secrets`

管理 SecretRefs 及相關的執行階段/組態衛生。

子指令：

- `secrets reload`
- `secrets audit`
- `secrets configure`
- `secrets apply --from <path>`

`secrets reload` 選項：

- `--url`、`--token`、`--timeout`、`--expect-final`、`--json`

`secrets audit` 選項：

- `--check`
- `--allow-exec`
- `--json`

`secrets configure` 選項：

- `--apply`
- `--yes`
- `--providers-only`
- `--skip-provider-setup`
- `--agent <id>`
- `--allow-exec`
- `--plan-out <path>`
- `--json`

`secrets apply --from <path>` 選項：

- `--dry-run`
- `--allow-exec`
- `--json`

備註：

- `reload` 是一個 Gateway RPC，並在解析失敗時保留最後已知良好的執行時快照。
- `audit --check` 在發現問題時傳回非零值；未解析的參照使用較高優先順序的非零結束代碼。
- 預設會跳過試執行檢查；請使用 `--allow-exec` 來選擇加入。

## 外掛程式

管理擴充功能及其設定：

- `openclaw plugins list` — 探索外掛程式（使用 `--json` 取得機器可讀輸出）。
- `openclaw plugins inspect <id>` — 顯示外掛程式的詳細資訊（`info` 是別名）。
- `openclaw plugins install <path|.tgz|npm-spec|plugin@marketplace>` — 安裝外掛程式（或將外掛程式路徑新增至 `plugins.load.paths`；使用 `--force` 覆寫現有的安裝目標）。
- `openclaw plugins marketplace list <marketplace>` — 在安裝前列出市集項目。
- `openclaw plugins enable <id>` / `disable <id>` — 切換 `plugins.entries.<id>.enabled`。
- `openclaw plugins doctor` — 回報外掛程式載入錯誤。

大多數外掛程式變更需要重新啟動閘道。請參閱 [/plugin](/en/tools/plugin)。

## 記憶體

對 `MEMORY.md` + `memory/*.md` 進行向量搜尋：

- `openclaw memory status` — 顯示索引統計資料；使用 `--deep` 進行向量 + 嵌入就緒檢查，或使用 `--fix` 修復過期的召回/提昇構件。
- `openclaw memory index` — 重新索引記憶體檔案。
- `openclaw memory search "<query>"` （或 `--query "<query>"`） — 對記憶體進行語意搜尋。
- `openclaw memory promote` — 排序短期回憶，並可選擇將頂部條目附加到 `MEMORY.md`。

## 沙箱

管理用於隔離代理程式執行的沙盒執行環境。請參閱 [/cli/sandbox](/en/cli/sandbox)。

子指令：

- `sandbox list [--browser] [--json]`
- `sandbox recreate [--all] [--session <key>] [--agent <id>] [--browser] [--force]`
- `sandbox explain [--session <key>] [--agent <id>] [--json]`

備註：

- `sandbox recreate` 會移除現有的運行時，以便下次使用時能根據目前的設定重新初始化它們。
- 對於 `ssh` 和 OpenShell `remote` 後端，recreate 會刪除所選範圍的標準遠端工作區。

## 聊天斜線指令

聊天訊息支援 `/...` 指令 (文字和原生)。請參閱 [/tools/slash-commands](/en/tools/slash-commands)。

重點：

- `/status` 用於快速診斷。
- `/trace` 用於工作階段範圍的外掛程式追蹤/除錯行。
- `/config` 用於持續性的設定變更。
- `/debug` 用於僅限執行時期的設定覆寫（在記憶體中，而非磁碟；需要 `commands.debug: true`）。

## 安裝 + 新手上路

### `completion`

產生 shell 自動補腳本，並選擇性地將其安裝至您的 shell 設定檔中。

選項：

- `-s, --shell <zsh|bash|powershell|fish>`
- `-i, --install`
- `--write-state`
- `-y, --yes`

備註：

- 若沒有 `--install` 或 `--write-state`，`completion` 會將腳本列印至標準輸出。
- `--install` 會將 `OpenClaw Completion` 區塊寫入您的 shell 設定檔，並將其指向 OpenClaw 狀態目錄下的快取腳本。

### `setup`

初始化設定 + 工作區。

選項：

- `--workspace <dir>`：代理程式工作區路徑（預設 `~/.openclaw/workspace`）。
- `--wizard`：執行新手上路。
- `--non-interactive`：執行新手上路而不提示。
- `--mode <local|remote>`：上線模式。
- `--remote-url <url>`：遠端 Gateway URL。
- `--remote-token <token>`：遠端 Gateway 權杖。

當存在任何新手上路旗標時，會自動執行新手上路（`--non-interactive`、`--mode`、`--remote-url`、`--remote-token`）。

### `onboard`

針對 gateway、工作區和技能的互動式新手上路。

選項：

- `--workspace <dir>`
- `--reset`（在新手上路前重設設定 + 憑證 + 會話）
- `--reset-scope <config|config+creds+sessions|full>`（預設 `config+creds+sessions`；使用 `full` 一併移除工作區）
- `--non-interactive`
- `--mode <local|remote>`
- `--flow <quickstart|advanced|manual>`（manual 是 advanced 的別名）
- `--auth-choice <choice>`，其中 `<choice>` 是以下之一：
  `chutes`, `deepseek-api-key`, `openai-codex`, `openai-api-key`,
  `openrouter-api-key`, `kilocode-api-key`, `litellm-api-key`, `ai-gateway-api-key`,
  `cloudflare-ai-gateway-api-key`, `moonshot-api-key`, `moonshot-api-key-cn`,
  `kimi-code-api-key`, `synthetic-api-key`, `venice-api-key`, `together-api-key`,
  `huggingface-api-key`, `apiKey`, `gemini-api-key`, `google-gemini-cli`, `zai-api-key`,
  `zai-coding-global`, `zai-coding-cn`, `zai-global`, `zai-cn`, `xiaomi-api-key`,
  `minimax-global-oauth`, `minimax-global-api`, `minimax-cn-oauth`, `minimax-cn-api`,
  `opencode-zen`, `opencode-go`, `github-copilot`, `copilot-proxy`, `xai-api-key`,
  `mistral-api-key`, `volcengine-api-key`, `byteplus-api-key`, `qianfan-api-key`,
  `qwen-standard-api-key-cn`, `qwen-standard-api-key`, `qwen-api-key-cn`, `qwen-api-key`,
  `modelstudio-standard-api-key-cn`, `modelstudio-standard-api-key`,
  `modelstudio-api-key-cn`, `modelstudio-api-key`, `custom-api-key`, `skip`
- Qwen 註記：`qwen-*` 是標準的認證選項系列。`modelstudio-*`
  id 僅作為舊版相容性別名被接受。
- `--secret-input-mode <plaintext|ref>` (預設為 `plaintext`；使用 `ref` 來儲存提供者預設環境變數參考，而非明文字串金鑰)
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
- `--custom-base-url <url>`（非互動；與 `--auth-choice custom-api-key` 搭配使用）
- `--custom-model-id <id>`（非互動；與 `--auth-choice custom-api-key` 搭配使用）
- `--custom-api-key <key>`（非互動；可選；與 `--auth-choice custom-api-key` 搭配使用；省略時回退至 `CUSTOM_API_KEY`）
- `--custom-provider-id <id>`（非互動；可選的自訂供應商 ID）
- `--custom-compatibility <openai|anthropic>`（非互動；可選；預設為 `openai`）
- `--gateway-port <port>`
- `--gateway-bind <loopback|lan|tailnet|auto|custom>`
- `--gateway-auth <token|password>`
- `--gateway-token <token>`
- `--gateway-token-ref-env <name>`（非互動；將 `gateway.auth.token` 儲存為環境變數 SecretRef；要求設定該環境變數；不可與 `--gateway-token` 結合使用）
- `--gateway-password <password>`
- `--remote-url <url>`
- `--remote-token <token>`
- `--tailscale <off|serve|funnel>`
- `--tailscale-reset-on-exit`
- `--install-daemon`
- `--no-install-daemon`（別名：`--skip-daemon`）
- `--daemon-runtime <node|bun>`
- `--skip-channels`
- `--skip-skills`
- `--skip-search`
- `--skip-health`
- `--skip-ui`
- `--cloudflare-ai-gateway-account-id <id>`
- `--cloudflare-ai-gateway-gateway-id <id>`
- `--node-manager <npm|pnpm|bun>`（設定/入門 node manager for skills；推薦使用 pnpm，也支援 bun）
- `--json`

### `configure`

互動式配置精靈（模型、頻道、技能、閘道）。

選項：

- `--section <section>`（可重複；將精靈限制在特定區段）

### `config`

非互動式配置輔助工具 (get/set/unset/file/schema/validate)。在不帶子指令的情況下執行 `openclaw config` 會啟動精靈。

子指令：

- `config get <path>`：印出配置值（點號/括號路徑）。
- `config set`：支援四種指派模式：
  - 數值模式：`config set <path> <value>` (JSON5 或字串解析)
  - SecretRef 建構器模式：`config set <path> --ref-provider <provider> --ref-source <source> --ref-id <id>`
  - 提供者建構器模式：`config set secrets.providers.<alias> --provider-source <env|file|exec> ...`
  - 批次模式：`config set --batch-json '<json>'` 或 `config set --batch-file <path>`
- `config set --dry-run`：在不寫入 `openclaw.json` 的情況下驗證指派（預設會跳過 exec SecretRef 檢查）。
- `config set --allow-exec --dry-run`：選擇啟用 exec SecretRef 試執行檢查（可能會執行提供者指令）。
- `config set --dry-run --json`：輸出機器可讀的試執行輸出（檢查 + 完整性訊號、操作、已檢查/略過的參照、錯誤）。
- `config set --strict-json`：要求路徑/數值輸入進行 JSON5 解析。`--json` 仍是在試執行輸出模式之外進行嚴格解析的舊版別名。
- `config unset <path>`：移除數值。
- `config file`：印出作用中的配置檔案路徑。
- `config schema`：印出 `openclaw.json` 的生成 JSON Schema，包括跨巢狀物件、萬用字元、陣列項目和組合分支傳播的欄位 `title` / `description` 文件詮釋資料，加上盡力而為的即時外掛/通道 Schema 詮釋資料。
- `config validate`：在不啟動閘道的情況下，根據 Schema 驗證目前的配置。
- `config validate --json`：輸出機器可讀的 JSON。

### `doctor`

健康狀態檢查 + 快速修正 (config + gateway + legacy services)。

選項：

- `--no-workspace-suggestions`：停用工作區記憶體提示。
- `--yes`：接受預設值而不提示 (headless)。
- `--non-interactive`：跳過提示；僅套用安全的遷移。
- `--deep`：掃描系統服務中額外的 gateway 安裝。
- `--repair`（別名：`--fix`）：嘗試自動修復檢測到的問題。
- `--force`：即使未嚴格需要也強制修復。
- `--generate-gateway-token`：產生新的 gateway auth token。

### `dashboard`

使用您目前的 token 開啟 Control UI。

選項：

- `--no-open`：列印 URL 但不啟動瀏覽器

備註：

- 對於由 SecretRef 管理的 gateway token，`dashboard` 會列印或開啟不含 token 的 URL，而不是在終端機輸出或瀏覽器啟動引數中暴露密鑰。

### `update`

更新已安裝的 CLI。

根選項：

- `--json`
- `--no-restart`
- `--dry-run`
- `--channel <stable|beta|dev>`
- `--tag <dist-tag|version|spec>`
- `--timeout <seconds>`
- `--yes`

子指令：

- `update status`
- `update wizard`

`update status` 選項：

- `--json`
- `--timeout <seconds>`

`update wizard` 選項：

- `--timeout <seconds>`

備註：

- `openclaw --update` 會重寫為 `openclaw update`。

### `backup`

建立並驗證 OpenClaw 狀態的本機備份檔案。

子指令：

- `backup create`
- `backup verify <archive>`

`backup create` 選項：

- `--output <path>`
- `--json`
- `--dry-run`
- `--verify`
- `--only-config`
- `--no-include-workspace`

`backup verify <archive>` 選項：

- `--json`

## 頻道輔助工具

### `channels`

管理聊天頻道帳號（WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (外掛程式)/Signal/iMessage/Microsoft Teams）。

子指令：

- `channels list`：顯示已設定的頻道與身分驗證設定檔。
- `channels status`：檢查閘道連線性和通道健康狀況（當閘道可達時，`--probe` 會針對每個帳戶即時執行探測/稽核檢查；如果無法連線，則會回退到僅配置的通道摘要。請使用 `openclaw health` 或 `openclaw status --deep` 進行更廣泛的閘道健康狀況探測）。
- 提示：當 `channels status` 偵測到常見的配置錯誤時，會列印包含建議修正措施的警告（然後指引您前往 `openclaw doctor`）。
- `channels logs`：顯示來自閘道日誌檔案的近期通道日誌。
- `channels add`：若未傳遞旗標，則使用精靈式設定；旗標會切換至非互動模式。
  - 當將非預設帳戶新增至仍使用單一帳戶頂層配置的通道時，OpenClaw 會在寫入新帳戶之前，將帳戶範圍的值提升至通道帳戶對應中。大多數通道使用 `accounts.default`；Matrix 則可以改為保留現有的相符命名/預設目標。
  - 非互動式 `channels add` 不會自動建立/升級綁定；僅限通道的綁定會繼續符合預設帳戶。
- `channels remove`：預設停用；傳遞 `--delete` 以無需提示即移除配置項目。
- `channels login`：互動式通道登入（僅限 WhatsApp Web）。
- `channels logout`：登出通道階段作業（若支援）。

通用選項：

- `--channel <name>`：`whatsapp|telegram|discord|googlechat|slack|mattermost|signal|imessage|msteams`
- `--account <id>`：通道帳戶 ID（預設 `default`）
- `--name <label>`：帳戶的顯示名稱

`channels login` 選項：

- `--channel <channel>`（預設 `whatsapp`；支援 `whatsapp`/`web`）
- `--account <id>`
- `--verbose`

`channels logout` 選項：

- `--channel <channel>`（預設 `whatsapp`）
- `--account <id>`

`channels list` 選項：

- `--no-usage`：跳過模型提供者使用量/配額快照（僅限 OAuth/API 支援）。
- `--json`：輸出 JSON（除非設定了 `--no-usage`，否則包含使用方式）。

`channels status` 選項：

- `--probe`
- `--timeout <ms>`
- `--json`

`channels capabilities` 選項：

- `--channel <name>`
- `--account <id>`（僅限搭配 `--channel`）
- `--target <dest>`
- `--timeout <ms>`
- `--json`

`channels resolve` 選項：

- `<entries...>`
- `--channel <name>`
- `--account <id>`
- `--kind <auto|user|group>`
- `--json`

`channels logs` 選項：

- `--channel <name|all>`（預設 `all`）
- `--lines <n>`（預設 `200`）
- `--json`

備註：

- `channels login` 支援 `--verbose`。
- `channels capabilities --account` 僅在設定 `--channel` 時套用。
- `channels status --probe` 可以顯示傳輸狀態加上探測/稽核結果，例如 `works`、`probe failed`、`audit ok` 或 `audit failed`，視通道支援而定。

更多詳情：[/concepts/oauth](/en/concepts/oauth)

範例：

```bash
openclaw channels add --channel telegram --account alerts --name "Alerts Bot" --token $TELEGRAM_BOT_TOKEN
openclaw channels add --channel discord --account work --name "Work Bot" --token $DISCORD_BOT_TOKEN
openclaw channels remove --channel discord --account work --delete
openclaw channels status --probe
openclaw status --deep
```

### `directory`

查找公開目錄介面之通道的自己、同儕和群組 ID。請參閱 [`openclaw directory`](/en/cli/directory)。

通用選項：

- `--channel <name>`
- `--account <id>`
- `--json`

子指令：

- `directory self`
- `directory peers list [--query <text>] [--limit <n>]`
- `directory groups list [--query <text>] [--limit <n>]`
- `directory groups members --group-id <id> [--limit <n>]`

### `skills`

列出並檢查可用技能以及準備就緒資訊。

子指令：

- `skills search [query...]`：搜尋 ClawHub 技能。
- `skills search --limit <n> --json`：限制搜尋結果或輸出機器可讀格式。
- `skills install <slug>`：將技能從 ClawHub 安裝到現用的工作區。
- `skills install <slug> --version <version>`：安裝特定的 ClawHub 版本。
- `skills install <slug> --force`：覆寫現有的工作區技能資料夾。
- `skills update <slug|--all>`：更新追蹤的 ClawHub 技能。
- `skills list`：列出技能（未指定子指令時為預設值）。
- `skills list --json`：在標準輸出輸出機器可讀的技能清單。
- `skills list --verbose`：在表格中包含缺少的需求。
- `skills info <name>`：顯示單一技能的詳細資料。
- `skills info <name> --json`：在標準輸出輸出機器可讀的詳細資料。
- `skills check`：準備就緒與缺少需求的摘要。
- `skills check --json`：在標準輸出輸出機器可讀的就緒狀態。

選項：

- `--eligible`：僅顯示準備就緒的技能。
- `--json`：輸出 JSON（無樣式）。
- `-v`、`--verbose`：包含缺少的需求詳細資料。

提示：對於 ClawHub 支援的技能，請使用 `openclaw skills search`、`openclaw skills install` 和 `openclaw skills update`。

### `pairing`

跨管道核准 DM 配對請求。

子指令：

- `pairing list [channel] [--channel <channel>] [--account <id>] [--json]`
- `pairing approve <channel> <code> [--account <id>] [--notify]`
- `pairing approve --channel <channel> [--account <id>] <code> [--notify]`

註記：

- 如果僅設定了一個具備配對功能的管道，也允許使用 `pairing approve <code>`。
- `list` 和 `approve` 都支援多帳戶管道的 `--account <id>`。

### `devices`

管理閘道裝置配對項目及各角色的裝置權杖。

子指令：

- `devices list [--json]`
- `devices approve [requestId] [--latest]`
- `devices reject <requestId>`
- `devices remove <deviceId>`
- `devices clear --yes [--pending]`
- `devices rotate --device <id> --role <role> [--scope <scope...>]`
- `devices revoke --device <id> --role <role>`

註記：

- 當無法使用直接配對範圍時，`devices list` 和 `devices approve` 可以回退到本地回環上的本地配對檔案。
- `devices approve` 在鑄造令牌之前需要明確的請求 ID；省略 `requestId` 或傳遞 `--latest` 只會預覽最新的待處理請求。
- 使用已儲存令牌的重新連線會重複使用令牌的快取已核准範圍；明確的
  `devices rotate --scope ...` 會更新該儲存的範圍集，以供未來
  快取令牌重新連線使用。
- `devices rotate` 和 `devices revoke` 會回傳 JSON 載荷。

### `qr`

根據目前的 Gateway 配置生成行動裝置配對 QR 碼和設置代碼。請參閱 [`openclaw qr`](/en/cli/qr)。

選項：

- `--remote`
- `--url <url>`
- `--public-url <url>`
- `--token <token>`
- `--password <password>`
- `--setup-code-only`
- `--no-ascii`
- `--json`

備註：

- `--token` 和 `--password` 互斥。
- 設置代碼攜帶短期啟動令牌，而非共用 gateway 令牌/密碼。
- 內建啟動交接會將主要節點令牌保留在 `scopes: []`。
- 任何已交接的操作員啟動令牌都受限於 `operator.approvals`、`operator.read`、`operator.talk.secrets` 和 `operator.write`。
- 啟動範圍檢查會加上角色前綴，因此操作員允許清單僅滿足操作員請求；非操作員角色仍需要在其自身角色前綴下的範圍。
- `--remote` 可以使用 `gateway.remote.url` 或作用中的 Tailscale Serve/Funnel URL。
- 掃描後，使用 `openclaw devices list` / `openclaw devices approve <requestId>` 核准請求。

### `clawbot`

舊版別名命名空間。目前支援 `openclaw clawbot qr`，它會對應到 [`openclaw qr`](/en/cli/qr)。

### `hooks`

管理內部代理程式掛鉤。

子指令：

- `hooks list`
- `hooks info <name>`
- `hooks check`
- `hooks enable <name>`
- `hooks disable <name>`
- `hooks install <path-or-spec>`（已棄用的 `openclaw plugins install` 別名）
- `hooks update [id]`（已棄用的 `openclaw plugins update` 別名）

常見選項：

- `--json`
- `--eligible`
- `-v`、`--verbose`

備註：

- 外掛程式管理的掛鉤無法透過 `openclaw hooks` 啟用或停用；請改為啟用或停用擁有該掛鉤的外掛程式。
- `hooks install` 和 `hooks update` 仍可作為相容性別名使用，但它們會列印棄用警告並轉發至外掛程式指令。

### `webhooks`

Webhook 輔助工具。目前的內建介面為 Gmail Pub/Sub 設定 + 執行器：

- `webhooks gmail setup`
- `webhooks gmail run`

### `webhooks gmail`

Gmail Pub/Sub 掛鉤設定 + 執行器。請參閱 [Gmail Pub/Sub](/en/automation/cron-jobs#gmail-pubsub-integration)。

子指令：

- `webhooks gmail setup`（需要 `--account <email>`；支援 `--project`、`--topic`、`--subscription`、`--label`、`--hook-url`、`--hook-token`、`--push-token`、`--bind`、`--port`、`--path`、`--include-body`、`--max-bytes`、`--renew-minutes`、`--tailscale`、`--tailscale-path`、`--tailscale-target`、`--push-endpoint`、`--json`）
- `webhooks gmail run`（相同旗標的執行階段覆寫）

備註：

- `setup` 會設定 Gmail 監看以及 OpenClaw 面向的推送路徑。
- `run` 啟動本地 Gmail 監聽器/更新迴圈，並可選擇性地覆蓋執行時設定。

### `dns`

廣域網探索 DNS 輔助程式（CoreDNS + Tailscale）。目前的內建介面：

- `dns setup [--domain <domain>] [--apply]`

### `dns setup`

廣域網探索 DNS 輔助程式（CoreDNS + Tailscale）。請參閱 [/gateway/discovery](/en/gateway/discovery)。

選項：

- `--domain <domain>`
- `--apply`：安裝/更新 CoreDNS 設定（需要 sudo；僅限 macOS）。

備註：

- 若不使用 `--apply`，這是一個規劃輔助程式，會列印建議的 OpenClaw + Tailscale DNS 設定。
- `--apply` 目前僅支援搭配 Homebrew CoreDNS 的 macOS。

## 訊息傳遞 + 代理程式

### `message`

統一的出站訊息傳遞 + 頻道動作。

請參閱：[/cli/message](/en/cli/message)

子指令：

- `message send|poll|react|reactions|read|edit|delete|pin|unpin|pins|permissions|search|timeout|kick|ban`
- `message thread <create|list|reply>`
- `message emoji <list|upload>`
- `message sticker <send|upload>`
- `message role <info|add|remove>`
- `message channel <info|list>`
- `message member info`
- `message voice status`
- `message event <list|create>`

範例：

- `openclaw message send --target +15555550123 --message "Hi"`
- `openclaw message poll --channel discord --target channel:123 --poll-question "Snack?" --poll-option Pizza --poll-option Sushi`

### `agent`

透過 Gateway（或內嵌的 `--local`）執行一次代理程式回合。

請傳入至少一個 session 選擇器：`--to`、`--session-id` 或 `--agent`。

必要項目：

- `-m, --message <text>`

選項：

- `-t, --to <dest>`（用於 session 金鑰和選用傳遞）
- `--session-id <id>`
- `--agent <id>`（代理程式 ID；覆寫路由綁定）
- `--thinking <off|minimal|low|medium|high|xhigh>`（供應商支援各有不同；在 CLI 層級不受模型限制）
- `--verbose <on|off>`
- `--channel <channel>`（傳遞頻道；省略以使用主 session 頻道）
- `--reply-to <target>`（傳遞目標覆寫，與 session 路由分開）
- `--reply-channel <channel>`（傳遞頻道覆寫）
- `--reply-account <id>` (交付帳戶 ID 覆蓋)
- `--local` (嵌入式執行；外掛程式註冊表仍會預先載入)
- `--deliver`
- `--json`
- `--timeout <seconds>`

備註：

- 當 Gateway 要求失敗時，Gateway 模式會後退至嵌入式代理程式。
- `--local` 仍會預先載入外掛程式註冊表，因此外掛程式提供的提供者、工具和管道在嵌入式執行期間仍然可用。
- `--channel`、`--reply-channel` 和 `--reply-account` 影響回覆交付，而非路由。

### `agents`

管理隔離的代理程式 (工作區 + 驗證 + 路由)。

執行 `openclaw agents` 且不帶子指令等同於 `openclaw agents list`。

#### `agents list`

列出已設定的代理程式。

選項：

- `--json`
- `--bindings`

#### `agents add [name]`

新增新的隔離代理程式。除非傳遞旗標 (或 `--non-interactive`)，否則執行引導精靈；在非互動模式中，`--workspace` 是必需的。

選項：

- `--workspace <dir>`
- `--model <id>`
- `--agent-dir <dir>`
- `--bind <channel[:accountId]>` (可重複)
- `--non-interactive`
- `--json`

綁定規格使用 `channel[:accountId]`。當省略 `accountId` 時，OpenClaw 可能會透過管道預設值/外掛程式掛鈎來解析帳戶範圍；否則這是一個沒有明確帳戶範圍的管道綁定。
傳遞任何明確的新增旗標會將指令切換到非互動路徑。`main` 已被保留，無法用作新的代理程式 ID。

#### `agents bindings`

列出路由綁定。

選項：

- `--agent <id>`
- `--json`

#### `agents bind`

為代理程式新增路由綁定。

選項：

- `--agent <id>` (預設為目前的預設代理程式)
- `--bind <channel[:accountId]>` (可重複)
- `--json`

#### `agents unbind`

移除代理的路由綁定。

選項:

- `--agent <id>`（預設為目前的預設代理）
- `--bind <channel[:accountId]>`（可重複）
- `--all`
- `--json`

請使用 `--all` 或 `--bind`，不要同時使用兩者。

#### `agents delete <id>`

刪除代理並清除其工作區與狀態。

選項：

- `--force`
- `--json`

備註：

- `main` 無法刪除。
- 未指定 `--force` 時，需要進行互動式確認。

#### `agents set-identity`

更新代理身分（名稱/主題/表情符號/頭像）。

選項：

- `--agent <id>`
- `--workspace <dir>`
- `--identity-file <path>`
- `--from-identity`
- `--name <name>`
- `--theme <theme>`
- `--emoji <emoji>`
- `--avatar <value>`
- `--json`

備註：

- 可以使用 `--agent` 或 `--workspace` 來選取目標代理。
- 當未提供明確的身分欄位時，此指令會讀取 `IDENTITY.md`。

### `acp`

執行連接 IDE 與 Gateway 的 ACP 橋接器。

根選項：

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

用於橋接器除錯的互動式 ACP 用戶端。

選項：

- `--cwd <dir>`
- `--server <command>`
- `--server-args <args...>`
- `--server-verbose`
- `--verbose`

請參閱 [`acp`](/en/cli/acp) 以了解完整行為、安全性備註和範例。

### `mcp`

管理已儲存的 MCP 伺服器定義，並透過 MCP stdio 公開 OpenClaw 頻道。

#### `mcp serve`

透過 MCP stdio 公開路由傳送的 OpenClaw 頻道對話。

選項：

- `--url <url>`
- `--token <token>`
- `--token-file <path>`
- `--password <password>`
- `--password-file <path>`
- `--claude-channel-mode <auto|on|off>`
- `--verbose`

#### `mcp list`

列出已儲存的 MCP 伺服器定義。

選項：

- `--json`

#### `mcp show [name]`

顯示一個已儲存的 MCP 伺服器定義或完整的已儲存 MCP 伺服器物件。

選項：

- `--json`

#### `mcp set <name> <value>`

從 JSON 物件儲存一個 MCP 伺服器定義。

#### `mcp unset <name>`

移除一個已儲存的 MCP 伺服器定義。

### `approvals`

管理 exec 批准。別名：`exec-approvals`。

#### `approvals get`

取得 exec 批准快照和有效原則。

選項：

- `--node <node>`
- `--gateway`
- `--json`
- 來自 `openclaw nodes` 的節點 RPC 選項

#### `approvals set`

使用來自檔案或標準輸入的 JSON 取代 exec 批准。

選項：

- `--node <node>`
- `--gateway`
- `--file <path>`
- `--stdin`
- `--json`
- 來自 `openclaw nodes` 的節點 RPC 選項

#### `approvals allowlist add|remove`

編輯每個代理程式的 exec 允許清單。

選項：

- `--node <node>`
- `--gateway`
- `--agent <id>` (預設為 `*`)
- `--json`
- 來自 `openclaw nodes` 的節點 RPC 選項

### `status`

顯示連結的會話健康狀況和最近的收件者。

選項：

- `--json`
- `--all` (完整診斷；唯讀，可貼上)
- `--deep` (向 gateway 請求即時健康探測，若支援則包含通道探測)
- `--usage` (顯示模型提供者使用量/配額)
- `--timeout <ms>`
- `--verbose`
- `--debug` (`--verbose` 的別名)

備註：

- 概覽在可用時包含 Gateway + 節點主機服務狀態。
- `--usage` 會將標準化的提供者使用量視窗列印為 `X% left`。

### 使用量追蹤

當 OAuth/API 憑證可用時，OpenClaw 可顯示提供者使用量/配額。

顯示位置：

- `/status` (在可用時新增簡短的提供者使用量行)
- `openclaw status --usage` (列印完整的提供者細分)
- macOS 選單列 (Context 下的 Usage 區段)

備註：

- 資料直接來自提供者使用量端點 (非估計值)。
- 人類可讀的輸出在跨提供者時會標準化為 `X% left`。
- 目前提供使用量視窗的提供者：Anthropic、GitHub Copilot、Gemini CLI、OpenAI Codex、MiniMax、Xiaomi 和 z.ai。
- MiniMax 備註：原始的 `usage_percent` / `usagePercent` 代表剩餘配額，因此 OpenClaw 會在顯示前將其反轉；若存在計數型欄位仍優先採用。`model_remains` 回應偏好聊天模型條目，在需要時從時間戳記衍生視窗標籤，並在計畫標籤中包含模型名稱。
- 使用量驗證來自提供者特定掛鉤 (若可用)；否則 OpenClaw 會退而求其次，從 auth profiles、環境變數或設定中比對 OAuth/API 金鑰憑證。若皆無法解析，使用量將隱藏。
- 詳情請參閱 [使用量追蹤](/en/concepts/usage-tracking)。

### `health`

從執行中的 Gateway 擷取健康狀態。

選項：

- `--json`
- `--timeout <ms>`
- `--verbose` (強制進行即時探測並列印 gateway 連線詳細資訊)
- `--debug` (`--verbose` 的別名)

備註：

- 預設的 `health` 可傳回新的快取 gateway 快照。
- `health --verbose` 強制進行即時探測，並在所有設定的帳戶和代理程式中擴充可讀性輸出。

### `sessions`

列出已儲存的對談工作階段。

選項：

- `--json`
- `--verbose`
- `--store <path>`
- `--active <minutes>`
- `--agent <id>` (根據代理程式篩選工作階段)
- `--all-agents` (顯示所有代理程式的工作階段)

子指令：

- `sessions cleanup` — 移除過期或孤立的工作階段

備註：

- `sessions cleanup` 也支援 `--fix-missing` 以修剪其文字記錄檔案已刪除的項目。

## 重設 / 解除安裝

### `reset`

重設本機設定/狀態 (保留已安裝的 CLI)。

選項：

- `--scope <config|config+creds+sessions|full>`
- `--yes`
- `--non-interactive`
- `--dry-run`

備註：

- `--non-interactive` 需要 `--scope` 和 `--yes`。

### `uninstall`

解除安裝閘道服務 + 本機資料 (CLI 會保留)。

選項：

- `--service`
- `--state`
- `--workspace`
- `--app`
- `--all`
- `--yes`
- `--non-interactive`
- `--dry-run`

備註：

- `--non-interactive` 需要 `--yes` 和明確的範圍 (或 `--all`)。
- `--all` 會一併移除服務、狀態、工作區和應用程式。

### `tasks`

列出並管理各代理程式上的 [背景任務](/en/automation/tasks) 執行。

- `tasks list` — 顯示作用中和最近的任務執行
- `tasks show <id>` — 顯示特定任務執行的詳細資訊
- `tasks notify <id>` — 變更任務執行的通知原則
- `tasks cancel <id>` — 取消執行中的任務
- `tasks audit` — 顯示操作問題 (過期、遺失、傳遞失敗)
- `tasks maintenance [--apply] [--json]` — 預覽或執行任務以及 TaskFlow 清理/協調（ACP/子代理子工作階段、作用中的 cron 任務、執行中的 CLI 執行個體）
- `tasks flow list` — 列出作用中及最近的 Task Flow 流程
- `tasks flow show <lookup>` — 透過 ID 或查閱鍵檢查流程
- `tasks flow cancel <lookup>` — 取消執行中的流程及其作用中的任務

### `flows`

舊版文件捷徑。Flow 指令位於 `openclaw tasks flow` 之下：

- `tasks flow list [--json]`
- `tasks flow show <lookup>`
- `tasks flow cancel <lookup>`

## Gateway

### `gateway`

執行 WebSocket Gateway。

選項：

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
- `--reset` (重設開發設定 + 憑證 + 工作階段 + 工作區)
- `--force` (終止連接埠上現有的監聽器)
- `--verbose`
- `--cli-backend-logs`
- `--ws-log <auto|full|compact>`
- `--compact` (`--ws-log compact` 的別名)
- `--raw-stream`
- `--raw-stream-path <path>`

### `gateway service`

管理 Gateway 服務（launchd/systemd/schtasks）。

子指令：

- `gateway status` (預設探測 Gateway RPC)
- `gateway install` (安裝服務)
- `gateway uninstall`
- `gateway start`
- `gateway stop`
- `gateway restart`

備註：

- `gateway status` 預設會使用服務解析出的連接埠/設定來探測 Gateway RPC（可使用 `--url/--token/--password` 覆寫）。
- `gateway status` 支援 `--no-probe`、`--deep`、`--require-rpc` 和 `--json` 以用於腳本撰寫。
- 當 `gateway status` 偵測到時，也會顯示舊版或額外的閘道服務（`--deep` 增加了系統層級掃描）。以 Profile 命名的 OpenClaw 服務被視為一等公民，不會被標記為「額外」。
- 即使本機 CLI 設定檔遺失或無效，`gateway status` 仍可作為診斷用途使用。
- `gateway status` 會列印解析後的檔案日誌路徑、CLI 與服務的設定路徑/有效性快照，以及解析後的探測目標 URL。
- 如果在目前的指令路徑中，閘道驗證的 SecretRefs 無法解析，`gateway status --json` 僅在探測連線/驗證失敗時回報 `rpc.authWarning`（探測成功時會隱藏警告）。
- 在 Linux systemd 安裝中，狀態 token 漂移檢查包含 `Environment=` 和 `EnvironmentFile=` 單元來源。
- `gateway install|uninstall|start|stop|restart` 支援用於腳本編寫的 `--json`（預設輸出保持人們易讀的格式）。
- `gateway install` 預設為 Node 執行時期；**不建議**使用 bun（WhatsApp/Telegram 錯誤）。
- `gateway install` 選項：`--port`、`--runtime`、`--token`、`--force`、`--json`。

### `daemon`

閘道服務管理指令的舊版別名。請參閱 [/cli/daemon](/en/cli/daemon)。

子指令：

- `daemon status`
- `daemon install`
- `daemon uninstall`
- `daemon start`
- `daemon stop`
- `daemon restart`

通用選項：

- `status`：`--url`、`--token`、`--password`、`--timeout`、`--no-probe`、`--require-rpc`、`--deep`、`--json`
- `install`: `--port`, `--runtime <node|bun>`, `--token`, `--force`, `--json`
- `uninstall|start|stop|restart`: `--json`

### `logs`

透過 RPC 追蹤 Gateway 檔案記錄。

選項：

- `--limit <n>`: 傳回的最大記錄行數
- `--max-bytes <n>`: 從記錄檔讀取的最大位元組數
- `--follow`: 追蹤記錄檔（tail -f 風格）
- `--interval <ms>`: 追蹤時的輪詢間隔（毫秒）
- `--local-time`: 以本地時間顯示時間戳記
- `--json`: 發出以行分隔的 JSON
- `--plain`: 停用結構化格式
- `--no-color`: 停用 ANSI 顏色
- `--url <url>`: 明確指定 Gateway WebSocket URL
- `--token <token>`: Gateway 權杖
- `--timeout <ms>`: Gateway RPC 逾時
- `--expect-final`: 需要時等待最終回應

範例：

```bash
openclaw logs --follow
openclaw logs --limit 200
openclaw logs --plain
openclaw logs --json
openclaw logs --no-color
```

備註：

- 如果您傳遞 `--url`，CLI 將不會自動套用設定或環境認證資訊。
- 本地回環配對失敗會退回至已設定的本地記錄檔；明確的 `--url` 目標則不會。

### `gateway <subcommand>`

Gateway CLI 輔助工具（對於 RPC 子指令，請使用 `--url`、`--token`、`--password`、`--timeout`、`--expect-final`）。
當您傳遞 `--url` 時，CLI 將不會自動套用設定或環境認證資訊。
請明確包含 `--token` 或 `--password`。缺少明確的認證資訊將會導致錯誤。

子指令：

- `gateway call <method> [--params <json>] [--url <url>] [--token <token>] [--password <password>] [--timeout <ms>] [--expect-final] [--json]`
- `gateway health`
- `gateway status`
- `gateway probe`
- `gateway discover`
- `gateway install|uninstall|start|stop|restart`
- `gateway run`

備註：

- `gateway status --deep` 新增系統層級服務掃描。使用 `gateway probe`、
  `health --verbose` 或頂層 `status --deep` 以取得更深入的執行時期探測細節。

常見 RPC：

- `config.schema.lookup` （使用淺層 schema 節點、符合的提示元資料和直接子摘要來檢查一個配置子樹）
- `config.get` （讀取目前配置快照 + 雜湊值）
- `config.set` （驗證 + 寫入完整配置；使用 `baseHash` 進行樂觀併發控制）
- `config.apply` （驗證 + 寫入配置 + 重新啟動 + 喚醒）
- `config.patch` （合併部分更新 + 重新啟動 + 喚醒）
- `update.run` （執行更新 + 重新啟動 + 喚醒）

提示：當直接呼叫 `config.set`/`config.apply`/`config.patch` 時，如果配置已存在，請傳遞來自
`config.get` 的 `baseHash`。
提示：對於部分編輯，請先使用 `config.schema.lookup` 檢查並優先使用 `config.patch`。
提示：這些配置寫入 RPC 會對提交的配置負載中的參照進行預先有效的 SecretRef 解析，並在有效已提交的參照未解析時拒絕寫入。
提示：�限擁有者使用的 `gateway` 執行時期工具仍然拒絕覆寫 `tools.exec.ask` 或 `tools.exec.security`；舊版 `tools.bash.*` 別名會正規化為相同的受保護執行路徑。

## 模型

請參閱 [/concepts/models](/en/concepts/models) 以了解回退行為和掃描策略。

Anthropic 註記：Anthropic 人員告訴我們，OpenClaw 風格的 Claude CLI 使用再次
被允許，因此除非 Anthropic 發布新政策，否則 OpenClaw 將 Claude CLI 重用和 `claude -p` 使用視為
本整合的許可行為。對於
生產環境，建議使用 Anthropic API 金鑰或其他支援的
訂閱式提供者，例如 OpenAI Codex、阿里雲 Model Studio
Coding Plan、MiniMax Coding Plan 或 Z.AI / GLM Coding Plan。

Anthropic setup-token 仍為支援的 token-auth 路徑，但在可用時，OpenClaw 現在偏好 Claude CLI reuse 與 `claude -p`。

### `models` (root)

`openclaw models` 是 `models status` 的別名。

Root options:

- `--status-json` (`models status --json` 的別名)
- `--status-plain` (`models status --plain` 的別名)

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
- `--check` (exit 1=expired/missing, 2=expiring)
- `--probe` (live probe of configured auth profiles)
- `--probe-provider <name>`
- `--probe-profile <id>` (repeat or comma-separated)
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`
- `--agent <id>`

Always includes the auth overview and OAuth expiry status for profiles in the auth store.
`--probe` runs live requests (may consume tokens and trigger rate limits).
Probe rows can come from auth profiles, env credentials, or `models.json`.
Expect probe statuses like `ok`, `auth`, `rate_limit`, `billing`, `timeout`,
`format`, `unknown`, and `no_model`.
When an explicit `auth.order.<provider>` omits a stored profile, probe reports
`excluded_by_auth_order` instead of silently trying that profile.

### `models set <model>`

Set `agents.defaults.model.primary`.

### `models set-image <model>`

Set `agents.defaults.imageModel.primary`.

### `models aliases list|add|remove`

Options:

- `list`: `--json`、`--plain`
- `add <alias> <model>`
- `remove <alias>`

### `models fallbacks list|add|remove|clear`

選項：

- `list`: `--json`、`--plain`
- `add <model>`
- `remove <model>`
- `clear`

### `models image-fallbacks list|add|remove|clear`

選項：

- `list`: `--json`、`--plain`
- `add <model>`
- `remove <model>`
- `clear`

### `models scan`

選項：

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

選項：

- `add`: 互動式驗證輔助程式 (提供者驗證流程或貼上 Token)
- `login`: `--provider <name>`、`--method <method>`、`--set-default`
- `login-github-copilot`: GitHub Copilot OAuth 登入流程 (`--yes`)
- `setup-token`: `--provider <name>`、`--yes`
- `paste-token`: `--provider <name>`、`--profile-id <id>`、`--expires-in <duration>`

備註：

- `setup-token` 和 `paste-token` 是針對公開 Token 驗證方法之提供者的通用 Token 指令。
- `setup-token` 需要互動式 TTY 並執行提供者的 token-auth 方法。
- `paste-token` 會提示輸入 Token 值，當省略 `--profile-id` 時預設為驗證設定檔 ID `<provider>:manual`。
- Anthropic `setup-token` / `paste-token` 仍可作為支援的 OpenClaw token 路徑使用，但 OpenClaw 現在偏好在有時使用 Claude CLI 重複使用和 `claude -p`。

### `models auth order get|set|clear`

選項：

- `get`： `--provider <name>`、 `--agent <id>`、 `--json`
- `set`： `--provider <name>`、 `--agent <id>`、 `<profileIds...>`
- `clear`： `--provider <name>`、 `--agent <id>`

## 系統

### `system event`

將系統事件加入佇列並選擇性觸發心跳 (Gateway RPC)。

必要項目：

- `--text <text>`

選項：

- `--mode <now|next-heartbeat>`
- `--json`
- `--url`、 `--token`、 `--timeout`、 `--expect-final`

### `system heartbeat last|enable|disable`

心跳控制 (Gateway RPC)。

選項：

- `--json`
- `--url`、 `--token`、 `--timeout`、 `--expect-final`

### `system presence`

列出系統在線條目 (Gateway RPC)。

選項：

- `--json`
- `--url`、 `--token`、 `--timeout`、 `--expect-final`

## Cron

管理排程工作 (Gateway RPC)。請參閱 [/automation/cron-jobs](/en/automation/cron-jobs)。

子指令：

- `cron status [--json]`
- `cron list [--all] [--json]` (預設為表格輸出；使用 `--json` 取得原始內容)
- `cron add` (別名： `create`；需要 `--name` 以及 `--at` | `--every` | `--cron` 其中之一，以及 `--system-event` | `--message` 其中一個 payload)
- `cron edit <id>` (修補欄位)
- `cron rm <id>` (別名：`remove`、`delete`)
- `cron enable <id>`
- `cron disable <id>`
- `cron runs --id <id> [--limit <n>]`
- `cron run <id> [--due]`

所有 `cron` 指令都接受 `--url`、`--token`、`--timeout`、`--expect-final`。

`cron add|edit --model ...` 使用為該作業選取的允許模型。如果該模型不被允許，Cron 會發出警告並改為回退至作業的 agent/預設模型選擇。設定的回退鏈仍然適用，但沒有明確的每個作業回退清單的純模型覆寫，不再將 agent 主要作為隱藏的額外重試目標附加。

## 節點主機

### `node`

`node` 會執行**無頭節點主機**或將其作為背景服務進行管理。請參閱 [`openclaw node`](/en/cli/node)。

子指令：

- `node run --host <gateway-host> --port 18789`
- `node status`
- `node install [--host <gateway-host>] [--port <port>] [--tls] [--tls-fingerprint <sha256>] [--node-id <id>] [--display-name <name>] [--runtime <node|bun>] [--force]`
- `node uninstall`
- `node stop`
- `node restart`

驗證備註：

- `node` 從環境變數/設定解析 gateway 驗證（無 `--token`/`--password` 標誌）：`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`，然後是 `gateway.auth.*`。在本機模式下，節點主機會刻意忽略 `gateway.remote.*`；在 `gateway.mode=remote` 中，`gateway.remote.*` 則依遠端優先順序規則參與。
- 節點主機驗證解析僅採用 `OPENCLAW_GATEWAY_*` 環境變數。

## 節點

`nodes` 與 Gateway 通訊並以配對的節點為目標。請參閱 [/nodes](/en/nodes)。

通用選項：

- `--url`、`--token`、`--timeout`、`--json`

子指令：

- `nodes status [--connected] [--last-connected <duration>]`
- `nodes describe --node <id|name|ip>`
- `nodes list [--connected] [--last-connected <duration>]`
- `nodes pending`
- `nodes approve <requestId>`
- `nodes reject <requestId>`
- `nodes rename --node <id|name|ip> --name <displayName>`
- `nodes invoke --node <id|name|ip> --command <command> [--params <json>] [--invoke-timeout <ms>] [--idempotency-key <key>]`
- `nodes notify --node <id|name|ip> [--title <text>] [--body <text>] [--sound <name>] [--priority <passive|active|timeSensitive>] [--delivery <system|overlay|auto>] [--invoke-timeout <ms>]` (僅限 mac)

相機：

- `nodes camera list --node <id|name|ip>`
- `nodes camera snap --node <id|name|ip> [--facing front|back|both] [--device-id <id>] [--max-width <px>] [--quality <0-1>] [--delay-ms <ms>] [--invoke-timeout <ms>]`
- `nodes camera clip --node <id|name|ip> [--facing front|back] [--device-id <id>] [--duration <ms|10s|1m>] [--no-audio] [--invoke-timeout <ms>]`

畫布 + 螢幕：

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

## 瀏覽器

瀏覽器控制 CLI (專屬 Chrome/Brave/Edge/Chromium)。請參閱 [`openclaw browser`](/en/cli/browser) 和 [瀏覽器工具](/en/tools/browser)。

常用選項：

- `--url`、`--token`、`--timeout`、`--expect-final`、`--json`
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

檢查：

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

## 語音通話

### `voicecall`

外掛程式提供的語音通話公用程式。僅在安裝並啟用語音通話外掛程式時顯示。請參閱 [`openclaw voicecall`](/en/cli/voicecall)。

常用指令：

- `voicecall call --to <phone> --message <text> [--mode notify|conversation]`
- `voicecall start --to <phone> [--message <text>] [--mode notify|conversation]`
- `voicecall continue --call-id <id> --message <text>`
- `voicecall speak --call-id <id> --message <text>`
- `voicecall end --call-id <id>`
- `voicecall status --call-id <id>`
- `voicecall tail [--file <path>] [--since <n>] [--poll <ms>]`
- `voicecall latency [--file <path>] [--last <n>]`
- `voicecall expose [--mode off|serve|funnel] [--path <path>] [--port <port>] [--serve-path <path>]`

## 文件搜尋

### `docs`

搜尋即時 OpenClaw 文件索引。

### `docs [query...]`

搜尋即時文件索引。

## TUI

### `tui`

開啟連接到 Gateway 的終端機 UI。

選項：

- `--url <url>`
- `--token <token>`
- `--password <password>`
- `--session <key>`
- `--deliver`
- `--thinking <level>`
- `--message <text>`
- `--timeout-ms <ms>` (預設為 `agents.defaults.timeoutSeconds`)
- `--history-limit <n>`
