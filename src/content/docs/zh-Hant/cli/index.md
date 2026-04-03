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
- [`tasks`](/en/cli/index#tasks)
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
- `--container <name>`：指定具名容器以執行。
- `--no-color`：停用 ANSI 顏色。
- `--update`：`openclaw update` 的簡寫（僅限來源安裝）。
- `-V`、`--version`、`-v`：列印版本並結束。

## 輸出樣式

- ANSI 顏色和進度指示器僅在 TTY 工作階段中轉譯。
- OSC-8 超連結在支援的終端機中會顯示為可點擊的連結；否則我們會退回到純文字 URL。
- `--json` （以及 `--plain` 在支援的情況下）會停用樣式以產生乾淨的輸出。
- `--no-color` 會停用 ANSI 樣式；`NO_COLOR=1` 也會被遵守。
- 長時間執行的指令會顯示進度指示器（在支援時使用 OSC 9;4）。

## 色彩調色盤

OpenClaw 使用龍蝦調色盤來進行 CLI 輸出。

- `accent` (#FF5A2D)：標題、標籤、主要高亮。
- `accentBright` (#FF7A3D)：指令名稱、強調。
- `accentDim` (#D14A22)：次要高亮文字。
- `info` (#FF8A5B)：資訊值。
- `success` (#2FBF71)：成功狀態。
- `warn` (#FFB020)：警告、後備方案、注意。
- `error` (#E23D2D)：錯誤、失敗。
- `muted` (#8B7F77)：弱調、詮釋資料。

調色盤準則來源：`src/terminal/palette.ts`（「龍蝦調色盤」）。

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
    bindings
    bind
    unbind
    set-identity
  acp
  mcp
  status
  health
  sessions
    cleanup
  tasks
    list
    show
    notify
    cancel
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

- `openclaw security audit` — 稽核組態 + 本地狀態是否有常見的安全性陷阱。
- `openclaw security audit --deep` — 盡力而為的即時 Gateway 探測。
- `openclaw security audit --fix` — 收緊安全預設值並修改狀態/組態的權限。

## 密鑰

- `openclaw secrets reload` — 重新解析參照並原子地交換執行時期快照。
- `openclaw secrets audit` — 掃描純文字殘留、未解析的參照和優先順序漂移（`--allow-exec` 可在稽核期間執行 exec 提供者）。
- `openclaw secrets configure` — 提供者設定 + SecretRef 對應 + 預檢/套用的互動式輔助工具（`--allow-exec` 可在預檢和包含 exec 的套用流程中執行 exec 提供者）。
- `openclaw secrets apply --from <plan.json>` — 套用先前產生的計畫（支援 `--dry-run`；使用 `--allow-exec` 可允許在試執行和包含 exec 的寫入計畫中使用 exec 提供者）。

## 外掛程式

管理擴充功能及其設定：

- `openclaw plugins list` — 探索外掛（使用 `--json` 取得機器可讀輸出）。
- `openclaw plugins inspect <id>` — 顯示外掛詳細資訊（`info` 為別名）。
- `openclaw plugins install <path|.tgz|npm-spec|plugin@marketplace>` — 安裝外掛（或將外掛路徑新增至 `plugins.load.paths`）。
- `openclaw plugins marketplace list <marketplace>` — 安裝前列出市集項目。
- `openclaw plugins enable <id>` / `disable <id>` — 切換 `plugins.entries.<id>.enabled`。
- `openclaw plugins doctor` — 回報外掛載入錯誤。

大部分外掛變更需要重新啟動 gateway。參閱 [/plugin](/en/tools/plugin)。

## 記憶體

針對 `MEMORY.md` + `memory/*.md` 的向量搜尋：

- `openclaw memory status` — 顯示索引統計資料。
- `openclaw memory index` — 重新索引記憶體檔案。
- `openclaw memory search "<query>"` （或 `--query "<query>"`）— 對記憶體進行語意搜尋。

## Chat 斜線指令

Chat 訊息支援 `/...` 指令（文字與原生）。參閱 [/tools/slash-commands](/en/tools/slash-commands)。

重點摘要：

- 使用 `/status` 進行快速診斷。
- 使用 `/config` 進行持續性設定變更。
- 使用 `/debug` 進行僅限執行時期的設定覆寫（儲存在記憶體中，而非硬碟；需要 `commands.debug: true`）。

## 設定 + 入門

### `setup`

初始化設定 + 工作區。

選項：

- `--workspace <dir>`：agent 工作區路徑（預設 `~/.openclaw/workspace`）。
- `--wizard`：執行入門流程。
- `--non-interactive`：執行入門流程而不提示。
- `--mode <local|remote>`：入門模式。
- `--remote-url <url>`：遠端 Gateway URL。
- `--remote-token <token>`：遠端 Gateway 權杖。

當存在任何入門旗標時，入門流程會自動執行（`--non-interactive`、`--mode`、`--remote-url`、`--remote-token`）。

### `onboard`

「閘道、工作區與技能的互動式引導。」

「選項：」

- `--workspace <dir>`
- `--reset` （在引導前重設設定 + 憑證 + 工作階段）
- `--reset-scope <config|config+creds+sessions|full>` （預設為 `config+creds+sessions`；使用 `full` 一併移除工作區）
- `--non-interactive`
- `--mode <local|remote>`
- `--flow <quickstart|advanced|manual>` （manual 為 advanced 的別名）
- `--auth-choice <choice>`，其中 `<choice>` 為下列之一：
  `setup-token`、`token`、`chutes`、`deepseek-api-key`、`openai-codex`、`openai-api-key`、
  `openrouter-api-key`、`kilocode-api-key`、`litellm-api-key`、`ai-gateway-api-key`、
  `cloudflare-ai-gateway-api-key`、`moonshot-api-key`、`moonshot-api-key-cn`、
  `kimi-code-api-key`、`synthetic-api-key`、`venice-api-key`、`together-api-key`、
  `huggingface-api-key`、`apiKey`、`gemini-api-key`、`google-gemini-cli`、`zai-api-key`、
  `zai-coding-global`、`zai-coding-cn`、`zai-global`、`zai-cn`、`xiaomi-api-key`、
  `minimax-global-oauth`、`minimax-global-api`、`minimax-cn-oauth`、`minimax-cn-api`、
  `opencode-zen`、`opencode-go`、`github-copilot`、`copilot-proxy`、`xai-api-key`、
  `mistral-api-key`、`volcengine-api-key`、`byteplus-api-key`、`qianfan-api-key`、
  `modelstudio-standard-api-key-cn`、`modelstudio-standard-api-key`、
  `modelstudio-api-key-cn`、`modelstudio-api-key`、`custom-api-key`、`skip`
- `--token-provider <id>` （非互動式；與 `--auth-choice token` 搭配使用）
- `--token <token>` （非互動式；與 `--auth-choice token` 搭配使用）
- `--token-profile-id <id>` （非互動式；預設值： `<provider>:manual`）
- `--token-expires-in <duration>` （非互動式；例如 `365d`、`12h`）
- `--secret-input-mode <plaintext|ref>` （預設值 `plaintext`；請使用 `ref` 來儲存提供者預設的環境變數參照，而非純文字金鑰）
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
- `--custom-base-url <url>` （非互動式；與 `--auth-choice custom-api-key` 搭配使用）
- `--custom-model-id <id>` （非互動式；與 `--auth-choice custom-api-key` 搭配使用）
- `--custom-api-key <key>` （非互動式；選用；與 `--auth-choice custom-api-key` 搭配使用；省略時則回退至 `CUSTOM_API_KEY`）
- `--custom-provider-id <id>` （非互動式；選用的自訂提供者 ID）
- `--custom-compatibility <openai|anthropic>` （非互動式；選用；預設值 `openai`）
- `--gateway-port <port>`
- `--gateway-bind <loopback|lan|tailnet|auto|custom>`
- `--gateway-auth <token|password>`
- `--gateway-token <token>`
- `--gateway-token-ref-env <name>` （非互動式；將 `gateway.auth.token` 儲存為環境變數 SecretRef；要求該環境變數必須已設定；無法與 `--gateway-token` 搭配使用）
- `--gateway-password <password>`
- `--remote-url <url>`
- `--remote-token <token>`
- `--tailscale <off|serve|funnel>`
- `--tailscale-reset-on-exit`
- `--install-daemon`
- `--no-install-daemon` （別名： `--skip-daemon`）
- `--daemon-runtime <node|bun>`
- `--skip-channels`
- `--skip-skills`
- `--skip-search`
- `--skip-health`
- `--skip-ui`
- `--cloudflare-ai-gateway-account-id <id>`
- `--cloudflare-ai-gateway-gateway-id <id>`
- `--node-manager <npm|pnpm|bun>` (建議使用 pnpm；不建議在 Gateway 執行環境使用 bun)
- `--json`

### `configure`

互動式組態精靈 (models, channels, skills, gateway)。

### `config`

非互動式組態輔助工具 (get/set/unset/file/schema/validate)。執行 `openclaw config` 且不加子指令時會啟動精靈。

子指令：

- `config get <path>`：列印組態值 (dot/bracket path)。
- `config set`：支援四種指派模式：
  - 數值模式：`config set <path> <value>` (JSON5 或字串解析)
  - SecretRef 建構器模式：`config set <path> --ref-provider <provider> --ref-source <source> --ref-id <id>`
  - provider 建構器模式：`config set secrets.providers.<alias> --provider-source <env|file|exec> ...`
  - 批次模式：`config set --batch-json '<json>'` 或 `config set --batch-file <path>`
- `config set --dry-run`：驗證指派而不寫入 `openclaw.json` (預設會跳過 exec SecretRef 檢查)。
- `config set --allow-exec --dry-run`：選擇加入 exec SecretRef 試執行檢查 (可能會執行 provider 指令)。
- `config set --dry-run --json`：輸出機器可讀的試執行結果 (檢查 + 完整性訊號、操作、已檢查/跳過的 refs、錯誤)。
- `config set --strict-json`：要求對 path/value 輸入進行 JSON5 解析。`--json` 在試執行輸出模式之外仍保留作為嚴格解析的舊版別名。
- `config unset <path>`：移除數值。
- `config file`：列印使用中的組態檔路徑。
- `config schema`：列印 `openclaw.json` 的產生 JSON schema。
- `config validate`：在不啟動 gateway 的情況下，根據 schema 驗證目前的組態。
- `config validate --json`：輸出機器可讀的 JSON 格式結果。

### `doctor`

健康檢查 + 快速修復（設定 + 閘道 + 舊版服務）。

選項：

- `--no-workspace-suggestions`：停用工作區記憶體提示。
- `--yes`：接受預設值而不提示（無頭模式）。
- `--non-interactive`：略過提示；僅套用安全的遷移。
- `--deep`：掃描系統服務以尋找額外的閘道安裝。
- `--repair`（別名：`--fix`）：嘗試對偵測到的問題進行自動修復。
- `--force`：強制修復，即使並非嚴格需要。
- `--generate-gateway-token`：產生新的閘道驗證權杖。

## 頻道輔助工具

### `channels`

管理聊天頻道帳戶（WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (plugin)/Signal/iMessage/Microsoft Teams）。

子指令：

- `channels list`：顯示已設定的頻道和驗證設定檔。
- `channels status`：檢查閘道連線能力和頻道健康狀況（`--probe` 會執行額外檢查；請使用 `openclaw health` 或 `openclaw status --deep` 進行閘道健康探測）。
- 提示：當 `channels status` 偵測到常見的設定錯誤時，會列印帶有建議修復方法的警告（然後會引導您至 `openclaw doctor`）。
- `channels logs`：顯示來自閘道記錄檔的近期頻道記錄。
- `channels add`：若未傳遞旗標，則使用精靈樣式進行設定；旗標會切換至非互動模式。
  - 當將非預設帳戶新增至仍使用單一帳戶頂層設定的頻道時，OpenClaw 會在寫入新帳戶之前將帳戶範圍的值移動至 `channels.<channel>.accounts.default`。
  - 非互動式 `channels add` 不會自動建立/升級綁定；僅限頻道的綁定會繼續符合預設帳戶。
- `channels remove`：預設停用；傳遞 `--delete` 以在不提示的情況下移除設定項目。
- `channels login`：互動式頻道登入（僅限 WhatsApp Web）。
- `channels logout`：登出頻道階段（如果支援）。

常用選項：

- `--channel <name>`: `whatsapp|telegram|discord|googlechat|slack|mattermost|signal|imessage|msteams`
- `--account <id>`: 頻道帳戶 ID (預設 `default`)
- `--name <label>`: 帳戶的顯示名稱

`channels login` 選項：

- `--channel <channel>` (預設 `whatsapp`；支援 `whatsapp`/`web`)
- `--account <id>`
- `--verbose`

`channels logout` 選項：

- `--channel <channel>` (預設 `whatsapp`)
- `--account <id>`

`channels list` 選項：

- `--no-usage`：略過模型提供者使用量/配額快照 (僅限 OAuth/API 支援)。
- `--json`：輸出 JSON (除非設定 `--no-usage`，否則包含使用量)。

`channels logs` 選項：

- `--channel <name|all>` (預設 `all`)
- `--lines <n>` (預設 `200`)
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

列出並檢查可用的技能及其準備就緒資訊。

子指令：

- `skills search [query...]`：搜尋 ClawHub 技能。
- `skills install <slug>`：將技能從 ClawHub 安裝至目前的工作區。
- `skills update <slug|--all>`：更新追蹤的 ClawHub 技能。
- `skills list`：列出技能 (未提供子指令時為預設)。
- `skills info <name>`：顯示單一技能的詳細資訊。
- `skills check`：已就緒與缺少需求的摘要。

選項：

- `--eligible`：僅顯示已就緒的技能。
- `--json`：輸出 JSON (無樣式)。
- `-v`, `--verbose`：包含缺少需求的詳細資訊。

提示：對於 ClawHub 支援的技能，請使用 `openclaw skills search`、`openclaw skills install` 和 `openclaw skills update`。

### `pairing`

跨頻道批准 DM 配對請求。

子指令：

- `pairing list [channel] [--channel <channel>] [--account <id>] [--json]`
- `pairing approve <channel> <code> [--account <id>] [--notify]`
- `pairing approve --channel <channel> [--account <id>] <code> [--notify]`

### `devices`

管理閘道裝置配對條目與各角色的裝置 Token。

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
- `webhooks gmail run` (相同標誌的執行階段覆寫)

### `dns setup`

廣域探索 DNS 協助程式 (CoreDNS + Tailscale)。請參閱 [/gateway/discovery](/en/gateway/discovery)。

選項：

- `--apply`：安裝/更新 CoreDNS 設定 (需要 sudo；僅限 macOS)。

## 傳訊 + Agent

### `message`

統一的出站傳訊 + 頻道操作。

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

透過 Gateway（或內嵌 `--local`）執行一個 agent 週期。

必填：

- `-m, --message <text>`

選項：

- `-t, --to <dest>` (用於 session key 和選用傳遞)
- `--session-id <id>`
- `--agent <id>` (agent id；覆寫路由綁定)
- `--thinking <off|minimal|low|medium|high|xhigh>` (供應商支援情況各異；在 CLI 層級不受模型限制)
- `--verbose <on|off>`
- `--channel <channel>` (傳遞通道；省略以使用主 session 通道)
- `--reply-to <target>` (傳遞目標覆寫，與 session 路由分開)
- `--reply-channel <channel>` (傳遞通道覆寫)
- `--reply-account <id>` (傳遞帳號 ID 覆寫)
- `--local`
- `--deliver`
- `--json`
- `--timeout <seconds>`

### `agents`

管理隔離的 agent (工作區 + 驗證 + 路由)。

#### `agents list`

列出已設定的 agent。

選項：

- `--json`
- `--bindings`

#### `agents add [name]`

新增隔離的 agent。除非傳遞旗標 (或 `--non-interactive`)，否則執行引導精靈；在非互動模式下，`--workspace` 為必填。

選項：

- `--workspace <dir>`
- `--model <id>`
- `--agent-dir <dir>`
- `--bind <channel[:accountId]>` (可重複)
- `--non-interactive`
- `--json`

綁定規格使用 `channel[:accountId]`。當省略 `accountId` 時，OpenClaw 可能會透過通道預設值/外掛程式掛鉤解析帳號範圍；否則，這是不含明確帳號範圍的通道綁定。

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

請參閱 [`acp`](/en/cli/acp) 以了解完整選項與範例。

### `status`

顯示已連線會話的健康狀態與近期接收者。

選項：

- `--json`
- `--all` (完整診斷；唯讀、可貼上)
- `--deep` (探測通道)
- `--usage` (顯示模型提供者使用量/配額)
- `--timeout <ms>`
- `--verbose`
- `--debug` (`--verbose` 的別名)

備註：

- 概覽在可用時包含 Gateway + 節點主機服務狀態。

### 使用量追蹤

當 OAuth/API 憑證可用時，OpenClaw 可顯示提供者使用量/配額。

顯示位置：

- `/status` (在可用時新增簡短的提供者使用量資訊行)
- `openclaw status --usage` (列印完整的提供者細目)
- macOS 功能表列 (Context 下的 Usage 區塊)

備註：

- 資料直接來自提供者使用量端點 (無預估值)。
- 提供者：Anthropic、GitHub Copilot、OpenAI Codex OAuth，以及透過隨附的 `google` 外掛程式的 Gemini CLI，還有已設定的 Antigravity。
- 若無相符的憑證，使用量會隱藏。
- 詳情請參閱 [Usage tracking](/en/concepts/usage-tracking)。

### `health`

從正在執行的 Gateway 取得健康狀態。

選項：

- `--json`
- `--timeout <ms>`
- `--verbose`

### `sessions`

列出儲存的對話工作階段。

選項：

- `--json`
- `--verbose`
- `--store <path>`
- `--active <minutes>`
- `--agent <id>` (依代理篩選工作階段)
- `--all-agents` (顯示所有代理的工作階段)

子指令：

- `sessions cleanup` — 移除已過期或孤立的作業階段

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

### `tasks`

列出並管理跨代理的 [背景任務](/en/automation/tasks) 執行。

- `tasks list` — 顯示作用中及近期的任務執行
- `tasks show <id>` — 顯示特定任務執行的詳細資訊
- `tasks notify <id>` — 變更任務執行的通知原則
- `tasks cancel <id>` — 取消正在執行的任務
- `tasks audit` — 顯示作業問題 (過期、遺失、傳遞失敗)

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
- `--reset` (重設開發設定 + 憑證 + 工作階段 + 工作區)
- `--force` （終止連接埠上現有的監聽器）
- `--verbose`
- `--cli-backend-logs`
- `--claude-cli-logs`（已棄用的別名）
- `--ws-log <auto|full|compact>`
- `--compact`（`--ws-log compact` 的別名）
- `--raw-stream`
- `--raw-stream-path <path>`

### `gateway service`

管理 Gateway 服務。

子指令：

- `gateway status`（預設探測 Gateway RPC）
- `gateway install`（服務安裝）
- `gateway uninstall`
- `gateway start`
- `gateway stop`
- `gateway restart`

備註：

- `gateway status` 預設會使用服務解析出的連接埠/設定來探測 Gateway RPC（可用 `--url/--token/--password` 覆寫）。
- `gateway status` 支援 `--no-probe`、`--deep`、`--require-rpc` 和 `--json` 以用於腳本撰寫。
- 當 `gateway status` 偵測到舊版或額外的 gateway 服務時，也會將其顯示出來（`--deep` 會新增系統層級掃描）。以設定檔命名的 OpenClaw 服務會被視為一等公民，不會被標記為「額外」。
- `gateway status` 會列印 CLI 使用的設定檔路徑與服務可能使用的設定檔（服務環境變數）的比較，以及解析出的探測目標 URL。
- 如果在目前的指令路徑中，gateway 驗證 SecretRefs 未被解析，僅在探測連線/驗證失敗時，`gateway status --json` 才會回報 `rpc.authWarning`（探測成功時會隱藏警告）。
- 在 Linux systemd 安裝中，狀態 token-drift 檢查包含 `Environment=` 和 `EnvironmentFile=` 單元來源。
- `gateway install|uninstall|start|stop|restart` 支援 `--json` 以用於腳本撰寫（預設輸出保持人類易讀格式）。
- `gateway install` 預設為 Node 執行時；不建議使用 bun（WhatsApp/Telegram 錯誤）。
- `gateway install` options: `--port`, `--runtime`, `--token`, `--force`, `--json`.

### `logs`

透過 RPC 追蹤 Gateway 檔案日誌。

選項：

- `--limit <n>`: 要返回的日誌行數上限
- `--max-bytes <n>`: 要從日誌檔案讀取的位元組上限
- `--follow`: 追蹤日誌檔案 (tail -f 風格)
- `--interval <ms>`: 追蹤時的輪詢間隔 (毫秒)
- `--local-time`: 以當地時間顯示時間戳記
- `--json`: 發出以行分隔的 JSON
- `--plain`: 停用結構化格式
- `--no-color`: 停用 ANSI 顏色

範例：

```bash
openclaw logs --follow
openclaw logs --limit 200
openclaw logs --plain
openclaw logs --json
openclaw logs --no-color
```

### `gateway <subcommand>`

Gateway CLI 輔助工具 (RPC 子指令使用 `--url`, `--token`, `--password`, `--timeout`, `--expect-final`)。
當您傳遞 `--url` 時，CLI 不會自動套用設定或環境憑證。
請明確包含 `--token` 或 `--password`。缺少明確的憑證視為錯誤。

子指令：

- `gateway call <method> [--params <json>]`
- `gateway health`
- `gateway status`
- `gateway probe`
- `gateway discover`
- `gateway install|uninstall|start|stop|restart`
- `gateway run`

常用 RPC：

- `config.set` (驗證 + 寫入完整設定；請使用 `baseHash` 進行樂觀併發控制)
- `config.apply` (驗證 + 寫入設定 + 重新啟動 + 喚醒)
- `config.patch` (合併部分更新 + 重新啟動 + 喚醒)
- `update.run` (執行更新 + 重新啟動 + 喚醒)

提示：當直接呼叫 `config.set`/`config.apply`/`config.patch` 時，如果設定已存在，請傳遞來自
`config.get` 的 `baseHash`。
提示：這些設定寫入 RPC 會預先檢查提交的設定內容中參照的現用 SecretRef 解析，並在實際生效的提交參照未解析時拒絕寫入。

## 模型

請參閱 [/concepts/models](/en/concepts/models) 以了解後備行為與掃描策略。

Anthropic setup-token (支援)：

```bash
claude setup-token
openclaw models auth setup-token --provider anthropic
openclaw models status
```

政策說明：此為技術相容性。Anthropic 過去曾封鎖部分 Claude Code 以外的訂閱使用；在生產環境依賴 setup-token 之前，請確認目前的 Anthropic 條款。

Anthropic Claude CLI 移轉：

```bash
openclaw models auth login --provider anthropic --method cli --set-default
```

注意：`--auth-choice anthropic-cli` 是已棄用的舊版別名。請改用 `models auth login`。

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
- `--probe` (已設定設定檔的即時探測)
- `--probe-provider <name>`
- `--probe-profile <id>` (可重複或以逗號分隔)
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`

始終包含認證儲存中設定檔的認證概覽與 OAuth 過期狀態。
`--probe` 會執行即時請求 (可能會消耗 token 並觸發速率限制)。

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

選項:

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

### `models auth add|login|login-github-copilot|setup-token|paste-token`

選項：

- `add`：互動式驗證輔助程式
- `login`：`--provider <name>`、`--method <method>`、`--set-default`
- `login-github-copilot`：GitHub Copilot OAuth 登入流程
- `setup-token`：`--provider <name>`（預設 `anthropic`）、`--yes`
- `paste-token`：`--provider <name>`、`--profile-id <id>`、`--expires-in <duration>`

### `models auth order get|set|clear`

選項：

- `get`：`--provider <name>`、`--agent <id>`、`--json`
- `set`：`--provider <name>`、`--agent <id>`、`<profileIds...>`
- `clear`: `--provider <name>`, `--agent <id>`

## System

### `system event`

Enqueue a system event and optionally trigger a heartbeat (Gateway RPC).

Required:

- `--text <text>`

Options:

- `--mode <now|next-heartbeat>`
- `--json`
- `--url`, `--token`, `--timeout`, `--expect-final`

### `system heartbeat last|enable|disable`

Heartbeat controls (Gateway RPC).

Options:

- `--json`
- `--url`, `--token`, `--timeout`, `--expect-final`

### `system presence`

List system presence entries (Gateway RPC).

Options:

- `--json`
- `--url`, `--token`, `--timeout`, `--expect-final`

## Cron

Manage scheduled jobs (Gateway RPC). See [/automation/cron-jobs](/en/automation/cron-jobs).

Subcommands:

- `cron status [--json]`
- `cron list [--all] [--json]` (table output by default; use `--json` for raw)
- `cron add` (alias: `create`; requires `--name` and exactly one of `--at` | `--every` | `--cron`, and exactly one payload of `--system-event` | `--message`)
- `cron edit <id>` (patch fields)
- `cron rm <id>` (aliases: `remove`, `delete`)
- `cron enable <id>`
- `cron disable <id>`
- `cron runs --id <id> [--limit <n>]`
- `cron run <id> [--force]`

All `cron` commands accept `--url`, `--token`, `--timeout`, `--expect-final`.

## Node host

`node` 執行**無頭節點主機** 或將其作為背景服務進行管理。請參閱
[`openclaw node`](/en/cli/node)。

子指令：

- `node run --host <gateway-host> --port 18789`
- `node status`
- `node install [--host <gateway-host>] [--port <port>] [--tls] [--tls-fingerprint <sha256>] [--node-id <id>] [--display-name <name>] [--runtime <node|bun>] [--force]`
- `node uninstall`
- `node stop`
- `node restart`

驗證備註：

- `node` 從環境變數/設定解析閘道驗證 (無 `--token`/`--password` 標誌)：`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`，然後是 `gateway.auth.*`。在本機模式下，節點主機會故意忽略 `gateway.remote.*`；在 `gateway.mode=remote` 中，`gateway.remote.*` 會根據遠端優先順序規則參與解析。
- 節點主機的驗證解析僅採用 `OPENCLAW_GATEWAY_*` 環境變數。

## 節點

`nodes` 與閘道通訊並以已配對的節點為目標。請參閱 [/nodes](/en/nodes)。

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

瀏覽器控制 CLI（專用於 Chrome/Brave/Edge/Chromium）。請參閱 [`openclaw browser`](/en/cli/browser) 以及 [瀏覽器工具](/en/tools/browser)。

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
- `--timeout-ms <ms>`（預設為 `agents.defaults.timeoutSeconds`）
- `--history-limit <n>`
