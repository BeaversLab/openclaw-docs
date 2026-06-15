---
summary: "Loopback WebChat 靜態主機與 Gateway WS 用於聊天 UI"
read_when:
  - Debugging or configuring WebChat access
title: "WebChat"
---

狀態：macOS/iOS SwiftUI 聊天 UI 直接與 Gateway WebSocket 通訊。

## 它是什麼

- 一個適用於 Gateway 的原生聊天 UI（無嵌入式瀏覽器，無本地靜態伺服器）。
- 使用與其他通道相同的會話和路由規則。
- 確定性路由：回覆始終返回到 WebChat。

## 快速開始

1. 啟動 Gateway。
2. 開啟 WebChat UI (macOS/iOS 應用程式) 或 Control UI 的聊天分頁。
3. 確保已設定有效的 Gateway 認證路徑 (預設為 shared-secret，
   即使在 loopback 上)。

## 運作方式 (行為)

- UI 連線到 Gateway WebSocket 並使用 `chat.history`、`chat.send` 和 `chat.inject`。
- `chat.history` 為了穩定性設有界限：Gateway 可能會截斷長文字欄位，省略繁重的元數據，並用 `[chat.history omitted: message too large]` 替換過大的項目。
- 當可見的助理訊息在 `chat.history` 中被截斷時，控制 UI 可以開啟側邊閱讀器，並透過 `chat.message.get` 按需獲取完整的顯示正規化條目，而不會增加預設的歷史記錄酬載。
- `chat.history` 會跟隨作用中的轉錄分支（針對現代僅附加的會話檔案），因此被放棄的重寫分支和被取代的提示副本不會在 WebChat 中呈現。
- 壓縮條目會呈現為明確的壓縮歷史記錄分隔線。該分隔線說明壓縮後的轉錄會作為檢查點保留，並連結至「工作階段」檢查點控制項，操作員可在權限允許的情況下，從該壓縮視圖建立分支或還原。
- 控制 UI 會記住由 `chat.history` 傳回的備份閘道 `sessionId`，並將其包含在後續的 `chat.send` 呼叫中，因此除非使用者啟動或重設會話，否則重新連線和頁面重新整理都會繼續同一個已儲存的對話。
- 控制 UI 會在產生新的 `chat.send` 執行 ID 之前，合併相同會話、訊息和附件的重複進行中提交；閘道仍會對重複使用相同冪等金鑰的重複請求進行去重。
- 工作區啟動檔案和待處理的 `BOOTSTRAP.md` 指令是透過代理人系統提示的專案內容提供，而非複製到 WebChat 使用者訊息中。啟動截斷僅會新增簡明的系統提示恢復通知；詳細計數和配置旋鈕保留在診斷介面上。
- `chat.history` 也會經過顯示正規化處理：僅限運行時的 OpenClaw 上下文、
  入站信封封裝器、內嵌傳遞指令標籤
  （如 `[[reply_to_*]]` 和 `[[audio_as_voice]]`）、純文字工具呼叫 XML
  載荷（包括 `<tool_call>...</tool_call>`、
  `<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、
  `<function_calls>...</function_calls>`，以及被截斷的工具呼叫區塊），以及
  外洩的 ASCII/全形模型控制權杖都會從可見文字中移除，
  且若助理條目的整體可見文字僅為精確的靜音
  權杖 `NO_REPLY` / `no_reply`，則會被省略。
- 標記為推理的回覆載荷（`isReasoning: true`）會從 WebChat 助理內容、逐字重播文字和音訊內容區塊中排除，因此純推理的載荷不會顯示為可見的助理訊息或可播放的音訊。
- `chat.inject` 會將助理註記直接附加到逐字紀錄並將其廣播至 UI（無需執行代理程式）。
- 中止的執行可讓部分的助理輸出保留在 UI 中可見。
- 當存在緩衝輸出時，Gateway 會將中止的部分助理文字保存到逐字紀錄歷史中，並以中止中繼資料標示這些項目。
- 歷史記錄總是從 Gateway 獲取（不監看本地檔案）。
- 如果無法連線到 Gateway，WebChat 將處於唯讀狀態。

### 逐字紀錄與傳遞模型

WebChat 有兩個獨立的資料路徑：

- 工作階段 JSONL 檔案是持久的模型/運行時逐字紀錄。對於一般的代理程式執行，內嵌的 OpenClaw 運行時會透過其工作階段管理器將模型可見的 `user`、`assistant` 和 `toolResult` 訊息保存下來。WebChat 不會將任意的傳遞、狀態或協助文字寫入該逐字紀錄中。
- Gateway `ReplyPayload` 事件是即時傳遞投影。它們可以針對 WebChat/通道顯示、區塊串流、指令標籤、媒體嵌入、TTS/音訊旗標以及 UI 退回行為進行正規化。它們本身並非正式的工作階段紀錄。
- 需要透過 `tools.message` 顯示回覆的 Harness 仍將 WebChat 作為當前運行的內部來源回覆接收器。來自該活躍 WebChat 運行的無目標 `message.send` 會被投影到同一個聊天中並鏡像到會話文字記錄；WebChat 不會變成可重複使用的出站通道，也從不繼承 `lastChannel`。
- 僅當 Gateway 在正常的嵌入式 Agent 輪次之外擁有顯示的訊息時，WebChat 才會插入 Assistant 文字記錄條目：`chat.inject`、非 Agent 指令回覆、已中止的部分輸出，以及由 WebChat 管理的媒體文字記錄補充內容。
- `chat.history` 讀取已儲存的會話文字記錄並套用 WebChat 顯示投影。如果在運行期間出現即時 Assistant 文字，但在重新載入歷史記錄後消失，請首先檢查原始 JSONL 是否包含該 Assistant 文字，然後檢查是否由 `chat.history` 投影將其剝離，再檢查 Control UI 的樂觀尾部合併是否已用持久化的快照取代了本機傳遞狀態。
- `chat.message.get` 使用與 `chat.history` 相同的文字記錄分支和顯示投影規則（包括活躍 Agent 範圍設定），但透過 `messageId` 鎖定單一文字記錄條目，並在無法傳回完整內容時傳回真實的不可用原因。

正常的 Agent 運行最終答案應該是持久的，因為嵌入式運行時會寫入 Assistant `message_end`。任何將已傳遞的最終 Payload 鏡像到文字記錄的後備機制，都必須首先避免重複嵌入式運行時已寫入的 Assistant 輪次。

## Control UI Agent 工具面板

- Control UI `/agents` 工具面板有兩個獨立的視圖：
  - **目前可用** 使用 `tools.effective(sessionKey=...)`，並顯示伺服器衍生的目前會庫存唯讀投影，包括核心、外掛、通道擁有以及已發現的 MCP 伺服器工具。
  - **工具組態** 使用 `tools.catalog`，並專注於設定檔、覆寫和目錄語意。
- 執行時可用性僅限於目前工作階段。在同一個代理程式上切換工作階段可能會改變
  **目前可用** 清單。如果已設定的 MCP 伺服器尚未連線，或自上次探索後有所變更，
  面板會顯示通知，而不是從讀取路徑無聲地啟動 MCP 傳輸。
- 設定編輯器並不代表執行時可用；有效存取仍遵循原則
  優先順序 (`allow`/`deny`、每個代理程式與提供者/通道覆寫)。

## 遠端使用

- 遠端模式會透過 SSH/Tailscale 建立通道傳輸閘道 WebSocket。
- 您不需要執行單獨的 WebChat 伺服器。

## 設定參考 (WebChat)

完整配置：[Configuration](/zh-Hant/gateway/configuration)

WebChat 沒有持續保存的配置區段。Gateway 使用內建的 `chat.history` 顯示限制；API 客戶端可以發送單次請求的 `maxChars` 來為單一 `chat.history` 呼叫覆寫此限制。舊版的 `channels.webchat` 和 `gateway.webchat` 配置已退役；請執行 `openclaw doctor --fix` 將其移除。

相關全域選項：

- `gateway.port`, `gateway.bind`：WebSocket 主機/埠。
- `gateway.auth.mode`, `gateway.auth.token`, `gateway.auth.password`：
  共用密鑰 WebSocket 驗證。
- `gateway.auth.allowTailscale`：當啟用時，瀏覽器控制 UI 的聊天分頁可以使用 Tailscale
  Serve 身份標頭。
- `gateway.auth.mode: "trusted-proxy"`：針對位於具備身份感知能力的 **非本地回環** 代理來源後方的瀏覽器客戶端，進行反向代理驗證（請參閱 [Trusted Proxy Auth](/zh-Hant/gateway/trusted-proxy-auth)）。
- `gateway.remote.url`, `gateway.remote.token`, `gateway.remote.password`：遠端 Gateway 目標。
- `session.*`：會話儲存和主金鑰預設值。

## 相關連結

- [Control UI](/zh-Hant/web/control-ui)
- [Dashboard](/zh-Hant/web/dashboard)
