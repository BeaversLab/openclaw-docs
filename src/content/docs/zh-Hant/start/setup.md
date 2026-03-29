---
summary: "OpenClaw 進階設定與開發工作流程"
read_when:
  - Setting up a new machine
  - You want “latest + greatest” without breaking your personal setup
title: "設定"
---

# 設定

<Note>如果您是第一次設定，請從 [快速入門](/en/start/getting-started) 開始。若需了解入門詳情，請參閱 [入門 (CLI)](/en/start/wizard)。</Note>

## TL;DR

- **客製化位於 repo 之外：** `~/.openclaw/workspace` (工作區) + `~/.openclaw/openclaw.json` (設定)。
- **穩定工作流程：** 安裝 macOS 應用程式；讓它執行內建的 Gateway。
- **最新工作流程：** 透過 `pnpm gateway:watch` 自行執行 Gateway，然後讓 macOS 應用程式以本地模式 (Local mode) 連接。

## 先決條件 (從原始碼)

- 建議使用 Node 24 (Node 22 LTS，目前為 `22.14+`，仍支援)
- `pnpm`
- Docker (選用；僅用於容器化設定/e2e — 請參閱 [Docker](/en/install/docker))

## 客製化策略 (以免更新受影響)

如果您想要「100% 量身打造」_且_ 易於更新，請將您的客製化內容保留於：

- **設定：** `~/.openclaw/openclaw.json` (JSON/JSON5-ish)
- **工作區：** `~/.openclaw/workspace` (技能、提示、記憶；將其設為私人 git repo)

引導一次：

```bash
openclaw setup
```

在此 repo 內部，使用本機 CLI 入口：

```bash
openclaw setup
```

如果您尚未進行全域安裝，請透過 `pnpm openclaw setup` 執行。

## 從此 repo 執行 Gateway

在 `pnpm build` 之後，您可以直接執行打包的 CLI：

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
pnpm gateway:watch
```

`gateway:watch` 會以監看模式執行 gateway，並在相關的原始碼、
設定以及套件外掛程式中繼資料變更時重新載入。

### 2) 將 macOS 應用程式指向您執行中的 Gateway

在 **OpenClaw.app** 中：

- 連線模式：**Local**
  應用程式將會連接到在設定連接埠上執行中的 gateway。

### 3) 驗證

- 應用程式內的 Gateway 狀態應顯示 **“Using existing gateway …”**
- 或透過 CLI：

```bash
openclaw health
```

### 常見陷阱

- **錯誤連接埠：** Gateway WS 預設為 `ws://127.0.0.1:18789`；請保持應用程式與 CLI 在相同的連接埠。
- **狀態儲存位置：**
  - 憑證： `~/.openclaw/credentials/`
  - 工作階段： `~/.openclaw/agents/<agentId>/sessions/`
  - 日誌： `/tmp/openclaw/`

## 憑證儲存對應表

在除錯認證或決定要備份什麼時使用此表：

- **WhatsApp**: `~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
- **Telegram bot token**: config/env 或 `channels.telegram.tokenFile` (僅限一般檔案；不接受符號連結)
- **Discord bot token**: config/env 或 SecretRef (env/file/exec 提供者)
- **Slack tokens**: config/env (`channels.slack.*`)
- **配對允許清單**：
  - `~/.openclaw/credentials/<channel>-allowFrom.json` (預設帳戶)
  - `~/.openclaw/credentials/<channel>-<accountId>-allowFrom.json` (非預設帳戶)
- **Model auth profiles**: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- **檔案支援的秘密載荷 (可選)**: `~/.openclaw/secrets.json`
- **舊版 OAuth 匯入**: `~/.openclaw/credentials/oauth.json`
  更多細節： [安全性](/en/gateway/security#credential-storage-map)。

## 更新 (不破壞您的設定)

- 將 `~/.openclaw/workspace` 和 `~/.openclaw/` 視為「您的資料」；不要將個人提示詞/設定放入 `openclaw` repo 中。
- 更新原始碼： `git pull` + `pnpm install` (當鎖定檔變更時) + 繼續使用 `pnpm gateway:watch`。

## Linux (systemd 使用者服務)

Linux 安裝使用 systemd **使用者** 服務。預設情況下，systemd 會在登出/閒置時停止使用者
服務，這會終止 Gateway。入門流程會嘗試為您啟用
lingering (可能會提示輸入 sudo)。如果仍未啟用，請執行：

```bash
sudo loginctl enable-linger $USER
```

對於始終運行或多用戶伺服器，請考慮使用 **system** 服務而不是使用者服務（不需要 lingering）。有關 systemd 的說明，請參閱 [Gateway runbook](/en/gateway)。

## 相關文件

- [Gateway runbook](/en/gateway) （標誌、監控、連接埠）
- [Gateway configuration](/en/gateway/configuration) （配置結構 + 範例）
- [Discord](/en/channels/discord) 和 [Telegram](/en/channels/telegram) （回覆標籤 + replyToMode 設定）
- [OpenClaw assistant setup](/en/start/openclaw)
- [macOS app](/en/platforms/macos) （gateway 生命週期）
