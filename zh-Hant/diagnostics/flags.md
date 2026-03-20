---
summary: "針對特定除錯記錄的診斷旗標"
read_when:
  - 您需要針對性的除錯記錄，而不提高全域記錄層級
  - 您需要擷取子系統特定的記錄以供技術支援
title: "診斷旗標"
---

# 診斷旗標

診斷旗標讓您能夠啟用針對性的除錯記錄，而無需到處開啟詳細記錄。旗標屬於選用性功能，除非子系統進行檢查，否則不會產生任何效果。

## 運作方式

- 旗標是字串（不區分大小寫）。
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

## 環境變數覆寫（一次性）

```bash
OPENCLAW_DIAGNOSTICS=telegram.http,telegram.payload
```

停用所有旗標：

```bash
OPENCLAW_DIAGNOSTICS=0
```

## 記錄位置

旗標會將記錄輸出到標準診斷記錄檔中。預設情況下：

```
/tmp/openclaw/openclaw-YYYY-MM-DD.log
```

如果您設定了 `logging.file`，則會改用該路徑。記錄為 JSONL 格式（每行一個 JSON 物件）。根據 `logging.redactSensitive` 套用遮碼規則依然有效。

## 擷取記錄

選取最新的記錄檔：

```bash
ls -t /tmp/openclaw/openclaw-*.log | head -n 1
```

篩選 Telegram HTTP 診斷記錄：

```bash
rg "telegram http error" /tmp/openclaw/openclaw-*.log
```

或在重現問題時持續追蹤：

```bash
tail -f /tmp/openclaw/openclaw-$(date +%F).log | rg "telegram http error"
```

對於遠端閘道，您也可以使用 `openclaw logs --follow`（請參閱 [/cli/logs](/zh-Hant/cli/logs)）。

## 備註

- 如果 `logging.level` 的設定高於 `warn`，這些記錄可能會被隱藏。預設的 `info` 即可。
- 將旗標保持啟用狀態是安全的；它們只會影響特定子系統的記錄量。
- 使用 [/logging](/zh-Hant/logging) 來變更記錄目的地、層級和遮碼設定。

import en from "/components/footer/en.mdx";

<en />
