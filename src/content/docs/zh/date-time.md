---
summary: "在信封、提示、工具和连接器中处理日期和时间"
read_when:
  - You are changing how timestamps are shown to the model or users
  - You are debugging time formatting in messages or system prompt output
title: "日期和时间"
---

OpenClaw 默认对**传输时间戳使用主机本地时间**，并且**仅在系统提示中使用用户时区**。
提供商时间戳会被保留，以便工具保持其原生语义（当前时间可通过 OpenClaw`session_status` 获取）。

## 消息信封（默认为本地时间）

入站消息会被包裹一个时间戳（秒级精度）：

```
[Provider ... Mon 2026-01-05 16:26:34 PST] message text
```

无论提供商时区如何，该信封时间戳**默认为主机本地时间**。

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
- `envelopeTimezone: "user"` 使用 `agents.defaults.userTimezone`（回退至主机时区）。
- 对于固定区域，请使用显式的 IANA 时区（例如 `"America/Chicago"`）。
- `envelopeTimestamp: "off"` 从信封头中移除绝对时间戳。
- `envelopeElapsed: "off"` 移除经过时间后缀（即 `+2m` 样式）。

### 示例

**本地（默认）：**

```
[WhatsApp +1555 Sun 2026-01-18 00:19:42 PST] hello
```

**用户时区：**

```
[WhatsApp +1555 Sun 2026-01-18 00:19:42 CST] hello
```

**已启用经过时间：**

```
[WhatsApp +1555 +30s Sun 2026-01-18T05:19:00Z] follow-up
```

## 系统提示：当前日期和时间

如果已知用户时区，系统提示将包含一个专用的
**当前日期和时间**部分，其中**仅包含时区**（无时钟/时间格式），
以保持提示缓存的稳定性：

```
Time zone: America/Chicago
```

当 Agent 需要当前时间时，请使用 `session_status` 工具；状态卡片
包含时间戳行。

## 系统事件行（默认为本地时间）

插入到 Agent 上下文中的排队系统事件会加上时间戳前缀，
使用与消息信封相同的时区选择（默认：主机本地）。

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

- `userTimezone` 设置提示上下文的**用户本地时区**。
- `timeFormat` 控制提示中的**12/24 小时制显示**。`auto` 遵循操作系统首选项。

## 时间格式检测（自动）

当 `timeFormat: "auto"`OpenClawmacOSWindows 时，OpenClaw 会检查操作系统首选项（macOS/Windows）
并回退到区域设置格式。检测到的值会**按进程缓存**，
以避免重复的系统调用。

## 工具负载 + 连接器（原始提供商时间 + 标准化字段）

频道工具返回 **提供商原生时间戳** 并添加规范化字段以确保一致性：

- `timestampMs`：纪元毫秒数 (UTC)
- `timestampUtc`：ISO 8601 UTC 字符串

保留原始提供商字段，以免丢失任何信息。

- Slack：来自 API 的类纪元字符串
- Discord：UTC ISO 时间戳
- Telegram/WhatsApp：提供商特定的数字/ISO 时间戳

如果您需要本地时间，请使用已知的时区在下游进行转换。

## 相关文档

- [系统提示](/zh/concepts/system-prompt)
- [时区](/zh/concepts/timezone)
- [消息](/zh/concepts/messages)
