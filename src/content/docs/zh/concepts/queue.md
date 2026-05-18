---
summary: "自动回复队列模式、默认值和每会话覆盖"
read_when:
  - Changing auto-reply execution or concurrency
  - Explaining /queue modes or message steering behavior
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

## 默认值

未设置时，所有入站渠道界面使用：

- `mode: "steer"`
- `debounceMs: 500`
- `cap: 20`
- `drop: "summarize"`

同轮引导是默认设置。当运行可以接受引导时，运行中途到达的提示词会被注入到活动运行时，因此不会启动第二次会话运行。如果活动运行无法接受引导，OpenClaw 会等待活动运行完成后再启动该提示词。

## 队列模式

`/queue` 控制当会话已有活动运行时，普通入站消息的处理方式：

- `steer`LLM：将消息注入到活动运行时。Pi 会在当前助手轮次完成其工具调用后、下一次 LLM 调用之前，传递所有待处理的引导消息；Codex 应用服务器会接收一批 `turn/steer`OpenClaw。如果运行未处于主动流式传输状态或引导不可用，OpenClaw 会等待活动运行结束后再启动提示词。
- `followup`：不进行引导。将每条消息加入队列，以便在当前运行结束后进行后续的代理轮次。
- `collect`：不进行引导。在静默窗口之后，将队列中的消息合并为**单个**后续轮次。如果消息针对不同的渠道/线程，它们将单独排出以保留路由。
- `interrupt`：中止该会话的活动运行，然后运行最新消息。

有关特定于运行时的时序和依赖行为，请参阅[引导队列](/zh/concepts/queue-steering)。有关显式的 `/steer <message>` 命令，请参阅[引导](/zh/tools/steer)。

通过 `messages.queue` 全局配置或按渠道配置：

```json5
{
  messages: {
    queue: {
      mode: "steer",
      debounceMs: 500,
      cap: 20,
      drop: "summarize",
      byChannel: { discord: "collect" },
    },
  },
}
```

## 队列选项

选项适用于队列传递。`debounceMs` 还会在 `steer` 模式下设置 Codex 引导弹出窗口：

- `debounceMs`：排出队列的后续消息或收集批次之前的静默窗口；在 Codex `steer` 模式下，发送批处理 `turn/steer` 之前的静默窗口。纯数字表示毫秒；单位 `ms`、`s`、`m`、`h` 和 `d` 被 `/queue` 选项接受。
- `cap`：每个会话的最大排队消息数。低于 `1` 的值将被忽略。
- `drop: "summarize"`：默认设置。根据需要丢弃最旧的排队条目，保留精简摘要，并将其作为合成的后续提示注入。
- `drop: "old"`：根据需要丢弃最旧的排队条目，不保留摘要。
- `drop: "new"`：当队列已满时拒绝最新的消息。

默认值：`debounceMs: 500`、`cap: 20`、`drop: summarize`。

## 优先级

对于模式选择，OpenClaw 按以下顺序解析：

1. 内联或存储的每个会话 `/queue` 覆盖设置。
2. `messages.queue.byChannel.<channel>`。
3. `messages.queue.mode`。
4. 默认 `steer`。

对于选项，内联或存储的 `/queue` 选项优先于配置。随后应用特定渠道的防抖（`messages.queue.debounceMsByChannel`）、插件防抖默认值、全局 `messages.queue` 选项以及内置默认值。`cap` 和 `drop` 是全局/会话选项，不是每个渠道的配置键。

## 每个会话的覆盖设置

- 发送 `/queue <steer|followup|collect|interrupt>` 作为独立命令，以存储当前会话的队列模式。
- 选项可以组合使用：`/queue collect debounce:0.5s cap:25 drop:summarize`
- `/queue default` 或 `/queue reset` 将清除会话覆盖设置。

## 范围和保证

- 适用于所有使用网关回复管道（WhatsApp web、Telegram、Slack、Discord、Signal、iMessage、webchat 等）的入站渠道的自动回复代理运行。
- 默认通道（`main`）是针对入站 + 主心跳的全进程范围；设置 `agents.defaults.maxConcurrent` 以允许并行多个会话。
- 可能存在额外的通道（例如 `cron`、`cron-nested`、`nested`、`subagent`），以便后台作业可以并行运行而不会阻塞入站回复。隔离的 cron 代理轮次占用一个 `cron` 插槽，而其内部代理执行使用 `cron-nested`；两者都使用 `cron.maxConcurrentRuns`。共享的非 cron `nested` 流程保持其自己的通道行为。这些分离的运行被跟踪为[后台任务](/zh/automation/tasks)。
- 每个会话的通道保证一次只有一个代理运行接触给定的会话。
- 没有外部依赖或后台工作线程；纯 TypeScript + promises。

## 故障排除

- 如果命令似乎卡住了，请启用详细日志并查找“queued for ...ms”行以确认队列正在排空。
- 如果您需要队列深度，请启用详细日志并观察队列计时行。
- 接受轮次然后停止发出进度的 Codex 应用服务器运行会被 Codex 适配器中断，以便活动会话通道可以释放，而不是等待外部运行超时。
- 启用诊断后，在 `diagnostics.stuckSessionWarnMs` 之后仍处于 `processing` 且未观察到回复、工具、状态、块或 ACP 进度的会话将按当前活动进行分类。活动工作记录为 `session.long_running`；没有最近进度的活动工作记录为 `session.stalled`；`session.stuck` 保留用于没有活动工作的过时会话簿记，并且只有该路径可以释放受影响的会话通道，以便排队的工作排空。当会话保持不变时，重复的 `session.stuck` 诊断会退避。

## 相关

- [会话管理](/zh/concepts/session)
- [引导队列](/zh/concepts/queue-steering)
- [引导](/zh/tools/steer)
- [重试策略](/zh/concepts/retry)
