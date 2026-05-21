---
summary: "Codex 組件的執行時邊界、掛鉤、工具、權限和診斷"
title: "Codex 組件執行時"
read_when:
  - You need the Codex harness runtime support contract
  - You are debugging native Codex tools, hooks, compaction, or feedback upload
  - You are changing plugin behavior across PI and Codex harness turns
---

本文件記載 Codex harness 回合的執行時期合約。如需設定與路由，請從 [Codex harness](/zh-Hant/plugins/codex-harness) 開始。若要查看設定欄位，請參閱 [Codex harness 參考資料](/zh-Hant/plugins/codex-harness-reference)。

## 概觀

Codex 模式不是底層使用不同模型呼叫的 PI。Codex 擁有更多原生模型迴圈，而 OpenClaw 會圍繞該邊界調整其外掛程式、工具、工作階段和診斷表面。

OpenClaw 仍然擁有通道路由、會話檔案、可見訊息傳遞、OpenClaw 動態工具、核准、媒體傳遞以及文字記錄鏡像。Codex 擁有標準的原生執行緒、原生模型迴圈、原生工具延續以及原生壓縮，除非目前使用的 OpenClaw 語境引擎宣告其擁有壓縮權。

提示路由會遵循選取的執行時期，而不僅是提供者字串。原生 Codex 回合會接收 Codex 應用伺服器開發者指令，而明確的 PI 相容路由則會保留一般的 OpenClaw/PI 系統提示，即使它使用 Codex 風格的 OpenAI 驗證或傳輸。

原生 Codex 會根據有效的 Codex 執行緒設定，保留 Codex 擁有的基礎/模型/個性指令以及專案文件行為。輕量級 OpenClaw 執行仍會保留其現有的專案文件抑制。OpenClaw 開發者指令涵蓋 OpenClaw 執行時期事項，例如來源管道傳遞、OpenClaw 動態工具、ACP 委派、轉接器內容，以及有效的代理工作區設定檔。OpenClaw 技能目錄加上 `MEMORY.md` 和有效的 `BOOTSTRAP.md` 內容會投射為原生 Codex 的回合輸入參考內容。

## 執行緒繫結與模型變更

當 OpenClaw 工作階段連接到現有的 Codex 執行緒時，下一個回合會將目前選取的 OpenAI 模型、核准政策、沙箱和服務層級再次傳送至應用伺服器。從 `openai/gpt-5.5` 切換到 `openai/gpt-5.2` 會保留執行緒繫結，但會要求 Codex 使用新選取的模型繼續進行。

## 可見回覆與心跳

當直接/來源聊天回合透過 Codex harness 執行時，可見回覆預設為訊息工具：除非代理呼叫 `message(action="send")`，否則最終助理文字會保持私密。這與 GPT 模型非常契合，因為它們可以決定來源管道輸出是否有用。設定 `messages.visibleReplies: "automatic"` 以還原最終助理文字自動發布的舊模式。

Codex 心跳回合預設也會在可搜尋的 OpenClaw 工具目錄中取得 `heartbeat_respond`，因此代理可以記錄喚醒應保持靜默還是發出通知，而不需要在最終文字中編碼該控制流程。

專屬於心跳的倡導指引是作為 Codex 協作模式開發者指令在心跳輪次本身發送的。一般的聊天輪次會恢復 Codex Default 模式，而不是在其正常的執行時提示中攜帶心跳哲學。當存在非空的 `HEARTBEAT.md` 時，心跳協作模式指令會讓 Codex 指向該檔案，而不是將其內容內聯。

## Hook 邊界

Codex harness 有三個 Hook 層級：

| 層級                          | 擁有者                | 目的                                                 |
| ----------------------------- | --------------------- | ---------------------------------------------------- |
| OpenClaw 外掛程式 Hooks       | OpenClaw              | 跨 PI 和 Codex harness 的產品/外掛程式相容性。       |
| Codex app-server 擴充中介軟體 | OpenClaw 內建外掛程式 | 圍繞 OpenClaw 動態工具的每輪適配器行為。             |
| Codex 原生 Hooks              | Codex                 | 來自 Codex 設定的低階 Codex 生命週期和原生工具策略。 |

OpenClaw 不使用專案或全域 Codex `hooks.json` 檔案來路由 OpenClaw 外掛程式行為。對於支援的原生工具和權限橋接，OpenClaw 為 `PreToolUse`、`PostToolUse`、`PermissionRequest` 和 `Stop` 注入每個執行緒的 Codex 設定。

當啟用 Codex app-server 核准時，意指 `approvalPolicy` 不是 `"never"`，預設注入的原生 Hook 設定會省略 `PermissionRequest`，以便 Codex 的 app-server 審閱者和 OpenClaw 的核准橋接在審閱後處理真正的升級。當操作員需要相容性轉發時，可以明確地將 `permission_request` 加入 `nativeHookRelay.events`。

其他 Codex Hooks（例如 `SessionStart` 和 `UserPromptSubmit`）保持為 Codex 層級的控制項。它們在 v1 合約中不會公開為 OpenClaw 外掛程式 Hooks。

對於 OpenClaw 動態工具，OpenClaw 會在 Codex 要求呼叫之後執行該工具，因此 OpenClaw 會在 harness 適配器中觸發其擁有的外掛程式和中介軟體行為。對於 Codex 原生工具，Codex 擁有標準工具記錄。OpenClaw 可以鏡像選定的事件，但除非 Codex 透過 app-server 或原生 Hook 回呼公開該操作，否則 OpenClaw 無法重寫原生 Codex 執行緒。

Codex app-server 項目通知也針對尚未由原生 `PostToolUse` 中繼涵蓋的原生工具完成，提供異步 `after_tool_call` 觀察。這些觀察僅用於遙測和外掛程式相容性；它們無法阻擋、延遲或修改原生工具呼叫。

壓縮和 LLM 生命週期投影來自 Codex app-server 通知和 OpenClaw 介面卡狀態，而非來自原生 Codex hook 指令。OpenClaw 的 `before_compaction`、`after_compaction`、`llm_input` 和 `llm_output` 事件是介面卡層級的觀察，並非 Codex 內部請求或壓縮 Payload 的逐位元組擷取。

Codex 原生 `hook/started` 和 `hook/completed` app-server 通知被投影為 `codex_app_server.hook` 代理程式事件，用於軌跡和偵錯。它們不會叫用 OpenClaw 外掛程式 hooks。

## V1 支援合約

Codex 執行階段 v1 支援：

| 介面                                | 支援                                                 | 原因                                                                                                                                                                                                                                                              |
| ----------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 透過 Codex 的 OpenAI 模型迴圈       | 支援                                                 | Codex app-server 擁有 OpenAI 回合、原生執行緒恢復和原生工具繼續。                                                                                                                                                                                                 |
| OpenClaw 頻道路由和傳遞             | 支援                                                 | Telegram、Discord、Slack、WhatsApp、iMessage 和其他頻道保持在模型執行階段之外。                                                                                                                                                                                   |
| OpenClaw 動態工具                   | 支援                                                 | Codex 要求 OpenClaw 執行這些工具，因此 OpenClaw 保持在執行路徑中。                                                                                                                                                                                                |
| 提示和內容外掛程式                  | 支援                                                 | OpenClaw 將 OpenClaw 特定的提示/內容投影到 Codex 回合中，同時將 Codex 擁有的基礎、模型、個性和已設定的專案文件提示保留在原生 Codex 通道中。原生 Codex 開發者指令僅接受明確範圍設定為 `codex_app_server` 的指令指導；舊版的全域指令提示保留用於非 Codex 提示介面。 |
| 內容引擎生命週期                    | 支援                                                 | 組裝、攝取、回合後維護和內容引擎壓縮協調會針對 Codex 回合執行。                                                                                                                                                                                                   |
| 動態工具 Hooks                      | 支援                                                 | `before_tool_call`、`after_tool_call` 和工具結果中介軟體會圍繞 OpenClaw 擁有的動態工具執行。                                                                                                                                                                      |
| 生命週期 Hooks                      | 以介面卡觀察的形式提供支援                           | `llm_input`、`llm_output`、`agent_end`、`before_compaction` 和 `after_compaction` 會以真實的 Codex 模式載荷觸發。                                                                                                                                                 |
| 最終答案修訂閘門                    | 透過原生 hook 中繼支援                               | Codex `Stop` 會中繼至 `before_agent_finalize`；`revise` 會要求 Codex 在最終確認前再進行一次模型通過。                                                                                                                                                             |
| 原生 shell、patch 和 MCP 封鎖或觀察 | 透過原生 hook 中繼支援                               | 對於已認可的原生工具介面，包括 Codex app-server `0.125.0` 或更新版本上的 MCP 載荷，Codex `PreToolUse` 和 `PostToolUse` 會被中繼。支援封鎖；不支援引數重寫。                                                                                                       |
| 原生權限原則                        | 透過 Codex app-server 審核和相容性原生 hook 中繼支援 | Codex app-server 審核請求在 Codex 審查後會透過 OpenClaw 路由。`PermissionRequest` 原生 hook 中繼對原生審核模式是選用的，因為 Codex 會在守護者審查之前發出它。                                                                                                     |
| App-server 軌跡擷取                 | 已支援                                               | OpenClaw 會記錄其發送至 app-server 的請求及其接收到的 app-server 通知。                                                                                                                                                                                           |

Codex runtime v1 中不支援：

| 介面                                            | V1 邊界                                                                                             | 未來途徑                                                             |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 原生工具引數變更                                | Codex 原生前置工具 hooks 可以封鎖，但 OpenClaw 不會重寫 Codex 原生工具引數。                        | 需要 Codex hook/schema 支援以進行替換工具輸入。                      |
| 可編輯的 Codex 原生對話紀錄歷史                 | Codex 擁有標準的原生執行緒歷史。OpenClaw 擁有鏡像並可以投射未來上下文，但不應變更不支援的內部結構。 | 如果需要原生執行緒手術，請加入明確的 Codex app-server API。          |
| 用於 Codex 原生工具記錄的 `tool_result_persist` | 該 hook 會轉換 OpenClaw 擁有的對話紀錄寫入，而非 Codex 原生工具記錄。                               | 可以鏡像已轉換的記錄，但標準重寫需要 Codex 支援。                    |
| 豐富的原生壓縮中繼資料                          | OpenClaw 會觀察壓縮的開始和完成，但不會收到穩定的保留/捨棄清單、token 差異或摘要載荷。              | 需要更豐富的 Codex 壓縮事件。                                        |
| 壓縮干預                                        | 在 Codex 模式下，目前的 OpenClaw 壓實掛鉤是通知級別的。                                             | 如果外掛程式需要否決或重寫原生壓實，請新增 Codex 前置/後置壓實掛鉤。 |
| 逐位元組的模型 API 請求捕獲                     | OpenClaw 可以捕獲應用程式伺服器的請求和通知，但 Codex 核心會在內部建構最終的 OpenAI API 請求。      | 需要 Codex 模型請求追蹤事件或除錯 API。                              |

## 原生權限和 MCP 詢問

對於 `PermissionRequest`，當策略決定時，OpenClaw 只會傳回明確的允許或拒絕決策。無決策的結果並非允許。Codex 將其視為無掛鉤決策，並回退至自己的守護者或使用者核准途徑。

Codex 應用程式伺服器核准模式預設會省略此原生掛鉤。當 `permission_request` 被明確包含在 `nativeHookRelay.events` 中，或相容性執行時安裝它時，會套用此行為。

當操作員為 Codex 原生權限請求選擇 `allow-always` 時，OpenClaw 會在有限的會話視窗內記住該確切的提供者/會話/工具輸入/cwd 指紋。記住的決策僅限於故意精確匹配：變更的指令、引數、工具負載或 cwd 會建立一個新的核准。

當 Codex 將 `_meta.codex_approval_kind` 標記為 `"mcp_tool_call"` 時，Codex MCP 工具核准詢問會透過 OpenClaw 的外掛程式核准流程進行路由。Codex `request_user_input` 提示會傳回原始聊天，且下一個排隊的後續訊息會回答該原生伺服器請求，而不是作為額外語境被引導。其他 MCP 詢問請求會以封閉方式失敗。

## 佇列引導

作用中執行佇列引導對應至 Codex 應用程式伺服器 `turn/steer`。使用預設的 `messages.queue.mode: "steer"`，OpenClaw 會在設定的安靜視窗內批次處理引導模式的聊天訊息，並依照到達順序將其作為一個 `turn/steer` 請求傳送。

Codex 審查和手動壓合輪次可以拒絕同輪次導向。在這種情況下，OpenClaw 會等待目前運行完成後再開始提示。當訊息預設應該排隊而不是導向時，請使用 `/queue followup` 或 `/queue collect`。請參閱 [導向佇列](/zh-Hant/concepts/queue-steering)。

## Codex 回饋上傳

當針對使用原生 Codex harness 的階段核准 `/diagnostics [note]` 時，OpenClaw 也會針對相關的 Codex 執行緒呼叫 Codex app-server `feedback/upload`。上傳會要求 app-server 包含每個列出的執行緒和產生的 Codex 子執行緒的日誌（如果有的話）。

上傳會透過 Codex 的正常回饋路徑傳送到 OpenAI 伺服器。如果該 app-server 中停用了 Codex 回饋，該指令會回傳 app-server 錯誤。完成的診斷回覆會列出已傳送執行緒的頻道、OpenClaw 階段 ID、Codex 執行緒 ID 和本機 `codex resume <thread-id>` 指令。

如果您拒絕或忽略該核准，OpenClaw 將不會列印那些 Codex ID，也不會傳送 Codex 回饋。上傳不會取代本機 Gateway 診斷匯出。關於核准、隱私、本機套件和群組聊天行為，請參閱 [診斷匯出](/zh-Hant/gateway/diagnostics)。

僅當您特別需要目前附加執行緒的 Codex 回饋上傳而不需要完整的 Gateway 診斷套件時，才使用 `/codex diagnostics [note]`。

## 壓合與文字紀錄鏡像

當選取的模型使用 Codex harness 時，除非作用中的內容引擎宣告 `ownsCompaction: true`，否則原生執行緒壓合會委派給 Codex app-server。擁有的內容引擎會先進行壓合，並導致 OpenClaw 捨棄舊的 Codex 後端執行緒，以便下一輪可以從引擎管理的內容重新填充新的執行緒。OpenClaw 會保留文字紀錄鏡像以供頻道歷史、搜尋、`/new`、`/reset` 以及未來的模型或 harness 切換使用。

當內容引擎請求 Codex 執行緒啟動預測時，OpenClaw 會將工具呼叫名稱和 ID、輸入形狀以及編輯過的工具結果內容投射到新的 Codex 執行緒中。它不會將原始工具呼叫引數值複製到該預測中。

鏡像包含用戶提示、最終助手文字，以及當應用伺服器發出時的輕量級 Codex 推理或計畫記錄。目前，OpenClaw 僅記錄原生壓縮的開始和完成訊號。它尚未提供可讀取的壓縮摘要，或壓縮後 Codex 保留哪些條目的可審計清單。

由於 Codex 擁有標準的原生執行緒，`tool_result_persist` 目前不會重寫 Codex 原生的工具結果記錄。它僅在 OpenClaw 撰寫 OpenClaw 擁有的會話文字記錄工具結果時套用。

## 媒體與傳遞

OpenClaw 繼續擁有媒體傳遞和媒體提供者的選擇權。圖片、影片、音樂、PDF、TTS 和媒體理解使用相符的提供者/模型設定，例如 `agents.defaults.imageGenerationModel`、`videoGenerationModel`、`pdfModel` 和 `messages.tts`。

文字、圖片、影片、音樂、TTS、審批和訊息工具輸出繼續透過正常的 OpenClaw 傳遞路徑。媒體產生不需要 PI。當 Codex 發出帶有 `savedPath` 的原生圖片產生項目時，OpenClaw 會透過正常的回覆媒體路徑轉發該確切檔案，即使 Codex 輪次沒有助手文字。

## 相關

- [Codex harness](/zh-Hant/plugins/codex-harness)
- [Codex harness reference](/zh-Hant/plugins/codex-harness-reference)
- [Native Codex plugins](/zh-Hant/plugins/codex-native-plugins)
- [Plugin hooks](/zh-Hant/plugins/hooks)
- [Agent harness plugins](/zh-Hant/plugins/sdk-agent-harness)
- [Diagnostics export](/zh-Hant/gateway/diagnostics)
- [Trajectory export](/zh-Hant/tools/trajectory)
