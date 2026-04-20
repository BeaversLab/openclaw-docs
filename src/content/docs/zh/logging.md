---
summary: "日志概述：文件日志、控制台输出、CLI 尾随追踪以及 Control UI"
read_when:
  - You need a beginner-friendly overview of logging
  - You want to configure log levels or formats
  - You are troubleshooting and need to find logs quickly
title: "日志概述"
---

# 日志

OpenClaw 有两个主要的日志记录界面：

- **文件日志**（JSON 行），由 Gateway(网关) 网关 写入。
- **控制台输出** 显示在终端和 Gateway(网关) 调试 UI 中。

Control UI 的 **Logs** 选项卡会对网关文件日志进行尾随追踪。本页面解释了
日志的存储位置、读取方式，以及如何配置日志级别和格式。

## 日志位置

默认情况下，Gateway(网关) 网关 会在以下路径写入滚动日志文件：

`/tmp/openclaw/openclaw-YYYY-MM-DD.log`

日期使用网关主机的本地时区。

您可以在 `~/.openclaw/openclaw.json` 中覆盖此设置：

```json
{
  "logging": {
    "file": "/path/to/openclaw.log"
  }
}
```

## 如何读取日志

### CLI：实时追踪（推荐）

使用 CLI 通过 RPC 追踪网关日志文件：

```bash
openclaw logs --follow
```

有用的当前选项：

- `--local-time`：以您的本地时区渲染时间戳
- `--url <url>` / `--token <token>` / `--timeout <ms>`：标准的 Gateway(网关) RPC 标志
- `--expect-final`：基于代理的 RPC 最终响应等待标志（此处通过共享客户端层接受）

输出模式：

- **TTY 会话**：美观、彩色、结构化的日志行。
- **非 TTY 会话**：纯文本。
- `--json`：行分隔的 JSON（每行一个日志事件）。
- `--plain`：在 TTY 会话中强制使用纯文本。
- `--no-color`：禁用 ANSI 颜色。

当您传递显式的 `--url` 时，CLI 不会自动应用配置或
环境凭据；如果目标 Gateway(网关)
需要身份验证，请自行包含 `--token`。

在 JSON 模式下，CLI 发出带有 `type` 标签的对象：

- `meta`：流元数据（文件、游标、大小）
- `log`：已解析的日志条目
- `notice`：截断/轮换提示
- `raw`：未解析的日志行

如果本地回环 Gateway(网关) 请求配对，`openclaw logs` 将自动回退到
配置的本地日志文件。显式的 `--url` 目标
不使用此回退机制。

如果 Gateway(网关) 无法访问，CLI 会打印一个简短的提示以运行：

```bash
openclaw doctor
```

### Control UI (Web)

Control UI 的 **Logs** 选项卡使用 `logs.tail` 对同一文件进行尾随追踪。
请参阅 [/web/control-ui](/zh/web/control-ui) 了解如何打开它。

### 仅限频道的日志

要过滤渠道活动（WhatsApp/Telegram/等），请使用：

```bash
openclaw channels logs --channel whatsapp
```

## 日志格式

### 文件日志 (JSONL)

日志文件中的每一行都是一个 JSON 对象。CLI 和 Control UI 解析这些条目以渲染结构化输出（时间、级别、子系统、消息）。

### 控制台输出

控制台日志具有 **TTY 感知** 功能，并针对可读性进行了格式化：

- 子系统前缀（例如 `gateway/channels/whatsapp`）
- 级别颜色（info/warn/error）
- 可选的紧凑模式或 JSON 模式

控制台格式由 `logging.consoleStyle` 控制。

### Gateway(网关) WebSocket 日志

`openclaw gateway` 也有用于 RPC 流量的 WebSocket 协议日志记录：

- 普通模式：仅显示有趣的结果（错误、解析错误、慢调用）
- `--verbose`：所有请求/响应流量
- `--ws-log auto|compact|full`：选择详细渲染样式
- `--compact`：`--ws-log compact` 的别名

示例：

```bash
openclaw gateway
openclaw gateway --verbose --ws-log compact
openclaw gateway --verbose --ws-log full
```

## 配置日志记录

所有日志记录配置均位于 `~/.openclaw/openclaw.json` 中的 `logging` 下。

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

- `logging.level`：**文件日志** (JSONL) 级别。
- `logging.consoleLevel`：**控制台** 详细程度级别。

你可以通过 **`OPENCLAW_LOG_LEVEL`** 环境变量（例如 `OPENCLAW_LOG_LEVEL=debug`）覆盖两者。环境变量的优先级高于配置文件，因此你可以在不编辑 `openclaw.json` 的情况下为单次运行提高详细程度。你还可以传递全局 CLI 选项 **`--log-level <level>`**（例如，`openclaw --log-level debug gateway run`），这将覆盖该命令的环境变量。

`--verbose` 仅影响控制台输出和 WS 日志详细程度；它不会更改文件日志级别。

### 控制台样式

`logging.consoleStyle`：

- `pretty`：人性化、彩色、带时间戳。
- `compact`：更紧凑的输出（最适合长时段）。
- `json`：每行 JSON（用于日志处理器）。

### 编辑

工具摘要可以在敏感令牌到达控制台之前对其进行编辑：

- `logging.redactSensitive`: `off` | `tools` (默认: `tools`)
- `logging.redactPatterns`: 用于覆盖默认集合的正则表达式字符串列表

编辑仅影响**控制台输出**，不会改变文件日志。

## 诊断 + OpenTelemetry

诊断是结构化的、机器可读的事件，用于模型运行**和**
消息流遥测（webhook、排队、会话状态）。它们**不**
替代日志；它们的存在是为了提供指标、追踪和其他导出器的数据。

诊断事件在进程内发出，但只有当
诊断和导出器插件都启用时，导出器才会连接。

### OpenTelemetry vs OTLP

- **OpenTelemetry (OTel)**: 用于追踪、指标和日志的数据模型 + SDK。
- **OTLP**: 用于将 OTel 数据导出到收集器/后端的线路协议。
- OpenClaw 目前通过 **OTLP/HTTP (protobuf)** 导出。

### 导出的信号

- **指标 (Metrics)**: 计数器 + 直方图（token 使用量、消息流、排队）。
- **追踪**: 模型使用 + webhook/消息处理的跨度。
- **日志 (Logs)**: 当启用 `diagnostics.otel.logs` 时通过 OTLP 导出。日志
  量可能很大；请记住 `logging.level` 和导出器过滤器。

### 诊断事件目录

模型使用：

- `model.usage`: tokens、成本、持续时间、上下文、提供商/模型/渠道、会话 ID。

消息流：

- `webhook.received`: 每个渠道的 webhook 入站。
- `webhook.processed`: webhook 已处理 + 持续时间。
- `webhook.error`: webhook 处理程序错误。
- `message.queued`: 消息已排队等待处理。
- `message.processed`: 结果 + 持续时间 + 可选错误。

队列 + 会话：

- `queue.lane.enqueue`: 命令队列通道入队 + 深度。
- `queue.lane.dequeue`: 命令队列通道出队 + 等待时间。
- `session.state`: 会话状态转换 + 原因。
- `session.stuck`: 会话卡住警告 + 存在时间。
- `run.attempt`: 运行重试/尝试元数据。
- `diagnostic.heartbeat`: 聚合计数器。

### 启用诊断（无导出器）

如果您希望插件或自定义接收器能够获取诊断事件，请使用此选项：

```json
{
  "diagnostics": {
    "enabled": true
  }
}
```

### 诊断标志（定向日志）

使用标志开启额外的、定向的调试日志，而无需提高 `logging.level`。
标志不区分大小写，并支持通配符（例如 `telegram.*` 或 `*`）。

```json
{
  "diagnostics": {
    "flags": ["telegram.http"]
  }
}
```

环境变量覆盖（一次性）：

```
OPENCLAW_DIAGNOSTICS=telegram.http,telegram.payload
```

注意：

- 标志日志会进入标准日志文件（与 `logging.file` 相同）。
- 输出仍会根据 `logging.redactSensitive` 进行编辑（即隐藏敏感信息）。
- 完整指南：[/diagnostics/flags](/zh/diagnostics/flags)。

### 导出到 OpenTelemetry

可以通过 `diagnostics-otel` 插件 (OTLP/HTTP) 导出诊断数据。这
适用于任何接受 OTLP/HTTP 的 OpenTelemetry 收集器/后端。

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

注意：

- 您也可以使用 `openclaw plugins enable diagnostics-otel` 启用该插件。
- `protocol` 目前仅支持 `http/protobuf`。`grpc` 会被忽略。
- 指标包括 Token 使用量、成本、上下文大小、运行持续时间以及消息流
  计数器/直方图（webhooks、队列、会话状态、队列深度/等待时间）。
- 可以使用 `traces` / `metrics` 切换追踪/指标（默认：开启）。启用时，追踪
  包含模型使用跨度以及 webhook/消息处理跨度。
- 当您的收集器需要身份验证时，请设置 `headers`。
- 支持的环境变量：`OTEL_EXPORTER_OTLP_ENDPOINT`、
  `OTEL_SERVICE_NAME`、`OTEL_EXPORTER_OTLP_PROTOCOL`。

### 导出的指标（名称 + 类型）

模型使用情况：

- `openclaw.tokens` (counter, attrs: `openclaw.token`, `openclaw.channel`,
  `openclaw.provider`, `openclaw.model`)
- `openclaw.cost.usd` (counter, attrs: `openclaw.channel`, `openclaw.provider`,
  `openclaw.model`)
- `openclaw.run.duration_ms` (histogram, attrs: `openclaw.channel`,
  `openclaw.provider`, `openclaw.model`)
- `openclaw.context.tokens` (histogram, attrs: `openclaw.context`,
  `openclaw.channel`, `openclaw.provider`, `openclaw.model`)

消息流：

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

队列 + 会话：

- `openclaw.queue.lane.enqueue` (counter, attrs: `openclaw.lane`)
- `openclaw.queue.lane.dequeue` (counter, attrs: `openclaw.lane`)
- `openclaw.queue.depth` (histogram, attrs: `openclaw.lane` 或
  `openclaw.channel=heartbeat`)
- `openclaw.queue.wait_ms` (histogram, attrs: `openclaw.lane`)
- `openclaw.session.state` (counter, attrs: `openclaw.state`, `openclaw.reason`)
- `openclaw.session.stuck` (counter, attrs: `openclaw.state`)
- `openclaw.session.stuck_age_ms` (histogram, attrs: `openclaw.state`)
- `openclaw.run.attempt` (counter, attrs: `openclaw.attempt`)

### 导出的 spans（名称 + 关键属性）

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

- Trace sampling: `diagnostics.otel.sampleRate` (0.0–1.0, root spans only).
- Metric export interval: `diagnostics.otel.flushIntervalMs` (min 1000ms).

### 协议说明

- OTLP/HTTP endpoints can be set via `diagnostics.otel.endpoint` or
  `OTEL_EXPORTER_OTLP_ENDPOINT`.
- If the endpoint already contains `/v1/traces` or `/v1/metrics`, it is used as-is.
- If the endpoint already contains `/v1/logs`, it is used as-is for logs.
- `diagnostics.otel.logs` enables OTLP log export for the main logger output.

### 日志导出行为

- OTLP logs use the same structured records written to `logging.file`.
- Respect `logging.level` (file log level). Console redaction does **not** apply
  to OTLP logs.
- High-volume installs should prefer OTLP collector sampling/filtering.

## 故障排除提示

- **Gateway(网关) not reachable?** Run `openclaw doctor` first.
- **Logs empty?** Check that the Gateway(网关) is running and writing to the file path
  in `logging.file`.
- **Need more detail?** Set `logging.level` to `debug` or `trace` and retry.

## 相关内容

- [Gateway(网关) Logging Internals](/zh/gateway/logging) — WS log styles, subsystem prefixes, and console capture
- [诊断](/zh/gateway/configuration-reference#diagnostics) — OpenTelemetry 导出和缓存跟踪配置
