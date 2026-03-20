---
summary: "跨信封、提示词、工具和连接器的日期和时间处理"
read_when:
  - 您正在更改向模型或用户显示时间戳的方式
  - 您正在调试消息或系统提示词输出中的时间格式
title: "日期和时间"
---

# 日期和时间

OpenClaw 默认使用**主机本地时间作为传输时间戳**，并且**仅在系统提示词中使用用户时区**。
提供商时间戳会被保留，以便工具保留其原生语义（当前时间可通过 `session_status` 获取）。

## 消息信封（默认为本地时间）

传入消息会被包裹上时间戳（精确到分钟）：

```
[Provider ... 2026-01-05 16:26 PST] message text
```

默认情况下，此信封时间戳为**主机本地时间**，无论提供商时区如何。

您可以覆盖此行为：

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
- `envelopeTimezone: "local"` 使用主机时区。
- `envelopeTimezone: "user"` 使用 `agents.defaults.userTimezone`（回退到主机时区）。
- 使用明确的 IANA 时区（例如 `"America/Chicago"`）来设置固定区域。
- `envelopeTimestamp: "off"` 从信封标头中移除绝对时间戳。
- `envelopeElapsed: "off"` 移除经过时间后缀（`+2m` 样式）。

### 示例

**本地（默认）：**

```
[WhatsApp +1555 2026-01-18 00:19 PST] hello
```

**用户时区：**

```
[WhatsApp +1555 2026-01-18 00:19 CST] hello
```

**已启用经过时间：**

```
[WhatsApp +1555 +30s 2026-01-18T05:19Z] follow-up
```

## 系统提示词：当前日期和时间

如果已知用户时区，系统提示词将包含一个专门的
**当前日期和时间**部分，其中仅包含**时区**（不包含时钟/时间格式），
以保持提示词缓存的稳定：

```
Time zone: America/Chicago
```

当代理需要当前时间时，请使用 `session_status` 工具；状态卡片中包含一行时间戳。

## 系统事件行（默认为本地时间）

插入到代理上下文中的排队系统事件会带有时间戳前缀，该时间戳使用与消息信封相同的时区选择（默认：主机本地）。

```
System: [2026-01-12 12:19:17 PST] Model switched.
```

### 配置用户时区 + 格式

```json5
{
  agents: {
    defaults: {
      userTimezone: "America/Chicago",
      timeFormat: "auto", // auto | 12 | 24
    },
  },
}
```

- `userTimezone` 为提示词上下文设置**用户本地时区**。
- `timeFormat` 控制提示词中的**12/24小时制显示**。`auto` 遵循操作系统首选项。

## 时间格式检测（自动）

当 `timeFormat: "auto"` 时，OpenClaw 会检查操作系统首选项 (macOS/Windows)
并回退到区域设置格式。检测到的值会**按进程缓存**
以避免重复的系统调用。

## 工具载荷 + 连接器（原始提供商时间 + 标准化字段）

频道工具返回**提供商原生时间戳**并添加标准化字段以确保一致性：

- `timestampMs`：纪元毫秒数（UTC）
- `timestampUtc`：ISO 8601 UTC 字符串

原始提供商字段会被保留，以免丢失任何信息。

- Slack：来自 API 的类纪元字符串
- Discord：UTC ISO 时间戳
- Telegram/WhatsApp：提供商特定的数字/ISO 时间戳

如果需要本地时间，请使用已知时区在下游进行转换。

## 相关文档

- [系统提示](/zh/concepts/system-prompt)
- [时区](/zh/concepts/timezone)
- [消息](/zh/concepts/messages)

import zh from "/components/footer/zh.mdx";

<zh />
