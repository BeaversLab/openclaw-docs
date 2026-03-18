---
summary: "日誌總覽：檔案日誌、主控台輸出、CLI 即時追蹤以及 Control UI"
read_when:
  - You need a beginner-friendly overview of logging
  - You want to configure log levels or formats
  - You are troubleshooting and need to find logs quickly
title: "日誌"
---

# 日誌

OpenClaw 在兩個地方記錄日誌：

- **檔案日誌**（JSON 行），由 Gateway 寫入。
- **主控台輸出**，顯示在終端機和 Control UI 中。

本頁面說明日誌存放位置、如何讀取日誌，以及如何設定日誌
層級和格式。

## 日誌存放位置

預設情況下，Gateway 會在以下位置寫入輪替日誌檔案：

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

## 如何讀取日誌

### CLI：即時追蹤（推薦）

使用 CLI 透過 RPC 即時追蹤 gateway 日誌檔案：

```bash
openclaw logs --follow
```

輸出模式：

- **TTY 工作階段**：美觀、彩色、結構化的日誌行。
- **非 TTY 工作階段**：純文字。
- `--json`：行分隔 JSON（每行一個日誌事件）。
- `--plain`：在 TTY 工作階段中強制使用純文字。
- `--no-color`：停用 ANSI 顏色。

在 JSON 模式下，CLI 會發出帶有 `type` 標記的物件：

- `meta`：串流元數據（檔案、游標、大小）
- `log`：已解析的日誌項目
- `notice`：截斷 / 輪替提示
- `raw`：未解析的日誌行

如果 Gateway 無法連線，CLI 會列印一個簡短的提示以執行：

```bash
openclaw doctor
```

### Control UI (網頁)

Control UI 的 **Logs** 分頁使用 `logs.tail` 追蹤同一個檔案。
請參閱 [/web/control-ui](/zh-Hant/web/control-ui) 瞭解如何開啟它。

### 僅限頻道的日誌

若要過濾頻道活動（WhatsApp/Telegram/等），請使用：

```bash
openclaw channels logs --channel whatsapp
```

## 日誌格式

### 檔案日誌 (JSONL)

日誌檔中的每一行都是一個 JSON 物件。CLI 和 Control UI 會解析這些
項目以呈現結構化輸出（時間、層級、子系統、訊息）。

### 主控台輸出

主控台日誌是 **TTY 感知** 的，並格式化以提高可讀性：

- 子系統前綴（例如 `gateway/channels/whatsapp`）
- 層級著色（info/warn/error）
- 可選的簡潔或 JSON 模式

主控台格式由 `logging.consoleStyle` 控制。

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

您可以透過 **`OPENCLAW_LOG_LEVEL`** 環境變數（例如 `OPENCLAW_LOG_LEVEL=debug`）覆寫這兩者。環境變數的優先順序高於組態檔，因此您可以在不編輯 `openclaw.json` 的情況下，提高單次執行的詳細程度。您也可以傳遞全域 CLI 選項 **`--log-level <level>`**（例如，`openclaw --log-level debug gateway run`），它會覆寫該指令的環境變數。

`--verbose` 僅影響主控台輸出；它不會變更檔案日誌層級。

### 主控台樣式

`logging.consoleStyle`：

- `pretty`：使用者友善、彩色，並帶有時間戳記。
- `compact`：更緊湊的輸出（最適合長時間工作階段）。
- `json`：每行 JSON（用於日誌處理器）。

### 編輯

工具摘要可以在敏感權杖輸出到主控台之前將其編輯：

- `logging.redactSensitive`: `off` | `tools` (預設: `tools`)
- `logging.redactPatterns`：用於覆寫預設集合的 regex 字串清單

編輯功能**僅影響主控台輸出**，且不會變更檔案日誌。

## 診斷 + OpenTelemetry

診斷是針對模型執行**以及**訊息流程遙測（網路掛鉤、佇列、工作階段狀態）的結構化、機器可讀取事件。它們並**不**取代日誌；它們的存在是為了提供指標、追蹤和其他匯出器的資料。

診斷事件是在處理程序內發出的，但只有在啟用診斷和匯出器外掛程式時，匯出器才會附加。

### OpenTelemetry 與 OTLP

- **OpenTelemetry (OTel)**：用於追蹤、指標和日誌的資料模型 + SDK。
- **OTLP**：用於將 OTel 資料匯出到收集器/後端的線路通訊協定。
- OpenClaw 目前透過 **OTLP/HTTP (protobuf)** 進行匯出。

### 匯出的訊號

- **Metrics (指標)**：計數器 + 直方圖（權杖使用量、訊息流程、佇列）。
- **Traces (追蹤)**：針對模型使用量以及網路掛鉤/訊息處理的 span。
- **日誌**：當啟用 `diagnostics.otel.logs` 時透過 OTLP 匯出。日誌
  量可能很大；請留意 `logging.level` 和匯出器篩選器。

### 診斷事件目錄

模型使用情況：

- `model.usage`：tokens、成本、持續時間、上下文、提供者/模型/頻道、Session ID。

訊息流程：

- `webhook.received`：每個頻道的 Webhook 進入。
- `webhook.processed`：Webhook 已處理 + 持續時間。
- `webhook.error`：Webhook 處理器錯誤。
- `message.queued`：訊息已加入處理佇列。
- `message.processed`：結果 + 持續時間 + 可選錯誤。

佇列 + Session：

- `queue.lane.enqueue`：指令佇列通道入列 + 深度。
- `queue.lane.dequeue`：指令佇列通道出列 + 等待時間。
- `session.state`：Session 狀態轉換 + 原因。
- `session.stuck`：Session 卡住警告 + 存在時間。
- `run.attempt`：執行重試/嘗試中繼資料。
- `diagnostic.heartbeat`：彙總計數器。

### 啟用診斷功能（無匯出器）

如果您希望診斷事件可供外掛或自訂接收器使用，請使用此選項：

```json
{
  "diagnostics": {
    "enabled": true
  }
}
```

### 診斷旗標（目標日誌）

使用旗標開啟額外的目標偵錯日誌，而無需提高 `logging.level`。
旗標不區分大小寫，並支援萬用字元（例如 `telegram.*` 或 `*`）。

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

備註：

- 旗標日誌會進入標準日誌檔（與 `logging.file` 相同）。
- 根據 `logging.redactSensitive`，輸出仍然會被編輯。
- 完整指南：[/diagnostics/flags](/zh-Hant/diagnostics/flags)。

### 匯出至 OpenTelemetry

診斷資訊可以透過 `diagnostics-otel` 外掛（OTLP/HTTP）匯出。這
適用於任何接受 OTLP/HTTP 的 OpenTelemetry 收集器/後端。

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

備註：

- 您也可以使用 `openclaw plugins enable diagnostics-otel` 啟用外掛。
- `protocol` 目前僅支援 `http/protobuf`。`grpc` 會被忽略。
- 指標包括 Token 使用量、成本、上下文大小、執行持續時間，以及訊息流程計數器/直方圖（webhooks、佇列、會話狀態、佇列深度/等待時間）。
- 追蹤/指標可以使用 `traces` / `metrics` 切換（預設：開啟）。啟用後，追蹤包含模型使用範圍，以及 webhook/訊息處理範圍。
- 當您的收集器需要身份驗證時，請設定 `headers`。
- 支援的環境變數：`OTEL_EXPORTER_OTLP_ENDPOINT`、
  `OTEL_SERVICE_NAME`、`OTEL_EXPORTER_OTLP_PROTOCOL`。

### 匯出的指標（名稱 + 類型）

模型使用量：

- `openclaw.tokens` (counter, attrs: `openclaw.token`, `openclaw.channel`,
  `openclaw.provider`, `openclaw.model`)
- `openclaw.cost.usd` (counter, attrs: `openclaw.channel`, `openclaw.provider`,
  `openclaw.model`)
- `openclaw.run.duration_ms` (histogram, attrs: `openclaw.channel`,
  `openclaw.provider`, `openclaw.model`)
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

### 導出的 Spans (名稱 + 關鍵屬性)

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

- 追蹤採樣: `diagnostics.otel.sampleRate` (0.0–1.0, 僅限 root spans)。
- 指標匯出間隔: `diagnostics.otel.flushIntervalMs` (最小 1000ms)。

### 協備註

- OTLP/HTTP 端點可以透過 `diagnostics.otel.endpoint` 或
  `OTEL_EXPORTER_OTLP_ENDPOINT` 設定。
- 如果端點已包含 `/v1/traces` 或 `/v1/metrics`，則會原樣使用。
- 如果端點已包含 `/v1/logs`，則日誌會原樣使用它。
- `diagnostics.otel.logs` 啟用主要日誌輸出的 OTLP 日誌匯出。

### 日誌匯出行為

- OTLP 日誌使用寫入 `logging.file` 的相同結構化記錄。
- 遵守 `logging.level`（檔案日誌等級）。主控台編輯**不**適用於
  OTLP 日誌。
- 高流量安裝應優先選擇 OTLP 收集器取樣/過濾。

## 疑難排解提示

- **Gateway 無法連線？** 先執行 `openclaw doctor`。
- **日誌空白？** 檢查 Gateway 是否正在執行並寫入
  `logging.file` 中的檔案路徑。
- **需要更多細節？** 將 `logging.level` 設定為 `debug` 或 `trace` 並重試。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
