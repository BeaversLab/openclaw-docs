---
summary: "对入站自动回复运行进行序列化的命令队列设计"
read_when:
  - Changing auto-reply execution or concurrency
title: "Command queue"
---

我们通过一个微小的进程内队列对入站自动回复运行（所有渠道）进行序列化，以防止多个代理运行发生冲突，同时仍允许跨会话的安全并行。

## 原因

- 自动回复运行可能成本很高（LLM 调用），并且当多条入站消息几乎同时到达时可能会发生冲突。
- 序列化可以避免争夺共享资源（会话文件、日志、CLI stdin），并降低触及上游速率限制的几率。

## 工作原理

- 一个支持分区的先进先出 (FIFO) 队列会使用可配置的并发上限来处理每个分区（未配置的分区默认为 1；主分区默认为 4，子代理分区默认为 8）。
- `runEmbeddedPiAgent` 按**会话密钥**（分区 `session:<key>`）排队，以保证每个会话只有一个活动运行。
- 然后，每个会话运行会被排入一个**全局分区**（默认为 `main`），因此总体并发性受 `agents.defaults.maxConcurrent` 限制。
- 当启用详细日志记录时，如果排队运行在开始前等待了超过约 2 秒，则会发出一条简短通知。
- 输入指示器仍会在入队时立即触发（如果渠道支持），因此在我们等待轮次时，用户体验不会改变。

## 队列模式（按渠道）

入站消息可以引导当前运行、等待下一轮次，或两者兼做：

- `steer`：立即注入到当前运行中（在下一个工具边界之后取消待处理的工具调用）。如果不是流式传输，则回退到跟进。
- `followup`：在当前运行结束后为下一个代理轮次排队。
- `collect`：将所有排队的消息合并为**单个**跟进轮次（默认）。如果消息针对不同的渠道/线程，它们会单独处理以保持路由。
- `steer-backlog`（又名 `steer+backlog`）：现在引导**并**保留消息以供跟进轮次。
- `interrupt`（旧版）：中止该会话的活动运行，然后运行最新消息。
- `queue`（旧版别名）：与 `steer` 相同。

Steer-backlog 意味着在引导运行后，您可能会收到后续回复，因此流式界面可能会看起来像重复消息。如果您希望每条入站消息只收到一个回复，请首选 `collect`/`steer`。
将 `/queue collect` 作为独立命令发送（每个会话）或设置 `messages.queue.byChannel.discord: "collect"`。

默认值（当在配置中未设置时）：

- 所有界面 → `collect`

通过 `messages.queue` 全局配置或按渠道配置：

```json5
{
  messages: {
    queue: {
      mode: "collect",
      debounceMs: 1000,
      cap: 20,
      drop: "summarize",
      byChannel: { discord: "collect" },
    },
  },
}
```

## 队列选项

这些选项适用于 `followup`、`collect` 和 `steer-backlog`（以及在回退到后续跟进时的 `steer`）：

- `debounceMs`：在开始后续轮次之前等待安静（防止“继续、继续”）。
- `cap`：每个会话的最大排队消息数。
- `drop`：溢出策略（`old`、`new`、`summarize`）。

Summarize 会保留丢弃消息的简短项目符号列表，并将其作为合成后续提示注入。
默认值：`debounceMs: 1000`、`cap: 20`、`drop: summarize`。

## 按会话覆盖

- 将 `/queue <mode>` 作为独立命令发送，以存储当前会话的模式。
- 选项可以组合使用：`/queue collect debounce:2s cap:25 drop:summarize`
- `/queue default` 或 `/queue reset` 会清除会话覆盖设置。

## 范围和保证

- 适用于所有使用网关回复管道（WhatsApp web、Telegram、Slack、Discord、Signal、iMessage、webchat 等）的入站渠道的自动回复代理运行。
- 默认通道（`main`）对于入站和主心跳是进程范围的；设置 `agents.defaults.maxConcurrent` 以允许多个会话并行运行。
- 可能存在其他通道（例如 `cron`、`cron-nested`、`nested`、`subagent`），以便后台作业可以并行运行而不会阻塞入站回复。隔离的 cron agent 轮次持有 `cron` 插槽，而其内部的 agent 执行使用 `cron-nested`；两者都使用 `cron.maxConcurrentRuns`。共享的非 cron `nested` 流程保持其自己的通道行为。这些分离的运行被跟踪为 [background tasks](/zh/automation/tasks)。
- 每个会话的通道确保一次只有一个 agent 运行接触给定的会话。
- 没有外部依赖或后台工作线程；纯 TypeScript + promises。

## 故障排除

- 如果命令似乎卡住了，请启用详细日志并查找 “queued for …ms” 行，以确认队列正在排出。
- 如果您需要队列深度，请启用详细日志并观察队列计时行。

## 相关

- [Session management](/zh/concepts/session)
- [Retry policy](/zh/concepts/retry)
