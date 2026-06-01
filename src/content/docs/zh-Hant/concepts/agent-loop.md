---
summary: "Agent loop lifecycle, streams, and wait semantics"
read_when:
  - You need an exact walkthrough of the agent loop or lifecycle events
  - You are changing session queueing, transcript writes, or session write lock behavior
title: "Agent loop"
---

Agentic 迴圈是 Agent 的完整「真實」運行過程：intake → context assembly → model inference → tool execution → streaming replies → persistence。這是一條權威路徑，將訊息轉化為動作和最終回覆，同時保持 session 狀態一致。

在 OpenClaw 中，loop 是每個會話單一、序列化的執行過程，隨著模型思考、呼叫工具和串流輸出而發出生命週期和串流事件。本文說明了該真實 loop 端到端的連接方式。

## 進入點

- Gateway RPC：`agent` 和 `agent.wait`。
- CLI：`agent` 指令。

## 運作方式（高階）

1. `agent` RPC 會驗證參數、解析會話（sessionKey/sessionId）、保存會話元資料，並立即傳回 `{ runId, acceptedAt }`。
2. `agentCommand` 執行 agent：
   - 解析模型與 thinking/verbose/trace 預設值
   - 載入技能快照
   - 呼叫 `runEmbeddedAgent` (OpenClaw agent runtime)
   - 如果內嵌 loop 未發出，則發出 **lifecycle end/error**
3. `runEmbeddedAgent`：
   - 透過每個會話 + 全域佇列序列化執行
   - 解析模型 + 設定檔並建立 OpenClaw session
   - 訂閱執行時期事件並串流助理/工具差異
   - 執行逾時 -> 若超過則中止執行
   - 對於 Codex app-server 週期，終止一個已接受的、在終止事件前停止產生 app-server 進度的週期。
   - returns payloads + usage metadata
4. `subscribeEmbeddedAgentSession` 將代理執行時期事件橋接至 OpenClaw `agent` 串流：
   - tool events => `stream: "tool"`
   - assistant deltas => `stream: "assistant"`
   - lifecycle events => `stream: "lifecycle"` (`phase: "start" | "end" | "error"`)
5. `agent.wait` 使用 `waitForAgentRun`：
   - waits for **lifecycle end/error** for `runId`
   - returns `{ status: ok|error|timeout, startedAt, endedAt, error? }`

## Queueing + concurrency

- Runs are serialized per session key (session lane) and optionally through a global lane.
- This prevents tool/session races and keeps session history consistent.
- 訊息傳遞通道可以選擇提供給此通道系統的佇列模式（steer/followup/collect/interrupt）。
  請參閱 [Command Queue](/zh-Hant/concepts/queue)。
- Transcript 寫入也受到 session 檔案上的 session 寫入鎖保護。該鎖具有程序感知能力且基於檔案，因此可以捕獲繞過進程內佇列或來自其他程序的寫入者。Session transcript 寫入者在報告 session 忙碌前最多等待 `session.writeLock.acquireTimeoutMs`；預設值為 `60000` 毫秒。
- Session 寫入鎖預設為不可重入。如果輔助程式在保留一個邏輯寫入者的同時故意嵌套獲取同一個鎖，則必須透過 `allowReentrant: true` 明確選擇加入。

## 工作階段 + 工作區準備

- 解析並建立工作區；沙箱執行可能會重新導向至沙箱工作區根目錄。
- 載入技能（或從快照重複使用）並將其注入環境與提示中。
- 解析啟動/情境檔案並將其注入系統提示報告中。
- 獲取 session 寫入鎖；`SessionManager` 會在串流之前開啟並準備就緒。任何後續的 transcript 重寫、壓縮或截斷路徑都必須在開啟或變更 transcript 檔案之前取得相同的鎖。

## 提示組裝 + 系統提示

- System prompt 是由 OpenClaw 的 base prompt、skills prompt、bootstrap context 和每次運行的覆寫組建而成。
- 會強制執行特定模型的限制與壓縮保留權杖。
- 關於模型看到的內容，請參閱 [System prompt](/zh-Hant/concepts/system-prompt)。

## 掛載點（您可以攔截的地方）

OpenClaw 有兩個掛載系統：

- **內部掛載**（閘道掛載）：用於指令與生命週期事件的事件驅動腳本。
- **外掛掛載**：代理程式/工具生命週期與閘道管線內的擴充點。

### 內部掛載（閘道掛載）

- **`agent:bootstrap`**：在 system prompt 完成之前，於建構 bootstrap 檔案時執行。使用此項來新增/移除 bootstrap context 檔案。
- **Command hooks**：`/new`、`/reset`、`/stop` 和其他 command 事件（請參閱 Hooks 文件）。

關於設定和範例，請參閱 [Hooks](/zh-Hant/automation/hooks)。

### 外掛掛載（代理程式 + 閘道生命週期）

這些會在代理程式迴圈或閘道管線內執行：

- **`before_model_resolve`**：在 session 之前（無 `messages`）執行，以便在模型解析之前確定性地覆寫 provider/model。
- **`before_prompt_build`**：在載入會話（使用 `messages`）之後、提交提示詞之前執行，以便注入 `prependContext`、`systemPrompt`、`prependSystemContext` 或 `appendSystemContext`。請使用 `prependContext` 來處理每輪的動態文字，以及用於系統提示詞空間中穩定指引的 system-context 欄位。
- **`before_agent_start`**：舊版相容性掛鉤，可能在任一階段執行；建議優先使用上述明確定義的掛鉤。
- **`before_agent_reply`**：在內聯動作之後、LLM 呼叫之前執行，允許外掛宣告該輪次並返回合成回覆，或完全讓該輪次保持靜默。
- **`agent_end`**：在完成後檢查最終訊息列表和執行元資料。
- **`before_compaction` / `after_compaction`**：觀察或註解壓縮週期。
- **`before_tool_call` / `after_tool_call`**：攔截工具參數/結果。
- **`before_install`**：檢查內建的掃描結果，並選擇性地阻擋技能或外掛的安裝。
- **`tool_result_persist`**：在工具結果寫入 OpenClaw 擁有的會話紀錄之前，同步轉換這些結果。
- **`message_received` / `message_sending` / `message_sent`**：輸入與輸出訊息掛鉤。
- **`session_start` / `session_end`**：會議生命週期邊界。
- **`gateway_start` / `gateway_stop`**：閘道生命週期事件。

傳出/工具防護的 Hook 決策規則：

- `before_tool_call`：`{ block: true }` 是終止狀態，會停止較低優先級的處理程序。
- `before_tool_call`：`{ block: false }` 是無操作（no-op），不會清除先前的阻擋。
- `before_install`：`{ block: true }` 是終止狀態，會停止較低優先級的處理程序。
- `before_install`：`{ block: false }` 是無操作（no-op），不會清除先前的阻擋。
- `message_sending`：`{ cancel: true }` 是終止狀態，會停止較低優先級的處理程序。
- `message_sending`：`{ cancel: false }` 是一個空操作（no-op），不會清除先前的取消動作。

關於 Hook API 和註冊詳細資訊，請參閱 [Plugin hooks](/zh-Hant/plugins/hooks)。

Harness 可能會以不同方式調整這些 hooks。Codex app-server harness 將 OpenClaw plugin hooks 視為已記錄的鏡像表面的相容性契約，而 Codex native hooks 則保持為獨立的較低層級 Codex 機制。

## 串流 + 部分回覆

- 助理差異從代理執行時期串流傳輸，並作為 `assistant` 事件發送。
- 區塊串流可以在 `text_end` 或 `message_end` 上發出部分回覆。
- 推論串流可以作為單獨的串流或作為區塊回覆發出。
- 關於分塊和區塊回覆行為，請參閱 [Streaming](/zh-Hant/concepts/streaming)。

## 工具執行 + 訊息傳遞工具

- 工具開始/更新/結束事件會在 `tool` 串流上發出。
- 工具結果在記錄/發出之前，會對大小和圖像載荷進行清理。
- 會追蹤訊息傳遞工具的發送，以抑制重複的 assistant 確認。

## 回覆塑形 + 抑制

- 最終載荷由以下組成：
  - assistant 文字（和可選的推論）
  - 內嵌工具摘要（當處於詳細模式且允許時）
  - 當模型出錯時的 assistant 錯誤文字
- 精確的靜默 token `NO_REPLY` / `no_reply` 會從
  外傳載荷中過濾掉。
- 重複的訊息傳遞工具會從最終載荷列表中移除。
- 如果沒有剩餘的可呈現載荷且工具發生錯誤，將發出後備工具錯誤回覆
  （除非訊息傳遞工具已經發送了用戶可見的回覆）。

## 壓縮 + 重試

- 自動壓縮會發出 `compaction` 串流事件，並可能觸發重試。
- 重試時，會重置記憶體緩衝區和工具摘要，以避免重複輸出。
- 關於壓縮管線，請參閱 [Compaction](/zh-Hant/concepts/compaction)。

## 事件串流（目前）

- `lifecycle`：由 `subscribeEmbeddedAgentSession` 發送（並作為備援由 `agentCommand` 發送）
- `assistant`：來自代理執行時期的串流差異
- `tool`：來自代理執行時期的串流工具事件

## 聊天頻道處理

- Assistant 增量會被緩衝到聊天 `delta` 訊息中。
- 在 **生命週期結束/錯誤** 時會發出聊天 `final`。

## 逾時

- `agent.wait` 預設：30秒（僅指等待時間）。`timeoutMs` 參數可覆蓋此設定。
- 代理執行時期：`agents.defaults.timeoutSeconds` 預設值為 172800s（48小時）；在 `runEmbeddedAgent` 中止計時器中執行。
- Cron 執行時間：獨立的 agent 輪次 `timeoutSeconds` 由 cron 擁有。排程器會在執行開始時啟動該計時器，在設定的截止時間中止底層執行，然後在記錄逾時之前執行有界的清理工作，以免過期的子會話阻塞通道。
- Session 活力診斷：啟用診斷後，`diagnostics.stuckSessionWarnMs` 會對長時間 `processing` 且未觀察到回覆、工具、狀態、區塊或 ACP 進度的 session 進行分類。進行中的嵌入式執行、模型呼叫和工具呼叫會回報為 `session.long_running`；進行中但最近無進度回報的工作會回報為 `session.stalled`；`session.stuck` 保留給可恢復的停滯 session 管理使用，包括具有陳舊無主模型/工具活動的閒置佇列 session。停滯 session 管理會在恢復閘門通過後立即釋放受影響的 session 軌道；停頓的嵌入式執行僅在 `diagnostics.stuckSessionAbortMs`（預設值：至少 5 分鐘且為警告閾值的 3 倍）之後才會中止排空，以便佇列工作可以恢復而不會中斷僅僅緩慢的執行。恢復會發送結構化的請求/完成結果，並且僅當相同的處理世代仍為目前世代時，診斷狀態才會被標記為閒置。重複的 `session.stuck` 診斷會在 session 保持不變時退避。
- 模型閒置逾時：當在閒置視窗內沒有收到回應區塊時，OpenClaw 會中止模型請求。`models.providers.<id>.timeoutSeconds` 會針對緩慢的本機/自託管提供者延長此閒置監視，但它仍然受限於任何較低的 `agents.defaults.timeoutSeconds` 或特定執行的逾時，因為這些控制整個代理程式執行。否則，OpenClaw 在設定時使用 `agents.defaults.timeoutSeconds`，預設上限為 120 秒。沒有明確模型或代理程式逾時的 Cron 觸發執行會停用閒置監視，並依賴 cron 外部逾時。
- 提供者 HTTP 請求逾時：`models.providers.<id>.timeoutSeconds` 適用於該提供者的模型 HTTP 獲取，包括連線、標頭、主體、SDK 請求逾時、總受防護獲取中止處理以及模型串流閒置監視程式。在提高整個代理程式執行階段逾時之前，請先針對緩慢的本機/自託管提供者（例如 Ollama）使用此設定，並且當模型請求需要執行更長時間時，請將代理程式/執行階段逾時維持在至少相同的高度。

## 提前終止的位置

- Agent 逾時（中止）
- AbortSignal（取消）
- Gateway 中斷連線或 RPC 逾時
- `agent.wait` 逾時（僅等待，不停止代理程式）

## 相關內容

- [工具](/zh-Hant/tools) — 可用的代理程式工具
- [鉤點](/zh-Hant/automation/hooks) — 由代理程式生命週期事件觸發的事件驅動腳本
- [壓縮](/zh-Hant/concepts/compaction) — 長對話的摘要方式
- [執行核准](/zh-Hant/tools/exec-approvals) — Shell 指令的核准閘門
- [思考](/zh-Hant/tools/thinking) — 思考/推理層級設定
