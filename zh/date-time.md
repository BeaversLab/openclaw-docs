---
summary: "信封、提示、工具与连接器中的日期与时间处理"
read_when:
  - 修改时间戳如何展示给模型或用户
  - 排查消息或 system prompt 的时间格式
title: "日期与时间"
---

# Date & Time

OpenClaw 默认对**传输时间戳使用主机本地时间**，而**用户时区仅在 system prompt 中**使用。
Provider 时间戳会被保留，工具保持原始语义（当前时间可通过 `session_status` 获得）。

## 消息信封（默认本地）

入站消息会被包裹时间戳（精度到分钟）：

```
[Provider ... 2026-01-05 16:26 PST] message text
```

该信封时间戳**默认使用主机本地时间**，不管 provider 的时区。

你可以覆盖该行为：

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
- `envelopeTimezone: "user"` 使用 `agents.defaults.userTimezone`（未设置则回退主机时区）。
- 使用显式 IANA 时区（例如 `"America/Chicago"`）可固定时区。
- `envelopeTimestamp: "off"` 移除信封头的绝对时间戳。
- `envelopeElapsed: "off"` 移除耗时后缀（`+2m` 风格）。

### 示例

**本地（默认）：**

```
[WhatsApp +1555 2026-01-18 00:19 PST] hello
```

**用户时区：**

```
[WhatsApp +1555 2026-01-18 00:19 CST] hello
```

**启用耗时：**

```
[WhatsApp +1555 +30s 2026-01-18T05:19Z] follow-up
```

## System prompt：Current Date & Time

若已知用户时区，system prompt 会包含专门的
**Current Date & Time** 分节，仅包含**时区**（不含时钟/时间格式），以保持 prompt 缓存稳定：

```
Time zone: America/Chicago
```

当 agent 需要当前时间时，使用 `session_status` 工具；状态卡包含时间戳行。

## System event 行（默认本地）

插入到 agent context 的排队系统事件，会使用与消息信封相同的时区选择（默认主机本地）前缀时间戳。

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

- `userTimezone` 设置**用户本地时区**用于 prompt 上下文。
- `timeFormat` 控制 prompt 中的 **12h/24h** 显示。`auto` 跟随系统偏好。

## 时间格式检测（auto）

当 `timeFormat: "auto"` 时，OpenClaw 会读取 OS 偏好（macOS/Windows），并回退到 locale 格式。检测值**按进程缓存**，避免重复系统调用。

## 工具载荷 + 连接器（原始 provider 时间 + 归一化字段）

渠道工具返回**provider 原生时间戳**，并添加归一化字段以保持一致：

- `timestampMs`：epoch 毫秒（UTC）
- `timestampUtc`：ISO 8601 UTC 字符串

原始 provider 字段会保留，避免信息丢失。

- Slack：API 返回的类 epoch 字符串
- Discord：UTC ISO 时间戳
- Telegram/WhatsApp：provider 特定的数字/ISO 时间戳

如需本地时间，请基于已知时区在下游转换。

## 相关文档

- [System Prompt](/zh/concepts/system-prompt)
- [Timezones](/zh/concepts/timezone)
- [Messages](/zh/concepts/messages)
