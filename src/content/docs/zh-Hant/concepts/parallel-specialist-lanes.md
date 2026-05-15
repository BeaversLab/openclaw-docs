---
summary: "在不阻塞共享模型和工具容量的情況下運行並行專家代理"
title: "並行專員通道"
sidebarTitle: "專員通道"
read_when:
  - You route group chats to dedicated agents
  - You want parallel work without one long task blocking every chat
  - You are designing a multi-agent operations setup
status: active
---

並行專員通道讓一個 Gateway 可以將不同的聊天或房間路由到不同的代理，同時保持快速的使用者體驗。關鍵在於將並行性視為稀缺資源的設計問題，而不僅僅是「更多的代理」。

## 基本原理

當專員通道減少了對真正瓶頸的爭用時，它才能提高輸送量：

- **會話鎖**：一次只能有一個運行修改給定的會話。
- **全域模型容量**：所有可見的聊天運行仍然共享供應商的限制。
- **工具容量**：shell、瀏覽器、網路和儲存庫工作可能比模型輪次本身更慢。
- **上下文預算**：長記錄會讓每個未來的輪次變慢且不夠專注。
- **所有權模糊性**：重複的代理執行相同的工作會浪費容量。

OpenClaw 已經按照會話序列化運行，並透過[指令佇列](/zh-Hant/concepts/queue)限制全域並行性。專員通道在此基礎上增加了策略：哪個代理擁有哪項工作，什麼保留在聊天中，以及什麼變成背景工作。

## 建議的推出方式

### 階段 1：通道合約 + 背景繁重工作

在其工作空間和系統提示中為每個通道提供書面合約：

- **目的**：此通道擁有的工作。
- **非目標**：應該移交而非嘗試執行的工作。
- **聊天預算**：快速回答留在聊天中；長任務應簡短確認，然後在背景子代理或任務中執行。
- **移交規則**：當另一個通道擁有該工作時，說明應該去哪裡並提供緊湊的移交摘要。
- **工具風險規則**：優先使用能夠完成工作的最小工具介面。

這是最便宜的階段，並解決了大部分阻塞問題：一個編碼工作不會再讓研究通道變得像糖漿一樣緩慢，而且每個聊天都保持自己的上下文乾淨。

### 階段 2：優先順序和並行控制

根據每個通道的業務價值調整佇列和模型容量：

```json5
{
  agents: {
    defaults: {
      maxConcurrent: 4,
      subagents: { maxConcurrent: 8, delegationMode: "prefer" },
    },
  },
  messages: {
    queue: {
      mode: "collect",
      debounceMs: 1000,
      cap: 20,
      drop: "summarize",
    },
  },
}
```

使用直接/個人聊天和生產運維代理來處理高優先級工作。當系統繁忙時，讓研究、草擬和批次編碼轉移至背景任務。

### 第 3 階段：協調器 / 流量控制器

一旦有多個通道啟用，新增一個小型的協調器模式：

- 追蹤活躍的通道任務和負責人。
- 偵測群組之間的重複請求。
- 在通道之間路由交接摘要。
- 僅呈現阻礙、完成結果以及人類必須做出的決策。

不要從這裡開始。沒有通道合約的協調器只是在協調混亂。

## 最小通道合約範本

```md
# Lane contract

## Owns

- <job this lane is responsible for>

## Does not own

- <work to hand off>

## Chat budget

- Answer quick questions directly.
- For multi-step, slow, or tool-heavy work: acknowledge briefly, spawn/background
  the work, then return the result when complete.

## Handoff

If another lane owns the request, reply with:

- target lane
- objective
- relevant context
- exact next action

## Tool posture

Use the smallest tool surface that can complete the task. Avoid broad shell or
network work unless this lane explicitly owns it.
```

## 相關

- [多代理路由](/zh-Hant/concepts/multi-agent)
- [指令佇列](/zh-Hant/concepts/queue)
- [子代理](/zh-Hant/tools/subagents)
