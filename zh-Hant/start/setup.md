---
summary: "OpenClaw 的進階設定與開發工作流程"
read_when:
  - 設定一台新機器
  - 您想要「最新且最強」的功能，且不破壞您現有的個人設定
title: "設定"
---

# 設定

<Note>
如果您是第一次進行設定，請從[入門指南](/zh-Hant/start/getting-started)開始。
關於入門細節，請參閱[入門 (CLI)](/zh-Hant/start/wizard)。
</Note>

最後更新：2026-01-01

## 太長不看

- **客製化設定位於 repo 之外：** `~/.openclaw/workspace` (工作區) + `~/.openclaw/openclaw.json` (設定)。
- **穩定工作流程：** 安裝 macOS 應用程式；讓它執行內建的 Gateway。
- **最新工作流程：** 透過 `pnpm gateway:watch` 自行執行 Gateway，然後讓 macOS 應用程式以本機模式連接。

## 先決條件 (從原始碼)

- Node `>=22`
- `pnpm`
- Docker（選用；僅用於容器化設定/e2e — 請參閱 [Docker](/zh-Hant/install/docker)）

## 調整策略（以便更新不會造成影響）

如果您想要「100% 為我量身打造」_並_能輕鬆更新，請將您的自訂設定保持在：

- **Config：** `~/.openclaw/openclaw.json`（JSON/JSON5-ish 格式）
- **Workspace：** `~/.openclaw/workspace`（技能、提示、記憶；將其設為私有的 git repo）

一次性引導：

```bash
openclaw setup
```

在此 repo 內部，使用本機 CLI 入口點：

```bash
openclaw setup
```

如果您尚未進行全域安裝，請透過 `pnpm openclaw setup` 執行它。

## 從此 repo 執行 Gateway

在 `pnpm build` 之後，您可以直接執行打包好的 CLI：

```bash
node openclaw.mjs gateway --port 18789 --verbose
```

## 穩定工作流程（優先使用 macOS 應用程式）

1. 安裝並啟動 **OpenClaw.app**（選單列）。
2. 完成入門/權限檢查清單（TCC 提示）。
3. 確保 Gateway 為 **Local** 且正在執行中（由應用程式管理）。
4. 連結介面（範例：WhatsApp）：

```bash
openclaw channels login
```

5. 完整性檢查：

```bash
openclaw health
```

如果您的版本中無法使用入門引導：

- 執行 `openclaw setup`，然後 `openclaw channels login`，接著手動啟動 Gateway（`openclaw gateway`）。

## 最新工作流程（在終端機中執行 Gateway）

目標：開發 TypeScript Gateway，取得熱重載（hot reload），並保持與 macOS 應用程式 UI 的連線。

### 0) （選用）從原始碼執行 macOS 應用程式

如果您也想要 macOS 應用程式處於最新狀態：

```bash
./scripts/restart-mac.sh
```

### 1) 啟動開發版 Gateway

```bash
pnpm install
pnpm gateway:watch
```

`gateway:watch` 會在監看模式下執行 gateway，並在相關的原始碼、
設定值以及打包外掛的中繼資料變更時重新載入。

### 2) 指向 macOS 應用程式至您執行中的 Gateway

在 **OpenClaw.app** 中：

- 連線模式：**Local**
  應用程式將會連線至設定埠上執行中的 gateway。

### 3) 驗證

- 應用程式內的 Gateway 狀態應顯示 **「Using existing gateway …」**
- 或透過 CLI：

```bash
openclaw health
```

### 常見陷阱

- **錯誤的連接埠：** Gateway WS 預設為 `ws://127.0.0.1:18789`；請保持 app + CLI 在同一個連接埠。
- **狀態儲存位置：**
  - 憑證：`~/.openclaw/credentials/`
  - Sessions：`~/.openclaw/agents/<agentId>/sessions/`
  - 日誌：`/tmp/openclaw/`

## 憑證儲存對應表

在除錯認證或決定要備份什麼時使用此對應表：

- **WhatsApp**：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
- **Telegram bot token**：config/env 或 `channels.telegram.tokenFile`（僅限一般檔案；拒絕符號連結）
- **Discord bot token**：config/env 或 SecretRef（env/file/exec 提供者）
- **Slack tokens**：config/env（`channels.slack.*`）
- **配對允許清單**：
  - `~/.openclaw/credentials/<channel>-allowFrom.json`（預設帳戶）
  - `~/.openclaw/credentials/<channel>-<accountId>-allowFrom.json`（非預設帳戶）
- **Model auth profiles**：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- **File-backed secrets payload (optional)**: `~/.openclaw/secrets.json`
- **Legacy OAuth import**: `~/.openclaw/credentials/oauth.json`
  More detail: [Security](/zh-Hant/gateway/security#credential-storage-map).

## Updating (without wrecking your setup)

- Keep `~/.openclaw/workspace` and `~/.openclaw/` as “your stuff”; don’t put personal prompts/config into the `openclaw` repo.
- Updating source: `git pull` + `pnpm install` (when lockfile changed) + keep using `pnpm gateway:watch`.

## Linux (systemd user service)

Linux installs use a systemd **user** service. By default, systemd stops user
services on logout/idle, which kills the Gateway. Onboarding attempts to enable
lingering for you (may prompt for sudo). If it’s still off, run:

```bash
sudo loginctl enable-linger $USER
```

對於全天候運行或多用戶伺服器，請考慮使用 **系統** 服務而非使用者服務（無需 lingering）。請參閱 [Gateway runbook](/zh-Hant/gateway) 瞭解 systemd 相關說明。

## 相關文件

- [Gateway runbook](/zh-Hant/gateway) (flags, supervision, ports)
- [Gateway configuration](/zh-Hant/gateway/configuration) (config schema + examples)
- [Discord](/zh-Hant/channels/discord) 和 [Telegram](/zh-Hant/channels/telegram) (reply tags + replyToMode settings)
- [OpenClaw assistant setup](/zh-Hant/start/openclaw)
- [macOS app](/zh-Hant/platforms/macos) (gateway lifecycle)

import en from "/components/footer/en.mdx";

<en />
