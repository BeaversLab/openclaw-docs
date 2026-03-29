---
summary: "啟動代理程式的引導程序，用於初始化工作區和身分識別檔案"
read_when:
  - Understanding what happens on the first agent run
  - Explaining where bootstrapping files live
  - Debugging onboarding identity setup
title: "代理程式引導"
sidebarTitle: "引導"
---

# 代理程式引導

引導是準備代理程式工作區並收集身分識別詳情的**首次執行**程序。它發生在入職之後，當代理程式第一次啟動時。

## 引導的作用

在代理程式首次執行時，OpenClaw 會引導工作區（預設為
`~/.openclaw/workspace`）：

- 初始化 `AGENTS.md`、`BOOTSTRAP.md`、`IDENTITY.md`、`USER.md`。
- 執行簡短的問答程序（一次一個問題）。
- 將身分識別和偏好設定寫入 `IDENTITY.md`、`USER.md`、`SOUL.md`。
- 完成後移除 `BOOTSTRAP.md`，使其僅執行一次。

## 執行位置

引導程序始終在 **閘道主機** 上執行。如果 macOS 應用程式連線到遠端閘道，工作區和引導檔案將位於該遠端機器上。

<Note>當閘道在另一台機器上執行時，請在閘道主機上編輯工作區檔案（例如，`user@gateway-host:~/.openclaw/workspace`）。</Note>

## 相關文件

- macOS 應用程式入職：[入職](/en/start/onboarding)
- 工作區佈局：[代理程式工作區](/en/concepts/agent-workspace)
