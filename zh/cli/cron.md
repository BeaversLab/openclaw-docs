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

```bash
openclaw cron edit <job-id> --deliver --channel telegram --to "123456789"
```

为隔离任务禁用投递：

```bash
openclaw cron edit <job-id> --no-deliver
```
