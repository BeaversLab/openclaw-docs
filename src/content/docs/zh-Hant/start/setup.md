---
summary: "OpenClaw 的進階設定與開發工作流程"
read_when:
  - Setting up a new machine
  - You want “latest + greatest” without breaking your personal setup
title: "設定"
---

# 設定

<Note>如果您是第一次進行設置，請從 [快速入門](/zh-Hant/start/getting-started) 開始。 有關入職培訓的詳細資訊，請參閱 [Onboarding (CLI)](/zh-Hant/start/wizard)。</Note>

## TL;DR

- **客製化設定位於 repo 之外：** `~/.openclaw/workspace` (workspace) + `~/.openclaw/openclaw.json` (config)。
- **穩定工作流程：** 安裝 macOS 應用程式；讓它執行內建的 Gateway。
- **最前線工作流程：** 透過 `pnpm gateway:watch` 自行執行 Gateway，然後讓 macOS 應用程式以本機模式連接。

## 先決條件 (從原始碼)

- 建議使用 Node 24 (Node 22 LTS，目前為 `22.14+`，仍受支援)
- `pnpm` 為首選（如果您有意使用 [Bun 工作流程](/zh-Hant/install/bun)，則使用 Bun）
- Docker（可選；僅用於容器化設置/e2e — 請參見 [Docker](/zh-Hant/install/docker)）

## 客製化策略 (以免更新受影響)

如果您想要「100% 量身打造」_且_ 易於更新，請將您的客製化內容保留於：

- **設定：** `~/.openclaw/openclaw.json` (JSON/JSON5-ish)
- **工作區：** `~/.openclaw/workspace` (skills、prompts、memories；將其設為私人 git repo)

引導一次：

```bash
openclaw setup
```

在此 repo 內部，使用本機 CLI 入口：

```bash
openclaw setup
```

如果您尚未進行全域安裝，請透過 `pnpm openclaw setup` 執行 (若您使用 Bun workflow 則為 `bun run openclaw setup`)。

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

`gateway:watch` 以監視模式運行閘道，並在相關源代碼、配置和捆綁插件元數據更改時重新加載。
`pnpm openclaw setup` 是全新檢出時的一次性本地配置/工作區初始化步驟。
`pnpm gateway:watch` 不會重新構建 `dist/control-ui`，因此請在 `ui/` 更改後重新運行 `pnpm ui:build`，或在開發 Control UI 時使用 `pnpm ui:dev`。

如果您刻意使用 Bun workflow，對等的指令為：

```bash
bun install
# First run only (or after resetting local OpenClaw config/workspace)
bun run openclaw setup
bun run gateway:watch
```

### 2) 讓 macOS 應用程式指向您正在執行的 Gateway

在 **OpenClaw.app** 中：

- 連線模式：**Local**
  應用程式將會連接到設定埠上正在執行的 gateway。

### 3) 驗證

- 應用程式內的 Gateway 狀態應顯示 **“Using existing gateway …”**
- 或透過 CLI：

```bash
openclaw health
```

### 常見陷阱

- **錯誤的連接埠：** 閘道 WS 默認為 `ws://127.0.0.1:18789`；請將應用程式和 CLI 保持在同一連接埠上。
- **狀態存放位置：**
  - 頻道/提供者狀態：`~/.openclaw/credentials/`
  - 模型身份驗證設定檔：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
  - 會話：`~/.openclaw/agents/<agentId>/sessions/`
  - 日誌：`/tmp/openclaw/`

## 憑證儲存對應表

在偵錯認證或決定要備份什麼時使用：

- **WhatsApp**：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
- **Telegram 機器人權杖**：config/env 或 `channels.telegram.tokenFile`（僅限常規文件；不接受符號連結）
- **Discord bot token**：config/env 或 SecretRef（env/file/exec 提供者）
- **Slack 權杖**：config/env (`channels.slack.*`)
- **配對允許清單**：
  - `~/.openclaw/credentials/<channel>-allowFrom.json`（預設帳戶）
  - `~/.openclaw/credentials/<channel>-<accountId>-allowFrom.json`（非預設帳戶）
- **模型身份驗證設定檔**：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- **檔案支援的秘密載荷（可選）**：`~/.openclaw/secrets.json`
- **舊版 OAuth 匯入**：`~/.openclaw/credentials/oauth.json`
  更多詳細資訊：[Security](/zh-Hant/gateway/security#credential-storage-map)。

## 更新（不破壞您的設定）

- 將 `~/.openclaw/workspace` 和 `~/.openclaw/` 視為「您的個人資料」；請勿將個人提示/配置放入 `openclaw` 存儲庫中。
- 更新原始碼：`git pull` + 您選擇的套件管理器安裝步驟（預設為 `pnpm install`；Bun 工作流程則為 `bun install`）+ 繼續使用相應的 `gateway:watch` 指令。

## Linux（systemd 使用者服務）

Linux 安裝使用 systemd **使用者** 服務。預設情況下，systemd 會在登出/閒置時停止使用者
服務，這會終止 Gateway。入座流程會嘗試為您啟用 linger（可能會提示輸入 sudo）。如果仍然關閉，請執行：

```bash
sudo loginctl enable-linger $USER
```

對於永遠線上或多使用者伺服器，請考慮使用 **system** 服務而不是 user 服務（不需要 lingering）。請參閱 [Gateway runbook](/zh-Hant/gateway) 瞭解 systemd 說明。

## 相關文件

- [Gateway runbook](/zh-Hant/gateway)（旗標、監控、連接埠）
- [Gateway configuration](/zh-Hant/gateway/configuration)（配置架構 + 範例）
- [Discord](/zh-Hant/channels/discord) 和 [Telegram](/zh-Hant/channels/telegram)（回覆標籤 + replyToMode 設定）
- [OpenClaw assistant setup](/zh-Hant/start/openclaw)
- [macOS app](/zh-Hant/platforms/macos)（gateway 生命週期）
