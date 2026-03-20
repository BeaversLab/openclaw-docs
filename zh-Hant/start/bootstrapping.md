---
summary: "Agent bootstrapping ritual that seeds the workspace and identity files"
read_when:
  - Understanding what happens on the first agent run
  - Explaining where bootstrapping files live
  - Debugging onboarding identity setup
title: "Agent Bootstrapping"
sidebarTitle: "Bootstrapping"
---

# Agent Bootstrapping

Bootstrapping is the **first‑run** ritual that prepares an agent workspace and
collects identity details. It happens after onboarding, when the agent starts
for the first time.

## What bootstrapping does

On the first agent run, OpenClaw bootstraps the workspace (default
`~/.openclaw/workspace`):

- Seeds `AGENTS.md`, `BOOTSTRAP.md`, `IDENTITY.md`, `USER.md`.
- Runs a short Q&A ritual (one question at a time).
- 將身分識別 + 偏好設定寫入 `IDENTITY.md`、`USER.md`、`SOUL.md`。
- 完成後移除 `BOOTSTRAP.md` 以確保其只執行一次。

## 執行位置

啟動程序 (Bootstrapping) 始終在 **gateway host** 上執行。如果 macOS 應用程式連線到遠端 Gateway，工作區和啟動程序檔案會位於該遠端機器上。

<Note>
  當 Gateway 在另一台機器上執行時，請在 gateway host 上編輯工作區檔案（例如
  `user@gateway-host:~/.openclaw/workspace`）。
</Note>

## 相關文件

- macOS 應用程式入門：[Onboarding](/zh-Hant/start/onboarding)
- 工作區佈局：[Agent workspace](/zh-Hant/concepts/agent-workspace)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
