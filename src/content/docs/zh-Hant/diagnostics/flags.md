---
summary: "用於針對性偵錯日誌的診斷旗標"
read_when:
  - You need targeted debug logs without raising global logging levels
  - You need to capture subsystem-specific logs for support
title: "診斷旗標"
---

# 診斷旗標

診斷旗標讓您能夠啟用針對性的偵錯日誌，而無需在所有地方開啟詳細日誌。旗標是選擇加入的，除非子系統檢查它們，否則不會產生任何效果。

## 運作方式

- 旗標是字串（不區分大小寫）。
- 您可以在配置中或透過環境變數覆寫來啟用旗標。
- 支援萬用字元：
  - `telegram.*` 符合 `telegram.http`
  - `*` 啟用所有旗標

## 透過配置啟用

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

## 環境變數覆寫（一次性）

```bash
OPENCLAW_DIAGNOSTICS=telegram.http,telegram.payload
```

停用所有旗標：

```bash
OPENCLAW_DIAGNOSTICS=0
```

## 日誌位置

旗標會將日誌發送至標準診斷日誌檔案。預設情況下：

```
/tmp/openclaw/openclaw-YYYY-MM-DD.log
```

如果您設定 `logging.file`，請改用該路徑。日誌為 JSONL 格式（每行一個 JSON 物件）。基於 `logging.redactSensitive`，資料遮蔽仍然適用。

## 擷取日誌

選取最新的日誌檔案：

```bash
ls -t /tmp/openclaw/openclaw-*.log | head -n 1
```

篩選 Telegram HTTP 診斷：

```bash
rg "telegram http error" /tmp/openclaw/openclaw-*.log
```

或在重現問題時使用 tail 追蹤：

```bash
tail -f /tmp/openclaw/openclaw-$(date +%F).log | rg "telegram http error"
```

對於遠端閘道，您也可以使用 `openclaw logs --follow`（請參閱 [/cli/logs](/zh-Hant/cli/logs)）。

## 備註

- 如果 `logging.level` 設定得比 `warn` 高，這些日誌可能會被隱藏。預設的 `info` 即可。
- 保留啟用旗標是安全的；它們只會影響特定子系統的日誌數量。
- 使用 [/logging](/zh-Hant/logging) 來變更日誌目的地、等級和資料遮蔽。
