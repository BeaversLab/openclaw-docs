---
summary: "文件日志、控制台输出、CLI 跟踪以及控制 UI 日志选项卡"
read_when:
  - You need a beginner-friendly overview of OpenClaw logging
  - You want to configure log levels, formats, or redaction
  - You are troubleshooting and need to find logs quickly
title: "日志记录"
---

OpenClaw 有两个主要的日志记录表面：

- 由 Gateway(网关) 写入的**文件日志**（JSON 行）。
- 在终端和 Gateway(网关) 调试 UI 中显示的**控制台输出**。

控制 UI 中的**日志**选项卡会跟踪网关文件日志。本页解释了日志的存储位置、读取方法以及如何配置日志级别和格式。

## 日志位置

默认情况下，Gateway(网关) 会在以下位置写入滚动日志文件：

`/tmp/openclaw/openclaw-YYYY-MM-DD.log`

日期使用网关主机的本地时区。

当每个文件达到 `logging.maxFileBytes`（默认：100 MB）时会进行轮换。
OpenClaw 会在活动文件旁边最多保留五个编号的存档文件，例如
`openclaw-YYYY-MM-DD.1.log`，并继续写入新的活动日志文件而不是
停止诊断输出。

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

- `--local-time`：以您的本地时区呈现时间戳
- `--url <url>` / `--token <token>` / `--timeout <ms>`：标准 Gateway(网关) RPC 标志
- `--expect-final`：代理支持的 RPC 最终响应等待标志（此处通过共享客户端层接受）

输出模式：

- **TTY 会话**：美观、彩色、结构化的日志行。
- **非 TTY 会话**：纯文本。
- `--json`：行分隔的 JSON（每行一个日志事件）。
- `--plain`：在 TTY 会话中强制使用纯文本。
- `--no-color`：禁用 ANSI 颜色。

当您传递显式的 `--url` 时，CLI 不会自动应用配置或
环境凭据；如果目标 Gateway(网关)
需要身份验证，请自行包含 `--token`。

在 JSON 模式下，CLI 发出带有 `type` 标记的对象：

- `meta`：流元数据（文件、游标、大小）
- `log`：已解析的日志条目
- `notice`：截断/轮换提示
- `raw`：未解析的日志行

如果本地环回 Gateway(网关) 请求配对，`openclaw logs` 将自动回退到
配置的本地日志文件。显式的 `--url` 目标不会
使用此回退机制。

如果 Gateway(网关) 无法访问，CLI 会打印一个简短的提示以运行：

```bash
openclaw doctor
```

### Control UI (Web)

控制 UI 的 **Logs** 选项卡使用 `logs.tail` 跟踪同一个文件。
请参阅 [/web/control-ui](/zh/web/control-ui) 了解如何打开它。

### 仅限频道的日志

要过滤渠道活动（WhatsApp/Telegram/等），请使用：

```bash
openclaw channels logs --channel whatsapp
```

## 日志格式

### 文件日志 (JSONL)

日志文件中的每一行都是一个 JSON 对象。CLI 和 Control UI 解析这些条目以渲染结构化输出（时间、级别、子系统、消息）。

在可用的情况下，文件日志 JSONL 记录还包括可进行机器过滤的顶级字段：

- `hostname`：Gateway 主机名。
- `message`：用于全文搜索的扁平化日志消息文本。
- `agent_id`：当日志调用携带 agent 上下文时的活动 agent ID。
- `session_id`：当日志调用携带会话上下文时的活动会话 ID/键。
- `channel`：当日志调用携带渠道上下文时的活动渠道。

OpenClaw 会保留这些字段旁边的原始结构化日志参数，以便读取编号 tslog 参数键的现有解析器继续工作。

### 控制台输出

控制台日志具有 **TTY 感知** 能力，并针对可读性进行了格式化：

- 子系统前缀（例如 `gateway/channels/whatsapp`）
- 级别着色（info/warn/error）
- 可选的紧凑或 JSON 模式

控制台格式化由 `logging.consoleStyle` 控制。

### Gateway WebSocket 日志

`openclaw gateway` 还具有用于 RPC 流量的 WebSocket 协议日志记录：

- 普通模式：仅显示有趣的结果（错误、解析错误、慢速调用）
- `--verbose`：所有请求/响应流量
- `--ws-log auto|compact|full`：选择详细的渲染样式
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

- `logging.level`：**file logs** (JSONL) 级别。
- `logging.consoleLevel`：**console** 详细程度级别。

您可以通过 **`OPENCLAW_LOG_LEVEL`** 环境变量（例如 `OPENCLAW_LOG_LEVEL=debug`）覆盖这两项。环境变量优先于配置文件，因此您可以在不编辑 `openclaw.json` 的情况下提高单次运行的详细程度。您还可以传递全局 CLI 选项 **`--log-level <level>`**（例如 `openclaw --log-level debug gateway run`），这将覆盖该命令的环境变量。

`--verbose` 仅影响控制台输出和 WS 日志详细程度；它不会更改
文件日志级别。

### 追踪关联

文件日志为 JSONL 格式。当日志调用携带有效的诊断追踪上下文时，
OpenClaw 会将追踪字段作为顶级 JSON 键（`traceId`、`spanId`、
`parentSpanId`、`traceFlags`）写入，以便外部日志处理器可以将该行
与 OTEL 跨度和提供商 `traceparent` 传播相关联。

Gateway(网关) HTTP 请求和 Gateway(网关) WebSocket 帧建立了一个内部请求
追踪范围。在该异步范围内发出的日志和诊断事件会继承
请求追踪（前提是它们未传递显式追踪上下文）。Agent 运行和
模型调用追踪将成为活动请求追踪的子项，因此本地日志、
诊断快照、OTEL 跨度和可信提供商 `traceparent` 标头可以
通过 `traceId` 进行关联，而无需记录原始请求或模型内容。

### 模型调用大小和时间

模型调用诊断记录有界的请求/响应测量值，而不
捕获原始提示或响应内容：

- `requestPayloadBytes`：最终模型请求负载的 UTF-8 字节大小
- `responseStreamBytes`：流式模型响应事件的 UTF-8 字节大小
- `timeToFirstByteMs`：第一个流式响应事件之前的经过时间
- `durationMs`：模型调用的总持续时间

当启用诊断导出时，这些字段可用于诊断快照、模型调用插件挂钩以及
OTEL 模型调用跨度/指标。

### 控制台样式

`logging.consoleStyle`：

- `pretty`：人类友好、彩色、带时间戳。
- `compact`：更紧凑的输出（最适合长会话）。
- `json`：每行 JSON（适用于日志处理器）。

### 编辑

OpenClaw 可以在敏感令牌到达控制台输出、文件日志、
OTLP 日志记录或持久化会话文本之前对其进行编辑：

- `logging.redactSensitive`：`off` | `tools`（默认值：`tools`）
- `logging.redactPatterns`：用于覆盖默认集合的正则字符串列表

文件日志和会话记录保持 JSONL 格式，但在将行或消息写入磁盘之前，匹配的密钥值会被屏蔽。屏蔽是尽力而为的：它适用于包含文本的消息内容和日志字符串，而非每个标识符或二进制负载字段。

## 诊断和 OpenTelemetry

诊断是用于模型运行和消息流遥测（webhook、队列、会话状态）的结构化、机器可读事件。它们并**不**取代日志——而是为指标、跟踪和导出器提供数据。无论是否导出，事件都会在进程内发出。

两个相邻的层面：

- **OpenTelemetry 导出** — 通过 OTLP/HTTP 将指标、跟踪和日志发送到任何兼容 OpenTelemetry 的收集器或后端（Grafana、Datadog、Honeycomb、New Relic、Tempo 等）。完整配置、信号目录、指标/跨度名称、环境变量和隐私模型位于专用页面：[OpenTelemetry 导出](/zh/gateway/opentelemetry)。
- **诊断标志** — 针对性的调试日志标志，用于将额外的日志路由到 `logging.file`，而无需提高 `logging.level`。标志不区分大小写，并支持通配符（`telegram.*`、`*`）。在 `diagnostics.flags` 下配置，或通过 `OPENCLAW_DIAGNOSTICS=...` 环境变量覆盖进行配置。完整指南：[诊断标志](/zh/diagnostics/flags)。

要在不进行 OTLP 导出的情况下为插件或自定义接收器启用诊断事件：

```json5
{
  diagnostics: { enabled: true },
}
```

要将 OTLP 导出到收集器，请参阅 [OpenTelemetry 导出](/zh/gateway/opentelemetry)。

## 故障排除提示

- **Gateway(网关) 无法访问？** 首先运行 `openclaw doctor`。
- **日志为空？** 检查 Gateway(网关) 是否正在运行并正在写入 `logging.file` 中的文件路径。
- **需要更多细节？** 将 `logging.level` 设置为 `debug` 或 `trace` 并重试。

## 相关

- [OpenTelemetry 导出](/zh/gateway/opentelemetry) — OTLP/HTTP 导出、指标/跨度目录、隐私模型
- [诊断标志](/zh/diagnostics/flags) — 针对性的调试日志标志
- [Gateway(网关) logging internals](/zh/gateway/logging) — WS log styles, subsystem prefixes, and console capture
- [Configuration reference](/zh/gateway/configuration-reference#diagnostics) — full `diagnostics.*` field reference
