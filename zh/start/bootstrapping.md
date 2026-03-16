---
summary: "Agent bootstrapping ritual that seeds the workspace and identity files"
read_when:
  - Understanding what happens on the first agent run
  - Explaining where bootstrapping files live
  - Debugging onboarding identity setup
title: "Agent Bootstrapping"
sidebarTitle: "Bootstrapping"
---

# 代理引导

引导是为代理准备工作区并收集身份详细信息时的**首次运行**仪式。它发生在入职之后，即代理首次启动时。

## 引导的作用

在首次运行 Agent 时，OpenClaw 会引导工作区（默认
`~/.openclaw/workspace`）：

- 植入 `AGENTS.md`、`BOOTSTRAP.md`、`IDENTITY.md`、`USER.md`。
- 运行简短的问答仪式（一次一个问题）。
- 将身份和偏好设置写入 `IDENTITY.md`、`USER.md`、`SOUL.md`。
- 完成后移除 `BOOTSTRAP.md` 以确保其仅运行一次。

## 运行位置

引导始终在**Gateway 网关 主机**上运行。如果 macOS 应用程序连接到远程 Gateway 网关，工作区和引导文件将驻留在此远程计算机上。

<Note>
  当 Gateway(网关) 在另一台机器上运行时，请编辑网关主机上的工作区文件（例如，
  `user@gateway-host:~/.openclaw/workspace`）。
</Note>

## 相关文档

- macOS app 新手引导：[新手引导](/en/start/onboarding)
- 工作区布局：[Agent 工作区](/en/concepts/agent-workspace)

import zh from "/components/footer/zh.mdx";

<zh />
