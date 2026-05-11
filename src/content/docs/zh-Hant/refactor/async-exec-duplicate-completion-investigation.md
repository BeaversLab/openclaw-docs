---
summary: "重複異步執行完成注入的調查筆記"
read_when:
  - Debugging repeated node exec completion events
  - Working on heartbeat/system-event dedupe
title: "Async exec duplicate completion investigation"
---

## 範圍

- Session：`agent:main:telegram:group:-1003774691294:topic:1`
- 症狀：針對 session/run `keen-nexus` 的同一個 async exec completion 在 LCM 中被記錄了兩次，作為 user turns。
- 目標：確認這最可能是重複的 session injection 還是單純的 outbound delivery retry。

## 結論

這最可能是 **duplicate session injection**，而不是單純的 outbound delivery retry。

Gateway 端最明顯的缺失在於 **node exec completion path**：

1. Node-side exec finish 會發出帶有完整 `runId` 的 `exec.finished`。
2. Gateway `server-node-events` 會將其轉換為系統事件並請求 heartbeat。
3. Heartbeat run 會將排空的系統事件區塊注入到 agent prompt 中。
4. Embedded runner 會將該 prompt 作為新的 user turn 持久化到 session transcript 中。

如果由於任何原因（重放、重連重複、上游重發、重複的生產者），同一個 `exec.finished` 兩次到達同一個 `runId` 的 gateway，OpenClaw 目前在此路徑上**沒有以 `runId`/`contextKey` 為鍵的等幂性檢查**。第二個副本將變成具有相同內容的第二個用戶訊息。

## 確切程式碼路徑

### 1. Producer：node exec completion 事件

- `src/node-host/invoke.ts:340-360`
  - `sendExecFinishedEvent(...)` 發出帶有事件 `exec.finished` 的 `node.event`。
  - Payload 包含 `sessionKey` 和完整的 `runId`。

### 2. Gateway 事件攝取

- `src/gateway/server-node-events.ts:574-640`
  - 處理 `exec.finished`。
  - 建構文字：
    - `Exec finished (node=..., id=<runId>, code ...)`
  - 透過以下方式將其加入佇列：
    - `enqueueSystemEvent(text, { sessionKey, contextKey: runId ? \`exec:${runId}\` : "exec", trusted: false })`
  - 立即請求喚醒：
    - `requestHeartbeatNow(scopedHeartbeatWakeOptions(sessionKey, { reason: "exec-event" }))`

### 3. 系統事件去重弱點

- `src/infra/system-events.ts:90-115`
  - `enqueueSystemEvent(...)` 僅抑制 **連續重複的文字**：
    - `if (entry.lastText === cleaned) return false`
  - 它儲存了 `contextKey`，但並**不**使用 `contextKey` 來實現冪等性。
  - 排空後，重複抑制會重置。

這意味著稍後可以再次接受具有相同 `runId` 的重放 `exec.finished`，即使代碼已經有了一個穩定的冪等候選者（`exec:<runId>`）。

### 4. Wake 處理不是主要的重複原因

- `src/infra/heartbeat-wake.ts:79-117`
  - Wakes 由 `(agentId, sessionKey)` 合併。
  - 對同一目標的重複 wake 請求會合併為一個待處理的 wake 條目。

這使得單獨的**重複 wake 處理**比重複事件攝入的可能性更小。

### 5. Heartbeat 消耗事件並將其轉換為 prompt 輸入

- `src/infra/heartbeat-runner.ts:535-574`
  - Preflight 預覽待處理的系統事件並對 exec-event runs 進行分類。
- `src/auto-reply/reply/session-system-events.ts:86-90`
  - `drainFormattedSystemEvents(...)` 排空該 session 的佇列。
- `src/auto-reply/reply/get-reply-run.ts:400-427`
  - 排空的系統事件塊被前置到 agent prompt 主體中。

### 6. 轉錄注入點

- `src/agents/pi-embedded-runner/run/attempt.ts:2000-2017`
  - `activeSession.prompt(effectivePrompt)` 將完整的 prompt 提交給嵌入式 PI session。
  - 這就是完成派生的 prompt 成為持久化用戶輪次的時刻。

因此，一旦同一系統事件被兩次重建到 prompt 中，就會預期出現重複的 LCM 用戶消息。

## 為什麼純出站傳遞重試的可能性較低

在 heartbeat runner 中存在一個真實的出站失敗路徑：

- `src/infra/heartbeat-runner.ts:1194-1242`
  - 回覆先生成。
  - 出站傳遞稍後通過 `deliverOutboundPayloads(...)` 進行。
  - 那裡的失敗會返回 `{ status: "failed" }`。

然而，對於同一系統事件佇列條目，僅憑這一點**不足以**解釋重複的用戶輪次：

- `src/auto-reply/reply/session-system-events.ts:86-90`
  - 系統事件佇列在出站傳遞之前已經被排空。

因此，單獨的通道發送重試不會重新創建完全相同的已排隊事件。這可以解釋缺失/失敗的外部傳遞，但不能單獨解釋第二次相同的 session 用戶消息。

## 次要的、較低置信度的可能性

在 agent runner 中存在一個完整運行重試循環：

- `src/auto-reply/reply/agent-runner-execution.ts:741-1473`
  - 某些暫時性故障可能會重試整個運行並重新提交相同的 `commandBody`。

如果在觸發重試條件之前提示已經被附加，這可能會**在同一個回覆執行中**重複持續化的使用者提示。

我將其排在重複 `exec.finished` 摄取的可能性之後，因為：

- 觀察到的間隔約為 51 秒，這看起來更像是第二次喚醒/輪次，而不是進行中的重試；
- 該報告已經提到了重複的訊息發送失敗，這指向更像是後續的單獨輪次，而不是立即的模型/運行時重試。

## 根本原因假設

最高置信度的假設：

- `keen-nexus` 完成是通過 **node exec event path** 傳入的。
- 相同的 `exec.finished` 被交付到 `server-node-events` 兩次。
- Gateway 接受了兩者，因為 `enqueueSystemEvent(...)` 不會根據 `contextKey` / `runId` 進行去重。
- 每個被接受的事件都觸發了一個心跳，並作為使用者輪次被注入到 PI 轉錄中。

## 建議的微小手術式修復

如果需要修復，最小的高價值變更是：

- 讓 exec/system-event 冪等性在短時間內尊重 `contextKey`，至少對於確切的 `(sessionKey, contextKey, text)` 重複；
- 或者在 `server-node-events` 中為 `exec.finished` 添加專用的去重邏輯，以 `(sessionKey, runId, event kind)` 為鍵。

這將直接在重播的 `exec.finished` 重複項變成會話輪次之前將其阻止。

## 相關

- [Exec 工具](/zh-Hant/tools/exec)
- [會話管理](/zh-Hant/concepts/session)
