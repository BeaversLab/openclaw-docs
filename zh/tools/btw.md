---
summary: "使用 /btw 进行临时的旁置提问"
read_when:
  - You want to ask a quick side question about the current session
  - You are implementing or debugging BTW behavior across clients
title: "BTW 旁置提问"
---

# BTW 旁置提问

`/btw` 让你能针对**当前会话**提出一个快速的旁置问题，而不会将该问题转化为普通的对话历史。

它模仿了 Claude Code 的 `/btw` 行为，但适配到了 OpenClaw 的 Gateway(网关) 和多渠道架构中。

## 它的功能

当你发送：

```text
/btw what changed?
```

OpenClaw：

1. 对当前会话上下文进行快照，
2. 运行一个单独的**无工具**模型调用，
3. 仅回答旁置问题，
4. 保持主运行不受干扰，
5. **不**将 BTW 问题或答案写入会话历史，
6. 将答案作为**实时旁置结果**发出，而非普通的助手消息。

重要的心智模型是：

- 相同的会话上下文
- 单独的一次性旁置查询
- 无工具调用
- 无未来上下文污染
- 无逐字稿持久化

## 它不做的事情

`/btw` **不**会：

- 创建新的持久化会话，
- 继续未完成的主任务，
- 运行工具或代理工具循环，
- 将 BTW 问题/答案数据写入逐字稿历史，
- 出现在 `chat.history` 中，
- 在重新加载后保留。

它是有意设计为**临时**的。

## 上下文如何工作

BTW 仅将当前会话作为**背景上下文**。

如果主运行当前处于活动状态，OpenClaw 会对当前消息状态进行快照，并将进行中的主提示包含在背景上下文中，同时明确告知模型：

- 仅回答旁置问题，
- 不要恢复或完成未完成的主任务，
- 不要发出工具调用或伪工具调用。

这样既保持了 BTW 与主运行的隔离，又让它了解会话的内容。

## 交付模型

BTW **不**作为普通的助手逐字稿消息交付。

在 Gateway(网关) 协议层面：

- 普通的助手聊天使用 `chat` 事件
- BTW 使用 `chat.side_result` 事件

这种区分是有意的。如果 BTW 重用普通的 `chat` 事件路径，客户端会将其视为常规对话历史。

由于 BTW 使用一个单独的实时事件并且不从 `chat.history` 中重播，因此它在重新加载后会消失。

## 表面行为

### TUI

在 TUI 中，BTW 会内联呈现在当前会话视图中，但它是临时的：

- 在视觉上与正常的助手回复有明显的区别
- 可以通过 `Enter` 或 `Esc` 关闭
- 重新加载时不重播

### 外部渠道

在 Telegram、WhatsApp 和 Discord 等渠道上，BTW 作为一条明确标记的一次性回复发送，因为这些界面不具备本地临时覆盖的概念。

该答案仍然被视为侧面结果，而不是正常的会话历史。

### 控制 UI / Web

Gateway(网关) 正确地将 BTW 作为 `chat.side_result` 发出，并且 BTW 不包含在 `chat.history` 中，因此持久化契约对于 Web 来说已经是正确的了。

当前的控制 UI 仍然需要一个专用的 `chat.side_result` 消费者才能在浏览器中实时呈现 BTW。在该客户端端支持落地之前，BTW 是一个 Gateway(网关) 级别的功能，具有完整的 TUI 和外部渠道行为，但还不是一个完整的浏览器 UX。

## 何时使用 BTW

当你想要以下内容时，使用 `/btw`：

- 关于当前工作的快速澄清，
- 在长时间运行仍在进行时的事实性侧面回答，
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

在这种情况下，请在主会话中正常询问，而不是使用 BTW。

## 相关

- [斜杠命令](/en/tools/slash-commands)
- [思考级别](/en/tools/thinking)
- [会话](/en/concepts/session)

import zh from "/components/footer/zh.mdx";

<zh />
