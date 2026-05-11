---
summary: "Agent loop lifecycle, streams, and wait semantics"
read_when:
  - You need an exact walkthrough of the agent loop or lifecycle events
  - You are changing session queueing, transcript writes, or session write lock behavior
title: "Agent loop"
---

Agentic loop 是 agent 完整的「真實」執行過程：intake → context assembly → model inference → tool execution → streaming replies → persistence。這是一條權威路徑，將訊息轉換為動作和最終回覆，同時保持會話狀態一致。

在 OpenClaw 中，loop 是每個會話單一、序列化的執行過程，隨著模型思考、呼叫工具和串流輸出而發出生命週期和串流事件。本文說明了該真實 loop 端到端的連接方式。

## 進入點

- Gateway RPC：`agent` 和 `agent.wait`。
- CLI：`agent` 指令。

## 運作方式（高階）

1. `agent` RPC 會驗證參數、解析會話（sessionKey/sessionId）、保存會話元資料，並立即傳回 `{ runId, acceptedAt }`。
2. `agentCommand` 執行 agent：
   - 解析模型與 thinking/verbose/trace 預設值
   - 載入技能快照
   - 呼叫 `runEmbeddedPiAgent` (pi-agent-core runtime)
   - 如果內嵌 loop 未發出，則發出 **lifecycle end/error**
3. `runEmbeddedPiAgent`：
   - 透過每個會話 + 全域佇列序列化執行
   - 解析模型與 auth 設定檔並建立 pi 會話
   - 訂閱 pi 事件並串流助理/工具增量
   - 執行逾時 -> 若超過則中止執行
   - 傳回 payloads + usage 元資料
4. `subscribeEmbeddedPiSession` 將 pi-agent-core 事件橋接到 OpenClaw `agent` 串流：
   - tool events => `stream: "tool"`
   - assistant deltas => `stream: "assistant"`
   - lifecycle events => `stream: "lifecycle"` (`phase: "start" | "end" | "error"`)
5. `agent.wait` 使用 `waitForAgentRun`：
   - 等待 **lifecycle end/error** 以進行 `runId`
   - 傳回 `{ status: ok|error|timeout, startedAt, endedAt, error? }`

## 佇列 + 並行

- 執行會根據每個會話金鑰（session lane）進行序列化，並可選擇透過全域 lane 執行。
- 這可防止工具/會話競爭，並保持會話歷史記錄一致。
- 訊息通道可以選擇提供給此通道系統的佇列模式 (collect/steer/followup)。
  請參閱 [Command Queue](/zh-Hant/concepts/queue)。
- 對話記錄寫入也受工作階段檔案上的工作階段寫入鎖保護。該鎖具備行程感知且基於檔案，因此它可以捕捉繞過行程內佇列或來自其他行程的寫入者。
- 工作階段寫入鎖預設為不可重入。如果輔助函式有意在保持同一邏輯寫入者的同時巢狀獲取同一個鎖，則必須使用 `allowReentrant: true` 明確選擇加入。

## 工作階段 + 工作區準備

- 工作區已解析並建立；沙箱執行可能會重新導向至沙箱工作區根目錄。
- 技能已載入 (或從快照重複使用) 並注入至環境和提示中。
- 啟動/上下文檔案已解析並注入至系統提示報告中。
- 取得工作階段寫入鎖；`SessionManager` 已開啟並在串流前準備就緒。任何後續的對話記錄重寫、壓縮或截斷路徑必須在開啟或變更對話記錄檔案之前取得相同的鎖。

## 提示組裝 + 系統提示

- 系統提示由 OpenClaw 的基本提示、技能提示、啟動上下文和每次執行的覆寫組建而成。
- 特定模型的限制與壓縮保留 Token 會被強制執行。
- 關於模型看到的內容，請參閱 [System prompt](/zh-Hant/concepts/system-prompt)。

## 掛鉤點 (您可以在何處攔截)

OpenClaw 具有兩個掛鉤系統：

- **內部掛鉤** (Gateway 掛鉤)：用於指令和生命週期事件的事件驅動腳本。
- **外掛程式掛鉤**：代理程式/工具生命週期和管線內的擴充點。

### 內部掛鉤 (Gateway 掛鉤)

- **`agent:bootstrap`**：在系統提示定案之前建置啟動檔案時執行。
  使用此選項來新增/移除啟動上下文檔案。
- **指令掛鉤**：`/new`、`/reset`、`/stop` 和其他指令事件 (請參閱 Hooks 文件)。

有關設定和範例，請參閱 [Hooks](/zh-Hant/automation/hooks)。

### 外掛程式掛鉤 (agent + gateway 生命週期)

這些在 agent 迴圈或 gateway 管線內執行：

- **`before_model_resolve`**：在會話前運行（無 `messages`），以便在模型解析前確定性地覆寫提供者/模型。
- **`before_prompt_build`**：在會話加載後運行（帶有 `messages`），以便在提示提交前注入 `prependContext`、`systemPrompt`、`prependSystemContext` 或 `appendSystemContext`。請使用 `prependContext` 處理每輪動態文字，並使用系統上下文欄位處理應置於系統提示空間中的穩定指導。
- **`before_agent_start`**：舊版相容性掛鉤，可能在任一階段運行；建議優先使用上述的明確掛鉤。
- **`before_agent_reply`**：在內聯動作之後和 LLM 呼叫之前運行，允許外掛程式接管該輪並返回合成回覆，或完全使該輪靜音。
- **`agent_end`**：在完成後檢查最終訊息列表和執行中繼資料。
- **`before_compaction` / `after_compaction`**：觀察或註解壓縮循環。
- **`before_tool_call` / `after_tool_call`**：攔截工具參數/結果。
- **`before_install`**：檢查內建掃描發現，並可選擇封鎖技能或外掛程式安裝。
- **`tool_result_persist`**：在將工具結果寫入 OpenClaw 擁有的會話文字記錄之前，同步轉換工具結果。
- **`message_received` / `message_sending` / `message_sent`**：入站 + 出站訊息掛鉤。
- **`session_start` / `session_end`**：會請生命週期邊界。
- **`gateway_start` / `gateway_stop`**：閘道生命週期事件。

出站/工具防護的掛鉤決策規則：

- `before_tool_call`：`{ block: true }` 是終止性的，並會停止較低優先級的處理程式。
- `before_tool_call`：`{ block: false }` 是無操作（no-op），並且不會清除先前的封鎖。
- `before_install`：`{ block: true }` 是終止性的，並會停止較低優先級的處理程式。
- `before_install`：`{ block: false }` 是空操作，不會清除先前的區塊。
- `message_sending`：`{ cancel: true }` 是終止性的，會停止較低優先級的處理程序。
- `message_sending` `{ cancel: false }` 是空操作，不會清除先前的取消。

請參閱 [Plugin hooks](/zh-Hant/plugins/hooks) 以了解 Hook API 和註冊細節。

Harness 可能會以不同方式調整這些 hooks。Codex app-server harness 將 OpenClaw 外掛程式 hooks 保留為文件化對應表面的相容性合約，而 Codex 原生 hooks 則保持為一個獨立的較低層級 Codex 機制。

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
- 模型閒置逾時：當在閒置時間視窗內沒有回應區塊到達時，OpenClaw 會中止模型請求。`models.providers.<id>.timeoutSeconds` 會針對緩慢的本機/自託管提供者延長此閒置監視；否則，當有配置時，OpenClaw 使用 `agents.defaults.timeoutSeconds`，預設上限為 120 秒。沒有明確模型或 agent 逾時的 cron 觸發執行會停用閒置監視，並依賴 cron 外部逾時。
- 提供者 HTTP 請求逾時：`models.providers.<id>.timeoutSeconds` 適用於該提供者的模型 HTTP 擷取，包括連線、標頭、主體、SDK 請求逾時、總防護擷取中止處理以及模型串流閒置監視。在提高整個 agent 執行時逾時之前，請先對 Ollama 等緩慢的本機/自託管提供者使用此設定。

## 何處可能提前結束

- Agent 逾時 (中止)
- AbortSignal (取消)
- Gateway 中斷連線或 RPC 逾時
- `agent.wait` 逾時 (僅等待，不會停止 agent)

## 相關

- [Tools](/zh-Hant/tools) — 可用的 agent 工具
- [Hooks](/zh-Hant/automation/hooks) — 由 agent 生命週期事件觸發的事件驅動腳本
- [Compaction](/zh-Hant/concepts/compaction) — 長對話的總結方式
- [Exec Approvals](/zh-Hant/tools/exec-approvals) — shell 指令的審核閘門
- [Thinking](/zh-Hant/tools/thinking) — 思考/推理層級配置
