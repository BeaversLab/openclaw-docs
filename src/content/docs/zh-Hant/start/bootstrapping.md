---
summary: "啟動代理程式的引導程序，用於初始化工作區和身分識別檔案"
read_when:
  - Understanding what happens on the first agent run
  - Explaining where bootstrapping files live
  - Debugging onboarding identity setup
title: "Agent 啟動程序"
sidebarTitle: "引導"
---

啟動引導是準備 Agent 工作區並收集身分詳細資料的**首次執行**程序。它發生在入職之後，即 Agent 第一次啟動時。

## 啟動程序的作用

在首次執行 Agent 時，OpenClaw 會初始化工作區（預設
`~/.openclaw/workspace`）：

- 植入種子檔案 `AGENTS.md`、`BOOTSTRAP.md`、`IDENTITY.md`、`USER.md`。
- 執行簡短的問答程序（一次一個問題）。
- 將身分和偏好設定寫入 `IDENTITY.md`、`USER.md`、`SOUL.md`。
- 完成後移除 `BOOTSTRAP.md`，使其僅執行一次。

對於嵌入/本地模型執行，OpenClaw 會將 `BOOTSTRAP.md` 排除在特權系統上下文之外。在主要的互動式首次執行中，它仍會在使用者提示詞中傳遞檔案內容，以便無法可靠呼叫 `read` 工具的模型也能完成此程序。如果目前的執行無法安全存取工作區，Agent 將收到有限的啟動引導說明，而不是一般的問候語。

## 跳過啟動引導

若要為已預先植入的工作區跳過此步驟，請執行 `openclaw onboard --skip-bootstrap`。

## 執行位置

啟動引導始終在 **gateway host**（閘道主機）上執行。如果 macOS 應用程式連接到遠端 Gateway，則工作區和啟動引導檔案位於該遠端機器上。

<Note>當 Gateway 在另一台機器上執行時，請在 gateway host（閘道主機）上編輯工作區檔案（例如，`user@gateway-host:~/.openclaw/workspace`）。</Note>

## 相關文件

- macOS 應用程式入職：[Onboarding](/zh-Hant/start/onboarding)
- 工作區佈局：[Agent workspace](/zh-Hant/concepts/agent-workspace)
