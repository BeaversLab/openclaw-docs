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

提供商插件可以在不替换完整 OpenClaw 拥有的提示词的情况下，提供感知缓存的提示词指导。提供商运行时可以：

- 替换一小部分命名的核心部分（`interaction_style`,
  `tool_call_style`, `execution_bias`）
- 在提示词缓存边界之上注入**稳定前缀 (stable prefix)**
- 在提示词缓存边界之下注入**动态后缀 (dynamic suffix)**

使用提供商拥有的贡献内容进行针对特定模型系列的调整。保留传统的
`before_prompt_build` 提示词变更，以用于兼容性或真正全局的提示词更改，而非正常的提供商行为。

## 结构

该提示词设计紧凑，并使用固定的部分：

- **工具 (Tooling)**：结构化工具真实来源提醒以及运行时工具使用指导。
- **安全 (Safety)**：简短的护栏提醒，以避免寻求权力或规避监管的行为。
- **Skills**（如果可用）：告知模型如何按需加载技能说明。
- **OpenClaw 自更新**：如何使用 `config.schema.lookup` 安全地检查配置，使用 `config.patch` 修补配置，使用 `config.apply` 替换完整配置，以及仅在明确的用户请求时运行 `update.run`。仅限所有者的 `gateway` 工具也会拒绝重写
  `tools.exec.ask` / `tools.exec.security`，包括那些规范化为受保护执行路径的传统 `tools.bash.*` 别名。
- **工作区 (Workspace)**：工作目录 (`agents.defaults.workspace`)。
- **文档 (Documentation)**：OpenClaw 文档的本地路径（仓库或 npm 包）以及何时阅读它们。
- **工作区文件 (已注入)**：表示引导文件已包含在下方。
- **沙箱**（如果启用）：表示沙箱隔离的运行时、沙箱路径以及提升的执行是否可用。
- **当前日期和时间**：用户本地时间、时区和时间格式。
- **回复标签**：支持的提供商的可选回复标签语法。
- **Heartbeats（心跳）**：心跳提示和确认行为，当为默认代理启用心跳时。
- **运行时**：主机、操作系统、节点、模型、仓库根目录（如果检测到）、思考级别（一行）。
- **推理**：当前可见性级别 + /reasoning 切换提示。

工具部分还包括针对长时间运行的运行时指导：

- 使用 cron 进行后续跟进（`check back later`、提醒、周期性工作）
  而不是 `exec` 睡眠循环、`yieldMs` 延迟技巧或重复的 `process`
  轮询
- 仅将 `exec` / `process` 用于现在开始并在
  后台持续运行的命令
- 当启用自动完成唤醒时，启动命令一次，并在其输出或失败时依赖
  基于推送的唤醒路径
- 当您需要检查正在运行的命令时，使用 `process` 查看日志、状态、输入或进行干预
- 如果任务较大，请优先选择 `sessions_spawn`；子代理的完成
  是基于推送的，并且会自动通告给请求者
- 不要在循环中轮询 `subagents list` / `sessions_list` 仅仅为了
  等待完成

当启用实验性的 `update_plan` 工具时，工具集还会指示
模型仅将其用于非平凡的多步骤工作，仅保留一个
`in_progress` 步骤，并避免在每次更新后重复整个计划。

系统提示中的安全护栏是建议性的。它们指导模型行为但不强制执行策略。请使用工具策略、执行审批、沙箱隔离和渠道允许列表进行硬性强制；操作员可以有意禁用这些功能。

在具有原生审批卡/按钮的渠道上，运行时提示现在会告知
代理优先依赖该原生审批 UI。只有当工具结果指示聊天审批不可用或
手动审批是唯一途径时，才应包含手动
`/approve` 命令。

## 提示模式

OpenClaw 可以为子代理渲染较小的系统提示。运行时会为
每次运行设置一个 `promptMode`（不是面向用户的配置）：

- `full`（默认）：包括上述所有部分。
- `minimal`：用于子代理；省略 **Skills**、**Memory Recall**、**OpenClaw
  Self-Update**、**Model Aliases**、**User Identity**、**Reply Tags**、
  **Messaging**、**Silent Replies** 和 **Heartbeats**。工具集、**Safety**、
  Workspace、沙箱、当前日期和时间（如果已知）、Runtime 和注入的
  上下文仍然可用。
- `none`：仅返回基础身份行。

当 `promptMode=minimal` 时，额外注入的提示词被标记为 **Subagent
Context** 而非 **Group Chat Context**。

## 工作区启动引导注入

引导文件会被修剪并附加在 **Project Context** 下，以便模型无需显式读取即可看到身份和配置文件上下文：

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md`（仅限全新的工作区）
- 如果存在 `MEMORY.md`，否则使用 `memory.md` 作为小写的后备选项

除非应用了特定于文件的门控，否则所有这些文件在每一轮中都会**被注入到上下文窗口**中。`HEARTBEAT.md` 在普通运行中会被省略，当为默认代理禁用心跳时或 `agents.defaults.heartbeat.includeSystemPromptSection` 为 false 时。保持注入文件简洁——特别是 `MEMORY.md`，它会随着时间的推移而增长，并导致上下文使用量意外增加和更频繁的压缩。

> **注意：** `memory/*.md` 日常文件**不**属于正常启动引导
> 项目上下文的一部分。在普通轮次中，它们通过
> `memory_search` 和 `memory_get` 工具按需访问，因此除非模型明确读取它们，否则它们不计入
> 上下文窗口。裸 `/new` 和
> `/reset` 轮次是例外：运行时可以将最近的日常记忆
> 作为一次性启动上下文块附加到该第一轮次之前。

大文件会被截断并带有标记。每个文件的最大大小由
`agents.defaults.bootstrapMaxChars` 控制（默认值：12000）。所有文件中注入的引导
内容总计上限由 `agents.defaults.bootstrapTotalMaxChars` 限制
（默认值：60000）。缺失的文件会注入一个简短的缺失文件标记。当发生
截断时，OpenClaw 可以在项目上下文中注入警告块；可通过
`agents.defaults.bootstrapPromptTruncationWarning` 控制此行为（`off`、`once`、`always`；
默认值：`once`）。

子代理会话仅注入 `AGENTS.md` 和 `TOOLS.md`（其他启动引导文件
会被过滤掉以保持子代理上下文较小）。

内部挂钩可以通过 `agent:bootstrap` 拦截此步骤，以更改或替换
注入的启动引导文件（例如，用 `SOUL.md` 替换为替代人格）。

如果您想让代理听起来不那么普通，请从
[SOUL.md Personality Guide](/zh/concepts/soul) 开始。

要检查每个注入文件的贡献（原始内容与注入内容的对比、截断情况以及工具架构开销），请使用 `/context list` 或 `/context detail`。参见 [Context](/zh/concepts/context)。

## 时间处理

当已知用户时区时，系统提示词会包含一个专门的 **Current Date & Time** 部分。为了保持提示词缓存的稳定性，它现在仅包含
**时区**（不包含动态时钟或时间格式）。

当代理需要当前时间时请使用 `session_status`；状态卡
包含一个时间戳行。同一工具可选择设置每会话的模型
覆盖（`model=default` 清除它）。

配置方法：

- `agents.defaults.userTimezone`
- `agents.defaults.timeFormat` (`auto` | `12` | `24`)

有关完整行为详情，请参阅 [Date & Time](/zh/date-time)。

## Skills

当存在符合条件的 Skills 时，OpenClaw 会注入一个紧凑的 **可用 Skills 列表**
(`formatSkillsForPrompt`)，其中包括每个 Skill 的 **文件路径**。该
提示指示模型使用 `read` 加载所列位置（工作区、托管或捆绑）的
SKILL.md。如果没有符合条件的 Skills，则会
省略 Skills 部分。

资格条件包括 Skill 元数据门控、运行时环境/配置检查，
以及当配置了 `agents.defaults.skills` 或
`agents.list[].skills` 时的有效代理 Skill 允许列表。

```
<available_skills>
  <skill>
    <name>...</name>
    <description>...</description>
    <location>...</location>
  </skill>
</available_skills>
```

这既保持了基础提示词的精简，同时又启用了有针对性的 Skill 使用。

Skills 列表预算归 Skills 子系统所有：

- 全局默认值：`skills.limits.maxSkillsPromptChars`
- 每代理覆盖：`agents.list[].skillsLimits.maxSkillsPromptChars`

通用的有界运行时摘录使用不同的接口：

- `agents.defaults.contextLimits.*`
- `agents.list[].contextLimits.*`

这种分离将 Skills 大小与运行时读取/注入大小（例如
`memory_get`、实时工具结果以及压缩后的 AGENTS.md 刷新）区分开来。

## 文档

如果可用，系统提示将包含一个 **Documentation** 部分，指向
本地 OpenClaw 文档目录（即代码仓库工作区中的 `docs/` 或捆绑的 npm
包文档），并注明用于发现 Skills 的公共镜像、源代码仓库、社区 Discord
和 ClawHub ([https://clawhub.ai](https://clawhub.ai))。该提示指示模型首先查阅本地文档以了解
OpenClaw 的行为、命令、配置或架构，并尽可能自行运行
`openclaw status`（仅在无法访问时询问用户）。
