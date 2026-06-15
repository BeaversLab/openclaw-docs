---
summary: "Context：模型看到的内容、构建方式以及如何检查它"
read_when:
  - You want to understand what "context" means in OpenClaw
  - You are debugging why the model "knows" something (or forgot it)
  - You want to reduce context overhead (/context, /status, /compact)
title: "上下文"
---

“上下文”是 **OpenClaw 在一次运行中发送给模型的所有内容**。它受限于模型的 **上下文窗口**（Token 限制）。

初学者心智模型：

- **系统提示词**（由 OpenClaw 构建）：规则、工具、Skills 列表、时间/运行时以及注入的工作区文件。
- **对话历史**：您的消息 + 此会话中助手的消息。
- **工具调用/结果 + 附件**：命令输出、文件读取、图像/音频等。

上下文与“记忆”并*不是一回事*：记忆可以存储在磁盘上并在稍后重新加载；上下文是模型当前窗口内的内容。

## 快速开始（检查上下文）

- `/status` → 快速查看“我的窗口有多满？”+ 会话设置。
- `/context list` → 注入了什么 + 大致大小（每个文件 + 总计）。
- `/context detail` → 更详细的细分：每个文件、每个工具架构大小、每个技能条目大小以及系统提示词大小。
- `/context map` → 当前会话跟踪的上下文贡献者的 WinDirStat 风格树状图。
- `/usage tokens` → 将每次回复的使用情况页脚附加到普通回复中。
- `/compact` → 将较早的历史记录摘要为紧凑条目以释放窗口空间。

另请参阅：[斜杠命令](/zh/tools/slash-commands)、[Token 使用与成本](/zh/reference/token-use)、[压缩](/zh/concepts/compaction)。

## 示例输出

数值因模型、提供商、工具策略以及工作区中的内容而异。

### `/context list`

```
🧠 Context breakdown
Workspace: <workspaceDir>
Bootstrap max/file: 12,000 chars
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

### `/context map`

发送一张根据最新缓存的运行报告生成的图片。在会话中，普通消息尚未生成运行报告之前，`/context map` 会返回一条不可用的消息，而不是渲染估算值。矩形面积与跟踪的提示字符成正比：

- 注入的工作区文件
- 基本系统提示文本
- 技能提示条目
- 工具 JSON 架构

`/context list`、`/context detail` 和 `/context json` 仍可在没有缓存运行报告时检查按需估算。

## 什么计入上下文窗口

模型接收到的所有内容都计入，包括：

- 系统提示（所有部分）。
- 对话历史。
- 工具调用 + 工具结果。
- 附件/转录（图像/音频/文件）。
- 压缩摘要和修剪产物。
- 提供商“包装器”或隐藏标头（不可见，但仍被计算）。

## OpenClaw 如何构建系统提示词

系统提示词归 **OpenClaw** 所有，并在每次运行时重新构建。它包括：

- 工具列表 + 简短描述。
- Skills 列表（仅元数据；见下文）。
- 工作区位置。
- 时间（UTC + 转换后的用户时间（如已配置））。
- 运行时元数据（主机/操作系统/模型/思考）。
- 在 **项目上下文（Project Context）** 下注入的工作区引导文件。

完整细分：[系统提示词](/zh/concepts/system-prompt)。

## 注入的工作区文件（项目上下文）

默认情况下，OpenClaw 会注入一组固定的工作区文件（如果存在）：

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md`（仅首次运行时）

大文件会使用 `agents.defaults.bootstrapMaxChars` 按文件进行截断（默认 `20000`OpenClaw 个字符）。OpenClaw 还通过 `agents.defaults.bootstrapTotalMaxChars` 对跨所有文件的总引导注入量设置了上限（默认 `60000` 个字符）。`/context` 显示了**原始大小与注入后大小**的对比以及是否发生了截断。

当发生截断时，运行时可以在项目上下文下注入一个提示内警告块。通过 `agents.defaults.bootstrapPromptTruncationWarning` 进行配置（`off`、`once`、`always`；默认为 `always`）。

## Skills：注入与按需加载

系统提示包含一个精简的 **skills 列表**（名称 + 描述 + 位置）。该列表确实会带来开销。

默认情况下不包含技能说明。模型被期望仅在需要时 `read` 技能的 `SKILL.md`。

## 工具：存在两项成本

工具通过以下两种方式影响上下文：

1. 系统提示词中的**工具列表文本**（您看到的“Tooling”）。
2. **工具架构**（JSON）。这些被发送给模型以便其调用工具。即使您不将其视为纯文本，它们也会计入上下文。

`/context detail` 分解了最大的工具架构，以便您查看什么占用了主要部分。

## 命令、指令和“行内快捷方式”

斜杠命令由 Gateway(网关) 处理。存在几种不同的行为：

- **独立命令**：仅包含 `/...` 的消息将作为命令运行。
- **指令**：`/think`、`/verbose`、`/trace`、`/reasoning`、`/elevated`、`/model` 和 `/queue` 会在模型看到消息之前被移除。
  - 仅包含指令的消息会保留会话设置。
  - 普通消息中的内联指令作为针对单条消息的提示。
- **内联快捷方式**（仅限允许的发件人）：普通消息中的某些 `/...` 标记可以立即运行（例如：“hey /status”），并在模型看到剩余文本之前被移除。

详情：[斜杠命令](/zh/tools/slash-commands)。

## 会话、压缩和修剪（保留的内容）

跨消息保留的内容取决于机制：

- **普通历史记录**会保留在会话记录中，直到根据策略被压缩/修剪。
- **压缩** 会将摘要持久化到记录中，并保持最近的消息完整。
- **修剪** 会从 _内存_ 提示中丢弃旧的工具结果以释放上下文窗口空间，但不会重写会话记录——完整的历史记录仍可在磁盘上检查。

文档：[会话](/zh/concepts/session)、[压缩](/zh/concepts/compaction)、[会话修剪](/zh/concepts/session-pruning)。

默认情况下，OpenClaw 使用内置的 `legacy` 上下文引擎进行组装和压缩。如果您安装了一个提供 `kind: "context-engine"` 的插件并通过 `plugins.slots.contextEngine` 选中它，OpenClaw 会将上下文组装、`/compact` 以及相关的子代理上下文生命周期挂钩委托给该引擎。`ownsCompaction: false` 不会自动回退到旧版引擎；活动引擎仍必须正确实现 `compact()`。有关完整的可插拔接口、生命周期挂钩和配置，请参阅 [Context Engine](/zh/concepts/context-engine)。

## `/context` 实际报告的内容

如果可用，`/context` 优先使用最新的 **run-built** 系统提示报告：

- `System prompt (run)` = 从上次嵌入的（具备工具能力的）运行中捕获，并持久化在会话存储中。
- `System prompt (estimate)`CLI = 在没有运行报告时（或通过不生成报告的 CLI 后端运行时）即时计算得出。

无论哪种方式，它都会报告大小和主要贡献者；它**不**会转储完整的系统提示或工具架构。

## 相关

<CardGroup cols={2}>
  <Card title="Context engine" href="/zh/concepts/context-engine" icon="puzzle-piece">
    通过插件进行自定义上下文注入。
  </Card>
  <Card title="Compaction" href="/zh/concepts/compaction" icon="compress">
    总结长对话以将其保持在模型窗口内。
  </Card>
  <Card title="System prompt" href="/zh/concepts/system-prompt" icon="message-lines">
    系统提示词的构建方式以及每一轮注入的内容。
  </Card>
  <Card title="Agent loop" href="/zh/concepts/agent-loop" icon="arrows-rotate">
    从接收消息到最终回复的完整 Agent 执行循环。
  </Card>
</CardGroup>
