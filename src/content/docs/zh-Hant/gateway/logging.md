---
summary: "日誌表面、檔案日誌、WS 日誌樣式與主控台格式"
read_when:
  - Changing logging output or formats
  - Debugging CLI or gateway output
title: "Gateway logging"
---

# 日誌

如需使用者導向的總覽（CLI + Control UI + 設定），請參閱 [/logging](/zh-Hant/logging)。

OpenClaw 有兩個日誌「表面」：

- **主控台輸出**（您在終端機 / Debug UI 中看到的內容）。
- **檔案日誌**（JSON 行），由 gateway logger 寫入。

## 基於檔案的記錄器

- 預設的輪替日誌檔案位於 `/tmp/openclaw/`（每天一個檔案）： `openclaw-YYYY-MM-DD.log`
  - 日期使用 gateway 主機的本地時區。
- Active log files rotate at `logging.maxFileBytes` (default: 100 MB), keeping
  up to five numbered archives and continuing to write a fresh active file.
- The log file path and level can be configured via `~/.openclaw/openclaw.json`:
  - `logging.file`
  - `logging.level`

The file format is one JSON object per line.

The Control UI Logs tab tails this file via the gateway (`logs.tail`).
CLI can do the same:

```bash
openclaw logs --follow
```

**Verbose vs. log levels**

- **File logs** are controlled exclusively by `logging.level`.
- `--verbose` only affects **console verbosity** (and WS log style); it does **not**
  raise the file log level.
- To capture verbose-only details in file logs, set `logging.level` to `debug` or
  `trace`.

## Console capture

The CLI captures `console.log/info/warn/error/debug/trace` and writes them to file logs,
while still printing to stdout/stderr.

You can tune console verbosity independently via:

- `logging.consoleLevel` (default `info`)
- `logging.consoleStyle` (`pretty` | `compact` | `json`)

## Redaction

OpenClaw can mask sensitive tokens before log or transcript output leaves the
process. The same redaction policy is applied at console, file-log, OTLP
log-record, and session transcript text sinks, so matching secret values are
masked before JSONL lines or messages are written to disk.

- `logging.redactSensitive`: `off` | `tools` (default: `tools`)
- `logging.redactPatterns`: array of regex strings (overrides defaults)
  - Use raw regex strings (auto `gi`), or `/pattern/flags` if you need custom flags.
  - Matches are masked by keeping the first 6 + last 4 chars (length >= 18), otherwise `***`.
  - Defaults cover common key assignments, CLI flags, JSON fields, bearer headers, PEM blocks, and popular token prefixes.

## Gateway WebSocket logs

閘道會以兩種模式列印 WebSocket 協定記錄：

- **一般模式 (無 `--verbose`)**：僅列印「有趣」的 RPC 結果：
  - 錯誤 (`ok=false`)
  - 慢速呼叫 (預設閾值：`>= 50ms`)
  - 解析錯誤
- **詳細模式 (`--verbose`)**：列印所有 WS 請求/回應流量。

### WS 記錄樣式

`openclaw gateway` 支援各閘道的樣式切換：

- `--ws-log auto` (預設)：一般模式已最佳化；詳細模式使用精簡輸出
- `--ws-log compact`：精簡輸出 (成對的請求/回應)，於詳細模式下
- `--ws-log full`：每個影格的完整輸出，於詳細模式下
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

## 主控台格式化 (子系統記錄)

主控台格式化器具備 **TTY 感知能力**，並列印一致且帶有前綴的行。
子系統記錄器會保持輸出的分組與可掃描性。

行為：

- **子系統前綴** 位於每一行 (例如 `[gateway]`, `[canvas]`, `[tailscale]`)
- **子系統顏色** (每個子系統固定) 加上等級顏色
- **當輸出為 TTY 或環境看起來像是豐富終端機時顯示顏色** (`TERM`/`COLORTERM`/`TERM_PROGRAM`)，會遵守 `NO_COLOR`
- **縮短的子系統前綴**：捨棄開頭的 `gateway/` + `channels/`，保留最後 2 個區段 (例如 `whatsapp/outbound`)
- **依子系統區分的子記錄器** (自動前綴 + 結構化欄位 `{ subsystem }`)
- **`logRaw()`** 用於 QR/UX 輸出 (無前綴，無格式化)
- **主控台樣式** (例如 `pretty | compact | json`)
- **主控台記錄等級** 與檔案記錄等級分開 (當 `logging.level` 設為 `debug`/`trace` 時，檔案會保留完整細節)
- **WhatsApp 訊息內容** 記錄於 `debug` (使用 `--verbose` 來查看它們)

這使現有的檔案日誌保持穩定，同時讓互動式輸出更易於掃讀。

## 相關

- [日誌記錄](/zh-Hant/logging)
- [OpenTelemetry 匯出](/zh-Hant/gateway/opentelemetry)
- [診斷匯出](/zh-Hant/gateway/diagnostics)
