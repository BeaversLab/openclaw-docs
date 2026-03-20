---
summary: "Agent loop lifecycle, streams, and wait semantics"
read_when:
  - You need an exact walkthrough of the agent loop or lifecycle events
title: "Agent Loop"
---

# Agent 迴圈

An agentic loop is the full “real” run of an agent: intake → context assembly → model inference →
tool execution → streaming replies → persistence. It’s the authoritative path that turns a message
into actions and a final reply, while keeping session state consistent.

In OpenClaw, a loop is a single, serialized run per session that emits lifecycle and stream events
as the model thinks, calls tools, and streams output. This doc explains how that authentic loop is
wired end-to-end.

## 進入點

- Gateway RPC: `agent` 和 `agent.wait`。
- CLI：`agent` 指令。

## 運作方式 (高階層次)

1. `agent` RPC 會驗證參數、解析 session (sessionKey/sessionId)、持久化 session 元數據，並立即回傳 `{ runId, acceptedAt }`。
2. `agentCommand` 執行 Agent：
   - 解析模型 + 思考/詳細輸出預設值
   - 載入技能快照
   - 呼叫 `runEmbeddedPiAgent` (pi-agent-core runtime)
   - 如果內嵌迴圈未發出 **生命週期結束/錯誤** 事件，則發出該事件
3. `runEmbeddedPiAgent`：
   - 透過每個會話 + 全域佇列來序列化執行
   - 解析模型 + 驗證設定檔並構建 pi 會話
   - 訂閱 pi 事件並串流助理/工具增量
   - 強制執行逾時 -> 如果超過則中止執行
   - 返回負載 + 使用情況元數據
4. `subscribeEmbeddedPiSession` 橋接 pi-agent-core 事件至 OpenClaw `agent` 串流：
   - tool events => `stream: "tool"`
   - assistant deltas => `stream: "assistant"`
   - lifecycle events => `stream: "lifecycle"` (`phase: "start" | "end" | "error"`)
5. `agent.wait` 使用 `waitForAgentJob`：
   - 等待 **lifecycle end/error** 以取得 `runId`
   - 回傳 `{ status: ok|error|timeout, startedAt, endedAt, error? }`

## 佇列 + 並行

- 執行過程會依據會話金鑰 (會話通道) 進行序列化，並可選擇性地透過全域通道執行。
- 這可以防止工具/會話競爭條件，並保持會話記錄一致。
- 訊息傳遞通道可以選擇佇列模式（collect/steer/followup），並將其饋送至此通道系統。
  請參閱 [Command Queue](/zh-Hant/concepts/queue)。

## Session + workspace preparation

- Workspace 已解析並建立；沙盒執行可能會重新導向至沙盒 workspace 根目錄。
- Skills 已載入（或從快照重複使用）並注入至 env 和 prompt。
- Bootstrap/context 檔案已解析並注入至系統 prompt 報告中。
- 會取得 session 寫入鎖定；`SessionManager` 會在串流之前開啟並進行準備。

## Prompt assembly + system prompt

- 系統 prompt 是由 OpenClaw 的基本 prompt、skills prompt、bootstrap context 和各次執行的覆寫項目所建構。
- 會強制執行模型特定的限制和壓縮保留 tokens。
- 關於模型所能看到的內容，請參閱 [System prompt](/zh-Hant/concepts/system-prompt)。

## Hook points (where you can intercept)

OpenClaw 有兩個 hook 系統：

- **Internal hooks** (Gateway hooks)：用於指令和生命週期事件的事件驅動腳本。
- **Plugin hooks**：agent/tool 生命週期和 gateway 管線內的擴充點。

### Internal hooks (Gateway hooks)

- **`agent:bootstrap`**：在系統提示最終確認之前，於建置引導檔案時執行。
  請使用此選項來新增/移除引導情境檔案。
- **命令掛鉤**：`/new`、`/reset`、`/stop` 和其他命令事件（請參閱掛鉤文件）。

請參閱 [掛鉤](/zh-Hant/automation/hooks) 以了解設定和範例。

### Plugin hooks (agent + gateway lifecycle)

這些在 agent loop 或 gateway 管線內執行：

- **`before_model_resolve`**：在工作階段之前執行（無 `messages`），以便在模型解析之前確定性覆寫供應商/模型。
- **`before_prompt_build`**：在工作階段載入之後執行（包含 `messages`），以便在提示提交之前注入 `prependContext`、`systemPrompt`、`prependSystemContext` 或 `appendSystemContext`。請使用 `prependContext` 處理每輪動態文字，並使用系統內容欄位 (system-context fields) 處理應位於系統提示空間中的穩定指引。
- **`before_agent_start`**：舊版相容性掛鉤，可能在任一階段執行；建議優先使用上述明確的掛鉤。
- **`agent_end`**：在完成後檢查最終訊息清單並執行元資料。
- **`before_compaction` / `after_compaction`**：觀察或註解壓縮循環。
- **`before_tool_call` / `after_tool_call`**：攔截工具參數/結果。
- **`tool_result_persist`**：在將工具結果寫入工作階段記錄之前，同步轉換這些結果。
- **`message_received` / `message_sending` / `message_sent`**：輸入 + 輸出訊息掛鉤。
- **`session_start` / `session_end`**：工作階段生命週期邊界。
- **`gateway_start` / `gateway_stop`**：閘道生命週期事件。

請參閱 [外掛程式](/zh-Hant/tools/plugin#plugin-hooks) 以了解掛鉤 API 和註冊細節。

## 串流 + 部分回覆

- 助理增量會從 pi-agent-core 串流並作為 `assistant` 事件發出。
- 區塊串流可以在 `text_end` 或 `message_end` 上發出部分回覆。
- 推理串流可以作為單獨的串流或區塊回覆發出。
- 請參閱 [串流](/zh-Hant/concepts/streaming) 以了解分塊和區塊回覆行為。

## 工具執行 + 訊息傳遞工具

- 工具啟動/更新/結束事件是在 `tool` 串流上發出的。
- 工具結果會在記錄/發出之前，針對大小和圖像酬載進行清理。
- 訊息傳遞工具發送會被追蹤，以抑制重複的助理確認。

## 回覆塑形 + 抑制

- 最終酬載由以下組成：
  - 助理文字（和可選推理）
  - 內聯工具摘要（當詳細資訊開啟且允許時）
  - 模型錯誤時的助理錯誤文字
- `NO_REPLY` 被視為靜默令牌，並會從傳出 payload 中過濾掉。
- 訊息傳遞工具的重複項會從最終酬載列表中移除。
- 如果沒有剩餘可呈現的 payload 且工具發生錯誤，將會發出後備工具錯誤回覆（除非訊息傳遞工具已經發送了使用者可見的回覆）。

## 壓縮 + 重試

- 自動壓縮會發出 `compaction` 串流事件，並可以觸發重試。
- 重試時，記憶體緩衝區和工具摘要會被重置，以避免重複輸出。
- 請參閱 [Compaction](/zh-Hant/concepts/compaction) 以了解壓縮管線。

## 事件串流（目前）

- `lifecycle`：由 `subscribeEmbeddedPiSession` 發出（並作為 `agentCommand` 的後備）
- `assistant`：來自 pi-agent-core 的串流增量
- `tool`：來自 pi-agent-core 的串流工具事件

## 聊天頻道處理

- 助理增量會被緩衝至聊天 `delta` 訊息中。
- 會在 **生命週期結束/錯誤** 時發出聊天 `final`。

## 逾時

- `agent.wait` 預設值：30s（僅為等待時間）。`timeoutMs` 參數可覆蓋。
- Agent 執行時長：`agents.defaults.timeoutSeconds` 預設 600s；在 `runEmbeddedPiAgent` 中止計時器中強制執行。

## 可能提前結束的地方

- Agent 逾時（中止）
- AbortSignal（取消）
- Gateway 中斷連線或 RPC 逾時
- `agent.wait` 逾時（僅等待，不會停止 agent）

import en from "/components/footer/en.mdx";

<en />
