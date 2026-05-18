---
summary: "主動執行導引如何在執行時邊界佇列訊息"
read_when:
  - Explaining how steer behaves while an agent is using tools
  - Changing active-run queue behavior or runtime steering integration
  - Comparing steering with followup, collect, and interrupt queue modes
title: "導引佇列"
---

當一般提示在會話運行正在串流時到達，當佇列模式為 `steer` 時，OpenClaw 預設會嘗試將該提示傳送到作用中的執行階段。該預設行為不需要設定項目或佇列指令。Pi 和原生 Codex app-server harness 以不同方式實作傳遞細節。

## 執行時邊界

導引不會中斷正在執行的工具呼叫。Pi 會在模型邊界檢查佇列中的導引訊息：

1. 助理要求進行工具呼叫。
2. Pi 執行目前助理訊息的工具呼叫批次。
3. Pi 發出回合結束事件。
4. Pi 排空佇列中的導引訊息。
5. Pi 會在下次 LLM 呼叫之前，將這些訊息作為使用者訊息附加。

這會將工具結果與要求它們的助理訊息保持配對，然後讓下一次模型呼叫能看到最新的使用者輸入。

原生 Codex app-server harness 公開 `turn/steer` 而非 Pi 的內部導引佇列。OpenClaw 會針對設定的安靜視窗將排入佇列的提示分批，然後傳送單一 `turn/steer` 請求，其中包含依到達順序排列的所有收集的使用者輸入。

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

- 使用預設行為，作用中的執行階段會在下一次模型決策之前以到達順序接收所有四則訊息。Pi 會在下一個模型邊界排空它們；Codex 會將它們作為一個批次 `turn/steer` 接收。
- 使用 `/queue collect` 時，OpenClaw 不會進行導向。它會等到目前的執行結束，然後在去抖動視窗之後，建立一個包含相容佇列訊息的後續輪次。
- 使用 `/queue interrupt` 時，OpenClaw 會中止目前的執行並開始處理最新的訊息，而不是進行導向。

## 範圍

導向始終以目前的作用中 session 執行為目標。它不會建立新的 session、變更作用中執行的工具原則，或是依發送者分割訊息。在多使用者頻道中，傳入的提示已包含發送者和路由 context，因此下一次的模型呼叫可以看到是誰傳送了每則訊息。

當您希望訊息預設進入佇列而不是導向作用中執行時，請使用 `followup` 或 `collect`。當最新的提示應該取代作用中執行時，請使用 `interrupt`。

## 去抖動

`messages.queue.debounceMs` 套用於佇列中的 `followup` 和 `collect` 傳遞。在原生 Codex harness 的 `steer` 模式下，它也會在傳送批次 `turn/steer` 之前設定安靜視窗。對於 Pi，主動導向本身不會使用去抖動計時器，因為 Pi 會自然地將訊息批次處理直到下一個模型邊界。

## 相關

- [指令佇列](/zh-Hant/concepts/queue)
- [導向](/zh-Hant/tools/steer)
- [訊息](/zh-Hant/concepts/messages)
- [Agent 迴圈](/zh-Hant/concepts/agent-loop)
