---
summary: "OpenClaw 系统提示词包含的内容及其组装方式"
read_when:
  - Editing system prompt text, tools list, or time/heartbeat sections
  - Changing workspace bootstrap or skills injection behavior
title: "系统提示词"
---

# 系统提示词

OpenClaw 会为每次 Agent 运行构建自定义的系统提示词。该提示词归 **OpenClaw 所有**，不使用 pi-coding-agent 的默认提示词。

该提示词由 OpenClaw 组装，并注入到每次 Agent 运行中。

## 结构

该提示词设计得紧凑精简，并使用固定的分段：

- **工具**：当前工具列表 + 简短描述。
- **安全性**：简短的护栏提醒，以避免寻求权力的行为或绕过监管。
- **技能**（Skills，当可用时）：告诉模型如何按需加载技能指令。
- **OpenClaw 自更新**：如何运行 `config.apply` 和 `update.run`。
- **工作区**：工作目录 (`agents.defaults.workspace`)。
- **文档**：OpenClaw 文档的本地路径（仓库或 npm 包）以及何时阅读它们。
- **工作区文件（已注入）**：表示引导文件包含在下方。
- **沙盒**（沙箱，当启用时）：指示沙盒运行时、沙盒路径以及是否可用 elevated exec。
- **当前日期与时间**：用户本地时间、时区和时间格式。
- **回复标签**：受支持提供商的可选回复标签语法。
- **心跳**：心跳提示和确认行为。
- **运行时**：主机、操作系统、节点、模型、仓库根目录（检测到时）、思考级别（一行）。
- **推理**：当前可见性级别 + /reasoning 切换提示。

系统提示词中的安全护栏仅作建议。它们指导模型行为但不强制执行策略。请使用工具策略、执行审批、沙盒隔离和频道白名单来进行硬性强制执行；操作员可以设计禁用这些功能。

## 提示词模式

OpenClaw 可以为子代理渲染较小的系统提示词。运行时会为每次运行设置一个
`promptMode`（非用户面向的配置）：

- `full` (默认)：包含上述所有部分。
- `minimal`：用于子代理；省略了 **Skills**、**Memory Recall**、**OpenClaw
  Self-Update**、**Model Aliases**、**User Identity**、**Reply Tags**、
  **Messaging**、**Silent Replies** 和 **Heartbeats**。工具、**Safety**、
  Workspace、沙箱、当前日期和时间（如果已知）、Runtime 以及注入的
  上下文仍然可用。
- `none`：仅返回基本身份标识行。

当 `promptMode=minimal` 时，额外的注入提示被标记为 **Subagent
Context** 而不是 **Group Chat Context**。

## 工作区启动引导注入

启动引导文件会被修剪并附加在 **Project Context** 下，以便模型无需显式读取即可看到身份和配置文件上下文：

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md`（仅限于全新的工作区）
- 如果存在 `MEMORY.md`，否则使用 `memory.md` 作为小写后备

所有这些文件都会在每一轮中**被注入到上下文窗口**中，这意味着
它们会消耗 token。请保持简洁 —— 尤其是 `MEMORY.md`，因为它
会随时间增长，导致上下文使用量意外升高以及更频繁的
压缩。

> **注意：** `memory/*.md` 每日文件**不会**自动注入。它们
> 通过 `memory_search` 和 `memory_get` 工具按需访问，因此
> 除非模型显式读取它们，否则它们不计入上下文窗口。

大文件会被截断并添加标记。每个文件的最大大小由
`agents.defaults.bootstrapMaxChars` 控制（默认值：20000）。跨文件注入的总引导
内容上限由 `agents.defaults.bootstrapTotalMaxChars` 限制
（默认值：150000）。缺失的文件会注入一个简短的缺失文件标记。当发生截断时，
OpenClaw 可以在项目上下文中注入警告块；通过
`agents.defaults.bootstrapPromptTruncationWarning` 控制此行为（`off`、`once`、`always`；
默认值：`once`）。

子代理会话仅注入 `AGENTS.md` 和 `TOOLS.md`（其他引导文件
会被过滤掉以保持子代理上下文较小）。

内部钩子可以通过 `agent:bootstrap` 拦截此步骤，以更改或替换
注入的引导文件（例如，将 `SOUL.md` 交换为备用角色设定）。

要检查每个注入文件的贡献（原始与注入、截断，加上工具架构开销），请使用 `/context list` 或 `/context detail`。参见[上下文](/zh/concepts/context)。

## 时间处理

当用户时区已知时，系统提示包含一个专门的 **当前日期和时间** 部分。为了保持提示缓存稳定，它现在仅包含
**时区**（没有动态时钟或时间格式）。

当代理需要当前时间时使用 `session_status`；状态卡
包含一个时间戳行。

配置如下：

- `agents.defaults.userTimezone`
- `agents.defaults.timeFormat` (`auto` | `12` | `24`)

有关完整行为细节，请参见[日期和时间](/zh/date-time)。

## Skills

当存在符合要求的 Skills 时，OpenClaw 会注入一个简洁的 **可用 Skills 列表**
(`formatSkillsForPrompt`)，其中包含每个 Skill 的 **文件路径**。
系统提示会指示模型使用 `read` 加载所列位置（工作区、托管或捆绑包）的 SKILL.md。如果没有符合要求的 Skills，
则省略 Skills 部分。

```
<available_skills>
  <skill>
    <name>...</name>
    <description>...</description>
    <location>...</location>
  </skill>
</available_skills>
```

这既保持了基础提示的简洁性，同时又启用了针对性的 Skill 使用。

## 文档

如果可用，系统提示将包含一个 **文档** 部分，指向
本地的 OpenClaw 文档目录（即代码仓库工作区中的 `docs/` 或捆绑的 npm
包文档），并注明用于发现 Skills 的公共镜像、源仓库、社区 Discord
以及 ClawHub ([https://clawhub.com](https://clawhub.com))。系统提示会指示模型首先查阅本地文档以了解
OpenClaw 的行为、命令、配置或架构，并在可能的情况下自行运行
`openclaw status`（仅在无权访问时询问用户）。

import zh from "/components/footer/zh.mdx";

<zh />
