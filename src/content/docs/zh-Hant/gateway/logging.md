---
summary: "日誌介面、檔案日誌、WS 日誌樣式以及主控台格式設定"
read_when:
  - Changing logging output or formats
  - Debugging CLI or gateway output
title: "Gateway 日誌記錄"
---

# 日誌

如需使用者層級的總覽（CLI + Control UI + 設定），請參閱 [/logging](/zh-Hant/logging)。

OpenClaw 有兩個日誌「介面」：

- **主控台輸出**（您在終端機 / Debug UI 中看到的內容）。
- **檔案日誌**（JSON 行），由 gateway logger 寫入。

啟動時，Gateway 會記錄已解析的預設代理程式模型以及影響新工作階段的模式預設值，例如：

```text
agent model: openai-codex/gpt-5.5 (thinking=medium, fast=on)
```

`thinking` 來自預設代理程式、模型參數或全域代理程式預設值；
當未設定時，啟動摘要會顯示 `medium`。`fast` 來自
預設代理程式或模型 `fastMode` 參數。

## 基於檔案的記錄器

- 預設的輪替日誌檔案位於 `/tmp/openclaw/` 下（每天一個檔案）：`openclaw-YYYY-MM-DD.log`
  - 日期使用 Gateway 主機的當地時區。
- 作用中的日誌檔案會在 `logging.maxFileBytes`（預設值：100 MB）進行輪替，保留
  最多五個編號的封存檔，並繼續寫入一個新的作用中檔案。
- 日誌檔案路徑和層級可以透過 `~/.openclaw/openclaw.json` 進行設定：
  - `logging.file`
  - `logging.level`

檔案格式為每行一個 JSON 物件。

Talk、即時語音和 managed-room 程式碼路徑使用共用的檔案記錄器來記錄
有界限的生命週期記錄。這些記錄旨在用於作業偵錯
和 OTLP 日誌匯出；逐字稿文字、音訊內容、回合 ID、通話 ID 和
提供者項目 ID 不會複製到日誌記錄中。

Control UI 的 Logs 分頁頁籤會透過 Gateway (`logs.tail`) 追蹤此檔案。
CLI 也可以執行相同的操作：

```bash
openclaw logs --follow
```

**Verbose 與日誌層級**

- **檔案日誌** 僅由 `logging.level` 控制。
- `--verbose` 僅會影響 **主控台詳細程度**（以及 WS 日誌樣式）；它並**不**
  會提高檔案日誌層級。
- 若要在檔案日誌中擷取僅限 verbose 的詳細資訊，請將 `logging.level` 設定為 `debug` 或
  `trace`。
- 追蹤日誌還包含針對選定熱門路徑的診斷時序摘要，例如外掛工具工廠準備。請參閱
  [/tools/plugin#slow-plugin-tool-setup](/zh-Hant/tools/plugin#slow-plugin-tool-setup)。

## 主控台擷取

CLI 會擷取 `console.log/info/warn/error/debug/trace` 並將其寫入檔案日誌，
同時仍會列印至 stdout/stderr。

您可以透過以下方式獨立調整主控台詳細度：

- `logging.consoleLevel` (預設為 `info`)
- `logging.consoleStyle` (`pretty` | `compact` | `json`)

## 編修

OpenClaw 可以在日誌或文字記錄輸出離開程序之前遮罩敏感權杖。此日誌編修策略會套用於主控台、檔案日誌、OTLP 日誌記錄以及會話文字記錄接收器，因此在將 JSONL 行或訊息寫入磁碟之前，會先遮罩符合的密碼值。

- `logging.redactSensitive`: `off` | `tools` (預設: `tools`)
- `logging.redactPatterns`: 正規表示式字串陣列 (會覆寫預設值)
  - 使用原始正規表示式字串 (自動 `gi`)，如果您需要自訂旗標，則使用 `/pattern/flags`。
  - 符合項目會透過保留前 6 個 + 後 4 個字元 (長度 >= 18) 來遮罩，否則 `***`。
  - 預設值涵蓋常見的金鑰指派、CLI 旗標、JSON 欄位、bearer 標頭、PEM 區塊、受歡迎的權杖前綴，以及付款憑證欄位名稱，例如卡號、CVC/CVV、共用付款權杖和付款憑證。

無論 `logging.redactSensitive` 為何，某些安全性邊界一律會進行編修。
這包括 Control UI 工具呼叫事件、`sessions_history` 工具輸出、
診斷支援匯出、提供者錯誤觀察、exec 核准命令
顯示以及 Gateway WebSocket 通訊協定日誌。這些介面可能仍會使用
`logging.redactPatterns` 作為額外模式，但 `redactSensitive: "off"`
不會讓它們輸出原始密碼。

## Gateway WebSocket 日誌

Gateway 會以兩種模式列印 WebSocket 通訊協定日誌：

- **正常模式 (無 `--verbose`)**: 僅列印「有趣」的 RPC 結果：
  - 錯誤 (`ok=false`)
  - 慢速呼叫 (預設閾值：`>= 50ms`)
  - 解析錯誤
- **詳細模式 (`--verbose`)**：列印所有 WS 請求/回應流量。

### WS 日誌樣式

`openclaw gateway` 支援針對每個閘道的樣式切換：

- `--ws-log auto` (預設)：正常模式已優化；詳細模式使用精簡輸出
- `--ws-log compact`：在詳細模式下使用精簡輸出 (配對的請求/回應)
- `--ws-log full`：在詳細模式下使用完整的逐框架輸出
- `--compact`：`--ws-log compact` 的別名

範例：

```bash
# optimized (only errors/slow)
openclaw gateway

# show all WS traffic (paired)
openclaw gateway --verbose --ws-log compact

# show all WS traffic (full meta)
openclaw gateway --verbose --ws-log full
```

## 主控台格式化 (子系統日誌記錄)

主控台格式化器具備 **TTY 感知** 能力，並列印一致的、帶有前綴的行。
子系統記錄器會將輸出保持分組且易於掃描。

行為：

- 每一行都有 **子系統前綴** (例如 `[gateway]`、`[canvas]`、`[tailscale]`)
- **子系統顏色** (每個子系統保持穩定) 加上等級顏色
- 當輸出是 TTY 或環境看起來像是豐富終端機時**顯示顏色** (`TERM`/`COLORTERM`/`TERM_PROGRAM`)，並尊重 `NO_COLOR`
- **縮短的子系統前綴**：捨棄開頭的 `gateway/` + `channels/`，保留最後 2 個區段 (例如 `whatsapp/outbound`)
- **依子系統區分的子記錄器** (自動前綴 + 結構化欄位 `{ subsystem }`)
- **`logRaw()`** 用於 QR/UX 輸出 (無前綴、無格式化)
- **主控台樣式** (例如 `pretty | compact | json`)
- **主控台日誌等級** 與檔案日誌等級分開 (當 `logging.level` 設定為 `debug`/`trace` 時，檔案會保留完整詳細資訊)
- **WhatsApp 訊息主體** 記錄於 `debug` 層級 (使用 `--verbose` 來檢視它們)

這既保持了現有檔案日誌的穩定性，又讓互動式輸出易於掃描。

## 相關

- [日誌記錄](/zh-Hant/logging)
- [OpenTelemetry 匯出](/zh-Hant/gateway/opentelemetry)
- [診斷資料匯出](/zh-Hant/gateway/diagnostics)
