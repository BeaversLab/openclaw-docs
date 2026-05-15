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
- `/usage tokens` → 将每次回复的使用情况页脚附加到正常回复中。
- `/compact` → 将较早的历史记录总结为紧凑条目以释放窗口空间。

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

## 什么会计入上下文窗口

模型接收到的所有内容都会计入，包括：

- 系统提示词（所有部分）。
- 对话历史。
- 工具调用 + 工具结果。
- 附件/转录（图像/音频/文件）。
- 压缩摘要和修剪产物。
- 提供商“包装器”或隐藏标头（不可见，但仍计入）。

## OpenClaw 如何构建系统提示词

系统提示词是 **由 OpenClaw 拥有的**，并在每次运行时重新构建。它包括：

- 工具列表 + 简短描述。
- Skills 列表（仅元数据；见下文）。
- 工作区位置。
- 时间（UTC + 转换后的用户时间，如果已配置）。
- 运行时元数据（主机/操作系统/模型/思考）。
- **项目上下文**（Project Context）下注入的工作区引导文件。

完整细分：[系统提示词](/zh/concepts/system-prompt)。

## 注入的工作区文件（项目上下文）

默认情况下，OpenClaw 会注入一组固定的工作区文件（如果存在）：

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md`（仅首次运行）

大文件使用 `agents.defaults.bootstrapMaxChars` 按文件截断（默认 `12000`OpenClaw 个字符）。OpenClaw 还通过 `agents.defaults.bootstrapTotalMaxChars` 强制执行跨文件的总引导注入上限（默认 `60000` 个字符）。`/context` 显示 **原始大小与注入后大小** 以及是否发生了截断。

当发生截断时，运行时可以在项目上下文下注入一个提示词内警告块。可以通过 `agents.defaults.bootstrapPromptTruncationWarning`（`off`、`once`、`always`；默认为 `once`）进行配置。

## Skills：注入与按需加载

系统提示包含一个精简的 **skills list**（名称 + 描述 + 位置）。此列表具有实际的开销。

技能说明默认情况下*不*包含在内。模型被期望**仅在需要时** `read` 技能的 `SKILL.md`。

## 工具：存在两种成本

工具通过两种方式影响上下文：

1. 系统提示词中的**工具列表文本**（你看到的“工具”）。
2. **工具架构**（JSON）。这些会被发送给模型，以便它能够调用工具。即使你不以纯文本形式看到它们，它们也会计入上下文。

`/context detail` 分解了最大的工具架构，以便你了解主要占用空间的内容。

## 命令、指令和“内联快捷方式”

斜杠命令由 Gateway(网关) 处理。有几种不同的行为：

- **独立命令**：仅包含 `/...` 的消息将作为命令运行。
- **指令**：`/think`、`/verbose`、`/trace`、`/reasoning`、`/elevated`、`/model`、`/queue` 会在模型看到消息之前被剥离。
  - 仅包含指令的消息会持久化会话设置。
  - 普通消息中的内联指令作为针对单条消息的提示。
- **行内快捷方式**（仅限允许列表中的发送者）：普通消息内的某些 `/...` 令牌可以立即运行（例如：“hey /status”），并且会在模型看到剩余文本之前被剥离。

详情：[斜杠命令](/zh/tools/slash-commands)。

## 会话、压缩和修剪（什么内容会持久化）

什么内容在消息之间持久化取决于具体机制：

- **普通历史记录** 会持久保留在会话记录中，直到被策略压缩或修剪。
- **压缩** 会将摘要持久保留到记录中，并保持最近的消息完整。
- **修剪**会从*内存中*的提示词中丢弃旧的工具结果以释放上下文窗口空间，但不会重写会话记录——完整的历史记录仍然可以在磁盘上检查。

文档：[会话](/zh/concepts/session)、[压缩](/zh/concepts/compaction)、[会话修剪](/zh/concepts/session-pruning)。

默认情况下，OpenClaw 使用内置的 OpenClaw`legacy` 上下文引擎进行组装和
压缩。如果您安装了一个提供 `kind: "context-engine"` 的插件
并使用 `plugins.slots.contextEngine`OpenClaw 选中它，OpenClaw 会将上下文
组装、`/compact` 以及相关的子代理上下文生命周期挂钩委托给该
引擎。`ownsCompaction: false` 不会自动回退到旧版
引擎；活动引擎仍必须正确实现 `compact()`。请参阅
[上下文引擎](/zh/concepts/context-engine) 以了解完整的
可插拔接口、生命周期挂钩和配置。

## `/context` 实际报告的内容

`/context` 在可用时首选最新的**运行构建**系统提示词报告：

- `System prompt (run)` = 从最后一次嵌入（具备工具能力）的运行中捕获，并持久化在会话存储中。
- `System prompt (estimate)`CLI = 当不存在运行报告时（或通过不生成该报告的 CLI 后端运行时）动态计算。

无论哪种情况，它都报告大小和主要贡献者；它**不会**转储完整的系统提示或工具架构。

## 相关

<CardGroup cols={2}>
  <Card title="Context engine" href="/zh/concepts/context-engine" icon="puzzle-piece">
    通过插件注入自定义上下文。
  </Card>
  <Card title="Compaction" href="/zh/concepts/compaction" icon="compress">
    对长对话进行摘要，使其保持在模型窗口内。
  </Card>
  <Card title="System prompt" href="/zh/concepts/system-prompt" icon="message-lines">
    系统提示词的构建方式及其每轮注入的内容。
  </Card>
  <Card title="Agent loop" href="/zh/concepts/agent-loop" icon="arrows-rotate">
    从接收到入站消息到最终回复的完整代理执行周期。
  </Card>
</CardGroup>
