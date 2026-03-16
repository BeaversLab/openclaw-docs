---
summary: "使用 /btw 进行临时旁问"
read_when:
  - You want to ask a quick side question about the current session
  - You are implementing or debugging BTW behavior across clients
title: "BTW 旁问"
---

# BTW 旁问

`/btw` 允许您就**当前会话**提出一个快速的旁问，而
不会将该问题纳入常规对话历史。

它模仿了 Claude Code 的 `/btw` 行为，但已适配到 OpenClaw 的
Gateway(网关) 和多渠道架构。

## 它的作用

当您发送时：

```text
/btw what changed?
```

OpenClaw：

1. 截取当前会话上下文的快照，
2. 运行一次单独的、**无工具**的模型调用，
3. 仅回答旁问，
4. 保持主运行不受干扰，
5. **不**将 BTW 的问题或答案写入会话历史，
6. 将答案作为**实时侧边结果**发出，而非常规助手消息。

其重要的心智模型是：

- 相同的会话上下文
- 单独的一次性旁问
- 无工具调用
- 无未来上下文污染
- 无记录持久化

## 它不做什么

`/btw` **不**会：

- 创建一个新的持久化会话，
- 继续未完成的主任务，
- 运行工具或代理工具循环，
- 将 BTW 问题/答案数据写入记录历史，
- 出现在 `chat.history` 中，
- 在重新加载后保留。

它被特意设计为**临时**的。

## 上下文如何工作

BTW 将当前会话仅作为**背景上下文**使用。

如果主运行当前处于活动状态，OpenClaw 会截取当前消息
状态的快照，并将正在进行的主提示作为背景上下文包含在内，同时
明确告知模型：

- 仅回答旁问，
- 不要恢复或完成未完成的主任务，
- 不要发出工具调用或伪工具调用。

这使得 BTW 与主运行保持隔离，同时又能让它知道
会话是关于什么的。

## 交付模型

BTW **不**作为常规助手记录消息交付。

在 Gateway(网关) 协议级别：

- 常规助手聊天使用 `chat` 事件
- BTW 使用 `chat.side_result` 事件

这种分离是刻意的。如果 BTW 复用了常规的 `chat` 事件路径，
客户端会将其视为常规对话历史。

由于 BTW 使用一个单独的实时事件并且不从 `chat.history` 重放，它在重载后会消失。

## 表现行为

### TUI

在 TUI 中，BTW 在当前会话视图中内联渲染，但它保持短暂性：

- 与正常的助手回复在视觉上明显不同
- 可以使用 `Enter` 或 `Esc` 解除
- 重载时不重放

### 外部渠道

在 Telegram、WhatsApp 和 Discord 等渠道上，BTW 作为一条明确标记的一次性回复发送，因为这些界面没有本地短暂覆盖层的概念。

该回答仍被视为侧边结果，而非正常的会话历史。

### 控制 UI / Web

Gateway(网关) 正确地将 BTW 作为 `chat.side_result` 发出，且 BTW 不包含在 `chat.history` 中，因此持久化契约对于 Web 来说已经是正确的。

当前的控制 UI 仍然需要一个专用的 `chat.side_result` 消费者来在浏览器中实时渲染 BTW。在该客户端端支持落地之前，BTW 是一个具有完整 Gateway(网关) 和外部渠道行为的 TUI 级功能，但还不是一个完整的浏览器用户体验。

## 何时使用 BTW

当你想要以下内容时使用 `/btw`：

- 关于当前工作的快速澄清，
- 在长时间运行仍在进行时的事实性侧边答案，
- 一个不应成为未来会话上下文一部分的临时答案。

示例：

```text
/btw what file are we editing?
/btw what does this error mean?
/btw summarize the current task in one sentence
/btw what is 17 * 19?
```

## 何时不使用 BTW

当你希望答案成为会话未来工作上下文的一部分时，不要使用 `/btw`。

在这种情况下，请在主会话中正常提问，而不是使用 BTW。

## 相关

- [Slash commands](/en/tools/slash-commands)
- [Thinking Levels](/en/tools/thinking)
- [Session](/en/concepts/session)

import zh from "/components/footer/zh.mdx";

<zh />
