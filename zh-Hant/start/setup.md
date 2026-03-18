---
summary: "OpenClaw 的進階設定與開發工作流程"
read_when:
  - Setting up a new machine
  - You want “latest + greatest” without breaking your personal setup
title: "設定"
---

# 設定

<Note>
  如果您是第一次設定，請從 [入門指南](/zh-Hant/start/getting-started) 開始。 若需入門詳情，請參閱
  [入門 (CLI)](/zh-Hant/start/wizard)。
</Note>

最後更新：2026-01-01

## TL;DR

- **客製化設定位於 repo 之外：** `~/.openclaw/workspace` (工作區) + `~/.openclaw/openclaw.json` (設定)。
- **穩定工作流程：** 安裝 macOS 應用程式；讓它執行內建的 Gateway。
- **最新鋭工作流程：** 透過 `pnpm gateway:watch` 自行執行 Gateway，然後讓 macOS 應用程式以本地模式連接。

## 先決條件 (從原始碼)

- Node `>=22`
- `pnpm`
- Docker (選用；僅用於容器化設定/e2e — 請參閱 [Docker](/zh-Hant/install/docker))

## 客製化策略 (讓更新不會造成問題)

如果您想要「100% 為我量身打造」_同時_ 又能輕鬆更新，請將您的客製化設定保留在：

- **設定：** `~/.openclaw/openclaw.json` (JSON/JSON5-ish)
- **工作區：** `~/.openclaw/workspace` (技能、提示、記憶；將其設為私人 git repo)

引導一次：

```bash
openclaw setup
```

在此 repo 內部，使用本機 CLI 入口點：

```bash
openclaw setup
```

如果您尚未進行全域安裝，請透過 `pnpm openclaw setup` 執行它。

## 從此 repo 執行 Gateway

在 `pnpm build` 之後，您可以直接執行打包的 CLI：

```bash
node openclaw.mjs gateway --port 18789 --verbose
```

## 穩定工作流程 (優先使用 macOS 應用程式)

1. 安裝並啟動 **OpenClaw.app** (選單列)。
2. 完成入門/權限檢查清單 (TCC 提示)。
3. 確保 Gateway 處於 **Local** (本地) 並正在執行中 (由應用程式管理)。
4. 連接介面 (例如：WhatsApp)：

```bash
openclaw channels login
```

5. 健全性檢查：

```bash
openclaw health
```

如果您的版本中無法使用入門功能：

- 執行 `openclaw setup`，然後 `openclaw channels login`，接著手動啟動 Gateway (`openclaw gateway`)。

## 最新鋭工作流程 (在終端機中執行 Gateway)

目標：開發 TypeScript Gateway、獲得熱重載，並保持 macOS 應用程式 UI 已連接。

### 0) (選用) 也從原始碼執行 macOS 應用程式

如果您也想要 macOS 應用程式使用最新鋭版本：

```bash
./scripts/restart-mac.sh
```

### 1) 啟動開發 Gateway

```bash
pnpm install
pnpm gateway:watch
```

`gateway:watch` 會以監視模式執行 gateway，並在相關的原始碼、
設定或外掛程式元資料變更時重新載入。

### 2) 指向 macOS 應用程式至您執行中的 Gateway

在 **OpenClaw.app** 中：

- 連線模式：**Local**
  應用程式將會連接到設定連接埠上執行中的 gateway。

### 3) 驗證

- 應用程式內的 Gateway 狀態應顯示 **“Using existing gateway …”**
- 或透過 CLI：

```bash
openclaw health
```

### 常見陷阱

- **錯誤連接埠：** Gateway WS 預設為 `ws://127.0.0.1:18789`；請保持應用程式與 CLI 使用相同的連接埠。
- **狀態儲存位置：**
  - 憑證： `~/.openclaw/credentials/`
  - 工作階段： `~/.openclaw/agents/<agentId>/sessions/`
  - 日誌： `/tmp/openclaw/`

## 憑證儲存對應表

當除錯認證或決定要備份什麼時，請參考此表：

- **WhatsApp**: `~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
- **Telegram bot token**: config/env 或 `channels.telegram.tokenFile` (僅限一般檔案；不接受符號連結)
- **Discord bot token**: config/env 或 SecretRef (env/file/exec 提供者)
- **Slack tokens**: config/env (`channels.slack.*`)
- **配對允許清單**：
  - `~/.openclaw/credentials/<channel>-allowFrom.json` (預設帳戶)
  - `~/.openclaw/credentials/<channel>-<accountId>-allowFrom.json` (非預設帳戶)
- **Model auth profiles**: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- **檔案支援的 secrets 載荷 (可選)**: `~/.openclaw/secrets.json`
- **舊版 OAuth 匯入**: `~/.openclaw/credentials/oauth.json`
  更多細節： [Security](/zh-Hant/gateway/security#credential-storage-map)。

## 更新 (不破壞您的設定)

- 將 `~/.openclaw/workspace` 和 `~/.openclaw/` 視為「您的資料」；不要將個人提示詞/設定放入 `openclaw` repo 中。
- 更新原始碼： `git pull` + `pnpm install` (當 lockfile 變更時) + 繼續使用 `pnpm gateway:watch`。

## Linux (systemd 使用者服務)

Linux 安裝使用 systemd **使用者** 服務。預設情況下，systemd 會在使用者登出/閒置時停止使用者
服務，這會終止 Gateway。Onboarding 會嘗試為您啟用
lingering (可能會提示輸入 sudo)。如果仍然關閉，請執行：

```bash
sudo loginctl enable-linger $USER
```

對於永久運行或多用戶伺服器，請考慮使用 **system** 服務而非用戶服務（不需要 lingering）。請參閱 [Gateway runbook](/zh-Hant/gateway) 瞭解 systemd 注意事項。

## 相關文件

- [Gateway runbook](/zh-Hant/gateway) (flags, supervision, ports)
- [Gateway configuration](/zh-Hant/gateway/configuration) (config schema + examples)
- [Discord](/zh-Hant/channels/discord) 和 [Telegram](/zh-Hant/channels/telegram) (reply tags + replyToMode settings)
- [OpenClaw assistant setup](/zh-Hant/start/openclaw)
- [macOS app](/zh-Hant/platforms/macos) (gateway lifecycle)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
