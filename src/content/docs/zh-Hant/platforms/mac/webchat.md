---
summary: "macOS 應用程式如何嵌入 Gateway WebChat 以及如何進行除錯"
read_when:
  - Debugging mac WebChat view or loopback port
title: "WebChat (macOS)"
---

# WebChat (macOS 應用程式)

macOS 功能表列應用程式將 WebChat UI 嵌入為原生 SwiftUI 檢視。它會連線到 Gateway，並預設為所選代理程式的 **主工作階段**（並提供其他工作階段的切換器）。

- **本機模式**：直接連線到本機 Gateway WebSocket。
- **遠端模式**：透過 SSH 轉送 Gateway 控制連接埠，並將該通道用作資料平面。

## 啟動與除錯

- 手動：Lobster 選單 → 「Open Chat」。
- 測試時自動開啟：

  ```exec
  dist/OpenClaw.app/Contents/MacOS/OpenClaw --webchat
  ```

- 日誌：`./scripts/clawlog.sh` (subsystem `ai.openclaw`, category `WebChatSwiftUI`)。

## 連線方式

- 數據平面：Gateway WebSocket 方法 `chat.history`、`chat.send`、`chat.abort`、
  `chat.inject` 和事件 `chat`、`agent`、`presence`、`tick`、`health`。
- 會話：默認為主會話（`main`，或在範圍為
  全局時使用 `global`）。UI 可以在會話之間切換。
- 入職使用專用會話以將首次運行設置分開。

## 安全表面

- 遠程模式僅通過 SSH 轉發 Gateway WebSocket 控制端口。

## 已知限制

- UI 已針對聊天會話進行優化（而非完整的瀏覽器沙箱）。
