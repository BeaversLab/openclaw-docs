---
summary: "Agent loop lifecycle, streams, and wait semantics"
read_when:
  - You need an exact walkthrough of the agent loop or lifecycle events
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
   - resolves model + thinking/verbose defaults
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
5. `agent.wait` uses `waitForAgentJob`:
   - waits for **lifecycle end/error** for `runId`
   - returns `{ status: ok|error|timeout, startedAt, endedAt, error? }`

## Queueing + concurrency

- Runs are serialized per session key (session lane) and optionally through a global lane.
- This prevents tool/session races and keeps session history consistent.
- 訊息通道可以選擇佇列模式（collect/steer/followup），這些模式會饋送至此通道系統。
  參閱 [Command Queue](/en/concepts/queue)。

## 工作階段 + 工作區準備

- 解析並建立工作區；沙箱執行可能會重新導向至沙箱工作區根目錄。
- 載入技能（或從快照重複使用）並將其注入環境與提示。
- 解析 Bootstrap/Context 檔案並將其注入系統提示報告。
- 取得工作階段寫入鎖定；在串流之前開啟並準備 `SessionManager`。

## 提示組裝 + 系統提示

- 系統提示是依據 OpenClaw 的基本提示、技能提示、Bootstrap 內容以及各次執行的覆寫所建構。
- 會強制執行特定模型的限制與壓縮保留 Token。
- 參閱 [System prompt](/en/concepts/system-prompt) 以了解模型所見內容。

## Hook 點（您可以進行攔截的地方）

OpenClaw 有兩個 Hook 系統：

- **Internal hooks**（Gateway hooks）：用於指令與生命週期事件的事件驅動腳本。
- **Plugin hooks**：Agent/工具生命週期與 Gateway 管線內部的擴充點。

### Internal hooks (Gateway hooks)

- **`agent:bootstrap`**：在系統提示最終確定之前，於建構 Bootstrap 檔案時執行。
  使用此功能來新增/移除 Bootstrap Context 檔案。
- **Command hooks**：`/new`、`/reset`、`/stop` 以及其他指令事件（請參閱 Hooks 文件）。

參閱 [Hooks](/en/automation/hooks) 以了解設定與範例。

### Plugin hooks (agent + gateway lifecycle)

這些在 Agent 迴圈或 Gateway 管線內執行：

- **`before_model_resolve`**：在 Pre-session（無 `messages`）執行，以便在模型解析前確定性地覆寫提供者/模型。
- **`before_prompt_build`**：在工作階段載入後（含 `messages`）執行，以便在提交提示前注入 `prependContext`、`systemPrompt`、`prependSystemContext` 或 `appendSystemContext`。請使用 `prependContext` 來設定每輪動態文字，並使用 system-context 欄位來設定應位於系統提示空間中的穩定指引。
- **`before_agent_start`**：舊版相容性掛鉤，可能在任一階段執行；優先使用上述的明確掛鉤。
- **`agent_end`**：在完成後檢查最終訊息清單和執行元資料。
- **`before_compaction` / `after_compaction`**：觀察或標註壓縮循環。
- **`before_tool_call` / `after_tool_call`**：攔截工具參數/結果。
- **`before_install`**：檢查內建掃描結果，並選擇性地阻擋技能或外掛程式的安裝。
- **`tool_result_persist`**：在工具結果寫入會話記錄之前，同步轉換工具結果。
- **`message_received` / `message_sending` / `message_sent`**：輸入 + 輸出訊息掛鉤。
- **`session_start` / `session_end`**：會議生命週期邊界。
- **`gateway_start` / `gateway_stop`**：閘道生命週期事件。

輸出/工具防護的掛鉤決策規則：

- `before_tool_call`：`{ block: true }` 為終止狀態，會停止低優先級處理程式。
- `before_tool_call`：`{ block: false }` 為無操作，且不會清除先前的阻擋。
- `before_install`：`{ block: true }` 為終止狀態，會停止低優先級處理程式。
- `before_install`：`{ block: false }` 為無操作，且不會清除先前的阻擋。
- `message_sending`：`{ cancel: true }` 為終止狀態，會停止低優先級處理程式。
- `message_sending`：`{ cancel: false }` 為無操作，且不會清除先前的取消動作。

參閱 [Plugin hooks](/en/plugins/architecture#provider-runtime-hooks) 以了解掛鉤 API 和註冊詳細資訊。

## 串流 + 部分回覆

- Assistant 增量會從 pi-agent-core 串流傳輸，並發出為 `assistant` 事件。
- 區塊串流可以在 `text_end` 或 `message_end` 上發出部分回覆。
- 推理串流可以作為獨立串流或區塊回覆發出。
- 參閱 [Streaming](/en/concepts/streaming) 以了解分塊和區塊回覆行為。

## 工具執行 + 傳訊工具

- 工具開始/更新/結束事件會在 `tool` 串流上發送。
- 工具結果會在記錄/發送前針對大小和圖像 Payload 進行清理。
- 會追蹤訊息工具的發送，以隱藏重複的助理確認。

## 回覆塑形 + 隱藏

- 最終 Payload 由以下組成：
  - 助理文字（和可選的推理）
  - 內嵌工具摘要（當處於詳細模式 + 被允許時）
  - 當模型錯誤時的助理錯誤文字
- `NO_REPLY` 被視為靜默 Token，並會從傳出的 Payload 中過濾掉。
- 重複的訊息工具會從最終 Payload 列表中移除。
- 如果沒有剩餘可渲染的 Payload 且工具發生錯誤，則會發送備用工具錯誤回覆
  （除非訊息工具已經發送了使用者可見的回覆）。

## 壓縮 + 重試

- 自動壓縮會發送 `compaction` 串流事件，並可以觸發重試。
- 重試時，記憶體緩衝區和工具摘要會重置，以避免重複輸出。
- 請參閱 [壓縮](/en/concepts/compaction) 以了解壓縮管線。

## 事件串流（目前）

- `lifecycle`：由 `subscribeEmbeddedPiSession` 發送（並由 `agentCommand` 作為備用發送）
- `assistant`：來自 pi-agent-core 的串流增量
- `tool`：來自 pi-agent-core 的串流工具事件

## 聊天頻道處理

- 助理增量會緩衝到聊天 `delta` 訊息中。
- 聊天 `final` 會在 **生命週期結束/錯誤** 時發送。

## 逾時

- `agent.wait` 預設值：30s（僅等待時間）。可由 `timeoutMs` 參數覆蓋。
- Agent 執行時間：`agents.defaults.timeoutSeconds` 預設 172800s（48 小時）；在 `runEmbeddedPiAgent` 中止計時器中執行。

## 可能提前結束的地方

- Agent 逾時（中止）
- AbortSignal（取消）
- Gateway 中斷連線或 RPC 逾時
- `agent.wait` 逾時（僅等待，不會停止 Agent）

## 相關

- [工具](/en/tools) — 可用的 Agent 工具
- [鉤子](/en/automation/hooks) — 由 Agent 生命週期事件觸發的事件驅動腳本
- [壓縮](/en/concepts/compaction) — 長對話如何被摘要
- [Exec Approvals](/en/tools/exec-approvals) — shell 指令的審批閘門
- [Thinking](/en/tools/thinking) — 思考/推理層級的配置
