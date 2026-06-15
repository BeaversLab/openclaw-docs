---
summary: "CLI文件日志、控制台输出、CLI 尾部跟踪以及控制 UI 日志选项卡"
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

每个文件在达到 `logging.maxFileBytes` 时轮转（默认：100 MB）。
OpenClaw 在活动文件旁边最多保留五个带编号的存档，例如
`openclaw-YYYY-MM-DD.1.log`，并继续写入新的活动日志而不是
停止输出诊断信息。

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
- `notice`：截断/轮转提示
- `raw`：未解析的日志行

如果隐式 local loopback Gateway(网关) 请求配对、在连接期间关闭，或者在 Gateway(网关)`logs.tail` 回答之前超时，`openclaw logs`Gateway(网关) 将自动回退到配置的 Gateway(网关) 文件日志。显式 `--url` 目标不使用此回退。`openclaw logs --follow`LinuxGateway(网关)Gateway(网关) 更严格：在 Linux 上，如果可用，它会通过 PID 使用活动的用户 systemd Gateway(网关) 日志，否则会持续重试活动的 Gateway(网关)，而不是跟随可能过时的 side-by-side 文件。

如果 Gateway(网关) 无法访问，CLI 会打印一个简短的提示以运行：

```bash
openclaw doctor
```

### Control UI (Web)

控制 UI 的 **Logs（日志）** 选项卡使用 `logs.tail` 跟踪同一文件。
有关如何打开它的信息，请参阅 [控制 UI](/zh/web/control-ui)。

### 仅限频道的日志

要过滤渠道活动（WhatsApp/Telegram/等），请使用：

```bash
openclaw channels logs --channel whatsapp
```

## 日志格式

### 文件日志 (JSONL)

日志文件中的每一行都是一个 JSON 对象。CLI 和 Control UI 解析这些条目以渲染结构化输出（时间、级别、子系统、消息）。

在可用的情况下，文件日志 JSONL 记录还包括可进行机器过滤的顶级字段：

- `hostname`：Gateway(网关) 主机名。
- `message`：用于全文搜索的扁平化日志消息文本。
- `agent_id`：当日志调用携带 agent 上下文时的活动 agent ID。
- `session_id`：当日志调用携带 会话 上下文时的活动会话 ID/密钥。
- `channel`：当日志调用携带 渠道 上下文时的活动渠道。

OpenClaw 会保留这些字段旁边的原始结构化日志参数，以便读取编号 tslog 参数键的现有解析器继续工作。

Talk、实时语音和托管房间活动通过同一个文件日志管道发出有边界生命周期日志记录。这些记录包括事件类型、模式、传输、提供商以及可用时的大小/时间测量，但省略了转录文本、音频负载、回合 id、调用 id 和提供商项目 id。

### 控制台输出

控制台日志是 **TTY 感知** 的，并针对可读性进行了格式化：

- 子系统前缀（例如 `gateway/channels/whatsapp`）
- 级别着色（信息/警告/错误）
- 可选的紧凑或 JSON 模式

控制台格式由 `logging.consoleStyle` 控制。

### Gateway(网关) WebSocket 日志

`openclaw gateway`RPC 还具有用于 RPC 流量的 WebSocket 协议日志记录：

- 正常模式：仅显示有趣的结果（错误、解析错误、慢调用）
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

所有日志记录配置都位于 `~/.openclaw/openclaw.json` 中的 `logging` 下。

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
- `logging.consoleLevel`：**console** 详细级别。

您可以通过 **`OPENCLAW_LOG_LEVEL`** 环境变量覆盖这两项（例如 `OPENCLAW_LOG_LEVEL=debug`）。环境变量的优先级高于配置文件，因此您无需编辑 `openclaw.json` 即可针对单次运行提高详细程度。您还可以传递全局 CLI 选项 **`--log-level <level>`**（例如 `openclaw --log-level debug gateway run`），这将覆盖该命令的环境变量。

`--verbose` 仅影响控制台输出和 WebSocket 日志的详细程度；它不会更改
文件日志级别。

### 定向模型传输诊断

调试提供商调用时，请使用针对性的环境标志，而不是将
所有日志都提升到 `debug`：

```bash
OPENCLAW_DEBUG_MODEL_TRANSPORT=1 openclaw gateway
OPENCLAW_DEBUG_MODEL_PAYLOAD=tools OPENCLAW_DEBUG_SSE=events openclaw gateway
```

可用标志：

- `OPENCLAW_DEBUG_MODEL_TRANSPORT=1`：在 `info` 级别发出请求开始、获取响应、SDK
  标头、第一个流式传输事件、流完成和传输错误。
- `OPENCLAW_DEBUG_MODEL_PAYLOAD=summary`：在模型请求日志中包含有界的请求负载
  摘要。
- `OPENCLAW_DEBUG_MODEL_PAYLOAD=tools`：在负载摘要中包含所有面向模型的工具名称。
- `OPENCLAW_DEBUG_MODEL_PAYLOAD=full-redacted`：包含经过编辑且数量有限的 JSON
  负载快照。仅在调试时使用；机密信息已编辑，但提示词
  和消息文本可能仍然存在。
- `OPENCLAW_DEBUG_SSE=events`：发出首个事件和流完成的计时信息。
- `OPENCLAW_DEBUG_SSE=peek`：还发出前五个经过编辑的 SSE 事件
  负载，每个事件都有数量限制。
- `OPENCLAW_DEBUG_CODE_MODE=1`：发出代码模式模型表面诊断信息，
  包括当本机提供商工具因代码模式接管工具表面而被隐藏时的情况。

这些标志通过正常的 OpenClaw 日志进行记录，因此 `openclaw logs --follow`
和控制 UI 日志选项卡会显示它们。如果没有这些标志，相同的诊断信息
仍然在 `debug` 级别可用。

### 追踪关联

文件日志采用 JSONL 格式。当日志调用携带有效的诊断追踪上下文时，OpenClaw 会将追踪字段作为顶级 JSON 键（OpenClaw`traceId`、`spanId`、`parentSpanId`、`traceFlags`）写入，以便外部日志处理器可以将该行与 OTEL 跨度和提供商 `traceparent` 传播关联起来。

Gateway HTTP 请求和 Gateway WebSocket 帧会建立一个内部请求追踪范围。在该异步范围内发出的日志和诊断事件，如果未传递显式的追踪上下文，则会继承请求追踪。Agent 运行和模型调用追踪会成为活动请求追踪的子项，因此本地日志、诊断快照、OTEL 跨度和受信任的提供商 Gateway(网关)Gateway(网关)`traceparent` 标头可以通过 `traceId` 关联在一起，而无需记录原始请求或模型内容。

当启用 OpenTelemetry 日志导出时，Talk 生命周期日志记录也会使用与文件日志相同的有界属性流向 OTLP 日志。

### 模型调用大小和时间

模型调用诊断记录有界的请求/响应测量数据，而不捕获原始提示或响应内容：

- `requestPayloadBytes`：最终模型请求负载的 UTF-8 字节大小
- `responseStreamBytes`：流式模型响应事件的 UTF-8 字节大小，不包括增量事件上累积的 `partial` 快照
- `timeToFirstByteMs`：首次流式响应事件之前的经过时间
- `durationMs`：模型调用的总持续时间

当启用诊断导出时，这些字段可用于诊断快照、模型调用插件挂钩以及 OTEL 模型调用跨度/指标。

### 控制台样式

`logging.consoleStyle`：

- `pretty`：人性化、彩色，带有时间戳。
- `compact`：更紧凑的输出（适用于长会话）。
- `json`：每行 JSON（适用于日志处理器）。

### 编辑

OpenClaw 可以在敏感信息进入控制台输出、文件日志、OTLP 日志记录、持久化的会话记录文本或控制 UI 工具事件负载（工具启动参数、部分/最终结果负载、派生执行输出和补丁摘要）之前对其进行编辑：

- `logging.redactSensitive`： `off` | `tools`（默认值： `tools`）
- `logging.redactPatterns`：用于覆盖默认集的 regex 字符串列表。自定义模式在控制 UI 工具负载的内置默认值之上应用，因此添加模式绝不会削弱已被默认值捕获的值的编辑。

文件日志和会话记录保持 JSONL 格式，但在将行或消息写入磁盘之前，匹配的密钥值会被掩码。编辑是尽力而为的：它适用于包含文本的消息内容和日志字符串，而非每个标识符或二进制负载字段。

内置默认值涵盖常见的 API 凭据和支付凭证字段名称，例如卡号、CVC/CVV、共享支付令牌和支付凭证，当它们作为 JSON 字段、URL 参数、CLI 标志或赋值出现时。

`logging.redactSensitive: "off"` 仅禁用此常规日志/转录策略。
OpenClaw 仍然编辑可显示给 UI 客户端、支持包、诊断观察器、批准提示或代理工具的安全边界负载。示例包括控制 UI 工具调用事件、`sessions_history` 输出、
诊断支持导出、提供商错误观察、执行批准命令显示以及 Gateway(网关) WebSocket 协议日志。自定义 `logging.redactPatterns`
仍可在此类表面上添加项目特定的模式。

## 诊断和 OpenTelemetry

诊断是针对模型运行和消息流遥测（webhook、排队、会话状态）的结构化、机器可读事件。它们**不**替代日志——它们为指标、追踪和导出器提供数据。无论您是否导出这些事件，它们都会在进程中发出。

两个相邻的层面：

- **OpenTelemetry 导出** — 通过 OTLP/HTTP 将指标、跟踪和日志发送到
  任何兼容 OpenTelemetry 的收集器或后端（Grafana、Datadog、
  Honeycomb、New Relic、Tempo 等）。完整配置、信号目录、
  指标/范围名称、环境变量和隐私模型位于专用页面：
  [OpenTelemetry 导出](/zh/gateway/opentelemetry)。
- **Diagnostics flags（诊断标志）** — 针对性的调试日志标志，用于将额外的日志路由到
  `logging.file` 而不提高 `logging.level`。标志不区分大小写
  并支持通配符（`telegram.*`、`*`）。在 `diagnostics.flags` 下配置
  或通过 `OPENCLAW_DIAGNOSTICS=...` 环境变量覆盖进行配置。完整指南：
  [Diagnostics flags](/zh/diagnostics/flags)。

要在没有 OTLP 导出的情况下为插件或自定义接收器启用诊断事件：

```json5
{
  diagnostics: { enabled: true },
}
```

有关将 OTLP 导出到收集器，请参阅 [OpenTelemetry export](/zh/gateway/opentelemetry)。

## 故障排除提示

- **Gateway(网关) 无法访问？** 首先运行 Gateway(网关)`openclaw doctor`。
- **日志为空？** 请检查 Gateway(网关) 是否正在运行并正在写入 Gateway(网关)`logging.file` 中的文件路径。
- **需要更多详细信息？** 将 `logging.level` 设置为 `debug` 或 `trace` 并重试。

## 相关

- [OpenTelemetry export](/zh/gateway/opentelemetry) — OTLP/HTTP 导出、指标/跨度目录、隐私模型
- [Diagnostics flags](/zh/diagnostics/flags) — 针对性的调试日志标志
- [Gateway(网关) logging internals](<Gateway(网关)/en/gateway/logging>) — WS 日志样式、子系统前缀和控制台捕获
- [Configuration reference](/zh/gateway/configuration-reference#diagnostics) — 完整的 `diagnostics.*` 字段参考
