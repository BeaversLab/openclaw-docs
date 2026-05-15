---
summary: "OpenClaw 系统提示词包含的内容及其组装方式"
read_when:
  - Editing system prompt text, tools list, or time/heartbeat sections
  - Changing workspace bootstrap or skills injection behavior
title: "System prompt"
---

OpenClaw 为每次代理运行构建自定义系统提示。该提示由 **OpenClaw 拥有**，不使用 pi-coding-agent 默认提示。

该提示由 OpenClaw 组装并注入到每次代理运行中。

Prompt 组装包含三个层级：

- `buildAgentSystemPrompt` 根据显式输入渲染 prompt。它应该
  保持为纯渲染器，不应直接读取全局配置。
- `resolveAgentSystemPromptConfig` 解析由配置支持的 prompt 调节项，例如
  所有者显示、TTS 提示、模型别名、内存引用模式以及特定
  代理的子代理委派模式。
- 运行时适配器（嵌入式、CLI、命令/导出预览、压缩）会收集
  动态事实，例如工具、沙箱状态、渠道能力、上下文文件
  以及提供商 prompt 贡献，然后调用配置的 prompt 外观。

这确保了导出/调试的 prompt 表面与实时运行保持一致，而无需
将每个特定于运行的细节转变为一个单体构建器。

提供商插件可以贡献具有缓存感知能力的 prompt 指导，而无需替换
完整的 OpenClaw 拥有的 prompt。提供商运行时可以：

- 替换一小部分命名的核心部分（`interaction_style`，
  `tool_call_style`，`execution_bias`）
- 在 prompt 缓存边界之上注入一个**稳定前缀**
- 在 prompt 缓存边界之下注入一个**动态后缀**

使用提供商拥有的贡献进行特定于模型系列的调整。保留传统的
`before_prompt_build` prompt 变更以用于兼容性或真正全局的 prompt
更改，而非正常的提供商行为。

OpenAI GPT-5 系列叠加层保持了核心执行规则的精简，并添加了
特定于模型的指导，包括人格锁定、简洁输出、工具纪律、
并行查找、交付物覆盖、验证、缺失上下文以及
终端工具卫生。

## 结构

该 prompt 经过有意精简，并使用固定的部分：

- **工具**：结构化工具的单一事实来源提醒加上运行时工具使用指导。
- **执行偏差**：紧凑的后续执行指导：对
  可操作的请求轮流采取行动，继续直到完成或受阻，从微弱的工具
  结果中恢复，实时检查可变状态，并在完成之前进行验证。
- **安全性**：简短的护栏提醒，以避免寻求权力行为或绕过监督。
- **Skills**（如果可用）：告知模型如何按需加载技能指令。
- **OpenClaw 自更新**：如何使用 OpenClaw`config.schema.lookup` 安全地检查配置，使用 `config.patch` 修补配置，使用 `config.apply` 替换完整配置，并仅在用户明确请求时运行 `update.run`。仅限所有者使用的 `gateway` 工具也会拒绝重写 `tools.exec.ask` / `tools.exec.security`，包括归一化到这些受保护执行路径的旧版 `tools.bash.*` 别名。
- **工作区**：工作目录 (`agents.defaults.workspace`)。
- **文档**：OpenClaw 文档（仓库或 npm 包）的本地路径以及何时阅读它们。
- **工作区文件（已注入）**：表示启动文件包含在下方。
- **沙箱**（启用时）：指示沙箱隔离运行时、沙箱路径以及是否可以使用提升执行。
- **当前日期和时间**：仅时区（缓存稳定；实时时钟来自 `session_status`）。
- **回复标签**：支持的提供商的可选回复标签语法。
- **心跳**：心跳提示和确认行为，以及何时为默认代理启用心跳。
- **运行时**：主机、操作系统、节点、模型、仓库根目录（检测到时）、思维级别（一行）。
- **推理**：当前可见性级别 + /reasoning 切换提示。

OpenClaw 将大型稳定内容（包括 **项目上下文**）保留在内部提示缓存边界之上。易变的渠道/会话部分（如控制 UI 嵌入指南、**消息传递**、**语音**、**群组聊天上下文**、**反应**、**心跳**和 **运行时**）附加在该边界之下，以便具有前缀缓存的本地后端可以在渠道轮次之间重用稳定的工作区前缀。当接受的架构已包含该运行时详细信息时，工具描述也应避免嵌入当前渠道名称。

工具部分还包括针对长时间运行工作的运行时指南：

- 使用 cron 进行未来的跟进（`check back later`、提醒、周期性工作），
  而不是 `exec` sleep 循环、`yieldMs` delay 技巧或重复的 `process`
  轮询
- 仅对现在开始并继续在后台运行的命令使用 `exec` / `process`
- 当启用自动完成唤醒时，启动一次命令，并在其输出或失败时依赖基于推送的唤醒路径
- 当需要检查正在运行的命令时，使用 `process` 查看日志、状态、输入或进行干预
- 如果任务较大，首选 `sessions_spawn`；子代理的完成是基于推送的，并会自动通知请求者
- 不要仅仅为了等待完成而在循环中轮询 `subagents list` / `sessions_list`

`agents.defaults.subagents.delegationMode` 可以加强这一指导。默认的 `suggest` 模式保持基线推动。`prefer` 增加了一个专门的**子代理委派**部分，告诉主代理充当响应式协调器，并通过 `sessions_spawn` 推送任何比直接回复更复杂的内容。这仅限于提示词；工具策略仍然控制 `sessions_spawn` 是否可用。

当启用实验性的 `update_plan` 工具时，Tooling 还会告诉模型仅将其用于非平凡的多步骤工作，保持恰好一个 `in_progress` 步骤，并避免在每次更新后重复整个计划。

系统提示中的安全防护措施是建议性的。它们指导模型行为但不执行策略。使用工具策略、执行批准、沙箱隔离和渠道允许列表进行硬性执行；操作员可以有意禁用这些功能。

在具有原生批准卡片/按钮的渠道上，运行时提示现在告诉代理首先依赖该原生批准 UI。仅当工具结果表明聊天批准不可用或手动批准是唯一途径时，才应包含手动的 `/approve` 命令。

## 提示词模式

OpenClaw 可以为子代理渲染更小的系统提示。运行时为每次运行设置一个 `promptMode`（而不是面向用户的配置）：

- `full`（默认）：包括上述所有部分。
- `minimal`：用于子代理；省略 **Skills**、**Memory Recall**、**OpenClaw Self-Update**、**Model Aliases**、**User Identity**、**Reply Tags**、**Messaging**、**Silent Replies** 和 **Heartbeats**。工具链、**Safety**、Workspace、沙箱、当前日期和时间（如果已知）、Runtime 和注入的上下文仍然可用。
- `none`：仅返回基础身份行。

当 `promptMode=minimal` 时，额外注入的提示被标记为 **Subagent Context**，而不是 **Group Chat Context**。

对于渠道自动回复运行，如果直接/群组聊天上下文已包含已解析的特定于对话的 `NO_REPLY` 行为，OpenClaw 可以省略通用的 **Silent Replies** 部分。这避免了在全局系统提示和渠道上下文中重复令牌机制。

## 提示快照

OpenClaw 在 `test/fixtures/agents/prompt-snapshots/codex-runtime-happy-path/` 下保存了 Codex 运行时快乐路径的已提交提示快照。它们渲染选定的应用服务器线程/轮次参数以及为 Telegram 直接消息、Discord 群组和心跳轮次重建的模型绑定提示层堆栈。该堆栈包括一个固定的 Codex `gpt-5.5` 模型提示装置（根据 Codex 的模型目录/缓存形状生成）、Codex 快乐路径权限开发者文本、OpenClaw 开发者指令、当 OpenClaw 提供它们时的轮次范围协作模式指令、用户轮次输入以及对动态工具规范的引用。

使用 `pnpm prompt:snapshots:sync-codex-model` 刷新固定的 Codex 模型 prompt 固定装置。默认情况下，脚本会在 `$CODEX_HOME/models_cache.json` 中查找 Codex 的运行时缓存，然后是 `~/.codex/models_cache.json`，最后才回退到 `~/code/codex/codex-rs/models-manager/models.json` 处的维护者 Codex 检出约定。如果这些源都不存在，该命令将退出而不更改已提交的固定装置。传递 `--catalog <path>` 以从特定的 `models_cache.json` 或 `models.json` 文件进行刷新。

这些快照仍然不是逐字节原始 OpenAI 请求捕获。在 OpenClaw 发送线程和轮次参数后，Codex 可以在 Codex 运行时内部添加运行时拥有的工作区上下文，例如 OpenAI`AGENTS.md`OpenClaw、环境上下文、记忆、应用/插件指令以及内置的默认协作模式指令。

使用 `pnpm prompt:snapshots:gen` 重新生成它们，并使用 `pnpm prompt:snapshots:check` 验证偏差。CI 在额外的边界分片中运行偏差检查，以确保 prompt 更改和快照更新保持在同一个 PR 中。

## 工作区启动注入

Bootstrap 文件经过修剪并被追加到 **Project Context** 下，以便模型无需显式读取即可看到身份和配置文件上下文：

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md` （仅限全新的工作区）
- 存在时的 `MEMORY.md`

除非存在特定文件的限制，否则所有这些文件都会在每一轮中**注入到上下文窗口**中。当为默认代理禁用心跳或
`agents.defaults.heartbeat.includeSystemPromptSection` 为 false 时，普通运行中将省略 `HEARTBEAT.md`。请保持注入文件的简洁，尤其是 `MEMORY.md`。
`MEMORY.md` 旨在保留为经过策划的长期摘要；详细的每日笔记应放在 `memory/*.md` 中，以便 `memory_search` 和 `memory_get` 可以按需检索它们。
过大的 `MEMORY.md` 文件会增加提示词的使用量，并且由于下面的引导文件限制，可能会被部分注入。

当会话在原生 Codex 约束具上运行时，Codex 通过其自己的项目文档发现机制加载 `AGENTS.md`。
OpenClaw 仍然解析剩余的引导文件，并将它们作为 Codex 配置指令转发，因此 `SOUL.md`、
`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md` 和
`MEMORY.md` 保持相同的工作区上下文角色，而不会重复 `AGENTS.md`。

<Note>`memory/*.md` 每日文件**不**属于普通引导项目上下文的一部分。在普通轮次中，它们通过 `memory_search` 和 `memory_get` 工具按需访问，因此除非模型明确读取它们，否则它们不会计入上下文窗口。 裸 `/new` 和 `/reset` 轮次是例外：运行时可以将最近的每日记忆作为该第一轮的一次性启动上下文块添加到前面。</Note>

大文件会被标记截断。每个文件的最大大小由
`agents.defaults.bootstrapMaxChars` 控制（默认值：12000）。所有文件注入的引导内容
总和受 `agents.defaults.bootstrapTotalMaxChars` 限制
（默认值：60000）。缺失的文件会注入一个简短的缺失文件标记。发生截断时，
OpenClaw 可以注入一个简明的系统提示警告通知；可通过
`agents.defaults.bootstrapPromptTruncationWarning` 控制此行为（`off`、`once`、`always`；
默认值：`once`）。详细的原始/注入计数保留在 `/context`、
`/status`、doctor 和日志等诊断信息中。

对于记忆文件，截断并不代表数据丢失：文件在磁盘上保持完整，
但模型只能看到被缩短的注入副本，直到它直接读取或搜索
记忆为止。如果 `MEMORY.md` 被反复截断，请将其提炼为
更短的持久摘要，并将详细历史记录移至 `memory/*.md`，或者
有意提高引导限制。

子代理会话仅注入 `AGENTS.md` 和 `TOOLS.md`（其他引导文件
会被过滤掉，以保持子代理上下文较小）。

内部钩子可以通过 `agent:bootstrap` 拦截此步骤，以修改或替换
注入的引导文件（例如，用 `SOUL.md` 交换为替代角色设定）。

如果您想让代理听起来不那么通用，请从
[SOUL.md 个性指南](/zh/concepts/soul) 开始。

要检查每个注入文件的贡献程度（原始内容与注入内容对比、截断情况以及工具架构开销），请使用 `/context list` 或 `/context detail`。请参阅 [上下文](/zh/concepts/context)。

## 时间处理

当已知用户时区时，系统提示包含一个专门的 **当前日期和时间** 部分。为了保持提示缓存的稳定性，现在仅包含
**时区**（没有动态时钟或时间格式）。

当代理需要当前时间时使用 `session_status`；状态卡包含一个时间戳行。同一个工具可以选择性设置每个会话的模型覆盖（`model=default` 清除它）。

配置如下：

- `agents.defaults.userTimezone`
- `agents.defaults.timeFormat` (`auto` | `12` | `24`)

有关完整行为细节，请参阅 [Date & Time](/zh/date-time)。

## Skills

当存在符合条件的 Skills 时，OpenClaw 会注入一个简洁的**可用 Skills 列表** (OpenClaw`formatSkillsForPrompt`)，其中包含每个 Skill 的**文件路径**。该提示指示模型使用 `read` 加载列出的位置（工作区、托管或捆绑）中的 SKILL.md。如果没有符合条件的 Skills，则省略 Skills 部分。

符合条件的条件包括 Skill 元数据门控、运行时环境/配置检查，以及当配置了 `agents.defaults.skills` 或 `agents.list[].skills` 时的有效代理 Skill 允许列表。

只有在其所属插件启用时，插件捆绑的 Skills 才符合条件。这允许工具插件公开更深入的操作指南，而无需将所有这些指南直接嵌入到每个工具描述中。

```
<available_skills>
  <skill>
    <name>...</name>
    <description>...</description>
    <location>...</location>
  </skill>
</available_skills>
```

这既保持了基础提示的精简，同时又支持有针对性的 Skill 使用。

Skills 列表预算由 Skills 子系统拥有：

- 全局默认值：`skills.limits.maxSkillsPromptChars`
- 每个代理的覆盖：`agents.list[].skillsLimits.maxSkillsPromptChars`

通用受限运行时摘录使用不同的表面：

- `agents.defaults.contextLimits.*`
- `agents.list[].contextLimits.*`

这种分离将 Skills 大小与运行时读取/注入大小（如 `memory_get`、实时工具结果和压缩后的 AGENTS.md 刷新）区分开来。

## 文档

系统提示包含一个**文档**部分。当本地文档可用时，它指向本地 OpenClaw 文档目录（Git 检出中的 OpenClaw`docs/`npm 或捆绑的 npm 包文档）。如果本地文档不可用，则回退到 [https://docs.openclaw.ai](https://docs.openclaw.ai)。

同一部分还包含 OpenClaw 源代码位置。Git 检出会暴露本地
源代码根目录，以便代理可以直接检查代码。软件包安装包含 GitHub
源代码 URL，并指示代理在文档不完整或过时
时到那里查看源代码。提示词还注明了公共文档镜像、社区 Discord 和 ClawHub
([https://clawhub.ai](https://clawhub.ai))，用于发现技能。它告诉模型
在 OpenClaw 行为、命令、配置或架构方面优先查阅文档，并
尽可能自行运行 `openclaw status`（仅在无法访问时询问用户）。
特别是对于配置，它将代理指向 `gateway` 工具操作
`config.schema.lookup` 以获取精确的字段级文档和约束，然后指向
`docs/gateway/configuration.md` 和 `docs/gateway/configuration-reference.md`
以获取更广泛的指导。

## 相关

- [代理运行时](/zh/concepts/agent)
- [代理工作区](/zh/concepts/agent-workspace)
- [上下文引擎](/zh/concepts/context-engine)
