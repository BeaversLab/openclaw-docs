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
它们在自己的会话 (`agent:<agentId>:subagent:<uuid>`) 中运行，并在完成时将其结果**宣布**回请求者聊天渠道。每个子代理运行都作为一个[后台任务](/zh/automation/tasks)进行跟踪。

主要目标：

- 在不阻塞主运行的情况下，并行化“研究 / 长任务 / 慢工具”工作。
- 默认保持子代理隔离（会话分离 + 可选的沙箱隔离）。
- 保持工具接口难以滥用：子代理默认**不**获取会话工具。
- 支持可配置的嵌套深度，用于编排器模式。

<Note>**成本说明：** 默认情况下，每个子代理都有自己的上下文和令牌使用量。对于繁重或重复性任务，请为子代理设置更便宜的模型，并将主代理保持在更高质量的模型上。可以通过 `agents.defaults.subagents.model` 或每个代理的覆盖配置进行配置。当子代理确实需要请求者的当前记录时，代理可以在该次生成中请求 `context: "fork"`。线程绑定的子代理会话默认为 `context: "fork"`，因为它们将当前对话分支到后续线程中。</Note>

## 斜杠命令

使用 `/subagents` 来检查**当前会话**的子代理运行：

```text
/subagents list
/subagents log <id|#> [limit] [tools]
/subagents info <id|#>
```

`/subagents info` 显示运行元数据（状态、时间戳、会话 ID、记录路径、清理）。使用 `sessions_history` 获取有界限的、经过安全过滤的回忆视图；当您需要原始完整记录时，请检查磁盘上的记录路径。

### 线程绑定控制

这些命令适用于支持持久线程绑定的渠道。请参阅下方的[支持线程的渠道](#thread-supporting-channels)。

```text
/focus <subagent-label|session-key|session-id|session-label>
/unfocus
/agents
/session idle <duration|off>
/session max-age <duration|off>
```

### 生成行为

代理使用 `sessions_spawn` 启动后台子代理。子代理完成作为内部父会话事件返回；父/请求者代理决定是否需要面向用户的更新。

<AccordionGroup>
  <Accordion title="非阻塞、基于推送的完成">
    - `sessions_spawn` 是非阻塞的；它立即返回一个运行 ID。
    - 完成后，子代理向父/请求者会话报告。
    - 需要子结果的代理回合应在生成所需工作后调用 `sessions_yield`。这将结束当前回合，并让完成事件作为下一个模型可见的消息到达。
    - 完成是基于推送的。一旦生成，**不要**仅为了等待其完成而在循环中轮询 `/subagents list`、`sessions_list` 或 `sessions_history`；仅在需要调试可见性时按需检查状态。
    - 子输出是供请求者代理综合的报告/证据。它不是用户编写的指令文本，不能覆盖系统、开发者或用户策略。
    - 完成后，在宣布清理流程继续之前，OpenClaw 会尽力关闭由该子代理会话打开的已跟踪浏览器选项卡/进程。

  </Accordion>
  <Accordion title="Completion delivery"OpenClaw>
    - OpenClaw 使用具有稳定幂等键的 `agent`OpenClawOpenClawOpenClaw 轮次将完成结果交还给请求者会话。
    - 如果请求者运行仍处于活动状态，OpenClaw 会首先尝试唤醒/引导该运行，而不是启动第二条可见的回复路径。
    - 如果无法唤醒活动请求者，OpenClaw 将回退到具有相同完成上下文的请求者代理交接，而不是放弃公告。
    - 即使父级决定不需要可见的用户更新，成功的父级交接也会完成子代理的交付。
    - 原生子代理不会获得消息工具。它们向父级/请求者代理返回纯助手文本；用户可见的回复由父级/请求者代理的正常交付策略负责。
    - 如果无法使用直接交接，它将回退到队列路由。
    - 如果队列路由仍然不可用，则在最终放弃之前，会使用短指数退避重试公告。
    - 完成交付保留已解析的请求者路由：线程绑定或会话绑定的完成路由在可用时优先；如果完成源仅提供渠道，OpenClaw 会从请求者会话的已解析路由（`lastChannel` / `lastTo` / `lastAccountId`）中填充缺失的目标/帐户，以便直接交付仍然有效。

  </Accordion>
  <Accordion title="完成交接元数据">
    向请求方会话的完成交接是运行时生成的
    内部上下文（非用户编写的文本），包括：

    - `Result` — 来自子级的最新可见 `assistant` 回复文本。Tool/toolResult 输出不会被提升到子级结果中。终端失败的运行不会重复使用捕获的回复文本。
    - `Status` — `completed; ready for parent review` / `failed` / `timed out` / `unknown`。
    - 精简的运行时/令牌统计。
    - 一条审查指令，指示请求代理在决定原始任务是否完成之前验证结果。
    - 后续指导，当子级结果留有更多操作时，指示请求代理继续任务或记录后续操作。
    - 针对无更多操作路径的最终更新指令，以普通助手语音编写，不转发原始内部元数据。

  </Accordion>
  <Accordion title="模式和 ACP 运行时">
    - `--model` 和 `--thinking` 会覆盖该特定运行的默认值。
    - 使用 `info`/`log` 在完成后检查详细信息和输出。
    - 对于持久化的线程绑定会话，请结合 `thread: true` 和 `mode: "session"` 使用 `sessions_spawn`。
    - 如果请求者渠道不支持线程绑定，请使用 `mode: "run"`CLI，而不是重试不可能的线程绑定组合。
    - 对于 ACP 挂载会话（Claude Code、Gemini CLI、OpenCode 或显式 Codex ACP/acpx），当工具通告该运行时，请结合 `runtime: "acp"` 使用 `sessions_spawn`。调试补全或代理对代理循环时，请参阅 [ACP 交付模型](/zh/tools/acp-agents#delivery-model)。当启用 `codex` 插件时，除非用户明确要求 ACP/acpx，否则 Codex 聊天/线程控制应优先使用 `/codex ...`OpenClaw 而非 ACP。
    - OpenClaw 会隐藏 `runtime: "acp"`，直到启用 ACP、请求者未沙箱隔离，并且加载了后端插件（如 `acpx`）。`runtime: "acp"` 期望一个外部 ACP 挂载 ID，或一个带有 `runtime.type="acp"`OpenClaw 的 `agents.list[]` 条目；对于来自 `agents_list` 的普通 OpenClaw 配置代理，请使用默认的子代理运行时。

  </Accordion>
</AccordionGroup>

## 上下文模式

原生子代理启动时是隔离的，除非调用者明确要求分叉当前记录。

| 模式       | 何时使用                                                               | 行为                                                                  |
| ---------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `isolated` | 新的研究、独立实现、慢速工具工作，或可以在任务文本中简要说明的任何内容 | 创建一个干净的子记录。这是默认设置，并且可以保持较低的 Token 使用量。 |
| `fork`     | 依赖于当前对话、先前工具结果或请求者记录中已存在的细微指令的工作       | 在子进程开始之前，将请求者记录分支到子会话中。                        |

请谨慎使用 `fork`。它用于上下文相关的委派，而非替代编写清晰的任务提示。

## 工具：`sessions_spawn`

在全局 `subagent` 通道上使用 `deliver: false` 启动子代理运行，然后运行公告步骤并将公告回复发布到请求者
聊天渠道。

可用性取决于调用者的有效工具策略。`coding` 和
`full` 配置文件默认暴露 `sessions_spawn`。`messaging` 配置文件
不暴露；对于应该委派工作的代理，请添加 `tools.alsoAllow: ["sessions_spawn", "sessions_yield",
"subagents"]` or use `tools.profile: "coding"`。频道/组、提供商、沙箱以及每个代理的允许/拒绝策略
仍可在配置文件阶段之后移除该工具。请使用同一会话中的 `/tools` 来确认有效的工具列表。

**默认值：**

- **模型：** 继承调用者的模型，除非您设置了 `agents.defaults.subagents.model` （或每个代理的 `agents.list[].subagents.model`）；显式的 `sessions_spawn.model` 仍然优先。
- **思考：** 继承调用者的思考模式，除非您设置了 `agents.defaults.subagents.thinking` （或每个代理的 `agents.list[].subagents.thinking`）；显式的 `sessions_spawn.thinking` 仍然优先。
- **运行超时：** 如果省略了 `sessions_spawn.runTimeoutSeconds`，OpenClaw 在设置时使用 `agents.defaults.subagents.runTimeoutSeconds`；否则回退到 `0` （无超时）。
- **任务交付：** 原生子代理在其第一个可见的 `[Subagent Task]` 消息中接收委派的任务。子代理系统提示词携带运行时规则和路由上下文，而不是任务的隐藏副本。

### 委派提示模式

`agents.defaults.subagents.delegationMode` 仅控制提示词指导；它不更改工具策略或强制委派。

- `suggest` （默认）：保留标准提示词指示，以便对较大或较慢的工作使用子代理。
- `prefer`：指示主代理保持响应，并通过 `sessions_spawn` 委派任何比直接回复更复杂的工作。

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
  可选的稳定句柄，用于在后续状态输出中识别特定子项。必须匹配 `[a-z][a-z0-9_]{0,63}` 且不能是 `last` 或 `all` 等保留目标。
</ParamField>
<ParamField path="label" type="string">
  可选的人类可读标签。
</ParamField>
<ParamField path="agentId" type="string">
  当 `subagents.allowAgents` 允许时，在另一个配置的代理 ID 下生成。
</ParamField>
<ParamField path="runtime" type='"subagent" | "acp"' default="subagent">
  `acp` 仅适用于外部 ACP 框架（`claude`、`droid`、`gemini`、`opencode` 或显式请求的 Codex ACP/acpx）以及 `agents.list[]` 条目中 `runtime.type` 为 `acp` 的情况。
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
  当 `true` 时，为此子代理会话请求渠道线程绑定。
</ParamField>
<ParamField path="mode" type='"run" | "session"' default="run">
  如果 `thread: true` 和 `mode` 均省略，默认值变为 `session`。`mode: "session"` 需要 `thread: true`。
  如果请求渠道无法进行线程绑定，请改用 `mode: "run"`。
</ParamField>
<ParamField path="cleanup" type='"delete" | "keep"' default="keep">
  `"delete"` 在宣布后立即归档（仍通过重命名保留记录）。
</ParamField>
<ParamField path="sandbox" type='"inherit" | "require"' default="inherit">
  `require` 拒绝生成，除非目标子运行时是沙箱隔离的。
</ParamField>
<ParamField path="context" type='"isolated" | "fork"' default="isolated">
  `fork` 将请求者当前的记录分叉到子会话中。仅限原生子代理。线程绑定的生成默认为 `fork`；非线程生成默认为 `isolated`。
</ParamField>

<Warning>`sessions_spawn` **不**接受渠道传递参数（`target`、 `channel`、`to`、`threadId`、`replyTo`、`transport`）。原生子代理将其 最新的助手轮次报告回请求者；外部传递保持与 父代理/请求者代理在一起。</Warning>

### 任务名称和定位

`taskName` 是用于编排的面向模型的句柄，而不是会话密钥。
当协调器可能稍后需要检查该子项时，请将其用于稳定的子项名称，例如 `review_subagents`、
`linux_validation` 或 `docs_update`。

目标解析接受精确的 `taskName` 匹配和无歧义
前缀。匹配范围限定为编号 `/subagents` 目标所使用的同一活动/近期目标窗口，因此陈旧的已完成的子任务不会导致
重用的句柄产生歧义。如果两个活动或近期的子任务共享相同的
`taskName`，则该目标具有歧义；请改用列表索引、会话密钥或
运行 ID。

保留目标 `last` 和 `all` 不是有效的 `taskName` 值，
因为它们已具有控制含义。

## 工具：`sessions_yield`

结束当前的模型轮次并等待运行时事件（主要是
子代理完成事件）作为下一条消息到达。在
生成所需的子任务工作后使用此工具，当请求方在这些完成事件到达之前
无法生成最终答案时。

`sessions_yield` 是等待基元。不要用针对
`subagents`、`sessions_list`、`sessions_history`、shell
`sleep` 或进程的轮询循环来替换它，仅仅是为了检测子任务完成。

仅当会话的有效工具列表包含 `sessions_yield` 时才使用它。某些最小化或自定义工具配置文件可能会暴露 `sessions_spawn` 和 `subagents` 而不暴露 `sessions_yield`；在这种情况下，不要仅仅为了等待完成而发明一个轮询循环。

当存在活动的子级时，OpenClaw 会向普通轮次中注入一个紧凑的运行时生成的 `Active Subagents` 提示块，以便请求者可以在不进行轮询的情况下查看当前的子会话、运行 ID、状态、标签、任务和 `taskName` 别名。该块中的任务和标签字段作为数据引用，而非指令，因为它们可能源自用户/模型提供的生成参数。

## 工具：`subagents`

列出请求者会话拥有的已生成子代理运行。其范围限定于
当前请求者；子项只能看到其自己控制的子项。

使用 `subagents` 进行按需状态和调试。使用 `sessions_yield` 等待
完成事件。

## 线程绑定会话

当为渠道启用线程绑定时，子代理可以保持绑定到某个线程，以便该线程中的后续用户消息继续路由到同一个子代理会话。

### 支持线程的渠道

**Discord** 目前是唯一支持的渠道。它支持持久的线程绑定子代理会话（带有 `thread: true` 的 `sessions_spawn`）、手动线程控制（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`）以及适配器密钥 `channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours` 和 `channels.discord.threadBindings.spawnSessions`。

### 快速流程

<Steps>
  <Step title="生成">带有 `thread: true` 的 `sessions_spawn`（以及可选的 `mode: "session"`）。</Step>
  <Step title="绑定" OpenClaw>
    OpenClaw 在活动渠道中为该会话目标创建或绑定一个线程。
  </Step>
  <Step title="路由后续消息">该线程中的回复和后续消息会路由到已绑定的会话。</Step>
  <Step title="检查超时">使用 `/session idle` 检查/更新非活动自动取消聚焦，并使用 `/session max-age` 控制硬性上限。</Step>
  <Step title="分离">使用 `/unfocus` 手动分离。</Step>
</Steps>

### 手动控制

| 命令               | 效果                                                |
| ------------------ | --------------------------------------------------- |
| `/focus <target>`  | 将当前线程（或创建一个）绑定到子代理/会话目标       |
| `/unfocus`         | 移除当前绑定线程的绑定                              |
| `/agents`          | 列出活动运行和绑定状态 (`thread:<id>` 或 `unbound`) |
| `/session idle`    | 检查/更新空闲自动取消聚焦（仅限已聚焦的绑定线程）   |
| `/session max-age` | 检查/更新硬性上限（仅限已聚焦的绑定线程）           |

### 配置开关

- **全局默认值：** `session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`。
- **渠道覆盖和生成自动绑定密钥**是特定于适配器的。请参阅上方的[支持会话的渠道](#thread-supporting-channels)。

请参阅[配置参考](/zh/gateway/configuration-reference)和
[斜杠命令](/zh/tools/slash-commands)以获取当前适配器的详细信息。

### 允许列表

<ParamField path="agents.list[].subagents.allowAgents" type="string[]">
  可通过显式 `agentId` 定位的已配置代理 ID 列表（`["*"]` 允许任何已配置的目标）。默认值：仅请求者代理。如果您设置了列表并且仍然希望请求者通过 `agentId` 自行生成，请将请求者 ID 包含在列表中。
</ParamField>
<ParamField path="agents.defaults.subagents.allowAgents" type="string[]">
  当请求者代理未设置其自己的 `subagents.allowAgents` 时使用的默认已配置目标代理允许列表。
</ParamField>
<ParamField path="agents.defaults.subagents.requireAgentId" type="boolean" default="false">
  阻止省略 `agentId` 的 `sessions_spawn` 调用（强制进行显式配置文件选择）。每代理覆盖：`agents.list[].subagents.requireAgentId`。
</ParamField>
<ParamField path="agents.defaults.subagents.announceTimeoutMs" type="number" default="120000">
  网关 `agent` 公告传递尝试的每次调用超时。值为正整数毫秒，并限制为平台安全计时器最大值。瞬态重试可能会使总公告等待时间超过一个配置的超时时间。
</ParamField>

如果请求者会话是沙箱隔离的，`sessions_spawn` 将拒绝将以非沙箱隔离模式运行的目标。

### 设备发现

使用 `agents_list` 查看当前允许 `sessions_spawn` 使用哪些代理 ID。响应包括每个列出的代理的有效模型和嵌入式运行时元数据，以便调用者可以区分 PI、Codex 应用服务器和其他配置的原生运行时。

`allowAgents` 条目必须指向 `agents.list[]` 中已配置的代理 ID。
`["*"]` 表示任何已配置的目标代理加上请求者。如果代理配置
被删除但其 ID 仍保留在 `allowAgents` 中，`sessions_spawn` 将拒绝该 ID
并且 `agents_list` 将忽略它。运行 `openclaw doctor --fix` 以清理过时的
允许列表条目，或者当目标应在继承默认值的同时保持可生成时，添加一个最小的 `agents.list[]` 条目。

### 自动归档

- 子代理会话将在 `agents.defaults.subagents.archiveAfterMinutes`（默认 `60`）后自动归档。
- 归档使用 `sessions.delete` 并将转录重命名为 `*.deleted.<timestamp>`（同一文件夹）。
- `cleanup: "delete"` 在宣告后立即归档（仍然通过重命名保留转录）。
- 自动归档是尽力而为的；如果网关重启，待处理的计时器将丢失。
- `runTimeoutSeconds` **不会**自动归档；它仅停止运行。会话将保留直到自动归档。
- 自动归档同等地应用于深度 1 和深度 2 的会话。
- 浏览器清理与归档清理是分开的：当运行结束时，被追踪的浏览器标签页/进程会被尽力关闭，即使对话记录/会话记录被保留。

## 嵌套子代理

默认情况下，子代理无法生成自己的子代理
(`maxSpawnDepth: 1`)。设置 `maxSpawnDepth: 2` 以启用一层嵌套
——即 **编排器模式** (orchestrator pattern)：主 → 编排器子代理 →
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
  **操作指南：** 启动子工作一次并等待完成事件，而不是围绕 `sessions_list`、 `sessions_history`、`/subagents list` 或 `exec` 睡眠命令构建轮询循环。 `sessions_list` 和 `/subagents list` 使子会话关系专注于活跃工作——活跃的子项保持附加，已结束的子项在最近的短时间内保持可见，而过时的仅存储子项链接在其新鲜度窗口后被忽略。这可以防止旧的 `spawnedBy` / `parentSessionKey`
  元数据在重启后复活幽灵子项。如果在您已经发送最终答案后到达子完成事件，正确的后续操作是精确的无声令牌 `NO_REPLY` / `no_reply`。
</Note>

### 按深度的工具策略

- 角色和控制范围在生成时被写入会话元数据。这可以防止扁平化或恢复的会话密钥意外重新获得编排器权限。
- **深度 1（编排器，当 `maxSpawnDepth >= 2` 时）：** 获取 `sessions_spawn`、`subagents`、`sessions_list`、`sessions_history`，以便它可以生成子项并检查其状态。其他会话/系统工具仍然被拒绝。
- **深度 1（叶节点，当 `maxSpawnDepth == 1` 时）：** 没有会话工具（当前默认行为）。
- **深度 2（叶节点工作器）：** 没有会话工具——`sessions_spawn` 在深度 2 处始终被拒绝。无法生成更多子项。

### 每个代理的生成限制

每个代理会话（在任何深度）一次最多可以有 `maxChildrenPerAgent`
（默认 `5`）个活跃子项。这可以防止单个编排器失控地发散。

### 级联停止

停止深度 1 的编排器会自动停止其所有深度 2
子级：

- 主聊天中的 `/stop` 停止所有深度 1 代理并级联到其深度 2 子项。

## 身份验证

子代理身份验证由 **代理 ID** 解析，而不是由会话类型解析：

- 子代理会话密钥是 `agent:<agentId>:subagent:<uuid>`。
- 身份验证存储从该代理的 `agentDir` 加载。
- 主代理的身份验证配置文件作为 **回退** 合并进来；发生冲突时，代理配置文件会覆盖主配置文件。

该合并是累加的，因此主配置文件始终可用作回退。尚不支持每个代理完全隔离的身份验证。

## 公告

子代理通过 announce（公告）步骤进行回复：

- Announce 步骤在子代理会话（而非请求者会话）内部运行。
- 如果子代理完全回复 `ANNOUNCE_SKIP`，则不会发布任何内容。
- 如果最新的助手文本是完全静默令牌 `NO_REPLY` / `no_reply`，则即使之前存在可见的进度，公告输出也会被抑制。

传递方式取决于请求者深度：

- 顶级请求者会话使用带有外部传递（`deliver=true`）的后续 `agent` 调用。
- 嵌套请求者子代理会话接收内部后续注入（`deliver=false`），以便编排器可以在会话内合成子结果。
- 如果嵌套请求者子代理会话已消失，OpenClaw 将在可用时回退到该会话的请求者。

对于顶级请求者会话，完成模式的直接传递首先解析任何绑定的会话/线程路由和钩子覆盖，然后从请求者会话的存储路由中填充缺失的渠道目标字段。即使完成来源仅标识了渠道，这也能确保完成内容位于正确的聊天/主题上。

在构建嵌套完成结果时，子完成聚合范围限定为当前请求者运行，以防止过时的先前运行的子输出泄漏到当前的公告中。如果渠道适配器支持，公告回复将保留线程/主题路由。

### Announce 上下文

Announce 上下文被规范化为一个稳定的内部事件块：

| 字段     | 来源                                                                                     |
| -------- | ---------------------------------------------------------------------------------------- |
| 来源     | `subagent` 或 `cron`                                                                     |
| 会话 ID  | 子会话键/ID                                                                              |
| 类型     | 公告类型 + 任务标签                                                                      |
| 状态     | 从运行时结果（`success`、`error`、`timeout` 或 `unknown`）得出 —— **不是**从模型文本推断 |
| 结果内容 | 来自子级的最新可见助手文本                                                               |
| 后续     | 描述何时回复与保持静默的指令                                                             |

最终失败的运行报告失败状态，而不重播捕获的回复文本。Tool/toolResult 输出不会被提升到子结果文本中。

### 统计行

公告负载在末尾包含一个统计行（即使被换行）：

- 运行时（例如 `runtime 5m12s`）。
- Token 使用量（输入/输出/总计）。
- 当配置了模型定价时，显示估算成本（`models.providers.*.models[].cost`）。
- `sessionKey`、`sessionId` 和记录文字路径，以便主代理可以通过 `sessions_history` 获取历史记录或在磁盘上检查文件。

内部元数据仅用于编排；面向用户的回复应使用正常的助手语气重写。

### 为什么首选 `sessions_history`

`sessions_history` 是更安全的编排路径：

- 首先对助手回忆进行规范化：剥离思考标签；剥离 `<relevant-memories>` / `<relevant_memories>` 脚手架；剥离纯文本工具调用 XML 负载块（`<tool_call>`、`<function_call>`、`<tool_calls>`、`<function_calls>`），包括无法干净关闭的截断负载；剥离降级的工具调用/结果脚手架和历史上下文标记；剥离泄露的模型控制令牌（`<|assistant|>`、其他 ASCII `<|...|>`、全角 `<｜...｜>`）；剥离格式错误的 MiniMax 工具调用 XML。
- 凭证/令牌类的文本会被编辑。
- 长块可能会被截断。
- 非常大的历史记录可能会丢弃旧行，或者用 `[sessions_history omitted: message too large]` 替换过大的行。
- 当您需要逐字节完整记录时，原始磁盘记录检查是后备方案。

## 工具策略

子代理首先使用与父代理或目标代理相同的配置文件和工具策略管道。之后，OpenClaw 应用子代理限制层。

如果没有限制性的 `tools.profile`，子代理将获得**除消息工具、会话工具和系统工具之外的所有工具**：

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`
- `message`

`sessions_history` 在此处仍然是一个受限的、经过净化的召回视图——它不是原始的完整记录转储。

当 `maxSpawnDepth >= 2` 时，深度 1 (depth-1) 的编排器子代理还会接收 `sessions_spawn`、`subagents`、`sessions_list` 和 `sessions_history`，以便它们管理其子级。

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

`tools.subagents.tools.allow` 是一个最终的仅允许过滤器。它可以缩小已解析的工具集，但无法**重新添加**被 `tools.profile` 移除的工具。例如，`tools.profile: "coding"` 包含 `web_search`/`web_fetch` 但不包含 `browser` 工具。若要让编码配置文件的子代理使用浏览器自动化，请在配置文件阶段添加浏览器：

```json5
{
  tools: {
    profile: "coding",
    alsoAllow: ["browser"],
  },
}
```

当只有一个代理应获得浏览器自动化时，请使用每个代理的 `agents.list[].tools.alsoAllow: ["browser"]`。

## 并发

子代理使用专用的进程内队列通道：

- **通道名称：** `subagent`
- **并发数：** `agents.defaults.subagents.maxConcurrent`（默认 `8`）

## 活跃性与恢复

OpenClaw 不会将 `endedAt` 的缺失视为子代理仍然存活的永久证据。超过过期运行窗口的未结束运行将停止计入 `/subagents list`、状态摘要、后代完成控制和每会话并发检查中的活动/待定状态。

网关重启后，除非其子会话被标记为 `abortedLastRun: true`，否则陈旧的未结束已恢复运行将被修剪。那些因重启而中止的子会话仍可通过子代理孤立恢复流程进行恢复，该流程会在清除中止标记之前发送一个合成恢复消息。

自动重启恢复是按子会话受限的。如果同一个子代理子级在快速重新楔入窗口内被重复接受进行孤立恢复，OpenClaw 将在该会话上保留一个恢复墓碑标记，并停止在后续重启时自动恢复它。运行 `openclaw tasks maintenance --apply` 以协调任务记录，或运行 `openclaw doctor --fix` 以清除已标记墓碑的会话上的陈旧中止恢复标志。

<Note>
  如果子代理启动失败并出现 Gateway Gateway(网关)`PAIRING_REQUIRED` / `scope-upgrade`RPC，请在编辑配对状态之前检查 RPC 调用者。 内部 `sessions_spawn` 协调应作为 `client.id: "gateway-client"` 并带有 `client.mode: "backend"`CLI 通过直接 环回共享令牌/密码认证进行连接；该路径不依赖于 CLI 的配对设备范围基线。远程调用者、显式 `deviceIdentity`、显式设备令牌路径以及浏览器/节点客户端
  仍需要正常的设备批准才能进行范围升级。
</Note>

## 停止

- 在请求者聊天中发送 `/stop` 会中止请求者会话并停止从其生成的所有活动子代理运行，并级联到嵌套的子进程。

## 限制

- 子代理公告是**尽力而为（best-effort）**的。如果网关重启，待处理的“公告返回”工作将丢失。
- 子代理仍然共享相同的网关进程资源；请将 `maxConcurrent` 视为安全阀。
- `sessions_spawn` 始终是非阻塞的：它立即返回 `{ status: "accepted", runId, childSessionKey }`。
- 子代理上下文仅注入 `AGENTS.md` 和 `TOOLS.md`（不包含 `SOUL.md`、`IDENTITY.md`、`USER.md`、`MEMORY.md`、`HEARTBEAT.md` 或 `BOOTSTRAP.md`）。Codex 原生子代理遵循相同的边界：`TOOLS.md` 保留在继承的 Codex 线程指令中，而仅限父级的人设、身份和用户文件作为轮次范围的协作指令注入，以便子进程不会克隆它们。
- 最大嵌套深度为 5（`maxSpawnDepth` 范围：1–5）。对于大多数用例，建议深度为 2。
- `maxChildrenPerAgent` 限制每个会话的活动子进程数量（默认 `5`，范围 `1–20`）。

## 相关

- [ACP 代理](/zh/tools/acp-agents)
- [Agent send](/zh/tools/agent-send)
- [后台任务](/zh/automation/tasks)
- [多智能体沙盒工具](/zh/tools/multi-agent-sandbox-tools)
