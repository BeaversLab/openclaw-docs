---
summary: "macOS 上的 Gateway 運行時（外部 launchd 服務）"
read_when:
  - Packaging OpenClaw.app
  - Debugging the macOS gateway launchd service
  - Installing the gateway CLI for macOS
title: "macOS 上的 Gateway"
---

OpenClaw.app 不再隨附 Node/Bun 或 Gateway 執行時。macOS 應用程式
預期安裝 **外部** 的 `openclaw` CLI，不會將 Gateway 作為
子程序生成，而是管理一個使用者層級的 launchd 服務以保持 Gateway
運行（如果已有本機 Gateway 在運行，則會連線至該程序）。

## 安裝 CLI（本地模式需要）

Mac 上的預設執行時是 Node 24。目前的 `22.16+` Node 22 LTS
基於相容性仍然可用。然後全域安裝 `openclaw`：

```bash
npm install -g openclaw@<version>
```

macOS 應用程式的 **Install CLI** 按鈕會執行與應用程式內部使用相同的
全域安裝流程：它優先使用 npm，然後是 pnpm，如果 bun 是唯一
偵測到的套件管理器則使用它。Node 仍然是推薦的 Gateway 執行時。

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

- "OpenClaw Active" 會啟用/停用 LaunchAgent。
- 結束應用程式並**不會**停止 gateway (launchd 會使其保持運行)。
- 如果 Gateway 已在設定的連接埠上運行，應用程式會附加至
  它，而不是啟動一個新的。

日誌記錄：

- launchd stdout: `~/Library/Logs/openclaw/gateway.log`（設定檔使用 `gateway-<profile>.log`）
- launchd stderr：已抑制

## 版本相容性

macOS 應用程式會檢查 gateway 版本是否與其自身版本相符。如果不相容，請更新全域 CLI 以符合應用程式版本。

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

## 相關

- [macOS 應用程式](/zh-Hant/platforms/macos)
- [Gateway 操作手冊](/zh-Hant/gateway)
