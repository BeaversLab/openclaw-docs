---
summary: "檔案日誌、主控台輸出、CLI 即時追蹤以及控制 UI 的日誌分頁"
read_when:
  - You need a beginner-friendly overview of OpenClaw logging
  - You want to configure log levels, formats, or redaction
  - You are troubleshooting and need to find logs quickly
title: "記錄"
---

OpenClaw 有兩個主要的日誌表面：

- **檔案日誌** (JSON 行) 由 Gateway 寫入。
- **主控台輸出** 顯示在終端機和 Gateway Debug UI 中。

控制 UI 的 **日誌** 分頁會追蹤 gateway 的檔案日誌。本頁面說明日誌存在於何處、如何閱讀日誌，以及如何設定日誌層級和格式。

## 日誌存放位置

根據預設，Gateway 會在以下位置寫入輪替日誌檔案：

`/tmp/openclaw/openclaw-YYYY-MM-DD.log`

日期使用 gateway 主機的當地時區。

當檔案達到 `logging.maxFileBytes` (預設：100 MB) 時，每個檔案會輪替。
OpenClaw 會在現用檔案旁保留最多五個編號的封存檔，例如
`openclaw-YYYY-MM-DD.1.log`，並持續寫入到新的現用日誌，而不是
抑制診斷輸出。

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

- `--local-time`：以您的當地時區呈現時間戳記
- `--url <url>` / `--token <token>` / `--timeout <ms>`：標準 Gateway RPC 旗標
- `--expect-final`：agent 支援的 RPC 最終回應等待旗標 (此處透過共用客戶端層接受)

輸出模式：

- **TTY sessions**（TTY 工作階段）：美觀、色彩化、結構化的記錄行。
- **Non-TTY sessions**（非 TTY 工作階段）：純文字。
- `--json`：以行分隔的 JSON (每行一個日誌事件)。
- `--plain`：在 TTY 會話中強制使用純文字。
- `--no-color`：停用 ANSI 顏色。

當您傳遞明確的 `--url` 時，CLI 不會自動套用設定或
環境認證；如果目標 Gateway
需要認證，請自行包含 `--token`。

在 JSON 模式下，CLI 會發出帶有 `type` 標籤的物件：

- `meta`：串流中繼資料 (檔案、游標、大小)
- `log`：已解析的日誌項目
- `notice`：截斷 / 輪替提示
- `raw`：未解析的日誌行

如果本地回送 Gateway 要求配對，`openclaw logs` 會自動
還原到設定的本地日誌檔案。明確的 `--url` 目標
不會使用此還原機制。

如果 Gateway 無法連線，CLI 會印出一個簡短的提示來執行：

```bash
openclaw doctor
```

### Control UI (web)

控制 UI 的 **Logs** 標籤頁使用 `logs.tail` 追蹤同一個檔案。
請參閱 [/web/control-ui](/zh-Hant/web/control-ui) 以了解如何開啟它。

### 僅限 Channel 的記錄

若要過濾管道活動（WhatsApp/Telegram/等），請使用：

```bash
openclaw channels logs --channel whatsapp
```

## 日誌格式

### 檔案日誌 (JSONL)

日誌檔中的每一行都是一個 JSON 物件。CLI 和 Control UI 會解析這些條目，以呈現結構化輸出（時間、層級、子系統、訊息）。

檔案日誌 JSONL 記錄在可用時也包含可機器過濾的頂層欄位：

- `hostname`：Gateway 主機名稱。
- `message`：扁平化的日誌訊息文字，用於全文搜尋。
- `agent_id`：當日誌呼叫帶有代理程式 (agent) 語境時的啟用代理程式 ID。
- `session_id`：當日誌呼叫帶有 session 語境時的啟用 session ID/金鑰。
- `channel`：當日誌呼叫帶有頻道 (channel) 語境時的啟用頻道。

OpenClaw 會在這些欄位旁保留原始的結構化日誌引數，以便現有讀取編號 tslog 引數金鑰的剖析器 (parser) 能繼續運作。

### 主控台輸出

主控台日誌具備 **TTY 感知** (TTY-aware) 並已針對可讀性進行格式化：

- 子系統前綴 (例如 `gateway/channels/whatsapp`)
- 層級著色 (info/warn/error)
- 可選的精簡 或 JSON 模式

主控台格式化由 `logging.consoleStyle` 控制。

### Gateway WebSocket 日誌

`openclaw gateway` 也有針對 RPC 流量的 WebSocket 協定日誌記錄：

- 一般模式：僅顯示有趣的結果 (錯誤、剖析錯誤、緩慢的呼叫)
- `--verbose`：所有請求/回應流量
- `--ws-log auto|compact|full`：選擇詳細的轉譯樣式
- `--compact`：`--ws-log compact` 的別名

範例：

```bash
openclaw gateway
openclaw gateway --verbose --ws-log compact
openclaw gateway --verbose --ws-log full
```

## 設定日誌記錄

所有日誌設定都位於 `~/.openclaw/openclaw.json` 中的 `logging` 之下。

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

您可以透過 **`OPENCLAW_LOG_LEVEL`** 環境變數 (例如 `OPENCLAW_LOG_LEVEL=debug`) 覆寫這兩者。環境變數的優先順序高於設定檔，因此您可以提高單次執行的詳細程度，而不需編輯 `openclaw.json`。您也可以傳遞全域 CLI 選項 **`--log-level <level>`** (例如 `openclaw --log-level debug gateway run`)，該選項會覆寫該指令的環境變數。

`--verbose` 僅影響主控台輸出和 WS 記錄詳細程度；它不會改變
檔案記錄層級。

### 追蹤關聯

檔案記錄為 JSONL。當記錄呼叫攜帶有效的診斷追蹤上下文時，
OpenClaw 會將追蹤欄位寫入為頂層 JSON 金鑰 (`traceId`, `spanId`,
`parentSpanId`, `traceFlags`)，以便外部記錄處理器能將該行
與 OTEL spans 和提供者的 `traceparent` 傳播相關聯。

Gateway HTTP 請求和 Gateway WebSocket 框架會建立一個內部請求
追蹤範圍。在該非同步範圍內發出的記錄和診斷事件，若未傳遞明確的追蹤上下文，則會繼承
請求追蹤。Agent 執行和
模型呼叫追蹤會成為活動請求追蹤的子項，因此本機記錄、
診斷快照、OTEL spans 和受信任提供者的 `traceparent` 標頭可以
透過 `traceId` 結合，而無需記錄原始請求或模型內容。

### 模型呼叫大小和計時

模型呼叫診斷會記錄有限的請求/回應測量值，而不
擷取原始提示或回應內容：

- `requestPayloadBytes`：最終模型請求負載的 UTF-8 位元組大小
- `responseStreamBytes`：串流模型回應事件的 UTF-8 位元組大小
- `timeToFirstByteMs`：第一次串流回應事件之前的經過時間
- `durationMs`：總模型呼叫持續時間

當啟用診斷匯出時，這些欄位可用於診斷快照、模型呼叫外掛攔截器和
OTEL 模型呼叫 spans/metrics。

### 主控台樣式

`logging.consoleStyle`：

- `pretty`：友善易讀、彩色、並帶有時間戳記。
- `compact`：更緊湊的輸出（適用於長時間的工作階段）。
- `json`：每行 JSON（適用於記錄處理器）。

### 編修

OpenClaw 可以在敏感權杖輸出到主控台、檔案記錄、
OTLP 記錄或持久化的工作階段文字記錄之前進行編修：

- `logging.redactSensitive`： `off` | `tools` (預設： `tools`)
- `logging.redactPatterns`：用於覆蓋預設集合的正規表示式字串列表

檔案記錄和工作階段記錄保持 JSONL 格式，但在將行或訊息寫入磁碟之前，會對符合的機密值進行遮罩。遮罩是盡力而為的：它適用於包含文字的訊息內容和記錄字串，而非每個識別碼或二進位負載欄位。

## 診斷與 OpenTelemetry

診斷是指用於模型執行和訊息流程遙測（webhooks、佇列、工作階段狀態）的結構化、機器可讀取事件。它們**不**會取代記錄——它們提供指標、追蹤和匯出器。無論您是否匯出這些事件，它們都會在程式內發出。

兩個相鄰的介面：

- **OpenTelemetry 匯出** — 透過 OTLP/HTTP 將指標、追蹤和記錄傳送到任何相容 OpenTelemetry 的收集器或後端（Grafana、Datadog、Honeycomb、New Relic、Tempo 等）。完整的組態、訊號目錄、指標/範圍名稱、環境變數和隱私模型位於專用頁面：[OpenTelemetry 匯出](/zh-Hant/gateway/opentelemetry)。
- **診斷旗標** — 目標除錯記錄旗標，可將額外記錄路由至 `logging.file` 而不會提高 `logging.level`。旗標不區分大小寫，並支援萬用字元（`telegram.*`、`*`）。在 `diagnostics.flags` 下組態，或透過 `OPENCLAW_DIAGNOSTICS=...` 環境變數覆寫。完整指南：[診斷旗標](/zh-Hant/diagnostics/flags)。

若要在沒有 OTLP 匯出的情況下啟用外掛程式或自訂接收器的診斷事件：

```json5
{
  diagnostics: { enabled: true },
}
```

如需透過 OTLP 匯出到收集器，請參閱 [OpenTelemetry 匯出](/zh-Hant/gateway/opentelemetry)。

## 故障排除提示

- **無法連線到 Gateway？** 請先執行 `openclaw doctor`。
- **記錄是空的？** 檢查 Gateway 是否正在執行，以及是否正在寫入 `logging.file` 中的檔案路徑。
- **需要更多細節？** 將 `logging.level` 設定為 `debug` 或 `trace` 並重試。

## 相關

- [OpenTelemetry 匯出](/zh-Hant/gateway/opentelemetry) — OTLP/HTTP 匯出、指標/範圍目錄、隱私模型
- [診斷旗標](/zh-Hant/diagnostics/flags) — 目標除錯記錄旗標
- [Gateway logging internals](/zh-Hant/gateway/logging) — WS 日誌樣式、子系統前綴和主控台捕獲
- [Configuration reference](/zh-Hant/gateway/configuration-reference#diagnostics) — 完整的 `diagnostics.*` 欄位參考
