---
summary: "用于串行化入站自动回复运行的命令队列设计"
read_when:
  - 修改自动回复执行或并发
title: "命令队列 (2026-01-16)"
---
# 命令队列 (2026-01-16)

我们通过一个小型进程内队列对入站自动回复运行（所有渠道）进行串行化，防止多个 agent 运行相互冲突，同时允许跨会话的安全并行。

## Why
- 自动回复运行可能成本很高（LLM 调用），且多条入站消息靠得很近时会发生冲突。
- 串行化可避免争用共享资源（会话文件、日志、CLI stdin），并降低上游限流风险。

## How it works
- 一个具备 lane 的 FIFO 队列按 lane 进行排队，且每个 lane 有可配置并发上限（未配置的 lane 默认 1；main 默认 4，subagent 默认 8）。
- `runEmbeddedPiAgent` 按**session key**入队（lane 为 `session:<key>`），确保同一会话同一时间仅一个运行。
- 每个会话运行随后入队到**全局 lane**（默认 `main`），以 `agents.defaults.maxConcurrent` 作为整体并行上限。
- 启用 verbose 日志时，若排队超过 ~2s 才开始，会输出短提示。
- 当支持时，typing indicators 在入队时立即触发，因此等待排队不会改变用户体验。

## 队列模式（按渠道）

入站消息可以 steer 当前运行、等待 followup 回合，或两者兼具：
- `steer`：立即注入当前运行（在下一个工具边界后取消待执行工具调用）。若非 streaming，则回退为 followup。
- `followup`：在当前运行结束后排队进入下一个 agent 回合。
- `collect`：将所有排队消息合并为**一个** followup 回合（默认）。若消息目标不同渠道/线程，会分别排空以保持路由。
- `steer-backlog`（即 `steer+backlog`）：立即 steer，**并**保留消息用于 followup 回合。
- `interrupt`（旧）：中止该会话的活动运行，然后运行最新消息。
- `queue`（旧别名）：等同于 `steer`。

Steer-backlog 可能在 steer 运行后产生 followup 回复，因此在 streaming 表面可能看起来像重复。若希望每条入站只对应一次回复，优先 `collect`/`steer`。
以独立命令发送 `/queue collect`（按会话）或设置 `messages.queue.byChannel.discord: "collect"`。

默认值（配置未设置时）：
- 所有表面 → `collect`

通过 `messages.queue` 全局或按渠道配置：

```json5
{
  messages: {
    queue: {
      mode: "collect",
      debounceMs: 1000,
      cap: 20,
      drop: "summarize",
      byChannel: { discord: "collect" }
    }
  }
}
```

## 队列选项

选项适用于 `followup`、`collect` 与 `steer-backlog`（以及 `steer` 回退为 followup 时）：
- `debounceMs`：等待静默后再启动 followup 回合（防止“继续、继续”）。
- `cap`：每个会话最大排队消息数。
- `drop`：溢出策略（`old`、`new`、`summarize`）。

Summarize 会保留被丢弃消息的简短要点列表，并作为合成 followup 提示注入。
默认：`debounceMs: 1000`、`cap: 20`、`drop: summarize`。

## 按会话覆盖

- 以独立命令发送 `/queue <mode>` 以保存当前会话模式。
- 选项可组合：`/queue collect debounce:2s cap:25 drop:summarize`
- `/queue default` 或 `/queue reset` 清除会话覆盖。

## 范围与保证

- 适用于所有使用 gateway 回复管线的入站渠道的自动回复 agent 运行（WhatsApp web、Telegram、Slack、Discord、Signal、iMessage、webchat 等）。
- 默认 lane（`main`）为进程范围，涵盖入站与主 heartbeat；设置 `agents.defaults.maxConcurrent` 可允许多个会话并行。
- 可能存在其他 lanes（如 `cron`、`subagent`），使后台任务并行而不阻塞入站回复。
- 每会话 lane 保证同一会话同一时间仅一个 agent 运行。
- 无外部依赖或后台 worker 线程；纯 TypeScript + promises。

## 排查

- 若命令似乎卡住，启用 verbose 日志并查找 “queued for …ms” 行，确认队列正在排空。
- 若需要队列深度，启用 verbose 日志并观察队列计时行。
