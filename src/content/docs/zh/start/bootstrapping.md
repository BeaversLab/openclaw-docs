---
summary: "Agent bootstrapping ritual that seeds the workspace and identity files"
read_when:
  - Understanding what happens on the first agent run
  - Explaining where bootstrapping files live
  - Debugging onboarding identity setup
title: "Agent 引导启动"
sidebarTitle: "Bootstrapping"
---

引导启动是用于准备代理工作区并收集身份详情的**首次运行**流程。它发生在新手引导之后，即代理首次启动时。

## 引导启动的作用

在首次运行代理时，OpenClaw 会对工作区进行引导启动（默认
`~/.openclaw/workspace`）：

- 植入 `AGENTS.md`、`BOOTSTRAP.md`、`IDENTITY.md`、`USER.md`。
- 运行简短的问答流程（一次一个问题）。
- 将身份和偏好设置写入 `IDENTITY.md`、`USER.md`、`SOUL.md`。
- 完成后删除 `BOOTSTRAP.md`，以确保其仅运行一次。

## 跳过引导启动

若要为预植入的工作区跳过此步骤，请运行 `openclaw onboard --skip-bootstrap`。

## 运行位置

引导启动始终在 **gateway 主机**上运行。如果 macOS 应用程序连接到
远程 Gateway(网关)，则工作区和引导启动文件位于该远程
计算机上。

<Note>当 Gateway(网关) 在另一台计算机上运行时，请在 gateway 主机上编辑工作区文件（例如，`user@gateway-host:~/.openclaw/workspace`）。</Note>

## 相关文档

- macOS 应用程序新手引导：[新手引导](/zh/start/onboarding)
- 工作区布局：[Agent 工作区](/zh/concepts/agent-workspace)
