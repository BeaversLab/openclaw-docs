---
summary: "使用 /btw 进行临时的旁置提问"
read_when:
  - You want to ask a quick side question about the current session
  - You are implementing or debugging BTW behavior across clients
title: "BTW 顺带问题"
---

`/btw` 让你可以针对**当前会话**提出一个快速的旁支问题，而不会将该问题转化为正常的对话历史。`/side` 是一个别名。

它模仿了 Claude Code 的 `/btw` 行为，但适配到了 OpenClaw 的 Gateway(网关) 和多渠道架构中。

## 它的作用

当你发送时：

```text
/btw what changed?
```

OpenClaw：

1. 捕获当前会话上下文的快照，
2. 运行一个独立的临时侧边查询，
3. 仅回答顺带问题，
4. 保持主运行不受干扰，
5. **不**将 BTW 问题或答案写入会话历史记录，
6. 将答案作为**实时侧边结果**发出，而不是正常的助手消息。

重要的心智模型是：

- 相同的会话上下文
- 单独的一次性侧边查询
- 当会话使用原生 harness 时，使用相同的原生 harness 传输
- 无未来上下文污染
- 无逐字稿持久化

对于 Codex harness 会话，BTW 通过将活动的 app-server 线程分叉为一个临时的侧边线程，从而保留在 Codex 内部。这样既保持了 Codex OAuth 和原生线程行为，又将侧边回复与父级转录隔离开来。与 Codex `/side` 类似，侧边线程保留当前的 Codex 权限和原生工具界面，并通过护栏告知模型不要将继承的父线程工作视为活动指令。非 Codex 运行时则保留较旧的一次性直接路径。

## 它不做什么

`/btw` **不**会：

- 创建一个新的持久会话，
- 继续未完成的主要任务，
- 将 BTW 问题/答案数据写入逐字稿历史记录，
- 出现在 `chat.history` 中，
- 在重新加载后保留。

它是有意设计为**短暂**的。

## 上下文如何工作

BTW 仅将当前会话作为**背景上下文**。

如果主运行当前处于活动状态，OpenClaw 会捕获当前消息状态，并将进行中的主提示作为背景上下文，同时明确告知模型：

- 仅回答顺带问题，
- 不要恢复或完成未完成的主任务，
- 不要引导父对话。

这使得 BTW 与主运行保持隔离，同时仍让它了解会话的内容。

## 交付模式

BTW **不**作为正常的助手逐字稿消息交付。

在 Gateway(网关) 协议级别：

- 普通助手聊天使用 `chat` 事件
- BTW 使用 `chat.side_result` 事件

这种分离是刻意的。如果 BTW 复用正常的 `chat` 事件路径，客户端会将其视为常规对话历史。

由于 BTW 使用单独的实时事件且不从 `chat.history` 重播，它会在重新加载后消失。

## 表层行为

### TUI

在 TUI 中，BTW 在当前会话视图中内联渲染，但它保持
短暂性：

- 与正常的助手回复明显不同
- 可通过 `Enter` 或 `Esc` 关闭
- 重新加载时不重放

### 外部渠道

在 Telegram、WhatsApp 和 Discord 等渠道上，BTW 作为
一个明确标记的一次性回复发送，因为这些界面没有本地
短暂覆盖的概念。

答案仍被视为侧边结果，而不是正常的会话历史记录。

### 控制 UI / Web

Gateway(网关) 正确地将 BTW 发出为 Gateway(网关)`chat.side_result`，并且 BTW 不包含在 `chat.history` 中，因此持久化契约对于 Web 来说已经是正确的了。

当前的 Control UI 仍需要一个专用的 `chat.side_result` 消费者来在浏览器中实时渲染 BTW。在该客户端支持落地之前，BTW 是一个 Gateway(网关) 级别功能，具有完整的 TUI 和外部渠道行为，但尚未拥有完整的浏览器体验。

## 何时使用 BTW

当你想要以下内容时，请使用 `/btw`：

- 对当前工作的快速澄清，
- 在长时间运行仍在进行时的事实性侧边答案，
- 不应成为未来会话上下文一部分的临时答案。

示例：

```text
/btw what file are we editing?
/side what changed while the main run continued?
/btw what does this error mean?
/btw summarize the current task in one sentence
/btw what is 17 * 19?
```

## 何时不使用 BTW

当您希望回答成为会话未来工作上下文的一部分时，请勿使用 `/btw`。

在这种情况下，请在主会话中正常询问，而不是使用 BTW。

## 相关

<CardGroup cols={2}>
  <Card title="斜杠命令" href="/zh/tools/slash-commands" icon="terminal">
    原生命令目录和聊天指令。
  </Card>
  <Card title="思考级别" href="/zh/tools/thinking" icon="brain">
    旁支问题模型调用的推理努力级别。
  </Card>
  <Card title="Session" href="/zh/concepts/session" icon="comments">
    Session keys, history, and persistence semantics.
  </Card>
  <Card title="Steer command" href="/zh/tools/steer" icon="arrow-right">
    Inject a steering message into the active run without ending it.
  </Card>
</CardGroup>
