---
summary: “用于初始化工作区和身份文件的代理引导仪式”
read_when:
  - Understanding what happens on the first agent run
  - Explaining where bootstrapping files live
  - Debugging onboarding identity setup
title: “代理引导”
sidebarTitle: “引导”
---

# 代理引导

引导是为代理准备工作区并收集身份详细信息时的**首次运行**仪式。它发生在入职之后，即代理首次启动时。

## 引导的作用

在首次运行代理时，OpenClaw 会引导工作区（默认为 `~/.openclaw/workspace`）：

- 初始化 `AGENTS.md`、`BOOTSTRAP.md`、`IDENTITY.md`、`USER.md`。
- 运行简短的问答仪式（一次一个问题）。
- 将身份和偏好设置写入 `IDENTITY.md`、`USER.md`、`SOUL.md`。
- 完成后删除 `BOOTSTRAP.md`，以确保其仅运行一次。

## 运行位置

引导始终在**网关主机**上运行。如果 macOS 应用程序连接到远程网关，工作区和引导文件将驻留在此远程计算机上。

<Note>
当网关在另一台计算机上运行时，请在网关主机上编辑工作区文件（例如 `user@gateway-host:~/.openclaw/workspace`）。
</Note>

## 相关文档

- macOS 应用程序入职：[入职](/zh/en/start/onboarding)
- 工作区布局：[代理工作区](/zh/en/concepts/agent-workspace)
