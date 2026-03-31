---
summary: "OpenClaw CLI 參考，包含 `openclaw` 指令、子指令和選項"
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
- [`daemon`](/en/cli/daemon) （閘道服務指令的舊版別名）
- [`clawbot`](/en/cli/clawbot) （舊版別名命名空間）
- [`voicecall`](/en/cli/voicecall) （外掛程式；若已安裝）

## 全域旗標

- `--dev`：將狀態隔離在 `~/.openclaw-dev` 下，並變更預設連接埠。
- `--profile <name>`：將狀態隔離在 `~/.openclaw-<name>` 下。
- `--no-color`：停用 ANSI 顏色。
- `--update`：`openclaw update` 的簡寫（僅限原始碼安裝）。
- `-V`、`--version`、`-v`：列印版本並退出。

## 輸出樣式

- ANSI 顏色和進度指示器僅在 TTY 工作階段中呈現。
- OSC-8 超連結在支援的終端機中會呈現為可點擊的連結；否則我們會退回到純文字 URL。
- `--json`（以及在支援的情況下的 `--plain`）會停用樣式以產生乾淨的輸出。
- `--no-color` 會停用 ANSI 樣式；`NO_COLOR=1` 也會受到尊重。
- 長時間執行的指令會顯示進度指示器（在支援時為 OSC 9;4）。

## 色彩調色盤

OpenClaw 使用 lobster 調色盤來進行 CLI 輸出。

- `accent` (#FF5A2D)：標題、標籤、主要高亮。
- `accentBright` (#FF7A3D): 指令名稱、強調。
- `accentDim` (#D14A22): 次要標題文字。
- `info` (#FF8A5B): 資訊值。
- `success` (#2FBF71): 成功狀態。
- `warn` (#FFB020): 警告、後備、注意。
- `error` (#E23D2D): 錯誤、失敗。
- `muted` (#8B7F77): 弱化、元資料。

調色盤準則來源：`src/terminal/palette.ts` (「龍蝦調色盤」)。

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
  mcp
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

注意：外掛程式可以新增額外的頂層指令 (例如 `openclaw voicecall`)。

## 安全性

- `openclaw security audit` — 稽核設定 + 本機狀態是否有常見的安全性陷阱。
- `openclaw security audit --deep` — 盡力而為的即時 Gateway 探測。
- `openclaw security audit --fix` — 收緊安全預設值並 chmod 狀態/配置。

## 密鑰

- `openclaw secrets reload` — 重新解析引用並原子地交換執行時快照。
- `openclaw secrets audit` — 掃描明文殘留、未解析的引用和優先級漂移（`--allow-exec` 以在稽核期間執行 exec 提供者）。
- `openclaw secrets configure` — 提供者設置、SecretRef 對映以及預檢/應用的互動式輔助工具（`--allow-exec` 以在預檢和包含 exec 的應用流程期間執行 exec 提供者）。
- `openclaw secrets apply --from <plan.json>` — 應用先前產生的計劃（支援 `--dry-run`；使用 `--allow-exec` 以在試執行和包含 exec 的寫入計劃中允許 exec 提供者）。

## 外掛程式

管理擴充功能及其配置：

- `openclaw plugins list` — 探索外掛程式（請使用 `--json` 以取得機器可讀輸出）。
- `openclaw plugins inspect <id>` — 顯示外掛程式的詳細資訊（`info` 為別名）。
- `openclaw plugins install <path|.tgz|npm-spec|plugin@marketplace>` — 安裝外掛程式（或將外掛程式路徑新增至 `plugins.load.paths`）。
- `openclaw plugins marketplace list <marketplace>` — 在安裝前列出市集項目。
- `openclaw plugins enable <id>` / `disable <id>` — 切換 `plugins.entries.<id>.enabled`。
- `openclaw plugins doctor` — 回報外掛程式載入錯誤。

大部分的外掛程式變更需要重新啟動閘道。請參閱 [/plugin](/en/tools/plugin)。

## 記憶體

針對 `MEMORY.md` + `memory/*.md` 的向量搜尋：

- `openclaw memory status` — 顯示索引統計資料。
- `openclaw memory index` — 重新建立記憶體檔案的索引。
- `openclaw memory search "<query>"` (或 `--query "<query>"`) — 對記憶體進行語義搜索。

## Chat 斜線指令

Chat 訊息支援 `/...` 指令（文字與原生）。參見 [/tools/slash-commands](/en/tools/slash-commands)。

重點：

- `/status` 用於快速診斷。
- `/config` 用於持久化的設定變更。
- `/debug` 用於僅限執行時期的設定覆寫（在記憶體中而非磁碟上；需要 `commands.debug: true`）。

## 設定 + 入門

### `setup`

初始化設定 + 工作區。

選項：

- `--workspace <dir>`：代理程式工作區路徑（預設為 `~/.openclaw/workspace`）。
- `--wizard`：執行入門。
- `--non-interactive`：執行入門且不提示。
- `--mode <local|remote>`：onboard 模式。
- `--remote-url <url>`：遠端 Gateway URL。
- `--remote-token <token>`：遠端 Gateway 權杖。

當存在任何 onboarding 標誌（`--non-interactive`、`--mode`、`--remote-url`、`--remote-token`）時，onboarding 會自動執行。

### `onboard`

針對 gateway、workspace 和 skills 的互動式 onboarding。

選項：

- `--workspace <dir>`
- `--reset`（在 onboarding 之前重設設定 + 憑證 + 會話）
- `--reset-scope <config|config+creds+sessions|full>`（預設 `config+creds+sessions`；使用 `full` 來同時移除 workspace）
- `--non-interactive`
- `--mode <local|remote>`
- `--flow <quickstart|advanced|manual>`（manual 是 advanced 的別名）
- `--auth-choice <setup-token|token|chutes|openai-codex|openai-api-key|openrouter-api-key|ollama|ai-gateway-api-key|moonshot-api-key|moonshot-api-key-cn|kimi-code-api-key|synthetic-api-key|venice-api-key|gemini-api-key|zai-api-key|mistral-api-key|apiKey|minimax-api|minimax-api-lightning|opencode-zen|opencode-go|custom-api-key|skip>`
- `--token-provider <id>`（非互動式；與 `--auth-choice token` 搭配使用）
- `--token <token>`（非互動式；與 `--auth-choice token` 搭配使用）
- `--token-profile-id <id>`（非互動式；預設：`<provider>:manual`）
- `--token-expires-in <duration>`（非互動式；例如 `365d`、`12h`）
- `--secret-input-mode <plaintext|ref>`（預設 `plaintext`；使用 `ref` 儲存提供者預設環境變數參考，而非明文金鑰）
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
- `--custom-base-url <url>`（非互動式；與 `--auth-choice custom-api-key` 或 `--auth-choice ollama` 搭配使用）
- `--custom-model-id <id>`（非互動式；與 `--auth-choice custom-api-key` 或 `--auth-choice ollama` 搭配使用）
- `--custom-api-key <key>`（非互動式；選用；與 `--auth-choice custom-api-key` 搭配使用；省略時則回退至 `CUSTOM_API_KEY`）
- `--custom-provider-id <id>` (非互動式；可選的自訂供應商 ID)
- `--custom-compatibility <openai|anthropic>` (非互動式；可選；預設為 `openai`)
- `--gateway-port <port>`
- `--gateway-bind <loopback|lan|tailnet|auto|custom>`
- `--gateway-auth <token|password>`
- `--gateway-token <token>`
- `--gateway-token-ref-env <name>` (非互動式；將 `gateway.auth.token` 儲存為環境變數 SecretRef；要求該環境變數必須已設定；不能與 `--gateway-token` 結合使用)
- `--gateway-password <password>`
- `--remote-url <url>`
- `--remote-token <token>`
- `--tailscale <off|serve|funnel>`
- `--tailscale-reset-on-exit`
- `--install-daemon`
- `--no-install-daemon` (別名: `--skip-daemon`)
- `--daemon-runtime <node|bun>`
- `--skip-channels`
- `--skip-skills`
- `--skip-health`
- `--skip-ui`
- `--node-manager <npm|pnpm|bun>` (建議使用 pnpm；不建議在 Gateway 執行階段使用 bun)
- `--json`

### `configure`

互動式設定精靈（模型、通道、技能、Gateway）。

### `config`

非互動式設定輔助工具 (get/set/unset/file/schema/validate)。在沒有子指令的情況下執行 `openclaw config` 會啟動精靈。

子指令：

- `config get <path>`：列印設定值 (點號/括號路徑)。
- `config set`：支援四種指派模式：
  - 值模式：`config set <path> <value>`（JSON5 或字串解析）
  - SecretRef 建構器模式：`config set <path> --ref-provider <provider> --ref-source <source> --ref-id <id>`
  - 提供者建構器模式：`config set secrets.providers.<alias> --provider-source <env|file|exec> ...`
  - 批次模式：`config set --batch-json '<json>'` 或 `config set --batch-file <path>`
- `config set --dry-run`：在不寫入 `openclaw.json` 的情況下驗證指派（預設會跳過 exec SecretRef 檢查）。
- `config set --allow-exec --dry-run`：選擇啟用 exec SecretRef 試執行檢查（可能會執行提供者指令）。
- `config set --dry-run --json`：發出機器可讀的試執行輸出（檢查 + 完整性訊號、作業、已檢查/已跳過的參照、錯誤）。
- `config set --strict-json`：要求路徑/值輸入進行 JSON5 解析。`--json` 在試執行輸出模式之外仍是嚴格解析的舊版別名。
- `config unset <path>`：移除一個值。
- `config file`：列印目前設定檔的路徑。
- `config schema`：列印 `openclaw.json` 的產生 JSON 綱要。
- `config validate`：在不啟動 gateway 的情況下，根據綱要驗證目前的設定。
- `config validate --json`：輸出機器可讀的 JSON 格式。

### `doctor`

健康檢查 + 快速修復 (設定 + gateway + 舊版服務)。

選項：

- `--no-workspace-suggestions`：停用工作區記憶體提示。
- `--yes`：接受預設值而不提示 (無介面模式)。
- `--non-interactive`：跳過提示；僅套用安全的遷移。
- `--deep`：掃描系統服務是否有額外的安裝 gateway。

## 頻道輔助工具

### `channels`

管理聊天頻道帳號 (WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (plugin)/Signal/iMessage/Microsoft Teams)。

子指令：

- `channels list`：顯示已設定的頻道與驗證設定檔。
- `channels status`：檢查閘道連線能力與頻道健全狀況 (`--probe` 會執行額外檢查；請使用 `openclaw health` 或 `openclaw status --deep` 進行閘道健全狀況探測)。
- 提示：當 `channels status` 偵測到常見設定錯誤時，會印出包含建議修復方式的警告 (然後指引您前往 `openclaw doctor`)。
- `channels logs`：顯示來自閘道日誌檔的近期頻道日誌。
- `channels add`：若未傳入旗標則使用精靈樣式設定；傳入旗標則切換至非互動模式。
  - 當將非預設帳戶新增至仍在使用單一帳戶頂層配置的通道時，OpenClaw 會在寫入新帳戶之前將帳戶範圍的值移至 `channels.<channel>.accounts.default`。
  - 非互動式 `channels add` 不會自動建立/升級綁定；僅限通道的綁定會繼續符合預設帳戶。
- `channels remove`：預設停用；傳遞 `--delete` 以在不提示的情況下移除配置項目。
- `channels login`：互動式通道登入（僅限 WhatsApp Web）。
- `channels logout`：登出通道階段（如果支援）。

通用選項：

- `--channel <name>`：`whatsapp|telegram|discord|googlechat|slack|mattermost|signal|imessage|msteams`
- `--account <id>`：通道帳戶 ID（預設為 `default`）
- `--name <label>`: 帳戶的顯示名稱

`channels login` 選項：

- `--channel <channel>` (預設 `whatsapp`；支援 `whatsapp`/`web`)
- `--account <id>`
- `--verbose`

`channels logout` 選項：

- `--channel <channel>` (預設 `whatsapp`)
- `--account <id>`

`channels list` 選項：

- `--no-usage`: 略過模型供應商使用量/配額快照 (僅限 OAuth/API 支援)。
- `--json`: 輸出 JSON (包含使用量，除非設定了 `--no-usage`)。

`channels logs` 選項：

- `--channel <name|all>` (預設 `all`)
- `--lines <n>` (預設 `200`)
- `--json`

更多細節：[/concepts/oauth](/en/concepts/oauth)

範例：

```bash
openclaw channels add --channel telegram --account alerts --name "Alerts Bot" --token $TELEGRAM_BOT_TOKEN
openclaw channels add --channel discord --account work --name "Work Bot" --token $DISCORD_BOT_TOKEN
openclaw channels remove --channel discord --account work --delete
openclaw channels status --probe
openclaw status --deep
```

### `skills`

列出並檢查可用技能及其就緒資訊。

子指令：

- `skills search [query...]`：搜尋 ClawHub 技能。
- `skills install <slug>`：將技能從 ClawHub 安裝到目前的工作區。
- `skills update <slug|--all>`：更新追蹤的 ClawHub 技能。
- `skills list`：列出技能（當未指定子指令時為預設動作）。
- `skills info <name>`：顯示單一技能的詳細資料。
- `skills check`：就緒與缺失需求的摘要。

選項：

- `--eligible`：僅顯示就緒的技能。
- `--json`：輸出 JSON（無樣式）。
- `-v`, `--verbose`: 包含缺失的需求細節。

提示：對於由 ClawHub 支援的技能，請使用 `openclaw skills search`、`openclaw skills install` 和 `openclaw skills update`。

### `pairing`

跨管道核准 DM 配對請求。

子指令：

- `pairing list [channel] [--channel <channel>] [--account <id>] [--json]`
- `pairing approve <channel> <code> [--account <id>] [--notify]`
- `pairing approve --channel <channel> [--account <id>] <code> [--notify]`

### `devices`

管理閘道裝置配對條目及各角色的裝置權杖。

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

- `webhooks gmail setup` （需要 `--account <email>`；支援 `--project`、`--topic`、`--subscription`、`--label`、`--hook-url`、`--hook-token`、`--push-token`、`--bind`、`--port`、`--path`、`--include-body`、`--max-bytes`、`--renew-minutes`、`--tailscale`、`--tailscale-path`、`--tailscale-target`、`--push-endpoint`、`--json`）
- `webhooks gmail run` (相同旗標的執行時期覆寫)

### `dns setup`

廣域探索 DNS 輔助程式 (CoreDNS + Tailscale)。請參閱 [/gateway/discovery](/en/gateway/discovery)。

選項：

- `--apply`: 安裝/更新 CoreDNS 配置 (需要 sudo；僅限 macOS)。

## 訊息傳遞 + 代理程式

### `message`

統一輸出訊息傳遞 + 頻道動作。

請參閱： [/cli/message](/en/cli/message)

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

透過閘道（或內嵌的 `--local`）執行一次 Agent 週期。

必要：

- `--message <text>`

選項：

- `--to <dest>` （用於 Session 金鑰與選用性傳遞）
- `--session-id <id>`
- `--thinking <off|minimal|low|medium|high|xhigh>` （僅限 GPT-5.2 + Codex 模型）
- `--verbose <on|full|off>`
- `--channel <whatsapp|telegram|discord|slack|mattermost|signal|imessage|msteams>`
- `--local`
- `--deliver`
- `--json`
- `--timeout <seconds>`

### `agents`

管理隔離的 Agent （工作區 + 驗證 + 路由）。

#### `agents list`

列出已設定的 Agent。

選項：

- `--json`
- `--bindings`

#### `agents add [name]`

新增一個隔離的代理。除非傳入旗標（或 `--non-interactive`），否則會執行引導精靈；在非互動模式下，`--workspace` 是必填的。

選項：

- `--workspace <dir>`
- `--model <id>`
- `--agent-dir <dir>`
- `--bind <channel[:accountId]>` (可重複)
- `--non-interactive`
- `--json`

綁定規格使用 `channel[:accountId]`。當省略 `accountId` 時，OpenClaw 可能會透過通道預設值/外掛程式掛鈎來解析帳戶範圍；否則這是不含明確帳戶範圍的通道綁定。

#### `agents bindings`

列出路由綁定。

選項：

- `--agent <id>`
- `--json`

#### `agents bind`

為代理新增路由綁定。

選項：

- `--agent <id>`
- `--bind <channel[:accountId]>` (可重複)
- `--json`

#### `agents unbind`

移除代理程式的路由綁定。

選項：

- `--agent <id>`
- `--bind <channel[:accountId]>` (可重複)
- `--all`
- `--json`

#### `agents delete <id>`

刪除代理程式並清理其工作區和狀態。

選項：

- `--force`
- `--json`

### `acp`

執行連接 IDE 與 Gateway 的 ACP 橋接器。

請參閱 [`acp`](/en/cli/acp) 以了解完整的選項和範例。

### `status`

顯示連結的工作階段健康狀況和最近的收件者。

選項：

- `--json`
- `--all`（完整診斷；唯讀，可貼上）
- `--deep`（探測通道）
- `--usage`（顯示模型供應商使用量/配額）
- `--timeout <ms>`
- `--verbose`
- `--debug`（`--verbose` 的別名）

備註：

- 概覽在可用時包含 Gateway + 節點主機服務狀態。

### 使用量追蹤

當有 OAuth/API 憑證可用時，OpenClaw 可以顯示供應商使用量/配額。

顯示位置：

- `/status`（在可用時新增簡短的供應商使用量行）
- `openclaw status --usage`（列印完整的供應商細項）
- macOS 功能表列（Context 下的 Usage 區塊）

備註：

- 資料直接來自供應商使用量端點（無估算值）。
- 提供商：Anthropic、GitHub Copilot、OpenAI Codex OAuth，以及透過內建的 `google` 外掛程式提供的 Gemini CLI，還有已設定好的 Antigravity。
- 如果不存在相符的憑證，使用情況會被隱藏。
- 詳細資訊：請參閱[使用情況追蹤](/en/concepts/usage-tracking)。

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

解除安裝閘道服務 + 本地資料 (CLI 保留)。

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
- `--reset` (重置開發設定 + 憑證 + 會話 + 工作區)
- `--force` (終止連接埠上現有的監聽程式)
- `--verbose`
- `--cli-backend-logs`
- `--claude-cli-logs` (已棄用的別名)
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

- `gateway status` 預設會使用服務解析的連接埠/組態來探測 Gateway RPC (可使用 `--url/--token/--password` 覆寫)。
- `gateway status` 支援 `--no-probe`、`--deep`、`--require-rpc` 和 `--json` 用於腳本編寫。
- `gateway status` 也會在偵測到時顯示舊版或額外的閘道服務 (`--deep` 會新增系統層級掃描)。以設定檔命名的 OpenClaw 服務會被視為一等公民，且不會被標記為「額外」。
- `gateway status` 會列印 CLI 使用的配置路徑與服務可能使用的配置（服務環境）的對比，以及解析後的探測目標 URL。
- 如果 Gateway 驗證的 SecretRefs 在當前命令路徑中未解析，`gateway status --json` 僅在探測連線/驗證失敗時回報 `rpc.authWarning`（當探測成功時會隱藏警告）。
- 在 Linux systemd 安裝上，狀態 token 漂移檢查包含 `Environment=` 和 `EnvironmentFile=` 兩個單元來源。
- `gateway install|uninstall|start|stop|restart` 支援 `--json` 用於腳本編寫（預設輸出保持人類易讀）。
- `gateway install` 預設使用 Node 執行時；不建議使用 bun（WhatsApp/Telegram 錯誤）。
- `gateway install` 選項：`--port`、`--runtime`、`--token`、`--force`、`--json`。

### `logs`

透過 RPC 追蹤 Gateway 檔案記錄。

備註：

- TTY 連線階段會顯示色彩與結構化檢視；非 TTY 則會退回為純文字。
- `--json` 會輸出行分隔的 JSON（每行一個記錄事件）。

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
當您傳遞 `--url` 時，CLI 不會自動套用設定或環境認證。
請明確包含 `--token` 或 `--password`。缺少明確的認證會導致錯誤。

子指令：

- `gateway call <method> [--params <json>]`
- `gateway health`
- `gateway status`
- `gateway probe`
- `gateway discover`
- `gateway install|uninstall|start|stop|restart`
- `gateway run`

常見的 RPC：

- `config.apply` (驗證 + 寫入設定 + 重新啟動 + 喚醒)
- `config.patch` (合併部分更新 + 重新啟動 + 喚醒)
- `update.run` (執行更新 + 重新啟動 + 喚醒)

提示：直接呼叫 `config.set`/`config.apply`/`config.patch` 時，如果設定已存在，請從 `config.get` 傳入 `baseHash`。

## 模型

請參閱 [/concepts/models](/en/concepts/models) 以了解後備行為與掃描策略。

Anthropic setup-token (已支援)：

```bash
claude setup-token
openclaw models auth setup-token --provider anthropic
openclaw models status
```

政策提示：這屬技術相容性。Anthropic 過去曾封鎖部分在 Claude Code 之外的訂閱使用；在生產環境依賴 setup-token 前，請確認目前的 Anthropic 條款。

Anthropic Claude CLI 遷移：

```bash
openclaw models auth login --provider anthropic --method cli --set-default
openclaw onboard --auth-choice anthropic-cli
```

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
- `--check` (退出程式碼 1=已過期/遺失，2=即將過期)
- `--probe` (即時探測已設定的驗證設定檔)
- `--probe-provider <name>`
- `--probe-profile <id>` (重複或以逗號分隔)
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`

一律包含授權總覽以及授權儲存空間中設定檔的 OAuth 到期狀態。
`--probe` 會執行即時請求（可能會消耗代幣並觸發速率限制）。

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

- `add`: 互動式身份驗證輔助程式
- `setup-token`: `--provider <name>` (預設 `anthropic`), `--yes`
- `paste-token`: `--provider <name>`, `--profile-id <id>`, `--expires-in <duration>`

### `models auth order get|set|clear`

選項:

- `get`: `--provider <name>`, `--agent <id>`, `--json`
- `set`: `--provider <name>`, `--agent <id>`, `<profileIds...>`
- `clear`: `--provider <name>`, `--agent <id>`

## 系統

### `system event`

將系統事件加入佇列並選擇性觸發心跳 (Gateway RPC)。

必要:

- `--text <text>`

選項：

- `--mode <now|next-heartbeat>`
- `--json`
- `--url`、`--token`、`--timeout`、`--expect-final`

### `system heartbeat last|enable|disable`

心跳控制 (Gateway RPC)。

選項：

- `--json`
- `--url`、`--token`、`--timeout`、`--expect-final`

### `system presence`

列出系統 presence 項目 (Gateway RPC)。

選項：

- `--json`
- `--url`、`--token`、`--timeout`、`--expect-final`

## Cron

管理排程作業 (Gateway RPC)。請參閱 [/automation/cron-jobs](/en/automation/cron-jobs)。

子命令：

- `cron status [--json]`
- `cron list [--all] [--json]` (預設為表格輸出；使用 `--json` 取得原始格式)
- `cron add` (別名：`create`；需要 `--name` 以及 `--at` | `--every` | `--cron` 其中之一，以及 `--system-event` | `--message` 其中一個 payload)
- `cron edit <id>` (修補欄位)
- `cron rm <id>` (別名：`remove`、`delete`)
- `cron enable <id>`
- `cron disable <id>`
- `cron runs --id <id> [--limit <n>]`
- `cron run <id> [--force]`

所有 `cron` 指令都接受 `--url`、`--token`、`--timeout`、`--expect-final`。

## Node host

`node` 會執行 **headless node host** 或將其作為背景服務進行管理。請參閱
[`openclaw node`](/en/cli/node)。

子指令：

- `node run --host <gateway-host> --port 18789`
- `node status`
- `node install [--host <gateway-host>] [--port <port>] [--tls] [--tls-fingerprint <sha256>] [--node-id <id>] [--display-name <name>] [--runtime <node|bun>] [--force]`
- `node uninstall`
- `node stop`
- `node restart`

Auth notes：

- `node` 從環境變數/設定解析 gateway auth（無 `--token`/`--password` 標誌）：`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`，然後是 `gateway.auth.*`。在本地模式下，節點主機會故意忽略 `gateway.remote.*`；在 `gateway.mode=remote` 中，`gateway.remote.*` 根據遠端優先順序規則參與其中。
- 節點主機 (Node-host) auth 解析僅支援 `OPENCLAW_GATEWAY_*` 環境變數。

## 節點

`nodes` 與 Gateway 通訊並以已配對的節點為目標。請參閱 [/nodes](/en/nodes)。

常見選項：

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

瀏覽器控制 CLI（專屬 Chrome/Brave/Edge/Chromium）。請參閱 [`openclaw browser`](/en/cli/browser) 與 [瀏覽器工具](/en/tools/browser)。

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

## 文件搜尋

### `docs [query...]`

搜尋即時文件索引。

## TUI

### `tui`

開啟連線到 Gateway 的終端機 UI。

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
