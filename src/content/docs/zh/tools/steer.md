---
summary: "在不更改队列模式的情况下引导正在运行的运行"
read_when:
  - Using /steer or /tell while an agent is already running
  - Comparing /steer with /queue modes
  - Deciding whether to steer the current run or an ACP session
title: "引导"
sidebarTitle: "引导"
---

`/steer`OpenClaw 首先尝试向已激活的运行发送指导。它用于“在该运行仍在工作时对其进行调整”的时刻。如果当前运行时无法接受引导，OpenClaw 会将该消息作为普通提示发送，而不是将其丢弃。

## 当前会话

使用顶级 `/steer` 来针对当前会话的活动运行：

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

`/queue steer` 使正常的入站消息在运行处于活动状态并到达时尝试引导该活动运行。`/steer <message>` 是一个显式命令，无论存储的 `/queue` 设置如何，它都会尝试将该命令的消息注入到下一个支持的运行时边界处的活动运行中。当该注入不可用时，命令前缀将被剥离，`<message>` 将作为普通提示继续。

使用：

- `/steer <message>` 当您想立即引导活动运行时。
- `/queue steer` 当您希望未来的正常消息默认引导活动运行时。
- `/queue collect` 或 `/queue followup` 当未来的正常消息应该等待稍后的轮次而不是引导活动运行时。
- `/queue interrupt` 当最新消息应该替换活动运行而不是引导它时。

有关队列模式和引导边界，请参阅 [Command queue](/zh/concepts/queue) 和 [Steering queue](/zh/concepts/queue-steering)。

## 子代理

顶级 `/steer` 针对当前会话的活动运行。子代理向其父/请求者会话报告；`/subagents` 仅用于可见性。

## ACP 会话

当目标是 ACP 驱动会话时，使用 `/acp steer`：

```text
/acp steer --session agent:main:acp:codex tighten the repro
```

有关 ACP 会话选择和运行时行为，请参阅 [ACP agents](/zh/tools/acp-agents)。

## 相关

- [Slash commands](/zh/tools/slash-commands)
- [命令队列](/zh/concepts/queue)
- [引导队列](/zh/concepts/queue-steering)
- [子代理](/zh/tools/subagents)
