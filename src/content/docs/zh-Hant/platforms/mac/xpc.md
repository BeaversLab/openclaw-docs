---
summary: "OpenClaw 應用程式、閘道節點傳輸及 PeekabooBridge 的 macOS IPC 架構"
read_when:
  - Editing IPC contracts or menu bar app IPC
title: "macOS IPC"
---

# OpenClaw macOS IPC 架構

**目前模型：** 本地 Unix socket 將 **節點主機服務 (node host service)** 連線到 **macOS 應用程式**，用於執行核准 + `system.run`。一個 `openclaw-mac` 除錯 CLI 用於探索/連線檢查；Agent 動作仍透過 Gateway WebSocket 和 `node.invoke` 流動。UI 自動化使用 PeekabooBridge。

## 目標

- 單一 GUI 應用程式實例，擁有所有面對 TCC 的工作（通知、螢幕錄製、麥克風、語音、AppleScript）。
- 小型的自動化介面：Gateway + 節點指令，加上 PeekabooBridge 用於 UI 自動化。
- 可預測的權限：始終使用相同的已簽名 Bundle ID，由 launchd 啟動，因此 TCC 授權會持續有效。

## 運作方式

### Gateway + node 傳輸

- 應用程式執行 Gateway（本地模式）並以節點身分連線至它。
- Agent 動作是透過 `node.invoke` 執行的（例如 `system.run`、`system.notify`、`canvas.*`）。

### Node 服務 + 應用程式 IPC

- 一個無介面的 node 主機服務會連線至 Gateway WebSocket。
- `system.run` 請求會透過本地 Unix socket 轉送至 macOS 應用程式。
- 應用程式會在 UI 語境中執行 exec，並在需要時進行提示，然後回傳輸出。

圖表 (SCI)：

```
Agent -> Gateway -> Node Service (WS)
                      |  IPC (UDS + token + HMAC + TTL)
                      v
                  Mac App (UI + TCC + system.run)
```

### PeekabooBridge（UI 自動化）

- UI 自動化使用名為 `bridge.sock` 的獨立 UNIX socket 以及 PeekabooBridge JSON 協定。
- 主機偏好順序（客戶端）：Peekaboo.app → Claude.app → OpenClaw.app → 本地執行。
- 安全性：橋接主機需要允許的 TeamID；僅限 DEBUG 的同 UID 逃生通道由 `PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1`（Peekaboo 約定）保護。
- 詳見：[PeekabooBridge 使用方式](/zh-Hant/platforms/mac/peekaboo)。

## 操作流程

- 重新啟動/重新建置：`SIGN_IDENTITY="Apple Development: <Developer Name> (<TEAMID>)" scripts/restart-mac.sh`
  - 終止現有實例
  - Swift 建置與打包
  - 寫入/引導/啟動 LaunchAgent
- 單一實例：如果另一個具有相同 Bundle ID 的實例正在運行，應用程式會提前退出。

## 加固說明

- 優先要求所有具有權限的介面都必須符合 TeamID。
- PeekabooBridge：`PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1`（僅限 DEBUG）可能允許同 UID 呼叫者進行本地開發。
- 所有通訊僅限本機；未暴露網路 Socket。
- TCC 提示僅來自 GUI 應用程式套件；在重新建置期間保持已簽署的 Bundle ID 穩定。
- IPC 加固：套接字模式 `0600`、令牌、同級 UID 檢查、HMAC 挑戰/回應、短 TTL。
