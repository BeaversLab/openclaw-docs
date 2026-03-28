---
summary: "对入站自动回复运行进行序列化的命令队列设计"
read_when:
  - Changing auto-reply execution or concurrency
title: "命令队列"
---

# 命令队列 (2026-01-16)

我们通过一个微小的进程内队列序列化入站自动回复运行（所有通道），以防止多次代理运行发生冲突，同时仍允许跨会话的安全并行处理。

## 为什么

- 自动回复运行可能会很昂贵（LLM 调用），并且当多条入站消息几乎同时到达时可能会发生冲突。
- 序列化可以避免竞争共享资源（会话文件、日志、CLI stdin），并减少触及上游速率限制的可能性。

## 工作原理

- 一个具有通道感知功能的先进先出 (FIFO) 队列会以可配置的并发上限来排空每个通道（未配置的通道默认为 1；主通道默认为 4，子代理默认为 8）。
- `runEmbeddedPiAgent` 按 **会话密钥**（通道 `session:<key>`）加入队列，以保证每个会话只有一个活动运行。
- 然后，每个会话运行被加入 **全局通道**（默认为 `main`），因此总体并行度受 `agents.defaults.maxConcurrent` 限制。
- 启用详细日志记录时，如果排队运行在开始前等待了超过约 2 秒，则会发出一条简短的通知。
- 输入指示器仍会在入队时立即触发（当通道支持时），因此在等待轮次时用户体验保持不变。

## 队列模式（每个通道）

入站消息可以引导当前运行、等待后续轮次，或者两者兼做：

- `steer`：立即注入当前运行（在下一个工具边界后取消待处理的工具调用）。如果不是流式传输，则回退到跟进。
- `followup`：为当前运行结束后的下一个代理轮次排队。
- `collect`：将所有排队消息合并为 **单个** 跟进轮次（默认）。如果消息针对不同的通道/线程，它们将单独排出以保留路由。
- `steer-backlog`（又名 `steer+backlog`）：现在引导 **并** 为后续轮次保留消息。
- `interrupt`（旧版）：中止该会话的活动运行，然后运行最新消息。
- `queue`（旧版别名）：与 `steer` 相同。

Steer-backlog 意味着您可以在引导运行后获得跟进响应，因此
流式界面可能会看起来像重复项。如果您希望
每个入站消息对应一个响应，请首选 `collect`/`steer`。
将 `/queue collect` 作为独立命令（每会话）发送或设置 `messages.queue.byChannel.discord: "collect"`。

默认值（在配置中未设置时）：

- 所有界面 → `collect`

通过 `messages.queue` 全局或按通道配置：

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

选项适用于 `followup`、`collect` 和 `steer-backlog`（以及当 `steer` 回退到跟进时）：

- `debounceMs`：在开始后续轮次之前等待静默（防止出现“继续，继续”的情况）。
- `cap`：每个会话的最大排队消息数。
- `drop`：溢出策略（`old`、`new`、`summarize`）。

Summarize 保留丢弃消息的简短项目符号列表，并将其作为合成后续提示注入。
默认值：`debounceMs: 1000`、`cap: 20`、`drop: summarize`。

## 每会话覆盖

- 发送 `/queue <mode>` 作为独立命令，以存储当前会话的模式。
- 选项可以组合使用：`/queue collect debounce:2s cap:25 drop:summarize`
- `/queue default` 或 `/queue reset` 清除会话覆盖。

## 范围和保证

- 适用于所有使用网关回复管道（WhatsApp web、Telegram、Slack、Discord、Signal、iMessage、webchat 等）的入站通道的自动回复代理运行。
- 默认通道（`main`）对于入站 + 主心跳是进程范围的；设置 `agents.defaults.maxConcurrent` 以允许多个会话并行运行。
- 可能存在其他通道（例如 `cron`、`subagent`），以便后台作业可以并行运行而不会阻塞入站回复。
- 每会话通道保证一次只有一个代理运行接触给定的会话。
- 没有外部依赖或后台工作线程；纯 TypeScript + promises。

## 故障排除

- 如果命令似乎卡住了，请启用详细日志并查找“queued for …ms”行，以确认队列正在排出。
- 如果需要队列深度，请启用详细日志并监控队列计时行。
