---
summary: "代理、信封和提示的时区处理"
read_when:
  - 您需要了解如何为模型标准化时间戳
  - 配置系统提示的用户时区
title: "时区"
---

# 时区

OpenClaw 标准化时间戳，以便模型看到**单一参考时间**。

## 消息信封（默认为本地时间）

入站消息被包装在类似以下的信封中：

```
[Provider ... 2026-01-05 16:26 PST] message text
```

信封中的时间戳**默认为主机本地时间**，精度为分钟。

您可以通过以下方式覆盖此设置：

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
- `envelopeTimezone: "user"` 使用 `agents.defaults.userTimezone`（回退至主机时区）。
- 使用明确的 IANA 时区（例如 `"Europe/Vienna"`）以获得固定偏移量。
- `envelopeTimestamp: "off"` 从信封标头中移除绝对时间戳。
- `envelopeElapsed: "off"` 移除经过时间后缀（`+2m` 风格）。

### 示例

**本地时间（默认）：**

```
[Signal Alice +1555 2026-01-18 00:19 PST] hello
```

**固定时区：**

```
[Signal Alice +1555 2026-01-18 06:19 GMT+1] hello
```

**经过时间：**

```
[Signal Alice +1555 +2m 2026-01-18T05:19Z] follow-up
```

## 工具载荷（原始提供商数据 + 标准化字段）

工具调用（`channels.discord.readMessages`、`channels.slack.readMessages` 等）返回**原始提供商时间戳**。
我们还附加了标准化字段以确保一致性：

- `timestampMs`（UTC 纪元毫秒数）
- `timestampUtc`（ISO 8601 UTC 字符串）

原始提供商字段会被保留。

## 系统提示的用户时区

设置 `agents.defaults.userTimezone` 以告知模型用户的本地时区。如果未
设置，OpenClaw 将在运行时解析**主机时区**（无需写入配置）。

```json5
{
  agents: { defaults: { userTimezone: "America/Chicago" } },
}
```

系统提示包括：

- `Current Date & Time` 部分，包含本地时间和时区
- `Time format: 12-hour` 或 `24-hour`

您可以使用 `agents.defaults.timeFormat`（`auto` | `12` | `24`）来控制提示格式。

有关完整行为和示例，请参阅 [日期和时间](/zh/date-time)。

import zh from "/components/footer/zh.mdx";

<zh />
