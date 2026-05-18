---
summary: "在不變更佇列模式的情況下引導活躍執行"
read_when:
  - Using /steer or /tell while an agent is already running
  - Comparing /steer with /queue modes
  - Deciding whether to steer the current run, a sub-agent, or an ACP session
title: "引導"
sidebarTitle: "引導"
---

`/steer` 首先嘗試將指引發送到已活躍的運行。它是用於
「在運行仍在進行時調整此運行」的時刻。如果目前的運行時
無法接受導向，OpenClaw 會將訊息作為一般提示發送，
而不是將其丟棄。

## 目前的工作階段

使用頂層 `/steer` 以目標鎖定目前工作階段的活躍執行：

```text
/steer prefer the smaller patch and keep the tests focused
/tell summarize before making the next tool call
```

行為：

- 僅以目前工作階段的活躍執行為目標。
- 運作方式獨立於工作階段的 `/queue` 模式。
- 當會話處於閒置狀態或活躍運行
  無法接受導向時，使用相同的訊息啟動一般輪次。
- 使用活躍運行時的導向路徑，因此模型會在
  下一個支援的運行時邊界看到指引。

## 導向與佇列

`/queue steer` 使一般傳入訊息在運行活躍
時到達嘗試導向活躍運行。`/steer <message>` 是一個明確指令，
嘗試將該指令的訊息在下一個支援的運行時邊界
注入活躍運行，無論儲存的 `/queue` 設定為何。當
無法使用該注入時，指令前綴會被移除，且 `<message>`
會繼續作為一般提示。

使用：

- 當您想要立即引導活躍運行時，請使用 `/steer <message>`。
- 當您希望未來的一般訊息預設導向
  活躍運行時，請使用 `/queue steer`。
- 當未來的一般訊息應等待後續輪次
  而不是導向活躍運行時，請使用 `/queue collect` 或 `/queue followup`。
- 當最新訊息應取代活躍運行
  而不是導向它時，請使用 `/queue interrupt`。

有關佇列模式和導向邊界，請參閱 [指令佇列](/zh-Hant/concepts/queue) 和
[導向佇列](/zh-Hant/concepts/queue-steering)。

## 子代理

當目標是子運行時，請使用 `/subagents steer`：

```text
/subagents steer 2 focus only on the API surface
```

頂層 `/steer` 不會透過 id 或清單索引選擇子代理程式。它總是
以目前會話的活躍運行為目標。有關
子代理程式 id、標籤和控制指令，請參閱 [子代理程式](/zh-Hant/tools/subagents)。

## ACP 工作階段

當目標是 ACP 駕駛裝置會話時，請使用 `/acp steer`：

```text
/acp steer --session agent:main:acp:codex tighten the repro
```

有關 ACP 會話選擇和運行時
行為，請參閱 [ACP 代理程式](/zh-Hant/tools/acp-agents)。

## 相關

- [斜線指令](/zh-Hant/tools/slash-commands)
- [指令佇列](/zh-Hant/concepts/queue)
- [導向佇列](/zh-Hant/concepts/queue-steering)
- [子代理](/zh-Hant/tools/subagents)
