---
summary: "透過 diagnostics-otel 外掛程式將 OpenClaw 診斷資料匯出至任何 OpenTelemetry 收集器 (OTLP/HTTP)"
title: "OpenTelemetry 匯出"
read_when:
  - You want to send OpenClaw model usage, message flow, or session metrics to an OpenTelemetry collector
  - You are wiring traces, metrics, or logs into Grafana, Datadog, Honeycomb, New Relic, Tempo, or another OTLP backend
  - You need the exact metric names, span names, or attribute shapes to build dashboards or alerts
---

OpenClaw 透過內建的 `diagnostics-otel` 外掛程式，使用 **OTLP/HTTP (protobuf)** 匯出診斷資料。任何接受 OTLP/HTTP 的收集器或後端皆可在無需變更程式碼的情況下運作。如需了解本機檔案紀錄及讀取方式，請參閱[紀錄](/zh-Hant/logging)。

## 運作方式

- **診斷事件** 是由 Gateway 和內建外掛程式針對模型執行、訊息流程、工作階段、佇列和 exec 所發出的結構化程序內記錄。
- **`diagnostics-otel` 外掛程式** 會訂閱這些事件，並透過 OTLP/HTTP 將其匯出為 OpenTelemetry **指標**、**追蹤**和**紀錄**。
- 當提供者傳輸接受自訂標頭時，**提供者呼叫** 會從 OpenClaw 受信任的模型呼叫範圍內容接收 W3C `traceparent` 標頭。外掛程式發出的追蹤內容不會被傳播。
- 只有在啟用診斷表面和該外掛程式時，匯出器才會附加，因此預設情況下的程序內開銷接近於零。

## 快速開始

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

您也可以從 CLI 啟用該外掛程式：

```bash
openclaw plugins enable diagnostics-otel
```

<Note>`protocol` 目前僅支援 `http/protobuf`。`grpc` 會被忽略。</Note>

## 匯出的訊號

| 訊號     | 包含內容                                                                                                     |
| -------- | ------------------------------------------------------------------------------------------------------------ |
| **指標** | 用於 token 使用量、成本、執行持續時間、訊息流程、佇列通道、工作階段狀態、exec 和記憶體壓力的計數器和直方圖。 |
| **追蹤** | 針對模型使用量、模型呼叫、工具生命週期、工具執行、exec、webhook/訊息處理、內容組裝和工具迴圈的範圍。         |
| **紀錄** | 當啟用 `diagnostics.otel.logs` 時，透過 OTLP 匯出的結構化 `logging.file` 記錄。                              |

獨立切換 `traces`、`metrics` 和 `logs`。當 `diagnostics.otel.enabled` 為 true 時，這三者預設皆為開啟。

## 設定參考

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

| 變數                                                                                                              | 用途                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT`                                                                                     | 覆寫 `diagnostics.otel.endpoint`。如果值已包含 `/v1/traces`、`/v1/metrics` 或 `/v1/logs`，則將按原樣使用。                                                                      |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` / `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` / `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` | 當對應的 `diagnostics.otel.*Endpoint` 設定鍵未設定時，使用的特定訊號端點覆寫。特定訊號的設定優先於特定訊號的環境變數，而環境變數又優先於共用端點。                              |
| `OTEL_SERVICE_NAME`                                                                                               | 覆寫 `diagnostics.otel.serviceName`。                                                                                                                                           |
| `OTEL_EXPORTER_OTLP_PROTOCOL`                                                                                     | 覆寫傳輸協議（目前僅支援 `http/protobuf`）。                                                                                                                                    |
| `OTEL_SEMCONV_STABILITY_OPT_IN`                                                                                   | 設定為 `gen_ai_latest_experimental` 以發出最新的實驗性 GenAI span 屬性 (`gen_ai.provider.name`)，而非舊版的 `gen_ai.system`。無論如何，GenAI 指標始終使用有界的低基數語義屬性。 |
| `OPENCLAW_OTEL_PRELOADED`                                                                                         | 當另一個預載或主程序已註冊全域 OpenTelemetry SDK 時，請設定為 `1`。該外掛程式隨後會跳過自己的 NodeSDK 生命週期，但仍會連接診斷監聽器並遵守 `traces`/`metrics`/`logs`。          |

## 隱私權與內容擷取

依預設**不會**匯出原始模型/工具內容。Span 攜帶有界的識別碼（channel、provider、model、錯誤類別、僅雜湊的請求 ID），且絕不包含提示詞文字、回應文字、工具輸入、工具輸出或會話金鑰。

輸出的模型請求可能包含 W3C `traceparent` 標頭。該標頭僅根據作用中模型呼叫的 OpenClaw 擁有之診斷追蹤內容產生。現有呼叫者提供的 `traceparent` 標頭會被取代，因此外掛程式或自訂提供者選項無法偽造跨服務追蹤的祖系。

僅當您的收集器和保留原則已獲批准處理提示詞、回應、工具或系統提示詞文字時，才將 `diagnostics.otel.captureContent.*` 設定為 `true`。每個子鍵均需獨立選擇加入：

- `inputMessages` — 使用者提示詞內容。
- `outputMessages` — 模型回應內容。
- `toolInputs` — 工具參數內容。
- `toolOutputs` — 工具結果內容。
- `systemPrompt` — 組裝後的系統/開發者提示。

當啟用任何子鍵時，模型和工具範圍將獲得針對該類別的有界、已編輯的 `openclaw.content.*` 屬性。

## 取樣與排清

- **追蹤：** `diagnostics.otel.sampleRate` (僅限根範圍，`0.0` 丟棄所有，
  `1.0` 保留所有)。
- **指標：** `diagnostics.otel.flushIntervalMs` (最少 `1000`)。
- **日誌：** OTLP 日誌遵循 `logging.level` (檔案日誌層級)。它們使用
  診斷日誌記錄編輯路徑，而非主控台格式。高負載安裝應優先選擇 OTLP 收集器的取樣/篩選，而非本機取樣。
- **檔案日誌關聯：** 當日誌呼叫攜帶有效的診斷追蹤內容時，JSONL 檔案日誌會包含頂層 `traceId`，
  `spanId`、`parentSpanId` 和 `traceFlags`，這讓日誌處理器能將本機日誌行與
  匯出的範圍結合。
- **請求關聯：** Gateway HTTP 請求和 WebSocket 框架會建立
  內部請求追蹤範圍。該範圍內的日誌和診斷事件
  預設繼承請求追蹤，而代理程式執行和模型呼叫範圍
  則建立為子項，以便提供者 `traceparent` 標頭保持在同一追蹤上。

## 匯出的指標

### 模型使用量

- `openclaw.tokens` (計數器，屬性：`openclaw.token`、`openclaw.channel`、`openclaw.provider`、`openclaw.model`、`openclaw.agent`)
- `openclaw.cost.usd` (計數器，屬性：`openclaw.channel`、`openclaw.provider`、`openclaw.model`)
- `openclaw.run.duration_ms` (直方圖，屬性：`openclaw.channel`、`openclaw.provider`、`openclaw.model`)
- `openclaw.context.tokens`（直方圖，attrs：`openclaw.context`、`openclaw.channel`、`openclaw.provider`、`openclaw.model`）
- `gen_ai.client.token.usage`（直方圖，GenAI 語意慣例指標，attrs：`gen_ai.token.type` = `input`/`output`、`gen_ai.provider.name`、`gen_ai.operation.name`、`gen_ai.request.model`）
- `gen_ai.client.operation.duration`（直方圖，秒，GenAI 語意慣例指標，attrs：`gen_ai.provider.name`、`gen_ai.operation.name`、`gen_ai.request.model`，可選 `error.type`）
- `openclaw.model_call.duration_ms`（直方圖，attrs：`openclaw.provider`、`openclaw.model`、`openclaw.api`、`openclaw.transport`，加上分類錯誤上的 `openclaw.errorCategory` 和 `openclaw.failureKind`）
- `openclaw.model_call.request_bytes`（直方圖，最終模型請求負載的 UTF-8 位元組大小；不包含原始負載內容）
- `openclaw.model_call.response_bytes`（直方圖，串流模型回應事件的 UTF-8 位元組大小；不包含原始回應內容）
- `openclaw.model_call.time_to_first_byte_ms`（直方圖，第一個串流回應事件之前的經過時間）

### 訊息流程

- `openclaw.webhook.received`（計數器，attrs：`openclaw.channel`、`openclaw.webhook`）
- `openclaw.webhook.error`（計數器，attrs：`openclaw.channel`、`openclaw.webhook`）
- `openclaw.webhook.duration_ms`（直方圖，attrs：`openclaw.channel`、`openclaw.webhook`）
- `openclaw.message.queued`（計數器，attrs：`openclaw.channel`、`openclaw.source`）
- `openclaw.message.processed`（計數器，attrs：`openclaw.channel`、`openclaw.outcome`）
- `openclaw.message.duration_ms`（直方圖，attrs：`openclaw.channel`、`openclaw.outcome`）
- `openclaw.message.delivery.started` (計數器，屬性：`openclaw.channel`, `openclaw.delivery.kind`)
- `openclaw.message.delivery.duration_ms` (直方圖，屬性：`openclaw.channel`, `openclaw.delivery.kind`, `openclaw.outcome`, `openclaw.errorCategory`)

### 佇列與會話

- `openclaw.queue.lane.enqueue` (計數器，屬性：`openclaw.lane`)
- `openclaw.queue.lane.dequeue` (計數器，屬性：`openclaw.lane`)
- `openclaw.queue.depth` (直方圖，屬性：`openclaw.lane` 或 `openclaw.channel=heartbeat`)
- `openclaw.queue.wait_ms` (直方圖，屬性：`openclaw.lane`)
- `openclaw.session.state` (計數器，屬性：`openclaw.state`, `openclaw.reason`)
- `openclaw.session.stuck` (計數器，屬性：`openclaw.state`)
- `openclaw.session.stuck_age_ms` (直方圖，屬性：`openclaw.state`)
- `openclaw.run.attempt` (計數器，屬性：`openclaw.attempt`)

### Harness 生命週期

- `openclaw.harness.duration_ms` (直方圖，屬性：`openclaw.harness.id`, `openclaw.harness.plugin`, `openclaw.outcome`, `openclaw.harness.phase` 於錯誤時)

### 執行

- `openclaw.exec.duration_ms` (直方圖，屬性：`openclaw.exec.target`, `openclaw.exec.mode`, `openclaw.outcome`, `openclaw.failureKind`)

### 診斷內部機制 (記憶體與工具迴圈)

- `openclaw.memory.heap_used_bytes` (直方圖，屬性：`openclaw.memory.kind`)
- `openclaw.memory.rss_bytes` (直方圖)
- `openclaw.memory.pressure` (計數器，屬性：`openclaw.memory.level`)
- `openclaw.tool.loop.iterations` (計數器，屬性：`openclaw.toolName`, `openclaw.outcome`)
- `openclaw.tool.loop.duration_ms` (直方圖，屬性：`openclaw.toolName`, `openclaw.outcome`)

## 匯出的 Span

- `openclaw.model.usage`
  - `openclaw.channel`, `openclaw.provider`, `openclaw.model`
  - `openclaw.tokens.*` (input/output/cache_read/cache_write/total)
  - 預設為 `gen_ai.system`，或在選用最新的 GenAI 語意慣例時為 `gen_ai.provider.name`
  - `gen_ai.request.model`, `gen_ai.operation.name`, `gen_ai.usage.*`
- `openclaw.run`
  - `openclaw.outcome`, `openclaw.channel`, `openclaw.provider`, `openclaw.model`, `openclaw.errorCategory`
- `openclaw.model.call`
  - 預設為 `gen_ai.system`，或在選用最新的 GenAI 語意慣例時為 `gen_ai.provider.name`
  - `gen_ai.request.model`, `gen_ai.operation.name`, `openclaw.provider`, `openclaw.model`, `openclaw.api`, `openclaw.transport`
  - `openclaw.errorCategory` 以及錯誤時的可選 `openclaw.failureKind`
  - `openclaw.model_call.request_bytes`, `openclaw.model_call.response_bytes`, `openclaw.model_call.time_to_first_byte_ms`
  - `openclaw.provider.request_id_hash` (上游提供者請求 ID 的有界 SHA 雜湊；不會匯出原始 ID)
- `openclaw.harness.run`
  - `openclaw.harness.id`, `openclaw.harness.plugin`, `openclaw.outcome`, `openclaw.provider`, `openclaw.model`, `openclaw.channel`
  - 完成時：`openclaw.harness.result_classification`, `openclaw.harness.yield_detected`, `openclaw.harness.items.started`, `openclaw.harness.items.completed`, `openclaw.harness.items.active`
  - 錯誤時：`openclaw.harness.phase`, `openclaw.errorCategory`, 可選的 `openclaw.harness.cleanup_failed`
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
  - `openclaw.prompt.size`, `openclaw.history.size`, `openclaw.context.tokens`, `openclaw.errorCategory` (無提示、歷史記錄、回應或 session-key 內容)
- `openclaw.tool.loop`
  - `openclaw.toolName`, `openclaw.outcome`, `openclaw.iterations`, `openclaw.errorCategory` (無迴圈訊息、參數或工具輸出)
- `openclaw.memory.pressure`
  - `openclaw.memory.level`, `openclaw.memory.heap_used_bytes`, `openclaw.memory.rss_bytes`

當內容捕獲被明確啟用時，模型和工具範圍還可以包含針對您選擇加入的特定內容類別的受限、經過編輯的 `openclaw.content.*` 屬性。

## 診斷事件目錄

以下事件支援上述指標和範圍。外掛程式也可以直接訂閱這些事件，而無需透過 OTLP 匯出。

**模型使用情況**

- `model.usage` — tokens、cost、duration、context、provider/model/channel、
  session ids。`usage` 是用於成本和遙測的 provider/turn 會計；
  `context.used` 是當前的 prompt/context 快照，並且當涉及快取輸入或 tool-loop 呼叫時，可能低於
  provider `usage.total`。

**訊息流程**

- `webhook.received` / `webhook.processed` / `webhook.error`
- `message.queued` / `message.processed`
- `message.delivery.started` / `message.delivery.completed` / `message.delivery.error`

**佇列和會話**

- `queue.lane.enqueue` / `queue.lane.dequeue`
- `session.state` / `session.stuck`
- `run.attempt`
- `diagnostic.heartbeat` (聚合計數器：webhooks/queue/session)

**Harness 生命週期**

- `harness.run.started` / `harness.run.completed` / `harness.run.error` —
  代理程式 harness 的每次執行生命週期。包括 `harnessId`、可選的
  `pluginId`、provider/model/channel 和 run id。完成時會新增
  `durationMs`、`outcome`、可選的 `resultClassification`、`yieldDetected`
  和 `itemLifecycle` 計數。錯誤會新增 `phase`
  (`prepare`/`start`/`send`/`resolve`/`cleanup`)、`errorCategory` 和
  可選的 `cleanupFailed`。

**Exec**

- `exec.process.completed` — 最終結果、duration、target、mode、exit
  code 和 failure kind。不包含指令文字和工作目錄。

## 沒有匯出器

您可以在不運行 `diagnostics-otel` 的情況下，讓診斷事件可供外掛程式或自訂接收器使用：

```json5
{
  diagnostics: { enabled: true },
}
```

若要取得目標除錯輸出而不提高 `logging.level`，請使用診斷旗標。旗標不區分大小寫並支援萬用字元（例如 `telegram.*` 或
`*`）：

```json5
{
  diagnostics: { flags: ["telegram.http"] },
}
```

或是作為單次環境變數覆寫：

```bash
OPENCLAW_DIAGNOSTICS=telegram.http,telegram.payload openclaw gateway
```

旗標輸出會進入標準日誌檔案 (`logging.file`)，且仍會被 `logging.redactSensitive` 編輯。完整指南：
[Diagnostics flags](/zh-Hant/diagnostics/flags)。

## 停用

```json5
{
  diagnostics: { otel: { enabled: false } },
}
```

您也可以將 `diagnostics-otel` 從 `plugins.allow` 中移除，或是執行
`openclaw plugins disable diagnostics-otel`。

## 相關

- [Logging](/zh-Hant/logging) — 檔案日誌、主控台輸出、CLI 追蹤，以及 Control UI Logs 分頁
- [Gateway logging internals](/zh-Hant/gateway/logging) — WS 日誌樣式、子系統前綴，以及主控台擷取
- [Diagnostics flags](/zh-Hant/diagnostics/flags) — 目標除錯日誌旗標
- [Diagnostics export](/zh-Hant/gateway/diagnostics) — 操作員支援套件工具（與 OTEL 匯出分開）
- [Configuration reference](/zh-Hant/gateway/configuration-reference#diagnostics) — 完整的 `diagnostics.*` 欄位參考
