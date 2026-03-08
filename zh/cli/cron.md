---
summary: "`openclaw cron` 的 CLI 参考（调度并运行后台任务）"
read_when:
  - 你需要定时任务与唤醒
  - 你在调试 cron 执行与日志
title: "cron"
---

# `openclaw cron`

管理 Gateway 调度器的 cron 任务。

相关：

- Cron 任务：[Cron jobs](/zh/automation/cron-jobs)

提示：运行 `openclaw cron --help` 查看完整命令面。

## 常见编辑

在不修改消息的情况下更新投递设置：

注意：隔离的 `cron add` 任务默认为 `--announce` 投递。使用 `--no-deliver` 保持输出内部。`--deliver` 保留为 `--announce` 的已弃用别名。

注意：单次（`--at`）任务默认在成功后删除。使用 `--keep-after-run` 保留它们。

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "123456789"
```

为隔离任务禁用投递：

```bash
openclaw cron edit <job-id> --no-deliver
```

公告到指定频道：

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
```
