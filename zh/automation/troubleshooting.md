---
summary: "对 cron 和心跳的调度及发送进行故障排除"
read_when:
  - Cron did not run
  - Cron ran but no message was delivered
  - Heartbeat seems silent or skipped
title: "自动化故障排除"
---

# 自动化故障排除

使用此页面解决调度器和发送问题（`cron` + `heartbeat`）。

## 命令阶梯

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

然后运行自动化检查：

```bash
openclaw cron status
openclaw cron list
openclaw system heartbeat last
```

## Cron 未触发

```bash
openclaw cron status
openclaw cron list
openclaw cron runs --id <jobId> --limit 20
openclaw logs --follow
```

正常的输出如下所示：

- `cron status` 报告已启用且存在未来的 `nextWakeAtMs`。
- 作业已启用且具有有效的计划/时区。
- `cron runs` 显示 `ok` 或明确的跳过原因。

常见特征：

- `cron: scheduler disabled; jobs will not run automatically` → 在配置/环境中禁用了 cron。
- `cron: timer tick failed` → 调度器 tick 崩溃；检查周围的堆栈/日志上下文。
- 运行输出中出现 `reason: not-due` → 在没有 `--force` 的情况下调用了手动运行，且作业尚未到期。

## Cron 已触发但无交付

```bash
openclaw cron runs --id <jobId> --limit 20
openclaw cron list
openclaw channels status --probe
openclaw logs --follow
```

正常的输出如下所示：

- 运行状态为 `ok`。
- 隔离作业的交付模式/目标已设置。
- 通道探测报告目标通道已连接。

常见特征：

- 运行成功但发送模式为 `none` → 不预期有外部消息。
- 发送目标缺失/无效（`channel`/`to`）→ 运行可能在内部成功，但跳过出站发送。
- 通道身份验证错误（`unauthorized`、`missing_scope`、`Forbidden`）→ 发送被通道凭据/权限阻止。

## 心跳被抑制或跳过

```bash
openclaw system heartbeat last
openclaw logs --follow
openclaw config get agents.defaults.heartbeat
openclaw channels status --probe
```

正常的输出如下所示：

- 心跳已启用，且间隔非零。
- 上次心跳结果为 `ran`（或已理解跳过原因）。

常见特征：

- `heartbeat skipped` 搭配 `reason=quiet-hours` → 超出 `activeHours`。
- `requests-in-flight` → 主通道忙；心跳已延迟。
- `empty-heartbeat-file` → 已跳过间隔心跳，因为 `HEARTBEAT.md` 没有可操作的内容，且没有已标记的 cron 事件排队。
- `alerts-disabled` → 可见性设置抑制出站心跳消息。

## 时区和 activeHours 注意事项

```bash
openclaw config get agents.defaults.heartbeat.activeHours
openclaw config get agents.defaults.heartbeat.activeHours.timezone
openclaw config get agents.defaults.userTimezone || echo "agents.defaults.userTimezone not set"
openclaw cron list
openclaw logs --follow
```

快速规则：

- `Config path not found: agents.defaults.userTimezone` 表示未设置该键；心跳回退到主机时区（如果设置了 `activeHours.timezone` 则使用该值）。
- 没有 `--tz` 的 Cron 使用网关主机时区。
- 心跳 `activeHours` 使用配置的时区解析（`user`、`local` 或显式 IANA tz）。
- Cron `at` 计划将不带时区的 ISO 时间戳视为 UTC，除非您使用了 CLI `--at "<offset-less-iso>" --tz <iana>`。

常见特征：

- 在主机时区更改后，作业在错误的挂钟时间运行。
- 在您白天期间总是跳过 Heartbeat，因为 `activeHours.timezone` 错误。

相关内容：

- [/automation/cron-jobs](/zh/automation/cron-jobs)
- [/gateway/heartbeat](/zh/gateway/heartbeat)
- [/automation/cron-vs-heartbeat](/zh/automation/cron-vs-heartbeat)
- [/concepts/timezone](/zh/concepts/timezone)

import zh from "/components/footer/zh.mdx";

<zh />
