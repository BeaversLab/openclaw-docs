---
summary: "活动运行如何在运行时边界对引导消息进行排队"
read_when:
  - Explaining how steer behaves while an agent is using tools
  - Changing active-run queue behavior or runtime steering integration
  - Comparing steering with followup, collect, and interrupt queue modes
title: "引导队列"
---

当会话运行正在进行流式传输时，如果有普通提示到达，且队列模式为 OpenClaw`steer`，OpenClaw 默认会尝试将该提示发送到活动运行时。此默认行为不需要任何配置条目或队列指令。Pi 和原生 Codex 应用服务器程序实现的传递细节有所不同。

## 运行时边界

引导不会中断正在运行的工具调用。Pi 会在模型边界检查排队的引导消息：

1. 助手请求工具调用。
2. Pi 执行当前助手消息的工具调用批次。
3. Pi 发出轮次结束事件。
4. Pi 排空已排队的引导消息。
5. Pi 将这些消息作为用户消息追加到下一次 LLM 调用之前。

这可以保持工具结果与请求它们的助手消息配对，然后让下一次模型调用可以看到最新的用户输入。

原生 Codex 应用服务器程序公开了 `turn/steer`OpenClaw，而不是 Pi 的内部引导队列。OpenClaw 会将排队的提示批量处理直到配置的静默窗口结束，然后发送一个单一的 `turn/steer` 请求，其中包含按到达顺序排列的所有收集到的用户输入。

Codex 审查和手动压缩会拒绝同轮次引导。当运行时无法在 `steer`OpenClaw 模式下接受引导时，OpenClaw 会等待活动运行完成后再开始处理该提示。

本页解释当模式为 `steer` 时，针对普通入站消息的队列模式引导。如果模式是 `followup` 或 `collect`，普通消息不会进入此引导路径；它们会等待直到活动运行完成。有关显式的 `/steer <message>` 命令，请参阅 [Steer](/zh/tools/steer)。

## 模式

| 模式        | 活动运行行为                     | 后续行为                                           |
| ----------- | -------------------------------- | -------------------------------------------------- |
| `steer`     | 在可行时将提示引导至活动运行时。 | 如果无法进行引导，则等待活动运行完成。             |
| `followup`  | 不进行引导。                     | 在活动运行结束后，稍后运行排队的消息。             |
| `collect`   | 不进行引导。                     | 将兼容的排队消息合并为去抖动窗口后的一个后续轮次。 |
| `interrupt` | 中止活动运行而不是对其进行引导。 | 中止后开始最新的消息。                             |

## 突发示例

如果当代理正在执行工具调用时，四名用户发送了消息：

- 使用默认行为时，活动运行时会在下一次模型决策之前，按到达顺序接收所有四条消息。Pi 在下一个模型边界清空它们；Codex 将它们作为一个批处理的 `turn/steer` 接收。
- 使用 `/queue collect`OpenClaw 时，OpenClaw 不会进行引导。它会等待当前活动运行结束，然后在去抖动窗口之后，使用兼容的排队消息创建一个后续轮次。
- 使用 `/queue interrupt`OpenClaw 时，OpenClaw 会中止当前活动运行并开始处理最新消息，而不是进行引导。

## 范围

引导始终针对当前活动的会话运行。它不会创建新会话，不会更改活动运行的工具策略，也不会按发送者拆分消息。在多用户渠道中，入站提示已包含发送者和路由上下文，因此下一次模型调用可以看到每条消息是由谁发送的。

当您希望消息默认排队而不是引导活动运行时，请使用 `followup` 或 `collect`。当最新的提示应该替换活动运行时，请使用 `interrupt`。

## 去抖动

`messages.queue.debounceMs` 适用于排队的 `followup` 和 `collect` 投递。在使用原生 Codex harness 的 `steer` 模式下，它还会在发送批量 `turn/steer` 之前设置静默窗口。对于 Pi，活动引导本身不使用去抖动计时器，因为 Pi 会自然地将消息分批直到下一个模型边界。

## 相关

- [Command queue](/zh/concepts/queue)
- [Steer](/zh/tools/steer)
- [Messages](/zh/concepts/messages)
- [Agent loop](/zh/concepts/agent-loop)
