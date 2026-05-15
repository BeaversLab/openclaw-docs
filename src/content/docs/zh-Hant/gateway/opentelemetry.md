---
summary: "透過 diagnostics-otel 插件 (OTLP/HTTP) 將 OpenClaw 診斷數據匯出至任何 OpenTelemetry 收集器"
title: "OpenTelemetry 匯出"
read_when:
  - You want to send OpenClaw model usage, message flow, or session metrics to an OpenTelemetry collector
  - You are wiring traces, metrics, or logs into Grafana, Datadog, Honeycomb, New Relic, Tempo, or another OTLP backend
  - You need the exact metric names, span names, or attribute shapes to build dashboards or alerts
---

OpenClaw 透過官方 `diagnostics-otel` 插件匯出診斷數據，
使用 **OTLP/HTTP (protobuf)**。任何接受 OTLP/HTTP 的
收集器或後端無需修改代碼即可運作。關於本機檔案日誌及其讀取方式，請參閱
[日誌記錄](/zh-Hant/logging)。

## 運作方式

- **診斷事件** 是由 Gateway 和內建外掛程式針對模型執行、訊息流程、工作階段、佇列和 exec 所發出的結構化程序內記錄。
- **`diagnostics-otel` 插件** 會訂閱這些事件，並透過 OTLP/HTTP
  將其匯出為 OpenTelemetry **指標**、**追蹤** 和 **日誌**。
- **提供者調用** 當提供者傳輸接受自訂標頭時，
  會從 OpenClaw 的可信模型調用範圍上下文接收 W3C `traceparent` 標頭。
  插件發出的追蹤上下文不會被傳播。
- 只有在啟用診斷表面和該外掛程式時，匯出器才會附加，因此預設情況下的程序內開銷接近於零。

## 快速開始

對於套件安裝，請先安裝插件：

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

您也可以從 CLI 啟用該插件：

```bash
openclaw plugins enable diagnostics-otel
```

<Note>`protocol` 目前僅支援 `http/protobuf`。`grpc` 會被忽略。</Note>

## 匯出的信號

| 信號     | 包含內容                                                                                                             |
| -------- | -------------------------------------------------------------------------------------------------------------------- |
| **指標** | 關於 Token 使用量、成本、執行時間、訊息流程、Talk 事件、佇列通道、會話狀態/復原、執行 和記憶體壓力的計數器和直方圖。 |
| **追蹤** | 用於模型使用量、模型調用、Harness 生命週期、工具執行、Exec、Webhook/訊息處理、上下文組裝和工具迴圈的範圍。           |
| **日誌** | 當啟用 `diagnostics.otel.logs` 時，透過 OTLP 匯出的結構化 `logging.file` 記錄。                                      |

獨立切換 `traces`、`metrics` 和 `logs`。當 `diagnostics.otel.enabled` 為 true 時，
這三者預設皆為開啟。

## 組態參考

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

### 環境變數

| 變數                                                                                                              | 用途                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT`                                                                                     | 覆寫 `diagnostics.otel.endpoint`。如果該值已包含 `/v1/traces`、`/v1/metrics` 或 `/v1/logs`，則將其按原樣使用。                                                                   |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` / `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` / `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` | 當未設置相符的 `diagnostics.otel.*Endpoint` 配置鍵時，使用的特定信號端點覆寫。特定信號配置優先於特定信號環境變數，後者又優先於共享端點。                                         |
| `OTEL_SERVICE_NAME`                                                                                               | 覆寫 `diagnostics.otel.serviceName`。                                                                                                                                            |
| `OTEL_EXPORTER_OTLP_PROTOCOL`                                                                                     | 覆寫傳輸協議（目前僅接受 `http/protobuf`）。                                                                                                                                     |
| `OTEL_SEMCONV_STABILITY_OPT_IN`                                                                                   | 設定為 `gen_ai_latest_experimental` 以發出最新的實驗性 GenAI span 屬性（`gen_ai.provider.name`），而非舊版的 `gen_ai.system`。無論如何，GenAI 指標始終使用有界的低基數語義屬性。 |
| `OPENCLAW_OTEL_PRELOADED`                                                                                         | 當另一個預載程式或主機處理程序已註冊全域 OpenTelemetry SDK 時，設定為 `1`。此時外掛將跳過其自身的 NodeSDK 生命週期，但仍會連接診斷監聽器並遵守 `traces`/`metrics`/`logs`。       |

## 隱私與內容擷取

預設情況下**不**會匯出原始模型/工具內容。Span 携帶有界識別碼（channel、provider、model、錯誤類別、僅雜湊的 request id），且絕不包含提示詞文字、回應文字、工具輸入、工具輸出或 session keys。
Talk 指標僅匯出有界的事件元數據，例如 mode、transport、provider 和 event type。它們不包含逐字稿、音訊載荷、session ids、turn ids、call ids、room ids 或 handoff tokens。

傳出模型請求可能包含 W3C `traceparent` 標頭。該標頭僅根據 OpenClaw 擁有的目前模型呼叫診斷追蹤上下文產生。現有的呼叫方提供的 `traceparent` 標頭會被替換，因此外掛或自訂提供者選項無法偽造跨服務追蹤祖系。

僅當您的收集器和保留策略已獲准處理提示詞、回應、工具或系統提示詞文字時，才將 `diagnostics.otel.captureContent.*` 設定為 `true`。每個子鍵均需獨立選擇加入：

- `inputMessages` - 使用者提示詞內容。
- `outputMessages` - 模型回應內容。
- `toolInputs` - 工具參數酬載。
- `toolOutputs` - 工具結果酬載。
- `systemPrompt` - 組裝後的系統/開發者提示。

當啟用任何子鍵時，模型和工具區塊會獲得針對該類別的受限、已編輯
`openclaw.content.*` 屬性。

## 抽樣和排清

- **追蹤：** `diagnostics.otel.sampleRate` (僅根區塊，`0.0` 丟棄全部，
  `1.0` 保留全部)。
- **指標：** `diagnostics.otel.flushIntervalMs` (最少 `1000`)。
- **日誌：** OTLP 日誌遵循 `logging.level` (檔案日誌層級)。它們使用
  診斷日誌記錄編輯路徑，而非主控台格式化。高流量
  安裝應偏好 OTLP 收集器抽樣/過濾，而非本機抽樣。
- **檔案日誌關聯：** 當日誌呼叫攜帶有效的
  診斷追蹤上下文時，JSONL 檔案日誌會包含頂層 `traceId`、
  `spanId`、`parentSpanId` 和 `traceFlags`，這讓日誌處理器能將本機日誌行與
  匯出的區塊結合。
- **請求關聯：** Gateway HTTP 請求和 WebSocket 框架建立一個
  內部請求追蹤範圍。該範圍內的日誌和診斷事件
  預設繼承請求追蹤，而代理執行和模型呼叫區塊
  則建立為子區塊，以便提供者 `traceparent` 標頭保持在同一追蹤上。

## 匯出的指標

### 模型使用量

- `openclaw.tokens` (計數器，屬性：`openclaw.token`、`openclaw.channel`、`openclaw.provider`、`openclaw.model`、`openclaw.agent`)
- `openclaw.cost.usd` (計數器，屬性：`openclaw.channel`、`openclaw.provider`、`openclaw.model`)
- `openclaw.run.duration_ms` (直方圖，屬性：`openclaw.channel`、`openclaw.provider`、`openclaw.model`)
- `openclaw.context.tokens` (直方圖，屬性：`openclaw.context`、`openclaw.channel`、`openclaw.provider`、`openclaw.model`)
- `gen_ai.client.token.usage` (直方圖, GenAI 語義約定指標, 屬性: `gen_ai.token.type` = `input`/`output`, `gen_ai.provider.name`, `gen_ai.operation.name`, `gen_ai.request.model`)
- `gen_ai.client.operation.duration` (直方圖, 秒, GenAI 語義約定指標, 屬性: `gen_ai.provider.name`, `gen_ai.operation.name`, `gen_ai.request.model`, 選用 `error.type`)
- `openclaw.model_call.duration_ms` (直方圖, 屬性: `openclaw.provider`, `openclaw.model`, `openclaw.api`, `openclaw.transport`, 加上分類錯誤上的 `openclaw.errorCategory` 和 `openclaw.failureKind`)
- `openclaw.model_call.request_bytes` (直方圖, 最終模型請求承載的 UTF-8 位元組大小; 不包含原始承載內容)
- `openclaw.model_call.response_bytes` (直方圖, 串流模型回應事件的 UTF-8 位元組大小; 不包含原始回應內容)
- `openclaw.model_call.time_to_first_byte_ms` (直方圖, 第一個串流回應事件之前的經過時間)

### 訊息流

- `openclaw.webhook.received` (計數器, 屬性: `openclaw.channel`, `openclaw.webhook`)
- `openclaw.webhook.error` (計數器, 屬性: `openclaw.channel`, `openclaw.webhook`)
- `openclaw.webhook.duration_ms` (直方圖, 屬性: `openclaw.channel`, `openclaw.webhook`)
- `openclaw.message.queued` (計數器, 屬性: `openclaw.channel`, `openclaw.source`)
- `openclaw.message.processed` (計數器, 屬性: `openclaw.channel`, `openclaw.outcome`)
- `openclaw.message.duration_ms` (直方圖, 屬性: `openclaw.channel`, `openclaw.outcome`)
- `openclaw.message.delivery.started` (計數器, 屬性: `openclaw.channel`, `openclaw.delivery.kind`)
- `openclaw.message.delivery.duration_ms` (直方圖, attrs: `openclaw.channel`, `openclaw.delivery.kind`, `openclaw.outcome`, `openclaw.errorCategory`)

### Talk

- `openclaw.talk.event` (計數器, attrs: `openclaw.talk.event_type`, `openclaw.talk.mode`, `openclaw.talk.transport`, `openclaw.talk.brain`, `openclaw.talk.provider`)
- `openclaw.talk.event.duration_ms` (直方圖, attrs: 與 `openclaw.talk.event` 相同; 當 Talk 事件回報持續時間時發出)
- `openclaw.talk.audio.bytes` (直方圖, attrs: 與 `openclaw.talk.event` 相同; 針對回報位元組長度的 Talk 音訊幀事件發出)

### 佇列與工作階段

- `openclaw.queue.lane.enqueue` (計數器, attrs: `openclaw.lane`)
- `openclaw.queue.lane.dequeue` (計數器, attrs: `openclaw.lane`)
- `openclaw.queue.depth` (直方圖, attrs: `openclaw.lane` 或 `openclaw.channel=heartbeat`)
- `openclaw.queue.wait_ms` (直方圖, attrs: `openclaw.lane`)
- `openclaw.session.state` (計數器, attrs: `openclaw.state`, `openclaw.reason`)
- `openclaw.session.stuck` (計數器, attrs: `openclaw.state`; 僅針對無活躍工作的過期工作階段維護發出)
- `openclaw.session.stuck_age_ms` (直方圖, attrs: `openclaw.state`; 僅針對無活躍工作的過期工作階段維護發出)
- `openclaw.session.recovery.requested` (計數器, attrs: `openclaw.state`, `openclaw.action`, `openclaw.active_work_kind`, `openclaw.reason`)
- `openclaw.session.recovery.completed` (計數器, attrs: `openclaw.state`, `openclaw.action`, `openclaw.status`, `openclaw.active_work_kind`, `openclaw.reason`)
- `openclaw.session.recovery.age_ms` (直方圖, attrs: 與對應的復原計數器相同)
- `openclaw.run.attempt` (計數器, attrs: `openclaw.attempt`)

### 工作階段存活度遙測

`diagnostics.stuckSessionWarnMs` 是會話存活診斷的無進行時間閾值。當 OpenClaw 觀察到回覆、工具、狀態、區塊或 ACP 執行時進行時，`processing` 會話不會朝此閾值增長。輸入保持訊號不算作進行，因此偵測器仍可偵測到無聲的模型或線具。

OpenClaw 根據其仍能觀察到的工作將會話分類：

- `session.long_running`：主動的嵌入式工作、模型呼叫或工具呼叫仍在持續進行。
- `session.stalled`：存在主動工作，但主動執行尚未回報最近的進行。停滯的嵌入式執行最初會保持僅觀察狀態，然後在 `diagnostics.stuckSessionAbortMs` 無進行後終止排空，以便通道後排隊的回合能夠恢復。若未設定，終止閾值預設為較安全的擴展視窗，即至少 10 分鐘和 5 倍的 `diagnostics.stuckSessionWarnMs`。
- `session.stuck`：無主動工作的過時會話記錄。這會立即釋放受影響的會話通道。

恢復會發出結構化的 `session.recovery.requested` 和 `session.recovery.completed` 事件。診斷會話狀態僅在變更的恢復結果（`aborted` 或 `released`）之後，且僅當相同的處理世代仍處於當前狀態時，才會被標記為閒置。

只有 `session.stuck` 會發出 `openclaw.session.stuck` 計數器、`openclaw.session.stuck_age_ms` 直方圖和 `openclaw.session.stuck` 跨度。當會話保持不變時，重複的 `session.stuck` 診斷會退避，因此儀表板應針對持續增加發出警示，而非每次心跳跳動。有關設定旋鈕和預設值，請參閱[組態參考](/zh-Hant/gateway/configuration-reference#diagnostics)。

### 線具生命週期

- `openclaw.harness.duration_ms` (直方圖, 屬性: `openclaw.harness.id`, `openclaw.harness.plugin`, `openclaw.outcome`, 發生錯誤時為 `openclaw.harness.phase`)

### Exec

- `openclaw.exec.duration_ms` (直方圖, 屬性: `openclaw.exec.target`, `openclaw.exec.mode`, `openclaw.outcome`, `openclaw.failureKind`)

### 診斷內部機制 (記憶體與工具迴圈)

- `openclaw.memory.heap_used_bytes` (直方圖, 屬性: `openclaw.memory.kind`)
- `openclaw.memory.rss_bytes` (直方圖)
- `openclaw.memory.pressure` (計數器, 屬性: `openclaw.memory.level`)
- `openclaw.tool.loop.iterations` (計數器, 屬性: `openclaw.toolName`, `openclaw.outcome`)
- `openclaw.tool.loop.duration_ms` (直方圖, 屬性: `openclaw.toolName`, `openclaw.outcome`)

## 匯出的 Span

- `openclaw.model.usage`
  - `openclaw.channel`, `openclaw.provider`, `openclaw.model`
  - `openclaw.tokens.*` (輸入/輸出/快取讀取/快取寫入/總計)
  - 預設為 `gen_ai.system`，或在選用最新的 GenAI 語意慣例時為 `gen_ai.provider.name`
  - `gen_ai.request.model`, `gen_ai.operation.name`, `gen_ai.usage.*`
- `openclaw.run`
  - `openclaw.outcome`, `openclaw.channel`, `openclaw.provider`, `openclaw.model`, `openclaw.errorCategory`
- `openclaw.model.call`
  - 預設為 `gen_ai.system`，或在選用最新的 GenAI 語意慣例時為 `gen_ai.provider.name`
  - `gen_ai.request.model`, `gen_ai.operation.name`, `openclaw.provider`, `openclaw.model`, `openclaw.api`, `openclaw.transport`
  - `openclaw.errorCategory` 以及錯誤時可選的 `openclaw.failureKind`
  - `openclaw.model_call.request_bytes`, `openclaw.model_call.response_bytes`, `openclaw.model_call.time_to_first_byte_ms`
  - `openclaw.provider.request_id_hash` (上游提供者請求 ID 的有界 SHA 雜湊值；原始 ID 不會被匯出)
- `openclaw.harness.run`
  - `openclaw.harness.id`, `openclaw.harness.plugin`, `openclaw.outcome`, `openclaw.provider`, `openclaw.model`, `openclaw.channel`
  - 完成時：`openclaw.harness.result_classification`, `openclaw.harness.yield_detected`, `openclaw.harness.items.started`, `openclaw.harness.items.completed`, `openclaw.harness.items.active`
  - 發生錯誤時：`openclaw.harness.phase`, `openclaw.errorCategory`, 選填 `openclaw.harness.cleanup_failed`
- `openclaw.tool.execution`
  - `gen_ai.tool.name`, `openclaw.toolName`, `openclaw.errorCategory`, `openclaw.tool.params.*`
- `openclaw.exec`
  - `openclaw.exec.target`, `openclaw.exec.mode`, `openclaw.outcome`, `openclaw.failureKind`, `openclaw.exec.command_length`, `openclaw.exec.exit_code`, `openclaw.exec.timed_out`
- `openclaw.webhook.processed`
  - `openclaw.channel`, `openclaw.webhook`
- `openclaw.webhook.error`
  - `openclaw.channel`, `openclaw.webhook`, `openclaw.error`
- `openclaw.message.processed`
  - `openclaw.channel`, `openclaw.outcome`, `openclaw.reason`
- `openclaw.message.delivery`
  - `openclaw.channel`, `openclaw.delivery.kind`, `openclaw.outcome`, `openclaw.errorCategory`, `openclaw.delivery.result_count`
- `openclaw.session.stuck`
  - `openclaw.state`, `openclaw.ageMs`, `openclaw.queueDepth`
- `openclaw.context.assembled`
  - `openclaw.prompt.size`, `openclaw.history.size`, `openclaw.context.tokens`, `openclaw.errorCategory` (無提示、歷史、回應或 session-key 內容)
- `openclaw.tool.loop`
  - `openclaw.toolName`, `openclaw.outcome`, `openclaw.iterations`, `openclaw.errorCategory` (無迴圈訊息、參數或工具輸出)
- `openclaw.memory.pressure`
  - `openclaw.memory.level`, `openclaw.memory.heap_used_bytes`, `openclaw.memory.rss_bytes`

當內容捕獲被明確啟用時，模型和工具範圍還可以包含針對您選擇加入的特定內容類別的、受限且已編輯的 `openclaw.content.*` 屬性。

## 診斷事件目錄

以下事件支撐上述的指標和範圍。外掛程式也可以在無需 OTLP 匯出的情況下直接訂閱它們。

**模型使用情況**

- `model.usage` - tokens、成本、持續時間、上下文、提供者/模型/管道、
  session ids。`usage` 是針對成本和遙測的提供者/輪次會計；
  `context.used` 是當前的提示/上下文快照，當涉及快取輸入或工具循環呼叫時，
  它可能低於提供者的 `usage.total`。

**訊息流程**

- `webhook.received` / `webhook.processed` / `webhook.error`
- `message.queued` / `message.processed`
- `message.delivery.started` / `message.delivery.completed` / `message.delivery.error`

**佇列和會話**

- `queue.lane.enqueue` / `queue.lane.dequeue`
- `session.state` / `session.long_running` / `session.stalled` / `session.stuck`
- `run.attempt` / `run.progress`
- `diagnostic.heartbeat` (彙總計數器：webhooks/queue/session)

**Harness 生命週期**

- `harness.run.started` / `harness.run.completed` / `harness.run.error` -
  代理程式套件的每次執行生命週期。包含 `harnessId`、選用
  的 `pluginId`、提供者/模型/通道以及執行 ID。完成時會新增
  `durationMs`、`outcome`、選用的 `resultClassification`、`yieldDetected`
  和 `itemLifecycle` 計數。錯誤會新增 `phase`
  (`prepare`/`start`/`send`/`resolve`/`cleanup`)、`errorCategory` 和
  選用的 `cleanupFailed`。

**Exec**

- `exec.process.completed` - 最終結果、持續時間、目標、模式、結束
  代碼和失敗類型。不包含指令文字和工作目錄。

## 不使用匯出器

您可以在不執行 `diagnostics-otel` 的情況下，讓診斷事件可供外掛程式或自訂接收端使用：

```json5
{
  diagnostics: { enabled: true },
}
```

若要在不引發 `logging.level` 的情況下產生目標除錯輸出，請使用診斷
旗標。旗標不區分大小寫並支援萬用字元 (例如 `telegram.*` 或
`*`)：

```json5
{
  diagnostics: { flags: ["telegram.http"] },
}
```

或作為一次性環境變數覆寫：

```bash
OPENCLAW_DIAGNOSTICS=telegram.http,telegram.payload openclaw gateway
```

旗標輸出會進入標準日誌檔案 (`logging.file`)，且仍會
被 `logging.redactSensitive` 編修。完整指南：
[診斷旗標](/zh-Hant/diagnostics/flags)。

## 停用

```json5
{
  diagnostics: { otel: { enabled: false } },
}
```

您也可以將 `diagnostics-otel` 從 `plugins.allow` 中排除，或執行
`openclaw plugins disable diagnostics-otel`。

## 相關

- [日誌記錄](/zh-Hant/logging) - 檔案日誌、主控台輸出、CLI 追蹤以及控制 UI 日誌分頁
- [Gateway 日誌記錄內部機制](/zh-Hant/gateway/logging) - WS 日誌樣式、子系統前綴和主控台擷取
- [診斷旗標](/zh-Hant/diagnostics/flags) - 目標除錯日誌旗標
- [診斷匯出](/zh-Hant/gateway/diagnostics) - 操作員支援套件工具 (與 OTEL 匯出分開)
- [組態參考](/zh-Hant/gateway/configuration-reference#diagnostics) - 完整的 `diagnostics.*` 欄位參考
