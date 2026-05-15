---
summary: "在不變更佇列模式的情況下引導活躍執行"
read_when:
  - Using /steer or /tell while an agent is already running
  - Comparing /steer with /queue steer
  - Deciding whether to steer the current run, a sub-agent, or an ACP session
title: "引導"
sidebarTitle: "引導"
---

`/steer` 會將指引傳送至已活躍的執行。它適用於「在執行仍在進行中時調整此執行」的時刻，而非用於開始新的輪次。

## 目前的工作階段

使用頂層 `/steer` 以目標鎖定目前工作階段的活躍執行：

```text
/steer prefer the smaller patch and keep the tests focused
/tell summarize before making the next tool call
```

行為：

- 僅以目前工作階段的活躍執行為目標。
- 運作方式獨立於工作階段的 `/queue` 模式。
- 當工作階段閒置時，不會開始新的執行。
- 當沒有可引導的活躍執行時，會回覆警告。
- 使用活躍執行時期的引導路徑，因此模型會在下一個支援的執行時期邊界看到該指引。

## 引導與佇列

`/queue steer` 會變更當一般傳入訊息在執行活躍時抵達的行為方式。`/steer <message>` 是一個明確指令，嘗試將該指令的訊息在下一個支援的執行時期邊界注入活躍的執行中，而不論儲存的 `/queue` 設定為何。

使用：

- 當您想要立即引導活躍的執行時，請使用 `/steer <message>`。
- 當您希望未來的一般訊息預設能引導活躍的執行時，請使用 `/queue steer`。
- 當新訊息應等待稍後的輪次而非引導活躍的執行時，請使用 `/queue collect` 或 `/queue followup`。

關於佇列模式和後續行為，請參閱 [指令佇列](/zh-Hant/concepts/queue) 和 [引導佇列](/zh-Hant/concepts/queue-steering)。

## 子代理

當目標是子執行時，請使用 `/subagents steer`：

```text
/subagents steer 2 focus only on the API surface
```

頂層 `/steer` 不會透過 id 或清單索引來選擇子代理。它始終以目前工作階段的活躍執行為目標。關於子代理 id、標籤和控制指令，請參閱 [子代理](/zh-Hant/tools/subagents)。

## ACP 工作階段

當目標是 ACP 驅動工作階段時，請使用 `/acp steer`：

```text
/acp steer --session agent:main:acp:codex tighten the repro
```

關於 ACP 工作階段選擇和執行時期行為，請參閱 [ACP 代理](/zh-Hant/tools/acp-agents)。

## 相關

- [斜線指令](/zh-Hant/tools/slash-commands)
- [指令佇列](/zh-Hant/concepts/queue)
- [導向佇列](/zh-Hant/concepts/queue-steering)
- [子代理](/zh-Hant/tools/subagents)
