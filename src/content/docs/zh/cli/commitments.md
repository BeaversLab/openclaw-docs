---
summary: "CLICLI 参考用于 `openclaw commitments`（检查和关闭推断的后续跟进）"
read_when:
  - You want to inspect inferred follow-up commitments
  - You want to dismiss pending check-ins
  - You are auditing what heartbeat may deliver
title: "`openclaw commitments`"
---

列出并管理推断的后续跟进承诺。

承诺是可选加入的、短期存在的后续跟进记忆，根据对话上下文创建。请参阅[推断的承诺](/zh/concepts/commitments)了解概念指南。

如果没有子命令，`openclaw commitments` 会列出待处理的承诺。

## 用法

```bash
openclaw commitments [--all] [--agent <id>] [--status <status>] [--json]
openclaw commitments list [--all] [--agent <id>] [--status <status>] [--json]
openclaw commitments dismiss <id...> [--json]
```

## 选项

- `--all`：显示所有状态，而不仅仅是待处理的承诺。
- `--agent <id>`：筛选到一个代理 ID。
- `--status <status>`：按状态筛选。值：`pending`、`sent`、
  `dismissed`、`snoozed` 或 `expired`。
- `--json`：输出机器可读的 JSON。

## 示例

列出待处理的承诺：

```bash
openclaw commitments
```

列出每个存储的承诺：

```bash
openclaw commitments --all
```

筛选到一个代理：

```bash
openclaw commitments --agent main
```

查找已暂停的承诺：

```bash
openclaw commitments --status snoozed
```

关闭一个或多个承诺：

```bash
openclaw commitments dismiss cm_abc123 cm_def456
```

导出为 JSON：

```bash
openclaw commitments --all --json
```

## 输出

文本输出包括：

- 承诺 ID
- 状态
- 类型
- 最早到期时间
- 范围
- 建议的签到文本

JSON 输出还包括承诺存储路径和完整的存储记录。

## 相关

- [推断的承诺](/zh/concepts/commitments)
- [记忆概述](/zh/concepts/memory)
- [心跳](/zh/gateway/heartbeat)
- [计划任务](/zh/automation/cron-jobs)
