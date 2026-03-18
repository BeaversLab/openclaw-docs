---
summary: "Mac 應用程式如何嵌入 Gateway WebChat 以及如何進行除錯"
read_when:
  - Debugging mac WebChat view or loopback port
title: "WebChat"
---

# WebChat (macOS 應用程式)

macOS 選單列應用程式將 WebChat UI 嵌入為原生的 SwiftUI 視圖。它會連接到 Gateway，並預設為所選 Agent 的 **主要會話** (並提供其他會話的切換器)。

- **本機模式**：直接連接到本機 Gateway WebSocket。
- **遠端模式**：透過 SSH 轉發 Gateway 控制埠，並將該通道用作資料平面。

## 啟動與除錯

- 手動：Lobster 選單 → “Open Chat”。
- 測試用的自動開啟：

  ```bash
  dist/OpenClaw.app/Contents/MacOS/OpenClaw --webchat
  ```

- 日誌：`./scripts/clawlog.sh` (subsystem `ai.openclaw`, category `WebChatSwiftUI`)。

## 連線方式

- 資料平面：Gateway WS 方法 `chat.history`、`chat.send`、`chat.abort`、
  `chat.inject` 和事件 `chat`、`agent`、`presence`、`tick`、`health`。
- 會話：預設為主要會話 (`main`，或當範圍為全域時為 `global`)。UI 可以在會話之間切換。
- Onboarding 使用專用的會話，以將首次執行設定分開。

## 安全表面

- 遠端模式僅透過 SSH 轉發 Gateway WebSocket 控制埠。

## 已知限制

- UI 已針對聊天會話最佳化 (而非完整的瀏覽器沙箱)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
