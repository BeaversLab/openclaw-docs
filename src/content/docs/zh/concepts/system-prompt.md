---
summary: "OpenClaw 系统提示词包含的内容及其组装方式"
read_when:
  - Editing system prompt text, tools list, or time/heartbeat sections
  - Changing workspace bootstrap or skills injection behavior
title: "System prompt"
---

OpenClaw 为每次代理运行构建自定义系统提示。该提示由 **OpenClaw 拥有**，不使用 pi-coding-agent 默认提示。

该提示由 OpenClaw 组装并注入到每次代理运行中。

提供商插件可以提供具有缓存感知能力的提示指导，而无需替换完整的 OpenClaw 拥有的提示。提供商运行时可以：

- 替换一小组命名的核心部分 (`interaction_style`,
  `tool_call_style`, `execution_bias`)
- 在提示缓存边界上方注入一个 **stable prefix**（稳定前缀）
- 在提示缓存边界下方注入一个 **dynamic suffix**（动态后缀）

使用提供商拥有的贡献进行特定于模型系列的调整。保留旧的
`before_prompt_build` 提示变更以保持兼容性或进行真正的全局提示
更改，而不是正常的提供商行为。

OpenAI GPT-5 系列叠加层保持了核心执行规则的精简，并添加了
特定于模型的指导，包括角色锁定、简洁输出、工具纪律、
并行查找、交付物覆盖、验证、缺失上下文以及
终端工具卫生。

## 结构

该提示词设计紧凑，并使用固定的部分：

- **工具 (Tooling)**：结构化工具真实来源提醒以及运行时工具使用指导。
- **Execution Bias（执行偏差）**：紧凑的后续指导：按顺序对
  可执行的请求采取行动，直到完成或受阻才继续，从薄弱的工具
  结果中恢复，实时检查可变状态，并在最终确定之前进行验证。
- **Safety（安全性）**：简短的护栏提醒，以避免寻求权力的行为或绕过监督。
- **Skills（技能）**（如果可用）：告诉模型如何按需加载技能说明。
- **OpenClaw Self-Update（自我更新）**：如何使用
  `config.schema.lookup` 安全地检查配置，使用 `config.patch` 修补配置，使用 `config.apply` 替换完整
  配置，以及仅在明确的用户
  请求下运行 `update.run`。仅限所有者的 `gateway` 工具也拒绝重写
  `tools.exec.ask` / `tools.exec.security`，包括那些规范化为受保护执行路径的旧 `tools.bash.*`
  别名。
- **Workspace（工作区）**：工作目录 (`agents.defaults.workspace`)。
- **Documentation（文档）**：OpenClaw 文档（仓库或 npm 包）的本地路径以及何时阅读它们。
- **工作区文件（已注入）**：表示以下包含了引导文件。
- **沙箱**（启用时）：表示沙箱隔离运行时、沙箱路径以及是否可用提升执行。
- **当前日期和时间**：用户本地时间、时区和时间格式。
- **回复标签**：受支持提供商的可选回复标签语法。
- **心跳**：当为默认代理启用心跳时的心跳提示和确认行为。
- **运行时**：主机、操作系统、节点、模型、仓库根目录（检测到时）、思考级别（一行）。
- **推理**：当前可见性级别 + /reasoning 切换提示。

工具部分还包括针对长时间运行工作的运行时指导：

- 使用 `check back later` 进行后续跟进（`check back later`、提醒、周期性工作），
  而不是 `exec` 睡眠循环、`yieldMs` 延迟技巧或重复的 `process`
  轮询
- 仅对现在启动并继续在后台运行的命令
  使用 `exec` / `process`
- 当启用自动完成唤醒时，启动一次命令，并在其输出或失败时
  依赖基于推送的唤醒路径
- 当您需要检查正在运行的命令时，使用 `process` 查看日志、状态、输入或进行干预
- 如果任务较大，首选 `sessions_spawn`；子代理的完成
  是基于推送的，并会自动通告回请求者
- 不要仅在循环中轮询 `subagents list` / `sessions_list` 以等待
  完成

当启用实验性的 `update_plan` 工具时，工具部分还会告诉
模型仅将其用于非平凡的多步骤工作，保持恰好一个
`in_progress` 步骤，并避免在每次更新后重复整个计划。

系统提示中的安全护栏是建议性的。它们指导模型行为，但不强制执行策略。请使用工具策略、执行批准、沙箱隔离和渠道允许列表进行硬性强制执行；操作员可以故意禁用这些功能。

在具有本地批准卡片/按钮的频道上，运行时提示现在会告知代理优先依赖该本地批准 UI。仅当工具结果指示聊天批准不可用或手动批准是唯一路径时，才应包含手动 `/approve` 命令。

## 提示模式

OpenClaw 可以为子代理渲染较小的系统提示。运行时会为每次运行设置一个 `promptMode`（不是面向用户的配置）：

- `full`（默认）：包括上述所有部分。
- `minimal`：用于子代理；省略 **Skills**、**Memory Recall**、**OpenClaw
  Self-Update**、**Model Aliases**、**User Identity**、**Reply Tags**、
  **Messaging**、**Silent Replies** 和 **Heartbeats**。工具、**Safety**、
  Workspace、沙箱、Current Date & Time（如果已知）、Runtime 和注入的上下文保持可用。
- `none`：仅返回基础身份行。

当 `promptMode=minimal` 时，额外的注入提示将标记为 **Subagent
Context** 而不是 **Group Chat Context**。

## 工作区引导注入

引导文件经过修剪并附加在 **Project Context** 下，以便模型无需显式读取即可看到身份和配置文件上下文：

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md`（仅限全新的工作区）
- `MEMORY.md`（如果存在）

除非应用了特定于文件的门控，否则所有这些文件都会在每个轮次中 **注入到上下文窗口** 中。当默认代理的心跳被禁用或 `agents.defaults.heartbeat.includeSystemPromptSection` 为 false 时，`HEARTBEAT.md` 在正常运行中被省略。保持注入文件简洁 —— 特别是 `MEMORY.md`，它会随时间增长并导致上下文使用量意外升高和压缩频率增加。

<Note>`memory/*.md` 每日文件**不是**常规启动项目上下文的一部分。在普通轮次中，它们按需通过 `memory_search` 和 `memory_get` 工具进行访问，因此除非模型明确读取它们，否则它们不计入上下文窗口。裸 `/new` 和 `/reset` 轮次是例外：运行时可以将最近的每日记忆作为该第一轮的一次性启动上下文块进行前置。</Note>

大文件会被截断并带有标记。每个文件的最大大小由
`agents.defaults.bootstrapMaxChars` 控制（默认值：12000）。所有文件注入的启动内容总计上限由 `agents.defaults.bootstrapTotalMaxChars` 限制
（默认值：60000）。缺失的文件会注入一个简短的缺失文件标记。当发生截断时，OpenClaw 可以在项目上下文中注入警告块；通过 `agents.defaults.bootstrapPromptTruncationWarning` 控制此行为
（`off`, `once`, `always`;
默认值：`once`）。

子代理会话仅注入 `AGENTS.md` 和 `TOOLS.md`（其他启动文件
会被过滤掉以保持子代理上下文较小）。

内部钩子可以通过 `agent:bootstrap` 拦截此步骤，以更改或替换
注入的启动文件（例如将 `SOUL.md` 交换为备用角色）。

如果您想让代理听起来不那么通用，请从
[SOUL.md 个性指南](/zh/concepts/soul) 开始。

要检查每个注入文件贡献了多少内容（原始内容与注入内容对比、截断情况以及工具架构开销），请使用 `/context list` 或 `/context detail`。请参阅[上下文](/zh/concepts/context)。

## 时间处理

当已知用户时区时，系统提示包含一个专门的 **当前日期和时间** 部分。为了保持提示缓存稳定，它现在仅包含
**时区**（没有动态时钟或时间格式）。

当代理需要当前时间时，请使用 `session_status`；状态卡
包含一行时间戳。同一个工具可以选择性地设置每次会话的模型
覆盖（`model=default` 可将其清除）。

配置方式：

- `agents.defaults.userTimezone`
- `agents.defaults.timeFormat` (`auto` | `12` | `24`)

有关完整行为详情，请参阅 [Date & Time](/zh/date-time)。

## Skills

当存在符合条件的 Skills 时，OpenClaw 会注入一个精简的 **可用 Skills 列表**
(`formatSkillsForPrompt`)，其中包含每个 Skill 的 **文件路径**。该
提示词指示模型使用 `read` 来加载列出的
位置（工作区、受管或捆绑包）下的 SKILL.md。如果没有符合条件的 Skills，则
Skills 部分将被省略。

资格条件包括 Skill 元数据门控、运行时环境/配置检查，以及
当配置了 `agents.defaults.skills` 或
`agents.list[].skills` 时的有效代理 Skills 允许列表。

插件捆绑的 Skills 仅在其所属插件被启用时才符合资格。
这允许工具插件暴露更深入的操作指南，而无需将所有
这些指南直接嵌入到每个工具描述中。

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
- 每个代理的覆盖：`agents.list[].skillsLimits.maxSkillsPromptChars`

通用有界运行时摘录使用不同的界面：

- `agents.defaults.contextLimits.*`
- `agents.list[].contextLimits.*`

这种分离将 Skills 的容量与运行时读取/注入的容量（例如
`memory_get`、实时工具结果以及压缩后的 AGENTS.md 刷新）区分开来。

## 文档

系统提示词包含一个 **文档** 部分。当本地文档可用时，它
指向本地 OpenClaw 文档目录（Git 检出中的 `docs/` 或捆绑的 npm
包文档）。如果本地文档不可用，它将回退到
[https://docs.openclaw.ai](https://docs.openclaw.ai)。

同一部分还包括 OpenClaw 源代码位置。Git 签出会暴露本地源代码根目录，以便代理可以直接检查代码。软件包安装则包含 GitHub 源代码 URL，并告知代理在文档不完整或过时时去那里查看源代码。系统提示还注明了公共文档镜像、社区 Discord 和 ClawHub（([https://clawhub.ai](https://clawhub.ai))）用于技能发现。它指示模型优先查阅文档以了解 OpenClaw 的行为、命令、配置或架构，并在可能时自行运行 `openclaw status`（仅在缺乏访问权限时询问用户）。特别是在配置方面，它指向代理 `gateway` 工具操作 `config.schema.lookup` 以获取确切的字段级文档和约束，然后指向 `docs/gateway/configuration.md` 和 `docs/gateway/configuration-reference.md` 以获取更广泛的指导。

## 相关

- [Agent 运行时](/zh/concepts/agent)
- [Agent 工作区](/zh/concepts/agent-workspace)
- [上下文引擎](/zh/concepts/context-engine)
