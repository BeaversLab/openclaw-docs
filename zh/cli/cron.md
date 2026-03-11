---
summary: "CLI 参考，包含 `openclaw cron`（调度和运行后台作业）"
read_when:
  - "You want scheduled jobs and wakeups"
  - "You’re debugging cron execution and logs"
title: "cron"
---

# `openclaw cron`

管理 Gateway 调度器的 cron 作业。"

相关内容："

- Cron 作业：[Cron 作业](/zh/automation/cron-jobs)"

提示：运行 `openclaw cron --help` 查看完整的命令界面。"

注意：隔离的 `cron add` 作业默认使用 `--announce` 投递。使用 `--no-deliver` 保持
输出内部化。`--deliver` 仍作为 `--announce` 的已弃用别名。"

注意：一次性（`--at`）作业默认在成功后删除。使用 `--keep-after-run` 保留它们。"

## 常见编辑"

在不更改消息的情况下更新投递设置："

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "123456789"
```

禁用隔离作业的投递："

```bash
openclaw cron edit <job-id> --no-deliver
```

向特定频道宣布："

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
```
