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
- 裝置配對故障檢測（待處理的首次配對請求、待處理的角色/範圍升級、過期的本機裝置令牌快取漂移，以及配對記錄認證漂移）。
- Linux 上的 systemd linger 檢查。
- 工作區啟動檔案大小檢查（針對上下文檔案的截斷/接近限制警告）。
- Shell 自動完成狀態檢查以及自動安裝/升級。
- 記憶體搜尋嵌入提供者就緒檢查（本機模型、遠端 API 金鑰或 QMD 二進位檔）。
- 原始碼安裝檢查（pnpm 工作區不匹配、缺少 UI 資產、缺少 tsx 二進位檔）。
- 寫入更新的設定 + 精靈元資料。

## Dreams UI 回填與重置

控制 UI Dreams 場景包含 **Backfill**（回填）、**Reset**（重置）和 **Clear Grounded**（清除落地）
操作，用於落地式夢境工作流程。這些操作使用 gateway
doctor 風格的 RPC 方法，但它們**並不**屬於 `openclaw doctor` CLI
修復/遷移的一部分。

它們的功能：

- **Backfill** 會掃描活動工作區中的歷史 `memory/YYYY-MM-DD.md` 檔案，執行落地 REM 日記傳遞，並將可逆的回填
  項目寫入 `DREAMS.md`。
- **Reset** 僅從 `DREAMS.md` 中移除那些標記為回填的日記項目。
- **Clear Grounded** 僅移除那些來自歷史重放且尚未累積即時回憶或每日支援的
  暫存純落地短期項目。

它們自身**不**會做的事情：

- 它們不會編輯 `MEMORY.md`
- 它們不會執行完整的 doctor 遷移
- 除非您先明確執行暫存的 CLI 路徑，否則它們不會自動將落地候選暫存到即時短期
  推廣儲存庫中

如果您希望落地歷史重放能影響正常的深度推廣管道，請改用 CLI 流程：

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

這會將落地持久候選暫存到短期夢境儲存庫中，同時
保持 `DREAMS.md` 作為審查介面。

## 詳細行為與基本原理

### 0) 可選更新（git 安裝）

如果這是 git checkout 且 doctor 正以互動方式執行，它會在執行 doctor 前提供
更新 (fetch/rebase/build)。

### 1) 設定正規化

如果設定包含舊版值形狀（例如 `messages.ackReaction`
沒有特定頻道覆蓋），doctor 會將其正規化為目前
的 schema。

這包括舊版 Talk 平坦欄位。目前的公開 Talk 配置是
`talk.provider` + `talk.providers.<provider>`。Doctor 會將舊的
`talk.voiceId` / `talk.voiceAliases` / `talk.modelId` / `talk.outputFormat` /
`talk.apiKey` 形狀重寫為提供者對應。

### 2) 舊版配置鍵遷移

當配置包含已棄用的鍵時，其他指令會拒絕執行並要求您
執行 `openclaw doctor`。

Doctor 將會：

- 說明找到了哪些舊版鍵。
- 顯示其套用的遷移。
- 使用更新的結構描述重寫 `~/.openclaw/openclaw.json`。

當 Gateway 偵測到舊版配置格式時，也會在啟動時自動執行 doctor 遷移，因此無需人工介入即可修復過時的配置。
Cron job 存儲遷移由 `openclaw doctor --fix` 處理。

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
- 對於具有命名 `accounts` 但仍有殘留的單帳戶頂層通道值的通道，將這些帳戶範圍的值移至為該通道選擇的升級帳戶中（大多數通道為 `accounts.default`；Matrix 可以保留現有的匹配命名/預設目標）
- `identity` → `agents.list[].identity`
- `agent.*` → `agents.defaults` + `tools.*` (tools/elevated/exec/sandbox/subagents)
- `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks`
  → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
- `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
- `browser.profiles.*.driver: "extension"` → `"existing-session"`
- 移除 `browser.relayBindHost`（舊版擴充功能中繼設定）

Doctor 警告還包括多帳戶通道的帳戶預設指導：

- 如果配置了兩個或多個 `channels.<channel>.accounts` 項目但沒有 `channels.<channel>.defaultAccount` 或 `accounts.default`，Doctor 會警告後備路由可能會選擇非預期的帳戶。
- 如果 `channels.<channel>.defaultAccount` 設置為未知的帳戶 ID，Doctor 會警告並列出已配置的帳戶 ID。

### 2b) OpenCode 提供者覆蓋

如果您手動添加了 `models.providers.opencode`、`opencode-zen` 或 `opencode-go`，它將覆蓋 `@mariozechner/pi-ai` 的內建 OpenCode 目錄。這可能會強制模型使用錯誤的 API 或將成本歸零。Doctor 會發出警告，以便您移除覆蓋並恢復逐模型的 API 路由 + 成本。

### 2c) 瀏覽器遷移和 Chrome MCP 準備情況

如果您的瀏覽器配置仍指向已移除的 Chrome 擴充功能路徑，Doctor 會將其標準化為目前的主機本機 Chrome MCP 附加模型：

- `browser.profiles.*.driver: "extension"` 變成 `"existing-session"`
- `browser.relayBindHost` 已移除

當您使用 `defaultProfile:
"user"` or a configured `existing-session` 配置文件時，Doctor 也會稽核主機本機 Chrome MCP 路徑：

- 檢查預設自動連接配置文件的主機上是否安裝了 Google Chrome
- 檢查偵測到的 Chrome 版本，當其低於 Chrome 144 時發出警告
- 提醒您在瀏覽器檢查頁面中啟用遠端偵錯（例如 `chrome://inspect/#remote-debugging`、`brave://inspect/#remote-debugging` 或 `edge://inspect/#remote-debugging`）

Doctor 無法為您啟用 Chrome 端的設置。主機本機 Chrome MCP 仍然需要：

- 在 gateway/node 主機上安裝基於 Chromium 的瀏覽器 144+
- 瀏覽器在本地運行
- 在該瀏覽器中啟用遠端偵錯
- 在瀏覽器中批准第一次附加同意提示

此處的準備情況僅涉及本地附加的先決條件。Existing-session 保持目前的 Chrome MCP 路由限制；像 `responsebody`、PDF 匯出、下載攔截和批次操作這類高級路由仍然需要受管理的瀏覽器或原始 CDP 配置文件。

此檢查**不**適用於 Docker、沙箱、遠端瀏覽器或其他無頭流程。這些流程繼續使用原始 CDP。

### 2d) OAuth TLS 先決條件

當配置了 OpenAI Codex OAuth 設定檔時，doctor 會探測 OpenAI
授權端點，以驗證本機 Node/OpenSSL TLS 堆疊是否能
驗證憑證鏈結。如果探測因憑證錯誤而失敗（例如
`UNABLE_TO_GET_ISSUER_CERT_LOCALLY`、過期的憑證或自我簽署憑證），
doctor 會列印平台特定的修復指引。在搭配 Homebrew Node 的 macOS 上，
修復方法通常是 `brew postinstall ca-certificates`。若使用
`--deep`，即使閘道狀況良好，探測仍會
執行。

### 2c) Codex OAuth 提供者覆寫

如果您先前在 `models.providers.openai-codex` 下新增了舊版 OpenAI 傳輸設定，
它們可能會遮蔽較新版本自動使用的內建 Codex OAuth
提供者路徑。當 doctor 發現這些舊的傳輸設定與 Codex OAuth 並存時會發出警告，
以便您移除或重寫過時的傳輸覆寫，並恢復內建的路由/故障轉移行為。
自訂代理伺服器和僅標頭的覆寫仍受支援，且不會觸發此警告。

### 3) 舊版狀態遷移（磁碟佈局）

Doctor 可以將較舊的磁碟佈局遷移至目前的結構：

- Sessions 存放區 + 逐字稿：
  - 從 `~/.openclaw/sessions/` 到 `~/.openclaw/agents/<agentId>/sessions/`
- Agent 目錄：
  - 從 `~/.openclaw/agent/` 到 `~/.openclaw/agents/<agentId>/agent/`
- WhatsApp 驗證狀態 (Baileys)：
  - 從舊版 `~/.openclaw/credentials/*.json`（`oauth.json` 除外）
  - 到 `~/.openclaw/credentials/whatsapp/<accountId>/...`（預設帳戶 ID：`default`）

這些遷移為盡力而為且具冪等性；當 doctor 將任何舊版資料夾保留為備份時，
會發出警告。Gateway/CLI 也會在啟動時自動遷移
舊版 sessions + agent 目錄，使記錄/驗證/模型能落在
各 agent 的路徑上，而無需手動執行 doctor。WhatsApp 驗證
僅透過 `openclaw doctor` 進行有意遷移。
Talk provider/provider-map 正規化現在會以結構相等性進行比較，
因此僅鍵順序的差異不再會觸發重複的無操作
`doctor --fix` 變更。

### 3a) 舊版外掛清單遷移

Doctor 會掃描所有已安裝的外掛清單，尋找已棄用的頂層功能鍵 (`speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`, `webSearchProviders`)。當找到這些鍵時，它會建議將其移至 `contracts` 物件中，並就地重寫清單檔案。此遷移具備等冪性；如果 `contracts` 鍵已經具有相同的值，則會移除舊版鍵而不重複資料。

### 3b) 舊版 cron 儲存遷移

Doctor 也會檢查 cron 任務儲存 (預設為 `~/.openclaw/cron/jobs.json`，或在被覆寫時為 `cron.store`) 中排程器為了相容性仍接受的舊任務形狀。

目前的 cron 清理項目包括：

- `jobId` → `id`
- `schedule.cron` → `schedule.expr`
- 頂層 payload 欄位 (`message`, `model`, `thinking`, ...) → `payload`
- 頂層 delivery 欄位 (`deliver`, `channel`, `to`, `provider`, ...) → `delivery`
- payload `provider` delivery 別名 → 明確的 `delivery.channel`
- 簡單的舊版 `notify: true` webhook 後備任務 → 明確的 `delivery.mode="webhook"` 並帶有 `delivery.to=cron.webhook`

Doctor 只有在能夠不改變行為的情況下，才會自動遷移 `notify: true` 任務。如果任務結合了舊版 notify 後備機制與現有的非 webhook 傳遞模式，doctor 會發出警告並保留該任務供手動審查。

### 3c) 會話鎖定清理

Doctor 會掃描每個代理程式工作階段目錄中的過期寫入鎖定檔案——即當工作階段異常結束時遺留下的檔案。對於找到的每個鎖定檔案，它會報告：路徑、PID、PID 是否仍處於運作狀態、鎖定存在時間，以及是否被視為過期（PID 已終止或存在時間超過 30 分鐘）。在 `--fix` / `--repair` 模式下，它會自動移除過期的鎖定檔案；否則它會列印一則提示，並指示您使用 `--fix` 重新執行。

### 4) 狀態完整性檢查（工作階段持久性、路由與安全性）

狀態目錄是運作的核心。如果它消失，您將失去工作階段、憑證、日誌和配置（除非您在其他地方有備份）。

Doctor 檢查項目：

- **State dir missing**（狀態目錄遺失）：針對災難性的狀態資料遺失發出警告，提示重新建立該目錄，並提醒您無法復原遺失的資料。
- **State dir permissions**（狀態目錄權限）：驗證可寫入性；提議修復權限（並且在偵測到擁有者/群組不匹配時發出 `chown` 提示）。
- **macOS cloud-synced state dir**（macOS 雲端同步狀態目錄）：當狀態解析於 iCloud Drive (`~/Library/Mobile Documents/com~apple~CloudDocs/...`) 或 `~/Library/CloudStorage/...` 之下時發出警告，因為同步備份的路徑可能會導致較慢的 I/O 以及鎖定/同步競爭。
- **Linux SD or eMMC state dir**（Linux SD 或 eMMC 狀態目錄）：當狀態解析至 `mmcblk*` 掛載來源時發出警告，因為 SD 或 eMMC 備份的隨機 I/O 在工作階段和憑證寫入下可能會變慢且磨損更快。
- **Session dirs missing**（工作階段目錄遺失）：`sessions/` 與工作階段存放目錄是持續保留歷史記錄及避免 `ENOENT` 當機所必需的。
- **Transcript mismatch**（文字記錄不匹配）：當最近的工作階段項目缺少文字記錄檔案時發出警告。
- **Main session “1-line JSONL”**（主工作階段「單行 JSONL」）：當主要文字記錄只有一行時發出標記（表示歷史記錄未正在累積）。
- **Multiple state dirs**（多個狀態目錄）：當多個 `~/.openclaw` 資料夾存在於不同的主目錄中，或當 `OPENCLAW_STATE_DIR` 指向其他位置時發出警告（歷史記錄可能會在不同的安裝之間分散）。
- **Remote mode reminder**（遠端模式提醒）：如果 `gateway.mode=remote`，doctor 會提醒您在遠端主機上執行它（狀態位於該處）。
- **設定檔案權限**：如果 `~/.openclaw/openclaw.json` 可被群組/全世界讀取則發出警告，並提供建議將其收紧至 `600`。

### 5) 模型授權健康狀況 (OAuth 過期)

Doctor 會檢查授權儲存中的 OAuth 設定檔，在權杖即將過期或已過期時發出警告，並在安全時進行更新。如果 Anthropic OAuth/token 設定檔已過時，它會建議使用 Anthropic API 金鑰或 Anthropic setup-token 路徑。
重新整理提示僅在以互動模式 (TTY) 執行時出現；`--non-interactive` 會跳過重新整理嘗試。

當 OAuth 重新整理永久失敗時 (例如 `refresh_token_reused`、`invalid_grant`，或提供商告知您需重新登入)，doctor 會報告需要重新授權，並列印確切的 `openclaw models auth login --provider ...` 指令以供執行。

Doctor 也會報告因以下原因而暫時無法使用的授權設定檔：

- 短暫冷卻 (速率限制/逾時/授權失敗)
- 較長時間的停用 (帳單/信用額度失敗)

### 6) Hooks 模型驗證

如果設定了 `hooks.gmail.model`，doctor 會針對目錄和允許清單驗證模型參照，並在無法解析或被禁止時發出警告。

### 7) Sandbox 映像檔修復

啟用沙箱機制後，doctor 會檢查 Docker 映像檔，如果目前的映像檔遺失，會提供建構或切換至舊版名稱的選項。

### 7b) 內掛外掛程式執行時間依賴項

Doctor 僅驗證目前設定中啟用或依其內掛清單預設啟用的內掛外掛程式的執行時間依賴項，例如 `plugins.entries.discord.enabled: true`、舊版 `channels.discord.enabled: true` 或預設啟用的內掛提供者。如果有任何遺漏，doctor 會報告套件並以 `openclaw doctor --fix` / `openclaw doctor --repair` 模式安裝它們。外部外掛程式仍使用 `openclaw plugins install` / `openclaw plugins update`；doctor 不會為任意外掛程式路徑安裝依賴項。

### 8) 閘道服務移轉與清理提示

Doctor 會偵測舊版的閘道服務（launchd/systemd/schtasks），並提議移除它們，然後使用目前的閘道連接埠安裝 OpenClaw 服務。它也可以掃描額外的類閘道服務並印出清理提示。以設定檔命名的 OpenClaw 閘道服務被視為一等公民，不會被標記為「額外」。

### 8b) 啟動時 Matrix 遷移

當 Matrix 頻道帳號有待處理或可採取行動的舊版狀態遷移時，doctor（在 `--fix` / `--repair` 模式下）會建立遷移前快照，然後執行盡力而為的遷移步驟：舊版 Matrix 狀態遷移和舊版加密狀態準備。這兩個步驟都不是致命的；錯誤會被記錄下來，啟動會繼續。在唯讀模式（`openclaw doctor` 但沒有 `--fix`）下，此檢查會被完全跳過。

### 8c) 裝置配對與認證偏移

Doctor 現在會將檢查裝置配對狀態作為常規健康檢查的一部分。

它會回報：

- 待處理的首次配對請求
- 已配對裝置待處理的角色升級
- 已配對裝置待處理的範圍升級
- 公鑰不符修復，即裝置 ID 仍然相符，但裝置身分不再符合已核准的記錄
- 已配對記錄缺少已核准角色的有效權杖
- 已配對權杖的範圍偏移出已核准的配對基準
- 目前機器本機快取的裝置權杖條目，其時間早於閘道端權杖輪替，或帶有過期的範圍元資料

Doctor 不會自動核准配對請求或自動輪替裝置權杖。相反地，它會印出確切的後續步驟：

- 使用 `openclaw devices list` 檢查待處理的請求
- 使用 `openclaw devices approve <requestId>` 核準確切的請求
- 使用 `openclaw devices rotate --device <deviceId> --role <role>` 輪替新的權杖
- 使用 `openclaw devices remove <deviceId>` 移除並重新核准過期的記錄

這解決了常見的「已配對但仍要求配對」漏洞：doctor 現在能區分首次配對、待處理的角色/範圍升級，以及過期權杖/裝置身分偏移。

### 9) 安全性警告

當提供者未設定允許清單即開放 DM，或政策設定方式危險時，Doctor 會發出警告。

### 10) systemd linger (Linux)

如果作為 systemd 使用者服務執行，doctor 會確保啟用 lingering，以便在登出後閘道保持運作。

### 11) 工作區狀態（技能、外掛和舊版目錄）

Doctor 會列印預設代理程式的工作區狀態摘要：

- **技能狀態**：計算符合資格、缺少需求和允許清單封鎖的技能。
- **舊版工作區目錄**：當 `~/openclaw` 或其他舊版工作區目錄與目前的工作區並存時發出警告。
- **外掛狀態**：計算已載入/已停用/錯誤的外掛；列出任何錯誤的外掛 ID；回報套件組合外掛的功能。
- **外掛相容性警告**：標記與目前執行環境有相容性問題的外掛。
- **外掛診斷**：顯示外掛註冊表發出的任何載入時警告或錯誤。

### 11b) Bootstrap 檔案大小

Doctor 會檢查工作區 bootstrap 檔案（例如 `AGENTS.md`、`CLAUDE.md` 或其他插入的上下文檔案）是否接近或超過設定的字元預算。它會回報每個檔案的原始與插入字元計數、截斷百分比、截斷原因（`max/file` 或 `max/total`），以及總插入字元佔總預算的比例。當檔案被截斷或接近限制時，doctor 會列印調整 `agents.defaults.bootstrapMaxChars` 和 `agents.defaults.bootstrapTotalMaxChars` 的提示。

### 11c) Shell 自動補全

Doctor 會檢查目前 shell（zsh、bash、fish 或 PowerShell）是否安裝了 Tab 補全功能：

- 如果 shell 設定檔使用緩慢的動態補全模式（`source <(openclaw completion ...)`），doctor 會將其升級為更快的快取檔案變體。
- 如果在設定檔中設定了補全但快取檔案遺失，doctor 會自動重新產生快取。
- 如果完全沒有設定補全，doctor 會提示安裝（僅限互動模式；使用 `--non-interactive` 時跳過）。

執行 `openclaw completion --write-state` 以手動重新產生快取。

### 12) 閘道驗證檢查（本機權杖）

Doctor 會檢查本機閘道權杖驗證的準備情況。

- 如果權杖模式需要權杖但不存在權杖來源，doctor 會提議產生一個。
- 如果 `gateway.auth.token` 由 SecretRef 管理但不可用，doctor 會發出警告，並不會用純文字覆蓋它。
- `openclaw doctor --generate-gateway-token` 僅在未設定 token SecretRef 時強制產生。

### 12b) 具備唯讀 SecretRef 感知能力的修復

某些修復流程需要檢查設定的憑證，而不會削弱執行時期的快速失敗行為。

- `openclaw doctor --fix` 現在對於針對性的配置修復，使用與 status 系列指令相同的唯讀 SecretRef 摘要模型。
- 範例：Telegram `allowFrom` / `groupAllowFrom` `@username` 修復會嘗試在可用時使用設定的機器人憑證。
- 如果 Telegram 機器人 token 是透過 SecretRef 設定，但在目前的指令路徑中無法取得，doctor 會回報該憑證為已設定但無法取得，並跳過自動解析，而不是當機或錯誤地回報 token 遺失。

### 13) Gateway 健康檢查 + 重新啟動

Doctor 會執行健康檢查，並在 Gateway 看起來不健康時提議重新啟動。

### 13b) 記憶體搜尋就緒狀態

Doctor 會檢查為預設代理程式設定的記憶體搜尋嵌入提供者是否已就緒。其行為取決於設定的後端與提供者：

- **QMD 後端**：探測 `qmd` 二進位檔案是否可用且可啟動。
  如果否，會列印修復指引，包括 npm 套件和手動二進位路徑選項。
- **明確的本機提供者**：檢查是否有本機模型檔案或可識別的
  遠端/可下載模型 URL。如果遺失，建議切換到遠端提供者。
- **明確的遠端提供者** (`openai`、`voyage` 等)：驗證環境變數或認證儲存中是否存在 API 金鑰。
  如果遺失，會列印可執行的修復提示。
- **自動提供者**：先檢查本機模型可用性，然後依照自動選擇順序嘗試每個遠端
  提供者。

當 Gateway 探測結果可用時（檢查時 Gateway 為健康狀態），doctor 會將其結果與 CLI 可見的配置進行比對，並記錄任何差異。

使用 `openclaw memory status --deep` 在執行時期驗證嵌入就緒狀態。

### 14) 頻道狀態警告

若閘道狀態正常，Doctor 會執行通道狀態探測，並回報帶有建議修復方式的警告。

### 15) Supervisor 設定稽核與修復

Doctor 會檢查已安裝的 Supervisor 設定（launchd/systemd/schtasks），查看是否有遺漏或過時的預設值（例如 systemd network-online 相依性和重新啟動延遲）。當發現不一致時，它會建議進行更新，並可將服務檔案/工作重寫為目前的預設值。

備註：

- `openclaw doctor` 在重寫 Supervisor 設定之前會先提示。
- `openclaw doctor --yes` 接受預設的修復提示。
- `openclaw doctor --repair` 套用建議的修復，無需提示。
- `openclaw doctor --repair --force` 覆寫自訂的 Supervisor 設定。
- 如果權杖驗證需要權杖，且 `gateway.auth.token` 是由 SecretRef 管理，Doctor 服務安裝/修復會驗證 SecretRef，但不會將解析出的明文權杖值持久化到 Supervisor 服務環境元資料中。
- 如果權杖驗證需要權杖且設定的權杖 SecretRef 未解析，Doctor 會透過可執行的指引阻擋安裝/修復流程。
- 如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password`，且未設定 `gateway.auth.mode`，Doctor 會阻擋安裝/修復，直到明確設定模式。
- 對於 Linux user-systemd 單元，Doctor 權杖偏移檢查現在會在比較服務驗證元資料時，同時包含 `Environment=` 和 `EnvironmentFile=` 來源。
- 您隨時可以透過 `openclaw gateway install --force` 強制完整重寫。

### 16) 閘道執行階段與連接埠診斷

Doctor 會檢查服務執行階段（PID、上次結束狀態），並在服務已安裝但實際未執行時發出警告。它還會檢查閘道連接埠（預設為 `18789`）是否有連接埠衝突，並回報可能的原因（閘道已在執行中、SSH 隧道）。

### 17) 閘道執行階段最佳實務

當閘道服務在 Bun 或受版本管理的 Node 路徑（`nvm`、`fnm`、`volta`、`asdf` 等）上執行時，Doctor 會發出警告。WhatsApp 和 Telegram 頻道需要 Node，而且由於服務不會載入您的 shell 初始化檔案，版本管理器路徑可能會在升級後中斷。當有系統 Node 安裝可用時（Homebrew/apt/choco），Doctor 會提議遷移至該安裝。

### 18) 寫入設定 + 精靈元數據

Doctor 會保存任何設定變更並標記精靈元數據，以記錄 Doctor 的執行過程。

### 19) 工作區提示（備份 + 記憶系統）

當缺少工作區記憶系統時，Doctor 會建議安裝一個；如果工作區尚未納入 git 管理，則會列印備份提示。

請參閱 [/concepts/agent-workspace](/zh-Hant/concepts/agent-workspace) 以取得工作區結構和 git 備份（建議使用私有的 GitHub 或 GitLab）的完整指南。
