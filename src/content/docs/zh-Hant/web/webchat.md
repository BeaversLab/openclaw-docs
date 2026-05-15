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
- `chat.history` 遵循現代僅追加會話檔案的作用中抄錄分支，因此被放棄的重寫分支和被取代的提示副本不會在 WebChat 中呈現。
- 壓縮條目會呈現為明確的壓縮歷史分隔線。分隔線說明較早的輪次已保留在檢查點中，並連結到 Sessions 檢查點控制項，操作員可在權限允許時從中分支或還原壓縮前的檢視。
- Control UI 會記住 `chat.history` 傳回的後端 Gateway `sessionId`，並將其包含在後續的 `chat.send` 呼叫中，因此除非使用者啟動或重置會話，否則重新連線和重新整理頁面都會繼續相同的儲存對話。
- Control UI 會在產生新的 `chat.send` 執行 ID 之前，針對相同的會話、訊息和附件合併重複的進中提交；Gateway 仍會對重複使用相同等冪性金鑰的重複請求進行去重。
- 工作區啟動檔案和待處理的 `BOOTSTRAP.md` 指令是透過代理程式系統提示詞的專案內容提供，而非複製到 WebChat 使用者訊息中。啟動截斷僅會新增簡潔的系統提示詞復原通知；詳細計數和設定旋鈕則保留在診斷介面上。
- `chat.history` 也經過顯示正規化處理：僅限執行時的 OpenClaw 內容、
  传入信封包裝器、行內傳遞指令標籤
  （例如 `[[reply_to_*]]` 和 `[[audio_as_voice]]`）、純文字工具呼叫 XML
  載荷（包括 `<tool_call>...</tool_call>`、
  `<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、
  `<function_calls>...</function_calls>` 以及被截斷的工具呼叫區塊），以及
  外洩的 ASCII/全形模型控制權杖都會從可見文字中移除，
  且若助手條目的整個可見文字僅為確切的靜默
  權杖 `NO_REPLY` / `no_reply`，則會被省略。
- 標記為推理的回覆載荷（`isReasoning: true`）會從 WebChat 助手內容、抄錄重播文字和音訊內容區塊中排除，因此僅限思考的載荷不會顯示為可見的助手訊息或可播放的音訊。
- `chat.inject` 會將助理註釋直接附加到對話紀錄並廣播到 UI（不執行代理程式運行）。
- 已中止的運行可讓部分助理輸出在 UI 中保持可見。
- 當存在緩衝輸出時，Gateway 會將已中止的部分助理文字持久化到對話紀錄歷史中，並用中止元資料標記這些條目。
- 歷史紀錄總是從 Gateway 獲取（不監看本地檔案）。
- 如果無法連線到 Gateway，WebChat 將處於唯讀狀態。

### 對話紀錄與傳遞模型

WebChat 有兩條獨立的資料路徑：

- Session JSONL 檔案是持久的模型/運行時對話紀錄。對於正常的代理程式運行，Pi 透過其會話管理器將模型可見的 `user`、`assistant` 和 `toolResult` 訊息持久化。WebChat 不會將任意的傳遞、狀態或協助文字寫入該對話紀錄中。
- Gateway `ReplyPayload` 事件是即時傳遞投影。它們可以針對 WebChat/頻道顯示、區塊串流、指令標籤、媒體嵌入、TTS/音訊標誌和 UI 後援行為進行正規化。它們本身不是規範的會話日誌。
- 只有當 Gateway 在正常的 Pi 助理回合之外擁有顯示的訊息時，WebChat 才會注入助理對話紀錄條目：`chat.inject`、非代理程式指令回覆、已中止的部分輸出，以及 WebChat 管理的媒體對話紀錄補充。
- `chat.history` 會讀取儲存的會話對話紀錄並套用 WebChat 顯示投影。如果助理文字在運行期間出現但在重新載入歷史後消失，請先檢查原始 JSONL 是否包含助理文字，然後檢查 `chat.history` 投影是否將其剝除，再檢查 Control UI 樂觀尾部合併是否已將本地傳遞狀態替換為持久化的快照。

正常的代理程式運行最終答案應該是持久的，因為 Pi 寫入了助理 `message_end`。任何將傳遞的最終有效負載鏡像到對話紀錄的後援機制，必須首先避免複製 Pi 已寫入的助理回合。

## Control UI 代理程式工具面板

- Control UI `/agents` 工具面板有兩個獨立的檢視：
  - **目前可用** 使用 `tools.effective(sessionKey=...)` 並顯示當前工作階段在執行時實際可使用的內容，包括核心、外掛和通道擁有的工具。
  - **工具設定** 使用 `tools.catalog` 並專注於設定檔、覆寫和目錄語義。
- 執行時可用性是以工作階段為範圍的。在相同 Agent 上切換工作階段可能會改變**目前可用**清單。
- 設定編輯器並不意味著執行時可用性；有效存取仍遵循策略優先順序（`allow`/`deny`、每個 Agent 和提供者/通道覆寫）。

## 遠端使用

- 遠端模式會透過 SSH/Tailscale 透傳 Gateway WebSocket。
- 您不需要執行個別的 WebChat 伺服器。

## 設定參考

完整設定：[Configuration](/zh-Hant/gateway/configuration)

WebChat 選項：

- `gateway.webchat.chatHistoryMaxChars`：`chat.history` 回應中文字欄位的最大字元數。當逐字稿條目超過此限制時，Gateway 會截斷長文字欄位，並可能用預留位置取代過大的訊息。用戶端也可以傳送每次請求的 `maxChars` 來覆寫單一 `chat.history` 呼叫的此預設值。

相關的全域選項：

- `gateway.port`, `gateway.bind`：WebSocket 主機/埠。
- `gateway.auth.mode`, `gateway.auth.token`, `gateway.auth.password`：
  共用金鑰 WebSocket 認證。
- `gateway.auth.allowTailscale`：啟用時，瀏覽器 Control UI 聊天分頁可以使用 Tailscale
  Serve 身分標頭。
- `gateway.auth.mode: "trusted-proxy"`：位於具備身分感知功能的**非回送**代理來源之後的瀏覽器用戶端的反向代理認證（請參閱 [Trusted Proxy Auth](/zh-Hant/gateway/trusted-proxy-auth)）。
- `gateway.remote.url`, `gateway.remote.token`, `gateway.remote.password`：遠端 Gateway 目標。
- `session.*`：工作階段儲存和主要金鑰預設值。

## 相關

- [Control UI](/zh-Hant/web/control-ui)
- [Dashboard](/zh-Hant/web/dashboard)
