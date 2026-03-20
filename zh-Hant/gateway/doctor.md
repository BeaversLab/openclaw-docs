---
summary: "Doctor 指令：健康檢查、設定遷移與修復步驟"
read_when:
  - 新增或修改 Doctor 遷移
  - 引入重大設定變更
title: "Doctor"
---

# Doctor

`openclaw doctor` 是 OpenClaw 的修復與遷移工具。它可以修復過時的設定/狀態、檢查健康狀況，並提供可執行的修復步驟。

## 快速開始

```bash
openclaw doctor
```

### 無頭模式 / 自動化

```bash
openclaw doctor --yes
```

無提示接受預設值（包括適用時的重新啟動/服務/沙箱修復步驟）。

```bash
openclaw doctor --repair
```

無提示套用建議的修復（在安全處進行修復與重新啟動）。

```bash
openclaw doctor --repair --force
```

同時套用進階修復（覆寫自訂 supervisor 設定）。

```bash
openclaw doctor --non-interactive
```

無提示執行，並僅套用安全的遷移（設定正規化 + 磁碟狀態移動）。跳過需要人工確認的重新啟動/服務/沙箱動作。
偵測到舊版狀態遷移時會自動執行。

```bash
openclaw doctor --deep
```

掃描系統服務是否有額外的 gateway 安裝（launchd/systemd/schtasks）。

如果您想在寫入前檢視變更，請先開啟設定檔：

```bash
cat ~/.openclaw/openclaw.json
```

## 功能概述（總結）

- 針對 git 安裝的選用預檢更新（僅限互動模式）。
- UI 協定新鮮度檢查（當協定結構較新時重新建置 Control UI）。
- 健康檢查 + 重新啟動提示。
- Skills 狀態摘要（合格/遺失/封鎖）。
- 舊版數值的設定正規化。
- 瀏覽器遷移檢查，針對舊版 Chrome 擴充功能設定與 Chrome MCP 準備度。
- OpenCode 提供者覆寫警告（`models.providers.opencode` / `models.providers.opencode-go`）。
- 舊版磁碟狀態遷移（sessions/agent 目錄/WhatsApp 認證）。
- 舊版 cron 存儲遷移（`jobId`、`schedule.cron`、頂層 delivery/payload 欄位、payload `provider`、簡單 `notify: true` webhook 備援作業）。
- 狀態完整性和權限檢查（sessions、transcripts、state 目錄）。
- 當本機執行時進行設定檔權限檢查（chmod 600）。
- Model 認證健康狀況：檢查 OAuth 到期時間、可重新整理即將到期的權杖，並回報認證設定檜冷卻/停用狀態。
- 額外工作區目錄偵測（`~/openclaw`）。
- 啟用沙箱時的沙箱映像檔修復。
- 舊版服務遷移與額外 gateway 偵測。
- Gateway 執行時檢查（服務已安裝但未執行；快取的 launchd 標籤）。
- 通道狀態警告（從執行中的 gateway 探測）。
- Supervisor 設定稽核（launchd/systemd/schtasks），並可選擇修復。
- Gateway 執行時最佳實踐檢查（Node vs Bun、版本管理器路徑）。
- Gateway 連接埠衝突診斷（預設為 `18789`）。
- 針對開放 DM 政策的安全性警告。
- 針對本機 token 模式的 Gateway 認證檢查（當不存在 token 來源時提供 token 產生功能；不會覆寫 token SecretRef 設定）。
- Linux 上的 systemd linger 檢查。
- 來源安裝檢查（pnpm workspace 不匹配、缺少 UI 資源、缺少 tsx 二進位檔案）。
- 寫入更新的設定 + wizard 元資料。

## 詳細行為與原理

### 0) 可選更新（git 安裝）

如果是 git 檢出且 doctor 正以互動方式執行，它會
提議在執行 doctor 之前更新（fetch/rebase/build）。

### 1) 設定正規化

如果設定包含舊版值形狀（例如 `messages.ackReaction`
而沒有通道特定覆蓋），doctor 會將其正規化為目前
的 schema。

### 2) 舊版設定金鑰遷移

當設定包含已棄用的金鑰時，其他指令將拒絕執行並要求
您執行 `openclaw doctor`。

Doctor 將會：

- 說明找到哪些舊版金鑰。
- 顯示它套用的遷移內容。
- 以更新的 schema 重寫 `~/.openclaw/openclaw.json`。

當 Gateway 偵測到舊版設定格式時，也會在啟動時自動執行 doctor 遷移，
因此過期的設定無需手動干預即可修復。

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
- 對於擁有命名 `accounts` 但缺少 `accounts.default` 的通道，如果存在帳號範圍的頂層單一帳號通道值，則將其移入 `channels.<channel>.accounts.default`
- `identity` → `agents.list[].identity`
- `agent.*` → `agents.defaults` + `tools.*` (tools/elevated/exec/sandbox/subagents)
- `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks`
  → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
- `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
- `browser.profiles.*.driver: "extension"` → `"existing-session"`
- 移除 `browser.relayBindHost` (舊版擴充功能中繼設定)

Doctor 警告也包含多帳號通道的帳號預設指引：

- 如果配置了兩個或多個 `channels.<channel>.accounts` 項目但未設定 `channels.<channel>.defaultAccount` 或 `accounts.default`，Doctor 會警告備援路由可能選擇到非預期的帳號。
- 如果 `channels.<channel>.defaultAccount` 設定為未知的帳號 ID，Doctor 會發出警告並列出已配置的帳號 ID。

### 2b) OpenCode 提供者覆寫

如果您手動新增了 `models.providers.opencode`、`opencode-zen` 或 `opencode-go`，
它將覆寫來自 `@mariozechner/pi-ai` 的內建 OpenCode 目錄。
這可能會強制模型使用錯誤的 API 或將成本歸零。Doctor 會發出警告，以便
您移除覆寫並恢復依模型的 API 路由與成本。

### 2c) 瀏覽器遷移與 Chrome MCP 就緒

如果您的瀏覽器設定仍然指向已移除的 Chrome 擴充功能路徑，Doctor
會將其正規化為目前的主機本機 Chrome MCP 附加模型：

- `browser.profiles.*.driver: "extension"` 變成 `"existing-session"`
- `browser.relayBindHost` 已被移除

當您使用 `defaultProfile:
"user"` or a configured `existing-session` 設定檔時，Doctor 也會稽核主機本地的 Chrome MCP 路徑：

- 檢查預設自動連線設定檔是否已在同一主機上安裝 Google Chrome
- 檢查偵測到的 Chrome 版本，當其低於 Chrome 144 時發出警告
- 提醒您在瀏覽器檢查頁面啟用遠端偵錯（例如 `chrome://inspect/#remote-debugging`、`brave://inspect/#remote-debugging`
  或 `edge://inspect/#remote-debugging`）

Doctor 無法為您啟用 Chrome 端的設定。主機本地的 Chrome MCP
仍需要：

- 閘道/節點主機上基於 Chromium 的瀏覽器 144+ 版本
- 瀏覽器於本地執行
- 在該瀏覽器中已啟用遠端偵錯
- 在瀏覽器中批准首次附加的同意提示

此檢查**不**適用於 Docker、沙盒、遠端瀏覽器或其他無介面流程。這些流程繼續使用原始 CDP。

### 3) 舊版狀態遷移（磁碟佈局）

Doctor 可以將較舊的磁碟佈局遷移至目前的結構：

- Sessions 存放區 + 轉錄檔：
  - 從 `~/.openclaw/sessions/` 到 `~/.openclaw/agents/<agentId>/sessions/`
- Agent 目錄：
  - 從 `~/.openclaw/agent/` 到 `~/.openclaw/agents/<agentId>/agent/`
- WhatsApp 驗證狀態：
  - 從舊版 `~/.openclaw/credentials/*.json`（`oauth.json` 除外）
  - 到 `~/.openclaw/credentials/whatsapp/<accountId>/...`（預設帳戶 ID：`default`）

這些遷移為盡力而為且具等冪性；當 doctor 將任何舊版資料夾保留為備份時，會發出警告。Gateway/CLI 也會在啟動時自動遷移舊版 sessions + agent 目錄，以便歷史記錄/驗證/模型進入每個 agent 的路徑，而無需手動執行 doctor。WhatsApp 驗證僅透過 `openclaw doctor` 進行遷移。

### 3b) 舊版 cron 存放區遷移

Doctor 也會檢查 cron 工作存放區（預設為 `~/.openclaw/cron/jobs.json`，
或在覆寫時為 `cron.store`）中排程器為了相容性仍接受的舊工作格式。

目前的 cron 清理項目包括：

- `jobId` → `id`
- `schedule.cron` → `schedule.expr`
- 頂層 payload 欄位 (`message`, `model`, `thinking`, ...) → `payload`
- 頂層 delivery 欄位 (`deliver`, `channel`, `to`, `provider`, ...) → `delivery`
- payload `provider` delivery 別名 → 明確的 `delivery.channel`
- 簡單的舊版 `notify: true` webhook 後備作業 → 明確的 `delivery.mode="webhook"` 並搭配 `delivery.to=cron.webhook`

Doctor 只有在能夠不改變行為的情況下，才會自動遷移 `notify: true` 作業。如果某個作業結合了舊版 notify 後備與現有的非 webhook 傳遞模式，doctor 會發出警告並將該作業留給人工檢視。

### 4) 狀態完整性檢查 (session persistence、routing 和安全性)

狀態目錄是運作的核心樞紐。如果它消失了，您將失去 sessions、憑證、日誌和設定 (除非您在其他地方有備份)。

Doctor 檢查項目：

- **State dir missing**：警告災難性的狀態遺失，提示重新建立該目錄，並提醒您它無法恢復遺失的資料。
- **State dir permissions**：驗證可寫性；提供修復權限的選項 (並在偵測到擁有者/群組不符時發出 `chown` 提示)。
- **macOS cloud-synced state dir**：當狀態位於 iCloud Drive (`~/Library/Mobile Documents/com~apple~CloudDocs/...`) 或 `~/Library/CloudStorage/...` 之下時發出警告，因為同步支援的路徑可能導致較慢的 I/O 和鎖定/同步競爭。
- **Linux SD or eMMC state dir**：當狀態解析至 `mmcblk*` 掛載來源時發出警告，因為 SD 或 eMMC 支援的隨機 I/O 在 session 和憑證寫入時可能較慢且磨損較快。
- **Session dirs missing**：`sessions/` 和 session store 目錄是持久化歷史記錄和避免 `ENOENT` 當機所必需的。
- **Transcript mismatch**：當最近的 session 項目缺少 transcript 檔案時發出警告。
- **Main session “1-line JSONL”**：當主要 transcript 只有一行時會標示 (歷史記錄未累積)。
- **多個狀態目錄**：當跨家用目錄存在多個 `~/.openclaw` 資料夾，或當 `OPENCLAW_STATE_DIR` 指向其他位置時發出警告（歷史記錄可能會在安裝之間拆分）。
- **遠端模式提醒**：如果 `gateway.mode=remote`，doctor 會提醒您在遠端主機上執行它（狀態位於該處）。
- **設定檔權限**：如果 `~/.openclaw/openclaw.json` 可被群組/其他人讀取，則發出警告並提議將其嚴格化為 `600`。

### 5) 模型授權健康狀況 (OAuth 過期)

Doctor 會檢查授權儲存中的 OAuth 設定檔，在權杖即將過期/已過期時發出警告，並在安全時進行更新。如果 Anthropic Claude Code 設定檔已過時，它會建議執行 `claude setup-token`（或貼上設定權杖）。更新提示僅在以互動方式（TTY）執行時出現；`--non-interactive` 會跳過更新嘗試。

Doctor 也會報告因以下原因而暫時無法使用的授權設定檔：

- 短暫冷卻（速率限制/逾時/授權失敗）
- 較長時間的停用（計費/信用額度失敗）

### 6) Hooks 模型驗證

如果設定了 `hooks.gmail.model`，doctor 會根據目錄和允許清單驗證模型參照，並在無法解析或被禁止時發出警告。

### 7) Sandbox 映像檔修復

啟用沙箱機制時，doctor 會檢查 Docker 映像檔，如果目前的映像檔缺失，會提議建置或切換至舊版名稱。

### 8) Gateway 服務移轉與清理提示

Doctor 會偵測舊版 gateway 服務（launchd/systemd/schtasks），並提議移除它們並使用目前的 gateway 連接埠安裝 OpenClaw 服務。它也可以掃描額外的類似 gateway 的服務並列印清理提示。以設定檔命名的 OpenClaw gateway 服務被視為一等公民，不會被標記為「額外」。

### 9) 安全性警告

當提供者在沒有允許清單的情況下開放 DM，或當策略以危險方式設定時，Doctor 會發出警告。

### 10) systemd linger (Linux)

如果作為 systemd 使用者服務執行，doctor 會確保啟用 linger，以便在登出後 gateway 保持運作。

### 11) 技能狀態

Doctor 會列印目前工作區符合資格/遺失/被封鎖的技能的快速摘要。

### 12) Gateway 授權檢查（本機權杖）

Doctor 會檢查本機 gateway 權杖授權就緒狀態。

- 如果 token 模式需要 token 但沒有 token 來源，doctor 會提議生成一個。
- 如果 `gateway.auth.token` 由 SecretRef 管理但無法使用，doctor 會發出警告且不會用純文字覆寫它。
- `openclaw doctor --generate-gateway-token` 僅在未設定 token SecretRef 時強制生成。

### 12b) 支援唯讀 SecretRef 的修復

某些修復流程需要檢查設定的憑證，同時不削弱執行階段的快速失敗行為。

- `openclaw doctor --fix` 現在使用與 status 系列指令相同的唯讀 SecretRef 摘要模型，來進行目標設定修復。
- 範例：Telegram `allowFrom` / `groupAllowFrom` `@username` 修復會嘗試在可用時使用設定的 bot 憑證。
- 如果 Telegram bot token 是透過 SecretRef 設定，但在目前指令路徑中無法使用，doctor 會回報該憑證已設定但無法使用，並跳過自動解決，而不是崩潰或錯誤地回報 token 遺失。

### 13) Gateway 健康檢查 + 重新啟動

Doctor 會執行健康檢查，並在 gateway 看起來不健康時提議重新啟動。

### 14) 頻道狀態警告

如果 gateway 健康，doctor 會執行頻道狀態探測並回報帶有建議修正措施的警告。

### 15) Supervisor 設定稽核 + 修復

Doctor 會檢查已安裝的 supervisor 設定 (launchd/systemd/schtasks) 是否有遺失或過時的預設值 (例如 systemd network-online 相依性和重新啟動延遲)。當發現不符時，它會建議更新並可將服務檔案/工作重寫為目前的預設值。

備註：

- `openclaw doctor` 會在重寫 supervisor 設定前提示。
- `openclaw doctor --yes` 接受預設的修復提示。
- `openclaw doctor --repair` 無須提示即可套用建議的修正措施。
- `openclaw doctor --repair --force` 會覆寫自訂的 supervisor 設定。
- 如果 token 驗證需要 token 且 `gateway.auth.token` 由 SecretRef 管理，doctor 服務安裝/修復會驗證 SecretRef，但不會將解析出的純文字 token 值保存到 supervisor 服務環境元資料中。
- 如果 token 身份驗證需要 token 且已設定的 token SecretRef 未解析，doctor 會透過可操作的指引阻擋安裝/修復途徑。
- 如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，doctor 會阻擋安裝/修復，直到明確設定模式。
- 對於 Linux 使用者 systemd 單元，doctor 的 token 偏移檢查現在在比較服務驗證元資料時會同時包含 `Environment=` 和 `EnvironmentFile=` 來源。
- 您始終可以透過 `openclaw gateway install --force` 強制完整重寫。

### 16) Gateway 執行時間 + 連接埠診斷

Doctor 會檢查服務執行時間（PID、上次結束狀態），並在服務已安裝但實際未執行時發出警告。它還會檢查 gateway 連接埠（預設為 `18789`）上的連接埠衝突，並報告可能的原因（gateway 已在執行、SSH 隧道）。

### 17) Gateway 執行時間最佳實務

當 gateway 服務在 Bun 或版本管理的 Node 路徑（`nvm`、`fnm`、`volta`、`asdf` 等）上執行時，Doctor 會發出警告。WhatsApp + Telegram 頻道需要 Node，且版本管理器路徑可能會在升級後中斷，因為服務不會載入您的 shell 初始化。當有可用的系統 Node 安裝時，Doctor 會提議遷移（Homebrew/apt/choco）。

### 18) 設定寫入 + 精靈元資料

Doctor 會保存任何設定變更，並標記精靈元資料以記錄 doctor 執行。

### 19) 工作區提示（備份 + 記憶系統）

當缺少工作區記憶系統時，Doctor 會建議安裝一個；如果工作區尚未在 git 下，則會列印備份提示。

請參閱 [/concepts/agent-workspace](/zh-Hant/concepts/agent-workspace) 以取得工作區結構和 git 備份的完整指南（建議使用私人 GitHub 或 GitLab）。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
