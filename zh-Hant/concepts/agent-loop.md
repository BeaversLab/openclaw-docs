---
summary: "Agent 迴圈生命週期、串流與等待語意"
read_when:
  - You need an exact walkthrough of the agent loop or lifecycle events
title: "Agent 迴圈"
---

# Agent 迴圈

Agent 迴圈是代理程式的完整「真實」執行過程：輸入 → 組合上下文 → 模型推理 →
工具執行 → 串流回覆 → 持久化。這是一條將訊息轉化為動作和最終回覆的權威路徑，同時保持會話狀態一致。

在 OpenClaw 中，迴圈是每個會話的單一、序列化執行過程，它會在模型思考、呼叫工具和輸出串流時發出生命週期和串流事件。
本文解釋了該真實迴圈是如何端到端連接的。

## 進入點

- Gateway RPC: `agent` 和 `agent.wait`。
- CLI: `agent` 指令。

## 運作方式 (高階層次)

1. `agent` RPC 驗證參數、解析會話 (sessionKey/sessionId)、持久化會話元數據，並立即返回 `{ runId, acceptedAt }`。
2. `agentCommand` 執行代理程式：
   - 解析模型 + 思考/詳細輸出預設值
   - 載入技能快照
   - 呼叫 `runEmbeddedPiAgent` (pi-agent-core 執行環境)
   - 如果內嵌迴圈未發出 **生命週期結束/錯誤** 事件，則發出該事件
3. `runEmbeddedPiAgent`:
   - 透過每個會話 + 全域佇列來序列化執行
   - 解析模型 + 驗證設定檔並構建 pi 會話
   - 訂閱 pi 事件並串流助理/工具增量
   - 強制執行逾時 -> 如果超過則中止執行
   - 返回負載 + 使用情況元數據
4. `subscribeEmbeddedPiSession` 將 pi-agent-core 事件橋接至 OpenClaw `agent` 串流：
   - 工具事件 => `stream: "tool"`
   - 助理增量 => `stream: "assistant"`
   - 生命週期事件 => `stream: "lifecycle"` (`phase: "start" | "end" | "error"`)
5. `agent.wait` 使用 `waitForAgentJob`:
   - 等待 **生命週期結束/錯誤** 以完成 `runId`
   - 返回 `{ status: ok|error|timeout, startedAt, endedAt, error? }`

## 佇列 + 並行

- 執行過程會依據會話金鑰 (會話通道) 進行序列化，並可選擇性地透過全域通道執行。
- 這可以防止工具/會話競爭條件，並保持會話記錄一致。
- 訊息傳遞通道可以選擇提供給此通道系統的佇列模式（collect/steer/followup）。
  請參閱 [Command Queue](/zh-Hant/concepts/queue)。

## Session + workspace preparation

- Workspace 已解析並建立；沙盒執行可能會重新導向至沙盒 workspace 根目錄。
- Skills 已載入（或從快照重複使用）並注入至 env 和 prompt。
- Bootstrap/context 檔案已解析並注入至系統 prompt 報告中。
- 取得 session 寫入鎖定；`SessionManager` 已開啟並在串流之前完成準備。

## Prompt assembly + system prompt

- 系統 prompt 是由 OpenClaw 的基本 prompt、skills prompt、bootstrap context 和各次執行的覆寫項目所建構。
- 會強制執行模型特定的限制和壓縮保留 tokens。
- 關於模型所看到的內容，請參閱 [System prompt](/zh-Hant/concepts/system-prompt)。

## Hook points (where you can intercept)

OpenClaw 有兩個 hook 系統：

- **Internal hooks** (Gateway hooks)：用於指令和生命週期事件的事件驅動腳本。
- **Plugin hooks**：agent/tool 生命週期和 gateway 管線內的擴充點。

### Internal hooks (Gateway hooks)

- **`agent:bootstrap`**：在系統 prompt 完成之前建構 bootstrap 檔案時執行。
  使用此功能來新增/移除 bootstrap context 檔案。
- **Command hooks**：`/new`、`/reset`、`/stop` 和其他指令事件（請參閱 Hooks 文件）。

如需設定和範例，請參閱 [Hooks](/zh-Hant/automation/hooks)。

### Plugin hooks (agent + gateway lifecycle)

這些在 agent loop 或 gateway 管線內執行：

- **`before_model_resolve`**：在 session 之前執行（無 `messages`），以便在模型解析之前確定性地覆寫 provider/model。
- **`before_prompt_build`**：在 session 載入之後執行（含 `messages`），以便在提交 prompt 之前注入 `prependContext`、`systemPrompt`、`prependSystemContext` 或 `appendSystemContext`。請針對每個輪次的動態文字使用 `prependContext`，並針對應置於系統 prompt 空間中的穩定指引使用 system-context 欄位。
- **`before_agent_start`**：舊版相容性掛鉤，可能在任一階段執行；建議優先使用上述的明確掛鉤。
- **`agent_end`**：在完成後檢查最終訊息列表和執行元數據。
- **`before_compaction` / `after_compaction`**：觀察或註釋壓縮循環。
- **`before_tool_call` / `after_tool_call`**：攔截工具參數/結果。
- **`tool_result_persist`**：在寫入會話記錄之前，同步轉換工具結果。
- **`message_received` / `message_sending` / `message_sent`**：傳入 + 傳出訊息掛鉤。
- **`session_start` / `session_end`**：會議生命週期邊界。
- **`gateway_start` / `gateway_stop`**：閘道生命週期事件。

有關掛鉤 API 和註冊詳細資訊，請參閱 [Plugins](/zh-Hant/tools/plugin#plugin-hooks)。

## 串流 + 部分回覆

- 助理增量從 pi-agent-core 串流傳輸並作為 `assistant` 事件發出。
- 區塊串流可以在 `text_end` 或 `message_end` 上發出部分回覆。
- 推理串流可以作為單獨的串流或區塊回覆發出。
- 有關分塊和區塊回覆行為，請參閱 [Streaming](/zh-Hant/concepts/streaming)。

## 工具執行 + 訊息傳遞工具

- 工具開始/更新/結束事件在 `tool` 串流上發出。
- 工具結果會在記錄/發出之前，針對大小和圖像酬載進行清理。
- 訊息傳遞工具發送會被追蹤，以抑制重複的助理確認。

## 回覆塑形 + 抑制

- 最終酬載由以下組成：
  - 助理文字（和可選推理）
  - 內聯工具摘要（當詳細資訊開啟且允許時）
  - 模型錯誤時的助理錯誤文字
- `NO_REPLY` 被視為靜默權杖，並會從傳出酬載中過濾掉。
- 訊息傳遞工具的重複項會從最終酬載列表中移除。
- 如果沒有剩下可渲染的酬載且工具發生錯誤，則會發出後備工具錯誤回覆
  （除非訊息傳遞工具已經發送了使用者可見的回覆）。

## 壓縮 + 重試

- 自動壓縮會發出 `compaction` 串流事件，並可以觸發重試。
- 重試時，記憶體緩衝區和工具摘要會被重置，以避免重複輸出。
- 請參閱 [壓縮](/zh-Hant/concepts/compaction) 以了解壓縮管線。

## 事件串流（目前）

- `lifecycle`：由 `subscribeEmbeddedPiSession` 發出（並由 `agentCommand` 作為後備機制發出）
- `assistant`：來自 pi-agent-core 的串流增量
- `tool`：來自 pi-agent-core 的串流工具事件

## 聊天頻道處理

- 助理增量會被緩衝至聊天 `delta` 訊息中。
- 會在 **生命週期結束/錯誤** 時發出聊天 `final`。

## 逾時

- `agent.wait` 預設值：30 秒（僅指等待時間）。可由 `timeoutMs` 參數覆蓋。
- Agent 執行時間：`agents.defaults.timeoutSeconds` 預設 600 秒；在 `runEmbeddedPiAgent` 中止計時器中強制執行。

## 可能提前結束的地方

- Agent 逾時（中止）
- AbortSignal（取消）
- Gateway 中斷連線或 RPC 逾時
- `agent.wait` 逾時（僅等待，不會停止 agent）

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
