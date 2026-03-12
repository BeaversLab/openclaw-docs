---
summary: "对 cron 和心跳的调度与交付进行故障排除"
read_when:
  - Cron did not run
  - Cron ran but no message was delivered
  - Heartbeat seems silent or skipped
title: "自动化故障排除"
---

# 自动化故障排除

使用此页面解决调度器和交付问题 (`cron` + `heartbeat`)。

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

- `cron status` 报告已启用且 `nextWakeAtMs` 在未来。
- 作业已启用且具有有效的计划/时区。
- `cron runs` 显示 `ok` 或明确的跳过原因。

常见特征：

- `cron: scheduler disabled; jobs will not run automatically` → 在 config/env 中禁用了 cron。
- `cron: timer tick failed` → 调度器 tick 崩溃；请检查周围的堆栈/日志上下文。
- 运行输出中出现 `reason: not-due` → 在没有 `--force` 的情况下调用了手动运行且作业尚未到期。

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

- 运行成功但交付模式为 `none` → 不预期有外部消息。
- 交付目标缺失/无效 (`channel`/`to`) → 运行可能在内部成功，但跳过出站。
- 通道身份验证错误 (`unauthorized`, `missing_scope`, `Forbidden`) → 交付被通道凭据/权限阻止。

## 心跳被抑制或跳过

```bash
openclaw system heartbeat last
openclaw logs --follow
openclaw config get agents.defaults.heartbeat
openclaw channels status --probe
```

正常的输出如下所示：

- 心跳已启用，且间隔非零。
- 上一次心跳结果为 `ran` (或理解跳过原因)。

常见特征：

- `heartbeat skipped` 且带有 `reason=quiet-hours` → 处于 `activeHours` 之外。
- `requests-in-flight` → 主通道繁忙；心跳已推迟。
- `empty-heartbeat-file` → 间隔心跳跳过，因为 `HEARTBEAT.md` 没有可操作的内容且没有带标签的 cron 事件排队。
- `alerts-disabled` → 可见性设置抑制了出站心跳消息。

## 时区和 activeHours 注意事项

```bash
openclaw config get agents.defaults.heartbeat.activeHours
openclaw config get agents.defaults.heartbeat.activeHours.timezone
openclaw config get agents.defaults.userTimezone || echo "agents.defaults.userTimezone not set"
openclaw cron list
openclaw logs --follow
```

快速规则：

- `Config path not found: agents.defaults.userTimezone` 意味着键未设置；心跳回退到主机时区 (如果设置了则是 `activeHours.timezone`)。
- 不带 `--tz` 的 Cron 使用网关主机的时区。
- 心跳 `activeHours` 使用配置的时区解析方式（`user`、`local` 或显式 IANA 时区）。
- 对于 cron `at` 计划，不带时区的 ISO 时间戳会被视为 UTC 时间。

常见特征：

- 在主机时区更改后，作业在错误的挂钟时间运行。
- 在您的白天总是跳过心跳，因为 `activeHours.timezone` 是错误的。

相关内容：

- [/automation/cron-jobs](/zh/en/automation/cron-jobs)
- [/gateway/heartbeat](/zh/en/gateway/heartbeat)
- [/automation/cron-vs-heartbeat](/zh/en/automation/cron-vs-heartbeat)
- [/concepts/timezone](/zh/en/concepts/timezone)
