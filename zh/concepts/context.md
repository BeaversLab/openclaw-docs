---
summary: "上下文：模型看到的内容、如何构建以及如何检查它"
read_when:
  - 您想了解“上下文”在 OpenClaw 中的含义
  - 您正在调试模型“知道”某事（或忘记它）的原因
  - 您想减少上下文开销 (/context, /status, /compact)
title: "上下文"
---

# 上下文

“上下文”是 **OpenClaw 在一次运行中发送给模型的所有内容**。它受模型的 **上下文窗口**（token 限制）限制。

初学者的心智模型：

- **系统提示词**（由 OpenClaw 构建）：规则、工具、技能列表、时间/运行时以及注入的工作区文件。
- **对话历史**：您的消息 + 助手在此会话中的消息。
- **工具调用/结果 + 附件**：命令输出、文件读取、图像/音频等。

上下文 _并非_ “记忆”的同义词：记忆可以存储在磁盘上并在稍后重新加载；上下文是模型当前窗口内的内容。

## 快速开始（检查上下文）

- `/status` → 快速查看“我的窗口有多满？”+ 会话设置。
- `/context list` → 注入了什么 + 大致大小（每个文件 + 总计）。
- `/context detail` → 更详细的细分：每个文件、每个工具架构大小、每个技能条目大小以及系统提示词大小。
- `/usage tokens` → 将每次回复的使用情况页脚附加到正常回复中。
- `/compact` → 将较旧的历史记录汇总为紧凑条目以释放窗口空间。

另请参阅：[斜杠命令](/zh/tools/slash-commands)、[Token 使用与成本](/zh/reference/token-use)、[压缩](/zh/concepts/compaction)。

## 示例输出

数值因模型、提供商、工具策略以及工作区中的内容而异。

### `/context list`

```
🧠 Context breakdown
Workspace: <workspaceDir>
Bootstrap max/file: 20,000 chars
Sandbox: mode=non-main sandboxed=false
System prompt (run): 38,412 chars (~9,603 tok) (Project Context 23,901 chars (~5,976 tok))

Injected workspace files:
- AGENTS.md: OK | raw 1,742 chars (~436 tok) | injected 1,742 chars (~436 tok)
- SOUL.md: OK | raw 912 chars (~228 tok) | injected 912 chars (~228 tok)
- TOOLS.md: TRUNCATED | raw 54,210 chars (~13,553 tok) | injected 20,962 chars (~5,241 tok)
- IDENTITY.md: OK | raw 211 chars (~53 tok) | injected 211 chars (~53 tok)
- USER.md: OK | raw 388 chars (~97 tok) | injected 388 chars (~97 tok)
- HEARTBEAT.md: MISSING | raw 0 | injected 0
- BOOTSTRAP.md: OK | raw 0 chars (~0 tok) | injected 0 chars (~0 tok)

Skills list (system prompt text): 2,184 chars (~546 tok) (12 skills)
Tools: read, edit, write, exec, process, browser, message, sessions_send, …
Tool list (system prompt text): 1,032 chars (~258 tok)
Tool schemas (JSON): 31,988 chars (~7,997 tok) (counts toward context; not shown as text)
Tools: (same as above)

Session tokens (cached): 14,250 total / ctx=32,000
```

### `/context detail`

```
🧠 Context breakdown (detailed)
…
Top skills (prompt entry size):
- frontend-design: 412 chars (~103 tok)
- oracle: 401 chars (~101 tok)
… (+10 more skills)

Top tools (schema size):
- browser: 9,812 chars (~2,453 tok)
- exec: 6,240 chars (~1,560 tok)
… (+N more tools)
```

## 什么计入上下文窗口

模型接收到的所有内容都计入，包括：

- 系统提示词（所有部分）。
- 对话历史。
- 工具调用 + 工具结果。
- 附件/转录（图像/音频/文件）。
- 压缩摘要和修剪产物。
- 提供商“包装器”或隐藏标头（不可见，但仍会计入）。

## OpenClaw 如何构建系统提示词

系统提示词是 **OpenClaw 拥有的**，并在每次运行时重新构建。它包括：

- 工具列表 + 简短描述。
- 技能列表（仅元数据；见下文）。
- 工作区位置。
- 时间（UTC + 如果已配置则转换为用户时间）。
- 运行时元数据（主机/操作系统/模型/思维）。
- 注入在 **Project Context** 下的工作区引导文件。

完整分解：[System Prompt](/zh/concepts/system-prompt)。

## 注入的工作区文件（Project Context）

默认情况下，OpenClaw 会注入一组固定的工作区文件（如果存在）：

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md`（仅首次运行）

大文件使用 `agents.defaults.bootstrapMaxChars` 按文件截断（默认 `20000` 个字符）。OpenClaw 还使用 `agents.defaults.bootstrapTotalMaxChars`（默认 `150000` 个字符）强制执行跨文件的总引导注入上限。`/context` 显示 **原始与注入** 大小以及是否发生了截断。

当发生截断时，运行时可以在 Project Context 下注入提示内警告块。使用 `agents.defaults.bootstrapPromptTruncationWarning` 配置（`off`、`once`、`always`；默认 `once`）。

## Skills：注入与按需加载

系统提示包含一个紧凑的 **skills list**（名称 + 描述 + 位置）。此列表具有实际开销。

默认情况下不包含 Skill 指令。模型应仅在**需要时** `read` skill 的 `SKILL.md`。

## Tools：存在两项成本

工具在两个方面影响上下文：

1. 系统提示中的 **Tool list text**（您看到的“Tooling”）。
2. **Tool schemas**（JSON）。这些被发送给模型，以便它可以调用工具。尽管您不以纯文本形式看到它们，但它们计入上下文。

`/context detail` 分解了最大的工具架构，以便您可以看到占主导地位的内容。

## Commands、directives 和“inline shortcuts”

斜杠命令由 Gateway(网关) 处理。有几种不同的行为：

- **独立命令**：仅包含 `/...` 的消息作为命令运行。
- **Directives**: `/think`, `/verbose`, `/reasoning`, `/elevated`, `/model`, `/queue` 会在模型看到消息之前被剥离。
  - 仅包含指令的消息会保留会话设置。
  - 普通消息中的内联指令作为针对单条消息的提示。
- **Inline shortcuts**（仅限白名单发送者）：普通消息中的某些 `/...` 标记可以立即运行（例如：“hey /status”），并且在模型看到剩余文本之前被剥离。

详情：[Slash commands](/zh/tools/slash-commands)。

## Sessions, compaction, and pruning (what persists)

跨消息保留的内容取决于机制：

- **Normal history** 保留在会话记录中，直到被策略压缩或修剪。
- **Compaction** 将摘要保留到记录中，并保持最近的消息完整。
- **Pruning** 从一次运行的 _in-memory_ 提示中删除旧的工具结果，但不会重写记录。

文档：[Session](/zh/concepts/session)、[Compaction](/zh/concepts/compaction)、[Session pruning](/zh/concepts/session-pruning)。

默认情况下，OpenClaw 使用内置的 `legacy` 上下文引擎进行组装和压缩。如果您安装了一个提供 `kind: "context-engine"` 的插件并使用 `plugins.slots.contextEngine` 选中它，OpenClaw 会将上下文组装、`/compact` 和相关的子代理上下文生命周期钩子委托给该引擎。`ownsCompaction: false` 不会自动回退到旧引擎；活动引擎仍必须正确实现 `compact()`。有关完整的可插拔接口、生命周期钩子和配置，请参阅 [Context Engine](/zh/concepts/context-engine)。

## What `/context` actually reports

`/context` 优先使用最新的 **run-built** 系统提示报告（如果可用）：

- `System prompt (run)` = 从最后一次嵌入的（支持工具的）运行中捕获并保存在会话存储中。
- 当没有运行报告存在时（或通过不生成报告的 CLI 后端运行时），`System prompt (estimate)` = 实时计算。

无论哪种方式，它都会报告大小和主要贡献者；它**不会**转储完整的系统提示或工具架构。

import en from "/components/footer/en.mdx";

<en />
