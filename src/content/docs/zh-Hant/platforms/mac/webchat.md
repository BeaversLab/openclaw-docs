---
summary: "Mac 應用程式如何嵌入 Gateway WebChat 以及如何進行除錯"
read_when:
  - Debugging mac WebChat view or loopback port
title: "WebChat (macOS)"
---

macOS 選單列應用程式將 WebChat UI 嵌入為原生的 SwiftUI 檢視。
它連線到 Gateway，並預設為所選 Agent 的 **主工作階段**（並提供切換至其他工作階段的切換器）。

- **本機模式**：直接連線到本機 Gateway WebSocket。
- **遠端模式**：透過 SSH 轉發 Gateway 控制埠，並使用該通道作為資料平面。

## 啟動與偵錯

- 手動：Lobster 選單 → 「Open Chat」。
- 測試用自動開啟：

  ```bash
  dist/OpenClaw.app/Contents/MacOS/OpenClaw --webchat
  ```

- 日誌：`./scripts/clawlog.sh` (subsystem `ai.openclaw`, category `WebChatSwiftUI`)。

## 連線方式

- 資料平面：Gateway WS 方法 `chat.history`、`chat.send`、`chat.abort`、
  `chat.inject` 以及事件 `chat`、`agent`、`presence`、`tick`、`health`。
- `chat.history` 會傳回經過正規化顯示的對話記錄行：內聯指令標籤會從可見文字中移除，純文字工具呼叫 XML 載荷
  （包含 `<tool_call>...</tool_call>`、
  `<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、
  `<function_calls>...</function_calls>` 和截斷的工具呼叫區塊）以及洩漏的 ASCII/全形模型控制權杖會被移除，純靜默權杖助理行（例如精確的 `NO_REPLY` / `no_reply`）會被省略，過大的行可以被預留文字取代。
- 工作階段：預設為主要工作階段（`main`，或當範圍為全域時的 `global`）。UI 可以在工作階段之間切換。
- 入門使用專用的工作階段，將首次執行設定分開。

## 安全表面

- 遠端模式僅透過 SSH 轉發 Gateway WebSocket 控制埠。

## 已知限制

- UI 已針對聊天工作階段進行最佳化（並非完整的瀏覽器沙箱）。

## 相關

- [WebChat](/zh-Hant/web/webchat)
- [macOS app](/zh-Hant/platforms/macos)
