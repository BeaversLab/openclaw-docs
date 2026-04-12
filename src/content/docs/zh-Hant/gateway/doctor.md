---
summary: "Doctor command: health checks, config migrations, and repair steps"
read_when:
  - Adding or modifying doctor migrations
  - Introducing breaking config changes
title: "Doctor"
---

# Doctor

`openclaw doctor` 是 OpenClaw 的修復與遷移工具。它會修復過時的
配置/狀態、檢查健康狀況，並提供可行的修復步驟。

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
- 將舊版扁平化 `talk.*` 欄位中的 Talk 配置遷移至 `talk.provider` + `talk.providers.<provider>`。
- Browser migration checks for legacy Chrome extension configs and Chrome MCP readiness.
- OpenCode 提供者覆寫警告 (`models.providers.opencode` / `models.providers.opencode-go`)。
- Codex OAuth 遮蔽警告 (`models.providers.openai-codex`)。
- OpenAI Codex OAuth 設定檔的 OAuth TLS 先決條件檢查。
- 舊版磁碟狀態遷移 (sessions/agent dir/WhatsApp auth)。
- 舊版插件清單 contract 金鑰遷移 (`speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`, `webSearchProviders` → `contracts`)。
- 舊版 cron 存儲遷移 (`jobId`, `schedule.cron`, 頂層 delivery/payload 欄位, payload `provider`, 簡單 `notify: true` webhook 備援作業)。
- Session 鎖定檔案檢查與過期鎖定清理。
- 狀態完整性和權限檢查 (sessions, transcripts, state dir)。
- 在本機執行時進行設定檔權限檢查 (chmod 600)。
- Model 身分驗證健康狀態：檢查 OAuth 到期時間，可重新整理即將到期的權杖，並回報身分驗證設定檔的冷卻/停用狀態。
- 額外工作區目錄檢測 (`~/openclaw`)。
- 啟用沙箱機制時的沙箱映像檔修復。
- 舊版服務遷移和額外 Gateway 偵測。
- Matrix 頻道舊版狀態遷移 (在 `--fix` / `--repair` 模式下)。
- Gateway 執行時檢查 (服務已安裝但未執行；快取的 launchd 標籤)。
- 頻道狀態警告 (從執行中的 Gateway 探測)。
- 監督者設定檔稽核 (launchd/systemd/schtasks)，可選擇修復。
- Gateway 執行時最佳實務檢查 (Node vs Bun, version-manager 路徑)。
- 閘道連接埠衝突診斷 (預設 `18789`)。
- 針對開放 DM 原則的安全性警告。
- 本機權杖模式的 Gateway 身分驗證檢查 (當不存在權杖來源時提供權杖生成；不會覆寫權杖 SecretRef 設定)。
- Linux 上的 systemd linger 檢查。
- 工作區啟動檔案大小檢查 (內容檔案的截斷/接近限制警告)。
- Shell 完成狀態檢查以及自動安裝/升級。
- 記憶體搜尋嵌入提供者就緒檢查 (本機模型、遠端 API 金鑰或 QMD 二進位檔)。
- 來源安裝檢查（pnpm workspace 不匹配、缺少 UI 資產、缺少 tsx 二進位檔）。
- 寫入更新後的設定 + 精靈中繼資料。

## Dreams UI 回填與重置

Control UI 的 Dreams 場景包含針對 grounded dreaming 工作流程的 **Backfill**、**Reset** 和 **Clear Grounded**
動作。這些動作使用閘道 doctor 風格的 RPC 方法，但它們**不**屬於 `openclaw doctor` CLI
修復/遷移的一部分。

其功能如下：

- **Backfill** 會掃描現用工作區中的歷史 `memory/YYYY-MM-DD.md` 檔案，執行 grounded REM 日記
  處理，並將可還原的回填項目寫入 `DREAMS.md`。
- **Reset** 僅會從 `DREAMS.md` 中移除那些標記為回填的日記項目。
- **清除 Grounded** 僅移除來自歷史重放且尚未累積即時回憶或每日支援的暫存僅限 Grounded 的短期條目。

它們本身**不**會執行以下操作：

- 它們不會編輯 `MEMORY.md`
- 它們不會執行完整的 doctor 遷移
- 除非您先明確執行 staged CLI 路徑，否則它們不會自動將 grounded 候選項暫存到即時短期推廣存儲中

如果您希望 grounded 歷史重放影響正常的深度推廣通道，請改用 CLI 流程：

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

這會將 grounded 耐用候選項暫存到短期 dreaming 存儲中，同時將 `DREAMS.md` 保持為審查介面。

## 詳細行為和基本原理

### 0) 可選更新 (git 安裝)

如果這是 git 檢出並且 doctor 正在互動模式下運行，它會提議在執行 doctor 之前更新 (fetch/rebase/build)。

### 1) 配置正規化

如果配置包含舊版值形狀 (例如 `messages.ackReaction` 而沒有通道特定的覆蓋)，doctor 會將其正規化為當前架構。

這包括舊版 Talk 平面欄位。當前的公共 Talk 配置是 `talk.provider` + `talk.providers.<provider>`。Doctor 會將舊的 `talk.voiceId` / `talk.voiceAliases` / `talk.modelId` / `talk.outputFormat` / `talk.apiKey` 形狀重寫為提供者映射。

### 2) 舊版配置鍵遷移

當配置包含已棄用的鍵時，其他命令將拒絕運行並要求您執行 `openclaw doctor`。

Doctor 將會：

- 說明找到了哪些舊版鍵。
- 顯示它應用的遷移。
- 使用更新後的架構重寫 `~/.openclaw/openclaw.json`。

當 Gateway 偵測到舊版配置格式時，也會在啟動時自動執行 doctor 遷移，因此無需人工干預即可修復過時的配置。Cron 任務存儲遷移由 `openclaw doctor --fix` 處理。

當前遷移：

- `routing.allowFrom` → `channels.whatsapp.allowFrom`
- `routing.groupChat.requireMention` → `channels.whatsapp/telegram/imessage.groups."*".requireMention`
- `routing.groupChat.historyLimit` → `messages.groupChat.historyLimit`
- `routing.groupChat.mentionPatterns` → `messages.groupChat.mentionPatterns`
- `routing.queue` → `messages.queue`
- `routing.bindings` → 頂層 `bindings`
- `routing.agents`/`routing.defaultAgentId` → `agents.list` + `agents.list[].default`
- 舊式 `talk.voiceId`/`talk.voiceAliases`/`talk.modelId`/`talk.outputFormat`/`talk.apiKey` → `talk.provider` + `talk.providers.<provider>`
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
- 對於具有命名 `accounts` 但殘留單一帳號頂層通道值的通道，將這些帳號範圍的值移至為該通道選擇的提升帳號中（大多數通道為 `accounts.default`；Matrix 可以保留現有的匹配命名/預設目標）
- `identity` → `agents.list[].identity`
- `agent.*` → `agents.defaults` + `tools.*` (tools/elevated/exec/sandbox/subagents)
- `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks`
  → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
- `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
- `browser.profiles.*.driver: "extension"` → `"existing-session"`
- 移除 `browser.relayBindHost` (舊版擴充功能中繼設定)

Doctor 警告也包含多重帳戶通道的帳戶預設指導：

- 如果設定了兩個或多個 `channels.<channel>.accounts` 項目但未指定 `channels.<channel>.defaultAccount` 或 `accounts.default`，Doctor 會警告備援路由可能會選擇非預期的帳戶。
- 如果 `channels.<channel>.defaultAccount` 設定為未知的帳戶 ID，Doctor 會發出警告並列出已設定的帳戶 ID。

### 2b) OpenCode 提供者覆寫

如果您手動新增了 `models.providers.opencode`、`opencode-zen` 或 `opencode-go`，
它會覆寫來自 `@mariozechner/pi-ai` 的內建 OpenCode 目錄。
這可能會強制模型使用錯誤的 API 或將成本歸零。Doctor 會發出警告，以便您
移除覆寫並恢復依模型的 API 路由 + 成本。

### 2c) 瀏覽器遷移與 Chrome MCP 準備就緒

如果您的瀏覽器設定仍指向已移除的 Chrome 擴充功能路徑，Doctor
會將其正規化為目前的主機本機 Chrome MCP 附加模型：

- `browser.profiles.*.driver: "extension"` 變更為 `"existing-session"`
- `browser.relayBindHost` 已移除

當您使用 `defaultProfile:
"user"` or a configured `existing-session` 設定檔時，Doctor 也會稽核主機本機 Chrome MCP 路徑：

- 檢查是否已在同一台主機上安裝 Google Chrome，以供預設
  自動連線設定檔使用
- 檢查偵測到的 Chrome 版本，當其低於 Chrome 144 時發出警告
- 提醒您在瀏覽器檢查頁面中啟用遠端偵錯（例如
  `chrome://inspect/#remote-debugging`、`brave://inspect/#remote-debugging` 或
  `edge://inspect/#remote-debugging`）

Doctor 無法為您啟用 Chrome 端的設定。主機本機的 Chrome MCP
仍然需要：

- 在 gateway/node 主機上安裝基於 Chromium 144+ 版本的瀏覽器
- 瀏覽器在本機執行
- 在該瀏覽器中啟用遠端偵錯
- 在瀏覽器中批准第一次附加連線的同意提示

此處的準備工作僅涉及本機附加連線的先決條件。現有工作階段會保持
目前的 Chrome MCP 路由限制；進階路由如 `responsebody`、PDF
匯出、下載攔截和批次操作仍需要受管理的
瀏覽器或原始 CDP 設定檔。

此檢查**不**適用於 Docker、sandbox、remote-browser 或其他
無頭流程。這些流程繼續使用原始 CDP。

### 2d) OAuth TLS 先決條件

當設定了 OpenAI Codex OAuth 設定檔時，doctor 會探查 OpenAI
授權端點，以驗證本機 Node/OpenSSL TLS 堆疊是否可以
驗證憑證鏈。如果探查因憑證錯誤而失敗（例如
`UNABLE_TO_GET_ISSUER_CERT_LOCALLY`、過期的憑證或自簽憑證），
doctor 會列印平台特定的修復指引。在使用 Homebrew Node 的 macOS 上，
修復方法通常是 `brew postinstall ca-certificates`。使用 `--deep` 時，即使 gateway 健康狀態良好，探查仍會
執行。

### 2c) Codex OAuth 提供者覆寫

如果您先前在 `models.providers.openai-codex` 下新增了舊版 OpenAI 傳輸設定，它們可能會遮蔽較新版本自動使用的內建 Codex OAuth
提供者路徑。當 Doctor 發現這些舊的傳輸設定與 Codex OAuth 並存時會發出警告，以便您移除或重寫
過時的傳輸覆寫，並恢復內建的路由/後備行為。
自訂代理和僅標頭覆寫仍受支援，且不會
觸發此警告。

### 3) 舊版狀態遷移（磁碟佈局）

Doctor 可以將較舊的磁碟佈局遷移至目前的結構：

- 工作階段存放區 + 逐字稿：
  - 從 `~/.openclaw/sessions/` 到 `~/.openclaw/agents/<agentId>/sessions/`
- Agent 目錄：
  - 從 `~/.openclaw/agent/` 到 `~/.openclaw/agents/<agentId>/agent/`
- WhatsApp 驗證狀態 (Baileys)：
  - 從舊版 `~/.openclaw/credentials/*.json`（`oauth.json` 除外）
  - 到 `~/.openclaw/credentials/whatsapp/<accountId>/...`（預設帳戶 ID：`default`）

這些遷移是盡力而為且具等冪性的；當 doctor 將任何舊版資料夾保留為備份時，會發出警告。Gateway/CLI 也會在啟動時自動遷移舊版 sessions + agent 目錄，以便歷史記錄/驗證/模型能落入每個 agent 的路徑中，而無需手動執行 doctor。WhatsApp 驗證僅透過 `openclaw doctor` 進行遷移。Talk provider/provider-map 標準化現在會比較結構相等性，因此僅鍵順序的差異不再會觸發重複的無操作 `doctor --fix` 變更。

### 3a) 舊版插件清單遷移

Doctor 會掃描所有已安裝的插件清單，尋找已棄用的頂層功能鍵（`speechProviders`、`realtimeTranscriptionProviders`、
`realtimeVoiceProviders`、`mediaUnderstandingProviders`、
`imageGenerationProviders`、`videoGenerationProviders`、`webFetchProviders`、
`webSearchProviders`）。發現時，它會提議將它們移至 `contracts`
物件並就地重寫清單檔案。此遷移是等冪性的；
如果 `contracts` 鍵已經具有相同的值，則會移除舊版鍵而不重複資料。

### 3b) 舊版 cron 儲存遷移

Doctor 也會檢查 cron 任務儲存（預設為 `~/.openclaw/cron/jobs.json`，
或是被覆寫時的 `cron.store`），尋找排程器為了相容性而仍接受的舊任務形狀。

目前的 cron 清理包括：

- `jobId` → `id`
- `schedule.cron` → `schedule.expr`
- 頂層 payload 欄位（`message`、`model`、`thinking`、...）→ `payload`
- 頂層 delivery 欄位（`deliver`、`channel`、`to`、`provider`、...）→ `delivery`
- payload `provider` 傳遞別名 → 明確的 `delivery.channel`
- 簡單的舊版 `notify: true` webhook 備援任務 → 明確的 `delivery.mode="webhook"` 並附帶 `delivery.to=cron.webhook`

Doctor 只會在能不改變行為的情況下自動遷移 `notify: true` 任務。如果任務結合了舊版通知備援與現有的非 webhook 傳遞模式，doctor 會發出警告並將該任務留待手動審查。

### 3c) Session 鎖定清理

Doctor 會掃描每個 agent session 目錄中的過時寫入鎖定檔案——即當 session 異常結束時留下的檔案。對於找到的每個鎖定檔案，它會報告：路徑、PID、PID 是否仍存活、鎖定存在時間，以及是否被視為過時（PID 已死或超過 30 分鐘）。在 `--fix` / `--repair` 模式下，它會自動移除過時的鎖定檔案；否則它會列印備註並指示您使用 `--fix` 重新執行。

### 4) 狀態完整性檢查（session 持久性、路由與安全性）

狀態目錄是操作的核心樞紐。如果它消失，您將失去 sessions、憑證、日誌和設定（除非您在其他地方有備份）。

Doctor 會檢查：

- **State dir missing**：警告災難性的狀態遺失，提示重新建立目錄，並提醒您它無法復原遺失的資料。
- **State dir permissions**：驗證可寫入性；提議修復權限（並在偵測到擁有者/群組不符時發出 `chown` 提示）。
- **macOS cloud-synced state dir**：當狀態解析於 iCloud Drive（`~/Library/Mobile Documents/com~apple~CloudDocs/...`）或 `~/Library/CloudStorage/...` 下方時發出警告，因為同步支援的路徑可能會導致較慢的 I/O 以及鎖定/同步競爭。
- **Linux SD or eMMC state dir**：當狀態解析至 `mmcblk*` 掛載來源時發出警告，因為 SD 或 eMMC 支援的隨機 I/O 在 session 和憑證寫入下可能會變慢且磨損更快。
- **Session dirs missing**：`sessions/` 和 session store 目錄是持久化歷史記錄及避免 `ENOENT` 當機所必需的。
- **Transcript mismatch**：當最近的 session 項目缺少文字紀錄檔案時發出警告。
- **主要會話「單行 JSONL」**：當主要轉錄只有一行時標記（歷史記錄未累積）。
- **多個狀態目錄**：當跨多個主目錄存在多個 `~/.openclaw` 資料夾，或 `OPENCLAW_STATE_DIR` 指向其他位置時發出警告（歷史記錄可能會在安裝之間拆分）。
- **遠端模式提醒**：如果 `gateway.mode=remote`，doctor 會提醒您在遠端主機上執行它（狀態位於該處）。
- **設定檔權限**：如果 `~/.openclaw/openclaw.json` 可被群組/其他人讀取，則發出警告並提議將其收紧至 `600`。

### 5) 模型授權健康狀況 (OAuth 到期)

Doctor 會檢查授權儲存庫中的 OAuth 設定檔，在 Token 即將到期/已到期時發出警告，並在安全時重新整理它們。如果 Anthropic OAuth/token 設定檔已過時，它會建議使用 Anthropic API 金鑰或 Anthropic setup-token 路徑。
重新整理提示僅在互動式 (TTY) 執行時出現；`--non-interactive` 會跳過重新整理嘗試。

當 OAuth 重新整理永久失敗時（例如 `refresh_token_reused`、`invalid_grant`，或提供者告訴您重新登入），doctor 會報告需要重新授權，並列印確切的 `openclaw models auth login --provider ...` 指令以供執行。

Doctor 也會報告因以下原因而暫時無法使用的授權設定檔：

- 短期冷卻（速率限制/逾時/授權失敗）
- 較長期的停用（帳單/信用額度失敗）

### 6) Hooks 模型驗證

如果設定了 `hooks.gmail.model`，doctor 會根據目錄和允許清單驗證模型參照，並在無法解析或被禁止時發出警告。

### 7) Sandbox 映像檔修復

啟用沙箱化後，doctor 會檢查 Docker 映像檔，如果目前的映像檔遺失，會提議建構或切換至舊版名稱。

### 7b) 捆綁的外掛程式執行階段相依項

Doctor 會驗證 OpenClaw 安裝根目錄中是否存在捆綁的外掛程式執行階段相依項（例如 Discord 外掛程式執行階段套件）。如果任何套件遺失，doctor 會報告這些套件並以 `openclaw doctor --fix` / `openclaw doctor --repair` 模式安裝它們。

### 8) Gateway 服務移轉和清理提示

Doctor 會偵測舊版的閘道服務（launchd/systemd/schtasks），並提議將其移除，同時使用目前的閘道連接埠安裝 OpenClaw 服務。它也可以掃描額外類似閘道的服務並列印清理提示。以設定檔命名的 OpenClaw 閘道服務被視為一等公民，不會被標記為「額外」。

### 8b) 啟動時的 Matrix 遷移

當 Matrix 頻道帳戶有待處理或可採取行動的舊狀態遷移時，doctor（在 `--fix` / `--repair` 模式下）會建立遷移前快照，然後執行盡力而為的遷移步驟：舊版 Matrix 狀態遷移和舊版加密狀態準備。這兩個步驟都不是致命的；錯誤會被記錄下來，啟動會繼續。在唯讀模式（`openclaw doctor` 但不帶 `--fix`）下，此檢查會被完全跳過。

### 9) 安全警告

當供應商開放 DM 且沒有允許清單時，或是當策略以危險方式設定時，Doctor 會發出警告。

### 10) systemd linger (Linux)

如果作為 systemd 使用者服務執行，doctor 會確保已啟用 linger 功能，以便在登出後閘道仍能保持運作。

### 11) 工作區狀態（技能、外掛程式和舊版目錄）

Doctor 會列印預設代理程式的工作區狀態摘要：

- **技能狀態**：計算符合資格、缺少需求以及被允許清單阻擋的技能。
- **舊版工作區目錄**：當 `~/openclaw` 或其他舊版工作區目錄
  與目前的工作區並存時發出警告。
- **外掛程式狀態**：計算已載入/已停用/發生錯誤的外掛程式；列出任何
  錯誤的外掛程式 ID；回報套件外掛程式的功能。
- **外掛程式相容性警告**：標記與目前執行環境有相容性問題的
  外掛程式。
- **外掛程式診斷**：顯示外掛程式登錄表在載入時發出的任何警告或錯誤。

### 11b) Bootstrap 檔案大小

Doctor 會檢查工作區引導檔案（例如 `AGENTS.md`、
`CLAUDE.md` 或其他注入的上下文檔案）是否接近或超過設定的
字元預算。它會報告每個檔案的原始字元數與注入字元數之比、截斷
百分比、截斷原因（`max/file` 或 `max/total`），以及總注入
字元數佔總預算的比例。當檔案被截斷或接近
限制時，doctor 會列印調整 `agents.defaults.bootstrapMaxChars`
和 `agents.defaults.bootstrapTotalMaxChars` 的提示。

### 11c) Shell 自動補全

Doctor 會檢查目前 shell
（zsh、bash、fish 或 PowerShell）是否安裝了 Tab 補全功能：

- 如果 shell 設定檔使用緩慢的動態補全模式
  (`source <(openclaw completion ...)`)，doctor 會將其升級為更快的
  快取檔案變體。
- 如果設定檔中設定了補全功能但缺少快取檔案，
  doctor 會自動重新產生快取。
- 如果完全沒有設定補全功能，doctor 會提示安裝
  (僅限互動模式；使用 `--non-interactive` 時會跳過)。

執行 `openclaw completion --write-state` 以手動重新產生快取。

### 12) Gateway auth 檢查 (本機 token)

Doctor 會檢查本機 gateway token 的 auth 準備情況。

- 如果 token 模式需要 token 但沒有 token 來源，doctor 會提議產生一個。
- 如果 `gateway.auth.token` 是由 SecretRef 管理但無法取得，doctor 會發出警告，且不會以純文字覆寫它。
- `openclaw doctor --generate-gateway-token` 僅在未設定 token SecretRef 時強制產生。

### 12b) 唯讀 SecretRef 感知的修復

某些修復流程需要檢查設定的憑證，而不會削弱執行時期的快速失敗 (fail-fast) 行為。

- `openclaw doctor --fix` 現在使用與 status 系列命令相同的唯讀 SecretRef 摘要模型，以進行目標設定修復。
- 例如：Telegram `allowFrom` / `groupAllowFrom` `@username` 修復會嘗試在可用時使用設定的 bot 憑證。
- 如果 Telegram bot token 是透過 SecretRef 設定，但在目前的指令路徑中無法取得，doctor 會回報該憑證為「已設定但無法取得」，並跳過自動解析，而不是當機或錯誤地回報 token 遺失。

### 13) Gateway 健康檢查 + 重新啟動

Doctor 會執行健康檢查，並在 gateway 看起來不健康時提供重新啟動的選項。

### 13b) 記憶體搜尋就緒狀態

Doctor 會檢查為預設代理程式設定的記憶體搜尋嵌入提供者是否已就緒。具體行為取決於設定的後端與提供者：

- **QMD 後端**：探測 `qmd` 二進位檔案是否可用且可啟動。
  若否，則會印出修復指引，包括 npm 套件與手動二進位路徑選項。
- **明確的本機提供者**：檢查是否有本機模型檔案或可識別的
  遠端/可下載模型 URL。若缺少，則建議切換至遠端提供者。
- **明確的遠端提供者** (`openai`、`voyage` 等)：驗證環境變數或認證儲存中
  是否存在 API 金鑰。若缺少，則印出可執行的修復提示。
- **自動提供者**：先檢查本機模型可用性，然後依照自動選擇順序嘗試各個
  遠端提供者。

當有 gateway 探測結果可用時（在檢查時期 gateway 為健康狀態），
doctor 會將其結果與 CLI 可見的設定進行比對，並標記任何差異。

使用 `openclaw memory status --deep` 在執行時期驗證嵌入就緒狀態。

### 14) 頻道狀態警告

若 gateway 為健康狀態，doctor 會執行頻道狀態探測並回報
帶有建議修復方式的警告。

### 15) Supervisor 設定稽核 + 修復

Doctor 會檢查已安裝的 supervisor 設定 (launchd/systemd/schtasks) 是否
缺少或過時的預設值（例如：systemd network-online 相依性與
重新啟動延遲）。當發現不符時，它會建議更新並可
將服務檔案/任務重寫為目前的預設值。

備註：

- `openclaw doctor` 會在重寫 supervisor 設定前提示。
- `openclaw doctor --yes` 接受預設的修復提示。
- `openclaw doctor --repair` 無提示地套用建議的修復。
- `openclaw doctor --repair --force` 會覆寫自訂的 supervisor 設定。
- 如果 token 認證需要 token 且 `gateway.auth.token` 是由 SecretRef 管理的，doctor 服務安裝/修復會驗證 SecretRef，但不會將解析後的明文 token 值持久化到 supervisor 服務環境元數據中。
- 如果 token 認證需要 token 且配置的 token SecretRef 未解析，doctor 會以可操作的指導阻止安裝/修復路徑。
- 如果同時配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，doctor 會阻止安裝/修復，直到明確設定模式。
- 對於 Linux user-systemd 單元，doctor token 偏差檢查現在在比較服務認證元數據時，會同時包含 `Environment=` 和 `EnvironmentFile=` 來源。
- 您始終可以透過 `openclaw gateway install --force` 強制完整重寫。

### 16) Gateway 運行時 + 端口診斷

Doctor 會檢查服務運行時（PID、上次退出狀態），並在服務已安裝但實際未運行時發出警告。它還會檢查 gateway 端口（預設為 `18789`）上的端口衝突，並報告可能的原因（gateway 已在運行、SSH 隧道）。

### 17) Gateway 運行時最佳實踐

當 gateway 服務在 Bun 或版本管理的 Node 路徑（`nvm`、`fnm`、`volta`、`asdf` 等）上運行時，Doctor 會發出警告。WhatsApp + Telegram 頻道需要 Node，且由於服務不會加載您的 shell 初始化檔案，版本管理器路徑可能在升級後中斷。如果可用，Doctor 會提議遷移到系統 Node 安裝（Homebrew/apt/choco）。

### 18) 配置寫入 + 精靈元數據

Doctor 會持久化任何配置更改並標記精靈元數據以記錄 doctor 運行。

### 19) 工作區提示（備份 + 記憶系統）

如果缺少工作區記憶系統，Doctor 會建議建立；如果工作區尚未受 git 管理，它會列印備份提示。

有關工作區結構和 git 備份（建議使用私有 GitHub 或 GitLab）的完整指南，請參閱 [/concepts/agent-workspace](/en/concepts/agent-workspace)。
