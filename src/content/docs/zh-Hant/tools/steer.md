---
summary: "引導正在運行的執行，而不變更佇列模式"
read_when:
  - Using /steer or /tell while an agent is already running
  - Comparing /steer with /queue modes
  - Deciding whether to steer the current run or an ACP session
title: "引導"
sidebarTitle: "引導"
---

`/steer` 首先會嘗試將指引傳送給已啟用的執行。這適用於
「在運作中調整此執行」的時刻。如果目前的執行階段
無法接受引導，OpenClaw 會將訊息作為一般提示傳送，
而不是將其丟棄。

## 目前的工作階段

使用頂層 `/steer` 以指定目前工作階段的啟用執行：

```text
/steer prefer the smaller patch and keep the tests focused
/tell summarize before making the next tool call
```

行為：

- 僅以目前工作階段的活躍執行為目標。
- 運作獨立於工作階段的 `/queue` 模式。
- 當會話處於閒置狀態或活躍運行
  無法接受導向時，使用相同的訊息啟動一般輪次。
- 使用活躍運行時的導向路徑，因此模型會在
  下一個支援的運行時邊界看到指引。

## 導向與佇列

`/queue steer` 會讓一般傳入訊息在抵達且執行啟用時嘗試引導該啟用執行。
`/steer <message>` 是一個明確的指令，嘗試將該指令的訊息在下一個支援的
執行階段邊界注入啟用執行中，而不論儲存的 `/queue` 設定為何。
當無法注入時，指令前綴會被移除，且 `<message>`
會繼續作為一般提示運作。

使用：

- 當您想立即引導啟用執行時，請使用 `/steer <message>`。
- 當您希望未來的一般訊息預設引導啟用執行時，請使用
  `/queue steer`。
- 當未來的一般訊息應等待下一輪，而非引導啟用執行時，請使用
  `/queue collect` 或 `/queue followup`。
- 當最新訊息應取代啟用執行，而非引導它時，請使用
  `/queue interrupt`。

關於佇列模式和引導邊界，請參閱[指令佇列](/zh-Hant/concepts/queue)和
[引導佇列](/zh-Hant/concepts/queue-steering)。

## 子代理

頂層 `/steer` 的目標是目前工作階段的啟用執行。子代理會回報給
其父/請求者工作階段；`/subagents` 僅用於可視性。

## ACP 工作階段

當目標是 ACP 配接器工作階段時，請使用 `/acp steer`：

```text
/acp steer --session agent:main:acp:codex tighten the repro
```

關於 ACP 工作階段選擇和執行階段行為，請參閱 [ACP 代理](/zh-Hant/tools/acp-agents)。

## 相關

- [斜線指令](/zh-Hant/tools/slash-commands)
- [指令佇列](/zh-Hant/concepts/queue)
- [導向佇列](/zh-Hant/concepts/queue-steering)
- [子代理](/zh-Hant/tools/subagents)
