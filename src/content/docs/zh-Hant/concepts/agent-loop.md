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
- 訊息傳遞通道可以選擇佇列模式，為此通道系統提供輸入。
  請參閱 [Command Queue](/en/concepts/queue)。

## 工作階段 + 工作區準備

- 解析並建立工作區；沙箱執行可能會重新導向至沙箱工作區根目錄。
- 載入技能（或從快照重複使用）並將其注入環境與提示。
- 解析 Bootstrap/Context 檔案並將其注入系統提示報告。
- 取得工作階段寫入鎖定；在串流之前開啟並準備 `SessionManager`。

## 提示組裝 + 系統提示

- 系統提示是依據 OpenClaw 的基本提示、技能提示、Bootstrap 內容以及各次執行的覆寫所建構。
- 會強制執行特定模型的限制與壓縮保留 Token。
- 請參閱 [System prompt](/en/concepts/system-prompt) 以了解模型會看到什麼內容。

## Hook 點（您可以進行攔截的地方）

OpenClaw 有兩個 Hook 系統：

- **Internal hooks**（Gateway hooks）：用於指令與生命週期事件的事件驅動腳本。
- **Plugin hooks**：Agent/工具生命週期與 Gateway 管線內部的擴充點。

### Internal hooks (Gateway hooks)

- **`agent:bootstrap`**：在系統提示最終確定之前，於建構 Bootstrap 檔案時執行。
  使用此功能來新增/移除 Bootstrap Context 檔案。
- **Command hooks**：`/new`、`/reset`、`/stop` 以及其他指令事件（請參閱 Hooks 文件）。

請參閱 [Hooks](/en/automation/hooks) 以了解設定與範例。

### Plugin hooks (agent + gateway lifecycle)

這些在 Agent 迴圈或 Gateway 管線內執行：

- **`before_model_resolve`**：在 Pre-session（無 `messages`）執行，以便在模型解析前確定性地覆寫提供者/模型。
- **`before_prompt_build`**：在工作階段載入後（含 `messages`）執行，以便在提交提示前注入 `prependContext`、`systemPrompt`、`prependSystemContext` 或 `appendSystemContext`。請使用 `prependContext` 來設定每輪動態文字，並使用 system-context 欄位來設定應位於系統提示空間中的穩定指引。
- **`before_agent_start`**：舊版相容性掛鉤，可能在任一階段執行；優先使用上述的明確掛鉤。
- **`agent_end`**：在完成後檢查最終訊息清單和執行元資料。
- **`before_compaction` / `after_compaction`**：觀察或標註壓縮循環。
- **`before_tool_call` / `after_tool_call`**：攔截工具參數/結果。
- **`tool_result_persist`**：在寫入會話紀錄之前同步轉換工具結果。
- **`message_received` / `message_sending` / `message_sent`**：連入 + 連出訊息掛鉤。
- **`session_start` / `session_end`**：會請生命週期邊界。
- **`gateway_start` / `gateway_stop`**：閘道生命週期事件。

連出/工具防衛的掛鉤決策規則：

- `before_tool_call`：`{ block: true }` 是終止的，並停止較低優先級的處理程序。
- `before_tool_call`：`{ block: false }` 是空操作，不會清除先前的阻擋。
- `message_sending`：`{ cancel: true }` 是終止的，並停止較低優先級的處理程序。
- `message_sending`：`{ cancel: false }` 是空操作，不會清除先前的取消。

請參閱 [Plugin hooks](/en/plugins/architecture#provider-runtime-hooks) 以了解掛鉤 API 和註冊細節。

## 串流 + 部分回覆

- 助理增量會從 pi-agent-core 串流傳輸，並發出為 `assistant` 事件。
- 區塊串流可以在 `text_end` 或 `message_end` 上發出部分回覆。
- 推理串流可以作為單獨的串流或區塊回覆發出。
- 請參閱 [Streaming](/en/concepts/streaming) 以了解分塊和區塊回覆行為。

## 工具執行 + 傳訊工具

- 工具啟動/更新/結束事件是在 `tool` 串流上發出的。
- 工具結果會在記錄/發出之前針對大小和圖像承載進行清理。
- 會追蹤傳訊工具發送以抑制重複的助理確認。

## 回覆塑造 + 抑制

- 最終的 payload 組合自：
  - 助理文字（以及可選的推理）
  - 內嵌工具摘要（當處於詳細模式且允許時）
  - 當模型發生錯誤時的助理錯誤文字
- `NO_REPLY` 被視為靜默權杖，並會從傳出的 payload 中過濾掉。
- 訊息工具的重複項會從最終 payload 列表中移除。
- 如果沒有剩餘可呈現的 payload 且工具發生錯誤，將發出備用的工具錯誤回覆
  （除非訊息工具已經發送了使用者可見的回覆）。

## 壓縮 + 重試

- 自動壓縮會發出 `compaction` 串流事件，並可觸發重試。
- 重試時，記憶體緩衝區和工具摘要會重置以避免重複輸出。
- 請參閱 [壓縮](/en/concepts/compaction) 以了解壓縮管線。

## 事件串流（目前）

- `lifecycle`：由 `subscribeEmbeddedPiSession` 發出（並作為 `agentCommand` 的備用方案）
- `assistant`：來自 pi-agent-core 的串流增量
- `tool`：來自 pi-agent-core 的串流工具事件

## 聊天頻道處理

- 助理增量會被緩衝到聊天 `delta` 訊息中。
- 聊天 `final` 會在 **生命週期結束/錯誤** 時發出。

## 逾時

- `agent.wait` 預設值：30 秒（僅為等待時間）。`timeoutMs` 參數可覆寫。
- Agent 執行時間：`agents.defaults.timeoutSeconds` 預設為 600 秒；在 `runEmbeddedPiAgent` 中止計時器中強制執行。

## 可能提前結束的地方

- Agent 逾時（中止）
- AbortSignal（取消）
- Gateway 中斷連線或 RPC 逾時
- `agent.wait` 逾時（僅等待，不會停止 Agent）
