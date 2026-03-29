---
summary: "存放庫腳本：用途、範圍和安全注意事項"
read_when:
  - Running scripts from the repo
  - Adding or changing scripts under ./scripts
title: "腳本"
---

# 腳本

`scripts/` 目錄包含用於本機工作流程和維運任務的輔助腳本。
當任務明確與腳本相關時，請使用這些腳本；否則建議優先使用 CLI。

## 慣例

- 除非在文件或發布檢查清單中引用，否則腳本是**可選的**。
- 當存在 CLI 介面時優先使用（例如：監控驗證使用 `openclaw models status --check`）。
- 假設腳本是特定於主機的；在新機器上執行前請先閱讀內容。

## 監控驗證腳本

監控驗證腳本的文件位於此處：
[/automation/auth-monitoring](/en/automation/auth-monitoring)

## 新增腳本時

- 保持腳本專注並附上文件。
- 在相關文件中新增簡短條目（如果缺少，請建立一個）。
