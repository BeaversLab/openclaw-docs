> [!NOTE]
> 本页正在翻译中。

---
summary: "日志概览：文件日志、控制台输出、CLI 跟随与 Control UI"
read_when:
  - 你需要面向新手的日志概览
  - 你想配置日志级别或格式
  - 你在排障且需要快速定位日志
---

# Logging

OpenClaw 会在两处写日志：

- **文件日志**（JSON lines），由 Gateway 写入。
- **控制台输出**，显示在终端和 Control UI。

本页说明日志位置、如何阅读以及如何配置日志级别与格式。

## 日志位置

默认情况下，Gateway 会写入一个滚动日志文件：

`/tmp/openclaw/openclaw-YYYY-MM-DD.log`

日期使用 gateway 主机的本地时区。

你可以在 `~/.openclaw/openclaw.json` 中覆盖：

```json
{
  "logging": {
    "file": "/path/to/openclaw.log"
  }
}
```

## 如何阅读日志

### CLI：实时跟随（推荐）

用 CLI 通过 RPC 跟随 gateway 日志：

```bash
openclaw logs --follow
```

输出模式：

- **TTY 会话**：美观、彩色、结构化日志。
- **非 TTY 会话**：纯文本。
- `--json`：逐行 JSON（每行一个日志事件）。
- `--plain`：在 TTY 会话中强制纯文本。
- `--no-color`：禁用 ANSI 颜色。

在 JSON 模式下，CLI 输出带 `type` 标签的对象：

- `meta`：流元数据（文件、游标、大小）
- `log`：解析后的日志条目
- `notice`：截断/轮转提示
- `raw`：未解析的日志行

如果 Gateway 不可达，CLI 会提示运行：

```bash
openclaw doctor
```

### Control UI（Web）

Control UI 的 **Logs** 标签页会通过 `logs.tail` 跟随同一文件。
如何打开见 [/web/control-ui](/zh/web/control-ui)。

### 仅频道日志

若只想过滤频道活动（WhatsApp/Telegram 等），使用：

```bash
openclaw channels logs --channel whatsapp
```

## 日志格式

### 文件日志（JSONL）

日志文件的每一行都是 JSON 对象。CLI 和 Control UI 会解析这些条目并渲染结构化输出（时间、级别、子系统、消息）。

### 控制台输出

控制台日志**感知 TTY**，以可读性为主：

- 子系统前缀（例如 `gateway/channels/whatsapp`）
- 级别着色（info/warn/error）
- 可选 compact 或 JSON 模式

控制台格式由 `logging.consoleStyle` 控制。

## 配置日志

所有日志配置都在 `~/.openclaw/openclaw.json` 的 `logging` 下：

```json
{
  "logging": {
    "level": "info",
    "file": "/tmp/openclaw/openclaw-YYYY-MM-DD.log",
    "consoleLevel": "info",
    "consoleStyle": "pretty",
    "redactSensitive": "tools",
    "redactPatterns": [
      "sk-.*"
    ]
  }
}
```

### 日志级别

- `logging.level`：**文件日志**（JSONL）级别。
- `logging.consoleLevel`：**控制台**详细度。

`--verbose` 只影响控制台输出，不改变文件日志级别。

### 控制台样式

`logging.consoleStyle`：

- `pretty`：对人友好、有颜色、带时间戳。
- `compact`：更紧凑（适合长会话）。
- `json`：每行一个 JSON（便于日志处理器）。

### 脱敏

工具摘要在写入控制台前可对敏感 token 做脱敏：

- `logging.redactSensitive`：`off` | `tools`（默认：`tools`）
- `logging.redactPatterns`：正则字符串列表，可覆盖默认集合

脱敏**只影响控制台输出**，不会修改文件日志。

## Diagnostics + OpenTelemetry

Diagnostics 是结构化、机器可读的事件，用于模型运行**以及**消息流遥测（webhooks、排队、会话状态）。它们**不是**日志的替代品；而是用于指标、链路追踪等导出。

Diagnostics 事件在进程内发出，但只有在启用 diagnostics + exporter 插件时才会对外导出。

### OpenTelemetry vs OTLP

- **OpenTelemetry (OTel)**：trace、metrics、logs 的数据模型 + SDK。
- **OTLP**：将 OTel 数据导出到采集器/后端的线协议。
- OpenClaw 当前通过 **OTLP/HTTP（protobuf）** 导出。

### 导出信号

- **Metrics**：计数器 + 直方图（token 使用、消息流、队列等）。
- **Traces**：模型使用 + webhook/消息处理的 spans。
- **Logs**：当 `diagnostics.otel.logs` 启用时通过 OTLP 导出。日志量可能很大；注意 `logging.level` 与导出过滤。

### Diagnostics 事件目录

模型使用：
- `model.usage`：tokens、cost、duration、context、provider/model/channel、session ids。

消息流：
- `webhook.received`：每频道 webhook 入口。
- `webhook.processed`：webhook 处理 + 耗时。
- `webhook.error`：webhook 处理错误。
- `message.queued`：消息入队。
- `message.processed`：结果 + 耗时 + 可选错误。

队列 + 会话：
- `queue.lane.enqueue`：命令队列 lane 入队 + 深度。
- `queue.lane.dequeue`：命令队列 lane 出队 + 等待时间。
- `session.state`：会话状态变更 + 原因。
- `session.stuck`：会话卡住告警 + 时长。
- `run.attempt`：重试/尝试元数据。
- `diagnostic.heartbeat`：聚合计数器（webhooks/queue/session）。

### 启用 diagnostics（无 exporter）

如果你只需要诊断事件供插件或自定义 sink 使用：

```json
{
  "diagnostics": {
    "enabled": true
  }
}
```

### Diagnostics flags（定向日志）

使用 flags 在不提高 `logging.level` 的情况下打开定向调试日志。
Flags 不区分大小写，支持通配符（如 `telegram.*` 或 `*`）。

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
- flag 日志会写入标准日志文件（同 `logging.file`）。
- 输出仍会按 `logging.redactSensitive` 脱敏。
- 完整指南：[/diagnostics/flags](/zh/diagnostics/flags)。

### 导出到 OpenTelemetry

Diagnostics 可通过 `diagnostics-otel` 插件（OTLP/HTTP）导出。适用于任何接收 OTLP/HTTP 的 OpenTelemetry collector/backend。

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
- 也可以用 `openclaw plugins enable diagnostics-otel` 启用插件。
- `protocol` 目前只支持 `http/protobuf`，`grpc` 会被忽略。
- Metrics 包括 token 使用、成本、context size、运行时长、消息流计数/直方图（webhooks、queueing、session state、queue depth/wait）。
- Traces/metrics 可通过 `traces` / `metrics` 开关（默认开启）。Traces 包含模型使用 spans，以及启用时的 webhook/消息处理 spans。
- 当 collector 需要 auth 时设置 `headers`。
- 支持的环境变量：`OTEL_EXPORTER_OTLP_ENDPOINT`、
  `OTEL_SERVICE_NAME`、`OTEL_EXPORTER_OTLP_PROTOCOL`。

### 导出指标（名称 + 类型）

模型使用：
- `openclaw.tokens`（counter，attrs：`openclaw.token`、`openclaw.channel`、
  `openclaw.provider`、`openclaw.model`）
- `openclaw.cost.usd`（counter，attrs：`openclaw.channel`、`openclaw.provider`、
  `openclaw.model`）
- `openclaw.run.duration_ms`（histogram，attrs：`openclaw.channel`、
  `openclaw.provider`、`openclaw.model`）
- `openclaw.context.tokens`（histogram，attrs：`openclaw.context`、
  `openclaw.channel`、`openclaw.provider`、`openclaw.model`）

消息流：
- `openclaw.webhook.received`（counter，attrs：`openclaw.channel`、
  `openclaw.webhook`）
- `openclaw.webhook.error`（counter，attrs：`openclaw.channel`、
  `openclaw.webhook`）
- `openclaw.webhook.duration_ms`（histogram，attrs：`openclaw.channel`、
  `openclaw.webhook`）
- `openclaw.message.queued`（counter，attrs：`openclaw.channel`、
  `openclaw.source`）
- `openclaw.message.processed`（counter，attrs：`openclaw.channel`、
  `openclaw.outcome`）
- `openclaw.message.duration_ms`（histogram，attrs：`openclaw.channel`、
  `openclaw.outcome`）

队列 + 会话：
- `openclaw.queue.lane.enqueue`（counter，attrs：`openclaw.lane`）
- `openclaw.queue.lane.dequeue`（counter，attrs：`openclaw.lane`）
- `openclaw.queue.depth`（histogram，attrs：`openclaw.lane` 或
  `openclaw.channel=heartbeat`）
- `openclaw.queue.wait_ms`（histogram，attrs：`openclaw.lane`）
- `openclaw.session.state`（counter，attrs：`openclaw.state`、`openclaw.reason`）
- `openclaw.session.stuck`（counter，attrs：`openclaw.state`）
- `openclaw.session.stuck_age_ms`（histogram，attrs：`openclaw.state`）
- `openclaw.run.attempt`（counter，attrs：`openclaw.attempt`）

### 导出 spans（名称 + 关键属性）

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

- Trace 采样：`diagnostics.otel.sampleRate`（0.0–1.0，仅根 span）。
- Metric 导出间隔：`diagnostics.otel.flushIntervalMs`（最小 1000ms）。

### 协议说明

- OTLP/HTTP endpoint 可通过 `diagnostics.otel.endpoint` 或
  `OTEL_EXPORTER_OTLP_ENDPOINT` 设置。
- 若 endpoint 已包含 `/v1/traces` 或 `/v1/metrics`，会直接使用。
- 若 endpoint 已包含 `/v1/logs`，日志会直接使用该地址。
- `diagnostics.otel.logs` 会启用 OTLP 日志导出，针对主 logger 输出。

### 日志导出行为

- OTLP 日志使用与 `logging.file` 相同的结构化记录。
- 遵循 `logging.level`（文件日志级别）。控制台脱敏**不适用**于 OTLP 日志。
- 高日志量部署应优先在 OTLP collector 侧做采样/过滤。

## 排障提示

- **Gateway 不可达？** 先运行 `openclaw doctor`。
- **日志为空？** 检查 Gateway 是否在运行，以及 `logging.file` 中的路径是否正确。
- **需要更多细节？** 把 `logging.level` 设为 `debug` 或 `trace` 后重试。
