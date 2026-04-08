---
summary: "Loopback WebChat 靜態主機與 Gateway WS 用於聊天 UI"
read_when:
  - Debugging or configuring WebChat access
title: "WebChat"
---

# WebChat (Gateway WebSocket UI)

狀態：macOS/iOS SwiftUI 聊天 UI 直接與 Gateway WebSocket 通訊。

## 它是什麼

- Gateway 的原生聊天 UI（無嵌入式瀏覽器且無本地靜態伺服器）。
- 使用與其他通道相同的會話和路由規則。
- 確定性路由：回覆始終會發送回 WebChat。

## 快速入門

1. 啟動 gateway。
2. 開啟 WebChat UI (macOS/iOS 應用程式) 或 Control UI 的聊天分頁。
3. 確保已設定有效的 gateway auth path（預設為 shared-secret，即使在 loopback 上）。

## 運作方式 (行為)

- UI 連接到 Gateway WebSocket 並使用 `chat.history`、`chat.send` 和 `chat.inject`。
- `chat.history` 為了穩定性而有邊界限制：Gateway 可能會截斷長文字欄位、省略繁重的元數據，並將過大的項目替換為 `[chat.history omitted: message too large]`。
- `chat.history` 會經過顯示正規化處理：例如 `[[reply_to_*]]` 和 `[[audio_as_voice]]` 等內聯傳遞指令標籤、純文字工具呼叫 XML 載荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 和截斷的工具呼叫區塊），以及洩漏的 ASCII/全形模型控制權杖都會從可見文字中移除。此外，若助手條目的整個可見文字僅為確切的靜音權杖 `NO_REPLY` / `no_reply`，則會被省略。
- `chat.inject` 會將助手註解直接附加到紀錄中並廣播至 UI（不執行代理程式）。
- 中止的執行可讓部分助手輸出保持可見於 UI 中。
- 當存在緩衝輸出時，Gateway 會將中止的部分助手文字保存至紀錄歷史，並為這些條目標記中止中繼資料。
- 歷史紀錄總是從 gateway 取得（不監看本機檔案）。
- 若無法連線至 gateway，WebChat 將為唯讀狀態。

## Control UI agents tools panel

- Control UI `/agents` 工具面板有兩個不同的檢視：
  - **Available Right Now** 使用 `tools.effective(sessionKey=...)` 並顯示目前階段作業在執行階段實際可使用的內容，包括核心、外掛程式和通道擁有的工具。
  - **Tool Configuration** 使用 `tools.catalog` 並專注於設定檔、覆寫和目錄語意。
- 執行階段可用性是以階段作業為範圍。在同一個代理程式上切換階段作業可能會改變 **Available Right Now** 列表。
- 設定編輯器並不代表執行階段可用性；有效存取仍遵循政策優先順序（`allow`/`deny`、每個代理程式和提供者/通道覆寫）。

## Remote use

- 遠端模式會透過 SSH/Tailscale 建立隧道連接至 gateway WebSocket。
- 您不需要執行個別的 WebChat 伺服器。

## Configuration reference (WebChat)

完整設定：[Configuration](/en/gateway/configuration)

WebChat 選項：

- `gateway.webchat.chatHistoryMaxChars`：`chat.history` 回應中文字欄位的最大字元數。當文字紀錄項目超過此限制時，Gateway 會截斷長文字欄位，並可能用預留位置替換過大的訊息。用戶端也可以傳送每次請求的 `maxChars`，以覆寫單一 `chat.history` 呼叫的此預設值。

相關的全域選項：

- `gateway.port`、`gateway.bind`：WebSocket 主機/連接埠。
- `gateway.auth.mode`、`gateway.auth.token`、`gateway.auth.password`：
  共用金鑰 WebSocket 認證。
- `gateway.auth.allowTailscale`：啟用時，瀏覽器 Control UI 聊天分頁可以使用 Tailscale
  Serve 標頭檔。
- `gateway.auth.mode: "trusted-proxy"`：針對位於具備身分感知能力**非本地回傳** proxy 來源後方的瀏覽器用戶端進行反向 proxy 認證（請參閱 [Trusted Proxy Auth](/en/gateway/trusted-proxy-auth)）。
- `gateway.remote.url`、`gateway.remote.token`、`gateway.remote.password`：遠端閘道目標。
- `session.*`：會話儲存和主要金鑰預設值。
