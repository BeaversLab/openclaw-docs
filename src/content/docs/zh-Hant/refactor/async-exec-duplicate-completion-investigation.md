# Async Exec 重複完成調查

## 範圍

- Session：`agent:main:telegram:group:-1003774691294:topic:1`
- 症狀：同一個 session/run `keen-nexus` 的 async exec 完成事件在 LCM 中被記錄了兩次，成為 user turns。
- 目標：確認這最可能是重複 session 注入還是單純的出站傳遞重試。

## 結論

最可能這是**重複 session 注入**，而非單純的出站傳遞重試。

最強的 Gateway 端缺口在於 **node exec completion 路徑**：

1. Node 端 exec 完成時發出 `exec.finished`，其中包含完整的 `runId`。
2. Gateway `server-node-events` 將其轉換為系統事件並請求心跳。
3. 心跳運行將排空的系統事件區塊注入到 agent 提示詞中。
4. 嵌入式運行器將該提示詞作為新的 user turn 持久化到 session 轉錄中。

如果相同的 `exec.finished` 因任何原因（重播、重連重複、上游重發、重複的生產者）針對相同的 `runId` 兩次到達 Gateway，OpenClaw 目前在此路徑上**沒有以 `runId`/`contextKey` 為鍵的冪等性檢查**。第二個副本將成為具有相同內容的第二條使用者訊息。

## 確切程式碼路徑

### 1. 生產者：node exec 完成事件

- `src/node-host/invoke.ts:340-360`
  - `sendExecFinishedEvent(...)` 發出 `node.event`，事件為 `exec.finished`。
  - Payload 包含 `sessionKey` 和完整的 `runId`。

### 2. Gateway 事件攝入

- `src/gateway/server-node-events.ts:574-640`
  - 處理 `exec.finished`。
  - 建構文字：
    - `Exec finished (node=..., id=<runId>, code ...)`
  - 透過以下方式加入佇列：
    - `enqueueSystemEvent(text, { sessionKey, contextKey: runId ? \`exec:${runId}\` : "exec", trusted: false })`
  - 立即請求喚醒：
    - `requestHeartbeatNow(scopedHeartbeatWakeOptions(sessionKey, { reason: "exec-event" }))`

### 3. 系統事件去重弱點

- `src/infra/system-events.ts:90-115`
  - `enqueueSystemEvent(...)` 僅抑制**連續重複的文字**：
    - `if (entry.lastText === cleaned) return false`
  - 它儲存 `contextKey`，但**不**使用 `contextKey` 進行冪等性檢查。
  - 排空後，重複抑制會重置。

這意味著具有相同 `runId` 的重播 `exec.finished` 稍後可能會再次被接受，即使代碼已經有了一個穩定的冪等候選者（`exec:<runId>`）。

### 4. Wake 處理不是主要的重複原因

- `src/infra/heartbeat-wake.ts:79-117`
  - Wake 由 `(agentId, sessionKey)` 合併。
  - 對同一目標的重複 wake 請求會折疊為一個待處理的 wake 條目。

這使得僅靠**重複 wake 處理**這一點比重複事件攝入的可能性更小。

### 5. 心跳消耗事件並將其轉換為提示輸入

- `src/infra/heartbeat-runner.ts:535-574`
  - Preflight 會查看待處理的系統事件並對 exec-event 運行進行分類。
- `src/auto-reply/reply/session-system-events.ts:86-90`
  - `drainFormattedSystemEvents(...)` 排空該會話的佇列。
- `src/auto-reply/reply/get-reply-run.ts:400-427`
  - 排空的系統事件塊被前置插入到 Agent 提示主體中。

### 6. 腳本注入點

- `src/agents/pi-embedded-runner/run/attempt.ts:2000-2017`
  - `activeSession.prompt(effectivePrompt)` 將完整提示提交到嵌入式 PI 會話。
  - 這就是從完成導出的提示變成持久化用戶輪次的地方。

因此，一旦同一系統事件被兩次重建到提示中，就會出現重複的 LCM 用戶訊息。

## 為什麼純出站傳遞重試的可能性較低

在心跳運行器中有一個真正的出站失敗路徑：

- `src/infra/heartbeat-runner.ts:1194-1242`
  - 回覆首先被生成。
  - 出站傳遞稍後通過 `deliverOutboundPayloads(...)` 發生。
  - 那裡的失敗會返回 `{ status: "failed" }`。

然而，對於同一系統事件佇列條目，僅憑這一點**不足以**解釋重複的用戶輪次：

- `src/auto-reply/reply/session-system-events.ts:86-90`
  - 系統事件佇列在出站傳遞之前已經被排空。

因此，單獨的通道發送重試不會重新創建完全相同的佇列事件。這可以解釋外部傳遞丟失/失敗，但不能單獨解釋第二條相同的會話用戶訊息。

## 次要、較低置信度的可能性

在 Agent 運行器中有一個完整的運行重試循環：

- `src/auto-reply/reply/agent-runner-execution.ts:741-1473`
  - 某些瞬態失敗可以重試整個運行並重新提交相同的 `commandBody`。

如果提示已在重試條件觸發之前被附加，這可能會**在同一個回覆執行中**重複已持久化的使用者提示。

我將其排在重複 `exec.finished` 摄取之後，因為：

- 觀察到的時間間隔大約是 51 秒，這看起來更像是第二次喚醒/輪次，而不是進行中的重試；
- 報告中已經提到了重複的訊息發送失敗，這更指向於稍後的獨立輪次，而不是立即的模型/執行時重試。

## 根本原因假設

最高置信度的假設：

- `keen-nexus` 完成內容是透過 **node exec 事件路徑** 傳遞的。
- 同一個 `exec.finished` 被傳遞到 `server-node-events` 兩次。
- Gateway 接受了兩者，因為 `enqueueSystemEvent(...)` 不會根據 `contextKey` / `runId` 去重。
- 每個被接受的事件都觸發了一個心跳，並作為使用者輪次被注入到 PI 逐字稿中。

## 建議的微小精準修復

如果需要修復，最小且高價值的變更是：

- 讓 exec/system-event 的等冪性在短時間內遵從 `contextKey`，至少對於完全相同的 `(sessionKey, contextKey, text)` 重複；
- 或者在 `server-node-events` 中為 `exec.finished` 新增專門的去重邏輯，並以 `(sessionKey, runId, event kind)` 為鍵。

這將直接在被重放的 `exec.finished` 重複項變成會話輪次之前將其阻擋。
