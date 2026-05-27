---
summary: "透過 diagnostics-otel 插件 (OTLP/HTTP) 將 OpenClaw 診斷數據匯出至任何 OpenTelemetry 收集器"
title: "OpenTelemetry 匯出"
read_when:
  - You want to send OpenClaw model usage, message flow, or session metrics to an OpenTelemetry collector
  - You are wiring traces, metrics, or logs into Grafana, Datadog, Honeycomb, New Relic, Tempo, or another OTLP backend
  - You need the exact metric names, span names, or attribute shapes to build dashboards or alerts
---

OpenClaw 透過官方 `diagnostics-otel` 外掛程式匯出診斷資訊
使用 **OTLP/HTTP (protobuf)**。任何接受 OTLP/HTTP 的收集器或後端
無需更改程式碼即可運作。關於本機檔案紀錄以及如何讀取它們，請參閱
[Logging](/zh-Hant/logging)。

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

| 信號     | 包含內容                                                                                                                                           |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **指標** | 關於 token 使用量、成本、執行持續時間、技能使用量、訊息流程、Talk 事件、佇列通道、工作階段狀態/恢復、工具執行、exec 和記憶體壓力的計數器和直方圖。 |
| **追蹤** | 關於模型使用量、模型呼叫、harness 生命週期、技能使用量、工具執行、exec、webhook/訊息處理、內容組裝和工具迴圈的 Span。                              |
| **日誌** | 當啟用 `diagnostics.otel.logs` 時，透過 OTLP 匯出的結構化 `logging.file` 紀錄；除非明確啟用內容擷取，否則會保留紀錄主體。                          |

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

依預設**不會**匯出原始模型/工具內容。Span 攜帶有限制的識別碼 (channel、provider、model、錯誤類別、僅雜湊的請求 ID、
工具來源、工具擁有者和技能名稱/來源)，且絕不包含提示文字、
回應文字、工具輸入、工具輸出、技能檔案路徑或工作階段金鑰。
OTLP 紀錄預設會保留嚴重性、紀錄器、程式碼位置、受信任的追蹤內容
和經清理的屬性，但僅當 `diagnostics.otel.captureContent` 設定為布林值 `true` 時，才會匯出原始紀錄訊息主體。細粒度的
`captureContent.*` 子金鑰不會啟用紀錄主體。看起來像是範圍代理程式工作階段金鑰的標籤會被替換為 `unknown`。
Talk 指標僅匯出有限制的事件中繼資料，例如模式、傳輸、
提供者和事件類型。它們不包含逐字稿、音訊負載、
工作階段 ID、回合 ID、呼叫 ID、房間 ID 或移交權杖。

外寄模型請求可能包含 W3C `traceparent` 標頭。該標頭
僅根據 OpenClaw 擁有的作用中模型呼叫診斷追蹤內容產生。現有呼叫端提供的 `traceparent` 標頭會被取代，因此外掛程式或
自訂提供者選項無法偽造跨服務追蹤血緣。

只有在您的收集器和保留政策已獲批准用於處理提示、回應、工具或系統提示文字時，才將 `diagnostics.otel.captureContent.*` 設為 `true`。每個子鍵都是獨立選用的：

- `inputMessages` - 使用者提示內容。
- `outputMessages` - 模型回應內容。
- `toolInputs` - 工具參數載荷。
- `toolOutputs` - 工具結果載荷。
- `systemPrompt` - 組裝後的系統/開發者提示。

當啟用任何子鍵時，模型和工具的跨度僅會獲得該類別的受限、編修過的 `openclaw.content.*` 屬性。僅在廣泛的診斷捕獲（且 OTLP 日誌訊息本體也獲准匯出）時，才使用布林值 `captureContent: true`。

## 抽樣和排清

- **追蹤：** `diagnostics.otel.sampleRate` （僅根跨度，`0.0` 丟棄全部，
  `1.0` 保留全部）。
- **指標：** `diagnostics.otel.flushIntervalMs` （最小 `1000`）。
- **日誌：** OTLP 日誌遵循 `logging.level` （檔案日誌等級）。它們使用
  診斷日誌記錄編修路徑，而非主控台格式化。高流量的
  安裝應優先選擇 OTLP 收集器採樣/過濾，而非本機採樣。
- **檔案日誌關聯：** 當日誌調用攜帶有效的
  診斷追蹤內容時，JSONL 檔案日誌會包含頂層 `traceId`、
  `spanId`、`parentSpanId` 和 `traceFlags`，這允許日誌處理器將本機日誌行與
  匯出的跨度結合。
- **請求關聯：** Gateway HTTP 請求和 WebSocket 框架會建立一個
  內部請求追蹤範圍。該範圍內的日誌和診斷事件
  預設會繼承請求追蹤，而 Agent 執行和模型調用的跨度則
  建立為子項，因此提供者的 `traceparent` 標頭會保持在同一追蹤上。

## 匯出的指標

### 模型使用量

- `openclaw.tokens` （計數器，屬性： `openclaw.token`、 `openclaw.channel`、 `openclaw.provider`、 `openclaw.model`、 `openclaw.agent`）
- `openclaw.cost.usd` (計數器, attrs: `openclaw.channel`, `openclaw.provider`, `openclaw.model`)
- `openclaw.run.duration_ms` (直方圖, attrs: `openclaw.channel`, `openclaw.provider`, `openclaw.model`)
- `openclaw.context.tokens` (直方圖, attrs: `openclaw.context`, `openclaw.channel`, `openclaw.provider`, `openclaw.model`)
- `gen_ai.client.token.usage` (直方圖, GenAI 語義約定指標, attrs: `gen_ai.token.type` = `input`/`output`, `gen_ai.provider.name`, `gen_ai.operation.name`, `gen_ai.request.model`)
- `gen_ai.client.operation.duration` (直方圖, 秒, GenAI 語義約定指標, attrs: `gen_ai.provider.name`, `gen_ai.operation.name`, `gen_ai.request.model`, 選用 `error.type`)
- `openclaw.model_call.duration_ms` (直方圖, attrs: `openclaw.provider`, `openclaw.model`, `openclaw.api`, `openclaw.transport`, 以及分類錯誤上的 `openclaw.errorCategory` 和 `openclaw.failureKind`)
- `openclaw.model_call.request_bytes` (直方圖, 最終模型請求承載的 UTF-8 位元組大小；無原始承載內容)
- `openclaw.model_call.response_bytes` (直方圖, 串流模型回應事件的 UTF-8 位元組大小；無原始回應內容)
- `openclaw.model_call.time_to_first_byte_ms` (直方圖, 第一個串流回應事件之前的經過時間)
- `openclaw.skill.used` (計數器, attrs: `openclaw.skill.name`, `openclaw.skill.source`, `openclaw.skill.activation`, 選用 `openclaw.agent`, 選用 `openclaw.toolName`)

### 訊息流程

- `openclaw.webhook.received` (計數器, attrs: `openclaw.channel`, `openclaw.webhook`)
- `openclaw.webhook.error` (計數器, attrs: `openclaw.channel`, `openclaw.webhook`)
- `openclaw.webhook.duration_ms` (直方圖, attrs: `openclaw.channel`, `openclaw.webhook`)
- `openclaw.message.queued` (計數器, attrs: `openclaw.channel`, `openclaw.source`)
- `openclaw.message.received` (計數器, attrs: `openclaw.channel`, `openclaw.source`)
- `openclaw.message.dispatch.started` (計數器, attrs: `openclaw.channel`, `openclaw.source`)
- `openclaw.message.dispatch.completed` (計數器, attrs: `openclaw.channel`, `openclaw.outcome`, `openclaw.reason`, `openclaw.source`)
- `openclaw.message.dispatch.duration_ms` (直方圖, attrs: `openclaw.channel`, `openclaw.outcome`, `openclaw.reason`, `openclaw.source`)
- `openclaw.message.processed` (計數器, attrs: `openclaw.channel`, `openclaw.outcome`)
- `openclaw.message.duration_ms` (直方圖, attrs: `openclaw.channel`, `openclaw.outcome`)
- `openclaw.message.delivery.started` (計數器, attrs: `openclaw.channel`, `openclaw.delivery.kind`)
- `openclaw.message.delivery.duration_ms` (直方圖, attrs: `openclaw.channel`, `openclaw.delivery.kind`, `openclaw.outcome`, `openclaw.errorCategory`)

### Talk

- `openclaw.talk.event` (計數器, attrs: `openclaw.talk.event_type`, `openclaw.talk.mode`, `openclaw.talk.transport`, `openclaw.talk.brain`, `openclaw.talk.provider`)
- `openclaw.talk.event.duration_ms` (直方圖, attrs: 與 `openclaw.talk.event` 相同; 當 Talk 事件回報持續時間時發出)
- `openclaw.talk.audio.bytes` (直方圖, attrs: 與 `openclaw.talk.event` 相同; 針對回報位元組長度的 Talk 音訊框事件發出)

### 佇列與會話

- `openclaw.queue.lane.enqueue` (計數器, attrs: `openclaw.lane`)
- `openclaw.queue.lane.dequeue` (計數器, attrs: `openclaw.lane`)
- `openclaw.queue.depth` (直方圖, attrs: `openclaw.lane` 或 `openclaw.channel=heartbeat`)
- `openclaw.queue.wait_ms` (直方圖, attrs: `openclaw.lane`)
- `openclaw.session.state` (計數器, attrs: `openclaw.state`, `openclaw.reason`)
- `openclaw.session.stuck` (計數器, attrs: `openclaw.state`; 僅針對沒有進行中工作的過期會話記帳發出)
- `openclaw.session.stuck_age_ms` (直方圖, attrs: `openclaw.state`; 僅針對沒有進行中工作的過期會話記帳發出)
- `openclaw.session.turn.created` (計數器, attrs: `openclaw.agent`, `openclaw.channel`, `openclaw.trigger`)
- `openclaw.session.recovery.requested` (計數器, attrs: `openclaw.state`, `openclaw.action`, `openclaw.active_work_kind`, `openclaw.reason`)
- `openclaw.session.recovery.completed` (計數器, attrs: `openclaw.state`, `openclaw.action`, `openclaw.status`, `openclaw.active_work_kind`, `openclaw.reason`)
- `openclaw.session.recovery.age_ms` (直方圖, attrs: 與對應的恢復計數器相同)
- `openclaw.run.attempt` (計數器, attrs: `openclaw.attempt`)

### 會話活躍度遙測

`diagnostics.stuckSessionWarnMs` 是會話活躍度診斷的無進行中時間閾值。當 OpenClaw 觀察到回覆、工具、狀態、區塊或 ACP 執行時期進度時，`processing` 會話不會朝向此閾值計時。輸入保活不被視為進度，因此仍然可以檢測到靜默模型或線束。

OpenClaw 根據其仍能觀察到的工作對會話進行分類：

- `session.long_running`：進行中的嵌入式工作、模型呼叫或工具呼叫仍在取得進度。
- `session.stalled`：存在活躍工作，但活躍執行尚未報告
  最近進度。停頓的嵌入式執行起初會保持僅觀察模式，然後
  在 `diagnostics.stuckSessionAbortMs` 毫無進度後中止排空 (abort-drain)，以便車道後方的
  排隊輪次 (turns) 能夠恢復。若未設定，中止閾值預設為
  更安全的擴展視窗，即至少 5 分鐘和 3 倍的
  `diagnostics.stuckSessionWarnMs`。
- `session.stuck`：沒有活躍工作的過期會話簿記 (bookkeeping)。這會立即
  釋放受影響的會話車道。

修復會發出結構化的 `session.recovery.requested` 和
`session.recovery.completed` 事件。診斷會話狀態僅在產生變更的修復結果 (`aborted` 或 `released`) 之後，
且僅當相同的處理世代 (processing generation) 仍為目前世代時，才會被標記為閒置。

只有 `session.stuck` 會發出 `openclaw.session.stuck` 計數器、
`openclaw.session.stuck_age_ms` 直方圖和 `openclaw.session.stuck`
跨度 (span)。當會話保持不變時，重複的 `session.stuck` 診斷會進行退避 (back off)，因此儀表板應針對持續增加而非
每次心跳跳動發出警報。關於配置選項和預設值，請參閱
[配置參考](/zh-Hant/gateway/configuration-reference#diagnostics)。

### Harness 生命週期

- `openclaw.harness.duration_ms` (直方圖，屬性：`openclaw.harness.id`、`openclaw.harness.plugin`、`openclaw.outcome`，錯誤時為 `openclaw.harness.phase`)

### Exec

- `openclaw.exec.duration_ms` (直方圖，屬性：`openclaw.exec.target`、`openclaw.exec.mode`、`openclaw.outcome`、`openclaw.failureKind`)

### 診斷內部 (記憶體和工具迴圈)

- `openclaw.memory.heap_used_bytes` (直方圖，屬性：`openclaw.memory.kind`)
- `openclaw.memory.rss_bytes` (直方圖)
- `openclaw.memory.pressure` (計數器，屬性：`openclaw.memory.level`)
- `openclaw.tool.loop.iterations` (計數器，屬性：`openclaw.toolName`、`openclaw.outcome`)
- `openclaw.tool.loop.duration_ms` (直方圖, attrs: `openclaw.toolName`, `openclaw.outcome`)

## 匯出的範圍 (Exported spans)

- `openclaw.model.usage`
  - `openclaw.channel`, `openclaw.provider`, `openclaw.model`
  - `openclaw.tokens.*` (input/output/cache_read/cache_write/total)
  - 預設為 `gen_ai.system`，或在選用最新 GenAI 語意慣例時為 `gen_ai.provider.name`
  - `gen_ai.request.model`, `gen_ai.operation.name`, `gen_ai.usage.*`
- `openclaw.run`
  - `openclaw.outcome`, `openclaw.channel`, `openclaw.provider`, `openclaw.model`, `openclaw.errorCategory`
- `openclaw.model.call`
  - 預設為 `gen_ai.system`，或在選用最新 GenAI 語意慣例時為 `gen_ai.provider.name`
  - `gen_ai.request.model`, `gen_ai.operation.name`, `openclaw.provider`, `openclaw.model`, `openclaw.api`, `openclaw.transport`
  - `openclaw.errorCategory` 和錯誤時選用的 `openclaw.failureKind`
  - `openclaw.model_call.request_bytes`, `openclaw.model_call.response_bytes`, `openclaw.model_call.time_to_first_byte_ms`
  - `openclaw.provider.request_id_hash` (上游提供者請求 ID 的有界 SHA 雜湊值；原始 ID 不會被匯出)
- `openclaw.harness.run`
  - `openclaw.harness.id`, `openclaw.harness.plugin`, `openclaw.outcome`, `openclaw.provider`, `openclaw.model`, `openclaw.channel`
  - 完成時：`openclaw.harness.result_classification`, `openclaw.harness.yield_detected`, `openclaw.harness.items.started`, `openclaw.harness.items.completed`, `openclaw.harness.items.active`
  - 錯誤時：`openclaw.harness.phase`, `openclaw.errorCategory`, 選用的 `openclaw.harness.cleanup_failed`
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
  - `openclaw.prompt.size`, `openclaw.history.size`, `openclaw.context.tokens`, `openclaw.errorCategory` (不包含提示詞、歷史紀錄、回應或會話金鑰內容)
- `openclaw.tool.loop`
  - `openclaw.toolName`, `openclaw.outcome`, `openclaw.iterations`, `openclaw.errorCategory` (不包含迴圈訊息、參數或工具輸出)
- `openclaw.memory.pressure`
  - `openclaw.memory.level`, `openclaw.memory.heap_used_bytes`, `openclaw.memory.rss_bytes`

當明確啟用內容擷取時，模型和工具跨度也可以包含針對您選擇加入的特定內容類別的有界、編輯後的 `openclaw.content.*` 屬性。

## 診斷事件目錄

以下事件支援上述指標和跨度。外掛程式也可以直接訂閱這些事件，而無需透過 OTLP 匯出。

**模型使用情況**

- `model.usage` - tokens、cost、duration、context、provider/model/channel、
  session ids。`usage` 是針對成本和遙測的 provider/turn 會計；
  `context.used` 是目前的 prompt/context 快照，當涉及快取輸入或
  tool-loop 呼叫時，可能會低於 provider `usage.total`。

**訊息流**

- `webhook.received` / `webhook.processed` / `webhook.error`
- `message.queued` / `message.processed`
- `message.delivery.started` / `message.delivery.completed` / `message.delivery.error`

**佇列與會話**

- `queue.lane.enqueue` / `queue.lane.dequeue`
- `session.state` / `session.long_running` / `session.stalled` / `session.stuck`
- `run.attempt` / `run.progress`
- `diagnostic.heartbeat` (聚合計數器：webhooks/queue/session)

**Harness 生命週期**

- `harness.run.started` / `harness.run.completed` / `harness.run.error` -
  agent harness 的每次執行生命週期。包含 `harnessId`、選用的
  `pluginId`、provider/model/channel 和 run id。完成時會新增
  `durationMs`、`outcome`、選用的 `resultClassification`、`yieldDetected`
  和 `itemLifecycle` 計數。錯誤會新增 `phase`
  (`prepare`/`start`/`send`/`resolve`/`cleanup`)、`errorCategory` 和
  選用的 `cleanupFailed`。

**執行**

- `exec.process.completed` - 最終結果、duration、target、mode、exit
  code 和 failure kind。不包含指令文字和工作目錄。

## 不使用匯出器

您可以讓診斷事件供外掛程式或自訂接收器使用，而不需
執行 `diagnostics-otel`：

```json5
{
  diagnostics: { enabled: true },
}
```

若要在不提高 `logging.level` 的情況下取得目標偵錯輸出，請使用診斷旗標。旗標不區分大小寫並支援萬用字元（例如 `telegram.*` 或 `*`）：

```json5
{
  diagnostics: { flags: ["telegram.http"] },
}
```

或是作為單次環境變數覆寫：

```bash
OPENCLAW_DIAGNOSTICS=telegram.http,telegram.payload openclaw gateway
```

旗標輸出會進入標準日誌檔案 (`logging.file`)，且仍會經由 `logging.redactSensitive` 編修。完整指南：[Diagnostics flags](/zh-Hant/diagnostics/flags)。

## 停用

```json5
{
  diagnostics: { otel: { enabled: false } },
}
```

您也可以將 `diagnostics-otel` 從 `plugins.allow` 中省略，或是執行 `openclaw plugins disable diagnostics-otel`。

## 相關

- [Logging](/zh-Hant/logging) - 檔案日誌、主控台輸出、CLI 追蹤，以及 Control UI 日誌分頁
- [Gateway logging internals](/zh-Hant/gateway/logging) - WS 日誌樣式、子系統前綴，以及主控台捕捉
- [Diagnostics flags](/zh-Hant/diagnostics/flags) - 目標偵錯日誌旗標
- [Diagnostics export](/zh-Hant/gateway/diagnostics) - 操作員支援套件工具（與 OTEL 匯出分開）
- [Configuration reference](/zh-Hant/gateway/configuration-reference#diagnostics) - 完整的 `diagnostics.*` 欄位參考
