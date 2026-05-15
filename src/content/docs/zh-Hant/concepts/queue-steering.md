---
summary: "主動執行導引如何在執行時邊界佇列訊息"
read_when:
  - Explaining how steer behaves while an agent is using tools
  - Changing active-run queue behavior or runtime steering integration
  - Comparing steer, queue, collect, and followup modes
title: "導引佇列"
---

當會話執行正在串流傳輸時收到訊息，OpenClaw 可以將該訊息傳入主動執行階段，而不是為同一個會話啟動另一個執行。公開模式與執行階段無關；Pi 和原生 Codex 應用程式伺服器套件 (app-server harness) 的實作方式不同。

## 執行時邊界

導引不會中斷正在執行的工具呼叫。Pi 會在模型邊界檢查佇列中的導引訊息：

1. 助理要求進行工具呼叫。
2. Pi 執行目前助理訊息的工具呼叫批次。
3. Pi 發出回合結束事件。
4. Pi 排空佇列中的導引訊息。
5. Pi 會在下次 LLM 呼叫之前，將這些訊息作為使用者訊息附加。

這會將工具結果與要求它們的助理訊息保持配對，然後讓下一次模型呼叫能看到最新的使用者輸入。

原生 Codex 應用程式伺服器套件公開 `turn/steer`，而不是 Pi 的內部導引佇列。OpenClaw 在那裡調整了相同的模式：

- `steer` 針對設定的安靜視窗將佇列訊息分批，然後發送單一 `turn/steer` 請求，其中包含按到達順序排列的所有收集到的使用者輸入。
- `queue` 透過發送個別的 `turn/steer` 請求來保留舊版的序列化形狀。
- `followup`、`collect`、`steer-backlog` 和 `interrupt` 保持圍繞主動 Codex 回合的 OpenClaw 擁有佇列行為。

Codex 審閱和手動壓縮回合會拒絕同回合導引。當執行階段無法接受導引時，OpenClaw 會在該模式允許的情況下退回至後續佇列。

本頁面說明正常傳入訊息的佇列模式導引。關於明確的 `/steer <message>` 指令，請參閱 [導引](/zh-Hant/tools/steer)。

## 模式

| 模式            | 主動執行行為                                                                              | 稍後後續行為                                       |
| --------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `steer`         | 在下一個執行時邊界一併插入所有佇列中的導引訊息。這是預設值。                              | 僅在無法導向時回退至後續。                         |
| `queue`         | 舊版一次一則導向。Pi 在每個模型邊界注入一則佇列訊息；Codex 發送獨立的 `turn/steer` 請求。 | 僅在無法導向時回退至後續。                         |
| `steer-backlog` | 與 `steer` 具有相同的活躍執行導向行為。                                                   | 同時保留相同的訊息以供之後的後續輪次使用。         |
| `followup`      | 不導向當前的執行。                                                                        | 稍後執行佇列中的訊息。                             |
| `collect`       | 不導向當前的執行。                                                                        | 將相容的佇列訊息在防抖視窗後合併為一個稍後的輪次。 |
| `interrupt`     | 中止活躍的執行，然後開始最新的訊息。                                                      | 無。                                               |

## 突發範例

如果在代理執行工具呼叫時有四位使用者發送訊息：

- `steer`：活躍執行時環境會在進行下一個模型決策之前，依到達順序接收所有四則訊息。Pi 會在下一個模型邊界排空它們；Codex 則將它們作為一個批次處理的 `turn/steer` 接收。
- `queue`：舊版序列化導向。Pi 每次注入一則佇列訊息；Codex 接收獨立的 `turn/steer` 請求。
- `collect`：OpenClaw 會等到活躍執行結束，然後在防抖視窗後建立一個包含相容佇列訊息的後續輪次。

## 範圍

導向始終以當前活躍的工作階段執行為目標。它不會建立新工作階段、變更活躍執行的工具政策，或依發送者分割訊息。在多使用者通道中，輸入提示已包含發送者和路由上下文，因此下一次模型呼叫可以看見誰發送了每則訊息。

當您希望 OpenClaw 建立稍後的後續輪次以合併相容訊息並保留後續佇列捨棄政策時，請使用 `collect`。僅在您需要較舊的一次一則導向行為時才使用 `queue`。

## 防抖

`messages.queue.debounceMs` 適用於後續傳遞，包括 `collect`、
`followup`、`steer-backlog`，以及當主動執行導向不可用時的 `steer` 退回機制。對於 Pi，主動 `steer` 本身不會使用防抖計時器，因為
Pi 自然會將訊息批次處理直到下一個模型邊界。對於原生
Codex harness，OpenClaw 在傳送批次處理的 `turn/steer` 之前，使用與安靜視窗相同的防抖值。

## 相關

- [指令佇列](/zh-Hant/concepts/queue)
- [導向](/zh-Hant/tools/steer)
- [訊息](/zh-Hant/concepts/messages)
- [代理程式迴圈](/zh-Hant/concepts/agent-loop)
