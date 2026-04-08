---
summary: "Doctor 指令：健康檢查、設定遷移和修復步驟"
read_when:
  - Adding or modifying doctor migrations
  - Introducing breaking config changes
title: "Doctor"
---

# Doctor

`openclaw doctor` 是 OpenClaw 的修復和遷移工具。它能修復過時的設定/狀態，檢查健康狀況，並提供可執行的修復步驟。

## 快速入門

```bash
openclaw doctor
```

### 無介面 / 自動化

```bash
openclaw doctor --yes
```

在無提示的情況下接受預設值（包括適用時的重啟/服務/沙箱修復步驟）。

```bash
openclaw doctor --repair
```

無提示地套用建議的修復（在安全情況下進行修復和重啟）。

```bash
openclaw doctor --repair --force
```

同時套用激進的修復（覆寫自訂的 supervisor 設定）。

```bash
openclaw doctor --non-interactive
```

在無提示的情況下執行，並僅套用安全的遷移（設定正規化 + 磁碟狀態移動）。跳過需要人工確認的重啟/服務/沙箱操作。
偵測到舊版狀態遷移時會自動執行。

```bash
openclaw doctor --deep
```

掃描系統服務以尋找額外的 gateway 安裝（launchd/systemd/schtasks）。

如果您想在寫入之前檢視變更，請先開啟設定檔：

```bash
cat ~/.openclaw/openclaw.json
```

## 功能摘要

- 針對 git 安裝的可選預檢更新（僅限互動模式）。
- UI 協定新鮮度檢查（當協定架構較新時會重建 Control UI）。
- 健康檢查 + 重啟提示。
- 技能狀態摘要（符合資格/遺失/封鎖）與外掛程式狀態。
- 針對舊版數值的設定正規化。
- Talk config migration from legacy flat `talk.*` fields into `talk.provider` + `talk.providers.<provider>`.
- Browser migration checks for legacy Chrome extension configs and Chrome MCP readiness.
- OpenCode provider override warnings (`models.providers.opencode` / `models.providers.opencode-go`).
- OAuth TLS prerequisites check for OpenAI Codex OAuth profiles.
- Legacy on-disk state migration (sessions/agent dir/WhatsApp auth).
- Legacy plugin manifest contract key migration (`speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`, `webSearchProviders` → `contracts`).
- Legacy cron store migration (`jobId`, `schedule.cron`, top-level delivery/payload fields, payload `provider`, simple `notify: true` webhook fallback jobs).
- Session lock file inspection and stale lock cleanup.
- State integrity and permissions checks (sessions, transcripts, state dir).
- Config file permission checks (chmod 600) when running locally.
- Model auth health: checks OAuth expiry, can refresh expiring tokens, and reports auth-profile cooldown/disabled states.
- Extra workspace dir detection (`~/openclaw`).
- Sandbox image repair when sandboxing is enabled.
- Legacy service migration and extra gateway detection.
- Matrix channel legacy state migration (in `--fix` / `--repair` mode).
- Gateway runtime checks (service installed but not running; cached launchd label).
- Channel status warnings (probed from the running gateway).
- Supervisor config audit (launchd/systemd/schtasks) with optional repair.
- Gateway runtime best-practice checks (Node vs Bun, version-manager paths).
- Gateway port collision diagnostics (default `18789`).
- Security warnings for open DM policies.
- Gateway auth checks for local token mode (offers token generation when no token source exists; does not overwrite token SecretRef configs).
- 在 Linux 上檢查 systemd linger。
- 工作區啟動檔案大小檢查（針對上下文檔案的截斷/接近限制警告）。
- Shell 自動補全狀態檢查以及自動安裝/升級。
- 記憶體搜尋嵌入供應商就緒檢查（本機模型、遠端 API 金鑰或 QMD 二進位檔案）。
- 原始碼安裝檢查（pnpm 工作區不匹配、缺少 UI 資源、缺少 tsx 二進位檔案）。
- 寫入更新的設定 + 精靈中繼資料。

## 詳細行為與原理

### 0) 可選更新（git 安裝）

如果是 git 檢出且 doctor 正在互動模式下運作，它會提議在運作 doctor 之前更新（fetch/rebase/build）。

### 1) 設定正規化

如果設定包含舊版值的形狀（例如 `messages.ackReaction` 沒有特定通道的覆寫），doctor 會將它們正規化為目前的架構。

這包括舊版 Talk 的扁平欄位。目前的公開 Talk 設定是 `talk.provider` + `talk.providers.<provider>`。Doctor 會將舊的 `talk.voiceId` / `talk.voiceAliases` / `talk.modelId` / `talk.outputFormat` / `talk.apiKey` 形狀重寫為供應商對應。

### 2) 舊版設定金鑰遷移

當設定包含已棄用的金鑰時，其他指令會拒絕運作並要求您執行 `openclaw doctor`。

Doctor 將會：

- 說明找到了哪些舊版金鑰。
- 顯示它所套用的遷移。
- 使用更新的架構重寫 `~/.openclaw/openclaw.json`。

當 Gateway 偵測到舊版設定格式時，也會在啟動時自動執行 doctor 遷移，因此過期的設定無需人工干預即可修復。Cron 任務存放區遷移由 `openclaw doctor --fix` 處理。

目前的遷移：

- `routing.allowFrom` → `channels.whatsapp.allowFrom`
- `routing.groupChat.requireMention` → `channels.whatsapp/telegram/imessage.groups."*".requireMention`
- `routing.groupChat.historyLimit` → `messages.groupChat.historyLimit`
- `routing.groupChat.mentionPatterns` → `messages.groupChat.mentionPatterns`
- `routing.queue` → `messages.queue`
- `routing.bindings` → 頂層 `bindings`
- `routing.agents`/`routing.defaultAgentId` → `agents.list` + `agents.list[].default`
- 舊版 `talk.voiceId`/`talk.voiceAliases`/`talk.modelId`/`talk.outputFormat`/`talk.apiKey` → `talk.provider` + `talk.providers.<provider>`
- `routing.agentToAgent` → `tools.agentToAgent`
- `routing.transcribeAudio` → `tools.media.audio.models`
- `messages.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `messages.tts.providers.<provider>`
- `channels.discord.voice.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `channels.discord.voice.tts.providers.<provider>`
- `channels.discord.accounts.<id>.voice.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `channels.discord.accounts.<id>.voice.tts.providers.<provider>`
- `plugins.entries.voice-call.config.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `plugins.entries.voice-call.config.tts.providers.<provider>`
- `plugins.entries.voice-call.config.provider: "log"` → `"mock"`
- `plugins.entries.voice-call.config.twilio.from` → `plugins.entries.voice-call.config.fromNumber`
- `plugins.entries.voice-call.config.streaming.sttProvider` → `plugins.entries.voice-call.config.streaming.provider`
- `plugins.entries.voice-call.config.streaming.openaiApiKey|sttModel|silenceDurationMs|vadThreshold`
  → `plugins.entries.voice-call.config.streaming.providers.openai.*`
- `bindings[].match.accountID` → `bindings[].match.accountId`
- 對於具有命名 `accounts` 但殘留單一帳號頂層通道值的通道，將這些帳號範圍的值移至為該通道選擇的昇級帳號中（大多數通道為 `accounts.default`；Matrix 可以保留現有匹配的命名/預設目標）
- `identity` → `agents.list[].identity`
- `agent.*` → `agents.defaults` + `tools.*` (tools/elevated/exec/sandbox/subagents)
- `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks`
  → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
- `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
- `browser.profiles.*.driver: "extension"` → `"existing-session"`
- 移除 `browser.relayBindHost` (舊版擴充功能中繼設定)

Doctor 警告也包含多帳戶通道的帳戶預設指引：

- 如果設定了兩個或更多 `channels.<channel>.accounts` 項目但未指定 `channels.<channel>.defaultAccount` 或 `accounts.default`，Doctor 會警告備用路由可能會選擇非預期的帳戶。
- 如果 `channels.<channel>.defaultAccount` 被設為未知的帳戶 ID，Doctor 會警告並列出已設定的帳戶 ID。

### 2b) OpenCode 提供者覆寫

如果您手動新增了 `models.providers.opencode`、`opencode-zen` 或 `opencode-go`，
它會覆寫來自 `@mariozechner/pi-ai` 的內建 OpenCode 目錄。
這可能會強制模型使用錯誤的 API 或將成本歸零。Doctor 會發出警告，以便您
移除該覆寫並恢復依模型的 API 路由 + 成本。

### 2c) 瀏覽器遷移與 Chrome MCP 準備

如果您的瀏覽器設定仍然指向已移除的 Chrome 擴充功能路徑，Doctor
會將其標準化為目前的主機本機 Chrome MCP 附加模型：

- `browser.profiles.*.driver: "extension"` 變成 `"existing-session"`
- `browser.relayBindHost` 已被移除

當您使用 `defaultProfile:
"user"` or a configured `existing-session` 設定檔時，Doctor 也會稽核主機本機 Chrome MCP 路徑：

- 檢查預設自動連線設定檔的主機上是否安裝了 Google Chrome
- 檢查偵測到的 Chrome 版本，並在低於 Chrome 144 時發出警告
- 提醒您在瀏覽器檢查頁面中啟用遠端偵錯（例如
  `chrome://inspect/#remote-debugging`、`brave://inspect/#remote-debugging`
  或 `edge://inspect/#remote-debugging`）

Doctor 無法為您啟用 Chrome 端的設定。本機 Chrome MCP
仍需要：

- 閘道/節點主機上基於 Chromium 的瀏覽器 144+ 版本
- 瀏覽器於本機執行
- 在該瀏覽器中啟用遠端偵錯
- 在瀏覽器中批准首次附加連線的同意提示

此處的準備工作僅指本機附加連線的先決條件。Existing-session 會保持
目前的 Chrome MCP 路由限制；進階路由如 `responsebody`、PDF
匯出、下載攔截和批次操作仍需要受管理的
瀏覽器或原始 CDP 設定檔。

此檢查**不**適用於 Docker、sandbox、remote-browser 或其他
無頭流程。這些會繼續使用原始 CDP。

### 2d) OAuth TLS 先決條件

當設定 OpenAI Codex OAuth 設定檔時，doctor 會探測 OpenAI
授權端點，以驗證本機 Node/OpenSSL TLS 堆疊是否能
驗證憑證鏈。如果探測因憑證錯誤而失敗（例如
`UNABLE_TO_GET_ISSUER_CERT_LOCALLY`、過期憑證或自我簽署憑證），
doctor 會列印平台特定的修復指引。在搭配 Homebrew Node 的 macOS 上，
修復方法通常是 `brew postinstall ca-certificates`。使用 `--deep` 時，即使閘道狀態健全，
探測仍會執行。

### 3) 舊版狀態遷移（磁碟佈局）

Doctor 可以將較舊的磁碟佈局遷移至目前的結構：

- Sessions 儲存區 + 逐字稿：
  - 從 `~/.openclaw/sessions/` 到 `~/.openclaw/agents/<agentId>/sessions/`
- Agent 目錄：
  - 從 `~/.openclaw/agent/` 到 `~/.openclaw/agents/<agentId>/agent/`
- WhatsApp 驗證狀態（Baileys）：
  - 從舊版 `~/.openclaw/credentials/*.json`（`oauth.json` 除外）
  - 到 `~/.openclaw/credentials/whatsapp/<accountId>/...`（預設帳戶 ID：`default`）

這些遷移是盡力而為且具等冪性的；當 doctor 將任何舊版資料夾作為備份留下時，會發出警告。Gateway/CLI 也會在啟動時自動遷移舊版 sessions + agent 目錄，讓 history/auth/models 進入 per-agent 路徑，而無需手動執行 doctor。WhatsApp 驗證僅透過 `openclaw doctor` 進行遷移。Talk provider/provider-map 標準化現在會比較結構相等性，因此僅鍵順序的差異不再會觸發重複的無操作 `doctor --fix` 變更。

### 3a) 舊版插件清單遷移

Doctor 會掃描所有已安裝的插件清單，尋找已棄用的頂層功能鍵（`speechProviders`、`realtimeTranscriptionProviders`、
`realtimeVoiceProviders`、`mediaUnderstandingProviders`、
`imageGenerationProviders`、`videoGenerationProviders`、`webFetchProviders`、
`webSearchProviders`）。找到時，它會將其移至 `contracts`
物件並就地重寫清單檔案。此遷移是等冪的；如果 `contracts` 鍵已經具有相同的值，則會移除舊版鍵而不會複製資料。

### 3b) 舊版 cron 儲存遷移

Doctor 也會檢查 cron 工作儲存（預設為 `~/.openclaw/cron/jobs.json`，
或在被覆寫時為 `cron.store`）中排程器為了相容性而仍接受的舊工作形狀。

目前的 cron 清理包括：

- `jobId` → `id`
- `schedule.cron` → `schedule.expr`
- 頂層 payload 欄位（`message`、`model`、`thinking`，...）→ `payload`
- 頂層 delivery 欄位（`deliver`、`channel`、`to`、`provider`，...）→ `delivery`
- payload `provider` delivery 別名 → 顯式 `delivery.channel`
- 簡單的舊版 `notify: true` webhook 後備作業 → 明確的 `delivery.mode="webhook"` 且包含 `delivery.to=cron.webhook`

Doctor 只會在不改變行為的情況下，自動遷移 `notify: true` 作業。如果作業結合了舊版通知後備與現有的非 webhook 傳遞模式，doctor 會發出警告並將該作業留待手動審查。

### 3c) Session lock cleanup

Doctor 會掃描每個代理程式 session 目錄，尋找過時的寫入鎖定檔案 —— 即當 session 異常結束時遺留下的檔案。對於找到的每個鎖定檔案，它會報告：路徑、PID、PID 是否仍在運作、鎖定存在時間，以及是否被視為過時（PID 已死或超過 30 分鐘）。在 `--fix` / `--repair` 模式下，它會自動移除過時的鎖定檔案；否則它會印出備註並指示您使用 `--fix` 重新執行。

### 4) State integrity checks (session persistence, routing, and safety)

State directory 是作業的腦幹。如果它消失了，您將失去 sessions、認證、日誌和設定（除非您在其他地方有備份）。

Doctor 檢查：

- **State dir missing**：警告發生災難性的 state 遺失，提示重新建立
  該目錄，並提醒您它無法復原遺失的資料。
- **State dir permissions**：驗證可寫入性；提議修復權限
  （並且在偵測到擁有者/群組不相符時發出 `chown` 提示）。
- **macOS cloud-synced state dir**：當 state 解析位於 iCloud Drive
  (`~/Library/Mobile Documents/com~apple~CloudDocs/...`) 或
  `~/Library/CloudStorage/...` 之下時發出警告，因為同步備份的路徑可能導致較慢的 I/O
  和鎖定/同步競爭。
- **Linux SD or eMMC state dir**：當 state 解析至 `mmcblk*`
  掛載來源時發出警告，因為 SD 或 eMMC 備份的隨機 I/O 在 session 和認證寫入時可能會變慢並且磨損更快。
- **Session dirs missing**：`sessions/` 和 session store 目錄
  是持久化歷史記錄並避免 `ENOENT` 當機所必需的。
- **Transcript mismatch**：當最近的 session 項目遺失
  transcript 檔案時發出警告。
- **「主會話單行 JSONL」**：當主逐字稿只有一行時標誌（歷史記錄未累積）。
- **多個狀態目錄**：當在多個主目錄中存在多個 `~/.openclaw` 資料夾，或當 `OPENCLAW_STATE_DIR` 指向別處時發出警告（歷史記錄可能會在安裝之間拆分）。
- **遠端模式提醒**：如果 `gateway.mode=remote`，doctor 會提醒您在遠端主機上運行它（狀態位於那裡）。
- **設定檔權限**：如果 `~/.openclaw/openclaw.json` 可被群組/世界讀取則發出警告，並提議將其收緊為 `600`。

### 5) 模型驗證健康狀況 (OAuth 過期)

Doctor 會檢查授權存放區中的 OAuth 設定檔，在即將過期/已過期時發出警告，並可以在安全時刷新它們。如果 Anthropic OAuth/token 設定檔已過時，它會建議使用 Anthropic API 金鑰或舊版 Anthropic setup-token 路徑。
刷新提示僅在以互動方式 (TTY) 運行時出現；`--non-interactive` 會跳過刷新嘗試。

Doctor 也會檢測過時的已移除 Anthropic Claude CLI 狀態。如果舊的 `anthropic:claude-cli` 憑證位元組仍存在於 `auth-profiles.json` 中，doctor 會將其轉換回 Anthropic token/OAuth 設定檔並重寫過時的 `claude-cli/...` 模型參照。
如果位元組已消失，doctor 會移除過時的設定並改為列印恢復指令。

Doctor 也會報告因以下原因而暫時無法使用的授權設定檔：

- 短暫冷卻（速率限制/逾時/授權失敗）
- 較長時間的停用（帳單/點數失敗）

### 6) Hooks 模型驗證

如果設定了 `hooks.gmail.model`，doctor 會針對目錄和允許清單驗證模型參照，並在無法解析或被拒絕時發出警告。

### 7) 沙盒映像修復

啟用沙盒時，doctor 會檢查 Docker 映像，如果目前映像缺失，則會提議建置或切換到舊版名稱。

### 7b) 捆綁的外掛程式執行階段相依項

Doctor 會驗證捆綁的外掛程式執行階段相依項（例如 Discord 外掛程式執行階段套件）是否存在於 OpenClaw 安裝根目錄中。
如果有任何缺失，doctor 會報告這些套件並以 `openclaw doctor --fix` / `openclaw doctor --repair` 模式安裝它們。

### 8) 閘道服務遷移與清理提示

Doctor 會偵測舊版的閘道服務 (launchd/systemd/schtasks)，並提議將其移除，然後使用目前的閘道連接埠安裝 OpenClaw 服務。它也可以掃描額外的類閘道服務並印出清理提示。以 Profile 命名的 OpenClaw 閘道服務被視為一等公民，不會被標記為「額外」。

### 8b) 啟動時 Matrix 遷移

當 Matrix 頻道帳號有待處理或可採取行動的舊版狀態遷移時，doctor (在 `--fix` / `--repair` 模式下) 會建立遷移前快照，然後執行盡力的遷移步驟：舊版 Matrix 狀態遷移與舊版加密狀態準備。這兩個步驟都不是致命的；錯誤會被記錄下來，啟動繼續進行。在唯讀模式下 (`openclaw doctor` 但沒有 `--fix`)，此檢查會被完全跳過。

### 9) 安全性警告

當提供者開放私訊 (DM) 且未設定允許清單，或是原則設定為不安全的方式時，Doctor 會發出警告。

### 10) systemd linger (Linux)

如果以 systemd 使用者服務執行，doctor 會確保已啟用 linger 功能，以便在登出後閘道仍能保持運作。

### 11) 工作區狀態 (skills、plugins 和舊版目錄)

Doctor 會印出預設代理程式的工作區狀態摘要：

- **Skills 狀態**：計算符合資格、缺少需求以及被允許清單封鎖的 skills 數量。
- **舊版工作區目錄**：當 `~/openclaw` 或其他舊版工作區目錄與目前的工作區並存時發出警告。
- **Plugin 狀態**：計算已載入/已停用/發生錯誤的 plugins 數量；列出任何錯誤的 plugin ID；回報 bundle plugin 的功能。
- **Plugin 相容性警告**：標記與目前執行環境有相容性問題的 plugins。
- **Plugin 診斷**：呈現 plugin 註冊表發出的任何載入時警告或錯誤。

### 11b) Bootstrap 檔案大小

Doctor 會檢查工作區引導文件（例如 `AGENTS.md`、
`CLAUDE.md` 或其他注入的上下文文件）是否接近或超過設定的
字元預算。它會報告每個文件的原始字元數與注入字元數、截斷
百分比、截斷原因（`max/file` 或 `max/total`），以及總注入字元數佔總預算的比例。
當文件被截斷或接近限制時，doctor 會列印調整 `agents.defaults.bootstrapMaxChars`
和 `agents.defaults.bootstrapTotalMaxChars` 的提示。

### 11c) Shell 補全

Doctor 會檢查目前 Shell
（zsh、bash、fish 或 PowerShell）是否已安裝 Tab 補全功能：

- 如果 Shell 設定檔使用緩慢的動態補全模式
  (`source <(openclaw completion ...)`)，doctor 會將其升級為更快的
  快取檔案變體。
- 如果在設定檔中配置了補全功能但快取檔案遺失，
  doctor 會自動重新產生快取。
- 如果完全未配置補全功能，doctor 會提示安裝
  (僅限互動模式；若使用 `--non-interactive` 則跳過)。

執行 `openclaw completion --write-state` 以手動重新產生快取。

### 12) Gateway 驗證檢查 (本機 Token)

Doctor 會檢查本機 Gateway Token 驗證的準備情況。

- 如果 Token 模式需要 Token 但沒有 Token 來源，doctor 會提議產生一個。
- 如果 `gateway.auth.token` 是由 SecretRef 管理但無法使用，doctor 會發出警告，且不會以明文覆寫它。
- `openclaw doctor --generate-gateway-token` 僅在未設定 Token SecretRef 時強制產生。

### 12b) 唯讀 SecretRef 感知的修復

某些修復流程需要檢查設定的憑證，而不會削弱執行時期的快速失敗 行為。

- `openclaw doctor --fix` 現在使用與 status 系列指令相同的唯讀 SecretRef 摘要模型，以進行目標設定修復。
- 例如：Telegram `allowFrom` / `groupAllowFrom` `@username` 修復會嘗試在可用時使用設定的機器人憑證。
- 如果 Telegram 機器人 token 透過 SecretRef 設定，但在目前的指令路徑中無法使用，doctor 會回報憑證已設定但無法使用，並跳過自動解析，而不是當機或錯誤地回報 token 遺失。

### 13) 閘道健康檢查 + 重新啟動

當閘道看起來不健康時，Doctor 會執行健康檢查並提議重新啟動閘道。

### 13b) 記憶體搜尋就緒狀態

Doctor 會檢查為預設代理程式設定的記憶體搜尋嵌入提供者是否就緒。其行為取決於設定的後端與提供者：

- **QMD 後端**：探測 `qmd` 二進位檔案是否可用且可啟動。
  如果否，則印出修復指引，包括 npm 套件和手動二進位路徑選項。
- **明確的本機提供者**：檢查是否有本機模型檔案或可辨識的
  遠端/可下載模型 URL。如果遺失，建議切換至遠端提供者。
- **明確的遠端提供者** (`openai`, `voyage`, 等)：驗證環境變數或認證儲存中
  是否存在 API 金鑰。如果遺失，會印出可執行的修復提示。
- **自動提供者**：先檢查本機模型可用性，然後依照自動選擇順序
  嘗試每個遠端提供者。

當閘道探測結果可用時（檢查時閘道為健康狀態），
Doctor 會將其結果與 CLI 可見設定進行比對，並記錄任何差異。

使用 `openclaw memory status --deep` 在執行時驗證嵌入就緒狀態。

### 14) 頻道狀態警告

如果閘道健康，Doctor 會執行頻道狀態探測並回報
帶有建議修復方式的警告。

### 15) 監督器設定稽核 + 修復

Doctor 會檢查已安裝的監督器設定 (launchd/systemd/schtasks) 是否
遺失或過時的預設值 (例如 systemd network-online 相依性和
重新啟動延遲)。當發現不符時，它會建議更新並可以
將服務檔案/工作重寫為目前的預設值。

備註：

- `openclaw doctor` 會在重寫監督器設定前提示。
- `openclaw doctor --yes` 接受預設的修復提示。
- `openclaw doctor --repair` 無提示地套用建議的修復。
- `openclaw doctor --repair --force` 覆寫自訂的監督器設定。
- 如果 token auth 需要 token 且 `gateway.auth.token` 由 SecretRef 管理，doctor service install/repair 會驗證 SecretRef，但不會將解析後的明文 token 值保存到 supervisor service 環境元數據中。
- 如果 token auth 需要 token 且配置的 token SecretRef 未解析，doctor 會使用可操作的指引阻止 install/repair 流程。
- 如果同時配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，doctor 會阻擋 install/repair，直到明確設定模式。
- 對於 Linux user-systemd units，doctor token drift 檢查現在在比較服務 auth 元數據時會包含 `Environment=` 和 `EnvironmentFile=` 來源。
- 您始終可以透過 `openclaw gateway install --force` 強制完整重寫。

### 16) Gateway runtime + port diagnostics

Doctor 會檢查服務 runtime (PID, 最後退出狀態) 並在服務已安裝但未實際運行時發出警告。它還會檢查 gateway port (預設 `18789`) 上的 port 衝突，並報告可能的原因 (gateway 已在運行、SSH tunnel)。

### 17) Gateway runtime best practices

當 gateway service 在 Bun 或版本管理的 Node 路徑 (`nvm`, `fnm`, `volta`, `asdf` 等) 上運行時，Doctor 會發出警告。WhatsApp + Telegram channels 需要 Node，且版本管理器路徑可能會在升級後中斷，因為服務不會載入您的 shell init。當可用時，Doctor 提議遷移到系統 Node 安裝。

### 18) Config write + wizard metadata

Doctor 會保存任何配置變更並標記 wizard 元數據以記錄 doctor run。

### 19) Workspace tips (backup + memory system)

當缺少 workspace memory system 時，Doctor 會建議使用；如果 workspace 尚未在 git 下，它會列印備份提示。

請參閱 [/concepts/agent-workspace](/en/concepts/agent-workspace) 以取得 workspace 結構和 git 備份的完整指南 (建議使用私人 GitHub 或 GitLab)。
