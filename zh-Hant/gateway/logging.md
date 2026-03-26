---
summary: "日誌介面、檔案日誌、WS 日誌樣式以及主控台格式設定"
read_when:
  - Changing logging output or formats
  - Debugging CLI or gateway output
title: "日誌"
---

# 日誌

若要查看使用者導向的總覽（CLI + Control UI + config），請參閱 [/logging](/zh-Hant/logging)。

OpenClaw 有兩個日誌「介面」：

- **主控台輸出**（您在終端機 / Debug UI 中看到的內容）。
- **檔案日誌**（JSON 行），由 gateway logger 撰寫。

## 基於檔案的記錄器

- 預設的輪替日誌檔位於 `/tmp/openclaw/` 下（每天一個檔案）：`openclaw-YYYY-MM-DD.log`
  - 日期使用 gateway 主機的本地時區。
- 日誌檔案路徑和層級可以透過 `~/.openclaw/openclaw.json` 進行設定：
  - `logging.file`
  - `logging.level`

檔案格式為每行一個 JSON 物件。

Control UI 的「Logs」分頁透過閘道 (`logs.tail`) 追蹤此檔案。
CLI 也可以執行相同操作：

```bash
openclaw logs --follow
```

**Verbose 與日誌層級**

- **檔案日誌** 完全由 `logging.level` 控制。
- `--verbose` 僅影響 **主控台詳細度** (以及 WS 日誌樣式)；它 **不會**
  提升檔案日誌層級。
- 若要在檔案日誌中擷取僅詳細模式的資訊，請將 `logging.level` 設定為 `debug` 或
  `trace`。

## 主控台擷取

CLI 會擷取 `console.log/info/warn/error/debug/trace` 並將其寫入檔案日誌，
同時仍然列印到 stdout/stderr。

您可以透過以下方式獨立調整主控台詳細度：

- `logging.consoleLevel` (預設為 `info`)
- `logging.consoleStyle` (`pretty` | `compact` | `json`)

## 工具摘要編輯

詳細的工具摘要（例如 `🛠️ Exec: ...`）可以在敏感權杖進入
主控台串流之前將其遮蔽。這是**僅限工具**的功能，不會變更檔案記錄。

- `logging.redactSensitive`: `off` | `tools` (預設值: `tools`)
- `logging.redactPatterns`: 正規表示式字串陣列 (覆寫預設值)
  - 使用原始正規表示式字串 (自動 `gi`)，或者如果需要自訂旗標則使用 `/pattern/flags`。
  - 符合項目會透過保留前 6 個字元 + 後 4 個字元來遮蔽 (長度 >= 18)，否則為 `***`。
  - 預設值涵蓋了常見的金鑰指派、CLI 標誌、JSON 欄位、Bearer 標頭、PEM 區塊以及熱門的 Token 前綴。

## Gateway WebSocket 日誌

Gateway 會以兩種模式列印 WebSocket 協定日誌：

- **一般模式（無 `--verbose`）**：僅列印「有趣」的 RPC 結果：
  - 錯誤（`ok=false`）
  - 慢速呼叫（預設閾值：`>= 50ms`）
  - 解析錯誤
- **詳細模式（`--verbose`）**：列印所有 WS 請求/回應流量。

### WS 日誌樣式

`openclaw gateway` 支援針對每個 Gateway 的樣式切換：

- `--ws-log auto`（預設值）：一般模式已最佳化；詳細模式使用精簡輸出
- `--ws-log compact`：詳細模式時使用精簡輸出（成對的請求/回應）
- `--ws-log full`：詳細模式時使用完整的逐幀輸出
- `--compact`: alias for `--ws-log compact`

Examples:

```bash
# optimized (only errors/slow)
openclaw gateway

# show all WS traffic (paired)
openclaw gateway --verbose --ws-log compact

# show all WS traffic (full meta)
openclaw gateway --verbose --ws-log full
```

## Console formatting (subsystem logging)

The console formatter is **TTY-aware** and prints consistent, prefixed lines.
Subsystem loggers keep output grouped and scannable.

Behavior:

- **Subsystem prefixes** on every line (e.g. `[gateway]`, `[canvas]`, `[tailscale]`)
- **Subsystem colors** (stable per subsystem) plus level coloring
- **Color when output is a TTY or the environment looks like a rich terminal** (`TERM`/`COLORTERM`/`TERM_PROGRAM`), respects `NO_COLOR`
- **Shortened subsystem prefixes**: drops leading `gateway/` + `channels/`, keeps last 2 segments (e.g. `whatsapp/outbound`)
- **依子系統區分的子記錄器**（自動前綴 + 結構化欄位 `{ subsystem }`）
- **`logRaw()`** 用於 QR/UX 輸出（無前綴，無格式化）
- **主控台樣式**（例如 `pretty | compact | json`）
- **主控台日誌層級** 與檔案日誌層級分開（當 `logging.level` 設定為 `debug`/`trace` 時，檔案會保留完整細節）
- **WhatsApp 訊息內文** 記錄於 `debug`（使用 `--verbose` 以查看）

這既保持了現有檔案日誌的穩定，又使互動式輸出便於瀏覽。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
