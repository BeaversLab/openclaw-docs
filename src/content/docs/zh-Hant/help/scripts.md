---
summary: "存放庫腳本：用途、範圍與安全性說明"
read_when:
  - Running scripts from the repo
  - Adding or changing scripts under ./scripts
title: "腳本"
---

# 腳本

`scripts/` 目錄包含用於本機工作流程和維護工作的輔助腳本。
當一項任務明確與腳本相關時，請使用這些腳本；否則請優先使用 CLI。

## 慣例

- 除非在文件或版本檢查清單中被提及，否則腳本均為**選用**。
- 當 CLI 介面存在時，請優先使用它（例如：auth monitoring 使用 `openclaw models status --check`）。
- 請假設腳本是特定於主機的；在新機器上執行前請先閱讀腳本內容。

## Auth 監控腳本

Auth 監控腳本的文件位於此處：
[/automation/auth-monitoring](/zh-Hant/automation/auth-monitoring)

## 新增腳本時

- 保持腳本專注且備有文件。
- 在相關文件中新增簡短的條目（如果沒有則建立一個）。
