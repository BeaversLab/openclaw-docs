---
summary: "Logging 概覽：檔案記錄、控制台輸出、CLI 追蹤以及 Control UI"
read_when:
  - You need a beginner-friendly overview of logging
  - You want to configure log levels or formats
  - You are troubleshooting and need to find logs quickly
title: "Logging 概覽"
---

# 日誌

OpenClaw 有兩個主要的記錄介面：

- 由 Gateway 寫入的**檔案日誌**（JSON 行）。
- 在終端機和 Gateway Debug UI 中顯示的 **Console output**（控制台輸出）。

Control UI 的 **Logs** 分頁會追蹤 gateway 檔案記錄。本頁面說明了記錄檔的位置、如何閱讀記錄，以及如何設定記錄層級和格式。

## 日誌存放位置

預設情況下，Gateway 會在以下位置寫入滾動日誌檔案：

`/tmp/openclaw/openclaw-YYYY-MM-DD.log`

日期使用 gateway 主機的當地時區。

您可以在 `~/.openclaw/openclaw.json` 中覆寫此設定：

```json
{
  "logging": {
    "file": "/path/to/openclaw.log"
  }
}
```

## 如何閱讀日誌

### CLI：即時追蹤（推薦）

使用 CLI 透過 RPC 追蹤 gateway 日誌檔案：

```bash
openclaw logs --follow
```

有用的目前選項：

- `--local-time`：以您當地的時區顯示時間戳記
- `--url <url>` / `--token <token>` / `--timeout <ms>`：標準 Gateway RPC 標誌
- `--expect-final`：agent-backed RPC 最終回應等待標誌（此處透過共用的客戶端層接受）

輸出模式：

- **TTY sessions**（TTY 工作階段）：美觀、色彩化、結構化的記錄行。
- **Non-TTY sessions**（非 TTY 工作階段）：純文字。
- `--json`：換行分隔的 JSON（每行一個記錄事件）。
- `--plain`：在 TTY 工作階段中強制使用純文字。
- `--no-color`：停用 ANSI 顏色。

當您傳遞明確的 `--url` 時，CLI 不會自動套用設定或環境認證；如果目標 Gateway 需要認證，請自行包含 `--token`。

在 JSON 模式下，CLI 會發出帶有 `type` 標籤的物件：

- `meta`：串流中繼資料（檔案、游標、大小）
- `log`：已解析的記錄項目
- `notice`：截斷 / 輪替提示
- `raw`：未解析的記錄行

如果本地 loopback Gateway 要求配對，`openclaw logs` 會自動回退到設定的本地記錄檔。明確的 `--url` 目標不會使用此回退機制。

如果 Gateway 無法連線，CLI 會印出一個簡短的提示來執行：

```bash
openclaw doctor
```

### Control UI (web)

Control UI 的 **Logs** 分頁使用 `logs.tail` 追蹤同一個檔案。請參閱 [/web/control-ui](/zh-Hant/web/control-ui) 了解如何開啟它。

### 僅限 Channel 的記錄

若要過濾管道活動（WhatsApp/Telegram/等），請使用：

```bash
openclaw channels logs --channel whatsapp
```

## 日誌格式

### 檔案日誌 (JSONL)

日誌檔中的每一行都是一個 JSON 物件。CLI 和 Control UI 會解析這些條目，以呈現結構化輸出（時間、層級、子系統、訊息）。

### 主控台輸出

主控台日誌具有 **TTY 感知** 並格式化以提升可讀性：

- 子系統前綴（例如 `gateway/channels/whatsapp`）
- 層級著色 (info/warn/error)
- 可選的精簡或 JSON 模式

主控台格式由 `logging.consoleStyle` 控制。

### Gateway WebSocket 日誌

`openclaw gateway` 也具有針對 RPC 流量的 WebSocket 協議日誌記錄：

- 正常模式：僅顯示有趣的結果（錯誤、解析錯誤、慢速呼叫）
- `--verbose`：所有請求/回應流量
- `--ws-log auto|compact|full`：選擇詳細的呈現樣式
- `--compact`：`--ws-log compact` 的別名

範例：

```bash
openclaw gateway
openclaw gateway --verbose --ws-log compact
openclaw gateway --verbose --ws-log full
```

## 設定日誌

所有日誌配置都位於 `~/.openclaw/openclaw.json` 中的 `logging` 之下。

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

### 日誌層級

- `logging.level`：**檔案日誌** (JSONL) 層級。
- `logging.consoleLevel`：**主控台** 詳細程度層級。

您可以透過 **`OPENCLAW_LOG_LEVEL`** 環境變數覆寫這兩者（例如 `OPENCLAW_LOG_LEVEL=debug`）。環境變數的優先順序高於配置檔案，因此您可以提高單次執行的詳細程度，而不需編輯 `openclaw.json`。您也可以傳遞全域 CLI 選項 **`--log-level <level>`**（例如 `openclaw --log-level debug gateway run`），這會覆寫該指令的環境變數。

`--verbose` 僅影響主控台輸出和 WS 日誌詳細程度；它不會變更檔案日誌層級。

### 主控台樣式

`logging.consoleStyle`：

- `pretty`：人性化、彩色、帶有時間戳記。
- `compact`：更緊湊的輸出（最適合長時間工作階段）。
- `json`：每行 JSON（適用於日誌處理器）。

### 編校

工具摘要可以在敏感權杖輸出到主控台之前將其編校：

- `logging.redactSensitive`: `off` | `tools` (預設值: `tools`)
- `logging.redactPatterns`: 用來覆蓋預設集合的 regex 字串清單

刪除僅影響**主控台輸出**，不會變更檔案日誌。

## 診斷 + OpenTelemetry

診斷是用於模型執行**以及**訊息流程遙測 (webhooks、佇列、工作階段狀態) 的結構化、機器可讀取事件。它們**不會**取代日誌；它們的存在是為了提供指標、追蹤和其他匯出器。

診斷事件是在處理程序內發出的，但只有在啟用診斷和匯出器外掛程式時，匯出器才會附加。

### OpenTelemetry vs OTLP

- **OpenTelemetry (OTel)**：用於追蹤、指標和日誌的資料模型 + SDK。
- **OTLP**：用於將 OTel 資料匯出至收集器/後端的有線通訊協定。
- OpenClaw 目前透過 **OTLP/HTTP (protobuf)** 進行匯出。

### 匯出的訊號

- **指標**：計數器 + 直方圖 (Token 使用量、訊息流程、佇列)。
- **追蹤**：模型使用量 + webhook/訊息處理的範圍 (spans)。
- **日誌**：當啟用 `diagnostics.otel.logs` 時透過 OTLP 匯出。日誌
  量可能很高；請留意 `logging.level` 和匯出器篩選器。

### 診斷事件目錄

模型使用量：

- `model.usage`：tokens、成本、持續時間、上下文、提供者/模型/通道、工作階段 ID。

訊息流程：

- `webhook.received`：每個通道的 webhook 進入。
- `webhook.processed`：webhook 已處理 + 持續時間。
- `webhook.error`：webhook 處理常式錯誤。
- `message.queued`：訊息已加入佇列以進行處理。
- `message.processed`：結果 + 持續時間 + 選用錯誤。

佇列 + 工作階段：

- `queue.lane.enqueue`：指令佇列通道加入佇列 + 深度。
- `queue.lane.dequeue`：指令佇列通道移出佇列 + 等待時間。
- `session.state`：工作階段狀態轉換 + 原因。
- `session.stuck`：工作階段停滯警告 + 存在時間。
- `run.attempt`：執行重試/嘗試中繼資料。
- `diagnostic.heartbeat`：彙總計數器 (webhooks/佇列/工作階段)。

### 啟用診斷 (無匯出器)

如果您希望插件或自定義接收器能夠使用診斷事件，請使用此選項：

```json
{
  "diagnostics": {
    "enabled": true
  }
}
```

### 診斷標誌（目標日誌）

使用標誌來開啟額外的、目標明確的除錯日誌，而無需提高 `logging.level`。
標誌不區分大小寫，並支援萬用字元（例如 `telegram.*` 或 `*`）。

```json
{
  "diagnostics": {
    "flags": ["telegram.http"]
  }
}
```

環境變數覆寫（一次性）：

```
OPENCLAW_DIAGNOSTICS=telegram.http,telegram.payload
```

注意事項：

- 標誌日誌會輸出到標準日誌檔案（與 `logging.file` 相同）。
- 輸出仍會根據 `logging.redactSensitive` 進行編輯。
- 完整指南：[/diagnostics/flags](/zh-Hant/diagnostics/flags)。

### 匯出至 OpenTelemetry

診斷資料可以透過 `diagnostics-otel` 外掛程式（OTLP/HTTP）匯出。這
可與任何接受 OTLP/HTTP 的 OpenTelemetry 收集器/後端搭配使用。

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

注意事項：

- 您也可以使用 `openclaw plugins enable diagnostics-otel` 來啟用外掛程式。
- `protocol` 目前僅支援 `http/protobuf`。`grpc` 會被忽略。
- 指標包括 token 使用量、成本、內容大小、執行持續時間，以及訊息流
  計數器/直方圖（webhooks、佇列、會話狀態、佇列深度/等待時間）。
- 追蹤/指標可以使用 `traces` / `metrics` 切換（預設：開啟）。啟用時，追蹤
  包含模型使用範圍以及 webhook/訊息處理範圍。
- 當您的收集器需要驗證時，請設定 `headers`。
- 支援的環境變數：`OTEL_EXPORTER_OTLP_ENDPOINT`、
  `OTEL_SERVICE_NAME`、`OTEL_EXPORTER_OTLP_PROTOCOL`。

### 匯出的指標（名稱 + 類型）

模型使用量：

- `openclaw.tokens` (計數器，屬性：`openclaw.token`、`openclaw.channel`、
  `openclaw.provider`、`openclaw.model`)
- `openclaw.cost.usd` (計數器，屬性：`openclaw.channel`、`openclaw.provider`、
  `openclaw.model`)
- `openclaw.run.duration_ms` (直方圖，屬性：`openclaw.channel`、
  `openclaw.provider`、`openclaw.model`)
- `openclaw.context.tokens` (histogram, attrs: `openclaw.context`,
  `openclaw.channel`, `openclaw.provider`, `openclaw.model`)

訊息流程：

- `openclaw.webhook.received` (counter, attrs: `openclaw.channel`,
  `openclaw.webhook`)
- `openclaw.webhook.error` (counter, attrs: `openclaw.channel`,
  `openclaw.webhook`)
- `openclaw.webhook.duration_ms` (histogram, attrs: `openclaw.channel`,
  `openclaw.webhook`)
- `openclaw.message.queued` (counter, attrs: `openclaw.channel`,
  `openclaw.source`)
- `openclaw.message.processed` (counter, attrs: `openclaw.channel`,
  `openclaw.outcome`)
- `openclaw.message.duration_ms` (histogram, attrs: `openclaw.channel`,
  `openclaw.outcome`)

佇列 + 會話：

- `openclaw.queue.lane.enqueue` (counter, attrs: `openclaw.lane`)
- `openclaw.queue.lane.dequeue` (counter, attrs: `openclaw.lane`)
- `openclaw.queue.depth` (histogram, attrs: `openclaw.lane` 或
  `openclaw.channel=heartbeat`)
- `openclaw.queue.wait_ms` (histogram, attrs: `openclaw.lane`)
- `openclaw.session.state` (counter, attrs: `openclaw.state`, `openclaw.reason`)
- `openclaw.session.stuck` (counter, attrs: `openclaw.state`)
- `openclaw.session.stuck_age_ms` (histogram, attrs: `openclaw.state`)
- `openclaw.run.attempt` (counter, attrs: `openclaw.attempt`)

### 匯出的 Span (名稱 + 關鍵屬性)

- `openclaw.model.usage`
  - `openclaw.channel`, `openclaw.provider`, `openclaw.model`
  - `openclaw.sessionKey`, `openclaw.sessionId`
  - `openclaw.tokens.*` (input/output/cache_read/cache_write/total)
- `openclaw.webhook.processed`
  - `openclaw.channel`, `openclaw.webhook`, `openclaw.chatId`
- `openclaw.webhook.error`
  - `openclaw.channel`, `openclaw.webhook`, `openclaw.chatId`,
    `openclaw.error`
- `openclaw.message.processed`
  - `openclaw.channel`, `openclaw.outcome`, `openclaw.chatId`,
    `openclaw.messageId`, `openclaw.sessionKey`, `openclaw.sessionId`,
    `openclaw.reason`
- `openclaw.session.stuck`
  - `openclaw.state`, `openclaw.ageMs`, `openclaw.queueDepth`,
    `openclaw.sessionKey`, `openclaw.sessionId`

### 採樣 + 排清

- 追蹤採樣：`diagnostics.otel.sampleRate` (0.0–1.0，僅限 root spans)。
- 指標匯出間隔：`diagnostics.otel.flushIntervalMs` (最少 1000ms)。

### 協定說明

- OTLP/HTTP 端點可以透過 `diagnostics.otel.endpoint` 或
  `OTEL_EXPORTER_OTLP_ENDPOINT` 設定。
- 如果端點已經包含 `/v1/traces` 或 `/v1/metrics`，則會直接使用。
- 如果端點已經包含 `/v1/logs`，則會直接用於日誌。
- `diagnostics.otel.logs` 啟用主要記錄器輸出的 OTLP 日誌匯出功能。

### 日誌匯出行為

- OTLP 日誌使用寫入至 `logging.file` 的相同結構化記錄。
- 遵守 `logging.level` (檔案日誌層級)。主控台刪減**不**適用
  於 OTLP 日誌。
- 大量安裝應優先使用 OTLP 收集器採樣/過濾。

## 疑難排解提示

- **無法連線到 Gateway？** 請先執行 `openclaw doctor`。
- **日誌空白？** 請檢查 Gateway 是否正在執行，以及是否正在寫入
  `logging.file` 中的檔案路徑。
- **需要更多細節？** 將 `logging.level` 設定為 `debug` 或 `trace` 並重試。

## 相關內容

- [Gateway 日誌內部機制](/zh-Hant/gateway/logging) — WS 日誌樣式、子系統前綴與主控台擷取
- [診斷](/zh-Hant/gateway/configuration-reference#diagnostics) — OpenTelemetry 匯出與快取追蹤組態
