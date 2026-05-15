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

`steer` 是默认模式，因为它能在不启动第二次会话运行的情况下，保持当前模型轮次的响应性。它会排空所有在下一个模型边界之前到达的引导消息。如果当前运行无法接受引导，OpenClaw 会回退到一个后续队列条目。

## 队列模式

入站消息可以引导当前运行、等待后续轮次，或两者兼做：

- `steer`：将引导消息排队到活动运行时中。Pi 在当前助手轮次完成其工具调用**之后**、下一次 LLM 调用**之前**，传递所有待处理的引导消息；Codex 应用服务器接收一批 `turn/steer`。如果运行未处于活动流状态或引导不可用，OpenClaw 会回退到一个后续队列条目。
- `queue`（旧版）：旧的每次一条引导。Pi 在每个模型边界传递一个排队的引导消息；Codex 应用服务器接收单独的 `turn/steer` 请求。除非您需要之前的序列化行为，否则首选 `steer`。
- `followup`：将每条消息排队，以便在当前运行结束后稍后进行代理轮次。
- `collect`：将排队的消息在静默窗口后合并为**一个**后续轮次。如果消息针对不同的渠道/线程，它们会单独排空以保留路由。
- `steer-backlog`（又名 `steer+backlog`）：现在引导**并**保留同一条消息用于后续轮次。
- `interrupt`（旧版）：中止该会话的活动运行，然后运行最新消息。

Steer-backlog 意味着你可以在被引导的运行之后获得后续响应，因此
流式界面看起来可能会有重复。如果你希望每条入站消息
只得到一个响应，请优先使用 `collect`/`steer`。

有关运行时特定的时序和依赖行为，请参阅
[Steering queue](/zh/concepts/queue-steering)。有关显式的 `/steer <message>`
命令，请参阅 [Steer](/zh/tools/steer)。

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

选项适用于 `followup`、`collect` 和 `steer-backlog`（以及当引导回退到后续时的 `steer` 或旧版 `queue`）：

- `debounceMs`：清空排队的后续消息之前的静默窗口。纯数字表示毫秒；`/queue` 选项接受 `ms`、`s`、`m`、`h` 和 `d` 单位。
- `cap`：每个会话的最大排队消息数。低于 `1` 的值将被忽略。
- `drop: "summarize"`：默认值。根据需要丢弃最旧的排队条目，保留紧凑摘要，并将其作为合成后续提示注入。
- `drop: "old"`：根据需要丢弃最旧的排队条目，而不保留摘要。
- `drop: "new"`：当队列已满时拒绝最新的消息。

默认值：`debounceMs: 500`、`cap: 20`、`drop: summarize`。

## 优先级

对于模式选择，OpenClaw 按以下顺序解析：

1. 内联或存储的每个会话的 `/queue` 覆盖。
2. `messages.queue.byChannel.<channel>`。
3. `messages.queue.mode`。
4. 默认 `steer`。

对于选项，内联或存储的 `/queue` 选项优先于配置。然后应用特定渠道的去抖动（`messages.queue.debounceMsByChannel`）、插件去抖动默认值、全局 `messages.queue` 选项和内置默认值。`cap` 和 `drop` 是全局/会话选项，而非每渠道配置键。

## 每会话覆盖

- 发送 `/queue <mode>` 作为独立命令，以存储当前会话的模式。
- 选项可以组合使用：`/queue collect debounce:0.5s cap:25 drop:summarize`
- `/queue default` 或 `/queue reset` 清除会话覆盖。

## 范围和保证

- 适用于所有使用网关回复管道（WhatsApp web、Telegram、Slack、Discord、Signal、iMessage、webchat 等）的入站渠道的自动回复代理运行。
- 默认通道（`main`）对于入站 + 主心跳是进程范围的；设置 `agents.defaults.maxConcurrent` 以允许多个会话并行运行。
- 可能存在额外的通道（例如 `cron`、`cron-nested`、`nested`、`subagent`），以便后台作业可以并行运行而不会阻塞入站回复。隔离的 cron 代理轮次持有一个 `cron` 插槽，而其内部代理执行使用 `cron-nested`；两者都使用 `cron.maxConcurrentRuns`。共享的非 cron `nested` 流程保持其自己的通道行为。这些分离的运行被跟踪为 [后台任务](/zh/automation/tasks)。
- 每会话通道保证一次只有一个代理运行接触给定的会话。
- 没有外部依赖或后台工作线程；纯 TypeScript + promises。

## 故障排除

- 如果命令似乎卡住了，请启用详细日志并查找 "queued for ...ms" 行，以确认队列正在排出。
- 如果您需要队列深度，请启用详细日志并关注队列计时行。
- 接受一个轮次然后停止发出进度的 Codex app-server 运行会被 Codex 适配器中断，以便活动会话通道可以释放，而不是等待外部运行超时。
- 当启用诊断时，在 `processing` 中停留超过 `diagnostics.stuckSessionWarnMs` 且未观察到回复、工具、状态、块或 ACP 进度的会话会按当前活动进行分类。活动工作记录为 `session.long_running`；没有最近进度的活动工作记录为 `session.stalled`；`session.stuck` 保留给没有活动工作的过时会话簿记，只有该路径可以释放受影响的会话通道，以便排队的工作排出。重复的 `session.stuck` 诊断会在会话保持不变时进行退避。

## 相关

- [会话管理](/zh/concepts/session)
- [引导队列](/zh/concepts/queue-steering)
- [引导](/zh/tools/steer)
- [重试策略](/zh/concepts/retry)
