---
summary: "Codex 組件的執行時邊界、掛鉤、工具、權限和診斷"
title: "Codex 組件執行時"
read_when:
  - You need the Codex harness runtime support contract
  - You are debugging native Codex tools, hooks, compaction, or feedback upload
  - You are changing plugin behavior across PI and Codex harness turns
---

本頁面記錄了 Codex 組件輪次的執行時契約。有關設定和路由，請從 [Codex 組件](/zh-Hant/plugins/codex-harness) 開始。有關配置欄位，請參閱 [Codex 組件參考](/zh-Hant/plugins/codex-harness-reference)。

## 概觀

Codex 模式不是底層使用不同模型呼叫的 PI。Codex 擁有更多原生模型迴圈，而 OpenClaw 會圍繞該邊界調整其外掛程式、工具、工作階段和診斷表面。

OpenClaw 仍然擁有通道路由、工作階段檔案、可見訊息傳遞、OpenClaw 動態工具、核准、媒體傳遞和文字紀錄鏡像。Codex 擁有正式的原生執行緒、原生模型迴圈、原生工具延續和原生壓縮。

## 執行緒繫結和模型變更

當 OpenClaw 工作階段附加到現有的 Codex 執行緒時，下一輪會將目前選取的 OpenAI 模型、核准原則、沙箱和服務層級再次傳送至 app-server。從 `openai/gpt-5.5` 切換到 `openai/gpt-5.2` 會保留執行緒繫結，但要求 Codex 使用新選取的模型繼續。

## 可見回覆和心跳

當來源聊天輪次通過 Codex 組件執行時，如果部署未明確配置 `messages.visibleReplies`，可見回覆預設為 OpenClaw `message` 工具。代理人仍然可以私下完成其 Codex 輪次；它僅在呼叫 `message(action="send")` 時才會發佈到頻道。設定 `messages.visibleReplies: "automatic"` 可將直接聊天的最終回覆保留在舊版自動傳遞路徑上。

Codex 心跳輪次預設也會在可搜尋的 OpenClaw 工具目錄中獲得 `heartbeat_respond`，因此代理人可以記錄喚醒應保持靜音還是發出通知，而無需在最終文字中編碼該控制流程。

特定於心跳的主動性指導會作為 Codex 協作模式開發者指令在心跳輪次本身上發送。一般聊天輪次會恢復 Codex 預設模式，而不是在其正常執行時提示中攜帶心跳哲學。

## 掛鉤邊界

Codex harness 有三個掛鉤層：

| 層級                              | 擁有者                | 目的                                                 |
| --------------------------------- | --------------------- | ---------------------------------------------------- |
| OpenClaw 外掛程式掛鉤             | OpenClaw              | 跨 PI 和 Codex harness 的產品/外掛程式相容性。       |
| Codex app-server 擴充功能中介軟體 | OpenClaw 內建外掛程式 | 圍繞 OpenClaw 動態工具的每輪次配接器行為。           |
| Codex 原生掛鉤                    | Codex                 | 來自 Codex 設定的低階 Codex 生命週期和原生工具原則。 |

OpenClaw 不使用專案或全域 Codex `hooks.json` 檔案來路由
OpenClaw 外掛程式行為。對於支援的原生工具和權限橋接，
OpenClaw 會針對 `PreToolUse`、`PostToolUse`、
`PermissionRequest` 和 `Stop` 注入每個執行緒的 Codex 設定。

當啟用 Codex app-server 核准時，意指 `approvalPolicy` 不是
`"never"`，預設注入的原生掛鉤設定會省略 `PermissionRequest`，以便
Codex 的 app-server 審核者和 OpenClaw 的核准橋接在審核後處理
實際的升級。當操作員需要相容性轉發器時，可以明確將 `permission_request` 加入
`nativeHookRelay.events`。

其他 Codex 掛鉤（例如 `SessionStart` 和 `UserPromptSubmit`）維持
為 Codex 層級的控制項。它們在 v1 合約中未公開為 OpenClaw 外掛程式掛鉤。

對於 OpenClaw 動態工具，OpenClaw 會在 Codex 要求呼叫後執行該工具，
因此 OpenClaw 會在 harness 配接器中觸發其擁有的外掛程式和中介軟體行為。
對於 Codex 原生工具，Codex 擁有標準工具記錄。
OpenClaw 可以鏡像選取的事件，但除非 Codex 透過 app-server 或原生掛鉤
回呼公開該操作，否則 OpenClaw 無法重寫原生 Codex 執行緒。

壓縮和 LLM 生命週期投影來自 Codex app-server
通知和 OpenClaw 配接器狀態，而非原生 Codex 掛鉤指令。
OpenClaw 的 `before_compaction`、`after_compaction`、`llm_input` 和
`llm_output` 事件是配接器層級的觀察，而非 Codex 內部請求或
壓縮 Payload 的逐位元組擷取。

Codex 原生 `hook/started` 和 `hook/completed` 應用伺服器通知被
投影為 `codex_app_server.hook` 代理事件，用於軌跡追蹤和調試。
它們不會調用 OpenClaw 插件掛鉤。

## V1 支援契約

Codex 執行時 v1 中支援的功能：

| 介面                              | 支援狀態                                          | 原因                                                                                                                                                                         |
| --------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 透過 Codex 的 OpenAI 模型循環     | 已支援                                            | Codex 應用伺服器擁有 OpenAI 輪次、原生執行緒恢復和原生工具延續。                                                                                                             |
| OpenClaw 通道路由和傳遞           | 已支援                                            | Telegram、Discord、Slack、WhatsApp、iMessage 和其他通道位於模型執行時之外。                                                                                                  |
| OpenClaw 動態工具                 | 已支援                                            | Codex 要求 OpenClaw 執行這些工具，因此 OpenClaw 保持在執行路徑中。                                                                                                           |
| 提示詞和上下文插件                | 已支援                                            | OpenClaw 在啟動或恢復執行緒之前，構建提示詞覆蓋層並將上下文投影到 Codex 輪次中。                                                                                             |
| 上下文引擎生命週期                | 已支援                                            | 組裝、攝取、輪次後維護和上下文引擎壓縮協調會針對 Codex 輪次運行。                                                                                                            |
| 動態工具掛鉤                      | 已支援                                            | `before_tool_call`、`after_tool_call` 和工具結果中介軟體圍繞 OpenClaw 擁有的動態工具運行。                                                                                   |
| 生命週期掛鉤                      | 作為適配器觀察被支援                              | `llm_input`、`llm_output`、`agent_end`、`before_compaction` 和 `after_compaction` 會觸發並帶有真實的 Codex 模式載荷。                                                        |
| 最終答案修訂閘門                  | 透過原生掛鉤中繼支援                              | Codex `Stop` 被中繼到 `before_agent_finalize`；`revise` 會在最終確定之前要求 Codex 再進行一次模型傳遞。                                                                      |
| 原生 Shell、修補和 MCP 阻斷或觀察 | 透過原生掛鉤中繼支援                              | Codex `PreToolUse` 和 `PostToolUse` 針對承諾的原生工具介面進行中繼，包括 Codex 應用伺服器 `0.125.0` 或更新版本上的 MCP 載荷。支援阻斷；不支援參數重寫。                      |
| 原生權限政策                      | 透過 Codex 應用伺服器審批和相容性原生掛鉤中繼支援 | Codex 應用程式伺服器批准請求在 Codex 審查後會透過 OpenClaw 路由。`PermissionRequest` 原生 hook 中繼對於原生批准模式是選用的（opt-in），因為 Codex 會在守護者審查之前發出它。 |
| 應用程式伺服器軌跡擷取            | 支援                                              | OpenClaw 會記錄其傳送至應用程式伺服器的請求，以及其收到的應用程式伺服器通知。                                                                                                |

Codex 執行階段 v1 不支援：

| 介面                                            | V1 邊界                                                                                                   | 未來路徑                                                              |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 原生工具引數變異                                | Codex 原生前置工具 hook 可以封鎖，但 OpenClaw 不會重寫 Codex 原生工具引數。                               | 需要 Codex hook/schema 支援以進行替換工具輸入。                       |
| 可編輯的 Codex 原生對話紀錄歷史                 | Codex 擁有標準的原生執行緒歷史。OpenClaw 擁有一個鏡像並可以投射未來的上下文，但不應變更不支援的內部結構。 | 如果需要原生執行緒手術，請新增明確的 Codex 應用程式伺服器 API。       |
| 用於 Codex 原生工具記錄的 `tool_result_persist` | 該 hook 會轉換 OpenClaw 擁有的對話紀錄寫入，而非 Codex 原生工具記錄。                                     | 可以鏡像已轉換的記錄，但標準重寫需要 Codex 支援。                     |
| 豐富的原生壓縮中繼資料                          | OpenClaw 會觀察壓縮的開始和完成，但不會收到穩定的保留/丟棄列表、token 差異或摘要載荷。                    | 需要更豐富的 Codex 壓縮事件。                                         |
| 壓縮介入                                        | 目前的 OpenClaw 壓縮 hook 在 Codex 模式下屬於通知層級。                                                   | 如果外掛程式需要否決或重寫原生壓縮，請新增 Codex 前置/後置壓縮 hook。 |
| 逐位元組的模型 API 請求擷取                     | OpenClaw 可以擷取應用程式伺服器的請求和通知，但 Codex 核心會在內部建構最終的 OpenAI API 請求。            | 需要 Codex 模型請求追蹤事件或偵錯 API。                               |

## 原生權限和 MCP 誘導

對於 `PermissionRequest`，當原則決定時，OpenClaw 只會傳回明確的允許或拒絕決定。無決定的結果並非允許。Codex 將其視為無 hook 決定，並回退至其自己的守護者或使用者批准路徑。

Codex 應用程式伺服器批准模式預設會省略此原生 hook。當 `permission_request` 被明確包含在 `nativeHookRelay.events` 中，或相容性執行階段安裝它時，會套用此行為。

當操作員針對 Codex 原生權限請求選擇 `allow-always` 時，OpenClaw 會在有限的連線視窗內記住該特定的供應商/會話/工具輸入/cwd 指紋。記住的決策僅限於完全一致匹配：任何指令、參數、工具內容或 cwd 的變更都會產生新的核准需求。

當 Codex 將 `_meta.codex_approval_kind` 標記為 `"mcp_tool_call"` 時，Codex MCP 工具核准請求會透過 OpenClaw 的外掛程式核准流程進行路由。Codex `request_user_input` 提示會被傳送回來源聊天，下一個排隊的後續訊息會回應該原生伺服器請求，而不是被導向為額外的上下文。其他的 MCP 請求則會失敗並封閉。

## 佇列導向

執行中佇列導向對應到 Codex 應用程式伺服器的 `turn/steer`。使用預設的 `messages.queue.mode: "steer"` 時，OpenClaw 會將排隊的聊天訊息針對設定的安靜視窗進行批次處理，並依照到達順序將其作為單一 `turn/steer` 請求傳送。傳統的 `queue` 模式則會發送個別的 `turn/steer` 請求。

Codex 審查和手動壓縮輪次可以拒絕同輪次導向。在這種情況下，當選定的模式允許備援時，OpenClaw 會使用後續佇列。請參閱[導向佇列](/zh-Hant/concepts/queue-steering)。

## Codex 回饋上傳

當針對使用原生 Codex 配接器的會話核准 `/diagnostics [note]` 時，OpenClaw 也會針對相關的 Codex 執行緒呼叫 Codex 應用程式伺服器 `feedback/upload`。上傳會要求應用程式伺服器在可用時包含每個列出執行緒及產生的 Codex 子執行緒的日誌。

上傳會透過 Codex 的正常回饋路徑傳送至 OpenAI 伺服器。如果該應用程式伺服器中停用了 Codex 回饋，該指令會傳回應用程式伺服器錯誤。完成的診斷回覆會列出已傳送執行緒的頻道、OpenClaw 會話 ID、Codex 執行緒 ID 以及本機 `codex resume <thread-id>` 指令。

如果您拒絕或忽略批准，OpenClaw 將不會列印那些 Codex ID，也不會發送 Codex 反饋。該上傳不會取代本機 Gateway 診斷匯出。請參閱 [診斷匯出](/zh-Hant/gateway/diagnostics) 以了解批准、隱私、本機套件和群組聊天行為。

僅當您特別需要目前附加執行緒的 Codex 反饋上傳，而不需要完整的 Gateway 診斷套件時，才使用 `/codex diagnostics [note]`。

## 壓縮與對話鏡像

當選取的模型使用 Codex harness 時，原生執行緒壓縮會委派給 Codex 應用程式伺服器。OpenClaw 會保留對話鏡像，用於頻道歷史、搜尋、`/new`、`/reset` 以及未來的模型或 harness 切換。

該鏡像包含使用者提示、最終助手文字，以及當應用程式伺服器發出時的輕量級 Codex 推理或計畫記錄。目前，OpenClaw 僅記錄原生壓縮開始和完成訊號。它尚未公開人類可讀的壓縮摘要或可稽核的清單，以顯示 Codex 在壓縮後保留了哪些項目。

因為 Codex 擁有標準的原生執行緒，所以 `tool_result_persist` 目前不會重寫 Codex 原生工具結果記錄。它僅適用於 OpenClaw 正在撰寫 OpenClaw 擁有的會話對話工具結果時。

## 媒體與傳遞

OpenClaw 繼續擁有媒體傳遞和媒體提供者選擇權。圖片、影片、音樂、PDF、TTS 和媒體理解使用匹配的提供者/模型設定，例如 `agents.defaults.imageGenerationModel`、`videoGenerationModel`、`pdfModel` 和 `messages.tts`。

文字、圖片、影片、音樂、TTS、批准和訊息工具輸出繼續透過正常的 OpenClaw 傳遞路徑。媒體生成不需要 PI。

## 相關

- [Codex harness](/zh-Hant/plugins/codex-harness)
- [Codex harness 參考](/zh-Hant/plugins/codex-harness-reference)
- [原生 Codex 外掛程式](/zh-Hant/plugins/codex-native-plugins)
- [外掛程式掛鉤](/zh-Hant/plugins/hooks)
- [Agent harness 外掛程式](/zh-Hant/plugins/sdk-agent-harness)
- [診斷匯出](/zh-Hant/gateway/diagnostics)
- [軌跡匯出](/zh-Hant/tools/trajectory)
