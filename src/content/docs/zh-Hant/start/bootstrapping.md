---
summary: "啟動代理程式的引導程序，用於初始化工作區和身分識別檔案"
read_when:
  - Understanding what happens on the first agent run
  - Explaining where bootstrapping files live
  - Debugging onboarding identity setup
title: "Agent 啟動程序"
sidebarTitle: "引導"
---

啟動程序是準備 Agent 工作區並收集身分詳細資料的**首次執行**程序。它發生在入職之後，當 Agent 第一次啟動時。

## 啟動程序的作用

在首次執行 Agent 時，OpenClaw 會初始化工作區（預設
`~/.openclaw/workspace`）：

- 植入種子檔案 `AGENTS.md`、`BOOTSTRAP.md`、`IDENTITY.md`、`USER.md`。
- 執行簡短的問答程序（一次一個問題）。
- 將身分和偏好設定寫入 `IDENTITY.md`、`USER.md`、`SOUL.md`。
- 完成後移除 `BOOTSTRAP.md`，使其僅執行一次。

## 跳過啟動程序

若要為已預先植入的工作區跳過此程序，請執行 `openclaw onboard --skip-bootstrap`。

## 執行位置

啟動程序始終在 **gateway host** 上執行。如果 macOS 應用程式連線到遠端 Gateway，則工作區和啟動程式檔案位於該遠端機器上。

<Note>當 Gateway 在另一台機器上執行時，請在 gateway host 上編輯工作區檔案（例如，`user@gateway-host:~/.openclaw/workspace`）。</Note>

## 相關文件

- macOS 應用程式入職：[入職](/zh-Hant/start/onboarding)
- 工作區配置：[Agent 工作區](/zh-Hant/concepts/agent-workspace)
