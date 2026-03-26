---
summary: "日誌總覽：檔案日誌、主控台輸出、CLI 追蹤以及 Control UI"
read_when:
  - You need a beginner-friendly overview of logging
  - You want to configure log levels or formats
  - You are troubleshooting and need to find logs quickly
title: "日誌記錄"
---

# 日誌記錄

OpenClaw 在兩個地方記錄日誌：

- **檔案日誌** (JSON 行)，由 Gateway 寫入。
- **主控台輸出**，顯示在終端機和 Control UI 中。

本頁面說明日誌存放位置、閱讀方法，以及如何設定日誌
層級和格式。

## 日誌存放位置

根據預設，Gateway 會在以下位置寫入輪替日誌檔：

`/tmp/openclaw/openclaw-YYYY-MM-DD.log`

日期使用 gateway 主機的本地時區。

您可以在 `~/.openclaw/openclaw.json` 中覆寫此設定：

```json
{
  "logging": {
    "file": "/path/to/openclaw.log"
  }
}
```

## 如何閱讀日誌

### CLI：即時追蹤 (推薦)

使用 CLI 透過 RPC 追蹤 gateway 日誌檔：

```bash
openclaw logs --follow
```

輸出模式：

- **TTY 會話**：美化、彩色、結構化的日誌行。
- **非 TTY 會話**：純文字。
- `--json`：以行分隔的 JSON（每行一個日誌事件）。
- `--plain`：在 TTY 會話中強制使用純文字。
- `--no-color`：停用 ANSI 顏色。

在 JSON 模式下，CLI 會輸出帶有 `type` 標記的物件：

- `meta`：串流中繼資料（檔案、游標、大小）
- `log`：已解析的日誌項目
- `notice`：截斷 / 輪替提示
- `raw`：未解析的日誌行

如果無法連線到 Gateway，CLI 會列印一個簡短的提示來執行：

```bash
openclaw doctor
```

### 控制 UI (網頁)

控制 UI 的 **Logs** 分頁使用 `logs.tail` 來即時追蹤同一個檔案。
請參閱 [/web/control-ui](/zh-Hant/web/control-ui) 瞭解如何開啟它。

### 僅頻道日誌

若要篩選頻道活動（WhatsApp/Telegram/等），請使用：

```bash
openclaw channels logs --channel whatsapp
```

## 日誌格式

### 檔案日誌 (JSONL)

日誌檔中的每一行都是一個 JSON 物件。CLI 和控制介面會解析這些條目以呈現結構化輸出（時間、層級、子系統、訊息）。

### 控制台輸出

控制台日誌具有 **TTY 感知** 功能，並經過格式化以提高可讀性：

- 子系統前綴（例如 `gateway/channels/whatsapp`）
- 層級顏色（info/warn/error）
- 可選的簡潔模式或 JSON 模式

控制台格式由 `logging.consoleStyle` 控制。

## 設定日誌記錄

所有日誌記錄設定都位於 `~/.openclaw/openclaw.json` 中的 `logging` 之下。

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

- `logging.level`：**檔案日誌**（JSONL）層級。
- `logging.consoleLevel`：**控制台**詳細程度層級。

您可以透過 **`OPENCLAW_LOG_LEVEL`** 環境變數（例如 `OPENCLAW_LOG_LEVEL=debug`）覆寫這兩者。環境變數的優先順序高於設定檔，因此您可以在不編輯 `openclaw.json` 的情況下，提高單次執行的詳細程度。您也可以傳遞全域 CLI 選項 **`--log-level <level>`**（例如 `openclaw --log-level debug gateway run`），該選項會覆寫該指令的環境變數。

`--verbose` 僅影響主控台輸出；它不會變更檔案日誌層級。

### 主控台樣式

`logging.consoleStyle`：

- `pretty`：易於閱讀、彩色，並帶有時間戳記。
- `compact`：更緊湊的輸出（最適合長時間的工作階段）。
- `json`：逐行 JSON（供日誌處理器使用）。

### 編校

工具摘要可以在敏感 Token 到达控制台之前将其编辑掉：

- `logging.redactSensitive`: `off` | `tools` (預設: `tools`)
- `logging.redactPatterns`: 用於覆蓋預設集合的 Regex 字串列表

編輯僅影響**控制台輸出**，不會變更檔案日誌。

## 診斷 + OpenTelemetry

診斷是針對模型執行**以及**訊息流程遙測（webhook、佇列、會話狀態）的結構化、機器可讀事件。它們**不**會取代日誌；它們的存在是為了提供指標、追蹤和其他匯出器的資料。

診斷事件是在程序內發出的，但只有在啟用了診斷和匯出器外掛程式時，匯出器才會附加。

### OpenTelemetry vs OTLP

- **OpenTelemetry (OTel)**：用於追蹤、指標和日誌的資料模型 + SDK。
- **OTLP**：用於將 OTel 資料匯出至收集器/後端的傳輸協定。
- OpenClaw 目前透過 **OTLP/HTTP (protobuf)** 進行匯出。

### 匯出的訊號

- **指標 (Metrics)**：計數器 + 直方圖（Token 使用量、訊息流程、佇列）。
- **追蹤 (Traces)**：模型使用量 + Webhook/訊息處理的範圍。
- **日誌 (Logs)**：當啟用 `diagnostics.otel.logs` 時透過 OTLP 匯出。日誌
  量可能很大；請考慮 `logging.level` 和匯出器過濾器。

### 診斷事件目錄

模型使用量：

- `model.usage`：Token、成本、持續時間、上下文、供應商/模型/頻道、工作階段 ID。

訊息流程：

- `webhook.received`：各頻道的 Webhook 進入流量。
- `webhook.processed`：Webhook 已處理 + 持續時間。
- `webhook.error`：Webhook 處理器錯誤。
- `message.queued`：訊息已加入佇列等待處理。
- `message.processed`：結果 + 持續時間 + 選用錯誤。

佇列 + 工作階段：

- `queue.lane.enqueue`：指令佇列通道入列 + 深度。
- `queue.lane.dequeue`：指令佇列通道出列 + 等待時間。
- `session.state`：工作階段狀態轉換 + 原因。
- `session.stuck`：工作階段停滯警告 + 存留時間。
- `run.attempt`：執行重試/嘗試中繼資料。
- `diagnostic.heartbeat`：彙總計數器 (webhooks/queue/session)。

### 啟用診斷 (無匯出器)

如果您希望診斷事件可供外掛程式或自訂接收器使用，請使用此選項：

```json
{
  "diagnostics": {
    "enabled": true
  }
}
```

### 診斷旗標 (目標日誌)

使用旗標來開啟額外的目標偵錯日誌，而不必提高 `logging.level`。
旗標不區分大小寫並支援萬用字元 (例如 `telegram.*` 或 `*`)。

```json
{
  "diagnostics": {
    "flags": ["telegram.http"]
  }
}
```

Env override (one-off):

```
OPENCLAW_DIAGNOSTICS=telegram.http,telegram.payload
```

Notes:

- Flag logs go to the standard log file (same as `logging.file`).
- Output is still redacted according to `logging.redactSensitive`.
- Full guide: [/diagnostics/flags](/zh-Hant/diagnostics/flags).

### Export to OpenTelemetry

Diagnostics can be exported via the `diagnostics-otel` plugin (OTLP/HTTP). This
works with any OpenTelemetry collector/backend that accepts OTLP/HTTP.

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

Notes:

- You can also enable the plugin with `openclaw plugins enable diagnostics-otel`.
- `protocol` currently supports `http/protobuf` only. `grpc` is ignored.
- 指標包括 token 使用量、成本、內容大小、執行持續時間，以及訊息流計數器/直方圖（webhooks、佇列、會話狀態、佇列深度/等待時間）。
- 追蹤/指標可以使用 `traces` / `metrics` 進行切換（預設值：開啟）。啟用後，追蹤包含模型使用範圍以及 webhook/訊息處理範圍。
- 當您的收集器需要驗證時，設定 `headers`。
- 支援的環境變數：`OTEL_EXPORTER_OTLP_ENDPOINT`、
  `OTEL_SERVICE_NAME`、`OTEL_EXPORTER_OTLP_PROTOCOL`。

### 匯出的指標（名稱 + 類型）

模型使用量：

- `openclaw.tokens`（計數器，屬性：`openclaw.token`、`openclaw.channel`、
  `openclaw.provider`、`openclaw.model`）
- `openclaw.cost.usd`（計數器，屬性：`openclaw.channel`、`openclaw.provider`、
  `openclaw.model`）
- `openclaw.run.duration_ms`（直方圖，屬性：`openclaw.channel`、
  `openclaw.provider`、`openclaw.model`）
- `openclaw.context.tokens`（直方圖，屬性：`openclaw.context`、
  `openclaw.channel`、`openclaw.provider`、`openclaw.model`）

訊息流：

- `openclaw.webhook.received`（計數器，屬性：`openclaw.channel`、
  `openclaw.webhook`）
- `openclaw.webhook.error`（計數器，屬性：`openclaw.channel`、
  `openclaw.webhook`）
- `openclaw.webhook.duration_ms`（直方圖，屬性：`openclaw.channel`、
  `openclaw.webhook`）
- `openclaw.message.queued`（計數器，屬性：`openclaw.channel`、
  `openclaw.source`）
- `openclaw.message.processed`（計數器，屬性：`openclaw.channel`、
  `openclaw.outcome`）
- `openclaw.message.duration_ms`（直方圖，屬性：`openclaw.channel`、
  `openclaw.outcome`）

佇列 + 會話：

- `openclaw.queue.lane.enqueue`（計數器，屬性：`openclaw.lane`）
- `openclaw.queue.lane.dequeue` (counter, attrs: `openclaw.lane`)
- `openclaw.queue.depth` (histogram, attrs: `openclaw.lane` or
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

### Sampling + flushing

- Trace sampling: `diagnostics.otel.sampleRate` (0.0–1.0, root spans only).
- 指標匯出間隔：`diagnostics.otel.flushIntervalMs`（最小 1000ms）。

### 協議注意事項

- OTLP/HTTP 端點可以透過 `diagnostics.otel.endpoint` 或
  `OTEL_EXPORTER_OTLP_ENDPOINT` 設定。
- 如果端點已包含 `/v1/traces` 或 `/v1/metrics`，則將按原樣使用。
- 如果端點已包含 `/v1/logs`，則將按原樣用於日誌。
- `diagnostics.otel.logs` 會啟用主要記錄器輸出的 OTLP 日誌匯出。

### 日誌匯出行為

- OTLP 日誌使用寫入 `logging.file` 的相同結構化記錄。
- 遵守 `logging.level`（檔案日誌層級）。控制台遮蔽**不**適用於
  OTLP 日誌。
- 高流量安裝應優先使用 OTLP 收集器取樣/過濾。

## 疑難排解提示

- **無法連線到 Gateway？** 先執行 `openclaw doctor`。
- **記錄是空的？** 檢查 Gateway 是否正在執行並正在寫入 `logging.file` 中的檔案路徑。
- **需要更多細節？** 將 `logging.level` 設定為 `debug` 或 `trace` 然後重試。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
