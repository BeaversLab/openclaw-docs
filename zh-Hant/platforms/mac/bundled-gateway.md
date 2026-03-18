---
summary: "macOS 上的 Gateway 執行時（外部 launchd 服務）"
read_when:
  - Packaging OpenClaw.app
  - Debugging the macOS gateway launchd service
  - Installing the gateway CLI for macOS
title: "macOS 上的 Gateway"
---

# macOS 上的 Gateway（外部 launchd）

OpenClaw.app 不再捆綁 Node/Bun 或 Gateway 執行時。macOS 應用程式
期望安裝 **外部** `openclaw` CLI，不會將 Gateway 生成為
子進程，而是管理一個每使用者 launchd 服務以保持 Gateway
運行（如果已有本地 Gateway 正在運行，則連接至該進程）。

## 安裝 CLI（本地模式所需）

Mac 上的預設執行時為 Node 24。目前為 `22.16+` 的 Node 22 LTS 仍可用於相容性。然後全域安裝 `openclaw`：

```bash
npm install -g openclaw@<version>
```

macOS 應用程式的 **安裝 CLI** 按鈕透過 npm/pnpm 執行相同的流程（不建議將 bun 用於 Gateway 執行時）。

## Launchd（Gateway 作為 LaunchAgent）

標籤：

- `ai.openclaw.gateway` （或 `ai.openclaw.<profile>`；舊版 `com.openclaw.*` 可能會保留）

Plist 位置（每使用者）：

- `~/Library/LaunchAgents/ai.openclaw.gateway.plist`
  （或 `~/Library/LaunchAgents/ai.openclaw.<profile>.plist`）

管理器：

- macOS 應用程式負責在本地模式下安裝/更新 LaunchAgent。
- CLI 也可以安裝它：`openclaw gateway install`。

行為：

- 「OpenClaw Active」會啟用/停用 LaunchAgent。
- 結束應用程式 **不會** 停止 gateway（launchd 會使其保持運行）。
- 如果 Gateway 已在設定的連接埠上運行，應用程式將
  連接至它，而不是啟動新的進程。

日誌記錄：

- launchd stdout/err：`/tmp/openclaw/openclaw-gateway.log`

## 版本相容性

macOS 應用程式會檢查 gateway 版本與自身版本是否相符。如果它們
不相容，請更新全域 CLI 以符合應用程式版本。

## 冒煙測試

```bash
openclaw --version

OPENCLAW_SKIP_CHANNELS=1 \
OPENCLAW_SKIP_CANVAS_HOST=1 \
openclaw gateway --port 18999 --bind loopback
```

然後：

```bash
openclaw gateway call health --url ws://127.0.0.1:18999 --timeout 3000
```

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
