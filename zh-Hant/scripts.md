---
summary: "存放庫腳本：用途、範圍與安全性說明"
read_when:
  - 從存放庫執行腳本
  - 新增或變更 ./scripts 下的腳本
title: "Scripts"
---

# Scripts

`scripts/` 目錄包含用於本機工作流程與維運任務的輔助腳本。
當任務明確與某個腳本相關時請使用這些腳本；否則請優先使用 CLI。

## 慣例

- 腳本屬於**選用**，除非在文件或發佈檢查清單中另有提及。
- 若存在 CLI 介面請優先使用（例如：Auth monitoring 使用 `openclaw models status --check`）。
- 請假設腳本是特定於主機的；在新的機器上執行前請先閱讀腳本內容。

## Auth monitoring scripts

Auth monitoring scripts 的相關文件在此：
[/automation/auth-monitoring](/zh-Hant/automation/auth-monitoring)

## 新增腳本時

- 保持腳本專注且具備文件。
- 在相關文件中新增簡短條目（若無則請建立）。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
