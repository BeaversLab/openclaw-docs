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

身份驗證監控涵蓋於 [Authentication](/en/gateway/authentication)。`scripts/` 下的腳本是 systemd/Termux 手機工作流程的額外可選選項。

## GitHub 讀取輔助工具

當您希望 `gh` 在執行存放庫範圍的讀取呼叫時使用 GitHub App 安裝權杖，同時將一般的 `gh` 保留在您的個人登入中以進行寫入操作，請使用 `scripts/gh-read`。

必要環境變數：

- `OPENCLAW_GH_READ_APP_ID`
- `OPENCLAW_GH_READ_PRIVATE_KEY_FILE`

選用環境變數：

- 當您想要略過基於存放庫的安裝查詢時 `OPENCLAW_GH_READ_INSTALLATION_ID`
- `OPENCLAW_GH_READ_PERMISSIONS` 作為要求讀取權限子集的逗號分隔覆寫值

存放庫解析順序：

- `gh ... -R owner/repo`
- `GH_REPO`
- `git remote origin`

範例：

- `scripts/gh-read pr view 123`
- `scripts/gh-read run list -R openclaw/openclaw`
- `scripts/gh-read api repos/openclaw/openclaw/pulls/123`

## 新增腳本時

- 保持腳本專注並提供文件。
- 在相關文件中新增簡短條目（如果缺失則建立一個）。
