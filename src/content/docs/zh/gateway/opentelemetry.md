---
summary: "通过 diagnostics-otel 插件 (OTLP/HTTP) 将 OpenClaw 诊断信息导出到任何 OpenTelemetry 收集器"
title: "OpenTelemetry 导出"
read_when:
  - You want to send OpenClaw model usage, message flow, or session metrics to an OpenTelemetry collector
  - You are wiring traces, metrics, or logs into Grafana, Datadog, Honeycomb, New Relic, Tempo, or another OTLP backend
  - You need the exact metric names, span names, or attribute shapes to build dashboards or alerts
---

OpenClaw 通过捆绑的 `diagnostics-otel` 插件导出诊断信息，
使用 **OTLP/HTTP (protobuf)**。任何接受 OTLP/HTTP 的收集器或后端
无需更改代码即可工作。有关本地文件日志及其读取方法，请参阅
[日志记录](/zh/logging)。

## 如何协同工作

- **诊断事件** 是由 Gateway(网关) 和捆绑插件为模型运行、消息流、会话、队列
  和 exec 发出的结构化进程内记录。
- **`diagnostics-otel` 插件** 订阅这些事件，并通过 OTLP/HTTP 将其导出为
  OpenTelemetry **指标**、**跟踪** 和 **日志**。
- 当提供商传输接受自定义
  标头时，**提供商调用** 会从 OpenClaw 的
  受信任模型调用范围上下文接收 W3C `traceparent` 标头。插件发出的跟踪上下文不会被传播。
- 只有当诊断表面和插件都
  启用时，导出器才会附加，因此默认情况下进程内成本接近于零。

## 快速开始

```json5
{
  plugins: {
    allow: ["diagnostics-otel"],
    entries: {
      "diagnostics-otel": { enabled: true },
    },
  },
  diagnostics: {
    enabled: true,
    otel: {
      enabled: true,
      endpoint: "http://otel-collector:4318",
      protocol: "http/protobuf",
      serviceName: "openclaw-gateway",
      traces: true,
      metrics: true,
      logs: true,
      sampleRate: 0.2,
      flushIntervalMs: 60000,
    },
  },
}
```

您也可以从 CLI 启用该插件：

```bash
openclaw plugins enable diagnostics-otel
```

<Note>`protocol` 目前仅支持 `http/protobuf`。`grpc` 被忽略。</Note>

## 导出的信号

| Signal   | 包含内容                                                                                                 |
| -------- | -------------------------------------------------------------------------------------------------------- |
| **指标** | 用于令牌使用情况、成本、运行持续时间、消息流、队列通道、会话状态、exec 和内存压力的计数器和直方图。      |
| **跟踪** | 用于模型使用情况、模型调用、工具生命周期、工具执行、exec、webhook/消息处理、上下文组装和工具循环的范围。 |
| **日志** | 当启用 `diagnostics.otel.logs` 时，通过 OTLP 导出的结构化 `logging.file` 记录。                          |

独立切换 `traces`、`metrics` 和 `logs`。当 `diagnostics.otel.enabled` 为 true 时，这三者默认均开启。

## 配置参考

```json5
{
  diagnostics: {
    enabled: true,
    otel: {
      enabled: true,
      endpoint: "http://otel-collector:4318",
      tracesEndpoint: "http://otel-collector:4318/v1/traces",
      metricsEndpoint: "http://otel-collector:4318/v1/metrics",
      logsEndpoint: "http://otel-collector:4318/v1/logs",
      protocol: "http/protobuf", // grpc is ignored
      serviceName: "openclaw-gateway",
      headers: { "x-collector-token": "..." },
      traces: true,
      metrics: true,
      logs: true,
      sampleRate: 0.2, // root-span sampler, 0.0..1.0
      flushIntervalMs: 60000, // metric export interval (min 1000ms)
      captureContent: {
        enabled: false,
        inputMessages: false,
        outputMessages: false,
        toolInputs: false,
        toolOutputs: false,
        systemPrompt: false,
      },
    },
  },
}
```

### 环境变量

| 变量                                                                                                              | 用途                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT`                                                                                     | 覆盖 `diagnostics.otel.endpoint`。如果该值已包含 `/v1/traces`、`/v1/metrics` 或 `/v1/logs`，则按原样使用。                                                                       |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` / `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` / `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` | 当匹配的 `diagnostics.otel.*Endpoint` 配置键未设置时使用的特定于 Signal 的端点覆盖。特定于 Signal 的配置优先于特定于 Signal 的环境变量，后者又优先于共享端点。                   |
| `OTEL_SERVICE_NAME`                                                                                               | 覆盖 `diagnostics.otel.serviceName`。                                                                                                                                            |
| `OTEL_EXPORTER_OTLP_PROTOCOL`                                                                                     | 覆盖线路协议（目前仅 `http/protobuf` 有效）。                                                                                                                                    |
| `OTEL_SEMCONV_STABILITY_OPT_IN`                                                                                   | 设置为 `gen_ai_latest_experimental` 以发出最新的实验性 GenAI span 属性（`gen_ai.provider.name`），而不是旧版 `gen_ai.system`。无论如何，GenAI 指标始终使用有界的低基数语义属性。 |
| `OPENCLAW_OTEL_PRELOADED`                                                                                         | 当另一个预加载或宿主进程已注册全局 OpenTelemetry SDK 时，设置为 `1`。然后插件将跳过其自己的 NodeSDK 生命周期，但仍会连接诊断侦听器并遵守 `traces`/`metrics`/`logs`。             |

## 隐私和内容捕获

默认情况下不导出原始模型/工具内容。Span 携带有界标识符（渠道、提供商、模型、错误类别、仅哈希的请求 ID），从不包含提示文本、响应文本、工具输入、工具输出或会话密钥。

出站模型请求可能包含 W3C `traceparent` 标头。该标头仅根据活动模型调用的 OpenClaw 拥有的诊断跟踪上下文生成。现有的调用方提供的 `traceparent` 标头将被替换，因此插件或自定义提供商选项无法伪造跨服务跟踪谱系。

仅当您的收集器和保留策略批准捕获提示、响应、工具或系统提示文本时，才将 `diagnostics.otel.captureContent.*` 设置为 `true`。每个子密钥是独立选择加入的：

- `inputMessages` — 用户提示内容。
- `outputMessages` — 模型响应内容。
- `toolInputs` — 工具参数载荷。
- `toolOutputs` — 工具结果载荷。
- `systemPrompt` — 组装的系统/开发者提示词。

当启用任何子键时，模型和工具跨度将获得针对该类别的有界、经过编辑的
`openclaw.content.*` 属性。

## 采样和刷新

- **追踪：** `diagnostics.otel.sampleRate`（仅限根跨度，`0.0` 丢弃全部，
  `1.0` 保留全部）。
- **指标：** `diagnostics.otel.flushIntervalMs`（最小 `1000`）。
- **日志：** OTLP 日志遵循 `logging.level`（文件日志级别）。它们使用
  诊断日志记录编辑路径，而非控制台格式。高流量
  安装应优先使用 OTLP 收集器采样/过滤，而非本地采样。
- **文件日志关联：** 当日志调用携带有效的
  诊断追踪上下文时，JSONL 文件日志包含顶层 `traceId`、
  `spanId`、`parentSpanId` 和 `traceFlags`，这允许日志处理器将本地日志行与
  导出的跨度关联起来。
- **请求关联：** Gateway(网关) HTTP 请求和 WebSocket 帧创建一个
  内部请求追踪范围。该范围内的日志和诊断事件
  默认继承请求追踪，而代理运行和模型调用跨度作为
  子级创建，因此提供商 `traceparent` 标头保持在同一追踪上。

## 导出的指标

### 模型使用情况

- `openclaw.tokens`（计数器，属性：`openclaw.token`、`openclaw.channel`、`openclaw.provider`、`openclaw.model`、`openclaw.agent`）
- `openclaw.cost.usd`（计数器，属性：`openclaw.channel`、`openclaw.provider`、`openclaw.model`）
- `openclaw.run.duration_ms`（直方图，属性：`openclaw.channel`、`openclaw.provider`、`openclaw.model`）
- `openclaw.context.tokens` (直方图，属性：`openclaw.context`、`openclaw.channel`、`openclaw.provider`、`openclaw.model`)
- `gen_ai.client.token.usage` (直方图，GenAI 语义约定指标，属性：`gen_ai.token.type` = `input`/`output`、`gen_ai.provider.name`、`gen_ai.operation.name`、`gen_ai.request.model`)
- `gen_ai.client.operation.duration` (直方图，秒，GenAI 语义约定指标，属性：`gen_ai.provider.name`、`gen_ai.operation.name`、`gen_ai.request.model`，可选 `error.type`)
- `openclaw.model_call.duration_ms` (直方图，属性：`openclaw.provider`、`openclaw.model`、`openclaw.api`、`openclaw.transport`，加上 `openclaw.errorCategory` 和 `openclaw.failureKind` 针对已分类错误)
- `openclaw.model_call.request_bytes` (直方图，最终模型请求负载的 UTF-8 字节大小；不包含原始负载内容)
- `openclaw.model_call.response_bytes` (直方图，流式模型响应事件的 UTF-8 字节大小；不包含原始响应内容)
- `openclaw.model_call.time_to_first_byte_ms` (直方图，第一个流式响应事件之前的耗时)

### 消息流

- `openclaw.webhook.received` (计数器，属性：`openclaw.channel`、`openclaw.webhook`)
- `openclaw.webhook.error` (计数器，属性：`openclaw.channel`、`openclaw.webhook`)
- `openclaw.webhook.duration_ms` (直方图，属性：`openclaw.channel`、`openclaw.webhook`)
- `openclaw.message.queued` (计数器，属性：`openclaw.channel`、`openclaw.source`)
- `openclaw.message.processed` (计数器，属性：`openclaw.channel`、`openclaw.outcome`)
- `openclaw.message.duration_ms` (直方图，属性：`openclaw.channel`、`openclaw.outcome`)
- `openclaw.message.delivery.started` (计数器，属性：`openclaw.channel`，`openclaw.delivery.kind`)
- `openclaw.message.delivery.duration_ms` (直方图，属性：`openclaw.channel`，`openclaw.delivery.kind`，`openclaw.outcome`，`openclaw.errorCategory`)

### 队列和会话

- `openclaw.queue.lane.enqueue` (计数器，属性：`openclaw.lane`)
- `openclaw.queue.lane.dequeue` (计数器，属性：`openclaw.lane`)
- `openclaw.queue.depth` (直方图，属性：`openclaw.lane` 或 `openclaw.channel=heartbeat`)
- `openclaw.queue.wait_ms` (直方图，属性：`openclaw.lane`)
- `openclaw.session.state` (计数器，属性：`openclaw.state`，`openclaw.reason`)
- `openclaw.session.stuck` (计数器，属性：`openclaw.state`)
- `openclaw.session.stuck_age_ms` (直方图，属性：`openclaw.state`)
- `openclaw.run.attempt` (计数器，属性：`openclaw.attempt`)

### Harness 生命周期

- `openclaw.harness.duration_ms` (直方图，属性：`openclaw.harness.id`，`openclaw.harness.plugin`，`openclaw.outcome`，出错时 `openclaw.harness.phase`)

### 执行

- `openclaw.exec.duration_ms` (直方图，属性：`openclaw.exec.target`，`openclaw.exec.mode`，`openclaw.outcome`，`openclaw.failureKind`)

### 诊断内部（内存和工具循环）

- `openclaw.memory.heap_used_bytes` (直方图，属性：`openclaw.memory.kind`)
- `openclaw.memory.rss_bytes` (直方图)
- `openclaw.memory.pressure` (计数器，属性：`openclaw.memory.level`)
- `openclaw.tool.loop.iterations` (计数器，属性：`openclaw.toolName`，`openclaw.outcome`)
- `openclaw.tool.loop.duration_ms` (直方图，属性：`openclaw.toolName`，`openclaw.outcome`)

## 导出的 spans

- `openclaw.model.usage`
  - `openclaw.channel`, `openclaw.provider`, `openclaw.model`
  - `openclaw.tokens.*` (input/output/cache_read/cache_write/total)
  - 默认为 `gen_ai.system`，或者在采用最新的 GenAI 语义约定时为 `gen_ai.provider.name`
  - `gen_ai.request.model`, `gen_ai.operation.name`, `gen_ai.usage.*`
- `openclaw.run`
  - `openclaw.outcome`, `openclaw.channel`, `openclaw.provider`, `openclaw.model`, `openclaw.errorCategory`
- `openclaw.model.call`
  - 默认为 `gen_ai.system`，或者在采用最新的 GenAI 语义约定时为 `gen_ai.provider.name`
  - `gen_ai.request.model`, `gen_ai.operation.name`, `openclaw.provider`, `openclaw.model`, `openclaw.api`, `openclaw.transport`
  - `openclaw.errorCategory` 以及出错时的可选 `openclaw.failureKind`
  - `openclaw.model_call.request_bytes`, `openclaw.model_call.response_bytes`, `openclaw.model_call.time_to_first_byte_ms`
  - `openclaw.provider.request_id_hash` (上游提供商请求 ID 的有界 SHA 哈希；原始 ID 不会被导出)
- `openclaw.harness.run`
  - `openclaw.harness.id`, `openclaw.harness.plugin`, `openclaw.outcome`, `openclaw.provider`, `openclaw.model`, `openclaw.channel`
  - 完成时：`openclaw.harness.result_classification`, `openclaw.harness.yield_detected`, `openclaw.harness.items.started`, `openclaw.harness.items.completed`, `openclaw.harness.items.active`
  - 出错时：`openclaw.harness.phase`, `openclaw.errorCategory`, 可选 `openclaw.harness.cleanup_failed`
- `openclaw.tool.execution`
  - `gen_ai.tool.name`, `openclaw.toolName`, `openclaw.errorCategory`, `openclaw.tool.params.*`
- `openclaw.exec`
  - `openclaw.exec.target`, `openclaw.exec.mode`, `openclaw.outcome`, `openclaw.failureKind`, `openclaw.exec.command_length`, `openclaw.exec.exit_code`, `openclaw.exec.timed_out`
- `openclaw.webhook.processed`
  - `openclaw.channel`, `openclaw.webhook`, `openclaw.chatId`
- `openclaw.webhook.error`
  - `openclaw.channel`, `openclaw.webhook`, `openclaw.chatId`, `openclaw.error`
- `openclaw.message.processed`
  - `openclaw.channel`, `openclaw.outcome`, `openclaw.chatId`, `openclaw.messageId`, `openclaw.reason`
- `openclaw.message.delivery`
  - `openclaw.channel`, `openclaw.delivery.kind`, `openclaw.outcome`, `openclaw.errorCategory`, `openclaw.delivery.result_count`
- `openclaw.session.stuck`
  - `openclaw.state`, `openclaw.ageMs`, `openclaw.queueDepth`
- `openclaw.context.assembled`
  - `openclaw.prompt.size`, `openclaw.history.size`, `openclaw.context.tokens`, `openclaw.errorCategory` (不包含提示词、历史记录、响应或会话密钥内容)
- `openclaw.tool.loop`
  - `openclaw.toolName`, `openclaw.outcome`, `openclaw.iterations`, `openclaw.errorCategory` (不包含循环消息、参数或工具输出)
- `openclaw.memory.pressure`
  - `openclaw.memory.level`, `openclaw.memory.heap_used_bytes`, `openclaw.memory.rss_bytes`

当显式启用内容捕获时，模型和工具跨度还可以包含您选择加入的特定内容类别的受限、经过编辑的 `openclaw.content.*` 属性。

## 诊断事件目录

以下事件支持上述指标和跨度。插件也可以直接订阅它们，而无需通过 OTLP 导出。

**模型使用情况**

- `model.usage` — tokens（令牌）、cost（成本）、duration（持续时间）、context（上下文）、提供商/模型/渠道（提供商/模型/渠道）、会话 ids（会话 ID）。`usage` 是用于成本和遥测的 提供商/turn（提供商/轮次）核算；`context.used` 是当前的 prompt/context（提示词/上下文）快照，当涉及缓存输入或工具循环调用时，它可能低于提供商的 `usage.total`。

**消息流**

- `webhook.received` / `webhook.processed` / `webhook.error`
- `message.queued` / `message.processed`
- `message.delivery.started` / `message.delivery.completed` / `message.delivery.error`

**队列和会话**

- `queue.lane.enqueue` / `queue.lane.dequeue`
- `session.state` / `session.stuck`
- `run.attempt`
- `diagnostic.heartbeat` （聚合计数器：webhooks/queue/会话（Webhook/队列/会话））

**Harness 生命周期**

- `harness.run.started` / `harness.run.completed` / `harness.run.error` —
  代理 Harness 的每次运行生命周期。包括 `harnessId`、可选的
  `pluginId`、提供商/模型/渠道（提供商/模型/渠道）和运行 ID。完成时会添加
  `durationMs`、`outcome`、可选的 `resultClassification`、`yieldDetected`
  以及 `itemLifecycle` 计数。错误会添加 `phase`
  （`prepare`/`start`/`send`/`resolve`/`cleanup`）、`errorCategory`
  以及可选的 `cleanupFailed`。

**Exec**

- `exec.process.completed` — 最终结果、持续时间、目标、模式、退出
  代码和失败类型。不包含命令文本和工作目录。

## 不使用导出器

您可以运行 `diagnostics-otel` 而保持诊断事件对插件或自定义接收器可用：

```json5
{
  diagnostics: { enabled: true },
}
```

若要在不引发 `logging.level` 的情况下获取定向调试输出，请使用诊断
标志。标志不区分大小写并支持通配符（例如 `telegram.*` 或
`*`）：

```json5
{
  diagnostics: { flags: ["telegram.http"] },
}
```

或者作为一次性的环境变量覆盖：

```bash
OPENCLAW_DIAGNOSTICS=telegram.http,telegram.payload openclaw gateway
```

标志输出会进入标准日志文件 (`logging.file`)，并且仍然
会被 `logging.redactSensitive` 编辑。完整指南：
[诊断标志](/zh/diagnostics/flags)。

## 禁用

```json5
{
  diagnostics: { otel: { enabled: false } },
}
```

您也可以将 `diagnostics-otel` 从 `plugins.allow` 中省略，或者运行
`openclaw plugins disable diagnostics-otel`。

## 相关

- [日志记录](/zh/logging) — 文件日志、控制台输出、CLI 尾随跟踪以及控制 UI 日志选项卡
- [Gateway(网关) 日志记录内部机制](/zh/gateway/logging) — WS 日志样式、子系统前缀和控制台捕获
- [诊断标志](/zh/diagnostics/flags) — 定向调试日志标志
- [诊断导出](/zh/gateway/diagnostics) — 运营商支持包工具（与 OTEL 导出分开）
- [配置参考](/zh/gateway/configuration-reference#diagnostics) — 完整的 `diagnostics.*` 字段参考
