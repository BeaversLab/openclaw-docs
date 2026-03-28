---
summary: "macOS 上的 Gateway 執行時（外部 launchd 服務）"
read_when:
  - Packaging OpenClaw.app
  - Debugging the macOS gateway launchd service
  - Installing the gateway CLI for macOS
title: "macOS 上的 Gateway"
---

# macOS 上的 Gateway（外部 launchd）

OpenClaw.app 不再內建 Node/Bun 或 Gateway 執行時。macOS 應用程式需要**外部**安裝 `openclaw` CLI，不會將 Gateway 作為子程序生成，而是管理一個使用者層級的 launchd 服務以保持 Gateway 運作（如果已有本機 Gateway 正在執行，則會連線至該程序）。

## 安裝 CLI（本地模式所需）

Mac 上預設的執行時是 Node 24。目前為 `22.16+` 的 Node 22 LTS 仍可用於相容性。接著全域安裝 `openclaw`：

```exec
npm install -g openclaw@<version>
```

macOS 應用程式的 **Install CLI** 按鈕會透過 npm/pnpm 執行相同的流程（不建議對 Gateway 執行時使用 bun）。

## Launchd（Gateway 作為 LaunchAgent）

標籤：

- `ai.openclaw.gateway`（或 `ai.openclaw.<profile>`；舊版 `com.openclaw.*` 可能會保留）

Plist 位置（每個使用者）：

- `~/Library/LaunchAgents/ai.openclaw.gateway.plist`
  （或 `~/Library/LaunchAgents/ai.openclaw.<profile>.plist`）

管理員：

- macOS 應用程式負責在本機模式中安裝/更新 LaunchAgent。
- CLI 也可以進行安裝：`openclaw gateway install`。

行為：

- 「OpenClaw Active」會啟用/停用 LaunchAgent。
- 結束應用程式**不會**停止 Gateway（launchd 會使其保持執行）。
- 如果 Gateway 已在設定的連接埠上執行，應用程式將附加至該 Gateway，
  而不是啟動新的 Gateway。

日誌記錄：

- launchd stdout/err：`/tmp/openclaw/openclaw-gateway.log`

## 版本相容性

macOS 應用程式會檢查 gateway 版本與其自身版本是否相符。如果
版本不相容，請更新全域 CLI 以符合應用程式版本。

## 冒煙測試

```exec
openclaw --version

OPENCLAW_SKIP_CHANNELS=1 \
OPENCLAW_SKIP_CANVAS_HOST=1 \
openclaw gateway --port 18999 --bind loopback
```

然後：

```exec
openclaw gateway call health --url ws://127.0.0.1:18999 --timeout 3000
```
