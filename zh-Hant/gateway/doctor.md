---
summary: "Doctor 指令：健康檢查、設定遷移以及修復步驟"
read_when:
  - Adding or modifying doctor migrations
  - Introducing breaking config changes
title: "Doctor"
---

# Doctor

`openclaw doctor` 是 OpenClaw 的修復與遷移工具。它能修復過時的設定/狀態、檢查健康狀況，並提供可行的修復步驟。

## 快速入門

```bash
openclaw doctor
```

### 無介面 / 自動化

```bash
openclaw doctor --yes
```

在不提示的情況下接受預設值（包括適用時的重啟/服務/沙箱修復步驟）。

```bash
openclaw doctor --repair
```

在不提示的情況下套用建議的修復（安全處理修復及重啟）。

```bash
openclaw doctor --repair --force
```

同時套用激進修復（覆寫自訂的 supervisor 設定）。

```bash
openclaw doctor --non-interactive
```

無提示執行並僅套用安全的遷移（設定正規化 + 磁碟狀態移動）。跳過需要人工確認的重啟/服務/沙箱操作。
當偵測到舊版狀態遷移時會自動執行。

```bash
openclaw doctor --deep
```

掃描系統服務以尋找額外的 gateway 安裝（launchd/systemd/schtasks）。

如果您想在寫入之前檢視變更，請先開啟設定檔：

```bash
cat ~/.openclaw/openclaw.json
```

## 功能摘要

- 針對 git 安裝的選用飛行前更新（僅限互動模式）。
- UI 協定新鮮度檢查（當協定架構較新時重建 Control UI）。
- 健康檢查 + 重啟提示。
- Skills 狀態摘要（符合資格/遺失/已封鎖）。
- 針對舊版數值的設定正規化。
- 瀏覽器遷移檢查，針對舊版 Chrome 擴充功能設定及 Chrome MCP 準備度。
- OpenCode 提供者覆寫警告（`models.providers.opencode` / `models.providers.opencode-go`）。
- 舊版磁碟狀態遷移（sessions/agent dir/WhatsApp auth）。
- 舊版 cron 存儲遷移（`jobId`、`schedule.cron`、頂層 delivery/payload 欄位、payload `provider`、簡單 `notify: true` webhook 回退工作）。
- 狀態完整性和權限檢查（sessions、transcripts、state dir）。
- 當地執行時的設定檔權限檢查（chmod 600）。
- Model 授權健康狀況：檢查 OAuth 到期時間，可重新整理即將到期的權杖，並回報授權設定檔的冷卻/停用狀態。
- 額外工作區目錄偵測（`~/openclaw`）。
- 啟用沙箱時的沙箱映像檔修復。
- 舊版服務遷移及額外 gateway 偵測。
- Gateway 執行時檢查（服務已安裝但未運行；快取的 launchd 標籤）。
- 通道狀態警告（從運行中的 gateway 探測）。
- Supervisor 設定檔稽核（launchd/systemd/schtasks）並提供可選修復。
- Gateway 執行時最佳實踐檢查（Node vs Bun、版本管理器路徑）。
- Gateway 連接埠衝突診斷（預設 `18789`）。
- 針對開放 DM 政策的安全性警告。
- 本機 Token 模式的 Gateway 驗證檢查（當不存在 Token 來源時提供 Token 生成；不會覆寫 Token SecretRef 設定）。
- Linux 上的 systemd linger 檢查。
- 來源安裝檢查（pnpm 工作區不匹配、缺少 UI 資源、缺少 tsx 二進位檔案）。
- 寫入更新後的設定 + wizard 中繼資料。

## 詳細行為與原理

### 0) 可選更新（git 安裝）

如果這是 git checkout 且 doctor 正以互動方式運行，它會提供在運行 doctor 之前
更新 (fetch/rebase/build) 的選項。

### 1) 設定正規化

如果設定包含舊版值形狀（例如 `messages.ackReaction`
沒有通道特定的覆蓋），doctor 會將其正規化為當前
架構。

### 2) 舊版設定金鑰遷移

當設定包含已棄用的金鑰時，其他指令將拒絕運行並要求
您執行 `openclaw doctor`。

Doctor 將會：

- 解釋找到了哪些舊版金鑰。
- 顯示它所套用的遷移。
- 使用更新後的架構重寫 `~/.openclaw/openclaw.json`。

當 Gateway 偵測到舊版設定格式時，也會在啟動時自動執行 doctor 遷移，
因此無需人工介入即可修復過時的設定。

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
- 對於具有命名 `accounts` 但缺少 `accounts.default` 的頻道，如果存在帳戶範圍的頂層單一帳戶頻道值，則將其移至 `channels.<channel>.accounts.default`
- `identity` → `agents.list[].identity`
- `agent.*` → `agents.defaults` + `tools.*` (工具/提升權限/exec/sandbox/subagents)
- `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks`
  → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
- `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
- `browser.profiles.*.driver: "extension"` → `"existing-session"`
- 移除 `browser.relayBindHost`（舊版擴充功能中繼設定）

Doctor 警告也包含多帳戶頻道的帳戶預設指導：

- 如果設定了兩個或更多 `channels.<channel>.accounts` 項目但沒有 `channels.<channel>.defaultAccount` 或 `accounts.default`，Doctor 會警告備援路由可能會選擇非預期的帳戶。
- 如果 `channels.<channel>.defaultAccount` 設定為未知的帳戶 ID，Doctor 會發出警告並列出已設定的帳戶 ID。

### 2b) OpenCode 提供者覆寫

如果您手動新增了 `models.providers.opencode`、`opencode-zen` 或 `opencode-go`
，它將覆寫來自 `@mariozechner/pi-ai` 的內建 OpenCode 目錄。
這可能會強制模型使用錯誤的 API 或將成本歸零。Doctor 會發出警告，以便您
移除覆寫並恢復各模型的 API 路由 + 成本。

### 2c) 瀏覽器遷移與 Chrome MCP 準備

如果您的瀏覽器設定仍指向已移除的 Chrome 擴充功能路徑，Doctor
會將其正規化為目前的主機本機 Chrome MCP 連線模型：

- `browser.profiles.*.driver: "extension"` 變為 `"existing-session"`
- `browser.relayBindHost` 已被移除

當您使用 `defaultProfile:
"user"` or a configured `existing-session` 設定檔時，Doctor 也會稽核本機 Chrome MCP 路徑：

- 檢查主機上是否已安裝 Google Chrome，以用於預設的自動連線設定檔
- 檢查偵測到的 Chrome 版本，當其低於 Chrome 144 時發出警告
- 提醒您在瀏覽器檢查頁面中啟用遠端偵錯（例如 `chrome://inspect/#remote-debugging`、`brave://inspect/#remote-debugging`
  或 `edge://inspect/#remote-debugging`）

Doctor 無法為您啟用 Chrome 端的設定。本機 Chrome MCP
仍然需要：

- 閘道器/節點主機上安裝的 Chromium 系瀏覽器 144 或更高版本
- 瀏覽器於本機執行
- 在該瀏覽器中啟用遠端偵錯
- 在瀏覽器中批准首次附加的同意提示

此檢查**不**適用於 Docker、沙盒、遠端瀏覽器或其他無頭流程。這些流程繼續使用原始 CDP。

### 3) 舊版狀態遷移（磁碟配置）

Doctor 可以將較舊的磁碟上配置遷移至目前的結構：

- Sessions 存放區 + 轉錄：
  - 從 `~/.openclaw/sessions/` 到 `~/.openclaw/agents/<agentId>/sessions/`
- Agent 目錄：
  - 從 `~/.openclaw/agent/` 到 `~/.openclaw/agents/<agentId>/agent/`
- WhatsApp 驗證狀態：
  - 從舊版 `~/.openclaw/credentials/*.json`（`oauth.json` 除外）
  - 到 `~/.openclaw/credentials/whatsapp/<accountId>/...`（預設帳戶 ID：`default`）

這些遷移為盡力而為且具等冪性；當 doctor 將任何舊版資料夾保留為備份時，將發出警告。Gateway/CLI 也會在啟動時自動遷移
舊版 sessions + agent 目錄，以便歷史記錄/驗證/模型能直接進入 per-agent 路徑，無需手動執行 doctor。WhatsApp 驗證意圖僅透過 `openclaw doctor` 進行遷移。

### 3b) 舊版 cron 存放區遷移

Doctor 也會檢查 cron 工作存放區（預設為 `~/.openclaw/cron/jobs.json`，
若覆寫則為 `cron.store`）中排程器為了相容性仍接受的舊工作格式。

目前的 cron 清理項目包括：

- `jobId` → `id`
- `schedule.cron` → `schedule.expr`
- 頂層 payload 欄位（`message`, `model`, `thinking`, ...）→ `payload`
- 頂層 delivery 欄位（`deliver`, `channel`, `to`, `provider`, ...）→ `delivery`
- payload `provider` delivery 別名 → 明確的 `delivery.channel`
- 簡單的舊版 `notify: true` webhook 後備工作 → 明確的 `delivery.mode="webhook"` 搭配 `delivery.to=cron.webhook`

Doctor 只有在能夠不改變行為的情況下，才會自動遷移 `notify: true` 工作。如果某個工作結合了舊版 notify 後備與現有的非 webhook delivery 模式，doctor 會發出警告並將該工作留待人工檢查。

### 4) 狀態完整性檢查（session 持久化、路由與安全性）

狀態目錄是運作中的腦幹。如果它消失，您將失去 sessions、認證資訊、日誌和配置（除非您在其他地方有備份）。

Doctor 檢查項目：

- **狀態目錄遺失**：警告災難性的狀態丟失，提示重新建立該目錄，並提醒您它無法恢復遺失的資料。
- **狀態目錄權限**：驗證可寫入性；提議修復權限（並在偵測到擁有者/群組不匹配時發出 `chown` 提示）。
- **macOS 雲端同步狀態目錄**：當狀態解析於 iCloud Drive（`~/Library/Mobile Documents/com~apple~CloudDocs/...`）或 `~/Library/CloudStorage/...` 之下時發出警告，因為同步支援的路徑可能導致較慢的 I/O 和鎖定/同步競爭。
- **Linux SD 或 eMMC 狀態目錄**：當狀態解析至 `mmcblk*` 掛載來源時發出警告，因為 SD 或 eMMC 支援的隨機 I/O 在 session 和認證寫入下可能較慢且磨損較快。
- **Session 目錄遺失**：`sessions/` 和 session store 目錄是用來持久化歷史記錄和避免 `ENOENT` 當機所必需的。
- **Transcript 不匹配**：當最近的 session 項目缺少 transcript 檔案時發出警告。
- **主要 session「1 行 JSONL」**：當主要 transcript 只有一行時標記（歷史記錄未累積）。
- **多重狀態目錄**：當跨多個主目錄存在多個 `~/.openclaw` 資料夾，或當 `OPENCLAW_STATE_DIR` 指向其他位置時發出警告（歷史記錄可能會在安裝之間分割）。
- **遠端模式提醒**：如果 `gateway.mode=remote`，doctor 會提醒您在遠端主機上運行它（狀態位於該處）。
- **設定檔權限**：如果 `~/.openclaw/openclaw.json` 可被群組/其他人讀取則發出警告，並提議將其收緊為 `600`。

### 5) 模型驗證健康狀況 (OAuth 有效期)

Doctor 會檢查驗證存儲中的 OAuth 設定檔，在 Token 即將過期或已過期時發出警告，並在安全時刷新它們。如果 Anthropic Claude Code 設定檔已過時，它會建議運行 `claude setup-token`（或貼上 setup-token）。刷新提示僅在以互動方式 (TTY) 運行時出現；`--non-interactive` 會跳過刷新嘗試。

Doctor 也會報告因以下原因而暫時無法使用的驗證設定檔：

- 短暫冷卻（速率限制/逾時/驗證失敗）
- 較長時間的停用（帳單/信用額度失敗）

### 6) Hooks 模型驗證

如果設定了 `hooks.gmail.model`，doctor 會根據目錄和允許清單驗證模型參考，並在無法解析或被拒絕時發出警告。

### 7) Sandbox 映像檔修復

啟用沙箱機制時，doctor 會檢查 Docker 映像檔，如果目前的映像檔缺失，則提議建構或切換至舊版名稱。

### 8) Gateway 服務遷移和清理提示

Doctor 會偵測舊版 gateway 服務 (launchd/systemd/schtasks)，並提議移除它們，使用目前的 gateway 連接埠安裝 OpenClaw 服務。它也可以掃描額外的類似 gateway 的服務並列印清理提示。以設定檔命名的 OpenClaw gateway 服務被視為一等公民，不會被標記為「額外」。

### 9) 安全性警告

當提供者在沒有允許清單的情況下開放接收私訊，或者當策略以危險方式配置時，Doctor 會發出警告。

### 10) systemd linger (Linux)

如果作為 systemd 使用者服務運行，doctor 會確保啟用 linger，以便在登出後 gateway 保持運行。

### 11) Skills 狀態

Doctor 會列印目前工作區符合資格/遺失/被封鎖的 skills 的快速摘要。

### 12) Gateway 驗證檢查 (本機 token)

Doctor 會檢查本機 gateway token 驗證準備情況。

- 如果令牌模式需要令牌但不存在令牌來源，doctor 會提議生成一個。
- 如果 `gateway.auth.token` 是由 SecretRef 管理但無法使用，doctor 會發出警告，並且不會以純文本覆蓋它。
- `openclaw doctor --generate-gateway-token` 僅在未設定任何令牌 SecretRef 時才強制生成。

### 12b) 支援唯讀 SecretRef 的修復

某些修復流程需要檢查已設定的認證資訊，而不削弱執行時期的快速失敗 行為。

- `openclaw doctor --fix` 現在使用與狀態系列 命令相同的唯讀 SecretRef 摘要模型，以進行目標配置修復。
- 範例：Telegram `allowFrom` / `groupAllowFrom` `@username` 修復會嘗試在可用時使用已設定的機器人認證資訊。
- 如果 Telegram 機器人令牌是透過 SecretRef 設定的，但在目前命令路徑中無法使用，doctor 會回報該認證資訊為已設定但無法使用，並跳過自動解析，而不是當機或錯誤地回報令牌遺失。

### 13) Gateway 健康檢查 + 重新啟動

Doctor 會執行健康檢查，並在 Gateway 看起來不健康時提議重新啟動它。

### 14) 頻道狀態警告

如果 Gateway 健康，doctor 會執行頻道狀態探測，並回報附帶建議修正方案的警告。

### 15) Supervisor 配置稽核 + 修復

Doctor 會檢查已安裝的 supervisor 配置 (launchd/systemd/schtasks) 是否有遺失或過期的預設值 (例如，systemd network-online 相依性和重新啟動延遲)。當發現不符時，它會建議進行更新，並可以將服務檔案/工作重寫為目前的預設值。

備註：

- `openclaw doctor` 會在重寫 supervisor 配置之前提示。
- `openclaw doctor --yes` 接受預設的修復提示。
- `openclaw doctor --repair` 套用建議的修復而無需提示。
- `openclaw doctor --repair --force` 會覆寫自訂的 supervisor 配置。
- 如果令牌驗證需要令牌，且 `gateway.auth.token` 是由 SecretRef 管理，doctor 服務安裝/修復會驗證 SecretRef，但不會將解析後的純文本令牌值保存到 supervisor 服務環境元資料中。
- 如果 token 身份驗證需要 token 且已配置的 token SecretRef 未解析，doctor 會封鎖安裝/修復路徑並提供可行的指引。
- 如果同時配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，doctor 會封鎖安裝/修復，直到明確設定模式為止。
- 對於 Linux user-systemd 單元，doctor 的 token 偏差檢查現在在比較服務身分驗證元資料時，會同時包含 `Environment=` 和 `EnvironmentFile=` 來源。
- 您始終可以透過 `openclaw gateway install --force` 強制進行完整重寫。

### 16) Gateway 執行時 + 埠診斷

Doctor 會檢查服務執行時（PID、上次退出狀態），並在服務已安裝但未實際執行時發出警告。它還會檢查 Gateway 埠（預設為 `18789`）上的埠衝突，並報告可能的原因（Gateway 正在執行、SSH 隧道）。

### 17) Gateway 執行時最佳實踐

當 Gateway 服務在 Bun 或版本管理的 Node 路徑（`nvm`、`fnm`、`volta`、`asdf` 等）上執行時，Doctor 會發出警告。WhatsApp + Telegram 頻道需要 Node，且版本管理程式路徑可能會在升級後失效，因為服務不會載入您的 shell 初始化。當可使用系統 Node 安裝（Homebrew/apt/choco）時，Doctor 會提議遷移。

### 18) 設定寫入 + 精靈元資料

Doctor 會保存任何設定變更，並標記精靈元資料以記錄 doctor 執行。

### 19) 工作區提示（備份 + 記憶系統）

當缺少工作區記憶系統時，Doctor 會建議建立一個；如果工作區尚未納入 git 管理，則會列印備份提示。

請參閱 [/concepts/agent-workspace](/zh-Hant/concepts/agent-workspace) 以取得工作區結構和 git 備份（建議使用私有 GitHub 或 GitLab）的完整指南。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
