---
summary: "Agent loop lifecycle, streams, and wait semantics"
read_when:
  - You need an exact walkthrough of the agent loop or lifecycle events
  - You are changing session queueing, transcript writes, or session write lock behavior
title: "Agent Loop"
---

# Agent Loop (OpenClaw)

An agentic loop is the full “real” run of an agent: intake → context assembly → model inference →
tool execution → streaming replies → persistence. It’s the authoritative path that turns a message
into actions and a final reply, while keeping session state consistent.

In OpenClaw, a loop is a single, serialized run per session that emits lifecycle and stream events
as the model thinks, calls tools, and streams output. This doc explains how that authentic loop is
wired end-to-end.

## Entry points

- Gateway RPC: `agent` and `agent.wait`.
- CLI: `agent` command.

## How it works (high-level)

1. `agent` RPC validates params, resolves session (sessionKey/sessionId), persists session metadata, returns `{ runId, acceptedAt }` immediately.
2. `agentCommand` runs the agent:
   - 解析模型 + 思考/詳細/追蹤預設值
   - loads skills snapshot
   - calls `runEmbeddedPiAgent` (pi-agent-core runtime)
   - emits **lifecycle end/error** if the embedded loop does not emit one
3. `runEmbeddedPiAgent`:
   - serializes runs via per-session + global queues
   - resolves model + auth profile and builds the pi session
   - subscribes to pi events and streams assistant/tool deltas
   - enforces timeout -> aborts run if exceeded
   - returns payloads + usage metadata
4. `subscribeEmbeddedPiSession` bridges pi-agent-core events to OpenClaw `agent` stream:
   - tool events => `stream: "tool"`
   - assistant deltas => `stream: "assistant"`
   - lifecycle events => `stream: "lifecycle"` (`phase: "start" | "end" | "error"`)
5. `agent.wait` 使用 `waitForAgentRun`：
   - waits for **lifecycle end/error** for `runId`
   - returns `{ status: ok|error|timeout, startedAt, endedAt, error? }`

## Queueing + concurrency

- Runs are serialized per session key (session lane) and optionally through a global lane.
- This prevents tool/session races and keeps session history consistent.
- 訊息通道可以選擇佇列模式（collect/steer/followup）來饋送此車道系統。
  請參閱[指令佇列](/zh-Hant/concepts/queue)。
- 對話記錄的寫入也會受到工作階段檔案上的寫入鎖定保護。此鎖定具備程序感知能力且基於檔案，因此能夠攔截繞過程序內佇列或來自其他程序的寫入者。
- 工作階段寫入鎖定預設為不可重入。如果輔助程式有意在保持單一邏輯寫入者的同時巢狀取得同一個鎖定，則必須使用 `allowReentrant: true` 明確加入。

## 工作階段 + 工作區準備

- 解析並建立工作區；沙箱執行可能會重新導向至沙箱工作區根目錄。
- 載入技能（或從快照重複使用）並將其注入環境與提示中。
- 解析啟動/情境檔案並將其注入系統提示報告中。
- 取得工作階段寫入鎖定；`SessionManager` 會在串流之前開啟並準備就緒。任何後續的對話記錄重寫、壓縮或截斷路徑，都必須在開啟或變更對話記錄檔案之前取得同一個鎖定。

## 提示組裝 + 系統提示

- 系統提示由 OpenClaw 的基本提示、技能提示、啟動情境以及每次執行的覆寫組建而成。
- 會強制執行特定模型的限制與壓縮保留權杖。
- 關於模型看到的內容，請參閱[系統提示](/zh-Hant/concepts/system-prompt)。

## 掛載點（您可以攔截的地方）

OpenClaw 有兩個掛載系統：

- **內部掛載**（閘道掛載）：用於指令與生命週期事件的事件驅動腳本。
- **外掛掛載**：代理程式/工具生命週期與閘道管線內的擴充點。

### 內部掛載（閘道掛載）

- **`agent:bootstrap`**：在系統提示定案之前，於建置啟動檔案時執行。
  使用此功能可新增/移除啟動情境檔案。
- **指令掛載**：`/new`、`/reset`、`/stop` 以及其他指令事件（請參閱掛載文件）。

請參閱[掛載](/zh-Hant/automation/hooks)以了解設定與範例。

### 外掛掛載（代理程式 + 閘道生命週期）

這些會在代理程式迴圈或閘道管線內執行：

- **`before_model_resolve`**：在 Session 之前運行（沒有 `messages`），以便在解析模型之前確定性地覆蓋提供者/模型。
- **`before_prompt_build`**：在加載 Session 之後運行（帶有 `messages`），以便在提交提示之前注入 `prependContext`、`systemPrompt`、`prependSystemContext` 或 `appendSystemContext`。請使用 `prependContext` 處理每輪動態文字，並使用系統上下文欄位來設定應置於系統提示空間中的穩定指引。
- **`before_agent_start`**：舊版相容性 Hook，可能在任一階段運行；建議優先使用上述明確的 Hook。
- **`before_agent_reply`**：在內聯動作之後和 LLM 呼叫之前運行，允許外掛宣告該輪次並傳回合成回覆，或完全使該輪次靜默。
- **`agent_end`**：在完成後檢查最終訊息列表和執行中繼資料。
- **`before_compaction` / `after_compaction`**：觀察或註釋壓縮循環。
- **`before_tool_call` / `after_tool_call`**：攔截工具參數/結果。
- **`before_install`**：檢查內建掃描發現並選擇性地封鎖技能或外掛安裝。
- **`tool_result_persist`**：在工具結果寫入 Session 逐字稿之前同步轉換它們。
- **`message_received` / `message_sending` / `message_sent`**：傳入 + 傳出訊息 Hook。
- **`session_start` / `session_end`**：Session 生命週期邊界。
- **`gateway_start` / `gateway_stop`**：Gateway 生命週期事件。

傳出/工具防護的 Hook 決策規則：

- `before_tool_call`：`{ block: true }` 是終止的，並停止優先級較低的處理程式。
- `before_tool_call`：`{ block: false }` 是無操作，並且不會清除先前的封鎖。
- `before_install`：`{ block: true }` 是終止的，並停止優先級較低的處理程式。
- `before_install`：`{ block: false }` 是空操作，不會清除先前的區塊。
- `message_sending`：`{ cancel: true }` 是終止操作，會停止優先級較低的處理程序。
- `message_sending`：`{ cancel: false }` 是空操作，不會清除先前的取消操作。

請參閱 [Plugin hooks](/zh-Hant/plugins/architecture#provider-runtime-hooks) 以了解 Hook API 和註冊詳細資訊。

## 串流 + 部分回覆

- 助理差異從 pi-agent-core 串流傳輸，並作為 `assistant` 事件發出。
- 區塊串流可以在 `text_end` 或 `message_end` 上發出部分回覆。
- 推理串流可以作為單獨的串流或區塊回覆發出。
- 請參閱 [Streaming](/zh-Hant/concepts/streaming) 以了解分塊和區塊回覆行為。

## 工具執行 + 傳訊工具

- 工具開始/更新/結束事件在 `tool` 串流上發出。
- 工具結果會在記錄/發出之前，針對大小和圖像承載進行清理。
- 會追蹤傳訊工具發送，以抑制重複的助理確認。

## 回覆調整 + 抑制

- 最終承載由以下部分組成：
  - 助理文字（以及可選的推理）
  - 內嵌工具摘要（當詳細 + 允許時）
  - 模型出錯時的助理錯誤文字
- 精確的靜默符號 `NO_REPLY` / `no_reply` 會從傳出
  承載中過濾掉。
- 會從最終承載清單中移除重複的傳訊工具。
- 如果沒有剩餘可渲染的承載且工具發生錯誤，則會發出後備工具錯誤回覆
  （除非傳訊工具已發送用戶可見的回覆）。

## 壓縮 + 重試

- 自動壓縮會發出 `compaction` 串流事件，並可以觸發重試。
- 重試時，會重設記憶體緩衝區和工具摘要，以避免重複輸出。
- 請參閱 [Compaction](/zh-Hant/concepts/compaction) 以了解壓縮管線。

## 事件串流（目前）

- `lifecycle`：由 `subscribeEmbeddedPiSession` 發出（並作為後備由 `agentCommand` 發出）
- `assistant`：來自 pi-agent-core 的串流差異
- `tool`：來自 pi-agent-core 的串流工具事件

## 聊天通道處理

- 助理增量會被緩衝到聊天 `delta` 訊息中。
- 會在 **生命週期結束/錯誤** 時發送聊天 `final`。

## 逾時

- `agent.wait` 預設值：30 秒（僅等待時間）。可由 `timeoutMs` 參數覆寫。
- Agent 執行時間：`agents.defaults.timeoutSeconds` 預設值 172800 秒（48 小時）；在 `runEmbeddedPiAgent` 中止計時器中執行。
- LLM 閒置逾時：`agents.defaults.llm.idleTimeoutSeconds` 當在閒置時間視窗內未收到任何回應區塊時，中止模型請求。針對緩慢的本地模型或推理/工具呼叫供應商明確設定此值；設為 0 以停用。若未設定，OpenClaw 在已設定時使用 `agents.defaults.timeoutSeconds`，否則使用 120 秒。未設定明確 LLM 或 agent 逾時的 Cron 觸發執行會停用閒置監視，並依賴 cron 外部逾時。

## 可能提前結束的地方

- Agent 逾時 (中止)
- AbortSignal (取消)
- Gateway 中斷連線或 RPC 逾時
- `agent.wait` 逾時 (僅等待，不會停止 agent)

## 相關

- [工具](/zh-Hant/tools) — 可用的 agent 工具
- [鉤子](/zh-Hant/automation/hooks) — 由 agent 生命週期事件觸發的事件驅動腳本
- [壓縮](/zh-Hant/concepts/compaction) — 長對話如何摘要
- [執行核准](/zh-Hant/tools/exec-approvals) — Shell 指令的核准閘道
- [思考](/zh-Hant/tools/thinking) — 思考/推理等級設定
