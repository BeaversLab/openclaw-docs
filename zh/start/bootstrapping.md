---
summary: "引导代理的初始化仪式，用于准备工作区和身份文件"
read_when:
  - 了解第一次代理运行时发生的情况
  - 解释引导文件位于何处
  - 调试新手引导身份设置
title: "代理引导"
sidebarTitle: "引导"
---

# 代理引导

引导是**首次运行**时的一种仪式，用于准备代理工作区并收集身份详细信息。它发生在新手引导之后，即代理第一次启动时。

## 引导的作用

在第一次代理运行时，OpenClaw 会引导工作区（默认
`~/.openclaw/workspace`）：

- 植入 `AGENTS.md`、`BOOTSTRAP.md`、`IDENTITY.md`、`USER.md`。
- 运行一个简短的问答仪式（一次一个问题）。
- 将身份和偏好设置写入 `IDENTITY.md`、`USER.md`、`SOUL.md`。
- 完成后删除 `BOOTSTRAP.md`，以确保其只运行一次。

## 运行位置

引导始终在 **gateway host（网关主机）** 上运行。如果 macOS 应用程序连接到远程 Gateway(网关)，则工作区和引导文件位于该远程计算机上。

<Note>
当 Gateway(网关) 在另一台机器上运行时，请在 gateway host（网关主机）上编辑工作区文件（例如，`user@gateway-host:~/.openclaw/workspace`）。
</Note>

## 相关文档

- macOS 应用程序新手引导：[新手引导](/zh/start/onboarding)
- 工作区布局：[代理工作区](/zh/concepts/agent-workspace)

import en from "/components/footer/en.mdx";

<en />
