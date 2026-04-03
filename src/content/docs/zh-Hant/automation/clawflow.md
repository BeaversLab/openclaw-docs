---
summary: "關於版本說明和文件中較舊 ClawFlow 參考的相容性說明"
read_when:
  - You encounter ClawFlow or openclaw flows in older release notes or docs
  - You want to understand what ClawFlow terminology maps to in the current CLI
  - You want to translate older flow references into the supported task commands
title: "ClawFlow"
---

# ClawFlow

`ClawFlow` 出現在某些較舊的 OpenClaw 版本說明和文件中，彷彿它是一個面向使用者的執行環境，並且擁有自己的 `openclaw flows` 指令介面。

這並非此儲存庫中目前面向操作員的介面。

目前，用於檢查和管理分離工作 的支援 CLI 介面是 [`openclaw tasks`](/en/automation/tasks)。

## 目前應使用什麼

- `openclaw tasks list` 顯示已追蹤的分離執行
- `openclaw tasks show <lookup>` 依任務 ID、執行 ID 或 Session Key 顯示單一任務
- `openclaw tasks cancel <lookup>` 取消正在執行的任務
- `openclaw tasks audit` 列出過時或損壞的任務執行

```bash
openclaw tasks list
openclaw tasks show <lookup>
openclaw tasks cancel <lookup>
```

## 這對較舊的參考資料意味著什麼

如果您在以下內容中看到 `ClawFlow` 或 `openclaw flows`：

- 舊的版本說明
- Issue 討論串
- 過時的搜尋結果
- 過期的本機筆記

請將這些指示轉換為目前的任務 CLI：

- `openclaw flows list` -> `openclaw tasks list`
- `openclaw flows show <lookup>` -> `openclaw tasks show <lookup>`
- `openclaw flows cancel <lookup>` -> `openclaw tasks cancel <lookup>`

## 相關主題

- [背景任務](/en/automation/tasks) — 分離工作帳本
- [CLI: flows](/en/cli/flows) — 關於錯誤指令名稱的相容性說明
- [Cron 工作](/en/automation/cron-jobs) — 可能會建立任務的排程工作
