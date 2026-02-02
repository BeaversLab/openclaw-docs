---
summary: "Context：模型看到的内容、构建方式与如何检查"
read_when:
  - 想理解 OpenClaw 中 “context” 的含义
  - 在排查模型为何“知道”某件事（或忘记了）
  - 想减少上下文开销（/context、/status、/compact）
title: "Context"
---
# 上下文（Context）

“Context” 是 **OpenClaw 在一次运行中发送给模型的全部内容**。它受模型 **上下文窗口**（token 限制）约束。

入门心智模型：
- **System prompt**（OpenClaw 构建）：规则、工具、技能列表、时间/运行信息、注入的 workspace 文件。
- **对话历史**：本会话中的你的消息 + assistant 的消息。
- **工具调用/结果 + 附件**：命令输出、文件读取、图片/音频等。

Context *不等同于* “memory”：memory 可以写入磁盘并在之后加载；context 则是模型当前窗口中的内容。

## 快速上手（检查 context）

- `/status` → 快速查看“窗口有多满” + 会话设置。
- `/context list` → 注入内容 + 粗略大小（逐文件 + 汇总）。
- `/context detail` → 更深拆解：逐文件、逐工具 schema、逐技能条目大小、system prompt 大小。
- `/usage tokens` → 为普通回复附加每条回复的用量页脚。
- `/compact` → 将旧历史压缩为摘要以释放窗口空间。

另见：[Slash commands](/zh/tools/slash-commands)、[Token use & costs](/zh/token-use)、[Compaction](/zh/concepts/compaction)。

## 示例输出

具体数值因模型、provider、工具策略与 workspace 内容而异。

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

## 什么会计入上下文窗口

模型接收的所有内容都会计入，包括：
- System prompt（所有部分）。
- 对话历史。
- 工具调用 + 工具结果。
- 附件/转录（图片/音频/文件）。
- Compaction 摘要与 pruning 产物。
- Provider 的“包装层”或隐藏头（不可见，但仍计入）。

## OpenClaw 如何构建 system prompt

System prompt 由 **OpenClaw** 构建并在每次运行重建。内容包含：
- 工具列表 + 简短描述。
- Skills 列表（仅元信息；见下）。
- Workspace 位置。
- 时间（UTC + 配置的用户时区）。
- 运行时元数据（host/OS/model/thinking）。
- 在 **Project Context** 中注入的 workspace bootstrap 文件。

完整拆解见：[System Prompt](/zh/concepts/system-prompt)。

## 注入的 workspace 文件（Project Context）

默认情况下，OpenClaw 会注入固定的一组 workspace 文件（若存在）：
- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md`（仅首次运行）

大文件会按 `agents.defaults.bootstrapMaxChars`（默认 `20000` 字符）逐文件截断。
`/context` 会显示 **raw vs injected** 的大小及是否发生截断。

## Skills：注入与按需加载

System prompt 中包含简洁的 **skills 列表**（名称 + 描述 + 位置）。这个列表有真实开销。

默认不会注入技能说明。模型只有在需要时才应 `read` 技能的 `SKILL.md`。

## Tools：两类成本

Tools 会以两种方式影响上下文：
1) System prompt 中的 **工具列表文本**（你看到的 “Tooling”）。
2) **Tool schemas**（JSON）。这些会发送给模型以便调用工具，尽管你看不到文本，但同样计入上下文。

`/context detail` 会拆解最大体量的 tool schema，便于识别主要占用。

## 命令、指令与“内联快捷方式”

Slash 命令由 Gateway 处理，存在几种行为：
- **独立命令**：仅包含 `/...` 的消息会作为命令执行。
- **指令**：`/think`、`/verbose`、`/reasoning`、`/elevated`、`/model`、`/queue` 会在模型看到消息前被剥离。
  - 仅指令的消息会持久化会话设置。
  - 普通消息中的内联指令作为每条消息的提示。
- **内联快捷方式**（仅 allowlisted 发送者）：普通消息中的某些 `/...` token 可以立即执行（例：“hey /status”），并在模型看到文本前被剥离。

详情见：[Slash commands](/zh/tools/slash-commands)。

## Sessions、compaction 与 pruning（哪些会持久化）

跨消息持久化取决于机制：
- **正常历史** 会保存在会话转录中，直到被 compaction/pruning 策略处理。
- **Compaction** 会把摘要持久化到转录中，并保留近期消息。
- **Pruning** 只从一次运行的 *内存提示* 中移除旧工具结果，不会改写转录。

文档： [Session](/zh/concepts/session)、[Compaction](/zh/concepts/compaction)、[Session pruning](/zh/concepts/session-pruning)。

## `/context` 实际报告什么

`/context` 优先使用最新 **run-built** system prompt 报告（若存在）：
- `System prompt (run)` = 从最近一次内嵌（可用工具）运行捕获并持久化在会话存储中。
- `System prompt (estimate)` = 当没有 run 报告时（或 CLI 后端不生成报告时）即时计算。

无论哪种方式，它只报告大小和主要贡献者；**不会**输出完整 system prompt 或 tool schemas。
