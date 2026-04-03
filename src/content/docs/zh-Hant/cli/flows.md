---
summary: "關於誤載 `openclaw flows` 指令的相容性說明"
read_when:
  - You encounter openclaw flows in older release notes, issue threads, or search results
  - You want to know what command replaced openclaw flows
title: "flows"
---

# `openclaw flows`

`openclaw flows` **不是** 目前 OpenClaw CLI 的指令。

部分較舊的發行說明與文件錯誤記載了 `flows` 指令介面。受支援的操作員介面為 [`openclaw tasks`](/en/automation/tasks)。

```bash
openclaw tasks list
openclaw tasks show <lookup>
openclaw tasks cancel <lookup>
```

## 改用

- `openclaw tasks list` — 列出追蹤中的背景工作
- `openclaw tasks show <lookup>` — 透過工作 ID、執行 ID 或工作階段金鑰檢查單一工作
- `openclaw tasks cancel <lookup>` — 取消正在執行的背景工作
- `openclaw tasks notify <lookup> <policy>` — 變更工作通知行為
- `openclaw tasks audit` — 顯示陳舊或損壞的工作執行

## 為何保留此頁面

保留此頁面是為了讓來自較舊變更記錄項目、討論串和搜尋結果的現有連結，能導向明確的更正內容，而非死胡同。

## 相關

- [背景工作](/en/automation/tasks) — 分離式工作帳本
- [CLI 參考](/en/cli/index) — 完整指令樹
