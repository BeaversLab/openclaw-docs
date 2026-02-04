---
summary: "Agent、信封与提示中的时区处理"
read_when:
  - 需要了解时间戳如何为模型标准化
  - 配置 system prompt 的用户时区
title: "时区"
---

# 时区

OpenClaw 会标准化时间戳，使模型看到**单一参考时间**。

## 消息信封（默认本地时间）

入站消息会被包裹在如下信封中：

```
[Provider ... 2026-01-05 16:26 PST] message text
```

信封中的时间戳**默认使用主机本地时间**，精度到分钟。

你可以通过以下配置覆盖：

```json5
{
  agents: {
    defaults: {
      envelopeTimezone: "local", // "utc" | "local" | "user" | IANA timezone
      envelopeTimestamp: "on", // "on" | "off"
      envelopeElapsed: "on", // "on" | "off"
    },
  },
}
```

- `envelopeTimezone: "utc"` 使用 UTC。
- `envelopeTimezone: "user"` 使用 `agents.defaults.userTimezone`（若未设置则回退主机时区）。
- 使用显式 IANA 时区（如 `"Europe/Vienna"`）可固定偏移。
- `envelopeTimestamp: "off"` 移除信封头中的绝对时间戳。
- `envelopeElapsed: "off"` 移除耗时后缀（`+2m` 风格）。

### 示例

**本地（默认）：**

```
[Signal Alice +1555 2026-01-18 00:19 PST] hello
```

**固定时区：**

```
[Signal Alice +1555 2026-01-18 06:19 GMT+1] hello
```

**耗时显示：**

```
[Signal Alice +1555 +2m 2026-01-18T05:19Z] follow-up
```

## 工具载荷（原始 provider 数据 + 归一化字段）

工具调用（`channels.discord.readMessages`、`channels.slack.readMessages` 等）返回**原始 provider 时间戳**。
我们也附加归一化字段以保证一致：

- `timestampMs`（UTC epoch 毫秒）
- `timestampUtc`（ISO 8601 UTC 字符串）

原始 provider 字段会被保留。

## System prompt 的用户时区

设置 `agents.defaults.userTimezone` 来告诉模型用户的本地时区。若未设置，OpenClaw 会在运行时解析**主机时区**（不写入配置）。

```json5
{
  agents: { defaults: { userTimezone: "America/Chicago" } },
}
```

System prompt 会包含：

- `Current Date & Time` 分节（本地时间与时区）
- `Time format: 12-hour` 或 `24-hour`

可用 `agents.defaults.timeFormat`（`auto` | `12` | `24`）控制格式。

完整行为与示例参见 [日期与时间](/zh/date-time)。
