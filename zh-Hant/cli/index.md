---
summary: "OpenClaw CLI 參考文件，包含 `openclaw` 指令、子指令和選項"
read_when:
  - 新增或修改 CLI 指令或選項
  - 記錄新的指令介面
title: "CLI 參考"
---

# CLI 參考

本頁面說明目前的 CLI 行為。如果指令有所變更，請更新此文件。

## 指令頁面

- [`setup`](/zh-Hant/cli/setup)
- [`onboard`](/zh-Hant/cli/onboard)
- [`configure`](/zh-Hant/cli/configure)
- [`config`](/zh-Hant/cli/config)
- [`completion`](/zh-Hant/cli/completion)
- [`doctor`](/zh-Hant/cli/doctor)
- [`dashboard`](/zh-Hant/cli/dashboard)
- [`backup`](/zh-Hant/cli/backup)
- [`reset`](/zh-Hant/cli/reset)
- [`uninstall`](/zh-Hant/cli/uninstall)
- [`update`](/zh-Hant/cli/update)
- [`message`](/zh-Hant/cli/message)
- [`agent`](/zh-Hant/cli/agent)
- [`agents`](/zh-Hant/cli/agents)
- [`acp`](/zh-Hant/cli/acp)
- [`status`](/zh-Hant/cli/status)
- [`health`](/zh-Hant/cli/health)
- [`sessions`](/zh-Hant/cli/sessions)
- [`gateway`](/zh-Hant/cli/gateway)
- [`logs`](/zh-Hant/cli/logs)
- [`system`](/zh-Hant/cli/system)
- [`models`](/zh-Hant/cli/models)
- [`memory`](/zh-Hant/cli/memory)
- [`directory`](/zh-Hant/cli/directory)
- [`nodes`](/zh-Hant/cli/nodes)
- [`devices`](/zh-Hant/cli/devices)
- [`node`](/zh-Hant/cli/node)
- [`approvals`](/zh-Hant/cli/approvals)
- [`sandbox`](/zh-Hant/cli/sandbox)
- [`tui`](/zh-Hant/cli/tui)
- [`browser`](/zh-Hant/cli/browser)
- [`cron`](/zh-Hant/cli/cron)
- [`dns`](/zh-Hant/cli/dns)
- [`docs`](/zh-Hant/cli/docs)
- [`hooks`](/zh-Hant/cli/hooks)
- [`webhooks`](/zh-Hant/cli/webhooks)
- [`pairing`](/zh-Hant/cli/pairing)
- [`qr`](/zh-Hant/cli/qr)
- [`plugins`](/zh-Hant/cli/plugins) (外掛程式指令)
- [`channels`](/zh-Hant/cli/channels)
- [`security`](/zh-Hant/cli/security)
- [`secrets`](/zh-Hant/cli/secrets)
- [`skills`](/zh-Hant/cli/skills)
- [`daemon`](/zh-Hant/cli/daemon) (gateway service 指令的舊版別名)
- [`clawbot`](/zh-Hant/cli/clawbot) (舊版別名命名空間)
- [`voicecall`](/zh-Hant/cli/voicecall) (外掛程式；若已安裝)

## 全域旗標

- `--dev`：在 `~/.openclaw-dev` 下隔離狀態並變更預設連接埠。
- `--profile <name>`：在 `~/.openclaw-<name>` 下隔離狀態。
- `--no-color`：停用 ANSI 顏色。
- `--update`：`openclaw update` 的簡寫（僅限原始碼安裝）。
- `-V`、`--version`、`-v`：列印版本並結束。

## 輸出樣式

- ANSI 顏色與進度指示器僅在 TTY 會話中呈現。
- OSC-8 超連結在支援的終端機中會顯示為可點擊連結；否則我們會退回到純文字 URL。
- `--json`（以及 `--plain`，若支援）會停用樣式以取得乾淨的輸出。
- `--no-color` 會停用 ANSI 樣式；`NO_COLOR=1` 也會被納入考量。
- 長時間執行的指令會顯示進度指示器（若支援則使用 OSC 9;4）。

## 色彩調色盤

OpenClaw 使用龙虾風格調色盤作為 CLI 輸出。

- `accent` (#FF5A2D)：標題、標籤、主要高亮。
- `accentBright` (#FF7A3D): 指令名稱，強調。
- `accentDim` (#D14A22): 次要高亮文字。
- `info` (#FF8A5B): 資訊性數值。
- `success` (#2FBF71): 成功狀態。
- `warn` (#FFB020): 警告，後備，注意。
- `error` (#E23D2D): 錯誤，失敗。
- `muted` (#8B7F77): 減弱，元資料。

調色盤標準來源：`src/terminal/palette.ts`（「龍蝦調色盤」）。

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

注意：外掛程式可以新增額外的頂層指令（例如 `openclaw voicecall`）。

## 安全性

- `openclaw security audit` — 稽核設定 + 本地狀態是否存在常見的安全性問題。
- `openclaw security audit --deep` — 盡力而為的即時 Gateway 探測。
- `openclaw security audit --fix` — 收緊安全的預設值並 chmod state/config。

## Secrets

- `openclaw secrets reload` — 重新解析引用並以原子方式交換運行時快照。
- `openclaw secrets audit` — 掃描明文殘留、未解析的引用和優先級漂移（`--allow-exec` 以在稽核期間執行 exec 提供者）。
- `openclaw secrets configure` — 提供者設定、SecretRef 對映和 preflight/apply 的互動式輔助工具（`--allow-exec` 以在 preflight 和包含 exec 的 apply 流程中執行 exec 提供者）。
- `openclaw secrets apply --from <plan.json>` — 套用先前產生的計畫（支援 `--dry-run`；使用 `--allow-exec` 以允許在 dry-run 和包含 exec 的寫入計畫中使用 exec 提供者）。

## Plugins

管理擴充功能及其設定：

- `openclaw plugins list` — 探索外掛程式（使用 `--json` 取得機器輸出）。
- `openclaw plugins inspect <id>` — 顯示外掛程式的詳細資訊（`info` 為別名）。
- `openclaw plugins install <path|.tgz|npm-spec|plugin@marketplace>` — 安裝外掛程式（或將外掛程式路徑新增至 `plugins.load.paths`）。
- `openclaw plugins marketplace list <marketplace>` — 在安裝前列出市集項目。
- `openclaw plugins enable <id>` / `disable <id>` — 切換 `plugins.entries.<id>.enabled`。
- `openclaw plugins doctor` — 回報外掛程式載入錯誤。

大部分外掛程式的變更需要重新啟動閘道。請參閱 [/plugin](/zh-Hant/tools/plugin)。

## 記憶體

對 `MEMORY.md` + `memory/*.md` 進行向量搜尋：

- `openclaw memory status` — 顯示索引統計資料。
- `openclaw memory index` — 重新建立記憶體檔案的索引。
- `openclaw memory search "<query>"` (或 `--query "<query>"`) — 對記憶體進行語義搜尋。

## 聊天斜線指令

聊天訊息支援 `/...` 指令（文字和原生）。請參閱 [/tools/slash-commands](/zh-Hant/tools/slash-commands)。

重點：

- `/status` 用於快速診斷。
- `/config` 用於持久化的設定變更。
- `/debug` 用於僅限執行階段的設定覆寫（記憶體中，而非磁碟上；需要 `commands.debug: true`）。

## 設定 + 入門

### `setup`

初始化設定 + 工作區。

選項：

- `--workspace <dir>`: Agent 工作區路徑（預設 `~/.openclaw/workspace`）。
- `--wizard`: 執行入門流程。
- `--non-interactive`: 執行入門流程而不提示。
- `--mode <local|remote>`：入門模式。
- `--remote-url <url>`：遠端 Gateway URL。
- `--remote-token <token>`：遠端 Gateway 權杖。

當存在任何入門標誌（`--non-interactive`、`--mode`、`--remote-url`、`--remote-token`）時，入門流程會自動執行。

### `onboard`

針對 gateway、workspace 和技能的互動式入門。

選項：

- `--workspace <dir>`
- `--reset`（在入門前重設設定 + 憑證 + 會話）
- `--reset-scope <config|config+creds+sessions|full>`（預設 `config+creds+sessions`；使用 `full` 同時移除 workspace）
- `--non-interactive`
- `--mode <local|remote>`
- `--flow <quickstart|advanced|manual>`（manual 是 advanced 的別名）
- `--auth-choice <setup-token|token|chutes|openai-codex|openai-api-key|openrouter-api-key|ollama|ai-gateway-api-key|moonshot-api-key|moonshot-api-key-cn|kimi-code-api-key|synthetic-api-key|venice-api-key|gemini-api-key|zai-api-key|mistral-api-key|apiKey|minimax-api|minimax-api-lightning|opencode-zen|opencode-go|custom-api-key|skip>`
- `--token-provider <id>` (非互動式；與 `--auth-choice token` 搭配使用)
- `--token <token>` (非互動式；與 `--auth-choice token` 搭配使用)
- `--token-profile-id <id>` (非互動式；預設： `<provider>:manual`)
- `--token-expires-in <duration>` (非互動式；例如 `365d`、 `12h`)
- `--secret-input-mode <plaintext|ref>` (預設 `plaintext`；使用 `ref` 以儲存提供者預設環境變數參照，而非明文金鑰)
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
- `--custom-base-url <url>` (非互動式；與 `--auth-choice custom-api-key` 或 `--auth-choice ollama` 搭配使用)
- `--custom-model-id <id>` (非互動式；與 `--auth-choice custom-api-key` 或 `--auth-choice ollama` 搭配使用)
- `--custom-api-key <key>` (非互動式；可選；與 `--auth-choice custom-api-key` 搭配使用；省略時回退至 `CUSTOM_API_KEY`)
- `--custom-provider-id <id>` (非互動式；可選的自訂提供者 ID)
- `--custom-compatibility <openai|anthropic>` (非互動式；可選；預設為 `openai`)
- `--gateway-port <port>`
- `--gateway-bind <loopback|lan|tailnet|auto|custom>`
- `--gateway-auth <token|password>`
- `--gateway-token <token>`
- `--gateway-token-ref-env <name>`（非互動；將 `gateway.auth.token` 儲存為環境 SecretRef；需要設定該環境變數；無法與 `--gateway-token` 結合使用）
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
- `--skip-health`
- `--skip-ui`
- `--node-manager <npm|pnpm|bun>`（建議使用 pnpm；不建議在 Gateway runtime 中使用 bun）
- `--json`

### `configure`

互動式設定精靈（模型、通道、技能、閘道）。

### `config`

非互動式設定輔助工具（get/set/unset/file/validate）。在不帶子命令的情況下執行 `openclaw config` 會啟動精靈。

子指令：

- `config get <path>`：列印設定值（點號/括號路徑）。
- `config set`：支援四種指派模式：
  - 數值模式：`config set <path> <value>`（JSON5 或字串解析）
  - SecretRef 建構器模式：`config set <path> --ref-provider <provider> --ref-source <source> --ref-id <id>`
  - 提供者建構器模式：`config set secrets.providers.<alias> --provider-source <env|file|exec> ...`
  - 批次模式：`config set --batch-json '<json>'` 或 `config set --batch-file <path>`
- `config set --dry-run`：驗證指派而不寫入 `openclaw.json`（預設會跳過 exec SecretRef 檢查）。
- `config set --allow-exec --dry-run`：選擇啟用 exec SecretRef 乾執行檢查（可能會執行提供者指令）。
- `config set --dry-run --json`：輸出機器可讀的乾執行輸出（檢查 + 完整性訊號、操作、已檢查/略過的參照、錯誤）。
- `config set --strict-json`：要求對路徑/值輸入進行 JSON5 解析。`--json` 在乾執行輸出模式之外仍保持為嚴格解析的舊版別名。
- `config unset <path>`：移除值。
- `config file`：列印作用中的組態檔路徑。
- `config validate`：在不啟動閘道的情況下，根據綱要驗證目前的組態。
- `config validate --json`：輸出機器可讀的 JSON 輸出。

### `doctor`

健康檢查 + 快速修復（組態 + 閘道 + 舊版服務）。

選項：

- `--no-workspace-suggestions`：停用工作區記憶體提示。
- `--yes`：接受預設值而不提示 (無介面模式)。
- `--non-interactive`：跳過提示；僅套用安全遷移。
- `--deep`：掃描系統服務以尋找額外的閘道安裝。

## 頻道輔助工具

### `channels`

管理聊天頻道帳號 (WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (外掛程式)/Signal/iMessage/MS Teams)。

子指令：

- `channels list`：顯示已設定的頻道與驗證設定檔。
- `channels status`：檢查閘道連線能力與頻道健康狀況 (`--probe` 執行額外檢查；請使用 `openclaw health` 或 `openclaw status --deep` 進行閘道健康狀況探測)。
- 提示：`channels status` 會在偵測到常見的錯誤設定時列印出包含建議修正方式的警告（然後將您指引至 `openclaw doctor`）。
- `channels logs`：顯示來自 gateway 日誌檔案的近期通道日誌。
- `channels add`：若未傳遞 flags，則為精靈式設定；flags 會切換至非互動模式。
  - 當將非預設帳戶新增至仍在使用單一帳戶頂層設定的通道時，OpenClaw 會在寫入新帳戶之前，將帳戶範圍的值移至 `channels.<channel>.accounts.default`。
  - 非互動式的 `channels add` 不會自動建立/升級綁定；僅限通道的綁定會繼續符合預設帳戶。
- `channels remove`：預設停用；傳遞 `--delete` 以無提示方式移除設定項目。
- `channels login`：互動式頻道登入（僅限 WhatsApp Web）。
- `channels logout`：登出頻道階段（如果支援）。

常見選項：

- `--channel <name>`：`whatsapp|telegram|discord|googlechat|slack|mattermost|signal|imessage|msteams`
- `--account <id>`：頻道帳戶 ID（預設 `default`）
- `--name <label>`：帳戶顯示名稱

`channels login` 選項：

- `--channel <channel>`（預設 `whatsapp`；支援 `whatsapp`/`web`）
- `--account <id>`
- `--verbose`

`channels logout` 選項：

- `--channel <channel>`（預設 `whatsapp`）
- `--account <id>`

`channels list` 選項：

- `--no-usage`：跳過模型提供者使用/配額快照（僅適用於 OAuth/API 支援）。
- `--json`：輸出 JSON（除非設定了 `--no-usage`，否則包含使用資訊）。

`channels logs` 選項：

- `--channel <name|all>`（預設 `all`）
- `--lines <n>`（預設 `200`）
- `--json`

更多細節：[/concepts/oauth](/zh-Hant/concepts/oauth)

範例：

```bash
openclaw channels add --channel telegram --account alerts --name "Alerts Bot" --token $TELEGRAM_BOT_TOKEN
openclaw channels add --channel discord --account work --name "Work Bot" --token $DISCORD_BOT_TOKEN
openclaw channels remove --channel discord --account work --delete
openclaw channels status --probe
openclaw status --deep
```

### `skills`

列出並檢查可用的技能以及就緒資訊。

子指令：

- `skills list`：列出技能（未指定子指令時為預設動作）。
- `skills info <name>`：顯示單一技能的詳細資訊。
- `skills check`: 就緒與缺失需求的摘要。

選項：

- `--eligible`: 僅顯示就緒的技能。
- `--json`: 輸出 JSON（無樣式）。
- `-v`, `--verbose`: 包含缺失需求的詳細資訊。

提示：使用 `npx clawhub` 來搜尋、安裝及同步技能。

### `pairing`

核准跨頻道的 DM 配對請求。

子指令：

- `pairing list [channel] [--channel <channel>] [--account <id>] [--json]`
- `pairing approve <channel> <code> [--account <id>] [--notify]`
- `pairing approve --channel <channel> [--account <id>] <code> [--notify]`

### `devices`

管理閘道裝置配對項目與各角色的裝置 Token。

子指令：

- `devices list [--json]`
- `devices approve [requestId] [--latest]`
- `devices reject <requestId>`
- `devices remove <deviceId>`
- `devices clear --yes [--pending]`
- `devices rotate --device <id> --role <role> [--scope <scope...>]`
- `devices revoke --device <id> --role <role>`

### `webhooks gmail`

Gmail Pub/Sub hook 設定 + 執行器。請參閱 [/automation/gmail-pubsub](/zh-Hant/automation/gmail-pubsub)。

子指令：

- `webhooks gmail setup` (需要 `--account <email>`；支援 `--project`、`--topic`、`--subscription`、`--label`、`--hook-url`、`--hook-token`、`--push-token`、`--bind`、`--port`、`--path`、`--include-body`、`--max-bytes`、`--renew-minutes`、`--tailscale`、`--tailscale-path`、`--tailscale-target`、`--push-endpoint`、`--json`)
- `webhooks gmail run` (相同旗標的執行時期覆寫)

### `dns setup`

廣域網探索 DNS 輔助程式 (CoreDNS + Tailscale)。請參閱 [/gateway/discovery](/zh-Hant/gateway/discovery)。

選項：

- `--apply`：安裝/更新 CoreDNS 配置 (需要 sudo；僅限 macOS)。

## 訊息傳遞 + 代理程式

### `message`

統一的外寄訊息傳遞 + 頻道操作。

請參閱：[/cli/message](/zh-Hant/cli/message)

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

透過 Gateway（或 `--local` 嵌入）執行單次代理程序輪次。

必要：

- `--message <text>`

選項：

- `--to <dest>`（用於工作階段金鑰和選用性遞送）
- `--session-id <id>`
- `--thinking <off|minimal|low|medium|high|xhigh>`（僅限 GPT-5.2 + Codex 模型）
- `--verbose <on|full|off>`
- `--channel <whatsapp|telegram|discord|slack|mattermost|signal|imessage|msteams>`
- `--local`
- `--deliver`
- `--json`
- `--timeout <seconds>`

### `agents`

管理隔離的代理程序（工作區 + 驗證 + 路由）。

#### `agents list`

列出已設定的代理程序。

選項：

- `--json`
- `--bindings`

#### `agents add [name]`

新增一個獨立的 agent。除非傳入了旗標（或 `--non-interactive`），否則會執行引導精靈；在非互動模式下，`--workspace` 是必需的。

選項：

- `--workspace <dir>`
- `--model <id>`
- `--agent-dir <dir>`
- `--bind <channel[:accountId]>` (可重複)
- `--non-interactive`
- `--json`

綁定規格使用 `channel[:accountId]`。當省略 `accountId` 時，OpenClaw 可能會透過通道預設值/外掛程式掛鉤來解析帳戶範圍；否則它是沒有明確帳戶範圍的通道綁定。

#### `agents bindings`

列出路由綁定。

選項：

- `--agent <id>`
- `--json`

#### `agents bind`

為 agent 新增路由綁定。

選項：

- `--agent <id>`
- `--bind <channel[:accountId]>` (可重複)
- `--json`

#### `agents unbind`

移除 Agent 的路由綁定。

選項：

- `--agent <id>`
- `--bind <channel[:accountId]>` (可重複)
- `--all`
- `--json`

#### `agents delete <id>`

刪除 Agent 並清除其工作區和狀態。

選項：

- `--force`
- `--json`

### `acp`

執行連接 IDE 與 Gateway 的 ACP 橋接器。

參閱 [`acp`](/zh-Hant/cli/acp) 以取得完整選項和範例。

### `status`

顯示連線階段的健康狀況和最近的接收者。

選項：

- `--json`
- `--all`（完整診斷；唯讀、可複製）
- `--deep`（探測通道）
- `--usage`（顯示模型提供者使用量/配額）
- `--timeout <ms>`
- `--verbose`
- `--debug`（`--verbose` 的別名）

備註：

- 總覽在可用時包含 Gateway + 節點主機服務狀態。

### 使用量追蹤

當有 OAuth/API 憑證時，OpenClaw 可以顯示提供者使用量/配額。

介面：

- `/status`（在可用時新增簡短的提供者使用量資訊行）
- `openclaw status --usage`（列印完整的提供者細目）
- macOS 選單列（Context 下的 Usage 區段）

備註：

- 資料直接來自提供者使用量端點（無估算值）。
- 提供者：Anthropic、GitHub Copilot、OpenAI Codex OAuth，加上透過捆綁的 `google` 外掛程式提供的 Gemini CLI，以及已設定的 Antigravity。
- 如果不存在相符的憑證，使用量會被隱藏。
- 詳細資訊：請參閱[使用量追蹤](/zh-Hant/concepts/usage-tracking)。

### `health`

從執行中的 Gateway 取得健康狀態。

選項：

- `--json`
- `--timeout <ms>`
- `--verbose`

### `sessions`

列出已儲存的對話工作階段。

選項：

- `--json`
- `--verbose`
- `--store <path>`
- `--active <minutes>`

## 重設 / 解除安裝

### `reset`

重設本機設定/狀態（保留已安裝的 CLI）。

選項：

- `--scope <config|config+creds+sessions|full>`
- `--yes`
- `--non-interactive`
- `--dry-run`

備註：

- `--non-interactive` 需要 `--scope` 和 `--yes`。

### `uninstall`

解除安裝閘道服務 + 本機資料（CLI 保留）。

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

- `--non-interactive` 需要 `--yes` 和明確的範圍（或 `--all`）。

## 閘道

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
- `--reset` (重置開發設定 + 憑證 + 會話 + 工作區)
- `--force` (終止連接埠上現有的監聽器)
- `--verbose`
- `--claude-cli-logs`
- `--ws-log <auto|full|compact>`
- `--compact` (`--ws-log compact` 的別名)
- `--raw-stream`
- `--raw-stream-path <path>`

### `gateway service`

管理 Gateway 服務 (launchd/systemd/schtasks)。

子指令：

- `gateway status` (預設探測 Gateway RPC)
- `gateway install` (服務安裝)
- `gateway uninstall`
- `gateway start`
- `gateway stop`
- `gateway restart`

備註：

- `gateway status` 預設會使用服務解析出的連接埠/設定來探查 Gateway RPC（可使用 `--url/--token/--password` 覆寫）。
- `gateway status` 支援 `--no-probe`、`--deep`、`--require-rpc` 和 `--json` 以用於腳本撰寫。
- 當 `gateway status` 能偵測到舊版或額外的 gateway 服務時，也會將其顯示出來（`--deep` 會新增系統層級掃描）。以設定檔命名的 OpenClaw 服務會被視為一等公民，且不會被標記為「額外」。
- `gateway status` 會列印 CLI 使用哪個配置路徑，以及服務可能使用哪個配置（服務環境變數），還有已解析的探測目標 URL。
- 如果在當前命令路徑中無法解析 gateway auth SecretRefs，`gateway status --json` 只會在探測連線/驗證失敗時回報 `rpc.authWarning`（探測成功時會隱藏警告）。
- 在 Linux systemd 安裝中，狀態 token-drift 檢查包含 `Environment=` 和 `EnvironmentFile=` 單元來源兩者。
- `gateway install|uninstall|start|stop|restart` 支援 `--json` 用於腳本撰寫（預設輸出維持人類友善格式）。
- `gateway install` 預設為 Node 執行時；不建議使用 bun（WhatsApp/Telegram 錯誤）。
- `gateway install` 選項：`--port`、`--runtime`、`--token`、`--force`、`--json`。

### `logs`

透過 RPC 追蹤 Gateway 檔案日誌。

備註：

- TTY 工作階段會顯示色彩化、結構化的檢視；非 TTY 則會退回純文字。
- `--json` 會發出以行分隔的 JSON（每行一個日誌事件）。

範例：

```bash
openclaw logs --follow
openclaw logs --limit 200
openclaw logs --plain
openclaw logs --json
openclaw logs --no-color
```

### `gateway <subcommand>`

Gateway CLI 協助程式（對於 RPC 子指令，請使用 `--url`、`--token`、`--password`、`--timeout`、`--expect-final`）。
當您傳遞 `--url` 時，CLI 不會自動套用設定或環境憑證。
請明確包含 `--token` 或 `--password`。缺少明確的憑證是一種錯誤。

子指令：

- `gateway call <method> [--params <json>]`
- `gateway health`
- `gateway status`
- `gateway probe`
- `gateway discover`
- `gateway install|uninstall|start|stop|restart`
- `gateway run`

常見的 RPC：

- `config.apply` （驗證 + 寫入設定 + 重新啟動 + 喚醒）
- `config.patch` （合併部分更新 + 重新啟動 + 喚醒）
- `update.run` (執行 update + restart + wake)

提示：直接呼叫 `config.set`/`config.apply`/`config.patch` 時，若設定已存在，請從 `config.get` 傳遞 `baseHash`。

## 模型

關於後備行為與掃描策略，請參閱 [/concepts/models](/zh-Hant/concepts/models)。

Anthropic setup-token (支援)：

```bash
claude setup-token
openclaw models auth setup-token --provider anthropic
openclaw models status
```

政策說明：此為技術相容性。Anthropic 過去曾封鎖部分在 Claude Code 之外的訂閱使用；在正式環境依賴 setup-token 前，請確認目前的 Anthropic 條款。

### `models` (root)

`openclaw models` 是 `models status` 的別名。

Root 選項：

- `--status-json` (`models status --json` 的別名)
- `--status-plain` (`models status --plain` 的別名)

### `models list`

選項：

- `--all`
- `--local`
- `--provider <name>`
- `--json`
- `--plain`

### `models status`

選項：

- `--json`
- `--plain`
- `--check` (結束碼 1=已過期/遺失，2=即將過期)
- `--probe` (已設定認證設定檔的即時探測)
- `--probe-provider <name>`
- `--probe-profile <id>` (重複或以逗號分隔)
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`

一律包含 auth store 中設定檔的 auth 概覽和 OAuth 到期狀態。
`--probe` 會執行即時請求（可能會消耗 token 並觸發速率限制）。

### `models set <model>`

設定 `agents.defaults.model.primary`。

### `models set-image <model>`

設定 `agents.defaults.imageModel.primary`。

### `models aliases list|add|remove`

選項：

- `list`：`--json`、`--plain`
- `add <alias> <model>`
- `remove <alias>`

### `models fallbacks list|add|remove|clear`

選項：

- `list`：`--json`、`--plain`
- `add <model>`
- `remove <model>`
- `clear`

### `models image-fallbacks list|add|remove|clear`

選項：

- `list`：`--json`、`--plain`
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

### `models auth add|setup-token|paste-token`

選項：

- `add`：互動式驗證輔助程式
- `setup-token`: `--provider <name>` (預設 `anthropic`), `--yes`
- `paste-token`: `--provider <name>`, `--profile-id <id>`, `--expires-in <duration>`

### `models auth order get|set|clear`

選項：

- `get`: `--provider <name>`, `--agent <id>`, `--json`
- `set`: `--provider <name>`, `--agent <id>`, `<profileIds...>`
- `clear`: `--provider <name>`, `--agent <id>`

## 系統

### `system event`

將系統事件加入佇列並選擇性地觸發心跳（Gateway RPC）。

必要項：

- `--text <text>`

選項：

- `--mode <now|next-heartbeat>`
- `--json`
- `--url`, `--token`, `--timeout`, `--expect-final`

### `system heartbeat last|enable|disable`

心跳控制 (Gateway RPC)。

選項：

- `--json`
- `--url`, `--token`, `--timeout`, `--expect-final`

### `system presence`

列出系統狀態條目 (Gateway RPC)。

選項：

- `--json`
- `--url`, `--token`, `--timeout`, `--expect-final`

## Cron

管理排程任務 (Gateway RPC)。請參閱 [/automation/cron-jobs](/zh-Hant/automation/cron-jobs)。

子指令：

- `cron status [--json]`
- `cron list [--all] [--json]` (預設為表格輸出；使用 `--json` 取得原始輸出)
- `cron add` (別名：`create`；需要 `--name` 以及 `--at` | `--every` | `--cron` 其中之一，以及 `--system-event` | `--message` 其中之一的有效載荷)
- `cron edit <id>` (修補欄位)
- `cron rm <id>` (別名： `remove`, `delete`)
- `cron enable <id>`
- `cron disable <id>`
- `cron runs --id <id> [--limit <n>]`
- `cron run <id> [--force]`

所有 `cron` 指令皆接受 `--url`、`--token`、`--timeout`、`--expect-final`。

## 節點主機

`node` 會執行 **無頭節點主機** 或將其作為背景服務進行管理。請參閱
[`openclaw node`](/zh-Hant/cli/node)。

子指令：

- `node run --host <gateway-host> --port 18789`
- `node status`
- `node install [--host <gateway-host>] [--port <port>] [--tls] [--tls-fingerprint <sha256>] [--node-id <id>] [--display-name <name>] [--runtime <node|bun>] [--force]`
- `node uninstall`
- `node stop`
- `node restart`

驗證備註：

- `node` 會從環境變數/設定檔解析閘道驗證 (無 `--token`/`--password` 標誌)： `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`，然後是 `gateway.auth.*`。在本機模式中，節點主機會刻意忽略 `gateway.remote.*`；在 `gateway.mode=remote` 中，`gateway.remote.*` 會依照遠端優先順序規則參與。
- 舊版 `CLAWDBOT_GATEWAY_*` 環境變數會刻意被忽略，不作為節點主機驗證解析之用。

## 節點

`nodes` 會與閘道通訊並指定配對的節點。請參閱 [/nodes](/zh-Hant/nodes)。

常用選項：

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
- `nodes run --node <id|name|ip> [--cwd <path>] [--env KEY=VAL] [--command-timeout <ms>] [--needs-screen-recording] [--invoke-timeout <ms>] <command...>` (mac 節點或無頭節點主機)
- `nodes notify --node <id|name|ip> [--title <text>] [--body <text>] [--sound <name>] [--priority <passive|active|timeSensitive>] [--delivery <system|overlay|auto>] [--invoke-timeout <ms>]` (僅限 mac)

攝影機：

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

瀏覽器控制 CLI (專用 Chrome/Brave/Edge/Chromium)。請參閱 [`openclaw browser`](/zh-Hant/cli/browser) 和 [瀏覽器工具](/zh-Hant/tools/browser)。

常見選項：

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

檢查：

- `browser screenshot [targetId] [--full-page] [--ref <ref>] [--element <selector>] [--type png|jpeg]`
- `browser snapshot [--format aria|ai] [--target-id <id>] [--limit <n>] [--interactive] [--compact] [--depth <n>] [--selector <sel>] [--out <path>]`

動作：

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

## 文件搜尋

### `docs [query...]`

搜尋即時文件索引。

## TUI

### `tui`

開啟連線至 Gateway 的終端機 UI。

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

import en from "/components/footer/en.mdx";

<en />
