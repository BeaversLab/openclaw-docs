---
summary: "透過 diagnostics-otel 插件 (OTLP/HTTP) 將 OpenClaw 診斷數據匯出至任何 OpenTelemetry 收集器"
title: "OpenTelemetry 匯出"
read_when:
  - You want to send OpenClaw model usage, message flow, or session metrics to an OpenTelemetry collector
  - You are wiring traces, metrics, or logs into Grafana, Datadog, Honeycomb, New Relic, Tempo, or another OTLP backend
  - You need the exact metric names, span names, or attribute shapes to build dashboards or alerts
---

OpenClaw 透過官方 `diagnostics-otel` 外掛程式匯出診斷資訊，使用 **OTLP/HTTP (protobuf)**。任何接受 OTLP/HTTP 的收集器或後端皆可無需修改程式碼直接運作。如需瞭解本機檔案紀錄及其讀取方式，請參閱 [Logging](/zh-Hant/logging)。

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

| 信號     | 包含內容                                                                                                                                                              |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **指標** | 用於 token 使用量、成本、執行時間、容錯移轉、技能使用量、訊息流程、 Talk 事件、佇列通道、工作階段狀態/恢復、工具執行、過大承載、exec 以及記憶體壓力的計數器和直方圖。 |
| **追蹤** | 關於模型使用量、模型呼叫、harness 生命週期、技能使用量、工具執行、exec、webhook/訊息處理、內容組裝和工具迴圈的 Span。                                                 |
| **日誌** | 當啟用 `diagnostics.otel.logs` 時，透過 OTLP 匯出的結構化 `logging.file` 紀錄；除非明確啟用內容擷取，否則會保留紀錄主體。                                             |

獨立切換 `traces`、`metrics` 和 `logs`。當 `diagnostics.otel.enabled` 為 true 時，Traces 和 metrics 預設為開啟。Logs 預設為關閉，
且僅在 `diagnostics.otel.logs` 明確設為 `true` 時才會匯出。

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
        toolDefinitions: false,
      },
    },
  },
}
```

### 環境變數

| 變數                                                                                                              | 用途                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT`                                                                                     | 覆寫 `diagnostics.otel.endpoint`。如果該值已包含 `/v1/traces`、`/v1/metrics` 或 `/v1/logs`，則將按原樣使用。                                                                                                                                                              |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` / `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` / `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` | 當對應的 `diagnostics.otel.*Endpoint` 設定鍵未設定時使用的特定訊號端點覆寫。特定訊號的設定優先於特定訊號的環境變數，後者又優先於共用端點。                                                                                                                                |
| `OTEL_SERVICE_NAME`                                                                                               | 覆寫 `diagnostics.otel.serviceName`。                                                                                                                                                                                                                                     |
| `OTEL_EXPORTER_OTLP_PROTOCOL`                                                                                     | 覆寫傳輸協議（目前僅接受 `http/protobuf`）。                                                                                                                                                                                                                              |
| `OTEL_SEMCONV_STABILITY_OPT_IN`                                                                                   | 設為 `gen_ai_latest_experimental` 以發出最新的實驗性 GenAI 推論 span 形狀，包括 `{gen_ai.operation.name} {gen_ai.request.model}` span 名稱、`CLIENT` span 類型和 `gen_ai.provider.name`，而不是舊版的 `gen_ai.system`。無論如何，GenAI 指標一律使用有界的低基數語意屬性。 |
| `OPENCLAW_OTEL_PRELOADED`                                                                                         | 當另一個預載或主機處理程序已註冊全域 OpenTelemetry SDK 時，設定為 `1`。該外掛程式隨後會跳過其自身的 NodeSDK 生命週期，但仍會接線診斷監聽器並遵守 `traces`/`metrics`/`logs`。                                                                                              |

## 隱私與內容擷取

原始模型/工具內容預設**不**會匯出。Span 攜帶有限的識別碼（通道、提供者、模型、錯誤類別、僅雜湊的要求 ID、工具來源、工具擁有者以及技能名稱/來源），且絕不包含提示文字、回應文字、工具輸入、工具輸出、技能檔案路徑或工作階段金鑰。OTLP 記錄檔記錄預設會保留嚴重性、記錄器、程式碼位置、受信任的追蹤內容以及經過清理的屬性，但只有在 `diagnostics.otel.captureContent` 設定為布林值 `true` 時，才會匯出原始記錄訊息內容。細微的 `captureContent.*` 子金鑰不會啟用記錄內容。看起來像是範圍代理程式工作階段金鑰的標籤會被替換為 `unknown`。交談指標僅匯出有限的事件中繼資料，例如模式、傳輸、提供者和事件類型。它們不包含逐字稿、音訊載荷、工作階段 ID、回合 ID、通話 ID、房間 ID 或移交權杖。

傳出模型要求可能包含 W3C `traceparent` 標頭。該標頭僅根據屬於 OpenClaw 的作用中模型呼叫診斷追蹤內容產生。現有的呼叫端提供的 `traceparent` 標頭會被替換，因此外掛程式或自訂提供者選項無法偽造跨服務追蹤來源。

僅當您的收集器和保留政策已核准用於提示、回應、工具或系統提示文字時，才將 `diagnostics.otel.captureContent.*` 設定為 `true`。每個子金鑰均為獨立選用：

- `inputMessages` - 使用者提示內容。
- `outputMessages` - 模型回應內容。
- `toolInputs` - 工具引數載荷。
- `toolOutputs` - 工具結果載荷。
- `systemPrompt` - 組裝的系統/開發者提示。
- `toolDefinitions` - 模型工具名稱、描述和結構描述。

當啟用任何子金鑰時，模型和工具的範圍會獲得針對該類別的受限、已編輯
`openclaw.content.*` 屬性。僅在批准匯出 OTLP 日誌
訊息主體的廣泛診斷擷取情境中，使用布林值
`captureContent: true`。

## 採樣與排清

- **追蹤：** `diagnostics.otel.sampleRate` (僅根範圍，`0.0` 會捨棄所有，
  `1.0` 會保留所有)。
- **指標：** `diagnostics.otel.flushIntervalMs` (最小值 `1000`)。
- **日誌：** OTLP 日誌會遵循 `logging.level` (檔案日誌層級)。它們使用
  診斷日誌記錄編輯路徑，而非主控台格式化。高吞吐量的
  安裝應優先選用 OTLP 收集器的採樣/篩選，而非本機採樣。
- **檔案日誌關聯：** 當日誌呼叫攜帶有效的
  診斷追蹤內容時，JSONL 檔案日誌會包含頂層 `traceId`、
  `spanId`、`parentSpanId` 和 `traceFlags`，這讓日誌處理器能將本機日誌行與
  匯出的範圍連結起來。
- **請求關聯：** Gateway HTTP 請求和 WebSocket 框架會建立一個
  內部請求追蹤範圍。該範圍內的日誌和診斷事件
  預設會繼承請求追蹤，而代理執行和模型呼叫範圍則
  建立為子項，以便提供者的 `traceparent` 標頭保持在同一個追蹤上。

## 匯出的指標

### 模型使用量

- `openclaw.tokens` (計數器，屬性： `openclaw.token`, `openclaw.channel`, `openclaw.provider`, `openclaw.model`, `openclaw.agent`)
- `openclaw.cost.usd` (計數器，屬性： `openclaw.channel`, `openclaw.provider`, `openclaw.model`)
- `openclaw.run.duration_ms` (直方圖，屬性： `openclaw.channel`, `openclaw.provider`, `openclaw.model`)
- `openclaw.context.tokens` (直方圖，屬性： `openclaw.context`, `openclaw.channel`, `openclaw.provider`, `openclaw.model`)
- `gen_ai.client.token.usage` (histogram, GenAI semantic-conventions metric, attrs: `gen_ai.token.type` = `input`/`output`, `gen_ai.provider.name`, `gen_ai.operation.name`, `gen_ai.request.model`)
- `gen_ai.client.operation.duration` (histogram, 秒, GenAI semantic-conventions metric, attrs: `gen_ai.provider.name`, `gen_ai.operation.name`, `gen_ai.request.model`, 選填 `error.type`)
- `openclaw.model_call.duration_ms` (histogram, attrs: `openclaw.provider`, `openclaw.model`, `openclaw.api`, `openclaw.transport`, 另外針對已分類錯誤還有 `openclaw.errorCategory` 和 `openclaw.failureKind`)
- `openclaw.model_call.request_bytes` (histogram, 最終模型請求承載的 UTF-8 位元組大小；不包含原始承載內容)
- `openclaw.model_call.response_bytes` (histogram，串流模型回應事件的 UTF-8 位元組大小，不包括增量事件上累積的 `partial` 快照；無原始回應內容)
- `openclaw.model_call.time_to_first_byte_ms` (histogram，第一個串流回應事件之前的經過時間)
- `openclaw.model.failover` (counter，attrs：`openclaw.provider`、`openclaw.model`、`openclaw.failover.to_provider`、`openclaw.failover.to_model`、`openclaw.failover.reason`、`openclaw.failover.suspended`、`openclaw.lane`)
- `openclaw.skill.used` (counter, attrs: `openclaw.skill.name`, `openclaw.skill.source`, `openclaw.skill.activation`, optional `openclaw.agent`, optional `openclaw.toolName`)

### 訊息流

- `openclaw.webhook.received` (counter, attrs: `openclaw.channel`, `openclaw.webhook`)
- `openclaw.webhook.error` (counter, attrs: `openclaw.channel`, `openclaw.webhook`)
- `openclaw.webhook.duration_ms` (histogram, attrs: `openclaw.channel`, `openclaw.webhook`)
- `openclaw.message.queued` (counter, attrs: `openclaw.channel`, `openclaw.source`)
- `openclaw.message.received` (counter, attrs: `openclaw.channel`, `openclaw.source`)
- `openclaw.message.dispatch.started` (counter, attrs: `openclaw.channel`, `openclaw.source`)
- `openclaw.message.dispatch.completed` (counter, attrs: `openclaw.channel`, `openclaw.outcome`, `openclaw.reason`, `openclaw.source`)
- `openclaw.message.dispatch.duration_ms` (histogram, attrs: `openclaw.channel`, `openclaw.outcome`, `openclaw.reason`, `openclaw.source`)
- `openclaw.message.processed` (counter, attrs: `openclaw.channel`, `openclaw.outcome`)
- `openclaw.message.duration_ms` (histogram, attrs: `openclaw.channel`, `openclaw.outcome`)
- `openclaw.message.delivery.started` (counter, attrs: `openclaw.channel`, `openclaw.delivery.kind`)
- `openclaw.message.delivery.duration_ms` (直方圖, attrs: `openclaw.channel`, `openclaw.delivery.kind`, `openclaw.outcome`, `openclaw.errorCategory`)

### 通話

- `openclaw.talk.event` (計數器, attrs: `openclaw.talk.event_type`, `openclaw.talk.mode`, `openclaw.talk.transport`, `openclaw.talk.brain`, `openclaw.talk.provider`)
- `openclaw.talk.event.duration_ms` (直方圖, attrs: 與 `openclaw.talk.event` 相同; 當 Talk 事件報告持續時間時發出)
- `openclaw.talk.audio.bytes` (直方圖, attrs: 與 `openclaw.talk.event` 相同; 針對報告位元組長度的 Talk 音訊幀事件發出)

### 佇列與工作階段

- `openclaw.queue.lane.enqueue` (計數器, attrs: `openclaw.lane`)
- `openclaw.queue.lane.dequeue` (計數器，屬性：`openclaw.lane`)
- `openclaw.queue.depth` (直方圖，屬性：`openclaw.lane` 或 `openclaw.channel=heartbeat`)
- `openclaw.queue.wait_ms` (直方圖，屬性：`openclaw.lane`)
- `openclaw.session.state` (計數器，屬性：`openclaw.state`, `openclaw.reason`)
- `openclaw.session.stuck` (計數器，屬性：`openclaw.state`；針對可復原過期會話計算發出)
- `openclaw.session.stuck_age_ms` (直方圖，屬性：`openclaw.state`；針對可復原過期會話計算發出)
- `openclaw.session.turn.created` (counter, attrs: `openclaw.agent`, `openclaw.channel`, `openclaw.trigger`)
- `openclaw.session.recovery.requested` (counter, attrs: `openclaw.state`, `openclaw.action`, `openclaw.active_work_kind`, `openclaw.reason`)
- `openclaw.session.recovery.completed` (counter, attrs: `openclaw.state`, `openclaw.action`, `openclaw.status`, `openclaw.active_work_kind`, `openclaw.reason`)
- `openclaw.session.recovery.age_ms` (histogram, attrs: 與對應的恢復計數器相同)
- `openclaw.run.attempt` (counter, attrs: `openclaw.attempt`)

### Session liveness telemetry

`diagnostics.stuckSessionWarnMs` 是會話活躍性診斷的無進行時間臨界值。當 OpenClaw 觀察到回覆、工具、狀態、區塊或 ACP 執行時期的進展時，`processing` 會話不會朝此臨界值增長。輸入活躍訊號不算作進展，因此仍可偵測到無回應的模型或綁具。

OpenClaw classifies sessions by the work it can still observe:

- `session.long_running`：主動嵌入式工作、模型呼叫或工具呼叫仍在進行中。
- `session.stalled`：存在主動工作，但主動執行未回報近期進展。停滯的嵌入式執行起初會保持僅觀察模式，然後在 `diagnostics.stuckSessionAbortMs` 無進展後中止排空，以便通道後排隊的輪次可以恢復。若未設定，中止臨界值預設為至少 5 分鐘和 3 倍 `diagnostics.stuckSessionWarnMs` 的較安全擴充視窗。
- `session.stuck`：無主動工作的過時會話簿記，或具有過時無主擁有者模型/工具活動的閒置佇列會話。這會在恢復閘道通過後立即釋放受影響的會話通道。

恢復會發出結構化的 `session.recovery.requested` 和 `session.recovery.completed` 事件。僅在變異恢復結果 (`aborted` 或 `released`) 之後，且僅當相同的處理世代仍為當前時，診斷會話狀態才會標記為閒置。

只有 `session.stuck` 會發出 `openclaw.session.stuck` 計數器、
`openclaw.session.stuck_age_ms` 直方圖和 `openclaw.session.stuck`
範圍 (span)。當 session 保持不變時，重複的 `session.stuck` 診斷會退避，因此儀表板應針對持續增加而非每一次
心跳跳動發出警示。關於配置選項和預設值，請參閱
[Configuration reference](/zh-Hant/gateway/configuration-reference#diagnostics)。

存活度警告也會發出：

- `openclaw.liveness.warning` (counter, attrs: `openclaw.liveness.reason`)
- `openclaw.liveness.event_loop_delay_p99_ms` (histogram, attrs: `openclaw.liveness.reason`)
- `openclaw.liveness.event_loop_delay_max_ms` (histogram, attrs: `openclaw.liveness.reason`)
- `openclaw.liveness.event_loop_utilization` (histogram, attrs: `openclaw.liveness.reason`)
- `openclaw.liveness.cpu_core_ratio` (直方圖，屬性：`openclaw.liveness.reason`)

### Harness 生命週期

- `openclaw.harness.duration_ms` (直方圖，屬性：`openclaw.harness.id`、`openclaw.harness.plugin`、`openclaw.outcome`，錯誤時包含 `openclaw.harness.phase`)

### 工具執行

- `openclaw.tool.execution.duration_ms` (直方圖，屬性：`gen_ai.tool.name`、`openclaw.toolName`、`openclaw.tool.source`、`openclaw.tool.owner`、`openclaw.tool.params.kind`，錯誤時額外包含 `openclaw.errorCategory`)
- `openclaw.tool.execution.blocked` (計數器，屬性：`gen_ai.tool.name`、`openclaw.toolName`、`openclaw.tool.source`、`openclaw.tool.owner`、`openclaw.tool.params.kind`、`openclaw.deniedReason`)

### Exec

- `openclaw.exec.duration_ms`（直方圖，屬性：`openclaw.exec.target`、`openclaw.exec.mode`、`openclaw.outcome`、`openclaw.failureKind`）

### Diagnostics internals (memory and tool loop)

- `openclaw.payload.large`（計數器，屬性：`openclaw.payload.surface`、`openclaw.payload.action`、`openclaw.channel`、`openclaw.plugin`、`openclaw.reason`）
- `openclaw.payload.large_bytes`（直方圖，屬性：與 `openclaw.payload.large` 相同）
- `openclaw.memory.heap_used_bytes`（直方圖，屬性：`openclaw.memory.kind`）
- `openclaw.memory.rss_bytes`（直方圖）
- `openclaw.memory.pressure`（計數器，屬性：`openclaw.memory.level`）
- `openclaw.tool.loop.iterations`（計數器，屬性：`openclaw.toolName`、`openclaw.outcome`）
- `openclaw.tool.loop.duration_ms` (直方圖, attrs: `openclaw.toolName`, `openclaw.outcome`)

## Exported spans

- `openclaw.model.usage`
  - `openclaw.channel`, `openclaw.provider`, `openclaw.model`
  - `openclaw.tokens.*` (input/output/cache_read/cache_write/total)
  - 預設為 `gen_ai.system`，或在選擇加入最新的 GenAI 語義慣例時為 `gen_ai.provider.name`
  - `gen_ai.request.model`, `gen_ai.operation.name`, `gen_ai.usage.*`
- `openclaw.run`
  - `openclaw.outcome`, `openclaw.channel`, `openclaw.provider`, `openclaw.model`, `openclaw.errorCategory`
- `openclaw.model.call`
  - 預設為 `gen_ai.system`，當選擇加入最新的 GenAI 語義約定時則為 `gen_ai.provider.name`
  - `gen_ai.request.model`、`gen_ai.operation.name`、`openclaw.provider`、`openclaw.model`、`openclaw.api`、`openclaw.transport`
  - `openclaw.errorCategory` 以及錯誤時的選用 `openclaw.failureKind`
  - `openclaw.model_call.request_bytes`、`openclaw.model_call.response_bytes`、`openclaw.model_call.time_to_first_byte_ms`
  - `openclaw.provider.request_id_hash` (上游供應商請求 ID 的有界 SHA 雜湊；不匯出原始 ID)
  - 使用 `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental` 時，模型呼叫範圍會使用最新的 GenAI 推斷範圍名稱 `{gen_ai.operation.name} {gen_ai.request.model}` 和 `CLIENT` 範圍類型，而非 `openclaw.model.call`。
- `openclaw.harness.run`
  - `openclaw.harness.id`、`openclaw.harness.plugin`、`openclaw.outcome`、`openclaw.provider`、`openclaw.model`、`openclaw.channel`
  - 完成時：`openclaw.harness.result_classification`、`openclaw.harness.yield_detected`、`openclaw.harness.items.started`、`openclaw.harness.items.completed`、`openclaw.harness.items.active`
  - 發生錯誤時：`openclaw.harness.phase`、`openclaw.errorCategory`、選用的 `openclaw.harness.cleanup_failed`
- `openclaw.tool.execution`
  - `gen_ai.tool.name`、`openclaw.toolName`、`openclaw.errorCategory`、`openclaw.tool.params.*`
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
  - `openclaw.state`、`openclaw.ageMs`、`openclaw.queueDepth`
- `openclaw.context.assembled`
  - `openclaw.prompt.size`、`openclaw.history.size`、`openclaw.context.tokens`、`openclaw.errorCategory`（無 prompt、history、response 或 session-key 內容）
- `openclaw.tool.loop`
  - `openclaw.toolName`、`openclaw.outcome`、`openclaw.iterations`、`openclaw.errorCategory`（無 loop messages、params 或 tool output）
- `openclaw.memory.pressure`
  - `openclaw.memory.level`, `openclaw.memory.heap_used_bytes`, `openclaw.memory.rss_bytes`

當明確啟用內容捕獲時，模型和工具追蹤段也可以包含針對您選擇的特定內容類別的、經過編修且有限的 `openclaw.content.*` 屬性。

## 診斷事件目錄

下列事件支援上述指標和範圍。外掛程式也可以直接訂閱這些事件，而無需透過 OTLP 匯出。

**模型使用情況**

- `model.usage` - tokens、cost、duration、context、provider/model/channel、session id。`usage` 是針對成本和遙測的 provider/turn 會計計算；`context.used` 是目前的 prompt/context 快照，當涉及快取輸入或工具迴圈呼叫時，可能會低於 provider `usage.total`。

**訊息流**

- `webhook.received` / `webhook.processed` / `webhook.error`
- `message.queued` / `message.processed`
- `message.delivery.started` / `message.delivery.completed` / `message.delivery.error`

**佇列和工作階段**

- `queue.lane.enqueue` / `queue.lane.dequeue`
- `session.state` / `session.long_running` / `session.stalled` / `session.stuck`
- `run.attempt` / `run.progress`
- `diagnostic.heartbeat` (彙總計數器：webhooks/queue/session)

**Harness 生命週期**

- `harness.run.started` / `harness.run.completed` / `harness.run.error` -
  agent harness 的每次執行生命週期。包含 `harnessId`、選用的
  `pluginId`、provider/model/channel 和 run id。完成時會新增
  `durationMs`、`outcome`、選用的 `resultClassification`、`yieldDetected`
  和 `itemLifecycle` 計數。錯誤會新增 `phase`
  (`prepare`/`start`/`send`/`resolve`/`cleanup`)、`errorCategory` 和
  選用的 `cleanupFailed`。

**Exec**

- `exec.process.completed` - 最終結果、持續時間、目標、模式、結束
  代碼和失敗類型。不包含指令文本和工作目錄。

## 不使用匯出器

您可以在不執行 `diagnostics-otel` 的情況下，讓診斷事件可供外掛程式或自訂接收器使用：

```json5
{
  diagnostics: { enabled: true },
}
```

若要取得目標調試輸出而不引發 `logging.level`，請使用診斷
旗標。旗標不區分大小寫，並支援通配符（例如 `telegram.*` 或
`*`）：

```json5
{
  diagnostics: { flags: ["telegram.http"] },
}
```

或作為一次性 env 覆寫：

```bash
OPENCLAW_DIAGNOSTICS=telegram.http,telegram.payload openclaw gateway
```

旗標輸出會進入標準日誌檔案（`logging.file`），並且仍
會被 `logging.redactSensitive` 編輯。完整指南：
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

- [日誌記錄](/zh-Hant/logging) - 檔案日誌、主控台輸出、CLI 追蹤，以及控制 UI 日誌分頁
- [Gateway 日誌記錄內部機制](/zh-Hant/gateway/logging) - WS 日誌樣式、子系統前綴和主控台擷取
- [診斷旗標](/zh-Hant/diagnostics/flags) - 目標調試日誌旗標
- [診斷匯出](/zh-Hant/gateway/diagnostics) - 操作員支援套件工具（與 OTEL 匯出分開）
- [組態參考](/zh-Hant/gateway/configuration-reference#diagnostics) - 完整的 `diagnostics.*` 欄位參考
