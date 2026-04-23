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

- Cron 作业：[Cron 作业](/zh/automation/cron-jobs)

提示：运行 `openclaw cron --help` 以查看完整的命令界面。

注意：`openclaw cron list` 和 `openclaw cron show <job-id>` 会预览已解析的交付路由。对于 `channel: "last"`，预览显示路由是从主/当前会话解析的，还是会失败关闭。

注意：隔离的 `cron add` 作业默认为 `--announce` 交付。使用 `--no-deliver` 可将输出保持在内部。`--deliver` 作为 `--announce` 的已弃用别名保留。

注意：隔离的 cron 聊天交付是共享的。`--announce` 是最终回复的运行程序回退交付；`--no-deliver` 会禁用该回退，但在聊天路由可用时不会移除代理的 `message` 工具。

注意：一次性 (`--at`) 作业默认在成功后删除。使用 `--keep-after-run` 可保留它们。

注意：`--session` 支持 `main`、`isolated`、`current` 和 `session:<id>`。
使用 `current` 在创建时绑定到活动会话，或使用 `session:<id>` 指定显式的持久会话键。

注意：对于一次性 CLI 作业，无偏移量的 `--at` 日期时间会被视为 UTC，除非您同时传递
`--tz <iana>`，后者会在给定的时区中解释该本地挂钟时间。

注意：周期性作业现在在连续错误后使用指数退避重试（30s → 1m → 5m → 15m → 60m），然后在下次成功运行后恢复正常计划。

注意：`openclaw cron run` 现在会在手动运行排队执行后立即返回。成功的响应包含 `{ ok: true, enqueued: true, runId }`；使用 `openclaw cron runs --id <job-id>` 跟踪最终结果。

注意：`openclaw cron run <job-id>` 默认强制运行。使用 `--due` 可保留
较旧的“仅在到期时运行”行为。

注意：隔离的 cron 会抑制过时的仅确认回复。如果第一个结果只是临时的状态更新，且没有后代子代理运行负责最终答案，cron 会在投递前重新提示一次以获取真实结果。

注意：如果隔离的 cron 运行仅返回静默令牌 (`NO_REPLY` / `no_reply`)，cron 也会抑制直接出站投递和回退的排队摘要路径，因此不会有任何内容回发到聊天。

注意：`cron add|edit --model ...` 使用为该任务选定的允许模型。如果该模型不被允许，cron 会发出警告并回退到任务的代理/默认模型选择。配置的回退链仍然适用，但如果没有显式的特定任务回退列表，纯模型覆盖不再将代理主模型附加为隐藏的额外重试目标。

注意：隔离的 cron 模型优先级依次为 Gmail-hook 覆盖，然后是特定任务 `--model`，接着是任何存储的 cron-会话 模型覆盖，最后是正常的代理/默认选择。

注意：隔离的 cron 快速模式遵循解析的实时模型选择。模型配置 `params.fastMode` 默认应用，但存储的会话 `fastMode` 覆盖仍然优先于配置。

注意：如果隔离运行抛出 `LiveSessionModelSwitchError`，cron 会在重试前持久化切换的提供商/模型（以及存在时的切换的认证配置文件覆盖）。外部重试循环在初始尝试后限制为 2 次切换重试，然后中止而不是无限循环。

注意：失败通知首先使用 `delivery.failureDestination`，然后是全局 `cron.failureDestination`，最后在未配置显式失败目标时回退到任务的主要公告目标。

注意：保留/清理在配置中控制：

- `cron.sessionRetention` (默认 `24h`) 清理已完成的隔离运行会话。
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` 清理 `~/.openclaw/cron/runs/<jobId>.jsonl`。

升级说明：如果您拥有当前交付/存储格式之前的旧 cron 作业，请运行
`openclaw doctor --fix`。Doctor 现在会标准化旧的 cron 字段（`jobId`，`schedule.cron`，
包括旧的 `threadId` 在内的顶级交付字段，负载 `provider` 交付别名），并在配置了 `cron.webhook` 时将简单的
`notify: true` webhook 回退作业迁移到显式 webhook 交付。

## 常见编辑

在不更改消息的情况下更新交付设置：

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "123456789"
```

针对隔离作业禁用交付：

```bash
openclaw cron edit <job-id> --no-deliver
```

为隔离作业启用轻量级引导上下文：

```bash
openclaw cron edit <job-id> --light-context
```

向特定渠道公告：

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

`--light-context` 仅适用于隔离的代理轮次作业。对于 cron 运行，轻量级模式保持引导上下文为空，而不是注入完整的工作区引导集。

交付所有权说明：

- 隔离的 cron 聊天交付是共享的。当聊天路由可用时，代理可以使用
  `message` 工具直接发送。
- `announce` 仅在代理未直接发送到已解析目标时才回退传递最终回复。`webhook` 将完成的负载发布到 URL。
  `none` 禁用运行器回退交付。

## 常见管理命令

手动运行：

```bash
openclaw cron list
openclaw cron show <job-id>
openclaw cron run <job-id>
openclaw cron run <job-id> --due
openclaw cron runs --id <job-id> --limit 50
```

`cron runs` 条目包含交付诊断信息，其中包括预期的 cron 目标、
已解析的目标、消息工具发送、回退使用情况以及已交付状态。

代理/会话重新定位：

```bash
openclaw cron edit <job-id> --agent ops
openclaw cron edit <job-id> --clear-agent
openclaw cron edit <job-id> --session current
openclaw cron edit <job-id> --session "session:daily-brief"
```

交付调整：

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
openclaw cron edit <job-id> --best-effort-deliver
openclaw cron edit <job-id> --no-best-effort-deliver
openclaw cron edit <job-id> --no-deliver
```

失败交付说明：

- 隔离作业支持 `delivery.failureDestination`。
- 主会话作业仅当主要
  交付模式为 `webhook` 时才能使用 `delivery.failureDestination`。
- 如果您未设置任何失败目标，并且作业已向渠道公告，
  则失败通知将重用相同的公告目标。
