---
summary: "OpenClaw 系统提示词包含的内容及其组装方式"
read_when:
  - 编辑系统提示词文本、工具列表或时间/心跳部分
更改工作区引导或 Skills 注入行为
  - 更改工作区引导或 Skills 注入行为
title: "System Prompt"
---

# System Prompt

OpenClaw 会为每次代理运行构建自定义的系统提示词。该提示词**由 OpenClaw 拥有**，不使用 pi-coding-agent 的默认提示词。

该提示词由 OpenClaw 组装，并注入到每次代理运行中。

## 结构

该提示词设计得紧凑精简，并使用固定的部分：

- **Tooling**：当前工具列表 + 简短描述。
- **Safety**：简短的护栏提醒，以避免寻求权力行为或绕过监督。
- **Skills**（如果可用）：告诉模型如何按需加载技能指令。
- **OpenClaw Self-Update**：如何运行 `config.apply` 和 `update.run`。
- **Workspace**：工作目录 (`agents.defaults.workspace`)。
- **Documentation**：OpenClaw 文档的本地路径（仓库或 npm 包）以及何时阅读它们。
- **Workspace Files (injected)**：指示下方包含引导文件。
- **沙箱**（启用时）：指示沙箱隔离运行时、沙箱路径以及是否可用提升执行权限。
- **Current Date & Time**：用户本地时间、时区和时间格式。
- **Reply Tags**：受支持提供商的可选回复标签语法。
- **Heartbeats**：心跳提示和确认行为。
- **Runtime**：主机、操作系统、节点、模型、仓库根目录（检测到时）、思考级别（一行）。
- **Reasoning**：当前可见性级别 + /reasoning 切换提示。

系统提示词中的安全护栏仅为建议。它们指导模型行为，但不强制执行策略。使用工具策略、执行批准、沙箱隔离和渠道允许列表进行硬性强制执行；操作员可以故意禁用这些功能。

## 提示词模式

OpenClaw 可以为子代理渲染较小的系统提示词。运行时会为每次运行设置一个
`promptMode`（不是面向用户的配置）：

- `full`（默认）：包含上述所有部分。
- `minimal`：用于子代理；省略了 **Skills**、**Memory Recall**、**OpenClaw Self-Update**、**Model Aliases**、**User Identity**、**Reply Tags**、**Messaging**、**Silent Replies** 和 **Heartbeats**。工具、**Safety**、Workspace、沙箱、Current Date & Time（如果已知）、Runtime 和注入的上下文仍然可用。
- `none`：仅返回基础身份行。

当使用 `promptMode=minimal` 时，额外的注入提示被标记为 **Subagent Context** 而不是 **Group Chat Context**。

## Workspace bootstrap injection

Bootstrap 文件会被修剪并附加在 **Project Context** 下，以便模型无需显式读取即可看到身份和配置文件上下文：

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md`（仅限全新的工作空间）
- 如果存在 `MEMORY.md`，否则使用 `memory.md` 作为小写后备

所有这些文件都会在每个回合中被 **注入到上下文窗口** 中，这意味着它们会消耗 token。请保持其简洁 — 尤其是 `MEMORY.md`，它会随着时间的推移而增长，并导致意外的上下文高使用率和更频繁的压缩。

> **注意：** `memory/*.md` 每日文件 **不会** 自动注入。它们
> 通过 `memory_search` 和 `memory_get` 工具按需访问，因此
> 除非模型显式读取它们，否则它们不计入上下文窗口。

大文件会被截断并带有标记。每个文件的最大大小由
`agents.defaults.bootstrapMaxChars` 控制（默认值：20000）。所有文件注入的 bootstrap
内容总数上限为 `agents.defaults.bootstrapTotalMaxChars`
（默认值：150000）。缺失的文件会注入一个简短的缺失文件标记。当发生截断时，OpenClaw 可以在 Project Context 中注入一个警告块；通过
`agents.defaults.bootstrapPromptTruncationWarning` 控制此行为（`off`、`once`、`always`；
默认值：`once`）。

子代理会话仅注入 `AGENTS.md` 和 `TOOLS.md`（其他启动文件
会被过滤掉以保持子代理上下文较小）。

内部钩子可以通过 `agent:bootstrap` 拦截此步骤以变更或替换
注入的启动文件（例如将 `SOUL.md` 交换为备用角色）。

要检查每个注入文件的贡献程度（原始 vs 注入，截断，加上工具架构开销），请使用 `/context list` 或 `/context detail`。请参阅 [Context](/zh/concepts/context)。

## 时间处理

当用户时区已知时，系统提示包含一个专门的 **Current Date & Time** 部分。为了保持提示缓存稳定，现在仅包含
**time zone**（没有动态时钟或时间格式）。

当代理需要当前时间时使用 `session_status`；状态卡
包含一个时间戳行。

配置如下：

- `agents.defaults.userTimezone`
- `agents.defaults.timeFormat` (`auto` | `12` | `24`)

有关完整的行为详情，请参阅 [Date & Time](/zh/date-time)。

## Skills

当存在符合条件的 Skills 时，OpenClaw 会注入一个紧凑的 **available skills list**
(`formatSkillsForPrompt`)，其中包含每个 Skill 的 **file path**。
提示指示模型使用 `read` 加载所列位置的 SKILL.md（工作区、托管或捆绑）。如果没有符合条件的 Skills，则
省略 Skills 部分。

```
<available_skills>
  <skill>
    <name>...</name>
    <description>...</description>
    <location>...</location>
  </skill>
</available_skills>
```

这既保持了基础提示的小巧，同时仍然启用了有针对性的 Skill 使用。

## 文档

如果可用，系统提示包含一个 **Documentation** 部分，指向
本地 OpenClaw 文档目录（即仓库工作区中的 `docs/` 或捆绑的 npm
包文档），并注明公共镜像、源仓库、社区 Discord 和
ClawHub ([https://clawhub.com](https://clawhub.com))，以便发现 Skills。提示指示模型首先查阅本地文档，
了解 OpenClaw 行为、命令、配置或架构，并尽可能
自行运行 `openclaw status`（仅在无法访问时询问用户）。

import en from "/components/footer/en.mdx";

<en />
