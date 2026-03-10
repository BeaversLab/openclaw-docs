---
summary: "日志"
read_when:
  - "You need a beginner-friendly overview of logging"
  - "You want to configure log levels or formats"
  - "You are troubleshooting and need to find logs quickly"
title: "日志概述:文件日志、控制台输出、CLI 跟踪和控制 UI"
---

# 日志

OpenClaw 在两个地方记录日志:

- **文件日志**(JSON 行)由 Gateway 写入。
- **控制台输出**显示在终端和控制 UI 中。

本页面解释日志存储位置、如何读取它们,以及如何配置日志级别和格式。

## 日志存储位置

默认情况下,Gateway 在以下位置写入滚动日志文件:

`/tmp/openclaw/openclaw-YYYY-MM-DD.log`

日期使用 gateway 主机的本地时区。

您可以在 `~/.openclaw/openclaw.json` 中覆盖此设置:

```json
{
  "logging": {
    "file": "/path/to/openclaw.log"
  }
}
```

## 如何读取日志

### CLI: live tail (recommended)

使用 CLI 通过 RPC 跟踪 gateway 日志文件:

```bash
openclaw logs --follow
```

输出模式:

- **TTY 会话**: 美化、彩色、结构化的日志行。
- **非 TTY 会话**: 纯文本。
- `--json`: 行分隔的 JSON(每行一个日志事件)。
- `--plain`: 在 TTY 会话中强制使用纯文本。
- `--no-color`: 禁用 ANSI 颜色。

在 JSON 模式下,CLI 发出带有 `type` 标记的对象:

- `meta`: 流元数据(文件、光标、大小)
- `log`: 解析的日志条目
- `notice`: 截断/轮换提示
- `raw`: 未解析的日志行

如果 Gateway 无法访问,CLI 会打印一个简短的提示来运行:

```bash
openclaw doctor
```

### 控制 UI (Web)

控制 UI 的 **日志** 选项卡使用 `logs.tail` 跟踪同一个文件。
有关如何打开它,请参阅 [/web/control-ui](/zh/web/control-ui)。

### 仅频道日志

要过滤频道活动(WhatsApp/Telegram/等),请使用:

```bash
openclaw channels logs --channel whatsapp
```

## 日志格式

### 文件日志 (JSONL)

日志文件中的每一行都是一个 JSON 对象。CLI 和控制 UI 解析这些条目以渲染结构化输出(时间、级别、子系统、消息)。

### 控制台输出

控制台日志是 **TTY 感知的**,并格式化以提高可读性:

- 子系统前缀(例如 `gateway/channels/whatsapp`)
- 级别着色(info/warn/error)
- 可选的紧凑或 JSON 模式

控制台格式由 `logging.consoleStyle` 控制。

## 配置日志

所有日志配置都在 `~/.openclaw/openclaw.json` 的 `logging` 下。

```json
{
  "logging": {
    "level": "info",
    "file": "/tmp/openclaw/openclaw-YYYY-MM-DD.log",
    "consoleLevel": "info",
    "consoleStyle": "pretty",
    "redactSensitive": "tools",
    "redactPatterns": ["sk-.*"]
  }
}
```

### 日志级别

- `logging.level`: **文件日志**(JSONL)级别。
- `logging.consoleLevel`: **控制台**详细级别。

`--verbose` 仅影响控制台输出;它不会改变文件日志级别。

### 控制台样式

`logging.consoleStyle`:

- `pretty`: 人类友好、彩色、带时间戳。
- `compact`: 更紧凑的输出(适用于长时间会话)。
- `json`: 每行 JSON(用于日志处理器)。

### 编辑

工具摘要可以在到达控制台之前编辑敏感令牌:

- `logging.redactSensitive`: `off` | `tools` (默认: `tools`)
- `logging.redactPatterns`: 用于覆盖默认集的正则表达式字符串列表

编辑仅影响 **控制台输出**,不会改变文件日志。

## 诊断 + OpenTelemetry

诊断是用于模型运行 **和** 消息流遥测(webhook、队列、会话状态)的结构化、机器可读的事件。它们 **不** 替换日志;它们的存在是为指标、跟踪和其他导出器提供数据。

诊断事件在进程内发出,但只有在启用诊断和导出器插件时,导出器才会附加。

### OpenTelemetry 与 OTLP

- **OpenTelemetry (OTel)**: 用于跟踪、指标和日志的数据模型 + SDK。
- **OTLP**: 用于将 OTel 数据导出到收集器/后端的有线协议。
- OpenClaw 目前通过 **OTLP/HTTP (protobuf)** 导出。

### 导出的信号

- **指标**: 计数器 + 直方图(令牌使用、消息流、队列)。
- **跟踪**: 用于模型使用 + webhook/消息处理的跨度。
- **日志**: 当启用 `diagnostics.otel.logs` 时通过 OTLP 导出。日志量可能很高;请记住 `logging.level` 和导出器过滤器。

### Diagnostic event catalog

Model usage:

- `model.usage`: tokens, cost, duration, context, provider/model/channel, session ids.

消息流:

- `webhook.received`: webhook ingress per channel.
- `webhook.processed`: webhook handled + duration.
- `webhook.error`: webhook handler errors.
- `message.queued`: message enqueued for processing.
- `message.processed`: outcome + duration + optional error.

Queue + session:

- `queue.lane.enqueue`: command queue lane enqueue + depth.
- `queue.lane.dequeue`: command queue lane dequeue + wait time.
- `session.state`: session state transition + reason.
- `session.stuck`: session stuck warning + age.
- `run.attempt`: run retry/attempt metadata.
- `diagnostic.heartbeat`: aggregate counters (webhooks/queue/session).

### Enable diagnostics (no exporter)

Use this if you want diagnostics events available to plugins or custom sinks:

```json
{
  "diagnostics": {
    "enabled": true
  }
}
```

### Diagnostics flags (targeted logs)

Use flags to turn on extra, targeted debug logs without raising `logging.level`.
Flags are case-insensitive and support wildcards (e.g. `telegram.*` or `*`).

```json
{
  "diagnostics": {
    "flags": ["telegram.http"]
  }
}
```

Env override (one-off):

```
OPENCLAW_DIAGNOSTICS=telegram.http,telegram.payload
```

Notes:

- Flag logs go to the standard log file (same as `logging.file`).
- Output is still redacted according to `logging.redactSensitive`.
- Full guide: [/diagnostics/flags](/zh/diagnostics/flags).

### Export to OpenTelemetry

Diagnostics can be exported via the `diagnostics-otel` plugin (OTLP/HTTP). This
works with any OpenTelemetry collector/backend that accepts OTLP/HTTP.

```json
{
  "plugins": {
    "allow": ["diagnostics-otel"],
    "entries": {
      "diagnostics-otel": {
        "enabled": true
      }
    }
  },
  "diagnostics": {
    "enabled": true,
    "otel": {
      "enabled": true,
      "endpoint": "http://otel-collector:4318",
      "protocol": "http/protobuf",
      "serviceName": "openclaw-gateway",
      "traces": true,
      "metrics": true,
      "logs": true,
      "sampleRate": 0.2,
      "flushIntervalMs": 60000
    }
  }
}
```

Notes:

- You can also enable the plugin with `openclaw plugins enable diagnostics-otel`.
- `protocol` currently supports `http/protobuf` only. `grpc` is ignored.
- Metrics include token usage, cost, context size, run duration, and message-flow
  counters/histograms (webhooks, queueing, session state, queue depth/wait).
- Traces/metrics can be toggled with `traces` / `metrics` (default: on). Traces
  include model usage spans plus webhook/message processing spans when enabled.
- Set `headers` when your collector requires auth.
- Environment variables supported: `OTEL_EXPORTER_OTLP_ENDPOINT`,
  `OTEL_SERVICE_NAME`, `OTEL_EXPORTER_OTLP_PROTOCOL`.

### Exported metrics (names + types)

Model usage:

- `openclaw.tokens` (counter, attrs: `openclaw.token`, `openclaw.channel`,
  `openclaw.provider`, `openclaw.model`)
- `openclaw.cost.usd` (counter, attrs: `openclaw.channel`, `openclaw.provider`,
  `openclaw.model`)
- `openclaw.run.duration_ms` (histogram, attrs: `openclaw.channel`,
  `openclaw.provider`, `openclaw.model`)
- `openclaw.context.tokens` (histogram, attrs: `openclaw.context`,
  `openclaw.channel`, `openclaw.provider`, `openclaw.model`)

消息流:

- `openclaw.webhook.received` (counter, attrs: `openclaw.channel`,
  `openclaw.webhook`)
- `openclaw.webhook.error` (counter, attrs: `openclaw.channel`,
  `openclaw.webhook`)
- `openclaw.webhook.duration_ms` (histogram, attrs: `openclaw.channel`,
  `openclaw.webhook`)
- `openclaw.message.queued` (counter, attrs: `openclaw.channel`,
  `openclaw.source`)
- `openclaw.message.processed` (counter, attrs: `openclaw.channel`,
  `openclaw.outcome`)
- `openclaw.message.duration_ms` (histogram, attrs: `openclaw.channel`,
  `openclaw.outcome`)

队列 + 会话:

- `openclaw.queue.lane.enqueue` (counter, attrs: `openclaw.lane`)
- `openclaw.queue.lane.dequeue` (counter, attrs: `openclaw.lane`)
- `openclaw.queue.depth` (histogram, attrs: `openclaw.lane` or
  `openclaw.channel=heartbeat`)
- `openclaw.queue.wait_ms` (histogram, attrs: `openclaw.lane`)
- `openclaw.session.state` (counter, attrs: `openclaw.state`, `openclaw.reason`)
- `openclaw.session.stuck` (counter, attrs: `openclaw.state`)
- `openclaw.session.stuck_age_ms` (histogram, attrs: `openclaw.state`)
- `openclaw.run.attempt` (counter, attrs: `openclaw.attempt`)

### 导出的跨度(名称 + 关键属性)

- `openclaw.model.usage`
  - `openclaw.channel`, `openclaw.provider`, `openclaw.model`
  - `openclaw.sessionKey`, `openclaw.sessionId`
  - `openclaw.tokens.*` (input/output/cache_read/cache_write/total)
- `openclaw.webhook.processed`
  - `openclaw.channel`, `openclaw.webhook`, `openclaw.chatId`
- `openclaw.webhook.error`
  - `openclaw.channel`, `openclaw.webhook`, `openclaw.chatId`,
    `openclaw.error`
- `openclaw.message.processed`
  - `openclaw.channel`, `openclaw.outcome`, `openclaw.chatId`,
    `openclaw.messageId`, `openclaw.sessionKey`, `openclaw.sessionId`,
    `openclaw.reason`
- `openclaw.session.stuck`
  - `openclaw.state`, `openclaw.ageMs`, `openclaw.queueDepth`,
    `openclaw.sessionKey`, `openclaw.sessionId`

### 采样 + 刷新

- 跟踪采样: `diagnostics.otel.sampleRate` (0.0–1.0, 仅根跨度)。
- 指标导出间隔: `diagnostics.otel.flushIntervalMs` (最小 1000ms)。

### 协议说明

- OTLP/HTTP 端点可以通过 `diagnostics.otel.endpoint` 或 `OTEL_EXPORTER_OTLP_ENDPOINT` 设置。
- 如果端点已包含 `/v1/traces` 或 `/v1/metrics`,则按原样使用。
- 如果端点已包含 `/v1/logs`,则按原样用于日志。
- `diagnostics.otel.logs` 为主记录器输出启用 OTLP 日志导出。

### 日志导出行为

- OTLP 日志使用写入 `logging.file` 的相同结构化记录。
- 遵循 `logging.level`(文件日志级别)。控制台编辑 **不** 适用于 OTLP 日志。
- 高容量安装应优先使用 OTLP 收集器采样/过滤。

## 故障排除提示

- **Gateway 无法访问?** 首先运行 `openclaw doctor`。
- **日志为空?** 检查 Gateway 是否正在运行并写入 `logging.file` 中的文件路径。
- **需要更多详细信息?** 将 `logging.level` 设置为 `debug` 或 `trace` 并重试。
