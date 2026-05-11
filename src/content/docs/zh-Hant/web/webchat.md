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
- `chat.history` 也經過顯示正規化處理：僅限執行時的 OpenClaw 上下文、
  入站信封包裝器、內聯傳遞指令標籤
  例如 `[[reply_to_*]]` 和 `[[audio_as_voice]]`、純文字工具呼叫 XML
  載荷 (包括 `<tool_call>...</tool_call>`、
  `<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、
  `<function_calls>...</function_calls>` 和截斷的工具呼叫區塊)，以及
  外洩的 ASCII/全形模型控制權杖會從可見文字中移除，
  且助理項目的整個可見文字若僅包含精確的靜音
  權杖 `NO_REPLY` / `no_reply`，則會被省略。
- 標記為推理的回覆載荷 (`isReasoning: true`) 會從 WebChat 助理內容、逐字稿重播文字和音訊內容區塊中排除，因此僅思考的載荷不會顯示為可見的助理訊息或可播放的音訊。
- `chat.inject` 會直接將助理註解附加到逐字稿並將其廣播到 UI (無 agent 執行)。
- 中止的執行可讓部分助手輸出保持可見於 UI 中。
- 當存在緩衝輸出時，Gateway 會將中止的部分助手文字保存至紀錄歷史，並為這些條目標記中止中繼資料。
- 歷史紀錄總是從 gateway 取得（不監看本機檔案）。
- 若無法連線至 gateway，WebChat 將為唯讀狀態。

## Control UI agents tools panel

- Control UI 的 `/agents` 工具面板有兩個獨立的視圖：
  - **目前可用** 使用 `tools.effective(sessionKey=...)` 並顯示目前
    會話在執行時實際可用的內容，包括核心、外掛和通道擁有的工具。
  - **工具配置** 使用 `tools.catalog` 並專注於設定檔、覆寫和
    目錄語意。
- 執行階段可用性是以階段作業為範圍。在同一個代理程式上切換階段作業可能會改變 **Available Right Now** 列表。
- 設定編輯器並不代表執行時可用性；實際存取仍遵循原則
  優先順序 (`allow`/`deny`，每個代理程式和提供者/通道覆寫)。

## Remote use

- 遠端模式會透過 SSH/Tailscale 建立隧道連接至 gateway WebSocket。
- 您不需要執行個別的 WebChat 伺服器。

## Configuration reference (WebChat)

完整配置：[Configuration](/zh-Hant/gateway/configuration)

WebChat 選項：

- `gateway.webchat.chatHistoryMaxChars`：`chat.history` 回應中文字欄位的最大字元數。當記錄項目超過此限制時，Gateway 會截斷長文字欄位，並可能以預留位置取代過大的訊息。用戶端也可以傳送每次請求的 `maxChars`，以針對單一 `chat.history` 呼叫覆寫此預設值。

相關的全域選項：

- `gateway.port`, `gateway.bind`: WebSocket 主機/連接埠。
- `gateway.auth.mode`, `gateway.auth.token`, `gateway.auth.password`:
  共用金鑰 WebSocket 驗證。
- `gateway.auth.allowTailscale`: 瀏覽器控制 UI 聊天分頁可在啟用時使用 Tailscale
  Serve 身份標頭。
- `gateway.auth.mode: "trusted-proxy"`: 針對位於具身份感知的**非環回** Proxy 來源後方的瀏覽器用戶端進行反向 Proxy 驗證 (請參閱 [Trusted Proxy Auth](/zh-Hant/gateway/trusted-proxy-auth))。
- `gateway.remote.url`, `gateway.remote.token`, `gateway.remote.password`: 遠端閘道目標。
- `session.*`: 工作階段儲存和主金鑰預設值。

## 相關

- [Control UI](/zh-Hant/web/control-ui)
- [Dashboard](/zh-Hant/web/dashboard)
