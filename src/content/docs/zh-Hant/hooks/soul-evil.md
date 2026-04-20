---
summary: "SOUL Evil hook（將 SOUL.md 與 SOUL_EVIL.md 交換）"
read_when:
  - You want to enable or tune the SOUL Evil hook
  - You want a purge window or random-chance persona swap
title: "SOUL Evil Hook"
---

# SOUL Evil Hook

SOUL Evil hook 會在清除視窗期間或隨機將 **注入** 的 `SOUL.md` 內容替換為 `SOUL_EVIL.md`。它**不**會修改磁碟上的檔案。

## 運作方式

當 `agent:bootstrap` 執行時，此 hook 可以在組裝系統提示之前在記憶體中替換 `SOUL.md` 內容。如果 `SOUL_EVIL.md` 遺失或為空，OpenClaw 會記錄警告並保留正常的 `SOUL.md`。

子代理執行 **不** 會在其啟動檔案中包含 `SOUL.md`，因此此 hook 對子代理沒有影響。

## 啟用

```bash
openclaw hooks enable soul-evil
```

然後設定配置：

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "soul-evil": {
          "enabled": true,
          "file": "SOUL_EVIL.md",
          "chance": 0.1,
          "purge": { "at": "21:00", "duration": "15m" }
        }
      }
    }
  }
}
```

在代理工作區根目錄（`SOUL.md` 旁）建立 `SOUL_EVIL.md`。

## 選項

- `file`（字串）：備用 SOUL 檔名（預設：`SOUL_EVIL.md`）
- `chance`（數字 0–1）：每次執行使用 `SOUL_EVIL.md` 的隨機機率
- `purge.at`（HH:mm）：每日清除開始時間（24小時制）
- `purge.duration`（持續時間）：視窗長度（例如 `30s`、`10m`、`1h`）

**優先順序：**清除視窗優先於機率。

**時區：**設定時使用 `agents.defaults.userTimezone`；否則使用主機時區。

## 注意事項

- 不會寫入或修改磁碟上的任何檔案。
- 如果 `SOUL.md` 不在啟動清單中，則此 hook 不會有任何作用。

## 相關連結

- [Hooks](/zh-Hant/hooks)
