---
summary: "初始化工作空间和身份文件的 Agent 引导流程"
read_when:
  - "Understanding what happens on the first agent run"
  - "Explaining where bootstrapping files live"
  - "Debugging onboarding identity setup"
title: "Agent 引导"
sidebarTitle: "Bootstrapping"
---

# Agent 引导

引导是**首次运行**时的流程，用于准备 Agent 工作空间并收集身份详细信息。它发生在入职之后，当 Agent 首次启动时执行。

## 引导的作用

在 Agent 首次运行时，OpenClaw 会引导工作空间（默认
`~/.openclaw/workspace`）：

- 初始化 `AGENTS.md`、`BOOTSTRAP.md`、`IDENTITY.md`、`USER.md`。
- 运行简短的问答流程（一次一个问题）。
- 将身份和偏好设置写入 `IDENTITY.md`、`USER.md`、`SOUL.md`。
- 完成后删除 `BOOTSTRAP.md`，使其只运行一次。

## 运行位置

引导始终在 **Gateway 主机** 上运行。如果 macOS 应用连接到远程 Gateway，工作空间和引导文件将位于该远程机器上。

<Note>
When the Gateway runs on another machine, edit workspace files on the gateway
host (for example, `user@gateway-host:~/.openclaw/workspace`).
</Note>

## 相关文档

- macOS 应用入职：[入职](/zh/start/onboarding)
- 工作空间布局：[Agent 工作空间](/zh/concepts/agent-workspace)
