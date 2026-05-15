---
summary: "在不更改队列模式的情况下引导活动运行"
read_when:
  - Using /steer or /tell while an agent is already running
  - Comparing /steer with /queue steer
  - Deciding whether to steer the current run, a sub-agent, or an ACP session
title: "引导"
sidebarTitle: "引导"
---

`/steer` 向已经活动的运行发送指导。它用于“在运行仍在工作时调整此运行”的时刻，而不是为了开始新的轮次。

## 当前会话

使用顶层 `/steer` 以针对当前会话的活动运行：

```text
/steer prefer the smaller patch and keep the tests focused
/tell summarize before making the next tool call
```

行为：

- 仅针对当前会话的活动运行。
- 独立于会话的 `/queue` 模式工作。
- 当会话空闲时，不会启动新的运行。
- 当没有活动运行可引导时，回复警告。
- 使用活动运行时的引导路径，以便模型在下一个支持的运行时边界看到指导。

## 引导 vs 队列

`/queue steer` 更改当普通入站消息在运行活动时到达时的行为。`/steer <message>` 是一个显式命令，尝试将该命令的消息在下一个支持的运行时边界注入活动运行，而不考虑存储的 `/queue` 设置。

使用：

- `/steer <message>` 当您想立即引导活动运行时。
- `/queue steer` 当您希望未来的普通消息默认引导活动运行时。
- `/queue collect` 或 `/queue followup` 当新消息应该等待后续轮次而不是引导活动运行时。

有关队列模式和回退行为，请参阅 [命令队列](/zh/concepts/queue) 和 [引导队列](/zh/concepts/queue-steering)。

## 子代理

当目标是子运行时，使用 `/subagents steer`：

```text
/subagents steer 2 focus only on the API surface
```

顶层 `/steer` 不会通过 ID 或列表索引选择子代理。它始终针对当前会话的活动运行。有关子代理 ID、标签和控制命令，请参阅 [子代理](/zh/tools/subagents)。

## ACP 会话

当目标是 ACP 框架会话时，使用 `/acp steer`：

```text
/acp steer --session agent:main:acp:codex tighten the repro
```

有关 ACP 会话选择和运行时行为，请参阅 [ACP 代理](/zh/tools/acp-agents)。

## 相关

- [斜杠命令](/zh/tools/slash-commands)
- [命令队列](/zh/concepts/queue)
- [引导队列](/zh/concepts/queue-steering)
- [子代理](/zh/tools/subagents)
