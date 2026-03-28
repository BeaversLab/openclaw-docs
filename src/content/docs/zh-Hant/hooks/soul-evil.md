---
summary: "SOUL Evil hook (swap SOUL.md with SOUL_EVIL.md)"
read_when:
  - You want to enable or tune the SOUL Evil hook
  - You want a purge window or random-chance persona swap
title: "SOUL Evil Hook"
---

# SOUL Evil Hook

SOUL Evil hook 會在清除窗口期間或隨機將 **注入** 的 `SOUL.md` 內容與 `SOUL_EVIL.md` 交換。它 **不** 會修改磁碟上的檔案。

## 運作原理

當 `agent:bootstrap` 運行時，該 hook 可以在組裝系統提示之前替換記憶體中的 `SOUL.md` 內容。如果 `SOUL_EVIL.md` 遺失或為空，OpenClaw 會記錄警告並保留正常的 `SOUL.md`。

子代理運行在其啟動檔案中 **不** 包含 `SOUL.md`，因此此 hook 對子代理沒有影響。

## 啟用

```exec
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

在代理工作區根目錄（即 `SOUL.md` 旁）中建立 `SOUL_EVIL.md`。

## 選項

- `file` (字串)：備用的 SOUL 檔案名稱 (預設：`SOUL_EVIL.md`)
- `chance` (數字 0–1)：每次執行時使用 `SOUL_EVIL.md` 的隨機機率
- `purge.at` (HH:mm)：每日清除開始時間 (24 小時制)
- `purge.duration` (持續時間)：視窗長度 (例如 `30s`、`10m`、`1h`)

**優先順序：** 清除視窗優先於隨機機率。

**時區：** 若已設定則使用 `agents.defaults.userTimezone`；否則使用主機時區。

## 備註

- 不會寫入或修改磁碟上的任何檔案。
- 如果 `SOUL.md` 不在引導清單中，此掛鉤不會執行任何動作。

## 參見

- [Hooks](/zh-Hant/hooks)
