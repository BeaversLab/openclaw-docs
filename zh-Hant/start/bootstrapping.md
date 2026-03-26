---
summary: "初始化代理工作區和身分識別檔案的引導程序"
read_when:
  - Understanding what happens on the first agent run
  - Explaining where bootstrapping files live
  - Debugging onboarding identity setup
title: "Agent Bootstrapping"
sidebarTitle: "Bootstrapping"
---

# Agent Bootstrapping

Bootstrapping 是準備代理工作區並收集身分識別細節的 **首次執行** 程序。它發生在 onboarding 之後，當代理首次啟動時。

## Bootstrapping 的作用

在第一次代理執行時，OpenClaw 會引導工作區（預設
`~/.openclaw/workspace`）：

- 植入 `AGENTS.md`、`BOOTSTRAP.md`、`IDENTITY.md`、`USER.md`。
- 執行簡短的問答程序（一次一個問題）。
- 將身分識別和偏好設定寫入 `IDENTITY.md`、`USER.md`、`SOUL.md`。
- 完成時移除 `BOOTSTRAP.md`，使其僅執行一次。

## 執行位置

Bootstrapping 始終在 **gateway host** 上執行。如果 macOS 應用程式連接到遠端 Gateway，工作區和引導檔案會位於該遠端機器上。

<Note>
  當 Gateway 在另一台機器上執行時，請在 gateway host 上編輯工作區檔案（例如，
  `user@gateway-host:~/.openclaw/workspace`）。
</Note>

## 相關文件

- macOS 應用程式入門：[Onboarding](/zh-Hant/start/onboarding)
- 工作區佈局：[Agent workspace](/zh-Hant/concepts/agent-workspace)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
