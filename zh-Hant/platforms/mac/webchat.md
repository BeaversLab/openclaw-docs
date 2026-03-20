---
summary: "Mac 應用程式如何嵌入 Gateway WebChat 以及如何對其進行偵錯"
read_when:
  - 偵錯 Mac WebChat 檢視或回送連接埠
title: "WebChat (macOS)"
---

# WebChat (macOS 應用程式)

macOS 功能表列應用程式將 WebChat UI 嵌入為原生 SwiftUI 檢視。它
連線到 Gateway，並針對選取的代理程式預設為 **主工作階段**
（並提供其他工作階段的切換器）。

- **本機模式**：直接連接到本機 Gateway WebSocket。
- **遠端模式**：透過 SSH 轉發 Gateway 控制連接埠，並將該
  通道作為資料平面。

## 啟動與除錯

- 手動：Lobster 選單 → “Open Chat”。
- 測試用的自動開啟：

  ```bash
  dist/OpenClaw.app/Contents/MacOS/OpenClaw --webchat
  ```

- 日誌：`./scripts/clawlog.sh` (子系統 `ai.openclaw`，類別 `WebChatSwiftUI`)。

## 運作方式

- 資料平面：Gateway WS 方法 `chat.history`、`chat.send`、`chat.abort`、
  `chat.inject` 和事件 `chat`、`agent`、`presence`、`tick`、`health`。
- 工作階段：預設為主要工作階段 (`main`，或當範圍
  為全域時使用 `global`)。UI 可以在不同工作階段之間切換。
- Onboarding 使用專用的會話，以將首次執行設定分開。

## 安全表面

- 遠端模式僅透過 SSH 轉發 Gateway WebSocket 控制埠。

## 已知限制

- UI 已針對聊天會話最佳化 (而非完整的瀏覽器沙箱)。

import en from "/components/footer/en.mdx";

<en />
