---
summary: "檔案日誌、主控台輸出、CLI 即時追蹤，以及控制 UI 日誌分頁"
read_when:
  - You need a beginner-friendly overview of OpenClaw logging
  - You want to configure log levels, formats, or redaction
  - You are troubleshooting and need to find logs quickly
title: "日誌記錄"
---

OpenClaw 有兩個主要的日誌表面：

- **檔案日誌** (JSON 行) 由 Gateway 寫入。
- **主控台輸出** 顯示在終端機和 Gateway Debug UI 中。

控制 UI 的 **日誌** 分頁會追蹤 gateway 的檔案日誌。本頁面說明日誌存在於何處、如何閱讀日誌，以及如何設定日誌層級和格式。

## 日誌存放位置

根據預設，Gateway 會在以下位置寫入輪替日誌檔案：

`/tmp/openclaw/openclaw-YYYY-MM-DD.log`

日期使用 gateway 主機的當地時區。

每個檔案在達到 `logging.maxFileBytes` 時會進行輪替（預設：100 MB）。
OpenClaw 會在作用中檔案旁保留最多五個編號的封存檔，例如
`openclaw-YYYY-MM-DD.1.log`，並持續寫入新的作用中日誌，而不是
停止輸出診斷資訊。

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

如果隱含的本地回環 Gateway 請求配對、在連線期間關閉，或在 `logs.tail` 回應之前逾時，`openclaw logs` 將自動回退到已設定的 Gateway 檔案日誌。明確的 `--url` 目標不使用此回退機制。`openclaw logs --follow` 更嚴格：在 Linux 上，如果可用，它會使用 PID 尋找使用中的 user-systemd Gateway 日誌，否則會持續重試即時 Gateway，而不是跟隨可能過時的並排檔案。

如果 Gateway 無法連線，CLI 會印出一個簡短的提示來執行：

```bash
openclaw doctor
```

### Control UI (web)

控制 UI 的 **Logs** 分頁使用 `logs.tail` 即時追蹤同一個檔案。
請參閱 [Control UI](/zh-Hant/web/control-ui) 以了解如何開啟它。

### 僅限 Channel 的記錄

若要過濾管道活動（WhatsApp/Telegram/等），請使用：

```bash
openclaw channels logs --channel whatsapp
```

## 日誌格式

### 檔案日誌 (JSONL)

日誌檔中的每一行都是一個 JSON 物件。CLI 和 Control UI 會解析這些條目，以呈現結構化輸出（時間、層級、子系統、訊息）。

檔案日誌 JSONL 記錄在可用時也包含可機器過濾的頂層欄位：

- `hostname`：gateway 主機名稱。
- `message`：用於全文搜尋的扁平化日誌訊息文字。
- `agent_id`：當日誌呼叫帶有 agent 內容時的使用中 agent id。
- `session_id`：當日誌呼叫帶有 session 內容時的使用中 session id/key。
- `channel`：當日誌呼叫帶有 channel 內容時的使用中 channel。

OpenClaw 會在這些欄位旁保留原始的結構化日誌引數，以便現有讀取編號 tslog 引數金鑰的剖析器 (parser) 能繼續運作。

Talk、即時語音和 managed-room 活動會透過同一個檔案日誌管線發出有限的生命週期日誌記錄。這些記錄包含事件類型、模式、傳輸、提供者，以及可用的時機/大小測量值，但會省略逐字稿文字、音訊負載、回合 ID、通話 ID 和提供者項目 ID。

### 主控台輸出

主控台日誌具有 **TTY 感知** 且格式化為易於閱讀：

- 子系統前綴（例如 `gateway/channels/whatsapp`）
- 層級著色（info/warn/error）
- 可選的精簡或 JSON 模式

主控台格式化由 `logging.consoleStyle` 控制。

### Gateway WebSocket 日誌

`openclaw gateway` 也有針對 RPC 流量的 WebSocket 通訊協定日誌記錄：

- 正常模式：僅顯示有趣的結果（錯誤、解析錯誤、慢速呼叫）
- `--verbose`：所有請求/回應流量
- `--ws-log auto|compact|full`：選擇詳細的渲染樣式
- `--compact`：`--ws-log compact` 的別名

範例：

```bash
openclaw gateway
openclaw gateway --verbose --ws-log compact
openclaw gateway --verbose --ws-log full
```

## 設定日誌記錄

所有日誌記錄配置都位於 `~/.openclaw/openclaw.json` 中的 `logging` 之下。

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

- `logging.level`：**file logs** (JSONL) 層級。
- `logging.consoleLevel`：**console** 詳細程度層級。

您可以透過 **`OPENCLAW_LOG_LEVEL`** 環境變數（例如 `OPENCLAW_LOG_LEVEL=debug`）覆寫這兩者。環境變數的優先順序高於設定檔，因此您可以在不編輯 `openclaw.json` 的情況下提高單次執行的詳細程度。您也可以傳遞全域 CLI 選項 **`--log-level <level>`**（例如 `openclaw --log-level debug gateway run`），這會覆寫該指令的環境變數。

`--verbose` 僅影響主控台輸出與 WS 記錄詳細程度；它不會變更檔案記錄層級。

### 目標模型傳輸診斷

當對提供者呼叫進行除錯時，請使用目標環境旗標，而不是將所有記錄提升到 `debug`：

```bash
OPENCLAW_DEBUG_MODEL_TRANSPORT=1 openclaw gateway
OPENCLAW_DEBUG_MODEL_PAYLOAD=tools OPENCLAW_DEBUG_SSE=events openclaw gateway
```

可用的旗標：

- `OPENCLAW_DEBUG_MODEL_TRANSPORT=1`：在 `info` 層級發出請求開始、擷取回應、SDK 標頭、第一個串流事件、串流完成及傳輸錯誤。
- `OPENCLAW_DEBUG_MODEL_PAYLOAD=summary`：在模型請求記錄中包含有限的請求承載摘要。
- `OPENCLAW_DEBUG_MODEL_PAYLOAD=tools`：在承載摘要中包含所有面向模型的工具名稱。
- `OPENCLAW_DEBUG_MODEL_PAYLOAD=full-redacted`：包含已編修且設有上限的 JSON 承載快照。僅在除錯時使用；機密會被編修，但提示與訊息文字可能仍會出現。
- `OPENCLAW_DEBUG_SSE=events`：發出首個事件與串流完成的時序。
- `OPENCLAW_DEBUG_SSE=peek`：另外發出前五個已編修的 SSE 事件承載，每個事件皆設有上限。
- `OPENCLAW_DEBUG_CODE_MODE=1`：發出程式碼模式模型介面診斷，包括當原生提供者工具因程式碼模式擁有工具介面而被隱藏時的情況。

這些旗標透過一般 OpenClaw 記錄進行記錄，因此 `openclaw logs --follow` 與控制 UI 記錄分頁會顯示它們。若沒有這些旗標，相同的診斷仍可在 `debug` 層級取得。

### 追蹤關聯

檔案記錄為 JSONL。當記錄呼叫攜帶有效的診斷追蹤內容時，OpenClaw 會將追蹤欄位寫入為頂層 JSON 金鑰 (`traceId`、`spanId`、`parentSpanId`、`traceFlags`)，以便外部記錄處理器能將該行與 OTEL 範圍 及提供者 `traceparent` 傳播進行關聯。

Gateway HTTP 請求和 Gateway WebSocket 框架會建立內部請求追蹤範圍。在該非同步範圍內發出的日誌和診斷事件，若未傳遞明確的追蹤上下文，則會繼承該請求追蹤。Agent 執行和模型呼叫追蹤會成為目前請求追蹤的子項，因此本機日誌、診斷快照、OTEL span 和受信任的提供者 `traceparent` 標頭可以透過 `traceId` 結合，而無需記錄原始請求或模型內容。

當啟用 OpenTelemetry 日誌匯出時，對話生命週期日誌記錄也會流傳至 OTLP 日誌，並使用與檔案日誌相同的邊界屬性。

### 模型呼叫大小與計時

模型呼叫診斷會記錄有邊界的請求/回應測量數據，而不會擷取原始提示詞或回應內容：

- `requestPayloadBytes`：最終模型請求承載的 UTF-8 位元組大小
- `responseStreamBytes`：串流模型回應事件的 UTF-8 位元組大小，不含 delta 事件上累積的 `partial` 快照
- `timeToFirstByteMs`：首次串流回應事件前的經過時間
- `durationMs`：模型呼叫總持續時間

當啟用診斷匯出時，這些欄位可用於診斷快照、模型呼叫外掛程式掛鉤以及 OTEL 模型呼叫 spans/metrics。

### 主控台樣式

`logging.consoleStyle`：

- `pretty`：人性化的彩色輸出，附帶時間戳記。
- `compact`：更緊湊的輸出（最適合長時間工作階段）。
- `json`：每行 JSON（供日誌處理器使用）。

### 資訊編輯

OpenClaw 可以在敏感權杖輸出到主控台、檔案日誌、OTLP 日誌記錄、持久化的工作階段逐字稿文字，或 Control UI 工具事件內容 (工具啟動引數、部分/最終結果內容、衍生的執行輸出和修補摘要) 之前，將其編輯：

- `logging.redactSensitive`： `off` | `tools` (預設： `tools`)
- `logging.redactPatterns`：用於覆蓋預設集的 regex 字串列表。自訂模式會套用在 Control UI 工具載荷的內建預設之上，因此新增模式絕不會削弱已由預設模式攔截到的值之編校效果。

檔案日誌和會話記錄保持 JSONL 格式，但在該行或訊息寫入磁碟之前，相符的秘密值會被遮蔽。編校為盡力而為：它適用於包含文字的訊息內容和日誌字串，而非每個識別碼或二進位負載欄位。

內建預設值涵蓋常見的 API 憑證和付款憑證欄位名稱，例如卡號、CVC/CVV、共用付款權杖和付款憑證，當它們以 JSON 欄位、URL 參數、CLI 標誌或指派形式出現時。

`logging.redactSensitive: "off"` 僅會停用此一般日誌/逐字稿原則。OpenClaw 仍會編校可顯示給 UI 用戶端、支援套件、診斷觀察器、核准提示或代理工具的安全邊界載荷。範例包括 Control UI 工具呼叫事件、`sessions_history` 輸出、診斷支援匯出、提供者錯誤觀察、exec 核准命令顯示，以及 Gateway WebSocket 協定日誌。自訂 `logging.redactPatterns` 仍可在這些介面上新增專案專屬的模式。

## 診斷和 OpenTelemetry

診斷是針對模型執行和訊息流程遙測（webhooks、佇列、會話狀態）的結構化、機器可讀取事件。它們**不**會取代日誌——它們提供指標、追蹤和匯出器。無論您是否匯出事件，都會在程序內發出事件。

兩個相鄰的介面：

- **OpenTelemetry 匯出** — 透過 OTLP/HTTP 將指標、追蹤和日誌傳送到任何相容 OpenTelemetry 的收集器或後端（Grafana、Datadog、Honeycomb、New Relic、Tempo 等）。完整設定、訊號目錄、指標/範圍名稱、環境變數和隱私模型位於專用頁面上：[OpenTelemetry 匯出](/zh-Hant/gateway/opentelemetry)。
- **診斷旗標** — 針對性的除錯日誌旗標，可將額外的日誌路由至 `logging.file` 而不提高 `logging.level`。旗標不區分大小寫並支援萬用字元（`telegram.*`、`*`）。在 `diagnostics.flags` 下設定或透過 `OPENCLAW_DIAGNOSTICS=...` 環境變數覆寫進行設定。完整指南：[診斷旗標](/zh-Hant/diagnostics/flags)。

若要在不進行 OTLP 匯出的情況下為外掛或自訂接收器啟用診斷事件：

```json5
{
  diagnostics: { enabled: true },
}
```

如需將 OTLP 匯出至收集器，請參閱 [OpenTelemetry 匯出](/zh-Hant/gateway/opentelemetry)。

## 疑難排解提示

- **無法連線到 Gateway？** 請先執行 `openclaw doctor`。
- **日誌是空的？** 請檢查 Gateway 是否正在執行，並且正在寫入 `logging.file` 中的檔案路徑。
- **需要更多細節？** 將 `logging.level` 設定為 `debug` 或 `trace` 並重試。

## 相關

- [OpenTelemetry 匯出](/zh-Hant/gateway/opentelemetry) — OTLP/HTTP 匯出、指標/跨度目錄、隱私模型
- [診斷旗標](/zh-Hant/diagnostics/flags) — 針對性的偵錯日誌旗標
- [Gateway 日誌內部機制](/zh-Hant/gateway/logging) — WS 日誌樣式、子系統前綴以及控制台擷取
- [組態參考](/zh-Hant/gateway/configuration-reference#diagnostics) — 完整的 `diagnostics.*` 欄位參考
