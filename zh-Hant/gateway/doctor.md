---
summary: "Doctor 指令：健康檢查、設定遷移以及修復步驟"
read_when:
  - Adding or modifying doctor migrations
  - Introducing breaking config changes
title: "Doctor"
---

# Doctor

`openclaw doctor` 是 OpenClaw 的修復與遷移工具。它能修正過期的設定/狀態、檢查健康狀況，並提供可執行的修復步驟。

## 快速開始

```bash
openclaw doctor
```

### 無頭 / 自動化

```bash
openclaw doctor --yes
```

無需提示直接接受預設值（包括適用時的重新啟動/服務/沙箱修復步驟）。

```bash
openclaw doctor --repair
```

無需提示直接套用建議的修復（在安全處進行修復和重新啟動）。

```bash
openclaw doctor --repair --force
```

同時套用激進修復（覆寫自訂的 supervisor 設定）。

```bash
openclaw doctor --non-interactive
```

無需提示執行，僅套用安全的遷移（設定正規化 + 磁碟狀態移動）。略過需要人工確認的重新啟動/服務/沙箱操作。
偵測到舊版狀態遷移時會自動執行。

```bash
openclaw doctor --deep
```

掃描系統服務中是否有額外的 gateway 安裝 (launchd/systemd/schtasks)。

如果您想在寫入之前檢視變更，請先開啟設定檔：

```bash
cat ~/.openclaw/openclaw.json
```

## 功能概述

- 針對 git 安裝的可選飛行前更新 (僅限互動模式)。
- UI 協定新鮮度檢查 (當協定架構較新時重新建置 Control UI)。
- 健康狀態檢查 + 重新啟動提示。
- Skills 狀態摘要 (合格/遺失/已封鎖)。
- 針對舊版值的設定正規化。
- 瀏覽器遷移檢查，檢查舊版 Chrome 擴充功能設定和 Chrome MCP 就緒狀態。
- OpenCode 提供者覆寫警告 (`models.providers.opencode` / `models.providers.opencode-go`)。
- 舊版磁碟狀態遷移 (sessions/agent dir/WhatsApp auth)。
- 舊版 cron 儲存遷移 (`jobId`, `schedule.cron`, 頂層 delivery/payload 欄位, payload `provider`, 簡單 `notify: true` webhook 備援工作)。
- 狀態完整性與權限檢查 (sessions, transcripts, state dir)。
- 本機執行時的設定檔權限檢查 (chmod 600)。
- 模型驗證健康狀況：檢查 OAuth 到期時間，可重新整理即將到期的權杖，並回報 auth-profile 冷卻/停用狀態。
- 額外工作區目錄偵測 (`~/openclaw`)。
- 啟用沙盒時的沙盒映像檔修復。
- 舊版服務遷移與額外閘道偵測。
- 閘道執行時檢查 (服務已安裝但未執行；快取的 launchd 標籤)。
- 通道狀態警告 (從執行中的閘道探查)。
- 監督器設定稽核 (launchd/systemd/schtasks)，可選擇是否修復。
- Gateway 執行時期最佳實踐檢查（Node vs Bun、版本管理器路徑）。
- Gateway 連接埠衝突診斷（預設為 `18789`）。
- 針對開放 DM 政策的安全性警示。
- 本機 Token 模式下的 Gateway 驗證檢查（當不存在 Token 來源時提供 Token 產生；不會覆寫 Token SecretRef 設定）。
- Linux 上的 systemd linger 檢查。
- 來源安裝檢查（pnpm workspace 不匹配、缺少 UI 資產、缺少 tsx 二進位檔案）。
- 寫入更新的設定 + 精靈中繼資料。

## 詳細行為與基本原理

### 0) 可選更新（git 安裝）

如果這是 git 檢出並且 Doctor 正在互動模式下執行，它會在執行 Doctor 之前提供更新（fetch/rebase/build）。

### 1) 設定正規化

如果設定包含舊版值形狀（例如 `messages.ackReaction` 沒有特定頻道的覆寫），Doctor 會將其正規化為目前的架構。

### 2) 舊版配置金鑰遷移

當配置包含已棄用的金鑰時，其他指令將拒絕執行並要求您執行 `openclaw doctor`。

Doctor 將：

- 說明找到了哪些舊版金鑰。
- 顯示它所套用的遷移。
- 使用更新後的架構重寫 `~/.openclaw/openclaw.json`。

當 Gateway 偵測到舊版配置格式時，也會在啟動時自動執行 doctor 遷移，因此無需人工干預即可修復過時的配置。

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
- 對於具有命名 `accounts` 但缺少 `accounts.default` 的頻道，如果存在帳號範圍的頂層單一帳號頻道值，將其移入 `channels.<channel>.accounts.default` 中
- `identity` → `agents.list[].identity`
- `agent.*` → `agents.defaults` + `tools.*` (tools/elevated/exec/sandbox/subagents)
- `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks`
  → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
- `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
- `browser.profiles.*.driver: "extension"` → `"existing-session"`
- 移除 `browser.relayBindHost`（舊版擴充功能中繼設定）

Doctor 警告還包括針對多帳戶通道的帳戶預設指引：

- 如果配置了兩個或更多 `channels.<channel>.accounts` 項目，且未指定 `channels.<channel>.defaultAccount` 或 `accounts.default`，Doctor 會警告指出，備援路由可能會選擇非預期的帳戶。
- 如果 `channels.<channel>.defaultAccount` 被設為未知的帳戶 ID，Doctor 會發出警告並列出已設定的帳戶 ID。

### 2b) OpenCode 提供者覆寫

如果您已手動新增 `models.providers.opencode`、`opencode-zen` 或 `opencode-go`，它會覆寫來自 `@mariozechner/pi-ai` 的內建 OpenCode 目錄。這可能會強制將模型導向錯誤的 API 或將成本歸零。Doctor 會發出警告，以便您移除覆寫並恢復依模型的 API 路由與成本設定。

### 2c) 瀏覽器遷移與 Chrome MCP 就緒

如果您的瀏覽器設定仍然指向已移除的 Chrome 擴充功能路徑，Doctor 會將其標準化為目前主機本機的 Chrome MCP 附加模型：

- `browser.profiles.*.driver: "extension"` 會變成 `"existing-session"`
- `browser.relayBindHost` 會被移除

當您使用 `defaultProfile:
"user"` or a configured `existing-session` 設定檔時，Doctor 也會稽核主機本地的 Chrome MCP 路徑：

- 檢查主機上是否已安裝 Google Chrome，以用於預設自動連線設定檔
- 檢查偵測到的 Chrome 版本，並在低於 Chrome 144 時發出警告
- 提醒您在瀏覽器檢查頁面中啟用遠端偵錯（例如
  `chrome://inspect/#remote-debugging`、`brave://inspect/#remote-debugging`
  或 `edge://inspect/#remote-debugging`）

Doctor 無法為您啟用 Chrome 端的設定。主機本地 Chrome MCP
仍然需要：

- 在 Gateway/Node 主機上安裝基於 Chromium 的瀏覽器 144+ 版本
- 瀏覽器在本地運行
- 在該瀏覽器中啟用遠端偵錯
- 在瀏覽器中批准第一次附加連線的同意提示

此檢查**不**適用於 Docker、sandbox、remote-browser 或其他
無頭流程。這些流程繼續使用原始 CDP。

### 3) 舊版狀態遷移（磁碟佈局）

Doctor 可以將較舊的磁碟佈局遷移到目前的結構：

- Sessions store + transcripts：
  - 從 `~/.openclaw/sessions/` 到 `~/.openclaw/agents/<agentId>/sessions/`
- Agent dir：
  - 從 `~/.openclaw/agent/` 到 `~/.openclaw/agents/<agentId>/agent/`
- WhatsApp auth state (Baileys)：
  - 從舊版 `~/.openclaw/credentials/*.json`（除外 `oauth.json`）
  - 到 `~/.openclaw/credentials/whatsapp/<accountId>/...`（預設帳號 ID：`default`）

這些遷移為盡力而為且具等冪性；當 doctor 將任何舊版資料夾作為備份保留時，會發出警告。Gateway/CLI 也會在啟動時自動遷移舊版 sessions + agent dir，以便歷史記錄/身份驗證/模型檔案在不需要手動執行 doctor 的情況下放入個別 agent 的路徑。WhatsApp auth 僅透過 `openclaw doctor` 進行遷移。

### 3b) 舊版 cron 存儲遷移

Doctor 還會檢查 cron 任務存儲（預設為 `~/.openclaw/cron/jobs.json`，若被覆蓋則為 `cron.store`）中的舊任務格式，這些格式為了相容性仍被排程器接受。

目前的 cron 清理項目包括：

- `jobId` → `id`
- `schedule.cron` → `schedule.expr`
- 頂層 payload 欄位（`message`、`model`、`thinking` 等）→ `payload`
- 頂層 delivery 欄位（`deliver`、`channel`、`to`、`provider` 等）→ `delivery`
- payload `provider` delivery aliases → explicit `delivery.channel`
- simple legacy `notify: true` webhook fallback jobs → explicit `delivery.mode="webhook"` with `delivery.to=cron.webhook`

Doctor 只會在不改變行為的前提下自動遷移 `notify: true` 任務。如果某個任務結合了舊版 notify 後備機制與現有的非 webhook 傳遞模式，doctor 會發出警告並將該任務留待手動審查。

### 4) 狀態完整性檢查（會話持久化、路由與安全性）

State 目錄是運作上的腦幹。如果它消失，您將遺失
sessions、憑證、日誌和 config（除非您在其他地方有備份）。

Doctor 檢查：

- **State dir missing**：警告災難性的狀態遺失，提示重新建立
  目錄，並提醒您它無法復原遺失的資料。
- **State dir permissions**：驗證可寫性；提供修復權限的選項
  （並在偵測到擁有者/群組不符時發出 `chown` 提示）。
- **macOS cloud-synced state dir**：當狀態解析於 iCloud Drive
  （`~/Library/Mobile Documents/com~apple~CloudDocs/...`）或
  `~/Library/CloudStorage/...` 下方時發出警告，因為同步備份路徑會導致較慢的 I/O
  和鎖定/同步競爭。
- **Linux SD or eMMC state dir**：當狀態解析至 `mmcblk*`
  掛載來源時發出警告，因為 SD 或 eMMC 備份的隨機 I/O 在工作階段和認證寫入下可能較慢且磨損較快。
- **Session dirs missing**：`sessions/` 和工作階段存放區目錄
  是保存歷史記錄和避免 `ENOENT` 當機所必需的。
- **Transcript mismatch**：當最近的工作階段項目缺少逐字稿檔案時發出警告。
- **Main session “1-line JSONL”**：當主要文字記錄只有一行時會發出警示（歷史記錄未累積）。
- **Multiple state dirs**：當跨多個主目錄存在多個 `~/.openclaw` 資料夾，或當 `OPENCLAW_STATE_DIR` 指向其他位置時發出警告（歷史記錄可能會在安裝之間分離）。
- **Remote mode reminder**：如果是 `gateway.mode=remote`，doctor 會提醒您在遠端主機上執行它（狀態位於該處）。
- **Config file permissions**：如果 `~/.openclaw/openclaw.json` 可被群組/其他人讀取，則發出警告並提議將其限制為 `600`。

### 5) 模型驗證健康狀態 (OAuth 到期)

Doctor 會檢查授權存儲中的 OAuth 設定檔，在權杖即將過期或已過期時發出警告，並在安全時進行更新。如果 Anthropic Claude Code 設定檔已過時，它會建議執行 `claude setup-token`（或貼上設置權杖）。
更新提示僅在互動模式（TTY）下執行時出現；`--non-interactive` 會跳過更新嘗試。

Doctor 也會報告因以下原因而暫時無法使用的授權設定檔：

- 短暫冷卻（速率限制/逾時/授權失敗）
- 較長時間的停用（計費/信用額度失敗）

### 6) Hooks 模型驗證

如果設定了 `hooks.gmail.model`，doctor 會根據目錄和允許清單驗證模型參照，並在無法解析或被禁止時發出警告。

### 7) Sandbox 映像檔修復

啟用沙盒機制時，doctor 會檢查 Docker 映像檔，如果目前的映像檔遺失，則提供建置或切換至舊版名稱的選項。

### 8) 閘道服務遷移與清理提示

Doctor 會偵測舊版閘道服務（launchd/systemd/schtasks），並提議將其移除，使用目前的閘道連接埠安裝 OpenClaw 服務。它也可以掃描額外類似閘道的服務，並印出清理提示。以 Profile 命名的 OpenClaw 閘道服務被視為一等公民，不會被標記為「額外」。

### 9) 安全性警告

當提供者開放 DM 但未設定允許清單，或是策略設定為不安全的狀態時，Doctor 會發出警告。

### 10) systemd linger (Linux)

如果作為 systemd 使用者服務執行，doctor 會確保啟用 linger 功能，以便在登出後閘道仍保持運作。

### 11) Skills 狀態

Doctor 會針對目前的工作區，列印出符合資格/缺失/被封鎖的 Skills 的快速摘要。

### 12) 閘道驗證檢查（本機 Token）

Doctor 會檢查本機閘道 Token 驗證的準備情況。

- 如果 token 模式需要 token 但沒有 token 來源，doctor 會提議產生一個。
- 如果 `gateway.auth.token` 是由 SecretRef 管理但目前無法使用，doctor 會發出警告，並不會用純文字覆寫它。
- `openclaw doctor --generate-gateway-token` 僅在未設定 token SecretRef 時才強制產生。

### 12b) 感知唯讀 SecretRef 的修復

某些修復流程需要檢查設定的憑證，同時不削弱執行時期的快速失敗（fail-fast）行為。

- `openclaw doctor --fix` 現在針對目標設定修復，使用與狀態系列（status-family）指令相同的唯讀 SecretRef 摘要模型。
- 範例：Telegram `allowFrom` / `groupAllowFrom` `@username` 修復會嘗試在可用時使用設定的 bot 憑證。
- 如果 Telegram bot 權杖是透過 SecretRef 設定的，但在目前的指令路徑中無法取得，doctor 會回報該憑證已設定但無法取得，並跳過自動解析，而不是直接崩潰或錯誤地回報權杖遺失。

### 13) Gateway 健康檢查 + 重新啟動

Doctor 會執行健康檢查，並在 Gateway 看起來不正常時提議重新啟動它。

### 14) 頻道狀態警告

如果 Gateway 狀態正常，Doctor 會執行頻道狀態探測，並回報附帶建議修正方法的警告。

### 15) Supervisor 設定稽核 + 修復

Doctor 會檢查已安裝的 supervisor 設定 (launchd/systemd/schtasks) 是否有遺失或過時的預設值 (例如 systemd network-online 相依性和重新啟動延遲)。當發現不一致時，它會建議更新，並可將服務檔案/任務重寫為目前的預設值。

備註：

- `openclaw doctor` 在重寫 supervisor 設定前會進行提示。
- `openclaw doctor --yes` 接受預設修復提示。
- `openclaw doctor --repair` 無須提示即可套用建議的修復。
- `openclaw doctor --repair --force` 會覆寫自訂的 supervisor 設定。
- 如果 token 驗證需要 token 且 `gateway.auth.token` 是由 SecretRef 管理，doctor 服務安裝/修復會驗證 SecretRef，但不會將解析出的明文 token 值保存到 supervisor 服務環境元資料中。
- 如果 token 驗證需要 token 且設定的 token SecretRef 未解析，doctor 會以可操作的指引阻擋安裝/修復路徑。
- 如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，doctor 會阻擋安裝/修復，直到明確設定模式為止。
- 對於 Linux 使用者 systemd 單元，doctor token 偏差檢查現在會在比較服務驗證元資料時，同時包含 `Environment=` 和 `EnvironmentFile=` 來源。
- 您總是可以透過 `openclaw gateway install --force` 強制完整重寫。

### 16) Gateway 執行時期 + 連接埠診斷

Doctor 會檢查服務執行時期（PID、上次退出狀態），並在服務已安裝但實際上未執行時發出警告。它也會檢查 gateway 連接埠（預設 `18789`）上的連接埠衝突，並回報可能的原因（gateway 已在執行中、SSH 通道）。

### 17) Gateway 執行時期最佳實踐

當 Gateway 服務在 Bun 或受版本管理的 Node 路徑上執行時，Doctor 會發出警告（`nvm`、`fnm`、`volta`、`asdf` 等）。WhatsApp 和 Telegram 頻道需要 Node，且版本管理器路徑可能會在升級後中斷，因為該服務不會載入您的 shell 初始化檔案。當有可用的系統 Node 安裝版本時（Homebrew/apt/choco），Doctor 會提議進行遷移。

### 18) 設定檔寫入 + 精靈中繼資料

Doctor 會保存任何設定檔變更，並標記精靈中繼資料以記錄 Doctor 的執行。

### 19) 工作區提示（備份 + 記憶系統）

當缺少工作區記憶系統時，Doctor 會建議安裝；如果工作區尚未納入 git 管理，則會列印備份提示。

請參閱 [/concepts/agent-workspace](/zh-Hant/concepts/agent-workspace) 以取得關於工作區結構和 git 備份的完整指南（建議使用私人的 GitHub 或 GitLab）。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
