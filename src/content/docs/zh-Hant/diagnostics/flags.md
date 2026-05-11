---
summary: "用於針對性偵錯日誌的診斷旗標"
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
    "flags": ["telegram.http", "gateway.*"]
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

## 記錄檔位置

旗標會將記錄輸出至標準診斷記錄檔。預設情況下：

```
/tmp/openclaw/openclaw-YYYY-MM-DD.log
```

如果您設定了 `logging.file`，則改用該路徑。記錄為 JSONL 格式 (每行一個 JSON 物件)。資料遮蔽仍根據 `logging.redactSensitive` 套用。

## 擷取記錄

選取最新的記錄檔：

```bash
ls -t /tmp/openclaw/openclaw-*.log | head -n 1
```

篩選 Telegram HTTP 診斷記錄：

```bash
rg "telegram http error" /tmp/openclaw/openclaw-*.log
```

或在重現問題時追蹤 (tail)：

```bash
tail -f /tmp/openclaw/openclaw-$(date +%F).log | rg "telegram http error"
```

對於遠端閘道，您也可以使用 `openclaw logs --follow` (請參閱 [/cli/logs](/zh-Hant/cli/logs))。

## 備註

- 如果 `logging.level` 的設定高於 `warn`，這些記錄可能會被隱藏。預設的 `info` 即可。
- 保持旗標啟用是安全的；它們只會影響特定子系統的記錄數量。
- 使用 [/logging](/zh-Hant/logging) 來變更記錄目的地、等級和資料遮蔽。

## 相關

- [Gateway diagnostics](/zh-Hant/gateway/diagnostics)
- [Gateway troubleshooting](/zh-Hant/gateway/troubleshooting)
