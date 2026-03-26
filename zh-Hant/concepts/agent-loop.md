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
- 訊息通道可以選擇提供給此車道系統的佇列模式。請參閱 [Command Queue](/zh-Hant/concepts/queue)。

## Session + workspace preparation

- 工作區會被解析並建立；沙箱執行可能會重新導向至沙箱工作區根目錄。
- 技能會被載入（或從快照重複使用），並注入至 env 和 prompt 中。
- Bootstrap/context 檔案會被解析並注入至系統提示詞報告中。
- 會取得寫入鎖；`SessionManager` 會在串流之前開啟並準備就緒。

## Prompt assembly + system prompt

- 系統提示詞是根據 OpenClaw 的基本提示詞、技能提示詞、bootstrap 語境以及每次執行的覆寫所建構。
- 會強制執行特定模型的限制與壓縮保留 token。
- 關於模型看到的內容，請參閱 [System prompt](/zh-Hant/concepts/system-prompt)。

## Hook points (where you can intercept)

OpenClaw 具有兩個掛鉤系統：

- **內部掛鉤** (Gateway hooks)：用於指令和生命週期事件的事件驅動腳本。
- **外掛掛鉤**：Agent/工具生命週期和 Gateway 管道內部的擴充點。

### 內部掛鉤 (Gateway hooks)

- **`agent:bootstrap`**：在系統提示完成之前建置引導檔案時執行。
  使用此項來新增/移除引導上下文檔案。
- **指令掛鉤**：`/new`、`/reset`、`/stop` 和其他指令事件（請參閱 Hooks 文件）。

請參閱 [Hooks](/zh-Hant/automation/hooks) 以了解設定和範例。

### 外掛掛鉤 (agent + gateway lifecycle)

這些在 Agent 迴圈或 Gateway 管道內執行：

- **`before_model_resolve`**：在階段前執行（無 `messages`），以在模型解析之前確定性地覆寫提供者/模型。
- **`before_prompt_build`**：在會話載入後（伴隨 `messages`）執行，以便在提交提示之前注入 `prependContext`、`systemPrompt`、`prependSystemContext` 或 `appendSystemContext`。使用 `prependContext` 處理每輪動態文字，並針對應位於系統提示空間中的穩定指引使用 system-context 欄位。
- **`before_agent_start`**：舊版相容性掛鉤，可能在任一階段執行；建議優先使用上述的明確掛鉤。
- **`agent_end`**：在完成後檢查最終訊息列表和執行元資料。
- **`before_compaction` / `after_compaction`**：觀察或標註壓縮循環。
- **`before_tool_call` / `after_tool_call`**：攔截工具參數/結果。
- **`tool_result_persist`**：在工具結果寫入會話記錄之前同步轉換工具結果。
- **`message_received` / `message_sending` / `message_sent`**：入站與出站訊息掛鉤。
- **`session_start` / `session_end`**：會話生命週期邊界。
- **`gateway_start` / `gateway_stop`**：閘道生命週期事件。

請參閱 [Plugin hooks](/zh-Hant/plugins/architecture#provider-runtime-hooks) 以了解掛鉤 API 和註冊詳細資訊。

## 串流 + 部分回覆

- Assistant 增量從 pi-agent-core 串流輸出，並作為 `assistant` 事件發出。
- 區塊串流可以在 `text_end` 或 `message_end` 上發出部分回覆。
- 推理串流可以作為單獨的串流或作為區塊回覆發出。
- 請參閱 [Streaming](/zh-Hant/concepts/streaming) 以了解分塊和區塊回覆行為。

## 工具執行 + 訊息傳遞工具

- 工具啟動/更新/結束事件會在 `tool` 串流上發出。
- 工具結果會在記錄/發出前，針對大小和圖片載荷進行清理。
- 會追蹤訊息傳遞工具的發送，以抑制重複的助理確認。

## 回覆塑形 + 抑制

- 最終載荷由以下組成：
  - 助理文字（和選用的推理）
  - 內嵌工具摘要（當啟用詳細模式且允許時）
  - 當模型錯誤時的助理錯誤文字
- `NO_REPLY` 被視為靜默權杖，並會從傳出載荷中濾除。
- 重複的訊息傳遞工具會從最終載荷清單中移除。
- 如果沒有剩下可渲染的載荷且工具發生錯誤，則會發出後備工具錯誤回覆
  （除非訊息傳遞工具已經發送了使用者可見的回覆）。

## 壓縮 + 重試

- 自動壓縮會發出 `compaction` 串流事件，並可觸發重試。
- 重試時，記憶體緩衝區和工具摘要會重置，以避免重複輸出。
- 請參閱[壓縮](/zh-Hant/concepts/compaction)以了解壓縮管線。

## 事件串流 (目前)

- `lifecycle`：由 `subscribeEmbeddedPiSession` 發出（並作為 `agentCommand` 的後備機制）
- `assistant`：來自 pi-agent-core 的串流增量
- `tool`：來自 pi-agent-core 的串流工具事件

## 聊天頻道處理

- 助理增量會緩衝至聊天 `delta` 訊息中。
- 會在 **生命週期結束/錯誤** 時發出聊天 `final`。

## 逾時

- `agent.wait` 預設值：30秒（僅指等待時間）。可透過 `timeoutMs` 參數覆寫。
- Agent runtime: `agents.defaults.timeoutSeconds` default 600s; enforced in `runEmbeddedPiAgent` abort timer.

## Where things can end early

- Agent timeout (abort)
- AbortSignal (cancel)
- Gateway disconnect or RPC timeout
- `agent.wait` timeout (wait-only, does not stop agent)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
