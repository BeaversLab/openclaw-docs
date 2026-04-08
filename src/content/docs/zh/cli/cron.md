---
summary: "CLI 参考，用于 `openclaw cron`（调度和运行后台作业）"
read_when:
  - You want scheduled jobs and wakeups
  - You’re debugging cron execution and logs
title: "cron"
---

# `openclaw cron`

管理 Gateway(网关) 网关 调度器的 cron 作业。

相关：

- Cron 作业：[Cron jobs](/en/automation/cron-jobs)

提示：运行 `openclaw cron --help` 以查看完整的命令界面。

注意：隔离的 `cron add` 作业默认为 `--announce` 投递。使用 `--no-deliver` 使
输出保留在内部。`--deliver` 仍作为 `--announce` 的已弃用别名。

注意：cron 拥有的隔离运行期望提供纯文本摘要，并且运行器拥有
最终的发送路径。`--no-deliver` 使运行保持在内部；它不会将
投递交还给代理的消息工具。

注意：一次性（`--at`）作业默认在成功后删除。使用 `--keep-after-run` 保留它们。

注意：`--session` 支持 `main`、`isolated`、`current` 和 `session:<id>`。
使用 `current` 在创建时绑定到活动会话，或使用 `session:<id>` 绑定
到显式的持久会话密钥。

注意：对于一次性 CLI 作业，无偏移量的 `--at` 日期时间被视为 UTC，除非您同时传递
`--tz <iana>`，它将在给定的时区中解释该本地挂钟时间。

注意：周期性作业现在在连续错误后使用指数退避重试（30s → 1m → 5m → 15m → 60m），然后在下一次成功运行后恢复正常调度。

注意：`openclaw cron run` 现在在手动运行排队执行后立即返回。成功的响应包括 `{ ok: true, enqueued: true, runId }`；使用 `openclaw cron runs --id <job-id>` 跟踪最终结果。

注意：`openclaw cron run <job-id>` 默认强制运行。使用 `--due` 保持
较旧的“仅在到期时运行”行为。

注意：隔离的 cron 任务会抑制过时的仅确认回复。如果第一个结果只是临时状态更新，并且没有后代子代理运行负责最终答案，cron 会在交付前针对真实结果重新提示一次。

注意：如果隔离的 cron 运行仅返回静默令牌 (`NO_REPLY` /
`no_reply`)，cron 也会抑制直接出站交付和回退队列摘要路径，因此不会向聊天回发任何内容。

注意：`cron add|edit --model ...` 使用该选定允许的模型作为任务模型。
如果该模型不被允许，cron 会发出警告并回退到任务的代理/默认模型选择。已配置的回退链仍然适用，但没有显式每任务回退列表的纯模型覆盖不再将代理主要模型作为隐藏的额外重试目标附加。

注意：隔离的 cron 模型优先级首先是 Gmail-hook 覆盖，然后是每任务 `--model`，接着是任何存储的 cron 会话模型覆盖，最后是正常的代理/默认选择。

注意：隔离的 cron 快速模式遵循解析后的实时模型选择。模型配置 `params.fastMode` 默认应用，但存储的会话 `fastMode` 覆盖仍然优先于配置。

注意：如果隔离运行抛出 `LiveSessionModelSwitchError`，cron 会在重试之前持久化切换的提供商/模型（以及存在时的切换认证配置文件覆盖）。外部重试循环在初始尝试后限制为 2 次切换重试，然后中止而不是无限循环。

注意：失败通知首先使用 `delivery.failureDestination`，然后是全局 `cron.failureDestination`，最后在未配置显式失败目标时回退到任务的主要公告目标。

注意：保留/修剪在配置中控制：

- `cron.sessionRetention` (默认 `24h`) 会修剪已完成的隔离运行会话。
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` 修剪 `~/.openclaw/cron/runs/<jobId>.jsonl`。

升级说明：如果您拥有当前交付/存储格式之前的旧 cron 作业，请运行 `openclaw doctor --fix`。Doctor 现在会规范化旧的 cron 字段（`jobId`、`schedule.cron`，包括旧的 `threadId` 在内的顶层交付字段、payload `provider` 交付别名），并在配置了 `cron.webhook` 时将简单的 `notify: true` webhook 回退作业迁移为显式 webhook 交付。

## 常见编辑

更新交付设置而不更改消息：

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "123456789"
```

为隔离作业禁用交付：

```bash
openclaw cron edit <job-id> --no-deliver
```

为隔离作业启用轻量级引导上下文：

```bash
openclaw cron edit <job-id> --light-context
```

向特定渠道发布：

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
```

创建具有轻量级引导上下文的隔离作业：

```bash
openclaw cron add \
  --name "Lightweight morning brief" \
  --cron "0 7 * * *" \
  --session isolated \
  --message "Summarize overnight updates." \
  --light-context \
  --no-deliver
```

`--light-context` 仅适用于隔离的 agent-turn 作业。对于 cron 运行，轻量级模式保持引导上下文为空，而不是注入完整的工作区引导集。

交付所有权说明：

- Cron 拥有的隔离作业始终通过 cron 运行器（`announce`、`webhook` 或仅限内部的 `none`）路由最终用户可见的交付。
- 如果任务提及向某些外部收件人发送消息，Agent 应在其结果中描述预期目标，而不是尝试直接发送。

## 常用管理命令

手动运行：

```bash
openclaw cron run <job-id>
openclaw cron run <job-id> --due
openclaw cron runs --id <job-id> --limit 50
```

Agent/会话 重定向：

```bash
openclaw cron edit <job-id> --agent ops
openclaw cron edit <job-id> --clear-agent
openclaw cron edit <job-id> --session current
openclaw cron edit <job-id> --session "session:daily-brief"
```

交付微调：

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
openclaw cron edit <job-id> --best-effort-deliver
openclaw cron edit <job-id> --no-best-effort-deliver
openclaw cron edit <job-id> --no-deliver
```

失败交付说明：

- 隔离作业支持 `delivery.failureDestination`。
- 仅当主交付模式为 `webhook` 时，主会话作业才能使用 `delivery.failureDestination`。
- 如果您未设置任何失败目标，且作业已向渠道发布，则失败通知将重用该同一发布目标。
