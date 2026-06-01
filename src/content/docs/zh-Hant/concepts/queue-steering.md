---
summary: "主動執行導引如何在執行時邊界佇列訊息"
read_when:
  - Explaining how steer behaves while an agent is using tools
  - Changing active-run queue behavior or runtime steering integration
  - Comparing steering with followup, collect, and interrupt queue modes
title: "導引佇列"
---

當一般提示詞在會話執行已串流時到達，OpenClaw
預設會嘗試將該提示詞發送至作用中執行時，前提是佇列模式
為 `steer`。該預設行為
不需要任何設定項目或佇列指令。OpenClaw 和原生 Codex app-server harness 以不同方式實作傳送
細節。

## 執行時邊界

導向不會中斷正在執行的工具呼叫。OpenClaw 會在模型邊界檢查
已排程的導向訊息：

1. 助理要求進行工具呼叫。
2. OpenClaw 執行目前助理訊息的工具呼叫批次。
3. OpenClaw 發出回合結束事件。
4. OpenClaw 排清已排程的導向訊息。
5. OpenClaw 會在下次 LLM 呼叫之前，將這些訊息作為使用者訊息附加。

這會將工具結果與要求它們的助理訊息保持配對，然後讓下一次模型呼叫能看到最新的使用者輸入。

原生 Codex app-server harness 公開 `turn/steer` 而非 OpenClaw 執行時的
內部導向佇列。OpenClow 會針對設定的
靜止視窗批次處理已排程的提示詞，然後發送單一 `turn/steer` 請求，其中包含所有依到達順序收集的使用者
輸入。

Codex 審查和手動壓縮回合會拒絕同回合導引。當執行階段無法在 `steer` 模式下接受導引時，OpenClaw 會等待作用中的執行完成後再開始提示。

本頁面說明當模式為 `steer` 時，一般傳入訊息的佇列模式導引。如果模式為 `followup` 或 `collect`，一般訊息不會進入此導引路徑；它們會等待直到作用中的執行完成。關於明確的 `/steer <message>` 指令，請參閱 [導引](/zh-Hant/tools/steer)。

## 模式

| 模式        | 作用中執行行為                       | 後續行為                                           |
| ----------- | ------------------------------------ | -------------------------------------------------- |
| `steer`     | 盡可能將提示導引至作用中的執行階段。 | 如果無法導引，則等待作用中的執行完成。             |
| `followup`  | 不進行導引。                         | 在作用中的執行結束後稍後執行佇列中的訊息。         |
| `collect`   | 不進行導引。                         | 將相容的佇列訊息合併為去抖動視窗後的一個後續回合。 |
| `interrupt` | 中止作用中的執行而不是導引它。       | 中止後開始最新的訊息。                             |

## 爆發範例

如果四位使用者在代理程式執行工具呼叫時傳送訊息：

- 使用預設行為時，作用中執行時會在進行下一個模型決策之前，依
  到達順序接收這四則訊息。OpenClow 會在下一個模型
  邊界排清它們；Codex 則將它們作為單一批次 `turn/steer` 接收。
- 使用 `/queue collect` 時，OpenClaw 不會進行導向。它會等到目前的執行結束，然後在去抖動視窗之後，建立一個包含相容佇列訊息的後續輪次。
- 使用 `/queue interrupt` 時，OpenClaw 會中止目前的執行並開始處理最新的訊息，而不是進行導向。

## 範圍

導向始終以目前的作用中 session 執行為目標。它不會建立新的 session、變更作用中執行的工具原則，或是依發送者分割訊息。在多使用者頻道中，傳入的提示已包含發送者和路由 context，因此下一次的模型呼叫可以看到是誰傳送了每則訊息。

當您希望訊息預設進入佇列而不是導向作用中執行時，請使用 `followup` 或 `collect`。當最新的提示應該取代作用中執行時，請使用 `interrupt`。

## 去抖動

`messages.queue.debounceMs` 適用於已排程的 `followup` 和 `collect` 傳送。
在使用原生 Codex harness 的 `steer` 模式下，它也會設定傳送批次 `turn/steer` 之前的
靜止視窗。對於 OpenClow，主動導向本身不會使用
防抖計時器，因為 OpenClow 自然會將訊息批次處理直到下一個模型
邊界。

## 相關

- [指令佇列](/zh-Hant/concepts/queue)
- [導向](/zh-Hant/tools/steer)
- [訊息](/zh-Hant/concepts/messages)
- [Agent 迴圈](/zh-Hant/concepts/agent-loop)
