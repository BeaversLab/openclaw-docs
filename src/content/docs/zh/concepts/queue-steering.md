---
summary: "活动运行如何在运行时边界对引导消息进行排队"
read_when:
  - Explaining how steer behaves while an agent is using tools
  - Changing active-run queue behavior or runtime steering integration
  - Comparing steer, queue, collect, and followup modes
title: "引导队列"
---

当会话运行正在流式传输时收到消息，OpenClaw 可以将该消息发送到活动运行时，而不是为同一会话启动另一次运行。公共模式是运行时无关的；Pi 和原生 Codex 应用服务器 harness 实现的传递细节有所不同。

## 运行时边界

引导不会中断正在运行的工具调用。Pi 会在模型边界检查排队的引导消息：

1. 助手请求工具调用。
2. Pi 执行当前助手消息的工具调用批次。
3. Pi 发出轮次结束事件。
4. Pi 排空已排队的引导消息。
5. Pi 将这些消息作为用户消息追加到下一次 LLM 调用之前。

这可以保持工具结果与请求它们的助手消息配对，然后让下一次模型调用可以看到最新的用户输入。

原生 Codex 应用服务器 harness 公开了 `turn/steer`OpenClaw 而不是 Pi 的内部引导队列。OpenClaw 在那里调整了相同的模式：

- `steer` 将排队的消息按配置的静默窗口进行批处理，然后发送一个包含所有收集到的用户输入（按到达顺序）的 `turn/steer` 请求。
- `queue` 通过发送单独的 `turn/steer` 请求来保留传统的序列化形状。
- `followup`、`collect`、`steer-backlog` 和 `interrupt`OpenClaw 在活动 Codex 轮次周围保持 OpenClaw 拥有的队列行为。

Codex 审查和手动压缩轮次拒绝同轮次引导。当运行时无法接受引导时，OpenClaw 会回退到后续队列（在该模式允许的情况下）。

本页面解释了针对正常入站消息的队列模式引导。有关显式 `/steer <message>` 命令，请参阅 [Steer](/zh/tools/steer)。

## 模式

| 模式            | 活动运行行为                                                                              | 后续跟进行为                                             |
| --------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `steer`         | 在下一个运行时边界一起注入所有排队的引导消息。这是默认设置。                              | 仅在引导不可用时回退到后续处理。                         |
| `queue`         | 旧的一次一条引导。Pi 在每个模型边界注入一条排队消息；Codex 发送单独的 `turn/steer` 请求。 | 仅在引导不可用时回退到后续处理。                         |
| `steer-backlog` | 与 `steer` 具有相同的活动运行引导行为。                                                   | 同时保留同一条消息供后续轮次使用。                       |
| `followup`      | 不引导当前运行。                                                                          | 稍后运行排队的消息。                                     |
| `collect`       | 不引导当前运行。                                                                          | 在去抖动窗口之后，将兼容的排队消息合并为稍后的一个轮次。 |
| `interrupt`     | 中止活动运行，然后开始最新的消息。                                                        | 无。                                                     |

## 突发示例

如果四个用户在代理执行工具调用时发送消息：

- `steer`：活动运行在其下一个模型决策之前按到达顺序接收所有四条消息。Pi 在下一个模型边界排空它们；Codex 将它们作为一个批处理 `turn/steer` 接收。
- `queue`：旧式序列化引导。Pi 每次注入一条排队消息；Codex 接收单独的 `turn/steer` 请求。
- `collect`：OpenClaw 等待活动运行结束，然后在去抖动窗口之后使用兼容的排队消息创建后续轮次。

## 范围

引导始终以当前活动会话运行为目标。它不会创建新会话、更改活动运行的工具策略或按发送者拆分消息。在多用户频道中，入站提示已包含发送者和路由上下文，因此下一次模型调用可以看到谁发送了每条消息。

当您希望 OpenClaw 构建一个稍后的后续轮次，以合并兼容的消息并保留后续队列丢弃策略时，请使用 `collect`。仅当您需要旧的一次一条引导行为时才使用 `queue`。

## 去抖动

`messages.queue.debounceMs` 适用于后续投递，包括 `collect`、`followup`、`steer-backlog` 以及当活动运行引导不可用时的 `steer` 回退。对于 Pi，活动的 `steer`OpenClaw 本身不使用防抖定时器，因为 Pi 会自然地将消息批量处理直到下一个模型边界。对于原生 Codex 线束，OpenClaw 使用与静默窗口相同的防抖值，然后再发送批量处理的 `turn/steer`。

## 相关

- [命令队列](/zh/concepts/queue)
- [引导](/zh/tools/steer)
- [消息](/zh/concepts/messages)
- [代理循环](/zh/concepts/agent-loop)
