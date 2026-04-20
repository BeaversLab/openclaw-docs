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
- 訊息通道可以選擇佇列模式（collect/steer/followup）以輸入至此車道系統。
  請參閱 [Command Queue](/zh-Hant/concepts/queue)。

## 工作階段 + 工作區準備

- 解析並建立工作區；沙箱執行可能會重新導向至沙箱工作區根目錄。
- 載入技能（或從快照重複使用）並將其注入環境與提示。
- 解析 Bootstrap/Context 檔案並將其注入系統提示報告。
- 取得工作階段寫入鎖定；在串流之前開啟並準備 `SessionManager`。

## 提示組裝 + 系統提示

- 系統提示是依據 OpenClaw 的基本提示、技能提示、Bootstrap 內容以及各次執行的覆寫所建構。
- 會強制執行特定模型的限制與壓縮保留 Token。
- 請參閱 [System prompt](/zh-Hant/concepts/system-prompt) 以了解模型看到的內容。

## Hook 點（您可以進行攔截的地方）

OpenClaw 有兩個 Hook 系統：

- **Internal hooks**（Gateway hooks）：用於指令與生命週期事件的事件驅動腳本。
- **Plugin hooks**：Agent/工具生命週期與 Gateway 管線內部的擴充點。

### Internal hooks (Gateway hooks)

- **`agent:bootstrap`**：在系統提示最終確定之前，於建構 Bootstrap 檔案時執行。
  使用此功能來新增/移除 Bootstrap Context 檔案。
- **Command hooks**：`/new`、`/reset`、`/stop` 以及其他指令事件（請參閱 Hooks 文件）。

請參閱 [Hooks](/zh-Hant/automation/hooks) 以了解設定和範例。

### Plugin hooks (agent + gateway lifecycle)

這些在 Agent 迴圈或 Gateway 管線內執行：

- **`before_model_resolve`**：在 Pre-session（無 `messages`）執行，以便在模型解析前確定性地覆寫提供者/模型。
- **`before_prompt_build`**：在工作階段載入後（含 `messages`）執行，以便在提交提示前注入 `prependContext`、`systemPrompt`、`prependSystemContext` 或 `appendSystemContext`。請使用 `prependContext` 來設定每輪動態文字，並使用 system-context 欄位來設定應位於系統提示空間中的穩定指引。
- **`before_agent_start`**：舊版相容性掛鉤，可能在任一階段執行；優先使用上述的明確掛鉤。
- **`before_agent_reply`**：在內嵌動作之後以及 LLM 呼叫之前執行，允許外掛接管輪次並回傳合成回覆，或完全將輪次靜音。
- **`agent_end`**：在完成後檢查最終訊息列表和執行元數據。
- **`before_compaction` / `after_compaction`**：觀察或標註壓縮週期。
- **`before_tool_call` / `after_tool_call`**：攔截工具參數/結果。
- **`before_install`**：檢查內建掃描結果，並選擇性地阻擋技能或外掛安裝。
- **`tool_result_persist`**：在工具結果寫入工作階段記錄之前，同步轉換它們。
- **`message_received` / `message_sending` / `message_sent`**：輸入 + 輸出訊息鉤子。
- **`session_start` / `session_end`**：工作階段生命週期邊界。
- **`gateway_start` / `gateway_stop`**：閘道生命週期事件。

輸出/工具守衛的鉤子決策規則：

- `before_tool_call`：`{ block: true }` 是終止狀態，並會停止較低優先權的處理程式。
- `before_tool_call`：`{ block: false }` 是空操作，不會清除先前的阻擋。
- `before_install`：`{ block: true }` 是終止狀態，並會停止較低優先權的處理程式。
- `before_install`：`{ block: false }` 是空操作，不會清除先前的阻擋。
- `message_sending`：`{ cancel: true }` 是終止狀態，並會停止較低優先權的處理程式。
- `message_sending`：`{ cancel: false }` 是空操作，不會清除先前的取消。

請參閱 [Plugin hooks](/zh-Hant/plugins/architecture#provider-runtime-hooks) 以了解 Hook API 和註冊細節。

## 串流 + 部分回覆

- Assistant 增量從 pi-agent-core 串流傳出，並作為 `assistant` 事件發出。
- 區塊串流可以在 `text_end` 或 `message_end` 上發出部分回覆。
- 推理串流可以作為單獨的串流或作為區塊回覆發出。
- 請參閱 [Streaming](/zh-Hant/concepts/streaming) 以了解分塊和區塊回覆行為。

## 工具執行 + 傳訊工具

- 工具開始/更新/結束事件在 `tool` 串流上發出。
- 工具結果會在記錄/發出之前，針對大小和圖像載荷進行清理。
- 會追蹤傳訊工具的發送，以抑制重複的 Assistant 確認訊息。

## 回覆成型 + 抑制

- 最終載荷由以下組成：
  - assistant 文字（和可選的推理）
  - 內聯工具摘要（當詳細資訊開啟且允許時）
  - 當模型發生錯誤時的 assistant 錯誤文字
- 精確的靜默權杖 `NO_REPLY` / `no_reply` 會從傳出的
  載荷中過濾掉。
- 會從最終載荷清單中移除重複的傳訊工具。
- 如果沒有可渲染的載荷剩餘且工具發生錯誤，則會發出後備工具錯誤回覆
  （除非傳訊工具已經發送了使用者可見的回覆）。

## 壓縮 + 重試

- 自動壓縮會發出 `compaction` 串流事件，並可以觸發重試。
- 重試時，記憶體緩衝區和工具摘要會重置，以避免重複輸出。
- 請參閱 [Compaction](/zh-Hant/concepts/compaction) 以了解壓縮管線。

## 事件串流（目前）

- `lifecycle`：由 `subscribeEmbeddedPiSession` 發出（並作為 `agentCommand` 的後備）
- `assistant`：來自 pi-agent-core 的串流增量
- `tool`：來自 pi-agent-core 的串流工具事件

## 聊天頻道處理

- Assistant 增量會緩衝到聊天 `delta` 訊息中。
- 會在 **生命週期結束/錯誤** 時發出聊天 `final`。

## 逾時

- `agent.wait` 預設值：30秒（僅等待時間）。`timeoutMs` 參數可覆寫。
- Agent 執行時間：`agents.defaults.timeoutSeconds` 預設 172800s（48 小時）；在 `runEmbeddedPiAgent` 中止計時器中強制執行。
- LLM 閒置逾時：若在閒置時間視窗結束前未收到回應區塊，`agents.defaults.llm.idleTimeoutSeconds` 會中止模型請求。請針對緩慢的本機模型或推理/工具呼叫提供者明確設定；將其設為 0 可停用。若未設定，OpenClaw 會在已設定時使用 `agents.defaults.timeoutSeconds`，否則預設為 120 秒。若沒有明確的 LLM 或 Agent 逾時，由 Cron 觸發的執行將停用閒置監控，並依賴 Cron 的外部逾時。

## 可能提前結束的地方

- Agent 逾時 (中止)
- AbortSignal (取消)
- Gateway 中斷連線或 RPC 逾時
- `agent.wait` 逾時 (僅等待，不會停止 Agent)

## 相關

- [Tools](/zh-Hant/tools) — 可用的 Agent 工具
- [Hooks](/zh-Hant/automation/hooks) — 由 Agent 生命週期事件觸發的事件驅動腳本
- [Compaction](/zh-Hant/concepts/compaction) — 長對話的摘要方式
- [Exec Approvals](/zh-Hant/tools/exec-approvals) — Shell 指令的審核閘門
- [Thinking](/zh-Hant/tools/thinking) — 思考/推理層級設定
