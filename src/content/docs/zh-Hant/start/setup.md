---
summary: "OpenClaw 的進階設定與開發工作流程"
read_when:
  - Setting up a new machine
  - You want "latest + greatest" without breaking your personal setup
title: "設定"
---

<Note>如果您是第一次進行設定，請從[入門指南](/zh-Hant/start/getting-started)開始。 關於入門的詳細資訊，請參閱 [入門 (CLI)](/zh-Hant/start/wizard)。</Note>

## TL;DR

根據您希望更新的頻率以及是否想自行執行 Gateway，選擇一種設定工作流程：

- **客製化配置位於 repo 之外：** 將您的設定和工作區保留在 `~/.openclaw/openclaw.json` 和 `~/.openclaw/workspace/` 中，這樣 repo 更新就不會影響它們。
- **穩定工作流程（推薦給大多數人）：** 安裝 macOS 應用程式並讓它執行內建的 Gateway。
- **最新工作流程 (開發)：** 透過 `pnpm gateway:watch` 自己執行 Gateway，然後讓 macOS 應用程式以本地模式連線。

## 先決條件 (從原始碼)

- 建議使用 Node 24 (Node 22 LTS，目前為 `22.16+`，仍受支援)
- 原始碼簽出需要 `pnpm`。OpenClaw 在開發模式下會從 `extensions/*` pnpm 工作區套件載入捆綁的外掛，因此根目錄的 `npm install` 不會準備完整的原始碼樹。
- Docker (選用；僅用於容器化設定/e2e - 請參閱 [Docker](/zh-Hant/install/docker))

## 客製化策略 (以免更新受影響)

如果您想要「100% 為我量身打造」_且_ 容易更新，請將您的客製化內容保留在：

- **設定：** `~/.openclaw/openclaw.json` (JSON/JSON5-ish)
- **工作區：** `~/.openclaw/workspace` (技能、提示詞、記憶；將其設為私有的 git repo)

引導一次：

```bash
openclaw setup
```

在此 repo 內部，使用本機 CLI 入口：

```bash
openclaw setup
```

如果您還沒有全域安裝，請透過 `pnpm openclaw setup` 執行它。

## 從此 repo 執行 Gateway

在 `pnpm build` 之後，您可以直接執行打包後的 CLI：

```bash
node openclaw.mjs gateway --port 18789 --verbose
```

## 穩定工作流程 (macOS 應用程式優先)

1. 安裝 + 啟動 **OpenClaw.app** (選單列)。
2. 完成入門/權限檢查清單 (TCC 提示)。
3. 確保 Gateway 為 **Local** 且正在執行 (由應用程式管理)。
4. 連結介面 (例如：WhatsApp)：

```bash
openclaw channels login
```

5. 完整性檢查：

```bash
openclaw health
```

如果您在的版本中無法使用入門功能：

- 執行 `openclaw setup`，然後執行 `openclaw channels login`，接著手動啟動 Gateway (`openclaw gateway`)。

## 最新工作流程 (Gateway 在終端機中)

目標：開發 TypeScript Gateway，取得熱重載，並保持 macOS 應用程式 UI 已連接。

### 0) (選用) 也從原始碼執行 macOS 應用程式

如果您也想要 macOS 應用程式使用最新版本：

```bash
./scripts/restart-mac.sh
```

### 1) 啟動開發 Gateway

```bash
pnpm install
# First run only (or after resetting local OpenClaw config/workspace)
pnpm openclaw setup
pnpm gateway:watch
```

`gateway:watch` 在指定的 tmux 會話中啟動或重新啟動 Gateway 監視程序，並從互動式終端機自動附加。非互動式 Shell 保持分離並列印 `tmux attach -t openclaw-gateway-watch-main`；請使用 `OPENCLAW_GATEWAY_WATCH_ATTACH=0 pnpm gateway:watch` 讓互動式執行保持分離，或使用 `pnpm gateway:watch:raw` 進行前景監視模式。監視器會在相關的來源、設定和捆綁插件元資料變更時重新載入。如果受監視的 Gateway 在啟動期間退出，`gateway:watch` 會執行一次 `openclaw doctor --fix --non-interactive` 並重試；設定 `OPENCLAW_GATEWAY_WATCH_AUTO_DOCTOR=0` 可停用此僅限開發的修復程序。
`pnpm openclaw setup` 是全新檢出的一次性本機設定/工作區初始化步驟。
`pnpm gateway:watch` 不會重建 `dist/control-ui`，因此請在 `ui/` 變更後重新執行 `pnpm ui:build`，或在開發 Control UI 時使用 `pnpm ui:dev`。

### 2) 將 macOS 應用程式指向您執行中的 Gateway

在 **OpenClaw.app** 中：

- 連線模式：**本地**
  應用程式將會附加到設定連接埠上執行中的 gateway。

### 3) 驗證

- 應用程式內的 Gateway 狀態應顯示 **"Using existing gateway …"**
- 或透過 CLI：

```bash
openclaw health
```

### 常見陷阱

- **錯誤的連接埠：** Gateway WS 預設為 `ws://127.0.0.1:18789`；請保持應用程式與 CLI 在相同的連接埠上。
- **狀態儲存位置：**
  - 頻道/提供者狀態：`~/.openclaw/credentials/`
  - 模型驗證設定檔：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
  - 工作階段：`~/.openclaw/agents/<agentId>/sessions/`
  - 日誌：`/tmp/openclaw/`

## 憑證儲存對應

在除錯驗證或決定要備份什麼時使用此功能：

- **WhatsApp**：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
- **Telegram 機器人權杖**：config/env 或 `channels.telegram.tokenFile` (僅限一般檔案；不接受符號連結)
- **Discord 機器人權杖**：config/env 或 SecretRef (env/file/exec 提供者)
- **Slack 權杖**：config/env (`channels.slack.*`)
- **配對允許清單**：
  - `~/.openclaw/credentials/<channel>-allowFrom.json` (預設帳戶)
  - `~/.openclaw/credentials/<channel>-<accountId>-allowFrom.json` (非預設帳戶)
- **模型驗證設定檔**：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- **檔案支援的 secrets payload（可選）**：`~/.openclaw/secrets.json`
- **舊版 OAuth 匯入**：`~/.openclaw/credentials/oauth.json`
  更多詳情：[安全性](/zh-Hant/gateway/security#credential-storage-map)。

## 更新（不破壞您的設定）

- 將 `~/.openclaw/workspace` 和 `~/.openclaw/` 視為「您的東西」；不要將個人 prompts/config 放入 `openclaw` repo 中。
- 更新來源：`git pull` + `pnpm install` + 繼續使用 `pnpm gateway:watch`。

## Linux（systemd 使用者服務）

Linux 安裝程式使用 systemd **使用者** 服務。預設情況下，systemd 會在登出/閒置時停止使用者
服務，這會終止 Gateway。Onboarding 會嘗試為您啟用
lingering（可能會提示輸入 sudo）。如果仍然關閉，請執行：

```bash
sudo loginctl enable-linger $USER
```

對於隨時運行或多使用者伺服器，請考慮使用 **系統** 服務而非
使用者服務（不需要 lingering）。有關 systemd 的說明，請參閱 [Gateway runbook](/zh-Hant/gateway)。

## 相關文件

- [Gateway runbook](/zh-Hant/gateway)（旗標、監控、連接埠）
- [Gateway 設定](/zh-Hant/gateway/configuration)（設定結構 + 範例）
- [Discord](/zh-Hant/channels/discord) 和 [Telegram](/zh-Hant/channels/telegram)（回覆標籤 + replyToMode 設定）
- [OpenClaw assistant 設定](/zh-Hant/start/openclaw)
- [macOS 應用程式](/zh-Hant/platforms/macos)（gateway 生命週期）
