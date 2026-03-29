---
summary: "OpenClaw CLI 參考，用於 `openclaw` 指令、子指令和選項"
read_when:
  - Adding or modifying CLI commands or options
  - Documenting new command surfaces
title: "CLI 參考"
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

- `--dev`：將狀態隔離在 `~/.openclaw-dev` 下並移轉預設連接埠。
- `--profile <name>`：將狀態隔離在 `~/.openclaw-<name>` 下。
- `--no-color`：停用 ANSI 色彩。
- `--update`：`openclaw update` 的簡寫（僅限原始碼安裝）。
- `-V`、`--version`、`-v`：列印版本並結束。

## 輸出樣式

- ANSI 色彩與進度指示器僅在 TTY 會話中呈現。
- OSC-8 超連結在支援的終端機中會呈現為可點擊連結；否則我們會退回到純文字 URL。
- `--json`（以及支援的 `--plain`）會停用樣式以產生乾淨的輸出。
- `--no-color` 會停用 ANSI 樣式；`NO_COLOR=1` 也會被遵守。
- 長時間執行的指令會顯示進度指示器（在支援的情況下為 OSC 9;4）。

## 色彩盤

OpenClaw 使用龍蝦色彩盤 來進行 CLI 輸出。

- `accent` (#FF5A2D)：標題、標籤、主要高亮。
- `accentBright` (#FF7A3D)：指令名稱、強調。
- `accentDim` (#D14A22)：次要高亮文字。
- `info` (#FF8A5B)：資訊值。
- `success` (#2FBF71)：成功狀態。
- `warn` (#FFB020)：警告、後備、注意。
- `error` (#E23D2D)：錯誤、失敗。
- `muted` (#8B7F77)：低調、元資料。

色彩盤的準則來源：`src/terminal/palette.ts`（「龍蝦色彩盤」）。

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
    audit
    configure
    apply
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

- `openclaw security audit` — 稽核組態 + 本機狀態以檢查常見的安全性陷阱。
- `openclaw security audit --deep` — 盡力而為的即時 Gateway 探測。
- `openclaw security audit --fix` — 收緊安全的預設值並 chmod 狀態/組態。

## 秘密資料 (Secrets)

- `openclaw secrets reload` — 重新解析參照並原子性地交換執行時期快照。
- `openclaw secrets audit` — 掃描純文字殘留、未解析的參照和優先順序漂移（`--allow-exec` 以在稽核期間執行 exec 提供者）。
- `openclaw secrets configure` — 提供者設置 + SecretRef 對應 + preflight/apply 的互動式輔助工具（`--allow-exec` 以在 preflight 和包含 exec 的 apply 流程中執行 exec 提供者）。
- `openclaw secrets apply --from <plan.json>` — 套用先前產生的計劃（支援 `--dry-run`；使用 `--allow-exec` 以允許在 dry-run 和包含 exec 的寫入計劃中使用 exec 提供者）。

## 外掛

管理擴充功能及其設定：

- `openclaw plugins list` — 探索外掛（使用 `--json` 取得機器可讀輸出）。
- `openclaw plugins inspect <id>` — 顯示外掛詳細資訊（`info` 為別名）。
- `openclaw plugins install <path|.tgz|npm-spec|plugin@marketplace>` — 安裝外掛（或將外掛路徑新增至 `plugins.load.paths`）。
- `openclaw plugins marketplace list <marketplace>` — 安裝前列出市集項目。
- `openclaw plugins enable <id>` / `disable <id>` — 切換 `plugins.entries.<id>.enabled`。
- `openclaw plugins doctor` — 回報外掛載入錯誤。

大部分外掛變更需要重新啟動 gateway。請參閱 [/plugin](/en/tools/plugin)。

## 記憶體

針對 `MEMORY.md` + `memory/*.md` 進行向量搜尋：

- `openclaw memory status` — 顯示索引統計資料。
- `openclaw memory index` — 重新索引記憶體檔案。
- `openclaw memory search "<query>"`（或 `--query "<query>"`） — 針對記憶體進行語意搜尋。

## Chat 斜線指令

Chat 訊息支援 `/...` 指令（文字與原生）。請參閱 [/tools/slash-commands](/en/tools/slash-commands)。

重點：

- `/status` 用於快速診斷。
- `/config` 用於持久化的設定變更。
- `/debug` 用於僅限執行時期的設定覆寫（記憶體中，非磁碟；需要 `commands.debug: true`）。

## 設定 + 入門

### `setup`

初始化設定 + 工作區。

選項：

- `--workspace <dir>`：agent 工作區路徑（預設 `~/.openclaw/workspace`）。
- `--wizard`：執行入門。
- `--non-interactive`：執行入門但不提示。
- `--mode <local|remote>`：入門模式。
- `--remote-url <url>`：遠端 Gateway URL。
- `--remote-token <token>`：遠端 Gateway token。

當存在任何入門旗標時，入門程式會自動執行 (`--non-interactive`, `--mode`, `--remote-url`, `--remote-token`)。

### `onboard`

針對 gateway、workspace 和 skills 的互動式入門程式。

選項：

- `--workspace <dir>`
- `--reset` (在入門前重設組態 + 憑證 + 工作階段)
- `--reset-scope <config|config+creds+sessions|full>` (預設 `config+creds+sessions`；使用 `full` 同時移除 workspace)
- `--non-interactive`
- `--mode <local|remote>`
- `--flow <quickstart|advanced|manual>` (manual 是 advanced 的別名)
- `--auth-choice <setup-token|token|chutes|openai-codex|openai-api-key|openrouter-api-key|ollama|ai-gateway-api-key|moonshot-api-key|moonshot-api-key-cn|kimi-code-api-key|synthetic-api-key|venice-api-key|gemini-api-key|zai-api-key|mistral-api-key|apiKey|minimax-api|minimax-api-lightning|opencode-zen|opencode-go|custom-api-key|skip>`
- `--token-provider <id>` (非互動式；與 `--auth-choice token` 搭配使用)
- `--token <token>` (非互動式；與 `--auth-choice token` 搭配使用)
- `--token-profile-id <id>` (非互動式；預設：`<provider>:manual`)
- `--token-expires-in <duration>` (非互動式；例如 `365d`, `12h`)
- `--secret-input-mode <plaintext|ref>` (預設 `plaintext`；使用 `ref` 儲存提供者預設 env refs 而非純文字金鑰)
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
- `--custom-api-key <key>` (非互動式；選用；與 `--auth-choice custom-api-key` 搭配使用；省略時則回退至 `CUSTOM_API_KEY`)
- `--custom-provider-id <id>` （非互動式；可選的自訂供應商 ID）
- `--custom-compatibility <openai|anthropic>` （非互動式；可選；預設為 `openai`）
- `--gateway-port <port>`
- `--gateway-bind <loopback|lan|tailnet|auto|custom>`
- `--gateway-auth <token|password>`
- `--gateway-token <token>`
- `--gateway-token-ref-env <name>` （非互動式；將 `gateway.auth.token` 存儲為環境變數 SecretRef；要求設置該環境變數；不能與 `--gateway-token` 結合使用）
- `--gateway-password <password>`
- `--remote-url <url>`
- `--remote-token <token>`
- `--tailscale <off|serve|funnel>`
- `--tailscale-reset-on-exit`
- `--install-daemon`
- `--no-install-daemon` （別名：`--skip-daemon`）
- `--daemon-runtime <node|bun>`
- `--skip-channels`
- `--skip-skills`
- `--skip-health`
- `--skip-ui`
- `--node-manager <npm|pnpm|bun>` （推薦使用 pnpm；不推薦將 bun 用於 Gateway 執行時）
- `--json`

### `configure`

互動式配置嚮導（模型、頻道、技能、閘道器）。

### `config`

非互動式配置輔助工具（get/set/unset/file/validate）。在不帶子指令的情況下執行 `openclaw config` 將啟動嚮導。

子指令：

- `config get <path>`：列印配置值（點/括號路徑）。
- `config set`：支援四種賦值模式：
  - 數值模式：`config set <path> <value>` （JSON5 或字串解析）
  - SecretRef 建構器模式：`config set <path> --ref-provider <provider> --ref-source <source> --ref-id <id>`
  - 供應商建構器模式：`config set secrets.providers.<alias> --provider-source <env|file|exec> ...`
  - 批次模式：`config set --batch-json '<json>'` 或 `config set --batch-file <path>`
- `config set --dry-run`：驗證賦值而不寫入 `openclaw.json` （預設情況下會跳過 exec SecretRef 檢查）。
- `config set --allow-exec --dry-run`：選擇啟用 exec SecretRef 試執行檢查（可能會執行供應商指令）。
- `config set --dry-run --json`: 發出機器可讀的 dry-run 輸出（檢查 + 完整性訊號、操作、已檢查/略過的參照、錯誤）。
- `config set --strict-json`: 要求對路徑/值輸入進行 JSON5 解析。`--json` 仍是 dry-run 輸出模式以外嚴格解析的舊版別名。
- `config unset <path>`: 移除數值。
- `config file`: 列印使用中的設定檔路徑。
- `config validate`: 根據結構描述驗證目前設定，而不啟動閘道。
- `config validate --json`: 發出機器可讀的 JSON 輸出。

### `doctor`

健康檢查 + 快速修復（設定 + 閘道 + 舊版服務）。

選項：

- `--no-workspace-suggestions`: 停用工作區記憶體提示。
- `--yes`: 接受預設值而不提示（無頭模式）。
- `--non-interactive`: 略過提示；僅套用安全的遷移。
- `--deep`: 掃描系統服務以尋找額外的閘道安裝。

## 頻道輔助工具

### `channels`

管理聊天頻道帳號（WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (plugin)/Signal/iMessage/Microsoft Teams）。

子指令：

- `channels list`: 顯示已設定的頻道與驗證設定檔。
- `channels status`: 檢查閘道連線能力與頻道健康狀態（`--probe` 執行額外檢查；請使用 `openclaw health` 或 `openclaw status --deep` 進行閘道健康狀態探測）。
- 提示：`channels status` 當偵測到常見的設定錯誤時，會列印包含建議修復方式的警告（然後指引您前往 `openclaw doctor`）。
- `channels logs`: 顯示來自閘道記錄檔的近期頻道記錄。
- `channels add`: 若未傳遞旗標，則為精靈樣式的設定；旗標會切換至非互動模式。
  - 當將非預設帳號新增至仍使用單一帳號頂層設定的頻道時，OpenClaw 會在寫入新帳號之前將帳號範圍的數值移至 `channels.<channel>.accounts.default`。
  - 非互動式 `channels add` 不會自動建立/升級綁定；僅頻道的綁定會繼續符合預設帳戶。
- `channels remove`：預設停用；傳遞 `--delete` 以在不提示的情況下移除設定項目。
- `channels login`：互動式頻道登入（僅限 WhatsApp Web）。
- `channels logout`：登出頻道階段（如果支援）。

常用選項：

- `--channel <name>`：`whatsapp|telegram|discord|googlechat|slack|mattermost|signal|imessage|msteams`
- `--account <id>`：頻道帳戶 ID（預設為 `default`）
- `--name <label>`：帳戶的顯示名稱

`channels login` 選項：

- `--channel <channel>`（預設 `whatsapp`；支援 `whatsapp`/`web`）
- `--account <id>`
- `--verbose`

`channels logout` 選項：

- `--channel <channel>`（預設 `whatsapp`）
- `--account <id>`

`channels list` 選項：

- `--no-usage`：跳過模型供應商使用量/配額快照（僅限 OAuth/API 支援）。
- `--json`：輸出 JSON（除非設定了 `--no-usage`，否則包含使用量）。

`channels logs` 選項：

- `--channel <name|all>`（預設 `all`）
- `--lines <n>`（預設 `200`）
- `--json`

更多詳情：[/concepts/oauth](/en/concepts/oauth)

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

- `skills search [query...]`：搜尋 ClawHub 技能。
- `skills install <slug>`：將技能從 ClawHub 安裝到現用的工作區。
- `skills update <slug|--all>`：更新已追蹤的 ClawHub 技能。
- `skills list`：列出技能（未提供子指令時的預設行為）。
- `skills info <name>`：顯示單一技能的詳細資訊。
- `skills check`：就緒與缺失需求的摘要。

選項：

- `--eligible`：僅顯示就緒的技能。
- `--json`：輸出 JSON（無樣式）。
- `-v`, `--verbose`：包含缺失需求的詳細資訊。

提示：針對 ClawHub 支援的技能，請使用 `openclaw skills search`、`openclaw skills install` 和 `openclaw skills update`。

### `pairing`

核准各頻道的 DM 配對請求。

子指令：

- `pairing list [channel] [--channel <channel>] [--account <id>] [--json]`
- `pairing approve <channel> <code> [--account <id>] [--notify]`
- `pairing approve --channel <channel> [--account <id>] <code> [--notify]`

### `devices`

管理閘道裝置配對條目及每角色的裝置 Token。

子指令：

- `devices list [--json]`
- `devices approve [requestId] [--latest]`
- `devices reject <requestId>`
- `devices remove <deviceId>`
- `devices clear --yes [--pending]`
- `devices rotate --device <id> --role <role> [--scope <scope...>]`
- `devices revoke --device <id> --role <role>`

### `webhooks gmail`

Gmail Pub/Sub hook 設定 + 執行器。請參閱 [/automation/gmail-pubsub](/en/automation/gmail-pubsub)。

子指令：

- `webhooks gmail setup` (需要 `--account <email>`；支援 `--project`、`--topic`、`--subscription`、`--label`、`--hook-url`、`--hook-token`、`--push-token`、`--bind`、`--port`、`--path`、`--include-body`、`--max-bytes`、`--renew-minutes`、`--tailscale`、`--tailscale-path`、`--tailscale-target`、`--push-endpoint`、`--json`)
- `webhooks gmail run` (相同旗標的執行階段覆寫)

### `dns setup`

廣域探索 DNS 助手（CoreDNS + Tailscale）。請參閱 [/gateway/discovery](/en/gateway/discovery)。

選項：

- `--apply`：安裝/更新 CoreDNS 配置（需要 sudo；僅限 macOS）。

## 訊息傳遞 + 代理程式

### `message`

統一的輸出訊息傳遞 + 頻道動作。

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

透過 Gateway (或 `--local` 內嵌) 執行一次代理程式輪次。

必要項目：

- `--message <text>`

選項：

- `--to <dest>` (用於 session key 和選用傳遞)
- `--session-id <id>`
- `--thinking <off|minimal|low|medium|high|xhigh>` (僅限 GPT-5.2 + Codex 模型)
- `--verbose <on|full|off>`
- `--channel <whatsapp|telegram|discord|slack|mattermost|signal|imessage|msteams>`
- `--local`
- `--deliver`
- `--json`
- `--timeout <seconds>`

### `agents`

管理隔離的代理程式 (工作區 + 驗證 + 路由)。

#### `agents list`

列出已設定的代理程式。

選項：

- `--json`
- `--bindings`

#### `agents add [name]`

新增一個隔離的代理程式。除非傳遞旗標 (或 `--non-interactive`)，否則會執行引導精靈；在非互動模式下，`--workspace` 是必要的。

選項：

- `--workspace <dir>`
- `--model <id>`
- `--agent-dir <dir>`
- `--bind <channel[:accountId]>` (可重複)
- `--non-interactive`
- `--json`

綁定規格使用 `channel[:accountId]`。當省略 `accountId` 時，OpenClaw 可能會透過頻道預設值/外掛程式 Hook 解析帳戶範圍；否則這是不含明確帳戶範圍的頻道綁定。

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

移除 agent 的路由綁定。

選項：

- `--agent <id>`
- `--bind <channel[:accountId]>` (可重複)
- `--all`
- `--json`

#### `agents delete <id>`

刪除 agent 並清理其工作區與狀態。

選項：

- `--force`
- `--json`

### `acp`

執行連接 IDE 與 Gateway 的 ACP 橋接器。

完整選項與範例請參閱 [`acp`](/en/cli/acp)。

### `status`

顯示已連線的工作階段健康狀況與近期收件者。

選項：

- `--json`
- `--all` (完整診斷；唯讀，可貼上)
- `--deep` (探查通道)
- `--usage` (顯示模型提供者使用量/配額)
- `--timeout <ms>`
- `--verbose`
- `--debug` (`--verbose` 的別名)

備註：

- 概覽在可用時會包含 Gateway + 節點主機服務狀態。

### 使用量追蹤

當 OAuth/API 憑證可用時，OpenClaw 可以顯示提供者使用量/配額。

介面：

- `/status` (可用時新增簡短的提供者使用量行)
- `openclaw status --usage` (列印完整的提供者細分)
- macOS 選單列 (Context 下的 Usage 區段)

備註：

- 資料直接來自提供者的使用量端點 (非估算值)。
- 提供者：Anthropic、GitHub Copilot、OpenAI Codex OAuth，以及透過內建的 `google` 外掛程式使用的 Gemini CLI 和已設定的 Antigravity。
- 如果沒有相符的憑證，使用量會被隱藏。
- 詳細資訊：請參閱 [Usage tracking](/en/concepts/usage-tracking)。

### `health`

從執行中的 Gateway 取得健康狀態。

選項：

- `--json`
- `--timeout <ms>`
- `--verbose`

### `sessions`

列出儲存的對話階段。

選項：

- `--json`
- `--verbose`
- `--store <path>`
- `--active <minutes>`

## 重置 / 解除安裝

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

執行 WebSocket 閘道。

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
- `--reset` (重設開發設定 + 憑證 + 階段 + 工作區)
- `--force` (終止連接埠上現有的監聽器)
- `--verbose`
- `--claude-cli-logs`
- `--ws-log <auto|full|compact>`
- `--compact` (`--ws-log compact` 的別名)
- `--raw-stream`
- `--raw-stream-path <path>`

### `gateway service`

管理閘道服務 (launchd/systemd/schtasks)。

子指令：

- `gateway status` (預設探測閘道 RPC)
- `gateway install` (service install)
- `gateway uninstall`
- `gateway start`
- `gateway stop`
- `gateway restart`

備註：

- `gateway status` 預設使用服務的解析連接埠/設定來探測 Gateway RPC（可使用 `--url/--token/--password` 覆蓋）。
- `gateway status` 支援 `--no-probe`、`--deep`、`--require-rpc` 和 `--json` 用於撰寫腳本。
- `gateway status` 也會在偵測到時顯示舊版或額外的 gateway 服務（`--deep` 會新增系統層級掃描）。以 Profile 命名的 OpenClaw 服務被視為一等公民，不會被標記為「額外」。
- `gateway status` 會列印 CLI 使用的設定路徑與服務可能使用的設定（服務 env）的對比，以及解析後的探測目標 URL。
- 如果在目前的指令路徑中無法解析 gateway auth SecretRefs，`gateway status --json` 只會在探測連線/驗證失敗時回報 `rpc.authWarning`（探測成功時會抑制警告）。
- 在 Linux systemd 安裝中，狀態 token-drift 檢查包括 `Environment=` 和 `EnvironmentFile=` 單元來源。
- `gateway install|uninstall|start|stop|restart` 支援 `--json` 用於撰寫腳本（預設輸出保持人類友善格式）。
- `gateway install` 預設為 Node 執行時期；**不建議**使用 bun（WhatsApp/Telegram 錯誤）。
- `gateway install` 選項：`--port`、`--runtime`、`--token`、`--force`、`--json`。

### `logs`

透過 RPC 追蹤 Gateway 檔案日誌。

備註：

- TTY 會話會顯示彩色、結構化的檢視；非 TTY 則回退為純文字。
- `--json` 會發出以換行符分隔的 JSON（每行一個日誌事件）。

範例：

```bash
openclaw logs --follow
openclaw logs --limit 200
openclaw logs --plain
openclaw logs --json
openclaw logs --no-color
```

### `gateway <subcommand>`

Gateway CLI 協助程式（針對 RPC 子指令使用 `--url`、`--token`、`--password`、`--timeout`、`--expect-final`）。
當您傳遞 `--url` 時，CLI 不會自動套用設定或環境認證資訊。
請明確包含 `--token` 或 `--password`。遺漏明確的認證資訊會導致錯誤。

子指令：

- `gateway call <method> [--params <json>]`
- `gateway health`
- `gateway status`
- `gateway probe`
- `gateway discover`
- `gateway install|uninstall|start|stop|restart`
- `gateway run`

常見 RPC：

- `config.apply`（驗證 + 寫入設定 + 重新啟動 + 喚醒）
- `config.patch`（合併部分更新 + 重新啟動 + 喚醒）
- `update.run`（執行更新 + 重新啟動 + 喚醒）

提示：直接呼叫 `config.set`/`config.apply`/`config.patch` 時，如果設定已存在，請傳遞來自
`config.get` 的 `baseHash`。

## 模型

關於後援行為和掃描策略，請參閱 [/concepts/models](/en/concepts/models)。

Anthropic 設定權杖（已支援）：

```bash
claude setup-token
openclaw models auth setup-token --provider anthropic
openclaw models status
```

政策說明：此屬技術相容性。Anthropic 過去曾在 Claude Code 之外封鎖部分訂閱使用；在生產環境依賴設定權杖之前，請確認目前的 Anthropic 條款。

### `models`（根）

`openclaw models` 是 `models status` 的別名。

根選項：

- `--status-json`（`models status --json` 的別名）
- `--status-plain`（`models status --plain` 的別名）

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
- `--check` (exit 1=已過期/遺失，2=即將過期)
- `--probe` (對設定的設定檔進行即時探測)
- `--probe-provider <name>`
- `--probe-profile <id>` (重複或以逗號分隔)
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`

一律包含認證概覽以及認證儲存庫中設定檔的 OAuth 過期狀態。
`--probe` 會執行即時請求（可能會消耗權杖並觸發速率限制）。

### `models set <model>`

設定 `agents.defaults.model.primary`。

### `models set-image <model>`

設定 `agents.defaults.imageModel.primary`。

### `models aliases list|add|remove`

選項：

- `list`: `--json`, `--plain`
- `add <alias> <model>`
- `remove <alias>`

### `models fallbacks list|add|remove|clear`

選項：

- `list`: `--json`, `--plain`
- `add <model>`
- `remove <model>`
- `clear`

### `models image-fallbacks list|add|remove|clear`

選項：

- `list`: `--json`, `--plain`
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

- `add`: 互動式認證協助程式
- `setup-token`: `--provider <name>` (預設 `anthropic`), `--yes`
- `paste-token`：`--provider <name>`、`--profile-id <id>`、`--expires-in <duration>`

### `models auth order get|set|clear`

選項：

- `get`：`--provider <name>`、`--agent <id>`、`--json`
- `set`：`--provider <name>`、`--agent <id>`、`<profileIds...>`
- `clear`：`--provider <name>`、`--agent <id>`

## 系統

### `system event`

將系統事件加入佇列並選擇性觸發心跳（閘道 RPC）。

必要：

- `--text <text>`

選項：

- `--mode <now|next-heartbeat>`
- `--json`
- `--url`、`--token`、`--timeout`、`--expect-final`

### `system heartbeat last|enable|disable`

心跳控制（閘道 RPC）。

選項：

- `--json`
- `--url`、`--token`、`--timeout`、`--expect-final`

### `system presence`

列出系統 Presence 項目（閘道 RPC）。

選項：

- `--json`
- `--url`、`--token`、`--timeout`、`--expect-final`

## Cron

管理排程工作（閘道 RPC）。請參閱 [/automation/cron-jobs](/en/automation/cron-jobs)。

子指令：

- `cron status [--json]`
- `cron list [--all] [--json]`（預設為表格輸出；若要原始輸出請使用 `--json`）
- `cron add`（別名：`create`；需要 `--name` 以及 `--at` | `--every` | `--cron` 中的一個，以及 `--system-event` | `--message` 中的一個 Payload）
- `cron edit <id>`（修補欄位）
- `cron rm <id>` (別名: `remove`, `delete`)
- `cron enable <id>`
- `cron disable <id>`
- `cron runs --id <id> [--limit <n>]`
- `cron run <id> [--force]`

所有 `cron` 指令皆接受 `--url`、`--token`、`--timeout`、`--expect-final`。

## Node host

`node` 會執行 **headless node host** 或將其作為背景服務進行管理。請參閱
[`openclaw node`](/en/cli/node)。

子指令:

- `node run --host <gateway-host> --port 18789`
- `node status`
- `node install [--host <gateway-host>] [--port <port>] [--tls] [--tls-fingerprint <sha256>] [--node-id <id>] [--display-name <name>] [--runtime <node|bun>] [--force]`
- `node uninstall`
- `node stop`
- `node restart`

Auth 說明:

- `node` 從環境變數/設定解析 Gateway auth (不使用 `--token`/`--password` 標誌): `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`，然後是 `gateway.auth.*`。在本機模式下，node host 會刻意忽略 `gateway.remote.*`；在 `gateway.mode=remote` 中，`gateway.remote.*` 則會依照遠端優先規則參與其中。
- Node-host auth 解析僅採納 `OPENCLAW_GATEWAY_*` 環境變數。

## Nodes

`nodes` 會與 Gateway 通訊並以配對的節點為目標。請參閱 [/nodes](/en/nodes)。

常用選項:

- `--url`、`--token`、`--timeout`、`--json`

子指令:

- `nodes status [--connected] [--last-connected <duration>]`
- `nodes describe --node <id|name|ip>`
- `nodes list [--connected] [--last-connected <duration>]`
- `nodes pending`
- `nodes approve <requestId>`
- `nodes reject <requestId>`
- `nodes rename --node <id|name|ip> --name <displayName>`
- `nodes invoke --node <id|name|ip> --command <command> [--params <json>] [--invoke-timeout <ms>] [--idempotency-key <key>]`
- `nodes run --node <id|name|ip> [--cwd <path>] [--env KEY=VAL] [--command-timeout <ms>] [--needs-screen-recording] [--invoke-timeout <ms>] <command...>` (mac 節點或 headless node host)
- `nodes notify --node <id|name|ip> [--title <text>] [--body <text>] [--sound <name>] [--priority <passive|active|timeSensitive>] [--delivery <system|overlay|auto>] [--invoke-timeout <ms>]` (僅限 mac)

Camera:

- `nodes camera list --node <id|name|ip>`
- `nodes camera snap --node <id|name|ip> [--facing front|back|both] [--device-id <id>] [--max-width <px>] [--quality <0-1>] [--delay-ms <ms>] [--invoke-timeout <ms>]`
- `nodes camera clip --node <id|name|ip> [--facing front|back] [--device-id <id>] [--duration <ms|10s|1m>] [--no-audio] [--invoke-timeout <ms>]`

Canvas + screen：

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

瀏覽器控制 CLI (專屬 Chrome/Brave/Edge/Chromium)。請參閱 [`openclaw browser`](/en/cli/browser) 以及 [Browser 工具](/en/tools/browser)。

常用選項：

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
