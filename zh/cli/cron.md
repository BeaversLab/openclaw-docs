---
summary: "`openclaw cron`（调度和运行后台作业）的 CLI 参考"
read_when:
  - You want scheduled jobs and wakeups
  - You’re debugging cron execution and logs
title: "cron"
---

# `openclaw cron`

管理 Gateway 网关 调度器的 cron 作业。

相关：

- Cron 作业：[Cron 作业](/zh/en/automation/cron-jobs)

提示：运行 `openclaw cron --help` 查看完整的命令表面。

注意：隔离的 `cron add` 作业默认为 `--announce` 投递。使用 `--no-deliver` 将
输出保留在内部。`--deliver` 保留为 `--announce` 的已弃用别名。

注意：一次性 (`--at`) 作业默认在成功后删除。使用 `--keep-after-run` 保留它们。

注意：循环作业现在在连续错误后使用指数退避重试 (30秒 → 1分钟 → 5分钟 → 15分钟 → 60分钟)，然后在下次成功运行后恢复正常调度。

注意：`openclaw cron run` 现在在手动运行排队执行后立即返回。成功的响应包含 `{ ok: true, enqueued: true, runId }`；使用 `openclaw cron runs --id <job-id>` 跟踪最终结果。

注意：保留/修剪在配置中控制：

- `cron.sessionRetention`（默认 `24h`）会清理已完成的隔离运行会话。
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` 会清理 `~/.openclaw/cron/runs/<jobId>.jsonl`。

升级说明：如果您拥有当前投递/存储格式之前的旧 cron 作业，请运行
`openclaw doctor --fix`。Doctor 现在会规范化旧的 cron 字段（`jobId`、`schedule.cron`、
顶级投递字段、payload `provider` 投递别名），并在配置 `cron.webhook` 时
将简单的 `notify: true` webhook 后备作业迁移到显式 webhook 投递。

## 常见编辑

在不更改消息的情况下更新投递设置：

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "123456789"
```

为隔离的作业禁用投递：

```bash
openclaw cron edit <job-id> --no-deliver
```

为隔离的作业启用轻量级引导上下文：

```bash
openclaw cron edit <job-id> --light-context
```

宣布到特定频道：

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

`--light-context` 仅适用于隔离的 agent-turn 作业。对于 cron 运行，轻量级模式将引导上下文保持为空，而不是注入完整的工作区引导集。

import zh from '/components/footer/zh.mdx';

<zh />
