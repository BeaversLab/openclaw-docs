---
summary: "用於目標偵錯日誌的診斷標誌"
read_when:
  - You need targeted debug logs without raising global logging levels
  - You need to capture subsystem-specific logs for support
title: "診斷標誌"
---

# 診斷標誌

診斷標誌讓您能夠啟用目標偵錯日誌，而不需要在所有地方開啟詳細記錄。標誌屬於選用性質，除非子系統檢查它們，否則不會產生任何效果。

## 運作方式

- 標誌是字串（不區分大小寫）。
- 您可以在設定中或透過環境變數覆寫來啟用標誌。
- 支援萬用字元：
  - `telegram.*` 符合 `telegram.http`
  - `*` 啟用所有標誌

## 透過設定啟用

```json
{
  "diagnostics": {
    "flags": ["telegram.http"]
  }
}
```

多個標誌：

```json
{
  "diagnostics": {
    "flags": ["telegram.http", "gateway.*"]
  }
}
```

變更標誌後請重新啟動閘道。

## 環境變數覆寫 (一次性)

```exec
OPENCLAW_DIAGNOSTICS=telegram.http,telegram.payload
```

停用所有標誌：

```exec
OPENCLAW_DIAGNOSTICS=0
```

## 日誌位置

標誌會將日誌輸出到標準診斷日誌檔中。預設為：

```
/tmp/openclaw/openclaw-YYYY-MM-DD.log
```

如果您設定了 `logging.file`，請改用該路徑。日誌為 JSONL 格式（每行一個 JSON 物件）。根據 `logging.redactSensitive` 的遮蔽規則仍然適用。

## 擷取日誌

選擇最新的日誌檔案：

```exec
ls -t /tmp/openclaw/openclaw-*.log | head -n 1
```

篩選 Telegram HTTP 診斷訊息：

```exec
rg "telegram http error" /tmp/openclaw/openclaw-*.log
```

或在重現問題時持續監看：

```exec
tail -f /tmp/openclaw/openclaw-$(date +%F).log | rg "telegram http error"
```

對於遠端閘道，您也可以使用 `openclaw logs --follow`（參閱 [/cli/logs](/zh-Hant/cli/logs)）。

## 備註

- 如果 `logging.level` 設定高於 `warn`，這些日誌可能會被隱藏。預設的 `info` 即可。
- 保持旗標啟用是安全的；它們只會影響特定子系統的日誌量。
- 使用 [/logging](/zh-Hant/logging) 來變更日誌目的地、層級和遮蔽設定。
