---
summary: "日誌表面、檔案日誌、WS 日誌樣式與主控台格式"
read_when:
  - Changing logging output or formats
  - Debugging CLI or gateway output
title: "Gateway 日誌"
---

# 日誌

如需使用者導向的總覽（CLI + Control UI + 設定），請參閱 [/logging](/zh-Hant/logging)。

OpenClaw 有兩個日誌「表面」：

- **主控台輸出**（您在終端機 / Debug UI 中看到的內容）。
- **檔案日誌**（JSON 行），由 gateway logger 寫入。

## 基於檔案的記錄器

- 預設的輪替日誌檔案位於 `/tmp/openclaw/`（每天一個檔案）： `openclaw-YYYY-MM-DD.log`
  - 日期使用 gateway 主機的本地時區。
- 日誌檔案路徑和層級可以透過 `~/.openclaw/openclaw.json` 進行設定：
  - `logging.file`
  - `logging.level`

檔案格式為每行一個 JSON 物件。

Control UI 的「日誌」分頁會透過 gateway (`logs.tail`) 追蹤此檔案。
CLI 也可以執行相同的操作：

```bash
openclaw logs --follow
```

**詳細輸出 vs. 日誌層級**

- **檔案日誌**僅由 `logging.level` 控制。
- `--verbose` 僅影響 **主控台詳細程度**（和 WS 日誌樣式）；它並**不**
  提高檔案日誌層級。
- 若要在檔案日誌中擷取僅限詳細輸出的細節，請將 `logging.level` 設定為 `debug` 或
  `trace`。

## 主控台擷取

CLI 會擷取 `console.log/info/warn/error/debug/trace` 並將其寫入檔案日誌，
同時仍會列印到 stdout/stderr。

您可以透過以下方式獨立調整主控台詳細程度：

- `logging.consoleLevel` (預設 `info`)
- `logging.consoleStyle` (`pretty` | `compact` | `json`)

## 工具摘要編修

詳細的工具摘要（例如 `🛠️ Exec: ...`）可以在敏感資訊進入
主控台串流之前將其遮蔽。這是**僅限工具**的功能，不會改變檔案日誌。

- `logging.redactSensitive`: `off` | `tools` (預設： `tools`)
- `logging.redactPatterns`: 正規表示式字串陣列 (覆蓋預設值)
  - 使用原始正則表達式字串（自動 `gi`），若需要自訂旗標則使用 `/pattern/flags`。
  - 符合項會透過保留前 6 個 + 後 4 個字元（長度 >= 18）來遮蔽，否則為 `***`。
  - 預設值涵蓋常見的金鑰指派、CLI 旗標、JSON 欄位、Bearer 標頭、PEM 區塊以及流行的 Token 前綴。

## Gateway WebSocket 日誌

Gateway 會以兩種模式列印 WebSocket 協定日誌：

- **一般模式（無 `--verbose`）**：僅列印「有趣」的 RPC 結果：
  - 錯誤 (`ok=false`)
  - 慢速呼叫（預設閾值：`>= 50ms`）
  - 解析錯誤
- **詳細模式 (`--verbose`)**：列印所有 WS 請求/回應流量。

### WS 日誌樣式

`openclaw gateway` 支援個別 Gateway 的樣式切換：

- `--ws-log auto`（預設）：一般模式已最佳化；詳細模式使用精簡輸出
- `--ws-log compact`：精簡輸出（成對請求/回應），當處於詳細模式時
- `--ws-log full`：完整的逐幀輸出，當處於詳細模式時
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

## 主控台格式化（子系統日誌）

主控台格式器具備 **TTY 感知能力**，並列印一致、帶有前綴的行。
子系統日誌器會將輸出保持分組且易於掃描。

行為：

- **子系統前綴**位於每一行（例如 `[gateway]`、`[canvas]`、`[tailscale]`）
- **子系統顏色**（每個子系統穩定）加上層級顏色
- **當輸出為 TTY 或環境看起來像豐富終端機時顯示顏色**（`TERM`/`COLORTERM`/`TERM_PROGRAM`），並尊重 `NO_COLOR`
- **縮短的子系統前綴**：捨棄開頭的 `gateway/` + `channels/`，保留最後 2 個區段（例如 `whatsapp/outbound`）
- **依子系統區分的子日誌器**（自動前綴 + 結構化欄位 `{ subsystem }`）
- **`logRaw()`** 用於 QR/UX 輸出（無前綴，無格式化）
- **主控台樣式**（例如 `pretty | compact | json`）
- **Console log level** 與 file log level 分開（當 `logging.level` 設為 `debug`/`trace` 時，檔案會保留完整細節）
- **WhatsApp message bodies** 記錄於 `debug`（使用 `--verbose` 來查看它們）

這樣既保持了現有檔案日誌的穩定，又讓互動式輸出易於掃讀。
