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
- Skills 狀態摘要（符合資格/遺失/被封鎖）。
- 針對舊版數值的設定正規化。
- 瀏覽器遷移檢查，針對舊版 Chrome 擴充功能設定和 Chrome MCP 準備情況。
- OpenCode 提供者覆寫警告（`models.providers.opencode` / `models.providers.opencode-go`）。
- 舊版磁碟狀態遷移（sessions/agent dir/WhatsApp auth）。
- 舊版 cron 存儲遷移（`jobId`、`schedule.cron`、頂層 delivery/payload 欄位、payload `provider`、簡單 `notify: true` webhook 備援作業）。
- 狀態完整性和權限檢查（sessions、transcripts、state dir）。
- 在本機執行時進行設定檔權限檢查（chmod 600）。
- Model 授權健康狀況：檢查 OAuth 到期時間，可重新整理即將到期的 token，並回報授權設定檜的冷卻/停用狀態。
- 額外的工作區目錄偵測（`~/openclaw`）。
- 啟用沙箱時進行沙箱映像檔修復。
- 舊版服務遷移和額外 gateway 偵測。
- Gateway 運行時檢查（服務已安裝但未運行；快取的 launchd 標籤）。
- 頻道狀態警告（從運行中的 gateway 探測）。
- 監管程式設定稽核 (launchd/systemd/schtasks)，可選修復。
- Gateway 運行時最佳實踐檢查 (Node vs Bun，版本管理器路徑)。
- Gateway 連接埠衝突診斷（預設 `18789`）。
- 針對開放 DM 策略的安全性警告。
- 本機 Token 模式的 Gateway 驗證檢查（當沒有 Token 來源時提供 Token 生成；不會覆寫 Token SecretRef 設定）。
- Linux 上的 systemd linger 檢查。
- 來源安裝檢查 (pnpm workspace 不匹配、缺少 UI 資源、缺少 tsx 二進位檔案)。
- 寫入更新後的設定 + 精靈中繼資料。

## 詳細行為與原理

### 0) 可選更新（git 安裝）

如果是 git checkout 且 doctor 正在互動模式下運行，它會提議在運行 doctor 之前進行更新 (fetch/rebase/build)。

### 1) 設定正規化

如果設定包含舊版值的形狀（例如 `messages.ackReaction` 沒有特定頻道的覆寫），doctor 會將其正規化為當前的架構。

### 2) 舊版設定金鑰遷移

當設定包含已棄用的金鑰時，其他指令會拒絕運行並要求您執行 `openclaw doctor`。

Doctor 將會：

- 說明找到了哪些舊版金鑰。
- 顯示它所套用的遷移。
- 使用更新後的架構重寫 `~/.openclaw/openclaw.json`。

當 Gateway 偵測到舊版設定格式時，也會在啟動時自動執行 doctor 遷移，因此過期的設定可以在無需人工干預的情況下被修復。

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
- `bindings[].match.accountID` → `bindings[].match.accountId`
- 對於具有指定 `accounts` 但缺少 `accounts.default` 的頻道，請在存在時將帳戶範圍的頂層單一帳戶頻道值移入 `channels.<channel>.accounts.default`
- `identity` → `agents.list[].identity`
- `agent.*` → `agents.defaults` + `tools.*` (tools/elevated/exec/sandbox/subagents)
- `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks`
  → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
- `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
- `browser.profiles.*.driver: "extension"` → `"existing-session"`
- 移除 `browser.relayBindHost` (舊版擴充功能中繼設定)

Doctor 警告還包括多帳戶頻道的帳戶預設指南：

- 如果配置了兩個或多個 `channels.<channel>.accounts` 項目但沒有 `channels.<channel>.defaultAccount` 或 `accounts.default`，Doctor 會警告備援路由可能會選擇非預期的帳戶。
- 如果 `channels.<channel>.defaultAccount` 設定為未知的帳戶 ID，Doctor 會警告並列出已配置的帳戶 ID。

### 2b) OpenCode 提供者覆寫

如果您手動新增了 `models.providers.opencode`、`opencode-zen` 或 `opencode-go`，
它會覆寫來自 `@mariozechner/pi-ai` 的內建 OpenCode 目錄。
這可能會強制模型使用錯誤的 API 或將成本歸零。Doctor 會發出警告，以便您
移除覆寫並恢復每個模型的 API 路由 + 成本。

### 2c) 瀏覽器遷移和 Chrome MCP 準備

如果您的瀏覽器設定仍指向已移除的 Chrome 擴充功能路徑，Doctor
會將其正規化為目前的主機本機 Chrome MCP 附加模型：

- `browser.profiles.*.driver: "extension"` 變成 `"existing-session"`
- `browser.relayBindHost` 已移除

當您使用 `defaultProfile:
"user"` or a configured `existing-session` 配置檔案時，Doctor 也會稽核主機本地的 Chrome MCP 路徑：

- 檢查預設自動連線配置檔案是否在同一台主機上安裝了 Google Chrome
- 檢查偵測到的 Chrome 版本，當低於 Chrome 144 時發出警告
- 提醒您在瀏覽器檢查頁面中啟用遠端偵錯（例如 `chrome://inspect/#remote-debugging`、`brave://inspect/#remote-debugging`
  或 `edge://inspect/#remote-debugging`）

Doctor 無法為您啟用 Chrome 端的設定。主機本地的 Chrome MCP
仍然需要：

- 閘道/節點主機上 144+ 版本的 Chromium 瀏覽器
- 瀏覽器在本地執行
- 在該瀏覽器中啟用遠端偵錯
- 在瀏覽器中批准首次附加的同意提示

此檢查**不**適用於 Docker、沙箱、遠端瀏覽器或其他無頭流程。這些流程繼續使用原始 CDP。

### 3) 舊版狀態遷移（磁碟佈局）

Doctor 可以將較舊的磁碟佈局遷移到目前的結構：

- Sessions store + transcripts：
  - 從 `~/.openclaw/sessions/` 到 `~/.openclaw/agents/<agentId>/sessions/`
- Agent dir：
  - 從 `~/.openclaw/agent/` 到 `~/.openclaw/agents/<agentId>/agent/`
- WhatsApp auth state (Baileys)：
  - 從舊版 `~/.openclaw/credentials/*.json`（`oauth.json` 除外）
  - 到 `~/.openclaw/credentials/whatsapp/<accountId>/...`（預設帳戶 ID：`default`）

這些遷移是盡力而為且具等冪性的；當 doctor 將任何舊版資料夾保留為備份時，會發出警告。Gateway/CLI 也會在啟動時自動遷移舊版 sessions + agent dir，以便歷史記錄/驗證/模型位於每個 agent 的路徑中，而無需手動執行 doctor。WhatsApp 驗證僅透過 `openclaw doctor` 進行遷移。

### 3b) 舊版 cron store 遷移

Doctor 也會檢查 cron job store（預設為 `~/.openclaw/cron/jobs.json`，若被覆蓋則為 `cron.store`），尋找排程器為了相容性仍接受的舊作業形狀。

目前的 cron 清理項目包括：

- `jobId` → `id`
- `schedule.cron` → `schedule.expr`
- 頂層 payload 欄位 (`message`, `model`, `thinking`, ...) → `payload`
- 頂層 delivery 欄位 (`deliver`, `channel`, `to`, `provider`, ...) → `delivery`
- payload `provider` delivery 別名 → 明確的 `delivery.channel`
- 簡單的舊版 `notify: true` webhook fallback 工作 → 明確的 `delivery.mode="webhook"` 搭配 `delivery.to=cron.webhook`

Doctor 只有在能夠不改變行為的情況下，才會自動遷移 `notify: true` 工作。如果某個工作結合了舊版 notify fallback 與現有的非 webhook 傳遞模式，doctor 會發出警告並將該工作留待手動審查。

### 4) 狀態完整性檢查 (session persistence、routing 和 safety)

狀態目錄是運作的核心樞紐。如果它消失了，您將失去 sessions、認證資訊、日誌和設定 (除非您在其他地方有備份)。

Doctor 檢查項目：

- **State dir missing**：警告災難性的狀態遺失，提示重新建立該目錄，並提醒您它無法還原遺失的資料。
- **State dir permissions**：驗證可寫性；提議修復權限 (並在偵測到擁有者/群組不符時發出 `chown` 提示)。
- **macOS cloud-synced state dir**：當狀態解析於 iCloud Drive (`~/Library/Mobile Documents/com~apple~CloudDocs/...`) 或 `~/Library/CloudStorage/...` 之下時發出警告，因為同步備份的路徑可能導致較慢的 I/O 以及鎖定/同步競爭。
- **Linux SD 或 eMMC state dir**：當狀態解析至 `mmcblk*` 掛載來源時發出警告，因為 SD 或 eMMC 備份的隨機 I/O 在 session 和認證寫入時可能較慢且磨損較快。
- **Session dirs missing**：`sessions/` 和 session store 目錄是保存歷史記錄並避免 `ENOENT` 崩潰所必需的。
- **Transcript mismatch**：當最近的 session 項目缺少 transcript 檔案時發出警告。
- **Main session “1-line JSONL”**：當主要 transcript 只有一行時標記 (表示歷史記錄未正在累積)。
- **Multiple state dirs**: warns when multiple `~/.openclaw` folders exist across
  home directories or when `OPENCLAW_STATE_DIR` points elsewhere (history can
  split between installs).
- **Remote mode reminder**: if `gateway.mode=remote`, doctor reminds you to run
  it on the remote host (the state lives there).
- **Config file permissions**: warns if `~/.openclaw/openclaw.json` is
  group/world readable and offers to tighten to `600`.

### 5) Model auth health (OAuth expiry)

Doctor inspects OAuth profiles in the auth store, warns when tokens are
expiring/expired, and can refresh them when safe. If the Anthropic Claude Code
profile is stale, it suggests running `claude setup-token` (or pasting a setup-token).
Refresh prompts only appear when running interactively (TTY); `--non-interactive`
skips refresh attempts.

Doctor also reports auth profiles that are temporarily unusable due to:

- short cooldowns (rate limits/timeouts/auth failures)
- longer disables (billing/credit failures)

### 6) Hooks model validation

If `hooks.gmail.model` is set, doctor validates the model reference against the
catalog and allowlist and warns when it won’t resolve or is disallowed.

### 7) Sandbox image repair

When sandboxing is enabled, doctor checks Docker images and offers to build or
switch to legacy names if the current image is missing.

### 8) Gateway service migrations and cleanup hints

Doctor detects legacy gateway services (launchd/systemd/schtasks) and
offers to remove them and install the OpenClaw service using the current gateway
port. It can also scan for extra gateway-like services and print cleanup hints.
Profile-named OpenClaw gateway services are considered first-class and are not
flagged as "extra."

### 9) Security warnings

Doctor emits warnings when a provider is open to DMs without an allowlist, or
when a policy is configured in a dangerous way.

### 10) systemd linger (Linux)

If running as a systemd user service, doctor ensures lingering is enabled so the
gateway stays alive after logout.

### 11) Skills status

Doctor prints a quick summary of eligible/missing/blocked skills for the current
workspace.

### 12) Gateway auth checks (local token)

Doctor checks local gateway token auth readiness.

- 如果 token 模式需要 token 但沒有 token 來源，doctor 會提議生成一個。
- 如果 `gateway.auth.token` 是由 SecretRef 管理但無法使用，doctor 會發出警告，並且不會以明文覆寫它。
- `openclaw doctor --generate-gateway-token` 僅在未設定 token SecretRef 時才強制生成。

### 12b) 具備 SecretRef 感知能力的唯讀修復

某些修復流程需要檢查設定的憑證，同時不會削弱執行時期的快速失敗行為。

- `openclaw doctor --fix` 現在針對目標設定修復，使用與狀態系列命令相同的唯讀 SecretRef 摘要模型。
- 範例：Telegram `allowFrom` / `groupAllowFrom` `@username` 修復會嘗試在可用時使用設定的機器人憑證。
- 如果 Telegram 機器人 token 是透過 SecretRef 設定，但在目前的命令路徑中無法使用，doctor 會回報該憑證為「已設定但無法使用」，並跳過自動解析，而不是當機或將 token 誤報為遺失。

### 13) Gateway 健康檢查 + 重啟

Doctor 會執行健康檢查，並在 gateway 看起來不健康時提議重啟它。

### 14) 頻道狀態警告

如果 gateway 健康，doctor 會執行頻道狀態探查，並回報帶有建議修正方案的警告。

### 15) 監督者設定稽核 + 修復

Doctor 會檢查已安裝的監督者設定 以尋找遺失或過時的預設值（例如，systemd network-online 相依性和重啟延遲）。當發現不符時，它會建議更新，並可以將服務檔案/工作重寫為目前的預設值。

注意：

- `openclaw doctor` 會在重寫監督者設定之前提示。
- `openclaw doctor --yes` 接受預設的修復提示。
- `openclaw doctor --repair` 套用建議的修正而不提示。
- `openclaw doctor --repair --force` 會覆寫自訂監督者設定。
- 如果 token 驗證需要 token 且 `gateway.auth.token` 是由 SecretRef 管理，doctor 服務安裝/修復會驗證 SecretRef，但不會將解析出的明文 token 值保存到監督者服務環境元資料中。
- 如果 token 認證需要 token 且已設定的 token SecretRef 未解析，doctor 會以可操作的指導方針封鎖安裝/修復路徑。
- 如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，doctor 會封鎖安裝/修復，直到明確設定模式。
- 對於 Linux user-systemd 單元，doctor token 偏移檢查現在會在比較服務驗證元資料時，同時包含 `Environment=` 和 `EnvironmentFile=` 來源。
- 您始終可以透過 `openclaw gateway install --force` 強制完整重寫。

### 16) Gateway 執行時 + 連接埠診斷

Doctor 會檢查服務執行時（PID、上次退出狀態），並在服務已安裝但未實際執行時發出警告。它還會檢查 gateway 連接埠（預設 `18789`）上的連接埠衝突，並報告可能的原因（gateway 已在執行、SSH 通道）。

### 17) Gateway 執行時最佳實踐

當 gateway 服務在 Bun 或版本管理的 Node 路徑（`nvm`、`fnm`、`volta`、`asdf` 等）上執行時，Doctor 會發出警告。WhatsApp + Telegram 頻道需要 Node，而由於服務不載入您的 shell 初始化，版本管理器路徑可能在升級後中斷。當系統 Node 可用時（Homebrew/apt/choco），Doctor 會提議遷移。

### 18) Config 寫入 + 精靈元資料

Doctor 會保存任何設定變更，並標記精靈元資料以記錄 doctor 執行。

### 19) 工作區提示（備份 + 記憶系統）

當缺少工作區記憶系統時，Doctor 會建議建立一個；如果工作區尚未在 git 下，則會列印備份提示。

請參閱 [/concepts/agent-workspace](/en/concepts/agent-workspace) 以取得工作區結構和 git 備份（建議使用私人 GitHub 或 GitLab）的完整指南。
