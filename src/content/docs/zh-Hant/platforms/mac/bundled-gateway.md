---
summary: "macOS 上的 Gateway 運行時（外部 launchd 服務）"
read_when:
  - Packaging OpenClaw.app
  - Debugging the macOS gateway launchd service
  - Installing the gateway CLI for macOS
title: "macOS 上的 Gateway"
---

OpenClaw.app 不再打包 Node/Bun 或 Gateway 執行時期。macOS 應用程式
期望安裝 **外部** `openclaw` CLI，不會將 Gateway 作為
子程序生成，並管理每個使用者的 launchd 服務以保持 Gateway
運行（如果已有 Gateway 在本地運行，則會附加至其上）。

## 安裝 CLI（本地模式需要）

Node 24 是 Mac 上的預設執行時期。目前為 `22.14+` 的 Node 22 LTS
為了相容性仍然可以使用。然後全域安裝 `openclaw`：

```bash
npm install -g openclaw@<version>
```

macOS 應用程式的 **安裝 CLI** 按鈕會執行應用程式
內部使用的相同全域安裝流程：它優先使用 npm，其次是 pnpm，然後是 bun（如果這是唯一
偵測到的套件管理器）。Node 仍然是推薦的 Gateway 執行時期。

## Launchd (Gateway 作為 LaunchAgent)

標籤：

- `ai.openclaw.gateway` (或 `ai.openclaw.<profile>`；舊版 `com.openclaw.*` 可能仍存在)

Plist 位置（每個使用者）：

- `~/Library/LaunchAgents/ai.openclaw.gateway.plist`
  (或 `~/Library/LaunchAgents/ai.openclaw.<profile>.plist`)

管理員：

- macOS 應用程式在本地模式下擁有 LaunchAgent 的安裝/更新。
- CLI 也可以安裝它：`openclaw gateway install`。

行為：

- :「OpenClaw 啟用」會啟用/停用 LaunchAgent。
- 結束應用程式並**不會**停止 gateway (launchd 會使其保持運行)。
- 如果 Gateway 已在設定的連接埠上運行，應用程式會附加至
  它，而不是啟動一個新的。

日誌記錄：

- launchd stdout/err: `/tmp/openclaw/openclaw-gateway.log`

## 版本相容性

macOS 應用程式會檢查 gateway 版本與其自身版本是否一致。如果不
相容，請更新全域 CLI 以符合應用程式版本。

## 快速檢查

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

## 相關

- [macOS app](/zh-Hant/platforms/macos)
- [Gateway runbook](/zh-Hant/gateway)
