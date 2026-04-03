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
- 瀏覽器遷移檢查，針對舊版 Chrome 擴充功能設定和 Chrome MCP 準備情況。
- OpenCode 提供者覆寫警告（`models.providers.opencode` / `models.providers.opencode-go`）。
- OpenAI Codex OAuth 設定檔的 OAuth TLS 先決條件檢查。
- 舊版磁碟狀態遷移（sessions/agent dir/WhatsApp auth）。
- 舊版外掛程式清單合約金鑰遷移（`speechProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders` → `contracts`）。
- 舊版 cron 存儲遷移（`jobId`, `schedule.cron`, 頂層 delivery/payload 欄位, payload `provider`, 簡單 `notify: true` webhook 備援作業）。
- 工作階段鎖定檔案檢查與過時鎖定清理。
- 狀態完整性與權限檢查（sessions, transcripts, state dir）。
- 在本機執行時的設定檔權限檢查 (chmod 600)。
- 模型驗證健康狀況：檢查 OAuth 過期時間，可重新整理過期權杖，並回報驗證設定檔冷卻/停用狀態。
- 額外工作區目錄偵測 (`~/openclaw`)。
- 啟用沙箱時修復沙箱映像檔。
- 舊版服務遷移與額外閘道偵測。
- Matrix 頻道舊版狀態遷移（在 `--fix` / `--repair` 模式下）。
- 閘道執行時檢查（服務已安裝但未執行；快取的 launchd 標籤）。
- 頻道狀態警告（從執行中的閘道探查）。
- 監督者設定稽核 (launchd/systemd/schtasks) 並提供選擇性修復。
- 閘道執行時最佳實踐檢查（Node vs Bun, 版本管理程式路徑）。
- 閘道連接埠衝突診斷（預設 `18789`）。
- 針對開放 DM 原則的安全性警告。
- 本機權杖模式的閘道驗證檢查（當不存在權杖來源時提供權杖產生；不會覆寫權杖 SecretRef 設定）。
- Linux 上的 systemd linger 檢查。
- 工作區啟動檔案大小檢查（針對內容檔案的截斷/接近限制警告）。
- Shell 完成狀態檢查與自動安裝/升級。
- 記憶體搜尋嵌入提供者就緒檢查（本機模型、遠端 API 金鑰或 QMD 二進位檔）。
- 原始碼安裝檢查（pnpm 工作區不匹配、遺失 UI 資產、遺失 tsx 二進位檔）。
- 寫入更新的設定 + 精靈中繼資料。

## 詳細行為與基本原理

### 0) 可選更新（git 安裝）

如果是 git checkout 並且 doctor 正在互動模式下運行，它會提供在運行 doctor 之前更新（fetch/rebase/build）。

### 1) 配置正規化

如果配置包含舊版值形狀（例如 `messages.ackReaction` 而沒有特定頻道的覆蓋），doctor 會將其正規化為當前的 schema。

### 2) 舊版配置鍵遷移

當配置包含已棄用的鍵時，其他指令將拒絕運行並要求您執行 `openclaw doctor`。

Doctor 將：

- 解釋找到了哪些舊版鍵。
- 顯示應用的遷移。
- 使用更新的 schema 重寫 `~/.openclaw/openclaw.json`。

當 Gateway 檢測到舊版配置格式時，也會在啟動時自動執行 doctor 遷移，因此無需人工干預即可修復過時的配置。Cron 工作存儲遷移由 `openclaw doctor --fix` 處理。

目前的遷移：

- `routing.allowFrom` → `channels.whatsapp.allowFrom`
- `routing.groupChat.requireMention` → `channels.whatsapp/telegram/imessage.groups."*".requireMention`
- `routing.groupChat.historyLimit` → `messages.groupChat.historyLimit`
- `routing.groupChat.mentionPatterns` → `messages.groupChat.mentionPatterns`
- `routing.queue` → `messages.queue`
- `routing.bindings` → 頂層 `bindings`
- `routing.agents`/`routing.defaultAgentId` → `agents.list` + `agents.list[].default`
- `routing.agentToAgent` → `tools.agentToAgent`
- `routing.transcribeAudio` → `tools.media.audio.models`
- `messages.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `messages.tts.providers.<provider>`
- `channels.discord.voice.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `channels.discord.voice.tts.providers.<provider>`
- `channels.discord.accounts.<id>.voice.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `channels.discord.accounts.<id>.voice.tts.providers.<provider>`
- `plugins.entries.voice-call.config.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `plugins.entries.voice-call.config.tts.providers.<provider>`
- `bindings[].match.accountID` → `bindings[].match.accountId`
- 對於具有命名 `accounts` 但缺少 `accounts.default` 的頻道，如果存在帳戶範圍的頂層單一帳戶頻道值，則將其移動到 `channels.<channel>.accounts.default` 中
- `identity` → `agents.list[].identity`
- `agent.*` → `agents.defaults` + `tools.*` (tools/elevated/exec/sandbox/subagents)
- `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks`
  → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
- `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
- `browser.profiles.*.driver: "extension"` → `"existing-session"`
- 移除 `browser.relayBindHost` (舊版擴充功能中繼設定)

Doctor 警告還包括多帳戶頻道的帳戶預設指引：

- 如果設定了兩個或多個 `channels.<channel>.accounts` 項目但沒有 `channels.<channel>.defaultAccount` 或 `accounts.default`，Doctor 會警告備用路由可能會選擇意外的帳戶。
- 如果 `channels.<channel>.defaultAccount` 設定為未知的帳戶 ID，Doctor 會警告並列出已設定的帳戶 ID。

### 2b) OpenCode 提供者覆寫

如果您已手動新增 `models.providers.opencode`、`opencode-zen` 或 `opencode-go`，
它會覆寫來自 `@mariozechner/pi-ai` 的內建 OpenCode 目錄。
這可能會將模型強制切換到錯誤的 API 或將成本歸零。Doctor 會發出警告，以便您
移除覆寫並恢復每個模型的 API 路由和成本。

### 2c) 瀏覽器遷移與 Chrome MCP 準備工作

如果您的瀏覽器配置仍然指向已移除的 Chrome 擴充功能路徑，doctor
會將其正規化為當前的主機本機 Chrome MCP 附加模型：

- `browser.profiles.*.driver: "extension"` 會變成 `"existing-session"`
- `browser.relayBindHost` 會被移除

當您使用 `defaultProfile:
"user"` or a configured `existing-session` 設定檔時，doctor 也會審核主機本機 Chrome MCP 路徑：

- 檢查預設自動連線設定檔的相同主機上是否已安裝 Google Chrome
- 檢查偵測到的 Chrome 版本，當其低於 Chrome 144 時發出警告
- 提醒您在瀏覽器檢查頁面中啟用遠端偵錯（例如
  `chrome://inspect/#remote-debugging`、`brave://inspect/#remote-debugging`
  或 `edge://inspect/#remote-debugging`）

Doctor 無法為您啟用 Chrome 端的設定。主機本機 Chrome MCP
仍然需要：

- 在 gateway/node 主機上安裝基於 Chromium 的瀏覽器 144 以上版本
- 瀏覽器在本機執行
- 在該瀏覽器中啟用遠端偵錯
- 在瀏覽器中批准第一次附加同意提示

此檢查**不**適用於 Docker、sandbox、remote-browser 或其他
無頭流程。這些流程繼續使用原始 CDP。

### 2d) OAuth TLS 先決條件

當設定 OpenAI Codex OAuth 設定檔時，doctor 會探查 OpenAI
授權端點，以驗證本機 Node/OpenSSL TLS 堆疊是否
可以驗證憑證鏈。如果探查因憑證錯誤（例如
`UNABLE_TO_GET_ISSUER_CERT_LOCALLY`、過期憑證或自我簽署憑證）而失敗，
doctor 會列印平台特定的修復指南。在 macOS 上使用 Homebrew Node 時，
修復方法通常是 `brew postinstall ca-certificates`。使用 `--deep` 時，即使 gateway
健康，探查也會執行。

### 3) 舊版狀態遷移（磁碟佈局）

Doctor 可以將較舊的磁碟佈局遷移到當前結構中：

- 工作階段存放區 + 逐字稿：
  - 從 `~/.openclaw/sessions/` 到 `~/.openclaw/agents/<agentId>/sessions/`
- Agent 目錄：
  - 從 `~/.openclaw/agent/` 到 `~/.openclaw/agents/<agentId>/agent/`
- WhatsApp 驗證狀態：
  - 從舊版 `~/.openclaw/credentials/*.json`（`oauth.json` 除外）
  - 到 `~/.openclaw/credentials/whatsapp/<accountId>/...`（預設帳戶 ID：`default`）

這些遷移為盡力而為且具等冪性；當 doctor 將任何舊版資料夾作為備份保留時，會發出警告。Gateway/CLI 也會在啟動時自動遷移舊版 sessions + agent 目錄，以便 history/auth/models 存入 per-agent 路徑，無需手動執行 doctor。WhatsApp 授權僅透過 `openclaw doctor` 進行遷移。

### 3a) 舊版外掛清單遷移

Doctor 會掃描所有已安裝的外掛清單，尋找已棄用的頂層功能鍵
(`speechProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders`)。
當找到時，它會提供將其移動到 `contracts` 物件中並就地重寫清單
檔案的選項。此遷移具有等冪性；如果 `contracts` 鍵已經具有
相同的值，則會移除舊版鍵而不會重複資料。

### 3b) 舊版 cron 儲存庫遷移

Doctor 也會檢查 cron 任務儲存庫 (預設為 `~/.openclaw/cron/jobs.json`，
或當被覆寫時為 `cron.store`) 中，排程器為了相容性仍然接受的舊任務格式。

目前的 cron 清理包括：

- `jobId` → `id`
- `schedule.cron` → `schedule.expr`
- 頂層 payload 欄位 (`message`、`model`、`thinking`，...) → `payload`
- 頂層 delivery 欄位 (`deliver`、`channel`、`to`、`provider`，...) → `delivery`
- payload `provider` delivery 別名 → 明確的 `delivery.channel`
- 簡單的舊版 `notify: true` webhook 後援任務 → 帶有 `delivery.to=cron.webhook` 的明確 `delivery.mode="webhook"`

Doctor 只有在能夠不改變行為的情況下，才會自動遷移 `notify: true` 任務。如果任務結合了舊版 notify 後援與現有的
非 webhook 傳遞模式，doctor 會發出警告並將該任務保留供手動審查。

### 3c) Session 鎖定清理

Doctor 會掃描每個代理程式工作階段目錄中過期的寫入鎖定檔案（write-lock files）——即當工作階段異常結束時遺留的檔案。對於找到的每個鎖定檔案，它會報告：路徑、PID、PID 是否仍在運作、鎖定存留時間，以及是否被視為過期（PID 已死或超過 30 分鐘）。在 `--fix` / `--repair` 模式下，它會自動移除過期的鎖定檔案；否則它會列印提示並指示您使用 `--fix` 重新執行。

### 4) 狀態完整性檢查（工作階段持久性、路由與安全性）

狀態目錄是作業的腦幹。如果它消失了，您將失去工作階段、憑證、日誌和設定（除非您在其他地方有備份）。

Doctor 檢查：

- **狀態目錄遺失**：警告災難性的狀態遺失，提示重建目錄，並提醒您無法恢復遺失的資料。
- **狀態目錄權限**：驗證可寫性；提供修復權限的選項（並在偵測到擁有者/群組不符時發出 `chown` 提示）。
- **macOS 雲端同步狀態目錄**：當狀態解析位於 iCloud Drive
  (`~/Library/Mobile Documents/com~apple~CloudDocs/...`) 或
  `~/Library/CloudStorage/...` 之下時發出警告，因為同步備份的路徑可能會導致較慢的 I/O
  以及鎖定/同步競爭。
- **Linux SD 或 eMMC 狀態目錄**：當狀態解析至 `mmcblk*`
  掛載來源時發出警告，因為 SD 或 eMMC 備份的隨機 I/O 在工作階段和憑證寫入時可能會變慢且磨損更快。
- **工作階段目錄遺失**：`sessions/` 和工作階段存放目錄是
  持久化歷史記錄並避免 `ENOENT` 當機所必需的。
- **逐字稿不符**：當最近的工作階段項目遺失逐字稿檔案時發出警告。
- **主要工作階段「單行 JSONL」**：當主要逐字稿只有一行時標示出來（歷史記錄未在累積）。
- **多個狀態目錄**：當在多個
  家目錄中存在多個 `~/.openclaw` 資料夾，或當 `OPENCLAW_STATE_DIR` 指向其他位置時發出警告（歷史記錄可能在安裝之間被分割）。
- **遠端模式提醒**：如果 `gateway.mode=remote`，doctor 會提醒您在遠端主機上執行它（狀態位於該處）。
- **設定檔案權限**：如果 `~/.openclaw/openclaw.json` 可被群組/其他人讀取，則會發出警告並提議將其收紧至 `600`。

### 5) 模型授權健康狀況 (OAuth 到期)

Doctor 會檢查授權存儲中的 OAuth 設定檔，在令牌即將到期/已到期時發出警告，並在安全時進行更新。如果 Anthropic Claude Code 設定檔已過時，它會建議執行 `claude setup-token` (或貼上 setup-token)。更新提示僅在以互動方式 (TTY) 執行時出現；`--non-interactive` 會跳過更新嘗試。

Doctor 也會報告因以下原因暫時無法使用的授權設定檔：

- 短暫冷卻 (速率限制/逾時/授權失敗)
- 較長時間的停用 (帳單/信用額度失敗)

### 6) Hooks 模型驗證

如果設定了 `hooks.gmail.model`，doctor 會根據目錄和允許清單驗證模型參照，並在無法解析或被禁止時發出警告。

### 7) Sandbox 映像檔修復

啟用沙盒機制時，doctor 會檢查 Docker 映像檔，如果目前映像檔遺失，會提議建構或切換至舊版名稱。

### 7b) 捆綁的插件執行時相依性

Doctor 會驗證捆綁的插件執行時相依性 (例如 Discord 插件執行時套件) 是否存在於 OpenClaw 安裝根目錄中。如果缺少任何套件，doctor 會報告這些套件並以 `openclaw doctor --fix` / `openclaw doctor --repair` 模式安裝它們。

### 8) Gateway 服務遷移與清理提示

Doctor 會偵測舊版 gateway 服務 (launchd/systemd/schtasks)，並提議移除它們，然後使用目前的 gateway 通訊埠安裝 OpenClaw 服務。它也可以掃描額外的類似 gateway 服務並列印清理提示。以設定檔命名的 OpenClaw gateway 服務被視為一等公民，不會被標記為「額外」。

### 8b) Startup Matrix 遷移

當 Matrix 頻道帳號有待處理或可操作的舊版狀態遷移時，doctor（在 `--fix` / `--repair` 模式下）會建立遷移前快照，然後執行盡力而為的遷移步驟：舊版 Matrix 狀態遷移和舊版加密狀態準備。這兩個步驟都不是致命的；錯誤會被記錄下來，啟動繼續進行。在唯讀模式（沒有 `--fix` 的 `openclaw doctor`）下，此檢查會被完全跳過。

### 9) 安全性警告

當提供者未經允許清單 (allowlist) 即開放 DM，或策略以危險方式配置時，Doctor 會發出警告。

### 10) systemd linger (Linux)

如果作為 systemd 使用者服務執行，doctor 會確保啟用 lingering，以便登出後閘道仍保持運作。

### 11) 工作區狀態 (skills、plugins 和 legacy dirs)

Doctor 會列印預設代理程式的工作區狀態摘要：

- **Skills 狀態**：計算符合資格、缺少需求和被允許清單阻擋的 skills。
- **Legacy workspace dirs**：當 `~/openclaw` 或其他舊版工作區目錄與目前的工作區並存時發出警告。
- **Plugin 狀態**：計算已載入/已停用/錯誤的 plugins；列出任何錯誤的 plugin ID；回報 bundle plugin 功能。
- **Plugin 相容性警告**：標示與目前執行環境有相容性問題的 plugins。
- **Plugin 診斷**：顯示 plugin 登錄檔發出的任何載入時警告或錯誤。

### 11b) Bootstrap 檔案大小

Doctor 會檢查工作區 bootstrap 檔案（例如 `AGENTS.md`、`CLAUDE.md` 或其他注入的內容檔案）是否接近或超過設定的字元預算。它會回報每個檔案的原始字元與注入字元計數、截斷百分比、截斷原因（`max/file` 或 `max/total`），以及總注入字元佔總預算的比例。當檔案被截斷或接近限制時，doctor 會列印調整 `agents.defaults.bootstrapMaxChars` 和 `agents.defaults.bootstrapTotalMaxChars` 的提示。

### 11c) Shell completion

Doctor 會檢查目前 shell（zsh、bash、fish 或 PowerShell）是否安裝了 tab completion：

- 如果 shell 設定檔使用緩慢的動態補全模式
  (`source <(openclaw completion ...)`)，doctor 會將其升級為更快的
  快取檔案變體。
- 如果在設定檔中設定補全但快取檔案缺失，
  doctor 會自動重新產生快取。
- 如果完全未設定補全，doctor 會提示安裝它
  (僅限互動模式；使用 `--non-interactive` 時會跳過)。

執行 `openclaw completion --write-state` 以手動重新產生快取。

### 12) Gateway 驗證檢查 (本機 token)

Doctor 會檢查本機 gateway token 驗證就緒狀態。

- 如果 token 模式需要 token 但沒有 token 來源，doctor 會提議產生一個。
- 如果 `gateway.auth.token` 由 SecretRef 管理但無法使用，doctor 會發出警告，並不會以明文覆寫它。
- `openclaw doctor --generate-gateway-token` 僅在未設定 token SecretRef 時才強制產生。

### 12b) 唯讀 SecretRef 感知修復

部分修復流程需要檢查設定的憑證，而不會削弱執行時期的快速失敗 (fail-fast) 行為。

- `openclaw doctor --fix` 現在使用與狀態系列 (status-family) 指令相同的唯讀 SecretRef 摘要模型，以進行針對性的設定修復。
- 範例：Telegram `allowFrom` / `groupAllowFrom` `@username` 修復會嘗試在可用時使用設定的機器人憑證。
- 如果 Telegram 機器人 token 透過 SecretRef 設定，但在目前的指令路徑中無法使用，doctor 會回報該憑證「已設定但無法使用」，並跳過自動解析，而不是當機或錯誤地回報 token 遺失。

### 13) Gateway 健康檢查 + 重新啟動

Doctor 會執行健康檢查，並在 gateway 看起來不健康時提議重新啟動它。

### 13b) 記憶體搜尋就緒狀態

Doctor 會檢查為預設代理程式設定的記憶體搜尋嵌入提供者是否
就緒。行為取決於設定的後端和提供者：

- **QMD 後端**：探測 `qmd` 二進位檔是否可用且可啟動。
  如果不可用，則印出修復指引，包括 npm 套件和手動二進位路徑選項。
- **明確的本機提供者**：檢查是否有本機模型檔案或可辨識的
  遠端/可下載模型 URL。如果缺失，建議切換至遠端提供者。
- **明確的遠端提供者**（`openai`、`voyage` 等）：驗證環境或 auth store 中是否存在 API 金鑰。如果缺失，會列印可行的修復提示。
- **自動提供者**：首先檢查本地模型的可用性，然後按自動選擇順序嘗試每個遠端提供者。

當可用 gateway probe 結果時（gateway 在檢查時健康），doctor 會將其結果與 CLI 可見的配置進行比對，並記錄任何差異。

使用 `openclaw memory status --deep` 在執行時驗證嵌入就緒狀態。

### 14) 通道狀態警告

如果 gateway 健康，doctor 會執行通道狀態探查並回報帶有建議修復的警告。

### 15) Supervisor 配置稽核 + 修復

Doctor 會檢查已安裝的 supervisor 配置（launchd/systemd/schtasks）是否有遺失或過時的預設值（例如，systemd network-online 相依性和重新啟動延遲）。當發現不符時，它會建議更新，並可以將服務檔案/任務重寫為目前的預設值。

注意：

- `openclaw doctor` 會在重寫 supervisor 配置前提示。
- `openclaw doctor --yes` 接受預設修復提示。
- `openclaw doctor --repair` 無提示套用建議修復。
- `openclaw doctor --repair --force` 覆寫自訂 supervisor 配置。
- 如果 token auth 需要 token 且 `gateway.auth.token` 是由 SecretRef 管理，doctor 服務安裝/修復會驗證 SecretRef，但不會將解析出的明文 token 值持久化到 supervisor 服務環境元資料中。
- 如果 token auth 需要 token 且設定的 token SecretRef 未解析，doctor 會使用可行的指引阻擋安裝/修復路徑。
- 如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password` 且 `gateway.auth.mode` 未設定，doctor 會阻擋安裝/修復，直到明確設定模式。
- 對於 Linux user-systemd units，doctor token drift 檢查現在在比較服務驗證元資料時，會同時包含 `Environment=` 和 `EnvironmentFile=` 來源。
- 您隨時可以透過 `openclaw gateway install --force` 強制完整重寫。

### 16) Gateway 執行時 + 連接埠診斷

Doctor 會檢查服務運行時（PID、上次退出狀態），並在服務已安裝但未實際運行時發出警告。它還會檢查閘道連接埠（預設為 `18789`）是否有連接埠衝突，並報告可能的原因（例如閘道已在運行、SSH 隧道）。

### 17) 閘道運行時最佳實務

當閘道服務在 Bun 或受版本管理的 Node 路徑（`nvm`、`fnm`、`volta`、`asdf` 等）上運行時，Doctor 會發出警告。WhatsApp 和 Telegram 頻道需要 Node，且版本管理器路徑可能會在升級後失效，因為服務不會載入您的 Shell 初始化檔案。當有系統 Node 安裝可用時（例如 Homebrew/apt/choco），Doctor 會建議遷移。

### 18) 設定寫入 + 精靈中繼資料

Doctor 會儲存任何設定變更，並標記精靈中繼資料以記錄 Doctor 的執行紀錄。

### 19) 工作區提示（備份 + 記憶系統）

如果缺少工作區記憶系統，Doctor 會建議建立；如果工作區尚未在 git 管理下，Doctor 則會印出備份提示。

請參閱 [/concepts/agent-workspace](/en/concepts/agent-workspace) 以取得工作區結構和 git 備份的完整指南（建議使用私有的 GitHub 或 GitLab）。
