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
- Codex OAuth 遮蔽警告 (`models.providers.openai-codex`)。
- OpenAI Codex OAuth 設定檔的 OAuth TLS 先決條件檢查。
- 舊版磁碟狀態遷移 (sessions/agent dir/WhatsApp auth)。
- 舊版外掛程式清單合約金鑰遷移 (`speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`, `webSearchProviders` → `contracts`)。
- 舊版 cron 存儲遷移 (`jobId`, `schedule.cron`, 頂層 delivery/payload 欄位, payload `provider`, 簡單 `notify: true` webhook 後備作業)。
- Session 鎖定檔案檢查與過期鎖定清理。
- 狀態完整性和權限檢查 (sessions, transcripts, state dir)。
- 在本機執行時進行設定檔權限檢查 (chmod 600)。
- Model 身分驗證健康狀態：檢查 OAuth 到期時間，可重新整理即將到期的權杖，並回報身分驗證設定檔的冷卻/停用狀態。
- 額外工作區目錄偵測 (`~/openclaw`)。
- 啟用沙箱機制時的沙箱映像檔修復。
- 舊版服務遷移和額外 Gateway 偵測。
- Matrix 頻道舊版狀態遷移 (在 `--fix` / `--repair` 模式下)。
- Gateway 執行時檢查 (服務已安裝但未執行；快取的 launchd 標籤)。
- 頻道狀態警告 (從執行中的 Gateway 探測)。
- 監督者設定檔稽核 (launchd/systemd/schtasks)，可選擇修復。
- Gateway 執行時最佳實務檢查 (Node vs Bun, version-manager 路徑)。
- Gateway 連接埠衝突診斷 (預設 `18789`)。
- 針對開放 DM 原則的安全性警告。
- 本機權杖模式的 Gateway 身分驗證檢查 (當不存在權杖來源時提供權杖生成；不會覆寫權杖 SecretRef 設定)。
- Linux 上的 systemd linger 檢查。
- 工作區啟動檔案大小檢查 (內容檔案的截斷/接近限制警告)。
- Shell 完成狀態檢查以及自動安裝/升級。
- 記憶體搜尋嵌入提供者就緒檢查 (本機模型、遠端 API 金鑰或 QMD 二進位檔)。
- 來源安裝檢查（pnpm workspace 不匹配、缺少 UI 資產、缺少 tsx 二進位檔）。
- 寫入更新後的設定 + 精靈中繼資料。

## 詳細行為與原理

### 0) 可選更新（git 安裝）

如果是 git checkout 且 doctor 正在互動模式下執行，它會提議在
執行 doctor 之前先更新（fetch/rebase/build）。

### 1) 設定正規化

如果設定包含舊版數值形狀（例如 `messages.ackReaction`
沒有特定頻道的覆寫），doctor 會將其正規化為目前
的架構。

這包括舊版 Talk 平面欄位。目前的公開 Talk 設定是
`talk.provider` + `talk.providers.<provider>`。Doctor 會將舊的
`talk.voiceId` / `talk.voiceAliases` / `talk.modelId` / `talk.outputFormat` /
`talk.apiKey` 形狀重寫為提供者對應。

### 2) 舊版設定金鑰遷移

當設定包含已棄用的金鑰時，其他指令會拒絕執行並要求
您執行 `openclaw doctor`。

Doctor 將會：

- 說明找到了哪些舊版金鑰。
- 顯示它所套用的遷移。
- 使用更新後的架構重寫 `~/.openclaw/openclaw.json`。

當 Gateway 偵測到舊版設定格式時，也會在啟動時自動執行 doctor 遷移，因此過期的設定
無需人工干預即可修復。Cron job 存儲遷移由 `openclaw doctor --fix` 處理。

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
- 對於具有命名 `accounts` 但仍存在單一帳號頂層通道值的通道，將這些帳號範圍的值移動至為該通道選擇的升級帳號中（大多數通道為 `accounts.default`；Matrix 可以保留現有的匹配命名/預設目標）
- `identity` → `agents.list[].identity`
- `agent.*` → `agents.defaults` + `tools.*` (tools/elevated/exec/sandbox/subagents)
- `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks`
  → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
- `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
- `browser.profiles.*.driver: "extension"` → `"existing-session"`
- 移除 `browser.relayBindHost`（舊版擴充功能中繼設定）

Doctor 警告也包含多帳號通道的帳號預設指引：」

- 如果設定了兩個或更多 `channels.<channel>.accounts` 項目且未指定 `channels.<channel>.defaultAccount` 或 `accounts.default`，doctor 會警告備援路由可能選擇非預期的帳號。
- 如果 `channels.<channel>.defaultAccount` 被設為未知的帳號 ID，doctor 會警告並列出已設定的帳號 ID。

### 2b) OpenCode 提供者覆寫

如果您手動新增了 `models.providers.opencode`、`opencode-zen` 或 `opencode-go`，它會覆寫來自 `@mariozechner/pi-ai` 的內建 OpenCode 目錄。這可能會強制模型使用錯誤的 API 或將成本歸零。Doctor 會發出警告，以便您移除覆寫並恢復依模型的 API 路由與成本。

### 2c) 瀏覽器遷移與 Chrome MCP 準備

如果您的瀏覽器設定仍然指向已移除的 Chrome 擴充功能路徑，doctor 會將其正規化為目前的主機本機 Chrome MCP 附加模型：

- `browser.profiles.*.driver: "extension"` 變更為 `"existing-session"`
- `browser.relayBindHost` 會被移除

當您使用 `defaultProfile:
"user"` or a configured `existing-session` 設定檔時，Doctor 也會稽核主機本機 Chrome MCP 路徑：

- 檢查預設自動連線設定檔的主機上是否安裝了 Google Chrome
- 檢查偵測到的 Chrome 版本，並在低於 Chrome 144 時發出警告
- 提醒您在瀏覽器檢查頁面啟用遠端偵錯（例如 `chrome://inspect/#remote-debugging`、`brave://inspect/#remote-debugging` 或 `edge://inspect/#remote-debugging`）

Doctor 無法為您啟用 Chrome 端的設定。主機本機 Chrome MCP 仍然需要：

- 在 gateway/node 主機上安裝 Chromium 瀏覽器 144+ 版本
- 瀏覽器在本地執行
- 在該瀏覽器中啟用遠端偵錯
- 在瀏覽器中核准第一次附加的同意提示

此處的「就緒」僅涉及本機連線的先決條件。Existing-session 會保留目前的 Chrome MCP 路由限制；進階路由如 `responsebody`、PDF 匯出、下載攔截以及批次操作，仍需要受管理的瀏覽器或原始 CDP 設定檔。

此檢查**並不**適用於 Docker、沙箱、遠端瀏覽器或其他無頭流程。這些流程會繼續使用原始 CDP。

### 2d) OAuth TLS 先決條件

當設定 OpenAI Codex OAuth 設定檔時，doctor 會探查 OpenAI 授權端點，以驗證本機 Node/OpenSSL TLS 堆疊能否驗證憑證鏈。若探查因憑證錯誤而失敗（例如 `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`、過期的憑證或自我簽署憑證），doctor 會列印平台特定的修復指引。在搭配使用 Homebrew Node 的 macOS 上，修復方式通常是 `brew postinstall ca-certificates`。若使用 `--deep`，即使閘道狀態健全，探查仍會執行。

### 2c) Codex OAuth 提供者覆寫

如果您先前在 `models.providers.openai-codex` 下新增了舊版 OpenAI 傳輸設定，它們可能會遮蔽較新版本自動使用的內建 Codex OAuth 提供者路徑。當 Doctor 發現這些舊的傳輸設定與 Codex OAuth 並存時會發出警告，讓您可以移除或重寫過時的傳輸覆寫，以恢復內建的路由/後援行為。自訂 Proxy 和僅標頭的覆寫仍然受支援，且不會觸發此警告。

### 3) 舊版狀態遷移（磁碟佈局）

Doctor 可以將較舊的磁碟佈局遷移為目前的結構：

- Sessions 儲存區 + 逐字稿：
  - 從 `~/.openclaw/sessions/` 到 `~/.openclaw/agents/<agentId>/sessions/`
- Agent 目錄：
  - 從 `~/.openclaw/agent/` 到 `~/.openclaw/agents/<agentId>/agent/`
- WhatsApp 驗證狀態 (Baileys)：
  - 從舊版 `~/.openclaw/credentials/*.json` （`oauth.json` 除外）
  - 到 `~/.openclaw/credentials/whatsapp/<accountId>/...` （預設帳戶 ID：`default`）

這些遷移盡力而為且具等冪性；當 doctor 將任何遺留資料夾保留為備份時，會發出警告。Gateway/CLI 也會在啟動時自動遷移遺留的 sessions + agent 目錄，因此歷史/驗證/模型會直接進入 per-agent 路徑，無需手動執行 doctor。WhatsApp 驗證有意僅透過 `openclaw doctor` 進行遷移。Talk provider/provider-map 標準化現在依據結構相等性進行比較，因此僅因鍵順序的差異不再觸發重複的無操作 `doctor --fix` 變更。

### 3a) 遺留外掛清單遷移

Doctor 會掃描所有已安裝的外掛清單，尋找已棄用的頂層功能鍵 (`speechProviders`, `realtimeTranscriptionProviders`,
`realtimeVoiceProviders`, `mediaUnderstandingProviders`,
`imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`,
`webSearchProviders`)。找到時，它會提議將其移動到 `contracts`
物件中，並就地重寫清單檔案。此遷移具等冪性；如果 `contracts` 鍵已有相同的值，則會移除遺留鍵而不重複資料。

### 3b) 遺留 cron 存儲遷移

Doctor 也會檢查 cron 工作存儲（預設為 `~/.openclaw/cron/jobs.json`，
若覆寫則為 `cron.store`）中排程器為了相容性仍接受的舊工作格式。

目前的 cron 清理項目包括：

- `jobId` → `id`
- `schedule.cron` → `schedule.expr`
- 頂層 payload 欄位 (`message`, `model`, `thinking`, ...) → `payload`
- 頂層 delivery 欄位 (`deliver`, `channel`, `to`, `provider`, ...) → `delivery`
- payload `provider` delivery 別名 → 明確的 `delivery.channel`
- 簡單的舊版 `notify: true` webhook 後備作業 → 明確的 `delivery.mode="webhook"` 並使用 `delivery.to=cron.webhook`

Doctor 只有在能夠不改變行為的情況下，才會自動遷移 `notify: true` 作業。如果一個作業結合了舊版 notify 後備與現有的非 webhook 傳遞模式，doctor 會發出警告並將該作業留待手動檢查。

### 3c) 會話鎖定清理

Doctor 會掃描每個代理程式會話目錄，尋找過期的寫入鎖定檔案——即會話異常退出時遺留的檔案。對於找到的每個鎖定檔案，它會報告：路徑、PID、PID 是否仍在運行、鎖定時間，以及是否被視為過期（PID 已死或超過 30 分鐘）。在 `--fix` / `--repair` 模式下，它會自動移除過期的鎖定檔案；否則它會列印訊息並指示您使用 `--fix` 重新執行。

### 4) 狀態完整性檢查（會話持久性、路由與安全性）

狀態目錄是運作的核心樞紐。如果它消失，您將失去會話、憑證、日誌和設定（除非您在其他地方有備份）。

Doctor 檢查：

- **State dir missing**（狀態目錄遺失）：警告災難性的狀態遺失，提示重新建立目錄，並提醒您無法復原遺失的資料。
- **State dir permissions**（狀態目錄權限）：驗證可寫性；提議修復權限（並在偵測到擁有者/群組不符時發出 `chown` 提示）。
- **macOS cloud-synced state dir**（macOS 雲端同步狀態目錄）：當狀態解析位於 iCloud Drive（`~/Library/Mobile Documents/com~apple~CloudDocs/...`）或 `~/Library/CloudStorage/...` 下時發出警告，因為同步支援的路徑可能導致較慢的 I/O 和鎖定/同步競爭。
- **Linux SD or eMMC state dir**（Linux SD 或 eMMC 狀態目錄）：當狀態解析至 `mmcblk*` 掛載來源時發出警告，因為 SD 或 eMMC 支援的隨機 I/O 在會話和憑證寫入時可能較慢且磨損較快。
- **Session dirs missing**（會話目錄遺失）：`sessions/` 和會話存放區目錄是持久化歷史記錄和避免 `ENOENT` 當機所必需的。
- **Transcript mismatch**（文字記錄不符）：當最近的會話項目遺失文字記錄檔案時發出警告。
- **主工作階段「1 行 JSONL」**：當主要文字記錄只有一行時會發出旗標（歷史記錄未累積）。
- **多個狀態目錄**：當在多個家目錄中存在多個 `~/.openclaw` 資料夾，或當 `OPENCLAW_STATE_DIR` 指向其他位置時發出警告（歷史記錄可能會在安裝之間分散）。
- **遠端模式提醒**：如果 `gateway.mode=remote`，doctor 會提醒您在遠端主機上執行它（狀態位於該處）。
- **設定檔權限**：如果 `~/.openclaw/openclaw.json` 可被群組/其他人讀取，則會發出警告並提議將其加強為 `600`。

### 5) 模型驗證健康狀況 (OAuth 過期)

Doctor 會檢查驗證儲存庫中的 OAuth 設定檔，在即將過期或已過期時發出警告，並在安全時更新它們。如果 Anthropic OAuth/token 設定檔已過時，它會建議使用 Anthropic API 金鑰或 Anthropic setup-token 路徑。
更新提示僅在互動式 (TTY) 執行時出現；`--non-interactive` 會跳過更新嘗試。

Doctor 也會報告因以下原因暫時無法使用的驗證設定檔：

- 短暫冷卻 (速率限制/逾時/驗證失敗)
- 較長時間停用 (帳單/信用額度失敗)

### 6) Hooks 模型驗證

如果設定了 `hooks.gmail.model`，doctor 會根據目錄和允許清單驗證模型參考，並在無法解析或被禁止時發出警告。

### 7) 沙箱映像檔修復

啟用沙箱後，doctor 會檢查 Docker 映像檔，如果目前映像檔遺失，會提議建構或切換到舊版名稱。

### 7b) 隨附外掛程式執行階段相依項

Doctor 會驗證隨附外掛程式執行階段相依項（例如 Discord 外掛程式執行階段套件）是否存在於 OpenClaw 安裝根目錄中。
如果遺失任何套件，doctor 會報告這些套件並以 `openclaw doctor --fix` / `openclaw doctor --repair` 模式安裝它們。

### 8) 閘道服務移轉與清理提示

Doctor 會偵測舊版閘道服務 (launchd/systemd/schtasks) 並提議移除它們，使用目前的閘道連接埠安裝 OpenClaw 服務。它也可以掃描額外的類閘道服務並列印清理提示。
以設定檔命名的 OpenClaw 閘道服務被視為一等公民，不會被標記為「額外」。

### 8b) 啟動 Matrix 移轉

當 Matrix 頻道帳戶有待處理或可採取行動的舊版狀態遷移時，doctor（在 `--fix` / `--repair` 模式下）會建立遷移前快照，然後執行盡力的遷移步驟：舊版 Matrix 狀態遷移和舊版加密狀態準備。這兩個步驟均非致命；錯誤會被記錄，並繼續啟動。在唯讀模式（`openclaw doctor` 而無 `--fix`）下，此檢查會被完全略過。

### 9) 安全性警告

當提供者開放 DM 而未設有允許清單，或當政策以危險方式設定時，Doctor 會發出警告。

### 10) systemd linger (Linux)

如果作為 systemd 使用者服務執行，doctor 會確保已啟用 linger，以便閘道在登出後保持運作。

### 11) 工作區狀態（skills、外掛程式和舊版目錄）

Doctor 會列印預設代理程式的工作區狀態摘要：

- **Skills 狀態**：計算符合資格、缺少需求以及被允許清單阻擋的 skills。
- **舊版工作區目錄**：當 `~/openclaw` 或其他舊版工作區目錄與目前工作區並存時發出警告。
- **外掛程式狀態**：計算已載入/已停用/發生錯誤的外掛程式；列出任何錯誤的外掛程式 ID；回報 bundle 外掛程式功能。
- **外掛程式相容性警告**：標記與目前執行時期有相容性問題的外掛程式。
- **外掛程式診斷**：呈現外掛程式註冊表發出的任何載入時期警告或錯誤。

### 11b) Bootstrap 檔案大小

Doctor 會檢查工作區 bootstrap 檔案（例如 `AGENTS.md`、`CLAUDE.md` 或其他注入的內容檔案）是否接近或超過設定的字元預算。它會報告每個檔案的原始與注入字元數、截斷百分比、截斷原因（`max/file` 或 `max/total`），以及總注入字元佔總預算的比例。當檔案被截斷或接近限制時，doctor 會列印調整 `agents.defaults.bootstrapMaxChars` 和 `agents.defaults.bootstrapTotalMaxChars` 的提示。

### 11c) Shell 完成功能

Doctor 會檢查目前 shell（zsh、bash、fish 或 PowerShell）是否已安裝 tab 完成功能：

- 如果 shell 設定檔使用緩慢的動態補全模式
  (`source <(openclaw completion ...)`)，doctor 會將其升級為更快的
  快取檔案變體。
- 如果在設定檔中配置了補全但快取檔案缺失，
  doctor 會自動重新產生快取。
- 如果根本未配置補全，doctor 會提示安裝它
  (僅限互動模式；使用 `--non-interactive` 時會跳過)。

執行 `openclaw completion --write-state` 以手動重新產生快取。

### 12) Gateway 身份驗證檢查 (本機 token)

Doctor 會檢查本機 gateway token 身份驗證的準備情況。

- 如果 token 模式需要 token 但沒有 token 來源，doctor 會提議產生一個。
- 如果 `gateway.auth.token` 由 SecretRef 管理但不可用，doctor 會發出警告，且不會用純文字覆寫它。
- `openclaw doctor --generate-gateway-token` 僅在未配置 token SecretRef 時才強制產生。

### 12b) 感知唯讀 SecretRef 的修復

某些修復流程需要檢查已配置的憑證，而不會削弱執行時期的快速失敗 行為。

- `openclaw doctor --fix` 現在針對目標配置修復，使用與 status 系列指令相同的唯讀 SecretRef 摘要模型。
- 範例：Telegram `allowFrom` / `groupAllowFrom` `@username` 修復會嘗試在可用時使用已配置的 bot 憑證。
- 如果 Telegram bot token 透過 SecretRef 配置但在目前指令路徑中不可用，doctor 會報告該憑證「已配置但不可用」，並跳過自動解析，而不是崩潰或錯誤地將 token 報告為缺失。

### 13) Gateway 健康檢查 + 重新啟動

Doctor 會執行健康檢查，並在 gateway 看起來不健康時提議重新啟動它。

### 13b) 記憶體搜尋就緒狀態

Doctor 會檢查為預設代理程式配置的記憶體搜尋嵌入 提供者是否已準備就緒。其行為取決於配置的後端和提供者：

- **QMD 後端**：探測 `qmd` 二進位檔案是否可用且可啟動。
  如果不可用，會印出修復指引，包括 npm 套件和手動二進位路徑選項。
- **明確的本機提供者**：檢查是否有本機模型檔案或可辨識的
  遠端/可下載模型 URL。如果缺失，建議切換到遠端提供者。
- **明確指定的遠端提供者**（`openai`、`voyage` 等）：驗證環境或認證儲存中是否存在 API 金鑰。如果缺失，則會印出可執行的修復提示。
- **自動提供者**：首先檢查本地模型可用性，然後依自動選擇順序嘗試每個遠端提供者。

當有閘道探測結果可用時（檢查時閘道狀態健全），doctor 會將其結果與 CLI 可見的設定進行比對，並記錄任何差異。

使用 `openclaw memory status --deep` 在執行時驗證嵌入準備情況。

### 14) 通道狀態警告

如果閘道狀態健全，doctor 會執行通道狀態探測，並回報帶有建議修復方法的警告。

### 15) 監督程式設定稽核與修復

Doctor 會檢查已安裝的監督程式設定（launchd/systemd/schtasks）是否有遺失或過時的預設值（例如 systemd network-online 相依性和重新啟動延遲）。當發現不符時，它會建議更新並可以將服務檔案/工作重寫為目前的預設值。

備註：

- `openclaw doctor` 會在重寫監督程式設定之前提示。
- `openclaw doctor --yes` 接受預設的修復提示。
- `openclaw doctor --repair` 套用建議的修復而不會提示。
- `openclaw doctor --repair --force` 覆寫自訂監督程式設定。
- 如果權杖認證需要權杖且 `gateway.auth.token` 是由 SecretRef 管理，doctor 服務安裝/修復會驗證 SecretRef，但不會將已解析的明文權杖值持久化至監督程式服務環境中繼資料中。
- 如果權杖認證需要權杖且設定的權杖 SecretRef 未解析，doctor 會以可行的指引封鎖安裝/修復路徑。
- 如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，doctor 會封鎖安裝/修復，直到明確設定模式為止。
- 對於 Linux 使用者 systemd 單元，doctor 權杖差異檢查現在在比較服務認證中繼資料時，會同時包含 `Environment=` 和 `EnvironmentFile=` 來源。
- 您始終可以透過 `openclaw gateway install --force` 強制完整重寫。

### 16) 閘道執行時 + 連接埠診斷

Doctor 會檢查服務運行狀態（PID、上次退出狀態），並在服務已安裝但未實際運行時發出警告。它還會檢查閘道埠（預設 `18789`）上的埠衝突，並報告可能的原因（閘道已在運行、SSH 隧道）。

### 17) Gateway 運行最佳實踐

當 gateway 服務在 Bun 上或由版本管理的 Node 路徑（`nvm`、`fnm`、`volta`、`asdf` 等）運行時，Doctor 會發出警告。WhatsApp 和 Telegram 頻道需要 Node，而版本管理器路徑可能會在升級後失效，因為服務不會載入您的 shell 初始化檔案。如果可用，Doctor 會提議遷移至系統 Node 安裝（Homebrew/apt/choco）。

### 18) Config 寫入 + wizard 元數據

Doctor 會保存任何配置變更，並加上 wizard 元數據標記以記錄此次 doctor 執行。

### 19) Workspace 提示（備份 + 記憶系統）

如果缺少 workspace 記憶系統，Doctor 會建議安裝；如果 workspace 尚未在 git 管理下，則會列印備份提示。

請參閱 [/concepts/agent-workspace](/en/concepts/agent-workspace) 以取得關於 workspace 結構和 git 備份（建議使用私人 GitHub 或 GitLab）的完整指南。
