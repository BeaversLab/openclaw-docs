---
summary: "OpenClaw 的進階設定與開發工作流程"
read_when:
  - Setting up a new machine
  - You want “latest + greatest” without breaking your personal setup
title: "設定"
---

# 設定

<Note>
  如果您是第一次進行設定，請從 [快速入門](/zh-Hant/start/getting-started) 開始。
  如需關於入職的詳細資訊，請參閱 [Onboarding (CLI)](/zh-Hant/start/wizard)。
</Note>

## TL;DR

- **客製化設定位於 repo 之外：** `~/.openclaw/workspace` (workspace) + `~/.openclaw/openclaw.json` (config)。
- **穩定工作流程：** 安裝 macOS 應用程式；讓它執行內建的 Gateway。
- **最新工作流程：** 透過 `pnpm gateway:watch` 自己執行 Gateway，然後讓 macOS 應用程式以本機模式連線。

## 先決條件 (從原始碼)

- 建議使用 Node 24 (Node 22 LTS，目前為 `22.16+`，仍受支援)
- `pnpm`
- Docker (選用；僅適用於容器化設定/e2e — 請參閱 [Docker](/zh-Hant/install/docker))

## 客製化策略 (讓更新不會造成影響)

如果您想要「完全為我量身打造」_且_ 易於更新，請將您的客製化設定保持在：

- **設定：** `~/.openclaw/openclaw.json` (JSON/JSON5-ish)
- **工作區：** `~/.openclaw/workspace` (技能、提示詞、記憶；將其設為私人 git repo)

啟動一次：

```bash
openclaw setup
```

在該 repo 內部，使用本機 CLI 入口點：

```bash
openclaw setup
```

如果您尚未進行全域安裝，請透過 `pnpm openclaw setup` 執行它。

## 從此 repo 執行 Gateway

在 `pnpm build` 之後，您可以直接執行打包後的 CLI：

```bash
node openclaw.mjs gateway --port 18789 --verbose
```

## 穩定工作流程 (macOS 應用程式優先)

1. 安裝並啟動 **OpenClaw.app** (選單列)。
2. 完成入職/權限檢查清單 (TCC 提示)。
3. 確保 Gateway 處於 **Local** 模式並正在執行 (由應用程式管理)。
4. 連結介面 (例如：WhatsApp)：

```bash
openclaw channels login
```

5. 完整性檢查：

```bash
openclaw health
```

如果您使用的版本沒有入職功能：

- 執行 `openclaw setup`，然後 `openclaw channels login`，接著手動啟動 Gateway (`openclaw gateway`)。

## 最新工作流程 (在終端機中執行 Gateway)

目標：開發 TypeScript Gateway，取得熱重載，並保持 macOS 應用程式 UI 連線。

### 0) (選用) 同時從原始碼執行 macOS 應用程式

如果您也讓 macOS 應用程式保持在最新狀態：

```bash
./scripts/restart-mac.sh
```

### 1) 啟動開發版 Gateway

```bash
pnpm install
pnpm gateway:watch
```

`gateway:watch` 會以監視模式運行網關，並在相關的原始碼、
設定和打包外掛元數據變更時重新載入。

### 2) 將 macOS 應用程式指向您正在運行的 Gateway

在 **OpenClaw.app** 中：

- 連線模式：**Local**
  應用程式將連線至在設定連接埠上運行的網關。

### 3) 驗證

- 應用程式內的 Gateway 狀態應顯示 **「Using existing gateway …」**
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

除錯認證或決定要備份什麼時請使用此資訊：

- **WhatsApp**： `~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
- **Telegram 機器人權杖**： config/env 或 `channels.telegram.tokenFile` （僅限一般檔案；拒絕符號連結）
- **Discord 機器人權杖**： config/env 或 SecretRef （env/file/exec 提供者）
- **Slack 權杖**： config/env （`channels.slack.*`）
- **配對允許清單**：
  - `~/.openclaw/credentials/<channel>-allowFrom.json` （預設帳戶）
  - `~/.openclaw/credentials/<channel>-<accountId>-allowFrom.json` （非預設帳戶）
- **模型認證設定檔**： `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- **檔案支援的秘密負載（可選）**： `~/.openclaw/secrets.json`
- **舊版 OAuth 匯入**： `~/.openclaw/credentials/oauth.json`
  更多詳細資訊： [Security](/zh-Hant/gateway/security#credential-storage-map)。

## 更新（不破壞您的設定）

- 將 `~/.openclaw/workspace` 和 `~/.openclaw/` 視為「您的私人檔案」；不要將個人的提示/設定放入 `openclaw` 存儲庫中。
- 更新原始碼： `git pull` + `pnpm install` （當鎖定檔變更時） + 繼續使用 `pnpm gateway:watch`。

## Linux （systemd 使用者服務）

Linux 安裝使用 systemd **使用者** 服務。預設情況下，systemd 會在登出/閒置時停止使用者
服務，這會終止 Gateway。入門程序會嘗試為您啟用
駐留功能（可能會提示輸入 sudo）。如果仍然關閉，請執行：

```bash
sudo loginctl enable-linger $USER
```

對於全天候運行或多使用者伺服器，請考慮使用 **system** 服務而非使用者服務（無需 linger）。請參閱 [Gateway runbook](/zh-Hant/gateway) 了解 systemd 相關說明。

## 相關文件

- [Gateway runbook](/zh-Hant/gateway) (flags, supervision, ports)
- [Gateway configuration](/zh-Hant/gateway/configuration) (config schema + examples)
- [Discord](/zh-Hant/channels/discord) 和 [Telegram](/zh-Hant/channels/telegram) (reply tags + replyToMode settings)
- [OpenClaw assistant setup](/zh-Hant/start/openclaw)
- [macOS app](/zh-Hant/platforms/macos) (gateway lifecycle)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
