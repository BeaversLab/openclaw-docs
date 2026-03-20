---
summary: "macOS 上的 Gateway 執行時（外部 launchd 服務）"
read_when:
  - 封裝 OpenClaw.app
  - 偵錯 macOS gateway launchd 服務
  - 安裝 macOS 的 gateway CLI
title: "macOS 上的 Gateway"
---

# macOS 上的 Gateway（外部 launchd）

OpenClaw.app 不再內建 Node/Bun 或 Gateway 執行時。macOS app 預期安裝**外部** `openclaw` CLI，不會將 Gateway 作為子程序生成，而是管理一個每個使用者的 launchd 服務以保持 Gateway 運行（如果已經有本機 Gateway 在運行，則會連接至該 Gateway）。

## 安裝 CLI（本機模式所需）

Mac 上的預設執行時為 Node 24。目前的 `22.16+` 之 Node 22 LTS 仍可用於相容性。然後全域安裝 `openclaw`：

```bash
npm install -g openclaw@<version>
```

macOS app 的 **Install CLI** 按鈕會透過 npm/pnpm 執行相同的流程（不建議將 bun 用於 Gateway 執行時）。

## Launchd（Gateway 作為 LaunchAgent）

標籤：

- `ai.openclaw.gateway`（或 `ai.openclaw.<profile>`；舊版 `com.openclaw.*` 可能仍會保留）

Plist 位置（每個使用者）：

- `~/Library/LaunchAgents/ai.openclaw.gateway.plist`
  （或 `~/Library/LaunchAgents/ai.openclaw.<profile>.plist`）

管理員：

- macOS app 在本機模式中擁有 LaunchAgent 的安裝/更新權限。
- CLI 也可以安裝它：`openclaw gateway install`。

行為：

- 「OpenClaw Active」會啟用/停用 LaunchAgent。
- 結束 App **不會**停止 gateway（launchd 會讓它保持運行）。
- 如果 Gateway 已經在設定的連接埠上運行，app 將會連接至它，而不是啟動新的 Gateway。

日誌記錄：

- launchd stdout/err：`/tmp/openclaw/openclaw-gateway.log`

## 版本相容性

macOS app 會檢查 gateway 版本與其本身版本的相容性。如果彼此不相容，請更新全域 CLI 以符合 app 版本。

## 基本檢查

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

import en from "/components/footer/en.mdx";

<en />
