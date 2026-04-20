---
summary: "OpenClaw 應用程式、Gateway node 傳輸與 PeekabooBridge 的 macOS IPC 架構"
read_when:
  - Editing IPC contracts or menu bar app IPC
title: "macOS IPC"
---

# OpenClaw macOS IPC 架構

**目前模式：** 本地 Unix socket 將 **node host service** 連接到 **macOS app** 以進行執行核准 + `system.run`。存在 `openclaw-mac` 除錯 CLI 用於探索/連接檢查；Agent 動作仍通過 Gateway WebSocket 和 `node.invoke` 流動。UI 自動化使用 PeekabooBridge。

## 目標

- 單一 GUI 應用程式實例，處理所有與 TCC 相關的工作（通知、螢幕錄製、麥克風、語音、AppleScript）。
- 小型的自動化表面：Gateway + node 指令，以及 PeekabooBridge 用於 UI 自動化。
- 可預測的權限：始終是相同的已簽名 Bundle ID，由 launchd 啟動，因此 TCC 授權會持續有效。

## 運作方式

### Gateway + node 傳輸

- 應用程式執行 Gateway（本地模式）並以節點身分連接至它。
- Agent 動作通過 `node.invoke` 執行（例如 `system.run`、`system.notify`、`canvas.*`）。

### Node service + app IPC

- 無介面 node host service 連接到 Gateway WebSocket。
- `system.run` 請求通過本地 Unix socket 轉發到 macOS 應用程式。
- 應用程式在 UI 上下文中執行 exec，視需要提示，並返回輸出。

圖表 (SCI)：

```
Agent -> Gateway -> Node Service (WS)
                      |  IPC (UDS + token + HMAC + TTL)
                      v
                  Mac App (UI + TCC + system.run)
```

### PeekabooBridge (UI 自動化)

- UI 自動化使用一個名為 `bridge.sock` 的單獨 UNIX socket 和 PeekabooBridge JSON 協定。
- 主機偏好順序（客戶端）：Peekaboo.app → Claude.app → OpenClaw.app → 本地執行。
- 安全性：橋接主機需要允許的 TeamID；僅限 DEBUG 的同 UID 逃生艙由 `PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1` 保護（Peekaboo 慣例）。
- 參閱：[PeekabooBridge usage](/zh-Hant/platforms/mac/peekaboo) 了解詳情。

## 操作流程

- 重新啟動/重建：`SIGN_IDENTITY="Apple Development: <Developer Name> (<TEAMID>)" scripts/restart-mac.sh`
  - 終止現有實例
  - Swift 建置 + 打包
  - 寫入/引導/啟動 LaunchAgent
- 單一實例：如果另一個具有相同 Bundle ID 的實例正在運行，應用程式會提前退出。

## 加固注意事項

- 優先要求所有特權介面必須匹配 TeamID。
- PeekabooBridge：`PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1`（僅限 DEBUG）可能允許相同 UID 的呼叫端進行本機開發。
- 所有通訊僅限於本機；不會開放網路 socket。
- TCC 提示僅來自 GUI app bundle；請在重新建置時保持已簽署的 bundle ID 穩定。
- IPC 加固：socket 模式 `0600`、token、同級 UID 檢查、HMAC 挑戰/回應、短暫 TTL。
