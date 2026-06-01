---
summary: "Codex 組件的執行時邊界、掛鉤、工具、權限和診斷"
title: "Codex 組件執行時"
read_when:
  - You need the Codex harness runtime support contract
  - You are debugging native Codex tools, hooks, compaction, or feedback upload
  - You are changing plugin behavior across OpenClaw and Codex harness turns
---

本頁面記錄了 Codex harness 回合的執行時期合約。若要進行設定和路由，請從 [Codex harness](/zh-Hant/plugins/codex-harness) 開始。若要查看設定欄位，請參閱 [Codex harness 參考](/zh-Hant/plugins/codex-harness-reference)。

## 概觀

Codex 模式並非底層使用不同模型呼叫的 OpenClaw。Codex 掌管更多原生模型迴圈，而 OpenClaw 則在該邊界周圍調整其外掛、工具、工作階段和診斷介面。

OpenClaw 仍掌管通道路由、工作階段檔案、可見訊息傳遞、OpenClaw 動態工具、核准、媒體傳遞以及對話記錄鏡像。Codex 掌管標準的原生執行緒、原生模型迴圈、原生工具延續以及原生壓縮。

提示路由遵循選取的執行時期，而不僅僅是提供者字串。原生 Codex 回合會接收 Codex 應用伺服器開發者指令，而明確的 OpenClaw 相容路由則會保留正常的 OpenClaw 系統提示，即使它使用 Codex 風格的 OpenAI 驗證或傳輸。

原生 Codex 會根據現用的 Codex 執行緒設定，保留 Codex 擁有的基礎/模型指令和專案文件行為。OpenClaw 會在停用 Codex 內建個性的情況下啟動和恢復原生 Codex 執行緒，以便工作區個性檔案和 OpenClaw 代理程式身分保持權威性。輕量級 OpenClaw 執行仍會保留其現有的專案文件抑制。OpenClaw 開發者指令涵蓋 OpenClaw 執行時期考量，例如來源通道傳遞、OpenClaw 動態工具、ACP 委派、轉接器內容以及現用的代理程式工作區設定檔。OpenClaw 技能目錄加上 `MEMORY.md` 和現用的 `BOOTSTRAP.md` 內容會被投射為原生 Codex 的回合輸入參考內容。

## 執行緒繫結與模型變更

當 OpenClaw 工作階段連接到現有的 Codex 執行緒時，下一個回合會將目前選取的 OpenAI 模型、核准政策、沙箱和服務層級再次傳送至應用伺服器。從 `openai/gpt-5.5` 切換到 `openai/gpt-5.2` 會保留執行緒繫結，但會要求 Codex 使用新選取的模型繼續進行。

## 可見回覆與心跳

當直接/來源聊天回合透過 Codex harness 執行時，可見回覆預設會針對內部 WebChat 介面自動進行最終助理傳遞。這讓 Codex 與 Pi harness 提示合約保持一致：代理程式正常回覆，而 OpenClaw 會將最終文字發布至來源對話。當直接/來源聊天應有意保持最終助理文字私密，除非代理程式呼叫 `message(action="send")`，請設定 `messages.visibleReplies: "message_tool"`。

Codex 心跳回合預設也會在可搜尋的 OpenClaw 工具目錄中取得 `heartbeat_respond`，因此代理可以記錄喚醒應保持靜默還是發出通知，而不需要在最終文字中編碼該控制流程。

專屬於心跳的倡導指引是作為 Codex 協作模式開發者指令在心跳輪次本身發送的。一般的聊天輪次會恢復 Codex Default 模式，而不是在其正常的執行時提示中攜帶心跳哲學。當存在非空的 `HEARTBEAT.md` 時，心跳協作模式指令會讓 Codex 指向該檔案，而不是將其內容內聯。

## Hook 邊界

Codex harness 有三個 Hook 層級：

| 層級                          | 擁有者                | 目的                                                 |
| ----------------------------- | --------------------- | ---------------------------------------------------- |
| OpenClaw 外掛程式 Hooks       | OpenClaw              | 跨 OpenClaw 和 Codex harness 的產品/外掛相容性。     |
| Codex app-server 擴充中介軟體 | OpenClaw 內建外掛程式 | 圍繞 OpenClaw 動態工具的每輪適配器行為。             |
| Codex 原生 Hooks              | Codex                 | 來自 Codex 設定的低階 Codex 生命週期和原生工具策略。 |

OpenClaw 不使用專案或全域 Codex `hooks.json` 檔案來路由 OpenClaw 外掛程式行為。對於支援的原生工具和權限橋接，OpenClaw 為 `PreToolUse`、`PostToolUse`、`PermissionRequest` 和 `Stop` 注入每個執行緒的 Codex 設定。

當啟用 Codex app-server 核准時，意指 `approvalPolicy` 不是 `"never"`，預設注入的原生 Hook 設定會省略 `PermissionRequest`，以便 Codex 的 app-server 審閱者和 OpenClaw 的核准橋接在審閱後處理真正的升級。當操作員需要相容性轉發時，可以明確地將 `permission_request` 加入 `nativeHookRelay.events`。

其他 Codex Hooks（例如 `SessionStart` 和 `UserPromptSubmit`）保持為 Codex 層級的控制項。它們在 v1 合約中不會公開為 OpenClaw 外掛程式 Hooks。

對於 OpenClaw 動態工具，OpenClaw 會在 Codex 要求呼叫之後執行該工具，因此 OpenClaw 會在 harness 適配器中觸發其擁有的外掛程式和中介軟體行為。對於 Codex 原生工具，Codex 擁有標準工具記錄。OpenClaw 可以鏡像選定的事件，但除非 Codex 透過 app-server 或原生 Hook 回呼公開該操作，否則 OpenClaw 無法重寫原生 Codex 執行緒。

Codex 應用程式伺服器報告模式 `PreToolUse` 事件會將外掛程式核准請求
延遲至相符的應用程式伺服器核准。如果 OpenClaw `before_tool_call` 掛鉤
傳回 `requireApproval`，而原生載荷設定報告核准模式
(`openclaw_approval_mode` 為 `"report"`)，原生掛鉤中繼會記錄
外掛程式核准需求並且不傳回原生決策。當 Codex 對於相同的工具使用傳送
應用程式伺服器核准請求時，OpenClaw 會開啟外掛程式
核准提示並將決策對應回 Codex。Codex `PermissionRequest`
事件是獨立的核准路徑，當執行時期設定為使用該橋接時，
仍然可以透過 OpenClaw 核准進行路由。

Codex 應用程式伺服器項目通知也會針對尚未由
原生 `PostToolUse` 中繼涵蓋的原生工具完成項目，提供非同步 `after_tool_call`
觀察。這些觀察僅供遙測和外掛程式
相容性使用；它們無法封鎖、延遲或變更原生工具呼叫。

壓縮和 LLM 生命週期投影來自 Codex 應用程式伺服器
通知和 OpenClaw 配接器狀態，而非原生 Codex 掛鉤指令。
OpenClaw 的 `before_compaction`、`after_compaction`、`llm_input` 和
`llm_output` 事件是配接器層級的觀察，而非 Codex 內部要求或壓縮載荷的逐位元組擷取。

Codex 原生 `hook/started` 和 `hook/completed` 應用程式伺服器通知會
投影為 `codex_app_server.hook` 代理程式事件，用於軌跡和偵錯。
它們不會叫用 OpenClaw 外掛程式掛鉤。

## V1 支援合約

Codex 執行時期 v1 支援：

| 介面                               | 支援                                                  | 原因                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 透過 Codex 進行 OpenAI 模型迴圈    | 已支援                                                | Codex 應用程式伺服器擁有 OpenAI 回合、原生執行緒恢復和原生工具延續。                                                                                                                                                                                                                                                                              |
| OpenClaw 頻道路由和傳遞            | 已支援                                                | Telegram、Discord、Slack、WhatsApp、iMessage 和其他頻道保持在模型執行時期之外。                                                                                                                                                                                                                                                                   |
| OpenClaw 動態工具                  | 已支援                                                | Codex 要求 OpenClaw 執行這些工具，因此 OpenClaw 保持在執行路徑中。                                                                                                                                                                                                                                                                                |
| 提示詞和內容外掛程式               | 已支援                                                | OpenClaw 會將 OpenClaw 專屬的提示/上下文投射到 Codex 輪次中，同時將 Codex 擁有的基礎、模型和已配置的專案文件提示保留在原生 Codex 通道中。對於原生執行緒，OpenClaw 會停用 Codex 的內建性格，因此代理工作區性格文件仍具有權威性。原生 Codex 開發者指令僅接受明確限定於 `codex_app_server` 的指令指引；傳統的全域指令提示則保留給非 Codex 提示介面。 |
| 上下文引擎生命週期                 | 已支援                                                | 圍繞 Codex 輪次進行組裝、攝入以及輪次後維護執行。上下文引擎不會取代原生 Codex 壓縮功能。                                                                                                                                                                                                                                                          |
| 動態工具掛鉤                       | 支援                                                  | `before_tool_call`、`after_tool_call` 和工具結果中介軟體圍繞 OpenClaw 擁有的動態工具執行。                                                                                                                                                                                                                                                        |
| 生命週期掛鉤                       | 作為配接器觀察功能支援                                | `llm_input`、`llm_output`、`agent_end`、`before_compaction` 和 `after_compaction` 會使用真實的 Codex 模式負載觸發。                                                                                                                                                                                                                               |
| 最終答案修訂閘門                   | 透過原生 Hook 中繼支援                                | Codex `Stop` 會被轉發至 `before_agent_finalize`；`revise` 會要求 Codex 在最終確定前再進行一次模型傳遞。                                                                                                                                                                                                                                           |
| 原生 Shell、修補 和 MCP 阻擋或觀察 | 透過原生掛鉤轉發支援                                  | Codex `PreToolUse` 和 `PostToolUse` 會針對承諾的原生工具介面進行轉發，包括 Codex 應用程式伺服器 `0.125.0` 或更新版本上的 MCP 負載。支援阻擋功能；不支援引數重寫。                                                                                                                                                                                 |
| 原生權限政策                       | 透過 Codex 應用程式伺服器核准和相容性原生掛鉤轉發支援 | Codex 應用程式伺服器核准請求會在 Codex 審查後路由通過 OpenClaw。`PermissionRequest` 原生掛鉤轉發對於原生核准模式屬於選用功能，因為 Codex 會在守護者審查之前發出該事件。                                                                                                                                                                           |
| 應用程式伺服器軌跡擷取             | 支援                                                  | OpenClaw 會記錄其傳送至應用程式伺服器的請求，以及其接收到的應用程式伺服器通知。                                                                                                                                                                                                                                                                   |

Codex 執行階段 v1 中不支援：

| 介面                                            | V1 邊界                                                                                             | 未來路徑                                                             |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 原生工具引數變異                                | Codex 原生前置工具掛鉤可以阻擋，但 OpenClaw 不會重寫 Codex 原生工具引數。                           | 需要 Codex 掛鉤/架構支援以進行替換工具輸入。                         |
| 可編輯的 Codex 原生逐字稿歷史                   | Codex 擁有正規的原生執行緒歷史。OpenClaw 擁有鏡像並可以投射未來上下文，但不應變更不支援的內部結構。 | 如果需要原生執行緒手術，請新增明確的 Codex 應用程式伺服器 API。      |
| `tool_result_persist` 適用於 Codex 原生工具記錄 | 該掛鉤轉換 OpenClaw 擁有的逐字稿寫入，而非 Codex 原生工具記錄。                                     | 可以鏡像轉換後的記錄，但正規重寫需要 Codex 支援。                    |
| 豐富的原生壓縮元資料                            | OpenClaw 可以請求原生壓縮，但不會收到穩定的保留/丟棄清單、權杖增量、完成摘要或摘要載荷。            | 需要更豐富的 Codex 壓縮事件。                                        |
| 壓縮干預                                        | OpenClaw 不允許外掛程式或上下文引擎否決、重寫或替換原生 Codex 壓縮。                                | 如果外掛程式需要否決或重寫原生壓縮，請新增 Codex 壓縮前/壓縮後掛鉤。 |
| 逐位元組的模型 API 請求擷取                     | OpenClaw 可以擷取應用程式伺服器請求和通知，但 Codex 核心會在內部建構最終的 OpenAI API 請求。        | 需要 Codex 模型請求追蹤事件或偵錯 API。                              |

## 原生權限與 MCP 誘導

對於 `PermissionRequest`，當原則決定時，OpenClaw 只會傳回明確的允許或拒絕決策。無決策的結果並非允許。Codex 將其視為無掛鉤決策，並回退至自己的監護人或使用者核准路徑。

Codex 應用程式伺服器核准模式預設會省略此原生掛鉤。當 `permission_request` 被明確包含在 `nativeHookRelay.events` 中，或相容性執行時間安裝它時，會套用此行為。

當操作員為 Codex 原生權限請求選擇 `allow-always` 時，OpenClaw 會記住該確切的提供者/工作階段/工具輸入/cwd 指紋，用於有界工作階段視窗。記住的決策僅限於精確比對：變更的指令、引數、工具載荷或 cwd 會建立新的核准。

當 Codex 標記 `_meta.codex_approval_kind` 為 `"mcp_tool_call"` 時，Codex MCP 工具批准提示會透過 OpenClaw 的外掛程式批准流程進行路由。Codex `request_user_input` 提示會傳回來源聊天，下一個排入佇列的後續訊息會回答該原生伺服器請求，而不是作為額外上下文被導引。其他 MCP 提示請求會以失敗封閉處理。

關於承載這些提示的一般外掛程式批准流程，請參閱 [外掛程式權限請求](/zh-Hant/plugins/plugin-permission-requests)。

## 佇列導引

執行中佇列導引對應到 Codex 應用程式伺服器的 `turn/steer`。使用預設的 `messages.queue.mode: "steer"` 時，OpenClaw 會為設定的靜止視窗將導引模式聊天訊息分批處理，並依抵達順序將其作為一個 `turn/steer` 請求傳送。

Codex 檢視和手動壓縮輪次可以拒絕同輪次導引。在這種情況下，OpenClaw 會等待執行中操作完成，然後再啟動提示。當訊息應預設進入佇列而非導引時，請使用 `/queue followup` 或 `/queue collect`。請參閱 [導引佇列](/zh-Hant/concepts/queue-steering)。

## Codex 意見回饋上傳

當對使用原生 Codex 擴充程式的工作階段批准 `/diagnostics [note]` 時，OpenClaw 也會為相關的 Codex 執行緒呼叫 Codex 應用程式伺服器的 `feedback/upload`。上傳會要求應用程式伺服器在可用時包含每個列出的執行緒及衍生 Codex 子執行緒的日誌。

上傳會透過 Codex 的正常意見回饋路徑傳送至 OpenAI 伺服器。如果該應用程式伺服器中停用了 Codex 意見回饋，該指令會傳回應用程式伺服器錯誤。完成的診斷回覆會列出已傳送執行緒的頻道、OpenClaw 工作階段 ID、Codex 執行緒 ID 和本機 `codex resume <thread-id>` 指令。

如果您拒絕或忽略批准，OpenClaw 將不會列印那些 Codex ID，也不會傳送 Codex 意見回饋。上傳不會取代本機 Gateway 診斷匯出。關於批准、隱私、本機套件和群組聊天行為，請參閱 [診斷匯出](/zh-Hant/gateway/diagnostics)。

僅當您特別需要目前附加執行緒的 Codex 回饋上傳，而不需要完整的 Gateway 診斷套件時，才使用 `/codex diagnostics [note]`。

## 壓縮和文字記錄鏡像

當選取的模型使用 Codex harness 時，原生執行緒壓縮屬於 Codex app-server。OpenClaw 不會為 Codex 回合執行飛前壓縮，不會用 context-engine 壓縮取代 Codex 壓縮，也不會在無法啟動原生 Codex 壓縮時退回到 OpenClaw 或公開 OpenAI 摘要。OpenClaw 為頻道歷史、搜尋、`/new`、`/reset` 以及未來的模型或 harness 切換保留文字記錄鏡像。

明確的壓縮請求，例如 `/compact` 或外掛程式要求的手動壓縮操作，會使用 `thread/compact/start` 啟動原生 Codex 壓縮。OpenClaw 在啟動該原生操作後即返回。它不會等待完成、施加單獨的 OpenClaw 逾時、重新啟動共用的 Codex app-server，或將該操作記錄為 OpenClaw 完成的壓縮。

當 context engine 要求 Codex 執行緒啟動投影時，OpenClaw 會將工具呼叫名稱和 ID、輸入形狀以及編輯過的工具結果內容投影到新的 Codex 執行緒中。它不會將原始工具呼叫引數值複製到該投影中。

當 app-server 發出時，鏡像包含使用者提示、最終助理文字以及輕量級 Codex 推理或計畫記錄。目前，OpenClaw 僅在要求壓縮時記錄明確的原生壓縮啟動訊號。它不會顯示人類可讀的壓縮摘要或 Codex 壓縮後保留項目的可稽核清單。

因為 Codex 擁有標準的原生執行緒，`tool_result_persist` 目前不會重寫 Codex 原生工具結果記錄。它僅在 OpenClaw 寫入 OpenClaw 擁有的會話文字記錄工具結果時適用。

## 媒體和傳遞

OpenClaw 繼續負責媒體傳遞和媒體提供者選擇。圖片、影片、音樂、PDF、TTS 和媒體理解使用相符的提供者/模型設定，例如 `agents.defaults.imageGenerationModel`、`videoGenerationModel`、`pdfModel` 和 `messages.tts`。

文字、圖片、影片、音樂、TTS、審核和訊息工具輸出會繼續透過正常的 OpenClaw 傳遞路徑進行。媒體生成不需要舊版執行環境。當 Codex 發出具有 `savedPath` 的原生圖片生成項目時，OpenClaw 會透過正常的回覆媒體路徑轉送該確切檔案，即使 Codex 輪次沒有助理文字。

## 相關

- [Codex harness](/zh-Hant/plugins/codex-harness)
- [Codex harness reference](/zh-Hant/plugins/codex-harness-reference)
- [Native Codex plugins](/zh-Hant/plugins/codex-native-plugins)
- [Plugin hooks](/zh-Hant/plugins/hooks)
- [Agent harness plugins](/zh-Hant/plugins/sdk-agent-harness)
- [Diagnostics export](/zh-Hant/gateway/diagnostics)
- [Trajectory export](/zh-Hant/tools/trajectory)
