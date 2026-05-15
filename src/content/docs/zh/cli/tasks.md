---
summary: "CLI reference for `openclaw tasks` (background task ledger and Task Flow state)"
read_when:
  - You want to inspect, audit, or cancel background task records
  - You are documenting Task Flow commands under `openclaw tasks flow`
title: "`openclaw tasks`"
---

检查持久的后台任务和 Task Flow 状态。不带子命令时，
`openclaw tasks` 等同于 `openclaw tasks list`。

有关生命周期和交付模型，请参阅[后台任务](/zh/automation/tasks)。

## 用法

```bash
openclaw tasks
openclaw tasks list
openclaw tasks list --runtime acp
openclaw tasks list --status running
openclaw tasks show <lookup>
openclaw tasks notify <lookup> state_changes
openclaw tasks cancel <lookup>
openclaw tasks audit
openclaw tasks maintenance
openclaw tasks maintenance --apply
openclaw tasks flow list
openclaw tasks flow show <lookup>
openclaw tasks flow cancel <lookup>
```

## 根选项

- `--json`：输出 JSON。
- `--runtime <name>`：按类型过滤：`subagent`、`acp`、`cron` 或 `cli`。
- `--status <name>`：按状态过滤：`queued`、`running`、`succeeded`、`failed`、`timed_out`、`cancelled` 或 `lost`。

## 子命令

### `list`

```bash
openclaw tasks list [--runtime <name>] [--status <name>] [--json]
```

列出受跟踪的后台任务，最新的在前。

### `show`

```bash
openclaw tasks show <lookup> [--json]
```

根据任务 ID、运行 ID 或会话密钥显示一个任务。

### `notify`

```bash
openclaw tasks notify <lookup> <done_only|state_changes|silent>
```

更改运行中任务的通知策略。

### `cancel`

```bash
openclaw tasks cancel <lookup>
```

取消正在运行的后台任务。

### `audit`

```bash
openclaw tasks audit [--severity <warn|error>] [--code <name>] [--limit <n>] [--json]
```

显示陈旧、丢失、传递失败或其他不一致的任务和 Task Flow 记录。保留到 `cleanupAfter` 的丢失任务是警告；过期或未标记的丢失任务是错误。

### `maintenance`

```bash
openclaw tasks maintenance [--apply] [--json]
```

预览或应用任务和Task Flow协调、清理标记、修剪以及过时的cron运行会话注册表清理。
对于cron任务，协调会在将旧的活动任务标记为 `lost`Gateway(网关)CLIGateway(网关)CLI 之前使用持久化的运行日志/作业状态，因此已完成的cron运行不会仅仅因为内存中的Gateway(网关)运行时状态消失而成为错误的审计错误。离线CLI审计对于Gateway(网关)的进程本地cron活动作业集不具有权威性。当具有运行ID/源ID的CLI任务的实时Gateway(网关)运行上下文消失时，即使存在旧的子会话行，这些任务也会被标记为 `lost`Gateway(网关)。
应用时，维护还会修剪 `cron:<jobId>:run:<uuid>` 会话注册表中超过7天的行，同时保留当前正在运行的cron作业，并且不触碰非cron会话行。

### `flow`

```bash
openclaw tasks flow list [--status <name>] [--json]
openclaw tasks flow show <lookup> [--json]
openclaw tasks flow cancel <lookup>
```

检查或取消任务账本下的持久 Task Flow 状态。

## 相关

- [CLI 参考](CLI/en/cli)
- [后台任务](/zh/automation/tasks)
