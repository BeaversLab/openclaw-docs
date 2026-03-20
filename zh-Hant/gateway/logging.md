---
summary: "Logging surfaces, file logs, WS log styles, and console formatting"
read_when:
  - Changing logging output or formats
  - Debugging CLI or gateway output
title: "Logging"
---

# Logging

For a user-facing overview (CLI + Control UI + config), see [/logging](/zh-Hant/logging).

OpenClaw has two log “surfaces”:

- **Console output** (what you see in the terminal / Debug UI).
- **File logs** (JSON lines) written by the gateway logger.

## File-based logger

- Default rolling log file is under `/tmp/openclaw/` (one file per day): `openclaw-YYYY-MM-DD.log`
  - Date uses the gateway host's local timezone.
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

## Tool summary redaction

Verbose tool summaries (e.g. `🛠️ Exec: ...`) can mask sensitive tokens before they hit the
console stream. This is **tools-only** and does not alter file logs.

- `logging.redactSensitive`: `off` | `tools` (default: `tools`)
- `logging.redactPatterns`: array of regex strings (overrides defaults)
  - 使用原始正則表達式字串（自動 `gi`），若需要自訂旗標則使用 `/pattern/flags`。
  - 匹配項會透過保留前 6 個與後 4 個字元（長度 >= 18）進行遮蔽，否則 `***`。
  - 預設值涵蓋常見的鍵值分配、CLI 旗標、JSON 欄位、bearer 標頭、PEM 區塊以及熱門的 token 前綴。

## Gateway WebSocket 記錄

Gateway 會以兩種模式列印 WebSocket 協定記錄：

- **一般模式（無 `--verbose`）**：僅列印「有趣」的 RPC 結果：
  - 錯誤（`ok=false`）
  - 緩慢呼叫（預設門檻：`>= 50ms`）
  - 解析錯誤
- **詳細模式（`--verbose`）**：列印所有 WS 請求/回應流量。

### WS 記錄樣式

`openclaw gateway` 支援各 Gateway 的樣式切換：

- `--ws-log auto`（預設）：一般模式已最佳化；詳細模式使用精簡輸出
- `--ws-log compact`：精簡輸出（配對的請求/回應）當處於詳細模式時
- `--ws-log full`：完整的逐幀輸出當處於詳細模式時
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

## 主控台格式化（子系統記錄）

主控台格式化工具具備 **TTY 感知能力**，並列印一致的帶前綴行。
子系統記錄器會讓輸出保持分組且易於掃描。

行為：

- **子系統前綴** 位於每一行（例如 `[gateway]`、`[canvas]`、`[tailscale]`）
- **子系統顏色**（每個子系統固定）加上層級顏色
- **當輸出為 TTY 或環境看似豐富終端機時顯示顏色**（`TERM`/`COLORTERM`/`TERM_PROGRAM`），並遵守 `NO_COLOR`
- **縮短的子系統前綴**：捨棄前導的 `gateway/` + `channels/`，保留最後 2 個區段（例如 `whatsapp/outbound`）
- **依子系統區分的子記錄器**（自動前綴 + 結構化欄位 `{ subsystem }`）
- **`logRaw()`** 用於 QR/UX 輸出（無前綴、無格式化）
- **主控台樣式**（例如 `pretty | compact | json`）
- **主控台記錄層級** 與檔案記錄層級分開（當 `logging.level` 設為 `debug`/`trace` 時，檔案會保留完整詳細資訊）
- **WhatsApp 訊息內容** 記錄於 `debug` 層級（使用 `--verbose` 以查看）

這既可保持現有檔案記錄的穩定性，又能讓互動式輸出易於掃讀。

import en from "/components/footer/en.mdx";

<en />
