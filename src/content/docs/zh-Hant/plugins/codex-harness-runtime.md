---
summary: "Codex 組件的執行時邊界、掛鉤、工具、權限和診斷"
title: "Codex 組件執行時"
read_when:
  - You need the Codex harness runtime support contract
  - You are debugging native Codex tools, hooks, compaction, or feedback upload
  - You are changing plugin behavior across OpenClaw and Codex harness turns
---

本頁面記錄了 Codex harness 輪次的運行時契約。如需設定和路由，請從 [Codex harness](/zh-Hant/plugins/codex-harness) 開始。如需設定欄位，請參閱 [Codex harness 參考](/zh-Hant/plugins/codex-harness-reference)。

## 概觀

Codex 模式並非底層使用不同模型呼叫的 OpenClaw。Codex 掌管更多原生模型迴圈，而 OpenClaw 則在該邊界周圍調整其外掛、工具、工作階段和診斷介面。

OpenClaw 仍掌管通道路由、工作階段檔案、可見訊息傳遞、OpenClaw 動態工具、核准、媒體傳遞以及對話記錄鏡像。Codex 掌管標準的原生執行緒、原生模型迴圈、原生工具延續以及原生壓縮。

提示路由遵循選取的執行時期，而不僅僅是提供者字串。原生 Codex 回合會接收 Codex 應用伺服器開發者指令，而明確的 OpenClaw 相容路由則會保留正常的 OpenClaw 系統提示，即使它使用 Codex 風格的 OpenAI 驗證或傳輸。

原生 Codex 根據現有的 Codex thread 設定，保留 Codex 擁有的 base/model 指令和 project-doc 行為。OpenClaw 啟動並恢復原生 Codex threads 時會停用 Codex 內建的人格，因此 workspace 人格檔案和 OpenClaw agent 身份會保持權威。輕量級 OpenClaw 執行仍會保留其現有的 project-doc 抑制設定。OpenClaw 開發者指令涵蓋了 OpenClaw 執行時期的關注事項，例如來源通道傳遞、OpenClaw 動態工具、ACP 委派、配接器內容以及作用中的 agent workspace 設定檔。OpenClaw 技能目錄和工具路由的 `MEMORY.md` 指標會被投影為原生 Codex 的輪次範圍協作開發者指令。作用中的 `BOOTSTRAP.md` 內容和完整的 `MEMORY.md` 後備注入仍會使用輪次輸入參考內容。

## 執行緒繫結與模型變更

當 OpenClaw 會話附加到現有的 Codex thread 時，下一個輪次會再次將目前選取的 OpenAI 模型、核准原則、沙箱和服務等級傳送給 app-server。從 `openai/gpt-5.5` 切換到 `openai/gpt-5.2` 會保留 thread 繫結，但會要求 Codex 使用新選取的模型繼續。

## 可見回覆與心跳

當直接/來源聊天輪次透過 Codex harness 執行時，可見回覆預設為內部 WebChat 介面的自動最終助理傳遞。這使 Codex 與 Pi harness 提示契約保持一致：agents 正常回覆，而 OpenClaw 將最終文字張貼到來源對話。當直接/來源聊天應刻意保留最終助理文字為私有時，請設定 `messages.visibleReplies: "message_tool"`，除非 agent 呼叫 `message(action="send")`。

Codex heartbeat 輪次預設也會在可搜尋的 OpenClaw 工具目錄中取得 `heartbeat_respond`，因此 agent 可以記錄喚醒應保持安靜還是發出通知，而無需在最終文字中編碼該控制流程。

針對心跳的特定主動指引會作為 Codex 協作模式開發者指令，在心跳回合本身發送。一般聊天回合會恢復 Codex 預設模式，而不是在其正常執行時期提示中承載心跳哲學。當存在非空的 `HEARTBEAT.md` 時，心跳協作模式指令會讓 Codex 指向該檔案，而不是將其內容內聯。

## Hook 邊界

Codex harness 有三個 Hook 層級：

| 層級                          | 擁有者                | 目的                                                 |
| ----------------------------- | --------------------- | ---------------------------------------------------- |
| OpenClaw 外掛程式 Hooks       | OpenClaw              | 跨 OpenClaw 和 Codex harness 的產品/外掛相容性。     |
| Codex app-server 擴充中介軟體 | OpenClaw 內建外掛程式 | 圍繞 OpenClaw 動態工具的每輪適配器行為。             |
| Codex 原生 Hooks              | Codex                 | 來自 Codex 設定的低階 Codex 生命週期和原生工具策略。 |

OpenClaw 不使用專案或全域 Codex `hooks.json` 檔案來路由 OpenClaw 外掛程式行為。對於支援的原生工具和權限橋接器，OpenClaw 會為 `PreToolUse`、`PostToolUse`、`PermissionRequest` 和 `Stop` 注入個別執行緒的 Codex 設定。

當啟用 Codex 應用程式伺服器審核時，意即 `approvalPolicy` 不是 `"never"`，預設注入的原生 Hook 設定會省略 `PermissionRequest`，以便 Codex 的應用程式伺服器審核者和 OpenClaw 的審核橋接器在審核後處理真正的升級。當操作員需要相容性中繼時，可以明確將 `permission_request` 新增至 `nativeHookRelay.events`。

其他 Codex Hook（例如 `SessionStart` 和 `UserPromptSubmit`）仍維持為 Codex 層級的控制項。它們在 v1 契約中不會公開為 OpenClaw 外掛程式 Hook。

對於 OpenClaw 動態工具，OpenClaw 會在 Codex 要求呼叫之後執行該工具，因此 OpenClaw 會在 harness 適配器中觸發其擁有的外掛程式和中介軟體行為。對於 Codex 原生工具，Codex 擁有標準工具記錄。OpenClaw 可以鏡像選定的事件，但除非 Codex 透過 app-server 或原生 Hook 回呼公開該操作，否則 OpenClaw 無法重寫原生 Codex 執行緒。

Codex 應用程式伺服器報告模式 `PreToolUse` 事件會將外掛程式審核請求延後至相符的應用程式伺服器審核。如果 OpenClaw `before_tool_call` Hook 傳回 `requireApproval`，而原生負載設定報告審核模式（`openclaw_approval_mode` 為 `"report"`），原生 Hook 中繼會記錄外掛程式審核需求，且不傳回原生決策。當 Codex 針對相同的工具使用傳送應用程式伺服器審核請求時，OpenClaw 會開啟外掛程式審核提示，並將決策對應回 Codex。Codex `PermissionRequest` 事件是獨立的審核路徑，當執行時期設定為該橋接器時，仍可透過 OpenClaw 審核進行路由。

Codex 應用程式伺服器項目通知也為原生工具完成提供非同步 `after_tool_call` 觀察，這些工具完成尚未由原生 `PostToolUse` 中繼涵蓋。這些觀察僅供遙測和外掛程式相容性使用；它們無法阻擋、延遲或修改原生工具呼叫。

壓縮和 LLM 生命週期投射來自 Codex 應用程式伺服器通知和 OpenClaw 配接器狀態，而非來自原生 Codex hook 指令。OpenClaw 的 `before_compaction`、`after_compaction`、`llm_input` 和 `llm_output` 事件是配接器層級的觀察，並非 Codex 內部請求或壓縮載荷的逐位元組擷取。

Codex 原生 `hook/started` 和 `hook/completed` 應用程式伺服器通知會被投射為 `codex_app_server.hook` 代理程式事件，用於軌跡記錄和偵錯。它們不會叫用 OpenClaw 外掛程式 hook。

## V1 支援合約

Codex 執行時期 v1 支援：

| 介面                               | 支援                                                  | 原因                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 透過 Codex 進行 OpenAI 模型迴圈    | 已支援                                                | Codex 應用程式伺服器擁有 OpenAI 回合、原生執行緒恢復和原生工具延續。                                                                                                                                                                                                                                                                          |
| OpenClaw 頻道路由和傳遞            | 已支援                                                | Telegram、Discord、Slack、WhatsApp、iMessage 和其他頻道保持在模型執行時期之外。                                                                                                                                                                                                                                                               |
| OpenClaw 動態工具                  | 已支援                                                | Codex 要求 OpenClaw 執行這些工具，因此 OpenClaw 保持在執行路徑中。                                                                                                                                                                                                                                                                            |
| 提示詞和內容外掛程式               | 已支援                                                | OpenClaw 會將 OpenClaw 特定的提示/情境投射到 Codex 回合中，同時將 Codex 擁有的基底、模型和已設定的專案文件提示保留在原生 Codex 通道中。OpenClaw 會停用原生執行緒的 Codex 內建人設，以便代理程式工作區人設檔案保持權威。原生 Codex 開發者指令僅接受明確限定範圍至 `codex_app_server` 的指令指引；舊版的全域指令提示則保留給非 Codex 提示介面。 |
| 上下文引擎生命週期                 | 已支援                                                | 圍繞 Codex 輪次進行組裝、攝入以及輪次後維護執行。上下文引擎不會取代原生 Codex 壓縮功能。                                                                                                                                                                                                                                                      |
| 動態工具掛鉤                       | 支援                                                  | `before_tool_call`、`after_tool_call` 和工具結果中介軟體會在 OpenClaw 擁有的動態工具周圍執行。                                                                                                                                                                                                                                                |
| 生命週期掛鉤                       | 作為配接器觀察功能支援                                | `llm_input`、`llm_output`、`agent_end`、`before_compaction` 和 `after_compaction` 會以真實的 Codex 模式載荷觸發。                                                                                                                                                                                                                             |
| 最終答案修訂閘門                   | 透過原生 Hook 中繼支援                                | Codex `Stop` 會中繼至 `before_agent_finalize`；`revise` 會在完成前要求 Codex 再進行一次模型傳遞。                                                                                                                                                                                                                                             |
| 原生 Shell、修補 和 MCP 阻擋或觀察 | 透過原生掛鉤轉發支援                                  | Codex `PreToolUse` 和 `PostToolUse` 會針對已認可的原生工具介面進行中繼，包括 Codex 應用程式伺服器 `0.125.0` 或更新版本上的 MCP 載荷。支援阻擋；不支援引數重寫。                                                                                                                                                                               |
| 原生權限政策                       | 透過 Codex 應用程式伺服器核准和相容性原生掛鉤轉發支援 | Codex 應用程式伺服器核准請求在 Codex 審查後會透過 OpenClaw 路由。`PermissionRequest` 原生 Hook 中繼對於原生核准模式為選用，因為 Codex 會在 Guardian 審查之前發出它。                                                                                                                                                                          |
| 應用程式伺服器軌跡擷取             | 支援                                                  | OpenClaw 會記錄其傳送至應用程式伺服器的請求，以及其接收到的應用程式伺服器通知。                                                                                                                                                                                                                                                               |

Codex 執行階段 v1 中不支援：

| 介面                                            | V1 邊界                                                                                             | 未來路徑                                                             |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 原生工具引數變異                                | Codex 原生前置工具掛鉤可以阻擋，但 OpenClaw 不會重寫 Codex 原生工具引數。                           | 需要 Codex 掛鉤/架構支援以進行替換工具輸入。                         |
| 可編輯的 Codex 原生逐字稿歷史                   | Codex 擁有正規的原生執行緒歷史。OpenClaw 擁有鏡像並可以投射未來上下文，但不應變更不支援的內部結構。 | 如果需要原生執行緒手術，請新增明確的 Codex 應用程式伺服器 API。      |
| 用於 Codex 原生工具記錄的 `tool_result_persist` | 該掛鉤轉換 OpenClaw 擁有的逐字稿寫入，而非 Codex 原生工具記錄。                                     | 可以鏡像轉換後的記錄，但正規重寫需要 Codex 支援。                    |
| 豐富的原生壓縮元資料                            | OpenClaw 可以請求原生壓縮，但不會收到穩定的保留/丟棄清單、權杖增量、完成摘要或摘要載荷。            | 需要更豐富的 Codex 壓縮事件。                                        |
| 壓縮干預                                        | OpenClaw 不允許外掛程式或上下文引擎否決、重寫或替換原生 Codex 壓縮。                                | 如果外掛程式需要否決或重寫原生壓縮，請新增 Codex 壓縮前/壓縮後掛鉤。 |
| 逐位元組的模型 API 請求擷取                     | OpenClaw 可以擷取應用程式伺服器請求和通知，但 Codex 核心會在內部建構最終的 OpenAI API 請求。        | 需要 Codex 模型請求追蹤事件或偵錯 API。                              |

## 原生權限與 MCP 誘導

對於 `PermissionRequest`，當原則決定時，OpenClaw 只會傳回明確的允許或拒絕決策。無決策的結果並非允許。Codex 將其視為無 Hook 決策，並轉而使用其自身的 Guardian 或使用者核准路徑。

Codex 應用程式伺服器核准模式預設會省略此原生 Hook。當明確在 `nativeHookRelay.events` 中包含 `permission_request` 或相容性執行階段安裝它時，會套用此行為。

當操作員針對 Codex 原生權限請求選擇 `allow-always` 時，OpenClaw 會在有限的連線視窗內記住該確切的提供者/連線/工具輸入/cwd 指紋。記住的決策僅限故意精確匹配：變更的指令、引數、工具負載或 cwd 會建立新的核准。

當 Codex 將 `_meta.codex_approval_kind` 標記為 `"mcp_tool_call"` 時，Codex MCP 工具核准徵求會透過 OpenClaw 的外掛程式核准流程路由。Codex `request_user_input` 提示會傳回來源聊天，而下一個排隊的後續訊息會回應該原生伺服器請求，而不是作為額外內容被引導。其他 MCP 徵求請求會失敗並關閉。

若要了解攜帶這些提示的一般外掛程式核准流程，請參閱 [外掛程式權限請求](/zh-Hant/plugins/plugin-permission-requests)。

## 佇列導引

作用中執行佇列引導會對應至 Codex 應用程式伺服器 `turn/steer`。使用預設的 `messages.queue.mode: "steer"`，OpenClaw 會針對設定的安靜視窗將引導模式聊天訊息分批，並依抵達順序將其作為一個 `turn/steer` 要求傳送。

Codex 審查和手動壓縮輪次可以拒絕同輪次引導。在該情況下，OpenClaw 會等待作用中執行完成後再開始提示。當訊息應預設進入佇列而非引導時，請使用 `/queue followup` 或 `/queue collect`。請參閱 [引導佇列](/zh-Hant/concepts/queue-steering)。

## Codex 意見回饋上傳

當針對使用原生 Codex harness 的會話批准 `/diagnostics [note]` 時，OpenClaw 也會為相關的 Codex 執行緒呼叫 Codex app-server `feedback/upload`。此上傳會要求 app-server 納入每個列出的執行緒以及產生的 Codex 子執行緒的日誌（如果有的話）。

上傳會透過 Codex 的標準意見回饋路徑傳送至 OpenAI 伺服器。如果該 app-server 停用了 Codex 意見回饋，該指令會回傳 app-server 錯誤。完成的診斷回覆會列出已傳送執行緒的頻道、OpenClaw session id、Codex thread id，以及本機 `codex resume <thread-id>` 指令。

如果您拒絕或忽略該批准，OpenClaw 不會列印那些 Codex id，也不會傳送 Codex 意見回饋。此上傳並不會取代本機 Gateway 診斷匯出。關於批准、隱私、本機套件和群組聊天行為，請參閱 [Diagnostics export](/zh-Hant/gateway/diagnostics)。

僅當您特別想要針對目前附加的執行緒進行 Codex 意見回饋上傳，而不需要完整的 Gateway 診斷套件時，才使用 `/codex diagnostics [note]`。

## 壓縮和文字記錄鏡像

當選取的模型使用 Codex harness 時，原生執行緒壓縮屬於 Codex app-server。OpenClaw 不會針對 Codex 輪次執行試飛壓縮，不會用 context-engine 壓縮取代 Codex 壓縮，且當無法啟動原生 Codex 壓縮時，也不會退回到 OpenClaw 或公開的 OpenAI 摘要生成。OpenClaw 會保留一份逐字稿鏡像，以供頻道紀錄、搜尋、`/new`、`/reset` 以及未來的模型或 harness 切換使用。

明確的壓縮請求，例如 `/compact` 或外掛程式要求的手動壓縮操作，會使用 `thread/compact/start` 啟動原生 Codex 壓縮。OpenClaw 會在啟動該原生操作後立即回傳。它不會等待完成、強制執行個別的 OpenClaw 逾時、重新啟動共用的 Codex app-server，或將該操作記錄為 OpenClaw 已完成的壓縮。

當 context engine 要求 Codex 執行緒啟動投影時，OpenClaw 會將工具呼叫名稱和 ID、輸入形狀以及編輯過的工具結果內容投影到新的 Codex 執行緒中。它不會將原始工具呼叫引數值複製到該投影中。

當 app-server 發出時，鏡像包含使用者提示、最終助理文字以及輕量級 Codex 推理或計畫記錄。目前，OpenClaw 僅在要求壓縮時記錄明確的原生壓縮啟動訊號。它不會顯示人類可讀的壓縮摘要或 Codex 壓縮後保留項目的可稽核清單。

因為 Codex 擁有標準的原生執行緒，`tool_result_persist` 目前不會重寫 Codex 原生工具結果記錄。它僅適用於 OpenClaw 正在寫入 OpenClaw 擁有的會議逐字稿工具結果時。

## 媒體和傳遞

OpenClaw 繼續負責媒體傳遞和媒體提供者選擇。圖片、影片、音樂、PDF、TTS 和媒體理解使用匹配的提供者/模型設定，例如 `agents.defaults.imageGenerationModel`、`videoGenerationModel`、`pdfModel` 和 `messages.tts`。

文字、圖片、影片、音樂、TTS、審批和訊息工具輸出會繼續透過正常的 OpenClaw 傳遞路徑。媒體生成不需要舊版執行時環境。當 Codex 發出帶有 `savedPath` 的原生圖片生成項目時，OpenClaw 會透過正常回覆媒體路徑轉發該確切檔案，即使 Codex 輪次沒有助理文字。

## 相關

- [Codex harness](/zh-Hant/plugins/codex-harness)
- [Codex harness reference](/zh-Hant/plugins/codex-harness-reference)
- [Native Codex plugins](/zh-Hant/plugins/codex-native-plugins)
- [Plugin hooks](/zh-Hant/plugins/hooks)
- [Agent harness plugins](/zh-Hant/plugins/sdk-agent-harness)
- [Diagnostics export](/zh-Hant/gateway/diagnostics)
- [Trajectory export](/zh-Hant/tools/trajectory)
