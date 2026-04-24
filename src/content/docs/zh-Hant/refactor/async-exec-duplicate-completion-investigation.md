---
summary: "重複異步執行完成注入的調查筆記"
read_when:
  - Debugging repeated node exec completion events
  - Working on heartbeat/system-event dedupe
title: "Async Exec Duplicate Completion Investigation"
---

# Async Exec Duplicate Completion Investigation

## 範圍

- Session: `agent:main:telegram:group:-1003774691294:topic:1`
- 症狀：針對 session/run `keen-nexus` 的同一個異步執行完成事件在 LCM 中被記錄了兩次，作為用戶輪次。
- 目標：確定這最可能是重複的 session 注入還是單純的出站交付重試。

## 結論

這最可能是**重複的 session 注入**，而不是單純的出站交付重試。

網關端最明顯的缺口在於**節點執行完成路徑**：

1. 節點端執行完成時會發出帶有完整 `runId` 的 `exec.finished`。
2. 網關 `server-node-events` 將其轉換為系統事件並請求心跳。
3. 心跳運行將排空的系統事件塊注入到 Agent prompt 中。
4. 嵌入式運行器將該 prompt 作為新的用戶輪次持久化到 session 記錄中。

如果相同的 `exec.finished` 由於任何原因（重播、重連重複、上游重發、重複的生產者）針對相同的 `runId` 兩次到達網關，OpenClaw 目前在此路徑上**沒有以 `runId`/`contextKey` 為鍵的冪等性檢查**。第二份副本將成為具有相同內容的第二條用戶訊息。

## 確切代碼路徑

### 1. 生產者：節點執行完成事件

- `src/node-host/invoke.ts:340-360`
  - `sendExecFinishedEvent(...)` 發出帶有事件 `exec.finished` 的 `node.event`。
  - Payload 包含 `sessionKey` 和完整的 `runId`。

### 2. 網關事件接收

- `src/gateway/server-node-events.ts:574-640`
  - 處理 `exec.finished`。
  - 構建文本：
    - `Exec finished (node=..., id=<runId>, code ...)`
  - 通過以下方式將其排隊：
    - `enqueueSystemEvent(text, { sessionKey, contextKey: runId ? \`exec:${runId}\` : "exec", trusted: false })`
  - 立即請求喚醒：
    - `requestHeartbeatNow(scopedHeartbeatWakeOptions(sessionKey, { reason: "exec-event" }))`

### 3. 系統事件去重薄弱環節

- `src/infra/system-events.ts:90-115`
  - `enqueueSystemEvent(...)` 僅抑制**連續重複的文本**：
    - `if (entry.lastText === cleaned) return false`
  - 它儲存 `contextKey`，但並**不**使用 `contextKey` 來達到冪等性（idempotency）。
  - 排空（drain）之後，重複抑制會重置。

這意味著重播的 `exec.finished` 即便具有相同的 `runId`，稍後仍可能被接受，即使程式碼已經擁有一個穩定的冪等候選（`exec:<runId>`）。

### 4. 喚醒處理並非主要的重複來源

- `src/infra/heartbeat-wake.ts:79-117`
  - 喚醒會由 `(agentId, sessionKey)` 進行合併。
  - 針對同一目標的重複喚醒請求會折疊為一個待處理的喚醒項目。

這使得僅憑**重複喚醒處理**作為解釋的理由，比重複事件攝入的理由要弱。

### 5. 心跳消耗事件並將其轉化為提示輸入

- `src/infra/heartbeat-runner.ts:535-574`
  - 預檢會窺視待處理的系統事件並對執行事件執行分類。
- `src/auto-reply/reply/session-system-events.ts:86-90`
  - `drainFormattedSystemEvents(...)` 排空該會話的佇列。
- `src/auto-reply/reply/get-reply-run.ts:400-427`
  - 被排空的系統事件區塊會被前置插入到代理提示主體中。

### 6. 轉錄注入點

- `src/agents/pi-embedded-runner/run/attempt.ts:2000-2017`
  - `activeSession.prompt(effectivePrompt)` 將完整提示提交給內嵌的 PI 會話。
  - 這就是從完成衍生出的提示變成持久化使用者輪次的地方。

因此，一旦相同的系統事件被兩次重建到提示中，就會預期出現重複的 LCM 使用者訊息。

## 為什麼單純的外送重試可能性較低

在心跳執行器中確實存在一個外送失敗路徑：

- `src/infra/heartbeat-runner.ts:1194-1242`
  - 回覆會先生成。
  - 外送稍後透過 `deliverOutboundPayloads(...)` 發生。
  - 那裡的失敗會返回 `{ status: "failed" }`。

然而，對於同一個系統事件佇列項目，僅憑這一點**不足以**解釋重複的使用者輪次：

- `src/auto-reply/reply/session-system-events.ts:86-90`
  - 系統事件佇列在外送之前就已經被排空了。

因此，通道發送重試本身並不會重新創建完全相同的佇列事件。它或許能解釋遺失或失敗的外部遞送，但本身並不足以解釋第二條完全相同的會話使用者訊息。

## 次要的、較低置信度的可能性

代理執行器中存在一個完整執行重試循環：

- `src/auto-reply/reply/agent-runner-execution.ts:741-1473`
  - 某些瞬態故障可以重試整個執行並重新提交相同的 `commandBody`。

如果在觸發重試條件之前提示已經被附加，這可能會在**同一個回覆執行中**重複一個持久化的使用者提示。

我將此的排位低於重複 `exec.finished` 擷取，因為：

- 觀察到的間隙大約是 51 秒，這看起來更像是第二次喚醒/輪次，而不是程序內的重試；
- 該報告已經提到了重複的訊息發送失敗，這更多地指向了一個獨立的後續輪次，而不是立即的模型/運行時重試。

## 根本原因假設

最高置信度假設：

- `keen-nexus` 完成是通過 **節點執行事件路徑** 來的。
- 同一個 `exec.finished` 被交付給 `server-node-events` 兩次。
- Gateway 接受了兩者，因為 `enqueueSystemEvent(...)` 不根據 `contextKey` / `runId` 進行去重。
- 每個接受的事件都觸發了一個心跳，並作為使用者輪次被注入到 PI 腳本中。

## 提議的微小外科手術式修復

如果需要修復，最小的高價值變更是：

- 使執行/系統事件等冪性在短時間內尊重 `contextKey`，至少對於確切的 `(sessionKey, contextKey, text)` 重複；
- 或者在 `server-node-events` 中為 `exec.finished` 添加一個專用的去重，並以 `(sessionKey, runId, event kind)` 為鍵。

這將直接在重播的 `exec.finished` 重複項變成會話輪次之前將其阻擋。
