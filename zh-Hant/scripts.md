---
summary: "Repository scripts: purpose, scope, and safety notes"
read_when:
  - Running scripts from the repo
  - Adding or changing scripts under ./scripts
title: "Scripts"
---

# 腳本

`scripts/` 目錄包含用於本地工作流程和維運任務的輔助腳本。
當任務明確與腳本相關時使用這些腳本；否則優先使用 CLI。

## 慣例

- 除非在文件或發佈檢查清單中引用，否則腳本是**可選的**。
- 優先使用 CLI 介面（如果存在的話）（例如：auth monitoring 使用 `openclaw models status --check`）。
- 假設腳本是特定於主機的；在新機器上執行前請先閱讀腳本內容。

## Auth 監控腳本

Auth 監控腳本記錄於此：
[/automation/auth-monitoring](/zh-Hant/automation/auth-monitoring)

## 新增腳本時

- 保持腳本專注並附上文件。
- 在相關文件中新增簡短的條目（如果缺少則建立一個）。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
