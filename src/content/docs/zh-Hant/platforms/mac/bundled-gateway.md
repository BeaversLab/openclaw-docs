---
summary: "macOS 上的 Gateway 運行時（外部 launchd 服務）"
read_when:
  - Packaging OpenClaw.app
  - Debugging the macOS gateway launchd service
  - Installing the gateway CLI for macOS
title: "macOS 上的 Gateway"
---

# macOS 上的 Gateway（外部 launchd）

OpenClaw.app 不再包含 Node/Bun 或 Gateway 運行時。macOS 應用程式需要一個**外部** `openclaw` CLI 安裝，不會生成 Gateway 作為子進程，並管理一個每用戶 launchd 服務以保持 Gateway 運行（如果本地已有 Gateway 在運行，則會連接到它）。

## 安裝 CLI（本機模式需要）

Mac 上的默認運行時是 Node 24。目前的 Node 22 LTS（`22.14+`）出於相容性仍然可用。然後全局安裝 `openclaw`：

```bash
npm install -g openclaw@<version>
```

macOS 應用程式的 **Install CLI** 按鈕會執行與應用程式內部相同的全域安裝流程：它優先使用 npm，然後是 pnpm，如果偵測到的套件管理器只有 bun，則使用 bun。Node 仍是建議的 Gateway 執行環境。

## Launchd（Gateway 作為 LaunchAgent）

標籤：

- `ai.openclaw.gateway`（或 `ai.openclaw.<profile>`；舊版 `com.openclaw.*` 可能仍存在）

Plist 位置（每用戶）：

- `~/Library/LaunchAgents/ai.openclaw.gateway.plist`
  （或 `~/Library/LaunchAgents/ai.openclaw.<profile>.plist`）

管理器：

- macOS 應用程式負責在本機模式下安裝/更新 LaunchAgent。
- CLI 也可以安裝它：`openclaw gateway install`。

行為：

- 「OpenClaw 啟用」會啟用/停用 LaunchAgent。
- 結束應用程式**不會**停止 gateway（launchd 會使其保持運行）。
- 如果 Gateway 已在配置的端口上運行，應用程式將連接到它，而不是啟動新的 Gateway。

日誌記錄：

- launchd stdout/err：`/tmp/openclaw/openclaw-gateway.log`

## 版本相容性

macOS 應用程式會檢查 gateway 版本與其自身版本是否匹配。如果不相容，請更新全局 CLI 以匹配應用程式版本。

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
