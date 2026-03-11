---
summary: "排查 cron 和心跳调度以及传递"
read_when:
  - "Cron did not run"
  - "Cron ran but no message was delivered"
  - "Heartbeat seems silent or skipped"
title: "自动化故障排除"
---

# 自动化故障排除

使用此页面解决调度器和传递问题（`cron` + `heartbeat`）。

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

良好输出如下：

- `cron status` 报告已启用并将来的 `nextWakeAtMs`。
- 作业已启用并具有有效的计划/时区。
- `cron runs` 显示 `ok` 或明确的跳过原因。

常见特征：

- `cron: scheduler disabled; jobs will not run automatically` → 在配置/环境中禁用了 cron。
- `cron: timer tick failed` → 调度器计时器崩溃；检查周围的堆栈/日志上下文。
- 运行输出中的 `reason: not-due` → 在没有 `--force` 的情况下调用手动运行，且作业尚未到期。

## Cron 触发但无传递

```bash
openclaw cron runs --id <jobId> --limit 20
openclaw cron list
openclaw channels status --probe
openclaw logs --follow
```

良好输出如下：

- 运行状态为 `ok`。
- 为隔离的作业设置了传递模式/目标。
- 通道探测报告目标通道已连接。

常见特征：

- 运行成功但传递模式为 `none` → 不期望外部消息。
- 传递目标缺失/无效（`channel`/`to`）→ 运行可能在内部成功但跳过出站。
- 通道身份验证错误（`unauthorized`、`missing_scope`、`Forbidden`）→ 传递被通道凭据/权限阻止。

## 心跳被抑制或跳过

```bash
openclaw system heartbeat last
openclaw logs --follow
openclaw config get agents.defaults.heartbeat
openclaw channels status --probe
```

良好输出如下：

- 心跳已启用，间隔非零。
- 上次心跳结果为 `ran`（或跳过原因已理解）。

常见特征：

- `heartbeat skipped` 带有 `reason=quiet-hours` → 在 `activeHours` 之外。
- `requests-in-flight` → 主通道忙碌；心跳延迟。
- `empty-heartbeat-file` → 间隔心跳被跳过，因为 `HEARTBEAT.md` 没有可操作的内容且没有标记的 cron 事件排队。
- `alerts-disabled` → 可见性设置抑制出站心跳消息。

## 时区和活动时间陷阱

```bash
openclaw config get agents.defaults.heartbeat.activeHours
openclaw config get agents.defaults.heartbeat.activeHours.timezone
openclaw config get agents.defaults.userTimezone || echo "agents.defaults.userTimezone not set"
openclaw cron list
openclaw logs --follow
```

快速规则：

- `Config path not found: agents.defaults.userTimezone` 表示密钥未设置；心跳回退到主机时区（如果设置了 `activeHours.timezone`）。
- 没有 `--tz` 的 Cron 使用 Gateway 主机时区。
- 心跳 `activeHours` 使用配置的时区解析（`user`、`local` 或明确的 IANA tz）。
- 没有时区的 ISO 时间戳对于 cron `at` 计划被视为 UTC。

常见特征：

- 主机时区更改后，作业在错误的挂钟时间运行。
- 心跳在您的白天总是被跳过，因为 `activeHours.timezone` 错误。

相关：

- [/automation/cron-jobs](/zh/automation/cron-jobs)
- [/gateway/heartbeat](/zh/gateway/heartbeat)
- [/automation/cron-vs-heartbeat](/zh/automation/cron-vs-heartbeat)
- [/concepts/timezone](/zh/concepts/timezone)
