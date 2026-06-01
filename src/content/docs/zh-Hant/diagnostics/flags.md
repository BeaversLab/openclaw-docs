---
summary: "用於目標調試日誌的診斷標誌"
read_when:
  - You need targeted debug logs without raising global logging levels
  - You need to capture subsystem-specific logs for support
title: "診斷標誌"
---

診斷旗標可讓您啟用目標偵錯記錄，而不需要在任何地方開啟詳細記錄。旗標為選用性質，除非子系統檢查它們，否則不會有任何作用。

## 運作方式

- 旗標是字串 (不區分大小寫)。
- 您可以透過設定檔或環境變數覆寫來啟用旗標。
- 支援萬用字元：
  - `telegram.*` 符合 `telegram.http`
  - `*` 啟用所有標誌

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

`OPENCLAW_DIAGNOSTICS=0` 是進程級別的停用覆蓋：它會停用
該進程來自環境變數和組態的標誌。

## 分析標誌

分析器標誌可在不提高全域日誌
層級的情況下啟用目標計時範圍。它們預設為停用。

針對單一閘道執行啟用所有分析器閘控範圍：

```bash
OPENCLAW_DIAGNOSTICS=profiler openclaw gateway run
```

僅啟用 reply-dispatch 分析器範圍：

```bash
OPENCLAW_DIAGNOSTICS=reply.profiler openclaw gateway run
```

僅啟用 Codex 應用伺服器啟動/工具/執行緒分析器範圍：

```bash
OPENCLAW_DIAGNOSTICS=codex.profiler openclaw gateway run
```

從組態啟用分析器標誌：

```json
{
  "diagnostics": {
    "flags": ["reply.profiler", "codex.profiler"]
  }
}
```

變更組態標誌後請重新啟動閘道。若要停用分析器標誌，
請從 `diagnostics.flags` 中移除並重新啟動。若要暫時停用每個
診斷標誌（即使組態啟用了分析器標誌），請使用以下指令啟動程序：

```bash
OPENCLAW_DIAGNOSTICS=0 openclaw gateway run
```

## 時間線產出

`timeline` 標誌會寫入結構化的啟動和執行時計時事件，
供外部 QA 工具使用：

```bash
OPENCLAW_DIAGNOSTICS=timeline \
OPENCLAW_DIAGNOSTICS_TIMELINE_PATH=/tmp/openclaw-timeline.jsonl \
openclaw gateway run
```

您也可以在組態中啟用它：

```json
{
  "diagnostics": {
    "flags": ["timeline"]
  }
}
```

時間線檔案路徑仍然來自
`OPENCLAW_DIAGNOSTICS_TIMELINE_PATH`。當 `timeline` 僅從
組態啟用時，由於 OpenClaw 尚未讀取組態，因此不會發出最早的組態載入範圍；隨後的啟動範圍會使用組態標誌。

`OPENCLAW_DIAGNOSTICS=1`、`OPENCLAW_DIAGNOSTICS=all` 和
`OPENCLAW_DIAGNOSTICS=*` 也會啟用時間線，因為它們會啟用每個
診斷標誌。如果您只想要 JSONL 計時
產出，建議使用 `timeline`。

時間線記錄使用 `openclaw.diagnostics.v1` 封套。事件可以包含
程序 ID、階段名稱、範圍名稱、持續時間、外掛程式 ID、相依性計數、
事件迴圈延遲樣本、提供者操作名稱、子程序退出狀態，
以及啟動錯誤名稱/訊息。請將時間線檔案視為本機診斷
產出；在分享到您機器外部之前請先進行檢閱。

## 日誌位置

標誌會將日誌輸出至標準診斷日誌檔案。預設情況下：

```
/tmp/openclaw/openclaw-YYYY-MM-DD.log
```

如果您設定了 `logging.file`，請改用該路徑。日誌為 JSONL 格式（每行一個 JSON 物件）。根據 `logging.redactSensitive`，仍會套用編校。

## 提取日誌

選擇最新的日誌檔案：

```bash
ls -t /tmp/openclaw/openclaw-*.log | head -n 1
```

篩選 Telegram HTTP 診斷資訊：

```bash
rg "telegram http error" /tmp/openclaw/openclaw-*.log
```

篩選 Brave Search HTTP 診斷資訊：

```bash
rg "brave http" /tmp/openclaw/openclaw-*.log
```

或在重現問題時持續監看：

```bash
tail -f /tmp/openclaw/openclaw-$(date +%F).log | rg "telegram http error"
```

對於遠端閘道，您也可以使用 `openclaw logs --follow`（請參閱 [/cli/logs](/zh-Hant/cli/logs)）。

## 注意事項

- 如果 `logging.level` 的設定值高於 `warn`，這些日誌可能會被隱藏。預設值 `info` 即可。
- `brave.http` 會記錄 Brave Search 的請求 URL/查詢參數、回應狀態/時間，以及快取命中/遺失/寫入事件。它不會記錄 API 金鑰或回應內容，但搜尋查詢可能具有敏感性。
- 保留啟用的旗標是安全的；它們只會影響特定子系統的日誌量。
- 使用 [/logging](/zh-Hant/logging) 來變更日誌目的地、層級和編校設定。

## 相關內容

- [閘道診斷](/zh-Hant/gateway/diagnostics)
- [閘道疑難排解](/zh-Hant/gateway/troubleshooting)
