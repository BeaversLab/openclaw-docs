---
doc-schema-version: 1
summary: "TUI会话目标：持久的单次会话目标、/goal 控制、模型目标工具、token 预算和 TUI 状态"
read_when:
  - You want OpenClaw to keep one objective visible across a long session
  - You need to pause, resume, block, complete, or clear a session goal
  - You want to understand the get_goal, create_goal, and update_goal tools
  - You want to see how goals appear in the TUI
title: "Goal"
---

# Goal

A **goal** is one durable objective attached to the current OpenClaw 会话.
It gives the agent and the operator a shared target for long-running work,
without turning that target into a background task, reminder, cron job, or
standing order.

Goals are 会话 state. They move with the 会话 key, survive process
restarts, show up in `/goal`TUI, are available to the 模型 through the goal
tools, and appear in the TUI footer when the active 会话 has one.

## 快速开始

Set a goal:

```text
/goal start get CI green for PR 87469 and push the fix
```

Check it:

```text
/goal
```

Pause it when work is intentionally waiting:

```text
/goal pause waiting for CI
```

Resume it:

```text
/goal resume
```

Mark it complete:

```text
/goal complete pushed and verified
```

Clear it:

```text
/goal clear
```

## What goals are for

Use a goal when a 会话 has a concrete outcome that should remain visible
across many turns:

- A PR closeout: fix, verify, autoreview, push, and open or update the PR.
- A debug run: reproduce the bug, identify the owning surface, patch, and prove
  the fix.
- A docs pass: read the relevant docs, write the new page, cross-link it, and
  verify the docs build.
- A maintenance task: inspect current state, make bounded changes, run the right
  checks, and report what changed.

A goal is not a task queue. Use [Task Flow](/zh/automation/taskflow),
[tasks](/zh/automation/tasks), [cron jobs](/zh/automation/cron-jobs), or
[standing orders](/zh/automation/standing-orders) when work should run detached,
repeat on a schedule, fan out into managed sub-work, or persist as a policy.

## Command reference

`/goal` without arguments prints the current goal summary:

```text
Goal
Status: active
Objective: get CI green for PR 87469 and push the fix
Tokens used: 12k
Token budget: 12k/50k

Commands: /goal pause, /goal complete, /goal clear
```

Commands:

- `/goal` or `/goal status` shows the current goal.
- `/goal start <objective>` creates a new goal for the current 会话.
- `/goal set <objective>` and `/goal create <objective>` are aliases for
  `start`.
- `/goal pause [note]` pauses an active goal.
- `/goal resume [note]` 恢复已暂停、受阻、受使用限制或受预算限制的目标。
- `/goal complete [note]` 标记目标已达成。
- `/goal done [note]` 是 `complete` 的别名。
- `/goal block [note]` 标记目标受阻。
- `/goal blocked [note]` 是 `block` 的别名。
- `/goal clear` 从会话中移除目标。

一次只能存在一个目标。在清除当前目标之前，启动第二个目标会失败。

## 状态

目标使用一组小型的状态集：

- `active`：会话正在追求该目标。
- `paused`：操作员暂停了该目标；`/goal resume` 使其再次变为活动状态。
- `blocked`：代理或操作员报告了真正的阻碍因素；当有新信息或状态可用时，`/goal resume`
  使其再次变为活动状态。
- `budget_limited`：已达到配置的 token 预算；`/goal resume`
  从同一目标重新开始追求。
- `usage_limited`：保留给使用限制停止状态；`/goal resume`
  在允许时重新开始追求。
- `complete`：目标已达成。已完成的目标是终端状态；在启动另一个目标之前，请使用
  `/goal clear`。

`/new` 和 `/reset` 会清除当前会话目标，因为它们有意
启动新的会话上下文。

## Token 预算

目标可以有一个可选的正向 token 预算。预算随目标存储，并根据创建时会话的新鲜 token 计数进行度量。如果在目标启动时当前会话只有过时或未知的 token 使用情况，OpenClaw 会等待下一个新鲜会话 token 快照并将其用作基线，因此目标存在之前花费的 token 不会计入该目标。

当 token 使用量达到预算时，目标将变为 `budget_limited`。这
不会删除目标或擦除目标。它告诉操作员和
代理，该目标在被恢复或
清除之前不再被积极追求。

Token budgets 是一个会话目标的防护栏，而不是计费上限。提供商配额、成本报告和上下文窗口行为仍然使用正常的 OpenClaw 使用情况和模型控制。

## 模型工具

OpenClaw 向 agent harness 暴露了三个核心的目标工具：

- `get_goal`：读取当前会话目标，包括状态、目标、token 使用情况和 token 预算。
- `create_goal`：仅当用户、系统或开发者指令明确请求时才创建目标。如果会话已有目标，则会失败。
- `update_goal`：将目标标记为 `complete` 或 `blocked`。

模型不能静默暂停、恢复、清除或替换目标。这些是通过 `/goal` 和重置命令进行的操作员/会话控制。这可以防止 agent 悄悄移动目标，同时为 agent 报告成就或真正的阻碍保留清晰的路径。

`update_goal` 工具应仅在目标实际达成时将其标记为 `complete`。它应仅在相同的阻塞条件重复出现且 agent 在没有新的用户输入或外部状态变化的情况下无法取得有意义的进展时，才将目标标记为 `blocked`。

## TUI

TUI 在页脚中保持活动会话的目标可见，显示在 agent、会话、模型、运行控制和 token 计数旁边。

页脚示例：

- `Pursuing goal (12k/50k)` 用于具有 token 预算的活动目标。
- `Goal paused (/goal resume)` 用于已暂停的目标。
- `Goal blocked (/goal resume)` 用于已阻塞的目标。
- `Goal hit usage limits (/goal resume)` 用于受使用限制的目标。
- `Goal unmet (50k/50k)` 用于受预算限制的目标。
- `Goal achieved (42k)` 用于已完成的目标。

页脚特意设计得紧凑。请使用 `/goal` 查看完整的目标、说明、token 预算和可用命令。

## Channel behavior

`/goal` 命令在支持命令的 OpenClaw 会话中有效，包括允许文本命令的 TUI 和聊天界面。Goal 状态与会话密钥绑定，而非传输方式。如果两个界面使用同一个会话，它们将看到同一个目标。

Goal 状态并非交付指令。它不会强制通过渠道回复、改变队列行为、批准工具或安排工作。

## 故障排查

`Goal error: goal already exists` 表示会话已有目标。使用 `/goal` 查看它，若已完成则使用 `/goal complete`，或在开始另一个目标前使用 `/goal clear`。

`Goal error: goal not found` 表示会话尚无目标。使用 `/goal start <objective>` 启动一个。

`Goal error: goal is already complete` 表示目标已终止。在开始或恢复另一个目标之前清除它。

如果 token 使用量看起来像 `0` 或陈旧，活动会话可能还没有新的 token 快照。随着 OpenClaw 记录会话使用情况和基于记录总数的衍生，使用情况会刷新。

## 相关内容

- [斜杠命令](/zh/tools/slash-commands)
- [TUI](/zh/web/tui)
- [Session 工具](/zh/concepts/session-tool)
- [压缩](/zh/concepts/compaction)
- [任务流程](/zh/automation/taskflow)
- [常驻命令](/zh/automation/standing-orders)
