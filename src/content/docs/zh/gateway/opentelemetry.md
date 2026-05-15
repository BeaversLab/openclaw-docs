---
summary: "OpenClaw通过 diagnostics-otel 插件 (OTLP/HTTP) 将 OpenClaw 诊断信息导出到任何 OpenTelemetry 收集器"
title: "OpenTelemetry 导出"
read_when:
  - You want to send OpenClaw model usage, message flow, or session metrics to an OpenTelemetry collector
  - You are wiring traces, metrics, or logs into Grafana, Datadog, Honeycomb, New Relic, Tempo, or another OTLP backend
  - You need the exact metric names, span names, or attribute shapes to build dashboards or alerts
---

OpenClaw 通过官方 OpenClaw`diagnostics-otel` 插件使用 **OTLP/HTTP (protobuf)** 导出诊断信息。任何接受 OTLP/HTTP 的收集器或后端都可以在无需更改代码的情况下工作。有关本地文件日志及其读取方法，请参阅 [日志记录](/zh/logging)。

## 如何协同工作

- **诊断事件** 是由 Gateway(网关) 和捆绑插件为模型运行、消息流、会话、队列
  和 exec 发出的结构化进程内记录。
- **`diagnostics-otel` 插件** 订阅这些事件，并通过 OTLP/HTTP 将其作为 OpenTelemetry **指标**、**追踪** 和 **日志** 导出。
- 当提供商传输接受自定义标头时，**提供商调用** 会从 OpenClaw 受信任的模型调用 span 上下文中接收 W3C `traceparent`OpenClaw 标头。插件发出的追踪上下文不会被传播。
- 只有当诊断表面和插件都
  启用时，导出器才会附加，因此默认情况下进程内成本接近于零。

## 快速开始

对于打包安装，请先安装插件：

```bash
openclaw plugins install clawhub:@openclaw/diagnostics-otel
```

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

<Note>`protocol` 目前仅支持 `http/protobuf`。`grpc` 将被忽略。</Note>

## 导出的 Signal

| Signal   | 包含内容                                                                                                             |
| -------- | -------------------------------------------------------------------------------------------------------------------- |
| **指标** | 用于 token 使用量、成本、运行持续时间、消息流、Talk 事件、队列通道、会话状态/恢复、exec 和内存压力的计数器和直方图。 |
| **追踪** | 针对模型使用、模型调用、harness 生命周期、工具执行、exec、webhook/消息处理、上下文组装和工具循环的 span。            |
| **日志** | 当启用 `diagnostics.otel.logs` 时，通过 OTLP 导出的结构化 `logging.file` 记录。                                      |

可以独立切换 `traces`、`metrics` 和 `logs`。当 `diagnostics.otel.enabled` 为 true 时，这三者默认都开启。

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

| 变量                                                                                                              | 用途                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT`                                                                                     | 覆盖 `diagnostics.otel.endpoint`。如果该值已包含 `/v1/traces`、`/v1/metrics` 或 `/v1/logs`，则将按原样使用。                                                                          |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` / `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` / `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` | 当匹配的 Signal`diagnostics.otel.*Endpoint`Signal 配置键未设置时使用的特定 Signal 端点覆盖。特定 Signal 的配置优先于特定 Signal 的环境变量，后者又优先于共享端点。                    |
| `OTEL_SERVICE_NAME`                                                                                               | 覆盖 `diagnostics.otel.serviceName`。                                                                                                                                                 |
| `OTEL_EXPORTER_OTLP_PROTOCOL`                                                                                     | 覆盖线路协议（目前仅 `http/protobuf` 有效）。                                                                                                                                         |
| `OTEL_SEMCONV_STABILITY_OPT_IN`                                                                                   | 设置为 `gen_ai_latest_experimental` 以发出最新的实验性 GenAI 跨度属性（`gen_ai.provider.name`），而不是旧式的 `gen_ai.system`。无论设置如何，GenAI 指标始终使用有界的低基数语义属性。 |
| `OPENCLAW_OTEL_PRELOADED`                                                                                         | 当另一个预加载或主机进程已注册全局 OpenTelemetry SDK 时，设置为 `1`。然后该插件将跳过其自己的 NodeSDK 生命周期，但仍会连接诊断侦听器并遵守 `traces`/`metrics`/`logs`。                |

## 隐私和内容捕获

默认情况下不导出原始模型/工具内容。跨度携带有界标识符（渠道、提供商、模型、错误类别、仅哈希请求 ID），并且绝不包括提示文本、响应文本、工具输入、工具输出或会话密钥。
对话指标仅导出有界事件元数据，例如模式、传输、提供商和事件类型。它们不包括转录、音频负载、会话 ID、回合 ID、呼叫 ID、房间 ID 或移交令牌。

出站模型请求可能包含 W3C `traceparent`OpenClaw 标头。该标头仅根据 OpenClaw 拥有的活动模型调用的诊断跟踪上下文生成。现有的调用方提供的 `traceparent` 标头将被替换，因此插件或自定义提供商选项无法欺骗跨服务跟踪谱系。

仅当您的收集器和保留策略允许记录提示词、响应、工具或系统提示词文本时，才将 `diagnostics.otel.captureContent.*` 设置为 `true`。每个子项都是独立启用的：

- `inputMessages` - 用户提示词内容。
- `outputMessages` - 模型响应内容。
- `toolInputs` - 工具参数负载。
- `toolOutputs` - 工具结果负载。
- `systemPrompt` - 组装好的系统/开发者提示词。

当启用任何子项时，模型和工具跨度将仅针对该类别获得受限制的、经过编辑的 `openclaw.content.*` 属性。

## 采样和刷新

- **追踪：** `diagnostics.otel.sampleRate`（仅根跨度，`0.0` 丢弃全部，
  `1.0` 保留全部）。
- **指标：** `diagnostics.otel.flushIntervalMs`（最小 `1000`）。
- **日志：** OTLP 日志遵循 `logging.level`（文件日志级别）。它们使用
  诊断日志记录编辑路径，而不是控制台格式化。高流量
  安装应优先使用 OTLP 收集器采样/过滤，而非本地采样。
- **文件日志关联：** 当日志调用携带有效的
  诊断追踪上下文时，JSONL 文件日志包含顶级 `traceId`、
  `spanId`、`parentSpanId` 和 `traceFlags`，这使得日志处理器可以将本地日志行与
  导出的跨度连接起来。
- **请求关联：** Gateway(网关) HTTP 请求和 WebSocket 帧创建一个
  内部请求追踪范围。该范围内的日志和诊断事件
  默认继承请求追踪，而代理运行和模型调用跨度作为子项创建，以便提供商 `traceparent` 标头保持在同一追踪上。

## 导出的指标

### 模型使用情况

- `openclaw.tokens`（计数器，属性：`openclaw.token`、`openclaw.channel`、`openclaw.provider`、`openclaw.model`、`openclaw.agent`）
- `openclaw.cost.usd`（计数器，属性：`openclaw.channel`、`openclaw.provider`、`openclaw.model`）
- `openclaw.run.duration_ms` (直方图，属性：`openclaw.channel`、`openclaw.provider`、`openclaw.model`)
- `openclaw.context.tokens` (直方图，属性：`openclaw.context`、`openclaw.channel`、`openclaw.provider`、`openclaw.model`)
- `gen_ai.client.token.usage` (直方图，GenAI 语义约定指标，属性：`gen_ai.token.type` = `input`/`output`、`gen_ai.provider.name`、`gen_ai.operation.name`、`gen_ai.request.model`)
- `gen_ai.client.operation.duration` (直方图，秒，GenAI 语义约定指标，属性：`gen_ai.provider.name`、`gen_ai.operation.name`、`gen_ai.request.model`，可选 `error.type`)
- `openclaw.model_call.duration_ms` (直方图，属性：`openclaw.provider`、`openclaw.model`、`openclaw.api`、`openclaw.transport`，加上分类错误上的 `openclaw.errorCategory` 和 `openclaw.failureKind`)
- `openclaw.model_call.request_bytes` (直方图，最终模型请求负载的 UTF-8 字节大小；无原始负载内容)
- `openclaw.model_call.response_bytes` (直方图，流式模型响应事件的 UTF-8 字节大小；无原始响应内容)
- `openclaw.model_call.time_to_first_byte_ms` (直方图，首个流式响应事件之前的经过时间)

### 消息流

- `openclaw.webhook.received` (计数器，属性：`openclaw.channel`、`openclaw.webhook`)
- `openclaw.webhook.error` (计数器，属性：`openclaw.channel`、`openclaw.webhook`)
- `openclaw.webhook.duration_ms` (直方图，属性：`openclaw.channel`、`openclaw.webhook`)
- `openclaw.message.queued` (计数器，属性：`openclaw.channel`、`openclaw.source`)
- `openclaw.message.processed` (计数器，属性：`openclaw.channel`、`openclaw.outcome`)
- `openclaw.message.duration_ms` (直方图，属性：`openclaw.channel`, `openclaw.outcome`)
- `openclaw.message.delivery.started` (计数器，属性：`openclaw.channel`, `openclaw.delivery.kind`)
- `openclaw.message.delivery.duration_ms` (直方图，属性：`openclaw.channel`, `openclaw.delivery.kind`, `openclaw.outcome`, `openclaw.errorCategory`)

### Talk

- `openclaw.talk.event` (计数器，属性：`openclaw.talk.event_type`, `openclaw.talk.mode`, `openclaw.talk.transport`, `openclaw.talk.brain`, `openclaw.talk.provider`)
- `openclaw.talk.event.duration_ms` (直方图，属性：同 `openclaw.talk.event`；当 Talk 事件报告持续时间时发出)
- `openclaw.talk.audio.bytes` (直方图，属性：同 `openclaw.talk.event`；针对报告字节长度的 Talk 音频帧事件发出)

### 队列和会话

- `openclaw.queue.lane.enqueue` (计数器，属性：`openclaw.lane`)
- `openclaw.queue.lane.dequeue` (计数器，属性：`openclaw.lane`)
- `openclaw.queue.depth` (直方图，属性：`openclaw.lane` 或 `openclaw.channel=heartbeat`)
- `openclaw.queue.wait_ms` (直方图，属性：`openclaw.lane`)
- `openclaw.session.state` (计数器，属性：`openclaw.state`, `openclaw.reason`)
- `openclaw.session.stuck` (计数器，属性：`openclaw.state`；仅针对没有活跃工作的过时会话维护发出)
- `openclaw.session.stuck_age_ms` (直方图，属性：`openclaw.state`；仅针对没有活跃工作的过时会话维护发出)
- `openclaw.session.recovery.requested` (计数器，属性：`openclaw.state`, `openclaw.action`, `openclaw.active_work_kind`, `openclaw.reason`)
- `openclaw.session.recovery.completed` (计数器，属性：`openclaw.state`、`openclaw.action`、`openclaw.status`、`openclaw.active_work_kind`、`openclaw.reason`)
- `openclaw.session.recovery.age_ms` (直方图，属性：与匹配的恢复计数器相同)
- `openclaw.run.attempt` (计数器，属性：`openclaw.attempt`)

### 会话活跃性遥测

`diagnostics.stuckSessionWarnMs` 是会话活跃性诊断的无进展时间阈值。当 OpenClaw 观察到回复、工具、状态、块或 ACP 运行时进度时，`processing` 会话不会老化至该阈值。键入保活信号不算作进展，因此仍可以检测到静默模型或线束。

OpenClaw 根据其仍能观察到的工作对会话进行分类：

- `session.long_running`：活动的嵌入式工作、模型调用或工具调用仍在取得进展。
- `session.stalled`：存在活动工作，但活动运行未报告近期进展。停滞的嵌入式运行最初保持仅观察状态，然后在 `diagnostics.stuckSessionAbortMs` 无进展后中止-排空，以便队列中车道后的轮次可以恢复。如果未设置，中止阈值默认为更安全的扩展窗口，即至少 10 分钟且为 `diagnostics.stuckSessionWarnMs` 的 5 倍。
- `session.stuck`：过时的会话簿记，没有活动工作。这会立即释放受影响的会话车道。

恢复会发出结构化的 `session.recovery.requested` 和 `session.recovery.completed` 事件。诊断会话状态仅在产生变更的恢复结果（`aborted` 或 `released`）之后，并且仅当相同的处理代次仍然当前时，才会被标记为空闲。

只有 `session.stuck` 会发出 `openclaw.session.stuck` 计数器、`openclaw.session.stuck_age_ms` 直方图和 `openclaw.session.stuck` 跨度。当会话保持不变时，重复的 `session.stuck` 诊断信息会退避，因此仪表板应该针对持续增加的情况发出警报，而不是每次心跳跳动时。有关配置旋钮和默认值，请参阅[配置参考](/zh/gateway/configuration-reference#diagnostics)。

### Harness 生命周期

- `openclaw.harness.duration_ms`（直方图，属性：`openclaw.harness.id`、`openclaw.harness.plugin`、`openclaw.outcome`、`openclaw.harness.phase` 错误时）

### Exec

- `openclaw.exec.duration_ms`（直方图，属性：`openclaw.exec.target`、`openclaw.exec.mode`、`openclaw.outcome`、`openclaw.failureKind`）

### 诊断内部（内存和工具循环）

- `openclaw.memory.heap_used_bytes`（直方图，属性：`openclaw.memory.kind`）
- `openclaw.memory.rss_bytes`（直方图）
- `openclaw.memory.pressure`（计数器，属性：`openclaw.memory.level`）
- `openclaw.tool.loop.iterations`（计数器，属性：`openclaw.toolName`、`openclaw.outcome`）
- `openclaw.tool.loop.duration_ms`（直方图，属性：`openclaw.toolName`、`openclaw.outcome`）

## 导出的跨度

- `openclaw.model.usage`
  - `openclaw.channel`、`openclaw.provider`、`openclaw.model`
  - `openclaw.tokens.*`（input/output/cache_read/cache_write/total）
  - 默认为 `gen_ai.system`，或者在启用最新 GenAI 语义约定时为 `gen_ai.provider.name`
  - `gen_ai.request.model`、`gen_ai.operation.name`、`gen_ai.usage.*`
- `openclaw.run`
  - `openclaw.outcome`、`openclaw.channel`、`openclaw.provider`、`openclaw.model`、`openclaw.errorCategory`
- `openclaw.model.call`
  - 默认为 `gen_ai.system`，或在选择加入最新的 GenAI 语义约定时为 `gen_ai.provider.name`
  - `gen_ai.request.model`、`gen_ai.operation.name`、`openclaw.provider`、`openclaw.model`、`openclaw.api`、`openclaw.transport`
  - `openclaw.errorCategory` 和错误时的可选 `openclaw.failureKind`
  - `openclaw.model_call.request_bytes`、`openclaw.model_call.response_bytes`、`openclaw.model_call.time_to_first_byte_ms`
  - `openclaw.provider.request_id_hash`（上游提供商请求 ID 的基于 SHA 的有界哈希；不导出原始 ID）
- `openclaw.harness.run`
  - `openclaw.harness.id`、`openclaw.harness.plugin`、`openclaw.outcome`、`openclaw.provider`、`openclaw.model`、`openclaw.channel`
  - 完成时：`openclaw.harness.result_classification`、`openclaw.harness.yield_detected`、`openclaw.harness.items.started`、`openclaw.harness.items.completed`、`openclaw.harness.items.active`
  - 错误时：`openclaw.harness.phase`、`openclaw.errorCategory`、可选 `openclaw.harness.cleanup_failed`
- `openclaw.tool.execution`
  - `gen_ai.tool.name`、`openclaw.toolName`、`openclaw.errorCategory`、`openclaw.tool.params.*`
- `openclaw.exec`
  - `openclaw.exec.target`、`openclaw.exec.mode`、`openclaw.outcome`、`openclaw.failureKind`、`openclaw.exec.command_length`、`openclaw.exec.exit_code`、`openclaw.exec.timed_out`
- `openclaw.webhook.processed`
  - `openclaw.channel`、`openclaw.webhook`
- `openclaw.webhook.error`
  - `openclaw.channel`、`openclaw.webhook`、`openclaw.error`
- `openclaw.message.processed`
  - `openclaw.channel`、`openclaw.outcome`、`openclaw.reason`
- `openclaw.message.delivery`
  - `openclaw.channel`, `openclaw.delivery.kind`, `openclaw.outcome`, `openclaw.errorCategory`, `openclaw.delivery.result_count`
- `openclaw.session.stuck`
  - `openclaw.state`, `openclaw.ageMs`, `openclaw.queueDepth`
- `openclaw.context.assembled`
  - `openclaw.prompt.size`, `openclaw.history.size`, `openclaw.context.tokens`, `openclaw.errorCategory` (无提示、历史、响应或会话密钥内容)
- `openclaw.tool.loop`
  - `openclaw.toolName`, `openclaw.outcome`, `openclaw.iterations`, `openclaw.errorCategory` (无循环消息、参数或工具输出)
- `openclaw.memory.pressure`
  - `openclaw.memory.level`, `openclaw.memory.heap_used_bytes`, `openclaw.memory.rss_bytes`

当明确启用内容捕获时，模型和工具跨度还可以包含针对您选择启用的特定内容类别的有界、已编辑的 `openclaw.content.*` 属性。

## 诊断事件目录

以下事件支持上述指标和跨度。插件也可以在不进行 OTLP 导出的情况下直接订阅这些事件。

**模型使用情况**

- `model.usage` - tokens（令牌）、cost（成本）、duration（持续时间）、context（上下文）、提供商/模型/渠道（提供商/模型/渠道）、
  会话 ids（会话 ID）。`usage` 是用于成本和遥测的提供商/轮次核算；
  `context.used` 是当前的提示/上下文快照，当涉及缓存输入或工具循环调用时，它可能低于
  提供商 `usage.total`。

**消息流**

- `webhook.received` / `webhook.processed` / `webhook.error`
- `message.queued` / `message.processed`
- `message.delivery.started` / `message.delivery.completed` / `message.delivery.error`

**队列和会话**

- `queue.lane.enqueue` / `queue.lane.dequeue`
- `session.state` / `session.long_running` / `session.stalled` / `session.stuck`
- `run.attempt` / `run.progress`
- `diagnostic.heartbeat`（聚合计数器：webhooks/queue/会话）

**Harness 生命周期**

- `harness.run.started` / `harness.run.completed` / `harness.run.error` -
  代理 harness 的单次运行生命周期。包括 `harnessId`、可选的
  `pluginId`、提供商/模型/渠道（渠道）以及运行 ID。完成时会添加
  `durationMs`、`outcome`、可选的 `resultClassification`、`yieldDetected`
  和 `itemLifecycle` 计数。错误会添加 `phase`
  （`prepare`/`start`/`send`/`resolve`/`cleanup`）、`errorCategory` 和
  可选的 `cleanupFailed`。

**Exec**

- `exec.process.completed` - 终结结果、持续时间、目标、模式、退出
  代码和失败类型。不包含命令文本和工作目录。

## 不使用导出器

您可以让诊断事件对插件或自定义接收器可用，而无需
运行 `diagnostics-otel`：

```json5
{
  diagnostics: { enabled: true },
}
```

要获取定向的调试输出而不引发 `logging.level`，请使用诊断
标志（flags）。标志不区分大小写并支持通配符（例如 `telegram.*` 或
`*`）：

```json5
{
  diagnostics: { flags: ["telegram.http"] },
}
```

或者作为一次性环境变量覆盖：

```bash
OPENCLAW_DIAGNOSTICS=telegram.http,telegram.payload openclaw gateway
```

标志输出会进入标准日志文件（`logging.file`），并且仍
会由 `logging.redactSensitive` 进行编辑。完整指南：
[诊断标志](/zh/diagnostics/flags)。

## 禁用

```json5
{
  diagnostics: { otel: { enabled: false } },
}
```

您也可以将 `diagnostics-otel` 从 `plugins.allow` 中移除，或者运行
`openclaw plugins disable diagnostics-otel`。

## 相关

- [日志记录](/zh/logging) - 文件日志、控制台输出、CLI 跟踪以及控制 UI 日志选项卡
- [Gateway(网关) 日志记录内部机制](/zh/gateway/logging) - WS 日志样式、子系统前缀和控制台捕获
- [诊断标志](/zh/diagnostics/flags) - 针对性的调试日志标志
- [诊断导出](/zh/gateway/diagnostics) - 运维支持包工具（与 OTEL 导出分离）
- [配置参考](/zh/gateway/configuration-reference#diagnostics) - 完整的 `diagnostics.*` 字段参考
