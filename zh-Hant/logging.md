---
summary: "日誌概述：檔案日誌、主控台輸出、CLI 即時追蹤與 Control UI"
read_when:
  - 您需要一個適合初學者的日誌概述
  - 您想要設定日誌層級或格式
  - 您正在進行疑難排解，需要快速尋找日誌
title: "Logging"
---

# Logging

OpenClaw 在兩個地方記錄日誌：

- **File logs** (JSON lines)，由 Gateway 寫入。
- **Console output**，顯示於終端機與 Control UI。

本頁面說明日誌存放位置、閱讀方式，以及如何設定日誌層級與格式。

## Where logs live

預設情況下，Gateway 會將滾動日誌檔案寫入以下位置：

`/tmp/openclaw/openclaw-YYYY-MM-DD.log`

日期使用 Gateway 主機的本地時區。

您可以在 `~/.openclaw/openclaw.json` 中覆寫此設定：

```json
{
  "logging": {
    "file": "/path/to/openclaw.log"
  }
}
```

## How to read logs

### CLI: live tail (recommended)

使用 CLI 透過 RPC 追蹤 Gateway 日誌檔案：

```bash
openclaw logs --follow
```

輸出模式：

- **TTY sessions**：已美化、上色、結構化的日誌行。
- **Non-TTY sessions**：純文字。
- `--json`：以換行分隔的 JSON（每一行一個日誌事件）。
- `--plain`：在 TTY sessions 中強制使用純文字。
- `--no-color`：停用 ANSI 顏色。

在 JSON 模式下，CLI 會輸出帶有 `type` 標籤的物件：

- `meta`：串流元資料 (file, cursor, size)
- `log`：已解析的日誌項目
- `notice`：截斷 / 輪替提示
- `raw`：未解析的日誌行

如果 Gateway 無法連線，CLI 會列印簡短提示以執行：

```bash
openclaw doctor
```

### Control UI (web)

Control UI 的 **Logs** 分頁使用 `logs.tail` 追蹤同一個檔案。
請參閱 [/web/control-ui](/zh-Hant/web/control-ui) 以了解如何開啟它。

### Channel-only logs

若要篩選頻道活動 (WhatsApp/Telegram/etc)，請使用：

```bash
openclaw channels logs --channel whatsapp
```

## Log formats

### File logs (JSONL)

日誌檔中的每一行都是一個 JSON 物件。CLI 與 Control UI 會解析這些項目以呈現結構化輸出 (time, level, subsystem, message)。

### Console output

主控台日誌具備 **TTY-aware** 功能並經過格式化以提升可讀性：

- 子系統前綴 (例如 `gateway/channels/whatsapp`)
- 層級著色 (info/warn/error)
- 選用的 compact 或 JSON 模式

主控台格式化由 `logging.consoleStyle` 控制。

## Configuring logging

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

您可以透過 **`OPENCLAW_LOG_LEVEL`** 環境變數覆寫這兩者 (例如 `OPENCLAW_LOG_LEVEL=debug`)。環境變數的優先順序高於設定檔，因此您可以在不編輯 `openclaw.json` 的情況下，提高單次執行的詳細程度。您也可以傳遞全域 CLI 選項 **`--log-level <level>`** (例如，`openclaw --log-level debug gateway run`)，這會覆寫該指令的環境變數。

`--verbose` 只會影響主控台輸出；它不會變更檔案日誌層級。

### 主控台樣式

`logging.consoleStyle`：

- `pretty`：親易閱讀、彩色、帶有時間戳記。
- `compact`：更精簡的輸出 (最適合長時間工作階段)。
- `json`：每行 JSON (適用於日誌處理器)。

### 編校

工具摘要可以在敏感資料顯示於主控台之前將其編校：

- `logging.redactSensitive`: `off` | `tools` (預設: `tools`)
- `logging.redactPatterns`: 用於覆寫預設集的正規表示式字串列表

編校僅影響 **主控台輸出**，不會變更檔案日誌。

## 診斷 + OpenTelemetry

診斷是針對模型執行 **以及** 訊息流程遙測 (webhooks、佇列、工作階段狀態) 的結構化、機器可讀事件。它們 **不會** 取代日誌；它們的存在是為了提供指標、追蹤和其他匯出器的資料。

診斷事件是在程序內發出的，但只有在啟用診斷和匯出器外掛程式時，匯出器才會附加。

### OpenTelemetry vs OTLP

- **OpenTelemetry (OTel)**：用於追蹤、指標和日誌的資料模型 + SDK。
- **OTLP**：用於將 OTel 資料匯出到收集器/後端的線路協定。
- OpenClaw 目前透過 **OTLP/HTTP (protobuf)** 進行匯出。

### 匯出的訊號

- **指標**：計數器 + 直方圖 (Token 使用量、訊息流程、佇列)。
- **追蹤**：模型使用量 + webhook/訊息處理的 spans。
- **日誌**：啟用 `diagnostics.otel.logs` 時透過 OTLP 匯出。日誌量可能很高；請注意 `logging.level` 和匯出器過濾器。

### 診斷事件目錄

模型使用：

- `model.usage`：tokens、成本、持續時間、上下文、提供者/模型/通道、會話 ID。

訊息流程：

- `webhook.received`：每個通道的 webhook 進入。
- `webhook.processed`：webhook 已處理 + 持續時間。
- `webhook.error`：webhook 處理器錯誤。
- `message.queued`：訊息已進入處理佇列。
- `message.processed`：結果 + 持續時間 + 選擇性錯誤。

佇列 + 會話：

- `queue.lane.enqueue`：指令佇列通道進入 + 深度。
- `queue.lane.dequeue`：指令佇列通道離開 + 等待時間。
- `session.state`：會話狀態轉換 + 原因。
- `session.stuck`：會話卡住警告 + 持續時間。
- `run.attempt`：執行重試/嘗試中繼資料。
- `diagnostic.heartbeat`：彙總計數器 (webhooks/queue/session)。

### 啟用診斷（無匯出器）

如果您希望插件或自訂匯出可以使用診斷事件，請使用此功能：

```json
{
  "diagnostics": {
    "enabled": true
  }
}
```

### 診斷標誌（目標日誌）

使用標誌來開啟額外的、目標除錯日誌，而不需提高 `logging.level`。標誌不區分大小寫並支援萬用字元 (例如 `telegram.*` 或 `*`)。

```json
{
  "diagnostics": {
    "flags": ["telegram.http"]
  }
}
```

Env 覆寫（一次性）：

```
OPENCLAW_DIAGNOSTICS=telegram.http,telegram.payload
```

備註：

- 標誌日誌會進入標準日誌檔案（與 `logging.file` 相同）。
- 輸出仍會根據 `logging.redactSensitive` 進行編修。
- 完整指南：[/diagnostics/flags](/zh-Hant/diagnostics/flags)。

### 匯出到 OpenTelemetry

診斷可以透過 `diagnostics-otel` 插件 (OTLP/HTTP) 匯出。這適用於任何接受 OTLP/HTTP 的 OpenTelemetry 收集器/後端。

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

- 您也可以使用 `openclaw plugins enable diagnostics-otel` 啟用插件。
- `protocol` 目前僅支援 `http/protobuf`。`grpc` 會被忽略。
- 指標包括 token 使用量、成本、內容大小、執行持續時間，以及訊息流程計數器/直方圖 (webhooks、佇列、會話狀態、佇列深度/等待時間)。
- 可以使用 `traces` / `metrics` (預設：開啟) 來切換追蹤/指標。啟用時，追蹤包含模型使用範圍以及 webhook/訊息處理範圍。
- 當您的收集器需要驗證時，請設定 `headers`。
- 支援的環境變數：`OTEL_EXPORTER_OTLP_ENDPOINT`、`OTEL_SERVICE_NAME`、`OTEL_EXPORTER_OTLP_PROTOCOL`。

### 匯出的指標 (名稱 + 類型)

模型使用情況：

- `openclaw.tokens` (counter, attrs: `openclaw.token`, `openclaw.channel`, `openclaw.provider`, `openclaw.model`)
- `openclaw.cost.usd` (counter, attrs: `openclaw.channel`, `openclaw.provider`, `openclaw.model`)
- `openclaw.run.duration_ms` (histogram, attrs: `openclaw.channel`, `openclaw.provider`, `openclaw.model`)
- `openclaw.context.tokens` (histogram, attrs: `openclaw.context`, `openclaw.channel`, `openclaw.provider`, `openclaw.model`)

訊息流程：

- `openclaw.webhook.received` (counter, attrs: `openclaw.channel`, `openclaw.webhook`)
- `openclaw.webhook.error` (counter, attrs: `openclaw.channel`, `openclaw.webhook`)
- `openclaw.webhook.duration_ms` (histogram, attrs: `openclaw.channel`, `openclaw.webhook`)
- `openclaw.message.queued` (counter, attrs: `openclaw.channel`, `openclaw.source`)
- `openclaw.message.processed` (counter, attrs: `openclaw.channel`, `openclaw.outcome`)
- `openclaw.message.duration_ms` (histogram, attrs: `openclaw.channel`, `openclaw.outcome`)

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

### 匯出的 Spans (名稱 + 關鍵屬性)

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

### 取樣 + 排清

- 追蹤取樣: `diagnostics.otel.sampleRate` (0.0–1.0, 僅限 root spans)。
- 指標匯出間隔: `diagnostics.otel.flushIntervalMs` (最小 1000ms)。

### 協議備註

- OTLP/HTTP 端點可以透過 `diagnostics.otel.endpoint` 或
  `OTEL_EXPORTER_OTLP_ENDPOINT` 來設定。
- 如果端點已包含 `/v1/traces` 或 `/v1/metrics`，則按原樣使用。
- 如果端點已包含 `/v1/logs`，則會按原樣用於日誌。
- `diagnostics.otel.logs` 啟用主記錄器輸出的 OTLP 日誌匯出。

### 日誌匯出行為

- OTLP 日誌使用寫入 `logging.file` 的相同結構化記錄。
- 遵循 `logging.level` (檔案日誌等級)。主控台編校**不**適用於 OTLP 日誌。
- 高安裝量的環境應優先使用 OTLP 收集器取樣/過濾。

## 故障排除提示

- **無法連線到 Gateway？** 請先執行 `openclaw doctor`。
- **日誌是空的？** 請檢查 Gateway 是否正在執行，以及是否正在寫入 `logging.file` 中的檔案路徑。
- **需要更多細節？** 將 `logging.level` 設定為 `debug` 或 `trace` 並重試。

import en from "/components/footer/en.mdx";

<en />
