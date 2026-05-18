---
summary: "Codex 組件的執行時邊界、掛鉤、工具、權限和診斷"
title: "Codex 組件執行時"
read_when:
  - You need the Codex harness runtime support contract
  - You are debugging native Codex tools, hooks, compaction, or feedback upload
  - You are changing plugin behavior across PI and Codex harness turns
---

本頁文件記載了 Codex harness 回合的執行時期合約。如需設定和路由，請從 [Codex harness](/zh-Hant/plugins/codex-harness) 開始。關於設定欄位，請參閱 [Codex harness 參考](/zh-Hant/plugins/codex-harness-reference)。

## 概觀

Codex 模式不是底層使用不同模型呼叫的 PI。Codex 擁有更多原生模型迴圈，而 OpenClaw 會圍繞該邊界調整其外掛程式、工具、工作階段和診斷表面。

OpenClaw 仍然擁有通道路由、會話檔案、可見訊息傳遞、OpenClaw 動態工具、核准、媒體傳遞以及文字記錄鏡像。Codex 擁有標準的原生執行緒、原生模型迴圈、原生工具延續以及原生壓縮，除非目前使用的 OpenClaw 語境引擎宣告其擁有壓縮權。

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

Codex app-server 項目通知也會為原生工具完成提供非同步 `after_tool_call` 觀測，這些內容尚未被原生 `PostToolUse` 中繼涵蓋。這些觀測僅用於遙測和外掛程式相容性；它們無法阻擋、延遲或修改原生工具呼叫。

壓縮和 LLM 生命週期預測來自 Codex app-server 通知和 OpenClaw 介接器狀態，而非原生 Codex hook 指令。OpenClaw 的 `before_compaction`、`after_compaction`、`llm_input` 和 `llm_output` 事件是介接器層級的觀測，而非 Codex 內部請求或壓縮負載的逐位元組擷取。

Codex 原生 `hook/started` 和 `hook/completed` app-server 通知會被預測為 `codex_app_server.hook` 代理程式事件，用於軌跡和偵錯。它們不會叫用 OpenClaw 外掛程式 hook。

## V1 支援合約

Codex 執行時期 v1 支援：

| 介面                                | 支援                                                | 原因                                                                                                                                                              |
| ----------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 透過 Codex 的 OpenAI 模型迴圈       | 已支援                                              | Codex app-server 擁有 OpenAI 輪次、原生執行緒恢復和原生工具接續。                                                                                                 |
| OpenClaw 通道路由和傳遞             | 已支援                                              | Telegram、Discord、Slack、WhatsApp、iMessage 和其他通道保持在模型執行時期之外。                                                                                   |
| OpenClaw 動態工具                   | 已支援                                              | Codex 要求 OpenClaw 執行這些工具，因此 OpenClaw 保持在執行路徑中。                                                                                                |
| 提示詞和內容外掛程式                | 已支援                                              | OpenClaw 會建構提示詞覆蓋層，並在啟動或恢復執行緒之前將內容投射到 Codex 輪次中。                                                                                  |
| 內容引擎生命週期                    | 已支援                                              | 組裝、擷取、輪次後維護和內容引擎壓縮協調會針對 Codex 輪次執行。                                                                                                   |
| 動態工具 Hook                       | 已支援                                              | `before_tool_call`、`after_tool_call` 和工具結果中介軟體會在 OpenClaw 擁有的動態工具周圍執行。                                                                    |
| 生命週期 Hook                       | 作為介接器觀測受支援                                | `llm_input`、`llm_output`、`agent_end`、`before_compaction` 和 `after_compaction` 會以真實的 Codex 模式承載觸發。                                                 |
| 最終答案修訂閘門                    | 透過原生 Hook 中繼支援                              | Codex `Stop` 會中繼至 `before_agent_finalize`；`revise` 會要求 Codex 在最終確認前再進行一次模型傳遞。                                                             |
| 原生 shell、patch 和 MCP 封鎖或觀察 | 透過原生 Hook 中繼支援                              | Codex `PreToolUse` 和 `PostToolUse` 會為承諾的原生工具介面進行中繼，包括 Codex 應用伺服器 `0.125.0` 或更新版本上的 MCP 承載。支援封鎖；不支援引數重寫。           |
| 原生權限原則                        | 透過 Codex 應用伺服器核准和相容性原生 Hook 中繼支援 | Codex 應用伺服器核准請求會在 Codex 審查後透過 OpenClaw 路由。由於 Codex 會在 guardian 審查前發出 `PermissionRequest` 原生 Hook 中繼，因此原生核准模式需選擇加入。 |
| 應用伺服器軌跡擷取                  | 已支援                                              | OpenClaw 會記錄其傳送至應用伺服器的請求，以及其收到的應用伺服器通知。                                                                                             |

Codex 執行階段 v1 不支援：

| 介面                                            | V1 邊界                                                                                                       | 未來路徑                                                         |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 原生工具引數變更                                | Codex 原生前置工具 Hook 可以封鎖，但 OpenClaw 不會重寫 Codex 原生工具引數。                                   | 需要 Codex hook/schema 支援才能進行替換工具輸入。                |
| 可編輯的 Codex 原生對話紀錄歷史                 | Codex 擁有標準的原生執行緒歷史記錄。OpenClaw 擁有一個鏡像並可以投射未來的上下文，但不應變更不支援的內部結構。 | 如果需要原生執行緒手術，請加入明確的 Codex 應用伺服器 API。      |
| 用於 Codex 原生工具記錄的 `tool_result_persist` | 該 Hook 會轉換 OpenClaw 擁有的對話紀錄寫入，而非 Codex 原生工具記錄。                                         | 可以鏡像轉換後的記錄，但標準重寫需要 Codex 支援。                |
| 豐富的原生壓縮元資料                            | OpenClaw 會觀察壓縮的開始和完成，但不會收到穩定的保留/捨棄清單、token 差異或摘要承載。                        | 需要更豐富的 Codex 壓縮事件。                                    |
| 壓縮干預                                        | 在 Codex 模式下，目前的 OpenClaw 壓縮鉤子屬於通知層級。                                                       | 如果外掛需要否決或重寫原生壓縮，請新增 Codex 前置/後置壓縮鉤子。 |
| 逐位元組的模型 API 請求捕獲                     | OpenClaw 可以捕獲應用程式伺服器的請求和通知，但 Codex 核心會在內部建構最終的 OpenAI API 請求。                | 需要 Codex 模型請求追蹤事件或偵錯 API。                          |

## 原生權限與 MCP 請求

對於 `PermissionRequest`，當策略做出決定時，OpenClaw 只會傳回明確的允許或拒絕決策。「無決策」的結果不代表允許。Codex 將其視為無鉤子決策，並回退至其自身的守護者或使用者核准路徑。

Codex 應用程式伺服器核准模式預設會省略此原生鉤子。當 `permission_request` 被明確包含在 `nativeHookRelay.events` 中，或相容性執行時安裝了它時，此行為即適用。

當操作員為 Codex 原生權限請求選擇 `allow-always` 時，OpenClaw 會在有限的工作階段視窗內記住該確切的提供者/工作階段/工具輸入/cwd 指紋。記住的決策僅限於故意進行的精確比對：變更的指令、引數、工具負載或 cwd 會建立新的核准。

當 Codex 將 `_meta.codex_approval_kind` 標記為 `"mcp_tool_call"` 時，Codex MCP 工具核准請求會透過 OpenClaw 的外掛核准流程進行路由。Codex `request_user_input` 提示會被傳回原始聊天，下一個排隊的追蹤訊息會回答該原生伺服器請求，而不是被導向為額外上下文。其他 MCP 請求會失敗並關閉。

## 佇列導引

Active-run 佇列導向對應至 Codex app-server 的 `turn/steer`。使用預設的 `messages.queue.mode: "steer"`，OpenClaw 會針對設定的安靜視窗將導向模式的聊天訊息分批，並依照到達順序將其作為一個 `turn/steer` 請求傳送。

Codex 審查和手動壓縮回合可以拒絕同回合導向。在這種情況下，OpenClaw 會等待現有的執行完成後再開始提示。當訊息應預設進入佇列而非導向時，請使用 `/queue followup` 或 `/queue collect`。請參閱 [Steering queue](/zh-Hant/concepts/queue-steering)。

## Codex 意見回傳上傳

當 `/diagnostics [note]` 針對使用原生 Codex harness 的工作階段獲得核准時，OpenClaw 也會針對相關的 Codex 執行緒呼叫 Codex app-server `feedback/upload`。此上傳要求 app-server 盡可能包含每個列出的執行緒及產生的 Codex 子執行緒的日誌。

上傳會透過 Codex 的正常意見回傳路徑傳送到 OpenAI 伺服器。如果該 app-server 停用了 Codex 意見回傳，該指令會傳回 app-server 錯誤。完成的診斷回覆會列出已傳送執行緒的頻道、OpenClaw session ids、Codex thread ids 以及本機 `codex resume <thread-id>` 指令。

如果您拒絕或忽略核准，OpenClaw 將不會列印那些 Codex ID，也不會傳送 Codex 反饋。此上傳不會取代本機 Gateway 診斷匯出。關於核准、隱私、本機套件和群組聊天行為，請參閱 [Diagnostics export](/zh-Hant/gateway/diagnostics)。

僅當您特別想要針對目前附加的執行緒進行 Codex 意見回傳上傳，而不需要完整的 Gateway 診斷套件時，才使用 `/codex diagnostics [note]`。

## 壓縮與文字記錄鏡像

當選取的模型使用 Codex harness 時，原生執行緒壓縮會委派給 Codex app-server，除非作用中的語境引擎宣告 `ownsCompaction: true`。擁有權的語境引擎會先進行壓縮，並導致 OpenClaw 捨棄舊的 Codex 後端執行緒，以便下一回合可以從引擎管理的語境重新填入全新的執行緒。OpenClaw 會保留文字記錄鏡像以供通道歷史、搜尋、`/new`、`/reset` 以及未來的模型或 harness 切換使用。

當語境引擎請求 Codex 執行緒啟動投射時，OpenClaw 會將工具呼叫名稱和 ID、輸入形狀以及編輯過的工具結果內容投射到新的 Codex 執行緒中。它不會將原始的工具呼叫引數值複製到該投射中。

鏡像包含使用者提示、最終助理文字，以及當應用伺服器發出時的輕量級 Codex 推理或計畫記錄。目前，OpenClaw 僅記錄原生壓縮的開始和完成訊號。它尚未公開人類可讀的壓縮摘要，或可稽核的壓縮後 Codex 保留哪些項目的清單。

因為 Codex 擁有標準的原生執行緒，`tool_result_persist` 目前不會重寫 Codex 原生工具結果記錄。它僅在 OpenClaw 寫入 OpenClaw 擁有的會話文字記錄工具結果時套用。

## 媒體與傳遞

OpenClaw 繼續擁有媒體傳遞和媒體供應商選擇權。圖片、影片、音樂、PDF、TTS 和媒體理解使用匹配的供應商/模型設定，例如 `agents.defaults.imageGenerationModel`、`videoGenerationModel`、`pdfModel` 和 `messages.tts`。

文字、圖片、影片、音樂、TTS、審核和訊息工具輸出繼續透過正常的 OpenClaw 傳遞路徑。媒體生成不需要 PI。當 Codex 發出帶有 `savedPath` 的原生圖片生成項目時，OpenClaw 會透過正常的回覆媒體路徑轉發該確切檔案，即使 Codex 回合沒有助理文字。

## 相關

- [Codex harness](/zh-Hant/plugins/codex-harness)
- [Codex harness reference](/zh-Hant/plugins/codex-harness-reference)
- [Native Codex plugins](/zh-Hant/plugins/codex-native-plugins)
- [Plugin hooks](/zh-Hant/plugins/hooks)
- [Agent harness plugins](/zh-Hant/plugins/sdk-agent-harness)
- [Diagnostics export](/zh-Hant/gateway/diagnostics)
- [Trajectory export](/zh-Hant/tools/trajectory)
