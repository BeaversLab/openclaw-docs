---
summary: "日志概述：文件日志、控制台输出、CLI 尾部跟踪以及控制 UI"
read_when:
  - 您需要一个适合初学者的日志概述
  - 您想要配置日志级别或格式
  - 您正在进行故障排除并需要快速查找日志
title: "Logging"
---

# Logging

OpenClaw 在两个位置记录日志：

- **File logs** (JSON 行) 由 Gateway(网关) 写入。
- **Console output** 显示在终端和控制 UI 中。

本页面解释了日志存放的位置、如何读取它们，以及如何配置日志
级别和格式。

## 日志存放位置

默认情况下，Gateway(网关) 会将滚动日志文件写入以下位置：

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

### CLI：实时尾部跟踪（推荐）

使用 CLI 通过 RPC 尾部跟踪网关日志文件：

```bash
openclaw logs --follow
```

输出模式：

- **TTY 会话**：美观、彩色、结构化的日志行。
- **非 TTY 会话**：纯文本。
- `--json`：行分隔的 JSON（每行一个日志事件）。
- `--plain`：在 TTY 会话中强制使用纯文本。
- `--no-color`：禁用 ANSI 颜色。

在 JSON 模式下，CLI 会发出带有 `type` 标记的对象：

- `meta`：流元数据（文件、光标、大小）
- `log`：已解析的日志条目
- `notice`：截断/轮换提示
- `raw`：未解析的日志行

如果 Gateway(网关) 无法访问，CLI 会打印一个简短的提示以运行：

```bash
openclaw doctor
```

### 控制 UI (web)

控制 UI 的 **Logs** 选项卡使用 `logs.tail` 尾部跟踪同一个文件。
有关如何打开它的信息，请参阅 [/web/control-ui](/zh/web/control-ui)。

### 渠道专用日志

要过滤渠道活动（WhatsApp/Telegram/等），请使用：

```bash
openclaw channels logs --channel whatsapp
```

## 日志格式

### 文件日志 (JSONL)

日志文件中的每一行都是一个 JSON 对象。CLI 和控制 UI 解析这些
条目以渲染结构化输出（时间、级别、子系统、消息）。

### 控制台输出

控制台日志是 **TTY 感知** 的，并针对可读性进行了格式化：

- 子系统前缀（例如 `gateway/channels/whatsapp`）
- 级别着色（信息/警告/错误）
- 可选的紧凑或 JSON 模式

控制台格式由 `logging.consoleStyle` 控制。

## 配置日志记录

所有日志配置都位于 `~/.openclaw/openclaw.json` 中的 `logging` 下。

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

您可以通过 **`OPENCLAW_LOG_LEVEL`** 环境变量（例如 `OPENCLAW_LOG_LEVEL=debug`）覆盖这两项。环境变量优先于配置文件，因此您可以在不编辑 `openclaw.json` 的情况下为单次运行提高详细程度。您还可以传递全局 CLI 选项 **`--log-level <level>`**（例如 `openclaw --log-level debug gateway run`），这将覆盖该命令的环境变量。

`--verbose` 仅影响控制台输出；它不会更改文件日志级别。

### 控制台样式

`logging.consoleStyle`：

- `pretty`：人性化的、带颜色的、带时间戳的。
- `compact`：更紧凑的输出（适用于长会话）。
- `json`：每行 JSON（适用于日志处理器）。

### 编辑

工具摘要可以在敏感令牌到达控制台之前对其进行编辑：

- `logging.redactSensitive`： `off` | `tools`（默认： `tools`）
- `logging.redactPatterns`：用于覆盖默认集的正则表达式字符串列表

编辑仅影响**控制台输出**，不会更改文件日志。

## 诊断 + OpenTelemetry

诊断是针对模型运行**以及**消息流遥测（webhooks、队列、会话状态）的结构化、机器可读事件。它们**不**替代日志；它们的存在是为了为指标、跟踪和其他导出器提供数据。

诊断事件是在进程内发出的，但只有当诊断 + 导出器插件被启用时，导出器才会附加。

### OpenTelemetry 与 OTLP

- **OpenTelemetry (OTel)**：用于跟踪、指标和日志的数据模型 + SDK。
- **OTLP**：用于将 OTel 数据导出到收集器/后端的线路协议。
- OpenClaw 目前通过 **OTLP/HTTP (protobuf)** 导出。

### 导出的信号

- **指标**：计数器 + 直方图（令牌使用情况、消息流、队列）。
- **跟踪**：用于模型使用 + webhook/消息处理的跨度。
- **日志**：当启用 `diagnostics.otel.logs` 时，通过 OTLP 导出。日志量可能很大；请注意 `logging.level` 和导出器过滤器。

### 诊断事件目录

模型使用情况：

- `model.usage`：tokens、成本、持续时间、上下文、提供商/模型/渠道、会话 ID。

消息流：

- `webhook.received`：每个渠道的 webhook 入站。
- `webhook.processed`：已处理的 webhook + 持续时间。
- `webhook.error`：webhook 处理程序错误。
- `message.queued`：消息已排队等待处理。
- `message.processed`：结果 + 持续时间 + 可选错误。

队列 + 会话：

- `queue.lane.enqueue`：命令队列通道入队 + 深度。
- `queue.lane.dequeue`：命令队列通道出队 + 等待时间。
- `session.state`：会话状态转换 + 原因。
- `session.stuck`：会话卡顿警告 + 存在时间。
- `run.attempt`：运行重试/尝试元数据。
- `diagnostic.heartbeat`：聚合计数器（webhooks/queue/会话）。

### 启用诊断（无导出器）

如果您希望插件或自定义接收器可以使用诊断事件，请使用此选项：

```json
{
  "diagnostics": {
    "enabled": true
  }
}
```

### 诊断标志（定向日志）

使用标志可以开启额外的、定向的调试日志，而无需提高 `logging.level`。标志不区分大小写，并支持通配符（例如 `telegram.*` 或 `*`）。

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

注意事项：

- 标志日志进入标准日志文件（与 `logging.file` 相同）。
- 输出仍会根据 `logging.redactSensitive` 进行编辑。
- 完整指南：[/diagnostics/flags](/zh/diagnostics/flags)。

### 导出到 OpenTelemetry

诊断可以通过 `diagnostics-otel` 插件（OTLP/HTTP）导出。这适用于任何接受 OTLP/HTTP 的 OpenTelemetry 收集器/后端。

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

注意事项：

- 您也可以使用 `openclaw plugins enable diagnostics-otel` 启用该插件。
- `protocol` 目前仅支持 `http/protobuf`。`grpc` 会被忽略。
- 指标包括令牌使用量、成本、上下文大小、运行持续时间以及消息流计数器/直方图（webhooks、排队、会话状态、队列深度/等待）。
- 可以使用 `traces` / `metrics` 切换跟踪/指标（默认：开启）。启用后，跟踪包括模型使用范围以及 webhook/消息处理范围。
- 当您的收集器需要身份验证时，请设置 `headers`。
- 支持的环境变量：`OTEL_EXPORTER_OTLP_ENDPOINT`、`OTEL_SERVICE_NAME`、`OTEL_EXPORTER_OTLP_PROTOCOL`。

### 导出的指标（名称 + 类型）

模型使用情况：

- `openclaw.tokens`（计数器，属性：`openclaw.token`、`openclaw.channel`、`openclaw.provider`、`openclaw.model`）
- `openclaw.cost.usd`（计数器，属性：`openclaw.channel`、`openclaw.provider`、`openclaw.model`）
- `openclaw.run.duration_ms`（直方图，属性：`openclaw.channel`、`openclaw.provider`、`openclaw.model`）
- `openclaw.context.tokens`（直方图，属性：`openclaw.context`、`openclaw.channel`、`openclaw.provider`、`openclaw.model`）

消息流：

- `openclaw.webhook.received`（计数器，属性：`openclaw.channel`、`openclaw.webhook`）
- `openclaw.webhook.error`（计数器，属性：`openclaw.channel`、`openclaw.webhook`）
- `openclaw.webhook.duration_ms`（直方图，属性：`openclaw.channel`、`openclaw.webhook`）
- `openclaw.message.queued`（计数器，属性：`openclaw.channel`、`openclaw.source`）
- `openclaw.message.processed`（计数器，属性：`openclaw.channel`、`openclaw.outcome`）
- `openclaw.message.duration_ms`（直方图，属性：`openclaw.channel`、`openclaw.outcome`）

队列 + 会话：

- `openclaw.queue.lane.enqueue`（计数器，属性：`openclaw.lane`）
- `openclaw.queue.lane.dequeue`（计数器，属性：`openclaw.lane`）
- `openclaw.queue.depth`（直方图，属性：`openclaw.lane` 或
  `openclaw.channel=heartbeat`）
- `openclaw.queue.wait_ms`（直方图，属性：`openclaw.lane`）
- `openclaw.session.state`（计数器，属性：`openclaw.state`，`openclaw.reason`）
- `openclaw.session.stuck`（计数器，属性：`openclaw.state`）
- `openclaw.session.stuck_age_ms`（直方图，属性：`openclaw.state`）
- `openclaw.run.attempt`（计数器，属性：`openclaw.attempt`）

### 导出的 Span（名称 + 关键属性）

- `openclaw.model.usage`
  - `openclaw.channel`、`openclaw.provider`、`openclaw.model`
  - `openclaw.sessionKey`、`openclaw.sessionId`
  - `openclaw.tokens.*`（input/output/cache_read/cache_write/total）
- `openclaw.webhook.processed`
  - `openclaw.channel`、`openclaw.webhook`、`openclaw.chatId`
- `openclaw.webhook.error`
  - `openclaw.channel`、`openclaw.webhook`、`openclaw.chatId`、
    `openclaw.error`
- `openclaw.message.processed`
  - `openclaw.channel`、`openclaw.outcome`、`openclaw.chatId`、
    `openclaw.messageId`、`openclaw.sessionKey`、`openclaw.sessionId`、
    `openclaw.reason`
- `openclaw.session.stuck`
  - `openclaw.state`、`openclaw.ageMs`、`openclaw.queueDepth`、
    `openclaw.sessionKey`、`openclaw.sessionId`

### 采样 + 刷新

- 链路追踪采样：`diagnostics.otel.sampleRate`（0.0–1.0，仅限根 Span）。
- 指标导出间隔：`diagnostics.otel.flushIntervalMs`（最小 1000ms）。

### 协议说明

- 可以通过 `diagnostics.otel.endpoint` 或
  `OTEL_EXPORTER_OTLP_ENDPOINT` 设置 OTLP/HTTP 端点。
- 如果端点已包含 `/v1/traces` 或 `/v1/metrics`，则按原样使用。
- 如果端点已包含 `/v1/logs`，则日志将按原样使用它。
- `diagnostics.otel.logs` 启用主日志记录器输出的 OTLP 日志导出。

### 日志导出行为

- OTLP 日志使用写入 `logging.file` 的相同结构化记录。
- 遵循 `logging.level`（文件日志级别）。控制台编辑**不**适用于 OTLP 日志。
- 高吞吐量的安装应首选 OTLP 收集器采样/过滤。

## 故障排除提示

- **无法连接 Gateway(网关)？** 首先运行 `openclaw doctor`。
- **日志为空？** 检查 Gateway(网关) 是否正在运行以及是否正在写入 `logging.file` 中的文件路径。
- **需要更多详细信息？** 将 `logging.level` 设置为 `debug` 或 `trace` 并重试。

import en from "/components/footer/en.mdx";

<en />
