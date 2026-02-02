---
summary: "OpenClaw system prompt 包含什么以及如何组装"
read_when:
  - 编辑 system prompt 文本、工具列表或时间/heartbeat 部分
  - 修改工作区引导或 skills 注入行为
title: "System Prompt"
---
# 系统提示词（System Prompt）

OpenClaw 为每次 agent 运行构建自定义 system prompt。该 prompt 由 **OpenClaw** 拥有，不使用 p-coding-agent 的默认提示。

该 prompt 由 OpenClaw 组装，并注入到每次 agent 运行中。

## 结构

该 prompt 刻意保持紧凑，并使用固定分节：

- **Tooling**：当前工具列表 + 简短描述。
- **Skills**（可用时）：告诉模型如何按需加载 skill 指令。
- **OpenClaw Self-Update**：如何运行 `config.apply` 与 `update.run`。
- **Workspace**：工作目录（`agents.defaults.workspace`）。
- **Documentation**：OpenClaw 文档的本地路径（repo 或 npm 包），以及何时阅读。
- **Workspace Files (injected)**：指示引导文件会在下方注入。
- **Sandbox**（启用时）：说明 sandbox 运行时、sandbox 路径与是否可用 elevated exec。
- **Current Date & Time**：用户本地时间、时区与时间格式。
- **Reply Tags**：支持的 providers 的可选回复标签语法。
- **Heartbeats**：heartbeat 提示与 ack 行为。
- **Runtime**：host、OS、node、model、repo root（若检测到）、thinking level（一行）。
- **Reasoning**：当前可见性级别 + /reasoning 切换提示。

## Prompt 模式

OpenClaw 可为子 agent 渲染更小的 system prompt。运行时为每次运行设置
`promptMode`（非用户侧配置）：

- `full`（默认）：包含上述所有分节。
- `minimal`：用于子 agent；省略 **Skills**、**Memory Recall**、**OpenClaw
  Self-Update**、**Model Aliases**、**User Identity**、**Reply Tags**、
  **Messaging**、**Silent Replies** 与 **Heartbeats**。Tooling、Workspace、
  Sandbox、Current Date & Time（已知时）、Runtime 与注入的上下文仍保留。
- `none`：仅返回基础身份行。

当 `promptMode=minimal` 时，额外注入提示会标记为 **Subagent
Context**，而不是 **Group Chat Context**。

## 工作区引导注入

引导文件会被裁剪并附加在 **Project Context** 下，这样模型无需显式读取即可看到身份与画像上下文：

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md`（仅全新工作区）

大文件会附带标记后截断。单文件最大大小由
`agents.defaults.bootstrapMaxChars` 控制（默认：20000）。缺失文件会注入
简短的 missing-file 标记。

内部 hooks 可通过 `agent:bootstrap` 拦截此步骤以变更或替换注入的引导文件（例如用替代 persona 替换 `SOUL.md`）。

要查看每个注入文件贡献（原始 vs 注入、截断，以及工具 schema 开销），使用 `/context list` 或 `/context detail`。参见 [Context](/zh/concepts/context)。

## 时间处理

当用户时区已知时，system prompt 包含专门的 **Current Date & Time** 分节。为保持 prompt 的缓存稳定性，它现在只包含**时区**（不含动态时钟或时间格式）。

当 agent 需要当前时间时，使用 `session_status`；状态卡中包含时间戳行。

配置：

- `agents.defaults.userTimezone`
- `agents.defaults.timeFormat`（`auto` | `12` | `24`）

完整行为参见 [Date & Time](/zh/date-time)。

## Skills

当存在符合条件的 skills 时，OpenClaw 会注入精简的 **available skills list**
（`formatSkillsForPrompt`），其中包含每个 skill 的**文件路径**。Prompt 会指示模型在列出的路径上使用 `read` 加载 SKILL.md（workspace、managed 或 bundled）。若无可用 skill，则省略 Skills 分节。

```
<available_skills>
  <skill>
    <name>...</name>
    <description>...</description>
    <location>...</location>
  </skill>
</available_skills>
```

这样既保持基础 prompt 小，又能按需使用 skills。

## Documentation

当可用时，system prompt 会包含 **Documentation** 分节，指向本地 OpenClaw 文档目录（repo workspace 中的 `docs/` 或 npm 包内置文档），并标注公共镜像、源码仓库、社区 Discord，以及 ClawdHub（https://clawdhub.com）用于 skills 发现。Prompt 指示模型在处理 OpenClaw 行为、命令、配置或架构时优先查本地文档，并在可能时自行运行 `openclaw status`（只有在无法访问时才询问用户）。
