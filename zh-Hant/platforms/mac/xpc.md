---
summary: "適用於 OpenClaw 應用程式、閘道節點傳輸和 PeekabooBridge 的 macOS IPC 架構"
read_when:
  - 編輯 IPC 合約或選單列應用程式 IPC
title: "macOS IPC"
---

# OpenClaw macOS IPC 架構

**目前模式：** 一個本地 Unix socket 將 **node host service** 連接到 **macOS app**，以進行執行核准 + `system.run`。存在一個 `openclaw-mac` 除錯 CLI 用於探索/連線檢查；代理程式動作仍透過 Gateway WebSocket 和 `node.invoke` 流動。UI 自動化使用 PeekabooBridge。

## 目標

- 單一 GUI 應用程式實例，擁有所有面向 TCC 的工作（通知、螢幕錄製、麥克風、語音、AppleScript）。
- 自動化的小表面：Gateway + node 命令，以及 PeekabooBridge 用於 UI 自動化。
- 可預測的權限：始終是相同的已簽名 bundle ID，由 launchd 啟動，因此 TCC 授權會保持不變。

## 運作方式

### Gateway + node 傳輸

- 該應用程式運行 Gateway（本地模式）並作為節點連接到它。
- 代理程式動作透過 `node.invoke` 執行（例如 `system.run`、`system.notify`、`canvas.*`）。

### Node service + app IPC

- 無頭 node host service 連接到 Gateway WebSocket。
- `system.run` 請求透過本地 Unix socket 轉送到 macOS 應用程式。
- 應用程式在 UI 上下文中執行 exec，必要時提示，並返回輸出。

圖表 (SCI)：

```
Agent -> Gateway -> Node Service (WS)
                      |  IPC (UDS + token + HMAC + TTL)
                      v
                  Mac App (UI + TCC + system.run)
```

### PeekabooBridge (UI 自動化)

- UI 自動化使用一個名為 `bridge.sock` 的獨立 UNIX socket 和 PeekabooBridge JSON 協定。
- 主機偏好順序（客戶端）：Peekaboo.app → Claude.app → OpenClaw.app → 本地執行。
- 安全性：橋接主機需要允許的 TeamID；僅限 DEBUG 的相同 UID 逃生艙門由 `PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1` 守護（Peekaboo 慣例）。
- 請參閱：[PeekabooBridge usage](/zh-Hant/platforms/mac/peekaboo) 以取得詳細資訊。

## 操作流程

- 重新啟動/重建：`SIGN_IDENTITY="Apple Development: <Developer Name> (<TEAMID>)" scripts/restart-mac.sh`
  - 終止現有實例
  - Swift 建構 + 打包
  - 寫入/引導/啟動 LaunchAgent
- 單一實例：如果另一個具有相同 bundle ID 的實例正在運行，應用程式會提前退出。

## 加固說明

- 在所有特權介面上，優先要求 TeamID 匹配。
- PeekabooBridge：`PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1`（僅限 DEBUG）可能允許相同 UID 的呼叫者進行本地開發。
- 所有通訊僅保持本機；不會暴露網路 socket。
- TCC 提示僅源自 GUI app bundle；請在重建期間保持已簽署的 bundle ID 穩定。
- IPC 強化：socket 模式 `0600`、權杖、對等 UID 檢查、HMAC 挑戰/回應、短暫的 TTL。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
