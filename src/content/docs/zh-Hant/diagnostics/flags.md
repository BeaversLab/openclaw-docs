---
summary: "針對性偵錯日誌的診斷旗標"
read_when:
  - You need targeted debug logs without raising global logging levels
  - You need to capture subsystem-specific logs for support
title: "診斷旗標"
---

診斷旗標可讓您啟用目標偵錯記錄，而不需要在任何地方開啟詳細記錄。旗標為選用性質，除非子系統檢查它們，否則不會有任何作用。

## 運作方式

- 旗標是字串 (不區分大小寫)。
- 您可以透過設定檔或環境變數覆寫來啟用旗標。
- 支援萬用字元：
  - `telegram.*` 符合 `telegram.http`
  - `*` 啟用所有旗標

## 透過設定檔啟用

```json
{
  "diagnostics": {
    "flags": ["telegram.http"]
  }
}
```

多個旗標：

```json
{
  "diagnostics": {
    "flags": ["telegram.http", "brave.http", "gateway.*"]
  }
}
```

變更旗標後請重新啟動閘道。

## 環境變數覆寫 (單次)

```bash
OPENCLAW_DIAGNOSTICS=telegram.http,telegram.payload
```

停用所有旗標：

```bash
OPENCLAW_DIAGNOSTICS=0
```

## 時間軸產出

`timeline` 旗標會寫入結構化的啟動和執行階段計時事件，供外部 QA 測試工具使用：

```bash
OPENCLAW_DIAGNOSTICS=timeline \
OPENCLAW_DIAGNOSTICS_TIMELINE_PATH=/tmp/openclaw-timeline.jsonl \
openclaw gateway run
```

您也可以在設定中啟用它：

```json
{
  "diagnostics": {
    "flags": ["timeline"]
  }
}
```

時間軸檔案路徑仍然來自
`OPENCLAW_DIAGNOSTICS_TIMELINE_PATH`。當 `timeline` 僅透過設定啟用時，最早的設定載入區間（span）不會被發出，因為 OpenClaw 尚未讀取設定；後續的啟動區間則會使用設定旗標。

`OPENCLAW_DIAGNOSTICS=1`、`OPENCLAW_DIAGNOSTICS=all` 和
`OPENCLAW_DIAGNOSTICS=*` 也會啟用時間軸，因為它們會啟用每個診斷旗標。如果您只想要 JSONL 計時產出，建議使用 `timeline`。

時間軸記錄使用 `openclaw.diagnostics.v1` 封裝格式。事件可以包含
行程 ID、階段名稱、區間名稱、持續時間、外掛 ID、相依性計數、
事件迴圈延遲樣本、提供者操作名稱、子行程結束狀態、
以及啟動錯誤名稱/訊息。請將時間軸檔案視為本機診斷
產出；在分享到您機器外部之前，請先審閱這些檔案。

## 日誌位置

旗標會將日誌輸出至標準診斷日誌檔案。預設情況下：

```
/tmp/openclaw/openclaw-YYYY-MM-DD.log
```

如果您設定了 `logging.file`，則改用該路徑。日誌為 JSONL 格式（每行一個 JSON 物件）。基於 `logging.redactSensitive` 的編輯規則仍然適用。

## 擷取日誌

選擇最新的日誌檔案：

```bash
ls -t /tmp/openclaw/openclaw-*.log | head -n 1
```

篩選 Telegram HTTP 診斷：

```bash
rg "telegram http error" /tmp/openclaw/openclaw-*.log
```

篩選 Brave Search HTTP 診斷：

```bash
rg "brave http" /tmp/openclaw/openclaw-*.log
```

或在重現問題時持續監看（tail）：

```bash
tail -f /tmp/openclaw/openclaw-$(date +%F).log | rg "telegram http error"
```

對於遠端閘道，您也可以使用 `openclaw logs --follow`（請參閱 [/cli/logs](/zh-Hant/cli/logs)）。

## 備註

- 如果 `logging.level` 設定得比 `warn` 高，這些日誌可能會被抑制。預設的 `info` 即可。
- `brave.http` 會記錄 Brave Search 要求 URL/查詢參數、回應狀態/時間，以及快取命中/未命中/寫入事件。它不會記錄 API 金鑰或回應內容，但搜尋查詢可能會包含敏感資訊。
- 啟用旗標是安全的；它們只會影響特定子系統的記錄量。
- 使用 [/logging](/zh-Hant/logging) 來變更記錄目的地、層級和編修設定。

## 相關

- [Gateway diagnostics](/zh-Hant/gateway/diagnostics)
- [Gateway troubleshooting](/zh-Hant/gateway/troubleshooting)
