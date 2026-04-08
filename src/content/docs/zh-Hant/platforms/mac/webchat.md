---
summary: "Mac 應用程式如何嵌入 Gateway WebChat 以及如何進行除錯"
read_when:
  - Debugging mac WebChat view or loopback port
title: "WebChat (macOS)"
---

# WebChat (macOS 應用程式)

macOS 選單列應用程式將 WebChat UI 嵌入為原生的 SwiftUI 檢視。它
連接到 Gateway，並預設為所選 Agent 的 **主要工作階段**
（並提供切換至其他工作階段的切換器）。

- **本機模式**：直接連接到本機 Gateway WebSocket。
- **遠端模式**：透過 SSH 轉發 Gateway 控制埠，並將該
  通道作為資料平面。

## 啟動與除錯

- 手動：Lobster 選單 → 「Open Chat」。
- 用於測試的自動開啟：

  ```bash
  dist/OpenClaw.app/Contents/MacOS/OpenClaw --webchat
  ```

- 日誌：`./scripts/clawlog.sh` (subsystem `ai.openclaw`, category `WebChatSwiftUI`)。

## 運作方式

- 資料平面：Gateway WS 方法 `chat.history`、`chat.send`、`chat.abort`、
  `chat.inject` 以及事件 `chat`、`agent`、`presence`、`tick`、`health`。
- `chat.history` 傳回經過正規化顯示的對話記錄行：內聯指令標籤會從可見文字中移除，純文字工具呼叫 XML 載荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 以及截斷的工具呼叫區塊）和洩漏的 ASCII/全型模型控制權杖都會被移除，純靜音權杖的助理行（如完全一致的 `NO_REPLY` / `no_reply`）會被省略，且過大的行可以由預留位置取代。
- 工作階段：預設為主要工作階段（`main`，當範圍為全域時則為 `global`）。UI 可以在不同工作階段之間切換。
- 導覽使用專用的工作階段，以將首次執行設定分開。

## 安全範圍

- 遠端模式僅透過 SSH 轉送 Gateway WebSocket 控制埠。

## 已知限制

- UI 已針對聊天工作階段進行最佳化（而非完整的瀏覽器沙箱）。
