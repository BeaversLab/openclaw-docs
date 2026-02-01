---
summary: "Context：模型看到什么、如何构建以及如何查看"
read_when:
  - 想了解 OpenClaw 中“context”的含义
  - 正在调试模型为何“知道”某事（或忘记了）
  - 想降低上下文开销（/context、/status、/compact）
---
# Context

“Context”是**OpenClaw 在一次运行中发送给模型的所有内容**。它受模型的**上下文窗口**（token 限制）约束。

初学者心智模型：
- **System prompt**（OpenClaw 构建）：规则、工具、skills 列表、时间/运行时信息、以及注入的工作区文件。
- **对话历史**：本会话中的用户消息 + assistant 消息。
- **工具调用/结果 + 附件**：命令输出、文件读取、图片/音频等。

Context *不是* “memory”：memory 可存盘并在之后加载；context 是当前模型窗口内的内容。

## 快速开始（查看 context）

- `/status` → 快速查看“窗口占用情况” + 会话设置。
- `/context list` → 注入内容 + 粗略大小（按文件 + 总计）。
- `/context detail` → 更深入的拆解：按文件、按工具 schema 大小、按 skill 条目大小，以及 system prompt 大小。
- `/usage tokens` → 在正常回复末尾附加每次回复的用量。
- `/compact` → 将旧历史总结为精简条目以释放窗口空间。

另见：[Slash commands](/zh/tools/slash-commands)、[Token use & costs](/zh/token-use)、[Compaction](/zh/concepts/compaction)。

## 示例输出

数值会随模型、provider、工具策略及工作区内容而变化。

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

模型收到的一切都会计入，包括：
- System prompt（全部部分）。
- 对话历史。
- 工具调用 + 工具结果。
- 附件/转录（图片/音频/文件）。
- 压缩摘要与 pruning 产物。
- provider “wrapper” 或隐藏头（不可见，但仍计入）。

## OpenClaw 如何构建 system prompt

System prompt 由 **OpenClaw** 控制，并在每次运行时重建。其包含：
- 工具列表 + 简短描述。
- Skills 列表（仅元数据；见下）。
- 工作区位置。
- 时间（UTC + 若配置了则转换为用户时间）。
- 运行时元数据（host/OS/model/thinking）。
- **Project Context** 中注入的工作区引导文件。

完整拆解：[System Prompt](/zh/concepts/system-prompt)。

## 注入的工作区文件（Project Context）

默认情况下，OpenClaw 会注入固定的一组工作区文件（如存在）：
- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md`（仅首次运行）

大型文件按文件使用 `agents.defaults.bootstrapMaxChars` 进行截断（默认 `20000` 字符）。`/context` 会显示**原始 vs 注入**大小以及是否发生截断。

## Skills：注入与按需加载

System prompt 包含精简的 **skills 列表**（名称 + 描述 + 位置）。该列表有实际开销。

Skill 指令默认*不会*注入。模型应**仅在需要时** `read` skill 的 `SKILL.md`。

## Tools：两种成本

工具在上下文中有两种成本：
1) System prompt 中的**工具列表文本**（你在 “Tooling” 中看到的内容）。
2) **工具 schemas**（JSON）。这些会发送给模型以便调用工具，即使不可见，也计入上下文。

`/context detail` 会拆解最大的一些工具 schema，便于找出主要占用。

## Commands、directives 与“内联快捷方式”

Slash commands 由 Gateway 处理。行为分为：
- **独立命令**：消息仅包含 `/...` 时作为命令运行。
- **Directives**：`/think`、`/verbose`、`/reasoning`、`/elevated`、`/model`、`/queue` 会在模型看到消息前被剥离。
  - 仅 directive 的消息会持久化会话设置。
  - 普通消息中的内联 directive 作为逐消息提示。
- **内联快捷方式**（仅 allowlist 发送者）：在普通消息中的某些 `/...` token 可立即执行（例如：“hey /status”），并在模型看到文本前被剥离。

细节：[Slash commands](/zh/tools/slash-commands)。

## 会话、压缩与 pruning（持久化范围）

跨消息持久化取决于机制：
- **普通历史**会在会话转录中保留，直到按策略压缩/修剪。
- **压缩**会将摘要写入转录并保留近期消息。
- **Pruning** 会从单次运行的*内存中*提示中移除旧工具结果，但不会重写转录。

文档：[Session](/zh/concepts/session)、[Compaction](/zh/concepts/compaction)、[Session pruning](/zh/concepts/session-pruning)。

## `/context` 实际报告什么

`/context` 在可用时优先使用最新的**运行构建** system prompt 报告：
- `System prompt (run)` = 从上一轮内嵌（可调用工具）运行中捕获并持久化到会话存储的报告。
- `System prompt (estimate)` = 没有运行报告时（或通过不生成该报告的 CLI backend 运行时）动态计算。

无论哪种，都只报告大小与主要贡献者；**不会**输出完整 system prompt 或工具 schemas。
