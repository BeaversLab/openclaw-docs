---
summary: "OpenClaw时区在 OpenClaw 中的出现位置——信封、工具负载、系统提示"
read_when:
  - You want a quick mental model for timezone handling
  - You are deciding where to set or override a timezone
title: "时区"
---

OpenClaw 标准化了时间戳，以便模型看到的是**单一参考时间**，而不是提供商本地时钟的混合体。时区出现在三个层面，每个层面都有其特定用途：

## 三个时区层面

| 层面     | 显示内容                                                                                   | 默认值                                  | 配置方式                           |
| -------- | ------------------------------------------------------------------------------------------ | --------------------------------------- | ---------------------------------- |
| 消息信封 | 封装入站渠道消息：`[Signal +1555 Sun 2026-01-18 00:19:42 PST] hello`                       | 主机本地                                | `agents.defaults.envelopeTimezone` |
| 工具负载 | 渠道 `readMessages` 风格的工具返回原始提供商时间 + 标准化的 `timestampMs` / `timestampUtc` | 始终存在 UTC 字段                       | 不可配置——保留提供商原生时间戳     |
| 系统提示 | 一个小的 `Current Date & Time` 块，仅包含**时区**（无时钟值，以保持缓存稳定）              | 如果未设置 `userTimezone`，则为主机时区 | `agents.defaults.userTimezone`     |

系统提示有意省略了实时时钟，以保持提示缓存在轮次之间稳定。当代理需要当前时间时，它会调用 `session_status`。

## 设置用户时区

```json5
{
  agents: {
    defaults: {
      userTimezone: "America/Chicago",
    },
  },
}
```

如果未设置 `userTimezone`OpenClaw，OpenClaw 会在运行时解析主机时区（不写入配置）。`agents.defaults.timeFormat` (`auto` | `12` | `24`) 控制信封和下游层面中的 12 小时/24 小时渲染，而非系统提示部分。

## 何时覆盖

- **使用 UTC 信封** (`envelopeTimezone: "utc"`) 当您希望在不同区域的主机之间获得稳定的时间戳，或者希望 UTC 对齐的日志与诊断输出相匹配时。
- **使用固定的 IANA 时区**（例如 `"Europe/Vienna"`）当网关主机位于一个时区而用户位于另一个时区，并且您希望无论主机迁移如何，信封都以用户的时区显示时。
- **设置 `envelopeTimestamp: "off"`** 用于低 Token 信封，当时间戳上下文对对话没有用处时。

有关完整的行为参考、每个提供商的示例以及经过时间格式设置，请参阅[日期和时间](/zh/date-time)。

## 相关

- [日期和时间](/zh/date-time) — 完整的信封/工具/提示行为和示例。
- [心跳](/zh/gateway/heartbeat) — 活跃时段使用时区进行调度。
- [Cron 作业](/zh/automation/cron-jobs) — cron 表达式使用时区进行调度。
