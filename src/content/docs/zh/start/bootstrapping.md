---
summary: "Agent bootstrapping ritual that seeds the workspace and identity files"
read_when:
  - Understanding what happens on the first agent run
  - Explaining where bootstrapping files live
  - Debugging onboarding identity setup
title: "Agent 引导启动"
sidebarTitle: "Bootstrapping"
---

引导初始化（Bootstrapping）是**首次运行**时的例行程序，用于准备 Agent 工作区并收集身份详细信息。它发生在新手引导之后，即 Agent 首次启动时。

## 引导启动的作用

在首次运行代理时，OpenClaw 会对工作区进行引导启动（默认
`~/.openclaw/workspace`）：

- 植入 `AGENTS.md`、`BOOTSTRAP.md`、`IDENTITY.md`、`USER.md`。
- 运行简短的问答流程（一次一个问题）。
- 将身份和偏好设置写入 `IDENTITY.md`、`USER.md`、`SOUL.md`。
- 完成后删除 `BOOTSTRAP.md`，以确保其仅运行一次。

对于嵌入式/本地模型运行，OpenClaw 会将 `BOOTSTRAP.md` 排除在特权系统上下文之外。在主要的交互式首次运行中，它仍会在用户提示中传递文件内容，以便那些无法可靠调用 `read` 工具的模型也能完成此仪式。如果当前运行无法安全访问工作区，Agent 将收到有限的引导说明，而不是通用的问候语。

## 跳过引导初始化

若要为已预置的工作区跳过此步骤，请运行 `openclaw onboard --skip-bootstrap`。

## 运行位置

引导初始化始终在 **网关主机** 上运行。如果 macOS 应用程序连接到远程 Gateway(网关)，则工作区和引导初始化文件位于该远程计算机上。

<Note>当 Gateway(网关) 在另一台机器上运行时，请在网关主机上编辑工作区文件（例如，`user@gateway-host:~/.openclaw/workspace`）。</Note>

## 相关文档

- macOS 应用新手引导：[新手引导](/zh/start/onboarding)
- 工作区布局：[Agent 工作区](/zh/concepts/agent-workspace)
