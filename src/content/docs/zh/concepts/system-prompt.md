---
summary: "OpenClaw 系统提示词包含的内容及其组装方式"
read_when:
  - Editing system prompt text, tools list, or time/heartbeat sections
  - Changing workspace bootstrap or skills injection behavior
title: "System prompt"
---

OpenClaw 为每次代理运行构建自定义系统提示词。该提示词由 **OpenClaw 拥有**，不使用运行时默认提示词。

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
- **OpenClaw 控制**：指示模型在配置/重启工作中优先使用 `gateway` 工具，并避免编造 CLI 命令。
- **OpenClaw 自更新**：如何使用 OpenClaw`config.schema.lookup` 安全地检查配置，使用 `config.patch` 修补配置，使用 `config.apply` 替换完整配置，并仅在明确用户请求时运行 `update.run`。面向代理的 `gateway` 工具也拒绝重写 `tools.exec.ask` / `tools.exec.security`，包括解析为这些受保护执行路径的旧版 `tools.bash.*` 别名。
- **工作区**：工作目录 (`agents.defaults.workspace`)。
- **文档**：OpenClaw 文档/源的本地路径以及何时读取它们。
- **工作区文件（已注入）**：表示引导文件已包含在下方。
- **沙箱**（启用时）：表示沙箱隔离的运行时、沙箱路径以及是否可用 elevated exec。
- **当前日期和时间**：仅时区（缓存稳定；实时时钟来自 `session_status`）。
- **助手输出指令**：紧凑型附件、语音笔记和回复标签语法。
- **心跳**：心跳提示和确认行为，以及何时为默认代理启用心跳。
- **运行时**：主机、操作系统、节点、模型、仓库根目录（检测到时）、思考级别（一行）。
- **推理**：当前可见性级别 + /reasoning 切换提示。

OpenClaw 将大型稳定内容（包括 **Project Context**）保留在内部提示缓存边界之上。易变的渠道/会话部分（例如 Control UI 嵌入指南、**Messaging**、**Voice**、**Group Chat Context**、**Reactions**、**Heartbeats** 和 **Runtime**）被附加在该边界之下，以便具有前缀缓存的本地后端可以在渠道轮次之间重用稳定的工作区前缀。同样，当接受的架构已携带该运行时详细信息时，工具描述应避免嵌入当前的渠道名称。

工具部分还包括针对长时间运行的运行时指南：

- 使用 cron 进行后续跟进（`check back later`、提醒、周期性工作），而不是 `exec` 睡眠循环、`yieldMs` 延迟技巧或重复的 `process` 轮询
- 仅将 `exec` / `process` 用于立即启动并在后台继续运行的命令
- 启用自动完成唤醒时，启动一次命令，并在其输出或失败时依赖基于推送的唤醒路径
- 当需要检查正在运行的命令时，使用 `process` 查看日志、状态、输入或进行干预
- 如果任务较大，首选 `sessions_spawn`；子代理的完成是基于推送的，并会自动通知请求者
- 不要在循环中轮询 `subagents list` / `sessions_list` 仅仅为了等待完成

`agents.defaults.subagents.delegationMode` 可以强化此指导。默认的 `suggest` 模式保持基准提示。`prefer` 增加了一个专门的 **子代理委托** 部分，告知主代理作为响应协调员，并将比直接回复更复杂的任何事务通过 `sessions_spawn` 推送。这仅限于提示词；工具策略仍然控制 `sessions_spawn` 是否可用。

当启用实验性的 `update_plan` 工具时，工具配置也会告知模型仅在非平凡的多步骤工作中使用它，保持恰好一个 `in_progress` 步骤，并避免在每次更新后重复整个计划。

系统提示词中的安全护栏是建议性的。它们引导模型行为，但不强制执行策略。请使用工具策略、执行审批、沙箱隔离和渠道允许列表进行硬性强制执行；操作员可以有意禁用这些功能。

在具有原生审批卡片/按钮的渠道上，运行时提示词现在告知代理优先依赖该原生审批 UI。仅当工具结果指出聊天审批不可用或手动审批是唯一途径时，才应包含手动 `/approve` 命令。

## 提示词模式

OpenClaw 可以为子代理渲染较小的系统提示词。运行时为每次运行设置一个 `promptMode`（不是面向用户的配置）：

- `full`（默认）：包括上述所有部分。
- `minimal`OpenClaw：用于子代理；省略 **Memory Recall**、**OpenClaw
  Self-Update**、**Model Aliases**、**User Identity**、**Assistant Output Directives**、
  **Messaging**、**Silent Replies** 和 **Heartbeats**。工具、**Safety**、
  **Skills**（如果提供）、Workspace、沙箱、当前日期和时间（如果
  已知）、Runtime 以及注入的上下文仍然可用。
- `none`：仅返回基础身份行。

当 `promptMode=minimal` 时，额外注入的提示词被标记为 **Subagent
Context** 而不是 **Group Chat Context**。

对于渠道自动回复运行，当直接、群组或仅消息工具上下文拥有可见回复合同时，OpenClaw 会省略通用的**静默回复**部分。只有旧的自动群组/渠道模式才应显示 OpenClaw`NO_REPLY`；直接聊天和仅消息工具的回复不会收到静默令牌指导。

## 提示词快照

OpenClaw 在 OpenClaw`test/fixtures/agents/prompt-snapshots/codex-runtime-happy-path/`TelegramDiscord 下为 Codex 运行时快乐路径保留已提交的提示快照。它们渲染选定的应用服务器线程/轮次参数以及为 Telegram 直接消息、Discord 组和心跳轮次重构的模型绑定提示层堆栈。该堆栈包括根据 Codex 的模型目录/缓存形状生成的固定 Codex `gpt-5.5`OpenClawOpenClaw 模型提示装置、Codex 快乐路径权限开发者文本、OpenClaw 开发者指令、当 OpenClaw 提供时的轮次范围协作模式指令、用户轮次输入以及对动态工具规范的引用。

使用 `pnpm prompt:snapshots:sync-codex-model` 刷新固定的 Codex 模型提示符夹具。默认情况下，脚本会在 `$CODEX_HOME/models_cache.json` 处查找 Codex 的运行时缓存，然后是 `~/.codex/models_cache.json`，只有在找不到这些位置时，才会回退到维护者 Codex 检出约定 `~/code/codex/codex-rs/models-manager/models.json`。如果这些来源都不存在，该命令将在不更改已提交夹具的情况下退出。传递 `--catalog <path>` 以从特定的 `models_cache.json` 或 `models.json` 文件进行刷新。

这些快照仍然不是逐字节的原始 OpenAI 请求捕获。Codex 可以在 OpenClaw 发送线程和轮次参数后，在 Codex 运行时内添加运行时拥有的工作区上下文（例如 `AGENTS.md`）、环境上下文、记忆、应用/插件指令以及内置的默认协作模式指令。

使用 `pnpm prompt:snapshots:gen` 重新生成它们，并使用
`pnpm prompt:snapshots:check` 验证差异。CI 会在额外的
boundary 分片中运行差异检查，以便提示更改和快照更新保持在同一个
PR 中。

## 工作区引导注入

Bootstrap 文件从当前工作区解析，然后路由到与其生命周期匹配的
提示表面：

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md` （仅限全新的工作空间）
- 如果存在 `MEMORY.md`

在原生 Codex 约束中，OpenClaw 避免在每次用户轮次中重复稳定的工作区文件。Codex 通过其自己的项目文档发现加载 OpenClaw`AGENTS.md`。`SOUL.md`、`IDENTITY.md`、`TOOLS.md` 和 `USER.md`OpenClaw 作为 Codex 开发者指令被转发。精简的 OpenClaw 工具列表也作为轮次范围的协作开发者指令被转发。`HEARTBEAT.md` 内容不会被注入；当该文件存在且非空时，心跳轮次会获得一条指向该文件的协作模式说明。来自已配置代理工作区的 `MEMORY.md` 内容不会粘贴到每次原生 Codex 轮次中；当该工作区有可用的记忆工具时，Codex 轮次会在轮次范围的协作开发者指令中获得一个小的工作区记忆说明，并且在持久化记忆相关时应该使用 `memory_search` 或 `memory_get`。如果工具被禁用、记忆搜索不可用，或者活动工作区与代理记忆工作区不同，`MEMORY.md` 将回退到正常的有界轮次上下文路径。活动的 `BOOTSTRAP.md` 内容目前保持正常的轮次上下文角色。

在非 Codex 驱动程序上，引导文件继续根据其现有的门限组合到 OpenClaw 提示词中。当为默认代理禁用心跳或 `agents.defaults.heartbeat.includeSystemPromptSection` 为 false 时，`HEARTBEAT.md` 在正常运行中将被省略。保持注入文件的简洁，尤其是非 Codex 的 `MEMORY.md`。`MEMORY.md` 旨在保持一个精心策划的长期摘要；详细的每日笔记应放在 `memory/*.md` 中，`memory_search` 和 `memory_get` 可以按需检索它们。过大的非 Codex `MEMORY.md` 文件会增加提示词使用量，并且由于下面的引导文件限制，可能会被部分注入。

<Note>`memory/*.md` 每日文件**不是**正常引导项目上下文的一部分。在普通轮次中，它们通过 `memory_search` 和 `memory_get` 工具按需访问，因此除非模型明确读取它们，否则它们不会计入上下文窗口。纯 `/new` 和 `/reset` 轮次是例外：运行时可以将最近的每日记忆作为该第一轮的一次性启动上下文块预先添加。</Note>

大文件会被截断并添加标记。每个文件的最大大小由 `agents.defaults.bootstrapMaxChars` 控制（默认：20000）。跨文件注入的总引导内容上限由 `agents.defaults.bootstrapTotalMaxChars`OpenClaw 控制（默认：60000）。缺失的文件会注入一个简短的文件缺失标记。发生截断时，OpenClaw 可以插入一个简洁的系统提示警告通知；通过 `agents.defaults.bootstrapPromptTruncationWarning`（`off`、`once`、`always`；默认：`always`）对此进行控制。详细的原始/注入计数保留在 `/context`、`/status`、doctor 和日志等诊断信息中。

对于内存文件，截断并不意味着数据丢失：文件在磁盘上保持完整。在原生 Codex 上，当可用时，通过内存工具按需读取 `MEMORY.md`，当工具无法运行时使用有界提示回退。在其他套具上，模型只能看到缩短的注入副本，直到它直接读取或搜索内存。如果 `MEMORY.md` 在那里被反复截断，请将其提炼为更短的持久摘要，并将详细历史记录移至 `memory/*.md`，或者有意提高引导限制。

子代理会话仅注入 `AGENTS.md` 和 `TOOLS.md`（其他引导文件会被过滤掉，以保持子代理上下文较小）。

内部钩子可以通过 `agent:bootstrap` 拦截此步骤，以更改或替换注入的引导文件（例如，将 `SOUL.md` 交换为备用角色设定）。

如果您希望让智能体听起来不那么普通，可以从
[SOUL.md 个性指南](/zh/concepts/soul) 开始。

要检查每个注入文件的贡献程度（原始内容 vs 已注入内容、截断情况，以及工具 schema 开销），请使用 `/context list` 或 `/context detail`。请参阅[上下文 (Context)](/zh/concepts/context)。

## 时间处理

当用户时区已知时，系统提示词包含一个专门的 **当前日期和时间** 部分。为了保持提示词缓存稳定，现在仅包含 **时区**（不包含动态时钟或时间格式）。

当智能体需要当前时间时使用 `session_status`；状态卡片
包含一个时间戳行。同一个工具还可以选择设置每次会话的模型
覆盖（`model=default` 可将其清除）。

配置如下：

- `agents.defaults.userTimezone`
- `agents.defaults.timeFormat` (`auto` | `12` | `24`)

有关完整的行为详情，请参阅[日期与时间](/zh/date-time)。

## Skills

当存在符合条件的 Skills 时，OpenClaw 会注入一个精简的**可用 Skills 列表**
(OpenClaw`formatSkillsForPrompt`)，其中包含每个 Skill 的**文件路径**。
该提示指示模型使用 `read` 来加载所列位置（工作区、托管或打包）的 SKILL.md。如果没有符合条件的 Skills，则
省略 Skills 部分。

原生 Codex 轮次将此列表作为轮次范围的协作开发者指令接收，而不是作为每轮用户输入，但保留精确预定提示的轻量级 cron 轮次除外。其他约束保持正常的提示部分。

该位置可以指向嵌套技能，例如 `skills/personal/foo/SKILL.md`。嵌套仅用于组织；提示仍然使用来自 `SKILL.md` frontmatter 的扁平技能名称。

资格条件包括技能元数据门控、运行时环境/配置检查，以及当配置了 `agents.defaults.skills` 或 `agents.list[].skills` 时的有效代理技能允许列表。

插件捆绑的技能只有在其所属插件启用时才符合资格。这允许工具插件公开更深入的操作指南，而无需将所有这些指导直接嵌入到每个工具描述中。

```
<available_skills>
  <skill>
    <name>...</name>
    <description>...</description>
    <location>...</location>
  </skill>
</available_skills>
```

这既保持了基础提示的小巧，又能够实现有针对性的工具使用。

技能列表预算由技能子系统管理：

- 全局默认值：`skills.limits.maxSkillsPromptChars`
- 每个代理的覆盖值：`agents.list[].skillsLimits.maxSkillsPromptChars`

通用的有界运行时摘录使用不同的界面：

- `agents.defaults.contextLimits.*`
- `agents.list[].contextLimits.*`

这种分离将技能大小与运行时读取/注入大小分开，例如 `memory_get`、实时工具结果以及压缩后的 AGENTS.md 刷新。

## 文档

系统提示包含一个 **文档** 部分。当本地文档可用时，它指向本地 OpenClaw 文档目录（Git 检出中的 `docs/` 或捆绑的 npm 包文档）。如果本地文档不可用，它将回退到 [https://docs.openclaw.ai](https://docs.openclaw.ai)。

同一部分还包括 OpenClaw 源代码位置。Git 检出会暴露本地源代码根目录，以便代理可以直接检查代码。软件包安装包括 GitHub 源代码 URL，并告诉代理在文档不完整或过时时在那里查看源代码。提示还记录了公共文档镜像、社区 Discord 和 ClawHub（[https://clawhub.ai](https://clawhub.ai)），以便发现技能。它告诉模型首先查阅文档以了解 OpenClaw 行为、命令、配置或架构，并在可能时自行运行 `openclaw status`（仅在无法访问时询问用户）。具体对于配置，它将代理指向 `gateway` 工具操作 `config.schema.lookup` 以获取确切的字段级文档和约束，然后指向 `docs/gateway/configuration.md` 和 `docs/gateway/configuration-reference.md` 以获取更广泛的指导。

## 相关

- [代理运行时](/zh/concepts/agent)
- [代理工作区](/zh/concepts/agent-workspace)
- [上下文引擎](/zh/concepts/context-engine)
