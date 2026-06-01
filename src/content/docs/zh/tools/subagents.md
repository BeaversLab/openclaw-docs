---
summary: "生成独立的后台代理运行，将结果宣布回请求聊天"
read_when:
  - You want background or parallel work via the agent
  - You are changing sessions_spawn or sub-agent tool policy
  - You are implementing or troubleshooting thread-bound subagent sessions
title: "子代理"
sidebarTitle: "子代理"
---

子代理是从现有代理运行中生成的后台代理运行。
它们在自己的会话 (`agent:<agentId>:subagent:<uuid>`) 中运行，并在完成后将其结果**公布**
回请求者聊天渠道。每个子代理运行都被跟踪为
[后台任务](/zh/automation/tasks)。

主要目标：

- 在不阻塞主运行的情况下，并行化“研究 / 长任务 / 慢工具”工作。
- 默认保持子代理隔离（会话分离 + 可选的沙箱隔离）。
- 保持工具接口难以滥用：子代理默认**不**获取会话工具。
- 支持可配置的嵌套深度，用于编排器模式。

<Note>
  **成本说明：** 默认情况下，每个子代理都有自己的上下文和令牌使用量。 对于繁重或重复性任务，请为子代理设置更便宜的模型， 并将主代理保持在更高质量的模型上。通过 `agents.defaults.subagents.model` 或每个代理的覆盖配置进行配置。当子代理 真正需要请求者的当前记录时，代理可以在该生成中请求 `context: "fork"`。线程绑定子代理会话默认为 `context: "fork"`，因为它们将当前对话分支到了一个 后续线程中。
</Note>

## 斜杠命令

使用 `/subagents` 检查**当前会话**的子代理运行：

```text
/subagents list
/subagents log <id|#> [limit] [tools]
/subagents info <id|#>
```

`/subagents info` 显示运行元数据（状态、时间戳、会话 ID、
记录路径、清理）。使用 `sessions_history` 获取受限的、
经过安全过滤的记录视图；当您需要原始完整记录时，请检查磁盘上的记录路径。

### 线程绑定控制

这些命令适用于支持持久线程绑定的渠道。
请参阅下方的[支持线程的渠道](#thread-supporting-channels)。

```text
/focus <subagent-label|session-key|session-id|session-label>
/unfocus
/agents
/session idle <duration|off>
/session max-age <duration|off>
```

### 生成行为

代理使用 `sessions_spawn` 启动后台子代理。子代理完成
作为内部父会话事件返回；父/请求者代理决定
是否需要面向用户的更新。

<AccordionGroup>
  <Accordion title="非阻塞、基于推送的完成">
    - `sessions_spawn` 是非阻塞的；它立即返回一个运行 ID。
    - 完成后，子代理会向父代理/请求者会话报告。
    - 需要子结果的代理回合应在生成所需工作后调用 `sessions_yield`。这将结束当前回合，并允许完成事件作为下一条模型可见消息到达。
    - 完成是基于推送的。一旦生成，**切勿**在循环中轮询 `/subagents list`、`sessions_list` 或 `sessions_history` 仅为了等待其完成；仅应按需检查状态以进行调试可见性。
    - 子输出是供请求者代理综合的报告/证据。它不是用户编写的指令文本，也不能覆盖系统、开发者或用户策略。
    - 完成后，在公告清理流程继续之前，OpenClaw 会尽力关闭由该子代理会话打开的受跟踪浏览器标签页/进程。

  </Accordion>
  <Accordion title="Completion delivery">
    - OpenClaw 通过一个带有稳定幂等键的 `agent` 轮次将完成内容交还给请求者会话。
    - 如果请求者运行仍处于活动状态，OpenClaw 会首先尝试唤醒/引导该运行，而不是启动第二条可见的回复路径。
    - 如果无法唤醒活动的请求者，OpenClaw 将回退到具有相同完成上下文的请求者代理交接，而不是放弃宣告。
    - 成功的父交接会完成子代理的交付，即使父代理决定不需要可见的用户更新。
    - 原生子代理不会获得消息工具。它们向父代理/请求者代理返回纯助手文本；人类可见的回复由父代理/请求者代理的正常交付策略拥有。
    - 如果无法使用直接交接，则回退到队列路由。
    - 如果队列路由仍然不可用，则在最终放弃之前，以短指数退避重试宣告。
    - 完成交付保留已解析的请求者路由：线程绑定或对话绑定的完成路由在可用时优先；如果完成源仅提供渠道，OpenClaw 会从请求者会话的已解析路由（`lastChannel` / `lastTo` / `lastAccountId`）中填充缺失的目标/账户，以便直接交付仍然有效。

  </Accordion>
  <Accordion title="Completion handoff metadata">
    完成交接给请求者会话是运行时生成的
    内部上下文（非用户编写的文本），包括：

    - `Result` — 来自子级的最新可见 `assistant` 回复文本。工具/工具结果输出不会被提升到子级结果中。终端失败的运行不会重用捕获的回复文本。
    - `Status` — `completed; ready for parent review` / `failed` / `timed out` / `unknown`。
    - 紧凑的运行时/Token 统计信息。
    - 一条审查指令，指示请求者代理在确定原始任务是否完成之前验证结果。
    - 后续指导，告诉请求者代理在子级结果留下更多操作时继续任务或记录后续步骤。
    - 针对无更多操作路径的最终更新指令，以普通助手语气编写，不转发原始内部元数据。

  </Accordion>
  <Accordion title="Modes and ACP runtime">
    - `--model` 和 `--thinking` 会覆盖该特定运行的默认值。
    - 使用 `info`/`log` 在完成后检查详细信息和输出。
    - 对于持久化的线程绑定会话，请使用带有 `thread: true` 和 `mode: "session"` 的 `sessions_spawn`。
    - 如果请求渠道不支持线程绑定，请使用 `mode: "run"`CLI，而不是重试无法实现的线程绑定组合。
    - 对于 ACP 约束会话（Claude Code、Gemini CLI、OpenCode 或显式的 Codex ACP/acpx），当工具声明支持该运行时时，请使用带有 `runtime: "acp"` 的 `sessions_spawn`。调试补全或代理到代理循环时，请参阅 [ACP delivery 模型](/zh/tools/acp-agents#delivery-model)。当启用 `codex` 插件时，除非用户明确要求 ACP/acpx，否则 Codex 聊天/线程控制应优先选择 `/codex ...`OpenClaw 而非 ACP。
    - 在启用 ACP、请求者未处于沙箱隔离状态且加载了后端插件（如 `acpx`）之前，OpenClaw 会隐藏 `runtime: "acp"`。`runtime: "acp"` 期望一个外部 ACP 约束 ID，或一个带有 `runtime.type="acp"`OpenClaw 的 `agents.list[]` 条目；对于来自 `agents_list` 的普通 OpenClaw 配置代理，请使用默认的子代理运行时。

  </Accordion>
</AccordionGroup>

## 上下文模式

原生子代理启动时是隔离的，除非调用者明确要求分叉当前记录。

| 模式       | 何时使用                                                               | 行为                                                                  |
| ---------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `isolated` | 新的研究、独立实现、慢速工具工作，或可以在任务文本中简要说明的任何内容 | 创建一个干净的子记录。这是默认设置，并且可以保持较低的 Token 使用量。 |
| `fork`     | 依赖于当前对话、先前工具结果或请求者记录中已存在的细微指令的工作       | 在子进程开始之前，将请求者记录分支到子会话中。                        |

请谨慎使用 `fork`。它适用于上下文相关的委派，而非编写清晰任务提示的替代方案。

## 工具：`sessions_spawn`

使用 `deliver: false` 在全局 `subagent` 通道上启动子代理运行，然后运行一个公告步骤并将公告回复发布到请求者聊天渠道。

可用性取决于调用者的有效工具策略。`coding` 和
`full` 配置文件默认暴露 `sessions_spawn`。`messaging` 配置文件
则不然；对于应该委派工作的代理，请添加 `tools.alsoAllow: ["sessions_spawn", "sessions_yield",
"subagents"]` or use `tools.profile: "coding"`。频道/组、提供商、沙箱以及每个代理的允许/拒绝策略
仍可在配置文件阶段之后移除该工具。使用同一 `/tools` 中的
以确认有效工具列表。

**默认值：**

- **模型：** 继承调用者的设置，除非您设置了 `agents.defaults.subagents.model`（或每个代理的 `agents.list[].subagents.model`）；显式的 `sessions_spawn.model` 仍然优先。
- **思考：** 继承调用者的设置，除非您设置了 `agents.defaults.subagents.thinking`（或每个代理的 `agents.list[].subagents.thinking`）；显式的 `sessions_spawn.thinking` 仍然优先。
- **运行超时：** 如果省略 `sessions_spawn.runTimeoutSeconds`，OpenClaw 在设置时使用 `agents.defaults.subagents.runTimeoutSeconds`；否则回退到 `0`（无超时）。
- **任务交付：** 原生子代理在其第一个可见的 `[Subagent Task]` 消息中接收委派的任务。子代理系统提示包含运行时规则和路由上下文，而不是任务的隐藏副本。

### 委派提示模式

`agents.defaults.subagents.delegationMode` 仅控制提示指导；它不会更改工具策略或强制委派。

- `suggest`（默认）：保留标准提示，以使用子代理处理较大或较慢的工作。
- `prefer`：告知主代理保持响应，并将比直接回复更复杂的任何内容通过 `sessions_spawn` 进行委派。

每个代理的覆盖使用 `agents.list[].subagents.delegationMode`。

```json5
{
  agents: {
    defaults: {
      subagents: {
        delegationMode: "prefer",
        maxConcurrent: 4,
      },
    },
    list: [
      {
        id: "coordinator",
        subagents: { delegationMode: "prefer" },
      },
    ],
  },
}
```

### 工具参数

<ParamField path="task" type="string" required>
  子代理的任务描述。
</ParamField>
<ParamField path="taskName" type="string">
  可选的稳定句柄，用于在后续状态输出中识别特定的子项。必须匹配 `[a-z][a-z0-9_-]{0,63}` 且不能是保留目标（如 `last` 或 `all`）。
</ParamField>
<ParamField path="label" type="string">
  可选的人类可读标签。
</ParamField>
<ParamField path="agentId" type="string">
  当 `subagents.allowAgents` 允许时，在另一个已配置的代理 ID 下生成。
</ParamField>
<ParamField path="cwd" type="string">
  子运行的可选任务工作目录。原生子代理仍从目标代理工作区加载引导文件；`cwd` 仅更改运行时工具和 CLI 框架执行委派工作的位置。
</ParamField>
<ParamField path="runtime" type='"subagent" | "acp"' default="subagent">
  `acp` 仅适用于外部 ACP 框架（`claude`、`droid`、`gemini`、`opencode` 或显式请求的 Codex ACP/acpx）以及 `runtime.type` 为 `acp` 的 `agents.list[]` 条目。
</ParamField>
<ParamField path="resumeSessionId" type="string">
  仅限 ACP。当 `runtime: "acp"` 时恢复现有的 ACP 框架会话；对于原生子代理生成将被忽略。
</ParamField>
<ParamField path="streamTo" type='"parent"'>
  仅限 ACP。当 `runtime: "acp"` 时将 ACP 运行输出流式传输到父会话；对于原生子代理生成请省略。
</ParamField>
<ParamField path="model" type="string">
  覆盖子代理模型。无效值将被跳过，子代理将在默认模型上运行，并在工具结果中显示警告。
</ParamField>
<ParamField path="thinking" type="string">
  覆盖子代理运行的思考级别。
</ParamField>
<ParamField path="runTimeoutSeconds" type="number">
  设置时默认为 `agents.defaults.subagents.runTimeoutSeconds`，否则为 `0`。设置后，子代理运行将在 N 秒后中止。
</ParamField>
<ParamField path="thread" type="boolean" default="false">
  当 `true` 时，请求为此子代理会话绑定渠道线程。
</ParamField>
<ParamField path="mode" type='"run" | "session"' default="run">
  如果省略 `thread: true` 和 `mode`，默认值变为 `session`。`mode: "session"` 需要 `thread: true`。
  如果请求渠道的线程绑定不可用，请改用 `mode: "run"`。
</ParamField>
<ParamField path="cleanup" type='"delete" | "keep"' default="keep">
  `"delete"` 在公告后立即归档（仍通过重命名保留记录）。
</ParamField>
<ParamField path="sandbox" type='"inherit" | "require"' default="inherit">
  除非目标子运行时是沙箱隔离的，否则 `require` 将拒绝生成。
</ParamField>
<ParamField path="context" type='"isolated" | "fork"' default="isolated">
  `fork` 将请求者的当前记录分支到子会话中。仅限原生子代理。线程绑定的生成默认为 `fork`；非线程生成默认为 `isolated`。
</ParamField>

<Warning>`sessions_spawn` **不**接受渠道传递参数（`target`、 `channel`、`to`、`threadId`、`replyTo`、`transport`）。原生子代理将其 最新的助手轮次汇报给请求者；外部传递保留在父代理/请求者代理处。</Warning>

### 任务名称和定位

`taskName` 是一个面向模型的编排句柄，而非会话密钥。
将其用于稳定的子级名称，例如 `review_subagents`、
`linux_validation` 或 `docs_update`，以便协调器稍后可能需要检查该子级。

目标解析接受精确的 `taskName` 匹配和无歧义的前缀。匹配范围与编号 `/subagents` 目标使用的相同活动/近期目标窗口一致，因此过期的已完成子任务不会导致重用的句柄产生歧义。如果两个活动或近期的子任务共享相同的 `taskName`，则目标具有歧义；请改用列表索引、会话密钥或运行 ID。

保留的目标 `last` 和 `all` 不是有效的 `taskName` 值，因为它们已经具有控制含义。

## 工具：`sessions_yield`

结束当前的模型轮次并等待运行时事件（主要是
子代理完成事件）作为下一条消息到达。在
生成所需的子任务工作后使用此工具，当请求方在这些完成事件到达之前
无法生成最终答案时。

`sessions_yield` 是等待原语。不要用 `subagents`、`sessions_list`、`sessions_history`、shell
`sleep` 或进程轮询的循环来替换它，仅为了检测子进程的完成。

仅当会话的有效工具列表包含 `sessions_yield` 时才使用它。某些最小化或自定义工具配置文件可能会公开 `sessions_spawn` 和 `subagents`，但不公开 `sessions_yield`；在这种情况下，不要为了等待完成而编造轮询循环。

当存在活跃的子会话时，OpenClaw 会向普通轮次中注入一个紧凑的运行时生成的 OpenClaw`Active Subagents` 提示块，以便请求者无需轮询即可查看当前的子会话、运行 ID、状态、标签、任务和 `taskName` 别名。该块中的任务和标签字段作为数据引用，而非指令，因为它们可能源自用户/模型提供的生成参数。

## 工具：`subagents`

列出请求者会话拥有的已生成子代理运行。其范围限定于
当前请求者；子项只能看到其自己控制的子项。

使用 `subagents` 进行按需状态检查和调试。使用 `sessions_yield` 等待完成事件。

## 线程绑定会话

当为渠道启用线程绑定时，子代理可以保持绑定到某个线程，以便该线程中的后续用户消息继续路由到同一个子代理会话。

### 支持线程的渠道

**Discord** 是目前唯一支持的渠道。它支持持久化的线程绑定子代理会话（`sessions_spawn` 搭配 `thread: true`）、手动线程控制（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`）以及适配器密钥 `channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours` 和 `channels.discord.threadBindings.spawnSessions`。

### 快速流程

<Steps>
  <Step title="生成">使用 `thread: true` 调用 `sessions_spawn`（并可选地使用 `mode: "session"`）。</Step>
  <Step title="绑定">OpenClaw 在活跃渠道中创建或绑定一个线程到该会话目标。</Step>
  <Step title="路由后续消息">该线程中的回复和后续消息将路由到绑定的会话。</Step>
  <Step title="检查超时">使用 `/session idle` 检查/更新不活动的自动取消聚焦，并 使用 `/session max-age` 来控制硬上限。</Step>
  <Step title="分离">使用 `/unfocus` 手动分离。</Step>
</Steps>

### 手动控制

| 命令               | 效果                                                 |
| ------------------ | ---------------------------------------------------- |
| `/focus <target>`  | 将当前线程（或创建一个）绑定到子代理/会话目标        |
| `/unfocus`         | 移除当前绑定线程的绑定                               |
| `/agents`          | 列出活动运行和绑定状态（`thread:<id>` 或 `unbound`） |
| `/session idle`    | 检查/更新空闲自动取消聚焦（仅限已聚焦的绑定线程）    |
| `/session max-age` | 检查/更新硬性上限（仅限已聚焦的绑定线程）            |

### 配置开关

- **全局默认值：** `session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`。
- **渠道覆盖和生成自动绑定密钥**因适配器而异。请参阅上方的 [支持线程的渠道](#thread-supporting-channels)。

有关当前适配器的详细信息，请参阅 [配置参考](/zh/gateway/configuration-reference) 和
[斜杠命令](/zh/tools/slash-commands)。

### 允许列表

<ParamField path="agents.list[].subagents.allowAgents" type="string[]">
  可通过显式 `agentId` 定位的已配置代理 ID 列表（`["*"]` 允许任何已配置的目标）。默认值：仅请求者代理。如果您设置了一个列表并且仍希望请求者通过 `agentId` 生成自身，请在列表中包含请求者 ID。
</ParamField>
<ParamField path="agents.defaults.subagents.allowAgents" type="string[]">
  当请求者代理未设置其自己的 `subagents.allowAgents` 时使用的默认已配置目标代理允许列表。
</ParamField>
<ParamField path="agents.defaults.subagents.requireAgentId" type="boolean" default="false">
  阻止省略 `agentId` 的 `sessions_spawn` 调用（强制显式配置文件选择）。每代理覆盖：`agents.list[].subagents.requireAgentId`。
</ParamField>
<ParamField path="agents.defaults.subagents.announceTimeoutMs" type="number" default="120000">
  网关 `agent` 公告传递尝试的每次调用超时。值为正整数毫秒，并被钳制到平台安全的计时器最大值。瞬态重试可能会使总公告等待时间超过一个配置的超时。
</ParamField>

如果请求者会话是沙箱隔离的，`sessions_spawn` 将拒绝以非沙箱隔离方式运行的目标。

### 设备发现

使用 `agents_list` 查看当前允许用于 `sessions_spawn`OpenClaw 的代理 ID。响应包括每个列出的代理的有效模型和嵌入式运行时元数据，以便调用者可以区分 OpenClaw、Codex 应用服务器和其他配置的原生运行时。

`allowAgents` 条目必须指向 `agents.list[]` 中已配置的代理 ID。`["*"]` 意味着任何已配置的目标代理加上请求者。如果代理配置被删除但其 ID 仍保留在 `allowAgents` 中，`sessions_spawn` 将拒绝该 ID，并且 `agents_list` 将省略它。运行 `openclaw doctor --fix` 以清除过时的允许列表条目，或者当目标应在继承默认值的同时保持可生成时，添加一个最小的 `agents.list[]` 条目。

### 自动归档

- 子代理会话在 `agents.defaults.subagents.archiveAfterMinutes` 后自动归档（默认 `60`）。
- 归档使用 `sessions.delete` 并将文字记录重命名为 `*.deleted.<timestamp>`（同一文件夹）。
- `cleanup: "delete"` 在宣布后立即归档（仍通过重命名保留文字记录）。
- 自动归档是尽力而为的；如果网关重启，待处理的计时器将丢失。
- `runTimeoutSeconds` **不会**自动归档；它仅停止运行。该会话将保留直到自动归档。
- 自动归档同等地应用于深度 1 和深度 2 的会话。
- 浏览器清理与归档清理是分开的：当运行结束时，被追踪的浏览器标签页/进程会被尽力关闭，即使对话记录/会话记录被保留。

## 嵌套子代理

默认情况下，子代理无法生成其自己的子代理
(`maxSpawnDepth: 1`)。设置 `maxSpawnDepth: 2` 以启用一级
嵌套 —— 即 **编排器模式 (orchestrator pattern)**：主 → 编排器子代理 →
工作器子子代理。

```json5
{
  agents: {
    defaults: {
      subagents: {
        maxSpawnDepth: 2, // allow sub-agents to spawn children (default: 1)
        maxChildrenPerAgent: 5, // max active children per agent session (default: 5)
        maxConcurrent: 8, // global concurrency lane cap (default: 8)
        runTimeoutSeconds: 900, // default timeout for sessions_spawn when omitted (0 = no timeout)
        announceTimeoutMs: 120000, // per-call gateway announce timeout
      },
    },
  },
}
```

### 深度级别

| 深度 | 会话键形状                                   | 角色                              | 能否生成？                |
| ---- | -------------------------------------------- | --------------------------------- | ------------------------- |
| 0    | `agent:<id>:main`                            | 主代理                            | 总是                      |
| 1    | `agent:<id>:subagent:<uuid>`                 | 子代理（当允许深度 2 时为编排器） | 仅当 `maxSpawnDepth >= 2` |
| 2    | `agent:<id>:subagent:<uuid>:subagent:<uuid>` | 子子代理（叶子节点工作者）        | 从不                      |

### 通告链

结果沿链向上回流：

1. 深度 2 工作者完成 → 向其父级（深度 1 编排器）通告。
2. 深度 1 编排器接收通告，综合结果，完成 → 向主代理通告。
3. 主代理接收通告并交付给用户。

每一层只能看到其直接子级的通告。

<Note>
  **操作指南：** 启动子工作一次并等待完成 事件，而不是围绕 `sessions_list`、 `sessions_history`、`/subagents list` 或 `exec` sleep 命令构建轮询循环。 `sessions_list` 和 `/subagents list` 使子会话关系 专注于实时工作 —— 实时子级保持附加，已结束的子级在 短暂的近期窗口内保持可见，过时的仅存储子级链接 在其新鲜度窗口后被忽略。这可以防止旧的 `spawnedBy` / `parentSessionKey`
  元数据在重启后复活幽灵子级。如果子完成事件在您已发送 最终答案后到达，正确的后续操作是精确的静默令牌 `NO_REPLY` / `no_reply`。
</Note>

### 按深度的工具策略

- 角色和控制范围在生成时被写入会话元数据。这可以防止扁平化或恢复的会话密钥意外重新获得编排器权限。
- **深度 1（编排器，当 `maxSpawnDepth >= 2` 时）：** 获得 `sessions_spawn`、`subagents`、`sessions_list`、`sessions_history`，以便它可以生成子级并检查其状态。其他会话/系统工具仍然被拒绝。
- **深度 1（叶子节点，当 `maxSpawnDepth == 1` 时）：** 没有会话工具（当前默认行为）。
- **深度 2（叶节点工作器）：** 无会话工具 —— `sessions_spawn` 在深度 2 时始终被拒绝。无法生成更多子级。

### 每个代理的生成限制

每个代理会话（任意深度）一次最多可以有 `maxChildrenPerAgent`
（默认 `5`）个活跃子级。这可以防止单个编排器出现失控的扇出。

### 级联停止

停止深度 1 的编排器会自动停止其所有深度 2
子级：

- 主聊天中的 `/stop` 会停止所有深度 1 的代理，并级联至其深度 2 的子级。

## 身份验证

子代理身份验证由 **代理 ID** 解析，而不是由会话类型解析：

- 子代理会话密钥是 `agent:<agentId>:subagent:<uuid>`。
- 认证存储是从该代理的 `agentDir` 加载的。
- 主代理的身份验证配置文件作为 **回退** 合并进来；发生冲突时，代理配置文件会覆盖主配置文件。

该合并是累加的，因此主配置文件始终可用作回退。尚不支持每个代理完全隔离的身份验证。

## 公告

子代理通过 announce（公告）步骤进行回复：

- Announce 步骤在子代理会话（而非请求者会话）内部运行。
- 如果子代理回复完全是 `ANNOUNCE_SKIP`，则不会发布任何内容。
- 如果最新的助手文本完全是静默令牌 `NO_REPLY` / `no_reply`，即使之前存在可见进度，也会抑制公告输出。

传递方式取决于请求者深度：

- 顶层请求者会话使用带有外部投递（`deliver=true`）的后续 `agent` 调用。
- 嵌套的请求者子代理会话接收内部后续注入（`deliver=false`），以便编排器可以在会话内合成子级结果。
- 如果嵌套请求者子代理会话已消失，OpenClaw 将在可用时回退到该会话的请求者。

对于顶级请求者会话，完成模式的直接传递首先解析任何绑定的会话/线程路由和钩子覆盖，然后从请求者会话的存储路由中填充缺失的渠道目标字段。即使完成来源仅标识了渠道，这也能确保完成内容位于正确的聊天/主题上。

在构建嵌套完成结果时，子完成聚合范围限定为当前请求者运行，以防止过时的先前运行的子输出泄漏到当前的公告中。如果渠道适配器支持，公告回复将保留线程/主题路由。

### Announce 上下文

Announce 上下文被规范化为一个稳定的内部事件块：

| 字段     | 来源                                                                                   |
| -------- | -------------------------------------------------------------------------------------- |
| 来源     | `subagent` 或 `cron`                                                                   |
| 会话 ID  | 子会话键/ID                                                                            |
| 类型     | 公告类型 + 任务标签                                                                    |
| 状态     | 派生自运行时结果（`success`、`error`、`timeout` 或 `unknown`）—— **不** 从模型文本推断 |
| 结果内容 | 来自子级的最新可见助手文本                                                             |
| 后续     | 描述何时回复与保持静默的指令                                                           |

最终失败的运行报告失败状态，而不重播捕获的回复文本。Tool/toolResult 输出不会被提升到子结果文本中。

### 统计行

公告负载在末尾包含一个统计行（即使被换行）：

- 运行时（例如 `runtime 5m12s`）。
- Token 使用量（输入/输出/总计）。
- 配置模型定价时的估算成本（`models.providers.*.models[].cost`）。
- `sessionKey`、`sessionId` 和脚本路径，以便主代理可以通过 `sessions_history` 获取历史记录或在磁盘上检查文件。

内部元数据仅用于编排；面向用户的回复应使用正常的助手语气重写。

### 为什么首选 `sessions_history`

`sessions_history` 是更安全的编排路径：

- 助手召回首先会被规范化：去除思考标签；去除 `<relevant-memories>` / `<relevant_memories>` 脚手架；去除纯文本工具调用 XML 负载块（`<tool_call>`、`<function_call>`、`<tool_calls>`、`<function_calls>`），包括从未正常关闭的截断负载；去除降级的工具调用/结果脚手架和历史上下文标记；去除泄漏的模型控制令牌（`<|assistant|>`、其他 ASCII `<|...|>`、全角 `<｜...｜>`MiniMax）；去除格式错误的 MiniMax 工具调用 XML。
- 凭证/令牌类的文本会被编辑。
- 长块可能会被截断。
- 非常大的历史记录可能会丢弃旧行，或者用 `[sessions_history omitted: message too large]` 替换过大的行。
- 当您需要逐字节完整记录时，原始磁盘记录检查是后备方案。

## 工具策略

子代理首先使用与父代理或目标代理相同的配置文件和工具策略管道。之后，OpenClaw 应用子代理限制层。

在没有限制性的 `tools.profile` 的情况下，子代理可以获得**除消息工具、会话工具和系统工具以外的所有工具**：

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`
- `message`

`sessions_history` 在此处仍然是一个有界的、经过清理的召回视图——它不是原始的记录转储。

当 `maxSpawnDepth >= 2` 时，深度为 1 的编排器子代理还会额外接收 `sessions_spawn`、`subagents`、`sessions_list` 和 `sessions_history`，以便它们管理其子级。

### 通过配置覆盖

```json5
{
  agents: {
    defaults: {
      subagents: {
        maxConcurrent: 1,
      },
    },
  },
  tools: {
    subagents: {
      tools: {
        // deny wins
        deny: ["gateway", "cron"],
        // if allow is set, it becomes allow-only (deny still wins)
        // allow: ["read", "exec", "process"]
      },
    },
  },
}
```

`tools.subagents.tools.allow` 是一个最终的仅允许过滤器。它可以缩小已解析的工具集，但不能**重新添加**被 `tools.profile` 移除的工具。例如，`tools.profile: "coding"` 包含 `web_search`/`web_fetch` 但不包含 `browser` 工具。要让编码配置文件的子代理使用浏览器自动化，请在配置文件阶段添加浏览器：

```json5
{
  tools: {
    profile: "coding",
    alsoAllow: ["browser"],
  },
}
```

当只有一个代理应该获得浏览器自动化时，请使用每个代理的 `agents.list[].tools.alsoAllow: ["browser"]`。

## 并发

子代理使用专用的进程内队列通道：

- **通道名称：** `subagent`
- **并发数：** `agents.defaults.subagents.maxConcurrent`（默认为 `8`）

## 活跃性与恢复

OpenClaw 不会将 OpenClaw`endedAt` 的缺失视为子代理仍在运行的永久证明。陈旧运行窗口之外的未结束运行将不再计入 `/subagents list`、状态摘要、后代完成门控以及每个会话的并发检查中的活动/待定状态。

网关重启后，陈旧的未结束恢复运行将被修剪，除非其子会话被标记为 `abortedLastRun: true`。那些因重启而中止的子会话仍可通过子代理孤儿恢复流程进行恢复，该流程会在清除中止标记之前发送一条合成的恢复消息。

自动重启恢复是按子会话进行限制的。如果同一个子代理子在快速重新楔入窗口内被重复接受进行孤儿恢复，OpenClaw 将在该会话上持久化一个恢复墓碑，并在随后的重启中停止自动恢复它。运行 OpenClaw`openclaw tasks maintenance --apply` 以协调任务记录，或运行 `openclaw doctor --fix` 以清除已入墓碑会话上陈旧的中止恢复标志。

<Note>
  如果子代理生成失败并出现 Gateway(网关) Gateway(网关)`PAIRING_REQUIRED` / `scope-upgrade`RPC，请在编辑配对状态之前检查 RPC 调用方。内部 `sessions_spawn` 协调应通过直接环回共享令牌/密码身份验证，以 `client.id: "gateway-client"` 身份使用 `client.mode: "backend"`CLI 进行连接；该路径不依赖于 CLI 的配对设备范围基线。远程调用方、显式
  `deviceIdentity`、显式设备令牌路径以及浏览器/节点客户端仍需要正常的设备批准才能升级范围。
</Note>

## 停止

- 在请求者聊天中发送 `/stop` 将中止请求者会话并停止从中生成的任何活动子代理运行，级联影响嵌套的子级。

## 限制

- 子代理公告是**尽力而为（best-effort）**的。如果网关重启，待处理的“公告返回”工作将丢失。
- 子代理仍然共享相同的网关进程资源；请将 `maxConcurrent` 视为安全阀。
- `sessions_spawn` 始终是非阻塞的：它立即返回 `{ status: "accepted", runId, childSessionKey }`。
- 子代理上下文仅注入 `AGENTS.md` 和 `TOOLS.md`（不包含 `SOUL.md`、`IDENTITY.md`、`USER.md`、`MEMORY.md`、`HEARTBEAT.md` 或 `BOOTSTRAP.md`）。Codex 原生子代理遵循相同的边界：`TOOLS.md` 保留在继承的 Codex 线程指令中，而仅限父级的 persona、identity 和用户文件则作为回合范围协作指令注入，以免子代理克隆它们。
- 最大嵌套深度为 5（`maxSpawnDepth` 范围：1–5）。对于大多数用例，建议深度为 2。
- `maxChildrenPerAgent` 限制每个会话的活跃子代理数量（默认 `5`，范围 `1–20`）。

## 相关

- [ACP 代理](/zh/tools/acp-agents)
- [代理发送](/zh/tools/agent-send)
- [后台任务](/zh/automation/tasks)
- [多代理沙箱工具](/zh/tools/multi-agent-sandbox-tools)
