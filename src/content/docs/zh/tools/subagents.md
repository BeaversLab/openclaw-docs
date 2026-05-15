---
summary: "生成独立的后台代理运行，将结果宣布回请求聊天"
read_when:
  - You want background or parallel work via the agent
  - You are changing sessions_spawn or sub-agent tool policy
  - You are implementing or troubleshooting thread-bound subagent sessions
title: "子代理"
sidebarTitle: "子代理"
---

子代理是从现有代理运行生成的后台代理运行。
它们在自己的会话 (`agent:<agentId>:subagent:<uuid>`) 中运行，并在完成时将结果**宣布**回请求聊天
渠道。每个子代理运行都被跟踪为一个
[后台任务](/zh/automation/tasks)。

主要目标：

- 在不阻塞主运行的情况下，并行化“研究 / 长任务 / 慢工具”工作。
- 默认保持子代理隔离（会话分离 + 可选的沙箱隔离）。
- 保持工具接口难以滥用：子代理默认**不**获取会话工具。
- 支持可配置的嵌套深度，用于编排器模式。

<Note>**成本提示：** 默认情况下，每个子代理都有自己的上下文和令牌使用量。 对于繁重或重复的任务，为子代理设置更便宜的模型， 并将主代理保持在更高质量的模型上。可以通过 `agents.defaults.subagents.model` 或每个代理的覆盖进行配置。当子代理 确实需要请求者的当前记录时，代理可以在该次生成中请求 `context: "fork"`。线程绑定的子代理会话默认 为 `context: "fork"`，因为它们将当前对话分支到 后续线程中。</Note>

## 斜杠命令

使用 `/subagents` 检查或控制**当前会话**的子代理运行：

```text
/subagents list
/subagents kill <id|#|all>
/subagents log <id|#> [limit] [tools]
/subagents info <id|#>
/subagents send <id|#> <message>
/subagents steer <id|#> <message>
/subagents spawn <agentId> <task> [--model <model>] [--thinking <level>]
```

使用顶级 [`/steer <message>`](/zh/tools/steer) 来引导当前请求者会话的活动运行。当目标是子运行时，使用 `/subagents steer <id|#> <message>`。

`/subagents info` 显示运行元数据（状态、时间戳、会话 ID、
记录路径、清理）。使用 `sessions_history` 获取有限的、
经过安全过滤的召回视图；当您需要原始完整记录时，请检查磁盘上的记录路径。

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

`/subagents spawn` 作为用户命令（而非
内部中继）启动后台子代理，并在运行完成时向
请求聊天发送一个最终的完成更新。

<AccordionGroup>
  <Accordion title="非阻塞、基于推送的完成">
    - 生成命令是非阻塞的；它立即返回一个运行 ID。
    - 完成后，子代理会将摘要/结果消息通告回请求者聊天渠道。
    - 需要子结果的代理轮次应在生成所需工作后调用 `sessions_yield`。这将结束当前轮次，并允许完成事件作为下一条模型可见的消息到达。
    - 完成是基于推送的。一旦生成，请**不要**仅为了等待完成而循环轮询 `/subagents list`、`sessions_list` 或 `sessions_history`OpenClaw；仅在调试或干预时按需检查状态。
    - 子输出是供请求者代理综合的报告/证据。它不是用户编写的指令文本，不能覆盖系统、开发者或用户策略。
    - 完成后，在通告清理流程继续之前，OpenClaw 会尽力关闭由该子代理会话打开的受跟踪浏览器标签页/进程。

  </Accordion>
  <Accordion title="手动生成的交付弹性"OpenClaw>
    - OpenClaw 通过带有稳定幂等键的 `agent`OpenClawOpenClawOpenClaw 轮次，将完成内容交还给请求者会话。
    - 如果请求者运行仍处于活动状态，OpenClaw 会首先尝试唤醒/引导该运行，而不是启动第二条可见的回复路径。
    - 如果请求者代理的完成交接失败或未产生可见输出，OpenClaw 会将交付视为失败，并回退到队列路由/重试。它不会将子结果直接发送到外部聊天。
    - 如果无法使用直接交接，它会回退到队列路由。
    - 如果队列路由仍然不可用，则在最终放弃之前，会使用短指数退避来重试公告。
    - 完成内容交付会保留已解析的请求者路由：当可用时，线程绑定或对话绑定的完成路由优先；如果完成来源仅提供渠道，OpenClaw 会从请求者会话的已解析路由（`lastChannel` / `lastTo` / `lastAccountId`）中填充缺失的目标/帐户，以便直接交付仍然有效。

  </Accordion>
  <Accordion title="完成交接元数据">
    向请求者会话进行的完成交接是运行时生成的
    内部上下文（非用户编写的文本），包括：

    - `Result` — 最新的可见 `assistant` 回复文本，否则为经过清理的最新工具/toolResult 文本。终端失败的运行不会重用捕获的回复文本。
    - `Status` — `completed successfully` / `failed` / `timed out` / `unknown`。
    - 紧凑的运行时/令牌统计信息。
    - 一条交付指令，告知请求者代理以正常的助手语音进行重写（不转发原始内部元数据）。

  </Accordion>
  <Accordion title="模式和 ACP 运行时">
    - `--model` 和 `--thinking` 会覆盖该特定运行的默认值。
    - 使用 `info`/`log` 在完成后检查详细信息和输出。
    - `/subagents spawn` 是一次性模式（`mode: "run"`）。对于持久化的线程绑定会话，请使用带有 `thread: true` 和 `mode: "session"`CLI 的 `sessions_spawn`。
    - 对于 ACP harness 会话（Claude Code、Gemini CLI、OpenCode 或显式的 Codex ACP/acpx），当工具通告该运行时时，请使用带有 `runtime: "acp"` 的 `sessions_spawn`。在调试补全或代理之间的循环时，请参阅 [ACP 交付模型](/zh/tools/acp-agents#delivery-model)。当启用 `codex` 插件时，除非用户明确要求 ACP/acpx，否则 Codex 聊天/线程控制应优先使用 `/codex ...`OpenClaw 而非 ACP。
    - 在启用 ACP、请求者未处于沙箱隔离环境且加载了 `acpx` 等后端插件之前，OpenClaw 会隐藏 `runtime: "acp"`。`runtime: "acp"` 需要一个外部 ACP harness ID，或者一个带有 `runtime.type="acp"`OpenClaw 的 `agents.list[]` 条目；对于来自 `agents_list` 的普通 OpenClaw 配置代理，请使用默认的子代理运行时。

  </Accordion>
</AccordionGroup>

## 上下文模式

原生子代理启动时是隔离的，除非调用者明确要求分叉当前记录。

| 模式       | 何时使用                                                             | 行为                                                                |
| ---------- | -------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `isolated` | 新的研究、独立实施、慢速工具工作，或者任何可以在任务文本中简述的工作 | 创建一个干净的子记录。这是默认模式，有助于保持较低的 token 使用量。 |
| `fork`     | 依赖于当前对话、先前工具结果或已存在于请求者记录中的细微指令的工作   | 在子会话开始之前，将请求者的记录分支到子会话中。                    |

请谨慎使用 `fork`。它用于上下文相关的委派，而不是替代编写清晰的任务提示词。

## 工具：`sessions_spawn`

在全局 `subagent` 通道上使用 `deliver: false` 启动子代理运行，然后运行公告步骤并将公告回复发布到请求者聊天渠道。

可用性取决于调用者的有效工具策略。`coding` 和 `full` 配置文件默认暴露 `sessions_spawn`。`messaging` 配置文件则不暴露；对于应该委派工作的代理，请添加 `tools.alsoAllow: ["sessions_spawn", "sessions_yield",
"subagents"]` or use `tools.profile: "coding"`。渠道/组、提供商、沙箱以及每个代理的允许/拒绝策略仍可在配置文件阶段之后移除该工具。使用同一会话中的 `/tools` 确认有效的工具列表。

**默认值：**

- **模型：** 继承调用者，除非您设置了 `agents.defaults.subagents.model`（或每个代理的 `agents.list[].subagents.model`）；显式的 `sessions_spawn.model` 仍然优先。
- **思考（Thinking）：** 继承调用者，除非您设置了 `agents.defaults.subagents.thinking`（或每个代理的 `agents.list[].subagents.thinking`）；显式的 `sessions_spawn.thinking` 仍然优先。
- **运行超时：** 如果省略 `sessions_spawn.runTimeoutSeconds`，OpenClaw 在设置了 `agents.defaults.subagents.runTimeoutSeconds` 时将使用它；否则回退到 `0`（无超时）。

### 委派提示模式

`agents.defaults.subagents.delegationMode` 仅控制提示指导；它不会更改工具策略或强制委派。

- `suggest`（默认）：保留标准提示，以推动在处理较大或较慢的工作时使用子代理。
- `prefer`：告知主代理保持响应，并将除直接回复之外的任何更复杂的工作通过 `sessions_spawn` 进行委派。

每个代理的覆盖设置使用 `agents.list[].subagents.delegationMode`。

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
  可选的稳定句柄，用于后续 `subagents` 定位。必须匹配 `[a-z][a-z0-9_]{0,63}` 且不能是保留的目标，如 `last` 或 `all`。当协调器在生成多个子代后可能需要引导、终止或识别特定子代时，建议使用此参数。
</ParamField>
<ParamField path="label" type="string">
  可选的人类可读标签。
</ParamField>
<ParamField path="agentId" type="string">
  当 `subagents.allowAgents` 允许时，在另一个代理 ID 下生成。
</ParamField>
<ParamField path="runtime" type='"subagent" | "acp"' default="subagent">
  `acp` 仅适用于外部 ACP 框架（`claude`、`droid`、`gemini`、`opencode` 或明确请求的 Codex ACP/acpx）以及 `runtime.type` 为 `acp` 的 `agents.list[]` 条目。
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
  如果省略 `thread: true` 和 `mode`，默认值变为 `session`。`mode: "session"` 需要 `thread: true`。
</ParamField>
<ParamField path="cleanup" type='"delete" | "keep"' default="keep">
  `"delete"` 在宣布后立即归档（仍通过重命名保留记录）。
</ParamField>
<ParamField path="sandbox" type='"inherit" | "require"' default="inherit">
  `require` 拒绝生成，除非目标子运行时处于沙箱隔离状态。
</ParamField>
<ParamField path="context" type='"isolated" | "fork"' default="isolated">
  `fork` 将请求者的当前记录分支到子会话中。仅限原生子代理。线程绑定的生成默认为 `fork`；非线程生成默认为 `isolated`。
</ParamField>

<Warning>`sessions_spawn` **不**接受渠道传递参数（`target`、 `channel`、`to`、`threadId`、`replyTo`、`transport`）。如需传递，请从生成的运行中使用 `message`/`sessions_send`。</Warning>

### 任务名称和定位

`taskName` 是面向模型的编排句柄，而非会话密钥。
当协调器稍后可能需要引导或终止该子任务时，请将其用于稳定的子任务名称，例如 `review_subagents`、
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

列出、引导或终止由请求者会话拥有的已生成的子代理运行。它的范围仅限于当前的请求者；子级只能查看/控制其自身控制的子级。

使用 `subagents` 进行按需状态查询、调试、引导或终止。使用 `sessions_yield` 等待完成事件。

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
- **渠道覆盖和生成自动绑定密钥** 因适配器而异。参见上方的 [支持线程的渠道](#thread-supporting-channels)。

有关当前适配器的详细信息，请参阅 [配置参考](/zh/gateway/configuration-reference) 和
[斜杠命令](/zh/tools/slash-commands)。

### 允许列表

<ParamField path="agents.list[].subagents.allowAgents" type="string[]">
  可通过显式 `agentId` 定向的代理 ID 列表（`["*"]` 允许任意）。默认：仅限请求者代理。如果您设置了列表并且仍希望请求者通过 `agentId` 生成自身，请将请求者 ID 包含在列表中。
</ParamField>
<ParamField path="agents.defaults.subagents.allowAgents" type="string[]">
  当请求者代理未设置其自己的 `subagents.allowAgents` 时使用的默认目标代理允许列表。
</ParamField>
<ParamField path="agents.defaults.subagents.requireAgentId" type="boolean" default="false">
  阻止省略 `agentId` 的 `sessions_spawn` 调用（强制显式配置文件选择）。每代理覆盖：`agents.list[].subagents.requireAgentId`。
</ParamField>

如果请求者会话是沙箱隔离的，`sessions_spawn` 将拒绝非沙箱隔离运行的目标。

### 设备发现

使用 `agents_list` 查看当前允许用于 `sessions_spawn` 的代理 ID。响应包括每个列出代理的有效模型和嵌入的运行时元数据，以便调用者区分 PI、Codex 应用服务器和其他配置的原生运行时。

### 自动归档

- 子代理会话会在 `agents.defaults.subagents.archiveAfterMinutes` 后自动归档（默认 `60`）。
- 归档使用 `sessions.delete` 并将转录重命名为 `*.deleted.<timestamp>`（同一文件夹）。
- `cleanup: "delete"` 在宣布后立即归档（仍通过重命名保留转录）。
- 自动归档是尽力而为的；如果网关重启，挂起的计时器将丢失。
- `runTimeoutSeconds` **不会**自动归档；它仅停止运行。会话将保留直到自动归档。
- 自动归档同样适用于深度 1 和深度 2 的会话。
- 浏览器清理与归档清理是分开的：当运行结束时，被跟踪的浏览器选项卡/进程会被尽力关闭，即使转录/会话记录被保留。

## 嵌套子代理

默认情况下，子代理无法生成自己的子代理
(`maxSpawnDepth: 1`)。设置 `maxSpawnDepth: 2` 以启用一层
嵌套 —— 即 **编排器模式**：主 → 编排器子代理 →
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
      },
    },
  },
}
```

### 深度级别

| 深度 | 会话键形式                                   | 角色                              | 可生成？                     |
| ---- | -------------------------------------------- | --------------------------------- | ---------------------------- |
| 0    | `agent:<id>:main`                            | 主代理                            | 始终                         |
| 1    | `agent:<id>:subagent:<uuid>`                 | 子代理（当允许深度 2 时为编排器） | 仅当 `maxSpawnDepth >= 2` 时 |
| 2    | `agent:<id>:subagent:<uuid>:subagent:<uuid>` | 子子代理（叶工作器）              | 从不                         |

### 通告链

结果沿链向上回流：

1. 深度 2 工作器完成 → 向其父级（深度 1 编排器）通告。
2. 深度 1 编排器接收通告，综合结果，完成 → 向主代理通告。
3. 主代理接收通告并交付给用户。

每一层只能看到其直接子级的通告。

<Note>
  **操作指南：** 启动子工作一次并等待完成 事件，而不是围绕 `sessions_list`、 `sessions_history`、`/subagents list` 或 `exec` sleep 命令 构建轮询循环。 `sessions_list` 和 `/subagents list` 使子会话关系 专注于实时工作 —— 实时子级保持附加，已结束的子级在 短期的最近窗口内保持可见，过时的仅存储子级链接在 其新鲜度窗口后被忽略。这可以防止旧的 `spawnedBy` / `parentSessionKey` 元数据在重启后复活
  幽灵子级。如果子完成事件在您已发送 最终答案后到达，正确的后续操作是精确的无声令牌 `NO_REPLY` / `no_reply`。
</Note>

### 按深度划分的工具策略

- 角色和控制范围在生成时写入会话元数据。这可以防止扁平或恢复的会话键意外重新获得编排器特权。
- **深度 1（编排器，当 `maxSpawnDepth >= 2` 时）：** 获得 `sessions_spawn`、`subagents`、`sessions_list`、`sessions_history`，以便它可以管理其子级。其他会话/系统工具保持拒绝状态。
- **深度 1（叶子节点，当 `maxSpawnDepth == 1` 时）：** 没有会话工具（当前的默认行为）。
- **深度 2（叶子工作器）：** 没有会话工具 —— `sessions_spawn` 在深度 2 始终被拒绝。无法生成更多子级。

### 每个代理的生成限制

每个代理会话（在任何深度）一次最多可以有 `maxChildrenPerAgent`（默认为 `5`）个活动子级。这可以防止单个编排器出现失控的扇出。

### 级联停止

停止深度 1 的编排器会自动停止其所有深度 2 的子级：

- 主聊天中的 `/stop` 会停止所有深度 1 的代理，并级联至其深度 2 的子级。
- `/subagents kill <id>` 会停止特定的子代理，并级联至其子级。
- `/subagents kill all` 会停止请求者的所有子代理并进行级联。

## 身份验证

子代理的身份验证由 **代理 id** 解析，而不是由会话类型解析：

- 子代理会话密钥是 `agent:<agentId>:subagent:<uuid>`。
- 身份验证存储从该代理的 `agentDir` 加载。
- 主代理的身份验证配置文件作为 **备用** 合并进来；如果发生冲突，代理配置文件会覆盖主配置文件。

这种合并是累加的，因此主配置文件始终可作为备用。尚不支持每个代理完全隔离的身份验证。

## 通告

子代理通过通告步骤进行汇报：

- 通告步骤在子代理会话内部运行（而不是在请求者会话中）。
- 如果子代理完全回复 `ANNOUNCE_SKIP`，则不会发布任何内容。
- 如果最新的助手文本是完全的静默令牌 `NO_REPLY` / `no_reply`，即使之前存在可见的进度，通告输出也会被抑制。

传递取决于请求者的深度：

- 顶级请求者会话使用带有外部传递（`deliver=true`）的后续 `agent` 调用。
- 嵌套的请求者子代理会话接收一个内部后续注入（`deliver=false`），以便编排器可以在会话内综合子结果。
- 如果嵌套的请求者子代理会话已消失，OpenClaw 会在可用时回退到该会话的请求者。

对于顶层请求者会话，完成模式的直接传递首先解析任何绑定的对话/线程路由和钩子覆盖，然后从请求者会话的存储路由中填充缺失的渠道目标字段。即使完成源仅标识了渠道，这也能确保完成内容保持在正确的聊天/主题上。

在构建嵌套完成发现时，子完成聚合的范围限定为当前的请求者运行，以防止过时的先前运行的子输出泄漏到当前的通知中。当渠道适配器上可用时，通知回复会保留线程/主题路由。

### 通知上下文

通知上下文被标准化为一个稳定的内部事件块：

| 字段     | 来源                                                                               |
| -------- | ---------------------------------------------------------------------------------- |
| 来源     | `subagent` 或 `cron`                                                               |
| 会话 ID  | 子会话键/ID                                                                        |
| 类型     | 通知类型 + 任务标签                                                                |
| 状态     | 源自运行时结果（`success`、`error`、`timeout` 或 `unknown`）——**不**从模型文本推断 |
| 结果内容 | 最新的可见助手文本，否则为经过清理的最新工具/toolResult 文本                       |
| 后续跟进 | 描述何时回复与保持静默的指令                                                       |

终端失败的运行会报告失败状态，而不会重播捕获的回复文本。如果子运行仅完成了工具调用，则通知可以将该历史记录折叠为简短的部分进度摘要，而不是重播原始工具输出。

### 统计行

通知负载在末尾包含一个统计行（即使在被包装时）：

- 运行时（例如 `runtime 5m12s`）。
- Token 使用量（输入/输出/总计）。
- 配置了模型定价时的估算成本（`models.providers.*.models[].cost`）。
- `sessionKey`、`sessionId` 和转录路径，以便主代理可以通过 `sessions_history` 获取历史记录或在磁盘上检查文件。

内部元数据仅用于编排；面向用户的回复应以普通助手的声音重写。

### 为什么首选 `sessions_history`

`sessions_history` 是更安全的编排路径：

- 助手召回内容首先会被标准化：剥离思考标签；剥离 `<relevant-memories>` / `<relevant_memories>` 脚手架；剥离纯文本工具调用 XML 负载块（`<tool_call>`、`<function_call>`、`<tool_calls>`、`<function_calls>`），包括从未干净闭合的截断负载；剥离降级的工具调用/结果脚手架和历史上下文标记；剥离泄漏的模型控制令牌（`<|assistant|>`、其他 ASCII `<|...|>`、全角 `<｜...｜>`MiniMax）；剥离格式错误的 MiniMax 工具调用 XML。
- 凭据/令牌类文本会被编辑。
- 长文本块可能会被截断。
- 非常大的历史记录可能会丢弃旧行，或者用 `[sessions_history omitted: message too large]` 替换过大的行。
- 当您需要完整的逐字节逐行记录时，检查磁盘上的原始逐行记录是备选方案。

## 工具策略

子代理首先使用与父代理或目标代理相同的配置文件和工具策略管道。之后，OpenClaw 会应用子代理限制层。

如果没有限制性的 `tools.profile`，子代理将获得**除会话工具**和系统工具外的所有工具：

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

`sessions_history` 在这里仍然是一个有界的、经过清理的召回视图——它不是原始逐行记录的转储。

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

`tools.subagents.tools.allow` 是一个最终的仅允许过滤器。它可以缩小已解析的工具集，但不能“恢复”被 `tools.profile` 移除的工具。例如，`tools.profile: "coding"` 包含 `web_search`/`web_fetch` 但不包含 `browser` 工具。要让编程配置文件的子代理使用浏览器自动化，请在配置文件阶段添加浏览器：

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
- **并发：** `agents.defaults.subagents.maxConcurrent`（默认 `8`）

## 活跃性与恢复

OpenClaw 不会将 `endedAt` 的缺失视为子代理仍然存活的永久证明。早于过期运行窗口的未结束运行将不再计入 `/subagents list`、状态摘要、后代完成门控和每个会话并发检查中的活动/待处理状态。

网关重启后，除非其子会话被标记为 `abortedLastRun: true`，否则过期的未结束恢复运行将被修剪。那些因重启而中止的子会话仍可通过子代理孤恢复流程恢复，该流程会在清除中止标记之前发送一条合成恢复消息。

自动重启恢复对每个子会话都有界限。如果同一个子代理子在快速重新楔入窗口内被重复接受进行孤恢复，OpenClaw 将在该会话上保留一个恢复墓碑，并在以后的重启中停止自动恢复它。运行 `openclaw tasks maintenance --apply` 以协调任务记录，或运行 `openclaw doctor --fix` 以清除具有墓碑标记的会话上过期的中止恢复标志。

<Note>
  如果子代理生成时因 Gateway Gateway(网关)`PAIRING_REQUIRED` / `scope-upgrade`RPC 失败，请在编辑配对状态前检查 RPC 调用者。 内部 `sessions_spawn` 协调应通过直接 环回共享令牌/密码认证，以 `client.id: "gateway-client"` 身份 并使用 `client.mode: "backend"`CLI 进行连接；该路径不依赖于 CLI 的已配对设备范围基线。远程调用者、显式 `deviceIdentity`、显式设备令牌路径以及浏览器/节点客户端
  在进行范围升级时仍然需要正常的设备批准。
</Note>

## 停止

- 在请求者聊天中发送 `/stop` 会中止请求者会话，并停止由其生成的任何活动子代理运行，级联影响嵌套的子级。
- `/subagents kill <id>` 停止特定的子代理并级联停止其子级。

## 限制

- 子代理公告是**尽力而为（best-effort）**的。如果网关重启，挂起的“公告回传”工作将丢失。
- 子代理仍然共享同一个网关进程资源；请将 `maxConcurrent` 视为安全阀。
- `sessions_spawn` 始终是非阻塞的：它立即返回 `{ status: "accepted", runId, childSessionKey }`。
- 子代理上下文仅注入 `AGENTS.md`、`TOOLS.md`、`SOUL.md`、`IDENTITY.md` 和 `USER.md`（不含 `MEMORY.md`、`HEARTBEAT.md` 或 `BOOTSTRAP.md`）。
- 最大嵌套深度为 5（`maxSpawnDepth` 范围：1–5）。对于大多数用例，建议使用深度 2。
- `maxChildrenPerAgent` 限制每个会话的活动子级数量（默认 `5`，范围 `1–20`）。

## 相关

- [ACP agents](/zh/tools/acp-agents)
- [Agent send](/zh/tools/agent-send)
- [Background tasks](/zh/automation/tasks)
- [Multi-agent sandbox tools](/zh/tools/multi-agent-sandbox-tools)
