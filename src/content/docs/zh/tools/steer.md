---
summary: "在不更改队列模式的情况下引导活动运行"
read_when:
  - Using /steer or /tell while an agent is already running
  - Comparing /steer with /queue modes
  - Deciding whether to steer the current run, a sub-agent, or an ACP session
title: "引导"
sidebarTitle: "引导"
---

`/steer`OpenClaw 首先尝试将指导发送到当前活动的运行。它用于“在此运行仍在工作时对其进行调整”的时刻。如果当前运行时无法接受引导，OpenClaw 会将消息作为普通提示发送，而不是将其丢弃。

## 当前会话

使用顶层 `/steer` 以针对当前会话的活动运行：

```text
/steer prefer the smaller patch and keep the tests focused
/tell summarize before making the next tool call
```

行为：

- 仅针对当前会话的活动运行。
- 独立于会话的 `/queue` 模式工作。
- 当会话处于空闲状态或活动运行无法接受引导时，使用相同的消息开始一个正常的轮次。
- 使用活动运行时的引导路径，以便模型在下一个支持的运行时边界处看到该指导。

## 引导 vs 队列

`/queue steer` 使得普通传入消息在运行活动时到达时尝试引导活动运行。`/steer <message>` 是一个显式命令，它尝试将该命令的消息注入到活动运行中，注入位置为下一个支持的运行时边界，而不管存储的 `/queue` 设置如何。当无法进行注入时，命令前缀将被剥离，`<message>` 将作为普通提示继续执行。

使用：

- 当您想立即引导活动运行时，请使用 `/steer <message>`。
- 当您希望未来的普通消息默认引导活动运行时，请使用 `/queue steer`。
- 当未来的普通消息应该等待后续轮次而不是引导活动运行时，请使用 `/queue collect` 或 `/queue followup`。
- 当最新消息应该替换活动运行而不是引导它时，请使用 `/queue interrupt`。

有关队列模式和引导边界，请参阅 [命令队列](/zh/concepts/queue) 和 [引导队列](/zh/concepts/queue-steering)。

## 子代理

当目标是子运行时，请使用 `/subagents steer`：

```text
/subagents steer 2 focus only on the API surface
```

顶层的 `/steer` 不会按 id 或列表索引选择子代理。它始终针对当前会话的活动运行。有关子代理 id、标签和控制命令，请参阅 [子代理](/zh/tools/subagents)。

## ACP 会话

当目标是 ACP 框架会话时，请使用 `/acp steer`：

```text
/acp steer --session agent:main:acp:codex tighten the repro
```

有关 ACP 会话选择和运行时行为，请参阅 [ACP 代理](/zh/tools/acp-agents)。

## 相关

- [斜杠命令](/zh/tools/slash-commands)
- [命令队列](/zh/concepts/queue)
- [引导队列](/zh/concepts/queue-steering)
- [子代理](/zh/tools/subagents)
