---
summary: "代理引導程序，用於初始化工作區和身分檔案"
read_when:
  - Understanding what happens on the first agent run
  - Explaining where bootstrapping files live
  - Debugging onboarding identity setup
title: "代理引導程序"
sidebarTitle: "引導程序"
---

# 代理引導程序

引導程序是**首次運行**時的儀式，用於準備代理工作區並收集身分詳細資訊。這發生在入職之後，即代理首次啟動時。

## 引導程序的作用

在代理首次運行時，OpenClaw 會引導工作區（預設為
`~/.openclaw/workspace`）：

- 播種 `AGENTS.md`、`BOOTSTRAP.md`、`IDENTITY.md`、`USER.md`。
- 運行簡短的問答儀式（一次一個問題）。
- 將身分和偏好設定寫入 `IDENTITY.md`、`USER.md`、`SOUL.md`。
- 完成後移除 `BOOTSTRAP.md`，使其僅運行一次。

## 運行位置

引導程序始終在 **gateway host** 上運行。如果 macOS 應用程式連線到遠端 Gateway，工作區和引導程式檔案位於該遠端機器上。

<Note>
  當 Gateway 在另一台機器上運行時，請在 gateway host 上編輯工作區檔案（例如，
  `user@gateway-host:~/.openclaw/workspace`）。
</Note>

## 相關文件

- macOS 應用程式入職：[入職](/zh-Hant/start/onboarding)
- 工作區佈局：[代理工作區](/zh-Hant/concepts/agent-workspace)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
