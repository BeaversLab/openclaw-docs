---
summary: "存放庫腳本：用途、範圍和安全注意事項"
read_when:
  - Running scripts from the repo
  - Adding or changing scripts under ./scripts
title: "腳本"
---

`scripts/` 目錄包含用於本地工作流程和維護任務的輔助腳本。
當任務明確與腳本相關時，請使用這些腳本；否則請優先使用 CLI。

## 慣例

- 除非在文件或發布檢查清單中引用，否則腳本是**可選的**。
- 當存在 CLI 介面時，請優先使用它們（例如：auth monitoring 使用 `openclaw models status --check`）。
- 假設腳本是特定於主機的；在新機器上運行之前請先閱讀它們。

## Auth monitoring scripts

Auth monitoring 在 [Authentication](/zh-Hant/gateway/authentication) 中有詳細說明。`scripts/` 下的腳本是針對 systemd/Termux 手機工作流程的可選額外功能。

## GitHub read helper

當您希望 `gh` 使用 GitHub App installation token 進行儲存庫範圍的讀取呼叫，同時將正常的 `gh` 保留在您的個人登入以進行寫入操作時，請使用 `scripts/gh-read`。

必要的環境變數：

- `OPENCLAW_GH_READ_APP_ID`
- `OPENCLAW_GH_READ_PRIVATE_KEY_FILE`

可選的環境變數：

- 當您想要跳過基於儲存庫的安裝查詢時，請使用 `OPENCLAW_GH_READ_INSTALLATION_ID`
- `OPENCLAW_GH_READ_PERMISSIONS` 作為以逗號分隔的覆寫值，用於請求讀取權限的子集

儲存庫解析順序：

- `gh ... -R owner/repo`
- `GH_REPO`
- `git remote origin`

範例：

- `scripts/gh-read pr view 123`
- `scripts/gh-read run list -R openclaw/openclaw`
- `scripts/gh-read api repos/openclaw/openclaw/pulls/123`

## 新增腳本時

- 保持腳本專注且具備文件說明。
- 在相關文件中新增簡短的條目（如果缺少則建立一個）。

## 相關

- [Testing](/zh-Hant/help/testing)
- [Testing live](/zh-Hant/help/testing-live)
